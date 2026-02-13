/**
 * Firestore Type Definitions
 * 
 * TypeScript interfaces for all Firestore collections in the Neumont Virtual Campus.
 * These types are based on actual data structures retrieved from the Firebase database.
 */

import { Timestamp } from "firebase/firestore";

/**
 * Base interface for Firestore documents
 * All documents have an ID field when retrieved
 */
export interface FirestoreDocument {
  id: string;
}

// ============================================================================
// PUZZLE COLLECTION
// ============================================================================

/**
 * Quiz question for Quiz-type puzzles
 */
export interface QuizQuestion {
  /** Score value for this question */
  SV: number;

  /** Question type: "one-select" or "multiple-choice" */
  type: "one-select" | "multiple-choice";

  /** Correct answer (for one-select) */
  answer?: string;

  /** Correct answers (for multiple-choice) */
  answers?: string[];

  /** Incorrect options */
  other: string[];
}

/**
 * Base Puzzle interface
 */
interface PuzzleBase extends FirestoreDocument {
  /** Puzzle name/title */
  Name: string;

  /** Topic/category (e.g., "Math", "CS", "Algorithms") */
  Topic: string;

  /** Points/currency reward for completion */
  Reward: number;
}

/**
 * Code-type puzzle
 * Uses real code snippets for conditions and solution
 */
export interface CodePuzzle extends PuzzleBase {
  /** Type identifier */
  Type: "Code";

  /** Correct solution (complete code snippet) */
  solution: string;

  /** Number of attempts allowed */
  Attempts: number;

  /** Array of conditions (code snippets, requirements, test cases) */
  conditions: string[];
}

/**
 * Quiz-type puzzle
 * Uses Questions array with multiple choice or one-select questions
 */
export interface QuizPuzzle extends PuzzleBase {
  /** Type identifier */
  Type: "Quiz";

  /** Threshold score (0.0 to 1.0) required to pass */
  Threshold: number;

  /** Array of quiz questions */
  Questions: QuizQuestion[];
}

/**
 * Puzzle union type - can be either Code or Quiz
 */
export type Puzzle = CodePuzzle | QuizPuzzle;

// ============================================================================
// PUZZLE WEEK COLLECTION
// ============================================================================

/**
 * PuzzleWeek collection structure
 * Structure: PuzzleWeek/weeks/{weekId}/{documents}
 * Example: PuzzleWeek/weeks/Jan20261/{doc1, doc2, ...}
 *
 * - "PuzzleWeek" is the collection
 * - "weeks" is a parent document (empty container)
 * - "Jan20261" is the subcollection name (week identifier)
 * - Documents contain daily puzzle data
 */
export interface PuzzleDay extends FirestoreDocument {
  /** Day of week (e.g., "Monday", "Tuesday") */
  dow: string;

  /** Reference to Puzzle document ID */
  puzzle: string;

  /** Top scores array (descending order) */
  topScore: number[];

  /** Top ten player UIDs (corresponding to topScore) */
  topTen: string[];
}

// ============================================================================
// NPC COLLECTION
// ============================================================================

/**
 * NPC Sprite configuration
 * Defines visual appearance through cosmetic item IDs
 */
export interface NPCSprite {
  /** Cosmetic ID for shoes */
  shoes: string;
  
  /** Cosmetic ID for hat */
  hat: string;
  
  /** Cosmetic ID or color for skin */
  skinColor: string;
  
  /** Cosmetic ID for shirt */
  shirt: string;
  
  /** Cosmetic ID for accessories */
  accessories: string;
  
  /** Cosmetic ID for pants */
  pants: string;
}

/**
 * NPC document structure
 * Non-player characters in the virtual campus
 */
export interface NPC extends FirestoreDocument {
  /** Display name of the NPC */
  Name: string;

  /** Sprite/appearance configuration */
  Sprite: NPCSprite;

  /** Position in the game world [x, y] or [floor, position] */
  Placement: [number, number];

  /** AI behavior type (e.g., "wander", "stationary", "patrol") */
  Behavior: string;

  /** Reference to Dialogue tree ID (stable identifier, not Firestore document ID) */
  dialogueTreeId: string;
}

// ============================================================================
// PLAYER COLLECTION
// ============================================================================

/**
 * Player's owned cosmetics organized by type
 */
export interface OwnedCosmetics {
  /** Array of hat cosmetic IDs */
  Hat: string[];
  
  /** Array of shirt cosmetic IDs */
  Shirt: string[];
  
  /** Array of shoe cosmetic IDs */
  Shoes: string[];
  
  /** Array of accessory cosmetic IDs */
  Accessories: string[];
  
