import Phaser from "phaser";
import { QuizTerminal } from "./QuizTerminal";

/**
 * QuizTerminalManager - Manages quiz terminal interaction
 * 
 * Follows the same pattern as NPCManager for consistent interaction handling.
 * 
 * @example
 * ```typescript
 * // In MainScene.create()
 * this.quizTerminalManager = new QuizTerminalManager(this);
 * this.quizTerminalManager.createTerminal(x, y);
 * 
 * // In MainScene.update()
 * this.quizTerminalManager.update(this.player);
 * ```
 */
export class QuizTerminalManager {
  /** Reference to the Phaser scene */
  private scene: Phaser.Scene;

  /** Quiz terminal instance */
  private terminal: QuizTerminal | null = null;

  /** Interaction key ('E' for starting quiz) - shared with NPCManager */
  private interactionKey: Phaser.Input.Keyboard.Key;

  constructor(scene: Phaser.Scene, interactionKey: Phaser.Input.Keyboard.Key) {
    this.scene = scene;
    this.interactionKey = interactionKey;
    console.log(`[QuizTerminalManager] Using shared E key for interaction`);
  }

  /**
   * Create the quiz terminal at specified position
   * @param x - X coordinate
   * @param y - Y coordinate
   */
  public createTerminal(x: number, y: number): QuizTerminal {
    if (this.terminal) {
      console.warn("Quiz terminal already exists");
      return this.terminal;
    }

    // Create terminal
    this.terminal = new QuizTerminal(this.scene, x, y);

    // Add to scene
    this.scene.add.existing(this.terminal);

    // Add physics body (static, so player collides with it)
    this.scene.physics.add.existing(this.terminal, true);

    console.log(`Created quiz terminal at (${x}, ${y})`);

    return this.terminal;
  }

  /**
   * Update quiz terminal - check proximity and handle interaction
   * Call this every frame from scene update()
   * @param player - The player game object
   */
  public update(player: Phaser.GameObjects.GameObject): void {
    if (!player || !this.terminal) {
      return;
    }

    // Update terminal proximity check
    this.terminal.update(player);

    // DEBUG: Log key state when key is down
    if (this.interactionKey.isDown) {
      console.log(`[QuizTerminalManager] 🔑 E key is DOWN - duration: ${this.interactionKey.duration}ms`);
    }

    // Handle interaction key press (same pattern as NPCManager)
    // Note: Using shared key, so check terminal proximity first to avoid conflicts
    const justDown = Phaser.Input.Keyboard.JustDown(this.interactionKey);

    if (justDown) {
      console.log(`[QuizTerminalManager] ⌨️ E key JustDown triggered!`);
      console.log(`[QuizTerminalManager] Player nearby: ${this.terminal.isPlayerNearby}`);

      if (this.terminal.isPlayerNearby) {
        console.log(`[QuizTerminalManager] ✅ Starting quiz...`);
        this.terminal.startQuiz();
      } else {
        console.log(`[QuizTerminalManager] ❌ Player not in range`);
      }
    }
  }

  /**
   * Destroy the terminal and clean up
   */
  public destroy(): void {
    if (this.terminal) {
      this.terminal.destroy();
      this.terminal = null;
    }
  }

  /**
   * Get the terminal instance
   * @returns Terminal instance or null
   */
  public getTerminal(): QuizTerminal | null {
    return this.terminal;
  }
}

