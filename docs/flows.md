# Flows

All diagrams use ASCII only, fit within ~90 columns, and include a legend.

## A) Routes + overlays map

```text
                     (React Router)
                          |
                          v
  +--------------------------------------------------------------+
  | OverlayLayout (always mounted under "/")                      |
  |                                                              |
  |  +----------------------+                                     |
  |  | GamePage (Phaser)    |   <-- always rendered (background)  |
  |  +----------------------+                                     |
  |                                                              |
  |  Overlay routes:                                              |
  |    /sign-in                                                   |
  |    /create-account                                            |
  |    /onboarding/*                                              |
  |    /account/*                                                 |
  |    /admin                                                     |
  |                                                              |
  |  Non-route overlay:                                           |
  |    Daily Quiz panel (open state)                              |
  +--------------------------------------------------------------+
```

Legend:
- Boxes are always-mounted UI shells or major subsystems.
- Overlay routes render into the overlay outlet on top of the game.

Debug checklist (when overlays are invisible or not click-through):
- Check overlay route detection in `src/ui/OverlayLayout.tsx`.
- Check the route tree in `src/App.tsx` (nested outlets).
- Check overlay root z-index/pointerEvents in `src/ui/OverlayLayout.tsx`.

## Overlay + input gating mechanics

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
```

Legend:
- `isOverlayRoute(...)` is the shared overlay-route predicate.
- The overlay outlet is the React Router `<Outlet />` rendered above the game.

```text
  (pathname, quizOpen)
        |
        v
  disableKeyboard = isOverlayRoute(pathname) OR quizOpen
        |
        v
  Game.tsx toggles Phaser keyboard enabled = NOT disableKeyboard
```

Legend:
- `quizOpen` is the daily quiz overlay open state.
- When disabled, the player cannot move while UI overlays are active.

Troubleshooting:
- If overlay page is blank, check overlay route detection.
- If player moves while overlay open, check input gating.

## B) Daily quiz launch flow

```text
  Player in world
      |
      | interacts with "terminal"
      v
  window event: "dailyQuiz:start"
      |
      v
  GamePage listener (adds event listener)
      |
      v
  appEvents.emitOpenDailyQuiz()
      |
      v
  OverlayLayout: isDailyQuizOpen = true
      |
      v
  QuizPanel (overlay UI)
      |
      v
  useQuiz hook
   |   |
   |   +--> POST /api/quiz/start  (gets today's question)
   |
   +------> POST /api/quiz/submit (answer, elapsedMs)
              |
              v
        Server scoring + persistence
              |
              +--> data/progress.json (per-user progress)
              |
              +--> GET /api/leaderboard?limit= (ranked output)
```

Legend:
- Arrows show the event/data direction.
- `appEvents` is an in-memory pub/sub bridge between game and overlay UI.

Debug checklist (when quiz doesn't open or doesn't submit):
- Verify `dailyQuiz:start` is fired (browser devtools event breakpoint/log).
- Verify `appEvents` wiring in `src/events/appEvents.ts`.
- Verify API routes in `src/index.ts` and handlers in `src/server/api/quiz.ts`.
- If leaderboard looks empty, check `data/progress.json` and `/api/leaderboard`.

## C) Auth + onboarding flow

```text
  +------------------+
  | Start (/)         |
  +------------------+
       |
       +--> Guest: "Continue as guest"
       |      |
       |      v
       |   localStorage guestChosen = true
       |      |
       |      v
       |   Onboarding overlays (profile -> avatar -> major)
       |      |
       |      v
       |   Game (no server profile persistence)
       |
       +--> User/Admin: sign in
              |
              v
         POST /api/auth/login
              |
              v
         cookie "session" set
              |
              v
         GET /api/auth/me
              |
              v
         If profileComplete == false:
           route guard sends to /onboarding/profile
         Else:
           allow game at /
```

Legend:
- Guest mode is client-selected and does not require a server session.
- Logged-in mode is cookie/session based; server reports `profileComplete`.

Debug checklist (when sign-in loops or onboarding gating is wrong):
- Check `/api/auth/me` response fields: `hasProfile`, `profileComplete`.
- Check `AuthProvider.refresh()` in `src/features/auth/AuthContext.tsx`.
- Check onboarding guard logic in `src/App.tsx`.
- If guest vs user feels mixed, check `happy-volhard.auth.guestChosen.v1`.
