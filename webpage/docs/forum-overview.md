# Forum and Emulator Overview

Last updated: March 8, 2026

## What this is
The forum is an in-game global chat feature for Gather. Players open it from a Phaser terminal, and the chat UI is rendered as a React overlay.

## Current MVP scope
- Global chat feed
- Message send and report
- Admin moderation actions (pin, quarantine, unquarantine, soft delete, clear reports)
- Ban management UI
- Emoji reactions
- Enter-to-send in composer
- Local Firestore emulator workflow and demo seed data

## Why emulator support was added
The team does not currently have stable Firebase project access and deployment control. The emulator path was added so forum work can continue locally while access is being resolved.

## Temporary vs long-term
Current temporary choices:
- Direct client Firestore writes for forum actions
- Permissive local chat rules for fast iteration
- Emulator-first local testing workflow

Long-term direction after Firebase access is restored:
- Move moderation-critical writes behind server-controlled endpoints
- Tighten Firestore rules around authenticated roles
- Reconcile local emulator assumptions with deployed project behavior

## How forum integrates with the game
- Phaser scene handles proximity and shared `E` interaction dispatch
- Forum terminal dispatches `forum:start`
- React game shell listens for `forum:start` and opens `ForumPanel`
- When forum is open, Phaser keyboard input is disabled

## Reading order for this doc set
1. `forum-local-dev.md` for startup and emulator flow
2. `forum-architecture.md` for interaction and data flow
3. `forum-data-model.md` for Firestore paths and fields
4. `forum-file-map.md` for ownership by file
5. `forum-hardening-and-debt.md` for recent fixes and cleanup backlog
6. `forum-known-issues.md` for pitfalls and troubleshooting
