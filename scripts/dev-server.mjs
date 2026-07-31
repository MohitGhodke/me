/**
 * Zero-dependency static server for local development.
 *
 * The app is a plain static bundle, so this only has to do two things: serve
 * files from the repo root, and map "/" to the page. Deploy the same way —
 * see README.md for the one rewrite rule any static host needs.
 *
 *   node scripts/dev-server.mjs [--port 4173]
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ENTRY = "/index.html";

const PORT = Number(
  process.env.PORT ||
    (process.argv.includes("--port") ? process.argv[process.argv.indexOf("--port") + 1] : 0) ||
    4173
);

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2"
};

function resolveRequest(urlPath) {
  const clean = decodeURIComponent(urlPath.split("?")[0]);
  const wanted = clean === "/" ? ENTRY : clean;
  const resolved = path.join(ROOT, path.normalize(wanted));
  // Never serve outside the repo, whatever the path traversal.
  return resolved.startsWith(ROOT) ? resolved : null;
}

const server = http.createServer((req, res) => {
  const file = resolveRequest(req.url || "/");

  if (!file || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("404 — " + req.url);
    return;
  }

  res.writeHead(200, {
    "content-type": CONTENT_TYPES[path.extname(file)] || "application/octet-stream",
    "cache-control": "no-store"
  });
  fs.createReadStream(file).pipe(res);
});

server.listen(PORT, () => {
  console.log(`Mohit OS running at http://localhost:${PORT}`);
});
