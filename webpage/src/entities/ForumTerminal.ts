import Phaser from "phaser";

export class ForumTerminal extends Phaser.GameObjects.Container {
  private sprite: Phaser.GameObjects.Rectangle;
  private interactionPrompt: Phaser.GameObjects.Container | null = null;
  public isPlayerNearby = false;
  private readonly INTERACTION_RADIUS = 90;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    this.sprite = scene.add.rectangle(0, 0, 78, 62, 0x1f8cff);
    this.add(this.sprite);
    this.setDepth(1);
  }

  public update(player: Phaser.GameObjects.GameObject): void {
    if (!player || !(player as any).body) return;

    const playerBody = (player as any).body as Phaser.Physics.Arcade.Body;
    const playerX = playerBody.x + playerBody.halfWidth;
    const playerY = playerBody.y + playerBody.halfHeight;
    const distance = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY);
    const wasNearby = this.isPlayerNearby;
    this.isPlayerNearby = distance <= this.INTERACTION_RADIUS;

    if (this.isPlayerNearby && !wasNearby) {
      this.showInteractionPrompt();
    } else if (!this.isPlayerNearby && wasNearby) {
      this.hideInteractionPrompt();
    }
  }

  public startForum(): void {
    window.dispatchEvent(new CustomEvent("forum:start"));
  }

  private showInteractionPrompt(): void {
    if (this.interactionPrompt) return;

    this.interactionPrompt = this.scene.add.container(0, -60);
    const bg = this.scene.add.rectangle(0, 0, 190, 30, 0x000000, 0.7);
    const text = this.scene.add.text(0, 0, "Press E to open forum", {
      fontSize: "14px",
      color: "#ffffff",
      fontFamily: "Arial",
    });
    text.setOrigin(0.5, 0.5);
    this.interactionPrompt.add([bg, text]);
    this.add(this.interactionPrompt);

    this.scene.tweens.add({
      targets: this.interactionPrompt,
      y: -70,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  private hideInteractionPrompt(): void {
    if (!this.interactionPrompt) return;
    this.scene.tweens.killTweensOf(this.interactionPrompt);
    this.interactionPrompt.destroy();
    this.interactionPrompt = null;
  }

  override destroy(fromScene?: boolean): void {
    this.hideInteractionPrompt();
    super.destroy(fromScene);
  }
}
