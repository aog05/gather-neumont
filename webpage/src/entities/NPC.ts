import Phaser from "phaser";
import type { NPCConfig } from "../types/npc.types";
import { GameEventBridge } from "../systems/GameEventBridge";
import { firestoreDialogueService } from "../services/FirestoreDialogueService";

/**
 * NPC - Individual Non-Player Character entity
 *
 * Extends Phaser.GameObjects.Container to group sprite, name label, and interaction prompt.
 * Supports dual-mode rendering: placeholder rectangles or actual sprites.
 *
 * @example
 * ```typescript
 * const npc = new NPC(scene, npcConfig);
 * scene.add.existing(npc);
 * npc.update(player); // Call each frame
 * ```
 */
export class NPC extends Phaser.GameObjects.Container {
  /** NPC configuration data */
  public readonly config: NPCConfig;

  /** Main sprite or placeholder rectangle */
  private sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Rectangle;

  /** Name label displayed above NPC */
  private nameLabel: Phaser.GameObjects.Text;

  /** Interaction prompt container ("Press E to talk") */
  private interactionPrompt: Phaser.GameObjects.Container | null = null;

  /** Interaction zone (circular radius) */
  private interactionZone: Phaser.Geom.Circle;

  /** Is the player currently within interaction range? */
  public isPlayerNearby: boolean = false;

  /** Is this NPC currently in a dialogue? */
  private isInteracting: boolean = false;

  /** Actual NPC name from Firebase dialogue (overrides config.name) */
  private actualName: string | null = null;

  constructor(scene: Phaser.Scene, config: NPCConfig) {
    super(scene, config.position.x, config.position.y);
    this.config = config;

    // Debug: Log NPC name
    console.log(`Creating NPC: ${config.name} (ID: ${config.id})`);

    // Create sprite or placeholder
    this.sprite = this.createSprite();
    this.add(this.sprite);

    // Create name label (initially hidden, will be updated with Firebase name)
    this.nameLabel = this.createNameLabel();
    this.add(this.nameLabel);

    // Set up interaction zone
    this.interactionZone = new Phaser.Geom.Circle(
      0,
      0,
      config.interaction.radius,
    );

    // Set depth for rendering order
    this.setDepth(1);

    // Load actual name from Firebase dialogue
    this.loadNameFromDialogue();

    // Listen for dialogue:end event to reset interaction state
    const bridge = GameEventBridge.getInstance();
    bridge.on("dialogue:end", () => {
      this.endDialogue();
    });
  }

  /**
   * Update NPC state based on player position
   * Call this every frame from NPCManager
   * @param player - The player game object
   */
  public update(player: Phaser.GameObjects.GameObject): void {
    if (!player || !player.body) {
      return;
    }

    // Get player position
    const playerX = (player.body as Phaser.Physics.Arcade.Body).x;
    const playerY = (player.body as Phaser.Physics.Arcade.Body).y;

    // Check if player is within interaction radius
    const distance = Phaser.Math.Distance.Between(
      this.x,
      this.y,
      playerX,
      playerY,
    );

    const wasNearby = this.isPlayerNearby;
    this.isPlayerNearby = distance <= this.config.interaction.radius;

    // Show/hide interaction elements based on proximity
    if (this.isPlayerNearby && !wasNearby) {
      this.showInteractionPrompt();
      this.nameLabel.setAlpha(1);
    } else if (!this.isPlayerNearby && wasNearby) {
      this.hideInteractionPrompt();
      this.nameLabel.setAlpha(0);
    }
  }

