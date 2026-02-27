import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { db, COLLECTIONS } from "../../lib/firebase";
import type { QuizQuestion } from "../../types/firestore.types";
import type { Question } from "../../types/quiz.types";

const QUESTION_ID_SUFFIX_REGEX = /^(.*)_q(\d+)$/i;

type SupportedQuestion = Extract<Question, { type: "mcq" | "select-all" }>;

export type AdminQuestionRecord = SupportedQuestion & {
  puzzleId: string;
  questionId: string;
};

type ValidationResult =
  | { ok: true; question: SupportedQuestion }
  | { ok: false; error: string };

function parseQuestionId(
  questionId: string
): { puzzleId: string; questionIndex: number } | null {
  const trimmed = questionId.trim();
  if (!trimmed) return null;

  const suffixMatch = QUESTION_ID_SUFFIX_REGEX.exec(trimmed);
  if (suffixMatch) {
    const puzzleId = suffixMatch[1];
    const questionIndex = Number.parseInt(suffixMatch[2], 10);
    if (!puzzleId || Number.isNaN(questionIndex) || questionIndex < 0) {
      return null;
    }
    return { puzzleId, questionIndex };
  }

  return { puzzleId: trimmed, questionIndex: 0 };
}

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
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const value of values) {
    if (seen.has(value)) continue;
    seen.add(value);
    deduped.push(value);
  }
  return deduped;
}

function normalizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  return uniqueStrings(
    tags
      .filter((tag): tag is string => typeof tag === "string")
      .map((tag) => tag.trim().toLowerCase())
      .filter((tag) => tag.length > 0)
  );
}

function deriveDifficulty(basePoints: number): 1 | 2 | 3 {
  if (basePoints <= 100) return 1;
  if (basePoints <= 150) return 2;
  return 3;
}

function resolveQuestionType(rawType: unknown): SupportedQuestion["type"] {
  const normalized =
    typeof rawType === "string" ? rawType.trim().toLowerCase() : "";

  if (
    normalized === "select-all" ||
    normalized === "select_all" ||
    normalized === "multi-select" ||
    normalized === "multi_select" ||
    normalized === "multiple-choice" ||
    normalized === "multiple_choice"
  ) {
    return "select-all";
  }

  return "mcq";
}

function resolvePrompt(
  puzzleData: Record<string, unknown>,
  source: Record<string, unknown>,
  questionIndex: number
): string {
  const prompt = firstNonEmptyString([
    source.prompt,
    source.Prompt,
    source.question,
    source.Question,
    source.text,
    source.Text,
    source.statement,
    source.Statement,
  ]);

  if (prompt) return prompt;

  const puzzleName = firstNonEmptyString([puzzleData.Name, puzzleData.name]);
  if (puzzleName) return `${puzzleName} - Question ${questionIndex + 1}`;
  return `Quiz - Question ${questionIndex + 1}`;
}

function resolveBasePoints(
  puzzleData: Record<string, unknown>,
  source: Record<string, unknown>
): number {
  if (typeof source.SV === "number" && Number.isFinite(source.SV)) {
    return source.SV;
  }
  if (typeof puzzleData.Reward === "number" && Number.isFinite(puzzleData.Reward)) {
    return puzzleData.Reward;
  }
  return 0;
}

