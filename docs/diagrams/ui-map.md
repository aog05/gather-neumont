# UI Map (ASCII)

```text
  App (Router)
    |
    v
  OverlayLayout
   +-- GamePage (Phaser background)
   +-- ProfileHUD (hidden while overlay routes active)
   +-- QuizPanel (opens via appEvents state)
   +-- Overlay outlet (only when overlay routes active)
         |
         +-- /sign-in
         +-- /create-account
         +-- /onboarding/profile
         +-- /onboarding/avatar
         +-- /onboarding/major
         +-- /account
         |     +-- /account/profile
         |     +-- /account/avatar
         |     +-- /account/major
         +-- /admin
```

Legend:
- `+--` indicates a child component or nested route.
- Overlay routes render into the overlay outlet over the game.

```text
  QuizPanel (overlay)
   +-- Tabs: Quiz | Leaderboard | Data | (Admin)
   +-- QuizModal (question UI)
         |
         +-- useQuiz hook
               +-- POST /api/quiz/start
               +-- POST /api/quiz/submit
```

Legend:
- Quiz is UI-state driven (not a route).
- Guest sessions use a per-tab `guestToken` stored in session storage.

