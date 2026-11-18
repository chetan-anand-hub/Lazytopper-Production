#!/usr/bin/env node
// TEST-SERIES-1 — regenerate lazytopper/server/data/testSeriesPapers.json (the Test Series paper manifest).
// The papers are drawn from the question bank through the app's own blueprints, which load under vitest, so this runs the guard
// test in write mode. Cross-platform (no shell env syntax): `pnpm --filter lazytopper run gen:test-series-manifest`.
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const r = spawnSync("pnpm", ["exec", "vitest", "run", "src/lib/testSeries/paperManifest.guard.test.ts"], {
  cwd: ROOT,
  stdio: "inherit",
  shell: process.platform === "win32",
  env: { ...process.env, LT_WRITE_TEST_SERIES_MANIFEST: "1" },
});
process.exit(r.status ?? 1);
