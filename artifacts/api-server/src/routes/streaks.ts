import { Router, type IRouter, type Request, type Response } from "express";
import {
  GetStreakResponse,
  LogCookedMealBody,
  LogCookedMealResponse,
} from "@workspace/api-zod";
import { db, userStreaksTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/streaks", async (req: Request, res: Response) => {
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

router.post("/streaks/log", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = LogCookedMealBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  const [existing] = await db
    .select()
    .from(userStreaksTable)
    .where(eq(userStreaksTable.userId, req.user.id));

  let currentStreak = 1;
  let longestStreak = 1;

  if (existing) {
    const lastCooked = existing.lastCookedAt;
    if (lastCooked) {
      const lastCookedStr = lastCooked.toISOString().split("T")[0];

      if (lastCookedStr === todayStr) {
        res.json(
          LogCookedMealResponse.parse({
            currentStreak: existing.currentStreak,
            longestStreak: existing.longestStreak,
            lastCookedAt: existing.lastCookedAt ?? null,
          }),
        );
        return;
      }

      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      if (lastCookedStr === yesterdayStr) {
        currentStreak = existing.currentStreak + 1;
      } else {
        currentStreak = 1;
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
    LogCookedMealResponse.parse({
      currentStreak,
      longestStreak,
      lastCookedAt: now,
    }),
  );
});

export default router;
