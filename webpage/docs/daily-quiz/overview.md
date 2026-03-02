# Daily Quiz Overview

## Architecture in words

The Daily Quiz flow is a browser React overlay on top of the Phaser game, backed by a Bun HTTP server and Firestore.

Runtime path:

1. A Phaser world object dispatches `window.dispatchEvent(new CustomEvent("dailyQuiz:start"))` from `webpage/src/entities/QuizTerminal.ts`.
2. `webpage/src/Game.tsx` listens for that event, sets `isDailyQuizOpen`, and renders `QuizPanel`.
3. `webpage/src/ui/quiz/QuizPanel.tsx` hosts the user quiz view and the leaderboard view.
4. `webpage/src/components/quiz/QuizModal.tsx` renders the daily quiz UI, admin tools, question editor, and schedule manager.
5. `webpage/src/hooks/useQuiz.ts` performs quiz start/submit requests against `/api/quiz/*`.
6. `webpage/src/index.ts` serves `/api/quiz`, `/api/admin`, `/api/leaderboard`, `/api/auth`, and `/api/profile`.
7. Firestore stores quiz questions, schedule entries, and player quiz completion data.

## Runtime entrypoints

`webpage/package.json` scripts:

- `bun run dev`: builds the frontend bundle, then starts the Bun server
- `bun run build`: production frontend bundle only
- `bun run start`: starts the Bun server from `src/index.ts`
- `bun run watch`: watch-mode frontend bundle only

Primary server entry:

- `webpage/src/index.ts`

API routing in `src/index.ts`:

- `/api/quiz/*` -> `webpage/src/server/api/quiz.ts`
- `/api/admin/*` -> `webpage/src/server/api/admin.ts`
- `/api/leaderboard` -> `webpage/src/server/api/leaderboard.ts`
- `/api/auth/*` -> `webpage/src/server/api/auth.ts`
- `/api/profile` -> `webpage/src/server/api/profile.ts`

## UI entrypoints

Main files:

- `webpage/src/Game.tsx`: renders Phaser, listens for `dailyQuiz:start`, and opens `QuizPanel`
- `webpage/src/ui/quiz/QuizPanel.tsx`: container for quiz modal and leaderboard screen
- `webpage/src/components/quiz/QuizModal.tsx`: daily quiz UI, admin test mode, question management, and schedule management
- `webpage/src/components/quiz/QuizCards.tsx`: answer selection UI for `mcq` and `select-all`
- `webpage/src/components/quiz/QuizResult.tsx`: post-correct result card
- `webpage/src/hooks/useQuiz.ts`: state machine for `idle/loading/active/submitting/incorrect/correct/completed/unavailable/error`

How Phaser opens the panel:

- `webpage/src/entities/QuizTerminal.ts` dispatches `dailyQuiz:start`
- `webpage/src/Game.tsx` listens for that browser event and sets `isDailyQuizOpen`
- `webpage/src/Game.tsx` renders `<QuizPanel isOpen={isDailyQuizOpen} ... />`

## Daily mode vs practice/test modes

### Daily mode

Daily mode is the shipped player flow.

- UI entry: `QuizPanel` -> `QuizModal`
- Start route: `POST /api/quiz/start`
- Submit route: `POST /api/quiz/submit`
- Today summary route: `GET /api/quiz/today`
- Completion persistence: Firestore `Player/{playerId}` and `Player/{playerId}/QuizCompletions/{dateKey}`

### Admin test mode

Admin test mode is the current moderator-facing way to validate a question before scheduling it.

- UI entry: `QuizModal` with an admin session
- Submit route: `POST /api/admin/test/submit`
- Purpose: check answer validation and points calculation without consuming the live daily quiz slot

This is the recommended testing path for moderators.

### Practice endpoints

Practice endpoints exist in the API and `useQuiz`:

- `POST /api/quiz/practice/start`
- `POST /api/quiz/practice/submit`

However, the shipped quiz panel does not currently expose a practice-mode UI entry. They are API-level support only on this branch. For moderator testing, use admin test mode instead of the practice endpoints.
