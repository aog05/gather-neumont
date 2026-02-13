import { serve, file } from "bun";
import { join } from "path";

const projectRoot = join(import.meta.dir, "..");
const distDir = join(projectRoot, "dist");
const assetsDir = join(projectRoot, "assets");

const server = serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);
    const pathname = url.pathname;

    // Serve assets from the assets directory
    if (pathname.startsWith("/assets/")) {
      const assetPath = join(assetsDir, pathname.replace("/assets/", ""));
      const assetFile = file(assetPath);

      if (await assetFile.exists()) {
        return new Response(assetFile);
      }
    }

    // Serve built files from dist directory
    if (pathname !== "/" && pathname !== "") {
      const distPath = join(distDir, pathname);
      const distFile = file(distPath);

      if (await distFile.exists()) {
        return new Response(distFile);
      }
    }

    // Serve index.html for root and SPA routes
    const indexPath = join(distDir, "index.html");
    return new Response(file(indexPath), {
      headers: { "Content-Type": "text/html" },
    });
  },
});

console.log(`🚀 Server running at ${server.url}`);
