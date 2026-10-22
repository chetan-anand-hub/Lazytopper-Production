#!/usr/bin/env node
/**
 * CI-SPEED-1 acceptance (owner spec CI-SPEED-1). Pins:
 *   (a) the Vercel Ignored Build Step - docs-only production merges skip, anything that ships builds,
 *       replayed over REAL trunk commits (needs full history: quality-gate.yml checks out depth 0);
 *   (b) the date-sensitive manifest - static guard + the runtime recorder's call-site filter;
 *   (c) the aggregate behind the REQUIRED `quality-gate` check - fails closed on any failed,
 *       skipped or cancelled job and on shards that do not cover every test file;
 *   (d) the workflow wiring - shards, the clock-changed job (CI-CLOCK-CUT), nightly full run, concurrency;
 *   (e) search-ping's deploy-inert skip (searchping_inert_skip.mjs) - skips ONLY when what www
 *       serves is an ancestor and the whole range is deploy-inert by verdictForFiles; every other
 *       case (code in range, not an ancestor, unreadable live, git error) waits;
 *   (f) RAILWAY-BUILD-GATE - the `railway-build` job runs the ROOT build exactly as the Railway
 *       image does (Node 24, frozen install WITH devDependencies, the SAME `pnpm run <script>` as
 *       the Dockerfile's RUN line - `build:backend` since RAILWAY-SLIM-1), that script keeps every
 *       deploy-blocking guard, build-ops still builds the website, and the aggregate judges it.
 *
 * Run by quality-gate.yml (build-ops job).   node scripts/ops/ci_speed_acceptance.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { decide, isDeployInertPath, listChangedPaths, verdictForFiles } from "./vercel_ignore_build.mjs";
import { CONFIRM_READS, SETTLE_READS, SKIP_LINE, classifyLiveRead, decideInertSkip } from "./searchping_inert_skip.mjs";
import { guard, dateSignalsIn, enumerateVitestFiles, readList, scan } from "../testClock/dateSensitive.mjs";
import { orderSlowestFirst, planShards, readDurations, substringCollisions } from "./ci_shard_plan.mjs";
import { isRepoFrame } from "../testClock/clockRecorderFrames.mjs";
import { CLOCK_ZERO_LINE, DOCS_PATH_JOBS, FULL_BAR_JOBS, evaluate, summariseVitestJson } from "./ci_aggregate.mjs";
import { ZERO_LINE, resolveBaseSpec, selectClockChanged } from "./ci_clock_changed.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ANCHOR = path.resolve(HERE, "..", "..");
const REPO_ROOT = path.resolve(ANCHOR, "..");
const WORKFLOW = path.join(REPO_ROOT, ".github", "workflows", "quality-gate.yml");
const LANE_OVERLAP = path.join(REPO_ROOT, ".github", "workflows", "lane-overlap.yml");
const GOLDEN_EVAL = path.join(REPO_ROOT, ".github", "workflows", "golden-eval.yml");
const VERCEL_JSON =path.join(REPO_ROOT, "vercel.json");
const DOCKERFILE = path.join(REPO_ROOT, "Dockerfile");
const ROOT_PACKAGE_JSON = path.join(REPO_ROOT, "package.json");

const checks = [];
const check = (name, ok, detail = "") => checks.push({ name, ok: Boolean(ok), detail });
const git = (args) => execFileSync("git", args, { cwd: REPO_ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
// CRLF-normalised: a Windows checkout (core.autocrlf) must assert the same text CI's linux checkout sees.
const read = (p) => { try { return fs.readFileSync(p, "utf8").replace(/\r\n/g, "\n"); } catch { return ""; } };

// ---- (a) Vercel Ignored Build Step ------------------------------------------------------------

{
  const vj = JSON.parse(read(VERCEL_JSON) || "{}");
  check("v1_vercel_json_wires_the_ignore_command",
    vj.ignoreCommand === "node lazytopper/scripts/ops/vercel_ignore_build.mjs" &&
      fs.existsSync(path.join(ANCHOR, "scripts", "ops", "vercel_ignore_build.mjs")),
    `ignoreCommand=${JSON.stringify(vj.ignoreCommand)}`);
}

// Synthetic single-path table: every category the build can read must BUILD.
const PATHS = [
  ["handoff/CURRENT_STATE.md", true],
  ["handoff/SESSION_LOG.md", true],
  ["ops/AGENT_STANDING_RULES.md", true],
  ["ops/arcs/CONTROLLER_WAVE_CLOSEOUT.md", true],
  ["CLAUDE.md", true],
  ["docs/SEO_DECISIONS.md", true],
  ["notes/NoteSpec_Schema.md", true],
  ["lazytopper/README.md", true],
  ["handoff/curation/conceptFigureCatalogue.curated.ts", false],
  ["ops/tool.mjs", false],
  ["lazytopper/src/data/bsre/notes.md", false],
  ["lazytopper/public/llms.md", false],
  ["lazytopper/prerendered/__desktop/index.md", false],
  ["notes/specs/trigonometry.json", false],
  ["notes/assets/fig.svg", false],
  ["middleware.ts", false],
  ["vercel.json", false],
  ["pnpm-lock.yaml", false],
  [".github/workflows/quality-gate.yml", false],
  ["lazytopper/src/pages/Home.tsx", false],
];
{
  const wrong = PATHS.filter(([p, inert]) => isDeployInertPath(p) !== inert);
  check("v2_path_table_docs_inert_and_shipping_paths_build",
    wrong.length === 0, wrong.length ? `wrong: ${wrong.map(([p]) => p).join(", ")}` : `${PATHS.length} paths`);
  check("v3_empty_or_unresolved_list_builds",
    !verdictForFiles([]).skip && !verdictForFiles(null).skip &&
      !verdictForFiles(["handoff/NEXT_ACTION.md", "lazytopper/src/App.tsx"]).skip &&
      verdictForFiles(["handoff/NEXT_ACTION.md", "CLAUDE.md"]).skip);
}

// Real trunk commits (squash merges): expected verdict for the merge's own diff.
export const REAL_COMMITS = [
  ["b52d46c5", "skip", "docs(handoff) QUICK-FIXES-1"],
  ["297cc0f4", "skip", "docs(handoff) wave A-16"],
  ["7d011734", "skip", "docs(handoff) wave B-16"],
  ["baa034f1", "skip", "docs(handoff) wave A-15"],
  ["64ee11c7", "skip", "docs(handoff) wave B-15"],
  ["53fe4d22", "skip", "docs(handoff) wave B-14"],
  ["1e489130", "build", "feat(grading) J1 - lazytopper/server"],
  ["dfb83379", "build", "feat(progress) - src + firestore-rules-tests"],
  ["613d8996", "build", "feat(notes) - prerendered + public + notes/specs + notes/assets"],
  ["965d1025", "build", "feat(seo) - middleware.ts + prerendered"],
  ["532d3635", "build", "test(grader) - .github/workflows + server"],
  ["53065a54", "build", "dependabot npm bump - package.json + lockfile"],
  ["c056ebdb", "build", "dependabot actions/checkout bump - .github/workflows only"],
];
{
  let hasHistory = true;
  try { git(["cat-file", "-e", "b52d46c5^{commit}"]); } catch { hasHistory = false; }
  if (!hasHistory) {
    check("v4_real_trunk_commit_table", false, "history not available - this suite needs full history (fetch-depth: 0)");
  } else {
    const rows = REAL_COMMITS.map(([sha, expected, label]) => {
      const r = decide({ VERCEL_ENV: "production", VERCEL_GIT_PREVIOUS_SHA: git(["rev-parse", `${sha}^`]).trim() },
        { cwd: REPO_ROOT, head: sha });
      return { sha, expected, got: r.skip ? "skip" : "build", label, n: (r.files || []).length };
    });
    const bad = rows.filter((r) => r.got !== r.expected);
    for (const r of rows) console.log(`  ${r.sha} ${r.got.padEnd(5)} (expected ${r.expected}, ${r.n} files) ${r.label}`);
    check("v4_real_trunk_commit_table", bad.length === 0,
      bad.length ? `MISMATCH: ${bad.map((r) => `${r.sha} got ${r.got}`).join(", ")}` : `${rows.length} real commits replayed`);
    // A range: a failed product build followed by a docs merge must still BUILD (PREVIOUS_SHA, not HEAD^).
    const span = decide({ VERCEL_ENV: "production", VERCEL_GIT_PREVIOUS_SHA: git(["rev-parse", "613d8996^"]).trim() },
      { cwd: REPO_ROOT, head: "b52d46c5" });
    check("v5_range_since_last_successful_deploy_builds_when_it_holds_product", !span.skip,
      `613d8996^..b52d46c5: ${span.reason}`);
  }
}
{
  const anySha = git(["rev-parse", "HEAD"]).trim();
  // ★ On a range that WOULD skip in production (a pure docs merge) - an empty range would build
  //   anyway and make this check pass for the wrong reason (mutation M3 caught exactly that).
  let docsPrev = "";
  try { docsPrev = git(["rev-parse", "b52d46c5^"]).trim(); } catch { /* no history: v4 already fails */ }
  const opts = { cwd: REPO_ROOT, head: "b52d46c5" };
  const prod = docsPrev ? decide({ VERCEL_ENV: "production", VERCEL_GIT_PREVIOUS_SHA: docsPrev }, opts) : { skip: false };
  const preview = decide({ VERCEL_ENV: "preview", VERCEL_GIT_PREVIOUS_SHA: docsPrev }, opts);
  const unset = decide({ VERCEL_GIT_PREVIOUS_SHA: docsPrev }, opts);
  check("v6_previews_and_unknown_env_always_build", prod.skip && !preview.skip && !unset.skip,
    `same docs-only range: production=${prod.skip ? "skip" : "build"} preview=${preview.skip ? "skip" : "build"} unset=${unset.skip ? "skip" : "build"}`);
  const noPrev = decide({ VERCEL_ENV: "production" }, { cwd: REPO_ROOT });
  const badPrev = decide({ VERCEL_ENV: "production", VERCEL_GIT_PREVIOUS_SHA: "0123456789abcdef0123456789abcdef01234567" }, { cwd: REPO_ROOT });
  const sameSha = decide({ VERCEL_ENV: "production", VERCEL_GIT_PREVIOUS_SHA: anySha }, { cwd: REPO_ROOT, head: anySha });
  check("v7_missing_unresolvable_or_empty_range_builds", !noPrev.skip && !badPrev.skip && !sameSha.skip,
    `no-prev: ${noPrev.reason} | bad-prev: ${badPrev.reason} | same-sha: ${sameSha.reason}`);
}

