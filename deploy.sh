#!/usr/bin/env bash
# Self-hosting deployment helper for دليل النبك.
# Usage: ./deploy.sh
set -euo pipefail

cd "$(dirname "$0")"

if [ ! -f .env ]; then
  echo "ERROR: artifacts/nabk-directory/.env is missing." >&2
  echo "Copy .env.example to .env and fill in the values, then re-run." >&2
  exit 1
fi

echo "→ Pulling latest images..."
docker compose pull

echo "→ Building app image..."
docker compose build

echo "→ Starting services..."
docker compose up -d

echo "→ Waiting for database..."
sleep 5

echo "→ Applying database schema..."
# Uses prisma db push for self-hosters (no migration history required).
# Switch to `prisma migrate deploy` once you adopt formal migrations.
docker compose exec -T app sh -c \
  "cd artifacts/nabk-directory && npx prisma db push --skip-generate --accept-data-loss"

echo "→ Done. App is available at NEXT_PUBLIC_APP_URL."
echo "  Health check: curl http://localhost/api/health"
