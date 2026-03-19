# Native Parity Checklist

Use this checklist to validate full parity between `artifacts/web-app` and `artifacts/mobile-app`.

## Auth and session

- [ ] User can sign in from native landing/sign-in screen.
- [ ] Session restores after app restart.
- [ ] Sign-out clears token and returns to sign-in.
- [ ] Unauthenticated users are redirected to `/sign-in`.

## Onboarding and route guards

- [ ] Users without `dietType`, `healthGoal`, or `skillLevel` are redirected to onboarding.
- [ ] Completed users can access tab routes without onboarding redirect loops.
- [ ] Edit mode (`/onboarding?edit=1`) works from profile settings.
- [ ] Successful onboarding refreshes profile and today recipes queries.

## Home flow

- [ ] Today recipes load and meal cards are ordered breakfast/lunch/dinner/treat.
- [ ] Single meal swap (`/api/recipes/regenerate`) refreshes recipes and handles limit errors.
- [ ] Full menu regenerate (`/api/recipes/regenerate-menu`) refreshes all meals.
- [ ] Empty-state and loading-state UX render correctly.

## Recipe detail flow

- [ ] Detail screen opens from Home and Saved Recipes.
- [ ] Save recipe persists to saved list.
- [ ] Add-to-shopping creates/updates list and supports "Show Shopping List" deep-link.
- [ ] Log meal updates streak and handles duplicate-log errors.

## Shopping flow

- [ ] Daily shopping list loads and item check toggles persist.
- [ ] Grouping by category matches web behavior.
- [ ] Nearby stores load with profile location fallback when no lat/lng query provided.
- [ ] Recipe-filtered shopping view shows only selected ingredients.

## Profile flow

- [ ] Profile summary, streak, and saved recipes render correctly.
- [ ] Meal history loads via `/api/recipes/history` for 7/30/90 day filters.
- [ ] Saved recipe navigation opens recipe detail correctly.
- [ ] Edit preferences action routes to onboarding edit mode.

## API contract and generated clients

- [ ] OpenAPI includes `/capabilities`, `/recipes/history`, and `/recipes/regenerate-menu`.
- [ ] OpenAPI shopping stores params allow omitted lat/lng for profile fallback.
- [ ] `api-client-react` and `api-zod` are regenerated after spec changes.
- [ ] Mobile and API server typecheck pass.

## iOS release readiness (Expo/EAS)

- [ ] `artifacts/mobile-app/eas.json` exists with development/preview/production profiles.
- [ ] EAS scripts run from `artifacts/mobile-app/package.json`.
- [ ] App config includes valid iOS metadata (bundle identifier, icons, splash assets).
- [ ] Preview build succeeds (`eas build --platform ios --profile preview`).
- [ ] Production build and submit succeed.
