import { Router, type IRouter, type Request, type Response } from "express";
import {
  GetTodayRecipesQueryParams,
  GetTodayRecipesResponse,
  GetSavedRecipesResponse,
  SaveRecipeBody,
  DeleteSavedRecipeParams,
  DeleteSavedRecipeResponse,
  RegenerateRecipeBody,
  RegenerateRecipeResponse,
} from "@workspace/api-zod";
import {
  db,
  dailyRecipesTable,
  savedRecipesTable,
  userProfilesTable,
  shoppingListsTable,
  usersTable,
} from "@workspace/db";
import { eq, and, sql, desc, inArray } from "drizzle-orm";
import { coerceDateFields } from "../lib/parseDate";
import { generateRecipes } from "../services/recipeGenerator";

const router: IRouter = Router();

function todayDate(): string {
  return new Date().toISOString().split("T")[0];
}

function parseGoalList(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((goal) => goal.trim())
    .filter(Boolean);
}

const CANONICAL_MEALS = ["breakfast", "lunch", "dinner", "treat"] as const;
type CanonicalMeal = (typeof CANONICAL_MEALS)[number];

const TRIAL_HOURS = 48;

/**
 * Checks whether a user is allowed to generate/regenerate recipes.
 * - Lifetime users: always allowed.
 * - Free users: allowed within the 48-hour trial window that starts on first use.
 * - Sets trialStartedAt lazily on first call for free users.
 * Returns true if access is denied (response already sent).
 */
async function checkTrialAccess(userId: string, res: Response): Promise<boolean> {
  // Use raw SQL to only touch billing columns — Drizzle v0.45 would enumerate
  // ALL usersTable columns and fail if billing columns aren't in the DB yet.
  try {
    const result = await db.execute(
      sql`SELECT plan, trial_started_at FROM users WHERE id = ${userId} LIMIT 1`,
    );
    const row = result.rows[0] as
      | { plan: string | null; trial_started_at: string | null }
      | undefined;

    if (!row) {
      res.status(404).json({ error: "User not found" });
      return true;
    }

    if (row.plan === "lifetime") return false; // access granted

    if (!row.trial_started_at) {
      // First time generating — start the trial clock
      await db.execute(
        sql`UPDATE users SET trial_started_at = NOW() WHERE id = ${userId}`,
      );
      return false;
    }

    const hoursElapsed =
      (Date.now() - new Date(row.trial_started_at).getTime()) / 3_600_000;
    if (hoursElapsed < TRIAL_HOURS) return false;

    res.status(402).json({ error: "TRIAL_EXPIRED", upgradeRequired: true });
    return true;
  } catch {
    // Billing columns not yet in DB (push-force pending) — allow access.
    return false;
  }
}

function toGoalSlug(goal: string): string {
  return goal
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 16);
}

function slotForMeal(meal: string): "b" | "l" | "d" | "t" {
  switch (meal) {
    case "breakfast":
      return "b";
    case "lunch":
      return "l";
    case "dinner":
      return "d";
    default:
      return "t";
  }
}

function goalScopedMealType(meal: CanonicalMeal, goal: string): string {
  return `${slotForMeal(meal)}-${toGoalSlug(goal)}`;
}

function isCanonicalMealType(mealType: string): mealType is CanonicalMeal {
  return CANONICAL_MEALS.includes(mealType as CanonicalMeal);
}

function extractShoppingItems(
  recipes: Array<{ recipeJson: unknown }>,
): Array<{ name: string; amount: string; unit: string; category: string }> {
  const itemMap = new Map<
    string,
    { name: string; amount: string; unit: string; category: string }
  >();

  for (const recipe of recipes) {
    const json = recipe.recipeJson as {
      ingredients?: Array<{
        name?: string;
        amount?: string;
        unit?: string;
      }>;
    };
    if (!json?.ingredients || !Array.isArray(json.ingredients)) continue;
    for (const ing of json.ingredients) {
      if (!ing.name || typeof ing.name !== "string") continue;
      const key = ing.name.toLowerCase();
      if (!itemMap.has(key)) {
        itemMap.set(key, {
          name: ing.name,
          amount: String(ing.amount ?? ""),
          unit: String(ing.unit ?? ""),
          category: categorizeIngredient(ing.name),
        });
      }
    }
  }

  return Array.from(itemMap.values());
}

