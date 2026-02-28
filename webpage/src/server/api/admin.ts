import { getUserById } from "../data/users.store";
import {
  createQuestion,
  deleteQuestion,
  getAllQuestions,
  getQuestionById,
  updateQuestion,
} from "../data/questions.store";
import { addScheduleEntry, getScheduleEntries } from "../data/schedule.store";
import { getUserIdFromRequest } from "./auth";
import { checkAnswer } from "../services/answer-checker.service";
import { calculatePoints } from "../services/scoring.service";
import type { Question } from "../../types/quiz.types";
import { getMountainDateKey } from "../utils/timezone";

async function requireAdmin(req: Request): Promise<Response | null> {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const user = await getUserById(userId);
  if (!user) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!user.isAdmin) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }
  return null;
}

function logValidationFailure(endpoint: string, reason: string, id?: string) {
  const suffix = id ? ` id=${id}` : "";
  console.log(`[admin] ${endpoint} validation failed: ${reason}${suffix}`);
}

function getCorrectAnswerInfo(question: Question): Record<string, unknown> {
  switch (question.type) {
    case "mcq":
      return { correctIndex: question.correctIndex };
    case "select-all":
      return { correctIndices: question.correctIndices };
    case "written":
      return { acceptedAnswers: question.acceptedAnswers };
    default:
      return {};
  }
}

function isValidDateKey(dateKey: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return false;
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

async function handleSchedule(req: Request): Promise<Response> {
  if (req.method === "GET") {
    const schedule = await getScheduleEntries();
    return Response.json({
      schedule: schedule.map((entry) => ({
        date: entry.dateKey,
        questionId: entry.questionId,
      })),
    });
  }

  if (req.method === "POST") {
    let body: { date?: string; questionId?: string };
    try {
      body = await req.json();
    } catch {
      logValidationFailure("POST /api/admin/schedule", "invalid json");
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const date = body.date?.trim() ?? "";
    const questionId = body.questionId?.trim() ?? "";
    if (!isValidDateKey(date)) {
      logValidationFailure("POST /api/admin/schedule", "invalid date", date);
      return Response.json({ error: "invalid_date" }, { status: 400 });
    }
    const todayKey = getMountainDateKey();
    if (date < todayKey) {
      logValidationFailure("POST /api/admin/schedule", "past date", date);
      return Response.json({ error: "date_in_past" }, { status: 400 });
    }
    if (!/^q\d{3}$/.test(questionId)) {
      logValidationFailure("POST /api/admin/schedule", "invalid questionId", questionId);
      return Response.json({ error: "invalid_question" }, { status: 400 });
    }

    const question = await getQuestionById(questionId);
    if (!question) {
      logValidationFailure("POST /api/admin/schedule", "question not found", questionId);
      return Response.json({ error: "not_found" }, { status: 404 });
    }

    const existing = (await getScheduleEntries()).find(
      (entry) => entry.dateKey === date
    );
    if (existing) {
      return Response.json({ error: "already_scheduled" }, { status: 409 });
    }

    const entry = await addScheduleEntry({
      dateKey: date,
      questionId,
      assignedAt: new Date().toISOString(),
    });
    if (!entry) {
      return Response.json({ error: "failed_to_save" }, { status: 500 });
    }

    return Response.json({ success: true });
  }

  return Response.json({ error: "Not found" }, { status: 404 });
}

async function handleQuestions(req: Request): Promise<Response> {
  if (req.method === "GET") {
    const questions = await getAllQuestions();
    return Response.json({ questions });
  }

  if (req.method === "POST") {
    let body: Partial<Question>;
    try {
      body = await req.json();
    } catch {
      logValidationFailure("POST /api/admin/questions", "invalid json");
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const result = await createQuestion(body);
    if (result.error) {
      logValidationFailure("POST /api/admin/questions", result.error);
      return Response.json({ error: result.error }, { status: 400 });
    }
    return Response.json({ question: result.question });
  }

  return Response.json({ error: "Not found" }, { status: 404 });
}

async function handleQuestionById(
  req: Request,
  id: string
): Promise<Response> {
  if (req.method === "PUT") {
    let body: Partial<Question>;
    try {
      body = await req.json();
    } catch {
      logValidationFailure(`PUT /api/admin/questions/${id}`, "invalid json", id);
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const result = await updateQuestion(id, body);
    if (result.error) {
      if (result.error === "not_found") {
        return Response.json({ error: "not_found" }, { status: 404 });
      }
      logValidationFailure(`PUT /api/admin/questions/${id}`, result.error, id);
      return Response.json({ error: result.error }, { status: 400 });
    }
    return Response.json({ question: result.question });
  }

  if (req.method === "DELETE") {
    const result = await deleteQuestion(id);
    if (!result.success) {
      if (result.error === "not_found") {
        return Response.json({ error: "not_found" }, { status: 404 });
      }
      return Response.json({ error: result.error ?? "failed to delete" }, { status: 500 });
    }
    return Response.json({ success: true });
  }

  return Response.json({ error: "Not found" }, { status: 404 });
}

async function handleTestSubmit(req: Request): Promise<Response> {
  let body: { questionId?: string; answer?: unknown; elapsedMs?: number };
  try {
    body = await req.json();
  } catch {
    logValidationFailure("POST /api/admin/test/submit", "invalid json");
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { questionId, answer, elapsedMs } = body;
  if (!questionId) {
    console.log("[admin] POST /api/admin/test/submit missing questionId");
    return Response.json({ error: "questionId is required" }, { status: 400 });
  }
  if (typeof elapsedMs !== "number") {
    logValidationFailure("POST /api/admin/test/submit", "elapsedMs must be number", questionId);
    return Response.json({ error: "elapsedMs must be a number" }, { status: 400 });
  }

  const question = await getQuestionById(questionId);
  if (!question) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  const attemptNumber = 1;
  const checkResult = checkAnswer(question, answer);
  const pointsBreakdown = calculatePoints(question.basePoints, attemptNumber, elapsedMs);
  const correctAnswerInfo = getCorrectAnswerInfo(question);

  return Response.json({
    correct: checkResult.correct,
    attemptNumber,
    pointsEarned: checkResult.correct ? pointsBreakdown.totalPoints : 0,
    pointsBreakdown,
    explanation: question.explanation,
    ...correctAnswerInfo,
  });
}

export async function handleAdminApi(req: Request): Promise<Response> {
  const authResponse = await requireAdmin(req);
  if (authResponse) return authResponse;

  const url = new URL(req.url);
  const path = url.pathname;

  if (path === "/api/admin/questions") {
    return handleQuestions(req);
  }

  if (path.startsWith("/api/admin/questions/")) {
    const id = path.split("/").pop() ?? "";
    return handleQuestionById(req, id);
  }

  if (path === "/api/admin/test/submit") {
    if (req.method !== "POST") {
      return Response.json({ error: "Method not allowed" }, { status: 405 });
    }
    return handleTestSubmit(req);
  }

  if (path === "/api/admin/schedule") {
    return handleSchedule(req);
  }

  return Response.json({ error: "Not found" }, { status: 404 });
}
