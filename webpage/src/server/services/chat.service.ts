import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminFirestore, isAdminSdkAvailable } from "./firebase-admin";

let chatUnavailableWarnedOnce = false;

function requireAdminSdk(): void {
  if (!isAdminSdkAvailable()) {
    if (!chatUnavailableWarnedOnce) {
      chatUnavailableWarnedOnce = true;
      console.warn(
        "[chat] FIREBASE_SERVICE_ACCOUNT_JSON is not set — " +
        "chat write endpoints will return 503 chat_unavailable. " +
        "The rest of the app is unaffected.",
      );
    }
    throw new ChatServiceError(
      503,
      "chat_unavailable",
      "Chat service is not configured on this server.",
    );
  }
}

const MESSAGE_MAX_LENGTH = 800;
const SEND_COOLDOWN_MS = 1000;

const VALID_REPORT_REASONS = new Set(["spam", "abuse", "harassment", "other"]);

const MESSAGES_COLLECTION_PATH = "chat/global/messages";
const PINNED_DOC_PATH = "chat/global/meta/pinned";
const BANS_COLLECTION_PATH = "chat/global/bans";

const lastSendByUser = new Map<string, number>();

export class ChatServiceError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

type Actor = {
  userId: string;
  username: string;
  isAdmin: boolean;
};

function normalizeText(text: string): string {
  return text.replace(/\r\n/g, "\n").trim();
}

function toIso(value: unknown): string | null {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (value && typeof (value as any).toDate === "function") {
    return (value as any).toDate().toISOString();
  }
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }
  return null;
}

function parseExpiresAt(value: unknown): Date | null {
  if (value == null || value === "") return null;
  if (typeof value !== "string") {
    throw new ChatServiceError(400, "invalid_expires_at", "expiresAt must be an ISO string");
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new ChatServiceError(400, "invalid_expires_at", "expiresAt must be an ISO string");
  }
  return parsed;
}

function getMessageRef(messageId: string) {
  return getAdminFirestore().collection(MESSAGES_COLLECTION_PATH).doc(messageId);
}

function getBansCollection() {
  return getAdminFirestore().collection(BANS_COLLECTION_PATH);
}

async function getActiveBan(userId: string): Promise<null | { reason?: string }> {
  const snap = await getBansCollection().doc(userId).get();
  if (!snap.exists) return null;

  const data = snap.data() ?? {};
  if (!data.active) return null;

  const expiresAt = data.expiresAt;
  if (expiresAt instanceof Timestamp && expiresAt.toMillis() <= Date.now()) {
    return null;
  }

  return {
    reason: typeof data.reason === "string" ? data.reason : undefined,
  };
}

async function assertNotBanned(userId: string): Promise<void> {
  const ban = await getActiveBan(userId);
  if (!ban) return;

  throw new ChatServiceError(
    403,
    "banned",
    ban.reason ? `User is banned: ${ban.reason}` : "User is banned"
  );
}

export async function sendChatMessage(actor: Actor, rawText: string): Promise<{ messageId: string }> {
  requireAdminSdk();
  await assertNotBanned(actor.userId);

  const text = normalizeText(rawText);
  if (!text) {
    throw new ChatServiceError(400, "invalid_text", "Message text is required");
  }
  if (text.length > MESSAGE_MAX_LENGTH) {
    throw new ChatServiceError(400, "message_too_long", `Message exceeds ${MESSAGE_MAX_LENGTH} characters`);
  }

  const now = Date.now();
  const lastSentAt = lastSendByUser.get(actor.userId) ?? 0;
  if (now - lastSentAt < SEND_COOLDOWN_MS) {
    throw new ChatServiceError(429, "cooldown", "You are sending messages too quickly");
  }

  const db = getAdminFirestore();
  const docRef = db.collection(MESSAGES_COLLECTION_PATH).doc();
  await docRef.set({
    text,
    authorUserId: actor.userId,
    authorUsername: actor.username,
    authorIsAdmin: actor.isAdmin,
    createdAt: FieldValue.serverTimestamp(),
    status: "active",
    reportCount: 0,
    lastReportedAt: null,
    hasOpenReports: false,
    quarantinedAt: null,
    quarantinedByUserId: null,
    moderationReason: null,
    deletedAt: null,
    deletedByUserId: null,
    deletedReason: null,
  });

  lastSendByUser.set(actor.userId, now);
  return { messageId: docRef.id };
}

