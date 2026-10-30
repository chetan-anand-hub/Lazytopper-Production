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
    expect(p).toContain("- Recent direction on this topic: slipping a bit lately, as the later questions scored lower.");
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

  it("an explicit hasData:false is the no-graded-work block", () => {
    expect(build({ brief: { hasData: false, topic: {}, mistakes: {} } })).toContain("I don't see graded work from you on Real Numbers recently yet");
  });

  it("TUTOR-MIND-1: NO brief at all (not loaded) never claims the student has no graded work", () => {
    const p = build();
    expect(p).toContain("data did not load for this turn");
    expect(p).not.toContain("NO graded work from this student");
    expect(p).not.toContain("yet\", then offer a quick practice set");
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
    expect(p).toMatch(/says yes \/ ok \/ haan to YOUR OWN suggestion to open Answer Checker/);
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

// TUTOR-MIND-4 (C) - "I cannot show you the NCERT page directly" was false: the app shows it.
describe("TUTOR-MIND-4 - NCERT page honesty", () => {
  const LIGHT = [
    { key: "sign-convention-new-cartesian", label: "Sign convention (New Cartesian)", hasNcertPage: true },
    { key: "mirror-formula-and-magnification", label: "Mirror formula", hasNcertPage: true },
  ];

  it("with a listed concept: tells the model to emit the figure tag when asked to SEE the NCERT page, and bans the false refusal", () => {
    const p = build({ figures: LIGHT });
    expect(p).toMatch(/WHEN THE STUDENT ASKS TO SEE THE NCERT PAGE OR DIAGRAM/);
    expect(p).toMatch(/emit that concept's `\[\[figure:<key>\]\]` THIS turn/);
    expect(p).toMatch(/NEVER say "I cannot show you the NCERT page"/);
    expect(p).toMatch(/marked \[real NCERT page available\]/);
    expect(p).toContain("- sign-convention-new-cartesian: Sign convention (New Cartesian) [real NCERT page available]");
  });

  it("the NCERT-page claim is tied to the marker: only for a key marked [real NCERT page available]", () => {
    const p = build({ figures: LIGHT });
    expect(p).toMatch(/Say the real NCERT page is in the panel ONLY if the key you chose is marked \[real NCERT page available\]; for a key without that marker, just emit the tag and describe the diagram, with no claim about an NCERT page/);
    expect(p).not.toMatch(/and tell them it is in the panel/);
  });

  it("when nothing fits: never claims the app cannot show NCERT; plain 'no NCERT figure for this exact idea'; words only (no panel, button, page number)", () => {
    for (const p of [build({ figures: LIGHT }), build({ figures: [] }), build()]) {
      expect(p).toMatch(/IF NOTHING LISTED FITS[^]*never claim the app cannot show NCERT pages at all/);
      expect(p).toMatch(/no NCERT figure for this exact idea here/);
      expect(p).toMatch(/Do not mention a panel or button, and do not name a page number, chapter number or link/);
    }
  });

  it("the no-list prompt still forbids pointing at a diagram (rule f unchanged)", () => {
    const p = build({ figures: [] });
    expect(p).toMatch(/do NOT reference a side diagram/);
    expect(p).toMatch(/Never mention a diagram, figure, picture, panel or "beside us" unless THIS SAME reply emits/);
  });

  it("no route/CTA to the NCERT reader is invented: the prompt names no NCERT-reader offer tag or link", () => {
    const p = build({ figures: LIGHT });
    expect(p).not.toMatch(/\[\[offer:ncert/);
    expect(p).not.toMatch(/\/ncert-class-10/);
  });
});

describe("TUTOR-MIND-4 (E) - board weightage in the chapter line", () => {
  const brief = {
    hasData: true,
    windowLabel: "last 30 days",
    mistakes: { marksLostRecent: 56.5 },
    subject: { marksLost: 56.5, chapters: [{ name: "Light", marksLost: 22, boardMarks: 7 }, { name: "Electricity", marksLost: 15, boardMarks: 40 }, { name: "Chemical Reactions", marksLost: 19.5 }] },
  };
  it("renders 'lost N marks; carries about M marks in the board paper' only for a valid integer, and rule m is present", () => {
    const p = build({ subject: "science", topicLabel: "Light", brief });
    expect(p).toContain("Light (lost 22 marks; carries about 7 marks in the board paper)");
    expect(p).toContain("Electricity (lost 15 marks)"); // 40 is out of range: dropped, not shown
    expect(p).toContain("Chemical Reactions (lost 19.5 marks)");
    expect(p).toMatch(/\nm\. "Which chapter first\?"/);
  });
});
