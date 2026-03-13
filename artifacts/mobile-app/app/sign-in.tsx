import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&q=80";

const STATS = [
  { value: "50k+", label: "Users" },
  { value: "4.9★", label: "Rating" },
  { value: "2.1M", label: "Recipes" },
];

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const { signIn, isAuthenticated, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 52 : Math.max(insets.top, 20);
  const bottomPad = isWeb ? 34 : Math.max(insets.bottom, 20) + 12;

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated]);

  const handleSignIn = async () => {
    setLoading(true);
    try {
      await signIn();
    } finally {
      setLoading(false);
    }
  };

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
      </View>

      <View style={[styles.bottom, { paddingBottom: bottomPad }]}>
        <Pressable
          onPress={handleSignIn}
          disabled={loading || authLoading}
          style={({ pressed }) => [
            styles.ctaButton,
            pressed && styles.ctaPressed,
            (loading || authLoading) && styles.ctaDisabled,
          ]}
        >
          <LinearGradient
            colors={[Colors.primary, "#16A34A"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaGradient}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Feather name="log-in" size={20} color="#fff" />
                <Text style={styles.ctaText}>Continue with Replit</Text>
              </>
            )}
          </LinearGradient>
        </Pressable>

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
  terms: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.20)",
    textAlign: "center",
    marginTop: 16,
  },
});
