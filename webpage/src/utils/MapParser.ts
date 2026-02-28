const mapLineRegex = /^([-+][0-9,a-f]{4}),([-+][0-9,a-f]{4})(\s\w+)*$/i;

export namespace MapParser {
  export const TILE_SIZE = 50;

  export type Tile = {
    x: number;
    y: number;
    obstacle: boolean;
  };

  export type MapData = {
    tiles: Tile[];
  };

  export function parseMapFile(map: string): MapData {
    let mapData: MapData = { tiles: [] };
    map.split("\n").forEach((line) => {
      const match = line.match(mapLineRegex);
      let tile: Tile = { x: 0, y: 0, obstacle: false };

      if (match) {
        const x = getCoordinate(match[1]) * TILE_SIZE;
        const y = getCoordinate(match[2]) * TILE_SIZE;
        const obstacle = isObstacle(match[3]);
        tile = { x, y, obstacle };
      } else {
        console.warn(`Invalid map line: ${line}`);
        return;
      }

      mapData.tiles.push(tile);
    });

    return mapData;
  }

  function getCoordinate(match: string | undefined): number {
    if (!match) return 0;
    return parseInt(match, 16);
  }

  function isObstacle(match: string | undefined): boolean {
    return match !== undefined && match.trim().toLowerCase() === "ob";
  }
}
