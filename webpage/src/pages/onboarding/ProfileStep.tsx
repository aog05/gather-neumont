import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { putProfile } from "../../api/profileApi";
import { useAuth } from "../../features/auth/AuthContext";
import { useProfile } from "../../features/profile/ProfileContext";
import "../../styles/auth-onboarding.css";

export default function ProfileStep() {
  const auth = useAuth();
  const profile = useProfile();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState(profile.profileDraft.displayName);

  const canContinue = useMemo(() => {
    return displayName.trim().length > 0;
  }, [displayName]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canContinue) return;

    const nextDraft = {
      ...profile.profileDraft,
      displayName: displayName.trim(),
    };

    profile.setProfileDraft({
      displayName: nextDraft.displayName,
    });

    // Guests never call the server. Logged-in users can attempt a save, but it must not block onboarding.
    if (auth.mode === "user" || auth.mode === "admin") {
      void putProfile({
        displayName: nextDraft.displayName,
        email: nextDraft.email,
        intendedMajorId: nextDraft.intendedMajorId,
        avatar: {
          provider: "dicebear",
          style: String(nextDraft.avatar.style),
          seed: String(nextDraft.avatar.seed),
        },
      }).catch(() => {
        // Non-blocking: ignore errors and continue onboarding.
      });
    }

    navigate("/onboarding/avatar");
  }

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-container">
        <h1 className="onboarding-heading">Your Profile</h1>
        <p className="onboarding-description">
          Tell us a bit about yourself to get started.
        </p>

        <form onSubmit={onSubmit} className="onboarding-form">
          <div className="form-field">
            <label htmlFor="displayName" className="form-label">Display name</label>
            <input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Alex"
              className="form-input"
            />
          </div>

          <button
            type="submit"
            disabled={!canContinue}
            className="btn btn-primary"
          >
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}
