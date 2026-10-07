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
 *   classify, docs-lane            must be `success`, always.
 *   static, build-ops, railway-build, vitest, clock
 *       (railway-build: the root build exactly as the Railway image runs it — RAILWAY-BUILD-GATE)
 *       docs-only path (classify said docs_only=true)  -> must be `skipped` (skipped BY DESIGN)
 *       anything else                                   -> must be `success`
 *   vitest shards (full bar only)  every one of the EXPECTED_SHARDS reported a summary, none
 *       failed or skipped a test, and the files they ran, summed, equal the test files on disk —
 *       so sharding can never silently drop a file.
 *
 * MODES
 *   node scripts/ops/ci_aggregate.mjs --aggregate                       # env: NEEDS_JSON, DOCS_ONLY, SHARD_DIR, EXPECTED_SHARDS
 *   node scripts/ops/ci_aggregate.mjs --shard-summary <vitest.json> <out.json> --shard=i/N
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ANCHOR = path.resolve(HERE, "..", ".."); // lazytopper/

export const ALWAYS_JOBS = Object.freeze(["classify", "docs-lane"]);
export const FULL_BAR_JOBS = Object.freeze(["static", "build-ops", "railway-build", "vitest", "clock"]);

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
export function evaluate({ needs, docsOnly, shards = [], expectedShards = 4, filesOnDisk = null }) {
  const problems = [];
  const result = (job) => (needs && needs[job] && needs[job].result) || "missing";
  for (const job of ALWAYS_JOBS) {
    if (result(job) !== "success") problems.push(`${job}: ${result(job)} (must be success on every path)`);
  }
  const docs = docsOnly === true || docsOnly === "true";
  for (const job of FULL_BAR_JOBS) {
    const r = result(job);
    if (docs) {
      if (r !== "skipped") problems.push(`${job}: ${r} (docs-only path: expected skipped)`);
    } else if (r !== "success") {
      problems.push(`${job}: ${r} (full bar: must be success)`);
    }
  }
  const totals = { shards: 0, files: 0, tests: 0, passed: 0, failed: 0, skipped: 0, todo: 0 };
  if (!docs) {
    const seen = new Set();
    for (const s of shards) {
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
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(s) + "\n");
  console.log(`VITEST_SHARD_SUMMARY: shard=${s.shard} files=${s.files} tests=${s.tests} passed=${s.passed} failed=${s.failed} skipped=${s.skipped} todo=${s.todo}`);
}

function runAggregate() {
  let needs = {};
  try { needs = JSON.parse(process.env.NEEDS_JSON || "{}"); } catch { needs = {}; }
  const docsOnly = process.env.DOCS_ONLY;
  const expectedShards = Number(process.env.EXPECTED_SHARDS || 4);
  const dir = process.env.SHARD_DIR || "";
  const shards = [];
  try {
    for (const f of fs.readdirSync(dir)) {
      if (/^vitest-shard-\d+\.json$/.test(f)) shards.push(JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")));
    }
  } catch { /* no summaries: the evaluate() shard check reports it */ }
  const filesOnDisk = countTestFilesOnDisk();
  for (const [job, v] of Object.entries(needs)) console.log(`CI_AGGREGATE_JOB: ${job}=${v && v.result}`);
  const r = evaluate({ needs, docsOnly, shards, expectedShards, filesOnDisk });
  console.log(`CI_AGGREGATE_PATH: ${r.docs ? "docs-only fast path" : "full bar"}`);
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
