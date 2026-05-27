#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "FAC_STUDIO_STARTING"
ready=0
while IFS= read -r line || [[ -n "${line:-}" ]]; do
  printf '%s\n' "$line"
  if [[ $ready -eq 0 ]] && [[ "$line" == *"Drizzle Studio is up and running"* ]]; then
    echo "FAC_STUDIO_READY"
    ready=1
  fi
done < <(pnpm -C apps/web db:studio 2>&1)
