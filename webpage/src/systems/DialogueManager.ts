import type {
  DialogueTree,
  DialogueNode,
  DialogueState,
  DialogueCondition,
  DialogueAction,
} from "../types/dialogue.types";
import { GameState } from "./GameState";
import { GameEventBridge } from "./GameEventBridge";
import { firestoreDialogueService } from "../services/FirestoreDialogueService";

/**
 * DialogueManager - Manages dialogue tree navigation and state
 *
 * Handles loading dialogue trees, navigating between nodes, evaluating
 * conditions, executing actions, and emitting events to the UI layer.
 *
 * @example
 * ```typescript
 * const gameState = new GameState();
 * const bridge = GameEventBridge.getInstance();
 * const dialogueManager = new DialogueManager(gameState, bridge);
 *
 * // Start a conversation
 * await dialogueManager.startDialogue('prof_smith_intro', 'start');
 *
 * // Player selects a response
 * dialogueManager.selectResponse('ask_classes');
 * ```
 */
export class DialogueManager {
  /** Loaded dialogue trees (cached) */
  private trees: Map<string, DialogueTree>;

  /** Currently active dialogue tree */
  private currentTree: DialogueTree | null = null;

  /** Currently active dialogue node */
  private currentNode: DialogueNode | null = null;

  /** Game state for condition/action evaluation */
  private gameState: GameState;

  /** Event bridge for Phaser-React communication */
  private bridge: GameEventBridge;

  /** Current dialogue state */
  public state: DialogueState;

  constructor(gameState: GameState, bridge: GameEventBridge) {
    this.gameState = gameState;
    this.bridge = bridge;
    this.trees = new Map();

    // Initialize state
    this.state = {
      isActive: false,
      currentNpcId: null,
      currentTreeId: null,
      currentNodeId: null,
      history: [],
    };

    // Listen for response events from UI
    this.bridge.on("dialogue:response", this.handleResponse.bind(this));
    this.bridge.on("dialogue:close", this.handleClose.bind(this));
  }

  /**
   * Load a dialogue tree from Firestore
   * @param treeId - Dialogue tree identifier (Firestore document ID)
   * @returns Promise that resolves when tree is loaded
   */
  public async loadTree(treeId: string): Promise<void> {
    // Check cache first
    if (this.trees.has(treeId)) {
      return;
    }

    try {
      // Load from Firestore using the dialogue service
      const tree = await firestoreDialogueService.loadDialogueTree(treeId);
      this.trees.set(treeId, tree);

      console.log(`Loaded dialogue tree from Firestore: ${treeId}`);
    } catch (error) {
      console.error(`Error loading dialogue tree ${treeId}:`, error);
      throw error;
    }
  }

  /**
   * Start a dialogue conversation
   * @param npcId - NPC identifier
   * @param treeId - Dialogue tree identifier
   * @param startNodeId - Starting node ID (default: 'start')
   */
  public async startDialogue(
    npcId: string,
    treeId: string,
    startNodeId: string = "start",
  ): Promise<void> {
    // Load tree if not cached
    if (!this.trees.has(treeId)) {
      await this.loadTree(treeId);
    }

    const tree = this.trees.get(treeId);
    if (!tree) {
      console.error(`Dialogue tree not found: ${treeId}`);
      return;
    }

    // Set current tree and node
    this.currentTree = tree;
    this.currentNode = tree.nodes[startNodeId];

    if (!this.currentNode) {
      console.error(`Start node not found: ${startNodeId}`);
      return;
    }

    // Update state
    this.state = {
      isActive: true,
      currentNpcId: npcId,
      currentTreeId: treeId,
      currentNodeId: startNodeId,
      history: [startNodeId],
    };

    // Mark NPC as visited
    this.gameState.markNPCVisited(npcId);

    // Evaluate node conditions
    if (
      this.currentNode.conditions &&
      !this.evaluateConditions(this.currentNode.conditions)
    ) {
      console.warn(`Node ${startNodeId} conditions not met, ending dialogue`);
      this.endDialogue();
      return;
    }

    // Execute node actions
    if (this.currentNode.actions) {
      this.executeActions(this.currentNode.actions);
    }

    // Emit dialogue:start event
    this.bridge.emit("dialogue:start", {
      npcId,
      node: this.currentNode,
    });

    console.log(`Started dialogue: ${treeId} at node ${startNodeId}`);
  }

  /**
   * Handle player response selection
   * @param data - Response data from UI
   */
  private handleResponse(data: { responseId: string }): void {
    if (!this.currentNode || !this.currentTree) {
      console.warn("No active dialogue to respond to");
      return;
    }

    // Handle auto-advance (dialogue type with next property)
    if (this.currentNode.type === "dialogue") {
      if (this.currentNode.next) {
        this.navigateToNode(this.currentNode.next);
      } else {
        // No next node - this is an end dialogue node
        console.log("Dialogue node has no next property, ending dialogue");
        this.endDialogue();
      }
      return;
    }

    // Handle response selection (choice type)
    if (this.currentNode.type === "choice" && this.currentNode.responses) {
      const response = this.currentNode.responses.find(
        (r) => r.id === data.responseId,
      );

      if (!response) {
        console.warn(`Response not found: ${data.responseId}`);
        return;
      }

      // Check response requirements
      if (
        response.requirements &&
        !this.evaluateConditions(response.requirements)
      ) {
        console.warn(`Response ${data.responseId} requirements not met`);
        return;
      }

      // Navigate to next node if it exists
      if (response.next) {
        this.navigateToNode(response.next);
      } else {
        // No next node - end dialogue
        console.log("Response has no next property, ending dialogue");
        this.endDialogue();
      }
      return;
    }

    // Handle end nodes
    if (this.currentNode.type === "end") {
      console.log("End node reached, closing dialogue");
      this.endDialogue();
      return;
    }

    // Fallback: if we reach here, something is wrong
    console.warn(`Unhandled node type or missing data: ${this.currentNode.type}`);
    this.endDialogue();
  }

