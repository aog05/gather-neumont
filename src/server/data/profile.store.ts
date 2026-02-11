import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import type { ProfileRecord, ProfileUpsertInput } from "../types/profile";

type StoredProfileValue = Omit<ProfileRecord, "username">;
type StoredProfilesMap = Record<string, StoredProfileValue>;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

function profilesFilePath(): string {
  return resolve(process.cwd(), "data", "profiles.json");
}

function ensureProfilesFileExists(filepath: string): void {
  if (existsSync(filepath)) return;
  mkdirSync(dirname(filepath), { recursive: true });
  writeFileSync(filepath, "{}", "utf8");
}

function readProfilesMap(): StoredProfilesMap {
  const filepath = profilesFilePath();
  ensureProfilesFileExists(filepath);

  try {
    const text = readFileSync(filepath, "utf8");
    const parsed = JSON.parse(text) as unknown;

    // Accept both:
    // - canonical format: { "<username>": { ...without username... } }
    // - legacy format (earlier iteration): { version: 1, profiles: { ... } }
    if (isPlainObject(parsed) && isPlainObject((parsed as any).profiles)) {
      const legacy = (parsed as any).profiles as unknown;
      return isPlainObject(legacy) ? (legacy as StoredProfilesMap) : {};
    }

    return isPlainObject(parsed) ? (parsed as StoredProfilesMap) : {};
  } catch {
    // Invalid JSON or unreadable file: fall back to empty object (do not crash the server).
    return {};
  }
}

function writeProfilesMap(map: StoredProfilesMap): void {
  const filepath = profilesFilePath();
  ensureProfilesFileExists(filepath);

  try {
    const content = JSON.stringify(map, null, 2) + "\n";
    writeFileSync(filepath, content, "utf8");
  } catch (error) {
    console.error("Failed to write profiles store:", error);
  }
}

function parseStoredRecord(usernameKey: string, value: unknown): ProfileRecord | null {
  if (!isPlainObject(value)) return null;

  const displayName = (value as any).displayName;
  const email = (value as any).email;
  const intendedMajorId = (value as any).intendedMajorId;
  const avatar = (value as any).avatar;
  const updatedAt = (value as any).updatedAt;

  if (typeof displayName !== "string") return null;
  if (typeof intendedMajorId !== "string") return null;
  if (!isPlainObject(avatar)) return null;
  if ((avatar as any).provider !== "dicebear") return null;
  if (typeof (avatar as any).style !== "string") return null;
  if (typeof (avatar as any).seed !== "string") return null;
  if (typeof updatedAt !== "string") return null;

  const record: ProfileRecord = {
    username: usernameKey,
    displayName,
    intendedMajorId,
    avatar: {
      provider: "dicebear",
      style: String((avatar as any).style),
      seed: String((avatar as any).seed),
    },
    updatedAt,
  };

  if (typeof email === "string" && email.trim().length > 0) {
    record.email = email;
  }

  return record;
}

export function getByUsername(username: string): ProfileRecord | null {
  const key = normalizeUsername(username);
  if (!key) return null;

  const map = readProfilesMap();
  const raw = map[key];
  if (!raw) return null;

  return parseStoredRecord(key, raw);
}

export function upsertByUsername(username: string, profile: ProfileUpsertInput): ProfileRecord {
  const key = normalizeUsername(username);
  const now = new Date().toISOString();

  const record: ProfileRecord = {
    username: key,
    displayName: profile.displayName,
    email: profile.email,
    intendedMajorId: profile.intendedMajorId,
    avatar: {
      provider: "dicebear",
      style: profile.avatar.style,
      seed: profile.avatar.seed,
    },
    updatedAt: now,
  };

  const map = readProfilesMap();
  map[key] = {
    displayName: record.displayName,
    email: record.email,
    intendedMajorId: record.intendedMajorId,
    avatar: record.avatar,
    updatedAt: record.updatedAt,
  };
  writeProfilesMap(map);

  return record;
}
