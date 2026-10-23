// @vitest-environment node
/**
 * PYQ-RESTORE-B PR-2 (Science) - pins over the ASSEMBLED bank for pyqRestoreBScienceLedger.ts.
 *
 *   1. ledger shape: unique ids; official cbse.gov.in question paper + marking scheme with a 64-hex SHA-256; counts.
 *   2. every restored row is SERVED, carries the ledger's year / set / reference, has no `sourceOverride`, and is a PYQ.
 *   3. every step carries a "[N mark]" prefix; the prefixes are exactly the ledger's and sum to the row's marks.
 *   4. figure rows resolve to exactly the ledger's figure, and the file exists under public/.
 *   5. every KEPT-OUT row is still not served (or, for kept-others, still Others) - this lane changed none of them.
 */
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { RAW_CANONICAL_QUESTION_BANK, canonicalQuestionBank } from "../canonicalQuestionBank";
import { isPYQQuestion } from "../../utils/isPYQQuestion";
import { getFiguresForQuestion } from "../visualConceptRegistry";
import {
  PYQ_RESTORE_B_SCIENCE,
  PYQ_RESTORE_B_SCIENCE_COUNTS,
  PYQ_RESTORE_B_SCIENCE_IDS,
  PYQ_RESTORE_B_SCIENCE_KEPT_OUT,
} from "./pyqRestoreBScienceLedger";

type Row = Record<string, unknown> & { id: string; marks: number; solutionSteps?: string[] };
const bankById = new Map(RAW_CANONICAL_QUESTION_BANK.map((q) => [q.id, q as unknown as Row]));
const servedIds = new Set(canonicalQuestionBank.map((q) => q.id));
const STEP = /^\[(\d+(?:\.\d+)?) marks?\] /;
const PUBLIC = path.resolve(__dirname, "../../../public");

describe("PYQ-RESTORE-B · Science ledger", () => {
  it("shape: unique ids, official sources with SHA-256, counts", () => {
    expect(PYQ_RESTORE_B_SCIENCE_IDS.size).toBe(PYQ_RESTORE_B_SCIENCE.length);
    for (const e of PYQ_RESTORE_B_SCIENCE) {
      expect(e.qp, e.id).toMatch(/^https:\/\/www\.cbse\.gov\.in\/cbsenew\/question-paper\/20(23|24|25|26)\/X\/[^#]+\.zip#.+\.pdf$/);
      expect(e.ms, e.id).toMatch(/^https:\/\/www\.cbse\.gov\.in\/cbsenew\/(Marking-Scheme|marking-scheme)\/20(23|24|25|26)\/X\/[^#]+\.zip#.+\.pdf$/);
      expect(e.qpSha256, e.id).toMatch(/^[0-9a-f]{64}$/);
      expect(e.msSha256, e.id).toMatch(/^[0-9a-f]{64}$/);
      expect(e.ref, e.id).toMatch(/^PYQ 31\/\d\/\d Q\d+$/);
      expect(e.qp, e.id).toContain(`/${e.year}/X/`);
    }
    expect(PYQ_RESTORE_B_SCIENCE).toHaveLength(PYQ_RESTORE_B_SCIENCE_COUNTS.restored);
    expect(PYQ_RESTORE_B_SCIENCE.filter((e) => e.figure === "new")).toHaveLength(PYQ_RESTORE_B_SCIENCE_COUNTS.figuresNew);
    expect(PYQ_RESTORE_B_SCIENCE.filter((e) => e.figure === "reused")).toHaveLength(PYQ_RESTORE_B_SCIENCE_COUNTS.figuresReused);
    expect(PYQ_RESTORE_B_SCIENCE_KEPT_OUT).toHaveLength(PYQ_RESTORE_B_SCIENCE_COUNTS.keptOut);
    expect(PYQ_RESTORE_B_SCIENCE_KEPT_OUT.filter((k) => PYQ_RESTORE_B_SCIENCE_IDS.has(k.id))).toEqual([]);
  });

  it("every restored row is served as a PYQ with the ledger's year / set / reference and no override", () => {
    const bad: string[] = [];
    for (const e of PYQ_RESTORE_B_SCIENCE) {
      const q = bankById.get(e.id);
      if (!q) { bad.push(`${e.id}: not in the bank`); continue; }
      if (!servedIds.has(e.id)) bad.push(`${e.id}: not served`);
      if (q.pyqYear !== e.year || q.pyqSet !== e.set) bad.push(`${e.id}: year/set ${String(q.pyqYear)}/${String(q.pyqSet)}`);
      if (q.ncertRef !== e.ref) bad.push(`${e.id}: ref ${String(q.ncertRef)}`);
      if ("sourceOverride" in q) bad.push(`${e.id}: sourceOverride`);
      if (!isPYQQuestion(q as never)) bad.push(`${e.id}: not PYQ`);
    }
    expect(bad).toEqual([]);
  });

  it("step marks are exactly the ledger's and sum to the row's marks", () => {
    const bad: string[] = [];
    for (const e of PYQ_RESTORE_B_SCIENCE) {
      const q = bankById.get(e.id)!;
      const marks = (q.solutionSteps ?? []).map((s) => { const m = STEP.exec(s); return m ? Number(m[1]) : NaN; });
      if (JSON.stringify(marks) !== JSON.stringify(e.stepMarks)) bad.push(`${e.id}: ${marks.join("+")}`);
      if (Math.abs(marks.reduce((a, b) => a + b, 0) - q.marks) > 1e-9) bad.push(`${e.id}: sum != ${q.marks}`);
    }
    expect(bad).toEqual([]);
  });

  it("figure rows resolve to the ledger's figure, and the file exists", () => {
    const bad: string[] = [];
    for (const e of PYQ_RESTORE_B_SCIENCE.filter((x) => x.figure)) {
      const paths = getFiguresForQuestion(e.id).map((f) => f.filePath);
      if (JSON.stringify(paths) !== JSON.stringify([e.figurePath])) bad.push(`${e.id}: ${paths.join(", ")}`);
      if (!fs.existsSync(path.join(PUBLIC, e.figurePath!))) bad.push(`${e.id}: missing ${e.figurePath}`);
    }
    expect(bad).toEqual([]);
  });

  it("kept-out rows are untouched by this lane: not served, or (kept-others) still filed under Others", () => {
    const bad: string[] = [];
    for (const k of PYQ_RESTORE_B_SCIENCE_KEPT_OUT) {
      const q = bankById.get(k.id);
      if (!q) { bad.push(`${k.id}: not in the bank`); continue; }
      if (k.reason === "kept-others") { if (q.sourceOverride !== "others") bad.push(`${k.id}: no longer Others`); }
      else if (servedIds.has(k.id)) bad.push(`${k.id}: served`);
    }
    expect(bad).toEqual([]);
  });
});
