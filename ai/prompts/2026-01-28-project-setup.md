# Project Setup Prompt: Neumont Virtual Campus Web App

## Project Overview

You are setting up the **Neumont Virtual Campus Web App** - a browser-based virtual campus exploration experience that lets prospective students explore a Neumont building floor plan, interact with NPCs (faculty/staff), solve daily CS puzzles, and engage with community features.

## Core Objectives

1. **Build** a 4-floor explorable virtual campus based on real Neumont floor plans
2. **Enable** self-guided exploration with NPC interactions and content kiosks
3. **Create** recurring engagement through daily puzzles, streaks, and leaderboards
4. **Provide** community connection via forum and live basement chat
5. **Support** persistent user profiles with avatars and skill trees

## Technical Stack

### Repository Structure

```
/src/client # Web application (game + UI)
/src/server # Realtime + API backend
```

### Core Technologies

- **Language**: TypeScript everywhere
- **Runtime**: Bun (primary). Do not use Node.JS as a fallback
- **Linting/Formatting**: ESLint + Prettier
- **Database**: PostgreSQL
- **Caching** (optional for MVP): Redis

### Client Stack

- **Game Engine**: Phaser 3 (2D world, tilemaps, camera, input)
- **UI Framework**: React (recommended for overlays: chat, forum, profile, modals)
- **Rendering**: 2D top-down view (Gather-like aesthetic)

### Server Stack

- **Runtime**: Bun WebSocket server
- **Protocol**: WebSockets for realtime (chat + live updates)
- **Validation**: Zod for schema validation
- **Serialization**: JSON (with option to migrate to msgpack later)
- **Database**: PostgreSQL for all persistent data

## MVP Scope

### 4 Floors to Build

1. **Basement**: Community hub (forum + live chat + announcements + student projects)
2. **Main Level (Commons)**: Welcome + overview + Apply/Next Steps + navigation
3. **Floor 2**: Degrees + Faculty hubs (6 majors with chairs + kiosks)
4. **Floor 3**: Career + Outcomes (career services + alumni outcomes + project gallery)

### 6 Degree Programs to Cover

Each needs a Degree Chair NPC + Curriculum Kiosk + Projects/Outcomes Kiosk:

- Computer Science (CS)
- Software Engineering (SE)
- Information Systems (IS)
- Game Development
- BS Applied AI (BSAAI)
- BS AI Engineering (BSAIE)

### Key Features Required

#### 1. Campus World & Navigation

- Neumont-authentic layout based on real floor plans
- Smooth movement with collision detection
- Floor selector + simple map/legend
- Quest markers for wayfinding
- Easter eggs for exploration rewards

#### 2. Daily Engagement Loop

- Daily CS puzzle/quiz (60-120 seconds)
- Streak tracking
- Daily leaderboard (points, streak length, correct answers)
- Daily quest system (visit rooms, talk to NPCs, etc.)
- Reward system: badges + points for avatar cosmetics

#### 3. Community Features

- **Forum**: Discord-like channels/threads, staff announcements, read/post/react
- **Basement Live Chat**: Real-time text chat room
- **Moderation**: Mute/ban, delete messages, report users, rate limits, guest restrictions
- **Note**: No in-world multiplayer avatars in MVP

#### 4. User Accounts & Profiles

- Login via admissions portal (SSO to be finalized with IT)
- Guest mode (no persistence)
- Profile fields: name, email, intended major, location
- Avatar builder: base character + unlockable cosmetics
- Skill tree: user-added skills with tags (class vs self-taught)
- Saved progress: streaks, badges, puzzle history, forum/chat identity

#### 5. Admin Content Management

- Add/edit/remove NPCs (name, role, location, dialogue, links)
- Manage daily puzzles/quizzes and quest definitions
- Manage forum structure (channels, pins, locks, announcements)
- Moderation tools with audit log

#### 6. Accessibility & Device Support

