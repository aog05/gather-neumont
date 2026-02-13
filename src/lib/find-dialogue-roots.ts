/**
 * Find Root Dialogue Nodes
 * 
 * Identifies which dialogue nodes are root nodes (not referenced by other nodes)
 */

import { collection, getDocs } from "firebase/firestore";
import { db, COLLECTIONS } from "./firebase";

async function findDialogueRoots() {
  console.log("\n🔍 Finding Root Dialogue Nodes");
  console.log("=".repeat(60));

  try {
    const dialoguesRef = collection(db, COLLECTIONS.DIALOGUE);
    const snapshot = await getDocs(dialoguesRef);

    if (snapshot.empty) {
      console.log("⚠️  No dialogue documents found!");
      return;
    }

    // Collect all dialogue IDs and their paths
    const allDialogues = new Map<string, any>();
    const referencedIds = new Set<string>();

    snapshot.forEach((doc) => {
      const data = doc.data();
      allDialogues.set(doc.id, data);

      // Track all IDs that are referenced in Paths
      if (data.Paths) {
        Object.values(data.Paths).forEach((nextId) => {
          if (nextId && typeof nextId === "string" && nextId !== "") {
            referencedIds.add(nextId);
          }
        });
      }
    });

    // Find root nodes (not referenced by any other node)
    const rootNodes: string[] = [];
    allDialogues.forEach((data, id) => {
      if (!referencedIds.has(id)) {
        rootNodes.push(id);
      }
    });

    console.log(`\n📊 Total dialogues: ${allDialogues.size}`);
    console.log(`📊 Referenced dialogues: ${referencedIds.size}`);
    console.log(`📊 Root dialogues: ${rootNodes.length}\n`);

    console.log("🌳 Root Dialogue Nodes (potential starting points):\n");
    rootNodes.forEach((id) => {
      const data = allDialogues.get(id);
      console.log(`  • ${id}`);
      console.log(`    Content: "${data.content?.substring(0, 60)}..."`);
      console.log(`    Paths: ${Object.keys(data.Paths || {}).length} options`);
      console.log("");
    });

    // Suggest which ones to use for NPCs
    console.log("\n💡 Suggested NPC Dialogue Assignments:\n");
    
    const suggestions = [
      { npc: "admissions_staff", keywords: ["welcome", "hello", "dean", "academic"] },
      { npc: "prof_smith", keywords: ["professor", "teach", "research", "rodriguez"] },
      { npc: "tech_support", keywords: ["help", "support", "question", "struggling"] },
    ];

    suggestions.forEach(({ npc, keywords }) => {
      console.log(`${npc}:`);
      const matches = rootNodes.filter((id) => {
        const content = allDialogues.get(id)?.content?.toLowerCase() || "";
        return keywords.some((keyword) => content.includes(keyword));
      });

      if (matches.length > 0) {
        matches.forEach((id) => {
          const data = allDialogues.get(id);
          console.log(`  ✅ ${id}`);
          console.log(`     "${data.content?.substring(0, 50)}..."`);
        });
      } else {
        console.log(`  ⚠️  No matching dialogue found`);
      }
      console.log("");
    });

  } catch (error) {
    console.error("❌ Error:", error);
  }

  console.log("=".repeat(60));
}

findDialogueRoots()
  .then(() => {
    console.log("\n✅ Analysis complete");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Analysis failed:", error);
    process.exit(1);
  });

