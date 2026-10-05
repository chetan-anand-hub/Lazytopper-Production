import { describe, it, expect } from "vitest";
import { buildCiCoaching } from "./CheckImproveGradedPrintDoc";

/**
 * SHEET-1v4 Step 7 — the aggregate coaching line must NAME a departure, and must never
 * tell a departure student to "show every step".
 *
 * WHY THIS EXISTS. A departure is a student who DID show their working and answered a
 * DIFFERENT question. The server (`checkSolution.cjs` `buildMistakeSummary`) charges it
 * ONCE, under its own `departure` kind, explicitly so it cannot land in `silly` and
 * trigger the "the method is there; show every step" copy. But the client derived the
 * aggregate line from counts ALONE and never read the departure — so the per-step
 * teacherNote named the departure while the summary line at the top of the SAME sheet
 * gave the opposite instruction. [FU-GRD-DEPARTURE-VOICE-NEEDS-SRC]
 *
 * ★ THREE call sites emitted that copy, not one:
 *   - the knowledge+careless branch  ("slow down and show every step")
 *   - the careless-only branch       ("show every step and check the final line")
 *   - the CLEAN branch               ("keep showing every step")
 * The third is the trap: the server zeroes the four ordinary counters at and below the
 * departure, so a departure at step 0 arrives with knowledge === 0 AND careless === 0
 * and would be congratulated on "Clean work".
 *
 * CONTROLS. Every `departure: 0` case below pins the EXACT pre-existing sentence. A1
 * required an ADDED branch, not a rewrite — if any control drifts, this was a rewrite.
 */

/** Every phrasing of the forbidden instruction, so a reworded regression still fails. */
const SHOW_EVERY_STEP = /show(ing)? every step/i;

/* SCORECARD-MI-1 — `buildCiCoaching` now speaks the owner's three groups from `counts`
 * (lib/mistakeDisplay). The departure rules above still hold, re-pinned on the new input. */
describe("buildCiCoaching — departure cases (Step 7)", () => {
  it("★ CO-OCCURRING: a departure alongside a knowledge gap AND a careless slip never says 'show every step'", () => {
    const line = buildCiCoaching({
      gradedMarksAwarded: 3,
      gradedMarksTotal: 5,
      counts: { conceptual: 2, calculation: 1, silly: 0, presentation: 0 },
      pendingCount: 0,
      departure: 1,
    });
    expect(line).not.toMatch(SHOW_EVERY_STEP);
    expect(line).toContain("solving a different question");
    // The other mistakes are still reported — a departure must not DISCARD real counts.
    expect(line).toContain("2 knowledge gaps");
    expect(line).toContain("1 careless slip");
  });

  it("★ PURE departure (no other counts) is not congratulated", () => {
    const line = buildCiCoaching({
      gradedMarksAwarded: 0,
      gradedMarksTotal: 5,
      counts: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
      pendingCount: 0,
      departure: 1,
    });
    expect(line).not.toMatch(SHOW_EVERY_STEP);
    expect(line).not.toMatch(/clean (work|sheet)/i);
    expect(line).not.toMatch(/full marks/i);
    expect(line).toContain("solving a different question");
  });

  it("the score sentence and the pending-pages sentence still surround a departure line", () => {
    const line = buildCiCoaching({
      gradedMarksAwarded: 1,
      gradedMarksTotal: 6,
      counts: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
      pendingCount: 2,
      departure: 1,
    });
    expect(line).toContain("You scored 1 of 6 on the work we could read.");
    expect(line).toContain("2 pending pages");
    expect(line).not.toMatch(SHOW_EVERY_STEP);
  });
});

describe("buildCiCoaching — the owner's three groups, counted in mistakes (B3/D2)", () => {
  it("names each group in the owner's words, with its unit", () => {
    const line = buildCiCoaching({
      gradedMarksAwarded: 15,
      gradedMarksTotal: 24,
      counts: { conceptual: 2, calculation: 1, silly: 1, presentation: 1 },
      notAttemptedCount: 1,
      pendingCount: 0,
    });
    expect(line).toContain("Learn this: 2 knowledge gaps");
    expect(line).toContain("The quickest wins: 1 exam-technique mistake");
    expect(line).toContain("You already know this: 2 careless slips");
    expect(line).toContain("1 question not attempted — not counted as a mistake.");
  });

  it("calculation is CARELESS, never a knowledge gap (P7 reversed)", () => {
    const line = buildCiCoaching({
      gradedMarksAwarded: 2,
      gradedMarksTotal: 3,
      counts: { conceptual: 0, calculation: 1, silly: 0, presentation: 0 },
      pendingCount: 0,
    });
    expect(line).toContain("1 careless slip");
    expect(line).not.toMatch(/knowledge gap/i);
  });

  it("★ GA-24 — marks lost with no type named is NEVER called clean", () => {
    const line = buildCiCoaching({
      gradedMarksAwarded: 0,
      gradedMarksTotal: 3,
      counts: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
      pendingCount: 0,
    });
    expect(line).not.toMatch(/clean (work|sheet)/i);
    expect(line).toContain("You lost 3 marks, and the examiner did not name a mistake type for them.");
  });

  it("CONTROL — a genuinely full-mark sheet says so (and only then)", () => {
    const line = buildCiCoaching({
      gradedMarksAwarded: 5,
      gradedMarksTotal: 5,
      counts: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
      pendingCount: 0,
    });
    expect(line).toContain("Full marks on everything graded");
  });
});

/* SCORECARD-MI-1 PR-2 (H2) — owner ruling 2026-10-05 (taxonomy and wording): the LEGACY
 * two-bucket input (knowledge = conceptual + calculation, careless = silly + presentation) is
 * GONE. Its only caller, the multi-question C&I page, passes the paper's counts. */
describe("buildCiCoaching — the pre-ruling two-bucket input is gone (H2)", () => {
  it("the two-bucket fields are not accepted (a typecheck failure if they come back)", () => {
    const line = buildCiCoaching({
      gradedMarksAwarded: 3,
      gradedMarksTotal: 5,
      counts: { conceptual: 0, calculation: 1, silly: 1, presentation: 0 },
      // @ts-expect-error — `knowledge` / `careless` no longer exist (H2).
      knowledge: 2,
      careless: 1,
      pendingCount: 0,
    });
    // The counts decide, in the owner's groups: calculation + silly are CARELESS.
    expect(line).toContain("You already know this: 2 careless slips");
    expect(line).not.toMatch(/knowledge gap|cost you marks/i);
  });

  it("★ GA-24 — counts of nothing with marks lost are never 'clean'", () => {
    const line = buildCiCoaching({
      gradedMarksAwarded: 0,
      gradedMarksTotal: 3,
      counts: null,
      pendingCount: 0,
    });
    expect(line).not.toMatch(/clean (work|sheet)/i);
    expect(line).toContain("You lost 3 marks");
  });
});
