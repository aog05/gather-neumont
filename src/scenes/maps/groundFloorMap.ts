import type { MapParser } from "@/utils/MapParser";

export const GROUND_FLOOR_TILED_MAP: MapParser.TiledMapData = {
  width: 0,
  height: 0,
  layers: [
    {
      id: 1,
      name: "ground-objects",
      type: "objectgroup",
      objects: [
        { id: 1, x: -100, y: -50, gid: 1 },
        { id: 2, x: 0, y: -50, gid: 2 },
        { id: 3, x: 50, y: -300, gid: 3 },
        { id: 4, x: -150, y: 250, gid: 4 },
        { id: 5, x: 500, y: 100, gid: 4 },
        { id: 6, x: -650, y: -250, gid: 5 },
        { id: 7, x: -250, y: -250, gid: 5 },
        { id: 8, x: 200, y: 50, gid: 6 },
        {
          id: 9,
          x: 250,
          y: -250,
          gid: 6,
          properties: [{ name: "obstacle", type: "bool", value: true }],
        },
        {
          id: 10,
          x: 300,
          y: -400,
          gid: 6,
          properties: [{ name: "obstacle", type: "bool", value: true }],
        },
        {
          id: 11,
          x: -450,
          y: 200,
          gid: 2,
          properties: [{ name: "obstacle", type: "bool", value: true }],
        },
      ],
    },
  ],
  tilesets: [
    {
      firstgid: 1,
      name: "img_5026",
      image: "assets/test-images/IMG_5026.png",
      tilecount: 1,
      columns: 1,
    },
    {
      firstgid: 2,
      name: "img_5090",
      image: "assets/test-images/IMG_5090.png",
      tilecount: 1,
      columns: 1,
    },
    {
      firstgid: 3,
      name: "img_5093",
      image: "assets/test-images/IMG_5093.png",
      tilecount: 1,
      columns: 1,
    },
    {
      firstgid: 4,
      name: "waterfall",
      image: "assets/test-images/waterfall_pixel_art.png",
      tilecount: 1,
      columns: 1,
    },
    {
      firstgid: 5,
      name: "img_4948",
      image: "assets/test-images/IMG_4948.png",
      tilecount: 1,
      columns: 1,
    },
    {
      firstgid: 6,
      name: "img_2025",
      image: "assets/test-images/IMG_2025.png",
      tilecount: 1,
      columns: 1,
    },
  ],
};
