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

# Vite build-time env vars. .env is gitignored and never copied into the image,
# so non-secret values needed at bundle time are passed as build args from
# docker-compose.yml, which reads them from .env on the host.
ARG VITE_WEB_BACKENDAPI
ARG VITE_APP_NAME
ARG VITE_WS_URL
ARG VITE_WEB_APP_URL
ARG VITE_WEB_APP_PORT
ARG VITE_TRANSIT_SECRET
ARG VITE_EXT_CLIENT_ID
ARG VITE_EXT_BACKENDAPI
ARG VITE_EXT_WS_URL

ENV VITE_WEB_BACKENDAPI=${VITE_WEB_BACKENDAPI} \
    VITE_APP_NAME=${VITE_APP_NAME} \
    VITE_WS_URL=${VITE_WS_URL} \
    VITE_WEB_APP_URL=${VITE_WEB_APP_URL} \
    VITE_WEB_APP_PORT=${VITE_WEB_APP_PORT} \
    VITE_TRANSIT_SECRET=${VITE_TRANSIT_SECRET} \
    VITE_EXT_CLIENT_ID=${VITE_EXT_CLIENT_ID} \
    VITE_EXT_BACKENDAPI=${VITE_EXT_BACKENDAPI} \
    VITE_EXT_WS_URL=${VITE_EXT_WS_URL}

RUN pnpm --filter web... build
RUN pnpm --filter backend... build

# ─────────────── 3. prod runtime ───────────────
FROM node:24-bookworm-slim AS prod
WORKDIR /repo
ENV NODE_ENV=production \
    PORT=8000

RUN corepack enable \
 && corepack prepare pnpm@10.33.0 --activate

# Copy root workspace files so pnpm sees the same monorepo layout as the build stage.
COPY --from=build /repo/package.json               ./package.json
COPY --from=build /repo/pnpm-lock.yaml               ./pnpm-lock.yaml
COPY --from=build /repo/pnpm-workspace.yaml          ./pnpm-workspace.yaml
COPY --from=build /repo/.npmrc                      ./.npmrc

# Copy backend runtime files.
COPY --from=build /repo/apps/backend/package.json    ./apps/backend/package.json
COPY --from=build /repo/apps/backend/dist            ./apps/backend/dist
COPY --from=build /repo/apps/backend/tsconfig.json   ./apps/backend/tsconfig.json

# Copy the web SPA the backend serves in production.
COPY --from=build /repo/apps/web/dist                ./apps/web/dist
COPY --from=build /repo/apps/web/package.json          ./apps/web/package.json

# Workspace packages the backend imports at runtime.
COPY --from=build /repo/packages/shared-types/package.json ./packages/shared-types/package.json
COPY --from=build /repo/packages/shared-types/dist       ./packages/shared-types/dist
COPY --from=build /repo/packages/utils/package.json      ./packages/utils/package.json
COPY --from=build /repo/packages/utils/dist              ./packages/utils/dist
COPY --from=build /repo/packages/eslint-config/package.json ./packages/eslint-config/package.json
COPY --from=build /repo/packages/typescript-config/package.json ./packages/typescript-config/package.json
COPY --from=build /repo/packages/typescript-config/*.json ./packages/typescript-config/

# Install from the workspace root so workspace:* links resolve against the
# lockfile. --prod is intentionally omitted because workspace packages used at
# runtime are listed as devDependencies in backend's package.json.
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --offline --frozen-lockfile --ignore-scripts

EXPOSE 8000
USER node
CMD ["node", "apps/backend/dist/index.js"]
