# JFP Production Deployment Plan — Hostinger AIC + TypeORM Migrations

> This plan assumes the local Docker setup from `docs/docker.md` / `docs/docker-checkpoints.md` already works without hot-reload. We are moving from "runs on my laptop" to "runs on a Hostinger AIC VPS".
>
> Hostinger AIC provides its own reverse proxy and TLS termination at the platform edge, so we do **not** run a local Nginx container on the VPS.

---

## 0. What we will end up with

| Component               | Tool / Decision                                                         |
| ----------------------- | ----------------------------------------------------------------------- |
| VPS                     | Hostinger AIC Essential: 1 vCPU, 1 GB RAM, 10 GB NVMe, Ubuntu 24.04 LTS |
| Container orchestration | Docker Compose v2 (same files, with a prod override)                    |
| Reverse proxy + TLS     | Hostinger AIC (platform-managed)                                        |
| DB migrations           | TypeORM explicit migrations; `synchronize: false` in production         |
| Image delivery          | Build locally (or via CI), push to Docker Hub / GHCR, pull on the VPS   |
| Secrets                 | `.env` file on the server only; never committed                         |

Architecture:

```
Internet → AIC reverse proxy (:443) → backend:${BACKEND_HOST_PORT:-443} (Docker host port)
                                          ↓
                                   postgres:5432 (internal only)
```

AIC terminates TLS. The backend container listens on port `8000` internally and is bound to the host port configured in `.env` (`BACKEND_HOST_PORT`, default `443`).

---

## 1. Implementation order

We will do this in three phases. Do not start Phase 2 until Phase 1 is verified. Do not start Phase 3 until Phase 2 is verified.

| Phase                                 | Goal                                                                              | Verifies                                                                                       |
| ------------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| **Phase 1 — Migrations**              | Replace `synchronize: true` with explicit TypeORM migrations and run them locally | `typeorm migration:generate` and `migration:run` work against a fresh local Postgres container |
| **Phase 2 — Production Docker files** | Add `docker-compose.prod.yml`, log rotation, no local Nginx                       | `docker compose -f docker-compose.yml -f docker-compose.prod.yml config` parses cleanly        |
| **Phase 3 — VPS deploy**              | Provision server, copy repo/image, pull and run                                   | HTTPS `/health` responds from the public domain                                                |

---

## 2. Phase 1 — Migrations (do this first)

### 2.1 Why before deploy

`data-source.ts` currently has `synchronize: true`. If we deploy with that, TypeORM will auto-create/alter the production schema on every container start. That is fine for learning but dangerous for live data. We switch to explicit migrations first.

### 2.2 Files to touch

