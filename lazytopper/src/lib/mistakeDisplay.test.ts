/**
 * SCORECARD-MI-1 — the ONE display module, pinned to the OWNER'S RULINGS (5 Oct 2026):
 *   knowledge gap = conceptual           "Marks to gain — learn this"
 *   exam technique = presentation        "Marks to gain — the quickest wins"
 *   careless = calculation + silly       "Marks to gain — you already know this"
 *   "Not attempted" — its own state, never a mistake.
 * Each assertion is a DECISION (full discipline): if one goes red, a ruling changed.
 */
import { describe, it, expect } from "vitest";
import {
  ANSWER_MISMATCH_COPY,
  COULD_NOT_READ_COPY,
  MARKS_LOST_BY_TYPE_VERSION,
  MISTAKE_GROUPS,
  MISTAKE_TYPE_LABEL,
  NOT_ATTEMPTED,
  STORED_MISTAKE_TYPES,
  UNREAD_OPTION_COPY,
  WITHDRAWN_LABEL,
  coachingLine,
  countWithUnit,
  effectivePaperCounts,
  effectiveTypeCounts,
  entryMarksLost,
  gradeStateCopy,
  gradeStateOf,
  groupCounts,
  isCarelessType,
  isGradedQuestion,
  isKnowledgeGapType,
  isNotAttemptedStatus,
  isQuestionNotAttempted,
  isTechniqueType,
  isWithdrawnStatus,
  marksLostToWork,
  mistakeGroupOf,
  mistakeTypeLabel,
  objectiveMarksLost,
  paperMarksLost,
  questionChipType,
  questionMarksLost,
  readRubric,
  splitWithdrawnSteps,
  stepDisplay,
  stepForDisplay,
  stepShowsType,
  withEffectiveCounts,
  zeroMarksLost,
  type MarksLostByType,
} from "./mistakeDisplay";

describe("the owner's taxonomy (B3/D1)", () => {
  it("stored type names are unchanged — exactly the four", () => {
    expect([...STORED_MISTAKE_TYPES].sort()).toEqual(["calculation", "conceptual", "presentation", "silly"]);
  });

  it("maps each stored type to the owner's group", () => {
    expect(mistakeGroupOf("conceptual")?.key).toBe("knowledge");
    expect(mistakeGroupOf("presentation")?.key).toBe("technique");
    expect(mistakeGroupOf("calculation")?.key).toBe("careless");
    expect(mistakeGroupOf("silly")?.key).toBe("careless");
    expect(mistakeGroupOf("guesswork")).toBeNull();
    expect(mistakeGroupOf(null)).toBeNull();
  });

  it("the three headings, verbatim, in the owner's order", () => {
    expect(MISTAKE_GROUPS.map((g) => [g.key, g.heading])).toEqual([
      ["knowledge", "Marks to gain — learn this"],
      ["technique", "Marks to gain — the quickest wins"],
      ["careless", "Marks to gain — you already know this"],
    ]);
  });

  it("every stored type belongs to exactly ONE group (no type double-counted, none dropped)", () => {
    for (const t of STORED_MISTAKE_TYPES) {
      expect(MISTAKE_GROUPS.filter((g) => g.types.includes(t))).toHaveLength(1);
    }
  });

  it("ONE display name per stored type, and no retired variant", () => {
    expect(MISTAKE_TYPE_LABEL).toEqual({
      conceptual: "Concept gap",
      calculation: "Calculation slip",
      silly: "Silly slip",
      presentation: "Presentation",
    });
    expect(Object.values(MISTAKE_TYPE_LABEL)).not.toContain("Careless slip");
    expect(mistakeTypeLabel("unknown-type")).toBeNull();
  });

  it("only a knowledge gap is a knowledge gap (the weak-area bridge predicate, GA-21)", () => {
    expect(STORED_MISTAKE_TYPES.filter(isKnowledgeGapType)).toEqual(["conceptual"]);
    expect(STORED_MISTAKE_TYPES.filter(isCarelessType)).toEqual(["calculation", "silly"]);
    expect(STORED_MISTAKE_TYPES.filter(isTechniqueType)).toEqual(["presentation"]);
  });

  it("Not attempted is its own state, not a group", () => {
    expect(NOT_ATTEMPTED.label).toBe("Not attempted");
    expect(MISTAKE_GROUPS.map((g) => g.label)).not.toContain(NOT_ATTEMPTED.label);
  });

  it("group counts are MISTAKE counts and carry their unit (D2)", () => {
    expect(groupCounts({ conceptual: 2, calculation: 1, silly: 1, presentation: 3 })).toEqual({ knowledge: 2, technique: 3, careless: 2 });
    expect(countWithUnit(1)).toBe("1 mistake");
    expect(countWithUnit(3)).toBe("3 mistakes");
    expect(countWithUnit(1, "question")).toBe("1 question");
  });
});

