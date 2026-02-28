# Architecture

## Server routing (`src/index.ts`)

The Bun server uses a simple route table:

- `/api/*` -> JSON API router (fans out to feature handlers)
- `/assets/*` -> static assets handler
  - Performs traversal checks and only serves files under `public/assets`
  - Missing assets return `404` (no SPA fallback)
- `/*` -> SPA fallback (`src/index.html`)
  - All non-API, non-asset routes return the same HTML for client-side routing

API handler fan-out (by prefix) includes:

- `/api/auth/*` -> `src/server/api/auth.ts`
- `/api/profile/*` -> `src/server/api/profile.ts`
- `/api/quiz/*` -> `src/server/api/quiz.ts`
- `/api/leaderboard*` -> `src/server/api/leaderboard.ts`
- `/api/admin/*` -> `src/server/api/admin.ts`

Persistence (demo) is JSON under `data/` (see `src/server/data/*.store.ts`).

## Frontend bootstrap

Entry points:

- `src/frontend.tsx`: creates the React root and mounts providers.
  - `AuthProvider` (session + guest selection)
  - `ProfileProvider` (profile draft + onboarding progress)
- `src/App.tsx`: React Router route tree.
- `src/ui/OverlayLayout.tsx`: the key composition point:
  - Always renders the Phaser game component (`src/Game.tsx`) behind everything
  - Renders an overlay `<Outlet />` for overlay routes
  - Renders the daily quiz panel when opened (state-driven)

## Overlay + input gating

Two layers cooperate to keep overlays feeling "in-game":

1. **Overlay routing**
   - `OverlayLayout` decides when an overlay route is active (by pathname).
   - When active, it renders the router outlet inside a full-screen fixed overlay.

2. **Disable gameplay keyboard input**
   - `src/Game.tsx` disables Phaser keyboard input when:
     - the current route is an overlay route, or
     - the daily quiz overlay is open

Additionally, `OverlayLayout` captures keyboard events at the overlay root and stops
propagation to Phaser listeners (while still allowing typing in inputs).

## Overlay and Input Rules

- The Phaser game always renders in the background (the game canvas never unmounts on route changes).
- Certain routes are treated as **overlay routes** and render UI on top of the game.
- While an overlay is open, gameplay keyboard input is disabled so the player cannot move while typing/clicking UI.
- The Daily Quiz overlay also disables gameplay input while it is open (even though it is not a route).

Overlay routes (render on top of the game):

- `/sign-in`
- `/create-account`
- `/onboarding/*` (includes `/onboarding` index)
- `/account/*` (includes `/account` index)
- `/admin`

## Client-side storage keys

Local storage:

- `happy-volhard.auth.guestChosen.v1` (boolean flag: user chose guest mode)
- `happy-volhard.profileDraft.v1` (profile draft JSON)
- `happy-volhard.onboardingProgress.v1` (onboarding progress JSON)

Session storage (per-tab):

- `guestToken` (guest quiz identity token for `/api/quiz/*` calls)
- `guestMode` (used by the quiz dev page to simulate guest/user mode)

Cookies:

- `session` (server session token; stored as an HTTP cookie)

## Profile model (current)

Profile data includes:

- `displayName` (required for basics)
- `email` (optional)
- `intendedMajorId`
- `avatar` (`provider`, `style`, `seed`)

There is no active profile field for a physical address/city field.
