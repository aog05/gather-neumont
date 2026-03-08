import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createChatMessageId, reportChatMessageDirect, sendChatMessageDirect } from "../../lib/chatWrites";
import { withTimeout } from "../../lib/withTimeout";
import { useAuth } from "../../features/auth/AuthContext";
import { useForumChatFeed } from "../../hooks/forum/useForumChatFeed";
import { useForumPinnedMessage } from "../../hooks/forum/useForumPinnedMessage";
import { useQuarantinedQueue } from "../../hooks/forum/useQuarantinedQueue";
import { useReportedQueue } from "../../hooks/forum/useReportedQueue";
import type { ForumMessage, ForumReportReason } from "../../types/forum.types";
import AdminTab from "./AdminTab";
import MessageDetailModal from "./MessageDetailModal";
import MessageRow from "./MessageRow";
import "../../styles/quiz-ui.css";
import "./forum-panel.css";

interface ForumPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

type ForumTab = "chat" | "admin";
const FORUM_ACTION_TIMEOUT_MS = 10_000;

export default function ForumPanel(props: ForumPanelProps) {
  const { isOpen, onClose } = props;
  const auth = useAuth();
  const navigate = useNavigate();

  const isGuest =
    auth.mode === "guest" ||
    auth.mode === "unknown" ||
    Boolean(auth.me?.isGuest);
  const isAdmin = auth.mode === "admin" || Boolean(auth.me?.isAdmin);

  const { messages, loading, loadingOlder, hasMore, error, loadOlder } = useForumChatFeed();
  const { pinnedMessage, pinnedMessageId } = useForumPinnedMessage();
  const [activeTab, setActiveTab] = useState<ForumTab>("chat");
  const [composerText, setComposerText] = useState("");
  const [composerError, setComposerError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<ForumMessage | null>(null);
  const [reportTarget, setReportTarget] = useState<ForumMessage | null>(null);
  const [reportReason, setReportReason] = useState<ForumReportReason>("spam");
  const [reportDetails, setReportDetails] = useState("");
  const [reporting, setReporting] = useState(false);
  const sendAttemptRef = useRef<{ messageId: string; text: string } | null>(null);
  const messageListRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);

  const reportedQueue = useReportedQueue(isOpen && isAdmin && activeTab === "admin");
  const quarantinedQueue = useQuarantinedQueue(isOpen && isAdmin && activeTab === "admin");

  // Reversed so oldest is at the top, newest at the bottom (Discord-style).
  // The Firestore query still fetches DESC; we flip in the UI only.
  const sortedMessages = useMemo(() => [...messages].reverse(), [messages]);

  // Scroll to bottom whenever the forum opens.
  useEffect(() => {
    if (!isOpen) return;
    const id = setTimeout(() => {
      const el = messageListRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }, 0);
    return () => clearTimeout(id);
  }, [isOpen]);

  // Stick-to-bottom: scroll to bottom on new messages only if the user is
  // already near the bottom (within 80px). This prevents disrupting users
  // who are scrolled up reading older messages.
  useEffect(() => {
    if (loading || !isOpen) return;
    if (stickToBottomRef.current) {
      const el = messageListRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }
  }, [messages, loading, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab("chat");
    setComposerError(null);
  }, [isOpen]);

  useEffect(() => {
    if (!sendAttemptRef.current) return;
    if (sendAttemptRef.current.text !== composerText.trim()) {
      sendAttemptRef.current = null;
    }
  }, [composerText]);

  if (!isOpen) return null;

  const doSend = async () => {
    if (!auth.me || sending) return;
    const trimmed = composerText.trim();
    const currentAttempt = sendAttemptRef.current;
    const messageId =
      currentAttempt && currentAttempt.text === trimmed
        ? currentAttempt.messageId
        : createChatMessageId(auth.me.userId);
    sendAttemptRef.current = { messageId, text: trimmed };

    setSending(true);
    console.debug("[ForumPanel] send start", messageId);
    try {
      await withTimeout(
        sendChatMessageDirect(composerText, {
          userId: auth.me.userId,
          username: auth.me.username,
          isAdmin: auth.me.isAdmin,
        }, messageId),
        FORUM_ACTION_TIMEOUT_MS,
        "Send message"
      );
      console.debug("[ForumPanel] send success", messageId);
      setComposerText("");
      setComposerError(null);
      sendAttemptRef.current = null;
    } catch (err) {
      console.error("[ForumPanel] send failed", messageId, err);
      setComposerError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setSending(false);
      console.debug("[ForumPanel] send loading reset", messageId);
    }
  };

  const onSubmitMessage = (event: React.FormEvent) => {
    event.preventDefault();
    void doSend();
  };

  const onSubmitReport = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!reportTarget || !auth.me) return;

    setReporting(true);
    console.debug("[ForumPanel] report start", reportTarget.id);
    try {
      await withTimeout(
        reportChatMessageDirect(reportTarget.id, reportReason, reportDetails, {
          userId: auth.me.userId,
          username: auth.me.username,
        }),
        FORUM_ACTION_TIMEOUT_MS,
        "Submit report"
      );
      console.debug("[ForumPanel] report success", reportTarget.id);
      setReportTarget(null);
      setReportReason("spam");
      setReportDetails("");
      setComposerError(null);
    } catch (err) {
      console.error("[ForumPanel] report failed", err);
      setComposerError(err instanceof Error ? err.message : "Failed to submit report");
    } finally {
      setReporting(false);
      console.debug("[ForumPanel] report loading reset");
    }
  };

  return (
    <div className="quiz-ui forum-overlay" onClick={onClose}>
      <section className="quiz-panel forum-panel" onClick={(event) => event.stopPropagation()}>
        <header className="quiz-panel-header">
          <div className="quiz-panel-header-top">
            <h2 className="quiz-panel-title">Forum</h2>
            <div className="quiz-panel-header-actions">
              <button
                type="button"
                className={`quiz-panel-chrome-btn${activeTab === "chat" ? " forum-tab--active" : ""}`}
                onClick={() => setActiveTab("chat")}
              >
                Chat
              </button>
              {isAdmin ? (
                <button
                  type="button"
                  className={`quiz-panel-chrome-btn${activeTab === "admin" ? " forum-tab--active" : ""}`}
                  onClick={() => setActiveTab("admin")}
                >
                  Admin
                </button>
              ) : null}
              <button
                type="button"
                className="quiz-panel-chrome-btn quiz-panel-chrome-btn--close"
                onClick={onClose}
                aria-label="Close forum"
              >
                ×
              </button>
            </div>
          </div>
        </header>

        {activeTab === "chat" ? (
          <div className="forum-chat-view">
            {pinnedMessage ? (
              <div className="quiz-panel-user-strip forum-pinned-banner">
                <span className="quiz-panel-role-badge">PINNED</span>
                <strong>{pinnedMessage.authorUsername}:</strong>
                <span className="forum-pinned-text">{pinnedMessage.text}</span>
              </div>
            ) : null}

            {hasMore ? (
              <button
                type="button"
                className="forum-btn-secondary forum-load-older"
                disabled={loadingOlder}
                onClick={() => void loadOlder()}
              >
                {loadingOlder ? "Loading..." : "Load older"}
              </button>
            ) : null}

            <div
              className="forum-message-list"
              ref={messageListRef}
              onScroll={() => {
                const el = messageListRef.current;
                if (!el) return;
                stickToBottomRef.current =
                  el.scrollHeight - el.scrollTop - el.clientHeight < 80;
              }}
            >
              {loading ? <p className="forum-status-text">Loading messages...</p> : null}
              {error ? <p className="lb-error">{error}</p> : null}
              {!loading && !error && sortedMessages.length === 0 ? (
                <p className="forum-status-text">No messages yet.</p>
              ) : null}
              {sortedMessages.map((message) => (
                <MessageRow
                  key={message.id}
                  message={message}
                  currentUserId={auth.me?.userId ?? null}
                  canReport={!isGuest}
                  isAdmin={isAdmin}
                  onReport={(target) => setReportTarget(target)}
                  onOpenDetails={(target) => setSelectedMessage(target)}
                />
              ))}
            </div>

            {isGuest ? (
              <div className="quiz-panel-guest-notice forum-guest-cta">
                <p>Create an account to send and report messages.</p>
                <button
                  type="button"
                  className="forum-btn-primary"
                  onClick={() => navigate("/create-account")}
                >
                  Create Account
                </button>
              </div>
            ) : (
              <form className="forum-composer" onSubmit={onSubmitMessage}>
                <textarea
                  value={composerText}
                  onChange={(event) => setComposerText(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey && !sending) {
                      event.preventDefault();
                      void doSend();
                    }
                  }}
                  placeholder="Send a message... (Enter to send, Shift+Enter for newline)"
                  maxLength={800}
                  rows={3}
                  disabled={sending}
                />
                <div className="forum-composer-footer">
                  <span className="forum-char-count">{composerText.length}/800</span>
                  <button type="submit" className="forum-btn-primary" disabled={sending}>
                    {sending ? "Sending..." : "Send"}
                  </button>
                </div>
              </form>
            )}
            {composerError ? <p className="lb-error">{composerError}</p> : null}
          </div>
        ) : (
          <AdminTab
            reportedMessages={reportedQueue.messages}
            reportedLoading={reportedQueue.loading}
            reportedError={reportedQueue.error}
            quarantinedMessages={quarantinedQueue.messages}
            quarantinedLoading={quarantinedQueue.loading}
            quarantinedError={quarantinedQueue.error}
            onSelectMessage={(message) => setSelectedMessage(message)}
          />
        )}
      </section>

      {reportTarget ? (
        <div
          className="forum-modal-backdrop"
          onClick={(event) => {
            event.stopPropagation();
            setReportTarget(null);
          }}
        >
          <div className="quiz-panel forum-report-modal" onClick={(event) => event.stopPropagation()}>
            <header className="quiz-panel-header">
              <div className="quiz-panel-header-top">
                <h3 className="quiz-panel-title" style={{ fontSize: 16 }}>Report Message</h3>
                <button
                  type="button"
                  className="quiz-panel-chrome-btn quiz-panel-chrome-btn--close"
                  onClick={() => setReportTarget(null)}
                  aria-label="Cancel report"
                >
                  ×
                </button>
              </div>
            </header>
            <div className="forum-report-body">
              {reportTarget.text ? (
                <p className="forum-report-preview">
                  &ldquo;{reportTarget.text.slice(0, 120)}{reportTarget.text.length > 120 ? "…" : ""}&rdquo;
                </p>
              ) : null}
              <form className="forum-report-form" onSubmit={onSubmitReport}>
                <label className="forum-field-label">
                  Reason
                  <select
                    className="forum-select"
                    value={reportReason}
                    onChange={(event) => setReportReason(event.target.value as ForumReportReason)}
                  >
                    <option value="spam">Spam</option>
                    <option value="abuse">Abuse</option>
                    <option value="harassment">Harassment</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <label className="forum-field-label">
                  Details (optional)
                  <textarea
                    className="forum-textarea"
                    value={reportDetails}
                    onChange={(event) => setReportDetails(event.target.value)}
                    rows={3}
                  />
                </label>
                <div className="forum-modal-actions">
                  <button type="button" className="forum-btn-secondary" onClick={() => setReportTarget(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="forum-btn-danger" disabled={reporting}>
                    {reporting ? "Submitting..." : "Submit Report"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      <MessageDetailModal
        message={selectedMessage}
        isOpen={Boolean(selectedMessage)}
        isAdmin={isAdmin}
        pinnedMessageId={pinnedMessageId}
        onClose={() => setSelectedMessage(null)}
        onAfterAction={() => {
          if (selectedMessage) {
            const latest = messages.find((entry) => entry.id === selectedMessage.id) ?? null;
            setSelectedMessage(latest);
          }
        }}
      />
    </div>
  );
}
