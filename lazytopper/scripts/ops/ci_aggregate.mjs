#!/usr/bin/env node
/**
 * CI AGGREGATE (CI-SPEED-1, decision D41/D40) — the logic behind the `quality-gate` job, the
 * check the trunk ruleset REQUIRES by name.
 *
 * The old Quality Gate was one job, so "the required check passed" meant "every step passed".
 * Split into parallel jobs, that equivalence has to be rebuilt by hand, and the dangerous
 * default is GitHub's: a job that was SKIPPED or CANCELLED is not a failure, and a required
 * check that is satisfied by an aggregate with `if: always()` will happily report green over a
 * skipped shard. So this FAILS CLOSED:
 *
 *   classify                       must be `success`, always.
 *   docs-lane                      docs-only path -> must be `success` (it carries that path's mojibake);
 *                                  full bar -> must be `skipped` (CI-SPEED-3: the full bar's mojibake
 *                                  step runs inside `static`, so this job no longer pays a runner there)
 *   clock-changed                  full bar -> `success`, OR `skipped` ONLY when classify RECORDED the
 *                                  explicit reason (CLOCK_COUNT=0 and CLOCK_SKIP_REASON starting with
 *                                  CLOCK_ZERO_LINE). A skip without that record FAILS (CI-SPEED-3).
 *   static, build-ops, railway-build, vitest, clock-changed
 *       (railway-build: the root build exactly as the Railway image runs it — RAILWAY-BUILD-GATE)
 *       docs-only path (classify said docs_only=true)  -> must be `skipped` (skipped BY DESIGN)
 *       anything else                                   -> must be `success`
 *   vitest shards (full bar only)  every one of the EXPECTED_SHARDS reported a summary, none
 *       failed or skipped a test, and the files they ran, summed, equal the test files on disk —
 *       so sharding can never silently drop a file.
 *   RE-RUNS (CI-AGG-1)             each shard is judged on its LATEST attempt only. A shard uploads
 *       `vitest-shard-<i>-attempt-<github.run_attempt>`; "Re-run failed jobs" leaves the passing
 *       shards' attempt-1 artifacts in place and adds the re-run shard's attempt-N one beside the
 *       failed attempt-1 one. Before CI-AGG-1 every attempt uploaded the SAME name and the aggregate
 *       downloaded with merge-multiple, so which copy of a re-run shard it judged was arbitrary
 *       (run 39967755784 attempt 2 judged shard 3's FAILED attempt-1 summary and stayed red).
 *       selectLatestShardSummaries() keeps, per shard, the highest attempt; two summaries for one
 *       shard at the same attempt FAIL (never summed, never guessed).
 *
 * MODES
 *   node scripts/ops/ci_aggregate.mjs --aggregate                       # env: NEEDS_JSON, DOCS_ONLY, SHARD_DIR, EXPECTED_SHARDS, CLOCK_COUNT, CLOCK_SKIP_REASON
 *   node scripts/ops/ci_aggregate.mjs --shard-summary <vitest.json> <out.json> --shard=i/N [--attempt=A]
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ANCHOR = path.resolve(HERE, "..", ".."); // lazytopper/

export const ALWAYS_JOBS = Object.freeze(["classify"]);
// CI-SPEED-3 (2026-10-22): docs-lane runs ONLY on the docs-only path; the full bar's mojibake is in `static`.
export const DOCS_PATH_JOBS = Object.freeze(["docs-lane"]);
// CI-SPEED-3: classify computes the clock-changed selection; zero selected -> the job is not started and
// classify records this reason. MUST equal ci_clock_changed.mjs ZERO_LINE (ci_speed_acceptance k4 pins it;
// it is a literal here because the aggregate's sparse checkout has no testClock/).
export const CLOCK_ZERO_LINE = "CLOCK_CHANGED: 0 date-sensitive tests changed";
// CI-CLOCK-CUT (2026-10-22): `clock` (six per-PR legs) became `clock-changed` (one job, the manifest
// tests this change touched, at both clocks). It is judged exactly as `clock` was.
export const FULL_BAR_JOBS = Object.freeze(["static", "build-ops", "railway-build", "vitest", "clock-changed"]);

/** Count the vitest files the default run collects (vitest.config.ts include: src/**\/*.test.{ts,tsx}). */
export function countTestFilesOnDisk(anchor = ANCHOR) {
  let n = 0;
  const walk = (dir) => {
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (e.isDirectory()) { if (e.name !== "node_modules") walk(path.join(dir, e.name)); }
      else if (/\.test\.tsx?$/.test(e.name)) n += 1;
    }
  };
  walk(path.join(anchor, "src"));
  return n;
}

/**
 * The whole verdict, pure. `needs` = toJSON(needs) shape: { job: { result } }.
 * `shards` = array of shard summaries (full bar only). Returns { ok, problems[], totals }.
 */
