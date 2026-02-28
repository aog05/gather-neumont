import { getMountainDateKey } from "../utils/timezone";
import { getQuestionForDate, stripCorrectAnswers } from "../services/selection.service";
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
import { getQuizQuestionByQuestionId } from "../services/firebase-quiz.service";

const PRACTICE_ATTEMPT_TTL_MS = 30 * 60 * 1000;
const userAttemptCounts = new Map<string, number>();
const isQuizDebugEnabled = process.env.QUIZ_DEBUG === "1";

type PracticeAttemptOwnerType = "user" | "guest";

type PracticeAttemptRecord = {
  practiceAttemptId: string;
  questionId: string;
  ownerType: PracticeAttemptOwnerType;
  ownerId: string;
  createdAtMs: number;
  expiresAtMs: number;
  attemptCount: number;
};

const practiceAttempts = new Map<string, PracticeAttemptRecord>();

function jsonError(
  status: number,
  code: string,
  message: string,
  extra?: Record<string, unknown>
): Response {
  return Response.json(
    {
      code,
      message,
      ...(extra ?? {}),
    },
    { status }
  );
}

function cleanupExpiredPracticeAttempts(nowMs: number): void {
  for (const [attemptId, attempt] of practiceAttempts.entries()) {
    if (attempt.expiresAtMs <= nowMs) {
      practiceAttempts.delete(attemptId);
    }
  }
}

function createPracticeAttempt(
  questionId: string,
  ownerType: PracticeAttemptOwnerType,
  ownerId: string
): PracticeAttemptRecord {
  const nowMs = Date.now();
  const practiceAttemptId = crypto.randomUUID();
  const attempt: PracticeAttemptRecord = {
    practiceAttemptId,
    questionId,
    ownerType,
    ownerId,
    createdAtMs: nowMs,
    expiresAtMs: nowMs + PRACTICE_ATTEMPT_TTL_MS,
    attemptCount: 0,
  };
  practiceAttempts.set(practiceAttemptId, attempt);
  return attempt;
}

function getAttemptKey(userId: string, dateKey: string): string {
  return `${userId}|${dateKey}`;
}

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
  const playerSnap = await getDoc(doc(db, COLLECTIONS.PLAYER, playerId));
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

function resolveOwner(req: Request, guestToken?: string): {
  ownerType: PracticeAttemptOwnerType;
  ownerId: string;
  userId: string | null;
  isAdmin: boolean;
  username: string | null;
  guestToken: string | null;
} | null {
  const sessionUser = getSessionUserFromRequest(req);
  if (sessionUser?.userId) {
    return {
      ownerType: "user",
      ownerId: sessionUser.userId,
      userId: sessionUser.userId,
      isAdmin: sessionUser.isAdmin,
      username: sessionUser.username,
      guestToken: null,
    };
  }

  const normalizedGuestToken = guestToken?.trim();
  if (!normalizedGuestToken) {
    return null;
  }

  return {
    ownerType: "guest",
    ownerId: normalizedGuestToken,
    userId: null,
    isAdmin: false,
    username: null,
    guestToken: normalizedGuestToken,
  };
}

/**
 * GET /api/quiz/today
 * Returns whether there is a scheduled quiz available today.
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
      code: "NO_QUIZ_SCHEDULED_TODAY",
      message: "No quiz scheduled today",
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
 */
export async function handleStartQuiz(req: Request): Promise<Response> {
  let body: { guestToken?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Invalid JSON body");
  }

  const owner = resolveOwner(req, body.guestToken);
  if (!owner) {
    return jsonError(
      400,
      "MISSING_GUEST_TOKEN",
      "guestToken is required for guest sessions"
    );
  }

  const dateKey = getMountainDateKey();
  const question = await getQuestionForDate(dateKey);
  if (!question) {
    return jsonError(404, "NO_QUIZ_SCHEDULED_TODAY", "No quiz scheduled today", {
      quizDate: dateKey,
    });
  }

  if (owner.guestToken) {
    const attemptData = getGuestAttempt(owner.guestToken, dateKey);
    if (attemptData?.solved) {
      return Response.json({
        alreadyCompleted: true,
        quizDate: dateKey,
        message: "You already completed today's quiz.",
      });
    }
  }

  if (owner.userId && !owner.isAdmin) {
    const completion = await getPlayerQuizCompletionForDate(owner.userId, dateKey);
    if (completion) {
      return Response.json({
        alreadyCompleted: true,
        quizDate: dateKey,
        pointsEarned: completion.pointsAwarded,
        completedAt: completion.createdAt,
        message: "You already completed today's quiz.",
      });
    }
  }

  if (owner.guestToken) {
    markQuizStarted(owner.guestToken, dateKey, question.id);
  }
  if (owner.userId) {
    const attemptKey = getAttemptKey(owner.userId, dateKey);
    if (!userAttemptCounts.has(attemptKey)) {
      userAttemptCounts.set(attemptKey, 0);
    }
  }

  return Response.json({
    quizDate: dateKey,
    question: stripCorrectAnswers(question),
    alreadyStarted: owner.guestToken
      ? hasStartedQuiz(owner.guestToken, dateKey)
      : false,
  });
}

