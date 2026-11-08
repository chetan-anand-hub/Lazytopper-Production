/**
 * BRIDGE-PANEL-1 - the pure rules of the My packs "Get your papers marked" panel: the papers a pack holds are exactly the printed,
 * pinned codes; every status comes from the student's own record or the server's per-kind flag; one free grade per kind; nothing
 * is said when nothing is known; the mistake line reads only the stored record.
 */
import { describe, expect, it } from "vitest";
import pin from "../../lib/packs/packPaperCodes.pin.json";
import type { SessionRecord } from "../../services/sessionRecords";
import {
  BRIDGE_COPY,
  bridgeRows,
  cbqPapersFromRecords,
  firstMarked,
  mistakeLine,
  packPapers,
  paperHref,
  parseGradeAllowance,
  recordsByCode,
  type GradeAllowance,
} from "./myPacksBridgeModel";

function rec(over: Partial<SessionRecord> & Pick<SessionRecord, "id" | "surface">): SessionRecord {
  return {
    worksheetId: `ws-${over.id}`,
    title: "Paper",
    subject: "maths",
    topicKeys: ["real-numbers"],
    questionIds: [],
    marksAwarded: 0,
    marksTotal: 0,
    status: "pending-upload",
    fourType: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
    sectionBreakdown: null,
    gradedAt: 1,
    perQuestionRef: "",
    dedupKey: "",
    ...over,
  } as SessionRecord;
}

const basic = (ff: Partial<Record<"chapter-test" | "worksheet" | "full-mock", boolean>>, enforced = true): GradeAllowance => ({
  enforced,
  tier: "free",
  firstFree: ff,
});

describe("packPapers - the pack's own printed codes, nothing more", () => {
  it("the bundle lists EXACTLY the 94 pinned pack paper codes (packPaperCodes.pin.json), each once", () => {
    const codes = packPapers({ sku: "pack_bundle", target: "" }).map((p) => p.code);
    expect(new Set(codes).size).toBe(codes.length);
    expect([...codes].sort()).toEqual(Object.keys(pin).sort());
  });
  it("a Chapter Pack is its two Chapter Tests and its Worksheet", () => {
    const ps = packPapers({ sku: "pack_chapter", target: "real-numbers" });
    expect(ps.map((p) => [p.code, p.kind, p.label])).toEqual([
      ["PK-M-RN-CT1", "chapter-test", "Chapter Test 1"],
      ["PK-M-RN-CT2", "chapter-test", "Chapter Test 2"],
      ["PK-M-RN-WS", "worksheet", "Worksheet"],
    ]);
  });
  it("a Mock Pack is its 8 mocks; a Subject Pack is its chapters' papers + its mocks; revised codes keep their -V2", () => {
    expect(packPapers({ sku: "pack_mock", target: "science" }).map((p) => p.code)).toContain("PK-S-FULL-M5-V2");
    expect(packPapers({ sku: "pack_mock", target: "maths" })).toHaveLength(8);
    const subj = packPapers({ sku: "pack_subject", target: "maths" });
    expect(subj.filter((p) => p.kind === "full-mock")).toHaveLength(8);
    expect(subj.every((p) => p.subject === "maths")).toBe(true);
    expect(subj.map((p) => p.code)).toContain("PK-M-PO-WS-V2");
  });
  it("a CBQ pack, an unknown sku or a bad target lists no papers", () => {
    expect(packPapers({ sku: "pack_cbq", target: "maths" })).toEqual([]);
    expect(packPapers({ sku: "pack_chapter", target: "not-a-chapter" })).toEqual([]);
    expect(packPapers({ sku: "pack_mock", target: "hindi" })).toEqual([]);
    expect(packPapers({ sku: "nope", target: "" })).toEqual([]);
  });
});

describe("cbqPapersFromRecords - CBQ papers only once the student has them", () => {
  it("lists the student's own CBQ worksheet records of that subject, and nothing before", () => {
    expect(cbqPapersFromRecords("maths", [])).toEqual([]);
    const records = [
      rec({ id: "PK-M-RN-CBQ1", surface: "worksheet", title: "Real Numbers · Board CBQs (Part 1 of 3)" }),
      rec({ id: "PK-S-CRAE-CBQ1", surface: "worksheet" }),
      rec({ id: "PK-M-RN-WS", surface: "worksheet" }),
      rec({ id: "PK-M-RN-CBQ2", surface: "chapter-test" }),
    ];
    const ps = cbqPapersFromRecords("maths", records);
    expect(ps.map((p) => [p.code, p.label, p.kind])).toEqual([["PK-M-RN-CBQ1", "Real Numbers · Board CBQs (Part 1 of 3)", "worksheet"]]);
  });
});

