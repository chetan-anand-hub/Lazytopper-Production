import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getAdditionalUserInfo } = vi.hoisted(() => ({ getAdditionalUserInfo: vi.fn() }));
vi.mock("firebase/auth", () => ({ getAdditionalUserInfo }));
vi.mock("../services/activityClient", () => ({ recordActivity: vi.fn() }));
const customer = vi.hoisted(() => ({ uid: null as string | null, paid: false, ownsPack: null as boolean | null }));
vi.mock("../services/firebaseClient", () => ({
  get authClient() {
    return customer.uid ? { currentUser: { uid: customer.uid } } : null;
  },
}));
vi.mock("../services/subscriptionService", () => ({
  loadSubscription: () => ({ tier: customer.paid ? "premium" : "free" }),
  isPaidPremium: (st: { tier?: string }) => st?.tier === "premium",
}));
vi.mock("../lib/packs/myPacksCache", () => ({ peekOwnsAnyPack: () => customer.ownsPack }));

import {
  BUYER_SCORE_KEY,
  BUYER_TIER_REFIRE_MS,
  buyerScoreNote,
  classifySource,
  hourBlock,
  istHour,
  landingGroup,
  resetBuyerScoreSessionForTests,
  scoreOf,
  tierOf,
} from "./buyerScore";
import { PURCHASE_SENT_LOCAL_KEY } from "./analytics";
import { VISIT_SOURCE_KEY } from "./visitSource";

/** BUYER-SCORE-1 - the rules of buyer_analysis_2026-11-23.py, the points of the 23 Nov scorecard, and the tracker. */

const DAY = 24 * 60 * 60 * 1000;
// 2026-11-20 03:30 UTC = 09:00 IST -> hour block 09-13 (+2).
const T0 = Date.parse("2026-11-20T03:30:00Z");

describe("classifySource (python source_class, ported)", () => {
  const cases: Array<[string, Parameters<typeof classifySource>[0], string]> = [
    ["google cpc pdf packs", { utm_source: "google", utm_medium: "cpc", utm_campaign: "search_pdf_packs", gclid: true }, "GSearch PDF Packs"],
    ["google cpc test series", { utm_source: "google", utm_medium: "cpc", utm_campaign: "search_test_series" }, "GSearch Test Series"],
    ["google cpc board pass", { utm_source: "Google", utm_medium: "CPC", utm_campaign: "search_board_pass" }, "GSearch Board Pass"],
    ["google cpc signups v2", { utm_source: "google", utm_medium: "cpc", utm_campaign: "search_signups_v2" }, "GSearch Sign-ups v2"],
    ["google cpc unknown campaign", { utm_source: "google", utm_medium: "cpc", utm_campaign: "brand" }, "GSearch other"],
    ["gclid only, no referrer", { gclid: true }, "GSearch untagged"],
    ["gclid + google referrer", { gclid: true, ref: "www.google.com" }, "GSearch untagged"],
    ["gclid + syndicated referrer", { gclid: true, ref: "googleads.g.doubleclick.net.syndicated" }, "GSearch untagged"],
    ["gclid + unrelated referrer", { gclid: true, ref: "example.org" }, "Other"],
    ["fbclid", { fbclid: true }, "Meta"],
    ["fbclid beats gclid", { fbclid: true, gclid: true }, "Meta"],
    ["utm_source facebook", { utm_source: "facebook" }, "Meta"],
    ["utm_source an (Meta app)", { utm_source: "an" }, "Meta"],
    ["instagram referrer", { ref: "l.instagram.com" }, "Meta"],
    ["utm_source youtube", { utm_source: "youtube", utm_medium: "paid" }, "YouTube"],
    ["youtube referrer", { ref: "m.youtube.com" }, "YouTube"],
    ["organic google", { ref: "www.google.com" }, "Organic Google"],
    ["bing", { ref: "www.bing.com" }, "Bing/other search"],
    ["duckduckgo", { ref: "duckduckgo.com" }, "Bing/other search"],
    ["whatsapp share", { utm_source: "whatsapp" }, "Share/WhatsApp/ChatGPT"],
    ["parent_share", { utm_source: "parent_share" }, "Share/WhatsApp/ChatGPT"],
    ["chatgpt referrer", { ref: "chatgpt.com" }, "Share/WhatsApp/ChatGPT"],
    ["empty touch", {}, "Direct/unknown"],
    ["nulls", { ref: null, utm_source: null, utm_medium: null, utm_campaign: null }, "Direct/unknown"],
    ["undefined", undefined, "Direct/unknown"],
    ["unknown utm_source", { utm_source: "newsletter" }, "Other"],
    ["unknown referrer", { ref: "example.org" }, "Other"],
  ];
  it.each(cases)("%s -> %s", (_name, src, want) => {
    expect(classifySource(src)).toBe(want);
  });
});

