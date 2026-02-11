import type { ReactNode } from "react";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../features/auth/AuthContext";
import { QuizModal } from "../../components/quiz/QuizModal";
import { DEMO_LEADERBOARD } from "../../demo/demoLeaderboard";
import "../../styles/quiz-ui.css";
import "../../pages/QuizDevPage.css";

type Tab = "quiz" | "leaderboard" | "data" | "admin";

type LeaderboardEntry = {
  rank: number;
  username: string;
  longestStreak: number;
  currentStreak: number;
  totalPoints: number;
};

export default function QuizPanel(props: { isOpen: boolean; onClose: () => void }) {
  const { isOpen, onClose } = props;
  const auth = useAuth();
  const isAdmin = auth.mode === "admin";
  const username = auth.me?.username ?? "Guest";

  const [tab, setTab] = useState<Tab>("quiz");
  const panelRef = useRef<HTMLDivElement | null>(null);
  const quizModalCloseRef = useRef<null | (() => void)>(null);

  const [useDemoLeaderboard, setUseDemoLeaderboard] = useState(true);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
  const [leaderboardUsingDemo, setLeaderboardUsingDemo] = useState(false);
  const leaderboardScrollRef = useRef(false);
  const [leaderboardAnimNonce, setLeaderboardAnimNonce] = useState(0);
  const leaderboardLoadedRef = useRef(false);
  const [rankAnimActive, setRankAnimActive] = useState(false);
  const [rankAnimValue, setRankAnimValue] = useState(0);
  const [rankAnimDone, setRankAnimDone] = useState(false);
  const rankAnimRef = useRef<number | null>(null);
  const rankAnimDelayRef = useRef<number | null>(null);
  const rankAnimKeyRef = useRef<string | null>(null);

  const handleClose = useCallback(() => {
    if (quizModalCloseRef.current) {
      quizModalCloseRef.current();
      return;
    }
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    setTab("quiz");
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }

    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node | null;
      if (!target) return;
      const panel = panelRef.current;
      if (!panel) return;
      if (panel.contains(target)) return;
      handleClose();
    }

    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [handleClose, isOpen]);

  const loadLeaderboard = useCallback(async () => {
    if (useDemoLeaderboard) {
      setLeaderboardUsingDemo(true);
      setLeaderboard(DEMO_LEADERBOARD.entries);
      leaderboardLoadedRef.current = true;
      return;
    }
    setLeaderboardLoading(true);
    setLeaderboardError(null);
    try {
      const res = await fetch("/api/leaderboard?limit=50");
      const data = (await res.json()) as { entries?: LeaderboardEntry[] };
      if (!res.ok) {
        setLeaderboardError("Failed to load leaderboard");
        setLeaderboardUsingDemo(true);
        setLeaderboard(DEMO_LEADERBOARD.entries);
        return;
      }
      if (!data.entries || data.entries.length === 0) {
        setLeaderboardUsingDemo(true);
        setLeaderboard(DEMO_LEADERBOARD.entries);
        leaderboardLoadedRef.current = true;
        return;
      }
      setLeaderboardUsingDemo(false);
      setLeaderboard(data.entries);
      leaderboardLoadedRef.current = true;
    } catch {
      setLeaderboardError("Failed to load leaderboard");
      setLeaderboardUsingDemo(true);
      setLeaderboard(DEMO_LEADERBOARD.entries);
      leaderboardLoadedRef.current = true;
    } finally {
      setLeaderboardLoading(false);
    }
  }, [useDemoLeaderboard]);

  useEffect(() => {
    if (!isOpen) return;
    if (tab !== "leaderboard") return;
    if (!leaderboardLoadedRef.current && !leaderboardLoading) {
      leaderboardScrollRef.current = false;
      void loadLeaderboard();
    }
  }, [isOpen, leaderboardLoading, loadLeaderboard, tab, useDemoLeaderboard]);

  const showAdminTab = isAdmin;
  const tabs = useMemo(() => {
    const base: Array<{ key: Tab; label: string }> = [
      { key: "quiz", label: "Quiz" },
      { key: "leaderboard", label: "Leaderboard" },
      { key: "data", label: "Data" },
    ];
    if (showAdminTab) base.push({ key: "admin", label: "Admin" });
    return base;
  }, [showAdminTab]);

  const displayedLeaderboard = useDemoLeaderboard ? DEMO_LEADERBOARD : { entries: leaderboard };
  const entries = displayedLeaderboard.entries ?? [];
  const meUsername = auth.me?.username;
  const myEntry = meUsername
    ? entries.find((entry) => entry.username.toLowerCase() === meUsername.toLowerCase())
    : undefined;

  const handleViewLeaderboard = useCallback(() => {
    setTab("leaderboard");
    setLeaderboardAnimNonce((prev) => prev + 1);
    leaderboardScrollRef.current = false;
  }, []);

  const getPodiumGroup = (rank: number) => entries.filter((entry) => entry.rank === rank);

  const podiumGroups = {
    first: getPodiumGroup(1),
    second: getPodiumGroup(2),
    third: getPodiumGroup(3),
  };

  const renderPodiumGroup = (
    rankNum: number,
    groupEntries: LeaderboardEntry[],
    emptyLabel: string
  ) => {
    const visible = groupEntries.slice(0, 3);
    const remaining = groupEntries.length - visible.length;
    const isTied = groupEntries.length > 1;

    if (groupEntries.length === 0) {
      return (
        <div className="podium-content">
          <span className="podium-empty">{emptyLabel}</span>
        </div>
      );
    }

    return (
      <div className="podium-content">
        {isTied && <span className="podium-tie-label">Tied for #{rankNum}</span>}
        <div className="podium-names">
          {visible.map((entry, idx) => (
            <span className="podium-name" key={`${rankNum}-${entry.username}-${idx}`}>
              {entry.username}
            </span>
          ))}
          {remaining > 0 && <span className="podium-more">+{remaining} more</span>}
        </div>
      </div>
    );
  };

  useEffect(() => {
    if (tab !== "leaderboard") {
      return;
    }
    if (!myEntry || leaderboardScrollRef.current) {
      return;
    }
    if (leaderboardAnimNonce === 0) {
      return;
    }
    const targetUsername = myEntry.username.toLowerCase();
    const el = document.querySelector(`[data-username="${targetUsername}"]`) as HTMLElement | null;
    if (el) {
      leaderboardScrollRef.current = true;
      el.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [leaderboardAnimNonce, myEntry, tab]);

  useEffect(() => {
    if (tab !== "leaderboard") {
      return;
    }
    if (!myEntry) {
      setRankAnimActive(false);
      setRankAnimDone(false);
      return;
    }
    if (leaderboardAnimNonce === 0) {
      return;
    }

    const animKey = `leaderboard:${leaderboardAnimNonce}:${myEntry.username}:${myEntry.rank}`;
    if (rankAnimKeyRef.current === animKey) {
      return;
    }
    rankAnimKeyRef.current = animKey;
    setRankAnimActive(true);
    setRankAnimDone(false);
    setRankAnimValue(1);

    if (rankAnimRef.current) {
      window.cancelAnimationFrame(rankAnimRef.current);
      rankAnimRef.current = null;
    }
    if (rankAnimDelayRef.current) {
      window.clearTimeout(rankAnimDelayRef.current);
      rankAnimDelayRef.current = null;
    }

    rankAnimDelayRef.current = window.setTimeout(() => {
      const start = performance.now();
      const duration = 600;
      const target = Math.max(1, myEntry.rank);

      const step = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(1, elapsed / duration);
        const value = Math.max(1, Math.round(target * progress));
        setRankAnimValue(value);
        if (progress < 1) {
          rankAnimRef.current = window.requestAnimationFrame(step);
        } else {
          setRankAnimValue(target);
          setRankAnimActive(false);
          setRankAnimDone(true);
        }
      };

      rankAnimRef.current = window.requestAnimationFrame(step);
    }, 200);

    return () => {
      if (rankAnimRef.current) {
        window.cancelAnimationFrame(rankAnimRef.current);
        rankAnimRef.current = null;
      }
      if (rankAnimDelayRef.current) {
        window.clearTimeout(rankAnimDelayRef.current);
        rankAnimDelayRef.current = null;
      }
    };
  }, [leaderboardAnimNonce, myEntry, tab]);

  useEffect(() => {
    return () => {
      if (rankAnimRef.current) {
        window.cancelAnimationFrame(rankAnimRef.current);
        rankAnimRef.current = null;
      }
      if (rankAnimDelayRef.current) {
        window.clearTimeout(rankAnimDelayRef.current);
        rankAnimDelayRef.current = null;
      }
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 950,
        background: "rgba(0, 0, 0, 0.55)",
        backdropFilter: "blur(6px)",
        display: "grid",
        placeItems: "center",
        padding: 12,
      }}
    >
      <div
        ref={panelRef}
        className="quiz-ui"
        style={{
          width: "min(900px, calc(100vw - 24px))",
          height: "min(860px, calc(100vh - 24px))",
          background: "var(--panel)",
          border: "1px solid var(--border)",
          borderRadius: 18,
          boxShadow: "var(--shadow-2)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 16px",
            borderBottom: "1px solid var(--border)",
            background: "var(--panel)",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, minWidth: 0 }}>
            <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
              <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: "-0.01em" }}>
                Daily Quiz
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                {auth.me?.username ? `Logged in as ${username}` : "Guest Mode — progress not saved"}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {tabs.map((t) => (
                <TabButton key={t.key} active={tab === t.key} onClick={() => setTab(t.key)}>
                  {t.label}
                </TabButton>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: "0 0 auto" }}>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close"
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color: "var(--text)",
                cursor: "pointer",
                fontSize: 18,
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
          <div
            style={{
              display: tab === "quiz" || tab === "admin" ? "block" : "none",
              height: "100%",
            }}
          >
            <QuizModal
              isOpen
              onClose={onClose}
              isAdmin={isAdmin}
              initialTab={tab === "admin" ? "admin" : "quiz"}
              onViewLeaderboard={handleViewLeaderboard}
              variant="embedded"
              closeHandleRef={quizModalCloseRef}
            />
          </div>

          {tab === "leaderboard" ? (
            <section className="quiz-dev-leaderboard" style={{ height: "100%", overflow: "hidden" }}>
              <div className="lb-layout">
                <div className="lb-left">
                  <div className="lb-left-header">
                    <div className="lb-header-content">
                      <h3>Leaderboard</h3>
                      {(useDemoLeaderboard || leaderboardUsingDemo) && (
                        <span className="quiz-dev-demo-label">Demo</span>
                      )}
                    </div>
                  </div>

                  <div className="lb-controls">
                    <label className="lb-toggle">
                      <input
                        type="checkbox"
                        checked={useDemoLeaderboard}
                        onChange={(event) => {
                          setUseDemoLeaderboard(event.target.checked);
                          leaderboardLoadedRef.current = false;
                          leaderboardScrollRef.current = false;
                          if (event.target.checked) {
                            setLeaderboardUsingDemo(true);
                            setLeaderboard(DEMO_LEADERBOARD.entries);
                          } else {
                            setLeaderboardUsingDemo(false);
                            setLeaderboard([]);
                          }
                        }}
                      />
                      <span>Use demo data</span>
                    </label>
                    <button
                      type="button"
                      className="lb-refresh-btn"
                      onClick={loadLeaderboard}
                      disabled={leaderboardLoading}
                    >
                      {leaderboardLoading ? "Refreshing..." : "Refresh"}
                    </button>
                  </div>

                  {myEntry ? (
                    rankAnimActive && !rankAnimDone ? (
                      <div className="lb-your-card lb-finding">
                        <span className="lb-finding-text">Finding your rank…</span>
                        <div className="lb-finding-bar">
                          <div
                            className="lb-finding-bar-fill"
                            style={{
                              width: `${
                                myEntry.rank
                                  ? Math.min(
                                      100,
                                      Math.round((rankAnimValue / myEntry.rank) * 100)
                                    )
                                  : 0
                              }%`,
                            }}
                          />
                        </div>
                        <span className="lb-finding-count">#{rankAnimValue}</span>
                      </div>
                    ) : (
                      <div className="lb-your-card">
                        <span className="lb-your-title">Your Position</span>
                        <div className="lb-your-stats">
                          <div className="lb-stat">
                            <span className="lb-stat-label">Rank</span>
                            <span className="lb-stat-value">#{myEntry.rank}</span>
                          </div>
                          <div className="lb-stat-separator"></div>
                          <div className="lb-stat">
                            <span className="lb-stat-label">Streak</span>
                            <span className="lb-stat-value">{myEntry.longestStreak}</span>
                          </div>
                          <div className="lb-stat-separator"></div>
                          <div className="lb-stat">
                            <span className="lb-stat-label">Points</span>
                            <span className="lb-stat-value">{myEntry.totalPoints}</span>
                          </div>
                        </div>
                      </div>
                    )
                  ) : auth.me?.username && !useDemoLeaderboard && !leaderboardUsingDemo ? (
                    <div className="lb-your-card lb-empty">
                      <span className="lb-empty-text">
                        Complete a quiz to appear on the leaderboard.
                      </span>
                    </div>
                  ) : null}

                  <div className="lb-top-summary">
                    <span className="lb-top-summary-label">Top Performers</span>
                    <div className="lb-podium">
                      <div className="lb-podium-col lb-podium-second">
                        <span className="podium-rank-badge" data-rank="2">
                          #2
                        </span>
                        {renderPodiumGroup(2, podiumGroups.second, "No one yet")}
                      </div>
                      <div className="lb-podium-col lb-podium-first">
                        <span className="podium-rank-badge" data-rank="1">
                          #1
                        </span>
                        {renderPodiumGroup(1, podiumGroups.first, "No one yet")}
                      </div>
                      <div className="lb-podium-col lb-podium-third">
                        <span className="podium-rank-badge" data-rank="3">
                          #3
                        </span>
                        {renderPodiumGroup(3, podiumGroups.third, "No one yet")}
                      </div>
                    </div>
                  </div>

                  {leaderboardError && (
                    <p className="lb-error" role="status">
                      {leaderboardError}
                    </p>
                  )}
                </div>

                <div className="lb-right">
                  <div className="lb-table-header" role="row">
                    <span>Rank</span>
                    <span>User</span>
                    <span>Streak</span>
                    <span>Points</span>
                  </div>
                  <div className="lb-table-scroll">
                    {entries.length === 0 ? (
                      <div className="lb-table-empty">No entries yet.</div>
                    ) : (
                      <div className="lb-table-body" role="table">
                        {entries.map((entry, index) => {
                          const isMe =
                            auth.me?.username?.toLowerCase() === entry.username.toLowerCase();
                          const showDivider =
                            index > 0 && (index === 3 || index === 10 || index % 10 === 0);
                          const rowKey = `${entry.rank}-${entry.username}`;
                          return (
                            <Fragment key={rowKey}>
                              {showDivider && (
                                <div
                                  className="lb-table-divider"
                                ></div>
                              )}
                              <div
                                className={`lb-table-row ${isMe ? "lb-table-row--me" : ""}`}
                                data-username={entry.username.toLowerCase()}
                                role="row"
                              >
                                <span className="lb-table-rank">
                                  <span className="lb-rank-badge" data-rank={entry.rank}>
                                    {entry.rank}
                                  </span>
                                </span>
                                <span className="lb-table-user">
                                  {entry.username}
                                  {isMe && <span className="lb-you-badge">YOU</span>}
                                </span>
                                <span className="lb-table-streak">{entry.longestStreak}</span>
                                <span className="lb-table-points">{entry.totalPoints}</span>
                              </div>
                            </Fragment>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          {tab === "data" ? (
            <div style={{ height: "100%", overflow: "auto", padding: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>Data</h3>
              <p style={{ margin: "8px 0 0 0", color: "var(--text-muted)", fontSize: 12 }}>
                Static demo leaderboard dataset used by the standalone quiz page.
              </p>

              <div style={{ marginTop: 12, display: "grid", gap: 8, fontSize: 12 }}>
                <div>
                  <span style={{ color: "var(--text-muted)" }}>Total participants:</span>{" "}
                  <span className="nums">{DEMO_LEADERBOARD.totalParticipants}</span>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)" }}>Last updated:</span>{" "}
                  <span className="nums">{DEMO_LEADERBOARD.lastUpdated}</span>
                </div>
              </div>

              <pre
                style={{
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  color: "var(--text)",
                  fontSize: 11,
                  lineHeight: 1.4,
                  overflow: "auto",
                }}
              >
                {JSON.stringify(DEMO_LEADERBOARD, null, 2)}
              </pre>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function TabButton(props: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      style={{
        padding: "6px 10px",
        borderRadius: 999,
        border: props.active ? "1px solid rgba(245, 166, 35, 0.55)" : "1px solid var(--border)",
        background: props.active ? "rgba(245, 166, 35, 0.14)" : "transparent",
        color: props.active ? "var(--text)" : "var(--text-muted)",
        cursor: "pointer",
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: "0.01em",
      }}
    >
      {props.children}
    </button>
  );
}
