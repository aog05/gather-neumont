import Phaser from "phaser";
import { NPC } from "./NPC";
import type { NPCConfig } from "../types/npc.types";

/**
 * NPCManager - Manages lifecycle of all NPCs in the current scene
 *
 * Handles loading NPCs from JSON, creating instances, updating proximity checks,
 * and managing player interaction.
 *
 * @example
 * ```typescript
 * // In MainScene.create()
 * this.npcManager = new NPCManager(this);
 * await this.npcManager.loadNPCs(1); // Floor 1
 *
 * // In MainScene.update()
 * this.npcManager.update(this.player);
 * ```
 */
export class NPCManager {
  /** Reference to the Phaser scene */
  private scene: Phaser.Scene;

  /** Map of NPC ID to NPC instance */
  private npcs: Map<string, NPC>;

  /** Current floor number */
  private currentFloor: number = 0;

  /** Interaction key ('E' for talking to NPCs) */
  private interactionKey: Phaser.Input.Keyboard.Key | null = null;

  /** Currently nearest NPC within interaction range */
  private nearestNPC: NPC | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.npcs = new Map();

    // Set up interaction key
    if (scene.input.keyboard) {
      this.interactionKey = scene.input.keyboard.addKey(
        Phaser.Input.Keyboard.KeyCodes.E,
      );
    }
  }

  /**
   * Load NPCs for a specific floor from JSON
   * @param floor - Floor number (1-4)
   */
  public async loadNPCs(floor: number): Promise<void> {
    this.currentFloor = floor;

    try {
      // Fetch NPC configuration for this floor
      const response = await fetch(
        `/assets/data/npcs/floor${floor}-npcs.json`,
      );

      if (!response.ok) {
        console.warn(`No NPCs found for floor ${floor}`);
        return;
      }

      const npcConfigs: NPCConfig[] = await response.json();

      // Create each NPC
      for (const config of npcConfigs) {
        this.createNPC(config);
      }

      console.log(`Loaded ${npcConfigs.length} NPCs for floor ${floor}`);
    } catch (error) {
      console.error(`Failed to load NPCs for floor ${floor}:`, error);
    }
  }

  /**
   * Create an NPC instance from configuration
   * @param config - NPC configuration
   * @returns Created NPC instance
   */
  public createNPC(config: NPCConfig): NPC {
    // Check if NPC already exists
    if (this.npcs.has(config.id)) {
      console.warn(`NPC with id ${config.id} already exists`);
      return this.npcs.get(config.id)!;
    }

    // Create NPC
    const npc = new NPC(this.scene, config);

    // Add to scene
    this.scene.add.existing(npc);

    // Add physics body (static, so player collides with it)
    this.scene.physics.add.existing(npc, true);

    // Store in map
    this.npcs.set(config.id, npc);

    return npc;
  }

  /**
   * Get NPC by ID
   * @param id - NPC identifier
   * @returns NPC instance or null if not found
   */
  public getNPC(id: string): NPC | null {
    return this.npcs.get(id) ?? null;
  }

  /**
   * Update all NPCs - check proximity and handle interaction
   * Call this every frame from scene update()
   * @param player - The player game object
   */
  public update(player: Phaser.GameObjects.GameObject): void {
    if (!player) {
      return;
    }

    // Update each NPC and track nearest one in range
    this.checkPlayerProximity(player);

    // Handle interaction key press
    if (
      this.interactionKey &&
      Phaser.Input.Keyboard.JustDown(this.interactionKey)
    ) {
      if (this.nearestNPC && this.nearestNPC.isPlayerNearby) {
        this.nearestNPC.startDialogue();
      }
    }
  }

  /**
   * Check player proximity to all NPCs and update nearest
   * @param player - The player game object
   */
  private checkPlayerProximity(player: Phaser.GameObjects.GameObject): void {
    let closestNPC: NPC | null = null;
    let closestDistance = Infinity;

    // Get player position
    const playerX = (player.body as Phaser.Physics.Arcade.Body).x;
    const playerY = (player.body as Phaser.Physics.Arcade.Body).y;

    // Update each NPC
    for (const npc of this.npcs.values()) {
      npc.update(player);

      // Track nearest NPC within range
      if (npc.isPlayerNearby) {
        const distance = Phaser.Math.Distance.Between(
          npc.x,
          npc.y,
          playerX,
          playerY,
        );

        if (distance < closestDistance) {
          closestDistance = distance;
          closestNPC = npc;
        }
      }
    }

    // Update nearest NPC (for prioritizing interaction)
    this.nearestNPC = closestNPC;
  }

  /**
   * Destroy all NPCs and clean up
   * Call this when changing floors or scenes
   */
  public destroyAll(): void {
    for (const npc of this.npcs.values()) {
      npc.destroy();
    }
    this.npcs.clear();
    this.nearestNPC = null;
    this.currentFloor = 0;
  }

  /**
   * Get all NPC IDs currently managed
   * @returns Array of NPC IDs
   */
  public getAllNPCIds(): string[] {
    return Array.from(this.npcs.keys());
  }

  /**
   * Get count of active NPCs
   * @returns Number of NPCs
   */
  public getCount(): number {
    return this.npcs.size;
  }
}
