/**
 * Firestore Cleanup Script
 * 
 * Deletes test/seed data from Firestore database.
 * 
 * Usage:
 *   bun run src/lib/firestore-cleanup.ts                    # Delete all seeded data
 *   bun run src/lib/firestore-cleanup.ts --collection=NPC   # Delete specific collection
 *   bun run src/lib/firestore-cleanup.ts --all              # Delete ALL data (dangerous!)
 *   bun run src/lib/firestore-cleanup.ts --dry-run          # Preview what would be deleted
 */

import { 
  collection, 
  getDocs, 
  deleteDoc, 
  doc,
  query,
  where,
  writeBatch
} from "firebase/firestore";
import { db, COLLECTIONS } from "./firebase";
import * as readline from "readline";

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const deleteAll = args.includes("--all");
const specificCollection = args.find(arg => arg.startsWith("--collection="))?.split("=")[1];

// Collections that can be safely deleted (seeded data)
const SEEDED_COLLECTIONS = [
  COLLECTIONS.COSMETIC,
  COLLECTIONS.SKILL_TREE_ITEMS,
  COLLECTIONS.PUZZLE,
  COLLECTIONS.QUEST,
  COLLECTIONS.DIALOGUE,
  COLLECTIONS.NPC,
  COLLECTIONS.PLAYER,
  COLLECTIONS.PUZZLE_WEEK,
];

// All collections (use with caution!)
const ALL_COLLECTIONS = [
  ...SEEDED_COLLECTIONS,
  // Add any other collections here
];

/**
 * Prompt user for confirmation
 */
function confirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question + " (yes/no): ", (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "yes" || answer.toLowerCase() === "y");
    });
  });
}

/**
 * Delete all documents in a collection
 */
async function deleteCollection(collectionName: string, dryRun: boolean = false): Promise<number> {
  console.log(`\n🗑️  Processing collection: ${collectionName}`);
  
  const collectionRef = collection(db, collectionName);
  const snapshot = await getDocs(collectionRef);
  
  if (snapshot.empty) {
    console.log(`   ℹ️  Collection is empty`);
    return 0;
  }

  console.log(`   Found ${snapshot.size} documents`);

  if (dryRun) {
    console.log(`   [DRY RUN] Would delete ${snapshot.size} documents`);
    snapshot.forEach((doc) => {
      console.log(`   - ${doc.id}`);
    });
    return snapshot.size;
  }

  // Use batched writes for better performance
  const batchSize = 500;
  let deletedCount = 0;
  let batch = writeBatch(db);
  let batchCount = 0;

  for (const document of snapshot.docs) {
    batch.delete(document.ref);
    batchCount++;
    deletedCount++;

    if (batchCount >= batchSize) {
      await batch.commit();
      console.log(`   ✅ Deleted ${deletedCount}/${snapshot.size} documents...`);
      batch = writeBatch(db);
      batchCount = 0;
    }
  }

  // Commit remaining documents
  if (batchCount > 0) {
    await batch.commit();
  }

  console.log(`   ✅ Deleted ${deletedCount} documents from ${collectionName}`);
  return deletedCount;
}

/**
 * Delete subcollections under PuzzleWeek (e.g., PuzzleWeek/weeks/Jan20261/{documents})
 */
async function deletePuzzleWeekSubcollections(dryRun: boolean = false): Promise<number> {
  console.log(`\n🗑️  Processing PuzzleWeek subcollections`);

  const puzzleWeekRef = collection(db, COLLECTIONS.PUZZLE_WEEK);
  const weekSnapshot = await getDocs(puzzleWeekRef);

  if (weekSnapshot.empty) {
    console.log(`   ℹ️  No PuzzleWeek documents found`);
    return 0;
  }

  let totalDeleted = 0;

  for (const weekDoc of weekSnapshot.docs) {
    // Get all subcollections under this parent document
    // Structure: PuzzleWeek/{parentDocId}/{subcollectionName}/{documents}
    // We need to check for subcollections like "Jan20261", "Jan20262", etc.
    const weekIds = ["Jan20261", "Jan20262", "Jan20263", "Jan20264", "Jan20265"];

    for (const weekId of weekIds) {
      const subcollectionRef = collection(db, COLLECTIONS.PUZZLE_WEEK, weekDoc.id, weekId);
      const daySnapshot = await getDocs(subcollectionRef);

      if (daySnapshot.empty) {
        continue;
      }

      console.log(`   Found ${daySnapshot.size} documents in ${weekDoc.id}/${weekId}`);

      if (dryRun) {
        console.log(`   [DRY RUN] Would delete ${daySnapshot.size} documents`);
        totalDeleted += daySnapshot.size;
        continue;
      }

      for (const dayDoc of daySnapshot.docs) {
        await deleteDoc(dayDoc.ref);
        totalDeleted++;
      }

      console.log(`   ✅ Deleted ${daySnapshot.size} documents from ${weekDoc.id}/${weekId}`);
    }
  }

  return totalDeleted;
}

