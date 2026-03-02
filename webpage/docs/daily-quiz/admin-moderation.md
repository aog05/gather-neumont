# Admin Moderation Guide

## What moderators can do

With an admin session, `QuizModal` exposes:

- question list and editor
- schedule list and assignment controls
- admin test mode for validating a question without consuming the live daily slot

Primary files:

- `webpage/src/components/quiz/QuizModal.tsx`
- `webpage/src/server/api/admin.ts`
- `webpage/src/server/services/admin-questions-firestore.service.ts`
- `webpage/src/server/services/schedule-firestore.service.ts`

## Create, edit, and delete questions

Supported question types:

- `mcq`
- `select-all`

No written-answer questions are supported in current code.

Validation rules come from `webpage/src/server/services/admin-questions-firestore.service.ts`:

- `type` must be `mcq` or `select-all`
- `prompt` must be non-empty
- `basePoints` must be numeric
- `choices` must be non-empty
- `mcq` requires a valid `correctIndex`
- `select-all` requires unique `correctIndices`
- `select-all` must include at least one incorrect option

Legacy question behavior:

- Legacy quiz questions can still appear in admin lists because list/read paths use `includeLegacy: true`
- Legacy questions are read-only
- Edit or delete on a legacy question returns `legacy_read_only`

## How to test a question before scheduling it

Recommended path:

1. Open the Daily Quiz panel as an admin.
2. Use the admin/question tools to load a question into test mode.
3. Submit answers through admin test mode.

Why this path:

- Admin test mode uses `POST /api/admin/test/submit`
- It validates scoring and answer checking without consuming the live daily quiz or altering the daily completion path

Do not rely on the practice endpoints for moderator workflow on this branch; they exist in the API but are not the shipped admin UI path.

## How to schedule a question

Route:

- `POST /api/admin/schedule`

UI:

- Schedule tab in `QuizModal`

Request payload:

```json
{
  "date": "2026-03-01",
  "questionId": "quiz_web_ab12cd"
}
```

Scheduling rules:

- `date` must be `YYYY-MM-DD`
- past dates are rejected
- the `questionId` must resolve to an existing question
- the same `questionId` cannot be scheduled on two different dates

## Duplicate schedule conflicts

Conflict response:

```json
{
  "code": "QUESTION_ALREADY_SCHEDULED",
  "message": "Question quiz_web_ab12cd is already scheduled on 2026-03-03.",
  "existingDates": ["2026-03-03"]
}
```

What to do:

1. Unschedule the existing date shown in `existingDates`, or
2. choose a different question for the new date

The UI surfaces this conflict in the schedule form and appends the returned `existingDates`.

## How to unschedule a date

Route:

- `DELETE /api/admin/schedule/:dateKey`

UI:

- Schedule tab in `QuizModal`

Expected result:

```json
{ "success": true }
```

Use this when:

- a question was assigned to the wrong day
- a duplicate schedule conflict needs to be resolved
- a scheduled question was deleted or must be replaced

## What happens when no schedule exists

If no valid `QUIZ_SCHEDULE/{dateKey}` entry exists for today:

- `GET /api/quiz/today` returns `hasQuiz: false`
- `POST /api/quiz/start` returns `NO_QUIZ_SCHEDULED_TODAY`
- the Daily Quiz idle UI shows `No scheduled daily question`
- the base points card shows `-`

## Recommended moderator workflow

Suggested weekly cadence:

1. Create or review upcoming questions in the Questions tools.
2. Use admin test mode to verify scoring and correct answers.
3. Schedule a full week of dates in advance.
4. Resolve any `QUESTION_ALREADY_SCHEDULED` conflicts immediately.
5. Re-open the quiz panel as a non-admin or guest and verify the idle screen shows today's base points before starting.

Policy notes:

- New content should be authored as v2 Firestore questions in `QUIZ_QUESTIONS`.
- Do not create written-answer questions.
- If a date should not have a quiz, leave it unscheduled; the player UI will show no quiz available for that day.
