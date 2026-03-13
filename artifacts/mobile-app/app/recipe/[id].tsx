import { Feather, Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
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
import Svg, { Rect } from "react-native-svg";

import Colors from "@/constants/colors";
import { apiGet, apiPost } from "@/lib/api";

interface RecipeMacros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface Ingredient {
  name: string;
  amount: string;
  unit: string;
  isKey?: boolean;
}

interface Recipe {
  title: string;
  prepTime: number;
  servings?: number;
  healthScore: number;
  macros: RecipeMacros;
  imageUrl?: string;
  ingredients: Ingredient[];
  steps: string[];
  goalTag?: string;
  goalAlignment?: string;
  benefits?: string[];
  swap?: string;
}

interface DailyRecipe {
  id: number;
  mealType: string;
  recipeJson: Recipe;
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
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <Text style={mbStyles.value}>{value}g</Text>
      <Text style={mbStyles.label}>{label}</Text>
      <View style={mbStyles.barBg}>
        <View
          style={[
            mbStyles.barFill,
            { width: `${pct * 100}%` as any, backgroundColor: color },
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
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const queryClient = useQueryClient();

  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(
    new Set()
  );
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(
    new Set()
  );
  const [isSaved, setIsSaved] = useState(false);

  const todayDate = new Date().toISOString().split("T")[0];

  const { data: recipesData, isLoading } = useQuery<{ recipes: DailyRecipe[] }>(
    {
      queryKey: ["todayRecipes", todayDate],
      queryFn: () => apiGet(`/api/recipes/today?date=${todayDate}`),
    }
  );

  const saveMutation = useMutation({
    mutationFn: (body: { recipeJson: Recipe }) =>
      apiPost("/api/saved-recipes", body),
    onSuccess: () => {
      setIsSaved(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["savedRecipes"] });
    },
  });

  const recipe = recipesData?.recipes?.find((r) => String(r.id) === String(id));
  const recipeData = recipe?.recipeJson;

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

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
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
                  saveMutation.mutate({ recipeJson: recipeData });
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
            <Feather name="target" size={14} color={Colors.accent} />
            <View style={{ flex: 1 }}>
              <Text style={styles.goalBannerTitle}>GOAL ALIGNMENT</Text>
              <Text style={styles.goalBannerDesc}>
                {recipeData.goalAlignment}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.scoreRow}>
          <View style={styles.scoreBadge}>
            <Feather name="star" size={14} color="#fff" />
            <Text style={styles.scoreValue}>{recipeData.healthScore}</Text>
          </View>
          <View>
            <Text style={styles.scoreLabel}>Excellent nutritional score</Text>
            <Text style={styles.scoreServings}>
              {recipeData.servings || 1} serving
              {(recipeData.servings || 1) > 1 ? "s" : ""}
            </Text>
          </View>
        </View>

        <View style={styles.macroCard}>
          <View style={styles.macroHeader}>
            <Text style={styles.macroHeaderText}>Macros per serving</Text>
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}>
              <Text style={styles.macroCalValue}>
                {recipeData.macros.calories}
              </Text>
              <Text style={styles.macroCalUnit}>kcal</Text>
            </View>
          </View>
          <View style={styles.macroBarRow}>
            <MacroBar
              label="Protein"
              value={recipeData.macros.protein}
              max={60}
              color={Colors.primary}
            />
            <MacroBar
              label="Carbs"
              value={recipeData.macros.carbs}
              max={100}
              color={Colors.accent}
            />
            <MacroBar
              label="Fat"
              value={recipeData.macros.fat}
              max={60}
              color={Colors.blue}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ingredients</Text>
          <View style={{ gap: 6 }}>
            {recipeData.ingredients.map((ing, i) => (
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
                <Text
                  style={[
                    styles.ingredientName,
                    checkedIngredients.has(i) && styles.ingredientNameChecked,
                  ]}
                >
                  {ing.name}
                  {ing.isKey && (
                    <Text style={{ color: Colors.primary }}> *</Text>
                  )}
                </Text>
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
            {recipeData.steps.map((stepText, i) => (
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

        {recipeData.benefits && recipeData.benefits.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Health Benefits</Text>
            <View style={styles.benefitsGrid}>
              {recipeData.benefits.map((b, i) => (
                <View key={i} style={styles.benefitChip}>
                  <Feather name="check-circle" size={12} color={Colors.primary} />
                  <Text style={styles.benefitText}>{b}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {recipeData.swap && (
          <View style={styles.swapCard}>
            <Feather name="refresh-cw" size={14} color={Colors.accent} />
            <View style={{ flex: 1 }}>
              <Text style={styles.swapTitle}>SMART SWAP</Text>
              <Text style={styles.swapDesc}>{recipeData.swap}</Text>
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
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            Alert.alert("Added", "Ingredients added to shopping list");
          }}
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
            <Text style={styles.addToShopText}>Add to Shopping List</Text>
          </LinearGradient>
        </Pressable>
        <Pressable
          onPress={() => {
            if (!isSaved && recipeData) {
              saveMutation.mutate({ recipeJson: recipeData });
            }
          }}
          style={styles.shareButton}
        >
          <Feather
            name="bookmark"
            size={18}
            color={isSaved ? Colors.primary : Colors.text}
          />
        </Pressable>
      </View>
    </View>
  );
}

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
    gap: 10,
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: "rgba(249,115,22,0.1)",
    borderWidth: 1,
    borderColor: "rgba(249,115,22,0.2)",
    borderRadius: 16,
    padding: 14,
  },
  goalBannerTitle: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: Colors.accent,
    letterSpacing: 0.5,
  },
  goalBannerDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.7)",
    lineHeight: 18,
    marginTop: 2,
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
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  scoreValue: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  scoreLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  scoreServings: {
    fontSize: 12,
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
    paddingHorizontal: 14,
    paddingVertical: 14,
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
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
  },
  ingredientNameChecked: {
    textDecorationLine: "line-through",
    color: Colors.textTertiary,
  },
  ingredientAmount: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
  },
  stepRow: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
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
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.8)",
    lineHeight: 20,
  },
  stepTextDone: {
    textDecorationLine: "line-through",
    color: Colors.textTertiary,
  },
  benefitsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  benefitChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(34,197,94,0.08)",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.15)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  benefitText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.primary,
    flexShrink: 1,
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
    padding: 14,
  },
  swapTitle: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: Colors.accent,
    letterSpacing: 0.5,
  },
  swapDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.6)",
    lineHeight: 18,
    marginTop: 2,
  },
  stickyBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 14,
    backgroundColor: "rgba(28,43,30,0.95)",
    borderTopWidth: 1,
    borderTopColor: Colors.border,
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
