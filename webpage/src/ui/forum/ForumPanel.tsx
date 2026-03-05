import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChatUnavailableError,
  reportChatMessage,
  sendChatMessage,
} from "../../api/chatApi";
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

export default function ForumPanel(props: ForumPanelProps) {
  const { isOpen, onClose } = props;
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

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
  const [chatUnavailable, setChatUnavailable] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<ForumMessage | null>(null);
  const [reportTarget, setReportTarget] = useState<ForumMessage | null>(null);
  const [reportReason, setReportReason] = useState<ForumReportReason>("spam");
  const [reportDetails, setReportDetails] = useState("");
  const [reporting, setReporting] = useState(false);

  const reportedQueue = useReportedQueue(isOpen && isAdmin && activeTab === "admin");
  const quarantinedQueue = useQuarantinedQueue(isOpen && isAdmin && activeTab === "admin");

  const sortedMessages = useMemo(() => messages, [messages]);

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

  if (!isOpen) return null;

  const onSubmitMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    setSending(true);
    try {
      await sendChatMessage(composerText);
      setComposerText("");
      setComposerError(null);
    } catch (err) {
      if (err instanceof ChatUnavailableError) {
        setChatUnavailable(true);
      } else {
        setComposerError(err instanceof Error ? err.message : "Failed to send message");
      }
    } finally {
      if (mountedRef.current) setSending(false);
    }
  };

  const onSubmitReport = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!reportTarget) return;

    setReporting(true);
    try {
      await reportChatMessage(reportTarget.id, reportReason, reportDetails);
      setReportTarget(null);
      setReportReason("spam");
      setReportDetails("");
      setComposerError(null);
    } catch (err) {
      if (!mountedRef.current) return;
      if (err instanceof ChatUnavailableError) {
        setChatUnavailable(true);
        setReportTarget(null);
      } else {
        setComposerError(err instanceof Error ? err.message : "Failed to submit report");
      }
    } finally {
      if (mountedRef.current) setReporting(false);
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
            {chatUnavailable ? (
              <div className="forum-unavailable-banner lb-error">
                Chat writes are currently unavailable on this server. Messages can still be read.
              </div>
            ) : null}

            {pinnedMessage ? (
              <div className="quiz-panel-user-strip forum-pinned-banner">
                <span className="quiz-panel-role-badge">PINNED</span>
                <strong>{pinnedMessage.authorUsername}:</strong>
                <span className="forum-pinned-text">{pinnedMessage.text}</span>
              </div>
            ) : null}

            <div className="forum-message-list">
              {loading ? <p className="forum-status-text">Loading messages...</p> : null}
              {error ? <p className="lb-error">{error}</p> : null}
              {!loading && sortedMessages.length === 0 ? (
                <p className="forum-status-text">No messages yet.</p>
              ) : null}
              {sortedMessages.map((message) => (
                <MessageRow
                  key={message.id}
                  message={message}
                  canReport={!isGuest && !chatUnavailable}
                  isAdmin={isAdmin}
                  onReport={(target) => setReportTarget(target)}
                  onOpenDetails={(target) => setSelectedMessage(target)}
                />
              ))}
            </div>

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
            ) : !chatUnavailable ? (
              <form className="forum-composer" onSubmit={onSubmitMessage}>
                <textarea
                  value={composerText}
                  onChange={(event) => setComposerText(event.target.value)}
                  placeholder="Send a message..."
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
            ) : null}
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
              <form onSubmit={onSubmitReport}>
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
