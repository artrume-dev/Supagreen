import AsyncStorage from "@react-native-async-storage/async-storage";
import { makeRedirectUri } from "expo-auth-session";
import Constants from "expo-constants";
import * as Crypto from "expo-crypto";
import * as WebBrowser from "expo-web-browser";
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Alert, Platform } from "react-native";
import { getApiBase } from "@/lib/apiBase";

WebBrowser.maybeCompleteAuthSession();

/** Generate PKCE code_verifier (43 chars) and code_challenge (base64url SHA256 of verifier). */
async function generatePkce(): Promise<{ codeVerifier: string; codeChallenge: string }> {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const bytes = await Crypto.getRandomBytesAsync(43);
  let verifier = "";
  for (let i = 0; i < 43; i++) {
    verifier += charset[bytes[i]! % charset.length];
  }
  const hashB64 = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    verifier,
    { encoding: Crypto.CryptoEncoding.BASE64 },
  );
  const challenge = hashB64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return { codeVerifier: verifier, codeChallenge: challenge };
}

/** Generate a random string for state/nonce using expo-crypto. */
async function randomStringAsync(length: number): Promise<string> {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = await Crypto.getRandomBytesAsync(length);
  let result = "";
  for (let i = 0; i < length; i++) {
    result += charset[bytes[i]! % charset.length];
  }
  return result;
}

const TOKEN_KEY = "nutrisnap_session_token";

/** Module-level cache so configureFetch getHeaders can read token before React state propagates. */
let _tokenCache: string | null = null;

export function getCachedToken(): string | null {
  return _tokenCache;
}

export function setCachedToken(token: string | null): void {
  _tokenCache = token;
}

/** Returns the stored session token (for post-login flows where React state may lag). */
export async function getStoredToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

/** Sync token cache for getHeaders before React state propagates. */
let _syncToken: string | null = null;
export function setSyncToken(t: string | null): void {
  _syncToken = t;
}
export function getSyncToken(): string | null {
  return _syncToken;
}

export interface AuthUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  token: null,
  user: null,
  isLoading: true,
  isAuthenticated: false,
  signIn: async () => {},
  signOut: async () => {},
});

export function useAuth(): AuthState {
  return useContext(AuthContext);
}

export { AuthContext };

export type TokenRef = React.MutableRefObject<string | null>;

