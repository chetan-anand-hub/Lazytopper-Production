/**
 * STUDENT-ACTIVITY-1 PR-1 — the browser half (activityClient.ts).
 *
 * Every clock here is injected; nothing reads today's date, so the file passes at any
 * LT_TEST_CLOCK instant.
 *
 * Spec mutation M3 ("record for a signed-out visitor") turns THIS file red, in
 * "★★ M3: a signed-out visitor is never counted".
 */
import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  ACTIVITY_EVENTS,
  ACTIVITY_SECTIONS,
  ACTIVITY_ENDPOINT,
  FLUSH_INTERVAL_MS,
  MAX_COUNT_PER_NAME,
  createActivityClient,
  hitFor,
  sectionOf,
  type ActivityAuth,
  type ActivityUser,
} from "./activityClient";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const requireCjs = createRequire(import.meta.url);
const server = requireCjs("../../server/routes/studentActivity.cjs") as {
  ACTIVITY_SECTIONS: readonly string[];
  ACTIVITY_EVENTS: readonly string[];
  MAX_COUNT_PER_NAME: number;
};

/* ── harness ─────────────────────────────────────────────────────────────── */

function user(uid: string, opts: { anonymous?: boolean } = {}): ActivityUser {
  return { uid, isAnonymous: opts.anonymous === true, getIdToken: async () => `token-for-${uid}` };
}

async function settle(): Promise<void> {
  for (let i = 0; i < 10; i += 1) await Promise.resolve();
  await new Promise((r) => setTimeout(r, 0));
}

function harness(initial: ActivityUser | null, opts: { configured?: boolean } = {}) {
  const auth: ActivityAuth = { currentUser: initial, authStateReady: async () => {} };
  const posts: Array<{ url: string; init: RequestInit }> = [];
  const timers: Array<{ fn: () => void; ms: number; cleared: boolean }> = [];
  let nowMs = 1_000_000;
  const client = createActivityClient({
    loadAuth: async () => (opts.configured === false ? null : auth),
    fetchImpl: async (url, init) => {
      posts.push({ url, init });
      return {};
    },
    now: () => nowMs,
    setTimer: (fn, ms) => {
      const t = { fn, ms, cleared: false };
      timers.push(t);
      return t;
    },
    clearTimer: (h) => {
      (h as { cleared: boolean }).cleared = true;
    },
  });
  async function fireTimers(): Promise<void> {
    const due = timers.filter((t) => !t.cleared);
    timers.length = 0;
    for (const t of due) t.fn();
    await settle();
  }
  return {
    client,
    auth,
    posts,
    timers,
    fireTimers,
    advance: (ms: number) => {
      nowMs += ms;
    },
    bodies: () => posts.map((p) => JSON.parse(String(p.init.body))),
  };
}

/* ── R1: section mapping ─────────────────────────────────────────────────── */

describe("sectionOf — the section is derived from the REDACTED router path", () => {
  it.each([
    ["/", "home"],
    ["/check-improve", "check-improve"],
    ["/practice/10/science", "practice"],
    ["/practice-hub", "practice"],
    ["/weak-area-practice", "practice"],
    ["/practice/worksheets", "worksheets"],
    ["/practice/worksheets/ready", "worksheets"],
    ["/chapter-test/10/maths/real-numbers", "chapter-test"],
    ["/full-mock/10/science", "full-mock"],
    ["/notes/ohms-law", "notes"],
    ["/topic-hub/10/science/light", "topic-hub"],
    ["/me", "me-progress"],
    ["/pricing", "pricing"],
    ["/cbse/class-10", "cbse"],
    ["/u/:token", "other"],
    ["/legal/privacy", "other"],
    ["/admin/funnel", "other"],
    ["/something-new", "other"],
  ])("%s -> %s", (p, expected) => {
    expect(sectionOf(p)).toBe(expected);
  });

  it("every section it can return is in the allowlist", () => {
    for (const p of ["/", "/x", "/practice/worksheets", "/me", "/cbse/a"]) {
      expect(ACTIVITY_SECTIONS as readonly string[]).toContain(sectionOf(p));
    }
  });

  it("hitFor reads only `path` / `name`: unknown events and malformed payloads give nothing", () => {
    expect(hitFor("pageview", { route: "/notes/x", path: "/notes/x" })).toEqual({ kind: "section", name: "notes" });
    expect(hitFor("event", { name: "check_graded" })).toEqual({ kind: "event", name: "check_graded" });
    expect(hitFor("event", { name: "page_view" })).toBeNull();
    expect(hitFor("event", { name: "made_up" })).toBeNull();
    expect(hitFor("event", {})).toBeNull();
    expect(hitFor("pageview", {})).toBeNull();
  });
});

