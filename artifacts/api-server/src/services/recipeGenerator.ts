import { anthropic } from "@workspace/integrations-anthropic-ai";
import { z } from "zod/v4";
import {
  getSeasonForCountryMonth,
  getSeasonalProduceForCountryMonth,
} from "./seasonalProduce";

interface UserProfileInput {
  dietType: string | null;
  allergies: string[] | null;
  healthGoal: string | null;
  skillLevel: string | null;
  caloriesTarget: number | null;
  city: string | null;
  country: string | null;
}

interface AvoidedRecipeInput {
  meal?: string | null;
  title: string;
  ingredients: string[];
}

const RecipeIngredientSchema = z.object({
  name: z.string(),
  amount: z.string(),
  unit: z.string(),
  isKeyIngredient: z.boolean(),
});

const RecipeMacrosSchema = z.object({
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
});

const GeneratedRecipeSchema = z.object({
  meal: z.enum(["breakfast", "lunch", "dinner", "treat"]),
  title: z.string(),
  emoji: z.string(),
  prepTime: z.number(),
  servings: z.number(),
  healthScore: z.number().min(1).max(10),
  goalAlignment: z.string(),
  macros: RecipeMacrosSchema,
  ingredients: z.array(RecipeIngredientSchema),
  steps: z.array(z.string()),
  healthBenefits: z.array(z.string()),
  swapSuggestion: z.string(),
});

export type GeneratedRecipe = z.infer<typeof GeneratedRecipeSchema>;

const RecipesResponseSchema = z.object({
  recipes: z.array(GeneratedRecipeSchema),
});

const REQUIRED_MEALS: GeneratedRecipe["meal"][] = [
  "breakfast",
  "lunch",
  "dinner",
  "treat",
];

function normalizeIngredientName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\b(fresh|organic|large|small|ripe|raw|chopped|minced|diced|sliced)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(
      /\b(the|a|an|with|and|for|style|bowl|salad|soup|toast|stir|fry|roasted|grilled|baked)\b/g,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
}

function toTokenSet(input: string): Set<string> {
  return new Set(
    input
      .split(" ")
      .map((token) => token.trim())
      .filter((token) => token.length > 1),
  );
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  const intersectionCount = Array.from(a).filter((value) => b.has(value)).length;
  const unionCount = new Set([...a, ...b]).size;
  return unionCount === 0 ? 0 : intersectionCount / unionCount;
}

function ingredientOverlapRatio(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  const intersectionCount = Array.from(a).filter((value) => b.has(value)).length;
  return intersectionCount / Math.min(a.size, b.size);
}

function getForbiddenIngredientsForDiet(dietType: string | null): string[] {
  const normalizedDiet = (dietType ?? "").toLowerCase();
  const nonVegetarian = [
    "chicken",
    "beef",
    "pork",
    "bacon",
    "ham",
    "lamb",
    "turkey",
    "duck",
    "fish",
    "salmon",
    "tuna",
    "anchovy",
    "sardine",
    "shrimp",
    "prawn",
    "crab",
    "lobster",
    "oyster",
    "mussel",
    "clam",
    "gelatin",
    "lard",
  ];

  const nonVeganExtras = [
    "egg",
    "eggs",
    "milk",
    "cheese",
    "butter",
    "ghee",
    "cream",
    "yogurt",
    "honey",
    "whey",
    "casein",
  ];

  if (normalizedDiet === "vegan") {
    return [...nonVegetarian, ...nonVeganExtras];
  }

  if (normalizedDiet === "vegetarian") {
    return nonVegetarian;
  }

  return [];
}

function findDietViolations(
  recipes: GeneratedRecipe[],
  dietType: string | null,
): string[] {
  const forbidden = getForbiddenIngredientsForDiet(dietType);
  if (forbidden.length === 0) return [];

  const violations: string[] = [];
  for (const recipe of recipes) {
    for (const ingredient of recipe.ingredients) {
      const ingredientName = ingredient.name.toLowerCase();
      const violatingTerm = forbidden.find((term) =>
        ingredientName.includes(term),
      );
      if (violatingTerm) {
        violations.push(
          `${recipe.meal}: "${ingredient.name}" violates ${dietType} (${violatingTerm})`,
        );
      }
    }
  }

  return violations;
}

