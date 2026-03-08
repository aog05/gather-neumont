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
  private scene: Phaser.Scene;
  private terminal: QuizTerminal | null = null;
  private lastPlayerX = 0;
  private lastPlayerY = 0;

  constructor(scene: Phaser.Scene, _interactionKey: Phaser.Input.Keyboard.Key) {
    this.scene = scene;
    // interactionKey is no longer read here — MainScene dispatches E centrally.
  }

  public createTerminal(x: number, y: number): QuizTerminal {
    if (this.terminal) {
      console.warn("Quiz terminal already exists");
      return this.terminal;
    }

    this.terminal = new QuizTerminal(this.scene, x, y);
    this.scene.add.existing(this.terminal);
    this.scene.physics.add.existing(this.terminal, true);

    console.log(`Created quiz terminal at (${x}, ${y})`);
    return this.terminal;
  }

  /** Phase-1 update: proximity check only. Call every frame before E dispatch. */
  public updateProximity(player: Phaser.GameObjects.GameObject): void {
    if (!player || !this.terminal) return;

    this.terminal.update(player);

    const body = (player as any).body as Phaser.Physics.Arcade.Body | undefined;
    if (body) {
      this.lastPlayerX = body.x + body.halfWidth;
      this.lastPlayerY = body.y + body.halfHeight;
    }
  }

  /** Returns pixel distance to terminal if player is in range, else null. */
  public nearestInRangeDistance(): number | null {
    if (!this.terminal?.isPlayerNearby) return null;
    return Phaser.Math.Distance.Between(
      this.terminal.x,
      this.terminal.y,
      this.lastPlayerX,
      this.lastPlayerY,
    );
  }

  /** Phase-2 dispatch: start quiz if player is in range. */
  public tryInteract(): void {
    if (this.terminal?.isPlayerNearby) {
      this.terminal.startQuiz();
    }
  }

  public destroy(): void {
    if (this.terminal) {
      this.terminal.destroy();
      this.terminal = null;
    }
  }

  public getTerminal(): QuizTerminal | null {
    return this.terminal;
  }
}

