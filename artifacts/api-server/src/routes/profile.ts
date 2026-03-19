import { Router, type IRouter, type Request, type Response } from "express";
import {
  GetProfileResponse,
  UpdateProfileBody,
  UpdateProfileResponse,
} from "@workspace/api-zod";
import {
  db,
  userProfilesTable,
  dailyRecipesTable,
  shoppingListsTable,
} from "@workspace/db";
import { and, eq } from "drizzle-orm";

const router: IRouter = Router();

function todayDate(): string {
  return new Date().toISOString().split("T")[0];
}

router.get("/profile", async (req: Request, res: Response) => {
  const [profile] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.userId, req.user!.id));

  res.json(
    GetProfileResponse.parse({
      profile: profile
        ? {
            userId: profile.userId,
            dietType: profile.dietType,
            allergies: profile.allergies ?? [],
            healthGoal: profile.healthGoal,
            skillLevel: profile.skillLevel,
            caloriesTarget: profile.caloriesTarget,
            city: profile.city,
            country: profile.country,
            lat: profile.lat,
            lng: profile.lng,
            createdAt: profile.createdAt,
            updatedAt: profile.updatedAt,
          }
        : null,
    }),
  );
});

router.put("/profile", async (req: Request, res: Response) => {
  const parsed = UpdateProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const data = parsed.data;
  const userId = req.user!.id;

  const [profile] = await db
    .insert(userProfilesTable)
    .values({
      userId,
      dietType: data.dietType,
      allergies: data.allergies,
      healthGoal: data.healthGoal,
      skillLevel: data.skillLevel,
      caloriesTarget: data.caloriesTarget,
      city: data.city,
      country: data.country,
      lat: data.lat,
      lng: data.lng,
    })
    .onConflictDoUpdate({
      target: userProfilesTable.userId,
      set: {
        dietType: data.dietType,
        allergies: data.allergies,
        healthGoal: data.healthGoal,
        skillLevel: data.skillLevel,
        caloriesTarget: data.caloriesTarget,
        city: data.city,
        country: data.country,
        lat: data.lat,
        lng: data.lng,
        updatedAt: new Date(),
      },
    })
    .returning();

  const date = todayDate();
  await db
    .delete(dailyRecipesTable)
    .where(
      and(
        eq(dailyRecipesTable.userId, userId),
        eq(dailyRecipesTable.date, date),
      ),
    );

  await db
    .delete(shoppingListsTable)
    .where(
      and(
        eq(shoppingListsTable.userId, userId),
        eq(shoppingListsTable.date, date),
      ),
    );

  res.json(
    UpdateProfileResponse.parse({
      profile: {
        userId: profile.userId,
        dietType: profile.dietType,
        allergies: profile.allergies ?? [],
        healthGoal: profile.healthGoal,
        skillLevel: profile.skillLevel,
        caloriesTarget: profile.caloriesTarget,
        city: profile.city,
        country: profile.country,
        lat: profile.lat,
        lng: profile.lng,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      },
    }),
  );
});

export default router;
