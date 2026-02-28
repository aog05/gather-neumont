import { MapParser } from "@/utils/MapParser";
import Phaser from "phaser";

/**
 * Ground Floor map for Neumont Virtual Campus
 */
export class GroundFloor {
  private readonly mapData: string;

  public constructor(mapData: string) {
    this.mapData = mapData;
  }

  /**
   * Creates and returns all tiles for the ground floor
   * @param scene - The Phaser scene to add tiles to
   * @param tileGroup - The static physics group to add tiles to
   */
  public createTiles(
    scene: Phaser.Scene,
    tileGroup: Phaser.Physics.Arcade.StaticGroup,
  ): void {
    const map = MapParser.parseMapFile(this.mapData);

    map.tiles.forEach((tile) => {
      const wall = scene.add.rectangle(
        tile.x,
        tile.y,
        MapParser.TILE_SIZE,
        MapParser.TILE_SIZE,
        tile.obstacle ? 0xff0000 : 0x0000ff,
      );
      scene.physics.add.existing(wall, true);

      if (tile.obstacle) {
        tileGroup.add(wall);
      }
    });
  }

  /**
   * Get spawn position for player (central commons area)
   */
  public getSpawnPosition(): { x: number; y: number } {
    return { x: 0, y: 0 };
  }
}
