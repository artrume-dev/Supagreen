#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f ".env" ]]; then
  echo "Missing .env file at $ROOT_DIR/.env"
  exit 1
fi

echo "Stopping existing dev servers on ports 3001 and 5173..."
lsof -ti :3001 -ti :5173 | xargs kill -9 2>/dev/null || true

echo "Loading environment from .env..."
set -a
source .env
set +a

COREPACK_HOME="$ROOT_DIR/.local/corepack"
export COREPACK_HOME

echo "Starting API server on http://localhost:3001 ..."
(
  cd "$ROOT_DIR/artifacts/api-server"
  corepack pnpm dev
) &
API_PID=$!

echo "Starting web app on http://localhost:5173 ..."
(
  cd "$ROOT_DIR/artifacts/web-app"
  PORT=5173 BASE_PATH=/ corepack pnpm dev
) &
WEB_PID=$!

echo "API PID: $API_PID"
echo "WEB PID: $WEB_PID"
echo "Press Ctrl+C to stop both servers."

cleanup() {
  echo ""
  echo "Stopping servers..."
  kill "$API_PID" "$WEB_PID" 2>/dev/null || true
}

trap cleanup INT TERM EXIT
wait
