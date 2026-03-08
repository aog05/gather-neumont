# Firestore Emulator — Local Dev Guide

Use the Firestore emulator to develop forum/chat features without access to the
production `test-neumont` Firebase project. Rules and indexes are loaded from the
local files on each emulator start, so changes take effect immediately.

## Prerequisites

- **Java 11+** — required by the Firebase emulator suite.
  Check with `java -version`. Download from https://adoptium.net if missing.
- **Firebase CLI** — installed via npm/npx (already a dev dependency via `npx`).
  Or install globally: `npm install -g firebase-tools`
- **Bun** — already required by this project.

## Ports

| Service | Port |
|---|---|
| Firestore emulator | 8080 |
| Emulator UI (browser) | 4000 |
| Bun dev server | 3000 (default) |

## Step-by-step: run locally

Open **two terminals**, both inside `webpage/`.

### Terminal 1 — start the emulator

```bash
bun run emu:start
```

This runs:
```
npx firebase emulators:start --only firestore --project test-neumont
```

Wait for the line:
```
✔  All emulators ready!
```

The Emulator UI is available at http://localhost:4000 — use it to browse
collections, delete documents, or inspect data in real time.

### Terminal 2 — start the app

```bash
bun run dev
```

The app builds the frontend bundle and starts the Bun HTTP server.
Open http://localhost:3000 (or whatever port the server prints).

**Emulator auto-detection:** the client checks `window.location.hostname`.
If it is `localhost`, `127.0.0.1`, or `::1`, Firestore is routed to the
emulator on port 8080. No env-var changes are needed. Deployed builds served
from any other origin skip the emulator call entirely.

### Seed welcome + pinned message

With the emulator running, in any terminal inside `webpage/`:

```bash
bun run emu:seed
```

This uses the **Firebase Web SDK** (same SDK as the app — no `firebase-admin`)
to write one welcome message to `chat/global/messages` and pin it in
`chat/global/meta/pinned`. The script is idempotent — if messages already
exist it prints a notice and exits without writing.

Expected output:
```
[seed] Connected to Firestore emulator at localhost:8080
[seed] Created message: <auto-id>
[seed] Pinned message: <auto-id>
[seed] Done. Open the forum to see the welcome message + pinned banner.
```

## Reset emulator data

The emulator is in-memory by default — stop it (Ctrl-C) and restart to wipe
all data, then re-seed:

```bash
# Terminal 1
bun run emu:start

# Terminal 2 (after emulator is ready)
bun run emu:seed
```

To persist data across restarts, add `--import=./emu-data --export-on-exit`
to the `emu:start` command. See Firebase docs for details.

## Safety notes

- `emu:seed` defaults `FIRESTORE_EMULATOR_HOST` to `localhost:8080` when the
  env var is absent, and exits with an error if the host is not `localhost`
  or `127.0.0.1`. It **cannot** write to production Firestore.
- The seed script uses the **Firebase Web SDK** with `connectFirestoreEmulator`
  called explicitly — no Admin SDK, no service account credentials needed.
- The `connectFirestoreEmulator` call in `src/lib/firebase.ts` is gated on
  `window.location.hostname` being `localhost`, `127.0.0.1`, or `::1`.
  Any deployed URL is unaffected.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Could not find java` | Install Java 11+ and ensure it is on PATH |
| Port 8080 already in use | Stop the other process, or change the port in `firebase.json` and both `connectFirestoreEmulator` calls |
| Forum shows `permission-denied` | Emulator not running, or the page loaded before emulator was ready — refresh the page |
| Forum shows `failed-precondition` | Index not loaded — verify `firestore.indexes.json` has `__name__ DESC` on the feed index; check emulator output for "Loaded Firestore indexes" |
| Seed says "already has documents" | Restart the emulator to clear data, then re-run `emu:seed` |
| Seed exits with "must be localhost" | `FIRESTORE_EMULATOR_HOST` is set to a non-local value — unset it or run `FIRESTORE_EMULATOR_HOST=localhost:8080 bun run emu:seed` |
