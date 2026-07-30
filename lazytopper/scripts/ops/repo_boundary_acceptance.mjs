/**
 * repo_boundary_acceptance.mjs
 *
 * ★ [GUARD-2] THIS FILE HAD TWO DEFECTS AND THE FIRST MASKED THE SECOND.
 *
 * 1. It enumerated tracked files with `cwd = lazytopper/`. `git ls-files` is CWD-SCOPED, so it
 *    audited ONE of the repo's thirteen top-level trees and reported a boundary verdict over a
 *    subject that excluded artifacts/, handoff/, lib/, firestore.rules and everything else at the
 *    root. Same shape as the scope-guard blind spot GUARD-1 closed: the check ran, printed a
 *    number, and could not see the thing it exists to catch.
 *
 * 2. It kept a PRIVATE COPY of `classifyFile` that had drifted — it still lacked the `apiServer`
 *    and `docs` lanes added in #556, and later the `firestore`/`repoRoot` lanes. A guard checking a
 *    copy of the thing under test is not checking the thing under test.
 *
 * ★ EITHER DEFECT ALONE WOULD HAVE SHOWN RED. Together they were green: the stale copy never met
 * the out-of-anchor paths that would have exposed it, because defect 1 had already removed them
 * from the subject. Now it enumerates from the GIT ROOT and imports the REAL classifier from
 * scopeGuard.mjs (exported behind a CLI-invocation guard for exactly this purpose — never re-copy it).
 *
 * ★ AND IT NAMES ITS SUBJECT. Every run prints the git root, the anchor, how many files it
 * inspected, how many of those lie OUTSIDE the anchor, and the per-lane split — because a check
 * that cannot be shown to have looked is the appearance of coverage, which is worse than none.
 */
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

import { classifyFile } from "../scopeGuard.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const anchorRoot = path.resolve(__dirname, "..", ".."); // lazytopper/
const repoRoot = anchorRoot; // policy + gitignore + output all live under the anchor
const policyPath = path.join(
  anchorRoot,
  "docs",
  "project_memory",
  "governance",
  "repo_boundary_policy.json"
);
const gitignorePath = path.join(repoRoot, ".gitignore");
const outDir = path.join(repoRoot, ".project_memory", "ops", "out");
const outPath = path.join(outDir, "repo_boundary_acceptance.json");

