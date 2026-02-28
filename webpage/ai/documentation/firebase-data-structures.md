# Firebase Firestore Data Structures

## Overview

This document provides comprehensive documentation of the Firebase Firestore database structure for the Neumont Virtual Campus Web App. All data structures documented here are based on actual data retrieved from the Firebase project `test-neumont`.

### Firebase Configuration

- **Project ID**: `test-neumont`
- **Auth Domain**: `test-neumont.firebaseapp.com`
- **Storage Bucket**: `test-neumont.firebasestorage.app`
- **Configuration File**: `src/lib/firebase.ts`

### Connection Setup

The Firebase app is initialized in `src/lib/firebase.ts` with Firestore database access. All TypeScript type definitions are available in `src/types/firestore.types.ts`.

```typescript
import { db, COLLECTIONS } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

// Example: Query a collection
const puzzlesRef = collection(db, COLLECTIONS.PUZZLE);
const snapshot = await getDocs(puzzlesRef);
```

---

## Collection Schemas

### 1. Puzzle Collection

**Collection Name**: `Puzzle`

**Purpose**: Stores daily CS puzzles and challenges for students to solve.

**Document Structure**:

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| `Name` | string | Puzzle title/name | Yes |
| `Topic` | string | Category (e.g., "CS", "Algorithms") | Yes |
| `Type` | string | Puzzle type (e.g., "code", "multiple_choice") | Yes |
| `solution` | string | Correct answer or solution | Yes |
| `Attempts` | number | Number of attempts allowed | Yes |
| `Reward` | number | Points awarded for completion | Yes |
| `conditions` | string[] | Array of conditions/test cases | Yes |

**Example Document**:
```json
{
  "id": "0GjZORaQ78lWoBxfqEyB",
  "Name": "Neuberts Java Challenge!",
  "Topic": "CS",
  "Type": "code",
  "solution": "CODEBLOCK",
  "Attempts": 3,
  "Reward": 500,
  "conditions": [
    "CODESNIPPET",
    "CODESNIPPET",
    "CODESNIPPET"
  ]
}
```

**TypeScript Interface**:
```typescript
interface Puzzle {
  id: string;
  Name: string;
  Topic: string;
  Type: string;
  solution: string;
  Attempts: number;
  Reward: number;
  conditions: string[];
}
```

---

### 2. PuzzleWeek Collection

**Collection Name**: `PuzzleWeek`

**Purpose**: Organizes puzzles by week. Acts as a parent collection for the `PuzzleDay` subcollection.

**Document Structure**:

The document itself appears to be primarily a container. The document ID follows the format: `MonthYearWeekNumber` (e.g., "Jan20261").

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| *(No fields)* | - | Container for subcollections | - |

**Subcollection**: `PuzzleDay`
- Path: `PuzzleWeek/{weekId}/PuzzleDay/{dayId}`
- Purpose: Individual daily puzzle assignments within a week

**Example Document**:
```json
{
  "id": "Jan20261"
}
```

**ID Format**: `{Month}{Year}{WeekNumber}` (e.g., "Jan20261", "Feb20262")

---

### 3. NPC Collection

**Collection Name**: `NPC`

**Purpose**: Defines non-player characters (faculty, staff, students) in the virtual campus.

**Document Structure**:

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| `Name` | string | Display name of the NPC | Yes |
| `Sprite` | object | Visual appearance configuration | Yes |
| `Sprite.shoes` | string | Cosmetic ID for shoes | Yes |
| `Sprite.hat` | string | Cosmetic ID for hat | Yes |
| `Sprite.skinColor` | string | Cosmetic ID or color value | Yes |
| `Sprite.shirt` | string | Cosmetic ID for shirt | Yes |
| `Sprite.accessories` | string | Cosmetic ID for accessories | Yes |
| `Sprite.pants` | string | Cosmetic ID for pants | Yes |
| `Placement` | number[] | Position [x, y] or [floor, position] | Yes |
| `Behavior` | string | AI behavior type | Yes |
| `dialogueReference` | string | Reference to Dialogue document ID | Yes |

