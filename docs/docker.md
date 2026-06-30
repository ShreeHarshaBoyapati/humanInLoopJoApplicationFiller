# Docker Plan — JFP Monorepo (Backend + Postgres + bundled Web)

> A learning-oriented plan to containerize this Turborepo + pnpm monorepo. By the end of this document you should know **what each file does, why it exists, and the mental model for how the pieces talk to each other** — not just a copy/paste recipe.

---

## 0. What we are actually doing (and what we are _not_)

**In scope (containerized):**

- `apps/backend` — Express 5 + TypeORM on PostgreSQL, also serves the built `apps/web` SPA in production (it already does this in `src/index.ts`).
- A fresh PostgreSQL 16 instance that only the backend can reach.

**Out of scope (not containerized):**

- `apps/extension` — Chrome extension. It is built locally (`pnpm --filter extension build`) and uploaded to the Chrome Web Store as a static artifact. Extensions live inside users' browsers, not in our infra.
- `apps/web` as a separate service — production-relevant here only because the backend already serves its `dist/`. We will **bake the web build into the backend image**, so we ship **one container + one published port**.

**Environment decisions (locked in):**

- Node **24 LTS** (Krypton) on Debian `bookworm-slim`.
- Include a **`docker-compose.dev.yml` override** for hot-reload while learning.
- **Fresh Postgres container** (do not reuse anything external).
- Deployment target: a **single VPS** (e.g. Hostinger AIC / DigitalOcean / Hetzner). TLS + reverse proxy will be added in a follow-up step when we actually deploy — for now everything runs over plain HTTP on `localhost:8000`.

---

## 1. Mental model (read this first)

```
┌────────────── jfp-net (private bridge network, internal only) ──────────────┐
│                                                                             │
│   ┌────────────────────────┐         ┌──────────────────────────────┐      │
│   │       postgres         │  5432   │           backend            │      │
│   │  (postgres:16-alpine)  │◀───────▶│  (Dockerfile "prod" stage)   │      │
│   │  hostname: postgres    │  DNS via│  Express + WS on :8000        │      │
│   │  NOT exposed to host   │  service│  serves /api, /ws, and the   │      │
│   └────────────────────────┘   name   │  web SPA from /web/dist      │      │
│                                       └──────────────┬───────────────┘      │
└──────────────────────────────────────────────────────┼─────────────────────┘
                                                       │  host port 8000
                                                       ▼
                                            ┌────────────────────────┐
                                            │   localhost:8000       │
                                            │   (your machine)       │
                                            │   GET /                │
                                            │   GET /health          │
                                            │   /api/*  and  /ws     │
                                            └────────────────────────┘
                                                       ▲
                                                       │  (later: HTTPS via a
                                                       │   reverse proxy)
                                                       │
                                            ┌──────────┴────────────┐
                                            │   Chrome extension    │
                                            │  (built + published)  │
                                            └───────────────────────┘
```

Three things to internalize:

1. **Services on the same Compose network can reach each other by service name as a hostname** (e.g. the backend connects to `postgres`, not `localhost`). This is Compose-managed DNS.
2. **Only ports listed under `ports:` are exposed to your host.** Postgres is reachable _only_ from inside `jfp-net`. That is the "isolated environments, private internal network" you described.
3. **A multi-stage Dockerfile produces a single image.** Each `FROM ... AS <name>` is a stage; only the final stage is shipped. Earlier stages are just there so we can compile/select artifacts cheaply.

---

## 2. Files we will add

```
.
├── docker-compose.yml              # production-like stack (backend + postgres)
├── docker-compose.dev.yml          # override: live-reload for backend
├── .env.docker.example             # example env file used by Compose
├── .dockerignore                   # at repo root (covers monorepo-wide ignores)
├── apps/backend/Dockerfile         # multi-stage: deps → build → prod
└── apps/backend/.dockerignore
```

Nothing under `apps/extension` and nothing under `apps/web` — both are consumed at build time only.

---

## 3. The web app question — answered once

**Why we do not ship a separate `web` container right now:**

- `apps/backend/src/index.ts` already does `app.use(express.static(path.join(__dirname, '../../web/dist')))` when `NODE_ENV=production`.
- That means _one_ container, _one_ published port serve the SPA, the API, and the WebSocket. Fewer moving parts.
- The price: when we add a CDN / multi-region later, we'll split the web into its own Nginx container. **Note that for the future**; do not implement yet.

---

## 4. `apps/backend/Dockerfile` — annotated

