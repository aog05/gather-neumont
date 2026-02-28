import { ensureDataDir, getDataPath, readJsonFile, writeJsonFile } from "./store";

const PROGRESS_FILE = "progress.json";
const PROGRESS_FILE_VERSION = 1;

export interface CompletionRecord {
  date: string;
  questionId: string;
  attemptsUsed: number;
  pointsEarned: number;
  completedAt: string;
  elapsedMs: number;
}

export interface ProgressRecord {
  userId: string;
  currentStreak: number;
  longestStreak: number;
  totalPoints: number;
  lastCorrectDate: string | null;
  lastCompletion: CompletionRecord | null;
}

interface ProgressFile {
  version: number;
  progress: ProgressRecord[];
}

const PROGRESS_PATH = getDataPath(PROGRESS_FILE);

async function ensureProgressFile(): Promise<ProgressFile> {
  await ensureDataDir();
  const existing = await readJsonFile<ProgressFile>(PROGRESS_PATH);
  if (existing && Array.isArray(existing.progress)) {
    return existing;
  }

  const initial: ProgressFile = {
    version: PROGRESS_FILE_VERSION,
    progress: [],
  };
  await writeJsonFile(PROGRESS_PATH, initial);
  return initial;
}

function createEmptyProgress(userId: string): ProgressRecord {
  return {
    userId,
    currentStreak: 0,
    longestStreak: 0,
    totalPoints: 0,
    lastCorrectDate: null,
    lastCompletion: null,
  };
}

export async function getProgressByUserId(
  userId: string
): Promise<ProgressRecord | undefined> {
  const data = await ensureProgressFile();
  return data.progress.find((record) => record.userId === userId);
}

export async function getAllProgress(): Promise<ProgressRecord[]> {
  const data = await ensureProgressFile();
  return data.progress ?? [];
}

export async function getOrCreateProgress(
  userId: string
): Promise<ProgressRecord> {
  const data = await ensureProgressFile();
  const existing = data.progress.find((record) => record.userId === userId);
  if (existing) {
    return existing;
  }

  const created = createEmptyProgress(userId);
  data.progress.push(created);
  await writeJsonFile(PROGRESS_PATH, data);
  return created;
}

export async function saveProgress(
  updated: ProgressRecord
): Promise<ProgressRecord | null> {
  const data = await ensureProgressFile();
  const index = data.progress.findIndex(
    (record) => record.userId === updated.userId
  );
  if (index >= 0) {
    data.progress[index] = updated;
  } else {
    data.progress.push(updated);
  }

  const saved = await writeJsonFile(PROGRESS_PATH, data);
  return saved ? updated : null;
}
