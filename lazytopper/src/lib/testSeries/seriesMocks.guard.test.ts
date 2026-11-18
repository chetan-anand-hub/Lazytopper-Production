/**
 * TEST-SERIES-1 (owner 19:47 IST: "we can easily create 40 full-length tests") — the SERIES_MOCKS_PER_SUBJECT fixed papers per
 * subject must each meet the FULL board blueprint (A 20x1, B 5x2, C 6x3, D 4x5, E 3x4 = 80 marks, CBSE unit marks exact), and no
 * written question (B–E; above all the scarce D long answers and E case studies) may repeat across the papers. Raising the
 * constant past what the bank supports turns this red. Measured 18 Nov 2026: 20 + 20 valid, 0 repeats in every section (A too).
 */
import { describe, expect, it } from "vitest";
import { loadSubjectBank } from "../packs/packContent";
import { drawPackMocks } from "../packs/buildPackFiles";
import { FM_BLUEPRINT } from "../../components/fullmock/fullMockBlueprint";
import { SERIES_MOCKS_PER_SUBJECT } from "./testSeries";

describe.each(["maths", "science"] as const)("%s Full-Length Tests", (pack) => {
  it(`all ${SERIES_MOCKS_PER_SUBJECT} papers are full board papers with no written question repeated`, async () => {
    await loadSubjectBank(pack);
    const papers = drawPackMocks(pack, SERIES_MOCKS_PER_SUBJECT);
    expect(papers.map((p) => p.n)).toEqual(Array.from({ length: SERIES_MOCKS_PER_SUBJECT }, (_, i) => i + 1));
    const seen = new Map<string, number>();
    for (const { n, drawn } of papers) {
      for (const spec of FM_BLUEPRINT) {
        const rows = drawn.paper.questions.filter((q) => q.section === spec.section);
        expect(rows.length, `${pack} M${n} section ${spec.section} count`).toBe(spec.targetCount);
        expect(rows.reduce((a, q) => a + Number(q.marks), 0), `${pack} M${n} section ${spec.section} marks`).toBe(spec.targetCount * spec.marksEach);
        if (spec.section === "A") continue; // light MCQ repetition would be acceptable (owner); none is measured today
        for (const q of rows) {
          expect(seen.has(q.id), `${pack} M${n} ${spec.section} repeats ${q.id} from M${seen.get(q.id)}`).toBe(false);
          seen.set(q.id, n);
        }
      }
      expect(drawn.totalMarks, `${pack} M${n} total`).toBe(80);
      expect(drawn.unitMarksExact, `${pack} M${n} unit marks`).toBe(true);
    }
  }, 300_000);
});
