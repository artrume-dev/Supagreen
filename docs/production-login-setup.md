# Production Login Setup

This guide covers what you need to deploy Recipe-Genie with working Google OAuth login (no local/ngrok).

---

## 1. What I Need From You

To give you exact steps, please share:

| Item | Example | Your value |
|------|---------|------------|
| **API host** | `https://api.recipegenie.com` or `https://recipegenie-xxx.railway.app` | ? |
| **Web app host** (if separate) | `https://recipegenie.com` | ? |
| **Hosting choice** | Railway, Render, Fly.io, Vercel, etc. | ? |

---

## 2. Checklist Overview

### A. Host the API Server

Deploy the API server to a host that supports Node.js and PostgreSQL:

- **Railway** – simple, built-in Postgres
- **Render** – free tier, Postgres add-on
- **Fly.io** – global deployment
- **Vercel** – serverless (needs adapter for Express)

**Required environment variables on the API server:**

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `GOOGLE_CLIENT_ID` | Yes | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Yes | From Google Cloud Console |
| `ISSUER_URL` or `OIDC_ISSUER_URL` | Optional | Default: `https://accounts.google.com` |
| `PUBLIC_OAUTH_ORIGIN` | If behind proxy | Your API base URL, e.g. `https://api.yourdomain.com` |

### B. Configure Google OAuth (Google Cloud Console)

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials.
2. Create or edit an **OAuth 2.0 Client ID** of type **Web application**.
3. Add these **Authorized redirect URIs**:

   | Use case | Redirect URI |
   |----------|--------------|
   | Web login | `https://YOUR_API_DOMAIN/api/callback` |
   | Mobile app (production) | `mobile-app://auth/callback` |

4. **Authorized JavaScript origins** (if you have a web app on another domain):
   - `https://your-web-app-domain.com`

5. Save and copy the **Client ID** and **Client Secret** into your API server env vars.

### C. Build the Mobile App for Production

Set the API base URL at build time:

```bash
EXPO_PUBLIC_API_BASE_URL="https://your-api-domain.com" pnpm --filter @workspace/mobile-app exec expo prebuild
# or for EAS Build:
eas build --profile production
```

In `eas.json` (or build config), set:

```json
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_API_BASE_URL": "https://your-api-domain.com"
      }
    }
  }
}
```

### D. Database Setup

Run migrations against your production database:

```bash
DATABASE_URL="postgresql://..." pnpm --filter @workspace/db exec drizzle-kit push
# or: drizzle-kit migrate
```

---

## 3. Redirect URI Details

| Platform | Redirect URI | When used |
|----------|--------------|-----------|
| Web | `https://api.example.com/api/callback` | Browser login |
| Mobile (standalone/dev-client) | `mobile-app://auth/callback` | App scheme from `app.json` |
| Expo Go (dev only) | `exp://192.168.x.x:8081/--/auth/callback` | Dev only, changes per run |

For production, only the first two matter. Add both to Google Cloud Console.

---

## 4. Common Issues

### "Could not load auth configuration"

- API server not reachable from the device (check URL, CORS, firewall).
- `GOOGLE_CLIENT_ID` or `GOOGLE_CLIENT_SECRET` missing on the server.
- API base URL wrong in the app (check `EXPO_PUBLIC_API_BASE_URL` at build time).

### "redirect_uri_mismatch" from Google

- Redirect URI in Google Console must match exactly (including scheme and path).
- For mobile: `mobile-app://auth/callback` (no trailing slash).

### CORS errors (web app)

- API uses `cors({ credentials: true, origin: true })`, so any origin is allowed.
- For stricter CORS, configure `origin` to your web app domain(s).

---

## 5. Next Steps

1. Choose where to host the API (Railway, Render, etc.).
2. Provision a PostgreSQL database and set `DATABASE_URL`.
3. Configure Google OAuth as above.
4. Deploy the API with the required env vars.
5. Build the mobile app with `EXPO_PUBLIC_API_BASE_URL` set.
6. Test login on web and mobile.

Share your chosen API host and hosting provider, and I can give you step‑by‑step deployment commands for that setup.
