import type { ForumMessage } from "../../types/forum.types";

interface ReportedQueueProps {
  messages: ForumMessage[];
  loading: boolean;
  error: string | null;
  onSelectMessage: (message: ForumMessage) => void;
}

export default function ReportedQueue(props: ReportedQueueProps) {
  const { messages, loading, error, onSelectMessage } = props;

  if (loading) return <p className="forum-status-text">Loading reported queue...</p>;
  if (error) return <p className="lb-error">{error}</p>;
  if (messages.length === 0) return <p className="forum-status-text">No reported messages.</p>;

  return (
    <div className="forum-admin-list">
      {messages.map((message) => (
        <div key={message.id} className="forum-admin-list-item">
          <span className="forum-admin-list-item-title">{message.authorUsername}</span>
          <span className="forum-admin-list-item-meta">
            {message.reportCount} report{message.reportCount === 1 ? "" : "s"}
          </span>
          <span className="forum-admin-list-item-preview">{message.text}</span>
          <div className="forum-admin-list-item-actions">
            <button
              type="button"
              className="forum-btn-secondary"
              style={{ padding: "4px 10px", fontSize: "11px" }}
              onClick={() => onSelectMessage(message)}
            >
              Moderate
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