  /** Array of pant cosmetic IDs */
  Pants: string[];
}

/**
 * Player document structure
 * User profile and game progress
 */
export interface Player extends FirestoreDocument {
  /** Player's username */
  Username: string;
  
  /** Player's real name */
  RealName: string;
  
  /** Player's email address */
  Email: string;
  
  /** In-game currency/points (stored as string) */
  Wallet: string;
  
  /** Array of SkillTreeItem document IDs */
  SkillTree: string[];
  
  /** Cosmetics owned by the player, organized by type */
  OwnedCosmetics: OwnedCosmetics;
  
  /** Array of completed Puzzle document IDs */
  PuzzleRecord: string[];
  
  /** Array of completed Quest document IDs */
  CompletedQuests: string[];
  
  /** Array of active/in-progress Quest document IDs */
  ActiveQuests: string[];
}

// ============================================================================
// COSMETIC COLLECTION
// ============================================================================

/**
 * Cosmetic document structure
 * Avatar customization items (hats, shirts, shoes, etc.)
 */
export interface Cosmetic extends FirestoreDocument {
  /** Display name of the cosmetic item */
  Name: string;
  
  /** Type/category (e.g., "shirt", "hat", "shoes", "pants", "accessories") */
  Type: string;
  
  /** Short description */
  shortdesc: string;
  
  /** File path to the sprite/image asset */
  SpritePath: string;
  
  /** Cost in points/currency (0 = free/default) */
  ObjectCost: number;
}

// ============================================================================
// DIALOGUE COLLECTION
// ============================================================================

/**
 * Dialogue paths/choices
 * Maps player response text to next Dialogue document ID
 */
export interface DialoguePaths {
  [responseText: string]: string; // Response text -> Next dialogue ID
}

/**
 * Dialogue document structure
 * Branching dialogue trees for NPC conversations
 */
export interface Dialogue extends FirestoreDocument {
  /** The dialogue content/text displayed to the player */
  content: string;

  /**
   * Paths/choices available to the player
   * Key: Player response text
   * Value: Next Dialogue document ID
   */
  Paths: DialoguePaths;

  /**
   * Quest document ID to trigger when this dialogue is reached
   * Empty string if no quest is triggered
   */
  TriggeredQuest: string;

  /**
   * Stable tree identifier for this dialogue node
   * Used for lookups instead of Firestore document ID
   * Example: "walsh-greeting", "chen-courses"
   */
  treeId: string;
}

// ============================================================================
// QUEST COLLECTION
// ============================================================================

/**
 * Quest reward structure
 */
export interface QuestReward {
  /** Points/currency awarded */
  Points: number;

  /** Cosmetic item ID awarded (empty string if none) */
  Cosmetic: string;
}

/**
 * Quest document structure
 * Missions and objectives for players to complete
 */
export interface Quest extends FirestoreDocument {
  /** Quest title/name */
  Title: string;

  /** Short description of the quest */
  smalldesc: string;

  /** Rewards given upon completion */
  Reward: QuestReward;

  /**
   * Next quest in the chain (document ID)
   * Empty string if this is the final quest in the chain
   */
  Next: string;
}

// ============================================================================
// SKILL TREE ITEMS COLLECTION
// ============================================================================

/**
 * SkillTreeItems document structure
 * Individual skills in a player's skill tree
 */
export interface SkillTreeItem extends FirestoreDocument {
  /** Skill name (e.g., "Database Management", "Python", "React") */
  Name: string;

  /** Detailed description of the skill and experience */
  Description: string;

  /**
   * Proficiency level
   * Examples: "Beginner", "Intermediate", "Advanced", "Expert"
   */
  Proficiency: string;

  /**
   * Source/origin of the skill
   * Examples: "Previous Work", "Class", "Self-Taught", "Project"
   */
  Source: string;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Union type of all collection names
 */
export type CollectionName =
  | 'Puzzle'
  | 'PuzzleWeek'
  | 'NPC'
  | 'Player'
  | 'Cosmetic'
  | 'Dialogue'
  | 'Quest'
  | 'SkillTreeItems';

/**
 * Map collection names to their document types
 */
export interface CollectionTypeMap {
  Puzzle: Puzzle;
  PuzzleWeek: PuzzleDay;
  NPC: NPC;
  Player: Player;
  Cosmetic: Cosmetic;
  Dialogue: Dialogue;
  Quest: Quest;
  SkillTreeItems: SkillTreeItem;
}

/**
 * Helper type to get document type from collection name
 */
export type DocumentType<T extends CollectionName> = CollectionTypeMap[T];

