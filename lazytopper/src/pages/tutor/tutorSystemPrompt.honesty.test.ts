// TUTOR-FIX-2 (server lane S-A) — the tutor prompt renders EVERY brief field with its window, the
// honesty rules a-g, the T11 offer rules, and never names a chapterless session "this topic".
// The model's behaviour is measured by lazytopper/scripts/eval/tutorHonesty.eval.cjs; this file
// pins what the prompt SAYS.
import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { buildTutorSystemPrompt } = require("../../../server/prompts/tutorSystemPrompt.cjs");

// Pack Part 0.4 numbers (owner's Premium account, month window).
const RICH = {
  hasData: true,
  windowLabel: "last 30 days",
  topic: { trend: "worsening" },
  mistakes: { topType: "knowledge gap", marksLostRecent: 100.5 },
  chapter: {
    name: "Real Numbers",
    marksLost: 24.5,
    byGroup: { knowledge: 12, careless: 6.5, examTechnique: 2, notAttempted: 1, unrecorded: 3 },
    topGroup: "knowledge",
    concepts: [{ name: "Fundamental Theorem of Arithmetic", marksLost: 6 }],
    recent: [{ id: "LTG-M-RN-104", marksLost: 2, group: "careless", surface: "Chapter Test", date: "2026-10-12" }],
  },
  subject: { marksLost: 100.5 },
};

const build = (over: Record<string, unknown> = {}) =>
  buildTutorSystemPrompt({ topicLabel: "Real Numbers", subject: "maths", ...over }) as string;

describe("T1 — the brief is rendered in full, with its window", () => {
  it("renders chapter marks, split, top group, concepts with marks, recent questions, trend and the labelled subject total", () => {
    const p = build({ brief: RICH });
    expect(p).toContain("- Window: the last 30 days.");
    expect(p).toContain("- This chapter (Real Numbers): 24.5 marks lost in the last 30 days.");
    // TUTOR-FIX-3: typed groups and the unrecorded marks are separate lines; the top group is
    // scoped to the recorded marks when some are unrecorded (tutorSystemPrompt.unrecorded.test.ts).
    expect(p).toContain(
      "- Recorded mistake types for these chapter marks: concept/knowledge gaps 12, careless slips 6.5, exam technique (presentation, steps, units) 2, not attempted 1.",
    );
    expect(p).toContain("- 3 marks: no mistake type recorded (tap-the-answer questions record which option was picked, not why)");
    expect(p).toContain("- Biggest loss group among the marks with a recorded type: concept/knowledge gaps.");
    expect(p).toContain("- Concepts in this chapter where marks were lost: Fundamental Theorem of Arithmetic (6 marks).");
    expect(p).toContain("question LTG-M-RN-104, Chapter Test, 2 marks lost, careless slips, 2026-10-12");
    expect(p).toContain("- Recent direction on this topic: worsening.");
    expect(p).toContain("- Whole Maths subject (ALL chapters together, not just this one): 100.5 marks lost in the last 30 days.");
    expect(p).toMatch(/NOT IN THIS DATA: question text, the student's answers or working/);
  });

  it("an old client brief (no contract fields) still renders, window 'recently', subject total labelled", () => {
    const p = build({ brief: { hasData: true, topic: { trend: "stable", weakConcepts: ["Euclid"] }, mistakes: { topType: "careless", marksLostRecent: 100.5 } } });
    expect(p).toMatch(/- Window: recent graded work \(the exact window was not stated/);
    expect(p).toContain("- Sub-topics that have cost marks: Euclid.");
    expect(p).toContain("- Whole Maths subject (ALL chapters together, not just this one): 100.5 marks lost recently.");
    expect(p).not.toMatch(/This chapter \(/);
  });

  it("hasData false: names chapter + window, offers practice, forbids the access denial", () => {
    const p = build({ brief: { hasData: false, windowLabel: "last 30 days" } });
    expect(p).toContain('"I don\'t see graded work from you on Real Numbers in the last 30 days yet"');
    expect(p).toContain("[[offer:practice]]");
    expect(p).toMatch(/NEVER say you "don't have access"/);
    expect(p).not.toMatch(/You do NOT have reliable performance data/);
  });

  it("no brief at all behaves like hasData false", () => {
    expect(build()).toContain("I don't see graded work from you on Real Numbers recently yet");
  });
});

describe("T1.2 — the honesty rules a-g are in every prompt, whatever the language", () => {
  for (const language of ["English", "Hindi", "Tamil"]) {
    it(`${language}: rules a-g present`, () => {
      const p = build({ brief: RICH, language });
      expect(p).toContain("HONESTY ABOUT THE STUDENT (non-negotiable; these rules hold in EVERY language)");
      for (const rule of ["a. ", "b. ", "c. ", "d. ", "e. ", "f. ", "g. "]) expect(p).toContain(`\n${rule}`);
      expect(p).toMatch(/I can see the last 30 days, not just the last 2 weeks/);
      expect(p).toMatch(/Never mention a diagram, figure, picture, panel or "beside us" unless THIS SAME reply emits/);
    });
  }
});

describe("T11 — offers on the first ask; the tutor never grades or quizzes in chat", () => {
  const p = build({ brief: RICH });
  it("check-improve on the first ask, and on a yes to the tutor's own offer", () => {
    expect(p).toMatch(/put `\[\[offer:check-improve\]\]` on the FIRST turn the student asks/);
    expect(p).toMatch(/No two-step/);
    expect(p).toMatch(/says yes \/ ok \/ haan to YOUR OWN suggestion to open Check & Improve/);
  });
  it("never awards or estimates marks for the student's own answer", () => {
    expect(p).toMatch(/NEVER award, estimate or hint at marks for the student's OWN answer/);
  });
  it("practice on the first ask; 'I keep losing marks' offers both routes; no in-chat questions", () => {
    expect(p).toMatch(/`\[\[offer:practice\]\]` on the FIRST turn the student asks to practise/);
    expect(p).toMatch(/"I KEEP LOSING MARKS"[\s\S]*offer BOTH routes in words/);
    expect(p).toMatch(/NEVER set a question for the student to answer here/);
    expect(p).not.toMatch(/TRY ONE YOURSELF/);
  });
});

describe("T5 — a chapterless session is named by its subject", () => {
  it("empty topicLabel -> 'Maths', never 'this topic'", () => {
    const p = buildTutorSystemPrompt({ topicLabel: "", subject: "maths" }) as string;
    expect(p).not.toMatch(/this topic/i);
    expect(p).toContain("The student has just opened the tutor on Maths.");
    expect(p).toContain("NO CHAPTER CHOSEN");
  });
  it("a chapter label is used as before, with no 'NO CHAPTER CHOSEN' block", () => {
    const p = build();
    expect(p).toContain("The student has just opened the tutor on Real Numbers.");
    expect(p).not.toContain("NO CHAPTER CHOSEN");
  });
});
