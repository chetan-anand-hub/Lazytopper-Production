/**
 * generateCbqChapters — SPEED-HUB-1. Emits / checks
 * `src/components/practice/cbqChapters.generated.ts` (which chapters have real CBQs).
 *
 * USAGE (from `lazytopper/`):
 *
 *     node scripts/generateCbqChapters.mjs --write   # regenerate from the live bank
 *     node scripts/generateCbqChapters.mjs           # check only (exit 1 on drift)
 *
 * WHY IT RUNS THROUGH VITEST (the generateStartHereAvailability.mjs pattern). The answer must
 * come from the SAME function the chooser used to call at runtime (`chaptersWithCbqs` in
 * cbqAvailability.ts) over the real bank, and that module graph reads Vite's `import.meta.env`,
 * which plain node cannot evaluate. So this script runs the drift guard in
 * cbqAvailability.test.ts, and the guard — when CBQ_CHAPTERS_WRITE=1 — writes the file instead
 * of asserting it. One computation, one renderer (`renderCbqChaptersFile`), no second rule.
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
  [vitest, "run", "src/components/practice/cbqAvailability.test.ts", "-t", "SPEED-HUB-1"],
  {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, ...(write ? { CBQ_CHAPTERS_WRITE: "1" } : {}) },
  },
);
process.exit(res.status ?? 1);
