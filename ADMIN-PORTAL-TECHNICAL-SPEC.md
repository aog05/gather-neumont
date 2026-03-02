# Admin Portal - Technical Specification

## 🏗️ Detailed Architecture

### Technology Stack

#### Frontend
- **Framework**: React 18+ with TypeScript
- **Build Tool**: Bun (bundler + runtime)
- **Routing**: React Router v6
- **State Management**: React Context API + Custom Hooks
- **Forms**: React Hook Form + Zod validation
- **Data Visualization**: Recharts or Chart.js
- **UI Components**: Custom components (no external UI library)
- **Styling**: CSS Modules + Neumont Brand CSS variables

#### Backend/Services
- **Runtime**: Bun
- **Database**: Firebase Firestore
- **Authentication**: Firebase Authentication
- **File Storage**: Firebase Storage (for cosmetic sprites)
- **API Layer**: Direct Firestore SDK calls (no REST API needed)

#### Development Tools
- **TypeScript**: Strict mode enabled
- **Linting**: ESLint with TypeScript rules
- **Formatting**: Prettier
- **Testing**: Bun test (built-in test runner)
- **Version Control**: Git

---

## 📁 Detailed File Structure

```
gather_portal/
├── public/
│   ├── index.html
│   └── assets/
│       ├── icons/
│       └── images/
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AdminLayout.tsx          # Main layout wrapper
│   │   │   ├── Sidebar.tsx              # Left navigation sidebar
│   │   │   ├── Header.tsx               # Top header with breadcrumbs
│   │   │   └── Footer.tsx               # Footer (optional)
│   │   ├── collections/
│   │   │   ├── player/
│   │   │   │   ├── PlayerList.tsx       # Player list table
│   │   │   │   ├── PlayerDetail.tsx     # Player detail view
│   │   │   │   ├── PlayerForm.tsx       # Edit player form
│   │   │   │   ├── PointsAdjuster.tsx   # Points adjustment modal
│   │   │   │   └── QuestProgress.tsx    # Quest progress viewer
│   │   │   ├── npc/
│   │   │   │   ├── NPCList.tsx          # NPC grid view
│   │   │   │   ├── NPCForm.tsx          # Create/Edit NPC
│   │   │   │   ├── MapPlacement.tsx     # Visual map placement tool
│   │   │   │   ├── SpriteBuilder.tsx    # Sprite configuration
│   │   │   │   └── NPCPreview.tsx       # NPC sprite preview
│   │   │   ├── dialogue/
│   │   │   │   ├── DialogueList.tsx     # Dialogue tree list
│   │   │   │   ├── DialogueEditor.tsx   # Visual node editor
│   │   │   │   ├── DialogueNode.tsx     # Individual node component
│   │   │   │   ├── PathEditor.tsx       # Edit dialogue paths
│   │   │   │   └── DialoguePreview.tsx  # Test dialogue flow
│   │   │   ├── quest/
│   │   │   │   ├── QuestList.tsx        # Quest list table
│   │   │   │   ├── QuestForm.tsx        # Create/Edit quest
│   │   │   │   ├── QuestChain.tsx       # Quest chain visualizer
│   │   │   │   ├── RewardBuilder.tsx    # Configure rewards
│   │   │   │   └── QuestAnalytics.tsx   # Quest statistics
│   │   │   ├── puzzle/
│   │   │   │   ├── PuzzleList.tsx       # Puzzle list table
│   │   │   │   ├── QuizBuilder.tsx      # Quiz puzzle builder
│   │   │   │   ├── CodeEditor.tsx       # Code puzzle editor
│   │   │   │   ├── QuestionEditor.tsx   # Quiz question editor
│   │   │   │   └── PuzzlePreview.tsx    # Test puzzle
│   │   │   ├── puzzleweek/
│   │   │   │   ├── WeekCalendar.tsx     # Calendar view
│   │   │   │   ├── WeekForm.tsx         # Create week
│   │   │   │   ├── DayAssigner.tsx      # Assign puzzles to days
│   │   │   │   └── Leaderboard.tsx      # View leaderboards
│   │   │   ├── cosmetic/
│   │   │   │   ├── CosmeticGrid.tsx     # Cosmetic grid view
│   │   │   │   ├── CosmeticForm.tsx     # Create/Edit cosmetic
│   │   │   │   ├── ImageUpload.tsx      # Upload sprite images
│   │   │   │   └── CosmeticPreview.tsx  # Preview cosmetic
│   │   │   └── skilltree/
│   │   │       ├── SkillList.tsx        # Skill list table
│   │   │       ├── SkillForm.tsx        # Create/Edit skill
│   │   │       └── SkillTemplates.tsx   # Pre-made skill templates
│   │   ├── shared/
│   │   │   ├── DataTable.tsx            # Reusable data table
│   │   │   ├── Modal.tsx                # Modal dialog
│   │   │   ├── ConfirmDialog.tsx        # Confirmation dialog
│   │   │   ├── FormField.tsx            # Form input wrapper
│   │   │   ├── Button.tsx               # Neumont-styled button
│   │   │   ├── Card.tsx                 # Card container
│   │   │   ├── Tabs.tsx                 # Tab navigation
│   │   │   ├── Dropdown.tsx             # Dropdown select
│   │   │   ├── SearchBar.tsx            # Search input
│   │   │   ├── Pagination.tsx           # Table pagination
│   │   │   ├── LoadingSpinner.tsx       # Loading indicator
│   │   │   ├── ErrorBoundary.tsx        # Error boundary
│   │   │   └── Toast.tsx                # Toast notifications
│   │   ├── visualizations/
│   │   │   ├── Dashboard.tsx            # Main dashboard
│   │   │   ├── StatsCard.tsx            # Stat display card
│   │   │   ├── LineChart.tsx            # Line chart wrapper
│   │   │   ├── BarChart.tsx             # Bar chart wrapper
│   │   │   ├── PieChart.tsx             # Pie chart wrapper
│   │   │   └── ActivityFeed.tsx         # Recent activity feed
│   │   └── auth/
│   │       ├── Login.tsx                # Login page
│   │       ├── ProtectedRoute.tsx       # Route guard
│   │       └── UserProfile.tsx          # User profile dropdown
│   ├── hooks/
│   │   ├── useFirestore.ts              # Generic Firestore hook
│   │   ├── useCollection.ts             # Collection CRUD hook
│   │   ├── useDocument.ts               # Document CRUD hook
│   │   ├── useAuth.ts                   # Authentication hook
│   │   ├── usePagination.ts             # Pagination logic
│   │   ├── useSearch.ts                 # Search logic
│   │   ├── useToast.ts                  # Toast notifications
│   │   └── useDebounce.ts               # Debounce utility
│   ├── services/
│   │   ├── firestore.service.ts         # Generic CRUD service
│   │   ├── player.service.ts            # Player-specific operations
│   │   ├── npc.service.ts               # NPC-specific operations
│   │   ├── dialogue.service.ts          # Dialogue-specific operations
│   │   ├── quest.service.ts             # Quest-specific operations
│   │   ├── puzzle.service.ts            # Puzzle-specific operations
│   │   ├── cosmetic.service.ts          # Cosmetic-specific operations
│   │   ├── auth.service.ts              # Authentication service
│   │   └── storage.service.ts           # Firebase Storage service
│   ├── contexts/
│   │   ├── AdminContext.tsx             # Global admin state
│   │   ├── AuthContext.tsx              # Authentication state
│   │   └── ToastContext.tsx             # Toast notification state
│   ├── types/
│   │   ├── admin.types.ts               # Admin-specific types
│   │   ├── form.types.ts                # Form-related types
│   │   └── index.ts                     # Re-export all types
│   ├── utils/
│   │   ├── validation.ts                # Zod schemas
│   │   ├── formatters.ts                # Data formatters
│   │   ├── constants.ts                 # App constants
│   │   └── helpers.ts                   # Utility functions
│   ├── styles/
│   │   ├── variables.css                # CSS variables (Neumont colors)
│   │   ├── global.css                   # Global styles
│   │   ├── layout.css                   # Layout styles
│   │   └── components.css               # Component styles
│   ├── routes/
│   │   └── index.tsx                    # Route configuration
│   ├── App.tsx                          # Root component
│   ├── index.tsx                        # Entry point
│   └── vite-env.d.ts                    # Vite type definitions
├── .env.example                         # Environment variables template
├── .gitignore
├── package.json
├── tsconfig.json
├── bunfig.toml                          # Bun configuration
└── README.md
```

