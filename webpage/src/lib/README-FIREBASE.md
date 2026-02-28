# Firebase Integration Guide

## Overview

This directory contains Firebase/Firestore integration files for the Neumont Virtual Campus Web App. The Firebase setup provides database access, analytics, and future authentication capabilities.

## Files

### `firebase.ts`
Main Firebase configuration and initialization file.

**Exports:**
- `app` - Firebase app instance
- `analytics` - Firebase Analytics instance (browser only)
- `db` - Firestore database instance
- `COLLECTIONS` - Collection name constants
- `isFirestoreReady()` - Helper to check if Firestore is initialized

**Usage:**
```typescript
import { db, COLLECTIONS } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

const puzzlesRef = collection(db, COLLECTIONS.PUZZLE);
const snapshot = await getDocs(puzzlesRef);
```

### `firestore-analyzer.ts`
Development tool to analyze Firestore collection structures.

**Purpose:**
- Query all collections and examine document structures
- Identify field types and naming patterns
- Generate sample data for documentation

**Usage:**
```bash
bun run src/lib/firestore-analyzer.ts
```

### `firestore-test.ts`
Verification test suite for Firestore connection and queries.

**Tests:**
1. Connection verification
2. Puzzle collection query
3. NPC collection query
4. Player collection query
5. Cosmetic collection query
6. Quest collection query

**Usage:**
```bash
bun run src/lib/firestore-test.ts
```

**Expected Output:**
```
🎉 All tests passed! Firestore is working correctly.
6/6 tests passed
```

## Firebase Configuration

**Project Details:**
- Project ID: `test-neumont`
- Auth Domain: `test-neumont.firebaseapp.com`
- Storage Bucket: `test-neumont.firebasestorage.app`

**Security Rules:**
Currently set to allow read access for development. See `ai/documentation/firebase-data-structures.md` for production security recommendations.

## Collections

The database contains 8 main collections:

1. **Puzzle** - Daily CS puzzles and challenges
2. **PuzzleWeek** - Weekly puzzle organization (contains PuzzleDay subcollection)
3. **NPC** - Non-player characters in the virtual campus
4. **Player** - User profiles and game progress
5. **Cosmetic** - Avatar customization items
6. **Dialogue** - Branching dialogue trees for NPCs
7. **Quest** - Missions and objectives
8. **SkillTreeItems** - Individual skills for player profiles

## TypeScript Types

All Firestore document types are defined in `src/types/firestore.types.ts`.

**Import types:**
```typescript
import type { 
  Puzzle, 
  NPC, 
  Player, 
  Cosmetic, 
  Quest, 
  SkillTreeItem 
} from '@/types/firestore.types';
```

## Common Operations

### Reading Data

```typescript
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db, COLLECTIONS } from '@/lib/firebase';
import type { Puzzle } from '@/types/firestore.types';

// Get all documents
const puzzlesRef = collection(db, COLLECTIONS.PUZZLE);
const snapshot = await getDocs(puzzlesRef);
const puzzles: Puzzle[] = snapshot.docs.map(doc => ({
  id: doc.id,
  ...doc.data()
} as Puzzle));

// Get single document
const puzzleRef = doc(db, COLLECTIONS.PUZZLE, puzzleId);
const puzzleDoc = await getDoc(puzzleRef);
if (puzzleDoc.exists()) {
  const puzzle = { id: puzzleDoc.id, ...puzzleDoc.data() } as Puzzle;
}
```

### Querying with Filters

```typescript
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, COLLECTIONS } from '@/lib/firebase';

// Query puzzles by topic
const q = query(
  collection(db, COLLECTIONS.PUZZLE),
  where('Topic', '==', 'CS')
);
const snapshot = await getDocs(q);
```

### Working with Subcollections

```typescript
import { collection, getDocs } from 'firebase/firestore';
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

### Real-time Listeners

```typescript
import { collection, onSnapshot } from 'firebase/firestore';
import { db, COLLECTIONS } from '@/lib/firebase';

// Listen for changes
const unsubscribe = onSnapshot(
  collection(db, COLLECTIONS.PUZZLE),
  (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        console.log('New puzzle:', change.doc.data());
      }
    });
  }
);

// Cleanup
unsubscribe();
```

## Documentation

For comprehensive documentation on data structures, naming conventions, and best practices, see:

📖 **[Firebase Data Structures Documentation](../../ai/documentation/firebase-data-structures.md)**

This includes:
- Detailed schema for all 8 collections
- Field types and descriptions
- Example documents
- Naming conventions
- Relationship diagrams
- Best practices
- Security recommendations

## Development Workflow

1. **Make changes** to Firestore data via Firebase Console
2. **Run analyzer** to verify structure: `bun run src/lib/firestore-analyzer.ts`
3. **Update types** in `src/types/firestore.types.ts` if needed
4. **Update documentation** in `ai/documentation/firebase-data-structures.md`
5. **Run tests** to verify: `bun run src/lib/firestore-test.ts`

## Troubleshooting

### Permission Denied Errors

If you get "Missing or insufficient permissions" errors:

1. Check Firebase Console → Firestore Database → Rules
2. Ensure read access is enabled for development
3. For production, implement proper authentication and rules

### Connection Issues

If Firestore won't connect:

1. Verify Firebase config in `firebase.ts` is correct
2. Check internet connection
3. Verify Firebase project is active in console
4. Check browser console for detailed errors

### Type Errors

If TypeScript types don't match data:

1. Run the analyzer to see actual data structure
2. Update types in `src/types/firestore.types.ts`
3. Ensure all fields are properly typed

## Next Steps

- [ ] Implement Firebase Authentication
- [ ] Add write operations with validation
- [ ] Set up production security rules
- [ ] Add error handling and retry logic
- [ ] Implement caching strategy
- [ ] Add offline support with Firestore persistence

