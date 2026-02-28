import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import { collection, doc, getDocs, setDoc } from "firebase/firestore";
import { COLLECTIONS, db } from "../src/lib/firebase";
import {
  deriveDifficulty,
  toV2FirestoreDoc,
  topicToSlug,
} from "../src/server/services/quiz-question.mapper";
import type { QuizQuestionDocV2 } from "../src/types/firestore.types";
import type { Question } from "../src/types/quiz.types";

type SupportedQuestion = Extract<Question, { type: "mcq" | "select-all" }>;
type ImportQuizQuestionDoc = Omit<QuizQuestionDocV2, "id"> & {
  legacyId: string;
};

type ParsedArgs = {
  inputPath: string;
  dryRun: boolean;
  overwrite: boolean;
};

type InputEnvelope = {
  version: number;
  source: string;
  generatedAt: string;
  questions: unknown[];
};

type ValidatedImportRecord = {
  legacyId: string;
  question: SupportedQuestion;
  sourceIndex: number;
  prompt: string;
  firestoreId: string;
};

type ExistingQuestionDoc = {
  docId: string;
  legacyId?: string;
  createdAt?: string;
};

type ExistingQuestionIndex = {
  byDocId: Map<string, ExistingQuestionDoc>;
  byLegacyId: Map<string, ExistingQuestionDoc>;
  duplicateLegacyIds: Set<string>;
};

type ReportAction =
  | "import"
  | "skip_existing"
  | "overwrite_existing"
  | "legacy_id_conflict"
  | "invalid";

type ReportItem = {
  legacyId: string;
  firestoreId: string;
  action: ReportAction;
  reason?: string;
};

type ImportReport = {
  inputPath: string;
  source: string;
  generatedAt: string;
  dryRun: boolean;
  overwrite: boolean;
  total: number;
  valid: number;
  imported: number;
  overwritten: number;
  skippedExisting: number;
  legacyIdConflicts: number;
  invalid: number;
  idCollisions: number;
  items: ReportItem[];
};

function printUsage(): void {
  console.log(
    "Usage: bun run scripts/import-v2-quiz-questions.ts [path] [--dry-run] [--overwrite]"
  );
  console.log("Default path: src/questions.json");
}

function parseArgs(argv: string[]): ParsedArgs | null {
  let inputPath = "src/questions.json";
  let dryRun = false;
  let overwrite = false;

  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") {
      printUsage();
      return null;
    }
    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (arg === "--overwrite") {
      overwrite = true;
      continue;
    }
    if (arg.startsWith("--")) {
      throw new Error(`Unknown flag: ${arg}`);
    }
    inputPath = arg;
  }

  return { inputPath, dryRun, overwrite };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function normalizeTags(value: unknown): string[] {
  const tags = normalizeStringArray(value).map((tag) => tag.toLowerCase());
  return [...new Set(tags)];
}

function firstNonEmptyString(values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (trimmed.length > 0) return trimmed;
  }
  return null;
}

function normalizePrompt(prompt: unknown): string | null {
  if (typeof prompt !== "string") return null;
  const trimmed = prompt.trim().replace(/\s+/g, " ");
  return trimmed.length > 0 ? trimmed : null;
}

function buildDeterministicQuestionId(legacyId: string, prompt: string, tags: string[]): string {
  const legacyIdNorm = legacyId.trim().toLowerCase();
  const promptNorm = prompt.trim().replace(/\s+/g, " ");
  const topicSlug = topicToSlug(tags[0]);
  const hash = createHash("sha1")
    .update(`${legacyIdNorm}::${promptNorm}`)
    .digest("hex")
    .slice(0, 6);
  return `quiz_${topicSlug}_${hash}`;
}

function summarizePrompt(prompt: string): string {
  return prompt.length > 80 ? `${prompt.slice(0, 77)}...` : prompt;
}

