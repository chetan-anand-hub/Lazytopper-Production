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
 *
 * ★★ PIN PHILOSOPHY (PR-3): FLOORS, CEILINGS AND IDENTITIES — NOT EQUALITIES.
 *
 * Every population this file measures has a DOCTRINE DIRECTION, and the pin on it
 * is the bound in that direction:
 *
 *   FLOOR   (toBeGreaterThanOrEqual)  for what must only GROW:
 *           human rows, publishable rows, the two achievable ceilings, the rows the
 *           figure escape frees.
 *   CEILING (toBeLessThanOrEqual)     for what must only SHRINK:
 *           AI-generated rows (owner ruling: they are RETIRED, never repaired), the
 *           fabricated board attributions inside them, AI rows with unmarked steps,
 *           the addressable backlog, the cannot-sum rows, the held/cannot-sum overlap.
 *   IDENTITY (toBe, computed on both sides, NO literal) for every PARTITION:
 *           ok + each rejection reason = bank; AI-rejected + human = bank; the
 *           escape delta = the escaped set; the ceiling gap = the excluded-set gap.
 *
 * WHY. With exact literals, EVERY content PR — a STEPMARK batch, a figure binding,
 * a chapter wiring — had to re-pin this one file, so every lane in the arc was
 * serialised through it. A content PR that moves a count in the doctrine direction
 * now needs NO edit here: annotate 150 rows and `publishable` rises past its floor
 * while `addressable` falls under its ceiling, and both stay green. A move AGAINST
 * the direction — publishable falling, AI rows growing, the backlog growing — is
 * the red this file exists for, and the PR that causes it must state why and
 * re-pin with a reconciliation, exactly as the histories below do.
 *
 * ⚠ A FLOOR CAN GO STALE UPWARD without going red: if publishable reaches 4,000 the
 * floor of 3,144 still passes and protects less. Raising a floor is cheap and
 * should ride along with any PR that moves the number — it is not required, which
 * is the point, but a floor far below the live count is a weaker guard. The
 * IDENTITIES are what never weaken: a partition that stops summing to the bank is
 * red at any size.
 *
 * ⚠ THE LITERAL IN EACH BOUND IS THE LIVE VALUE AT THE PIN, stated with its date
 * and cause, so the next reader can see how far the population has moved since.
 */

import { describe, it, expect } from "vitest";

