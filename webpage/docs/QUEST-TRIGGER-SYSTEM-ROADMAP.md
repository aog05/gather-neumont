# Quest Trigger System — Implementation Roadmap

> **Scope:** This document is the authoritative implementation plan for a full quest trigger and objective tracking system. It covers location zones, stat-based objectives (quiz completions, streaks, points), NPC interaction tracking, and a single extensible master trigger file. Stretch goals are listed at the end and are explicitly **not** part of this roadmap.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Phase 1 — Extend Quest & Player Schemas](#2-phase-1--extend-quest--player-schemas)
3. [Phase 2 — QuestTriggerSystem (Master File)](#3-phase-2--questtriggersystem-master-file)
4. [Phase 3 — LocationZone Entity](#4-phase-3--locationzone-entity)
5. [Phase 4 — NPC Talk Objective Wiring](#5-phase-4--npc-talk-objective-wiring)
6. [Phase 5 — Quiz Stat Objective Wiring](#6-phase-5--quiz-stat-objective-wiring)
7. [Phase 6 — QuestTracker UI: Objective Progress](#7-phase-6--questtracker-ui-objective-progress)
8. [Phase 7 — Firestore Seeding & Admin Tooling](#8-phase-7--firestore-seeding--admin-tooling)
9. [Stretch Goals](#9-stretch-goals)

---

## 1. Architecture Overview

```
┌────────────────────────────────────────────────────────────────┐
│                        GameEventBridge (singleton)             │
│  Emitters                          Listeners                   │
│  ──────────────────────────────────────────────────────────    │
│  NPC.startDialogue()  → npc:talked                             │
│  LocationZone.update()→ zone:entered                           │
│  useQuiz (React)      → quiz:completed  (window → bridge)      │
│  QuestTriggerSystem   → quest:objective:updated                │
│                       → quest:completed  (→ GameState)         │
└────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────┐
│       QuestTriggerSystem         │  ← THE MASTER FILE
│  (webpage/src/systems/)          │
│                                  │
│  listens: npc:talked             │
│           zone:entered           │
│           quiz:completed         │
│           quest:started          │
│                                  │
│  evaluates: active quest         │
│             objectives each      │
│             event                │
│                                  │
│  calls: GameState.completeQuest()│
│  emits: quest:objective:updated  │
│         quest:completed          │
└──────────────────────────────────┘

Phaser World
  └── MainScene.create()
        ├── LocationZoneManager  (places zones from JSON config)
        ├── NPCManager           (already exists)
        ├── QuestTriggerSystem   (NEW — wired here)
        └── ... terminals

React Layer
  └── useQuestData        (refreshes on quest:started / quest:completed)
  └── QuestTracker        (shows objective progress via quest:objective:updated)
  └── useQuiz             (fires window event → bridge on quiz completion)
```

---

## 2. Phase 1 — Extend Quest & Player Schemas

### 2a. New types — `webpage/src/types/quest.types.ts` (NEW FILE)

Create this file with all quest-objective types.

```typescript
/** Every supported trigger category. Add new entries here to extend the system. */
export type QuestTriggerType =
  | 'location'        // player physically enters a named zone
  | 'npc_talk'        // player starts dialogue with a specific NPC
  | 'quiz_complete'   // player completes N daily quizzes (cumulative)
  | 'quiz_streak'     // player reaches a streak of N consecutive days
  | 'stat_threshold'; // player's totalPoints >= N

export interface QuestObjective {
  /** Unique within the quest (e.g. "visit_library", "talk_to_dean") */
  id: string;
  type: QuestTriggerType;
  description: string;

  // --- location ---
  zoneId?: string;          // matches LocationZone.zoneId

  // --- npc_talk ---
  npcId?: string;           // matches NPCConfig.id (e.g. "dean_walsh")

  // --- quiz_complete | quiz_streak | stat_threshold ---
  requiredValue?: number;   // e.g. 3 (quizzes), 7 (streak days), 500 (points)
}

export interface QuestObjectiveProgress {
  objectiveId: string;
  completed: boolean;
  /** Current value for countable objectives (quiz_complete, quiz_streak, stat_threshold) */
  currentValue: number;
}

export interface QuestProgress {
  questId: string;
  objectives: QuestObjectiveProgress[];
  allComplete: boolean;
}
```

### 2b. Extend `Quest` in `webpage/src/types/firestore.types.ts`

Add an `objectives` array to the existing `Quest` interface:

```typescript
export interface Quest extends FirestoreDocument {
  Title: string;
  smalldesc: string;
  Reward: QuestReward;
  Next: string;
  /** Structured objectives. Legacy quests with no objectives auto-complete on start. */
  objectives?: import('./quest.types').QuestObjective[];
}
```

### 2c. Extend `Player` in `webpage/src/types/firestore.types.ts`

Add objective progress storage to the `Player` interface:

```typescript
export interface Player extends FirestoreDocument {
  // ... existing fields ...
  /**
   * Per-quest objective progress.
   * Shape: { [questId]: { [objectiveId]: { completed: boolean; currentValue: number } } }
   * Written by QuestTriggerSystem, read by useQuestData / QuestTracker.
   */
  QuestProgress?: Record<string, Record<string, { completed: boolean; currentValue: number }>>;
}
```

### 2d. Extend `GameEventBridge` event contracts

Add the new event signatures to the JSDoc in `webpage/src/systems/GameEventBridge.ts`:

```
New events (Phaser → React):
  'npc:talked'               → { npcId: string }
  'zone:entered'             → { zoneId: string }
  'quiz:completed'           → { totalPoints: number; streakDays: number; quizzesCompleted: number }
  'quest:objective:updated'  → { questId: string; objectiveId: string; currentValue: number; completed: boolean }
```

---

## 3. Phase 2 — QuestTriggerSystem (Master File)

### File: `webpage/src/systems/QuestTriggerSystem.ts`

This is the **single source of truth** for all quest trigger logic. Every new trigger type is added here as a private handler.

**Constructor signature:**
```typescript
constructor(
  gameState: GameState,
  bridge: GameEventBridge,
  playerUsername: string
)
```

**Responsibilities:**
1. On construction, bind all event listeners to `bridge`.
2. On `quest:started` — load the quest's objectives from Firestore; cache them.
3. On each trigger event — call `evaluateObjective(questId, objectiveId, newValue)`.
4. `evaluateObjective` writes progress to Firestore `Player.QuestProgress`, emits `quest:objective:updated`, and — when all objectives for a quest are done — calls `gameState.completeQuest(questId)`.

**Private handlers to implement (one per trigger type):**

| Handler | Listens to | Checks |
|---|---|---|
| `handleNpcTalked` | `npc:talked` | all active quests with `type: 'npc_talk'` whose `npcId` matches |
| `handleZoneEntered` | `zone:entered` | all active quests with `type: 'location'` whose `zoneId` matches |
| `handleQuizCompleted` | `quiz:completed` | all active quests with `type: 'quiz_complete'`, increment counter; `type: 'quiz_streak'`, compare streakDays; `type: 'stat_threshold'`, compare totalPoints |
| `handleQuestStarted` | `quest:started` | loads objectives for the new quest into internal cache |

**Extensibility contract:** To add a new trigger type in the future:
1. Add the string literal to `QuestTriggerType` in `quest.types.ts`.
2. Add a new private handler method in `QuestTriggerSystem`.
3. Register the new event listener in the constructor.
4. No other files need changes.

**Skeleton:**
```typescript
export class QuestTriggerSystem {
  private activeQuestObjectives: Map<string, QuestObjective[]> = new Map();

  constructor(private gs: GameState, private bridge: GameEventBridge, private username: string) {
    bridge.on('quest:started',          this.handleQuestStarted.bind(this));
    bridge.on('npc:talked',             this.handleNpcTalked.bind(this));
    bridge.on('zone:entered',           this.handleZoneEntered.bind(this));
    bridge.on('quiz:completed',         this.handleQuizCompleted.bind(this));
  }

  private async handleQuestStarted(data: { questId: string }) { /* load + cache objectives */ }
  private async handleNpcTalked(data: { npcId: string })      { /* find + evaluate 'npc_talk' objectives */ }
  private async handleZoneEntered(data: { zoneId: string })   { /* find + evaluate 'location' objectives */ }
  private async handleQuizCompleted(data: QuizCompletedPayload){ /* evaluate quiz_complete/streak/stat */ }

  private async evaluateObjective(questId: string, objectiveId: string, newValue: number) { /* core logic */ }

  public destroy() { this.bridge.removeAllListeners(); }
}
```



---

## 4. Phase 3 — LocationZone Entity

### File: `webpage/src/entities/LocationZone.ts` (NEW FILE)

A `LocationZone` is a named, invisible rectangular area on the map. When the player's physics body overlaps it for the first time per session, a `zone:entered` event is fired on `GameEventBridge`.

**Constructor signature:**
```typescript
constructor(
  scene: Phaser.Scene,
  x: number, y: number,
  width: number, height: number,
  zoneId: string,
  bridge: GameEventBridge,
  debug?: boolean   // draws a semi-transparent rect in dev mode
)
```

**Core logic (called from `update`):**
```typescript
public checkPlayer(player: Phaser.GameObjects.GameObject): void {
  if (this.hasTriggered) return;
  const inside = Phaser.Geom.Rectangle.Contains(this.bounds, playerX, playerY);
  if (inside) {
    this.hasTriggered = true;
    this.bridge.emit('zone:entered', { zoneId: this.zoneId });
  }
}
```

`hasTriggered` is per-session only (not persisted) — `QuestTriggerSystem` is responsible for idempotency via Firestore.

### File: `webpage/src/entities/LocationZoneManager.ts` (NEW FILE)

Manages a collection of `LocationZone` objects loaded from a JSON config.

**Zone config shape (`webpage/src/config/location-zones.json`):**
```json
[
  { "id": "library",      "x": 320, "y": 160, "w": 200, "h": 120 },
  { "id": "admin_office", "x": 640, "y": 80,  "w": 150, "h": 100 },
  { "id": "lab_room_1",   "x": 960, "y": 240, "w": 180, "h": 140 }
]
```

**Integration in `MainScene.create()`:**
```typescript
this.locationZoneManager = new LocationZoneManager(this, this.bridge);
this.locationZoneManager.loadFromConfig(locationZonesConfig);
```

**Integration in `MainScene.update()`:**
```typescript
this.locationZoneManager.update(this.player);
```

**Adding zones for a new floor:** Add entries to `location-zones.json` (or a per-floor file). No code changes needed.

---

## 5. Phase 4 — NPC Talk Objective Wiring

### Changes to `webpage/src/entities/NPCManager.ts`

After a dialogue successfully starts, emit `npc:talked` on the bridge. The dialogue already emits `dialogue:request` → `dialogue:start`. The right place to emit `npc:talked` is inside `NPCManager` just before (or just after) emitting `dialogue:request`, so we have the `npcId` in scope:

```typescript
// Inside NPCManager — after determining the NPC to interact with:
this.bridge.emit('npc:talked', { npcId: npc.id });
this.bridge.emit('dialogue:request', { npcId: npc.id, treeId: ..., startNode: ... });
```

Emitting `npc:talked` separately (rather than deriving it from `dialogue:start`) keeps the trigger system decoupled from the dialogue system.

### How `QuestTriggerSystem.handleNpcTalked` works

```
1. Receive { npcId }
2. For each quest in activeQuestObjectives:
     For each objective where type === 'npc_talk' && objective.npcId === npcId:
       evaluateObjective(questId, objective.id, 1)  // value is binary: 0 or 1
3. evaluateObjective writes progress, emits quest:objective:updated
4. If all objectives complete → GameState.completeQuest(questId)
```

### Verifying NPC talks in Firestore

`Player.QuestProgress[questId][objectiveId]` is set to `{ completed: true, currentValue: 1 }` the moment the player initiates dialogue. `useQuestData` re-fetches on `quest:objective:updated`, so the Quest Tracker UI updates in real time without a page reload.

---

## 6. Phase 5 — Quiz Stat Objective Wiring

### Bridge between React quiz result and Phaser trigger system

The quiz completion currently lives entirely in React (`useQuiz` hook + `/api/quiz/submit` server route). After the server confirms a successful submission, fire a bridge event so `QuestTriggerSystem` can react:

**In `webpage/src/hooks/useQuiz.ts` — after `recordPlayerQuizCompletion` succeeds:**
```typescript
// Emit to GameEventBridge so QuestTriggerSystem can evaluate stat objectives
const bridge = GameEventBridge.getInstance();
bridge.emit('quiz:completed', {
  totalPoints:      summary.totalPoints,
  streakDays:       summary.streakDays,
  quizzesCompleted: summary.quizzesCompleted,  // new field: total lifetime quizzes done
});
```

`summary.quizzesCompleted` requires a new field on the server summary response (count of `QuizCompletions` sub-documents for this player). Add it to `getPlayerSubmitSummary()` in `webpage/src/server/api/quiz.ts`.

### How `QuestTriggerSystem.handleQuizCompleted` works

```
Payload: { totalPoints, streakDays, quizzesCompleted }

For each active quest objective:
  type === 'quiz_complete':
    evaluateObjective(questId, obj.id, quizzesCompleted)
    → complete when currentValue >= requiredValue

  type === 'quiz_streak':
    evaluateObjective(questId, obj.id, streakDays)
    → complete when currentValue >= requiredValue

  type === 'stat_threshold':
    evaluateObjective(questId, obj.id, totalPoints)
    → complete when currentValue >= requiredValue
```

All three share the same `evaluateObjective` path — only the comparison value differs.

### Sample Firestore quest documents for stat quests

```json
// Quest: "Quiz Novice" — complete your first 3 daily quizzes
{
  "Title": "Quiz Novice",
  "smalldesc": "Complete 3 daily quizzes to prove your curiosity.",
  "Reward": { "Points": 100 },
  "Next": "quiz_apprentice_quest_id",
  "objectives": [
    { "id": "complete_3_quizzes", "type": "quiz_complete", "description": "Complete 3 daily quizzes", "requiredValue": 3 }
  ]
}

// Quest: "On A Roll" — maintain a 7-day streak
{
  "Title": "On A Roll",
  "smalldesc": "Log in and answer the daily quiz 7 days in a row.",
  "Reward": { "Points": 250 },
  "Next": "",
  "objectives": [
    { "id": "streak_7", "type": "quiz_streak", "description": "Reach a 7-day streak", "requiredValue": 7 }
  ]
}
```

---

## 7. Phase 6 — QuestTracker UI: Objective Progress

### Changes to `webpage/src/hooks/useQuestData.ts`

Listen for `quest:objective:updated` to trigger a lightweight state update (no Firestore re-fetch needed for progress bars — use the event payload directly):

```typescript
bridge.on('quest:objective:updated', (data: {
  questId: string; objectiveId: string; currentValue: number; completed: boolean;
}) => {
  setObjectiveProgress(prev => ({
    ...prev,
    [data.questId]: {
      ...(prev[data.questId] ?? {}),
      [data.objectiveId]: { currentValue: data.currentValue, completed: data.completed }
    }
  }));
});
```

Return `objectiveProgress` from the hook so UI components can display progress bars.

### QuestTracker UI changes (wherever quests are rendered)

For each active quest objective, render:
- A checkmark icon when `completed === true`
- A progress counter (`currentValue / requiredValue`) for countable objectives
- An NPC name / zone name for `npc_talk` / `location` objectives (labels resolved from the config, not Firestore)

---

## 8. Phase 7 — Firestore Seeding & Admin Tooling

### Seeding

Add a Bun script at `webpage/scripts/seed-quests.ts` that batch-writes sample quest documents (with `objectives` arrays) to Firestore. This makes testing self-contained without manual Firebase console edits.

Run with: `bun run webpage/scripts/seed-quests.ts`

### Admin panel

The existing admin panel (in `gather_portal/`) should display:
- A list of all quests with their objective arrays
- A form to add/edit quest objectives (type, zoneId/npcId/requiredValue fields)
- A "Test Trigger" button that fires the selected event on the bridge for in-browser testing

This is a portal-side change only — no game scene code is affected.

---

## 9. Stretch Goals

> These are **not** part of this roadmap. They are listed here for future planning.

| # | Goal | Notes |
|---|------|-------|
| 1 | **Timed quests** — objectives must be completed within N minutes of quest start | Requires a `startedAt` timestamp in `Player.QuestProgress` and a Phaser timer |
| 2 | **Multi-step quest chains** — completing one quest auto-starts the next via `Quest.Next` | `GameState.completeQuest` already has `Next` in schema; just needs auto-`startQuest` call |
| 3 | **Group / social quests** — objectives completed by any member of a student group | Needs a `Group` Firestore collection and group membership tracking |
| 4 | **Repeatable daily quests** — reset every 24 h, grant smaller recurring rewards | Requires a `repeatable: true` flag and a date-keyed reset mechanism |
| 5 | **Item / cosmetic rewards** — quests that grant a hat or shirt instead of (or in addition to) points | `QuestReward` already has `Reward.Points`; extend it with `Reward.CosmeticId` |
| 6 | **Hidden / secret quests** — not shown in QuestTracker until triggered | Add `hidden: true` to the Quest schema; filter out in UI |
| 7 | **Floor-gating** — quests that only appear on a specific floor | Add `floor: number` to the Quest schema; filter active quests by current floor |
| 8 | **NPC dialogue branches unlock quests** — talking to an NPC with a specific flag set starts a different quest than talking without it | Extend dialogue `actions` to support `startQuest` with a condition check |
| 9 | **Leaderboard for quest completion** — show top players by number of quests completed | New read-only Firestore query; portal-side leaderboard component |
| 10 | **Push notifications / toasts** — browser notification when a daily quest resets | Service worker + Notification API; requires user opt-in |
