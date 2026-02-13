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
import type { Quest } from '../types/firestore.types';
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
}

type TabType = 'active' | 'completed';

export default function QuestMenu({
  activeQuests,
  completedQuests,
  selectedQuestId,
  onSelectQuest,
  onRemoveQuest,
  onCompleteQuest,
  onClose,
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
            />
          ) : (
            <CompletedQuestList quests={completedQuests} />
          )}
        </div>

        {/* Footer hint */}
        <div className="quest-menu-footer">
          <p className="quest-menu-hint">
            {activeTab === 'active' 
              ? 'Click a quest to track it in your quest tracker'
              : 'Completed quests and their rewards'}
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
}

function ActiveQuestList({ quests, selectedQuestId, onQuestClick, onRemoveQuest, onCompleteQuest }: ActiveQuestListProps) {
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