describe("landingGroup (python landing_group, ported)", () => {
  const cases: Array<[string | null | undefined, string]> = [
    [undefined, "none"],
    ["", "none"],
    ["/", "home"],
    ["/pricing", "pricing/board-pass"],
    ["/board-pass", "pricing/board-pass"],
    ["/for-parents", "for-parents"],
    ["/packs", "packs"],
    ["/cbq-packs", "packs"],
    ["/question-bank-class-10", "packs"],
    ["/mock-test-class-10", "packs"],
    ["/test-series", "test-series"],
    ["/practice-hub", "practice-hub"],
    ["/check-improve", "answer-checker"],
    ["/notes/jemh108", "notes/SEO"],
    ["/cbse/class-10", "notes/SEO"],
    ["/tutor/class10/maths", "notes/SEO"],
    ["/login", "login"],
    ["/welcome", "login"],
    ["/browse", "login"],
    ["/highly-probable", "content (HPQ/trends/tests)"],
  ];
  it.each(cases)("%s -> %s", (landing, want) => {
    expect(landingGroup(landing)).toBe(want);
  });
});

describe("hour blocks, IST", () => {
  it.each([
    [0, "00-06"],
    [5, "00-06"],
    [6, "06-09"],
    [9, "09-13"],
    [12, "09-13"],
    [13, "13-17"],
    [17, "17-21"],
    [21, "21-24"],
    [23, "21-24"],
  ])("hour %i -> %s", (h, want) => expect(hourBlock(h)).toBe(want));
  it("istHour reads the IST hour of an instant", () => {
    expect(istHour(Date.parse("2026-11-20T03:30:00Z"))).toBe(9);
    expect(istHour(Date.parse("2026-11-20T18:29:00Z"))).toBe(23);
    expect(istHour(Date.parse("2026-11-20T18:30:00Z"))).toBe(0);
  });
});

describe("scoreOf + tiers (points from the scorecard)", () => {
  it("source, landing and hour points", () => {
    expect(scoreOf({ sourceClass: "GSearch PDF Packs", landingGroup: "packs", hour: 10 })).toBe(7 + 7 + 2);
    expect(scoreOf({ sourceClass: "Direct/unknown", landingGroup: "home", hour: 10 })).toBe(5 + 0 + 2);
    expect(scoreOf({ sourceClass: "Bing/other search", landingGroup: "for-parents", hour: 7 })).toBe(4 + 3 + 1);
    expect(scoreOf({ sourceClass: "GSearch untagged", landingGroup: "login", hour: 22 })).toBe(4 + 3 + 1);
    expect(scoreOf({ sourceClass: "Meta", landingGroup: "notes/SEO", hour: 3 })).toBe(3 + 3 + 0);
    expect(scoreOf({ sourceClass: "Organic Google", landingGroup: "pricing/board-pass", hour: 15 })).toBe(2 + 3);
    expect(scoreOf({ sourceClass: "Organic Google", landingGroup: "answer-checker", hour: 15 })).toBe(2 + 1);
    expect(scoreOf({ sourceClass: "YouTube", landingGroup: "practice-hub", hour: 18 })).toBe(0);
    expect(scoreOf({ sourceClass: "GSearch Sign-ups v2", landingGroup: "home", hour: 18 })).toBe(0);
    expect(scoreOf({ sourceClass: "GSearch Board Pass", landingGroup: "test-series", hour: 18 })).toBe(0);
  });
  it("behaviour points", () => {
    const base = { sourceClass: "Direct/unknown", landingGroup: "home", hour: 15 }; // 5
    expect(scoreOf({ ...base, viewedSellingPage: true })).toBe(8);
    expect(scoreOf({ ...base, openedPack: true })).toBe(8);
    expect(scoreOf({ ...base, startedCheckout: true })).toBe(10);
    expect(scoreOf({ ...base, activeDays: 2 })).toBe(8);
    expect(scoreOf({ ...base, activeDays: 1 })).toBe(5);
  });
  it("free-practice-only -3 needs >= 3 page views and nothing selling, no notes", () => {
    const base = { sourceClass: "Direct/unknown", landingGroup: "home", hour: 15 };
    expect(scoreOf({ ...base, pageViews: 2 })).toBe(5);
    expect(scoreOf({ ...base, pageViews: 3 })).toBe(2);
    expect(scoreOf({ ...base, pageViews: 9, sawNotes: true })).toBe(5);
    expect(scoreOf({ ...base, pageViews: 9, viewedSellingPage: true })).toBe(8);
  });
  it("tier thresholds: hot >= 12, warm 8-11, cold < 8", () => {
    expect(tierOf(12)).toBe("hot");
    expect(tierOf(30)).toBe("hot");
    expect(tierOf(11)).toBe("warm");
    expect(tierOf(8)).toBe("warm");
    expect(tierOf(7)).toBe("cold");
    expect(tierOf(-3)).toBe("cold");
  });
});

