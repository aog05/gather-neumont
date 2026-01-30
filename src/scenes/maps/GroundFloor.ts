import Phaser from "phaser";

export interface WallConfig {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Ground Floor map for Neumont Virtual Campus
 * Based on ground_floor_blueprint.png
 * Map dimensions: 2400x1600 pixels
 */
export class GroundFloor {
  // Map dimensions
  public static readonly WIDTH = 2400;
  public static readonly HEIGHT = 1600;
  public static readonly WALL_THICKNESS = 20;

  /**
   * Creates and returns all walls for the ground floor
   * @param scene - The Phaser scene to add walls to
   * @param wallGroup - The static physics group to add walls to
   */
  static createWalls(
    scene: Phaser.Scene,
    wallGroup: Phaser.Physics.Arcade.StaticGroup,
  ): void {
    const walls = this.getWallConfigs();

    walls.forEach((config) => {
      const wall = scene.add.rectangle(
        config.x,
        config.y,
        config.width,
        config.height,
        0xffffff,
      );
      scene.physics.add.existing(wall, true);
      wallGroup.add(wall);
    });
  }

  /**
   * Returns array of wall configurations for ground floor
   */
  private static getWallConfigs(): WallConfig[] {
    return [
      ...this.getPerimeterWalls(),
      ...this.getLeftSideWalls(),
      ...this.getTopRoomWalls(),
      ...this.getRightSideWalls(),
      ...this.getBottomRoomWalls(),
      ...this.getCentralCommonsWalls(),
    ];
  }

  /**
   * Outer perimeter walls
   */
  private static getPerimeterWalls(): WallConfig[] {
    const w = this.WALL_THICKNESS;
    return [
      // Top wall
      { x: this.WIDTH / 2, y: w / 2, width: this.WIDTH, height: w },
      // Bottom wall
      {
        x: this.WIDTH / 2,
        y: this.HEIGHT - w / 2,
        width: this.WIDTH,
        height: w,
      },
      // Left wall
      { x: w / 2, y: this.HEIGHT / 2, width: w, height: this.HEIGHT },
      // Right wall
      {
        x: this.WIDTH - w / 2,
        y: this.HEIGHT / 2,
        width: w,
        height: this.HEIGHT,
      },
    ];
  }

  /**
   * Left side walls - includes Room 101, staircase, and other left rooms
   */
  private static getLeftSideWalls(): WallConfig[] {
    const w = this.WALL_THICKNESS;
    return [
      // Room 101 (upper-left large room)
      // Top wall of Room 101
      { x: 200, y: 100, width: 340, height: w },
      // Right wall of Room 101 (with doorway gap)
      { x: 370, y: 150, width: w, height: 80 },
      { x: 370, y: 280, width: w, height: 180 },
      // Bottom wall of Room 101
      { x: 200, y: 370, width: 340, height: w },

      // Staircase area (left side)
      { x: 150, y: 500, width: w, height: 200 },
      { x: 250, y: 450, width: 200, height: w },
      { x: 350, y: 500, width: w, height: 200 },
      { x: 250, y: 600, width: 200, height: w },

      // Room 119 (lower-left)
      { x: 200, y: 750, width: 340, height: w },
      { x: 370, y: 900, width: w, height: 280 },
      { x: 200, y: 1040, width: 340, height: w },

      // Vertical hallway wall on left side
      { x: 380, y: 800, width: w, height: 800 },
    ];
  }

  /**
   * Top room walls - rooms along the top edge
   */
  private static getTopRoomWalls(): WallConfig[] {
    const w = this.WALL_THICKNESS;
    return [
      // Room 102
      { x: 500, y: 100, width: 200, height: w },
      { x: 400, y: 200, width: w, height: 180 },
      { x: 600, y: 200, width: w, height: 180 },
      { x: 500, y: 290, width: 200, height: w },

      // Room 103
      { x: 750, y: 100, width: 200, height: w },
      { x: 650, y: 200, width: w, height: 180 },
      { x: 850, y: 200, width: w, height: 180 },
      { x: 750, y: 290, width: 200, height: w },

      // Room 104
      { x: 1000, y: 100, width: 200, height: w },
      { x: 900, y: 200, width: w, height: 180 },
      { x: 1100, y: 200, width: w, height: 180 },
      { x: 1000, y: 290, width: 200, height: w },

      // Room 105
      { x: 1250, y: 100, width: 200, height: w },
      { x: 1150, y: 200, width: w, height: 180 },
      { x: 1350, y: 200, width: w, height: 180 },
      { x: 1250, y: 290, width: 200, height: w },

      // Horizontal hallway wall below top rooms
      { x: 1200, y: 300, width: 1600, height: w },
    ];
  }

