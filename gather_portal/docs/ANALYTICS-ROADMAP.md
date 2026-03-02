# Analytics Dashboard Roadmap
## Neumont Virtual Campus Admin Portal

**Version:** 1.0  
**Date:** 2026-03-01  
**Status:** Planning Phase

---

## 📋 Executive Summary

This document outlines the complete roadmap for implementing a comprehensive Analytics Dashboard in the Neumont Virtual Campus Admin Portal. The dashboard will track and visualize user activity, engagement metrics, and game interactions in real-time.

---

## 1. Data Collection Requirements

### 1.1 Currently Tracked Data ✅

**Quiz Completions** (Already Tracked):
- **Location:** `PuzzleWeek/{weekId}/PuzzleDay/{dayOfWeek}`
- **Fields:** `topScore` (array), `topTen` (array of player IDs), `completionTimeMs`, `dow`, `puzzle`
- **Also Saved To:** `Player.PuzzleRecord` (array of puzzle IDs)
- **Points:** Added to `Player.Wallet`

**Quest Completions** (Already Tracked):
- **Location:** `Player.ActiveQuests` (array), `Player.CompletedQuests` (array)
- **Fields:** Quest IDs only
- **Points:** Added to `Player.Wallet` on completion

**Player Data** (Already Tracked):
- **Location:** `Player` collection
- **Fields:** `Username`, `Email`, `Wallet` (points as string), `PuzzleRecord`, `ActiveQuests`, `CompletedQuests`, `OwnedCosmetics`, `SkillTree`

### 1.2 Data NOT Currently Tracked ❌

**Session Tracking:**
- Login/logout events
- Session duration
- Last active timestamp
- Total play time

**NPC Interactions:**
- Which NPCs are interacted with
- Interaction frequency per NPC
- Dialogue paths chosen
- Time spent in dialogue

**Page/Scene Navigation:**
- Scene transitions
- Time spent in each scene
- Navigation patterns

**Cosmetic Purchases:**
- Items purchased
- Purchase timestamps
- Points spent

**Skill Tree Progress:**
- Skills unlocked
- Skill progression over time

### 1.3 New Data Collection Needed 🆕

**Analytics Collection** (New Firebase Collection):
```typescript
interface AnalyticsEvent {
  id: string;
  eventType: 'session_start' | 'session_end' | 'npc_interaction' | 'quest_start' | 'quest_complete' | 'cosmetic_purchase' | 'scene_change';
  playerId: string;
  timestamp: Timestamp;
  metadata: Record<string, any>; // Event-specific data
}
```

**Player Session Data** (Add to Player collection):
```typescript
interface PlayerSession {
  lastLogin: Timestamp;
  lastLogout: Timestamp;
  totalPlayTimeMs: number;
  sessionCount: number;
}
```

**NPC Interaction Tracking** (New subcollection under Analytics):
```typescript
interface NPCInteraction {
  npcId: string;
  playerId: string;
  timestamp: Timestamp;
  dialogueTreeId: string;
  pathsTaken: string[]; // Array of dialogue node IDs
}
```

---

## 2. Data Flow Architecture

### 2.1 Current Data Flow ✅

```
WEBPAGE APP (Game)
    ↓
Quiz Completion → saveQuizCompletionToPuzzleDay()
    ↓
Firebase Firestore
    ├─ PuzzleWeek/{weekId}/PuzzleDay/{dayOfWeek}
    └─ Player.PuzzleRecord + Player.Wallet
    ↓
ADMIN PORTAL
    ↓
useCollection hook → FirestoreService
    ↓
Display in Dashboard
```

### 2.2 Proposed Analytics Data Flow 🆕

