# API Reference

All endpoints are served by the Bun server in `src/index.ts` under `/api/*`.
Most endpoints respond with JSON and use standard HTTP status codes.

Auth uses a cookie named `session` and keeps session state in memory (server restart logs everyone out).

## Auth

### POST `/api/auth/login`

- Purpose: create or resume a session for a username.
- Request body:
  - `{ "username": "string" }`
- Response (200):
  - ```json
    {
      "user": { "id": "string", "username": "string", "isAdmin": true },
      "created": true
    }
    ```
- Common errors:
  - `400` invalid username / reserved username
  - `500` failed to create user

### GET `/api/auth/me`

- Purpose: return current session user + profile completeness flags.
- Request: cookie-based (`session`).
- Response (200):
  - ```json
    {
      "user": {
        "id": "string",
        "username": "string",
        "isAdmin": false,
        "hasProfile": true,
        "profileComplete": true
      }
    }
    ```
- Common errors:
  - `401` no/invalid session (also clears cookie)

### POST `/api/auth/logout`

- Purpose: clear session server-side and clear the `session` cookie.
- Request: cookie-based.
- Response (200):
  - `{ "success": true }`

## Profile

### GET `/api/profile`

- Purpose: fetch the current user's saved profile record (or null).
- Request: cookie-based.
- Response (200):
  - `{ "profile": ProfileRecord | null }`
- Errors:
  - `401` unauthorized

`ProfileRecord` shape:

- ```json
  {
    "username": "string",
    "displayName": "string",
    "email": "string (optional)",
    "intendedMajorId": "string",
    "avatar": { "provider": "dicebear", "style": "string", "seed": "string" },
    "updatedAt": "ISO timestamp"
  }
  ```

### PUT `/api/profile`

- Purpose: upsert the current user's profile.
- Request body:
  - ```json
    {
      "displayName": "string",
      "email": "string (optional)",
      "intendedMajorId": "string",
      "avatar": { "provider": "dicebear", "style": "string", "seed": "string" }
    }
    ```
- Response (200):
  - `{ "profile": ProfileRecord }`
- Common errors:
  - `400` invalid/missing fields (displayName, intendedMajorId, avatar)
  - `401` unauthorized

Note: extra/unknown fields in the payload are ignored for backward compatibility.

## Quiz

### GET `/api/quiz/today`

- Purpose: check if a quiz exists today and whether the user already completed it.
- Response (200):
  - No quiz available:
    - ```json
      { "hasQuiz": false, "quizDate": "YYYY-MM-DD", "message": "No questions available" }
      ```
  - Quiz available:
    - ```json
      { "hasQuiz": true, "quizDate": "YYYY-MM-DD", "questionId": "string" }
      ```
  - `maybeAlreadyCompleted` (only when the server knows you already completed today):
    - ```json
      {
        "alreadyCompleted": true,
        "attemptsUsed": 2,
        "pointsEarned": 150,
        "completedAt": "ISO timestamp"
      }
      ```

### POST `/api/quiz/start`

- Purpose: start today's quiz and get the current question (without correct answers).
- Request body:
  - Guest: `{ "guestToken": "string" }`
  - Logged-in: body may be empty; session cookie identifies the user
- Response (200):
  - Already completed:
    - `{ "alreadyCompleted": true, "quizDate": "YYYY-MM-DD", "message": "..." }`
  - Started:
    - `{ "quizDate": "YYYY-MM-DD", "question": { ... } }`
- Common errors:
  - `400` invalid JSON / missing `guestToken` for guests
  - `404` no quiz available today

### POST `/api/quiz/submit`

- Purpose: submit an answer attempt for today's quiz.
- Request body:
  - Guest: `{ "guestToken": "string", "questionId": "string", "answer": any, "elapsedMs": number }`
  - Logged-in: `{ "questionId": "string", "answer": any, "elapsedMs": number }`
- Response (200) common shapes:
  - Incorrect:
    - ```json
      { "correct": false, "attemptNumber": 2, "quizDate": "YYYY-MM-DD" }
      ```
  - Correct:
    - ```json
      {
        "correct": true,
        "attemptNumber": 1,
        "pointsEarned": 250,
        "pointsBreakdown": {},
        "quizDate": "YYYY-MM-DD"
      }
      ```
  - Already completed (one completion per day):
    - `{ "alreadyCompleted": true, "quizDate": "YYYY-MM-DD", "canRetry": false, "message": "..." }`
  - Day rollover (question changed while playing):
    - ```json
      {
        "error": "Question has rolled over",
        "rollover": true,
        "quizDate": "YYYY-MM-DD",
        "newQuestion": {}
      }
      ```
- Common errors:
  - `400` invalid JSON / missing required fields
  - `404` no quiz available today

One completion per day rule:

- Guests: completion is tracked in server guest session state keyed by `guestToken` + date.
- Logged-in non-admin users: completion is tracked in `data/progress.json` as `lastCompletion.date`.
- When already completed, both `/start` and `/submit` return `alreadyCompleted: true`.

## Leaderboard

### GET `/api/leaderboard?limit=`

- Purpose: return ranked quiz progress for non-admin users.
- Query params:
  - `limit` (optional, default 50, max 200)
- Response (200):
  - ```json
    {
      "entries": [
        {
          "rank": 1,
          "username": "string",
          "longestStreak": 7,
          "currentStreak": 3,
          "totalPoints": 1200
        }
      ]
    }
    ```
- Errors:
  - `405` method not allowed (only GET)
