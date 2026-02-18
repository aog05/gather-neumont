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
    const map = MapParser.parseMapFile(this.mapData, scene);

    map.tiles.forEach((tile) => {
      const tileObject = scene.add
        .sprite(tile.x, tile.y, tile.image)
        . setDisplaySize(MapParser.TILE_SIZE, MapParser.TILE_SIZE);
      scene.physics.add.existing(tileObject, true);

      if (tile.obstacle) {
        tileGroup.add(tileObject);
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
