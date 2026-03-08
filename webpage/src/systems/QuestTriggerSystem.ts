/**
 * QuestTriggerSystem — Master quest trigger orchestrator.
 *
 * Single source of truth for evaluating quest objectives in response to
 * game events emitted on GameEventBridge. Handles:
 *   - npc:talked     → npc_talk objectives
 *   - zone:entered   → location objectives
 *   - quiz:completed → quiz_complete, quiz_streak, stat_threshold objectives
 *   - quest:started  → load active objective cache from Firestore
 *
 * Integrates with GameState.completeQuest() when all objectives are satisfied.
 * Writes progress to Player.QuestProgress in Firestore (idempotent).
 *
 * @example
 * // In MainScene.create():
 * this.questTriggerSystem = new QuestTriggerSystem(this.gameState, this.bridge);
 * await this.questTriggerSystem.init(playerUsername);
 */

import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db, COLLECTIONS } from "../lib/firebase";
import { GameEventBridge } from "./GameEventBridge";
import { GameState } from "./GameState";
import { FirestoreQueries } from "../lib/firestore-helpers";
import type { Quest } from "../types/firestore.types";
import type {
  QuestObjective,
  QuestObjectiveProgress,
  NpcTalkedPayload,
  ZoneEnteredPayload,
  QuizCompletedPayload,
  QuestObjectiveUpdatedPayload,
  QuestProgressMeta,
} from "../types/quest.types";

/** Date key helper (YYYY-MM-DD) for repeatable quest resets */
function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/** In-memory cache of active quest objectives: questId → objectives[] */
type ActiveObjectiveCache = Map<string, QuestObjective[]>;

export class QuestTriggerSystem {
  private gameState: GameState;
  private bridge: GameEventBridge;
  private playerUsername: string | null = null;
  private playerId: string | null = null;

  /** questId → objectives array for all currently active quests */
  private activeObjectives: ActiveObjectiveCache = new Map();

  /** In-memory objective progress cache (mirrors Firestore) */
  private progressCache: Map<string, Map<string, QuestObjectiveProgress[string]>> = new Map();

  /** Full quest metadata cache: questId → Quest document */
  private questCache: Map<string, Quest> = new Map();

  /** Timer handle for checking timed quest expiry (SG1) */
  private timerHandle: ReturnType<typeof setInterval> | null = null;

