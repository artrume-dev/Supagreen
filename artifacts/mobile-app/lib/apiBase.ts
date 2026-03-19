import Constants from "expo-constants";
import { Platform } from "react-native";

function stripTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function getHostFromDebugConfig(): string | null {
  const hostCandidates = [
    process.env.REACT_NATIVE_PACKAGER_HOSTNAME ?? null,
    (Constants.expoConfig as { hostUri?: string } | null)?.hostUri ?? null,
    (Constants as unknown as { expoGoConfig?: { debuggerHost?: string } }).expoGoConfig
      ?.debuggerHost ?? null,
    (Constants as unknown as { manifest2?: { extra?: { expoClient?: { hostUri?: string } } } })
      .manifest2?.extra?.expoClient?.hostUri ?? null,
    (Constants as unknown as { manifest?: { debuggerHost?: string } }).manifest?.debuggerHost ??
      null,
  ];

  const hostUri = hostCandidates.find(
    (candidate): candidate is string => typeof candidate === "string" && candidate.length > 0,
  );

  if (!hostUri) return null;
  return hostUri.split(":")[0] || null;
}

function isLoopbackHost(host: string): boolean {
  const normalized = host.trim().toLowerCase();
  return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1";
}

function toParsedUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

export function getApiBase(): string {
  const explicitBase = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (explicitBase && explicitBase.trim()) {
    const explicit = stripTrailingSlash(explicitBase.trim());
    const parsed = toParsedUrl(explicit);

    if (Platform.OS !== "web" && parsed && isLoopbackHost(parsed.hostname)) {
      const debugHost = getHostFromDebugConfig();
      if (debugHost && !isLoopbackHost(debugHost)) {
        return `http://${debugHost}:3001`;
      }
    }

    return explicit;
  }

  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain && domain.trim()) {
    return `https://${domain.trim()}`;
  }

  if (Platform.OS === "web" && typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:3001`;
  }

  const host = getHostFromDebugConfig();
  if (host && !isLoopbackHost(host)) {
    return `http://${host}:3001`;
  }

  return "";
}
