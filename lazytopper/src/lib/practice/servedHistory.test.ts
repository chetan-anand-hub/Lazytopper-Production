// FRESH-SET-QP — the served-history module: storage (device + the signed-in student's own cloud
// mirror), the freshness order, and the shape-keeping refresh of a draw (Defect B's rule).

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const cloud = vi.hoisted(() => ({
  enabled: false,
  docs: new Map<string, unknown>(),
  writes: [] as string[],
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
        getDoc: async (path: string) => ({
          exists: () => cloud.docs.has(path),
          data: () => cloud.docs.get(path),
        }),
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
  type FreshnessIndex,
} from "./servedHistory";

beforeEach(() => {
  window.localStorage.clear();
  cloud.enabled = false;
  cloud.docs.clear();
  cloud.writes.length = 0;
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

  it("a signed-in student is mirrored to their OWN practiceInsights tree", () => {
    cloud.enabled = true;
    recordServed({ uid: "u1", chapter: "Real-Numbers", ids: ["a"], at: 100 });
    expect(cloud.writes).toEqual(["practiceInsights/u1/servedHistory/real-numbers"]);
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

  it("the cloud copy is merged INTO the device copy (cross-device)", async () => {
    cloud.enabled = true;
    cloud.docs.set("practiceInsights/u1/servedHistory/c", { entries: [{ id: "phone", at: 3 }] });
    recordServed({ uid: "u1", chapter: "c", ids: ["laptop"], at: 4 });
    // recordServed overwrote the doc with the device list; restore the phone's copy to simulate the race.
    cloud.docs.set("practiceInsights/u1/servedHistory/c", { entries: [{ id: "phone", at: 3 }] });
    const merged = await syncServedFromCloud({ uid: "u1", chapter: "c" });
    expect(merged.map((e) => e.id)).toEqual(["phone", "laptop"]);
    expect(readServedDevice("u1", "c").map((e) => e.id)).toEqual(["phone", "laptop"]);
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
  it("says 'seen every question' only when the scope is exhausted", () => {
    expect(repeatsNote(0, true)).toBeNull();
    expect(repeatsNote(3, true)).toBe("You've seen every question here — some repeats are mixed in.");
    expect(repeatsNote(1, false)).toBe("One question in this set is one you've seen before.");
    expect(repeatsNote(2, false)).toBe("2 questions in this set are ones you've seen before.");
  });
});
