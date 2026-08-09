/**
 * accountDataService — DPDP erasure/export client guard.
 *
 * ★★ WHAT THIS SUITE EXISTS TO PREVENT: telling a minor their data is gone when it is
 * not. Every assertion here is about that one claim.
 *
 * The three things it pins that nothing else does:
 *   1. the sweep clears LazyTopper's keys and NOTHING ELSE (both directions);
 *   2. a key whose NAME is built from an unvalidated `?ref=` URL parameter is still
 *      caught — driven through the REAL referralService chain, not a synthetic key;
 *   3. a route that is not deployed yet reports an honest failure, never a fake success.
 */

import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

import {
  clearLocalStudentData,
  collectStudentLocalKeys,
  downloadMyDataFromServer,
  eraseMyAccountOnServer,
  exportFallbackFilename,
  isStudentLocalKey,
  thirdPartyDisclosureIds,
} from "./accountDataService";
import { captureIncomingReferral, creditPendingReferral } from "./referralService";

/* ── firebase edge: a signed-in student with a usable token, unless a test says else ── */

let currentUser: { uid: string; getIdToken: () => Promise<string | null> } | null = null;

vi.mock("./firebaseClient", () => ({
  get authClient() {
    return { currentUser };
  },
}));

function signedIn() {
  currentUser = { uid: "uid-student-1", getIdToken: async () => "token-abc" };
}

