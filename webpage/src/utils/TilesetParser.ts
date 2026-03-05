export namespace TilesetParser {
  export type TileTextureFrame = {
    localTileId: number;
    image: string;
    frameX: number;
    frameY: number;
    frameWidth: number;
    frameHeight: number;
  };

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
    image: string;
    imageWidth: number;
    imageHeight: number;
    columns: number;
    margin: number;
    spacing: number;
    tileCount: number;
    textureFramesByTileId: Map<number, TileTextureFrame>;
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
    image: string;
    imagewidth: number;
    imageheight: number;
    columns: number;
    margin: number;
    spacing: number;
    tilecount: number;
    tilewidth: number;
    tileheight: number;
    tiles: TiledTile[];
  };

  export function parseTilesetFile(tileset: string): ParsedTileset {
    const parsedTileset = JSON.parse(tileset) as TiledTilesetJson;

    const tileWidth = parsedTileset.tilewidth;
    const tileHeight = parsedTileset.tileheight;
    const image = parsedTileset.image;
    const imageWidth = parsedTileset.imagewidth;
    const imageHeight = parsedTileset.imageheight;
    const columns = parsedTileset.columns;
    const margin = parsedTileset.margin;
    const spacing = parsedTileset.spacing;
    const tileCount = parsedTileset.tilecount;

    const textureFramesByTileId = new Map<number, TileTextureFrame>();

    for (let localTileId = 0; localTileId < tileCount; localTileId += 1) {
      const column = localTileId % columns;
      const row = Math.floor(localTileId / columns);

      const frameX = margin + column * (tileWidth + spacing);
      const frameY = margin + row * (tileHeight + spacing);

      textureFramesByTileId.set(localTileId, {
        localTileId,
        image,
        frameX,
        frameY,
        frameWidth: tileWidth,
        frameHeight: tileHeight,
      });
    }

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
      image,
      imageWidth,
      imageHeight,
      columns,
      margin,
      spacing,
      tileCount,
      textureFramesByTileId,
      collisionsByTileId,
    };
  }
}
