export type ProfileRecord = {
  username: string;
  displayName: string;
  email?: string;
  intendedMajorId: string;
  avatar: { provider: "dicebear"; style: string; seed: string };
  updatedAt: string;
};

export type PutProfilePayload = {
  displayName: string;
  email?: string;
  intendedMajorId: string;
  avatar: { provider: "dicebear"; style: string; seed: string };
};

export async function getProfile(): Promise<ProfileRecord | null> {
  const res = await fetch("/api/profile", { method: "GET", credentials: "include" });
  if (res.status === 401) return null;
  if (!res.ok) {
    throw new Error(`GET /api/profile failed (${res.status})`);
  }

  const data = (await res.json()) as { profile?: ProfileRecord | null };
  return data?.profile ?? null;
}

export async function putProfile(payload: PutProfilePayload): Promise<ProfileRecord> {
  const res = await fetch("/api/profile", {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      displayName: payload.displayName,
      email: payload.email,
      intendedMajorId: payload.intendedMajorId,
      avatar: payload.avatar,
    }),
  });

  if (res.status === 401) {
    throw new Error("unauthorized");
  }
  if (!res.ok) {
    let msg = `PUT /api/profile failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.error) msg = String(data.error);
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  const data = (await res.json()) as { profile: ProfileRecord };
  return data.profile;
}
