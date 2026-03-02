import { useState, useCallback, useRef, useEffect } from "react";

function generateGuestToken(): string {
  return `guest_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

function getGuestToken(): string {
  const stored = sessionStorage.getItem("guestToken");
  if (stored) return stored;
  const token = generateGuestToken();
  sessionStorage.setItem("guestToken", token);
  return token;
}

export type QuestionType = "mcq" | "select-all";

export interface Question {
  id: string;
  type: QuestionType;
  prompt: string;
  choices?: string[];
  explanation?: string;
  difficulty: 1 | 2 | 3;
  tags?: string[];
  basePoints: number;
}

export interface PointsBreakdown {
  basePoints: number;
  attemptMultiplier: number;
  attemptNumber: number;
  baseAfterMultiplier: number;
  firstTryBonus: number;
  speedBonus: number;
  totalPoints: number;
}

export interface SubmitResult {
  correct?: boolean;
  attemptNumber?: number;
  feedback?: {
    wrongIndex?: number;
    selectedIndices?: number[];
  };
  pointsEarned?: number;
  totalPoints?: number | null;
  streakDays?: number | null;
  completedAt?: string | null;
  pointsBreakdown?: PointsBreakdown;
  explanation?: string;
  correctIndex?: number;
  correctIndices?: number[];
  quizDate: string;
  rollover?: boolean;
  newQuestion?: Question;
  alreadySolved?: boolean;
  alreadyCompleted?: boolean;
  canRetry?: boolean;
  message?: string;
  error?: string;
  code?: string;
  practiceAttemptId?: string;
}

export type QuizState =
  | "idle"
  | "loading"
  | "active"
  | "submitting"
  | "incorrect"
  | "correct"
  | "completed"
  | "unavailable"
  | "error";

export interface UseQuizReturn {
  state: QuizState;
  question: Question | null;
  quizDate: string | null;
  attemptNumber: number;
  lastResult: SubmitResult | null;
  error: string | null;
  startQuiz: () => Promise<void>;
  startPracticeQuiz: (questionId?: string) => Promise<void>;
  submitAnswer: (answer: unknown) => Promise<SubmitResult | null>;
  submitPracticeAnswer: (answer: unknown) => Promise<SubmitResult | null>;
  reset: () => void;
  elapsedMs: number;
}

export function useQuiz(): UseQuizReturn {
  const [state, setState] = useState<QuizState>("idle");
  const [question, setQuestion] = useState<Question | null>(null);
  const [quizDate, setQuizDate] = useState<string | null>(null);
  const [attemptNumber, setAttemptNumber] = useState(0);
  const [lastResult, setLastResult] = useState<SubmitResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);
  const practiceAttemptIdRef = useRef<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const ticking =
      state === "active" || state === "incorrect" || state === "submitting";
    if (!ticking && intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [state]);

  const guestToken = getGuestToken();

  const parseErrorMessage = (data: any, fallback: string): string => {
    if (typeof data?.message === "string" && data.message.trim().length > 0) {
      return data.message;
    }
    if (typeof data?.error === "string" && data.error.trim().length > 0) {
      return data.error;
    }
    return fallback;
  };

  const startQuizAt = useCallback(
    async (endpoint: string, payload: Record<string, unknown>) => {
      setState("loading");
      setError(null);

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = (await response.json()) as SubmitResult;
        if (!response.ok) {
          if (data.code === "NO_QUIZ_SCHEDULED_TODAY") {
            practiceAttemptIdRef.current = null;
            setQuestion(null);
            setQuizDate(data.quizDate ?? null);
            setAttemptNumber(0);
            setLastResult(data);
            setState("unavailable");
            return;
          }
          throw new Error(parseErrorMessage(data, "Failed to start quiz"));
        }

        if (data.alreadyCompleted) {
          practiceAttemptIdRef.current = null;
          setQuestion(null);
          setQuizDate(data.quizDate);
          setAttemptNumber(0);
          setLastResult(data);
          setState("completed");
          return;
        }

        const startQuestion = (data as any).question as Question | undefined;
        if (!startQuestion) {
          throw new Error("No question returned from start endpoint");
        }

        setQuestion(startQuestion);
        setQuizDate(data.quizDate);
        setAttemptNumber(0);
        setLastResult(null);
        practiceAttemptIdRef.current =
          typeof data.practiceAttemptId === "string" ? data.practiceAttemptId : null;
        startTimeRef.current = Date.now();
        if (intervalRef.current) {
          window.clearInterval(intervalRef.current);
        }
        intervalRef.current = window.setInterval(() => {
          if (startTimeRef.current) {
            setElapsedMs(Date.now() - startTimeRef.current);
          }
        }, 250);
        setState("active");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        setState("error");
      }
    },
    []
  );

  const startQuiz = useCallback(async () => {
    await startQuizAt("/api/quiz/start", { guestToken });
  }, [guestToken, startQuizAt]);

  const startPracticeQuiz = useCallback(
    async (questionId?: string) => {
      await startQuizAt("/api/quiz/practice/start", {
        guestToken,
        ...(questionId ? { questionId } : {}),
      });
    },
    [guestToken, startQuizAt]
  );

  const submitAnswerAt = useCallback(
    async (
      endpoint: string,
      answer: unknown,
      options?: { practice?: boolean }
    ): Promise<SubmitResult | null> => {
      if (!question) return null;

      setState("submitting");
      const elapsed = startTimeRef.current ? Date.now() - startTimeRef.current : 0;
      setElapsedMs(elapsed);

      try {
        const body: Record<string, unknown> = {
          guestToken,
          answer,
          elapsedMs: elapsed,
        };
        if (options?.practice) {
          body.practiceAttemptId = practiceAttemptIdRef.current;
        } else {
          body.questionId = question.id;
        }

        const response = await fetch(endpoint, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        const data: SubmitResult = await response.json();
        if (!response.ok) {
          if (data.code === "NO_QUIZ_SCHEDULED_TODAY") {
            practiceAttemptIdRef.current = null;
            setQuestion(null);
            setQuizDate(data.quizDate ?? null);
            setLastResult(data);
            setState("unavailable");
            return data;
          }
          throw new Error(parseErrorMessage(data, "Failed to submit answer"));
        }

        setLastResult(data);
        if (typeof data.attemptNumber === "number") {
          setAttemptNumber(data.attemptNumber);
        }
        if (typeof data.practiceAttemptId === "string") {
          practiceAttemptIdRef.current = data.practiceAttemptId;
        }

        if (data.alreadyCompleted) {
          practiceAttemptIdRef.current = null;
          setQuestion(null);
          setState("completed");
          if (intervalRef.current) {
            window.clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        } else if (data.rollover && data.newQuestion) {
          setQuestion(data.newQuestion);
          setQuizDate(data.quizDate);
          startTimeRef.current = Date.now();
          setElapsedMs(0);
          setState("active");
        } else if (data.correct) {
          setState("correct");
          if (intervalRef.current) {
            window.clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        } else {
          setState("incorrect");
        }

        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        setState("error");
        return null;
      }
    },
    [guestToken, question]
  );

  const submitAnswer = useCallback(
    async (answer: unknown): Promise<SubmitResult | null> =>
      submitAnswerAt("/api/quiz/submit", answer),
    [submitAnswerAt]
  );

  const submitPracticeAnswer = useCallback(
    async (answer: unknown): Promise<SubmitResult | null> =>
      submitAnswerAt("/api/quiz/practice/submit", answer, { practice: true }),
    [submitAnswerAt]
  );

  const reset = useCallback(() => {
    setState("idle");
    setQuestion(null);
    setQuizDate(null);
    setAttemptNumber(0);
    setLastResult(null);
    setError(null);
    startTimeRef.current = null;
    practiceAttemptIdRef.current = null;
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setElapsedMs(0);
  }, []);

  return {
    state,
    question,
    quizDate,
    attemptNumber,
    lastResult,
    error,
    startQuiz,
    startPracticeQuiz,
    submitAnswer,
    submitPracticeAnswer,
    reset,
    elapsedMs,
  };
}
