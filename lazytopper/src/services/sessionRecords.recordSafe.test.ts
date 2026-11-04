// @vitest-environment jsdom
/**
 * RECORD-SAFE-1 - (1) Chapter Test / Full Mock codes are unique per student (checked against the real
 * documents, not just the count the page loaded); (2) the grade-time write never replaces a record that
 * belongs to a DIFFERENT paper - the grade is saved under a fresh code instead. Persistence only: no
 * marks, no mistake types, no grader prompt is touched by this lane.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const h = vi.hoisted(() => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  store: new Map<string, any>(),
  readMode: "ok" as "ok" | "throw" | "cache",
  writeMode: "ok" as "ok" | "fail",
  deleted: [] as string[],
  sends: [] as string[],
}));

vi.mock("./firebaseClient", () => ({ firestoreDb: { __fake: true } }));
vi.mock("./studentProgressStore", () => ({ getActiveProgressUser: () => "u-rs1" }));
vi.mock("firebase/firestore", () => ({
  doc: (_db: unknown, ...segs: string[]) => ({ path: segs.join("/") }),
  collection: (_db: unknown, ...segs: string[]) => ({ path: segs.join("/") }),
  getDocs: async () => ({ docs: [] }),
  getDoc: async (ref: { path: string }) => {
    if (h.readMode === "throw") throw new Error("offline");
    return {
      exists: () => h.store.has(ref.path),
      data: () => h.store.get(ref.path),
      metadata: { fromCache: h.readMode === "cache" },
    };
  },
  deleteDoc: async (ref: { path: string }) => {
    h.deleted.push(ref.path);
    h.store.delete(ref.path);
  },
  setDoc: async (ref: { path: string }, data: Record<string, unknown>) => {
    h.sends.push(ref.path);
    if (h.writeMode === "fail") throw new Error("offline");
    h.store.set(ref.path, { ...data });
  },
}));

import {
  writeSessionRecord,
  writeSessionRecordResolved,
  writeSessionPerQuestion,
  mintUniqueChapterTestNomenclature,
  mintUniqueFullMockNomenclature,
  recordsAreSamePaper,
  onRecordRelocated,
  loadLocalSessionRecords,
  RecordCodeCheckError,
  type SessionRecord,
  type SessionPerQuestionPayload,
} from "./sessionRecords";
import { __resetOutboxForTests, drainOutbox, getSaveStatus, readOutbox } from "./sessionRecordsOutbox";
import { deleteChapterTestPaper } from "./chapterTestPaperStore";
import { writeChapterTestPartialRecord } from "./chapterTestGradeService";

const UID = "u-rs1";
const user = { uid: UID, isLocalSession: false } as never;
const recPath = (id: string) => `sessionRecords/${UID}/records/${id}`;
const flush = async () => {
  for (let i = 0; i < 12; i++) await Promise.resolve();
};

function rec(over: Partial<SessionRecord> = {}): SessionRecord {
  return {
    id: "WS-M-MIX-02",
    worksheetId: "ws-new",
    surface: "worksheet",
    title: "Board exam mix",
    subject: "maths",
    topicKeys: ["real-numbers"],
    questionIds: ["q1", "q2"],
    marksAwarded: 4,
    marksTotal: 5,
    status: "graded",
    fourType: { conceptual: 0, calculation: 1, silly: 0, presentation: 0 },
    sectionBreakdown: null,
    gradedAt: 2000,
    perQuestionRef: "ws:WS-M-MIX-02",
    dedupKey: `${UID}::WS-M-MIX-02`,
    ...over,
  };
}

beforeEach(() => {
  h.store.clear();
  h.sends.length = 0;
  h.readMode = "ok";
  h.writeMode = "ok";
  h.deleted.length = 0;
  localStorage.clear();
  __resetOutboxForTests();
});
afterEach(() => {
  __resetOutboxForTests();
  vi.restoreAllMocks();
});

describe("RECORD-SAFE-1 - Chapter Test / Full Mock codes are unique per student", () => {
  it("a Chapter Test code that a stored record already holds is skipped (the page's loaded list did not have it)", async () => {
    h.store.set(recPath("CT-M-RN-01"), rec({ id: "CT-M-RN-01", surface: "chapter-test", worksheetId: "ct-old" }));
    const nm = await mintUniqueChapterTestNomenclature("maths", "real-numbers", "Real Numbers", [], user);
    expect(nm.code).toBe("CT-M-RN-02");
    expect(nm.sequence).toBe(2);
    expect(nm.name).toBe("Real Numbers · Test #2");
  });

  it("a Chapter Test code held only by a saved paper is skipped too, and several taken codes are walked past", async () => {
    h.store.set(recPath("CT-M-RN-01"), rec({ id: "CT-M-RN-01", worksheetId: "a" }));
    h.store.set(`sessionRecords/${UID}/chapterTestPapers/CT-M-RN-02`, { code: "CT-M-RN-02" });
    const nm = await mintUniqueChapterTestNomenclature("maths", "real-numbers", "Real Numbers", [], user);
    expect(nm.code).toBe("CT-M-RN-03");
  });

  it("unknown (read fails, or only a cache answer) -> no code is minted", async () => {
    h.readMode = "throw";
    await expect(
      mintUniqueChapterTestNomenclature("maths", "real-numbers", "Real Numbers", [], user, { retryDelayMs: 0 }),
    ).rejects.toBeInstanceOf(RecordCodeCheckError);
    h.readMode = "cache";
    await expect(
      mintUniqueChapterTestNomenclature("maths", "real-numbers", "Real Numbers", [], user, { retryDelayMs: 0 }),
    ).rejects.toBeInstanceOf(RecordCodeCheckError);
  });

  it("a Full Mock code that a stored record already holds is skipped; unknown mints nothing", async () => {
    h.store.set(recPath("FM-S-01"), rec({ id: "FM-S-01", surface: "full-mock", subject: "science", worksheetId: "fm-old" }));
    const nm = await mintUniqueFullMockNomenclature("science", [], user);
    expect(nm.code).toBe("FM-S-02");
    h.readMode = "throw";
    await expect(mintUniqueFullMockNomenclature("science", [], user, { retryDelayMs: 0 })).rejects.toBeInstanceOf(RecordCodeCheckError);
  });

  it("with nothing taken the code is the count-based one it always was (existing behaviour unchanged)", async () => {
    const ct = await mintUniqueChapterTestNomenclature("maths", "real-numbers", "Real Numbers", [], user);
    expect(ct.code).toBe("CT-M-RN-01");
    const fm = await mintUniqueFullMockNomenclature("maths", [], user);
    expect(fm.code).toBe("FM-M-01");
  });

  it("signed out: no cloud account, nothing to collide with - the count-based code, no read", async () => {
    h.readMode = "throw";
    const nm = await mintUniqueFullMockNomenclature("maths", [], null);
    expect(nm.code).toBe("FM-M-01");
  });
});

describe("RECORD-SAFE-1 - recordsAreSamePaper", () => {
  it("same id -> same paper; different id -> different; identity-less with content -> different; identity-less empty husk -> replaceable", () => {
    expect(recordsAreSamePaper(undefined, { worksheetId: "a" })).toBe(true);
    expect(recordsAreSamePaper({ worksheetId: "a" }, { worksheetId: "a" })).toBe(true);
    expect(recordsAreSamePaper({ worksheetId: "a" }, { worksheetId: "b" })).toBe(false);
    expect(recordsAreSamePaper({ status: "graded", marksTotal: 5 } as never, { worksheetId: "b" })).toBe(false);
    expect(recordsAreSamePaper({ questionIds: ["q1"] } as never, { worksheetId: "b" })).toBe(false);
    expect(recordsAreSamePaper({} as never, { worksheetId: "b" })).toBe(true);
    expect(recordsAreSamePaper({ worksheetId: "a" }, { worksheetId: "" })).toBe(false);
  });
});

describe("RECORD-SAFE-1 - a grade never overwrites a different paper's record", () => {
  it("the owner's case: WS-M-MIX-02 already holds another worksheet -> the new grade is saved under WS-M-MIX-03, the old record is untouched", async () => {
    const old = rec({ worksheetId: "ws-july", marksAwarded: 3, gradedAt: 1000 });
    h.store.set(recPath("WS-M-MIX-02"), old as unknown as Record<string, unknown>);
    const moved: Array<[string, string]> = [];
    const off = onRecordRelocated((a, b) => moved.push([a, b]));
    writeSessionRecord(user, rec({ worksheetId: "ws-new", marksAwarded: 4 }));
    await flush();
    off();
    expect(h.store.get(recPath("WS-M-MIX-02"))).toEqual(old); // the July paper is exactly as it was
    expect(h.store.get(recPath("WS-M-MIX-03"))).toMatchObject({
      id: "WS-M-MIX-03",
      worksheetId: "ws-new",
      marksAwarded: 4,
      perQuestionRef: "ws:WS-M-MIX-03",
      dedupKey: `${UID}::WS-M-MIX-03`,
    });
    expect(moved).toEqual([["WS-M-MIX-02", "WS-M-MIX-03"]]);
    // the device list agrees: the new grade is under the new code, nothing under the old id for the new paper
    const local = loadLocalSessionRecords(UID);
    expect(local.find((r) => r.worksheetId === "ws-new")?.id).toBe("WS-M-MIX-03");
    expect(local.filter((r) => r.id === "WS-M-MIX-02" && r.worksheetId === "ws-new")).toHaveLength(0);
  });

  it("walks past several taken codes", async () => {
    h.store.set(recPath("CT-M-RN-01"), rec({ id: "CT-M-RN-01", worksheetId: "x" }));
    h.store.set(recPath("CT-M-RN-02"), rec({ id: "CT-M-RN-02", worksheetId: "y" }));
    writeSessionRecord(user, rec({ id: "CT-M-RN-01", surface: "chapter-test", worksheetId: "z", perQuestionRef: "ct:CT-M-RN-01" }));
    await flush();
    expect(h.store.get(recPath("CT-M-RN-03"))).toMatchObject({ worksheetId: "z", perQuestionRef: "ct:CT-M-RN-03" });
  });

  it("the SAME paper re-graded still updates its record in place (no relocation)", async () => {
    h.store.set(recPath("WS-M-MIX-02"), rec({ worksheetId: "ws-new", status: "partial", marksAwarded: 1 }));
    writeSessionRecord(user, rec({ worksheetId: "ws-new", status: "graded", marksAwarded: 5 }));
    await flush();
    expect(h.store.get(recPath("WS-M-MIX-02"))).toMatchObject({ worksheetId: "ws-new", status: "graded", marksAwarded: 5 });
    expect(h.store.has(recPath("WS-M-MIX-03"))).toBe(false);
  });

  it("an existing record with NO identity field but graded content counts as a different paper, never as free", async () => {
    const husk = { id: "WS-M-MIX-02", status: "graded", marksAwarded: 3, marksTotal: 5, questionIds: ["a"] };
    h.store.set(recPath("WS-M-MIX-02"), husk);
    writeSessionRecord(user, rec({ worksheetId: "ws-new" }));
    await flush();
    expect(h.store.get(recPath("WS-M-MIX-02"))).toEqual(husk);
    expect(h.store.get(recPath("WS-M-MIX-03"))).toMatchObject({ worksheetId: "ws-new" });
  });

  it("a read it cannot trust (error / cache-only) writes NOTHING - the outbox retries; it never writes blind", async () => {
    h.readMode = "throw";
    writeSessionRecord(user, rec());
    await flush();
    expect(h.sends).toEqual([]);
    __resetOutboxForTests();
    h.readMode = "cache";
    writeSessionRecord(user, rec());
    await flush();
    expect(h.sends).toEqual([]);
  });

  it("a fresh id with nothing under it is written as before", async () => {
    writeSessionRecord(user, rec({ id: "FM-M-01", surface: "full-mock", perQuestionRef: "fm:FM-M-01" }));
    await flush();
    expect(h.sends).toEqual([recPath("FM-M-01")]);
  });

  it("the per-question payload follows its record to the fresh code and never replaces the old paper's payload", async () => {
    h.store.set(recPath("WS-M-MIX-02"), rec({ worksheetId: "ws-july" }) as unknown as Record<string, unknown>);
    const oldPayload = { ref: "ws:WS-M-MIX-02", code: "WS-M-MIX-02", worksheetId: "ws-july", surface: "worksheet", gradedAt: 1000 };
    h.store.set(`sessionRecords/${UID}/perQuestion/ws:WS-M-MIX-02`, oldPayload as Record<string, unknown>);
    writeSessionRecord(user, rec({ worksheetId: "ws-new" }));
    writeSessionPerQuestion(user, {
      ref: "ws:WS-M-MIX-02",
      code: "WS-M-MIX-02",
      worksheetId: "ws-new",
      surface: "worksheet",
      gradedAt: 2000,
      response: { ok: true } as never,
    } as SessionPerQuestionPayload);
    await flush();
    expect(h.store.get(`sessionRecords/${UID}/perQuestion/ws:WS-M-MIX-02`)).toEqual(oldPayload);
    expect(h.store.get(`sessionRecords/${UID}/perQuestion/ws:WS-M-MIX-03`)).toMatchObject({ worksheetId: "ws-new", code: "WS-M-MIX-03" });
  });
});


// ── RECORD-SAFE-1 review round: resolve the FINAL code once; record AND payload land under it ──────────────────
const mirrorKey = `lazytopper.user.${UID}.sessionRecords.v1`;
const payloadKey = `lazytopper.user.${UID}.sessionPerQuestion.v1`;
const payloadPath = (ref: string) => `sessionRecords/${UID}/perQuestion/${ref}`;
function seedJuly() {
  const july = rec({ worksheetId: "ws-july", marksAwarded: 3, gradedAt: 1000 });
  const julyPayload = { ref: "ws:WS-M-MIX-02", code: "WS-M-MIX-02", worksheetId: "ws-july", surface: "worksheet", gradedAt: 1000, response: { ok: true, july: true } };
  h.store.set(recPath("WS-M-MIX-02"), july);
  h.store.set(payloadPath("ws:WS-M-MIX-02"), julyPayload);
  localStorage.setItem(mirrorKey, JSON.stringify([july]));
  localStorage.setItem(payloadKey, JSON.stringify({ "ws:WS-M-MIX-02": julyPayload }));
  return { july, julyPayload, localRecord: localStorage.getItem(mirrorKey)!, localPayloads: localStorage.getItem(payloadKey)! };
}
const newPayload = (code: string, ref: string): SessionPerQuestionPayload =>
  ({ ref, code, worksheetId: "ws-new", surface: "worksheet", gradedAt: 2000, response: { ok: true, fresh: true } as never }) as SessionPerQuestionPayload;

describe("RECORD-SAFE-1 - the July case with a SEEDED MIRROR: record and payload land under the new code", () => {
  it("writeSessionRecordResolved returns the new code; record AND perQuestion land there; the July paper is byte-identical (cloud + device)", async () => {
    const seed = seedJuly();
    const out = await writeSessionRecordResolved(user, rec({ worksheetId: "ws-new" }));
    expect(out.code).toBe("WS-M-MIX-03");
    expect(out.resolved).toBe(true);
    writeSessionPerQuestion(user, newPayload(out.code, out.record.perQuestionRef));
    await flush();
    expect(h.store.get(recPath("WS-M-MIX-03"))).toMatchObject({ worksheetId: "ws-new", id: "WS-M-MIX-03", perQuestionRef: "ws:WS-M-MIX-03" });
    expect(h.store.get(payloadPath("ws:WS-M-MIX-03"))).toMatchObject({ worksheetId: "ws-new", code: "WS-M-MIX-03" });
    expect(h.store.get(recPath("WS-M-MIX-02"))).toEqual(seed.july);
    expect(h.store.get(payloadPath("ws:WS-M-MIX-02"))).toEqual(seed.julyPayload);
    const localPayloads = JSON.parse(localStorage.getItem(payloadKey)!) as Record<string, { worksheetId: string }>;
    expect(localPayloads["ws:WS-M-MIX-02"]).toEqual(seed.julyPayload); // the July paper's device copy is untouched
    expect(localPayloads["ws:WS-M-MIX-03"].worksheetId).toBe("ws-new");
    const local = loadLocalSessionRecords(UID);
    expect(local.find((r) => r.id === "WS-M-MIX-02")).toEqual(seed.july);
    expect(local.find((r) => r.id === "WS-M-MIX-03")?.worksheetId).toBe("ws-new");
    expect(getSaveStatus().phase).not.toBe("failed");
  });

  it("a caller that still holds the OLD code (writeSessionRecord + payload on the old ref) is redirected too - the other paper's payload is never touched", async () => {
    const seed = seedJuly();
    writeSessionRecord(user, rec({ worksheetId: "ws-new" })); // mirror-detected relocation
    writeSessionPerQuestion(user, newPayload("WS-M-MIX-02", "ws:WS-M-MIX-02")); // old ref, as before
    await flush();
    expect(h.store.get(payloadPath("ws:WS-M-MIX-02"))).toEqual(seed.julyPayload);
    expect(h.store.get(payloadPath("ws:WS-M-MIX-03"))).toMatchObject({ worksheetId: "ws-new" });
    expect(JSON.parse(localStorage.getItem(payloadKey)!)["ws:WS-M-MIX-02"]).toEqual(seed.julyPayload);
  });

  it("an unreadable check writes nothing blind: the record is queued (mirror + outbox entry) under the requested code, resolved=false", async () => {
    h.readMode = "throw";
    const out = await writeSessionRecordResolved(user, rec({ worksheetId: "ws-new" }), { retryDelayMs: 0 });
    await flush();
    expect(out.resolved).toBe(false);
    expect(out.code).toBe("WS-M-MIX-02");
    expect(h.sends).toEqual([]);
    expect(readOutbox(UID).map((e) => `${e.kind}:${e.id}`)).toEqual(["record:WS-M-MIX-02"]);
    expect(loadLocalSessionRecords(UID)).toHaveLength(1);
  });

  it("the partial writers return the resolved code (what the page adopts)", async () => {
    seedJuly();
    h.store.set(recPath("CT-M-RN-01"), rec({ id: "CT-M-RN-01", surface: "chapter-test", worksheetId: "ct-other" }));
    const paper = { worksheetId: "ct-mine", createdAt: "x", title: "T", subject: "Maths", grade: "10", sectionFilter: "All", totalMarks: 1, questions: [] } as never;
    const response = { ok: true, results: [], totalQuestions: 0, gradedCount: 1, pendingCount: 1, gradedMarksAwarded: 0, gradedMarksTotal: 0, worksheetTotalMarks: 0 } as never;
    const code = await writeChapterTestPartialRecord({ user, paper, code: "CT-M-RN-01", subject: "maths", topicKey: "real-numbers", response });
    expect(code).toBe("CT-M-RN-02");
    expect(h.store.get(recPath("CT-M-RN-01"))).toMatchObject({ worksheetId: "ct-other" });
  });
});

describe("RECORD-SAFE-1 - resend and failure", () => {
  it("offline at first (cloud collision, nothing landed): the re-send after reload lands the record AND the payload under the NEW code", async () => {
    vi.useFakeTimers();
    try {
      const seed = seedJuly();
      localStorage.removeItem(mirrorKey); // the collision is only in the cloud: found at send time
      localStorage.removeItem(payloadKey);
      h.writeMode = "fail";
      writeSessionRecord(user, rec({ worksheetId: "ws-new" }));
      writeSessionPerQuestion(user, newPayload("WS-M-MIX-02", "ws:WS-M-MIX-02"));
      await vi.advanceTimersByTimeAsync(50);
      expect(readOutbox(UID).length).toBe(2); // both queued before any send
      __resetOutboxForTests(); // "reload"
      h.writeMode = "ok";
      await drainOutbox(UID);
      await vi.advanceTimersByTimeAsync(20000);
      expect(h.store.get(recPath("WS-M-MIX-03"))).toMatchObject({ worksheetId: "ws-new" });
      expect(h.store.get(payloadPath("ws:WS-M-MIX-03"))).toMatchObject({ worksheetId: "ws-new", code: "WS-M-MIX-03" });
      expect(h.store.get(recPath("WS-M-MIX-02"))).toEqual(seed.july);
      expect(h.store.get(payloadPath("ws:WS-M-MIX-02"))).toEqual(seed.julyPayload);
      expect(readOutbox(UID)).toEqual([]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("the record write fails for good: the payload settles FAILED too (not stuck 'saving'), and nothing is written over the other paper", async () => {
    vi.useFakeTimers();
    try {
      const seed = seedJuly();
      h.writeMode = "fail";
      writeSessionRecord(user, rec({ worksheetId: "ws-new" }));
      writeSessionPerQuestion(user, newPayload("WS-M-MIX-02", "ws:WS-M-MIX-02"));
      await vi.advanceTimersByTimeAsync(120000);
      expect(getSaveStatus().phase).not.toBe("saving");
      expect(getSaveStatus().phase).not.toBe("saved");
      expect(h.store.get(payloadPath("ws:WS-M-MIX-02"))).toEqual(seed.julyPayload);
      expect(h.store.get(recPath("WS-M-MIX-02"))).toEqual(seed.july);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("RECORD-SAFE-1 - a paper's cleanup touches only its own saved copy", () => {
  it("deleteChapterTestPaper(code, worksheetId) leaves a DIFFERENT paper saved under that code alone (device + server)", async () => {
    const other = { code: "CT-M-RN-02", name: "n", subject: "Maths", topicKey: "real-numbers", paper: { worksheetId: "ct-other", questions: [] }, objective: { results: [], awarded: 0, total: 0, answeredCount: 0, totalQuestions: 0 }, savedAt: 1 };
    h.store.set(`sessionRecords/${UID}/chapterTestPapers/CT-M-RN-02`, other);
    localStorage.setItem(`lazytopper.ct.papers.v1.${UID}`, JSON.stringify([other]));
    deleteChapterTestPaper(user, "CT-M-RN-02", "ct-mine");
    await flush();
    expect(h.store.get(`sessionRecords/${UID}/chapterTestPapers/CT-M-RN-02`)).toEqual(other);
    expect(JSON.parse(localStorage.getItem(`lazytopper.ct.papers.v1.${UID}`)!)).toHaveLength(1);
    deleteChapterTestPaper(user, "CT-M-RN-02", "ct-other"); // its own: deleted
    await flush();
    expect(h.store.has(`sessionRecords/${UID}/chapterTestPapers/CT-M-RN-02`)).toBe(false);
    expect(JSON.parse(localStorage.getItem(`lazytopper.ct.papers.v1.${UID}`)!)).toHaveLength(0);
  });
});