**Example Document**:
```json
{
  "id": "NpZx3AJn94NZKMkJByNc",
  "Name": "John Neumont",
  "Sprite": {
    "shoes": "id here",
    "hat": "id here",
    "skinColor": "id here",
    "shirt": "id here",
    "accessories": "id here",
    "pants": "id here"
  },
  "Placement": [3, 3],
  "Behavior": "wander",
  "dialogueReference": "aqGlcljTTIqth1P6DsTU"
}
```

**Behavior Types**:
- `"wander"` - NPC moves randomly
- `"stationary"` - NPC stays in place
- `"patrol"` - NPC follows a path (implementation TBD)

---

### 4. Player Collection

**Collection Name**: `Player`

**Purpose**: Stores user profiles, game progress, inventory, and achievements.

**Document Structure**:

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| `Username` | string | Player's username | Yes |
| `RealName` | string | Player's real name | Yes |
| `Email` | string | Player's email address | Yes |
| `Wallet` | string | In-game currency/points (stored as string) | Yes |
| `SkillTree` | string[] | Array of SkillTreeItem document IDs | Yes |
| `OwnedCosmetics` | object | Cosmetics organized by type | Yes |
| `OwnedCosmetics.Hat` | string[] | Array of hat cosmetic IDs | Yes |
| `OwnedCosmetics.Shirt` | string[] | Array of shirt cosmetic IDs | Yes |
| `OwnedCosmetics.Shoes` | string[] | Array of shoe cosmetic IDs | Yes |
| `OwnedCosmetics.Accessories` | string[] | Array of accessory cosmetic IDs | Yes |
| `OwnedCosmetics.Pants` | string[] | Array of pant cosmetic IDs | Yes |
| `PuzzleRecord` | string[] | Completed Puzzle document IDs | Yes |
| `CompletedQuests` | string[] | Completed Quest document IDs | Yes |
| `ActiveQuests` | string[] | In-progress Quest document IDs | Yes |

**Example Document**:
```json
{
  "id": "gPQ3bWdY6uhmtjZE1dnx",
  "Username": "johnwebofficial",
  "RealName": "John Web",
  "Email": "jweb@student.neumont.edu",
  "Wallet": "1000000",
  "SkillTree": [
    "EYOmSoUbz6ThQTrqwDUP",
    "civFySCS0tmJqf3Jhvm2"
  ],
  "OwnedCosmetics": {
    "Hat": ["CID", "CID"],
    "Shirt": ["CID", "CID"],
    "Shoes": ["CID", "CID"],
    "Accessories": ["CID"],
    "Pants": ["CID", "CID"]
  },
  "PuzzleRecord": [
    "398ma1F8iVvElP4Ny851",
    "WLHXwV5sc3dsFGMbaBYC"
  ],
  "CompletedQuests": ["DsgnvkWI6qSLN62kJkSS"],
  "ActiveQuests": ["ikw1TIH5BrD9SJtq8bTB"]
}
```

**Notes**:
- Cosmetic IDs reference documents in the `Cosmetic` collection
- Quest and Puzzle IDs are references to their respective collections

---

### 5. Cosmetic Collection

**Collection Name**: `Cosmetic`

**Purpose**: Defines avatar customization items (clothing, accessories, etc.) that players can unlock and equip.

**Document Structure**:

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| `Name` | string | Display name of the cosmetic | Yes |
| `Type` | string | Category (shirt, hat, shoes, pants, accessories) | Yes |
| `shortdesc` | string | Short description | Yes |
| `SpritePath` | string | File path to sprite/image asset | Yes |
| `ObjectCost` | number | Cost in points (0 = free/default) | Yes |

**Example Document**:
```json
{
  "id": "IgviJN8pypMjlYEqhSP7",
  "Name": "funny shirt",
  "Type": "shirt",
  "shortdesc": "what is up",
  "SpritePath": "file/path/here",
  "ObjectCost": 0
}
```

**Cosmetic Types**:
- `"shirt"` - Upper body clothing
- `"hat"` - Headwear
- `"shoes"` - Footwear
- `"pants"` - Lower body clothing
- `"accessories"` - Additional items (glasses, jewelry, etc.)

---

### 6. Dialogue Collection

**Collection Name**: `Dialogue`

