/**
 * CI-GREEN-1 [FU-CI-SHARD4-RPC-TIMEOUT] — let the vitest worker's event loop breathe after every test.
 *
 * WHY. A vitest worker reports to the main process over birpc with a FIXED 60 s timeout (vitest 3.2.7:
 * createRuntimeRpc passes no timeout option, so none is configurable). `onTaskUpdate` is sent at test
 * boundaries, but its reply is only read in the event loop's poll phase. The runner does not yield a
 * macrotask between tests, so a file of synchronous, CPU-heavy tests (the real question bank is large)
 * can run past 60 s on a loaded 4-worker runner without ever reaching the poll phase: the timer fires
 * first and the shard exits 1 with `[vitest-worker]: Timeout calling "onTaskUpdate"` AFTER every test
 * passed (runs 41016744399 shard 4 and 41024331694 shard 3, a different file each time).
 *
 * WHAT. One real `setImmediate` turn after each test. It changes nothing a test observes: no test is
 * skipped or reordered, no assertion touched, and it uses the REAL setImmediate captured at setup time,
 * so a test that installs fake timers cannot stall it. Cost: one loop turn per test (microseconds).
 * A single test that is itself longer than 60 s of synchronous work still needs its own yield.
 */
import { afterEach } from "vitest";

const realSetImmediate = globalThis.setImmediate;

afterEach(() => new Promise((resolve) => realSetImmediate(resolve)));
