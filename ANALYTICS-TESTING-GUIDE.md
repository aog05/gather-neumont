# Analytics System Testing Guide

## Overview
This guide provides step-by-step instructions for testing the complete analytics system across both the webpage app and admin portal.

---

## Prerequisites

1. **Firebase Setup**
   - Firebase project configured
   - Firestore database enabled
   - Analytics collection created (see Setup section)

2. **Both Apps Built**
   ```bash
   # Build webpage app
   cd webpage
   bun run build
   
   # Build admin portal
   cd ../gather_portal
   bun run build
   ```

---

## Setup: Create Analytics Collection

### Option 1: Run Seeding Script (Recommended)

```bash
cd webpage
bun run src/lib/create-analytics-collection.ts
```

This will:
- Create the `Analytics` collection in Firebase
- Add 12 sample events demonstrating all event types
- Provide instructions for creating indexes

### Option 2: Manual Creation

1. Go to Firebase Console → Firestore Database
2. Create a new collection named `Analytics`
3. Add a sample document with this structure:
   ```json
   {
     "eventType": "session_start",
     "playerId": "test_user",
     "timestamp": <Firestore Timestamp>,
     "metadata": {
       "userAgent": "Mozilla/5.0...",
       "screenResolution": "1920x1080"
     }
   }
   ```

### Create Firestore Indexes

**Required Composite Indexes:**

1. **Player Activity Index**
   - Collection: `Analytics`
   - Fields: `playerId` (Ascending) + `timestamp` (Descending)

2. **Event Type Index**
   - Collection: `Analytics`
   - Fields: `eventType` (Ascending) + `timestamp` (Descending)

3. **Player Event Type Index**
   - Collection: `Analytics`
   - Fields: `playerId` (Ascending) + `eventType` (Ascending) + `timestamp` (Descending)

**How to Create:**
1. Go to Firebase Console → Firestore Database → Indexes
2. Click "Create Index"
3. Select `Analytics` collection
4. Add fields as specified above
5. Click "Create Index" (may take a few minutes)

---

## Testing Workflow

### Phase 1: Webpage App - Event Tracking

#### 1. Start the Webpage App

```bash
cd webpage
bun run dev
```

Navigate to `http://localhost:3000`

#### 2. Test Session Tracking

**Expected Events:**
- ✅ `session_start` - When MainScene loads
- ✅ `scene_enter` - When entering MainScene

**How to Verify:**
1. Open browser DevTools → Console
2. Look for: `[AnalyticsService] Flushed X events`
3. Check Firebase Console → Analytics collection
4. Verify documents with `eventType: "session_start"` and `"scene_enter"`

**Expected Metadata:**
```json
{
  "eventType": "session_start",
  "playerId": "sarah_dev",
  "metadata": {
    "userAgent": "Mozilla/5.0...",
    "screenResolution": "1920x1080"
  }
}
```

#### 3. Test NPC Interaction Tracking

**Steps:**
1. Move player (WASD or Arrow keys) to an NPC
2. Press `E` to interact
3. Go through dialogue options
4. Close dialogue (ESC or finish conversation)

**Expected Events:**
- ✅ `npc_interaction` - When pressing E near NPC
- ✅ `dialogue_start` - When dialogue begins
- ✅ `dialogue_end` - When dialogue closes

**Expected Metadata:**
```json
{
  "eventType": "npc_interaction",
  "playerId": "sarah_dev",
  "metadata": {
    "npcId": "dean_walsh",
    "npcName": "Dean Walsh",
    "dialogueTreeId": "dean_welcome"
  }
}
```

#### 4. Test Quest Tracking

**Steps:**
1. Interact with NPC that triggers a quest
2. Accept the quest
3. Complete quest requirements
4. Return to NPC to complete quest

**Expected Events:**
- ✅ `quest_start` - When quest is accepted
- ✅ `quest_complete` - When quest is completed

**Expected Metadata:**
```json
{
  "eventType": "quest_complete",
  "playerId": "sarah_dev",
  "metadata": {
    "questId": "intro_quest",
    "questTitle": "Welcome to Neumont",
    "rewardPoints": 50,
    "previousPoints": 100,
    "newPoints": 150
  }
}
```

#### 5. Test Quiz Tracking

**Steps:**
1. Move to Quiz Terminal
2. Press `E` to start quiz
3. Answer question (try wrong answer first)
4. Submit correct answer

**Expected Events:**
- ✅ `quiz_start` - When quiz begins
- ✅ `quiz_attempt` - For each answer submission
- ✅ `quiz_complete` - When quiz is completed

**Expected Metadata:**
```json
{
  "eventType": "quiz_complete",
  "playerId": "sarah_dev",
  "metadata": {
    "questionId": "q_001",
    "pointsEarned": 80,
    "attemptNumber": 2,
    "elapsedMs": 28000,
    "quizDate": "2026-03-01"
  }
}
```

#### 6. Test Session End

**Steps:**
1. Close the browser tab or navigate away
2. Check Firebase Console after 30 seconds

**Expected Events:**
- ✅ `session_end` - When scene is destroyed

**Expected Metadata:**
```json
{
  "eventType": "session_end",
  "playerId": "sarah_dev",
  "metadata": {
    "durationMs": 1800000,
    "durationMinutes": 30
  }
}
```

