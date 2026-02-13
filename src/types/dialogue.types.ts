/**
 * Type definitions for dialogue tree system
 *
 * These interfaces define the structure for branching dialogue trees,
 * including dialogue nodes, player responses, conditions, and actions.
 */

/**
 * Complete dialogue tree for an NPC conversation
 */
export interface DialogueTree {
  /** Unique tree identifier (e.g., "prof_smith_intro") */
  id: string;

  /** Associated NPC ID */
  npcId: string;

  /** Optional conversation title */
  title?: string;

  /** Map of node ID to dialogue node */
  nodes: {
    [nodeId: string]: DialogueNode;
  };
}

/**
 * Individual node in a dialogue tree
 */
export interface DialogueNode {
  /** Node identifier */
  id: string;

  /** Node type determines behavior */
  type: 'dialogue' | 'choice' | 'end';

  /** Who is speaking (typically the NPC name) */
  speaker: string;

  /** Dialogue text to display */
  text: string;

  /** Optional avatar sprite key */
  avatar?: string;

  /** Player response options (for 'choice' type) */
  responses?: DialogueResponse[];

  /** Next node ID for auto-advance (for 'dialogue' type) */
  next?: string;

  /** Actions to trigger when this node is displayed */
  actions?: DialogueAction[];

  /** Conditions required to show this node */
  conditions?: DialogueCondition[];
}

/**
 * Player response option in a choice node
 */
export interface DialogueResponse {
  /** Response identifier */
  id: string;

  /** Response text shown to player */
  text: string;

  /** Next node ID to jump to when selected */
  next: string;

  /** Optional requirements to show this response */
  requirements?: DialogueCondition[];
}

/**
 * Action to execute when a dialogue node is reached
 */
export interface DialogueAction {
  /** Type of action to perform */
  type: 'quest' | 'item' | 'flag' | 'custom';

  /** Action-specific data */
  data: {
    [key: string]: any;
  };
}

/**
 * Condition that must be met to show a node or response
 */
export interface DialogueCondition {
  /** Type of condition to check */
  type: 'flag' | 'quest' | 'item' | 'custom';

  /** What to check (e.g., flag name, quest ID) */
  check: string;

  /** Expected value */
  value: any;
}

/**
 * Current state of the dialogue system
 */
export interface DialogueState {
  /** Whether a dialogue is currently active */
  isActive: boolean;

  /** Current NPC being talked to */
  currentNpcId: string | null;

  /** Current dialogue tree ID */
  currentTreeId: string | null;

  /** Current node ID within the tree */
  currentNodeId: string | null;

  /** History of visited node IDs in current conversation */
  history: string[];
}
