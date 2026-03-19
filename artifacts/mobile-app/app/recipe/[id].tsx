import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";

import Colors from "@/constants/colors";
import { getRecipeDetailCacheKey, type CachedRecipeDetail } from "@/features/home/recipeDetailCache";
import { getTodayDateString } from "@/features/common/date";
import { useAuth } from "@/lib/auth";
import {
  getShoppingList,
  getGetProfileQueryOptions,
  getGetTodayRecipesQueryOptions,
  getGetSavedRecipesQueryOptions,
  useSaveRecipe,
  useUpsertShoppingList,
  getGetSavedRecipesQueryKey,
  getGetShoppingListQueryKey,
  useUpdateStreak,
} from "@workspace/api-client-react";

function parseGoalList(rawGoal: string | null | undefined): string[] {
  if (!rawGoal) return [];
  return rawGoal
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatGoalLabel(goal: string): string {
  return goal.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function MacroBar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = Math.min(value / max, 1);
  const widthPct = `${pct * 100}%` as `${number}%`;
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <Text style={mbStyles.value}>{value}g</Text>
      <Text style={mbStyles.label}>{label}</Text>
      <View style={mbStyles.barBg}>
        <View
          style={[
            mbStyles.barFill,
            { width: widthPct, backgroundColor: color },
          ]}
        />
      </View>
    </View>
  );
}

const mbStyles = StyleSheet.create({
  value: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  label: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  barBg: {
    width: "100%",
    height: 6,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 3,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 3,
  },
});

