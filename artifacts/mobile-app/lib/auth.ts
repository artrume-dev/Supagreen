import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import * as AuthSession from "expo-web-browser";
import { Platform } from "react-native";

const TOKEN_KEY = "nutrisnap_session_token";
const ISSUER_URL = "https://replit.com/oidc";

function getApiBase(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (!domain) return "";
  return `https://${domain}`;
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

function generateRandom(length: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function sha256(plain: string): Promise<string> {
  if (Platform.OS === "web") {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    const hash = await crypto.subtle.digest("SHA-256", data);
    return btoa(String.fromCharCode(...new Uint8Array(hash)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  const hash = await globalThis.crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export { AuthContext };

export function useAuthProvider(): AuthState {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = useCallback(async (sessionToken: string) => {
    try {
      const res = await fetch(`${getApiBase()}/api/me`, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setUser(data.user);
          return true;
        }
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
            setToken(stored);
          } else {
            await AsyncStorage.removeItem(TOKEN_KEY);
          }
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
      const replId = process.env.EXPO_PUBLIC_REPL_ID || "";
      const redirectUri = `${apiBase}/api/callback`;
      const state = generateRandom(32);
      const nonce = generateRandom(32);
      const codeVerifier = generateRandom(64);
      const codeChallenge = await sha256(codeVerifier);

      const params = new URLSearchParams({
        client_id: replId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "openid email profile offline_access",
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
        prompt: "login consent",
        state,
        nonce,
      });

      const authUrl = `${ISSUER_URL}/auth?${params.toString()}`;
      const result = await AuthSession.openBrowserAsync(authUrl, {
        showInRecents: true,
      });

      if (result.type === "cancel") return;

      const url = new URL(result.url || "");
      const code = url.searchParams.get("code");
      if (!code) return;

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

      if (exchangeRes.ok) {
        const data = await exchangeRes.json();
        if (data.token) {
          await AsyncStorage.setItem(TOKEN_KEY, data.token);
          setToken(data.token);
          await fetchUser(data.token);
        }
      }
    } catch (e) {
      console.error("Sign in error:", e);
    }
  }, [fetchUser]);

  const signOut = useCallback(async () => {
    try {
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
    setToken(null);
    setUser(null);
  }, [token]);

  return {
    token,
    user,
    isLoading,
    isAuthenticated: !!token && !!user,
    signIn,
    signOut,
  };
}
