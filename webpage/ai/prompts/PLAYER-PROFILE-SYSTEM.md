# Player Profile System Documentation

## Overview

The Player Profile System provides a comprehensive UI for displaying player information in the Neumont Virtual Campus. It consists of a minimized profile widget in the top-left corner and an expandable full-screen modal with detailed statistics.

## Architecture

### Components

1. **PlayerProfile.tsx** - Minimized state component (top-left corner)
2. **PlayerMenu.tsx** - Expanded modal component (full-screen overlay)
3. **usePlayerData.ts** - Custom React hook for fetching player data from Firebase

### Data Flow

```
Firebase (Player Collection)
    ↓
usePlayerData Hook
    ↓
Game.tsx (Integration)
    ↓
PlayerProfile Component (Minimized)
    ↓
PlayerMenu Component (Expanded Modal)
```

## Features

### Minimized State (PlayerProfile)

**Location**: Top-left corner of the screen

**Displays**:
- Player username (e.g., "sarah_dev")
- Total points with star icon
- Active quests count
- Completed quests count
- "LVL 1" badge (placeholder for future level system)

**Interactions**:
- Click anywhere on the widget to expand into PlayerMenu
- Hover effect with yellow border glow
- Tech corner accents matching Neumont brand

### Expanded State (PlayerMenu)

**Location**: Full-screen overlay modal

**Displays**:
- **Identity Section**:
  - Username
  - Real Name
- **Points Section**:
  - Total points with large display
- **Quest Statistics**:
  - Active Quests count
  - Completed Quests count
  - Total Quests count
- **Puzzle Statistics**:
  - Puzzles Solved count

**Interactions**:
- Click X button to close
- Click outside modal to close
- Press ESC key to close

## Implementation Details

### usePlayerData Hook

**Purpose**: Fetch and manage player data from Firebase

**Features**:
- Fetches player by username (reseed-proof)
- Auto-refreshes when quest events occur (`quest:started`, `quest:completed`)
- Computes derived stats (total points, quest counts, puzzle counts)
- Handles loading and error states

**Usage**:
```typescript
const {
  player,
  loading,
  error,
  totalPoints,
  activeQuestsCount,
  completedQuestsCount,
  totalPuzzlesCompleted,
} = usePlayerData("sarah_dev");
```

### PlayerProfile Component

**Props**:
- `username: string` - Player's username
- `realName: string` - Player's real name
- `totalPoints: number` - Total points
- `activeQuestsCount: number` - Number of active quests
- `completedQuestsCount: number` - Number of completed quests
- `totalPuzzlesCompleted: number` - Number of puzzles completed
- `loading?: boolean` - Loading state

**State**:
- `isMenuOpen: boolean` - Controls PlayerMenu visibility

### PlayerMenu Component

**Props**:
- `username: string` - Player's username
- `realName: string` - Player's real name
- `totalPoints: number` - Total points
- `activeQuestsCount: number` - Number of active quests
- `completedQuestsCount: number` - Number of completed quests
- `totalPuzzlesCompleted: number` - Number of puzzles completed
- `onClose: () => void` - Callback to close the menu

**Features**:
- ESC key listener for closing
- Click-outside-to-close functionality
- Smooth animations (fadeIn, slideIn)
- Responsive design for mobile devices

## Styling

### Design System

**Colors**:
- Neumont Yellow: `#FFDD00` (primary accent)
- Neumont Grey: `#1F1F1F` (dark background)
- Border Grey: `#3a3a3a` (borders and dividers)

**Typography**:
- Font Family: `'DIN 2014', 'Arial Narrow', 'Arial', sans-serif`
- Headers: Uppercase, bold, yellow
- Body: Regular weight, white/grey

**Effects**:
- Semi-transparent backgrounds with backdrop blur
- Tech corner accents (yellow borders in corners)
- Hover effects with yellow glow
- Smooth transitions (0.2s ease)

### Responsive Design

**Desktop** (> 768px):
- Width: 280px
- Full padding and spacing

**Mobile** (≤ 768px):
- Width: 240px
- Reduced padding
- Smaller font sizes
- Single-column grid layouts

## Integration with Game.tsx

```typescript
import PlayerProfile from "./components/PlayerProfile.tsx";
import { usePlayerData } from "./hooks/usePlayerData.ts";

// Fetch player data
const {
  player,
  loading: playerLoading,
  totalPoints,
  activeQuestsCount,
  completedQuestsCount,
  totalPuzzlesCompleted,
} = usePlayerData(TEST_PLAYER_USERNAME);

// Render component
<PlayerProfile
  username={player?.Username || TEST_PLAYER_USERNAME}
  realName={player?.RealName || "Unknown"}
  totalPoints={totalPoints}
  activeQuestsCount={activeQuestsCount}
  completedQuestsCount={completedQuestsCount}
  totalPuzzlesCompleted={totalPuzzlesCompleted}
  loading={playerLoading}
/>
```

## Files Created

1. ✅ `src/hooks/usePlayerData.ts` - Custom hook for player data
2. ✅ `src/components/PlayerProfile.tsx` - Minimized profile component
3. ✅ `src/components/PlayerProfile.css` - Minimized profile styles
4. ✅ `src/components/PlayerMenu.tsx` - Expanded modal component
5. ✅ `src/components/PlayerMenu.css` - Modal styles
6. ✅ `PLAYER-PROFILE-SYSTEM.md` - This documentation

## Files Modified

1. ✅ `src/Game.tsx` - Integrated PlayerProfile component

## Future Enhancements

### Out of Scope (Initial Implementation)
- Editing player information
- Avatar/profile picture display
- Skill tree visualization
- Achievement badges
- Social features (friends list, etc.)
- Level system (currently shows "LVL 1" placeholder)

### Potential Future Features
- Player level calculation based on points/quests
- Experience bar and progression system
- Cosmetic preview/customization
- Skill tree integration
- Achievement system
- Player statistics graphs/charts
- Leaderboard integration

