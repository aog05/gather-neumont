/**
 * Development server for Neumont Virtual Campus Admin Portal
 * Serves the React app on port 3001
 */

const server = Bun.serve({
  port: 3001,
  async fetch(req) {
    const url = new URL(req.url);

    // Serve index.html for root and all routes (SPA routing)
    if (url.pathname === "/" || !url.pathname.includes(".")) {
      const file = Bun.file("./public/index.html");
      return new Response(file, {
        headers: { "Content-Type": "text/html" },
      });
    }

    // Serve static files from public directory
    if (url.pathname.startsWith("/")) {
      const filePath = `./public${url.pathname}`;
      const file = Bun.file(filePath);

      if (await file.exists()) {
        return new Response(file);
      }
    }

    // Serve built files from dist directory
    if (url.pathname.startsWith("/dist/")) {
      const filePath = `.${url.pathname}`;
      const file = Bun.file(filePath);

      if (await file.exists()) {
        return new Response(file);
      }
    }

    // 404 - serve index.html for client-side routing
    const file = Bun.file("./public/index.html");
    return new Response(file, {
      headers: { "Content-Type": "text/html" },
    });
  },
});

console.log(`🚀 Admin Portal running at http://localhost:${server.port}`);