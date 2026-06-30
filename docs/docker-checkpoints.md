# Docker — Implementation Checkpoints

> A checkpoint-by-checkpoint implementation of the plan in [`docs/docker.md`](./docker.md).
>
> **How to use this document**
>
> - Each **Checkpoint** is independent and verifiable on its own.
> - You (or another LLM) implement **only one checkpoint at a time**.
> - After each checkpoint: **read the "Pass criteria"**, look at the "What you should see / learn" section, and only then ask for the next checkpoint.
> - "Files to create/modify" lists **exact paths and exact filenames** — copy them as-is.
> - "Commands YOU run" are the ones you copy-paste. The implementing LLM does not run them.
> - "Rollback" tells you how to undo cleanly if a checkpoint goes sideways.
> - All file paths are relative to the repo root: `/home/boyapatiharsha/workspace/sp/jfp`.

---

## Conventions used in every checkpoint

- **Bold reading order**: read the _Goal_, then _Why this checkpoint exists_ (learning frame), then _Pass criteria_, then _Files to create/modify_, then _Commands YOU run_, then _Rollback_. The "What you should see / learn" boxes are the lessons — keep them as notes.
- **Secrets**: anything in `.env` is **never** committed. Anything in `.env.docker.example` (no secrets) **is** committed.
- **No auto-run by the implementing LLM** — repo rule. Commands below are for you.
- **Healthcheck values come from `docs/docker.md` § 5**; if a value differs between this file and § 5, this file wins for implementation, § 5 wins for _learning context_.

---

# Checkpoint 0 — Pre-flight: confirm Docker + Compose v2 work on the host

> **No files to create.** This is purely a "is the tool installed" smoke test.

### Goal

Make sure Docker Engine and the **Compose v2 plugin** are installed and the daemon is reachable.

### Why this checkpoint exists

Two failure modes waste enormous time later:

1. Old `docker-compose` (hyphenated, Python v1 binary) is deprecated. Modern commands are `docker compose` (with a space) — see `docs/docker.md` § 1 _Compose v2 plugin_.
2. Docker daemon not running (common on Linux after a reboot). The build will fail with a cryptic "Cannot connect to Docker daemon" error.

### Pass criteria

- `docker --version` prints a version string.
- `docker compose version` prints a version string (note the **space** between `docker` and `compose`).
- `docker run hello-world` prints the full "Hello from Docker!" banner and exits 0.
- `docker ps` works without permission errors.

### Files to create/modify

None.

### Commands YOU run

```bash
docker --version
docker compose version
docker run hello-world
docker ps
```

### What you should see / learn

- `docker compose version` showing `Docker Compose version v2.x.x` (the `v2` matters — v1 is `docker-compose --version`).
- The `hello-world` banner mentions images, layers, and the Docker engine version. That single tiny demo proves: image pull works, daemon works, container lifecycle works.

### Rollback

Nothing to undo. If `docker` errors with permission denied, add yourself to the `docker` group and re-login (or prefix with `sudo` for now).

---

# Checkpoint 1 — Project-level `.gitignore` hygiene for Docker artefacts

> Adds entries that prevent committing the wrong files later. Pure safety.

### Goal

Make sure Docker-related artefacts (`.env`, build outputs, the Postgres data volume if someone bind-mounts by mistake) are not accidentally committed.

### Why this checkpoint exists

`docs/docker.md` § 7 says the `.env` file is created at repo root and is git-ignored. Your existing `.gitignore` already lists `.env`, `.env.local`, etc. — verify it; we add a few Docker-specific lines.

### Pass criteria

- After this checkpoint, `git status --ignored` lists `/.env` and `/docs/docker*` are _not_ shown as untracked ignored content (already-gitignored items). `apps/backend/dist` and `apps/web/dist` (if any) are git-ignored.
- No new tracked files in git.

### Files to create/modify

**Modify**: `.gitignore` — append (or merge) these lines at the end:

