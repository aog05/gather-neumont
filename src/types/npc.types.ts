/**
 * Type definitions for NPC (Non-Player Character) system
 *
 * These interfaces define the structure for NPC configuration,
 * including positioning, sprites, interaction zones, and dialogue references.
 */

/**
 * Complete configuration for an NPC
 */
export interface NPCConfig {
  /** Unique identifier (e.g., "prof_smith") */
  id: string;

  /** Display name (e.g., "Professor Smith") */
  name: string;

  /** Title/role (e.g., "CS Professor", "Admissions Staff") */
  role: string;

  /** Floor number (1-4) */
  floor: number;

  /** World position coordinates */
  position: {
    /** X coordinate in game world */
    x: number;
    /** Y coordinate in game world */
    y: number;
  };

  /** Sprite configuration */
  sprite: {
    /** Sprite asset key or "_placeholder" for colored rectangle */
    key: string;
    /** Optional starting frame for animated sprites */
    frame?: number;
    /** Sprite scale (default: 1) */
    scale?: number;
    /** Tint color for placeholder mode (hex color number, e.g., 0xff5555) */
    tint?: number;
    /** Animation configurations */
    animations?: {
      /** Idle animation key */
      idle?: string;
      /** Talking animation key */
      talk?: string;
    };
  };

  /** Interaction configuration */
  interaction: {
    /** Interaction distance in pixels */
    radius: number;
    /** Interaction prompt text (e.g., "Press E to talk") */
    prompt: string;
    /** Optional interaction icon sprite key */
    icon?: string;
  };

  /** Dialogue tree reference */
  dialogue: {
    /** Reference to dialogue tree ID */
    treeId: string;
    /** Starting dialogue node ID (typically "start") */
    defaultNode: string;
  };

  /** Optional metadata for NPC information */
  metadata?: {
    /** Department affiliation */
    department?: string;
    /** Office location */
    office?: string;
    /** Availability schedule */
    availability?: string;
    /** Biography or description */
    bio?: string;
  };
}

/**
 * Master registry of all NPCs in the game
 * Used for quick lookup and organization
 */
export interface NPCRegistry {
  /** Registry version for compatibility */
  version: string;

  /** Description of this registry */
  description?: string;

  /** Map of NPC ID to registry entry */
  npcs: {
    [id: string]: {
      /** Display name */
      name: string;
      /** Floor number */
      floor: number;
      /** File containing this NPC's configuration */
      file: string;
    };
  };
}
