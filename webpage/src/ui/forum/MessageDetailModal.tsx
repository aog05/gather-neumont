import { useEffect, useMemo, useRef, useState } from "react";
import {
  clearChatReports,
  getMessageReports,
  pinChatMessage,
  quarantineChatMessage,
  softDeleteChatMessage,
  unpinChatMessage,
  unquarantineChatMessage,
} from "../../api/chatApi";
import type { ForumMessage, ForumReport } from "../../types/forum.types";

interface MessageDetailModalProps {
  message: ForumMessage | null;
  isOpen: boolean;
  isAdmin: boolean;
  pinnedMessageId: string | null;
  onClose: () => void;
  onAfterAction: () => void;
}

function formatDate(value: string | null): string {
  if (!value) return "n/a";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function MessageDetailModal(props: MessageDetailModalProps) {
  const { message, isOpen, isAdmin, pinnedMessageId, onClose, onAfterAction } = props;
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

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

  useEffect(() => {
    if (!isOpen || !isAdmin || !message) {
      setReports([]);
      return;
    }

    let cancelled = false;
    setReportsLoading(true);
    void getMessageReports(message.id)
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
    try {
      await action();
      if (!mountedRef.current) return;
      onAfterAction();
      setError(null);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : "Moderation action failed");
    } finally {
      if (mountedRef.current) setActionLoading(false);
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
        setPendingConfirm(null);
        onClose();
      }}
    >
      <div className="quiz-panel forum-modal-panel" onClick={(event) => event.stopPropagation()}>
        <header className="quiz-panel-header">
          <div className="quiz-panel-header-top">
            <h3 className="quiz-panel-title" style={{ fontSize: 16 }}>Message Details</h3>
            <button
              type="button"
              className="quiz-panel-chrome-btn quiz-panel-chrome-btn--close"
              onClick={onClose}
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
                    void runAction("pin", () => isPinned ? unpinChatMessage() : pinChatMessage(message.id))
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
                        quarantineChatMessage(
                          message.id,
                          moderationReason.trim() || "Quarantined by moderator"
                        )
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
                    onClick={() => void runAction("unquarantine", () => unquarantineChatMessage(message.id))}
                  >
                    Unquarantine
                  </button>
                )}

                <button
                  type="button"
                  className={`forum-btn-danger${pendingConfirm === "delete" ? " forum-btn-danger--confirm" : ""}`}
                  disabled={actionLoading}
                  onClick={() => handleConfirmAction("delete", () => softDeleteChatMessage(message.id))}
                >
                  {pendingConfirm === "delete" ? "Confirm delete?" : "Soft Delete"}
                </button>
                <button
                  type="button"
                  className={`forum-btn-danger${pendingConfirm === "clear-reports" ? " forum-btn-danger--confirm" : ""}`}
                  disabled={actionLoading}
                  onClick={() => handleConfirmAction("clear-reports", () => clearChatReports(message.id))}
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
