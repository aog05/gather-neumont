/**
 * Firestore Usage Examples
 * 
 * This file demonstrates how to use the Firestore helpers and types
 * in your application code.
 */

import { where, orderBy, limit } from "firebase/firestore";
import { COLLECTIONS } from "./firebase";
import FirestoreHelpers from "./firestore-helpers";
import type { Puzzle, Player, NPC, Quest } from "../types/firestore.types";

/**
 * Example 1: Get a single puzzle by ID
 */
export async function exampleGetPuzzle(puzzleId: string) {
  const puzzle = await FirestoreHelpers.getDocument(COLLECTIONS.PUZZLE, puzzleId);
  
  if (puzzle) {
    console.log(`Puzzle: ${puzzle.Name}`);
    console.log(`Topic: ${puzzle.Topic}`);
    console.log(`Reward: ${puzzle.Reward} points`);
  } else {
    console.log("Puzzle not found");
  }
  
  return puzzle;
}

/**
 * Example 2: Get all CS puzzles
 */
export async function exampleGetCSPuzzles() {
  const csPuzzles = await FirestoreHelpers.getPuzzlesByTopic("CS");
  
  console.log(`Found ${csPuzzles.length} CS puzzles`);
  csPuzzles.forEach((puzzle) => {
    console.log(`- ${puzzle.Name} (${puzzle.Type})`);
  });
  
  return csPuzzles;
}

/**
 * Example 3: Get player profile by username
 */
export async function exampleGetPlayerProfile(username: string) {
  const player = await FirestoreHelpers.getPlayerByUsername(username);
  
  if (player) {
    console.log(`Player: ${player.Username}`);
    console.log(`Wallet: ${player.Wallet} points`);
    console.log(`Skills: ${player.SkillTree.length}`);
    console.log(`Completed Quests: ${player.CompletedQuests.length}`);
    console.log(`Active Quests: ${player.ActiveQuests.length}`);
  }
  
  return player;
}

/**
 * Example 4: Get all NPCs
 */
export async function exampleGetAllNPCs() {
  const npcs = await FirestoreHelpers.getAllDocuments(COLLECTIONS.NPC);
  
  console.log(`Found ${npcs.length} NPCs`);
  npcs.forEach((npc) => {
    console.log(`- ${npc.Name} (${npc.Behavior})`);
  });
  
  return npcs;
}

/**
 * Example 5: Get free cosmetics
 */
export async function exampleGetFreeCosmetics() {
  const freeCosmetics = await FirestoreHelpers.getFreeCosmetics();
  
  console.log(`Found ${freeCosmetics.length} free cosmetics`);
  freeCosmetics.forEach((cosmetic) => {
    console.log(`- ${cosmetic.Name} (${cosmetic.Type})`);
  });
  
  return freeCosmetics;
}

/**
 * Example 6: Get dialogue tree for an NPC
 */
export async function exampleGetNPCDialogue(npcId: string) {
  // First get the NPC
  const npc = await FirestoreHelpers.getDocument(COLLECTIONS.NPC, npcId);
  
  if (!npc) {
    console.log("NPC not found");
    return null;
  }
  
  // Then get their dialogue
  const dialogue = await FirestoreHelpers.getDialogue(npc.dialogueReference);
  
  if (dialogue) {
    console.log(`Dialogue for ${npc.Name}:`);
    console.log(`Content: ${dialogue.content}`);
    console.log(`Options: ${Object.keys(dialogue.Paths).length}`);
  }
  
  return dialogue;
}

/**
 * Example 7: Get quest chain
 */
export async function exampleGetQuestChain(startQuestId: string) {
  const questChain: Quest[] = [];
  let currentQuestId: string | null = startQuestId;
  
  while (currentQuestId) {
    const quest = await FirestoreHelpers.getQuest(currentQuestId);
    
    if (!quest) break;
    
    questChain.push(quest);
    console.log(`Quest ${questChain.length}: ${quest.Title}`);
    console.log(`  Reward: ${quest.Reward.Points} points`);
    
    // Move to next quest in chain
    currentQuestId = quest.Next || null;
  }
  
  console.log(`Total quests in chain: ${questChain.length}`);
  return questChain;
}

/**
 * Example 8: Get player's skill tree details
 */
export async function exampleGetPlayerSkills(playerId: string) {
  const player = await FirestoreHelpers.getDocument(COLLECTIONS.PLAYER, playerId);
  
  if (!player) {
    console.log("Player not found");
    return [];
  }
  
  // Get all skill tree items for this player
  const skills = await Promise.all(
    player.SkillTree.map((skillId) =>
      FirestoreHelpers.getSkillTreeItem(skillId)
    )
  );
  
  // Filter out any null results
  const validSkills = skills.filter((skill) => skill !== null);
  
  console.log(`${player.Username}'s Skills:`);
  validSkills.forEach((skill) => {
    if (skill) {
      console.log(`- ${skill.Name} (${skill.Proficiency})`);
      console.log(`  Source: ${skill.Source}`);
    }
  });
  
  return validSkills;
}

/**
 * Example 9: Custom query with multiple filters
 */
export async function exampleCustomQuery() {
  // Get code-type puzzles with high rewards
  const puzzles = await FirestoreHelpers.queryDocuments(
    COLLECTIONS.PUZZLE,
    where("Type", "==", "code"),
    where("Reward", ">=", 500),
    orderBy("Reward", "desc"),
    limit(5)
  );
  
  console.log("Top 5 high-reward code puzzles:");
  puzzles.forEach((puzzle, index) => {
    console.log(`${index + 1}. ${puzzle.Name} - ${puzzle.Reward} points`);
  });
  
  return puzzles;
}

/**
 * Example 10: Get puzzle days for a week
 */
export async function exampleGetWeeklyPuzzles(weekId: string = "Jan20261") {
  const puzzleDays = await FirestoreHelpers.getPuzzleDaysForWeek(weekId);
  
  console.log(`Puzzles for week ${weekId}:`);
  console.log(`Found ${puzzleDays.length} puzzle days`);
  
  return puzzleDays;
}

/**
 * Run all examples (for testing)
 */
export async function runAllExamples() {
  console.log("\n🎯 Running Firestore Usage Examples\n");
  
  try {
    // Note: Replace these IDs with actual IDs from your database
    // await exampleGetPuzzle("0GjZORaQ78lWoBxfqEyB");
    // await exampleGetCSPuzzles();
    // await exampleGetPlayerProfile("johnwebofficial");
    // await exampleGetAllNPCs();
    // await exampleGetFreeCosmetics();
    // await exampleCustomQuery();
    
    console.log("\n✅ All examples completed successfully");
  } catch (error) {
    console.error("❌ Error running examples:", error);
  }
}

// Uncomment to run examples
// if (import.meta.main) {
//   runAllExamples();
// }

