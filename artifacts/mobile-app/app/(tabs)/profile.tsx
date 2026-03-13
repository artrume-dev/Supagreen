import { Feather, Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import Svg, { Rect, Text as SvgText } from "react-native-svg";

import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth";
import {
  getGetProfileQueryOptions,
  getGetStreakQueryOptions,
  getGetSavedRecipesQueryOptions,
  getGetTodayRecipesQueryOptions,
  type DailyRecipeItem,
} from "@workspace/api-client-react";

type IoniconsName = ComponentProps<typeof Ionicons>["name"];
type FeatherName = ComponentProps<typeof Feather>["name"];

const milestones: { days: number; icon: IoniconsName; label: string }[] = [
  { days: 3, icon: "leaf", label: "Sprout" },
  { days: 7, icon: "flame", label: "On Fire" },
  { days: 14, icon: "flash", label: "Charged" },
  { days: 30, icon: "trophy", label: "Champion" },
];

const BAR_COLORS = [
  Colors.primary,
  "#4ADE80",
  Colors.accent,
  "#FB923C",
  Colors.blue,
  "#818CF8",
  Colors.primary,
];

function WeeklyMacroChart({ recipes }: { recipes: DailyRecipeItem[] }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split("T")[0];
  });

  const dayLabels = days.map((d) => {
    const date = new Date(d + "T12:00:00");
    return date.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 2);
  });

  const dailyCals = days.map((date) => {
    const dayRecipes = recipes.filter((r) => r.date.startsWith(date));
    return dayRecipes.reduce((s, r) => s + (r.recipe.macros?.calories || 0), 0);
  });

  const maxCal = Math.max(...dailyCals, 1);
  const chartH = 100;
  const barW = 24;
  const gap = 12;
  const chartW = days.length * (barW + gap);

  return (
    <View style={chartStyles.container}>
      <Text style={chartStyles.title}>Weekly Calories</Text>
      <Svg width={chartW} height={chartH + 20} viewBox={`0 0 ${chartW} ${chartH + 20}`}>
        {dailyCals.map((cal, i) => {
          const h = maxCal > 0 ? (cal / maxCal) * chartH : 0;
          const x = i * (barW + gap);
          return (
            <React.Fragment key={i}>
              <Rect
                x={x}
                y={chartH - h}
                width={barW}
                height={Math.max(h, 2)}
                rx={6}
                fill={BAR_COLORS[i % BAR_COLORS.length]}
                opacity={cal > 0 ? 1 : 0.2}
              />
              <SvgText
                x={x + barW / 2}
                y={chartH + 14}
                textAnchor="middle"
                fontSize={9}
                fill={Colors.textTertiary}
              >
                {dayLabels[i]}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}

const chartStyles = StyleSheet.create({
  container: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    gap: 12,
  },
  title: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    alignSelf: "flex-start",
  },
});

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<"stats" | "saved">("stats");

  const { data: profileResponse } = useQuery({
    ...getGetProfileQueryOptions(),
  });

  const { data: streakData } = useQuery({
    ...getGetStreakQueryOptions(),
  });

  const { data: savedData } = useQuery({
    ...getGetSavedRecipesQueryOptions(),
  });

  const { data: weekRecipesData } = useQuery({
    queryKey: ["weekRecipes"],
    queryFn: async () => {
      const { getTodayRecipes } = await import("@workspace/api-client-react");
      const promises = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const dateStr = d.toISOString().split("T")[0];
        return getTodayRecipes({ date: dateStr })
          .then((r) => r.recipes || [])
          .catch(() => [] as DailyRecipeItem[]);
      });
      const allRecipes = (await Promise.all(promises)).flat();
      return { recipes: allRecipes };
    },
    staleTime: 5 * 60 * 1000,
  });

  const profileData = profileResponse?.profile;
  const streak = streakData?.currentStreak || 0;
  const longestStreak = streakData?.longestStreak || 0;
  const savedRecipes = savedData?.recipes || [];
  const weekRecipes = weekRecipesData?.recipes || [];

  const displayName =
    user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : user?.firstName || "User";

  const goalLabel = profileData?.healthGoal
    ? profileData.healthGoal
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase())
    : "Not set";

  const dietLabel = profileData?.dietType
    ? profileData.dietType
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase())
    : "Not set";

  const statsItems: { label: string; value: string; icon: FeatherName }[] = [
    { label: "Saved", value: String(savedRecipes.length), icon: "heart" },
    {
      label: "Target",
      value: profileData?.caloriesTarget
        ? `${profileData.caloriesTarget}`
        : "2000",
      icon: "target",
    },
    {
      label: "Skill",
      value: profileData?.skillLevel
        ? profileData.skillLevel.charAt(0).toUpperCase() + profileData.skillLevel.slice(1)
        : "—",
      icon: "bar-chart-2",
    },
  ];

  return (
    <View style={[styles.container, { paddingTop: isWeb ? 67 : insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{displayName}</Text>
            <Text style={styles.meta}>
              {goalLabel} {dietLabel !== "Not set" ? `\u00B7 ${dietLabel}` : ""}
            </Text>
          </View>
          <Pressable
            onPress={() => router.push("/onboarding")}
            style={styles.settingsBtn}
          >
            <Feather name="settings" size={20} color={Colors.textSecondary} />
          </Pressable>
        </View>

        <View style={styles.streakHero}>
          <LinearGradient
            colors={["rgba(28,43,30,1)", Colors.background]}
            style={styles.streakGradient}
          >
            <View style={styles.streakAvatarSection}>
              <View style={styles.avatarContainer}>
                {user?.profileImageUrl ? (
                  <Image
                    source={{ uri: user.profileImageUrl }}
                    style={styles.avatar}
                    contentFit="cover"
                  />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <Feather name="user" size={28} color={Colors.textSecondary} />
                  </View>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.streakValueRow}>
                  <Ionicons name="flame" size={28} color={Colors.accent} />
                  <Text style={styles.streakNumber}>{streak}</Text>
                  <Text style={styles.streakDayLabel}>day streak</Text>
                </View>
                <Text style={styles.longestText}>
                  Longest: {longestStreak} days
                </Text>
                <View style={styles.streakDots}>
                  {Array.from({ length: Math.min(streak, 30) }).map((_, i) => (
                    <View key={i} style={styles.streakDot} />
                  ))}
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>

        <View style={styles.milestonesSection}>
          <Text style={styles.sectionTitle}>Milestones</Text>
          <View style={styles.milestonesRow}>
            {milestones.map((m) => {
              const achieved = streak >= m.days;
              return (
                <View
                  key={m.days}
                  style={[
                    styles.milestoneCard,
                    achieved && styles.milestoneCardActive,
                    !achieved && styles.milestoneCardInactive,
                  ]}
                >
                  <Ionicons
                    name={m.icon}
                    size={24}
                    color={achieved ? Colors.primary : Colors.textTertiary}
                  />
                  <Text
                    style={[
                      styles.milestoneDays,
                      achieved && { color: Colors.text },
                    ]}
                  >
                    {m.days}d
                  </Text>
                  <Text style={styles.milestoneLabel}>{m.label}</Text>
                  {achieved && <View style={styles.milestoneDot} />}
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.statsStrip}>
          {statsItems.map((stat) => (
            <View key={stat.label} style={styles.statCard}>
              <Feather
                name={stat.icon}
                size={18}
                color={Colors.primary}
              />
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.tabRow}>
          <Pressable
            onPress={() => setActiveTab("stats")}
            style={[
              styles.tabButton,
              activeTab === "stats" && styles.tabButtonActive,
            ]}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "stats" && styles.tabTextActive,
              ]}
            >
              Overview
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab("saved")}
            style={[
              styles.tabButton,
              activeTab === "saved" && styles.tabButtonActive,
            ]}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "saved" && styles.tabTextActive,
              ]}
            >
              Saved Recipes
            </Text>
          </Pressable>
        </View>

        {activeTab === "saved" ? (
          <View style={styles.savedList}>
            {savedRecipes.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather
                  name="bookmark"
                  size={36}
                  color={Colors.textTertiary}
                />
                <Text style={styles.emptyTitle}>No saved recipes</Text>
                <Text style={styles.emptyDesc}>
                  Save recipes you love from the detail page
                </Text>
              </View>
            ) : (
              savedRecipes.map((sr) => (
                <Pressable
                  key={sr.id}
                  onPress={() =>
                    router.push({
                      pathname: "/recipe/[id]",
                      params: { id: String(sr.id) },
                    })
                  }
                  style={styles.savedCard}
                >
                  {sr.recipe.imageUrl ? (
                    <Image
                      source={{ uri: sr.recipe.imageUrl }}
                      style={styles.savedImage}
                      contentFit="cover"
                    />
                  ) : (
                    <View
                      style={[styles.savedImage, styles.savedImagePlaceholder]}
                    >
                      <Ionicons
                        name="restaurant"
                        size={20}
                        color={Colors.textTertiary}
                      />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.savedTitle}>
                      {sr.recipe.title}
                    </Text>
                    <Text style={styles.savedMeta}>
                      {sr.recipe.macros?.calories ?? 0} kcal
                    </Text>
                  </View>
                  <View style={styles.savedHeart}>
                    <Ionicons name="heart" size={18} color={Colors.primary} />
                  </View>
                </Pressable>
              ))
            )}
          </View>
        ) : (
          <View style={styles.overviewSection}>
            <WeeklyMacroChart recipes={weekRecipes} />

            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Feather name="target" size={16} color={Colors.primary} />
                <Text style={styles.infoLabel}>Health Goal</Text>
                <Text style={styles.infoValue}>{goalLabel}</Text>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <Feather name="heart" size={16} color={Colors.accent} />
                <Text style={styles.infoLabel}>Diet Type</Text>
                <Text style={styles.infoValue}>{dietLabel}</Text>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <Feather name="bar-chart-2" size={16} color={Colors.blue} />
                <Text style={styles.infoLabel}>Skill Level</Text>
                <Text style={styles.infoValue}>
                  {profileData?.skillLevel
                    ? profileData.skillLevel.charAt(0).toUpperCase() +
                      profileData.skillLevel.slice(1)
                    : "Not set"}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={() => router.push("/onboarding")}
              style={styles.editProfileButton}
            >
              <Feather name="edit-2" size={16} color={Colors.primary} />
              <Text style={styles.editProfileText}>Edit Preferences</Text>
            </Pressable>
          </View>
        )}

        <Pressable onPress={signOut} style={styles.logoutButton}>
          <Feather name="log-out" size={16} color={Colors.error} />
          <Text style={styles.logoutText}>Sign Out</Text>
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
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  name: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  meta: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.card,
    justifyContent: "center",
    alignItems: "center",
  },
  streakHero: {
    marginHorizontal: 20,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 20,
  },
  streakGradient: {
    padding: 20,
  },
  streakAvatarSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    backgroundColor: Colors.cardLight,
    justifyContent: "center",
    alignItems: "center",
  },
  streakValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  streakNumber: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  streakDayLabel: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginLeft: 2,
  },
  longestText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  streakDots: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 3,
    marginTop: 8,
  },
  streakDot: {
    width: 8,
    height: 8,
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },
  milestonesSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginBottom: 12,
  },
  milestonesRow: {
    flexDirection: "row",
    gap: 10,
  },
  milestoneCard: {
    flex: 1,
    alignItems: "center",
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  milestoneCardActive: {
    backgroundColor: "rgba(34,197,94,0.1)",
    borderColor: "rgba(34,197,94,0.3)",
  },
  milestoneCardInactive: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    opacity: 0.4,
  },
  milestoneDays: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: Colors.textSecondary,
  },
  milestoneLabel: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
  },
  milestoneDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  statsStrip: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
  },
  tabRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: Colors.card,
  },
  tabButtonActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: "#fff",
  },
  savedList: {
    paddingHorizontal: 20,
    gap: 10,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    marginTop: 8,
  },
  emptyDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
  },
  savedCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 12,
  },
  savedImage: {
    width: 56,
    height: 56,
    borderRadius: 14,
  },
  savedImagePlaceholder: {
    backgroundColor: Colors.cardLight,
    justifyContent: "center",
    alignItems: "center",
  },
  savedTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  savedMeta: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  savedHeart: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(34,197,94,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  overviewSection: {
    paddingHorizontal: 20,
    gap: 12,
  },
  infoCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 4,
  },
  infoLabel: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  infoDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 10,
  },
  editProfileButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(34,197,94,0.1)",
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.2)",
  },
  editProfileText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 20,
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.2)",
  },
  logoutText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.error,
  },
});
