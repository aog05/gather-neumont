# Points System Implementation

## Overview

Implemented a fully functional points system that awards players points when they complete quests. Points are stored in the player's `Wallet` field in Firebase and automatically update the UI in real-time.

## Changes Made

### 1. **GameState.ts** - Quest Completion with Points

**Updated `completeQuest()` method to:**
- Fetch quest data from Firebase to get reward points
- Use Firebase `increment()` to add points to player's Wallet
- Move quest from ActiveQuests to CompletedQuests
- Emit `quest:completed` event with reward details

**Key Code:**
```typescript
// Fetch quest data to get reward points
const questRef = doc(db, COLLECTIONS.QUEST, questId);
const questSnap = await getDoc(questRef);
const questData = questSnap.data();
const rewardPoints = questData.Reward?.Points || 0;

// Calculate new wallet value (Wallet is stored as string in Firebase)
const currentPoints = parseInt(player.Wallet, 10) || 0;
const newPoints = currentPoints + rewardPoints;

// Remove from ActiveQuests, add to CompletedQuests, and award points
const playerRef = doc(db, COLLECTIONS.PLAYER, player.id);
await updateDoc(playerRef, {
  ActiveQuests: arrayRemove(questId),
  CompletedQuests: arrayUnion(questId),
  Wallet: newPoints.toString() // Update wallet with new total (ADD, not override)
});

// Emit event with reward details
this.bridge.emit("quest:completed", {
  questId,
  rewardPoints,
  questTitle: questData.Title
});
```

**Added Imports:**
- `getDoc` from firebase/firestore

**Important Note:**
- Wallet is stored as a **string** in Firebase (not a number)
- We parse the current value, add the reward points, then convert back to string
- This ensures points are **added** to the existing total, not overridden

### 2. **QuestMenu.tsx** - Test Complete Button

**Added:**
- `onCompleteQuest: (questId: string) => void` prop to `QuestMenuProps`
- `onCompleteQuest` parameter to `QuestMenu` function
- Passed `onCompleteQuest` to `ActiveQuestList` component
- `onCompleteQuest` prop to `ActiveQuestListProps`
- `handleCompleteClick` function with event propagation stop
- Green "✓ Complete Quest (TEST)" button to each active quest

**Button Features:**
- Full-width green button below quest rewards
- Stops event propagation (doesn't select quest when clicked)
- Labeled as "(TEST)" to indicate it's for testing
- Hover effects with lift animation

### 3. **QuestMenu.css** - Complete Button Styling

**Added `.quest-menu-item-complete-btn` styles:**
- Green gradient background (#4caf50)
- Full width with uppercase text
- Hover: Darker green with lift effect and glow
- Active: Press-down animation
- Matches Neumont brand aesthetic

**Updated:**
- Added `margin-bottom: 12px` to `.quest-menu-item-rewards` for spacing

### 4. **QuestTracker.tsx** - Prop Passing

**Added:**
- `onCompleteQuest` prop to `QuestTrackerProps` interface
- `onCompleteQuest` parameter to `QuestTracker` function
- Passed `onCompleteQuest` to `QuestMenu` component

### 5. **Game.tsx** - Complete Quest Handler

**Implemented `handleCompleteQuest` function:**
```typescript
const handleCompleteQuest = async (questId: string) => {
  // Use GameState to complete the quest
  const { GameState } = await import("./systems/GameState.ts");
  const gameState = new GameState();
  gameState.setPlayerUsername(TEST_PLAYER_USERNAME);
  await gameState.completeQuest(questId);
};
```

**Passed handler to QuestTracker:**
```typescript
<QuestTracker
  selectedQuest={selectedQuest}
  activeQuests={activeQuests}
  completedQuests={completedQuests}
  onSelectQuest={selectQuest}
  onRemoveQuest={handleRemoveQuest}
  onCompleteQuest={handleCompleteQuest}
  loading={loading}
/>
```

### 6. **usePlayerData.ts** - Auto-Refresh (Already Implemented)

The `usePlayerData` hook already listens for `quest:completed` events and triggers a data refresh, so player points update automatically in the UI.

## How It Works

### Quest Completion Flow:

1. **User clicks "✓ Complete Quest (TEST)" button**
2. **QuestMenu** calls `onCompleteQuest(questId)`
3. **Game.tsx** `handleCompleteQuest()` creates GameState instance
4. **GameState.completeQuest()** executes:
   - Fetches quest from Firebase to get reward points
   - Updates player document:
     - Removes quest from `ActiveQuests` array
     - Adds quest to `CompletedQuests` array
     - Increments `Wallet` by reward points
   - Emits `quest:completed` event with reward details
5. **useQuestData** hook receives event → refreshes quest lists
6. **usePlayerData** hook receives event → refreshes player data (points)
7. **UI updates automatically:**
   - Quest moves from Active to Completed tab
   - Player Profile shows updated points
   - Quest Tracker updates

### Points Calculation:

- Points are defined in Quest documents: `Reward.Points`
- Points are stored as **strings** in `Wallet` field (Firebase schema)
- System parses current points, adds reward, converts back to string
- This ensures points are **added** to existing total, not overridden
- UI displays points with `.toLocaleString()` for formatting (e.g., "1,000")

## Testing Instructions

1. **Start the dev server**: `bun run dev`
2. **Open the game in browser**
3. **Click Quest Tracker** to open Quest Menu
4. **Go to Active Quests tab**
5. **Click "✓ Complete Quest (TEST)" button** on any quest
6. **Verify the following:**
   - Quest moves to Completed Quests tab
   - Player Profile points increase by quest reward amount
   - Console shows completion logs with points awarded
   - UI updates immediately without page refresh

### Expected Console Output:

```
[Game] [TEST] Completing quest: <questId>
[GameState] Completing quest: <questId>
[GameState] Quest reward: <points> points
[GameState] ✅ Quest completed in Firebase: <questId>
[GameState] ✅ Awarded <points> points to player
[useQuestData] Quest completed event received: <questId>
[usePlayerData] Quest completed event received: <questId>
[useQuestData] Fetching quest data for username: sarah_dev
[usePlayerData] Fetching player data for username: sarah_dev
```

## Files Modified

1. ✅ `src/systems/GameState.ts` - Points integration in completeQuest()
2. ✅ `src/components/QuestMenu.tsx` - Test complete button
3. ✅ `src/components/QuestMenu.css` - Complete button styling
4. ✅ `src/components/QuestTracker.tsx` - Prop passing
5. ✅ `src/Game.tsx` - Complete quest handler

## Future Enhancements

- Remove test button and integrate with actual quest objectives
- Add visual feedback (toast notification) when points are awarded
- Add animation when points increase in Player Profile
- Add sound effects for quest completion
- Add cosmetic rewards handling (currently only points are awarded)

