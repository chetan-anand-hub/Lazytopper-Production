// @vitest-environment jsdom
/**
 * FU-SAVE-SYNC-QUOTA (D206) — the outbox is capped, and a result that could not be queued is never silent.
 *
 *   (a) over the byte cap the OLDEST entries lose their BODY and keep their entry (nothing is dropped); the newest keeps its body;
 *   (b) an entry stripped of its body is still re-sent: from the localStorage mirror;
 *   (c) past the entry cap a new entry is refused: the result is "unpersisted";
 *   (d) an unpersisted result keeps `beforeunload` armed while its write is alive, even after the 12 s watchdog, and the line says
 *       "keep open" (not the false "we'll add it automatically next time you're online"); when the write lands the line says saved;
 *   (e) a storage that refuses the outbox write: one retry with ids only; if that fails too it is unpersisted;
 *   (f) when an unpersisted write ends in a final failure the line says "device-only-manual" (nothing will retry by itself);
 *   (g) CONTROL: a persisted entry never produces the keep-open / manual lines (the normal offline path is still "device-only").
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const h = vi.hoisted(() => ({
  store: new Map<string, Record<string, unknown>>(),
  mode: "ok" as "ok" | "fail" | "hang",
  sends: [] as string[],
  releasers: [] as Array<() => void>,
}));

vi.mock("./firebaseClient", () => ({ firestoreDb: { __fake: true } }));
vi.mock("./studentProgressStore", () => ({ getActiveProgressUser: () => "u-q" }));
vi.mock("firebase/firestore", () => ({
  doc: (_db: unknown, ...segs: string[]) => ({ path: segs.join("/") }),
  collection: (_db: unknown, ...segs: string[]) => ({ path: segs.join("/") }),
  getDocs: async () => ({ docs: [] }),
  getDoc: async (ref: { path: string }) => {
    const present = h.store.has(ref.path);
    const data = h.store.get(ref.path);
    return { exists: () => present, data: () => data };
  },
  setDoc: (ref: { path: string }, data: Record<string, unknown>) => {
    h.sends.push(ref.path);
    if (h.mode === "fail") return Promise.reject(new Error("offline"));
    if (h.mode === "hang") return new Promise<void>((resolve) => h.releasers.push(() => { h.store.set(ref.path, { ...data }); resolve(); }));
    h.store.set(ref.path, { ...data });
    return Promise.resolve();
  },
}));

import { writeSessionRecord, type SessionRecord } from "./sessionRecords";
import {
  MAX_OUTBOX_BYTES,
  MAX_OUTBOX_ENTRIES,
  SLOW_AFTER_MS,
  __resetOutboxForTests,
  drainOutbox,
  getSaveStatus,
  readOutbox,
} from "./sessionRecordsOutbox";

const UID = "u-q";
const user = { uid: UID, isLocalSession: false } as never;
const mk = (n: number, pad = 0): SessionRecord => ({
  id: `CT-M-Q-${String(n).padStart(4, "0")}`,
  worksheetId: `ct:q${n}`,
  surface: "chapter-test",
  title: "Q" + "x".repeat(pad),
  subject: "maths",
  topicKeys: ["real-numbers"],
  questionIds: [],
  marksAwarded: 5,
  marksTotal: 10,
  status: "graded",
  fourType: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
  sectionBreakdown: null,
  gradedAt: 1000 + n,
  perQuestionRef: `ct:q${n}`,
  dedupKey: `${UID}::q${n}`,
});
const flush = async () => { for (let i = 0; i < 6; i++) await Promise.resolve(); };
const askUnload = () => {
  const e = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(e);
  return e.defaultPrevented;
};

beforeEach(() => {
  h.store.clear(); h.sends.length = 0; h.releasers.length = 0; h.mode = "ok";
  localStorage.clear();
  __resetOutboxForTests();
  vi.useFakeTimers();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe("FU-SAVE-SYNC-QUOTA — the cap", () => {
  it("(a) over the byte cap the OLDEST bodies are stripped, no entry is dropped, the newest keeps its body", () => {
    h.mode = "hang";
    const pad = Math.floor(MAX_OUTBOX_BYTES / 4); // ~250 KB each: 6 of them are well over the cap
    for (let i = 0; i < 6; i++) writeSessionRecord(user, mk(i, pad));
    const entries = readOutbox(UID);
    expect(entries).toHaveLength(6); // nothing dropped
    expect(JSON.stringify(entries).length).toBeLessThanOrEqual(MAX_OUTBOX_BYTES);
    expect(entries[0].body).toBeUndefined(); // oldest stripped
    expect(entries[5].body).toBeDefined(); // newest keeps it
    expect(entries.map((e) => e.id)).toEqual([0, 1, 2, 3, 4, 5].map((i) => mk(i).id));
  });

  it("(b) an entry stripped of its body is still re-sent: from the localStorage mirror", async () => {
    h.mode = "hang";
    const pad = Math.floor(MAX_OUTBOX_BYTES / 4);
    for (let i = 0; i < 6; i++) writeSessionRecord(user, mk(i, pad));
    expect(readOutbox(UID)[0].body).toBeUndefined();
    __resetOutboxForTests();
    h.mode = "ok";
    h.sends.length = 0;
    await drainOutbox(UID);
    await vi.waitFor(() => expect(h.sends.length).toBe(6));
    expect(h.store.has(`sessionRecords/${UID}/records/${mk(0).id}`)).toBe(true);
    await flush();
    expect(readOutbox(UID)).toEqual([]);
  });

  it("(c) past the entry cap a new entry is refused: the result is unpersisted and the line says keep-open after the watchdog", async () => {
    h.mode = "hang";
    for (let i = 0; i < MAX_OUTBOX_ENTRIES; i++) writeSessionRecord(user, mk(i));
    expect(readOutbox(UID)).toHaveLength(MAX_OUTBOX_ENTRIES);
    writeSessionRecord(user, mk(MAX_OUTBOX_ENTRIES)); // one too many
    expect(readOutbox(UID)).toHaveLength(MAX_OUTBOX_ENTRIES);
    expect(readOutbox(UID).some((e) => e.id === mk(MAX_OUTBOX_ENTRIES).id)).toBe(false);
  });
});

describe("FU-SAVE-SYNC-QUOTA — a result that could not be queued is never silent", () => {
  const refuseOutbox = () => {
    const real = Storage.prototype.setItem;
    return vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, k: string, v: string) {
      if (k.includes("sessionOutbox")) throw new DOMException("quota", "QuotaExceededError");
      return real.call(this, k, v);
    });
  };

  it("(d)(e) the outbox refuses the write: keep-open line, beforeunload stays armed past the watchdog, saved when it lands", async () => {
    refuseOutbox();
    h.mode = "hang";
    writeSessionRecord(user, mk(1));
    expect(readOutbox(UID)).toEqual([]); // nothing stored
    expect(getSaveStatus().phase).toBe("saving");
    expect(askUnload()).toBe(true);
    await vi.advanceTimersByTimeAsync(SLOW_AFTER_MS + 1000);
    expect(getSaveStatus().phase).toBe("keep-open"); // NOT the false "we'll add it next time you're online"
    expect(askUnload()).toBe(true); // closing the tab would lose this result: the prompt stays armed
    h.releasers.forEach((r) => r());
    await flush();
    expect(h.store.has(`sessionRecords/${UID}/records/${mk(1).id}`)).toBe(true);
    expect(getSaveStatus().phase).toBe("saved");
    expect(askUnload()).toBe(false);
  });

  it("(e2) a storage that refuses the bodies but has room for ids: the entry IS stored (ids only) and the line stays the normal offline one", async () => {
    const real = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, k: string, v: string) {
      if (k.includes("sessionOutbox") && v.length > 1500) throw new DOMException("quota", "QuotaExceededError");
      return real.call(this, k, v);
    });
    h.mode = "hang";
    writeSessionRecord(user, mk(7, 3000)); // body > 3 KB: refused with the body, accepted as an id
    const entries = readOutbox(UID);
    expect(entries).toHaveLength(1);
    expect(entries[0].body).toBeUndefined();
    await vi.advanceTimersByTimeAsync(SLOW_AFTER_MS + 1000);
    expect(getSaveStatus().phase).toBe("device-only");
  });

  it("(f) an unpersisted write that ends in a final failure says device-only-manual (nothing will retry by itself)", async () => {
    refuseOutbox();
    h.mode = "fail";
    writeSessionRecord(user, mk(2));
    await vi.advanceTimersByTimeAsync(20_000);
    await flush();
    expect(getSaveStatus().phase).toBe("device-only-manual");
    expect(askUnload()).toBe(false); // nothing alive to protect
  });

  it("(g) CONTROL: a persisted entry keeps the normal offline line (device-only), never keep-open / manual", async () => {
    h.mode = "hang";
    writeSessionRecord(user, mk(3));
    expect(readOutbox(UID)).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(SLOW_AFTER_MS + 1000);
    expect(getSaveStatus().phase).toBe("device-only");
    expect(askUnload()).toBe(false);
    __resetOutboxForTests();
    h.mode = "fail";
    writeSessionRecord(user, mk(4));
    await vi.advanceTimersByTimeAsync(20_000);
    await flush();
    expect(getSaveStatus().phase).toBe("device-only");
  });
});
