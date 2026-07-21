// @vitest-environment jsdom
//
// PR-B — durable per-attempt time-series proof.
// Mocks `firebaseClient` (truthy db) and `firebase/firestore` (in-memory) so the
// subcollection write + the cloud range-query can be asserted WITHOUT live
// credentials. No real Firebase config is used (secret-handling rule). The
// localStorage fast-paths run under jsdom exactly as in production.
import { describe, it, expect, vi, beforeEach } from "vitest";

// In-memory firestore capture. Declared before the import that triggers the
// mock factories, so the lazy factories close over initialized state.
const setDocCalls: Array<{ path: string; data: Record<string, unknown> }> = [];
let attemptsDataset: Array<Record<string, unknown>> = [];

vi.mock("./firebaseClient", () => ({ firestoreDb: { __mock: true } }));

vi.mock("firebase/firestore", () => ({
  doc: (_db: unknown, ...segs: string[]) => ({ __type: "doc", path: segs.join("/") }),
  collection: (_db: unknown, ...segs: string[]) => ({ __type: "collection", path: segs.join("/") }),
  setDoc: async (ref: { path: string }, data: Record<string, unknown>) => {
    setDocCalls.push({ path: ref.path, data });
  },
  getDoc: async () => ({ exists: () => false }),
  where: (field: string, op: string, value: unknown) => ({ __type: "where", field, op, value }),
  query: (col: unknown, ...clauses: unknown[]) => ({ __type: "query", col, clauses }),
  getDocs: async (q: { clauses?: Array<{ field: string; op: string; value: number }> }) => {
    const clauses = q.clauses ?? [];
    const rows = attemptsDataset.filter((r) => {
      const ts = Number(r.timestamp);
      for (const c of clauses) {
        if (c.field !== "timestamp") continue;
        if (c.op === ">=" && !(ts >= c.value)) return false;
        if (c.op === "<=" && !(ts <= c.value)) return false;
      }
      return true;
    });
    return { docs: rows.map((r) => ({ data: () => r })) };
  },
}));

import {
  recordAttempt,
  getAttempts,
  getAttemptsFromCloud,
  type RecordAttemptContext,
} from "./practiceInsights";
import { loadDashboardPrefs, saveDashboardPrefs } from "./studentCloudStore";
import { setActiveProgressUser } from "./studentProgressStore";

const user = { uid: "u1" } as never;

