import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";

import Colors from "@/constants/colors";
import { getStoredToken, getSyncToken, useAuth } from "@/lib/auth";
import {
  getGetProfileQueryKey,
  getGetTodayRecipesQueryKey,
  getGetTodayRecipesQueryOptions,
  updateProfile,
} from "@workspace/api-client-react";
import { getTodayDateString } from "@/features/common/date";
import {
  clearPendingOnboardingProfile,
  getPendingOnboardingProfile,
} from "@/lib/onboardingAuth";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&q=80";

const STATS = [
  { value: "50k+", label: "Users" },
  { value: "4.9★", label: "Rating" },
  { value: "2.1M", label: "Recipes" },
];

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const { signIn, token, isAuthenticated, isLoading: authLoading } = useAuth();
  const params = useLocalSearchParams<{ postOnboarding?: string }>();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [mealReady, setMealReady] = useState<Record<string, boolean>>({
    breakfast: false,
    lunch: false,
    dinner: false,
    treat: false,
  });
  const finalizationStartedRef = useRef(false);
  const checklistTimersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 52 : Math.max(insets.top, 20);
  const bottomPad = isWeb ? 34 : Math.max(insets.bottom, 20) + 12;
  const fromOnboarding = params.postOnboarding === "1";
  const mealOrder = useMemo(() => ["breakfast", "lunch", "dinner", "treat"], []);

  useEffect(() => {
    return () => {
      for (const timer of checklistTimersRef.current) {
        clearTimeout(timer);
      }
      checklistTimersRef.current = [];
    };
  }, []);

  const finalizeAfterAuth = useCallback(async () => {
    setIsFinalizing(true);
    // Wait for token (AsyncStorage can lag briefly after signIn)
    let t: string | null = (await getStoredToken()) ?? token ?? getSyncToken();
    for (let i = 0; !t && i < 5; i++) {
      await new Promise((r) => setTimeout(r, 80));
      t = (await getStoredToken()) ?? token ?? getSyncToken();
    }
    const authHeaders = t
      ? { Authorization: `Bearer ${t}` }
      : undefined;
    const pending = await getPendingOnboardingProfile();
    if (!pending) {
      setIsFinalizing(false);
      router.replace("/(tabs)");
      return;
    }

    try {
      const updatedProfile = await updateProfile({
        dietType: pending.dietType,
        allergies: pending.allergies,
        healthGoal: pending.healthGoal,
        skillLevel: pending.skillLevel,
        caloriesTarget: pending.caloriesTarget,
        city: pending.city,
        country: pending.country,
        lat: pending.lat,
        lng: pending.lng,
      }, authHeaders ? { headers: authHeaders } : undefined);
      queryClient.setQueryData(getGetProfileQueryKey(), updatedProfile);
      const profile = updatedProfile?.profile;
      const isProfileComplete = Boolean(
        profile?.dietType && profile?.healthGoal && profile?.skillLevel,
      );
      if (!isProfileComplete) {
        throw new Error("Profile save returned incomplete onboarding fields.");
      }
      queryClient.invalidateQueries({ queryKey: getGetProfileQueryKey() });
      await clearPendingOnboardingProfile();
    } catch (e) {
      console.error("Could not finalize onboarding profile after login:", e);
      setIsFinalizing(false);
      return;
    }

    const todayDate = getTodayDateString();
    let availableMeals = new Set<string>();
    try {
      const todayRecipes = await queryClient.fetchQuery(
        getGetTodayRecipesQueryOptions({
          date: todayDate,
        }, authHeaders ? { request: { headers: authHeaders } } : undefined),
      );
      queryClient.setQueryData(
        getGetTodayRecipesQueryKey({ date: todayDate }),
        todayRecipes,
      );
      availableMeals = new Set(
        (todayRecipes.recipes ?? []).map((r) => r.mealType.toLowerCase()),
      );
    } catch (e) {
      // Query cancellation/errors should not block navigation once profile is saved.
      console.warn("Recipe prefetch skipped after login:", e);
    }

    setMealReady({
      breakfast: false,
      lunch: false,
      dinner: false,
      treat: false,
    });

    const availableMealOrder = mealOrder.filter((meal) => availableMeals.has(meal));
    if (availableMealOrder.length > 0) {
      await new Promise<void>((resolve) => {
        availableMealOrder.forEach((meal, index) => {
          const timer = setTimeout(() => {
            setMealReady((prev) => ({ ...prev, [meal]: true }));
            if (index === availableMealOrder.length - 1) {
              const settleTimer = setTimeout(resolve, 250);
              checklistTimersRef.current.push(settleTimer);
            }
          }, 260 * (index + 1));
          checklistTimersRef.current.push(timer);
        });
      });
    } else {
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, 700);
        checklistTimersRef.current.push(timer);
      });
    }

    setIsFinalizing(false);
    // Brief delay so tokenRef propagates before Home/queries run (avoids 401 on native)
    await new Promise((r) => setTimeout(r, 300));
    router.replace("/(tabs)");
  }, [mealOrder, queryClient, token]);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    if (finalizationStartedRef.current) return;

    finalizationStartedRef.current = true;
    if (fromOnboarding) {
      void finalizeAfterAuth();
      return;
    }

    void getPendingOnboardingProfile().then((pending) => {
      if (pending) {
        void finalizeAfterAuth();
        return;
      }
      router.replace("/(tabs)");
    });
  }, [isAuthenticated, authLoading, fromOnboarding, finalizeAfterAuth]);

  const handleSignIn = async () => {
    setLoading(true);
    try {
      await signIn();
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = () => {
    Alert.alert(
      "Apple Sign-In coming soon",
      "Google sign-in is available now. Apple sign-in UI is restored and backend support will be connected next.",
    );
  };

  const completedSteps = Object.values(mealReady).filter(Boolean).length;
  const progressPct = `${Math.max((completedSteps / 4) * 100, fromOnboarding ? 12 : 0)}%`;
  const showGenerationState = fromOnboarding || isFinalizing;

  return (
    <View style={styles.container}>
      <Image source={{ uri: HERO_IMAGE }} style={styles.heroImage} />
      <LinearGradient
        colors={[
          "rgba(15,23,16,0.40)",
          "rgba(15,23,16,0.70)",
          "rgba(15,23,16,1)",
        ]}
        locations={[0, 0.45, 0.75]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.content, { paddingTop: topPad }]}>
        <View style={styles.logoRow}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoLetter}>N</Text>
          </View>
          <Text style={styles.logoText}>NutriSnap</Text>
        </View>

        <View style={styles.heroSection}>
          <View style={styles.tagBadge}>
            <Text style={styles.tagEmoji}>✨</Text>
            <Text style={styles.tagText}>100% whole foods · AI-powered</Text>
          </View>

          <Text style={styles.heroTitle}>Eat well,</Text>
          <Text style={styles.heroTitleGreen}>every day.</Text>

          <Text style={styles.heroDescription}>
            Your AI nutritionist generates 3 personalised whole-food recipes
            every morning — tailored to your goals and what's in season near
            you.
          </Text>
        </View>

        <View style={styles.statsRow}>
          {STATS.map((s) => (
            <View key={s.label} style={styles.statItem}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {showGenerationState ? (
          <View style={styles.generationCard}>
            <View style={styles.generationHeader}>
              <Text style={styles.generationEmoji}>{"\u{1F9D1}\u200D\u{1F373}"}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.generationTitle}>Recipes are generating in the background</Text>
                <Text style={styles.generationDesc}>
                  Complete login to unlock your personalized daily menu.
                </Text>
              </View>
            </View>
            <View style={styles.progressTrack}>
              <LinearGradient
                colors={[Colors.primary, "#16A34A"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressFill, { width: progressPct as `${number}%` }]}
              />
            </View>
            <View style={styles.checklist}>
              {mealOrder.map((meal) => {
                const done = mealReady[meal];
                return (
                  <View key={meal} style={styles.checkItem}>
                    <View style={[styles.checkCircle, done && styles.checkCircleDone]}>
                      {done ? <Feather name="check" size={12} color="#fff" /> : null}
                    </View>
                    <Text style={[styles.checkLabel, done && styles.checkLabelDone]}>
                      {meal.charAt(0).toUpperCase() + meal.slice(1)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}
      </View>

      <View style={[styles.bottom, { paddingBottom: bottomPad }]}>
        <Pressable
          onPress={handleSignIn}
          disabled={loading || authLoading || isFinalizing}
          style={({ pressed }) => [
            styles.ctaButton,
            pressed && styles.ctaPressed,
            (loading || authLoading || isFinalizing) && styles.ctaDisabled,
          ]}
        >
          <LinearGradient
            colors={[Colors.primary, "#16A34A"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaGradient}
          >
            {loading || isFinalizing ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Feather name="log-in" size={20} color="#fff" />
                <Text style={styles.ctaText}>Continue with Google</Text>
              </>
            )}
          </LinearGradient>
        </Pressable>

        {Platform.OS === "ios" ? (
          <Pressable
            onPress={handleAppleSignIn}
            style={({ pressed }) => [styles.appleButton, pressed && { opacity: 0.9 }]}
          >
            <Feather name="smartphone" size={18} color={Colors.text} />
            <Text style={styles.appleText}>Continue with Apple</Text>
          </Pressable>
        ) : null}

        <Text style={styles.terms}>
          By continuing, you agree to our Terms & Privacy Policy
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
    opacity: 0.3,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "flex-start",
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 0,
  },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  logoLetter: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  logoText: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  heroSection: {
    marginTop: "auto",
    marginBottom: 0,
  },
  tagBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    backgroundColor: "rgba(34,197,94,0.15)",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.30)",
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 20,
  },
  tagEmoji: {
    fontSize: 12,
  },
  tagText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
  },
  heroTitle: {
    fontSize: 38,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    lineHeight: 44,
  },
  heroTitleGreen: {
    fontSize: 38,
    fontFamily: "Inter_700Bold",
    color: Colors.primary,
    lineHeight: 44,
    marginBottom: 16,
  },
  heroDescription: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.55)",
    lineHeight: 22,
  },
  statsRow: {
    flexDirection: "row",
    gap: 24,
    marginTop: 32,
    marginBottom: 32,
  },
  statItem: {
    gap: 2,
  },
  statValue: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.40)",
  },
  generationCard: {
    marginTop: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.35)",
    backgroundColor: "rgba(21,31,24,0.86)",
    padding: 14,
    gap: 10,
  },
  generationHeader: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  generationEmoji: {
    fontSize: 20,
  },
  generationTitle: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  generationDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  progressTrack: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  checklist: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  checkItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingRight: 8,
  },
  checkCircle: {
    width: 18,
    height: 18,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    justifyContent: "center",
    alignItems: "center",
  },
  checkCircleDone: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  checkLabelDone: {
    color: Colors.text,
  },
  bottom: {
    paddingHorizontal: 24,
  },
  ctaButton: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  ctaPressed: {
    transform: [{ scale: 0.98 }],
  },
  ctaDisabled: {
    opacity: 0.6,
  },
  ctaGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  ctaText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  appleButton: {
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingVertical: 15,
    paddingHorizontal: 18,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  appleText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  terms: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.20)",
    textAlign: "center",
    marginTop: 16,
  },
});
