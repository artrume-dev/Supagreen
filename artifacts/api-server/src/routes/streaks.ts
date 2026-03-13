import { Router, type IRouter, type Request, type Response } from "express";
import {
  GetStreakResponse,
  UpdateStreakBody,
  UpdateStreakResponse,
} from "@workspace/api-zod";
import { db, userStreaksTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

const router: IRouter = Router();

router.get("/streak", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [streak] = await db
    .select()
    .from(userStreaksTable)
    .where(eq(userStreaksTable.userId, req.user.id));

  res.json(
    GetStreakResponse.parse({
      currentStreak: streak?.currentStreak ?? 0,
      longestStreak: streak?.longestStreak ?? 0,
      lastCookedAt: streak?.lastCookedAt ?? null,
    }),
  );
});

router.patch("/streak", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = UpdateStreakBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const now = new Date();

  const [existing] = await db
    .select()
    .from(userStreaksTable)
    .where(eq(userStreaksTable.userId, req.user.id));

  let currentStreak = 1;
  let longestStreak = 1;

  if (existing) {
    const lastCooked = existing.lastCookedAt;

    if (lastCooked) {
      const elapsed = now.getTime() - lastCooked.getTime();

      if (elapsed > FORTY_EIGHT_HOURS_MS) {
        currentStreak = 1;
      } else {
        currentStreak = existing.currentStreak + 1;
      }
    }

    longestStreak = Math.max(currentStreak, existing.longestStreak);

    await db
      .update(userStreaksTable)
      .set({
        currentStreak,
        longestStreak,
        lastCookedAt: now,
      })
      .where(eq(userStreaksTable.userId, req.user.id));
  } else {
    await db.insert(userStreaksTable).values({
      userId: req.user.id,
      currentStreak: 1,
      longestStreak: 1,
      lastCookedAt: now,
    });
  }

  res.json(
    UpdateStreakResponse.parse({
      currentStreak,
      longestStreak,
      lastCookedAt: now,
    }),
  );
});

export default router;
