import { ensureDataDir, getDataPath, readJsonFile, writeJsonFile } from "./store";

const SCHEDULE_FILE = "schedule.json";
const SCHEDULE_FILE_VERSION = 1;
const QUESTION_ID_SUFFIX_REGEX = /^(.*)_q(\d+)$/i;

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

function getQ0Candidate(questionId: string): string | null {
  const match = QUESTION_ID_SUFFIX_REGEX.exec(questionId.trim());
  if (!match) return null;
  const puzzleId = match[1]?.trim();
  const questionIndex = Number.parseInt(match[2], 10);
  if (!puzzleId || Number.isNaN(questionIndex) || questionIndex <= 0) {
    return null;
  }
  return `${puzzleId}_q0`;
}

function repairScheduleEntriesInMemory(
  entries: ScheduleEntry[],
  validQuestionIds: Set<string>
): { changed: boolean } {
  let changed = false;
  for (const entry of entries) {
    if (validQuestionIds.has(entry.questionId)) {
      continue;
    }
    const corrected = getQ0Candidate(entry.questionId);
    if (!corrected || !validQuestionIds.has(corrected)) {
      continue;
    }
    console.warn(
      `[schedule.store] Repaired legacy schedule entry ${entry.dateKey}: ${entry.questionId} -> ${corrected}`
    );
    entry.questionId = corrected;
    changed = true;
  }
  return { changed };
}

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

export async function getScheduleEntries(
  validQuestionIds?: Set<string>
): Promise<ScheduleEntry[]> {
  const data = await ensureScheduleFile();
  if (validQuestionIds && validQuestionIds.size > 0) {
    const { changed } = repairScheduleEntriesInMemory(
      data.schedule ?? [],
      validQuestionIds
    );
    if (changed) {
      await writeJsonFile(SCHEDULE_PATH, data);
    }
  }
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
