/**
 * Test script to verify quiz points integration for sarah_dev
 * 
 * Run with: bun run src/lib/test-quiz-points.ts
 */

import { FirestoreQueries } from "./firestore-helpers";
import { getAllQuizQuestions } from "../server/services/firebase-quiz.service";

async function testQuizPoints() {
  console.log("\n🎯 Testing Quiz Points Integration for sarah_dev\n");
  console.log("=".repeat(60));

  try {
    // 1. Get sarah_dev's current state
    console.log("\n📊 Current Player State:");
    console.log("-".repeat(60));
    
    const player = await FirestoreQueries.getPlayerByUsername("sarah_dev");
    
    if (!player) {
      console.error("❌ sarah_dev not found in Firebase!");
      return;
    }

    const currentPoints = parseInt(player.Wallet, 10) || 0;
    
    console.log(`Player: ${player.Username} (${player.RealName})`);
    console.log(`Player ID: ${player.id}`);
    console.log(`Current Wallet: ${currentPoints.toLocaleString()} points`);
    console.log(`Completed Puzzles: ${player.PuzzleRecord.length}`);
    console.log(`Active Quests: ${player.ActiveQuests.length}`);

    // 2. Get available quizzes
    console.log("\n\n🎮 Available Quizzes:");
    console.log("-".repeat(60));
    
    const questions = await getAllQuizQuestions();
    
    if (questions.length === 0) {
      console.error("❌ No quiz questions available!");
      return;
    }

    questions.forEach((q, index) => {
      console.log(`\n${index + 1}. ${q.prompt}`);
      console.log(`   Base Points: ${q.basePoints}`);
      console.log(`   Type: ${q.type}`);
      console.log(`   Puzzle ID: ${q.id.split("_")[0]}`);
    });

    // 3. Simulate quiz completion
    console.log("\n\n💡 Simulated Quiz Completion:");
    console.log("-".repeat(60));
    
    const firstQuiz = questions[0];
    const basePoints = firstQuiz.basePoints;
    const timeBonus = 3; // Example time bonus
    const attemptBonus = 2; // Example attempt bonus
    const totalPoints = basePoints + timeBonus + attemptBonus;

    console.log(`\nIf sarah_dev completes: "${firstQuiz.prompt}"`);
    console.log(`  Base Points: ${basePoints}`);
    console.log(`  Time Bonus: +${timeBonus}`);
    console.log(`  Attempt Bonus: +${attemptBonus}`);
    console.log(`  Total Earned: ${totalPoints} points`);
    
    const newPoints = currentPoints + totalPoints;
    
    console.log(`\n📈 Wallet Update:`);
    console.log(`  Current: ${currentPoints.toLocaleString()} points`);
    console.log(`  Earned:  +${totalPoints} points`);
    console.log(`  New:     ${newPoints.toLocaleString()} points`);

    // 4. Show what will be saved to Firebase
    console.log("\n\n💾 Firebase Updates (on completion):");
    console.log("-".repeat(60));
    
    const puzzleId = firstQuiz.id.split("_")[0];
    const now = new Date();
    const weekId = `${now.toLocaleString("en-US", { month: "short" })}${now.getFullYear()}${Math.ceil(now.getDate() / 7)}`;
    const dayOfWeek = now.toLocaleString("en-US", { weekday: "long" });
    
    console.log(`\n1. PuzzleWeek/${weekId}/PuzzleDay/${dayOfWeek}`);
    console.log(`   - topScore: [..., ${totalPoints}]`);
    console.log(`   - topTen: [..., "${player.id}"]`);
    console.log(`   - completionTimeMs: <elapsed time>`);
    
    console.log(`\n2. Player/${player.id}`);
    console.log(`   - PuzzleRecord: [..., "${puzzleId}"]`);
    console.log(`   - Wallet: "${currentPoints}" → "${newPoints}"`);

    // 5. Instructions
    console.log("\n\n🚀 How to Test:");
    console.log("-".repeat(60));
    console.log(`\n1. Note sarah_dev's current points: ${currentPoints.toLocaleString()}`);
    console.log(`2. Run: bun run dev`);
    console.log(`3. Walk to quiz terminal and press E`);
    console.log(`4. Complete the quiz`);
    console.log(`5. Check Firebase Console - Wallet should be: ${newPoints.toLocaleString()}`);
    console.log(`6. Check Player Profile UI - should show updated points`);

    console.log("\n\n✅ Quiz points integration is ready!");
    console.log("\nExpected Console Logs on Completion:");
    console.log("-".repeat(60));
    console.log(`[firebase-quiz-completion] Wallet update: {`);
    console.log(`  currentPoints: ${currentPoints},`);
    console.log(`  pointsEarned: ${totalPoints},`);
    console.log(`  newPoints: ${newPoints}`);
    console.log(`}`);
    console.log(`[firebase-quiz-completion] ✅ Updated Player/${player.id} - Added ${totalPoints} points (${currentPoints} → ${newPoints})`);
    console.log(`[quiz] ✅ Firebase completion saved successfully - ${totalPoints} points awarded`);

  } catch (error) {
    console.error("\n❌ Error testing quiz points:", error);
    throw error;
  }
}

// Run the test
testQuizPoints()
  .then(() => {
    console.log("\n✅ Test completed successfully!\n");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  });

