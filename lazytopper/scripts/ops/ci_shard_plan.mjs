#!/usr/bin/env node
/**
 * CI-SPEED-2 — duration-balanced vitest shards (owner order 2026-10-18: cut quality-gate wall time
 * on product PRs, keep billable minutes roughly flat).
 *
 * `vitest --shard i/N` splits by FILE COUNT, so one slow file made `vitest (2/4)` ~9.5 min while the
 * others ran ~5, and the clock jobs' halves were 1.5x apart. This plans N bins by MEASURED per-file
 * duration (longest-processing-time greedy: slowest file first, into the currently lightest bin;
 * ties by index, so the plan is deterministic on every runner).
 *
 * ★ BALANCE IS BEST-EFFORT; COVERAGE IS NOT. The durations table only moves files between bins.
 *   Every file in the source list lands in EXACTLY one bin — a file missing from the table gets the
 *   median duration, a table entry for a deleted file is ignored — and the quality-gate aggregate
 *   still FAILS unless the vitest shards together ran every test file on disk. A stale table can
 *   make the run slower; it can never make it skip a file.
 *
 * ★ FAILS CLOSED. vitest's positional arguments are SUBSTRING filters, not exact paths: if one test
 *   path were contained in another, the shorter would also select the longer, and a file could run
 *   twice or in the wrong bin. The planner refuses (exit 1) when any planned path is a substring of
 *   another test path, and when a bin would be empty (an empty `vitest run` runs EVERYTHING).
 *
 * USAGE (run from the repo root)
 *   node lazytopper/scripts/ops/ci_shard_plan.mjs --source=all|clock --shards=N --index=i
 *       prints bin i's files, one per line, relative to lazytopper/
 *   node lazytopper/scripts/ops/ci_shard_plan.mjs --source=all|clock --shards=N --report
 *       prints every bin's planned seconds and file count
 *   node lazytopper/scripts/ops/ci_shard_plan.mjs --refresh=<vitest JSON reporter file>...
 *       rewrites vitest-durations.json from real runs (CI shard JSON or a local full run)
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { enumerateVitestFiles, readList } from "../testClock/dateSensitive.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ANCHOR = path.resolve(HERE, "..", ".."); // lazytopper/
export const DURATIONS_PATH = path.join(HERE, "vitest-durations.json");

const toPosix = (p) => String(p).replace(/\\/g, "/");

export function readDurations(p = DURATIONS_PATH) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")).files || {}; } catch { return {}; }
}

export function medianOf(values, fallback = 5) {
  const v = values.filter((x) => Number.isFinite(x) && x > 0).sort((a, b) => a - b);
  return v.length ? v[Math.floor(v.length / 2)] : fallback;
}

/** Pure: files[] + durations{} + n -> [{ files: [...], seconds }], every file in exactly one bin. */
export function planShards(files, durations, n) {
  if (!Number.isInteger(n) || n < 1) throw new Error(`shards must be a positive integer, got ${n}`);
  const uniq = [...new Set(files.map(toPosix))];
  if (uniq.length < n) throw new Error(`${uniq.length} file(s) cannot fill ${n} shard(s) — an empty shard would run everything`);
  const fallback = medianOf(Object.values(durations));
  const cost = (f) => (Number.isFinite(durations[f]) && durations[f] > 0 ? durations[f] : fallback);
  const order = uniq.slice().sort((a, b) => cost(b) - cost(a) || (a < b ? -1 : a > b ? 1 : 0));
  const bins = Array.from({ length: n }, () => ({ files: [], seconds: 0 }));
  for (const f of order) {
    let best = 0;
    for (let i = 1; i < n; i += 1) if (bins[i].seconds < bins[best].seconds) best = i;
    bins[best].files.push(f);
    bins[best].seconds += cost(f);
  }
  for (const b of bins) b.files.sort();
  return bins;
}

/**
 * Pure (CI-SPEED-3): the same files, slowest first (unknown files get the median, like planShards; ties
 * by path, so the order is deterministic). Used by ci_vitest_sequencer.mjs to order files INSIDE a shard.
 */