```dockerfile
# syntax=docker/dockerfile:1.7
# ↑ enables BuildKit features (--mount=type=cache). Use Docker 23+.

# ───────────────────────── 1. deps (cached across source changes) ─────────────────────────
FROM node:24-bookworm-slim AS deps
WORKDIR /repo

# Corepack ships with Node and is the official way to install pnpm.
RUN corepack enable

# Copy ONLY the manifest files first so this layer caches. Re-downloads only when a package.json changes.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/backend/package.json          apps/backend/package.json
COPY apps/web/package.json             apps/web/package.json
COPY apps/extension/package.json        apps/extension/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY packages/utils/package.json       packages/utils/package.json
COPY packages/ui/package.json          packages/ui/package.json
COPY packages/assets/package.json      packages/assets/package.json
COPY packages/eslint-config/package.json    packages/eslint-config/package.json
COPY packages/stylelint-config/package.json packages/stylelint-config/package.json
COPY packages/typescript-config/package.json packages/typescript-config/package.json

# BuildKit cache mount keeps the pnpm store across builds → much faster reinstalls.
# pnpm fetch populates the store from the lockfile WITHOUT yet creating node_modules.
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm fetch --frozen-lockfile

# Now wire node_modules from the populated store.
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --offline --frozen-lockfile

# ───────────────────────── 2. build (compile TS + build web) ─────────────────────────
FROM deps AS build
WORKDIR /repo
COPY . .

# Build deps first (turbo's ^build resolves the order).
RUN pnpm --filter web... build
RUN pnpm --filter backend build

# ───────────────────────── 3. prod runtime (small, no toolchain) ─────────────────────────
FROM node:24-bookworm-slim AS prod
WORKDIR /app
ENV NODE_ENV=production \
    PORT=8000

RUN corepack enable \
 && corepack prepare pnpm@10.33.0 --activate

# Bring only what we need to RUN the backend.
COPY --from=build /repo/apps/backend/package.json  ./package.json
COPY --from=build /repo/apps/backend/dist         ./dist
COPY --from=build /repo/apps/web/dist             /web/dist
COPY --from=build /repo/pnpm-lock.yaml            ./pnpm-lock.yaml
COPY --from=build /repo/pnpm-workspace.yaml       ./pnpm-workspace.yaml
COPY --from=build /repo/apps/backend/tsconfig.json ./tsconfig.json

# Re-install in prod mode using the previously-populated offline store.
# --ignore-scripts skips postinstall hooks we don't need at runtime.
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --prod --offline --frozen-lockfile --ignore-scripts

# Express binds 0.0.0.0:8000 (already in your src/index.ts). Publish 8000.
EXPOSE 8000

# Run as non-root. The official Node image ships a built-in `node` user.
USER node
CMD ["node", "dist/index.js"]
```

**Why `/web/dist` (not `./web-dist` or `apps/web/dist`)?**  
Because `apps/backend/src/index.ts` resolves the path as `path.join(__dirname, '../../web/dist')`. With `__dirname = /app/dist`, that becomes `/web/dist`. Layout matters.

---

## 5. `docker-compose.yml` — production stack

Compose **v2** syntax. There is no `version:` key in modern Compose files; specifying it is ignored.

```yaml
# Production-like runtime: backend + Postgres on a private bridge network.
# Only port 8000 is published to the host.

services:
  postgres:
    image: postgres:16-alpine
    container_name: jfp-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-jfp}
      POSTGRES_USER: ${POSTGRES_USER:-jfp}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - jfp-net
    healthcheck:
      # `pg_isready` ships inside the postgres image. Default answer: "accepting connections".
      test: ['CMD-SHELL', 'pg_isready -U ${POSTGRES_USER:-jfp} -d ${POSTGRES_DB:-jfp}']
      interval: 5s
      timeout: 5s
      retries: 10
      start_period: 10s

  backend:
    build:
      context: .
      dockerfile: apps/backend/Dockerfile
    container_name: jfp-backend
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy # ← key piece: wait for DB to actually accept connections
    environment:
      NODE_ENV: production
      NODE_PORT: 8000
      # The DB host is the SERVICE NAME 'postgres', not 'localhost'.
      NODE_DATABASE_CONFIG: ${NODE_DATABASE_CONFIG}
      NODE_CORS_ORIGIN: ${NODE_CORS_ORIGIN}
      NODE_JWT_SECRET: ${NODE_JWT_SECRET:?NODE_JWT_SECRET is required}
      NODE_JWT_EXPIRES_IN: ${NODE_JWT_EXPIRES_IN:-7d}
      NODE_RATE_LIMIT_MAX: ${NODE_RATE_LIMIT_MAX:-100}
      NODE_GOOGLE_CLIENT_ID: ${NODE_GOOGLE_CLIENT_ID}
      NODE_GOOGLE_CLIENT_SECRET: ${NODE_GOOGLE_CLIENT_SECRET}
      NODE_GOOGLE_REDIRECT_URI: ${NODE_GOOGLE_REDIRECT_URI}
      NODE_GMAIL_USER: ${NODE_GMAIL_USER}
      NODE_GMAIL_APP_PASSWORD: ${NODE_GMAIL_APP_PASSWORD}
      # TRANSIT_SECRET is read at runtime by the WS layer (see apps/backend/src/...).
      TRANSIT_SECRET: ${TRANSIT_SECRET:-${VITE_TRANSIT_SECRET:-jfp-default-transit-secret-change-in-prod}}
    ports:
      - '${BACKEND_HOST_PORT:-8000}:8000'
    networks:
      - jfp-net

networks:
  jfp-net:
    name: jfp-net
    driver: bridge

volumes:
  postgres_data:
    name: jfp_postgres_data
```

