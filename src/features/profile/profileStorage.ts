import type { ProfileDraft } from "./profileTypes";
import type { OnboardingProgress } from "./onboardingState";

const PROFILE_DRAFT_KEY = "happy-volhard.profileDraft.v1";
const ONBOARDING_PROGRESS_KEY = "happy-volhard.onboardingProgress.v1";

export type StoredProfileState = {
  profileDraft?: ProfileDraft;
  onboardingProgress?: OnboardingProgress;
};

function readJson<T>(key: string): T | undefined {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return undefined;
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

function writeJson(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function shouldResetOnboardingOnLoad(
  pathname: string,
  progress: OnboardingProgress | undefined,
): boolean {
  const isOnboardingRoute = pathname.startsWith("/onboarding") || pathname === "/login";
  if (!isOnboardingRoute) return false;

  // Never wipe an already-completed profile; only restart incomplete onboarding drafts.
  return progress?.step !== "done";
}

export const profileStorage = {
  keys: {
    profileDraft: PROFILE_DRAFT_KEY,
    onboardingProgress: ONBOARDING_PROGRESS_KEY,
  },

  load(): StoredProfileState {
    return {
      profileDraft: readJson<ProfileDraft>(PROFILE_DRAFT_KEY),
      onboardingProgress: readJson<OnboardingProgress>(ONBOARDING_PROGRESS_KEY),
    };
  },

  loadDraft(): ProfileDraft | undefined {
    return readJson<ProfileDraft>(PROFILE_DRAFT_KEY);
  },

  loadProgress(): OnboardingProgress | undefined {
    return readJson<OnboardingProgress>(ONBOARDING_PROGRESS_KEY);
  },

  saveProfileDraft(draft: ProfileDraft): void {
    writeJson(PROFILE_DRAFT_KEY, draft);
  },

  saveOnboardingProgress(progress: OnboardingProgress): void {
    writeJson(ONBOARDING_PROGRESS_KEY, progress);
  },

  clear(): void {
    localStorage.removeItem(PROFILE_DRAFT_KEY);
    localStorage.removeItem(ONBOARDING_PROGRESS_KEY);
  },
};
