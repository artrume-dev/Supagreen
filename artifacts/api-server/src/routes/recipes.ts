import { Router, type IRouter, type Request, type Response } from "express";
import {
  GetDailyRecipesResponse,
  GetSavedRecipesResponse,
  SaveRecipeBody,
  DeleteSavedRecipeResponse,
} from "@workspace/api-zod";
import { db, dailyRecipesTable, savedRecipesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

function todayDate(): string {
  return new Date().toISOString().split("T")[0];
}

router.get("/recipes/daily", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const date = (req.query.date as string) || todayDate();

  const recipes = await db
    .select()
    .from(dailyRecipesTable)
    .where(
      and(
        eq(dailyRecipesTable.userId, req.user.id),
        eq(dailyRecipesTable.date, date),
      ),
    );

  res.json(
    GetDailyRecipesResponse.parse({
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

router.get("/recipes/saved", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const recipes = await db
    .select()
    .from(savedRecipesTable)
    .where(eq(savedRecipesTable.userId, req.user.id));

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

router.post("/recipes/saved", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = SaveRecipeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const [saved] = await db
    .insert(savedRecipesTable)
    .values({
      userId: req.user.id,
      recipeJson: parsed.data.recipeJson,
    })
    .returning();

  res.status(201).json({
    id: saved.id,
    recipe: saved.recipeJson,
    savedAt: saved.savedAt,
  });
});

router.delete("/recipes/saved/:id", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const recipeId = req.params.id as string;

  await db
    .delete(savedRecipesTable)
    .where(
      and(
        eq(savedRecipesTable.id, recipeId),
        eq(savedRecipesTable.userId, req.user.id),
      ),
    );

  res.json(DeleteSavedRecipeResponse.parse({ success: true }));
});

export default router;
