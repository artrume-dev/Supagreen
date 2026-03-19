# Gemini Image Generation Plan (Future Phase)

## Objective

Add high-quality, consistent recipe images using Gemini image generation while keeping Anthropic as the source of truth for recipe, nutrition, and ingredient intelligence.

## Current State

- Recipe text/json generation: Anthropic (working)
- Image source: fallback/static or external URLs
- DB can already store image URL inside `daily_recipes.recipe_json`

## Non-Goals (for now)

- No custom model training
- No migration away from Anthropic for recipe logic
- No user-upload image editing flow in v1

## Proposed Architecture

1. Keep recipe generation in `services/recipeGenerator.ts` (Anthropic)
2. Add new image service module, e.g. `services/recipeImageGenerator.ts`
3. For each generated recipe:
   - Build prompt from meal type + title + key ingredients + style rules
   - Request image from Gemini image model
   - Store hosted URL (or base64 converted and uploaded to storage)
4. Save `imageUrl` back into `recipeJson` before DB insert/update
5. Use fallback image when image generation fails

## Data Model & Storage

- Continue storing `imageUrl` in `recipeJson`
- Add optional metadata fields:
  - `imageProvider` (`gemini` | `fallback`)
  - `imagePromptVersion`
  - `imageGeneratedAt`
- If needed later, add a dedicated table for generated assets:
  - `generated_recipe_images(id, recipe_id, provider, prompt, url, created_at)`

## API/Backend Tasks

1. Add env vars:
   - `GEMINI_API_KEY`
   - `GEMINI_IMAGE_MODEL`
2. Create image generation wrapper with strict timeout + retries
3. Integrate into:
   - initial daily generation flow
   - regenerate-one-meal flow
4. Add circuit breaker:
   - if image provider fails repeatedly, skip image generation for request and proceed with recipe text

## Prompting Guidelines

- Keep style consistent:
  - overhead or 3/4 angle food photography
  - natural lighting
  - realistic textures
  - no text overlays
  - no logos/watermarks
- Constrain by recipe context:
  - meal type
  - major ingredients
  - dietary style (vegan/keto/etc.)

## Caching & Cost Control

- Deterministic cache key:
  - hash(`title + meal + keyIngredients + promptVersion`)
- Reuse cached image when key matches
- Daily quotas and fail-open behavior for free tier

## UX Rules

- Never block recipe delivery on image failures
- Show shimmer while image loads
- Always show fallback if image URL missing/broken
- Prefer generated image only after URL health check

## Rollout Plan

### Phase 1 — Internal Toggle
- Feature flag: `ENABLE_GEMINI_IMAGES=false`
- Implement service + API integration behind flag
- Verify no regressions in recipe generation latency/error rate

### Phase 2 — Partial Exposure
- Enable for a small percentage or internal accounts
- Monitor:
  - image generation latency
  - failure rate
  - storage and API costs

### Phase 3 — Full Release
- Enable for all users with quota controls
- Add analytics events for image success/fallback rates

## Observability & QA

- Log fields:
  - request id, provider, model, duration, success/failure
- Add tests:
  - image service success
  - timeout/failure fallback
  - no-image path still returns valid recipes
- Manual QA checklist:
  - Home cards display expected images
  - Recipe detail hero image matches recipe context
  - Regeneration updates image with recipe

## Security

- Keep Gemini key server-side only
- Never expose raw provider key to frontend
- Sanitize prompts to avoid user-injected unsafe content

## Decision Checkpoint

Proceed only after:
- Stable recipe generation baseline
- Confirmed cost envelope
- Satisfactory visual quality and consistency in QA
