import type { QuizPuzzle, QuizQuestion, QuizQuestionDocV2 } from "../../types/firestore.types";
import type { Question } from "../../types/quiz.types";

export type SupportedQuestion = Extract<Question, { type: "mcq" | "select-all" }>;
export type QuizQuestionSource = "v2" | "legacy";

export type QuizQuestionRecord = SupportedQuestion & {
  questionId: string;
  source: QuizQuestionSource;
  signature: string;
};

type LegacyQuestionShape = Record<string, unknown>;

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

function dedupeStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function normalizeTags(tags: unknown, topicFallback?: string): string[] {
  const normalized = dedupeStrings(
    normalizeStringArray(tags).map((tag) => tag.trim().toLowerCase())
  );
  if (normalized.length > 0) return normalized;
  if (topicFallback && topicFallback.trim().length > 0) {
    return [topicFallback.trim().toLowerCase()];
  }
  return [];
}

function normalizeQuestionType(rawType: unknown): "mcq" | "select-all" {
  const normalized =
    typeof rawType === "string" ? rawType.trim().toLowerCase() : "";

  if (
    normalized === "select-all" ||
    normalized === "select_all" ||
    normalized === "multi-select" ||
    normalized === "multi_select" ||
    normalized === "multiple-choice" ||
    normalized === "multiple_choice"
  ) {
    return "select-all";
  }

  return "mcq";
}

export function deriveDifficulty(basePoints: number): 1 | 2 | 3 {
  if (basePoints <= 100) return 1;
  if (basePoints <= 150) return 2;
  return 3;
}

function normalizePrompt(prompt: unknown): string | null {
  if (typeof prompt !== "string") return null;
  const trimmed = prompt.trim();
  if (!trimmed) return null;
  return trimmed;
}

function normalizeBasePoints(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
}

function buildSignature(question: SupportedQuestion): string {
  const prompt = question.prompt.trim().toLowerCase().replace(/\s+/g, " ");
  const choices = question.choices.map((choice) =>
    choice.trim().toLowerCase().replace(/\s+/g, " ")
  );
  const tags = (question.tags ?? []).map((tag) => tag.trim().toLowerCase()).sort();
  const answerKey =
    question.type === "mcq"
      ? `mcq:${question.correctIndex}`
      : `sa:${[...question.correctIndices].sort((a, b) => a - b).join(",")}`;
  return [
    question.type,
    prompt,
    String(question.basePoints),
    answerKey,
    choices.join("|"),
    tags.join(","),
  ].join("::");
}

function asSupportedQuestion(
  questionId: string,
  source: QuizQuestionSource,
  input: Omit<SupportedQuestion, "id">
): QuizQuestionRecord {
  const question: SupportedQuestion = { ...input, id: questionId };
  return {
    ...question,
    questionId,
    source,
    signature: buildSignature(question),
  };
}

function parseDifficulty(raw: unknown, basePoints: number): 1 | 2 | 3 {
  if (raw === 1 || raw === 2 || raw === 3) return raw;
  return deriveDifficulty(basePoints);
}

export function mapV2DocToQuestion(
  questionId: string,
  data: Record<string, unknown>
): QuizQuestionRecord | null {
  if (data.schemaVersion !== 2) return null;

  const type = normalizeQuestionType(data.type);
  const prompt = normalizePrompt(data.prompt);
  const basePoints = normalizeBasePoints(data.basePoints);
  const choices = dedupeStrings(normalizeStringArray(data.choices));
  const tags = normalizeTags(data.tags, typeof data.topic === "string" ? data.topic : undefined);
  const explanation = firstNonEmptyString([data.explanation]) ?? undefined;

  if (!prompt || basePoints === null || choices.length < 2) {
    return null;
  }

  const difficulty = parseDifficulty(data.difficulty, basePoints);
  if (type === "mcq") {
    const correctIndex = data.correctIndex;
    if (
      !Number.isInteger(correctIndex) ||
      (correctIndex as number) < 0 ||
      (correctIndex as number) >= choices.length
    ) {
      return null;
    }
    return asSupportedQuestion(questionId, "v2", {
      type: "mcq",
      prompt,
      explanation,
      difficulty,
      tags,
      basePoints,
      choices,
      correctIndex: correctIndex as number,
    });
  }

  const rawIndices = Array.isArray(data.correctIndices) ? data.correctIndices : [];
  const deduped = [...new Set(rawIndices)]
    .filter((value): value is number => Number.isInteger(value))
    .sort((a, b) => a - b);
  if (
    deduped.length === 0 ||
    !deduped.every((index) => index >= 0 && index < choices.length) ||
    deduped.length >= choices.length
  ) {
    return null;
  }
  return asSupportedQuestion(questionId, "v2", {
    type: "select-all",
    prompt,
    explanation,
    difficulty,
    tags,
    basePoints,
    choices,
    correctIndices: deduped,
  });
}

