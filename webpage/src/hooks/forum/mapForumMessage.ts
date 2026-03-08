import type {
  DocumentData,
  QueryDocumentSnapshot,
  Timestamp,
} from "firebase/firestore";
import type { ForumMessage, ForumMessageStatus } from "../../types/forum.types";

function asStatus(value: unknown): ForumMessageStatus {
  return value === "quarantined" || value === "deleted" ? value : "active";
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
  };
}

export function mapForumMessage(snapshot: QueryDocumentSnapshot<DocumentData>): ForumMessage {
  return mapForumMessageData(snapshot.id, snapshot.data() as Record<string, unknown>);
}
