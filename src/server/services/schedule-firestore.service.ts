import { collection, doc, getDoc, getDocs, setDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { getAllQuizQuestions } from "./firebase-quiz.service";
import type { FirestoreQuizScheduleEntry } from "../../types/firestore.types";

const QUIZ_SCHEDULE_COLLECTION = "QUIZ_SCHEDULE";
const QUESTION_ID_SUFFIX_REGEX = /^(.*)_q(\d+)$/i;

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

function toScheduleEntry(
  dateKey: string,
  data: Record<string, unknown>
): FirestoreQuizScheduleEntry | null {
  const questionId =
    typeof data.questionId === "string" ? data.questionId.trim() : "";
  const puzzleId = typeof data.puzzleId === "string" ? data.puzzleId.trim() : "";
  const createdAt =
    typeof data.createdAt === "string" ? data.createdAt : new Date().toISOString();
  const updatedAt =
    typeof data.updatedAt === "string" ? data.updatedAt : new Date().toISOString();

  if (!questionId || !puzzleId || !isValidDateKey(dateKey)) {
    return null;
  }

  return {
    id: dateKey,
    dateKey,
    questionId,
    puzzleId,
    createdAt,
    updatedAt,
  };
}

function parseQuestionId(questionId: string): {
  puzzleId: string;
  questionIndex: number;
} | null {
  const match = QUESTION_ID_SUFFIX_REGEX.exec(questionId.trim());
  if (!match) return null;
  const puzzleId = match[1]?.trim();
  const questionIndex = Number.parseInt(match[2], 10);
  if (!puzzleId || Number.isNaN(questionIndex) || questionIndex < 0) {
    return null;
  }
  return { puzzleId, questionIndex };
}

async function resolveScheduleQuestion(
  questionId: string
): Promise<{
  questionId?: string;
  puzzleId?: string;
  correctedFromQuestionId?: string;
  error?: string;
}> {
  const normalized = questionId.trim();
  if (!normalized) {
    return { error: "invalid_question" };
  }

  const allQuestions = await getAllQuizQuestions();
  const availableQuestionIds = new Set(allQuestions.map((question) => question.id));
  if (availableQuestionIds.has(normalized)) {
    const parsed = parseQuestionId(normalized);
    if (!parsed) {
      return { error: "invalid_question_id" };
    }
    return {
      questionId: normalized,
      puzzleId: parsed.puzzleId,
    };
  }

  const parsed = parseQuestionId(normalized);
  if (parsed && parsed.questionIndex !== 0) {
    const correctedId = `${parsed.puzzleId}_q0`;
    if (availableQuestionIds.has(correctedId)) {
      console.warn(
        `[schedule] autocorrected scheduled questionId ${normalized} -> ${correctedId}`
      );
      return {
        questionId: correctedId,
        puzzleId: parsed.puzzleId,
        correctedFromQuestionId: normalized,
      };
    }
  }

  return { error: "invalid_question_id" };
}

export async function getScheduledQuestionId(
  dateKey: string
): Promise<string | null> {
  if (!isValidDateKey(dateKey)) return null;

  const ref = doc(db, QUIZ_SCHEDULE_COLLECTION, dateKey);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    return null;
  }

  const entry = toScheduleEntry(dateKey, snap.data() as Record<string, unknown>);
  return entry?.questionId ?? null;
}

export async function setScheduleEntry(
  dateKey: string,
  questionId: string
): Promise<{
  entry?: FirestoreQuizScheduleEntry;
  correctedFromQuestionId?: string;
  error?: string;
}> {
  const normalizedDateKey = dateKey.trim();
  const normalizedQuestionId = questionId.trim();

  if (!isValidDateKey(normalizedDateKey)) {
    return { error: "invalid_date" };
  }
  if (!normalizedQuestionId) {
    return { error: "invalid_question" };
  }

  const resolved = await resolveScheduleQuestion(normalizedQuestionId);
  if (!resolved.questionId || !resolved.puzzleId) {
    return { error: resolved.error ?? "invalid_question_id" };
  }

  const puzzleId = resolved.puzzleId;
  const resolvedQuestionId = resolved.questionId;

  const ref = doc(db, QUIZ_SCHEDULE_COLLECTION, normalizedDateKey);
  const existing = await getDoc(ref);
  const nowIso = new Date().toISOString();
  const createdAt = existing.exists()
    ? typeof existing.data().createdAt === "string"
      ? existing.data().createdAt
      : nowIso
    : nowIso;

  const payload = {
    dateKey: normalizedDateKey,
    questionId: resolvedQuestionId,
    puzzleId,
    createdAt,
    updatedAt: nowIso,
  };

  await setDoc(ref, payload);
  return {
    correctedFromQuestionId: resolved.correctedFromQuestionId,
    entry: {
      id: normalizedDateKey,
      ...payload,
    },
  };
}

export async function listScheduleEntries(range?: {
  startDateKey?: string;
  endDateKey?: string;
}): Promise<FirestoreQuizScheduleEntry[]> {
  const snapshot = await getDocs(collection(db, QUIZ_SCHEDULE_COLLECTION));
  const entries: FirestoreQuizScheduleEntry[] = [];

  for (const docSnap of snapshot.docs) {
    const mapped = toScheduleEntry(
      docSnap.id,
      docSnap.data() as Record<string, unknown>
    );
    if (!mapped) continue;

    if (range?.startDateKey && mapped.dateKey < range.startDateKey) {
      continue;
    }
    if (range?.endDateKey && mapped.dateKey > range.endDateKey) {
      continue;
    }

    entries.push(mapped);
  }

  entries.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  return entries;
}
