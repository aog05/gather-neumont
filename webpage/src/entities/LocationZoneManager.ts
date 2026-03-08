/**
 * LocationZoneManager — Manages a collection of LocationZone instances.
 *
 * Loads zone definitions from a JSON config array and calls checkPlayer
 * on each zone every frame via its own update() method.
 *
 * @example
 * // In MainScene.create():
 * import locationZonesConfig from '../config/location-zones.json';
 * this.locationZoneManager = new LocationZoneManager(this, this.bridge);
 * this.locationZoneManager.loadFromConfig(locationZonesConfig);
 *
 * // In MainScene.update():
 * this.locationZoneManager.update(this.player);
 */

import Phaser from "phaser";
import { GameEventBridge } from "../systems/GameEventBridge";
import { LocationZone, type LocationZoneConfig } from "./LocationZone";

export class LocationZoneManager {
  private scene: Phaser.Scene;
  private bridge: GameEventBridge;
  private zones: LocationZone[] = [];
  private debug: boolean;

  constructor(scene: Phaser.Scene, bridge: GameEventBridge, debug: boolean = false) {
    this.scene = scene;
    this.bridge = bridge;
    this.debug = debug;
  }

  /**
   * Load zones from a config array (typically imported from location-zones.json).
   * Can be called multiple times to add zones incrementally.
   */
  public loadFromConfig(configs: LocationZoneConfig[]): void {
    for (const config of configs) {
      const zone = new LocationZone(this.scene, config, this.bridge, this.debug);
      this.zones.push(zone);
    }
    console.log(`[LocationZoneManager] Loaded ${configs.length} location zones`);
  }

  /**
   * Call every frame from MainScene.update().
   * @param player - The player game object.
   */
  public update(player: Phaser.GameObjects.GameObject): void {
    for (const zone of this.zones) {
      zone.checkPlayer(player);
    }
  }

  /**
   * Reset all zone triggers (e.g., on floor change).
   */
  public resetAll(): void {
    for (const zone of this.zones) {
      zone.reset();
    }
  }

  /**
   * Destroy all zones and clear the list.
   */
  public destroyAll(): void {
    for (const zone of this.zones) {
      zone.destroy();
    }
    this.zones = [];
  }
}

