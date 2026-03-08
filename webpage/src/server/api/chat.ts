import { requireAdminUser, requireSessionUser } from "./auth-guards";
import {
  ChatServiceError,
  clearReports,
  createBan,
  liftBan,
  listActiveBans,
  listMessageReports,
  pinMessage,
  quarantineMessage,
  reportChatMessage,
  sendChatMessage,
  softDeleteMessage,
  unpinMessage,
  unquarantineMessage,
} from "../services/chat.service";

type JsonBody = Record<string, unknown>;

function jsonError(
  status: number,
  code: string,
  message: string,
  extra?: Record<string, unknown>
): Response {
  return Response.json(
    {
      code,
      message,
      ...(extra ?? {}),
    },
    { status }
  );
}

function asMessageId(path: string, action: string): string | null {
  const match = new RegExp(`^/api/chat/messages/([^/]+)/${action}$`).exec(path);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

function asMessageIdDelete(path: string): string | null {
  const match = /^\/api\/chat\/messages\/([^/]+)$/.exec(path);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

async function parseJsonBody(req: Request): Promise<JsonBody> {
  try {
    return (await req.json()) as JsonBody;
  } catch {
    throw new ChatServiceError(400, "invalid_json", "Invalid JSON body");
  }
}

export async function handleChatApi(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method;

  try {
    if (method === "POST" && path === "/api/chat/send") {
      const user = await requireSessionUser(req);
      if (user instanceof Response) return user;

      const body = await parseJsonBody(req);
      const text = typeof body.text === "string" ? body.text : "";
      const result = await sendChatMessage(user, text);
      return Response.json({ success: true, ...result });
    }

    {
      const messageId = asMessageId(path, "report");
      if (method === "POST" && messageId) {
        const user = await requireSessionUser(req);
        if (user instanceof Response) return user;

        const body = await parseJsonBody(req);
        const reason = typeof body.reason === "string" ? body.reason : "";
        await reportChatMessage(user, messageId, reason, body.details);
        return Response.json({ success: true });
      }
    }

    {
      const messageId = asMessageId(path, "pin");
      if (method === "POST" && messageId) {
        const user = await requireAdminUser(req);
        if (user instanceof Response) return user;
        await pinMessage(user, messageId);
        return Response.json({ success: true });
      }
    }

    if (method === "DELETE" && path === "/api/chat/pin") {
      const user = await requireAdminUser(req);
      if (user instanceof Response) return user;
      await unpinMessage(user);
      return Response.json({ success: true });
    }

    {
      const messageId = asMessageId(path, "quarantine");
      if (method === "POST" && messageId) {
        const user = await requireAdminUser(req);
        if (user instanceof Response) return user;

        const body = await parseJsonBody(req);
        const reason = typeof body.reason === "string" ? body.reason : "";
        await quarantineMessage(user, messageId, reason);
        return Response.json({ success: true });
      }
    }

    {
      const messageId = asMessageId(path, "unquarantine");
      if (method === "POST" && messageId) {
        const user = await requireAdminUser(req);
        if (user instanceof Response) return user;
        await unquarantineMessage(messageId);
        return Response.json({ success: true });
      }
    }

    {
      const messageId = asMessageIdDelete(path);
      if (method === "DELETE" && messageId) {
        const user = await requireAdminUser(req);
        if (user instanceof Response) return user;
        const body = await parseJsonBody(req).catch(() => ({} as JsonBody));
        await softDeleteMessage(user, messageId, body.reason);
        return Response.json({ success: true });
      }
    }

    {
      const messageId = asMessageId(path, "clear-reports");
      if (method === "POST" && messageId) {
        const user = await requireAdminUser(req);
        if (user instanceof Response) return user;
        await clearReports(user, messageId);
        return Response.json({ success: true });
      }
    }

    {
      const messageId = asMessageId(path, "reports");
      if (method === "GET" && messageId) {
        const user = await requireAdminUser(req);
        if (user instanceof Response) return user;
        const reports = await listMessageReports(messageId);
        return Response.json({ reports });
      }
    }

    if (method === "GET" && path === "/api/chat/bans") {
      const user = await requireAdminUser(req);
      if (user instanceof Response) return user;

      const activeParam = url.searchParams.get("active");
      if (activeParam && activeParam !== "true") {
        return jsonError(400, "invalid_active", "active must be true when provided");
      }

      const bans = await listActiveBans();
      return Response.json({ bans });
    }

    if (method === "POST" && path === "/api/chat/bans") {
      const user = await requireAdminUser(req);
      if (user instanceof Response) return user;
      const body = await parseJsonBody(req);

      const userId = typeof body.userId === "string" ? body.userId : "";
      await createBan(user, userId, body.reason, body.expiresAt);
      return Response.json({ success: true });
    }

    {
      const match = /^\/api\/chat\/bans\/([^/]+)$/.exec(path);
      if (method === "DELETE" && match) {
        const user = await requireAdminUser(req);
        if (user instanceof Response) return user;
        const userId = decodeURIComponent(match[1]);
        await liftBan(user, userId);
        return Response.json({ success: true });
      }
    }

    return jsonError(404, "not_found", "Not found", { path });
  } catch (error) {
    if (error instanceof ChatServiceError) {
      return jsonError(error.status, error.code, error.message);
    }
    console.error("[chat] unexpected error", error);
    return jsonError(500, "internal_error", "Internal server error");
  }
}
