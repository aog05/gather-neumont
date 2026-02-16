import Phaser from "phaser";

/**
 * QuizTerminal - Interactive terminal for daily quiz
 * 
 * Follows the same pattern as NPC entities with proximity detection
 * and E key interaction.
 * 
 * @example
 * ```typescript
 * const terminal = new QuizTerminal(scene, x, y);
 * scene.add.existing(terminal);
 * terminal.update(player); // Call each frame
 * ```
 */
export class QuizTerminal extends Phaser.GameObjects.Container {
  /** Terminal sprite/rectangle */
  private sprite: Phaser.GameObjects.Rectangle;

  /** Interaction prompt ("Press E to start quiz") */
  private interactionPrompt: Phaser.GameObjects.Container | null = null;

  /** Interaction zone (circular radius) */
  private interactionZone: Phaser.Geom.Circle;

  /** Is the player currently within interaction range? */
  public isPlayerNearby: boolean = false;

  /** Interaction radius */
  private readonly INTERACTION_RADIUS = 90;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    console.log(`Creating QuizTerminal at (${x}, ${y})`);

    // Create purple terminal sprite
    this.sprite = scene.add.rectangle(
      0,
      0,
      78,
      62,
      0x7c3aed, // Purple color
    );
    this.add(this.sprite);

    // Set up interaction zone
    this.interactionZone = new Phaser.Geom.Circle(
      0,
      0,
      this.INTERACTION_RADIUS,
    );

    // Set depth for rendering order
    this.setDepth(1);
  }

  /**
   * Update terminal state based on player position
   * Call this every frame
   * @param player - The player game object
   */
  public update(player: Phaser.GameObjects.GameObject): void {
    if (!player || !player.body) {
      return;
    }

    // Get player position (use center of body, same as NPC)
    const playerBody = player.body as Phaser.Physics.Arcade.Body;
    const playerX = playerBody.x + playerBody.halfWidth;
    const playerY = playerBody.y + playerBody.halfHeight;

    // Check if player is within interaction radius
    const distance = Phaser.Math.Distance.Between(
      this.x,
      this.y,
      playerX,
      playerY,
    );

    const wasNearby = this.isPlayerNearby;
    this.isPlayerNearby = distance <= this.INTERACTION_RADIUS;

    // Debug logging for proximity detection
    if (this.isPlayerNearby && !wasNearby) {
      console.log(`[QuizTerminal] 📍 Player entered interaction zone`);
      console.log(`[QuizTerminal] Distance: ${distance.toFixed(2)}px (max: ${this.INTERACTION_RADIUS}px)`);
      console.log(`[QuizTerminal] Terminal: (${this.x}, ${this.y}), Player: (${playerX.toFixed(2)}, ${playerY.toFixed(2)})`);
    }

    // Show/hide interaction prompt based on proximity
    if (this.isPlayerNearby && !wasNearby) {
      this.showInteractionPrompt();
    } else if (!this.isPlayerNearby && wasNearby) {
      console.log(`[QuizTerminal] 📍 Player left interaction zone`);
      this.hideInteractionPrompt();
    }
  }

  /**
   * Display interaction prompt above terminal
   */
  private showInteractionPrompt(): void {
    if (this.interactionPrompt) {
      return;
    }

    console.log(`[QuizTerminal] 💬 Showing interaction prompt`);

    // Create prompt container (same pattern as NPC)
    this.interactionPrompt = this.scene.add.container(0, -60);

    // Create background for prompt
    const bg = this.scene.add.rectangle(0, 0, 160, 30, 0x000000, 0.7);
    this.interactionPrompt.add(bg);

    // Create prompt text
    const text = this.scene.add.text(0, 0, "Press E to start quiz", {
      fontSize: "14px",
      color: "#ffffff",
      fontFamily: "Arial",
    });
    text.setOrigin(0.5, 0.5);
    this.interactionPrompt.add(text);

    // Add to container
    this.add(this.interactionPrompt);

    // Add bounce animation (same as NPC)
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
  private hideInteractionPrompt(): void {
    if (this.interactionPrompt) {
      console.log(`[QuizTerminal] 🚫 Hiding interaction prompt`);
      // Kill tweens before destroying (same as NPC)
      this.scene.tweens.killTweensOf(this.interactionPrompt);
      this.interactionPrompt.destroy();
      this.interactionPrompt = null;
    }
  }

  /**
   * Start the quiz
   * Dispatches window event to open quiz panel
   */
  public startQuiz(): void {
    console.log("[QuizTerminal] Starting daily quiz");
    window.dispatchEvent(new CustomEvent("dailyQuiz:start"));
  }

  /**
   * Clean up resources
   */
  override destroy(fromScene?: boolean): void {
    this.hideInteractionPrompt();
    super.destroy(fromScene);
  }
}