describe("what a question may show (D3, GA-15, GA-20)", () => {
  const steps = (...types: Array<string | null>) =>
    types.map((t, i) => ({ stepNumber: i + 1, status: "incorrect", mistakeType: t, marksDeducted: 1 }));

  it("no type on a full-mark question (withdrawn work, a right-option MCQ)", () => {
    const q = { totalMarks: 4, marksAwarded: 4, mistakeSummary: { conceptual: 1 }, annotatedSteps: steps("conceptual") };
    expect(effectiveTypeCounts(q)).toEqual({ conceptual: 0, calculation: 0, silly: 0, presentation: 0 });
    expect(questionChipType(q)).toBeNull();
    expect(stepShowsType(q.annotatedSteps[0], q)).toBe(false);
    expect(stepForDisplay(q.annotatedSteps[0], q).mistakeType).toBeNull();
  });

  it("CONTROL — the same question that LOST a mark shows its type", () => {
    const q = { totalMarks: 4, marksAwarded: 3, mistakeSummary: { conceptual: 1 }, annotatedSteps: steps("conceptual") };
    expect(effectiveTypeCounts(q).conceptual).toBe(1);
    expect(questionChipType(q)).toBe("conceptual");
  });

  it("per type, the larger of the grader's summary and its typed steps — one rule everywhere (GA-20)", () => {
    const q = { totalMarks: 5, marksAwarded: 1, mistakeSummary: { conceptual: 1, calculation: 0 }, annotatedSteps: steps("conceptual", "calculation") };
    expect(effectiveTypeCounts(q)).toEqual({ conceptual: 1, calculation: 1, silly: 0, presentation: 0 });
  });

  it("couldNotRead shows nothing (it was never graded)", () => {
    expect(effectivePaperCounts([{ couldNotRead: true, totalMarks: 3, mistakeSummary: { silly: 2 } }])).toEqual({ conceptual: 0, calculation: 0, silly: 0, presentation: 0 });
  });

  it("ONE chip picker (GA-34): most mistakes; a tie goes to the owner's group order", () => {
    expect(questionChipType({ totalMarks: 3, marksAwarded: 1, mistakeSummary: { silly: 2, conceptual: 1 } })).toBe("silly");
    expect(questionChipType({ totalMarks: 3, marksAwarded: 1, mistakeSummary: { calculation: 1, presentation: 1 } })).toBe("presentation");
    expect(questionChipType({ totalMarks: 3, marksAwarded: 1, mistakeSummary: { calculation: 1, conceptual: 1 } })).toBe("conceptual");
  });

  it("withEffectiveCounts rewrites only NEW legible results, keeps an absent summary absent", () => {
    const out = withEffectiveCounts({
      results: [
        { qNumber: 1, totalMarks: 2, marksAwarded: 2, mistakeSummary: { presentation: 1 } },
        { qNumber: 2, totalMarks: 2, marksAwarded: 0, annotatedSteps: [] },
        { qNumber: 3, couldNotRead: true, totalMarks: 2 },
      ],
    });
    expect(out.results[0].mistakeSummary).toEqual({ conceptual: 0, calculation: 0, silly: 0, presentation: 0 });
    expect("mistakeSummary" in out.results[1]).toBe(false);
    expect(out.results[2]).toEqual({ qNumber: 3, couldNotRead: true, totalMarks: 2 });
  });
});

