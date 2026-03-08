import type {
  DocumentData,
  QueryDocumentSnapshot,
  Timestamp,
} from "firebase/firestore";
import type { ForumMessage, ForumMessageStatus } from "../../types/forum.types";

function asStatus(value: unknown): ForumMessageStatus {
  return value === "quarantined" || value === "deleted" ? value : "active";
}

function asReactions(value: unknown): Record<string, string[]> {
  if (!value || typeof value !== "object") return {};
  const result: Record<string, string[]> = {};
  for (const [emoji, users] of Object.entries(value as Record<string, unknown>)) {
    if (Array.isArray(users)) {
      result[emoji] = users.filter((u): u is string => typeof u === "string");
    }
  }
  return result;
}

function asTimestamp(value: unknown): Timestamp | null {
  if (value && typeof (value as any).toDate === "function") {
    try {
      // Verify toDate() is callable without throwing (serverTimestamp sentinels
      // have toDate but throw "not available" before the server resolves them).
      (value as any).toDate();
      return value as Timestamp;
    } catch {
      return null;
    }
  }
  return null;
}

export function mapForumMessageData(
  id: string,
  data: Record<string, unknown>
): ForumMessage {
  return {
    id,
    text: typeof data.text === "string" ? data.text : "",
    authorUserId: typeof data.authorUserId === "string" ? data.authorUserId : "",
    authorUsername: typeof data.authorUsername === "string" ? data.authorUsername : "unknown",
    authorIsAdmin: Boolean(data.authorIsAdmin),
    createdAt: asTimestamp(data.createdAt),
    status: asStatus(data.status),
    reportCount: typeof data.reportCount === "number" ? data.reportCount : 0,
    lastReportedAt: asTimestamp(data.lastReportedAt),
    hasOpenReports: Boolean(data.hasOpenReports),
    quarantinedAt: asTimestamp(data.quarantinedAt),
    quarantinedByUserId:
      typeof data.quarantinedByUserId === "string" ? data.quarantinedByUserId : null,
    moderationReason:
      typeof data.moderationReason === "string" ? data.moderationReason : null,
    deletedAt: asTimestamp(data.deletedAt),
    deletedByUserId:
      typeof data.deletedByUserId === "string" ? data.deletedByUserId : null,
    deletedReason: typeof data.deletedReason === "string" ? data.deletedReason : null,
    reactions: asReactions(data.reactions),
  };
}

export function mapForumMessage(snapshot: QueryDocumentSnapshot<DocumentData>): ForumMessage {
  return mapForumMessageData(snapshot.id, snapshot.data() as Record<string, unknown>);
}
