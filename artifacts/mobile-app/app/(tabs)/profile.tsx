import { Feather, Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";

import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth";
import { apiGet } from "@/lib/api";

interface ProfileData {
  id: number;
  dietType: string;
  healthGoal: string;
  skillLevel: string;
  caloriesTarget: number;
}

interface StreakData {
  currentStreak: number;
  longestStreak: number;
}

interface SavedRecipe {
  id: number;
  recipeJson: {
    title: string;
    macros: { calories: number; protein: number };
    imageUrl?: string;
  };
}

const milestones = [
  { days: 3, icon: "sprout" as const, label: "Sprout" },
  { days: 7, icon: "flame" as const, label: "On Fire" },
  { days: 14, icon: "flash" as const, label: "Charged" },
  { days: 30, icon: "trophy" as const, label: "Champion" },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<"stats" | "saved">("stats");

  const { data: profileData } = useQuery<ProfileData>({
    queryKey: ["profile"],
    queryFn: () => apiGet("/api/profile"),
  });

  const { data: streakData } = useQuery<StreakData>({
    queryKey: ["streak"],
    queryFn: () => apiGet("/api/streak"),
  });

  const { data: savedData } = useQuery<{ recipes: SavedRecipe[] }>({
    queryKey: ["savedRecipes"],
    queryFn: () => apiGet("/api/saved-recipes"),
  });

  const streak = streakData?.currentStreak || 0;
  const longestStreak = streakData?.longestStreak || 0;
  const savedRecipes = savedData?.recipes || [];

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
                    name={m.icon as any}
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
          {[
            { label: "Saved", value: String(savedRecipes.length), icon: "heart" },
            {
              label: "Target",
              value: profileData?.caloriesTarget
                ? `${profileData.caloriesTarget}`
                : "2000",
              icon: "target",
            },
            { label: "Skill", value: profileData?.skillLevel || "—", icon: "bar-chart-2" },
          ].map((stat) => (
            <View key={stat.label} style={styles.statCard}>
              <Feather
                name={stat.icon as any}
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
              savedRecipes.map((recipe) => (
                <Pressable
                  key={recipe.id}
                  onPress={() =>
                    router.push({
                      pathname: "/recipe/[id]",
                      params: { id: String(recipe.id) },
                    })
                  }
                  style={styles.savedCard}
                >
                  {recipe.recipeJson.imageUrl ? (
                    <Image
                      source={{ uri: recipe.recipeJson.imageUrl }}
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
                      {recipe.recipeJson.title}
                    </Text>
                    <Text style={styles.savedMeta}>
                      {recipe.recipeJson.macros.calories} kcal
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
