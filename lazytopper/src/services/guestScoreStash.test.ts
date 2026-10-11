import { describe, it, expect, afterEach, vi } from "vitest";
import { GUEST_SCORE_KEY, GUEST_SCORE_MAX_AGE_MS, stashGuestScore, takeGuestScore } from "./guestScoreStash";

const PATH = "/practice/10/maths?topic=real-numbers&count=3";
const NOW = 1_800_000_000_000;
const S = { path: PATH, attempted: 2, correct: 1, total: 3 };
const seed = (o: unknown) => window.sessionStorage.setItem(GUEST_SCORE_KEY, typeof o === "string" ? o : JSON.stringify(o));
const entry = (over: object = {}) => ({ v: 1, ...S, at: NOW, ...over });

afterEach(() => {
  vi.restoreAllMocks();
  window.sessionStorage.clear();
});

describe("guestScoreStash", () => {
  it("stash writes exactly the six keys with v=1 and at=now", () => {
    stashGuestScore(S, NOW);
    const parsed = JSON.parse(window.sessionStorage.getItem(GUEST_SCORE_KEY)!);
    expect(Object.keys(parsed).sort()).toEqual(["at", "attempted", "correct", "path", "total", "v"]);
    expect(parsed).toMatchObject({ v: 1, at: NOW, ...S });
  });

  it.each([
    ["fresh same path", entry(), PATH, NOW + 1000, true, false],
    ["stale (30 min)", entry(), PATH, NOW + GUEST_SCORE_MAX_AGE_MS, false, false],
    ["wrong path", entry(), "/practice/10/science", NOW + 1000, false, true],
    ["malformed JSON", "{not json", PATH, NOW + 1000, false, false],
    ["v !== 1", entry({ v: 2 }), PATH, NOW + 1000, false, false],
  ])("take: %s", (_n, seeded, path, now, returned, kept) => {
    seed(seeded);
    const got = takeGuestScore(path, now);
    expect(got !== null).toBe(returned);
    if (returned) expect(got).toMatchObject({ v: 1, ...S, at: NOW });
    expect(window.sessionStorage.getItem(GUEST_SCORE_KEY) !== null).toBe(kept);
  });

  it("never throws when storage throws", () => {
    const boom = () => { throw new Error("blocked"); };
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(boom);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(boom);
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(boom);
    expect(() => stashGuestScore(S, NOW)).not.toThrow();
    expect(takeGuestScore(PATH, NOW)).toBeNull();
  });
});
