import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import Colors from "@/constants/colors";
import {
  getGetProfileQueryKey,
  getGetTodayRecipesQueryKey,
  updateProfile,
} from "@workspace/api-client-react";
import { getTodayDateString } from "@/features/common/date";
import { useAuth } from "@/lib/auth";
import {
  ONBOARDING_PROGRESS_STORAGE_KEY,
  savePendingOnboardingProfile,
} from "@/lib/onboardingAuth";

const STEPS = [
  "diet",
  "allergies",
  "goal",
  "skill",
  "location",
  "targets",
] as const;

type Step = (typeof STEPS)[number];

interface OnboardingState {
  step: number;
  diet: string;
  allergies: string[];
  goals: string[];
  // Backward-compat for previously persisted progress payloads.
  goal?: string;
  skill: string;
  city: string;
  country: string;
  lat: number | null;
  lng: number | null;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
}

const defaultState: OnboardingState = {
  step: 0,
  diet: "",
  allergies: [],
  goals: [],
  skill: "",
  city: "",
  country: "",
  lat: null,
  lng: null,
  calories: "2000",
  protein: "120",
  carbs: "250",
  fat: "65",
};

const DIET_OPTIONS: { id: string; label: string; emoji: string }[] = [
  { id: "vegan", label: "Vegan", emoji: "🌱" },
  { id: "vegetarian", label: "Vegetarian", emoji: "🥦" },
  { id: "pescatarian", label: "Pescatarian", emoji: "🐟" },
  { id: "flexitarian", label: "Flexitarian", emoji: "🍽" },
  { id: "omnivore", label: "Omnivore", emoji: "🥩" },
  { id: "keto", label: "Keto", emoji: "🥑" },
  { id: "paleo", label: "Paleo", emoji: "🍖" },
  { id: "mediterranean", label: "Mediterranean", emoji: "🫒" },
];

const ALLERGY_OPTIONS = [
  { id: "gluten", label: "Gluten", emoji: "🌾" },
  { id: "dairy", label: "Dairy", emoji: "🥛" },
  { id: "nuts", label: "Nuts", emoji: "🥜" },
  { id: "soy", label: "Soy", emoji: "🫘" },
  { id: "eggs", label: "Eggs", emoji: "🥚" },
  { id: "shellfish", label: "Shellfish", emoji: "🦐" },
  { id: "nightshades", label: "Nightshades", emoji: "🍅" },
  { id: "none", label: "None", emoji: "✅" },
] as const;

const GOAL_OPTIONS = [
  { id: "fat-loss", label: "Lose body fat", emoji: "🔥" },
  { id: "muscle", label: "Build muscle", emoji: "💪" },
  { id: "gut", label: "Improve gut health", emoji: "🌿" },
  { id: "energy", label: "Boost energy", emoji: "⚡" },
  { id: "inflammation", label: "Reduce inflammation", emoji: "🧊" },
  { id: "wellness", label: "General wellness", emoji: "✨" },
] as const;