function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}) {
  return {
    status,
    headers: { get: (k: string) => headers[k] ?? null },
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

/** ★ What an UNDEPLOYED route actually returns: the SPA shell, as HTML, status 200. */
function spaShellResponse() {
  return {
    status: 200,
    headers: { get: () => null },
    text: async () => "<!doctype html><html><body><div id=\"root\"></div></body></html>",
  } as unknown as Response;
}

beforeEach(() => {
  localStorage.clear();
  signedIn();
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/* ══════════════════════════════════════════════════════════════════════════════
   1 · THE DEVICE SWEEP — both directions
   ══════════════════════════════════════════════════════════════════════════════ */

describe("1 · the local sweep clears LazyTopper's keys and nothing else", () => {
  /**
   * ★ SEEDED FROM THE OLD SHAPE, NOT FROM CLEAN. Every key below is a real literal
   * taken from the current source tree, including pre-versioned spellings that a
   * long-standing student still carries. A clean-state test has the exact blind spot
   * that once shipped a React #310 error page to every email-authenticated student
   * who had existing local state.
   */
  const PRE_EXISTING: Record<string, string> = {
    "lazytopper.mistakeLogs.v1": JSON.stringify([{ id: "m1", concept: "electricity" }]),
    "lazytopper.auth.local.v1": JSON.stringify({ uid: "uid-student-1" }),
    "lazytopper.progress.snapshot.v1": JSON.stringify({ maths: 42 }),
    "lazytopper.attempt.dedup.v1": JSON.stringify(["uid-student-1::q1"]),
    "lazytopper.streak": JSON.stringify({ count: 9 }),
    "lazytopper.schema_version": "3",
    "lazytopper.checkResult.v1.qid-77": JSON.stringify({ score: 4 }),
    "lazytopper.referral.v1": JSON.stringify({ code: "LT-ABC123", referrals: [] }),
    "lazytopper.parentEmail.v1": "a-parent@example.com",
    "lazytopper.profile": JSON.stringify({ name: "Old shape, no version suffix" }),
    "lazytopper.xp": "1200",
  };

  /** ★ The CONTROL set. None of these belong to LazyTopper and all must SURVIVE. */
  const FOREIGN: Record<string, string> = {
    "otherapp.session": "keep-me",
    "firebase:authUser:xyz": "keep-me-too",
    theme: "dark",
    "lazytopperish.notours": "still-not-ours",
    "com.lazytopper.native": "prefix-is-not-at-the-front",
  };

  function seed() {
    for (const [k, v] of Object.entries(PRE_EXISTING)) localStorage.setItem(k, v);
    for (const [k, v] of Object.entries(FOREIGN)) localStorage.setItem(k, v);
  }

  it("removes every pre-existing LazyTopper key", () => {
    seed();
    // the seed really landed — otherwise the assertions below pass vacuously
    expect(localStorage.getItem("lazytopper.mistakeLogs.v1")).toBeTruthy();

    const removed = clearLocalStudentData(localStorage);

    for (const key of Object.keys(PRE_EXISTING)) {
      expect(localStorage.getItem(key), `${key} survived the sweep`).toBeNull();
    }
    expect(removed.sort()).toEqual(Object.keys(PRE_EXISTING).sort());
  });

  it("★ CONTROL: keys outside the prefix SURVIVE — a clear-everything implementation fails here", () => {
    seed();
    clearLocalStudentData(localStorage);

    for (const [key, value] of Object.entries(FOREIGN)) {
      expect(localStorage.getItem(key), `${key} was wrongly deleted`).toBe(value);
    }
    // and the storage is not simply empty
    expect(localStorage.length).toBe(Object.keys(FOREIGN).length);
  });

  it("★ removes ALL of them in one pass — index reshuffling does not let a key survive", () => {
    // Storage.key(i) is index-based and indices move as items are removed. A sweep
    // that deletes inside the enumeration loop skips every other key. 40 keys makes
    // that failure certain rather than lucky.
    for (let i = 0; i < 40; i += 1) localStorage.setItem(`lazytopper.bulk.${i}`, String(i));
    expect(localStorage.length).toBe(40);

    clearLocalStudentData(localStorage);

    expect(collectStudentLocalKeys(localStorage)).toEqual([]);
    expect(localStorage.length).toBe(0);
  });

  it("★ the legacy CAPITAL-T key is caught — lazyTopper.vibeMode is not lazytopper.*", () => {
    // FINDING (SETTINGS-1): VibeToggle.tsx reads and removes 'lazyTopper.vibeMode'.
    // A case-SENSITIVE startsWith("lazytopper.") — which is literally what
    // STUDENT_DATA_MAP's `localStorage['lazytopper.*']` notation describes — walks
    // straight past it, and it only clears today if a VibeToggle happens to mount.
    localStorage.setItem("lazyTopper.vibeMode", "beast");
    expect(localStorage.getItem("lazyTopper.vibeMode")).toBe("beast");

    clearLocalStudentData(localStorage);

    expect(localStorage.getItem("lazyTopper.vibeMode")).toBeNull();
  });

  it("isStudentLocalKey accepts both spellings and rejects near-misses", () => {
    expect(isStudentLocalKey("lazytopper.streak")).toBe(true);
    expect(isStudentLocalKey("lazyTopper.vibeMode")).toBe(true);
    expect(isStudentLocalKey("LAZYTOPPER.SHOUTING")).toBe(true);
    // near-misses that must NOT be swept
    expect(isStudentLocalKey("lazytopperish.notours")).toBe(false);
    expect(isStudentLocalKey("com.lazytopper.native")).toBe(false);
    expect(isStudentLocalKey("lazytopper")).toBe(false); // no dot: not a key of ours
  });
});

/* ══════════════════════════════════════════════════════════════════════════════
   2 · THE ?ref= KEY — driven through the REAL live chain
   ══════════════════════════════════════════════════════════════════════════════ */

describe("2 · a localStorage KEY built from an unvalidated ?ref= URL parameter", () => {
  /**
   * ★ THE RISK. `referralService.captureIncomingReferral()` reads `?ref=` from the URL,
   * checks only `startsWith("LT-")`, and stores the rest unbounded and unvalidated.
   * `creditPendingReferral()` then concatenates that stored value into a localStorage
   * KEY: `"lazytopper.refstore." + code`. It runs live on every `?ref=` visit
   * (App.tsx calls `captureIncomingReferral()` from a mount effect).
   *
   * If a URL parameter could shape a key OUT of the `lazytopper.` prefix, the erasure
   * would silently miss it and report success. This drives the two REAL exported
   * functions rather than writing a synthetic key, so it tests the actual product path.
   */
  function visitWith(ref: string) {
    // jsdom: set the query string the service reads
    window.history.replaceState({}, "", `/?ref=${encodeURIComponent(ref)}`);
    captureIncomingReferral();
    creditPendingReferral("friend-uid-9");
  }

  const HOSTILE: Array<[string, string]> = [
    ["a plain code", "LT-ABC123"],
    ["dots, which look like prefix separators", "LT-a.b.c.d"],
    ["a leading-dot payload", "LT-...........evil"],
    ["path traversal", "LT-../../../etc/passwd"],
    ["a prototype key", "LT-__proto__"],
    ["whitespace and a newline", "LT-a b\nc\td"],
    ["unicode", "LT-é你好🚀"],
    ["a quote and a brace", "LT-\"}{'"],
    ["a very long value", `LT-${"x".repeat(2000)}`],
    ["something that looks like another key", "LT-lazytopper"],
    // ★ the nastiest shape available: a value that tries to LOOK like a foreign key
    ["a value impersonating a foreign namespace", "LT- otherapp.session"],
  ];

  it.each(HOSTILE)("%s — the derived key stays under the lazytopper. prefix and is cleared", (_label, ref) => {
    localStorage.clear();
    visitWith(ref);

    // ── the control that makes the assertion mean something ──
    // Find the key the chain ACTUALLY created for this ref value. If the chain wrote
    // nothing, the sweep assertion below would pass vacuously.
    const derived = Object.keys(localStorage).filter((k) => k.includes(ref));
    expect(
      derived.length,
      `the ?ref= chain wrote no key containing the ref value — the test would prove nothing`
    ).toBeGreaterThan(0);

    // ★ THE CLAIM: every key the URL parameter shaped is under the prefix.
    for (const key of derived) {
      expect(isStudentLocalKey(key), `key escaped the prefix: ${JSON.stringify(key)}`).toBe(true);
    }

    clearLocalStudentData(localStorage);

    for (const key of derived) {
      expect(localStorage.getItem(key), `${JSON.stringify(key)} survived erasure`).toBeNull();
    }
  });

  it("★ CONTROL: the same probe DOES catch a key that escapes the prefix", () => {
    // Proves the loop above can fail. This is the shape the finding would have taken
    // had the referral prefix been applied anywhere other than the front of the key.
    localStorage.clear();
    const escaped = "refstore.lazytopper.LT-ABC123"; // prefix NOT at the front
    localStorage.setItem(escaped, "x");

    expect(isStudentLocalKey(escaped)).toBe(false);

    clearLocalStudentData(localStorage);
    expect(localStorage.getItem(escaped)).toBe("x"); // it survives — that is the defect shape
  });

  it("★ the refstore key really is the concatenation the finding describes", () => {
    localStorage.clear();
    visitWith("LT-PROOF01");
    // named explicitly so a future refactor of referralService that changes the key
    // shape fails here rather than silently weakening the erasure
    expect(localStorage.getItem("lazytopper.refstore.LT-PROOF01")).toBeTruthy();
  });
});

/* ══════════════════════════════════════════════════════════════════════════════
   3 · THE SERVER HALF — an undeployed route must never read as success
   ══════════════════════════════════════════════════════════════════════════════ */

describe("3 · erasure over the wire", () => {
  it("★★ an UNDEPLOYED route (SPA shell, HTML, 200) is reported unavailable, NOT success", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => spaShellResponse()));

    const outcome = await eraseMyAccountOnServer();

    expect(outcome.status).toBe("unavailable");
    expect(outcome.status).not.toBe("ok");
  });

  it("★ a 200 whose body lacks a boolean ok is NOT success either", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(200, { message: "hello" })));
    const outcome = await eraseMyAccountOnServer();
    expect(outcome.status).toBe("unavailable");
  });

  it("a real 200 { ok: true } is success, and carries the remaining list", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse(200, {
          ok: true,
          complete: false,
          remaining: [
            { id: "local-storage", status: "skipped", reason: "lives in the student browser" },
            { id: "third-party.gemini", status: "skipped", reason: "retention governed by a third party" },
          ],
        })
      )
    );

    const outcome = await eraseMyAccountOnServer();

    expect(outcome.status).toBe("ok");
    if (outcome.status !== "ok") throw new Error("unreachable");
    expect(outcome.remaining.map((r) => r.id)).toEqual(["local-storage", "third-party.gemini"]);
  });

  it("★ complete:false does NOT make a clean run a failure — it is false on every healthy run", async () => {
    // accountErasure.cjs: "local-storage and third-party.gemini are always here, so
    // complete is always false". Keying on it would report every erasure as broken.
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(200, { ok: true, complete: false, remaining: [] })));
    const outcome = await eraseMyAccountOnServer();
    expect(outcome.status).toBe("ok");
  });

  it("★ a 207 partial run is reported as partial, never as deleted", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse(207, {
          ok: false,
          complete: false,
          remaining: [{ id: "subscriptions", status: "failed", reason: "permission denied" }],
        })
      )
    );

    const outcome = await eraseMyAccountOnServer();

    expect(outcome.status).toBe("partial");
    if (outcome.status !== "partial") throw new Error("unreachable");
    expect(outcome.remaining[0].id).toBe("subscriptions");
    expect(outcome.message).toMatch(/not all of it/i);
  });

  it("401 reads as signed out, 429 as rate limited, 503 as unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(401, { ok: false, error: "unauthenticated" })));
    expect((await eraseMyAccountOnServer()).status).toBe("unauthenticated");

    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(429, { ok: false, error: "rate limited" })));
    expect((await eraseMyAccountOnServer()).status).toBe("rate-limited");

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(503, { ok: false, error: "Account erasure is unavailable right now." }))
    );
    expect((await eraseMyAccountOnServer()).status).toBe("unavailable");
  });

  it("★ a network failure is an honest error, and nothing is claimed", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    const outcome = await eraseMyAccountOnServer();
    expect(outcome.status).toBe("error");
    if (outcome.status !== "error") throw new Error("unreachable");
    expect(outcome.message).toMatch(/nothing was changed/i);
  });

  it("★ auth FAILS CLOSED — a signed-out caller never issues the request at all", async () => {
    currentUser = null;
    const fetchSpy = vi.fn(async () => jsonResponse(200, { ok: true, remaining: [] }));
    vi.stubGlobal("fetch", fetchSpy);

    const outcome = await eraseMyAccountOnServer();

    expect(outcome.status).toBe("unauthenticated");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("sends the bearer token to the erase path as a POST", async () => {
    const fetchSpy = vi.fn(async () => jsonResponse(200, { ok: true, remaining: [] }));
    vi.stubGlobal("fetch", fetchSpy);

    await eraseMyAccountOnServer();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/account/erase");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer token-abc");
  });
});

