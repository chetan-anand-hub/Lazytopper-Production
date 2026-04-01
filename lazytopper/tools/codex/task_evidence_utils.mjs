import { promises as fs } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(__dirname, "..", "..");
export const reviewPacketDir = path.join(repoRoot, "docs", "project_memory", "review_packets");
export const testRunsDir = path.join(repoRoot, "docs", "project_memory", "test_runs");
export const opsOutDir = path.join(repoRoot, ".project_memory", "ops", "out");

function gitValue(args) {
  try {
    return spawnSync("git", args, {
      cwd: repoRoot,
      shell: false,
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 10,
    }).stdout.trim();
  } catch {
    return "";
  }
}

export function parseTaskIdArg(argv = process.argv) {
  const equalsFlag = argv.find((arg) => arg.startsWith("--task-id="));
  if (equalsFlag) {
    const value = equalsFlag.slice("--task-id=".length).trim();
    return value || "";
  }
  const flagIndex = argv.indexOf("--task-id");
  if (flagIndex !== -1) {
    return String(argv[flagIndex + 1] || "").trim();
  }
  return "";
}

export function normalizeRepoPath(filePath) {
  const normalized = String(filePath || "").replaceAll("\\", "/").trim();
  const repoRootNormalized = repoRoot.replaceAll("\\", "/");
  if (normalized.startsWith(repoRootNormalized + "/")) {
    return normalized.slice(repoRootNormalized.length + 1);
  }
  return normalized.replace(/^\.\//, "");
}

export function taskIdFromTaskName(taskName, date = new Date()) {
  const base = String(taskName || "task")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  const pad = (n) => String(n).padStart(2, "0");
  const stamp = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  return `${base || "task"}-${stamp}`;
}

export function getTaskEvidencePaths(taskId) {
  const safeTaskId = String(taskId || "").trim();
  if (!safeTaskId) {
    return {
      taskId: "",
      taskRunDir: testRunsDir,
      opsTaskOutDir: opsOutDir,
      manifestPath: "",
      reviewPacketMdPath: "",
      reviewPacketJsonPath: "",
      manualQaPath: "",
    };
  }
  return {
    taskId: safeTaskId,
    taskRunDir: path.join(testRunsDir, safeTaskId),
    opsTaskOutDir: path.join(opsOutDir, safeTaskId),
    manifestPath: path.join(testRunsDir, safeTaskId, "manifest.json"),
    reviewPacketMdPath: path.join(reviewPacketDir, `${safeTaskId}_review.md`),
    reviewPacketJsonPath: path.join(reviewPacketDir, `${safeTaskId}_review.json`),
    manualQaPath: path.join(testRunsDir, safeTaskId, `${safeTaskId}_manualQA.md`),
  };
}

export async function ensureTaskEvidenceDirs(taskId) {
  if (!taskId) return null;
  const paths = getTaskEvidencePaths(taskId);
  await fs.mkdir(paths.taskRunDir, { recursive: true });
  await fs.mkdir(paths.opsTaskOutDir, { recursive: true });
  await fs.mkdir(reviewPacketDir, { recursive: true });
  return paths;
}

function uniqueList(items) {
  return Array.from(
    new Set(
      (Array.isArray(items) ? items : [items])
        .map((item) => String(item || "").trim())
        .filter(Boolean)
    )
  );
}

function mergeExecutedTests(existing, next) {
  const byCommand = new Map();
  for (const item of [...(Array.isArray(existing) ? existing : []), ...(Array.isArray(next) ? next : [])]) {
    const key = `${item?.label || ""}::${item?.command || ""}`;
    byCommand.set(key, item);
  }
  return Array.from(byCommand.values());
}

export function defaultTaskManifest(taskId, overrides = {}) {
  const branch = gitValue(["branch", "--show-current"]);
  const headCommit = gitValue(["rev-parse", "HEAD"]);
  const upstreamRef = gitValue(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}"]);
  const mergeBase = upstreamRef ? gitValue(["merge-base", "HEAD", upstreamRef]) : "";
  const paths = getTaskEvidencePaths(taskId);

  return {
    taskId: String(taskId || ""),
    generatedAt: new Date().toISOString(),
    git: {
      branch: branch || null,
      headCommit: headCommit || null,
      upstreamRef: upstreamRef || null,
      mergeBase: mergeBase || null,
    },
    changedFiles: [],
    expectedTests: [],
    executedTests: [],
    proofArtifacts: {},
    reviewPacketPath: normalizeRepoPath(paths.reviewPacketMdPath),
    reviewPacketJsonPath: normalizeRepoPath(paths.reviewPacketJsonPath),
    manualQaPath: normalizeRepoPath(paths.manualQaPath),
    gatekeeperVerdict: null,
    gatekeeperReasons: [],
    assumptions: [],
    residualRisks: [],
    ...overrides,
  };
}

export async function readTaskManifest(taskId) {
  if (!taskId) return null;
  const { manifestPath } = getTaskEvidencePaths(taskId);
  try {
    const raw = await fs.readFile(manifestPath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function writeTaskManifest(taskId, manifest) {
  if (!taskId) return null;
  const paths = await ensureTaskEvidenceDirs(taskId);
  const payload = {
    ...defaultTaskManifest(taskId),
    ...(manifest || {}),
    taskId: taskId,
    generatedAt: new Date().toISOString(),
  };
  await fs.writeFile(paths.manifestPath, JSON.stringify(payload, null, 2), "utf8");
  return paths.manifestPath;
}

export async function updateTaskManifest(taskId, patch = {}) {
  if (!taskId) return null;
  const current = (await readTaskManifest(taskId)) || defaultTaskManifest(taskId);
  const next = {
    ...current,
    ...patch,
    taskId,
    generatedAt: new Date().toISOString(),
    changedFiles: uniqueList(patch.changedFiles ?? current.changedFiles),
    expectedTests: uniqueList(
      (patch.expectedTests ?? current.expectedTests).map((item) =>
        typeof item === "string" ? item : JSON.stringify(item)
      )
    ).map((item) => {
      try {
        return JSON.parse(item);
      } catch {
        return item;
      }
    }),
    executedTests: mergeExecutedTests(current.executedTests, patch.executedTests),
    gatekeeperReasons: uniqueList(patch.gatekeeperReasons ?? current.gatekeeperReasons),
    assumptions: uniqueList(patch.assumptions ?? current.assumptions),
    residualRisks: uniqueList(patch.residualRisks ?? current.residualRisks),
    proofArtifacts: {
      ...(current.proofArtifacts || {}),
      ...(patch.proofArtifacts || {}),
    },
  };
  await writeTaskManifest(taskId, next);
  return next;
}

export function taskScopedOutPath(fileName, taskId = "") {
  const normalized = String(fileName || "").trim();
  if (!taskId) return path.join(opsOutDir, normalized);
  return path.join(getTaskEvidencePaths(taskId).opsTaskOutDir, normalized);
}

export function taskScopedTestRunPath(fileName, taskId = "") {
  const normalized = String(fileName || "").trim();
  if (!taskId) return path.join(testRunsDir, normalized);
  return path.join(getTaskEvidencePaths(taskId).taskRunDir, normalized);
}

export async function writeTaskScopedJsonReport(fileName, payload, taskId = "") {
  const targets = [taskScopedOutPath(fileName)];
  if (taskId) {
    await ensureTaskEvidenceDirs(taskId);
    targets.unshift(taskScopedOutPath(fileName, taskId));
  } else {
    await fs.mkdir(opsOutDir, { recursive: true });
  }

  for (const target of targets) {
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, JSON.stringify(payload, null, 2), "utf8");
  }

  return {
    primaryPath: targets[0],
    legacyPath: targets[targets.length - 1],
    allPaths: targets,
  };
}

export async function writeTaskScopedTextFile(absPath, text) {
  await fs.mkdir(path.dirname(absPath), { recursive: true });
  await fs.writeFile(absPath, text, "utf8");
  return absPath;
}
