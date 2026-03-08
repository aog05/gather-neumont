# Forum Hardening and Technical Debt

Last updated: March 8, 2026

## Recent hardening and fixes

### Shared `E` interaction conflict fix
- Interaction handling was centralized in `MainScene`.
- Scene now reads `JustDown(E)` once and dispatches one action to closest in-range interactable.
- This prevents forum terminal interaction from consuming keypresses needed by quiz/NPC paths.

### Timeout-based recovery for forum actions
- `withTimeout` wrapper added for send/report/moderation/ban actions.
- UI can recover from slow or hanging Firestore operations without a permanent loading state.

### Send idempotency for retries
- `sendChatMessageDirect` supports caller-provided message IDs.
- Transaction checks for existing message doc to avoid duplicates during retries.

### Report transaction fix
- Reporting uses a transaction keyed by `reports/{reporterUserId}`.
- Prevents duplicate report documents from the same reporter on a message.

### Clear-reports reconciliation
- Clear operation updates report docs in batches.
- After batch clear, it re-reads open reports and recomputes parent counters to handle in-flight races.

### Emulator safety guard in seed script
- `seed-chat-emulator.ts` refuses non-local emulator hosts.
- Prevents accidental writes to non-local Firestore targets from seed command.

### UI cleanup and interaction polish
- Enter-to-send (`Shift+Enter` for newline)
- Reaction pills and picker
- Updated forum panel and modal layout behavior
- Better list scroll handling for chat-style use

### Backend hardening retained
- Server chat API still has graceful `503 chat_unavailable` behavior when Admin SDK credentials are missing.
- This keeps non-chat app behavior intact when backend chat setup is incomplete.

## Temporary decisions
- Firestore emulator workflow is a short-term workaround for missing Firebase project access/deployment control.
- Direct client Firestore writes were used for speed while server-backed deployment constraints were unresolved.
- Local rules are permissive for chat during MVP iteration.

## Technical debt to revisit after Firebase access is restored
- Consolidate write path decision:
  - Keep direct writes only if protected by robust auth/rules
  - Or route moderation-critical actions through server endpoints
- Replace permissive chat rules with authenticated role-based policy.
- Ensure production indexes and rules match emulator assumptions.
- Reconcile ban enforcement across all send paths.
- Review and trim overlapping docs as workflow stabilizes.

## Cleanup priorities
1. Finalize target write architecture (direct vs server-mediated).
2. Lock down Firestore rules and role checks.
3. Validate forum + NPC/quiz behavior against real project data.
4. Remove temporary emulator assumptions no longer needed.
