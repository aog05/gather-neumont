/**
 * Quiz API endpoints.
 * GET  /api/quiz/today  - Check if there's a quiz available today
 * POST /api/quiz/start  - Start today's quiz and get the question
 * POST /api/quiz/submit - Submit an answer for today's quiz
 * POST /api/quiz/practice/start  - Start practice quiz (non-persistent)
 * POST /api/quiz/practice/submit - Submit practice answer (non-persistent)
 *
 * UPDATED: Now integrates with Firebase for quiz completion persistence
 */

import { getMountainDateKey } from "../utils/timezone";
import {
  getQuestionForDate,
  stripCorrectAnswers,
} from "../services/selection.service";
import {
  markQuizStarted,
  hasStartedQuiz,
  getGuestAttempt,
  updateGuestAttempt,
} from "../data/guest-sessions";
import { checkAnswer } from "../services/answer-checker.service";
import { calculatePoints } from "../services/scoring.service";
import type { Question } from "../../types/quiz.types";
import { getSessionUserFromRequest } from "./auth";
import { doc, getDoc } from "firebase/firestore";
import { db, COLLECTIONS } from "../../lib/firebase";
import {
  getPlayerQuizCompletionForDate,
  recordPlayerQuizCompletion,
} from "../services/player-leaderboard.service";

const userAttemptCounts = new Map<string, number>();
const isQuizDebugEnabled = process.env.QUIZ_DEBUG === "1";

function logQuizDebug(payload: {
  playerId: string;
  dateKey: string;
  pointsAwarded: number;
  alreadyCompleted: boolean;
  totalPoints: number;
  streakDays: number;
}): void {
  if (!isQuizDebugEnabled) return;
  console.log("[quiz][debug] submit", payload);
}

function parseNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

function isMissingField(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string" && value.trim().length === 0) return true;
  return false;
}

async function getPlayerSubmitSummary(playerId: string): Promise<{
  totalPoints: number;
  streakDays: number;
}> {
  const playerRef = doc(db, COLLECTIONS.PLAYER, playerId);
  const playerSnap = await getDoc(playerRef);
  if (!playerSnap.exists()) {
    return { totalPoints: 0, streakDays: 0 };
  }

  const data = playerSnap.data() as Record<string, unknown>;
  const totalPoints = isMissingField(data.totalPoints)
    ? parseNumber(data.Wallet, 0)
    : parseNumber(data.totalPoints, 0);
  const streakDays = parseNumber(data.streakDays, 0);
  return { totalPoints, streakDays };
}

function getAttemptKey(userId: string, dateKey: string): string {
  return `${userId}|${dateKey}`;
}

/**
 * GET /api/quiz/today
 * Returns whether there's a quiz available today.
 */
export async function handleGetToday(req: Request): Promise<Response> {
  const dateKey = getMountainDateKey();
  const question = await getQuestionForDate(dateKey);
  const sessionUser = getSessionUserFromRequest(req);
  const sessionUserId = sessionUser?.userId ?? null;
  const isAdmin = sessionUser?.isAdmin ?? false;
  const completion =
    sessionUserId && !isAdmin
      ? await getPlayerQuizCompletionForDate(sessionUserId, dateKey)
      : null;

  if (!question) {
    return Response.json({
      hasQuiz: false,
      quizDate: dateKey,
      message: "No questions available",
    });
  }

  return Response.json({
    hasQuiz: true,
    quizDate: dateKey,
    questionId: question.id,
    ...(completion
      ? {
          alreadyCompleted: true,
          pointsEarned: completion.pointsAwarded,
          completedAt: completion.createdAt,
        }
      : {}),
  });
}

/**
 * POST /api/quiz/start
 * Start today's quiz and return the question (without correct answers).
 * Body: { guestToken: string } or { userId: string }
 */
