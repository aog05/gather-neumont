import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
} from "firebase/firestore";
import { db, COLLECTIONS } from "../src/lib/firebase";
import { recordPlayerQuizCompletion } from "../src/server/services/player-leaderboard.service";

const QUIZ_COMPLETIONS_SUBCOLLECTION = "QuizCompletions";

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function logPass(message: string): void {
  console.log(`[PASS] ${message}`);
}

function logFail(message: string): void {
  console.error(`[FAIL] ${message}`);
}

async function resetPlayerForCase(
  playerId: string,
  dateKey: string,
  streakDays: number,
  lastCompletedDateKey: string,
  totalPoints: number
): Promise<void> {
  const completionRef = doc(
    db,
    COLLECTIONS.PLAYER,
    playerId,
    QUIZ_COMPLETIONS_SUBCOLLECTION,
    dateKey
  );
  await deleteDoc(completionRef);

  const nowIso = new Date().toISOString();
  const playerRef = doc(db, COLLECTIONS.PLAYER, playerId);
  await setDoc(
    playerRef,
    {
      displayName: playerId,
      Username: playerId,
      totalPoints,
      streakDays,
      lastCompletedDateKey,
      Wallet: String(totalPoints),
      updatedAt: nowIso,
      createdAt: nowIso,
    },
    { merge: true }
  );
}

async function cleanupPlayer(playerId: string): Promise<void> {
  const completionsRef = collection(
    db,
    COLLECTIONS.PLAYER,
    playerId,
    QUIZ_COMPLETIONS_SUBCOLLECTION
  );
  const completionsSnap = await getDocs(completionsRef);
  for (const completionDoc of completionsSnap.docs) {
    await deleteDoc(completionDoc.ref);
  }
  await deleteDoc(doc(db, COLLECTIONS.PLAYER, playerId));
}

async function main(): Promise<void> {
  const cleanup = Bun.argv.slice(2).includes("--cleanup");
  const today = new Date();
  const todayKey = toDateKey(today);
  const yesterdayKey = toDateKey(addDays(today, -1));
  const twoDaysAgoKey = toDateKey(addDays(today, -2));

  const playerId = `dev_test_${Date.now()}`;
  const playerPath = `${COLLECTIONS.PLAYER}/${playerId}`;
  const completionPath = `${playerPath}/${QUIZ_COMPLETIONS_SUBCOLLECTION}/${todayKey}`;

  console.log(`[verify] playerId=${playerId}`);
  console.log(`[verify] wrote path: ${playerPath}`);
  console.log(`[verify] wrote path: ${completionPath}`);

  let failures = 0;

  try {
    const first = await recordPlayerQuizCompletion({
      playerId,
      dateKey: todayKey,
      displayName: playerId,
      pointsAwarded: 10,
    });
    const second = await recordPlayerQuizCompletion({
      playerId,
      dateKey: todayKey,
      displayName: playerId,
      pointsAwarded: 10,
    });

    const sameDayIdempotent =
      second.alreadyCompleted && second.totalPoints === first.totalPoints;
    if (sameDayIdempotent) {
      logPass(
        `A same-day idempotency: alreadyCompleted=true and totalPoints unchanged at ${second.totalPoints}`
      );
    } else {
      failures += 1;
      logFail(
        `A same-day idempotency failed. first.totalPoints=${first.totalPoints}, second.alreadyCompleted=${second.alreadyCompleted}, second.totalPoints=${second.totalPoints}`
      );
    }

    const streakSeed = 4;
    await resetPlayerForCase(playerId, todayKey, streakSeed, yesterdayKey, 100);

    const streakIncrement = await recordPlayerQuizCompletion({
      playerId,
      dateKey: todayKey,
      displayName: playerId,
      pointsAwarded: 5,
    });

    if (!streakIncrement.alreadyCompleted && streakIncrement.streakDays === streakSeed + 1) {
      logPass(`B streak increment: streakDays moved ${streakSeed} -> ${streakIncrement.streakDays}`);
    } else {
      failures += 1;
      logFail(
        `B streak increment failed. alreadyCompleted=${streakIncrement.alreadyCompleted}, streakDays=${streakIncrement.streakDays}`
      );
    }

    await resetPlayerForCase(playerId, todayKey, streakSeed, twoDaysAgoKey, 200);

    const streakReset = await recordPlayerQuizCompletion({
      playerId,
      dateKey: todayKey,
      displayName: playerId,
      pointsAwarded: 5,
    });

    if (!streakReset.alreadyCompleted && streakReset.streakDays === 1) {
      logPass(`C streak reset: streakDays reset to ${streakReset.streakDays}`);
    } else {
      failures += 1;
      logFail(
        `C streak reset failed. alreadyCompleted=${streakReset.alreadyCompleted}, streakDays=${streakReset.streakDays}`
      );
    }
  } finally {
    if (cleanup) {
      await cleanupPlayer(playerId);
      console.log(`[verify] cleanup complete for ${playerPath}`);
    } else {
      console.log("[verify] cleanup skipped (pass --cleanup to delete test docs)");
    }
  }

  if (failures > 0) {
    console.error(`[verify] Completed with ${failures} failing check(s).`);
    process.exit(1);
  }

  console.log("[verify] All checks passed.");
}

main().catch((error) => {
  console.error("[verify] Failed:", error);
  process.exit(1);
});
