import {
  collection,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  setDoc,
} from "firebase/firestore";
import { db, COLLECTIONS } from "../../lib/firebase";

const QUIZ_COMPLETIONS_SUBCOLLECTION = "QuizCompletions";

export interface PlayerQuizCompletion {
  dateKey: string;
  pointsAwarded: number;
  createdAt: string;
}

export interface PlayerLeaderboardEntry {
  playerId: string;
  displayName: string;
  totalPoints: number;
  streakDays: number;
}

type RecordQuizCompletionInput = {
  playerId: string;
  dateKey: string;
  displayName: string;
  pointsAwarded: number;
};

export type RecordQuizCompletionResult =
  | {
      alreadyCompleted: true;
      completion: PlayerQuizCompletion;
      totalPoints: number;
      streakDays: number;
    }
  | {
      alreadyCompleted: false;
      completion: PlayerQuizCompletion;
      totalPoints: number;
      streakDays: number;
    };

function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getPreviousDateKeyLocal(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) {
    return dateKey;
  }
  date.setDate(date.getDate() - 1);
  return toLocalDateKey(date);
}

function parseNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

function resolvePointsFromPlayerData(data: Record<string, unknown>): number | null {
  if (typeof data.totalPoints === "number" && Number.isFinite(data.totalPoints)) {
    return data.totalPoints;
  }
  if (data.totalPoints !== undefined && data.totalPoints !== null) {
    const parsedTotal = parseNumber(data.totalPoints, Number.NaN);
    if (Number.isFinite(parsedTotal)) {
      return parsedTotal;
    }
  }

  const parsedWallet = parseNumber(data.Wallet, Number.NaN);
  if (Number.isFinite(parsedWallet)) {
    return parsedWallet;
  }

  return null;
}

function isMissingField(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string" && value.trim().length === 0) return true;
  return false;
}

function resolveLeaderboardPoints(data: Record<string, unknown>): {
  totalPoints: number;
  backfilledFromWallet: boolean;
} {
  const rawTotalPoints = data.totalPoints;
  const isMissingTotalPoints = isMissingField(rawTotalPoints);
  const parsedTotalPoints = parseNumber(rawTotalPoints, Number.NaN);
  if (Number.isFinite(parsedTotalPoints)) {
    return {
      totalPoints: parsedTotalPoints,
      backfilledFromWallet: false,
    };
  }

  if (isMissingTotalPoints) {
    const walletPoints = parseNumber(data.Wallet, Number.NaN);
    if (Number.isFinite(walletPoints)) {
      return {
        totalPoints: walletPoints,
        backfilledFromWallet: true,
      };
    }
  }

  return {
    totalPoints: 0,
    backfilledFromWallet: false,
  };
}

function resolveDisplayName(
  playerId: string,
  playerData: Record<string, unknown>
): string {
  return (
    firstNonEmptyString([
      playerData.displayName,
      playerData.Username,
      playerId,
    ]) ?? playerId
  );
}

function firstNonEmptyString(values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }
  return null;
}

function toCompletion(data: Record<string, unknown>): PlayerQuizCompletion | null {
  const dateKey = typeof data.dateKey === "string" ? data.dateKey.trim() : "";
  const pointsAwarded = parseNumber(data.pointsAwarded, 0);
  const createdAt =
    typeof data.createdAt === "string" && data.createdAt.trim().length > 0
      ? data.createdAt
      : new Date().toISOString();

  if (!dateKey) {
    return null;
  }

  return { dateKey, pointsAwarded, createdAt };
}

export async function getPlayerQuizCompletionForDate(
  playerId: string,
  dateKey: string
): Promise<PlayerQuizCompletion | null> {
  const completionRef = doc(
    db,
    COLLECTIONS.PLAYER,
    playerId,
    QUIZ_COMPLETIONS_SUBCOLLECTION,
    dateKey
  );
  const completionSnap = await getDoc(completionRef);
  if (!completionSnap.exists()) {
    return null;
  }

  return toCompletion(completionSnap.data() as Record<string, unknown>);
}

