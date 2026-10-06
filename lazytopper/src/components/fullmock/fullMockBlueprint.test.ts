// src/components/fullmock/fullMockBlueprint.test.ts — vitest (Codespaces/CI).
//
// Contract: canonical-only chapter registry (a banned/unknown key can never leak
// into the weightage legend), DUAL-SOURCE union (canonical + predicted — never
// pyqOnly), exact mark bands per section, honest shortfalls (never padded),
// deterministic draw per seed, no duplicate questions on a paper.

import { describe, it, expect } from "vitest";
// BANK-SPLIT-1 PR-2: this suite calls the bank's sync APIs directly, so it preloads every chapter.
import "../../test/preloadBankChapters";
import {
  FM_BLUEPRINT,
  allocateUnitSlots,
  buildUnionPool,
  drawFullMock,
  fullMockChapterWeights,
  fullMockObjectiveQuestions,
  fullMockSubjectiveQuestions,
  fullMockUnits,
} from "./fullMockBlueprint";
import { desktopTopicBySlug } from "../../lib/desktop/topics";
import { SYLLABUS_2026_27, UNIT_MARKS, chapterUnit } from "../../config/syllabus2026-27";

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
      // F3: exactly the subject's board chapters of the one reference, each in its CBSE unit.
      const key = subject === "Maths" ? "maths" : "science";
      expect(weights.map((w) => w.slug)).toEqual(SYLLABUS_2026_27[key].units.flatMap((u) => u.chapters));
      for (const w of weights) expect(w.unit).toBe(chapterUnit(w.slug)!.unit);
    },
  );
});

// ── F3 PIN: every Full Mock lands each CBSE unit on its marks, for EVERY seed ──────────
//
// A property test over many seeds plus a fixed set (including the extremes of the
// 32-bit seed the page mints). Each unit's marks are recomputed HERE from the drawn
// questions and the one reference — never read back from the draw's own report.
const FIXED_SEEDS = [0, 1, 2, 7, 11, 42, 1234, 99991, 2 ** 31 - 1, 0xffffffff];
const propertySeeds = (n: number, salt: number) =>
  Array.from({ length: n }, (_, i) => (Math.imul(i + 1, 2654435761) ^ salt) >>> 0);

describe("F3 — Full Mock marks per CBSE unit", () => {
  it.each(["Maths", "Science"] as const)(
    "%s: every seed (fixed set + 40 property seeds) puts exactly CBSE's unit marks on the paper",
    (subject) => {
      const key = subject === "Maths" ? "maths" : "science";
      const units = SYLLABUS_2026_27[key].units;
      for (const seed of [...FIXED_SEEDS, ...propertySeeds(40, subject === "Maths" ? 0x1f3 : 0x5c1)]) {
        const d = drawFullMock({ subject, worksheetId: "fm-unit", code: "FM-U", name: "u", seed });
        const marksByUnit = new Map<string, number>();
        for (const q of d.paper.questions) {
          const u = chapterUnit(String(q.topicKey));
          expect(u, `seed ${seed}: ${q.topicKey} is not a board chapter`).not.toBeNull();
          marksByUnit.set(u!.unit, (marksByUnit.get(u!.unit) ?? 0) + q.marks);
        }
        for (const unit of units) {
          expect(marksByUnit.get(unit.unit) ?? 0, `${subject} seed ${seed} unit ${unit.unit}`).toBe(
            UNIT_MARKS[key][unit.unit],
          );
        }
        // The board section shape still holds: A 20 · B 5 · C 6 · D 4 · E 3 = 38 Q / 80 marks.
        for (const row of d.blueprint) {
          expect(row.actualCount, `${subject} seed ${seed} section ${row.section}`).toBe(row.targetCount);
        }
        expect(d.totalMarks).toBe(80);
        expect(d.unitMarksExact).toBe(true);
        expect(d.unitMarks.map((u) => [u.unit, u.actual])).toEqual(units.map((u) => [u.unit, u.marks]));
      }
    },
    120_000,
  );

  it("the allocator alone: exact unit marks and exact section counts for many seeds (pure)", () => {
    for (const subject of ["Maths", "Science"] as const) {
      const units = fullMockUnits(subject);
      const full = Object.fromEntries(units.map((u) => [u.unit, FM_BLUEPRINT.map((s) => s.targetCount)]));
      for (const seed of [...FIXED_SEEDS, ...propertySeeds(200, 0xa11)]) {
        const slots = allocateUnitSlots({ units, available: full, seed });
        expect(slots, `${subject} seed ${seed}`).not.toBeNull();
        for (const u of units) {
          const marks = slots![u.unit].reduce((s, n, i) => s + n * FM_BLUEPRINT[i].marksEach, 0);
          expect(marks).toBe(u.marks);
        }
        FM_BLUEPRINT.forEach((spec, i) => {
          expect(units.reduce((s, u) => s + slots![u.unit][i], 0)).toBe(spec.targetCount);
        });
      }
    }
  });

  it("an impossible pool is REPORTED (null), never answered with a percent split", () => {
    const units = fullMockUnits("Science");
    // Unit V (5 marks) with no question in any section cannot land on 5 marks.
    const available = Object.fromEntries(
      units.map((u) => [u.unit, u.unit === "V" ? [0, 0, 0, 0, 0] : FM_BLUEPRINT.map((s) => s.targetCount)]),
    );
    expect(allocateUnitSlots({ units, available, seed: 3 })).toBeNull();
  });
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
