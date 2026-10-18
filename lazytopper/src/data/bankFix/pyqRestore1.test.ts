// @vitest-environment node
/**
 * PYQ-RESTORE-1 - pins over the ASSEMBLED bank for the provenance ledger (pyqRestore1Ledger.ts).
 *
 *   1. ledger shape: one entry per id; every entry cites an official cbse.gov.in question paper and
 *      marking scheme with a 64-hex SHA-256; counts match the ledger's own COUNTS.
 *   2. restored rows (owner ruling (a)): served, carry the confirmed pyqYear / pyqSet and the ledger's
 *      paper reference, no `sourceOverride`, and are PYQ for both matchers and the Practice filter.
 *   3. kept-others rows: still `sourceOverride: "others"`, no year / set, never PYQ.
 *   4. labelled rows: every step carries a "[N mark]" prefix, the prefixes are exactly the ledger's
 *      `stepMarks`, and they sum to the row's marks.
 *   5. the served bank total is unchanged (no row added or withheld by this lane).
 */
import { describe, expect, it, vi } from "vitest";

// PracticePage is imported only for its pure `questionMatchesFilters`; it reaches services/cbseExamDate,
// which reads the clock at module load. Stubbed exactly as bankFix1.pr2.test.ts does.
vi.mock("../../services/cbseExamDate", () => ({
  CBSE_PHASE2_DATE: "",
  CBSE_PHASE2_END: "",
  predictCbseExamDate: () => "",
  predictCbsePhase2Date: () => "",
  predictCbsePhase2End: () => "",
  daysLeftFromIsoDate: () => 0,
  fetchCbseExamDate: async () => ({}),
  fetchCbsePhase1Date: () => ({}),
  fetchCbsePhase2Date: () => ({}),
  getPhaseDeadline: () => "",
  getCbseExamDateAdminOverride: () => null,
  setCbseExamDateAdminOverride: () => undefined,
  clearCbseExamDateAdminOverride: () => undefined,
}));

import { RAW_CANONICAL_QUESTION_BANK, canonicalQuestionBank } from "../canonicalQuestionBank";
import { isPYQQuestion } from "../../utils/isPYQQuestion";
import { isPYQQuestion as engineIsPYQQuestion } from "../practiceSetGenerator";
import { questionMatchesFilters } from "../../pages/PracticePage";
import {
  PYQ_RESTORE_1_MATHS,
  PYQ_RESTORE_1_MATHS_COUNTS,
  PYQ_RESTORE_1_MATHS_SOURCES,
  PYQ_RESTORE_1_RESTORED_IDS,
} from "./pyqRestore1Ledger";

type Row = Record<string, unknown> & { id: string };
const bankById = new Map(RAW_CANONICAL_QUESTION_BANK.map((q) => [q.id, q as unknown as Row]));
const servedIds = new Set((canonicalQuestionBank as unknown as Row[]).map((q) => q.id));
const STEP = /^\[(\d+(?:\.\d+)?) marks?\] /;
const LEDGER = PYQ_RESTORE_1_MATHS;

