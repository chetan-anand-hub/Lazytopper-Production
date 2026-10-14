// @vitest-environment jsdom
/**
 * SAVE-SYNC-1 (D190) — a graded result is never silently lost.
 *
 * The fake Firestore below can ACCEPT, REJECT (network down) or HANG (the tab closes before the
 * write settles). What is proved, against the real `sessionRecords.ts` writers:
 *   (a) the outbox entry is written BEFORE the first send, and settled on success;
 *   (b) a rejected write is retried (1 s, 3 s, 8 s), then kept; the status says "device-only";
 *   (c) the next load (and the `online` event) re-sends it: same doc id, full replace, original
 *       `updatedAt`; the status reaches "saved";
 *   (d) the "tab closed mid-save" simulation: the write never settles, the outbox entry survives
 *       the reload and is re-sent;
 *   (e) no double write: a drain never re-sends an id with a live attempt chain, nor twice;
 *   (f) an older local copy never overwrites a newer cloud copy;
 *   (g) signed-out / local / anonymous users never touch the outbox (existing skip outcomes);
 *   (h) `beforeunload` is armed only while a write is pending;
 *   (i) CONTROL: with the drain switched off (trunk behaviour) the lost record STAYS lost.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const h = vi.hoisted(() => ({
  store: new Map<string, Record<string, unknown>>(),
  mode: "ok" as "ok" | "fail" | "hang",
  sends: [] as string[],
}));

vi.mock("./firebaseClient", () => ({ firestoreDb: { __fake: true } }));
vi.mock("./studentProgressStore", () => ({ getActiveProgressUser: () => "u-ss1" }));
vi.mock("firebase/firestore", () => ({
  doc: (_db: unknown, ...segs: string[]) => ({ path: segs.join("/") }),
  collection: (_db: unknown, ...segs: string[]) => ({ path: segs.join("/") }),
  getDocs: async () => ({ docs: [] }),
  getDoc: async (ref: { path: string }) => ({ exists: () => h.store.has(ref.path), data: () => h.store.get(ref.path) }),
  setDoc: (ref: { path: string }, data: Record<string, unknown>) => {
    h.sends.push(ref.path);
    if (h.mode === "fail") return Promise.reject(new Error("offline"));
    if (h.mode === "hang") return new Promise<void>(() => {});
    h.store.set(ref.path, { ...data });
    return Promise.resolve();
  },
}));

import {
  writeSessionRecord,
  writeSessionPerQuestion,
  type SessionRecord,
  type SessionPerQuestionPayload,
} from "./sessionRecords";
import {
  RETRY_DELAYS_MS,
  __resetOutboxForTests,
  drainOutbox,
  getSaveStatus,
  readOutbox,
  startOutboxSync,
} from "./sessionRecordsOutbox";

// the owner-visible schedule, written out here as a literal so the source cannot move it silently
const EXPECTED_DELAYS = [1000, 3000, 8000];
const UID = "u-ss1";
const user = { uid: UID, isLocalSession: false } as never;
const REC_PATH = `sessionRecords/${UID}/records/CT-M-REAL-01`;

const rec: SessionRecord = {
  id: "CT-M-REAL-01",
  worksheetId: "ct:CT-M-REAL-01",
  surface: "chapter-test",
  title: "Real Numbers",
  subject: "maths",
  topicKeys: ["real-numbers"],
  questionIds: [],
  marksAwarded: 7,
  marksTotal: 10,
  status: "graded",
  fourType: { conceptual: 1, calculation: 0, silly: 0, presentation: 0 },
  sectionBreakdown: null,
  gradedAt: 1000,
  perQuestionRef: "ct:CT-M-REAL-01",
  dedupKey: `${UID}::CT-M-REAL-01`,
};
const payload = { ref: "ct:CT-M-REAL-01", gradedAt: 1000 } as unknown as SessionPerQuestionPayload;

const flush = async () => {
  for (let i = 0; i < 6; i++) await Promise.resolve();
};

beforeEach(() => {
  h.store.clear();
  h.sends.length = 0;
  h.mode = "ok";
  localStorage.clear();
  __resetOutboxForTests();
  vi.useFakeTimers();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("SAVE-SYNC-1 — the outbox", () => {
  it("(a) the entry exists BEFORE the first send settles, and is cleared on success; status saving → saved", async () => {
    h.mode = "hang";
    writeSessionRecord(user, rec);
    expect(readOutbox(UID).map((e) => `${e.kind}:${e.id}`)).toEqual(["record:CT-M-REAL-01"]);
    expect(getSaveStatus().phase).toBe("saving");
    expect(h.sends).toEqual([REC_PATH]); // the first attempt is synchronous, as before

    __resetOutboxForTests();
    localStorage.clear();
    h.mode = "ok";
    writeSessionRecord(user, rec);
    await flush();
    expect(h.store.get(REC_PATH)?.id).toBe("CT-M-REAL-01");
    expect(readOutbox(UID)).toEqual([]);
    expect(getSaveStatus().phase).toBe("saved");
  });

  it("(b)(c) a rejected write retries 1 s / 3 s / 8 s, is kept, says device-only; `online` re-sends it with the ORIGINAL updatedAt", async () => {
    expect([...RETRY_DELAYS_MS]).toEqual(EXPECTED_DELAYS);
    h.mode = "fail";
    writeSessionRecord(user, rec);
    const queuedAt = readOutbox(UID)[0].queuedAt;
    await flush();
    expect(h.sends).toHaveLength(1);
    for (const [i, delay] of EXPECTED_DELAYS.entries()) {
      await vi.advanceTimersByTimeAsync(delay);
      await flush();
      expect(h.sends).toHaveLength(2 + i);
    }
    expect(h.sends).toHaveLength(1 + EXPECTED_DELAYS.length);
    expect(readOutbox(UID)).toHaveLength(1); // kept
    expect(getSaveStatus().phase).toBe("device-only");
    expect(h.store.size).toBe(0);

    // connectivity returns
    h.mode = "ok";
    const stop = startOutboxSync(UID);
    await flush();
    await vi.advanceTimersByTimeAsync(0);
    expect(h.store.get(REC_PATH)).toMatchObject({ id: "CT-M-REAL-01", updatedAt: queuedAt });
    expect(readOutbox(UID)).toEqual([]);
    expect(getSaveStatus().phase).toBe("saved");

    // and a later `online` with an empty outbox sends nothing
    const n = h.sends.length;
    window.dispatchEvent(new Event("online"));
    await flush();
    expect(h.sends.length).toBe(n);
    stop();
  });

  it("(c) the `online` event alone re-sends (no reload needed)", async () => {
    h.mode = "fail";
    writeSessionRecord(user, rec);
    await vi.advanceTimersByTimeAsync(20000);
    await flush();
    expect(getSaveStatus().phase).toBe("device-only");
    const stop = startOutboxSync(UID); // armed while still offline: its first drain fails too
    await flush();
    await vi.advanceTimersByTimeAsync(20000);
    h.mode = "ok";
    window.dispatchEvent(new Event("online"));
    await flush();
    await vi.advanceTimersByTimeAsync(0);
    expect(h.store.has(REC_PATH)).toBe(true);
    expect(readOutbox(UID)).toEqual([]);
    stop();
  });

  it("(d) tab closed mid-save: the write never settles; after the reload the entry is found and re-sent", async () => {
    h.mode = "hang";
    writeSessionRecord(user, rec);
    writeSessionPerQuestion(user, payload);
    await flush();
    expect(h.store.size).toBe(0);
    expect(readOutbox(UID)).toHaveLength(2);

    // ── reload: all in-memory state gone, localStorage survives ──
    __resetOutboxForTests();
    h.mode = "ok";
    expect(h.store.size).toBe(0); // CONTROL: before the drain the cloud has nothing (trunk behaviour stops here)
    const stop = startOutboxSync(UID);
    await flush();
    await vi.advanceTimersByTimeAsync(0);
    await flush();
    const keys = [...h.store.keys()];
    expect(keys).toHaveLength(2);
    expect(keys).toContain(REC_PATH);
    expect(keys.some((k) => k.startsWith(`sessionRecords/${UID}/perQuestion/`))).toBe(true);
    expect(readOutbox(UID)).toEqual([]);
    stop();
  });

  it("(e) no double write: a drain skips an id with a live attempt chain, and two drains send once", async () => {
    h.mode = "hang";
    writeSessionRecord(user, rec);
    const before = h.sends.length;
    await drainOutbox(UID); // the chain is live → nothing re-sent
    await flush();
    expect(h.sends.length).toBe(before);

    __resetOutboxForTests();
    h.mode = "ok";
    h.sends.length = 0;
    await Promise.all([drainOutbox(UID), drainOutbox(UID)]);
    await flush();
    await vi.advanceTimersByTimeAsync(0);
    expect(h.sends.filter((p) => p === REC_PATH)).toHaveLength(1);
  });

  it("(e2) a newer write for the same id supersedes the older chain (the older one's failure cannot clear or re-queue it)", async () => {
    h.mode = "fail";
    writeSessionRecord(user, rec);
    h.mode = "ok";
    writeSessionRecord(user, { ...rec, marksAwarded: 9, gradedAt: 2000 });
    await flush();
    await vi.advanceTimersByTimeAsync(20000);
    await flush();
    expect(h.store.get(REC_PATH)).toMatchObject({ marksAwarded: 9 });
    expect(readOutbox(UID)).toEqual([]);
  });

  it("(f) an older local copy never overwrites a newer cloud copy; the entry is settled", async () => {
    h.mode = "hang";
    writeSessionRecord(user, rec);
    const queuedAt = readOutbox(UID)[0].queuedAt;
    h.store.set(REC_PATH, { id: "CT-M-REAL-01", marksAwarded: 10, updatedAt: new Date(Date.parse(queuedAt) + 60_000).toISOString() });
    __resetOutboxForTests();
    h.mode = "ok";
    h.sends.length = 0;
    await drainOutbox(UID);
    await flush();
    await vi.advanceTimersByTimeAsync(0);
    expect(h.sends).toEqual([]); // not even a write
    expect(h.store.get(REC_PATH)).toMatchObject({ marksAwarded: 10 });
    expect(readOutbox(UID)).toEqual([]);
  });

  it("(g) signed-out, local and anonymous sessions never touch the outbox or the cloud", async () => {
    expect(writeSessionRecord(null, rec)).toBe("skipped-no-user");
    expect(writeSessionRecord({ uid: "x", isLocalSession: true } as never, rec)).toBe("skipped-local");
    writeSessionRecord({ uid: "anonymous", isLocalSession: false } as never, rec);
    writeSessionPerQuestion({ uid: "x", isLocalSession: true } as never, payload);
    await flush();
    expect(h.sends).toEqual([]);
    expect(readOutbox("x")).toEqual([]);
    expect(readOutbox("anonymous")).toEqual([]);
    expect(getSaveStatus().phase).toBe("idle");
  });

  it("(h) beforeunload is armed ONLY while a write is pending", async () => {
    const ask = () => {
      const e = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(e);
      return e.defaultPrevented;
    };
    expect(ask()).toBe(false);
    h.mode = "hang";
    writeSessionRecord(user, rec);
    expect(ask()).toBe(true);
    __resetOutboxForTests();
    expect(ask()).toBe(false);
    h.mode = "ok";
    writeSessionRecord(user, rec);
    await flush();
    expect(ask()).toBe(false);
    // a failed chain is not "pending": the student may leave freely, the outbox covers it
    h.mode = "fail";
    writeSessionRecord(user, { ...rec, id: "CT-M-REAL-02", worksheetId: "ct:CT-M-REAL-02" });
    expect(ask()).toBe(true);
    await vi.advanceTimersByTimeAsync(20000);
    await flush();
    expect(ask()).toBe(false);
  });

  it("(i) CONTROL: with the drain switched off (trunk behaviour) the record that missed the cloud stays missing", async () => {
    h.mode = "fail";
    writeSessionRecord(user, rec);
    await vi.advanceTimersByTimeAsync(20000);
    await flush();
    h.mode = "ok";
    // trunk: nothing ever re-sends a local-only record — no startOutboxSync, no `online` listener
    window.dispatchEvent(new Event("online"));
    await flush();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(h.store.size).toBe(0);
    // ...and the same scenario WITH the sync is what (b)(c) prove lands.
    const stop = startOutboxSync(UID);
    await flush();
    await vi.advanceTimersByTimeAsync(0);
    expect(h.store.has(REC_PATH)).toBe(true);
    stop();
  });
});
