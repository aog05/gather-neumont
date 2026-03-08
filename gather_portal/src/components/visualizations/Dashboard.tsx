import React, { useState, useEffect } from 'react';
import { AnalyticsService } from '../../services/analytics.service';
import type { OverviewMetrics } from '../../services/analytics.service';
import LoadingSpinner from '../shared/LoadingSpinner';
import Button from '../shared/Button';
import './Dashboard.css';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const analyticsService = new AnalyticsService();

  const loadMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await analyticsService.getOverviewMetrics();
      setMetrics(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, []);

  const handleRefresh = () => {
    analyticsService.clearCache();
    loadMetrics();
  };

  return (
    <div className="dashboard">
      <div className="dashboard-welcome">
        <h1 className="dashboard-title">Welcome to Neumont Admin Portal</h1>
        <p className="dashboard-subtitle">
          Manage your virtual campus content, users, and analytics
        </p>
        {!loading && (
          <Button onClick={handleRefresh} size="sm" variant="secondary">
            🔄 Refresh Stats
          </Button>
        )}
      </div>

      {loading ? (
        <div className="dashboard-loading">
          <LoadingSpinner size="lg" message="Loading dashboard stats..." />
        </div>
      ) : error ? (
        <div className="dashboard-error">
          <p>Error loading stats: {error}</p>
          <Button onClick={handleRefresh}>Retry</Button>
        </div>
      ) : metrics ? (
        <>
          <div className="dashboard-grid">
            <div className="dashboard-card">
              <div className="dashboard-card-icon">👥</div>
              <h3 className="dashboard-card-title">Players</h3>
              <p className="dashboard-card-value">{metrics.totalPlayers}</p>
              <p className="dashboard-card-label">Total Users</p>
            </div>

            <div className="dashboard-card">
              <div className="dashboard-card-icon">🤖</div>
              <h3 className="dashboard-card-title">NPCs</h3>
              <p className="dashboard-card-value">{metrics.totalNPCs}</p>
              <p className="dashboard-card-label">Active NPCs</p>
            </div>

            <div className="dashboard-card">
              <div className="dashboard-card-icon">⚔️</div>
              <h3 className="dashboard-card-title">Quests</h3>
              <p className="dashboard-card-value">{metrics.totalQuests}</p>
              <p className="dashboard-card-label">Available Quests</p>
            </div>

            <div className="dashboard-card">
              <div className="dashboard-card-icon">🧩</div>
              <h3 className="dashboard-card-title">Puzzles</h3>
              <p className="dashboard-card-value">{metrics.totalPuzzles}</p>
              <p className="dashboard-card-label">Daily Challenges</p>
            </div>

            <div className="dashboard-card">
              <div className="dashboard-card-icon">📝</div>
              <h3 className="dashboard-card-title">Quizzes</h3>
              <p className="dashboard-card-value">{metrics.totalQuizzesCompleted}</p>
              <p className="dashboard-card-label">Total Completed</p>
            </div>

            <div className="dashboard-card">
              <div className="dashboard-card-icon">💰</div>
              <h3 className="dashboard-card-title">Points</h3>
              <p className="dashboard-card-value">{metrics.totalPointsEarned.toLocaleString()}</p>
              <p className="dashboard-card-label">Total Earned</p>
            </div>

            <div className="dashboard-card">
              <div className="dashboard-card-icon">🎯</div>
              <h3 className="dashboard-card-title">Active Quests</h3>
              <p className="dashboard-card-value">{metrics.activeQuestsCount}</p>
              <p className="dashboard-card-label">In Progress</p>
            </div>

            <div className="dashboard-card">
              <div className="dashboard-card-icon">✅</div>
              <h3 className="dashboard-card-title">Completed Quests</h3>
              <p className="dashboard-card-value">{metrics.completedQuestsCount}</p>
              <p className="dashboard-card-label">Finished</p>
            </div>
          </div>

          <div className="dashboard-info">
            <div className="dashboard-info-card">
              <h3 className="dashboard-info-title">🚀 Getting Started</h3>
              <ul className="dashboard-info-list">
                <li>Use the sidebar to navigate between different collection managers</li>
                <li>Each manager provides full CRUD operations for its collection</li>
                <li>Data is synced in real-time with Firebase Firestore</li>
                <li>All changes are logged for audit purposes</li>
              </ul>
            </div>

            <div className="dashboard-info-card">
              <h3 className="dashboard-info-title">📊 Collections</h3>
              <ul className="dashboard-info-list">
                <li><strong>Players:</strong> Manage user profiles, points, and progress</li>
                <li><strong>NPCs:</strong> Create and configure non-player characters</li>
                <li><strong>Dialogue:</strong> Build conversation trees</li>
                <li><strong>Quests:</strong> Design missions and rewards</li>
                <li><strong>Puzzles:</strong> Create daily challenges</li>
                <li><strong>Cosmetics:</strong> Manage avatar items</li>
                <li><strong>Skills:</strong> Configure skill tree items</li>
              </ul>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

