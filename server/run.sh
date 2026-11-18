#!/usr/bin/env bash
# Start the Node server from its own directory so relative paths resolve.
set -euo pipefail
cd "$(dirname "$0")"
exec node src/index.js
