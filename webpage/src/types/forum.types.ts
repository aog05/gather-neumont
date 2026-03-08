import type { Timestamp } from "firebase/firestore";

export type ForumMessageStatus = "active" | "quarantined" | "deleted";
export type ForumReportReason = "spam" | "abuse" | "harassment" | "other";
export type ForumReportStatus = "open" | "cleared";

export interface ForumMessage {
  id: string;
  text: string;
  authorUserId: string;
  authorUsername: string;
  authorIsAdmin: boolean;
  createdAt: Timestamp | null;
  status: ForumMessageStatus;
  reportCount: number;
  lastReportedAt: Timestamp | null;
  hasOpenReports: boolean;
  quarantinedAt?: Timestamp | null;
  quarantinedByUserId?: string | null;
  moderationReason?: string | null;
  deletedAt?: Timestamp | null;
  deletedByUserId?: string | null;
  deletedReason?: string | null;
  reactions?: Record<string, string[]>;
}

export interface ForumReport {
  reporterUserId: string;
  reporterUsername: string;
  reason: ForumReportReason;
  details: string;
  createdAt: string | null;
  status: ForumReportStatus;
  clearedAt?: string | null;
  clearedByUserId?: string | null;
  clearedByUsername?: string | null;
}

export interface ForumPinnedMeta {
  messageId: string | null;
  pinnedAt?: Timestamp | null;
  pinnedByUserId?: string | null;
  pinnedByUsername?: string | null;
}

export interface ForumBan {
  userId: string;
  active: boolean;
  reason: string;
  createdAt: string | null;
  createdByUserId?: string | null;
  createdByUsername?: string | null;
  expiresAt?: string | null;
  liftedAt?: string | null;
  liftedByUserId?: string | null;
  liftedByUsername?: string | null;
}
