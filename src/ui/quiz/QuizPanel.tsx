import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../features/auth/AuthContext";
import { QuizModal } from "../../components/quiz/QuizModal";
import NeumontPanelShell from "../../components/NeumontPanelShell";

type Tab = "quiz" | "leaderboard" | "admin";
type AdminSubTab = "admin" | "questions" | "schedule";

type LeaderboardEntry = {
  playerId: string;
  displayName: string;
  streakDays: number;
  totalPoints: number;
};

export default function QuizPanel(props: { isOpen: boolean; onClose: () => void }) {
  const { isOpen, onClose } = props;
  const auth = useAuth();
  const isAdmin = auth.mode === "admin";
  const username = auth.me?.username ?? "Guest";

  const [tab, setTab] = useState<Tab>("quiz");
  const [adminSubTab, setAdminSubTab] = useState<AdminSubTab>("admin");
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
    if (quizModalCloseRef.current) {
      quizModalCloseRef.current();
      return;
    }
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    setTab("quiz");
    setAdminSubTab("admin");
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
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
      setLeaderboard(data.entries);
      leaderboardLoadedRef.current = true;
    } catch {
      setLeaderboardError("Failed to load leaderboard");
      setLeaderboard([]);
      leaderboardLoadedRef.current = true;
    } finally {
      setLeaderboardLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    if (tab !== "leaderboard") return;
    if (!leaderboardLoadedRef.current && !leaderboardLoading) {
      leaderboardScrollRef.current = false;
      void loadLeaderboard();
    }
  }, [isOpen, leaderboardLoading, loadLeaderboard, tab]);

  const showAdminTab = isAdmin;
  const tabs = useMemo(() => {
    const base: Array<{ key: Tab; label: string }> = [
      { key: "quiz", label: "Quiz" },
      { key: "leaderboard", label: "Leaderboard" },
    ];
    if (showAdminTab) base.push({ key: "admin", label: "Admin" });
    return base;
  }, [showAdminTab]);

  const adminSubTabs = useMemo(
    () => [
      { key: "admin" as const, label: "Admin" },
      { key: "questions" as const, label: "Questions" },
      { key: "schedule" as const, label: "Schedule" },
    ],
    []
  );

  const entries = leaderboard.map((entry, index) => ({
    ...entry,
    rank: index + 1,
  }));
  const meUsername = auth.me?.username;
  const myEntry = meUsername
    ? entries.find(
        (entry) => entry.displayName.toLowerCase() === meUsername.toLowerCase()
      )
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
        <div className="quest-leaderboard-podium-content">
          <span className="quest-leaderboard-podium-empty">{emptyLabel}</span>
        </div>
      );
    }

    return (
      <div className="quest-leaderboard-podium-content">
        {isTied && <span className="quest-leaderboard-podium-tie-label">Tied for #{rankNum}</span>}
        <div className="quest-leaderboard-podium-names">
          {visible.map((entry, idx) => (
            <span
              className="quest-leaderboard-podium-name"
              key={`${rankNum}-${entry.playerId}-${idx}`}
            >
              {entry.displayName}
            </span>
          ))}
          {remaining > 0 && <span className="quest-leaderboard-podium-more">+{remaining} more</span>}
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
    const targetUsername = myEntry.displayName.toLowerCase();
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

    const animKey = `leaderboard:${leaderboardAnimNonce}:${myEntry.playerId}:${myEntry.rank}`;
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

  const shellTabs = tabs.map((item) => ({ id: item.key, label: item.label }));
  const sessionLabel = auth.me?.username
    ? `Logged in as ${username}`
    : "Guest Mode - progress not saved";

  return (
    <NeumontPanelShell
      title="Daily Quiz"
      onClose={handleClose}
      onOverlayClick={handleClose}
      tabs={shellTabs}
      activeTabId={tab}
      onTabSelect={(tabId) => setTab(tabId as Tab)}
      maxWidth={900}
      panelStyle={{
        width: "min(900px, calc(100vw - 24px))",
        height: "min(860px, calc(100vh - 24px))",
      }}
      contentStyle={{
        padding: 0,
        overflow: "hidden",
        minHeight: 0,
      }}
      headerRight={<span className="quest-leaderboard-session-label">{sessionLabel}</span>}
    >
      <div className="quest-quiz-panel-body">
        <div className={`quest-quiz-panel-main${tab === "quiz" || tab === "admin" ? " is-active" : ""}`}>
          {tab === "admin" ? (
            <div className="quest-menu-tabs" role="tablist">
              {adminSubTabs.map((subTab) => (
                <button
                  key={subTab.key}
                  type="button"
                  className={`quest-menu-tab${adminSubTab === subTab.key ? " active" : ""}`}
                  onClick={() => setAdminSubTab(subTab.key)}
                  role="tab"
                  aria-selected={adminSubTab === subTab.key}
                >
                  {subTab.label}
                </button>
              ))}
            </div>
          ) : null}

          <div className="quest-quiz-panel-modal-slot">
            <QuizModal
              isOpen
              onClose={onClose}
              isAdmin={isAdmin}
              initialTab={tab === "admin" ? adminSubTab : "quiz"}
              activeTabOverride={tab === "admin" ? adminSubTab : undefined}
              onRequestQuizTab={() => setTab("quiz")}
              onViewLeaderboard={handleViewLeaderboard}
              variant="embedded"
              closeHandleRef={quizModalCloseRef}
            />
          </div>
        </div>

        {tab === "leaderboard" ? (
          <section className="quest-leaderboard">
            <div className="quest-leaderboard-layout">
              <div className="quest-leaderboard-side">
                <div className="quest-leaderboard-title-row">
                  <h3 className="quest-leaderboard-title">Leaderboard</h3>
                </div>

                <div className="quest-leaderboard-controls">
                  <button
                    type="button"
                    className="quest-menu-action-btn quest-leaderboard-refresh-btn"
                    onClick={loadLeaderboard}
                    disabled={leaderboardLoading}
                  >
                    {leaderboardLoading ? "Refreshing..." : "Refresh"}
                  </button>
                </div>

                {myEntry ? (
                  rankAnimActive && !rankAnimDone ? (
                    <div className="quest-leaderboard-card quest-leaderboard-card--finding">
                      <span className="quest-leaderboard-finding-text">Finding your rank...</span>
                      <div className="quest-leaderboard-finding-bar">
                        <div
                          className="quest-leaderboard-finding-bar-fill"
                          style={{
                            width: `${
                              myEntry.rank
                                ? Math.min(100, Math.round((rankAnimValue / myEntry.rank) * 100))
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                      <span className="quest-leaderboard-finding-count">#{rankAnimValue}</span>
                    </div>
                  ) : (
                    <div className="quest-leaderboard-card">
                      <span className="quest-leaderboard-card-title">Your Position</span>
                      <div className="quest-leaderboard-stats">
                        <div className="quest-leaderboard-stat">
                          <span className="quest-leaderboard-stat-label">Rank</span>
                          <span className="quest-leaderboard-stat-value">#{myEntry.rank}</span>
                        </div>
                        <div className="quest-leaderboard-stat-separator"></div>
                        <div className="quest-leaderboard-stat">
                          <span className="quest-leaderboard-stat-label">Streak</span>
                          <span className="quest-leaderboard-stat-value">{myEntry.streakDays}</span>
                        </div>
                        <div className="quest-leaderboard-stat-separator"></div>
                        <div className="quest-leaderboard-stat">
                          <span className="quest-leaderboard-stat-label">Points</span>
                          <span className="quest-leaderboard-stat-value">{myEntry.totalPoints}</span>
                        </div>
                      </div>
                    </div>
                  )
                ) : auth.me?.username ? (
                  <div className="quest-leaderboard-card quest-leaderboard-card--empty">
                    <span className="quest-leaderboard-empty-text">
                      Complete a quiz to appear on the leaderboard.
                    </span>
                  </div>
                ) : null}

                <div className="quest-leaderboard-podium-shell">
                  <span className="quest-leaderboard-podium-title">Top Performers</span>
                  <div className="quest-leaderboard-podium">
                    <div className="quest-leaderboard-podium-col quest-leaderboard-podium-col--second">
                      <span className="quest-leaderboard-rank-badge" data-rank="2">
                        #2
                      </span>
                      {renderPodiumGroup(2, podiumGroups.second, "No one yet")}
                    </div>
                    <div className="quest-leaderboard-podium-col quest-leaderboard-podium-col--first">
                      <span className="quest-leaderboard-rank-badge" data-rank="1">
                        #1
                      </span>
                      {renderPodiumGroup(1, podiumGroups.first, "No one yet")}
                    </div>
                    <div className="quest-leaderboard-podium-col quest-leaderboard-podium-col--third">
                      <span className="quest-leaderboard-rank-badge" data-rank="3">
                        #3
                      </span>
                      {renderPodiumGroup(3, podiumGroups.third, "No one yet")}
                    </div>
                  </div>
                </div>

                {leaderboardError && (
                  <p className="quest-leaderboard-error" role="status">
                    {leaderboardError}
                  </p>
                )}
              </div>

              <div className="quest-leaderboard-table-shell">
                <div className="quest-leaderboard-table-header" role="row">
                  <span>Rank</span>
                  <span>User</span>
                  <span>Streak</span>
                  <span>Points</span>
                </div>
                <div className="quest-leaderboard-table-scroll">
                  {entries.length === 0 ? (
                    <div className="quest-leaderboard-table-empty">No entries yet.</div>
                  ) : (
                    <div className="quest-leaderboard-table-body" role="table">
                      {entries.map((entry, index) => {
                        const isMe =
                          auth.me?.username?.toLowerCase() ===
                          entry.displayName.toLowerCase();
                        const showDivider = index > 0 && (index === 3 || index === 10 || index % 10 === 0);
                        const rowKey = `${entry.rank}-${entry.playerId}`;
                        return (
                          <Fragment key={rowKey}>
                            {showDivider && <div className="quest-leaderboard-table-divider"></div>}
                            <div
                              className={`quest-leaderboard-row ${isMe ? "quest-leaderboard-row--me" : ""}`}
                              data-username={entry.displayName.toLowerCase()}
                              role="row"
                            >
                              <span className="quest-leaderboard-rank-cell">
                                <span className="quest-leaderboard-row-rank" data-rank={entry.rank}>
                                  {entry.rank}
                                </span>
                              </span>
                              <span className="quest-leaderboard-user">
                                {entry.displayName}
                                {isMe && <span className="quest-leaderboard-you-badge">YOU</span>}
                              </span>
                              <span className="quest-leaderboard-streak">{entry.streakDays}</span>
                              <span className="quest-leaderboard-points">{entry.totalPoints}</span>
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

      </div>
    </NeumontPanelShell>
  );
}
