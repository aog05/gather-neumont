import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { putProfile } from "../../api/profileApi";
import { useAuth } from "../../features/auth/AuthContext";
import { useProfile } from "../../features/profile/ProfileContext";
import "../../styles/auth-onboarding.css";

export default function EditProfile() {
  const auth = useAuth();
  const profile = useProfile();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState(profile.profileDraft.displayName);
  const [email, setEmail] = useState(profile.profileDraft.email ?? "");

  const canSave = useMemo(() => {
    return displayName.trim().length > 0;
  }, [displayName]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSave) return;

    const nextDraft = {
      ...profile.profileDraft,
      displayName: displayName.trim(),
      email: email.trim() ? email.trim() : undefined,
    };

    profile.setProfileDraft({
      displayName: nextDraft.displayName,
      email: nextDraft.email,
    });

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
        // Non-blocking: ignore errors and return to hub.
      });
    }

    navigate("/account");
  }

  return (
    <div className="account-overlay">
      <div className="account-container">
        <h1 className="account-heading">Edit Profile</h1>
        <p className="account-description">
          Update your display name and email address.
        </p>

        <form onSubmit={onSubmit} className="account-form">
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

          <div className="form-field">
            <label htmlFor="email" className="form-label">Email (optional)</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex@example.com"
              autoComplete="email"
              className="form-input"
            />
          </div>

          <div className="account-actions">
            <button
              type="submit"
              disabled={!canSave}
              className="btn btn-primary"
            >
              Save Changes
            </button>

            <button
              type="button"
              onClick={() => navigate("/account")}
              className="btn btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
