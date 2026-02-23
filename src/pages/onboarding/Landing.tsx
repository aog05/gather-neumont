import { useNavigate } from "react-router-dom";
import { NEUMONT_LOGO } from "../../config/assets";
import NeumontPanelShell from "../../components/NeumontPanelShell";
import { useAuth } from "../../features/auth/AuthContext";
import { useProfile } from "../../features/profile/ProfileContext";
import "../../styles/auth-onboarding.css";

export default function OnboardingLanding() {
  const auth = useAuth();
  const profile = useProfile();
  const navigate = useNavigate();

  return (
    <NeumontPanelShell
      title="Welcome to Neumont University"
      maxWidth={560}
    >
      <div className="logo-display">
        <img
          src={NEUMONT_LOGO}
          alt="Neumont logo"
          className="logo-image"
        />
      </div>

      <p className="onboarding-description">
        Complete your profile in three quick steps: profile info, avatar, and major selection.
      </p>

      <div className="quest-menu-action-group" style={{ marginTop: 20 }}>
        <button
          onClick={() => navigate("/sign-in")}
          className="quest-menu-action-btn quest-menu-action-btn-primary"
        >
          Sign in
        </button>

        <button
          onClick={() => navigate("/create-account")}
          className="quest-menu-action-btn"
        >
          Create account
        </button>

        <button
          onClick={() => {
            auth.continueAsGuest();
            profile.resetProfile();
            navigate("/onboarding/profile");
          }}
          className="quest-menu-action-btn quest-menu-action-btn-ghost"
        >
          Continue as guest
        </button>
      </div>
    </NeumontPanelShell>
  );
}