function normalizePath(input) {
  return String(input || "").replace(/\\/g, "/").replace(/^\.\//, "").trim();
}

function addCheck(checks, name, ok, details = "") {
  checks.push({ name, ok: Boolean(ok), details: String(details || "") });
}

// ★ NO PRIVATE `classifyFile` LIVES IN THIS FILE, BY DESIGN. It is imported from scopeGuard.mjs at
// the top. The `classifier_imported_not_copied` check below reads this very source and fails if a
// local definition reappears — the drift it is guarding against happened once already and was
// invisible for four PRs.

function runGit(args, cwd) {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 64,
  });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${result.stderr || result.stdout || "unknown error"}`);
  }
  return String(result.stdout || "")
    .split(/\r?\n/)
    .map((line) => normalizePath(line))
    .filter(Boolean);
}

function detectGitRoot() {
  const r = spawnSync("git", ["rev-parse", "--show-toplevel"], {
    cwd: anchorRoot,
    encoding: "utf8",
  });
  if (r.status !== 0) throw new Error("repo_boundary_acceptance: not inside a git work tree");
  return normalizePath(r.stdout);
}

// Map a git-root-relative path into the policy's (anchor-relative) frame — the same 1:1, total
// mapping scopeGuard's `toPolicyFrame` applies. In-anchor files match the anchor-relative rules;
// files OUTSIDE the anchor keep their full git-root path and are matched by the root-level lanes
// (apiServer / docs / firestore / repoRoot) or fall to `unknown`, i.e. a visible FAIL.
function toPolicyFrame(filePath, anchorPrefix) {
  const p = normalizePath(filePath);
  if (anchorPrefix && p.startsWith(anchorPrefix)) return p.slice(anchorPrefix.length);
  return p;
}

async function run() {
  const checks = [];
  const policy = JSON.parse(await fs.readFile(policyPath, "utf8"));
  const lanes = policy?.lanes || {};
  const modeToLanes = policy?.modeToLanes || {};
  const gitignoreText = (await fs.readFile(gitignorePath, "utf8")).toLowerCase();

  const requiredLaneKeys = ["product", "trackedTooling", "generatedEvidence", "localOnly"];
  addCheck(
    checks,
    "policy_has_required_lanes",
    requiredLaneKeys.every((k) => Array.isArray(lanes[k]) && lanes[k].length > 0),
    `lanes=${Object.keys(lanes).join(",")}`
  );

  // ★ Deliberately HARDCODED, never derived from `policy.modeToLanes`. Asserting the map against
  // itself would be a tautology that passes for any value — this list is an INDEPENDENT statement of
  // what the modes are supposed to be, so widening a mode has to be a conscious edit in two places.
  // (It had gone stale: `mixed` gained apiServer and this expectation was never updated, so the
  // check sat RED on trunk. Nothing runs this file, which is why nobody noticed — see [FU-GUARD-1-C].)
  const expectedModes = {
    tooling: ["trackedTooling"],
    tutor: ["product"],
    product: ["product"],
    mixed: ["product", "trackedTooling", "apiServer", "firestore", "repoRoot"],
    firestore: ["firestore", "trackedTooling"],
    docs: ["docs"],
  };
  const modeMismatches = Object.entries(expectedModes).filter(([mode, expected]) => {
    const got = modeToLanes[mode] || [];
    return got.join("|") !== expected.join("|");
  });
  addCheck(
    checks,
    "policy_mode_map_expected",
    modeMismatches.length === 0,
    modeMismatches.length
      ? modeMismatches.map(([mode]) => mode).join(",")
      : "ok"
  );

  const requiredIgnoreRules = [
    ".project_memory/**",
    "docs/session/**",
    "docs/ops/out/**",
    "run_*/**",
    "**/run_*/**",
    ".codex_runs/**",
    "reports/**",
    "tools/.local_ops/**",
    "dist/**",
    "build/**",
    "node_modules/**",
    "_codex_output/**",
    "_debug_bundle/**",
    "_handover_evidence/**",
    "_handoff/**",
    "_rollback/**",
  ];
  const missingIgnoreRules = requiredIgnoreRules.filter(
    (rule) => !gitignoreText.includes(rule)
  );
  addCheck(
    checks,
    "gitignore_hard_boundary_rules_present",
    missingIgnoreRules.length === 0,
    missingIgnoreRules.join(",")
  );

  // ★ ENUMERATE FROM THE GIT ROOT. `git ls-files` is cwd-scoped; running it from the anchor made
  // this suite audit lazytopper/ ALONE — one of thirteen top-level trees — while claiming a
  // repo-wide boundary verdict.
  const gitRoot = detectGitRoot();
  const anchorPrefix =
    normalizePath(anchorRoot) === gitRoot
      ? ""
      : `${normalizePath(anchorRoot).slice(gitRoot.length + 1)}/`;

  const trackedFiles = runGit(["ls-files"], gitRoot);

  // ★ INDEPENDENT MEASUREMENT, not a restatement of the subject. Re-run the enumeration in the OLD
  // (anchor-scoped) frame and count what that frame would have MISSED. `classified === all.length`
  // proves nothing when the bug shrank `all` — this number comes from outside the list under test.
  const anchorFrameFiles = anchorPrefix
    ? runGit(["ls-files"], anchorRoot).map((p) => `${anchorPrefix}${p}`)
    : trackedFiles;
  const anchorFrameSeen = new Set(anchorFrameFiles);
  const missedByAnchorFrame = trackedFiles.filter((f) => !anchorFrameSeen.has(f));

  addCheck(
    checks,
    "enumeration_covers_whole_repo",
    anchorPrefix ? missedByAnchorFrame.length > 0 : trackedFiles.length > 0,
    anchorPrefix
      ? `tracked=${trackedFiles.length} anchor_frame_would_miss=${missedByAnchorFrame.length}` +
          ` e.g. ${missedByAnchorFrame.slice(0, 5).join(",") || "(none — SUBJECT IS ANCHOR-ONLY)"}`
      : `tracked=${trackedFiles.length} (guard anchor IS the git root)`
  );

  // ★ The classifier under test must be the REAL one. A private copy in this file drifted for four
  // PRs while the suite reported green. Read our own source and demand the import, forbid a copy.
  const ownSource = await fs.readFile(fileURLToPath(import.meta.url), "utf8");
  const importsClassifier = /import\s*\{[^}]*\bclassifyFile\b[^}]*\}\s*from\s*["']\.\.\/scopeGuard\.mjs["']/.test(
    ownSource
  );
  const definesClassifier =
    /^\s*(?:export\s+)?(?:async\s+)?function\s+classifyFile\b/m.test(ownSource) ||
    /^\s*(?:const|let|var)\s+classifyFile\s*=/m.test(ownSource);
  addCheck(
    checks,
    "classifier_imported_not_copied",
    importsClassifier && !definesClassifier,
    `imports=${importsClassifier} defines_local_copy=${definesClassifier}`
  );

  // ★ HARDCODED representatives, deliberately — one per lane the policy declares. Deriving them
  // from `policy.lanes` would assert the classifier against the same file it already reads, which
  // is the tautology this suite exists to avoid. These are an INDEPENDENT statement of what each
  // lane is for, so a lane added to the policy but never wired into classifyFile (a silent no-op,
  // #547's shape) shows up here as RED rather than as a comforting green.
  const laneProbes = {
    product: "src/pages/Practice.tsx",
    trackedTooling: "scripts/scopeGuard.mjs",
    generatedEvidence: ".project_memory/ops/out/x.json",
    localOnly: "tools/.local_ops/x.txt",
    apiServer: "artifacts/api-server/src/index.ts",
    docs: "handoff/CURRENT_STATE.md",
    firestore: "firestore.rules",
    repoRoot: "vercel.json",
  };
  const laneProbeFailures = Object.entries(laneProbes).filter(
    ([lane, probe]) => classifyFile(probe, lanes) !== lane
  );
  addCheck(
    checks,
    "classifier_covers_every_policy_lane",
    laneProbeFailures.length === 0,
    laneProbeFailures.length
      ? laneProbeFailures
          .map(([lane, probe]) => `${probe} expected=${lane} got=${classifyFile(probe, lanes)}`)
          .join("; ")
      : `${Object.keys(laneProbes).length} lanes probed`
  );

  const buckets = {
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
  for (const file of trackedFiles) {
    const lane = classifyFile(toPolicyFrame(file, anchorPrefix), lanes);
    if (!buckets[lane]) {
      throw new Error(
        `repo_boundary_acceptance: classifyFile returned lane "${lane}" with no bucket here. ` +
          "Adding a lane is a THREE-part change — policy JSON, classifyFile, and this bucket map."
      );
    }
    buckets[lane].push(file);
  }

  const forbiddenTracked = [...buckets.generatedEvidence, ...buckets.localOnly];
  addCheck(
    checks,
    "no_forbidden_tracked_files",
    forbiddenTracked.length === 0,
    forbiddenTracked.slice(0, 20).join(",")
  );

  addCheck(
    checks,
    "all_tracked_files_classified",
    buckets.unknown.length === 0,
    buckets.unknown.slice(0, 20).join(",")
  );

  const failed = checks.filter((c) => !c.ok);
  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      total: checks.length,
      passed: checks.length - failed.length,
      failed: failed.length,
    },
    subject: {
      gitRoot,
      anchor: anchorPrefix || "(git root)",
      tracked: trackedFiles.length,
      outsideAnchor: trackedFiles.length - anchorFrameFiles.length,
      anchorFrameWouldMiss: missedByAnchorFrame.length,
    },
    metrics: Object.fromEntries(
      Object.entries(buckets).map(([lane, files]) => [lane, files.length])
    ),
    checks,
  };

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(report, null, 2), "utf8");

  // ★ NAME THE SUBJECT, NOT JUST THE VERDICT — on PASS and on FAIL alike. A verdict with no subject
  // cannot be told apart from a verdict over nothing; that is precisely how this file audited one
  // of thirteen trees for four PRs and nobody noticed.
  console.log(
    `REPO_BOUNDARY_SUBJECT: root=${gitRoot} anchor=${anchorPrefix || "(git root)"} ` +
      `tracked=${trackedFiles.length} outside_anchor=${missedByAnchorFrame.length}`
  );
  console.log(
    `REPO_BOUNDARY_LANES: ${Object.entries(report.metrics)
      .map(([lane, n]) => `${lane}=${n}`)
      .join(" ")}`
  );

  if (failed.length) {
    console.error(`Repo boundary acceptance FAILED (${failed.length}/${checks.length}).`);
    failed.forEach((item) => {
      console.error(`- ${item.name}: ${item.details}`);
    });
    console.error(`Report: ${normalizePath(path.relative(repoRoot, outPath))}`);
    process.exitCode = 1;
    return;
  }

  console.log(`Repo boundary acceptance PASSED (${checks.length}/${checks.length}).`);
  console.log(`Report: ${normalizePath(path.relative(repoRoot, outPath))}`);
}

run().catch(async (err) => {
  const report = {
    generatedAt: new Date().toISOString(),
    error: String(err?.stack || err?.message || err),
  };
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(report, null, 2), "utf8");
  console.error("Repo boundary acceptance errored.");
  console.error(String(err?.stack || err));
  console.error(`Report: ${normalizePath(path.relative(repoRoot, outPath))}`);
  process.exitCode = 1;
});
