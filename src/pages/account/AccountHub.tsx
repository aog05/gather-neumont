import { useNavigate } from "react-router-dom";
import { useAuth } from "../../features/auth/AuthContext";
import { useProfile } from "../../features/profile/ProfileContext";
import "../../styles/auth-onboarding.css";

export default function AccountHub() {
  const auth = useAuth();
  const profile = useProfile();
  const navigate = useNavigate();

  const username = auth.me?.username?.trim() ? auth.me.username : "Guest";
  const draft = profile.profileDraft;

  return (
    <div className="account-overlay">
      <div className="account-container">
        <h1 className="account-heading">Account Settings</h1>
        <p className="account-description">
          {auth.me?.username ? `Logged in as ${username}` : "Guest — progress not saved"}
        </p>

        <div className="account-nav-cards">
          <button
            type="button"
            onClick={() => navigate("/account/profile")}
            className="account-nav-card"
          >
            <div className="account-nav-card-title">Edit Profile</div>
            <div className="account-nav-card-value">
              {draft.displayName?.trim() ? draft.displayName : "—"}
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigate("/account/avatar")}
            className="account-nav-card"
          >
            <div className="account-nav-card-title">Edit Avatar</div>
            <div className="account-nav-card-value">
              {draft.avatar?.provider === "dicebear"
                ? `${String(draft.avatar.style)} · ${String(draft.avatar.seed)}`
                : "—"}
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigate("/account/major")}
            className="account-nav-card"
          >
            <div className="account-nav-card-title">Edit Major</div>
            <div className="account-nav-card-value">
              {String(draft.intendedMajorId ?? "—")}
            </div>
          </button>
        </div>

        <div className="account-actions-inline">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="btn btn-primary"
          >
            Back to Game
          </button>
        </div>
      </div>
    </div>
  );
}
