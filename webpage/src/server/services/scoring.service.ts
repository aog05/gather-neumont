/**
 * Scoring service for quiz submissions.
 * Calculates points based on attempt number, speed, and bonuses.
 */

// Attempt multipliers: 1st=1.0, 2nd=0.6, 3rd=0.4, 4+=0.25
const ATTEMPT_MULTIPLIERS = [1.0, 0.6, 0.4, 0.25];

// First-try bonus: +50% of base points
const FIRST_TRY_BONUS_PERCENT = 0.5;

// Speed bonus: up to +25% of base points, linear decay over 60 seconds
const SPEED_BONUS_MAX_PERCENT = 0.25;
const SPEED_BONUS_WINDOW_MS = 60000; // 60 seconds

// Clamp elapsedMs to reasonable bounds
const MIN_ELAPSED_MS = 0;
const MAX_ELAPSED_MS = 300000; // 5 minutes max

export interface PointsBreakdown {
  basePoints: number;
  attemptMultiplier: number;
  attemptNumber: number;
  baseAfterMultiplier: number;
  firstTryBonus: number;
  speedBonus: number;
  totalPoints: number;
}

/**
 * Clamp elapsed time to valid range.
 */
export function clampElapsedMs(elapsedMs: number): number {
  return Math.max(MIN_ELAPSED_MS, Math.min(MAX_ELAPSED_MS, elapsedMs));
}

/**
 * Get the attempt multiplier for a given attempt number (1-indexed).
 */
export function getAttemptMultiplier(attemptNumber: number): number {
  if (attemptNumber <= 0) return 0;
  if (attemptNumber <= ATTEMPT_MULTIPLIERS.length) {
    return ATTEMPT_MULTIPLIERS[attemptNumber - 1];
  }
  return ATTEMPT_MULTIPLIERS[ATTEMPT_MULTIPLIERS.length - 1]; // 0.25 for 4+
}

/**
 * Calculate first-try bonus (only applies on attempt 1).
 */
export function calculateFirstTryBonus(
  basePoints: number,
  attemptNumber: number
): number {
  if (attemptNumber !== 1) return 0;
  return Math.floor(basePoints * FIRST_TRY_BONUS_PERCENT);
}

/**
 * Calculate speed bonus (only applies on first try, linear decay over 60s).
 */
export function calculateSpeedBonus(
  basePoints: number,
  attemptNumber: number,
  elapsedMs: number
): number {
  // Only first try gets speed bonus
  if (attemptNumber !== 1) return 0;

  const clampedMs = clampElapsedMs(elapsedMs);

  // No bonus if took 60+ seconds
  if (clampedMs >= SPEED_BONUS_WINDOW_MS) return 0;

  // Linear decay: 100% bonus at 0s, 0% at 60s
  const remainingRatio = 1 - clampedMs / SPEED_BONUS_WINDOW_MS;
  return Math.floor(basePoints * SPEED_BONUS_MAX_PERCENT * remainingRatio);
}

/**
 * Calculate total points for a correct answer.
 */
export function calculatePoints(
  basePoints: number,
  attemptNumber: number,
  elapsedMs: number
): PointsBreakdown {
  const attemptMultiplier = getAttemptMultiplier(attemptNumber);
  const baseAfterMultiplier = Math.floor(basePoints * attemptMultiplier);
  const firstTryBonus = calculateFirstTryBonus(basePoints, attemptNumber);
  const speedBonus = calculateSpeedBonus(basePoints, attemptNumber, elapsedMs);

  const totalPoints = baseAfterMultiplier + firstTryBonus + speedBonus;

  return {
    basePoints,
    attemptMultiplier,
    attemptNumber,
    baseAfterMultiplier,
    firstTryBonus,
    speedBonus,
    totalPoints,
  };
}
