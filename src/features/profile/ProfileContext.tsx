import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ProfileDraft } from "./profileTypes";
import type { OnboardingProgress, OnboardingStep } from "./onboardingState";
import { isProfileInfoValid } from "./onboardingState";
import { profileStorage } from "./profileStorage";
import { DICEBEAR_STYLES, type DicebearStyleId } from "../../avatars/dicebear_registry";
import { randomSeed } from "../../utils/random";
import { getProfile, putProfile } from "../../api/profileApi";
import { useAuth } from "../auth/AuthContext";

function firstDicebearStyleId(): DicebearStyleId {
  const first = Object.keys(DICEBEAR_STYLES)[0] as DicebearStyleId | undefined;
  // If the registry is empty, we still need a deterministic value for runtime;
  // this should be prevented by keeping at least one style in the registry.
  return first ?? ("pixelArt" as DicebearStyleId);
}

function isDicebearStyleId(value: unknown): value is DicebearStyleId {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(DICEBEAR_STYLES, value);
}

function normalizeDraft(input: Partial<ProfileDraft> | undefined): ProfileDraft {
  const rawAvatar = (input as any)?.avatar as any;
  const style = isDicebearStyleId(rawAvatar?.style) ? rawAvatar.style : firstDicebearStyleId();
  const seed =
    typeof rawAvatar?.seed === "string" && rawAvatar.seed.trim().length > 0
      ? rawAvatar.seed
      : randomSeed();

  return {
    displayName: input?.displayName ?? "",
    email: input?.email,
    avatar: {
      provider: "dicebear",
      style,
      seed,
    },
    intendedMajorId: input?.intendedMajorId ?? "UNDECIDED",
  };
}

function normalizeProgress(
  input: Partial<OnboardingProgress> | undefined,
): OnboardingProgress {
  return { step: input?.step ?? "profile" };
}

function hasProfileBasics(draft: ProfileDraft): boolean {
  return isProfileInfoValid(draft);
}

function hasAvatar(draft: ProfileDraft): boolean {
  return (
    draft.avatar.provider === "dicebear" &&
    isDicebearStyleId(draft.avatar.style) &&
    typeof draft.avatar.seed === "string" &&
    draft.avatar.seed.trim().length > 0
  );
}

function hasMajor(draft: ProfileDraft): boolean {
  // Treat "UNDECIDED" as a valid selection for completeness.
  return typeof (draft as any).intendedMajorId === "string" && draft.intendedMajorId.length > 0;
}

function isOnboardingCompleteDerived(draft: ProfileDraft): boolean {
  return hasProfileBasics(draft) && hasAvatar(draft) && hasMajor(draft);
}

function deriveStep(draft: ProfileDraft): OnboardingStep {
  if (!hasProfileBasics(draft)) return "profile";
  if (!hasAvatar(draft)) return "avatar";
  if (!hasMajor(draft)) return "major";
  return "done";
}