export function useAuthProvider(tokenRef?: TokenRef): AuthState {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isExpoGo = Constants.appOwnership === "expo";
  const redirectUri = makeRedirectUri({
    // Expo Go should use exp:// callback. Custom scheme is for standalone/dev-client builds.
    scheme: isExpoGo ? undefined : "mobile-app",
    path: "auth/callback",
  });

  const fetchUser = useCallback(async (sessionToken?: string) => {
    try {
      const baseUrl = getApiBase();
      const headers: Record<string, string> = {};
      if (sessionToken) {
        headers.Authorization = `Bearer ${sessionToken}`;
      }

      const res = await fetch(`${baseUrl}/api/me`, {
        headers,
        credentials: Platform.OS === "web" ? "include" : "omit",
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setUser(data.user);
          return true;
        }
      }
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        console.warn("Fetch user failed:", res.status, body);
      }
    } catch (e) {
      console.error("Failed to fetch user:", e);
    }
    return false;
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(TOKEN_KEY);
        if (stored) {
          const valid = await fetchUser(stored);
          if (valid) {
            setSyncToken(stored);
            setToken(stored);
          } else {
            await AsyncStorage.removeItem(TOKEN_KEY);
          }
        } else if (Platform.OS === "web") {
          // Web relies on cookie-backed session from /api/login.
          await fetchUser();
        }
      } catch (e) {
        console.error("Auth init error:", e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [fetchUser]);

  const signIn = useCallback(async () => {
    try {
      const apiBase = getApiBase();

      if (!apiBase) {
        Alert.alert("Login Error", "Could not determine API base URL.");
        return;
      }

      if (Platform.OS === "web" && typeof window !== "undefined") {
        const returnTo = `${window.location.origin}/`;
        window.location.href = `${apiBase}/api/login?returnTo=${encodeURIComponent(returnTo)}`;
        return;
      }

      // App-centric OAuth: open Google directly with app redirect, then exchange code server-side.
      // No ngrok needed: server only handles POST token-exchange over local network or production URL.
      const configRes = await fetch(`${apiBase}/api/mobile-auth/config`);
      if (!configRes.ok) {
        Alert.alert("Login Error", "Could not load auth configuration.");
        return;
      }
      const config = (await configRes.json()) as {
        clientId: string;
        authorizationEndpoint: string;
        scope: string;
      };
      const { codeVerifier, codeChallenge } = await generatePkce();
      const state = await randomStringAsync(32);
      const nonce = await randomStringAsync(32);

      const authUrl = new URL(config.authorizationEndpoint);
      authUrl.searchParams.set("client_id", config.clientId);
      authUrl.searchParams.set("redirect_uri", redirectUri);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("scope", config.scope);
      authUrl.searchParams.set("state", state);
      authUrl.searchParams.set("nonce", nonce);
      authUrl.searchParams.set("code_challenge", codeChallenge);
      authUrl.searchParams.set("code_challenge_method", "S256");
      authUrl.searchParams.set("prompt", "login consent");
      if (config.scope.includes("googleapis.com")) {
        authUrl.searchParams.set("access_type", "offline");
        // Google requires device_id/device_name when redirect_uri uses a private IP (e.g. Expo Go).
        try {
          const redirectHost = new URL(redirectUri).hostname;
          if (
            redirectHost === "localhost" ||
            redirectHost === "127.0.0.1" ||
            /^192\.168\.\d+\.\d+$/.test(redirectHost) ||
            /^10\.\d+\.\d+\.\d+$/.test(redirectHost)
          ) {
            authUrl.searchParams.set("device_id", state);
            authUrl.searchParams.set("device_name", "NutriSnap Dev");
          }
        } catch {
          // Ignore URL parse errors
        }
      }

      const result = await WebBrowser.openAuthSessionAsync(authUrl.toString(), redirectUri);

      if (result.type !== "success" || !result.url) {
        return;
      }

      const callbackUrl = new URL(result.url);
      const code = callbackUrl.searchParams.get("code");
      const returnedState = callbackUrl.searchParams.get("state");

      if (!code || returnedState !== state) {
        Alert.alert("Login Failed", "Invalid response from sign-in. Please try again.");
        return;
      }

      const exchangeRes = await fetch(`${apiBase}/api/mobile-auth/token-exchange`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          code_verifier: codeVerifier,
          redirect_uri: redirectUri,
          state,
          nonce,
        }),
      });

      if (!exchangeRes.ok) {
        const errBody = await exchangeRes.text();
        console.error("Token exchange failed:", exchangeRes.status, errBody);
        Alert.alert("Login Failed", "Could not complete sign-in. Please try again.");
        return;
      }

      const { token: sid } = (await exchangeRes.json()) as { token: string };

      await AsyncStorage.setItem(TOKEN_KEY, sid);
      setSyncToken(sid);
      if (tokenRef) tokenRef.current = sid;
      setToken(sid);
      const valid = await fetchUser(sid);
      if (!valid) {
        setSyncToken(null);
        if (tokenRef) tokenRef.current = null;
        await AsyncStorage.removeItem(TOKEN_KEY);
        setToken(null);
        Alert.alert("Login Failed", "Session could not be restored. Please try again.");
      }
    } catch (e) {
      console.error("Sign in error:", e);
      Alert.alert("Login Error", `Something went wrong: ${(e as Error).message ?? "Unknown error"}`);
    }
  }, [fetchUser, redirectUri, tokenRef]);

  const signOut = useCallback(async () => {
    try {
      if (Platform.OS === "web" && typeof window !== "undefined") {
        const returnTo = `${window.location.origin}/sign-in`;
        const logoutUrl = `${getApiBase()}/api/auth/logout?returnTo=${encodeURIComponent(returnTo)}`;
        // Clear local auth state first so logout always works client-side.
        await AsyncStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
        window.location.href = logoutUrl;
        return;
      }

      if (token) {
        await fetch(`${getApiBase()}/api/mobile-auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch (e) {
      console.error("Logout error:", e);
    }
    await AsyncStorage.removeItem(TOKEN_KEY);
    setSyncToken(null);
    setToken(null);
    setUser(null);
  }, [token]);

  return {
    token,
    user,
    isLoading,
    isAuthenticated: Platform.OS === "web" ? !!user : !!token && !!user,
    signIn,
    signOut,
  };
}
