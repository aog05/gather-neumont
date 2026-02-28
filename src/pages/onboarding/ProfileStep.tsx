import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { putProfile } from "../../api/profileApi";
import NeumontPanelShell from "../../components/NeumontPanelShell";
import { useAuth } from "../../features/auth/AuthContext";
import { useProfile } from "../../features/profile/ProfileContext";

export default function ProfileStep() {
  const auth = useAuth();
  const profile = useProfile();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState(profile.profileDraft.displayName);
  const [email, setEmail] = useState(profile.profileDraft.email ?? "");

  const canContinue = useMemo(() => {
    return displayName.trim().length > 0;
  }, [displayName]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canContinue) return;

    const nextDraft = {
      ...profile.profileDraft,
      displayName: displayName.trim(),
      email: email.trim() ? email.trim() : undefined,
    };

    profile.setProfileDraft({
      displayName: nextDraft.displayName,
      email: nextDraft.email,
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
    <NeumontPanelShell title="Your Profile" maxWidth={560}>
      <p className="quest-menu-auth-subtitle">
        Tell us a bit about yourself to get started.
      </p>

      <form onSubmit={onSubmit} className="quest-menu-auth-form">
        <div className="quest-menu-auth-field">
          <label htmlFor="displayName" className="quest-menu-auth-label">Display Name</label>
          <input
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Alex"
            className="quest-menu-auth-input"
          />
        </div>

        <div className="quest-menu-auth-field">
          <label htmlFor="email" className="quest-menu-auth-label">Email (Optional)</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="alex@example.com"
            autoComplete="email"
            className="quest-menu-auth-input"
          />
        </div>

        <div className="quest-menu-action-group">
          <button
            type="submit"
            disabled={!canContinue}
            className="quest-menu-action-btn quest-menu-action-btn--primary"
          >
            Continue
          </button>
        </div>
      </form>
    </NeumontPanelShell>
  );
}
