import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthContext, useAuth, useAuthProvider } from "@/lib/auth";
import { apiGet } from "@/lib/api";
import Colors from "@/constants/colors";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

interface ProfileResponse {
  profile: {
    dietType: string | null;
    healthGoal: string | null;
  } | null;
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  const { data: profileData, isLoading: profileLoading } = useQuery<ProfileResponse>({
    queryKey: ["profile"],
    queryFn: () => apiGet("/api/profile"),
    enabled: !!user,
  });

  useEffect(() => {
    if (authLoading) return;

    const inSignIn = segments[0] === "sign-in";
    const inOnboarding = segments[0] === "onboarding";

    if (!user) {
      if (!inSignIn) {
        router.replace("/sign-in");
      }
      return;
    }

    if (profileLoading) return;

    const profile = profileData?.profile;
    const isProfileComplete = profile?.dietType && profile?.healthGoal;

    if (!isProfileComplete && !inOnboarding) {
      router.replace("/onboarding");
      return;
    }

    if (isProfileComplete && (inSignIn || inOnboarding)) {
      router.replace("/(tabs)");
      return;
    }

    if (inSignIn) {
      router.replace("/(tabs)");
    }
  }, [user, authLoading, profileLoading, profileData, segments]);

  return <>{children}</>;
}

function RootLayoutNav() {
  return (
    <AuthGate>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="recipe/[id]"
          options={{ animation: "slide_from_bottom" }}
        />
      </Stack>
    </AuthGate>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const auth = useAuthProvider();

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <AuthContext.Provider value={auth}>
          <QueryClientProvider client={queryClient}>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <KeyboardProvider>
                <StatusBar style="light" />
                <RootLayoutNav />
              </KeyboardProvider>
            </GestureHandlerRootView>
          </QueryClientProvider>
        </AuthContext.Provider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
