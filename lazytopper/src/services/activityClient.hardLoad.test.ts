/**
 * STUDENT-ACTIVITY-1B — FULL page loads (FU-ACTIVITY-HARD-NAV-UNDERCOUNT).
 *
 * A "hard load" is modelled the way a browser does it: a FRESH module registry per load
 * (vi.resetModules + a dynamic import, so activityClient's singleton, its hold buffer and
 * its cached token all start empty), a Firebase handle whose `authStateReady()` resolves
 * only when the test says the restore has finished, and a real `pagehide` event on
 * `window` when the load ends. A load that ends before its restore never resolves.
 *
 * Every clock is either injected or relative, so the file passes at any LT_TEST_CLOCK
 * instant.
 *
 * Spec mutations that must turn THIS file red:
 *   M-HOLD    remove the hold-until-first-auth-resolution  -> "★★ HARD-LOAD ..." red
 *   M-LINK    attribute held hits on a later sign-in       -> "★★ NO-LINKING ..." red
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import type { ActivityAuth, ActivityUser } from "./activityClient";

type Post = { url: string; init: RequestInit };
let posts: Post[] = [];
const liveAuths: ActivityAuth[] = [];

function student(uid: string): ActivityUser {
  return { uid, isAnonymous: false, getIdToken: async () => `token-for-${uid}` };
}

async function settle(): Promise<void> {
  for (let i = 0; i < 20; i += 1) await Promise.resolve();
  await new Promise((r) => setTimeout(r, 0));
}

/**
 * One full page load: a fresh module, and a Firebase handle that has NOT restored yet
 * (currentUser null, authStateReady pending) — exactly what the first page view sees.
 */
async function hardLoad() {
  let release: () => void = () => {};
  const ready = new Promise<void>((r) => {
    release = r;
  });
  const auth: ActivityAuth = { currentUser: null, authStateReady: () => ready };
  liveAuths.push(auth);
  vi.resetModules();
  vi.doMock("./firebaseClient", () => ({ authClient: auth, app: null, firestoreDb: null }));
  const mod = await import("./activityClient");
  return {
    auth,
    /** What analytics.ts send() forwards for a page view. */
    pageview: (path: string) => mod.recordActivity("pageview", { route: path, path }),
    event: (name: string) => mod.recordActivity("event", { name }),
    /** Firebase finishes restoring the persisted session as `who`. */
    restore: async (who: ActivityUser | null) => {
      auth.currentUser = who;
      release();
      await settle();
    },
    /** The browser unloads this document. */
    unload: async () => {
      window.dispatchEvent(new Event("pagehide"));
      await settle();
    },
  };
}

const bodies = () => posts.map((p) => JSON.parse(String(p.init.body)));

beforeEach(() => {
  posts = [];
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    posts.push({ url, init });
    return {};
  });
});

afterEach(() => {
  // A dead page's listeners stay on jsdom's window; sign every old handle out so a later
  // test's pagehide can never send an old load's batch.
  for (const a of liveAuths) a.currentUser = null;
  vi.unstubAllGlobals();
  vi.doUnmock("./firebaseClient");
});

describe("hard loads — every section of a signed-in student is recorded", () => {
  it("★★ HARD-LOAD: three full page loads to three sections, each outliving its restore — every section is POSTed at pagehide", async () => {
    const u1 = student("u1");
    for (const path of ["/notes/ohms-law", "/practice-hub", "/pricing"]) {
      const load = await hardLoad();
      load.pageview(path); // fires BEFORE Firebase has restored the session
      await settle();
      await load.restore(u1);
      await load.unload();
    }
    expect(bodies()).toEqual([
      { sections: { notes: 1 } },
      { sections: { practice: 1 } },
      { sections: { pricing: 1 } },
    ]);
    for (const p of posts) {
      expect(p.url).toBe("/api/activity");
      expect(p.init.method).toBe("POST");
      expect(p.init.keepalive).toBe(true);
      expect((p.init.headers as Record<string, string>).Authorization).toBe("Bearer token-for-u1");
    }
  });

  it("★ the initial page view of a load whose session is RESTORED signed-in is counted, with what follows", async () => {
    const load = await hardLoad();
    load.pageview("/");
    load.event("check_question_read"); // still restoring: held too
    await load.restore(student("u7"));
    load.pageview("/check-improve"); // after the restore: counted directly
    await load.unload();
    expect(bodies()).toEqual([{ sections: { home: 1, "check-improve": 1 }, events: { check_question_read: 1 } }]);
  });

  it("★ the pagehide flush sends the whole queue at once, with the token already in hand, and leaves nothing behind", async () => {
    const load = await hardLoad();
    load.pageview("/notes/a");
    await load.restore(student("u2"));
    load.pageview("/notes/b");
    load.event("check_graded");
    expect(posts).toEqual([]); // nothing until the page goes away (or 30 s pass)
    await load.unload();
    expect(bodies()).toEqual([{ sections: { notes: 2 }, events: { check_graded: 1 } }]);
    await load.unload();
    expect(posts).toHaveLength(1);
  });
});

