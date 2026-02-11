import { ensureDataDir, getDataPath, readJsonFile, writeJsonFile } from "./store";

const SCHEDULE_FILE = "schedule.json";
const SCHEDULE_FILE_VERSION = 1;

export interface ScheduleEntry {
  dateKey: string;
  questionId: string;
  assignedAt: string;
}

interface ScheduleFile {
  version: number;
  schedule: ScheduleEntry[];
}

const SCHEDULE_PATH = getDataPath(SCHEDULE_FILE);

async function ensureScheduleFile(): Promise<ScheduleFile> {
  await ensureDataDir();
  const existing = await readJsonFile<ScheduleFile>(SCHEDULE_PATH);
  if (existing && Array.isArray(existing.schedule)) {
    return existing;
  }

  const initial: ScheduleFile = {
    version: SCHEDULE_FILE_VERSION,
    schedule: [],
  };
  await writeJsonFile(SCHEDULE_PATH, initial);
  return initial;
}

export async function getScheduleEntries(): Promise<ScheduleEntry[]> {
  const data = await ensureScheduleFile();
  return data.schedule ?? [];
}

export async function addScheduleEntry(
  entry: ScheduleEntry
): Promise<ScheduleEntry | null> {
  const data = await ensureScheduleFile();
  const existing = data.schedule.find(
    (item) => item.dateKey === entry.dateKey
  );
  if (existing) {
    return existing;
  }

  data.schedule.push(entry);
  const saved = await writeJsonFile(SCHEDULE_PATH, data);
  return saved ? entry : null;
}