- Desktop + mobile responsive
- Desktop: keyboard controls
- Mobile: touch joystick/buttons or tap-to-walk
- Text scaling and readable dialogue UI
- Clear interaction prompts

## Explicitly Out of Scope for MVP

- In-world multiplayer avatars (seeing other users walking)
- Voice/video chat or proximity audio
- Verified skills tied to official transcripts
- Deep analytics dashboards

## First Steps to Complete

### 1. Initialize Repository Structure

```bash
mkdir -p client server
```

### 2. Set Up Client

- Initialize Vite + React + TypeScript project
- Install Phaser 3
- Configure ESLint + Prettier
- Set up basic game canvas with Phaser
- Create basic folder structure:
  - `/client/src/game` - Phaser game logic
  - `/client/src/components` - React UI components
  - `/client/src/lib` - Utilities, types, API clients
  - `/client/src/assets` - Images, tilemaps, sprites

### 3. Set Up Server

- Initialize Bun TypeScript project
- Set up WebSocket server with Bun
- Configure PostgreSQL connection
- Install Zod for validation
- Create basic folder structure:
  - `/server/src/routes` - HTTP endpoints
  - `/server/src/ws` - WebSocket handlers
  - `/server/src/db` - Database schema and queries
  - `/server/src/middleware` - Auth, validation, rate limiting
  - `/server/src/types` - Shared TypeScript types

### 4. Database Schema (PostgreSQL)

Create initial schema for:

- `users` - User accounts
- `profiles` - User profiles and settings
- `skills` - User skill tree entries
- `badges` - Available badges
- `user_badges` - Earned badges
- `daily_puzzles` - Puzzle questions and answers
- `puzzle_attempts` - User attempt history
- `leaderboard_entries` - Daily/weekly leaderboards
- `forum_channels` - Forum channels
- `forum_threads` - Forum threads
- `forum_posts` - Forum posts
- `chat_messages` - Chat history
- `npcs` - NPC definitions
- `kiosks` - Content kiosk definitions
- `moderation_log` - Audit trail

### 5. Core Development Setup

- Set up TypeScript configs for both client and server
- Configure shared types between client/server (consider monorepo tooling or simple symlinking)
- Set up environment variables (.env files)
- Create README with setup instructions
- Initialize git (if not already done)

### 6. Proof of Concept Deliverables

Build these minimal features to validate the stack:

1. **Client**: Basic Phaser canvas rendering with a simple tilemap
2. **Server**: WebSocket connection accepting and broadcasting messages
3. **Database**: Successfully connecting and querying PostgreSQL
4. **Integration**: Client connects to server via WebSocket and sends/receives messages

## Success Criteria for Initial Setup

✅ Repository structure created with `/client` and `/server` folders  
✅ Client runs with Vite + Phaser rendering a canvas  
✅ Server runs with Bun + WebSocket accepting connections  
✅ PostgreSQL database created with initial schema  
✅ Client can connect to server via WebSocket  
✅ ESLint + Prettier configured and working  
✅ TypeScript compiling without errors in both projects  
✅ README created with setup/run instructions

## Getting Started

1. Read this specification thoroughly
2. Set up the repository structure
3. Initialize both client and server projects
4. Create the database schema
5. Build a simple proof-of-concept (tilemap + WebSocket connection)
6. Document the setup process in README

## Important Notes

- **Bun Compatibility**: Pin Bun versions and keep dependencies tight (especially WebSocket and database libraries)
- **Performance**: Use tilemap/chunk approach for world rendering
- **Static Assets**: Plan for CDN/caching hosted by the school
- **Moderation**: Build in rate limiting and audit logging from the start
- **Content Management**: All admin-editable content should be database-backed, not hardcoded

## Questions to Resolve During Setup

- Exact SSO/authentication method with IT department
- Asset hosting and CDN strategy
- Deployment environment and CI/CD pipeline
- Development/staging/production environment setup
- Monitoring and logging strategy

---

**Begin by setting up the foundational structure and getting a basic "hello world" running for each major component (client game, server WebSocket, database connection).**
