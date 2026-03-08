import {
  collection,
  doc,
  getDocs,
  increment,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import type { ForumBan, ForumReport, ForumReportReason } from "../types/forum.types";

const MAX_LENGTH = 800;
const COOLDOWN_MS = 1000;
const lastSentAt: Record<string, number> = {};

function randomToken(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().replaceAll("-", "");
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}

export function createChatMessageId(userId: string): string {
  const safeUserId = userId.replaceAll("/", "_").slice(0, 48) || "user";
  return `${safeUserId}_${Date.now().toString(36)}_${randomToken()}`;
}

export async function sendChatMessageDirect(
  text: string,
  user: { userId: string; username: string; isAdmin: boolean },
  clientMessageId?: string
): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Message cannot be empty");
  if (trimmed.length > MAX_LENGTH) throw new Error(`Message too long (max ${MAX_LENGTH} chars)`);

  const now = Date.now();
  const last = lastSentAt[user.userId] ?? 0;
  if (now - last < COOLDOWN_MS) throw new Error("Please wait before sending another message");
  lastSentAt[user.userId] = now;

  const messageId = clientMessageId ?? createChatMessageId(user.userId);
  const messageRef = doc(db, "chat", "global", "messages", messageId);

  await runTransaction(db, async (tx) => {
    const existing = await tx.get(messageRef);
    if (existing.exists()) return; // idempotent retry for the same client message id

    tx.set(messageRef, {
      text: trimmed,
      authorUserId: user.userId,
      authorUsername: user.username,
      authorIsAdmin: user.isAdmin,
      createdAt: serverTimestamp(),
      status: "active",
      reportCount: 0,
      hasOpenReports: false,
      lastReportedAt: null,
    });
  });

  return messageId;
}

export async function reportChatMessageDirect(
  messageId: string,
  reason: ForumReportReason,
  details: string,
  reporter: { userId: string; username: string }
): Promise<void> {
  const reportRef = doc(db, "chat", "global", "messages", messageId, "reports", reporter.userId);
  const messageRef = doc(db, "chat", "global", "messages", messageId);

  await runTransaction(db, async (tx) => {
    const existing = await tx.get(reportRef);
    if (existing.exists()) return; // already reported by this user

    tx.set(reportRef, {
      reporterUserId: reporter.userId,
      reporterUsername: reporter.username,
      reason,
      details: details.trim(),
      createdAt: serverTimestamp(),
      status: "open",
    });

    tx.update(messageRef, {
      hasOpenReports: true,
      reportCount: increment(1),
      lastReportedAt: serverTimestamp(),
    });
  });
}

export async function pinChatMessageDirect(
  messageId: string,
  pinner: { userId: string; username: string }
): Promise<void> {
  await setDoc(doc(db, "chat", "global", "meta", "pinned"), {
    messageId,
    pinnedAt: serverTimestamp(),
    pinnedByUserId: pinner.userId,
    pinnedByUsername: pinner.username,
  });
}

export async function unpinChatMessageDirect(
  pinner: { userId: string; username: string }
): Promise<void> {
  await setDoc(doc(db, "chat", "global", "meta", "pinned"), {
    messageId: null,
    pinnedAt: serverTimestamp(),
    pinnedByUserId: pinner.userId,
    pinnedByUsername: pinner.username,
  });
}

export async function quarantineChatMessageDirect(
  messageId: string,
  reason: string,
  moderator: { userId: string }
): Promise<void> {
  await updateDoc(doc(db, "chat", "global", "messages", messageId), {
    status: "quarantined",
    quarantinedAt: serverTimestamp(),
    quarantinedByUserId: moderator.userId,
    moderationReason: reason,
  });
}

export async function unquarantineChatMessageDirect(messageId: string): Promise<void> {
  await updateDoc(doc(db, "chat", "global", "messages", messageId), {
    status: "active",
    quarantinedAt: null,
    quarantinedByUserId: null,
    moderationReason: null,
  });
}

export async function softDeleteChatMessageDirect(
  messageId: string,
  moderator: { userId: string }
): Promise<void> {
  // Do not overwrite text on delete
  await updateDoc(doc(db, "chat", "global", "messages", messageId), {
    status: "deleted",
    deletedAt: serverTimestamp(),
    deletedByUserId: moderator.userId,
  });
}

