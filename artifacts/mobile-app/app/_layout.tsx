import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { configureFetch, getGetProfileQueryKey, getGetProfileQueryOptions } from "@workspace/api-client-react";
import { Stack, useGlobalSearchParams, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthContext, getSyncToken, useAuth, useAuthProvider } from "@/lib/auth";
import Colors from "@/constants/colors";
import { getApiBase } from "@/lib/apiBase";
import { getPendingOnboardingProfile } from "@/lib/onboardingAuth";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, token, isLoading: authLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const params = useGlobalSearchParams<{ edit?: string }>();
  const [hasPendingOnboarding, setHasPendingOnboarding] = useState(false);
  const [pendingCheckLoading, setPendingCheckLoading] = useState(true);
  const [profileReady, setProfileReady] = useState(false);

  // Delay profile fetch until token is settled (avoids race where React Query runs before tokenRef propagates)
  useEffect(() => {
    if (!user) {
      setProfileReady(false);
      return;
    }
    const t = setTimeout(() => setProfileReady(true), 300);
    return () => clearTimeout(t);
  }, [user]);

  const { data: profileData, isLoading: profileLoading } = useQuery({
    ...getGetProfileQueryOptions({
      request:
        token || Platform.OS === "web"
          ? {
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            }
          : undefined,
    }),
    // On native, require token before fetching (avoids 401 from requireAuth)
    enabled: !!user && (Platform.OS === "web" || !!token) && profileReady,
    retry: (failureCount, error) => {
      // Retry once on 401 (token race) - second attempt will have token from storage
      const is401 = error && typeof error === "object" && "status" in error && (error as { status: number }).status === 401;
      return failureCount < 1 && !!is401;
    },
  });

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    setPendingCheckLoading(true);
    void getPendingOnboardingProfile()
      .then((pending) => {
        if (!cancelled) {
          setHasPendingOnboarding(Boolean(pending));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHasPendingOnboarding(false);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setPendingCheckLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, user, segments]);

  useEffect(() => {
    if (authLoading) return;
    if (pendingCheckLoading) return;

    const inSignIn = segments[0] === "sign-in";
    const inOnboarding = segments[0] === "onboarding";

    // Pending onboarding must always finish through sign-in finalization flow
    // before profile completeness redirects can run.
    if (hasPendingOnboarding) {
      if (!inSignIn) {
        if (__DEV__) {
          console.log("[AuthGate] pending onboarding -> sign-in");
        }
        router.replace("/sign-in?postOnboarding=1");
      }
      return;
    }

    if (!user) {
      if (!inSignIn && !inOnboarding) {
        if (__DEV__) {
          console.log("[AuthGate] unauthenticated -> onboarding");
        }
        router.replace("/onboarding");
      }
      return;
    }

    // Once authenticated, let the sign-in screen complete its own post-login
    // finalize flow. Redirecting from here can bounce users back to onboarding.
    if (inSignIn) {
      return;
    }

    if (profileLoading) {
      return;
    }

    const profile = profileData?.profile;
    const isProfileComplete = Boolean(
      profile?.dietType && profile?.healthGoal && profile?.skillLevel,
    );
    const isEditMode = inOnboarding && params.edit === "1";

    if (!isProfileComplete && !inOnboarding) {
      if (__DEV__) {
        console.log("[AuthGate] authed profile incomplete -> onboarding");
      }
      router.replace("/onboarding");
      return;
    }

    if (isProfileComplete && inOnboarding && !isEditMode) {
      if (__DEV__) {
        console.log("[AuthGate] authed profile complete -> tabs");
      }
      router.replace("/(tabs)");
      return;
    }
  }, [
    user,
    authLoading,
    pendingCheckLoading,
    profileLoading,
    profileData,
    segments,
    params.edit,
    hasPendingOnboarding,
  ]);

  return (
    <>
      {children}
    </>
  );
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

  const tokenRef = useRef<string | null>(null);
  const auth = useAuthProvider(tokenRef);
  tokenRef.current = auth.token;

  useEffect(() => {
    const baseUrl = getApiBase();
    configureFetch({
      baseUrl,
      useCredentials: Platform.OS === "web",
      getHeaders: (): Record<string, string> => {
        const t = tokenRef.current ?? getSyncToken();
        return t ? { Authorization: `Bearer ${t}` } : {};
      },
    });
  }, []);

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
