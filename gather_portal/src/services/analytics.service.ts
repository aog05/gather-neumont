import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db, COLLECTIONS } from '../lib/firebase';
import type { Player, NPC, Quest, Puzzle, PuzzleDay } from '../types/firestore.types';

/**
 * Overview metrics for the dashboard
 */
export interface OverviewMetrics {
  totalPlayers: number;
  totalQuizzesCompleted: number;
  totalPointsEarned: number;
  activeQuestsCount: number;
  completedQuestsCount: number;
  totalNPCs: number;
  totalQuests: number;
  totalPuzzles: number;
}

/**
 * Player activity data point for charts
 */
export interface PlayerActivityData {
  date: string; // YYYY-MM-DD
  activeCount: number;
  newPlayers: number;
}

/**
 * Quiz performance metrics
 */
export interface QuizMetrics {
  totalAttempts: number;
  totalCompletions: number;
  averageScore: number;
  completionRate: number;
  byTopic: {
    topic: string;
    attempts: number;
    avgScore: number;
  }[];
}

/**
 * NPC interaction data
 */
export interface NPCInteractionData {
  npcId: string;
  npcName: string;
  interactionCount: number;
}

export interface PlayerActivityData {
  date: string;
  activeCount: number;
  newPlayers: number;
}

/**
 * Quest completion analytics
 */
export interface QuestAnalytics {
  questId: string;
  questTitle: string;
  activeCount: number;
  completedCount: number;
  completionRate: number;
}

/**
 * Points distribution data
 */
export interface PointsDistribution {
  range: string;
  count: number;
  percentage: number;
}

/**
 * Top player data
 */
export interface TopPlayer {
  rank: number;
  username: string;
  points: number;
  quizzesCompleted: number;
  questsCompleted: number;
}

/**
 * Cache entry with timestamp
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/**
 * Analytics Service
 * Aggregates data from multiple Firebase collections for dashboard visualization
 */
export class AnalyticsService {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private readonly DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get cached data if available and not expired
   */
  private getCached<T>(key: string, ttl: number = this.DEFAULT_CACHE_TTL): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set cache data
   */
  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear all cached data
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get overview metrics for dashboard cards
   */
  async getOverviewMetrics(): Promise<OverviewMetrics> {
    const cacheKey = 'overview-metrics';
    const cached = this.getCached<OverviewMetrics>(cacheKey);
    if (cached) return cached;

    try {
      // Fetch all players
      const playersSnapshot = await getDocs(collection(db, COLLECTIONS.PLAYER));
      const players = playersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Player[];

      // Calculate metrics
      const totalPlayers = players.length;
      const totalQuizzesCompleted = players.reduce(
        (sum, player) => sum + (player.PuzzleRecord?.length || 0),
        0
      );
      const totalPointsEarned = players.reduce(
        (sum, player) => sum + (parseInt(player.Wallet || '0', 10) || 0),
        0
      );
      const activeQuestsCount = players.reduce(
        (sum, player) => sum + (player.ActiveQuests?.length || 0),
        0
      );
      const completedQuestsCount = players.reduce(
        (sum, player) => sum + (player.CompletedQuests?.length || 0),
        0
      );

      // Fetch collection counts
      const npcsSnapshot = await getDocs(collection(db, COLLECTIONS.NPC));
      const questsSnapshot = await getDocs(collection(db, COLLECTIONS.QUEST));
      const puzzlesSnapshot = await getDocs(collection(db, COLLECTIONS.PUZZLE));

      const metrics: OverviewMetrics = {
        totalPlayers,
        totalQuizzesCompleted,
        totalPointsEarned,
        activeQuestsCount,
        completedQuestsCount,
        totalNPCs: npcsSnapshot.size,
        totalQuests: questsSnapshot.size,
        totalPuzzles: puzzlesSnapshot.size,
      };

      this.setCache(cacheKey, metrics);
      return metrics;
    } catch (error) {
      console.error('Error fetching overview metrics:', error);
      throw error;
    }
  }

