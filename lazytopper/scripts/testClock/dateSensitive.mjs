#!/usr/bin/env node
// DATE-SENSITIVE TEST SELECTION (CI-SPEED-1, HARDEN-1 §2 PR-3 (b)).
//
// The two CI clock runs ("Test clock at 2030" and "Test clock at IST midnight") used to re-run
// the WHOLE vitest suite and the WHOLE lazytopper ops matrix, twice, with "now" moved. That was
// ~60% of every full-bar job. They now run only the tests that can depend on the date - the
// committed list in `date-sensitive-tests.json` next to this file - and a nightly `schedule:`
// run of quality-gate.yml still runs the full set under both clocks. The DEFAULT vitest and ops
// matrix steps are untouched: no test leaves the normal run.
//
// ★ "DATE-DEPENDENT" IS MECHANICAL, NOT A JUDGEMENT. A test file is date-dependent when its own
//   text, or the text of a test fixture/helper it imports by relative path (anything under a
//   `__fixtures__/` or `src/test/` directory), matches ANY of DATE_SIGNALS below: it reads the
//   clock (Date.now, new Date, Date.parse/UTC), pins or moves it (fake timers' system time,
//   LT_TEST_CLOCK, the test-clock helper), formats or decomposes a date (getFullYear,
//   toISOString, Intl.DateTimeFormat ...), or carries a calendar date literal (YYYY-MM-DD) that
//   product code may compare against "now". Over-inclusion only costs clock-run time;
//   under-inclusion is what the guard exists to stop.
//
// ★ THE GUARD (`--guard`) FAILS CI when a date-dependent test exists outside the list, or when
//   the list names a test that no longer exists. Humans may ADD entries the scanner cannot see
//   (a test whose date-dependence is purely transitive); the guard never removes them.
//
// ★ RESIDUAL RISK, STATED: a test whose file has no date signal at all but whose product code
//   reads the clock and whose assertion changes with the date is invisible to any text scan. The
//   nightly full clock run is the backstop for exactly that case (caught within ~24 h, not at PR
//   time). Add such a test to the list by hand when one is found.
//
// MODES
//   node scripts/testClock/dateSensitive.mjs --guard          # exit 1 on a violation
//   node scripts/testClock/dateSensitive.mjs --print=vitest   # the listed vitest files, one per line
//   node scripts/testClock/dateSensitive.mjs --run-ops        # run the listed ops-matrix entries
//   node scripts/testClock/dateSensitive.mjs --write          # regenerate the list (scanner ∪ manual)

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ANCHOR = path.resolve(HERE, "..", ".."); // lazytopper/
export const LIST_PATH = path.join(HERE, "date-sensitive-tests.json");
const MATRIX_SCRIPT = "test:matrix:all";