describe("no linking — a visitor's hits never reach a student", () => {
  it("★★ NO-LINKING: a signed-out first resolution DROPS the held hits; a later sign-in in the same load does not receive them", async () => {
    const load = await hardLoad();
    load.pageview("/pricing");
    load.event("free_check_used_block");
    await load.restore(null); // the FIRST resolution: a signed-out visitor
    load.pageview("/cbse/class-10"); // still signed out: dropped on the spot

    load.auth.currentUser = student("u3"); // the visitor now signs in
    load.pageview("/notes/x");
    // A pagehide is a separate task: the just-signed-in student's in-memory token (a
    // microtask away) is cached before it can fire.
    await settle();
    await load.unload();

    expect(bodies()).toEqual([{ sections: { notes: 1 } }]);
    const raw = posts.map((p) => String(p.init.body)).join(" ");
    expect(raw).not.toMatch(/pricing|free_check_used_block|cbse/);
  });

  it("★★ NO-LINKING across loads: a load that ends BEFORE its own restore sends nothing, and the next load never receives its hits", async () => {
    const first = await hardLoad();
    first.pageview("/pricing");
    first.event("free_check_used_block");
    await first.unload(); // gone before Firebase restored anything: unattributable
    expect(posts).toEqual([]);

    const second = await hardLoad();
    second.pageview("/notes/y");
    await second.restore(student("u4")); // signed in by now (e.g. in another tab)
    await second.unload();
    expect(bodies()).toEqual([{ sections: { notes: 1 } }]);
  });
});

describe("the hold is bounded, and a queued batch always has a token", () => {
  async function client() {
    const { createActivityClient } = await import("./activityClient");
    let release: () => void = () => {};
    const ready = new Promise<void>((r) => {
      release = r;
    });
    const auth: ActivityAuth = { currentUser: null, authStateReady: () => ready };
    let nowMs = 5_000_000;
    const sent: string[] = [];
    const c = createActivityClient({
      loadAuth: async () => auth,
      fetchImpl: async (_u, init) => {
        sent.push(String(init.body));
        return {};
      },
      now: () => nowMs,
      setTimer: (fn) => fn,
      clearTimer: () => {},
    });
    return {
      c,
      sent,
      advance: (ms: number) => {
        nowMs += ms;
      },
      restore: async (who: ActivityUser | null) => {
        auth.currentUser = who;
        release();
        await settle();
      },
    };
  }

  it("★ a hit held longer than HOLD_MAX_MS is dropped, not attributed; MAX_EARLY_HITS caps the hold", async () => {
    const { HOLD_MAX_MS, MAX_EARLY_HITS } = await import("./activityClient");
    expect(HOLD_MAX_MS).toBe(15_000);
    expect(MAX_EARLY_HITS).toBe(50);
    const h = await client();
    h.c.recordActivity("pageview", { path: "/pricing" }); // held at t0
    h.advance(HOLD_MAX_MS + 1);
    h.c.recordActivity("pageview", { path: "/notes/x" }); // held at t0 + HOLD_MAX_MS + 1
    for (let i = 0; i < MAX_EARLY_HITS + 10; i += 1) h.c.recordActivity("event", { name: "check_graded" });
    await h.restore(student("u5"));
    // pricing (held too long) is gone; notes + 49 events filled the 50-hit cap.
    expect(h.c.snapshot()).toEqual({
      uid: "u5",
      sections: { notes: 1 },
      events: { check_graded: MAX_EARLY_HITS - 1 },
    });
  });

  it("★ nothing is queued until the restored student's token is in hand — so a pagehide can always send what is queued", async () => {
    let giveToken: (t: string) => void = () => {};
    const slow: ActivityUser = {
      uid: "u6",
      getIdToken: () =>
        new Promise<string>((r) => {
          giveToken = r;
        }),
    };
    const h = await client();
    h.c.recordActivity("pageview", { path: "/notes/x" });
    await h.restore(slow); // restored, but the token is still being fetched
    expect(h.c.snapshot().sections).toEqual({}); // still HELD, not queued without a token
    giveToken("tok-u6");
    await settle();
    expect(h.c.snapshot()).toEqual({ uid: "u6", sections: { notes: 1 }, events: {} });
    await h.c.flush(true); // the pagehide path: synchronous, cached token
    expect(h.sent).toEqual([JSON.stringify({ sections: { notes: 1 } })]);
  });

  it("PIN: a timed flush whose token arrives AFTER a pagehide flush sent the batch posts nothing (no empty `{}` batch — the server answers 400)", async () => {
    let giveToken: (t: string) => void = () => {};
    let deferNext = false;
    const u: ActivityUser = {
      uid: "u8",
      getIdToken: () => {
        if (!deferNext) return Promise.resolve("tok-u8");
        deferNext = false;
        return new Promise<string>((r) => {
          giveToken = r;
        });
      },
    };
    const h = await client();
    h.c.recordActivity("pageview", { path: "/pricing" });
    await h.restore(u);
    expect(h.c.snapshot().sections).toEqual({ pricing: 1 }); // control: queued, token cached
    deferNext = true;
    const timed = h.c.flush(false); // awaiting a fresh token
    await h.c.flush(true); // the page goes away meanwhile: sent with the cached token
    expect(h.sent).toEqual([JSON.stringify({ sections: { pricing: 1 } })]); // control: sent AT pagehide
    giveToken("tok-u8-fresh");
    await timed;
    expect(h.sent).toEqual([JSON.stringify({ sections: { pricing: 1 } })]);
  });
});