| File                                                       | Change                                                                                                                                               |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/backend/src/database/data-source.ts`                 | Set `synchronize: !isProduction`, add `migrations` array, point at `src/database/migrations/*.ts` in dev and `dist/database/migrations/*.js` in prod |
| `apps/backend/src/database/migrations/`                    | New folder for generated migration files                                                                                                             |
| `apps/backend/package.json`                                | Add `db:generate` and `db:migrate` scripts that invoke TypeORM CLI via `tsx`                                                                         |
| `apps/backend/tsconfig.json`                               | Ensure `emitDecoratorMetadata: true` so TypeORM can read decorators at generation time (the CLI needs this)                                          |
| `docker-compose.yml` or a new `docker-compose.migrate.yml` | Provide a one-shot container to run `migration:run` against the same Postgres service                                                                |
| `docker-compose.migrate-cli.yml`                           | Local helper: run `db:generate` / `db:migrate` / `db:revert` inside a one-off container on the `jfp-net` network                                     |

### 2.3 Steps

> **Why we run the CLI inside Docker and not on the host.**
> `docker-compose.yml` does not publish Postgres on port 5432 to the host
> (Postgres is intentionally reachable only from other containers on `jfp-net`).
> Running the TypeORM CLI on the host with `host: localhost` would hit
> `ECONNREFUSED 127.0.0.1:5432`. We use `docker-compose.migrate-cli.yml`
> to run the CLI inside a container joined to `jfp-net` so it can reach
> Postgres by service name. We also bind-mount
> `apps/backend/src/database` into that container so the generated
> migration files land on the host and are visible to git.

1. **Prepare a clean local database** so the first migration captures the full current schema:

   ```bash
   docker compose --env-file .env down -v
   docker compose --env-file .env up -d postgres
   ```

2. **Generate the initial migration** from the current entities. The path is
   relative to the container's working directory (`/repo/apps/backend`), and
   the bind mount in `docker-compose.migrate-cli.yml` makes the file appear
   on the host at `apps/backend/src/database/migrations/`:

   ```bash
   docker compose --env-file .env \
     -f docker-compose.yml -f docker-compose.migrate-cli.yml \
     run --rm migrate-cli \
     pnpm --filter backend db:generate src/database/migrations/InitialSchema
   ```

   TypeORM will compare the entities to an empty database and produce a `.ts` migration.

3. **Review the generated migration** before committing. Check column types, indexes, and foreign keys:

   ```bash
   ls -la apps/backend/src/database/migrations/
   ```

4. **Verify the migration runs** against a fresh database:

   ```bash
   docker compose --env-file .env down -v
   docker compose --env-file .env up -d postgres
   docker compose --env-file .env \
     -f docker-compose.yml -f docker-compose.migrate-cli.yml \
     run --rm migrate-cli \
     pnpm --filter backend db:migrate
   ```

5. **Smoke test the app** with `synchronize: false`:

   ```bash
   docker compose --env-file .env up --build -d
   curl -s http://localhost:8000/health
   docker compose exec postgres psql -U jfp -d jfp -c '\dt'
   ```

### 2.4 Day-to-day migration workflow after this

Whenever an entity changes:

```bash
# 1. Update the entity file.
# 2. Generate a migration (the file lands on the host thanks to the bind mount).
docker compose --env-file .env \
  -f docker-compose.yml -f docker-compose.migrate-cli.yml \
  run --rm migrate-cli \
  pnpm --filter backend db:generate src/database/migrations/AddXColumn

# 3. Review and commit the generated file.
# 4. Apply on production during deploy.
```

---

## 3. Phase 2 — Production Docker files

### 3.1 New files

| File                      | Purpose                                                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `docker-compose.prod.yml` | Production override: pre-built image reference, log rotation, expose backend on host port, **no local Nginx** |
| `.env.docker.example`     | Production template with public `VITE_*` URLs, `BACKEND_HOST_PORT`, and `NODE_TRUST_PROXY`                    |
| `scripts/deploy.sh`       | One-command redeploy script                                                                                   |

### 3.2 `docker-compose.prod.yml`

The production override:

- Switches `backend` to a pre-built image referenced by `${DOCKER_REGISTRY}/jfp-backend:${IMAGE_TAG}`.
- Exposes the backend container on a host port (`BACKEND_HOST_PORT`, default `443`) so AIC can forward public HTTPS traffic to it.
- Does **not** include a local Nginx or certbot service; AIC handles TLS.

### 3.3 Trusting the AIC reverse proxy

The backend enables Express `trust proxy` automatically in production (or when `NODE_TRUST_PROXY` is set). This makes `req.secure`, `X-Forwarded-Proto`, and `req.ip` behave correctly behind AIC.

Set `NODE_TRUST_PROXY` in `.env` to control the behavior:

| Value                     | Meaning                              |
| ------------------------- | ------------------------------------ |
| `true`, `yes`, `on`, `1`  | Trust all proxies (simplest for AIC) |
| `2`, `3`, ...             | Trust the first N proxy hops         |
| comma-separated IPs       | Trust only those proxy IPs           |
| `false`, `no`, `0`, `off` | Disable trust proxy                  |

If `NODE_TRUST_PROXY` is not set, the backend defaults to `true` in production.

### 3.4 Image strategy

Because the Essential 1 GB plan is too small to build the monorepo reliably, we build and push the image from the local machine.

---

## 4. Phase 3 — VPS Deployment

This section uses the real values for this project:

| Value                               | What it is                                  |
| ----------------------------------- | ------------------------------------------- |
| `37.187.159.43:20037`               | Hostinger AIC VPS SSH endpoint              |
| `jfp-shreeharsha.duckdns.org`       | Public domain                               |
| `shreeharsha042`                    | Docker Hub username                         |
| `shreeharsha042/jfp-backend:latest` | Backend image                               |
| `443`                               | Host port that AIC forwards public HTTPS to |

Replace these with your own values if you are adapting this runbook.

### 4.1 Server provisioning

1. Create the Hostinger AIC instance:
   - OS: Ubuntu 24.04 LTS
   - Plan: Essential 1 GB (1 vCPU / 1 GB RAM / 10 GB NVMe)

2. Log in via SSH as root (Hostinger provides the password):

   ```bash
   ssh root@37.187.159.43 -p 20037
   ```

3. Create a non-root deploy user:

   ```bash
   adduser deploy
   usermod -aG sudo deploy
   ```

4. Install Docker + Compose v2:

   ```bash
   apt update && apt upgrade -y
   apt install -y ca-certificates curl gnupg
   install -m 0755 -d /etc/apt/keyrings
   curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
   echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list
   apt update
   apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
   usermod -aG docker deploy
   ```

5. Log out and SSH back in as `deploy`, then verify Docker works:

   ```bash
   docker compose version
   ```

### 4.2 Domain and DNS

1. Add an `A` record for `jfp-shreeharsha.duckdns.org` pointing to `37.187.159.43`.
2. In the Hostinger AIC panel, configure the reverse proxy to forward HTTPS traffic to your VPS host port (default `443`).
3. Wait for propagation (minutes to hours).
4. Verify from your local machine:

   ```bash
   nslookup jfp-shreeharsha.duckdns.org
   ```

### 4.3 Build and push the backend image from your local machine

The image bakes the production URLs into the web bundle, so build with the public domain values.

```bash
# From the repo root on your local machine
docker build \
  -f apps/backend/Dockerfile \
  --build-arg VITE_WEB_BACKENDAPI=https://jfp-shreeharsha.duckdns.org/api \
  --build-arg VITE_APP_NAME="JFP App" \
  --build-arg VITE_WS_URL=wss://jfp-shreeharsha.duckdns.org/ws \
  --build-arg VITE_WEB_APP_URL=https://jfp-shreeharsha.duckdns.org \
  --build-arg VITE_WEB_APP_PORT=443 \
  --build-arg VITE_TRANSIT_SECRET=bdfe0dea4bb4be226342a49348035a2a8d3e5e39004cd27c0829ac23e0b9a7c0 \
  --build-arg VITE_EXT_CLIENT_ID=201945282141-dsj6k0hes91d4h3oc6qn14qfimob0e2i.apps.googleusercontent.com \
  --build-arg VITE_EXT_BACKENDAPI=https://jfp-shreeharsha.duckdns.org/api \
  --build-arg VITE_EXT_WS_URL=wss://jfp-shreeharsha.duckdns.org/ws \
  -t shreeharsha042/jfp-backend:latest .

# Push to Docker Hub (you will be asked to log in the first time)
docker login
docker push shreeharsha042/jfp-backend:latest
```

### 4.4 Copy application files to the server

On your local machine, copy only the orchestration files. The backend code is inside the pulled image.

```bash
# From the repo root
scp -P 20037 \
  docker-compose.yml docker-compose.prod.yml \
  deploy@37.187.159.43:~/jfp/
```

### 4.5 Create the production `.env`

On the VPS:

```bash
ssh deploy@37.187.159.43 -p 20037
cd ~/jfp
nano .env
chmod 600 .env
```

Fill `.env` with these values. Secrets marked `<fill>` must be generated/entered by you.

```dotenv
# ──── Postgres ────
POSTGRES_DB=jfp
POSTGRES_USER=jfp
POSTGRES_PASSWORD=<fill: strong random password>

# ──── Backend runtime ────
NODE_PORT=8000
NODE_DATABASE_CONFIG={"host":"postgres","username":"jfp","password":"<same as POSTGRES_PASSWORD>","database":"jfp","port":5432}
NODE_CORS_ORIGIN=https://jfp-shreeharsha.duckdns.org
NODE_JWT_SECRET=<fill: openssl rand -hex 32>
NODE_JWT_EXPIRES_IN=7d
NODE_RATE_LIMIT_MAX=100
# Trust the AIC reverse proxy (true = trust all proxies)
NODE_TRUST_PROXY=true

# ──── Google OAuth2 ────
NODE_GOOGLE_CLIENT_ID=
NODE_GOOGLE_CLIENT_SECRET=
NODE_GOOGLE_REDIRECT_URI=https://jfp-shreeharsha.duckdns.org/api/user/google/callback

# ──── Gmail SMTP ────
NODE_GMAIL_USER=
NODE_GMAIL_APP_PASSWORD=

# ──── Transit secret shared with web/extension ────
TRANSIT_SECRET=bdfe0dea4bb4be226342a49348035a2a8d3e5e39004cd27c0829ac23e0b9a7c0

# ──── Vite build-time vars (already baked into the image above) ────
VITE_WEB_BACKENDAPI=https://jfp-shreeharsha.duckdns.org/api
VITE_APP_NAME=JFP App
VITE_WS_URL=wss://jfp-shreeharsha.duckdns.org/ws
VITE_WEB_APP_URL=https://jfp-shreeharsha.duckdns.org
VITE_WEB_APP_PORT=443
VITE_TRANSIT_SECRET=bdfe0dea4bb4be226342a49348035a2a8d3e5e39004cd27c0829ac23e0b9a7c0

# ──── Chrome extension OAuth ────
VITE_EXT_CLIENT_ID=201945282141-dsj6k0hes91d4h3oc6qn14qfimob0e2i.apps.googleusercontent.com
VITE_EXT_BACKENDAPI=https://jfp-shreeharsha.duckdns.org/api
VITE_EXT_WS_URL=wss://jfp-shreeharsha.duckdns.org/ws

# ──── Deployment / AIC ────
BACKEND_HOST_PORT=443
DOMAIN=jfp-shreeharsha.duckdns.org
DOCKER_REGISTRY=shreeharsha042
IMAGE_TAG=latest
```

### 4.6 Stop the old local Nginx (if it was running from the previous setup)

If you previously deployed the local Nginx/certbot stack, stop and remove it first:

```bash
cd ~/jfp
docker compose -f docker-compose.yml -f docker-compose.prod.yml stop nginx
docker compose -f docker-compose.yml -f docker-compose.prod.yml rm -f nginx
```

### 4.7 Run migrations and start the stack

1. Run migrations in a one-off container:

   ```bash
   cd ~/jfp
   docker compose -f docker-compose.yml -f docker-compose.prod.yml run --rm backend node apps/backend/dist/database/run-migrations.js
   ```

2. Start everything:

   ```bash
   docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
   ```

### 4.8 Verification

From your local machine:

```bash
curl -s https://jfp-shreeharsha.duckdns.org/health
```

On the VPS:

```bash
# Check containers
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps

# Tail backend logs
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f backend

# Confirm tables exist
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec postgres psql -U jfp -d jfp -c '\dt'
```

---

## 5. Operational commands (cheat sheet for the VPS)

```bash
cd ~/jfp

# Pull a new image and redeploy
./scripts/deploy.sh

# Backup the database
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" > backup-$(date +%F).sql

# Stop everything (keeps data)
docker compose -f docker-compose.yml -f docker-compose.prod.yml down

# Stop and wipe data
docker compose -f docker-compose.yml -f docker-compose.prod.yml down -v
```

---

## 6. Sizing and cost notes

- The **Essential 1 GB** plan is minimal. It will run the stack for light traffic, but building the image on the server will likely OOM. That is why we build locally and push.
- If traffic grows, upgrade to at least 2 GB RAM before adding separate web or extension services.
- Monitor disk usage: 10 GB fills quickly with Docker layers, logs, and Postgres data. Enable log rotation and prune old images weekly:

  ```bash
  docker system prune -af
  ```

---

## 7. Next actions

1. ~~Implement Phase 1 (migrations) and verify it locally.~~
2. ~~Implement Phase 2 files (`docker-compose.prod.yml`, trust proxy).~~
3. Build and push the first backend image from your local machine.
4. Copy compose files to the server and create `.env`.
5. Stop any old local Nginx container and start the stack.
6. Verify HTTPS `/health`.

in the aic machine the username is deploy and password is system123#
now login to machine with ssh deploy@37.187.159.43 -p 20037