function mapPuzzleQuestionToAdminQuestion(
  puzzleId: string,
  puzzleData: Record<string, unknown>,
  source: Record<string, unknown>,
  questionIndex: number
): AdminQuestionRecord | null {
  const questionType = resolveQuestionType(source.type);
  const basePoints = resolveBasePoints(puzzleData, source);
  const prompt = resolvePrompt(puzzleData, source, questionIndex);
  const explanation = firstNonEmptyString([source.explanation]) ?? undefined;
  const rawDifficulty = source.difficulty;
  const difficulty =
    rawDifficulty === 1 || rawDifficulty === 2 || rawDifficulty === 3
      ? rawDifficulty
      : deriveDifficulty(basePoints);

  const topic =
    typeof puzzleData.Topic === "string" && puzzleData.Topic.trim().length > 0
      ? puzzleData.Topic.trim().toLowerCase()
      : "quiz";
  const tags = normalizeTags(source.tags);
  const resolvedTags = tags.length > 0 ? tags : [topic];

  const questionId = `${puzzleId}_q${questionIndex}`;

  if (questionType === "mcq") {
    const answer = firstNonEmptyString([
      source.answer,
      ...normalizeStringArray(source.answers),
    ]);
    const rawOther = normalizeStringArray(source.other);
    const fallbackAnswer = rawOther[0];
    const correctAnswer = answer ?? fallbackAnswer;
    if (!correctAnswer) return null;

    const other = uniqueStrings(
      rawOther.filter((choice, index) => {
        if (!answer && index === 0) return false;
        return choice !== correctAnswer;
      })
    );
    const choices = [correctAnswer, ...other];
    if (choices.length < 2) return null;

    return {
      id: questionId,
      puzzleId,
      questionId,
      type: "mcq",
      prompt,
      explanation,
      difficulty,
      tags: resolvedTags,
      basePoints,
      choices,
      correctIndex: 0,
    };
  }

  const answersFromArray = normalizeStringArray(source.answers);
  const answerFromSingle = firstNonEmptyString([source.answer]);
  const correctAnswers = uniqueStrings(
    answersFromArray.length > 0
      ? answersFromArray
      : answerFromSingle
        ? [answerFromSingle]
        : []
  );
  const other = uniqueStrings(
    normalizeStringArray(source.other).filter(
      (choice) => !correctAnswers.includes(choice)
    )
  );
  const choices = [...correctAnswers, ...other];
  if (correctAnswers.length === 0 || choices.length < 2) return null;

  return {
    id: questionId,
    puzzleId,
    questionId,
    type: "select-all",
    prompt,
    explanation,
    difficulty,
    tags: resolvedTags,
    basePoints,
    choices,
    correctIndices: correctAnswers.map((_, index) => index),
  };
}

function mapPuzzleDocToAdminQuestions(
  puzzleId: string,
  data: Record<string, unknown>
): AdminQuestionRecord[] {
  if (data.Type !== "Quiz") return [];
  if (!Array.isArray(data.Questions)) return [];

  const questions: AdminQuestionRecord[] = [];
  for (let index = 0; index < data.Questions.length; index += 1) {
    const source = data.Questions[index];
    if (!source || typeof source !== "object") continue;
    const mapped = mapPuzzleQuestionToAdminQuestion(
      puzzleId,
      data,
      source as Record<string, unknown>,
      index
    );
    if (mapped) {
      questions.push(mapped);
    }
  }

  return questions;
}

function validateQuestionInput(input: Partial<Question>): ValidationResult {
  if (input.type !== "mcq" && input.type !== "select-all") {
    return { ok: false, error: "type must be mcq or select-all" };
  }

  if (typeof input.prompt !== "string" || input.prompt.trim().length === 0) {
    return { ok: false, error: "prompt must be non-empty" };
  }

  if (typeof input.basePoints !== "number" || !Number.isFinite(input.basePoints)) {
    return { ok: false, error: "basePoints must be a number" };
  }

  const difficulty =
    input.difficulty === 1 || input.difficulty === 2 || input.difficulty === 3
      ? input.difficulty
      : deriveDifficulty(input.basePoints);

  const tags = normalizeTags(input.tags);
  const explanation = firstNonEmptyString([input.explanation]) ?? undefined;

  const choices = normalizeStringArray(input.choices);
  if (choices.length < 2) {
    return { ok: false, error: "choices must include at least 2 items" };
  }

  if (input.type === "mcq") {
    if (
      !Number.isInteger(input.correctIndex) ||
      input.correctIndex < 0 ||
      input.correctIndex >= choices.length
    ) {
      return { ok: false, error: "mcq correctIndex is invalid" };
    }

    return {
      ok: true,
      question: {
        id: input.id ?? "",
        type: "mcq",
        prompt: input.prompt.trim(),
        explanation,
        difficulty,
        tags,
        basePoints: input.basePoints,
        choices,
        correctIndex: input.correctIndex,
      },
    };
  }

  if (!Array.isArray(input.correctIndices) || input.correctIndices.length === 0) {
    return { ok: false, error: "select-all correctIndices required" };
  }
  const deduped = Array.from(new Set(input.correctIndices));
  if (deduped.length !== input.correctIndices.length) {
    return { ok: false, error: "select-all correctIndices must be unique" };
  }
  if (
    !deduped.every(
      (index) => Number.isInteger(index) && index >= 0 && index < choices.length
    )
  ) {
    return { ok: false, error: "select-all correctIndices are invalid" };
  }
  if (deduped.length >= choices.length) {
    return {
      ok: false,
      error: "select-all must include at least one incorrect option",
    };
  }

  return {
    ok: true,
    question: {
      id: input.id ?? "",
      type: "select-all",
      prompt: input.prompt.trim(),
      explanation,
      difficulty,
      tags,
      basePoints: input.basePoints,
      choices,
      correctIndices: deduped.sort((a, b) => a - b),
    },
  };
}

