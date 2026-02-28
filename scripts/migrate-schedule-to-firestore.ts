import { readFile } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../src/lib/firebase";
import { getAdminQuestionById } from "../src/server/services/admin-questions-firestore.service";

const QUIZ_SCHEDULE_COLLECTION = "QUIZ_SCHEDULE";

type LegacyScheduleEntry = {
  dateKey?: unknown;
  questionId?: unknown;
  assignedAt?: unknown;
};

type LegacyScheduleFile = {
  schedule?: LegacyScheduleEntry[];
};

type CliOptions = {
  inputPath: string;
  force: boolean;
  dryRun: boolean;
};

function printUsage(): void {
  console.log("Usage: bun run scripts/migrate-schedule-to-firestore.ts [path] [--force] [--dry-run]");
  console.log("Default path: data/schedule.json");
}

function parseArgs(argv: string[]): CliOptions | null {
  let inputPath = "data/schedule.json";
  let force = false;
  let dryRun = false;

  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") {
      printUsage();
      return null;
    }
    if (arg === "--force") {
      force = true;
      continue;
    }
    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (arg.startsWith("--")) {
      throw new Error(`Unknown flag: ${arg}`);
    }
    inputPath = arg;
  }

  return { inputPath, force, dryRun };
}

function isValidDateKey(dateKey: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return false;
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function coerceEntries(raw: unknown): LegacyScheduleEntry[] {
  if (Array.isArray(raw)) {
    return raw as LegacyScheduleEntry[];
  }
  if (raw && typeof raw === "object" && Array.isArray((raw as LegacyScheduleFile).schedule)) {
    return (raw as LegacyScheduleFile).schedule as LegacyScheduleEntry[];
  }
  return [];
}

function resolveCreatedAt(assignedAt: unknown, fallbackIso: string): string {
  if (typeof assignedAt !== "string") return fallbackIso;
  const parsed = new Date(assignedAt);
  if (Number.isNaN(parsed.getTime())) return fallbackIso;
  return parsed.toISOString();
}

async function main(): Promise<void> {
  const options = parseArgs(Bun.argv.slice(2));
  if (!options) return;

  const resolvedPath = isAbsolute(options.inputPath)
    ? options.inputPath
    : resolve(process.cwd(), options.inputPath);

  const rawText = await readFile(resolvedPath, "utf8");
  const parsed = JSON.parse(rawText) as unknown;
  const entries = coerceEntries(parsed);

  if (entries.length === 0) {
    console.log(`[migrate-schedule] No schedule entries found in ${resolvedPath}`);
    return;
  }

  console.log(
    `[migrate-schedule] Loaded ${entries.length} entries from ${resolvedPath} (force=${options.force}, dryRun=${options.dryRun})`
  );

  let written = 0;
  let skippedExisting = 0;
  let skippedInvalid = 0;
  let skippedQuestion = 0;

  for (const entry of entries) {
    const dateKey =
      typeof entry.dateKey === "string" ? entry.dateKey.trim() : "";
    const questionId =
      typeof entry.questionId === "string" ? entry.questionId.trim() : "";

    if (!dateKey || !questionId || !isValidDateKey(dateKey)) {
      skippedInvalid += 1;
      console.warn(
        `[migrate-schedule] skip invalid entry dateKey=${String(entry.dateKey)} questionId=${String(entry.questionId)}`
      );
      continue;
    }

    const question = await getAdminQuestionById(questionId);
    if (!question) {
      skippedQuestion += 1;
      console.warn(
        `[migrate-schedule] skip unknown question ${questionId} for ${dateKey}`
      );
      continue;
    }

    const ref = doc(db, QUIZ_SCHEDULE_COLLECTION, dateKey);
    const existing = await getDoc(ref);

    if (existing.exists() && !options.force) {
      skippedExisting += 1;
      continue;
    }

    const nowIso = new Date().toISOString();
    const existingCreatedAt =
      existing.exists() && typeof existing.data().createdAt === "string"
        ? existing.data().createdAt
        : undefined;
    const createdAt =
      existingCreatedAt ?? resolveCreatedAt(entry.assignedAt, nowIso);

    const payload = {
      dateKey,
      questionId: question.questionId,
      puzzleId: question.puzzleId,
      createdAt,
      updatedAt: nowIso,
    };

    if (options.dryRun) {
      console.log(
        `[migrate-schedule][dry-run] upsert ${dateKey} -> ${payload.questionId}`
      );
      written += 1;
      continue;
    }

    await setDoc(ref, payload);
    written += 1;
    console.log(`[migrate-schedule] upserted ${dateKey} -> ${payload.questionId}`);
  }

  console.log(
    `[migrate-schedule] complete written=${written} skipped_existing=${skippedExisting} skipped_invalid=${skippedInvalid} skipped_unknown_question=${skippedQuestion}`
  );
}

main().catch((error) => {
  console.error("[migrate-schedule] Failed:", error);
  process.exit(1);
});
