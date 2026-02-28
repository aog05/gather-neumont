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
      |     Firestore:
      |       Player/{playerId}
      |       Player/{playerId}/QuizCompletions/{dateKey}
      |
      v
  Response
    - correct / incorrect
    - attemptNumber
    - pointsEarned (+ breakdown if correct)
    - alreadyCompleted / rollover variants
```

Legend:
- Only logged-in non-admin users persist completion to Firestore.
- Guests are tracked via `guestToken` + in-memory session state.

```text
  GET /api/leaderboard?limit=N
      |
      v
  Server ranks:
    Firestore Player collection
      |
      v
  { entries: [ { playerId, displayName, totalPoints, streakDays } ] }
```

Legend:
- Leaderboard is derived from Firestore player records.
- Demo leaderboard assets may exist in source but are not used by runtime API flow.

