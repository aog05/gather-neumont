# Foundation Setup - Neumont Virtual Campus

**Date**: 2026-01-29  
**Goal**: Build the foundational game client with Phaser 3 - basic scene, player movement, and collision system

---

## Objective

Create a minimal, working prototype of the Neumont Virtual Campus using Phaser 3. This foundation will serve as the base for all future features. The implementation should be client-side only (no server/database integration yet).

---

## Requirements

### 1. Install Phaser 3

- Add `phaser` as a dependency using Bun
- Configure TypeScript types for Phaser 3 (`@types/phaser` if needed)

### 2. Project Structure

Create the following directory structure:

```
src/
├── scenes/
│   └── MainScene.ts          # Main game scene with building layout
├── utils/
│   └── collision.ts          # Collision detection utilities
├── components/                # React components (future use)
├── game.ts                    # Phaser game configuration
├── App.tsx                    # Main React app (wraps Phaser canvas)
├── frontend.tsx               # React entry point
├── index.html
├── index.css
└── index.ts                   # Bun server entry
```

### 3. Phaser Game Setup (`src/game.ts`)

Create a Phaser game configuration with:

- **Type**: `Phaser.AUTO` (WebGL with Canvas fallback)
- **Dimensions**: 800x600 (can be adjusted later)
- **Physics**: Arcade physics enabled
- **Scene**: MainScene
- **Parent**: Mount to a DOM element (e.g., `game-container`)
- **Background**: Black or neutral color

### 4. Main Scene (`src/scenes/MainScene.ts`)

Implement a Phaser Scene with:

#### a. Scene Setup
- Extend `Phaser.Scene`
- Use constructor with scene key (e.g., `'MainScene'`)
- Implement `preload()`, `create()`, and `update()` methods

#### b. Building Layout (Simple for MVP)
- **Walls**: Create white rectangles using `this.add.rectangle()` or `this.add.graphics()`
- **Layout**: Design a simple rectangular room or hallway
  - Example: Outer walls forming a 700x500 box with a few interior walls
  - Walls should be thick enough to be visible (e.g., 20-40 pixels)
  - Color: White (`0xFFFFFF`)
- **Physics Bodies**: Add static physics bodies to walls using `this.physics.add.existing(wall, true)`

#### c. Player
- **Appearance**: Blue square (50x50 pixels)
- **Create**: Use `this.add.rectangle(x, y, 50, 50, 0x0000FF)`
- **Physics**: Enable arcade physics on the player with `this.physics.add.existing(player)`
- **Properties**:
  - Set collision size/hitbox
  - Set initial position (center of room or spawn point)
  - Enable collision with world bounds if needed

#### d. Controls
- **Keyboard Input**: Use `this.input.keyboard.createCursorKeys()`
- **Movement**: WASD or Arrow keys
  - Set player velocity based on input (e.g., 200 pixels/second)
  - Stop movement when no keys pressed
  - Support diagonal movement

#### e. Collision
- **Wall Collision**: Use `this.physics.add.collider(player, wallsGroup)` 
- Create a physics group for walls to simplify collision handling
- Ensure player cannot pass through walls

#### f. Camera
- **Follow Player**: `this.cameras.main.startFollow(player)`
- **Zoom**: Set appropriate zoom level (1.0 for now)
- **Bounds**: Set camera bounds to match the building layout

### 5. Integration with React (`src/App.tsx`)

- Create a `<div id="game-container">` in the React component
- Initialize Phaser game on component mount (useEffect hook)
- Ensure game destroys properly on unmount to prevent memory leaks
- Keep it simple - just a game canvas for now

### 6. Styling (`src/index.css`)

- Remove default margins/padding from body
- Center the game canvas or position it appropriately
- Set a background color for the page

---

## Technical Specifications

### Player Movement

```typescript
// Example velocity values
const PLAYER_SPEED = 200;

// In update() method
if (cursors.left.isDown) {
  player.setVelocityX(-PLAYER_SPEED);
} else if (cursors.right.isDown) {
  player.setVelocityX(PLAYER_SPEED);
} else {
  player.setVelocityX(0);
}

// Same for Y-axis with up/down
```

### Wall Creation Pattern

```typescript
// Example wall group setup
const walls = this.physics.add.staticGroup();

// Outer walls
walls.create(400, 0, null).setSize(800, 20).setOrigin(0.5, 0.5); // Top
walls.create(400, 600, null).setSize(800, 20).setOrigin(0.5, 0.5); // Bottom
walls.create(0, 300, null).setSize(20, 600).setOrigin(0.5, 0.5); // Left
walls.create(800, 300, null).setSize(20, 600).setOrigin(0.5, 0.5); // Right

// Refresh physics bodies
walls.children.iterate((wall) => {
  if (wall instanceof Phaser.GameObjects.Rectangle) {
    wall.setFillStyle(0xFFFFFF); // White
  }
});
```

---

## Implementation Checklist

- [ ] Install Phaser 3 dependency (`bun add phaser`)
- [ ] Create `src/game.ts` with Phaser configuration
- [ ] Create `src/scenes/MainScene.ts` with basic scene structure
- [ ] Implement building walls (white rectangles with physics)
- [ ] Create player (blue square with physics enabled)
- [ ] Add keyboard controls for player movement
- [ ] Implement collision between player and walls
- [ ] Set up camera to follow player
- [ ] Integrate Phaser game into React component (`App.tsx`)
- [ ] Test player movement in all directions
- [ ] Test collision with walls (player cannot pass through)
- [ ] Verify game runs with `bun dev`

---

## Testing & Validation

After implementation, verify:

1. ✅ Game launches without errors in browser console
2. ✅ Player (blue square) is visible in the scene
3. ✅ Player moves smoothly in all 4 directions (or 8 with diagonals)
4. ✅ Player stops when keys are released
5. ✅ Player collides with walls and cannot pass through them
6. ✅ Walls are white and clearly visible
7. ✅ Camera follows the player
8. ✅ No console errors during gameplay

---

## Future Considerations (NOT for this prompt)

- Building floor plans based on real Neumont blueprints
- Tilemap integration for better map design
- Player sprites and animations
- Multiple floors and floor transitions
- NPCs and interactions
- Server/database integration
- User authentication and profiles

---

## Notes

- Keep code modular and well-organized for easy expansion
- Use TypeScript types properly (no `any` types unless absolutely necessary)
- Follow the existing project structure from CLAUDE.md
- Comment complex logic but avoid over-commenting
- This is an MVP - prioritize functionality over polish
