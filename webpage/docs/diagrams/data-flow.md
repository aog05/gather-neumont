# Quiz Data Flow (ASCII)

```text
  Client (QuizPanel)
      |
      | POST /api/quiz/submit
      |   { questionId, answer, elapsedMs, (guestToken?) }
      v
  Server (quiz handler)
      |
      +-- load today's question (schedule + questions)
      |
      +-- check answer
      |
      +-- scoring: pointsBreakdown
      |
      +-- persist (logged-in, non-admin):
      |     data/progress.json
      |
      v
  Response
    - correct / incorrect
    - attemptNumber
    - pointsEarned (+ breakdown if correct)
    - alreadyCompleted / rollover variants
```

Legend:
- Only logged-in non-admin users persist progress to `data/progress.json`.
- Guests are tracked via `guestToken` + in-memory session state.

```text
  GET /api/leaderboard?limit=N
      |
      v
  Server ranks:
    data/progress.json + data/users.json
      |
      v
  { entries: [ { rank, username, longestStreak, currentStreak, totalPoints } ] }
```

Legend:
- Leaderboard is derived from progress records and user records.
- Client may optionally show a demo dataset in the UI for demos.

