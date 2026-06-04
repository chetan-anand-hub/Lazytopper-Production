import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const ROOT = process.cwd();
const POLICY_PATH = path.join(
  ROOT,
  "docs",
  "project_memory",
  "governance",
  "repo_boundary_policy.json"
);

// Path frame-of-reference normalization (monorepo: .git at repo root, guard run from lazytopper/).
// `git diff` emits paths relative to the GIT ROOT (e.g. "lazytopper/src/..."), but the policy lane
// rules are written relative to the guard's anchor dir (cwd, e.g. "src/"). We strip the anchor
// prefix so in-anchor files match the rules, while files OUTSIDE the anchor keep their full git-root
// path and are STILL classified (they land in a real lane or fall to "unknown" -> visible FAIL).
// We never use `git diff --relative`: that would silently drop out-of-anchor files (false-PASS blind spot).
function detectAnchorPrefix() {
  try {
    const gitRoot = normalizePath(
      execSync("git rev-parse --show-toplevel", { encoding: "utf8" })
    );
    const anchor = normalizePath(ROOT);
    if (!gitRoot || anchor === gitRoot) return "";
    if (anchor.startsWith(`${gitRoot}/`)) {
      return `${anchor.slice(gitRoot.length + 1)}/`;
    }
    return "";
  } catch {
    return "";
  }
}
const ANCHOR_PREFIX = detectAnchorPrefix();

// Map a git-root-relative path into the policy's (anchor-relative) frame. Total and 1:1 — never drops.
function toPolicyFrame(filePath) {
  const p = normalizePath(filePath);
  if (ANCHOR_PREFIX && p.startsWith(ANCHOR_PREFIX)) {
    return p.slice(ANCHOR_PREFIX.length);
  }
  return p;
}

const rawArgs = process.argv.slice(2);
const modeIdx = rawArgs.indexOf("--mode");
const mode = modeIdx !== -1 && rawArgs[modeIdx + 1] ? rawArgs[modeIdx + 1] : "tooling";

function normalizePath(filePath) {
  return String(filePath || "").replace(/\\/g, "/").replace(/^\.\//, "").trim();
}

function toRule(rule) {
  return normalizePath(rule).toLowerCase();
}

function listFiles(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8" })
      .split(/\r?\n/)
      .map((line) => normalizePath(line))
      .filter(Boolean);
  } catch {
    return [];
  }
}

