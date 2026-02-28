/**
 * Firestore Dialogue Service
 * 
 * Loads dialogue trees from Firestore database and converts them to the
 * DialogueTree format expected by DialogueManager.
 */

import { doc, getDoc } from "firebase/firestore";
import { db, COLLECTIONS } from "../lib/firebase";
import { FirestoreQueries } from "../lib/firestore-helpers";
import type { Dialogue } from "../types/firestore.types";
import type { DialogueTree, DialogueNode } from "../types/dialogue.types";

/**
 * Service for loading and managing dialogues from Firestore
 */
export class FirestoreDialogueService {
  private cache: Map<string, DialogueTree>;

  constructor() {
    this.cache = new Map();
  }

  /**
   * Load a dialogue tree from Firestore
   * @param treeIdOrDocId - Stable tree ID (e.g., "walsh-greeting") or Firestore document ID
   * @returns Promise resolving to DialogueTree
   */
  public async loadDialogueTree(treeIdOrDocId: string): Promise<DialogueTree> {
    // Check cache first
    if (this.cache.has(treeIdOrDocId)) {
      return this.cache.get(treeIdOrDocId)!;
    }

    try {
      // Try to fetch by treeId first (stable identifier)
      console.log(`[FirestoreDialogueService] Loading dialogue tree: ${treeIdOrDocId}`);
      let rootDialogue = await FirestoreQueries.getDialogueByTreeId(treeIdOrDocId);

      // If not found by treeId, try as Firestore document ID (fallback for legacy)
      if (!rootDialogue) {
        console.log(`[FirestoreDialogueService] Not found by treeId, trying as document ID...`);
        rootDialogue = await this.getDialogueNode(treeIdOrDocId);
      }

      if (!rootDialogue) {
        throw new Error(`Dialogue not found: ${treeIdOrDocId}`);
      }

      // Use the document ID for building the tree
      const rootId = rootDialogue.id;

      // Build the complete dialogue tree by traversing all paths
      const tree = await this.buildDialogueTree(rootId, rootDialogue);

      // Cache the tree using both the treeId and document ID
      this.cache.set(treeIdOrDocId, tree);
      if (rootDialogue.treeId && rootDialogue.treeId !== treeIdOrDocId) {
        this.cache.set(rootDialogue.treeId, tree);
      }
      this.cache.set(rootId, tree);

      console.log(`[FirestoreDialogueService] Loaded dialogue tree: ${treeIdOrDocId} (treeId: ${rootDialogue.treeId})`);
      return tree;
    } catch (error) {
      console.error(`Error loading dialogue tree ${treeIdOrDocId}:`, error);
      throw error;
    }
  }