export async function clearChatReportsDirect(
  messageId: string,
  moderator: { userId: string; username: string }
): Promise<void> {
  const messageRef = doc(db, "chat", "global", "messages", messageId);
  const reportsRef = collection(db, "chat", "global", "messages", messageId, "reports");
  const openReportsQuery = query(reportsRef, where("status", "==", "open"));
  const openSnapshot = await getDocs(openReportsQuery);

  const BATCH_MAX_WRITES = 450;
  for (let start = 0; start < openSnapshot.docs.length; start += BATCH_MAX_WRITES) {
    const batch = writeBatch(db);
    const chunk = openSnapshot.docs.slice(start, start + BATCH_MAX_WRITES);
    for (const reportDoc of chunk) {
      batch.update(reportDoc.ref, {
        status: "cleared",
        clearedAt: serverTimestamp(),
        clearedByUserId: moderator.userId,
        clearedByUsername: moderator.username,
      });
    }
    await batch.commit();
  }

  // Reconcile parent counters from current remaining open reports.
  // This captures new reports created while the clear operation was in flight.
  const remainingOpenSnapshot = await getDocs(openReportsQuery);
  const remainingCount = remainingOpenSnapshot.size;
  let latestOpenAt: Timestamp | null = null;
  for (const reportDoc of remainingOpenSnapshot.docs) {
    const createdAt = asTimestamp(reportDoc.data().createdAt);
    if (!createdAt) continue;
    if (!latestOpenAt || createdAt.toMillis() > latestOpenAt.toMillis()) {
      latestOpenAt = createdAt;
    }
  }

  await updateDoc(messageRef, {
    hasOpenReports: remainingCount > 0,
    reportCount: remainingCount,
    lastReportedAt: latestOpenAt ?? null,
  });
}

function asTimestamp(v: unknown): Timestamp | null {
  if (v && typeof (v as { toDate?: unknown }).toDate === "function") {
    try {
      // Validate unresolved sentinel values do not pass through.
      (v as { toDate: () => Date }).toDate();
      return v as Timestamp;
    } catch {
      return null;
    }
  }
  return null;
}

function tsToIso(v: unknown): string | null {
  if (v && typeof (v as { toDate?: unknown }).toDate === "function") {
    return (v as { toDate: () => Date }).toDate().toISOString();
  }
  if (typeof v === "string") return v;
  return null;
}

export async function getMessageReportsDirect(messageId: string): Promise<ForumReport[]> {
  const snapshot = await getDocs(
    collection(db, "chat", "global", "messages", messageId, "reports")
  );
  return snapshot.docs.map((d) => {
    const data = d.data() as Record<string, unknown>;
    return {
      reporterUserId: typeof data.reporterUserId === "string" ? data.reporterUserId : d.id,
      reporterUsername: typeof data.reporterUsername === "string" ? data.reporterUsername : "unknown",
      reason: (data.reason as ForumReportReason) ?? "other",
      details: typeof data.details === "string" ? data.details : "",
      createdAt: tsToIso(data.createdAt),
      status: (data.status as "open" | "cleared") ?? "open",
      clearedAt: tsToIso(data.clearedAt),
      clearedByUserId: typeof data.clearedByUserId === "string" ? data.clearedByUserId : null,
      clearedByUsername: typeof data.clearedByUsername === "string" ? data.clearedByUsername : null,
    };
  });
}

export async function getChatBansDirect(activeOnly = true): Promise<ForumBan[]> {
  const bansRef = collection(db, "chat", "global", "bans");
  const q = activeOnly ? query(bansRef, where("active", "==", true)) : query(bansRef);
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => {
    const data = d.data() as Record<string, unknown>;
    return {
      userId: d.id,
      active: Boolean(data.active),
      reason: typeof data.reason === "string" ? data.reason : "",
      createdAt: tsToIso(data.createdAt),
      createdByUserId: typeof data.createdByUserId === "string" ? data.createdByUserId : null,
      createdByUsername: typeof data.createdByUsername === "string" ? data.createdByUsername : null,
      expiresAt: tsToIso(data.expiresAt),
      liftedAt: tsToIso(data.liftedAt),
      liftedByUserId: typeof data.liftedByUserId === "string" ? data.liftedByUserId : null,
      liftedByUsername: typeof data.liftedByUsername === "string" ? data.liftedByUsername : null,
    };
  });
}

export async function createChatBanDirect(input: {
  userId: string;
  reason: string;
  expiresAt?: string | null;
  createdBy: { userId: string; username: string };
}): Promise<void> {
  await setDoc(doc(db, "chat", "global", "bans", input.userId), {
    active: true,
    reason: input.reason,
    createdAt: serverTimestamp(),
    createdByUserId: input.createdBy.userId,
    createdByUsername: input.createdBy.username,
    expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    liftedAt: null,
    liftedByUserId: null,
    liftedByUsername: null,
  });
}

export async function removeChatBanDirect(
  targetUserId: string,
  liftedBy: { userId: string; username: string }
): Promise<void> {
  await updateDoc(doc(db, "chat", "global", "bans", targetUserId), {
    active: false,
    liftedAt: serverTimestamp(),
    liftedByUserId: liftedBy.userId,
    liftedByUsername: liftedBy.username,
  });
}
