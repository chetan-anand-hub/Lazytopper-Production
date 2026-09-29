// @vitest-environment node
//
// TEST CLOCK self-check (TEST-CLOCK-SWEEP). Proves the LT_TEST_CLOCK switch in the process this
// suite runs in, in BOTH modes, without a skip:
//   - unset -> Date is the runtime's own and reads the real clock;
//   - set   -> "now" reads the switch and ticks, and a test's own pin still wins.
// The real-clock reference is `performance.timeOrigin + performance.now()`, which the switch
// never touches (node environment on purpose: jsdom supplies its own `performance`).
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  SELF_CHECK_TOLERANCE_MS,
  TEST_CLOCK_ANCHOR_ENV,
  TEST_CLOCK_ENV,
  assertTestClockInEffect,
  ensureTestClock,
  getTestClockState,
  installTestClock,
  installTestClockFromEnv,
  readTestClockTarget,
} from "../../scripts/testClock/testClock.mjs";

const realNow = (): number => performance.timeOrigin + performance.now();
const switchMs = readTestClockTarget();
/**
 * What "now" should read in this process: the real clock when unset; when set, the switch plus
 * the real time since the process tree's anchor (the clock ticks from the FIRST install - in CI
 * that is the pnpm process that started vitest, minutes before this file runs).
 */
const expectedNow = (): number =>
  switchMs === null ? realNow() : switchMs + (realNow() - Number(process.env[TEST_CLOCK_ANCHOR_ENV]));
// Real-clock jitter between `performance` and `Date` only.
const NEAR_MS = 5_000;
const PIN = Date.parse("2027-02-17T04:30:00.000Z");

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

afterEach(() => {
  vi.useRealTimers();
});

describe("test clock - the live switch in this process", () => {
  it("reads LT_TEST_CLOCK when set, and the real clock (with nothing installed) when unset", () => {
    const now = Date.now();
    // Printed so a CI log shows the effective now the vitest workers ran at.
    console.info(`[test-clock] vitest ${TEST_CLOCK_ENV}=${process.env[TEST_CLOCK_ENV] ?? "(unset)"} effective now=${new Date(now).toISOString()}`);
    if (switchMs === null) {
      expect(getTestClockState()).toBeUndefined();
      expect(Math.abs(now - realNow())).toBeLessThan(5_000);
    } else {
      expect(getTestClockState()?.targetMs).toBe(switchMs);
      expect(Number(process.env[TEST_CLOCK_ANCHOR_ENV])).toBeGreaterThan(0);
      expect(Math.abs(now - switchMs)).toBeLessThan(SELF_CHECK_TOLERANCE_MS);
      expect(new Date().getFullYear()).toBe(new Date(switchMs).getFullYear());
    }
    expect(Math.abs(new Date().getTime() - expectedNow())).toBeLessThan(NEAR_MS);
  });

  it("ticks", async () => {
    const a = Date.now();
    await sleep(25);
    expect(Date.now() - a).toBeGreaterThanOrEqual(20);
  });

  it("a test's own vi.useFakeTimers({ now }) wins, and useRealTimers gives the switch back", () => {
    vi.useFakeTimers({ now: PIN, toFake: ["Date"] });
    expect(Date.now()).toBe(PIN);
    expect(new Date().toISOString()).toBe("2027-02-17T04:30:00.000Z");
    vi.useRealTimers();
    expect(Math.abs(Date.now() - expectedNow())).toBeLessThan(NEAR_MS);
  });

  it("a bare vi.useFakeTimers() starts from the switched now", () => {
    // Read the reference BEFORE faking: a bare useFakeTimers() also fakes `performance`.
    const expected = expectedNow();
    vi.useFakeTimers();
    expect(Math.abs(Date.now() - expected)).toBeLessThan(NEAR_MS);
  });

  it("a bare vi.setSystemTime() pin wins (1/2: pin; leaves vitest's native-Date capture behind on reset)", () => {
    vi.setSystemTime(PIN);
    expect(Date.now()).toBe(PIN);
    // afterEach -> vi.useRealTimers() restores vitest's capture of the NATIVE Date.
  });

  it("(2/2) the next test still reads the switch - setup.ts put the shifted Date back", () => {
    expect(Math.abs(Date.now() - expectedNow())).toBeLessThan(NEAR_MS);
  });
});

