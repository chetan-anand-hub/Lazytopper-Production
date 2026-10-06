#!/usr/bin/env node
// DATE-SENSITIVE TEST MANIFEST (CI-SPEED-1, decisions D39/D40).
//
// The CI clock jobs ("clock (2030)" and "clock (ist-midnight)") used to re-run the WHOLE vitest
// suite twice with "now" moved - two of the three full vitest passes in every run. They now run
// only the vitest files listed in `date-sensitive-tests.json` (the manifest), plus the whole
// lazytopper ops matrix (cheap: ~1.1 min). The nightly `schedule:` job runs the FULL vitest suite
// and the full ops matrix under both clocks. The default (sharded) vitest run is untouched: no
// test leaves the normal run.
//
// TWO GUARDS keep the manifest honest, and they catch different things:
//
// 1. RUNTIME (clockRecorder.setup.mjs, in every normal vitest run). A test file during which REPO
//    code (the test itself, or product code it calls) read the clock - Date.now(), new Date(),
//    Date() - fails if it is not in the manifest. This is the one that catches TRANSITIVE use: a
//    countdown component's test never mentions Date. Seeded from a full recorded run
//    (`--write --recorded=<file>`); recorded entries are kept under `manual.vitest` with their
//    first call site as the reason.
//
// 2. STATIC (`--guard`, here). A test file whose own text - or a fixture/helper it imports from
//    `__fixtures__/` or `src/test/` - carries a date signal (DATE_SIGNALS below) must be listed.
//    This catches what the recorder cannot: a test that PINS its own fake clock (its reads hit the
//    fake Date, which the recorder deliberately leaves alone), and a calendar date literal in a
//    fixture that product code compares with "now" (the #875 "tomorrow" fixture shape).
//    Whole-line comments are ignored: prose cannot make a test date-dependent.
//
// MODES
//   node scripts/testClock/dateSensitive.mjs --guard                    # static guard; exit 1 on a violation
//   node scripts/testClock/dateSensitive.mjs --print=vitest             # the manifest, one path per line
//   node scripts/testClock/dateSensitive.mjs --write [--recorded=<f>]   # regenerate: static ∪ manual ∪ recorded

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ANCHOR = path.resolve(HERE, "..", ".."); // lazytopper/
export const LIST_PATH = path.join(HERE, "date-sensitive-tests.json");

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
 * Comments in this repo carry dates ("OWNER RULING (2026-10-03)") on almost every guard.
 * Trailing `// ...` comments are deliberately KEPT: a naive strip would also eat code after a
 * `//` inside a string ("https://..."), and a missed signal is the expensive direction.
 */
export function stripLineComments(text) {
  return String(text).split(/\r?\n/).filter((line) => !/^\s*(?:\/\/|\/\*|\*)/.test(line)).join("\n");
}

/** The names of the signals a text matches (empty = no static signal). */
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
    const base = path.resolve(path.dirname(absFile), m[1]);
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

/** Static signals for one test file, including its fixture/helper imports. */
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

/** Static scan. Returns { vitest: [{file, signals}], vitestAll, totals }. */
export function scan(anchor = ANCHOR) {
  const vitestAll = enumerateVitestFiles(anchor);
  const vitest = [];
  for (const rel of vitestAll) {
    const signals = fileSignals(path.join(anchor, rel)) || [];
    if (signals.length) vitest.push({ file: rel, signals });
  }
  return { vitest, vitestAll, totals: { vitest: vitestAll.length } };
}

export function readList(listPath = LIST_PATH) {
  const raw = readText(listPath);
  if (raw === null) throw new Error(`date-sensitive manifest missing: ${listPath}`);
  const json = JSON.parse(raw);
  return { vitest: [...(json.vitest || [])], manual: json.manual || {} };
}

/**
 * The static guard as a pure function. `missing` = a static date signal but NOT listed.
 * `stale` = listed but no longer exists (a selection that silently runs nothing).
 */
export function guard(scanResult, list) {
  const listed = new Set(list.vitest);
  const missing = scanResult.vitest.filter((x) => !listed.has(x.file)).map((x) => ({ id: x.file, signals: x.signals }));
  const existing = new Set(scanResult.vitestAll);
  const stale = list.vitest.filter((f) => !existing.has(f)).map((id) => ({ id }));
  return { ok: missing.length === 0 && stale.length === 0, missing, stale };
}