  /**
   * Get quiz performance metrics
   */
  async getQuizMetrics(): Promise<QuizMetrics> {
    const cacheKey = 'quiz-metrics';
    const cached = this.getCached<QuizMetrics>(cacheKey);
    if (cached) return cached;

    try {
      // Fetch all puzzles
      const puzzlesSnapshot = await getDocs(collection(db, COLLECTIONS.PUZZLE));
      const puzzles = puzzlesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Puzzle[];

      // Fetch all players to count completions
      const playersSnapshot = await getDocs(collection(db, COLLECTIONS.PLAYER));
      const players = playersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Player[];

      const totalCompletions = players.reduce(
        (sum, player) => sum + (player.PuzzleRecord?.length || 0),
        0
      );

      // Calculate average score from PuzzleDay subcollections
      // Note: This is a simplified calculation - in production, you'd aggregate from PuzzleDay
      const totalAttempts = totalCompletions; // Simplified - assumes 1 attempt per completion
      const averageScore = 75; // Placeholder - would calculate from PuzzleDay.topScore arrays

      // Group by topic
      const topicMap = new Map<string, { attempts: number; totalScore: number }>();
      puzzles.forEach((puzzle) => {
        if (!topicMap.has(puzzle.Topic)) {
          topicMap.set(puzzle.Topic, { attempts: 0, totalScore: 0 });
        }
      });

      const byTopic = Array.from(topicMap.entries()).map(([topic, data]) => ({
        topic,
        attempts: data.attempts,
        avgScore: data.attempts > 0 ? data.totalScore / data.attempts : 0,
      }));

      const metrics: QuizMetrics = {
        totalAttempts,
        totalCompletions,
        averageScore,
        completionRate: totalAttempts > 0 ? (totalCompletions / totalAttempts) * 100 : 0,
        byTopic,
      };

      this.setCache(cacheKey, metrics);
      return metrics;
    } catch (error) {
      console.error('Error fetching quiz metrics:', error);
      throw error;
    }
  }

  /**
   * Get top players leaderboard
   */
  async getTopPlayers(limitCount: number = 10): Promise<TopPlayer[]> {
    const cacheKey = `top-players-${limitCount}`;
    const cached = this.getCached<TopPlayer[]>(cacheKey);
    if (cached) return cached;

    try {
      const playersSnapshot = await getDocs(collection(db, COLLECTIONS.PLAYER));
      const players = playersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Player[];

      // Sort by points (Wallet) descending
      const sorted = players
        .map((player) => ({
          username: player.Username,
          points: parseInt(player.Wallet || '0', 10) || 0,
          quizzesCompleted: player.PuzzleRecord?.length || 0,
          questsCompleted: player.CompletedQuests?.length || 0,
        }))
        .sort((a, b) => b.points - a.points)
        .slice(0, limitCount)
        .map((player, index) => ({
          rank: index + 1,
          ...player,
        }));

      this.setCache(cacheKey, sorted);
      return sorted;
    } catch (error) {
      console.error('Error fetching top players:', error);
      throw error;
    }
  }

  /**
   * Get points distribution data
   */
  async getPointsDistribution(): Promise<PointsDistribution[]> {
    const cacheKey = 'points-distribution';
    const cached = this.getCached<PointsDistribution[]>(cacheKey);
    if (cached) return cached;

    try {
      const playersSnapshot = await getDocs(collection(db, COLLECTIONS.PLAYER));
      const players = playersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Player[];

      const ranges = [
        { min: 0, max: 100, label: '0-100' },
        { min: 101, max: 500, label: '101-500' },
        { min: 501, max: 1000, label: '501-1000' },
        { min: 1001, max: 5000, label: '1001-5000' },
        { min: 5001, max: Infinity, label: '5000+' },
      ];

      const distribution = ranges.map((range) => {
        const count = players.filter((player) => {
          const points = parseInt(player.Wallet || '0', 10) || 0;
          return points >= range.min && points <= range.max;
        }).length;

        return {
          range: range.label,
          count,
          percentage: players.length > 0 ? (count / players.length) * 100 : 0,
        };
      });

      this.setCache(cacheKey, distribution);
      return distribution;
    } catch (error) {
      console.error('Error fetching points distribution:', error);
      throw error;
    }
  }

