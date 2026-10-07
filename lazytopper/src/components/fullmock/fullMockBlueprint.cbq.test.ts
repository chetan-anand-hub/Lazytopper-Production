// CBQ-1 PR-2 — Full Mock carries >= 40 of its 80 marks as CBQs WHENEVER THE POOL ALLOWS,
// keeps CBSE's 20 / 30 split for the rest (16 plain-MCQ marks, ~24 constructed), keeps every
// unit's CBSE marks exact, and reports a shortfall EXACTLY when it is short. 20 seeds per
// subject on the REAL union pool; every number is recomputed here through the one classifier.
//
// "The pool allows" is decided PER PAPER from the real pool. A swap group is one section x
// one CBSE unit (a swap there keeps the unit's marks and the section's count). A paper may be
// short of half only if, in every group still holding a non-CBQ, every CBQ the group's pool
// has is already on the paper. Any deviation from the 20 / 30 targets must likewise be
// explained by an exhausted group, and an overshoot is below one question's marks (5).

import { describe, it, expect } from "vitest";
import "../../test/preloadBankChapters";
import { isCbq } from "../../lib/cbq/cbqClassification";
import { questionKey } from "../../utils/questionKey";
import { chapterUnit, UNIT_MARKS } from "../../config/syllabus2026-27";
import {
  FM_BLUEPRINT,
  buildUnionPool,
  drawFullMock,
  fullMockChapterWeights,
  sectionPool,
  type FMPoolQuestion,
  type FMSection,
} from "./fullMockBlueprint";

const SEEDS = Array.from({ length: 20 }, (_, i) => (Math.imul(i + 3, 2654435761) ^ 0xf3c8) >>> 0);

describe("Full Mock — CBSE 50 / 20 / 30 on the real union pool (20 seeds per subject)", () => {
  it.each(["Maths", "Science"] as const)("%s", (subject) => {
    const pool = buildUnionPool(subject, new Set(fullMockChapterWeights(subject).map((c) => c.slug)));
    const unitOf = (q: FMPoolQuestion) => chapterUnit(q.topicSlug)!.unit;
    const groupPools = new Map<string, FMPoolQuestion[]>();
    for (const spec of FM_BLUEPRINT) {
      for (const q of sectionPool(pool, spec.section)) {
        const g = `${spec.section}:${unitOf(q)}`;
        groupPools.set(g, [...(groupPools.get(g) ?? []), q]);
      }
    }
    const unitKey = subject === "Maths" ? "maths" : "science";

    for (const seed of SEEDS) {
      const d = drawFullMock({ subject, worksheetId: "fm-cbq", code: "FM-C", name: "c", seed, createdAt: "fixed" });
      const tag = `${subject} seed ${seed}`;
      const rows = d.paper.questions.map((q) => {
        const row = sectionPool(pool, q.section as FMSection).find((r) => r.id === q.id);
        expect(row, `${tag}: ${q.id} is a real row of its section's pool`).toBeTruthy();
        return { section: q.section as FMSection, group: `${q.section}:${unitOf(row!)}`, row: row! };
      });
      const onPaper = new Set(rows.map((r) => questionKey(r.row)));

      // The existing invariants still hold after the CBQ swaps.
      expect(d.totalMarks, tag).toBe(80);
      for (const row of d.blueprint) expect(row.actualCount, `${tag} ${row.section}`).toBe(row.targetCount);
      const byUnit = new Map<string, number>();
      for (const r of rows) byUnit.set(unitOf(r.row), (byUnit.get(unitOf(r.row)) ?? 0) + r.row.marks);
      for (const [unit, marks] of Object.entries(UNIT_MARKS[unitKey])) expect(byUnit.get(unit) ?? 0, `${tag} unit ${unit}`).toBe(marks);
      expect(onPaper.size, `${tag}: no repeat`).toBe(rows.length);

      const cbq = rows.filter((r) => isCbq(r.row)).reduce((s, r) => s + r.row.marks, 0);
      const cbqA = rows.filter((r) => r.section === "A" && isCbq(r.row)).reduce((s, r) => s + r.row.marks, 0);
      const plainMcq = 20 - cbqA;
      const target = 40; // ceil(50% of 80)
      const objectiveCbqGoal = 20 - 16; // Section A above the plain-MCQ 20% (16 of 80)

      const missed = (sections: FMSection[], want: boolean): boolean =>
        [...groupPools].some(
          ([g, gp]) =>
            sections.includes(g.split(":")[0] as FMSection) &&
            rows.some((r) => r.group === g && isCbq(r.row) !== want) &&
            gp.some((q) => isCbq(q) === want && !onPaper.has(questionKey(q))),
        );
      const ALL: FMSection[] = ["A", "B", "C", "D", "E"];
      const WRITTEN: FMSection[] = ["B", "C", "D", "E"];

      expect(d.cbqMarks, tag).toBe(cbq);
      expect(d.cbqTarget, tag).toBe(target);
      expect(d.cbqShortfall, tag).toBe(Math.max(0, target - cbq));
      expect(d.plainMcqMarks, tag).toBe(plainMcq);
      expect(d.constructedMarks, tag).toBe(80 - cbq - plainMcq);

      if (cbq < target) expect(missed(ALL, true), `${tag}: short of 40 while a CBQ was left unplaced`).toBe(false);
      if (cbqA < objectiveCbqGoal) expect(missed(["A"], true), `${tag}: A below 4 CBQ marks`).toBe(false);
      if (cbqA > objectiveCbqGoal) {
        expect(!missed(["A"], false) || !missed(WRITTEN, true), `${tag}: plain-MCQ 20% given up while written CBQs were left`).toBe(true);
      }
      if (cbq - target >= 5) expect(missed(WRITTEN, false), `${tag}: CBQs crowd out the constructed 30%`).toBe(false);
    }
  });
});
