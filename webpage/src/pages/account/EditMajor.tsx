import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { putProfile } from "../../api/profileApi";
import { MAJORS } from "../../config/majors";
import { useAuth } from "../../features/auth/AuthContext";
import { useProfile } from "../../features/profile/ProfileContext";
import "../../styles/auth-onboarding.css";

export default function EditMajor() {
  const auth = useAuth();
  const profile = useProfile();
  const navigate = useNavigate();

  const selected = profile.profileDraft.intendedMajorId;
  const canSave = useMemo(() => profile.hasMajor(), [profile, selected]);

  async function handleSave() {
    profile.setProfileDraft({ intendedMajorId: selected });

    if (auth.mode === "user" || auth.mode === "admin") {
      const nextDraft = { ...profile.profileDraft, intendedMajorId: selected };
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
      <div className="account-container wide">
        <h1 className="account-heading">Edit Major</h1>
        <p className="account-description">
          Select your intended major. You can change this anytime.
        </p>

        <div className="major-grid">
          {MAJORS.map((m) => {
            const isSelected = m.id === selected;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => profile.setProfileDraft({ intendedMajorId: m.id })}
                className={`major-card ${isSelected ? "selected" : ""}`}
              >
                <img
                  src={m.logoPath}
                  alt={`${m.label} icon`}
                  className="major-icon"
                />
                <div className="major-label">{m.label}</div>
              </button>
            );
          })}
        </div>

        <div className="account-actions" style={{ marginTop: 20 }}>
          <button
            type="button"
            onClick={handleSave}
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
      </div>
    </div>
  );
}