describe("the step states (D3/D4)", () => {
  it("'missing' reads Not attempted and carries no deduction", () => {
    expect(stepDisplay("missing")).toMatchObject({ kind: "not-attempted", label: "Not attempted", showDeduction: false });
  });

  // PR-2 — "withdrawn" and "unattempted" are KNOWN states now (GRADER-CORE-1 v2), so the
  // unknown-status pin uses values no grader sends.
  it("an UNKNOWN status never crashes and never reads Incorrect", () => {
    for (const s of [undefined, null, 42, "frobnicated"]) {
      const d = stepDisplay(s);
      expect(d.kind).toBe("unknown");
      expect(d.label).not.toMatch(/incorrect/i);
      expect(d.showDeduction).toBe(false);
    }
  });

  it("PR-2 (B8) — 'unattempted' is Not attempted; 'withdrawn' is Crossed out; neither carries a deduction", () => {
    expect(stepDisplay("unattempted")).toMatchObject({ kind: "not-attempted", label: "Not attempted", showDeduction: false });
    expect(stepDisplay("withdrawn")).toMatchObject({ kind: "withdrawn", label: WITHDRAWN_LABEL, showDeduction: false });
    expect(WITHDRAWN_LABEL).toBe("Crossed out");
    for (const s of ["unattempted", "withdrawn"]) expect(stepDisplay(s).label).not.toMatch(/incorrect/i);
    expect(isNotAttemptedStatus("unattempted")).toBe(true);
    expect(isNotAttemptedStatus("withdrawn")).toBe(false);
    expect(isWithdrawnStatus("withdrawn")).toBe(true);
  });

  it("CONTROL — the three known statuses keep their meaning", () => {
    expect(stepDisplay("correct").label).toBe("Correct");
    expect(stepDisplay("partial").label).toBe("Partial");
    expect(stepDisplay("incorrect").label).toBe("Incorrect");
  });

  it("a question is NOT ATTEMPTED only when every step is missing and nothing was awarded", () => {
    const missing = { stepNumber: 1, status: "missing", mistakeType: null, marksDeducted: 2 };
    expect(isQuestionNotAttempted({ totalMarks: 2, marksAwarded: 0, annotatedSteps: [missing] })).toBe(true);
    expect(isQuestionNotAttempted({ totalMarks: 2, marksAwarded: 0, annotatedSteps: [missing, { ...missing, status: "incorrect" }] })).toBe(false);
    expect(isQuestionNotAttempted({ totalMarks: 2, marksAwarded: 0, annotatedSteps: [] })).toBe(false);
  });
});

describe("coaching is true to the marks (GA-24)", () => {
  it("never 'Clean' while marks were lost — even with no type named", () => {
    const line = coachingLine({ marksAwarded: 0, marksTotal: 3, counts: {} });
    expect(line).not.toMatch(/clean/i);
    expect(line).toContain("You lost 3 marks");
  });

  it("speaks the three groups in the owner's words", () => {
    const line = coachingLine({ marksAwarded: 15, marksTotal: 24, counts: { conceptual: 2, calculation: 2, silly: 1, presentation: 1 }, notAttemptedCount: 1 });
    expect(line).toContain("Learn this: 2 knowledge gaps");
    expect(line).toContain("The quickest wins: 1 exam-technique mistake");
    expect(line).toContain("You already know this: 3 careless slips");
    expect(line).toContain("1 question not attempted — not counted as a mistake.");
  });

  it("CONTROL — full marks says full marks", () => {
    expect(coachingLine({ marksAwarded: 3, marksTotal: 3, counts: {} })).toContain("Full marks");
  });
});

/* ── PR-2 (B7 / B8 + the owner's answerMismatch addendum) ─────────────────────── */

/** A v2 per-bucket record, every bucket present (a partial one is not a record). */
const mk = (over: Partial<MarksLostByType> = {}): MarksLostByType => ({ ...zeroMarksLost(), ...over });