```
WEBPAGE APP (Game)
    ↓
Event Occurs (NPC interaction, session start, etc.)
    ↓
AnalyticsService.logEvent()
    ↓
Firebase Firestore
    ├─ Analytics/{eventId} (individual events)
    ├─ AnalyticsSummary/{date} (daily aggregates)
    └─ Player (session data updates)
    ↓
ADMIN PORTAL
    ↓
AnalyticsService.getMetrics()
    ↓
Aggregate + Cache (reduce Firebase reads)
    ↓
Display in Dashboard with Recharts
```

### 2.3 New Firebase Collections

**Analytics Collection:**
- **Purpose:** Store individual analytics events
- **Structure:** Flat collection with timestamp-based queries
- **Retention:** Keep last 90 days, archive older data

**AnalyticsSummary Collection:**
- **Purpose:** Pre-aggregated daily/weekly/monthly statistics
- **Structure:** Document per time period (e.g., `2026-03-01`)
- **Benefits:** Faster dashboard loading, reduced Firebase reads

### 2.4 Real-time vs. Historical Strategy

**Real-time Data:**
- Active players (last 5 minutes)
- Current session count
- Live quiz attempts

**Cached/Aggregated Data:**
- Daily/weekly/monthly totals
- Historical trends
- Leaderboards
- Completion rates

**Update Strategy:**
- Real-time: Query on dashboard load + refresh button
- Aggregated: Cloud Function runs daily at midnight (future enhancement)
- Cache: Store in localStorage for 5 minutes

---

## 3. Integration Points Between Apps

### 3.1 Shared Firebase Collections

| Collection | Webpage (Game) | Admin Portal | Purpose |
|------------|----------------|--------------|---------|
| **Player** | Read/Write | Read/Write | User profiles, points, quests |
| **Puzzle** | Read | Read/Write | Quiz questions |
| **PuzzleWeek** | Read/Write | Read/Write | Weekly schedules, quiz completions |
| **Quest** | Read | Read/Write | Quest definitions |
| **NPC** | Read | Read/Write | NPC configurations |
| **Dialogue** | Read | Read/Write | Dialogue trees |
| **Cosmetic** | Read | Read/Write | Avatar items |
| **SkillTreeItems** | Read | Read/Write | Skill definitions |
| **Analytics** 🆕 | Write | Read | Event tracking |
| **AnalyticsSummary** 🆕 | - | Read | Aggregated metrics |

### 3.2 New Event Tracking in Webpage App

**Files to Modify:**

1. **`webpage/src/scenes/MainScene.ts`**
   - Track session start/end
   - Track scene changes
   - Log player spawn

2. **`webpage/src/entities/NPC.ts`** (Line 167-190)
   - Add analytics logging to `startDialogue()` method
   - Track NPC interaction events

3. **`webpage/src/systems/GameState.ts`** (Line 119-140)
   - Add analytics logging to `addQuest()` method
   - Track quest start events

4. **`webpage/src/server/api/quiz.ts`** (Line 391-415)
   - Already tracks quiz completions ✅
   - Add quiz attempt tracking (not just completions)

5. **Create `webpage/src/services/analytics.service.ts`** 🆕
   - Centralized analytics logging service
   - Batch events to reduce Firebase writes
   - Performance-optimized (non-blocking)

### 3.3 Performance Considerations

