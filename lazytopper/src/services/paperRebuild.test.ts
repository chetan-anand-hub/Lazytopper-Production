// @vitest-environment node
// PAPER-REBUILD-1 (cofounder D102/D103) — the pure rebuild and the guard that makes its count exact.
import { describe, it, expect } from "vitest";
import { RAW_CANONICAL_QUESTION_BANK } from "../data/canonicalQuestionBank";
import type { CanonicalQuestion } from "../data/predictionTypes";
import type { SessionRecord } from "./sessionRecords";
import { rebuildPaperFromRecord, worksheetQuestionFromBankRow } from "./paperRebuild";

describe("D103b guard — every RAW bank row has a non-empty id", () => {
  // A record's `questionIds` is `paper.questions.map((q) => q.id).filter(Boolean)`. Every paper
  // question is a bank row, so with no empty bank id the filter drops nothing and
  // `questionIds.length` IS the paper's question count. Raw (withheld included): the student sat them.
  it("★ no row in RAW_CANONICAL_QUESTION_BANK has an empty / missing id", () => {
    expect(RAW_CANONICAL_QUESTION_BANK.length).toBeGreaterThan(10000); // non-vacuous
    const empty = RAW_CANONICAL_QUESTION_BANK.filter((q) => typeof q.id !== "string" || q.id.trim() === "");
    expect(empty.map((q) => q.questionText?.slice(0, 40))).toEqual([]);
  });
});

const row = (id: string, section: string, marks: number): CanonicalQuestion =>
  ({ id, subject: "Maths", topicKey: "real-numbers", section, marks, questionText: `text ${id}`, answer: "a" }) as unknown as CanonicalQuestion;
const BANK = new Map([row("r1", "A", 1), row("r2", "C", 3), row("r3", "B", 2)].map((q) => [q.id, q]));
const rowFor = (id: string) => BANK.get(id) ?? null;
const labelFor = (key: string) => (key === "real-numbers" ? "Real Numbers" : key);
function rec(over: Partial<SessionRecord>): SessionRecord {
  return {
    id: "WS-M-REALNUMBERS-09",
    worksheetId: "ws-9",
    surface: "worksheet",
    title: "Real Numbers — Board exam mix",
    subject: "maths",
    topicKeys: ["real-numbers"],
    questionIds: ["r2", "r1", "r3"],
    marksAwarded: 0,
    marksTotal: 0,
    status: "pending-upload",
    fourType: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
    sectionBreakdown: null,
    gradedAt: Date.UTC(2026, 6, 15),
    perQuestionRef: "ws:WS-M-REALNUMBERS-09",
    dedupKey: "u::WS-M-REALNUMBERS-09",
    ...over,
  } as SessionRecord;
}

describe("rebuildPaperFromRecord", () => {
  it("★ a worksheet: exactly the record's ids, in the record's order, through the shared map; identity carried", () => {
    const ws = rebuildPaperFromRecord(rec({}), rowFor, labelFor)!;
    expect(ws.questions.map((q) => q.id)).toEqual(["r2", "r1", "r3"]);
    expect(ws.questions[0]).toEqual(worksheetQuestionFromBankRow(BANK.get("r2")!, 1, "Real Numbers"));
    expect(ws).toMatchObject({ worksheetId: "ws-9", code: "WS-M-REALNUMBERS-09", title: "Real Numbers — Board exam mix", subject: "Maths", totalMarks: 6 });
    expect(ws.sectionFilter).toBe("Sections A + B + C");
  });

  it("★ (c) one id that does not resolve -> null (no partial paper) — the count check", () => {
    expect(rebuildPaperFromRecord(rec({ questionIds: ["r2", "GONE", "r3"] }), rowFor, labelFor)).toBeNull();
    expect(rebuildPaperFromRecord(rec({ questionIds: [] }), rowFor, labelFor)).toBeNull();
  });

  it("★ D103a: a Chapter Test or Full Mock is NEVER rebuilt, even with every id resolvable", () => {
    expect(rebuildPaperFromRecord(rec({ surface: "chapter-test" }), rowFor, labelFor)).toBeNull();
    expect(rebuildPaperFromRecord(rec({ surface: "full-mock" }), rowFor, labelFor)).toBeNull();
  });
});
