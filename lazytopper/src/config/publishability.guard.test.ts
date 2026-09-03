/**
 * publishability.guard.test.ts — THE TEST THE CONTRACT SHIPPED WITHOUT.
 *
 * ★ WHY THIS FILE EXISTS.
 * `publishability.ts` merged in #718 with no test importing its code half, and sat
 * on trunk for a day with a Rule 1 that could never fire: it tested `q.sources`, a
 * field NO row in the bank has. Every gate stayed green because no gate imported the
 * function. That is `[FU-CONTRACT-UNTESTED-ON-MERGE]`, and this file closes it.
 *
 * ⚠ FOUR DEFECTS SHIPPED IN THIS CONTRACT'S FIRST FIVE VERSIONS. Each block below
 * pins one of them, and the comment says which. A test whose failure mode is not
 * documented gets deleted by the next person who sees it go red.
 *
 * ★ EVERY ASSERTION RUNS AGAINST THE ASSEMBLED BANK, NOT A FIXTURE OBJECT.
 * A hand-built fixture cannot catch a rule that is inert against real data — that is
 * exactly how v1 passed review. These counts FAIL when the bank moves, which is the
 * point: a test fails when the world moves, a sentence in a doc does not.
 *
 * WHEN THESE COUNTS MOVE, FIND OUT WHY BEFORE EDITING THEM. They are pinned so
 * that a bank change is LOUD. #721 moved three of them and the cause was known
 * and intended. A count updated without a stated cause is drift being laundered
 * into a green suite - which is the exact failure this file exists to prevent.
 */

import { describe, it, expect } from "vitest";

import {
  isPublishable,
  demandsSuppliedFigure,
  stepMarks,
  DEMANDS_SUPPLIED_FIGURE,
} from "../../scripts/seo/publishability";
import {
  canonicalQuestionBank,
  AI_GENERATED_QUESTION_IDS,
} from "../data/canonicalQuestionBank";

const AI = AI_GENERATED_QUESTION_IDS;

/**
 * Fixture rows are looked up by id and THROW if absent — never skipped.
 * A silently-skipped fixture is a test that reports green while asserting nothing.
 * All ids below were verified present in the assembled bank at trunk a95493a1.
 */
function row(id: string) {
  const q = canonicalQuestionBank.find((x) => x.id === id);
  if (!q) throw new Error(`fixture row absent from bank: ${id}`);
  return q;
}

/** The figure rule reads the stem and the answer, never the solution steps. */
const figureScan = (id: string) => {
  const q = row(id);
  return `${q.questionText}\n${q.answer ?? ""}`;
};

// ---------------------------------------------------------------------------
// RULE 1 — PROVENANCE
// ---------------------------------------------------------------------------

describe("RULE 1 — provenance is an id-set, not a `sources` field", () => {
  /**
   * ★ THE ASSERTION THAT WOULD HAVE CAUGHT v1.
   * v1 took `aiPackSources: ReadonlySet<string>` and tested `(q.sources ?? [])`.
   * `AI_GENERATED_PACK_SOURCES` is arrays of question OBJECTS, not filenames, and
   * `CanonicalQuestion` has no `sources` field at all — so Rule 1 fired ZERO times
   * and would have published all 2,952 AI-generated rows: the exact inverse of its
   * purpose. A COUNT over the real bank cannot be fooled that way.
   *
   * If this number changes, the bank's AI population changed. Do not "fix" the test
   * by editing the number — find out which pack moved and why.
   */
  it("rejects exactly the 2,952 AI-generated rows", () => {
    const rejected = canonicalQuestionBank.filter((q) => {
      const v = isPublishable(q, AI);
      return !v.ok && v.reason === "ai-generated-source";
    });

    expect(rejected).toHaveLength(2952);
    expect(AI.size).toBe(2952);
    // 8,543 -> 8,673: #721 wired the ten .cfpq.ts files into the assembly array.
    // The files landed in #720 but nothing imported them, so the bank did not grow
    // until #721. Committed-but-unwired is MOUNT != LIVE: the rows existed and could
    // not reach a student or a page.
    expect(canonicalQuestionBank).toHaveLength(8673);
  });

  /**
   * The old Rule 4 (`fabricated-pyq-year`) was unreachable dead code behind Rule 1's
   * early return, and was folded in. This asserts the fold is SOUND: every fabricated
   * board attribution is inside the set Rule 1 rejects, so nothing escaped when the
   * separate check was deleted.
   */
  it("subsumes the old Rule 4 — all 364 fabricated attributions are inside the set", () => {
    const fabricated = canonicalQuestionBank.filter((q) => q.pyqYear && AI.has(q.id));
    expect(fabricated).toHaveLength(364);

    for (const q of fabricated) {
      const v = isPublishable(q, AI);
      expect(v.ok).toBe(false);
      expect((v as { reason: string }).reason).toBe("ai-generated-source");
    }
  });
});