export async function reportChatMessage(
  actor: Actor,
  messageId: string,
  reason: string,
  detailsRaw: unknown
): Promise<void> {
  requireAdminSdk();
  await assertNotBanned(actor.userId);

  if (!VALID_REPORT_REASONS.has(reason)) {
    throw new ChatServiceError(400, "invalid_reason", "Invalid report reason");
  }

  const details =
    typeof detailsRaw === "string" ? detailsRaw.trim().slice(0, 2000) : "";

  const db = getAdminFirestore();
  const messageRef = getMessageRef(messageId);
  const reportRef = messageRef.collection("reports").doc(actor.userId);

  await db.runTransaction(async (tx) => {
    const messageSnap = await tx.get(messageRef);
    if (!messageSnap.exists) {
      throw new ChatServiceError(404, "message_not_found", "Message not found");
    }

    const messageData = messageSnap.data() ?? {};
    const status = typeof messageData.status === "string" ? messageData.status : "";
    if (status !== "active") {
      throw new ChatServiceError(409, "not_reportable", "Only active messages can be reported");
    }

    const reportSnap = await tx.get(reportRef);
    const previousStatus = reportSnap.exists
      ? typeof reportSnap.data()?.status === "string"
        ? (reportSnap.data()?.status as string)
        : "open"
      : null;

    const currentCount =
      typeof messageData.reportCount === "number" ? messageData.reportCount : 0;
    const shouldIncrement = !reportSnap.exists || previousStatus === "cleared";
    const nextCount = shouldIncrement ? currentCount + 1 : currentCount;

    const now = FieldValue.serverTimestamp();
    tx.set(
      reportRef,
      {
        reporterUserId: actor.userId,
        reporterUsername: actor.username,
        reason,
        details,
        createdAt: now,
        status: "open",
        clearedAt: null,
        clearedByUserId: null,
        clearedByUsername: null,
      },
      { merge: true }
    );
    tx.update(messageRef, {
      reportCount: nextCount,
      hasOpenReports: true,
      lastReportedAt: now,
    });
  });
}

export async function pinMessage(actor: Actor, messageId: string): Promise<void> {
  requireAdminSdk();
  const messageRef = getMessageRef(messageId);
  const messageSnap = await messageRef.get();
  if (!messageSnap.exists) {
    throw new ChatServiceError(404, "message_not_found", "Message not found");
  }

  await getAdminFirestore().doc(PINNED_DOC_PATH).set({
    messageId,
    pinnedAt: FieldValue.serverTimestamp(),
    pinnedByUserId: actor.userId,
    pinnedByUsername: actor.username,
  });
}

export async function unpinMessage(actor: Actor): Promise<void> {
  requireAdminSdk();
  await getAdminFirestore().doc(PINNED_DOC_PATH).set({
    messageId: null,
    pinnedAt: FieldValue.serverTimestamp(),
    pinnedByUserId: actor.userId,
    pinnedByUsername: actor.username,
  });
}

export async function quarantineMessage(
  actor: Actor,
  messageId: string,
  reason: string
): Promise<void> {
  requireAdminSdk();
  if (!reason.trim()) {
    throw new ChatServiceError(400, "invalid_reason", "quarantine reason is required");
  }

  const messageRef = getMessageRef(messageId);
  const messageSnap = await messageRef.get();
  if (!messageSnap.exists) {
    throw new ChatServiceError(404, "message_not_found", "Message not found");
  }

  await messageRef.update({
    status: "quarantined",
    quarantinedAt: FieldValue.serverTimestamp(),
    quarantinedByUserId: actor.userId,
    moderationReason: reason.trim().slice(0, 500),
  });
}

export async function unquarantineMessage(messageId: string): Promise<void> {
  requireAdminSdk();
  const messageRef = getMessageRef(messageId);
  const messageSnap = await messageRef.get();
  if (!messageSnap.exists) {
    throw new ChatServiceError(404, "message_not_found", "Message not found");
  }

  await messageRef.update({
    status: "active",
    quarantinedAt: null,
    quarantinedByUserId: null,
    moderationReason: null,
  });
}

export async function softDeleteMessage(
  actor: Actor,
  messageId: string,
  reasonRaw?: unknown
): Promise<void> {
  requireAdminSdk();
  const messageRef = getMessageRef(messageId);
  const messageSnap = await messageRef.get();
  if (!messageSnap.exists) {
    throw new ChatServiceError(404, "message_not_found", "Message not found");
  }

  const reason =
    typeof reasonRaw === "string" && reasonRaw.trim().length > 0
      ? reasonRaw.trim().slice(0, 500)
      : null;

  await messageRef.update({
    status: "deleted",
    deletedAt: FieldValue.serverTimestamp(),
    deletedByUserId: actor.userId,
    deletedReason: reason,
  });
}

