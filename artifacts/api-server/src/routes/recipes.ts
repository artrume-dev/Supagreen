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
} from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { coerceDateFields } from "../lib/parseDate";
import { generateRecipes } from "../services/recipeGenerator";

const router: IRouter = Router();

function todayDate(): string {
  return new Date().toISOString().split("T")[0];
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

  let recipes = await db
    .select()
    .from(dailyRecipesTable)
    .where(
      and(
        eq(dailyRecipesTable.userId, userId),
        eq(dailyRecipesTable.date, date),
      ),
    );

  if (recipes.length === 0 && date === todayDate()) {
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
      generated = await generateRecipes(profileInput);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown AI generation error";
      res.status(502).json({ error: `Recipe generation failed: ${message}` });
      return;
    }

    const insertRows = generated.map((recipe) => ({
      userId,
      date,
      mealType: recipe.meal,
      recipeJson: recipe as unknown as Record<string, unknown>,
      wasRegenerated: false,
      regenCount: 0,
    }));

    recipes = await db
      .insert(dailyRecipesTable)
      .values(insertRows)
      .onConflictDoNothing()
      .returning();

    if (recipes.length === 0) {
      recipes = await db
        .select()
        .from(dailyRecipesTable)
        .where(
          and(
            eq(dailyRecipesTable.userId, userId),
            eq(dailyRecipesTable.date, date),
          ),
        );
    }

    try {
      await autoPopulateShoppingList(userId, date, false);
    } catch {
      // Non-critical: shopping list auto-populate failed but recipes are still valid
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

  const totalRegenCount = await db
    .select({ total: sql<number>`coalesce(sum(regen_count), 0)::int` })
    .from(dailyRecipesTable)
    .where(
      and(
        eq(dailyRecipesTable.userId, userId),
        eq(dailyRecipesTable.date, date),
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
    generated = await generateRecipes(profileInput, mealType);
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
  } catch {
    // Non-critical
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
