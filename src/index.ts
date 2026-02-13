import { serve, file } from "bun";
import { join, normalize, sep } from "node:path";
import { handleQuizApi } from "./server/api/quiz";
import { handleAuthApi } from "./server/api/auth";
import { handleLeaderboardApi } from "./server/api/leaderboard";
import { handleAdminApi } from "./server/api/admin";
import { handleProfileApi } from "./server/api/profile";

const projectRoot = join(import.meta.dir, "..");
const distDir = normalize(join(projectRoot, "dist"));

const assetBaseDirs = [
  normalize(join(projectRoot, "public", "assets")),
  normalize(join(projectRoot, "assets")),
];

function isSafePathPart(part: string): boolean {
  return !(
    part === "." ||
    part === ".." ||
    part.includes("\\") ||
    part.includes("\0") ||
    /^[a-zA-Z]:/.test(part)
  );
}

function resolveSafePath(baseDir: string, parts: string[]): string | null {
  for (const part of parts) {
    if (!isSafePathPart(part)) return null;
  }

  const fsPath = normalize(join(baseDir, ...parts));
  const base = baseDir.toLowerCase();
  const full = fsPath.toLowerCase();
  if (full !== base && !full.startsWith(base + sep)) return null;
  return fsPath;
}

async function tryServeFile(fsPath: string): Promise<Response | null> {
  const f = file(fsPath);
  if (!(await f.exists())) return null;
  return new Response(f);
}

async function assetsHandler(req: Request): Promise<Response> {
  const url = new URL(req.url);

  // url.pathname is expected to be /assets/<path>
  let rel = url.pathname.slice("/assets/".length);
  try {
    rel = decodeURIComponent(rel);
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  const parts = rel.split("/").filter(Boolean);
  if (parts.length === 0) return new Response("Not Found", { status: 404 });

  for (const baseDir of assetBaseDirs) {
    const fsPath = resolveSafePath(baseDir, parts);
    if (!fsPath) return new Response("Bad Request", { status: 400 });

    const res = await tryServeFile(fsPath);
    if (res) return res;
  }

  return new Response("Not Found", { status: 404 });
}

async function apiHandler(req: Request): Promise<Response> {
  const url = new URL(req.url);

  if (url.pathname.startsWith("/api/quiz")) return handleQuizApi(req);
  if (url.pathname.startsWith("/api/auth")) return handleAuthApi(req);
  if (url.pathname.startsWith("/api/profile")) return handleProfileApi(req);
  if (url.pathname.startsWith("/api/leaderboard")) return handleLeaderboardApi(req);
  if (url.pathname.startsWith("/api/admin")) return handleAdminApi(req);

  return Response.json({ error: "Not found", path: url.pathname }, { status: 404 });
}

async function distHandler(req: Request): Promise<Response | null> {
  const url = new URL(req.url);
  const pathname = url.pathname;
  if (pathname === "/" || pathname === "") return null;

  let rel = pathname.startsWith("/") ? pathname.slice(1) : pathname;
  try {
    rel = decodeURIComponent(rel);
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  const parts = rel.split("/").filter(Boolean);
  if (parts.length === 0) return null;

  const fsPath = resolveSafePath(distDir, parts);
  if (!fsPath) return new Response("Bad Request", { status: 400 });

  return tryServeFile(fsPath);
}

function spaIndex(): Response {
  const indexPath = join(distDir, "index.html");
  return new Response(file(indexPath), {
    headers: { "Content-Type": "text/html" },
  });
}

const server = serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname.startsWith("/api/")) return apiHandler(req);
    if (url.pathname.startsWith("/assets/")) return assetsHandler(req);

    const distRes = await distHandler(req);
    if (distRes) return distRes;

    return spaIndex();
  },
});

console.log(`🚀 Server running at ${server.url}`);