export async function recordPlayerQuizCompletion(
  input: RecordQuizCompletionInput
): Promise<RecordQuizCompletionResult> {
  const pointsAwarded = Math.max(0, Math.floor(input.pointsAwarded));

  return runTransaction(db, async (tx) => {
    const playerRef = doc(db, COLLECTIONS.PLAYER, input.playerId);
    const completionRef = doc(
      db,
      COLLECTIONS.PLAYER,
      input.playerId,
      QUIZ_COMPLETIONS_SUBCOLLECTION,
      input.dateKey
    );

    const completionSnap = await tx.get(completionRef);
    const playerSnap = await tx.get(playerRef);
    const playerData = playerSnap.exists()
      ? (playerSnap.data() as Record<string, unknown>)
      : {};

    const currentTotal = resolvePointsFromPlayerData(playerData) ?? 0;
    const currentStreak = parseNumber(playerData.streakDays, 0);

    if (completionSnap.exists()) {
      const existing =
        toCompletion(completionSnap.data() as Record<string, unknown>) ?? {
          dateKey: input.dateKey,
          pointsAwarded: 0,
          createdAt: new Date().toISOString(),
        };
      return {
        alreadyCompleted: true as const,
        completion: existing,
        totalPoints: currentTotal,
        streakDays: currentStreak,
      };
    }

    const nowIso = new Date().toISOString();
    const yesterdayKey = getPreviousDateKeyLocal(input.dateKey);
    const lastCompletedDateKey =
      typeof playerData.lastCompletedDateKey === "string"
        ? playerData.lastCompletedDateKey
        : null;
    const nextStreak = lastCompletedDateKey === yesterdayKey ? currentStreak + 1 : 1;
    const nextTotal = currentTotal + pointsAwarded;
    const displayName = resolveDisplayName(input.playerId, playerData);
    const requestedDisplayName = firstNonEmptyString([input.displayName]);
    const existingUsername = firstNonEmptyString([playerData.Username]);
    const nextUsername = existingUsername ?? requestedDisplayName ?? displayName;
    const existingWallet = playerData.Wallet;
    const nextWallet =
      typeof existingWallet === "number" ? nextTotal : String(nextTotal);
    const existingCreatedAt = playerData.createdAt;

    const completionPayload: PlayerQuizCompletion = {
      dateKey: input.dateKey,
      pointsAwarded,
      createdAt: nowIso,
    };
    tx.set(completionRef, completionPayload);

    tx.set(
      playerRef,
      {
        displayName,
        totalPoints: nextTotal,
        streakDays: nextStreak,
        lastCompletedDateKey: input.dateKey,
        Username: nextUsername,
        Wallet: nextWallet,
        updatedAt: nowIso,
        createdAt:
          existingCreatedAt !== undefined && existingCreatedAt !== null
            ? existingCreatedAt
            : nowIso,
      },
      { merge: true }
    );

    return {
      alreadyCompleted: false as const,
      completion: completionPayload,
      totalPoints: nextTotal,
      streakDays: nextStreak,
    };
  });
}

export async function getLeaderboardEntries(
  maxEntries: number
): Promise<PlayerLeaderboardEntry[]> {
  const safeLimit = Number.isFinite(maxEntries)
    ? Math.max(1, Math.min(200, Math.floor(maxEntries)))
    : 50;

  const playersRef = collection(db, COLLECTIONS.PLAYER);
  const snapshot = await getDocs(playersRef);

  const entries: PlayerLeaderboardEntry[] = [];
  const backfillWrites: Promise<unknown>[] = [];
  for (const docSnap of snapshot.docs) {
    const data = docSnap.data() as Record<string, unknown>;
    const resolvedPoints = resolveLeaderboardPoints(data);

    const displayName = resolveDisplayName(docSnap.id, data);

    entries.push({
      playerId: docSnap.id,
      displayName,
      totalPoints: resolvedPoints.totalPoints,
      streakDays: parseNumber(data.streakDays, 0),
    });

    if (resolvedPoints.backfilledFromWallet) {
      backfillWrites.push(
        setDoc(
          doc(db, COLLECTIONS.PLAYER, docSnap.id),
          { totalPoints: resolvedPoints.totalPoints },
          { merge: true }
        )
      );
    }
  }

  if (backfillWrites.length > 0) {
    await Promise.allSettled(backfillWrites);
  }

  entries.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) {
      return b.totalPoints - a.totalPoints;
    }
    if (b.streakDays !== a.streakDays) {
      return b.streakDays - a.streakDays;
    }
    return a.displayName.localeCompare(b.displayName);
  });

  return entries.slice(0, safeLimit);
}
