import { describe, it, expect, vi } from "vitest";
import {
  ObjectiveMarkNotBinaryError,
  isCarelessMistakeKind,
  quickPracticeGradedScorecardVariant,
  quickPracticeScorecardVariant,
} from "./scorecardVariants";
import type { ScorecardGradedAnswer } from "./scorecardVariants";

/**
 * BATCH-2 · the Quick Practice GRADED variant BUILDER.
 *
 * ★★ THIS SURFACE IS UNREACHABLE UNTIL `WIRE-2` WIRES IT — no host calls this builder
 * yet. These tests are the only caller, on purpose: the owner rules on the graded sheet
 * before the practice loop changes under students.
 */

const mcq: ScorecardGradedAnswer = {
  label: "Question 5",
  descriptor: "MCQ · 1 mark",
  awarded: 0,
  available: 1,
  objective: true,
  verdict: "Whole mark or nothing — MCQs are never step-marked.",
  lostLabel: "What your working shows:",
  lostDetail: "you took the first term as 3, not -3.",
  mistakeType: "Silly slip",
  mistakeKind: "silly",
};

const base = () => ({
  marksAwarded: 9,
  marksTotal: 14,
  gradedCount: 7,
  totalQuestions: 8,
});

describe("quickPracticeGradedScorecardVariant — the set scorecard", () => {
  it("builds a MARKS hero with the honest graded counts, on the quick-practice surface", () => {
    const v = quickPracticeGradedScorecardVariant(base());
    expect(v.surface).toBe("quick-practice");
    expect(v.title).toBe("Session scorecard");
    expect(v.score).toEqual({
      kind: "marks",
      awarded: 9,
      total: 14,
      gradedCount: 7,
      totalQuestions: 8,
    });
  });

  it("★ HONEST-OR-SILENT — absent inputs produce nulls, never empty scaffolding", () => {
    const v = quickPracticeGradedScorecardVariant(base());
    expect(v.split).toBeNull();
    expect(v.gradedAnswers).toBeNull();
    expect(v.sectionLens).toBeNull();
    expect(v.fourType).toBeNull();
    expect(v.pending).toBeNull();
    expect(v.allPending).toBeNull();
  });

  it("CONTROL — supplied inputs DO reach the variant", () => {
    const v = quickPracticeGradedScorecardVariant({
      ...base(),
      sectionLens: [{ section: "A", label: "Section A", awarded: 2, total: 3 }],
      markedNow: [{ tag: "Q1", detail: "Correct · 1 mark", tone: "good" }],
      readyToGrade: [{ tag: "Q6", detail: "Photo · 3 marks", tone: "pending" }],
      nothingSaved: ["Q4", "Q9"],
      answers: [mcq],
      fourType: { conceptual: 0, calculation: 0, silly: 1, presentation: 0 },
    });
    expect(v.sectionLens).toHaveLength(1);
    expect(v.split?.markedNow).toHaveLength(1);
    expect(v.split?.readyToGrade).toHaveLength(1);
    expect(v.split?.nothingSavedNote).toBe("Q4 and Q9 have nothing saved — nothing has been scored 0.");
    expect(v.gradedAnswers).toHaveLength(1);
    expect(v.fourType).toEqual({ conceptual: 0, calculation: 0, silly: 1, presentation: 0 });
  });

  it("an ALL-ZERO fourType is honest silence, not an empty MI block", () => {
    const v = quickPracticeGradedScorecardVariant({
      ...base(),
      fourType: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
    });
    expect(v.fourType).toBeNull();
  });

  it("nothing unanswered ⇒ NO note (never a fabricated '0 unanswered' line)", () => {
    const v = quickPracticeGradedScorecardVariant({
      ...base(),
      markedNow: [{ tag: "Q1", detail: "Correct · 1 mark", tone: "good" }],
      nothingSaved: [],
    });
    expect(v.split?.nothingSavedNote).toBeNull();
  });
});

