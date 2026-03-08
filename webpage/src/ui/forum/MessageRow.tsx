import { useEffect, useRef, useState } from "react";
import { toggleReactionDirect } from "../../lib/chatWrites";
import type { ForumMessage } from "../../types/forum.types";

const PRESET_REACTIONS = ["👍", "❤️", "😂", "🎉", "👀"] as const;

interface MessageRowProps {
  message: ForumMessage;
  currentUserId: string | null;
  canReport: boolean;
  isAdmin: boolean;
  onReport: (message: ForumMessage) => void;
  onOpenDetails: (message: ForumMessage) => void;
}

function formatTimestamp(value: ForumMessage["createdAt"]): string {
  if (!value) return "";
  try {
    return value.toDate().toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function MessageRow(props: MessageRowProps) {
  const { message, currentUserId, canReport, isAdmin, onReport, onOpenDetails } = props;

  const [pickerOpen, setPickerOpen] = useState(false);
  const [reactingEmoji, setReactingEmoji] = useState<string | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pickerOpen) return;
    const onDown = (event: MouseEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [pickerOpen]);

  const reactions = message.reactions ?? {};
  const reactionEntries = Object.entries(reactions).filter(([, users]) => users.length > 0);
  const canReact = currentUserId !== null;

  const handleReact = async (emoji: string) => {
    if (!currentUserId) return;
    setPickerOpen(false);
    setReactingEmoji(emoji);
    try {
      const hasReacted = (reactions[emoji] ?? []).includes(currentUserId);
      await toggleReactionDirect(message.id, emoji, currentUserId, hasReacted);
    } finally {
      setReactingEmoji(null);
    }
  };

  const rowClass = [
    "forum-message-row",
    message.authorIsAdmin ? "forum-message--admin" : "",
    message.status === "quarantined" ? "forum-message--quarantined" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const initial = message.authorUsername.charAt(0).toUpperCase() || "?";

  return (
    <article className={rowClass}>
      <div className="forum-msg-avatar" aria-hidden="true">
        {initial}
      </div>
      <div className="forum-msg-body">
        <div className="forum-msg-meta">
          <span className="forum-msg-author">{message.authorUsername}</span>
          {message.authorIsAdmin ? (
            <span className="quiz-panel-role-badge">ADMIN</span>
          ) : null}
          <span className="forum-msg-time">{formatTimestamp(message.createdAt)}</span>
        </div>

        <p className="forum-msg-text">{message.text}</p>

        {reactionEntries.length > 0 || canReact ? (
          <div className="forum-msg-reactions">
            {reactionEntries.map(([emoji, users]) => {
              const active = currentUserId ? users.includes(currentUserId) : false;
              const busy = reactingEmoji === emoji;
              return (
                <button
                  key={emoji}
                  type="button"
                  className={`forum-reaction-pill${active ? " forum-reaction-pill--active" : ""}`}
                  disabled={!canReact || busy}
                  onClick={() => void handleReact(emoji)}
                  title={active ? `Remove ${emoji} reaction` : `React with ${emoji}`}
                >
                  {emoji}
                  <span className="forum-reaction-count">{users.length}</span>
                </button>
              );
            })}

            {canReact ? (
              <div className="forum-reaction-add-wrap" ref={pickerRef}>
                <button
                  type="button"
                  className="forum-reaction-add"
                  onClick={() => setPickerOpen((v) => !v)}
                  title="Add reaction"
                >
                  +
                </button>
                {pickerOpen ? (
                  <div className="forum-reaction-picker" role="listbox" aria-label="Pick a reaction">
                    {PRESET_REACTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => void handleReact(emoji)}
                        title={emoji}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="forum-msg-actions">
          {canReport ? (
            <button
              type="button"
              className="forum-btn-secondary forum-msg-action-btn"
              onClick={() => onReport(message)}
            >
              Report
            </button>
          ) : null}
          <button
            type="button"
            className="forum-btn-secondary forum-msg-action-btn"
            onClick={() => onOpenDetails(message)}
          >
            {isAdmin ? "Moderate" : "Details"}
          </button>
        </div>
      </div>
    </article>
  );
}