/**
 * POST /api/quiz/practice/start
 * Request: { guestToken?: string, questionId?: string }
 */
export async function handleStartPracticeQuiz(req: Request): Promise<Response> {
  let body: { guestToken?: string; questionId?: string } = {};
  try {
    body = await req.json();
  } catch {
    // body optional
  }

  const owner = resolveOwner(req, body.guestToken);
  if (!owner) {
    return jsonError(
      400,
      "MISSING_GUEST_TOKEN",
      "guestToken is required for guest sessions"
    );
  }

  const requestedQuestionId = body.questionId?.trim() ?? "";
  if (requestedQuestionId && !owner.isAdmin) {
    return jsonError(
      403,
      "PRACTICE_QUESTION_ID_FORBIDDEN",
      "questionId override is admin-only"
    );
  }

  const dateKey = getMountainDateKey();
  const question = requestedQuestionId
    ? await getQuizQuestionByQuestionId(requestedQuestionId)
    : await getQuestionForDate(dateKey);

  if (!question) {
    if (requestedQuestionId) {
      return jsonError(404, "QUESTION_NOT_FOUND", "Question not found", {
        questionId: requestedQuestionId,
        quizDate: dateKey,
      });
    }
    return jsonError(404, "NO_QUIZ_SCHEDULED_TODAY", "No quiz scheduled today", {
      quizDate: dateKey,
    });
  }

  cleanupExpiredPracticeAttempts(Date.now());
  const attempt = createPracticeAttempt(question.id, owner.ownerType, owner.ownerId);

  return Response.json({
    quizDate: dateKey,
    question: stripCorrectAnswers(question),
    alreadyStarted: false,
    practiceAttemptId: attempt.practiceAttemptId,
    source: requestedQuestionId ? "question-id" : "scheduled-today",
  });
}

/**
 * POST /api/quiz/practice/submit
 * Request: { guestToken?: string, practiceAttemptId: string, answer: unknown, elapsedMs: number }
 */
export async function handleSubmitPracticeQuiz(req: Request): Promise<Response> {
  let body: {
    guestToken?: string;
    practiceAttemptId?: string;
    answer?: unknown;
    elapsedMs?: number;
  };
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Invalid JSON body");
  }

  const owner = resolveOwner(req, body.guestToken);
  if (!owner) {
    return jsonError(
      400,
      "MISSING_GUEST_TOKEN",
      "guestToken is required for guest sessions"
    );
  }

  const practiceAttemptId = body.practiceAttemptId?.trim();
  if (!practiceAttemptId) {
    return jsonError(
      400,
      "MISSING_PRACTICE_ATTEMPT_ID",
      "practiceAttemptId is required"
    );
  }
  if (body.answer === undefined) {
    return jsonError(400, "MISSING_ANSWER", "answer is required");
  }
  if (typeof body.elapsedMs !== "number") {
    return jsonError(400, "INVALID_ELAPSED_MS", "elapsedMs must be a number");
  }

  const nowMs = Date.now();
  cleanupExpiredPracticeAttempts(nowMs);

  const attempt = practiceAttempts.get(practiceAttemptId);
  if (!attempt) {
    return jsonError(
      404,
      "PRACTICE_ATTEMPT_NOT_FOUND",
      "Practice attempt not found"
    );
  }
  if (attempt.expiresAtMs <= nowMs) {
    practiceAttempts.delete(practiceAttemptId);
    return jsonError(409, "PRACTICE_ATTEMPT_EXPIRED", "Practice attempt expired");
  }
  if (attempt.ownerType !== owner.ownerType || attempt.ownerId !== owner.ownerId) {
    return jsonError(
      403,
      "PRACTICE_ATTEMPT_OWNER_MISMATCH",
      "Practice attempt does not belong to this session"
    );
  }

  const question = await getQuizQuestionByQuestionId(attempt.questionId);
  if (!question) {
    return jsonError(404, "QUESTION_NOT_FOUND", "Question not found", {
      questionId: attempt.questionId,
    });
  }

  attempt.attemptCount += 1;
  const attemptNumber = attempt.attemptCount;
  const checkResult = checkAnswer(question, body.answer);

  if (!checkResult.correct) {
    const feedback: Record<string, unknown> = {};
    if (question.type === "mcq" && checkResult.selectedIndex !== undefined) {
      feedback.wrongIndex = checkResult.selectedIndex;
    }
    if (question.type === "select-all" && checkResult.selectedIndices) {
      feedback.selectedIndices = checkResult.selectedIndices;
    }
    return Response.json({
      correct: false,
      attemptNumber,
      feedback,
      quizDate: getMountainDateKey(),
      practiceAttemptId,
    });
  }

  const pointsBreakdown = calculatePoints(
    question.basePoints,
    attemptNumber,
    body.elapsedMs
  );
  return Response.json({
    correct: true,
    attemptNumber,
    alreadyCompleted: false,
    pointsEarned: pointsBreakdown.totalPoints,
    pointsBreakdown,
    explanation: question.explanation,
    ...getCorrectAnswerInfo(question),
    quizDate: getMountainDateKey(),
    practiceAttemptId,
  });
}