describe("PR-2 B8 — was this question GRADED at all? (the flags decide, never the marks)", () => {
  it("the owner's three sentences, verbatim — em dash included", () => {
    expect(ANSWER_MISMATCH_COPY).toBe("This answer doesn't seem to match the question — check you uploaded the right page");
    expect(ANSWER_MISMATCH_COPY).toContain("—");
    expect(COULD_NOT_READ_COPY).toBe("We couldn't read this answer — retake the photo");
    expect(UNREAD_OPTION_COPY).toBe("We couldn't read your option");
  });

  it("answerMismatch:true is NOT graded — even though it comes back as a 0 — and says the owner's words", () => {
    const q = { totalMarks: 3, marksAwarded: 0, answerMismatch: true, couldNotRead: false };
    expect(gradeStateOf(q)).toBe("answer-mismatch");
    expect(isGradedQuestion(q)).toBe(false);
    expect(gradeStateCopy(q)).toBe(ANSWER_MISMATCH_COPY);
  });

  it("a mismatch WINS over couldNotRead (the more specific sentence)", () => {
    const q = { totalMarks: 3, marksAwarded: 0, answerMismatch: true, couldNotRead: true, objectiveResolved: false };
    expect(gradeStateOf(q)).toBe("answer-mismatch");
    expect(gradeStateCopy(q)).toBe(ANSWER_MISMATCH_COPY);
  });

  it("couldNotRead → could-not-read", () => {
    expect(gradeStateOf({ couldNotRead: true, totalMarks: 2 })).toBe("could-not-read");
    expect(gradeStateCopy({ couldNotRead: true, totalMarks: 2 })).toBe(COULD_NOT_READ_COPY);
    expect(isGradedQuestion({ couldNotRead: true, totalMarks: 2 })).toBe(false);
  });

  // R3 (controller, 2026-10-05): couldNotRead ALWAYS wins — "retake the photo" — even when the
  // grader also says the option was unresolved (A's contract sends both on an unread pick).
  it("R3 — couldNotRead + objectiveResolved:false → could-not-read (couldNotRead always wins), not graded", () => {
    const q = { couldNotRead: true, objectiveResolved: false, objective: true, totalMarks: 1, marksAwarded: 0 };
    expect(gradeStateOf(q)).toBe("could-not-read");
    expect(gradeStateCopy(q)).toBe(COULD_NOT_READ_COPY);
    expect(isGradedQuestion(q)).toBe(false);
  });

  it("R3 — objectiveResolved:false on an otherwise READ page (couldNotRead false) → the unread OPTION, not graded", () => {
    for (const couldNotRead of [false, undefined]) {
      const opt = { couldNotRead, objectiveResolved: false, objective: true, totalMarks: 1, marksAwarded: 0 };
      expect(gradeStateOf(opt)).toBe("unread-option");
      expect(gradeStateCopy(opt)).toBe(UNREAD_OPTION_COPY);
      expect(isGradedQuestion(opt)).toBe(false);
      // not graded → no marks, no loss, nothing to MI
      expect(questionMarksLost({ ...opt, marksLostByType: mk() })).toBeNull();
      expect(marksLostToWork(opt)).toBe(0);
    }
    // CONTROL — objectiveResolved true / null on a read page is graded
    for (const objectiveResolved of [true, null, undefined]) {
      expect(gradeStateOf({ couldNotRead: false, objectiveResolved, objective: true, totalMarks: 1, marksAwarded: 0 })).toBe("graded");
    }
  });

  it("answerMismatch:null is UNDECIDED = graded normally, no message; false is graded", () => {
    for (const answerMismatch of [null, false, undefined]) {
      const q = { totalMarks: 3, marksAwarded: 0, answerMismatch };
      expect(gradeStateOf(q)).toBe("graded");
      expect(gradeStateCopy(q)).toBeNull();
      expect(isGradedQuestion(q)).toBe(true);
    }
  });

  it("CONTROL — a genuinely graded 0 (no flag) is graded; a missing question is never graded", () => {
    expect(gradeStateOf({ totalMarks: 2, marksAwarded: 0 })).toBe("graded");
    expect(gradeStateOf(null)).toBe("could-not-read");
    expect(gradeStateOf(undefined)).toBe("could-not-read");
  });
});

