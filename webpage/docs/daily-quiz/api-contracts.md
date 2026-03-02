# API Contracts

This document describes the shipped API routes used by the Daily Quiz UI on this branch.

Server routing entry:

- `webpage/src/index.ts`

## `GET /api/quiz/today`

Auth:

- Optional
- If a logged-in non-admin session exists, the route also reports whether that player already completed today

Code:

- `webpage/src/server/api/quiz.ts`

Success when a quiz is scheduled:

```json
{
  "hasQuiz": true,
  "quizDate": "2026-03-01",
  "questionId": "quiz_web_ab12cd",
  "basePoints": 100,
  "alreadyCompleted": true,
  "pointsEarned": 150,
  "completedAt": "2026-03-01T18:30:00.000Z"
}
```

Success when no quiz is scheduled:

```json
{
  "hasQuiz": false,
  "quizDate": "2026-03-01",
  "code": "NO_QUIZ_SCHEDULED_TODAY",
  "message": "No quiz scheduled today"
}
```

Status codes:

- `200`: route handled successfully

## `POST /api/quiz/start`

Auth:

- Logged-in user session, or guest with `guestToken`
- Frontend always sends `guestToken`; session user takes precedence if present

Code:

- `webpage/src/server/api/quiz.ts`
- Frontend caller: `webpage/src/hooks/useQuiz.ts`

Request JSON:

```json
{
  "guestToken": "guest_123"
}
```

Success when quiz can start:

```json
{
  "quizDate": "2026-03-01",
  "question": {
    "id": "quiz_web_ab12cd",
    "type": "mcq",
    "prompt": "What does CSS stand for?",
    "choices": ["...", "..."],
    "difficulty": 1,
    "tags": ["web", "css"],
    "basePoints": 100
  },
  "alreadyStarted": false
}
```

Already completed response:

```json
{
  "alreadyCompleted": true,
  "quizDate": "2026-03-01",
  "pointsEarned": 150,
  "completedAt": "2026-03-01T18:30:00.000Z",
  "message": "You already completed today's quiz."
}
```

Common error responses:

```json
{
  "code": "MISSING_GUEST_TOKEN",
  "message": "guestToken is required for guest sessions"
}
```

```json
{
  "code": "NO_QUIZ_SCHEDULED_TODAY",
  "message": "No quiz scheduled today",
  "quizDate": "2026-03-01"
}
```

Status codes:

- `200`: started or already completed
- `400`: invalid JSON or missing guest token
- `404`: no scheduled quiz today

## `POST /api/quiz/submit`

Auth:

- Logged-in user session, or guest with `guestToken`

Code:

- `webpage/src/server/api/quiz.ts`
- Frontend caller: `webpage/src/hooks/useQuiz.ts`

Request JSON:

MCQ:

```json
{
  "guestToken": "guest_123",
  "questionId": "quiz_web_ab12cd",
  "answer": { "selectedIndex": 1 },
  "elapsedMs": 12400
}
```

Select-all:

```json
{
  "guestToken": "guest_123",
  "questionId": "quiz_web_ab12cd",
  "answer": { "selectedIndices": [0, 2] },
  "elapsedMs": 12400
}
```

Incorrect response:

```json
{
  "correct": false,
  "attemptNumber": 2,
  "feedback": {
    "wrongIndex": 1
  },
  "quizDate": "2026-03-01"
}
```

Correct response:

```json
{
  "correct": true,
  "attemptNumber": 1,
  "alreadyCompleted": false,
  "pointsEarned": 150,
  "totalPoints": 450,
  "streakDays": 3,
  "completedAt": "2026-03-01T18:30:00.000Z",
  "pointsBreakdown": {
    "basePoints": 100,
    "attemptMultiplier": 1,
    "attemptNumber": 1,
    "baseAfterMultiplier": 100,
    "firstTryBonus": 25,
    "speedBonus": 25,
    "totalPoints": 150
  },
  "explanation": "Optional explanation",
  "correctIndex": 1,
  "quizDate": "2026-03-01"
}
```

Already completed response:

```json
{
  "alreadyCompleted": true,
  "quizDate": "2026-03-01",
  "pointsEarned": 150,
  "totalPoints": 450,
  "streakDays": 3,
  "completedAt": "2026-03-01T18:30:00.000Z",
  "canRetry": false,
  "message": "You already completed today's quiz."
}
```

Rollover response:

```json
{
  "code": "QUESTION_ROLLED_OVER",
  "message": "Question has rolled over",
  "rollover": true,
  "quizDate": "2026-03-02",
  "newQuestion": {
    "id": "quiz_web_ef34gh",
    "type": "mcq",
    "prompt": "New question",
    "choices": ["...", "..."],
    "difficulty": 1,
    "basePoints": 100
  }
}
```

Status codes:

- `200`: incorrect, correct, or already completed
- `400`: invalid JSON, missing guest token, missing questionId, missing answer, invalid elapsedMs
- `404`: no scheduled quiz today
- `409`: question rollover

## `GET /api/admin/questions`

Auth:

- Admin session required

Code:

- `webpage/src/server/api/admin.ts`

Success response:

