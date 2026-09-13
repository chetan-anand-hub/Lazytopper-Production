// src/components/chaptertest/chapterTestBlueprint.test.ts — vitest (Codespaces/CI).
//
// Contract ([FU-CT-BALANCED-MIX]): every section's pick routes through the SHARED
// `drawBalancedSet` (seeded — provable because the old Math.random path could never
// be deterministic), the board-paper shape is byte-identical in behavior (A→D order,
// exact mark bands, no duplicates, honest counts, keyed Section A), the zero/thin-PYQ
// honest fallback still fills a full valid section (all-fresh is valid, never padded,
// no question class hidden), and the MIN_TEST_QUESTIONS honest gate still fires for a
// below-minimum topic.

import { describe, it, expect } from "vitest";
import type { CanonicalQuestion } from "../../data/predictionTypes";
import {
  CT_BLUEPRINT,
  drawChapterTest,
  drawCTSection,
  objectiveQuestions,
  subjectiveQuestions,
  chapterTestSectionFor,
} from "./chapterTestBlueprint";

const draw = (seed: number) =>
  drawChapterTest({
    subject: "Maths",
    topicKey: "real-numbers",
    topicLabel: "Real Numbers",
    worksheetId: "ct-test",
    code: "CT-M-01",
    name: "Real Numbers · Chapter Test #1",
    seed,
  });

describe("drawChapterTest — balanced sourcing", () => {
  it("is deterministic for a seed and fresh across seeds (the drawBalancedSet wire)", () => {
    const a = draw(21);
    const b = draw(21);
    const c = draw(22);
    expect(a.paper.questions.map((q) => q.id)).toEqual(b.paper.questions.map((q) => q.id));
    expect(c.paper.questions.map((q) => q.id)).not.toEqual(a.paper.questions.map((q) => q.id));
  });

  it("assembles a board paper: A→D order, exact mark bands, no duplicates, honest counts", () => {
    const d = draw(11);
    expect(d.enoughQuestions).toBe(true);
    // Board order + sequential numbering.
    const sections = d.paper.questions.map((q) => q.section).join("");
    expect(sections).toMatch(/^A*B*C*D*$/);
    d.paper.questions.forEach((q, i) => expect(q.qNumber).toBe(i + 1));
    // Exact numeric band per section (§7 — never the fused buckets). Section A is
    // the MCQ pool (keyed below), B/C/D are exact-marks bands. B is 1–2 since
    // SURFACE-1 (was exactly 2): 1-mark written rows are drawn as very-short answers.
    for (const q of d.paper.questions) {
      if (q.section === "B") expect([1, 2]).toContain(q.marks);
      if (q.section === "C") expect(q.marks).toBe(3);
      if (q.section === "D") expect(q.marks).toBeGreaterThanOrEqual(4);
    }
    // No duplicate questions on one paper (used-set dedupe held across sections).
    const keys = d.paper.questions.map((q) => q.id || q.questionText);
    expect(new Set(keys).size).toBe(keys.length);
    // Honest blueprint rows: never above target, marks add up.
    for (const row of d.blueprint) {
      const spec = CT_BLUEPRINT.find((s) => s.section === row.section)!;
      expect(row.actualCount).toBeLessThanOrEqual(spec.targetCount);
      const rows = d.paper.questions.filter((q) => q.section === row.section);
      expect(row.actualCount).toBe(rows.length);
      expect(row.actualMarks).toBe(rows.reduce((s, q) => s + q.marks, 0));
    }
    expect(d.totalMarks).toBe(d.paper.questions.reduce((s, q) => s + q.marks, 0));
    // Section A sourcing contract: every drawn objective question carries options
    // and its answer key RESOLVES to one of them (the #352 bar, applied to Chapter
    // Test by SURFACE-1 — before it, a mis-keyed MCQ was drawn here and a correct
    // pick scored 0). The bank still holds unresolvable keys (extraction artifacts,
    // the CLEAN-1 lane); the blueprint now EXCLUDES them, so this cannot go red on
    // whichever question the seed draws.
    for (const q of objectiveQuestions(d.paper)) {
      expect((q.options ?? []).length).toBeGreaterThanOrEqual(2);
      const key = String(q.answer || "").trim().toLowerCase();
      expect(key.length).toBeGreaterThan(0);
      expect((q.options ?? []).some((o) => o.trim().toLowerCase() === key)).toBe(true);
    }
    // Objective/subjective split is by section.
    expect(objectiveQuestions(d.paper).length + subjectiveQuestions(d.paper).length).toBe(
      d.paper.questions.length,
    );
  });

  it("still fires the MIN_TEST_QUESTIONS honest gate for a below-minimum topic", () => {
    // A topic with no bank pool draws nothing — the balanced helper never pads,
    // so the honest empty-state gate must fire exactly as before the mix.
    const d = drawChapterTest({
      subject: "Maths",
      topicKey: "no-such-topic-key",
      topicLabel: "No Such Topic",
      worksheetId: "ct-empty",
      seed: 7,
    });
    expect(d.paper.questions.length).toBe(0);
    expect(d.enoughQuestions).toBe(false);
  });
});

