/**
 * QuestTracker - Minimized quest display component
 * 
 * Displays the currently tracked quest in the top-right corner of the screen.
 * Clicking expands into the full QuestMenu.
 * 
 * Features:
 * - Minimal screen coverage (250-300px wide)
 * - Semi-transparent background
 * - Shows quest title and short description
 * - Click to expand into QuestMenu
 */

import { useState } from 'react';
import type { Quest } from '../types/firestore.types';
import QuestMenu from './QuestMenu';
import './QuestTracker.css';

interface QuestTrackerProps {
  /** Currently selected/tracked quest */
  selectedQuest: Quest | null;

  /** All active quests */
  activeQuests: Quest[];

  /** All completed quests */
  completedQuests: Quest[];

  /** Callback when user selects a different quest to track */
  onSelectQuest: (questId: string) => void;

  /** Callback when user removes a quest */
  onRemoveQuest: (questId: string) => void;

  /** Callback when user completes a quest (TEST ONLY) */
  onCompleteQuest: (questId: string) => void;

  /** Loading state */
  loading?: boolean;
}

export default function QuestTracker({
  selectedQuest,
  activeQuests,
  completedQuests,
  onSelectQuest,
  onRemoveQuest,
  onCompleteQuest,
  loading = false,
}: QuestTrackerProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleTrackerClick = () => {
    setIsMenuOpen(true);
  };

  const handleCloseMenu = () => {
    setIsMenuOpen(false);
  };

  const handleQuestSelect = (questId: string) => {
    onSelectQuest(questId);
    setIsMenuOpen(false);
  };

  // Always show the tracker, even when loading or no quests
  if (loading) {
    return (
      <div className="quest-tracker quest-tracker-loading">
        <div className="quest-tracker-header">
          <span className="quest-tracker-title">QUESTS</span>
        </div>
        <div className="quest-tracker-content">
          <p className="quest-tracker-loading-text">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="quest-tracker" onClick={handleTrackerClick}>
        {/* Header */}
        <div className="quest-tracker-header">
          <span className="quest-tracker-title">QUEST</span>
          <span className="quest-tracker-count">{activeQuests.length}</span>
        </div>

        {/* Content */}
        {selectedQuest ? (
          <div className="quest-tracker-content">
            <h3 className="quest-tracker-quest-title">{selectedQuest.Title}</h3>
            <p className="quest-tracker-quest-desc">{selectedQuest.smalldesc}</p>
            
            {/* Reward indicator */}
            <div className="quest-tracker-reward">
              <span className="quest-tracker-reward-icon">⭐</span>
              <span className="quest-tracker-reward-points">{selectedQuest.Reward.Points} pts</span>
            </div>
          </div>
        ) : (
          <div className="quest-tracker-content">
            <p className="quest-tracker-no-quest">No quest selected</p>
            <p className="quest-tracker-hint">Click to view quests</p>
          </div>
        )}

        {/* Expand hint */}
        <div className="quest-tracker-expand-hint">
          Click to expand ▼
        </div>
      </div>

      {/* Quest Menu Modal */}
      {isMenuOpen && (
        <QuestMenu
          activeQuests={activeQuests}
          completedQuests={completedQuests}
          selectedQuestId={selectedQuest?.id || null}
          onSelectQuest={handleQuestSelect}
          onRemoveQuest={onRemoveQuest}
          onCompleteQuest={onCompleteQuest}
          onClose={handleCloseMenu}
        />
      )}
    </>
  );
}

