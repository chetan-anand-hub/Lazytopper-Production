// @vitest-environment node
//
// Progress-Journey PR-1 — the session-record store. Runs in CI/Codespaces vitest;
// NOT in the Windows-local quality-gate matrix. Firestore + the active-uid resolver
// are mocked so the CONTRACT logic (field mapping, honest-failure gates, the durable
// #NN over sessionRecords, mint-once freeze) is asserted in isolation. Node env → no
// `window`, so the localStorage mirror is a guarded no-op (the durable Firestore path
// is the tested surface; localStorage is best-effort).

import { describe, it, expect, vi } from "vitest";

vi.mock("./firebaseClient", () => ({ firestoreDb: null }));
vi.mock("./studentProgressStore", () => ({ getActiveProgressUser: () => null }));

import {
  buildWorksheetSessionRecord,
  writeSessionRecord,
  worksheetLiteFromRecords,
  ensureWorksheetSessionCode,
  ciTopicToken,
  checkImproveSequence,
  checkImproveNomenclature,
  ensureCheckImproveSessionCode,
  buildCheckImproveSessionRecord,
  type SessionRecord,
} from "./sessionRecords";
import { worksheetNomenclature } from "../components/worksheet/worksheetModel";
import type { PersistedWorksheet } from "./worksheetSessionStore";
import type { WorksheetGradeResponse } from "../ai/aiClient";

const USER = { uid: "u1", isLocalSession: false } as never;

function ws(overrides: Partial<PersistedWorksheet> = {}): PersistedWorksheet {
  return {
    worksheetId: "ws-abc",
    createdAt: "2026-07-04T00:00:00.000Z",
    title: "Real Numbers — Mixed Worksheet",
    subject: "Maths",
    grade: "10",
    sectionFilter: "All",
    totalMarks: 6,
    questions: [
      { qNumber: 1, id: "RN-1", subject: "Maths", topicKey: "real-numbers", topicLabel: "Real Numbers", section: "A", marks: 1, questionText: "Q1" },
      { qNumber: 2, id: "RN-2", subject: "Maths", topicKey: "real-numbers", topicLabel: "Real Numbers", section: "C", marks: 3, questionText: "Q2" },
      { qNumber: 3, id: "RN-3", subject: "Maths", topicKey: "real-numbers", topicLabel: "Real Numbers", section: "B", marks: 2, questionText: "Q3" },
    ],
    ...overrides,
  };
}

/** Q1 full, Q2 conceptual+calculation, Q3 couldNotRead (pending). */
function response(overrides: Partial<WorksheetGradeResponse> = {}): WorksheetGradeResponse {
  return {
    ok: true,
    worksheetId: "ws-abc",
    totalQuestions: 3,
    gradedCount: 2,
    pendingCount: 1,
    gradedMarksAwarded: 2,
    gradedMarksTotal: 4,
    worksheetTotalMarks: 6,
    results: [
      { qNumber: 1, couldNotRead: false, ok: true, totalMarks: 1, marksAwarded: 1, percentage: 100, annotatedSteps: [], mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 }, teacherNote: "" },
      { qNumber: 2, couldNotRead: false, ok: true, totalMarks: 3, marksAwarded: 1, percentage: 33, annotatedSteps: [], mistakeSummary: { conceptual: 1, calculation: 1, silly: 0, presentation: 0 }, teacherNote: "" },
      { qNumber: 3, couldNotRead: true, totalMarks: 2, note: "couldn't read" },
    ],
    ...overrides,
  };
}

function record(over: Partial<SessionRecord> = {}): SessionRecord {
  return {
    id: over.id ?? "WS-M-RN-01",
    worksheetId: over.worksheetId ?? "ws-stored-1",
    surface: "worksheet",
    title: "Real Numbers — Mixed Worksheet",
    subject: "maths",
    topicKeys: ["real-numbers"],
    questionIds: ["RN-1"],
    marksAwarded: 2,
    marksTotal: 4,
    status: "graded",
    fourType: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
    sectionBreakdown: null,
    gradedAt: 1751600000000,
    perQuestionRef: "ws:WS-M-RN-01",
    dedupKey: "u1::WS-M-RN-01",
    ...over,
  };
}

