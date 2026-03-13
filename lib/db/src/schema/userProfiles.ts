import { pgTable, varchar, text, integer, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./auth";

export const userProfilesTable = pgTable("user_profiles", {
  userId: varchar("user_id").primaryKey().references(() => usersTable.id, { onDelete: "cascade" }),
  dietType: varchar("diet_type", { length: 50 }),
  allergies: text("allergies").array(),
  healthGoal: varchar("health_goal", { length: 50 }),
  skillLevel: varchar("skill_level", { length: 20 }),
  caloriesTarget: integer("calories_target"),
  city: varchar("city", { length: 100 }),
  country: varchar("country", { length: 100 }),
  lat: real("lat"),
  lng: real("lng"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertUserProfileSchema = createInsertSchema(userProfilesTable).omit({ createdAt: true, updatedAt: true });
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type UserProfile = typeof userProfilesTable.$inferSelect;
