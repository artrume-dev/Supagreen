# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## NutriSnap

An AI-powered personalised healthy recipe app targeting Gen Z / young Millennials (16–30). Generates 3 whole-food recipes per day (breakfast, lunch, dinner) based on dietary preferences, health goals, seasonal ingredient availability, and nearby stores.

### Design Mockup

Built in the mockup sandbox with 7 interactive screens:

- **SignIn** — 4 states: welcome/signup/signin/forgot password
- **Onboarding** — 5-step flow (diet type, allergies, health goal, skill level, location)
- **HomeFeed** — Daily recipe feed with macro rings, streak counter, horizontal-scroll recipe cards
- **RecipeDetail** — Full-bleed hero image, macros, tap-to-check ingredients & steps, health benefits, smart swap
- **ShoppingList** — Grouped shopping list with nearby store cards, check-off, bulk actions
- **Profile** — Streak milestones, weekly macro bar chart, saved recipes, TikTok share CTA
- **LandingPage** — Marketing landing page with pricing/FAQ/testimonials

Design spec:
- Primary: #22C55E (green) · Accent: #F97316 (orange) · Dark bg: #0F1710 · Cards: #1C2B1E
- Typography: Plus Jakarta Sans (headings), Inter (body)
- All components live in `artifacts/mockup-sandbox/src/components/mockups/nutrisnap/`

### Database Schema (6 tables)

- **sessions** — Replit Auth session store (sid, sess JSONB, expire)
- **users** — Replit Auth users (id, email, firstName, lastName, profileImageUrl)
- **user_profiles** — Onboarding data (dietType, allergies[], healthGoal, skillLevel, caloriesTarget, city/country/lat/lng)
- **daily_recipes** — Generated daily recipes (userId, date, mealType, recipeJson JSONB, wasRegenerated)
- **saved_recipes** — User-saved favorites (userId, recipeJson JSONB)
- **shopping_lists** — Auto-generated shopping lists (userId, date, itemsJson JSONB, checkedItems[])
- **user_streaks** — Cooking streak tracking (currentStreak, longestStreak, lastCookedAt)

### API Endpoints

All routes mounted at `/api`:

**Auth (Replit Auth OIDC)**
- `GET /me` — current authenticated user (returns null if not logged in)
- `GET /login` — browser OIDC login redirect
- `GET /callback` — OIDC callback
- `GET /auth/logout` — session clear + OIDC logout
- `POST /mobile-auth/token-exchange` — mobile auth code exchange
- `POST /mobile-auth/logout` — mobile session deletion

**Profile**
- `GET /profile` — get user profile (protected)
- `PUT /profile` — upsert profile/onboarding data (protected)

**Recipes**
- `GET /recipes/today?date=` — get today's recipes; if none exist for today, auto-generates 3 via Claude AI (protected)
- `POST /recipes/regenerate` — regenerate a specific meal slot via Claude AI (max 3/day, protected)
- `GET /saved-recipes` — list saved recipes (protected)
- `POST /saved-recipes` — save a recipe (protected)
- `DELETE /saved-recipes/:id` — remove saved recipe (protected)

**Shopping**
- `GET /shopping-list?date=` — get shopping list for a date (protected)
- `PUT /shopping-list` — create or replace shopping list for a date (protected)
- `PATCH /shopping-list/check` — toggle item checked/unchecked (protected)
- `GET /shopping-list/stores?lat=&lng=&radius=` — find top 5 nearby grocery stores via Google Places (protected)

**Streaks**
- `GET /streak` — get current streak data (protected)
- `PATCH /streak` — log a cooked meal, update streak with 48-hour reset logic (protected)

### Authentication

Uses Replit Auth (OpenID Connect with PKCE). Key files:
- `artifacts/api-server/src/lib/auth.ts` — session CRUD, OIDC config
- `artifacts/api-server/src/middlewares/authMiddleware.ts` — loads user from session
- `artifacts/api-server/src/routes/auth.ts` — login/callback/logout routes
- `lib/db/src/schema/auth.ts` — sessions + users tables

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: Replit Auth (openid-client v6)
- **AI**: Anthropic Claude (claude-sonnet-4-6) via Replit AI Integrations proxy (`@workspace/integrations-anthropic-ai`)
- **Store Finder**: Google Places API (requires `GOOGLE_PLACES_API_KEY` env var)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

### `artifacts/mobile-app` (`@workspace/mobile-app`)

Expo React Native mobile app with Expo Router file-based routing, dark theme (#0F1710), and 3-tab navigation (Home, Shop, Profile).

- Screens:
  - `app/sign-in.tsx` — Sign in with Replit Auth
  - `app/onboarding.tsx` — 6-step onboarding (diet, allergies, goal, skill, location, targets)
  - `app/(tabs)/index.tsx` — Home feed (daily recipes, macro rings, streak badge)
  - `app/(tabs)/shopping.tsx` — Shopping list (grouped by aisle, check-off, bulk actions)
  - `app/(tabs)/profile.tsx` — Profile (streak milestones, saved recipes, settings)
  - `app/recipe/[id].tsx` — Recipe detail (hero, macros, ingredients, steps, sticky CTA)
- Auth: `lib/auth.ts` — OIDC via expo-web-browser + token exchange via `POST /api/mobile-auth/token-exchange`, Bearer token stored in AsyncStorage
- API: `lib/api.ts` — fetch wrapper with Bearer auth header for all API calls
- Theme: `constants/colors.ts` — primary #22C55E, accent #F97316, bg #0F1710, card #1C2B1E
- Tab bar: NativeTabs with liquid glass on iOS 26+, classic Tabs with BlurView fallback
- `pnpm --filter @workspace/mobile-app run dev` — run the Expo dev server

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── mobile-app/         # Expo React Native mobile app
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   ├── integrations-anthropic-ai/  # Anthropic SDK client (Replit AI Integrations proxy)
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS (credentials+origin), cookieParser, JSON/urlencoded, authMiddleware, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers (health, auth, profile, recipes, shopping, streaks)
- Auth middleware: `src/middlewares/authMiddleware.ts` — loads user from session on every request
- Auth lib: `src/lib/auth.ts` — session CRUD, OIDC config helper
- Depends on: `@workspace/db`, `@workspace/api-zod`, `openid-client`
- `pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle (`dist/index.cjs`)
- Build bundles an allowlist of deps (express, cors, pg, drizzle-orm, zod, etc.) and externalizes the rest

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models
- `src/schema/auth.ts` — sessions + users tables (Replit Auth)
- `src/schema/userProfiles.ts` — user onboarding/diet data
- `src/schema/dailyRecipes.ts` — daily AI-generated recipes
- `src/schema/savedRecipes.ts` — user-saved recipe favorites
- `src/schema/shoppingLists.ts` — shopping lists with checked items
- `src/schema/userStreaks.ts` — cooking streak tracking
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`, automatically provided by Replit)
- Exports: `.` (pool, db, schema), `./schema` (schema only)

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`, and we fallback to `pnpm --filter @workspace/db run push-force`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec. Used by `api-server` for request/response validation. Key schemas: `GetProfileResponse`, `UpdateProfileBody`, `GetDailyRecipesResponse`, `SaveRecipeBody`, `GetShoppingListResponse`, `ToggleShoppingItemBody`, `GetStreakResponse`, `LogCookedMealBody`.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec.

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.
