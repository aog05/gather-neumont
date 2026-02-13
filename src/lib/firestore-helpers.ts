/**
 * Firestore Helper Functions
 * 
 * Utility functions for common Firestore operations with type safety.
 * These helpers simplify database queries and provide consistent error handling.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  QueryConstraint,
  DocumentData,
  CollectionReference,
  DocumentReference,
} from "firebase/firestore";
import { db, COLLECTIONS } from "./firebase";
import type { CollectionName, DocumentType } from "../types/firestore.types";

/**
 * Get a single document by ID with type safety
 */
export async function getDocument<T extends CollectionName>(
  collectionName: T,
  documentId: string
): Promise<DocumentType<T> | null> {
  try {
    console.log(`[Firestore] Fetching document: ${collectionName}/${documentId}`);
    const docRef = doc(db, collectionName, documentId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      console.log(`[Firestore] Document found: ${collectionName}/${documentId}`);
      return {
        id: docSnap.id,
        ...docSnap.data(),
      } as DocumentType<T>;
    }

    console.warn(`[Firestore] Document not found: ${collectionName}/${documentId}`);
    return null;
  } catch (error) {
    console.error(`[Firestore] Error fetching document from ${collectionName}/${documentId}:`, error);
    throw error;
  }
}

/**
 * Get all documents from a collection
 */
export async function getAllDocuments<T extends CollectionName>(
  collectionName: T
): Promise<DocumentType<T>[]> {
  try {
    const collectionRef = collection(db, collectionName);
    const snapshot = await getDocs(collectionRef);
    
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as DocumentType<T>[];
  } catch (error) {
    console.error(`Error fetching documents from ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Query documents with filters
 */
export async function queryDocuments<T extends CollectionName>(
  collectionName: T,
  ...constraints: QueryConstraint[]
): Promise<DocumentType<T>[]> {
  try {
    const collectionRef = collection(db, collectionName);
    const q = query(collectionRef, ...constraints);
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as DocumentType<T>[];
  } catch (error) {
    console.error(`Error querying ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Get documents from a subcollection
 */
export async function getSubcollectionDocuments<T extends DocumentData>(
  parentCollection: string,
  parentDocId: string,
  subcollection: string
): Promise<T[]> {
  try {
    const subcollectionRef = collection(db, parentCollection, parentDocId, subcollection);
    const snapshot = await getDocs(subcollectionRef);
    
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as T[];
  } catch (error) {
    console.error(`Error fetching subcollection ${subcollection}:`, error);
    throw error;
  }
}

/**
 * Common query helpers
 */
export const FirestoreQueries = {
  /**
   * Get puzzles by topic
   */
  async getPuzzlesByTopic(topic: string) {
    return queryDocuments(COLLECTIONS.PUZZLE, where("Topic", "==", topic));
  },

  /**
   * Get puzzles by type
   */
  async getPuzzlesByType(type: string) {
    return queryDocuments(COLLECTIONS.PUZZLE, where("Type", "==", type));
  },

  /**
   * Get cosmetics by type
   */
  async getCosmeticsByType(type: string) {
    return queryDocuments(COLLECTIONS.COSMETIC, where("Type", "==", type));
  },

  /**
   * Get free cosmetics (cost = 0)
   */
  async getFreeCosmetics() {
    return queryDocuments(COLLECTIONS.COSMETIC, where("ObjectCost", "==", 0));
  },

  /**
   * Get NPCs by behavior
   */
  async getNPCsByBehavior(behavior: string) {
    return queryDocuments(COLLECTIONS.NPC, where("Behavior", "==", behavior));
  },

  /**
   * Get player by username
   */
  async getPlayerByUsername(username: string) {
    const results = await queryDocuments(
      COLLECTIONS.PLAYER,
      where("Username", "==", username),
      limit(1)
    );
    return results[0] || null;
  },

  /**
   * Get player by email
   */
  async getPlayerByEmail(email: string) {
    const results = await queryDocuments(
      COLLECTIONS.PLAYER,
      where("Email", "==", email),
      limit(1)
    );
    return results[0] || null;
  },

  /**
   * Get dialogue by ID
   */
  async getDialogue(dialogueId: string) {
    return getDocument(COLLECTIONS.DIALOGUE, dialogueId);
  },

  /**
   * Get dialogue by stable tree ID
   */
  async getDialogueByTreeId(treeId: string) {
    const results = await queryDocuments(
      COLLECTIONS.DIALOGUE,
      where("treeId", "==", treeId),
      limit(1)
    );
    return results[0] || null;
  },

  /**
   * Get NPC by name
   */
  async getNPCByName(name: string) {
    const results = await queryDocuments(
      COLLECTIONS.NPC,
      where("Name", "==", name),
      limit(1)
    );
    return results[0] || null;
  },

  /**
   * Get quest by ID
   */
  async getQuest(questId: string) {
    return getDocument(COLLECTIONS.QUEST, questId);
  },

  /**
   * Get skill tree item by ID
   */
  async getSkillTreeItem(itemId: string) {
    return getDocument(COLLECTIONS.SKILL_TREE_ITEMS, itemId);
  },

  /**
   * Get PuzzleDay documents for a specific week
   */
  async getPuzzleDaysForWeek(weekId: string) {
    return getSubcollectionDocuments(
      COLLECTIONS.PUZZLE_WEEK,
      weekId,
      COLLECTIONS.PUZZLE_DAY
    );
  },
};

/**
 * Export all helpers
 */
export default {
  getDocument,
  getAllDocuments,
  queryDocuments,
  getSubcollectionDocuments,
  ...FirestoreQueries,
};

