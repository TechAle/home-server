#!/usr/bin/env bash
# Start the Flask server from its own directory so relative paths resolve.
set -euo pipefail
cd "$(dirname "$0")"
exec python3 flaskMain.py
