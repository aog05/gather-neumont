/**
 * Quest Types — Master objective and progress type definitions.
 *
 * These types extend the base Quest Firestore interface to support
 * structured, multi-objective quests with per-objective progress tracking.
 */

// ============================================================================
// OBJECTIVE TYPES
// ============================================================================

/** All supported objective kinds */
export type QuestObjectiveType =
  | 'npc_talk'        // Talk to a specific NPC
  | 'location'        // Enter a named zone
  | 'quiz_complete'   // Complete N daily quizzes (lifetime count)
  | 'quiz_streak'     // Reach N consecutive quiz days
  | 'stat_threshold'  // Accumulate N total points
  | 'group_all';      // All group members must satisfy a sub-objective (SG3)

/**
 * A single objective within a quest.
 * Stored in the `objectives` array on a Quest Firestore document.
 */
export interface QuestObjective {
  /** Unique identifier within this quest (e.g., "talk_to_walsh") */
  id: string;

  /** Objective type — determines which trigger evaluates this objective */
  type: QuestObjectiveType;

  /** Human-readable description shown in the UI */
  description: string;

  /**
   * Target entity for npc_talk objectives.
   * Must match the NPC config `id` field (e.g., "walsh").
   */
  npcId?: string;

  /**
   * Target zone for location objectives.
   * Must match an entry id in location-zones.json.
   */
  zoneId?: string;

  /**
   * Numeric threshold for countable objectives
   * (quiz_complete, quiz_streak, stat_threshold).
   */
  requiredValue?: number;

  /**
   * Required group member count for group_all objectives (SG3).
   * All members identified by Player.groupId must satisfy this objective.
   */
  requiredGroupSize?: number;

  /**
   * Sub-objective type for group_all objectives (SG3).
   * E.g., 'quiz_complete' means every group member must complete a quiz.
   */
  groupSubType?: QuestObjectiveType;
}

// ============================================================================
// PROGRESS TYPES
// ============================================================================

/**
 * Progress record for a single objective.
 * Stored under Player.QuestProgress[questId][objectiveId].
 */
export interface ObjectiveProgress {
  /** Current numeric value (0 for binary objectives until completed) */
  currentValue: number;

  /** True when currentValue >= requiredValue (or binary objective is satisfied) */
  completed: boolean;
}

/**
 * Per-quest metadata stored alongside objective progress (SG1, SG4).
 * Stored under Player.QuestProgress[questId].__meta
 */
export interface QuestProgressMeta {
  /** Unix ms timestamp when the quest was started (for timed quests, SG1) */
  startedAt?: number;

  /** Date key (YYYY-MM-DD) of last reset (for repeatable quests, SG4) */
  lastResetAt?: string;
}

/** Payload emitted when a timed quest expires before completion (SG1) */
export interface QuestTimerExpiredPayload {
  questId: string;
  questTitle: string;
}

/** Payload emitted when a repeatable quest resets its objectives (SG4) */
export interface QuestResetPayload {
  questId: string;
}

/** Payload emitted when a cosmetic reward is granted (SG5) */
export interface QuestCosmeticGrantedPayload {
  questId: string;
  cosmeticId: string;
  cosmeticName: string;
  cosmeticType: string;
}

/** Payload emitted when a hidden quest is revealed (SG6) */
export interface QuestRevealedPayload {
  questId: string;
}

/** Payload emitted when the player changes floors (SG7) */
export interface PlayerFloorChangedPayload {
  floor: number;
}

/**
 * Progress map for a single quest: objectiveId → ObjectiveProgress.
 * Stored under Player.QuestProgress[questId].
 */
export type QuestObjectiveProgress = Record<string, ObjectiveProgress>;

/**
 * Full quest progress map for a player: questId → QuestObjectiveProgress.
 * Stored as a top-level field on the Player Firestore document.
 */
export type QuestProgressMap = Record<string, QuestObjectiveProgress>;

// ============================================================================
// BRIDGE EVENT PAYLOADS
// ============================================================================

/** Emitted when QuestTriggerSystem updates a single objective */
export interface QuestObjectiveUpdatedPayload {
  questId: string;
  objectiveId: string;
  currentValue: number;
  completed: boolean;
}

/** Emitted when an NPC dialogue is initiated */
export interface NpcTalkedPayload {
  npcId: string;
}

/** Emitted when a player enters a location zone */
export interface ZoneEnteredPayload {
  zoneId: string;
}

/** Emitted after a daily quiz is successfully submitted */
export interface QuizCompletedPayload {
  totalPoints: number;
  streakDays: number;
  quizzesCompleted: number;
}

