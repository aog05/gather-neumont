import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../features/auth/AuthContext";
import {
  clearChatReportsDirect,
  getMessageReportsDirect,
  pinChatMessageDirect,
  quarantineChatMessageDirect,
  softDeleteChatMessageDirect,
  unpinChatMessageDirect,
  unquarantineChatMessageDirect,
} from "../../lib/chatWrites";
import { withTimeout } from "../../lib/withTimeout";
import type { ForumMessage, ForumReport } from "../../types/forum.types";

interface MessageDetailModalProps {
  message: ForumMessage | null;
  isOpen: boolean;
  isAdmin: boolean;
  pinnedMessageId: string | null;
  onClose: () => void;
  onAfterAction: () => void;
}
const FORUM_ACTION_TIMEOUT_MS = 10_000;

function formatDate(value: string | null): string {
  if (!value) return "n/a";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function MessageDetailModal(props: MessageDetailModalProps) {
  const { message, isOpen, isAdmin, pinnedMessageId, onClose, onAfterAction } = props;
  const auth = useAuth();
  const me = auth.me;
  const closedRef = useRef(!isOpen);

  const [reports, setReports] = useState<ForumReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [moderationReason, setModerationReason] = useState("");
  const [pendingConfirm, setPendingConfirm] = useState<string | null>(null);

  const isPinned = useMemo(
    () => Boolean(message && pinnedMessageId && pinnedMessageId === message.id),
    [message, pinnedMessageId]
  );

  const resetTransientState = () => {
    setActionLoading(false);
    setPendingConfirm(null);
    setError(null);
    setReportsLoading(false);
  };

  const handleClose = () => {
    closedRef.current = true;
    resetTransientState();
    onClose();
  };

  useEffect(() => {
    closedRef.current = !isOpen;
    if (!isOpen) {
      resetTransientState();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !isAdmin || !message) {
      setReports([]);
      return;
    }

    let cancelled = false;
    setReportsLoading(true);
    void getMessageReportsDirect(message.id)
      .then((next) => {
        if (cancelled) return;
        setReports(next);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load reports");
      })
      .finally(() => {
        if (!cancelled) {
          setReportsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isAdmin, isOpen, message]);

  if (!isOpen || !message) return null;

  const runAction = async (key: string, action: () => Promise<void>) => {
    setPendingConfirm(null);
    setActionLoading(true);
    console.debug("[MessageDetailModal] action start", key, message.id);
    try {
      await withTimeout(action(), FORUM_ACTION_TIMEOUT_MS, `Moderation action (${key})`);
      console.debug("[MessageDetailModal] action success", key, message.id);
      if (closedRef.current) return;
      if (key === "quarantine" || key === "unquarantine" || key === "delete" || key === "clear-reports") {
        console.debug("[MessageDetailModal] closing after moderation action", key, message.id);
        handleClose();
        return;
      }
      onAfterAction();
      setError(null);
    } catch (err) {
      if (closedRef.current) return;
      console.error("[MessageDetailModal] action failed", key, err);
      setError(err instanceof Error ? err.message : "Moderation action failed");
    } finally {
      if (closedRef.current) return;
      setActionLoading(false);
      console.debug("[MessageDetailModal] action loading reset", key, message.id);
    }
  };

  const handleConfirmAction = (key: string, action: () => Promise<void>) => {
    if (pendingConfirm === key) {
      void runAction(key, action);
    } else {
      setPendingConfirm(key);
    }
  };

  return (
    <div
      className="forum-modal-backdrop"
      onClick={(event) => {
        event.stopPropagation();
        handleClose();
      }}
    >
      <div className="quiz-panel forum-modal-panel" onClick={(event) => event.stopPropagation()}>
        <header className="quiz-panel-header">
          <div className="quiz-panel-header-top">
            <h3 className="quiz-panel-title" style={{ fontSize: 16 }}>Message Details</h3>
            <button
              type="button"
              className="quiz-panel-chrome-btn quiz-panel-chrome-btn--close"
              onClick={handleClose}
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </header>

        <div className={`forum-modal-body${actionLoading ? " forum-action-loading" : ""}`}>
          <p className="forum-modal-author">Author: {message.authorUsername}</p>
          <p className="forum-modal-text">{message.text}</p>
          <p className="forum-modal-meta">Status: {message.status}</p>
          <p className="forum-modal-meta">Reports: {message.reportCount}</p>

          {isAdmin ? (
            <section className="forum-admin-actions">
              <h4>Moderation</h4>
              <div className="forum-modal-actions">
                <button
                  type="button"
                  className="forum-btn-secondary"
                  disabled={actionLoading}
                  onClick={() =>
                    void runAction("pin", () =>
                      me
                        ? isPinned
                          ? unpinChatMessageDirect({ userId: me.userId, username: me.username })
                          : pinChatMessageDirect(message.id, { userId: me.userId, username: me.username })
                        : Promise.reject(new Error("Not authenticated"))
                    )
                  }
                >
                  {isPinned ? "Unpin" : "Pin"}
                </button>

                {message.status !== "quarantined" ? (
                  <button
                    type="button"
                    className="forum-btn-secondary"
                    disabled={actionLoading}
                    onClick={() =>
                      void runAction("quarantine", () =>
                        me
                          ? quarantineChatMessageDirect(
                              message.id,
                              moderationReason.trim() || "Quarantined by moderator",
                              { userId: me.userId }
                            )
                          : Promise.reject(new Error("Not authenticated"))
                      )
                    }
                  >
                    Quarantine
                  </button>
                ) : (
                  <button
                    type="button"
                    className="forum-btn-secondary"
                    disabled={actionLoading}
                    onClick={() => void runAction("unquarantine", () => unquarantineChatMessageDirect(message.id))}
                  >
                    Unquarantine
                  </button>
                )}

                <button
                  type="button"
                  className={`forum-btn-danger${pendingConfirm === "delete" ? " forum-btn-danger--confirm" : ""}`}
                  disabled={actionLoading}
                  onClick={() =>
                    handleConfirmAction("delete", () =>
                      me
                        ? softDeleteChatMessageDirect(message.id, { userId: me.userId })
                        : Promise.reject(new Error("Not authenticated"))
                    )
                  }
                >
                  {pendingConfirm === "delete" ? "Confirm delete?" : "Soft Delete"}
                </button>
                <button
                  type="button"
                  className={`forum-btn-danger${pendingConfirm === "clear-reports" ? " forum-btn-danger--confirm" : ""}`}
                  disabled={actionLoading}
                  onClick={() =>
                    handleConfirmAction("clear-reports", () =>
                      me
                        ? clearChatReportsDirect(message.id, { userId: me.userId, username: me.username })
                        : Promise.reject(new Error("Not authenticated"))
                    )
                  }
                >
                  {pendingConfirm === "clear-reports" ? "Confirm clear?" : "Clear Reports"}
                </button>
              </div>

              <input
                type="text"
                className="forum-input"
                placeholder="Moderation reason (used for quarantine)"
                value={moderationReason}
                onChange={(event) => setModerationReason(event.target.value)}
              />
            </section>
          ) : null}

          {isAdmin ? (
            <section className="forum-report-list">
              <h4>Reports</h4>
              {reportsLoading ? <p className="forum-status-text">Loading reports...</p> : null}
              {!reportsLoading && reports.length === 0 ? (
                <p className="forum-status-text">No reports for this message.</p>
              ) : null}
              {reports.map((report) => (
                <article key={report.reporterUserId} className="forum-report-item">
                  <p>
                    <strong>{report.reporterUsername}</strong> ({report.reason})
                  </p>
                  <p>{report.details || "No details"}</p>
                  <p className="forum-modal-meta">Created: {formatDate(report.createdAt)}</p>
                  <p className="forum-modal-meta">Status: {report.status}</p>
                  {report.status === "cleared" ? (
                    <p className="forum-modal-meta">
                      Cleared by {report.clearedByUsername ?? "unknown"} at{" "}
                      {formatDate(report.clearedAt ?? null)}
                    </p>
                  ) : null}
                </article>
              ))}
            </section>
          ) : null}

          {error ? <p className="lb-error">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}
