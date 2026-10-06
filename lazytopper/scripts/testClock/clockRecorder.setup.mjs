// CLOCK RECORDER — the RUNTIME half of the date-sensitive guard (CI-SPEED-1, decision D39).
//
// Registered as a vitest setup file (vitest.config.ts `setupFiles`), so it runs in front of EVERY
// test file of the NORMAL run. It wraps the global Date and notes, per test file, whether REPO
// code (lazytopper/src or lazytopper/server - product code OR the test itself) read the clock:
// `Date.now()`, `new Date()` with no argument, or `Date()` called as a function. When the file
// finishes (afterAll), a file that read the clock but is NOT in
// scripts/testClock/date-sensitive-tests.json FAILS - so a test that reaches the clock only
// THROUGH product code (a countdown component, a trial-expiry helper) is caught even though its
// own text never mentions Date. The static scan in dateSensitive.mjs cannot see that case.
//
// ★ CALL-SITE FILTER (why this does not flag "everything"). A read is attributed to the file only
//   when the IMMEDIATE caller of Date is repo source: the first stack frame outside this file must
//   be under lazytopper/src/ or lazytopper/server/ (and not node_modules, not src/test/setup).
//   React's scheduler, jsdom, testing-library and vitest itself read the clock constantly while
//   rendering a component that never asked for the time; their reads have a node_modules
//   immediate caller and are ignored. The project has no date library dependency (checked
//   2026-10-06), so there is no library-on-behalf-of-product-code case to unwrap; if one is added,
//   extend `isRepoFrame` to skip its frames.
//
// ★ NOT ACTIVE UNDER A TEST CLOCK. With LT_TEST_CLOCK set (the clock jobs) the shifted Date from
//   testClock.mjs owns the global and this file does nothing. LT_CLOCK_RECORDER=off disables it.
//
// ★ RECORD MODE. With LT_CLOCK_RECORD_OUT=<file>, every recording test file is APPENDED to that
//   file (one `path<TAB>call site` line) instead of failing - that is how the manifest is seeded:
//   `node scripts/testClock/dateSensitive.mjs --write --recorded=<file>`.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeEach, expect } from "vitest";
import { immediateCallerFrame, isRepoFrame } from "./clockRecorderFrames.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ANCHOR = path.resolve(HERE, "..", ".."); // lazytopper/
const LIST_PATH = path.join(HERE, "date-sensitive-tests.json");
const KEY = Symbol.for("lazytopper.clockRecorder");

const ENABLED = !process.env.LT_TEST_CLOCK && process.env.LT_CLOCK_RECORDER !== "off";

/** The first frame outside this file = the code that called Date. */
function immediateCaller() {
  const limit = Error.stackTraceLimit;
  Error.stackTraceLimit = 16;
  const stack = new Error().stack || "";
  Error.stackTraceLimit = limit;
  return immediateCallerFrame(stack);
}

function state() {
  return globalThis[KEY];
}

function note() {
  const s = state();
  if (!s || s.hit) return; // one hit per file is enough; stop paying for stacks after it
  const caller = immediateCaller();
  if (isRepoFrame(caller)) s.hit = caller.replace(/^at\s+/, "");
}

function makeRecordingDate(Base) {
  function RecordingDate(...args) {
    if (args.length === 0) note();
    if (new.target === undefined) return Base();
    return Reflect.construct(Base, args, new.target);
  }
  RecordingDate.prototype = Base.prototype;
  Object.setPrototypeOf(RecordingDate, Base);
  Object.defineProperty(RecordingDate, "name", { value: "Date" });
  Object.defineProperty(RecordingDate, "length", { value: Base.length });
  RecordingDate.now = () => { note(); return Base.now(); };
  RecordingDate.parse = Base.parse;
  RecordingDate.UTC = Base.UTC;
  return RecordingDate;
}

function install() {
  const s = state();
  // Re-install only over the NATIVE Date (e.g. after vi.useRealTimers restored it); a fake Date
  // installed by a test's own fake timers is left alone - that test pinned its own clock.
  if (globalThis.Date === s.RecordingDate) return;
  if (globalThis.Date === s.Base) globalThis.Date = s.RecordingDate;
}

if (ENABLED) {
  if (!globalThis[KEY]) {
    const Base = globalThis.Date;
    Object.defineProperty(globalThis, KEY, {
      value: { Base, RecordingDate: makeRecordingDate(Base), hit: "" },
      configurable: true,
    });
  }
  state().hit = ""; // this setup file runs once per test file
  install();
  beforeEach(() => install());

  afterAll(() => {
    const s = state();
    if (!s.hit) return;
    const testPath = expect.getState().testPath || "";
    const rel = path.relative(ANCHOR, testPath).split(path.sep).join("/");
    const out = process.env.LT_CLOCK_RECORD_OUT;
    if (out) {
      fs.appendFileSync(out, `${rel}\t${s.hit}\n`);
      return;
    }
    let listed = [];
    try { listed = JSON.parse(fs.readFileSync(LIST_PATH, "utf8")).vitest || []; } catch { /* missing list = nothing listed */ }
    if (!listed.includes(rel)) {
      throw new Error(
        `CLOCK_GUARD: ${rel} read the clock (first repo call site: ${s.hit}) but is NOT in ` +
          "lazytopper/scripts/testClock/date-sensitive-tests.json. The CI clock jobs run only that list, so this test " +
          "would never run at 2030 / IST midnight on a PR. Add it under manual.vitest (id -> reason) and run " +
          "`node lazytopper/scripts/testClock/dateSensitive.mjs --write`.",
      );
    }
  });
}
