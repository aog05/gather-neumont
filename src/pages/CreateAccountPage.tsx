import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import NeumontPanelShell from "../components/NeumontPanelShell";
import { useAuth } from "../features/auth/AuthContext";
import { useProfile } from "../features/profile/ProfileContext";
import { profileStorage } from "../features/profile/profileStorage";

async function fetchUsernameExists(username: string): Promise<boolean> {
  const trimmed = username.trim();
  const res = await fetch(`/api/auth/exists?username=${encodeURIComponent(trimmed)}`, {
    method: "GET",
    credentials: "include",
  });

  if (!res.ok) {
    let message = `Username check failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.error) message = String(data.error);
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  const data = (await res.json()) as { exists?: unknown };
  return Boolean(data?.exists);
}

export default function CreateAccountPage() {
  const auth = useAuth();
  const profile = useProfile();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(
    () => username.trim().length > 0 && !isSubmitting,
    [isSubmitting, username],
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    const trimmed = username.trim();
    setIsSubmitting(true);
    setError(null);

    try {
      const exists = await fetchUsernameExists(trimmed);
      if (exists) {
        setError("Account exists. Use Sign in.");
        return;
      }

      await auth.login(trimmed);

      // Ensure onboarding starts fresh for newly-created accounts.
      profileStorage.clear();
      profile.resetProfile();

      navigate("/onboarding/profile");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create account failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <NeumontPanelShell title="Create Account" maxWidth={560}>
      <p className="quest-menu-auth-subtitle">
        Create your Neumont account with a username.
      </p>

      <form onSubmit={onSubmit} className="quest-menu-auth-form">
        <div className="quest-menu-auth-field">
          <label htmlFor="username" className="quest-menu-auth-label">Username</label>
          <input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="your_name"
            autoComplete="username"
            className="quest-menu-auth-input"
          />
        </div>

        {error && (
          <div className="quest-menu-auth-error">{error}</div>
        )}

        <div className="quest-menu-action-group">
          <button
            type="submit"
            disabled={!canSubmit}
            className="quest-menu-action-btn quest-menu-action-btn--primary"
          >
            {isSubmitting ? "Creating..." : "Create account"}
          </button>
        </div>
      </form>

      <div className="quest-menu-auth-footer">
        <p className="quest-menu-auth-link-text">
          Already have an account?{" "}
          <Link to="/sign-in" className="quest-menu-auth-link">
            Sign in
          </Link>
        </p>
      </div>
    </NeumontPanelShell>
  );
}
