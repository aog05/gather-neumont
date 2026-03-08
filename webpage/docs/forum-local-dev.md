# Forum Local Development

Last updated: March 8, 2026

## Purpose
This guide explains how to run the current forum stack locally, including the Firestore emulator and seed data.

## Prerequisites
- Bun
- Java 11+ (required by Firebase emulator)
- Firebase CLI available through `npx` or global install

## Run locally
Run commands from `webpage/`.

### 1) Start Firestore emulator
```bash
bun run emu:start
```

This starts:
- Firestore emulator on `localhost:8080`
- Emulator UI on `localhost:4000`

### 2) Start web app
```bash
bun run dev
```

The Bun server runs on `localhost:3000`.

### 3) Seed forum demo data
```bash
bun run emu:seed
```

The seed script populates:
- `chat/global/messages`
- `chat/global/meta/pinned`

If messages already exist, seed skips writes.

## Emulator routing behavior
`src/lib/firebase.ts` supports two emulator routes in development:
- Explicit opt-in via `BUN_PUBLIC_USE_FIRESTORE_EMULATOR=1` or `true`
- Localhost fallback when app hostname is `localhost`, `127.0.0.1`, or `::1`

Optional strict mode:
- `BUN_PUBLIC_REQUIRE_FIRESTORE_EMULATOR=1` forces startup failure if emulator is not connected.

Optional host override:
- `BUN_PUBLIC_FIRESTORE_EMULATOR_HOST=localhost:8080`

PowerShell example:
```powershell
$env:BUN_PUBLIC_USE_FIRESTORE_EMULATOR = "1"
$env:BUN_PUBLIC_FIRESTORE_EMULATOR_HOST = "localhost:8080"
bun run dev
```

## Reset and reseed local data
Default emulator data is in-memory.

Reset flow:
1. Stop emulator (`Ctrl+C`)
2. Start emulator again (`bun run emu:start`)
3. Run seed again (`bun run emu:seed`)

## If port 8080 is already in use
Option 1:
- Stop the process using port `8080`.

Option 2:
- Change Firestore emulator port in `firebase.json`.
- Update host references to match:
  - `BUN_PUBLIC_FIRESTORE_EMULATOR_HOST`
  - `FIRESTORE_EMULATOR_HOST` for seeding

## Emulator guard behavior
`scripts/seed-chat-emulator.ts` refuses to run if `FIRESTORE_EMULATOR_HOST` is not local:
- allowed: `localhost`, `127.0.0.1`, `::1`
- blocked: non-local hosts

This reduces risk of accidental writes to non-local targets.

## Common pitfalls
- Chat reads/writes fail with `permission-denied`:
  - Emulator is not running, rules did not load, or wrong project/host.
- Feed query shows index errors:
  - Check `firestore.indexes.json` and restart emulator.
- Forum works but NPC dialogue appears broken:
  - Emulator is usually seeded with chat data only; dialogue/NPC collections are not seeded by `emu:seed`.

## Note on older emulator docs
`docs/firestore-emulator.md` still exists and overlaps this guide. Use this forum-specific guide when running forum work and troubleshooting forum data paths.
