import { getAllProgress } from "../data/progress.store";
import { getAllUsers } from "../data/users.store";

type LeaderboardEntry = {
  rank: number;
  username: string;
  longestStreak: number;
  currentStreak: number;
  totalPoints: number;
};

function parseLimit(req: Request): number {
  const url = new URL(req.url);
  const raw = url.searchParams.get("limit");
  const parsed = raw ? Number.parseInt(raw, 10) : 50;
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 50;
  }
  return Math.min(parsed, 200);
}

export async function handleLeaderboardApi(
  req: Request
): Promise<Response> {
  if (req.method !== "GET") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const limit = parseLimit(req);
  const [progress, users] = await Promise.all([
    getAllProgress(),
    getAllUsers(),
  ]);

  const userById = new Map(users.map((user) => [user.id, user]));
  const ranked = progress
    .map((record) => {
      const user = userById.get(record.userId);
      if (!user || user.isAdmin) return null;
      return {
        userId: record.userId,
        username: user.username,
        longestStreak: record.longestStreak ?? 0,
        currentStreak: record.currentStreak ?? 0,
        totalPoints: record.totalPoints ?? 0,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => !!entry)
    .sort((a, b) => {
      if (b.longestStreak !== a.longestStreak) {
        return b.longestStreak - a.longestStreak;
      }
      if (b.totalPoints !== a.totalPoints) {
        return b.totalPoints - a.totalPoints;
      }
      return a.username.localeCompare(b.username);
    });

  const entries: LeaderboardEntry[] = [];
  let currentRank = 0;
  let lastScore: { longestStreak: number; totalPoints: number } | null = null;

  for (let i = 0; i < ranked.length && entries.length < limit; i++) {
    const item = ranked[i];
    if (
      !lastScore ||
      item.longestStreak !== lastScore.longestStreak ||
      item.totalPoints !== lastScore.totalPoints
    ) {
      currentRank = i + 1;
      lastScore = {
        longestStreak: item.longestStreak,
        totalPoints: item.totalPoints,
      };
    }

    entries.push({
      rank: currentRank,
      username: item.username,
      longestStreak: item.longestStreak,
      currentStreak: item.currentStreak,
      totalPoints: item.totalPoints,
    });
  }

  return Response.json({ entries });
}
