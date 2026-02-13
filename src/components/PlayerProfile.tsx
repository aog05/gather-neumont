/**
 * PlayerProfile - Minimized player profile display component
 * 
 * Displays player information in the top-left corner of the screen.
 * Clicking expands into the full PlayerMenu.
 * 
 * Features:
 * - Minimal screen coverage (250-300px wide)
 * - Semi-transparent background
 * - Shows username and total points
 * - Click to expand into PlayerMenu
 */

import { useState } from 'react';
import PlayerMenu from './PlayerMenu';
import './PlayerProfile.css';

interface PlayerProfileProps {
  /** Player's username */
  username: string;
  
  /** Player's real name */
  realName: string;
  
  /** Total points */
  totalPoints: number;
  
  /** Number of active quests */
  activeQuestsCount: number;
  
  /** Number of completed quests */
  completedQuestsCount: number;
  
  /** Number of puzzles completed */
  totalPuzzlesCompleted: number;
  
  /** Loading state */
  loading?: boolean;
}

export default function PlayerProfile({
  username,
  realName,
  totalPoints,
  activeQuestsCount,
  completedQuestsCount,
  totalPuzzlesCompleted,
  loading = false,
}: PlayerProfileProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleProfileClick = () => {
    setIsMenuOpen(true);
  };

  const handleCloseMenu = () => {
    setIsMenuOpen(false);
  };

  // Loading state
  if (loading) {
    return (
      <div className="player-profile player-profile-loading">
        <div className="player-profile-header">
          <span className="player-profile-title">PLAYER</span>
        </div>
        <div className="player-profile-content">
          <p className="player-profile-loading-text">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="player-profile" onClick={handleProfileClick}>
        {/* Header */}
        <div className="player-profile-header">
          <span className="player-profile-title">PLAYER</span>
          <span className="player-profile-student-badge">STUDENT</span>
        </div>

        {/* Content */}
        <div className="player-profile-content">
          <h3 className="player-profile-username">{username}</h3>
          
          {/* Points Display */}
          <div className="player-profile-points">
            <span className="player-profile-points-icon">⭐</span>
            <span className="player-profile-points-value">{totalPoints.toLocaleString()}</span>
            <span className="player-profile-points-label">points</span>
          </div>

          {/* Quick Stats */}
          <div className="player-profile-stats">
            <div className="player-profile-stat">
              <span className="player-profile-stat-value">{activeQuestsCount}</span>
              <span className="player-profile-stat-label">Active</span>
            </div>
            <div className="player-profile-stat-divider"></div>
            <div className="player-profile-stat">
              <span className="player-profile-stat-value">{completedQuestsCount}</span>
              <span className="player-profile-stat-label">Done</span>
            </div>
          </div>
        </div>

        {/* Expand hint */}
        <div className="player-profile-expand-hint">
          Click to expand ▼
        </div>
      </div>

      {/* Player Menu Modal */}
      {isMenuOpen && (
        <PlayerMenu
          username={username}
          realName={realName}
          totalPoints={totalPoints}
          activeQuestsCount={activeQuestsCount}
          completedQuestsCount={completedQuestsCount}
          totalPuzzlesCompleted={totalPuzzlesCompleted}
          onClose={handleCloseMenu}
        />
      )}
    </>
  );
}

