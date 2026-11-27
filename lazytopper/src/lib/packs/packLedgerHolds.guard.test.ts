/**
 * CBQ-PACK-HOLDS - no pack sells a row a solution ledger holds (cofounder ruling 27 Nov 2026). Pins the 14 ids, checks them against the ledgers,
 * and proves no pack file (CBQ sets, Chapter / Subject / Bundle question sheets, Worksheets, Chapter Tests, Full Mocks) prints one.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { SOLUTIONS_2_LEDGER } from "../../config/solutions2Ledger";
import { SOLUTIONS_3_BOARD_LEDGER } from "../../config/solutions3BoardLedger";
import { SOLUTIONS_SCI_LEDGER } from "../../config/solutionsSciLedger";
import { ensureAllBankChapters } from "../../data/bankChapters/loader";
import { PACK_CHAPTER_SLUGS, PACK_SUBJECTS } from "../../services/packs";
import { allCbqPins, cbqSetsFor } from "./cbqPins";
import { allPackPins, packChapterTestPapers, packMockPapers, packPinSpec, packWorksheetRows } from "./packPins";
import { PACK_LEDGER_HELD_IDS, chapterPackDrawRows, chapterPackRows, cbqPackRows, isCbqPackRow } from "./packContent";

const FOURTEEN = [
  "SAV-N-EXEM2-12-LA-002", "SAV-N-EXEM2-12-LA-003", "SAV-N-EXEM2-12-LA-004", "SAV-N-EXEM2-12-LA-006", "SAV-N-EXEM2-12-LA-007",
  "SAV-N-EXEM2-12-LA-012", "SAV-N-EXEM2-12-LA-013", "METAL-NCERT-3-VSA-014", "METAL-NCERT-3-SA-008", "METAL-NCERT-3-VSA-015",
  "ACID-EXMPLR-2-MCQ-003", "ACID-EXMPLR-2-SA-007", "ELEC-EXMPLR-11-LA-003", "CHEM-EXMPLR-1-LONG-006",
];
const LEDGERS = [SOLUTIONS_2_LEDGER, SOLUTIONS_3_BOARD_LEDGER, SOLUTIONS_SCI_LEDGER];
const heldBy = (id: string) => LEDGERS.some((l) => l[id]?.status === "hold");

beforeAll(async () => {
  await ensureAllBankChapters();
}, 120_000);

describe("CBQ-PACK-HOLDS", () => {
  it("the held set is exactly the 14 ruled ids, and every one is status hold in a ledger", () => {
    expect([...PACK_LEDGER_HELD_IDS].sort()).toEqual([...FOURTEEN].sort());
    for (const id of FOURTEEN) expect(heldBy(id), id).toBe(true);
  });

  it("no served row of the 14 is a CBQ pack row or a chapter-pack row", () => {
    for (const slug of PACK_CHAPTER_SLUGS) {
      for (const q of cbqPackRows(slug)) expect(PACK_LEDGER_HELD_IDS.has(q.id), `cbq ${q.id}`).toBe(false);
      for (const q of chapterPackRows(slug)) expect(PACK_LEDGER_HELD_IDS.has(q.id), `chapter ${q.id}`).toBe(false);
    }
    const q = chapterPackDrawRows("surface-areas-and-volumes").find((r) => r.id === "SAV-N-EXEM2-12-LA-002");
    if (q) expect(isCbqPackRow(q)).toBe(false);
  });

  it("the CBQ sets (pinned) never resolve a held id, and no set is empty", async () => {
    for (const slug of PACK_CHAPTER_SLUGS) {
      const { sets, partKs, total } = await cbqSetsFor(slug);
      expect(total, slug).toBe(allCbqPins()[slug]?.sets.length ?? 0); // set numbering (codes) unchanged
      for (const s of sets) {
        expect(s.rows.length, `${slug} set ${s.k}`).toBeGreaterThan(0);
        for (const r of s.rows) expect(PACK_LEDGER_HELD_IDS.has(r.id), `${slug} ${r.id}`).toBe(false);
      }
      expect(partKs.flat().length, `${slug} parts`).toBe(sets.length);
    }
  });

  it("pinned Chapter Tests, Worksheets and Full Mocks never print a held id", async () => {
    for (const key of Object.keys(allPackPins())) {
      const spec = packPinSpec(key);
      if (spec) for (const id of spec.ids) expect(PACK_LEDGER_HELD_IDS.has(id), `${key} ${id}`).toBe(false);
    }
    for (const slug of PACK_CHAPTER_SLUGS) {
      for (const { paper } of await packChapterTestPapers(slug, chapterPackDrawRows(slug))) for (const q of paper.questions) expect(PACK_LEDGER_HELD_IDS.has(q.id), `${slug} ${q.id}`).toBe(false);
      for (const q of await packWorksheetRows(slug, chapterPackDrawRows(slug))) expect(PACK_LEDGER_HELD_IDS.has(q.id), `${slug} ws ${q.id}`).toBe(false);
    }
    for (const s of PACK_SUBJECTS) for (const { paper } of await packMockPapers(s)) for (const q of paper.questions) expect(PACK_LEDGER_HELD_IDS.has(q.id), `mock ${q.id}`).toBe(false);
  }, 120_000);

  it("REPORT: ledger-held rows that are still sold in a CBQ pack set other than the 14 (informational, must stay empty for CBQ)", () => {
    const stillSold: string[] = [];
    for (const slug of PACK_CHAPTER_SLUGS) for (const q of cbqPackRows(slug)) if (heldBy(q.id)) stillSold.push(q.id);
    expect(stillSold).toEqual([]);
  });
});
