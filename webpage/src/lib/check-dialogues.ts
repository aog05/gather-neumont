/**
 * Check Dialogue Documents in Firestore
 * 
 * Verifies that the dialogue documents referenced in NPC configs exist
 */

import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { db, COLLECTIONS } from "./firebase";

async function checkDialogues() {
  console.log("\n🔍 Checking Dialogue Documents");
  console.log("=".repeat(60));

  // Dialogue IDs from floor1-npcs.json
  const dialogueIds = [
    "yGRb8dLeAuXfN1JJwesf", // admissions_staff
    "Z4j55cKDSPOcARRe4dfL", // prof_smith
    "mJ2teOz8DX6qJsvqgK6t", // tech_support
  ];

  console.log("\n📋 Checking specific dialogue IDs from NPC configs:\n");

  for (const dialogueId of dialogueIds) {
    try {
      const docRef = doc(db, COLLECTIONS.DIALOGUE, dialogueId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log(`✅ ${dialogueId}`);
        console.log(`   Content: "${data.content?.substring(0, 50)}..."`);
        console.log(`   Paths: ${Object.keys(data.Paths || {}).length} options`);
        console.log(`   TriggeredQuest: ${data.TriggeredQuest || "none"}`);
      } else {
        console.log(`❌ ${dialogueId} - NOT FOUND`);
      }
    } catch (error) {
      console.error(`❌ Error checking ${dialogueId}:`, error);
    }
    console.log("");
  }

  // List all dialogues in the collection
  console.log("\n📚 All Dialogue documents in Firestore:\n");
  try {
    const dialoguesRef = collection(db, COLLECTIONS.DIALOGUE);
    const snapshot = await getDocs(dialoguesRef);

    if (snapshot.empty) {
      console.log("⚠️  No dialogue documents found in Firestore!");
    } else {
      console.log(`Found ${snapshot.size} dialogue documents:\n`);
      snapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`  • ${doc.id}`);
        console.log(`    Content: "${data.content?.substring(0, 40)}..."`);
        console.log(`    Paths: ${Object.keys(data.Paths || {}).length} options`);
      });
    }
  } catch (error) {
    console.error("❌ Error listing dialogues:", error);
  }

  console.log("\n" + "=".repeat(60));
}

checkDialogues()
  .then(() => {
    console.log("\n✅ Dialogue check complete");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Dialogue check failed:", error);
    process.exit(1);
  });