const SKILL_OPTIONS = [
  { id: "beginner", label: "Beginner", desc: "Simple recipes, <15 min" },
  { id: "intermediate", label: "Intermediate", desc: "Some techniques, 15-30 min" },
  { id: "advanced", label: "Advanced", desc: "Complex dishes, 30+ min" },
] as const;

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { user } = useAuth();
  const params = useLocalSearchParams<{ edit?: string }>();
  const isEditMode = params.edit === "1";
  const queryClient = useQueryClient();
  const [loaded, setLoaded] = useState(false);

  const [step, setStep] = useState(0);
  const [diet, setDiet] = useState("");
  const [allergies, setAllergies] = useState<string[]>([]);
  const [goals, setGoals] = useState<string[]>([]);
  const [skill, setSkill] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [calories, setCalories] = useState("2000");
  const [protein, setProtein] = useState("120");
  const [carbs, setCarbs] = useState("250");
  const [fat, setFat] = useState("65");
  const optionCardWidth = Math.floor((Dimensions.get("window").width - 40 - 12) / 2);

  const saveProfileMutation = useMutation({
    mutationFn: (payload: Parameters<typeof updateProfile>[0]) => updateProfile(payload),
  });

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_PROGRESS_STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const saved: OnboardingState = JSON.parse(raw);
          setStep(saved.step ?? 0);
          setDiet(saved.diet ?? "");
          setAllergies(saved.allergies ?? []);
          setGoals(saved.goals ?? (saved.goal ? [saved.goal] : []));
          setSkill(saved.skill ?? "");
          setCity(saved.city ?? "");
          setCountry(saved.country ?? "");
          setLat(saved.lat ?? null);
          setLng(saved.lng ?? null);
          setCalories(saved.calories ?? "2000");
          setProtein(saved.protein ?? "120");
          setCarbs(saved.carbs ?? "250");
          setFat(saved.fat ?? "65");
        } catch {}
      }
      setLoaded(true);
    });
  }, []);

  const persistProgress = (overrides: Partial<OnboardingState> = {}) => {
    const state: OnboardingState = {
      step, diet, allergies, goals, goal: goals[0], skill, city, country, lat, lng,
      calories, protein, carbs, fat,
      ...overrides,
    };
    AsyncStorage.setItem(ONBOARDING_PROGRESS_STORAGE_KEY, JSON.stringify(state));
  };

  const currentStep = STEPS[step];
  const progress = (step + 1) / STEPS.length;
  const progressPct = `${progress * 100}%`;

  const canContinue = (): boolean => {
    switch (currentStep) {
      case "diet":
        return diet !== "";
      case "allergies":
        return allergies.length > 0;
      case "goal":
        return goals.length > 0;
      case "skill":
        return skill !== "";
      case "location":
        return city !== "" || (typeof lat === "number" && typeof lng === "number");
      case "targets":
        return calories !== "" && protein !== "";
      default:
        return false;
    }
  };

  const handleDetectLocation = async () => {
    setLocationLoading(true);
    try {
      if (Platform.OS === "web") {
        if ("geolocation" in navigator) {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
          });
          setLat(pos.coords.latitude);
          setLng(pos.coords.longitude);
          setCity("Your City");
          setCountry("Your Country");
          persistProgress({ lat: pos.coords.latitude, lng: pos.coords.longitude, city: "Your City", country: "Your Country" });
        } else {
          Alert.alert("Location unavailable", "This browser does not support geolocation.");
        }
      } else {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Location permission needed",
            "Please allow location access, or enter city and country manually.",
          );
          return;
        }

        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setLat(loc.coords.latitude);
        setLng(loc.coords.longitude);
        persistProgress({ lat: loc.coords.latitude, lng: loc.coords.longitude });

        try {
          const [geo] = await Location.reverseGeocodeAsync({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
          if (geo) {
            const c = geo.city || geo.subregion || "Current Location";
            const co = geo.country || "";
            setCity(c);
            setCountry(co);
            persistProgress({
              lat: loc.coords.latitude,
              lng: loc.coords.longitude,
              city: c,
              country: co,
            });
          } else {
            setCity("Current Location");
            persistProgress({
              lat: loc.coords.latitude,
              lng: loc.coords.longitude,
              city: "Current Location",
            });
          }
        } catch {
          // Reverse geocode can fail even when GPS works; keep coords and allow continue.
          setCity("Current Location");
          persistProgress({
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
            city: "Current Location",
          });
        }
      }
    } catch (e) {
      console.error("Location error:", e);
      Alert.alert("Location error", "Could not detect location. Try again or enter manually.");
    } finally {
      setLocationLoading(false);
    }
  };

  const handleNext = async () => {
    if (step < STEPS.length - 1) {
      const next = step + 1;
      setStep(next);
      persistProgress({ step: next });
      return;
    }

    if (!diet || goals.length === 0 || !skill) {
      if (!diet) {
        setStep(0);
        persistProgress({ step: 0 });
      } else if (goals.length === 0) {
        setStep(2);
        persistProgress({ step: 2 });
      } else if (!skill) {
        setStep(3);
        persistProgress({ step: 3 });
      }
      Alert.alert("Almost there", "Please complete all required onboarding steps.");
      return;
    }

    let resolvedLat = lat;
    let resolvedLng = lng;

    // If user typed city/country manually, try to geocode so nearby stores can use local coordinates.
    if ((resolvedLat == null || resolvedLng == null) && city.trim() && Platform.OS !== "web") {
      try {
        const query = `${city.trim()}${country.trim() ? `, ${country.trim()}` : ""}`;
        const geocoded = await Location.geocodeAsync(query);
        const first = geocoded[0];
        if (first?.latitude != null && first?.longitude != null) {
          resolvedLat = first.latitude;
          resolvedLng = first.longitude;
          setLat(first.latitude);
          setLng(first.longitude);
          persistProgress({ lat: first.latitude, lng: first.longitude });
        }
      } catch (e) {
        console.warn("Geocode from city/country failed:", e);
      }
    }

    try {
      const profilePayload = {
        dietType: diet,
        allergies: allergies.filter((a) => a !== "none" && a !== "None"),
        healthGoal: goals.join(","),
        skillLevel: skill,
        caloriesTarget: parseInt(calories, 10) || 2000,
        city: city || undefined,
        country: country || undefined,
        lat: resolvedLat ?? undefined,
        lng: resolvedLng ?? undefined,
      };

      if (!user) {
        await savePendingOnboardingProfile({
          tempSessionId: `ob-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          ...profilePayload,
          createdAtIso: new Date().toISOString(),
        });
        await AsyncStorage.removeItem(ONBOARDING_PROGRESS_STORAGE_KEY);
        router.replace("/sign-in?postOnboarding=1");
        return;
      }

      const updatedProfile = await saveProfileMutation.mutateAsync(profilePayload);
      const profile = updatedProfile?.profile;
      const isProfileComplete = Boolean(
        profile?.dietType && profile?.healthGoal && profile?.skillLevel,
      );
      if (!isProfileComplete) {
        throw new Error("Profile save returned incomplete onboarding fields.");
      }

      queryClient.setQueryData(getGetProfileQueryKey(), updatedProfile);
      queryClient.invalidateQueries({ queryKey: getGetProfileQueryKey() });
      queryClient.removeQueries({
        queryKey: getGetTodayRecipesQueryKey({ date: getTodayDateString() }),
      });
      queryClient.invalidateQueries({
        queryKey: getGetTodayRecipesQueryKey({ date: getTodayDateString() }),
      });

      await AsyncStorage.removeItem(ONBOARDING_PROGRESS_STORAGE_KEY);
      router.replace("/(tabs)");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not save your profile.";
      Alert.alert("Could not finish onboarding", message);
    }
  };

  const handleBack = () => {
    const prev = step - 1;
    setStep(prev);
    persistProgress({ step: prev });
  };

  const handleSkip = () => {
    const next = step + 1;
    setStep(next);
    persistProgress({ step: next });
  };

  const toggleAllergy = (allergy: string) => {
    let next: string[];
    if (allergy === "none") {
      next = ["none"];
    } else {
      const filtered = allergies.filter((a) => a !== "none" && a !== "None");
      next = filtered.includes(allergy)
        ? filtered.filter((a) => a !== allergy)
        : [...filtered, allergy];
    }
    setAllergies(next);
    persistProgress({ allergies: next });
  };

  const toggleGoal = (goalId: string) => {
    const next = goals.includes(goalId)
      ? goals.filter((g) => g !== goalId)
      : [...goals, goalId];
    setGoals(next);
    persistProgress({ goals: next, goal: next[0] ?? "" });
  };

  if (!loaded) return null;

  const renderStep = () => {
    switch (currentStep) {
      case "diet":
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>What&apos;s your diet?</Text>
            <Text style={styles.stepDesc}>
              We&apos;ll personalise your recipes around your lifestyle
            </Text>
            <View style={styles.optionsGrid}>
              {DIET_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.id}
                  onPress={() => { setDiet(opt.id); persistProgress({ diet: opt.id }); }}
                  style={[
                    styles.dietOption,
                    diet === opt.id && styles.dietOptionActive,
                  ]}
                >
                  <Text style={styles.dietEmoji}>{opt.emoji}</Text>
                  <Text
                    style={[
                      styles.dietLabel,
                      diet === opt.id && styles.dietLabelActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                  {diet === opt.id && (
                    <View style={styles.dietCheckBadge}>
                      <Feather name="check" size={12} color="#fff" />
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
          </View>
        );

      case "allergies":
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Any allergies?</Text>
            <Text style={styles.stepDesc}>
              Select all that apply — we&apos;ll always keep you safe
            </Text>
            <View style={styles.optionsGrid}>
              {ALLERGY_OPTIONS.map((allergy) => (
                <Pressable
                  key={allergy.id}
                  onPress={() => toggleAllergy(allergy.id)}
                  style={[
                    styles.dietOption,
                    allergies.includes(allergy.id) && styles.dietOptionActive,
                  ]}
                >
                  <Text style={styles.dietEmoji}>{allergy.emoji}</Text>
                  <Text
                    style={[
                      styles.dietLabel,
                      allergies.includes(allergy.id) && styles.dietLabelActive,
                    ]}
                  >
                    {allergy.label}
                  </Text>
                  {allergies.includes(allergy.id) && (
                    <View style={styles.dietCheckBadge}>
                      <Feather name="check" size={12} color="#fff" />
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
          </View>
        );

      case "goal":
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>What&apos;s your goal?</Text>
            <Text style={styles.stepDesc}>
              Select all that apply. Your AI chef will balance your chosen goals.
            </Text>
            <View style={styles.goalOptionsGrid}>
              {GOAL_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.id}
                  onPress={() => toggleGoal(opt.id)}
                  style={[
                    styles.dietOption,
                    { width: optionCardWidth },
                    goals.includes(opt.id) && styles.dietOptionActive,
                  ]}
                >
                  <Text style={styles.dietEmoji}>{opt.emoji}</Text>
                  <Text
                    style={[
                      styles.dietLabel,
                      goals.includes(opt.id) && styles.dietLabelActive,
                    ]}
                    numberOfLines={2}
                  >
                    {opt.label}
                  </Text>
                  {goals.includes(opt.id) && (
                    <View style={styles.dietCheckBadge}>
                      <Feather name="check" size={12} color="#fff" />
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
          </View>
        );

      case "skill":
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Cooking skill level</Text>
            <Text style={styles.stepDesc}>
              We&apos;ll match recipe complexity to you
            </Text>
            <View style={styles.goalList}>
              {SKILL_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.id}
                  onPress={() => { setSkill(opt.id); persistProgress({ skill: opt.id }); }}
                  style={[
                    styles.skillOption,
                    skill === opt.id && styles.skillOptionActive,
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.goalLabel,
                        skill === opt.id && styles.goalLabelActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                    <Text style={styles.skillDesc}>{opt.desc}</Text>
                  </View>
                  {skill === opt.id && (
                    <Feather
                      name="check-circle"
                      size={20}
                      color={Colors.primary}
                    />
                  )}
                </Pressable>
              ))}
            </View>
          </View>
        );

      case "location":
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Your location</Text>
            <Text style={styles.stepDesc}>
              For seasonal ingredients and nearby stores
            </Text>
            <Pressable
              onPress={handleDetectLocation}
              disabled={locationLoading}
              style={styles.locationButton}
            >
              {locationLoading ? (
                <ActivityIndicator color={Colors.primary} />
              ) : (
                <>
                  <Feather
                    name="navigation"
                    size={20}
                    color={Colors.primary}
                  />
                  <Text style={styles.locationButtonText}>
                    Detect my location
                  </Text>
                </>
              )}
            </Pressable>
            {city ? (
              <View style={styles.locationResult}>
                <Feather
                  name="map-pin"
                  size={18}
                  color={Colors.primary}
                />
                <Text style={styles.locationText}>
                  {city}
                  {country ? `, ${country}` : ""}
                </Text>
              </View>
            ) : null}
            <Text style={styles.orText}>or enter manually</Text>
            <TextInput
              style={styles.textInput}
              placeholder="City"
              placeholderTextColor={Colors.textTertiary}
              value={city}
              onChangeText={(v) => { setCity(v); persistProgress({ city: v }); }}
            />
            <TextInput
              style={styles.textInput}
              placeholder="Country"
              placeholderTextColor={Colors.textTertiary}
              value={country}
              onChangeText={(v) => { setCountry(v); persistProgress({ country: v }); }}
            />
          </View>
        );

      case "targets":
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Daily targets</Text>
            <Text style={styles.stepDesc}>
              Set your macro goals (we&apos;ll suggest defaults)
            </Text>
            <View style={styles.targetGrid}>
              {[
                { label: "Calories", value: calories, set: setCalories, key: "calories" as const, unit: "kcal", color: Colors.primary },
                { label: "Protein", value: protein, set: setProtein, key: "protein" as const, unit: "g", color: Colors.primary },
                { label: "Carbs", value: carbs, set: setCarbs, key: "carbs" as const, unit: "g", color: Colors.accent },
                { label: "Fat", value: fat, set: setFat, key: "fat" as const, unit: "g", color: Colors.blue },
              ].map((target) => (
                <View key={target.label} style={styles.targetCard}>
                  <Text style={[styles.targetLabel, { color: target.color }]}>
                    {target.label}
                  </Text>
                  <View style={styles.targetInputRow}>
                    <TextInput
                      style={styles.targetInput}
                      value={target.value}
                      onChangeText={(v) => { target.set(v); persistProgress({ [target.key]: v }); }}
                      keyboardType="numeric"
                      placeholderTextColor={Colors.textTertiary}
                    />
                    <Text style={styles.targetUnit}>{target.unit}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        );
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: isWeb ? 67 : insets.top + 16,
          paddingBottom: isWeb ? 34 : Math.max(insets.bottom, 16),
        },
      ]}
    >
      <View style={styles.header}>
        {step > 0 ? (
          <Pressable onPress={handleBack} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={Colors.text} />
          </Pressable>
        ) : (
          <View style={{ width: 40 }} />
        )}
        <View style={styles.progressContainer}>
          <View style={styles.progressBg}>
            <LinearGradient
              colors={[Colors.primary, Colors.accent]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressFill, { width: progressPct as `${number}%` }]}
            />
          </View>
        </View>
        <Text style={styles.stepCount}>
          {step + 1}/{STEPS.length}
        </Text>
      </View>

      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollInner}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {renderStep()}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={handleNext}
          disabled={!canContinue() || saveProfileMutation.isPending}
          style={({ pressed }) => [
            styles.nextButton,
            (!canContinue() || saveProfileMutation.isPending) && styles.nextButtonDisabled,
            pressed && canContinue() && styles.nextButtonPressed,
          ]}
        >
          <LinearGradient
            colors={
              canContinue()
                ? [Colors.primary, "#16A34A"]
                : ["#333", "#333"]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.nextGradient}
          >
            {saveProfileMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.nextText}>
                {step === STEPS.length - 1 ? "Get Started" : "Continue"}
              </Text>
            )}
          </LinearGradient>
        </Pressable>

        {currentStep === "location" && (
          <Pressable onPress={handleSkip}>
            <Text style={styles.skipText}>Skip for now</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.card,
    justifyContent: "center",
    alignItems: "center",
  },
  progressContainer: {
    flex: 1,
  },
  progressBg: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  stepCount: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
    width: 32,
    textAlign: "right",
  },
  scrollContent: {
    flex: 1,
  },
  scrollInner: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  stepContent: {
    gap: 16,
  },
  stepTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    letterSpacing: -0.3,
  },
  stepDesc: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 8,
  },
  optionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  goalOptionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
  },
  dietOption: {
    width: "47%",
    backgroundColor: Colors.card,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 2,
    borderColor: "transparent",
  },
  dietOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: "rgba(34,197,94,0.1)",
  },
  dietEmoji: {
    fontSize: 20,
    lineHeight: 22,
  },
  dietLabel: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.82)",
    flex: 1,
  },
  dietLabelActive: {
    color: Colors.text,
  },
  dietCheckBadge: {
    width: 20,
    height: 20,
    borderRadius: 999,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  chipActive: {
    borderColor: Colors.primary,
    backgroundColor: "rgba(34,197,94,0.1)",
  },
  chipText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  chipTextActive: {
    color: Colors.primary,
  },
  goalList: {
    gap: 10,
  },
  goalOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 2,
    borderColor: "transparent",
  },
  goalOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: "rgba(34,197,94,0.1)",
  },
  goalLabel: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  goalLabelActive: {
    color: Colors.primary,
  },
  skillOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 2,
    borderColor: "transparent",
  },
  skillOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: "rgba(34,197,94,0.1)",
  },
  skillDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
    marginTop: 2,
  },
  locationButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "rgba(34,197,94,0.1)",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.3)",
  },
  locationButtonText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
  },
  locationResult: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
  },
  locationText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  orText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
    textAlign: "center",
  },
  textInput: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  targetGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  targetCard: {
    width: "47%",
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  targetLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  targetInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  targetInput: {
    flex: 1,
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  targetUnit: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
  },
  footer: {
    paddingHorizontal: 20,
    gap: 12,
    alignItems: "center",
  },
  nextButton: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonPressed: {
    transform: [{ scale: 0.98 }],
  },
  nextGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
  },
  nextText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  skipText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.textTertiary,
  },
});