**Things to learn from this file:**

- **`depends_on.condition: service_healthy`** — Compose 2.1+ waits for the `pg_isready` check to pass _before_ it starts `backend`. This is the modern replacement for `wait-for-it.sh` scripts.
- **Named volume** `postgres_data` — data persists across `docker compose down`. Use `-v` only when you genuinely want to wipe the DB.
- **No `ports:` on `postgres`** — this is what makes the network "private". The DB is _only_ reachable from `backend` over `jfp-net`.
- The Compose file uses variable interpolation (`${VAR}`), which is fed by the project-root `.env` file automatically. `env_file:` would duplicate the same values into the container; we let `environment:` do both jobs to keep one source of truth.

---

## 6. `docker-compose.dev.yml` — override for development

Override files merge with the base. Run with `docker compose -f docker-compose.yml -f docker-compose.dev.yml up`.

```yaml
# Loaded on top of docker-compose.yml.
# Switches the backend to the 'build' stage (so source is hot-mounted), turns on HMR,
# forwards the Vite HMR websocket port so the SPA can live-reload too.

services:
  backend:
    build:
      target: build # ← stop at 'build' stage, NOT 'prod'
    command: ['pnpm', '--filter', 'backend', 'dev']
    environment:
      NODE_ENV: development
      # In dev we still want the DB; values come from the same .env.
      NODE_PORT: 8000
    volumes:
      # Bind-mount source so `tsx watch` reloads on change.
      - ./apps/backend/src:/repo/apps/backend/src:ro
      - ./packages:/repo/packages:ro
      # Anonymous-ish named volume for node_modules preserves the pnpm symlink layout.
      - backend_node_modules:/repo/node_modules
      - backend_pkg_node_modules:/repo/apps/backend/node_modules
    ports:
      - '8000:8000'
      - '24678:24678' # Vite HMR websocket port (apps/web)

  # Optional: also run the web dev server inside a container so the SPA reloads.
  # Comment this block out when you only want the backend HMR.
  web:
    image: node:24-bookworm-slim
    working_dir: /repo
    profiles: ['with-web-dev'] # opt-in: --profile with-web-dev
    command: ['pnpm', '--filter', 'web', 'dev']
    volumes:
      - ./:/repo
      - web_node_modules:/repo/node_modules
    environment:
      VITE_WEB_BACKENDAPI: http://localhost:8000/api
      VITE_WS_URL: ws://localhost:8000/ws
      VITE_WEB_APP_PORT: '5173'
    ports:
      - '5173:5173'
      - '24678:24678'
    networks:
      - jfp-net
    depends_on:
      - backend

volumes:
  backend_node_modules:
  backend_pkg_node_modules:
  web_node_modules:
```

**Why a `target: build` override?** Multi-stage Dockerfiles let you stop at any stage. `build` already has the full source tree and dev dependencies, so we don't need to rebuild from scratch when switching between prod and dev.

---

## 7. `.env.docker.example` — source of truth for secrets

Copy this to `.env` at the repo root. Compose reads it automatically for `${VAR}` interpolation.

