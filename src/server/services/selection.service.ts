/**
 * Daily question selection service.
 * Deterministically selects a question for a given date.
 *
 * Source priority:
 * 1) Firestore schedule (QUIZ_SCHEDULE)
 * 2) Legacy JSON schedule fallback
 * 3) Deterministic fallback selection
 */

import { getAllQuizQuestions } from "./firebase-quiz.service";
import { getScheduleEntries as getJsonScheduleEntries } from "../data/schedule.store";
import { getScheduledQuestionId } from "./schedule-firestore.service";
import type { Question } from "../../types/quiz.types";

function isValidQuestion(question: Question): boolean {
  if (!question?.id) {
    return false;
  }
  if (typeof question.prompt !== "string" || question.prompt.trim().length === 0) {
    return false;
  }
  if (typeof question.basePoints !== "number") {
    return false;
  }

  switch (question.type) {
    case "mcq":
      return (
        Array.isArray(question.choices) &&
        question.choices.length === 4 &&
        Number.isInteger(question.correctIndex) &&
        question.correctIndex >= 0 &&
        question.correctIndex < 4
      );
    case "select-all":
      if (!Array.isArray(question.choices) || question.choices.length < 2) {
        return false;
      }
      if (!Array.isArray(question.correctIndices)) {
        return false;
      }
      if (question.correctIndices.length === 0) {
        return false;
      }
      const unique = new Set(question.correctIndices);
      if (unique.size !== question.correctIndices.length) {
        return false;
      }
      return question.correctIndices.every(
        (index) =>
          Number.isInteger(index) &&
          index >= 0 &&
          index < question.choices.length
      );
    default:
      return false;
  }
}

function parseFirestoreQuestionId(
  questionId: string
): { puzzleId: string; questionIndex: number } | null {
  const match = /^(.*)_q(\d+)$/i.exec(questionId);
  if (!match) return null;
  const puzzleId = match[1]?.trim();
  const questionIndex = Number.parseInt(match[2], 10);
  if (!puzzleId || Number.isNaN(questionIndex) || questionIndex < 0) {
    return null;
  }
  return { puzzleId, questionIndex };
}

function compareQuestionIds(a: string, b: string): number {
  const parsedA = parseFirestoreQuestionId(a);
  const parsedB = parseFirestoreQuestionId(b);

  if (parsedA && parsedB) {
    const byPuzzle = parsedA.puzzleId.localeCompare(parsedB.puzzleId);
    if (byPuzzle !== 0) return byPuzzle;
    if (parsedA.questionIndex !== parsedB.questionIndex) {
      return parsedA.questionIndex - parsedB.questionIndex;
    }
    return a.localeCompare(b);
  }

  if (parsedA && !parsedB) return -1;
  if (!parsedA && parsedB) return 1;
  return a.localeCompare(b);
}

function hashDateKey(dateKey: string): number {
  let hash = 0;
  for (let index = 0; index < dateKey.length; index += 1) {
    hash = (hash * 31 + dateKey.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function pickDeterministicFallback(questions: Question[], dateKey: string): Question | null {
  if (questions.length === 0) {
    return null;
  }

  const ordered = [...questions].sort((a, b) => compareQuestionIds(a.id, b.id));
  const selectedIndex = hashDateKey(dateKey) % ordered.length;
  return ordered[selectedIndex] ?? null;
}

function logDuplicateIds(questions: Question[]): void {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const question of questions) {
    if (seen.has(question.id)) {
      duplicates.add(question.id);
    }
    seen.add(question.id);
  }
  if (duplicates.size > 0) {
    console.error(
      `[quiz] duplicate question IDs detected: ${Array.from(duplicates).join(", ")}`
    );
  }
}

/**
 * Get the question for a specific date.
 * Uses Firestore schedule first, then legacy JSON schedule, then deterministic fallback.
 * Returns null if no questions are available.
 */
export async function getQuestionForDate(
  dateKey: string
): Promise<Question | null> {
  console.log(`[selection] Getting question for date: ${dateKey}`);
  const allQuestions = await getAllQuizQuestions();

  if (allQuestions.length === 0) {
    console.warn(`[selection] No quiz questions available from Firebase`);
    return null;
  }

  console.log(`[selection] Loaded ${allQuestions.length} questions from Firebase`);
  logDuplicateIds(allQuestions);

  const questions = allQuestions.filter((question) => isValidQuestion(question));
  if (questions.length === 0) {
    console.warn(`[selection] No valid quiz questions available`);
    return null;
  }

  const questionById = new Map<string, Question>();
  for (const question of questions) {
    if (!questionById.has(question.id)) {
      questionById.set(question.id, question);
    }
  }
  const legacySchedule = await getJsonScheduleEntries(new Set(questionById.keys()));

  const firestoreScheduledId = await getScheduledQuestionId(dateKey);
  if (firestoreScheduledId) {
    const scheduled = questionById.get(firestoreScheduledId);
    if (scheduled) {
      console.log(`[selection] schedule source: firestore (${scheduled.id})`);
      return scheduled;
    }
    console.error(
      `[quiz] scheduled question invalid/missing for ${dateKey}: ${firestoreScheduledId}`
    );
  }

  const jsonScheduledId =
    legacySchedule.find((entry) => entry.dateKey === dateKey)?.questionId ?? null;
  if (jsonScheduledId) {
    const scheduled = questionById.get(jsonScheduledId);
    if (scheduled) {
      console.log(`[selection] schedule source: json (${scheduled.id})`);
      return scheduled;
    }
    console.error(
      `[quiz] legacy scheduled question invalid/missing for ${dateKey}: ${jsonScheduledId}`
    );
  }

  const fallback = pickDeterministicFallback(questions, dateKey);
  if (!fallback) {
    return null;
  }

  console.log(`[selection] schedule source: random (${fallback.id})`);
  return fallback;
}

/**
 * Strip correct answer fields from a question for client display.
 * Returns a safe version that doesn't reveal the answer.
 */
export function stripCorrectAnswers(
  question: Question
): Omit<Question, "correctIndex" | "correctIndices" | "acceptedAnswers"> & {
  correctIndex?: never;
  correctIndices?: never;
  acceptedAnswers?: never;
} {
  const { ...base } = question;

  // Remove answer fields based on question type
  if ("correctIndex" in base) {
    const { correctIndex, ...rest } = base;
    return rest as any;
  }
  if ("correctIndices" in base) {
    const { correctIndices, ...rest } = base;
    return rest as any;
  }
  if ("acceptedAnswers" in base) {
    const { acceptedAnswers, ...rest } = base;
    return rest as any;
  }

  return base as any;
}