export async function clearReports(actor: Actor, messageId: string): Promise<void> {
  requireAdminSdk();
  const db = getAdminFirestore();
  const messageRef = getMessageRef(messageId);
  const messageSnap = await messageRef.get();
  if (!messageSnap.exists) {
    throw new ChatServiceError(404, "message_not_found", "Message not found");
  }

  const reportsSnap = await messageRef.collection("reports").get();
  const batch = db.batch();

  batch.update(messageRef, {
    hasOpenReports: false,
    reportCount: 0,
    lastReportedAt: null,
  });

  for (const reportDoc of reportsSnap.docs) {
    batch.set(
      reportDoc.ref,
      {
        status: "cleared",
        clearedAt: FieldValue.serverTimestamp(),
        clearedByUserId: actor.userId,
        clearedByUsername: actor.username,
      },
      { merge: true }
    );
  }

  await batch.commit();
}

export async function listMessageReports(messageId: string): Promise<
  Array<{
    reporterUserId: string;
    reporterUsername: string;
    reason: string;
    details: string;
    createdAt: string | null;
    status: string;
    clearedAt: string | null;
    clearedByUserId: string | null;
    clearedByUsername: string | null;
  }>
> {
  requireAdminSdk();
  const messageRef = getMessageRef(messageId);
  const messageSnap = await messageRef.get();
  if (!messageSnap.exists) {
    throw new ChatServiceError(404, "message_not_found", "Message not found");
  }

  const reportsSnap = await messageRef.collection("reports").orderBy("createdAt", "desc").get();
  return reportsSnap.docs.map((doc) => {
    const data = doc.data() ?? {};
    return {
      reporterUserId: typeof data.reporterUserId === "string" ? data.reporterUserId : doc.id,
      reporterUsername: typeof data.reporterUsername === "string" ? data.reporterUsername : "unknown",
      reason: typeof data.reason === "string" ? data.reason : "other",
      details: typeof data.details === "string" ? data.details : "",
      createdAt: toIso(data.createdAt),
      status: typeof data.status === "string" ? data.status : "open",
      clearedAt: toIso(data.clearedAt),
      clearedByUserId:
        typeof data.clearedByUserId === "string" ? data.clearedByUserId : null,
      clearedByUsername:
        typeof data.clearedByUsername === "string" ? data.clearedByUsername : null,
    };
  });
}

export async function listActiveBans(): Promise<
  Array<{
    userId: string;
    active: boolean;
    reason: string;
    createdAt: string | null;
    createdByUserId: string | null;
    createdByUsername: string | null;
    expiresAt: string | null;
    liftedAt: string | null;
    liftedByUserId: string | null;
    liftedByUsername: string | null;
  }>
> {
  requireAdminSdk();
  const snap = await getBansCollection()
    .where("active", "==", true)
    .orderBy("createdAt", "desc")
    .get();

  return snap.docs.map((doc) => {
    const data = doc.data() ?? {};
    return {
      userId: doc.id,
      active: Boolean(data.active),
      reason: typeof data.reason === "string" ? data.reason : "",
      createdAt: toIso(data.createdAt),
      createdByUserId:
        typeof data.createdByUserId === "string" ? data.createdByUserId : null,
      createdByUsername:
        typeof data.createdByUsername === "string" ? data.createdByUsername : null,
      expiresAt: toIso(data.expiresAt),
      liftedAt: toIso(data.liftedAt),
      liftedByUserId:
        typeof data.liftedByUserId === "string" ? data.liftedByUserId : null,
      liftedByUsername:
        typeof data.liftedByUsername === "string" ? data.liftedByUsername : null,
    };
  });
}

export async function createBan(
  actor: Actor,
  userId: string,
  reasonRaw: unknown,
  expiresAtRaw: unknown
): Promise<void> {
  requireAdminSdk();
  const normalizedUserId = typeof userId === "string" ? userId.trim() : "";
  if (!normalizedUserId) {
    throw new ChatServiceError(400, "invalid_user_id", "userId is required");
  }

  const reason =
    typeof reasonRaw === "string" && reasonRaw.trim().length > 0
      ? reasonRaw.trim().slice(0, 500)
      : "Banned by moderator";

  const expiresAt = parseExpiresAt(expiresAtRaw);

  await getBansCollection().doc(normalizedUserId).set(
    {
      active: true,
      reason,
      createdAt: FieldValue.serverTimestamp(),
      createdByUserId: actor.userId,
      createdByUsername: actor.username,
      expiresAt: expiresAt ? Timestamp.fromDate(expiresAt) : null,
      liftedAt: null,
      liftedByUserId: null,
      liftedByUsername: null,
    },
    { merge: true }
  );
}

export async function liftBan(actor: Actor, userId: string): Promise<void> {
  requireAdminSdk();
  const normalizedUserId = typeof userId === "string" ? userId.trim() : "";
  if (!normalizedUserId) {
    throw new ChatServiceError(400, "invalid_user_id", "userId is required");
  }

  await getBansCollection().doc(normalizedUserId).set(
    {
      active: false,
      liftedAt: FieldValue.serverTimestamp(),
      liftedByUserId: actor.userId,
      liftedByUsername: actor.username,
    },
    { merge: true }
  );
}
