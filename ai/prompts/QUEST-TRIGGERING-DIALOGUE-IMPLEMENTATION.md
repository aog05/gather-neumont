# Quest-Triggering Dialogue System Implementation

## Objective
Implement a quest-triggering dialogue system for Dean Walsh NPC to demonstrate Firebase quest integration.

## Implementation Summary

### 1. New Quest Created: "Explore Neumont"
**File**: `src/lib/firestore-seed.ts` (Lines 508-514)

Added a new standalone quest to the seed data:
- **Title**: "Explore Neumont"
- **Description**: "Take a tour of the Neumont campus and discover all the different areas"
- **Reward**: 150 Points
- **Next**: "" (standalone quest, not part of a chain)
- **Quest Index**: 15 (createdIds.quests[15])
- **Chain Position**: "standalone-4"

### 2. Updated Dean Walsh Dialogue Tree
**File**: `src/lib/firestore-seed.ts` (Lines 588-601)

#### Changes Made:
1. **Updated walsh-greeting node** (Line 589):
   - Added new response option: "Where do I go first?"
   - Links to new dialogue node: "walsh-campus-tour"
   - Added speaker name prefix: "Dean Jennifer Walsh:"

2. **Created new walsh-campus-tour node** (Line 598):
   - **Content**: "Dean Jennifer Walsh: Great question! Let me give you a quest to explore our beautiful campus. Visit each floor and get familiar with the building!"
   - **Paths**: { "Thanks, I'll start exploring!": "PLACEHOLDER_walsh-end" }
   - **TriggeredQuest**: `createdIds.quests[15]` (the "Explore Neumont" quest)

3. **Added speaker name prefix** to all Dean Walsh dialogue content for proper NPC name extraction

### 3. Updated Path Linking
**File**: `src/lib/firestore-seed.ts` (Lines 648-657)

Added path linking for the new dialogue node:
```typescript
await updatePaths("walsh-campus-tour", { "Thanks, I'll start exploring!": "PLACEHOLDER_walsh-end" });
```

## How It Works

### Quest Triggering Flow:
1. **Player interacts with Dean Walsh** → DialogueManager loads "walsh-greeting" node
2. **Player selects "Where do I go first?"** → DialogueManager navigates to "walsh-campus-tour" node
3. **FirestoreDialogueService converts TriggeredQuest** → Creates action object:
   ```typescript
   {
     type: "quest",
     data: {
       questId: createdIds.quests[15], // "Explore Neumont" quest ID
       action: "start"
     }
   }
   ```
4. **DialogueManager executes actions** → Calls `gameState.startQuest(questId, data)`
5. **GameState adds quest to Firebase** → Updates player's ActiveQuests array
6. **Quest appears in Quest Tracker UI** → Player sees new quest

## Testing Instructions

### Step 1: Re-run the Seed Script
```bash
bun run src/lib/firestore-seed.ts --clear
```
**Note**: The `--clear` flag will delete existing data and reseed from scratch.

### Step 2: Build the Project
```bash
bun run build
```

### Step 3: Start the Dev Server
```bash
bun run dev
```

### Step 4: Test in Browser
1. Load the game
2. Approach Dean Walsh NPC (Floor 1)
3. Press `E` to interact
4. Select "Where do I go first?" from dialogue options
5. Verify dialogue shows: "Great question! Let me give you a quest to explore our beautiful campus..."
6. Select "Thanks, I'll start exploring!"
7. Check console for quest trigger logs

### Step 5: Verify in Firebase Console
1. Navigate to Firebase Console → Firestore Database
2. Go to Player collection
3. Find sarah_dev document (ID: `km9riQFfVkJBseHUVvft`)
4. Check ActiveQuests array
5. Should now contain the "Explore Neumont" quest ID
6. Should show 3 active quests (was 2, now 3)

### Step 6: Verify in Quest Tracker UI
1. Check top-right corner of game screen
2. Quest Tracker should display the new quest
3. Quest title: "Explore Neumont"
4. Quest description: "Take a tour of the Neumont campus and discover all the different areas"
5. Reward: 150 Points

## Expected Console Output

```
[DialogueManager] Starting dialogue with NPC: dean_walsh
[DialogueManager] Loaded dialogue tree: walsh-greeting
[DialogueManager] Player selected response: "Where do I go first?"
[DialogueManager] Navigating to node: walsh-campus-tour
[DialogueManager] Executing quest action: start quest {questId}
[GameState] Starting quest: {questId}
[Firebase] Adding quest to player ActiveQuests
[useQuestData] Quest added, reloading quest data
[useQuestData] Loaded 3 active quests
```

## Files Modified

1. ✅ `src/lib/firestore-seed.ts` - Added quest and updated dialogue tree
   - Lines 508-514: Added "Explore Neumont" quest
   - Lines 546: Updated console log (3 chains + 4 standalone)
   - Lines 588-601: Updated Dean Walsh dialogue tree
   - Lines 648-657: Updated path linking

## Technical Details

### Existing Systems Used:
- **FirestoreDialogueService** (Lines 187-197): Converts `TriggeredQuest` to action objects
- **DialogueManager** (Lines 363-377): Executes quest actions via `executeActions()` method
- **GameState**: Manages quest state (startQuest, completeQuest methods)
- **useQuestData Hook**: Fetches and displays quest data in UI

### No Additional Code Required:
All quest-triggering infrastructure was already in place. Only needed to:
1. Add the new quest to seed data
2. Update Dean Walsh's dialogue tree
3. Set the TriggeredQuest field

---

**Date**: 2026-02-07
**Status**: ✅ Implementation Complete - Ready for Testing

