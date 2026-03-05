import type { ForumMessage } from "../../types/forum.types";

interface MessageRowProps {
  message: ForumMessage;
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
  const { message, canReport, isAdmin, onReport, onOpenDetails } = props;

  const rowClass = [
    "forum-message-row",
    message.authorIsAdmin ? "forum-message--admin" : "",
    message.status === "quarantined" ? "forum-message--quarantined" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article className={rowClass}>
      <div className="forum-message-header">
        <div className="forum-message-author">
          <span className="forum-message-author-name">{message.authorUsername}</span>
          {message.authorIsAdmin ? (
            <span className="quiz-panel-role-badge">ADMIN</span>
          ) : null}
        </div>
        <span className="forum-message-time">{formatTimestamp(message.createdAt)}</span>
      </div>

      <p className="forum-message-text">{message.text}</p>

      <div className="forum-message-actions">
        {canReport ? (
          <button
            type="button"
            className="forum-btn-secondary"
            style={{ padding: "4px 10px", fontSize: "11px" }}
            onClick={() => onReport(message)}
          >
            Report
          </button>
        ) : null}
        <button
          type="button"
          className="forum-btn-secondary"
          style={{ padding: "4px 10px", fontSize: "11px" }}
          onClick={() => onOpenDetails(message)}
        >
          {isAdmin ? "Moderate" : "Details"}
        </button>
      </div>
    </article>
  );
}
