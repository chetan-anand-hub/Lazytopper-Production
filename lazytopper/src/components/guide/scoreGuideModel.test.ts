/**
 * GUIDE-SCORE-1 — the pure model: the copy rules (one table, ≤ 22 words, no digits, no "½", no
 * "Ask"), the situations, the MI next step, the stable pick per result id, and the truth rule
 * (every number a line carries is one the scorecard prints).
 */
import { describe, it, expect } from "vitest";
import { afterEach } from "vitest";
import {
  SCORE_GUIDE_LINES,
  scoreGuidePlan,
  scoreGuideSeed,
  scoreGuideSurface,
  seedHash,
  setScoreComfortProvider,
} from "./scoreGuideModel";
import type { ScorecardVariant } from "../results/scorecardVariants";
import { MISTAKE_TYPE_LABEL, type PaperMarksLost } from "../../lib/mistakeDisplay";

afterEach(() => setScoreComfortProvider(null));

const base = (over: Partial<ScorecardVariant> = {}): ScorecardVariant => ({
  surface: "worksheet",
  title: "Quadratic Equations - Mixed Worksheet",
  subtitle: "WS-M-QE-03 · graded just now",
  score: { kind: "marks", awarded: 12, total: 20, gradedCount: 4, totalQuestions: 4 },
  actions: [],
  ...over,
});

const marks = (byType: Partial<PaperMarksLost["byType"]>): PaperMarksLost => {
  const b = { conceptual: 0, calculation: 0, silly: 0, presentation: 0, unattempted: 0, untyped: 0, ...byType };
  const lost = Object.values(b).reduce((s, x) => s + x, 0);
  return { byType: b, lost } as PaperMarksLost;
};

const allLines = () => {
  const out: string[] = [];
  for (const set of Object.values(SCORE_GUIDE_LINES.ziggy)) for (const l of set) out.push(l.text);
  for (const set of Object.values(SCORE_GUIDE_LINES.byte)) for (const l of set) out.push(l.text);
  out.push(...Object.values(SCORE_GUIDE_LINES.cta));
  return out;
};
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

describe("GUIDE-SCORE-1 · the copy table", () => {
  it("★★ every line: ≤ 22 words even with the longest real values, no literal digit, no '½', no 'Ask'", () => {
    const longest = { got: "37.5", total: "80", delta: "12.5 marks", loss: "12.5 marks", pending: "12 questions" };
    for (const t of allLines()) {
      expect(t, t).not.toMatch(/\d/); // every number comes from a placeholder the scorecard prints
      expect(t, t).not.toContain("½");
      expect(t, t).not.toMatch(/\bask\b/i);
      const filled = t.replace(/\{(\w+)\}/g, (_, k: keyof typeof longest) => longest[k]);
      expect(words(filled), filled).toBeLessThanOrEqual(22);
    }
  });

  it("★ Byte names each MI type by the product's EXACT label (lib/mistakeDisplay MISTAKE_TYPE_LABEL)", () => {
    for (const t of ["conceptual", "calculation", "silly", "presentation"] as const) {
      for (const l of SCORE_GUIDE_LINES.byte[t]) expect(l.text, l.text).toContain(MISTAKE_TYPE_LABEL[t]);
    }
  });

  it("each situation and each next step has at least two lines (variety)", () => {
    for (const set of Object.values(SCORE_GUIDE_LINES.ziggy)) expect(set.length).toBeGreaterThanOrEqual(2);
    for (const set of Object.values(SCORE_GUIDE_LINES.byte)) expect(set.length).toBeGreaterThanOrEqual(2);
  });
});