**Purpose**: Stores branching dialogue trees for NPC conversations.

**Document Structure**:

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| `content` | string | Dialogue text displayed to player | Yes |
| `Paths` | object | Player response options | Yes |
| `Paths.{responseText}` | string | Maps response text to next Dialogue ID | Conditional |
| `TriggeredQuest` | string | Quest ID to trigger (empty if none) | Yes |

**Example Document**:
```json
{
  "id": "HsrdBBzVB4rRNFp6MHgi",
  "content": "ok i guess...",
  "Paths": {
    "yup thats it.": "NvHwT9pIkJZ16aAw35C1"
  },
  "TriggeredQuest": ""
}
```

**Dialogue Flow**:
1. NPC displays `content` text
2. Player selects from available `Paths` (response options)
3. System navigates to the Dialogue document ID specified by the selected path
4. If `TriggeredQuest` is not empty, the quest is added to player's `ActiveQuests`

**Notes**:
- Empty `Paths` object indicates end of conversation
- `TriggeredQuest` empty string means no quest is triggered

---

### 7. Quest Collection

**Collection Name**: `Quest`

**Purpose**: Defines missions and objectives for players to complete.

**Document Structure**:

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| `Title` | string | Quest name/title | Yes |
| `smalldesc` | string | Short description | Yes |
| `Reward` | object | Rewards for completion | Yes |
| `Reward.Points` | number | Points/currency awarded | Yes |
| `Reward.Cosmetic` | string | Cosmetic ID awarded (empty if none) | Yes |
| `Next` | string | Next quest in chain (empty if final) | Yes |

**Example Document**:
```json
{
  "id": "DsgnvkWI6qSLN62kJkSS",
  "Title": "My Quest part 1",
  "smalldesc": "first part!",
  "Reward": {
    "Points": 500,
    "Cosmetic": ""
  },
  "Next": "ikw1TIH5BrD9SJtq8bTB"
}
```

**Quest Chains**:
- Quests can be linked together using the `Next` field
- Empty `Next` string indicates the final quest in a chain
- When a quest is completed, if `Next` is not empty, that quest is automatically added to `ActiveQuests`

---

### 8. SkillTreeItems Collection

**Collection Name**: `SkillTreeItems`

**Purpose**: Individual skills that players can add to their profile/skill tree.

**Document Structure**:

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| `Name` | string | Skill name | Yes |
| `Description` | string | Detailed description and experience | Yes |
| `Proficiency` | string | Skill level | Yes |
| `Source` | string | How the skill was acquired | Yes |

**Example Document**:
```json
{
  "id": "EYOmSoUbz6ThQTrqwDUP",
  "Name": "Database Management",
  "Description": "worked with IBM for 3 years",
  "Proficiency": "Advanced",
  "Source": "Previous Work"
}
```

**Proficiency Levels**:
- `"Beginner"` - Basic understanding
- `"Intermediate"` - Practical experience
- `"Advanced"` - Deep expertise
- `"Expert"` - Mastery level

**Source Types**:
- `"Previous Work"` - Professional experience
- `"Neumont Course"` - Learned in coursework
- `"Self-Taught"` - Independent learning
- `"Other"` - Gained through other source

---

## Naming Conventions

### Collection Names
- **Format**: PascalCase (e.g., `Puzzle`, `PuzzleWeek`, `SkillTreeItems`)
- **Pattern**: Descriptive nouns, singular or plural based on context
- **Subcollections**: Follow same PascalCase pattern

### Field Names
- **Format**: PascalCase for most fields (e.g., `Name`, `Type`, `Reward`)
- **Exceptions**: Some fields use camelCase (e.g., `shortdesc`, `dialogueReference`)
- **Pattern**: Descriptive and concise

### Document IDs
- **Auto-generated**: Most documents use Firestore auto-generated IDs (random alphanumeric)
- **Custom IDs**: `PuzzleWeek` uses semantic IDs (e.g., "Jan20261" = January 2026, Week 1)
- **Format**: Alphanumeric strings, no special characters

### Reference Fields
- **Pattern**: Field names ending in "Reference" or containing "Id"
- **Examples**: `dialogueReference`, `puzzleId`
- **Type**: String containing document ID from referenced collection

