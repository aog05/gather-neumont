/**
 * PlayerMenu - Expanded player profile modal
 *
 * Full-screen modal that displays comprehensive player information.
 * Shows username, real name, avatar, major, points, quest stats, and puzzle stats.
 * Includes edit account and logout functionality.
 *
 * Features:
 * - Full-screen overlay modal
 * - Comprehensive player statistics
 * - Avatar display with dicebear
 * - Profile customization details (display name, major)
 * - Edit account and logout buttons
 * - Close on ESC key or click outside
 * - Close button (X in top-right)
 */

import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { createAvatar } from '@dicebear/core';
import { useAuth } from '../features/auth/AuthContext';
import { useProfile } from '../features/profile/ProfileContext';
import { DICEBEAR_STYLES } from '../avatars/dicebear_registry';
import { MAJORS } from '../config/majors';
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
  const auth = useAuth();
  const profile = useProfile();
  const navigate = useNavigate();

  const draft = profile.profileDraft;

  // Generate avatar SVG from dicebear
  const avatarSvg = useMemo(() => {
    const avatar = draft.avatar;
    if (!avatar || avatar.provider !== 'dicebear') return null;

    const style = (DICEBEAR_STYLES as any)[avatar.style];
    if (!style) return null;

    try {
      return createAvatar(style, { seed: avatar.seed, size: 80 }).toString();
    } catch {
      return null;
    }
  }, [draft.avatar]);

  // Get major label
  const majorLabel = useMemo(() => {
    const hit = MAJORS.find((m) => m.id === draft.intendedMajorId);
    return hit?.label ?? String(draft.intendedMajorId ?? '—');
  }, [draft.intendedMajorId]);

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

  const handleEditAccount = () => {
    onClose();
    navigate('/account');
  };

  const handleLogout = async () => {
    onClose();
    await auth.logout();
    navigate('/onboarding');
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
          {/* Profile Header with Avatar */}
          <section className="player-menu-profile-header">
            {avatarSvg && (
              <div
                className="player-menu-avatar"
                dangerouslySetInnerHTML={{ __html: avatarSvg }}
                aria-hidden="true"
              />
            )}
            <div className="player-menu-profile-info">
              <div className="player-menu-profile-username">@{username}</div>
              {draft.displayName?.trim() && (
                <div className="player-menu-profile-display-name">{draft.displayName}</div>
              )}
            </div>
          </section>

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
              {draft.displayName?.trim() && (
                <div className="player-menu-info-item">
                  <span className="player-menu-info-label">Display Name</span>
                  <span className="player-menu-info-value">{draft.displayName}</span>
                </div>
              )}
              <div className="player-menu-info-item">
                <span className="player-menu-info-label">Major</span>
                <span className="player-menu-info-value">{majorLabel}</span>
              </div>
              {draft.email?.trim() && (
                <div className="player-menu-info-item">
                  <span className="player-menu-info-label">Email</span>
                  <span className="player-menu-info-value">{draft.email}</span>
                </div>
              )}
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

          {/* Actions Section */}
          <section className="player-menu-section player-menu-actions">
            <button
              type="button"
              onClick={handleEditAccount}
              className="player-menu-action-btn primary"
            >
              Edit Account
            </button>

            {(auth.mode === 'user' || auth.mode === 'admin' || auth.mode === 'guest') && (
              <button
                type="button"
                onClick={handleLogout}
                className="player-menu-action-btn"
              >
                {auth.mode === 'guest' ? 'Exit Guest Mode' : 'Log Out'}
              </button>
            )}

            {auth.mode === 'guest' && (
              <div className="player-menu-notice">
                Guest mode — progress not saved
              </div>
            )}
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