describe("buildWorksheetSessionRecord — the §1 contract", () => {
  it("maps every field per the contract and joins topic/subject from the worksheet", () => {
    const rec = buildWorksheetSessionRecord(ws(), response(), { code: "WS-M-RN-03" }, "u1");
    expect(rec.id).toBe("WS-M-RN-03");
    expect(rec.worksheetId).toBe("ws-abc"); // idempotency anchor
    expect(rec.surface).toBe("worksheet");
    expect(rec.subject).toBe("maths");
    expect(rec.topicKeys).toEqual(["real-numbers"]);
    expect(rec.questionIds).toEqual(["RN-1", "RN-2", "RN-3"]);
    expect(rec.marksAwarded).toBe(2); // graded portion (gradedMarksAwarded)
    expect(rec.marksTotal).toBe(4); // graded portion (gradedMarksTotal)
    expect(rec.sectionBreakdown).toBeNull(); // full-mock only
    expect(rec.perQuestionRef).toBe("ws:WS-M-RN-03");
    expect(rec.dedupKey).toBe("u1::WS-M-RN-03");
    expect(typeof rec.gradedAt).toBe("number");
  });

  it("aggregates fourType from LEGIBLE questions only — a pending answer is never a fabricated mistake", () => {
    const rec = buildWorksheetSessionRecord(ws(), response(), { code: "WS-M-RN-03" }, "u1");
    // Q2 contributes conceptual:1 + calculation:1; Q3 (couldNotRead) contributes nothing.
    expect(rec.fourType).toEqual({ conceptual: 1, calculation: 1, silly: 0, presentation: 0 });
  });

  it("derives an HONEST status (never a fake 0)", () => {
    expect(buildWorksheetSessionRecord(ws(), response({ pendingCount: 0, gradedCount: 3 }), { code: "C" }, "u1").status).toBe("graded");
    expect(buildWorksheetSessionRecord(ws(), response({ pendingCount: 1, gradedCount: 2 }), { code: "C" }, "u1").status).toBe("partial");
    expect(buildWorksheetSessionRecord(ws(), response({ pendingCount: 3, gradedCount: 0 }), { code: "C" }, "u1").status).toBe("pending-upload");
  });

  it("normalises a Science worksheet subject to 'science'", () => {
    const rec = buildWorksheetSessionRecord(ws({ subject: "Science" }), response(), { code: "WS-S-LP-01" }, "u1");
    expect(rec.subject).toBe("science");
  });
});

describe("writeSessionRecord — honest-failure gates", () => {
  it("skips a signed-out session (no fabricated history)", () => {
    expect(writeSessionRecord(null, record())).toBe("skipped-no-user");
    expect(writeSessionRecord(undefined, record())).toBe("skipped-no-user");
  });
  it("skips a local/browse session", () => {
    expect(writeSessionRecord({ uid: "u1", isLocalSession: true } as never, record())).toBe("skipped-local");
  });
  it("skips a record with no id", () => {
    expect(writeSessionRecord(USER, record({ id: "" }))).toBe("skipped-invalid");
  });
  it("records for a real signed-in user", () => {
    expect(writeSessionRecord(USER, record())).toBe("recorded");
  });
});

