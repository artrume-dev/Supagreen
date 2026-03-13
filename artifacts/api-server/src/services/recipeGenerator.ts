import { anthropic } from "@workspace/integrations-anthropic-ai";

interface UserProfileInput {
  dietType: string | null;
  allergies: string[] | null;
  healthGoal: string | null;
  skillLevel: string | null;
  caloriesTarget: number | null;
  city: string | null;
  country: string | null;
}

interface RecipeIngredient {
  name: string;
  amount: string;
  unit: string;
  isKeyIngredient: boolean;
}

interface RecipeMacros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface GeneratedRecipe {
  meal: string;
  title: string;
  emoji: string;
  prepTime: number;
  servings: number;
  healthScore: number;
  goalAlignment: string;
  macros: RecipeMacros;
  ingredients: RecipeIngredient[];
  steps: string[];
  healthBenefits: string[];
  swapSuggestion: string;
}

function getCurrentSeason(country: string | null): string {
  const month = new Date().getMonth();
  const southernHemisphere = [
    "australia",
    "new zealand",
    "argentina",
    "brazil",
    "chile",
    "south africa",
  ];
  const isSouthern = country
    ? southernHemisphere.includes(country.toLowerCase())
    : false;

  if (month >= 2 && month <= 4) return isSouthern ? "autumn" : "spring";
  if (month >= 5 && month <= 7) return isSouthern ? "winter" : "summer";
  if (month >= 8 && month <= 10) return isSouthern ? "spring" : "autumn";
  return isSouthern ? "summer" : "winter";
}

function buildSystemPrompt(
  profile: UserProfileInput,
  mealFilter?: string,
): string {
  const season = getCurrentSeason(profile.country);
  const mealInstruction = mealFilter
    ? `Generate exactly 1 recipe for ${mealFilter} only.`
    : "Generate exactly 3 complete recipes (breakfast, lunch, dinner).";

  return `You are a certified nutritionist and chef. ${mealInstruction} For a user with the following profile:
- Diet: ${profile.dietType ?? "Omnivore"}
- Allergies: ${profile.allergies?.length ? profile.allergies.join(", ") : "None"}
- Goal: ${profile.healthGoal ?? "General wellness"}
- Skill level: ${profile.skillLevel ?? "Intermediate"}
- Location: ${profile.city ?? "Unknown"}, ${profile.country ?? "Unknown"}
- Season: ${season}
- Daily calorie target: ${profile.caloriesTarget ?? 2000} kcal

STRICT RULES:
1. Every single ingredient must be a 100% whole, unprocessed food. No protein powders, artificial sweeteners, processed snacks, refined sugar, white flour, seed oils (canola, soybean, sunflower), or ultra-processed ingredients.
2. Ingredients must be SEASONALLY AVAILABLE in ${profile.country ?? "the user's region"} during ${season}.
3. Provide macros (protein g, carbs g, fat g, calories) per serving.
4. Prep time must match skill level.
5. Each recipe must serve the goal: e.g. high-protein for muscle building, anti-inflammatory foods for inflammation goals.
6. Format response as valid JSON matching this schema:
{
  "recipes": [
    {
      "meal": "breakfast" | "lunch" | "dinner",
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
Return ONLY valid JSON. No markdown, no preamble, no code fences.`;
}

function validateRecipe(recipe: unknown): recipe is GeneratedRecipe {
  if (!recipe || typeof recipe !== "object") return false;
  const r = recipe as Record<string, unknown>;
  return (
    typeof r.meal === "string" &&
    typeof r.title === "string" &&
    typeof r.emoji === "string" &&
    typeof r.prepTime === "number" &&
    typeof r.servings === "number" &&
    typeof r.healthScore === "number" &&
    typeof r.goalAlignment === "string" &&
    r.macros != null &&
    typeof r.macros === "object" &&
    Array.isArray(r.ingredients) &&
    r.ingredients.every(
      (i: unknown) =>
        i != null &&
        typeof i === "object" &&
        typeof (i as Record<string, unknown>).name === "string" &&
        typeof (i as Record<string, unknown>).amount === "string" &&
        typeof (i as Record<string, unknown>).unit === "string",
    ) &&
    Array.isArray(r.steps) &&
    Array.isArray(r.healthBenefits) &&
    typeof r.swapSuggestion === "string"
  );
}

export async function generateRecipes(
  profile: UserProfileInput,
  mealFilter?: string,
): Promise<GeneratedRecipe[]> {
  const systemPrompt = buildSystemPrompt(profile, mealFilter);

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    messages: [
      {
        role: "user",
        content: mealFilter
          ? `Generate a new ${mealFilter} recipe following the rules above.`
          : "Generate today's 3 recipes (breakfast, lunch, dinner) following the rules above.",
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

  let parsed: { recipes: unknown[] };
  try {
    parsed = JSON.parse(textBlock.text);
  } catch {
    const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Claude response did not contain valid JSON");
    }
    parsed = JSON.parse(jsonMatch[0]);
  }

  if (!parsed.recipes || !Array.isArray(parsed.recipes)) {
    throw new Error("Claude response missing recipes array");
  }

  const expectedCount = mealFilter ? 1 : 3;
  if (parsed.recipes.length < expectedCount) {
    throw new Error(
      `Expected ${expectedCount} recipes but got ${parsed.recipes.length}`,
    );
  }

  const validated = parsed.recipes.slice(0, expectedCount);
  for (const recipe of validated) {
    if (!validateRecipe(recipe)) {
      throw new Error(
        `Claude returned a recipe with invalid structure: ${JSON.stringify(recipe).slice(0, 200)}`,
      );
    }
  }

  return validated as GeneratedRecipe[];
}