```env
# --- Postgres (used by compose to create the DB) ---
POSTGRES_DB=jfp
POSTGRES_USER=jfp
# Required. Set a strong value for any non-toy deployment.
POSTGRES_PASSWORD=

# --- Host-side port mapping ---
BACKEND_HOST_PORT=8000

# --- Backend runtime config (read by apps/backend) ---
NODE_PORT=8000
NODE_DATABASE_CONFIG={"host":"postgres","username":"jfp","password":"","database":"jfp","port":5432}
NODE_CORS_ORIGIN=http://localhost:8000
NODE_JWT_SECRET=
NODE_JWT_EXPIRES_IN=7d
NODE_RATE_LIMIT_MAX=100

NODE_GOOGLE_CLIENT_ID=
NODE_GOOGLE_CLIENT_SECRET=
NODE_GOOGLE_REDIRECT_URI=http://localhost:8000/api/user/google/callback

NODE_GMAIL_USER=
NODE_GMAIL_APP_PASSWORD=

# Shared with web + extension. Override for prod with a 32+ char random string.
TRANSIT_SECRET=jfp-default-transit-secret-change-in-prod
```

> **Reality check on secrets:** A single `.env` file at the repo root is fine for a single-VPS single-user setup. When you actually deploy, move `POSTGRES_PASSWORD`, `NODE_JWT_SECRET`, and `NODE_GMAIL_APP_PASSWORD` into a secret manager (Doppler / Vault / a sealed env file outside the repo). We will handle that as part of the VPS deployment step, not now.

---

## 8. `.dockerignore` files

**Repo root `.dockerignore`** (keeps the build context small — slow Docker builds are 80% caused by accidentally sending `node_modules`):

```
node_modules
**/node_modules
.pnpm-store
dist
**/dist
.turbo
**/.turbo
coverage
**/coverage
.git
.gitignore
.github
.husky
.vscode
.idea
.DS_Store
.env
.env.*
!.env.example
**/__tests__
**/*.test.ts
**/*.spec.ts
jfpTestCases
apps/extension/dist
```

**`apps/backend/.dockerignore`:**

```
node_modules
dist
tests
coverage
.env*
!.env.example
.git
.vscode
```

The root one matters more — the `apps/backend/.dockerignore` only takes effect when building with `dockerfile: apps/backend/Dockerfile` _and_ passing `--file` with a custom context. The `docker-compose.yml` above uses the **repo root** as the build context, so the **root `.dockerignore`** is what actually filters files.

---

## 9. Implementation order (each step is verifiable on its own)

| #   | Step                                                                                   | Verify                                                                                                            |
| --- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 1   | Confirm Docker + Compose plugin are installed                                          | `docker --version && docker compose version`                                                                      |
| 2   | Copy `.env.docker.example` → `.env`, fill in `POSTGRES_PASSWORD` and `NODE_JWT_SECRET` | `cat .env` (do **not** commit it)                                                                                 |
| 3   | Add the root `.dockerignore`                                                           | `docker compose config` works without errors                                                                      |
| 4   | Add `apps/backend/Dockerfile`                                                          | `docker build -f apps/backend/Dockerfile -t jfp-backend .` succeeds                                               |
| 5   | Add `docker-compose.yml`                                                               | `docker compose --env-file .env up -d postgres && docker compose logs -f postgres`                                |
| 6   | Bring up both services                                                                 | `docker compose --env-file .env up --build -d` → `docker compose ps` shows both "healthy/running"                 |
| 7   | Smoke test the API                                                                     | `curl http://localhost:8000/health` returns JSON; `curl http://localhost:8000/` returns HTML                      |
| 8   | Verify DB connection + table creation                                                  | TypeORM `synchronize: true` creates tables; `docker compose exec postgres psql -U jfp -d jfp -c '\dt'` lists them |
| 9   | Confirm same-origin web + api work (no CORS)                                           | Open the SPA in your browser; network tab shows `/api` calls going to the same origin                             |
| 10  | Add `docker-compose.dev.yml`                                                           | `docker compose -f docker-compose.yml -f docker-compose.dev.yml up backend` reloads on save                       |
| 11  | Cleanup                                                                                | `docker compose down` keeps data; `docker compose down -v` wipes the DB volume                                    |

> We will not run any of these commands ourselves per repo rules. Each section below ends with the exact copy-pasteable command block for you.

---

## 10. Day-to-day commands (cheat sheet)

```bash
# Start everything in the background
docker compose --env-file .env up -d --build

# Tail backend logs
docker compose logs -f backend

# Open a shell inside the running backend
docker compose exec backend sh

# Open psql inside the postgres container
docker compose exec postgres psql -U $POSTGRES_USER -d $POSTGRES_DB

# Stop (keeps data)
docker compose down

# Stop + wipe DB
docker compose down -v

# Rebuild only the backend after code changes
docker compose build backend && docker compose up -d backend

# Development (live-reload) override
docker compose -f docker-compose.yml -f docker-compose.dev.yml up backend
```

