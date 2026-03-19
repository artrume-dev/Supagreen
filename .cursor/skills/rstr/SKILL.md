---
name: rstr
description: Restarts Recipe-Genie dev servers for web, native, or all.
---

# Rstr

## Purpose

Restart local development servers for this repository:
- API server on port `3001`
- Web app on port `5173`
- Native Expo app on port `8082` (or nearest free Expo port)

This skill performs a full restart only: stop existing server processes, then start the requested stack.

## Mode Selection

Use the user's request to pick one of these modes:

- **native**: restart API + mobile Expo
- **web**: restart API + web app
- **all**: restart API + web + mobile Expo

If not specified, default to **native**.

## Shared Stop Step

Run from repo root in this exact order:

```bash
cd /Users/samarmustafa/Documents/1Samar/50-apps-to-launch/Recipe-Genie
lsof -ti :3001 -ti :5173 -ti :5174 -ti :8081 -ti :8082 -ti :8083 | xargs kill -9 2>/dev/null
```

## Start API (terminal 1)

```bash
cd /Users/samarmustafa/Documents/1Samar/50-apps-to-launch/Recipe-Genie
set -a; source .env; set +a
COREPACK_HOME="$PWD/.local/corepack" corepack pnpm --filter @workspace/api-server run dev
```

## Start Web (terminal 2, for `web` or `all`)

```bash
cd /Users/samarmustafa/Documents/1Samar/50-apps-to-launch/Recipe-Genie
set -a; source .env; set +a
PORT=5173 BASE_PATH=/ COREPACK_HOME="$PWD/.local/corepack" corepack pnpm --filter @workspace/web-app run dev
```

## Start Native (terminal 2 or 3, for `native` or `all`)

For simulator/local machine:

```bash
cd /Users/samarmustafa/Documents/1Samar/50-apps-to-launch/Recipe-Genie
set -a; source .env; set +a
CI=false EXPO_PUBLIC_BYPASS_AUTH=1 EXPO_PUBLIC_API_BASE_URL="http://localhost:3001" REACT_NATIVE_PACKAGER_HOSTNAME="localhost" COREPACK_HOME="$PWD/.local/corepack" corepack pnpm --filter @workspace/mobile-app exec expo start --host localhost --port 8082 --clear
```

For physical device on same Wi-Fi (LAN):

```bash
cd /Users/samarmustafa/Documents/1Samar/50-apps-to-launch/Recipe-Genie
set -a; source .env; set +a
CI=false EXPO_PUBLIC_BYPASS_AUTH=1 EXPO_PUBLIC_API_BASE_URL="http://<YOUR_LOCAL_IP>:3001" REACT_NATIVE_PACKAGER_HOSTNAME="<YOUR_LOCAL_IP>" COREPACK_HOME="$PWD/.local/corepack" corepack pnpm --filter @workspace/mobile-app exec expo start --host lan --port 8082 --clear
```
