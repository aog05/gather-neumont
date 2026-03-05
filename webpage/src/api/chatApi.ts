import type { ForumBan, ForumReport, ForumReportReason } from "../types/forum.types";

type JsonRecord = Record<string, unknown>;

export class ChatUnavailableError extends Error {
  readonly code = "chat_unavailable";
  constructor() {
    super("Chat service is not configured on this server.");
  }
}

async function parseJson(res: Response): Promise<JsonRecord> {
  try {
    return (await res.json()) as JsonRecord;
  } catch {
    return {};
  }
}

function extractError(data: JsonRecord, fallback: string): string {
  if (typeof data.message === "string" && data.message.trim()) return data.message;
  if (typeof data.error === "string" && data.error.trim()) return data.error;
  return fallback;
}

async function request(path: string, init: RequestInit): Promise<JsonRecord> {
  const res = await fetch(path, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const data = await parseJson(res);
  if (!res.ok) {
    if (res.status === 503 && data.code === "chat_unavailable") {
      throw new ChatUnavailableError();
    }
    throw new Error(extractError(data, `${init.method ?? "GET"} ${path} failed (${res.status})`));
  }
  return data;
}

export async function sendChatMessage(text: string): Promise<{ messageId: string }> {
  const data = await request("/api/chat/send", {
    method: "POST",
    body: JSON.stringify({ text }),
  });
  return { messageId: String(data.messageId ?? "") };
}

export async function reportChatMessage(
  messageId: string,
  reason: ForumReportReason,
  details: string
): Promise<void> {
  await request(`/api/chat/messages/${encodeURIComponent(messageId)}/report`, {
    method: "POST",
    body: JSON.stringify({ reason, details }),
  });
}

export async function pinChatMessage(messageId: string): Promise<void> {
  await request(`/api/chat/messages/${encodeURIComponent(messageId)}/pin`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function unpinChatMessage(): Promise<void> {
  await request("/api/chat/pin", { method: "DELETE" });
}

export async function quarantineChatMessage(messageId: string, reason: string): Promise<void> {
  await request(`/api/chat/messages/${encodeURIComponent(messageId)}/quarantine`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export async function unquarantineChatMessage(messageId: string): Promise<void> {
  await request(`/api/chat/messages/${encodeURIComponent(messageId)}/unquarantine`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function softDeleteChatMessage(messageId: string): Promise<void> {
  await request(`/api/chat/messages/${encodeURIComponent(messageId)}`, {
    method: "DELETE",
    body: JSON.stringify({}),
  });
}

export async function clearChatReports(messageId: string): Promise<void> {
  await request(`/api/chat/messages/${encodeURIComponent(messageId)}/clear-reports`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function getChatBans(active = true): Promise<ForumBan[]> {
  const data = await request(`/api/chat/bans?active=${active ? "true" : "false"}`, {
    method: "GET",
  });
  return Array.isArray(data.bans) ? (data.bans as ForumBan[]) : [];
}

export async function createChatBan(input: {
  userId: string;
  reason: string;
  expiresAt?: string | null;
}): Promise<void> {
  await request("/api/chat/bans", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function removeChatBan(userId: string): Promise<void> {
  await request(`/api/chat/bans/${encodeURIComponent(userId)}`, {
    method: "DELETE",
  });
}

export async function getMessageReports(messageId: string): Promise<ForumReport[]> {
  const data = await request(`/api/chat/messages/${encodeURIComponent(messageId)}/reports`, {
    method: "GET",
  });
  return Array.isArray(data.reports) ? (data.reports as ForumReport[]) : [];
}