/**
 * POST /api/quiz/submit
 */
export async function handleSubmitQuiz(req: Request): Promise<Response> {
  let body: {
    guestToken?: string;
    questionId?: string;
    answer?: unknown;
    elapsedMs?: number;
  };
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Invalid JSON body");
  }

  const owner = resolveOwner(req, body.guestToken);
  if (!owner) {
    return jsonError(
      400,
      "MISSING_GUEST_TOKEN",
      "guestToken is required for guest sessions"
    );
  }
  const questionId = body.questionId?.trim();
  if (!questionId) {
    return jsonError(400, "MISSING_QUESTION_ID", "questionId is required");
  }
  if (body.answer === undefined) {
    return jsonError(400, "MISSING_ANSWER", "answer is required");
  }
  if (typeof body.elapsedMs !== "number") {
    return jsonError(400, "INVALID_ELAPSED_MS", "elapsedMs must be a number");
  }

  const dateKey = getMountainDateKey();
  const todayQuestion = await getQuestionForDate(dateKey);
  if (!todayQuestion) {
    return jsonError(404, "NO_QUIZ_SCHEDULED_TODAY", "No quiz scheduled today", {
      quizDate: dateKey,
    });
  }

  if (questionId !== todayQuestion.id) {
    return jsonError(409, "QUESTION_ROLLED_OVER", "Question has rolled over", {
      rollover: true,
      quizDate: dateKey,
      newQuestion: stripCorrectAnswers(todayQuestion),
    });
  }

  const attemptData = owner.guestToken
    ? getGuestAttempt(owner.guestToken, dateKey)
    : null;

  if (attemptData?.solved) {
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

  if (owner.userId && !owner.isAdmin) {
    const completion = await getPlayerQuizCompletionForDate(owner.userId, dateKey);
    if (completion) {
      const summary = await getPlayerSubmitSummary(owner.userId);
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

  const attemptNumber = owner.userId
    ? (userAttemptCounts.get(getAttemptKey(owner.userId, dateKey)) ?? 0) + 1
    : (attemptData?.attemptCount ?? 0) + 1;

  const checkResult = checkAnswer(todayQuestion, body.answer);
  if (isQuizDebugEnabled) {
    console.log("[quiz][debug] submit", {
      questionId: todayQuestion.id,
      questionType: todayQuestion.type,
      answer: body.answer,
      checkResult,
      attemptNumber,
    });
  }

  if (!checkResult.correct) {
    if (owner.guestToken) {
      updateGuestAttempt(owner.guestToken, dateKey, {
        questionId: todayQuestion.id,
        attemptCount: attemptNumber,
        solved: false,
        solvedOnAttempt: null,
        elapsedMs: null,
      });
    }
    if (owner.userId) {
      userAttemptCounts.set(getAttemptKey(owner.userId, dateKey), attemptNumber);
    }

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
    body.elapsedMs
  );

  if (owner.guestToken) {
    updateGuestAttempt(owner.guestToken, dateKey, {
      questionId: todayQuestion.id,
      attemptCount: attemptNumber,
      solved: true,
      solvedOnAttempt: attemptNumber,
      elapsedMs: body.elapsedMs,
    });
  }

  let completionResult: Awaited<ReturnType<typeof recordPlayerQuizCompletion>> | null = null;
  if (owner.userId && !owner.isAdmin) {
    completionResult = await recordPlayerQuizCompletion({
      playerId: owner.userId,
      dateKey,
      displayName: owner.username ?? owner.userId,
      pointsAwarded: pointsBreakdown.totalPoints,
    });

    if (completionResult.alreadyCompleted) {
      userAttemptCounts.delete(getAttemptKey(owner.userId, dateKey));
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
  }

  if (owner.userId) {
    userAttemptCounts.delete(getAttemptKey(owner.userId, dateKey));
  }

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
    ...getCorrectAnswerInfo(todayQuestion),
    quizDate: dateKey,
  });
}

export async function handleQuizApi(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method;

  if (method === "GET" && path === "/api/quiz/today") {
    return handleGetToday(req);
  }
  if (method === "POST" && path === "/api/quiz/start") {
    return handleStartQuiz(req);
  }
  if (method === "POST" && path === "/api/quiz/practice/start") {
    return handleStartPracticeQuiz(req);
  }
  if (method === "POST" && path === "/api/quiz/submit") {
    return handleSubmitQuiz(req);
  }
  if (method === "POST" && path === "/api/quiz/practice/submit") {
    return handleSubmitPracticeQuiz(req);
  }

  return jsonError(404, "NOT_FOUND", "Not found", { path });
}
