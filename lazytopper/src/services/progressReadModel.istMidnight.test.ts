/**
 * [FU-ME-PROGRESS-CONSISTENCY-IST-MIDNIGHT] — the G3 consistency pin holds at EVERY instant,
 * including the minutes just after an IST midnight (18:30Z), where `today` (the IST calendar day)
 * and Tutor sessions (one chapter per IST day) turn over.
 *
 * #968's fixture put its "today" activity 6–24 minutes before "now", so from 18:30Z to ~18:54Z
 * that activity fell on the PREVIOUS IST day and the pin went red (it turned #969's CI red at
 * 18:35Z). CI's own IST-midnight clock run sits at 18:45Z, inside the window by luck only. This
 * pin runs the whole consistency file under the test clock (LT_TEST_CLOCK, the same switch the
 * CI clock jobs use) at fixed instants straddling the boundary, so it cannot pass by timing.
 *
 * Mutation this file turns RED: I — the fixture's sub-hour offsets measured from "now" again
 * (`at = (h) => h * HOUR`): 18:30:00Z, 18:35Z and 18:44Z fail.
 */
import { describe, it, expect } from "vitest";
import { execFile } from "node:child_process";
import path from "node:path";

const LAZY = path.resolve(__dirname, "..", "..");
const VITEST = path.join(LAZY, "node_modules", "vitest", "vitest.mjs");
const FILE = "src/services/progressReadModel.consistency.test.tsx";
const INSTANTS = ["2026-10-07T18:29:59Z", "2026-10-07T18:30:00Z", "2026-10-07T18:35:00Z", "2026-10-07T18:44:00Z"];

function runAt(instant: string): Promise<{ code: number; out: string }> {
  return new Promise((resolve) => {
    execFile(
      process.execPath,
      [VITEST, "run", FILE],
      { cwd: LAZY, env: { ...process.env, LT_TEST_CLOCK: instant, NO_COLOR: "1", FORCE_COLOR: "0" }, maxBuffer: 32 * 1024 * 1024 },
      (err, stdout, stderr) => resolve({ code: err ? Number((err as { code?: number }).code ?? 1) : 0, out: `${stdout}\n${stderr}` }),
    );
  });
}

describe("G3 consistency pin across an IST midnight", () => {
  it(
    "★ the consistency file passes at every instant, with nothing skipped",
    async () => {
      // One child at a time: parallel children load the runner and make UI waits flaky.
      const results: Array<{ t: string; code: number; out: string }> = [];
      for (const t of INSTANTS) results.push({ t, ...(await runAt(t)) });
      for (const r of results) {
        const tests = r.out.match(/Tests\s+(\d+) passed \((\d+)\)/);
        expect({ instant: r.t, code: r.code, summary: tests?.[0] ?? r.out.slice(-1500) }).toEqual({
          instant: r.t,
          code: 0,
          summary: expect.stringMatching(/Tests\s+\d+ passed/),
        });
        // Every test ran: passed == collected (no skip, no todo hiding a failure).
        expect(tests![1]).toBe(tests![2]);
      }
    },
    300_000,
  );
});
