import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { pathToFileURL } from "url";

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
//
// ★ THE ABOVE WAS ONLY HALF THE MECHANISM, AND THE MISSING HALF WAS A REAL BLIND SPOT. [GUARD-1]
// `git diff` is root-framed from ANY cwd, so the reasoning above holds for TRACKED changes. But
// `git ls-files --others` (the UNTRACKED enumeration) is CWD-SCOPED: run from lazytopper/ it lists
// only what lives under lazytopper/, and emits it cwd-relative. A PR that created a NEW top-level
// directory therefore had its files omitted from `all` entirely — not "unclassified", UNSEEN. The
// guard printed SCOPE_GUARD_OK on a change it never looked at.
//
// ★ And the "no-blind-spot invariant" below could not catch it: it compared the classified count
// against `all.length`, i.e. against the very list the omission had already shrunk. A self-check
// asserted against its own input is a TAUTOLOGY — it can only see what its input already contains.
//
// The fix is to enumerate from the GIT ROOT (see listFiles) so every command is root-framed, and to
// PRINT the enumeration scope so a run states what it inspected instead of merely claiming success.
function detectGitRoot() {
  try {
    return normalizePath(execSync("git rev-parse --show-toplevel", { encoding: "utf8" }));
  } catch {
    return "";
  }
}
const GIT_ROOT = detectGitRoot();