describe("bridgeRows - statuses from the record and the server only", () => {
  const papers = packPapers({ sku: "pack_chapter", target: "real-numbers" });

  it("unknown allowance -> no status words; not downloaded -> Download state", () => {
    const rows = bridgeRows(papers, new Map(), { paidPass: false, allowance: null });
    expect(rows.every((r) => r.note === null)).toBe(true);
    expect(rows.every((r) => r.state.kind === "not-downloaded")).toBe(true);
  });

  it("Basic with the limits gate on: ONE 'free mark left' per kind (the first ungraded), the rest 'with Board Pass'", () => {
    const rows = bridgeRows(papers, new Map(), { paidPass: false, allowance: basic({ "chapter-test": true, worksheet: true }) });
    expect(rows.map((r) => [r.paper.code, r.note])).toEqual([
      ["PK-M-RN-CT1", BRIDGE_COPY.freeLeft],
      ["PK-M-RN-CT2", BRIDGE_COPY.withPass],
      ["PK-M-RN-WS", BRIDGE_COPY.freeLeft],
    ]);
  });

  it("a used free grade -> 'with Board Pass'; the limits gate off -> Basic is 'with Board Pass' (the 402 is the truth)", () => {
    expect(bridgeRows(papers, new Map(), { paidPass: false, allowance: basic({ "chapter-test": false, worksheet: false }) }).map((r) => r.note)).toEqual([
      BRIDGE_COPY.withPass,
      BRIDGE_COPY.withPass,
      BRIDGE_COPY.withPass,
    ]);
    expect(bridgeRows(papers, new Map(), { paidPass: false, allowance: basic({ "chapter-test": true }, false) }).every((r) => r.note === BRIDGE_COPY.withPass)).toBe(true);
  });

  it("trial: the server's flag when enforced; an unmetered trial (no grade counters) says nothing", () => {
    const trial: GradeAllowance = { enforced: true, tier: "trial", firstFree: { "chapter-test": false, worksheet: true } };
    expect(bridgeRows(papers, new Map(), { paidPass: false, allowance: trial }).map((r) => r.note)).toEqual([
      BRIDGE_COPY.withPass,
      BRIDGE_COPY.withPass,
      BRIDGE_COPY.freeLeft,
    ]);
    const unmetered: GradeAllowance = { enforced: true, tier: "trial", firstFree: {} };
    expect(bridgeRows(papers, new Map(), { paidPass: false, allowance: unmetered }).every((r) => r.note === null)).toBe(true);
  });

  it("a paid Board Pass -> every ungraded paper 'with Board Pass', never 'free mark left'", () => {
    const rows = bridgeRows(papers, new Map(), { paidPass: true, allowance: basic({ "chapter-test": true, worksheet: true }) });
    expect(rows.every((r) => r.note === BRIDGE_COPY.withPass)).toBe(true);
  });

  it("marked papers first with their own score and no status words; a downloaded paper opens its existing upload route", () => {
    const byCode = recordsByCode([
      rec({ id: "PK-M-RN-CT1", surface: "chapter-test", status: "graded", marksAwarded: 25.5, marksTotal: 31, gradedAt: 50 }),
      rec({ id: "PK-M-RN-WS", surface: "worksheet", status: "pending-upload", gradedAt: 40 }),
    ]);
    const rows = bridgeRows(papers, byCode, { paidPass: false, allowance: basic({ "chapter-test": false, worksheet: true }) });
    expect(rows[0].paper.code).toBe("PK-M-RN-CT1");
    expect(rows[0].state).toMatchObject({ kind: "marked", awarded: 25.5, total: 31, partial: false });
    expect(rows[0].note).toBeNull();
    expect(rows[1]).toMatchObject({ paper: { code: "PK-M-RN-WS" }, state: { kind: "waiting" }, note: BRIDGE_COPY.freeLeft });
    expect(rows[2]).toMatchObject({ paper: { code: "PK-M-RN-CT2" }, state: { kind: "not-downloaded" }, note: BRIDGE_COPY.withPass });
    expect((rows[1].state as { href: string }).href).toBe("/practice/worksheets?subject=Maths&scope=full-subject&upload=PK-M-RN-WS&source=packs&returnTo=%2Fpacks");
  });

  it("a record under the same code but another surface is not this paper's record", () => {
    const byCode = recordsByCode([rec({ id: "PK-M-RN-CT1", surface: "worksheet", status: "graded", marksAwarded: 1, marksTotal: 2 })]);
    expect(bridgeRows(papers, byCode, { paidPass: false, allowance: null })[0].state.kind).toBe("not-downloaded");
  });

  it("the one free per kind is shared across packs (freeTaken)", () => {
    const taken = new Set<"chapter-test" | "worksheet" | "full-mock">();
    const a = bridgeRows(papers, new Map(), { paidPass: false, allowance: basic({ "chapter-test": true }), freeTaken: taken });
    const b = bridgeRows(packPapers({ sku: "pack_chapter", target: "polynomials" }), new Map(), { paidPass: false, allowance: basic({ "chapter-test": true }), freeTaken: taken });
    expect([...a, ...b].filter((r) => r.note === BRIDGE_COPY.freeLeft)).toHaveLength(1);
  });
});

