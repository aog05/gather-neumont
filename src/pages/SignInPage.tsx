import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
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

export default function SignInPage() {
  const auth = useAuth();
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
      if (!exists) {
        setError("No account found. Use Create account.");
        return;
      }

      await auth.login(trimmed);
      const refreshed = await auth.refresh();
      if (refreshed?.profileComplete) {
        navigate("/");
      } else {
        navigate("/onboarding/profile");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="auth-overlay">
      <div className="auth-container">
        <h1 className="auth-heading">Sign in</h1>
        <p className="auth-description">
          Enter your username.
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
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="auth-footer">
          <p className="auth-link">
            Don't have an account?{" "}
            <Link to="/create-account" className="auth-link-button">
              Create account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
