# Database Management Scripts

This directory contains scripts for managing Firestore database data.

## 📦 Seeding Script

**File**: `firestore-seed.ts`

Seeds the Firestore database with realistic test data for development and testing.

### Usage

```bash
# Dry run (preview what would be created)
bun run src/lib/firestore-seed.ts --dry-run

# Seed the database (with confirmation prompt)
bun run src/lib/firestore-seed.ts

# Clear existing data before seeding
bun run src/lib/firestore-seed.ts --clear
```

### What Gets Seeded

| Collection | Count | Description |
|------------|-------|-------------|
| Cosmetic | 50 | Hats, shirts, pants, shoes, accessories |
| SkillTreeItems | 20 | Technical and soft skills |
| Puzzle | 5 | 2 Code puzzles, 3 Quiz puzzles |
| Quest | 15 | Quest chains with college themes |
| Dialogue | 30 | 3 complete dialogue trees |
| NPC | 3 | NPCs with sprites and dialogues |
| Player | 3 | Player profiles with progress |
| PuzzleWeek | 1 | Container for daily puzzles |
| PuzzleDay | 5 | Daily puzzle assignments |

**Total**: 127 documents

### Data Integrity

- All references are valid (NPCs → Dialogues, Players → Skills/Cosmetics/Quests)
- Quest chains properly linked with `Next` field
- Dialogue trees fully connected with `Paths`
- No circular references

---

## 🧹 Cleanup Script

**File**: `firestore-cleanup.ts`

Deletes test/seed data from Firestore database.

### Usage

```bash
# Preview what would be deleted (recommended first step)
bun run src/lib/firestore-cleanup.ts --dry-run

# Delete all seeded test data
bun run src/lib/firestore-cleanup.ts

# Delete specific collection only
bun run src/lib/firestore-cleanup.ts --collection=NPC

# Delete ALL data (use with extreme caution!)
bun run src/lib/firestore-cleanup.ts --all

# Show help
bun run src/lib/firestore-cleanup.ts --help
```

### Safety Features

- ✅ Confirmation prompt before deletion (except dry-run)
- ✅ Dry-run mode to preview changes
- ✅ Batched writes for performance
- ✅ Handles subcollections (PuzzleDay)
- ✅ Detailed statistics and logging

### Collections Cleaned

**Seeded Collections** (default):
- Cosmetic
- SkillTreeItems
- Puzzle
- Quest
- Dialogue
- NPC
- Player
- PuzzleWeek (including PuzzleDay subcollections)

---

## 🔄 Typical Workflow

### Initial Setup
```bash
# 1. Preview what will be seeded
bun run src/lib/firestore-seed.ts --dry-run

# 2. Seed the database
bun run src/lib/firestore-seed.ts
```

### Reset Database
```bash
# 1. Preview what will be deleted
bun run src/lib/firestore-cleanup.ts --dry-run

# 2. Delete old data
bun run src/lib/firestore-cleanup.ts

# 3. Seed fresh data
bun run src/lib/firestore-seed.ts
```

### Update Specific Collection
```bash
# 1. Delete specific collection
bun run src/lib/firestore-cleanup.ts --collection=NPC

# 2. Re-run seeding (it will recreate NPCs)
bun run src/lib/firestore-seed.ts
```

---

## 🔐 Security Notes

- Both scripts require **write permissions** in Firestore
- Update security rules to allow writes during development
- **Never run cleanup scripts in production** without backups
- Use `--dry-run` first to verify what will be changed

### Development Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;  // Development only!
    }
  }
}
```

---

## 📊 Monitoring

Both scripts provide detailed output:

- ✅ Success indicators
- ❌ Error messages
- 📊 Statistics and counts
- 🔍 Document IDs (in dry-run mode)
- ⏱️ Progress updates

---

## 🐛 Troubleshooting

### Permission Denied Errors

**Problem**: `Missing or insufficient permissions`

**Solution**: Update Firestore security rules to allow writes

### Script Hangs

**Problem**: Script doesn't complete

**Solution**: Check Firebase connection, verify credentials in `src/lib/firebase.ts`

### Partial Deletion

**Problem**: Some documents not deleted

**Solution**: Check for subcollections, run cleanup script again

---

## 📝 Related Files

- `src/lib/firebase.ts` - Firebase configuration
- `src/types/firestore.types.ts` - TypeScript type definitions
- `ai/documentation/firebase-data-structures.md` - Data structure documentation

