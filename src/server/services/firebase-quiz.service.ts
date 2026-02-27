/**
 * Firebase Quiz Service
 * 
 * Handles fetching Quiz-type puzzles from Firebase and transforming them
 * into the format expected by the current quiz system.
 */

import { FirestoreQueries } from "../../lib/firestore-helpers";
import type { QuizPuzzle, QuizQuestion } from "../../types/firestore.types";
import type { Question } from "../../types/quiz.types";

function isQuizDebugEnabled(): boolean {
  const procValue =
    typeof process !== "undefined" ? process.env.QUIZ_DEBUG : undefined;
  const bunValue =
    typeof Bun !== "undefined" ? Bun.env.QUIZ_DEBUG : undefined;
  return procValue?.trim() === "1" || bunValue?.trim() === "1";
}

type RuntimeQuestionType = "mcq" | "select-all";

function firstNonEmptyString(values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        return trimmed;
      }
    }
  }
  return null;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function resolveQuestionType(fbQuestion: QuizQuestion): RuntimeQuestionType {
  const rawType = typeof (fbQuestion as any).type === "string"
    ? (fbQuestion as any).type.trim().toLowerCase()
    : "";

  if (
    rawType === "mcq" ||
    rawType === "one-select" ||
    rawType === "one_select" ||
    rawType === "single-select" ||
    rawType === "single_select"
  ) {
    return "mcq";
  }

  if (
    rawType === "select-all" ||
    rawType === "select_all" ||
    rawType === "multi-select" ||
    rawType === "multi_select" ||
    rawType === "multiple-choice" ||
    rawType === "multiple_choice"
  ) {
    return "select-all";
  }

  return "mcq";
}

function getPromptCandidates(fbQuestion: QuizQuestion): Array<[string, unknown]> {
  return [
    ["prompt", (fbQuestion as any).prompt],
    ["Prompt", (fbQuestion as any).Prompt],
    ["question", (fbQuestion as any).question],
    ["Question", (fbQuestion as any).Question],
    ["text", (fbQuestion as any).text],
    ["Text", (fbQuestion as any).Text],
    ["statement", (fbQuestion as any).statement],
    ["Statement", (fbQuestion as any).Statement],
    ["label", (fbQuestion as any).label],
    ["Label", (fbQuestion as any).Label],
    ["title", (fbQuestion as any).title],
    ["Title", (fbQuestion as any).Title],
    ["body", (fbQuestion as any).body],
    ["Body", (fbQuestion as any).Body],
    ["name", (fbQuestion as any).name],
    ["Name", (fbQuestion as any).Name],
  ];
}

function resolveQuestionPrompt(
  puzzle: QuizPuzzle,
  fbQuestion: QuizQuestion,
  questionIndex: number
): string {
  const promptCandidates = getPromptCandidates(fbQuestion);
  const questionPrompt = firstNonEmptyString(
    promptCandidates.map(([, value]) => value)
  );

  const puzzleName = firstNonEmptyString([
    (puzzle as any).Name,
    (puzzle as any).name,
  ]);
  const fallbackPrompt = puzzleName
    ? `${puzzleName} - Question ${questionIndex + 1}`
    : `Quiz - Question ${questionIndex + 1}`;
  const resolvedPrompt = questionPrompt ?? fallbackPrompt;

  if (isQuizDebugEnabled()) {
    const candidateStrings = promptCandidates.map(([field, value]) => ({
      field,
      value: typeof value === "string" ? value : null,
    }));
    const fieldKeys = Object.keys(fbQuestion as Record<string, unknown>);
    console.log(`[firebase-quiz][debug] Prompt resolution`, {
      puzzleId: puzzle.id,
      questionIndex,
      fbQuestionKeys: fieldKeys,
      promptCandidates: candidateStrings,
      resolvedPrompt,
    });
  }

  return resolvedPrompt;
}

function resolveBasePoints(puzzle: QuizPuzzle, fbQuestion: QuizQuestion): number {
  if (typeof fbQuestion.SV === "number" && Number.isFinite(fbQuestion.SV)) {
    return fbQuestion.SV;
  }

  const reward = (puzzle as any).Reward;
  if (typeof reward === "number" && Number.isFinite(reward)) {
    return reward;
  }

  return 0;
}

/**
 * Transform a Firebase QuizQuestion to a quiz choice format
 * Combines correct answer(s) with incorrect options and shuffles them
 */
function transformQuizQuestion(
  fbQuestion: QuizQuestion,
  questionType: RuntimeQuestionType
): { choices: string[]; correctIndex?: number; correctIndices?: number[] } {
  if (questionType === "mcq") {
    // Single correct answer
    const answerCandidates = [
      (fbQuestion as any).answer,
      ...normalizeStringArray((fbQuestion as any).answers),
    ];
    const fallbackChoices = normalizeStringArray((fbQuestion as any).other);
    const fallbackCorrect = fallbackChoices[0] ?? "";
    const correctAnswer = firstNonEmptyString(answerCandidates) ?? fallbackCorrect;
    const other = fallbackChoices.filter((choice) => choice !== correctAnswer);
    const allChoices = [correctAnswer, ...other];
    
    // Shuffle choices
    const shuffled = [...allChoices].sort(() => Math.random() - 0.5);
    const correctIndex = shuffled.indexOf(correctAnswer);
    
    return {
      choices: shuffled,
      correctIndex,
    };
  } else {
    // Multiple correct answers
    const correctAnswers = normalizeStringArray((fbQuestion as any).answers);
    if (correctAnswers.length === 0) {
      const single = firstNonEmptyString([(fbQuestion as any).answer]);
      if (single) {
        correctAnswers.push(single);
      }
    }
    const other = normalizeStringArray((fbQuestion as any).other);
    const allChoices = [...correctAnswers, ...other];
    
    // Shuffle choices
    const shuffled = [...allChoices].sort(() => Math.random() - 0.5);
    const correctIndices = correctAnswers
      .map((ans) => shuffled.indexOf(ans))
      .filter((index) => index >= 0);
    
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
  const questionType = resolveQuestionType(fbQuestion);
  const transformed = transformQuizQuestion(fbQuestion, questionType);

  const resolvedPrompt = resolveQuestionPrompt(puzzle, fbQuestion, questionIndex);
  const basePoints = resolveBasePoints(puzzle, fbQuestion);
  const topic =
    typeof puzzle.Topic === "string" && puzzle.Topic.trim().length > 0
      ? puzzle.Topic.trim().toLowerCase()
      : "quiz";

  // Create the Question object
  const question: Question = {
    id: `${puzzle.id}_q${questionIndex}`,
    type: questionType,
    prompt: resolvedPrompt,
    choices: transformed.choices,
    difficulty: 2, // Default to medium difficulty
    tags: [topic],
    basePoints,
    ...(transformed.correctIndex !== undefined && { correctIndex: transformed.correctIndex }),
    ...(transformed.correctIndices !== undefined && { correctIndices: transformed.correctIndices }),
  };

  console.log(`[firebase-quiz] Transformed question:`, {
    puzzleId: puzzle.id,
    questionId: question.id,
    rawType: (fbQuestion as any).type,
    type: question.type,
    prompt: question.prompt,
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

