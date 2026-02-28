import type { Question } from "../../types/quiz.types";
import { getQuizQuestionById } from "./quiz-questions.repository";
import { getScheduledQuestionId } from "./schedule-firestore.service";

function isValidQuestion(question: Question): boolean {
  if (!question?.id || !question.prompt?.trim()) return false;
  if (typeof question.basePoints !== "number") return false;

  if (question.type === "mcq") {
    return (
      Array.isArray(question.choices) &&
      question.choices.length >= 2 &&
      Number.isInteger(question.correctIndex) &&
      question.correctIndex >= 0 &&
      question.correctIndex < question.choices.length
    );
  }

  if (question.type === "select-all") {
    if (!Array.isArray(question.choices) || question.choices.length < 2) {
      return false;
    }
    if (!Array.isArray(question.correctIndices) || question.correctIndices.length === 0) {
      return false;
    }
    const unique = new Set(question.correctIndices);
    if (unique.size !== question.correctIndices.length) {
      return false;
    }
    return question.correctIndices.every(
      (index) => Number.isInteger(index) && index >= 0 && index < question.choices.length
    );
  }

  return false;
}

export async function getQuestionForDate(dateKey: string): Promise<Question | null> {
  const scheduledQuestionId = await getScheduledQuestionId(dateKey);
  if (!scheduledQuestionId) {
    console.warn(`[selection] no scheduled question for ${dateKey}`);
    return null;
  }

  const record = await getQuizQuestionById(scheduledQuestionId, {
    includeLegacy: true,
  });
  if (!record) {
    console.error(
      `[selection] scheduled question not found for ${dateKey}: ${scheduledQuestionId}`
    );
    return null;
  }

  const { signature, source, questionId, ...question } = record;
  if (!isValidQuestion(question)) {
    console.error(
      `[selection] scheduled question invalid for ${dateKey}: ${scheduledQuestionId}`
    );
    return null;
  }
  return question;
}

export function stripCorrectAnswers(
  question: Question
): Omit<Question, "correctIndex" | "correctIndices" | "acceptedAnswers"> & {
  correctIndex?: never;
  correctIndices?: never;
  acceptedAnswers?: never;
} {
  const { ...base } = question;

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