// ---------------------------------------------------------------------------
// RULE 2 — STEP MARK ANNOTATION
// ---------------------------------------------------------------------------

describe("RULE 2 — both mark conventions are valid", () => {
  // Counting only the leading convention silently discards ~600 questions.
  it("reads leading and trailing annotations, and rejects neither-form", () => {
    expect(stepMarks("[2 marks] Substitute into the lens equation")).toBe(2);
    expect(stepMarks("[1 mark] State the law")).toBe(1);
    expect(stepMarks("Substitute into the lens equation [2]")).toBe(2);
    expect(stepMarks("[0.5 marks] Write the formula")).toBe(0.5);
    expect(stepMarks("Substitute into the lens equation")).toBeNull();
  });

  it("the addressable step-marking backlog is 2,488 rows", () => {
    /**
     * ★ NOT 5,105. The raw unmarked count is 5,105, but 2,102 of those are AI-pack
     * rows that Rule 1 rejects permanently and that policy says to RETIRE, not
     * repair — annotating them is work the contract throws away. This assertion
     * pins the number the content track actually works from.
     */
    const addressable = canonicalQuestionBank.filter((q) => {
      if (AI.has(q.id)) return false;
      const v = isPublishable(q, AI);
      return !v.ok && (v.reason === "unmarked-step" || v.reason === "no-solution-steps");
    });
    // 3,003 -> 3,013: 10 of the 130 newly-wired CFPQ rows arrive unmarked and join
    // the backlog. Still NOT 5,105 - 2,102 unmarked rows are legacy-ai, which Rule 1
    // rejects permanently and policy says to retire, not repair.
    // 3,013 -> 2,806: -207. STEPMARK-1 batch 1 (life-processes) mark-annotated 207 of
    // that topic's 228 addressable rows. The backlog shrinks by exactly the number
    // annotated because annotation is the only thing that clears "unmarked-step".
    // The remaining 21 life-processes rows are SKIPPED, not fixed: their existing
    // steps cannot sum to q.marks at CBSE 0.5-mark granularity (e.g. AR-LP-001..010
    // carry 4 steps on a 1-mark assertion-reason item; CASE-SCI-LP-001 carries 26
    // steps on 4 marks). Forcing them would require merging or splitting steps, which
    // the lane forbids. They are a content defect for a later lane.
    // 2,806 -> 2,646: -160. STEPMARK-1 batch 2 (chemical-reactions-and-equations)
    // mark-annotated 160 of that topic's 185 addressable rows. Same mechanism as batch 1:
    // the backlog shrinks by exactly the number annotated, because annotation is the only
    // thing that clears "unmarked-step". The remaining 25 rows are SKIPPED, not fixed --
    // same 0.5-granularity wall (CHEM-EXMPLR-1-MCQ-001..018 carry 3-5 steps on a 1-mark
    // MCQ; CHEM-EXMPLR-1-SA-010 carries 7 steps on 3 marks). No [0 mark] annotation was
    // used to force them: that is an open owner question, [FU-STEPMARK-ZERO-MARK-STEPS].
    // 2,646 -> 2,488: -158. STEPMARK-1 batch 3 (metals-and-non-metals) mark-annotated 158
    // of that topic's 173 addressable rows. Same mechanism as batches 1 and 2: the backlog
    // shrinks by EXACTLY the number annotated, because annotation is the only thing that
    // clears "unmarked-step". The remaining 15 rows are SKIPPED, not fixed -- the same
    // 0.5-granularity wall (METAL-NCERT-3-MCQ-001..004 and nine METAL-EXMPLR-3-MCQ rows
    // carry 3-5 steps on a 1-mark MCQ; PYQ-S-METAL-003 carries 47 steps on 4 marks).
    // THIRD topic in a row whose entire skip list is over-stepped 1-mark items:
    // [FU-STEPMARK-EXEMPLAR-MCQ-OVERSTEPPED] is a bank-wide authoring artefact, not
    // scattered accidents. No [0 mark] annotation was used to force them -- owner ruling 6
    // (2026-09-03) CLOSED [FU-STEPMARK-ZERO-MARK-STEPS] as REFUSED, so these rows are
    // permanently unrecoverable by annotation.
    expect(addressable).toHaveLength(2488);
  });
});