describe("PR-2 B7 — one question's marks lost per bucket (questionMarksLost)", () => {
  it("parts that sum to the loss come back as they are", () => {
    const q = { totalMarks: 5, marksAwarded: 2, marksLostByType: mk({ conceptual: 2, silly: 1 }) };
    expect(questionMarksLost(q)).toEqual(mk({ conceptual: 2, silly: 1 }));
  });

  it("parts that sum SHORT of the loss: the shortfall is topped up to 'reason not recorded', never to a type", () => {
    const q = { totalMarks: 5, marksAwarded: 2, marksLostByType: mk({ conceptual: 1, calculation: 0.5 }) };
    expect(questionMarksLost(q)).toEqual(mk({ conceptual: 1, calculation: 0.5, untyped: 1.5 }));
  });

  it("parts that sum OVER the loss cannot be trusted → null (shown as counts, never a contradicting number)", () => {
    expect(questionMarksLost({ totalMarks: 5, marksAwarded: 2, marksLostByType: mk({ conceptual: 4 }) })).toBeNull();
  });

  // R2 (controller, 2026-10-05): the SERVER's buckets, exactly. An untyped deduction on a step the
  // grader marked "missing" stays "Marks lost, reason not recorded" — it is never re-filed as
  // "Not attempted", not even when every other step is correct.
  it("R2 — an untyped 'missing' step's mark stays 'reason not recorded' (never re-bucketed to Not attempted)", () => {
    const missing = { status: "missing", marksAwarded: 0, marksDeducted: 1, mistakeType: null };
    const correct = { status: "correct", marksAwarded: 1, marksDeducted: 0, mistakeType: null };
    // every other step correct
    const onlyMissing = { totalMarks: 3, marksAwarded: 2, annotatedSteps: [correct, correct, missing], marksLostByType: mk({ untyped: 1 }) };
    expect(questionMarksLost(onlyMissing)).toEqual(mk({ untyped: 1 }));
    // beside a typed slip
    const withSlip = {
      totalMarks: 4,
      marksAwarded: 2,
      annotatedSteps: [correct, { status: "incorrect", marksAwarded: 0, marksDeducted: 1, mistakeType: "calculation" }, missing, correct],
      marksLostByType: mk({ calculation: 1, untyped: 1 }),
    };
    expect(questionMarksLost(withSlip)).toEqual(mk({ calculation: 1, untyped: 1 }));
    // the server's own `unattempted` bucket is kept exactly as sent
    const v2Unattempted = { totalMarks: 3, marksAwarded: 2, annotatedSteps: [correct, correct, { ...missing, status: "unattempted" }], marksLostByType: mk({ unattempted: 1 }) };
    expect(questionMarksLost(v2Unattempted)).toEqual(mk({ unattempted: 1 }));
    // a SHORT sum is still topped up into "reason not recorded" — never into Not attempted
    expect(questionMarksLost({ ...onlyMissing, marksLostByType: mk() })).toEqual(mk({ untyped: 1 }));
  });

  it("R1 — a 'missing' step the grader TYPED (presentation 0.5) keeps its type, and its question's chip", () => {
    const q = {
      totalMarks: 2,
      marksAwarded: 1.5,
      annotatedSteps: [
        { status: "correct", marksAwarded: 1.5, marksDeducted: 0, mistakeType: null },
        { status: "missing", marksAwarded: 0, marksDeducted: 0.5, mistakeType: "presentation" },
      ],
      mistakeSummary: { presentation: 1 },
      marksLostByType: mk({ presentation: 0.5 }),
    };
    expect(questionMarksLost(q)).toEqual(mk({ presentation: 0.5 }));
    expect(questionChipType(q)).toBe("presentation");
    expect(isQuestionNotAttempted(q)).toBe(false);
  });

  it("null for a count-only grade, a malformed record and a question that was not graded", () => {
    expect(questionMarksLost({ totalMarks: 5, marksAwarded: 2 })).toBeNull();
    expect(questionMarksLost({ totalMarks: 5, marksAwarded: 2, marksLostByType: { conceptual: 3 } })).toBeNull();
    expect(questionMarksLost({ totalMarks: 5, marksAwarded: 2, marksLostByType: mk({ conceptual: -1 }) })).toBeNull();
    expect(questionMarksLost({ totalMarks: 3, marksAwarded: 0, answerMismatch: true, marksLostByType: mk() })).toBeNull();
    expect(questionMarksLost({ couldNotRead: true, totalMarks: 3, marksLostByType: mk() })).toBeNull();
  });
});

describe("PR-2 B7 — a paper's marks lost (paperMarksLost)", () => {
  it("EXCLUDES the questions that were not graded (mismatch, unreadable, unread option)", () => {
    const pm = paperMarksLost([
      { totalMarks: 4, marksAwarded: 2, marksLostByType: mk({ conceptual: 2 }) },
      { totalMarks: 3, marksAwarded: 0, answerMismatch: true, couldNotRead: false, marksLostByType: mk() },
      { totalMarks: 2, couldNotRead: true },
      { totalMarks: 1, marksAwarded: 0, couldNotRead: true, objectiveResolved: false, marksLostByType: mk() },
    ]);
    expect(pm).toEqual({ byType: mk({ conceptual: 2 }), lost: 2, unsplitCount: 0 });
  });

  it("a LEGACY-only paper (no question carries marksLostByType) is count-only → null", () => {
    expect(paperMarksLost([{ totalMarks: 3, marksAwarded: 1, mistakeSummary: { calculation: 1 } }, { totalMarks: 2, marksAwarded: 2 }])).toBeNull();
    expect(paperMarksLost([])).toBeNull();
    expect(paperMarksLost(null)).toBeNull();
  });

  it("MIXED rows: a graded question without a split puts its loss in 'reason not recorded' and is counted as unsplit", () => {
    const pm = paperMarksLost([
      { totalMarks: 3, marksAwarded: 2, marksLostByType: mk({ calculation: 1 }) },
      { totalMarks: 4, marksAwarded: 2, mistakeSummary: { conceptual: 1 } },
      { totalMarks: 2, marksAwarded: 2 },
    ]);
    expect(pm).toEqual({ byType: mk({ calculation: 1, untyped: 2 }), lost: 3, unsplitCount: 1 });
    // G3 — the parts always sum to the loss.
    const sum = Object.values(pm!.byType).reduce((s, n) => s + n, 0);
    expect(sum).toBe(pm!.lost);
  });
});

