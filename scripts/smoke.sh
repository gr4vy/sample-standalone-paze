#!/usr/bin/env bash
# Proves the production build starts and serves the home page without real credentials.
set -euo pipefail
cd "$(dirname "$0")/.."
[ -f config.js ] || cp config.js.example config.js
pnpm install --frozen-lockfile
pnpm build
PORT=$(node -e 'const s=require("net").createServer().listen(0,()=>{console.log(s.address().port);s.close()})')
pnpm exec next start -p "$PORT" &
PID=$!
trap 'pkill -P $PID 2>/dev/null || true; kill $PID 2>/dev/null || true' EXIT
for _ in $(seq 60); do
  if [ "$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:$PORT/")" = 200 ]; then
    echo "smoke: 200 on port $PORT"
    exit 0
  fi
  sleep 1
done
echo "smoke: no 200 on port $PORT after 60s" >&2
exit 1
