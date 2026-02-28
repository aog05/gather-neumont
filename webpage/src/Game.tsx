import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import Phaser from "phaser";
import createGame from "./game.ts";
import { isOverlayRoute } from "./utils/overlayRoutes";
import DialogueUI from "./components/DialogueUI.tsx";
import QuestTracker from "./components/QuestTracker.tsx";
import PlayerProfile from "./components/PlayerProfile.tsx";
import QuizPanel from "./ui/quiz/QuizPanel.tsx";
import { useQuestData, useSelectedQuest } from "./hooks/useQuestData.ts";
import { usePlayerData } from "./hooks/usePlayerData.ts";
import { doc, updateDoc, arrayRemove } from "firebase/firestore";
import { db, COLLECTIONS } from "./lib/firebase.ts";
import FirestoreHelpers from "./lib/firestore-helpers.ts";
import { GameEventBridge } from "./systems/GameEventBridge.ts";

/**
 * TODO: Replace with actual authenticated player username
 * For now, using sarah_dev test player from Firebase seed data
 * This should be replaced with Firebase Auth or user context
 *
 * sarah_dev player has:
 * - 2 active quests
 * - 3 completed quests
 * - Username: sarah_dev
 * - Real Name: Sarah Martinez
 */
const TEST_PLAYER_USERNAME = "sarah_dev"; // Stable username from seed data

