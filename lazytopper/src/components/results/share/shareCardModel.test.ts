import { describe, it, expect } from "vitest";
import {
  SHARE_LINK,
  buildShareCardModel,
  canShareScore,
  shareContextOf,
  shareText,
  whatsAppShareUrl,
} from "./shareCardModel";
import type { ScorecardVariant } from "../scorecardVariants";

/** SHARE-SCORE-1 - the share model is an allow-list; synthetic variants only (types-only import). */
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

const typedMarks = {
  byType: { conceptual: 3, calculation: 1, silly: 0.5, presentation: 0, unattempted: 1, untyped: 0 },
  lost: 5.5,
  unsplitCount: 0,
};

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
    expect(
      canShareScore(variant({ score: { kind: "attempts", attempted: 3, ofN: 5, mcqAnswered: 0, mcqCorrect: 0 } })),
    ).toBe(false);
  });
  it("not a 0-mark total", () => {
    expect(canShareScore(variant({ score: { kind: "marks", awarded: 0, total: 0 } }))).toBe(false);
  });
  it("not the signed-out Check & Improve preview (its Save sign-up row)", () => {
    expect(
      canShareScore(
        variant({
          surface: "check-improve",
          actions: [{ label: "Sign up to save this", tag: "Save", tone: "secondary", onClick: () => {} }],
        }),
      ),
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
    expect(shareContextOf({ title: "Check & Improve paper", subtitle: "Uploaded paper · CI-1 · graded just now" })).toBeNull();
    expect(shareContextOf({ title: "QP-M-RN-04", subtitle: "QP-M-RN-04 · graded 3 Oct" })).toBeNull();
  });
});

describe("shareContextOf - adversarial codes (review fix 2)", () => {
  const CODE_ANY = /\b(?:ws|ct|fm|ci|qp|unl)-|3fa9c0b1|[0-9a-f]{8}/i;
  const cases: Array<[string, string, string | null]> = [
    // [title, subtitle, expected]
    ["QP-M-RN-3fa9c0b1", "QP-M-RN-3fa9c0b1 · graded 3 Oct", null],
    ["qp-m-rn-3fa9c0b1", "qp-m-rn-3fa9c0b1 · graded 3 Oct", null],
    ["Real Numbers QP-M-RN-3fa9c0b1", "x", "Real Numbers"],
    ["WS-M-RN-03", "WS-M-RN-03 · graded 3 Oct", null],
    ["CT-S-LI-02 · Test #2", "CT-S-LI-02 · graded 3 Oct", null],
    ["Light · CT-S-LI-02", "CT-S-LI-02 · graded 3 Oct", "Light"],
    ["FM-M-04", "FM-M-04 · fully graded", null],
    ["ws-lx1a2b-9f8e7d", "Topic Leak · ws-lx1a2b-9f8e7d", null],
    ["", "Leaked Subtitle Topic · CI-M-TR-01", null],
    ["   ", "Leaked Subtitle Topic", null],
  ];
  it.each(cases)("title %j / subtitle %j -> %j", (title, subtitle, expected) => {
    const out = shareContextOf({ title, subtitle });
    expect(out).toBe(expected);
    if (out) expect(out).not.toMatch(CODE_ANY);
  });

  it("a saved / reopened record never falls back to its subtitle", () => {
    // Reopen subtitles lead with the record id (scorecardVariants.ts:964, :1876, :1967, :2084).
    expect(shareContextOf({ title: "Session scorecard", subtitle: "Triangles · QP-M-TR-3fa9c0b1" })).toBeNull();
    expect(shareContextOf({ title: "CI-M-TR-01", subtitle: "Triangles · graded 3 Oct" })).toBeNull();
  });

  it("only the LIVE C&I head reads the subtitle, and strips its code", () => {
    expect(shareContextOf({ title: "Check & Improve paper", subtitle: "Light ci-s-li-07 · CI-S-LI-07 · graded just now" })).toBe("Light");
  });
});

describe("buildShareCardModel - the allow-list", () => {
  it("copies only score, surface, context, split and date", () => {
    const m = buildShareCardModel(variant({ marksLost: typedMarks }), "17 Oct 2026");
    expect(m).toEqual({
      surface: "chapter-test",
      surfaceLabel: "Chapter Test",
      context: "Real Numbers",
      awarded: 34,
      total: 40,
      split: [
        { key: "knowledge", label: "Knowledge gap", marks: 3 },
        { key: "careless", label: expect.any(String), marks: 1.5 },
      ],
      dateLabel: "17 Oct 2026",
    });
  });
  it("omits the split when the grade has no typed marks (count-only)", () => {
    const m = buildShareCardModel(
      variant({ marksLost: null, fourType: { conceptual: 2, calculation: 1, silly: 0, presentation: 0 } }),
      "17 Oct 2026",
    );
    expect(m?.split).toBeNull();
  });
  it("never carries personal or working fields even when the variant has them", () => {
    const m = buildShareCardModel(
      variant({
        gradedAnswers: [{ label: "Q1", awarded: 1, available: 2, verdict: "SECRET-VERDICT", lostDetail: "SECRET-WORK" }],
        wrongAnswers: [{ label: "Q2", yourAnswer: "SECRET-ANSWER", correctAnswer: "B", steps: ["SECRET-STEP"] }],
        message: "SECRET-MESSAGE",
        note: "SECRET-NOTE",
      }),
      "17 Oct 2026",
    );
    const json = JSON.stringify(m);
    expect(json).not.toMatch(/SECRET|CT-M-RN-02/);
  });
  it("null for a non-shareable scorecard", () => {
    expect(buildShareCardModel(variant({ deferred: true }), "x")).toBeNull();
  });
});

describe("share text + wa.me link", () => {
  it("names the chapter and carries the tracked link", () => {
    expect(shareText({ awarded: 34, total: 40, context: "Real Numbers", surface: "chapter-test" })).toBe(
      `I scored 34/40 in Real Numbers on LazyTopper. Try it: ${SHARE_LINK}`,
    );
    expect(SHARE_LINK).toBe("https://www.lazytopper.com/?utm_source=whatsapp&utm_medium=share&utm_campaign=scorecard");
  });
  it("falls back to the surface when there is no chapter", () => {
    expect(shareText({ awarded: 12, total: 20, context: null, surface: "check-improve" })).toMatch(
      /^I scored 12\/20 in a Check & Improve paper on LazyTopper\./,
    );
  });
  it("wa.me link encodes the whole text, query string included", () => {
    const text = shareText({ awarded: 3.5, total: 5, context: "Light & Optics", surface: "worksheet" });
    const url = whatsAppShareUrl(text);
    expect(url.startsWith("https://wa.me/?text=")).toBe(true);
    const encoded = url.slice("https://wa.me/?text=".length);
    expect(encoded).not.toMatch(/[ &?=]/);
    expect(decodeURIComponent(encoded)).toBe(text);
  });
});