```gitignore
# Docker
.env
.env.*
!.env.example
.env.docker.example

# Build artefacts produced by the Docker build (in case anything leaks out)
apps/backend/dist
apps/web/dist
apps/extension/dist

# Postgres volume root, in case anyone bind-mounts by mistake
.postgres-data
```

### Commands YOU run

```bash
git diff -- .gitignore
git status --ignored
```

### What you should see / learn

- The `.env` file appears in `git status --ignored` as **ignored** (good).
- No new tracked files. The only output of `git status` should be "modified: .gitignore".
- _Why gitignore matters in Docker contexts_: `.env` files contain DB passwords. Forgetting to ignore them is the #1 cause of "we got pwned because someone leaked the .env" incidents.

### Rollback

```bash
git checkout -- .gitignore
```

---

# Checkpoint 2 — `.dockerignore` files (root + backend)

> Two small files. Tells Docker what **not** to send into the build context.

### Goal

Stop Docker from sending `node_modules`, `.git`, build outputs, tests, etc. into the build context. Reduces build time and prevents cache invalidation on irrelevant files.

### Why this checkpoint exists

`docs/docker.md` § 8 notes: slow Docker builds are 80% caused by accidentally sending `node_modules`. `COPY . .` would otherwise walk the entire monorepo tree.

### Pass criteria

- Two files exist: `.dockerignore` at repo root, `apps/backend/.dockerignore`.
- `docker build -f apps/backend/Dockerfile --dry-run .` (Docker 23+) shows a small context size (a few MB, not hundreds).
- Building any image (later checkpoints) feels noticeably faster on the second run.

### Files to create/modify

**Create**: `.dockerignore` at repo root with this exact content:

```gitignore
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
**/*.test.tsx
**/*.spec.tsx
jfpTestCases
apps/extension/dist
```

**Create**: `apps/backend/.dockerignore` with this exact content:

```gitignore
node_modules
dist
tests
coverage
.env*
!.env.example
.git
.vscode
```

### Commands YOU run

```bash
ls -la .dockerignore apps/backend/.dockerignore
docker compose config 2>&1 | head -20  # sanity, will fail later but no parse error here
```

### What you should see / learn

- Both files exist with the right ownership.
- `apps/backend/.dockerignore` is technically not strictly required when you build via `docker-compose.yml` (which uses the **root** as context and therefore the root `.dockerignore`), but it's there so that anyone running `docker build -f apps/backend/Dockerfile .` directly gets the same filtering.

### Rollback

```bash
rm .dockerignore apps/backend/.dockerignore
```

---

# Checkpoint 3 — `.env.docker.example` (only the example, no real secrets yet)

> Add the env template. No real `.env` yet. No docker-compose yet.

### Goal

Have a _committed, safe_ template file that documents every variable Compose will need.

### Why this checkpoint exists

`docs/docker.md` § 7 lays out the variables. Putting them in a file (instead of one-shot in chat) means:

- Another LLM (or you tomorrow) can see exactly what is expected.
- `env_file` vs `environment` is unambiguous because we say "copy to `.env`".

### Pass criteria

- `docs/`, repo root listing shows `.env.docker.example`.
- File contains every key from `docs/docker.md` § 7.
- No real secrets in it (deliberately empty strings for passwords).
- `cat .env.docker.example` shows the file, `git status` shows the new file as **untracked** (you can add it later).

### Files to create/modify

**Create**: `.env.docker.example` at repo root with this exact content:

