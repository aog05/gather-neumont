# Data Model (DB Handoff)

The current app persists demo data in JSON files under `data/`. This doc describes a
handoff schema for a real database and maps current JSON files to that schema.

## Entities (ER-ish)

- `users`
- `profiles` (no physical address/city field)
- `quiz_questions`
- `quiz_daily_schedule`
- `quiz_completions` (final completion summary only)
- `user_quiz_stats` (optional aggregate; can be computed from completions)

Hard constraint:

- `UNIQUE(user_id, date)` on `quiz_completions`

## Mapping: JSON -> DB tables

- `data/users.json` -> `users`
- `data/profiles.json` -> `profiles`
- `data/progress.json` -> `user_quiz_stats` (and a cached view of last completion)

Note: question content and daily scheduling are also JSON-backed today (see
`data/questions.json` and `data/schedule.json`) but are not part of the required mapping list above.

## Mermaid ER diagram

```mermaid
erDiagram
  users {
    uuid id PK
    string username UNIQUE
    boolean is_admin
    datetime created_at
  }

  profiles {
    uuid user_id PK
    string display_name
    string email
    string intended_major_id
    string avatar_provider
    string avatar_style
    string avatar_seed
    datetime updated_at
  }

  quiz_questions {
    string id PK
    string type
    string prompt
    string explanation
    int difficulty
    int base_points
  }

  quiz_daily_schedule {
    date quiz_date PK
    string question_id FK
    datetime assigned_at
  }

  quiz_completions {
    uuid id PK
    uuid user_id FK
    date quiz_date
    string question_id FK
    int attempts_used
    int points_earned
    int elapsed_ms
    datetime completed_at
  }

  user_quiz_stats {
    uuid user_id PK
    int current_streak
    int longest_streak
    int total_points
    date last_correct_date
    date last_completion_date
    string last_completion_question_id
  }

  users ||--|| profiles : "has"
  users ||--o{ quiz_completions : "records"
  users ||--|| user_quiz_stats : "aggregates"
  quiz_questions ||--o{ quiz_completions : "answered"
  quiz_questions ||--o{ quiz_daily_schedule : "scheduled"
```

## ASCII box diagram

```text
  +------------------+        +-------------------+
  | users            |1     1 | profiles          |
  |------------------|--------|-------------------|
  | id (PK)          |        | user_id (PK/FK)   |
  | username (UQ)    |        | display_name      |
  | is_admin         |        | email (nullable)  |
  | created_at       |        | intended_major_id |
  +------------------+        | avatar_* fields   |
                               | updated_at        |
                               +-------------------+

  +-------------------+        +----------------------+
  | quiz_questions     |1    *  | quiz_daily_schedule  |
  |-------------------|--------|----------------------|
  | id (PK)           |        | quiz_date (PK)       |
  | type              |        | question_id (FK)     |
  | prompt            |        | assigned_at          |
  | ...               |        +----------------------+
  +-------------------+

  +-------------------+        +----------------------+
  | quiz_completions   |*    1  | users                |
  |-------------------|--------|----------------------|
  | id (PK)           |        | id (PK)              |
  | user_id (FK)      |        +----------------------+
  | quiz_date         |
  | question_id (FK)  |   UNIQUE(user_id, quiz_date)
  | attempts_used     |
  | points_earned     |
  | elapsed_ms        |
  | completed_at      |
  +-------------------+

  +-------------------+
  | user_quiz_stats    |
  |-------------------|
  | user_id (PK/FK)   |
  | current_streak    |
  | longest_streak    |
  | total_points      |
  | last_correct_date |
  | last_completion_* |
  +-------------------+
```

Legend:
- `1` and `*` indicate cardinality.
- `UQ` indicates a unique constraint.