/* ------------------------------------------------------------------ tracker */

type GtagCall = unknown[];
let gtagCalls: GtagCall[];
let fbqCalls: unknown[][];
const originalLocation = window.location;
const w = window as unknown as { gtag?: unknown; fbq?: unknown };

function setLocation(pathAndQuery: string, hostname = "www.lazytopper.com"): void {
  const url = new URL(pathAndQuery, `https://${hostname}`);
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: { href: url.href, origin: url.origin, hostname: url.hostname, pathname: url.pathname, search: url.search, hash: url.hash },
  });
}

function tierEvents(): Array<Record<string, unknown>> {
  return gtagCalls.filter((c) => c[0] === "event" && c[1] === "buyer_tier").map((c) => c[2] as Record<string, unknown>);
}

function seedSource(touch: Record<string, unknown>): void {
  window.sessionStorage.setItem(
    VISIT_SOURCE_KEY,
    JSON.stringify({ ref: null, utm_source: null, utm_medium: null, utm_campaign: null, utm_content: null, landing: "/", gclid: false, fbclid: false, ...touch }),
  );
}

beforeEach(() => {
  resetBuyerScoreSessionForTests();
  customer.uid = null;
  customer.paid = false;
  customer.ownsPack = null;
  window.localStorage.clear();
  window.sessionStorage.clear();
  gtagCalls = [];
  fbqCalls = [];
  w.gtag = (...a: unknown[]) => void gtagCalls.push(a);
  const fbq = ((...a: unknown[]) => void fbqCalls.push(a)) as ((...a: unknown[]) => void) & { callMethod?: unknown };
  fbq.callMethod = () => undefined;
  w.fbq = fbq;
  setLocation("/packs");
});

afterEach(() => {
  Object.defineProperty(window, "location", { configurable: true, writable: true, value: originalLocation });
  delete w.gtag;
  delete w.fbq;
});

