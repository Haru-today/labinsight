#!/bin/zsh
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$SCRIPT_DIR/LabInsight"

if [ ! -d "$APP_DIR" ]; then
  APP_DIR="$SCRIPT_DIR"
fi

cd "$APP_DIR" || exit 1

if command -v node >/dev/null 2>&1; then
  PORT="${PORT:-8000}"
  node server.js &
  SERVER_PID=$!
  sleep 1
  open "http://localhost:${PORT}"
  wait "$SERVER_PID"
else
  open "index.html"
fi
