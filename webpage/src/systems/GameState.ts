import { GameEventBridge } from "./GameEventBridge";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { db, COLLECTIONS } from "../lib/firebase";

/**
 * GameState - Global game state management with quest integration
 *
 * Provides interfaces for quest, item, and flag systems. Quest system now
 * integrates with Firebase to update player's active quests in real-time.
 *
 * @example
 * ```typescript
 * const gameState = new GameState();
 *
 * // Flag system (fully functional)
 * gameState.setFlag('met_professor', true);
 * if (gameState.checkFlag('met_professor')) {
 *   // Show different dialogue
 * }
 *
 * // Quest system (integrated with Firebase)
 * gameState.startQuest('quest_id'); // Adds to Firebase ActiveQuests
 * ```
 */
export class GameState {
  /** Persistent game flags for dialogue branching */
  private flags: Map<string, boolean>;

  /** Track which NPCs have been visited */
  private visitedNPCs: Set<string>;

  /** Event bridge for emitting quest updates */
  private bridge: GameEventBridge;

  /** Current player username (set from Game.tsx) */
  private playerUsername: string | null = null;

  constructor() {
    this.flags = new Map();
    this.visitedNPCs = new Set();
    this.bridge = GameEventBridge.getInstance();
  }

  /**
   * Set the current player username for quest operations
   * @param username - Player username (e.g., "sarah_dev")
   */
  public setPlayerUsername(username: string): void {
    this.playerUsername = username;
    console.log(`[GameState] Player username set: ${username}`);
  }

  // ============================================================================
  // Flag System (Fully Functional)
  // ============================================================================

  /**
   * Check if a flag is set to true
   * @param flag - Flag name to check
   * @returns True if flag is set, false otherwise
   */
  public checkFlag(flag: string): boolean {
    return this.flags.get(flag) ?? false;
  }

  /**
   * Set a flag value
   * @param flag - Flag name to set
   * @param value - Value to set (default: true)
   */
  public setFlag(flag: string, value: boolean = true): void {
    this.flags.set(flag, value);
    // TODO: Persist to localStorage or database when implemented
  }

  /**
   * Clear a flag (remove it entirely)
   * @param flag - Flag name to clear
   */
  public clearFlag(flag: string): void {
    this.flags.delete(flag);
  }

  /**
   * Get all flags (for debugging or save/load)
   * @returns Map of all flags
   */
  public getAllFlags(): Map<string, boolean> {
    return new Map(this.flags);
  }

  // ============================================================================
  // Quest System (Stubbed for MVP)
  // ============================================================================

  /**
   * Check quest status (STUBBED - always returns true for MVP)
   * @param questId - Quest identifier
   * @param status - Expected status ('active', 'completed', etc.)
   * @returns Always true in MVP
   */
  public checkQuest(questId: string, status: string): boolean {
    console.warn(`[MVP Stub] Quest check: ${questId} === ${status} → returning true`);
    return true; // All quest checks pass in MVP
  }

  /**
   * Start a quest - Adds quest to player's ActiveQuests in Firebase
   * @param questId - Quest identifier (Firestore document ID)
   * @param data - Quest initialization data
   */
  public async startQuest(questId: string, data?: any): Promise<void> {
    console.log(`[GameState] Starting quest: ${questId}`, data);

    if (!this.playerUsername) {
      console.error(`[GameState] Cannot start quest: No player username set`);
      return;
    }

    try {
      // Get player by username
      const { FirestoreQueries } = await import("../lib/firestore-helpers");
      const player = await FirestoreQueries.getPlayerByUsername(this.playerUsername);

      if (!player) {
        console.error(`[GameState] Player not found: ${this.playerUsername}`);
        return;
      }

      // Check if quest is already active
      if (player.ActiveQuests.includes(questId)) {
        console.warn(`[GameState] Quest already active: ${questId}`);
        return;
      }

      // Add quest to ActiveQuests array in Firebase
      const playerRef = doc(db, COLLECTIONS.PLAYER, player.id);
      await updateDoc(playerRef, {
        ActiveQuests: arrayUnion(questId)
      });

      console.log(`[GameState] ✅ Quest added to Firebase: ${questId}`);

      // Emit event to notify UI to refresh quest data
      this.bridge.emit("quest:started", { questId });
    } catch (error) {
      console.error(`[GameState] Error starting quest:`, error);
    }
  }