function categorizeIngredient(name: string): string {
  const lower = name.toLowerCase();
  const produce = [
    "lettuce", "tomato", "onion", "garlic", "pepper", "carrot", "broccoli",
    "spinach", "kale", "avocado", "cucumber", "celery", "mushroom", "potato",
    "sweet potato", "zucchini", "squash", "corn", "peas", "beans", "lemon",
    "lime", "orange", "apple", "banana", "berry", "mango", "pineapple",
    "grape", "melon", "peach", "pear", "plum", "fig", "date", "coconut",
    "ginger", "turmeric", "beet", "cabbage", "cauliflower", "eggplant",
    "asparagus", "artichoke", "radish", "turnip", "parsnip", "leek",
    "scallion", "shallot", "chili", "jalapeño", "herbs", "basil", "cilantro",
    "parsley", "mint", "dill", "rosemary", "thyme", "oregano", "sage",
  ];
  const protein = [
    "chicken", "beef", "pork", "lamb", "turkey", "fish", "salmon", "tuna",
    "shrimp", "prawn", "cod", "tilapia", "tofu", "tempeh", "egg", "eggs",
  ];
  const grains = [
    "rice", "quinoa", "oat", "oats", "pasta", "bread", "flour", "noodle",
    "couscous", "barley", "farro", "millet", "buckwheat", "amaranth",
    "tortilla", "wrap",
  ];
  const dairy = [
    "milk", "cheese", "yogurt", "butter", "cream", "ghee", "kefir",
    "almond milk", "oat milk", "coconut milk", "soy milk",
  ];

  if (produce.some((p) => lower.includes(p))) return "Produce";
  if (protein.some((p) => lower.includes(p))) return "Protein";
  if (grains.some((g) => lower.includes(g))) return "Grains";
  if (dairy.some((d) => lower.includes(d))) return "Dairy & Alternatives";
  return "Pantry";
}

async function autoPopulateShoppingList(
  userId: string,
  date: string,
  preserveChecked: boolean,
): Promise<void> {
  const allRecipes = await db
    .select()
    .from(dailyRecipesTable)
    .where(
      and(
        eq(dailyRecipesTable.userId, userId),
        eq(dailyRecipesTable.date, date),
        inArray(dailyRecipesTable.mealType, CANONICAL_MEALS as unknown as string[]),
      ),
    );

  const shoppingItems = extractShoppingItems(allRecipes);
  if (shoppingItems.length === 0) return;

  let preservedCheckedItems: string[] = [];
  if (preserveChecked) {
    const [existingList] = await db
      .select()
      .from(shoppingListsTable)
      .where(
        and(
          eq(shoppingListsTable.userId, userId),
          eq(shoppingListsTable.date, date),
        ),
      );
    preservedCheckedItems = existingList?.checkedItems ?? [];
  }

  await db
    .insert(shoppingListsTable)
    .values({
      userId,
      date,
      itemsJson: shoppingItems,
      checkedItems: preservedCheckedItems,
    })
    .onConflictDoUpdate({
      target: [shoppingListsTable.userId, shoppingListsTable.date],
      set: {
        itemsJson: shoppingItems,
        updatedAt: new Date(),
      },
    });
}

async function getProfileInput(userId: string): Promise<{
  dietType: string | null;
  allergies: string[] | null;
  healthGoal: string | null;
  skillLevel: string | null;
  caloriesTarget: number | null;
  city: string | null;
  country: string | null;
}> {
  const [profile] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.userId, userId));

  return {
    dietType: profile?.dietType ?? null,
    allergies: profile?.allergies ?? null,
    healthGoal: profile?.healthGoal ?? null,
    skillLevel: profile?.skillLevel ?? null,
    caloriesTarget: profile?.caloriesTarget ?? null,
    city: profile?.city ?? null,
    country: profile?.country ?? null,
  };
}