/* ── one source of truth (D-section-mapping) ─────────────────────────────── */

describe("the client and server allowlists cannot drift", () => {
  it("★ client ACTIVITY_SECTIONS === server ACTIVITY_SECTIONS", () => {
    expect([...ACTIVITY_SECTIONS]).toEqual([...server.ACTIVITY_SECTIONS]);
  });

  it("★ client ACTIVITY_EVENTS === server ACTIVITY_EVENTS", () => {
    expect([...ACTIVITY_EVENTS]).toEqual([...server.ACTIVITY_EVENTS]);
  });

  it("★ the per-name cap is the same on both sides", () => {
    expect(MAX_COUNT_PER_NAME).toBe(server.MAX_COUNT_PER_NAME);
  });

  it("★★ ACTIVITY_EVENTS is EXACTLY the set of event names analytics.ts can send", () => {
    const src = readFileSync(path.join(HERE, "..", "analytics", "analytics.ts"), "utf8");
    const union = /export type NamedAnalyticsEvent =([\s\S]*?);/.exec(src);
    expect(union, "NamedAnalyticsEvent union not found in analytics.ts").not.toBeNull();
    const named = [...union![1].matchAll(/"([a-z_]+)"/g)].map((m) => m[1]);
    const literal = [...src.matchAll(/send\("event", \{ name: "([a-z_]+)" \}\)/g)].map((m) => m[1]);
    expect(named.length).toBeGreaterThan(0);
    expect(literal).toEqual(["sign_up"]);
    expect([...ACTIVITY_EVENTS].sort()).toEqual([...new Set([...literal, ...named])].sort());
  });
});

/* ── who is recorded ─────────────────────────────────────────────────────── */

describe("recording — signed-in students only", () => {
  it("★★ M3: a signed-out visitor is never counted, and a LATER sign-in does not pick their hits up", async () => {
    const h = harness(null);
    h.client.recordActivity("pageview", { path: "/" });
    await settle(); // auth becomes ready: signed out -> the held hit is dropped
    h.client.recordActivity("pageview", { path: "/pricing" });
    h.client.recordActivity("event", { name: "free_check_used_block" });
    expect(h.client.snapshot()).toEqual({ uid: null, sections: {}, events: {} });

    h.auth.currentUser = user("u1"); // the visitor now signs in
    await h.fireTimers();
    await h.client.flush(true);
    expect(h.posts).toEqual([]);

    h.client.recordActivity("pageview", { path: "/notes/x" });
    expect(h.client.snapshot()).toEqual({ uid: "u1", sections: { notes: 1 }, events: {} });
  });

  it("an anonymous Firebase session is not a signed-in student", async () => {
    const h = harness(user("anon", { anonymous: true }));
    h.client.recordActivity("pageview", { path: "/" });
    await settle();
    h.client.recordActivity("pageview", { path: "/practice-hub" });
    expect(h.client.snapshot().uid).toBeNull();
    await h.fireTimers();
    expect(h.posts).toEqual([]);
  });

  it("with Firebase not configured nothing is ever recorded or sent", async () => {
    const h = harness(user("u1"), { configured: false });
    h.client.recordActivity("pageview", { path: "/" });
    await settle();
    h.client.recordActivity("pageview", { path: "/notes/x" });
    await h.fireTimers();
    expect(h.posts).toEqual([]);
  });

  it("hits during session restore are kept only for the RESTORED signed-in student", async () => {
    const h = harness(user("u1"));
    h.client.recordActivity("pageview", { path: "/" }); // before authStateReady
    await settle();
    expect(h.client.snapshot()).toEqual({ uid: "u1", sections: { home: 1 }, events: {} });
  });

  it("★ a uid switch DISCARDS the previous student's unsent batch — never sent under the new uid", async () => {
    const h = harness(user("u1"));
    h.client.recordActivity("pageview", { path: "/" });
    await settle();
    h.client.recordActivity("pageview", { path: "/notes/a" });
    h.auth.currentUser = user("u2");
    h.client.recordActivity("pageview", { path: "/pricing" });
    expect(h.client.snapshot()).toEqual({ uid: "u2", sections: { pricing: 1 }, events: {} });
  });

  it("signing out before the flush discards the batch", async () => {
    const h = harness(user("u1"));
    h.client.recordActivity("pageview", { path: "/" });
    await settle();
    h.auth.currentUser = null;
    await h.fireTimers();
    expect(h.posts).toEqual([]);
    expect(h.client.snapshot()).toEqual({ uid: null, sections: {}, events: {} });
  });
});