  /**
   * Handle dialogue close event from UI
   */
  private handleClose(): void {
    this.endDialogue();
  }

  /**
   * Navigate to a specific node in the current tree
   * @param nodeId - Node identifier
   */
  private navigateToNode(nodeId: string | null | undefined): void {
    if (!this.currentTree) {
      console.error("No active dialogue tree");
      this.endDialogue();
      return;
    }

    // Handle null/undefined nodeId
    if (!nodeId) {
      console.warn("Attempted to navigate to null/undefined node, ending dialogue");
      this.endDialogue();
      return;
    }

    const node = this.currentTree.nodes[nodeId];

    if (!node) {
      console.error(`Node not found: ${nodeId} in tree ${this.state.currentTreeId}`);
      console.error(`Available nodes:`, Object.keys(this.currentTree.nodes));
      this.endDialogue();
      return;
    }

    // Check if this is an end node
    if (node.type === "end") {
      // Show end node text first
      this.currentNode = node;
      this.state.currentNodeId = nodeId;
      this.state.history.push(nodeId);

      // Execute end node actions
      if (node.actions) {
        this.executeActions(node.actions);
      }

      // Emit update to show end text
      this.bridge.emit("dialogue:update", { node });

      // End dialogue after a short delay
      setTimeout(() => {
        this.endDialogue();
      }, 100);

      return;
    }

    // Update current node
    this.currentNode = node;
    this.state.currentNodeId = nodeId;
    this.state.history.push(nodeId);

    // Evaluate conditions
    if (node.conditions && !this.evaluateConditions(node.conditions)) {
      console.warn(`Node ${nodeId} conditions not met, ending dialogue`);
      this.endDialogue();
      return;
    }

    // Execute actions
    if (node.actions) {
      this.executeActions(node.actions);
    }

    // Emit dialogue:update event
    this.bridge.emit("dialogue:update", { node });

    console.log(`Navigated to node: ${nodeId} (type: ${node.type})`);
  }

  /**
   * Select a response by ID
   * Public method for external calls
   * @param responseId - Response identifier
   */
  public selectResponse(responseId: string): void {
    this.handleResponse({ responseId });
  }

  /**
   * Get the current dialogue node
   * @returns Current node or null
   */
  public getCurrentNode(): DialogueNode | null {
    return this.currentNode;
  }

  /**
   * Evaluate an array of conditions
   * @param conditions - Conditions to evaluate
   * @returns True if all conditions pass, false otherwise
   */
  private evaluateConditions(conditions: DialogueCondition[]): boolean {
    for (const condition of conditions) {
      let passed = false;

      switch (condition.type) {
        case "flag":
          passed = this.gameState.checkFlag(condition.check) === condition.value;
          break;
        case "quest":
          passed = this.gameState.checkQuest(condition.check, condition.value);
          break;
        case "item":
          passed = this.gameState.checkItem(condition.check, condition.value);
          break;
        case "custom":
          // Custom conditions can be extended here
          console.warn(`Custom condition not implemented: ${condition.check}`);
          passed = true;
          break;
        default:
          console.warn(`Unknown condition type: ${condition.type}`);
          passed = true;
      }

      if (!passed) {
        console.log(`Condition failed: ${condition.type} ${condition.check}`);
        return false;
      }
    }

    return true;
  }

  /**
   * Execute an array of actions
   * @param actions - Actions to execute
   */
  private executeActions(actions: DialogueAction[]): void {
    for (const action of actions) {
      switch (action.type) {
        case "flag":
          if (action.data.flag) {
            this.gameState.setFlag(action.data.flag, action.data.value ?? true);
          }
          break;
        case "quest":
          if (action.data.questId && action.data.action === "start") {
            this.gameState.startQuest(action.data.questId, action.data);
          } else if (action.data.questId && action.data.action === "complete") {
            this.gameState.completeQuest(action.data.questId, action.data);
          }
          break;
        case "item":
          if (action.data.itemId && action.data.action === "grant") {
            this.gameState.grantItem(
              action.data.itemId,
              action.data.quantity ?? 1,
            );
          } else if (action.data.itemId && action.data.action === "remove") {
            this.gameState.removeItem(
              action.data.itemId,
              action.data.quantity ?? 1,
            );
          }
          break;
        case "custom":
          // Custom actions can be extended here
          console.warn(`Custom action not implemented:`, action.data);
          break;
        default:
          console.warn(`Unknown action type: ${action.type}`);
      }
    }
  }

  /**
   * End the current dialogue
   */
  public endDialogue(): void {
    if (!this.state.isActive) {
      return;
    }

    console.log(`Ending dialogue: ${this.state.currentTreeId}`);

    // Reset state
    this.state = {
      isActive: false,
      currentNpcId: null,
      currentTreeId: null,
      currentNodeId: null,
      history: [],
    };

    this.currentTree = null;
    this.currentNode = null;

    // Emit dialogue:end event
    this.bridge.emit("dialogue:end", {});
  }

  /**
   * Check if dialogue is currently active
   * @returns True if dialogue is active
   */
  public isActive(): boolean {
    return this.state.isActive;
  }

  /**
   * Get dialogue history (visited node IDs)
   * @returns Array of node IDs
   */
  public getHistory(): string[] {
    return [...this.state.history];
  }

  /**
   * Clean up and remove event listeners
   */
  public destroy(): void {
    this.bridge.off("dialogue:response", this.handleResponse.bind(this));
    this.bridge.off("dialogue:close", this.handleClose.bind(this));
  }
}