export function evaluate({ needs, docsOnly, shards = [], expectedShards = 4, filesOnDisk = null, clockCount = "", clockSkipReason = "" }) {
  const problems = [];
  const result = (job) => (needs && needs[job] && needs[job].result) || "missing";
  for (const job of ALWAYS_JOBS) {
    if (result(job) !== "success") problems.push(`${job}: ${result(job)} (must be success on every path)`);
  }
  const docs = docsOnly === true || docsOnly === "true";
  for (const job of DOCS_PATH_JOBS) {
    const r = result(job);
    if (docs) {
      if (r !== "success") problems.push(`${job}: ${r} (docs-only path: must be success)`);
    } else if (r !== "skipped") {
      problems.push(`${job}: ${r} (full bar: expected skipped — its mojibake step runs in static)`);
    }
  }
  const clockSkipRecorded = String(clockCount) === "0" && String(clockSkipReason || "").startsWith(CLOCK_ZERO_LINE);
  for (const job of FULL_BAR_JOBS) {
    const r = result(job);
    if (docs) {
      if (r !== "skipped") problems.push(`${job}: ${r} (docs-only path: expected skipped)`);
    } else if (job === "clock-changed" && r === "skipped" && clockSkipRecorded) {
      // skipped BY RECORD: classify selected 0 date-sensitive tests and said so (nightly-full-clock covers them).
    } else if (r !== "success") {
      problems.push(`${job}: ${r} (full bar: must be success)`);
    }
  }
  const totals = { shards: 0, files: 0, tests: 0, passed: 0, failed: 0, skipped: 0, todo: 0 };
  if (!docs) {
    const seen = new Set();
    for (const s of shards) {
      if (seen.has(s.shard)) problems.push(`vitest shard ${s.shard}: more than one summary judged (duplicate attempt?) — refusing to sum them`);
      seen.add(s.shard);
      totals.shards += 1;
      for (const k of ["files", "tests", "passed", "failed", "skipped", "todo"]) totals[k] += Number(s[k] || 0);
    }
    for (let i = 1; i <= expectedShards; i += 1) {
      if (!seen.has(`${i}/${expectedShards}`)) problems.push(`vitest shard ${i}/${expectedShards}: no summary (did not run or did not finish)`);
    }
    if (totals.failed) problems.push(`vitest: ${totals.failed} failed test(s) across shards`);
    if (totals.skipped) problems.push(`vitest: ${totals.skipped} skipped test(s) — the default run must skip nothing`);
    if (filesOnDisk !== null && totals.files !== filesOnDisk) {
      problems.push(`vitest: shards ran ${totals.files} file(s) but ${filesOnDisk} test file(s) exist — sharding dropped or duplicated files`);
    }
  }
  return { ok: problems.length === 0, problems, totals, docs };
}

// CI-AGG-1: the artifact each shard uploads, one per run attempt (quality-gate.yml, vitest job).
export const SHARD_ARTIFACT_RE = /^vitest-shard-(\d+)-attempt-(\d+)$/;
const SHARD_FILE_RE = /^vitest-shard-\d+\.json$/;

/**
 * CI-AGG-1. entries = [{ summary, attempt }] (every summary downloaded, from every run attempt).
 * Returns { shards, judged, problems }: per shard, ONLY the summaries of its highest attempt. A tie
 * (two summaries for one shard at its highest attempt) keeps both, so evaluate() fails it.
 */
export function selectLatestShardSummaries(entries = []) {
  const byShard = new Map();
  for (const e of entries) {
    const key = String(e && e.summary && e.summary.shard);
    if (!byShard.has(key)) byShard.set(key, []);
    byShard.get(key).push(e);
  }
  const shards = [];
  const judged = [];
  for (const [shard, list] of [...byShard.entries()].sort(([a], [b]) => a.localeCompare(b, "en", { numeric: true }))) {
    const attempts = list.map((e) => Number(e.attempt) || 0);
    const latest = Math.max(...attempts);
    for (const e of list) if ((Number(e.attempt) || 0) === latest) shards.push(e.summary);
    judged.push({ shard, attempt: latest, attempts: [...attempts].sort((a, b) => a - b) });
  }
  return { shards, judged };
}

/**
 * CI-AGG-1. Read every shard summary under `dir`: one sub-directory per downloaded artifact
 * (`vitest-shard-<i>-attempt-<A>/vitest-shard-<i>.json`, no merge-multiple), or a flat legacy file
 * (attempt 0). A summary whose own `attempt` disagrees with its artifact name is a problem.
 */