---

## 🔌 Core Services Implementation

### 1. Generic Firestore Service

```typescript
// services/firestore.service.ts
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  QueryConstraint
} from 'firebase/firestore';
import { db } from '../../webpage/src/lib/firebase';

export interface QueryFilter {
  field: string;
  operator: '==' | '!=' | '<' | '<=' | '>' | '>=' | 'in' | 'array-contains';
  value: any;
}

export interface QueryOptions {
  filters?: QueryFilter[];
  orderByField?: string;
  orderDirection?: 'asc' | 'desc';
  limitCount?: number;
}

export class FirestoreService<T extends { id?: string }> {
  constructor(private collectionName: string) {}

  /**
   * Get all documents from collection
   */
  async getAll(options?: QueryOptions): Promise<T[]> {
    try {
      const constraints: QueryConstraint[] = [];

      // Add filters
      if (options?.filters) {
        options.filters.forEach(filter => {
          constraints.push(where(filter.field, filter.operator, filter.value));
        });
      }

      // Add ordering
      if (options?.orderByField) {
        constraints.push(orderBy(options.orderByField, options.orderDirection || 'asc'));
      }

      // Add limit
      if (options?.limitCount) {
        constraints.push(limit(options.limitCount));
      }

      const q = query(collection(db, this.collectionName), ...constraints);
      const snapshot = await getDocs(q);

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as T));
    } catch (error) {
      console.error(`Error getting documents from ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Get single document by ID
   */
  async getById(id: string): Promise<T | null> {
    try {
      const docRef = doc(db, this.collectionName, id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        } as T;
      }

      return null;
    } catch (error) {
      console.error(`Error getting document ${id} from ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Create new document
   */
  async create(data: Omit<T, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, this.collectionName), data);
      console.log(`Created document in ${this.collectionName} with ID: ${docRef.id}`);
      return docRef.id;
    } catch (error) {
      console.error(`Error creating document in ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Update existing document
   */
  async update(id: string, data: Partial<Omit<T, 'id'>>): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, id);
      await updateDoc(docRef, data as any);
      console.log(`Updated document ${id} in ${this.collectionName}`);
    } catch (error) {
      console.error(`Error updating document ${id} in ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Delete document
   */
  async delete(id: string): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, id);
      await deleteDoc(docRef);
      console.log(`Deleted document ${id} from ${this.collectionName}`);
    } catch (error) {
      console.error(`Error deleting document ${id} from ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Batch delete multiple documents
   */
  async batchDelete(ids: string[]): Promise<void> {
    try {
      const deletePromises = ids.map(id => this.delete(id));
      await Promise.all(deletePromises);
      console.log(`Batch deleted ${ids.length} documents from ${this.collectionName}`);
    } catch (error) {
      console.error(`Error batch deleting from ${this.collectionName}:`, error);
      throw error;
    }
  }
}
```

### 2. Collection-Specific Services

```typescript
// services/player.service.ts
import { FirestoreService } from './firestore.service';
import { COLLECTIONS } from '../../webpage/src/lib/firebase';
import type { Player } from '../../webpage/src/types/firestore.types';

export class PlayerService extends FirestoreService<Player> {
  constructor() {
    super(COLLECTIONS.PLAYER);
  }

  /**
   * Adjust player's wallet points
   */
  async adjustPoints(playerId: string, pointsDelta: number): Promise<void> {
    const player = await this.getById(playerId);
    if (!player) throw new Error('Player not found');

    const currentPoints = parseInt(player.Wallet, 10) || 0;
    const newPoints = Math.max(0, currentPoints + pointsDelta);

    await this.update(playerId, {
      Wallet: newPoints.toString()
    });
  }

  /**
   * Get players with active quests
   */
  async getPlayersWithActiveQuests(): Promise<Player[]> {
    const allPlayers = await this.getAll();
    return allPlayers.filter(p => p.ActiveQuests && p.ActiveQuests.length > 0);
  }

  /**
   * Search players by username or email
   */
  async searchPlayers(searchTerm: string): Promise<Player[]> {
    const allPlayers = await this.getAll();
    const lowerSearch = searchTerm.toLowerCase();

    return allPlayers.filter(p =>
      p.Username.toLowerCase().includes(lowerSearch) ||
      p.Email.toLowerCase().includes(lowerSearch) ||
      p.RealName.toLowerCase().includes(lowerSearch)
    );
  }
}

// services/npc.service.ts
import { FirestoreService } from './firestore.service';
import { COLLECTIONS } from '../../webpage/src/lib/firebase';
import type { NPC } from '../../webpage/src/types/firestore.types';

export class NPCService extends FirestoreService<NPC> {
  constructor() {
    super(COLLECTIONS.NPC);
  }

  /**
   * Get NPCs by behavior type
   */
  async getNPCsByBehavior(behavior: string): Promise<NPC[]> {
    return this.getAll({
      filters: [{ field: 'Behavior', operator: '==', value: behavior }]
    });
  }

  /**
   * Get NPCs by dialogue tree ID
   */
  async getNPCsByDialogueTree(treeId: string): Promise<NPC[]> {
    return this.getAll({
      filters: [{ field: 'dialogueTreeId', operator: '==', value: treeId }]
    });
  }
}

// services/quest.service.ts
import { FirestoreService } from './firestore.service';
import { COLLECTIONS } from '../../webpage/src/lib/firebase';
import type { Quest } from '../../webpage/src/types/firestore.types';

export class QuestService extends FirestoreService<Quest> {
  constructor() {
    super(COLLECTIONS.QUEST);
  }

  /**
   * Get quest chain starting from a quest ID
   */
  async getQuestChain(startQuestId: string): Promise<Quest[]> {
    const chain: Quest[] = [];
    let currentId: string | null = startQuestId;

    while (currentId) {
      const quest = await this.getById(currentId);
      if (!quest) break;

      chain.push(quest);
      currentId = quest.Next || null;

      // Prevent infinite loops
      if (chain.length > 100) {
        console.warn('Quest chain exceeds 100 quests, stopping');
        break;
      }
    }

    return chain;
  }

  /**
   * Find quests that lead to a specific quest (reverse lookup)
   */
  async getQuestsLeadingTo(questId: string): Promise<Quest[]> {
    return this.getAll({
      filters: [{ field: 'Next', operator: '==', value: questId }]
    });
  }
}
```

---

## 🎣 Custom React Hooks

### 1. useCollection Hook

```typescript
// hooks/useCollection.ts
import { useState, useEffect, useCallback } from 'react';
import { FirestoreService, QueryOptions } from '../services/firestore.service';

export interface UseCollectionResult<T> {
  data: T[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  create: (item: Omit<T, 'id'>) => Promise<string>;
  update: (id: string, item: Partial<Omit<T, 'id'>>) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export function useCollection<T extends { id?: string }>(
  collectionName: string,
  options?: QueryOptions
): UseCollectionResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const service = new FirestoreService<T>(collectionName);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const items = await service.getAll(options);
      setData(items);
    } catch (err) {
      setError(err as Error);
      console.error(`Error fetching ${collectionName}:`, err);
    } finally {
      setLoading(false);
    }
  }, [collectionName, JSON.stringify(options)]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const create = useCallback(async (item: Omit<T, 'id'>) => {
    const id = await service.create(item);
    await fetchData(); // Refresh data
    return id;
  }, [service, fetchData]);

  const update = useCallback(async (id: string, item: Partial<Omit<T, 'id'>>) => {
    await service.update(id, item);
    await fetchData(); // Refresh data
  }, [service, fetchData]);

  const remove = useCallback(async (id: string) => {
    await service.delete(id);
    await fetchData(); // Refresh data
  }, [service, fetchData]);

  return {
    data,
    loading,
    error,
    refresh: fetchData,
    create,
    update,
    remove,
  };
}
```

### 2. useDocument Hook

```typescript
// hooks/useDocument.ts
import { useState, useEffect, useCallback } from 'react';
import { FirestoreService } from '../services/firestore.service';

export interface UseDocumentResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  update: (data: Partial<Omit<T, 'id'>>) => Promise<void>;
}

export function useDocument<T extends { id?: string }>(
  collectionName: string,
  documentId: string | null
): UseDocumentResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const service = new FirestoreService<T>(collectionName);

  const fetchData = useCallback(async () => {
    if (!documentId) {
      setData(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const doc = await service.getById(documentId);
      setData(doc);
    } catch (err) {
      setError(err as Error);
      console.error(`Error fetching document ${documentId}:`, err);
    } finally {
      setLoading(false);
    }
  }, [collectionName, documentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const update = useCallback(async (updateData: Partial<Omit<T, 'id'>>) => {
    if (!documentId) throw new Error('No document ID provided');
    await service.update(documentId, updateData);
    await fetchData(); // Refresh data
  }, [service, documentId, fetchData]);

  return {
    data,
    loading,
    error,
    refresh: fetchData,
    update,
  };
}
```