describe("GUIDE-SCORE-1 · situations and the MI next step", () => {
  it("★★ great / mixed / low by the score's own numbers", () => {
    expect(scoreGuidePlan(base({ score: { kind: "marks", awarded: 18, total: 20 } }))!.situation).toBe("great");
    expect(scoreGuidePlan(base({ score: { kind: "marks", awarded: 12, total: 20 } }))!.situation).toBe("mixed");
    expect(scoreGuidePlan(base({ score: { kind: "marks", awarded: 6, total: 20 } }))!.situation).toBe("low");
  });

  it("★★ Ziggy's line carries the hero's numbers exactly", () => {
    const p = scoreGuidePlan(base({ score: { kind: "marks", awarded: 7.5, total: 20 } }))!;
    expect(p.ziggy.text).toContain("7.5");
    expect(p.ziggy.text).toContain("20");
  });

  it("★★ Byte names the biggest MI loss in MARKS (marksWithUnit), with a real route", () => {
    const p = scoreGuidePlan(base({ marksLost: marks({ silly: 3, calculation: 1, untyped: 4 }) }))!;
    expect(p.byteStep).toBe("silly");
    expect(p.byte.text).toContain("3 marks");
    expect(p.byte.text).toContain(MISTAKE_TYPE_LABEL.silly);
    expect(p.cta).toEqual({ label: "Practise more like these", to: "/practice-hub" });
  });

  it("a count-only grade names the biggest type in MISTAKES (the count block's unit)", () => {
    const p = scoreGuidePlan(base({ fourType: { conceptual: 2, calculation: 1, silly: 0, presentation: 0 } }))!;
    expect(p.byteStep).toBe("conceptual");
    expect(p.byte.text).toContain("2 mistakes");
  });

  it("presentation → 'Check a written answer' (but never on Check & Improve itself)", () => {
    const pm = marks({ presentation: 2 });
    expect(scoreGuidePlan(base({ marksLost: pm }))!.cta!.to).toBe("/check-improve");
    expect(scoreGuidePlan(base({ surface: "check-improve", subtitle: "CI-M-QE-01", marksLost: pm }))!.cta!.to).toBe("/practice-hub");
  });

  it("no typed loss: great → 'clean'; otherwise 'untyped' (never a claimed pattern)", () => {
    expect(scoreGuidePlan(base({ score: { kind: "marks", awarded: 20, total: 20 }, marksLost: marks({}) }))!.byteStep).toBe("clean");
    expect(scoreGuidePlan(base({ marksLost: marks({ untyped: 8 }) }))!.byteStep).toBe("untyped");
  });

  it("★ pending pages come first: the printed unreadable count, no link (re-upload lives on the card)", () => {
    const p = scoreGuidePlan(base({ pending: { count: 3, worksheetTotalMarks: 30, mismatch: ["Q4"] }, marksLost: marks({ silly: 2 }) }))!;
    expect(p.byteStep).toBe("pending");
    expect(p.byte.text).toContain("2 questions");
    expect(p.cta).toBeNull();
  });

  it("★★ objective-only (tap-only Quick Practice): MCQ numbers, Check a written answer", () => {
    const p = scoreGuidePlan(
      base({ surface: "quick-practice", subtitle: "Session scorecard", score: { kind: "attempts", attempted: 5, ofN: 5, mcqAnswered: 5, mcqCorrect: 3 } }),
    )!;
    expect(p.situation).toBe("objective-only");
    expect(p.byteStep).toBe("objective");
    expect(p.ziggy.text).toMatch(/3 out of 5/);
    expect(p.cta!.to).toBe("/check-improve");
  });

  it("★★ improved: ONLY from Full Mock's own printed ▲ delta", () => {
    const p = scoreGuidePlan(base({ surface: "full-mock", subtitle: "FM-M-04", message: "▲ 9 marks vs Maths · Mock #3" }))!;
    expect(p.situation).toBe("improved");
    expect(p.ziggy.text).toContain("9 marks");
    expect(scoreGuidePlan(base({ surface: "full-mock", subtitle: "FM-M-04", message: "▼ 4 marks vs Mock #3" }))!.situation).not.toBe("improved");
    // Any other surface: no previous result on the card → never "improved".
    expect(scoreGuidePlan(base({ message: "▲ 9 marks vs Mock #3" }))!.situation).not.toBe("improved");
  });

  it("★ all-pending: Ziggy steady, Byte points at the note, no number at all", () => {
    const p = scoreGuidePlan(base({ allPending: { title: "This answer doesn't match the question", detail: "…" } }))!;
    expect(p.situation).toBe("all-pending");
    expect(p.ziggy.text + p.byte.text).not.toMatch(/\d/);
    expect(p.cta).toBeNull();
  });

  it("all-pending 'couldn't read' with the host's own M6 moment → nothing here (no double mascots)", () => {
    const ap = { title: "We couldn’t read any answers", detail: "…" };
    expect(scoreGuidePlan(base({ allPending: ap }), { hostOwnsUnreadAllPending: true })).toBeNull();
    expect(scoreGuidePlan(base({ allPending: ap }))).not.toBeNull();
  });

  it("no checkable number (0 MCQs, no total) or a deferred stub → null (nothing guessed)", () => {
    expect(scoreGuidePlan(base({ score: { kind: "attempts", attempted: 0, ofN: 5, mcqAnswered: 0, mcqCorrect: 0 } }))).toBeNull();
    expect(scoreGuidePlan(base({ score: { kind: "marks", awarded: 0, total: 0 } }))).toBeNull();
    expect(scoreGuidePlan(base({ deferred: true }))).toBeNull();
  });
});

