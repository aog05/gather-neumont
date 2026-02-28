import { serve, file } from "bun";
import { join, normalize, sep } from "node:path";
import { handleQuizApi } from "./server/api/quiz";
import { handleAuthApi } from "./server/api/auth";
import { handleLeaderboardApi } from "./server/api/leaderboard";
import { handleAdminApi } from "./server/api/admin";
import { handleProfileApi } from "./server/api/profile";

const projectRoot = join(import.meta.dir, "..");
const distDir = normalize(join(projectRoot, "dist"));
const ASSET_DEBUG = process.env.ASSET_DEBUG === "1";

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

function hasFileExtension(pathname: string): boolean {
  const leaf = pathname.split("/").filter(Boolean).pop() ?? "";
  return /\.[a-zA-Z0-9]+$/.test(leaf);
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

  const direct = await tryServeFile(fsPath);
  if (direct) return direct;

  // For nested SPA routes (e.g., /onboarding), index.html uses relative asset URLs.
  // If /onboarding/index-*.js is requested, serve dist/index-*.js by basename.
  if (parts.length > 1) {
    const basename = parts[parts.length - 1];
    const rootAssetPath = resolveSafePath(distDir, [basename]);
    if (rootAssetPath) {
      const rootAsset = await tryServeFile(rootAssetPath);
      if (rootAsset) return rootAsset;
    }
  }

  // Do not return SPA HTML for missing files with extensions.
  if (hasFileExtension(pathname)) {
    return new Response("Not Found", { status: 404 });
  }

  return null;
}

function spaIndex(): Response {
  const indexPath = join(distDir, "index.html");
  const headers = new Headers({ "Content-Type": "text/html" });
  if (process.env.NODE_ENV !== "production") {
    headers.set("Cache-Control", "no-store");
  }
  return new Response(file(indexPath), {
    headers,
  });
}

const selectedPort = Number(process.env.PORT ?? 3000);

const server = serve({
  port: selectedPort,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname.startsWith("/api/")) {
      if (ASSET_DEBUG) console.log(`[assets] api ${url.pathname}`);
      return apiHandler(req);
    }
    if (url.pathname.startsWith("/assets/")) {
      if (ASSET_DEBUG) console.log(`[assets] public ${url.pathname}`);
      return assetsHandler(req);
    }

    const distRes = await distHandler(req);
    if (distRes) {
      if (ASSET_DEBUG) console.log(`[assets] dist ${url.pathname}`);
      return distRes;
    }

    if (ASSET_DEBUG) console.log(`[assets] spa ${url.pathname}`);
    return spaIndex();
  },
});

console.log(`Server listening on http://localhost:${selectedPort}`);
