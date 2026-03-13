import { sql } from "drizzle-orm";
import { pgTable, varchar, date, jsonb, text, timestamp, index, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./auth";

export const shoppingListsTable = pgTable(
  "shopping_lists",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    itemsJson: jsonb("items_json").notNull(),
    checkedItems: text("checked_items").array().notNull().default(sql`'{}'::text[]`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_shopping_lists_user_date").on(table.userId, table.date),
    unique("uq_shopping_lists_user_date").on(table.userId, table.date),
  ],
);

export const insertShoppingListSchema = createInsertSchema(shoppingListsTable).omit({ id: true, updatedAt: true });
export type InsertShoppingList = z.infer<typeof insertShoppingListSchema>;
export type ShoppingList = typeof shoppingListsTable.$inferSelect;
