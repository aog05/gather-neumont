import Phaser from "phaser";
import type { PlayerSnapshot } from "../systems/multiplayer";

const PLAYER_SPEED = 200;
const PLAYER_TEXTURE_KEY = "player";
const PLAYER_IDLE_ANIMATION_KEY = `${PLAYER_TEXTURE_KEY}:Idle`;
const PLAYER_RUN_ANIMATION_KEY = `${PLAYER_TEXTURE_KEY}:Run`;

type PlayerState = "EXPLORING" | "DIALOGUE" | "POPUP";

export class PlayerController {
  private scene: Phaser.Scene;
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private downKeys: Set<string> = new Set();
  private pressedKeys: Set<string> = new Set();
  private playerState: PlayerState = "EXPLORING";
  private onDialogueCloseCallback: (() => void) | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  create(
    spawnX: number,
    spawnY: number,
    tiles: Phaser.Physics.Arcade.StaticGroup,
    onDialogueClose: () => void,
  ): void {
    this.onDialogueCloseCallback = onDialogueClose;
    this.player = this.scene.physics.add.sprite(
      spawnX,
      spawnY,
      PLAYER_TEXTURE_KEY,
    );
    this.scene.physics.add.collider(this.player, tiles);

    if (this.scene.anims.exists(PLAYER_IDLE_ANIMATION_KEY)) {
      this.player.play(PLAYER_IDLE_ANIMATION_KEY);
    }

    this.cursors = this.scene.input.keyboard!.createCursorKeys();
  }

  getGameObject(): Phaser.Physics.Arcade.Sprite {
    return this.player;
  }

  getMultiplayerSnapshot(): PlayerSnapshot {
    const body = this.player?.body as Phaser.Physics.Arcade.Body | undefined;
    const vx = body?.velocity.x ?? 0;
    const vy = body?.velocity.y ?? 0;

    return {
      x: this.player?.x ?? 0,
      y: this.player?.y ?? 0,
      vx,
      vy,
      isMoving: Math.abs(vx) > 0 || Math.abs(vy) > 0,
      timestamp: Date.now(),
    };
  }

  private capturePressedKeys(): void {
    this.pressedKeys.clear();
    const keyboard = this.scene.input.keyboard!;
    keyboard.on("keydown", (event: KeyboardEvent) => {
      if (!this.downKeys.has(event.key)) this.pressedKeys.add(event.key);
      this.downKeys.add(event.key);
    });

    keyboard.on("keyup", (event: KeyboardEvent) => {
      this.downKeys.delete(event.key);
    });
  }

  setPlayerState(state: PlayerState): void {
    this.playerState = state;
  }

  isInteracting(): boolean {
    return this.pressedKeys.has("e");
  }

  private move(playerBody: Phaser.Physics.Arcade.Body): void {
    let xVelocity = 0;
    let yVelocity = 0;

    if (this.cursors.left.isDown || this.downKeys.has("a")) {
      xVelocity -= PLAYER_SPEED;
    }

    if (this.cursors.right.isDown || this.downKeys.has("d")) {
      xVelocity += PLAYER_SPEED;
    }

    if (this.cursors.up.isDown || this.downKeys.has("w")) {
      yVelocity -= PLAYER_SPEED;
    }

    if (this.cursors.down.isDown || this.downKeys.has("s")) {
      yVelocity += PLAYER_SPEED;
    }

    playerBody.setVelocity(xVelocity, yVelocity);

    if (xVelocity < 0) {
      this.player.setFlipX(true);
    }

    if (xVelocity > 0) {
      this.player.setFlipX(false);
    }

    this.updateAnimation(xVelocity, yVelocity);
  }

  private updateAnimation(xVelocity: number, yVelocity: number): void {
    const isMoving = xVelocity !== 0 || yVelocity !== 0;

    if (isMoving && this.scene.anims.exists(PLAYER_RUN_ANIMATION_KEY)) {
      this.player.play(PLAYER_RUN_ANIMATION_KEY, true);
    } else if (this.scene.anims.exists(PLAYER_IDLE_ANIMATION_KEY)) {
      this.player.play(PLAYER_IDLE_ANIMATION_KEY, true);
    }
  }

  update(): void {
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    this.capturePressedKeys();

    switch (this.playerState) {
      case "EXPLORING":
        this.move(playerBody);
        break;
      case "DIALOGUE":
        playerBody.setVelocity(0, 0);
        this.updateAnimation(0, 0);

        if (this.pressedKeys.has("Escape")) {
          this.onDialogueCloseCallback?.();
        }
        break;
      case "POPUP":
        playerBody.setVelocity(0, 0);
        this.updateAnimation(0, 0);
        break;
    }
  }
}
