// @vitest-environment jsdom
/**
 * ME-ENGINE-1 PR-1 — MISTAKE HISTORY (G7) and the windowed reads that must not truncate (G14).
 *
 * The Firestore SDK is replaced by an in-memory store that behaves like Firestore where it
 * matters here: `updateDoc` on a missing document FAILS (it never creates one), a field-less
 * document never matches a `where` on that field, and `startAfter` continues after the cursor
 * document of the previous page. The MI front door (`recordMistake`) is REAL.
 *
 * Mutations this file turns RED:
 *   M1 — `resolveStableMistakeLog` deletes the entry instead of resolving it;
 *   M5 — a windowed read stops at one page of 200 (the old `limit(200)`).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const H = vi.hoisted(() => ({ store: new Map<string, Record<string, unknown>>(), auto: { n: 0 }, reads: 0 }));

vi.mock("firebase/firestore", () => {
  type Ref = { __kind: "col" | "doc"; path: string; id?: string };
  type Clause = { t: string; a?: unknown; b?: unknown; c?: unknown };
  type Q = { __kind: "query"; col: Ref; clauses: Clause[] };
  type Snap = { id: string; ref: { path: string }; data: () => Record<string, unknown> | undefined; exists: () => boolean };
  const clone = <T,>(v: T): T => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
  const join = (segs: unknown[]) => segs.map(String).join("/");
  const collection = (base: unknown, ...segs: unknown[]): Ref => {
    const prefix = (base as Ref)?.__kind === "doc" ? (base as Ref).path + "/" : "";
    return { __kind: "col", path: prefix + join(segs) };
  };
  const doc = (base: unknown, ...segs: unknown[]): Ref => {
    if ((base as Ref)?.__kind === "col") {
      const id = segs.length ? String(segs[0]) : `auto${++H.auto.n}`;
      return { __kind: "doc", path: (base as Ref).path + "/" + id, id };
    }
    return { __kind: "doc", path: join(segs), id: String(segs[segs.length - 1]) };
  };
  const snap = (p: string, data: Record<string, unknown> | undefined): Snap => ({
    id: p.split("/").pop() as string,
    ref: { path: p },
    exists: () => data !== undefined,
    data: () => clone(data),
  });
  const query = (col: Ref | Q, ...clauses: Clause[]): Q =>
    (col as Q).__kind === "query" ? { ...(col as Q), clauses: [...(col as Q).clauses, ...clauses] } : { __kind: "query", col: col as Ref, clauses };
  return {
    collection,
    doc,
    query,
    where: (a: unknown, b: unknown, c: unknown) => ({ t: "where", a, b, c }),
    orderBy: (a: unknown, b: unknown = "asc") => ({ t: "orderBy", a, b }),
    limit: (a: unknown) => ({ t: "limit", a }),
    startAfter: (a: unknown) => ({ t: "startAfter", a }),
    setDoc: async (ref: Ref, data: Record<string, unknown>) => {
      H.store.set(ref.path, clone(data));
    },
    updateDoc: async (ref: Ref, data: Record<string, unknown>) => {
      const prev = H.store.get(ref.path);
      if (!prev) throw Object.assign(new Error("No document to update"), { code: "not-found" });
      H.store.set(ref.path, { ...prev, ...clone(data) });
    },
    deleteDoc: async (ref: Ref) => {
      H.store.delete(ref.path);
    },
    addDoc: async (col: Ref, data: Record<string, unknown>) => {
      const ref = doc(col);
      H.store.set(ref.path, clone(data));
      return ref;
    },
    getDocs: async (qOrCol: Ref | Q) => {
      H.reads += 1;
      const q: Q = (qOrCol as Q).__kind === "query" ? (qOrCol as Q) : { __kind: "query", col: qOrCol as Ref, clauses: [] };
      const prefix = q.col.path + "/";
      let rows = [...H.store.entries()].filter(([p]) => p.startsWith(prefix) && !p.slice(prefix.length).includes("/"));
      for (const c of q.clauses) {
        if (c.t === "where") {
          const f = String(c.a);
          rows = rows.filter(([, d]) => {
            const x = d[f] as never;
            const v = c.c as never;
            if (x === undefined) return false; // Firestore: a document without the field never matches
            return c.b === ">=" ? x >= v : c.b === "==" ? x === v : true;
          });
        } else if (c.t === "orderBy") {
          const f = String(c.a);
          const dir = c.b === "desc" ? -1 : 1;
          rows.sort(([pa, a], [pb, b]) => {
            const x = a[f] as never;
            const y = b[f] as never;
            return (x > y ? 1 : x < y ? -1 : pa > pb ? 1 : pa < pb ? -1 : 0) * dir;
          });
        } else if (c.t === "startAfter") {
          const at = rows.findIndex(([p]) => p === (c.a as Snap).ref.path);
          rows = rows.slice(at + 1);
        } else if (c.t === "limit") rows = rows.slice(0, Number(c.a));
      }
      const docs = rows.map(([p, d]) => snap(p, d));
      return { empty: docs.length === 0, size: docs.length, docs };
    },
  };
});
vi.mock("./firebaseClient", () => ({ firestoreDb: { __fake: true } }));
vi.mock("./mistakeConcept", () => ({ conceptForBankQuestionId: () => undefined }));
vi.mock("./adaptivePracticeEngine", () => ({ recordWrongAnswer: () => {} }));

import {
  MISTAKE_LOG_PAGE_SIZE,
  getMistakeLogHistoryFromCloud,
  getMistakeLogs,
  isJoinableQuestionId,
  resolveEarlierMistakesForQuestion,
  resolveStableMistakeLog,
  type MistakeLogEntry,
} from "./mistakeLogService";
import { recordMistake } from "./mistakeIntelligence";
import type { CheckSolutionResponse } from "../ai/aiClient";

const UID = "u-hist";
const DAY = 24 * 60 * 60 * 1000;
const PATH = (id: string) => `learnerProfiles/${UID}/mistakeLogs/${id}`;
const iso = (msAgo: number) => new Date(Date.now() - msAgo).toISOString();

function entry(id: string, over: Partial<MistakeLogEntry> = {}): MistakeLogEntry {
  return {
    id,
    timestamp: iso(DAY),
    questionText: "Q",
    topic: "Real Numbers",
    subject: "Maths",
    totalMarks: 3,
    marksLost: 2,
    mistakeCounts: { conceptual: 1, calculation: 0, silly: 0, presentation: 0 },
    stepDetails: [{ stepNumber: 1, mistakeType: "conceptual", marksDeducted: 2 }],
    ...over,
  };
}
const put = (e: MistakeLogEntry) => H.store.set(PATH(e.id), JSON.parse(JSON.stringify(e)));
const local = (): MistakeLogEntry[] => JSON.parse(window.localStorage.getItem(`lazytopper.mistakeLogs.v1:${UID}`) || "[]");

beforeEach(() => {
  H.store.clear();
  H.auto.n = 0;
  H.reads = 0;
  window.localStorage.clear();
});

/* ── resolved ≠ deleted (M1) ────────────────────────────────────────────────── */
describe("G7 — a re-grade RESOLVES the entry; it is never deleted", () => {
  it("★ the entry survives, byte-for-byte, with resolvedAt + resolvedBy added (cloud AND device)", async () => {
    const e = entry("quick-practice::S1::b1");
    put(e);
    window.localStorage.setItem(`lazytopper.mistakeLogs.v1:${UID}`, JSON.stringify([e]));
    const RES = { resolvedBy: "re-grade" as const, resolvedAt: "2026-10-06T10:00:00.000Z" };
    expect(await resolveStableMistakeLog(UID, e.id, RES, { known: true })).toBe(true);
    expect(H.store.get(PATH(e.id))).toEqual({ ...e, ...RES });
    expect(local()).toEqual([{ ...e, ...RES }]);
  });

  it("an entry that never reached the cloud is NOT re-created as a bare 'resolved' stub", async () => {
    const RES = { resolvedBy: "re-grade" as const, resolvedAt: "2026-10-06T10:00:00.000Z" };
    await resolveStableMistakeLog(UID, "quick-practice::S9::b9", RES, { known: true });
    expect(H.store.has(PATH("quick-practice::S9::b9"))).toBe(false);
  });

  it("★ getMistakeLogs leaves a re-grade-resolved entry out (exactly as when it was deleted) but keeps a won-back-later one", async () => {
    put(entry("quick-practice::S1::b1", { resolvedAt: iso(1000), resolvedBy: "re-grade" }));
    put(entry("quick-practice::S2::b2", { resolvedAt: iso(1000), resolvedBy: "re-grade-not-attempted" }));
    put(entry("quick-practice::S3::b3", { resolvedAt: iso(1000), resolvedBy: "later-correct-attempt" }));
    put(entry("quick-practice::S4::b4"));
    const ids = (await getMistakeLogs(UID, 7)).map((e) => e.id).sort();
    expect(ids).toEqual(["quick-practice::S3::b3", "quick-practice::S4::b4"]);
  });

  it("★ a LEGACY count-only, random-id entry is read UNCHANGED and is never resolved", async () => {
    const legacy = entry("1727000000000-abc123", { questionId: "b1" });
    put(legacy);
    // A later full-mark attempt on the same question: the stable entries resolve, the legacy one does not.
    put(entry("quick-practice::S1::b1", { questionId: "b1" }));
    const n = await resolveEarlierMistakesForQuestion(UID, "b1", { beforeMs: Date.now(), resolvedAt: iso(0) });
    expect(n).toBe(1);
    expect(H.store.get(PATH(legacy.id))).toEqual(legacy);
    const read = (await getMistakeLogs(UID, 7)).find((e) => e.id === legacy.id);
    expect(read).toEqual(legacy); // no marks invented, no field added, nothing converted
  });
});

