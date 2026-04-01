import http from "http";
import fs from "fs";
import path from "path";
import url from "url";

const ROOT = process.cwd();
const OUT_UI_DIR = path.join(ROOT, ".project_memory", "tracker_ui");
const LIVE_HTML  = path.join(OUT_UI_DIR, "index_live.html");
const STATIC_HTML= path.join(OUT_UI_DIR, "index.html");
const STATUS_JSON= path.join(ROOT, ".project_memory", "tracker", "stage_status.json");

const PORT = Number(process.argv[2] || 4179);

function send(res, code, body, headers = {}) {
  res.writeHead(code, {
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
    ...headers,
  });
  res.end(body);
}

function safeRead(p) {
  try { return fs.readFileSync(p); } catch { return null; }
}

const server = http.createServer((req, res) => {
  const u = url.parse(req.url || "/", true);
  const pathname = u.pathname || "/";

  // Health
  if (pathname === "/health") return send(res, 200, "ok", {"Content-Type":"text/plain"});

  // Live JSON endpoint
  if (pathname === "/stage_status.json") {
    const buf = safeRead(STATUS_JSON);
    if (!buf) return send(res, 404, JSON.stringify({ error:"missing stage_status.json" }), {"Content-Type":"application/json"});
    return send(res, 200, buf, {"Content-Type":"application/json"});
  }

  // Serve screener
  if (pathname === "/" || pathname === "/index.html") {
    const buf = safeRead(LIVE_HTML) || safeRead(STATIC_HTML);
    if (!buf) return send(res, 404, "missing tracker UI html. Run: node scripts/trackerUiLive.mjs", {"Content-Type":"text/plain"});
    return send(res, 200, buf, {"Content-Type":"text/html; charset=utf-8"});
  }

  // Basic static file support (future-proof)
  const abs = path.join(OUT_UI_DIR, pathname.replace(/^\//, ""));
  if (!abs.startsWith(OUT_UI_DIR)) return send(res, 403, "forbidden", {"Content-Type":"text/plain"});
  const buf = safeRead(abs);
  if (!buf) return send(res, 404, "not found", {"Content-Type":"text/plain"});
  return send(res, 200, buf, {"Content-Type":"application/octet-stream"});
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Tracker screener: http://localhost:${PORT}`);
});
