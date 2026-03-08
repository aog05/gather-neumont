import { useState } from "react";
import type { ForumMessage } from "../../types/forum.types";
import BansTab from "./BansTab";
import QuarantinedQueue from "./QuarantinedQueue";
import ReportedQueue from "./ReportedQueue";

type AdminView = "reported" | "quarantined" | "bans";

interface AdminTabProps {
  reportedMessages: ForumMessage[];
  reportedLoading: boolean;
  reportedError: string | null;
  quarantinedMessages: ForumMessage[];
  quarantinedLoading: boolean;
  quarantinedError: string | null;
  onSelectMessage: (message: ForumMessage) => void;
}

export default function AdminTab(props: AdminTabProps) {
  const {
    reportedMessages,
    reportedLoading,
    reportedError,
    quarantinedMessages,
    quarantinedLoading,
    quarantinedError,
    onSelectMessage,
  } = props;
  const [view, setView] = useState<AdminView>("reported");

  return (
    <section className="forum-admin-tab">
      <div className="forum-admin-tab-header">
        <button
          type="button"
          className={`quiz-panel-chrome-btn${view === "reported" ? " forum-tab--active" : ""}`}
          onClick={() => setView("reported")}
        >
          Reported
        </button>
        <button
          type="button"
          className={`quiz-panel-chrome-btn${view === "quarantined" ? " forum-tab--active" : ""}`}
          onClick={() => setView("quarantined")}
        >
          Quarantined
        </button>
        <button
          type="button"
          className={`quiz-panel-chrome-btn${view === "bans" ? " forum-tab--active" : ""}`}
          onClick={() => setView("bans")}
        >
          Bans
        </button>
      </div>

      {view === "reported" ? (
        <ReportedQueue
          messages={reportedMessages}
          loading={reportedLoading}
          error={reportedError}
          onSelectMessage={onSelectMessage}
        />
      ) : null}

      {view === "quarantined" ? (
        <QuarantinedQueue
          messages={quarantinedMessages}
          loading={quarantinedLoading}
          error={quarantinedError}
          onSelectMessage={onSelectMessage}
        />
      ) : null}

      {view === "bans" ? <BansTab /> : null}
    </section>
  );
}
