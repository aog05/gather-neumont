import type { MajorId } from "../../config/majors";
import { ensureDataDir, getDataPath, readJsonFile, writeJsonFile } from "./store";

const PROFILES_FILE = "profiles.json";
const PROFILES_FILE_VERSION = 1;
const PROFILES_PATH = getDataPath(PROFILES_FILE);

export type ProfileRecord = {
  displayName: string;
  email?: string;
  location: string;
  intendedMajorId: MajorId;
  avatar: { provider: "dicebear"; style: string; seed: string };
  updatedAt: string; // ISO timestamp
};

export interface ProfileStore {
  getByUsername(username: string): Promise<ProfileRecord | null>;
  upsertByUsername(username: string, profile: ProfileRecord): Promise<ProfileRecord | null>;
}

type ProfilesFile = {
  version: number;
  profiles: Record<string, ProfileRecord>;
};

function normalizeUsernameKey(username: string): string {
  return username.trim().toLowerCase();
}

async function ensureProfilesFile(): Promise<ProfilesFile> {
  await ensureDataDir();

  const existing = await readJsonFile<ProfilesFile>(PROFILES_PATH);
  if (existing && typeof existing === "object" && typeof (existing as any).profiles === "object") {
    return {
      version: typeof existing.version === "number" ? existing.version : PROFILES_FILE_VERSION,
      profiles: (existing as any).profiles ?? {},
    };
  }

  const initial: ProfilesFile = { version: PROFILES_FILE_VERSION, profiles: {} };
  await writeJsonFile(PROFILES_PATH, initial);
  return initial;
}

export class JsonProfileStore implements ProfileStore {
  async getByUsername(username: string): Promise<ProfileRecord | null> {
    const data = await ensureProfilesFile();
    const key = normalizeUsernameKey(username);
    const record = data.profiles[key];
    return record ?? null;
  }

  async upsertByUsername(username: string, profile: ProfileRecord): Promise<ProfileRecord | null> {
    const data = await ensureProfilesFile();
    const key = normalizeUsernameKey(username);

    const now = new Date().toISOString();
    const next: ProfileRecord = { ...profile, updatedAt: now };

    data.profiles[key] = next;
    const saved = await writeJsonFile(PROFILES_PATH, data);
    return saved ? next : null;
  }
}

export const profileStore: ProfileStore = new JsonProfileStore();

