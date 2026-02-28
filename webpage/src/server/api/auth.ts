import {
  createUser,
  ensureAdminFlag,
  getUserById,
  getUserByUsername,
} from "../data/users.store";
import {
  getByUsername as getProfileByUsername,
  upsertByUsername as upsertProfileByUsername,
} from "../data/profile.store";
import {
  buildSessionCookie,
  clearSessionCookie,
  parseCookies,
} from "../utils/cookies";

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

interface SessionRecord {
  userId: string;
  createdAt: Date;
}

const sessions = new Map<string, SessionRecord>();

function jsonWithCookie(
  data: unknown,
  cookie?: string,
  init?: ResponseInit
): Response {
  const headers = new Headers(init?.headers);
  if (cookie) {
    headers.set("Set-Cookie", cookie);
  }
  return Response.json(data, { ...init, headers });
}

function getSessionToken(req: Request): string | null {
  const cookies = parseCookies(req.headers.get("cookie"));
  return cookies.session ?? null;
}

function createSession(userId: string): string {
  const token = crypto.randomUUID();
  const now = new Date();
  sessions.set(token, { userId, createdAt: now });
  return token;
}

async function handleLogin(req: Request): Promise<Response> {
  let body: { username?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const username = body.username?.trim();
  if (!username || !USERNAME_REGEX.test(username)) {
    return Response.json(
      { error: "Username must be 3-20 letters, numbers, or _" },
      { status: 400 }
    );
  }

  if (username.toLowerCase() === "guest") {
    return Response.json({ error: "reserved_username" }, { status: 400 });
  }

  let user = await getUserByUsername(username);
  const created = !user;
  if (!user) {
    user = await createUser(username);
    if (!user) {
      return Response.json(
        { error: "Failed to create user" },
        { status: 500 }
      );
    }
  }

  user = await ensureAdminFlag(user);
  if (user.username.toLowerCase() === "admin") {
    upsertProfileByUsername(user.username, {
      displayName: "Admin",
      email: undefined,
      intendedMajorId: "UNDECIDED",
      avatar: { provider: "dicebear", style: "pixelArt", seed: "admin" },
    });
  }
  const token = createSession(user.id);
  return jsonWithCookie(
    { user: { id: user.id, username: user.username, isAdmin: !!user.isAdmin }, created },
    buildSessionCookie(token, SESSION_MAX_AGE_SECONDS)
  );
}

async function handleMe(req: Request): Promise<Response> {
  const token = getSessionToken(req);
  if (!token) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const session = sessions.get(token);
  if (!session) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  let user = await getUserById(session.userId);
  if (!user) {
    sessions.delete(token);
    return jsonWithCookie(
      { error: "unauthorized" },
      clearSessionCookie(),
      { status: 401 }
    );
  }

  user = await ensureAdminFlag(user);
  const profile = getProfileByUsername(user.username);
  const hasProfile = Boolean(profile);
  const profileComplete = Boolean(
    profile &&
      typeof profile.displayName === "string" &&
      profile.displayName.trim().length > 0 &&
      typeof profile.intendedMajorId === "string" &&
      profile.intendedMajorId.trim().length > 0 &&
      profile.avatar &&
      profile.avatar.provider === "dicebear" &&
      typeof profile.avatar.style === "string" &&
      profile.avatar.style.trim().length > 0 &&
      typeof profile.avatar.seed === "string" &&
      profile.avatar.seed.trim().length > 0
  );

  return jsonWithCookie(
    { user: { id: user.id, username: user.username, isAdmin: !!user.isAdmin, hasProfile, profileComplete } },
    buildSessionCookie(token, SESSION_MAX_AGE_SECONDS)
  );
}

async function handleLogout(req: Request): Promise<Response> {
  const token = getSessionToken(req);
  if (token) {
    sessions.delete(token);
  }
  return jsonWithCookie({ success: true }, clearSessionCookie());
}

async function handleExists(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const username = url.searchParams.get("username")?.trim();
  if (!username) {
    return Response.json({ error: "username required" }, { status: 400 });
  }

  const user = await getUserByUsername(username);
  return Response.json({ exists: Boolean(user) });
}

export function getUserIdFromRequest(req: Request): string | null {
  const cookies = parseCookies(req.headers.get("cookie"));
  const token = cookies.session;
  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;
  return session.userId;
}

export async function handleAuthApi(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method;

  if (method === "POST" && path === "/api/auth/login") {
    return handleLogin(req);
  }

  if (method === "GET" && path === "/api/auth/me") {
    return handleMe(req);
  }

  if (method === "GET" && path === "/api/auth/exists") {
    return handleExists(req);
  }

  if (method === "POST" && path === "/api/auth/logout") {
    return handleLogout(req);
  }

  return Response.json(
    { error: "Not found", path },
    { status: 404 }
  );
}
