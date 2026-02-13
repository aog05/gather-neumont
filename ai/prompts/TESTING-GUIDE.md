# Testing Guide - Bug Fixes Verification

## Quick Start

1. **Open the app in your browser**
2. **Open Developer Console** (F12 or Right-click → Inspect → Console)
3. **Follow the tests below**

---

## Test 1: NPC Name Labels ✅

### What to Look For:
- NPC names appear above sprites in **Neumont Yellow (#FFDD00)**
- Names are clearly visible with dark background
- Names use DIN 2014 font

### Steps:
1. Load the game
2. Move player character near an NPC
3. Verify name label appears above NPC sprite
4. Check console for logs:
   ```
   Creating NPC: Professor Smith (ID: prof_smith)
   Creating name label for: Professor Smith
   ```

### Expected NPCs:
- **Professor Smith** - Orange placeholder at (500, 400)
- **Sarah Johnson** - Blue placeholder at (1200, 800)
- **Mike Anderson** - Yellow placeholder at (1800, 600)

### ✅ Pass Criteria:
- All three NPCs show their correct names
- Names are visible in Neumont Yellow
- No placeholder or incorrect names

---

## Test 2: Dialogue System ✅

### What to Look For:
- No "node not found" errors in console
- Dialogues end gracefully
- All dialogue paths work correctly

### Steps:
1. Approach an NPC (within 80 pixels)
2. Press **E** to start dialogue
3. Read through dialogue options
4. Select responses to navigate dialogue tree
5. Reach the end of dialogue
6. Verify dialogue closes without errors

### Console Logs to Check:
```
Started dialogue: [treeId] at node [nodeId]
Navigated to node: [nodeId] (type: dialogue)
Dialogue node has no next property, ending dialogue
Ending dialogue: [treeId]
```

### ✅ Pass Criteria:
- No "Node not found" errors
- No "Response not found" errors
- Dialogue closes cleanly at end nodes
- Console shows proper navigation logs

---

## Test 3: Firebase Quest Data ✅

### What to Look For:
- Player data loads from Firebase
- Quest tracker appears in top-right corner
- Active and completed quests display correctly

### Steps:
1. Load the game
2. **Immediately check console** for Firebase logs
3. Look for quest tracker in **top-right corner**
4. Click quest tracker to open quest menu
5. Check Active Quests tab
6. Check Completed Quests tab

### Console Logs to Check:
```
[Game] Using player ID: gPQ3bWdY6uhmtjZE1dnx
[useQuestData] Fetching quest data for player: gPQ3bWdY6uhmtjZE1dnx
[Firestore] Fetching document: Player/gPQ3bWdY6uhmtjZE1dnx
[Firestore] Document found: Player/gPQ3bWdY6uhmtjZE1dnx
[useQuestData] Player found: { username: 'johnwebofficial', ... }
[useQuestData] Fetching 1 active quests...
[useQuestData] Loaded 1 active quests
[useQuestData] Fetching 1 completed quests...
[useQuestData] Loaded 1 completed quests
[Game] Quest data state: { loading: false, error: null, activeQuestsCount: 1, ... }
```

### ✅ Pass Criteria:
- Console shows successful Firebase connection
- Player document loads (username: johnwebofficial)
- Quest tracker visible in top-right
- 1 active quest displays
- 1 completed quest displays
- No Firebase errors

---

## Common Issues & Solutions

### Issue: NPC Names Not Showing
**Solution**: 
- Check console for "Creating NPC" logs
- Verify you're close enough to NPC (within 80 pixels)
- Name labels only appear when player is nearby

### Issue: "Node not found" Errors
**Solution**:
- Check which dialogue tree is failing (console shows tree ID)
- Verify dialogue JSON files have valid node references
- All `next` properties should point to existing node IDs

### Issue: Firebase Not Loading
**Possible Causes**:
1. **Network Issue**: Check Network tab for failed requests
2. **Player Not Found**: Verify player ID `gPQ3bWdY6uhmtjZE1dnx` exists in Firebase
3. **Permission Error**: Check Firebase console for security rules
4. **Quest Not Found**: Verify quest IDs in player document exist in Quest collection

**Debug Steps**:
1. Check console for `[Firestore]` logs
2. Look for error messages
3. Verify Firebase config in `src/lib/firebase.ts`
4. Check Network tab for Firestore requests

---

## Expected Console Output (Success)

```
[Game] Using player ID: gPQ3bWdY6uhmtjZE1dnx
Creating NPC: Professor Smith (ID: prof_smith)
Creating name label for: Professor Smith
Creating NPC: Sarah Johnson (ID: admissions_staff)
Creating name label for: Sarah Johnson
Creating NPC: Mike Anderson (ID: tech_support)
Creating name label for: Mike Anderson
Loaded 3 NPCs for floor 1
[useQuestData] Fetching quest data for player: gPQ3bWdY6uhmtjZE1dnx
[Firestore] Fetching document: Player/gPQ3bWdY6uhmtjZE1dnx
[Firestore] Document found: Player/gPQ3bWdY6uhmtjZE1dnx
[useQuestData] Player found: { username: 'johnwebofficial', activeQuestIds: [...], completedQuestIds: [...] }
[useQuestData] Quest data loaded successfully { activeQuests: 1, completedQuests: 1 }
[Game] Quest data state: { loading: false, error: null, activeQuestsCount: 1, completedQuestsCount: 1, selectedQuest: '[Quest Title]' }
```

---

## Visual Verification

### NPC Names:
- [ ] Names appear in **Neumont Yellow (#FFDD00)**
- [ ] Background is **Neumont Grey (#1F1F1F)**
- [ ] Font is **DIN 2014** (or Arial fallback)
- [ ] Text is **14px** and clearly readable

### Quest Tracker:
- [ ] Positioned in **top-right corner**
- [ ] Shows **"QUEST"** header in Neumont Yellow
- [ ] Displays quest count badge
- [ ] Shows selected quest title and description
- [ ] Reward shows in Neumont Yellow

### Dialogue Box:
- [ ] Appears at **bottom of screen**
- [ ] Speaker name in **Neumont Yellow**
- [ ] Background is **Neumont Grey**
- [ ] Close button (×) in **Neumont Yellow**
- [ ] Response buttons have **Neumont Yellow** accent on hover

---

## Success Summary

All three bugs are fixed when:
- ✅ All NPC names display correctly in Neumont Yellow
- ✅ No dialogue errors in console
- ✅ Quest tracker shows player's actual quests
- ✅ Console logs show successful data loading
- ✅ No errors related to NPCs, dialogues, or quests

---

**Last Updated**: 2026-02-07  
**Bug Fixes**: 3/3 Complete

