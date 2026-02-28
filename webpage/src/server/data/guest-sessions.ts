/**
 * In-memory guest session store.
 * Guest sessions are NOT persisted - they exist only for the server lifetime.
 * This is intentional per the MVP spec (guest attempts are not persisted).
 */

export interface GuestSession {
  guestToken: string;
  createdAt: Date;
  /** Map of dateKey -> started state for that day's quiz */
  startedQuizzes: Map<string, { questionId: string; startedAt: Date }>;
  /** Map of dateKey -> attempt data for that day */
  attempts: Map<
    string,
    {
      questionId: string;
      attemptCount: number;
      solved: boolean;
      solvedOnAttempt: number | null;
      elapsedMs: number | null;
    }
  >;
}

// In-memory store - keyed by guestToken
const sessions = new Map<string, GuestSession>();

/**
 * Get or create a guest session by token.
 */
export function getOrCreateGuestSession(guestToken: string): GuestSession {
  let session = sessions.get(guestToken);
  if (!session) {
    session = {
      guestToken,
      createdAt: new Date(),
      startedQuizzes: new Map(),
      attempts: new Map(),
    };
    sessions.set(guestToken, session);
  }
  return session;
}

/**
 * Get a guest session if it exists.
 */
export function getGuestSession(guestToken: string): GuestSession | undefined {
  return sessions.get(guestToken);
}

/**
 * Mark a quiz as started for a guest on a specific date.
 */
export function markQuizStarted(
  guestToken: string,
  dateKey: string,
  questionId: string
): void {
  const session = getOrCreateGuestSession(guestToken);
  if (!session.startedQuizzes.has(dateKey)) {
    session.startedQuizzes.set(dateKey, {
      questionId,
      startedAt: new Date(),
    });
  }
}

/**
 * Check if a guest has started the quiz for a specific date.
 */
export function hasStartedQuiz(guestToken: string, dateKey: string): boolean {
  const session = sessions.get(guestToken);
  return session?.startedQuizzes.has(dateKey) ?? false;
}

/**
 * Get the start time for a guest's quiz on a specific date.
 */
export function getQuizStartTime(
  guestToken: string,
  dateKey: string
): Date | null {
  const session = sessions.get(guestToken);
  return session?.startedQuizzes.get(dateKey)?.startedAt ?? null;
}

/**
 * Get attempt data for a guest on a specific date.
 */
export function getGuestAttempt(
  guestToken: string,
  dateKey: string
): GuestSession["attempts"] extends Map<string, infer V> ? V | undefined : never {
  const session = sessions.get(guestToken);
  return session?.attempts.get(dateKey);
}

/**
 * Update attempt data for a guest.
 */
export function updateGuestAttempt(
  guestToken: string,
  dateKey: string,
  data: {
    questionId: string;
    attemptCount: number;
    solved: boolean;
    solvedOnAttempt: number | null;
    elapsedMs: number | null;
  }
): void {
  const session = getOrCreateGuestSession(guestToken);
  session.attempts.set(dateKey, data);
}

/**
 * Get session count (for debugging/monitoring).
 */
export function getSessionCount(): number {
  return sessions.size;
}

/**
 * Clear all sessions (for testing).
 */
export function clearAllSessions(): void {
  sessions.clear();
}
