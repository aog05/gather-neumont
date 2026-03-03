export namespace MapParser {
  export const TILE_SIZE = 50;

  export type CollisionBox = {
    x: number;
    y: number;
    width: number;
    height: number;
  };

  export type TilesetTileCollision = {
    localTileId: number;
    collisionBoxes: CollisionBox[];
  };

  export type TilesetData = {
    tileWidth: number;
    tileHeight: number;
    collisionsByTileId: Map<number, TilesetTileCollision>;
  };

  export type MapParseOptions = {
    worldTileSize?: number;
  };

  export type Tile = {
    x: number;
    y: number;
    layerId: number;
    gid: number;
    localTileId: number;
    obstacle: boolean;
    collisionBoxes: CollisionBox[];
  };

  export type MapData = {
    width: number;
    height: number;
    tileWidth: number;
    tileHeight: number;
    tiles: Tile[];
  };

  type TiledLayer = {
    id: number;
    type: string;
    visible: boolean;
    width: number;
    height: number;
    data?: number[];
  };

  type TiledTilesetRef = {
    firstgid?: number;
  };

  type TiledMapJson = {
    width: number;
    height: number;
    tilewidth: number;
    tileheight: number;
    layers: TiledLayer[];
    tilesets: TiledTilesetRef[];
  };

  export function parseMapFile(map: string, tileset: TilesetData): MapData {
    const parsedMap: TiledMapJson = JSON.parse(map);

    const firstGid = parsedMap.tilesets[0]?.firstgid ?? 0;
    const scaleX = TILE_SIZE / parsedMap.tilewidth;
    const scaleY = TILE_SIZE / parsedMap.tileheight;

    const tiles: Tile[] = [];
    const tileLayers = parsedMap.layers.filter(
      (layer) => layer.type === "tilelayer" && layer.visible !== false,
    );

    tileLayers.forEach((layer) => {
      const layerData = layer.data ?? [];
      const tileAmount = layer.width * layer.height;

      for (let index = 0; index < tileAmount; index += 1) {
        const gid = layerData[index] ?? 0;
        if (gid <= 0) continue;

        const localTileId = gid - firstGid;
        if (localTileId < 0) continue;

        const tileX = index % layer.width;
        const tileY = Math.floor(index / layer.width);
        const worldX = tileX * TILE_SIZE;
        const worldY = tileY * TILE_SIZE;

        const tileCollision = tileset.collisionsByTileId.get(localTileId);
        const collisionBoxes =
          tileCollision?.collisionBoxes.map((box) => ({
            x: worldX + box.x * scaleX,
            y: worldY + box.y * scaleY,
            width: box.width * scaleX,
            height: box.height * scaleY,
          })) ?? [];

        tiles.push({
          x: worldX,
          y: worldY,
          layerId: layer.id,
          gid,
          localTileId,
          obstacle: collisionBoxes.length > 0,
          collisionBoxes,
        });
      }
    });

    return {
      width: parsedMap.width,
      height: parsedMap.height,
      tileWidth: parsedMap.tilewidth,
      tileHeight: parsedMap.tileheight,
      tiles,
    };
  }
}