function validateImportQuestion(raw: unknown, index: number): ValidatedImportRecord {
  if (!isRecord(raw)) {
    throw new Error(`question[${index}] must be an object`);
  }

  const legacyId = firstNonEmptyString([raw.legacyId]);
  if (!legacyId) {
    throw new Error(`question[${index}] legacyId must be non-empty`);
  }

  const type = raw.type;
  if (type !== "mcq" && type !== "select-all") {
    throw new Error(`question[${index}] type must be mcq or select-all`);
  }

  const prompt = normalizePrompt(raw.prompt);
  if (!prompt) {
    throw new Error(`question[${index}] prompt must be non-empty`);
  }

  const basePoints = raw.basePoints;
  if (typeof basePoints !== "number" || !Number.isFinite(basePoints)) {
    throw new Error(`question[${index}] basePoints must be numeric`);
  }

  const choices = normalizeStringArray(raw.choices);
  if (choices.length < 2) {
    throw new Error(`question[${index}] requires at least 2 choices`);
  }
  if (new Set(choices).size !== choices.length) {
    throw new Error(`question[${index}] choices must be unique after trimming`);
  }

  const tags = normalizeTags(raw.tags);
  const difficulty =
    raw.difficulty === 1 || raw.difficulty === 2 || raw.difficulty === 3
      ? raw.difficulty
      : deriveDifficulty(basePoints);
  const explanation = firstNonEmptyString([raw.explanation]) ?? undefined;

  const firestoreId = buildDeterministicQuestionId(legacyId, prompt, tags);

  if (type === "mcq") {
    const correctIndex = raw.correctIndex;
    if (
      !Number.isInteger(correctIndex) ||
      correctIndex < 0 ||
      correctIndex >= choices.length
    ) {
      throw new Error(`question[${index}] has invalid correctIndex`);
    }

    const question: SupportedQuestion = {
      id: "",
      type: "mcq",
      prompt,
      ...(explanation ? { explanation } : {}),
      difficulty,
      ...(tags.length > 0 ? { tags } : {}),
      basePoints,
      choices,
      correctIndex,
    };

    return {
      legacyId,
      question,
      sourceIndex: index,
      prompt,
      firestoreId,
    };
  }

  if (!Array.isArray(raw.correctIndices) || raw.correctIndices.length === 0) {
    throw new Error(`question[${index}] select-all needs correctIndices`);
  }

  const correctIndices = raw.correctIndices.filter((value): value is number =>
    Number.isInteger(value)
  );
  if (correctIndices.length !== raw.correctIndices.length) {
    throw new Error(`question[${index}] correctIndices must be integers`);
  }

  const uniqueCorrectIndices = [...new Set(correctIndices)].sort((a, b) => a - b);
  if (uniqueCorrectIndices.length !== correctIndices.length) {
    throw new Error(`question[${index}] correctIndices must be unique`);
  }
  if (
    !uniqueCorrectIndices.every((value) => value >= 0 && value < choices.length)
  ) {
    throw new Error(`question[${index}] correctIndices out of range`);
  }
  if (uniqueCorrectIndices.length >= choices.length) {
    throw new Error(
      `question[${index}] select-all must include at least one incorrect choice`
    );
  }

  const question: SupportedQuestion = {
    id: "",
    type: "select-all",
    prompt,
    ...(explanation ? { explanation } : {}),
    difficulty,
    ...(tags.length > 0 ? { tags } : {}),
    basePoints,
    choices,
    correctIndices: uniqueCorrectIndices,
  };

  return {
    legacyId,
    question,
    sourceIndex: index,
    prompt,
    firestoreId,
  };
}

function validateDeterministicIdCollisions(records: ValidatedImportRecord[]): {
  collisions: ReportItem[];
  collidingIds: Set<string>;
} {
  const byFirestoreId = new Map<string, ValidatedImportRecord[]>();

  for (const record of records) {
    const existing = byFirestoreId.get(record.firestoreId);
    if (existing) {
      existing.push(record);
    } else {
      byFirestoreId.set(record.firestoreId, [record]);
    }
  }

  const collisions: ReportItem[] = [];
  const collidingIds = new Set<string>();

  for (const [firestoreId, groupedRecords] of byFirestoreId.entries()) {
    if (groupedRecords.length < 2) continue;
    collidingIds.add(firestoreId);
    const details = groupedRecords
      .map((record) => `${record.legacyId} (${summarizePrompt(record.prompt)})`)
      .join(", ");

    for (const record of groupedRecords) {
      collisions.push({
        legacyId: record.legacyId,
        firestoreId,
        action: "invalid",
        reason: `Doc ID collision: ${firestoreId} generated by ${details}`,
      });
    }
  }

  return { collisions, collidingIds };
}

