/**
 * Daily question selection service.
 * Deterministically selects a question for a given date.
 */

import { getAllQuestions } from "../data/questions.store";
import {
  addScheduleEntry,
  getScheduleEntries,
} from "../data/schedule.store";
import type { Question } from "../../types/quiz.types";

const BASE_POINTS_BY_DIFFICULTY: Record<number, number> = {
  1: 100,
  2: 150,
  3: 200,
};

function isValidQuestion(question: Question): boolean {
  if (!question?.id) {
    return false;
  }
  if (typeof question.basePoints !== "number") {
    return false;
  }
  const expectedBase = BASE_POINTS_BY_DIFFICULTY[question.difficulty];
  if (expectedBase && question.basePoints !== expectedBase) {
    console.warn(
      `[quiz] basePoints mismatch for ${question.id}: ${question.basePoints} != ${expectedBase}`
    );
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
      if (!Array.isArray(question.choices) || question.choices.length !== 5) {
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
        (index) => Number.isInteger(index) && index >= 0 && index < 5
      );
    case "written":
      return (
        Array.isArray(question.acceptedAnswers) &&
        question.acceptedAnswers.length > 0
      );
    default:
      return false;
  }
}

function getQuestionSortKey(question: Question): number {
  const match = /^q(\d+)$/i.exec(question.id);
  if (!match) return Number.MAX_SAFE_INTEGER;
  return Number.parseInt(match[1], 10);
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
 * Uses schedule-based selection (write-once per date).
 * Returns null if no questions are available.
 */
export async function getQuestionForDate(
  dateKey: string
): Promise<Question | null> {
  const questions = await getAllQuestions();

  if (questions.length === 0) {
    return null;
  }

  logDuplicateIds(questions);

  const scheduleEntries = await getScheduleEntries();
  const todayEntry = scheduleEntries.find(
    (entry) => entry.dateKey === dateKey
  );

  if (todayEntry) {
    const scheduled = questions.find(
      (question) => question.id === todayEntry.questionId
    );
    if (scheduled && isValidQuestion(scheduled)) {
      return scheduled;
    }
    console.error(
      `[quiz] scheduled question invalid/missing for ${dateKey}: ${todayEntry.questionId}`
    );
  }

  const scheduledIds = new Set(scheduleEntries.map((entry) => entry.questionId));
  const ordered = [...questions].sort((a, b) => {
    const aKey = getQuestionSortKey(a);
    const bKey = getQuestionSortKey(b);
    if (aKey !== bKey) return aKey - bKey;
    return a.id.localeCompare(b.id);
  });

  const nextQuestion = ordered.find(
    (question) =>
      !scheduledIds.has(question.id) && isValidQuestion(question)
  );

  if (!nextQuestion) {
    return null;
  }

  if (!todayEntry) {
    await addScheduleEntry({
      dateKey,
      questionId: nextQuestion.id,
      assignedAt: new Date().toISOString(),
    });
  }

  return nextQuestion;
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