function toFirestoreQuizQuestion(question: SupportedQuestion): QuizQuestion {
  if (question.type === "mcq") {
    const answer = question.choices[question.correctIndex];
    const other = question.choices.filter(
      (_, index) => index !== question.correctIndex
    );
    return {
      type: "mcq",
      SV: question.basePoints,
      prompt: question.prompt,
      answer,
      other,
      explanation: question.explanation,
      difficulty: question.difficulty,
      tags: question.tags,
    };
  }

  const correctSet = new Set(question.correctIndices);
  const answers = question.choices.filter((_, index) => correctSet.has(index));
  const other = question.choices.filter((_, index) => !correctSet.has(index));
  return {
    type: "select-all",
    SV: question.basePoints,
    prompt: question.prompt,
    answers,
    other,
    explanation: question.explanation,
    difficulty: question.difficulty,
    tags: question.tags,
  };
}

function toPuzzleDoc(
  question: SupportedQuestion,
  questions: QuizQuestion[]
): Record<string, unknown> {
  const topic = question.tags?.[0] ?? "quiz";
  const rewardFromFirst =
    questions.length > 0 && typeof questions[0].SV === "number"
      ? questions[0].SV
      : question.basePoints;
  const firstPrompt =
    firstNonEmptyString([questions[0]?.prompt, question.prompt]) ?? "Quiz";

  return {
    Type: "Quiz",
    Name: firstPrompt,
    Topic: topic,
    Reward: rewardFromFirst,
    Threshold: 1,
    Questions: questions,
  };
}

export async function getAllAdminQuestions(): Promise<AdminQuestionRecord[]> {
  const puzzlesRef = collection(db, COLLECTIONS.PUZZLE);
  const quizQuery = query(puzzlesRef, where("Type", "==", "Quiz"));
  const snapshot = await getDocs(quizQuery);

  const questions: AdminQuestionRecord[] = [];
  for (const docSnap of snapshot.docs) {
    const data = docSnap.data() as Record<string, unknown>;
    questions.push(...mapPuzzleDocToAdminQuestions(docSnap.id, data));
  }

  questions.sort((a, b) => a.questionId.localeCompare(b.questionId));
  return questions;
}

export async function getAdminQuestionById(
  questionId: string
): Promise<AdminQuestionRecord | null> {
  const parsed = parseQuestionId(questionId);
  if (!parsed) return null;

  const puzzleRef = doc(db, COLLECTIONS.PUZZLE, parsed.puzzleId);
  const snap = await getDoc(puzzleRef);
  if (!snap.exists()) return null;

  const questions = mapPuzzleDocToAdminQuestions(
    parsed.puzzleId,
    snap.data() as Record<string, unknown>
  );
  return (
    questions.find(
      (question) =>
        question.questionId === `${parsed.puzzleId}_q${parsed.questionIndex}`
    ) ?? null
  );
}

