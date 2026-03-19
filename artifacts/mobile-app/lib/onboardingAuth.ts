import AsyncStorage from "@react-native-async-storage/async-storage";

export const ONBOARDING_PROGRESS_STORAGE_KEY = "nutrisnap_onboarding_progress";
const PENDING_ONBOARDING_PROFILE_KEY = "nutrisnap_pending_onboarding_profile";

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
  await AsyncStorage.setItem(PENDING_ONBOARDING_PROFILE_KEY, JSON.stringify(payload));
}

export async function getPendingOnboardingProfile(): Promise<PendingOnboardingProfile | null> {
  const raw = await AsyncStorage.getItem(PENDING_ONBOARDING_PROFILE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PendingOnboardingProfile;
  } catch {
    return null;
  }
}

export async function clearPendingOnboardingProfile(): Promise<void> {
  await AsyncStorage.removeItem(PENDING_ONBOARDING_PROFILE_KEY);
}
