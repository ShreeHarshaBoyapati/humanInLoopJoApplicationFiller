#!/usr/bin/env bash
set -euo pipefail

# One-command redeploy script for the VPS (Hostinger AIC setup).
# Pulls the latest backend image, runs TypeORM migrations, then restarts the
# backend + postgres stack. Run from the repo root on the server after the
# production .env is in place.
# NOTE: AIC provides the reverse proxy + TLS, so there is no local Nginx.

cd "$(dirname "$0")/.."

IMAGE_TAG="${IMAGE_TAG:-latest}"
REGISTRY="${DOCKER_REGISTRY:-shreeharsha042}"

echo "Pulling backend image ${REGISTRY}/jfp-backend:${IMAGE_TAG}..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml pull backend

echo "Running database migrations..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml run --rm backend node apps/backend/dist/database/run-migrations.js

echo "Starting / restarting stack..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

echo "Deploy complete. Check health with:"
echo "  curl -s https://\${DOMAIN}/health"