```env
# ──── Postgres (consumed by docker-compose.yml when creating the DB) ────
POSTGRES_DB=jfp
POSTGRES_USER=jfp
# Required. Fill this in when you copy to .env. Empty here on purpose.
POSTGRES_PASSWORD=

# ──── Host-side port mapping ────
BACKEND_HOST_PORT=8000

# ──── Backend runtime config (consumed by apps/backend at container start) ────
NODE_PORT=8000
# NOTE: host is the Compose service name 'postgres', NOT 'localhost'.
NODE_DATABASE_CONFIG={"host":"postgres","username":"jfp","password":"","database":"jfp","port":5432}
NODE_CORS_ORIGIN=http://localhost:8000
NODE_JWT_SECRET=
NODE_JWT_EXPIRES_IN=7d
NODE_RATE_LIMIT_MAX=100

# ──── Google OAuth2 ────
NODE_GOOGLE_CLIENT_ID=
NODE_GOOGLE_CLIENT_SECRET=
NODE_GOOGLE_REDIRECT_URI=http://localhost:8000/api/user/google/callback

# ──── Gmail SMTP ────
NODE_GMAIL_USER=
NODE_GMAIL_APP_PASSWORD=

# ──── WS transit secret shared between backend / web / extension ────
TRANSIT_SECRET=jfp-default-transit-secret-change-in-prod
```

### Commands YOU run

```bash
ls -la .env.docker.example
cat .env.docker.example
```

### What you should see / learn

- One file with no real secrets. Spot-check that `POSTGRES_PASSWORD`, `NODE_JWT_SECRET`, `NODE_GMAIL_APP_PASSWORD` are empty.
- The `NODE_DATABASE_CONFIG` value uses `"host":"postgres"` — the service name, not `localhost`. This is the single most important detail to remember; otherwise the backend will not find the DB.

### Rollback

```bash
rm .env.docker.example
```

---

# Checkpoint 4 — `apps/backend/Dockerfile` (multi-stage, prod stage only used)

> First real artefact. Single-file change that lets us build an image.

### Goal

Build the backend image in three stages (`deps → build → prod`) on **Node 24**. The image is runnable in isolation (without Compose yet).

### Why this checkpoint exists

You cannot meaningfully use Compose until you have an image. Building the image standalone is the fastest feedback loop: surface dependency, pnpm store, or TS-config errors without involving containers.

### Pass criteria

- `docker build -f apps/backend/Dockerfile -t jfp-backend .` completes with `Successfully tagged jfp-backend:latest`.
- `docker run --rm jfp-backend:latest node -e "console.log(process.versions.node)"` prints a `v24.x.x` version.
- `docker image inspect jfp-backend --format '{{.Config.User}}'` prints `node` (non-root).
- Image size is in the 250–500 MB range (Node 24 base is ~250 MB; + your deps). If it's 1+ GB, the build context leaked.

### Files to create/modify

**Create**: `apps/backend/Dockerfile` with this exact content:

```dockerfile
# syntax=docker/dockerfile:1.7

# ─────────────── 1. deps (cached across source changes) ───────────────
FROM node:24-bookworm-slim AS deps
WORKDIR /repo

RUN corepack enable

# Copy ONLY the manifest files first so this layer caches across source-only edits.
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

# BuildKit cache mount keeps the pnpm store across builds.
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm fetch --frozen-lockfile

RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --offline --frozen-lockfile

# ─────────────── 2. build (compile TS + build web) ───────────────
FROM deps AS build
WORKDIR /repo
COPY . .

RUN pnpm --filter web... build
RUN pnpm --filter backend build

# ─────────────── 3. prod runtime ───────────────
FROM node:24-bookworm-slim AS prod
WORKDIR /app
ENV NODE_ENV=production \
    PORT=8000

RUN corepack enable \
 && corepack prepare pnpm@10.33.0 --activate

COPY --from=build /repo/apps/backend/package.json  ./package.json
COPY --from=build /repo/apps/backend/dist         ./dist
COPY --from=build /repo/apps/web/dist             /web/dist
COPY --from=build /repo/pnpm-lock.yaml            ./pnpm-lock.yaml
COPY --from=build /repo/pnpm-workspace.yaml       ./pnpm-workspace.yaml
COPY --from=build /repo/apps/backend/tsconfig.json ./tsconfig.json

RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --prod --offline --frozen-lockfile --ignore-scripts

EXPOSE 8000
USER node
CMD ["node", "dist/index.js"]
```

