# Firestore Schema

## Collections used by the quiz system

### `QUIZ_QUESTIONS`

Purpose:

- Stores v2 quiz questions, one Firestore document per question

Code:

- Collection constant: `webpage/src/lib/firebase.ts`
- Read/write repository: `webpage/src/server/services/quiz-questions.repository.ts`
- v2 mapping: `webpage/src/server/services/quiz-question.mapper.ts`
- Type: `QuizQuestionDocV2` in `webpage/src/types/firestore.types.ts`

V2 document shape:

```json
{
  "schemaVersion": 2,
  "type": "mcq",
  "prompt": "What does CSS stand for?",
  "choices": ["...", "..."],
  "correctIndex": 1,
  "basePoints": 100,
  "explanation": "Optional explanation",
  "difficulty": 1,
  "tags": ["web", "css"],
  "topic": "web",
  "createdAt": "2026-03-01T12:00:00.000Z",
  "updatedAt": "2026-03-01T12:00:00.000Z"
}
```

For `select-all`, `correctIndex` is replaced with `correctIndices`.

New questions are written only through `createV2QuizQuestion()` and `updateV2QuizQuestion()` in `webpage/src/server/services/quiz-questions.repository.ts`.

### `QUIZ_SCHEDULE`

Purpose:

- Maps one `dateKey` (`YYYY-MM-DD`) to one scheduled `questionId`

Code:

- Collection constant: `webpage/src/lib/firebase.ts`
- Service: `webpage/src/server/services/schedule-firestore.service.ts`
- Type: `FirestoreQuizScheduleEntry` in `webpage/src/types/firestore.types.ts`

Document id:

- `dateKey`

Document shape:

```json
{
  "dateKey": "2026-03-01",
  "questionId": "quiz_web_ab12cd",
  "createdAt": "2026-03-01T12:00:00.000Z",
  "updatedAt": "2026-03-01T12:00:00.000Z"
}
```

Uniqueness rule:

- The scheduling service rejects attempts to assign the same `questionId` to multiple dates and returns `QUESTION_ALREADY_SCHEDULED`.

## Player quiz completion storage

### `Player/{playerId}`

Quiz code uses these fields on the `Player` document:

- `displayName`
- `Username`
- `totalPoints`
- `streakDays`
- `lastCompletedDateKey`
- `Wallet` (fallback/backfill path)
- `PuzzleRecord` (updated when a legacy puzzle-backed question is completed)

Relevant code:

- Type: `Player` in `webpage/src/types/firestore.types.ts`
- Transaction write: `recordPlayerQuizCompletion()` in `webpage/src/server/services/player-leaderboard.service.ts`
- Summary read: `getPlayerSubmitSummary()` in `webpage/src/server/api/quiz.ts`

Typical quiz-managed fields:

```json
{
  "Username": "student_01",
  "displayName": "Student 01",
  "totalPoints": 450,
  "streakDays": 3,
  "lastCompletedDateKey": "2026-03-01",
  "Wallet": "450"
}
```

### `Player/{playerId}/QuizCompletions/{dateKey}`

Purpose:

- Idempotency record for one daily completion per player per date

Type:

- `PlayerQuizCompletionRecord` in `webpage/src/types/firestore.types.ts`

Document id:

- `dateKey`

Document shape:

```json
{
  "dateKey": "2026-03-01",
  "pointsAwarded": 150,
  "createdAt": "2026-03-01T18:30:00.000Z"
}
```

## Legacy support notes

Legacy quiz support still exists in repository and selection code:

- `listQuizQuestions({ includeLegacy: true })`
- `getQuizQuestionById(..., { includeLegacy: true })`
- `getQuestionForDate()` resolves scheduled questions with `includeLegacy: true`
- admin list/schedule validation also uses `includeLegacy: true`

Relevant files:

- `webpage/src/server/services/quiz-questions.repository.ts`
- `webpage/src/server/services/selection.service.ts`
- `webpage/src/server/services/admin-questions-firestore.service.ts`
- `webpage/src/server/services/schedule-firestore.service.ts`

What "v2 going forward" means on this branch:

- New question creation writes only to `QUIZ_QUESTIONS`
- Question edits and deletes apply only to v2 documents
- Legacy quiz questions sourced from `Puzzle` documents can still be read/resolved if `includeLegacy` is enabled
- Legacy questions are treated as read-only in admin flows and return `legacy_read_only` on edit/delete
