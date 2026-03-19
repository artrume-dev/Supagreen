# Semantic Search Phase 2 (RAG for Recipes)

## Why this doc

Phase 1 already stores recipe content in Postgres:
- Generated daily recipes in `daily_recipes.recipe_json`
- User-saved recipes in `saved_recipes.recipe_json`

This gives us persistence, but not true semantic retrieval. Today we use prompt constraints and rule-based similarity checks. Phase 2 adds embeddings + vector search so chat can retrieve recipes by meaning.

## Goal

Enable a chat flow where users can ask natural-language food requests (for example: "high-protein quick vegetarian lunch"), then:
1. Retrieve semantically relevant recipes from user history and catalog
2. Return best matches when confidence is high
3. Generate a new recipe when no good match exists

## Scope

### In scope
- Embedding pipeline for stored recipes
- Vector index in Postgres (`pgvector`) or equivalent vector store
- Semantic retrieval service
- Confidence threshold + fallback-to-generation logic
- API endpoint(s) for chat retrieval

### Out of scope (for this phase)
- Full conversational memory orchestration
- Multi-modal retrieval (image + text)
- Personalized long-term recommender system

## Current state

- Recipes are already stored as JSON blobs in DB.
- Existing generation path supports profile-aware output and anti-repeat checks.
- No embedding column/index yet.
- No semantic search endpoint yet.

## Proposed architecture

1. **Source of truth**: Postgres rows in:
   - `daily_recipes`
   - `saved_recipes`
2. **Embedding worker**:
   - Creates a normalized text document per recipe
   - Computes embedding vector
   - Upserts vector + metadata into search table
3. **Retrieval API**:
   - Embeds user query
   - KNN vector search with metadata filters
   - Optional reranking
   - Returns top candidates + confidence
4. **Fallback generation**:
   - If top score < threshold, call recipe generation
   - Persist new recipe and enqueue embedding update

## Data model changes

## Option A: Add vector columns to existing tables
- Add `embedding vector(<dim>)` to `daily_recipes` and `saved_recipes`
- Pros: simple joins
- Cons: mixed concerns with OLTP rows

## Option B (recommended): Dedicated semantic index table

Create a table like `recipe_semantic_index`:
- `id` (pk)
- `user_id` (nullable for global recipes)
- `source_table` (`daily_recipes` | `saved_recipes` | `catalog`)
- `source_id` (row id in source table)
- `meal_type`
- `diet_type`
- `health_goal`
- `title`
- `search_text` (normalized text used for embedding)
- `embedding vector(<dim>)`
- `created_at`, `updated_at`

Indexes:
- `ivfflat` or `hnsw` on `embedding` (pgvector)
- btree on `user_id`, `source_table`, `meal_type`, `diet_type`
- unique composite on (`source_table`, `source_id`)

## Recipe text normalization for embedding

Build `search_text` using:
- Title + meal type
- Goal alignment sentence
- Top ingredients (name only)
- Health benefits
- Tags derived from profile context (diet, goal, skill)

Keep it concise and structured, for example:
- `title: ...`
- `meal: ...`
- `diet: ...`
- `goal: ...`
- `ingredients: ...`
- `benefits: ...`

## Embedding pipeline

Triggers:
- New daily recipes generated
- Recipe regenerated
- Recipe saved/unsaved
- Backfill job for existing rows

Process:
1. Read source row
2. Build `search_text`
3. Compute embedding
4. Upsert semantic index row

Operational notes:
- Use idempotent upsert
- Batch writes for backfill
- Track failures with retry queue

## Retrieval pipeline (chat)

Given user query:
1. Parse optional filters from query (meal, diet, time, calorie intent)
2. Compute query embedding
3. Search top K from `recipe_semantic_index` with:
   - `user_id = current user` first
   - optional fallback to global catalog
4. Apply lightweight reranking (keyword overlap, constraints match)
5. Return top N results with score and explanation

## Fallback strategy

If retrieval confidence is low:
- Trigger recipe generation with user profile + query intent
- Return "newly generated recipe" response
- Persist recipe
- Enqueue embedding update

Suggested thresholds (to tune):
- `high_confidence >= 0.78`: return retrieved results
- `medium 0.65-0.78`: return + ask clarifying question
- `< 0.65`: generate new recipe

## API design (suggested)

- `POST /api/chat/recipes/search`
  - input: `{ query, filters?, topK? }`
  - output: `{ mode: "retrieved" | "generated", recipes, scores, rationale }`

- Internal service method:
  - `searchRecipesSemantic(userId, query, filters)`

## Quality and evaluation

Offline eval set:
- 100-200 real-style queries (protein, quick, allergy-safe, anti-inflammatory, etc.)
- Human label top-3 relevance

Metrics:
- Recall@K
- MRR / nDCG
- Fallback rate (lower is not always better; must maintain quality)
- User acceptance click/save rate

## Rollout plan

1. **Phase 2A**: schema + backfill + internal retrieval API (no UI)
2. **Phase 2B**: chat integration behind feature flag
3. **Phase 2C**: threshold tuning and reranker improvements
4. **Phase 2D**: optional hybrid search (vector + lexical)

## Risks

- Embedding drift if model changes without reindex strategy
- Cost spikes during backfill
- Stale index if write hooks fail
- Poor retrieval for highly constrained medical/allergy prompts

## Guardrails

- Always run compliance filters after retrieval (diet/allergy checks)
- Never trust vector match alone for safety-critical constraints
- Log retrieval score + selected recipe ids for audit/debug

## Definition of done (Phase 2)

- Semantic index exists and is populated for existing + new recipes
- Chat endpoint retrieves semantically relevant recipes with confidence score
- Low-confidence queries reliably trigger generation
- End-to-end flow returns either:
  - relevant existing recipes, or
  - newly generated recipe persisted and indexed