function findUndefinedPath(value: unknown, path = "payload"): string | null {
  if (value === undefined) return path;
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const nestedPath = findUndefinedPath(value[index], `${path}[${index}]`);
      if (nestedPath) return nestedPath;
    }
    return null;
  }
  if (!value || typeof value !== "object") return null;
  for (const [key, nestedValue] of Object.entries(value)) {
    const nestedPath = findUndefinedPath(nestedValue, `${path}.${key}`);
    if (nestedPath) return nestedPath;
  }
  return null;
}

function assertNoUndefinedFields(payload: Record<string, unknown>): void {
  const undefinedPath = findUndefinedPath(payload);
  if (undefinedPath) {
    throw new Error(`Refusing to write undefined field at ${undefinedPath}`);
  }
}

async function loadInputFile(inputPath: string): Promise<InputEnvelope> {
  const raw = await readFile(inputPath, "utf-8");
  const parsed = JSON.parse(raw) as unknown;

  if (!isRecord(parsed)) {
    throw new Error("Input JSON must be an object");
  }

  const version = parsed.version;
  if (version !== 2) {
    throw new Error(`Input version must be 2. Received: ${String(version)}`);
  }

  const source = firstNonEmptyString([parsed.source]);
  if (!source) {
    throw new Error("Input source must be non-empty");
  }

  const generatedAt = firstNonEmptyString([parsed.generatedAt]);
  if (!generatedAt) {
    throw new Error("Input generatedAt must be non-empty");
  }

  if (!Array.isArray(parsed.questions)) {
    throw new Error("Input questions must be an array");
  }

  return {
    version,
    source,
    generatedAt,
    questions: parsed.questions,
  };
}

async function loadExistingQuestionIndex(): Promise<ExistingQuestionIndex> {
  const snapshot = await getDocs(collection(db, COLLECTIONS.QUIZ_QUESTIONS));
  const byDocId = new Map<string, ExistingQuestionDoc>();
  const byLegacyId = new Map<string, ExistingQuestionDoc>();
  const duplicateLegacyIds = new Set<string>();

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data() as Record<string, unknown>;
    const existingDoc: ExistingQuestionDoc = {
      docId: docSnap.id,
      ...(typeof data.createdAt === "string" && data.createdAt.trim().length > 0
        ? { createdAt: data.createdAt.trim() }
        : {}),
      ...(typeof data.legacyId === "string" && data.legacyId.trim().length > 0
        ? { legacyId: data.legacyId.trim() }
        : {}),
    };

    byDocId.set(docSnap.id, existingDoc);

    if (!existingDoc.legacyId) continue;
    const prior = byLegacyId.get(existingDoc.legacyId);
    if (prior && prior.docId !== existingDoc.docId) {
      duplicateLegacyIds.add(existingDoc.legacyId);
      continue;
    }
    byLegacyId.set(existingDoc.legacyId, existingDoc);
  }

  return { byDocId, byLegacyId, duplicateLegacyIds };
}

function buildImportPayload(
  record: ValidatedImportRecord,
  nowIso: string,
  existingDoc?: ExistingQuestionDoc
): ImportQuizQuestionDoc {
  const basePayload = toV2FirestoreDoc(record.question, nowIso);
  const createdAt = existingDoc?.createdAt ?? nowIso;
  const payload: ImportQuizQuestionDoc = {
    ...basePayload,
    createdAt,
    updatedAt: nowIso,
    ...(record.legacyId ? { legacyId: record.legacyId } : {}),
  };

  assertNoUndefinedFields(payload as Record<string, unknown>);
  return payload;
}

function createBaseReport(
  inputPath: string,
  envelope: InputEnvelope,
  dryRun: boolean,
  overwrite: boolean,
  total: number
): ImportReport {
  return {
    inputPath,
    source: envelope.source,
    generatedAt: envelope.generatedAt,
    dryRun,
    overwrite,
    total,
    valid: 0,
    imported: 0,
    overwritten: 0,
    skippedExisting: 0,
    legacyIdConflicts: 0,
    invalid: 0,
    idCollisions: 0,
    items: [],
  };
}

function printReport(report: ImportReport): void {
  console.log(JSON.stringify(report, null, 2));
}