export function orderSlowestFirst(files, durations) {
  const fallback = medianOf(Object.values(durations));
  const cost = (f) => (Number.isFinite(durations[f]) && durations[f] > 0 ? durations[f] : fallback);
  return files.map(toPosix).sort((a, b) => cost(b) - cost(a) || (a < b ? -1 : a > b ? 1 : 0));
}

/** Pure: any planned path that is a substring of a DIFFERENT test path (vitest filter collision). */
export function substringCollisions(planned, allTestFiles) {
  const out = [];
  for (const a of planned) for (const b of allTestFiles) if (a !== b && b.includes(a)) out.push(`${a} also selects ${b}`);
  return out;
}

export function sourceFiles(source, anchor = ANCHOR) {
  if (source === "all") return enumerateVitestFiles(anchor);
  if (source === "clock") return readList().vitest.map(toPosix);
  throw new Error(`unknown --source=${source} (all | clock)`);
}

/** vitest JSON reporter -> { "src/x.test.ts": seconds } (paths made relative to lazytopper/). */
export function durationsFromVitestJson(json, anchor = ANCHOR) {
  const out = {};
  for (const r of json?.testResults || []) {
    const abs = toPosix(r.name || "");
    const i = abs.lastIndexOf("/src/");
    const rel = i >= 0 ? abs.slice(i + 1) : toPosix(path.relative(anchor, abs));
    const secs = (Number(r.endTime) - Number(r.startTime)) / 1000;
    if (rel.startsWith("src/") && Number.isFinite(secs) && secs >= 0) out[rel] = Math.round(secs * 100) / 100;
  }
  return out;
}

function arg(name) {
  const a = process.argv.find((x) => x.startsWith(`--${name}=`));
  return a ? a.slice(name.length + 3) : "";
}

function main() {
  const refresh = process.argv.filter((x) => x.startsWith("--refresh=")).map((x) => x.slice("--refresh=".length));
  if (refresh.length) {
    const files = {};
    for (const f of refresh) Object.assign(files, durationsFromVitestJson(JSON.parse(fs.readFileSync(f, "utf8"))));
    const sorted = Object.fromEntries(Object.entries(files).sort(([a], [b]) => (a < b ? -1 : 1)));
    fs.writeFileSync(DURATIONS_PATH, JSON.stringify({
      _note: "Per-file vitest seconds for ci_shard_plan.mjs. Balance only — never coverage. Refresh: node lazytopper/scripts/ops/ci_shard_plan.mjs --refresh=<vitest json>...",
      files: sorted }, null, 1) + "\n");
    console.log(`SHARD_PLAN_REFRESH: ${Object.keys(sorted).length} file durations written to ${toPosix(path.relative(process.cwd(), DURATIONS_PATH))}`);
    return;
  }
  const source = arg("source");
  const n = Number(arg("shards"));
  const files = sourceFiles(source);
  const all = enumerateVitestFiles();
  const collisions = substringCollisions(files, all);
  if (collisions.length) {
    console.error(`SHARD_PLAN_REFUSED: vitest filters are substrings — ${collisions.slice(0, 5).join("; ")}`);
    process.exitCode = 1;
    return;
  }
  const bins = planShards(files, readDurations(), n);
  if (process.argv.includes("--report")) {
    bins.forEach((b, i) => console.log(`SHARD_PLAN: source=${source} shard=${i + 1}/${n} files=${b.files.length} planned_seconds=${Math.round(b.seconds)}`));
    return;
  }
  const i = Number(arg("index"));
  if (!Number.isInteger(i) || i < 1 || i > n) { console.error(`--index must be 1..${n}`); process.exitCode = 2; return; }
  console.error(`SHARD_PLAN: source=${source} shard=${i}/${n} files=${bins[i - 1].files.length} planned_seconds=${Math.round(bins[i - 1].seconds)}`);
  process.stdout.write(bins[i - 1].files.join("\n") + "\n");
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (invokedDirectly) {
  try { main(); } catch (err) { console.error(`SHARD_PLAN_ERROR: ${err.message}`); process.exitCode = 1; }
}
