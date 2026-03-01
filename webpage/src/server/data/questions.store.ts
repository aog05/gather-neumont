/**
 * Questions store module - read/list operations for quiz questions.
 * Admin CRUD operations will be added in a later commit.
 */

import type { Question, QuestionsFile } from "../../types/quiz.types";
import { ensureDataDir, readJsonFile, getDataPath, writeJsonFile } from "./store";

const QUESTIONS_FILE = "questions.json";
const QUESTIONS_FILE_VERSION = 1;

async function ensureQuestionsFile(): Promise<QuestionsFile> {
  await ensureDataDir();
  const filepath = getDataPath(QUESTIONS_FILE);
  const data = await readJsonFile<QuestionsFile>(filepath);
  if (data && Array.isArray(data.questions)) {
    return data;
  }

  const initial: QuestionsFile = { version: QUESTIONS_FILE_VERSION, questions: [] };
  await writeJsonFile(filepath, initial);
  return initial;
}

/**
 * Get all questions from the store
 */
export async function getAllQuestions(): Promise<Question[]> {
  const data = await ensureQuestionsFile();
  return data.questions ?? [];
}

/**
 * Get a single question by ID
 */
export async function getQuestionById(
  id: string
): Promise<Question | undefined> {
  const questions = await getAllQuestions();
  return questions.find((q) => q.id === id);
}

/**
 * Get questions by tag
 */
export async function getQuestionsByTag(tag: string): Promise<Question[]> {
  const questions = await getAllQuestions();
  return questions.filter((q) => q.tags?.includes(tag));
}

/**
 * Get questions by difficulty
 */
export async function getQuestionsByDifficulty(
  difficulty: 1 | 2 | 3
): Promise<Question[]> {
  const questions = await getAllQuestions();
  return questions.filter((q) => q.difficulty === difficulty);
}

/**
 * Get the total count of questions
 */
export async function getQuestionCount(): Promise<number> {
  const questions = await getAllQuestions();
  return questions.length;
}

type ValidationResult = { ok: true } | { ok: false; error: string };

function validateTags(tags: unknown): ValidationResult {
  if (!Array.isArray(tags)) {
    return { ok: false, error: "tags must be an array" };
  }
  if (tags.length < 2 || tags.length > 4) {
    return { ok: false, error: "tags must have 2-4 items" };
  }
  if (!tags.every((tag) => typeof tag === "string" && tag.trim().length > 0)) {
    return { ok: false, error: "tags must be non-empty strings" };
  }
  return { ok: true };
}

function validateBasePoints(
  difficulty: number,
  basePoints: unknown
): ValidationResult {
  if (typeof basePoints !== "number") {
    return { ok: false, error: "basePoints must be a number" };
  }
  const expected = difficulty === 1 ? 100 : difficulty === 2 ? 150 : 200;
  if (basePoints !== expected) {
    return {
      ok: false,
      error: `basePoints must be ${expected} for difficulty ${difficulty}`,
    };
  }
  return { ok: true };
}

function validateQuestionInput(
  input: Partial<Question>,
  id: string
): ValidationResult {
  if (!/^q\d{3}$/.test(id)) {
    return { ok: false, error: "id must match q###" };
  }
  if (typeof input.prompt !== "string" || input.prompt.trim().length === 0) {
    return { ok: false, error: "prompt must be non-empty" };
  }
  if (input.difficulty !== 1 && input.difficulty !== 2 && input.difficulty !== 3) {
    return { ok: false, error: "difficulty must be 1, 2, or 3" };
  }
  const baseCheck = validateBasePoints(input.difficulty, input.basePoints);
  if (!baseCheck.ok) return baseCheck;
  const tagsCheck = validateTags(input.tags);
  if (!tagsCheck.ok) return tagsCheck;

  if (input.type === "mcq") {
    if (!Array.isArray(input.choices) || input.choices.length !== 4) {
      return { ok: false, error: "mcq choices must be length 4" };
    }
    if (
      !Number.isInteger(input.correctIndex) ||
      input.correctIndex < 0 ||
      input.correctIndex > 3
    ) {
      return { ok: false, error: "mcq correctIndex must be 0-3" };
    }
    return { ok: true };
  }

  if (input.type === "select-all") {
    if (!Array.isArray(input.choices) || input.choices.length !== 5) {
      return { ok: false, error: "select-all choices must be length 5" };
    }
    if (!Array.isArray(input.correctIndices) || input.correctIndices.length < 1) {
      return { ok: false, error: "select-all correctIndices required" };
    }
    const unique = new Set(input.correctIndices);
    if (unique.size !== input.correctIndices.length) {
      return { ok: false, error: "select-all correctIndices must be unique" };
    }
    if (
      !input.correctIndices.every(
        (index) => Number.isInteger(index) && index >= 0 && index <= 4
      )
    ) {
      return { ok: false, error: "select-all correctIndices must be 0-4" };
    }
    return { ok: true };
  }

  return { ok: false, error: "type must be mcq or select-all" };
}

function getNextQuestionId(questions: Question[]): string {
  let max = 0;
  for (const question of questions) {
    const match = /^q(\d{3})$/.exec(question.id);
    if (match) {
      const value = Number.parseInt(match[1], 10);
      if (value > max) max = value;
    }
  }
  const next = max + 1;
  return `q${next.toString().padStart(3, "0")}`;
}

async function saveQuestions(questions: Question[]): Promise<boolean> {
  const data: QuestionsFile = { version: QUESTIONS_FILE_VERSION, questions };
  const filepath = getDataPath(QUESTIONS_FILE);
  return writeJsonFile(filepath, data);
}

export async function createQuestion(
  input: Partial<Question>
): Promise<{ question?: Question; error?: string }> {
  const data = await ensureQuestionsFile();
  const id = getNextQuestionId(data.questions);
  if (data.questions.some((q) => q.id === id)) {
    return { error: "duplicate id" };
  }

  const validation = validateQuestionInput(input, id);
  if (!validation.ok) {
    return { error: validation.error };
  }

  const question = { ...(input as Question), id };
  data.questions.push(question);
  const saved = await saveQuestions(data.questions);
  return saved ? { question } : { error: "failed to save" };
}

export async function updateQuestion(
  id: string,
  input: Partial<Question>
): Promise<{ question?: Question; error?: string }> {
  const data = await ensureQuestionsFile();
  const index = data.questions.findIndex((q) => q.id === id);
  if (index < 0) {
    return { error: "not_found" };
  }

  const validation = validateQuestionInput(input, id);
  if (!validation.ok) {
    return { error: validation.error };
  }

  const question = { ...(input as Question), id };
  data.questions[index] = question;
  const saved = await saveQuestions(data.questions);
  return saved ? { question } : { error: "failed to save" };
}

export async function deleteQuestion(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const data = await ensureQuestionsFile();
  const existing = data.questions.find((q) => q.id === id);
  if (!existing) {
    return { success: false, error: "not_found" };
  }
  const filtered = data.questions.filter((q) => q.id !== id);
  const saved = await saveQuestions(filtered);
  return saved ? { success: true } : { success: false, error: "failed to save" };
}
