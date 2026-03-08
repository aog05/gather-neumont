# Forum Firestore Data Model

Last updated: March 8, 2026

## Core paths

### `chat/global/messages/{messageId}`
Purpose:
- Stores chat messages and moderation state.

Key fields:
- `text: string`
- `authorUserId: string`
- `authorUsername: string`
- `authorIsAdmin: boolean`
- `createdAt: Timestamp`
- `status: "active" | "quarantined" | "deleted"`
- `reportCount: number`
- `hasOpenReports: boolean`
- `lastReportedAt: Timestamp | null`
- `quarantinedAt: Timestamp | null`
- `quarantinedByUserId: string | null`
- `moderationReason: string | null`
- `deletedAt: Timestamp | null`
- `deletedByUserId: string | null`
- `deletedReason: string | null`
- `reactions: Record<string, string[]>` (optional)

Notes:
- Feed only shows `status == "active"`.
- Reactions map key is emoji, value is user ID array.

### `chat/global/messages/{messageId}/reports/{reporterUserId}`
Purpose:
- Stores one report per reporter per message.

Key fields:
- `reporterUserId: string`
- `reporterUsername: string`
- `reason: "spam" | "abuse" | "harassment" | "other"`
- `details: string`
- `createdAt: Timestamp`
- `status: "open" | "cleared"`
- `clearedAt: Timestamp | null`
- `clearedByUserId: string | null`
- `clearedByUsername: string | null`

Notes:
- Reporter user ID is used as document ID to avoid duplicate open reports from same user.

### `chat/global/meta/pinned`
Purpose:
- Stores pinned message metadata for global chat.

Key fields:
- `messageId: string | null`
- `pinnedAt: Timestamp`
- `pinnedByUserId: string`
- `pinnedByUsername: string`

### `chat/global/bans/{userId}`
Purpose:
- Stores moderation ban state.

Key fields:
- `active: boolean`
- `reason: string`
- `createdAt: Timestamp`
- `createdByUserId: string`
- `createdByUsername: string`
- `expiresAt: Timestamp | null`
- `liftedAt: Timestamp | null`
- `liftedByUserId: string | null`
- `liftedByUsername: string | null`

## Seeded demo data
`scripts/seed-chat-emulator.ts` seeds:
- A welcome message
- Additional conversation messages
- Pinned message metadata
- Example reactions

Seed script is idempotent and skips if chat messages already exist.

## Rules assumptions (local)
Current `webpage/firestore.rules` behavior:
- `chat/**`: read and write allowed
- everything else: denied

This is intentionally permissive for MVP local workflow and is not production-safe.

## Index assumptions
`webpage/firestore.indexes.json` includes indexes for:
- Active feed ordering by `createdAt` and `__name__`
- Reported queue (`hasOpenReports`, `lastReportedAt`)
- Quarantined queue (`quarantinedAt`)
- Active bans (`active`, `createdAt`)

## Security caveats
- Direct client writes rely on permissive chat rules today.
- Admin operations in UI are not enforced by Firestore rules in local mode.
- Proper role-based enforcement should move to authenticated rules and/or server-mediated writes.