describe("drawCTSection — honest PYQ/fresh fallback on a synthetic pool", () => {
  // isPYQQuestion matches an explicit `isPYQ` flag or a populated `pyqYear`.
  const fresh = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ id: `fresh-${i}`, questionText: `F${i}`, marks: 2 }));
  const pyq = (n: number) =>
    Array.from({ length: n }, (_, i) => ({
      id: `pyq-${i}`,
      questionText: `P${i}`,
      marks: 2,
      pyqYear: 2023,
    }));

  it("zero-PYQ pool still fills the full section — all-fresh is a valid paper", () => {
    const r = drawCTSection(fresh(10), 6, 42);
    expect(r.drawn.length).toBe(6);
    expect(r.pyqDrawn).toBe(0);
    expect(r.freshDrawn).toBe(6);
  });

  it("thin-PYQ pool (1 PYQ + 9 fresh) fills fully, PYQ still eligible, never padded", () => {
    const r = drawCTSection([...pyq(1), ...fresh(9)], 6, 42);
    expect(r.drawn.length).toBe(6);
    expect(r.pyqDrawn).toBe(1);
    expect(r.freshDrawn).toBe(5);
  });

  it("balanced pool draws the deliberate ~half/half mix", () => {
    const r = drawCTSection([...pyq(6), ...fresh(6)], 6, 42);
    expect(r.drawn.length).toBe(6);
    expect(r.pyqDrawn).toBe(3);
    expect(r.freshDrawn).toBe(3);
  });

  it("never hides a class — asking for the whole pool returns every question", () => {
    const r = drawCTSection([...pyq(6), ...fresh(6)], 12, 42);
    expect(r.drawn.length).toBe(12);
    expect(r.pyqDrawn).toBe(6);
    expect(r.freshDrawn).toBe(6);
  });
});

describe("chapterTestSectionFor — the SURFACE-1 band + bar (1-mark VSA in, mis-keyed MCQ out)", () => {
  const written: CanonicalQuestion = {
    id: "SYN-VSA",
    subject: "Maths",
    topicKey: "real-numbers",
    subtopic: "Fundamental Theorem of Arithmetic",
    section: "A",
    marks: 1,
    format: "Short",
    difficulty: "Easy",
    bloomSkill: "Remembering",
    questionText: "Express 255 as a product of prime factors.",
    answer: "255 = 3 × 5 × 17",
  };

  it("a 1-mark written VSA is admitted to Section B (was: no section — the 146-row gap)", () => {
    expect(chapterTestSectionFor(written)).toBe("B");
    expect(chapterTestSectionFor({ ...written, options: [] })).toBe("B");
    expect(chapterTestSectionFor({ ...written, marks: 2 })).toBe("B");
    expect(chapterTestSectionFor({ ...written, marks: 3 })).toBe("C");
  });

  it("a drawn real-numbers paper DOES place a 1-mark row in Section B for some seed", () => {
    // real-numbers carries 9 human 1-mark written rows (P10); across a run of seeds
    // at least one paper must draw one into B, and every B row stays inside 1–2.
    let seenOneMark = false;
    for (let seed = 1; seed <= 40 && !seenOneMark; seed += 1) {
      const d = draw(seed);
      const b = d.paper.questions.filter((q) => q.section === "B");
      for (const q of b) expect([1, 2]).toContain(q.marks);
      if (b.some((q) => q.marks === 1)) seenOneMark = true;
    }
    expect(seenOneMark).toBe(true);
  });

  it('a mis-keyed MCQ (key "A" against options "A. …") is NOT admitted to Section A; its keyed twin is', () => {
    const keyed: CanonicalQuestion = {
      ...written,
      id: "SYN-MCQ-OK",
      format: "MCQ",
      options: ["A. 3 × 5 × 17", "B. 5 × 51", "C. 3 × 85", "D. 15 × 17"],
      answer: "A. 3 × 5 × 17",
    };
    const miskeyed: CanonicalQuestion = { ...keyed, id: "SYN-MCQ-BAD", answer: "A" };
    expect(chapterTestSectionFor(keyed)).toBe("A");
    expect(chapterTestSectionFor(miskeyed)).toBeNull();
    // A marking-scheme digit appended to the key (the bank's commonest defect) too.
    expect(chapterTestSectionFor({ ...keyed, id: "SYN-MCQ-BAD-2", answer: "A. 3 × 5 × 17 1" })).toBeNull();
    // An MCQ with an EMPTY key is likewise excluded, never guessed at.
    expect(chapterTestSectionFor({ ...keyed, id: "SYN-MCQ-NOKEY", answer: "" })).toBeNull();
  });
});
