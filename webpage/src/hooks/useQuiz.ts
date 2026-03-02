/**
 * useQuiz hook - manages guest quiz flow state and API calls.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { AnalyticsService, AnalyticsEventType } from "../services/analytics.service";

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

  console.log(`[useQuiz] 🎯 Hook state:`, {
    state,
    hasQuestion: !!question,
    quizDate,
    attemptNumber,
    hasLastResult: !!lastResult,
    error,
    elapsedMs
  });

  useEffect(() => {
    console.log(`[useQuiz] 🏁 Hook initialized - setting up cleanup`);
    return () => {
      console.log(`[useQuiz] 🧹 Hook cleanup - clearing timer interval`);
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
    console.log(`[useQuiz] 🚀 Starting quiz...`);
    setState("loading");
    setError(null);

    try {
      console.log(`[useQuiz] 📡 Fetching quiz from /api/quiz/start`);
      const response = await fetch("/api/quiz/start", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestToken }),
      });

      const data = await response.json();
      console.log(`[useQuiz] 📦 Received response:`, data);

      if (!response.ok) {
        console.error(`[useQuiz] ❌ API error:`, data.error);
        throw new Error(data.error || "Failed to start quiz");
      }

      if (data.alreadyCompleted) {
        console.log(`[useQuiz] ✅ Quiz already completed for today`);
        setQuestion(null);
        setQuizDate(data.quizDate);
        setAttemptNumber(0);
        setLastResult(data);
        setState("completed");
        return;
      }

      console.log(`[useQuiz] 📝 Quiz started - Question loaded:`, {
        type: data.question.type,
        difficulty: data.question.difficulty,
        basePoints: data.question.basePoints,
        quizDate: data.quizDate
      });

      // Track quiz start analytics
      const analyticsService = AnalyticsService.getInstance();
      analyticsService.trackEvent(
        AnalyticsEventType.QUIZ_START,
        guestToken,
        {
          questionId: data.question.id,
          questionType: data.question.type,
          difficulty: data.question.difficulty,
          basePoints: data.question.basePoints,
          quizDate: data.quizDate,
        }
      );

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
      console.log(`[useQuiz] ⏱️ Timer started - tracking elapsed time`);
      setState("active");
      console.log(`[useQuiz] ✅ Quiz state set to 'active'`);
    } catch (err) {
      console.error(`[useQuiz] ❌ Error starting quiz:`, err);
      setError(err instanceof Error ? err.message : "Unknown error");
      setState("error");
    }
  }, [guestToken]);

  const submitAnswer = useCallback(
    async (answer: unknown): Promise<SubmitResult | null> => {
      if (!question) {
        console.warn(`[useQuiz] ⚠️ Cannot submit - no question loaded`);
        return null;
      }

      console.log(`[useQuiz] 📤 Submitting answer:`, {
        questionId: question.id,
        questionType: question.type,
        answer,
        attemptNumber: attemptNumber + 1
      });
      setState("submitting");

      // Calculate elapsed time
      const elapsed = startTimeRef.current
        ? Date.now() - startTimeRef.current
        : 0;
      setElapsedMs(elapsed);
      console.log(`[useQuiz] ⏱️ Elapsed time: ${(elapsed / 1000).toFixed(2)}s`);

      try {
        console.log(`[useQuiz] 📡 Posting to /api/quiz/submit`);
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
        console.log(`[useQuiz] 📦 Submit response:`, data);

        // Track quiz attempt analytics
        const analyticsService = AnalyticsService.getInstance();
        analyticsService.trackEvent(
          AnalyticsEventType.QUIZ_ATTEMPT,
          guestToken,
          {
            questionId: question.id,
            questionType: question.type,
            attemptNumber: data.attemptNumber || attemptNumber + 1,
            correct: data.correct || false,
            elapsedMs: elapsed,
            elapsedSeconds: (elapsed / 1000).toFixed(2),
          }
        );

        setLastResult(data);
        if (typeof data.attemptNumber === "number") {
          console.log(`[useQuiz] 🔢 Attempt number: ${data.attemptNumber}`);
          setAttemptNumber(data.attemptNumber);
        }

        if (data.alreadyCompleted) {
          console.log(`[useQuiz] ✅ Quiz completed!`);

          // Track quiz completion analytics
          analyticsService.trackEvent(
            AnalyticsEventType.QUIZ_COMPLETE,
            guestToken,
            {
              questionId: question.id,
              pointsEarned: data.pointsEarned || 0,
              attemptNumber: data.attemptNumber || attemptNumber,
              elapsedMs: elapsed,
              quizDate: data.quizDate,
            }
          );

          setQuestion(null);
          setState("completed");
          if (intervalRef.current) {
            window.clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        } else if (data.rollover && data.newQuestion) {
          console.log(`[useQuiz] 🔄 Day rollover detected - loading new question`);
          // Day rolled over, update to new question
          setQuestion(data.newQuestion);
          setQuizDate(data.quizDate);
          startTimeRef.current = Date.now();
          setElapsedMs(0);
          setState("active");
        } else if (data.correct) {
          console.log(`[useQuiz] ✅ Answer CORRECT! Points: ${data.pointsEarned}`);

          // Track quiz completion analytics
          analyticsService.trackEvent(
            AnalyticsEventType.QUIZ_COMPLETE,
            guestToken,
            {
              questionId: question.id,
              pointsEarned: data.pointsEarned || 0,
              attemptNumber: data.attemptNumber || attemptNumber + 1,
              elapsedMs: elapsed,
              quizDate: data.quizDate,
            }
          );

          setState("correct");
          if (intervalRef.current) {
            window.clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        } else {
          console.log(`[useQuiz] ❌ Answer INCORRECT - try again`);
          setState("incorrect");
        }

        return data;
      } catch (err) {
        console.error(`[useQuiz] ❌ Error submitting answer:`, err);
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
