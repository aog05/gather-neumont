import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { COLLECTIONS, db } from "../../lib/firebase";
import {
  makeQuestionId,
  mapLegacyPuzzleDocToQuestions,
  mapV2DocToQuestion,
  toV2FirestoreDoc,
  type QuizQuestionRecord,
  type SupportedQuestion,
} from "./quiz-question.mapper";

function dedupeQuestionRecords(
  v2Questions: QuizQuestionRecord[],
  legacyQuestions: QuizQuestionRecord[]
): QuizQuestionRecord[] {
  const byId = new Map<string, QuizQuestionRecord>();
  const signatures = new Set<string>();

  for (const question of v2Questions) {
    byId.set(question.id, question);
    signatures.add(question.signature);
  }

  for (const question of legacyQuestions) {
    if (byId.has(question.id)) continue;
    if (signatures.has(question.signature)) continue;
    byId.set(question.id, question);
  }

  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}

export async function listV2QuizQuestions(): Promise<QuizQuestionRecord[]> {
  const snapshot = await getDocs(collection(db, COLLECTIONS.QUIZ_QUESTIONS));
  const questions: QuizQuestionRecord[] = [];
  for (const docSnap of snapshot.docs) {
    const mapped = mapV2DocToQuestion(
      docSnap.id,
      docSnap.data() as Record<string, unknown>
    );
    if (mapped) questions.push(mapped);
  }
  questions.sort((a, b) => a.id.localeCompare(b.id));
  return questions;
}

export async function listLegacyQuizQuestions(): Promise<QuizQuestionRecord[]> {
  const snapshot = await getDocs(
    query(collection(db, COLLECTIONS.PUZZLE), where("Type", "==", "Quiz"))
  );

  const questions: QuizQuestionRecord[] = [];
  for (const docSnap of snapshot.docs) {
    questions.push(
      ...mapLegacyPuzzleDocToQuestions(
        docSnap.id,
        docSnap.data() as Record<string, unknown>
      )
    );
  }
  questions.sort((a, b) => a.id.localeCompare(b.id));
  return questions;
}

export async function listQuizQuestions(options?: {
  includeLegacy?: boolean;
}): Promise<QuizQuestionRecord[]> {
  const includeLegacy = options?.includeLegacy ?? true;
  const v2Questions = await listV2QuizQuestions();
  if (!includeLegacy) return v2Questions;
  const legacyQuestions = await listLegacyQuizQuestions();
  return dedupeQuestionRecords(v2Questions, legacyQuestions);
}

export async function getQuizQuestionById(
  questionId: string,
  options?: { includeLegacy?: boolean }
): Promise<QuizQuestionRecord | null> {
  const includeLegacy = options?.includeLegacy ?? true;

  const v2Snap = await getDoc(doc(db, COLLECTIONS.QUIZ_QUESTIONS, questionId));
  if (v2Snap.exists()) {
    const mapped = mapV2DocToQuestion(
      v2Snap.id,
      v2Snap.data() as Record<string, unknown>
    );
    if (mapped) return mapped;
  }

  if (!includeLegacy) return null;
  const questions = await listLegacyQuizQuestions();
  return questions.find((question) => question.id === questionId) ?? null;
}

export async function createV2QuizQuestion(
  question: SupportedQuestion
): Promise<QuizQuestionRecord> {
  const nowIso = new Date().toISOString();
  let questionId = makeQuestionId(question.tags?.[0]);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const existing = await getDoc(doc(db, COLLECTIONS.QUIZ_QUESTIONS, questionId));
    if (!existing.exists()) break;
    questionId = makeQuestionId(question.tags?.[0]);
  }

  const payload = toV2FirestoreDoc(question, nowIso);
  await setDoc(doc(db, COLLECTIONS.QUIZ_QUESTIONS, questionId), payload);

  const mapped = mapV2DocToQuestion(questionId, payload as Record<string, unknown>);
  if (!mapped) {
    throw new Error("failed_to_map_created_question");
  }
  return mapped;
}

export async function updateV2QuizQuestion(
  questionId: string,
  question: SupportedQuestion
): Promise<QuizQuestionRecord | null> {
  const ref = doc(db, COLLECTIONS.QUIZ_QUESTIONS, questionId);
  const existing = await getDoc(ref);
  if (!existing.exists()) return null;

  const existingData = existing.data() as Record<string, unknown>;
  const nowIso = new Date().toISOString();
  const payload = {
    ...toV2FirestoreDoc(question, nowIso),
    createdAt:
      typeof existingData.createdAt === "string" && existingData.createdAt.trim().length > 0
        ? existingData.createdAt
        : nowIso,
    ...(typeof existingData.legacyId === "string" && existingData.legacyId.trim().length > 0
      ? { legacyId: existingData.legacyId.trim() }
      : {}),
    updatedAt: nowIso,
  };
  await setDoc(ref, payload);
  return mapV2DocToQuestion(questionId, payload as Record<string, unknown>);
}

export async function deleteV2QuizQuestion(questionId: string): Promise<boolean> {
  const ref = doc(db, COLLECTIONS.QUIZ_QUESTIONS, questionId);
  const existing = await getDoc(ref);
  if (!existing.exists()) return false;
  await deleteDoc(ref);
  return true;
}