  constructor(gameState: GameState, bridge: GameEventBridge) {
    this.gameState = gameState;
    this.bridge = bridge;
    this._bindEvents();
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /** Initialize with the current player and load their active quest objectives. */
  public async init(playerUsername: string): Promise<void> {
    this.playerUsername = playerUsername;
    await this._loadActiveObjectives();
    // SG1: Start the timer that checks for timed quest expiry every 30 seconds
    this._startTimerCheck();
    console.log(`[QuestTriggerSystem] Initialized for player: ${playerUsername}`);
  }

  /** Clean up timers on scene destroy */
  public destroy(): void {
    if (this.timerHandle !== null) {
      clearInterval(this.timerHandle);
      this.timerHandle = null;
    }
  }

  // ============================================================================
  // Event Binding
  // ============================================================================

  private _bindEvents(): void {
    this.bridge.on("npc:talked", (p: NpcTalkedPayload) => void this._handleNpcTalked(p));
    this.bridge.on("zone:entered", (p: ZoneEnteredPayload) => void this._handleZoneEntered(p));
    this.bridge.on("quiz:completed", (p: QuizCompletedPayload) => void this._handleQuizCompleted(p));
    this.bridge.on("quest:started", (p: { questId: string }) => void this._onQuestStarted(p.questId));
    this.bridge.on("quest:completed", () => void this._loadActiveObjectives());
  }

  // ============================================================================
  // SG1: Timed Quest Timer
  // ============================================================================

  /** Start a periodic check for timed quest expiry (every 30 seconds). */
  private _startTimerCheck(): void {
    if (this.timerHandle !== null) return;
    this.timerHandle = setInterval(() => void this._checkTimedQuestExpiry(), 30_000);
  }

  /** Check all active timed quests; expire any that have exceeded their time limit. */
  private async _checkTimedQuestExpiry(): Promise<void> {
    const now = Date.now();
    for (const [questId, quest] of this.questCache) {
      if (!quest.timeLimitMinutes) continue;

      const meta = this._getProgressMeta(questId);
      if (!meta?.startedAt) continue;

      const elapsed = (now - meta.startedAt) / 60_000; // minutes
      if (elapsed >= quest.timeLimitMinutes) {
        console.warn(`[QuestTriggerSystem] Timed quest expired: ${questId}`);
        this.bridge.emit("quest:expired", { questId, questTitle: quest.Title });
        // Remove from local caches (do not move to CompletedQuests — quest failed)
        this.activeObjectives.delete(questId);
        this.progressCache.delete(questId);
        this.questCache.delete(questId);
        // Remove from player's ActiveQuests in Firestore
        await this._removeExpiredQuestFromFirestore(questId);
      }
    }
  }

  /** Read the __meta entry from the progress cache for a quest. */
  private _getProgressMeta(questId: string): QuestProgressMeta | null {
    const raw = this.progressCache.get(questId)?.get("__meta");
    if (!raw) return null;
    // __meta is stored as a plain object compatible with QuestProgressMeta
    return raw as unknown as QuestProgressMeta;
  }

  /** Remove a failed timed quest from Firestore Player.ActiveQuests. */
  private async _removeExpiredQuestFromFirestore(questId: string): Promise<void> {
    if (!this.playerId) return;
    try {
      const { arrayRemove } = await import("firebase/firestore");
      const playerRef = doc(db, COLLECTIONS.PLAYER, this.playerId);
      await updateDoc(playerRef, { ActiveQuests: arrayRemove(questId) });
    } catch (err) {
      console.error(`[QuestTriggerSystem] Failed to remove expired quest ${questId}:`, err);
    }
  }

  // ============================================================================
  // SG4: Repeatable Quest Reset
  // ============================================================================

  /** Reset objectives for a repeatable quest that has already been completed today. */
  private async _resetRepeatableQuest(questId: string): Promise<void> {
    const objectives = this.activeObjectives.get(questId);
    if (!objectives) return;

    // Reset all objectives to zero
    for (const obj of objectives) {
      this.progressCache.get(questId)?.set(obj.id, { currentValue: 0, completed: false });
      await this._persistProgress(questId, obj.id, 0, false);
      this.bridge.emit("quest:objective:updated", {
        questId,
        objectiveId: obj.id,
        currentValue: 0,
        completed: false,
      } as QuestObjectiveUpdatedPayload);
    }

    // Store last reset date
    await this._persistMetaField(questId, "lastResetAt", todayKey());
    this.bridge.emit("quest:reset", { questId });
    console.log(`[QuestTriggerSystem] Repeatable quest reset: ${questId}`);
  }

  // ============================================================================
  // Data Loading
  // ============================================================================

  private async _loadActiveObjectives(): Promise<void> {
    if (!this.playerUsername) return;
    try {
      const player = await FirestoreQueries.getPlayerByUsername(this.playerUsername);
      if (!player) return;
      this.playerId = player.id;

      this.activeObjectives.clear();
      this.progressCache.clear();
      this.questCache.clear();

      for (const questId of player.ActiveQuests) {
        const questRef = doc(db, COLLECTIONS.QUEST, questId);
        const snap = await getDoc(questRef);
        if (!snap.exists()) continue;
        const quest = { id: snap.id, ...snap.data() } as Quest;
        this.questCache.set(questId, quest);
        if (quest.objectives && quest.objectives.length > 0) {
          this.activeObjectives.set(questId, quest.objectives);
        }
      }

      // Seed progress cache from Firestore Player.QuestProgress
      const raw = (player as any).QuestProgress as Record<string, Record<string, { currentValue: number; completed: boolean }>> | undefined;
      if (raw) {
        for (const [qId, objMap] of Object.entries(raw)) {
          const inner = new Map<string, QuestObjectiveProgress[string]>();
          for (const [oId, prog] of Object.entries(objMap)) {
            inner.set(oId, prog as QuestObjectiveProgress[string]);
          }
          this.progressCache.set(qId, inner);
        }
      }

      console.log(`[QuestTriggerSystem] Loaded ${this.activeObjectives.size} quests with objectives`);
    } catch (err) {
      console.error("[QuestTriggerSystem] Failed to load active objectives:", err);
    }
  }

  /**
   * Called when a new quest starts (SG1: record startedAt for timed quests).
   */
  private async _onQuestStarted(questId: string): Promise<void> {
    await this._loadActiveObjectives();

    const quest = this.questCache.get(questId);
    if (quest?.timeLimitMinutes) {
      const startedAt = Date.now();
      // Store __meta in progress cache so timer check can read it
      if (!this.progressCache.has(questId)) {
        this.progressCache.set(questId, new Map());
      }
      this.progressCache.get(questId)!.set("__meta", { currentValue: startedAt, completed: false } as any);
      await this._persistMetaField(questId, "startedAt", startedAt);
      console.log(`[QuestTriggerSystem] Timed quest started: ${questId}, limit: ${quest.timeLimitMinutes}m`);
    }
  }

  // ============================================================================
  // Handlers
  // ============================================================================

  private async _handleNpcTalked({ npcId }: NpcTalkedPayload): Promise<void> {
    for (const [questId, objectives] of this.activeObjectives) {
      for (const obj of objectives) {
        if (obj.type === "npc_talk" && obj.npcId === npcId) {
          await this._evaluateObjective(questId, obj, 1);
        }
      }
    }
  }

  private async _handleZoneEntered({ zoneId }: ZoneEnteredPayload): Promise<void> {
    for (const [questId, objectives] of this.activeObjectives) {
      for (const obj of objectives) {
        if (obj.type === "location" && obj.zoneId === zoneId) {
          await this._evaluateObjective(questId, obj, 1);
        }
      }
    }
  }

  private async _handleQuizCompleted(payload: QuizCompletedPayload): Promise<void> {
    for (const [questId, objectives] of this.activeObjectives) {
      for (const obj of objectives) {
        if (obj.type === "quiz_complete") {
          await this._evaluateObjective(questId, obj, payload.quizzesCompleted);
        } else if (obj.type === "quiz_streak") {
          await this._evaluateObjective(questId, obj, payload.streakDays);
        } else if (obj.type === "stat_threshold") {
          await this._evaluateObjective(questId, obj, payload.totalPoints);
        }
      }
    }
  }

  // ============================================================================
  // Core Evaluation
  // ============================================================================

  /**
   * Evaluate a single objective with the new value.
   * Writes to Firestore and emits quest:objective:updated.
   * If all objectives for the quest are complete, calls GameState.completeQuest.
   */
  private async _evaluateObjective(
    questId: string,
    objective: QuestObjective,
    newValue: number,
  ): Promise<void> {
    // Idempotency: skip already-completed objectives
    const cached = this.progressCache.get(questId)?.get(objective.id);
    if (cached?.completed) return;

    const requiredValue = objective.requiredValue ?? 1;
    const completed = newValue >= requiredValue;
    const currentValue = Math.min(newValue, requiredValue);

    // Update in-memory cache
    if (!this.progressCache.has(questId)) {
      this.progressCache.set(questId, new Map());
    }
    this.progressCache.get(questId)!.set(objective.id, { currentValue, completed });

    // Persist to Firestore
    await this._persistProgress(questId, objective.id, currentValue, completed);

    // Emit UI update event
    const eventPayload: QuestObjectiveUpdatedPayload = {
      questId,
      objectiveId: objective.id,
      currentValue,
      completed,
    };
    this.bridge.emit("quest:objective:updated", eventPayload);

    console.log(
      `[QuestTriggerSystem] Objective "${objective.id}" for quest "${questId}": ${currentValue}/${requiredValue} (${completed ? "DONE" : "in progress"})`,
    );

    // Check if all objectives for this quest are now complete
    if (completed) {
      await this._checkQuestCompletion(questId);
    }
  }

  private async _checkQuestCompletion(questId: string): Promise<void> {
    const objectives = this.activeObjectives.get(questId);
    if (!objectives) return;

    const allDone = objectives.every((obj) => {
      return this.progressCache.get(questId)?.get(obj.id)?.completed === true;
    });

    if (!allDone) return;

    const quest = this.questCache.get(questId);

    // SG4: Repeatable quests — reset objectives instead of completing permanently
    if (quest?.repeatable) {
      const meta = this._getProgressMeta(questId);
      const lastReset = meta?.lastResetAt;
      const today = todayKey();

      if (lastReset === today) {
        console.log(`[QuestTriggerSystem] Repeatable quest already reset today: ${questId}`);
        return;
      }
      await this._resetRepeatableQuest(questId);
      return;
    }

    console.log(`[QuestTriggerSystem] All objectives complete — completing quest: ${questId}`);
    await this.gameState.completeQuest(questId);
    this.activeObjectives.delete(questId);
    this.progressCache.delete(questId);
    this.questCache.delete(questId);
  }

  // ============================================================================
  // Firestore Persistence
  // ============================================================================

  private async _persistProgress(
    questId: string,
    objectiveId: string,
    currentValue: number,
    completed: boolean,
  ): Promise<void> {
    if (!this.playerId) return;
    try {
      const playerRef = doc(db, COLLECTIONS.PLAYER, this.playerId);
      await updateDoc(playerRef, {
        [`QuestProgress.${questId}.${objectiveId}`]: { currentValue, completed },
      });
    } catch (err) {
      console.error(
        `[QuestTriggerSystem] Failed to persist progress for ${questId}/${objectiveId}:`,
        err,
      );
    }
  }

  /**
   * SG1/SG4: Persist a single metadata field under QuestProgress[questId].__meta.
   * Uses Firestore dot-notation to avoid overwriting objective progress.
   */
  private async _persistMetaField(
    questId: string,
    field: string,
    value: number | string,
  ): Promise<void> {
    if (!this.playerId) return;
    try {
      const playerRef = doc(db, COLLECTIONS.PLAYER, this.playerId);
      await updateDoc(playerRef, {
        [`QuestProgress.${questId}.__meta.${field}`]: value,
      });
    } catch (err) {
      console.error(
        `[QuestTriggerSystem] Failed to persist meta field ${field} for quest ${questId}:`,
        err,
      );
    }
  }

  // ============================================================================
  // SG3: Group / Social Objective Stubs
  // ============================================================================

  /**
   * Evaluates a group_all objective by checking whether enough group members
   * have satisfied the sub-objective. Currently stubbed: logs intent and
   * resolves immediately. Full implementation requires a Firestore Group
   * collection and per-member progress querying.
   *
   * @param questId - Quest being evaluated
   * @param objective - The group_all objective
   */
  private async _handleGroupObjective(
    questId: string,
    objective: QuestObjective,
  ): Promise<void> {
    const requiredSize = objective.requiredGroupSize ?? 2;
    console.log(
      `[QuestTriggerSystem] [SG3-stub] Group objective "${objective.id}" for quest "${questId}" — requires ${requiredSize} members. Full group sync not yet implemented.`,
    );
    // TODO (SG3 full implementation):
    // 1. Fetch the player's groupId from Firestore
    // 2. Query all Player documents where groupId matches
    // 3. Count how many members have completed the groupSubType objective
    // 4. If count >= requiredGroupSize, call _evaluateObjective with a value that satisfies it
    void questId;
    void objective;
  }
}

