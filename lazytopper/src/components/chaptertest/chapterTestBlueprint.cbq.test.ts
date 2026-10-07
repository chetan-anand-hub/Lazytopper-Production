// CBQ-1 PR-2 — Chapter Test carries >= 50% of its marks as CBQs WHENEVER THE POOL ALLOWS,
// keeps CBSE's 20 / 30 split for the rest, and reports a shortfall EXACTLY when it is short.
// All 26 chapters x 20 seeds on the REAL bank. Nothing here is a hardcoded count: every
// number is recomputed from the chapter's own pool through the one classifier (isCbq).
//
// "The pool allows" is decided PER PAPER from the real pool: a paper may be short of half
// only if no swap inside a section could add a CBQ — i.e. in every section that still holds
// a non-CBQ, every CBQ the section's pool has is already on the paper (or would repeat one).
// The same test decides the 20 / 30 tolerance: any deviation from the targets must be
// explained by an exhausted pool, and an overshoot is below one question's marks (5).
// The >= 50% path itself is proven deterministically on synthetic pools in
// src/lib/cbq/cbqPaperBalance.test.ts (the real bank may be too thin for some chapters).

import { describe, it, expect } from "vitest";
import "../../test/preloadBankChapters";
import type { CanonicalQuestion } from "../../data/predictionTypes";
import { selectBankQuestions } from "../../data/bankQuery";
import { isCbq } from "../../lib/cbq/cbqClassification";
import { questionKey } from "../../utils/questionKey";
import { chapterTestSectionFor, drawChapterTest, type BoardSection } from "./chapterTestBlueprint";
import { fullMockChapterWeights } from "../fullmock/fullMockBlueprint";

const SEEDS = Array.from({ length: 20 }, (_, i) => (Math.imul(i + 1, 2654435761) ^ 0xc7c8) >>> 0);
const SECTIONS: BoardSection[] = ["A", "B", "C", "D"];
const CHAPTERS = (["Maths", "Science"] as const).flatMap((subject) =>
  fullMockChapterWeights(subject).map((c) => ({ subject, slug: c.slug, label: c.label })),
);

describe("Chapter Test — CBSE 50 / 20 / 30 on the real bank (all 26 chapters x 20 seeds)", () => {
  it("covers all 26 board chapters", () => {
    expect(CHAPTERS.length).toBe(26);
  });

  it.each(CHAPTERS.map((c) => [`${c.subject} · ${c.slug}`, c] as const))("%s", (_name, c) => {
    const pool = selectBankQuestions({ subject: c.subject, topicKeys: [c.slug] });
    const poolBySection = new Map<BoardSection, CanonicalQuestion[]>(
      SECTIONS.map((s) => [s, pool.filter((q) => chapterTestSectionFor(q) === s)]),
    );
    for (const seed of SEEDS) {
      const d = drawChapterTest({
        subject: c.subject,
        topicKey: c.slug,
        topicLabel: c.label,
        worksheetId: "ct-cbq",
        createdAt: "fixed",
        seed,
      });
      const tag = `${c.slug} seed ${seed}`;
      // Each paper row back to its real pool row (same id, same section's pool).
      const rows = d.paper.questions.map((q) => {
        const row = poolBySection.get(q.section as BoardSection)!.find((r) => r.id === q.id);
        expect(row, `${tag}: ${q.id} is a real row of its section's pool`).toBeTruthy();
        return { section: q.section as BoardSection, row: row! };
      });
      const onPaper = new Set(rows.map((r) => questionKey(r.row)));
      const marks = (q: CanonicalQuestion) => Number(q.marks) || 0;

      const total = rows.reduce((s, r) => s + marks(r.row), 0);
      const cbq = rows.filter((r) => isCbq(r.row)).reduce((s, r) => s + marks(r.row), 0);
      const cbqA = rows.filter((r) => r.section === "A" && isCbq(r.row)).reduce((s, r) => s + marks(r.row), 0);
      const objective = rows.filter((r) => r.section === "A").reduce((s, r) => s + marks(r.row), 0);
      const plainMcq = objective - cbqA;
      const target = Math.ceil(total / 2);
      const objectiveCbqGoal = Math.max(0, Math.min(target, objective - Math.round(total / 5)));

      // A section still holding a row of class `has` while its pool has an unplaced row of `want`.
      const missed = (sections: BoardSection[], want: boolean): boolean =>
        sections.some(
          (s) =>
            rows.some((r) => r.section === s && isCbq(r.row) !== want) &&
            poolBySection.get(s)!.some((q) => isCbq(q) === want && !onPaper.has(questionKey(q))),
        );
      const WRITTEN: BoardSection[] = ["B", "C", "D"];

      // The draw's report is the recomputed truth.
      expect(d.totalMarks, tag).toBe(total);
      expect(d.cbqMarks, tag).toBe(cbq);
      expect(d.cbqTarget, tag).toBe(target);
      expect(d.cbqShortfall, tag).toBe(Math.max(0, target - cbq));
      expect(d.plainMcqMarks, tag).toBe(plainMcq);
      expect(d.constructedMarks, tag).toBe(total - cbq - plainMcq);

      // >= 50% whenever the pool allows: short ONLY when no swap could add a CBQ.
      if (cbq < target) expect(missed(SECTIONS, true), `${tag}: short of half while a CBQ was left unplaced`).toBe(false);
      // 20%: Section A holds its plain-MCQ share unless a pool ran out.
      if (cbqA < objectiveCbqGoal) expect(missed(["A"], true), `${tag}: A below its CBQ share`).toBe(false);
      if (cbqA > objectiveCbqGoal) {
        expect(
          !missed(["A"], false) || !missed(WRITTEN, true),
          `${tag}: A took CBQs from the plain-MCQ 20% while written CBQs were left`,
        ).toBe(true);
      }
      // 30%: no CBQ crowding — an overshoot of a whole question (>= 5 marks) means no plain row was left.
      if (cbq - target >= 5) expect(missed(WRITTEN, false), `${tag}: CBQs crowd out the constructed 30%`).toBe(false);
    }
  });
});
