import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { apiPut } from "@/lib/api";

type MCIconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

const STEPS = [
  "diet",
  "allergies",
  "goal",
  "skill",
  "location",
  "targets",
] as const;

type Step = (typeof STEPS)[number];

const ONBOARDING_STORAGE_KEY = "nutrisnap_onboarding_progress";

interface OnboardingState {
  step: number;
  diet: string;
  allergies: string[];
  goal: string;
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
  goal: "",
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

const DIET_OPTIONS: { id: string; label: string; icon: MCIconName }[] = [
  { id: "omnivore", label: "Omnivore", icon: "food-drumstick" },
  { id: "vegetarian", label: "Vegetarian", icon: "leaf" },
  { id: "vegan", label: "Vegan", icon: "sprout" },
  { id: "pescatarian", label: "Pescatarian", icon: "fish" },
  { id: "keto", label: "Keto", icon: "fire" },
  { id: "paleo", label: "Paleo", icon: "food-steak" },
  { id: "mediterranean", label: "Mediterranean", icon: "food-apple" },
  { id: "gluten_free", label: "Gluten Free", icon: "barley-off" },
];

const ALLERGY_OPTIONS = [
  "Dairy",
  "Eggs",
  "Tree Nuts",
  "Peanuts",
  "Shellfish",
  "Wheat",
  "Soy",
  "Fish",
  "Sesame",
  "None",
] as const;

const GOAL_OPTIONS: { id: string; label: string; icon: MCIconName }[] = [
  { id: "lose_weight", label: "Lose Weight", icon: "scale-bathroom" },
  { id: "build_muscle", label: "Build Muscle", icon: "arm-flex" },
  { id: "maintain", label: "Stay Healthy", icon: "heart-pulse" },
  { id: "energy", label: "More Energy", icon: "lightning-bolt" },
  { id: "gut_health", label: "Gut Health", icon: "stomach" },
];

const SKILL_OPTIONS = [
  { id: "beginner", label: "Beginner", desc: "Simple recipes, <15 min" },
  { id: "intermediate", label: "Intermediate", desc: "Some techniques, 15-30 min" },
  { id: "advanced", label: "Advanced", desc: "Complex dishes, 30+ min" },
] as const;

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  const [step, setStep] = useState(0);
  const [diet, setDiet] = useState("");
  const [allergies, setAllergies] = useState<string[]>([]);
  const [goal, setGoal] = useState("");
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

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const saved: OnboardingState = JSON.parse(raw);
          setStep(saved.step ?? 0);
          setDiet(saved.diet ?? "");
          setAllergies(saved.allergies ?? []);
          setGoal(saved.goal ?? "");
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
      step, diet, allergies, goal, skill, city, country, lat, lng,
      calories, protein, carbs, fat,
      ...overrides,
    };
    AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(state));
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
        return goal !== "";
      case "skill":
        return skill !== "";
      case "location":
        return city !== "";
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
        }
      } else {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const loc = await Location.getCurrentPositionAsync({});
          setLat(loc.coords.latitude);
          setLng(loc.coords.longitude);
          const [geo] = await Location.reverseGeocodeAsync({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
          if (geo) {
            const c = geo.city || geo.subregion || "Unknown";
            const co = geo.country || "";
            setCity(c);
            setCountry(co);
            persistProgress({ lat: loc.coords.latitude, lng: loc.coords.longitude, city: c, country: co });
          }
        }
      }
    } catch (e) {
      console.error("Location error:", e);
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

    setSaving(true);
    try {
      await apiPut("/api/profile", {
        dietType: diet,
        allergies: allergies.filter((a) => a !== "None"),
        healthGoal: goal,
        skillLevel: skill,
        caloriesTarget: parseInt(calories, 10) || 2000,
        proteinTarget: parseInt(protein, 10) || 120,
        carbsTarget: parseInt(carbs, 10) || 250,
        fatTarget: parseInt(fat, 10) || 65,
        city: city || null,
        country: country || null,
        lat,
        lng,
      });
      await AsyncStorage.removeItem(ONBOARDING_STORAGE_KEY);
      router.replace("/(tabs)");
    } catch (e) {
      console.error("Save profile error:", e);
      router.replace("/(tabs)");
    } finally {
      setSaving(false);
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
    if (allergy === "None") {
      next = ["None"];
    } else {
      const filtered = allergies.filter((a) => a !== "None");
      next = filtered.includes(allergy)
        ? filtered.filter((a) => a !== allergy)
        : [...filtered, allergy];
    }
    setAllergies(next);
    persistProgress({ allergies: next });
  };

  if (!loaded) return null;

  const renderStep = () => {
    switch (currentStep) {
      case "diet":
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>What&apos;s your diet?</Text>
            <Text style={styles.stepDesc}>
              We&apos;ll customize recipes to match your preferences
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
                  <MaterialCommunityIcons
                    name={opt.icon}
                    size={28}
                    color={diet === opt.id ? Colors.primary : Colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.dietLabel,
                      diet === opt.id && styles.dietLabelActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
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
              Select all that apply so we keep you safe
            </Text>
            <View style={styles.chipGrid}>
              {ALLERGY_OPTIONS.map((allergy) => (
                <Pressable
                  key={allergy}
                  onPress={() => toggleAllergy(allergy)}
                  style={[
                    styles.chip,
                    allergies.includes(allergy) && styles.chipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      allergies.includes(allergy) && styles.chipTextActive,
                    ]}
                  >
                    {allergy}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        );

      case "goal":
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Your health goal</Text>
            <Text style={styles.stepDesc}>
              We&apos;ll optimize your recipes for this goal
            </Text>
            <View style={styles.goalList}>
              {GOAL_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.id}
                  onPress={() => { setGoal(opt.id); persistProgress({ goal: opt.id }); }}
                  style={[
                    styles.goalOption,
                    goal === opt.id && styles.goalOptionActive,
                  ]}
                >
                  <MaterialCommunityIcons
                    name={opt.icon}
                    size={24}
                    color={goal === opt.id ? Colors.primary : Colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.goalLabel,
                      goal === opt.id && styles.goalLabelActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                  {goal === opt.id && (
                    <Feather
                      name="check-circle"
                      size={20}
                      color={Colors.primary}
                      style={{ marginLeft: "auto" }}
                    />
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
          disabled={!canContinue() || saving}
          style={({ pressed }) => [
            styles.nextButton,
            (!canContinue() || saving) && styles.nextButtonDisabled,
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
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.nextText}>
                {step === STEPS.length - 1 ? "Get Started" : "Continue"}
              </Text>
            )}
          </LinearGradient>
        </Pressable>

        {step < STEPS.length - 1 && (
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
  dietOption: {
    width: "47%",
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    gap: 8,
    borderWidth: 2,
    borderColor: "transparent",
  },
  dietOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: "rgba(34,197,94,0.1)",
  },
  dietLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
  dietLabelActive: {
    color: Colors.primary,
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