**Minimize Game Impact:**
- Use asynchronous logging (don't block game loop)
- Batch events (send every 30 seconds or on 10 events)
- Use Firebase Analytics SDK (already initialized)
- Fallback gracefully if Firebase is unavailable

**Reduce Firebase Costs:**
- Aggregate data daily (reduce read operations)
- Cache dashboard data (5-minute TTL)
- Use Firebase Analytics (free tier) for basic events
- Store detailed events in Firestore only when needed

---

## 4. Dashboard Metrics & Visualizations

### 4.1 Overview Statistics Cards

**Top Row (4 Cards):**
1. **Total Players** - Count of all Player documents
2. **Active Today** - Players with lastLogin today
3. **Total Quizzes Completed** - Sum of all PuzzleRecord lengths
4. **Total Points Earned** - Sum of all Wallet values

**Second Row (4 Cards):**
5. **Active Quests** - Sum of all ActiveQuests lengths
6. **Completed Quests** - Sum of all CompletedQuests lengths
7. **NPC Interactions (Today)** - Count from Analytics collection
8. **Average Session Duration** - Average of totalPlayTimeMs

### 4.2 Chart Visualizations

**1. Player Activity Over Time** (Line Chart)
- X-axis: Date (last 30 days)
- Y-axis: Active players
- Data: Count of unique players per day
- Color: Neumont Yellow (#FFDD00)

**2. Quiz Completion Rate** (Bar Chart)
- X-axis: Day of week (Monday-Sunday)
- Y-axis: Completion count
- Data: Aggregate from PuzzleDay subcollections
- Color: Green for completed, Red for attempted but not completed

**3. Most Popular NPCs** (Horizontal Bar Chart)
- X-axis: Interaction count
- Y-axis: NPC names
- Data: Count from Analytics NPC interactions
- Color: Neumont Yellow gradient

**4. Quest Completion Funnel** (Area Chart)
- X-axis: Quest chain position
- Y-axis: Player count
- Data: ActiveQuests vs CompletedQuests
- Shows drop-off points

**5. Points Distribution** (Pie Chart)
- Segments: Wallet ranges (0-100, 101-500, 501-1000, 1000+)
- Data: Group players by Wallet value
- Colors: Neumont brand palette

**6. Daily Quiz Performance** (Line Chart with Multiple Lines)
- X-axis: Date
- Y-axis: Average score
- Lines: Average score, Top score, Completion rate
- Data: From PuzzleDay topScore arrays

### 4.3 Detailed Metrics Tables

**Recent Activity Feed:**
- Last 20 analytics events
- Columns: Time, Player, Event Type, Details
- Real-time updates

**Top Players Leaderboard:**
- Top 10 by points
- Columns: Rank, Username, Points, Quizzes Completed, Quests Completed
- Data: From Player collection

**Quiz Performance by Topic:**
- Columns: Topic, Attempts, Completions, Avg Score, Difficulty Rating
- Data: Aggregate from Puzzle + PuzzleDay

---

## 5. Technology Stack

### 5.1 Visualization Library

**Recharts** (Already Installed ✅)
- Version: 3.7.0
- License: MIT
- Bundle Size: ~400KB
- Neumont Brand Compatible: Yes (customizable colors)

**Chart Types Needed:**
- `<LineChart>` - Player activity, quiz performance trends
- `<BarChart>` - Quiz completions, NPC interactions
- `<PieChart>` - Points distribution, quest status
- `<AreaChart>` - Quest completion funnel
- `<ComposedChart>` - Combined metrics (line + bar)

### 5.2 Data Fetching Strategy

**Service Layer:**
```typescript
// gather_portal/src/services/analytics.service.ts
class AnalyticsService {
  // Aggregate metrics from multiple collections
  async getOverviewMetrics(): Promise<OverviewMetrics>
  
  // Get time-series data for charts
  async getPlayerActivityData(days: number): Promise<ChartData[]>
  
  // Get quiz performance metrics
  async getQuizMetrics(): Promise<QuizMetrics>
  
  // Get NPC interaction data
  async getNPCInteractionData(): Promise<NPCInteractionData[]>
  
  // Cache management
  private cache: Map<string, { data: any; timestamp: number }>
  private getCached(key: string, ttl: number): any | null
  private setCache(key: string, data: any): void
}
```

**Caching Strategy:**
- Cache TTL: 5 minutes for aggregated data
- Cache TTL: 30 seconds for real-time data
- Store in React state + localStorage
- Invalidate on manual refresh

### 5.3 Component Architecture

```
AnalyticsDashboard (Main Component)
├─ OverviewCards (Statistics Cards)
│  ├─ StatCard (Reusable)
│  └─ TrendIndicator (Up/Down arrows)
├─ PlayerActivityChart (Line Chart)
├─ QuizCompletionChart (Bar Chart)
├─ NPCInteractionChart (Horizontal Bar)
├─ QuestFunnelChart (Area Chart)
├─ PointsDistributionChart (Pie Chart)
├─ QuizPerformanceChart (Multi-line)
├─ RecentActivityFeed (Table)
├─ TopPlayersLeaderboard (Table)
└─ DateRangeFilter (Dropdown)
```

### 5.4 Neumont Brand Styling

**Colors:**
- Primary: Neumont Yellow (#FFDD00)
- Background: Neumont Grey (#1F1F1F, #2a2a2a)
- Success: Green (#52C97C)
- Warning: Orange (#F0AD4E)
- Danger: Red (#D9534F)
- Info: Blue (#5CC0DE)

**Chart Customization:**
```typescript
const chartTheme = {
  stroke: '#FFDD00', // Neumont Yellow
  fill: 'rgba(255, 221, 0, 0.2)', // Transparent yellow
  grid: '#3a3a3a', // Dark grey
  text: '#ffffff', // White text
  tooltip: {
    backgroundColor: '#1F1F1F',
    border: '2px solid #FFDD00',
  },
};
```

---

## 6. Implementation Phases

### Phase 1: Foundation (Current)
- ✅ Create this roadmap document
- ✅ Review and approve architecture

### Phase 2: Analytics Service (Week 1)
- Create `analytics.service.ts` in admin portal
- Implement data aggregation methods
- Add caching layer
- Test with existing data

### Phase 3: Dashboard UI (Week 1-2)
- Create `AnalyticsDashboard.tsx` component
- Implement overview statistics cards
- Add Recharts visualizations
- Apply Neumont Brand styling

### Phase 4: Game-Side Tracking (Week 2)
- Create `webpage/src/services/analytics.service.ts`
- Add NPC interaction logging
- Add session tracking
- Add quest start/complete logging
- Performance testing

### Phase 5: Testing & Optimization (Week 3)
- Load testing with large datasets
- Cache optimization
- Firebase read cost analysis
- UI/UX refinements

---

## 7. Success Metrics

**Dashboard Performance:**
- Initial load time: < 2 seconds
- Chart render time: < 500ms
- Firebase reads per load: < 20 queries

**Game Performance:**
- Analytics logging overhead: < 5ms per event
- No frame rate impact
- Graceful degradation if Firebase unavailable

**Data Accuracy:**
- 100% of quiz completions tracked
- 95%+ of NPC interactions tracked
- 90%+ of session data tracked

---

## 8. Future Enhancements

**Phase 6: Advanced Analytics (Future)**
- Heatmaps (player movement patterns)
- Cohort analysis (player retention)
- A/B testing framework
- Predictive analytics (churn prediction)

**Phase 7: Automation (Future)**
- Cloud Functions for daily aggregation
- Automated reports (email summaries)
- Anomaly detection (unusual activity)
- Real-time alerts (system issues)

---

## 9. Risk Mitigation

**Risk: High Firebase Costs**
- Mitigation: Aggressive caching, daily aggregation, query limits

**Risk: Game Performance Impact**
- Mitigation: Async logging, batching, feature flags to disable

**Risk: Data Privacy Concerns**
- Mitigation: Anonymize sensitive data, GDPR compliance

**Risk: Dashboard Slow Loading**
- Mitigation: Lazy loading charts, pagination, data sampling

---

## 10. Next Steps

1. **Review this roadmap** with stakeholders
2. **Approve architecture** and technology choices
3. **Begin Phase 2** - Create analytics.service.ts
4. **Implement dashboard** with Recharts
5. **Add game-side tracking** (minimal impact)
6. **Test and deploy** to production

---

**Document Owner:** Augment Agent  
**Last Updated:** 2026-03-01  
**Status:** Ready for Review ✅

