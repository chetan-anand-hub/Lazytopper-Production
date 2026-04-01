import { promises as fs } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  getTaskEvidencePaths,
  normalizeRepoPath,
  opsOutDir as outDir,
  parseTaskIdArg,
  readTaskManifest,
  repoRoot,
  reviewPacketDir,
  testRunsDir,
} from "./task_evidence_utils.mjs";
const boundaryPolicyPath = path.join(repoRoot, "docs", "project_memory", "governance", "repo_boundary_policy.json");

export async function ensureOutDir() {
  await fs.mkdir(outDir, { recursive: true });
}

function toRule(rule) {
  return normalizeRepoPath(rule).toLowerCase();
}

function matchesRule(filePath, rule) {
  const file = normalizeRepoPath(filePath).toLowerCase();
  const matchRule = toRule(rule);
  if (!matchRule) return false;
  if (matchRule.endsWith("/")) return file.startsWith(matchRule);
  if (matchRule.includes("*")) {
    const escaped = matchRule.replace(/[.+^${}()|[\]\\]/g, "\\$&");
    const globPattern = escaped.replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*");
    const regex = new RegExp(`^${globPattern}(?:/.*)?$`);
    return regex.test(file);
  }
  return file === matchRule || file.startsWith(`${matchRule}/`);
}

async function ignoredLanes() {
  const supplementalEvidenceRules = [
    "docs/project_memory/test_runs/",
    "docs/project_memory/strategy_reports/",
  ];
  try {
    const raw = await fs.readFile(boundaryPolicyPath, "utf8");
    const parsed = JSON.parse(raw);
    return [
      ...(parsed?.lanes?.generatedEvidence || []),
      ...(parsed?.lanes?.localOnly || []),
      ...supplementalEvidenceRules,
    ];
  } catch {
    return [".project_memory/", "docs/project_memory/test_runs/", "docs/project_memory/strategy_reports/", "dist/", "build/", "node_modules/"];
  }
}

export async function findLatestReviewPacket() {
  try {
    const entries = await fs.readdir(reviewPacketDir, { withFileTypes: true });
    const packets = [];
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      if (!entry.name.endsWith(".md") || entry.name === "README.md") continue;
      const absPath = path.join(reviewPacketDir, entry.name);
      const stats = await fs.stat(absPath);
      packets.push({ absPath, name: entry.name, mtimeMs: stats.mtimeMs });
    }
    packets.sort((a, b) => b.mtimeMs - a.mtimeMs);
    return packets[0] || null;
  } catch {
    return null;
  }
}

export async function findTaskReviewPacket(taskId = "") {
  if (!taskId) return null;
  const paths = getTaskEvidencePaths(taskId);
  try {
    await fs.access(paths.reviewPacketMdPath);
    return { absPath: paths.reviewPacketMdPath, name: path.basename(paths.reviewPacketMdPath) };
  } catch {
    return null;
  }
}

export async function resolveReviewPacket(taskId = "") {
  if (taskId) {
    return (await findTaskReviewPacket(taskId)) || (await findLatestReviewPacket());
  }
  return findLatestReviewPacket();
}

export function parseMarkdownSections(text) {
  const lines = String(text || "").replace(/^\uFEFF/, "").split(/\r?\n/);
  const sections = new Map();
  let currentKey = "__root__";
  let currentLines = [];

  const flush = () => {
    sections.set(currentKey, currentLines.join("\n").trim());
  };

  for (const line of lines) {
    const match = /^##\s+(.+?)\s*$/.exec(line);
    if (match) {
      flush();
      currentKey = match[1].trim().toLowerCase();
      currentLines = [];
      continue;
    }
    currentLines.push(line);
  }
  flush();
  return sections;
}

export function packetHasRequiredSections(text, substantialTask = true) {
  const sections = parseMarkdownSections(text);
  const required = [
    "task summary",
    "changed files",
    "tests run",
    "pass/fail",
    "manual qa path",
    "assumptions",
    "known risks",
    "reviewer checklist",
  ];
  if (substantialTask) {
    required.push("reviewer entry point");
  }
  return required.every((key) => sections.has(key));
}

export function extractPathishTokens(text) {
  const tokens = new Set();
  const backtickRegex = /`([^`]+(?:\.[A-Za-z0-9]+)?)`/g;
  const markdownLinkRegex = /\[[^\]]+\]\(([^)]+)\)/g;
  const plainPathRegex = /(?:[A-Za-z]:)?[A-Za-z0-9_./\\-]+\.(?:ts|tsx|js|mjs|cjs|json|md|ps1|spec\.ts)/g;

  for (const regex of [backtickRegex, markdownLinkRegex, plainPathRegex]) {
    let match;
    while ((match = regex.exec(text)) !== null) {
      const candidate = normalizeRepoPath(match[1] || match[0]);
      if (candidate.includes("/")) tokens.add(candidate);
    }
  }
  return Array.from(tokens);
}

export function containsPlaceholderText(text) {
  return /(^|\W)(tbd|lorem ipsum|placeholder|coming soon|fixme)(\W|$)/i.test(String(text || ""));
}

export function collectChangedFiles() {
  const run = (args) =>
    spawnSync("git", args, {
      cwd: repoRoot,
      encoding: "utf8",
      shell: false,
      maxBuffer: 1024 * 1024 * 10,
    });

  const diffRes = run(["diff", "--name-only", "HEAD"]);
  const statusRes = run(["status", "--porcelain"]);
  const files = new Set();

  for (const line of String(diffRes.stdout || "").split(/\r?\n/)) {
    const file = normalizeRepoPath(line);
    if (file) files.add(file);
  }

  for (const rawLine of String(statusRes.stdout || "").split(/\r?\n/)) {
    if (!rawLine.trim()) continue;
    const payload = rawLine.slice(3).trim();
    const file = normalizeRepoPath(payload.includes("->") ? payload.split("->").pop().trim() : payload);
    if (file) files.add(file);
  }

  return Array.from(files).sort();
}

export async function collectGovernedChangedFiles() {
  const files = collectChangedFiles();
  const ignoredRules = await ignoredLanes();
  return files.filter((file) => !ignoredRules.some((rule) => matchesRule(file, rule)));
}

export async function findLatestMatchingTestRun(regex) {
  try {
    const entries = await fs.readdir(testRunsDir, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
      if (!entry.isFile() || !regex.test(entry.name)) continue;
      const absPath = path.join(testRunsDir, entry.name);
      const stats = await fs.stat(absPath);
      files.push({ absPath, name: entry.name, mtimeMs: stats.mtimeMs });
    }
    files.sort((a, b) => b.mtimeMs - a.mtimeMs);
    return files[0] || null;
  } catch {
    return null;
  }
}

export async function readJsonIfExists(relPath) {
  try {
    const raw = await fs.readFile(path.join(repoRoot, relPath), "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function normalizePacketPath(filePath) {
  return normalizeRepoPath(filePath);
}

export async function resolveTaskManifest(taskId = "") {
  if (!taskId) return null;
  return readTaskManifest(taskId);
}

export function parseReviewTaskId(argv = process.argv) {
  return parseTaskIdArg(argv);
}

export { outDir, repoRoot, reviewPacketDir, testRunsDir };
