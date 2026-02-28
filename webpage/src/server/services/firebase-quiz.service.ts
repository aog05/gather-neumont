/**
 * Firebase Quiz Service
 * 
 * Handles fetching Quiz-type puzzles from Firebase and transforming them
 * into the format expected by the current quiz system.
 */

import { FirestoreQueries } from "../../lib/firestore-helpers";
import type { QuizPuzzle, QuizQuestion } from "../../types/firestore.types";
import type { Question } from "../../types/quiz.types";

/**
 * Transform a Firebase QuizQuestion to a quiz choice format
 * Combines correct answer(s) with incorrect options and shuffles them
 */
function transformQuizQuestion(
  fbQuestion: QuizQuestion,
  questionIndex: number
): { choices: string[]; correctIndex?: number; correctIndices?: number[] } {
  if (fbQuestion.type === "one-select") {
    // Single correct answer
    const correctAnswer = fbQuestion.answer!;
    const allChoices = [correctAnswer, ...fbQuestion.other];
    
    // Shuffle choices
    const shuffled = [...allChoices].sort(() => Math.random() - 0.5);
    const correctIndex = shuffled.indexOf(correctAnswer);
    
    return {
      choices: shuffled,
      correctIndex,
    };
  } else {
    // Multiple correct answers
    const correctAnswers = fbQuestion.answers!;
    const allChoices = [...correctAnswers, ...fbQuestion.other];
    
    // Shuffle choices
    const shuffled = [...allChoices].sort(() => Math.random() - 0.5);
    const correctIndices = correctAnswers.map((ans) => shuffled.indexOf(ans));
    
    return {
      choices: shuffled,
      correctIndices,
    };
  }
}

/**
 * Transform a Firebase QuizPuzzle to the current Question format
 * For now, we'll use the first question from the Questions array
 */
export function transformQuizPuzzleToQuestion(
  puzzle: QuizPuzzle,
  questionIndex: number = 0
): Question | null {
  if (!puzzle.Questions || puzzle.Questions.length === 0) {
    console.warn(`[firebase-quiz] Quiz puzzle ${puzzle.id} has no questions`);
    return null;
  }

  // Get the first question (or specified index)
  const fbQuestion = puzzle.Questions[questionIndex];
  if (!fbQuestion) {
    console.warn(`[firebase-quiz] Question index ${questionIndex} not found in puzzle ${puzzle.id}`);
    return null;
  }

  // Transform based on question type
  const transformed = transformQuizQuestion(fbQuestion, questionIndex);

  // Map Firebase quiz type to current quiz type
  const questionType = fbQuestion.type === "one-select" ? "mcq" : "select-all";

  // Create the Question object
  const question: Question = {
    id: `${puzzle.id}_q${questionIndex}`,
    type: questionType,
    prompt: `${puzzle.Name} - Question ${questionIndex + 1}`,
    choices: transformed.choices,
    difficulty: 2, // Default to medium difficulty
    tags: [puzzle.Topic.toLowerCase()],
    basePoints: fbQuestion.SV,
    ...(transformed.correctIndex !== undefined && { correctIndex: transformed.correctIndex }),
    ...(transformed.correctIndices !== undefined && { correctIndices: transformed.correctIndices }),
  };

  console.log(`[firebase-quiz] Transformed question:`, {
    puzzleId: puzzle.id,
    questionId: question.id,
    type: question.type,
    basePoints: question.basePoints,
  });

  return question;
}

/**
 * Get all Quiz-type puzzles from Firebase
 */
export async function getAllQuizPuzzles(): Promise<QuizPuzzle[]> {
  try {
    console.log(`[firebase-quiz] Fetching all Quiz puzzles from Firebase`);
    const puzzles = await FirestoreQueries.getQuizPuzzles();
    
    // Filter to only QuizPuzzle type
    const quizPuzzles = puzzles.filter((p): p is QuizPuzzle => p.Type === "Quiz");
    
    console.log(`[firebase-quiz] Found ${quizPuzzles.length} Quiz puzzles`);
    return quizPuzzles;
  } catch (error) {
    console.error(`[firebase-quiz] Error fetching quiz puzzles:`, error);
    throw error;
  }
}

/**
 * Get all questions from all Quiz puzzles
 * Transforms each quiz question into the current Question format
 */
export async function getAllQuizQuestions(): Promise<Question[]> {
  const puzzles = await getAllQuizPuzzles();
  const questions: Question[] = [];

  for (const puzzle of puzzles) {
    // For now, just use the first question from each puzzle
    // In the future, we could expand this to use all questions
    const question = transformQuizPuzzleToQuestion(puzzle, 0);
    if (question) {
      questions.push(question);
    }
  }

  console.log(`[firebase-quiz] Transformed ${questions.length} questions from ${puzzles.length} puzzles`);
  return questions;
}

/**
 * Get a specific quiz puzzle by ID
 */
export async function getQuizPuzzleById(puzzleId: string): Promise<QuizPuzzle | null> {
  try {
    const puzzles = await getAllQuizPuzzles();
    return puzzles.find((p) => p.id === puzzleId) || null;
  } catch (error) {
    console.error(`[firebase-quiz] Error fetching puzzle ${puzzleId}:`, error);
    return null;
  }
}

