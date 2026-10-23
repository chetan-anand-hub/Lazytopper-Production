import { describe, it, expect } from "vitest";
import {
  buildShareCardModel,
  canShareScore,
  objectiveSplitOf,
  shareContextOf,
  shareLink,
  shareText,
  whatsAppShareUrl,
} from "./shareCardModel";
import { MISTAKE_TYPE_LABEL } from "../../../lib/mistakeDisplay";
import type { ScorecardVariant } from "../scorecardVariants";
import {
  FX_ALL_ZERO,
  FX_COUNT_ONLY,
  FX_FOUR_TYPES,
  FX_GREAT,
  FX_HIDE,
  FX_LOW,
  FX_OBJECTIVE_ONLY,
  FX_PENDING,
  FX_PARTIAL_QP,
  FX_UNTYPED_BIGGEST,
} from "../../../test/shareFixtures";

/** SHARE-CARD-1 - the share model is an allow-list over the scorecard's OWN data. */
const D = { dateLabel: "23 Oct 2026" };

function variant(over: Partial<ScorecardVariant> = {}): ScorecardVariant {
  return {
    surface: "chapter-test",
    title: "Real Numbers · Test #2",
    subtitle: "CT-M-RN-02 · graded just now",
    score: { kind: "marks", awarded: 34, total: 40, gradedCount: 10, totalQuestions: 10 },
    actions: [{ label: "Read", tone: "primary", onClick: () => {} }],
    ...over,
  };
}

describe("canShareScore - who gets the button", () => {
  it("a graded marks score is shareable", () => {
    expect(canShareScore(variant())).toBe(true);
  });
  it("not the all-pending (nothing read) state", () => {
    expect(canShareScore(variant({ allPending: { title: "Waiting", detail: "x" } }))).toBe(false);
  });
  it("not a deferred stub", () => {
    expect(canShareScore(variant({ deferred: true }))).toBe(false);
  });
  it("not an attempts-only hero (no graded score)", () => {
    expect(canShareScore(variant({ score: { kind: "attempts", attempted: 3, ofN: 5, mcqAnswered: 0, mcqCorrect: 0 } }))).toBe(false);
  });
  it("not a 0-mark total", () => {
    expect(canShareScore(variant({ score: { kind: "marks", awarded: 0, total: 0 } }))).toBe(false);
  });
  it("not the signed-out Check & Improve preview (its Save sign-up row)", () => {
    expect(
      canShareScore(variant({ surface: "check-improve", actions: [{ label: "Sign up to save this", tag: "Save", tone: "secondary", onClick: () => {} }] })),
    ).toBe(false);
  });
});

describe("shareContextOf - chapter/subject, never a code", () => {
  it("takes the head's first segment", () => {
    expect(shareContextOf({ title: "Real Numbers · Worksheet 3", subtitle: "WS-M-RN-03 · graded just now" })).toBe("Real Numbers");
    expect(shareContextOf({ title: "Maths · Mock #4", subtitle: "FM-M-04 · submitted & scored" })).toBe("Maths");
  });
  it("a generic head falls back to the subtitle's topic (live C&I)", () => {
    expect(shareContextOf({ title: "Check & Improve paper", subtitle: "Triangles · CI-M-TR-01 · graded just now" })).toBe("Triangles");
  });
  it("generic everywhere -> null, and a code is never the context", () => {
    expect(shareContextOf({ title: "Session scorecard", subtitle: "Quick practice" })).toBeNull();
    expect(shareContextOf({ title: "QP-M-RN-04", subtitle: "QP-M-RN-04 · graded 3 Oct" })).toBeNull();
    expect(shareContextOf({ title: "Light · CT-S-LI-02", subtitle: "x" })).toBe("Light");
    expect(shareContextOf({ title: "Session scorecard", subtitle: "Triangles · QP-M-TR-3fa9c0b1" })).toBeNull();
  });
});

