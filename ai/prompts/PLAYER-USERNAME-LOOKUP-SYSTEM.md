# Player Username Lookup System Implementation

## Problem Solved
The player system was fragile and broke whenever the Firebase database was reseeded because the game referenced players by Firestore auto-generated document IDs, which changed with each reseed operation.

## Solution Overview
Updated the quest data system to search for players by username instead of document ID. This makes the player system reseed-proof, just like the NPC and dialogue systems.

## Changes Made

### 1. Updated `useQuestData` Hook
**File**: `src/hooks/useQuestData.ts`

#### Changed Parameter (Line 26)
- **Before**: `export function useQuestData(playerId: string)`
- **After**: `export function useQuestData(username: string)`

#### Updated Player Lookup (Lines 41-44)
**Before**:
```typescript
console.log(`[useQuestData] Fetching quest data for player: ${playerId}`);
const playerDoc = await FirestoreHelpers.getDocument(COLLECTIONS.PLAYER, playerId);
```

**After**:
```typescript
console.log(`[useQuestData] Fetching quest data for username: ${username}`);
const playerDoc = await FirestoreHelpers.getPlayerByUsername(username);
```

#### Updated Error Messages (Lines 48-50)
**Before**:
```typescript
const errorMsg = `Player not found: ${playerId}`;
```

**After**:
```typescript
const errorMsg = `Player not found with username: ${username}`;
```

#### Updated useEffect Dependency (Lines 111-123)
**Before**:
```typescript
if (playerId) {
  console.log(`[useQuestData] Starting fetch for player ID: ${playerId}`);
  fetchQuestData();
} else {
  console.warn('[useQuestData] No player ID provided');
  setError('No player ID provided');
}
}, [playerId]);
```

**After**:
```typescript
if (username) {
  console.log(`[useQuestData] Starting fetch for username: ${username}`);
  fetchQuestData();
} else {
  console.warn('[useQuestData] No username provided');
  setError('No username provided');
}
}, [username]);
```

### 2. Updated Game.tsx
**File**: `src/Game.tsx` (Lines 8-26)

**Before**:
```typescript
const TEST_PLAYER_ID = "rvESrDG8X3F21MOcBM2V"; // sarah_dev from seed data

console.log(`[Game] Using player ID: ${TEST_PLAYER_ID}`);
const { activeQuests, completedQuests, loading, error } = useQuestData(TEST_PLAYER_ID);
```

**After**:
```typescript
const TEST_PLAYER_USERNAME = "sarah_dev"; // Stable username from seed data

console.log(`[Game] Using player username: ${TEST_PLAYER_USERNAME}`);
const { activeQuests, completedQuests, loading, error } = useQuestData(TEST_PLAYER_USERNAME);
```

### 3. Leveraged Existing Helper Function
**File**: `src/lib/firestore-helpers.ts` (Lines 159-166)

The `getPlayerByUsername()` helper function was already implemented:
```typescript
async getPlayerByUsername(username: string) {
  const results = await queryDocuments(
    COLLECTIONS.PLAYER,
    where("Username", "==", username),
    limit(1)
  );
  return results[0] || null;
}
```

## How It Works

### Player Lookup Flow:
1. **Game loads**: Uses `TEST_PLAYER_USERNAME = "sarah_dev"`
2. **Hook queries**: `useQuestData("sarah_dev")`
3. **Database lookup**: Queries Firestore where `Username == "sarah_dev"`
4. **Quest loading**: Fetches active and completed quests for the player
5. **UI updates**: Quest Tracker displays quest data

### Stable Usernames:
- Player documents have a `Username` field (e.g., "sarah_dev", "alex_codes", "mike_master")
- Usernames are stable identifiers that don't change across reseeds
- The seed script creates players with consistent usernames

## Benefits

1. **✅ Reseed-Safe**: Database can be cleared and reseeded without breaking the quest system
2. **✅ No Manual Updates**: Game.tsx doesn't need updates after reseeds
3. **✅ Readable Code**: "sarah_dev" is more meaningful than "rvESrDG8X3F21MOcBM2V"
4. **✅ Consistent Pattern**: Matches the NPC and dialogue stable identifier systems
5. **✅ Better Debugging**: Username-based logs are easier to understand

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

### 4. Verify Quest System Loads
- Quest Tracker should appear in top-right corner
- Should display 2 active quests for sarah_dev
- Should display 3 completed quests for sarah_dev
- No errors in console

### 5. Check Console Logs
Expected output:
```
[Game] Using player username: sarah_dev
[useQuestData] Starting fetch for username: sarah_dev
[useQuestData] Fetching quest data for username: sarah_dev
[useQuestData] Player found: { username: 'sarah_dev', activeQuestIds: [...], completedQuestIds: [...] }
[useQuestData] Loaded 2 active quests
[useQuestData] Loaded 3 completed quests
```

## Files Modified

1. ✅ `src/hooks/useQuestData.ts` - Changed to accept username instead of player ID
2. ✅ `src/Game.tsx` - Use TEST_PLAYER_USERNAME instead of TEST_PLAYER_ID
3. ✅ `src/lib/firestore-helpers.ts` - Already had getPlayerByUsername() helper

## Complete Reseed-Proof System

The entire game is now reseed-proof:

| System | Stable Identifier | Query Method |
|--------|------------------|--------------|
| **Dialogues** | `treeId` (e.g., "walsh-greeting") | `getDialogueByTreeId()` |
| **NPCs** | `dialogueTreeId` (e.g., "walsh-greeting") | `getDialogueByTreeId()` |
| **Players** | `Username` (e.g., "sarah_dev") | `getPlayerByUsername()` |

All three systems can now survive database reseeds without any manual configuration updates!

---

**Date**: 2026-02-07
**Status**: ✅ Implementation Complete - Fully Reseed-Proof

