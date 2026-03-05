import { getUserById } from "../data/users.store";
import { getSessionUserFromRequest, type SessionUser } from "./auth";

function unauthorized(): Response {
  return Response.json({ error: "unauthorized" }, { status: 401 });
}

function forbidden(): Response {
  return Response.json({ error: "forbidden" }, { status: 403 });
}

export async function requireSessionUser(
  req: Request
): Promise<SessionUser | Response> {
  const sessionUser = getSessionUserFromRequest(req);
  if (!sessionUser) {
    return unauthorized();
  }

  const user = await getUserById(sessionUser.userId);
  if (!user) {
    return unauthorized();
  }

  return {
    userId: user.id,
    username: user.username,
    isAdmin: Boolean(user.isAdmin),
  };
}

export async function requireAdminUser(
  req: Request
): Promise<SessionUser | Response> {
  const sessionUser = await requireSessionUser(req);
  if (sessionUser instanceof Response) {
    return sessionUser;
  }

  if (!sessionUser.isAdmin) {
    return forbidden();
  }

  return sessionUser;
}