describe("PYQ-RESTORE-1 · ledger shape", () => {
  it("one entry per id, official sources with SHA-256", () => {
    expect(new Set(LEDGER.map((e) => e.id)).size).toBe(LEDGER.length);
    const bad: string[] = [];
    for (const e of LEDGER) {
      for (const [u, h] of [[e.qp, e.qpSha256], [e.ms, e.msSha256]] as const) {
        if (!/^https:\/\/www\.cbse\.gov\.in\/cbsenew\/(question-paper|[Mm]arking-[Ss]cheme)\/20\d\d\/X\/[^#]+\.zip#.+\.pdf$/.test(u)) bad.push(`${e.id}: url ${u}`);
        if (!/^[0-9a-f]{64}$/.test(h)) bad.push(`${e.id}: sha ${h}`);
        if (PYQ_RESTORE_1_MATHS_SOURCES[u] !== h) bad.push(`${e.id}: source table disagrees for ${u}`);
      }
      if (!/^PYQ (30\/\d\/\d|30\(B\)) Q\d+(\([a-z]\))?$/.test(e.ref)) bad.push(`${e.id}: ref ${e.ref}`);
      if (!/^20(23|24|25|26)$/.test(e.year)) bad.push(`${e.id}: year ${e.year}`);
      if (!e.qp.includes(`/question-paper/${e.year}/`) || !e.ms.toLowerCase().includes(`/marking-scheme/${e.year}/`)) bad.push(`${e.id}: paper year`);
    }
    expect(bad).toEqual([]);
  });
  it("counts match the ledger (non-vacuous)", () => {
    const n = (v: string) => LEDGER.filter((e) => e.verdict === v).length;
    expect(n("restored")).toBe(PYQ_RESTORE_1_MATHS_COUNTS.restored);
    expect(n("kept-others")).toBe(PYQ_RESTORE_1_MATHS_COUNTS.keptOthers);
    expect(n("labelled")).toBe(PYQ_RESTORE_1_MATHS_COUNTS.labelledYeared);
    expect(LEDGER.filter((e) => e.stepMarks).length).toBe(PYQ_RESTORE_1_MATHS_COUNTS.labelled);
    expect(PYQ_RESTORE_1_MATHS_COUNTS).toEqual({ restored: 121, keptOthers: 15, labelled: 100, labelledYeared: 45 });
    expect(PYQ_RESTORE_1_RESTORED_IDS.size).toBe(121);
  });
});

describe("PYQ-RESTORE-1 · ruling (a): restored rows are board PYQs again", () => {
  it("served, year / set / reference confirmed, no override, PYQ everywhere", () => {
    const bad: string[] = [];
    for (const e of LEDGER.filter((x) => x.verdict === "restored")) {
      const q = bankById.get(e.id);
      if (!q) { bad.push(`${e.id}: missing`); continue; }
      if (!servedIds.has(e.id)) bad.push(`${e.id}: not served`);
      if (q.sourceOverride !== undefined) bad.push(`${e.id}: still has sourceOverride`);
      if (q.pyqYear !== e.year || q.pyqSet !== e.set) bad.push(`${e.id}: year/set ${String(q.pyqYear)}/${String(q.pyqSet)}`);
      if (q.ncertRef !== e.ref) bad.push(`${e.id}: ref ${String(q.ncertRef)}`);
      if (!isPYQQuestion(q as never) || !engineIsPYQQuestion(q as never)) bad.push(`${e.id}: not PYQ`);
      if (!questionMatchesFilters(q as never, "all", "all", "pyq", "all", null)) bad.push(`${e.id}: not in the PYQ filter`);
      if (questionMatchesFilters(q as never, "all", "all", "others", "all", null)) bad.push(`${e.id}: still in Others`);
    }
    expect(bad).toEqual([]);
  });
  it("kept-others rows stay Others with no year", () => {
    const bad: string[] = [];
    for (const e of LEDGER.filter((x) => x.verdict === "kept-others")) {
      const q = bankById.get(e.id)!;
      if (q.sourceOverride !== "others") bad.push(`${e.id}: no override`);
      if (q.pyqYear || q.pyqSet) bad.push(`${e.id}: has a year`);
      if (isPYQQuestion(q as never)) bad.push(`${e.id}: isPYQ`);
    }
    expect(bad).toEqual([]);
  });
});

describe("PYQ-RESTORE-1 · step marks from the official marking scheme", () => {
  it("every labelled row is fully step-marked with the ledger's marks, summing to its marks", () => {
    const bad: string[] = [];
    for (const e of LEDGER.filter((x) => x.stepMarks)) {
      const q = bankById.get(e.id)!;
      const steps = (q.solutionSteps as string[] | undefined) ?? [];
      const marks = steps.map((s) => Number(STEP.exec(s)?.[1] ?? NaN));
      if (marks.some((m) => !Number.isFinite(m))) bad.push(`${e.id}: unlabelled step`);
      if (JSON.stringify(marks) !== JSON.stringify(e.stepMarks)) bad.push(`${e.id}: marks ${marks.join(",")} != ledger ${e.stepMarks!.join(",")}`);
      if (Math.abs(marks.reduce((a, b) => a + b, 0) - Number(q.marks)) > 1e-9) bad.push(`${e.id}: sum != ${String(q.marks)}`);
    }
    expect(bad).toEqual([]);
  });
});

describe("PYQ-RESTORE-1 · no row added or withheld", () => {
  it("served bank total is at least this lane's 10,580 (measured before and after, 2026-10-18)", () => {
    // A floor, not an exact count: a later lane that adds rows must not break this pin; a lane
    // that withholds rows lowers the floor with a dated comment.
    expect(canonicalQuestionBank.length).toBeGreaterThanOrEqual(10580);
  });
});