### Commands YOU run

```bash
# BuildKit is on by default in recent Docker; explicit anyway for clarity.
DOCKER_BUILDKIT=1 docker build -f apps/backend/Dockerfile -t jfp-backend .
docker run --rm jfp-backend:latest node -e "console.log(process.versions.node)"
docker image inspect jfp-backend --format '{{.Config.User}}'
docker image ls jfp-backend
```

### What you should see / learn

- The build prints three named stage outputs: `deps`, `build`, `prod`. Only `prod` is what ends up in the final image.
- The Node version line prints `v24.something.x` — confirms we're on Node 24, not Node 18/22.
- Image size is sane. **If it exceeds ~600 MB**, suspect the `.dockerignore` from Checkpoint 2 isn't being applied, or `COPY . .` is including `node_modules`.
- `User: node` confirms the container runs as non-root (small but real security win).

### Troubleshooting this checkpoint

- Build fails at `pnpm fetch --frozen-lockfile` → your `pnpm-lock.yaml` is out of sync. Run `pnpm install` locally and recommit the lockfile.
- "Cannot find module @repo/shared-types" at runtime → the prod stage's `pnpm install --prod` didn't include workspace packages. Checkpoint 5 will fix this; for now, only the `node -e` test should pass.
- Build is enormous → open `.dockerignore` and re-check; the `**/node_modules` pattern is the one that fixes 90% of these.

### Rollback

```bash
rm apps/backend/Dockerfile
docker image rm jfp-backend
```

---

# Checkpoint 5 — `docker-compose.yml` with **postgres only** (first end-to-end smoke)

> Docker Compose comes in. We start small — just the database. We verify Postgres is healthy before moving on.

### Goal

Stand up the Postgres container with a healthcheck, a named volume, and a private network. Confirm it accepts connections from inside the container.

### Why this checkpoint exists

If Postgres does not come up correctly here, every later checkpoint will throw red-herring errors. Catching DB issues in isolation is much faster than debugging them through the backend.

### Pass criteria

- `docker compose --env-file .env up -d postgres` exits 0.
- `docker compose ps` shows `postgres` with status `(healthy)`.
- `docker compose exec postgres psql -U jfp -d jfp -c '\l'` lists databases (psql prompt is not interactive).
- A second `docker compose down && docker compose --env-file .env up -d postgres` and the data **persists** (proves the named volume works).

### Files to create/modify

**Create** at repo root: `.env` (copy of `.env.docker.example`, only with `POSTGRES_PASSWORD` and `NODE_JWT_SECRET` filled in). Example:

```env
POSTGRES_DB=jfp
POSTGRES_USER=jfp
POSTGRES_PASSWORD=dev-only-not-secret
BACKEND_HOST_PORT=8000
NODE_PORT=8000
NODE_DATABASE_CONFIG={"host":"postgres","username":"jfp","password":"dev-only-not-secret","database":"jfp","port":5432}
NODE_CORS_ORIGIN=http://localhost:8000
NODE_JWT_SECRET=dev-only-jwt-secret-please-change-in-prod-12345678
NODE_JWT_EXPIRES_IN=7d
NODE_RATE_LIMIT_MAX=100
NODE_GOOGLE_CLIENT_ID=
NODE_GOOGLE_CLIENT_SECRET=
NODE_GOOGLE_REDIRECT_URI=http://localhost:8000/api/user/google/callback
NODE_GMAIL_USER=
NODE_GMAIL_APP_PASSWORD=
TRANSIT_SECRET=jfp-default-transit-secret-change-in-prod
```

> Reminder: this `.env` should NOT be committed (covered by Checkpoint 1).

**Create**: `docker-compose.yml` at repo root with this exact content:

```yaml
# Postgres-only first; backend joined in Checkpoint 6.

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
      test: ['CMD-SHELL', 'pg_isready -U ${POSTGRES_USER:-jfp} -d ${POSTGRES_DB:-jfp}']
      interval: 5s
      timeout: 5s
      retries: 10
      start_period: 10s

networks:
  jfp-net:
    name: jfp-net
    driver: bridge

volumes:
  postgres_data:
    name: jfp_postgres_data
```

