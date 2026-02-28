import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { COLLECTIONS, db } from "../src/lib/firebase";
import type { QuizQuestion } from "../src/types/firestore.types";
import type { Question } from "../src/types/quiz.types";

type SupportedQuestion = Extract<Question, { type: "mcq" | "select-all" }>;

type ParsedInput = {
  inputPath: string;
  dryRun: boolean;
};

type ValidationSuccess = {
  ok: true;
  question: SupportedQuestion;
  sourceId?: string;
};

type ValidationFailure = {
  ok: false;
  error: string;
};

type ValidationResult = ValidationSuccess | ValidationFailure;

function printUsage(): void {
  console.log("Usage: bun run scripts/import-quiz-questions.ts [path] [--dry-run]");
  console.log("Default path: data/questions.json");
}

function parseArgs(argv: string[]): ParsedInput | null {
  let inputPath = "data/questions.json";
  let dryRun = false;

  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") {
      printUsage();
      return null;
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

  return { inputPath, dryRun };
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function normalizeTags(value: unknown): string[] {
  const tags = normalizeStringArray(value).map((tag) => tag.toLowerCase());
  return Array.from(new Set(tags));
}

function deriveDifficulty(basePoints: number): 1 | 2 | 3 {
  if (basePoints <= 100) return 1;
  if (basePoints <= 150) return 2;
  return 3;
}

function validateQuestion(raw: unknown, index: number): ValidationResult {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: `question[${index}] must be an object` };
  }

  const source = raw as Record<string, unknown>;
  const type = source.type;
  if (type !== "mcq" && type !== "select-all") {
    return { ok: false, error: `question[${index}] type must be mcq or select-all` };
  }

  const prompt =
    typeof source.prompt === "string" && source.prompt.trim().length > 0
      ? source.prompt.trim()
      : "";
  if (!prompt) {
    return { ok: false, error: `question[${index}] prompt must be non-empty` };
  }

  const basePoints = source.basePoints;
  if (typeof basePoints !== "number" || !Number.isFinite(basePoints)) {
    return { ok: false, error: `question[${index}] basePoints must be numeric` };
  }

  const difficultyRaw = source.difficulty;
  const difficulty =
    difficultyRaw === 1 || difficultyRaw === 2 || difficultyRaw === 3
      ? difficultyRaw
      : deriveDifficulty(basePoints);

  const explanation =
    typeof source.explanation === "string" && source.explanation.trim().length > 0
      ? source.explanation.trim()
      : undefined;

  const tags = normalizeTags(source.tags);
  const choices = normalizeStringArray(source.choices);
  if (choices.length < 2) {
    return { ok: false, error: `question[${index}] requires at least 2 choices` };
  }

  const sourceId =
    typeof source.id === "string" && source.id.trim().length > 0
      ? source.id.trim()
      : undefined;

  if (type === "mcq") {
    const correctIndex = source.correctIndex;
    if (
      !Number.isInteger(correctIndex) ||
      correctIndex < 0 ||
      correctIndex >= choices.length
    ) {
      return { ok: false, error: `question[${index}] has invalid correctIndex` };
    }

    return {
      ok: true,
      sourceId,
      question: {
        id: sourceId ?? "",
        type: "mcq",
        prompt,
        explanation,
        difficulty,
        tags,
        basePoints,
        choices,
        correctIndex,
      },
    };
  }

  const correctIndicesRaw = source.correctIndices;
  if (!Array.isArray(correctIndicesRaw) || correctIndicesRaw.length === 0) {
    return { ok: false, error: `question[${index}] select-all needs correctIndices` };
  }
  const correctIndices = correctIndicesRaw.filter((value): value is number =>
    Number.isInteger(value)
  );
  if (correctIndices.length !== correctIndicesRaw.length) {
    return { ok: false, error: `question[${index}] correctIndices must be integers` };
  }
  const unique = Array.from(new Set(correctIndices));
  if (unique.length !== correctIndices.length) {
    return { ok: false, error: `question[${index}] correctIndices must be unique` };
  }
  if (!unique.every((value) => value >= 0 && value < choices.length)) {
    return { ok: false, error: `question[${index}] correctIndices out of range` };
  }
  if (unique.length >= choices.length) {
    return {
      ok: false,
      error: `question[${index}] select-all must include at least one incorrect choice`,
    };
  }

  return {
    ok: true,
    sourceId,
    question: {
      id: sourceId ?? "",
      type: "select-all",
      prompt,
      explanation,
      difficulty,
      tags,
      basePoints,
      choices,
      correctIndices: unique.sort((a, b) => a - b),
    },
  };
}

function sanitizeForDocId(value: string): string {
  const sanitized = value
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return sanitized.slice(0, 80);
}

