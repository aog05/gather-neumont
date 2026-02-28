import { createAvatar } from "@dicebear/core";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MAJORS } from "../../config/majors";
import { DICEBEAR_STYLES } from "../../avatars/dicebear_registry";
import { useAuth } from "../../features/auth/AuthContext";
import { useProfile } from "../../features/profile/ProfileContext";
import "../../styles/auth-onboarding.css";

export default function ProfileHUD() {
  const auth = useAuth();
  const profile = useProfile();
  const navigate = useNavigate();

  const username = auth.me?.username?.trim() ? auth.me.username : "Guest";
  const draft = profile.profileDraft;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);

  const majorLabel = useMemo(() => {
    const hit = MAJORS.find((m) => m.id === draft.intendedMajorId);
    return hit?.label ?? String(draft.intendedMajorId ?? "");
  }, [draft.intendedMajorId]);

  const avatarSvg = useMemo(() => {
    const avatar = draft.avatar;
    if (!avatar || avatar.provider !== "dicebear") return null;

    const style = (DICEBEAR_STYLES as any)[avatar.style];
    if (!style) return null;

    try {
      return createAvatar(style, { seed: avatar.seed, size: 64 }).toString();
    } catch {
      return null;
    }
  }, [draft.avatar]);

  const handleEditAccount = () => {
    setOpen(false);
    navigate("/account");
  };

  const handleLogout = async () => {
    setOpen(false);
    await auth.logout();
    navigate("/onboarding");
  };

  useEffect(() => {
    if (!open) return;

    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node | null;
      if (!target) return;
      const root = containerRef.current;
      if (!root) return;
      if (root.contains(target)) return;
      setOpen(false);
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    popoverRef.current?.focus();
  }, [open]);

  return (
    <div ref={containerRef} className="profile-hud">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="profile-hud-toggle"
      >
        <div className="profile-hud-toggle-label">Profile</div>
        <div className="profile-hud-toggle-name">{username}</div>
      </button>

      {open && (
        <div
          ref={popoverRef}
          tabIndex={-1}
          role="dialog"
          aria-label="Profile details"
          className="profile-hud-popover"
        >
          <div className="profile-hud-header">
            <div
              aria-hidden="true"
              className="profile-hud-avatar"
              dangerouslySetInnerHTML={avatarSvg ? { __html: avatarSvg } : undefined}
            />

            <div className="profile-hud-user-info">
              <div className="profile-hud-display-name">
                {draft.displayName?.trim() ? draft.displayName : "—"}
              </div>
              <div className="profile-hud-username">@{username}</div>
            </div>
          </div>

          <div className="profile-hud-details">
            <Row label="Username" value={username} />
            <Row label="Major" value={majorLabel || "—"} />
          </div>

          <div className="profile-hud-actions">
            <button
              type="button"
              onClick={handleEditAccount}
              className="profile-hud-btn primary"
            >
              Edit account
            </button>

            {(auth.mode === "user" || auth.mode === "admin" || auth.mode === "guest") && (
              <button
                type="button"
                onClick={handleLogout}
                className="profile-hud-btn"
              >
                {auth.mode === "guest" ? "Exit guest mode" : "Log out"}
              </button>
            )}

            {auth.mode === "guest" && (
              <div className="profile-hud-notice">
                Guest mode — progress not saved
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Row(props: { label: string; value: string }) {
  return (
    <div className="profile-hud-row">
      <div className="profile-hud-row-label">{props.label}</div>
      <div className="profile-hud-row-value">{props.value}</div>
    </div>
  );
}
