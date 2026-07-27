import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Render-test config — kept SEPARATE from vite.config.ts on purpose.
// This drives `npm test` (Vitest) and must never pick up the Node `node:test`
// guard suite that lives in ../scripts. `include` is scoped to src so only
// real React render tests run here.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    // HEAP CAP — paired with NODE_OPTIONS=--max-old-space-size=6144 on the CI
    // vitest step. Each worker gets its own module registry, so whichever suites
    // import src/data (10.7 MB, 480 files) duplicate that graph per worker.
    //
    // The runner has 16 GB and 4 vCPU; vitest would default to 4 workers, and
    // 4 × 6144 = 24 GB OOMs the RUNNER rather than a worker. At 2 the worst case
    // is 12 GB. THESE TWO NUMBERS ARE ONE DECISION — raising the heap without
    // capping workers is worse than doing neither.
    //
    // If it OOMs again, drop to maxThreads: 1 before raising the heap further:
    // serial is slow, but a slow gate beats a gate that cannot run.
    //
    // Deliberately NOT isolate:false. Sharing one module registry across files is
    // the biggest available win for a 10.7 MB data dir, but it invites exactly the
    // cross-test pollution this lane already hit once (a global `screen` query
    // finding a previous render's DOM and reporting a working gate as broken).
    // That is the durable fix and it needs its own investigation, not a footnote
    // in a heap bump. [FU-VITEST-CI-HEAP-CEILING]
    poolOptions: {
      threads: {
        maxThreads: 2,
      },
    },
  },
});