export type ProfileContextValue = {
  profileDraft: ProfileDraft;
  setProfileDraft: (
    partial: Partial<Omit<ProfileDraft, "avatar">> & {
      avatar?: { provider?: "dicebear"; style?: DicebearStyleId | string; seed?: string };
    },
  ) => void;
  resetProfile: () => void;

  // Derived gating helpers (do not depend on a mutable stored step).
  hasProfileBasics: () => boolean;
  hasAvatar: () => boolean;
  hasMajor: () => boolean;
  isOnboardingComplete: () => boolean;

  // Kept for backward-compat with earlier prompts; not used for gating.
  onboardingProgress: OnboardingProgress;
  setStep: (step: OnboardingStep) => void;
  isComplete: () => boolean;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider(props: { children: React.ReactNode }) {
  const auth = useAuth();

  const initialStoredRef = useRef<ReturnType<typeof profileStorage.load> | null>(null);
  if (!initialStoredRef.current) {
    let stored = profileStorage.load();
    const pathname =
      typeof window !== "undefined" && typeof window.location?.pathname === "string"
        ? window.location.pathname
        : "/";

    const rawDraft = stored.profileDraft as any;
    const storedBasics =
      rawDraft &&
      typeof rawDraft.displayName === "string" &&
      isProfileInfoValid({ displayName: rawDraft.displayName });
    const storedAvatar =
      rawDraft?.avatar?.provider === "dicebear" &&
      typeof rawDraft.avatar?.style === "string" &&
      typeof rawDraft.avatar?.seed === "string" &&
      rawDraft.avatar.seed.trim().length > 0;
    // Treat "UNDECIDED" as selected for completeness.
    const storedMajor = typeof rawDraft?.intendedMajorId === "string" && rawDraft.intendedMajorId.length > 0;
    const storedComplete = storedBasics && storedAvatar && storedMajor;

    // Reset drafts on refresh for onboarding/login routes, but allow deep-link refresh
    // when prerequisites for that route already exist.
    const isLoginRoute = pathname === "/login";
    const isOnboardingRoute = pathname.startsWith("/onboarding");
    const isAvatarRoute = pathname === "/onboarding/avatar";
    const isMajorRoute = pathname === "/onboarding/major";

    const allowContinueFromStorage =
      storedComplete ||
      (isAvatarRoute && storedBasics) ||
      (isMajorRoute && storedBasics && storedAvatar);

    const shouldReset = (isLoginRoute || isOnboardingRoute) && !allowContinueFromStorage;

    if (shouldReset) {
      profileStorage.clear();
      stored = profileStorage.load();
    }

    initialStoredRef.current = stored;
  }
  const stored = initialStoredRef.current;

  const [profileDraft, setProfileDraftState] = useState<ProfileDraft>(() => {
    const next = normalizeDraft(stored.profileDraft);
    profileStorage.saveProfileDraft(next);
    return next;
  });
  const [onboardingProgress, setOnboardingProgressState] =
    useState<OnboardingProgress>(() => {
      const next = normalizeProgress(stored.onboardingProgress);
      profileStorage.saveOnboardingProgress(next);
      return next;
    });

  const isHydratingFromServerRef = useRef(false);
  const hydratedForUsernameRef = useRef<string | null>(null);
  const saveInFlightRef = useRef(false);
  const pendingSaveDraftRef = useRef<ProfileDraft | null>(null);
  const lastSavedSignatureRef = useRef<string | null>(null);

  function serverSignature(draft: ProfileDraft): string {
    // Deterministic payload used for "did we already save this exact profile?"
    return JSON.stringify({
      displayName: draft.displayName,
      email: draft.email ?? null,
      intendedMajorId: draft.intendedMajorId,
      avatar: {
        provider: "dicebear",
        style: draft.avatar.style,
        seed: draft.avatar.seed,
      },
    });
  }

  function shouldPersistToServer(
    partial: Partial<Omit<ProfileDraft, "avatar">> & {
      avatar?: { provider?: "dicebear"; style?: DicebearStyleId | string; seed?: string };
    },
  ): boolean {
    // Avoid spamming on keystroke-style updates; we treat these as "commit-like":
    // - profile basics saved together (displayName + email)
    // - avatar randomize/cycle
    // - intended major selection
    const touchesAvatar = Boolean(partial.avatar);
    const touchesMajor = Object.prototype.hasOwnProperty.call(partial as any, "intendedMajorId");
    const touchesBasics =
      Object.prototype.hasOwnProperty.call(partial as any, "displayName") ||
      Object.prototype.hasOwnProperty.call(partial as any, "email");
    return touchesAvatar || touchesMajor || touchesBasics;
  }

  async function flushServerSaveQueue(): Promise<void> {
    if (saveInFlightRef.current) return;
    saveInFlightRef.current = true;
    try {
      while (pendingSaveDraftRef.current) {
        const draft = pendingSaveDraftRef.current;
        pendingSaveDraftRef.current = null;

        const sig = serverSignature(draft);
        if (lastSavedSignatureRef.current === sig) continue;

        try {
          await putProfile(draft);
          lastSavedSignatureRef.current = sig;
        } catch (err) {
          // Keep onboarding functional even when the server isn't ready (404) or user is not authed (401).
          // Next "commit-like" change will retry.
          break;
        }
      }
    } finally {
      saveInFlightRef.current = false;
    }
  }

  function queueServerSave(draft: ProfileDraft): void {
    if (isHydratingFromServerRef.current) return;
    if (!(auth.mode === "user" || auth.mode === "admin")) return;
    if (!auth.me?.username) return;

    const sig = serverSignature(draft);
    if (lastSavedSignatureRef.current === sig) return;

    pendingSaveDraftRef.current = draft;
    void flushServerSaveQueue();
  }

  useEffect(() => {
    if (!(auth.mode === "user" || auth.mode === "admin")) {
      hydratedForUsernameRef.current = null;
      return;
    }
    const username = auth.me?.username;
    if (!username) return;

    if (hydratedForUsernameRef.current === username) return;
    hydratedForUsernameRef.current = username;

    (async () => {
      try {
        const serverProfile = await getProfile();
        if (!serverProfile) return;

        isHydratingFromServerRef.current = true;
        setProfileDraftState((prev) => {
          const next = normalizeDraft({
            ...prev,
            displayName: serverProfile.displayName,
            email: serverProfile.email,
            intendedMajorId: serverProfile.intendedMajorId as any,
            avatar: serverProfile.avatar ?? prev.avatar,
          });

          profileStorage.saveProfileDraft(next);

          // This prevents immediately re-sending the same payload back to the server.
          lastSavedSignatureRef.current = serverSignature(next);
          return next;
        });
      } catch (err) {
        // If the endpoint doesn't exist yet (404) or any other failure occurs,
        // keep local onboarding functional and treat it as "no server profile".
        void err;
      } finally {
        isHydratingFromServerRef.current = false;
      }
    })();
  }, [auth.me?.username, auth.mode]);

  const value = useMemo<ProfileContextValue>(() => {
    const derivedProgress: OnboardingProgress = { step: deriveStep(profileDraft) };

    return {
      profileDraft,
      setProfileDraft(partial) {
        const prev = profileDraft;
        const nextStyle =
          partial.avatar && "style" in partial.avatar
            ? isDicebearStyleId(partial.avatar.style)
              ? partial.avatar.style
              : firstDicebearStyleId()
            : prev.avatar.style;

        const nextSeed =
          partial.avatar && "seed" in partial.avatar
            ? typeof partial.avatar.seed === "string" && partial.avatar.seed.trim().length > 0
              ? partial.avatar.seed
              : randomSeed()
            : prev.avatar.seed;

        const next: ProfileDraft = {
          ...prev,
          ...partial,
          avatar: { provider: "dicebear", style: nextStyle, seed: nextSeed },
        };

        setProfileDraftState(next);
        profileStorage.saveProfileDraft(next);

        if (shouldPersistToServer(partial)) {
          queueServerSave(next);
        }
      },
      resetProfile() {
        profileStorage.clear();
        const fresh = normalizeDraft(undefined);
        const progress = normalizeProgress(undefined);
        setProfileDraftState(fresh);
        setOnboardingProgressState(progress);
        profileStorage.saveProfileDraft(fresh);
        profileStorage.saveOnboardingProgress(progress);
      },

      hasProfileBasics() {
        return hasProfileBasics(profileDraft);
      },
      hasAvatar() {
        return hasAvatar(profileDraft);
      },
      hasMajor() {
        return hasMajor(profileDraft);
      },
      isOnboardingComplete() {
        return isOnboardingCompleteDerived(profileDraft);
      },

      onboardingProgress: derivedProgress,
      setStep(step) {
        setOnboardingProgressState(() => {
          const next: OnboardingProgress = { step };
          profileStorage.saveOnboardingProgress(next);
          return next;
        });
      },
      isComplete() {
        return isOnboardingCompleteDerived(profileDraft);
      },
    };
  }, [auth.me?.username, auth.mode, profileDraft]);

  return <ProfileContext.Provider value={value}>{props.children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) {
    throw new Error("useProfile must be used within a ProfileProvider");
  }
  return ctx;
}