function runGuard() {
  const s = scan();
  const list = readList();
  const g = guard(s, list);
  console.log(
    `DATE_SENSITIVE_SCOPE: vitest_files=${s.totals.vitest} static_signal=${s.vitest.length} ` +
      `manual_or_recorded=${Object.keys(list.manual.vitest || {}).length} manifest=${list.vitest.length}`,
  );
  for (const m of g.missing) console.error(`DATE_SENSITIVE_UNLISTED: ${m.id} — signals: ${m.signals.join(", ")}`);
  for (const m of g.stale) console.error(`DATE_SENSITIVE_STALE: ${m.id} is listed but does not exist`);
  if (!g.ok) {
    console.error(
      `\nDATE_SENSITIVE_GUARD: FAIL — ${g.missing.length} date-dependent test(s) outside the manifest, ${g.stale.length} stale entr(y/ies). ` +
        "The CI clock jobs run ONLY the manifest, so an unlisted date-dependent test would never run at 2030 / IST midnight on a PR. " +
        "Fix: `node lazytopper/scripts/testClock/dateSensitive.mjs --write` and commit lazytopper/scripts/testClock/date-sensitive-tests.json.",
    );
    process.exitCode = 1;
    return;
  }
  console.log("DATE_SENSITIVE_GUARD: PASS — every statically date-dependent test is in the manifest.");
}

function runWrite(recordedPath) {
  const s = scan();
  let manual = {};
  try { manual = readList().manual || {}; } catch { /* first write */ }
  const manualV = { ...(manual.vitest || {}) };
  if (recordedPath) {
    const lines = (readText(recordedPath) || "").split(/\r?\n/).filter(Boolean);
    for (const line of lines) {
      const [file, site] = line.split("\t");
      if (!file || !fs.existsSync(path.join(ANCHOR, file))) continue;
      if (!manualV[file]) manualV[file] = `runtime recorder: repo code read the clock at ${String(site || "").slice(0, 160)}`;
    }
  }
  // A manual entry whose file is gone is dropped here (and would be "stale" in the guard otherwise).
  for (const f of Object.keys(manualV)) if (!fs.existsSync(path.join(ANCHOR, f))) delete manualV[f];
  const vitest = [...new Set([...s.vitest.map((x) => x.file), ...Object.keys(manualV)])].sort();
  const sortedManual = Object.fromEntries(Object.entries(manualV).sort(([a], [b]) => a.localeCompare(b)));
  const body = {
    _comment:
      "CI-SPEED-1 date-sensitive manifest: the vitest files the CI clock jobs run on every PR/push. Generated by " +
      "`node lazytopper/scripts/testClock/dateSensitive.mjs --write [--recorded=<file>]` = static date signals ∪ manual. " +
      "`manual.vitest` (path -> reason) holds entries the static scan cannot see - mostly the runtime recorder's finds " +
      "(product code read the clock during the test); --write keeps them. The nightly job runs the FULL suites under both clocks.",
    manual: { vitest: sortedManual },
    vitest,
  };
  fs.writeFileSync(LIST_PATH, JSON.stringify(body, null, 2) + "\n");
  console.log(
    `wrote ${toPosix(path.relative(process.cwd(), LIST_PATH))}: manifest ${vitest.length}/${s.totals.vitest} ` +
      `(static ${s.vitest.length}, manual/recorded ${Object.keys(sortedManual).length})`,
  );
}

const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (invokedDirectly) {
  const argv = process.argv.slice(2);
  if (argv.includes("--guard")) runGuard();
  else if (argv.includes("--write")) {
    const rec = argv.find((a) => a.startsWith("--recorded="));
    runWrite(rec ? rec.slice("--recorded=".length) : "");
  } else if (argv.includes("--print=vitest")) {
    const list = readList();
    if (!list.vitest.length) { console.error("date-sensitive manifest has no vitest entries"); process.exitCode = 1; }
    else process.stdout.write(list.vitest.join("\n") + "\n");
  } else {
    console.error("usage: dateSensitive.mjs --guard | --print=vitest | --write [--recorded=<file>]");
    process.exitCode = 2;
  }
}
