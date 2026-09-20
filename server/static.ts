import express from 'express';
import type { Express } from 'express';
import fs from "node:fs";
import path from "node:path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    // In the split hosting setup, static assets are served separately (e.g. via
    // a CDN) and this backend process only needs to handle /api/* routes.
    // Don't crash the server just because the local build directory isn't present.
    console.warn(
      `[static] Build directory not found at ${distPath} — skipping local static file serving. This is expected when the frontend is hosted separately.`,
    );
    return;
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("/{*path}", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
