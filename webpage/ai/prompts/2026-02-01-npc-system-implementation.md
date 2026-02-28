# NPC System Implementation Prompt

## Overview
Implement a comprehensive NPC (Non-Player Character) system for the Neumont Virtual Campus that allows for creation, placement, sprite configuration, and interactive dialogue trees. NPCs should represent faculty, staff, and other characters that enhance the campus exploration experience.

## 1. NPC Data Structure & Configuration

### 1.1 NPC Definition Schema
Create a JSON-based configuration system for defining NPCs with the following properties:

```typescript
interface NPCConfig {
  id: string;                          // Unique identifier (e.g., "prof_smith")
  name: string;                        // Display name (e.g., "Professor Smith")
  role: string;                        // Title/role (e.g., "CS Professor", "Admissions Staff")
  floor: number;                       // Floor number (1-4)
  position: {
    x: number;                         // X coordinate in game world
    y: number;                         // Y coordinate in game world
  };
  sprite: {
    key: string;                       // Sprite asset key
    frame?: number;                    // Optional starting frame
    scale?: number;                    // Sprite scale (default: 1)
    animations?: {
      idle?: string;                   // Idle animation key
      talk?: string;                   // Talking animation key
    };
  };
  interaction: {
    radius: number;                    // Interaction distance in pixels
    prompt: string;                    // Interaction prompt text (e.g., "Press E to talk")
    icon?: string;                     // Optional interaction icon
  };
  dialogue: {
    treeId: string;                    // Reference to dialogue tree
    defaultNode: string;               // Starting dialogue node ID
  };
  metadata?: {
    department?: string;
    office?: string;
    availability?: string;
    bio?: string;
  };
}
```

### 1.2 Storage Location
- Create `assets/data/npcs/` directory for NPC configuration files
- Organize by floor: `floor1-npcs.json`, `floor2-npcs.json`, etc.
- Create a master `npc-registry.json` that indexes all NPCs

## 2. NPC Manager Class

### 2.1 Core Functionality
Create an `NPCManager` class to handle:

- **Loading**: Parse JSON configs and instantiate NPC sprites in Phaser scenes
- **Registration**: Track all active NPCs in the current scene
- **Updates**: Handle proximity detection for interaction prompts
- **Cleanup**: Properly destroy NPCs when changing floors/scenes

### 2.2 Key Methods
```typescript
class NPCManager {
  loadNPCs(scene: Phaser.Scene, floor: number): void;
  createNPC(scene: Phaser.Scene, config: NPCConfig): NPC;
  getNPC(id: string): NPC | null;
  checkPlayerProximity(player: Phaser.GameObjects.Sprite): void;
  destroyAll(): void;
}
```

## 3. NPC Game Object Class

### 3.1 Individual NPC Behavior
Create an `NPC` class that extends or wraps Phaser.GameObjects.Sprite:

```typescript
class NPC extends Phaser.GameObjects.Sprite {
  config: NPCConfig;
  interactionZone: Phaser.Geom.Circle;
  isPlayerNearby: boolean;

  constructor(scene: Phaser.Scene, config: NPCConfig);
  update(player: Phaser.GameObjects.Sprite): void;
  showInteractionPrompt(): void;
  hideInteractionPrompt(): void;
  startDialogue(): void;
  playIdleAnimation(): void;
  playTalkAnimation(): void;
}
```

### 3.2 Visual Indicators
- Display interaction prompt above NPC when player is in range
- Add subtle visual effects (glow, bounce animation, icon) to indicate interactability
- Show NPC name tag on hover or proximity

## 4. Dialogue Tree System

### 4.1 Dialogue Data Structure
Create a flexible dialogue tree format:

```typescript
interface DialogueTree {
  id: string;                          // Tree identifier (e.g., "prof_smith_intro")
  npcId: string;                       // Associated NPC
  nodes: {
    [nodeId: string]: DialogueNode;
  };
}

interface DialogueNode {
  id: string;                          // Node identifier
  type: 'dialogue' | 'choice' | 'end'; // Node type
  speaker: string;                     // Who is speaking (NPC name)
  text: string;                        // Dialogue text
  avatar?: string;                     // Optional avatar image key
  responses?: DialogueResponse[];      // Player response options
  next?: string;                       // Next node ID (for linear dialogue)
  actions?: DialogueAction[];          // Trigger events (quests, items, etc.)
  conditions?: DialogueCondition[];    // Requirements to show this node
}

interface DialogueResponse {
  id: string;
  text: string;                        // Response text shown to player
  next: string;                        // Next node ID to jump to
  requirements?: DialogueCondition[];  // Optional requirements to show option
}

interface DialogueAction {
  type: 'quest' | 'item' | 'flag' | 'custom';
  data: any;
}

interface DialogueCondition {
  type: 'flag' | 'quest' | 'item' | 'custom';
  check: string;                       // What to check
  value: any;                          // Expected value
}
```

### 4.2 Dialogue Storage
- Store dialogue trees in `assets/data/dialogues/`
- Name files by NPC or conversation: `prof_smith_dialogues.json`
- Support multiple dialogue trees per NPC for different contexts

### 4.3 Dialogue Manager
Create a `DialogueManager` class to:

- Load dialogue tree data
- Navigate through dialogue nodes
- Evaluate conditions and actions
- Track conversation state
- Handle branching logic

