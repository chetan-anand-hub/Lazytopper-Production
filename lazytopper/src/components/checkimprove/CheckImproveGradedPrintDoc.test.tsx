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

describe("buildCiCoaching — departure cases (Step 7)", () => {
  it("★ CO-OCCURRING: a departure alongside knowledge AND careless never says 'show every step'", () => {
    // This is the case a single-site fix passes while remaining broken: fixing only the
    // careless-only branch leaves the knowledge+careless branch emitting the copy.
    const line = buildCiCoaching({
      gradedMarksAwarded: 3,
      gradedMarksTotal: 5,
      knowledge: 2,
      careless: 1,
      pendingCount: 0,
      departure: 1,
    });
    expect(line).not.toMatch(SHOW_EVERY_STEP);
    expect(line).toContain("solving a different question");
    // The other mistakes are still reported — a departure must not DISCARD real counts.
    expect(line).toContain("2 knowledge gaps");
    expect(line).toContain("1 careless slip");
  });

  it("★ PURE departure (knowledge 0, careless 0) is not congratulated on 'Clean work'", () => {
    const line = buildCiCoaching({
      gradedMarksAwarded: 0,
      gradedMarksTotal: 5,
      knowledge: 0,
      careless: 0,
      pendingCount: 0,
      departure: 1,
    });
    expect(line).not.toMatch(SHOW_EVERY_STEP);
    expect(line).not.toContain("Clean work");
    expect(line).toContain("solving a different question");
    // Nothing is invented: with no other counts there is no "Before that" clause.
    expect(line).not.toContain("Before that");
  });

  it("a departure with careless only never says 'show every step'", () => {
    const line = buildCiCoaching({
      gradedMarksAwarded: 2,
      gradedMarksTotal: 5,
      knowledge: 0,
      careless: 1,
      pendingCount: 0,
      departure: 1,
    });
    expect(line).not.toMatch(SHOW_EVERY_STEP);
    expect(line).toContain("solving a different question");
    expect(line).toContain("1 careless slip");
  });

  it("a departure with knowledge only never says 'show every step'", () => {
    const line = buildCiCoaching({
      gradedMarksAwarded: 2,
      gradedMarksTotal: 5,
      knowledge: 3,
      careless: 0,
      pendingCount: 0,
      departure: 1,
    });
    expect(line).not.toMatch(SHOW_EVERY_STEP);
    expect(line).toContain("3 knowledge gaps");
  });

  it("the score sentence and the pending-pages sentence still surround a departure line", () => {
    const line = buildCiCoaching({
      gradedMarksAwarded: 1,
      gradedMarksTotal: 6,
      knowledge: 0,
      careless: 0,
      pendingCount: 2,
      departure: 1,
    });
    expect(line).toContain("You scored 1 of 6 on the work we could read.");
    expect(line).toContain("2 pages couldn't be read");
    expect(line).not.toMatch(SHOW_EVERY_STEP);
  });
});

describe("buildCiCoaching — CONTROLS: every no-departure branch is byte-identical", () => {
  it("CONTROL knowledge + careless is unchanged", () => {
    const line = buildCiCoaching({
      gradedMarksAwarded: 3,
      gradedMarksTotal: 5,
      knowledge: 2,
      careless: 1,
      pendingCount: 0,
      departure: 0,
    });
    expect(line).toBe(
      "You scored 3 of 5 on the work we could read. 2 knowledge gaps (revise the method) and 1 careless slip (slow down and show every step) cost you marks.",
    );
  });

  it("CONTROL knowledge only is unchanged", () => {
    const line = buildCiCoaching({
      gradedMarksAwarded: 3,
      gradedMarksTotal: 5,
      knowledge: 1,
      careless: 0,
      pendingCount: 0,
      departure: 0,
    });
    expect(line).toBe(
      "You scored 3 of 5 on the work we could read. 1 knowledge gap cost you marks — revise the underlying method, then re-attempt.",
    );
  });

  it("CONTROL careless only is unchanged", () => {
    const line = buildCiCoaching({
      gradedMarksAwarded: 4,
      gradedMarksTotal: 5,
      knowledge: 0,
      careless: 1,
      pendingCount: 0,
      departure: 0,
    });
    expect(line).toBe(
      "You scored 4 of 5 on the work we could read. 1 careless slip cost you marks — the method is there; show every step and check the final line.",
    );
  });

  it("CONTROL clean work is unchanged", () => {
    const line = buildCiCoaching({
      gradedMarksAwarded: 5,
      gradedMarksTotal: 5,
      knowledge: 0,
      careless: 0,
      pendingCount: 0,
      departure: 0,
    });
    expect(line).toBe(
      "You scored 5 of 5 on the work we could read. Clean work — keep showing every step so an examiner can award full method marks.",
    );
  });

  it("CONTROL an OMITTED departure behaves exactly like departure: 0", () => {
    // Proves the new parameter is genuinely optional, so the two existing call sites in
    // DesktopCheckImprovePage.tsx keep their current output until they are wired.
    const withZero = buildCiCoaching({
      gradedMarksAwarded: 4,
      gradedMarksTotal: 5,
      knowledge: 0,
      careless: 1,
      pendingCount: 0,
      departure: 0,
    });
    const omitted = buildCiCoaching({
      gradedMarksAwarded: 4,
      gradedMarksTotal: 5,
      knowledge: 0,
      careless: 1,
      pendingCount: 0,
    });
    expect(omitted).toBe(withZero);
    // …and it is still the OLD copy, which is the point of a control.
    expect(omitted).toMatch(SHOW_EVERY_STEP);
  });
});
