#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

docker compose up -d postgres

echo "Waiting for Postgres..."
until docker compose exec -T postgres pg_isready -U fac -d fac_app >/dev/null 2>&1; do
  sleep 0.5
done

# VS Code background-task handshake (see .vscode/tasks.json)
echo "FAC_POSTGRES_READY"

exec docker compose logs -f postgres
