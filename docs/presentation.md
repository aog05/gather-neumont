# Presentation (5-minute summary)

## Talking points (5)

- What it is: a Phaser game with a React UI that renders as in-game overlays.
- Tech stack: Bun server + React Router SPA + Phaser + DiceBear avatars + JSON stores.
- Overlays: the game always stays visible behind auth/onboarding/account/admin overlays.
- Daily quiz: launched from the world, answered in an overlay, scored server-side.
- Data model handoff: JSON-backed today; DB-ready schema documented for migration.

## Diagram 1: Overlay rules

```text
  Router pathname
      |
      v
  isOverlayRoute(pathname) ?
     | yes                          | no
     v                              v
  OverlayLayout renders          OverlayLayout hides
  overlay outlet on top          overlay outlet
  of the game                    (game only)

  Input gating:
    disableKeyboard = isOverlayRoute(pathname) OR quizOpen
```

Legend:
- Overlay routes render UI on top of the game.
- Input gating disables Phaser keyboard while overlays/quiz are open.

## Diagram 2: Daily quiz flow (high level)

```text
  In-world terminal
      |
      v
  window "dailyQuiz:start"
      |
      v
  appEvents -> QuizPanel opens
      |
      +--> POST /api/quiz/start
      |
      +--> POST /api/quiz/submit (answer, elapsedMs)
               |
               v
        data/progress.json updated
               |
               v
        GET /api/leaderboard?limit=
```

Legend:
- The quiz UI is an overlay panel (not a route).
- Logged-in non-admin users persist progress to JSON for demo purposes.

## 60-second demo script (exact steps)

1. Go to `/sign-in`, enter a username, submit.
2. On `/onboarding/profile`, set Display name (email optional), click Continue.
3. On `/onboarding/avatar`, click Next/Previous once, then Continue.
4. On `/onboarding/major`, pick a major, click Finish -> land in the game (`/`).
5. Move with WASD/arrow keys to show gameplay input is active.
6. Open the Profile menu -> click Edit account -> land on `/account`.
7. Try moving: movement should be disabled while the account overlay is open.
8. Click Done -> back to `/` and confirm movement works again.
9. Interact with the in-world daily quiz terminal to open the quiz overlay.
10. Start quiz, submit an answer, then switch to the Leaderboard tab (or refresh it).

If the quiz is already completed for today, call it out and show the leaderboard anyway.

