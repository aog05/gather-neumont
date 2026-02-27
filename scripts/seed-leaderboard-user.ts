import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, COLLECTIONS } from "../src/lib/firebase";

type CliOptions = {
  userId: string;
  displayName: string;
  totalPoints: number;
  streakDays: number;
  lastCompletedDateKey?: string;
};

function printUsage(): void {
  console.log(
    "Usage: bun run scripts/seed-leaderboard-user.ts <userId> [displayName] [totalPoints] [streakDays] [lastCompletedDateKey]"
  );
}

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }
  return parsed;
}

function parseArgs(argv: string[]): CliOptions | null {
  const [userIdRaw, displayNameRaw, totalPointsRaw, streakDaysRaw, dateKeyRaw] = argv;
  const userId = userIdRaw?.trim() ?? "";
  if (!userId || userId === "--help" || userId === "-h") {
    printUsage();
    return null;
  }

  return {
    userId,
    displayName: displayNameRaw?.trim() || userId,
    totalPoints: parsePositiveInt(totalPointsRaw, 0),
    streakDays: parsePositiveInt(streakDaysRaw, 0),
    lastCompletedDateKey: dateKeyRaw?.trim() || undefined,
  };
}

async function main(): Promise<void> {
  const parsed = parseArgs(Bun.argv.slice(2));
  if (!parsed) return;

  const nowIso = new Date().toISOString();
  const playerRef = doc(db, COLLECTIONS.PLAYER, parsed.userId);
  const existing = await getDoc(playerRef);
  const createdAt =
    existing.exists() && typeof existing.data().createdAt === "string"
      ? existing.data().createdAt
      : nowIso;

  const payload = {
    displayName: parsed.displayName,
    Username: parsed.displayName,
    totalPoints: parsed.totalPoints,
    streakDays: parsed.streakDays,
    lastCompletedDateKey:
      parsed.lastCompletedDateKey ?? toDateKey(new Date()),
    Wallet: String(parsed.totalPoints),
    createdAt,
    updatedAt: nowIso,
  };

  await setDoc(playerRef, payload, { merge: true });

  console.log(
    `[seed-leaderboard] upserted Player/${parsed.userId} points=${payload.totalPoints} streak=${payload.streakDays}`
  );
}

main().catch((error) => {
  console.error("[seed-leaderboard] Failed:", error);
  process.exit(1);
});