// Controller rulings R1/R2 (2026-10-05): "Not attempted" is ONLY the server's v2 `unattempted`
// bucket, or a v1 question where EVERY marked step is "missing" with nothing awarded. A single
// untyped "missing" part on an otherwise attempted v1 answer is a loss with no reason recorded —
// it IS lost to the work (an MI entry); a "missing" step the grader TYPED keeps its type.
describe("PR-2 / R1 / R2 — marks lost to the WORK (only a part the SERVER calls unattempted is never a mistake)", () => {
  const step = (status: string, over: Record<string, unknown> = {}) => ({ status, marksAwarded: 0, marksDeducted: 0, mistakeType: null, ...over });

  it("v2: the loss minus the server's 'unattempted' bucket, exactly", () => {
    expect(marksLostToWork({ totalMarks: 4, marksAwarded: 1, marksLostByType: mk({ unattempted: 2, conceptual: 1 }) })).toBe(1);
    expect(marksLostToWork({ totalMarks: 4, marksAwarded: 1, marksLostByType: mk({ unattempted: 3 }) })).toBe(0);
  });

  it("R2 · v2: an UNTYPED 'missing' step's mark (filed by the server under untyped) IS lost to the work", () => {
    const q = {
      totalMarks: 4,
      marksAwarded: 3,
      annotatedSteps: [step("correct", { marksAwarded: 2 }), step("missing", { marksDeducted: 1 }), step("correct", { marksAwarded: 1 })],
      marksLostByType: mk({ untyped: 1 }),
    };
    expect(marksLostToWork(q)).toBe(1);
  });

  it("R1 · v2: a 'missing' step TYPED presentation 0.5 is lost to the work (its type kept)", () => {
    const q = {
      totalMarks: 2,
      marksAwarded: 1.5,
      annotatedSteps: [step("correct", { marksAwarded: 1.5 }), step("missing", { marksDeducted: 0.5, mistakeType: "presentation" })],
      marksLostByType: mk({ presentation: 0.5 }),
    };
    expect(marksLostToWork(q)).toBe(0.5);
  });

  it("R1/R2 · v1: ONE untyped 'missing' part, every other step correct → the WHOLE loss is the work's (reason not recorded)", () => {
    const q = { totalMarks: 4, marksAwarded: 2, annotatedSteps: [step("correct", { marksAwarded: 2 }), step("missing", { marksDeducted: 2 })] };
    expect(marksLostToWork(q)).toBe(2);
  });

  it("R1 · v1: a 'missing' step TYPED presentation is lost to the work", () => {
    const q = { totalMarks: 2, marksAwarded: 1.5, annotatedSteps: [step("correct", { marksAwarded: 1.5 }), step("missing", { marksDeducted: 0.5, mistakeType: "presentation" })] };
    expect(marksLostToWork(q)).toBe(0.5);
  });

  it("v1: a question with EVERY marked step 'missing' and nothing awarded is not attempted → 0", () => {
    const q = { totalMarks: 4, marksAwarded: 0, annotatedSteps: [step("missing", { marksDeducted: 2 }), step("missing", { marksDeducted: 2 })] };
    expect(isQuestionNotAttempted(q)).toBe(true);
    expect(marksLostToWork(q)).toBe(0);
  });

  it("v1 CONTROL: a real wrong step beside a missing one — the whole loss is the work's", () => {
    const q = {
      totalMarks: 4,
      marksAwarded: 1,
      annotatedSteps: [step("incorrect", { marksDeducted: 1, mistakeType: "calculation" }), step("correct", { marksAwarded: 1 }), step("missing", { marksDeducted: 2 })],
    };
    expect(marksLostToWork(q)).toBe(3);
    // and with no missing step at all, the whole loss is the work's
    expect(marksLostToWork({ totalMarks: 3, marksAwarded: 1, annotatedSteps: [step("incorrect", { marksDeducted: 2 })] })).toBe(2);
  });

  it("a crossed-out step is not part of the answer when deciding (only MARKED steps count)", () => {
    // [withdrawn, missing], nothing awarded: every MARKED step is missing → not attempted → 0
    const notAttempted = { totalMarks: 4, marksAwarded: 0, annotatedSteps: [step("withdrawn", { studentWork: "struck" }), step("missing", { marksDeducted: 4 })] };
    expect(marksLostToWork(notAttempted)).toBe(0);
    // [correct, withdrawn, missing]: attempted (a step earned marks) → the whole loss is the work's
    const attempted = {
      totalMarks: 4,
      marksAwarded: 2,
      annotatedSteps: [step("correct", { marksAwarded: 2 }), step("withdrawn", { studentWork: "struck" }), step("missing", { marksDeducted: 2 })],
    };
    expect(marksLostToWork(attempted)).toBe(2);
  });
});