function detectAnchorPrefix() {
  const anchor = normalizePath(ROOT);
  if (!GIT_ROOT || anchor === GIT_ROOT) return "";
  if (anchor.startsWith(`${GIT_ROOT}/`)) {
    return `${anchor.slice(GIT_ROOT.length + 1)}/`;
  }
  return "";
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
const explicitMode = modeIdx !== -1 && rawArgs[modeIdx + 1] ? rawArgs[modeIdx + 1] : "";

function normalizePath(filePath) {
  return String(filePath || "").replace(/\\/g, "/").replace(/^\.\//, "").trim();
}

function toRule(rule) {
  return normalizePath(rule).toLowerCase();
}

// ★ Every enumeration runs with cwd = GIT ROOT so all of them share ONE frame (git-root-relative).
// This is what closes the untracked blind spot: `git ls-files --others` is cwd-scoped, so running it
// from the anchor silently omitted every file outside lazytopper/. Do not "simplify" this back to a
// bare execSync — the omission it prevents is invisible in the output.
function listFilesFrom(cwd, cmd) {
  try {
    return execSync(cmd, { encoding: "utf8", cwd })
      .split(/\r?\n/)
      .map((line) => normalizePath(line))
      .filter(Boolean);
  } catch {
    return [];
  }
}

function listFiles(cmd) {
  return listFilesFrom(GIT_ROOT || ROOT, cmd);
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

export function readPolicy() {
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

export function classifyFile(filePath, lanes) {
  if (inLane(filePath, lanes.generatedEvidence)) return "generatedEvidence";
  if (inLane(filePath, lanes.localOnly)) return "localOnly";
  if (normalizePath(filePath) === "package.json" && packageJsonHasOnlyScriptChanges()) {
    return "trackedTooling";
  }
  // ★ [D47]/[D41]. These two lanes cover paths that live OUTSIDE the lazytopper/
  // anchor, so toPolicyFrame leaves them at their full git-root path and none of
  // the anchor-relative rules above can ever match them. Before this, EVERY
  // artifacts/api-server PR and EVERY docs handoff reported
  // `[unclassified] -> SCOPE_GUARD_FAIL` — not a breach, but a guard crying wolf
  // on correct work, which is how a gate stops being read.
  //
  // ★ ADDING THE LANES TO THE POLICY JSON ALONE IS A SILENT NO-OP. This function
  // consults lanes BY NAME, so a lane nobody reads classifies nothing — exactly
  // the shape of the FORBIDDEN-prefix bug (#547): a rule that looks like coverage
  // and cannot fire. Both halves are required, and the acceptance check
  // mutation-proves it.
  //
  // `|| []` so an older policy file lacking these keys still loads.
  if (inLane(filePath, lanes.apiServer || [])) return "apiServer";
  if (inLane(filePath, lanes.docs || [])) return "docs";
  // ★ [GUARD-1] Root-level lanes. `firestore` and `repoRoot` cover paths that only exist ABOVE the
  // lazytopper/ anchor. Until they existed, firestore.rules — a security-critical file — classified
  // as "unknown" and every correct rules PR reported [unclassified] -> SCOPE_GUARD_FAIL. Same
  // three-part rule as [D47]: policy JSON + this function + laneBuckets, or it is a silent no-op.
  if (inLane(filePath, lanes.firestore || [])) return "firestore";
  if (inLane(filePath, lanes.repoRoot || [])) return "repoRoot";
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

// ★ [GUARD-3] MODE AUTO-DETECTION — and why it is NOT a rubber stamp.
//
// The bare invocation `pnpm run scope:guard` used to hardcode mode="tooling", whose only allowed
// lane is `trackedTooling`. So the single most common change in this repo — a docs-only handoff
// edit — reported `[docs]` LANE VIOLATIONS on correct work, while `--mode docs` passed on the
// IDENTICAL tree. A guard that reddens the ordinary case trains people to stop reading it, and an
// ignored guard is a dead guard.
//
// ⚠ THE TRAP: auto-detecting by "allow whatever lanes changed" would make the lane check
// unfailable — a permissive auto-detect is worse than a wrong one, because it still prints OK.
// So this does NOT invent an allowance. It picks the NARROWEST DECLARED mode from the policy whose
// lane set COVERS the changed lanes, and FAILS when no declared mode covers them. The sanctioned
// lane COMBINATIONS are exactly the ones an author wrote into `modeToLanes`; a combination nobody
// sanctioned (e.g. product + docs in one commit) has no covering mode and is still rejected.
// Hard-boundary lanes (generatedEvidence / localOnly / unknown) are unaffected — they fail in
// every mode, detected or explicit.
function detectMode(changedLanes, modeToLanes) {
  const HARD = new Set(["generatedEvidence", "localOnly", "unknown"]);
  const needed = changedLanes.filter((lane) => !HARD.has(lane));
  if (!needed.length) return { mode: "tooling", detected: true };
  const candidates = Object.entries(modeToLanes)
    .filter(([, allowed]) => needed.every((lane) => allowed.includes(lane)))
    .sort((a, b) => a[1].length - b[1].length || a[0].localeCompare(b[0]));
  if (!candidates.length) return { mode: "", detected: true, needed };
  return { mode: candidates[0][0], detected: true };
}

function main() {
  const { lanes, modeToLanes } = readPolicy();
  if (explicitMode && !Array.isArray(modeToLanes[explicitMode])) {
    console.log(`SCOPE_GUARD_FAIL: unknown mode "${explicitMode}"`);
    console.log(`Known modes: ${Object.keys(modeToLanes).join(", ")}`);
    process.exit(1);
  }

  // Collect the FULL diff (no `--relative` — see toPolicyFrame note), then normalize each path into
  // the policy frame. Mapping is total and 1:1, so nothing is ever dropped from what the guard sees.
  const staged = listFiles("git diff --name-only --cached").map(toPolicyFrame);
  const unstaged = listFiles("git diff --name-only").map(toPolicyFrame);
  const untrackedRaw = listFiles("git ls-files --others --exclude-standard");
  const untracked = untrackedRaw.map(toPolicyFrame);
  const stagedDeleted = listFiles("git diff --name-only --diff-filter=D --cached").map(toPolicyFrame);
  const unstagedDeleted = listFiles("git diff --name-only --diff-filter=D").map(toPolicyFrame);
  const all = Array.from(new Set([...staged, ...unstaged, ...untracked]));
  const deletedFiles = new Set([...stagedDeleted, ...unstagedDeleted]);

  // ★ [GUARD-1] STATE WHAT WAS INSPECTED. A guard that cannot say what it looked at cannot be
  // distinguished from a guard that looked at nothing — both print OK. `blindSpotAvoided` is an
  // INDEPENDENT measurement, not a restatement of `all`: it re-runs the untracked enumeration from
  // the ANCHOR (the old, broken frame) and reports how many files that frame would have MISSED.
  // On a repo with a new top-level directory this is > 0, which is the regression alarm.
  //
  // ★★ [GUARD-3] THE COUNTER MEASURES UNTRACKED FILES ONLY — AND THAT IS CORRECT, NOT A GAP.
  // It was named `anchor_frame_would_miss`, which reads as "everything the old frame would miss".
  // It never measured that, so a reader could take `=0` as "the old frame caught everything" —
  // a stronger claim than the number supports. The name now states its scope.
  //
  // ⚠ DO NOT "COMPLETE" THIS BY MAKING IT COUNT TRACKED-MODIFIED FILES OUTSIDE THE ANCHOR.
  // That change has been proposed once and rejected on inspection. `git diff --name-only` emits
  // GIT-ROOT-RELATIVE paths from ANY cwd, so a tracked-modified file outside the anchor was
  // returned by the old frame too and was NEVER missed. Counting it here would report a miss that
  // does not occur — turning a correct metric into a permanent false alarm. Untracked enumeration
  // (`git ls-files --others`) is the only cwd-scoped command of the set, and therefore the only
  // blind spot there ever was. The name is the defect; the measurement is right.
  const anchorScopedUntracked = ANCHOR_PREFIX
    ? listFilesFrom(ROOT, "git ls-files --others --exclude-standard").map(
        (p) => `${ANCHOR_PREFIX}${p}`
      )
    : untrackedRaw;
  const untrackedMissedByAnchorFrame = untrackedRaw.filter(
    (f) => !anchorScopedUntracked.includes(f)
  ).length;
  console.log(
    `SCOPE_GUARD_SCOPE: root=${GIT_ROOT || "(none)"} anchor=${ANCHOR_PREFIX || "(root)"} ` +
      `inspected=${all.length} untracked=${untrackedRaw.length} ` +
      `anchor_frame_would_miss_untracked=${untrackedMissedByAnchorFrame}`
  );

  if (!all.length) {
    console.log(`SCOPE_GUARD_OK (mode=${explicitMode || "auto"}, no changes)`);
    process.exit(0);
  }

  // ★ Every lane classifyFile can RETURN must have a bucket here, or the push
  // below throws. Adding a lane is therefore a THREE-part change — policy JSON,
  // classifyFile, and this object — and the first two alone crash rather than
  // misbehave, which is the good failure mode. [D47]
  const laneBuckets = {
    product: [],
    trackedTooling: [],
    generatedEvidence: [],
    localOnly: [],
    apiServer: [],
    docs: [],
    firestore: [],
    repoRoot: [],
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

  // ★ DERIVED, NOT LISTED — and this line is why. It previously read
  // `["product", "trackedTooling"]`, so a lane added to the policy AND to
  // classifyFile still went unenforced: its files were classified, never checked
  // against the allowed set, and the run printed OK. A lane that classifies but
  // is never enforced is a silent no-op — the same class as #547's FORBIDDEN
  // entry that could not match. Deriving from the buckets means enforcement
  // follows automatically and cannot be forgotten. [D47]
  const HARD_BOUNDARY_LANES = new Set(["generatedEvidence", "localOnly", "unknown"]);
  const changedLanes = Object.keys(laneBuckets)
    .filter((lane) => !HARD_BOUNDARY_LANES.has(lane))
    .filter((lane) => laneBuckets[lane].length > 0);
  // Resolve the mode only now — auto-detection needs the classified lanes. An explicit --mode
  // always wins and is never widened; auto-detect only chooses among modes the policy declares.
  let mode = explicitMode;
  let allowedLanes = explicitMode ? modeToLanes[explicitMode] : null;
  let uncoveredLanes = null;
  if (!explicitMode) {
    const detected = detectMode(changedLanes, modeToLanes);
    if (!detected.mode) {
      // No declared mode covers this lane combination. Report it, allow NOTHING, and let the
      // normal lane-violation path below print every offending file with its lane.
      uncoveredLanes = detected.needed;
      mode = "auto(uncovered)";
      allowedLanes = [];
    } else {
      mode = `auto:${detected.mode}`;
      allowedLanes = modeToLanes[detected.mode];
    }
  }

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
  console.log(`allowed lanes: ${allowedLanes.length ? allowedLanes.join(", ") : "(none)"}`);
  if (uncoveredLanes) {
    console.log(
      `no declared mode covers this lane combination: ${uncoveredLanes.join("+")} ` +
        `— declared modes: ${Object.keys(modeToLanes).join(", ")}`
    );
  }

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

// ★ [GUARD-1] Only self-execute when invoked as a CLI. The acceptance test imports `classifyFile`
// from THIS file so it exercises the REAL classifier — repo_boundary_acceptance.mjs keeps its own
// copy of classifyFile, and that copy silently drifted (it still lacks the apiServer/docs lanes),
// which is the same "guard checking something other than the real thing" failure. Never re-copy it.
const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (import.meta.url === invokedPath) {
  main();
}
