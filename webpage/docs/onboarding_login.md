# Onboarding + Login (Local Dev)

**Prerequisites**
- Bun installed (`bun --version`)

**Install**
1. `bun install`

**Run**
1. `bun dev`

**URLs**
- Campus/game: `/`
- Onboarding landing: `/onboarding`
- Login: `/login`
- Dev quiz (if present): `/dev/quiz`

**Flow Summary**
- Continue as guest:
  - Start at `/onboarding`, choose "Continue as Guest", complete steps, then return to `/`.
  - Guest profiles are stored locally (localStorage) and are not persisted to the server.
- Login with username:
  - Start at `/login`, enter a username, then complete onboarding and return to `/`.
  - Profile persistence depends on whether the server profile API is implemented and reachable:
    - If `PUT /api/profile` exists, the client will save step transitions to the server.
    - If not, the onboarding flow still works locally (localStorage).

**Troubleshooting**
- Typing moves the player / game reacts to keys while using the overlay:
  - Confirm the overlay is capturing keyboard events and that the game disables input on `/onboarding/*` and `/login`.
- Avatar preview is blank or errors:
  - See `docs/avatars.md` for DiceBear setup and lockfile recovery steps.