/* ── won back by a later correct attempt ───────────────────────────────────── */
describe("G7 — a LATER full-mark attempt on the same question wins the earlier mistake back", () => {
  it("resolves only EARLIER, still-live, stable entries on the SAME question id — found in the cloud (cross-device)", async () => {
    put(entry("quick-practice::S1::b1", { questionId: "b1", timestamp: iso(3 * DAY) })); // earlier — resolves
    put(entry("quick-practice::S2::b1", { questionId: "b1", timestamp: iso(2 * DAY), resolvedAt: iso(2 * DAY), resolvedBy: "re-grade" })); // already resolved — untouched
    put(entry("quick-practice::S3::b2", { questionId: "b2", timestamp: iso(3 * DAY) })); // another question
    put(entry("quick-practice::S9::b1", { questionId: "b1", timestamp: iso(0) })); // NOT earlier — untouched
    const at = iso(1000);
    const n = await resolveEarlierMistakesForQuestion(UID, "b1", { exceptId: "quick-practice::S5::b1", beforeMs: Date.parse(at), resolvedAt: at });
    expect(n).toBe(1);
    expect(H.store.get(PATH("quick-practice::S1::b1"))).toMatchObject({ resolvedBy: "later-correct-attempt", resolvedAt: at });
    expect(H.store.get(PATH("quick-practice::S2::b1"))).toMatchObject({ resolvedBy: "re-grade" });
    expect(H.store.get(PATH("quick-practice::S3::b2"))?.resolvedAt).toBeUndefined();
    expect(H.store.get(PATH("quick-practice::S9::b1"))?.resolvedAt).toBeUndefined();
  });

  it("a synthetic slot id (ws:/ct:/fm:/ci:) joins nothing — it names a paper's slot, not the question", async () => {
    expect(isJoinableQuestionId("ws:abc:q1")).toBe(false);
    expect(isJoinableQuestionId("ci:CI-M-01:q2")).toBe(false);
    expect(isJoinableQuestionId("b1")).toBe(true);
    expect(isJoinableQuestionId("ple-hpq-101")).toBe(true);
    put(entry("worksheet::ws1::ws:ws1:q1", { questionId: "ws:ws1:q1", timestamp: iso(3 * DAY) }));
    expect(await resolveEarlierMistakesForQuestion(UID, "ws:ws1:q1", { beforeMs: Date.now(), resolvedAt: iso(0) })).toBe(0);
    expect(H.reads).toBe(0);
  });

  it("★ END TO END through the real front door: mistake on b1 (submission S1) → full marks on b1 (submission S2) → S1's entry is won back, dated, NOT deleted", async () => {
    const USER = { uid: UID } as never;
    const ctx = (sub: string, gradedAt: number) => ({
      subject: "Maths", topic: "Real Numbers", topicKey: "real-numbers", question: "Q", questionId: "b1",
      surface: "quick-practice", submissionId: sub, gradedAt,
    });
    const graded = (awarded: number): CheckSolutionResponse =>
      ({
        ok: true, totalMarks: 3, marksAwarded: awarded, percentage: 0, teacherNote: "",
        mistakeSummary: { conceptual: awarded < 3 ? 1 : 0, calculation: 0, silly: 0, presentation: 0 },
        annotatedSteps: awarded < 3 ? [{ stepNumber: 1, mistakeType: "conceptual", marksDeducted: 3 - awarded, status: "incorrect" }] : [{ stepNumber: 1, status: "correct" }],
      }) as unknown as CheckSolutionResponse;
    const first = await recordMistake(USER, graded(1), ctx("S1", Date.now() - 2 * DAY));
    expect(first.outcome).toBe("logged");
    const [path] = [...H.store.keys()];
    const laterAt = Date.now() - DAY;
    const later = await recordMistake(USER, graded(3), ctx("S2", laterAt));
    expect(later.outcome).toBe("skipped-clean");
    expect(later.wonBack).toBe(1);
    expect(H.store.get(path)).toMatchObject({ marksLost: 2, resolvedBy: "later-correct-attempt", resolvedAt: new Date(laterAt).toISOString() });
    // A cache-restore of the same full-mark result costs no second read.
    const reads = H.reads;
    await recordMistake(USER, graded(3), ctx("S2", laterAt));
    expect(H.reads).toBe(reads);
  });
});

