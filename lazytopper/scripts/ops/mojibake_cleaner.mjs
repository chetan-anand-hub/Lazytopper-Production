import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const outputDir = path.join(repoRoot, "docs", "ops", "out");
fs.mkdirSync(outputDir, { recursive: true });

const replacements = {
  "\u00E2\u0080\u00A6": "…",
  "\u00E2\u0080\u0093": "–",
  "\u00E2\u0080\u0094": "—",
  "\u00E2\u0080\u00A2": "•",
  "\u00E2\u0080\u009D": "”",
  "\u00E2\u0080\u009C": "“",
  "\u00E2\u0080\u0099": "’",
  "\u00E2\u0080\u2010": "-",
  "\u00C2\u00B7": "·",
  "\u00C2\u0020": " ",
  "\u00C3\u00A2": "•",
  "\u00C3\u0082": " ",
  "\u00C3": "",
  "\uFFFD": "",
  "\u0393": "",
  "\u252C": "",
  "\u2229": "",
  "\u256C": "",
  "\u0192\u003F\u0130": "",
  "\u0192\u003F\u203A": "–",
  "\u0192\u003F\u0022": "\"",
  "\u0192\u003F\u003F": "",
  "\u0192\u003Fo": "•",
  "\u0192\u003FT": "’",
  "\u0192\u003F\u00DD": "…",
  "A\u00FA": "·",
  "A\u0173": "°",
  "I\"": "\"",
  "\u0192\"\u00AA": "…",
  "\u0192^c": "-"
};

const targetExtensions = [".ts", ".tsx", ".js", ".jsx", ".md", ".json", ".cjs", ".mjs"];
const scanRoots = ["src", "server", "scripts"];
const excludedPaths = ["docs/ops/out", "docs/session", "_rollback"];
const excludedSegments = new Set(["dist", "build", ".next", "out"]);

function isExcluded(fullPath) {
  const relative = path.relative(repoRoot, fullPath).replace(/\\/g, "/");
  if (!relative) return false;
  if (relative === "package-lock.json") return true;
  for (const pattern of excludedPaths) {
    if (
      relative === pattern ||
      relative.startsWith(`${pattern}/`) ||
      relative.includes(`/${pattern}/`)
    ) {
      return true;
    }
  }
  const segments = relative.split("/");
  return segments.some((segment) => excludedSegments.has(segment));
}

function collectFiles() {
  const files = [];
  const inspectedRoots = [];
  for (const root of scanRoots) {
    const rootPath = path.join(repoRoot, root);
    if (!fs.existsSync(rootPath)) continue;
    inspectedRoots.push(root);
    const stack = [rootPath];
    while (stack.length) {
      const current = stack.pop();
      if (isExcluded(current)) continue;
      const stat = fs.statSync(current);
      if (stat.isDirectory()) {
        for (const entry of fs.readdirSync(current)) {
          stack.push(path.join(current, entry));
        }
        continue;
      }
      if (!targetExtensions.includes(path.extname(current))) continue;
      if (isExcluded(current)) continue;
      files.push(current);
    }
  }
  return { files, roots: inspectedRoots };
}

function scanContent(filePath) {
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  const matches = [];
  for (let i = 0; i < lines.length; i += 1) {
    for (const token of Object.keys(replacements)) {
      if (!token) continue;
      if (lines[i].includes(token)) {
        matches.push({
          token,
          file: path.relative(repoRoot, filePath),
          lineNumber: i + 1,
          line: lines[i].trim()
        });
      }
    }
  }
  return matches;
}

function writeMatches(matches, destination) {
  const content = matches.map((match) => `${match.file}:${match.lineNumber}:${match.line}`).join("\n");
  fs.writeFileSync(destination, content, "utf8");
}

const { files, roots } = collectFiles();
const beforeMatches = [];
for (const file of files) {
  beforeMatches.push(...scanContent(file));
}
writeMatches(beforeMatches, path.join(outputDir, "mojibake_src_server_before.txt"));

for (const file of files) {
  let content = fs.readFileSync(file, "utf8");
  let modified = false;
  for (const [token, replacement] of Object.entries(replacements)) {
    if (!token) continue;
    if (content.includes(token)) {
      content = content.split(token).join(replacement);
      modified = true;
    }
  }
  if (modified) {
    fs.writeFileSync(file, content, "utf8");
  }
}

const afterMatches = [];
for (const file of files) {
  afterMatches.push(...scanContent(file));
}
writeMatches(afterMatches, path.join(outputDir, "mojibake_src_server_after.txt"));

const summary = {
  roots,
  filesScanned: files.length,
  beforeCount: beforeMatches.length,
  afterCount: afterMatches.length
};
fs.writeFileSync(path.join(outputDir, "mojibake_scan_summary.json"), JSON.stringify(summary, null, 2), "utf8");
console.log("Mojibake cleaner summary:", summary);