/** setDoc calls that targeted the per-attempt subcollection (not the root blob). */
const attemptSubcolCalls = () =>
  setDocCalls.filter((c) => /^practiceInsights\/[^/]+\/attempts\//.test(c.path));

const baseCtx: RecordAttemptContext = {
  subject: "Maths",
  topic: "Real Numbers",
  questionId: "q-abc",
  marksScored: 5,
  marksAvailable: 5,
  mode: "graded",
};

beforeEach(() => {
  localStorage.clear();
  setDocCalls.length = 0;
  attemptsDataset = [];
  setActiveProgressUser("u1");
});

describe("PR-B Change 1 — durable per-attempt subcollection write", () => {
  it("(a) writes one queryable doc at practiceInsights/{uid}/attempts/{id}, id sanitized, carrying the PracticeAttempt fields incl. mode", () => {
    expect(recordAttempt(user, baseCtx)).toBe("recorded");

    const calls = attemptSubcolCalls();
    expect(calls).toHaveLength(1);
    const { path, data } = calls[0];
    // path: uid then sanitized dedup signature; the "5/5" slash must be gone.
    // `mode` is deliberately NOT part of the id (see attemptDedupKey's doc block +
    // the ops-matrix objective-dedup acceptance): the same question at the same score
    // is ONE outcome however it was produced, so an mcq-click→graded round-trip must
    // not mint two permanent docs. mode still travels in the doc BODY (asserted below).
    expect(path).toBe("practiceInsights/u1/attempts/u1::q-abc::5_5");
    expect(path).not.toContain("/attempts/u1::q-abc::5/5");
    expect(String(data.id)).not.toContain("/");
    expect(data.id).toBe("u1::q-abc::5_5");
    // Doc carries the PracticeAttempt fields, including mode as an AttemptMode.
    expect(data.mode).toBe("graded");
    expect(data.questionId).toBe("q-abc");
    expect(data.subject).toBe("maths");
    expect(data.marksScored).toBe(5);
    expect(data.marksAvailable).toBe(5);
    expect(data.correct).toBe(true);
    expect(typeof data.timestamp).toBe("number");
  });

  it("(b) replaying the SAME ctx (cache restore) dedups and produces no second distinct doc id (idempotent)", () => {
    expect(recordAttempt(user, baseCtx)).toBe("recorded");
    expect(recordAttempt(user, baseCtx)).toBe("duplicate");
    // Same question, same score, DIFFERENT mode: one outcome, so still a duplicate —
    // the mcq-click → graded-typed round-trip must never mint a second permanent doc.
    expect(recordAttempt(user, { ...baseCtx, mode: "mcq" })).toBe("duplicate");
    // A genuinely different RESULT still keys apart (mode-independent ≠ score-blind).
    expect(recordAttempt(user, { ...baseCtx, marksScored: 2 })).toBe("recorded");

    const calls = attemptSubcolCalls();
    // The replays short-circuit before the write: 2 writes for the 2 distinct results.
    expect(calls).toHaveLength(2);
    const distinctIds = new Set(calls.map((c) => c.path));
    expect(distinctIds.size).toBe(2);
  });

  it("(c) no user and local session do not write to the subcollection (guard holds, no throw)", () => {
    expect(recordAttempt(null, baseCtx)).toBe("skipped-no-user");
    expect(attemptSubcolCalls()).toHaveLength(0);

    const localUser = { uid: "u1", isLocalSession: true } as never;
    expect(recordAttempt(localUser, baseCtx)).toBe("skipped-local");
    expect(attemptSubcolCalls()).toHaveLength(0);
  });
});

describe("PR-B Change 2 — getAttemptsFromCloud range query", () => {
  it("(d) returns only attempts within the start/end window", async () => {
    attemptsDataset = [
      { id: "a", timestamp: 100, questionId: "qa", mode: "graded" },
      { id: "b", timestamp: 200, questionId: "qb", mode: "mcq" },
      { id: "c", timestamp: 300, questionId: "qc", mode: "self-assess" },
    ];
    const inWindow = await getAttemptsFromCloud("u1", { start: 150, end: 250 });
    expect(inWindow.map((a) => a.id)).toEqual(["b"]);

    const all = await getAttemptsFromCloud("u1");
    expect(all.map((a) => a.id).sort()).toEqual(["a", "b", "c"]);

    // Guard: no uid / anonymous → empty, no throw.
    expect(await getAttemptsFromCloud("")).toEqual([]);
    expect(await getAttemptsFromCloud("anonymous")).toEqual([]);
  });
});

describe("PR-B Change 3 — DashboardPrefs.timeWindow sanitization", () => {
  it("(e) absent → month; valid → preserved; junk → month", async () => {
    await saveDashboardPrefs("u1", {});
    expect((await loadDashboardPrefs("u1"))?.timeWindow).toBe("month");

    await saveDashboardPrefs("u1", { timeWindow: "2week" });
    expect((await loadDashboardPrefs("u1"))?.timeWindow).toBe("2week");

    await saveDashboardPrefs("u1", { timeWindow: "garbage" as never });
    expect((await loadDashboardPrefs("u1"))?.timeWindow).toBe("month");
  });
});

describe("PR-B — no regression on the synchronous localStorage path", () => {
  it("(f) getAttempts() still returns the recorded attempts from localStorage", () => {
    recordAttempt(user, baseCtx);
    recordAttempt(user, { ...baseCtx, questionId: "q-def", marksScored: 2 });
    const local = getAttempts();
    expect(local).toHaveLength(2);
    expect(local.map((a) => a.questionId).sort()).toEqual(["q-abc", "q-def"]);
  });
});