function readJsonSafe(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

let packageJsonScriptsOnlyChangeCache;
function packageJsonHasOnlyScriptChanges() {
  if (typeof packageJsonScriptsOnlyChangeCache === "boolean") {
    return packageJsonScriptsOnlyChangeCache;
  }

  try {
    const current = readJsonSafe(path.join(ROOT, "package.json"));
    // HEAD:./package.json resolves relative to cwd (the anchor dir), so this reads the guard's own
    // package.json — not a repo-root package.json. Required now that path normalization maps an
    // in-anchor "<anchor>/package.json" change to "package.json", activating this scripts-only check.
    const headText = execSync("git show HEAD:./package.json", { encoding: "utf8" });
    const previous = JSON.parse(headText);
    if (!current || !previous) {
      packageJsonScriptsOnlyChangeCache = false;
      return packageJsonScriptsOnlyChangeCache;
    }

    const keys = Array.from(new Set([...Object.keys(current), ...Object.keys(previous)]));
    const changedTopLevelKeys = keys.filter(
      (key) => JSON.stringify(current[key]) !== JSON.stringify(previous[key])
    );
    packageJsonScriptsOnlyChangeCache =
      changedTopLevelKeys.length > 0 && changedTopLevelKeys.every((key) => key === "scripts");
    return packageJsonScriptsOnlyChangeCache;
  } catch {
    packageJsonScriptsOnlyChangeCache = false;
    return packageJsonScriptsOnlyChangeCache;
  }
}

function readPolicy() {
  if (!fs.existsSync(POLICY_PATH)) {
    throw new Error(`scopeGuard: missing policy file at ${normalizePath(POLICY_PATH)}`);
  }
  const parsed = JSON.parse(fs.readFileSync(POLICY_PATH, "utf8"));
  const lanes = parsed?.lanes || {};
  const modeToLanes = parsed?.modeToLanes || {};
  if (!lanes.product || !lanes.trackedTooling || !lanes.generatedEvidence || !lanes.localOnly) {
    throw new Error("scopeGuard: invalid boundary policy (missing required lane arrays).");
  }
  return { lanes, modeToLanes };
}

function matchesRule(filePath, rule) {
  const file = normalizePath(filePath).toLowerCase();
  const matchRule = toRule(rule);
  if (!matchRule) return false;
  if (matchRule.endsWith("/")) return file.startsWith(matchRule);
  if (matchRule.includes("*")) {
    const escaped = matchRule.replace(/[.+^${}()|[\]\\]/g, "\\$&");
    const globPattern = escaped
      .replace(/\*\*/g, ".*")
      .replace(/\*/g, "[^/]*");
    const regex = new RegExp(`^${globPattern}(?:/.*)?$`);
    return regex.test(file);
  }
  return file === matchRule || file.startsWith(`${matchRule}/`);
}

function inLane(filePath, rules) {
  return rules.some((rule) => matchesRule(filePath, rule));
}

function classifyFile(filePath, lanes) {
  if (inLane(filePath, lanes.generatedEvidence)) return "generatedEvidence";
  if (inLane(filePath, lanes.localOnly)) return "localOnly";
  if (normalizePath(filePath) === "package.json" && packageJsonHasOnlyScriptChanges()) {
    return "trackedTooling";
  }
  if (inLane(filePath, lanes.product)) return "product";
  if (inLane(filePath, lanes.trackedTooling)) return "trackedTooling";
  return "unknown";
}

function toLaneLabel(laneKey) {
  if (laneKey === "generatedEvidence") return "generated evidence";
  if (laneKey === "localOnly") return "local-only";
  if (laneKey === "trackedTooling") return "tracked tooling";
  return laneKey;
}

function printList(header, files) {
  if (!files.length) return;
  console.log(header);
  for (const file of files) console.log(` - ${file}`);
}

function main() {
  const { lanes, modeToLanes } = readPolicy();
  const allowedLanes = modeToLanes[mode];
  if (!Array.isArray(allowedLanes) || !allowedLanes.length) {
    console.log(`SCOPE_GUARD_FAIL: unknown mode "${mode}"`);
    console.log(`Known modes: ${Object.keys(modeToLanes).join(", ")}`);
    process.exit(1);
  }

  // Collect the FULL diff (no `--relative` — see toPolicyFrame note), then normalize each path into
  // the policy frame. Mapping is total and 1:1, so nothing is ever dropped from what the guard sees.
  const staged = listFiles("git diff --name-only --cached").map(toPolicyFrame);
  const unstaged = listFiles("git diff --name-only").map(toPolicyFrame);
  const untracked = listFiles("git ls-files --others --exclude-standard").map(toPolicyFrame);
  const stagedDeleted = listFiles("git diff --name-only --diff-filter=D --cached").map(toPolicyFrame);
  const unstagedDeleted = listFiles("git diff --name-only --diff-filter=D").map(toPolicyFrame);
  const all = Array.from(new Set([...staged, ...unstaged, ...untracked]));
  const deletedFiles = new Set([...stagedDeleted, ...unstagedDeleted]);

  if (!all.length) {
    console.log(`SCOPE_GUARD_OK (mode=${mode}, no changes)`);
    process.exit(0);
  }

  const laneBuckets = {
    product: [],
    trackedTooling: [],
    generatedEvidence: [],
    localOnly: [],
    unknown: [],
  };

  for (const file of all) {
    const lane = classifyFile(file, lanes);
    laneBuckets[lane].push(file);
  }

  // No-blind-spot invariant: every changed file must be classified into exactly one bucket.
  // If this ever diverges, fail loudly rather than silently passing an unseen change.
  const classifiedCount = Object.values(laneBuckets).reduce((sum, files) => sum + files.length, 0);
  if (classifiedCount !== all.length) {
    console.log("SCOPE_GUARD_FAIL: classification invariant broken");
    console.log(`changed files: ${all.length}, classified: ${classifiedCount}`);
    process.exit(1);
  }

  const hardBoundaryViolations = [
    ...laneBuckets.generatedEvidence
      .filter((file) => !deletedFiles.has(file))
      .map((file) => ({ lane: "generatedEvidence", file })),
    ...laneBuckets.localOnly
      .filter((file) => !deletedFiles.has(file))
      .map((file) => ({ lane: "localOnly", file })),
    ...laneBuckets.unknown.map((file) => ({ lane: "unknown", file })),
  ];

  const changedLanes = ["product", "trackedTooling"].filter((lane) => laneBuckets[lane].length > 0);
  const disallowedLaneChanges = changedLanes
    .filter((lane) => !allowedLanes.includes(lane))
    .flatMap((lane) => laneBuckets[lane].map((file) => ({ lane, file })));

  const hasFailure = hardBoundaryViolations.length > 0 || disallowedLaneChanges.length > 0;
  if (!hasFailure) {
    console.log(
      `SCOPE_GUARD_OK (mode=${mode}, lanes=${changedLanes.length ? changedLanes.join("+") : "none"})`
    );
    process.exit(0);
  }

  console.log("SCOPE_GUARD_FAIL");
  console.log(`mode: ${mode}`);
  console.log(`allowed lanes: ${allowedLanes.join(", ")}`);

  if (hardBoundaryViolations.length) {
    console.log("hard-boundary violations:");
    for (const item of hardBoundaryViolations) {
      const label = item.lane === "unknown" ? "unclassified" : toLaneLabel(item.lane);
      console.log(` - [${label}] ${item.file}`);
    }
  }

  if (disallowedLaneChanges.length) {
    console.log("lane violations:");
    for (const item of disallowedLaneChanges) {
      console.log(` - [${toLaneLabel(item.lane)}] ${item.file}`);
    }
  }

  printList("changed product files:", laneBuckets.product);
  printList("changed tracked tooling files:", laneBuckets.trackedTooling);
  process.exit(1);
}

main();
