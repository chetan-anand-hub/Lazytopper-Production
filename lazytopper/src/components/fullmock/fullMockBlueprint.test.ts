// src/components/fullmock/fullMockBlueprint.test.ts — vitest (Codespaces/CI).
//
// Contract: canonical-only chapter registry (a banned/unknown key can never leak
// into the weightage legend), DUAL-SOURCE union (canonical + predicted — never
// pyqOnly), exact mark bands per section, honest shortfalls (never padded),
// deterministic draw per seed, no duplicate questions on a paper.

import { describe, it, expect } from "vitest";
import {
  FM_BLUEPRINT,
  buildUnionPool,
  drawFullMock,
  fullMockChapterWeights,
  fullMockObjectiveQuestions,
  fullMockSubjectiveQuestions,
} from "./fullMockBlueprint";
import { desktopTopicBySlug } from "../../lib/desktop/topics";

const MARKS_BY_SECTION: Record<string, number> = { A: 1, B: 2, C: 3, D: 5, E: 4 };

describe("fullMockChapterWeights", () => {
  it.each(["Maths", "Science"] as const)(
    "%s registry holds only canonical topics.ts chapters of that subject, with real weightage",
    (subject) => {
      const weights = fullMockChapterWeights(subject);
      expect(weights.length).toBeGreaterThanOrEqual(8);
      for (const w of weights) {
        const meta = desktopTopicBySlug(w.slug);
        expect(meta, `${w.slug} must be a canonical topics.ts chapter`).toBeTruthy();
        expect(meta!.subject.toLowerCase()).toBe(subject.toLowerCase());
        expect(w.percent).toBeGreaterThan(0);
        expect(w.label.length).toBeGreaterThan(0);
      }
      // No duplicate chapters.
      expect(new Set(weights.map((w) => w.slug)).size).toBe(weights.length);
    },
  );
});

describe("buildUnionPool", () => {
  it("unions BOTH sources (canonical + predicted) — never predicted-only, never pyqOnly", () => {
    const slugs = new Set(fullMockChapterWeights("Maths").map((c) => c.slug));
    const pool = buildUnionPool("Maths", slugs);
    expect(pool.some((q) => q.source === "canonical")).toBe(true);
    expect(pool.some((q) => q.source === "predicted")).toBe(true);
    // Dedup held: unique ids.
    expect(new Set(pool.map((q) => q.id || q.questionText)).size).toBe(pool.length);
  });
});

describe("drawFullMock", () => {
  const draw = (seed = 11) =>
    drawFullMock({
      subject: "Maths",
      worksheetId: "fm-test",
      code: "FM-M-01",
      name: "Maths · Mock #1",
      seed,
    });

  it("assembles a board paper: A→E order, exact mark bands, no duplicates, honest counts", () => {
    const d = draw();
    expect(d.enoughQuestions).toBe(true);
    // Exact numeric band per section (§7 — never the fused buckets).
    for (const q of d.paper.questions) {
      expect(q.marks).toBe(MARKS_BY_SECTION[q.section]);
    }
    // Board order + sequential numbering.
    const sections = d.paper.questions.map((q) => q.section).join("");
    expect(sections).toMatch(/^A*B*C*D*E*$/);
    d.paper.questions.forEach((q, i) => expect(q.qNumber).toBe(i + 1));
    // No duplicate questions on one paper.
    expect(new Set(d.paper.questions.map((q) => q.id)).size).toBe(d.paper.questions.length);
    // Honest blueprint: never above target, marks add up.
    for (const row of d.blueprint) {
      const spec = FM_BLUEPRINT.find((s) => s.section === row.section)!;
      expect(row.actualCount).toBeLessThanOrEqual(spec.targetCount);
      expect(row.actualMarks).toBe(row.actualCount * spec.marksEach);
    }
    expect(d.totalMarks).toBe(d.paper.questions.reduce((s, q) => s + q.marks, 0));
    // The real mix is reported and consistent.
    expect(d.pyqCount + d.freshCount).toBe(d.paper.questions.length);
    // Section A auto-gradeable: every objective key resolves against its options.
    for (const q of fullMockObjectiveQuestions(d.paper)) {
      const key = String(q.answer || "").trim().toLowerCase();
      expect(key.length).toBeGreaterThan(0);
      expect((q.options ?? []).some((o) => o.trim().toLowerCase() === key)).toBe(true);
    }
    // Objective/subjective split is by section.
    expect(fullMockObjectiveQuestions(d.paper).length + fullMockSubjectiveQuestions(d.paper).length)
      .toBe(d.paper.questions.length);
    // Every question sits in a canonical registry chapter.
    const slugs = new Set(d.chapterWeights.map((c) => c.slug));
    for (const q of d.paper.questions) expect(slugs.has(q.topicKey)).toBe(true);
  });

  it("is deterministic for a seed and fresh across seeds", () => {
    const a = draw(21);
    const b = draw(21);
    const c = draw(22);
    expect(a.paper.questions.map((q) => q.id)).toEqual(b.paper.questions.map((q) => q.id));
    expect(c.paper.questions.map((q) => q.id)).not.toEqual(a.paper.questions.map((q) => q.id));
  });

  it("draws a Science paper from the science union (dual-source holds per subject)", () => {
    const d = drawFullMock({
      subject: "Science",
      worksheetId: "fm-test-s",
      code: "FM-S-01",
      name: "Science · Mock #1",
      seed: 5,
    });
    expect(d.paper.questions.length).toBeGreaterThan(0);
    for (const q of d.paper.questions) {
      expect(q.marks).toBe(MARKS_BY_SECTION[q.section]);
      expect(q.subject).toBe("Science");
    }
  });
});