describe("PR-2 B8 — not attempted, with crossed-out work", () => {
  const na = { stepNumber: 1, status: "missing", mistakeType: null, marksDeducted: 2 };
  const struck = { stepNumber: 2, status: "withdrawn", mistakeType: null, marksDeducted: 0 };

  it("crossed-out work is not an answer: [withdrawn, missing] with nothing awarded is NOT ATTEMPTED", () => {
    expect(isQuestionNotAttempted({ totalMarks: 2, marksAwarded: 0, annotatedSteps: [struck, na] })).toBe(true);
    expect(isQuestionNotAttempted({ totalMarks: 2, marksAwarded: 0, annotatedSteps: [struck, { ...na, status: "unattempted" }] })).toBe(true);
  });

  it("ONLY crossed-out work (no marked step) is not assumed to be not attempted", () => {
    expect(isQuestionNotAttempted({ totalMarks: 2, marksAwarded: 0, annotatedSteps: [struck] })).toBe(false);
  });

  it("a v2 grade whose WHOLE loss is unattempted is not attempted even without steps", () => {
    expect(isQuestionNotAttempted({ totalMarks: 3, marksAwarded: 0, marksLostByType: mk({ unattempted: 3 }) })).toBe(true);
    expect(isQuestionNotAttempted({ totalMarks: 3, marksAwarded: 0, marksLostByType: mk({ unattempted: 2, conceptual: 1 }) })).toBe(false);
  });

  it("a question that was not graded is never 'not attempted' (it has its own state)", () => {
    expect(isQuestionNotAttempted({ totalMarks: 2, marksAwarded: 0, answerMismatch: true, annotatedSteps: [na] })).toBe(false);
  });

  it("splitWithdrawnSteps keeps order and draws the crossed-out steps apart", () => {
    const s = [{ status: "correct", n: 1 }, { status: "withdrawn", n: 2 }, { status: "incorrect", n: 3 }, { status: "withdrawn", n: 4 }];
    const out = splitWithdrawnSteps(s);
    expect(out.marked.map((x) => x.n)).toEqual([1, 3]);
    expect(out.withdrawn.map((x) => x.n)).toEqual([2, 4]);
    // a legacy grade has no withdrawn steps: every step is marked, in order
    expect(splitWithdrawnSteps([{ status: "correct" }, { status: "missing" }]).withdrawn).toEqual([]);
    expect(splitWithdrawnSteps(null)).toEqual({ marked: [], withdrawn: [] });
  });
});

