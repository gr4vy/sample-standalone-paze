#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
[ -f config.js ] || cp config.js.example config.js
pnpm install --frozen-lockfile
pnpm build