describe("4 · export over the wire", () => {
  it("★★ an UNDEPLOYED route is reported unavailable, not an empty file", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => spaShellResponse()));
    const outcome = await downloadMyDataFromServer();
    expect(outcome.status).toBe("unavailable");
  });

  it("a 200 returns a saveable blob and honours Content-Disposition", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse(200, { readme: "your data", locations: [] }, {
          "Content-Disposition": 'attachment; filename="lazytopper-my-data-2026-08-09.json"',
        })
      )
    );

    const outcome = await downloadMyDataFromServer();

    expect(outcome.status).toBe("ok");
    if (outcome.status !== "ok") throw new Error("unreachable");
    expect(outcome.filename).toBe("lazytopper-my-data-2026-08-09.json");
    expect(outcome.partial).toBe(false);
    expect(await outcome.blob.text()).toContain("your data");
  });

  it("★ a 207 export is still saved but is flagged partial, not silently clean", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(207, { readme: "partial", errors: ["x"] })));
    const outcome = await downloadMyDataFromServer();
    expect(outcome.status).toBe("ok");
    if (outcome.status !== "ok") throw new Error("unreachable");
    expect(outcome.partial).toBe(true);
  });

  it("falls back to a dated filename when the server sends no disposition header", () => {
    expect(exportFallbackFilename(new Date("2026-08-09T10:00:00Z"))).toBe(
      "lazytopper-my-data-2026-08-09.json"
    );
  });
});

/* ══════════════════════════════════════════════════════════════════════════════
   5 · THE DISCLOSURE IS DERIVED FROM THE MAP, NOT RETYPED
   ══════════════════════════════════════════════════════════════════════════════ */

describe("5 · the third-party disclosure is map-derived", () => {
  it("names exactly the third-party-unreachable locations STUDENT_DATA_MAP declares", () => {
    // Re-derived at read time — if a second third party is added to the map, this
    // fails and forces the UI to disclose it rather than keep naming Gemini alone.
    expect(thirdPartyDisclosureIds()).toEqual(["third-party.gemini"]);
  });
});
