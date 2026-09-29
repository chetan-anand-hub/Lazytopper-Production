// TEST CLOCK - one switch that moves "now" for every test process (TEST-CLOCK-SWEEP, wave A-5).
//
// With env `LT_TEST_CLOCK=<ISO instant>` set, the global `Date` is replaced by a thin wrapper
// whose "now" is that instant PLUS the real time elapsed since it was installed: the clock
// still TICKS, it is only shifted. With the env unset, NOTHING is installed and `Date` is the
// runtime's own constructor, untouched.
//
// WHY A SHIFTED Date AND NOT FAKE TIMERS. vitest 3.2.6 `vi.useFakeTimers()` silently does
// nothing while fake timers are already installed (FU-FAKE-TIMERS-SILENT-NOOP), and
// `vi.setSystemTime()` refuses to coexist with a later `useFakeTimers`. A global fake clock
// would therefore make every test's OWN pin (`vi.useFakeTimers({ now })`) a silent no-op. A
// shifted Date is not a fake timer: vitest's fake timers install over it (and read their
// default `now` from it), and restore it on `vi.useRealTimers()`. The test's own pin wins.
//
// Consumers:
//   - node suites: NODE_OPTIONS="--import <abs>/lazytopper/scripts/testClock/preload.mjs"
//   - vitest:      src/test/setup.ts (the single vitest setup file)
//   - CI / proof:  node scripts/testClock/selfCheck.mjs - exits 1 if the switch is set but
//                  not in effect (the silent no-op trap), and prints the effective now.
//
// The state lives on a global symbol, not in this module, because the preload (node's loader)
// and setup.ts (vite's module graph) load this file as TWO separate module instances. Install
// is idempotent across both.

export const TEST_CLOCK_ENV = "LT_TEST_CLOCK";
// The REAL instant (ms) that maps to LT_TEST_CLOCK. Written by the first process that installs
// the clock and inherited by every child process, so a whole process tree (vitest main ->
// workers, node --test -> spawned servers) reads ONE clock instead of each child restarting at
// the target - otherwise a child could stamp a time EARLIER than its parent already saw.
export const TEST_CLOCK_ANCHOR_ENV = "LT_TEST_CLOCK_ANCHOR";
const STATE_KEY = Symbol.for("lazytopper.testClock");

// The shifted clock must stay within this distance of the target to count as "in effect". Wide
// enough for the longest CI step (the clock ticks from the moment each process installs it),
// narrow enough that the real clock (years away from any sensible target) can never pass.
export const SELF_CHECK_TOLERANCE_MS = 24 * 60 * 60 * 1000;

/** The target instant in ms, or null when the switch is unset. Throws on a malformed value. */
export function readTestClockTarget(env = process.env) {
  const raw = env[TEST_CLOCK_ENV];
  if (raw === undefined || raw === "") return null;
  const ms = Date.parse(raw);
  if (!Number.isFinite(ms)) {
    throw new Error(`[test-clock] ${TEST_CLOCK_ENV}=${JSON.stringify(raw)} is not a parseable ISO instant`);
  }
  return ms;
}

/** The installed state on `target`, or undefined. */
export function getTestClockState(target = globalThis) {
  return target[STATE_KEY];
}

/**
 * Install the shifted clock on `target` (default: globalThis) so "now" reads `targetMs` and
 * ticks from there: "now" = targetMs + (real now - anchorMs). anchorMs defaults to the real now,
 * i.e. the clock starts at the target this instant. Idempotent: a second call keeps the first
 * installation.
 */
export function installTestClock(targetMs, target = globalThis, anchorMs = target.Date.now()) {
  const existing = target[STATE_KEY];
  if (existing) return existing;

  const NativeDate = target.Date;
  const offset = targetMs - anchorMs;
  const clockNow = () => NativeDate.now() + offset;

  // A function (not a class) so `Date()` called WITHOUT `new` still returns a string, as the
  // real one does. `Reflect.construct(..., new.target)` keeps subclasses of Date working.
  function TestClockDate(...args) {
    if (new.target === undefined) return new NativeDate(clockNow()).toString();
    return Reflect.construct(NativeDate, args.length === 0 ? [clockNow()] : args, new.target);
  }
  // Share the real prototype: `x instanceof Date` holds for dates made by either constructor.
  TestClockDate.prototype = NativeDate.prototype;
  Object.setPrototypeOf(TestClockDate, NativeDate);
  Object.defineProperty(TestClockDate, "name", { value: "Date" });
  Object.defineProperty(TestClockDate, "length", { value: NativeDate.length });
  TestClockDate.now = clockNow;
  TestClockDate.parse = NativeDate.parse;
  TestClockDate.UTC = NativeDate.UTC;

  const state = Object.freeze({ targetMs, NativeDate, TestClockDate });
  Object.defineProperty(target, STATE_KEY, { value: state, configurable: true });
  target.Date = TestClockDate;
  return state;
}

/**
 * Put the shifted Date back if something restored the NATIVE one over it. vitest captures the
 * native Date at load (before setup.ts runs), and `vi.useRealTimers()` after a bare
 * `vi.setSystemTime()` restores exactly that capture. A fake Date (a test's own pin) is left
 * alone. Returns true when it re-installed.
 */
export function ensureTestClock(target = globalThis) {
  const state = target[STATE_KEY];
  if (state && target.Date === state.NativeDate) {
    target.Date = state.TestClockDate;
    return true;
  }
  return false;
}

/**
 * Throws unless "now" (as `target.Date` reports it) is within tolerance of `targetMs`. Checks
 * BOTH `Date.now()` and `new Date()`, which are separate code paths in a Date replacement.
 */
export function assertTestClockInEffect(targetMs, target = globalThis) {
  const viaNow = target.Date.now();
  const viaNew = new target.Date().getTime();
  for (const [how, value] of [["Date.now()", viaNow], ["new Date()", viaNew]]) {
    if (!(Math.abs(value - targetMs) < SELF_CHECK_TOLERANCE_MS)) {
      throw new Error(
        `[test-clock] ${TEST_CLOCK_ENV}=${new Date(targetMs).toISOString()} is SET but NOT IN EFFECT: ` +
          `${how} reads ${new Date(value).toISOString()}. ` +
          `Node suites need NODE_OPTIONS="--import <abs path>/lazytopper/scripts/testClock/preload.mjs".`,
      );
    }
  }
  return viaNow;
}

/** Read the env and, when set, install + self-check. Returns the effective now, or null when unset. */
export function installTestClockFromEnv(env = process.env, target = globalThis) {
  const targetMs = readTestClockTarget(env);
  if (targetMs === null) return null;
  const inherited = Number(env[TEST_CLOCK_ANCHOR_ENV]);
  const anchorMs = Number.isFinite(inherited) && inherited > 0 ? inherited : target.Date.now();
  if (!(Number.isFinite(inherited) && inherited > 0)) env[TEST_CLOCK_ANCHOR_ENV] = String(anchorMs);
  installTestClock(targetMs, target, anchorMs);
  // A stale inherited anchor (> tolerance old) fails here, loudly, rather than drifting.
  return assertTestClockInEffect(targetMs, target);
}
