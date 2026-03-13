import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth";

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const { signIn, isAuthenticated, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const isWeb = Platform.OS === "web";

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
    <View style={[styles.container, { paddingTop: isWeb ? 67 : insets.top }]}>
      <LinearGradient
        colors={["#0F1710", "#162318", "#1C2B1E", "#0F1710"]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.topDecor}>
        <View style={[styles.glowCircle, { backgroundColor: "rgba(34,197,94,0.08)" }]} />
        <View style={[styles.glowCircle2, { backgroundColor: "rgba(249,115,22,0.06)" }]} />
      </View>

      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <LinearGradient
            colors={[Colors.primary, Colors.primaryDark]}
            style={styles.logoBg}
          >
            <Feather name="zap" size={32} color="#fff" />
          </LinearGradient>
        </View>

        <Text style={styles.title}>NutriSnap</Text>
        <Text style={styles.subtitle}>
          AI-powered recipes tailored{"\n"}to your goals
        </Text>

        <View style={styles.statsRow}>
          {[
            { icon: "target" as const, value: "3", label: "Daily Recipes" },
            { icon: "trending-up" as const, value: "AI", label: "Personalized" },
            { icon: "shopping-cart" as const, value: "Auto", label: "Shop Lists" },
          ].map((stat) => (
            <View key={stat.label} style={styles.statItem}>
              <View style={styles.statIconBg}>
                <Feather name={stat.icon} size={16} color={Colors.primary} />
              </View>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.bottom, { paddingBottom: isWeb ? 34 : Math.max(insets.bottom, 20) + 16 }]}>
        <Pressable
          onPress={handleSignIn}
          disabled={loading || authLoading}
          style={({ pressed }) => [
            styles.signInButton,
            pressed && styles.signInButtonPressed,
            (loading || authLoading) && styles.signInButtonDisabled,
          ]}
        >
          <LinearGradient
            colors={[Colors.primary, "#16A34A"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.signInGradient}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Feather name="log-in" size={20} color="#fff" />
                <Text style={styles.signInText}>Continue with Replit</Text>
              </>
            )}
          </LinearGradient>
        </Pressable>

        <Text style={styles.terms}>
          By continuing, you agree to our Terms of Service
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
  topDecor: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 300,
  },
  glowCircle: {
    position: "absolute",
    top: -100,
    left: -50,
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  glowCircle2: {
    position: "absolute",
    top: -50,
    right: -80,
    width: 250,
    height: 250,
    borderRadius: 125,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  logoContainer: {
    marginBottom: 24,
  },
  logoBg: {
    width: 72,
    height: 72,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: 36,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 24,
  },
  statsRow: {
    flexDirection: "row",
    gap: 20,
    marginTop: 48,
  },
  statItem: {
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.card,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    minWidth: 90,
  },
  statIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(34,197,94,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  statValue: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  bottom: {
    paddingHorizontal: 24,
  },
  signInButton: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  signInButtonPressed: {
    transform: [{ scale: 0.98 }],
  },
  signInButtonDisabled: {
    opacity: 0.6,
  },
  signInGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  signInText: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  terms: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
    textAlign: "center",
    marginTop: 16,
  },
});
