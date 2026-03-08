# Forum Architecture and Flow

Last updated: March 8, 2026

## End-to-end open flow
1. Player presses `E` near an interactable.
2. `MainScene` reads `JustDown(E)` once in `update()`.
3. `MainScene.dispatchEInteraction()` chooses the closest in-range interactable:
   - Forum terminal
   - Quiz terminal
   - NPC
4. If forum terminal wins, `ForumTerminal.startForum()` dispatches `forum:start`.
5. `Game.tsx` listens for `forum:start` and sets `isForumOpen=true`.
6. `ForumPanel` renders as a React overlay.

## Shared E-key interaction model
- E is centralized in `MainScene`.
- Managers only do proximity updates and `tryInteract()` calls.
- Candidate selection is distance-first, with stable index tie-break.
- This avoids destructive multi-read behavior of `Phaser.Input.Keyboard.JustDown`.

## Phaser and React input gating
`Game.tsx` disables keyboard input in Phaser when any of these are true:
- Forum overlay is open
- Quiz overlay is open
- A route-based overlay is active (`/login`, `/create-account`, `/admin`, `/onboarding`, `/account`, etc.)

This prevents movement and scene interactions while users type in overlay UI.

## Forum panel composition
`ForumPanel.tsx` coordinates:
- Feed state (`useForumChatFeed`)
- Pinned message state (`useForumPinnedMessage`)
- Admin queues (`useReportedQueue`, `useQuarantinedQueue`)
- Composer/report modal state
- Message detail modal state
- Tab switching (`chat` / `admin`)

## Feed and pagination flow
- Live feed query:
  - Collection: `chat/global/messages`
  - Filter: `status == "active"`
  - Order: `createdAt desc`, then `documentId desc`
  - Limit: 200
- Older messages load with `startAfter(cursor)`.
- UI reverses result order so oldest is at top and newest at bottom.

## Write flow (current implementation)
Forum UI uses direct Firestore write helpers from `src/lib/chatWrites.ts`:
- `sendChatMessageDirect`
- `reportChatMessageDirect`
- `pinChatMessageDirect` / `unpinChatMessageDirect`
- `quarantineChatMessageDirect` / `unquarantineChatMessageDirect`
- `softDeleteChatMessageDirect`
- `clearChatReportsDirect`
- `toggleReactionDirect`
- Ban helpers

## Admin flow
- Admin tab has subviews:
  - Reported queue
  - Quarantined queue
  - Bans
- Message details modal exposes moderation actions.
- Soft delete and clear reports use a two-click confirm pattern.

## Reactions flow
- Message row renders reaction pills from `reactions` map.
- Clicking a reaction toggles current user in `reactions.<emoji>` with atomic array operations.
- A small picker offers preset emoji reactions.

## Composer behavior
- `Enter` sends message.
- `Shift+Enter` inserts newline.
- Sends use timeout wrapping and idempotent message IDs to make retries safer.

## Pinned message flow
1. Subscribe to `chat/global/meta/pinned`.
2. Read `messageId`.
3. Subscribe to `chat/global/messages/{messageId}`.
4. Render banner only if message exists and remains `active`.

## Backend path status
Server chat endpoints still exist (`/api/chat/*`) with Admin SDK guards and moderation logic, but current forum UI path is primarily direct client Firestore writes.