  /**
   * Get a single dialogue node from Firestore
   * @param dialogueId - Firestore document ID
   * @returns Promise resolving to Dialogue or null
   */
  private async getDialogueNode(dialogueId: string): Promise<Dialogue | null> {
    if (!dialogueId || dialogueId === "") {
      return null;
    }

    try {
      const docRef = doc(db, COLLECTIONS.DIALOGUE, dialogueId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data(),
        } as Dialogue;
      }

      return null;
    } catch (error) {
      console.error(`Error fetching dialogue node ${dialogueId}:`, error);
      return null;
    }
  }

  /**
   * Build a complete dialogue tree by recursively fetching all connected nodes
   * @param rootId - Root dialogue ID
   * @param rootDialogue - Root dialogue node
   * @returns Promise resolving to DialogueTree
   */
  private async buildDialogueTree(
    rootId: string,
    rootDialogue: Dialogue
  ): Promise<DialogueTree> {
    const nodes: Record<string, DialogueNode> = {};
    const visited = new Set<string>();
    const toProcess: string[] = [rootId];

    // Map to store Firestore dialogues
    const firestoreNodes = new Map<string, Dialogue>();
    firestoreNodes.set(rootId, rootDialogue);

    // Breadth-first traversal to fetch all connected nodes
    while (toProcess.length > 0) {
      const currentId = toProcess.shift()!;

      if (visited.has(currentId)) {
        continue;
      }

      visited.add(currentId);

      const dialogue = firestoreNodes.get(currentId) || await this.getDialogueNode(currentId);
      
      if (!dialogue) {
        console.warn(`Dialogue node not found: ${currentId}`);
        continue;
      }

      firestoreNodes.set(currentId, dialogue);

      // Add all path targets to processing queue
      if (dialogue.Paths) {
        for (const nextId of Object.values(dialogue.Paths)) {
          if (nextId && nextId !== "" && !visited.has(nextId)) {
            toProcess.push(nextId);
          }
        }
      }

      // Add triggered quest dialogue if present
      if (dialogue.TriggeredQuest && dialogue.TriggeredQuest !== "") {
        // Note: TriggeredQuest is a quest ID, not a dialogue ID
        // We don't need to fetch it here
      }
    }

    // Convert Firestore dialogues to DialogueNode format
    for (const [id, dialogue] of firestoreNodes.entries()) {
      nodes[id] = this.convertToDialogueNode(id, dialogue, firestoreNodes);
    }

    // Create the dialogue tree
    const tree: DialogueTree = {
      id: rootId,
      npcId: "", // Will be set by DialogueManager
      title: `Dialogue Tree ${rootId}`,
      nodes,
    };

    return tree;
  }

  /**
   * Convert Firestore Dialogue to DialogueNode format
   * @param id - Node ID
   * @param dialogue - Firestore Dialogue document
   * @param allNodes - Map of all dialogue nodes for reference
   * @returns DialogueNode
   */
  private convertToDialogueNode(
    id: string,
    dialogue: Dialogue,
    allNodes: Map<string, Dialogue>
  ): DialogueNode {
    const hasResponses = dialogue.Paths && Object.keys(dialogue.Paths).length > 0;
    const hasNext = hasResponses;

    // Determine node type
    let nodeType: "dialogue" | "choice" | "end" = "dialogue";

    if (!hasNext) {
      nodeType = "end";
    } else if (hasResponses) {
      nodeType = "choice";
    }

    // Build responses array from Paths
    const responses = hasResponses
      ? Object.entries(dialogue.Paths).map(([responseText, nextId], index) => ({
          id: `response_${index}`,
          text: responseText,
          next: nextId || "",
        }))
      : undefined;

    // Build actions array if quest is triggered
    const actions = dialogue.TriggeredQuest && dialogue.TriggeredQuest !== ""
      ? [
          {
            type: "quest" as const,
            data: {
              questId: dialogue.TriggeredQuest,
              action: "start" as const,
            },
          },
        ]
      : undefined;

    // Extract speaker name from dialogue content
    // Format: "Speaker Name: dialogue text" or just use content as-is
    let speaker = "NPC";
    let text = dialogue.content;

    // Try to extract speaker name from content (format: "Name: text")
    const speakerMatch = dialogue.content.match(/^([^:]+):\s*(.+)$/s);
    if (speakerMatch) {
      speaker = speakerMatch[1].trim();
      text = speakerMatch[2].trim();
      console.log(`[FirestoreDialogueService] Extracted speaker: "${speaker}" from dialogue ${id}`);
    } else {
      console.warn(`[FirestoreDialogueService] No speaker found in dialogue ${id}, using "NPC"`);
    }

    // Create the dialogue node
    const node: DialogueNode = {
      id,
      type: nodeType,
      speaker: speaker,
      text: text,
    };

    // Add optional fields
    if (responses) {
      node.responses = responses;
    }

    if (actions) {
      node.actions = actions;
    }

    // Add next field for dialogue-type nodes
    if (nodeType === "dialogue" && hasNext) {
      // For dialogue nodes, use the first path as "next"
      const firstPath = Object.values(dialogue.Paths)[0];
      if (firstPath) {
        node.next = firstPath;
      }
    }

    return node;
  }

  /**
   * Clear the dialogue tree cache
   */
  public clearCache(): void {
    this.cache.clear();
    console.log("Dialogue cache cleared");
  }

  /**
   * Preload multiple dialogue trees
   * @param dialogueIds - Array of dialogue IDs to preload
   */
  public async preloadDialogues(dialogueIds: string[]): Promise<void> {
    console.log(`Preloading ${dialogueIds.length} dialogue trees...`);

    const promises = dialogueIds.map((id) => this.loadDialogueTree(id));
    await Promise.all(promises);

    console.log(`Preloaded ${dialogueIds.length} dialogue trees`);
  }

  /**
   * Get cache statistics
   * @returns Object with cache stats
   */
  public getCacheStats(): { size: number; dialogueIds: string[] } {
    return {
      size: this.cache.size,
      dialogueIds: Array.from(this.cache.keys()),
    };
  }
}

// Export singleton instance
export const firestoreDialogueService = new FirestoreDialogueService();

