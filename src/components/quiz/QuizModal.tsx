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
type RangeOption = typeof RANGE_OPTIONS[number];

export function QuizModal({
  isOpen,
  onClose,
  isAdmin = false,
  initialTab,
  activeTabOverride,
  onViewLeaderboard,
  variant = "modal",
  closeHandleRef,
}: QuizModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>("quiz");
  const [mode, setMode] = useState<"daily" | "test">("daily");
  const [adminQuestions, setAdminQuestions] = useState<Question[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [selectedQuestionId, setSelectedQuestionId] = useState("");
  const [testQuestion, setTestQuestion] = useState<Question | null>(null);
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

  const refreshAdminQuestions = useCallback(async () => {
    setAdminLoading(true);
    setAdminError(null);
    try {
      const res = await fetch("/api/admin/questions");
      const data = (await res.json()) as { questions?: Question[] };
      if (!res.ok) {
        throw new Error("Failed to load questions");
      }
      setAdminQuestions(data.questions ?? []);
      if (!selectedQuestionId && data.questions?.length) {
        setSelectedQuestionId(data.questions[0].id);
      }
    } catch {
      setAdminError("Failed to load admin questions");
    } finally {
      setAdminLoading(false);
    }
  }, [selectedQuestionId]);

  const refreshSchedule = useCallback(async () => {
    setScheduleLoading(true);
    setScheduleError(null);
    try {
      const res = await fetch("/api/admin/schedule");
      const data = (await res.json()) as { schedule?: ScheduleEntry[] };
      if (!res.ok) {
        throw new Error("Failed to load schedule");
      }
      setScheduleEntries(data.schedule ?? []);
    } catch {
      setScheduleError("Failed to load schedule");
    } finally {
      setScheduleLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen || !isAdmin) return;
    const load = async () => {
      await refreshAdminQuestions();
      await refreshSchedule();
    };
    load();
    return () => {};
  }, [isOpen, isAdmin]);

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
      const aNum = matchA ? Number.parseInt(matchA[1], 10) : Number.MAX_SAFE_INTEGER;
      const bNum = matchB ? Number.parseInt(matchB[1], 10) : Number.MAX_SAFE_INTEGER;
      if (aNum !== bNum) return aNum - bNum;
      return String(a.id).localeCompare(String(b.id));
    });
    return clone;
  }, [adminQuestions]);

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
    setSequenceIds(null);
    loadTestQuestion(selectedQuestionId, null);
  };

  const handleStartSequence = () => {
    if (orderedQuestions.length === 0) return;
    const ids = orderedQuestions.map((question) => question.id);
    loadTestQuestion(ids[0], ids, 0);
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
    loadTestQuestion(nextId, sequenceIds ?? null, nextIndex);
  };

  const handleLoadDaily = () => {
    setMode("daily");
    setTestQuestion(null);
    setTestResult(null);
    setTestError(null);
    setSequenceIds(null);
    setSequenceMessage(null);
    quiz.reset();
    setActiveTab("quiz");
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
    const today = new Date();
    const list: string[] = [];
    for (let i = 0; i < days; i += 1) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const key = date.toISOString().slice(0, 10);
      list.push(key);
    }
    return list;
  };

  const getDayOfWeek = (dateKey: string) => {
    const date = new Date(`${dateKey}T00:00:00`);
    return date.toLocaleDateString(undefined, { weekday: "short" });
  };

  const scheduleMap = useMemo(() => {
    const map = new Map<string, ScheduleEntry>();
    scheduleEntries.forEach((entry) => map.set(entry.date, entry));
    return map;
  }, [scheduleEntries]);

  const scheduledQuestionIds = useMemo(() => {
    const unique = new Set(scheduleEntries.map((entry) => entry.questionId));
    return unique;
  }, [scheduleEntries]);

  const remainingQuestions = useMemo(() => {
    const total = adminQuestions.length;
    return total - scheduledQuestionIds.size;
  }, [adminQuestions.length, scheduledQuestionIds.size]);

  const dateList = useMemo(() => getDateList(scheduleRange), [scheduleRange]);
  const missingCount = dateList.filter((date) => !scheduleMap.has(date)).length;

  const openAssign = (date: string) => {
    setAssignDate(date);
    setAssignQuestionId(adminQuestions[0]?.id ?? "");
    setScheduleErrorsByDate((prev) => ({ ...prev, [date]: "" }));
  };

  const closeAssign = () => {
    setAssignDate(null);
    setAssignQuestionId("");
  };

  const handleAssignSave = async (date: string) => {
    if (!assignQuestionId) {
      setScheduleErrorsByDate((prev) => ({
        ...prev,
        [date]: "Select a question.",
      }));
      return;
    }
    try {
      const res = await fetch("/api/admin/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, questionId: assignQuestionId }),
      });
      if (res.status === 409) {
        setScheduleErrorsByDate((prev) => ({
          ...prev,
          [date]: "Already scheduled.",
        }));
        return;
      }
      if (!res.ok) {
        setScheduleErrorsByDate((prev) => ({
          ...prev,
          [date]: "Failed to assign.",
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
    setEditorState({
      mode: "create",
      type: "mcq",
      prompt: "",
      explanation: "",
      difficulty: 1,
      basePoints: BASE_POINTS[1],
      tags: [],
      choices: [...EMPTY_MCQ_CHOICES],
      correctIndex: 0,
      correctIndices: [0],
    });
  };

  const openEditEditor = (question: Question) => {
    setEditorError(null);
    setEditorState({
      mode: "edit",
      id: question.id,
      type: question.type,
      prompt: question.prompt ?? "",
      explanation: question.explanation ?? "",
      difficulty: question.difficulty,
      basePoints: question.basePoints,
      tags: question.tags ?? [],
      choices: [...(question.choices ?? [])],
      correctIndex: question.type === "mcq" ? question.correctIndex : 0,
      correctIndices:
        question.type === "select-all"
          ? [...question.correctIndices]
          : question.type === "mcq"
            ? [question.correctIndex]
            : [],
    });
  };

  const closeEditor = () => {
    setEditorState(null);
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
      basePoints: BASE_POINTS[difficulty],
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

  const buildEditorPayload = () => {
    if (!editorState) return null;
    const payload: any = {
      type: editorState.type,
      prompt: editorState.prompt.trim(),
      explanation: editorState.explanation.trim(),
      difficulty: editorState.difficulty,
      basePoints: editorState.basePoints,
      tags: editorState.tags,
    };

    if (editorState.type === "mcq") {
      payload.choices = editorState.choices.slice(0, 4);
      payload.correctIndex = editorState.correctIndex;
    }
    if (editorState.type === "select-all") {
      payload.choices = editorState.choices.slice(0, 5);
      payload.correctIndices = editorState.correctIndices;
    }
    return payload;
  };

  const validateEditor = () => {
    if (!editorState) return { valid: false, error: "Missing editor state" };
    if (!editorState.prompt.trim()) {
      return { valid: false, error: "Prompt is required." };
    }
    if (editorState.tags.length < 2 || editorState.tags.length > 4) {
      return { valid: false, error: "Select 2-4 tags." };
    }
    if (editorState.basePoints !== BASE_POINTS[editorState.difficulty]) {
      return { valid: false, error: "Base points mismatch for difficulty." };
    }
    if (editorState.type === "mcq") {
      if (editorState.choices.length !== 4 || editorState.choices.some((c) => !c.trim())) {
        return { valid: false, error: "MCQ requires 4 non-empty choices." };
      }
      if (
        !Number.isInteger(editorState.correctIndex) ||
        editorState.correctIndex < 0 ||
        editorState.correctIndex > 3
      ) {
        return { valid: false, error: "Pick a correct answer." };
      }
    }
    if (editorState.type === "select-all") {
      if (editorState.choices.length !== 5 || editorState.choices.some((c) => !c.trim())) {
        return { valid: false, error: "Select-all requires 5 non-empty choices." };
      }
      if (editorState.correctIndices.length < 1) {
        return { valid: false, error: "Select at least one correct answer." };
      }
    }
    return { valid: true, error: "" };
  };

  const handleSave = async () => {
    if (!editorState) return;
    const validation = validateEditor();
    if (!validation.valid) {
      setEditorError(validation.error);
      return;
    }
    setEditorSaving(true);
    setEditorError(null);
    const payload = buildEditorPayload();
    if (!payload) return;

    try {
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
        const data = (await res.json()) as { error?: string };
        setEditorError(data.error ?? "Failed to save question");
        return;
      }
      await refreshAdminQuestions();
      closeEditor();
    } catch {
      setEditorError("Failed to save question");
    } finally {
      setEditorSaving(false);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    const confirmed = window.confirm("Delete this question?");
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/admin/questions/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        setAdminError("Failed to delete question");
        return;
      }
      await refreshAdminQuestions();
    } catch {
      setAdminError("Failed to delete question");
    }
  };

  if (!isOpen) return null;

  const renderQuizContent = () => {
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
                correctIndex={testQuestion.correctIndex}
                correctIndices={testQuestion.correctIndices}
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
          <p>Loading today's quiz...</p>
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
            onClick={quiz.startQuiz}
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

    // Idle state - show start button
    if (quiz.state === "idle") {
      return (
        <div className="quiz-loading">
          <p style={{ marginBottom: 16, color: "#ccc" }}>
            Ready to test your CS knowledge?
          </p>
          <button
            className="quest-menu-action-btn quest-menu-action-btn--primary"
            onClick={quiz.startQuiz}
            style={{ width: "auto", padding: "14px 40px" }}
          >
            Start Today's Quiz
          </button>
        </div>
      );
    }

    // Correct state - show result
    if (quiz.state === "correct" && quiz.lastResult && quiz.question) {
      return (
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
    (activeTabOverride ?? activeTab) === "admin"
      ? "Quiz Admin"
      : (activeTabOverride ?? activeTab) === "questions"
        ? "Question Bank"
        : (activeTabOverride ?? activeTab) === "schedule"
          ? "Quiz Schedule"
          : mode === "test"
            ? "Quiz Test Mode"
            : "Daily Quiz";

  const effectiveActiveTab = activeTabOverride ?? activeTab;

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
                  onClick={handleStartSequence}
                  disabled={adminLoading || orderedQuestions.length === 0}
                >
                  Start Sequence
                </button>
              </div>
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
              <div className="quiz-admin-table">
                <div className="quiz-admin-table-row quiz-admin-table-head">
                  <span>ID</span>
                  <span>Type</span>
                  <span>Diff</span>
                  <span>Prompt</span>
                  <span>Tags</span>
                </div>
                {orderedQuestions.map((question) => (
                  <div
                    className={`quiz-admin-table-row ${
                      editorState?.id === question.id ? "is-active" : ""
                    }`}
                    key={question.id}
                  >
                    <span>{question.id}</span>
                    <span>{question.type}</span>
                    <span>{question.difficulty}</span>
                    <span title={question.prompt}>
                      {getTruncatedPrompt(question.prompt)}
                    </span>
                    <span className="quiz-admin-tags">
                      {(question.tags ?? []).join(", ")}
                    </span>
                    <div className="quiz-admin-row-actions">
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
                    </div>
                  </div>
                ))}
              </div>
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
                          Pick 2–4 tags.
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
                          disabled={editorSaving || !validateEditor().valid}
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
                question scheduled.
              </div>
              {remainingQuestions < 10 && (
                <div className="quiz-admin-banner warning">
                  ⚠ Only {remainingQuestions} unscheduled questions left.
                </div>
              )}
              {scheduleLoading && <p className="quiz-admin-status">Loading...</p>}
              {scheduleError && <p className="quiz-feedback error">{scheduleError}</p>}
              <div className="quiz-admin-table">
                <div className="quiz-admin-table-row quiz-admin-table-head">
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
                  return (
                    <div
                      className={`quiz-admin-table-row ${
                        assignDate === date ? "is-active" : ""
                      }`}
                      key={date}
                    >
                      <span>{date}</span>
                      <span>{getDayOfWeek(date)}</span>
                      <span>{entry?.questionId ?? "-"}</span>
                      <span
                        className={question ? undefined : "quiz-admin-muted"}
                      >
                        {question
                          ? `${entry?.questionId} — ${getPromptPreview(question.prompt)}`
                          : "No question selected"}
                      </span>
                      <span className="quiz-admin-status-cell">
                        {entry ? "Scheduled" : "Empty"}
                        {!entry && (
                          <button
                            type="button"
                            className="quiz-admin-icon-btn"
                            onClick={() => openAssign(date)}
                          >
                            Assign
                          </button>
                        )}
                      </span>
                      {assignDate === date && (
                        <div className="quiz-admin-assign">
                          <select
                            className="quest-menu-auth-select"
                            value={assignQuestionId}
                            onChange={(event) => setAssignQuestionId(event.target.value)}
                          >
                            {orderedQuestions.map((question) => (
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
        effectiveActiveTab === "quiz" && mode === "daily" ? (
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
          ? "Complete today's quiz to build your streak."
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
