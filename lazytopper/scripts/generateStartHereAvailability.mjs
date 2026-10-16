/**
 * generateStartHereAvailability — QP-SCORECARD-2 D3. Emits / checks
 * `src/components/startHere/startHereAvailability.generated.ts`.
 *
 * USAGE (from `lazytopper/`):
 *
 *     node scripts/generateStartHereAvailability.mjs --write   # regenerate from the live bank
 *     node scripts/generateStartHereAvailability.mjs           # check only (exit 1 on drift)
 *
 * WHY IT RUNS THROUGH VITEST. The counts must come from the SAME function the card used to call
 * at runtime (`startHereAvailability` in startHereBank.ts) over the real bank, and that module
 * graph reads Vite's `import.meta.env` (firebaseClient via sessionRecords), which plain node
 * cannot evaluate. So this script runs the guard (the D3 block of startHereBank.test.ts, a file already in the
 * date-sensitive clock manifest), and the guard — when
 * START_HERE_AVAILABILITY_WRITE=1 — writes the file instead of asserting it. One computation,
 * one renderer (startHereAvailabilitySource.ts), no second rule.
 *
 * Tooling only: NOT imported by the app and never ships.
 */

import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const write = process.argv.includes("--write");
const vitest = resolve(root, "node_modules/vitest/vitest.mjs");
const res = spawnSync(
  process.execPath,
  [vitest, "run", "src/components/startHere/startHereBank.test.ts"],
  {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, ...(write ? { START_HERE_AVAILABILITY_WRITE: "1" } : {}) },
  },
);
process.exit(res.status ?? 1);