```typescript
class DialogueManager {
  currentTree: DialogueTree | null;
  currentNode: DialogueNode | null;
  history: string[];                   // Track visited nodes

  loadTree(treeId: string): void;
  startDialogue(startNodeId: string): void;
  selectResponse(responseId: string): void;
  getCurrentNode(): DialogueNode | null;
  evaluateConditions(conditions: DialogueCondition[]): boolean;
  executeActions(actions: DialogueAction[]): void;
  endDialogue(): void;
}
```

## 5. Dialogue UI Component

### 5.1 React Component
Create a React component for the dialogue interface:

```typescript
interface DialogueUIProps {
  node: DialogueNode;
  onResponseSelect: (responseId: string) => void;
  onClose: () => void;
}
```

### 5.2 UI Features
- **Dialogue Box**: Display NPC dialogue text at bottom of screen
- **Speaker Info**: Show NPC name and optional avatar
- **Response Options**: List player response choices as clickable buttons
- **Type Writer Effect**: Animate text appearing character by character
- **Skip/Fast-forward**: Allow players to skip animation
- **Close Button**: Exit conversation
- **History**: Optional button to review previous dialogue

### 5.3 Styling
- Dark semi-transparent background overlay
- Styled dialogue box matching game aesthetic (Gather-like)
- Clear typography for readability
- Hover states for response options
- Responsive layout

## 6. Player Interaction System

### 6.1 Interaction Detection
- Check distance between player and NPC each frame
- Display interaction prompt when within `interaction.radius`
- Highlight nearest NPC if multiple are in range

### 6.2 Input Handling
- Bind interaction key (e.g., 'E', Space, or click)
- Trigger `startDialogue()` on NPC when pressed
- Disable player movement during dialogue
- Handle dialogue UI input separately from game input

### 6.3 State Management
Create a simple state machine:
- `EXPLORING` - Normal gameplay
- `DIALOGUE` - In conversation (disable movement)
- `DIALOGUE_TRANSITION` - Fading in/out

## 7. Integration with Existing Codebase

### 7.1 Scene Integration
- Modify scene files in `src/scenes/` to instantiate NPCManager
- Add NPC loading in scene `create()` method
- Update scene `update()` method to check NPC proximity

### 7.2 Map Integration
- Reference NPC positions based on floor plan blueprints
- Ensure NPCs are placed in logical locations (offices, hallways, classrooms)
- Add collision detection so NPCs act as obstacles

### 7.3 Asset Loading
- Add NPC sprite loading in scene `preload()` methods
- Load dialogue JSON files at game startup
- Implement lazy loading for dialogue trees if needed

## 8. Example Implementation Flow

### 8.1 Initialization
1. Scene loads → NPCManager instantiated
2. NPCManager reads `floor1-npcs.json`
3. For each NPC config, create NPC instance with sprite
4. Add NPCs to scene and collision system

### 8.2 Runtime
1. Player moves near NPC → proximity check triggers
2. NPC shows interaction prompt
3. Player presses 'E' → `NPC.startDialogue()` called
4. DialogueManager loads dialogue tree
5. React DialogueUI component renders
6. Player selects responses → navigate dialogue tree
7. Dialogue ends → UI closes, player control restored

## 9. File Structure

```
assets/
├── data/
│   ├── npcs/
│   │   ├── npc-registry.json
│   │   ├── floor1-npcs.json
│   │   ├── floor2-npcs.json
│   │   ├── floor3-npcs.json
│   │   └── floor4-npcs.json
│   └── dialogues/
│       ├── prof_smith.json
│       ├── admissions_staff.json
│       └── ...
└── spritesheets/
    └── npcs/
        ├── professor1.png
        ├── staff1.png
        └── ...

src/
├── entities/
│   ├── NPC.ts
│   └── NPCManager.ts
├── systems/
│   └── DialogueManager.ts
├── components/
│   └── DialogueUI.tsx
└── scenes/
    └── (integrate into existing scenes)
```

## 10. Testing Checklist

- [ ] NPCs load correctly on each floor
- [ ] Interaction prompts appear at correct distance
- [ ] Dialogue UI displays properly
- [ ] Response selection navigates tree correctly
- [ ] Player movement disabled during dialogue
- [ ] Dialogue conditions evaluated correctly
- [ ] Multiple NPCs can exist in same scene
- [ ] NPCs properly destroyed when changing floors
- [ ] Sprite animations play correctly
- [ ] No memory leaks from dialogue system

## 11. Future Enhancements (Post-MVP)

- Quest system integration with dialogue actions
- Dynamic dialogue based on player progress/stats
- Voice acting support
- NPC schedules (move between locations by time)
- Randomized idle behaviors
- Multiple conversation topics per NPC
- Reputation system affecting dialogue options

## 12. Technical Constraints

- Use TypeScript for all new code
- Follow existing ESLint + Prettier configuration
- Use Phaser 3 best practices for game object management
- Integrate React for UI components (not Phaser UI)
- Store data in JSON (database integration can come later)
- Optimize for performance (limit proximity checks, efficient rendering)

## 13. Success Criteria

A successful implementation will:
1. Allow non-developers to add new NPCs via JSON configuration
2. Support complex branching dialogue without code changes
3. Provide smooth, intuitive player interaction
4. Match the Gather-like aesthetic of the virtual campus
5. Scale to dozens of NPCs across 4 floors without performance issues
6. Be maintainable and well-documented

---

**Estimated Complexity**: Medium-High
**Dependencies**: Phaser 3, React, TypeScript
**Priority**: High (Core feature for campus interaction)
