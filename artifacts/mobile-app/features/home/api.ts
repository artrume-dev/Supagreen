import { customFetch, type DailyRecipesResponse } from "@workspace/api-client-react";

export async function regenerateDailyMenu(date: string): Promise<DailyRecipesResponse> {
  return customFetch<DailyRecipesResponse>("/api/recipes/regenerate-menu", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date }),
  });
}

export interface GoalSectionRecipe {
  id: string;
  mealType: string;
  recipe: Record<string, unknown>;
  date: string;
  wasRegenerated: boolean;
}

export interface GoalSectionResponse {
  date: string;
  sections: Array<{
    goal: string;
    recipes: GoalSectionRecipe[];
  }>;
}

export async function getTodayRecipesByGoal(date: string): Promise<GoalSectionResponse> {
  const query = new URLSearchParams({ date });
  return customFetch<GoalSectionResponse>(`/api/recipes/today-by-goal?${query.toString()}`, {
    method: "GET",
  });
}
