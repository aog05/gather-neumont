/**
 * Firestore Connection Verification Test
 * 
 * This script demonstrates successful Firestore queries and validates
 * that the database connection is working properly.
 */

import { collection, getDocs, query, limit, where } from "firebase/firestore";
import { db, COLLECTIONS, isFirestoreReady } from "./firebase";
import type { Puzzle, NPC, Player, Cosmetic, Quest, SkillTreeItem } from "../types/firestore.types";

/**
 * Test 1: Verify Firestore connection
 */
async function testConnection() {
  console.log('\n🔌 Test 1: Firestore Connection');
  console.log('='.repeat(50));
  
  if (isFirestoreReady()) {
    console.log('✅ Firestore is initialized and ready');
    return true;
  } else {
    console.log('❌ Firestore is not initialized');
    return false;
  }
}

/**
 * Test 2: Query Puzzle collection
 */
async function testPuzzleQuery() {
  console.log('\n🧩 Test 2: Query Puzzle Collection');
  console.log('='.repeat(50));
  
  try {
    const puzzlesRef = collection(db, COLLECTIONS.PUZZLE);
    const q = query(puzzlesRef, limit(2));
    const snapshot = await getDocs(q);
    
    console.log(`Found ${snapshot.size} puzzles`);
    
    snapshot.forEach((doc) => {
      const puzzle = { id: doc.id, ...doc.data() } as Puzzle;
      console.log(`\n📝 Puzzle: ${puzzle.Name}`);
      console.log(`   Topic: ${puzzle.Topic}`);
      console.log(`   Type: ${puzzle.Type}`);
      console.log(`   Reward: ${puzzle.Reward} points`);
      console.log(`   Attempts: ${puzzle.Attempts}`);
    });
    
    console.log('\n✅ Puzzle query successful');
    return true;
  } catch (error) {
    console.error('❌ Puzzle query failed:', error);
    return false;
  }
}

/**
 * Test 3: Query NPC collection
 */
async function testNPCQuery() {
  console.log('\n👤 Test 3: Query NPC Collection');
  console.log('='.repeat(50));
  
  try {
    const npcsRef = collection(db, COLLECTIONS.NPC);
    const q = query(npcsRef, limit(1));
    const snapshot = await getDocs(q);
    
    console.log(`Found ${snapshot.size} NPCs`);
    
    snapshot.forEach((doc) => {
      const npc = { id: doc.id, ...doc.data() } as NPC;
      console.log(`\n🎭 NPC: ${npc.Name}`);
      console.log(`   Behavior: ${npc.Behavior}`);
      console.log(`   Position: [${npc.Placement.join(', ')}]`);
      console.log(`   Dialogue ID: ${npc.dialogueReference}`);
    });
    
    console.log('\n✅ NPC query successful');
    return true;
  } catch (error) {
    console.error('❌ NPC query failed:', error);
    return false;
  }
}

/**
 * Test 4: Query Player collection
 */
async function testPlayerQuery() {
  console.log('\n🎮 Test 4: Query Player Collection');
  console.log('='.repeat(50));
  
  try {
    const playersRef = collection(db, COLLECTIONS.PLAYER);
    const q = query(playersRef, limit(1));
    const snapshot = await getDocs(q);
    
    console.log(`Found ${snapshot.size} players`);
    
    snapshot.forEach((doc) => {
      const player = { id: doc.id, ...doc.data() } as Player;
      console.log(`\n👤 Player: ${player.Username}`);
      console.log(`   Real Name: ${player.RealName}`);
      console.log(`   Wallet: ${player.Wallet} points`);
      console.log(`   Skills: ${player.SkillTree.length} items`);
      console.log(`   Puzzles Completed: ${player.PuzzleRecord.length}`);
      console.log(`   Active Quests: ${player.ActiveQuests.length}`);
    });
    
    console.log('\n✅ Player query successful');
    return true;
  } catch (error) {
    console.error('❌ Player query failed:', error);
    return false;
  }
}

/**
 * Test 5: Query Cosmetic collection
 */
async function testCosmeticQuery() {
  console.log('\n👕 Test 5: Query Cosmetic Collection');
  console.log('='.repeat(50));
  
  try {
    const cosmeticsRef = collection(db, COLLECTIONS.COSMETIC);
    const q = query(cosmeticsRef, limit(3));
    const snapshot = await getDocs(q);
    
    console.log(`Found ${snapshot.size} cosmetics`);
    
    snapshot.forEach((doc) => {
      const cosmetic = { id: doc.id, ...doc.data() } as Cosmetic;
      console.log(`\n🎨 ${cosmetic.Name} (${cosmetic.Type})`);
      console.log(`   Cost: ${cosmetic.ObjectCost} points`);
      console.log(`   Description: ${cosmetic.shortdesc}`);
    });
    
    console.log('\n✅ Cosmetic query successful');
    return true;
  } catch (error) {
    console.error('❌ Cosmetic query failed:', error);
    return false;
  }
}

/**
 * Test 6: Query with filter (Quest collection)
 */
async function testQuestQuery() {
  console.log('\n🎯 Test 6: Query Quest Collection');
  console.log('='.repeat(50));
  
  try {
    const questsRef = collection(db, COLLECTIONS.QUEST);
    const q = query(questsRef, limit(2));
    const snapshot = await getDocs(q);
    
    console.log(`Found ${snapshot.size} quests`);
    
    snapshot.forEach((doc) => {
      const quest = { id: doc.id, ...doc.data() } as Quest;
      console.log(`\n📜 Quest: ${quest.Title}`);
      console.log(`   Description: ${quest.smalldesc}`);
      console.log(`   Reward: ${quest.Reward.Points} points`);
      if (quest.Reward.Cosmetic) {
        console.log(`   Cosmetic Reward: ${quest.Reward.Cosmetic}`);
      }
      if (quest.Next) {
        console.log(`   Next Quest: ${quest.Next}`);
      }
    });
    
    console.log('\n✅ Quest query successful');
    return true;
  } catch (error) {
    console.error('❌ Quest query failed:', error);
    return false;
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('\n🚀 Starting Firestore Verification Tests');
  console.log('='.repeat(50));
  
  const results = {
    connection: await testConnection(),
    puzzle: await testPuzzleQuery(),
    npc: await testNPCQuery(),
    player: await testPlayerQuery(),
    cosmetic: await testCosmeticQuery(),
    quest: await testQuestQuery(),
  };
  
  console.log('\n📊 Test Results Summary');
  console.log('='.repeat(50));
  
  const passed = Object.values(results).filter(r => r).length;
  const total = Object.keys(results).length;
  
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
  });
  
  console.log(`\n${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('\n🎉 All tests passed! Firestore is working correctly.');
    return true;
  } else {
    console.log('\n⚠️  Some tests failed. Check the errors above.');
    return false;
  }
}

// Run tests if executed directly
if (import.meta.main) {
  runAllTests()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Test suite failed:', error);
      process.exit(1);
    });
}

export { runAllTests };

