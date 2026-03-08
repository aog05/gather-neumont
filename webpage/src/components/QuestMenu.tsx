/**
 * QuestMenu - Expanded quest management modal
 * 
 * Full-screen modal that displays all active and completed quests.
 * Allows players to select which quest to track in the minimized view.
 * 
 * Features:
 * - Tabbed interface (Active / Completed)
 * - Quest selection for tracking
 * - Reward display
 * - Close on ESC key or click outside
 */

import { useState, useEffect } from 'react';
import { collection, getDocs, orderBy, limit, query } from 'firebase/firestore';
import { db, COLLECTIONS } from '../lib/firebase';
import type { Quest } from '../types/firestore.types';
import type { QuestObjective, QuestObjectiveProgress, QuestProgressMap } from '../types/quest.types';
import './QuestMenu.css';

interface QuestMenuProps {
  /** All active quests */
  activeQuests: Quest[];

  /** All completed quests */
  completedQuests: Quest[];

  /** Currently selected quest ID */
  selectedQuestId: string | null;

  /** Callback when user selects a quest to track */
  onSelectQuest: (questId: string) => void;

  /** Callback when user removes a quest */
  onRemoveQuest: (questId: string) => void;

  /** Callback when user completes a quest (TEST ONLY) */
  onCompleteQuest: (questId: string) => void;

  /** Callback to close the menu */
  onClose: () => void;

  /** Live objective progress from QuestTriggerSystem */
  objectiveProgress?: QuestProgressMap;
}

type TabType = 'active' | 'completed' | 'leaderboard';