type RecipeMemoryItem = {
  meal?: string | null;
  title: string;
  ingredients: string[];
};

function recipeMemoryFromJson(
  recipeJson: unknown,
  mealOverride?: string | null,
): RecipeMemoryItem | null {
  if (!recipeJson || typeof recipeJson !== "object") return null;
  const record = recipeJson as {
    meal?: unknown;
    title?: unknown;
    ingredients?: Array<{ name?: unknown }>;
  };
  if (typeof record.title !== "string" || record.title.trim().length === 0) {
    return null;
  }
  const ingredients = Array.isArray(record.ingredients)
    ? record.ingredients
        .map((ingredient) => ingredient?.name)
        .filter((name): name is string => typeof name === "string" && name.trim().length > 0)
    : [];

  return {
    meal:
      (mealOverride ?? (typeof record.meal === "string" ? record.meal : null)) ??
      null,
    title: record.title,
    ingredients,
  };
}

async function getRecentRecipeMemory(
  userId: string,
  limit = 120,
): Promise<RecipeMemoryItem[]> {
  const dailyRows = await db
    .select({
      mealType: dailyRecipesTable.mealType,
      recipeJson: dailyRecipesTable.recipeJson,
    })
    .from(dailyRecipesTable)
    .where(eq(dailyRecipesTable.userId, userId))
    .orderBy(desc(dailyRecipesTable.date), desc(dailyRecipesTable.generatedAt))
    .limit(limit);

  const savedRows = await db
    .select({
      recipeJson: savedRecipesTable.recipeJson,
    })
    .from(savedRecipesTable)
    .where(eq(savedRecipesTable.userId, userId))
    .orderBy(desc(savedRecipesTable.savedAt))
    .limit(Math.floor(limit / 2));

  const combined: RecipeMemoryItem[] = [];
  for (const row of dailyRows) {
    const item = recipeMemoryFromJson(row.recipeJson, row.mealType);
    if (item) combined.push(item);
  }
  for (const row of savedRows) {
    const item = recipeMemoryFromJson(row.recipeJson);
    if (item) combined.push(item);
  }

  // Keep only the first occurrence of each title to reduce prompt noise.
  const seen = new Set<string>();
  const deduped: RecipeMemoryItem[] = [];
  for (const item of combined) {
    const key = item.title.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }

  return deduped.slice(0, limit);
}

function scoreFallbackRecipe(
  recipeText: string,
  profileInput: Awaited<ReturnType<typeof getProfileInput>>,
): number {
  const terms = [
    profileInput.dietType,
    profileInput.healthGoal,
    ...(profileInput.allergies ?? []),
  ]
    .filter((value): value is string => Boolean(value && value.trim()))
    .map((value) => value.toLowerCase().replace(/-/g, " "));

  if (terms.length === 0) return 1;

  let score = 0;
  for (const term of terms) {
    if (recipeText.includes(term)) {
      score += 3;
      continue;
    }
    const parts = term.split(/\s+/).filter(Boolean);
    for (const part of parts) {
      if (part.length > 2 && recipeText.includes(part)) {
        score += 1;
      }
    }
  }
  return score;
}

