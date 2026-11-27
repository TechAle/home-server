#!/usr/bin/env bash
# Start the built server (run `npm run build` first).
set -euo pipefail
cd "$(dirname "$0")"
exec node dist/index.js