describe("durable #NN — count of existing sessionRecords for (subject, topic) + 1", () => {
  it("numbers a new Real Numbers worksheet AFTER the student's existing Real Numbers records (cross-device)", () => {
    const existing = [
      record({ id: "WS-M-RN-01", worksheetId: "ws-1", gradedAt: 1751000000000, perQuestionRef: "ws:WS-M-RN-01" }),
      record({ id: "WS-M-RN-02", worksheetId: "ws-2", gradedAt: 1751200000000, perQuestionRef: "ws:WS-M-RN-02" }),
    ];
    const lite = worksheetLiteFromRecords(existing);
    expect(lite).toHaveLength(2);
    const nomen = worksheetNomenclature(ws(), lite); // ws() is worksheetId "ws-abc" — not in the set
    expect(nomen.code).toBe("WS-M-RN-03");
    expect(nomen.sequence).toBe(3);
    expect(nomen.name).toBe("Real Numbers · Worksheet 3");
  });

  it("RE-GRADE robustness: a record for the SAME worksheetId reuses its ORIGINAL #NN (idempotent even if the freeze was lost)", () => {
    // Ring-buffer eviction / a failed localStorage freeze: the durable record still
    // carries the physical worksheetId, so the same worksheet re-resolves to its
    // original code instead of minting a duplicate.
    const existing = [record({ id: "WS-M-RN-01", worksheetId: "ws-abc", gradedAt: 1751000000000, perQuestionRef: "ws:WS-M-RN-01" })];
    const nomen = worksheetNomenclature(ws(), worksheetLiteFromRecords(existing));
    expect(nomen.code).toBe("WS-M-RN-01");
    expect(nomen.sequence).toBe(1);
  });

  it("counts only the SAME (subject, topic) group — a Polynomials record does not bump Real Numbers", () => {
    const existing = [record({ id: "WS-M-PO-01", title: "Polynomials — Worksheet", topicKeys: ["polynomials"], perQuestionRef: "ws:WS-M-PO-01" })];
    const nomen = worksheetNomenclature(ws(), worksheetLiteFromRecords(existing));
    expect(nomen.code).toBe("WS-M-RN-01");
  });

  it("ignores non-worksheet surfaces when counting", () => {
    const existing = [record({ id: "CT-M-RN-01", surface: "chapter-test", perQuestionRef: "ct:CT-M-RN-01" })];
    expect(worksheetLiteFromRecords(existing)).toHaveLength(0);
  });
});

describe("ensureWorksheetSessionCode — mint once", () => {
  it("reuses a frozen code without re-counting", async () => {
    const frozen = ws({ code: "WS-M-RN-07", name: "Real Numbers · Worksheet 7", sequence: 7 });
    const nomen = await ensureWorksheetSessionCode(frozen, USER, [{ worksheetId: "x", subject: "Maths", createdAt: "2026-01-01", title: "t", topicKeys: ["real-numbers"] }]);
    expect(nomen.code).toBe("WS-M-RN-07");
    expect(nomen.sequence).toBe(7);
  });

  it("falls back to the device-local list when the durable read yields nothing (signed-out / offline)", async () => {
    // No window + mocked firestoreDb:null ⇒ durable read is empty ⇒ uses the fallback list.
    const fallback = [
      { worksheetId: "a", subject: "Maths", createdAt: "2026-07-01T00:00:00.000Z", title: "Real Numbers — a", topicKeys: ["real-numbers"] },
    ];
    const nomen = await ensureWorksheetSessionCode(ws(), USER, fallback);
    expect(nomen.code).toBe("WS-M-RN-02");
  });
});

// ── Check & Improve (C&I PR-1) — durable CI code + the §1 record ─────────────────

function ciRecord(over: Partial<SessionRecord> = {}): SessionRecord {
  return record({
    id: "CI-M-REAL-01",
    surface: "check-improve",
    worksheetId: "ci:CI-M-REAL-01",
    perQuestionRef: "ci:CI-M-REAL-01",
    dedupKey: "u1::CI-M-REAL-01",
    questionIds: [],
    topicSource: "inferred",
    ...over,
  });
}

describe("ciTopicToken — byte-identical to the page helper it replaces", () => {
  it("takes the first four letters of the canonical slug, uppercased", () => {
    expect(ciTopicToken("real-numbers")).toBe("REAL");
    expect(ciTopicToken("polynomials")).toBe("POLY");
    expect(ciTopicToken("ap")).toBe("AP");
  });
  it("is MIX when no single topic resolved (empty / non-alphabetic slug)", () => {
    expect(ciTopicToken("")).toBe("MIX");
    expect(ciTopicToken("123")).toBe("MIX");
  });
});