async function getFallbackRecipesFromDb(
  profileInput: Awaited<ReturnType<typeof getProfileInput>>,
): Promise<Array<{ meal: string; [key: string]: unknown }>> {
  const candidateRows = await db
    .select({
      mealType: dailyRecipesTable.mealType,
      recipeJson: dailyRecipesTable.recipeJson,
      generatedAt: dailyRecipesTable.generatedAt,
    })
    .from(dailyRecipesTable)
    .orderBy(desc(dailyRecipesTable.generatedAt))
    .limit(800);

  const scored = candidateRows
    .map((row) => {
      const asRecipe =
        row.recipeJson && typeof row.recipeJson === "object"
          ? (row.recipeJson as Record<string, unknown>)
          : null;
      if (!asRecipe) return null;
      const recipeText = JSON.stringify(asRecipe).toLowerCase();
      return {
        mealType: row.mealType.toLowerCase(),
        recipe: asRecipe,
        score: scoreFallbackRecipe(recipeText, profileInput),
        generatedAt: row.generatedAt.getTime(),
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.generatedAt - a.generatedAt;
    });

  const mealPriority = ["breakfast", "lunch", "dinner", "treat"];
  const usedMeals = new Set<string>();
  const selected: Array<{ meal: string; [key: string]: unknown }> = [];

  for (const meal of mealPriority) {
    const candidate = scored.find((item) => item.mealType === meal && !usedMeals.has(meal));
    if (!candidate) continue;
    usedMeals.add(meal);
    selected.push({ ...candidate.recipe, meal });
  }

  for (const candidate of scored) {
    if (selected.length >= 4) break;
    if (usedMeals.has(candidate.mealType)) continue;
    usedMeals.add(candidate.mealType);
    selected.push({ ...candidate.recipe, meal: candidate.mealType });
  }

  return selected.slice(0, 4);
}

async function regenerateDailyMenuForDate(userId: string, date: string): Promise<void> {
  const profileInput = await getProfileInput(userId);
  const recentRecipes = await getRecentRecipeMemory(userId);
  const generated = await generateRecipes(profileInput, undefined, recentRecipes);
  const generatedAt = new Date();

  for (const recipe of generated) {
    await db
      .insert(dailyRecipesTable)
      .values({
        userId,
        date,
        mealType: recipe.meal,
        recipeJson: recipe as unknown as Record<string, unknown>,
        wasRegenerated: true,
        generatedAt,
      })
      .onConflictDoUpdate({
        target: [
          dailyRecipesTable.userId,
          dailyRecipesTable.date,
          dailyRecipesTable.mealType,
        ],
        set: {
          recipeJson: recipe as unknown as Record<string, unknown>,
          wasRegenerated: true,
          generatedAt,
        },
      });
  }

  await autoPopulateShoppingList(userId, date, true);
}

router.get("/recipes/today", async (req: Request, res: Response) => {
  let date: string;
  if (req.query.date) {
    const queryParsed = GetTodayRecipesQueryParams.safeParse(
      coerceDateFields({ ...req.query }, "date"),
    );
    if (!queryParsed.success) {
      res.status(400).json({ error: "Invalid date parameter" });
      return;
    }
    date = queryParsed.data.date!.toISOString().split("T")[0];
  } else {
    date = todayDate();
  }

  const userId = req.user!.id;

  if (await checkTrialAccess(userId, res)) return;

  let recipes = await db
    .select()
    .from(dailyRecipesTable)
    .where(
      and(
        eq(dailyRecipesTable.userId, userId),
        eq(dailyRecipesTable.date, date),
        inArray(dailyRecipesTable.mealType, CANONICAL_MEALS as unknown as string[]),
      ),
    );

  if (recipes.length === 0 && date === todayDate()) {
    const profileInput = await getProfileInput(userId);
    const recentRecipes = await getRecentRecipeMemory(userId);
    let generated: Array<{ meal: string; [key: string]: unknown }> = [];

    try {
      generated = await generateRecipes(profileInput, undefined, recentRecipes);
    } catch (err) {
      generated = await getFallbackRecipesFromDb(profileInput);
      if (generated.length === 0) {
        const message =
          err instanceof Error ? err.message : "Unknown AI generation error";
        res.status(502).json({ error: `Recipe generation failed: ${message}` });
        return;
      }
    }

    const insertRows = generated.map((recipe) => {
      const mealType =
        typeof recipe.meal === "string" && recipe.meal.trim().length > 0
          ? recipe.meal.toLowerCase()
          : "lunch";
      return {
        userId,
        date,
        mealType,
        recipeJson: recipe as unknown as Record<string, unknown>,
        wasRegenerated: false,
        regenCount: 0,
      };
    });

    try {
      recipes = await db
        .insert(dailyRecipesTable)
        .values(insertRows)
        .onConflictDoNothing()
        .returning();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown AI generation error";
      res.status(502).json({ error: `Recipe generation failed: ${message}` });
      return;
    }

    if (recipes.length === 0) {
      recipes = await db
        .select()
        .from(dailyRecipesTable)
        .where(
          and(
            eq(dailyRecipesTable.userId, userId),
            eq(dailyRecipesTable.date, date),
            inArray(dailyRecipesTable.mealType, CANONICAL_MEALS as unknown as string[]),
          ),
        );
    }

    await autoPopulateShoppingList(userId, date, false);
  }

  if (recipes.length > 0 && date === todayDate()) {
    const [profile] = await db
      .select({ updatedAt: userProfilesTable.updatedAt })
      .from(userProfilesTable)
      .where(eq(userProfilesTable.userId, userId));

    if (profile?.updatedAt) {
      const profileUpdatedAt = profile.updatedAt.getTime();
      const newestGeneratedAt = recipes.reduce((latest, row) => {
        const rowGeneratedAt = row.generatedAt.getTime();
        return rowGeneratedAt > latest ? rowGeneratedAt : latest;
      }, 0);

      if (profileUpdatedAt > newestGeneratedAt) {
        try {
          await regenerateDailyMenuForDate(userId, date);
          recipes = await db
            .select()
            .from(dailyRecipesTable)
            .where(
              and(
                eq(dailyRecipesTable.userId, userId),
                eq(dailyRecipesTable.date, date),
                inArray(dailyRecipesTable.mealType, CANONICAL_MEALS as unknown as string[]),
              ),
            );
        } catch (err) {
          const fallback = await getFallbackRecipesFromDb(await getProfileInput(userId));
          if (fallback.length > 0) {
            const generatedAt = new Date();
            await db
              .delete(dailyRecipesTable)
              .where(
                and(
                  eq(dailyRecipesTable.userId, userId),
                  eq(dailyRecipesTable.date, date),
                ),
              );

            await db.insert(dailyRecipesTable).values(
              fallback.map((recipe) => ({
                userId,
                date,
                mealType:
                  typeof recipe.meal === "string" && recipe.meal.trim().length > 0
                    ? recipe.meal.toLowerCase()
                    : "lunch",
                recipeJson: recipe as unknown as Record<string, unknown>,
                wasRegenerated: false,
                regenCount: 0,
                generatedAt,
              })),
            );

            recipes = await db
              .select()
              .from(dailyRecipesTable)
              .where(
                and(
                  eq(dailyRecipesTable.userId, userId),
                  eq(dailyRecipesTable.date, date),
                  inArray(dailyRecipesTable.mealType, CANONICAL_MEALS as unknown as string[]),
                ),
              );
          } else {
            const message =
              err instanceof Error ? err.message : "Unknown AI generation error";
            res
              .status(502)
              .json({ error: `Recipe refresh after profile update failed: ${message}` });
            return;
          }
        }
      }
    }
  }

  res.json(
    GetTodayRecipesResponse.parse({
      recipes: recipes.map((r) => ({
        id: r.id,
        mealType: r.mealType,
        recipe: r.recipeJson,
        date: new Date(r.date),
        wasRegenerated: r.wasRegenerated,
      })),
      date: new Date(date),
    }),
  );
});

router.get("/recipes/today-by-goal", async (req: Request, res: Response) => {
  let date: string;
  if (req.query.date) {
    const queryParsed = GetTodayRecipesQueryParams.safeParse(
      coerceDateFields({ ...req.query }, "date"),
    );
    if (!queryParsed.success) {
      res.status(400).json({ error: "Invalid date parameter" });
      return;
    }
    date = queryParsed.data.date!.toISOString().split("T")[0];
  } else {
    date = todayDate();
  }

  const userId = req.user!.id;
  const profileInput = await getProfileInput(userId);
  const goals = parseGoalList(profileInput.healthGoal);

  if (goals.length <= 1) {
    const rows = await db
      .select()
      .from(dailyRecipesTable)
      .where(
        and(
          eq(dailyRecipesTable.userId, userId),
          eq(dailyRecipesTable.date, date),
          inArray(dailyRecipesTable.mealType, CANONICAL_MEALS as unknown as string[]),
        ),
      );

    res.json({
      date,
      sections: [
        {
          goal: goals[0] ?? "daily-menu",
          recipes: rows.map((r) => ({
            id: r.id,
            mealType: r.mealType,
            recipe: r.recipeJson,
            date,
            wasRegenerated: r.wasRegenerated,
          })),
        },
      ],
    });
    return;
  }

  const scopedMealTypes = goals.flatMap((goal) =>
    CANONICAL_MEALS.map((meal) => goalScopedMealType(meal, goal)),
  );

  let goalRows = await db
    .select()
    .from(dailyRecipesTable)
    .where(
      and(
        eq(dailyRecipesTable.userId, userId),
        eq(dailyRecipesTable.date, date),
        inArray(dailyRecipesTable.mealType, scopedMealTypes),
      ),
    );

  const expectedCount = goals.length * CANONICAL_MEALS.length;
  if (goalRows.length < expectedCount) {
    const recentRecipes = await getRecentRecipeMemory(userId);
    const usedForUniqueness = [...recentRecipes];
    const generatedAt = new Date();

    for (const goal of goals) {
      let generated: Array<{ meal: string; [key: string]: unknown }> = [];
      try {
        generated = await generateRecipes(
          { ...profileInput, healthGoal: goal },
          undefined,
          usedForUniqueness,
        );
      } catch {
        generated = await getFallbackRecipesFromDb({
          ...profileInput,
          healthGoal: goal,
        });
      }

      for (const recipe of generated) {
        const baseMeal =
          typeof recipe.meal === "string" && isCanonicalMealType(recipe.meal)
            ? recipe.meal
            : ("lunch" as CanonicalMeal);
        const storedRecipe =
          recipe && typeof recipe === "object"
            ? {
                ...recipe,
                __goalKey: goal,
                __baseMealType: baseMeal,
              }
            : recipe;

        await db
          .insert(dailyRecipesTable)
          .values({
            userId,
            date,
            mealType: goalScopedMealType(baseMeal, goal),
            recipeJson: storedRecipe as Record<string, unknown>,
            wasRegenerated: false,
            regenCount: 0,
            generatedAt,
          })
          .onConflictDoUpdate({
            target: [
              dailyRecipesTable.userId,
              dailyRecipesTable.date,
              dailyRecipesTable.mealType,
            ],
            set: {
              recipeJson: storedRecipe as Record<string, unknown>,
              generatedAt,
            },
          });

        const parsed = recipeMemoryFromJson(storedRecipe, baseMeal);
        if (parsed) usedForUniqueness.push(parsed);
      }
    }

    goalRows = await db
      .select()
      .from(dailyRecipesTable)
      .where(
        and(
          eq(dailyRecipesTable.userId, userId),
          eq(dailyRecipesTable.date, date),
          inArray(dailyRecipesTable.mealType, scopedMealTypes),
        ),
      );
  }

  const mealOrder: Record<CanonicalMeal, number> = {
    breakfast: 0,
    lunch: 1,
    dinner: 2,
    treat: 3,
  };

  const sections = goals.map((goal) => {
    const records = goalRows
      .filter((row) => {
        const json = row.recipeJson as Record<string, unknown>;
        return json?.__goalKey === goal;
      })
      .map((row) => {
        const json = row.recipeJson as Record<string, unknown>;
        const baseMeal =
          typeof json?.__baseMealType === "string" && isCanonicalMealType(json.__baseMealType)
            ? json.__baseMealType
            : "lunch";
        const cleanRecipe = { ...json };
        delete cleanRecipe.__goalKey;
        delete cleanRecipe.__baseMealType;
        return {
          id: row.id,
          mealType: baseMeal,
          recipe: cleanRecipe,
          date,
          wasRegenerated: row.wasRegenerated,
        };
      })
      .sort((a, b) => mealOrder[a.mealType as CanonicalMeal] - mealOrder[b.mealType as CanonicalMeal]);

    return { goal, recipes: records };
  });

  res.json({ date, sections });
});

router.get("/recipes/history", async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const rawDays =
    typeof req.query.days === "string"
      ? Number.parseInt(req.query.days, 10)
      : 30;
  const days = Number.isFinite(rawDays)
    ? Math.min(Math.max(rawDays, 1), 120)
    : 30;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - (days - 1));
  const startDateStr = startDate.toISOString().split("T")[0];

  const rows = await db
    .select()
    .from(dailyRecipesTable)
    .where(
      and(
        eq(dailyRecipesTable.userId, userId),
        sql`${dailyRecipesTable.date} >= ${startDateStr}`,
      ),
    )
    .orderBy(desc(dailyRecipesTable.date), desc(dailyRecipesTable.generatedAt));

  const grouped = new Map<
    string,
    Array<{
      id: string;
      mealType: string;
      recipe: unknown;
      date: string;
      wasRegenerated: boolean;
    }>
  >();

  for (const row of rows) {
    const dateKey = row.date;
    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, []);
    }
    grouped.get(dateKey)!.push({
      id: row.id,
      mealType: row.mealType,
      recipe: row.recipeJson,
      date: dateKey,
      wasRegenerated: row.wasRegenerated,
    });
  }

  const daysPayload = Array.from(grouped.entries()).map(([date, recipes]) => ({
    date,
    recipes,
  }));

  res.json({
    days: daysPayload,
    totalMeals: rows.length,
  });
});