function resolveLegacyPrompt(
  puzzleData: Record<string, unknown>,
  source: LegacyQuestionShape,
  index: number
): string {
  const prompt = firstNonEmptyString([
    source.prompt,
    source.Prompt,
    source.question,
    source.Question,
    source.text,
    source.Text,
    source.statement,
    source.Statement,
  ]);
  if (prompt) return prompt;

  const puzzleName = firstNonEmptyString([puzzleData.Name, puzzleData.name]);
  if (puzzleName) return `${puzzleName} - Question ${index + 1}`;
  return `Quiz - Question ${index + 1}`;
}

function resolveLegacyBasePoints(
  puzzleData: Record<string, unknown>,
  source: LegacyQuestionShape
): number {
  if (typeof source.SV === "number" && Number.isFinite(source.SV)) {
    return source.SV;
  }
  if (typeof puzzleData.Reward === "number" && Number.isFinite(puzzleData.Reward)) {
    return puzzleData.Reward;
  }
  return 100;
}

function mapLegacyQuestion(
  puzzleId: string,
  puzzleData: Record<string, unknown>,
  source: LegacyQuestionShape,
  index: number
): QuizQuestionRecord | null {
  const type = normalizeQuestionType(source.type);
  const prompt = resolveLegacyPrompt(puzzleData, source, index);
  const basePoints = resolveLegacyBasePoints(puzzleData, source);
  const difficulty = parseDifficulty(source.difficulty, basePoints);
  const topic = typeof puzzleData.Topic === "string" ? puzzleData.Topic : undefined;
  const tags = normalizeTags(source.tags, topic);
  const explanation = firstNonEmptyString([source.explanation]) ?? undefined;
  const questionId = `${puzzleId}_q${index}`;

  if (type === "mcq") {
    const answer = firstNonEmptyString([source.answer, ...normalizeStringArray(source.answers)]);
    const other = dedupeStrings(normalizeStringArray(source.other));
    const fallbackCorrect = other[0];
    const correctAnswer = answer ?? fallbackCorrect;
    if (!correctAnswer) return null;

    const choices = dedupeStrings([
      correctAnswer,
      ...other.filter((choice) => choice !== correctAnswer),
    ]);
    if (choices.length < 2) return null;

    return asSupportedQuestion(questionId, "legacy", {
      type: "mcq",
      prompt,
      explanation,
      difficulty,
      tags,
      basePoints,
      choices,
      correctIndex: 0,
    });
  }

  const answersFromArray = normalizeStringArray(source.answers);
  const answerFromSingle = firstNonEmptyString([source.answer]);
  const correctAnswers = dedupeStrings(
    answersFromArray.length > 0
      ? answersFromArray
      : answerFromSingle
        ? [answerFromSingle]
        : []
  );
  const other = dedupeStrings(
    normalizeStringArray(source.other).filter((choice) => !correctAnswers.includes(choice))
  );
  const choices = [...correctAnswers, ...other];
  if (correctAnswers.length === 0 || choices.length < 2) {
    return null;
  }

  return asSupportedQuestion(questionId, "legacy", {
    type: "select-all",
    prompt,
    explanation,
    difficulty,
    tags,
    basePoints,
    choices,
    correctIndices: correctAnswers.map((_, choiceIndex) => choiceIndex),
  });
}

export function mapLegacyPuzzleDocToQuestions(
  puzzleId: string,
  data: Record<string, unknown>
): QuizQuestionRecord[] {
  if (data.Type !== "Quiz") return [];
  if (!Array.isArray(data.Questions)) return [];

  const questions: QuizQuestionRecord[] = [];
  for (let index = 0; index < data.Questions.length; index += 1) {
    const source = data.Questions[index];
    if (!source || typeof source !== "object") continue;
    const mapped = mapLegacyQuestion(
      puzzleId,
      data,
      source as LegacyQuestionShape,
      index
    );
    if (mapped) questions.push(mapped);
  }
  return questions;
}

export function toV2FirestoreDoc(
  question: SupportedQuestion,
  nowIso: string
): Omit<QuizQuestionDocV2, "id"> {
  const explanation =
    typeof question.explanation === "string" ? question.explanation.trim() : "";
  const tags = Array.isArray(question.tags)
    ? question.tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0)
    : [];
  const topic = tags[0];

  return {
    schemaVersion: 2,
    type: question.type,
    prompt: question.prompt.trim(),
    choices: [...question.choices],
    ...(question.type === "mcq"
      ? { correctIndex: question.correctIndex }
      : { correctIndices: [...question.correctIndices] }),
    basePoints: question.basePoints,
    ...(explanation ? { explanation } : {}),
    ...(question.difficulty ? { difficulty: question.difficulty } : {}),
    ...(tags.length > 0 ? { tags } : {}),
    ...(topic ? { topic } : {}),
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

export function topicToSlug(input: string | undefined): string {
  const value = (input ?? "quiz").trim().toLowerCase();
  const normalized = value.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (!normalized) return "quiz";
  return normalized.slice(0, 24);
}

export function makeQuestionId(topic: string | undefined): string {
  const slug = topicToSlug(topic);
  const rand = Math.random().toString(36).slice(2, 8);
  return `quiz_${slug}_${rand}`;
}

export function isLegacyQuestionId(questionId: string): boolean {
  return /_q\d+$/i.test(questionId);
}