---

## 11. The Chrome extension — what changes for it

**Nothing changes at runtime, only at build time.** When you're ready to publish:

```bash
# Build the extension against the prod backend URL:
VITE_EXT_BACKENDAPI=https://your-domain.com/api \
VITE_EXT_WS_URL=wss://your-domain.com/ws \
VITE_WEB_APP_URL=https://your-domain.com \
pnpm --filter extension build
```

The output (`apps/extension/dist`) is a static folder. Upload it to the Chrome Web Store as an _unpacked_ ZIP, or use `crx pack`. The extension then talks to your backend over the public internet using the URLs baked into its bundle — that's why the URL has to be set _at build time_, not at runtime.

---

## 12. VPS deployment notes (the follow-up, NOT in this step)

When we move from "runs on my laptop" to "runs on my AIC / Hetzner / DO droplet", the only changes are around the host:

- **Reverse proxy** in front (Caddy is a great first choice — automatic HTTPS with one config line). It listens on `:80/:443` and forwards to the Compose-managed `backend:8000` _or_ — better — to a published host port if you want TLS termination inside the container.
- **TLS** via Let's Encrypt + Caddy. No code changes required; just DNS pointing at the VPS.
- **`docker compose up -d` on the server** as the boot command. Store secrets outside the repo (a `.env` on the server, not in git).
- **Backups**: `docker compose exec postgres pg_dump -U $POSTGRES_USER $POSTGRES_DB > backup.sql` on a cron.
- **Migrations**: your `data-source.ts` has a TODO for migrations. Before going live, replace `synchronize: true` with explicit migrations so schema changes don't auto-mutate production.

These are not in this plan; they belong to the next learning step after this one works locally.

---

## 13. Troubleshooting (the "why is it not working" cookbook)

| Symptom                                               | Likely cause                                       | Fix                                                                                                                 |
| ----------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `Cannot connect to the database` on backend start     | Postgres not ready yet                             | Already mitigated by `depends_on.condition: service_healthy`. If it persists, check `docker compose logs postgres`. |
| `pg_isready` keeps failing                            | Wrong `POSTGRES_USER`/`POSTGRES_DB`                | Make sure `.env` values match between compose and the healthcheck.                                                  |
| `ERROR: failed to solve: failed to compute cache key` | Missing `.dockerignore` → huge context             | Add the root `.dockerignore` and try again.                                                                         |
| `pnpm install` hangs                                  | The store cache mount path is wrong                | Verify `--mount=type=cache,target=/root/.local/share/pnpm/store`.                                                   |
| CORS errors in the browser                            | `NODE_CORS_ORIGIN` doesn't include the page origin | For local prod demo: `http://localhost:8000`. Update `.env`.                                                        |
| `web` SPA loads but API calls fail                    | `VITE_WEB_BACKENDAPI` was wrong at build time      | Re-run `pnpm --filter web build` with the right URL and bake the new `dist/` into the image.                        |
| Port 8000 already in use                              | Another process on the host                        | Change `BACKEND_HOST_PORT` in `.env`.                                                                               |
| After `docker compose down -v` my data is gone        | That's the flag's job                              | Use plain `docker compose down` when you want to keep the DB.                                                       |

---

## 14. What this plan intentionally does **not** do (so learning stays focused)

- **No Docker for the extension.** Per your goal.
- **No separate `web` container.** Per "backend serves the web in prod".
- **No Kubernetes / Swarm / multi-host orchestration.** Single VPS only, via `docker compose up`.
- **No GitHub Actions / CI.** Add later when this works.
- **No reverse proxy / TLS.** Add in the deployment step.
- **No Docker secrets / Vault.** Single-host `.env` is fine for now.
- **No migrations tooling.** Replacing `synchronize: true` is a code change left for the prod hardening step.

---

## 15. Your next command to run (after saving these files)

```bash
# 1. Confirm Docker is installed and the v2 plugin works.
docker --version && docker compose version

# 2. Once we have written the files, build the backend image alone first
#    (fastest feedback loop).
docker build -f apps/backend/Dockerfile -t jfp-backend .

# 3. Then the full stack.
docker compose --env-file .env up -d --build

# 4. Smoke-test.
curl -s http://localhost:8000/health
```

That's the path from "I know what Docker _is_" to "I have a stack running". Each command's output is the next lesson.