---

## Data Type Standards

### Common Field Types

| Data Type | Firestore Type | TypeScript Type | Usage |
|-----------|----------------|-----------------|-------|
| Text | string | string | Names, descriptions, IDs |
| Numbers | number | number | Counts, costs, rewards |
| Currency | string | string | Large numbers (Wallet) |
| Lists | array | T[] | Collections of IDs or items |
| Objects | map | object | Nested structures (Sprite, Reward) |
| References | string | string | Document IDs |
| Timestamps | timestamp | Timestamp | Dates (not yet observed in data) |

### Array Fields
- **Usage**: Store lists of IDs, conditions, or simple values
- **Examples**: `conditions`, `SkillTree`, `PuzzleRecord`, `ActiveQuests`
- **Type**: Arrays of strings or numbers

### Object/Map Fields
- **Usage**: Nested structured data
- **Examples**: `Sprite`, `OwnedCosmetics`, `Reward`, `Paths`
- **Pattern**: Key-value pairs with consistent structure

### String vs Number for IDs
- **Document IDs**: Always strings (Firestore requirement)
- **Numeric Values**: Use number type (Attempts, Reward, ObjectCost)
- **Large Numbers**: Use string to avoid precision issues (Wallet)

---

## Relationships Between Collections

### Reference Patterns

```
Player
├── SkillTree[] ──────────────> SkillTreeItems (many-to-many)
├── OwnedCosmetics.{Type}[] ──> Cosmetic (many-to-many)
├── PuzzleRecord[] ───────────> Puzzle (many-to-many)
├── CompletedQuests[] ────────> Quest (many-to-many)
└── ActiveQuests[] ───────────> Quest (many-to-many)

NPC
├── Sprite.{part} ────────────> Cosmetic (many-to-one per part)
└── dialogueReference ────────> Dialogue (one-to-one)

Dialogue
├── Paths.{response} ─────────> Dialogue (one-to-many, self-reference)
└── TriggeredQuest ───────────> Quest (one-to-one, optional)

Quest
├── Reward.Cosmetic ──────────> Cosmetic (one-to-one, optional)
└── Next ─────────────────────> Quest (one-to-one, self-reference)

PuzzleWeek
└── [subcollection] PuzzleDay ─> Puzzle (one-to-many)
```

### Collection Relationships

1. **Player ↔ SkillTreeItems**: Many-to-many via array of IDs
2. **Player ↔ Cosmetic**: Many-to-many via nested object arrays
3. **Player ↔ Puzzle**: Many-to-many via PuzzleRecord array
4. **Player ↔ Quest**: Many-to-many via CompletedQuests and ActiveQuests
5. **NPC → Dialogue**: One-to-one via dialogueReference
6. **NPC → Cosmetic**: Many-to-one for each sprite part
7. **Dialogue → Dialogue**: One-to-many via Paths (branching)
8. **Dialogue → Quest**: One-to-one optional via TriggeredQuest
9. **Quest → Quest**: One-to-one via Next (quest chains)
10. **PuzzleWeek → PuzzleDay**: One-to-many via subcollection

---

## Best Practices

### Creating New Documents

1. **Use TypeScript types** from `src/types/firestore.types.ts`
2. **Follow naming conventions** (PascalCase for fields)
3. **Validate data** before writing to Firestore
4. **Use references** (IDs) instead of embedding large objects
5. **Keep arrays manageable** - consider subcollections for large lists

### Querying Data

```typescript
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db, COLLECTIONS } from '@/lib/firebase';
import type { Puzzle } from '@/types/firestore.types';

// Get all puzzles
const puzzlesRef = collection(db, COLLECTIONS.PUZZLE);
const snapshot = await getDocs(puzzlesRef);
const puzzles: Puzzle[] = snapshot.docs.map(doc => ({
  id: doc.id,
  ...doc.data()
} as Puzzle));

// Query puzzles by topic
const csQuery = query(
  collection(db, COLLECTIONS.PUZZLE),
  where('Topic', '==', 'CS')
);
const csSnapshot = await getDocs(csQuery);
```

### Updating Documents

