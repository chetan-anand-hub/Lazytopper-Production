/**
 * ACTIVITY-DETAIL-1 — the recorder's pages + ordered feed (activityClient.ts), F1 + F2.
 *
 * Every clock is injected; nothing reads today's date, so this passes at any
 * LT_TEST_CLOCK instant.
 */
import { describe, it, expect } from "vitest";

import {
  MAX_COUNT_PER_NAME,
  MAX_FEED_PER_BATCH,
  createActivityClient,
  type ActivityAuth,
  type ActivityUser,
} from "./activityClient";

function user(uid: string): ActivityUser {
  return { uid, isAnonymous: false, getIdToken: async () => `token-for-${uid}` };
}

async function settle(): Promise<void> {
  for (let i = 0; i < 10; i += 1) await Promise.resolve();
  await new Promise((r) => setTimeout(r, 0));
}

function harness(initial: ActivityUser | null) {
  const auth: ActivityAuth = { currentUser: initial, authStateReady: async () => {} };
  const posts: string[] = [];
  let nowMs = 2_000_000;
  const client = createActivityClient({
    loadAuth: async () => auth,
    fetchImpl: async (_url, init) => {
      posts.push(String(init.body));
      return {};
    },
    now: () => nowMs,
    setTimer: () => ({}),
    clearTimer: () => {},
  });
  return {
    client,
    auth,
    posts,
    advance: (ms: number) => {
      nowMs += ms;
    },
    bodies: () => posts.map((p) => JSON.parse(p)),
  };
}

describe("pages + feed", () => {
  it("★ page views and actions become ONE ordered feed with their own times; pages are counted by allowlisted key", async () => {
    const h = harness(user("u1"));
    h.client.recordActivity("pageview", { path: "/" }); // held during restore at t=2_000_000
    await settle();
    h.advance(1000);
    h.client.recordActivity("pageview", { path: "/notes/trigonometry" });
    h.advance(1000);
    h.client.recordActivity("event", { name: "check_question_read" });
    h.advance(1000);
    h.client.recordActivity("event", { name: "check_graded" });
    h.advance(1000);
    h.client.recordActivity("pageview", { path: "/notes/trigonometry" });
    expect(h.client.detailSnapshot()).toEqual({
      pages: { home: 1, "notes~trigonometry": 2 },
      feed: [
        { t: 2_000_000, k: "page", n: "home" },
        { t: 2_001_000, k: "page", n: "notes~trigonometry" },
        { t: 2_002_000, k: "event", n: "check_question_read" },
        { t: 2_003_000, k: "event", n: "check_graded" },
        { t: 2_004_000, k: "page", n: "notes~trigonometry" },
      ],
      feedTruncated: false,
    });
    await h.client.flush(true);
    expect(h.bodies()[0].feed).toHaveLength(5);
    expect(h.client.detailSnapshot()).toEqual({ pages: {}, feed: [], feedTruncated: false }); // reset after send
  });

  it("★ a route with no page name (the QR hand-off, sign-in, admin, unknown) adds no page and no feed entry — its section still counts", async () => {
    const h = harness(user("u1"));
    h.client.recordActivity("pageview", { path: "/" });
    await settle();
    for (const p of ["/u/:token", "/login/finish", "/admin/students", "/something-new"]) {
      h.client.recordActivity("pageview", { path: p });
    }
    expect(h.client.snapshot().sections).toEqual({ home: 1, other: 4 });
    expect(h.client.detailSnapshot().pages).toEqual({ home: 1 });
    expect(h.client.detailSnapshot().feed.map((e) => e.n)).toEqual(["home"]);
  });

  it("★ the feed is capped per batch (MAX_FEED_PER_BATCH) with feedTruncated: true; counts keep counting", async () => {
    expect(MAX_FEED_PER_BATCH).toBe(100);
    const h = harness(user("u1"));
    h.client.recordActivity("pageview", { path: "/" });
    await settle();
    for (let i = 0; i < 120; i += 1) {
      h.client.recordActivity("pageview", { path: i % 2 ? "/notes/electricity" : "/practice-hub" });
    }
    const d = h.client.detailSnapshot();
    expect(d.feed).toHaveLength(MAX_FEED_PER_BATCH);
    expect(d.feedTruncated).toBe(true);
    expect(d.pages).toEqual({ home: 1, "notes~electricity": MAX_COUNT_PER_NAME, "practice-hub": MAX_COUNT_PER_NAME });
    await h.client.flush(true);
    const body = h.bodies()[0];
    expect(body.feedTruncated).toBe(true);
    expect(body.feed).toHaveLength(MAX_FEED_PER_BATCH);
  });

  it("★★ a signed-out visitor's page views and actions never enter the feed, and a later sign-in does not receive them", async () => {
    const h = harness(null);
    h.client.recordActivity("pageview", { path: "/pricing" });
    await settle();
    h.client.recordActivity("pageview", { path: "/notes/trigonometry" });
    h.client.recordActivity("event", { name: "free_check_used_block" });
    expect(h.client.detailSnapshot()).toEqual({ pages: {}, feed: [], feedTruncated: false });
    h.auth.currentUser = user("u9");
    h.client.recordActivity("pageview", { path: "/check-improve" });
    expect(h.client.detailSnapshot().feed.map((e) => e.n)).toEqual(["check-improve"]);
  });

  it("★ a uid switch discards the previous student's pages and feed", async () => {
    const h = harness(user("u1"));
    h.client.recordActivity("pageview", { path: "/notes/heredity" });
    await settle();
    h.auth.currentUser = user("u2");
    h.client.recordActivity("pageview", { path: "/pricing" });
    expect(h.client.detailSnapshot()).toEqual({
      pages: { pricing: 1 },
      feed: [{ t: 2_000_000, k: "page", n: "pricing" }],
      feedTruncated: false,
    });
  });

  it("a held hit older than the hold window is dropped from the feed too", async () => {
    const auth: ActivityAuth = { currentUser: null };
    let release: () => void = () => {};
    auth.authStateReady = () => new Promise<void>((r) => (release = r));
    let nowMs = 0;
    const c = createActivityClient({ loadAuth: async () => auth, now: () => nowMs, setTimer: () => ({}), clearTimer: () => {} });
    c.recordActivity("pageview", { path: "/pricing" }); // t=0
    nowMs = 16_000;
    c.recordActivity("pageview", { path: "/notes/trigonometry" }); // t=16 s
    await settle(); // the client is now waiting on authStateReady()
    auth.currentUser = user("u3");
    release();
    await settle();
    expect(c.detailSnapshot().feed).toEqual([{ t: 16_000, k: "page", n: "notes~trigonometry" }]);
  });
});
