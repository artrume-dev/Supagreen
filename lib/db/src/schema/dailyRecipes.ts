import { sql } from "drizzle-orm";
import { pgTable, varchar, date, jsonb, timestamp, boolean, index, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./auth";

export const dailyRecipesTable = pgTable(
  "daily_recipes",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    mealType: varchar("meal_type", { length: 20 }).notNull(),
    recipeJson: jsonb("recipe_json").notNull(),
    generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
    wasRegenerated: boolean("was_regenerated").notNull().default(false),
  },
  (table) => [
    index("idx_daily_recipes_user_date").on(table.userId, table.date),
    unique("uq_daily_recipes_user_date_meal").on(table.userId, table.date, table.mealType),
  ],
);

export const insertDailyRecipeSchema = createInsertSchema(dailyRecipesTable).omit({ id: true, generatedAt: true });
export type InsertDailyRecipe = z.infer<typeof insertDailyRecipeSchema>;
export type DailyRecipe = typeof dailyRecipesTable.$inferSelect;
