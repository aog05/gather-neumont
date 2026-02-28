# Ground Floor Layout - Neumont Virtual Campus

**Date**: 2026-01-30  
**Goal**: Create accurate ground floor layout based on blueprint, refactor wall creation out of MainScene.ts

---

## Objective

Implement the ground floor layout of the Neumont building using the blueprint image at `assets/images/map/ground_floor_blueprint.png`. Walls should be created using primitive shapes (rectangles) and stored in a separate map file for better code organization.

---

## Requirements

### 1. Analyze the Blueprint

Study `assets/images/map/ground_floor_blueprint.png` carefully:

- **Layout**: Large central common area with rooms along the perimeter
- **Rooms**: Multiple classrooms/offices numbered 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 112A, 112B, 112C, 113, 114, 115, 117, 118, 119
- **Features**: Staircases, bathrooms, hallways, doorways
- **Walls**: Both exterior perimeter walls and interior room dividers
- **Scale**: Determine approximate scale/dimensions for game world

### 2. Create Ground Floor Map File

Create `src/scenes/maps/GroundFloor.ts`:

#### File Structure

```typescript
import Phaser from "phaser";

export interface WallConfig {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class GroundFloor {
  /**
   * Creates and returns all walls for the ground floor
   * @param scene - The Phaser scene to add walls to
   * @param wallGroup - The static physics group to add walls to
   */
  static createWalls(
    scene: Phaser.Scene,
    wallGroup: Phaser.Physics.Arcade.StaticGroup
  ): void {
    const walls = this.getWallConfigs();
    
    walls.forEach((config) => {
      const wall = scene.add.rectangle(
        config.x,
        config.y,
        config.width,
        config.height,
        0xffffff
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
      // OUTER PERIMETER WALLS
      // Top wall
      { x: /* calculated */, y: /* calculated */, width: /* calculated */, height: 20 },
      
      // Bottom wall
      { x: /* calculated */, y: /* calculated */, width: /* calculated */, height: 20 },
      
      // Left wall
      { x: /* calculated */, y: /* calculated */, width: 20, height: /* calculated */ },
      
      // Right wall
      { x: /* calculated */, y: /* calculated */, width: 20, height: /* calculated */ },
      
      // INTERIOR WALLS - Room 101
      // ... detailed wall definitions
      
      // INTERIOR WALLS - Room 102
      // ... detailed wall definitions
      
      // Continue for all rooms...
    ];
  }
}
```

### 3. Map the Blueprint to Coordinates

#### Scale Determination

1. **Choose Game Dimensions**: Decide on total game world size (e.g., 2400x1600 pixels)
2. **Measure Blueprint**: Estimate the blueprint's aspect ratio and overall dimensions
3. **Create Coordinate System**: Map blueprint coordinates to game coordinates
   - Blueprint is roughly 3:2 aspect ratio (wider than tall)
   - Center the layout or align to top-left (0, 0)

#### Wall Mapping Strategy

For each visible wall in the blueprint:

1. **Identify Wall Segments**: Break down the layout into individual rectangular wall pieces
2. **Measure Position**: Determine x, y coordinates (center of rectangle)
3. **Measure Dimensions**: Determine width and height
4. **Group Logically**: Organize by room or area (use comments)

**Key Areas to Map:**

- **Exterior Perimeter**: The building's outer walls
- **Room 101** (large room, upper-left): All 4 walls with doorway gaps
- **Central Commons Area**: Large open space with no walls (but surrounded by walls)
- **Rooms 102-119**: Each room's walls and doorways
- **Hallways**: Walls forming corridors
- **Staircases**: Walls around stairwell areas (visible on left and right sides)
- **Bathrooms**: Walls for bathroom areas

#### Doorway Handling

- **Option 1**: Leave gaps in walls where doorways exist (no rectangle)
- **Option 2**: Create full walls and add doorway logic later
- **Recommended**: Use Option 1 - create wall segments with gaps for doors

### 4. Refactor MainScene.ts

Update `src/scenes/MainScene.ts`:

#### Changes Required

1. **Remove Hard-Coded Walls**: Delete all wall creation code (lines 36-101)
2. **Import GroundFloor**: Add `import { GroundFloor } from "./maps/GroundFloor";`
3. **Use Map Function**: Replace wall creation with:

```typescript
// In create() method
const walls = this.physics.add.staticGroup();

// Create ground floor layout
GroundFloor.createWalls(this, walls);

// Rest of the code (player creation, collision, etc.) remains the same
```

4. **Update Camera Bounds**: Adjust camera bounds to match new map dimensions:

```typescript
// Example for larger map
const MAP_WIDTH = 2400;
const MAP_HEIGHT = 1600;

this.cameras.main.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);
this.physics.world.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);
```

5. **Update Player Spawn**: Place player in an appropriate starting location (e.g., entrance or center of commons area)

```typescript
// Example: spawn in central commons area
this.player = this.add.rectangle(
  1200, // center-ish X
  800,  // center-ish Y
  PLAYER_SIZE,
  PLAYER_SIZE,
  0x0000ff,
);
```

### 5. Implementation Guidelines

#### Coordinate System

- **Origin**: Top-left corner is (0, 0)
- **X-axis**: Increases to the right
- **Y-axis**: Increases downward
- **Rectangle Position**: Rectangles are positioned by their center point by default

#### Wall Thickness

- Use consistent wall thickness: `20` pixels (as currently defined in WALL_THICKNESS constant)
- May need thicker walls for very large maps to maintain visibility

#### Accuracy vs. Playability

- **Goal**: Approximate the blueprint as closely as possible
- **Acceptable**: Minor simplifications for complex irregular shapes
- **Required**: All major rooms, hallways, and structural walls
- **Optional**: Very small details or decorative elements

#### Code Organization

- Group walls logically with comments (by room or area)
- Consider splitting into multiple helper methods if wall array becomes very large
- Example:

```typescript
private static getWallConfigs(): WallConfig[] {
  return [
    ...this.getPerimeterWalls(),
    ...this.getRoom101Walls(),
    ...this.getRoom102Walls(),
    // ... etc
  ];
}

private static getPerimeterWalls(): WallConfig[] {
  return [
    // Outer walls
  ];
}

private static getRoom101Walls(): WallConfig[] {
  return [
    // Room 101 walls
  ];
}
```

---

## Implementation Checklist

- [ ] Analyze ground floor blueprint thoroughly
- [ ] Determine game world dimensions and scale
- [ ] Create `src/scenes/maps/GroundFloor.ts` file
- [ ] Define `WallConfig` interface
- [ ] Create `GroundFloor` class with static methods
- [ ] Map exterior perimeter walls
- [ ] Map interior walls for all rooms (101-119)
- [ ] Map hallway walls
- [ ] Map staircase walls
- [ ] Include doorway gaps where appropriate
- [ ] Refactor `MainScene.ts` to import and use `GroundFloor`
- [ ] Remove hard-coded walls from `MainScene.ts`
- [ ] Update camera bounds for new map size
- [ ] Update player spawn position
- [ ] Test player collision with all walls
- [ ] Test player movement throughout the map
- [ ] Verify doorways are accessible

---

## Testing & Validation

After implementation, verify:

1. ✅ All exterior walls are present and form complete perimeter
2. ✅ Each numbered room (101-119) has correct walls
3. ✅ Doorways exist where they should (player can enter/exit rooms)
4. ✅ Player collides with all walls correctly
5. ✅ Player cannot walk through walls
6. ✅ Player can navigate through hallways
7. ✅ Central commons area is open and accessible
8. ✅ Layout closely matches blueprint when visually comparing
9. ✅ No console errors during gameplay
10. ✅ Camera follows player across entire map
11. ✅ Map dimensions are reasonable for gameplay

---

## Blueprint Reference Notes

From `ground_floor_blueprint.png`:

- **Rooms visible**: 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 112A, 112B, 112C, 113, 114, 115, 117, 118, 119
- **Large central area**: Open commons/gathering space
- **Staircases**: At least 2 visible stairwell areas
- **Bathrooms**: Present in the layout
- **Overall shape**: Roughly rectangular with some variations
- **Colored markers**: (Yellow, purple, orange squares) - likely furniture/fixtures, can be ignored for wall layout

---

## Future Enhancements (NOT for this prompt)

- Add door objects with interaction
- Add furniture and fixtures based on colored markers in blueprint
- Add room labels/numbers as text overlays
- Implement other floors (basement, 2nd, 3rd, 4th)
- Add staircase functionality for floor transitions
- Tilemap integration for better visual representation
- Add spawn points and waypoints data to map file

---

## Notes

- **Precision**: Aim for accuracy but recognize some estimation is necessary
- **Iteration**: First pass can be rough; refine coordinates after testing
- **Modularity**: Keeping maps separate from scene logic enables easy updates
- **Documentation**: Comment wall groups clearly for future maintenance
- **Scale**: Blueprint may need to be scaled up for playable game dimensions
- **Performance**: Using rectangles for walls is performant enough for this use case