function GamePage() {
  const gameRef = useRef<Phaser.Game | null>(null);
  const location = useLocation();
  const [isDailyQuizOpen, setIsDailyQuizOpen] = useState(false);


  // Fetch quest data for the current player by username (reseed-proof)
  console.log(`[Game] Using player username: ${TEST_PLAYER_USERNAME}`);
  const { activeQuests, completedQuests, loading, error } = useQuestData(TEST_PLAYER_USERNAME);

  // Fetch player profile data
  const {
    player,
    loading: playerLoading,
    error: playerError,
    totalPoints,
    activeQuestsCount,
    completedQuestsCount,
    totalPuzzlesCompleted,
  } = usePlayerData(TEST_PLAYER_USERNAME);

  // Manage selected quest for tracking
  const { selectedQuest, selectQuest } = useSelectedQuest(activeQuests);

  // Handle quest removal from Firebase
  const handleRemoveQuest = async (questId: string) => {
    try {
      console.log(`[Game] Removing quest: ${questId}`);

      // Get player by username
      const playerDoc = await FirestoreHelpers.getPlayerByUsername(TEST_PLAYER_USERNAME);

      if (!playerDoc) {
        console.error(`[Game] Player not found: ${TEST_PLAYER_USERNAME}`);
        return;
      }

      // Remove quest from ActiveQuests array in Firebase
      const playerRef = doc(db, COLLECTIONS.PLAYER, playerDoc.id);
      await updateDoc(playerRef, {
        ActiveQuests: arrayRemove(questId)
      });

      console.log(`[Game] ✅ Quest removed from Firebase: ${questId}`);

      // Emit event to notify UI to refresh quest data
      const bridge = GameEventBridge.getInstance();
      bridge.emit("quest:removed", { questId });
    } catch (error) {
      console.error(`[Game] Error removing quest:`, error);
    }
  };

  // Handle quest completion (TEST ONLY)
  const handleCompleteQuest = async (questId: string) => {
    try {
      console.log(`[Game] [TEST] Completing quest: ${questId}`);

      // Use GameState to complete the quest (handles points, moving to completed, etc.)
      const { GameState } = await import("./systems/GameState.ts");
      const gameState = new GameState();
      gameState.setPlayerUsername(TEST_PLAYER_USERNAME);
      await gameState.completeQuest(questId);

      console.log(`[Game] [TEST] ✅ Quest completion triggered`);
    } catch (error) {
      console.error(`[Game] [TEST] Error completing quest:`, error);
    }
  };

  useEffect(() => {
    // Initialize Phaser game on mount
    if (!gameRef.current) {
      gameRef.current = createGame("game-container");
    }

    // Cleanup: destroy game on unmount to prevent memory leaks
    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  // Log quest data for debugging
  useEffect(() => {
    console.log(`[Game] Quest data state:`, {
      loading,
      error,
      activeQuestsCount: activeQuests.length,
      completedQuestsCount: completedQuests.length,
      selectedQuest: selectedQuest?.Title || 'None',
    });
  }, [loading, error, activeQuests, completedQuests, selectedQuest]);

  // Log errors to console for debugging
  useEffect(() => {
    if (error) {
      console.error("[Game] Quest data error:", error);
    }
    if (playerError) {
      console.error("[Game] Player data error:", playerError);
    }
  }, [error, playerError]);

  // Listen for daily quiz start event from game world
  useEffect(() => {
    console.log("[Game] Setting up dailyQuiz:start event listener");

    const handleDailyQuizStart = () => {
      console.log("[Game] ✅ Daily quiz start event received!");
      console.log("[Game] Setting isDailyQuizOpen to true");
      setIsDailyQuizOpen(true);
    };

    window.addEventListener("dailyQuiz:start", handleDailyQuizStart);
    console.log("[Game] Event listener attached to window");

    return () => {
      console.log("[Game] Removing dailyQuiz:start event listener");
      window.removeEventListener("dailyQuiz:start", handleDailyQuizStart);
    };
  }, []);

  // Debug: Log when isDailyQuizOpen changes
  useEffect(() => {
    console.log(`[Game] isDailyQuizOpen changed to: ${isDailyQuizOpen}`);
  }, [isDailyQuizOpen]);

  // Disable keyboard input when quiz is open or overlay route is active
  useEffect(() => {
    const game = gameRef.current;
    if (!game) return;

    const isOverlayRouteActive = isOverlayRoute(location.pathname);
    const enabled = !isOverlayRouteActive && !isDailyQuizOpen;

    console.log(`[Game] Keyboard state update:`, {
      isOverlayRouteActive,
      isDailyQuizOpen,
      enabled,
      pathname: location.pathname
    });

    const keyboard = (game as any).input?.keyboard as Phaser.Input.Keyboard.KeyboardPlugin | undefined;
    if (keyboard) {
      keyboard.enabled = enabled;
      console.log(`[Game] Main keyboard.enabled set to: ${enabled}`);
    }

    // Also toggle any active scene keyboard plugins (defensive).
    for (const scene of game.scene.getScenes(true)) {
      const sceneKeyboard = (scene as any)?.input?.keyboard as
        | Phaser.Input.Keyboard.KeyboardPlugin
        | undefined;
      if (sceneKeyboard) {
        sceneKeyboard.enabled = enabled;
        console.log(`[Game] Scene "${scene.scene.key}" keyboard.enabled set to: ${enabled}`);
      }
    }
  }, [isDailyQuizOpen, location.pathname]);

  return (
    <div className="game-wrapper" style={{ position: "fixed", inset: 0 }}>
      <div id="game-container" />
      <DialogueUI />

      {/* Player Profile - Top Left */}
      <PlayerProfile
        username={player?.Username || TEST_PLAYER_USERNAME}
        realName={player?.RealName || "Unknown"}
        totalPoints={totalPoints}
        activeQuestsCount={activeQuestsCount}
        completedQuestsCount={completedQuestsCount}
        totalPuzzlesCompleted={totalPuzzlesCompleted}
        loading={playerLoading}
      />

      {/* Quest Tracker - Top Right */}
      <QuestTracker
        selectedQuest={selectedQuest}
        activeQuests={activeQuests}
        completedQuests={completedQuests}
        onSelectQuest={selectQuest}
        onRemoveQuest={handleRemoveQuest}
        onCompleteQuest={handleCompleteQuest}
        loading={loading}
      />

      {/* Daily Quiz Popup */}
      <QuizPanel
        isOpen={isDailyQuizOpen}
        onClose={() => setIsDailyQuizOpen(false)}
      />
    </div>
  );
}

export default GamePage;
