# Neumont Virtual Campus - Admin Portal Roadmap

## 🎯 Executive Summary

This document outlines the complete roadmap for building a comprehensive admin portal for the Neumont Virtual Campus. The portal will provide full CRUD (Create, Read, Update, Delete) capabilities for all Firebase collections, data visualization, and content management tools.

---

## 📊 Project Overview

### Purpose
Create a web-based admin portal that allows administrators to:
- Manage all Firebase database collections
- Visualize and analyze game data
- Create and edit NPCs, quests, dialogue trees, and puzzles
- Monitor player progress and statistics
- Manage cosmetics and skill tree items

### Technology Stack
- **Frontend**: React + TypeScript
- **Backend**: Bun runtime with server-side API
- **Database**: Firebase Firestore
- **Styling**: Neumont Brand Identity (Yellow #FFDD00, Grey #1F1F1F, DIN 2014 font)
- **UI Components**: Custom components following existing design system
- **Data Visualization**: Chart.js or Recharts
- **Forms**: React Hook Form + Zod validation
- **Routing**: React Router

### Target Users
- Game administrators
- Content creators
- Database managers
- QA testers

---

## 🗂️ Firebase Collections to Manage

### 1. **Puzzle Collection** (Daily Challenges)
- **Type**: CodePuzzle | QuizPuzzle
- **Fields**: Name, Topic, Type, solution/Questions, Attempts, Reward, Threshold
- **CRUD Operations**: Full CRUD
- **Special Features**: 
  - Quiz question builder with multiple question types
  - Code puzzle editor with syntax highlighting
  - Preview mode for testing puzzles

### 2. **PuzzleWeek Collection** (Weekly Organization)
- **Type**: PuzzleDay (subcollection structure)
- **Fields**: dow (day of week), puzzle (reference), topScore, topTen
- **CRUD Operations**: Full CRUD
- **Special Features**:
  - Calendar view for weekly puzzle scheduling
  - Drag-and-drop puzzle assignment
  - Leaderboard visualization

### 3. **NPC Collection** (Non-Player Characters)
- **Type**: NPC
- **Fields**: Name, Sprite, Placement, Behavior, dialogueTreeId
- **CRUD Operations**: Full CRUD
- **Special Features**:
  - Visual sprite preview
  - Map placement tool (drag NPC on campus map)
  - Dialogue tree selector
  - Behavior configuration (wander, stationary, patrol)

### 4. **Player Collection** (User Profiles)
- **Type**: Player
- **Fields**: Username, RealName, Email, Wallet, SkillTree, OwnedCosmetics, PuzzleRecord, CompletedQuests, ActiveQuests
- **CRUD Operations**: Read, Update (limited Delete for safety)
- **Special Features**:
  - Player statistics dashboard
  - Points adjustment tool
  - Quest progress viewer
  - Cosmetics inventory manager

### 5. **Cosmetic Collection** (Avatar Items)
- **Type**: Cosmetic
- **Fields**: Name, Type, shortdesc, SpritePath, ObjectCost
- **CRUD Operations**: Full CRUD
- **Special Features**:
  - Image upload for sprites
  - Preview of cosmetic items
  - Bulk import/export

### 6. **Dialogue Collection** (Conversation Trees)
- **Type**: Dialogue
- **Fields**: content, Paths, TriggeredQuest, treeId
- **CRUD Operations**: Full CRUD
- **Special Features**:
  - Visual dialogue tree editor (node-based graph)
  - Branching path visualization
  - Quest trigger integration
  - Dialogue testing/preview mode

### 7. **Quest Collection** (Missions)
- **Type**: Quest
- **Fields**: Title, smalldesc, Reward (Points, Cosmetic), Next
- **CRUD Operations**: Full CRUD
- **Special Features**:
  - Quest chain visualizer
  - Reward calculator
  - Quest dependency graph

### 8. **SkillTreeItems Collection** (Player Skills)
- **Type**: SkillTreeItem
- **Fields**: Name, Description, Proficiency, Source
- **CRUD Operations**: Full CRUD
- **Special Features**:
  - Skill templates
  - Bulk skill creation

---

## 🏗️ Architecture Design

### Directory Structure
```
gather_portal/
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AdminLayout.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Header.tsx
│   │   ├── collections/
│   │   │   ├── PuzzleManager/
│   │   │   ├── NPCManager/
│   │   │   ├── PlayerManager/
│   │   │   ├── CosmeticManager/
│   │   │   ├── DialogueManager/
│   │   │   ├── QuestManager/
│   │   │   └── SkillTreeManager/
│   │   ├── shared/
│   │   │   ├── DataTable.tsx
│   │   │   ├── FormBuilder.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── ConfirmDialog.tsx
│   │   └── visualizations/
│   │       ├── Dashboard.tsx
│   │       ├── PlayerStats.tsx
│   │       └── QuestGraph.tsx
│   ├── hooks/
│   │   ├── useFirestore.ts
│   │   ├── useCollection.ts
│   │   └── useDocument.ts
│   ├── services/
│   │   ├── firebase.service.ts
│   │   ├── puzzle.service.ts
│   │   ├── npc.service.ts
│   │   └── ...
│   ├── types/
│   │   └── admin.types.ts
│   ├── styles/
│   │   └── admin-portal.css
│   ├── App.tsx
│   └── index.tsx
├── package.json
└── tsconfig.json
```

---

## 🎨 UI/UX Design Principles

### Neumont Brand Identity
- **Primary Color**: Neumont Yellow (#FFDD00)
- **Background**: Neumont Grey (#1F1F1F, #2a2a2a, #3a3a3a)
- **Typography**: DIN 2014 font family
- **Design**: Sharp corners, tech corner accents, industrial aesthetic
- **Borders**: 2-3px solid borders, border-left accent bars
- **Shadows**: Black-based shadows for depth

### Layout
- **Sidebar Navigation**: Fixed left sidebar with collection icons
- **Main Content Area**: Dynamic content based on selected collection
- **Header**: Breadcrumbs, search, user profile
- **Responsive**: Desktop-first, tablet-compatible

### Key UI Components
1. **Data Tables**: Sortable, filterable, paginated lists
2. **Forms**: Multi-step forms with validation
3. **Modals**: Create/Edit/Delete confirmations
4. **Visualizations**: Charts, graphs, and diagrams
5. **Search**: Global search across all collections

---

## 📋 Feature Specifications

### Phase 1: Foundation (Weeks 1-2)

#### 1.1 Project Setup
- [ ] Initialize React + TypeScript project in `gather_portal/`
- [ ] Install dependencies (React Router, Firebase, Chart.js, React Hook Form, Zod)
- [ ] Configure Bun build system
- [ ] Set up Firebase connection (reuse existing config)
- [ ] Create base layout components (AdminLayout, Sidebar, Header)
- [ ] Implement Neumont brand styling

#### 1.2 Authentication & Authorization
- [ ] Admin login page
- [ ] Firebase Authentication integration
- [ ] Role-based access control (admin, editor, viewer)
- [ ] Session management
- [ ] Protected routes

#### 1.3 Core Infrastructure
- [ ] Create reusable hooks (useFirestore, useCollection, useDocument)
- [ ] Build generic CRUD service layer
- [ ] Implement error handling and logging
- [ ] Create shared UI components (DataTable, Modal, FormBuilder)
- [ ] Set up routing structure

---

### Phase 2: Collection Managers (Weeks 3-6)

#### 2.1 Player Manager (Week 3)
**Priority**: HIGH (most frequently accessed)

**Features**:
- [ ] Player list view with search and filters
- [ ] Player detail view with all stats
- [ ] Points adjustment tool (add/subtract wallet points)
- [ ] Quest progress viewer (active and completed)
- [ ] Cosmetics inventory viewer
- [ ] Skill tree viewer
- [ ] Puzzle completion history
- [ ] Export player data to CSV/JSON

**UI Components**:
- PlayerListTable
- PlayerDetailPanel
- PointsAdjustmentModal
- QuestProgressViewer
- CosmeticsInventoryGrid

#### 2.2 NPC Manager (Week 3)
**Priority**: HIGH (content creation)

**Features**:
- [ ] NPC list view with sprite previews
- [ ] Create/Edit NPC form
- [ ] Visual map placement tool (drag NPC on campus map image)
- [ ] Sprite configuration (cosmetic selection)
- [ ] Behavior selector (wander, stationary, patrol)
- [ ] Dialogue tree assignment
- [ ] Bulk import NPCs from JSON
- [ ] Delete with confirmation

**UI Components**:
- NPCListGrid
- NPCFormModal
- MapPlacementTool
- SpritePreview
- DialogueTreeSelector

#### 2.3 Dialogue Manager (Week 4)
**Priority**: HIGH (complex content creation)

**Features**:
- [ ] Dialogue tree list view
- [ ] Visual node-based dialogue editor (like Twine or Yarn)
- [ ] Node creation/editing
- [ ] Path/choice management
- [ ] Quest trigger assignment
- [ ] Dialogue preview/testing mode
- [ ] Import/Export dialogue trees (JSON)
- [ ] Duplicate dialogue trees
- [ ] Search dialogue content

**UI Components**:
- DialogueTreeList
- DialogueNodeEditor (canvas-based)
- DialoguePreviewModal
- PathEditor
- QuestTriggerSelector

#### 2.4 Quest Manager (Week 4)
**Priority**: HIGH (game progression)

**Features**:
- [ ] Quest list view with status indicators
- [ ] Create/Edit quest form
- [ ] Quest chain visualizer (graph view)
- [ ] Reward configuration (points + cosmetics)
- [ ] Next quest selector (chain builder)
- [ ] Quest dependency checker
- [ ] Bulk quest creation
- [ ] Quest analytics (completion rates)

**UI Components**:
- QuestListTable
- QuestFormModal
- QuestChainGraph
- RewardBuilder
- QuestAnalyticsDashboard

#### 2.5 Puzzle Manager (Week 5)
**Priority**: MEDIUM (weekly content)

**Features**:
- [ ] Puzzle list view (filter by type: Code/Quiz)
- [ ] Quiz puzzle builder
  - [ ] Add/remove questions
  - [ ] Question type selector (MCQ, Select-All, Written)
  - [ ] Answer configuration
  - [ ] Points assignment
- [ ] Code puzzle editor
  - [ ] Syntax-highlighted code editor
  - [ ] Conditions/requirements editor
  - [ ] Solution editor
- [ ] Puzzle preview/testing mode
- [ ] Duplicate puzzles
- [ ] Import/Export puzzles

**UI Components**:
- PuzzleListTable
- QuizPuzzleBuilder
- CodePuzzleEditor
- QuestionEditor
- PuzzlePreviewModal

#### 2.6 PuzzleWeek Manager (Week 5)
**Priority**: MEDIUM (scheduling)

**Features**:
- [ ] Calendar view of puzzle weeks
- [ ] Week creation (generate week ID: MonthYearWeek)
- [ ] Day assignment (drag-and-drop puzzles to days)
- [ ] Leaderboard viewer (topScore, topTen)
- [ ] Week duplication
- [ ] Bulk week generation

**UI Components**:
- PuzzleWeekCalendar
- WeekFormModal
- DayAssignmentTool
- LeaderboardViewer

#### 2.7 Cosmetic Manager (Week 6)
**Priority**: LOW (less frequent updates)

**Features**:
- [ ] Cosmetic list view (grid with images)
- [ ] Create/Edit cosmetic form
- [ ] Image upload for sprites
- [ ] Type selector (hat, shirt, shoes, pants, accessories)
- [ ] Cost configuration
- [ ] Preview cosmetic on avatar
- [ ] Bulk import cosmetics

**UI Components**:
- CosmeticGrid
- CosmeticFormModal
- ImageUploader
- CosmeticPreview

#### 2.8 SkillTreeItems Manager (Week 6)
**Priority**: LOW (less frequent updates)

**Features**:
- [ ] Skill list view
- [ ] Create/Edit skill form
- [ ] Proficiency level selector
- [ ] Source selector
- [ ] Skill templates (pre-filled common skills)
- [ ] Bulk skill creation

**UI Components**:
- SkillListTable
- SkillFormModal
- SkillTemplateSelector

---

### Phase 3: Data Visualization & Analytics (Week 7)

#### 3.1 Dashboard
- [ ] Overview statistics (total players, NPCs, quests, puzzles)
- [ ] Recent activity feed
- [ ] Quick actions (create NPC, create quest, etc.)
- [ ] System health indicators

#### 3.2 Player Analytics
- [ ] Total players chart (over time)
- [ ] Points distribution histogram
- [ ] Quest completion rates
- [ ] Puzzle completion rates
- [ ] Active vs inactive players

#### 3.3 Content Analytics
- [ ] Most popular NPCs (interaction count)
- [ ] Quest completion funnel
- [ ] Puzzle difficulty analysis (attempt rates)
- [ ] Cosmetic popularity

---

### Phase 4: Advanced Features (Week 8)

#### 4.1 Bulk Operations
- [ ] Bulk delete with confirmation
- [ ] Bulk update (e.g., adjust all puzzle rewards)
- [ ] Bulk import from CSV/JSON
- [ ] Bulk export to CSV/JSON

#### 4.2 Search & Filters
- [ ] Global search across all collections
- [ ] Advanced filters (date range, status, type)
- [ ] Saved filter presets
- [ ] Search history

#### 4.3 Audit Log
- [ ] Track all CRUD operations
- [ ] User action history
- [ ] Rollback capability (restore previous versions)
- [ ] Export audit logs

#### 4.4 Testing Tools
- [ ] Dialogue tree tester (simulate conversations)
- [ ] Quest flow tester (simulate quest progression)
- [ ] Puzzle tester (test quiz questions)
- [ ] NPC interaction simulator

---

## 🔧 Technical Implementation Details

### Firebase Integration

**Shared Firebase Config**:
```typescript
// Reuse existing Firebase config from webpage/src/lib/firebase.ts
import { db, COLLECTIONS } from '../webpage/src/lib/firebase';
```

**CRUD Service Pattern**:
```typescript
// services/firestore.service.ts
export class FirestoreService<T> {
  constructor(private collectionName: string) {}

  async getAll(): Promise<T[]> { /* ... */ }
  async getById(id: string): Promise<T | null> { /* ... */ }
  async create(data: Partial<T>): Promise<string> { /* ... */ }
  async update(id: string, data: Partial<T>): Promise<void> { /* ... */ }
  async delete(id: string): Promise<void> { /* ... */ }
  async query(filters: QueryFilter[]): Promise<T[]> { /* ... */ }
}
```

### Form Validation

**Zod Schemas**:
```typescript
// Example: NPC validation schema
import { z } from 'zod';

export const NPCSchema = z.object({
  Name: z.string().min(1, "Name is required"),
  Sprite: z.object({
    shoes: z.string(),
    hat: z.string(),
    skinColor: z.string(),
    shirt: z.string(),
    accessories: z.string(),
    pants: z.string(),
  }),
  Placement: z.tuple([z.number(), z.number()]),
  Behavior: z.enum(["wander", "stationary", "patrol"]),
  dialogueTreeId: z.string().min(1, "Dialogue tree is required"),
});
```

### State Management

**React Context + Hooks**:
```typescript
// contexts/AdminContext.tsx
export const AdminContext = createContext<AdminContextType | null>(null);

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) throw new Error("useAdmin must be used within AdminProvider");
  return context;
}
```

---

## 📅 Development Timeline

### Week 1-2: Foundation
- Project setup and infrastructure
- Authentication and authorization
- Base layout and navigation
- Shared components

### Week 3: Player & NPC Managers
- Player management (view, edit, points adjustment)
- NPC management (CRUD, map placement)

### Week 4: Dialogue & Quest Managers
- Dialogue tree editor (visual node-based)
- Quest management (CRUD, chain visualizer)

### Week 5: Puzzle Managers
- Puzzle CRUD (Quiz and Code types)
- PuzzleWeek scheduling (calendar view)

### Week 6: Cosmetic & Skill Managers
- Cosmetic management (image upload)
- SkillTreeItems management

### Week 7: Analytics & Visualization
- Dashboard with statistics
- Player analytics
- Content analytics

### Week 8: Advanced Features & Polish
- Bulk operations
- Advanced search and filters
- Audit logging
- Testing tools
- Bug fixes and optimization

---

## 🚀 Deployment Strategy

### Development Environment
- Local development with Bun
- Hot reload for rapid iteration
- Firebase Emulator for testing (optional)

### Production Environment
- Deploy to Vercel or Firebase Hosting
- Environment variables for Firebase config
- HTTPS only
- Admin-only access (IP whitelist or authentication)

---

## 📊 Success Metrics

### Functionality
- [ ] All 8 collections have full CRUD capabilities
- [ ] All forms have validation and error handling
- [ ] Data visualization displays accurate statistics
- [ ] Search and filters work across all collections

### Performance
- [ ] Page load time < 2 seconds
- [ ] CRUD operations complete < 1 second
- [ ] Smooth UI interactions (60 FPS)

### Usability
- [ ] Intuitive navigation
- [ ] Clear error messages
- [ ] Responsive design (desktop + tablet)
- [ ] Consistent Neumont branding

---

## 🔐 Security Considerations

### Authentication
- Firebase Authentication with email/password
- Multi-factor authentication (optional)
- Session timeout after inactivity

### Authorization
- Role-based access control (RBAC)
  - **Admin**: Full CRUD on all collections
  - **Editor**: CRUD on content (NPCs, Quests, Dialogue, Puzzles)
  - **Viewer**: Read-only access
- Firestore Security Rules to enforce permissions

### Data Protection
- Input sanitization to prevent XSS
- SQL injection prevention (N/A for Firestore)
- Audit logging for all changes
- Backup and restore capabilities

---

## 📚 Documentation Requirements

### User Documentation
- [ ] Admin portal user guide
- [ ] Collection management tutorials
- [ ] Video walkthroughs for complex features (dialogue editor, quest chains)

### Developer Documentation
- [ ] Architecture overview
- [ ] API reference
- [ ] Component library documentation
- [ ] Deployment guide

---

## 🎯 Next Steps

### Immediate Actions (This Week)
1. **Review and approve this roadmap**
2. **Set up gather_portal project structure**
3. **Install dependencies and configure build system**
4. **Create base layout components**
5. **Implement authentication**

### First Sprint (Week 1-2)
1. Complete foundation phase
2. Build shared components (DataTable, Modal, FormBuilder)
3. Create Player Manager (highest priority)
4. Begin NPC Manager

---

## 📝 Notes

- **Reuse Existing Code**: Leverage existing Firebase config, types, and helpers from `webpage/src/`
- **Neumont Branding**: All UI must follow Neumont Brand Identity guidelines
- **Testing**: Write tests for critical CRUD operations
- **Accessibility**: Ensure WCAG 2.1 AA compliance
- **Mobile**: Desktop-first, but consider tablet support

---

**Document Version**: 1.0
**Last Updated**: 2026-02-28
**Author**: AI Assistant
**Status**: Ready for Review


