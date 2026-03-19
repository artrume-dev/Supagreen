import { Feather, Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Svg, { Circle, Text as SvgText } from "react-native-svg";

import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth";
import { getTodayDateString } from "@/features/common/date";
import { getTodayRecipesByGoal, regenerateDailyMenu } from "@/features/home/api";
import { getRecipeDetailCacheKey, type CachedRecipeDetail } from "@/features/home/recipeDetailCache";
import {
  getGetProfileQueryOptions,
  getGetTodayRecipesQueryOptions,
  getGetStreakQueryOptions,
  useRegenerateRecipe,
  type DailyRecipeItem,
  type RecipeObject,
} from "@workspace/api-client-react";

type IoniconsName = ComponentProps<typeof Ionicons>["name"];

const mealIconMap: Record<string, IoniconsName> = {
  breakfast: "sunny-outline",
  lunch: "restaurant-outline",
  dinner: "moon-outline",
  treat: "ice-cream-outline",
};

const MEAL_ORDER: Record<string, number> = { breakfast: 0, lunch: 1, dinner: 2, treat: 3 };

function sortRecipesByMealOrder(recipes: DailyRecipeItem[]): DailyRecipeItem[] {
  return [...recipes].sort((a, b) => (MEAL_ORDER[a.mealType] ?? 99) - (MEAL_ORDER[b.mealType] ?? 99));
}

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

function MacroRing({
  value,
  max,
  color,
  label,
}: {
  value: number;
  max: number;
  color: string;
  label: string;
}) {
  const pct = Math.min(value / max, 1);
  const r = 18;
  const circ = 2 * Math.PI * r;
  const dash = pct * circ;

  return (
    <View style={{ alignItems: "center", gap: 2 }}>
      <Svg width={44} height={44} viewBox="0 0 44 44">
        <Circle
          cx={22}
          cy={22}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={4}
        />
        <Circle
          cx={22}
          cy={22}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={4}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          rotation={-90}
          origin="22,22"
        />
        <SvgText
          x={22}
          y={26}
          textAnchor="middle"
          fontSize={9}
          fill="white"
          fontWeight="600"
        >
          {value}g
        </SvgText>
      </Svg>
      <Text style={styles.macroLabel}>{label}</Text>
    </View>
  );
}

function RecipeCard({
  recipe,
  mealType,
  id,
  onRegenerate,
  isRegenerating,
  showSwap = true,
}: {
  recipe: RecipeObject;
  mealType: string;
  id: string;
  onRegenerate: () => void;
  isRegenerating: boolean;
  showSwap?: boolean;
}) {
  const queryClient = useQueryClient();
  const normalizedMealType = mealType.toLowerCase();
  const iconName = mealIconMap[normalizedMealType] ?? "restaurant-outline";
  const isTreat = normalizedMealType === "treat";
  const mealBadgeBg =
    normalizedMealType === "breakfast"
      ? "rgba(249,115,22,0.72)"
      : normalizedMealType === "lunch"
        ? "rgba(59,130,246,0.72)"
        : normalizedMealType === "dinner"
          ? "rgba(99,102,241,0.72)"
          : "rgba(34,197,94,0.62)";
  const fallbackImg = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80";
  const imageSource = recipe.imageUrl || fallbackImg;

  return (
    <Pressable
      onPress={() => {
        const cacheId = String(id);
        const cachedDetail: CachedRecipeDetail = {
          id: cacheId,
          mealType,
          recipe,
          date: new Date().toISOString(),
        };
        queryClient.setQueryData(getRecipeDetailCacheKey(cacheId), cachedDetail);
        router.push({ pathname: "/recipe/[id]", params: { id: cacheId } });
      }}
      style={({ pressed }) => [
        styles.recipeCard,
        isTreat && styles.treatCard,
        pressed && { transform: [{ scale: 0.97 }] },
      ]}
    >
      <View style={styles.recipeImageContainer}>
        <Image
          source={{ uri: imageSource }}
          style={styles.recipeImage}
          contentFit="cover"
        />
        <LinearGradient
          colors={["rgba(0,0,0,0.15)", "rgba(0,0,0,0.85)"]}
          style={styles.recipeImageOverlay}
        />
        <View style={styles.recipeTopRow}>
          <View style={[styles.mealBadge, { backgroundColor: mealBadgeBg }, isTreat && styles.treatBadge]}>
            <Ionicons
              name={iconName}
              size={12}
              color="#fff"
            />
            <Text style={styles.mealBadgeText}>{mealType}</Text>
          </View>
          <View style={styles.scoreBadge}>
            <Feather name="star" size={10} color="#fff" />
            <Text style={styles.scoreText}>{recipe.healthScore}</Text>
          </View>
        </View>
        <View style={styles.recipeBottomRow}>
          <Text style={styles.recipeTitle} numberOfLines={2}>
            {recipe.title}
          </Text>
          <View style={styles.recipeMetaRow}>
            <Feather name="clock" size={12} color="rgba(255,255,255,0.7)" />
            <Text style={styles.recipeMetaText}>{recipe.prepTime} min</Text>
            <View style={styles.goalTagBadge}>
              <Text style={styles.goalTagText} numberOfLines={1}>
                {(recipe.macros?.protein ?? 0)}g protein
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.macroRow}>
        <View style={styles.macroRings}>
          <MacroRing
            value={recipe.macros?.protein ?? 0}
            max={60}
            color={Colors.primary}
            label="Protein"
          />
          <MacroRing
            value={recipe.macros?.carbs ?? 0}
            max={100}
            color={Colors.accent}
            label="Carbs"
          />
          <MacroRing
            value={recipe.macros?.fat ?? 0}
            max={60}
            color={Colors.blue}
            label="Fat"
          />
        </View>
        <View style={styles.calSection}>
          <Text style={styles.calValue}>{recipe.macros?.calories ?? 0}</Text>
          <Text style={styles.calUnit}>kcal</Text>
          {showSwap ? (
            <Pressable
              onPress={(e) => { e.stopPropagation(); onRegenerate(); }}
              disabled={isRegenerating}
              style={styles.swapButton}
            >
              <Feather name="refresh-cw" size={12} color={Colors.primary} />
              <Text style={styles.swapButtonText}>
                {isRegenerating ? "..." : "Swap"}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

function ShimmerBlock({ width, height, borderRadius = 8 }: { width: number | string; height: number; borderRadius?: number }) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });

  return (
    <Animated.View
      style={{
        width: width as number,
        height,
        borderRadius,
        backgroundColor: Colors.cardLight,
        opacity,
      }}
    />
  );
}

function SkeletonCard() {
  return (
    <View style={styles.recipeCard}>
      <ShimmerBlock width="100%" height={160} borderRadius={0} />
      <View style={{ padding: 14, gap: 10 }}>
        <ShimmerBlock width={140} height={16} />
        <ShimmerBlock width={200} height={12} />
        <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
          <ShimmerBlock width={50} height={24} borderRadius={12} />
          <ShimmerBlock width={50} height={24} borderRadius={12} />
          <ShimmerBlock width={50} height={24} borderRadius={12} />
        </View>
      </View>
    </View>
  );
}

function CookingLoadingAnimation() {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const dotsAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const progressLoop = Animated.loop(
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 1300,
        useNativeDriver: true,
      }),
    );

    const dotsLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(dotsAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(dotsAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]),
    );

    progressLoop.start();
    dotsLoop.start();
    return () => {
      progressLoop.stop();
      dotsLoop.stop();
    };
  }, [progressAnim, dotsAnim]);

  const barTranslate = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-220, 220],
  });
  const dot1 = dotsAnim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] });
  const dot2 = dotsAnim.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] });
  const dot3 = dotsAnim.interpolate({ inputRange: [0, 1], outputRange: [0.1, 1] });

  return (
    <View style={styles.loadingSection}>
      <View style={styles.cookingCard}>
        <View style={styles.cookingRow}>
          <View style={styles.cookingIconWrap}>
            <Feather name="coffee" size={16} color={Colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cookingTitle}>Cooking your menu</Text>
            <View style={styles.cookingSubRow}>
              <Text style={styles.cookingDesc}>Seasonal recipes are being prepared</Text>
              <View style={styles.loadingDots}>
                <Animated.View style={[styles.loadingDot, { opacity: dot1 }]} />
                <Animated.View style={[styles.loadingDot, { opacity: dot2 }]} />
                <Animated.View style={[styles.loadingDot, { opacity: dot3 }]} />
              </View>
            </View>
          </View>
        </View>
        <View style={styles.loadingBarTrack}>
          <Animated.View
            style={[
              styles.loadingBarFill,
              { transform: [{ translateX: barTranslate }] },
            ]}
          />
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.cardsRow}
      >
        <SkeletonCard />
        <SkeletonCard />
      </ScrollView>
    </View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { user, token } = useAuth();
  // On native, wait for token so API requests don't hit requireAuth without auth header
  const canFetch = !!user && (isWeb || !!token);
  const [regeneratingMeal, setRegeneratingMeal] = useState<string | null>(null);
  const [isRegeneratingMenu, setIsRegeneratingMenu] = useState(false);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const todayDate = getTodayDateString();

  const {
    data: recipesData,
    isLoading: recipesLoading,
    refetch: refetchRecipes,
  } = useQuery({
    ...getGetTodayRecipesQueryOptions({ date: todayDate }),
    enabled: canFetch,
  });

  const { data: streakData } = useQuery({
    ...getGetStreakQueryOptions(),
    enabled: canFetch,
  });

  const { data: profileData } = useQuery({
    ...getGetProfileQueryOptions(),
    enabled: canFetch,
  });

  const { mutateAsync: regenerate } = useRegenerateRecipe();

  const handleRegenerate = useCallback(async (mealType: string) => {
    setRegeneratingMeal(mealType);
    try {
      await regenerate({ data: { mealType, date: todayDate } });
      await refetchRecipes();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "You may have reached your daily limit.";
      Alert.alert("Could not swap recipe", message);
    } finally {
      setRegeneratingMeal(null);
    }
  }, [regenerate, todayDate, refetchRecipes]);

  const handleRegenerateMenu = useCallback(async () => {
    setIsRegeneratingMenu(true);
    try {
      await regenerateDailyMenu(todayDate);
      await refetchRecipes();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Please try again.";
      Alert.alert("Menu refresh failed", message);
    } finally {
      setIsRegeneratingMenu(false);
    }
  }, [todayDate, refetchRecipes]);

  const recipes = sortRecipesByMealOrder(recipesData?.recipes ?? []);
  const selectedGoals = parseGoalList(profileData?.profile?.healthGoal);
  const hasMultipleGoals = selectedGoals.length > 1;

  const { data: goalSectionsData, isLoading: goalSectionsLoading } = useQuery({
    queryKey: ["today-recipes-by-goal", todayDate, selectedGoals.join(",")],
    queryFn: () => getTodayRecipesByGoal(todayDate),
    enabled: !!user && hasMultipleGoals,
    staleTime: 60 * 1000,
  });

  const totalCals = recipes.reduce(
    (s, r) => s + (r.recipe.macros?.calories || 0),
    0
  );
  const totalProtein = recipes.reduce(
    (s, r) => s + (r.recipe.macros?.protein || 0),
    0
  );

  const getGreeting = useCallback(() => {
    return "Hello";
  }, []);

  const firstName = user?.firstName || "Chef";
  const streak = streakData?.currentStreak || 0;
  const calPct = Math.min((totalCals / 2000) * 100, 100);

  return (
    <View style={[styles.container, { paddingTop: isWeb ? 67 : insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={styles.headerSection}>
          <View style={{ flex: 1 }}>
            <Text style={styles.dateText}>{today}</Text>
            <Text style={styles.greeting}>
              {getGreeting()}, {firstName}{"\u{1F44B}"}
            </Text>
          </View>
          {streak > 0 && (
            <View style={styles.streakBadge}>
              <Ionicons name="flame" size={22} color={Colors.accent} />
              <Text style={styles.streakValue}>{streak}</Text>
              <Text style={styles.streakLabel}>streak</Text>
            </View>
          )}
        </View>

        <LinearGradient
          colors={[Colors.card, Colors.background]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.dailySummary}
        >
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryTitle}>Today&apos;s Nutrition</Text>
            <View style={styles.summaryReadyPill}>
              <Feather name="coffee" size={11} color={Colors.primary} />
              <Text style={styles.summaryReady}>{recipes.length} Meals Set</Text>
            </View>
          </View>
          <View style={styles.summaryContent}>
            <View style={{ flex: 1 }}>
              <View style={styles.calHeaderRow}>
                <Text style={styles.calHeaderLabel}>Calories</Text>
                <Text style={styles.calHeaderValue}>
                  {totalCals} / 2000
                </Text>
              </View>
              <View style={styles.calBar}>
                <LinearGradient
                  colors={[Colors.primary, Colors.accent]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[
                    styles.calBarFill,
                    { width: `${calPct}%` },
                  ]}
                />
              </View>
            </View>
            <View style={styles.proteinSummary}>
              <Text style={styles.proteinValue}>{totalProtein}g</Text>
              <Text style={styles.proteinLabel}>protein</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Menu</Text>
          <View style={styles.menuActions}>
            <Pressable
              onPress={handleRegenerateMenu}
              disabled={isRegeneratingMenu}
              style={({ pressed }) => [
                styles.regenMiniBtn,
                isRegeneratingMenu && { opacity: 0.7 },
                pressed && { transform: [{ scale: 0.98 }] },
              ]}
            >
              {isRegeneratingMenu ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Feather name="refresh-cw" size={12} color={Colors.primary} />
              )}
              <Text style={styles.regenMiniText}>Regenerate Rare Menu</Text>
            </Pressable>
            <Ionicons name="sparkles-outline" size={18} color={Colors.primary} />
          </View>
        </View>

        {(recipesLoading || isRegeneratingMenu || (hasMultipleGoals && goalSectionsLoading)) ? (
          <CookingLoadingAnimation />
        ) : recipes.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="book-open" size={40} color={Colors.textTertiary} />
            <Text style={styles.emptyTitle}>No recipes yet</Text>
            <Text style={styles.emptyDesc}>
              Complete onboarding to generate your daily recipes
            </Text>
            <Pressable
              onPress={() => router.push("/onboarding")}
              style={styles.emptyButton}
            >
              <Text style={styles.emptyButtonText}>Set up profile</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {(hasMultipleGoals
              ? goalSectionsData?.sections.map((section) => section.goal) ?? selectedGoals
              : ["daily-menu"]).map((goalKey) => (
              <View key={goalKey} style={styles.goalSection}>
                {goalKey !== "daily-menu" ? (
                  <Text style={styles.goalSectionTitle}>{formatGoalLabel(goalKey)}</Text>
                ) : null}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.cardsRow}
                >
                  {(hasMultipleGoals
                    ? (
                        goalSectionsData?.sections.find((section) => section.goal === goalKey)
                          ?.recipes ?? []
                      ).map((r) => ({
                        id: r.id,
                        mealType: r.mealType,
                        recipe: r.recipe as RecipeObject,
                      }))
                    : recipes
                  ).map((r) => (
                    <RecipeCard
                      key={`${goalKey}-${r.id}`}
                      recipe={r.recipe}
                      mealType={r.mealType}
                      id={r.id}
                      onRegenerate={() => handleRegenerate(r.mealType)}
                      isRegenerating={regeneratingMeal === r.mealType}
                      showSwap={!hasMultipleGoals}
                    />
                  ))}
                </ScrollView>
              </View>
            ))}
          </>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  headerSection: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
  },
  dateText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: Colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  greeting: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginTop: 2,
  },
  streakBadge: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  streakValue: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.accent,
  },
  streakLabel: {
    fontSize: 9,
    fontFamily: "Inter_500Medium",
    color: Colors.textTertiary,
  },
  dailySummary: {
    marginHorizontal: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
    padding: 20,
    marginBottom: 22,
  },
  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  summaryReadyPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(34,197,94,0.12)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  summaryReady: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: Colors.primary,
    textTransform: "uppercase",
  },
  summaryContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  calHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  calHeaderLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  calHeaderValue: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  calBar: {
    height: 8,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    overflow: "hidden",
  },
  calBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  proteinSummary: {
    alignItems: "center",
    borderLeftWidth: 1,
    borderLeftColor: "rgba(255,255,255,0.1)",
    paddingLeft: 14,
  },
  proteinValue: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  proteinLabel: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 34 / 2,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  menuActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  regenMiniBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.35)",
    backgroundColor: "rgba(34,197,94,0.12)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  regenMiniText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: Colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  regenerateText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
  },
  cardsRow: {
    paddingHorizontal: 24,
    gap: 18,
    paddingTop: 6,
    paddingBottom: 14,
  },
  goalSection: {
    marginBottom: 10,
  },
  goalSectionTitle: {
    paddingHorizontal: 24,
    marginTop: 2,
    marginBottom: 2,
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: Colors.primary,
    textTransform: "capitalize",
    letterSpacing: 0.3,
  },
  loadingSection: {
    gap: 14,
    paddingBottom: 8,
  },
  cookingCard: {
    marginHorizontal: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(37,58,41,0.6)",
    padding: 16,
    gap: 10,
  },
  cookingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cookingIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.5)",
    backgroundColor: "rgba(34,197,94,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  cookingTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  cookingSubRow: {
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  cookingDesc: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  loadingDots: {
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
  },
  loadingDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  loadingBarTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  loadingBarFill: {
    width: 120,
    height: "100%",
    borderRadius: 2,
    backgroundColor: Colors.primary,
    opacity: 0.9,
  },
  recipeCard: {
    width: 296,
    borderRadius: 32,
    overflow: "hidden",
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  recipeImageContainer: {
    height: 204,
    position: "relative",
  },
  recipeImage: {
    width: "100%",
    height: "100%",
  },
  recipeImagePlaceholder: {
    backgroundColor: Colors.cardLight,
    justifyContent: "center",
    alignItems: "center",
  },
  recipeImageOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  recipeTopRow: {
    position: "absolute",
    top: 10,
    left: 10,
    right: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  mealBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  mealBadgeText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
    textTransform: "capitalize",
  },
  scoreBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  scoreText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  recipeBottomRow: {
    position: "absolute",
    bottom: 10,
    left: 10,
    right: 10,
  },
  recipeTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    lineHeight: 26,
  },
  recipeMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  recipeMetaText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.7)",
  },
  goalTagBadge: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    maxWidth: 120,
  },
  goalTagText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  macroRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
  },
  macroRings: {
    flexDirection: "row",
    gap: 10,
  },
  macroLabel: {
    fontSize: 9,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  calSection: {
    alignItems: "flex-end",
  },
  calValue: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  calUnit: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  swapButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  swapButtonText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
  },
  treatCard: {
    borderWidth: 1,
    borderColor: "rgba(236,72,153,0.3)",
  },
  treatBadge: {
    backgroundColor: "rgba(236,72,153,0.4)",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 32,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    marginTop: 8,
  },
  emptyDesc: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  emptyButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 12,
  },
  emptyButtonText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
});
