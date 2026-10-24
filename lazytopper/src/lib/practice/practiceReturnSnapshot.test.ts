import { describe, it, expect, beforeEach } from "vitest";
import {
  PRACTICE_RETURN_KEY,
  PRACTICE_RETURN_TTL_MS,
  clearPracticeReturn,
  practiceOwnerTag,
  peekPracticeReturn,
  savePracticeReturn,
  type PracticeReturnSnapshot,
} from "./practiceReturnSnapshot";

// TUTOR-Q-1 (B) — the return snapshot: exactly this URL, fresh, well-formed; otherwise ignored AND removed.

const T0 = 1_760_000_000_000;
const OWNER = practiceOwnerTag("uid-student-a");
const URL_A = "/practice/10/maths?source=practice&topic=real-numbers&built=1";

function snap(over: Partial<PracticeReturnSnapshot> = {}): PracticeReturnSnapshot {
  return {
    owner: OWNER,
    startHereGraded: false,
    url: URL_A,
    at: T0,
    startedAt: T0 - 120_000,
    scorecardDismissed: false,
    ids: ["a", "b", "c"],
    filters: { marks: "all", style: "all", source: "all", difficulty: "all", engineDifficulty: "All", count: 3, range: null },
    picks: { a: 1, c: 0 },
    results: { a: "correct", c: "wrong" },
    open: ["a"],
    solutions: { a: { steps: [{ working: "w" }] } },
    active: "c",
    working: { b: { textAnswer: "my working" } },
    ...over,
  };
}

beforeEach(() => sessionStorage.clear());

describe("practiceReturnSnapshot", () => {
  it("★★ save -> peek at the same URL returns the same ids IN ORDER, picks, verdicts, steps, active and typed working", () => {
    expect(savePracticeReturn(snap())).toBe(true);
    const got = peekPracticeReturn(URL_A, OWNER, T0 + 5 * 60_000)!;
    expect(got.ids).toEqual(["a", "b", "c"]);
    expect(got.picks).toEqual({ a: 1, c: 0 });
    expect(got.results).toEqual({ a: "correct", c: "wrong" });
    expect(got.open).toEqual(["a"]);
    expect(got.active).toBe("c");
    expect(got.working).toEqual({ b: { textAnswer: "my working" } });
    expect(got.filters.count).toBe(3);
    expect(got.startedAt).toBe(T0 - 120_000); // the restore continues the same session identity
    expect(got.scorecardDismissed).toBe(false);
  });

  it("★ peek does not consume a valid snapshot (the page deletes it once the set is on screen)", () => {
    savePracticeReturn(snap());
    expect(peekPracticeReturn(URL_A, OWNER, T0)).not.toBeNull();
    expect(peekPracticeReturn(URL_A, OWNER, T0)).not.toBeNull();
    clearPracticeReturn();
    expect(peekPracticeReturn(URL_A, OWNER, T0)).toBeNull();
  });

  it("★★ an expired snapshot is ignored and removed", () => {
    savePracticeReturn(snap());
    expect(peekPracticeReturn(URL_A, OWNER, T0 + PRACTICE_RETURN_TTL_MS + 1)).toBeNull();
    expect(sessionStorage.getItem(PRACTICE_RETURN_KEY)).toBeNull();
  });

  it("★★ a snapshot for another URL is ignored and removed", () => {
    savePracticeReturn(snap());
    expect(peekPracticeReturn("/practice/10/maths?source=practice&topic=triangles", OWNER, T0)).toBeNull();
    expect(sessionStorage.getItem(PRACTICE_RETURN_KEY)).toBeNull();
  });

  it("★ malformed, empty or future-dated snapshots are dropped", () => {
    sessionStorage.setItem(PRACTICE_RETURN_KEY, "{nope");
    expect(peekPracticeReturn(URL_A, OWNER, T0)).toBeNull();
    expect(sessionStorage.getItem(PRACTICE_RETURN_KEY)).toBeNull();
    savePracticeReturn(snap({ ids: [] }));
    expect(peekPracticeReturn(URL_A, OWNER, T0)).toBeNull();
    savePracticeReturn(snap({ at: T0 + 10 * 60_000 }));
    expect(peekPracticeReturn(URL_A, OWNER, T0)).toBeNull();
  });

  it("★ entries for ids outside the set, bad verdicts and non-typed working are discarded on read", () => {
    sessionStorage.setItem(
      PRACTICE_RETURN_KEY,
      JSON.stringify({
        ...snap(),
        picks: { a: 1, zzz: 2, b: -1 },
        results: { a: "correct", b: "maybe", zzz: "wrong" },
        open: ["a", "b", "zzz"],
        active: "zzz",
        working: { b: { textAnswer: "  " }, c: { imageBase64: "AAAA", textAnswer: null }, a: { textAnswer: "ok" } },
      }),
    );
    const got = peekPracticeReturn(URL_A, OWNER, T0)!;
    expect(got.picks).toEqual({ a: 1 });
    expect(got.results).toEqual({ a: "correct" });
    expect(got.open).toEqual(["a"]); // b has no stored step solution, zzz is not in the set
    expect(got.active).toBeNull();
    expect(got.working).toEqual({ a: { textAnswer: "ok" } });
  });

  it("★★ it never stores a uid or an image", () => {
    savePracticeReturn(snap());
    const raw = sessionStorage.getItem(PRACTICE_RETURN_KEY)!;
    expect(raw).not.toMatch(/uid-student-a|imageBase64/i);
    expect(Object.keys(JSON.parse(raw)).sort()).toEqual(["active", "at", "filters", "ids", "open", "owner", "picks", "results", "scorecardDismissed", "solutions", "startHereGraded", "startedAt", "url", "working"]);
  });

  it("★ an oversized snapshot drops the fetched step solutions before giving up", () => {
    const big = { steps: [{ working: "x".repeat(1_600_000) }] };
    expect(savePracticeReturn(snap({ solutions: { a: big } }))).toBe(true);
    const got = peekPracticeReturn(URL_A, OWNER, T0)!;
    expect(got.open).toEqual([]);
    expect(got.picks).toEqual({ a: 1, c: 0 });
  });

  it("★★ another account's snapshot (same tab, same URL) is ignored and REMOVED; the saver still reads it", () => {
    savePracticeReturn(snap());
    expect(peekPracticeReturn(URL_A, practiceOwnerTag("uid-student-b"), T0)).toBeNull();
    expect(sessionStorage.getItem(PRACTICE_RETURN_KEY)).toBeNull();
    savePracticeReturn(snap());
    expect(peekPracticeReturn(URL_A, OWNER, T0)).not.toBeNull();
    savePracticeReturn(snap());
    expect(peekPracticeReturn(URL_A, practiceOwnerTag(null), T0)).toBeNull(); // signed-out is its own owner
  });

  it("the owner tag is opaque: stable, not the uid, different per account, 'signed-out' without one", () => {
    expect(practiceOwnerTag("uid-student-a")).toBe(practiceOwnerTag("uid-student-a"));
    expect(practiceOwnerTag("uid-student-a")).not.toBe(practiceOwnerTag("uid-student-b"));
    expect(practiceOwnerTag("uid-student-a")).toMatch(/^u-[0-9a-f]{8}$/);
    expect(practiceOwnerTag(null)).toBe("signed-out");
    expect(practiceOwnerTag("")).toBe("signed-out");
  });
});
