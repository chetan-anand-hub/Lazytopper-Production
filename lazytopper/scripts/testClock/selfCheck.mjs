// Test-clock self-check (CI). Run it with the SAME NODE_OPTIONS as the suites it guards:
//   - LT_TEST_CLOCK unset            -> prints "unset", exits 0 (nothing to check).
//   - set AND the preload is loaded  -> prints the effective now, exits 0.
//   - set but the preload is MISSING -> exits 1. This is the silent-no-op trap: without this
//     check a node suite would quietly run on the real clock and "pass at 2030" by never
//     being at 2030.
import { TEST_CLOCK_ENV, assertTestClockInEffect, getTestClockState, readTestClockTarget } from "./testClock.mjs";

try {
  const targetMs = readTestClockTarget();
  if (targetMs === null) {
    process.stdout.write(`[test-clock] ${TEST_CLOCK_ENV} unset - real clock, nothing to check\n`);
    process.exit(0);
  }
  if (!getTestClockState()) {
    throw new Error(
      `[test-clock] ${TEST_CLOCK_ENV} is SET but the preload is NOT LOADED in this process ` +
        `(NODE_OPTIONS=${JSON.stringify(process.env.NODE_OPTIONS ?? "")}).`,
    );
  }
  const now = assertTestClockInEffect(targetMs);
  process.stdout.write(
    `[test-clock] SELF-CHECK OK: ${TEST_CLOCK_ENV}=${process.env[TEST_CLOCK_ENV]} ` +
      `effective now=${new Date(now).toISOString()} (preload in effect)\n`,
  );
} catch (err) {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n[test-clock] SELF-CHECK FAILED\n`);
  process.exit(1);
}