/* ── G14: windowed reads never truncate (M5) ───────────────────────────────── */
describe("G14 — a busy window is read in FULL, page after page", () => {
  const MANY = MISTAKE_LOG_PAGE_SIZE + 50; // 250 > the old limit(200)
  beforeEach(() => {
    for (let i = 0; i < MANY; i += 1) {
      put(entry(`quick-practice::S${i}::b${i}`, { timestamp: iso(DAY + i * 60_000) }));
    }
  });

  it("★ getMistakeLogs returns all 250 entries of a 30-day window (not the first 200)", async () => {
    const got = await getMistakeLogs(UID, 30);
    expect(got).toHaveLength(MANY);
  });

  it("★ the synced history read returns all 250, complete", async () => {
    const got = await getMistakeLogHistoryFromCloud(UID, Date.now() - 30 * DAY);
    expect(got.complete).toBe(true);
    expect(got.entries).toHaveLength(MANY);
    expect(new Set(got.entries.map((e) => e.id)).size).toBe(MANY);
  });
});

/* ── the synced history finds a mistake won back in the window, whenever it was made ── */
describe("history read — won back THIS week, made LAST month", () => {
  it("includes an entry logged before the window start when its resolvedAt is inside it", async () => {
    put(entry("quick-practice::OLD::b1", { timestamp: iso(40 * DAY), resolvedAt: iso(DAY), resolvedBy: "later-correct-attempt" }));
    put(entry("quick-practice::OLDER::b2", { timestamp: iso(40 * DAY) })); // live, outside the window
    const got = await getMistakeLogHistoryFromCloud(UID, Date.now() - 7 * DAY);
    expect(got.entries.map((e) => e.id)).toEqual(["quick-practice::OLD::b1"]);
  });

  it("reads Firestore ONLY — a device-only copy never appears (synced data, not device data)", async () => {
    window.localStorage.setItem(
      `lazytopper.mistakeLogs.v1:${UID}`,
      JSON.stringify([entry("quick-practice::DEVICE-ONLY::b7", { timestamp: iso(DAY) })]),
    );
    const got = await getMistakeLogHistoryFromCloud(UID, Date.now() - 7 * DAY);
    expect(got.entries).toEqual([]);
  });
});
