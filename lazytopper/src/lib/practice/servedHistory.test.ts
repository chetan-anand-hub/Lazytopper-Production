// FRESH-SET-QP — the served-history module: storage (device + the signed-in student's own cloud
// mirror), the freshness order, and the shape-keeping refresh of a draw (Defect B's rule).

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const cloud = vi.hoisted(() => ({
  enabled: false,
  docs: new Map<string, unknown>(),
  writes: [] as string[],
  readDelayMs: 0,
  readFails: false,
  txWrites: 0,
}));

vi.mock("../../services/firestoreSdk", () => ({
  isFirestoreEnabled: () => cloud.enabled,
  withFirestore: async (use: (h: unknown) => unknown) =>
    use({
      db: {},
      fs: {
        doc: (_db: unknown, ...path: string[]) => path.join("/"),
        setDoc: async (path: string, data: unknown) => {
          cloud.writes.push(path);
          cloud.docs.set(path, data);
        },
        getDoc: async (path: string) => {
          await new Promise((r) => setTimeout(r, cloud.readDelayMs));
          if (cloud.readFails) throw new Error("offline");
          return { exists: () => cloud.docs.has(path), data: () => cloud.docs.get(path) };
        },
        // A transaction over the same store: its writes are counted as transactional.
        runTransaction: async (_db: unknown, fn: (tx: unknown) => Promise<unknown>) => {
          return fn({
            get: async (path: string) => {
              await new Promise((r) => setTimeout(r, cloud.readDelayMs));
              if (cloud.readFails) throw new Error("offline");
              return { exists: () => cloud.docs.has(path), data: () => cloud.docs.get(path) };
            },
            set: (path: string, data: unknown) => {
              cloud.writes.push(path);
              cloud.txWrites += 1;
              cloud.docs.set(path, data);
            },
          });
        },
      },
    }),
}));

import {
  SERVED_HISTORY_CAP,
  freshTier,
  freshnessFrom,
  freshnessRank,
  mergeServedEntries,
  orderByFreshness,
  readServedDevice,
  recordServed,
  refreshSectionDraw,
  repeatsNote,
  syncServedFromCloud,
  withinMs,
  type FreshnessIndex,
} from "./servedHistory";

beforeEach(() => {
  window.localStorage.clear();
  cloud.enabled = false;
  cloud.docs.clear();
  cloud.writes.length = 0;
  cloud.readDelayMs = 0;
  cloud.readFails = false;
  cloud.txWrites = 0;
});
afterEach(() => vi.restoreAllMocks());