router.post("/recipes/regenerate-menu", async (req: Request, res: Response) => {
  let date = todayDate();
  if (req.body?.date) {
    const parsed = GetTodayRecipesQueryParams.safeParse(
      coerceDateFields({ date: req.body.date }, "date"),
    );
    if (!parsed.success || !parsed.data.date) {
      res.status(400).json({ error: "Invalid date parameter" });
      return;
    }
    date = parsed.data.date.toISOString().split("T")[0];
  }

  const userId = req.user!.id;

  if (await checkTrialAccess(userId, res)) return;

  try {
    await regenerateDailyMenuForDate(userId, date);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown AI generation error";
    res.status(502).json({ error: `Menu regeneration failed: ${message}` });
    return;
  }

  const refreshedRecipes = await db
    .select()
    .from(dailyRecipesTable)
    .where(
      and(
        eq(dailyRecipesTable.userId, userId),
        eq(dailyRecipesTable.date, date),
        inArray(dailyRecipesTable.mealType, CANONICAL_MEALS as unknown as string[]),
      ),
    );

  res.json(
    GetTodayRecipesResponse.parse({
      recipes: refreshedRecipes.map((r) => ({
        id: r.id,
        mealType: r.mealType,
        recipe: r.recipeJson,
        date: new Date(r.date),
        wasRegenerated: r.wasRegenerated,
      })),
      date: new Date(date),
    }),
  );
});

