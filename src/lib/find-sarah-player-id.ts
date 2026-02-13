/**
 * Find sarah_dev's player ID from Firebase
 */

import { collection, getDocs } from "firebase/firestore";
import { db, COLLECTIONS } from "./firebase";

async function findSarahPlayerId() {
  try {
    console.log("🔍 Searching for all players...\n");

    // Get all players
    const playersRef = collection(db, COLLECTIONS.PLAYER);
    const querySnapshot = await getDocs(playersRef);

    if (querySnapshot.empty) {
      console.log("❌ No players found in Firebase");
      console.log("   Make sure you've run the seed script: bun run src/lib/firestore-seed.ts");
      process.exit(1);
    }

    console.log(`Found ${querySnapshot.size} players:\n`);

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`Player: ${data.Username}`);
      console.log(`   ID: ${doc.id}`);
      console.log(`   Real Name: ${data.RealName}`);
      console.log(`   Active Quests: ${data.ActiveQuests?.length || 0}`);
      console.log(`   Completed Quests: ${data.CompletedQuests?.length || 0}`);

      if (data.Username === "sarah_dev") {
        console.log(`\n✅ Found sarah_dev!`);
        console.log(`📋 Update Game.tsx with this player ID:`);
        console.log(`   const TEST_PLAYER_ID = "${doc.id}";\n`);
      }
      console.log("");
    });

    process.exit(0);
  } catch (error) {
    console.error("❌ Error finding player:", error);
    process.exit(1);
  }
}

findSarahPlayerId();

