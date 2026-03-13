import { Feather, Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import Svg, { Circle, Text as SvgText } from "react-native-svg";

import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth";
import {
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
}: {
  recipe: RecipeObject;
  mealType: string;
  id: string;
  onRegenerate: () => void;
  isRegenerating: boolean;
}) {
  const iconName = mealIconMap[mealType.toLowerCase()] ?? "restaurant-outline";
  const isTreat = mealType === "treat";

  return (
    <Pressable
      onPress={() =>
        router.push({ pathname: "/recipe/[id]", params: { id: String(id) } })
      }
      style={({ pressed }) => [
        styles.recipeCard,
        isTreat && styles.treatCard,
        pressed && { transform: [{ scale: 0.97 }] },
      ]}
    >
      <View style={styles.recipeImageContainer}>
        {recipe.imageUrl ? (
          <Image
            source={{ uri: recipe.imageUrl }}
            style={styles.recipeImage}
            contentFit="cover"
          />
        ) : (
          <View style={[styles.recipeImage, styles.recipeImagePlaceholder]}>
            <Ionicons name="restaurant" size={32} color={Colors.textTertiary} />
          </View>
        )}
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.7)"]}
          style={styles.recipeImageOverlay}
        />
        <View style={styles.recipeTopRow}>
          <View style={[styles.mealBadge, isTreat && styles.treatBadge]}>
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
            {recipe.goalAlignment && (
              <View style={styles.goalTagBadge}>
                <Text style={styles.goalTagText} numberOfLines={1}>{recipe.goalAlignment}</Text>
              </View>
            )}
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

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { user } = useAuth();
  const [regeneratingMeal, setRegeneratingMeal] = useState<string | null>(null);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const todayDate = new Date().toISOString().split("T")[0];

  const {
    data: recipesData,
    isLoading: recipesLoading,
    refetch: refetchRecipes,
  } = useQuery({
    ...getGetTodayRecipesQueryOptions({ date: todayDate }),
  });

  const { data: streakData } = useQuery({
    ...getGetStreakQueryOptions(),
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

  const recipes = sortRecipesByMealOrder(recipesData?.recipes || []);

  const totalCals = recipes.reduce(
    (s, r) => s + (r.recipe.macros?.calories || 0),
    0
  );
  const totalProtein = recipes.reduce(
    (s, r) => s + (r.recipe.macros?.protein || 0),
    0
  );

  const getGreeting = useCallback(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const firstName = user?.firstName || "there";
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
              {getGreeting()}, {firstName}
            </Text>
          </View>
          {streak > 0 && (
            <View style={styles.streakBadge}>
              <Ionicons name="flame" size={22} color={Colors.accent} />
              <Text style={styles.streakValue}>{streak}d</Text>
              <Text style={styles.streakLabel}>streak</Text>
            </View>
          )}
        </View>

        <View style={styles.dailySummary}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryTitle}>Today&apos;s plan</Text>
            {recipes.length > 0 && (
              <Text style={styles.summaryReady}>
                {recipes.length} meals ready
              </Text>
            )}
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
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today&apos;s Recipes</Text>
          <Pressable onPress={() => refetchRecipes()}>
            <Text style={styles.regenerateText}>
              <Feather name="refresh-cw" size={13} color={Colors.primary} />{" "}
              Refresh
            </Text>
          </Pressable>
        </View>

        {recipesLoading ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.cardsRow}
          >
            <SkeletonCard />
            <SkeletonCard />
          </ScrollView>
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
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.cardsRow}
          >
            {recipes.map((r) => (
              <RecipeCard
                key={r.id}
                recipe={r.recipe}
                mealType={r.mealType}
                id={r.id}
                onRegenerate={() => handleRegenerate(r.mealType)}
                isRegenerating={regeneratingMeal === r.mealType}
              />
            ))}
          </ScrollView>
        )}

        <Pressable
          style={({ pressed }) => [
            styles.nutriAiButton,
            pressed && { transform: [{ scale: 0.98 }] },
          ]}
          onPress={() => refetchRecipes()}
        >
          <LinearGradient
            colors={[Colors.primary, "#16A34A"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.nutriAiGradient}
          >
            <Ionicons name="sparkles" size={20} color="#fff" />
            <Text style={styles.nutriAiText}>
              Regenerate today&apos;s meals
            </Text>
          </LinearGradient>
        </Pressable>
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
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  dateText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
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
    borderRadius: 16,
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
    marginHorizontal: 20,
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
  },
  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  summaryReady: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
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
    height: 6,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 3,
    overflow: "hidden",
  },
  calBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  proteinSummary: {
    alignItems: "center",
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
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  regenerateText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
  },
  cardsRow: {
    paddingHorizontal: 20,
    gap: 16,
    paddingBottom: 8,
  },
  recipeCard: {
    width: 280,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: Colors.card,
  },
  recipeImageContainer: {
    height: 170,
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
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  mealBadgeText: {
    fontSize: 11,
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
    fontSize: 11,
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
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    lineHeight: 20,
  },
  recipeMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  recipeMetaText: {
    fontSize: 11,
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
    paddingHorizontal: 14,
    paddingVertical: 10,
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
  nutriAiButton: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    overflow: "hidden",
  },
  nutriAiGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
  },
  nutriAiText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
});
