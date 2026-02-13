# Firebase Firestore Database Seeding Guide

## Overview

The `firestore-seed.ts` script populates your Firestore database with realistic test data for the Neumont Virtual Campus Web App. This includes players, NPCs, quests, dialogues, puzzles, cosmetics, and skill tree items.

## Quick Start

### Run Normal Seeding
```bash
bun run src/lib/firestore-seed.ts
```

### Preview Changes (Dry Run)
```bash
bun run src/lib/firestore-seed.ts --dry-run
```

### Clear Existing Data First
```bash
bun run src/lib/firestore-seed.ts --clear
```

## What Gets Seeded

The script creates the following test data:

| Collection | Count | Description |
|------------|-------|-------------|
| **Cosmetics** | 50 | Avatar customization items (hats, shirts, pants, shoes, accessories) |
| **SkillTreeItems** | 20 | Technical and soft skills for player profiles |
| **Puzzles** | 5 | Daily coding challenges (2 code, 3 quiz) |
| **Quests** | 15 | Mission chains and standalone quests |
| **Dialogues** | 30 | Branching conversation trees (3 trees, ~10 nodes each) |
| **NPCs** | 3 | Faculty and staff characters |
| **Players** | 3 | Student profiles with varying progress |
| **PuzzleWeek** | 1 | Weekly puzzle container |
| **PuzzleDays** | 5 | Daily puzzle assignments (Monday-Friday) |

**Total**: 127 documents created

## Data Details

### Cosmetics (50 items)
- **Hats** (10): Baseball caps, beanies, wizard hats, graduation caps, etc.
- **Shirts** (10): Hoodies, t-shirts, formal wear, themed items
- **Pants** (10): Jeans, slacks, sweatpants, formal pants
- **Shoes** (10): Sneakers, boots, dress shoes, LED sneakers
- **Accessories** (10): Glasses, backpacks, smartwatches, VR headsets

Cost range: 0-5000 points (mix of free and paid items)

### Skill Tree Items (20 skills)
**Technical Skills** (15):
- JavaScript, Python, Database Design, React, Git
- Algorithms & Data Structures, Cloud Computing, Cybersecurity
- Machine Learning, Mobile Development, API Development
- TypeScript, DevOps, UI/UX Design, Agile Methodologies

**Soft Skills** (5):
- Team Collaboration, Public Speaking, Project Management
- Technical Writing, Problem Solving

Proficiency levels: Beginner, Intermediate, Advanced, Expert  
Sources: Neumont Course, Previous Work, Self-Taught, Other

### Puzzles (5 challenges)
**Code Puzzles** (2):
- "Fix the Memory Leak" (JavaScript, 750 points)
- "Implement Binary Search" (Algorithms, 800 points)

**Quiz Puzzles** (3):
- "CS Fundamentals Quiz" (400 points)
- "Database Design Quiz" (500 points)
- "Web Security Challenge" (450 points)

### Quests (15 missions)
**Quest Chains**:
1. **Campus Orientation** (5-quest chain): 150 → 300 → 500 → 600 → 1500 points
2. **Meet the Faculty** (4-quest chain): 200 → 400 → 700 → 1200 points
3. **Join a Club** (3-quest chain): 250 → 500 → 1000 points

**Standalone Quests** (3):
- Complete Your Profile (300 points)
- First Puzzle Solved (500 points)
- Customize Your Avatar (200 points)

Some quests reward cosmetic items in addition to points.

### Dialogues (30 nodes, 3 trees)
**Tree 1: Dr. Sarah Chen** (Academic Advisor)
- Topics: Course selection, career advice, registration help
- Triggers: Orientation quests

**Tree 2: Professor Mike Rodriguez** (CS Professor)
- Topics: Algorithms, data structures, research opportunities
- Triggers: Academic quests

**Tree 3: Dean Jennifer Walsh** (Dean of Students)
- Topics: Student organizations, clubs, student concerns
- Triggers: Community engagement quests

Each tree has ~10 nodes with branching paths and multiple endings.

