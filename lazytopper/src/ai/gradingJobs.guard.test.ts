// @vitest-environment node
/**
 * GRADING-JOBS-1 J2 — GUARD (contract v1.0 §2, §11): the signed-out free check and the single
 * checks (C&I single, HPQ, Quick Practice single — all through SolutionChecker or
 * /api/check-solution) never send the background-job opt-in. The runtime half (a free-check or
 * check-solution call handed a job sends no `Prefer`) is in gradingJobs.test.ts.
 *
 * Scoped run:
 *   pnpm exec vitest run src/ai/gradingJobs.guard.test.ts
 */
import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";

describe("GUARD — the free check and the single checks never send the opt-in", () => {
  const src = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");

  it("the free-check client and replay never reference the job client or the opt-in", () => {
    for (const p of ["../services/freeCheckClient.ts", "../services/freeCheckReplay.ts"]) {
      const s = src(p);
      expect(s).not.toMatch(/gradingJobs|respond-async|\bjob\s*:/);
    }
  });

  it("SolutionChecker (Quick Practice single, HPQ) never passes a job", () => {
    expect(src("../components/question/SolutionChecker.tsx")).not.toMatch(/gradingJobs|respond-async|\bjob\s*:/);
  });

  it("Check & Improve passes its ONE job only on the signed-in paper path, never with the free-check options", () => {
    const s = src("../pages/desktop/DesktopCheckImprovePage.tsx");
    expect(s.match(/\bjob\s*:\s*\{/g)).toHaveLength(1);
    expect(s).toMatch(/\.\.\.\(freeCallOpts\s*\?\s*\{\}\s*:\s*\{\s*job\s*:/);
  });
});
