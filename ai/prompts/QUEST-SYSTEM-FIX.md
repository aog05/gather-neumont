# Quest System Fix - Player ID Update

## Issue
The Quest Tracker UI was not loading quest data because the game was using an incorrect test player ID that didn't exist in the Firebase database.

## Root Cause
- `Game.tsx` was using `TEST_PLAYER_ID = "gPQ3bWdY6uhmtjZE1dnx"` 
- This player ID did not exist in the Firebase database
- The `useQuestData` hook was failing to find the player document
- Quest Tracker showed empty state because no quests were loaded

## Solution
1. Created `src/lib/find-sarah-player-id.ts` script to query Firebase for all players
2. Found `sarah_dev` player with ID: `km9riQFfVkJBseHUVvft`
3. Updated `Game.tsx` to use the correct player ID

## Changes Made

### File: `src/Game.tsx`
**Before:**
```typescript
const TEST_PLAYER_ID = "gPQ3bWdY6uhmtjZE1dnx"; // Example player from seed data
```

**After:**
```typescript
const TEST_PLAYER_ID = "km9riQFfVkJBseHUVvft"; // sarah_dev from seed data
```

### File: `src/lib/find-sarah-player-id.ts` (NEW)
Created a utility script to find player IDs by querying Firebase.

## Player Data: sarah_dev
- **Player ID**: `km9riQFfVkJBseHUVvft`
- **Username**: `sarah_dev`
- **Real Name**: Sarah Martinez
- **Email**: smartinez@student.neumont.edu
- **Wallet**: 2500 points
- **Active Quests**: 2
- **Completed Quests**: 3
- **Skills**: Python, Database Design, Algorithms, Technical Writing, Problem Solving

## Expected Result
When the game loads:
1. Console logs show: `[Game] Using player ID: km9riQFfVkJBseHUVvft`
2. `useQuestData` hook successfully fetches player document
3. Quest Tracker displays 2 active quests
4. Quest Tracker shows 3 completed quests
5. No "Player not found" errors in console

## Testing
1. Build the project: `bun run build`
2. Start dev server: `bun run dev`
3. Open browser and check console for:
   - `[Game] Using player ID: km9riQFfVkJBseHUVvft`
   - `[useQuestData] Player found: { username: 'sarah_dev', ... }`
   - `[useQuestData] Loaded 2 active quests`
   - `[useQuestData] Loaded 3 completed quests`
4. Verify Quest Tracker UI shows quest data

## Related Files
- `src/Game.tsx` - Updated player ID
- `src/hooks/useQuestData.ts` - Quest data fetching logic (already has logging)
- `src/lib/find-sarah-player-id.ts` - Utility to find player IDs
- `src/lib/firestore-seed.ts` - Seed data source

## Notes
- The `useQuestData` hook already has comprehensive logging
- The `Game.tsx` component already logs quest data state
- All necessary debugging logs are in place
- This fix only required updating the player ID constant

---

**Date**: 2026-02-07
**Status**: ✅ Fixed and Built Successfully

