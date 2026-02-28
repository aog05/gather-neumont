import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import NeumontPanelShell from "../components/NeumontPanelShell";
import { useAuth } from "../features/auth/AuthContext";

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
    <NeumontPanelShell title="Sign In" maxWidth={560}>
      <p className="quest-menu-auth-subtitle">
        Enter your Neumont username to continue.
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
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </div>
      </form>

      <div className="quest-menu-auth-footer">
        <p className="quest-menu-auth-link-text">
          Don't have an account?{" "}
          <Link to="/create-account" className="quest-menu-auth-link">
            Create account
          </Link>
        </p>
      </div>
    </NeumontPanelShell>
  );
}
