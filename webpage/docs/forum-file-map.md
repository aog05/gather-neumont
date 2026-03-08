# Forum and Emulator File Map

Last updated: March 8, 2026

This map focuses on files that matter most for forum behavior, emulator routing, and game integration.

## Game integration

### `src/scenes/MainScene.ts`
- Centralized `E` key handling.
- Computes closest in-range interactable (forum terminal, quiz terminal, NPC).
- Dispatches exactly one interaction per keypress.

### `src/entities/ForumTerminal.ts`
- Forum terminal entity and interaction prompt.
- Dispatches browser event `forum:start` when interacted.

### `src/entities/ForumTerminalManager.ts`
- Proximity updates and range checks for forum terminal.
- Exposes `nearestInRangeDistance()` and `tryInteract()`.

### `src/Game.tsx`
- Listens for `forum:start`.
- Opens/closes `ForumPanel`.
- Disables Phaser keyboard when forum/quiz/route overlays are active.

## Forum UI components

### `src/ui/forum/ForumPanel.tsx`
- Main forum shell.
- Coordinates feed hooks, pinned message, composer, report modal, admin tab, and detail modal.
- Sends chat/report actions using direct write helpers.

### `src/ui/forum/MessageRow.tsx`
- Renders message row, metadata, reaction pills, and report/details actions.

### `src/ui/forum/MessageDetailModal.tsx`
- Admin moderation actions for a message.
- Loads and displays report records.

### `src/ui/forum/AdminTab.tsx`
- Switches between reported queue, quarantined queue, and bans.

### `src/ui/forum/ReportedQueue.tsx`
- Reported queue list view.

### `src/ui/forum/QuarantinedQueue.tsx`
- Quarantined queue list view.

### `src/ui/forum/BansTab.tsx`
- Active bans view and create/lift ban actions.

### `src/ui/forum/ForumErrorBoundary.tsx`
- Catches forum render/runtime errors and provides retry/close.

### `src/ui/forum/forum-panel.css`
- Forum-specific visual layout and modal/list styling.

## Forum hooks and mapping

### `src/hooks/forum/useForumChatFeed.ts`
- Live chat feed subscription.
- Pagination and merge/de-dup logic.

### `src/hooks/forum/useForumPinnedMessage.ts`
- Pinned metadata subscription plus pinned message subscription.

### `src/hooks/forum/useReportedQueue.ts`
- Live query for active messages with open reports.

### `src/hooks/forum/useQuarantinedQueue.ts`
- Live query for quarantined messages.

### `src/hooks/forum/mapForumMessage.ts`
- Maps Firestore docs into `ForumMessage` shape, including reaction and timestamp normalization.

## Firestore write helpers and utilities

### `src/lib/chatWrites.ts`
- Direct Firestore writes for send/report/moderation/reactions/bans.
- Includes send idempotency and report clear reconciliation logic.

### `src/lib/withTimeout.ts`
- Wraps async actions with a timeout and consistent error messaging.

### `src/lib/firebase.ts`
- Firebase app and Firestore initialization.
- Firestore emulator routing behavior for local development.

## Emulator and config

### `scripts/seed-chat-emulator.ts`
- Emulator-only chat seed script.
- Host safety guard to avoid non-local writes.

### `firebase.json`
- Firestore emulator and emulator UI port config.

### `firestore.rules`
- Local security rules used by emulator.

### `firestore.indexes.json`
- Composite indexes used by forum feed/admin queries.

### `package.json`
- `emu:start` and `emu:seed` scripts.

## Server chat path (still present)

### `src/server/api/chat.ts`
- Server API routes for chat actions.

### `src/server/services/chat.service.ts`
- Firebase Admin SDK-backed chat operations and moderation logic.

### `src/server/services/firebase-admin.ts`
- Admin credential loading and initialization.

### `src/api/chatApi.ts`
- Client wrapper for `/api/chat/*` endpoints.

Note:
- Current forum UI path mainly uses `chatWrites.ts` direct Firestore writes.
