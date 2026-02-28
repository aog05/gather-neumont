# Daily Quiz Cleanup - Simplified Popup Implementation

## Overview

Cleaned up the daily quiz implementation by simplifying the event system and moving the quiz popup to render directly in `Game.tsx` alongside other UI components (DialogueUI, QuestTracker, PlayerProfile).

## Changes Made

### 1. **Game.tsx** - Direct Quiz Popup Rendering

**Added:**
- Import `QuizPanel` component
- Direct window event listener for `dailyQuiz:start`
- Render `QuizPanel` conditionally based on `isDailyQuizOpen` state

**Removed:**
- `appEvents` import and usage
- Complex event chain through appEvents system

**Key Code:**
```typescript
// Listen for daily quiz start event from game world
useEffect(() => {
  const handleDailyQuizStart = () => {
    console.log("[Game] Daily quiz start event received");
    setIsDailyQuizOpen(true);
  };

  window.addEventListener("dailyQuiz:start", handleDailyQuizStart);
  return () => {
    window.removeEventListener("dailyQuiz:start", handleDailyQuizStart);
  };
}, []);

// Render quiz popup
<QuizPanel
  isOpen={isDailyQuizOpen}
  onClose={() => setIsDailyQuizOpen(false)}
/>
```

### 2. **OverlayLayout.tsx** - Removed Quiz Rendering

**Removed:**
- `QuizPanel` import
- `appEvents` import
- `isDailyQuizOpen` state
- All `appEvents` event listeners and emitters
- `QuizPanel` rendering (moved to Game.tsx)

**Simplified:**
- Removed complex event handling logic
- Cleaned up useEffect dependencies
- Removed unused state management

## How It Works Now

### Simplified Event Flow:

1. **Player approaches quiz terminal** in MainScene.ts
2. **Player presses E** near terminal
3. **MainScene dispatches** `window.dispatchEvent(new CustomEvent("dailyQuiz:start"))`
4. **Game.tsx receives event** via window event listener
5. **Game.tsx sets** `isDailyQuizOpen = true`
6. **QuizPanel renders** as a popup overlay
7. **Player closes quiz** → `setIsDailyQuizOpen(false)`
8. **QuizPanel unmounts**

### Before (Complex):
```
MainScene → window event → OverlayLayout → appEvents.emitOpenDailyQuiz() 
→ appEvents listeners → OverlayLayout state → Game.tsx state → QuizPanel
```

### After (Simple):
```
MainScene → window event → Game.tsx state → QuizPanel
```

## Benefits

✅ **Simpler Architecture** - Direct event handling without intermediate event bus  
✅ **Consistent Pattern** - Quiz popup works like QuestMenu and PlayerMenu  
✅ **Easier to Debug** - Fewer layers of abstraction  
✅ **Better Maintainability** - All UI components managed in one place (Game.tsx)  
✅ **Removed Dependency** - No longer need appEvents for quiz functionality  

## Files Modified

1. ✅ `src/Game.tsx` - Added QuizPanel rendering and direct event handling
2. ✅ `src/ui/OverlayLayout.tsx` - Removed quiz-related code

## Files NOT Modified (Still Work)

- `src/scenes/MainScene.ts` - Still dispatches `dailyQuiz:start` event
- `src/ui/quiz/QuizPanel.tsx` - No changes needed
- `src/components/quiz/QuizModal.tsx` - No changes needed
- `src/events/appEvents.ts` - Still exists but no longer used for quiz (can be removed later if unused)

## Testing Instructions

1. **Start dev server**: `bun run dev`
2. **Load the game** in browser
3. **Walk to the purple "Daily Quiz" terminal** (near spawn point)
4. **Press E** when "Press E to interact" appears
5. **Verify:**
   - Quiz popup appears centered on screen
   - Game keyboard input is disabled
   - Quiz is fully functional (can answer questions)
   - Closing quiz (X button) returns to game
   - Keyboard input re-enabled after closing

### Expected Console Output:

```
[quiz] dailyQuiz:start dispatched
[Game] Daily quiz start event received
```

## Build Status

✅ **Build successful** - No compilation errors  
✅ **Bundle size**: 2.26 MB (increased from 2.11 MB due to quiz components now in main bundle)

## Future Enhancements

- Consider removing `appEvents.ts` entirely if no other features use it
- Add fade-in animation when quiz popup opens
- Add backdrop blur effect for better visual separation
- Consider adding sound effect when quiz opens