export async function createAdminQuestion(
  input: Partial<Question>
): Promise<{ question?: AdminQuestionRecord; error?: string }> {
  const validation = validateQuestionInput(input);
  if (!validation.ok) {
    return { error: validation.error };
  }

  const firestoreQuestion = toFirestoreQuizQuestion(validation.question);
  const payload = toPuzzleDoc(validation.question, [firestoreQuestion]);

  const created = await addDoc(collection(db, COLLECTIONS.PUZZLE), payload);
  const mapped = mapPuzzleDocToAdminQuestions(created.id, payload)[0];
  if (!mapped) {
    return { error: "failed to map created question" };
  }
  return { question: mapped };
}

export async function updateAdminQuestion(
  questionId: string,
  input: Partial<Question>
): Promise<{ question?: AdminQuestionRecord; error?: string }> {
  const parsed = parseQuestionId(questionId);
  if (!parsed) {
    return { error: "not_found" };
  }

  const puzzleRef = doc(db, COLLECTIONS.PUZZLE, parsed.puzzleId);
  const snap = await getDoc(puzzleRef);
  if (!snap.exists()) {
    return { error: "not_found" };
  }

  const validation = validateQuestionInput(input);
  if (!validation.ok) {
    return { error: validation.error };
  }

  const existing = snap.data() as Record<string, unknown>;
  const existingQuestions = Array.isArray(existing.Questions)
    ? [...(existing.Questions as unknown[])]
    : [];

  if (
    parsed.questionIndex < 0 ||
    parsed.questionIndex >= existingQuestions.length
  ) {
    return { error: "not_found" };
  }

  existingQuestions[parsed.questionIndex] = toFirestoreQuizQuestion(
    validation.question
  );
  const nextQuestions = existingQuestions as QuizQuestion[];

  const nextDoc = {
    ...existing,
    ...toPuzzleDoc(validation.question, nextQuestions),
  };

  await setDoc(puzzleRef, nextDoc);
  const updated = mapPuzzleDocToAdminQuestions(parsed.puzzleId, nextDoc).find(
    (question) =>
      question.questionId === `${parsed.puzzleId}_q${parsed.questionIndex}`
  );

  if (!updated) {
    return { error: "failed to map updated question" };
  }

  return { question: updated };
}

export async function deleteAdminQuestion(
  questionId: string
): Promise<{ success: boolean; error?: string }> {
  const parsed = parseQuestionId(questionId);
  if (!parsed) {
    return { success: false, error: "not_found" };
  }

  const puzzleRef = doc(db, COLLECTIONS.PUZZLE, parsed.puzzleId);
  const snap = await getDoc(puzzleRef);
  if (!snap.exists()) {
    return { success: false, error: "not_found" };
  }

  const existing = snap.data() as Record<string, unknown>;
  const questions = Array.isArray(existing.Questions)
    ? [...(existing.Questions as unknown[])]
    : [];
  if (
    parsed.questionIndex < 0 ||
    parsed.questionIndex >= questions.length
  ) {
    return { success: false, error: "not_found" };
  }

  if (questions.length <= 1) {
    await deleteDoc(puzzleRef);
    return { success: true };
  }

  questions.splice(parsed.questionIndex, 1);
  const fallbackQuestion = mapPuzzleDocToAdminQuestions(parsed.puzzleId, {
    ...existing,
    Questions: questions,
  })[0];
  const topic =
    fallbackQuestion?.tags?.[0] ??
    (typeof existing.Topic === "string" ? existing.Topic : "quiz");
  const reward =
    fallbackQuestion?.basePoints ??
    (typeof existing.Reward === "number" ? existing.Reward : 0);
  const name =
    fallbackQuestion?.prompt ??
    (typeof existing.Name === "string" ? existing.Name : "Quiz");

  const nextDoc = {
    ...existing,
    Type: "Quiz",
    Name: name,
    Topic: topic,
    Reward: reward,
    Questions: questions,
  };
  await setDoc(puzzleRef, nextDoc);
  return { success: true };
}
