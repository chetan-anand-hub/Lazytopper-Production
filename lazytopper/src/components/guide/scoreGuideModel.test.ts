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
import { chapterTestDeltaLine, singleChapterPracticeTarget, type ScorecardVariant } from "../results/scorecardVariants";
import { formatScoreNumber } from "../results/scoreNumber";
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
    const longest = {
      got: "37.5",
      total: "80",
      delta: "12.5 marks",
      loss: "12.5 marks",
      pending: "12 questions",
      lead: SCORE_GUIDE_LINES.lead.mostMistake, // the longest lead
      wrong: "12 questions wrong",
      prev: "your earlier attempt",
      chapter: "Quadratic Equations",
    };
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
    // 4 marks "reason not recorded" outrank the 3 Silly-slip marks → never "Biggest loss".
    expect(p.byte.text.startsWith("Most marks lost to a mistake: Silly slip")).toBe(true);
  });

  it("★★ 'Biggest loss' ONLY when the type's marks are ≥ every other lost-marks row (Not attempted included)", () => {
    const lead = (m: PaperMarksLost) => scoreGuidePlan(base({ marksLost: m }))!.byte.text.split(":")[0];
    expect(lead(marks({ calculation: 3, silly: 1 }))).toBe("Biggest loss");
    expect(lead(marks({ calculation: 3, unattempted: 3 }))).toBe("Biggest loss"); // a tie is still the biggest
    expect(lead(marks({ calculation: 3, unattempted: 5 }))).toBe("Most marks lost to a mistake");
    expect(lead(marks({ conceptual: 2, untyped: 2.5 }))).toBe("Most marks lost to a mistake");
    // A count-only grade claims no marks at all.
    expect(scoreGuidePlan(base({ fourType: { conceptual: 2, calculation: 1, silly: 0, presentation: 0 } }))!.byte.text.split(":")[0]).toBe(
      "Most common mistake",
    );
  });

  it("★★ hero parity: numbers print exactly as the hero prints them (no float noise)", () => {
    const p = scoreGuidePlan(base({ score: { kind: "marks", awarded: 7.000000001, total: 20.0000000004 } }))!;
    expect(p.ziggy.text).toMatch(/(^|\D)7 out of 20(\D|$)/);
    expect(p.ziggy.text).not.toContain("000");
  });

  it("★★ Byte's link is the host's OWN chapter route (guideTarget), labelled with the chapter", () => {
    const t = { to: "/practice/10/maths?topic=quadratic-equations&weakMode=1", chapter: "Quadratic Equations" };
    const p = scoreGuidePlan(base({ marksLost: marks({ calculation: 2 }), guideTarget: t }))!;
    expect(p.cta).toEqual({ label: "Practise Quadratic Equations →", to: t.to });
    expect(scoreGuidePlan(base({ marksLost: marks({ calculation: 2 }), guideTarget: { to: t.to } }))!.cta).toEqual({
      label: "Practise more like these",
      to: t.to,
    });
    // Never an external or protocol-relative URL — the hub instead.
    for (const bad of ["https://evil.example", "//evil.example", "javascript:alert(1)", "/a\\b"]) {
      expect(scoreGuidePlan(base({ marksLost: marks({ calculation: 2 }), guideTarget: { to: bad } }))!.cta!.to).toBe("/practice-hub");
    }
  });

  it("★★ awaiting-sheet (objective scored, sheet awaited): no pattern claimed, Upload line, NO link", () => {
    for (const surface of ["chapter-test", "full-mock"] as const) {
      const p = scoreGuidePlan(base({ surface, subtitle: "CT-M-QE-01", awaitingSheet: true, score: { kind: "marks", awarded: 8, total: 10 } }))!;
      expect(p.situation).toBe("awaiting-sheet");
      expect(p.byteStep).toBe("awaitingSheet");
      expect(p.byte.text).toContain("Upload your written answers to see where marks went.");
      expect(p.cta).toBeNull();
      expect(p.scene).toBeNull();
      expect(p.ziggy.text + p.byte.text).not.toMatch(/\d/);
    }
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

  it("★★ objective-only, ALL right (tap-only Quick Practice): MCQ numbers, Check a written answer", () => {
    const p = scoreGuidePlan(
      base({ surface: "quick-practice", subtitle: "Session scorecard", score: { kind: "attempts", attempted: 5, ofN: 5, mcqAnswered: 5, mcqCorrect: 5 } }),
    )!;
    expect(p.situation).toBe("objective-only");
    expect(p.byteStep).toBe("objective");
    expect(p.ziggy.text).toMatch(/5 out of 5/);
    // Owner ruling 23 Oct 17:57: Quick Practice never sends a student to Check & Improve. With no
    // in-page action from the host there is no link; with one, Byte's button opens the working box.
    expect(p.cta).toBeNull();
    const onAddWorking = () => {};
    const q = scoreGuidePlan(
      base({ surface: "quick-practice", subtitle: "Session scorecard", score: { kind: "attempts", attempted: 5, ofN: 5, mcqAnswered: 5, mcqCorrect: 5 }, onAddWorking }),
    )!;
    expect(q.cta).toEqual({ label: "Add working to one →", action: onAddWorking });
    // §13: MCQ working is read for the mistake type only — never "mark every step".
    for (const l of SCORE_GUIDE_LINES.byte.objective) {
      expect(l.text).toMatch(/Add working to one/);
      expect(l.text).not.toMatch(/mark (every|each) step/i);
    }
  });

  it("★★ Quick Practice NEVER links to /check-improve (owner ruling 23 Oct 17:57), whatever the step", () => {
    const qpPlans = [
      scoreGuidePlan(base({ surface: "quick-practice", subtitle: "Quick practice", marksLost: marks({ presentation: 2 }) }))!,
      scoreGuidePlan(base({ surface: "quick-practice", subtitle: "Quick practice", score: { kind: "attempts", attempted: 4, ofN: 4, mcqAnswered: 4, mcqCorrect: 1 } }))!,
      scoreGuidePlan(base({ surface: "quick-practice", subtitle: "Quick practice", score: { kind: "attempts", attempted: 4, ofN: 4, mcqAnswered: 4, mcqCorrect: 4 } }))!,
    ];
    for (const p of qpPlans) expect(p.cta?.to ?? null).not.toBe("/check-improve");
  });

  it("★★ objective-only with WRONG taps: the count from the card, 'your mark won't change', the in-page way back", () => {
    const qp = (over: Partial<ScorecardVariant>) =>
      scoreGuidePlan(
        base({ surface: "quick-practice", subtitle: "Session scorecard", score: { kind: "attempts", attempted: 5, ofN: 5, mcqAnswered: 5, mcqCorrect: 3 }, ...over }),
      )!;
    // No printed rows → the "3/5 MCQs correct" line: 2 missed.
    const p = qp({});
    expect(p.situation).toBe("objective-only");
    expect(p.byteStep).toBe("objectiveWrong");
    expect(p.byte.text).toMatch(/(^|\D)2 questions wrong\./);
    expect(p.byte.text).toMatch(/mark (won't change|stays as it is)/i);
    expect(p.cta).toBeNull(); // no in-page action from the host → no link (never /check-improve)
    // The MCQ-MARKS hero ("3 / 5") with no missed rows on the card: no count can be read off it
    // (marks are not taps) → today's generic line, never a guessed count.
    expect(qp({ score: { kind: "marks", awarded: 3, total: 5, gradedCount: 5, totalQuestions: 5 } }).byteStep).toBe("objective");
    // Printed "Where marks slipped" rows win: one per missed MCQ.
    const row = { label: "Question 2", yourAnswer: "x", correctAnswer: "y", steps: [] };
    expect(qp({ wrongAnswers: [row] }).byte.text).toMatch(/(^|\D)1 question wrong\./);
    // The host's in-page action → Byte's button calls it (no route).
    const onShowMissed = () => {};
    const q = qp({ onShowMissed });
    expect(q.cta).toEqual({ label: "Show me the first one I missed →", action: onShowMissed });
    // Every objectiveWrong line says the mark does not change (CLAUDE.md §13).
    for (const l of SCORE_GUIDE_LINES.byte.objectiveWrong) expect(l.text).toMatch(/mark (won't change|stays as it is)/i);
  });

  it("★ Chapter Test: its own printed ▲ line (since the last same-total test) makes it 'improved'", () => {
    const p = scoreGuidePlan(base({ surface: "chapter-test", subtitle: "CT-M-QE-02", score: { kind: "marks", awarded: 30, total: 40 }, message: "▲ 4 marks since your last Quadratic Equations test" }))!;
    expect(p.situation).toBe("improved");
    expect(p.ziggy.text).toContain("4 marks");
    expect(p.ziggy.text).toContain("your earlier attempt");
    expect(p.scene).toBe("improvement"); // 10 points of 40
  });

  it("★★ improved: ONLY from Full Mock's own printed ▲ delta", () => {
    const p = scoreGuidePlan(base({ surface: "full-mock", subtitle: "FM-M-04", message: "▲ 9 marks vs Maths · Mock #3" }))!;
    expect(p.situation).toBe("improved");
    expect(p.ziggy.text).toContain("9 marks");
    expect(p.ziggy.text).toContain("your last mock"); // Full Mock names its own comparison
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

describe("GUIDE-SCORE-1 · host helpers (scorecardVariants)", () => {
  it("★ chapterTestDeltaLine: the newest OTHER graded test with the SAME total; else silent", () => {
    const prev = [
      { id: "CT-M-QE-03", status: "graded", marksAwarded: 26, marksTotal: 40 }, // this test itself
      { id: "CT-M-QE-02", status: "partial", marksAwarded: 10, marksTotal: 40 },
      { id: "CT-M-QE-01", status: "graded", marksAwarded: 22, marksTotal: 30 }, // a different paper
      { id: "CT-M-QE-00", status: "graded", marksAwarded: 21.9999999, marksTotal: 40 },
    ];
    const cur = { code: "CT-M-QE-03", awarded: 26, total: 40 };
    expect(chapterTestDeltaLine(cur, prev, "Quadratic Equations")).toBe("▲ 4 marks since your last Quadratic Equations test");
    expect(chapterTestDeltaLine({ ...cur, awarded: 21 }, prev, "QE")).toBe("▼ 1 mark since your last QE test");
    expect(chapterTestDeltaLine({ ...cur, awarded: 22 }, prev, "QE")).toBeNull(); // no change → silent
    expect(chapterTestDeltaLine({ ...cur, total: 50 }, prev, "QE")).toBeNull(); // no same-total paper
  });

  it("★ singleChapterPracticeTarget: ONE chapter → its weak-pattern practice; several → null (the hub)", () => {
    expect(singleChapterPracticeTarget("Maths", ["quadratic-equations", "quadratic-equations"], () => "Quadratic Equations")).toEqual({
      to: "/practice/10/maths?topic=quadratic-equations&weakMode=1",
      chapter: "Quadratic Equations",
    });
    expect(singleChapterPracticeTarget("science", ["light", "light"], () => "Light")!.to).toBe("/practice/10/science?topic=light&weakMode=1");
    expect(singleChapterPracticeTarget("Maths", ["quadratic-equations", "real-numbers"])).toBeNull();
    expect(singleChapterPracticeTarget("Maths", [])).toBeNull();
    expect(singleChapterPracticeTarget("Maths", ["mixed:abc"])).toBeNull();
  });

  it("★ formatScoreNumber: the hero's format — float noise dropped, no padding", () => {
    expect(formatScoreNumber(7.000000001)).toBe("7");
    expect(formatScoreNumber(7.499999999)).toBe("7.5");
    expect(formatScoreNumber(12.5)).toBe("12.5");
    expect(formatScoreNumber(0)).toBe("0");
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