/**
 * Main cleanup function
 */
async function cleanup() {
  console.log("\n🧹 Firestore Cleanup Script");
  console.log("=".repeat(60));

  // Determine what to delete
  let collectionsToDelete: string[] = [];

  if (specificCollection) {
    collectionsToDelete = [specificCollection];
    console.log(`\n📋 Mode: Delete specific collection (${specificCollection})`);
  } else if (deleteAll) {
    collectionsToDelete = ALL_COLLECTIONS;
    console.log(`\n⚠️  Mode: Delete ALL data (DANGEROUS!)`);
  } else {
    collectionsToDelete = SEEDED_COLLECTIONS;
    console.log(`\n📋 Mode: Delete seeded test data`);
  }

  if (isDryRun) {
    console.log(`\n🔍 DRY RUN MODE - No data will be deleted\n`);
  }

  console.log(`\nCollections to process:`);
  collectionsToDelete.forEach(c => console.log(`   - ${c}`));

  // Confirm deletion (skip for dry run)
  if (!isDryRun) {
    console.log("\n⚠️  WARNING: This will permanently delete data!");
    const confirmed = await confirm("\nAre you sure you want to continue?");

    if (!confirmed) {
      console.log("\n❌ Cleanup cancelled");
      return;
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("Starting cleanup...");
  console.log("=".repeat(60));

  let totalDeleted = 0;
  const stats: Record<string, number> = {};

  // Delete PuzzleWeek subcollections first (if PuzzleWeek is being deleted)
  if (collectionsToDelete.includes(COLLECTIONS.PUZZLE_WEEK)) {
    const subcollectionCount = await deletePuzzleWeekSubcollections(isDryRun);
    stats["PuzzleWeek subcollections"] = subcollectionCount;
    totalDeleted += subcollectionCount;
  }

  // Delete each collection
  for (const collectionName of collectionsToDelete) {
    try {
      const count = await deleteCollection(collectionName, isDryRun);
      stats[collectionName] = count;
      totalDeleted += count;
    } catch (error) {
      console.error(`\n❌ Error deleting ${collectionName}:`, error);
    }
  }

  // Print summary
  console.log("\n" + "=".repeat(60));
  if (isDryRun) {
    console.log("🔍 DRY RUN SUMMARY");
  } else {
    console.log("✅ CLEANUP COMPLETE");
  }
  console.log("=".repeat(60));
  console.log(`\n📊 Statistics:\n`);

  for (const [collection, count] of Object.entries(stats)) {
    if (count > 0) {
      console.log(`   ${collection}: ${count} documents`);
    }
  }

  console.log(`\n   Total: ${totalDeleted} documents ${isDryRun ? "would be" : ""} deleted`);

  if (isDryRun) {
    console.log(`\n💡 Run without --dry-run to actually delete the data`);
  }
}

/**
 * Show usage information
 */
function showUsage() {
  console.log(`
Firestore Cleanup Script

Usage:
  bun run src/lib/firestore-cleanup.ts [options]

Options:
  --dry-run              Preview what would be deleted without deleting
  --all                  Delete ALL data (use with extreme caution!)
  --collection=NAME      Delete only the specified collection

Examples:
  # Preview deletion of seeded data
  bun run src/lib/firestore-cleanup.ts --dry-run

  # Delete all seeded test data
  bun run src/lib/firestore-cleanup.ts

  # Delete only NPC collection
  bun run src/lib/firestore-cleanup.ts --collection=NPC

  # Delete ALL data (dangerous!)
  bun run src/lib/firestore-cleanup.ts --all

Seeded Collections:
  - Cosmetic
  - SkillTreeItems
  - Puzzle
  - Quest
  - Dialogue
  - NPC
  - Player
  - PuzzleWeek (and subcollections)
`);
}

// Run cleanup if executed directly
if (import.meta.main) {
  if (args.includes("--help") || args.includes("-h")) {
    showUsage();
    process.exit(0);
  }

  cleanup()
    .then(() => {
      console.log("\n✅ Script completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Cleanup failed:", error);
      process.exit(1);
    });
}

export { cleanup, deleteCollection, deletePuzzleWeekSubcollections };