describe("test clock - the mechanism, on an isolated global", () => {
  const TARGET = Date.parse("2030-06-15T06:30:00.000Z");
  // An isolated stand-in for globalThis: the module only ever touches `.Date` and its own symbol.
  const makeGlobal = (): typeof globalThis => ({ Date: globalThis.Date }) as unknown as typeof globalThis;

  it("unset / empty -> null; malformed -> throws loudly", () => {
    expect(readTestClockTarget({})).toBeNull();
    expect(readTestClockTarget({ [TEST_CLOCK_ENV]: "" })).toBeNull();
    expect(readTestClockTarget({ [TEST_CLOCK_ENV]: "2030-06-15T06:30:00.000Z" })).toBe(TARGET);
    expect(() => readTestClockTarget({ [TEST_CLOCK_ENV]: "not-a-date" })).toThrow(/not a parseable ISO instant/);
  });

  it("installs a shifted Date that behaves like Date", async () => {
    const g = makeGlobal();
    const Before = g.Date;
    installTestClock(TARGET, g);
    expect(g.Date).not.toBe(Before);
    const D = g.Date;
    expect(Math.abs(D.now() - TARGET)).toBeLessThan(5_000);
    expect(Math.abs(new D().getTime() - TARGET)).toBeLessThan(5_000);
    // Explicit instants pass through untouched.
    expect(new D(0).toISOString()).toBe("1970-01-01T00:00:00.000Z");
    expect(new D(2026, 0, 2).getFullYear()).toBe(2026);
    expect(new D("2026-09-29T00:00:00.000Z").getTime()).toBe(Date.parse("2026-09-29T00:00:00.000Z"));
    expect(D.parse("2026-09-29T00:00:00.000Z")).toBe(Date.parse("2026-09-29T00:00:00.000Z"));
    expect(D.UTC(2030, 5, 15)).toBe(Date.UTC(2030, 5, 15));
    // Called without `new` it returns a string of "now", like the real one.
    expect((D as unknown as () => string)()).toMatch(/2030/);
    expect(new D()).toBeInstanceOf(Before);
    expect(new Before()).toBeInstanceOf(D);
    expect(D.name).toBe("Date");
    // Ticks.
    const a = D.now();
    await sleep(25);
    expect(D.now() - a).toBeGreaterThanOrEqual(20);
    expect(assertTestClockInEffect(TARGET, g)).toBeGreaterThanOrEqual(TARGET);
  });

  it("is idempotent, and ensureTestClock re-installs only over the NATIVE Date", () => {
    const g = makeGlobal();
    const first = installTestClock(TARGET, g);
    const second = installTestClock(Date.parse("2040-01-01T00:00:00.000Z"), g);
    expect(second).toBe(first);
    expect(g.Date).toBe(first.TestClockDate);

    g.Date = first.NativeDate; // what vitest's resetDate() does
    expect(ensureTestClock(g)).toBe(true);
    expect(g.Date).toBe(first.TestClockDate);

    const Pinned = class extends first.NativeDate {} as unknown as DateConstructor; // a test's own fake
    g.Date = Pinned;
    expect(ensureTestClock(g)).toBe(false);
    expect(g.Date).toBe(Pinned);
  });

  it("one clock per process tree: the first install writes the anchor, a child inherits it", () => {
    const parentEnv: Record<string, string | undefined> = { [TEST_CLOCK_ENV]: "2030-06-15T06:30:00.000Z" };
    const parent = makeGlobal();
    installTestClockFromEnv(parentEnv, parent);
    const anchor = Number(parentEnv[TEST_CLOCK_ANCHOR_ENV]);
    expect(Number.isFinite(anchor) && anchor > 0).toBe(true);

    // A child started 60 s after the anchor reads the target + 60 s, not the target.
    const childEnv = { ...parentEnv, [TEST_CLOCK_ANCHOR_ENV]: String(anchor - 60_000) };
    const child = makeGlobal();
    installTestClockFromEnv(childEnv, child);
    expect(child.Date.now() - TARGET).toBeGreaterThanOrEqual(60_000);
    expect(child.Date.now() - TARGET).toBeLessThan(70_000);

    // A stale anchor (older than the tolerance) fails loudly instead of drifting.
    const staleEnv = { ...parentEnv, [TEST_CLOCK_ANCHOR_ENV]: String(anchor - 2 * SELF_CHECK_TOLERANCE_MS) };
    expect(() => installTestClockFromEnv(staleEnv, makeGlobal())).toThrow(/is SET but NOT IN EFFECT/);
  });

  it("the self-check THROWS when the switch is set but not in effect (the silent no-op trap)", () => {
    const g = makeGlobal();
    const nativeFarFromTarget = Math.abs(g.Date.now() - TARGET) >= SELF_CHECK_TOLERANCE_MS;
    // Guard the premise (a CONTROL that cannot fail is not a control): only meaningful when the
    // Date in hand is far from 2030 - true for the native clock, and for any switch not in 2030.
    if (switchMs === null || Math.abs(switchMs - TARGET) >= SELF_CHECK_TOLERANCE_MS) {
      expect(nativeFarFromTarget).toBe(true);
      expect(() => assertTestClockInEffect(TARGET, g)).toThrow(/is SET but NOT IN EFFECT/);
    } else {
      const far = Date.parse("2001-01-01T00:00:00.000Z");
      expect(() => assertTestClockInEffect(far, g)).toThrow(/is SET but NOT IN EFFECT/);
    }
  });
});
