const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = parseInt(process.env.PORT || "3000", 10);
const PUBLIC_DIR = path.resolve(__dirname, "dist/public");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".webp": "image/webp",
  ".webm": "video/webm",
  ".mp4": "video/mp4",
};

function serveFile(filePath, res) {
  const ext = path.extname(filePath).toLowerCase();
  const mime = MIME_TYPES[ext] || "application/octet-stream";

  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) return false;
    const stream = fs.createReadStream(filePath);
    res.writeHead(200, {
      "Content-Type": mime,
      "Content-Length": stat.size,
      "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=31536000, immutable",
    });
    stream.pipe(res);
    return true;
  } catch {
    return false;
  }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", `http://localhost:${PORT}`);
  let filePath = path.join(PUBLIC_DIR, url.pathname);

  if (filePath.endsWith("/")) {
    filePath = path.join(filePath, "index.html");
  }

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  if (serveFile(filePath, res)) return;

  const indexPath = path.join(PUBLIC_DIR, "index.html");
  if (serveFile(indexPath, res)) return;

  res.writeHead(404);
  res.end("Not Found");
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Static server listening on 0.0.0.0:${PORT}`);
});
