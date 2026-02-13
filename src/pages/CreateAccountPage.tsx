import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { useProfile } from "../features/profile/ProfileContext";
import { profileStorage } from "../features/profile/profileStorage";
import "../styles/auth-onboarding.css";

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
    <div className="auth-overlay">
      <div className="auth-container">
        <h1 className="auth-heading">Create account</h1>
        <p className="auth-description">
          Choose a username.
        </p>

        <form onSubmit={onSubmit} className="auth-form">
          <div className="form-field">
            <label htmlFor="username" className="form-label">Username</label>
            <input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="your_name"
              autoComplete="username"
              className="form-input"
            />
          </div>

          {error && (
            <div className="form-error">{error}</div>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className={`btn btn-primary ${isSubmitting ? "is-loading" : ""}`}
          >
            {isSubmitting ? "Creating..." : "Create account"}
          </button>
        </form>

        <div className="auth-footer">
          <p className="auth-link">
            Already have an account?{" "}
            <Link to="/sign-in" className="auth-link-button">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
