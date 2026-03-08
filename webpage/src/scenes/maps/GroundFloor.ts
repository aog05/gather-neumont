import { MapParser } from "@/utils/MapParser";
import { TilesetParser } from "@/utils/TilesetParser";
import Phaser from "phaser";

/**
 * Ground Floor map for Neumont Virtual Campus
 */
export class GroundFloor {
  private readonly mapData: string;
  private readonly tilesetData: string;

  public constructor(mapData: string, tilesetData: string) {
    this.mapData = mapData;
    this.tilesetData = tilesetData;
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
    const parsedTileset = TilesetParser.parseTilesetFile(this.tilesetData);
    const map = MapParser.parseMapFile(this.mapData, parsedTileset);

    map.tiles.forEach((tile) => {
      const tileVisual = scene.add.tileSprite(
        tile.x,
        tile.y,
        MapParser.TILE_SIZE,
        MapParser.TILE_SIZE,
        parsedTileset.image,
      );
      tileVisual.setOrigin(0, 0);
      tileVisual.setCrop(
        parsedTileset.textureFramesByTileId.get(tile.localTileId)?.frameX ?? 0,
        parsedTileset.textureFramesByTileId.get(tile.localTileId)?.frameY ?? 0,
        parsedTileset.textureFramesByTileId.get(tile.localTileId)?.frameWidth ??
          parsedTileset.tileWidth,
        parsedTileset.textureFramesByTileId.get(tile.localTileId)
          ?.frameHeight ?? parsedTileset.tileHeight,
      );
      tileVisual.setDisplaySize(160, 160);

      if (tile.obstacle) {
        tile.collisionBoxes.forEach((collisionBox) => {
          const wall = scene.add.rectangle(
            collisionBox.x,
            collisionBox.y,
            collisionBox.width,
            collisionBox.height,
            0xff0000,
            0,
          );
          wall.setOrigin(0, 0);
          scene.physics.add.existing(wall, true);
          tileGroup.add(wall);
        });
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
