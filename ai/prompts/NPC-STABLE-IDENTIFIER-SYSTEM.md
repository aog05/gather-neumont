# NPC Stable Identifier System Implementation

## Problem Solved
The NPC system was fragile and broke whenever the Firebase database was reseeded because NPCs referenced dialogue trees by Firestore auto-generated document IDs, which changed with each reseed operation.

## Solution Overview
Implemented a stable, name-based lookup system that uses predictable string identifiers instead of Firestore document IDs. This allows the game to continue working after database reseeds without manual configuration updates.

## Changes Made

### 1. Updated Firestore Type Definitions
**File**: `src/types/firestore.types.ts`

#### NPC Interface (Lines 154-169)
- Changed `dialogueReference: string` → `dialogueTreeId: string`
- Now stores stable tree identifier (e.g., "walsh-greeting") instead of Firestore document ID

#### Dialogue Interface (Lines 269-292)
- Added `treeId: string` field
- Stable identifier for dialogue nodes (e.g., "walsh-greeting", "chen-courses")
- Used for lookups instead of Firestore document ID

### 2. Added Helper Functions
**File**: `src/lib/firestore-helpers.ts` (Lines 187-211)

Added two new query functions:
```typescript
async getDialogueByTreeId(treeId: string)
async getNPCByName(name: string)
```

These enable querying by stable identifiers instead of document IDs.

### 3. Updated Seed Script
**File**: `src/lib/firestore-seed.ts`

#### Dialogue Seeding (Lines 603-615)
- Added `treeId` field to each dialogue document
- Use `treeId` as the Firestore document ID via `addDocument(collection, data, customId)`
- This makes document IDs predictable and stable across reseeds

**Before**:
```typescript
const id = await addDocument<Dialogue>(COLLECTIONS.DIALOGUE, dialogue);
```

**After**:
```typescript
const dialogueWithTreeId = { ...dialogue, treeId };
const id = await addDocument<Dialogue>(COLLECTIONS.DIALOGUE, dialogueWithTreeId, treeId);
```

#### NPC Seeding (Lines 677-724)
- Changed from `dialogueReference: createdIds.dialogues[0]` (unstable)
- To `dialogueTreeId: "chen-greeting"` (stable)

**Example**:
```typescript
{
  Name: "Dr. Sarah Chen",
  dialogueTreeId: "chen-greeting", // Stable identifier
  // ... other fields
}
```

### 4. Updated FirestoreDialogueService
**File**: `src/services/FirestoreDialogueService.ts` (Lines 24-65)

Enhanced `loadDialogueTree()` to support both stable tree IDs and legacy document IDs:

1. **Try stable treeId first**: Query by `treeId` field using `getDialogueByTreeId()`
2. **Fallback to document ID**: If not found, try as Firestore document ID (legacy support)
3. **Cache multiple keys**: Cache using both treeId and document ID for performance

**Key Features**:
- Backward compatible with old document ID references
- Comprehensive logging for debugging
- Multi-key caching for optimal performance

### 5. Updated NPC Configuration
**File**: `assets/data/npcs/floor1-npcs.json`

Replaced all hardcoded Firestore document IDs with stable tree identifiers:

**Before**:
```json
{
  "id": "prof_smith",
  "name": "Professor Smith",
  "dialogue": {
    "treeId": "xmdGuYmwER5goXk2DgGG",  // Unstable Firestore ID
    "defaultNode": "xmdGuYmwER5goXk2DgGG"
  }
}
```

**After**:
```json
{
  "id": "dean_walsh",
  "name": "Dean Jennifer Walsh",
  "dialogue": {
    "treeId": "walsh-greeting",  // Stable identifier
    "defaultNode": "walsh-greeting"
  }
}
```

Updated all 3 NPCs:
- Dean Jennifer Walsh → `walsh-greeting`
- Dr. Sarah Chen → `chen-greeting`
- Professor Mike Rodriguez → `rodriguez-greeting`

## How It Works

### Dialogue Tree Lookup Flow:
1. **NPC loads**: Reads `dialogue.treeId` from JSON config (e.g., "walsh-greeting")
2. **Service queries**: `FirestoreDialogueService.loadDialogueTree("walsh-greeting")`
3. **Database lookup**: Queries Firestore where `treeId == "walsh-greeting"`
4. **Tree building**: Builds complete dialogue tree from root node
5. **Caching**: Caches tree for future use

### Stable Document IDs:
- Dialogue documents now use their `treeId` as the Firestore document ID
- Example: Document ID = "walsh-greeting", treeId field = "walsh-greeting"
- This makes IDs predictable and stable across reseeds

## Benefits

1. **Reseed-Safe**: Database can be cleared and reseeded without breaking NPCs
2. **No Manual Updates**: JSON config files don't need updates after reseeds
3. **Readable IDs**: "walsh-greeting" is more meaningful than "xmdGuYmwER5goXk2DgGG"
4. **Backward Compatible**: Still supports legacy document ID lookups
5. **Better Debugging**: Stable IDs make logs easier to understand

## Testing Instructions

### 1. Reseed the Database
```bash
bun run src/lib/firestore-seed.ts --clear
```

### 2. Build the Project
```bash
bun run build
```

### 3. Start the Dev Server
```bash
bun run dev
```

### 4. Verify NPCs Load Correctly
- All 3 NPCs should appear on Floor 1
- Names should display correctly (loaded from Firebase dialogue)
- Interactions should work without errors

### 5. Check Console Logs
Expected output:
```
[FirestoreDialogueService] Loading dialogue tree: walsh-greeting
[FirestoreDialogueService] Loaded dialogue tree: walsh-greeting (treeId: walsh-greeting)
[NPC dean_walsh] Loaded name from Firebase: "Dean Jennifer Walsh"
```

## Files Modified

1. ✅ `src/types/firestore.types.ts` - Added stable identifier fields
2. ✅ `src/lib/firestore-helpers.ts` - Added query helper functions
3. ✅ `src/lib/firestore-seed.ts` - Use stable IDs for dialogues and NPCs
4. ✅ `src/services/FirestoreDialogueService.ts` - Support stable tree ID lookups
5. ✅ `assets/data/npcs/floor1-npcs.json` - Use stable tree IDs

## Migration Notes

- **No breaking changes**: System is backward compatible
- **Existing data**: Old dialogue documents will still work via fallback lookup
- **New seeding**: Fresh seeds will use stable IDs automatically

---

**Date**: 2026-02-07
**Status**: ✅ Implementation Complete - Ready for Testing

