const mapLineRegex = /^([-+][0-9,a-f]{4}),([-+][0-9,a-f]{4})(.*)$/i;

export namespace MapParser {
  export const TILE_SIZE = 50;

  export type Tile = {
    x: number;
    y: number;
    obstacle: boolean;
    image: string;
  };

  export type MapData = {
    tiles: Tile[];
  };

  export function preloadMapAssets(map: string, scene: Phaser.Scene): void {
    const uniqueImages = new Set<string>();
    const regex = /tex=([^\s]+)/;

    map.split("\n").forEach((line) => {
      const match = line.match(regex);
      if (match) {
        const image = match[1];
        console.log(`Preloading image: ${image}`);
        if (image) uniqueImages.add(image);
      }
    });

    uniqueImages.forEach((image) => scene.load.image(image, image));
  }

  export function parseMapFile(map: string, scene: Phaser.Scene): MapData {
    let mapData: MapData = { tiles: [] };
    map.split("\n").forEach((line, lineNumber) => {
      const match = line.match(mapLineRegex);
      let tile: Tile = { x: 0, y: 0, obstacle: false, image: "" };

      if (match) {
        const x = getCoordinate(match[1]) * TILE_SIZE;
        const y = getCoordinate(match[2]) * TILE_SIZE;
        const flags = parseFlags(match[3]);

        const obstacle = flags.includes("ob");
        const image = flags.find((f) => f.includes("tex="))?.split("=")[1];

        if (!image) {
          console.warn(`Invalid map line ${lineNumber + 1}: ${line}`);
          return;
        }

        tile = { x, y, obstacle, image };
      } else {
        console.warn(`Invalid map line ${lineNumber + 1}: ${line}`);
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

  function parseFlags(match: string | undefined): string[] {
    return match !== undefined ? match.trim().split(/\s+/) : [];
  }
}
