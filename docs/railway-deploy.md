# Railway Deployment (API + Mobile App URL)

This repo uses a monorepo layout. The API server lives in `artifacts/api-server` and is already wired for Railway with `railway.toml`.

**Hosted API URL**
Railway assigns a public URL per service. After the first deploy, grab it from Railway:

1. Open your Railway project.
2. Select the API service.
3. Go to **Settings → Domains** and copy the generated domain.

That value becomes your production API base URL, for example:

- `https://<your-service>.railway.app`

---

## 1. Railway Service Setup

Create a Railway project and deploy this repo. The `railway.toml` in the repo sets the build and start commands for the API server.

If you are asked for the build/start commands manually, use:

- Build: `pnpm --filter @workspace/api-server build`
- Start: `pnpm --filter @workspace/api-server start`
- Healthcheck path: `/api/healthz`

---

## 2. Required Environment Variables (API Service)

Set these in Railway for the API service:

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | Railway Postgres connection string. |
| `GOOGLE_CLIENT_ID` | Yes | From Google Cloud Console. |
| `GOOGLE_CLIENT_SECRET` | Yes | From Google Cloud Console. |
| `PUBLIC_OAUTH_ORIGIN` | Recommended | Your Railway API URL, e.g. `https://<your-service>.railway.app`. |
| `GOOGLE_IOS_CLIENT_ID` | For mobile OAuth | iOS OAuth client ID (bundle `com.recipegenie.app`). Required if using `mobile-app://` redirect. |
| `GOOGLE_PLACES_API_KEY` | If using store finder | Required for `/api/shopping-list/stores`. |
| `AI_INTEGRATIONS_ANTHROPIC_API_KEY` | If using AI recipes | Required for recipe generation. |
| `ISSUER_URL` or `OIDC_ISSUER_URL` | Optional | Defaults to Google if unset. |

---

## 3. Database Migration

After Railway Postgres is provisioned and `DATABASE_URL` is set:

```bash
DATABASE_URL="postgresql://..." pnpm --filter @workspace/db exec drizzle-kit push
```

---

## 4. iOS App (App Store Build)

The iOS app reads the API base URL from `EXPO_PUBLIC_API_BASE_URL` at build time.

Once your Railway domain is live, build with:

```bash
EXPO_PUBLIC_API_BASE_URL="https://<your-service>.railway.app" eas build --profile production --platform ios
```

If you prefer to store it in `eas.json`, add this after you know the URL:

```json
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_API_BASE_URL": "https://<your-service>.railway.app"
      }
    }
  }
}
```

---

## 5. Google OAuth Redirects

Use these redirect URIs in Google Cloud Console:

- Web login: `https://<your-service>.railway.app/api/callback`
- Mobile app: `mobile-app://auth/callback`