describe("tracker: announcing a rising tier", () => {
  const packsSource = { utm_source: "google", utm_medium: "cpc", utm_campaign: "search_pdf_packs", landing: "/packs", gclid: true };

  it("a hot visitor fires GA4 buyer_tier {tier, score} and Meta BuyerTierHot, once", () => {
    seedSource(packsSource);
    expect(buyerScoreNote({ kind: "page", path: "/packs" }, T0)).toBe("hot");
    expect(tierEvents()).toHaveLength(1);
    expect(tierEvents()[0]).toMatchObject({ tier: "hot", score: 16 }); // 7 + 7 + 2 (09:00 IST)
    expect(fbqCalls).toEqual([["trackCustom", "BuyerTierHot"]]);
    // the same tier again within 7 days: nothing
    expect(buyerScoreNote({ kind: "page", path: "/packs" }, T0 + 1000)).toBeNull();
    expect(buyerScoreNote({ kind: "event", name: "pack_view" }, T0 + 2 * DAY)).toBeNull();
    expect(tierEvents()).toHaveLength(1);
    expect(fbqCalls).toHaveLength(1);
  });

  it("fires the same tier again only after 7 days", () => {
    seedSource(packsSource);
    buyerScoreNote({ kind: "page", path: "/packs" }, T0);
    expect(buyerScoreNote({ kind: "page", path: "/packs" }, T0 + BUYER_TIER_REFIRE_MS - 1)).toBeNull();
    expect(buyerScoreNote({ kind: "page", path: "/packs" }, T0 + BUYER_TIER_REFIRE_MS + 1)).toBe("hot");
    expect(tierEvents()).toHaveLength(2);
  });

  it("walks cold -> warm -> hot from behaviour; warm is not re-announced under a recent hot", () => {
    seedSource({ landing: "/" }); // Direct (5) + home (0) + 09:00 IST (2) = 7: cold
    expect(buyerScoreNote({ kind: "page", path: "/" }, T0)).toBeNull();
    expect(tierEvents()).toHaveLength(0);
    expect(buyerScoreNote({ kind: "page", path: "/pricing" }, T0 + 1000)).toBe("warm"); // +3 selling page = 10
    expect(fbqCalls).toEqual([["trackCustom", "BuyerTierWarm"]]);
    expect(buyerScoreNote({ kind: "event", name: "begin_checkout" }, T0 + 2000)).toBe("hot"); // +5 = 15
    expect(fbqCalls[1]).toEqual(["trackCustom", "BuyerTierHot"]);
    expect(buyerScoreNote({ kind: "page", path: "/pricing" }, T0 + 3000)).toBeNull();
    expect(tierEvents().map((e) => e.tier)).toEqual(["warm", "hot"]);
  });

  it("pack_view and pack_checkout count as behaviour; two IST days count +3", () => {
    seedSource({ landing: "/" }); // 7
    buyerScoreNote({ kind: "page", path: "/" }, T0);
    expect(buyerScoreNote({ kind: "event", name: "pack_view" }, T0 + 1000)).toBe("warm"); // 10
    const stored = JSON.parse(window.localStorage.getItem(BUYER_SCORE_KEY) as string);
    expect(stored.pack).toBe(true);
    expect(stored.days).toHaveLength(1);
    // next IST day: days = 2 -> +3 = 13 -> hot
    expect(buyerScoreNote({ kind: "page", path: "/" }, T0 + DAY)).toBe("hot");
  });

  it("never fires on /admin (page or address)", () => {
    seedSource(packsSource);
    expect(buyerScoreNote({ kind: "page", path: "/admin/students" }, T0)).toBeNull();
    setLocation("/admin/students");
    expect(buyerScoreNote({ kind: "page", path: "/packs" }, T0)).toBeNull();
    expect(tierEvents()).toHaveLength(0);
    expect(window.localStorage.getItem(BUYER_SCORE_KEY)).toBeNull();
  });

  it("never fires after this browser recorded a purchase", () => {
    seedSource(packsSource);
    window.localStorage.setItem(PURCHASE_SENT_LOCAL_KEY, JSON.stringify(["order_ABC123"]));
    expect(buyerScoreNote({ kind: "page", path: "/packs" }, T0)).toBeNull();
    expect(tierEvents()).toHaveLength(0);
    expect(fbqCalls).toHaveLength(0);
  });

  it("never fires when analytics is off (automated / loopback host)", () => {
    seedSource(packsSource);
    setLocation("/packs", "localhost");
    expect(buyerScoreNote({ kind: "page", path: "/packs" }, T0)).toBeNull();
    expect(tierEvents()).toHaveLength(0);
  });

  it("the payload carries only tier + score: no email, phone, uid or name; the stored counters are coarse", () => {
    seedSource(packsSource);
    buyerScoreNote({ kind: "page", path: "/packs" }, T0);
    const e = tierEvents()[0];
    const own = Object.keys(e).filter((k) => !k.startsWith("page_"));
    expect(own.sort()).toEqual(["score", "tier"]);
    expect(JSON.stringify(e)).not.toMatch(/@|email|phone|uid|name|\+91/i);
    const stored = window.localStorage.getItem(BUYER_SCORE_KEY) as string;
    expect(Object.keys(JSON.parse(stored)).sort()).toEqual(["cls", "days", "fired", "first", "lg", "pv", "v"]);
    expect(stored).not.toMatch(/@|email|phone|uid|utm_|gclid/i);
  });

  it("storage that throws: five page views announce at most once (persisted-first, page-session guard)", () => {
    seedSource(packsSource);
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation((k: string) => {
      if (k === BUYER_SCORE_KEY) throw new Error("QuotaExceededError");
    });
    try {
      for (let i = 0; i < 5; i++) buyerScoreNote({ kind: "page", path: "/packs" }, T0 + i * 1000);
    } finally {
      spy.mockRestore();
    }
    expect(tierEvents().length).toBeLessThanOrEqual(1);
    expect(fbqCalls.length).toBeLessThanOrEqual(1);
  });

  it("an existing customer (paid Premium / Board Pass, or an owned pack) is never announced", () => {
    seedSource(packsSource);
    customer.uid = "u1";
    customer.paid = true;
    expect(buyerScoreNote({ kind: "page", path: "/packs" }, T0)).toBeNull();
    customer.paid = false;
    customer.ownsPack = true;
    expect(buyerScoreNote({ kind: "page", path: "/packs" }, T0 + 1)).toBeNull();
    expect(tierEvents()).toHaveLength(0);
    expect(window.localStorage.getItem(BUYER_SCORE_KEY)).toBeNull();
    // a signed-in student who owns nothing is still a prospect
    customer.ownsPack = false;
    expect(buyerScoreNote({ kind: "page", path: "/packs" }, T0 + 2)).toBe("hot");
  });
});
