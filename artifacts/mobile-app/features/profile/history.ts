import { customFetch } from "@workspace/api-client-react";

export type MealHistoryRecipe = {
  id: string;
  mealType: string;
  recipe: {
    title?: string | null;
    emoji?: string | null;
    imageUrl?: string | null;
    prepTime?: number | null;
    macros?: {
      calories?: number | null;
      protein?: number | null;
    };
  };
  date: string;
  wasRegenerated: boolean;
};

export type MealHistoryDay = {
  date: string;
  recipes: MealHistoryRecipe[];
};

export type MealHistoryResponse = {
  days: MealHistoryDay[];
  totalMeals: number;
};

export async function getMealHistory(days: 7 | 30 | 90): Promise<MealHistoryResponse> {
  return customFetch<MealHistoryResponse>(`/api/recipes/history?days=${days}`, {
    method: "GET",
  });
}
