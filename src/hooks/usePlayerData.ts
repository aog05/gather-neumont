/**
 * usePlayerData - Custom React hook for fetching player data from Firebase
 * 
 * Fetches player profile information including username, real name, points, and quest counts.
 * Handles loading states and errors gracefully.
 * Listens for quest:started and quest:completed events to auto-refresh data.
 */

import { useState, useEffect, useRef } from 'react';
import type { Player } from '../types/firestore.types';
import FirestoreHelpers from '../lib/firestore-helpers';
import { GameEventBridge } from '../systems/GameEventBridge';

export interface PlayerData {
  player: Player | null;
  loading: boolean;
  error: string | null;
  // Computed stats
  totalPoints: number;
  activeQuestsCount: number;
  completedQuestsCount: number;
  totalPuzzlesCompleted: number;
}

/**
 * Hook to fetch player data for a specific player
 * @param username - The player username to fetch data for (e.g., "sarah_dev")
 * @returns Player data with loading and error states
 */
export function usePlayerData(username: string): PlayerData {
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const bridgeRef = useRef<GameEventBridge>(GameEventBridge.getInstance());

  // Listen for quest events to trigger refresh
  useEffect(() => {
    const bridge = bridgeRef.current;

    const handleQuestStarted = (data: { questId: string }) => {
      console.log(`[usePlayerData] Quest started event received: ${data.questId}`);
      setRefreshTrigger(prev => prev + 1);
    };

    const handleQuestCompleted = (data: { questId: string }) => {
      console.log(`[usePlayerData] Quest completed event received: ${data.questId}`);
      setRefreshTrigger(prev => prev + 1);
    };

    bridge.on("quest:started", handleQuestStarted);
    bridge.on("quest:completed", handleQuestCompleted);

    return () => {
      bridge.off("quest:started", handleQuestStarted);
      bridge.off("quest:completed", handleQuestCompleted);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function fetchPlayerData() {
      try {
        setLoading(true);
        setError(null);

        console.log(`[usePlayerData] Fetching player data for username: ${username}`);

        // Fetch player document by username
        const playerDoc = await FirestoreHelpers.getPlayerByUsername(username);

        if (!isMounted) return;

        if (!playerDoc) {
          setError(`Player not found: ${username}`);
          setPlayer(null);
          console.error(`[usePlayerData] Player not found: ${username}`);
          return;
        }

        setPlayer(playerDoc);
        console.log(`[usePlayerData] Player loaded:`, {
          username: playerDoc.Username,
          realName: playerDoc.RealName,
          points: playerDoc.Wallet,
          activeQuests: playerDoc.ActiveQuests.length,
          completedQuests: playerDoc.CompletedQuests.length,
        });
      } catch (err) {
        if (!isMounted) return;
        
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        setPlayer(null);
        console.error(`[usePlayerData] Error fetching player data:`, err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchPlayerData();

    return () => {
      isMounted = false;
    };
  }, [username, refreshTrigger]); // Re-fetch when username changes or quest events occur

  // Compute derived stats
  const totalPoints = player ? parseInt(player.Wallet, 10) || 0 : 0;
  const activeQuestsCount = player?.ActiveQuests.length || 0;
  const completedQuestsCount = player?.CompletedQuests.length || 0;
  const totalPuzzlesCompleted = player?.PuzzleRecord.length || 0;

  return {
    player,
    loading,
    error,
    totalPoints,
    activeQuestsCount,
    completedQuestsCount,
    totalPuzzlesCompleted,
  };
}

