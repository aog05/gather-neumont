export async function usernameExists(username: string): Promise<boolean> {
  const trimmed = username.trim();
  if (!trimmed) {
    throw new Error("username required");
  }

  const res = await fetch(`/api/auth/exists?username=${encodeURIComponent(trimmed)}`, {
    method: "GET",
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(`GET /api/auth/exists failed (${res.status})`);
  }

  const data = (await res.json()) as { exists?: unknown };
  return Boolean(data?.exists);
}