describe("buildShareCardModel - Mistake Intelligence, four types", () => {
  it("four rows in the product's order and labels, count AND marks from the scorecard", () => {
    const m = buildShareCardModel(FX_FOUR_TYPES, D)!;
    expect(m.mi).toBe("marks");
    expect(m.rows!.map((r) => r.label)).toEqual([
      MISTAKE_TYPE_LABEL.conceptual,
      MISTAKE_TYPE_LABEL.calculation,
      MISTAKE_TYPE_LABEL.silly,
      MISTAKE_TYPE_LABEL.presentation,
    ]);
    expect(m.rows!.map((r) => [r.count, r.marks])).toEqual([
      [2, 1.5],
      [1, 0.5],
      [3, 3],
      [1, 0.5],
    ]);
    expect(m.notAttemptedMarks).toBe(0.5);
    expect(m.untypedMarks).toBe(0);
  });
  it("calculation is its own row - never folded into a 'careless' group", () => {
    const m = buildShareCardModel(FX_FOUR_TYPES, D)!;
    expect(m.rows!.find((r) => r.type === "calculation")!.label).toBe("Calculation slip");
    expect(JSON.stringify(m)).not.toMatch(/careless/i);
  });
  it("biggest loss is called out, and Byte's tip names it with its own marks", () => {
    const m = buildShareCardModel(FX_FOUR_TYPES, D)!;
    expect(m.biggest).toMatchObject({ kind: "silly", marks: 3 });
    expect(m.rows!.filter((r) => r.biggest).map((r) => r.type)).toEqual(["silly"]);
    expect(m.byte.line).toBe("Silly slips cost 3 marks. Check signs and copying again!");
  });
  it("Ziggy's pose follows the result: great / mixed / oops / hide", () => {
    expect(buildShareCardModel(FX_GREAT, D)!.ziggy).toMatchObject({ mood: "great", pose: "excited" });
    expect(buildShareCardModel(FX_FOUR_TYPES, D)!.ziggy).toMatchObject({ mood: "mixed", pose: "determined" });
    expect(buildShareCardModel(FX_LOW, D)!.ziggy).toMatchObject({ mood: "oops", pose: "oops" });
    const hide = buildShareCardModel(FX_HIDE, D)!;
    expect(hide.ziggy).toMatchObject({ mood: "hide", pose: "hide" });
    expect(hide.biggest).toMatchObject({ kind: "unattempted", marks: 30 });
    expect(hide.byte.line).toBe("Blank answers cost 30 marks. Even the right formula earns marks!");
  });
});

describe("buildShareCardModel - honest edges", () => {
  it("all-zero: four 0s shown as 0 (never hidden, never invented), clean tip", () => {
    const m = buildShareCardModel(FX_ALL_ZERO, D)!;
    expect(m.rows!.map((r) => [r.count, r.marks])).toEqual([
      [0, 0],
      [0, 0],
      [0, 0],
      [0, 0],
    ]);
    expect(m.biggest).toBeNull();
    expect(m.byte.key).toBe("clean");
  });
  it("objective-only: right / wrong from the scorecard + the one MI line it supports", () => {
    const m = buildShareCardModel(FX_OBJECTIVE_ONLY, D)!;
    expect(m.mi).toBe("objective");
    expect(m.rows).toBeNull();
    expect(m.objective).toEqual({ right: 3, wrong: 2 });
    expect(m.byte.key).toBe("objective-wrong");
  });
  it("objective split: a graded sheet of objective answers counts whole marks; anything unproven -> null", () => {
    const ga = [
      { label: "Q1", objective: true, awarded: 1, available: 1 },
      { label: "Q2", objective: true, awarded: 0, available: 1 },
      { label: "Q3", objective: true, awarded: 1, available: 1 },
    ];
    expect(objectiveSplitOf(variant({ gradedAnswers: ga }))).toEqual({ right: 2, wrong: 1 });
    expect(objectiveSplitOf(variant({ gradedAnswers: [...ga, { label: "Q4", awarded: 2, available: 3 }] }))).toBeNull();
    // QP whose marks are not one per MCQ: no guessed split.
    expect(objectiveSplitOf({ ...FX_OBJECTIVE_ONLY, score: { kind: "marks", awarded: 3, total: 6, gradedCount: 5 } })).toBeNull();
  });
  it("pending questions are excluded: the score and MI are the graded ones only", () => {
    const m = buildShareCardModel(FX_PENDING, D)!;
    expect([m.awarded, m.total]).toEqual([6, 10]);
    expect(JSON.stringify(m)).not.toMatch(/17|pending/i);
    expect(m.untypedMarks).toBe(2);
    // 2 marks with no recorded reason tie the 2 calculation marks: nothing is crowned.
    expect(m.biggest).toBeNull();
    expect(m.coverage).toEqual({ graded: 3, total: 5 });
  });
  it("partial grading (QP: 3 of 10 MCQs answered, all right) is never a whole, board-ready result", () => {
    const m = buildShareCardModel(FX_PARTIAL_QP, D)!;
    expect([m.awarded, m.total]).toEqual([3, 3]);
    expect(m.coverage).toEqual({ graded: 3, total: 10 });
    expect(m.ziggy.mood).toBe("keepgoing");
    expect(m.ziggy.line).not.toMatch(/board-ready/i);
    // Full coverage keeps "great"; >= 80% graded counts as full.
    expect(buildShareCardModel({ ...FX_PARTIAL_QP, score: { kind: "marks", awarded: 3, total: 3, gradedCount: 8, totalQuestions: 10 } }, D)!.ziggy.mood).toBe("great");
    expect(buildShareCardModel(FX_GREAT, D)!.coverage).toBeNull();
  });
  it("marks with no recorded reason as the largest bucket: no chip, Byte's generic tip", () => {
    const m = buildShareCardModel(FX_UNTYPED_BIGGEST, D)!;
    expect(m.biggest).toBeNull();
    expect(m.rows!.some((r) => r.biggest)).toBe(false);
    expect(m.byte.key).toBe("none");
  });
  it("zero marks lost to the four types: one 'No marks lost to mistakes' line (rows kept in the model)", () => {
    expect(buildShareCardModel(FX_ALL_ZERO, D)!.noMistakeLoss).toBe(true);
    expect(buildShareCardModel(FX_FOUR_TYPES, D)!.noMistakeLoss).toBe(false);
    expect(buildShareCardModel(FX_COUNT_ONLY, D)!.noMistakeLoss).toBe(false);
  });
  it("count-only grade: counts shown, marks null (never invented), biggest by count", () => {
    const m = buildShareCardModel(FX_COUNT_ONLY, D)!;
    expect(m.mi).toBe("counts");
    expect(m.rows!.every((r) => r.marks === null)).toBe(true);
    expect(m.byte.line).toBe("Most mistakes: Silly slip (2). Fix these first!");
  });
});

