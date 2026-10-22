/**
 * CI-SPEED-3 (2026-10-22) — run each shard's SLOWEST test files FIRST (CI only; vitest.config.ts
 * wires it when process.env.CI === "true").
 *
 * WHY. vitest's default BaseSequencer orders files by its local results cache, and with no cache (every
 * fresh CI runner) by FILE SIZE. A slow but small file therefore starts last: in trial run 39699574730
 * `src/config/noRepeatInSet.guard.test.ts` (137 s) started 203 s into its shard and ran alone on one of
 * four workers to the end, making that shard 340 s against ~260 s for its siblings. Starting the
 * longest files first (longest-processing-time order, the same rule ci_shard_plan.mjs bins by) keeps
 * every worker busy until the end.
 *
 * ORDER ONLY — NEVER WHICH FILES. sort() returns exactly the files vitest handed it, reordered; files
 * keep vitest's default isolation (one module registry per file), so order cannot leak state between
 * files. The aggregate still fails unless the shards together ran every test file on disk.
 */

import path from "node:path";
import { BaseSequencer } from "vitest/node";
import { orderSlowestFirst, readDurations } from "./ci_shard_plan.mjs";

export class SlowestFirstSequencer extends BaseSequencer {
  async sort(files) {
    const root = this.ctx.config.root;
    const rel = (spec) => path.relative(root, spec.moduleId).replace(/\\/g, "/");
    const byRel = new Map(files.map((spec) => [rel(spec), spec]));
    const ordered = orderSlowestFirst([...byRel.keys()], readDurations());
    // Fail safe: if keys collided (two specs, one relative path), keep vitest's own order.
    if (ordered.length !== files.length) return super.sort(files);
    return ordered.map((k) => byRel.get(k));
  }
}