  /**
   * Display interaction prompt above NPC
   */
  public showInteractionPrompt(): void {
    if (this.interactionPrompt || this.isInteracting) {
      return;
    }

    // Create prompt container
    this.interactionPrompt = this.scene.add.container(0, -60);

    // Create background for prompt
    const bg = this.scene.add.rectangle(0, 0, 140, 30, 0x000000, 0.7);
    this.interactionPrompt.add(bg);

    // Create prompt text
    const text = this.scene.add.text(0, 0, this.config.interaction.prompt, {
      fontSize: "14px",
      color: "#ffffff",
      fontFamily: "Arial",
    });
    text.setOrigin(0.5, 0.5);
    this.interactionPrompt.add(text);

    // Add to this container
    this.add(this.interactionPrompt);

    // Add bounce animation
    this.scene.tweens.add({
      targets: this.interactionPrompt,
      y: -70,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  /**
   * Hide interaction prompt
   */
  public hideInteractionPrompt(): void {
    if (this.interactionPrompt) {
      this.scene.tweens.killTweensOf(this.interactionPrompt);
      this.interactionPrompt.destroy();
      this.interactionPrompt = null;
    }
  }

  /**
   * Start dialogue with this NPC
   * Emits event to GameEventBridge
   */
  public startDialogue(): void {
    if (this.isInteracting) {
      return;
    }

    this.isInteracting = true;
    this.hideInteractionPrompt();

    // Play talk animation if available
    if (
      this.sprite instanceof Phaser.GameObjects.Sprite &&
      this.config.sprite.animations?.talk
    ) {
      this.sprite.play(this.config.sprite.animations.talk);
    }

    // Emit dialogue:request event to trigger DialogueManager
    const bridge = GameEventBridge.getInstance();
    bridge.emit("dialogue:request", {
      npcId: this.config.id,
      treeId: this.config.dialogue.treeId,
      startNode: this.config.dialogue.defaultNode,
    });
  }

  /**
   * End dialogue with this NPC
   */
  public endDialogue(): void {
    this.isInteracting = false;

    // Play idle animation if available
    if (
      this.sprite instanceof Phaser.GameObjects.Sprite &&
      this.config.sprite.animations?.idle
    ) {
      this.sprite.play(this.config.sprite.animations.idle);
    }
  }

  /**
   * Create sprite or placeholder based on asset availability
   * @returns Sprite or Rectangle game object
   */
  private createSprite():
    | Phaser.GameObjects.Sprite
    | Phaser.GameObjects.Rectangle {
    const { key, tint, scale, frame } = this.config.sprite;

    // Check if this is placeholder mode or if sprite doesn't exist
    if (key === "_placeholder" || !this.scene.textures.exists(key)) {
      // Create colored rectangle placeholder
      const rect = this.scene.add.rectangle(
        0,
        0,
        40,
        60,
        tint ?? 0xffffff,
      );
      return rect;
    } else {
      // Create actual sprite
      const sprite = this.scene.add.sprite(0, 0, key, frame);
      if (scale) {
        sprite.setScale(scale);
      }

      // Set up animations if defined
      if (this.config.sprite.animations?.idle) {
        sprite.play(this.config.sprite.animations.idle);
      }

      return sprite;
    }
  }

  /**
   * Create name label text
   * @returns Text game object
   */
  private createNameLabel(): Phaser.GameObjects.Text {
    // Debug: Verify name is being used
    console.log(`Creating name label for: ${this.config.name}`);

    // Use actualName if available, otherwise use config.name as fallback
    const displayName = this.actualName || this.config.name;

    const text = this.scene.add.text(0, -40, displayName, {
      fontSize: "14px",
      color: "#FFDD00",
      fontFamily: "'DIN 2014', 'Arial Narrow', 'Arial', sans-serif",
      backgroundColor: "#1F1F1F",
      padding: { x: 6, y: 3 },
    });
    text.setOrigin(0.5, 0.5);
    text.setAlpha(0); // Initially hidden
    text.setDepth(10); // Ensure it renders above other elements
    return text;
  }

  /**
   * Load NPC name from Firebase dialogue tree
   * Fetches the dialogue tree and extracts the speaker name from the first node
   */
  private async loadNameFromDialogue(): Promise<void> {
    try {
      console.log(`[NPC ${this.config.id}] Loading name from dialogue tree: ${this.config.dialogue.treeId}`);

      // Load the dialogue tree from Firebase
      const tree = await firestoreDialogueService.loadDialogueTree(this.config.dialogue.treeId);

      // Get the first node (root node) to extract speaker name
      const rootNode = tree.nodes[this.config.dialogue.defaultNode];

      if (rootNode && rootNode.speaker) {
        this.actualName = rootNode.speaker;
        console.log(`[NPC ${this.config.id}] Loaded name from Firebase: "${this.actualName}"`);

        // Update the name label text
        this.nameLabel.setText(this.actualName);
      } else {
        console.warn(`[NPC ${this.config.id}] No speaker name found in dialogue tree, using config name: "${this.config.name}"`);
        this.actualName = this.config.name;
      }
    } catch (error) {
      console.error(`[NPC ${this.config.id}] Failed to load name from dialogue:`, error);
      // Fallback to config name
      this.actualName = this.config.name;
    }
  }

  /**
   * Clean up resources
   */
  override destroy(fromScene?: boolean): void {
    this.hideInteractionPrompt();
    super.destroy(fromScene);
  }
}
