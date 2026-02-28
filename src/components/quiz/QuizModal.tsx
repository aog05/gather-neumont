/**
 * QuizModal component - main modal for the daily quiz experience.
 */

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useQuiz } from "../../hooks/useQuiz";
import type { Question } from "../../types/quiz.types";
import NeumontPanelShell from "../NeumontPanelShell";
import { QuizCards } from "./QuizCards";
import { QuizResult } from "./QuizResult";

interface QuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean;
  initialTab?: Tab;
  activeTabOverride?: Tab;
  onRequestQuizTab?: () => void;
  onViewLeaderboard?: () => void;
  variant?: "modal" | "embedded";
  closeHandleRef?: { current: null | (() => void) };
}

type Tab = "quiz" | "admin" | "questions" | "schedule";

type AdminTestResult = {
  correct: boolean;
  attemptNumber: number;
  pointsEarned: number;
  pointsBreakdown: {
    basePoints: number;
    attemptMultiplier: number;
    attemptNumber: number;
    baseAfterMultiplier: number;
    firstTryBonus: number;
    speedBonus: number;
    totalPoints: number;
  };
  explanation?: string;
  correctIndex?: number;
  correctIndices?: number[];
};

type QuestionType = "mcq" | "select-all";
type AdminQuestionSource = "legacy" | "v2";
type AdminQuestion = Extract<Question, { type: QuestionType }> & {
  questionId?: string;
  source?: AdminQuestionSource;
};

type EditorState = {
  mode: "create" | "edit";
  id?: string;
  type: QuestionType;
  prompt: string;
  explanation: string;
  difficulty: 1 | 2 | 3;
  basePoints: number;
  tags: string[];
  choices: string[];
  correctIndex: number;
  correctIndices: number[];
};

type ScheduleEntry = {
  date: string;
  questionId: string;
};

type EditorPayload = {
  type: QuestionType;
  prompt: string;
  explanation: string;
  difficulty: 1 | 2 | 3;
  basePoints: number;
  tags: string[];
  choices: string[];
  correctIndex?: number;
  correctIndices?: number[];
};

type EditorNormalization = {
  payload: EditorPayload;
  hasDuplicateChoices: boolean;
};

const TAG_OPTIONS = [
  "bscs",
  "bsse",
  "bsis",
  "bsgd",
  "bsaai",
  "bsaie",
  "hardware",
  "internet",
  "web",
  "html",
  "css",
  "javascript",
  "security",
  "git",
  "programming",
  "data",
  "ai",
  "games",
  "campus",
  "capstone",
  "enterprise",
  "basics",
  "privacy",
  "performance",
  "networks",
  "testing",
  "workflow",
  "os",
  "storage",
  "tools",
  "quality",
  "safety",
];

const BASE_POINTS: Record<number, number> = {
  1: 100,
  2: 150,
  3: 200,
};

const EMPTY_MCQ_CHOICES = ["", "", "", ""];
const EMPTY_SELECT_CHOICES = ["", "", "", "", ""];
const RANGE_OPTIONS = ["week", "month", "year"] as const;
const LEGACY_QUESTION_ID_PATTERN = /_q\d+$/i;
const NO_V2_ASSIGNABLE_MESSAGE =
  "No questions available yet. Create a new question in Questions tab first.";
type RangeOption = typeof RANGE_OPTIONS[number];
const isQuizDebugEnabled = (() => {
  try {
    if (
      typeof window !== "undefined" &&
      window.sessionStorage?.getItem("QUIZ_DEBUG") === "1"
    ) {
      return true;
    }
  } catch {
    // Ignore storage access errors and fall back to env check.
  }

  return (import.meta as any).env?.BUN_PUBLIC_QUIZ_DEBUG === "1";
})();

function withDebugCode(message: string, code: string): string {
  return isQuizDebugEnabled ? `${message} (${code})` : message;
}

function isLegacyQuestionId(questionId: string): boolean {
  return LEGACY_QUESTION_ID_PATTERN.test(questionId);
}

function getQuestionSource(question: Pick<AdminQuestion, "id" | "source">): AdminQuestionSource {
  if (question.source === "legacy" || question.source === "v2") {
    return question.source;
  }
  return isLegacyQuestionId(question.id) ? "legacy" : "v2";
}

function isLegacyQuestion(question: Pick<AdminQuestion, "id" | "source">): boolean {
  return getQuestionSource(question) === "legacy";
}

async function getResponseError(res: Response): Promise<string | null> {
  try {
    const data = (await res.json()) as { error?: string };
    return typeof data.error === "string" ? data.error : null;
  } catch {
    return null;
  }
}

function formatQuestionActionError(error: string | null, fallback: string): string {
  switch (error) {
    case "legacy_read_only":
      return withDebugCode("These questions are read-only.", "legacy_read_only");
    case "not_found":
      return withDebugCode("Question not found.", "not_found");
    case "unauthorized":
      return withDebugCode("Admin sign-in required.", "unauthorized");
    case "forbidden":
      return withDebugCode("Admin access required.", "forbidden");
    default:
      return error ?? fallback;
  }
}

function formatScheduleError(error: string | null, fallback: string): string {
  switch (error) {
    case "already_scheduled":
      return withDebugCode("Already scheduled for this date.", "already_scheduled");
    case "invalid_question_id":
      return withDebugCode(
        "Selected question is not available for scheduling.",
        "invalid_question_id"
      );
    case "invalid_question":
      return withDebugCode("Select a valid question.", "invalid_question");
    case "unauthorized":
      return withDebugCode("Admin sign-in required.", "unauthorized");
    case "forbidden":
      return withDebugCode("Admin access required.", "forbidden");
    default:
      return error ?? fallback;
  }
}

const MOUNTAIN_TIMEZONE = "America/Denver";

