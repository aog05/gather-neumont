/**
 * useQuiz hook - manages guest quiz flow state and API calls.
 */

import { useState, useCallback, useRef, useEffect } from "react";

// Generate a random guest token for this session
function generateGuestToken(): string {
  return `guest_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

// Get or create guest token from sessionStorage
function getGuestToken(): string {
  const stored = sessionStorage.getItem("guestToken");
  if (stored) return stored;
  const token = generateGuestToken();
  sessionStorage.setItem("guestToken", token);
  return token;
}

export type QuestionType = "mcq" | "select-all" | "written";

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
  pointsBreakdown?: PointsBreakdown;
  explanation?: string;
  correctIndex?: number;
  correctIndices?: number[];
  acceptedAnswers?: string[];
  quizDate: string;
  rollover?: boolean;
  newQuestion?: Question;
  alreadySolved?: boolean;
  alreadyCompleted?: boolean;
  canRetry?: boolean;
  message?: string;
  error?: string;
}

export type QuizState =
  | "idle"
  | "loading"
  | "active"
  | "submitting"
  | "incorrect"
  | "correct"
  | "completed"
  | "error";

export interface UseQuizReturn {
  state: QuizState;
  question: Question | null;
  quizDate: string | null;
  attemptNumber: number;
  lastResult: SubmitResult | null;
  error: string | null;
  startQuiz: () => Promise<void>;
  submitAnswer: (answer: unknown) => Promise<SubmitResult | null>;
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
  // Timer ref for tracking elapsed time
  const startTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);
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

  const startQuiz = useCallback(async () => {
    setState("loading");
    setError(null);

    try {
      const response = await fetch("/api/quiz/start", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to start quiz");
      }

      if (data.alreadyCompleted) {
        setQuestion(null);
        setQuizDate(data.quizDate);
        setAttemptNumber(0);
        setLastResult(data);
        setState("completed");
        return;
      }

      setQuestion(data.question);
      setQuizDate(data.quizDate);
      setAttemptNumber(0);
      setLastResult(null);
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
  }, [guestToken]);

  const submitAnswer = useCallback(
    async (answer: unknown): Promise<SubmitResult | null> => {
      if (!question) return null;

      setState("submitting");

      // Calculate elapsed time
      const elapsed = startTimeRef.current
        ? Date.now() - startTimeRef.current
        : 0;
      setElapsedMs(elapsed);

      try {
        const response = await fetch("/api/quiz/submit", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            guestToken,
            questionId: question.id,
            answer,
            elapsedMs: elapsed,
          }),
        });

        const data: SubmitResult = await response.json();

        setLastResult(data);
        if (typeof data.attemptNumber === "number") {
          setAttemptNumber(data.attemptNumber);
        }

        if (data.alreadyCompleted) {
          setQuestion(null);
          setState("completed");
          if (intervalRef.current) {
            window.clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        } else if (data.rollover && data.newQuestion) {
          // Day rolled over, update to new question
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
    [question, guestToken]
  );

  const reset = useCallback(() => {
    setState("idle");
    setQuestion(null);
    setQuizDate(null);
    setAttemptNumber(0);
    setLastResult(null);
    setError(null);
    startTimeRef.current = null;
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
    submitAnswer,
    reset,
    elapsedMs,
  };
}
