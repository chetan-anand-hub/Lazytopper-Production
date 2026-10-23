// @vitest-environment node
/**
 * PYQ-RESTORE-B - pins over the ASSEMBLED bank for the provenance ledger (pyqRestoreBLedger.ts).
 *
 *   1. ledger shape: one entry per id; every entry cites an official cbse.gov.in question paper and marking
 *      scheme with a 64-hex SHA-256; counts match the ledger's own COUNTS.
 *   2. every ledger row is SERVED (not withheld), carries the ledger's year / set / reference, has no
 *      `sourceOverride`, and is a PYQ.
 *   3. every step carries a "[N mark]" prefix; the prefixes are exactly the ledger's `stepMarks` and sum to marks.
 *   4. figure rows resolve to exactly the ledger's figure, and the file exists under public/.
 *   5. the 2025 Triangles file: 17 rows, all triangles / 2025 / Standard 30/x/y, all "added" in the ledger.
 */
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { RAW_CANONICAL_QUESTION_BANK, canonicalQuestionBank, WITHHELD_QUESTION_IDS } from "../canonicalQuestionBank";
import { isPYQQuestion } from "../../utils/isPYQQuestion";
import { getFiguresForQuestion } from "../visualConceptRegistry";
import { TRIANGLES_PYQ_2025 } from "../questionBanks/class10/maths/triangles.pyq2025";
import { PYQ_RESTORE_B_MATHS, PYQ_RESTORE_B_MATHS_COUNTS, PYQ_RESTORE_B_IDS } from "./pyqRestoreBLedger";

type Row = Record<string, unknown> & { id: string; marks: number; solutionSteps?: string[] };
const bankById = new Map(RAW_CANONICAL_QUESTION_BANK.map((q) => [q.id, q as unknown as Row]));
const servedIds = new Set(canonicalQuestionBank.map((q) => q.id));
const STEP = /^\[(\d+(?:\.\d+)?) marks?\] /;
const PUBLIC = path.resolve(__dirname, "../../../public");

describe("PYQ-RESTORE-B · Maths ledger", () => {
  it("shape: unique ids, official sources with SHA-256, counts", () => {
    expect(PYQ_RESTORE_B_IDS.size).toBe(PYQ_RESTORE_B_MATHS.length);
    for (const e of PYQ_RESTORE_B_MATHS) {
      expect(e.qp, e.id).toMatch(/^https:\/\/www\.cbse\.gov\.in\/cbsenew\/question-paper\/20(23|24|25|26)\/X\/[^#]+\.zip#.+\.pdf$/);
      expect(e.ms, e.id).toMatch(/^https:\/\/www\.cbse\.gov\.in\/cbsenew\/(Marking-Scheme|marking-scheme)\/20(23|24|25|26)\/X\/[^#]+\.zip#.+\.pdf$/);
      expect(e.qpSha256, e.id).toMatch(/^[0-9a-f]{64}$/);
      expect(e.msSha256, e.id).toMatch(/^[0-9a-f]{64}$/);
      expect(e.ref, e.id).toMatch(/^PYQ (30\/\d\/\d|30\(B\)) Q\d+(\([a-z]\))?$/);
      expect(e.qp, e.id).toContain(`/${e.year}/X/`);
    }
    const n = (v: string) => PYQ_RESTORE_B_MATHS.filter((e) => e.verdict === v).length;
    expect(n("restored")).toBe(PYQ_RESTORE_B_MATHS_COUNTS.restored);
    expect(n("added")).toBe(PYQ_RESTORE_B_MATHS_COUNTS.added);
    expect(PYQ_RESTORE_B_MATHS.filter((e) => e.figure === "new")).toHaveLength(PYQ_RESTORE_B_MATHS_COUNTS.figuresNew);
    expect(PYQ_RESTORE_B_MATHS.filter((e) => e.figure === "reused")).toHaveLength(PYQ_RESTORE_B_MATHS_COUNTS.figuresReused);
  });

  it("every ledger row is served as a PYQ with the ledger's year / set / reference and no override", () => {
    const bad: string[] = [];
    for (const e of PYQ_RESTORE_B_MATHS) {
      const q = bankById.get(e.id);
      if (!q) { bad.push(`${e.id}: not in the bank`); continue; }
      if (!servedIds.has(e.id) || WITHHELD_QUESTION_IDS.has(e.id)) bad.push(`${e.id}: not served`);
      if (q.pyqYear !== e.year || q.pyqSet !== e.set) bad.push(`${e.id}: year/set ${String(q.pyqYear)}/${String(q.pyqSet)}`);
      if (q.ncertRef !== e.ref) bad.push(`${e.id}: ref ${String(q.ncertRef)}`);
      if ("sourceOverride" in q) bad.push(`${e.id}: sourceOverride`);
      if (!isPYQQuestion(q as never)) bad.push(`${e.id}: not PYQ`);
    }
    expect(bad).toEqual([]);
  });

  it("step marks are exactly the ledger's and sum to the row's marks", () => {
    const bad: string[] = [];
    for (const e of PYQ_RESTORE_B_MATHS) {
      const q = bankById.get(e.id)!;
      const marks = (q.solutionSteps ?? []).map((s) => { const m = STEP.exec(s); return m ? Number(m[1]) : NaN; });
      if (JSON.stringify(marks) !== JSON.stringify(e.stepMarks)) bad.push(`${e.id}: ${marks.join("+")}`);
      if (Math.abs(marks.reduce((a, b) => a + b, 0) - q.marks) > 1e-9) bad.push(`${e.id}: sum != ${q.marks}`);
    }
    expect(bad).toEqual([]);
  });

  it("figure rows resolve to the ledger's figure, and the file exists", () => {
    const bad: string[] = [];
    for (const e of PYQ_RESTORE_B_MATHS.filter((x) => x.figure)) {
      const paths = getFiguresForQuestion(e.id).map((f) => f.filePath);
      if (JSON.stringify(paths) !== JSON.stringify([e.figurePath])) bad.push(`${e.id}: ${paths.join(", ")}`);
      if (!fs.existsSync(path.join(PUBLIC, e.figurePath!))) bad.push(`${e.id}: missing ${e.figurePath}`);
    }
    expect(bad).toEqual([]);
  });

  it("the 2025 Triangles file: 17 rows, triangles / 2025 / Standard paper, every row 'added' in the ledger", () => {
    expect(TRIANGLES_PYQ_2025).toHaveLength(17);
    const added = new Set(PYQ_RESTORE_B_MATHS.filter((e) => e.verdict === "added").map((e) => e.id));
    for (const q of TRIANGLES_PYQ_2025) {
      expect(q.id).toMatch(/^PYQ-M-2025-TRI-\d{3}[ab]?$/);
      expect(q.topicKey).toBe("triangles");
      expect(q.pyqYear).toBe("2025");
      expect(q.ncertRef).toMatch(/^PYQ 30\/[123]\/[123] Q\d+(\([ab]\))?$/);
      expect(added.has(q.id), q.id).toBe(true);
    }
    expect(added.size).toBe(TRIANGLES_PYQ_2025.length);
  });
});
