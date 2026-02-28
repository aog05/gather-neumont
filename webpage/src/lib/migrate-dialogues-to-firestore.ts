/**
 * Dialogue Migration Script
 * 
 * Converts existing JSON dialogue files to Firestore Dialogue format
 * and uploads them to the database.
 * 
 * Usage:
 *   bun run src/lib/migrate-dialogues-to-firestore.ts
 */

import { collection, addDoc, updateDoc, doc } from "firebase/firestore";
import { db, COLLECTIONS } from "./firebase";
import type { Dialogue } from "../types/firestore.types";
import * as fs from "fs";
import * as path from "path";

// Dialogue JSON structure from existing files
interface DialogueJSON {
  id: string;
  npcId: string;
  title: string;
  nodes: Record<string, DialogueNodeJSON>;
}

interface DialogueNodeJSON {
  id: string;
  type: "dialogue" | "choice" | "end";
  speaker: string;
  text: string;
  responses?: Array<{
    id: string;
    text: string;
    next: string;
  }>;
  next?: string;
  actions?: Array<{
    type: string;
    data: any;
  }>;
}

/**
 * Convert a JSON dialogue tree to Firestore Dialogue documents
 */
async function convertDialogueTree(dialogueJson: DialogueJSON): Promise<string> {
  console.log(`\n📝 Converting dialogue tree: ${dialogueJson.title}`);
  
  const nodeIdMap = new Map<string, string>(); // Maps old node IDs to Firestore doc IDs
  const nodesToCreate: Array<{ oldId: string; node: DialogueNodeJSON }> = [];

  // Collect all nodes
  for (const [nodeId, node] of Object.entries(dialogueJson.nodes)) {
    nodesToCreate.push({ oldId: nodeId, node });
  }

  console.log(`   Found ${nodesToCreate.length} nodes to convert`);

  // Create all dialogue documents first (without paths)
  for (const { oldId, node } of nodesToCreate) {
    const dialogue: Omit<Dialogue, "id"> = {
      content: node.text,
      Paths: {}, // Will be updated later
      TriggeredQuest: "", // Will be updated if node has quest action
    };

    // Create the document
    const docRef = await addDoc(collection(db, COLLECTIONS.DIALOGUE), dialogue);
    nodeIdMap.set(oldId, docRef.id);
    
    console.log(`   ✅ Created node "${oldId}" -> ${docRef.id}`);
  }

  // Now update all documents with correct Paths
  for (const { oldId, node } of nodesToCreate) {
    const firestoreId = nodeIdMap.get(oldId)!;
    const paths: Record<string, string> = {};
    let triggeredQuest = "";

    // Build Paths from responses or next
    if (node.responses && node.responses.length > 0) {
      // Choice node - map response text to next node ID
      for (const response of node.responses) {
        const nextFirestoreId = nodeIdMap.get(response.next) || "";
        paths[response.text] = nextFirestoreId;
      }
    } else if (node.next) {
      // Dialogue node - single path
      const nextFirestoreId = nodeIdMap.get(node.next) || "";
      paths["Continue"] = nextFirestoreId;
    }
    // End nodes have no paths

    // Check for quest trigger action
    if (node.actions) {
      for (const action of node.actions) {
        if (action.type === "quest" && action.data?.questId) {
          triggeredQuest = action.data.questId;
        }
      }
    }

    // Update the document
    await updateDoc(doc(db, COLLECTIONS.DIALOGUE, firestoreId), {
      Paths: paths,
      TriggeredQuest: triggeredQuest,
    });
  }

  // Return the root node's Firestore ID
  const rootId = nodeIdMap.get("start") || nodeIdMap.values().next().value;
  console.log(`   🎯 Root dialogue ID: ${rootId}`);
  
  return rootId;
}

/**
 * Main migration function
 */
async function migrateDialogues() {
  console.log("\n🔄 Dialogue Migration to Firestore");
  console.log("=".repeat(60));

  const dialoguesDir = path.join(process.cwd(), "assets", "data", "dialogues");
  
  // Check if directory exists
  if (!fs.existsSync(dialoguesDir)) {
    console.error(`❌ Dialogues directory not found: ${dialoguesDir}`);
    return;
  }

  // Read all JSON files
  const files = fs.readdirSync(dialoguesDir).filter(f => f.endsWith(".json"));
  
  if (files.length === 0) {
    console.log("⚠️  No dialogue JSON files found");
    return;
  }

  console.log(`\nFound ${files.length} dialogue files to migrate:`);
  files.forEach(f => console.log(`   - ${f}`));

  const rootDialogueIds: Record<string, string> = {};

  // Process each file
  for (const file of files) {
    const filePath = path.join(dialoguesDir, file);
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const dialogueJson: DialogueJSON = JSON.parse(fileContent);

    try {
      const rootId = await convertDialogueTree(dialogueJson);
      rootDialogueIds[dialogueJson.id] = rootId;
    } catch (error) {
      console.error(`❌ Error converting ${file}:`, error);
    }
  }

  // Print summary
  console.log("\n" + "=".repeat(60));
  console.log("✅ Migration Complete!");
  console.log("=".repeat(60));
  console.log("\n📋 Root Dialogue IDs (use these in NPC configs):\n");
  
  for (const [treeId, rootId] of Object.entries(rootDialogueIds)) {
    console.log(`   ${treeId}: "${rootId}"`);
  }

  console.log("\n💡 Next steps:");
  console.log("   1. Update NPC configuration files with these dialogue IDs");
  console.log("   2. Test dialogues in-game");
  console.log("   3. Remove old JSON files once verified");
}

// Run migration if executed directly
if (import.meta.main) {
  migrateDialogues()
    .then(() => {
      console.log("\n✅ Migration process completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Migration failed:", error);
      process.exit(1);
    });
}

