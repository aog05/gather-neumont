/**
 * LocationZone — Named invisible rectangular trigger zone.
 *
 * When the player's position is inside the rectangle for the first time
 * in the current session, a `zone:entered` event is emitted on GameEventBridge.
 * The zone only fires once per session; QuestTriggerSystem handles idempotency
 * across sessions via Firestore.
 *
 * In debug mode a semi-transparent rectangle is drawn over the zone.
 */

import Phaser from "phaser";
import { GameEventBridge } from "../systems/GameEventBridge";
import type { ZoneEnteredPayload } from "../types/quest.types";

export interface LocationZoneConfig {
  /** Unique identifier — must match zoneId used in quest objectives */
  id: string;
  /** Top-left X position in world coordinates */
  x: number;
  /** Top-left Y position in world coordinates */
  y: number;
  /** Width in pixels */
  w: number;
  /** Height in pixels */
  h: number;
}

export class LocationZone {
  private scene: Phaser.Scene;
  private bridge: GameEventBridge;
  private zoneId: string;
  private bounds: Phaser.Geom.Rectangle;
  private hasTriggered: boolean = false;
  private debugRect: Phaser.GameObjects.Rectangle | null = null;

  constructor(
    scene: Phaser.Scene,
    config: LocationZoneConfig,
    bridge: GameEventBridge,
    debug: boolean = false,
  ) {
    this.scene = scene;
    this.bridge = bridge;
    this.zoneId = config.id;
    this.bounds = new Phaser.Geom.Rectangle(config.x, config.y, config.w, config.h);

    if (debug) {
      this.debugRect = scene.add.rectangle(
        config.x + config.w / 2,
        config.y + config.h / 2,
        config.w,
        config.h,
        0x00ff88,
        0.2,
      );
      this.debugRect.setDepth(0);
      // Draw zone label
      scene.add
        .text(config.x + config.w / 2, config.y + config.h / 2, config.id, {
          fontSize: "12px",
          color: "#00ff88",
        })
        .setOrigin(0.5)
        .setDepth(0);
    }
  }

  /**
   * Call every frame with the player game object.
   * Fires zone:entered once per session when player centre is inside the bounds.
   */
  public checkPlayer(player: Phaser.GameObjects.GameObject): void {
    if (this.hasTriggered || !player.body) return;

    const body = player.body as Phaser.Physics.Arcade.Body;
    // Use centre of player body
    const px = body.x + body.width / 2;
    const py = body.y + body.height / 2;

    if (Phaser.Geom.Rectangle.Contains(this.bounds, px, py)) {
      this.hasTriggered = true;
      const payload: ZoneEnteredPayload = { zoneId: this.zoneId };
      this.bridge.emit("zone:entered", payload);
      console.log(`[LocationZone] Player entered zone: ${this.zoneId}`);
    }
  }

  /** Reset per-session trigger (e.g., when re-loading a floor). */
  public reset(): void {
    this.hasTriggered = false;
  }

  public destroy(): void {
    this.debugRect?.destroy();
  }
}

