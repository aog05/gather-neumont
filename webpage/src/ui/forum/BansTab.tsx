import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../../features/auth/AuthContext";
import { createChatBanDirect, getChatBansDirect, removeChatBanDirect } from "../../lib/chatWrites";
import { withTimeout } from "../../lib/withTimeout";
import type { ForumBan } from "../../types/forum.types";

const FORUM_ACTION_TIMEOUT_MS = 10_000;

function formatIso(value: string | null | undefined): string {
  if (!value) return "n/a";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function BansTab() {
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const auth = useAuth();
  const me = auth.me;

  const [bans, setBans] = useState<ForumBan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState("");
  const [reason, setReason] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmingUnban, setConfirmingUnban] = useState<string | null>(null);
  const [liftingUserId, setLiftingUserId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const next = await getChatBansDirect(true);
      if (!mountedRef.current) return;
      setBans(next);
      setError(null);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : "Failed to load bans");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onCreateBan = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    let shouldRefresh = false;
    console.debug("[BansTab] create ban start", userId.trim());
    try {
      const expiresAtIso = (() => {
        if (!expiresAt.trim()) return null;
        const parsed = new Date(expiresAt);
        if (Number.isNaN(parsed.getTime())) {
          throw new Error("Invalid expiration date");
        }
        return parsed.toISOString();
      })();

      await withTimeout(
        createChatBanDirect({
          userId: userId.trim(),
          reason: reason.trim(),
          expiresAt: expiresAtIso,
          createdBy: me
            ? { userId: me.userId, username: me.username }
            : { userId: "unknown", username: "unknown" },
        }),
        FORUM_ACTION_TIMEOUT_MS,
        "Create ban"
      );
      console.debug("[BansTab] create ban success", userId.trim());
      shouldRefresh = true;
      if (!mountedRef.current) return;
      setUserId("");
      setReason("");
      setExpiresAt("");
      setError(null);
    } catch (err) {
      console.error("[BansTab] create ban failed", err);
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : "Failed to create ban");
    } finally {
      if (mountedRef.current) {
        setSaving(false);
        console.debug("[BansTab] create ban loading reset");
      }
    }
    if (shouldRefresh && mountedRef.current) {
      void refresh();
    }
  };

  const handleUnbanClick = (targetUserId: string) => {
    if (confirmingUnban === targetUserId) {
      setConfirmingUnban(null);
      void onUnban(targetUserId);
    } else {
      setConfirmingUnban(targetUserId);
    }
  };

  const onUnban = async (targetUserId: string) => {
    setLiftingUserId(targetUserId);
    let shouldRefresh = false;
    console.debug("[BansTab] unban start", targetUserId);
    try {
      await withTimeout(
        removeChatBanDirect(
          targetUserId,
          me ? { userId: me.userId, username: me.username } : { userId: "unknown", username: "unknown" }
        ),
        FORUM_ACTION_TIMEOUT_MS,
        "Unban user"
      );
      console.debug("[BansTab] unban success", targetUserId);
      shouldRefresh = true;
      if (!mountedRef.current) return;
      setError(null);
    } catch (err) {
      console.error("[BansTab] unban failed", targetUserId, err);
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : "Failed to lift ban");
    } finally {
      if (mountedRef.current) {
        setLiftingUserId(null);
        console.debug("[BansTab] unban loading reset", targetUserId);
      }
    }
    if (shouldRefresh && mountedRef.current) {
      void refresh();
    }
  };

  return (
    <section className="forum-bans">
      <header className="forum-bans-header">
        <h3>Active Bans</h3>
        <button type="button" className="forum-btn-secondary" onClick={refresh}>
          Refresh
        </button>
      </header>

      <form className="forum-ban-form" onSubmit={onCreateBan}>
        <input
          type="text"
          placeholder="User ID"
          value={userId}
          onChange={(event) => setUserId(event.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          required
        />
        <input
          type="datetime-local"
          value={expiresAt}
          onChange={(event) => setExpiresAt(event.target.value)}
        />
        <button type="submit" className="forum-btn-primary" disabled={saving}>
          {saving ? "Saving..." : "Ban User"}
        </button>
      </form>

      {loading ? <p className="forum-status-text">Loading bans...</p> : null}
      {error ? <p className="lb-error">{error}</p> : null}

      <div className="forum-admin-list">
        {bans.map((ban) => (
          <div key={ban.userId} className="forum-admin-list-item forum-ban-row">
            <span className="forum-admin-list-item-title">{ban.userId}</span>
            <span className="forum-admin-list-item-meta">{ban.reason || "No reason"}</span>
            <span className="forum-admin-list-item-meta">Created: {formatIso(ban.createdAt)}</span>
            <span className="forum-admin-list-item-meta">Expires: {formatIso(ban.expiresAt)}</span>
            <button
              type="button"
              className={`forum-btn-danger${confirmingUnban === ban.userId ? " forum-btn-danger--confirm" : ""}`}
              disabled={liftingUserId === ban.userId}
              onClick={() => handleUnbanClick(ban.userId)}
            >
              {liftingUserId === ban.userId
                ? "Unbanning..."
                : confirmingUnban === ban.userId
                ? "Confirm unban?"
                : "Unban"}
            </button>
          </div>
        ))}
        {!loading && bans.length === 0 ? (
          <p className="forum-status-text">No active bans.</p>
        ) : null}
      </div>
    </section>
  );
}
