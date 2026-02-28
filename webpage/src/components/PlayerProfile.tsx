/**
 * PlayerProfile - Minimized player profile display component
 *
 * Displays player information in the top-left corner of the screen.
 * Clicking expands into the full PlayerMenu.
 *
 * Features:
 * - Minimal screen coverage (250-300px wide)
 * - Semi-transparent background
 * - Shows username, avatar, and total points
 * - Click to expand into PlayerMenu with full profile details
 * - Integrates with auth and profile contexts for customized user data
 */

import { useState, useMemo } from 'react';
import { createAvatar } from '@dicebear/core';
import PlayerMenu from './PlayerMenu';
import { useAuth } from '../features/auth/AuthContext';
import { useProfile } from '../features/profile/ProfileContext';
import { DICEBEAR_STYLES } from '../avatars/dicebear_registry';
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
  const auth = useAuth();
  const profile = useProfile();

  const draft = profile.profileDraft;

  // Generate avatar SVG from dicebear
  const avatarSvg = useMemo(() => {
    const avatar = draft.avatar;
    if (!avatar || avatar.provider !== 'dicebear') return null;

    const style = (DICEBEAR_STYLES as any)[avatar.style];
    if (!style) return null;

    try {
      return createAvatar(style, { seed: avatar.seed, size: 48 }).toString();
    } catch {
      return null;
    }
  }, [draft.avatar]);

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
          {/* Avatar and Username Row */}
          <div className="player-profile-user-row">
            {avatarSvg && (
              <div
                className="player-profile-avatar"
                dangerouslySetInnerHTML={{ __html: avatarSvg }}
                aria-hidden="true"
              />
            )}
            <div className="player-profile-user-info">
              <h3 className="player-profile-username">{username}</h3>
              {draft.displayName?.trim() && (
                <div className="player-profile-display-name">{draft.displayName}</div>
              )}
            </div>
          </div>

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

