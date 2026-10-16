// TUTOR-FIX-3 — the brief renders the mistake-group split HONESTLY. Live defect (prod, trial student,
// Real Numbers): all 7 lost marks had NO mistake type recorded (tap-the-answer picks), yet the tutor
// said "the marks were lost due to concept/knowledge gaps". The prompt must (1) list only groups the
// brief gives marks for, (2) render `unrecorded` as its own explicit "do NOT attribute" line, (3) drop
// any top-group / top-type line when every lost mark is unrecorded, (4) say a concept name is WHERE
// marks were lost, not a mistake type, and (5) carry honesty rule h + the practice-offer wording rule.
import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { buildTutorSystemPrompt } = require("../../../server/prompts/tutorSystemPrompt.cjs");

// The exact brief the live client sent.
const LIVE = {
  hasData: true,
  topic: { trend: "improving", weakConcepts: ["Fundamental Theorem of Arithmetic"] },
  mistakes: { marksLostRecent: 7 },
  windowLabel: "last 30 days",
  subject: { marksLost: 7 },
  chapter: {
    marksLost: 7,
    byGroup: { knowledge: 0, careless: 0, examTechnique: 0, notAttempted: 0, unrecorded: 7 },
    concepts: [{ name: "Fundamental Theorem of Arithmetic", marksLost: 5 }],
    name: "Real Numbers",
  },
};

const MIXED = {
  hasData: true,
  windowLabel: "last 30 days",
  topic: { trend: "stable" },
  mistakes: { topType: "knowledge gap", marksLostRecent: 20 },
  subject: { marksLost: 20 },
  chapter: {
    name: "Real Numbers",
    marksLost: 8,
    byGroup: { knowledge: 3, careless: 0, examTechnique: 1, notAttempted: 0, unrecorded: 4 },
    topGroup: "knowledge",
    concepts: [{ name: "Fundamental Theorem of Arithmetic", marksLost: 5 }],
  },
};

const build = (brief: unknown) =>
  buildTutorSystemPrompt({ topicLabel: "Real Numbers", subject: "maths", brief }) as string;

/** Only the facts list of the brief block (between the heading and NOT IN THIS DATA). */
const facts = (p: string) => {
  const start = p.indexOf("WHAT YOU KNOW ABOUT THIS STUDENT");
  const end = p.indexOf("NOT IN THIS DATA", start);
  return p.slice(start, end);
};

// Any typed group rendered WITH a number = an attribution the brief would have to support.
const TYPED_WITH_NUMBER =
  /(concept\/knowledge gaps|careless slips|exam technique \(presentation, steps, units\)|not attempted) \d/;

describe("TF3 — all lost marks unrecorded (the live brief)", () => {
  const p = build(LIVE);
  const f = facts(p);

  it("renders the unrecorded marks explicitly, with the do-NOT-attribute instruction", () => {
    expect(f).toContain(
      "- 7 marks: no mistake type recorded (tap-the-answer questions record which option was picked, not why) — do NOT attribute these to concept gaps, careless slips or exam technique.",
    );
    expect(f).toContain(
      "- Mistake type: NOT recorded for any of the 7 marks lost in this chapter. You do not know whether they were concept gaps, careless slips, exam technique or not attempted — never say or imply which.",
    );
  });

  it("lists no typed group with a number, and no zero-mark group at all", () => {
    expect(f).not.toMatch(TYPED_WITH_NUMBER);
    expect(f).not.toMatch(/Where those chapter marks went/);
  });

  it("renders no top-loss-group or top-mistake-type line", () => {
    expect(f).not.toMatch(/Biggest loss group/);
    expect(f).not.toMatch(/Most common mistake type/);
    // even if a (buggy) client also sent them
    const g = facts(build({ ...LIVE, mistakes: { ...LIVE.mistakes, topType: "knowledge gap" }, chapter: { ...LIVE.chapter, topGroup: "knowledge" } }));
    expect(g).not.toMatch(/Biggest loss group/);
    expect(g).not.toMatch(/Most common mistake type/);
  });

  it("says a weak concept name is WHERE marks were lost, not a mistake type", () => {
    expect(f).toContain(
      "- Concepts in this chapter where marks were lost: Fundamental Theorem of Arithmetic (5 marks). A concept name says WHERE marks were lost, not WHY — it is not a mistake type and does not mean a concept/knowledge gap.",
    );
  });
});

