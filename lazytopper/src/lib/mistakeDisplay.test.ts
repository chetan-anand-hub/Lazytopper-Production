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
  MISTAKE_GROUPS,
  MISTAKE_TYPE_LABEL,
  NOT_ATTEMPTED,
  STORED_MISTAKE_TYPES,
  coachingLine,
  countWithUnit,
  effectivePaperCounts,
  effectiveTypeCounts,
  groupCounts,
  isCarelessType,
  isKnowledgeGapType,
  isQuestionNotAttempted,
  isTechniqueType,
  mistakeGroupOf,
  mistakeTypeLabel,
  questionChipType,
  stepDisplay,
  stepForDisplay,
  stepShowsType,
  withEffectiveCounts,
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

  it("an UNKNOWN status (a future 'withdrawn') never crashes and never reads Incorrect", () => {
    for (const s of ["withdrawn", "unattempted", undefined, null, 42]) {
      const d = stepDisplay(s);
      expect(d.kind).toBe("unknown");
      expect(d.label).not.toMatch(/incorrect/i);
      expect(d.showDeduction).toBe(false);
    }
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