router.post("/recipes/regenerate", async (req: Request, res: Response) => {
  const parsed = RegenerateRecipeBody.safeParse(
    coerceDateFields({ ...req.body }, "date"),
  );
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const mealType = parsed.data.mealType;
  const date = parsed.data.date
    ? parsed.data.date.toISOString().split("T")[0]
    : todayDate();
  const userId = req.user!.id;

  if (await checkTrialAccess(userId, res)) return;

  const totalRegenCount = await db
    .select({ total: sql<number>`coalesce(sum(regen_count), 0)::int` })
    .from(dailyRecipesTable)
    .where(
      and(
        eq(dailyRecipesTable.userId, userId),
        eq(dailyRecipesTable.date, date),
        inArray(dailyRecipesTable.mealType, CANONICAL_MEALS as unknown as string[]),
      ),
    );

  if (totalRegenCount[0].total >= 3) {
    res
      .status(429)
      .json({ error: "You have reached the maximum of 3 regenerations per day" });
    return;
  }

  const [existing] = await db
    .select()
    .from(dailyRecipesTable)
    .where(
      and(
        eq(dailyRecipesTable.userId, userId),
        eq(dailyRecipesTable.date, date),
        eq(dailyRecipesTable.mealType, mealType),
      ),
    );

  if (!existing) {
    res.status(404).json({ error: "No recipe found for that meal slot" });
    return;
  }

  const [profile] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.userId, userId));

  const profileInput = {
    dietType: profile?.dietType ?? null,
    allergies: profile?.allergies ?? null,
    healthGoal: profile?.healthGoal ?? null,
    skillLevel: profile?.skillLevel ?? null,
    caloriesTarget: profile?.caloriesTarget ?? null,
    city: profile?.city ?? null,
    country: profile?.country ?? null,
  };

  let generated;
  try {
    const recentRecipes = await getRecentRecipeMemory(userId);
    generated = await generateRecipes(profileInput, mealType, recentRecipes);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown AI generation error";
    res.status(502).json({ error: `Recipe regeneration failed: ${message}` });
    return;
  }

  const newRecipe = generated[0];
  if (!newRecipe) {
    res
      .status(502)
      .json({ error: "AI returned no replacement recipe" });
    return;
  }

  if (newRecipe.meal !== mealType) {
    console.warn(
      `Claude returned meal type "${newRecipe.meal}" but "${mealType}" was requested; overriding.`,
    );
    (newRecipe as { meal: string }).meal = mealType;
  }

  const [updated] = await db
    .update(dailyRecipesTable)
    .set({
      recipeJson: newRecipe as unknown as Record<string, unknown>,
      wasRegenerated: true,
      regenCount: sql`${dailyRecipesTable.regenCount} + 1`,
      generatedAt: new Date(),
    })
    .where(eq(dailyRecipesTable.id, existing.id))
    .returning();

  try {
    await autoPopulateShoppingList(userId, date, true);
  } catch (err) {
    console.warn(
      "Shopping list auto-populate failed after regeneration:",
      err instanceof Error ? err.message : err,
    );
  }

  res.json(
    RegenerateRecipeResponse.parse({
      id: updated.id,
      mealType: updated.mealType,
      recipe: updated.recipeJson,
      date: new Date(updated.date),
      wasRegenerated: updated.wasRegenerated,
    }),
  );
});

