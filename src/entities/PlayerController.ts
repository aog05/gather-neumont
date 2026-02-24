import Phaser from "phaser";

const PLAYER_SPEED = 200;
const PLAYER_SIZE = 50;

type PlayerState = "EXPLORING" | "DIALOGUE";

export class PlayerController {
  private scene: Phaser.Scene;
  private player!: Phaser.GameObjects.Rectangle;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
  };
  private escapeKey!: Phaser.Input.Keyboard.Key;
  private interactionKey: Phaser.Input.Keyboard.Key | null = null;
  private playerState: PlayerState = "EXPLORING";
  private escapeJustDown = false;
  private interactionJustDown = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  create(
    spawnX: number,
    spawnY: number,
    tiles: Phaser.Physics.Arcade.StaticGroup,
  ): void {
    this.player = this.scene.add.rectangle(
      spawnX,
      spawnY,
      PLAYER_SIZE,
      PLAYER_SIZE,
      0x0000ff,
    );

    this.scene.physics.add.existing(this.player);
    this.scene.physics.add.collider(this.player, tiles);

    this.cursors = this.scene.input.keyboard!.createCursorKeys();
    this.wasd = {
      up: this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.scene.input.keyboard!.addKey(
        Phaser.Input.Keyboard.KeyCodes.D,
      ),
    };
    this.escapeKey = this.scene.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.ESC,
    );
  }

  getPlayer(): Phaser.GameObjects.Rectangle {
    return this.player;
  }

  setInteractionKey(key: Phaser.Input.Keyboard.Key): void {
    this.interactionKey = key;
  }

  captureJustDownStates(): void {
    this.escapeJustDown = Phaser.Input.Keyboard.JustDown(this.escapeKey);
    this.interactionJustDown = this.interactionKey
      ? Phaser.Input.Keyboard.JustDown(this.interactionKey)
      : false;
  }

  getInteractionJustDown(): boolean {
    return this.interactionJustDown;
  }

  setDialogueActive(isActive: boolean): void {
    this.playerState = isActive ? "DIALOGUE" : "EXPLORING";
  }

  update(onDialogueClose: () => void): void {
    if (!this.player || !this.player.body) {
      return;
    }

    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;

    if (this.playerState === "DIALOGUE" && this.escapeJustDown) {
      onDialogueClose();
    }

    if (this.playerState === "DIALOGUE") {
      playerBody.setVelocity(0, 0);
      return;
    }

    if (this.cursors.left.isDown || this.wasd.left.isDown) {
      playerBody.setVelocityX(-PLAYER_SPEED);
    } else if (this.cursors.right.isDown || this.wasd.right.isDown) {
      playerBody.setVelocityX(PLAYER_SPEED);
    } else {
      playerBody.setVelocityX(0);
    }

    if (this.cursors.up.isDown || this.wasd.up.isDown) {
      playerBody.setVelocityY(-PLAYER_SPEED);
    } else if (this.cursors.down.isDown || this.wasd.down.isDown) {
      playerBody.setVelocityY(PLAYER_SPEED);
    } else {
      playerBody.setVelocityY(0);
    }
  }
}
