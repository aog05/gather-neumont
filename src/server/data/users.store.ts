import { ensureDataDir, getDataPath, readJsonFile, writeJsonFile } from "./store";

const USERS_FILE = "users.json";
const USERS_FILE_VERSION = 1;

export interface UserRecord {
  id: string;
  username: string;
  isAdmin?: boolean;
  createdAt: string;
}

interface UsersFile {
  version: number;
  users: UserRecord[];
}

const USERS_PATH = getDataPath(USERS_FILE);

async function ensureUsersFile(): Promise<UsersFile> {
  await ensureDataDir();
  const existing = await readJsonFile<UsersFile>(USERS_PATH);
  if (existing && Array.isArray(existing.users)) {
    return existing;
  }

  const initial: UsersFile = { version: USERS_FILE_VERSION, users: [] };
  await writeJsonFile(USERS_PATH, initial);
  return initial;
}

export async function getUserByUsername(
  username: string
): Promise<UserRecord | undefined> {
  const data = await ensureUsersFile();
  const target = username.toLowerCase();
  return data.users.find((user) => user.username.toLowerCase() === target);
}

export async function getUserById(id: string): Promise<UserRecord | undefined> {
  const data = await ensureUsersFile();
  return data.users.find((user) => user.id === id);
}

export async function getAllUsers(): Promise<UserRecord[]> {
  const data = await ensureUsersFile();
  return data.users ?? [];
}

export async function createUser(username: string): Promise<UserRecord | null> {
  const data = await ensureUsersFile();
  const target = username.toLowerCase();
  const existing = data.users.find(
    (user) => user.username.toLowerCase() === target
  );
  if (existing) {
    return existing;
  }
  const user: UserRecord = {
    id: crypto.randomUUID(),
    username,
    isAdmin: username.toLowerCase() === "admin",
    createdAt: new Date().toISOString(),
  };
  data.users.push(user);
  const saved = await writeJsonFile(USERS_PATH, data);
  return saved ? user : null;
}

export async function ensureAdminFlag(user: UserRecord): Promise<UserRecord> {
  if (user.isAdmin || user.username.toLowerCase() !== "admin") {
    return user;
  }

  const data = await ensureUsersFile();
  const target = data.users.find((entry) => entry.id === user.id);
  if (!target) {
    return user;
  }

  target.isAdmin = true;
  await writeJsonFile(USERS_PATH, data);
  return target;
}
