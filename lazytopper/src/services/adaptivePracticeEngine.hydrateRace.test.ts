// @vitest-environment jsdom
/**
 * ME-ENGINE-1 PR-2b — [FU-ME2-WAL-HYDRATE-RACE]: a second device ALWAYS pulls the synced
 * wrong-answer log at sign-in, even while the sign-in baseline write to the SAME document is
 * still pending.
 *
 * The fake Firestore below models the one SDK behaviour the OR-LIVE run isolated (and the plain
 * in-memory fakes elsewhere cannot see): a write is PENDING until the server acknowledges it, and
 * while it is pending a read of a document this device has not cached returns the
 * latency-compensated view built from the pending write ALONE — `hasPendingWrites: true`,
 * `fromCache: false`, the server's other fields (`wrongAnswerLog`) absent. Live: "snap exists true
 * fromCache false pending true keys createdAt|uid|updatedAt", result "same".
 * Acknowledgement is explicit (`waitForPendingWrites`, or the test's `ack()`), never a timer.
 *
 * REAL here: `ensureLearnerCloudBaseline` (studentCloudStore), `hydrateMistakeLogsFromCloud`
 * (mistakeLogService) and `hydrateWrongAnswerLogFromCloud` (adaptivePracticeEngine), called in
 * AuthContext's sign-in order — the baseline first, the hydration beside it.
 *
 * Mutation this file turns RED: R — the hydration reads the profile with a plain `getDoc` and
 * trusts a snapshot that carries pending writes (the #968 code) → "same", nothing pulled.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

type Data = Record<string, unknown>;
type Pending = { path: string; data: Data; merge: boolean; resolve: () => void };

const F = vi.hoisted(() => ({
  server: new Map<string, Record<string, unknown>>(),
  pending: [] as Array<{ path: string; data: Record<string, unknown>; merge: boolean; resolve: () => void }>,
  online: true,
  waits: 0,
}));

function ack(): void {
  const batch = F.pending.splice(0);
  for (const w of batch) {
    const prev = F.server.get(w.path) ?? {};
    F.server.set(w.path, w.merge ? { ...prev, ...w.data } : { ...w.data });
    w.resolve();
  }
}

vi.mock("firebase/firestore", () => {
  type Ref = { path: string };
  const clone = <T,>(v: T): T => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
  const snap = (path: string, data: Data | undefined, hasPendingWrites: boolean, fromCache: boolean) => ({
    id: path.split("/").pop() as string,
    exists: () => data !== undefined,
    data: () => clone(data),
    metadata: { hasPendingWrites, fromCache },
  });
  return {
    doc: (_db: unknown, ...segs: unknown[]): Ref => ({ path: segs.map(String).join("/") }),
    collection: (_db: unknown, ...segs: unknown[]) => ({ path: segs.map(String).join("/") }),
    query: (col: unknown) => col,
    orderBy: () => ({}),
    limit: () => ({}),
    where: () => ({}),
    startAfter: () => ({}),
    addDoc: async () => ({ id: "x" }),
    updateDoc: async () => undefined,
    getDocs: async () => ({ empty: true, size: 0, docs: [] }),
    setDoc: (ref: Ref, data: Data, opts?: { merge?: boolean; mergeFields?: string[] }) =>
      new Promise<void>((resolve) => {
        const merge = Boolean(opts?.merge || opts?.mergeFields);
        F.pending.push({ path: ref.path, data: clone(data), merge, resolve } as Pending);
      }),
    getDoc: async (ref: Ref) => {
      const mine = F.pending.filter((w) => w.path === ref.path);
      if (mine.length > 0) {
        // The latency-compensated view of an UNCACHED document: the pending write(s) alone.
        const view = mine.reduce<Data>((acc, w) => ({ ...acc, ...w.data }), {});
        return snap(ref.path, view, true, !F.online);
      }
      if (!F.online) throw new Error("unavailable");
      return snap(ref.path, F.server.get(ref.path), false, false);
    },
    waitForPendingWrites: async () => {
      F.waits += 1;
      if (!F.online) return new Promise<void>(() => {}); // never acknowledged while offline
      ack();
    },
  };
});
vi.mock("./firebaseClient", () => ({ firestoreDb: { __fake: true } }));

import { ensureLearnerCloudBaseline } from "./studentCloudStore";
import { hydrateMistakeLogsFromCloud } from "./mistakeLogService";
import { hydrateWrongAnswerLogFromCloud, loadWrongAnswerLog } from "./adaptivePracticeEngine";

const UID = "u-race";
const ACTIVE_UID_KEY = "lazytopper.progress.active_uid.v1";
const PROFILE = `learnerProfiles/${UID}`;

/** Device A's log, already synced to the cloud (the write half works live). */
const SYNCED_LOG = {
  version: 1,
  updatedAt: 1_791_308_486_000,
  entries: {
    "arithmetic-progression::AP-N-EXEM-5-VSA-001": {
      questionId: "AP-N-EXEM-5-VSA-001",
      topicKey: "arithmetic-progression",
      conceptKey: "AP-N-EXEM-5-VSA-001",
      difficulty: "medium",
      timestamp: 1_791_308_486_000,
      count: 1,
    },
    "arithmetic-progression::AP-E16": {
      questionId: "AP-E16",
      topicKey: "arithmetic-progression",
      conceptKey: "AP-E16",
      difficulty: "medium",
      timestamp: 1_791_308_486_000,
      count: 1,
    },
  },
};

