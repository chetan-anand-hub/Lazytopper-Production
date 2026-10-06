#!/usr/bin/env node
/**
 * CI-SPEED-1 acceptance (owner spec CI-SPEED-1). Pins:
 *   (a) the Vercel Ignored Build Step - docs-only production merges skip, anything that ships builds,
 *       replayed over REAL trunk commits (needs full history: quality-gate.yml checks out depth 0);
 *   (b) the date-sensitive manifest - static guard + the runtime recorder's call-site filter;
 *   (c) the aggregate behind the REQUIRED `quality-gate` check - fails closed on any failed,
 *       skipped or cancelled job and on shards that do not cover every test file;
 *   (d) the workflow wiring - shards, clock jobs, nightly full run, concurrency.
 *
 * Run by quality-gate.yml (build-ops job).   node scripts/ops/ci_speed_acceptance.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { decide, isDeployInertPath, verdictForFiles } from "./vercel_ignore_build.mjs";
import { guard, dateSignalsIn, readList, scan } from "../testClock/dateSensitive.mjs";
import { isRepoFrame } from "../testClock/clockRecorderFrames.mjs";
import { evaluate, summariseVitestJson } from "./ci_aggregate.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ANCHOR = path.resolve(HERE, "..", "..");
const REPO_ROOT = path.resolve(ANCHOR, "..");
const WORKFLOW = path.join(REPO_ROOT, ".github", "workflows", "quality-gate.yml");
const VERCEL_JSON = path.join(REPO_ROOT, "vercel.json");

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
  const fullNeeds = { classify: ok, "docs-lane": ok, static: ok, "build-ops": ok, vitest: ok, clock: ok };
  const shards = [1, 2, 3, 4].map((i) => ({ shard: `${i}/4`, files: 10, tests: 100, passed: 100, failed: 0, skipped: 0, todo: 0 }));
  const green = evaluate({ needs: fullNeeds, docsOnly: "false", shards, expectedShards: 4, filesOnDisk: 40 });
  check("g1_full_bar_all_green_passes", green.ok && green.totals.files === 40 && green.totals.tests === 400, green.problems.join("; "));
  const oneFailed = evaluate({ needs: { ...fullNeeds, vitest: { result: "failure" } }, docsOnly: "false", shards, filesOnDisk: 40 });
  const oneSkipped = evaluate({ needs: { ...fullNeeds, clock: skip }, docsOnly: "false", shards, filesOnDisk: 40 });
  const oneCancelled = evaluate({ needs: { ...fullNeeds, static: { result: "cancelled" } }, docsOnly: "false", shards, filesOnDisk: 40 });
  check("g2_a_failed_skipped_or_cancelled_upstream_job_fails_the_aggregate", !oneFailed.ok && !oneSkipped.ok && !oneCancelled.ok);
  const missingShard = evaluate({ needs: fullNeeds, docsOnly: "false", shards: shards.slice(0, 3), filesOnDisk: 30 });
  const droppedFile = evaluate({ needs: fullNeeds, docsOnly: "false", shards, filesOnDisk: 41 });
  const skippedTest = evaluate({ needs: fullNeeds, docsOnly: "false", shards: [...shards.slice(0, 3), { ...shards[3], skipped: 1 }], filesOnDisk: 40 });
  check("g3_shards_must_all_report_cover_every_file_and_skip_nothing", !missingShard.ok && !droppedFile.ok && !skippedTest.ok);
  const docsNeeds = { classify: ok, "docs-lane": ok, static: skip, "build-ops": skip, vitest: skip, clock: skip };
  const docsGreen = evaluate({ needs: docsNeeds, docsOnly: "true" });
  const docsMojibakeRed = evaluate({ needs: { ...docsNeeds, "docs-lane": { result: "failure" } }, docsOnly: "true" });
  const fullButSkipped = evaluate({ needs: docsNeeds, docsOnly: "false", shards, filesOnDisk: 40 });
  check("g4_docs_path_skips_are_by_design_only", docsGreen.ok && !docsMojibakeRed.ok && !fullButSkipped.ok);
  const s = summariseVitestJson({ numTotalTests: 5, numPassedTests: 4, numFailedTests: 0, numPendingTests: 0, numTodoTests: 1, testResults: [{}, {}] }, "2/4");
  check("g5_shard_summary_reads_the_vitest_json_reporter", s.files === 2 && s.tests === 5 && s.todo === 1 && s.shard === "2/4");
}

// ---- (d) workflow wiring --------------------------------------------------------------------
{
  const wf = read(WORKFLOW);
  const jobBlock = (id) => {
    const m = wf.match(new RegExp(`\\n  ${id.replace(/[-]/g, "\\-")}:\\n([\\s\\S]*?)(?=\\n  [A-Za-z][\\w-]*:\\n|$)`));
    return m ? m[1] : "";
  };
  check("w1_nightly_schedule_and_dispatch_triggers", /\n  schedule:\s*\n\s*- cron:\s*'[^']+'/.test(wf) && /\n  workflow_dispatch:\s*\n/.test(wf));
  check("w2_concurrency_separates_events",
    /group:\s*quality-gate-\$\{\{\s*github\.event_name\s*\}\}-\$\{\{\s*github\.ref\s*\}\}/.test(wf),
    "a nightly/dispatched run must never cancel (or be cancelled by) a trunk push run");
  const clock = jobBlock("clock");
  check("w3_clock_jobs_run_the_manifest_and_the_whole_ops_matrix",
    /dateSensitive\.mjs --print=vitest/.test(clock) && clock.includes("vitest run --shard ${{ matrix.part }}/2 $FILES") && /part: 2/.test(clock) &&
      /pnpm --filter lazytopper run test:matrix:all/.test(clock) && /selfCheck\.mjs/.test(clock) &&
      /2030-06-15T06:30:00\.000Z/.test(clock) && /2030-02-14T18:45:00\.000Z/.test(clock));
  const nightly = jobBlock("nightly-full-clock");
  check("w4_nightly_job_runs_the_full_suites_under_both_clocks_and_opens_an_issue",
    /if: github\.event_name == 'schedule' \|\| github\.event_name == 'workflow_dispatch'/.test(nightly) &&
      /pnpm --filter lazytopper exec vitest run\n/.test(nightly) && /pnpm --filter lazytopper run test:matrix:all/.test(nightly) &&
      /issues: write/.test(nightly) && /gh issue create/.test(nightly) &&
      /2030-06-15T06:30:00\.000Z/.test(nightly) && /2030-02-14T18:45:00\.000Z/.test(nightly) &&
      !/issues: write/.test(wf.replace(nightly, "")));
  const vitest = jobBlock("vitest");
  check("w5_default_vitest_runs_every_file_once_via_4_shards",
    /shard: \[1, 2, 3, 4\]/.test(vitest) && /pnpm --filter lazytopper exec vitest run --shard \$\{\{ matrix\.shard \}\}\/4/.test(vitest) &&
      !/--exclude/.test(vitest) && /EXPECTED_SHARDS: '4'/.test(wf),
    "no test leaves the default run; the aggregate checks the shards cover every file");
  const buildOps = jobBlock("build-ops");
  check("w6_static_guard_and_this_suite_run_on_the_full_bar",
    /dateSensitive\.mjs --guard/.test(buildOps) && /ci_speed_acceptance\.mjs/.test(buildOps) &&
      /if: needs\.classify\.outputs\.docs_only != 'true'/.test(buildOps));
}

// ---- report -----------------------------------------------------------------------------------
const failed = checks.filter((c) => !c.ok);
for (const c of checks) console.log(`${c.ok ? "ok  " : "FAIL"} ${c.name}${c.detail ? ` — ${c.detail}` : ""}`);
console.log(`\nCI_SPEED_ACCEPTANCE: ${checks.length - failed.length}/${checks.length} passed`);
if (failed.length) process.exitCode = 1;
