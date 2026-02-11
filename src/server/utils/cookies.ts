export function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};

  return cookieHeader.split(";").reduce<Record<string, string>>((acc, part) => {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (!rawName) return acc;
    acc[rawName] = decodeURIComponent(rawValue.join("="));
    return acc;
  }, {});
}

export function buildSessionCookie(token: string, maxAgeSeconds: number): string {
  return `session=${token}; HttpOnly; Path=/; Max-Age=${maxAgeSeconds}`;
}

export function clearSessionCookie(): string {
  return "session=; HttpOnly; Path=/; Max-Age=0";
}
