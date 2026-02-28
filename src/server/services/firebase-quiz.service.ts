import type { Question } from "../../types/quiz.types";
import {
  getQuizQuestionById,
  listQuizQuestions,
} from "./quiz-questions.repository";

export async function getAllQuizQuestions(): Promise<Question[]> {
  const records = await listQuizQuestions({ includeLegacy: true });
  return records.map(({ signature, source, questionId, ...question }) => question);
}

export async function getQuizQuestionByQuestionId(
  questionId: string
): Promise<Question | null> {
  const record = await getQuizQuestionById(questionId, { includeLegacy: true });
  if (!record) return null;
  const { signature, source, questionId: _, ...question } = record;
  return question;
}