// ---- (b) date-sensitive manifest + guards -----------------------------------------------------

{
  const s = scan();
  const list = readList();
  const g = guard(s, list);
  check("c1_static_guard_passes_on_the_committed_manifest", g.ok,
    g.ok ? `${list.vitest.length}/${s.totals.vitest} vitest files in the manifest (${Object.keys(list.manual.vitest || {}).length} from the runtime recorder/manual)`
         : `unlisted: ${g.missing.map((m) => m.id).join(", ")} stale: ${g.stale.map((m) => m.id).join(", ")}`);
  // Synthetic: one more statically date-dependent file the manifest does not name -> RED.
  const planted = { ...s, vitest: [...s.vitest, { file: "src/__planted__/clock.test.ts", signals: ["reads-now"] }],
    vitestAll: [...s.vitestAll, "src/__planted__/clock.test.ts"] };
  const gp = guard(planted, list);
  check("c2_static_guard_fails_on_an_unlisted_date_dependent_test", !gp.ok && gp.missing.some((m) => m.id === "src/__planted__/clock.test.ts"));
  const gs = guard(s, { ...list, vitest: [...list.vitest, "src/gone.test.ts"] });
  check("c3_static_guard_fails_on_a_stale_manifest_entry", !gs.ok && gs.stale.some((m) => m.id === "src/gone.test.ts"));
  check("c4_static_signals_are_mechanical",
    dateSignalsIn("const t = Date.now();").includes("reads-now") &&
      dateSignalsIn("vi.useFakeTimers({ now })").includes("pins-clock") &&
      dateSignalsIn('const d = "2026-09-29";').includes("date-literal") &&
      dateSignalsIn("// OWNER RULING (2026-10-03)\nexpect(1).toBe(1);").length === 0 &&
      dateSignalsIn("expect(sum([1, 2])).toBe(3);").length === 0);
  check("c5_runtime_recorder_is_a_vitest_setup_file_and_filters_by_repo_call_site",
    /setupFiles:\s*\[[^\]]*"\.\/scripts\/testClock\/clockRecorder\.setup\.mjs"/.test(read(path.join(ANCHOR, "vitest.config.ts"))) &&
      isRepoFrame("at daysLeft (/home/runner/work/Lazytopper-Production/Lazytopper-Production/lazytopper/src/lib/boardDate.ts:12:9)") &&
      isRepoFrame("at C:\\Projects\\x\\lazytopper\\src\\pages\\Welcome.test.tsx:4:2") &&
      !isRepoFrame("at getCurrentTime (/home/runner/work/x/x/node_modules/.pnpm/scheduler@0.27.0/node_modules/scheduler/cjs/scheduler.development.js:40:3)") &&
      !isRepoFrame("at /home/runner/work/x/x/lazytopper/src/test/setup.ts:9:1"),
    "a read is the file's only when the IMMEDIATE caller of Date is repo source; React/jsdom/vitest reads are ignored");
}