describe("buildShareCardModel - privacy allow-list", () => {
  it("first name OFF by default; only the cleaned name the caller passes", () => {
    expect(buildShareCardModel(FX_FOUR_TYPES, D)!.firstName).toBeNull();
    expect(buildShareCardModel(FX_FOUR_TYPES, { ...D, firstName: "Aarav" })!.firstName).toBe("Aarav");
  });
  it("mascots ON by default", () => {
    expect(buildShareCardModel(FX_FOUR_TYPES, D)!.showMascots).toBe(true);
    expect(buildShareCardModel(FX_FOUR_TYPES, { ...D, showMascots: false })!.showMascots).toBe(false);
  });
  it("never carries answers, working, codes, notes or the private result", () => {
    const m = buildShareCardModel(
      {
        ...FX_OBJECTIVE_ONLY,
        message: "SECRET-MESSAGE",
        note: "SECRET-NOTE",
        parentResultRef: "SECRET-REF",
        gradedAnswers: [{ label: "Q1", awarded: 1, available: 2, verdict: "SECRET-VERDICT", lostDetail: "SECRET-WORK" }],
      },
      D,
    );
    expect(JSON.stringify(m)).not.toMatch(/SECRET|QP-|@/);
  });
  it("null for a non-shareable scorecard", () => {
    expect(buildShareCardModel(variant({ deferred: true }), D)).toBeNull();
  });
});

describe("UTM link + share text", () => {
  it("points to the public landing with utm_source=share, utm_medium=scorecard, utm_campaign=<surface>", () => {
    const cases: Array<[ScorecardVariant["surface"], string]> = [
      ["check-improve", "check_improve"],
      ["worksheet", "worksheet"],
      ["chapter-test", "chapter_test"],
      ["full-mock", "full_mock"],
      ["quick-practice", "quick_practice"],
    ];
    for (const [surface, campaign] of cases) {
      const u = new URL(shareLink(surface));
      expect(u.origin + u.pathname).toBe("https://www.lazytopper.com/check-your-answer");
      expect(Object.fromEntries(u.searchParams)).toEqual({ utm_source: "share", utm_medium: "scorecard", utm_campaign: campaign });
    }
    expect(buildShareCardModel(FX_PENDING, D)!.link).toBe(shareLink("check-improve"));
  });
  it("names the chapter and carries the tracked public link", () => {
    expect(shareText({ awarded: 34, total: 40, context: "Real Numbers", surface: "chapter-test" })).toBe(
      `I scored 34/40 in Real Numbers on LazyTopper. See where your marks go: ${shareLink("chapter-test")}`,
    );
  });
  it("wa.me link encodes the whole text, query string included", () => {
    const text = shareText({ awarded: 3.5, total: 5, context: "Light & Optics", surface: "worksheet" });
    const url = whatsAppShareUrl(text);
    const encoded = url.slice("https://wa.me/?text=".length);
    expect(encoded).not.toMatch(/[ &?=]/);
    expect(decodeURIComponent(encoded)).toBe(text);
  });
});
