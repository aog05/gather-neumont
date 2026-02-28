/**
 * Test script to render a quiz puzzle from Firebase for sarah_dev
 * 
 * Run with: bun run src/lib/test-quiz-render.ts
 */

import { getAllQuizQuestions } from "../server/services/firebase-quiz.service";
import { FirestoreQueries } from "./firestore-helpers";

async function testQuizRender() {
  console.log("\n🎯 Testing Quiz Render from Firebase\n");
  console.log("=".repeat(60));

  try {
    // 1. Fetch all quiz questions from Firebase
    console.log("\n📡 Fetching quiz questions from Firebase...");
    const questions = await getAllQuizQuestions();

    if (questions.length === 0) {
      console.error("❌ No quiz questions found in Firebase!");
      console.log("\nMake sure you have Quiz-type puzzles seeded in Firebase.");
      console.log("Run: bun run src/lib/firestore-seed.ts");
      return;
    }

    console.log(`✅ Found ${questions.length} quiz questions\n`);

    // 2. Display each question
    questions.forEach((question, index) => {
      console.log(`\n📝 Question ${index + 1}:`);
      console.log("-".repeat(60));
      console.log(`ID: ${question.id}`);
      console.log(`Type: ${question.type}`);
      console.log(`Prompt: ${question.prompt}`);
      console.log(`Base Points: ${question.basePoints}`);
      console.log(`Difficulty: ${question.difficulty}`);
      console.log(`Tags: ${question.tags?.join(", ")}`);
      
      if (question.choices) {
        console.log(`\nChoices:`);
        question.choices.forEach((choice, i) => {
          console.log(`  ${i + 1}. ${choice}`);
        });
      }

      if (question.type === "mcq" && question.correctIndex !== undefined) {
        console.log(`\n✅ Correct Answer: Choice ${question.correctIndex + 1}`);
      } else if (question.type === "select-all" && question.correctIndices) {
        const correctChoices = question.correctIndices.map(i => i + 1).join(", ");
        console.log(`\n✅ Correct Answers: Choices ${correctChoices}`);
      }
    });

    // 3. Check if sarah_dev exists
    console.log("\n\n👤 Checking for sarah_dev player...");
    const sarahPlayer = await FirestoreQueries.getPlayerByUsername("sarah_dev");

    if (!sarahPlayer) {
      console.error("❌ sarah_dev player not found in Firebase!");
      console.log("\nMake sure sarah_dev is seeded in the Player collection.");
      return;
    }

    console.log(`✅ Found player: ${sarahPlayer.Username}`);
    console.log(`   Player ID: ${sarahPlayer.id}`);
    console.log(`   Email: ${sarahPlayer.Email}`);
    console.log(`   Wallet: ${sarahPlayer.Wallet} points`);
    console.log(`   Completed Puzzles: ${sarahPlayer.PuzzleRecord.length}`);
    console.log(`   Active Quests: ${sarahPlayer.ActiveQuests.length}`);

    // 4. Show which puzzle sarah_dev should solve
    console.log("\n\n🎮 Recommended Quiz for sarah_dev:");
    console.log("=".repeat(60));
    
    const firstQuestion = questions[0];
    console.log(`\nQuestion ID: ${firstQuestion.id}`);
    console.log(`Prompt: ${firstQuestion.prompt}`);
    console.log(`Points: ${firstQuestion.basePoints}`);
    console.log(`\nChoices:`);
    firstQuestion.choices?.forEach((choice, i) => {
      console.log(`  ${String.fromCharCode(65 + i)}. ${choice}`);
    });

    console.log("\n\n✅ Quiz system is ready!");
    console.log("\n📋 Next Steps:");
    console.log("1. Start the dev server: bun run dev");
    console.log("2. Walk to the quiz terminal in the game");
    console.log("3. Press E to start the quiz");
    console.log("4. Answer the question and submit");
    console.log("5. Check Firebase Console to verify completion data\n");

  } catch (error) {
    console.error("\n❌ Error testing quiz render:", error);
    throw error;
  }
}

// Run the test
testQuizRender()
  .then(() => {
    console.log("\n✅ Test completed successfully!\n");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  });

