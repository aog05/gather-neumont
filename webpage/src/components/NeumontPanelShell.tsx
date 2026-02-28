import type { CSSProperties, MouseEvent, ReactNode } from "react";
import "./QuestMenu.css";

type NeumontPanelTab = {
  id: string;
  label: string;
  disabled?: boolean;
};

interface NeumontPanelShellProps {
  title: string;
  children: ReactNode;
  onClose?: () => void;
  onOverlayClick?: () => void;
  embedded?: boolean;
  tabs?: NeumontPanelTab[];
  activeTabId?: string;
  onTabSelect?: (tabId: string) => void;
  headerRight?: ReactNode;
  footerHint?: ReactNode;
  maxWidth?: number | string;
  overlayClassName?: string;
  panelClassName?: string;
  panelStyle?: CSSProperties;
  contentClassName?: string;
  contentStyle?: CSSProperties;
}

function toMaxWidth(value?: number | string): CSSProperties["maxWidth"] {
  if (value === undefined) return undefined;
  if (typeof value === "number") return `${value}px`;
  return value;
}

export default function NeumontPanelShell({
  title,
  children,
  onClose,
  onOverlayClick,
  embedded = false,
  tabs,
  activeTabId,
  onTabSelect,
  headerRight,
  footerHint,
  maxWidth,
  overlayClassName,
  panelClassName,
  panelStyle,
  contentClassName,
  contentStyle,
}: NeumontPanelShellProps) {
  const hasTabs = Boolean(tabs && tabs.length > 0);
  const showHeaderActions = Boolean(headerRight || onClose);
  const headerStyle = showHeaderActions
    ? undefined
    : ({ justifyContent: "flex-start" } as CSSProperties);

  // Provide auth/onboarding tokens used by shared button/form classes.
  const overlayThemeVars = {
    "--font-sans": '"Manrope", system-ui, -apple-system, "Segoe UI", sans-serif',
    "--panel": "#0e1116",
    "--surface": "#171a21",
    "--surface-strong": "#1e2229",
    "--surface-hover": "#252932",
    "--surface-selected": "#2a2f3a",
    "--border": "rgba(255, 255, 255, 0.15)",
    "--border-strong": "rgba(255, 255, 255, 0.25)",
    "--text": "#f5f5f7",
    "--text-muted": "#a8a8ad",
    "--faint": "#8e8e93",
    "--accent": "#f5a623",
    "--accent-ink": "#1d1104",
    "--success": "#52c97c",
    "--danger": "#d65e5e",
    "--focus": "rgba(245, 166, 35, 0.4)",
    "--outline-hover": "rgba(245, 166, 35, 0.25)",
    "--radius-sm": "10px",
    "--radius-md": "14px",
    "--radius-lg": "18px",
    "--space-2": "8px",
    "--space-3": "12px",
    "--space-4": "16px",
    "--space-5": "20px",
    "--space-6": "24px",
  } as CSSProperties;

  const handleOverlayClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onOverlayClick?.();
    }
  };

  const panelNode = (
    <div
      className={`quest-menu${panelClassName ? ` ${panelClassName}` : ""}`}
      style={{
        maxWidth: toMaxWidth(maxWidth),
        ...(!embedded ? null : overlayThemeVars),
        ...panelStyle,
      }}
    >
      <div className="quest-menu-header" style={headerStyle}>
        <h2 className="quest-menu-title">{title}</h2>
        {showHeaderActions ? (
          <div className="quest-menu-header-actions">
            {headerRight}
            {onClose ? (
              <button
                type="button"
                className="quest-menu-close-btn"
                onClick={onClose}
                aria-label="Close panel"
              >
                ×
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {hasTabs ? (
        <div className="quest-menu-tabs" role="tablist">
          {tabs!.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`quest-menu-tab${activeTabId === tab.id ? " active" : ""}`}
              onClick={() => onTabSelect?.(tab.id)}
              disabled={tab.disabled}
              role="tab"
              aria-selected={activeTabId === tab.id}
            >
              {tab.label}
            </button>
          ))}
        </div>
      ) : null}

      <div
        className={`quest-menu-content${contentClassName ? ` ${contentClassName}` : ""}`}
        style={contentStyle}
      >
        {children}
      </div>

      {footerHint ? (
        <div className="quest-menu-footer">
          <p className="quest-menu-hint">{footerHint}</p>
        </div>
      ) : null}
    </div>
  );

  if (embedded) {
    return panelNode;
  }

  return (
    <div
      className={`quest-menu-overlay${overlayClassName ? ` ${overlayClassName}` : ""}`}
      style={overlayThemeVars}
      onClick={handleOverlayClick}
    >
      {panelNode}
    </div>
  );
}
