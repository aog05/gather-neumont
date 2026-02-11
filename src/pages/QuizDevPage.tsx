import { useEffect, useRef, useState } from "react";
import { QuizModal } from "../components/quiz/QuizModal";
import { DEMO_LEADERBOARD } from "../demo/demoLeaderboard";
import "./QuizDevPage.css";
import "../styles/quiz-ui.css";

type AuthUser = {
  id: string;
  username: string;
  isAdmin: boolean;
};

type LeaderboardEntry = {
  rank: number;
  username: string;
  longestStreak: number;
  currentStreak: number;
  totalPoints: number;
};

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

export default function QuizDevPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"quiz" | "leaderboard" | "admin">(
    "quiz"
  );
  const [modalInitialTab, setModalInitialTab] = useState<
    "quiz" | "admin" | "questions" | "schedule"
  >("quiz");
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [usernameInput, setUsernameInput] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [guestWarning, setGuestWarning] = useState(false);
  const [guestMode, setGuestMode] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
  const [leaderboardUsingDemo, setLeaderboardUsingDemo] = useState(false);
  const leaderboardScrollRef = useRef(false);
  const [leaderboardAnimNonce, setLeaderboardAnimNonce] = useState(0);
  const leaderboardLoadedRef = useRef(false);
  const [useDemoLeaderboard, setUseDemoLeaderboard] = useState(true);
  const [rankAnimActive, setRankAnimActive] = useState(false);
  const [rankAnimValue, setRankAnimValue] = useState(0);
  const [rankAnimDone, setRankAnimDone] = useState(false);
  const rankAnimRef = useRef<number | null>(null);
  const rankAnimDelayRef = useRef<number | null>(null);
  const rankAnimKeyRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadAuth = async () => {
      try {
        const res = await fetch("/api/auth/me");
        const data = (await res.json()) as { user: AuthUser | null };
        if (!cancelled) {
          setAuthUser(data.user);
          if (data.user?.username) {
            setUsernameInput(data.user.username);
          }
          const storedGuest = sessionStorage.getItem("guestMode") === "true";
          setGuestMode(storedGuest);
        }
      } catch {
        if (!cancelled) {
          setAuthUser(null);
          const storedGuest = sessionStorage.getItem("guestMode") === "true";
          setGuestMode(storedGuest);
        }
      }
    };

    loadAuth();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!authUser?.isAdmin && activeTab === "admin") {
      setActiveTab("quiz");
    }
  }, [authUser, activeTab]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = usernameInput.trim();
    if (!trimmed || trimmed.toLowerCase() === "guest") {
      setGuestWarning(true);
      setAuthError(null);
      return;
    }
    if (!USERNAME_REGEX.test(trimmed)) {
      setAuthError("Username must be 3-20 letters, numbers, or _");
      return;
    }

    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: trimmed }),
      });
      const data = (await res.json()) as {
        user?: AuthUser;
        error?: string;
      };
      if (!res.ok || !data.user) {
        setAuthError(data.error ?? "Login failed");
        return;
      }
      setAuthUser(data.user);
      setUsernameInput(data.user.username);
      sessionStorage.removeItem("guestMode");
      setGuestMode(false);
      setActiveTab("quiz");
    } catch {
      setAuthError("Login failed");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGuestContinue = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Ignore logout errors for guest flow
    }
    setAuthUser(null);
    setAuthError(null);
    setGuestWarning(false);
    sessionStorage.setItem("guestMode", "true");
    setGuestMode(true);
    if (!sessionStorage.getItem("guestToken")) {
      sessionStorage.setItem("guestToken", `guest_${crypto.randomUUID()}`);
    }
    setActiveTab("quiz");
  };

  const handleGuestChange = () => {
    setGuestWarning(false);
    setAuthError(null);
  };

  const handleOpenQuiz = () => {
    setModalInitialTab("quiz");
    setIsModalOpen(true);
  };

  const handleOpenAdminPanel = () => {
    setModalInitialTab("admin");
    setIsModalOpen(true);
  };

  const showMainUi = !!authUser || guestMode;
  const displayedLeaderboard = useDemoLeaderboard
    ? DEMO_LEADERBOARD
    : { entries: leaderboard };
  const entries = displayedLeaderboard.entries ?? [];
  const meUsername = authUser?.username;
  const myEntry = meUsername
    ? entries.find(
        (entry) => entry.username.toLowerCase() === meUsername.toLowerCase()
      )
    : undefined;
  const previewLeaderboard =
    entries.length > 0 ? entries : DEMO_LEADERBOARD.entries;
  const topStreak = previewLeaderboard[0];

  const loadLeaderboard = async () => {
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
  };

  const getRankIcon = (rank: number) => {
    return String(rank);
  };

  useEffect(() => {
    if (activeTab !== "leaderboard") {
      return;
    }
    if (!leaderboardLoadedRef.current && !leaderboardLoading) {
      leaderboardScrollRef.current = false;
      loadLeaderboard();
    }
  }, [activeTab, leaderboardLoading, useDemoLeaderboard]);

  useEffect(() => {
    if (activeTab !== "leaderboard") {
      return;
    }
    if (!myEntry || leaderboardScrollRef.current) {
      return;
    }
    if (leaderboardAnimNonce === 0) {
      return;
    }
    const targetUsername = myEntry.username.toLowerCase();
    const el = document.querySelector(
      `[data-username="${targetUsername}"]`
    ) as HTMLElement | null;
    if (el) {
      leaderboardScrollRef.current = true;
      el.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [activeTab, myEntry, leaderboardAnimNonce]);

  useEffect(() => {
    if (activeTab !== "leaderboard") {
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
  }, [activeTab, myEntry, leaderboardAnimNonce]);

  const handleViewLeaderboard = () => {
    setActiveTab("leaderboard");
    setLeaderboardAnimNonce((prev) => prev + 1);
    leaderboardScrollRef.current = false;
    setIsModalOpen(false);
  };

  const getPodiumGroup = (rank: number) =>
    entries.filter((entry) => entry.rank === rank);

  const podiumGroups = {
    first: getPodiumGroup(1),
    second: getPodiumGroup(2),
    third: getPodiumGroup(3),
  };

  const renderPodiumGroup = (
    rankNum: number,
    entries: LeaderboardEntry[],
    emptyLabel: string
  ) => {
    const visible = entries.slice(0, 3);
    const remaining = entries.length - visible.length;
    const isTied = entries.length > 1;

    if (entries.length === 0) {
      return (
        <div className="podium-content">
          <span className="podium-empty">{emptyLabel}</span>
        </div>
      );
    }

    return (
      <div className="podium-content">
        {isTied && (
          <span className="podium-tie-label">Tied for #{rankNum}</span>
        )}
        <div className="podium-names">
          {visible.map((entry, idx) => (
            <span className="podium-name" key={`${rankNum}-${entry.username}-${idx}`}>
              {entry.username}
            </span>
          ))}
          {remaining > 0 && (
            <span className="podium-more">+{remaining} more</span>
          )}
        </div>
      </div>
    );
  };

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

  return (
    <div className="quiz-dev-shell">
      <div className="quiz-ui quiz-dev-panel">
        <div className="quiz-dev-page">
        {!showMainUi ? (
          <main className="quiz-dev-content quiz-dev-content--login">
            <div className="login-card">
              <div className="login-header">
                <h1 className="login-title">Daily Quiz</h1>
                <p className="login-subtitle">Sign in to track your progress and compete on the leaderboard.</p>
              </div>
              
              {guestWarning ? (
                <div className="login-guest-warning">
                  <div className="login-warning-icon">
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M9 16.5C13.1421 16.5 16.5 13.1421 16.5 9C16.5 4.85786 13.1421 1.5 9 1.5C4.85786 1.5 1.5 4.85786 1.5 9C1.5 13.1421 4.85786 16.5 9 16.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M9 6V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M9 12H9.0075" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="login-warning-content">
                    <p className="login-warning-title">Guest Mode</p>
                    <p className="login-warning-text">
                      Your progress won't be saved. Create an account to save your progress and appear on the leaderboard.
                    </p>
                  </div>
                  <div className="login-warning-actions">
                    <button
                      type="button"
                      className="login-btn login-btn--secondary"
                      onClick={handleGuestChange}
                      disabled={authLoading}
                    >
                      Change Username
                    </button>
                    <button
                      type="button"
                      className="login-btn login-btn--warning"
                      onClick={handleGuestContinue}
                      disabled={authLoading}
                    >
                      Continue as Guest
                    </button>
                  </div>
                </div>
              ) : (
                <form className="login-form" onSubmit={handleLogin}>
                  <div className="login-input-group">
                    <input
                      className="login-input"
                      type="text"
                      name="username"
                      value={usernameInput}
                      placeholder="Username"
                      autoComplete="username"
                      onChange={(event) => setUsernameInput(event.target.value)}
                      disabled={authLoading}
                    />
                  </div>
                  <button
                    type="submit"
                    className="login-btn login-btn--primary"
                    disabled={authLoading}
                  >
                    {authLoading ? "Signing in..." : "Sign In"}
                  </button>
                  {authError && (
                    <p className="login-error" role="status">
                      {authError}
                    </p>
                  )}
                </form>
              )}
            </div>
          </main>
        ) : (
          <>
        <header className="quiz-dev-header">
          <div className="quiz-dev-tabs" role="tablist" aria-label="Dev tabs">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "quiz"}
              className={`quiz-dev-tab ${activeTab === "quiz" ? "active" : ""}`}
              onClick={() => setActiveTab("quiz")}
            >
              Quiz
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "leaderboard"}
              className={`quiz-dev-tab ${activeTab === "leaderboard" ? "active" : ""}`}
              onClick={() => setActiveTab("leaderboard")}
            >
              Leaderboard
            </button>
            {authUser?.isAdmin && (
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "admin"}
                className={`quiz-dev-tab ${activeTab === "admin" ? "active" : ""}`}
                onClick={() => setActiveTab("admin")}
              >
                Admin
              </button>
            )}
          </div>
        </header>

        <main className="quiz-dev-content">
          {activeTab === "quiz" && (
            <div className="quiz-tab-container">
              <div className="quiz-tab-header">
                <h1 className="quiz-tab-title">Daily Quiz</h1>
                <p className="quiz-tab-subtitle">
                  {authUser 
                    ? `Logged in as ${authUser.username}` 
                    : "Guest Mode — Progress won't be saved"}
                </p>
              </div>

              <button className="quiz-primary-action" onClick={handleOpenQuiz}>
                <span className="quiz-primary-action-text">Start Daily Quiz</span>
                <svg className="quiz-primary-action-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              {topStreak && (
                <div className="quiz-info-section">
                  <span className="quiz-section-label">Current Leader</span>
                  <div className="quiz-streak-card">
                    <div className="quiz-streak-user">
                      <span className="quiz-streak-rank-badge" data-rank="1">
                        #1
                      </span>
                      <span className="quiz-streak-username">{topStreak.username}</span>
                    </div>
                    <div className="quiz-streak-stats">
                      <div className="quiz-streak-stat">
                        <span className="quiz-streak-stat-value">{topStreak.longestStreak}</span>
                        <span className="quiz-streak-stat-label">Streak</span>
                      </div>
                      <div className="quiz-streak-divider"></div>
                      <div className="quiz-streak-stat">
                        <span className="quiz-streak-stat-value">{topStreak.totalPoints}</span>
                        <span className="quiz-streak-stat-label">Points</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}
          {activeTab === "leaderboard" && (
            <section className="quiz-dev-leaderboard">
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
                          <span className="lb-finding-text">
                            Finding your rank…
                          </span>
                          <div className="lb-finding-bar">
                            <div
                              className="lb-finding-bar-fill"
                              style={{
                                width: `${
                                  myEntry.rank
                                    ? Math.min(
                                        100,
                                        Math.round(
                                          (rankAnimValue / myEntry.rank) * 100
                                        )
                                      )
                                    : 0
                                }%`,
                              }}
                            />
                          </div>
                          <span className="lb-finding-count">
                            #{rankAnimValue}
                          </span>
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
                    ) : authUser && !useDemoLeaderboard && !leaderboardUsingDemo ? (
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
                          <span className="podium-rank-badge" data-rank="2">#2</span>
                          {renderPodiumGroup(
                            2,
                            podiumGroups.second,
                            "No one yet"
                          )}
                        </div>
                        <div className="lb-podium-col lb-podium-first">
                          <span className="podium-rank-badge" data-rank="1">#1</span>
                          {renderPodiumGroup(
                            1,
                            podiumGroups.first,
                            "No one yet"
                          )}
                        </div>
                        <div className="lb-podium-col lb-podium-third">
                          <span className="podium-rank-badge" data-rank="3">#3</span>
                          {renderPodiumGroup(
                            3,
                            podiumGroups.third,
                            "No one yet"
                          )}
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
                        <div className="lb-table-empty">
                          No entries yet.
                        </div>
                      ) : (
                        <div className="lb-table-body" role="table">
                          {entries.map((entry, index) => {
                            const isMe =
                              authUser?.username?.toLowerCase() ===
                              entry.username.toLowerCase();
                            const showDivider = index > 0 && (index === 3 || index === 10 || index % 10 === 0);
                            return (
                              <>
                                {showDivider && <div className="lb-table-divider" key={`divider-${index}`}></div>}
                                <div
                                  className={`lb-table-row ${
                                    isMe ? "lb-table-row--me" : ""
                                  }`}
                                  data-username={entry.username.toLowerCase()}
                                  key={`${entry.rank}-${entry.username}`}
                                  role="row"
                                >
                                  <span className="lb-table-rank">
                                    <span className="lb-rank-badge" data-rank={entry.rank}>
                                      {entry.rank}
                                    </span>
                                  </span>
                                  <span className="lb-table-user">
                                    {entry.username}
                                    {isMe && (
                                      <span className="lb-you-badge">YOU</span>
                                    )}
                                  </span>
                                  <span className="lb-table-streak">{entry.longestStreak}</span>
                                  <span className="lb-table-points">{entry.totalPoints}</span>
                                </div>
                              </>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            )}
          {activeTab === "admin" && authUser?.isAdmin && (
            <div className="quiz-tab-container">
              <div className="quiz-tab-header">
                <h1 className="quiz-tab-title">Admin Panel</h1>
                <p className="quiz-tab-subtitle">Manage questions, schedule, and quiz settings.</p>
              </div>

              <button
                type="button"
                className="quiz-primary-action"
                onClick={handleOpenAdminPanel}
              >
                <span className="quiz-primary-action-text">Open Admin Panel</span>
                <svg className="quiz-primary-action-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          )}
        </main>
          </>
        )}
        </div>
      </div>

      <QuizModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        isAdmin={!!authUser?.isAdmin}
        initialTab={modalInitialTab}
        onViewLeaderboard={handleViewLeaderboard}
      />
    </div>
  );
}