describe("PR-2 B7 — coaching in MARKS (coachingLine with marks)", () => {
  it("names the owner's groups in MARKS, never 'full marks' while marks were lost", () => {
    const marks = mk({ conceptual: 2, presentation: 1, calculation: 0.5, silly: 0.5, unattempted: 1, untyped: 0.5 });
    const line = coachingLine({ marksAwarded: 4.5, marksTotal: 10, counts: { conceptual: 7 }, marks });
    expect(line).toContain("Learn this: 2 marks to gain");
    expect(line).toContain("The quickest wins: 1 mark to gain");
    expect(line).toContain("You already know this: 1 mark to gain");
    expect(line).toContain("1 mark not attempted — not counted as a mistake.");
    expect(line).toContain("0.5 marks lost, reason not recorded.");
    expect(line).not.toMatch(/full marks/i);
    // marks win over the counts: the count wording never appears beside them
    expect(line).not.toMatch(/knowledge gap/i);
    expect(line).not.toMatch(/\d+ mistakes?\b/);
  });

  it("marks lost but every bucket zero → never 'full marks'", () => {
    expect(coachingLine({ marksAwarded: 1, marksTotal: 3, counts: {}, marks: mk() })).not.toMatch(/full marks/i);
  });

  it("a mismatched answer is named apart, in the owner's words, and is not a 'pending page'", () => {
    const line = coachingLine({ marksAwarded: 2, marksTotal: 3, counts: {}, marks: mk({ silly: 1 }), mismatchCount: 1, pendingCount: 2 });
    expect(line).toContain(`1 answer not marked: ${ANSWER_MISMATCH_COPY}.`);
    expect(line).toContain("Re-upload the 1 pending page to complete your score.");
  });

  it("CONTROL — nothing lost with marks present says full marks", () => {
    expect(coachingLine({ marksAwarded: 3, marksTotal: 3, counts: {}, marks: mk() })).toContain("Full marks");
  });
});

describe("PR-2 B7 — locally scored objective loss (objectiveMarksLost)", () => {
  it("unanswered = NOT ATTEMPTED, the whole mark", () => {
    expect(objectiveMarksLost({ totalMarks: 1, marksAwarded: 0, attempted: false })).toEqual(mk({ unattempted: 1 }));
  });
  it("a wrong pick with the grader's type → that type; without (or with junk) → reason not recorded", () => {
    expect(objectiveMarksLost({ totalMarks: 1, marksAwarded: 0, attempted: true, type: "silly" })).toEqual(mk({ silly: 1 }));
    expect(objectiveMarksLost({ totalMarks: 1, marksAwarded: 0, attempted: true })).toEqual(mk({ untyped: 1 }));
    expect(objectiveMarksLost({ totalMarks: 1, marksAwarded: 0, attempted: true, type: "guesswork" })).toEqual(mk({ untyped: 1 }));
  });
  it("a right pick loses nothing", () => {
    expect(objectiveMarksLost({ totalMarks: 1, marksAwarded: 1, attempted: true, type: "silly" })).toEqual(mk());
  });
});

describe("PR-2 B8 — the rubric (readRubric) is validated, never invented", () => {
  it("a valid rubric comes back, points trimmed", () => {
    expect(readRubric([{ point: "  Correct formula ", marks: 0.5 }, { point: "Answer with unit", marks: 1 }])).toEqual([
      { point: "Correct formula", marks: 0.5 },
      { point: "Answer with unit", marks: 1 },
    ]);
  });
  it("absent, empty or ANY malformed point → null (nothing renders)", () => {
    expect(readRubric(undefined)).toBeNull();
    expect(readRubric(null)).toBeNull();
    expect(readRubric([])).toBeNull();
    expect(readRubric("Correct formula: 1")).toBeNull();
    expect(readRubric([{ point: "ok", marks: 1 }, { point: "", marks: 1 }])).toBeNull();
    expect(readRubric([{ point: "ok", marks: -1 }])).toBeNull();
    expect(readRubric([{ point: "ok", marks: "1" }])).toBeNull();
    expect(readRubric([{ point: "ok", marks: Number.NaN }])).toBeNull();
    expect(readRubric([null])).toBeNull();
  });
});

describe("PR-2 G5 — a stored MI entry gives marks ONLY with the versioned field", () => {
  it("version 1 + a valid record → marks", () => {
    expect(MARKS_LOST_BY_TYPE_VERSION).toBe(1);
    expect(entryMarksLost({ marksLostByType: mk({ conceptual: 2 }), marksLostByTypeVersion: 1 })).toEqual(mk({ conceptual: 2 }));
  });
  it("no version, another version, or a malformed record → null (count-only, never converted)", () => {
    expect(entryMarksLost({ marksLostByType: mk({ conceptual: 2 }) })).toBeNull();
    expect(entryMarksLost({ marksLostByType: mk({ conceptual: 2 }), marksLostByTypeVersion: 2 })).toBeNull();
    expect(entryMarksLost({ marksLostByType: mk({ conceptual: 2 }), marksLostByTypeVersion: "1" })).toBeNull();
    expect(entryMarksLost({ marksLostByType: { conceptual: 2 }, marksLostByTypeVersion: 1 })).toBeNull();
    expect(entryMarksLost(null)).toBeNull();
  });
});
