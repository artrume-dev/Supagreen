import { sql } from "drizzle-orm";
import { pgTable, varchar, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./auth";

export const savedRecipesTable = pgTable("saved_recipes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  recipeJson: jsonb("recipe_json").notNull(),
  savedAt: timestamp("saved_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSavedRecipeSchema = createInsertSchema(savedRecipesTable).omit({ id: true, savedAt: true });
export type InsertSavedRecipe = z.infer<typeof insertSavedRecipeSchema>;
export type SavedRecipe = typeof savedRecipesTable.$inferSelect;