describe("served history · storage", () => {
  it("a signed-out student keeps the DEVICE copy only (no cloud write)", () => {
    cloud.enabled = true;
    recordServed({ uid: null, chapter: "real-numbers", ids: ["a", "b"], at: 100 });
    expect(readServedDevice(null, "real-numbers").map((e) => e.id)).toEqual(["a", "b"]);
    expect(cloud.writes).toEqual([]);
  });

  it("a local (device-only) session is never mirrored", () => {
    cloud.enabled = true;
    recordServed({ uid: "u1", isLocalSession: true, chapter: "real-numbers", ids: ["a"], at: 100 });
    expect(cloud.writes).toEqual([]);
  });

  it("a signed-in student is mirrored to their OWN practiceInsights tree", async () => {
    cloud.enabled = true;
    await recordServed({ uid: "u1", chapter: "Real-Numbers", ids: ["a"], at: 100 }).cloudDone;
    expect(cloud.writes).toEqual(["practiceInsights/u1/servedHistory/real-numbers"]);
    // #1330 re-review: the merge-write is ONE transaction (two devices cannot drop each other's set).
    expect(cloud.txWrites).toBe(1);
  });

  it("re-serving moves an id to its latest time; the list is capped to the most recent", () => {
    recordServed({ uid: null, chapter: "c", ids: ["a", "b"], at: 1 });
    recordServed({ uid: null, chapter: "c", ids: ["a"], at: 5 });
    expect(readServedDevice(null, "c")).toEqual([
      { id: "b", at: 1 },
      { id: "a", at: 5 },
    ]);
    const many = Array.from({ length: SERVED_HISTORY_CAP + 20 }, (_, i) => ({ id: `q${i}`, at: i }));
    const capped = mergeServedEntries(many);
    expect(capped).toHaveLength(SERVED_HISTORY_CAP);
    expect(capped[0].id).toBe("q20");
  });

  it("★ COLD DEVICE (#1330 review): a write issued before any sync never overwrites the cloud history", async () => {
    cloud.enabled = true;
    cloud.readDelayMs = 50; // the cloud is slow; the set is recorded first
    const path = "practiceInsights/u1/servedHistory/c";
    cloud.docs.set(path, { entries: [{ id: "phone-1", at: 3 }, { id: "phone-2", at: 4 }] });
    const sync = syncServedFromCloud({ uid: "u1", chapter: "c" }); // the page's load, in flight
    const rec = recordServed({ uid: "u1", chapter: "c", ids: ["laptop"], at: 9 }); // lands first on the device
    await Promise.all([sync, rec.cloudDone]);
    const stored = (cloud.docs.get(path) as { entries: Array<{ id: string; at: number }> }).entries;
    expect(stored.map((e) => e.id)).toEqual(["phone-1", "phone-2", "laptop"]);
    expect(readServedDevice("u1", "c").map((e) => e.id)).toEqual(["phone-1", "phone-2", "laptop"]);
  });

  it("★ COLD DEVICE: the union keeps the NEWEST time per id and stays capped", async () => {
    cloud.enabled = true;
    const path = "practiceInsights/u1/servedHistory/c";
    const many = Array.from({ length: SERVED_HISTORY_CAP }, (_, i) => ({ id: `old${i}`, at: i + 1 }));
    cloud.docs.set(path, { entries: [...many, { id: "x", at: 5000 }] });
    await recordServed({ uid: "u1", chapter: "c", ids: ["x", "new"], at: 9000 }).cloudDone;
    const stored = (cloud.docs.get(path) as { entries: Array<{ id: string; at: number }> }).entries;
    expect(stored).toHaveLength(SERVED_HISTORY_CAP);
    expect(stored.find((e) => e.id === "x")?.at).toBe(9000);
    expect(stored[stored.length - 1].id).toBe("x");
    expect(stored.some((e) => e.id === "new")).toBe(true);
  });

  it("★ an UNREADABLE cloud is never written blind (the device keeps the record)", async () => {
    cloud.enabled = true;
    cloud.readFails = true;
    const path = "practiceInsights/u1/servedHistory/c";
    cloud.docs.set(path, { entries: [{ id: "phone", at: 3 }] });
    await recordServed({ uid: "u1", chapter: "c", ids: ["laptop"], at: 9 }).cloudDone;
    expect(cloud.writes).toEqual([]);
    expect(readServedDevice("u1", "c").map((e) => e.id)).toEqual(["laptop"]);
  });

  it("the cloud copy is merged INTO the device copy on sync (cross-device)", async () => {
    cloud.enabled = true;
    cloud.docs.set("practiceInsights/u1/servedHistory/c", { entries: [{ id: "phone", at: 3 }] });
    window.localStorage.setItem("lt:qpServed:v1:u1:c", JSON.stringify([{ id: "laptop", at: 4 }]));
    const merged = await syncServedFromCloud({ uid: "u1", chapter: "c" });
    expect(merged.map((e) => e.id)).toEqual(["phone", "laptop"]);
    expect(readServedDevice("u1", "c").map((e) => e.id)).toEqual(["phone", "laptop"]);
  });

  it("withinMs: a slow promise falls back after the bound", async () => {
    const slow = new Promise<string>((r) => setTimeout(() => r("late"), 200));
    expect(await withinMs(slow, 20, "fallback")).toBe("fallback");
    expect(await withinMs(Promise.resolve("fast"), 20, "fallback")).toBe("fast");
  });

  it("an unreadable device copy degrades to empty, never throws", () => {
    window.localStorage.setItem("lt:qpServed:v1:anonymous:c", "{not json");
    expect(readServedDevice(null, "c")).toEqual([]);
  });
});

describe("served history · the freshness order", () => {
  const ix: FreshnessIndex = freshnessFrom(
    [
      { id: "s-old", at: 10 },
      { id: "s-new", at: 20 },
      { id: "a-old", at: 5 },
    ],
    new Map([
      ["a-old", 6],
      ["a-new", 30],
    ]),
  );

  it("never-met first, then served-unanswered least recent first, then answered least recent first", () => {
    expect(orderByFreshness(["a-new", "s-new", "fresh", "a-old", "s-old"], (x) => x, ix)).toEqual([
      "fresh",
      "s-old",
      "s-new",
      "a-old",
      "a-new",
    ]);
    expect(freshTier(ix, "fresh")).toBe(0);
    expect(freshTier(ix, "s-old")).toBe(1);
    expect(freshTier(ix, "a-old")).toBe(2);
    expect(freshnessRank(ix, "s-new")).toBeLessThan(freshnessRank(ix, "a-old"));
  });

  it("`before` drops this visit's own records", () => {
    const visit = freshnessFrom([{ id: "x", at: 100 }], new Map([["y", 100]]), 100);
    expect(visit.served.size + visit.answered.size).toBe(0);
  });
});