// ---- (c) aggregate (the required `quality-gate` check) --------------------------------------
{
  const ok = { result: "success" };
  const skip = { result: "skipped" };
  // CI-SPEED-3: on the full bar docs-lane is skipped BY DESIGN (its mojibake step runs in static).
  const fullNeeds = { classify: ok, "docs-lane": skip, static: ok, "build-ops": ok, "railway-build": ok, vitest: ok, "clock-changed": ok };
  const shards = [1, 2, 3, 4].map((i) => ({ shard: `${i}/4`, files: 10, tests: 100, passed: 100, failed: 0, skipped: 0, todo: 0 }));
  const green = evaluate({ needs: fullNeeds, docsOnly: "false", shards, expectedShards: 4, filesOnDisk: 40 });
  check("g1_full_bar_all_green_passes", green.ok && green.totals.files === 40 && green.totals.tests === 400, green.problems.join("; "));
  const oneFailed = evaluate({ needs: { ...fullNeeds, vitest: { result: "failure" } }, docsOnly: "false", shards, filesOnDisk: 40 });
  const oneSkipped = evaluate({ needs: { ...fullNeeds, "clock-changed": skip }, docsOnly: "false", shards, filesOnDisk: 40 });
  const oneCancelled = evaluate({ needs: { ...fullNeeds, static: { result: "cancelled" } }, docsOnly: "false", shards, filesOnDisk: 40 });
  check("g2_a_failed_skipped_or_cancelled_upstream_job_fails_the_aggregate", !oneFailed.ok && !oneSkipped.ok && !oneCancelled.ok);
  const missingShard = evaluate({ needs: fullNeeds, docsOnly: "false", shards: shards.slice(0, 3), filesOnDisk: 30 });
  const droppedFile = evaluate({ needs: fullNeeds, docsOnly: "false", shards, filesOnDisk: 41 });
  const skippedTest = evaluate({ needs: fullNeeds, docsOnly: "false", shards: [...shards.slice(0, 3), { ...shards[3], skipped: 1 }], filesOnDisk: 40 });
  check("g3_shards_must_all_report_cover_every_file_and_skip_nothing", !missingShard.ok && !droppedFile.ok && !skippedTest.ok);
  const docsNeeds = { classify: ok, "docs-lane": ok, static: skip, "build-ops": skip, "railway-build": skip, vitest: skip, "clock-changed": skip };
  const docsGreen = evaluate({ needs: docsNeeds, docsOnly: "true" });
  const docsMojibakeRed = evaluate({ needs: { ...docsNeeds, "docs-lane": { result: "failure" } }, docsOnly: "true" });
  const fullButSkipped = evaluate({ needs: docsNeeds, docsOnly: "false", shards, filesOnDisk: 40 });
  check("g4_docs_path_skips_are_by_design_only", docsGreen.ok && !docsMojibakeRed.ok && !fullButSkipped.ok);
  const s = summariseVitestJson({ numTotalTests: 5, numPassedTests: 4, numFailedTests: 0, numPendingTests: 0, numTodoTests: 1, testResults: [{}, {}] }, "2/4");
  check("g5_shard_summary_reads_the_vitest_json_reporter", s.files === 2 && s.tests === 5 && s.todo === 1 && s.shard === "2/4");
  // ★ CI-SPEED-3: docs-lane is a DOCS-PATH job (full bar: must be skipped; a run there means classify's
  //   outputs disagree), and clock-changed may be skipped on the full bar ONLY with classify's record.
  const E = (needs, extra = {}) => evaluate({ needs, docsOnly: "false", shards, expectedShards: 4, filesOnDisk: 40, ...extra }).ok;
  const ccSkip = { ...fullNeeds, "clock-changed": skip };
  const REASON = `${CLOCK_ZERO_LINE} (recorded by classify)`;
  check("g6_docs_lane_is_docs_path_only",
    DOCS_PATH_JOBS.includes("docs-lane") && !E({ ...fullNeeds, "docs-lane": ok }) && !E({ ...fullNeeds, "docs-lane": { result: "failure" } }) &&
      !evaluate({ needs: { ...docsNeeds, "docs-lane": skip }, docsOnly: "true" }).ok,
    "full bar: docs-lane must be skipped; docs path: it must succeed");
  check("g7_clock_changed_skip_needs_classifys_recorded_reason",
    E(ccSkip, { clockCount: "0", clockSkipReason: REASON }) &&
      !E(ccSkip) && !E(ccSkip, { clockCount: "0" }) && !E(ccSkip, { clockSkipReason: REASON }) &&
      !E(ccSkip, { clockCount: "unresolved", clockSkipReason: REASON }) && !E(ccSkip, { clockCount: "3", clockSkipReason: REASON }) &&
      !E({ ...fullNeeds, "clock-changed": { result: "failure" } }, { clockCount: "0", clockSkipReason: REASON }) &&
      !E({ ...fullNeeds, "clock-changed": { result: "cancelled" } }, { clockCount: "0", clockSkipReason: REASON }),
    "a skipped clock-changed passes only with count=0 AND the recorded reason; a failure or cancel never does");
  check("k4_aggregate_zero_line_is_the_selectors_zero_line", CLOCK_ZERO_LINE === ZERO_LINE, `${CLOCK_ZERO_LINE} vs ${ZERO_LINE}`);
}

let WORKFLOW_SHARDS = 0; // set by w5 from the workflow's own matrix; w13/w14 plan that many bins