describe("GUIDE-SCORE-1 · stable per result id", () => {
  it("★★ the same result → the same lines, every time; the seed is the result's code", () => {
    const v = base({ marksLost: marks({ calculation: 2 }) });
    expect(scoreGuideSeed(v)).toBe("WS-M-QE-03");
    const a = scoreGuidePlan(v)!;
    for (let i = 0; i < 5; i++) expect(scoreGuidePlan(base({ marksLost: marks({ calculation: 2 }) }))).toEqual(a);
    expect(scoreGuideSeed(base({ parentResultRef: "CI-M-QE-07" }))).toBe("CI-M-QE-07");
  });

  it("different results reach different lines (the set is actually varied)", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 40; i++) seen.add(scoreGuidePlan(base({ subtitle: `WS-M-QE-${i}` }))!.ziggy.text);
    expect(seen.size).toBeGreaterThanOrEqual(2);
    expect(seedHash("abc")).toBe(seedHash("abc"));
  });
});

describe("GUIDE-SCORE-1 · the COMPANION-1 comfort seam", () => {
  const low = () => base({ score: { kind: "marks", awarded: 4, total: 20 } });
  it("★ a registered provider supplies Ziggy's LOW-score line and pose (placeholders filled); Byte unchanged", () => {
    const before = scoreGuidePlan(low())!;
    setScoreComfortProvider(() => ({ pose: "sad", text: "{got} out of {total}. Breathe. I'm right here with you." }));
    const p = scoreGuidePlan(low())!;
    expect(p.ziggy).toEqual({ pose: "sad", text: "4 out of 20. Breathe. I'm right here with you." });
    expect(p.byte).toEqual(before.byte);
    expect(p.situation).toBe("low");
  });
  it("only on LOW; a literal digit, a throw or null falls back to the table", () => {
    setScoreComfortProvider(() => ({ pose: "sad", text: "comfort" }));
    expect(scoreGuidePlan(base({ score: { kind: "marks", awarded: 18, total: 20 } }))!.ziggy.text).not.toBe("comfort");
    const table = (() => {
      setScoreComfortProvider(null);
      return scoreGuidePlan(low())!.ziggy;
    })();
    setScoreComfortProvider(() => ({ pose: "sad", text: "You lost 16 marks" }));
    expect(scoreGuidePlan(low())!.ziggy).toEqual(table);
    setScoreComfortProvider(() => {
      throw new Error("x");
    });
    expect(scoreGuidePlan(low())!.ziggy).toEqual(table);
    setScoreComfortProvider(() => null);
    expect(scoreGuidePlan(low())!.ziggy).toEqual(table);
  });
});

describe("GUIDE-SCORE-1 · the scene hook (owner ruling 23 Oct 16:40 IST)", () => {
  it("★ comfort below 40 %; improvement at ≥ 10 points of the paper; null otherwise", () => {
    expect(scoreGuidePlan(base({ score: { kind: "marks", awarded: 7, total: 20 } }))!.scene).toBe("comfort"); // 35 %
    expect(scoreGuidePlan(base({ score: { kind: "marks", awarded: 8, total: 20 } }))!.scene).toBeNull(); // 40 %: low, no scene
    expect(scoreGuidePlan(base({ score: { kind: "marks", awarded: 18, total: 20 } }))!.scene).toBeNull();
    const fm = (msg: string) =>
      scoreGuidePlan(base({ surface: "full-mock", subtitle: "FM-M-04", score: { kind: "marks", awarded: 60, total: 80 }, message: msg }))!;
    expect(fm("▲ 8 marks vs Maths · Mock #3").scene).toBe("improvement"); // 10 points of 80
    expect(fm("▲ 7 marks vs Maths · Mock #3").scene).toBeNull(); // 8.75 points
    expect(fm("▼ 9 marks vs Maths · Mock #3").scene).toBeNull();
    expect(scoreGuidePlan(base({ allPending: { title: "x", detail: "y" } }))!.scene).toBeNull();
  });
});

describe("GUIDE-SCORE-1 · surface names", () => {
  it("all six surfaces", () => {
    expect(scoreGuideSurface(base({ surface: "check-improve", score: { kind: "marks", awarded: 1, total: 3, gradedCount: 1, totalQuestions: 1 } }))).toBe("check_improve_single");
    expect(scoreGuideSurface(base({ surface: "check-improve", score: { kind: "marks", awarded: 1, total: 9, gradedCount: 3, totalQuestions: 3 } }))).toBe("check_improve_multi");
    expect(scoreGuideSurface(base({ surface: "worksheet" }))).toBe("worksheet");
    expect(scoreGuideSurface(base({ surface: "chapter-test" }))).toBe("chapter_test");
    expect(scoreGuideSurface(base({ surface: "full-mock" }))).toBe("full_mock");
    expect(scoreGuideSurface(base({ surface: "quick-practice" }))).toBe("quick_practice");
  });
});