/* ── batching + the request ──────────────────────────────────────────────── */

describe("batching (R2)", () => {
  it("★ many hits in 30 s become ONE POST of names + counts, with the token as a Bearer header", async () => {
    const h = harness(user("u1"));
    h.client.recordActivity("pageview", { path: "/" });
    await settle();
    h.client.recordActivity("pageview", { path: "/practice/10/science" });
    h.client.recordActivity("pageview", { path: "/practice-hub" });
    h.client.recordActivity("event", { name: "check_graded" });
    h.client.recordActivity("event", { name: "page_view" }); // not an activity event
    expect(h.timers.filter((t) => !t.cleared)).toHaveLength(1);
    expect(h.timers[0].ms).toBe(FLUSH_INTERVAL_MS);
    await h.fireTimers();
    expect(h.posts).toHaveLength(1);
    const { url, init } = h.posts[0];
    expect(url).toBe(ACTIVITY_ENDPOINT);
    expect(init.method).toBe("POST");
    expect(init.keepalive).toBe(true);
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer token-for-u1");
    expect(h.bodies()[0]).toEqual({ sections: { home: 1, practice: 2 }, events: { check_graded: 1 } });
  });

  it("★ the body carries no uid, path, URL or anything but the two count maps", async () => {
    const h = harness(user("u1"));
    h.client.recordActivity("pageview", { route: "/notes/ohms-law", path: "/notes/ohms-law" });
    await settle();
    await h.fireTimers();
    const raw = String(h.posts[0].init.body);
    expect(Object.keys(JSON.parse(raw))).toEqual(["sections"]);
    expect(raw).not.toMatch(/u1|ohms|notes\/|http/);
  });

  it("★ at most one timed POST per 30 s", async () => {
    const h = harness(user("u1"));
    h.client.recordActivity("pageview", { path: "/" });
    await settle();
    await h.fireTimers(); // POST #1 at t0
    h.advance(5_000);
    h.client.recordActivity("pageview", { path: "/pricing" });
    const next = h.timers.filter((t) => !t.cleared);
    expect(next).toHaveLength(1);
    expect(next[0].ms).toBeGreaterThanOrEqual(FLUSH_INTERVAL_MS);
    await h.fireTimers();
    expect(h.posts).toHaveLength(2);
  });

  it("a page-hide flush sends at once with the cached token, then nothing is left to send", async () => {
    const h = harness(user("u1"));
    h.client.recordActivity("pageview", { path: "/" });
    await settle();
    await h.client.flush(true);
    expect(h.posts).toHaveLength(1);
    await h.fireTimers();
    await h.client.flush(true);
    expect(h.posts).toHaveLength(1);
  });

  it("a name is capped at MAX_COUNT_PER_NAME in one batch (the server refuses more)", async () => {
    const h = harness(user("u1"));
    h.client.recordActivity("pageview", { path: "/" });
    await settle();
    for (let i = 0; i < MAX_COUNT_PER_NAME + 20; i += 1) h.client.recordActivity("event", { name: "check_question_read" });
    expect(h.client.snapshot().events.check_question_read).toBe(MAX_COUNT_PER_NAME);
  });

  it("★ any failure is silent: a rejecting fetch, a throwing token, a broken auth loader", async () => {
    const throwing = createActivityClient({
      loadAuth: async () => {
        throw new Error("boom");
      },
    });
    expect(() => throwing.recordActivity("pageview", { path: "/" })).not.toThrow();
    await settle();

    const auth: ActivityAuth = {
      currentUser: { uid: "u1", getIdToken: async () => { throw new Error("no token"); } },
    };
    const c = createActivityClient({
      loadAuth: async () => auth,
      fetchImpl: async () => {
        throw new Error("offline");
      },
      setTimer: () => 0,
      clearTimer: () => {},
    });
    c.recordActivity("pageview", { path: "/" });
    await settle();
    await expect(c.flush(false)).resolves.toBeUndefined();
    await expect(c.flush(true)).resolves.toBeUndefined();
  });
});