  /**
   * Right side walls - includes classrooms and staircase
   */
  private static getRightSideWalls(): WallConfig[] {
    const w = this.WALL_THICKNESS;
    return [
      // Room 106 (upper-right area)
      { x: 1900, y: 100, width: 400, height: w },
      { x: 1700, y: 200, width: w, height: 180 },
      { x: 2100, y: 200, width: w, height: 180 },
      { x: 1900, y: 290, width: 400, height: w },

      // Room 107
      { x: 1900, y: 450, width: 400, height: w },
      { x: 1700, y: 575, width: w, height: 230 },
      { x: 2100, y: 575, width: w, height: 230 },
      { x: 1900, y: 700, width: 400, height: w },

      // Staircase area (right side)
      { x: 2000, y: 850, width: w, height: 200 },
      { x: 2100, y: 800, width: 200, height: w },
      { x: 2200, y: 850, width: w, height: 200 },
      { x: 2100, y: 950, width: 200, height: w },

      // Room 108 (lower-right)
      { x: 1900, y: 1100, width: 400, height: w },
      { x: 1700, y: 1250, width: w, height: 280 },
      { x: 2100, y: 1250, width: w, height: 280 },
      { x: 1900, y: 1390, width: 400, height: w },

      // Vertical hallway wall on right side
      { x: 1690, y: 800, width: w, height: 800 },
    ];
  }

  /**
   * Bottom room walls - rooms along the bottom edge
   */
  private static getBottomRoomWalls(): WallConfig[] {
    const w = this.WALL_THICKNESS;
    return [
      // Room 109
      { x: 500, y: 1310, width: 200, height: w },
      { x: 400, y: 1410, width: w, height: 180 },
      { x: 600, y: 1410, width: w, height: 180 },
      { x: 500, y: 1500, width: 200, height: w },

      // Room 110
      { x: 750, y: 1310, width: 200, height: w },
      { x: 650, y: 1410, width: w, height: 180 },
      { x: 850, y: 1410, width: w, height: 180 },
      { x: 750, y: 1500, width: 200, height: w },

      // Room 111
      { x: 1000, y: 1310, width: 200, height: w },
      { x: 900, y: 1410, width: w, height: 180 },
      { x: 1100, y: 1410, width: w, height: 180 },
      { x: 1000, y: 1500, width: 200, height: w },

      // Room 112
      { x: 1250, y: 1310, width: 200, height: w },
      { x: 1150, y: 1410, width: w, height: 180 },
      { x: 1350, y: 1410, width: w, height: 180 },
      { x: 1250, y: 1500, width: 200, height: w },

      // Horizontal hallway wall above bottom rooms
      { x: 1200, y: 1300, width: 1600, height: w },
    ];
  }

  /**
   * Central commons area walls - defines the large open space
   */
  private static getCentralCommonsWalls(): WallConfig[] {
    const w = this.WALL_THICKNESS;
    return [
      // Top edge of commons
      { x: 800, y: 310, width: 600, height: w },

      // Left edge of commons (with gaps for doorways)
      { x: 390, y: 450, width: w, height: 100 },
      { x: 390, y: 650, width: w, height: 200 },
      { x: 390, y: 950, width: w, height: 300 },

      // Right edge of commons (with gaps for doorways)
      { x: 1680, y: 450, width: w, height: 100 },
      { x: 1680, y: 650, width: w, height: 200 },
      { x: 1680, y: 950, width: w, height: 300 },

      // Bottom edge of commons
      { x: 800, y: 1290, width: 600, height: w },

      // Interior dividing walls within commons area
      { x: 600, y: 600, width: w, height: 400 },
      { x: 900, y: 500, width: 200, height: w },
      { x: 1100, y: 700, width: w, height: 300 },

      // Small room divisions (like 112A, 112B, 112C)
      { x: 1400, y: 800, width: 200, height: w },
      { x: 1300, y: 900, width: w, height: 180 },
      { x: 1500, y: 900, width: w, height: 180 },
    ];
  }

  /**
   * Get spawn position for player (central commons area)
   */
  static getSpawnPosition(): { x: number; y: number } {
    return {
      x: 1000,
      y: 800,
    };
  }
}
