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
    // WORKER CAP — paired with NODE_OPTIONS=--max-old-space-size=6144 on the CI
    // vitest step. Each worker gets its own module registry, so whichever suites
    // import src/data (10.7 MB, 480 files) duplicate that graph per worker.
    //
    // ★ POOL-AGNOSTIC ON PURPOSE. The first attempt used
    // `poolOptions.threads.maxThreads: 2` and was a SILENT NO-OP: vitest 3's
    // default pool is FORKS, not threads, so the threads key was ignored and
    // workers stayed at the default 4 — each now holding a 6144 MB ceiling, i.e.
    // exactly the 4 × 6144 = 24 GB case the comment below warns about. Run time
    // rose rather than fell, which is what more memory pressure looks like.
    // (Diagnosis: the crash stack showed ProcessWorker.send and
    // node:internal/child_process — the forks pool. A threads pool would surface
    // worker_threads instead. Note "[node (vitest 2)]" in a stack does NOT prove
    // the cap applied; it only names which worker died.)
    //
    // `maxWorkers`/`minWorkers` are honoured whichever pool is active, so this
    // cannot silently miss again if the pool default changes. The failure mode was
    // never "heap too small" — it was a pool-specific key that READ as active and
    // never fired. Same shape as the FORBIDDEN-path prefix bug: a setting that
    // looks like protection and cannot match.
    //
    // The runner has 16 GB and 4 vCPU. At 2 workers the worst case is 12 GB.
    // THESE TWO NUMBERS ARE ONE DECISION — raising the heap without a REAL worker
    // cap is worse than doing neither.
    //
    // If it OOMs again, drop to maxWorkers: 1 before raising the heap further:
    // serial is slow, but a slow gate beats a gate that cannot run.
    //
    // Deliberately NOT isolate:false. Sharing one module registry across files is
    // the biggest available win for a 10.7 MB data dir, but it invites exactly the
    // cross-test pollution this lane already hit once (a global `screen` query
    // finding a previous render's DOM and reporting a working gate as broken).
    // That is the durable fix and it needs its own investigation, not a footnote
    // in a heap bump. [FU-VITEST-CI-HEAP-CEILING]
    maxWorkers: 2,
    minWorkers: 1,
  },
});
