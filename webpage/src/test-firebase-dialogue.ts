/**
 * Test Firebase Dialogue Loading
 * 
 * Quick test to verify Firebase dialogue loading works in the browser
 */

import { firestoreDialogueService } from "./services/FirestoreDialogueService";

export async function testDialogueLoading() {
  console.log("🧪 Testing Firebase Dialogue Loading...");
  
  const testDialogueId = "yGRb8dLeAuXfN1JJwesf"; // admissions_staff dialogue
  
  try {
    console.log(`Attempting to load dialogue: ${testDialogueId}`);
    const tree = await firestoreDialogueService.loadDialogueTree(testDialogueId);
    console.log("✅ Successfully loaded dialogue tree:", tree);
    console.log(`   - ID: ${tree.id}`);
    console.log(`   - Title: ${tree.title}`);
    console.log(`   - Nodes: ${Object.keys(tree.nodes).length}`);
    return true;
  } catch (error) {
    console.error("❌ Failed to load dialogue:", error);
    return false;
  }
}

// Auto-run test when module loads (for debugging)
if (typeof window !== 'undefined') {
  (window as any).testDialogueLoading = testDialogueLoading;
  console.log("💡 Run testDialogueLoading() in console to test Firebase dialogue loading");
}

