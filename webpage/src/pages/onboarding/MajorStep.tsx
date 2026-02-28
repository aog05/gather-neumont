import { useNavigate } from "react-router-dom";
import { putProfile } from "../../api/profileApi";
import NeumontPanelShell from "../../components/NeumontPanelShell";
import { MAJORS } from "../../config/majors";
import { useAuth } from "../../features/auth/AuthContext";
import { useProfile } from "../../features/profile/ProfileContext";

export default function MajorStep() {
  const auth = useAuth();
  const profile = useProfile();
  const navigate = useNavigate();

  const selected = profile.profileDraft.intendedMajorId;
  const canFinish = profile.hasProfileBasics() && profile.hasAvatar() && profile.hasMajor();

  return (
    <NeumontPanelShell title="Select Your Major" maxWidth={560}>
      <p className="quest-menu-auth-subtitle">
        Choose your intended major. You can change this later in your profile settings.
      </p>

      <div className="quest-menu-major-grid">
        {MAJORS.map((m) => {
          const isSelected = m.id === selected;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => profile.setProfileDraft({ intendedMajorId: m.id })}
              className={`quest-menu-major-card ${isSelected ? "selected" : ""}`}
            >
              <img
                src={m.logoPath}
                alt={`${m.label} icon`}
                className="quest-menu-major-icon"
              />
              <div className="quest-menu-major-label">{m.label}</div>
            </button>
          );
        })}
      </div>

      <div className="quest-menu-action-group" style={{ marginTop: 20 }}>
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
          className="quest-menu-action-btn quest-menu-action-btn--primary"
        >
          Complete Setup
        </button>
      </div>
    </NeumontPanelShell>
  );
}
