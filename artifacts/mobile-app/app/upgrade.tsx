import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";

import Colors from "@/constants/colors";
import { createBillingCheckout, getGetBillingStatusQueryKey } from "@workspace/api-client-react";

// ─── Feature bullets ───────────────────────────────────────────────────────
const FEATURES = [
  "Unlimited daily meal plans — forever",
  "Multi-goal recipes (fat loss, muscle, gut health & more)",
  "Full meal history with calendar view",
  "Shopping list sync & weekly streaks",
  "Daily personalised whole-food menus",
];

// ─── Approximate USD/EUR for display only (Stripe charges in GBP) ──────────
const FULL_GBP = "£20";
const FULL_USD = "~$26";
const FULL_EUR = "~€24";
const SPLIT_GBP = "£10";
const SPLIT_USD = "~$13";
const SPLIT_EUR = "~€12";

export default function UpgradeScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ status?: string }>();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState<"full" | "split_first" | null>(null);

  // Deep-link return from Stripe Checkout
  useEffect(() => {
    if (params.status === "success") {
      // Invalidate billing status so home + profile re-fetch immediately
      void queryClient.invalidateQueries({ queryKey: getGetBillingStatusQueryKey() });
      Alert.alert(
        "Welcome to Recipe Genie Pro! 🎉",
        "Your lifetime access is now active. Enjoy unlimited daily recipes.",
        [{ text: "Let's go", onPress: () => router.replace("/(tabs)") }],
      );
    }
  }, [params.status, queryClient]);

  const openCheckout = async (type: "full" | "split_first") => {
    setLoading(type);
    try {
      const data = await createBillingCheckout({ type });
      if (!data?.url) throw new Error("No checkout URL returned");

      const result = await WebBrowser.openAuthSessionAsync(data.url, "recipegenie://");
      if (result.type === "success" && result.url.includes("status=success")) {
        void queryClient.invalidateQueries({ queryKey: getGetBillingStatusQueryKey() });
        Alert.alert(
          "Welcome to Recipe Genie Pro! 🎉",
          "Your lifetime access is now active.",
          [{ text: "Let's go", onPress: () => router.replace("/(tabs)") }],
        );
      }
    } catch (err) {
      console.error("Checkout error:", err);
      Alert.alert("Payment Error", "Could not open checkout. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  const topPad = Platform.OS === "web" ? 52 : Math.max(insets.top, 20);
  const bottomPad = Platform.OS === "web" ? 34 : Math.max(insets.bottom, 20) + 12;

  return (
    <View style={styles.container}>
      {/* Background gradient */}
      <LinearGradient
        colors={["rgba(34,197,94,0.12)", "rgba(15,23,16,0)"]}
        locations={[0, 0.5]}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topPad, paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Close button */}
        <Pressable style={styles.closeBtn} onPress={() => router.back()}>
          <Feather name="x" size={20} color={Colors.textSecondary} />
        </Pressable>

        {/* Badge */}
        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>✨ LIFETIME ACCESS</Text>
          </View>
        </View>

        {/* Headline */}
        <Text style={styles.headline}>Recipe Genie Pro</Text>
        <Text style={styles.subheadline}>
          Pay once.{"\n"}Unlock forever.
        </Text>

        {/* Features */}
        <View style={styles.featureList}>
          {FEATURES.map((f) => (
            <View key={f} style={styles.featureRow}>
              <View style={styles.featureCheck}>
                <Feather name="check" size={13} color={Colors.primary} />
              </View>
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </View>

        {/* Price card */}
        <View style={styles.priceCard}>
          <LinearGradient
            colors={["rgba(34,197,94,0.14)", "rgba(34,197,94,0.04)"]}
            style={styles.priceCardInner}
          >
            <Text style={styles.priceMain}>{FULL_GBP}</Text>
            <Text style={styles.priceAlt}>
              {FULL_USD} &nbsp;·&nbsp; {FULL_EUR}
            </Text>
            <View style={styles.priceDivider} />
            <Text style={styles.priceDesc}>One-off payment · No subscription · Yours forever</Text>
          </LinearGradient>
        </View>

        {/* Primary CTA — full £20 */}
        <Pressable
          onPress={() => openCheckout("full")}
          disabled={loading !== null}
          style={({ pressed }) => [
            styles.ctaButton,
            pressed && styles.ctaPressed,
            loading !== null && styles.ctaDisabled,
          ]}
        >
          <LinearGradient
            colors={[Colors.primary, "#16A34A"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaGradient}
          >
            {loading === "full" ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Feather name="unlock" size={18} color="#fff" />
                <Text style={styles.ctaText}>Pay {FULL_GBP} — unlock now</Text>
              </>
            )}
          </LinearGradient>
        </Pressable>

        {/* Secondary CTA — split 2 × £10 */}
        <Pressable
          onPress={() => openCheckout("split_first")}
          disabled={loading !== null}
          style={({ pressed }) => [
            styles.splitButton,
            pressed && styles.ctaPressed,
            loading !== null && styles.ctaDisabled,
          ]}
        >
          {loading === "split_first" ? (
            <ActivityIndicator color={Colors.primary} size="small" />
          ) : (
            <>
              <Text style={styles.splitText}>Split into 2 × {SPLIT_GBP}</Text>
              <Text style={styles.splitSub}>
                Pay {SPLIT_GBP} ({SPLIT_USD} / {SPLIT_EUR}) today · {SPLIT_GBP} in 30 days
              </Text>
            </>
          )}
        </Pressable>

        {/* Payment methods hint */}
        <Text style={styles.payMethods}>
          Apple Pay · Google Pay · Card · Link · PayPal
        </Text>

        {/* Dismiss */}
        <Pressable onPress={() => router.back()} style={styles.notReadyBtn}>
          <Text style={styles.notReadyText}>Not ready yet</Text>
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
  scroll: {
    paddingHorizontal: 24,
    alignItems: "stretch",
  },
  closeBtn: {
    alignSelf: "flex-end",
    padding: 8,
    marginBottom: 8,
  },
  badgeRow: {
    alignItems: "center",
    marginBottom: 20,
  },
  badge: {
    backgroundColor: "rgba(34,197,94,0.15)",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.35)",
    borderRadius: 100,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: Colors.primary,
    letterSpacing: 1,
  },
  headline: {
    fontSize: 34,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    textAlign: "center",
    marginBottom: 8,
  },
  subheadline: {
    fontSize: 17,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  featureList: {
    gap: 12,
    marginBottom: 28,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  featureCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(34,197,94,0.15)",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.30)",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 1,
  },
  featureText: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
    lineHeight: 22,
  },
  priceCard: {
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.30)",
    marginBottom: 20,
  },
  priceCardInner: {
    padding: 20,
    alignItems: "center",
  },
  priceMain: {
    fontSize: 48,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    lineHeight: 56,
  },
  priceAlt: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 2,
    marginBottom: 14,
  },
  priceDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    width: "100%",
    marginBottom: 12,
  },
  priceDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
  },
  ctaButton: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
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
  ctaPressed: {
    transform: [{ scale: 0.98 }],
  },
  ctaDisabled: {
    opacity: 0.6,
  },
  splitButton: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.35)",
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: "center",
    marginBottom: 16,
    gap: 4,
  },
  splitText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
  },
  splitSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
  },
  payMethods: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
    textAlign: "center",
    marginBottom: 24,
  },
  notReadyBtn: {
    alignItems: "center",
    paddingVertical: 8,
  },
  notReadyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
  },
});
