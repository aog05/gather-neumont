# Daily Quiz Docs

This folder documents the Daily Quiz system as it exists on branch `restore-daily-quiz-port`.

- [overview.md](./overview.md): runtime architecture, entrypoints, UI flow, and mode overview
- [firestore-schema.md](./firestore-schema.md): Firestore collections, document shapes, and legacy support notes
- [api-contracts.md](./api-contracts.md): request/response contracts for shipped quiz, admin, and leaderboard routes
- [admin-moderation.md](./admin-moderation.md): moderator workflow for creating, testing, scheduling, and unscheduling questions
- [troubleshooting.md](./troubleshooting.md): common failure modes, expected behaviors, and code locations to inspect

Current branch notes:

- Daily quiz questions and schedule are Firestore-backed through `QUIZ_QUESTIONS` and `QUIZ_SCHEDULE`.
- New quiz authoring is v2-only, but some runtime paths still resolve legacy quiz questions through `includeLegacy`.
- `/api/leaderboard` is still JSON-backed (`webpage/data/progress.json` and `webpage/data/users.json`), not Firestore-backed.
