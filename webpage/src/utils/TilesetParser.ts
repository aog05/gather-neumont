export namespace TilesetParser {
  export type CollisionBox = {
    x: number;
    y: number;
    width: number;
    height: number;
  };

  export type ParsedTileCollision = {
    localTileId: number;
    collisionBoxes: CollisionBox[];
  };

  export type ParsedTileset = {
    name: string;
    tileWidth: number;
    tileHeight: number;
    collisionsByTileId: Map<number, ParsedTileCollision>;
  };

  type TiledObject = {
    x: number;
    y: number;
    width: number;
    height: number;
  };

  type TiledTile = {
    id: number;
    objectgroup: {
      objects?: TiledObject[];
    };
  };

  type TiledTilesetJson = {
    name: string;
    tilewidth: number;
    tileheight: number;
    tiles: TiledTile[];
  };

  export function parseTilesetFile(tileset: string): ParsedTileset {
    const parsedTileset = JSON.parse(tileset) as TiledTilesetJson;

    const tileWidth = parsedTileset.tilewidth;
    const tileHeight = parsedTileset.tileheight;
    const collisionsByTileId = new Map<number, ParsedTileCollision>();

    parsedTileset.tiles.forEach((tile) => {
      if (tile.id === undefined) return;

      const objects = tile.objectgroup.objects ?? [];
      const collisionBoxes: CollisionBox[] = objects.map(
        (object): CollisionBox => {
          return {
            x: object.x,
            y: object.y,
            width: object.width,
            height: object.height,
          };
        },
      );

      if (tile.objectgroup && collisionBoxes.length === 0) {
        collisionsByTileId.set(tile.id, {
          localTileId: tile.id,
          collisionBoxes: [
            { x: 0, y: 0, width: tileWidth, height: tileHeight },
          ],
        });
        return;
      }

      if (collisionBoxes.length > 0) {
        collisionsByTileId.set(tile.id, {
          localTileId: tile.id,
          collisionBoxes,
        });
      }
    });

    return {
      name: parsedTileset.name ?? "Unnamed Tileset",
      tileWidth,
      tileHeight,
      collisionsByTileId,
    };
  }
}