import {
  isPublishable,
  demandsSuppliedFigure,
  defaultHasBoundFigure,
  stepMarks,
  DEMANDS_SUPPLIED_FIGURE,
} from "../../scripts/seo/publishability";
import {
  canonicalQuestionBank,
  RAW_CANONICAL_QUESTION_BANK,
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
   *
   * ★ PR-3 — MONOTONE PINS. The AI population is SHRINK-ONLY by owner ruling (AI rows
   * are retired, never repaired), so it carries a CEILING of 2,952, the live value at
   * the pin. The identity `rejected.length === AI.size` is EXACT and literal-free: it
   * proves every AI id names a row in the bank AND that Rule 1 rejects every one of
   * them — the assertion that would have caught v1, kept in a form no content PR has
   * to touch. Human rows (bank minus AI) are GROW-ONLY and carry a FLOOR of 5,710,
   * the live value at the pin (8,662 - 2,952). The two together partition the bank,
   * asserted as an identity below.
   */
  it("rejects every AI-generated row; the AI population only shrinks, human rows only grow", () => {
    const rejected = canonicalQuestionBank.filter((q) => {
      const v = isPublishable(q, AI);
      return !v.ok && v.reason === "ai-generated-source";
    });
    const human = canonicalQuestionBank.filter((q) => !AI.has(q.id));

    // IDENTITY — every AI id is in the bank and Rule 1 rejects each one.
    expect(rejected).toHaveLength(AI.size);
    // CEILING — AI rows are retired, never added. 2,952 at PR-3 (2026-09-11).
    expect(AI.size).toBeLessThanOrEqual(2952);
    // FLOOR — human rows are authored and wired, never lost. 5,710 at PR-3.
    // 5,710 -> 5,689: -21. LIGHT-FIX-1 (2026-09-11) withheld 21 light rows the skeptic disproved
    // (14 placeholder/spliced solutions, 6 garbled stems/solutions, LIGHT-EXMPLR-9-MCQ-004 answer-mismatch).
    expect(human.length).toBeGreaterThanOrEqual(5689);
    // IDENTITY — AI-rejected and human rows partition the bank.
    expect(rejected.length + human.length).toBe(canonicalQuestionBank.length);
    // 8,543 -> 8,673: #721 wired the ten .cfpq.ts files into the assembly array.
    // The files landed in #720 but nothing imported them, so the bank did not grow
    // until #721. Committed-but-unwired is MOUNT != LIVE: the rows existed and could
    // not reach a student or a page.
    // 8,673 -> 8,638: QUARANTINE-1 withheld 35 glyph-damaged rows that step-marking had
    // made publishable. Data-only and reversible: the rows stay intact in their packs and
    // RECOVER-1 removes each id from WITHHELD_QUESTION_IDS as it repairs that row from the
    // source paper, so this count walks back UP to 8,673 one row at a time. -35 exactly,
    // matched by the publishable count below; if these two ever move by DIFFERENT amounts,
    // a withheld row was not publishable and the withheld list is measuring something
    // other than what it claims.
    // 8,638 -> 8,662: +24. BANK-1 PR-2 wired the two MATHS CFPQ chapters — real-numbers
    // (10 rows) and polynomials (14) — into the assembly array. Exactly the #721 story
    // repeating on the maths side: the files landed in #733 and #740 and this file
    // imported ZERO maths *.cfpq.ts, so 24 rows sat on trunk reaching no student and no
    // gate. Measured by runtime import before the change, not assumed: both id prefixes
    // returned 0 rows. Committed is not live.
    // ★ The PUBLISHABLE count below moves by +17, NOT +24, and the two numbers are
    // SUPPOSED to differ here — see its comment. A row delta is not a publishable delta.
    // 8,662 at PR-3 — no longer pinned exactly. The bank length is AI (ceiling) + human
    // (floor), both asserted above, and the partition identity ties them to it. A wiring
    // PR that grows the bank now needs no edit here; a PR that LOSES human rows goes red.
  });

  /**
   * The old Rule 4 (`fabricated-pyq-year`) was unreachable dead code behind Rule 1's
   * early return, and was folded in. This asserts the fold is SOUND: every fabricated
   * board attribution is inside the set Rule 1 rejects, so nothing escaped when the
   * separate check was deleted.
   */
  it("subsumes the old Rule 4 — every fabricated attribution is inside the set (at most 364)", () => {
    const fabricated = canonicalQuestionBank.filter((q) => q.pyqYear && AI.has(q.id));
    // CEILING — fabricated attributions live only inside the AI set, which is retired
    // and never grows. 364 at PR-3 (2026-09-11). The loop below is the actual property.
    expect(fabricated.length).toBeLessThanOrEqual(364);

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

  /**
   * ★ HALF-1 — THE GLYPH THE PARSER COULD NOT READ. CBSE schemes print a half mark as
   * `½` (U+00BD) and the bank carries it verbatim. Before HALF-1 the mark token was
   * digits-only, so `[½ mark]` read as NO annotation: 15 human rows whose steps DO sum
   * to `marks` reported `unmarked-step` — a false reason string, and 15 rows sitting in
   * the addressable backlog that no STEPMARK lane could clear, because they were
   * already annotated. The unit cases pin the parse in isolation; the synthetic rows
   * pin that a half mark SUMS like any other; the id list further down is the positive
   * control against the assembled bank.
   */
  it("★ HALF-1: reads the ½ glyph as 0.5 and a mixed number as n + 0.5, in both conventions", () => {
    expect(stepMarks("[½ mark] (i) Convex mirror is preferred as a rear view mirror.")).toBe(0.5);
    expect(stepMarks("[½ marks] the plural is tolerated, as for digits")).toBe(0.5);
    expect(stepMarks("[ ½ mark ] inner whitespace, as for digits")).toBe(0.5);
    expect(stepMarks("Σf = 20 [½]")).toBe(0.5);
    expect(stepMarks("[1½ marks] a mixed number, leading")).toBe(1.5);
    expect(stepMarks("a mixed number, trailing [2½]")).toBe(2.5);
    // The decimal spellings are untouched — they remain the bank's majority form.
    expect(stepMarks("[0.5 mark] Write the formula")).toBe(0.5);
    expect(stepMarks("[1.5 marks] Substitute")).toBe(1.5);
    expect(stepMarks("[1 mark] State the law")).toBe(1);
    // Only the glyph is a mark. `1/2` and `half` are prose and stay unparsed.
    expect(stepMarks("[1/2 mark] not the glyph")).toBeNull();
    expect(stepMarks("[half mark] not the glyph")).toBeNull();
    // A ½ outside a bracket annotation is not read as one — the second string is a
    // real AI-pack rubric note.
    expect(stepMarks("½ of the class passed")).toBeNull();
    expect(stepMarks("[Deduct ½ mark if direction of rays is not marked]")).toBeNull();
  });

  it("★ HALF-1: half marks SUM like any other — two halves publish a 1-mark row, three do not", () => {
    const noAi = new Set<string>();
    const unbound = { hasBoundFigure: () => false };
    const synth = (marks: number, steps: string[]) => ({
      id: `HALF-1-SYNTH-${marks}-${steps.length}`,
      questionText: "Name the hydrocarbon that will not decolourise bromine water.",
      marks,
      solutionSteps: steps,
    });
    expect(
      isPublishable(synth(1, ["[½ mark] hexane", "[½ mark] Only hexane will not decolourise bromine water."]), noAi, unbound),
    ).toEqual({ ok: true });
    expect(
      isPublishable(synth(2, ["[1½ marks] working", "[½ mark] answer with unit"]), noAi, unbound),
    ).toEqual({ ok: true });
    // Three halves on a 1-mark item reach Rule 3 and fail it. On trunk's parser the
    // same row was `unmarked-step` at step 1: reaching Rule 3 at all is the change.
    expect(isPublishable(synth(1, ["[½ mark] a", "[½ mark] b", "[½ mark] c"]), noAi, unbound)).toEqual({
      ok: false,
      reason: "marks-do-not-sum",
      detail: "1.5 vs 1",
    });
  });

  /**
   * The 15 rows, enumerated so the list IS the claim. Each is looked up by id and
   * THROWS if absent. Rule 2 is the assertion — none may report `unmarked-step` — and
   * because every one of their step lists sums to `marks`, none may report
   * `marks-do-not-sum` either. Rule 5 is deliberately NOT asserted: 5 of the 15 demand
   * a figure (CFPQ-S-LGHT-014, -018, SQP-S-2025-LGHT-033, CFPQ-S-CTRL-005,
   * CFPQ-S-ELEC-008) and all 5 are bound as of 2026-09-11, but binding is the figure
   * lane's property, not this parser's.
   *
   * Pinned as a SUBSET, not an equality: a content PR that lands a 16th `[½ mark]` row
   * must not have to edit this file (PR-3 pin philosophy). The bank-wide invariant that
   * follows covers that 16th row without naming it.
   */
  const HALF_MARK_ROWS = [
    // light-reflection-and-refraction (7)
    "FND-L-SPQ-010",
    "FND-L-SPQ-016",
    "CFPQ-S-LGHT-012",
    "CFPQ-S-LGHT-013",
    "CFPQ-S-LGHT-014",
    "CFPQ-S-LGHT-018",
    "SQP-S-2025-LGHT-033",
    // control-and-coordination (4)
    "SQP-S-2023-CTRL-B-001",
    "CFPQ-S-CTRL-005",
    "CFPQ-S-CTRL-008",
    "CFPQ-S-CTRL-011",
    // carbon-and-its-compounds (2)
    "CFPQ-S-CARB-006",
    "CFPQ-S-CARB-019",
    // real-numbers (1)
    "CBE-M-RN-B-004",
    // electricity (1)
    "CFPQ-S-ELEC-008",
  ] as const;
  const LEADING_HALF = /^\s*\[\s*\d*½\s*marks?\s*\]/i;

  it("★ HALF-1 positive control: the 15 bank rows carrying [½ mark] pass Rule 2 and Rule 3", () => {
    expect(HALF_MARK_ROWS).toHaveLength(15);
    for (const id of HALF_MARK_ROWS) {
      const q = row(id);
      const steps = q.solutionSteps ?? [];
      // The control must still have its subject: a leading ½ glyph on at least one step.
      expect(steps.some((s) => LEADING_HALF.test(s)), `${id} no longer carries a leading [½ mark]`).toBe(true);
      // Rule 2 in isolation — every step parses.
      expect(steps.map(stepMarks).every((m) => m !== null), `${id} has a step the parser cannot read`).toBe(true);
      // Through the predicate — neither step-marking reason may fire.
      const v = isPublishable(q, AI);
      const reason = v.ok ? "ok" : v.reason;
      expect(reason, `${id}: ${reason}`).not.toBe("unmarked-step");
      expect(reason, `${id}: ${reason}`).not.toBe("marks-do-not-sum");
    }
    // Every one of the 15 is a live human row with the glyph (subset, not equality).
    const live = canonicalQuestionBank
      .filter((q) => !AI.has(q.id) && (q.solutionSteps ?? []).some((s) => LEADING_HALF.test(s)))
      .map((q) => q.id);
    expect(live).toEqual(expect.arrayContaining([...HALF_MARK_ROWS]));
  });

  /**
   * ★ THE INVARIANT BEHIND THE 15, LITERAL-FREE. A step whose annotation is spelled the
   * way the bank spells them — a bracket holding digits, a decimal or the ½ glyph, in
   * either convention — must parse. If any human row has every step spelled that way
   * and still reports `unmarked-step`, the parser has a gap of exactly HALF-1's kind,
   * whichever row and whichever spelling. This is the assertion that would have been
   * red on trunk for the 15 without naming one of them.
   */
  it("★ HALF-1 invariant: no human row spelled entirely in the bank's annotation forms is `unmarked-step`", () => {
    const SPELLED = /^\s*\[\s*[\d.½]+\s*marks?\s*\]|\[\s*[\d.½]+\s*\]\s*$/i;
    const gaps = canonicalQuestionBank.filter((q) => {
      if (AI.has(q.id)) return false;
      const steps = q.solutionSteps ?? [];
      if (steps.length === 0 || !steps.every((s) => SPELLED.test(s))) return false;
      const v = isPublishable(q, AI);
      return !v.ok && v.reason === "unmarked-step";
    });
    expect(gaps.map((q) => q.id)).toEqual([]);
  });

  it("the addressable step-marking backlog only shrinks (at most 2,336 rows)", () => {
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
    // 2,488 -> 2,336: -152. STEPMARK-1 batch 4 (acids-bases-and-salts) mark-annotated 152
    // of that topic's 172 addressable rows. Same mechanism as batches 1-3: the backlog
    // shrinks by EXACTLY the number annotated, because annotation is the only thing that
    // clears "unmarked-step". The remaining 20 rows are SKIPPED, not fixed -- the same
    // 0.5-granularity wall (ACID-NCERT-2-MCQ-002..004, fifteen ACID-EXMPLR-2-MCQ rows and
    // APQ-S-ACID-002 carry 3-5 steps on a 1-mark MCQ; ACID-EXMPLR-2-SA-010 carries 7 steps
    // on 3 marks). FOURTH topic in a row whose entire skip list is over-stepped 1-mark items:
    // [FU-STEPMARK-EXEMPLAR-MCQ-OVERSTEPPED]. No [0 mark] annotation was used -- owner
    // ruling 6 CLOSED [FU-STEPMARK-ZERO-MARK-STEPS] as REFUSED.
    // ★ NO row flagged by RECOVER-1 (#735) was annotated: the 8 bracket rows and the 15
    // U+F09F rows are knowingly incomplete text, and a mark scheme on a broken stem is the
    // defect the quarantine exists to stop. ZERO of the 23 sit in this topic (measured).
    // CEILING (PR-3) — the backlog is worked DOWN by STEPMARK batches and must never be
    // worked up: a wiring PR that lands rows unannotated grows it and goes red here,
    // which is the right red — annotate before wiring. 2,336 at PR-3 (2026-09-11); the
    // 21 bound-but-unmarked rows PR-3 exposed are inside this number, not added to it.
    expect(addressable.length).toBeLessThanOrEqual(2336);
  });
});

// ---------------------------------------------------------------------------
// RULE 5 — THE FIGURE RULE, BOTH DIRECTIONS OF C4
// ---------------------------------------------------------------------------

describe("RULE 5 — C4, both directions", () => {
  /**
   * ⚠ EVERY ASSERTION HERE CALLS `demandsSuppliedFigure` DIRECTLY, NEVER
   * `isPublishable`. Rule 5 runs LAST, so a row failing Rule 2 never reaches it.
   * `LIGHT-EXMPLR-9-MCQ-016` genuinely demands its numbered Exemplar figure — but routed
   * through `isPublishable` it returns `unmarked-step`, and a control written that way would
   * pass while testing a completely different rule.
   * ⚠ The specimen must be a row that is BOTH figure-demanding AND unmarked. It was
   * LIGHT-EXMPLR-9-MCQ-005 until LIGHT-FIX-1 (2026-09-11) re-keyed and mark-annotated that row;
   * when a STEPMARK lane annotates MCQ-016, swap the specimen here (and in "the figure rule
   * runs last" below) for another unmarked figure-demanding row — never leave a row unmarked
   * to keep this control alive.
   */
  it("★ demonstrates the trap this suite avoids", () => {
    const v = isPublishable(row("LIGHT-EXMPLR-9-MCQ-016"), AI);
    expect(v.ok).toBe(false);
    expect((v as { reason: string }).reason).toBe("unmarked-step"); // NOT requires-absent-figure
    expect(demandsSuppliedFigure(figureScan("LIGHT-EXMPLR-9-MCQ-016"))).toBe(true);
  });

  /**
   * DIRECTION 1 — AN INSTRUCTION TO THE STUDENT IS NOT A FIGURE REFERENCE.
   * A naive filter banning "diagram" deleted all the genuine 2023 board questions
   * from the first generated page. Every gate stayed green.
   *
   * ★★ SOURCED FROM `RAW_CANONICAL_QUESTION_BANK`, DELIBERATELY — NOT from the
   * filtered bank, and NOT to be "fixed" by pointing it back at `canonicalQuestionBank`.
   * QUARANTINE-1 withheld `PYQ-S-LIGHT-011` and `-013` for glyph damage, which is a
   * PUBLICATION decision that has nothing to do with the figure rule. Read from the
   * filtered bank this control would have silently dropped to TWO rows and stayed
   * green — HALVING the evidence it carries — and RECOVER-1 would move it again.
   * Repeated, that ends at `toHaveLength(0)`: a control asserting nothing, which is
   * the exact failure mode this file exists to catch. The rows still EXIST in the raw
   * bank; only their eligibility to be published changed. Assert on the RULE.
   */
  it("publishes the four 2023 'draw a ray diagram' rows", () => {
    const rows = RAW_CANONICAL_QUESTION_BANK.filter(
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
     * ⚠ ASSERTED ON THE FIGURE RULE ONLY. All four of these fail `isPublishable`
     * for UNRELATED reasons — every one carries glyph damage: PYQ-S-LIGHT-006 and
     * -015 from the P4 verbatim-PYQ import ([FU-BANK-GARBLED-EXPANDED-SCOPE]), and
     * -011 and -013 are withheld by QUARANTINE-1 for the same class of damage.
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
   * DIRECTION 2, RESOLVED — THE FIGURE SHIPS (PR-3).
   * `TRI-N-NCERT-6-SA-004` is the row above: it DOES demand a figure, and the binder
   * DOES hold one for its id. Before PR-3, Rule 5 read only the text and rejected it
   * as `requires-absent-figure` — a reason that was false for this row. Now the
   * demand stands (the text test is unchanged) and the escape lets the bound row
   * through. Pinned on a single named row so the escape has a face, not just a count.
   *
   * ⚠ The real row is still `unmarked-step` today (it is one of 21 bound rows in the
   * step-marking backlog), so it is given one fully-marked step here — exactly as the
   * "ignores solution steps" control does — to reach Rule 5 at all.
   */
  it("publishes a figure-demanding row whose figure is BOUND, and rejects it when unbound", () => {
    const q = row("TRI-N-NCERT-6-SA-004");
    expect(defaultHasBoundFigure(q.id)).toBe(true);
    const marked = { ...q, solutionSteps: [`[${q.marks} marks] Use the similarity to find the angle.`] };

    expect(isPublishable(marked, AI).ok).toBe(true);

    const unbound = isPublishable(marked, AI, { hasBoundFigure: () => false });
    expect(unbound.ok).toBe(false);
    expect((unbound as { reason: string }).reason).toBe("requires-absent-figure");
  });

  /**
   * THE NEGATIVE CONTROL — A RESOLVER THAT LIES "TRUE" MUST GO RED HERE (PR-3).
   * `SCQ-S-CTRL-042` demands a figure (its answer text names the diagram), its steps pass Rule 2, and
   * the binder holds NOTHING for its id — and by controller ruling it never will (the only
   * figure its source prints is the model ANSWER, which must not bind as a question figure;
   * FIG-SCI-2 re-pointed this control off `SCQ-S-CTRL-042`, which that lane binds) — so it is genuinely held
   * as `requires-absent-figure` today, with the DEFAULT resolver, no synthetic step.
   * Without this test every assertion on `defaultHasBoundFigure` reads `true`, and a
   * registry that answered `true` for every id (or a resolver wired to a constant)
   * would pass the whole file: the publishable floor rises, the partition still
   * tiles, the escaped set still "demands and is bound". A control that cannot fail
   * is not a control; this one fails exactly when "bound" stops meaning bound.
   */
  it("holds a figure-demanding row whose figure is NOT bound, and publishes it only if a resolver says it is", () => {
    const q = row("SCQ-S-CTRL-042");
    expect(defaultHasBoundFigure(q.id)).toBe(false);

    const held = isPublishable(q, AI);
    expect(held.ok).toBe(false);
    expect((held as { reason: string }).reason).toBe("requires-absent-figure");

    // The same row passes every other rule: only the binder stands between it and a page.
    expect(isPublishable(q, AI, { hasBoundFigure: () => true }).ok).toBe(true);
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
    expect(demandsSuppliedFigure(figureScan("SCQ-S-CTRL-042"))).toBe(true);
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
    // CEILING (PR-3) — a subset of the retired AI set; it shrinks as packs are retired
    // and must never grow. 2,102 at PR-3 (2026-09-11).
    expect(aiWithBadSteps.length).toBeLessThanOrEqual(2102);

    for (const q of aiWithBadSteps.slice(0, 50)) {
      const v = isPublishable(q, AI);
      expect(v.ok).toBe(false);
      expect((v as { reason: string }).reason).toBe("ai-generated-source");
    }
  });

  /** The figure rule runs last, so a figure-dependent row with unmarked steps
   *  reports the step failure. Pinned so the trap above stays visible. */
  it("the figure rule runs last", () => {
    // specimen MCQ-005 -> MCQ-016 at LIGHT-FIX-1 (2026-09-11): MCQ-005 is now mark-annotated (see RULE 5 note)
    const v = isPublishable(row("LIGHT-EXMPLR-9-MCQ-016"), AI);
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
  it("at least 3,144 rows are publishable — the number only grows", () => {
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
    // 2,851 -> 2,816: -35, the SAME 35 rows the bank count lost, and this equality is the
    // whole proof of QUARANTINE-1. Every withheld row was publishable, so both counts move
    // together. A smaller delta here than on the bank would mean some withheld row was
    // already unpublishable for another reason -- STOP rather than adjusting this number.
    // 2,816 -> 2,965: +149. STEPMARK-1 batch 4 (acids-bases-and-salts) annotated 152 rows;
    // 149 become publishable and 3 do NOT, because those 3 are ALSO held by Rule 5 (figure):
    // ACID-EXMPLR-2-LONG-001, ACID-EXMPLR-2-LONG-006 and PYQ-S-2026-ACID-014. Rule 2 runs
    // before Rule 5, so a figure-dependent row reports "unmarked-step" and annotating it
    // clears the backlog without moving this count. 152 annotated - 3 figure-held = 149,
    // which is the batch's reconciliation and its only evidence. Bank length UNCHANGED
    // at 8,638 -- this lane still authors no rows.
    // 2,965 -> 2,982: +17 while the BANK LENGTH ABOVE MOVED +24. BANK-1 PR-2 wired the
    // two maths CFPQ chapters; 17 of the 24 rows are publishable and 7 are NOT, every one
    // of the 7 held by Rule 5 as "requires-absent-figure":
    //   CFPQ-M-REALNUM-005, CFPQ-M-POLY-001, -002, -003, -005, -009, -015.
    // ★ THIS IS WHY `addressable` BELOW DOES NOT MOVE. The 7 are not step-marking
    // failures — every one carries fully mark-annotated rubric steps, so none reports
    // "unmarked-step" and none enters the backlog. They fail the FIGURE rule instead.
    // A wiring PR that moved `addressable` would mean the rows arrived unannotated,
    // which these did not.
    // ★ AND THE 7 ARE RECOVERABLE, NOT REJECTED. Both chapters' headers record that their
    // figure crops are saved and mapped but DELIBERATELY NOT BOUND, binding being a
    // separate lane (CFPQ-FIGURES-1). Corroboration that Rule 5 is reading these rows
    // correctly rather than over-firing: chapter 1 documents CFPQ-M-REALNUM-001 as
    // REFERENCE ONLY, answerable without its image and NOT setting requiresDiagram, and
    // that row is publishable here, while -005, whose answer names "Representation 1"
    // and "Representation 2", is held. The rule agrees with the source's own reading.
    // 2,982 -> 3,144: +162. PR-3: rows whose figure is BOUND (Rule 5 now consults the binder).
    // ★ NOT +183. The binder holds a figure for 183 figure-demanding rows, but 21 of those
    // fail Rule 2 first ("unmarked-step") and never reach Rule 5 — Rule 2 runs before
    // Rule 5, exactly the ordering the STEPMARK batches above reconcile against. So the
    // escape moves 162 rows from `requires-absent-figure` (392 -> 230) to publishable, and
    // the 21 stay in `addressable` (UNCHANGED at 2,336) until a STEPMARK lane annotates
    // them, at which point they publish directly. Bank length UNCHANGED at 8,662 — this
    // change authors no rows and binds no figures; it stops the predicate from ignoring
    // figures that were already bound. The control below proves the +162 is the escape
    // and nothing else: with the binder switched off the count is the old 2,982 exactly.
    // FLOOR (PR-3) — the headline the SEO track builds from is GROW-ONLY: annotation,
    // binding and wiring all raise it. A PR that LOWERS it (a withheld row, a loosened
    // predicate tightened, a lost import) goes red here and must say why. 3,144 at PR-3
    // (2026-09-11). Raise the floor when a PR moves the number, so it keeps protecting.
    expect(publishable.length).toBeGreaterThanOrEqual(3144);
  });

  /**
   * ★ THE MUTATION CONTROL, MADE PERMANENT (PR-3). The escape is load-bearing only if
   * switching the binder off recovers the pre-PR-3 count EXACTLY — not "a smaller
   * number" but 2,982, the value pinned on trunk before this change. If the default
   * resolver ever stops reaching the binder (a wrong import, a renamed export, a
   * registry that returns [] for every id), the two counts collapse to one and this
   * test is the only thing that says so.
   *
   * PINNED AS BOUNDS, NOT EQUALITIES (PR-3 monotone pins): the binder-off count is the
   * publishable population WITHOUT the escape and is grow-only like the headline, so
   * it carries a FLOOR of 2,982, the pre-PR-3 value. The escaped set is grow-only too
   * — every newly bound figure and every annotated bound row adds to it — so it
   * carries a FLOOR of 162. If the escape ever stops reaching the binder, the escaped
   * set is EMPTY, 0 < 162, and this is red: the floor is the load-bearing proof.
   * The delta and the set are tied by an exact, literal-free identity.
   */
  it("★ the escape is load-bearing: binder off recovers at least the pre-PR-3 population", () => {
    const withBinder = canonicalQuestionBank.filter((q) => isPublishable(q, AI).ok);
    const binderOff = canonicalQuestionBank.filter(
      (q) => isPublishable(q, AI, { hasBoundFigure: () => false }).ok,
    );

    // FLOOR — the binder-blind population, 2,982 at PR-3 (its last exact value).
    expect(binderOff.length).toBeGreaterThanOrEqual(2982);
    // The escape can only ADD rows: everything publishable without it is publishable with it.
    const withIds = new Set(withBinder.map((q) => q.id));
    for (const q of binderOff) {
      expect(withIds.has(q.id), `${q.id} publishable binder-off but not binder-on`).toBe(true);
    }

    // Every escaped row is exactly one that (a) demands a figure and (b) has one bound.
    // Nothing else may ride through the escape.
    const offIds = new Set(binderOff.map((q) => q.id));
    const escaped = withBinder.filter((q) => !offIds.has(q.id));
    // IDENTITY — the count delta IS the escaped set (binderOff ⊆ withBinder was just proven).
    expect(escaped.length).toBe(withBinder.length - binderOff.length);
    // FLOOR — 162 rows escaped at PR-3 (2026-09-11); 0 here means the escape is dead.
    expect(escaped.length).toBeGreaterThanOrEqual(162);
    for (const q of escaped) {
      const demands =
        Boolean((q as { requiresDiagram?: boolean }).requiresDiagram) ||
        demandsSuppliedFigure(`${q.questionText}\n${q.answer ?? ""}`);
      expect(demands, `${q.id} escaped without demanding a figure`).toBe(true);
      expect(defaultHasBoundFigure(q.id), `${q.id} escaped without a bound figure`).toBe(true);
    }
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
 *   5,226 = publishable + addressable - (addressable rows Rule 5 holds for a figure)
 *           "every remaining addressable row can be annotated." It counts a row that
 *           can NEVER be annotated without asserting a step earns nothing.
 *
 *   4,804 = publishable + addressable - |figure-held UNION cannot-sum|
 *           "every addressable row that can be annotated WITHOUT a [0 mark] step,
 *            and that Rule 5 does not hold, becomes publishable."
 *
 * (These read 5,209 and 4,787 until BANK-1 PR-2 wired 24 maths CFPQ rows, 17 of them
 *  publishable: both figures move by that +17 and their gap is unchanged. The DEFINITIONS
 *  are what is authoritative here, not the two numerals — they are recomputed from the
 *  assembled bank on every run, which is the whole point of stating them in words.)
 *
 * ★ 4,804 IS THE AUTHORITATIVE ACHIEVABLE FIGURE. Owner ruling 6 (2026-09-03) CLOSED
 * [FU-STEPMARK-ZERO-MARK-STEPS] as REFUSED, so the cannot-sum rows are permanently
 * unrecoverable by annotation and 5,226 overstates what this track can reach.
 *
 * ⚠ THE TWO EXCLUDED SETS OVERLAP; THEY ARE NOT DISJOINT AND NEITHER IS NESTED.
 * 24 addressable rows are BOTH figure-held AND cannot-sum. Subtracting the two counts
 * independently double-counts those 24 and yields a number 24 too high, which is wrong.
 * The gap 5,226 - 4,804 = 422 is therefore NOT the cannot-sum count (that is 446) -- it
 * is the cannot-sum rows that are not ALREADY excluded as figure-held: 446 - 24 = 422.
 * ⚠ The "24" in this paragraph is the figure-held/cannot-sum OVERLAP and has nothing to
 * do with the 24 rows BANK-1 PR-2 wired. Two unrelated 24s, adjacent in this file.
 *
 * ★ BOTH FIGURES ARE INVARIANT UNDER THIS LANE'S OPERATION, which is why they still
 * measure the same after three batches. Annotating a non-figure row moves one row from
 * `addressable` to `publishable`; annotating a figure-held row removes it from
 * `addressable` and from the figure-held set at once. Either way the expression is
 * conserved. A batch that MOVES these numbers has done something other than annotate.
 *
 * ★ PR-3: "FIGURE-HELD" MEANS WHAT RULE 5 HOLDS, AND RULE 5 NOW CONSULTS THE BINDER.
 * `figureHeld` below is binder-aware for the same reason the predicate is: an
 * addressable row whose figure is BOUND will publish the moment it is annotated, so
 * counting it as unreachable understates the ceiling by exactly the rows PR-3 freed.
 * Measured at PR-3: 21 addressable rows are bound, so `held` 92 -> 71, `excluded`
 * 514 -> 495, the overlap 24 -> 22 (two of the 21 were also cannot-sum), and both
 * ceilings move +183 = 162 (publishable) + 21 (no longer held): 5,226 -> 5,409 and
 * 4,804 -> 4,985. The gap is now 424 = 446 - 22. Had `figureHeld` stayed binder-blind
 * the sums would read 5,388 / 4,966 — a ceiling that counts 21 reachable rows as
 * unreachable, which is the definition error this paragraph exists to refuse.
 */
describe("the achievable ceiling — ruling 5", () => {
  const figureHeld = (q: (typeof canonicalQuestionBank)[number]) =>
    (Boolean((q as { requiresDiagram?: boolean }).requiresDiagram) ||
      demandsSuppliedFigure(`${q.questionText}\n${q.answer ?? ""}`)) &&
    !defaultHasBoundFigure(q.id);

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

  it("the achievable ceiling is publishable + addressable - excluded (>= 4,985), and the naive one is not", () => {
    const publishable = canonicalQuestionBank.filter((q) => isPublishable(q, AI).ok).length;
    const addressable = canonicalQuestionBank.filter((q) => {
      if (AI.has(q.id)) return false;
      const v = isPublishable(q, AI);
      return !v.ok && (v.reason === "unmarked-step" || v.reason === "no-solution-steps");
    });

    const held = addressable.filter(figureHeld).length;
    const cannotSum = addressable.filter((q) => !canBeAnnotated(q)).length;
    const excluded = addressable.filter((q) => figureHeld(q) || !canBeAnnotated(q)).length;

    // the two excluded sets OVERLAP by 22 — this is the assertion the controller's
    // arithmetic would have got wrong, and it is why 4,822 is not 5,244 minus 446.
    // 24 -> 22: PR-3, two of the 21 bound-but-unmarked rows were also cannot-sum, and a
    // bound row is no longer figure-held, so they leave the overlap. `cannotSum` itself
    // is UNCHANGED at 446: binding a figure does not change whether steps can sum.
    //
    // PR-3 MONOTONE PINS. The overlap and `cannotSum` are subsets of the addressable
    // backlog and shrink with it (binding frees held rows; fixing steps frees cannot-sum
    // rows; a wiring PR that lands rows in either state grows them and goes red, which
    // is the right red). Both carry CEILINGS at their PR-3 values (2026-09-11).
    const overlap = held + cannotSum - excluded;
    expect(overlap).toBeLessThanOrEqual(22);
    expect(cannotSum).toBeLessThanOrEqual(446);
    // Set algebra the two predicates must obey, literal-free: the union is at least
    // each part and at most their sum, so the overlap lies in [0, min(held, cannotSum)].
    expect(excluded).toBeGreaterThanOrEqual(Math.max(held, cannotSum));
    expect(excluded).toBeLessThanOrEqual(held + cannotSum);
    // ⚠ The GAP `cannotSum - overlap` (422 -> 424 at PR-3) is deliberately NOT bounded:
    // binding figures shrinks `held` and so GROWS it, while fixing steps shrinks it — it
    // has no doctrine direction. It is asserted below as an identity between the two
    // ceilings instead, which is what it actually is.

    // ✗ NOT the achievable figure: ignores that 422 rows can never be annotated.
    // 5,244 -> 5,209 and 4,822 -> 4,787: both -35, and for ONE reason. All 35 rows
    // QUARANTINE-1 withheld were publishable, so they leave `publishable` and were never
    // in `addressable` (which requires !ok). `addressable`, `held`, `cannotSum` and
    // `excluded` are therefore UNCHANGED -- which the two assertions above still prove.
    // ★ The comment on this describe block says a batch that moves these numbers has
    // done something other than annotate. That is exactly right: withholding REMOVES
    // rows from the bank, it does not move them between sets, so the invariant that
    // holds for STEPMARK-1 correctly does not hold here.
    // 5,209 -> 5,226 and 4,787 -> 4,804: both +17, and for ONE reason. BANK-1 PR-2 wired
    // 24 maths CFPQ rows; 17 landed in `publishable` and 7 are figure-held by Rule 5.
    // Neither ceiling counts the 7: they never enter `addressable` (which requires
    // !ok with a step-marking reason), so `addressable`, `held`, `cannotSum` and
    // `excluded` are ALL unchanged -- as the two assertions above still prove. Both
    // ceilings therefore move by exactly the publishable delta, +17, and their GAP stays
    // 422. The invariant in this block's header is about ANNOTATION, and holds: adding
    // rows to the bank is a different operation, and it moves both ceilings together.
    // 5,226 -> 5,409 and 4,804 -> 4,985: both +183, and for ONE reason. PR-3: +183 = rows
    // whose figure is bound (Rule 5 now consults the binder) — 162 of them move straight
    // into `publishable`, and 21 stay `addressable` but stop being `held`/`excluded`
    // because a bound figure is no longer a reason to hold. `addressable` is UNCHANGED at
    // 2,336 and `cannotSum` at 446; the gap moves 422 -> 424 because 2 of the 21 leave
    // the overlap. A third operation, then: ANNOTATION conserves these, ADDING ROWS moves
    // both by the publishable delta, and BINDING (or, here, first honouring what was
    // already bound) moves both by the freed count. Bank length UNCHANGED at 8,662.
    //
    // PR-3 MONOTONE PINS. Both ceilings are GROW-ONLY: annotation conserves them, wiring
    // and binding raise them, and only a lost row or a lost figure lowers them. FLOORS at
    // the PR-3 values (2026-09-11). What these two lines encode is NOT a partition of the
    // bank — it is "how many rows would publish if every annotatable row were annotated",
    // under two readings of "annotatable". The partition of the bank is its own block below.
    const naiveCeiling = publishable + addressable.length - held;
    const achievableCeiling = publishable + addressable.length - excluded;
    expect(naiveCeiling).toBeGreaterThanOrEqual(5409);

    // ★ THE AUTHORITATIVE ACHIEVABLE FIGURE.
    expect(achievableCeiling).toBeGreaterThanOrEqual(4985);

    // IDENTITIES, literal-free. The achievable ceiling never exceeds the naive one, is
    // never below what already publishes, and the two differ by exactly the cannot-sum
    // rows that are not also figure-held — the gap that has no doctrine direction.
    expect(achievableCeiling).toBeLessThanOrEqual(naiveCeiling);
    expect(achievableCeiling).toBeGreaterThanOrEqual(publishable);
    expect(naiveCeiling).toBeLessThanOrEqual(publishable + addressable.length);
    expect(naiveCeiling - achievableCeiling).toBe(cannotSum - overlap);
  });
});

// ---------------------------------------------------------------------------
// THE PARTITION — EXACT, LITERAL-FREE
// ---------------------------------------------------------------------------

/**
 * ★ THE ONE IDENTITY THAT NEVER WEAKENS (PR-3). Every floor and ceiling above can go
 * stale in the safe direction; this cannot. `isPublishable` returns exactly one verdict
 * per row, so the ok count plus every rejection reason must sum to the bank, and the
 * named populations the other blocks measure — AI, publishable, addressable, cannot-sum,
 * figure-held — must tile it with nothing left over and nothing counted twice. A new
 * reason string added to the contract without a home here, a row that somehow gets two
 * verdicts, a filter in this file that drifts from the predicate: all red, at any size.
 */
describe("the partition — verdicts tile the bank exactly", () => {
  const KNOWN_REASONS = [
    "ai-generated-source",
    "no-solution-steps",
    "unmarked-step",
    "marks-do-not-sum",
    "requires-absent-figure",
  ] as const;

  it("ok + every rejection reason === bank, and no reason is unknown", () => {
    let ok = 0;
    const byReason = new Map<string, number>();
    for (const q of canonicalQuestionBank) {
      const v = isPublishable(q, AI);
      if (v.ok) ok += 1;
      else byReason.set(v.reason, (byReason.get(v.reason) ?? 0) + 1);
    }
    for (const reason of byReason.keys()) {
      expect(KNOWN_REASONS as readonly string[], `unknown reason ${reason}`).toContain(reason);
    }
    const rejected = [...byReason.values()].reduce((a, b) => a + b, 0);
    expect(ok + rejected).toBe(canonicalQuestionBank.length);
  });

  it("AI + publishable + addressable + cannot-sum + figure-held === bank", () => {
    const ai = canonicalQuestionBank.filter((q) => AI.has(q.id)).length;
    const publishable = canonicalQuestionBank.filter((q) => isPublishable(q, AI).ok).length;
    const reason = (q: (typeof canonicalQuestionBank)[number]) => {
      const v = isPublishable(q, AI);
      return v.ok ? null : v.reason;
    };
    // The same predicate the RULE 2 block pins, so the two blocks cannot drift apart.
    const addressable = canonicalQuestionBank.filter((q) => {
      if (AI.has(q.id)) return false;
      const r = reason(q);
      return r === "unmarked-step" || r === "no-solution-steps";
    }).length;
    const marksDoNotSum = canonicalQuestionBank.filter(
      (q) => !AI.has(q.id) && reason(q) === "marks-do-not-sum",
    ).length;
    const figureHeld = canonicalQuestionBank.filter(
      (q) => !AI.has(q.id) && reason(q) === "requires-absent-figure",
    ).length;

    expect(ai + publishable + addressable + marksDoNotSum + figureHeld).toBe(
      canonicalQuestionBank.length,
    );
    // Rule 1 runs first, so every AI row is rejected as AI and none reaches a content
    // reason — the `!AI.has` guards above therefore exclude nothing, and this proves it.
    expect(canonicalQuestionBank.filter((q) => AI.has(q.id) && reason(q) !== "ai-generated-source")).toEqual([]);
  });
});