/** Each signal has a name so a guard failure can say WHY a file counts as date-dependent. */
export const DATE_SIGNALS = Object.freeze([
  ["reads-now", /\bDate\.now\s*\(/],
  ["constructs-date", /\bnew\s+Date\s*\(/],
  ["parses-date", /\bDate\.(?:parse|UTC)\s*\(/],
  ["pins-clock", /\b(?:useFakeTimers|setSystemTime|getMockedSystemTime|getRealSystemTime)\b/],
  ["test-clock", /\bLT_TEST_CLOCK\b|testClock/],
  ["date-parts", /\.(?:get|getUTC)(?:FullYear|Month|Date|Day|Hours)\s*\(|\.toISOString\s*\(|\.toLocale(?:Date)?String\s*\(|\bIntl\.DateTimeFormat\b/],
  ["date-literal", /\b(?:19|20)\d{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])\b/],
]);

const toPosix = (p) => p.replace(/\\/g, "/");

function readText(abs) {
  try { return fs.readFileSync(abs, "utf8"); } catch { return null; }
}

/**
 * Drop whole-line comments (lines whose first non-blank characters are `//`, `/*` or `*`).
 * Prose cannot make a test date-dependent, and comments in this repo carry dates ("OWNER RULING
 * (2026-10-03)") on almost every guard. Trailing `// ...` comments are deliberately KEPT: a
 * naive strip would also eat code after a `//` inside a string ("https://..."), and a missed
 * signal is the expensive direction.
 */
export function stripLineComments(text) {
  return String(text).split(/\r?\n/).filter((line) => !/^\s*(?:\/\/|\/\*|\*)/.test(line)).join("\n");
}

/** The names of the signals a text matches (empty = not date-dependent). */
export function dateSignalsIn(text) {
  if (!text) return [];
  const code = stripLineComments(text);
  return DATE_SIGNALS.filter(([, re]) => re.test(code)).map(([name]) => name);
}

/** Relative imports of a test that resolve to fixtures/helpers (one level, deliberately). */
function helperImports(absFile, text) {
  const out = [];
  const re = /(?:from\s+|import\s*\(\s*|require\s*\(\s*)["'](\.{1,2}\/[^"']+)["']/g;
  let m;
  while ((m = re.exec(text))) {
    const spec = m[1];
    const base = path.resolve(path.dirname(absFile), spec);
    const rel = toPosix(path.relative(ANCHOR, base));
    if (!/(^|\/)__fixtures__\//.test(rel) && !/^src\/test\//.test(rel)) continue;
    // The global vitest setup file loads for EVERY test; importing it again is not a signal.
    if (/^src\/test\/setup(\.tsx?)?$/.test(rel)) continue;
    for (const cand of [base, ...[".ts", ".tsx", ".js", ".mjs", ".cjs", ".json"].map((e) => base + e)]) {
      if (fs.existsSync(cand) && fs.statSync(cand).isFile()) { out.push(cand); break; }
    }
  }
  return out;
}

/** Signals for one test file, including its fixture/helper imports. */
export function fileSignals(absFile) {
  const text = readText(absFile);
  if (text === null) return null;
  const names = new Set(dateSignalsIn(text));
  for (const helper of helperImports(absFile, text)) {
    for (const n of dateSignalsIn(readText(helper))) names.add(`${n} (via ${toPosix(path.relative(ANCHOR, helper))})`);
  }
  return [...names];
}

/** Every vitest file the default run collects: vitest.config.ts `include: ["src/**\/*.test.{ts,tsx}"]`. */
export function enumerateVitestFiles(anchor = ANCHOR) {
  const found = [];
  const walk = (dir) => {
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) { if (e.name !== "node_modules") walk(full); }
      else if (/\.test\.tsx?$/.test(e.name)) found.push(toPosix(path.relative(anchor, full)));
    }
  };
  walk(path.join(anchor, "src"));
  return found.sort();
}

/** The ops-matrix chain, in order: [{ name, command, files }]. */
export function enumerateOpsEntries(anchor = ANCHOR) {
  const pkg = JSON.parse(readText(path.join(anchor, "package.json")) || "{}");
  const scripts = pkg.scripts || {};
  const chain = String(scripts[MATRIX_SCRIPT] || "");
  const names = [...chain.matchAll(/npm run ([\w:.-]+)/g)].map((m) => m[1]);
  return names.map((name) => {
    const command = String(scripts[name] || "");
    const files = command.split(/\s+/)
      .filter((t) => /\.(?:mjs|cjs|js|ts)$/.test(t))
      .filter((t) => fs.existsSync(path.join(anchor, t)));
    return { name, command, files };
  });
}

/** Scan both suites. Returns { vitest: [{file, signals}], ops: [{name, signals}], totals }. */
export function scan(anchor = ANCHOR) {
  const vitestAll = enumerateVitestFiles(anchor);
  const vitest = [];
  for (const rel of vitestAll) {
    const signals = fileSignals(path.join(anchor, rel)) || [];
    if (signals.length) vitest.push({ file: rel, signals });
  }
  const opsAll = enumerateOpsEntries(anchor);
  const ops = [];
  for (const entry of opsAll) {
    const signals = new Set();
    for (const f of entry.files) for (const s of fileSignals(path.join(anchor, f)) || []) signals.add(`${s} [${f}]`);
    if (signals.size) ops.push({ name: entry.name, signals: [...signals] });
  }
  return { vitest, ops, totals: { vitest: vitestAll.length, ops: opsAll.length }, vitestAll, opsAll };
}

export function readList(listPath = LIST_PATH) {
  const raw = readText(listPath);
  if (raw === null) throw new Error(`date-sensitive list missing: ${listPath}`);
  const json = JSON.parse(raw);
  return { vitest: [...(json.vitest || [])], ops: [...(json.ops || [])], manual: json.manual || {} };
}

/**
 * The guard as a pure function. `missing` = date-dependent but NOT listed (the failure this
 * exists for). `stale` = listed but no longer exists (a selection that silently runs nothing).
 */
export function guard(scanResult, list) {
  const listedV = new Set(list.vitest);
  const listedO = new Set(list.ops);
  const missing = [
    ...scanResult.vitest.filter((x) => !listedV.has(x.file)).map((x) => ({ kind: "vitest", id: x.file, signals: x.signals })),
    ...scanResult.ops.filter((x) => !listedO.has(x.name)).map((x) => ({ kind: "ops", id: x.name, signals: x.signals })),
  ];
  const existingV = new Set(scanResult.vitestAll);
  const existingO = new Set(scanResult.opsAll.map((e) => e.name));
  const stale = [
    ...list.vitest.filter((f) => !existingV.has(f)).map((id) => ({ kind: "vitest", id })),
    ...list.ops.filter((n) => !existingO.has(n)).map((id) => ({ kind: "ops", id })),
  ];
  return { ok: missing.length === 0 && stale.length === 0, missing, stale };
}

function runGuard() {
  const s = scan();
  const list = readList();
  const g = guard(s, list);
  console.log(
    `DATE_SENSITIVE_SCOPE: vitest_files=${s.totals.vitest} vitest_date_dependent=${s.vitest.length} vitest_listed=${list.vitest.length} ` +
      `ops_entries=${s.totals.ops} ops_date_dependent=${s.ops.length} ops_listed=${list.ops.length}`,
  );
  for (const m of g.missing) {
    console.error(`DATE_SENSITIVE_UNLISTED: ${m.kind} ${m.id} — signals: ${m.signals.join(", ")}`);
  }
  for (const m of g.stale) console.error(`DATE_SENSITIVE_STALE: ${m.kind} ${m.id} is listed but does not exist`);
  if (!g.ok) {
    console.error(
      `\nDATE_SENSITIVE_GUARD: FAIL — ${g.missing.length} date-dependent test(s) outside the list, ${g.stale.length} stale entr(y/ies). ` +
        "The CI clock runs execute ONLY the listed tests, so an unlisted date-dependent test would never run at 2030 / IST midnight on a PR. " +
        "Fix: `node lazytopper/scripts/testClock/dateSensitive.mjs --write` and commit lazytopper/scripts/testClock/date-sensitive-tests.json.",
    );
    process.exitCode = 1;
    return;
  }
  console.log("DATE_SENSITIVE_GUARD: PASS — every date-dependent test is in the clock-run list.");
}

function runWrite() {
  const s = scan();
  let manual = {};
  let prev = { vitest: [], ops: [] };
  try { prev = readList(); manual = prev.manual || {}; } catch { /* first write */ }
  const manualV = Object.keys(manual.vitest || {});
  const manualO = Object.keys(manual.ops || {});
  const vitest = [...new Set([...s.vitest.map((x) => x.file), ...manualV])].sort();
  const ops = s.opsAll.map((e) => e.name).filter((n) => s.ops.some((x) => x.name === n) || manualO.includes(n));
  const body = {
    _comment:
      "Tests the CI clock runs execute on every PR/push (CI-SPEED-1). Generated by `node lazytopper/scripts/testClock/dateSensitive.mjs --write`; " +
      "the guard fails CI if a date-dependent test is missing here. `manual` holds hand-added entries (id -> reason) the scanner cannot see; --write keeps them. " +
      "The nightly schedule run executes the FULL suites under both clocks.",
    manual: { vitest: manual.vitest || {}, ops: manual.ops || {} },
    vitest,
    ops,
  };
  fs.writeFileSync(LIST_PATH, JSON.stringify(body, null, 2) + "\n");
  console.log(`wrote ${toPosix(path.relative(process.cwd(), LIST_PATH))}: vitest ${vitest.length}/${s.totals.vitest}, ops ${ops.length}/${s.totals.ops}`);
}

/** Run the listed ops-matrix entries in chain order, ALL of them, then fail if any failed. */
function runOps() {
  const list = readList();
  const order = enumerateOpsEntries().map((e) => e.name).filter((n) => list.ops.includes(n));
  const failed = [];
  for (const name of order) {
    console.log(`\n[clock-select] npm run ${name}`);
    const r = spawnSync("npm", ["run", name], { cwd: ANCHOR, stdio: "inherit", shell: process.platform === "win32" });
    if (r.status !== 0) failed.push(`${name} (exit ${r.status})`);
  }
  console.log(`\nCLOCK_SELECT_OPS: ran=${order.length} listed=${list.ops.length} failed=${failed.length}${failed.length ? ` — ${failed.join(", ")}` : ""}`);
  if (order.length !== list.ops.length || failed.length) process.exitCode = 1;
}

const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (invokedDirectly) {
  const argv = process.argv.slice(2);
  if (argv.includes("--guard")) runGuard();
  else if (argv.includes("--write")) runWrite();
  else if (argv.includes("--run-ops")) runOps();
  else if (argv.includes("--print=vitest")) {
    const list = readList();
    if (!list.vitest.length) { console.error("date-sensitive list has no vitest entries"); process.exitCode = 1; }
    else process.stdout.write(list.vitest.join("\n") + "\n");
  } else {
    console.error("usage: dateSensitive.mjs --guard | --print=vitest | --run-ops | --write");
    process.exitCode = 2;
  }
}
