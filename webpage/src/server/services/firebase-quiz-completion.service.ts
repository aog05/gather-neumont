/**
 * Firebase Quiz Completion Service
 * 
 * Handles saving quiz completion data to Firebase:
 * 1. PuzzleDay subcollection (under PuzzleWeek)
 * 2. Player.PuzzleRecord array
 */

import {
  doc,
  updateDoc,
  arrayUnion,
  collection,
  setDoc,
  getDoc,
} from "firebase/firestore";
import { db, COLLECTIONS } from "../../lib/firebase";
import { FirestoreQueries } from "../../lib/firestore-helpers";

/**
 * Get the current week ID in format: MonthYearWeekNumber
 * Example: "Feb20263" for February 2026, Week 3
 */
function getCurrentWeekId(): string {
  const now = new Date();
  const month = now.toLocaleString("en-US", { month: "short" });
  const year = now.getFullYear();
  
  // Calculate week number of the month (1-5)
  const dayOfMonth = now.getDate();
  const weekOfMonth = Math.ceil(dayOfMonth / 7);
  
  return `${month}${year}${weekOfMonth}`;
}

/**
 * Get the day of week string
 */
function getDayOfWeek(): string {
  const now = new Date();
  return now.toLocaleString("en-US", { weekday: "long" });
}

/**
 * Save quiz completion to PuzzleDay subcollection
 * 
 * @param puzzleId - The Puzzle document ID
 * @param playerId - The Player document ID
 * @param score - Score achieved
 * @param completionTimeMs - Time taken to complete in milliseconds
 */
export async function saveQuizCompletionToPuzzleDay(
  puzzleId: string,
  playerId: string,
  score: number,
  completionTimeMs: number
): Promise<void> {
  try {
    const weekId = getCurrentWeekId();
    const dayOfWeek = getDayOfWeek();
    
    console.log(`[firebase-quiz-completion] Saving to PuzzleDay:`, {
      weekId,
      dayOfWeek,
      puzzleId,
      playerId,
      score,
      completionTimeMs,
    });

    // Path: PuzzleWeek/{weekId}/PuzzleDay/{dayOfWeek}
    const puzzleDayRef = doc(
      db,
      COLLECTIONS.PUZZLE_WEEK,
      weekId,
      "PuzzleDay",
      dayOfWeek
    );

    // Check if document exists
    const puzzleDaySnap = await getDoc(puzzleDayRef);

    if (puzzleDaySnap.exists()) {
      // Update existing document
      const data = puzzleDaySnap.data();
      const topScore = data.topScore || [];
      const topTen = data.topTen || [];

      // Add player score to leaderboard
      topScore.push(score);
      topTen.push(playerId);

      // Sort by score (descending) and keep top 10
      const combined = topScore.map((s: number, i: number) => ({
        score: s,
        playerId: topTen[i],
      }));
      combined.sort((a, b) => b.score - a.score);
      const top10 = combined.slice(0, 10);

      await updateDoc(puzzleDayRef, {
        topScore: top10.map((entry) => entry.score),
        topTen: top10.map((entry) => entry.playerId),
        completionTimeMs, // Update with latest completion time
      });

      console.log(`[firebase-quiz-completion] ✅ Updated PuzzleDay/${weekId}/${dayOfWeek}`);
    } else {
      // Create new document
      await setDoc(puzzleDayRef, {
        dow: dayOfWeek,
        puzzle: puzzleId,
        topScore: [score],
        topTen: [playerId],
        completionTimeMs,
      });

      console.log(`[firebase-quiz-completion] ✅ Created PuzzleDay/${weekId}/${dayOfWeek}`);
    }
  } catch (error) {
    console.error(`[firebase-quiz-completion] ❌ Error saving to PuzzleDay:`, error);
    throw error;
  }
}

/**
 * Save quiz completion to Player.PuzzleRecord and update Wallet
 *
 * @param playerId - The Player document ID
 * @param puzzleId - The Puzzle document ID
 * @param pointsEarned - Points earned from the quiz
 */
export async function saveQuizCompletionToPlayer(
  playerId: string,
  puzzleId: string,
  pointsEarned: number
): Promise<void> {
  try {
    console.log(`[firebase-quiz-completion] Updating player:`, {
      playerId,
      puzzleId,
      pointsEarned,
    });

    const playerRef = doc(db, COLLECTIONS.PLAYER, playerId);

    // Get current player data to read Wallet
    const playerSnap = await getDoc(playerRef);
    if (!playerSnap.exists()) {
      throw new Error(`Player not found: ${playerId}`);
    }

    const playerData = playerSnap.data();
    const currentWallet = playerData.Wallet || "0";

    // Calculate new wallet value (Wallet is stored as string in Firebase)
    const currentPoints = parseInt(currentWallet, 10) || 0;
    const newPoints = currentPoints + pointsEarned;

    console.log(`[firebase-quiz-completion] Wallet update:`, {
      currentPoints,
      pointsEarned,
      newPoints,
    });

    // Add puzzle ID to PuzzleRecord array AND update Wallet
    await updateDoc(playerRef, {
      PuzzleRecord: arrayUnion(puzzleId),
      Wallet: newPoints.toString(), // Update wallet with new total (ADD, not override)
    });

    console.log(`[firebase-quiz-completion] ✅ Updated Player/${playerId} - Added ${pointsEarned} points (${currentPoints} → ${newPoints})`);
  } catch (error) {
    console.error(`[firebase-quiz-completion] ❌ Error updating Player:`, error);
    throw error;
  }
}

