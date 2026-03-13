import { pgTable, varchar, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./auth";

export const userStreaksTable = pgTable("user_streaks", {
  userId: varchar("user_id").primaryKey().references(() => usersTable.id, { onDelete: "cascade" }),
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  lastCookedAt: timestamp("last_cooked_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertUserStreakSchema = createInsertSchema(userStreaksTable).omit({ updatedAt: true });
export type InsertUserStreak = z.infer<typeof insertUserStreakSchema>;
export type UserStreak = typeof userStreaksTable.$inferSelect;
