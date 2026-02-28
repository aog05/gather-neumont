/**
 * Verify NPCs Script
 * 
 * This script checks that all NPC documents have the dialogueTreeId field
 * and that it references a valid dialogue tree.
 */

import { collection, getDocs } from "firebase/firestore";
import { db, COLLECTIONS } from "./firebase";
import { FirestoreQueries } from "./firestore-helpers";

async function verifyNPCs() {
  console.log("\n🔍 Verifying NPCs...\n");

  try {
    const npcsRef = collection(db, COLLECTIONS.NPC);
    const querySnapshot = await getDocs(npcsRef);

    console.log(`Found ${querySnapshot.size} NPC documents\n`);

    for (const doc of querySnapshot.docs) {
      const data = doc.data();
      const npcName = data.Name;
      const dialogueTreeId = data.dialogueTreeId;

      console.log(`\n📋 NPC: ${npcName}`);
      console.log(`   Document ID: ${doc.id}`);
      console.log(`   Dialogue Tree ID: ${dialogueTreeId}`);

      if (!dialogueTreeId) {
        console.log(`   ❌ Missing dialogueTreeId field`);
        continue;
      }

      // Try to find the dialogue by treeId
      const dialogue = await FirestoreQueries.getDialogueByTreeId(dialogueTreeId);

      if (dialogue) {
        console.log(`   ✅ Dialogue found: ${dialogue.id}`);
        console.log(`   📝 Content preview: ${dialogue.content.substring(0, 50)}...`);
      } else {
        console.log(`   ❌ Dialogue NOT found for treeId: ${dialogueTreeId}`);
      }
    }

    console.log(`\n✅ NPC verification complete!`);
  } catch (error) {
    console.error("❌ Error verifying NPCs:", error);
  }

  process.exit(0);
}

verifyNPCs();