router.get("/saved-recipes", async (req: Request, res: Response) => {
  const recipes = await db
    .select()
    .from(savedRecipesTable)
    .where(eq(savedRecipesTable.userId, req.user!.id));

  res.json(
    GetSavedRecipesResponse.parse({
      recipes: recipes.map((r) => ({
        id: r.id,
        recipe: r.recipeJson,
        savedAt: r.savedAt,
      })),
    }),
  );
});

router.post("/saved-recipes", async (req: Request, res: Response) => {
  const parsed = SaveRecipeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const [saved] = await db
    .insert(savedRecipesTable)
    .values({
      userId: req.user!.id,
      recipeJson: parsed.data.recipeJson,
    })
    .returning();

  res.status(201).json(
    GetSavedRecipesResponse.parse({
      recipes: [
        {
          id: saved.id,
          recipe: saved.recipeJson,
          savedAt: saved.savedAt,
        },
      ],
    }).recipes[0],
  );
});

router.delete("/saved-recipes/:id", async (req: Request, res: Response) => {
  const paramsParsed = DeleteSavedRecipeParams.safeParse(req.params);
  if (!paramsParsed.success) {
    res.status(400).json({ error: "Invalid recipe id" });
    return;
  }

  await db
    .delete(savedRecipesTable)
    .where(
      and(
        eq(savedRecipesTable.id, paramsParsed.data.id),
        eq(savedRecipesTable.userId, req.user!.id),
      ),
    );

  res.json(DeleteSavedRecipeResponse.parse({ success: true }));
});

export default router;
