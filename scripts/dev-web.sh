#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "FAC_WEB_STARTING"
pnpm dev &
pid=$!
trap 'kill "$pid" 2>/dev/null || true' EXIT INT TERM

until curl -sf -o /dev/null http://127.0.0.1:3000 2>/dev/null; do
  sleep 0.3
done

echo "FAC_WEB_READY"
wait "$pid"
