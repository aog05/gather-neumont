/**
 * useQuestData - Custom React hook for fetching quest data from Firebase
 *
 * Fetches player data and resolves quest details for active and completed quests.
 * Handles loading states and errors gracefully.
 * Listens for quest:started and quest:completed events to auto-refresh data.
 */

import { useState, useEffect, useRef } from 'react';
import type { Player, Quest } from '../types/firestore.types';
import FirestoreHelpers from '../lib/firestore-helpers';
import { COLLECTIONS } from '../lib/firebase';
import { GameEventBridge } from '../systems/GameEventBridge';
import type {
  QuestObjectiveUpdatedPayload,
  QuestProgressMap,
  QuestRevealedPayload,
  PlayerFloorChangedPayload,
} from '../types/quest.types';

export interface QuestData {
  activeQuests: Quest[];
  completedQuests: Quest[];
  player: Player | null;
  loading: boolean;
  error: string | null;
  /** Live in-memory objective progress, updated without re-fetch */
  objectiveProgress: QuestProgressMap;
  /** Current player floor for floor-gating (SG7) */
  currentFloor: number | null;
}

/**
 * Hook to fetch quest data for a specific player
 * @param username - The player username to fetch quests for (e.g., "sarah_dev")
 * @returns Quest data with loading and error states
 */