export async function handleStartQuiz(req: Request): Promise<Response> {
  // Parse request body
  let body: { guestToken?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { guestToken } = body;
  const sessionUser = getSessionUserFromRequest(req);
  const resolvedUserId = sessionUser?.userId ?? null;
  const resolvedGuestToken = resolvedUserId ? null : guestToken?.trim();
  const isAdmin = sessionUser?.isAdmin ?? false;

  if (!resolvedUserId && !resolvedGuestToken) {
    return Response.json(
      { error: "guestToken is required for guest sessions" },
      { status: 400 }
    );
  }

  const dateKey = getMountainDateKey();
  const question = await getQuestionForDate(dateKey);

  if (!question) {
    return Response.json(
      { error: "No quiz available today", quizDate: dateKey },
      { status: 404 }
    );
  }

  if (resolvedGuestToken) {
    const attemptData = getGuestAttempt(resolvedGuestToken, dateKey);
    if (attemptData?.solved) {
      console.log(
        `[quiz] alreadyCompleted start blocked dateKey=${dateKey} guestToken=${resolvedGuestToken}`
      );
      return Response.json({
        alreadyCompleted: true,
        quizDate: dateKey,
        message: "You already completed today's quiz.",
      });
    }
  }

  if (resolvedUserId && !isAdmin) {
    const completion = await getPlayerQuizCompletionForDate(
      resolvedUserId,
      dateKey
    );
    if (completion) {
      console.log(
        `[quiz] alreadyCompleted start blocked dateKey=${dateKey} userId=${resolvedUserId}`
      );
      return Response.json({
        alreadyCompleted: true,
        quizDate: dateKey,
        pointsEarned: completion.pointsAwarded,
        completedAt: completion.createdAt,
        message: "You already completed today's quiz.",
      });
    }
  }

  // Track that this guest/user has started the quiz
  if (resolvedGuestToken) {
    markQuizStarted(resolvedGuestToken, dateKey, question.id);
  }
  if (resolvedUserId) {
    const attemptKey = getAttemptKey(resolvedUserId, dateKey);
    if (!userAttemptCounts.has(attemptKey)) {
      userAttemptCounts.set(attemptKey, 0);
    }
  }

  // Return question without correct answers
  const safeQuestion = stripCorrectAnswers(question);

  return Response.json({
    quizDate: dateKey,
    question: safeQuestion,
    alreadyStarted: resolvedGuestToken
      ? hasStartedQuiz(resolvedGuestToken, dateKey)
      : false,
  });
}

/**
 * Get correct answer info to include in successful response.
 */
function getCorrectAnswerInfo(question: Question): Record<string, unknown> {
  switch (question.type) {
    case "mcq":
      return { correctIndex: question.correctIndex };
    case "select-all":
      return { correctIndices: question.correctIndices };
    default:
      return {};
  }
}

/**
 * POST /api/quiz/practice/start
 * Start today's practice quiz and return the question.
 * Body: { guestToken?: string }
 *
 * IMPORTANT: Practice mode does not persist progress/completions.
 */
export async function handleStartPracticeQuiz(req: Request): Promise<Response> {
  let body: { guestToken?: string } = {};
  try {
    body = await req.json();
  } catch {
    // Body is optional for authenticated sessions.
  }

  const sessionUser = getSessionUserFromRequest(req);
  const resolvedUserId = sessionUser?.userId ?? null;
  const resolvedGuestToken = resolvedUserId ? null : body.guestToken?.trim();
  if (!resolvedUserId && !resolvedGuestToken) {
    return Response.json(
      { error: "guestToken is required for guest sessions" },
      { status: 400 }
    );
  }

  const dateKey = getMountainDateKey();
  const question = await getQuestionForDate(dateKey);
  if (!question) {
    return Response.json(
      { error: "No quiz available today", quizDate: dateKey },
      { status: 404 }
    );
  }

  return Response.json({
    quizDate: dateKey,
    question: stripCorrectAnswers(question),
    alreadyStarted: false,
  });
}

/**
 * POST /api/quiz/practice/submit
 * Submit an answer for practice mode.
 * Body: { guestToken: string, questionId: string, answer: unknown, elapsedMs: number }
 *
 * IMPORTANT: Practice mode does not persist progress/completions.
 */
export async function handleSubmitPracticeQuiz(req: Request): Promise<Response> {
  let body: {
    guestToken?: string;
    questionId: string;
    answer: unknown;
    elapsedMs: number;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { guestToken, questionId, answer, elapsedMs } = body;
  const sessionUser = getSessionUserFromRequest(req);
  const resolvedUserId = sessionUser?.userId ?? null;
  const resolvedGuestToken = resolvedUserId ? null : guestToken?.trim();

  if (!resolvedUserId && !resolvedGuestToken) {
    return Response.json(
      { error: "guestToken is required for guest sessions" },
      { status: 400 }
    );
  }
  if (!questionId) {
    return Response.json({ error: "questionId is required" }, { status: 400 });
  }
  if (answer === undefined) {
    return Response.json({ error: "answer is required" }, { status: 400 });
  }
  if (typeof elapsedMs !== "number") {
    return Response.json(
      { error: "elapsedMs must be a number" },
      { status: 400 }
    );
  }

  const dateKey = getMountainDateKey();
  const todayQuestion = await getQuestionForDate(dateKey);
  if (!todayQuestion) {
    return Response.json(
      { error: "No quiz available today", quizDate: dateKey },
      { status: 404 }
    );
  }

  if (questionId !== todayQuestion.id) {
    const safeQuestion = stripCorrectAnswers(todayQuestion);
    return Response.json({
      error: "Question has rolled over",
      rollover: true,
      quizDate: dateKey,
      newQuestion: safeQuestion,
    });
  }

  const attemptNumber = 1;
  const checkResult = checkAnswer(todayQuestion, answer);
  if (!checkResult.correct) {
    const feedback: Record<string, unknown> = {};
    if (todayQuestion.type === "mcq" && checkResult.selectedIndex !== undefined) {
      feedback.wrongIndex = checkResult.selectedIndex;
    }
    if (todayQuestion.type === "select-all" && checkResult.selectedIndices) {
      feedback.selectedIndices = checkResult.selectedIndices;
    }

    return Response.json({
      correct: false,
      attemptNumber,
      feedback,
      quizDate: dateKey,
    });
  }

  const pointsBreakdown = calculatePoints(
    todayQuestion.basePoints,
    attemptNumber,
    elapsedMs
  );
  const correctAnswerInfo = getCorrectAnswerInfo(todayQuestion);
  return Response.json({
    correct: true,
    attemptNumber,
    alreadyCompleted: false,
    pointsEarned: pointsBreakdown.totalPoints,
    pointsBreakdown,
    explanation: todayQuestion.explanation,
    ...correctAnswerInfo,
    quizDate: dateKey,
  });
}

/**
 * POST /api/quiz/submit
 * Submit an answer for today's quiz.
 * Body: { guestToken: string, questionId: string, answer: unknown, elapsedMs: number }
 */
export async function handleSubmitQuiz(req: Request): Promise<Response> {
  // Parse request body
  let body: {
    guestToken?: string;
    questionId: string;
    answer: unknown;
    elapsedMs: number;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { guestToken, questionId, answer, elapsedMs } = body;
  const sessionUser = getSessionUserFromRequest(req);
  const resolvedUserId = sessionUser?.userId ?? null;
  const resolvedGuestToken = resolvedUserId ? null : guestToken?.trim();
  const isAdmin = sessionUser?.isAdmin ?? false;

  // Validate required fields
  if (!resolvedUserId && !resolvedGuestToken) {
    return Response.json(
      { error: "guestToken is required for guest sessions" },
      { status: 400 }
    );
  }
  if (!questionId) {
    return Response.json({ error: "questionId is required" }, { status: 400 });
  }
  if (answer === undefined) {
    return Response.json({ error: "answer is required" }, { status: 400 });
  }
  if (typeof elapsedMs !== "number") {
    return Response.json(
      { error: "elapsedMs must be a number" },
      { status: 400 }
    );
  }

  // Determine quiz date at SUBMIT time (Mountain Time)
  const dateKey = getMountainDateKey();
  const todayQuestion = await getQuestionForDate(dateKey);

  if (!todayQuestion) {
    return Response.json(
      { error: "No quiz available today", quizDate: dateKey },
      { status: 404 }
    );
  }

  // Check for day rollover - if submitted questionId doesn't match today's
  if (questionId !== todayQuestion.id) {
    const safeQuestion = stripCorrectAnswers(todayQuestion);
    return Response.json({
      error: "Question has rolled over",
      rollover: true,
      quizDate: dateKey,
      newQuestion: safeQuestion,
    });
  }

  // Get current attempt state for this guest
  let attemptData = resolvedGuestToken
    ? getGuestAttempt(resolvedGuestToken, dateKey)
    : null;

  // Check if already solved
  if (attemptData?.solved) {
    if (isQuizDebugEnabled) {
      console.log(
        `[quiz] alreadyCompleted submit blocked dateKey=${dateKey} guestToken=${resolvedGuestToken}`
      );
    }
    return Response.json({
      alreadyCompleted: true,
      quizDate: dateKey,
      totalPoints: null,
      streakDays: null,
      completedAt: null,
      canRetry: false,
      message: "You already completed today's quiz.",
    });
  }

  if (resolvedUserId && !isAdmin) {
    const completion = await getPlayerQuizCompletionForDate(
      resolvedUserId,
      dateKey
    );
    if (completion) {
      const summary = await getPlayerSubmitSummary(resolvedUserId);
      if (isQuizDebugEnabled) {
        console.log(
          `[quiz] alreadyCompleted submit blocked dateKey=${dateKey} userId=${resolvedUserId}`
        );
      }
      logQuizDebug({
        playerId: resolvedUserId,
        dateKey,
        pointsAwarded: completion.pointsAwarded,
        alreadyCompleted: true,
        totalPoints: summary.totalPoints,
        streakDays: summary.streakDays,
      });
      return Response.json({
        alreadyCompleted: true,
        quizDate: dateKey,
        pointsEarned: completion.pointsAwarded,
        totalPoints: summary.totalPoints,
        streakDays: summary.streakDays,
        completedAt: completion.createdAt,
        canRetry: false,
        message: "You already completed today's quiz.",
      });
    }
  }

  // Increment attempt count
  const attemptNumber = resolvedUserId
    ? (userAttemptCounts.get(getAttemptKey(resolvedUserId, dateKey)) ?? 0) + 1
    : (attemptData?.attemptCount ?? 0) + 1;

  // Check the answer
  const checkResult = checkAnswer(todayQuestion, answer);
  if (isQuizDebugEnabled) {
    console.log(`[quiz] 🔍 Answer check:`, {
      questionId: todayQuestion.id,
      questionType: todayQuestion.type,
      answer,
      checkResult,
      attemptNumber,
    });
  }

  if (!checkResult.correct) {
    // Update attempt count in session
    if (resolvedGuestToken) {
      updateGuestAttempt(resolvedGuestToken, dateKey, {
        questionId: todayQuestion.id,
        attemptCount: attemptNumber,
        solved: false,
        solvedOnAttempt: null,
        elapsedMs: null,
      });
    }
    if (resolvedUserId) {
      userAttemptCounts.set(getAttemptKey(resolvedUserId, dateKey), attemptNumber);
    }

    // Build feedback based on question type
    const feedback: Record<string, unknown> = {};
    if (todayQuestion.type === "mcq" && checkResult.selectedIndex !== undefined) {
      feedback.wrongIndex = checkResult.selectedIndex;
    }
    if (todayQuestion.type === "select-all" && checkResult.selectedIndices) {
      feedback.selectedIndices = checkResult.selectedIndices;
    }

    return Response.json({
      correct: false,
      attemptNumber,
      feedback,
      quizDate: dateKey,
    });
  }

  // Correct answer!
  const pointsBreakdown = calculatePoints(
    todayQuestion.basePoints,
    attemptNumber,
    elapsedMs
  );

  // Update session with solved state
  if (resolvedGuestToken) {
    updateGuestAttempt(resolvedGuestToken, dateKey, {
      questionId: todayQuestion.id,
      attemptCount: attemptNumber,
      solved: true,
      solvedOnAttempt: attemptNumber,
      elapsedMs,
    });
  }
  let completionResult: Awaited<
    ReturnType<typeof recordPlayerQuizCompletion>
  > | null = null;
  if (resolvedUserId && !isAdmin) {
    completionResult = await recordPlayerQuizCompletion({
      playerId: resolvedUserId,
      dateKey,
      displayName: sessionUser?.username ?? resolvedUserId,
      pointsAwarded: pointsBreakdown.totalPoints,
    });

    if (completionResult.alreadyCompleted) {
      userAttemptCounts.delete(getAttemptKey(resolvedUserId, dateKey));
      if (isQuizDebugEnabled) {
        console.log(
          `[quiz] alreadyCompleted submit blocked by transaction dateKey=${dateKey} userId=${resolvedUserId}`
        );
      }
      logQuizDebug({
        playerId: resolvedUserId,
        dateKey,
        pointsAwarded: completionResult.completion.pointsAwarded,
        alreadyCompleted: true,
        totalPoints: completionResult.totalPoints,
        streakDays: completionResult.streakDays,
      });
      return Response.json({
        alreadyCompleted: true,
        quizDate: dateKey,
        canRetry: false,
        pointsEarned: completionResult.completion.pointsAwarded,
        totalPoints: completionResult.totalPoints,
        streakDays: completionResult.streakDays,
        completedAt: completionResult.completion.createdAt,
        message: "You already completed today's quiz.",
      });
    }

    logQuizDebug({
      playerId: resolvedUserId,
      dateKey,
      pointsAwarded: completionResult.completion.pointsAwarded,
      alreadyCompleted: false,
      totalPoints: completionResult.totalPoints,
      streakDays: completionResult.streakDays,
    });
  }
  if (resolvedUserId) {
    userAttemptCounts.delete(getAttemptKey(resolvedUserId, dateKey));
  }

  // Include correct answer info only on correct response
  const correctAnswerInfo = getCorrectAnswerInfo(todayQuestion);

  return Response.json({
    correct: true,
    attemptNumber,
    alreadyCompleted: false,
    pointsEarned: pointsBreakdown.totalPoints,
    totalPoints: completionResult?.totalPoints ?? null,
    streakDays: completionResult?.streakDays ?? null,
    completedAt: completionResult?.completion.createdAt ?? null,
    pointsBreakdown,
    explanation: todayQuestion.explanation,
    ...correctAnswerInfo,
    quizDate: dateKey,
  });
}

/**
 * Main quiz API router.
 * Routes requests to appropriate handlers.
 */
export async function handleQuizApi(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method;

  // GET /api/quiz/today
  if (method === "GET" && path === "/api/quiz/today") {
    return handleGetToday(req);
  }

  // POST /api/quiz/start
  if (method === "POST" && path === "/api/quiz/start") {
    return handleStartQuiz(req);
  }

  // POST /api/quiz/practice/start
  if (method === "POST" && path === "/api/quiz/practice/start") {
    return handleStartPracticeQuiz(req);
  }

  // POST /api/quiz/submit
  if (method === "POST" && path === "/api/quiz/submit") {
    return handleSubmitQuiz(req);
  }

  // POST /api/quiz/practice/submit
  if (method === "POST" && path === "/api/quiz/practice/submit") {
    return handleSubmitPracticeQuiz(req);
  }

  // 404 for unknown quiz endpoints
  return Response.json(
    { error: "Not found", path },
    { status: 404 }
  );
}
