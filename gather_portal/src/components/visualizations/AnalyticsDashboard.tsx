import React, { useState, useEffect } from 'react';
import { AnalyticsService } from '../../services/analytics.service';
import type {
  OverviewMetrics,
  QuizMetrics,
  TopPlayer,
  PointsDistribution,
  QuestAnalytics,
  NPCInteractionData,
  PlayerActivityData,
} from '../../services/analytics.service';
import Card from '../shared/Card';
import Button from '../shared/Button';
import LoadingSpinner from '../shared/LoadingSpinner';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import './AnalyticsDashboard.css';

export default function AnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overviewMetrics, setOverviewMetrics] = useState<OverviewMetrics | null>(null);
  const [quizMetrics, setQuizMetrics] = useState<QuizMetrics | null>(null);
  const [topPlayers, setTopPlayers] = useState<TopPlayer[]>([]);
  const [pointsDistribution, setPointsDistribution] = useState<PointsDistribution[]>([]);
  const [questAnalytics, setQuestAnalytics] = useState<QuestAnalytics[]>([]);
  const [npcInteractions, setNpcInteractions] = useState<NPCInteractionData[]>([]);
  const [playerActivity, setPlayerActivity] = useState<PlayerActivityData[]>([]);
  const [avgSessionDuration, setAvgSessionDuration] = useState<number>(0);
  const [quizByDay, setQuizByDay] = useState<{ day: string; completions: number }[]>([]);

  const analyticsService = new AnalyticsService();

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all analytics data in parallel
      const [overview, quiz, players, points, quests, npcs, activity, sessionDuration, dayData] = await Promise.all([
        analyticsService.getOverviewMetrics(),
        analyticsService.getQuizMetrics(),
        analyticsService.getTopPlayers(10),
        analyticsService.getPointsDistribution(),
        analyticsService.getQuestAnalytics(),
        analyticsService.getNPCInteractionData(),
        analyticsService.getPlayerActivityTrend(30),
        analyticsService.getAverageSessionDuration(),
        analyticsService.getQuizCompletionByDay(),
      ]);

      setOverviewMetrics(overview);
      setQuizMetrics(quiz);
      setTopPlayers(players);
      setPointsDistribution(points);
      setQuestAnalytics(quests);
      setNpcInteractions(npcs);
      setPlayerActivity(activity);
      setAvgSessionDuration(sessionDuration);
      setQuizByDay(dayData);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    analyticsService.clearCache();
    loadData();
  };

  if (loading) {
    return (
      <div className="analytics-loading">
        <LoadingSpinner size="lg" message="Loading analytics data..." />
      </div>
    );
  }

  if (error) {
    return (
      <Card title="Analytics Dashboard">
        <div className="error-message">
          <p>Error loading analytics: {error}</p>
          <Button onClick={handleRefresh}>Retry</Button>
        </div>
      </Card>
    );
  }

  // Neumont Brand Colors
  const COLORS = {
    primary: '#FFDD00', // Neumont Yellow
    success: '#52C97C',
    warning: '#F0AD4E',
    danger: '#D9534F',
    info: '#5CC0DE',
    grey: '#3a3a3a',
  };

  const PIE_COLORS = [COLORS.primary, COLORS.success, COLORS.info, COLORS.warning, COLORS.danger];

  return (
    <div className="analytics-dashboard">
      {/* Header */}
      <div className="analytics-header">
        <h1 className="analytics-title">Analytics Dashboard</h1>
        <Button onClick={handleRefresh} size="sm">
          🔄 Refresh Data
        </Button>
      </div>

      {/* Overview Cards */}
      {overviewMetrics && (
        <div className="overview-cards">
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-content">
              <div className="stat-value">{overviewMetrics.totalPlayers}</div>
              <div className="stat-label">Total Players</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">📝</div>
            <div className="stat-content">
              <div className="stat-value">{overviewMetrics.totalQuizzesCompleted}</div>
              <div className="stat-label">Quizzes Completed</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">💰</div>
            <div className="stat-content">
              <div className="stat-value">{overviewMetrics.totalPointsEarned.toLocaleString()}</div>
              <div className="stat-label">Total Points Earned</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🎯</div>
            <div className="stat-content">
              <div className="stat-value">{overviewMetrics.activeQuestsCount}</div>
              <div className="stat-label">Active Quests</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <div className="stat-value">{overviewMetrics.completedQuestsCount}</div>
              <div className="stat-label">Completed Quests</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🤖</div>
            <div className="stat-content">
              <div className="stat-value">{overviewMetrics.totalNPCs}</div>
              <div className="stat-label">Total NPCs</div>
            </div>
          </div>
        </div>
      )}

      {/* Charts Row 1: Points Distribution & Quest Completion */}
      <div className="charts-row">
        {/* Points Distribution Pie Chart */}
        <Card title="Points Distribution">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pointsDistribution}
                dataKey="count"
                nameKey="range"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={(entry) => `${entry.range}: ${entry.count}`}
              >
                {pointsDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Quest Completion Bar Chart */}
        <Card title="Quest Completion Status">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={questAnalytics.slice(0, 5)}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grey} />
              <XAxis dataKey="questTitle" stroke="#ffffff" />
              <YAxis stroke="#ffffff" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F1F1F',
                  border: `2px solid ${COLORS.primary}`,
                  borderRadius: '0',
                }}
              />
              <Legend />
              <Bar dataKey="activeCount" fill={COLORS.warning} name="Active" />
              <Bar dataKey="completedCount" fill={COLORS.success} name="Completed" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Top Players Leaderboard */}
      <Card title="Top Players Leaderboard 🏆">
        <div className="leaderboard-table">
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Username</th>
                <th>Points</th>
                <th>Quizzes</th>
                <th>Quests</th>
              </tr>
            </thead>
            <tbody>
              {topPlayers.map((player) => (
                <tr key={player.rank}>
                  <td className="rank-cell">
                    {player.rank === 1 && '🥇'}
                    {player.rank === 2 && '🥈'}
                    {player.rank === 3 && '🥉'}
                    {player.rank > 3 && `#${player.rank}`}
                  </td>
                  <td className="username-cell">{player.username}</td>
                  <td className="points-cell">{player.points.toLocaleString()}</td>
                  <td>{player.quizzesCompleted}</td>
                  <td>{player.questsCompleted}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Quiz Performance Metrics */}
      {quizMetrics && (
        <Card title="Quiz Performance Overview">
          <div className="quiz-metrics-grid">
            <div className="metric-box">
              <div className="metric-value">{quizMetrics.totalCompletions}</div>
              <div className="metric-label">Total Completions</div>
            </div>
            <div className="metric-box">
              <div className="metric-value">{quizMetrics.averageScore.toFixed(1)}%</div>
              <div className="metric-label">Average Score</div>
            </div>
            <div className="metric-box">
              <div className="metric-value">{quizMetrics.completionRate.toFixed(1)}%</div>
              <div className="metric-label">Completion Rate</div>
            </div>
            <div className="metric-box">
              <div className="metric-value">{avgSessionDuration} min</div>
              <div className="metric-label">Avg Session Duration</div>
            </div>
          </div>
        </Card>
      )}

      {/* Charts Row 2: Player Activity & NPC Interactions */}
      <div className="charts-row">
        {/* Player Activity Trend Line Chart */}
        <Card title="Player Activity Trend (Last 30 Days)">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={playerActivity}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grey} />
              <XAxis
                dataKey="date"
                stroke="#ffffff"
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return `${date.getMonth() + 1}/${date.getDate()}`;
                }}
              />
              <YAxis stroke="#ffffff" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F1F1F',
                  border: `2px solid ${COLORS.primary}`,
                  borderRadius: '0',
                }}
                labelFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleDateString();
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="activeCount"
                stroke={COLORS.primary}
                strokeWidth={2}
                name="Active Players"
                dot={{ fill: COLORS.primary }}
              />
              <Line
                type="monotone"
                dataKey="newPlayers"
                stroke={COLORS.success}
                strokeWidth={2}
                name="New Players"
                dot={{ fill: COLORS.success }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* NPC Interaction Horizontal Bar Chart */}
        <Card title="Most Popular NPCs">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={npcInteractions.slice(0, 8)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grey} />
              <XAxis type="number" stroke="#ffffff" />
              <YAxis
                type="category"
                dataKey="npcName"
                stroke="#ffffff"
                width={100}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F1F1F',
                  border: `2px solid ${COLORS.primary}`,
                  borderRadius: '0',
                }}
              />
              <Bar dataKey="interactionCount" fill={COLORS.info} name="Interactions" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Quiz Completion by Day of Week */}
      <Card title="Quiz Completions by Day of Week">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={quizByDay}>
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grey} />
            <XAxis dataKey="day" stroke="#ffffff" />
            <YAxis stroke="#ffffff" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F1F1F',
                border: `2px solid ${COLORS.primary}`,
                borderRadius: '0',
              }}
            />
            <Bar dataKey="completions" fill={COLORS.primary} name="Completions" />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

