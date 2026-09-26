/**
 * FREE-CHECK-1b — the client module's own promises: the flag grammar, R1's mark, R8's
 * text-only waiting result, the refusal copy map, and the sign-in target (OR-8, N17).
 * FIX-2 (OR-18): the two-hour expiry and the sign-in intent marker.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  FREE_CHECK_COPY,
  FREE_CHECK_PENDING_KEY,
  FREE_CHECK_REFUSAL_REASONS,
  FREE_CHECK_PENDING_MAX_AGE_MS,
  FREE_CHECK_SIGNIN_INTENT_KEY,
  FREE_CHECK_SIGNIN_PATH,
  FREE_CHECK_USED_KEY,
  __setFreeCheckClockForTests,
  claimPendingFreeCheck,
  clearFreeCheckSigninIntent,
  hasFreeCheckSigninIntentFor,
  hasPendingFreeCheck,
  hasReplayablePendingFreeCheck,
  markFreeCheckSigninIntent,
  hasUsedFreeCheck,
  isFreeCheckClientEnabled,
  peekPendingFreeCheck,
  recordFreeCheckSuccess,
  refusalCopy,
  toRefusalReason,
  type PendingSingleFreeCheck,
} from "./freeCheckClient";

const SINGLE: PendingSingleFreeCheck = {
  v: 1,
  kind: "single",
  gradedAt: 1_700_000_000_000,
  subject: "Maths",
  topicName: "Real Numbers",
  topicSlug: "real-numbers",
  topicTouched: false,
  question: "Prove that root 2 is irrational.",
  marksSource: "stated",
  detectionOverride: null,
  graded: {
    ok: true,
    totalMarks: 3,
    marksAwarded: 2,
    percentage: 67,
    annotatedSteps: [],
    mistakeSummary: { conceptual: 1, calculation: 0, silly: 0, presentation: 0 },
    teacherNote: "Good start.",
  },
};

const MINUTE = 60 * 1000;

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  // The injectable clock (OR-18): one minute after the fixture was graded.
  __setFreeCheckClockForTests(() => SINGLE.gradedAt + MINUTE);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  __setFreeCheckClockForTests(null);
});

describe("R11 — the client flag", () => {
  it("is OFF when unset (the default every existing test runs under)", () => {
    vi.stubEnv("VITE_FREE_CHECK_ENABLED", "");
    expect(isFreeCheckClientEnabled()).toBe(false);
  });
  it.each(["1", "true", "TRUE", "on", "yes"])("is ON for %s", (v) => {
    vi.stubEnv("VITE_FREE_CHECK_ENABLED", v);
    expect(isFreeCheckClientEnabled()).toBe(true);
  });
  it.each(["0", "false", "off", "no", "enabled"])("is OFF for %s", (v) => {
    vi.stubEnv("VITE_FREE_CHECK_ENABLED", v);
    expect(isFreeCheckClientEnabled()).toBe(false);
  });
});

describe("R1 — one free check per browser, ever", () => {
  it("★ the mark's key does NOT start with `lazytopper.` (the erasure sweep would re-arm it)", () => {
    expect(FREE_CHECK_USED_KEY.startsWith("lazytopper.")).toBe(false);
    expect(FREE_CHECK_PENDING_KEY.startsWith("lazytopper.")).toBe(false);
  });

  it("a fresh browser has not used it; a recorded success spends it", () => {
    expect(hasUsedFreeCheck()).toBe(false);
    recordFreeCheckSuccess(SINGLE);
    expect(hasUsedFreeCheck()).toBe(true);
  });
});

describe("R8 — the result waits on the device, text only", () => {
  it("is written by a success and read back whole", () => {
    recordFreeCheckSuccess(SINGLE);
    expect(peekPendingFreeCheck()).toEqual(SINGLE);
    expect(hasPendingFreeCheck()).toBe(true);
  });

  it("claim is read-AND-remove: a second claim finds nothing (the exactly-once half)", () => {
    recordFreeCheckSuccess(SINGLE);
    expect(claimPendingFreeCheck()).toEqual(SINGLE);
    expect(claimPendingFreeCheck()).toBeNull();
    expect(hasPendingFreeCheck()).toBe(false);
  });

  it("never stores an image, even if one were handed in", () => {
    const withImage = { ...SINGLE, imageBase64: "AAAA", graded: { ...SINGLE.graded, imageBase64: "BBBB" } };
    recordFreeCheckSuccess(withImage as PendingSingleFreeCheck);
    const raw = window.localStorage.getItem(FREE_CHECK_PENDING_KEY) ?? "";
    expect(raw).not.toMatch(/imageBase64|AAAA|BBBB/);
  });

  it("junk in the slot is ignored, never replayed", () => {
    window.localStorage.setItem(FREE_CHECK_PENDING_KEY, JSON.stringify({ v: 1, kind: "single" }));
    expect(peekPendingFreeCheck()).toBeNull();
    window.localStorage.setItem(FREE_CHECK_PENDING_KEY, "{not json");
    expect(peekPendingFreeCheck()).toBeNull();
  });
});

describe("OR-18 — a waiting result expires two hours after it was graded", () => {
  it("★ a pending result 2h+1m old is DISCARDED: treated as absent and deleted when peeked", () => {
    recordFreeCheckSuccess(SINGLE);
    __setFreeCheckClockForTests(() => SINGLE.gradedAt + 2 * 60 * MINUTE + MINUTE);
    expect(peekPendingFreeCheck()).toBeNull();
    // Deleted by the peek itself, not merely hidden.
    expect(window.localStorage.getItem(FREE_CHECK_PENDING_KEY)).toBeNull();
    expect(hasPendingFreeCheck()).toBe(false);
    expect(claimPendingFreeCheck()).toBeNull();
    // Even a marker for it cannot make it replayable.
    window.sessionStorage.setItem(FREE_CHECK_SIGNIN_INTENT_KEY, String(SINGLE.gradedAt));
    expect(hasReplayablePendingFreeCheck()).toBe(false);
  });

  it("CONTROL: 1h59m old, and exactly 2h old, it still waits (the window is 'older than 2 hours')", () => {
    expect(FREE_CHECK_PENDING_MAX_AGE_MS).toBe(2 * 60 * 60 * 1000);
    recordFreeCheckSuccess(SINGLE);
    __setFreeCheckClockForTests(() => SINGLE.gradedAt + 119 * MINUTE);
    expect(peekPendingFreeCheck()).toEqual(SINGLE);
    __setFreeCheckClockForTests(() => SINGLE.gradedAt + FREE_CHECK_PENDING_MAX_AGE_MS);
    expect(peekPendingFreeCheck()).toEqual(SINGLE);
    expect(window.localStorage.getItem(FREE_CHECK_PENDING_KEY)).not.toBeNull();
  });

  it("a waiting result with no usable grade time can never be aged, so it is discarded", () => {
    window.localStorage.setItem(FREE_CHECK_PENDING_KEY, JSON.stringify({ ...SINGLE, gradedAt: "soon" }));
    expect(peekPendingFreeCheck()).toBeNull();
    expect(window.localStorage.getItem(FREE_CHECK_PENDING_KEY)).toBeNull();
  });
});

describe("OR-18 — the sign-in intent marker", () => {
  it("is exactly `ltFreeCheck.signinIntent.v1`, never `lazytopper.`-prefixed (N14)", () => {
    expect(FREE_CHECK_SIGNIN_INTENT_KEY).toBe("ltFreeCheck.signinIntent.v1");
    expect(FREE_CHECK_SIGNIN_INTENT_KEY.startsWith("lazytopper.")).toBe(false);
  });

  it("a click writes the waiting result's gradedAt to sessionStorage (this tab), not localStorage", () => {
    recordFreeCheckSuccess(SINGLE);
    markFreeCheckSigninIntent();
    expect(window.sessionStorage.getItem(FREE_CHECK_SIGNIN_INTENT_KEY)).toBe(String(SINGLE.gradedAt));
    expect(window.localStorage.getItem(FREE_CHECK_SIGNIN_INTENT_KEY)).toBeNull();
    expect(hasFreeCheckSigninIntentFor(SINGLE.gradedAt)).toBe(true);
    expect(hasReplayablePendingFreeCheck()).toBe(true);
  });

  it("with nothing waiting, a click writes no marker (and clears an old one)", () => {
    window.sessionStorage.setItem(FREE_CHECK_SIGNIN_INTENT_KEY, "123");
    markFreeCheckSigninIntent();
    expect(window.sessionStorage.getItem(FREE_CHECK_SIGNIN_INTENT_KEY)).toBeNull();
  });

  it("no marker, or a marker for a DIFFERENT gradedAt → not replayable", () => {
    recordFreeCheckSuccess(SINGLE);
    expect(hasReplayablePendingFreeCheck()).toBe(false);
    window.sessionStorage.setItem(FREE_CHECK_SIGNIN_INTENT_KEY, String(SINGLE.gradedAt - 1));
    expect(hasFreeCheckSigninIntentFor(SINGLE.gradedAt)).toBe(false);
    expect(hasReplayablePendingFreeCheck()).toBe(false);
    // …and the result is left waiting (to expire), not deleted.
    expect(hasPendingFreeCheck()).toBe(true);
  });

  it("clear removes it", () => {
    recordFreeCheckSuccess(SINGLE);
    markFreeCheckSigninIntent();
    clearFreeCheckSigninIntent();
    expect(window.sessionStorage.getItem(FREE_CHECK_SIGNIN_INTENT_KEY)).toBeNull();
    expect(hasReplayablePendingFreeCheck()).toBe(false);
  });

  it("FAIL CLOSED: sessionStorage that throws → no marker is written or read → nothing replayable", () => {
    recordFreeCheckSuccess(SINGLE); // the result is waiting before storage starts refusing
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    expect(() => markFreeCheckSigninIntent()).not.toThrow();
    vi.restoreAllMocks();
    expect(window.sessionStorage.getItem(FREE_CHECK_SIGNIN_INTENT_KEY)).toBeNull();
    expect(hasReplayablePendingFreeCheck()).toBe(false);

    window.sessionStorage.setItem(FREE_CHECK_SIGNIN_INTENT_KEY, String(SINGLE.gradedAt));
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    expect(hasFreeCheckSigninIntentFor(SINGLE.gradedAt)).toBe(false);
  });
});

describe("refusal reason → copy (the spec's lines, verbatim)", () => {
  const QUOTA =
    "Today's free checks are all used up. Come back tomorrow — or sign up free now and start your 7-day trial to check today.";
  const BROWSER = "We couldn't start a free check in this browser. Sign up free and your 7-day trial covers it.";
  // OR-14 — `unavailable` has its own line; the App Check line is for app_check_* only.
  const UNAVAILABLE = "Free checks aren't available right now. Sign up free and your 7-day trial covers it.";
  it.each([
    ["ceiling_reached", QUOTA],
    ["budget", QUOTA],
    ["app_check_missing", BROWSER],
    ["app_check_invalid", BROWSER],
    ["unavailable", UNAVAILABLE],
  ] as const)("%s", (reason, copy) => {
    expect(refusalCopy(reason)).toBe(copy);
  });

  it("the reason set is exactly 1a's five", () => {
    expect([...FREE_CHECK_REFUSAL_REASONS].sort()).toEqual(
      ["app_check_invalid", "app_check_missing", "budget", "ceiling_reached", "unavailable"].sort(),
    );
    expect(toRefusalReason("nonsense")).toBe("unavailable");
  });

  it("the other spec lines are verbatim", () => {
    expect(FREE_CHECK_COPY.afterResult).toBe("Sign up free to save this and build your mistake pattern.");
    expect(FREE_CHECK_COPY.used).toBe(
      "You've used your free check. Sign up free to save it and start your 7-day free trial — no card needed.",
    );
    expect(FREE_CHECK_COPY.offerTitle).toBe("Your answer is saved.");
    expect(FREE_CHECK_COPY.offerBody("2 October 2026")).toBe(
      "Start your 7-day free trial to check more answers and see your mistake pattern. No card needed. Ends 2 October 2026.",
    );
    expect(FREE_CHECK_COPY.offerPattern).toBe("Every answer you check helps build your mistake pattern.");
    expect(FREE_CHECK_COPY.offerStart).toBe("Start my free trial");
    expect(FREE_CHECK_COPY.offerLater).toBe("Maybe later");
  });
});

describe("OR-7 — no '<3 − n> more checks' line exists anywhere in src", () => {
  it("the count line was dropped, not reworded (scans every shipped source file)", () => {
    const root = resolve(process.cwd(), "src");
    const hits: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) {
          if (name !== "data") walk(p);
          continue;
        }
        if (!/\.(ts|tsx)$/.test(name) || /\.test\./.test(name)) continue;
        const src = readFileSync(p, "utf8");
        if (/more checks? and your mistake pattern appears/i.test(src)) hits.push(p);
      }
    };
    walk(root);
    expect(hits).toEqual([]);
    // CONTROL — the scan reads this module, which holds the replacement line.
    expect(readFileSync(join(root, "services/freeCheckClient.ts"), "utf8")).toContain(
      "Every answer you check helps build your mistake pattern.",
    );
  });
});

describe("OR-8 + N17 — the one sign-in target, and its redirect hygiene", () => {
  it("is /login?redirect=%2Fcheck-improve — the one door, never /sign-up", () => {
    expect(FREE_CHECK_SIGNIN_PATH).toBe("/login?redirect=%2Fcheck-improve");
    expect(FREE_CHECK_SIGNIN_PATH.startsWith("/sign-up")).toBe(false);
  });

  it("its redirect round-trips to /check-improve and passes the door's own guard", () => {
    const url = new URL(FREE_CHECK_SIGNIN_PATH, "https://example.test");
    expect(url.pathname).toBe("/login");
    const redirect = url.searchParams.get("redirect");
    expect(redirect).toBe("/check-improve");
    // Login.tsx isSafeInternalPath: a letter-led `x:` token is rejected.
    expect(/[a-zA-Z][a-zA-Z0-9+.-]*:/.test(redirect ?? "")).toBe(false);
    // The router basename adds /app/ — a redirect carrying it would double it.
    expect(redirect).not.toContain("/app/");
    expect(FREE_CHECK_SIGNIN_PATH).not.toContain("/app/");
  });
});
