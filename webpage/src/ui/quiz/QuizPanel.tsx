import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../../features/auth/AuthContext";
import { QuizModal } from "../../components/quiz/QuizModal";
import "../../styles/quiz-ui.css";

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

  // Debug: Log when isOpen prop changes
  useEffect(() => {
    console.log(`[QuizPanel] 🎮 isOpen prop changed to: ${isOpen}`);
    if (isOpen) {
      console.log(`[QuizPanel] 📂 Panel opening - initializing component`);
      console.log(`[QuizPanel] 👤 User: ${username} (${isAdmin ? 'Admin' : 'Player'})`);
    } else {
      console.log(`[QuizPanel] 📁 Panel closing - component will unmount`);
    }
  }, [isOpen, username, isAdmin]);

  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const quizModalCloseRef = useRef<null | (() => void)>(null);

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
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
    console.log(`[QuizPanel] 🚪 Close requested`);
    if (quizModalCloseRef.current) {
      console.log(`[QuizPanel] 🔄 Delegating close to QuizModal`);
      quizModalCloseRef.current();
      return;
    }
    console.log(`[QuizPanel] ✅ Closing panel directly`);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    console.log(`[QuizPanel] 🔄 Resetting to quiz view on panel open`);
    setShowLeaderboard(false);
    leaderboardLoadedRef.current = false;
    setLeaderboardError(null);
    leaderboardScrollRef.current = false;
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    console.log(`[QuizPanel] ⌨️ Setting up keyboard and click-outside listeners`);

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        console.log(`[QuizPanel] ⎋ Escape key pressed - closing panel`);
        handleClose();
      }
    }

    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node | null;
      if (!target) return;
      const panel = panelRef.current;
      if (!panel) return;
      if (panel.contains(target)) return;
      console.log(`[QuizPanel] 🖱️ Click outside panel detected - closing`);
      handleClose();
    }

    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      console.log(`[QuizPanel] 🧹 Cleaning up keyboard and click-outside listeners`);
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [handleClose, isOpen]);

  const loadLeaderboard = useCallback(async () => {
    setLeaderboardLoading(true);
    setLeaderboardError(null);
    try {
      const res = await fetch("/api/leaderboard?limit=50");
      const data = (await res.json()) as { entries?: LeaderboardEntry[] };
      if (!res.ok) {
        throw new Error("Failed to load leaderboard");
      }
      setLeaderboard(Array.isArray(data.entries) ? data.entries : []);
    } catch {
      setLeaderboardError("Failed to load leaderboard");
    } finally {
      leaderboardLoadedRef.current = true;
      setLeaderboardLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    if (!showLeaderboard) return;
    if (!leaderboardLoadedRef.current && !leaderboardLoading) {
      leaderboardScrollRef.current = false;
      void loadLeaderboard();
    }
  }, [isOpen, leaderboardLoading, loadLeaderboard, showLeaderboard]);

  // Pre-fetch leaderboard on panel open for header strip + info cards
  useEffect(() => {
    if (!isOpen) return;
    if (leaderboardLoadedRef.current || leaderboardLoading) return;
    void loadLeaderboard();
  }, [isOpen, leaderboardLoading, loadLeaderboard]);

  const entries = leaderboard;
  const meUsername = auth.me?.username;
  const myEntry = meUsername
    ? entries.find((entry) => entry.username.toLowerCase() === meUsername.toLowerCase())
    : undefined;

  const topPerformer = entries.length > 0 ? entries[0] : undefined;
  const myStats = myEntry
    ? { currentStreak: myEntry.currentStreak, totalPoints: myEntry.totalPoints }
    : undefined;
  const isLeaderboardEmpty = !leaderboardLoading && !leaderboardError && entries.length === 0;
  const showUnrankedHint =
    !!auth.me?.username && !myEntry && !leaderboardLoading && !leaderboardError && entries.length > 0;
  const leaderboardStatusLabel = leaderboardLoading
    ? entries.length > 0
      ? "Refreshing live standings..."
      : "Loading live standings..."
    : leaderboardError
      ? "Live data unavailable"
      : entries.length > 0
        ? `${entries.length} ranked players`
        : "Waiting for first completion";

  const handleViewLeaderboard = useCallback(() => {
    setShowLeaderboard(true);
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
    if (!showLeaderboard) {
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
  }, [leaderboardAnimNonce, myEntry, showLeaderboard]);

  useEffect(() => {
    if (!showLeaderboard) {
      setRankAnimActive(false);
      setRankAnimDone(false);
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
  }, [leaderboardAnimNonce, myEntry, showLeaderboard]);

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
      className="quiz-ui"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 950,
        background: "var(--overlay-backdrop)",
        backdropFilter: "blur(6px)",
        display: "grid",
        placeItems: "center",
        padding: "var(--space-3)",
      }}
    >
      <div
        ref={panelRef}
        className="quiz-panel quiz-ui"
        style={{
          width: "min(900px, calc(100vw - 24px))",
          height: "min(860px, calc(100vh - 24px))",
        }}
      >
        <div className="quiz-panel-header">
          <div className="quiz-panel-header-top">
            <span className="quiz-panel-title">DAILY QUIZ</span>
            <div className="quiz-panel-header-actions">
              {showLeaderboard ? (
                <button
                  type="button"
                  className="quiz-panel-chrome-btn"
                  onClick={() => setShowLeaderboard(false)}
                >
                  ← Quiz
                </button>
              ) : (
                <button
                  type="button"
                  className="quiz-panel-chrome-btn"
                  onClick={() => {
                    setShowLeaderboard(true);
                    setLeaderboardAnimNonce((prev) => prev + 1);
                    leaderboardScrollRef.current = false;
                  }}
                >
                  Leaderboard
                </button>
              )}
              <button
                type="button"
                className="quiz-panel-chrome-btn quiz-panel-chrome-btn--close"
                onClick={handleClose}
                aria-label="Close"
              >
                ×
              </button>
            </div>
          </div>
          {auth.mode === "guest" || auth.mode === "unknown" ? (
            <div className="quiz-panel-guest-notice">Log in to start your streak</div>
          ) : (
            <div className="quiz-panel-user-strip">
              <span className="quiz-panel-username">@{username}</span>
              <span className="quiz-panel-role-badge">{auth.me?.isAdmin ? "ADMIN" : "PLAYER"}</span>
              {myStats && (
                <div className="quiz-panel-stats">
                  <div className="quiz-panel-stat">
                    <span className="quiz-panel-stat-value">{myStats.currentStreak}</span>
                    <span className="quiz-panel-stat-label">Streak</span>
                  </div>
                  <div className="quiz-panel-stat-separator" />
                  <div className="quiz-panel-stat">
                    <span className="quiz-panel-stat-value">{myStats.totalPoints.toLocaleString()}</span>
                    <span className="quiz-panel-stat-label">Points</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
          <div
            style={{
              display: showLeaderboard ? "none" : "block",
              height: "100%",
            }}
          >
            <QuizModal
              isOpen
              onClose={onClose}
              isAdmin={isAdmin}
              onViewLeaderboard={handleViewLeaderboard}
              variant="embedded"
              closeHandleRef={quizModalCloseRef}
              topPerformer={topPerformer}
              myStats={myStats}
            />
          </div>

          {showLeaderboard ? (
            <section className="quiz-dev-leaderboard" style={{ height: "100%", overflow: "hidden" }}>
              <div className="lb-view">

                {/* Stats Row */}
                <div className="lb-stats-row">
                  <div className="lb-info-card">
                    <span className="lb-info-card-label">Today's Top</span>
                    {topPerformer ? (
                      <>
                        <span className="lb-info-card-value">{topPerformer.username}</span>
                        <span className="lb-info-card-sub">{topPerformer.totalPoints.toLocaleString()} pts</span>
                      </>
                    ) : (
                      <span className="lb-info-card-sub lb-info-card-sub--empty">No entries yet</span>
                    )}
                  </div>

                  {myEntry ? (
                    rankAnimActive && !rankAnimDone ? (
                      <div className="lb-info-card lb-info-card--accent lb-info-card--finding">
                        <span className="lb-info-card-label">Finding your rank…</span>
                        <div className="lb-finding-bar">
                          <div
                            className="lb-finding-bar-fill"
                            style={{
                              width: `${
                                myEntry.rank
                                  ? Math.min(100, Math.round((rankAnimValue / myEntry.rank) * 100))
                                  : 0
                              }%`,
                            }}
                          />
                        </div>
                        <span className="lb-finding-count">#{rankAnimValue}</span>
                      </div>
                    ) : (
                      <div className="lb-info-card lb-info-card--accent lb-info-card--stats">
                        <span className="lb-info-card-label">Your Position</span>
                        <div className="lb-info-stats">
                          <div className="lb-stat">
                            <span className="lb-stat-label">Rank</span>
                            <span className="lb-stat-value">#{myEntry.rank}</span>
                          </div>
                          <div className="lb-stat-separator" />
                          <div className="lb-stat">
                            <span className="lb-stat-label">Best</span>
                            <span className="lb-stat-value">{myEntry.longestStreak}</span>
                          </div>
                          <div className="lb-stat-separator" />
                          <div className="lb-stat">
                            <span className="lb-stat-label">Streak</span>
                            <span className="lb-stat-value">{myEntry.currentStreak}</span>
                          </div>
                          <div className="lb-stat-separator" />
                          <div className="lb-stat">
                            <span className="lb-stat-label">Points</span>
                            <span className="lb-stat-value">{myEntry.totalPoints}</span>
                          </div>
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="lb-info-card lb-info-card--accent">
                      <span className="lb-info-card-label">Your Position</span>
                      <span className="lb-info-card-value lb-info-card-value--muted">
                        {showUnrankedHint ? "Unranked" : "Guest"}
                      </span>
                      <span className="lb-info-card-sub">
                        {showUnrankedHint ? "Complete a quiz to appear" : "Log in to start your streak"}
                      </span>
                    </div>
                  )}

                  <div className="lb-info-card">
                    <span className="lb-info-card-label">Players Ranked</span>
                    <span className="lb-info-card-value">{entries.length}</span>
                    <span className={`lb-info-card-sub${leaderboardError ? " lb-info-card-sub--error" : ""}`}>
                      {leaderboardStatusLabel}
                    </span>
                  </div>
                </div>

                {/* Podium Section */}
                <div className="lb-podium-section">
                  <div className="lb-section-header">
                    <span className="lb-section-label">Top Performers</span>
                  </div>
                  <div className="lb-podium">
                    <div className="lb-podium-col lb-podium-second">
                      <span className="podium-rank-badge" data-rank="2">#2</span>
                      {renderPodiumGroup(2, podiumGroups.second, "No one yet")}
                    </div>
                    <div className="lb-podium-col lb-podium-first">
                      <span className="podium-rank-badge" data-rank="1">#1</span>
                      {renderPodiumGroup(1, podiumGroups.first, "No one yet")}
                    </div>
                    <div className="lb-podium-col lb-podium-third">
                      <span className="podium-rank-badge" data-rank="3">#3</span>
                      {renderPodiumGroup(3, podiumGroups.third, "No one yet")}
                    </div>
                  </div>
                </div>

                {/* Table Card */}
                <div className="lb-table-card">
                  <div className="lb-table-header" role="row">
                    <span>Rank</span>
                    <span>User</span>
                    <span>Streak</span>
                    <span>Points</span>
                  </div>
                  <div className="lb-table-scroll">
                    {leaderboardLoading && entries.length === 0 ? (
                      <div className="lb-table-empty">Loading live standings...</div>
                    ) : leaderboardError && entries.length === 0 ? (
                      <div className="lb-table-empty lb-table-empty--error">
                        Unable to load leaderboard.
                      </div>
                    ) : isLeaderboardEmpty ? (
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
                              {showDivider && <div className="lb-table-divider" />}
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

                {leaderboardError && (
                  <p className="lb-error" role="status">{leaderboardError}</p>
                )}

              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
