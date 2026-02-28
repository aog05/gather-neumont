import { useNavigate } from "react-router-dom";
import { putProfile } from "../../api/profileApi";
import { MAJORS } from "../../config/majors";
import { useAuth } from "../../features/auth/AuthContext";
import { useProfile } from "../../features/profile/ProfileContext";
import "../../styles/auth-onboarding.css";

export default function MajorStep() {
  const auth = useAuth();
  const profile = useProfile();
  const navigate = useNavigate();

  const selected = profile.profileDraft.intendedMajorId;
  const canFinish = profile.hasProfileBasics() && profile.hasAvatar() && profile.hasMajor();

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-container">
        <h1 className="onboarding-heading">Select Your Major</h1>
        <p className="onboarding-description">
          Choose your intended major. You can change this later in your profile settings.
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

        <button
          type="button"
          onClick={async () => {
            if (!profile.hasProfileBasics()) {
              navigate("/onboarding/profile");
              return;
            }
            if (!profile.hasAvatar()) {
              navigate("/onboarding/avatar");
              return;
            }
            if (!profile.hasMajor()) {
              return;
            }

            if (auth.mode === "user" || auth.mode === "admin") {
              const nextDraft = { ...profile.profileDraft, intendedMajorId: selected };
              profile.setProfileDraft({ intendedMajorId: selected });
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
            } else {
              // Still ensure final selection is applied locally for guests.
              profile.setProfileDraft({ intendedMajorId: selected });
            }
            navigate("/");
          }}
          disabled={!canFinish}
          className="btn btn-primary"
          style={{ marginTop: 20, width: "100%" }}
        >
          Complete Setup
        </button>
      </div>
    </div>
  );
}
