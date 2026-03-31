#!/bin/zsh

set -euo pipefail

PORTS=(3000 3001 3002 3003 3004 3005 3006 3007 3008 3009 3010 3011)

for port in "${PORTS[@]}"; do
  pids=$(lsof -tiTCP:${port} -sTCP:LISTEN 2>/dev/null || true)
  if [[ -n "${pids}" ]]; then
    echo "Stopping existing dev server on port ${port}: ${pids}"
    kill ${=pids} 2>/dev/null || true
  fi
done

sleep 1

echo "Starting clean Next.js dev server on port 3000"
exec npx next dev -p 3000