function getCurrentSeason(country: string | null): string {
  const month = new Date().getMonth() + 1;
  return getSeasonForCountryMonth(country, month);
}

function validateMealCoverage(recipes: GeneratedRecipe[]): string[] {
  const meals = new Set(recipes.map((recipe) => recipe.meal));
  return REQUIRED_MEALS.filter((meal) => !meals.has(meal));
}

function validateSeasonalIngredients(
  recipes: GeneratedRecipe[],
  country: string | null,
): string[] {
  const month = new Date().getMonth() + 1;
  const seasonalProduce = getSeasonalProduceForCountryMonth(country, month);
  const normalizedSeasonal = new Set(
    seasonalProduce.map((item) => normalizeIngredientName(item)),
  );

  const errors: string[] = [];

  for (const recipe of recipes) {
    if (recipe.meal === "treat") {
      // Desserts are more flexible seasonally; keep this as a prompt preference.
      continue;
    }

    const keyIngredients = recipe.ingredients.filter((ingredient) => ingredient.isKeyIngredient);
    if (keyIngredients.length === 0) {
      errors.push(`${recipe.meal}: should include at least one seasonal key ingredient`);
      continue;
    }

    for (const ingredient of keyIngredients) {
      const normalizedIngredient = normalizeIngredientName(ingredient.name);
      const isValid = Array.from(normalizedSeasonal).some((seasonalItem) =>
        normalizedIngredient.includes(seasonalItem) ||
        seasonalItem.includes(normalizedIngredient),
      );

      if (!isValid) {
        errors.push(
          `${recipe.meal}: "${ingredient.name}" is not in seasonal produce list for ${country ?? "user country"}`,
        );
      }
    }
  }

  return errors;
}

function validateRecipeNovelty(
  recipes: GeneratedRecipe[],
  avoidedRecipes: AvoidedRecipeInput[],
): string[] {
  if (avoidedRecipes.length === 0) return [];

  const violations: string[] = [];
  const avoidedPrepared = avoidedRecipes
    .map((recipe) => ({
      meal: (recipe.meal ?? "").toLowerCase(),
      title: recipe.title,
      normalizedTitle: normalizeTitle(recipe.title),
      titleTokens: toTokenSet(normalizeTitle(recipe.title)),
      ingredientTokens: new Set(
        (recipe.ingredients ?? []).map((ingredient) =>
          normalizeIngredientName(ingredient),
        ),
      ),
    }))
    .filter((recipe) => recipe.normalizedTitle.length > 0);

  for (const generated of recipes) {
    const generatedMeal = generated.meal.toLowerCase();
    const generatedTitleNorm = normalizeTitle(generated.title);
    const generatedTitleTokens = toTokenSet(generatedTitleNorm);
    const generatedIngredientTokens = new Set(
      generated.ingredients.map((ingredient) =>
        normalizeIngredientName(ingredient.name),
      ),
    );

    for (const previous of avoidedPrepared) {
      const titleJaccard = jaccardSimilarity(
        generatedTitleTokens,
        previous.titleTokens,
      );
      const ingredientOverlap = ingredientOverlapRatio(
        generatedIngredientTokens,
        previous.ingredientTokens,
      );
      const exactTitleMatch = generatedTitleNorm === previous.normalizedTitle;
      const sameMeal = previous.meal === generatedMeal;
      const tooSimilar =
        exactTitleMatch ||
        titleJaccard >= 0.72 ||
        (sameMeal && titleJaccard >= 0.45 && ingredientOverlap >= 0.65) ||
        ingredientOverlap >= 0.8;

      if (tooSimilar) {
        violations.push(
          `${generated.meal}: "${generated.title}" is too similar to previous "${previous.title}" (title=${titleJaccard.toFixed(2)}, ingredients=${ingredientOverlap.toFixed(2)})`,
        );
        break;
      }
    }
  }

  return violations;
}