describe("paperHref - the existing surface routes", () => {
  it("chapter test review=, full mock upload= / review=", () => {
    const [ct1] = packPapers({ sku: "pack_chapter", target: "real-numbers" });
    expect(paperHref(ct1, "upload")).toBe("/chapter-test/10/Maths/real-numbers?review=PK-M-RN-CT1&source=packs&returnTo=%2Fpacks");
    const [m1] = packPapers({ sku: "pack_mock", target: "science" });
    expect(paperHref(m1, "upload")).toBe("/full-mock/10/Science?upload=PK-S-FULL-M1&source=packs&returnTo=%2Fpacks");
    expect(paperHref(m1, "review")).toBe("/full-mock/10/Science?review=PK-S-FULL-M1&source=packs&returnTo=%2Fpacks");
  });
});

describe("firstMarked + mistakeLine - the record's own numbers only", () => {
  const papers = packPapers({ sku: "pack_chapter", target: "real-numbers" });
  it("no graded pack paper -> no card; the EARLIEST graded one is 'first'", () => {
    expect(firstMarked(papers, recordsByCode([rec({ id: "PK-M-RN-WS", surface: "worksheet" })]))).toBeNull();
    const f = firstMarked(
      papers,
      recordsByCode([
        rec({ id: "PK-M-RN-CT2", surface: "chapter-test", status: "graded", marksAwarded: 10, marksTotal: 31, gradedAt: 90 }),
        rec({ id: "PK-M-RN-CT1", surface: "chapter-test", status: "graded", marksAwarded: 25.5, marksTotal: 31, gradedAt: 20 }),
      ]),
    );
    expect(f?.paper.code).toBe("PK-M-RN-CT1");
  });
  it("marks per kind stored -> the top kind in marks, plus careless marks", () => {
    const r = rec({
      id: "x",
      surface: "chapter-test",
      status: "graded",
      marksAwarded: 25.5,
      marksTotal: 31,
      marksLostByType: { conceptual: 3, calculation: 1, silly: 0.5, presentation: 1, unattempted: 0, untyped: 0 },
      marksLostByTypeVersion: 1,
    });
    expect(mistakeLine(r)).toBe("Most marks lost to a knowledge gap (3 marks). 1.5 marks were careless slips you can stop today.");
  });
  it("counts only -> counts, never converted to marks; full marks; nothing recorded -> null", () => {
    expect(mistakeLine(rec({ id: "x", surface: "worksheet", status: "graded", marksAwarded: 5, marksTotal: 10, fourType: { conceptual: 0, calculation: 2, silly: 1, presentation: 1 } }))).toBe(
      "Most mistakes: careless slips (3 mistakes).",
    );
    expect(mistakeLine(rec({ id: "x", surface: "worksheet", status: "graded", marksAwarded: 10, marksTotal: 10 }))).toBe("Full marks on everything graded.");
    expect(mistakeLine(rec({ id: "x", surface: "worksheet", status: "graded", marksAwarded: 5, marksTotal: 10 }))).toBeNull();
  });
});

describe("parseGradeAllowance", () => {
  it("reads enforced, tier and the per-kind first-free flags; junk -> null / absent", () => {
    expect(parseGradeAllowance(null)).toBeNull();
    expect(
      parseGradeAllowance({ enforced: true, tier: "free", grade: { worksheet: { firstFreeAvailable: true }, "chapter-test": { firstFreeAvailable: false }, "full-mock": { firstFreeAvailable: "yes" } } }),
    ).toEqual({ enforced: true, tier: "free", firstFree: { worksheet: true, "chapter-test": false } });
    expect(parseGradeAllowance({ tier: "premium" })).toEqual({ enforced: false, tier: "premium", firstFree: {} });
  });
});
