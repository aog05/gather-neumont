import type { Question } from "../../types/quiz.types";
import {
  createV2QuizQuestion,
  deleteV2QuizQuestion,
  getQuizQuestionById,
  listQuizQuestions,
  updateV2QuizQuestion,
} from "./quiz-questions.repository";
import {
  deriveDifficulty,
  isLegacyQuestionId,
  type SupportedQuestion,
} from "./quiz-question.mapper";

export type AdminQuestionRecord = SupportedQuestion & {
  questionId: string;
  source: "v2" | "legacy";
};

type ValidationResult =
  | { ok: true; question: SupportedQuestion }
  | { ok: false; error: string };

function firstNonEmptyString(values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (trimmed.length > 0) return trimmed;
  }
  return null;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function normalizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  return [...new Set(normalizeStringArray(tags).map((tag) => tag.toLowerCase()))];
}

function validateQuestionInput(input: Partial<Question>): ValidationResult {
  if (input.type !== "mcq" && input.type !== "select-all") {
    return { ok: false, error: "type must be mcq or select-all" };
  }

  const prompt = firstNonEmptyString([input.prompt]);
  if (!prompt) {
    return { ok: false, error: "prompt must be non-empty" };
  }

  if (typeof input.basePoints !== "number" || !Number.isFinite(input.basePoints)) {
    return { ok: false, error: "basePoints must be a number" };
  }
  const basePoints = input.basePoints;

  const choices = [...new Set(normalizeStringArray(input.choices))];
  if (choices.length < 2) {
    return { ok: false, error: "choices must include at least 2 items" };
  }

  const difficulty =
    input.difficulty === 1 || input.difficulty === 2 || input.difficulty === 3
      ? input.difficulty
      : deriveDifficulty(basePoints);
  const tags = normalizeTags(input.tags);
  const explanation = firstNonEmptyString([input.explanation]) ?? "";

  if (input.type === "mcq") {
    if (
      !Number.isInteger(input.correctIndex) ||
      (input.correctIndex as number) < 0 ||
      (input.correctIndex as number) >= choices.length
    ) {
      return { ok: false, error: "mcq correctIndex is invalid" };
    }
    return {
      ok: true,
      question: {
        id: input.id ?? "",
        type: "mcq",
        prompt,
        explanation,
        difficulty,
        tags,
        basePoints,
        choices,
        correctIndex: input.correctIndex as number,
      },
    };
  }

  if (!Array.isArray(input.correctIndices) || input.correctIndices.length === 0) {
    return { ok: false, error: "select-all correctIndices required" };
  }
  const deduped = [...new Set(input.correctIndices)];
  if (deduped.length !== input.correctIndices.length) {
    return { ok: false, error: "select-all correctIndices must be unique" };
  }
  if (
    !deduped.every(
      (index) => Number.isInteger(index) && index >= 0 && index < choices.length
    )
  ) {
    return { ok: false, error: "select-all correctIndices are invalid" };
  }
  if (deduped.length >= choices.length) {
    return {
      ok: false,
      error: "select-all must include at least one incorrect option",
    };
  }

  return {
    ok: true,
    question: {
      id: input.id ?? "",
      type: "select-all",
      prompt,
      explanation,
      difficulty,
      tags,
      basePoints,
      choices,
      correctIndices: deduped.sort((a, b) => a - b),
    },
  };
}

function toAdminRecord(record: Awaited<ReturnType<typeof getQuizQuestionById>>): AdminQuestionRecord | null {
  if (!record) return null;
  const { signature, ...question } = record;
  return question;
}

export async function getAllAdminQuestions(): Promise<AdminQuestionRecord[]> {
  const records = await listQuizQuestions({ includeLegacy: true });
  return records.map(({ signature, ...question }) => question);
}

export async function getAdminQuestionById(
  questionId: string
): Promise<AdminQuestionRecord | null> {
  return toAdminRecord(
    await getQuizQuestionById(questionId, { includeLegacy: true })
  );
}

export async function createAdminQuestion(
  input: Partial<Question>
): Promise<{ question?: AdminQuestionRecord; error?: string }> {
  const validation = validateQuestionInput(input);
  if (!validation.ok) {
    return { error: validation.error };
  }

  const created = await createV2QuizQuestion(validation.question);
  const { signature, ...question } = created;
  return { question };
}

export async function updateAdminQuestion(
  questionId: string,
  input: Partial<Question>
): Promise<{ question?: AdminQuestionRecord; error?: string }> {
  if (isLegacyQuestionId(questionId)) {
    const existingLegacy = await getQuizQuestionById(questionId, { includeLegacy: true });
    if (existingLegacy && existingLegacy.source === "legacy") {
      return { error: "legacy_read_only" };
    }
  }

  const validation = validateQuestionInput(input);
  if (!validation.ok) {
    return { error: validation.error };
  }

  const updated = await updateV2QuizQuestion(questionId, validation.question);
  if (!updated) {
    return { error: "not_found" };
  }

  const { signature, ...question } = updated;
  return { question };
}

export async function deleteAdminQuestion(
  questionId: string
): Promise<{ success: boolean; error?: string }> {
  if (isLegacyQuestionId(questionId)) {
    const existingLegacy = await getQuizQuestionById(questionId, { includeLegacy: true });
    if (existingLegacy && existingLegacy.source === "legacy") {
      return { success: false, error: "legacy_read_only" };
    }
  }

  const deleted = await deleteV2QuizQuestion(questionId);
  if (!deleted) {
    return { success: false, error: "not_found" };
  }
  return { success: true };
}
