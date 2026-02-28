import type { FirestoreQuizScheduleEntry } from "../../types/firestore.types";
import { collection, doc, getDoc, getDocs, setDoc } from "firebase/firestore";
import { db, COLLECTIONS } from "../../lib/firebase";
import { getQuizQuestionById } from "./quiz-questions.repository";

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
  const createdAt =
    typeof data.createdAt === "string" ? data.createdAt : new Date().toISOString();
  const updatedAt =
    typeof data.updatedAt === "string" ? data.updatedAt : new Date().toISOString();

  if (!questionId || !isValidDateKey(dateKey)) {
    return null;
  }

  return {
    id: dateKey,
    dateKey,
    questionId,
    createdAt,
    updatedAt,
  };
}

export async function getScheduledQuestionId(
  dateKey: string
): Promise<string | null> {
  if (!isValidDateKey(dateKey)) return null;

  const snap = await getDoc(doc(db, COLLECTIONS.QUIZ_SCHEDULE, dateKey));
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

  const question = await getQuizQuestionById(normalizedQuestionId, {
    includeLegacy: false,
  });
  if (!question) {
    return { error: "invalid_question_id" };
  }

  const ref = doc(db, COLLECTIONS.QUIZ_SCHEDULE, normalizedDateKey);
  const existing = await getDoc(ref);
  const nowIso = new Date().toISOString();
  const createdAt =
    existing.exists() &&
    typeof existing.data()?.createdAt === "string" &&
    existing.data()!.createdAt.trim().length > 0
      ? existing.data()!.createdAt
      : nowIso;

  const payload = {
    dateKey: normalizedDateKey,
    questionId: normalizedQuestionId,
    createdAt,
    updatedAt: nowIso,
  };

  await setDoc(ref, payload);
  return {
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
  const snapshot = await getDocs(collection(db, COLLECTIONS.QUIZ_SCHEDULE));
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