export default function QuestMenu({
  activeQuests,
  completedQuests,
  selectedQuestId,
  onSelectQuest,
  onRemoveQuest,
  onCompleteQuest,
  onClose,
  objectiveProgress = {},
}: QuestMenuProps) {
  const [activeTab, setActiveTab] = useState<TabType>('active');

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleQuestClick = (questId: string) => {
    if (activeTab === 'active') {
      onSelectQuest(questId);
    }
  };

  return (
    <div className="quest-menu-overlay" onClick={handleOverlayClick}>
      <div className="quest-menu">
        {/* Header */}
        <div className="quest-menu-header">
          <h2 className="quest-menu-title">QUEST LOG</h2>
          <button className="quest-menu-close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="quest-menu-tabs">
          <button
            className={`quest-menu-tab ${activeTab === 'active' ? 'active' : ''}`}
            onClick={() => setActiveTab('active')}
          >
            Active Quests ({activeQuests.length})
          </button>
          <button
            className={`quest-menu-tab ${activeTab === 'completed' ? 'active' : ''}`}
            onClick={() => setActiveTab('completed')}
          >
            Completed ({completedQuests.length})
          </button>
          <button
            className={`quest-menu-tab ${activeTab === 'leaderboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('leaderboard')}
          >
            🏆 Leaderboard
          </button>
        </div>

        {/* Quest List */}
        <div className="quest-menu-content">
          {activeTab === 'active' ? (
            <ActiveQuestList
              quests={activeQuests}
              selectedQuestId={selectedQuestId}
              onQuestClick={handleQuestClick}
              onRemoveQuest={onRemoveQuest}
              onCompleteQuest={onCompleteQuest}
              objectiveProgress={objectiveProgress}
            />
          ) : activeTab === 'completed' ? (
            <CompletedQuestList quests={completedQuests} />
          ) : (
            <LeaderboardPanel />
          )}
        </div>

        {/* Footer hint */}
        <div className="quest-menu-footer">
          <p className="quest-menu-hint">
            {activeTab === 'active'
              ? 'Click a quest to track it in your quest tracker'
              : activeTab === 'completed'
              ? 'Completed quests and their rewards'
              : 'Top players ranked by completed quests'}
          </p>
        </div>
      </div>
    </div>
  );
}

interface ActiveQuestListProps {
  quests: Quest[];
  selectedQuestId: string | null;
  onQuestClick: (questId: string) => void;
  onRemoveQuest: (questId: string) => void;
  onCompleteQuest: (questId: string) => void;
  objectiveProgress: QuestProgressMap;
}

function ActiveQuestList({ quests, selectedQuestId, onQuestClick, onRemoveQuest, onCompleteQuest, objectiveProgress }: ActiveQuestListProps) {
  const handleRemoveClick = (e: React.MouseEvent, questId: string) => {
    e.stopPropagation(); // Prevent quest selection when clicking remove button
    onRemoveQuest(questId);
  };

  const handleCompleteClick = (e: React.MouseEvent, questId: string) => {
    e.stopPropagation(); // Prevent quest selection when clicking complete button
    onCompleteQuest(questId);
  };
  if (quests.length === 0) {
    return (
      <div className="quest-menu-empty">
        <p>No active quests</p>
        <p className="quest-menu-empty-hint">Talk to NPCs to receive quests</p>
      </div>
    );
  }

  return (
    <div className="quest-menu-list">
      {quests.map((quest) => (
        <div
          key={quest.id}
          className={`quest-menu-item ${selectedQuestId === quest.id ? 'selected' : ''}`}
          onClick={() => onQuestClick(quest.id)}
        >
          <div className="quest-menu-item-header">
            <h3 className="quest-menu-item-title">{quest.Title}</h3>
            <div className="quest-menu-item-header-actions">
              {selectedQuestId === quest.id && (
                <span className="quest-menu-item-badge">TRACKING</span>
              )}
              <button
                className="quest-menu-item-remove-btn"
                onClick={(e) => handleRemoveClick(e, quest.id)}
                title="Remove quest"
              >
                ×
              </button>
            </div>
          </div>
          <p className="quest-menu-item-desc">{quest.smalldesc}</p>

          {/* Objective progress (only shown when the quest has structured objectives) */}
          {quest.objectives && quest.objectives.length > 0 && (
            <ObjectiveList
              objectives={quest.objectives}
              progress={objectiveProgress[quest.id] ?? {}}
            />
          )}

          <div className="quest-menu-item-rewards">
            <span className="quest-menu-item-reward">⭐ {quest.Reward.Points} Points</span>
            {quest.Reward.Cosmetic && (
              <span className="quest-menu-item-reward">🎨 Cosmetic Reward</span>
            )}
          </div>

          {/* TEST: Complete Quest Button */}
          <button
            className="quest-menu-item-complete-btn"
            onClick={(e) => handleCompleteClick(e, quest.id)}
            title="[TEST] Complete this quest"
          >
            ✓ Complete Quest (TEST)
          </button>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Objective List — renders per-objective progress inside a quest card
// ============================================================================

interface ObjectiveListProps {
  objectives: QuestObjective[];
  progress: Record<string, QuestObjectiveProgress[string]>;
}

function ObjectiveList({ objectives, progress }: ObjectiveListProps) {
  return (
    <ul className="quest-objective-list">
      {objectives.map((obj) => {
        const prog = progress[obj.id];
        const done = prog?.completed ?? false;
        const current = prog?.currentValue ?? 0;
        const required = obj.requiredValue ?? 1;
        const isBinary = required === 1;

        return (
          <li key={obj.id} className={`quest-objective ${done ? 'done' : ''}`}>
            <span className="quest-objective-check">{done ? '✓' : '○'}</span>
            <span className="quest-objective-desc">{obj.description}</span>
            {!isBinary && (
              <span className="quest-objective-count">
                {current}/{required}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// ============================================================================
// SG9: Leaderboard — fetches top players by completed quest count
// ============================================================================

interface LeaderboardEntry {
  username: string;
  realName: string;
  completedCount: number;
  rank: number;
}

function LeaderboardPanel() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [lbLoading, setLbLoading] = useState(true);
  const [lbError, setLbError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchLeaderboard() {
      try {
        setLbLoading(true);
        setLbError(null);
        // Query top 10 players ordered by completed quest count (descending).
        // Note: Firestore cannot order by array length natively, so we fetch
        // and sort client-side. For large datasets, maintain a denormalised counter.
        const playersRef = collection(db, COLLECTIONS.PLAYER);
        const snap = await getDocs(query(playersRef, limit(50)));
        if (cancelled) return;

        const sorted: LeaderboardEntry[] = snap.docs
          .map((d) => {
            const data = d.data();
            return {
              username: data.Username ?? d.id,
              realName: data.RealName ?? "",
              completedCount: Array.isArray(data.CompletedQuests) ? data.CompletedQuests.length : 0,
              rank: 0,
            };
          })
          .sort((a, b) => b.completedCount - a.completedCount)
          .slice(0, 10)
          .map((e, i) => ({ ...e, rank: i + 1 }));

        setEntries(sorted);
      } catch (err) {
        if (!cancelled) setLbError("Failed to load leaderboard.");
        console.error("[LeaderboardPanel] Error fetching players:", err);
      } finally {
        if (!cancelled) setLbLoading(false);
      }
    }
    void fetchLeaderboard();
    return () => { cancelled = true; };
  }, []);

  if (lbLoading) return <div className="quest-menu-empty"><p>Loading leaderboard…</p></div>;
  if (lbError) return <div className="quest-menu-empty"><p>{lbError}</p></div>;
  if (entries.length === 0) return <div className="quest-menu-empty"><p>No players found.</p></div>;

  const medalEmoji = (rank: number) => rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;

  return (
    <div className="quest-menu-list">
      {entries.map((entry) => (
        <div key={entry.username} className="quest-menu-item leaderboard-entry">
          <span className="leaderboard-rank">{medalEmoji(entry.rank)}</span>
          <div className="leaderboard-info">
            <span className="leaderboard-name">{entry.realName || entry.username}</span>
            <span className="leaderboard-username">@{entry.username}</span>
          </div>
          <span className="leaderboard-count">{entry.completedCount} quests</span>
        </div>
      ))}
    </div>
  );
}

interface CompletedQuestListProps {
  quests: Quest[];
}

function CompletedQuestList({ quests }: CompletedQuestListProps) {
  if (quests.length === 0) {
    return (
      <div className="quest-menu-empty">
        <p>No completed quests</p>
        <p className="quest-menu-empty-hint">Complete quests to earn rewards</p>
      </div>
    );
  }

  return (
    <div className="quest-menu-list">
      {quests.map((quest) => (
        <div key={quest.id} className="quest-menu-item completed">
          <div className="quest-menu-item-header">
            <h3 className="quest-menu-item-title">{quest.Title}</h3>
            <span className="quest-menu-item-badge completed">✓ COMPLETED</span>
          </div>
          <p className="quest-menu-item-desc">{quest.smalldesc}</p>
          <div className="quest-menu-item-rewards">
            <span className="quest-menu-item-reward earned">⭐ {quest.Reward.Points} Points</span>
            {quest.Reward.Cosmetic && (
              <span className="quest-menu-item-reward earned">🎨 Cosmetic Earned</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