export function readShardSummaries(dir) {
  const entries = [];
  const problems = [];
  let names = [];
  try { names = fs.readdirSync(dir, { withFileTypes: true }); } catch { return { entries, problems }; }
  for (const d of names) {
    const m = d.isDirectory() ? SHARD_ARTIFACT_RE.exec(d.name) : null;
    if (m) {
      const attempt = Number(m[2]);
      for (const f of fs.readdirSync(path.join(dir, d.name))) {
        if (!SHARD_FILE_RE.test(f)) continue;
        const summary = JSON.parse(fs.readFileSync(path.join(dir, d.name, f), "utf8"));
        if (summary.attempt !== undefined && Number(summary.attempt) !== attempt) {
          problems.push(`vitest summary ${d.name}/${f}: says attempt ${summary.attempt} but was uploaded as attempt ${attempt}`);
        }
        entries.push({ summary, attempt });
      }
    } else if (d.isFile() && SHARD_FILE_RE.test(d.name)) {
      const summary = JSON.parse(fs.readFileSync(path.join(dir, d.name), "utf8"));
      entries.push({ summary, attempt: Number(summary.attempt) || 0 });
    }
  }
  return { entries, problems };
}

/** vitest JSON reporter output -> the per-shard summary the aggregate reads. */
export function summariseVitestJson(json, shard) {
  return {
    shard,
    files: Array.isArray(json.testResults) ? json.testResults.length : 0,
    tests: Number(json.numTotalTests || 0),
    passed: Number(json.numPassedTests || 0),
    failed: Number(json.numFailedTests || 0) + Number(json.numFailedTestSuites || 0),
    skipped: Number(json.numPendingTests || 0),
    todo: Number(json.numTodoTests || 0),
  };
}

function runShardSummary(argv) {
  const [input, output] = argv.filter((a) => !a.startsWith("--"));
  const shard = (argv.find((a) => a.startsWith("--shard=")) || "--shard=?").slice("--shard=".length);
  let json = {};
  try { json = JSON.parse(fs.readFileSync(input, "utf8")); } catch (err) {
    console.error(`VITEST_SHARD_SUMMARY: could not read ${input}: ${err.message}`);
    process.exitCode = 1;
    return;
  }
  const s = summariseVitestJson(json, shard);
  const attemptArg = argv.find((a) => a.startsWith("--attempt="));
  if (attemptArg) s.attempt = Number(attemptArg.slice("--attempt=".length)) || 0;
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(s) + "\n");
  console.log(`VITEST_SHARD_SUMMARY: shard=${s.shard}${s.attempt !== undefined ? ` attempt=${s.attempt}` : ""} files=${s.files} tests=${s.tests} passed=${s.passed} failed=${s.failed} skipped=${s.skipped} todo=${s.todo}`);
}

function runAggregate() {
  let needs = {};
  try { needs = JSON.parse(process.env.NEEDS_JSON || "{}"); } catch { needs = {}; }
  const docsOnly = process.env.DOCS_ONLY;
  const expectedShards = Number(process.env.EXPECTED_SHARDS || 4);
  const clockCount = process.env.CLOCK_COUNT || "";
  const clockSkipReason = process.env.CLOCK_SKIP_REASON || "";
  const dir = process.env.SHARD_DIR || "";
  // No summaries (or an unreadable one): the evaluate() shard check reports the missing shard.
  let read = { entries: [], problems: [] };
  try { read = readShardSummaries(dir); } catch (err) { read.problems.push(`vitest summaries unreadable: ${err.message}`); }
  const { shards, judged } = selectLatestShardSummaries(read.entries);
  const filesOnDisk = countTestFilesOnDisk();
  for (const [job, v] of Object.entries(needs)) console.log(`CI_AGGREGATE_JOB: ${job}=${v && v.result}`);
  for (const j of judged) console.log(`VITEST_SHARD_JUDGED: shard=${j.shard} attempt=${j.attempt} (attempts seen: ${j.attempts.join(",")})`);
  const r = evaluate({ needs, docsOnly, shards, expectedShards, filesOnDisk, clockCount, clockSkipReason });
  if (!r.docs) for (const p of read.problems) { r.problems.push(p); r.ok = false; }
  console.log(`CI_AGGREGATE_PATH: ${r.docs ? "docs-only fast path" : "full bar"}`);
  if (!r.docs) console.log(`CI_AGGREGATE_CLOCK: count=${clockCount || "(unset)"} skip_reason=${clockSkipReason || "(none)"}`);
  if (!r.docs) {
    const t = r.totals;
    console.log(`VITEST_TOTAL: shards=${t.shards}/${expectedShards} files=${t.files} (on disk ${filesOnDisk}) tests=${t.tests} passed=${t.passed} failed=${t.failed} skipped=${t.skipped} todo=${t.todo}`);
  }
  for (const p of r.problems) console.error(`CI_AGGREGATE_PROBLEM: ${p}`);
  console.log(`CI_AGGREGATE_VERDICT: ${r.ok ? "PASS" : "FAIL"}`);
  if (!r.ok) process.exitCode = 1;
}

const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (invokedDirectly) {
  const argv = process.argv.slice(2);
  if (argv.includes("--aggregate")) runAggregate();
  else if (argv.includes("--shard-summary")) runShardSummary(argv.filter((a) => a !== "--shard-summary"));
  else { console.error("usage: ci_aggregate.mjs --aggregate | --shard-summary <in> <out> --shard=i/N"); process.exitCode = 2; }
}
