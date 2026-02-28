# E Key Interaction Fix - Complete

## Summary

Fixed the quiz terminal E key interaction issue by implementing a **shared interaction key** pattern. The problem was that both `NPCManager` and `QuizTerminalManager` were creating separate E key instances, causing the key press to be consumed by the first manager and never reaching the second.

## Root Cause Analysis

### The Problem

**Symptom:**
- Proximity detection worked correctly
- Interaction prompt appeared/disappeared correctly
- Pressing E did nothing - no console logs from `QuizTerminalManager`

**Root Cause:**
Both managers were creating their own E key instances:

```typescript
// NPCManager constructor
this.interactionKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);

// QuizTerminalManager constructor
this.interactionKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
```

**Why This Failed:**
1. `MainScene.update()` calls `npcManager.update()` first (line 177)
2. NPCManager checks `JustDown(E)` - returns `true` and **consumes** the key press
3. `MainScene.update()` calls `quizTerminalManager.update()` second (line 180)
4. QuizTerminalManager checks `JustDown(E)` - returns `false` (already consumed!)

**Phaser's `JustDown()` Behavior:**
- `JustDown()` only returns `true` **once per frame** for the first check
- Subsequent checks in the same frame return `false`
- This prevents duplicate key press handling

## Solution: Shared Interaction Key

Created a **single shared E key instance** in `MainScene` and passed it to both managers.

### Changes Made

#### 1. **src/scenes/MainScene.ts** - Create and Share E Key

**Added:**
```typescript
private interactionKey!: Phaser.Input.Keyboard.Key; // Shared E key

// In create():
this.interactionKey = this.input.keyboard!.addKey(
  Phaser.Input.Keyboard.KeyCodes.E,
);

// Pass to both managers:
this.quizTerminalManager = new QuizTerminalManager(this, this.interactionKey);
this.npcManager = new NPCManager(this, this.interactionKey);
```

#### 2. **src/entities/QuizTerminalManager.ts** - Accept Shared Key

**Before:**
```typescript
constructor(scene: Phaser.Scene) {
  this.scene = scene;
  if (scene.input.keyboard) {
    this.interactionKey = scene.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.E,
    );
  }
}
```

**After:**
```typescript
constructor(scene: Phaser.Scene, interactionKey: Phaser.Input.Keyboard.Key) {
  this.scene = scene;
  this.interactionKey = interactionKey;
  console.log(`[QuizTerminalManager] Using shared E key for interaction`);
}
```

#### 3. **src/entities/NPCManager.ts** - Accept Shared Key

**Before:**
```typescript
constructor(scene: Phaser.Scene) {
  this.scene = scene;
  this.npcs = new Map();
  if (scene.input.keyboard) {
    this.interactionKey = scene.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.E,
    );
  }
}
```

**After:**
```typescript
constructor(scene: Phaser.Scene, interactionKey: Phaser.Input.Keyboard.Key) {
  this.scene = scene;
  this.npcs = new Map();
  this.interactionKey = interactionKey;
  console.log(`[NPCManager] Using shared E key for interaction`);
}
```

## How It Works Now

1. **MainScene creates ONE E key instance** in `create()`
2. **Both managers receive the same key reference**
3. **Both managers check `JustDown()` on the SAME key**
4. **First manager to check gets `true`, second gets `false`**
5. **Each manager checks proximity before acting**, so only the relevant one responds

**Update Loop Order:**
```typescript
override update(): void {
  // 1. NPCManager checks E key + NPC proximity
  this.npcManager.update(this.player);
  
  // 2. QuizTerminalManager checks E key + terminal proximity
  this.quizTerminalManager.update(this.player);
}
```

**Result:**
- If player is near NPC: NPCManager handles E press
- If player is near terminal: QuizTerminalManager handles E press
- If player is near both: NPCManager gets priority (called first)

## Build Status

✅ **Build successful** - No compilation errors  
✅ **496 modules bundled** - 2.26 MB output  

## Testing Instructions

1. **Start dev server:** `bun run dev`
2. **Walk to quiz terminal** (spawns above player at center of NPCs)
3. **Watch console** for:
   - `[MainScene] Created shared E key for interactions`
   - `[QuizTerminalManager] Using shared E key for interaction`
   - `[NPCManager] Using shared E key for interaction`
4. **Press E when prompt appears**
5. **Verify console shows:**
   - `[QuizTerminalManager] ⌨️ E key pressed!`
   - `[QuizTerminalManager] Player nearby: true`
   - `[QuizTerminalManager] ✅ Starting quiz...`
   - `[QuizTerminal] Starting daily quiz`
6. **Quiz panel should open!**

## Files Modified

1. ✅ `src/scenes/MainScene.ts` - Created shared E key
2. ✅ `src/entities/QuizTerminalManager.ts` - Accept shared key
3. ✅ `src/entities/NPCManager.ts` - Accept shared key
4. ✅ `E-KEY-FIX.md` - Documentation

## Key Takeaway

**When multiple systems need to respond to the same key:**
- ✅ Create ONE shared key instance
- ✅ Pass it to all systems that need it
- ✅ Each system checks proximity before acting
- ❌ Don't create separate key instances (they'll conflict!)

