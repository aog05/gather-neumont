import { MapParser } from "@/utils/MapParser";
import Phaser from "phaser";

/**
 * Ground Floor map for Neumont Virtual Campus
 */
export class GroundFloor {
  private readonly mapData: MapParser.TiledMapData;

  public constructor(mapData: MapParser.TiledMapData) {
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
    const map = MapParser.parseTiledMap(this.mapData);

    map.tiles.forEach((tile) => {
      const tileObject =
        tile.frame === undefined
          ? scene.add
              .sprite(tile.x, tile.y, tile.textureKey)
              .setDisplaySize(MapParser.TILE_SIZE, MapParser.TILE_SIZE)
          : scene.add
              .sprite(tile.x, tile.y, tile.textureKey, tile.frame)
              .setDisplaySize(MapParser.TILE_SIZE, MapParser.TILE_SIZE);
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