function toMountainDateKey(date: Date): string {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: MOUNTAIN_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

export function QuizModal({
  isOpen,
  onClose,
  isAdmin = false,
  initialTab,
  activeTabOverride,
  onRequestQuizTab,
  onViewLeaderboard,
  variant = "modal",
  closeHandleRef,
}: QuizModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>("quiz");
  const effectiveActiveTab = activeTabOverride ?? activeTab;
  const [mode, setMode] = useState<"daily" | "test" | "practice">("daily");
  const [adminQuestions, setAdminQuestions] = useState<AdminQuestion[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [selectedQuestionId, setSelectedQuestionId] = useState("");
  const [testQuestion, setTestQuestion] = useState<AdminQuestion | null>(null);
  const [testState, setTestState] = useState<
    "idle" | "active" | "submitting" | "correct" | "incorrect"
  >("idle");
  const [testResult, setTestResult] = useState<AdminTestResult | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [sequenceIds, setSequenceIds] = useState<string[] | null>(null);
  const [sequenceIndex, setSequenceIndex] = useState(0);
  const [sequenceMessage, setSequenceMessage] = useState<string | null>(null);
  const testStartRef = useRef<number | null>(null);
  const [editorState, setEditorState] = useState<EditorState | null>(null);
  const [editorInitialSnapshot, setEditorInitialSnapshot] = useState<string | null>(null);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [editorSaving, setEditorSaving] = useState(false);
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
  const [scheduleEntries, setScheduleEntries] = useState<ScheduleEntry[]>([]);
  const [scheduleRange, setScheduleRange] = useState<RangeOption>("week");
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [assignDate, setAssignDate] = useState<string | null>(null);
  const [assignQuestionId, setAssignQuestionId] = useState("");
  const [scheduleErrorsByDate, setScheduleErrorsByDate] = useState<
    Record<string, string>
  >({});
  const quiz = useQuiz();

  useEffect(() => {
    if (isOpen && isAdmin && initialTab) {
      setActiveTab(initialTab);
    }
    if (isOpen && !isAdmin) {
      setActiveTab("quiz");
    }
  }, [isOpen, isAdmin, initialTab]);

  useEffect(() => {
    if (!isOpen) return;
    if (!activeTabOverride) return;
    if (activeTab === activeTabOverride) return;
    setActiveTab(activeTabOverride);
  }, [activeTab, activeTabOverride, isOpen]);


  useEffect(() => {
    if (!isAdmin && activeTab !== "quiz") {
      setActiveTab("quiz");
    }
  }, [isAdmin, activeTab]);

  const refreshAdminQuestions = useCallback(async (): Promise<AdminQuestion[]> => {
    setAdminLoading(true);
    setAdminError(null);
    try {
      const res = await fetch("/api/admin/questions");
      const data = (await res.json()) as { questions?: AdminQuestion[] };
      if (!res.ok) {
        throw new Error("Failed to load questions");
      }
      const questions = data.questions ?? [];
      setAdminQuestions(questions);
      if (
        !selectedQuestionId ||
        !questions.some((question) => question.id === selectedQuestionId)
      ) {
        setSelectedQuestionId(questions[0]?.id ?? "");
      }
      return questions;
    } catch {
      setAdminError("Failed to load admin questions");
      return [];
    } finally {
      setAdminLoading(false);
    }
  }, [selectedQuestionId]);

  const refreshSchedule = useCallback(async (): Promise<ScheduleEntry[]> => {
    setScheduleLoading(true);
    setScheduleError(null);
    try {
      const res = await fetch("/api/admin/schedule");
      const data = (await res.json()) as { schedule?: ScheduleEntry[] };
      if (!res.ok) {
        throw new Error("Failed to load schedule");
      }
      const schedule = data.schedule ?? [];
      setScheduleEntries(schedule);
      return schedule;
    } catch {
      setScheduleError("Failed to load schedule");
      return [];
    } finally {
      setScheduleLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen || !isAdmin) return;
    if (effectiveActiveTab !== "schedule") return;
    void refreshAdminQuestions();
    void refreshSchedule();
  }, [effectiveActiveTab, isAdmin, isOpen, refreshAdminQuestions, refreshSchedule]);

  useEffect(() => {
    if (!isOpen || !isAdmin) return;
    const load = async () => {
      await refreshAdminQuestions();
      await refreshSchedule();
    };
    load();
    return () => {};
  }, [isOpen, isAdmin, refreshAdminQuestions, refreshSchedule]);

  const handleClose = useCallback(() => {
    // If quiz is in progress (active or incorrect) and not completed, confirm
    if (mode === "daily" && (quiz.state === "active" || quiz.state === "incorrect")) {
      const confirmed = window.confirm(
        "Leave without finishing today's quiz?"
      );
      if (!confirmed) return;
    }
    quiz.reset();
    onClose();
  }, [mode, quiz, onClose]);

  useEffect(() => {
    if (!closeHandleRef) return;
    closeHandleRef.current = handleClose;
    return () => {
      closeHandleRef.current = null;
    };
  }, [closeHandleRef, handleClose]);

  const handleSubmit = useCallback(
    async (answer: unknown) => {
      if (mode === "daily") {
        await quiz.submitAnswer(answer);
        return;
      }
      if (mode === "practice") {
        await quiz.submitPracticeAnswer(answer);
        return;
      }
      if (!testQuestion) return;
      setTestState("submitting");
      setTestError(null);
      const elapsed =
        testStartRef.current !== null ? Date.now() - testStartRef.current : 0;
      try {
        const res = await fetch("/api/admin/test/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questionId: testQuestion.id,
            answer,
            elapsedMs: elapsed,
          }),
        });
        const data = (await res.json()) as AdminTestResult;
        if (!res.ok) {
          throw new Error("Failed to submit test answer");
        }
        setTestResult(data);
        setTestState(data.correct ? "correct" : "incorrect");
      } catch {
        setTestError("Failed to submit test answer");
        setTestState("active");
      }
    },
    [mode, quiz, testQuestion]
  );

  const orderedQuestions = useMemo(() => {
    const clone = [...adminQuestions];
    clone.sort((a, b) => {
      const matchA = /^q(\d+)$/.exec(a.id ?? "");
      const matchB = /^q(\d+)$/.exec(b.id ?? "");
      const aNum = matchA?.[1]
        ? Number.parseInt(matchA[1], 10)
        : Number.MAX_SAFE_INTEGER;
      const bNum = matchB?.[1]
        ? Number.parseInt(matchB[1], 10)
        : Number.MAX_SAFE_INTEGER;
      if (aNum !== bNum) return aNum - bNum;
      return String(a.id).localeCompare(String(b.id));
    });
    return clone;
  }, [adminQuestions]);

  const editableQuestions = useMemo(
    () => orderedQuestions.filter((question) => !isLegacyQuestion(question)),
    [orderedQuestions]
  );
  const legacyQuestions = useMemo(
    () => orderedQuestions.filter((question) => isLegacyQuestion(question)),
    [orderedQuestions]
  );
  const assignableQuestions = useMemo(
    () => editableQuestions,
    [editableQuestions]
  );

  const loadTestQuestion = useCallback(
    (id: string, newSequence?: string[] | null, nextIndex?: number) => {
      const target = adminQuestions.find((question) => question.id === id);
      if (!target) {
        setTestError("Question not found");
        return;
      }
      setMode("test");
      setActiveTab("quiz");
      setSelectedQuestionId(id);
      quiz.reset();
      setTestQuestion(target);
      setTestResult(null);
      setTestError(null);
      setSequenceMessage(null);
      setTestState("active");
      testStartRef.current = Date.now();
      setSequenceIds(newSequence ?? null);
      setSequenceIndex(nextIndex ?? 0);
    },
    [adminQuestions]
  );

  const handleLoadSelected = () => {
    if (!selectedQuestionId) return;
    const selectedQuestion = adminQuestions.find((question) => question.id === selectedQuestionId);
    if (!selectedQuestion) {
      setAdminError("Select a valid question.");
      return;
    }
    setAdminError(null);
    setSequenceIds(null);
    setSequenceIndex(0);
    setSequenceMessage(null);
    void startPracticeQuizFromAdmin(selectedQuestion.id);
  };

  const startPracticeQuizFromAdmin = useCallback(async (questionId?: string) => {
    onRequestQuizTab?.();
    setAdminError(null);
    setMode("practice");
    setTestQuestion(null);
    setTestResult(null);
    setTestError(null);
    quiz.reset();
    setActiveTab("quiz");
    await quiz.startPracticeQuiz(questionId);
  }, [onRequestQuizTab, quiz]);

  const buildSequenceFromData = useCallback(
    (questions: AdminQuestion[], schedule: ScheduleEntry[]) => {
      const questionIds = new Set(questions.map((question) => question.id));
      const questionsById = new Map(questions.map((question) => [question.id, question]));
      const scheduleByDate = new Map(schedule.map((entry) => [entry.date, entry]));
      const invalidQuestionIds = new Set<string>();
      const orderedSequenceIds: string[] = [];

      for (const date of getDateList(scheduleRange)) {
        const entry = scheduleByDate.get(date);
        if (!entry) continue;
        const scheduledQuestion = questionsById.get(entry.questionId);
        if (
          (scheduledQuestion && isLegacyQuestion(scheduledQuestion)) ||
          (!scheduledQuestion && isLegacyQuestionId(entry.questionId))
        ) {
          invalidQuestionIds.add(entry.questionId);
          continue;
        }
        if (!questionIds.has(entry.questionId)) {
          invalidQuestionIds.add(entry.questionId);
          continue;
        }
        orderedSequenceIds.push(entry.questionId);
      }

      return {
        orderedSequenceIds,
        invalidQuestionIds: [...invalidQuestionIds],
      };
    },
    [scheduleRange]
  );

  const loadSequenceQuestionByIndex = useCallback(
    async (nextIndex: number) => {
      if (!sequenceIds || sequenceIds.length === 0) return;
      if (nextIndex < 0 || nextIndex >= sequenceIds.length) return;
      const nextId = sequenceIds[nextIndex];
      if (!nextId) return;
      setSequenceIndex(nextIndex);
      setSequenceMessage(null);
      await startPracticeQuizFromAdmin(nextId);
    },
    [sequenceIds, startPracticeQuizFromAdmin]
  );

  const handleSequenceNext = useCallback(async () => {
    if (!sequenceIds || sequenceIds.length === 0) return;
    const nextIndex = sequenceIndex + 1;
    if (nextIndex >= sequenceIds.length) {
      setSequenceMessage("End of sequence.");
      return;
    }
    await loadSequenceQuestionByIndex(nextIndex);
  }, [loadSequenceQuestionByIndex, sequenceIds, sequenceIndex]);

  const handleSequencePrev = useCallback(async () => {
    if (!sequenceIds || sequenceIds.length === 0) return;
    const prevIndex = sequenceIndex - 1;
    if (prevIndex < 0) {
      setSequenceMessage("Already at the first scheduled question.");
      return;
    }
    await loadSequenceQuestionByIndex(prevIndex);
  }, [loadSequenceQuestionByIndex, sequenceIds, sequenceIndex]);

  const handleStartSequence = async () => {
    setAdminError(null);
    setSequenceMessage(null);
    const [questions, schedule] = await Promise.all([
      refreshAdminQuestions(),
      refreshSchedule(),
    ]);

    const { orderedSequenceIds, invalidQuestionIds } = buildSequenceFromData(
      questions,
      schedule
    );
    if (invalidQuestionIds.length > 0) {
      setAdminError(
        `Sequence contains invalid scheduled IDs: ${invalidQuestionIds.join(", ")}`
      );
      return;
    }
    if (orderedSequenceIds.length === 0) {
      setAdminError(
        `No scheduled questions found in the selected ${scheduleRange} window.`
      );
      return;
    }

    setMode("practice");
    setSequenceIds(orderedSequenceIds);
    setSequenceIndex(0);
    setSequenceMessage(
      "Sequence is schedule-based; only scheduled questions appear."
    );
    await startPracticeQuizFromAdmin(orderedSequenceIds[0]);
  };

  const handleNextQuestion = () => {
    if (!testQuestion) return;
    const orderedIds = orderedQuestions.map((question) => question.id);
    let ids = sequenceIds ?? orderedIds;
    let nextIndex = 0;

    if (sequenceIds) {
      nextIndex = sequenceIndex + 1;
      if (nextIndex >= sequenceIds.length) {
        setSequenceMessage("End of sequence.");
        return;
      }
    } else {
      const currentIndex = ids.indexOf(testQuestion.id);
      if (currentIndex >= 0 && currentIndex < ids.length - 1) {
        nextIndex = currentIndex + 1;
      } else {
        setSequenceMessage("No next question in order.");
        return;
      }
    }

    const nextId = ids[nextIndex];
    if (!nextId) return;
    loadTestQuestion(nextId, sequenceIds ?? null, nextIndex);
  };

  const handleLoadDaily = () => {
    setSequenceIds(null);
    setSequenceIndex(0);
    setSequenceMessage(null);
    void startPracticeQuizFromAdmin();
  };

  const handleViewLeaderboard = () => {
    onViewLeaderboard?.();
  };

  const getTruncatedPrompt = (prompt: string) => {
    if (prompt.length <= 80) return prompt;
    return `${prompt.slice(0, 77)}...`;
  };

  const getPromptPreview = (prompt: string, max = 60) => {
    if (prompt.length <= max) return prompt;
    return `${prompt.slice(0, max - 3)}...`;
  };

  const getRangeDays = (range: RangeOption) => {
    if (range === "month") return 30;
    if (range === "year") return 365;
    return 7;
  };

  const getDateList = (range: RangeOption) => {
    const days = getRangeDays(range);
    const base = new Date();
    const list: string[] = [];
    for (let i = 0; i < days; i += 1) {
      const date = new Date(base.getTime() + i * 24 * 60 * 60 * 1000);
      list.push(toMountainDateKey(date));
    }
    return list;
  };

  const getDayOfWeek = (dateKey: string) => {
    const date = new Date(`${dateKey}T12:00:00Z`);
    return date.toLocaleDateString(undefined, {
      weekday: "short",
      timeZone: MOUNTAIN_TIMEZONE,
    });
  };

  const scheduleMap = useMemo(() => {
    const map = new Map<string, ScheduleEntry>();
    scheduleEntries.forEach((entry) => map.set(entry.date, entry));
    return map;
  }, [scheduleEntries]);

  const dateList = useMemo(() => getDateList(scheduleRange), [scheduleRange]);
  const missingCount = dateList.filter((date) => {
    const entry = scheduleMap.get(date);
    if (!entry) return true;
    return !adminQuestions.some((question) => question.id === entry.questionId);
  }).length;

  const openAssign = async (date: string) => {
    setAssignDate(date);
    const questions = await refreshAdminQuestions();
    const currentEntry = scheduleMap.get(date);
    const currentAssignable = currentEntry
      ? questions.find(
          (question) =>
            question.id === currentEntry.questionId && !isLegacyQuestion(question)
        )
      : null;
    const firstAssignable = questions.find((question) => !isLegacyQuestion(question));
    setAssignQuestionId(currentAssignable?.id ?? firstAssignable?.id ?? "");
    setScheduleErrorsByDate((prev) => ({ ...prev, [date]: "" }));
  };

  const closeAssign = () => {
    setAssignDate(null);
    setAssignQuestionId("");
  };

  const handleAssignSave = async (date: string) => {
    const availableQuestions = adminQuestions.filter((question) => !isLegacyQuestion(question));
    if (availableQuestions.length === 0) {
      setScheduleErrorsByDate((prev) => ({
        ...prev,
        [date]: NO_V2_ASSIGNABLE_MESSAGE,
      }));
      return;
    }
    if (!assignQuestionId) {
      setScheduleErrorsByDate((prev) => ({
        ...prev,
        [date]: "Select a question.",
      }));
      return;
    }
    const selectedQuestion = adminQuestions.find(
      (question) => question.id === assignQuestionId
    );
    if (!selectedQuestion) {
      setScheduleErrorsByDate((prev) => ({
        ...prev,
        [date]: "Select a valid question.",
      }));
      return;
    }
    if (isLegacyQuestion(selectedQuestion)) {
      setScheduleErrorsByDate((prev) => ({
        ...prev,
        [date]: "Read-only question IDs cannot be scheduled.",
      }));
      return;
    }
    try {
      const res = await fetch("/api/admin/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, questionId: selectedQuestion.id }),
      });
      if (!res.ok) {
        const error = await getResponseError(res);
        setScheduleErrorsByDate((prev) => ({
          ...prev,
          [date]: formatScheduleError(error, "Failed to assign."),
        }));
        return;
      }
      await refreshSchedule();
      closeAssign();
    } catch {
      setScheduleErrorsByDate((prev) => ({
        ...prev,
        [date]: "Failed to assign.",
      }));
    }
  };

  const openCreateEditor = () => {
    setEditorError(null);
    setEditorInitialSnapshot(null);
    setEditorState({
      mode: "create",
      type: "mcq",
      prompt: "",
      explanation: "",
      difficulty: 1,
      basePoints: BASE_POINTS[1] ?? 100,
      tags: [],
      choices: [...EMPTY_MCQ_CHOICES],
      correctIndex: 0,
      correctIndices: [0],
    });
  };

  const openEditEditor = (question: AdminQuestion) => {
    if (isLegacyQuestion(question)) {
      setAdminError(
        formatQuestionActionError("legacy_read_only", "These questions are read-only.")
      );
      return;
    }
    setEditorError(null);
    const nextState: EditorState = {
      mode: "edit",
      id: question.id,
      type: question.type,
      prompt: question.prompt ?? "",
      explanation: question.explanation ?? "",
      difficulty: question.difficulty,
      basePoints: question.basePoints,
      tags: question.tags ?? [],
      choices:
        question.type === "mcq"
          ? [...(question.choices ?? []), ...EMPTY_MCQ_CHOICES].slice(0, 4)
          : [...(question.choices ?? []), ...EMPTY_SELECT_CHOICES].slice(0, 5),
      correctIndex: question.type === "mcq" ? (question.correctIndex ?? 0) : 0,
      correctIndices:
        question.type === "select-all"
          ? [...(question.correctIndices ?? [])]
          : question.type === "mcq"
            ? [question.correctIndex ?? 0]
            : [],
    };
    setEditorInitialSnapshot(
      serializeEditorPayload(buildEditorPayloadFromState(nextState))
    );
    setEditorState(nextState);
  };

  const closeEditor = () => {
    setEditorState(null);
    setEditorInitialSnapshot(null);
    setEditorError(null);
    setEditorSaving(false);
    setTagDropdownOpen(false);
  };

  const handleTypeChange = (nextType: QuestionType) => {
    if (!editorState) return;
    if (editorState.type === nextType) return;

    if (
      (editorState.type === "mcq" && nextType === "select-all") ||
      (editorState.type === "select-all" && nextType === "mcq")
    ) {
      const nextCorrectIndices =
        editorState.type === "mcq"
          ? [editorState.correctIndex]
          : editorState.correctIndices.length > 0
            ? editorState.correctIndices
            : [0];
      setEditorState({
        ...editorState,
        type: nextType,
        choices:
          nextType === "mcq"
            ? editorState.choices.slice(0, 4)
            : [...editorState.choices, "", ""].slice(0, 5),
        correctIndex:
          nextType === "mcq" ? nextCorrectIndices[0] ?? 0 : editorState.correctIndex,
        correctIndices:
          nextType === "select-all"
            ? nextCorrectIndices
            : editorState.correctIndices,
      });
      return;
    }

    setEditorState({
      ...editorState,
      type: nextType,
      choices: nextType === "select-all" ? [...EMPTY_SELECT_CHOICES] : [...EMPTY_MCQ_CHOICES],
      correctIndex: 0,
      correctIndices: nextType === "select-all" ? [0] : [],
    });
  };

  const handleDifficultyChange = (difficulty: 1 | 2 | 3) => {
    if (!editorState) return;
    setEditorState({
      ...editorState,
      difficulty,
      basePoints: BASE_POINTS[difficulty] ?? editorState.basePoints,
    });
  };

  const toggleTag = (tag: string) => {
    if (!editorState) return;
    const exists = editorState.tags.includes(tag);
    const nextTags = exists
      ? editorState.tags.filter((item) => item !== tag)
      : [...editorState.tags, tag];
    setEditorState({ ...editorState, tags: nextTags });
  };

  const updateChoice = (index: number, value: string) => {
    if (!editorState) return;
    const next = [...editorState.choices];
    next[index] = value;
    setEditorState({ ...editorState, choices: next });
  };

  const toggleCorrectIndex = (index: number) => {
    if (!editorState) return;
    if (editorState.type === "mcq") {
      setEditorState({ ...editorState, correctIndex: index });
      return;
    }
    const set = new Set(editorState.correctIndices);
    if (set.has(index)) {
      set.delete(index);
    } else {
      set.add(index);
    }
    setEditorState({ ...editorState, correctIndices: Array.from(set).sort() });
  };

  const normalizeEditorState = (state: EditorState): EditorNormalization => {
    const rawChoices = (
      state.type === "mcq" ? state.choices.slice(0, 4) : state.choices.slice(0, 5)
    ).map((choice) => choice.trim());
    const normalizedChoices: string[] = [];
    const indexByChoice = new Map<string, number>();
    const choiceIndexMap = rawChoices.map((choice) => {
      if (!choice) return -1;
      const existingIndex = indexByChoice.get(choice);
      if (existingIndex !== undefined) {
        return existingIndex;
      }
      const nextIndex = normalizedChoices.length;
      normalizedChoices.push(choice);
      indexByChoice.set(choice, nextIndex);
      return nextIndex;
    });
    const payload: EditorPayload = {
      type: state.type,
      prompt: state.prompt.trim(),
      explanation: state.explanation.trim(),
      difficulty: state.difficulty,
      basePoints: state.basePoints,
      tags: [...new Set(state.tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0))],
      choices: normalizedChoices,
    };

    if (state.type === "mcq") {
      payload.correctIndex = choiceIndexMap[state.correctIndex] ?? -1;
    } else {
      payload.correctIndices = [
        ...new Set(
          state.correctIndices
            .map((index) => choiceIndexMap[index] ?? -1)
            .filter((index): index is number => index >= 0)
        ),
      ].sort((a, b) => a - b);
    }

    const nonEmptyChoices = rawChoices.filter((choice) => choice.length > 0);
    return {
      payload,
      hasDuplicateChoices: new Set(nonEmptyChoices).size !== nonEmptyChoices.length,
    };
  };

  const buildEditorPayloadFromState = (state: EditorState): EditorPayload => {
    return normalizeEditorState(state).payload;
  };

  const serializeEditorPayload = (payload: EditorPayload) =>
    JSON.stringify({
      ...payload,
      tags: [...payload.tags].sort(),
      choices: payload.choices.map((choice) => choice.trim()),
      ...(payload.type === "select-all"
        ? { correctIndices: [...(payload.correctIndices ?? [])].sort((a, b) => a - b) }
        : {}),
    });

  const buildEditorPayload = () => {
    if (!editorState) return null;
    return buildEditorPayloadFromState(editorState);
  };

  const validateEditor = () => {
    if (!editorState) return { valid: false, error: "Missing editor state" };
    const normalized = normalizeEditorState(editorState);
    const { payload, hasDuplicateChoices } = normalized;
    if (!payload.prompt) {
      return { valid: false, error: "Prompt is required." };
    }
    if (!Number.isFinite(payload.basePoints)) {
      return { valid: false, error: "Base points must be a valid number." };
    }
    if (payload.choices.length < 2) {
      return { valid: false, error: "Provide at least 2 non-empty choices." };
    }
    if (hasDuplicateChoices) {
      return { valid: false, error: "Duplicate choices are not allowed." };
    }
    if (payload.type === "mcq") {
      if (
        !Number.isInteger(payload.correctIndex) ||
        (payload.correctIndex ?? -1) < 0 ||
        (payload.correctIndex ?? -1) >= payload.choices.length
      ) {
        return { valid: false, error: "Pick a correct answer." };
      }
    }
    if (payload.type === "select-all") {
      if (!Array.isArray(payload.correctIndices) || payload.correctIndices.length < 1) {
        return { valid: false, error: "Select at least one correct answer." };
      }
      if (new Set(payload.correctIndices).size !== payload.correctIndices.length) {
        return { valid: false, error: "Duplicate correct answers are not allowed." };
      }
      if (
        !payload.correctIndices.every(
          (index) => Number.isInteger(index) && index >= 0 && index < payload.choices.length
        )
      ) {
        return { valid: false, error: "Select valid correct answers." };
      }
      if (payload.correctIndices.length >= payload.choices.length) {
        return {
          valid: false,
          error: "Select-all must include at least one incorrect option.",
        };
      }
    }
    return { valid: true, error: "" };
  };

  const editorPayload = buildEditorPayload();
  const editorValidation = validateEditor();
  const editorIsDirty =
    !!editorState &&
    editorState.mode === "edit" &&
    !!editorPayload &&
    !!editorInitialSnapshot &&
    serializeEditorPayload(editorPayload) !== editorInitialSnapshot;
  const editorCanSave =
    !!editorState &&
    editorValidation.valid &&
    !editorSaving &&
    (editorState.mode === "create" || editorIsDirty);
  const editorDisabledMessage =
    !editorState || editorSaving
      ? null
      : !editorValidation.valid
        ? editorValidation.error
        : editorState.mode === "edit" && !editorIsDirty
          ? "No changes to save."
          : null;

  const handleSave = async () => {
    if (!editorState) return;
    if (
      editorState.mode === "edit" &&
      editorState.id &&
      isLegacyQuestion(
        adminQuestions.find((question) => question.id === editorState.id) ?? { id: editorState.id }
      )
    ) {
      setEditorError(
        formatQuestionActionError("legacy_read_only", "These questions are read-only.")
      );
      return;
    }
    if (isQuizDebugEnabled) {
      console.log("[quiz][debug][editor] save-click", {
        mode: editorState.mode,
        dirty: editorIsDirty,
        validation: editorValidation,
      });
    }
    if (!editorValidation.valid) {
      setEditorError(editorValidation.error);
      return;
    }
    if (editorState.mode === "edit" && !editorIsDirty) {
      setEditorError("No changes to save.");
      return;
    }
    setEditorSaving(true);
    setEditorError(null);
    const payload = editorPayload;
    if (!payload) {
      setEditorSaving(false);
      setEditorError("Missing editor payload.");
      return;
    }

    try {
      if (isQuizDebugEnabled) {
        console.log("[quiz][debug][editor] save-request", {
          endpoint:
            editorState.mode === "create"
              ? "/api/admin/questions"
              : `/api/admin/questions/${editorState.id}`,
          method: editorState.mode === "create" ? "POST" : "PUT",
          payload,
        });
      }
      const res = await fetch(
        editorState.mode === "create"
          ? "/api/admin/questions"
          : `/api/admin/questions/${editorState.id}`,
        {
          method: editorState.mode === "create" ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        const error = await getResponseError(res);
        if (isQuizDebugEnabled) {
          console.log("[quiz][debug][editor] save-error", {
            status: res.status,
            serverError: error ?? "unknown_error",
          });
        }
        setEditorError(formatQuestionActionError(error, "Failed to save question"));
        return;
      }
      if (isQuizDebugEnabled) {
        console.log("[quiz][debug][editor] save-success", {
          status: res.status,
        });
      }
      await refreshAdminQuestions();
      await refreshSchedule();
      closeEditor();
    } catch {
      setEditorError("Failed to save question");
    } finally {
      setEditorSaving(false);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    const targetQuestion =
      adminQuestions.find((question) => question.id === id) ?? { id };
    if (isLegacyQuestion(targetQuestion)) {
      setAdminError(
        formatQuestionActionError("legacy_read_only", "These questions are read-only.")
      );
      return;
    }
    const confirmed = window.confirm("Delete this question?");
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/admin/questions/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const error = await getResponseError(res);
        setAdminError(formatQuestionActionError(error, "Failed to delete question"));
        return;
      }
      if (editorState?.id === id) {
        closeEditor();
      }
      if (assignQuestionId === id) {
        closeAssign();
      }
      await refreshAdminQuestions();
      await refreshSchedule();
    } catch {
      setAdminError("Failed to delete question");
    }
  };

  const renderQuestionSection = (
    title: string,
    questions: AdminQuestion[],
    options: {
      emptyMessage: string;
      description?: string;
      readOnly?: boolean;
    }
  ) => (
    <div style={{ marginTop: 16 }}>
      <div className="quiz-admin-header">
        <h4>{title}</h4>
      </div>
      {options.description && <p className="quiz-admin-status">{options.description}</p>}
      {questions.length === 0 ? (
        <p className="quiz-admin-status">{options.emptyMessage}</p>
      ) : (
        <div className="quiz-admin-table">
          <div className="quiz-admin-table-row quiz-admin-table-head">
            <span>ID</span>
            <span>Type</span>
            <span>Diff</span>
            <span>Prompt</span>
            <span>Tags</span>
          </div>
          {questions.map((question) => (
            <div
              className={`quiz-admin-table-row ${
                editorState?.id === question.id ? "is-active" : ""
              }`}
              key={question.id}
            >
              <span>{question.id}</span>
              <span>{question.type}</span>
              <span>{question.difficulty}</span>
              <span title={question.prompt}>{getTruncatedPrompt(question.prompt)}</span>
              <span className="quiz-admin-tags">{(question.tags ?? []).join(", ")}</span>
              <div className="quiz-admin-row-actions">
                {options.readOnly ? (
                  <span>Read-only</span>
                ) : (
                  <>
                    <button
                      type="button"
                      className="quiz-admin-icon-btn"
                      aria-label="Edit"
                      onClick={() => openEditEditor(question)}
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      className="quiz-admin-icon-btn"
                      aria-label="Delete"
                      onClick={() => handleDeleteQuestion(question.id)}
                    >
                      🗑
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  if (!isOpen) return null;

  const renderQuizContent = () => {
    const isSequencePractice =
      mode === "practice" && Array.isArray(sequenceIds) && sequenceIds.length > 0;

    const renderSequenceControls = (isBusy: boolean) => {
      if (!isSequencePractice || !sequenceIds) return null;
      return (
        <div className="quiz-sequence-panel">
          <p className="quiz-sequence-note">
            Sequence is schedule-based; only scheduled questions appear.
          </p>
          <div className="quiz-sequence-controls">
            <button
              type="button"
              className="quest-menu-action-btn quest-menu-action-btn--ghost quiz-admin-btn"
              onClick={() => void handleSequencePrev()}
              disabled={isBusy || sequenceIndex <= 0}
            >
              Prev
            </button>
            <span className="quiz-sequence-position nums">
              {sequenceIndex + 1} / {sequenceIds.length}
            </span>
            <button
              type="button"
              className="quest-menu-action-btn quiz-admin-btn"
              onClick={() => void handleSequenceNext()}
              disabled={isBusy || sequenceIndex >= sequenceIds.length - 1}
            >
              Next
            </button>
          </div>
          {sequenceMessage && <p className="quiz-test-message">{sequenceMessage}</p>}
        </div>
      );
    };

    if (mode === "test") {
      if (!testQuestion) {
        return (
          <div className="quiz-loading">
            <p>Select a question in the Admin tab to begin test mode.</p>
          </div>
        );
      }

      const showIncorrect = testState === "incorrect";
      const isSubmitting = testState === "submitting";

      return (
        <>
          <div className="quiz-question">
            <p className="quiz-question-prompt">{testQuestion.prompt}</p>
            <p className="quiz-question-meta">
              <span>Difficulty: {"★".repeat(testQuestion.difficulty)}</span>
              <span>Base: {testQuestion.basePoints} pts</span>
            </p>
          </div>

          {(testQuestion.type === "mcq" || testQuestion.type === "select-all") &&
            testQuestion.choices && (
              <QuizCards
                choices={testQuestion.choices}
                type={testQuestion.type}
                onSubmit={handleSubmit}
                disabled={isSubmitting}
                wrongIndex={undefined}
                wrongIndices={undefined}
                showIncorrect={showIncorrect}
                correctIndex={
                  testQuestion.type === "mcq" ? testQuestion.correctIndex : undefined
                }
                correctIndices={
                  testQuestion.type === "select-all"
                    ? testQuestion.correctIndices
                    : undefined
                }
                showCorrect
              />
            )}

          {testResult && (
            <div className="quiz-test-result">
              <p
                className={`quiz-feedback ${
                  testResult.correct ? "correct" : "incorrect"
                }`}
              >
                {testResult.correct
                  ? "Correct."
                  : "Incorrect (test mode)."}
              </p>
              <p className="quiz-test-points">
                Points: {testResult.pointsEarned}
              </p>
              <button
                className="quest-menu-action-btn"
                onClick={handleNextQuestion}
              >
                Next Question
              </button>
              {sequenceMessage && (
                <p className="quiz-test-message">{sequenceMessage}</p>
              )}
            </div>
          )}

          {testError && (
            <p className="quiz-feedback error" style={{ marginTop: 12 }}>
              {testError}
            </p>
          )}
        </>
      );
    }

    // Loading state
    if (quiz.state === "loading") {
      return (
        <div className="quiz-loading">
          <div className="quiz-loading-spinner" />
          <p>{mode === "practice" ? "Loading practice quiz..." : "Loading today's quiz..."}</p>
        </div>
      );
    }

    // Error state
    if (quiz.state === "error") {
      return (
        <div className="quiz-loading">
          <p className="quiz-feedback error">{quiz.error}</p>
          <button
            className="quest-menu-action-btn quest-menu-action-btn--primary"
            onClick={() => {
              if (mode === "practice") {
                if (sequenceIds && sequenceIds.length > 0) {
                  void loadSequenceQuestionByIndex(sequenceIndex);
                  return;
                }
                void quiz.startPracticeQuiz();
                return;
              }
              void quiz.startQuiz();
            }}
            style={{ marginTop: 16, width: "auto" }}
          >
            Try Again
          </button>
        </div>
      );
    }

    if (quiz.state === "completed") {
      return (
        <div className="quiz-loading">
          <p className="quiz-feedback">
            {quiz.lastResult?.message ?? "You already completed today's quiz."}
          </p>
        </div>
      );
    }

    if (quiz.state === "unavailable") {
      return (
        <div className="quiz-loading">
          <p className="quiz-feedback error">
            {quiz.lastResult?.message ?? "No quiz scheduled today."}
          </p>
          <p className="quiz-admin-muted">
            Ask an admin to assign today&apos;s quiz in the schedule tab.
          </p>
        </div>
      );
    }

    // Idle state - show start button
    if (quiz.state === "idle") {
      return (
        <div className="quiz-loading">
          <p style={{ marginBottom: 16, color: "#ccc" }}>
            Ready to test your CS knowledge?
          </p>
          <button
            className="quest-menu-action-btn quest-menu-action-btn--primary"
            onClick={() => {
              if (mode === "practice") {
                if (sequenceIds && sequenceIds.length > 0) {
                  void loadSequenceQuestionByIndex(sequenceIndex);
                  return;
                }
                void quiz.startPracticeQuiz();
                return;
              }
              void quiz.startQuiz();
            }}
            style={{ width: "auto", padding: "14px 40px" }}
          >
            {mode === "practice" ? "Start Practice Quiz" : "Start Today's Quiz"}
          </button>
        </div>
      );
    }

    // Correct state - show result
    if (quiz.state === "correct" && quiz.lastResult && quiz.question) {
      return (
        <>
          <QuizResult
            question={quiz.question}
            pointsEarned={quiz.lastResult.pointsEarned ?? 0}
            pointsBreakdown={
              quiz.lastResult.pointsBreakdown ?? {
                basePoints: 0,
                attemptMultiplier: 1,
                attemptNumber: 1,
                baseAfterMultiplier: 0,
                firstTryBonus: 0,
                speedBonus: 0,
                totalPoints: 0,
              }
            }
            explanation={quiz.lastResult.explanation}
            correctIndex={quiz.lastResult.correctIndex}
            correctIndices={quiz.lastResult.correctIndices}
            attemptNumber={quiz.attemptNumber}
            onViewLeaderboard={onViewLeaderboard ? handleViewLeaderboard : undefined}
          />
          {renderSequenceControls(false)}
        </>
      );
    }

    // Active or incorrect state - show question
    if (quiz.question) {
      const isSubmitting = quiz.state === "submitting";
      const showIncorrect = quiz.state === "incorrect";

      return (
        <>
          <div className="quiz-question">
            <p className="quiz-question-prompt">{quiz.question.prompt}</p>
            <p className="quiz-question-meta">
              <span>Difficulty: {"★".repeat(quiz.question.difficulty)}</span>
              <span>Base: {quiz.question.basePoints} pts</span>
              {quiz.attemptNumber > 0 && (
                <span>Attempt #{quiz.attemptNumber}</span>
              )}
            </p>
          </div>

          {/* MCQ or Select-All */}
          {(quiz.question.type === "mcq" ||
            quiz.question.type === "select-all") &&
            quiz.question.choices && (
              <QuizCards
                choices={quiz.question.choices}
                type={quiz.question.type}
                onSubmit={handleSubmit}
                disabled={isSubmitting}
                wrongIndex={quiz.lastResult?.feedback?.wrongIndex}
                wrongIndices={quiz.lastResult?.feedback?.selectedIndices}
                showIncorrect={showIncorrect}
              />
            )}

          {/* Feedback message */}
          {showIncorrect && (
            <p className="quiz-feedback incorrect">Incorrect. Try again.</p>
          )}
          {renderSequenceControls(isSubmitting)}
        </>
      );
    }

    return null;
  };

  const shellTabs = useMemo(
    () => [
      { id: "quiz", label: "Quiz" },
      ...(isAdmin
        ? [
            { id: "admin", label: "Admin" },
            { id: "questions", label: "Questions" },
            { id: "schedule", label: "Schedule" },
          ]
        : []),
    ],
    [isAdmin]
  );

  const shellTitle =
    effectiveActiveTab === "admin"
      ? "Quiz Admin"
      : effectiveActiveTab === "questions"
        ? "Question Bank"
        : effectiveActiveTab === "schedule"
          ? "Quiz Schedule"
          : mode === "test"
            ? "Quiz Test Mode"
            : mode === "practice"
              ? "Practice Quiz"
            : "Daily Quiz";

  const panelContent = (
    <>
          {effectiveActiveTab === "quiz" && renderQuizContent()}
          {effectiveActiveTab === "admin" && isAdmin && (
            <div className="quiz-admin-panel">
              <div className="quiz-admin-row">
                <button
                  className="quest-menu-action-btn quest-menu-action-btn--ghost quiz-admin-btn"
                  onClick={handleLoadDaily}
                >
                  Load Daily Quiz
                </button>
                <button
                  className="quest-menu-action-btn quiz-admin-btn"
                  onClick={() => void handleStartSequence()}
                  disabled={adminLoading}
                >
                  Start Sequence
                </button>
              </div>
              <p className="quiz-admin-status">
                Sequence is schedule-based; only scheduled questions appear.
              </p>
              <div className="quiz-admin-row">
                <div className="quiz-admin-field">
                  <label htmlFor="admin-question-select">Question</label>
                  <input
                    id="admin-question-select"
                    list="admin-question-list"
                    value={selectedQuestionId}
                    onChange={(event) => setSelectedQuestionId(event.target.value)}
                    placeholder="q001"
                    className="quest-menu-auth-input"
                  />
                  <datalist id="admin-question-list">
                    {orderedQuestions.map((question) => (
                      <option key={question.id} value={question.id} />
                    ))}
                  </datalist>
                </div>
                <button
                  className="quest-menu-action-btn quiz-admin-btn"
                  onClick={handleLoadSelected}
                  disabled={!selectedQuestionId || adminLoading}
                >
                  Load Selected Question
                </button>
              </div>
              {adminLoading && <p className="quiz-admin-status">Loading...</p>}
              {adminError && (
                <p className="quiz-feedback error">{adminError}</p>
              )}
            </div>
          )}
          {effectiveActiveTab === "questions" && isAdmin && (
            <div className="quiz-admin-panel">
              <div className="quiz-admin-header">
                <h3>Questions</h3>
                <button
                  className="quest-menu-action-btn quiz-admin-btn"
                  onClick={openCreateEditor}
                >
                  Create Question
                </button>
              </div>
              {adminLoading && <p className="quiz-admin-status">Loading...</p>}
              {adminError && <p className="quiz-feedback error">{adminError}</p>}
              {renderQuestionSection(
                isQuizDebugEnabled ? "Editable Questions (v2)" : "Questions",
                editableQuestions,
                {
                  emptyMessage: "No editable questions found.",
                }
              )}
              {renderQuestionSection(
                isQuizDebugEnabled ? "Legacy Questions (read-only)" : "Read-only Questions",
                legacyQuestions,
                {
                  readOnly: true,
                  description: isQuizDebugEnabled
                    ? "Legacy puzzle-derived questions are read-only until migration."
                    : "Questions in this section are read-only.",
                  emptyMessage: "No read-only questions found.",
                }
              )}
              {editorState && (
                <div className="quiz-admin-modal">
                  <div className="quiz-admin-modal-panel">
                    <div className="quiz-admin-modal-header">
                      <h3>
                        {editorState.mode === "create" ? "Create" : "Edit"} Question
                      </h3>
                      <button
                        type="button"
                        className="quiz-admin-icon-btn"
                        onClick={closeEditor}
                      >
                        ✕
                      </button>
                    </div>
                    <div className="quiz-admin-form">
                      {editorState.mode === "edit" && (
                        <label className="quiz-admin-field">
                          <span>ID</span>
                          <input value={editorState.id ?? ""} disabled className="quest-menu-auth-input" />
                        </label>
                      )}
                      <label className="quiz-admin-field">
                        <span>Type</span>
                        <select
                          className="quest-menu-auth-select"
                          value={editorState.type}
                          onChange={(event) =>
                            handleTypeChange(event.target.value as QuestionType)
                          }
                        >
                          <option value="mcq">mcq</option>
                          <option value="select-all">select-all</option>
                        </select>
                      </label>
                      <label className="quiz-admin-field">
                        <span>Prompt</span>
                        <textarea
                          className="quest-menu-auth-input"
                          value={editorState.prompt}
                          onChange={(event) =>
                            setEditorState({
                              ...editorState,
                              prompt: event.target.value,
                            })
                          }
                        />
                      </label>
                      <label className="quiz-admin-field">
                        <span>Explanation</span>
                        <textarea
                          className="quest-menu-auth-input"
                          value={editorState.explanation}
                          onChange={(event) =>
                            setEditorState({
                              ...editorState,
                              explanation: event.target.value,
                            })
                          }
                        />
                      </label>
                      <div className="quiz-admin-row">
                        <label className="quiz-admin-field">
                          <span>Difficulty</span>
                          <select
                            className="quest-menu-auth-select"
                            value={editorState.difficulty}
                            onChange={(event) =>
                              handleDifficultyChange(
                                Number(event.target.value) as 1 | 2 | 3
                              )
                            }
                          >
                            <option value={1}>1</option>
                            <option value={2}>2</option>
                            <option value={3}>3</option>
                          </select>
                        </label>
                        <label className="quiz-admin-field">
                          <span>Base Points</span>
                          <input value={editorState.basePoints} disabled className="quest-menu-auth-input" />
                        </label>
                      </div>
                      <div className="quiz-admin-field">
                        <span>Tags</span>
                        <button
                          type="button"
                          className="quest-menu-action-btn quest-menu-action-btn--ghost quiz-admin-tag-toggle"
                          onClick={() => setTagDropdownOpen((prev) => !prev)}
                        >
                          {editorState.tags.length
                            ? editorState.tags.join(", ")
                            : "Select tags"}
                        </button>
                        {tagDropdownOpen && (
                          <div className="quiz-admin-tag-menu">
                            {TAG_OPTIONS.map((tag) => (
                              <label key={tag} className="quiz-admin-tag-option">
                                <input
                                  type="checkbox"
                                  checked={editorState.tags.includes(tag)}
                                  onChange={() => toggleTag(tag)}
                                />
                                <span>{tag}</span>
                              </label>
                            ))}
                          </div>
                        )}
                        <span className="quiz-admin-helper">
                          Tags are optional.
                        </span>
                      </div>
                      {(editorState.type === "mcq" ||
                        editorState.type === "select-all") && (
                        <div className="quiz-admin-field">
                          <span>Choices</span>
                          <div className="quiz-admin-choice-grid">
                            {editorState.choices.map((choice, index) => (
                              <div className="quiz-admin-choice" key={index}>
                                <input
                                  type={
                                    editorState.type === "mcq" ? "radio" : "checkbox"
                                  }
                                  checked={
                                    editorState.type === "mcq"
                                      ? editorState.correctIndex === index
                                      : editorState.correctIndices.includes(index)
                                  }
                                  onChange={() => toggleCorrectIndex(index)}
                                />
                                <input
                                  type="text"
                                  value={choice}
                                  onChange={(event) =>
                                    updateChoice(index, event.target.value)
                                  }
                                  placeholder={`Choice ${index + 1}`}
                                  className="quest-menu-auth-input"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {editorError && (
                        <p className="quiz-feedback error">{editorError}</p>
                      )}
                      {!editorError && editorDisabledMessage && (
                        <p className="quiz-feedback error">{editorDisabledMessage}</p>
                      )}
                      <div className="quiz-admin-row quiz-admin-actions">
                        <button
                          type="button"
                          className="quest-menu-action-btn quest-menu-action-btn--ghost quiz-admin-btn"
                          onClick={closeEditor}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="quest-menu-action-btn quiz-admin-btn"
                          onClick={handleSave}
                          disabled={!editorCanSave}
                        >
                          {editorSaving ? "Saving..." : "Save"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          {effectiveActiveTab === "schedule" && isAdmin && (
            <div className="quiz-admin-panel">
              <div className="quiz-admin-header">
                <h3>Schedule</h3>
                <select
                  className="quest-menu-auth-select"
                  value={scheduleRange}
                  onChange={(event) =>
                    setScheduleRange(event.target.value as RangeOption)
                  }
                >
                  <option value="week">Week</option>
                  <option value="month">Month</option>
                  <option value="year">Year</option>
                </select>
              </div>
              <div className="quiz-admin-banner">
                ⚠ {missingCount} of the next {dateList.length} days have no
                usable question scheduled.
              </div>
              {scheduleLoading && <p className="quiz-admin-status">Loading...</p>}
              {scheduleError && <p className="quiz-feedback error">{scheduleError}</p>}
              <div className="quiz-admin-table">
                <div className="quiz-admin-table-row quiz-admin-table-head quiz-admin-schedule-head">
                  <span>Date</span>
                  <span>Day</span>
                  <span>Question</span>
                  <span>Preview</span>
                  <span>Status</span>
                </div>
                {dateList.map((date) => {
                  const entry = scheduleMap.get(date);
                  const question = entry
                    ? adminQuestions.find((q) => q.id === entry.questionId)
                    : null;
                  const isUnscheduled = !entry;
                  const isBrokenSchedule = !!entry && !question;
                  const actionLabel = isUnscheduled
                    ? "Assign"
                    : isBrokenSchedule
                      ? "Repair"
                      : "Change";
                  return (
                    <div
                      className={`quiz-admin-table-row quiz-admin-schedule-row ${
                        assignDate === date ? "is-active" : ""
                      } ${isUnscheduled || isBrokenSchedule ? "is-missing" : ""}`}
                      key={date}
                    >
                      <span>{date}</span>
                      <span>{getDayOfWeek(date)}</span>
                      <span>{entry?.questionId ?? "-"}</span>
                      <span className={question ? undefined : "quiz-admin-missing-text"}>
                        {question
                          ? getPromptPreview(question.prompt)
                          : isBrokenSchedule
                            ? "Scheduled question missing from question bank"
                            : "No question selected"}
                      </span>
                      <span
                        className={`quiz-admin-status-cell ${
                          isUnscheduled || isBrokenSchedule ? "is-missing" : "is-scheduled"
                        }`}
                      >
                        {!isUnscheduled && !isBrokenSchedule && (
                          <span className="quiz-admin-status-label">Scheduled</span>
                        )}
                        {isUnscheduled && (
                          <span className="quiz-admin-status-label quiz-admin-status-label--missing">
                            No question selected
                          </span>
                        )}
                        {isBrokenSchedule && (
                          <span className="quiz-admin-status-label quiz-admin-status-label--missing">
                            Scheduled question missing
                          </span>
                        )}
                        <button
                          type="button"
                          className={`quest-menu-action-btn quiz-admin-btn quiz-admin-assign-btn ${
                            isUnscheduled || isBrokenSchedule ? "is-missing" : ""
                          }`}
                          onClick={() => void openAssign(date)}
                        >
                          {actionLabel}
                        </button>
                      </span>
                      {assignDate === date && (
                        <div className="quiz-admin-assign">
                          <select
                            className="quest-menu-auth-select"
                            value={assignQuestionId}
                            onChange={(event) => setAssignQuestionId(event.target.value)}
                          >
                            {assignableQuestions.length === 0 && (
                              <option value="">{NO_V2_ASSIGNABLE_MESSAGE}</option>
                            )}
                            {assignableQuestions.map((question) => (
                              <option key={question.id} value={question.id}>
                                {question.id} — {getPromptPreview(question.prompt)}
                              </option>
                            ))}
                          </select>
                          <div className="quiz-admin-row">
                            <button
                              type="button"
                              className="quest-menu-action-btn quiz-admin-btn"
                              onClick={() => handleAssignSave(date)}
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              className="quest-menu-action-btn quest-menu-action-btn--ghost quiz-admin-btn"
                              onClick={closeAssign}
                            >
                              Cancel
                            </button>
                          </div>
                          {scheduleErrorsByDate[date] && (
                            <p className="quiz-feedback error">
                              {scheduleErrorsByDate[date]}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
    </>
  );

  if (variant === "embedded") {
    return (
      <div className="quest-menu-content quiz-modal-body" style={{ height: "100%" }}>
        {panelContent}
      </div>
    );
  }

  return (
    <NeumontPanelShell
      title={shellTitle}
      onClose={handleClose}
      tabs={shellTabs}
      activeTabId={effectiveActiveTab}
      onTabSelect={(tabId) => setActiveTab(tabId as Tab)}
      maxWidth={760}
      panelClassName="quiz-modal-panel"
      contentClassName="quiz-modal-body"
      panelStyle={{
        width: "min(760px, 92vw)",
        height: "min(88vh, 820px)",
      }}
      headerRight={
        effectiveActiveTab === "quiz" && (mode === "daily" || mode === "practice") ? (
          <span className="quiz-modal-timer nums">
            {(() => {
              const totalSeconds = Math.floor(quiz.elapsedMs / 1000);
              const minutes = Math.floor(totalSeconds / 60);
              const seconds = totalSeconds % 60;
              return `${minutes.toString().padStart(2, "0")}:${seconds
                .toString()
                .padStart(2, "0")}`;
            })()}
          </span>
        ) : undefined
      }
      footerHint={
        effectiveActiveTab === "quiz"
          ? mode === "practice"
            ? "Practice mode does not save progress."
            : "Complete today's quiz to build your streak."
          : effectiveActiveTab === "admin"
            ? "Run tests and load quiz questions."
            : effectiveActiveTab === "questions"
              ? "Create and manage quiz questions."
              : "Review daily schedule coverage."
      }
    >
      {panelContent}
    </NeumontPanelShell>
  );
}