```typescript
import { doc, updateDoc } from 'firebase/firestore';
import { db, COLLECTIONS } from '@/lib/firebase';

// Update player's wallet
const playerRef = doc(db, COLLECTIONS.PLAYER, playerId);
await updateDoc(playerRef, {
  Wallet: newBalance.toString()
});

// Add quest to active quests
await updateDoc(playerRef, {
  ActiveQuests: arrayUnion(questId)
});
```

### Working with Subcollections

```typescript
import { collection, doc, getDocs } from 'firebase/firestore';
import { db, COLLECTIONS } from '@/lib/firebase';

// Access PuzzleDay subcollection
const weekId = 'Jan20261';
const puzzleDayRef = collection(
  db,
  COLLECTIONS.PUZZLE_WEEK,
  weekId,
  COLLECTIONS.PUZZLE_DAY
);
const daysSnapshot = await getDocs(puzzleDayRef);
```

### Data Validation

```typescript
import { z } from 'zod';

// Example Zod schema for Puzzle
const PuzzleSchema = z.object({
  Name: z.string().min(1),
  Topic: z.string(),
  Type: z.enum(['code', 'multiple_choice', 'true_false']),
  solution: z.string(),
  Attempts: z.number().int().positive(),
  Reward: z.number().int().nonnegative(),
  conditions: z.array(z.string())
});

// Validate before writing
const puzzleData = PuzzleSchema.parse(rawData);
```

---

## Security Considerations

### Current Rules (Development)
- **Read**: Allowed for all documents
- **Write**: Disabled

### Production Recommendations

1. **Require authentication** for all operations
2. **Validate data** on write using Firestore Rules
3. **Restrict sensitive fields** (Email, RealName)
4. **Implement rate limiting** for puzzle attempts
5. **Audit logging** for admin operations

### Example Production Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Players can only read/write their own data
    match /Player/{playerId} {
      allow read: if request.auth != null && request.auth.uid == playerId;
      allow write: if request.auth != null && request.auth.uid == playerId;
    }

    // Everyone can read puzzles, cosmetics, NPCs
    match /Puzzle/{puzzleId} {
      allow read: if request.auth != null;
      allow write: if false; // Admin only via backend
    }

    // Skill tree items belong to players
    match /SkillTreeItems/{itemId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null &&
        resource.data.playerId == request.auth.uid;
    }
  }
}
```

---

## Migration and Versioning

### Schema Evolution

When adding new fields:
1. **Make fields optional** initially
2. **Provide default values** in code
3. **Backfill existing documents** if needed
4. **Update TypeScript types** to reflect changes

### Backward Compatibility

- **Don't remove fields** without migration plan
- **Add new fields** as optional
- **Use field versioning** for breaking changes
- **Document changes** in this file

---

## Summary

### Key Takeaways

1. ✅ **8 Main Collections**: Puzzle, PuzzleWeek, NPC, Player, Cosmetic, Dialogue, Quest, SkillTreeItems
2. ✅ **1 Subcollection**: PuzzleDay under PuzzleWeek
3. ✅ **PascalCase Naming**: Collections and most fields use PascalCase
4. ✅ **Reference Pattern**: Use document IDs (strings) for relationships
5. ✅ **Type Safety**: All types defined in `src/types/firestore.types.ts`
6. ✅ **Validation**: Use Zod or similar for runtime validation

### Quick Reference

| Collection | Primary Use | Key Fields |
|------------|-------------|------------|
| Puzzle | Daily challenges | Name, Type, solution, Reward |
| PuzzleWeek | Weekly organization | (container for PuzzleDay) |
| NPC | Virtual characters | Name, Sprite, dialogueReference |
| Player | User profiles | Username, Email, Wallet, SkillTree |
| Cosmetic | Avatar items | Name, Type, SpritePath, ObjectCost |
| Dialogue | Conversations | content, Paths, TriggeredQuest |
| Quest | Missions | Title, Reward, Next |
| SkillTreeItems | User skills | Name, Proficiency, Source |

---

**Last Updated**: 2026-02-07
**Data Source**: Firebase project `test-neumont`
**Analyzer**: `src/lib/firestore-analyzer.ts`