---

### Phase 2: Admin Portal - Analytics Dashboard

#### 1. Start the Admin Portal

```bash
cd gather_portal
bun run dev
```

Navigate to `http://localhost:3001`

#### 2. Navigate to Analytics Dashboard

1. Click "Analytics" in the sidebar (📈 icon)
2. Wait for data to load (loading spinner)

#### 3. Verify Overview Cards

**Expected Cards:**
- ✅ Total Players (count from Player collection)
- ✅ Quizzes Completed (count from Player.PuzzleRecord)
- ✅ Total Points Earned (sum of Player.Wallet)
- ✅ Active Quests (count from Player.ActiveQuests)
- ✅ Completed Quests (count from Player.CompletedQuests)
- ✅ Total NPCs (count from NPC collection)

**How to Verify:**
- Numbers should match Firebase data
- Cards should have yellow accent borders
- Hover effects should work

#### 4. Verify Charts

**1. Points Distribution (Pie Chart)**
- Shows 5 ranges: 0-100, 101-500, 501-1000, 1001-5000, 5000+
- Colors: Yellow, Green, Blue, Orange, Red
- Tooltips show count on hover

**2. Quest Completion (Bar Chart)**
- Shows top 5 quests
- Two bars: Active (orange) and Completed (green)
- X-axis shows quest titles

**3. Top Players Leaderboard (Table)**
- Shows top 10 players
- Medals for top 3: 🥇🥈🥉
- Columns: Rank, Username, Points, Quizzes, Quests
- Hover effect on rows

**4. Player Activity Trend (Line Chart)**
- 30-day trend
- Two lines: Active Players (yellow), New Players (green)
- X-axis shows dates (M/D format)
- Tooltips show full date

**5. Most Popular NPCs (Horizontal Bar Chart)**
- Top 8 NPCs by interaction count
- Blue bars
- Y-axis shows NPC names

**6. Quiz Completions by Day (Bar Chart)**
- Monday through Sunday
- Yellow bars
- Shows completion distribution

#### 5. Test Refresh Functionality

**Steps:**
1. Click "🔄 Refresh Data" button
2. Verify loading spinner appears
3. Verify data reloads
4. Check console for cache clear message

**Expected Behavior:**
- Cache is cleared
- All data is re-fetched from Firebase
- Charts update with latest data

---

## Troubleshooting

### Issue: No events in Analytics collection

**Solution:**
1. Check browser console for errors
2. Verify Firebase config is correct
3. Check Firestore rules allow writes to Analytics collection
4. Verify `AnalyticsService.getInstance().setEnabled(true)` is called

### Issue: Dashboard shows "Loading..." forever

**Solution:**
1. Check browser console for errors
2. Verify Analytics collection exists in Firebase
3. Check Firestore indexes are created
4. Verify Firebase config in admin portal

### Issue: Events not batching

**Solution:**
1. Wait 30 seconds for batch timer
2. Perform 10+ actions to trigger batch size limit
3. Check console for `[AnalyticsService] Flushed X events`

### Issue: Incorrect data in dashboard

**Solution:**
1. Click "Refresh Data" to clear cache
2. Verify Firebase data is correct
3. Check aggregation logic in `analytics.service.ts`

---

## Performance Verification

### Expected Performance Metrics

**Webpage App:**
- Event tracking overhead: < 5ms per event
- No frame rate impact during gameplay
- Batch flush: < 100ms for 10 events

**Admin Portal:**
- Dashboard load time: < 3 seconds
- Cache hit rate: > 90% after first load
- Firebase queries: < 20 per dashboard load

### How to Measure

**Webpage App:**
```javascript
// In browser console
performance.mark('event-start');
analyticsService.trackEvent(...);
performance.mark('event-end');
performance.measure('event-tracking', 'event-start', 'event-end');
console.log(performance.getEntriesByName('event-tracking'));
```

**Admin Portal:**
```javascript
// In browser console (Network tab)
// Filter by "firestore.googleapis.com"
// Count number of requests
// Check response times
```

---

## Success Criteria

### Webpage App
- ✅ All 8 event types are tracked
- ✅ Events appear in Firebase within 30 seconds
- ✅ No console errors
- ✅ No performance degradation
- ✅ Metadata is complete and accurate

### Admin Portal
- ✅ Dashboard loads in < 3 seconds
- ✅ All 6 charts render correctly
- ✅ Data matches Firebase
- ✅ Refresh button works
- ✅ Neumont Brand styling applied
- ✅ Responsive on mobile/tablet

---

## Next Steps After Testing

1. **Production Deployment**
   - Set up Firebase indexes in production
   - Configure Firestore security rules
   - Enable Firebase Analytics SDK

2. **Monitoring**
   - Set up Firebase usage alerts
   - Monitor Analytics collection size
   - Track dashboard load times

3. **Enhancements**
   - Add date range filters
   - Add export functionality (CSV/JSON)
   - Add real-time updates (WebSocket)
   - Add more event types (cosmetic purchases, etc.)

---

## Support

If you encounter issues:
1. Check browser console for errors
2. Verify Firebase Console for data
3. Review this guide's Troubleshooting section
4. Check ANALYTICS-ROADMAP.md for architecture details

