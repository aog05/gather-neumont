/**
 * Verify Players Script
 * 
 * This script checks that all player documents exist and have the correct structure.
 */

import { collection, getDocs } from "firebase/firestore";
import { db, COLLECTIONS } from "./firebase";

async function verifyPlayers() {
  console.log("\n🔍 Verifying Players...\n");

  try {
    const playersRef = collection(db, COLLECTIONS.PLAYER);
    const querySnapshot = await getDocs(playersRef);

    console.log(`Found ${querySnapshot.size} player documents\n`);

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      
      console.log(`\n📋 Player: ${data.Username}`);
      console.log(`   Document ID: ${doc.id}`);
      console.log(`   Real Name: ${data.RealName}`);
      console.log(`   Email: ${data.Email}`);
      console.log(`   Wallet: ${data.Wallet} points`);
      console.log(`   Active Quests: ${data.ActiveQuests?.length || 0}`);
      console.log(`   Completed Quests: ${data.CompletedQuests?.length || 0}`);
      console.log(`   Skills: ${data.Skills?.join(", ") || "None"}`);
    });

    // Find sarah_dev specifically
    console.log(`\n\n🔍 Looking for sarah_dev player...`);
    const sarahDoc = querySnapshot.docs.find(doc => doc.data().Username === "sarah_dev");
    
    if (sarahDoc) {
      console.log(`✅ Found sarah_dev!`);
      console.log(`   Player ID: ${sarahDoc.id}`);
      console.log(`   This is the ID that should be used in Game.tsx`);
      console.log(`\n   const TEST_PLAYER_ID = "${sarahDoc.id}";`);
    } else {
      console.log(`❌ sarah_dev player not found!`);
    }

    console.log(`\n✅ Player verification complete!`);
  } catch (error) {
    console.error("❌ Error verifying players:", error);
  }

  process.exit(0);
}

verifyPlayers();

