/**
 * Answer checking service for all question types.
 * Handles MCQ, select-all, and written response validation.
 */

import type { Question } from "../../types/quiz.types";

export interface AnswerCheckResult {
  correct: boolean;
  /** For MCQ: the index the user selected */
  selectedIndex?: number;
  /** For select-all: the indices the user selected */
  selectedIndices?: number[];
  /** For written: the normalized answer the user provided */
  normalizedAnswer?: string;
}

/**
 * Normalize a written answer: trim, lowercase, collapse multiple spaces.
 */
export function normalizeWrittenAnswer(answer: string): string {
  return answer.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Check an MCQ answer.
 */
export function checkMcqAnswer(
  question: Question & { type: "mcq" },
  selectedIndex: number
): AnswerCheckResult {
  return {
    correct: selectedIndex === question.correctIndex,
    selectedIndex,
  };
}

/**
 * Check a select-all answer.
 * Order-independent comparison of selected indices.
 */
export function checkSelectAllAnswer(
  question: Question & { type: "select-all" },
  selectedIndices: number[]
): AnswerCheckResult {
  const correctSet = new Set(question.correctIndices);
  const selectedSet = new Set(selectedIndices);

  // Must have same size and all elements match
  const correct =
    correctSet.size === selectedSet.size &&
    [...correctSet].every((idx) => selectedSet.has(idx));

  return {
    correct,
    selectedIndices,
  };
}

/**
 * Check a written answer against accepted answers.
 */
export function checkWrittenAnswer(
  question: Question & { type: "written" },
  answer: string
): AnswerCheckResult {
  const normalized = normalizeWrittenAnswer(answer);

  // Check against all accepted answers (also normalized)
  const correct = question.acceptedAnswers.some(
    (accepted) => normalizeWrittenAnswer(accepted) === normalized
  );

  return {
    correct,
    normalizedAnswer: normalized,
  };
}

/**
 * Main answer checker - dispatches to type-specific checker.
 */
export function checkAnswer(
  question: Question,
  answer: unknown
): AnswerCheckResult {
  switch (question.type) {
    case "mcq": {
      if (typeof answer !== "number" && typeof answer !== "object") {
        return { correct: false, selectedIndex: -1 };
      }
      // Support both { selectedIndex: n } and just n
      const selectedIndex =
        typeof answer === "number"
          ? answer
          : (answer as { selectedIndex?: number }).selectedIndex ?? -1;
      return checkMcqAnswer(
        question as Question & { type: "mcq" },
        selectedIndex
      );
    }

    case "select-all": {
      if (!answer || typeof answer !== "object") {
        return { correct: false, selectedIndices: [] };
      }
      const selectedIndices = Array.isArray(answer)
        ? answer
        : (answer as { selectedIndices?: number[] }).selectedIndices ?? [];
      return checkSelectAllAnswer(
        question as Question & { type: "select-all" },
        selectedIndices
      );
    }

    case "written": {
      if (typeof answer !== "string" && typeof answer !== "object") {
        return { correct: false, normalizedAnswer: "" };
      }
      const text =
        typeof answer === "string"
          ? answer
          : (answer as { text?: string }).text ?? "";
      return checkWrittenAnswer(
        question as Question & { type: "written" },
        text
      );
    }

    default:
      return { correct: false };
  }
}
