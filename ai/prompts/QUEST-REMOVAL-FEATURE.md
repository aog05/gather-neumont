# Quest Removal Feature Implementation

## Overview

Added functionality to remove active quests from the Quest Menu with Firebase integration. Players can now click a small "×" button on any active quest to remove it from their quest list.

## Changes Made

### 1. **QuestMenu.tsx** - UI Component Updates

**Added:**
- `onRemoveQuest: (questId: string) => void` prop to `QuestMenuProps` interface
- `onRemoveQuest` parameter to `QuestMenu` function signature
- Passed `onRemoveQuest` to `ActiveQuestList` component
- `onRemoveQuest` prop to `ActiveQuestListProps` interface
- `handleRemoveClick` function that stops event propagation and calls `onRemoveQuest`
- Remove button (×) to each active quest item in the header

**Key Code:**
```typescript
const handleRemoveClick = (e: React.MouseEvent, questId: string) => {
  e.stopPropagation(); // Prevent quest selection when clicking remove button
  onRemoveQuest(questId);
};

<button
  className="quest-menu-item-remove-btn"
  onClick={(e) => handleRemoveClick(e, quest.id)}
  title="Remove quest"
>
  ×
</button>
```

### 2. **QuestMenu.css** - Styling

**Added:**
- `.quest-menu-item-header-actions` - Flex container for badge and remove button
- `.quest-menu-item-remove-btn` - Remove button styling with hover effects
- Updated `.quest-menu-item-title` to include `flex: 1` for proper layout

**Styling Features:**
- 24x24px transparent button with subtle border
- Yellow background (#FFDD00) on hover
- 90-degree rotation animation on hover
- Matches Neumont brand identity

### 3. **QuestTracker.tsx** - Prop Passing

**Added:**
- `onRemoveQuest` prop to `QuestTrackerProps` interface
- `onRemoveQuest` parameter to `QuestTracker` function signature
- Passed `onRemoveQuest` to `QuestMenu` component

### 4. **Game.tsx** - Firebase Integration

**Added Imports:**
```typescript
import { doc, updateDoc, arrayRemove } from "firebase/firestore";
import { db, COLLECTIONS } from "./lib/firebase.ts";
import FirestoreHelpers from "./lib/firestore-helpers.ts";
import { GameEventBridge } from "./systems/GameEventBridge.ts";
```

**Implemented `handleRemoveQuest` function:**
```typescript
const handleRemoveQuest = async (questId: string) => {
  try {
    // Get player by username
    const playerDoc = await FirestoreHelpers.getPlayerByUsername(TEST_PLAYER_USERNAME);
    
    // Remove quest from ActiveQuests array in Firebase
    const playerRef = doc(db, COLLECTIONS.PLAYER, playerDoc.id);
    await updateDoc(playerRef, {
      ActiveQuests: arrayRemove(questId)
    });
    
    // Emit event to notify UI to refresh quest data
    const bridge = GameEventBridge.getInstance();
    bridge.emit("quest:removed", { questId });
  } catch (error) {
    console.error(`[Game] Error removing quest:`, error);
  }
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
  loading={loading}
/>
```

### 5. **useQuestData.ts** - Auto-Refresh on Removal

**Added:**
- `quest:removed` event listener to trigger data refresh
- `handleQuestRemoved` function that increments `refreshTrigger`

This ensures the UI automatically updates when a quest is removed.

### 6. **PlayerProfile.tsx & PlayerProfile.css** - Student Badge

**Changed:**
- Replaced "LVL 1" badge with "STUDENT" badge
- Updated CSS class from `player-profile-level-badge` to `player-profile-student-badge`
- Kept same styling (yellow background, dark text, uppercase)

## User Experience

1. **Remove Button Visibility**: Only appears on active quests, not completed quests
2. **Click Behavior**: Clicking remove button does NOT select the quest (event propagation stopped)
3. **Visual Feedback**: Button rotates 90° and turns yellow on hover
4. **Immediate Update**: UI refreshes automatically after removal via event system
5. **Error Handling**: Graceful error logging if removal fails

## Technical Details

- **Firebase Operation**: Uses `arrayRemove()` for atomic array updates
- **Event System**: Emits `quest:removed` event for UI synchronization
- **Reseed-Proof**: Uses username-based player lookup (stable identifier)
- **No Confirmation**: Direct removal (can be enhanced with confirmation modal if needed)

## Testing Checklist

- [ ] Build succeeds without errors ✅
- [ ] Remove button appears on active quests only
- [ ] Clicking remove button removes quest from Firebase
- [ ] UI updates immediately after removal
- [ ] Console shows successful removal logs
- [ ] Clicking remove button does NOT select the quest
- [ ] Hover effects work correctly (yellow background, rotation)
- [ ] Student badge displays correctly in Player Profile

## Files Modified

1. `src/components/QuestMenu.tsx`
2. `src/components/QuestMenu.css`
3. `src/components/QuestTracker.tsx`
4. `src/components/PlayerProfile.tsx`
5. `src/components/PlayerProfile.css`
6. `src/Game.tsx`
7. `src/hooks/useQuestData.ts`