export function useQuestData(username: string): QuestData {
  const [activeQuests, setActiveQuests] = useState<Quest[]>([]);
  const [completedQuests, setCompletedQuests] = useState<Quest[]>([]);
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [objectiveProgress, setObjectiveProgress] = useState<QuestProgressMap>({});
  /** SG6: Quest IDs that have been explicitly revealed from hidden state */
  const [revealedQuestIds, setRevealedQuestIds] = useState<Set<string>>(new Set());
  /** SG7: Current player floor for floor-gating */
  const [currentFloor, setCurrentFloor] = useState<number | null>(null);
  const bridgeRef = useRef<GameEventBridge>(GameEventBridge.getInstance());

  // Listen for quest events to trigger refresh
  useEffect(() => {
    const bridge = bridgeRef.current;

    const handleQuestStarted = (data: { questId: string }) => {
      console.log(`[useQuestData] Quest started event received: ${data.questId}`);
      setRefreshTrigger(prev => prev + 1);
    };

    const handleQuestCompleted = (data: { questId: string }) => {
      console.log(`[useQuestData] Quest completed event received: ${data.questId}`);
      setRefreshTrigger(prev => prev + 1);
    };

    const handleQuestRemoved = (data: { questId: string }) => {
      console.log(`[useQuestData] Quest removed event received: ${data.questId}`);
      setRefreshTrigger(prev => prev + 1);
    };

    const handleObjectiveUpdated = (p: QuestObjectiveUpdatedPayload) => {
      setObjectiveProgress(prev => ({
        ...prev,
        [p.questId]: {
          ...(prev[p.questId] ?? {}),
          [p.objectiveId]: { currentValue: p.currentValue, completed: p.completed },
        },
      }));
    };

    /** SG6: Reveal a hidden quest by adding it to the local revealed set */
    const handleQuestRevealed = (p: QuestRevealedPayload) => {
      console.log(`[useQuestData] Quest revealed: ${p.questId}`);
      setRevealedQuestIds(prev => new Set([...prev, p.questId]));
    };

    /** SG7: Update the current floor when the player changes floors */
    const handleFloorChanged = (p: PlayerFloorChangedPayload) => {
      console.log(`[useQuestData] Player floor changed to: ${p.floor}`);
      setCurrentFloor(p.floor);
    };

    bridge.on("quest:started", handleQuestStarted);
    bridge.on("quest:completed", handleQuestCompleted);
    bridge.on("quest:removed", handleQuestRemoved);
    bridge.on("quest:objective:updated", handleObjectiveUpdated);
    bridge.on("quest:revealed", handleQuestRevealed);
    bridge.on("player:floor:changed", handleFloorChanged);

    return () => {
      bridge.off("quest:started", handleQuestStarted);
      bridge.off("quest:completed", handleQuestCompleted);
      bridge.off("quest:removed", handleQuestRemoved);
      bridge.off("quest:objective:updated", handleObjectiveUpdated);
      bridge.off("quest:revealed", handleQuestRevealed);
      bridge.off("player:floor:changed", handleFloorChanged);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function fetchQuestData() {
      try {
        setLoading(true);
        setError(null);

        console.log(`[useQuestData] Fetching quest data for username: ${username}`);

        // Fetch player document by username (stable identifier)
        const playerDoc = await FirestoreHelpers.getPlayerByUsername(username);

        if (!isMounted) return;

        if (!playerDoc) {
          const errorMsg = `Player not found with username: ${username}`;
          console.error(`[useQuestData] ${errorMsg}`);
          setError(errorMsg);
          setLoading(false);
          return;
        }

        console.log(`[useQuestData] Player found:`, {
          username: playerDoc.Username,
          activeQuestIds: playerDoc.ActiveQuests,
          completedQuestIds: playerDoc.CompletedQuests,
        });

        setPlayer(playerDoc);

        // SG6: Seed revealed quest IDs from the player's Firestore record
        const firestoreRevealed: string[] = (playerDoc as any).revealedQuests ?? [];
        if (firestoreRevealed.length > 0) {
          setRevealedQuestIds(prev => new Set([...prev, ...firestoreRevealed]));
        }

        // Fetch all active quest details
        console.log(`[useQuestData] Fetching ${playerDoc.ActiveQuests.length} active quests...`);
        const activeQuestPromises = playerDoc.ActiveQuests.map(async (questId) => {
          const quest = await FirestoreHelpers.getQuest(questId);
          if (!quest) {
            console.warn(`[useQuestData] Active quest not found: ${questId}`);
          }
          return quest;
        });
        const activeQuestResults = await Promise.all(activeQuestPromises);
        // SG6: Filter out hidden quests that haven't been revealed yet
        // SG7: Filter by current floor (null floor on quest means show on all floors)
        const activeQuestsFiltered = activeQuestResults.filter((q): q is Quest => {
          if (!q) return false;
          if (q.hidden && !firestoreRevealed.includes(q.id)) return false;
          if (q.floor !== undefined && currentFloor !== null && q.floor !== currentFloor) return false;
          return true;
        });
        console.log(`[useQuestData] Loaded ${activeQuestsFiltered.length} active quests (after SG6/SG7 filter)`);

        // Fetch all completed quest details
        console.log(`[useQuestData] Fetching ${playerDoc.CompletedQuests.length} completed quests...`);
        const completedQuestPromises = playerDoc.CompletedQuests.map(async (questId) => {
          const quest = await FirestoreHelpers.getQuest(questId);
          if (!quest) {
            console.warn(`[useQuestData] Completed quest not found: ${questId}`);
          }
          return quest;
        });
        const completedQuestResults = await Promise.all(completedQuestPromises);
        const completedQuestsFiltered = completedQuestResults.filter((q): q is Quest => q !== null);
        console.log(`[useQuestData] Loaded ${completedQuestsFiltered.length} completed quests`);

        if (!isMounted) return;

        setActiveQuests(activeQuestsFiltered);
        setCompletedQuests(completedQuestsFiltered);

        // Seed in-memory objective progress from Firestore Player.QuestProgress
        if (playerDoc.QuestProgress) {
          setObjectiveProgress(playerDoc.QuestProgress as QuestProgressMap);
        }

        setLoading(false);

        console.log(`[useQuestData] Quest data loaded successfully`, {
          activeQuests: activeQuestsFiltered.length,
          completedQuests: completedQuestsFiltered.length,
        });

      } catch (err) {
        if (!isMounted) return;

        console.error('[useQuestData] Error fetching quest data:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch quest data';
        setError(errorMessage);
        setLoading(false);
      }
    }

    if (username) {
      console.log(`[useQuestData] Starting fetch for username: ${username}`);
      fetchQuestData();
    } else {
      console.warn('[useQuestData] No username provided');
      setLoading(false);
      setError('No username provided');
    }

    return () => {
      isMounted = false;
    };
  }, [username, refreshTrigger]); // Re-fetch when username changes or quest events occur

  return {
    activeQuests,
    completedQuests,
    player,
    loading,
    error,
    objectiveProgress,
    currentFloor,
  };
}

/**
 * Hook to manage selected quest tracking
 * Persists selection to localStorage
 */
export function useSelectedQuest(activeQuests: Quest[]) {
  const [selectedQuestId, setSelectedQuestId] = useState<string | null>(null);

  // Initialize from localStorage or default to first active quest
  useEffect(() => {
    const stored = localStorage.getItem('selectedQuestId');
    if (stored && activeQuests.some(q => q.id === stored)) {
      setSelectedQuestId(stored);
    } else if (activeQuests.length > 0) {
      setSelectedQuestId(activeQuests[0].id);
    } else {
      setSelectedQuestId(null);
    }
  }, [activeQuests]);

  // Persist to localStorage when changed
  const selectQuest = (questId: string) => {
    setSelectedQuestId(questId);
    localStorage.setItem('selectedQuestId', questId);
  };

  const selectedQuest = activeQuests.find(q => q.id === selectedQuestId) || null;

  return {
    selectedQuest,
    selectedQuestId,
    selectQuest,
  };
}