  /**
   * Get quest completion analytics
   */
  async getQuestAnalytics(): Promise<QuestAnalytics[]> {
    const cacheKey = 'quest-analytics';
    const cached = this.getCached<QuestAnalytics[]>(cacheKey);
    if (cached) return cached;

    try {
      // Fetch all quests
      const questsSnapshot = await getDocs(collection(db, COLLECTIONS.QUEST));
      const quests = questsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Quest[];

      // Fetch all players
      const playersSnapshot = await getDocs(collection(db, COLLECTIONS.PLAYER));
      const players = playersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Player[];

      // Calculate analytics for each quest
      const analytics = quests.map((quest) => {
        const activeCount = players.filter((player) =>
          player.ActiveQuests?.includes(quest.id)
        ).length;
        const completedCount = players.filter((player) =>
          player.CompletedQuests?.includes(quest.id)
        ).length;
        const totalCount = activeCount + completedCount;

        return {
          questId: quest.id,
          questTitle: quest.Title,
          activeCount,
          completedCount,
          completionRate: totalCount > 0 ? (completedCount / totalCount) * 100 : 0,
        };
      });

      this.setCache(cacheKey, analytics);
      return analytics;
    } catch (error) {
      console.error('Error fetching quest analytics:', error);
      throw error;
    }
  }

  /**
   * Get NPC interaction data (placeholder - requires Analytics collection)
   */
  async getNPCInteractionData(): Promise<NPCInteractionData[]> {
    const cacheKey = 'npc-interactions';
    const cached = this.getCached<NPCInteractionData[]>(cacheKey);
    if (cached) return cached;

    try {
      // Fetch all NPCs
      const npcsSnapshot = await getDocs(collection(db, COLLECTIONS.NPC));
      const npcs = npcsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as NPC[];

      // TODO: When Analytics collection is implemented, fetch actual interaction counts
      // For now, return placeholder data with simulated counts
      const data = npcs.map((npc, index) => ({
        npcId: npc.id,
        npcName: npc.Name,
        interactionCount: Math.floor(Math.random() * 50) + 10, // Simulated data
      })).sort((a, b) => b.interactionCount - a.interactionCount);

      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Error fetching NPC interaction data:', error);
      throw error;
    }
  }

  /**
   * Get quiz completion data by day of week
   */
  async getQuizCompletionByDay(): Promise<{ day: string; completions: number }[]> {
    const cacheKey = 'quiz-completion-by-day';
    const cached = this.getCached<{ day: string; completions: number }[]>(cacheKey);
    if (cached) return cached;

    try {
      const playersSnapshot = await getDocs(collection(db, COLLECTIONS.PLAYER));
      const players = playersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Player[];

      // Calculate total completions
      const totalCompletions = players.reduce(
        (sum, player) => sum + (player.PuzzleRecord?.length || 0),
        0
      );

      // Simulate distribution across days (in production, aggregate from PuzzleDay)
      const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const data = daysOfWeek.map((day) => ({
        day,
        completions: Math.floor(totalCompletions / 7) + Math.floor(Math.random() * 10),
      }));

      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Error fetching quiz completion by day:', error);
      throw error;
    }
  }

  /**
   * Get player activity trend (last 30 days)
   */
  async getPlayerActivityTrend(days: number = 30): Promise<PlayerActivityData[]> {
    const cacheKey = `player-activity-${days}`;
    const cached = this.getCached<PlayerActivityData[]>(cacheKey);
    if (cached) return cached;

    try {
      const playersSnapshot = await getDocs(collection(db, COLLECTIONS.PLAYER));
      const totalPlayers = playersSnapshot.size;

      // Generate simulated trend data (in production, use Analytics collection)
      const data: PlayerActivityData[] = [];
      const today = new Date();

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        // Simulate activity with some variance
        const baseActivity = Math.floor(totalPlayers * 0.6); // 60% active on average
        const variance = Math.floor(Math.random() * (totalPlayers * 0.2));
        const activeCount = Math.min(baseActivity + variance, totalPlayers);

        data.push({
          date: dateStr,
          activeCount,
          newPlayers: i > days - 7 ? Math.floor(Math.random() * 3) : 0, // New players in last week
        });
      }

      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Error fetching player activity trend:', error);
      throw error;
    }
  }

  /**
   * Get average session duration (placeholder - requires Analytics collection)
   */
  async getAverageSessionDuration(): Promise<number> {
    const cacheKey = 'avg-session-duration';
    const cached = this.getCached<number>(cacheKey);
    if (cached) return cached;

    try {
      // TODO: Calculate from Analytics collection when implemented
      // For now, return simulated average (in minutes)
      const avgDuration = 25 + Math.floor(Math.random() * 15); // 25-40 minutes

      this.setCache(cacheKey, avgDuration);
      return avgDuration;
    } catch (error) {
      console.error('Error fetching average session duration:', error);
      throw error;
    }
  }
}

