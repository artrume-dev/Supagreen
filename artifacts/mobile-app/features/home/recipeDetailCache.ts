import type { DailyRecipeItem } from "@workspace/api-client-react";

export type CachedRecipeDetail = Pick<DailyRecipeItem, "id" | "mealType" | "recipe" | "date">;

export function getRecipeDetailCacheKey(id: string) {
  return ["mobile", "recipe-detail", id] as const;
}
