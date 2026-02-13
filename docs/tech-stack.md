# Tech Stack

## Runtime + build

- **Bun**: runs the server (`bun --hot src/index.ts`) and builds the frontend (`bun build ...`).
- **JSON stores**: the server reads/writes JSON under `data/` for persistence during demos.

## Frontend

- **React**: UI for overlays (auth, onboarding, account, quiz).
- **React Router**: drives overlay routes so the game remains visible behind them.
- **Overlay approach (why it exists)**:
  - The Phaser game is always rendered as the background.
  - The overlay layer renders routes like sign-in/onboarding/account on top.
  - The daily quiz is a state-driven overlay panel (not a route).

## Game

- **Phaser**: game loop, scenes, input, and rendering.
- **Input gating**: keyboard input is disabled while overlay routes are active or the quiz is open.

## Avatars

- **DiceBear**: generates deterministic SVG avatars from a `style` + `seed`.
  - Client-side preview uses SVG data URLs.

## Leaderboard (demo mode)

- The quiz UI can show a **placeholder/demo leaderboard dataset** for demos.
- The server also exposes a real leaderboard endpoint backed by the JSON progress store.
- Until a database is online, assume leaderboard data is demo-first and persistence is JSON.