describe("checkImproveSequence — durable #NN per subject+topic-token (the printed-code semantics)", () => {
  const existing = [
    ciRecord({ id: "CI-M-REAL-01" }),
    ciRecord({ id: "CI-M-REAL-02" }),
    ciRecord({ id: "CI-M-POLY-01" }),
    ciRecord({ id: "CI-S-MIX-01", subject: "science", topicSource: "mixed" }),
  ];
  it("counts only the SAME subject+token prefix", () => {
    expect(checkImproveSequence(existing, "maths", "real-numbers")).toBe(3);
    expect(checkImproveSequence(existing, "maths", "polynomials")).toBe(2);
    expect(checkImproveSequence(existing, "science", "real-numbers")).toBe(1);
  });
  it("MIX sessions count within their own token, per subject", () => {
    expect(checkImproveSequence(existing, "science", "")).toBe(2);
    expect(checkImproveSequence(existing, "maths", "")).toBe(1);
  });
  it("ignores other surfaces — a chapter-test record never bumps a CI sequence", () => {
    const withCt = [...existing, record({ id: "CI-M-REAL-09", surface: "chapter-test" })];
    expect(checkImproveSequence(withCt, "maths", "real-numbers")).toBe(3);
  });
});

describe("checkImproveNomenclature — code + honest name", () => {
  it("builds CI-{S}-{TOK}-{NN} + a topic name for a resolved topic", () => {
    const n = checkImproveNomenclature("maths", "real-numbers", "Real Numbers", 3);
    expect(n.code).toBe("CI-M-REAL-03");
    expect(n.name).toBe("Real Numbers · Paper #3");
  });
  it("names a MIX session 'Uploaded paper' — never a guessed topic", () => {
    const n = checkImproveNomenclature("science", "", "", 1);
    expect(n.code).toBe("CI-S-MIX-01");
    expect(n.name).toBe("Uploaded paper · #1");
  });
});

describe("ensureCheckImproveSessionCode — honest-degrade, no device-local shadow counter", () => {
  it("falls back to sequence 1 when the durable read yields nothing (signed-out / offline)", async () => {
    const n = await ensureCheckImproveSessionCode("maths", "real-numbers", "Real Numbers", USER);
    expect(n.code).toBe("CI-M-REAL-01");
    expect(n.sequence).toBe(1);
  });
});

describe("buildCheckImproveSessionRecord — the §1 contract + the C&I honesty rules", () => {
  it("maps the record: id = code (idempotent), graded subtotal, provenance, ci: refs", () => {
    const rec = buildCheckImproveSessionRecord({
      code: "CI-M-REAL-03",
      title: "Real Numbers · Paper #3",
      subject: "maths",
      topicSlug: "real-numbers",
      topicSource: "confirmed",
      response: response(),
      uid: "u1",
    });
    expect(rec.id).toBe("CI-M-REAL-03");
    expect(rec.surface).toBe("check-improve");
    expect(rec.worksheetId).toBe("ci:CI-M-REAL-03");
    expect(rec.topicKeys).toEqual(["real-numbers"]);
    expect(rec.topicSource).toBe("confirmed");
    expect(rec.marksAwarded).toBe(2);
    expect(rec.marksTotal).toBe(4);
    expect(rec.status).toBe("partial"); // 1 pending page — honest, never a fake 0
    expect(rec.fourType).toEqual({ conceptual: 1, calculation: 1, silly: 0, presentation: 0 });
    expect(rec.sectionBreakdown).toBeNull();
    expect(rec.perQuestionRef).toBe("ci:CI-M-REAL-03");
    expect(rec.dedupKey).toBe("u1::CI-M-REAL-03");
  });

  it("questionIds is ALWAYS [] — an external upload has no bank identity; its concept is never fabricated (spec §8)", () => {
    const rec = buildCheckImproveSessionRecord({
      code: "CI-M-REAL-03",
      title: "t",
      subject: "maths",
      topicSlug: "real-numbers",
      topicSource: "inferred",
      response: response(),
      uid: "u1",
    });
    expect(rec.questionIds).toEqual([]);
  });

  it("a MIXED session writes topicKeys [] — NEVER a majority-guessed topic (spec §4.1)", () => {
    const rec = buildCheckImproveSessionRecord({
      code: "CI-M-MIX-01",
      title: "Uploaded paper · #1",
      subject: "maths",
      topicSlug: "",
      topicSource: "mixed",
      response: response(),
      uid: "u1",
    });
    expect(rec.topicKeys).toEqual([]);
    expect(rec.topicSource).toBe("mixed");
  });
});