beforeEach(() => {
  F.server.clear();
  F.pending.splice(0);
  F.online = true;
  F.waits = 0;
  // Device B: a fresh browser on the same account — nothing on the device.
  window.localStorage.clear();
  window.localStorage.setItem(ACTIVE_UID_KEY, UID);
  F.server.set(PROFILE, { uid: UID, createdAt: "2026-10-06T17:39:03Z", updatedAt: "2026-10-06T17:39:03Z", wrongAnswerLog: SYNCED_LOG });
});

describe("[FU-ME2-WAL-HYDRATE-RACE] a second device pulls the synced log while the baseline write is pending", () => {
  it("★ PRECONDITION — the fake reproduces the live view: a pending baseline write hides wrongAnswerLog", async () => {
    const baseline = ensureLearnerCloudBaseline(UID);
    const { getDoc, doc } = await import("firebase/firestore");
    const s = await getDoc(doc({} as never, "learnerProfiles", UID));
    expect(s.metadata).toEqual({ hasPendingWrites: true, fromCache: false });
    expect(Object.keys(s.data() ?? {}).sort()).toEqual(["createdAt", "uid", "updatedAt"]);
    ack();
    await baseline;
  });

  it("★ AuthContext's sign-in order (baseline first, then the hydration that hosts the log) → PULLED", async () => {
    const baseline = ensureLearnerCloudBaseline(UID);
    await hydrateMistakeLogsFromCloud(UID);
    // Acknowledge whatever the code under test did not wait for itself (explicit, never a timer).
    ack();
    await baseline;
    expect(Object.keys(loadWrongAnswerLog().entries).sort()).toEqual([
      "arithmetic-progression::AP-E16",
      "arithmetic-progression::AP-N-EXEM-5-VSA-001",
    ]);
    // It waited for the acknowledgement rather than deciding on the pending view.
    expect(F.waits).toBeGreaterThan(0);
    // The baseline merge kept the synced log in the cloud.
    expect((F.server.get(PROFILE) as { wrongAnswerLog?: unknown }).wrongAnswerLog).toEqual(SYNCED_LOG);
  });

  it("★ the hydration's own verdict with the baseline pending is 'pulled', not 'same'", async () => {
    const baseline = ensureLearnerCloudBaseline(UID);
    const result = await hydrateWrongAnswerLogFromCloud(UID);
    ack();
    await baseline;
    expect(result).toBe("pulled");
  });

  it("the hydration started FIRST, the baseline after → still pulled (order-independent)", async () => {
    const hydration = hydrateWrongAnswerLogFromCloud(UID);
    const baseline = ensureLearnerCloudBaseline(UID);
    const result = await hydration;
    ack();
    await baseline;
    expect(result).toBe("pulled");
    expect(Object.keys(loadWrongAnswerLog().entries)).toHaveLength(2);
  });

  it("no pending write → read once, pulled, no wait", async () => {
    expect(await hydrateWrongAnswerLogFromCloud(UID)).toBe("pulled");
    expect(F.waits).toBe(0);
  });

  it("offline with the baseline pending → 'skipped' at once (never hangs, never decides on the pending view)", async () => {
    F.online = false;
    void ensureLearnerCloudBaseline(UID);
    expect(await hydrateWrongAnswerLogFromCloud(UID)).toBe("skipped");
    expect(F.waits).toBe(0);
    expect(loadWrongAnswerLog().entries).toEqual({});
  });
});