describe("TF3 — mixed brief (typed + unrecorded)", () => {
  const f = facts(build(MIXED));
  it("lists only the typed groups with marks > 0", () => {
    expect(f).toContain(
      "- Recorded mistake types for these chapter marks: concept/knowledge gaps 3, exam technique (presentation, steps, units) 1.",
    );
    expect(f).not.toMatch(/careless slips 0|not attempted 0/);
  });
  it("renders the unrecorded remainder explicitly", () => {
    expect(f).toContain(
      "- 4 marks: no mistake type recorded (tap-the-answer questions record which option was picked, not why) — do NOT attribute these to concept gaps, careless slips or exam technique.",
    );
    expect(f).not.toMatch(/NOT recorded for any of/);
  });
  it("the top group is scoped to the recorded marks", () => {
    expect(f).toContain("- Biggest loss group among the marks with a recorded type: concept/knowledge gaps.");
  });
  it("a topGroup the split gives 0 marks for is not rendered", () => {
    const g = facts(build({ ...MIXED, chapter: { ...MIXED.chapter, topGroup: "careless" } }));
    expect(g).not.toMatch(/Biggest loss group/);
  });
});

describe("TF3 — briefs without unrecorded marks / old clients render as before", () => {
  it("a fully typed split keeps the 'Biggest loss group in this chapter' line", () => {
    const f = facts(build({ ...MIXED, chapter: { ...MIXED.chapter, byGroup: { knowledge: 5, careless: 3 }, marksLost: 8 } }));
    expect(f).toContain("- Recorded mistake types for these chapter marks: concept/knowledge gaps 5, careless slips 3.");
    expect(f).toContain("- Biggest loss group in this chapter: concept/knowledge gaps.");
    expect(f).not.toMatch(/no mistake type recorded/);
  });

  it("old-client brief (no contract fields): facts unchanged", () => {
    const f = facts(
      build({ hasData: true, topic: { trend: "stable", weakConcepts: ["Euclid"] }, mistakes: { topType: "careless", marksLostRecent: 100.5 } }),
    );
    expect(f).toContain(
      [
        '- Window: recent graded work (the exact window was not stated — say "recently", never a number of days).',
        "- Sub-topics that have cost marks: Euclid.",
        "- Recent direction on this topic: stable.",
        "- Whole Maths subject (ALL chapters together, not just this one): 100.5 marks lost recently.",
        "- Most common mistake type across the whole subject: careless.",
      ].join("\n"),
    );
    expect(f).not.toMatch(/no mistake type recorded|NOT recorded for any/);
  });
});

describe("TF3 — honesty rule h and the practice-offer wording", () => {
  const p = build(LIVE);
  it("rule h: a mistake type only for groups the brief gives marks for; unrecorded -> say so + Check & Improve", () => {
    expect(p).toContain(
      "\nh. Say a mistake type (concept/knowledge gap, careless slip, exam technique, not attempted) ONLY for groups the brief gives marks for.",
    );
    expect(p).toMatch(/If the student asks careless vs concept and the marks are unrecorded, say the type is not recorded for those marks/);
    expect(p).toMatch(/emit \[\[offer:check-improve\]\]/);
  });
  it("practice offer: 'Tap Practise this chapter' wording, never 'Here are...' without the questions", () => {
    expect(p).toMatch(/Tap Practise this chapter for a couple of board questions/);
    expect(p).toMatch(/NEVER write "Here are a couple of practice questions"/);
  });
});

// TUTOR-FIX-4: live, the model repeated its OWN earlier wrong turns ("due to concept/knowledge gaps")
// over the brief. Rule i makes the brief the only source of truth and asks for a plain correction.
describe("TF4 — honesty rule i: the brief beats the conversation", () => {
  const p = build(LIVE);
  it("states the brief is the only source of truth, own earlier replies included, with the correction wording", () => {
    expect(p).toContain(
      "\ni. WHAT YOU KNOW ABOUT THIS STUDENT (the student-data brief) in this system message is the only source of truth about the student's marks and mistake types.",
    );
    expect(p).toMatch(/including your own earlier replies\) contradicts it, the brief wins/);
    expect(p).toContain("Correction: those marks have no mistake type recorded");
  });
  it("rule i sits after rule h in the honesty block", () => {
    expect(p.indexOf("\ni. WHAT YOU KNOW")).toBeGreaterThan(p.indexOf("\nh. Say a mistake type"));
  });
});
