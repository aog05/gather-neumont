# NPC System Documentation

## Overview

The NPC (Non-Player Character) system allows for creating interactive characters throughout the virtual campus. NPCs can engage in branching dialogue conversations with the player using a JSON-based configuration system.

## Key Features

- **JSON-based configuration** - No code changes needed to add new NPCs
- **Branching dialogue trees** - Support for complex conversations with multiple paths
- **Conditions and actions** - Dialogue can check flags and trigger events
- **Dual-mode rendering** - Works with placeholder rectangles or sprite assets
- **Multi-floor support** - NPCs organized by floor for easy management

## File Structure

```
assets/
└── data/
    ├── npcs/
    │   ├── npc-registry.json      # Master index of all NPCs
    │   └── floor1-npcs.json       # NPCs for each floor
    └── dialogues/
        └── {npc_id}_intro.json    # Dialogue trees
```

## Creating an NPC

### 1. Add NPC Configuration

Edit the appropriate floor file (e.g., `floor1-npcs.json`):

```json
{
  "id": "unique_npc_id",
  "name": "Display Name",
  "role": "Job Title",
  "floor": 1,
  "position": {
    "x": 500,
    "y": 400
  },
  "sprite": {
    "key": "_placeholder",
    "tint": 16724565,
    "scale": 1
  },
  "interaction": {
    "radius": 80,
    "prompt": "Press E to talk"
  },
  "dialogue": {
    "treeId": "dialogue_tree_id",
    "defaultNode": "start"
  },
  "metadata": {
    "department": "Department Name",
    "office": "Room Number",
    "bio": "Short description"
  }
}
```

### 2. Create Dialogue Tree

Create a new file in `assets/data/dialogues/` (e.g., `my_npc_intro.json`):

```json
{
  "id": "my_npc_intro",
  "npcId": "unique_npc_id",
  "title": "NPC Name - Introduction",
  "nodes": {
    "start": {
      "id": "start",
      "type": "choice",
      "speaker": "NPC Name",
      "text": "Dialogue text goes here...",
      "responses": [
        {
          "id": "option1",
          "text": "First option",
          "next": "node_id"
        },
        {
          "id": "option2",
          "text": "Second option",
          "next": "another_node"
        }
      ]
    },
    "end_conversation": {
      "id": "end_conversation",
      "type": "end",
      "speaker": "NPC Name",
      "text": "Goodbye!"
    }
  }
}
```

### 3. Update NPC Registry

Add your NPC to `npc-registry.json`:

```json
{
  "unique_npc_id": {
    "name": "Display Name",
    "floor": 1,
    "file": "floor1-npcs.json"
  }
}
```

## Dialogue Node Types

### Choice Node
Presents multiple options to the player:

```json
{
  "type": "choice",
  "speaker": "NPC Name",
  "text": "What would you like to know?",
  "responses": [
    { "id": "opt1", "text": "Option 1", "next": "node1" },
    { "id": "opt2", "text": "Option 2", "next": "node2" }
  ]
}
```

### Dialogue Node
Auto-advances to next node after player clicks "Continue":

```json
{
  "type": "dialogue",
  "speaker": "NPC Name",
  "text": "Here's some information...",
  "next": "next_node_id"
}
```

### End Node
Terminates the conversation:

```json
{
  "type": "end",
  "speaker": "NPC Name",
  "text": "Goodbye!"
}
```

## Conditions and Actions

### Using Flags

Set a flag when dialogue is reached:

```json
{
  "actions": [
    {
      "type": "flag",
      "data": {
        "flag": "flag_name",
        "value": true
      }
    }
  ]
}
```

Check a flag before showing dialogue:

```json
{
  "conditions": [
    {
      "type": "flag",
      "check": "flag_name",
      "value": true
    }
  ]
}
```

### Future: Quest System

Once the quest system is implemented, you can use:

```json
{
  "actions": [
    {
      "type": "quest",
      "data": {
        "questId": "intro_quest",
        "action": "start"
      }
    }
  ]
}
```

## Positioning NPCs

Use the game's coordinate system to place NPCs:
- Ground floor map is 2400x1600 pixels
- Player spawns at (1000, 800)
- Place NPCs in logical locations (offices, hallways, common areas)

**Tips:**
- Test NPC placement by checking console logs for coordinates
- Interaction radius of 80 pixels works well for most cases
- Keep NPCs away from walls to avoid collision issues

## Sprite Configuration

### Placeholder Mode (Current)
```json
{
  "key": "_placeholder",
  "tint": 16724565,
  "scale": 1
}
```

Color tints (hex numbers):
- Red: 16724565 (0xff5555)
- Green: 5636095 (0x55ff55)
- Blue: 5592575 (0x5555ff)
- Orange: 16744448 (0xffa500)

### Sprite Mode (Future)
```json
{
  "key": "professor_sprite",
  "frame": 0,
  "scale": 1,
  "animations": {
    "idle": "professor_idle",
    "talk": "professor_talk"
  }
}
```

## Best Practices

1. **Keep dialogues focused** - One conversation topic per dialogue tree
2. **Use clear node IDs** - Name nodes descriptively (e.g., "ask_about_classes")
3. **Test all paths** - Ensure every branch leads to an end node
4. **Provide context** - Use the speaker field and clear text
5. **Use flags sparingly** - Only for important branching logic
6. **Give players choice** - Offer multiple response options when appropriate

## Testing Your NPCs

1. Start the dev server: `bun --hot src/index.ts`
2. Navigate to http://localhost:3000
3. Move player character near the NPC
4. Press 'E' when the prompt appears
5. Test all dialogue branches
6. Check browser console for errors

## Troubleshooting

**NPC doesn't appear:**
- Check console for JSON parsing errors
- Verify file paths are correct
- Ensure floor number matches

**Interaction prompt doesn't show:**
- Check interaction radius (default: 80)
- Verify player is within range
- Check console for errors

**Dialogue doesn't advance:**
- Ensure all nodes have proper `next` or `responses` fields
- Check for typos in node IDs
- Verify end nodes are marked with `type: "end"`

**Player can still move during dialogue:**
- This should not happen - check console for errors
- Ensure GameEventBridge is emitting dialogue:start event

## Example: Complete NPC Setup

See the existing NPCs for examples:
- `prof_smith` - Professor with class information
- `admissions_staff` - Admissions counselor
- `tech_support` - IT support with conditional dialogue

## Support

For questions or issues with the NPC system, check:
1. Browser console for error messages
2. Existing NPC configurations for examples
3. This documentation for reference

## Future Enhancements

Planned features:
- Voice acting support
- NPC schedules (movement over time)
- Dynamic dialogue based on player progress
- Visual dialogue tree editor
- Multiple conversation topics per NPC
