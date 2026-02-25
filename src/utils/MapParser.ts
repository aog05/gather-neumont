export namespace MapParser {
  export const TILE_SIZE = 50;

  export type TiledProperty = {
    name: string;
    type?: string;
    value: unknown;
  };

  export type TiledTileset = {
    firstgid: number;
    name: string;
    image?: string;
    imagewidth?: number;
    imageheight?: number;
    tilecount?: number;
    columns?: number;
    tiles?: Array<{
      id: number;
      properties?: TiledProperty[];
    }>;
  };

  export type TiledTileLayer = {
    id: number;
    name: string;
    type: "tilelayer";
    width: number;
    height: number;
    data: number[];
    visible?: boolean;
    opacity?: number;
    properties?: TiledProperty[];
  };

  export type TiledObject = {
    id: number;
    x: number;
    y: number;
    width?: number;
    height?: number;
    gid?: number;
    visible?: boolean;
    properties?: TiledProperty[];
  };

  export type TiledObjectLayer = {
    id: number;
    name: string;
    type: "objectgroup";
    objects: TiledObject[];
    visible?: boolean;
    opacity?: number;
    properties?: TiledProperty[];
  };

  export type TiledLayer = TiledTileLayer | TiledObjectLayer;

  export type TiledMapData = {
    width: number;
    height: number;
    layers: TiledLayer[];
    tilesets: TiledTileset[];
  };

  export type ParsedTile = {
    x: number;
    y: number;
    obstacle: boolean;
    textureKey: string;
    frame?: number;
  };

  export type ParsedMapData = {
    tiles: ParsedTile[];
  };

  export function preloadTiledMapAssets(
    map: TiledMapData,
    scene: Phaser.Scene,
  ): void {
    for (const tileset of map.tilesets) {
      if (!tileset.image) {
        continue;
      }

      const key = getTilesetTextureKey(tileset.name);
      if (isSingleTileImageTileset(tileset)) {
        scene.load.image(key, tileset.image);
        continue;
      }

      scene.load.spritesheet(key, tileset.image, {
        frameWidth: MapParser.TILE_SIZE,
        frameHeight: MapParser.TILE_SIZE,
        margin: 0,
        spacing: 0,
      });
    }
  }

  export function parseTiledMap(map: TiledMapData): ParsedMapData {
    const tiles: ParsedTile[] = [];

    for (const layer of map.layers) {
      if (layer.visible === false) {
        continue;
      }

      if (layer.type === "tilelayer") {
        for (let row = 0; row < layer.height; row++) {
          for (let col = 0; col < layer.width; col++) {
            const index = row * layer.width + col;
            const gid = layer.data[index] ?? 0;

            if (gid <= 0) {
              continue;
            }

            const tileset = findTilesetForGid(gid, map.tilesets);
            if (!tileset?.image) {
              continue;
            }

            const frame = gid - tileset.firstgid;
            const obstacle = isObstacleLayer(layer);

            tiles.push({
              x: col * MapParser.TILE_SIZE,
              y: row * MapParser.TILE_SIZE,
              obstacle,
              textureKey: getTilesetTextureKey(tileset.name),
              frame: isSingleTileImageTileset(tileset) ? undefined : frame,
            });
          }
        }

        continue;
      }

      if (layer.type === "objectgroup") {
        for (const object of layer.objects) {
          if (object.visible === false || !object.gid) {
            continue;
          }

          const tileset = findTilesetForGid(object.gid, map.tilesets);
          if (!tileset?.image) {
            continue;
          }

          const frame = object.gid - tileset.firstgid;
          const obstacle = isObstacleLayer(layer) || isObstacleObject(object);

          tiles.push({
            x: object.x,
            y: object.y,
            obstacle,
            textureKey: getTilesetTextureKey(tileset.name),
            frame: isSingleTileImageTileset(tileset) ? undefined : frame,
          });
        }

        continue;
      }
    }

    return { tiles };
  }

  function findTilesetForGid(
    gid: number,
    tilesets: TiledTileset[],
  ): TiledTileset | undefined {
    const sortedTilesets = [...tilesets].sort(
      (a, b) => a.firstgid - b.firstgid,
    );

    let resolved: TiledTileset | undefined;
    for (const tileset of sortedTilesets) {
      if (gid >= tileset.firstgid) {
        resolved = tileset;
      }
    }

    return resolved;
  }

  function getTilesetTextureKey(tilesetName: string): string {
    return `tiled-tileset-${tilesetName}`;
  }

  function isSingleTileImageTileset(tileset: TiledTileset): boolean {
    return (tileset.tilecount ?? 0) <= 1 || (tileset.columns ?? 0) <= 1;
  }

  function isObstacleLayer(layer: TiledLayer): boolean {
    const hasCollisionName = /collision|collider|obstacle|blocked/i.test(
      layer.name,
    );
    if (hasCollisionName) {
      return true;
    }

    return getBooleanProperty(layer.properties, [
      "collision",
      "collidable",
      "obstacle",
      "blocked",
    ]);
  }

  function isObstacleObject(object: TiledObject): boolean {
    return getBooleanProperty(object.properties, [
      "collision",
      "collidable",
      "obstacle",
      "blocked",
    ]);
  }

  function getBooleanProperty(
    properties: TiledProperty[] | undefined,
    names: string[],
  ): boolean {
    if (!properties || properties.length === 0) {
      return false;
    }

    const loweredNames = names.map((name) => name.toLowerCase());
    const property = properties.find((entry) =>
      loweredNames.includes(entry.name.toLowerCase()),
    );

    if (!property) {
      return false;
    }

    return property.value === true;
  }
}
