// FRESH-SET-TESTS — the served-history helper (pure parts + the device log).

import { describe, it, expect, beforeEach } from "vitest";
import {
  attemptsLogged,
  countRepeats,
  freshnessLine,
  freshnessOrder,
  loadServedLog,
  mintDrawSeed,
  mulberry32,
  preferUnserved,
  recordServed,
  servedAtFor,
  servedOwner,
} from "./servedHistory";

type Row = { id: string; text: string };
const rows = (n: number, prefix = "q"): Row[] =>
  Array.from({ length: n }, (_, i) => ({ id: `${prefix}${i}`, text: `${prefix} stem ${i}` }));
const idOf = (q: Row) => q.id;

beforeEach(() => window.localStorage.clear());

describe("preferUnserved — fresh first, least-recently-served when a cell runs out", () => {
  it("no history -> the pool unchanged (byte-identical draw for the same seed)", () => {
    const pool = rows(5);
    const r = preferUnserved({ pool, count: 3, servedAt: new Map(), idOf, rand: mulberry32(1) });
    expect(r.candidates).toEqual(pool);
    expect(r.repeatsForced).toBe(0);
  });

  it("enough unseen rows -> only unseen rows are candidates", () => {
    const pool = rows(10);
    const servedAt = new Map(pool.slice(0, 6).map((q, i) => [q.id, 100 + i]));
    const r = preferUnserved({ pool, count: 4, servedAt, idOf, rand: mulberry32(1) });
    expect(r.candidates.map(idOf).sort()).toEqual(["q6", "q7", "q8", "q9"]);
    expect(r.repeatsForced).toBe(0);
  });

  it("too few unseen rows -> all unseen + the OLDEST served rows, exact count kept", () => {
    const pool = rows(8);
    // q0..q5 served; q0,q1 longest ago.
    const servedAt = new Map([
      ["q0", 10], ["q1", 11], ["q2", 50], ["q3", 51], ["q4", 90], ["q5", 91],
    ]);
    const r = preferUnserved({ pool, count: 4, servedAt, idOf, rand: mulberry32(7) });
    expect(r.candidates).toHaveLength(4);
    expect(r.candidates.map(idOf).sort()).toEqual(["q0", "q1", "q6", "q7"]);
    expect(r.repeatsForced).toBe(2);
  });

  it("two ids of ONE question (same key) count once", () => {
    const pool: Row[] = [
      { id: "a", text: "same" },
      { id: "a2", text: "same" },
      { id: "b", text: "other" },
    ];
    const r = preferUnserved({
      pool,
      count: 2,
      servedAt: new Map([["zz", 1]]),
      idOf,
      keyOf: (q) => q.text,
      rand: mulberry32(1),
    });
    // Only two distinct unseen questions exist and both are candidates — no served fill needed.
    expect(r.repeatsForced).toBe(0);
  });
});

describe("freshnessOrder", () => {
  it("is a seeded shuffle (same seed, same order) with unseen rows first, then oldest served", () => {
    const pool = rows(6);
    const servedAt = new Map([["q0", 30], ["q1", 10], ["q2", 20]]);
    const a = freshnessOrder(pool, mulberry32(3), servedAt, idOf).map(idOf);
    const b = freshnessOrder(pool, mulberry32(3), servedAt, idOf).map(idOf);
    expect(a).toEqual(b);
    expect(a.slice(0, 3).sort()).toEqual(["q3", "q4", "q5"]);
    expect(a.slice(3)).toEqual(["q1", "q2", "q0"]);
  });
});

describe("served map + device log", () => {
  it("records (cross-device) and the device log merge; the newest time per id wins; surfaces stay apart", () => {
    const owner = servedOwner("u1");
    recordServed(owner, { surface: "chapter-test", scope: "carbon", ids: ["x", "y"], at: 500 });
    recordServed(owner, { surface: "worksheet", scope: "Science", ids: ["w"], at: 600 });
    const m = servedAtFor({
      surface: "chapter-test",
      records: [
        { surface: "chapter-test", questionIds: ["x", "z"], gradedAt: 100 },
        { surface: "full-mock", questionIds: ["fm"], gradedAt: 900 },
      ],
      log: loadServedLog(owner),
    });
    expect([...m.entries()].sort()).toEqual([["x", 500], ["y", 500], ["z", 100]]);
  });

  it("logging the same paper twice refreshes it (idempotent), never duplicates", () => {
    const owner = servedOwner(null);
    expect(owner).toBe("device"); // signed-out fallback bucket
    recordServed(owner, { surface: "chapter-test", scope: "carbon", ids: ["a", "b"], at: 1 });
    recordServed(owner, { surface: "chapter-test", scope: "carbon", ids: ["b", "a"], at: 2 });
    const log = loadServedLog(owner);
    expect(log).toHaveLength(1);
    expect(log[0].at).toBe(2);
    expect(attemptsLogged(log, "chapter-test", "carbon")).toBe(1);
  });

  it("a corrupt store reads as empty and never throws", () => {
    window.localStorage.setItem("lt.servedHistory.v1:device", "{nope");
    expect(loadServedLog("device")).toEqual([]);
  });
});

describe("mintDrawSeed — seeded, reproducible, distinct per attempt", () => {
  it("same inputs -> same seed; another attempt -> another seed", () => {
    const base = { owner: "uid:u1", surface: "chapter-test" as const, scope: "carbon", now: 1700000000000 };
    expect(mintDrawSeed({ ...base, attempt: 1 })).toBe(mintDrawSeed({ ...base, attempt: 1 }));
    expect(mintDrawSeed({ ...base, attempt: 1 })).not.toBe(mintDrawSeed({ ...base, attempt: 2 }));
  });
});

describe("the honest copy states", () => {
  it("repeats -> the 'you've done most of this chapter' line, with the real count", () => {
    expect(
      freshnessLine({ repeats: 3, total: 15, hasHistory: true, scopeNoun: "chapter", setNoun: "test" }),
    ).toEqual({
      tone: "repeats",
      text: "You've done most of this chapter's questions — 3 repeats from your earlier tests are mixed in.",
    });
    expect(
      freshnessLine({ repeats: 1, total: 38, hasHistory: true, scopeNoun: "subject", setNoun: "mock" })?.text,
    ).toBe("You've done most of this subject's questions — 1 repeat from your earlier mocks is mixed in.");
  });

  it("history but no repeat -> the 'every question is new' line; no history -> no claim", () => {
    expect(
      freshnessLine({ repeats: 0, total: 25, hasHistory: true, scopeNoun: "chapter", setNoun: "worksheet" }),
    ).toEqual({ tone: "fresh", text: "Every question is new — none were in your earlier worksheets." });
    expect(freshnessLine({ repeats: 0, total: 25, hasHistory: false, scopeNoun: "chapter", setNoun: "worksheet" })).toBeNull();
    expect(freshnessLine({ repeats: 0, total: 0, hasHistory: true, scopeNoun: "chapter", setNoun: "test" })).toBeNull();
  });

  it("countRepeats counts only ids served before", () => {
    expect(countRepeats(["a", "b", "c"], new Map([["b", 1]]))).toBe(1);
    expect(countRepeats(["a"], new Map())).toBe(0);
  });
});
