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
import { db, dailyRecipesTable, savedRecipesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { coerceDateFields } from "../lib/parseDate";

const router: IRouter = Router();

function todayDate(): string {
  return new Date().toISOString().split("T")[0];
}

router.get("/recipes/today", async (req: Request, res: Response) => {
  const queryParsed = GetTodayRecipesQueryParams.safeParse(
    coerceDateFields({ ...req.query }, "date"),
  );
  const date = queryParsed.success && queryParsed.data.date
    ? queryParsed.data.date.toISOString().split("T")[0]
    : todayDate();

  const recipes = await db
    .select()
    .from(dailyRecipesTable)
    .where(
      and(
        eq(dailyRecipesTable.userId, req.user!.id),
        eq(dailyRecipesTable.date, date),
      ),
    );

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

  const [existing] = await db
    .select()
    .from(dailyRecipesTable)
    .where(
      and(
        eq(dailyRecipesTable.userId, req.user!.id),
        eq(dailyRecipesTable.date, date),
        eq(dailyRecipesTable.mealType, mealType),
      ),
    );

  if (!existing) {
    res.status(404).json({ error: "No recipe found for that meal slot" });
    return;
  }

  const [updated] = await db
    .update(dailyRecipesTable)
    .set({ wasRegenerated: true })
    .where(eq(dailyRecipesTable.id, existing.id))
    .returning();

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

  res.status(201).json({
    id: saved.id,
    recipe: saved.recipeJson,
    savedAt: saved.savedAt,
  });
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
