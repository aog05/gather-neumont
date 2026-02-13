# Debug Checklist - Changes Not Appearing

## ✅ Verification Complete
All code changes are confirmed to be present in the files:
- ✅ `src/entities/NPC.ts` - Debug logs and Neumont Yellow styling
- ✅ `src/systems/DialogueManager.ts` - Null checks and error handling
- ✅ `src/hooks/useQuestData.ts` - Comprehensive logging
- ✅ `src/lib/firestore-helpers.ts` - Firestore query logging
- ✅ `src/Game.tsx` - Quest state logging
- ✅ No TypeScript errors

## 🔍 Why Changes Aren't Appearing

The most likely causes are:
1. **Dev server not restarted** - Bun may not have picked up the changes
2. **Browser cache** - Old JavaScript files are cached
3. **Build not completed** - Changes haven't been compiled yet
4. **Hot reload failed** - Module replacement didn't work

---

## 🛠️ Step-by-Step Debugging

### Step 1: Restart the Development Server

**In your terminal:**
```powershell
# Stop the current dev server (Ctrl+C)
# Then restart it:
bun run dev
```

**What to look for:**
- Check for any build errors in the terminal
- Wait for "Server started" or similar message
- Look for any TypeScript compilation errors

---

### Step 2: Hard Refresh the Browser

**Clear cache and reload:**
- **Chrome/Edge**: `Ctrl + Shift + R` or `Ctrl + F5`
- **Firefox**: `Ctrl + Shift + R`
- **Alternative**: Open DevTools → Network tab → Check "Disable cache" → Refresh

**Why this matters:**
- Browser may be serving cached JavaScript files
- Hard refresh forces re-download of all assets

---

### Step 3: Check Browser Console

**Open DevTools Console (F12) and look for:**

#### Expected Logs (if working):
```
[Game] Using player ID: gPQ3bWdY6uhmtjZE1dnx
Creating NPC: Professor Smith (ID: prof_smith)
Creating name label for: Professor Smith
Creating NPC: Sarah Johnson (ID: admissions_staff)
Creating name label for: Sarah Johnson
Creating NPC: Mike Anderson (ID: tech_support)
Creating name label for: Mike Anderson
[useQuestData] Fetching quest data for player: gPQ3bWdY6uhmtjZE1dnx
[Firestore] Fetching document: Player/gPQ3bWdY6uhmtjZE1dnx
[Game] Quest data state: { loading: true, ... }
```

#### If you DON'T see these logs:
- Changes haven't been loaded yet
- Dev server needs restart
- Build failed

---

### Step 4: Check Network Tab

**In DevTools → Network tab:**
1. Refresh the page
2. Look for JavaScript files being loaded
3. Check the **Size** column:
   - If it says "(disk cache)" or "(memory cache)" → Browser is using cached files
   - If it shows actual file sizes → Files are being re-downloaded

**Fix:**
- Hard refresh again (Ctrl + Shift + R)
- Or clear browser cache completely

---

### Step 5: Verify Build Output

**Check terminal for build messages:**
```
✓ Built in XXXms
✓ Compiled successfully
```

**If you see errors:**
- Read the error messages carefully
- Fix any TypeScript/syntax errors
- Save the files again

---

### Step 6: Check File Timestamps

**Verify files were actually saved:**
```powershell
# In PowerShell, check when files were last modified:
Get-ChildItem "src/entities/NPC.ts" | Select-Object Name, LastWriteTime
Get-ChildItem "src/Game.tsx" | Select-Object Name, LastWriteTime
Get-ChildItem "src/hooks/useQuestData.ts" | Select-Object Name, LastWriteTime
```

**Expected:** All files should show recent timestamps (within the last few minutes)

---

## 🎯 Quick Fix Commands

**Run these in order:**

```powershell
# 1. Stop dev server (Ctrl+C in terminal)

# 2. Clear Bun cache (if needed)
bun pm cache rm

# 3. Restart dev server
bun run dev
```

**Then in browser:**
1. Open DevTools (F12)
2. Go to Network tab
3. Check "Disable cache"
4. Hard refresh (Ctrl + Shift + R)
5. Check Console tab for logs

---

## 📊 Expected Results After Fix

### Console Logs:
```
[Game] Using player ID: gPQ3bWdY6uhmtjZE1dnx
Creating NPC: Professor Smith (ID: prof_smith)
Creating name label for: Professor Smith
[useQuestData] Fetching quest data for player: gPQ3bWdY6uhmtjZE1dnx
[Firestore] Fetching document: Player/gPQ3bWdY6uhmtjZE1dnx
[useQuestData] Player found: { username: 'johnwebofficial', ... }
[Game] Quest data state: { loading: false, error: null, activeQuestsCount: 1, completedQuestsCount: 1 }
```

### Visual Changes:
- ✅ NPC names appear in **Neumont Yellow (#FFDD00)**
- ✅ NPC name backgrounds are **Neumont Grey (#1F1F1F)**
- ✅ Quest tracker shows in top-right corner
- ✅ Quest data loads (1 active, 1 completed)

---

## 🚨 If Still Not Working

### Check for Multiple Dev Servers
```powershell
# Check if multiple Bun processes are running
Get-Process bun
```
**Fix:** Kill all Bun processes and restart one dev server

### Check Port Conflicts
- Verify you're accessing the correct URL (usually `http://localhost:3000` or `http://localhost:5173`)
- Check terminal for the actual port number

### Check for Duplicate Files
```powershell
# Search for duplicate NPC.ts files
Get-ChildItem -Recurse -Filter "NPC.ts"
```
**Expected:** Should only find one in `src/entities/NPC.ts`

### Nuclear Option - Full Clean Rebuild
```powershell
# Stop dev server (Ctrl+C)

# Remove node_modules and reinstall
Remove-Item -Recurse -Force node_modules
bun install

# Clear all caches
bun pm cache rm

# Restart dev server
bun run dev
```

---

## ✅ Success Indicators

You'll know it's working when you see:
1. ✅ Console shows all `[Game]`, `[useQuestData]`, `[Firestore]`, and "Creating NPC" logs
2. ✅ NPC names appear in Neumont Yellow above sprites
3. ✅ Quest tracker shows in top-right corner
4. ✅ No errors in console
5. ✅ Network tab shows files being re-downloaded (not cached)

---

**Next Steps:**
1. Restart dev server
2. Hard refresh browser
3. Check console for logs
4. Report back what you see in the console