  /**
   * Complete a quest - Moves quest from ActiveQuests to CompletedQuests in Firebase
   * Awards points to player's Wallet
   * @param questId - Quest identifier (Firestore document ID)
   * @param data - Quest completion data
   */
  public async completeQuest(questId: string, data?: any): Promise<void> {
    console.log(`[GameState] Completing quest: ${questId}`, data);

    if (!this.playerUsername) {
      console.error(`[GameState] Cannot complete quest: No player username set`);
      return;
    }

    try {
      // Get player by username
      const { FirestoreQueries } = await import("../lib/firestore-helpers");
      const { arrayRemove, getDoc } = await import("firebase/firestore");
      const player = await FirestoreQueries.getPlayerByUsername(this.playerUsername);

      if (!player) {
        console.error(`[GameState] Player not found: ${this.playerUsername}`);
        return;
      }

      // Check if quest is in active quests
      if (!player.ActiveQuests.includes(questId)) {
        console.warn(`[GameState] Quest not in active quests: ${questId}`);
        return;
      }

      // Fetch quest data to get reward points
      const questRef = doc(db, COLLECTIONS.QUEST, questId);
      const questSnap = await getDoc(questRef);

      if (!questSnap.exists()) {
        console.error(`[GameState] Quest not found: ${questId}`);
        return;
      }

      const questData = questSnap.data();
      const rewardPoints = questData.Reward?.Points || 0;

      console.log(`[GameState] Quest reward: ${rewardPoints} points`);

      // Calculate new wallet value (Wallet is stored as string)
      const currentPoints = parseInt(player.Wallet, 10) || 0;
      const newPoints = currentPoints + rewardPoints;

      console.log(`[GameState] Current points: ${currentPoints}, Adding: ${rewardPoints}, New total: ${newPoints}`);

      // Remove from ActiveQuests, add to CompletedQuests, and award points
      const playerRef = doc(db, COLLECTIONS.PLAYER, player.id);
      await updateDoc(playerRef, {
        ActiveQuests: arrayRemove(questId),
        CompletedQuests: arrayUnion(questId),
        Wallet: newPoints.toString() // Update wallet with new total (stored as string)
      });

      console.log(`[GameState] ✅ Quest completed in Firebase: ${questId}`);
      console.log(`[GameState] ✅ Awarded ${rewardPoints} points to player (${currentPoints} → ${newPoints})`);

      // Emit event to notify UI to refresh quest data
      this.bridge.emit("quest:completed", {
        questId,
        rewardPoints,
        questTitle: questData.Title
      });
    } catch (error) {
      console.error(`[GameState] Error completing quest:`, error);
    }
  }

  // ============================================================================
  // Item/Inventory System (Stubbed for MVP)
  // ============================================================================

  /**
   * Check if player has an item (STUBBED - always returns true for MVP)
   * @param itemId - Item identifier
   * @param quantity - Required quantity (default: 1)
   * @returns Always true in MVP
   */
  public checkItem(itemId: string, quantity: number = 1): boolean {
    console.warn(`[MVP Stub] Item check: ${itemId} x${quantity} → returning true`);
    return true; // All item checks pass in MVP
  }

  /**
   * Grant an item to the player (STUBBED - logs only for MVP)
   * @param itemId - Item identifier
   * @param quantity - Quantity to grant (default: 1)
   */
  public grantItem(itemId: string, quantity: number = 1): void {
    console.warn(`[MVP Stub] Grant item: ${itemId} x${quantity}`);
    // TODO: Integrate with inventory system when implemented
  }

  /**
   * Remove an item from the player (STUBBED - logs only for MVP)
   * @param itemId - Item identifier
   * @param quantity - Quantity to remove (default: 1)
   */
  public removeItem(itemId: string, quantity: number = 1): void {
    console.warn(`[MVP Stub] Remove item: ${itemId} x${quantity}`);
    // TODO: Integrate with inventory system when implemented
  }

  // ============================================================================
  // NPC Visit Tracking (Fully Functional)
  // ============================================================================

  /**
   * Check if player has talked to an NPC before
   * @param npcId - NPC identifier
   * @returns True if visited, false otherwise
   */
  public hasVisitedNPC(npcId: string): boolean {
    return this.visitedNPCs.has(npcId);
  }

  /**
   * Mark an NPC as visited
   * @param npcId - NPC identifier
   */
  public markNPCVisited(npcId: string): void {
    this.visitedNPCs.add(npcId);
  }

  /**
   * Get all visited NPC IDs (for save/load)
   * @returns Set of visited NPC IDs
   */
  public getVisitedNPCs(): Set<string> {
    return new Set(this.visitedNPCs);
  }

  // ============================================================================
  // Save/Load (For Future Persistence)
  // ============================================================================

  /**
   * Serialize game state to JSON (for save system)
   * @returns Serialized state object
   */
  public serialize(): any {
    return {
      flags: Array.from(this.flags.entries()),
      visitedNPCs: Array.from(this.visitedNPCs),
    };
  }

  /**
   * Load game state from JSON (for save system)
   * @param data - Serialized state object
   */
  public deserialize(data: any): void {
    if (data.flags) {
      this.flags = new Map(data.flags);
    }
    if (data.visitedNPCs) {
      this.visitedNPCs = new Set(data.visitedNPCs);
    }
  }
}