### NPCs (3 characters)
1. **Dr. Sarah Chen** - Academic Advisor (stationary at [5, 10])
2. **Professor Mike Rodriguez** - CS Professor (wanders at [15, 20])
3. **Dean Jennifer Walsh** - Dean of Students (wanders at [25, 8])

Each NPC has a complete sprite configuration and references their dialogue tree.

### Players (3 profiles)
1. **alex_codes** - Beginner student (500 points, 3 skills, 2 puzzles completed)
2. **sarah_dev** - Intermediate student (2500 points, 5 skills, 4 puzzles completed)
3. **mike_master** - Advanced student (10000 points, 5 skills, all puzzles completed)

Each player has owned cosmetics, active quests, and completed quests.

### Puzzle Week & Days
- **Week**: Feb20261 (February 2026, Week 1)
- **Days**: Monday-Friday (Feb 2-6, 2026)
- Each day references one of the 5 puzzles

## CLI Flags

### `--dry-run`
Preview what would be created without writing to the database.

**Example**:
```bash
bun run src/lib/firestore-seed.ts --dry-run
```

**Output**: Shows all documents that would be created with fake IDs.

### `--clear`
Delete all existing data before seeding.

**Example**:
```bash
bun run src/lib/firestore-seed.ts --clear
```

**Warning**: This permanently deletes data from these collections:
- Player, NPC, Dialogue, Quest, Puzzle, SkillTreeItems, Cosmetic, PuzzleWeek

## Safety Features

### Confirmation Prompt
The script requires you to press Enter before proceeding (unless using `--dry-run`).

### Referential Integrity
All document references are validated:
- NPC sprites reference actual cosmetic IDs
- Dialogue paths reference actual dialogue IDs
- Quest chains reference actual quest IDs
- Player data references actual skill/cosmetic/quest IDs

### Error Handling
- Comprehensive try-catch blocks
- Detailed error messages
- Progress logging for each step
- Summary statistics on completion

## Output Example

```
🌱 Neumont Virtual Campus - Database Seeding System
============================================================

📦 Step 1: Seeding Cosmetics...
   ✅ Created 50 cosmetics

📚 Step 2: Seeding Skill Tree Items...
   ✅ Created 20 skill tree items

🧩 Step 3: Seeding Puzzles...
   ✅ Created 5 puzzles

🎯 Step 4: Seeding Quests...
   ✅ Created 15 quests (3 chains + 3 standalone)

💬 Step 5: Seeding Dialogues...
   ✅ Created 30 dialogue nodes (3 trees)

👤 Step 6: Seeding NPCs...
   ✅ Created 3 NPCs

🎮 Step 7: Seeding Players...
   ✅ Created 3 players

📅 Step 8: Seeding Puzzle Week & Days...
   ✅ Created 1 puzzle week with 5 puzzle days

============================================================
✅ Database seeding completed successfully!
============================================================

📊 Summary Statistics:
   • Cosmetics: 50
   • Skill Tree Items: 20
   • Puzzles: 5
   • Quests: 15
   • Dialogues: 30
   • NPCs: 3
   • Players: 3
   • Puzzle Weeks: 1
   • Puzzle Days: 5

⏱️  Time elapsed: 2.34s
```

## Troubleshooting

### Permission Denied Errors
Ensure Firestore security rules allow write access. For development:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true; // Development only!
    }
  }
}
```

### Import Errors
Make sure all dependencies are installed:
```bash
bun install
```

### Connection Issues
Verify Firebase configuration in `src/lib/firebase.ts` is correct.

## Next Steps

After seeding:
1. Verify data in Firebase Console
2. Run tests: `bun run src/lib/firestore-test.ts`
3. Update security rules for production
4. Integrate seeded data into your Phaser game

## Related Files

- **Seeding Script**: `src/lib/firestore-seed.ts`
- **Firebase Config**: `src/lib/firebase.ts`
- **Type Definitions**: `src/types/firestore.types.ts`
- **Documentation**: `ai/documentation/firebase-data-structures.md`
- **Test Suite**: `src/lib/firestore-test.ts`

