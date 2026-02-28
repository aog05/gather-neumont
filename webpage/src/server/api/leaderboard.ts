import { getLeaderboardEntries } from "../services/player-leaderboard.service";

type LeaderboardEntry = {
  playerId: string;
  displayName: string;
  totalPoints: number;
  streakDays: number;
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
  const entries: LeaderboardEntry[] = await getLeaderboardEntries(limit);

  return Response.json({ entries });
}
