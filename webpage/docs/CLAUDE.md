# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

You are setting up the **Neumont Virtual Campus Web App** - a browser-based virtual campus exploration experience that lets prospective students explore the Neumont building floor plan, interact with NPCs (faculty/staff), solve daily CS puzzles, and engage with community features.

## Technologies

- **Linting/Formatting**: ESLint + Prettier

**Client**:

- **Game Engine**: Phaser 3 (2D world, tilemaps, camera, input)
- **UI Framework**: React (recommended for overlays: chat, forum, profile, modals)

**Server**:

- **Language**: TypeScript everywhere
- **Runtime**: Bun (primary). Do not use Node.JS as a fallback
- **Database**: PostgreSQL
- **Caching**: (optional for MVP): Redis

## Design

- **Rendering**: 2D top-down view (Gather-like aesthetic)
- **Images, Spritesheets, Blueprints**: Image and blueprints will be supplied.
  - Don't create any images yourself.
  - Follow blueprints of building as closely as possible.
  - Don't change the layout of the building unless told to do so.
- **Audio**: Audio will be supplied.
  - Don't create any audio yourself.
  - Don't change any audio unless told.

## Project Structure

```
.
├── assets/
│   ├── images/
│   │   └── map/
│   │       └── this will include the layout of the building
│   ├── audio
│   └── spritesheets
├── src/
│   ├── scenes/
│   │   ├── maps
│   │   │   └── environments will be instantiated in here, like walls, NPCs, etc. to be used in scenes
│   │   └── scenes to be placed here
│   ├── utils/
│   │   └── utility functions like collisions scripts and math files
│   ├── components/
│   │   └── directory for components
│   ├── App.tsx (Routes can be found in here)
│   ├── frontend.tsx
│   ├── index.html
│   ├── index.css
│   └── index.ts
├── bun.lock
└── package.json
```

## Core Objectives

1. **Build** a 4-floor explorable virtual campus based on real Neumont floor plans
2. **Enable** self-guided exploration with NPC interactions and content kiosks
3. **Create** recurring engagement through daily puzzles, streaks, and leaderboards
4. **Provide** community connection via forum and live basement chat
5. **Support** persistent user profiles with avatars and skill trees

## Agent Configuration

The repository includes a custom agent definition in `.github/agents/mdplanning.agent.md`:

- **Purpose**: Planning phase agent for creating markdown files before prompting AI to write scripts
- **Name**: MDPlanning
- **Tools**: vscode, read, search, web
- **Usage Guideline**: Use context7 at the end of each prompt to get relevant project information

## Claude Code Settings

Local settings are configured in `.claude/settings.local.json` with permissions for:

- Browser interaction (clicks)
- Tree command usage

## Development Notes

There is nothing outside of this directory that is needed for the project.

Never read previous prompts inside of the /ai/prompts unless specifically told to do so.

The respository is in its early stage. Don't implement more than necessary for the time. Only configure what is mentioned in the prompt.

# Resources

- [Phaser Documentation](https://docs.phaser.io/?_gl=1*1s03ke6*_ga*MTYwODg3MTQ3Mi4xNzY5MDIxMzgz*_ga_7NC8GZ639E*czE3Njk3MjYwNjEkbzIkZzEkdDE3Njk3MjYwNzQkajQ3JGwwJGgxMTUyMjU0MzUz)
- [Phaser Best Practices](https://genieee.com/phaser-game-development-best-practices/)
- [Bun Documentation](https://bun.com/docs)
