import { anthropic } from "@workspace/integrations-anthropic-ai";
import { z } from "zod/v4";

interface UserProfileInput {
  dietType: string | null;
  allergies: string[] | null;
  healthGoal: string | null;
  skillLevel: string | null;
  caloriesTarget: number | null;
  city: string | null;
  country: string | null;
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

function buildSystemPrompt(profile: UserProfileInput): string {
  const season = getCurrentSeason(profile.country);
  const dietType = profile.dietType ?? "Omnivore";
  const allergies = profile.allergies?.length
    ? profile.allergies.join(", ")
    : "None";
  const healthGoal = profile.healthGoal ?? "General wellness";
  const skillLevel = profile.skillLevel ?? "Intermediate";
  const city = profile.city ?? "Unknown";
  const country = profile.country ?? "Unknown";
  const calories = profile.caloriesTarget ?? 2000;

  return `You are a certified nutritionist and chef. Generate exactly 4 complete recipes (breakfast, lunch, dinner, and treat) for a user with the following profile:
- Diet: ${dietType}
- Allergies: ${allergies}
- Goal: ${healthGoal}
- Skill level: ${skillLevel}
- Location: ${city}, ${country}
- Season: ${season}
- Daily calorie target: ${calories} kcal

STRICT RULES:
1. Every single ingredient must be a 100% whole, unprocessed food. No protein powders, artificial sweeteners, processed snacks, refined sugar, white flour, seed oils (canola, soybean, sunflower), or ultra-processed ingredients.
2. Ingredients must be SEASONALLY AVAILABLE in ${country} during ${season}.
3. Provide macros (protein g, carbs g, fat g, calories) per serving.
4. Prep time must match skill level.
5. Each recipe must serve the goal: e.g. high-protein for muscle building, anti-inflammatory foods for inflammation goals.
6. The "treat" recipe MUST be a healthy dessert. It should use only whole foods and natural sweeteners (fruit, dates, honey, maple syrup, coconut sugar). Absolutely NO refined sugar, white flour, or artificial sweeteners. Examples: fruit-based desserts, date energy balls, chia puddings, banana nice cream, baked fruit with nuts, raw cacao treats. Keep treat calories reasonable (under 300 kcal per serving).
7. Format response as valid JSON matching this schema:
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
): Promise<GeneratedRecipe[]> {
  const systemPrompt = buildSystemPrompt(profile);

  let userContent: string;
  if (mealFilter === "treat") {
    userContent = `Generate exactly 1 healthy dessert/treat recipe only. It must use "treat" as the meal value. Use only whole foods and natural sweeteners (fruit, dates, honey, maple syrup). No refined sugar or white flour. Return the same JSON format with a "recipes" array containing just 1 recipe.`;
  } else if (mealFilter) {
    userContent = `Generate exactly 1 recipe for ${mealFilter} only. Return the same JSON format with a "recipes" array containing just 1 recipe.`;
  } else {
    userContent = "Generate today's 4 recipes (breakfast, lunch, dinner, and treat).";
  }

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 8192,
    messages: [
      {
        role: "user",
        content: userContent,
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

  const expectedCount = mealFilter ? 1 : 4;
  if (parsed.data.recipes.length < expectedCount) {
    throw new Error(
      `Expected ${expectedCount} recipes but got ${parsed.data.recipes.length}`,
    );
  }

  return parsed.data.recipes.slice(0, expectedCount);
}