// ---- (d) workflow wiring --------------------------------------------------------------------
{
  const wf = read(WORKFLOW);
  const jobBlock = (id) => {
    const m = wf.match(new RegExp(`\\n  ${id.replace(/[.*+?^${}()|[\]\\-]/g, "\\$&")}:\\n([\\s\\S]*?)(?=\\n  [A-Za-z][\\w-]*:\\n|$)`));
    return m ? m[1] : "";
  };
  // ★ FU-CI1-NIGHTLY-RESTORE (owner mandate 2026-10-07): the nightly `schedule:` is BACK, now
  //   that the convergence gate treats every non-PR event (push, schedule, workflow_dispatch,
  //   merge_group) as N/A (its FORBIDDEN-PIN). Pins the 02:00 IST cron AND manual dispatch.
  //   (Was: schedule ABSENT, from #969 until this follow-up.)
  check("w1_nightly_schedule_and_dispatch_triggers_present",
    /\n  schedule:\n    - cron: '30 20 \* \* \*'/.test(wf) && /\n  workflow_dispatch:\s*\n/.test(wf),
    "the nightly full clock run needs BOTH the 02:00 IST cron ('30 20 * * *') and workflow_dispatch");
  check("w2_concurrency_separates_events",
    /group:\s*quality-gate-\$\{\{\s*github\.event_name\s*\}\}-\$\{\{\s*github\.ref\s*\}\}/.test(wf),
    "a nightly/dispatched run must never cancel (or be cancelled by) a trunk push run");
  // ★★ CI-CLOCK-CUT (owner ruling 2026-10-22): the six per-PR `clock (...)` legs are GONE; ONE job,
  //   clock-changed, runs at BOTH clocks only the manifest tests the change touched (selector:
  //   ci_clock_changed.mjs). The full suite + ops matrix at both clocks is nightly-full-clock (w4).
  const cc = jobBlock("clock-changed");
  const ccCode = cc.replace(/^\s*#.*$/gm, "");
  const agg = jobBlock("quality-gate");
  const aggNeeds = ((agg.match(/^ {4}needs:\s*\[([^\]]*)\]/m) || [])[1] || "").split(",").map((x) => x.trim());
  check("w3_per_pr_clock_legs_removed_and_clock_changed_runs_touched_tests_at_both_clocks",
    jobBlock("clock") === "" && !/ci_shard_plan\.mjs --source=clock/.test(wf) &&
      /^ {4}needs: classify$/m.test(cc) &&
      /^ {4}if: needs\.classify\.outputs\.docs_only != 'true' && needs\.classify\.outputs\.clock_count != '0'$/m.test(cc) &&
      /fetch-depth: 0/.test(cc) && /git fetch --no-tags origin "\+refs\/heads\/\$\{\{ github\.base_ref \}\}/.test(cc) &&
      /set -euo pipefail\n\s+node lazytopper\/scripts\/ops\/ci_clock_changed\.mjs --select > /.test(ccCode) &&
      !/ci_clock_changed\.mjs --select[^\n]*\|\|/.test(ccCode) &&
      /EVENT_BEFORE: \$\{\{ github\.event\.before \}\}/.test(cc) &&
      /MERGE_GROUP_BASE_SHA: \$\{\{ github\.event\.merge_group\.base_sha \}\}/.test(cc) &&
      /for AT in '2030-06-15T06:30:00\.000Z' '2030-02-14T18:45:00\.000Z'; do/.test(ccCode) &&
      /selfCheck\.mjs/.test(ccCode) && /pnpm --filter lazytopper exec vitest run \$FILES/.test(ccCode) &&
      /exit "\$rc"/.test(ccCode) &&
      FULL_BAR_JOBS.includes("clock-changed") && !FULL_BAR_JOBS.includes("clock") &&
      aggNeeds.includes("clock-changed") && !aggNeeds.includes("clock") &&
      /0 date-sensitive tests changed/.test(cc) && /nightly-full-clock covers/.test(cc),
    "no `clock` job; clock-changed: full-bar gated, base fetched, selector fail-closed (no ||), both clocks, self-check, judged by the aggregate");
  // ★ CI-SPEED-3: classify runs the SAME selector; only the literal count 0 skips clock-changed, and only
  //   then is the reason recorded and handed to the aggregate. A selector failure -> "unresolved" -> runs.
  {
    const cl = jobBlock("classify");
    const clCode = cl.replace(/^\s*#.*$/gm, "");
    check("w19_classify_records_the_clock_selection_and_only_zero_skips",
      /clock_count: \$\{\{ steps\.clock\.outputs\.clock_count \}\}/.test(cl) &&
        /clock_skip_reason: \$\{\{ steps\.clock\.outputs\.clock_skip_reason \}\}/.test(cl) &&
        /id: clock\n/.test(cl) && /if node lazytopper\/scripts\/ops\/ci_clock_changed\.mjs --select > /.test(clCode) &&
        /n="unresolved"/.test(clCode) && /if \[ "\$n" = "0" \]; then\n\s+echo "clock_skip_reason=CLOCK_CHANGED: 0 date-sensitive tests changed/.test(clCode) &&
        /EVENT_BEFORE: \$\{\{ github\.event\.before \}\}/.test(cl) && /MERGE_GROUP_BASE_SHA: \$\{\{ github\.event\.merge_group\.base_sha \}\}/.test(cl) &&
        /CLOCK_COUNT: \$\{\{ needs\.classify\.outputs\.clock_count \}\}/.test(agg) &&
        /CLOCK_SKIP_REASON: \$\{\{ needs\.classify\.outputs\.clock_skip_reason \}\}/.test(agg),
      "classify computes the selection, records count + reason; only '0' skips; the aggregate receives both");
  }
  // The selector, pure. A change to a manifest test selects it; a test ADDED to the manifest
  // selects it; a non-manifest or deleted test does not; nothing relevant selects NOTHING.
  {
    const manifest = ["src/a.test.ts", "src/b.test.tsx", "src/gone.test.ts"];
    const existing = ["src/a.test.ts", "src/b.test.tsx", "src/c.test.ts", "src/new.test.ts"];
    const sel = (changedFiles, manifestHead = manifest, manifestBase = manifest) =>
      selectClockChanged({ changedFiles, manifestHead, manifestBase, existing }).files;
    const one = sel(["lazytopper/src/a.test.ts", "lazytopper/src/c.test.ts", "handoff/X.md"]);
    const added = sel(["lazytopper/scripts/testClock/date-sensitive-tests.json"], [...manifest, "src/new.test.ts"]);
    const none = sel(["lazytopper/src/pages/Home.tsx", "lazytopper/src/c.test.ts", ".github/workflows/quality-gate.yml"]);
    const deleted = sel(["lazytopper/src/gone.test.ts"]);
    check("k1_selector_picks_changed_and_newly_listed_manifest_tests_only",
      JSON.stringify(one) === JSON.stringify(["src/a.test.ts"]) &&
        JSON.stringify(added) === JSON.stringify(["src/new.test.ts"]) &&
        none.length === 0 && deleted.length === 0 && ZERO_LINE === "CLOCK_CHANGED: 0 date-sensitive tests changed",
      `changed=[${one}] added=[${added}] none=[${none}] deleted=[${deleted}]`);
  }
  {
    const pr = resolveBaseSpec({ EVENT_NAME: "pull_request", BASE_REF: "base/approved-thru-437" });
    const prNoBase = resolveBaseSpec({ EVENT_NAME: "pull_request", BASE_REF: "" });
    const push = resolveBaseSpec({ EVENT_NAME: "push", EVENT_BEFORE: "a".repeat(40) });
    const pushZero = resolveBaseSpec({ EVENT_NAME: "push", EVENT_BEFORE: "0".repeat(40) });
    const pushNone = resolveBaseSpec({ EVENT_NAME: "push" });
    const mg = resolveBaseSpec({ EVENT_NAME: "merge_group", MERGE_GROUP_BASE_SHA: "b".repeat(40) });
    const mgNone = resolveBaseSpec({ EVENT_NAME: "merge_group" });
    const disp = resolveBaseSpec({ EVENT_NAME: "workflow_dispatch" });
    const sched = resolveBaseSpec({ EVENT_NAME: "schedule" });
    const unknown = resolveBaseSpec({ EVENT_NAME: "" });
    check("k2_a_missing_base_fails_never_skips",
      pr.mode === "diff" && pr.baseRef === "base/approved-thru-437" && push.mode === "diff" && mg.mode === "diff" &&
        prNoBase.mode === "fail" && pushZero.mode === "fail" && pushNone.mode === "fail" && mgNone.mode === "fail" &&
        unknown.mode === "fail" && disp.mode === "na" && /nightly-full-clock/.test(disp.reason) &&
        sched.mode === "na" && /nightly-full-clock/.test(sched.reason),
      "PR without BASE_REF, push without/zero before, merge group without base_sha, unknown event: FAIL; dispatch and schedule: N/A (nightly-full-clock runs in the same run)");
  }
  {
    // Live: the selector against THIS checkout. On CI's PR run it measures the real PR; locally
    // (no EVENT_NAME) it must FAIL closed — the fail-closed half proven on the real script.
    const r = (() => {
      try {
        return { code: 0, out: execFileSync(process.execPath, [path.join(HERE, "ci_clock_changed.mjs"), "--select"],
          { cwd: REPO_ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, EVENT_NAME: "", GITHUB_EVENT_NAME: "" } }) };
      } catch (e) { return { code: e.status, out: String(e.stderr || "") }; }
    })();
    check("k3_real_selector_exits_1_without_an_event_base", r.code === 1 && /CLOCK_CHANGED_FAIL/.test(r.out), `exit=${r.code}`);
  }
  const nightly = jobBlock("nightly-full-clock");
  check("w4_nightly_job_runs_the_full_suites_under_both_clocks_and_opens_an_issue",
    /if: github\.event_name == 'schedule' \|\| github\.event_name == 'workflow_dispatch'/.test(nightly) &&
      // The WHOLE suite: no --shard, no file filter — only the reporters D7's coverage step reads.
      /pnpm --filter lazytopper exec vitest run --reporter=default --reporter=json --outputFile="\$RUNNER_TEMP\/vitest-nightly\.json"\n/.test(nightly) &&
      /pnpm --filter lazytopper run test:matrix:all/.test(nightly) &&
      /issues: write/.test(nightly) && /gh issue create/.test(nightly) &&
      /2030-06-15T06:30:00\.000Z/.test(nightly) && /2030-02-14T18:45:00\.000Z/.test(nightly) &&
      !/issues: write/.test(wf.replace(nightly, "")));
  // ★ D7 — the nightly's unsharded run must collect EVERY test file on disk, counted by ci_aggregate's
  //   own functions (the PR shards' rule), and the step must run even after a failed suite step.
  check("w11_nightly_asserts_files_equal_files_on_disk",
    /- name: Every test file on disk ran \(files = files on disk\)\n\s*if: \$\{\{ !cancelled\(\) \}\}\n/.test(nightly) &&
      /VITEST_JSON: \$\{\{ runner\.temp \}\}\/vitest-nightly\.json/.test(nightly) &&
      /import \{ countTestFilesOnDisk, summariseVitestJson \} from "\.\/lazytopper\/scripts\/ops\/ci_aggregate\.mjs"/.test(nightly) &&
      /s\.files === onDisk/.test(nightly) && /if \(!ok\) process\.exit\(1\)/.test(nightly),
    "a nightly that silently drops a test file must fail — the files-on-disk assertion is missing or weakened");
  // The issue-on-failure step stays SCHEDULE-only: a hand-run dispatch reports in its own run page.
  check("w7_issue_on_failure_is_schedule_only",
    /- name: Open an issue \(scheduled run failed\)\n\s*if: failure\(\) && github\.event_name == 'schedule'\n/.test(nightly));
  // ★ D3 — READY FOR A FUTURE MERGE QUEUE. Both REQUIRED checks (`quality-gate`, `lane-overlap`)
  //   must report on merge_group, or a queue waits forever on "expected — waiting for status".
  const lo = read(LANE_OVERLAP);
  const mergeGroupTrigger = /\n  merge_group:\n    types: \[checks_requested\]\n    branches: \[base\/approved-thru-437\]\n/;
  check("w8_merge_group_trigger_in_both_required_workflows",
    mergeGroupTrigger.test(wf) && mergeGroupTrigger.test(lo),
    "quality-gate.yml and lane-overlap.yml both need `merge_group: types: [checks_requested]` on the trunk");
  check("w9_lane_overlap_job_name_unchanged",
    /\njobs:\n  lane-overlap:\n/.test(lo) && !/\n    name:/.test(lo),
    "`lane-overlap` is a REQUIRED check: the job id must stay exactly lane-overlap, with no display-name override");
  // The pass-through runs on merge_group ONLY; every real step runs on pull_request ONLY. Step by step.
  const loSteps = lo.split(/\n      - name: /).slice(1);
  const isPassThrough = (st) => /LANE_OVERLAP: N\/A on merge_group/.test(st);
  const passThrough = loSteps.filter(isPassThrough);
  const realSteps = loSteps.filter((st) => !isPassThrough(st));
  check("w10_lane_overlap_pass_through_gated_on_merge_group_only",
    passThrough.length === 1 && /\n        if: github\.event_name == 'merge_group'\n/.test(passThrough[0]) &&
      !/\n        if:[^\n]*pull_request/.test(passThrough[0]) &&
      realSteps.length > 0 && realSteps.every((st) => /\n        if: github\.event_name == 'pull_request'\n/.test(st)) &&
      realSteps.some((st) => /node scripts\/ops\/lane_overlap\.mjs/.test(st)),
    `pass-through steps=${passThrough.length}; the pass-through must be gated on merge_group only, every real step on pull_request`);
  // ★ CI-2 (owner ruling 2026-10-18): drafts never block lane-overlap, so marking a draft READY must
  //   re-run it — `ready_for_review` is a lane-overlap trigger. It stays OUT of quality-gate.yml (a
  //   ready flip changes no code, so re-paying ~47 billable minutes would buy nothing).
  const prTypes = (text) => ((text.match(/\n  pull_request:\n(?:[ \t]*#[^\n]*\n)*    types: \[([^\]]*)\]/) || [])[1] || "")
    .split(",").map((x) => x.trim()).filter(Boolean);
  const loTypes = prTypes(lo);
  check("w12_lane_overlap_reruns_on_ready_for_review_quality_gate_does_not",
    ["opened", "synchronize", "reopened", "ready_for_review"].every((t) => loTypes.includes(t)) &&
      !/ready_for_review/.test(wf.replace(/^\s*#.*$/gm, "")) &&
      /PR_IS_DRAFT: \$\{\{ github\.event\.pull_request\.draft \}\}/.test(lo),
    `lane-overlap pull_request types=[${loTypes.join(", ")}]; quality-gate must not list ready_for_review; PR_IS_DRAFT must be passed`);
  const vitest = jobBlock("vitest");
  // ★ CI-SPEED-2: N duration-planned shards; N must agree in the matrix, the planner call, the
  //   shard-summary label and EXPECTED_SHARDS, or the aggregate would judge the wrong set.
  {
    const listed = ((vitest.match(/\n        shard: \[([^\]]*)\]/) || [])[1] || "").split(",").map((x) => Number(x.trim())).filter(Boolean);
    const n = listed.length;
    const seq = listed.every((v, i) => v === i + 1);
    // CI-SPEED-3 (2026-10-22): n >= 3 (was >= 4) — at 4 workers 3 shards carry the suite; the
    //   coverage rule (files run == files on disk) is the aggregate's, unchanged.
    check("w5_default_vitest_runs_every_file_once_via_planned_shards",
      n >= 3 && seq &&
        vitest.includes(`ci_shard_plan.mjs --source=all --shards=${n} --index=\${{ matrix.shard }}`) &&
        /pnpm --filter lazytopper exec vitest run \$FILES (?:--maxWorkers=\d+ )?--reporter=default --reporter=json/.test(vitest) &&
        vitest.includes(`--shard=\${{ matrix.shard }}/${n}`) && vitest.includes(`name: vitest (\${{ matrix.shard }}/${n})`) &&
        !/--exclude/.test(vitest) && new RegExp(`EXPECTED_SHARDS: '${n}'`).test(wf),
      `shards=${n}: matrix, planner, summary label and EXPECTED_SHARDS agree; the aggregate checks the shards cover every file`);
    WORKFLOW_SHARDS = n;
  }
  // ★ CI-SPEED-3: WORKERS AND HEAP ARE ONE DECISION (vitest.config.ts). The CI vitest step sets the
  //   worker count on the command line; workers x per-worker heap must stay <= 12288 MB (the 12 GB
  //   worst case the config comment allows on the 16 GB runner) and workers <= the runner's 4 vCPUs.
  {
    const code = vitest.replace(/^\s*#.*$/gm, "");
    const workers = Number((code.match(/vitest run \$FILES --maxWorkers=(\d+) /) || [])[1] || 0);
    const heap = Number((code.match(/NODE_OPTIONS: --max-old-space-size=(\d+)/) || [])[1] || 0);
    check("w17_ci_vitest_workers_times_heap_fit_the_runner",
      workers >= 1 && workers <= 4 && heap > 0 && workers * heap <= 12288,
      `--maxWorkers=${workers} x --max-old-space-size=${heap} = ${workers * heap} MB (limit 12288, <= 4 workers)`);
  }
  const buildOps = jobBlock("build-ops");
  // ★ CI-SPEED-3: golden-eval.yml no longer runs on pull_request — ONLY because the ops matrix that the
  //   required quality-gate runs (build-ops) carries the same three suites. Drop either and this fails.
  {
    const ge = read(GOLDEN_EVAL);
    const pkg = JSON.parse(read(path.join(ANCHOR, "package.json"))).scripts || {};
    const chain = String(pkg["test:matrix:all"] || "");
    const prTrigger = /^\s{2}pull_request:/m.test(ge.replace(/^\s*#.*$/gm, ""));
    const covered = /npm run test:server:golden-eval\b/.test(chain) && /npm run test:server:eval-parity\b/.test(chain) &&
      /server\/eval\/golden\/golden\.test\.cjs/.test(pkg["test:server:golden-eval"] || "") &&
      /server\/eval\/golden\/shapes\.test\.cjs/.test(pkg["test:server:golden-eval"] || "") &&
      /server\/eval\/graderEval\.parity\.test\.cjs/.test(pkg["test:server:eval-parity"] || "") &&
      /pnpm --filter lazytopper run test:matrix:all/.test(jobBlock("build-ops"));
    check("w18_golden_suites_run_on_every_pr_inside_the_required_gate",
      prTrigger || covered,
      `golden-eval.yml pull_request trigger=${prTrigger}; ops matrix runs golden + shapes + parity=${covered}`);
  }
  check("w6_static_guard_and_this_suite_run_on_the_full_bar",
    /dateSensitive\.mjs --guard/.test(buildOps) && /ci_speed_acceptance\.mjs/.test(buildOps) &&
      /if: needs\.classify\.outputs\.docs_only != 'true'/.test(buildOps));
}

// ---- (g) CI-SPEED-2 — the duration-balanced shard planner ----------------------------------------
// Balance is best-effort; COVERAGE is not. Every source file in exactly one bin, on the REAL file
// lists, with the REAL durations table — and the planner refuses the two shapes that would make a
// shard run the wrong files (an empty bin runs everything; a substring path selects a second file).
{
  const all = enumerateVitestFiles();
  const manifest = readList().vitest;
  const durations = readDurations();
  const exactCover = (files, bins) => {
    const seen = bins.flatMap((b) => b.files);
    return seen.length === new Set(files).size && new Set(seen).size === seen.length && files.every((f) => seen.includes(f));
  };
  const N = WORKFLOW_SHARDS || 5; // the shard count the workflow actually runs (w5 reads it)
  const allBins = planShards(all, durations, N);
  const clockBins = planShards(manifest, durations, 2);
  check("w13_planner_puts_every_file_in_exactly_one_shard",
    exactCover(all, allBins) && exactCover(manifest, clockBins) &&
      JSON.stringify(planShards(all, durations, N)) === JSON.stringify(allBins),
    `all: ${all.length} files -> [${allBins.map((b) => b.files.length).join(", ")}]; clock: ${manifest.length} -> [${clockBins.map((b) => b.files.length).join(", ")}]; deterministic`);
  // Balance: on the real table, no bin exceeds the lightest by more than the single slowest file.
  const slowest = Math.max(...all.map((f) => durations[f] || 0));
  const spread = (bins) => Math.max(...bins.map((b) => b.seconds)) - Math.min(...bins.map((b) => b.seconds));
  check("w14_planned_shards_are_balanced_by_duration",
    Object.keys(durations).length > 0 && spread(allBins) <= slowest + 1e-9 && spread(clockBins) <= slowest + 1e-9,
    `table=${Object.keys(durations).length} files; vitest bins s=[${allBins.map((b) => Math.round(b.seconds)).join(", ")}]; clock bins s=[${clockBins.map((b) => Math.round(b.seconds)).join(", ")}]; slowest file ${slowest}s`);
  let emptyRefused = false;
  try { planShards(["src/a.test.ts"], {}, 2); } catch { emptyRefused = true; }
  check("w15_planner_refuses_empty_shards_and_substring_collisions",
    emptyRefused &&
      substringCollisions(["src/a.test.ts"], ["src/a.test.ts", "src/a.test.tsx"]).length === 1 &&
      substringCollisions(all, all).length === 0,
    "an empty bin would run the WHOLE suite; a substring path would select a second file — both refused");
  // A stale table (unknown file, deleted file) changes balance only, never coverage.
  const stale = planShards([...all.slice(0, 20), "src/__new__.test.ts"], { ...durations, "src/__deleted__.test.ts": 999 }, 3);
  // ★ CI-SPEED-3: inside a shard the slowest files start first (CI only). ORDER ONLY: the sequencer
  //   must return exactly the files it was given, slowest first, and vitest.config.ts may wire it only
  //   behind CI === "true" (local runs keep vitest's order).
  {
    const sample = [...all.slice(0, 30), "src/__unknown__.test.ts"];
    const ordered = orderSlowestFirst(sample, durations);
    const cost = (f) => durations[f] ?? -1;
    const known = ordered.filter((f) => durations[f] > 0); // 0 / unknown take the median, like the planner
    const cfg = read(path.join(ANCHOR, "vitest.config.ts"));
    check("w20_ci_sequencer_reorders_never_adds_or_drops",
      ordered.length === sample.length && new Set(ordered).size === sample.length && sample.every((f) => ordered.includes(f)) &&
        known.every((f, i) => i === 0 || cost(known[i - 1]) >= cost(f)) &&
        JSON.stringify(orderSlowestFirst(sample.slice().reverse(), durations)) === JSON.stringify(ordered) &&
        /import \{ SlowestFirstSequencer \} from "\.\/scripts\/ops\/ci_vitest_sequencer\.mjs"/.test(cfg) &&
        /process\.env\.CI === "true" \? \{ sequence: \{ sequencer: SlowestFirstSequencer \} \} : \{\}/.test(cfg) &&
        /return ordered\.map\(/.test(read(path.join(HERE, "ci_vitest_sequencer.mjs"))),
      `${sample.length} files in, ${ordered.length} out, slowest first, deterministic; wired behind CI only`);
  }
  check("w16_a_stale_durations_table_never_drops_or_adds_a_file",
    exactCover([...all.slice(0, 20), "src/__new__.test.ts"], stale) && !stale.some((b) => b.files.includes("src/__deleted__.test.ts")));
}

// ---- (f) RAILWAY-BUILD-GATE (owner order 2026-10-07) ------------------------------------------
// #985 merged green and then failed every Railway backend build: the root `pnpm run build` runs
// validateQuestionBanks, which no PR job ran. The `railway-build` job mirrors the Dockerfile.
// Each pin is a pure function of the workflow text and runs on the REAL file AND on a MUTATED
// copy that must fail it: a pin that cannot fail is not a pin.
// RAILWAY-SLIM-1 (2026-10-22): the image runs the root `build:backend` script, NOT `build` - the
// lazytopper website build is unused by the backend image. The pins now read the Dockerfile and the
// root package.json too: CI must run the SAME `pnpm run <script>` as the Dockerfile's RUN line, that
// script must still carry every deploy-blocking guard, and build-ops must still build the website.
const BACKEND_GUARDS = Object.freeze([
  "pnpm run typecheck",
  "pnpm --filter @workspace/scripts run syllabusGuard",
  "pnpm --filter @workspace/scripts run validateQuestionBanks",
  "pnpm --filter @workspace/api-server run build",
]);
function railwayBuildPins(wfText, dockerText, pkgText) {
  const blockOf = (id) => {
    const m = wfText.match(new RegExp(`\\n  ${id}:\\n([\\s\\S]*?)(?=\\n  [A-Za-z][\\w-]*:\\n|$)`));
    return m ? m[1] : "";
  };
  const rb = blockOf("railway-build");
  const code = rb.replace(/^\s*#.*$/gm, "");
  const lines = code.split("\n").map((l) => l.trim());
  const agg = blockOf("quality-gate");
  const needs = ((agg.match(/^ {4}needs:\s*\[([^\]]*)\]/m) || [])[1] || "").split(",").map((x) => x.trim());
  const dockerRuns = [...dockerText.matchAll(/^RUN pnpm run ([\w:-]+)[ \t]*$/gm)].map((m) => m[1]);
  const script = dockerRuns.length === 1 ? dockerRuns[0] : "";
  let scripts = {};
  try { scripts = JSON.parse(pkgText).scripts || {}; } catch { scripts = {}; }
  const steps = String(scripts[script] || "").split("&&").map((s) => s.trim()).filter(Boolean);
  const buildOps = blockOf("build-ops").replace(/^\s*#.*$/gm, "").split("\n").map((l) => l.trim());
  return {
    exists_and_full_bar: rb !== "" && /^ {4}needs: classify$/m.test(rb) &&
      /^ {4}if: needs\.classify\.outputs\.docs_only != 'true'$/m.test(rb),
    node_24: /^ {10}node-version: '24'$/m.test(code) && (code.match(/node-version:/g) || []).length === 1 &&
      /corepack prepare pnpm@10\.32\.1 --activate/.test(code),
    install_frozen_with_dev_deps: lines.includes("run: pnpm install --frozen-lockfile") &&
      !/--prod\b|--production\b|pnpm prune|NODE_ENV=production/.test(code),
    // CI runs the Dockerfile's OWN build command, unfiltered, as a root script.
    same_command_as_dockerfile: script !== "" && lines.includes(`pnpm run ${script}`) &&
      !/--filter|pnpm -r\b|--dir\b|working-directory:/.test(code),
    // That script still runs every deploy-blocking guard + the api-server bundle the image starts.
    backend_script_keeps_guards: steps.length > 0 && BACKEND_GUARDS.every((g) => steps.includes(g)),
    // The website the image no longer builds is still built on every full-bar run.
    website_build_still_in_build_ops: buildOps.includes("run: pnpm --filter lazytopper run build"),
    in_aggregate_needs: needs.includes("railway-build"),
  };
}
{
  const wf = read(WORKFLOW);
  const docker = read(DOCKERFILE);
  const pkg = read(ROOT_PACKAGE_JSON);
  const pins = railwayBuildPins(wf, docker, pkg);
  const RB = /(\n  railway-build:\n[\s\S]*?)/.source;
  const dropGuard = (text, guard) => {
    try {
      const j = JSON.parse(text);
      const s = String(j.scripts?.["build:backend"] || "");
      j.scripts["build:backend"] = s.split("&&").map((x) => x.trim()).filter((x) => x !== guard).join(" && ");
      return JSON.stringify(j, null, 2);
    } catch { return text; }
  };
  // Each mutant is { wf?, docker?, pkg? }; a pin bites only if EVERY one of its mutants fails it.
  const mutants = {
    exists_and_full_bar: [{ wf: wf.replace(/(\n  railway-build:\n    needs: classify\n)    if: [^\n]*\n/, "$1") }],
    node_24: [{ wf: wf.replace(new RegExp(`${RB}node-version: '24'`), "$1node-version: '22'") }],
    install_frozen_with_dev_deps: [{ wf: wf.replace(new RegExp(`${RB}run: pnpm install --frozen-lockfile`), "$1run: pnpm install --prod --frozen-lockfile") }],
    same_command_as_dockerfile: [
      // CI drifts back to the old root build while the image runs build:backend
      { wf: wf.replace(new RegExp(`${RB}\\n {10}pnpm run build:backend\\n`), "$1\n          pnpm run build\n") },
      // the Dockerfile changes its build command and CI is not updated
      { docker: docker.replace(/^RUN pnpm run build:backend[ \t]*$/m, "RUN pnpm run build") },
      // a filtered build in CI
      { wf: wf.replace(new RegExp(`${RB}\\n {10}pnpm run build:backend\\n`), "$1\n          pnpm --filter @workspace/api-server run build\n") },
    ],
    backend_script_keeps_guards: BACKEND_GUARDS.map((g) => ({ pkg: dropGuard(pkg, g) })),
    website_build_still_in_build_ops: [{ wf: wf.replace(/(\n  build-ops:\n[\s\S]*?)run: pnpm --filter lazytopper run build\n/, "$1run: echo skipped\n") }],
    in_aggregate_needs: [{ wf: wf.replace(/(\n  quality-gate:\n    needs: \[[^\]]*?), railway-build/, "$1") }],
  };
  for (const [k, ok] of Object.entries(pins)) {
    const ms = mutants[k] || [];
    const bites = ms.length > 0 && ms.every((m) => {
      const t = { wf: m.wf ?? wf, docker: m.docker ?? docker, pkg: m.pkg ?? pkg };
      const changed = t.wf !== wf || t.docker !== docker || t.pkg !== pkg;
      return changed && railwayBuildPins(t.wf, t.docker, t.pkg)[k] === false;
    });
    check(`r_${k}`, ok && bites, `real=${ok}; controls (${ms.length} mutant(s) that must fail it) all fail it=${bites}`);
  }
  const ok = { result: "success" };
  const skip = { result: "skipped" };
  const shards = [1, 2, 3, 4].map((i) => ({ shard: `${i}/4`, files: 10, tests: 100, passed: 100, failed: 0, skipped: 0, todo: 0 }));
  const full = { classify: ok, "docs-lane": skip, static: ok, "build-ops": ok, "railway-build": ok, vitest: ok, "clock-changed": ok };
  const docs = { classify: ok, "docs-lane": ok, static: skip, "build-ops": skip, "railway-build": skip, vitest: skip, "clock-changed": skip };
  const { "railway-build": _absent, ...missing } = full;
  const pass = (needs, docsOnly) => evaluate({ needs, docsOnly, shards, expectedShards: 4, filesOnDisk: 40 }).ok;
  check("r_aggregate_judges_railway_build",
    FULL_BAR_JOBS.includes("railway-build") && pass(full, "false") &&
      !pass({ ...full, "railway-build": { result: "failure" } }, "false") &&
      !pass({ ...full, "railway-build": skip }, "false") && !pass(missing, "false") &&
      pass(docs, "true") && !pass({ ...docs, "railway-build": ok }, "true"),
    `FULL_BAR_JOBS=[${FULL_BAR_JOBS.join(", ")}]: a failed, skipped or missing railway-build must fail quality-gate on the full bar; skipped by design on the docs path`);
}

// ---- (e) search-ping deploy-inert skip ---------------------------------------------------------
{
  const SHA = "1111111111111111111111111111111111111111";
  const LIVE = "0000000000000000000000000000000000000000"; // an ancestor of SHA
  const OLDER = "4444444444444444444444444444444444444444"; // another ancestor of SHA
  const OTHER = "2222222222222222222222222222222222222222"; // unrelated
  const NEWER = "3333333333333333333333333333333333333333"; // a descendant of SHA
  const anc = new Set([`${LIVE}>${SHA}`, `${OLDER}>${SHA}`, `${SHA}>${NEWER}`, `${LIVE}>${NEWER}`]);
  const isAnc = (a, d) => anc.has(`${a}>${d}`);
  const fake = (reads, files, { gitThrows = false } = {}) => {
    let i = 0;
    return {
      deps: {
        readLiveSha: async () => {
          const r = reads[Math.min(i++, reads.length - 1)];
          if (r instanceof Error) throw r;
          return r;
        },
        isAncestor: (a, d) => {
          if (gitThrows) throw new Error("git exploded");
          return isAnc(a, d);
        },
        changedFiles: () => files,
        sleep: async () => {},
        log: () => {},
      },
      reads: () => i,
    };
  };
  const run = (f) => decideInertSkip(SHA, f.deps, { intervalMs: 0 });
  const DOCS = ["handoff/CURRENT_STATE.md", "handoff/SESSION_LOG.md", "CLAUDE.md"];

  const a = fake([LIVE], DOCS);
  const ra = await run(a);
  check("s1_ancestor_and_all_inert_skips_after_confirm_reads",
    ra.skip === true && ra.path === "skip" && a.reads() === CONFIRM_READS && ra.files.length === 3 &&
      ra.range === "000000000000..111111111111" && SKIP_LINE === "deploy skipped by ignoreCommand: nothing new to ping",
    `${ra.path} after ${a.reads()} reads: ${ra.reason}`);

  const b = fake([LIVE], [...DOCS, "lazytopper/src/pages/Home.tsx"]);
  const rb = await run(b);
  check("s2_ancestor_plus_one_code_file_waits_at_once", !rb.skip && rb.path === "wait" && b.reads() === 1, rb.reason);

  const c = fake([OTHER], DOCS);
  const rc = await run(c);
  check("s3_live_not_an_ancestor_waits", !rc.skip && rc.path === "wait" && c.reads() === 1, rc.reason);

  const d1 = fake([null], DOCS);
  const d2 = fake([new Error("fetch failed")], DOCS);
  const d3 = fake([LIVE], DOCS, { gitThrows: true });
  const rd1 = await run(d1);
  const rd2 = await run(d2);
  const rd3 = await run(d3);
  check("s4_unreadable_live_or_git_error_waits_never_skips",
    !rd1.skip && rd1.path === "wait" && d1.reads() === SETTLE_READS &&
      !rd2.skip && rd2.path === "wait" && !rd3.skip && rd3.path === "wait",
    `null: ${rd1.reason} | throw: ${rd2.reason} | git: ${rd3.reason}`);

  const e1 = fake([SHA], DOCS);
  const e2 = fake([NEWER], DOCS);
  const re1 = await run(e1);
  const re2 = await run(e2);
  check("s5_live_is_sha_or_a_descendant_takes_the_existing_wait_path",
    !re1.skip && re1.path === "existing" && e1.reads() === 1 && !re2.skip && re2.path === "existing",
    `${re1.reason} | ${re2.reason}`);

  // A rollout mid-way: inert reads must be CONSECUTIVE and of the SAME live SHA.
  const f = fake([LIVE, LIVE, null, LIVE, OLDER, LIVE, LIVE, null], DOCS);
  const rf = await run(f);
  check("s6_inert_reads_must_be_consecutive_and_stable_or_it_waits",
    !rf.skip && rf.path === "wait" && f.reads() === SETTLE_READS, rf.reason);

  // ONE copy of the rule: the decision defers to verdictForFiles for every path, the tricky ones included.
  const kindFor = (files) => classifyLiveRead(SHA, LIVE, { isAncestor: isAnc, changedFiles: () => files }).kind;
  const diverge = PATHS.filter(([p, inert]) => {
    const got = kindFor([p]);
    return got !== (verdictForFiles([p]).skip ? "inert" : "wait") || got !== (inert ? "inert" : "wait");
  });
  const src = read(path.join(HERE, "searchping_inert_skip.mjs"));
  const code = src.replace(/^\s*\/\/.*$/gm, "");
  check("s7_skip_uses_the_shared_classifier_and_no_rule_of_its_own",
    diverge.length === 0 && kindFor([]) === "wait" &&
      /import \{[^}]*\bverdictForFiles\b[^}]*\} from "\.\/vercel_ignore_build\.mjs"/.test(src) &&
      !/\.md\b|endsWith|SHIPPING_SEGMENTS|handoff\//.test(code),
    diverge.length ? `diverges on: ${diverge.map(([p]) => p).join(", ")}` : `${PATHS.length} paths agree with verdictForFiles; empty range waits`);

  // Real history: a docs-only squash merge vs its parent is inert; a product merge vs its parent waits.
  let hasHistory = true;
  try { git(["cat-file", "-e", "b52d46c5^{commit}"]); } catch { hasHistory = false; }
  if (!hasHistory) {
    check("s8_real_trunk_ranges", false, "history not available - this suite needs full history (fetch-depth: 0)");
  } else {
    const realDeps = {
      isAncestor: (x, y) => { try { git(["merge-base", "--is-ancestor", x, y]); return true; } catch { return false; } },
      changedFiles: (from, to) => listChangedPaths(from, to, { cwd: REPO_ROOT }),
    };
    const rev = (r) => git(["rev-parse", r]).trim();
    const docs = classifyLiveRead(rev("b52d46c5"), rev("b52d46c5^"), realDeps).kind;
    const prod = classifyLiveRead(rev("1e489130"), rev("1e489130^"), realDeps).kind;
    check("s8_real_trunk_ranges", docs === "inert" && prod === "wait", `b52d46c5^..b52d46c5=${docs} 1e489130^..1e489130=${prod}`);
  }
}

// ---- report -----------------------------------------------------------------------------------
const failed = checks.filter((c) => !c.ok);
for (const c of checks) console.log(`${c.ok ? "ok  " : "FAIL"} ${c.name}${c.detail ? ` — ${c.detail}` : ""}`);
console.log(`\nCI_SPEED_ACCEPTANCE: ${checks.length - failed.length}/${checks.length} passed`);
if (failed.length) process.exitCode = 1;
