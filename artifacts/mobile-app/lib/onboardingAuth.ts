import * as SecureStore from "expo-secure-store";

export const ONBOARDING_PROGRESS_STORAGE_KEY = "recipegenie_onboarding_progress";
const PENDING_ONBOARDING_PROFILE_KEY = "recipegenie_pending_onboarding_profile";

export interface PendingOnboardingProfile {
  tempSessionId: string;
  dietType: string;
  allergies: string[];
  healthGoal: string;
  skillLevel: string;
  caloriesTarget: number;
  city?: string;
  country?: string;
  lat?: number;
  lng?: number;
  createdAtIso: string;
}

export async function savePendingOnboardingProfile(
  payload: PendingOnboardingProfile,
): Promise<void> {
  await SecureStore.setItemAsync(PENDING_ONBOARDING_PROFILE_KEY, JSON.stringify(payload));
}

export async function getPendingOnboardingProfile(): Promise<PendingOnboardingProfile | null> {
  const raw = await SecureStore.getItemAsync(PENDING_ONBOARDING_PROFILE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PendingOnboardingProfile;
  } catch {
    return null;
  }
}

export async function clearPendingOnboardingProfile(): Promise<void> {
  await SecureStore.deleteItemAsync(PENDING_ONBOARDING_PROFILE_KEY);
}