### Commands YOU run

```bash
# 1. Start ONLY postgres
docker compose --env-file .env up -d postgres

# 2. Watch it become healthy
docker compose ps
docker compose logs -f postgres   # Ctrl+C to exit

# 3. Connect from inside the container (proves the DB is reachable)
docker compose exec postgres psql -U jfp -d jfp -c '\l'

# 4. Round-trip: create data, restart, see it survive
docker compose exec postgres psql -U jfp -d jfp -c 'CREATE TABLE roundtrip (id INT);'
docker compose down
docker compose --env-file .env up -d postgres
docker compose exec postgres psql -U jfp -d jfp -c '\dt'
# ^ should still show 'roundtrip' table
```

### What you should see / learn

- `docker compose ps` shows `STATUS: Up X seconds (healthy)` — **(healthy)** is what the healthcheck gives us. This is the bit `depends_on.condition: service_healthy` will check in the next checkpoint.
- `\l` shows the `jfp` database alongside the default `postgres`, `template0`, `template1` databases. The `jfp` database exists because `POSTGRES_DB=jfp` was passed.
- The roundtrip table survives `down`. **An important corollary**: if you _want_ to wipe data (e.g. you're seeding from scratch), use `docker compose down -v` — the `-v` removes the named volume.

### Troubleshooting this checkpoint

- `pg_isready` keeps failing → check that `POSTGRES_USER` in `.env` matches the one in the healthcheck command (it should — both pull from the same `${VAR}`). Check `docker compose logs postgres` for crashes (usually wrong password length or unsupported chars).
- "bind: address already in use" on port 5432 → you already have a Postgres on the host. Either stop it, or remove the conflicting local one (we deliberately do **not** publish 5432 to the host, so this only happens if you've already been running 5432 elsewhere).
- `.env` not loaded → you forgot `--env-file .env`. Compose _does_ auto-load `.env` for variable interpolation, but being explicit here avoids a class of subtle bugs.

### Rollback

```bash
docker compose down -v
rm docker-compose.yml
```

---

# Checkpoint 6 — Join `backend` to the compose stack

> Now we have two services. The whole `docs/docker.md` § 5 picture becomes real.

### Goal

The backend container starts **only after** postgres reports healthy, talks to it on the private network, and serves traffic on `localhost:8000`.

### Why this checkpoint exists

This is where the "private internal network" idea pays off. `postgres` is reachable as a hostname _only_ from `backend`. `localhost:8000` on the host is the only thing exposed.

### Pass criteria

- `docker compose --env-file .env up --build -d` brings up `postgres (healthy)` and `backend (running)`.
- `curl -s http://localhost:8000/health` returns JSON: `{"status":"ok",...}`.
- `docker compose logs backend | grep "Database connected successfully"` is present (TypeORM connection confirmation).
- `docker compose exec postgres psql -U jfp -d jfp -c '\dt'` lists the tables created by TypeORM `synchronize: true`.
- From the **host**, `curl http://localhost:5432` fails with "connection refused" — proves Postgres is not exposed.

### Files to create/modify

**Modify**: `docker-compose.yml` — add the `backend:` service block. Final file content:

```yaml
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
        condition: service_healthy
    environment:
      NODE_ENV: production
      NODE_PORT: 8000
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

### Commands YOU run

```bash
# Build + start both
docker compose --env-file .env up --build -d

# Watch backend come up
docker compose logs -f backend

# In another terminal, check both services
docker compose ps

# Smoke tests
curl -s http://localhost:8000/health
echo "---"
docker compose exec postgres psql -U jfp -d jfp -c '\dt'

# Confirm postgres is NOT exposed on the host
nc -zv localhost 5432 2>&1 || echo "good — postgres is not exposed"
```

### What you should see / learn

- The first time you run `up --build`, the build can take a few minutes (compiling TS, building web, prod install). Subsequent runs reuse the cache — much faster.
- Backend logs show, in order: `CORS origin(s) configured` → `Database connected successfully` → `Verification code cleanup timer started` → `Server started`. If anything between them is missing, that's the failing component.
- `curl /health` returns JSON, not an error. That `/health` route is defined in `apps/backend/src/index.ts`.
- `\dt` lists ~12 tables — `user`, `job`, `resume`, `persona`, `tag`, `event`, `api_key`, `weekly_goal`, `resume_version`, `result`, `verification_code`. They are created automatically because `data-source.ts` has `synchronize: true`.
- `localhost:5432` is unreachable from the host even though Postgres is running. **This is the "private network" property** — only containers in `jfp-net` can reach it by service name.

### Troubleshooting this checkpoint

- Backend logs `ECONNREFUSED 127.0.0.1:5432` → `NODE_DATABASE_CONFIG` JSON in `.env` still has `host: localhost` instead of `host: postgres`. Fix it and `docker compose up -d backend` again.
- Backend exits with code 1 → run `docker compose logs backend` for the actual error.
- `/health` hangs → check `docker compose ps` — backend is probably still starting. Wait for `Up X seconds (health: starting)` to flip to healthy or check the logs.
- Tables are missing → TypeORM `synchronize: true` only creates tables that have entities wired into `apps/backend/src/database/entities/index.ts`. Confirm with `ls apps/backend/src/database/entities/`.

### Rollback

```bash
docker compose down
# Revert the backend service block out of docker-compose.yml (keep postgres block).
```

---

# Checkpoint 7 — Confirm the web SPA is served (bundled-in mode)

> Verify that the backend really does serve the React app at `/`.

### Goal

`curl http://localhost:8000/` returns HTML of the React app. No separate `web` container.

### Why this checkpoint exists

This is the moment we validate the "one container, one port" architecture choice documented in `docs/docker.md` § 3. We need to know the SPA actually loads, otherwise the production deploy will look like a 502.

### Pass criteria

- `curl -s http://localhost:8000/ | head -40` shows HTML containing the `<div id="root">` (or whatever entrypoint the Vite app uses) and the app's `<title>`.
- `curl -s http://localhost:8000/assets/index-*.js -o /dev/null -w '%{http_code}\n'` returns `200` for at least one asset path returned by the previous `curl`. (If the asset hash differs every build, just check that the path returns 200.)
- Opening `http://localhost:8000/` in a browser shows the actual app. The first API call from the SPA goes to `/api/*` on the same origin — no CORS error.

### Files to create/modify

None. Just verifying what the previous checkpoints already produced.

### Commands YOU run

```bash
# 1. HTML root
curl -s http://localhost:8000/ | head -40

# 2. Find the JS bundle path emitted by Vite, then fetch it
JS=$(curl -s http://localhost:8000/ | grep -oE '/assets/index-[^"]+\.js' | head -n1)
echo "Detected JS bundle: $JS"
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:8000$JS"

# 3. Open in browser: http://localhost:8000/
xdg-open http://localhost:8000/ 2>/dev/null || open http://localhost:8000/ || echo "Open the URL manually"
```

### What you should see / learn

- The HTML response is tiny (a few hundred bytes) — it's the SPA shell. The JS bundle is what does the work.
- The JS bundle fetch returns `200`. If it returns `404`, your Dockerfile missed the `COPY --from=build /repo/apps/web/dist /web/dist` line.
- In the browser dev tools Network tab, every `/api/*` request goes to `localhost:8000/api/...` — same origin, no CORS preflight.

### Troubleshooting this checkpoint

- `/` returns JSON, not HTML → backend is running but `NODE_ENV` is **not** `production`; the `express.static` block is gated on it. Check `docker compose exec backend sh -c 'echo $NODE_ENV'`.
- HTML loads but bundle 404s → re-check `apps/web/dist` actually contains `assets/index-*.js` after the build (run `docker compose exec backend ls /web/dist/assets`). If empty, the `pnpm --filter web... build` line in the Dockerfile failed silently — rebuild with `--no-cache`.

### Rollback

This is a verification-only checkpoint; nothing to undo. If it fails, the underlying issue is in Checkpoint 4 or 6 — go back.

---

# Checkpoint 8 — `docker-compose.dev.yml` for hot-reload

> Add the development override so source edits reload without rebuilding the image.

### Goal

Run the backend with `tsx watch` instead of the prod binary. Source files are bind-mounted; `node_modules` come from a named volume so the pnpm symlink layout stays intact.

### Why this checkpoint exists

You will iterate many times a day on the backend. Without a dev override, every change is `docker compose build backend && docker compose up -d backend`. With this override, just `docker compose ... up backend` and save files; `tsx` picks them up.

### Pass criteria

- Running the override form brings up `backend` in **dev** mode (no build/rebuild required when you save a file).
- Editing `apps/backend/src/index.ts` (e.g. add a `console.log` somewhere harmless) is reflected in `docker compose logs -f backend` within ~3 seconds.
- The DB connection still works in dev (TypeORM goes through `synchronize: true` again — fine for learning, will revisit later).

### Files to create/modify

**Create**: `docker-compose.dev.yml` at repo root with this exact content:

```yaml
# Loaded on top of docker-compose.yml.
# Replaces the backend service: dev deps + bind-mount + tsx watch.

services:
  backend:
    build:
      target: build # Stop at the 'build' stage from apps/backend/Dockerfile.
    command: ['pnpm', '--filter', 'backend', 'dev']
    environment:
      NODE_ENV: development
      NODE_PORT: 8000
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
      TRANSIT_SECRET: ${TRANSIT_SECRET:-jfp-default-transit-secret-change-in-prod}
    volumes:
      - ./apps/backend/src:/repo/apps/backend/src:ro
      - ./packages:/repo/packages:ro
      - backend_node_modules:/repo/node_modules
      - backend_pkg_node_modules:/repo/apps/backend/node_modules
    ports:
      - '8000:8000'

volumes:
  backend_node_modules:
  backend_pkg_node_modules:
```

### Commands YOU run

```bash
# Stop the prod stack (but keep the data!)
docker compose --env-file .env down

# Run the dev override. The first time takes longer because it rebuilds up to the 'build' stage.
docker compose -f docker-compose.yml -f docker-compose.dev.yml --env-file .env up --build backend

# In another terminal, watch the logs while you edit a file
docker compose -f docker-compose.yml -f docker-compose.dev.yml logs -f backend

# Touch a file and watch the restart
touch apps/backend/src/index.ts
```

### What you should see / learn

- The build stops at the `build` stage (you'll see only two stage names — `deps` and `build` — in the build output).
- `pnpm --filter backend dev` invokes `tsx watch src/index.ts` — the same command your local dev uses.
- Within seconds of `touch`, the backend log shows a restart banner and the connection re-establishes. **This is your daily loop**: edit → save → see the change.

### Troubleshooting this checkpoint

- "Address already in use" on 8000 → you forgot `docker compose down` first.
- Backend container keeps restarting with "Cannot find module @repo/shared-types" → the `node_modules` named volume was created when the image didn't have a full dev install. Fix: `docker compose down -v` (wipes volumes) and re-up. **This will wipe DB data too** — re-run your seeders if you have any.
- File edits not picked up → confirm the `volumes:` lines include `./apps/backend/src`. Without that line, your edits live only on the host filesystem.

### Rollback

```bash
# Stop the dev override
docker compose -f docker-compose.yml -f docker-compose.dev.yml down

# Re-run prod stack
docker compose --env-file .env up -d
```

---

# Checkpoint 9 — Day-to-day muscle memory (no new files)

> Internalise the command set so muscle memory builds before any deployment.

### Goal

You can confidently execute the four lifecycle operations without checking this doc.

### Why this checkpoint exists

Deployment is muscle memory. The first time you `docker compose down -v` on a production-looking machine, you want it to be intentional.

### Pass criteria

You can narrate and execute each of these from memory:

1. **Start**: `docker compose --env-file .env up -d --build`
2. **Logs**: `docker compose logs -f backend`
3. **Shell in**: `docker compose exec backend sh`
4. **Stop (keep data)**: `docker compose down`
5. **Stop (wipe data)**: `docker compose down -v`
6. **Rebuild one service**: `docker compose build backend && docker compose up -d backend`
7. **Inspect network**: `docker network inspect jfp-net`
8. **Inspect volume**: `docker volume inspect jfp_postgres_data`

### Files to create/modify

None.

### Commands YOU run

```bash
# Practice (no actual damage from any of these — they're all in §10 of docs/docker.md):
docker network inspect jfp-net | head -30
docker volume inspect jfp_postgres_data | head -20
docker compose ps
docker compose logs --tail=20 backend
docker compose exec backend sh -c 'ls -la /web/dist | head'
docker compose down
docker compose --env-file .env up -d
docker compose ps   # confirm both 'healthy' / 'Up'
```

### What you should see / learn

- `docker network inspect jfp-net` lists both `jfp-postgres` and `jfp-backend` as containers attached to that network, with their IPs. **This is the proof that "private internal network" is real**, not just a conceptual model.
- `docker volume inspect jfp_postgres_data` shows the volume's mountpoint on the host (something like `/var/lib/docker/volumes/jfp_postgres_data/_data`). That directory is what holds your DB data across restarts.
- After `down` + `up`, your previously-seeded data is still there. After `down -v` + `up`, it's gone. The difference is one letter.

### Rollback

Nothing to undo. All commands above are safe.

---

# Checkpoint 10 — Decision point: deploy prep vs keep iterating locally

> No new code. This is a planning checkpoint. You and I agree on what's next.

### Goal

Decide whether the next step is **actually deploy to the VPS** or **keep learning locally**.

### Why this checkpoint exists

Following `docs/docker.md` § 12 (VPS deployment notes), there are four new things we haven't done yet:

1. Caddy (or nginx) reverse proxy with auto-TLS.
2. Move real secrets out of the repo `.env`.
3. Replace TypeORM `synchronize: true` with explicit migrations.
4. Backups for the named volume.

These are sequential and each is its own bite-sized learning step. The right time to start them is when the local stack feels boring — i.e. you stop being surprised by it.

### Pass criteria

You answer the question below (for yourself, no need to write it down):

> "When I run `docker compose down` and back up, does my data survive?" → Yes/No (Checkpoint 5 covered this.)
>
> "When I save a backend file, does it reload in under 5 s?" → Yes/No (Checkpoint 8.)
>
> "Do I remember which env vars must be 32+ chars?" → Yes/No (Checkpoints 4 + 6.)

If all three are _Yes_, you are ready for the deployment step. If any is _No_, re-do that checkpoint before moving on.

### Files to create/modify

None.

### Commands YOU run

```bash
# Just verify one more time that everything is green after the practice session:
docker compose --env-file .env up -d --build
curl -s http://localhost:8000/health
docker compose exec postgres psql -U jfp -d jfp -c '\dt'
```

### What you should see / learn

- The full local stack works end to end.
- You have a clear answer to "what's next?" If it's deployment, we'll start a new file `docs/docker-deploy.md` mirroring this structure.

### Rollback

None.

---

# End of Checkpoints

When you reach here and want to move forward, the natural next documents are:

- `docs/docker-deploy.md` — the VPS / Caddy / TLS / secrets / backups set.
- `docs/docker-migrations.md` — replacing `synchronize: true` with explicit TypeORM migrations.
- `docs/docker-web-split.md` — splitting the web SPA into its own Nginx container if/when you outgrow the bundled-in approach.

Each will follow the same atomic-checkpoint shape.
