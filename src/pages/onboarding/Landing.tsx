import { useNavigate } from "react-router-dom";
import { NEUMONT_LOGO } from "../../config/assets";
import { useAuth } from "../../features/auth/AuthContext";
import { useProfile } from "../../features/profile/ProfileContext";
import "../../styles/auth-onboarding.css";

export default function OnboardingLanding() {
  const auth = useAuth();
  const profile = useProfile();
  const navigate = useNavigate();

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-container">
        <div className="logo-display">
          <img
            src={NEUMONT_LOGO}
            alt="Neumont logo"
            className="logo-image"
          />
        </div>

        <h1 className="onboarding-heading">Welcome to Gather</h1>
        <p className="onboarding-description">
          Complete your profile in three quick steps: profile info, avatar, and major selection.
        </p>

        <div className="button-group" style={{ marginTop: 20 }}>
          <button
            onClick={() => navigate("/sign-in")}
            className="btn btn-primary"
          >
            Sign in
          </button>

          <button
            onClick={() => navigate("/create-account")}
            className="btn btn-secondary"
          >
            Create account
          </button>

          <button
            onClick={() => {
              auth.continueAsGuest();
              profile.resetProfile();
              navigate("/onboarding/profile");
            }}
            className="btn btn-ghost"
          >
            Continue as guest
          </button>
        </div>

        <div className="auth-mode-indicator">
          Current mode: <span className="auth-mode-value">{auth.mode}</span>
        </div>
      </div>
    </div>
  );
}