```json
{
  "questions": [
    {
      "id": "quiz_web_ab12cd",
      "questionId": "quiz_web_ab12cd",
      "source": "v2",
      "type": "mcq",
      "prompt": "What does CSS stand for?",
      "choices": ["...", "..."],
      "correctIndex": 1,
      "difficulty": 1,
      "tags": ["web", "css"],
      "basePoints": 100
    }
  ]
}
```

Status codes:

- `200`
- `401`: unauthorized
- `403`: forbidden

## `POST /api/admin/questions`

Auth:

- Admin session required

Request JSON:

MCQ example:

```json
{
  "type": "mcq",
  "prompt": "What does CSS stand for?",
  "explanation": "Cascading Style Sheets",
  "difficulty": 1,
  "basePoints": 100,
  "tags": ["web", "css"],
  "choices": ["Creative Style Syntax", "Cascading Style Sheets", "Computer Style System", "Color Sheet Syntax"],
  "correctIndex": 1
}
```

Select-all example:

```json
{
  "type": "select-all",
  "prompt": "Which are valid HTTP verbs?",
  "explanation": "",
  "difficulty": 2,
  "basePoints": 150,
  "tags": ["web", "internet"],
  "choices": ["GET", "POST", "FETCH", "DELETE", "PATCH"],
  "correctIndices": [0, 1, 3, 4]
}
```

Success response:

```json
{
  "question": {
    "id": "quiz_web_ab12cd",
    "questionId": "quiz_web_ab12cd",
    "source": "v2",
    "type": "mcq",
    "prompt": "What does CSS stand for?",
    "choices": ["...", "..."],
    "correctIndex": 1,
    "difficulty": 1,
    "tags": ["web", "css"],
    "basePoints": 100
  }
}
```

Status codes:

- `200`
- `400`: validation error or invalid JSON
- `401`: unauthorized
- `403`: forbidden

## `PUT /api/admin/questions/:id`

Auth:

- Admin session required

Request JSON:

- Same shape as `POST /api/admin/questions`

Success response:

```json
{
  "question": {
    "id": "quiz_web_ab12cd",
    "questionId": "quiz_web_ab12cd",
    "source": "v2",
    "type": "mcq",
    "prompt": "Updated prompt",
    "choices": ["...", "..."],
    "correctIndex": 1,
    "difficulty": 1,
    "tags": ["web", "css"],
    "basePoints": 100
  }
}
```

Common errors:

```json
{ "error": "not_found" }
```

```json
{ "error": "legacy_read_only" }
```

Status codes:

- `200`
- `400`: validation error or invalid JSON
- `404`: not found
- `409`: legacy question is read-only
- `401`: unauthorized
- `403`: forbidden

## `DELETE /api/admin/questions/:id`

Auth:

- Admin session required

Success response:

```json
{ "success": true }
```

Common errors:

```json
{ "error": "not_found" }
```

```json
{ "error": "legacy_read_only" }
```

Status codes:

- `200`
- `404`: not found
- `409`: legacy question is read-only
- `500`: delete failure
- `401`: unauthorized
- `403`: forbidden

## `GET /api/admin/schedule`

Auth:

- Admin session required

Success response:

```json
{
  "schedule": [
    {
      "date": "2026-03-01",
      "questionId": "quiz_web_ab12cd"
    }
  ]
}
```

Status codes:

- `200`
- `401`: unauthorized
- `403`: forbidden

## `POST /api/admin/schedule`

Auth:

- Admin session required

Request JSON:

```json
{
  "date": "2026-03-01",
  "questionId": "quiz_web_ab12cd"
}
```

Success response:

```json
{
  "success": true,
  "questionId": "quiz_web_ab12cd"
}
```

Duplicate scheduling response:

```json
{
  "code": "QUESTION_ALREADY_SCHEDULED",
  "message": "Question quiz_web_ab12cd is already scheduled on 2026-03-03.",
  "existingDates": ["2026-03-03"]
}
```

Common errors:

```json
{ "error": "invalid_date" }
```

```json
{ "error": "date_in_past" }
```

```json
{ "error": "invalid_question" }
```

```json
{ "error": "invalid_question_id" }
```

Status codes:

- `200`
- `400`: validation error
- `409`: `QUESTION_ALREADY_SCHEDULED`
- `500`: save failure
- `401`: unauthorized
- `403`: forbidden

## `DELETE /api/admin/schedule/:dateKey`

Auth:

- Admin session required

Success response:

```json
{ "success": true }
```

Common errors:

```json
{ "error": "invalid_date" }
```

```json
{ "error": "delete_failed" }
```

Status codes:

- `200`
- `400`: invalid date key
- `500`: delete failure
- `401`: unauthorized
- `403`: forbidden

## `GET /api/leaderboard?limit=50`

Auth:

- Optional

Important note:

- This route is still JSON-backed on this branch
- It reads `webpage/data/progress.json` and `webpage/data/users.json`
- It does not read Firestore player quiz totals yet

Code:

- `webpage/src/server/api/leaderboard.ts`

Success response:

```json
{
  "entries": [
    {
      "rank": 1,
      "username": "student_01",
      "longestStreak": 5,
      "currentStreak": 3,
      "totalPoints": 450
    }
  ]
}
```

Status codes:

- `200`
- `405`: method not allowed