function parseGoalList(healthGoal: string | null): string[] {
  if (!healthGoal) return ["wellness"];
  const parsed = healthGoal
    .split(",")
    .map((goal) => goal.trim().toLowerCase())
    .filter(Boolean);
  return parsed.length > 0 ? parsed : ["wellness"];
}

function goalDisplayLabel(goal: string): string {
  const knownLabels: Record<string, string> = {
    "fat-loss": "Lose body fat",
    muscle: "Build muscle",
    gut: "Improve gut health",
    energy: "Boost energy",
    inflammation: "Reduce inflammation",
    wellness: "General wellness",
  };
  if (knownLabels[goal]) return knownLabels[goal];
  return goal
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function goalKeywords(goal: string): string[] {
  const map: Record<string, string[]> = {
    "fat-loss": ["fat", "lean", "weight"],
    muscle: ["muscle", "protein", "strength"],
    gut: ["gut", "digestive", "fiber", "microbiome"],
    energy: ["energy", "sustained", "focus"],
    inflammation: ["inflammation", "anti-inflammatory", "inflammatory"],
    wellness: ["wellness", "balanced", "overall health"],
  };
  const base = goal.toLowerCase();
  return map[base] ?? [base];
}

function validateGoalCoverage(
  recipes: GeneratedRecipe[],
  goals: string[],
): string[] {
  if (goals.length <= 1 || recipes.length <= 1) return [];

  const normalizedAlignments = recipes.map((recipe) =>
    recipe.goalAlignment.toLowerCase(),
  );
  const targetGoals = goals.slice(0, Math.min(goals.length, recipes.length));
  const uncovered: string[] = [];

  for (const goal of targetGoals) {
    const keywords = goalKeywords(goal);
    const covered = normalizedAlignments.some((alignment) =>
      keywords.some((keyword) => alignment.includes(keyword)),
    );
    if (!covered) uncovered.push(goalDisplayLabel(goal));
  }

  return uncovered;
}

function validateGeneratedRecipeDiversity(recipes: GeneratedRecipe[]): string[] {
  if (recipes.length <= 1) return [];
  const violations: string[] = [];

  const prepared = recipes.map((recipe) => ({
    recipe,
    normalizedTitle: normalizeTitle(recipe.title),
    titleTokens: toTokenSet(normalizeTitle(recipe.title)),
    ingredientTokens: new Set(
      recipe.ingredients.map((ingredient) =>
        normalizeIngredientName(ingredient.name),
      ),
    ),
  }));

  for (let i = 0; i < prepared.length; i += 1) {
    for (let j = i + 1; j < prepared.length; j += 1) {
      const first = prepared[i];
      const second = prepared[j];
      const sameTitle = first.normalizedTitle === second.normalizedTitle;
      const titleSimilarity = jaccardSimilarity(first.titleTokens, second.titleTokens);
      const ingredientSimilarity = ingredientOverlapRatio(
        first.ingredientTokens,
        second.ingredientTokens,
      );

      if (
        sameTitle ||
        titleSimilarity >= 0.72 ||
        ingredientSimilarity >= 0.8 ||
        (titleSimilarity >= 0.52 && ingredientSimilarity >= 0.62)
      ) {
        violations.push(
          `"${first.recipe.title}" and "${second.recipe.title}" are too similar (title=${titleSimilarity.toFixed(2)}, ingredients=${ingredientSimilarity.toFixed(2)})`,
        );
      }
    }
  }

  return violations;
}

function buildSystemPrompt(
  profile: UserProfileInput,
  avoidedRecipes: AvoidedRecipeInput[],
): string {
  const season = getCurrentSeason(profile.country);
  const seasonalProduce = getSeasonalProduceForCountryMonth(
    profile.country,
    new Date().getMonth() + 1,
  );
  const dietType = profile.dietType ?? "Omnivore";
  const allergies = profile.allergies?.length
    ? profile.allergies.join(", ")
    : "None";
  const goalList = parseGoalList(profile.healthGoal);
  const goalLabels = goalList.map(goalDisplayLabel);
  const healthGoal = goalLabels.join(", ");
  const skillLevel = profile.skillLevel ?? "Intermediate";
  const city = profile.city ?? "Unknown";
  const country = profile.country ?? "Unknown";
  const calories = profile.caloriesTarget ?? 2000;
  const avoidedRecipesText =
    avoidedRecipes.length > 0
      ? JSON.stringify(
          avoidedRecipes.slice(0, 40).map((recipe) => ({
            meal: recipe.meal ?? null,
            title: recipe.title,
            ingredients: recipe.ingredients.slice(0, 8),
          })),
        )
      : "[]";

  return `You are a certified nutritionist and chef. Generate exactly 4 complete recipes (breakfast, lunch, dinner, and treat) for a user with the following profile:
- Diet: ${dietType}
- Allergies: ${allergies}
- Goal(s): ${healthGoal}
- Skill level: ${skillLevel}
- Location: ${city}, ${country}
- Season: ${season}
- Daily calorie target: ${calories} kcal

STRICT RULES:
1. Every single ingredient must be a 100% whole, unprocessed food. No protein powders, artificial sweeteners, processed snacks, refined sugar, white flour, seed oils (canola, soybean, sunflower), or ultra-processed ingredients.
2. Prioritize ingredients that are seasonally available in ${country} during ${season}.
3. Provide macros (protein g, carbs g, fat g, calories) per serving.
4. Prep time must match skill level.
5. Each recipe must serve the goal: e.g. high-protein for muscle building, anti-inflammatory foods for inflammation goals.
5b. When multiple goals are provided, ensure each selected goal gets at least one clearly distinct recipe. Avoid creating near-duplicate recipes across those goals.
6. The "treat" recipe MUST be a healthy dessert. It should use only whole foods and natural sweeteners (fruit, dates, honey, maple syrup, coconut sugar). Absolutely NO refined sugar, white flour, or artificial sweeteners. Examples: fruit-based desserts, date energy balls, chia puddings, banana nice cream, baked fruit with nuts, raw cacao treats. Keep treat calories reasonable (under 300 kcal per serving).
7. For EVERY meal, mark at least one ingredient with "isKeyIngredient": true and try to keep key ingredients seasonally aligned for ${country} in ${season}.
8. Prefer key seasonal produce from this list when possible: ${seasonalProduce.join(", ")}.
9. DO NOT repeat exact or similar recipes that this user has seen before on any day. Avoid similar titles, same core ingredient combinations, and near-duplicate methods.
10. Avoided historical recipes for this user (must not be repeated/similar): ${avoidedRecipesText}
11. Format response as valid JSON matching this schema:
{
  "recipes": [
    {
      "meal": "breakfast" | "lunch" | "dinner" | "treat",
      "title": "string",
      "emoji": "string",
      "prepTime": number,
      "servings": number,
      "healthScore": number (1-10),
      "goalAlignment": "string (one sentence)",
      "macros": { "calories": number, "protein": number, "carbs": number, "fat": number },
      "ingredients": [
        { "name": "string", "amount": "string", "unit": "string", "isKeyIngredient": boolean }
      ],
      "steps": ["string"],
      "healthBenefits": ["string"] (max 3 bullet points),
      "swapSuggestion": "string (one easy ingredient swap)"
    }
  ]
}
Return ONLY valid JSON. No markdown, no preamble.`;
}

export async function generateRecipes(
  profile: UserProfileInput,
  mealFilter?: string,
  avoidedRecipes: AvoidedRecipeInput[] = [],
): Promise<GeneratedRecipe[]> {
  const parsedGoals = parseGoalList(profile.healthGoal);
  const systemPrompt = buildSystemPrompt(profile, avoidedRecipes);

  let userContent: string;
  if (mealFilter === "treat") {
    userContent = `Generate exactly 1 healthy dessert/treat recipe only. It must use "treat" as the meal value. Use only whole foods and natural sweeteners (fruit, dates, honey, maple syrup). No refined sugar or white flour. Return the same JSON format with a "recipes" array containing just 1 recipe.`;
  } else if (mealFilter) {
    userContent = `Generate exactly 1 recipe for ${mealFilter} only. Return the same JSON format with a "recipes" array containing just 1 recipe.`;
  } else {
    userContent = "Generate today's 4 recipes (breakfast, lunch, dinner, and treat).";
  }

  const expectedCount = mealFilter ? 1 : 4;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const attemptContent =
      attempt === 0
        ? userContent
        : `${userContent}\n\nIMPORTANT RETRY: previous output violated strict validation. Ensure all key ingredients are in-season for ${profile.country ?? "the user's country"} right now, strictly avoid all non-compliant ingredients for diet "${profile.dietType ?? "unspecified"}", and do not return recipes that repeat or closely resemble the user's historical recipes.`;

    try {
      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 8192,
        messages: [
          {
            role: "user",
            content: attemptContent,
          },
        ],
        system: systemPrompt,
      });

      const textBlock = message.content.find(
        (block: { type: string }) => block.type === "text",
      ) as { type: "text"; text: string } | undefined;
      if (!textBlock) {
        throw new Error("No text response from Claude");
      }

      let rawJson: unknown;
      try {
        rawJson = JSON.parse(textBlock.text);
      } catch {
        const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error("Claude response did not contain valid JSON");
        }
        rawJson = JSON.parse(jsonMatch[0]);
      }

      const parsed = RecipesResponseSchema.safeParse(rawJson);
      if (!parsed.success) {
        throw new Error(
          `Claude returned invalid recipe structure: ${parsed.error.message}`,
        );
      }

      if (parsed.data.recipes.length < expectedCount) {
        throw new Error(
          `Expected ${expectedCount} recipes but got ${parsed.data.recipes.length}`,
        );
      }

      const slicedRecipes = parsed.data.recipes.slice(0, expectedCount);
      if (!mealFilter) {
        const missingMeals = validateMealCoverage(slicedRecipes);
        if (missingMeals.length > 0) {
          throw new Error(
            `Generated menu missing required meals: ${missingMeals.join(", ")}`,
          );
        }
      }

      const seasonViolations = validateSeasonalIngredients(
        slicedRecipes,
        profile.country,
      );
      if (seasonViolations.length > 0 && attempt < 1) {
        throw new Error(
          `Generated recipes violated seasonal rules: ${seasonViolations.join("; ")}`,
        );
      }
      if (seasonViolations.length > 0) {
        console.warn(
          `Seasonal alignment warnings (accepted as best effort): ${seasonViolations.join("; ")}`,
        );
      }

      const violations = findDietViolations(slicedRecipes, profile.dietType);
      if (violations.length > 0) {
        throw new Error(
          `Generated recipes violated ${profile.dietType} diet rules: ${violations.join("; ")}`,
        );
      }

      const noveltyViolations = validateRecipeNovelty(
        slicedRecipes,
        avoidedRecipes,
      );
      if (noveltyViolations.length > 0) {
        throw new Error(
          `Generated recipes repeated historical content: ${noveltyViolations.join("; ")}`,
        );
      }

      const diversityViolations = validateGeneratedRecipeDiversity(slicedRecipes);
      if (diversityViolations.length > 0) {
        throw new Error(
          `Generated recipes are too similar to each other: ${diversityViolations.join("; ")}`,
        );
      }

      if (!mealFilter) {
        const uncoveredGoals = validateGoalCoverage(slicedRecipes, parsedGoals);
        if (uncoveredGoals.length > 0) {
          throw new Error(
            `Generated menu did not cover all selected goals: ${uncoveredGoals.join(", ")}`,
          );
        }
      }

      return slicedRecipes;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError ?? new Error("Failed to generate recipes");
}