// ---------------------------------------------------------------------------
// RULE 5 — THE FIGURE RULE, BOTH DIRECTIONS OF C4
// ---------------------------------------------------------------------------

describe("RULE 5 — C4, both directions", () => {
  /**
   * ⚠ EVERY ASSERTION HERE CALLS `demandsSuppliedFigure` DIRECTLY, NEVER
   * `isPublishable`. Rule 5 runs LAST, so a row failing Rule 2 never reaches it.
   * `LIGHT-EXMPLR-9-MCQ-005` genuinely demands Figure 10.2 — but routed through
   * `isPublishable` it returns `unmarked-step`, and a control written that way would
   * pass while testing a completely different rule.
   */
  it("★ demonstrates the trap this suite avoids", () => {
    const v = isPublishable(row("LIGHT-EXMPLR-9-MCQ-005"), AI);
    expect(v.ok).toBe(false);
    expect((v as { reason: string }).reason).toBe("unmarked-step"); // NOT requires-absent-figure
    expect(demandsSuppliedFigure(figureScan("LIGHT-EXMPLR-9-MCQ-005"))).toBe(true);
  });

  /**
   * DIRECTION 1 — AN INSTRUCTION TO THE STUDENT IS NOT A FIGURE REFERENCE.
   * A naive filter banning "diagram" deleted all the genuine 2023 board questions
   * from the first generated page. Every gate stayed green.
   */
  it("publishes the four 2023 'draw a ray diagram' rows", () => {
    const rows = canonicalQuestionBank.filter(
      (q) =>
        !AI.has(q.id) &&
        /draw\s+(a|the)\s+ray\s+diagram/i.test(q.questionText) &&
        /2023/.test(String(q.pyqYear ?? "")),
    );
    expect(rows).toHaveLength(4);
    expect(rows.map((q) => q.id).sort()).toEqual([
      "PYQ-S-LIGHT-006",
      "PYQ-S-LIGHT-011",
      "PYQ-S-LIGHT-013",
      "PYQ-S-LIGHT-015",
    ]);

    /**
     * ⚠ ASSERTED ON THE FIGURE RULE ONLY. Two of these four fail `isPublishable`
     * for UNRELATED reasons — PYQ-S-LIGHT-006 and -015 carry Private-Use-Area glyph
     * damage from the P4 verbatim-PYQ import ([FU-BANK-GARBLED-EXPANDED-SCOPE]).
     * Asserting `ok: true` here would tie this control to a defect in another lane
     * and go red when RECOVER-1 lands. The control is about the FIGURE rule.
     */
    for (const q of rows) {
      expect(demandsSuppliedFigure(`${q.questionText}\n${q.answer ?? ""}`)).toBe(false);
    }
  });

  /**
   * DIRECTION 2 — A SUPPLIED ARTEFACT IS A DEPENDENCY.
   * `TRI-N-NCERT-6-SA-004` reads "In the figure, ODC ~ OBA, BOC = 125°, find DOC".
   * With no figure that is not a hard question, it is an UNANSWERABLE one — and v3
   * of the predicate published it.
   */
  it("rejects rows that genuinely need a supplied artefact", () => {
    expect(demandsSuppliedFigure(figureScan("TRI-N-NCERT-6-SA-004"))).toBe(true);
  });

  /**
   * INLINE DATA IS NOT A SUPPLIED ARTEFACT — the second costume of C4.
   * `BX-POLY-E-019` prints `t = 0, 1, 2, 3, 4 -> h = 0, 3, 4, 3, 0` in its own stem
   * and then says "From the table". A nominal rule rejected it and eight like it.
   */
  it("publishes a row whose 'table' is printed inline in its own stem", () => {
    expect(demandsSuppliedFigure(figureScan("BX-POLY-E-019"))).toBe(false);
    expect(isPublishable(row("BX-POLY-E-019"), AI).ok).toBe(true);
  });

  /**
   * PHYSICS VOCABULARY IS NOT A FILTER TOKEN — the third and fourth costumes.
   * "image" is the SUBJECT MATTER of Optics; "circuit" is the subject matter of
   * Electricity. Both were briefly filter tokens and both broke real rows.
   */
  it("does not treat 'image' or 'circuit' as artefact references", () => {
    expect(demandsSuppliedFigure(figureScan("CBE-S-LGHT-A-002"))).toBe(false);
    expect(demandsSuppliedFigure(figureScan("ELEC-NCERT-11-SA-027"))).toBe(false);
  });

  /**
   * AN IMPERATIVE TO CONSULT IS A DEPENDENCY BY CONSTRUCTION.
   * Requiring a position token uniformly let both of these publish in v3.
   * "Study the diagram" has no inline reading — a diagram is never prose.
   */
  it("rejects imperatives to consult an artefact", () => {
    expect(demandsSuppliedFigure(figureScan("SCQ-S-EYE-036"))).toBe(true);
    expect(demandsSuppliedFigure(figureScan("METAL-NCERT-3-VSA-006"))).toBe(true);
  });

  /** THE ARTEFACT IS THE ANSWER SET — the page cannot supply the options. */
  it("rejects 'which row of the table' rows", () => {
    expect(demandsSuppliedFigure(figureScan("CBE-S-ELEC-A-004"))).toBe(true);
  });

  /** The asymmetry, stated as a control: bare visual-only rejects, bare table does not. */
  it("distinguishes a bare visual-only artefact from a bare table", () => {
    expect(demandsSuppliedFigure("In the figure, ABC is right-angled at B")).toBe(true);
    expect(demandsSuppliedFigure("From the table, at which times is the height 0")).toBe(false);
    expect(demandsSuppliedFigure("From the table shown, read the median")).toBe(true);
  });

  /** A bare "as shown" with no artefact named is not a dependency. */
  it("publishes BX-ABS-E-002, whose 'as shown' names no artefact", () => {
    expect(demandsSuppliedFigure(figureScan("BX-ABS-E-002"))).toBe(false);
  });

  /** The figure rule must never read solutionSteps: authoring a solution must not
   *  un-publish a question. Step-marking 3,003 rows is the content track's largest
   *  job, and scanning steps would make that job remove rows from the site. */
  it("ignores solution steps entirely", () => {
    const q = { ...row("BX-POLY-E-019") };
    const withFigureInSolution = {
      ...q,
      solutionSteps: ["[4 marks] Read the values from the figure shown above."],
      marks: 4,
    };
    expect(isPublishable(withFigureInSolution, AI).ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// NO PATTERN IS DEAD CODE
// ---------------------------------------------------------------------------

describe("no pattern in DEMANDS_SUPPLIED_FIGURE is dead", () => {
  /**
   * ★ THE ASSERTION THAT WOULD HAVE CAUGHT PATTERN 5 IN v3 — and that catches one
   * more in v5. A pattern fully subsumed by an earlier one can never fire, reads as
   * a live check, and is invisible to every other test here. It is the same shape as
   * the old Rule 4: an unreachable branch behind a broader predicate.
   *
   * A pattern earns its place by being the SOLE matcher for at least one real row.
   * If this goes red, do not delete the assertion — find the subsuming pattern and
   * delete the dead one.
   */
  it("every pattern is the sole matcher for at least one real bank row", () => {
    const texts = canonicalQuestionBank.map(
      (q) => `${q.questionText}\n${q.answer ?? ""}`,
    );

    const dead = DEMANDS_SUPPLIED_FIGURE.map((rx, i) => {
      const isSole = texts.some(
        (t) => rx.test(t) && !DEMANDS_SUPPLIED_FIGURE.some((o, j) => j !== i && o.test(t)),
      );
      return isSole ? null : i;
    }).filter((i): i is number => i !== null);

    expect(dead).toEqual([]);
  });

  /** No pattern may be wholly subsumed by another, independent of what the bank
   *  happens to contain today. This is the structural form of the same check. */
  it("no pattern is wholly subsumed by another", () => {
    const texts = canonicalQuestionBank.map(
      (q) => `${q.questionText}\n${q.answer ?? ""}`,
    );
    for (let i = 0; i < DEMANDS_SUPPLIED_FIGURE.length; i++) {
      for (let j = 0; j < DEMANDS_SUPPLIED_FIGURE.length; j++) {
        if (i === j) continue;
        const iMatches = texts.filter((t) => DEMANDS_SUPPLIED_FIGURE[i].test(t));
        if (iMatches.length === 0) continue;
        const allAlsoJ = iMatches.every((t) => DEMANDS_SUPPLIED_FIGURE[j].test(t));
        expect(
          allAlsoJ,
          `pattern ${i} is wholly subsumed by pattern ${j} and can never fire`,
        ).toBe(false);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// RULE ORDER
// ---------------------------------------------------------------------------

describe("rule ORDER is load-bearing", () => {
  /**
   * Provenance must precede every content rule. An AI row with a defective solution
   * must report `ai-generated-source`, not `unmarked-step` — otherwise a content lane
   * reading the rejection reason would try to REPAIR a row that policy says to RETIRE.
   * 2,102 rows are in exactly that state.
   */
  it("provenance precedes the content rules", () => {
    const aiWithBadSteps = canonicalQuestionBank.filter(
      (q) => AI.has(q.id) && (q.solutionSteps ?? []).some((s) => stepMarks(s) === null),
    );
    expect(aiWithBadSteps).toHaveLength(2102);

    for (const q of aiWithBadSteps.slice(0, 50)) {
      const v = isPublishable(q, AI);
      expect(v.ok).toBe(false);
      expect((v as { reason: string }).reason).toBe("ai-generated-source");
    }
  });

  /** The figure rule runs last, so a figure-dependent row with unmarked steps
   *  reports the step failure. Pinned so the trap above stays visible. */
  it("the figure rule runs last", () => {
    const v = isPublishable(row("LIGHT-EXMPLR-9-MCQ-005"), AI);
    expect((v as { reason: string }).reason).toBe("unmarked-step");
  });
});

// ---------------------------------------------------------------------------
// THE HEADLINE NUMBER
// ---------------------------------------------------------------------------

describe("the publishable population", () => {
  /**
   * The number the SEO track builds from. It moves when the bank moves, and that is
   * intended — a derived value pinned in prose outlives the facts it came from; a
   * derived value pinned in a test fails loudly when they change.
   */
  it("2,851 rows are publishable today", () => {
    const publishable = canonicalQuestionBank.filter((q) => isPublishable(q, AI).ok);
    // 2,248 -> 2,333: +85. Of the 130 CFPQ rows wired by #721, 85 publish immediately,
    // 10 join the step-marking backlog and 35 are held by the figure rule. ~3.8% growth,
    // and the first time in this arc that BANK work moved this number: every earlier
    // gain came from correcting the predicate, not from adding rows.
    // 2,333 -> 2,538: +205. STEPMARK-1 batch 1 (life-processes) annotated 207 rows;
    // 205 of them become publishable and 2 do NOT, because those 2 are ALSO held by
    // Rule 5 (figure). That reconciliation is the batch's evidence: Rule 2 runs before
    // Rule 5, so a figure-dependent row reports "unmarked-step" and annotating it
    // clears the backlog without moving this count. 207 annotated - 2 figure-held
    // = 205. The bank length is UNCHANGED at 8,673 - this lane authors no rows.
    // 2,538 -> 2,695: +157. STEPMARK-1 batch 2 (chemical-reactions-and-equations)
    // annotated 160 rows; 157 become publishable and 3 do NOT, because those 3 are ALSO
    // held by Rule 5 (figure): PYQ-S-2025-CHEMRXN-011, PYQ-S-2024-CHEMRXN-011 and
    // CFPQ-S-CHEM-005. Rule 2 runs before Rule 5, so a figure-dependent row reports
    // "unmarked-step" and annotating it clears the backlog without moving this count.
    // 160 annotated - 3 figure-held = 157, which is the batch's reconciliation and its
    // 2,695 -> 2,851: +156. STEPMARK-1 batch 3 (metals-and-non-metals) annotated 158 rows;
    // 156 become publishable and 2 do NOT, because those 2 are ALSO held by Rule 5 (figure):
    // METAL-NCERT-3-VSA-006 and PYQ-S-2026-METAL-005. Rule 2 runs before Rule 5, so a
    // figure-dependent row reports "unmarked-step" and annotating it clears the backlog
    // without moving this count. 158 annotated - 2 figure-held = 156, which is the batch's
    // reconciliation and its only evidence. Bank length UNCHANGED at 8,673 - this lane still
    // authors no rows.
    expect(publishable).toHaveLength(2851);
  });

  it("no publishable row is AI-generated — the property retirement depends on", () => {
    const leaked = canonicalQuestionBank.filter(
      (q) => isPublishable(q, AI).ok && AI.has(q.id),
    );
    expect(leaked).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// THE ACHIEVABLE CEILING — OWNER RULING 5, 2026-09-03
// ---------------------------------------------------------------------------

/**
 * ★ ONE NUMBER, DEFINED IN WORDS, SO THAT NO THIRD NUMBER CAN APPEAR.
 *
 * Two figures were in circulation and they do NOT measure the same thing. Both are
 * derived here from the assembled bank rather than quoted, because a number quoted
 * without its recipe cannot be re-checked.
 *
 *   5,244 = publishable + addressable - (addressable rows Rule 5 holds for a figure)
 *           "every remaining addressable row can be annotated." It counts a row that
 *           can NEVER be annotated without asserting a step earns nothing.
 *
 *   4,822 = publishable + addressable - |figure-held UNION cannot-sum|
 *           "every addressable row that can be annotated WITHOUT a [0 mark] step,
 *            and that Rule 5 does not hold, becomes publishable."
 *
 * ★ 4,822 IS THE AUTHORITATIVE ACHIEVABLE FIGURE. Owner ruling 6 (2026-09-03) CLOSED
 * [FU-STEPMARK-ZERO-MARK-STEPS] as REFUSED, so the cannot-sum rows are permanently
 * unrecoverable by annotation and 5,244 overstates what this track can reach.
 *
 * ⚠ THE TWO EXCLUDED SETS OVERLAP; THEY ARE NOT DISJOINT AND NEITHER IS NESTED.
 * 24 addressable rows are BOTH figure-held AND cannot-sum. Subtracting the two counts
 * independently double-counts those 24 and yields 4,798, which is wrong. The gap
 * 5,244 - 4,822 = 422 is therefore NOT the cannot-sum count (that is 446) -- it is
 * the cannot-sum rows that are not ALREADY excluded as figure-held: 446 - 24 = 422.
 *
 * ★ BOTH FIGURES ARE INVARIANT UNDER THIS LANE'S OPERATION, which is why they still
 * measure the same after three batches. Annotating a non-figure row moves one row from
 * `addressable` to `publishable`; annotating a figure-held row removes it from
 * `addressable` and from the figure-held set at once. Either way the expression is
 * conserved. A batch that MOVES these numbers has done something other than annotate.
 */
describe("the achievable ceiling — ruling 5", () => {
  const figureHeld = (q: (typeof canonicalQuestionBank)[number]) =>
    Boolean((q as { requiresDiagram?: boolean }).requiresDiagram) ||
    demandsSuppliedFigure(`${q.questionText}\n${q.answer ?? ""}`);

  /** A row can be annotated iff its unmarked steps can each take at least 0.5 and
   *  the remainder lands on the 0.5 grid. `[0 mark]` is refused (ruling 6). */
  const canBeAnnotated = (q: (typeof canonicalQuestionBank)[number]) => {
    const steps = q.solutionSteps ?? [];
    if (steps.length === 0) return false;
    const existing = steps.map(stepMarks);
    const unmarked = existing.filter((m) => m === null).length;
    if (unmarked === 0) return false;
    const remaining = q.marks - existing.reduce((a: number, m) => a + (m ?? 0), 0);
    return (
      remaining >= 0.5 * unmarked - 1e-9 &&
      Math.abs(remaining * 2 - Math.round(remaining * 2)) < 1e-9
    );
  };

  it("4,822 is the achievable publishable ceiling, and 5,244 is not", () => {
    const publishable = canonicalQuestionBank.filter((q) => isPublishable(q, AI).ok).length;
    const addressable = canonicalQuestionBank.filter((q) => {
      if (AI.has(q.id)) return false;
      const v = isPublishable(q, AI);
      return !v.ok && (v.reason === "unmarked-step" || v.reason === "no-solution-steps");
    });

    const held = addressable.filter(figureHeld).length;
    const cannotSum = addressable.filter((q) => !canBeAnnotated(q)).length;
    const excluded = addressable.filter((q) => figureHeld(q) || !canBeAnnotated(q)).length;

    // the two excluded sets OVERLAP by 24 — this is the assertion the controller's
    // arithmetic would have got wrong, and it is why 4,822 is not 5,244 minus 446.
    expect(held + cannotSum - excluded).toBe(24);
    expect(cannotSum).toBe(446);
    expect(cannotSum - 24).toBe(422);

    // ✗ NOT the achievable figure: ignores that 422 rows can never be annotated.
    expect(publishable + addressable.length - held).toBe(5244);

    // ★ THE AUTHORITATIVE ACHIEVABLE FIGURE.
    expect(publishable + addressable.length - excluded).toBe(4822);
  });
});
