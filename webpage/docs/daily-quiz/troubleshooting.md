# Troubleshooting

## "No scheduled daily question"

Expected behavior:

- The idle card shows `No scheduled daily question`
- the base points card shows `-`
- `POST /api/quiz/start` returns `NO_QUIZ_SCHEDULED_TODAY`

Where to inspect:

- `webpage/src/components/quiz/QuizModal.tsx`
- `webpage/src/server/api/quiz.ts`
- `webpage/src/server/services/selection.service.ts`
- `webpage/src/server/services/schedule-firestore.service.ts`

Exact checks:

1. Confirm `QUIZ_SCHEDULE/{YYYY-MM-DD}` exists for the target date.
2. Confirm that `questionId` resolves to a valid question.
3. Confirm the resolved question has a valid `mcq` or `select-all` shape.

If the schedule entry exists but the UI still shows no quiz:

- the scheduled question may be missing or invalid
- `getQuestionForDate()` in `selection.service.ts` will return `null` in that case

## `409 QUESTION_ALREADY_SCHEDULED`

Cause:

- the same `questionId` is already assigned to another date

Where to inspect:

- `webpage/src/server/services/schedule-firestore.service.ts`
- `webpage/src/server/api/admin.ts`
- `webpage/src/components/quiz/QuizModal.tsx`

Exact fix:

1. Read the returned `existingDates` array.
2. Unschedule the old date with `DELETE /api/admin/schedule/:dateKey`, or
3. schedule a different question on the new date.

## Firestore permission or config failures

Symptoms:

- admin question list fails to load
- schedule load/save/delete fails
- daily quiz start/submit fails even though routes exist

Where to inspect:

- `webpage/src/lib/firebase.ts`
- `webpage/src/index.ts`
- `webpage/src/server/services/quiz-questions.repository.ts`
- `webpage/src/server/services/schedule-firestore.service.ts`
- `webpage/src/server/services/player-leaderboard.service.ts`

Exact checks:

1. Verify the app is pointed at the intended Firebase project in `firebase.ts`.
2. Verify Firestore rules allow the reads/writes used by the Bun runtime.
3. Check browser devtools and Bun server logs for Firestore exceptions.
4. Confirm the following collections are readable/writable as needed:
   - `QUIZ_QUESTIONS`
   - `QUIZ_SCHEDULE`
   - `Player`
   - `PuzzleWeek`
   - `Puzzle` (still used for legacy question reads)

## Leaderboard is not reflecting quiz points

Current branch behavior:

- This is expected.

Why:

- daily quiz points/streak are written to Firestore `Player` documents
- `/api/leaderboard` still reads local JSON stores instead of Firestore

Where to inspect:

- leaderboard route: `webpage/src/server/api/leaderboard.ts`
- quiz completion writes: `webpage/src/server/services/player-leaderboard.service.ts`
- JSON stores: `webpage/data/progress.json` and `webpage/data/users.json`

What to do:

- Do not debug Firestore player totals if the issue is only the leaderboard display.
- Treat the leaderboard as JSON-backed until that route is migrated.

## Guest sessions reset after a server restart

Current branch behavior:

- This is expected.

Why:

- guest attempt state is stored in memory on the server
- guest identity in the browser is only a `sessionStorage` token

Where to inspect:

- `webpage/src/server/data/guest-sessions.ts`
- `webpage/src/hooks/useQuiz.ts`

What to do:

- For persistent once-per-day behavior, log in with a real user session.
- For guest testing, restarting the Bun server clears guest completion state.

## Legacy question appears in admin but cannot be edited

Cause:

- admin list/read paths include legacy quiz questions
- legacy question ids are treated as read-only

Where to inspect:

- `webpage/src/server/services/admin-questions-firestore.service.ts`
- `webpage/src/server/services/quiz-questions.repository.ts`

Exact fix:

- Do not try to edit/delete the legacy record directly.
- Recreate the question as a v2 `QUIZ_QUESTIONS` document if it needs to be maintained going forward.
