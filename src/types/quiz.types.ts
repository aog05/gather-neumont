/**
 * Shared TypeScript types for the Daily Quiz subsystem
 */

// ============ Question Types ============

export type QuestionType = "mcq" | "select-all" | "written";

export interface BaseQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  explanation?: string;
  difficulty: 1 | 2 | 3; // 1=easy, 2=medium, 3=hard
  tags?: string[];
  basePoints: number;
}

export interface McqQuestion extends BaseQuestion {
  type: "mcq";
  choices: string[];
  correctIndex: number;
}

export interface SelectAllQuestion extends BaseQuestion {
  type: "select-all";
  choices: string[];
  correctIndices: number[];
}

export interface WrittenQuestion extends BaseQuestion {
  type: "written";
  acceptedAnswers: string[]; // normalized: trimmed, lowercase, collapsed spaces
}

export type Question = McqQuestion | SelectAllQuestion | WrittenQuestion;

// ============ Schedule Types ============

export interface ScheduleEntry {
  date: string; // YYYY-MM-DD
  questionId: string;
  scheduledAt: string; // ISO timestamp
  scheduledBy: string; // admin userId or "system"
}

export interface ScheduleFile {
  version: 1;
  entries: ScheduleEntry[];
}

// ============ User Types ============

export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  isAdmin: boolean;
  createdAt: string; // ISO timestamp
}

export interface UserFile {
  version: 1;
  users: User[];
}

// ============ Progress Types ============

export interface DailyAttempt {
  userId?: string;
  guestToken?: string;
  date: string; // YYYY-MM-DD
  questionId: string;
  attempts: number;
  solvedOnAttempt: number | null; // null if unsolved
  elapsedMs: number | null; // client-reported, null if unsolved
  pointsAwarded: number;
}

export interface UserProgress {
  userId?: string;
  guestToken?: string;
  currentStreak: number;
  longestStreak: number;
  totalPoints: number;
  lastCompletedDate: string | null; // YYYY-MM-DD or null
  dailyAttempts: DailyAttempt[];
}

export interface ProgressFile {
  version: 1;
  progress: UserProgress[];
}

// ============ Questions File ============

export interface QuestionsFile {
  version: 1;
  questions: Question[];
}

// ============ Leaderboard Types ============

export interface LeaderboardEntry {
  rank: number;
  username: string;
  longestStreak: number;
  totalPoints: number;
}