function slugifyPrompt(prompt: string): string {
  const slug = prompt
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return slug || "quiz";
}

function deterministicDocId(question: SupportedQuestion, sourceId?: string): string {
  if (sourceId) {
    const sanitized = sanitizeForDocId(sourceId);
    if (sanitized.length > 0) {
      return `quiz_${sanitized}`;
    }
  }

  const slug = slugifyPrompt(question.prompt);
  const hash = createHash("sha1")
    .update(
      JSON.stringify({
        type: question.type,
        prompt: question.prompt,
        basePoints: question.basePoints,
      })
    )
    .digest("hex")
    .slice(0, 10);

  return `quiz_${slug}_${hash}`;
}

function toFirestoreQuestion(question: SupportedQuestion): QuizQuestion {
  if (question.type === "mcq") {
    const answer = question.choices[question.correctIndex];
    const other = question.choices.filter(
      (_, index) => index !== question.correctIndex
    );
    return {
      type: "mcq",
      SV: question.basePoints,
      prompt: question.prompt,
      answer,
      other,
      explanation: question.explanation,
      difficulty: question.difficulty,
      tags: question.tags,
    };
  }

  const correctSet = new Set(question.correctIndices);
  const answers = question.choices.filter((_, index) => correctSet.has(index));
  const other = question.choices.filter((_, index) => !correctSet.has(index));
  return {
    type: "select-all",
    SV: question.basePoints,
    prompt: question.prompt,
    answers,
    other,
    explanation: question.explanation,
    difficulty: question.difficulty,
    tags: question.tags,
  };
}

function toPuzzleDoc(question: SupportedQuestion, firestoreQuestion: QuizQuestion) {
  const topic = question.tags?.[0] ?? "quiz";
  return {
    Type: "Quiz",
    Name: question.prompt,
    Topic: topic,
    Reward: question.basePoints,
    Threshold: 1,
    Questions: [firestoreQuestion],
  };
}

async function loadInput(filePath: string): Promise<unknown[]> {
  const raw = await readFile(filePath, "utf-8");
  const parsed = JSON.parse(raw) as unknown;

  if (Array.isArray(parsed)) {
    return parsed;
  }
  if (
    parsed &&
    typeof parsed === "object" &&
    Array.isArray((parsed as { questions?: unknown[] }).questions)
  ) {
    return (parsed as { questions: unknown[] }).questions;
  }

  throw new Error("Input JSON must be an array or an object with a questions array");
}

async function main(): Promise<void> {
  const parsedArgs = parseArgs(Bun.argv.slice(2));
  if (!parsedArgs) return;

  const resolvedPath = isAbsolute(parsedArgs.inputPath)
    ? parsedArgs.inputPath
    : resolve(process.cwd(), parsedArgs.inputPath);

  const rawQuestions = await loadInput(resolvedPath);
  console.log(
    `[import-quiz] Loaded ${rawQuestions.length} entries from ${resolvedPath}`
  );

  const validated: Array<{ question: SupportedQuestion; sourceId?: string }> = [];
  for (let index = 0; index < rawQuestions.length; index += 1) {
    const result = validateQuestion(rawQuestions[index], index);
    if (!result.ok) {
      throw new Error(result.error);
    }
    validated.push({ question: result.question, sourceId: result.sourceId });
  }

  const seenDocIds = new Set<string>();
  let created = 0;
  let updated = 0;

  for (const entry of validated) {
    const docId = deterministicDocId(entry.question, entry.sourceId);
    if (seenDocIds.has(docId)) {
      throw new Error(`Duplicate deterministic doc id generated: ${docId}`);
    }
    seenDocIds.add(docId);

    const firestoreQuestion = toFirestoreQuestion(entry.question);
    const puzzleDoc = toPuzzleDoc(entry.question, firestoreQuestion);
    const ref = doc(db, COLLECTIONS.PUZZLE, docId);

    if (parsedArgs.dryRun) {
      console.log(
        `[import-quiz][dry-run] upsert ${docId} (${entry.question.type}, ${entry.question.basePoints} pts)`
      );
      continue;
    }

    const existing = await getDoc(ref);
    await setDoc(ref, puzzleDoc);
    if (existing.exists()) {
      updated += 1;
    } else {
      created += 1;
    }
    console.log(
      `[import-quiz] upserted ${docId} (${entry.question.type}, ${entry.question.basePoints} pts)`
    );
  }

  if (parsedArgs.dryRun) {
    console.log(`[import-quiz] Dry run complete. ${validated.length} docs validated.`);
    return;
  }

  console.log(
    `[import-quiz] Complete. created=${created}, updated=${updated}, total=${validated.length}`
  );
}

main().catch((error) => {
  console.error("[import-quiz] Failed:", error);
  process.exit(1);
});
