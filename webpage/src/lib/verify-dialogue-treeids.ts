/**
 * Verify Dialogue TreeIds Script
 * 
 * This script checks that all dialogue documents have the treeId field
 * and that the treeId matches the document ID.
 */

import { collection, getDocs } from "firebase/firestore";
import { db, COLLECTIONS } from "./firebase";

async function verifyDialogueTreeIds() {
  console.log("\n🔍 Verifying Dialogue TreeIds...\n");

  try {
    const dialoguesRef = collection(db, COLLECTIONS.DIALOGUE);
    const querySnapshot = await getDocs(dialoguesRef);

    console.log(`Found ${querySnapshot.size} dialogue documents\n`);

    let validCount = 0;
    let invalidCount = 0;

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const docId = doc.id;
      const treeId = data.treeId;

      if (!treeId) {
        console.log(`❌ Document ${docId}: Missing treeId field`);
        invalidCount++;
      } else if (treeId !== docId) {
        console.log(`⚠️  Document ${docId}: treeId (${treeId}) doesn't match document ID`);
        invalidCount++;
      } else {
        console.log(`✅ Document ${docId}: treeId matches (${treeId})`);
        validCount++;
      }
    });

    console.log(`\n📊 Summary:`);
    console.log(`   Valid: ${validCount}`);
    console.log(`   Invalid: ${invalidCount}`);

    if (invalidCount === 0) {
      console.log(`\n✅ All dialogue documents have valid treeIds!`);
    } else {
      console.log(`\n⚠️  Some dialogue documents have issues. Please reseed the database.`);
    }
  } catch (error) {
    console.error("❌ Error verifying dialogue treeIds:", error);
  }

  process.exit(0);
}

verifyDialogueTreeIds();

