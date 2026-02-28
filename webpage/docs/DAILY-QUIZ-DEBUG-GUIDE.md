# Daily Quiz Debug Guide

## Issue
Daily quiz popup not opening when pressing E near the quiz terminal.

## Debug Logging Added

I've added comprehensive debug logging to help diagnose the issue. Here's what to look for in the browser console:

### Expected Console Output (When Working):

**On Page Load:**
```
[Game] Setting up dailyQuiz:start event listener
[Game] Event listener attached to window
[Game] isDailyQuizOpen changed to: false
[QuizPanel] isOpen prop changed to: false
```

**When Walking Near Terminal:**
```
[MainScene] 📍 Player entered quiz terminal zone
[MainScene] Player position: (x, y)
[MainScene] Terminal position: (x, y)
```

**When Pressing E Near Terminal:**
```
[MainScene] ✅ E key pressed near terminal!
[MainScene] Dispatching dailyQuiz:start event
[Game] ✅ Daily quiz start event received!           ← Event received in Game.tsx
[Game] Setting isDailyQuizOpen to true               ← State update triggered
[Game] isDailyQuizOpen changed to: true              ← State changed
[QuizPanel] isOpen prop changed to: true             ← QuizPanel received prop
```

**If Keyboard is Disabled:**
```
[MainScene] ⚠️ Keyboard is DISABLED - cannot interact with quiz terminal
```

**When Quiz Opens:**
- Quiz popup should appear centered on screen
- Game keyboard input should be disabled

## Debugging Steps

### Step 1: Check Event Listener Setup
**Look for:**
```
[Game] Setting up dailyQuiz:start event listener
[Game] Event listener attached to window
```

**If missing:** Game.tsx component didn't mount properly

### Step 2: Check Terminal Zone Detection
**Walk to purple terminal**

**Look for:**
```
[MainScene] 📍 Player entered quiz terminal zone
```

**If missing:**
- Player isn't close enough to terminal
- Terminal zone not set up correctly
- Physics overlap not working

### Step 3: Check E Key Press Detection
**Press E while near terminal**

**Look for:**
```
[MainScene] ✅ E key pressed near terminal!
[MainScene] Dispatching dailyQuiz:start event
```

**If missing but you see keyboard disabled warning:**
```
[MainScene] ⚠️ Keyboard is DISABLED - cannot interact with quiz terminal
```
- Keyboard input is disabled (likely by overlay route or quiz already open)
- Check if any overlay is active

**If missing and no warning:**
- E key not being detected
- interactKey not set up correctly

### Step 4: Check Event Reception
**Look for:**
```
[Game] ✅ Daily quiz start event received!
```

**If missing:**
- Event listener not attached
- Event name mismatch
- Event not bubbling to window

### Step 5: Check State Update
**Look for:**
```
[Game] Setting isDailyQuizOpen to true
[Game] isDailyQuizOpen changed to: true
```

**If missing:**
- setIsDailyQuizOpen not being called
- React state update issue

### Step 6: Check Prop Propagation
**Look for:**
```
[QuizPanel] isOpen prop changed to: true
```

**If missing:**
- QuizPanel not receiving updated prop
- Component not re-rendering

## Common Issues & Solutions

### Issue 1: Event Not Dispatched
**Symptoms:** No `[quiz] dailyQuiz:start dispatched` log

**Possible Causes:**
- Player not close enough to terminal (check distance calculation)
- Keyboard input disabled (check if overlay route is active)
- E key not being detected

**Solution:**
- Check `isNearTerminal` logic in MainScene.ts
- Verify keyboard is enabled
- Try clicking directly on terminal area

### Issue 2: Event Not Received
**Symptoms:** Dispatch log appears but no reception log

**Possible Causes:**
- Event listener not attached
- Game.tsx component unmounted/remounted
- Event listener cleanup ran

**Solution:**
- Check React DevTools to verify Game component is mounted
- Check for any errors in console
- Verify no duplicate Game components

### Issue 3: State Not Updating
**Symptoms:** Reception log appears but state doesn't change

**Possible Causes:**
- React state update batching
- Component re-render issue
- State setter not working

**Solution:**
- Check React DevTools state inspector
- Look for any React errors in console

### Issue 4: QuizPanel Not Rendering
**Symptoms:** State updates but panel doesn't appear

**Possible Causes:**
- QuizPanel returning null
- CSS z-index issue
- Component error

**Solution:**
- Check if `isOpen` prop is true in QuizPanel
- Inspect DOM for quiz panel element
- Check for component errors

## Manual Testing Checklist

- [ ] Start dev server: `bun run dev`
- [ ] Open browser console (F12)
- [ ] Load the game
- [ ] Check for setup logs on page load
- [ ] Walk to purple "Daily Quiz" terminal
- [ ] Verify "Press E to interact" prompt appears
- [ ] Press E key
- [ ] Check console for all expected logs
- [ ] Verify quiz popup appears
- [ ] Verify game controls are disabled
- [ ] Close quiz (X button)
- [ ] Verify game controls re-enabled

## Files Modified for Debugging

1. `src/Game.tsx` - Added detailed logging for event listener and state changes
2. `src/ui/quiz/QuizPanel.tsx` - Added logging for isOpen prop changes

## Next Steps

1. **Run the game** with dev server: `bun run dev`
2. **Open browser console** (F12)
3. **Follow the debugging steps** above
4. **Report which logs appear** and which don't
5. **Share any errors** from the console

This will help identify exactly where the event chain is breaking.