describe("★★ the MCQ rule is ENFORCED, not hoped for", () => {
  it("an objective answer scoring 0 or its FULL mark builds cleanly, keeping its mistake type", () => {
    const v = quickPracticeGradedScorecardVariant({
      ...base(),
      answers: [mcq, { ...mcq, label: "Question 9", awarded: 1, mistakeType: null, mistakeKind: null }],
    });
    expect(v.gradedAnswers?.[0].awarded).toBe(0);
    expect(v.gradedAnswers?.[0].mistakeType).toBe("Silly slip"); // ★ binary mark, real diagnosis
    expect(v.gradedAnswers?.[1].awarded).toBe(1);
  });

  it("★ a FRACTIONAL objective mark THROWS — CBSE never step-marks a 1-marker", () => {
    expect(() =>
      quickPracticeGradedScorecardVariant({ ...base(), answers: [{ ...mcq, awarded: 0.5 }] }),
    ).toThrow(ObjectiveMarkNotBinaryError);
    expect(() =>
      quickPracticeGradedScorecardVariant({ ...base(), answers: [{ ...mcq, available: 2, awarded: 1 }] }),
    ).toThrow(/whole mark or nothing/i);
  });

  it("CONTROL — the SAME fractional mark on a NON-objective answer is fine", () => {
    const v = quickPracticeGradedScorecardVariant({
      ...base(),
      answers: [{ label: "Question 7", descriptor: "5 marks", awarded: 3, available: 5 }],
    });
    expect(v.gradedAnswers?.[0].awarded).toBe(3);
  });

  it("an objective answer with NO mark at all is left alone (typed-no-channel is not a fraction)", () => {
    const v = quickPracticeGradedScorecardVariant({
      ...base(),
      answers: [
        {
          label: "Question 2",
          objective: true,
          ungraded: { reason: "typed-no-channel", title: "Not graded", detail: "Nothing has been scored 0." },
        },
      ],
    });
    expect(v.gradedAnswers?.[0].awarded).toBeUndefined();
  });
});

describe("the return ticket rides the graded variant", () => {
  it("★ appended as the 'Back'-tagged secondary row, with the caller's own handler", () => {
    const onReturn = vi.fn();
    const v = quickPracticeGradedScorecardVariant({
      ...base(),
      onKeepPracticing: () => {},
      onFreshSet: () => {},
      returnTicket: { label: "Back to your tutor", onReturn },
    });
    const ticket = v.actions[v.actions.length - 1];
    expect(ticket.label).toBe("Back to your tutor");
    expect(ticket.tag).toBe("Back");
    expect(ticket.tone).toBe("secondary");
    ticket.onClick();
    expect(onReturn).toHaveBeenCalledTimes(1);
    // ★ SHAPE PARITY with the surface it has to be interchangeable with.
    const qp = quickPracticeScorecardVariant({
      attempted: 3,
      totalInSet: 5,
      mcqAnswered: 0,
      mcqCorrect: 0,
      allDone: false,
      onFreshSet: () => {},
      onChapterTest: () => {},
      onPredicted: () => {},
      onStudy: () => {},
      returnTicket: { label: "Back to your tutor", onReturn: () => {} },
    });
    const qpTicket = qp.actions[qp.actions.length - 1];
    expect({ tag: qpTicket.tag, tone: qpTicket.tone }).toEqual({ tag: ticket.tag, tone: ticket.tone });
  });

  it("CONTROL — no ticket ⇒ no 'Back to your tutor' row anywhere in the menu", () => {
    const v = quickPracticeGradedScorecardVariant({ ...base(), onFreshSet: () => {} });
    expect(v.actions.map((a) => a.label)).not.toContain("Back to your tutor");
    expect(v.actions[0].tone).toBe("primary"); // the session's own next step keeps primary
  });
});

describe("isCarelessMistakeKind", () => {
  it("silly and presentation ONLY", () => {
    expect(isCarelessMistakeKind("silly")).toBe(true);
    expect(isCarelessMistakeKind("presentation")).toBe(true);
    expect(isCarelessMistakeKind("conceptual")).toBe(false);
    expect(isCarelessMistakeKind("calculation")).toBe(false);
    expect(isCarelessMistakeKind(null)).toBe(false);
    expect(isCarelessMistakeKind(undefined)).toBe(false);
  });
});

describe("★★ every EXISTING variant is byte-identical — the new fields are absent, not null-by-default", () => {
  it("quickPracticeScorecardVariant carries no split and no gradedAnswers", () => {
    const v = quickPracticeScorecardVariant({
      attempted: 3,
      totalInSet: 5,
      mcqAnswered: 2,
      mcqCorrect: 2,
      allDone: false,
      onFreshSet: () => {},
      onChapterTest: () => {},
      onPredicted: () => {},
      onStudy: () => {},
    });
    expect("split" in v).toBe(false);
    expect("gradedAnswers" in v).toBe(false);
  });
});