describe("served history · refreshSectionDraw (the rule, Defect B)", () => {
  type Q = { id: string; sec: string; diff: string };
  const q = (id: string, sec: string, diff: string): Q => ({ id, sec, diff });
  // The draw's own rows are bank rows of the scope, so the pool holds them too.
  const run = (draw: Q[], pool: Q[], ix: FreshnessIndex, preferred?: (x: Q) => boolean) =>
    refreshSectionDraw({
      draw,
      pool: [...draw, ...pool],
      ix,
      idOf: (x) => x.id,
      sectionOf: (x) => x.sec,
      difficultyOf: (x) => x.diff,
      preferred,
    }).map((x) => x.id);

  const answered = (ids: string[]) => freshnessFrom([], new Map(ids.map((id, i) => [id, i + 1])));

  it("an answered slot takes an UNSEEN row of the same section — adjacent difficulty before far", () => {
    const pool = [q("c-hard", "C", "Hard"), q("c-med", "C", "Medium"), q("d-easy", "D", "Easy")];
    expect(run([q("c-easy-ans", "C", "Easy")], pool, answered(["c-easy-ans"]))).toEqual(["c-med"]);
  });

  it("same difficulty wins over adjacent", () => {
    const pool = [q("c-med", "C", "Medium"), q("c-easy2", "C", "Easy")];
    expect(run([q("c-easy-ans", "C", "Easy")], pool, answered(["c-easy-ans"]))).toEqual(["c-easy2"]);
  });

  it("never crosses a section: with no fresher row in its section the repeat stays", () => {
    const pool = [q("d1", "D", "Easy")];
    expect(run([q("c-ans", "C", "Easy")], pool, answered(["c-ans"]))).toEqual(["c-ans"]);
  });

  it("a fresh slot is never touched; a preferred (MI weak-concept) row leads among fresh ones", () => {
    const pool = [q("c-other", "C", "Easy"), q("c-weak", "C", "Hard")];
    expect(
      run([q("a-fresh", "A", "Easy"), q("c-ans", "C", "Easy")], pool, answered(["c-ans"]), (x) => x.id === "c-weak"),
    ).toEqual(["a-fresh", "c-weak"]);
  });

  it("a row the scope's pool does not hold (a canonical-fallback row) is never re-placed", () => {
    const out = refreshSectionDraw({
      draw: [q("fallback", "C", "Easy")],
      pool: [q("c-fresh", "C", "Easy")],
      ix: answered(["fallback"]),
      idOf: (x) => x.id,
      sectionOf: (x) => x.sec,
      difficultyOf: (x) => x.diff,
    });
    expect(out.map((x) => x.id)).toEqual(["fallback"]);
  });

  it("exhausted section: the least recently answered row replaces a more recent repeat", () => {
    const pool = [q("c-1", "C", "Easy"), q("c-2", "C", "Easy")];
    const ix = answered(["c-1", "c-2", "c-3"]); // c-1 oldest
    expect(run([q("c-3", "C", "Easy")], pool, ix)).toEqual(["c-1"]);
  });
});

describe("served history · the honest line", () => {
  it("'seen every question' ONLY when the whole scope is served; a section run-out says so with the count", () => {
    expect(repeatsNote(0, "fully-served")).toBeNull();
    expect(repeatsNote(3, "fully-served")).toBe("You've seen every question here — some repeats are mixed in.");
    expect(repeatsNote(8, "fully-served", 8)).toBe("You've seen every question here — some repeats are mixed in.");
    // #1330 re-review: only SOME repeat as the scope runs out → the count leads.
    expect(repeatsNote(2, "fully-served", 10)).toBe("2 questions repeat — you've now seen every question here.");
    expect(repeatsNote(1, "fully-served", 10)).toBe("1 question repeats — you've now seen every question here.");
    expect(repeatsNote(1, "section")).toBe("1 question repeats — the unseen ones in this section ran out.");
    expect(repeatsNote(2, "section")).toBe("2 questions repeat — the unseen ones in this section ran out.");
    expect(repeatsNote(1, "other")).toBe("1 question in this set is one you've seen before.");
  });
});
