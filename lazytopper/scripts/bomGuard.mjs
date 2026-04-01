import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const MAX_FILES = 5000;
const IGNORE_DIR_PREFIXES = ["RUN_"];
const IGNORE_DIRS = new Set(["node_modules", ".git", ".project_memory"]);

function isJsonFile(p) {
  return p.toLowerCase().endsWith(".json");
}

function shouldIgnoreDir(name) {
  if (IGNORE_DIRS.has(name)) return true;
  return IGNORE_DIR_PREFIXES.some((prefix) => name.startsWith(prefix));
}

function walk(dir, acc) {
  if (acc.length >= MAX_FILES) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (acc.length >= MAX_FILES) return;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (shouldIgnoreDir(entry.name)) continue;
      walk(full, acc);
    } else if (entry.isFile() && isJsonFile(full)) {
      acc.push(full);
    }
  }
}

function hasBom(filePath) {
  const fd = fs.openSync(filePath, "r");
  const buf = Buffer.alloc(3);
  const bytes = fs.readSync(fd, buf, 0, 3, 0);
  fs.closeSync(fd);
  if (bytes < 3) return false;
  return buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf;
}

const files = [];
walk(ROOT, files);

const offenders = [];
for (const filePath of files) {
  try {
    if (hasBom(filePath)) offenders.push(filePath);
  } catch {
    // ignore read errors
  }
}

if (offenders.length) {
  console.error("BOM_GUARD_FAIL: UTF-8 BOM detected in JSON files:");
  offenders.forEach((p) => console.error("- " + path.relative(ROOT, p)));
  process.exit(1);
}

console.log("BOM_GUARD_OK");
