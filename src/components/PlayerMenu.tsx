/**
 * PlayerMenu - Expanded player profile modal
 * 
 * Full-screen modal that displays comprehensive player information.
 * Shows username, real name, points, quest stats, and puzzle stats.
 * 
 * Features:
 * - Full-screen overlay modal
 * - Comprehensive player statistics
 * - Close on ESC key or click outside
 * - Close button (X in top-right)
 */

import { useEffect } from 'react';
import './PlayerMenu.css';

interface PlayerMenuProps {
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
  
  /** Callback to close the menu */
  onClose: () => void;
}

export default function PlayerMenu({
  username,
  realName,
  totalPoints,
  activeQuestsCount,
  completedQuestsCount,
  totalPuzzlesCompleted,
  onClose,
}: PlayerMenuProps) {
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

  return (
    <div className="player-menu-overlay" onClick={handleOverlayClick}>
      <div className="player-menu">
        {/* Header */}
        <div className="player-menu-header">
          <h2 className="player-menu-title">PLAYER PROFILE</h2>
          <button className="player-menu-close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        {/* Content */}
        <div className="player-menu-content">
          {/* Identity Section */}
          <section className="player-menu-section">
            <h3 className="player-menu-section-title">IDENTITY</h3>
            <div className="player-menu-info-grid">
              <div className="player-menu-info-item">
                <span className="player-menu-info-label">Username</span>
                <span className="player-menu-info-value">{username}</span>
              </div>
              <div className="player-menu-info-item">
                <span className="player-menu-info-label">Real Name</span>
                <span className="player-menu-info-value">{realName}</span>
              </div>
            </div>
          </section>

          {/* Points Section */}
          <section className="player-menu-section">
            <h3 className="player-menu-section-title">POINTS</h3>
            <div className="player-menu-points-display">
              <span className="player-menu-points-icon">⭐</span>
              <span className="player-menu-points-value">{totalPoints.toLocaleString()}</span>
              <span className="player-menu-points-label">Total Points</span>
            </div>
          </section>

          {/* Quest Statistics */}
          <section className="player-menu-section">
            <h3 className="player-menu-section-title">QUEST STATISTICS</h3>
            <div className="player-menu-stats-grid">
              <div className="player-menu-stat-card">
                <span className="player-menu-stat-value">{activeQuestsCount}</span>
                <span className="player-menu-stat-label">Active Quests</span>
              </div>
              <div className="player-menu-stat-card">
                <span className="player-menu-stat-value">{completedQuestsCount}</span>
                <span className="player-menu-stat-label">Completed Quests</span>
              </div>
              <div className="player-menu-stat-card">
                <span className="player-menu-stat-value">{activeQuestsCount + completedQuestsCount}</span>
                <span className="player-menu-stat-label">Total Quests</span>
              </div>
            </div>
          </section>

          {/* Puzzle Statistics */}
          <section className="player-menu-section">
            <h3 className="player-menu-section-title">PUZZLE STATISTICS</h3>
            <div className="player-menu-stats-grid">
              <div className="player-menu-stat-card">
                <span className="player-menu-stat-value">{totalPuzzlesCompleted}</span>
                <span className="player-menu-stat-label">Puzzles Solved</span>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="player-menu-footer">
          <p className="player-menu-hint">Press ESC or click outside to close</p>
        </div>
      </div>
    </div>
  );
}

