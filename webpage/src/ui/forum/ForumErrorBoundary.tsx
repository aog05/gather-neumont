import { Component, type ReactNode } from "react";
import "../../styles/quiz-ui.css";

interface Props {
  children: ReactNode;
  onClose?: () => void;
}

interface State {
  hasError: boolean;
}

export default class ForumErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="quiz-ui"
          style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--overlay-backdrop)",
            zIndex: 950,
          }}
        >
          <div className="quiz-panel" style={{ padding: "32px 40px", maxWidth: 420, textAlign: "center", position: "relative" }}>
            <button
              type="button"
              className="quiz-panel-chrome-btn quiz-panel-chrome-btn--close"
              style={{ position: "absolute", top: 8, right: 8 }}
              aria-label="Close"
              onClick={() => {
                this.setState({ hasError: false });
                this.props.onClose?.();
              }}
            >
              ×
            </button>
            <h2 className="quiz-panel-title" style={{ marginBottom: 16 }}>Forum Error</h2>
            <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 20 }}>
              An unexpected error occurred. Close and reopen the forum to retry.
            </p>
            <button
              type="button"
              className="forum-btn-secondary"
              onClick={() => this.setState({ hasError: false })}
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