export default function RecipeDetailScreen() {
  const { id: rawId } = useLocalSearchParams<{ id?: string | string[] }>();
  const recipeId = Array.isArray(rawId) ? rawId[0] : rawId;
  const isVirtualRecipe = Boolean(recipeId?.startsWith("virtual-"));
  const { user, isLoading: authLoading } = useAuth();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const queryClient = useQueryClient();

  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(
    new Set()
  );
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(
    new Set()
  );
  const [isSavedLocal, setIsSavedLocal] = useState(false);
  const [hasAddedToList, setHasAddedToList] = useState(false);
  const [lastAddedIngredientNames, setLastAddedIngredientNames] = useState<string[]>([]);

  const todayDate = getTodayDateString();

  const { data: recipesData, isLoading: todayLoading } = useQuery({
    ...getGetTodayRecipesQueryOptions({ date: todayDate }),
    enabled: !authLoading && !!user,
  });

  const { data: savedData, isLoading: savedLoading } = useQuery({
    ...getGetSavedRecipesQueryOptions(),
    enabled: !authLoading && !!user,
  });

  const { data: profileData } = useQuery({
    ...getGetProfileQueryOptions(),
    enabled: !authLoading && !!user,
  });

  const isLoading = authLoading || todayLoading || savedLoading;
  const selectedGoals = parseGoalList(profileData?.profile?.healthGoal);

  const saveMutation = useSaveRecipe({
    mutation: {
      onSuccess: () => {
        setIsSavedLocal(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        queryClient.invalidateQueries({ queryKey: getGetSavedRecipesQueryKey() });
      },
    },
  });

  const addToShopMutation = useUpsertShoppingList({
    mutation: {
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        queryClient.invalidateQueries({ queryKey: getGetShoppingListQueryKey() });
      },
      onError: () => {
        Alert.alert("Error", "Could not add to shopping list");
      },
    },
  });

  const updateStreakMutation = useUpdateStreak({
    mutation: {
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Meal logged", "Your streak has been updated.");
      },
      onError: (error: unknown) => {
        const message =
          error instanceof Error ? error.message : "This meal may already be logged.";
        Alert.alert("Could not log meal", message);
      },
    },
  });

  const todayRecipe = recipesData?.recipes?.find((r) => String(r.id) === String(recipeId));
  const savedRecipe = savedData?.recipes?.find((sr) => String(sr.id) === String(recipeId));
  const cachedRecipe = recipeId
    ? queryClient.getQueryData<CachedRecipeDetail>(getRecipeDetailCacheKey(String(recipeId)))
    : undefined;
  const recipe =
    todayRecipe ??
    (savedRecipe
      ? { id: savedRecipe.id, mealType: "Saved", recipe: savedRecipe.recipe, date: savedRecipe.savedAt }
      : undefined) ??
    cachedRecipe;
  const recipeData = recipe?.recipe;
  const isSaved = isSavedLocal || !!savedData?.recipes?.some((sr) => String(sr.id) === String(recipeId));
  const addedIngredientCount = lastAddedIngredientNames.length;

  const toggleIngredient = (i: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCheckedIngredients((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const toggleStep = (i: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const handleAddToShop = async () => {
    if (!recipeData) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const sourceIngredients =
      checkedIngredients.size > 0
        ? (recipeData.ingredients ?? []).filter((_, idx) => checkedIngredients.has(idx))
        : (recipeData.ingredients ?? []);

    const newItems = sourceIngredients.map((ing) => ({
        name: ing.name ?? "Unknown",
        amount: ing.amount ?? "1",
        unit: ing.unit ?? "",
        category: "Grocery",
      }));
    const selectedIngredientNames = newItems.map((item) => item.name);

    if (newItems.length === 0) {
      Alert.alert("No ingredients", "This recipe has no ingredients to add.");
      return;
    }

    try {
      let existingItems: Array<{ name: string; amount: string; unit: string; category: string }> = [];
      try {
        const existing = await getShoppingList({ date: todayDate });
        existingItems = (existing.items ?? []).map((item) => ({
          name: item.name,
          amount: item.amount,
          unit: item.unit ?? "",
          category: item.category ?? "Grocery",
        }));
      } catch {
        // First list for date is expected to 404/empty in some environments.
      }

      const existingNames = new Set(existingItems.map((item) => item.name.trim().toLowerCase()));
      const mergedItems = [
        ...existingItems,
        ...newItems.filter((item) => !existingNames.has(item.name.trim().toLowerCase())),
      ];

      const updated = await addToShopMutation.mutateAsync({
        data: { date: todayDate, items: mergedItems },
      });
      queryClient.setQueryData(getGetShoppingListQueryKey({ date: todayDate }), updated);
      queryClient.invalidateQueries({ queryKey: getGetShoppingListQueryKey({ date: todayDate }) });
      setLastAddedIngredientNames(selectedIngredientNames);
      setHasAddedToList(true);
      Alert.alert("Added", "Ingredients added to your shopping list");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Could not add to shopping list";
      Alert.alert("Error", message);
    }
  };

  const handlePrimaryAction = () => {
    if (hasAddedToList) {
      router.push({
        pathname: "/(tabs)/shopping",
        params: {
          from: "recipe",
          recipeId: String(recipeId),
          date: todayDate,
          selected: JSON.stringify(lastAddedIngredientNames),
        },
      });
      return;
    }
    void handleAddToShop();
  };

  const handleLogMeal = () => {
    if (isVirtualRecipe) {
      Alert.alert(
        "Tracking unavailable",
        "This is a goal-preview recipe. Generate or save it first to track it in your streak.",
      );
      return;
    }
    if (!recipeId) return;
    updateStreakMutation.mutate({ data: { recipeId: String(recipeId) } });
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <View style={{ alignItems: "center", gap: 8 }}>
          <Ionicons name="restaurant" size={32} color={Colors.textTertiary} />
          <Text style={styles.notFoundText}>Loading recipe...</Text>
        </View>
      </View>
    );
  }

  if (!recipeData) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <Feather name="alert-circle" size={40} color={Colors.textTertiary} />
        <Text style={styles.notFoundText}>Recipe not found</Text>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <View style={styles.heroContainer}>
          {recipeData.imageUrl ? (
            <Image
              source={{ uri: recipeData.imageUrl }}
              style={styles.heroImage}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.heroImage, styles.heroPlaceholder]}>
              <Ionicons name="restaurant" size={48} color={Colors.textTertiary} />
            </View>
          )}
          <LinearGradient
            colors={["transparent", "rgba(15,23,16,0.5)", Colors.background]}
            style={styles.heroOverlay}
          />

          <View style={[styles.heroTopRow, { top: isWeb ? 67 : insets.top + 8 }]}>
            <Pressable
              onPress={() => router.back()}
              style={styles.heroButton}
            >
              <Feather name="arrow-left" size={20} color="#fff" />
            </Pressable>
            <Pressable
              onPress={() => {
                if (!isSaved && recipeData) {
                  saveMutation.mutate({ data: { recipeJson: recipeData } });
                }
              }}
              style={styles.heroButton}
            >
              <Ionicons
                name={isSaved ? "heart" : "heart-outline"}
                size={20}
                color={isSaved ? Colors.primary : "#fff"}
              />
            </Pressable>
          </View>

          <View style={styles.heroBottomContent}>
            <View style={styles.heroBadgeRow}>
              <View style={styles.mealBadge}>
                <Text style={styles.mealBadgeText}>
                  {recipe?.mealType || "meal"}
                </Text>
              </View>
              <View style={styles.timeBadge}>
                <Feather name="clock" size={12} color="#fff" />
                <Text style={styles.timeBadgeText}>
                  {recipeData.prepTime} min
                </Text>
              </View>
            </View>
            <Text style={styles.heroTitle}>{recipeData.title}</Text>
          </View>
        </View>

        {recipeData.goalAlignment && (
          <View style={styles.goalBanner}>
            <View style={styles.goalBannerIconWrap}>
              <Ionicons name="flame-outline" size={20} color={Colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.goalBannerTitle}>GOAL ALIGNMENT</Text>
              <Text style={styles.goalBannerDesc}>
                {recipeData.goalAlignment}
              </Text>
            </View>
          </View>
        )}

        {selectedGoals.length > 1 ? (
          <View style={styles.multiGoalBanner}>
            <Text style={styles.multiGoalTitle}>Also supports goals</Text>
            <Text style={styles.multiGoalText}>
              {selectedGoals.map(formatGoalLabel).join(" · ")}
            </Text>
          </View>
        ) : null}

        <View style={styles.scoreRow}>
          <View style={styles.scoreBadge}>
            <Feather name="star" size={14} color="#fff" />
            <Text style={styles.scoreValue}>{recipeData.healthScore}</Text>
          </View>
          <View>
            <Text style={styles.scoreLabel}>Excellent nutritional score</Text>
            <View style={styles.scoreServingsRow}>
              <MaterialCommunityIcons
                name="chef-hat"
                size={14}
                color={Colors.textSecondary}
              />
              <Text style={styles.scoreServings}>
                {recipeData.servings || 1} servings
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.macroCard}>
          <View style={styles.macroHeader}>
            <Text style={styles.macroHeaderText}>Macros per serving</Text>
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}>
              <Text style={styles.macroCalValue}>
                {recipeData.macros?.calories ?? 0}
              </Text>
              <Text style={styles.macroCalUnit}>kcal</Text>
            </View>
          </View>
          <View style={styles.macroBarRow}>
            <MacroBar
              label="Protein"
              value={recipeData.macros?.protein ?? 0}
              max={60}
              color={Colors.primary}
            />
            <MacroBar
              label="Carbs"
              value={recipeData.macros?.carbs ?? 0}
              max={100}
              color={Colors.accent}
            />
            <MacroBar
              label="Fat"
              value={recipeData.macros?.fat ?? 0}
              max={60}
              color={Colors.blue}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ingredients</Text>
          <View style={{ gap: 6 }}>
            {(recipeData.ingredients ?? []).map((ing, i) => (
              <Pressable
                key={i}
                onPress={() => toggleIngredient(i)}
                style={[
                  styles.ingredientRow,
                  checkedIngredients.has(i) && styles.ingredientChecked,
                ]}
              >
                <View
                  style={[
                    styles.checkbox,
                    checkedIngredients.has(i) && styles.checkboxChecked,
                  ]}
                >
                  {checkedIngredients.has(i) && (
                    <Feather name="check" size={12} color="#fff" />
                  )}
                </View>
                <View style={styles.ingredientNameWrap}>
                  <Text
                    style={[
                      styles.ingredientName,
                      checkedIngredients.has(i) && styles.ingredientNameChecked,
                    ]}
                  >
                    {ing.name}
                  </Text>
                  {ing.isKeyIngredient && (
                    <View style={styles.keyBadge}>
                      <Text style={styles.keyBadgeText}>KEY</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.ingredientAmount}>
                  {ing.amount} {ing.unit}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Method</Text>
          <View style={{ gap: 8 }}>
            {(recipeData.steps ?? []).map((stepText, i) => (
              <Pressable
                key={i}
                onPress={() => toggleStep(i)}
                style={[
                  styles.stepRow,
                  completedSteps.has(i) && styles.stepCompleted,
                ]}
              >
                <View
                  style={[
                    styles.stepNumber,
                    completedSteps.has(i) && styles.stepNumberDone,
                  ]}
                >
                  {completedSteps.has(i) ? (
                    <Feather name="check" size={12} color="#fff" />
                  ) : (
                    <Text style={styles.stepNumberText}>{i + 1}</Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.stepText,
                    completedSteps.has(i) && styles.stepTextDone,
                  ]}
                >
                  {stepText}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {recipeData.healthBenefits && recipeData.healthBenefits.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Health Benefits</Text>
            <View style={styles.benefitsList}>
              {recipeData.healthBenefits.map((b, i) => (
                <View key={i} style={styles.benefitRow}>
                  <View style={styles.benefitDot} />
                  <Text style={styles.benefitText}>{b}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {recipeData.swapSuggestion && (
          <View style={styles.swapCard}>
            <Feather name="refresh-cw" size={14} color={Colors.accent} />
            <View style={{ flex: 1 }}>
              <Text style={styles.swapTitle}>SMART SWAP</Text>
              <Text style={styles.swapDesc}>{recipeData.swapSuggestion}</Text>
            </View>
          </View>
        )}
      </ScrollView>

      <View
        style={[
          styles.stickyBottom,
          { paddingBottom: isWeb ? 34 : Math.max(insets.bottom, 16) + 8 },
        ]}
      >
        {hasAddedToList && addedIngredientCount > 0 && (
          <Text style={styles.addedIngredientsLabel}>
            {addedIngredientCount} ingredient{addedIngredientCount === 1 ? "" : "s"} added
          </Text>
        )}
        <View style={styles.stickyActionsRow}>
          <Pressable
            onPress={handlePrimaryAction}
            disabled={addToShopMutation.isPending}
            style={({ pressed }) => [
              styles.addToShopButton,
              pressed && { transform: [{ scale: 0.98 }] },
            ]}
          >
            <LinearGradient
              colors={[Colors.primary, "#16A34A"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.addToShopGradient}
            >
              <Feather name="shopping-cart" size={18} color="#fff" />
              <Text style={styles.addToShopText}>
                {addToShopMutation.isPending
                  ? "Adding..."
                  : hasAddedToList
                    ? "Show Shopping List"
                    : "Add to Shopping List"}
              </Text>
            </LinearGradient>
          </Pressable>
          <Pressable
            onPress={handleLogMeal}
            style={styles.shareButton}
            disabled={updateStreakMutation.isPending}
          >
            <Ionicons
              name="flame-outline"
              size={18}
              color={Colors.accent}
            />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const CONTENT_BLOCK_PADDING = 16;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  notFoundText: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    marginTop: 12,
  },
  backButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.card,
  },
  backButtonText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  heroContainer: {
    height: 280,
    position: "relative",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroPlaceholder: {
    backgroundColor: Colors.cardLight,
    justifyContent: "center",
    alignItems: "center",
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  heroTopRow: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  heroButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
  },
  heroBottomContent: {
    position: "absolute",
    bottom: 16,
    left: 20,
    right: 20,
  },
  heroBadgeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  mealBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  mealBadgeText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
    textTransform: "capitalize",
  },
  timeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  timeBadgeText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "#fff",
  },
  heroTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    lineHeight: 28,
  },
  goalBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: "rgba(249,115,22,0.08)",
    borderWidth: 1,
    borderColor: "rgba(249,115,22,0.3)",
    borderRadius: 16,
    padding: 16,
  },
  goalBannerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(249,115,22,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  goalBannerTitle: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#FB923C",
    letterSpacing: 1,
  },
  goalBannerDesc: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.9)",
    lineHeight: 20,
    marginTop: 2,
  },
  multiGoalBanner: {
    marginHorizontal: 20,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.25)",
    borderRadius: 14,
    backgroundColor: "rgba(34,197,94,0.08)",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  multiGoalTitle: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: Colors.primary,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  multiGoalText: {
    marginTop: 4,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
    lineHeight: 18,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 20,
    marginTop: 16,
  },
  scoreBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  scoreValue: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  scoreLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  scoreServingsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  scoreServings: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  macroCard: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: Colors.card,
    borderRadius: 18,
    padding: 16,
  },
  macroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  macroHeaderText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  macroCalValue: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  macroCalUnit: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  macroBarRow: {
    flexDirection: "row",
    gap: 16,
  },
  section: {
    marginHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginBottom: 12,
  },
  ingredientRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.card,
    borderRadius: 14,
    paddingHorizontal: CONTENT_BLOCK_PADDING,
    paddingVertical: CONTENT_BLOCK_PADDING,
  },
  ingredientChecked: {
    opacity: 0.5,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  ingredientName: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
  },
  ingredientNameWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  ingredientNameChecked: {
    textDecorationLine: "line-through",
    color: Colors.textTertiary,
  },
  keyBadge: {
    backgroundColor: "rgba(34,197,94,0.12)",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.35)",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  keyBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: Colors.primary,
    letterSpacing: 0.3,
  },
  ingredientAmount: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(74, 222, 128, 0.9)",
  },
  stepRow: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: CONTENT_BLOCK_PADDING,
  },
  stepCompleted: {
    opacity: 0.5,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: "rgba(34,197,94,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  stepNumberDone: {
    backgroundColor: Colors.primary,
  },
  stepNumberText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: Colors.primary,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.8)",
    lineHeight: 22,
  },
  stepTextDone: {
    textDecorationLine: "line-through",
    color: Colors.textTertiary,
  },
  benefitsList: {
    gap: 8,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "rgba(34,197,94,0.08)",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.15)",
    borderRadius: 12,
    paddingHorizontal: CONTENT_BLOCK_PADDING,
    paddingVertical: CONTENT_BLOCK_PADDING,
  },
  benefitDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
    backgroundColor: Colors.primary,
  },
  benefitText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.primary,
    flex: 1,
    flexWrap: "wrap",
    lineHeight: 21,
  },
  swapCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: "rgba(249,115,22,0.08)",
    borderWidth: 1,
    borderColor: "rgba(249,115,22,0.15)",
    borderRadius: 16,
    padding: CONTENT_BLOCK_PADDING,
  },
  swapTitle: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: Colors.accent,
    letterSpacing: 0.5,
  },
  swapDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.6)",
    lineHeight: 20,
    marginTop: 2,
  },
  stickyBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 14,
    backgroundColor: "rgba(28,43,30,0.95)",
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  stickyActionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  addedIngredientsLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(74, 222, 128, 0.95)",
  },
  addToShopButton: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
  addToShopGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  addToShopText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  shareButton: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
});
