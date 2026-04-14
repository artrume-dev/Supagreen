import { Feather, Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
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
import { getMealHistory } from "@/features/profile/history";
import {
  getGetBillingStatusQueryOptions,
  getGetProfileQueryOptions,
  getGetStreakQueryOptions,
  getGetSavedRecipesQueryOptions,
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
  const { user, signOut, isLoading: authLoading } = useAuth();
  const handleSignOut = async () => {
    await signOut();
  };

  const [activeTab, setActiveTab] = useState<"stats" | "saved">("stats");
  const [historyDaysFilter, setHistoryDaysFilter] = useState<7 | 30 | 90>(30);
  const [historyGoalFilter, setHistoryGoalFilter] = useState<string>("all");
  const [historyView, setHistoryView] = useState<"list" | "calendar">("list");
  const [listDayIndex, setListDayIndex] = useState(0);
  const [calMonthOffset, setCalMonthOffset] = useState(0);
  const [calSelectedDate, setCalSelectedDate] = useState<string | null>(null);
  const swipeStartX = useRef(0);

  // Reset day index when filters change
  useEffect(() => { setListDayIndex(0); }, [historyDaysFilter, historyGoalFilter]);

  const { data: profileResponse } = useQuery({
    ...getGetProfileQueryOptions(),
    enabled: !authLoading && !!user,
  });

  const { data: streakData } = useQuery({
    ...getGetStreakQueryOptions(),
    enabled: !authLoading && !!user,
  });

  const { data: savedData } = useQuery({
    ...getGetSavedRecipesQueryOptions(),
    enabled: !authLoading && !!user,
  });

  const { data: mealHistoryData, isLoading: mealHistoryLoading } = useQuery({
    queryKey: ["mealHistory", historyDaysFilter],
    queryFn: () => getMealHistory(historyDaysFilter),
    staleTime: 5 * 60 * 1000,
    enabled: !authLoading && !!user,
  });

  const { data: billingData } = useQuery({
    ...getGetBillingStatusQueryOptions(),
    enabled: !authLoading && !!user,
    staleTime: 5 * 60 * 1000,
  });

  const profileData = profileResponse?.profile;
  const streak = streakData?.currentStreak || 0;
  const longestStreak = streakData?.longestStreak || 0;
  const savedRecipes = savedData?.recipes || [];
  const weekRecipes = (mealHistoryData?.days ?? [])
    .flatMap((day) =>
      day.recipes.map((recipe) => ({
        ...recipe,
        recipe: recipe.recipe as DailyRecipeItem["recipe"],
      })),
    )
    .map((entry) => ({
      id: entry.id,
      mealType: entry.mealType,
      date: entry.date,
      recipe: entry.recipe,
      wasRegenerated: entry.wasRegenerated,
    })) as DailyRecipeItem[];

  const displayName =
    user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : user?.firstName || "User";

  const userGoals = profileData?.healthGoal
    ? profileData.healthGoal.split(",").map((g) => g.trim()).filter(Boolean)
    : [];

  const goalLabel = userGoals.length > 0
    ? userGoals.map((g) => g.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())).join(", ")
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
            onPress={() => router.push("/onboarding?edit=1")}
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

        {/* Plan status card */}
        {billingData && (
          <View style={styles.planCard}>
            {billingData.plan === "lifetime" ? (
              <View style={styles.planCardInner}>
                <View style={[styles.planPill, styles.planPillPro]}>
                  <Feather name="check-circle" size={12} color={Colors.primary} />
                  <Text style={[styles.planPillText, { color: Colors.primary }]}>Pro · Lifetime</Text>
                </View>
                <Text style={styles.planCardDesc}>Full access, forever. Thank you!</Text>
              </View>
            ) : billingData.trialActive ? (
              <View style={styles.planCardInner}>
                <View style={[styles.planPill, styles.planPillTrial]}>
                  <Feather name="clock" size={12} color={Colors.primary} />
                  <Text style={[styles.planPillText, { color: Colors.primary }]}>
                    Trial · {Math.ceil(billingData.trialHoursLeft)}h left
                  </Text>
                </View>
                <Pressable onPress={() => router.push("/upgrade")} style={styles.planUpgradeBtn}>
                  <Text style={styles.planUpgradeBtnText}>Upgrade to Pro →</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.planCardInner}>
                <View style={[styles.planPill, styles.planPillExpired]}>
                  <Feather name="alert-circle" size={12} color="#FBBF24" />
                  <Text style={[styles.planPillText, { color: "#FBBF24" }]}>Trial ended</Text>
                </View>
                <Pressable onPress={() => router.push("/upgrade")} style={[styles.planUpgradeBtn, styles.planUpgradeBtnUrgent]}>
                  <Text style={styles.planUpgradeBtnText}>Unlock for £20 →</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

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

            <View style={styles.historyCard}>
              {/* Header */}
              <View style={styles.historyHeaderRow}>
                <Text style={styles.historyTitle}>Meal History</Text>
                <View style={styles.historyHeaderRight}>
                  <Text style={styles.historyCount}>{mealHistoryData?.totalMeals ?? 0} meals</Text>
                  <View style={styles.historyViewToggle}>
                    <Pressable
                      onPress={() => { setHistoryView("list"); setCalSelectedDate(null); }}
                      style={[styles.historyViewBtn, historyView === "list" && styles.historyViewBtnActive]}
                    >
                      <Feather name="list" size={13} color={historyView === "list" ? Colors.primary : Colors.textTertiary} />
                    </Pressable>
                    <Pressable
                      onPress={() => { setHistoryView("calendar"); setCalSelectedDate(null); }}
                      style={[styles.historyViewBtn, historyView === "calendar" && styles.historyViewBtnActive]}
                    >
                      <Feather name="calendar" size={13} color={historyView === "calendar" ? Colors.primary : Colors.textTertiary} />
                    </Pressable>
                  </View>
                </View>
              </View>

              {/* Day range filters */}
              <View style={styles.historyFilters}>
                {([7, 30, 90] as const).map((d) => (
                  <Pressable
                    key={d}
                    onPress={() => setHistoryDaysFilter(d)}
                    style={[styles.historyFilter, historyDaysFilter === d && styles.historyFilterActive]}
                  >
                    <Text style={[styles.historyFilterText, historyDaysFilter === d && styles.historyFilterTextActive]}>
                      {d}d
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Goal tabs */}
              {userGoals.length > 1 && (
                <View style={styles.historyGoalTabs}>
                  {(["all", ...userGoals] as string[]).map((g) => {
                    const label = g === "all" ? "All" : g.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
                    const active = historyGoalFilter === g;
                    return (
                      <Pressable
                        key={g}
                        onPress={() => setHistoryGoalFilter(g)}
                        style={[styles.historyGoalTab, active && styles.historyGoalTabActive]}
                      >
                        <Text style={[styles.historyGoalTabText, active && styles.historyGoalTabTextActive]}>{label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {mealHistoryLoading ? (
                <Text style={styles.historyLoadingText}>Loading meals…</Text>
              ) : (() => {
                const allDays = mealHistoryData?.days ?? [];
                const filteredDays = historyGoalFilter === "all"
                  ? allDays
                  : allDays.map((day) => ({
                      ...day,
                      recipes: day.recipes.filter((r) => (r.recipe as Record<string, unknown>).__goalKey === historyGoalFilter),
                    })).filter((day) => day.recipes.length > 0);

                if (filteredDays.length === 0) {
                  return <Text style={styles.historyLoadingText}>No meal history yet.</Text>;
                }

                // ── helper: render a single recipe row ──
                const renderRecipeRow = (item: typeof filteredDays[0]["recipes"][0]) => {
                  const json = item.recipe as Record<string, unknown>;
                  const displayMeal = typeof json.__baseMealType === "string" ? json.__baseMealType : item.mealType;
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => router.push({ pathname: "/recipe/[id]", params: { id: String(item.id) } })}
                      style={styles.historyRecipeRow}
                    >
                      <View style={styles.historyRecipeMain}>
                        <Text style={styles.historyRecipeTitle} numberOfLines={1}>
                          {item.recipe.emoji ?? "🍽"} {item.recipe.title ?? "Untitled recipe"}
                        </Text>
                        <Text style={styles.historyRecipeMeta}>{displayMeal} · {item.recipe.prepTime ?? 0} min</Text>
                      </View>
                      <Feather name="chevron-right" size={14} color={Colors.textTertiary} />
                    </Pressable>
                  );
                };

                // ── helper: render one day's recipe list (grouped by goal if "All") ──
                const renderDayRecipes = (day: typeof filteredDays[0]) => {
                  if (historyGoalFilter === "all" && userGoals.length > 1) {
                    const groups = new Map<string, typeof day.recipes>();
                    for (const r of day.recipes) {
                      const key = (typeof (r.recipe as Record<string, unknown>).__goalKey === "string")
                        ? (r.recipe as Record<string, unknown>).__goalKey as string
                        : "_canonical";
                      if (!groups.has(key)) groups.set(key, []);
                      groups.get(key)!.push(r);
                    }
                    return Array.from(groups.entries()).map(([groupKey, groupRecipes]) => (
                      <View key={groupKey}>
                        {groupKey !== "_canonical" && (
                          <View style={styles.historyGoalGroupRow}>
                            <View style={styles.historyGoalGroupDivider} />
                            <Text style={styles.historyGoalGroupLabel}>
                              {groupKey.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                            </Text>
                            <View style={styles.historyGoalGroupDivider} />
                          </View>
                        )}
                        {groupRecipes.map(renderRecipeRow)}
                      </View>
                    ));
                  }
                  return day.recipes.map(renderRecipeRow);
                };

                // ══════════════════════════════
                // CALENDAR VIEW
                // ══════════════════════════════
                if (historyView === "calendar") {
                  const recipeDateSet = new Set(filteredDays.map((d) => d.date));
                  const now = new Date();
                  const viewDate = new Date(now.getFullYear(), now.getMonth() + calMonthOffset, 1);
                  const year = viewDate.getFullYear();
                  const month = viewDate.getMonth();
                  const monthLabel = viewDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

                  const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7; // Mon=0
                  const daysInMonth = new Date(year, month + 1, 0).getDate();
                  const cells: (number | null)[] = [
                    ...Array(firstDayOfWeek).fill(null),
                    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
                  ];
                  const dayHeaders = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

                  const todayStr = new Date().toISOString().split("T")[0];

                  // Day detail drill-down
                  if (calSelectedDate) {
                    const dayData = filteredDays.find((d) => d.date === calSelectedDate);
                    const dateLabel = new Date(`${calSelectedDate}T00:00:00`).toLocaleDateString("en-US", {
                      weekday: "long", month: "long", day: "numeric",
                    });
                    return (
                      <View>
                        <Pressable onPress={() => setCalSelectedDate(null)} style={styles.calBackBtn}>
                          <Feather name="arrow-left" size={14} color={Colors.primary} />
                          <Text style={styles.calBackText}>Back to Calendar</Text>
                        </Pressable>
                        <Text style={styles.historyDayTitle}>{dateLabel.toUpperCase()}</Text>
                        {dayData ? renderDayRecipes(dayData) : (
                          <Text style={styles.historyLoadingText}>No meals recorded.</Text>
                        )}
                      </View>
                    );
                  }

                  return (
                    <View>
                      {/* Month nav */}
                      <View style={styles.calMonthNav}>
                        <Pressable onPress={() => setCalMonthOffset((o) => o - 1)} style={styles.calNavBtn}>
                          <Feather name="chevron-left" size={16} color={Colors.textSecondary} />
                        </Pressable>
                        <Text style={styles.calMonthLabel}>{monthLabel}</Text>
                        <Pressable
                          onPress={() => setCalMonthOffset((o) => Math.min(o + 1, 0))}
                          style={[styles.calNavBtn, calMonthOffset >= 0 && styles.calNavBtnDisabled]}
                          disabled={calMonthOffset >= 0}
                        >
                          <Feather name="chevron-right" size={16} color={calMonthOffset >= 0 ? Colors.textTertiary : Colors.textSecondary} />
                        </Pressable>
                      </View>

                      {/* Day-of-week headers */}
                      <View style={styles.calDayHeaders}>
                        {dayHeaders.map((h) => (
                          <Text key={h} style={styles.calDayHeader}>{h}</Text>
                        ))}
                      </View>

                      {/* Day grid */}
                      <View style={styles.calGrid}>
                        {cells.map((day, i) => {
                          if (!day) return <View key={`empty-${i}`} style={styles.calCell} />;
                          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                          const hasRecipes = recipeDateSet.has(dateStr);
                          const isToday = dateStr === todayStr;
                          const isFuture = dateStr > todayStr;
                          return (
                            <Pressable
                              key={dateStr}
                              onPress={() => hasRecipes && setCalSelectedDate(dateStr)}
                              style={[
                                styles.calCell,
                                isToday && styles.calCellToday,
                                hasRecipes && styles.calCellHasRecipes,
                              ]}
                            >
                              <Text style={[
                                styles.calDayNum,
                                isToday && styles.calDayNumToday,
                                isFuture && styles.calDayNumFuture,
                              ]}>
                                {day}
                              </Text>
                              {hasRecipes && (
                                <Feather name="coffee" size={9} color={Colors.primary} />
                              )}
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  );
                }

                // ══════════════════════════════
                // LIST VIEW — one day at a time with swipe
                // ══════════════════════════════
                const safeIndex = Math.min(listDayIndex, filteredDays.length - 1);
                const currentDay = filteredDays[safeIndex];
                const dateLabel = new Date(`${currentDay.date}T00:00:00`).toLocaleDateString("en-US", {
                  weekday: "short", month: "short", day: "numeric",
                });

                return (
                  <View
                    onTouchStart={(e) => { swipeStartX.current = e.nativeEvent.pageX; }}
                    onTouchEnd={(e) => {
                      const dx = e.nativeEvent.pageX - swipeStartX.current;
                      if (dx > 50 && safeIndex > 0) setListDayIndex(safeIndex - 1);
                      else if (dx < -50 && safeIndex < filteredDays.length - 1) setListDayIndex(safeIndex + 1);
                    }}
                  >
                    {/* Nav row */}
                    <View style={styles.listNavRow}>
                      <Pressable
                        onPress={() => setListDayIndex(safeIndex - 1)}
                        disabled={safeIndex === 0}
                        style={[styles.listNavBtn, safeIndex === 0 && styles.listNavBtnDisabled]}
                      >
                        <Feather name="chevron-left" size={16} color={safeIndex === 0 ? Colors.textTertiary : Colors.text} />
                      </Pressable>
                      <View style={styles.listNavCenter}>
                        <Text style={styles.historyDayTitle}>{dateLabel.toUpperCase()}</Text>
                        <Text style={styles.listNavCounter}>{safeIndex + 1} / {filteredDays.length}</Text>
                      </View>
                      <Pressable
                        onPress={() => setListDayIndex(safeIndex + 1)}
                        disabled={safeIndex === filteredDays.length - 1}
                        style={[styles.listNavBtn, safeIndex === filteredDays.length - 1 && styles.listNavBtnDisabled]}
                      >
                        <Feather name="chevron-right" size={16} color={safeIndex === filteredDays.length - 1 ? Colors.textTertiary : Colors.text} />
                      </Pressable>
                    </View>

                    {renderDayRecipes(currentDay)}
                  </View>
                );
              })()}
            </View>

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
              onPress={() => router.push("/onboarding?edit=1")}
              style={styles.editProfileButton}
            >
              <Feather name="edit-2" size={16} color={Colors.primary} />
              <Text style={styles.editProfileText}>Edit Preferences</Text>
            </Pressable>
          </View>
        )}

        <Pressable onPress={() => void handleSignOut()} style={styles.logoutButton}>
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
  historyCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  historyHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  historyHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  historyTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  historyCount: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  historyViewToggle: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 8,
    overflow: "hidden",
  },
  historyViewBtn: {
    padding: 6,
  },
  historyViewBtnActive: {
    backgroundColor: "rgba(34,197,94,0.15)",
  },
  historyFilters: {
    flexDirection: "row",
    gap: 8,
  },
  historyFilter: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  historyFilterActive: {
    backgroundColor: Colors.primary,
  },
  historyFilterText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: Colors.textSecondary,
  },
  historyFilterTextActive: {
    color: "#fff",
  },
  historyLoadingText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  historyDayBlock: {
    gap: 2,
    paddingTop: 4,
  },
  historyDayTitle: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: Colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  historyGoalTabs: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  historyGoalTab: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "transparent",
  },
  historyGoalTabActive: {
    backgroundColor: "rgba(34,197,94,0.15)",
    borderColor: "rgba(34,197,94,0.4)",
  },
  historyGoalTabText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
  historyGoalTabTextActive: {
    color: Colors.primary,
  },
  historyRecipeRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 2,
  },
  // List view navigation
  listNavRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  listNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.06)",
    justifyContent: "center",
    alignItems: "center",
  },
  listNavBtnDisabled: {
    opacity: 0.3,
  },
  listNavCenter: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  listNavCounter: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
  },
  // Calendar styles
  calMonthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  calNavBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.06)",
    justifyContent: "center",
    alignItems: "center",
  },
  calNavBtnDisabled: {
    opacity: 0.3,
  },
  calMonthLabel: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  calDayHeaders: {
    flexDirection: "row",
    marginBottom: 4,
  },
  calDayHeader: {
    flex: 1,
    textAlign: "center",
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textTertiary,
    paddingVertical: 4,
  },
  calGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  calCell: {
    width: "14.28%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    borderRadius: 8,
  },
  calCellToday: {
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.4)",
  },
  calCellHasRecipes: {
    backgroundColor: "rgba(34,197,94,0.08)",
  },
  calDayNum: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
  },
  calDayNumToday: {
    color: Colors.primary,
    fontFamily: "Inter_700Bold",
  },
  calDayNumFuture: {
    color: Colors.textTertiary,
  },
  calBackBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  calBackText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
  },
  historyRecipeMain: {
    flex: 1,
  },
  historyRecipeTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  historyRecipeMeta: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  historyGoalGroupRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
    marginBottom: 6,
  },
  historyGoalGroupDivider: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  historyGoalGroupLabel: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: Colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
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
  // Plan status card
  planCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.20)",
    backgroundColor: Colors.card,
    overflow: "hidden",
  },
  planCardInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  planCardDesc: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "right",
  },
  planPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  planPillPro: {
    backgroundColor: "rgba(34,197,94,0.12)",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.28)",
  },
  planPillTrial: {
    backgroundColor: "rgba(34,197,94,0.10)",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.25)",
  },
  planPillExpired: {
    backgroundColor: "rgba(251,191,36,0.10)",
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.28)",
  },
  planPillText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  planUpgradeBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  planUpgradeBtnUrgent: {
    backgroundColor: "#FBBF24",
  },
  planUpgradeBtnText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
});
