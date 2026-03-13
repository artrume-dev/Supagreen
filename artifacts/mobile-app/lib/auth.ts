import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthRequest, makeRedirectUri } from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

WebBrowser.maybeCompleteAuthSession();

const TOKEN_KEY = "nutrisnap_session_token";
const ISSUER_URL = "https://replit.com/oidc";

const discovery = {
  authorizationEndpoint: `${ISSUER_URL}/auth`,
  tokenEndpoint: `${ISSUER_URL}/token`,
};

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

export { AuthContext };

export function useAuthProvider(): AuthState {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const redirectUri = makeRedirectUri({
    scheme: "mobile-app",
    path: "auth/callback",
  });

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

      const request = new AuthRequest({
        clientId: replId,
        redirectUri,
        scopes: ["openid", "email", "profile", "offline_access"],
        usePKCE: true,
        extraParams: {
          prompt: "login consent",
        },
      });

      const result = await request.promptAsync(discovery);

      if (result.type !== "success" || !result.params?.code) return;

      const exchangeRes = await fetch(`${apiBase}/api/mobile-auth/token-exchange`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: result.params.code,
          code_verifier: request.codeVerifier,
          redirect_uri: redirectUri,
          state: request.state,
          nonce: request.extraParams?.nonce,
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
  }, [fetchUser, redirectUri]);

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