async function main(): Promise<void> {
  const parsedArgs = parseArgs(process.argv.slice(2));
  if (!parsedArgs) return;

  const resolvedPath = isAbsolute(parsedArgs.inputPath)
    ? parsedArgs.inputPath
    : resolve(process.cwd(), parsedArgs.inputPath);

  const envelope = await loadInputFile(resolvedPath);
  const report = createBaseReport(
    resolvedPath,
    envelope,
    parsedArgs.dryRun,
    parsedArgs.overwrite,
    envelope.questions.length
  );

  const validatedRecords: ValidatedImportRecord[] = [];
  const seenLegacyIds = new Set<string>();

  for (let index = 0; index < envelope.questions.length; index += 1) {
    try {
      const record = validateImportQuestion(envelope.questions[index], index);
      if (seenLegacyIds.has(record.legacyId)) {
        report.items.push({
          legacyId: record.legacyId,
          firestoreId: record.firestoreId,
          action: "invalid",
          reason: `Duplicate legacyId in input: ${record.legacyId}`,
        });
        continue;
      }
      seenLegacyIds.add(record.legacyId);
      validatedRecords.push(record);
    } catch (error) {
      const raw = isRecord(envelope.questions[index]) ? envelope.questions[index] : {};
      const legacyId =
        typeof raw.legacyId === "string" && raw.legacyId.trim().length > 0
          ? raw.legacyId.trim()
          : `question[${index}]`;
      report.items.push({
        legacyId,
        firestoreId: "",
        action: "invalid",
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  report.valid = validatedRecords.length;

  const { collisions, collidingIds } = validateDeterministicIdCollisions(validatedRecords);
  if (collisions.length > 0) {
    report.idCollisions = collidingIds.size;
    report.items.push(...collisions);
  }

  const collidingLegacyIds = new Set(collisions.map((item) => item.legacyId));
  const runnableRecords = validatedRecords.filter(
    (record) => !collidingIds.has(record.firestoreId) && !collidingLegacyIds.has(record.legacyId)
  );

  const existingIndex = await loadExistingQuestionIndex();
  const nowIso = new Date().toISOString();

  for (const record of runnableRecords) {
    if (existingIndex.duplicateLegacyIds.has(record.legacyId)) {
      report.items.push({
        legacyId: record.legacyId,
        firestoreId: record.firestoreId,
        action: "legacy_id_conflict",
        reason: `Multiple existing docs already use legacyId ${record.legacyId}`,
      });
      continue;
    }

    const existingByDocId = existingIndex.byDocId.get(record.firestoreId);
    const existingByLegacyId = existingIndex.byLegacyId.get(record.legacyId);

    if (existingByLegacyId && existingByLegacyId.docId !== record.firestoreId) {
      report.items.push({
        legacyId: record.legacyId,
        firestoreId: record.firestoreId,
        action: "legacy_id_conflict",
        reason:
          `legacyId ${record.legacyId} already exists on Firestore doc ` +
          `${existingByLegacyId.docId}`,
      });
      continue;
    }

    if (existingByDocId && !parsedArgs.overwrite) {
      report.items.push({
        legacyId: record.legacyId,
        firestoreId: record.firestoreId,
        action: "skip_existing",
        reason: `Firestore doc ${record.firestoreId} already exists`,
      });
      continue;
    }

    const payload = buildImportPayload(record, nowIso, existingByDocId);
    const ref = doc(db, COLLECTIONS.QUIZ_QUESTIONS, record.firestoreId);

    if (!parsedArgs.dryRun) {
      await setDoc(ref, payload);
    }

    report.items.push({
      legacyId: record.legacyId,
      firestoreId: record.firestoreId,
      action: existingByDocId ? "overwrite_existing" : "import",
      ...(existingByDocId
        ? { reason: `Firestore doc ${record.firestoreId} already exists` }
        : {}),
    });
  }

  for (const item of report.items) {
    switch (item.action) {
      case "import":
        report.imported += 1;
        break;
      case "overwrite_existing":
        report.overwritten += 1;
        break;
      case "skip_existing":
        report.skippedExisting += 1;
        break;
      case "legacy_id_conflict":
        report.legacyIdConflicts += 1;
        break;
      case "invalid":
        report.invalid += 1;
        break;
    }
  }

  printReport(report);

  if (report.invalid > 0 || report.idCollisions > 0 || report.legacyIdConflicts > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("[import-v2-quiz] Failed:", error);
  process.exit(1);
});
