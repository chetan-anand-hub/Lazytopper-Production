import POINTS from "../config/buyerScorePoints.json";
import { ADMIN_PATH, analyticsEnabled, readPurchaseSent, routerPathOf, trackBuyerTier } from "./analytics";
import { storedVisitSourceForScore, type VisitSource } from "./visitSource";

/**
 * BUYER-SCORE-1 - the buyer-propensity score, so likely buyers can be put in a Google Ads (via GA4)
 * and a Meta audience, and each sign-up's score shows in admin Students. ANALYTICS ONLY: nothing in
 * purchase, entitlement, grading or any student-visible screen reads it.
 *
 * Points per level come from the 23 Nov 2026 scorecard (src/config/buyerScorePoints.json, the ONE table the
 * server also reads). classify / landing / hour are the rules of buyer_analysis_2026-11-23.py, ported as is.
 *
 * WHAT IS KEPT: one localStorage key (BUYER_SCORE_KEY) with coarse counters only: first-seen time, the
 * last source class + landing group, IST day keys (max 3), page-view count and five yes/no flags, and when
 * each tier was last announced. NEVER an email, phone, uid, name, query string or full URL. It is
 * analytics bookkeeping, not premium / trial state (CLAUDE.md s7).
 *
 * WHAT IS SENT: when the tier RISES to warm or hot, once per tier per 7 days: GA4 `buyer_tier`
 * {tier, score} and the Meta custom event BuyerTierWarm / BuyerTierHot (no value, no parameter) - both
 * through the existing analytics pipeline (trackBuyerTier), so its gates apply: no automated context, nothing
 * from /admin. Not after this browser recorded a purchase. Kill switch: VITE_BUYER_SCORE_DISABLED=1
 * (checked in analytics.ts before this module is even requested).
 *
 * Loaded lazily (dynamic import after idle) so the entry chunk does not grow.
 */

export const BUYER_SCORE_KEY = "lazytopper.buyerScore";
export const BUYER_TIER_REFIRE_MS = 7 * 24 * 60 * 60 * 1000;
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const MAX_DAYS = 3;

export type BuyerTier = "hot" | "warm" | "cold";

type PointTable = Readonly<Record<string, number>>;
const SOURCE_POINTS = POINTS.source as PointTable;
const LANDING_POINTS = POINTS.landing as PointTable;
const HOUR_POINTS = POINTS.hour as PointTable;
const B = POINTS.behaviour;

/** The fields the classifier reads; every one optional (a stored touch has no keys it did not carry). */
export interface SourceFields {
  ref?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  gclid?: boolean;
  fbclid?: boolean;
}

const lower = (v: unknown): string => (typeof v === "string" ? v.toLowerCase() : "");

export function classifySource(src: SourceFields | null | undefined): string {
  const s = src ?? {};
  const us = lower(s.utm_source);
  const um = lower(s.utm_medium);
  const uc = lower(s.utm_campaign);
  const ref = lower(s.ref);
  const g = s.gclid === true;
  const f = s.fbclid === true;
  if (["an", "meta", "facebook", "ig", "instagram"].includes(us) || f || ref.includes("facebook") || ref.includes("instagram")) {
    return "Meta";
  }
  if (us === "youtube" || ref.includes("youtube")) return "YouTube";
  if (us === "google" && um === "cpc") {
    const byCampaign: Record<string, string> = {
      search_pdf_packs: "GSearch PDF Packs",
      search_test_series: "GSearch Test Series",
      search_board_pass: "GSearch Board Pass",
      search_signups_v2: "GSearch Sign-ups v2",
    };
    return Object.prototype.hasOwnProperty.call(byCampaign, uc) ? byCampaign[uc] : "GSearch other";
  }
  if (g && (ref === "" || ref.includes("google") || ref.includes("syndicated"))) return "GSearch untagged";
  if (ref.includes("google")) return "Organic Google";
  if (["bing", "yahoo", "msn", "brave", "duckduck"].some((x) => ref.includes(x))) return "Bing/other search";
  if (us === "parent_share" || us === "whatsapp" || ref.includes("chatgpt") || us.includes("chatgpt")) {
    return "Share/WhatsApp/ChatGPT";
  }
  if (ref === "" && us === "") return "Direct/unknown";
  return "Other";
}

export function landingGroup(landing: string | null | undefined): string {
  const x = lower(landing);
  if (x === "") return "none";
  if (x === "/") return "home";
  if (x.startsWith("/pricing") || x.startsWith("/board-pass")) return "pricing/board-pass";
  if (x.startsWith("/for-parents")) return "for-parents";
  if (["/packs", "/cbq-packs", "/question-bank", "/mock-test"].some((p) => x.startsWith(p))) return "packs";
  if (x.startsWith("/test-series")) return "test-series";
  if (x.startsWith("/practice-hub")) return "practice-hub";
  if (x.startsWith("/check-improve")) return "answer-checker";
  if (["/notes", "/cbse", "/tutor"].some((p) => x.startsWith(p))) return "notes/SEO";
  if (["/login", "/welcome", "/browse"].some((p) => x.startsWith(p))) return "login";
  return "content (HPQ/trends/tests)";
}

export function istHour(ms: number): number {
  return new Date(ms + IST_OFFSET_MS).getUTCHours();
}

export function hourBlock(h: number): string {
  return h < 6 ? "00-06" : h < 9 ? "06-09" : h < 13 ? "09-13" : h < 17 ? "13-17" : h < 21 ? "17-21" : "21-24";
}

export function istDayKey(ms: number): string {
  return new Date(ms + IST_OFFSET_MS).toISOString().slice(0, 10);
}

const pointsFor = (table: PointTable, key: string): number => (Object.prototype.hasOwnProperty.call(table, key) ? table[key] : 0);

export function tierOf(points: number): BuyerTier {
  return points >= POINTS.tiers.hot ? "hot" : points >= POINTS.tiers.warm ? "warm" : "cold";
}

/** What the score is made of. Server-side rows use only the first three (no behaviour). */
export interface ScoreInput {
  sourceClass: string;
  landingGroup: string;
  /** Arrival hour, IST (0-23). */
  hour: number;
  viewedSellingPage?: boolean;
  openedPack?: boolean;
  startedCheckout?: boolean;
  activeDays?: number;
  pageViews?: number;
  /** A notes / SEO page was visited. */
  sawNotes?: boolean;
}

export function scoreOf(i: ScoreInput): number {
  let p = pointsFor(SOURCE_POINTS, i.sourceClass) + pointsFor(LANDING_POINTS, i.landingGroup) + pointsFor(HOUR_POINTS, hourBlock(i.hour));
  if (i.viewedSellingPage) p += B.viewedSellingPage;
  if (i.openedPack) p += B.openedPack;
  if (i.startedCheckout) p += B.startedCheckout;
  if ((i.activeDays ?? 0) >= 2) p += B.activeTwoDays;
  // Free practice only: after enough page views, nothing selling, no pack, no checkout and no notes was ever seen.
  if (
    (i.pageViews ?? 0) >= B.freePracticeOnlyMinPageViews &&
    !i.viewedSellingPage &&
    !i.openedPack &&
    !i.startedCheckout &&
    !i.sawNotes
  ) {
    p += B.freePracticeOnly;
  }
  return p;
}

/* ------------------------------------------------------------------ tracker */

export type BuyerNote = { kind: "page"; path: string } | { kind: "event"; name: string };

interface Stored {
  v: 1;
  first: number;
  cls?: string;
  lg?: string;
  days: string[];
  pv: number;
  sell?: boolean;
  notes?: boolean;
  pack?: boolean;
  co?: boolean;
  fired?: { warm?: number; hot?: number };
}

const SELLING = /^\/(?:pricing|board-pass|test-series)(?:\/|$)/;

function read(): Stored | null {
  try {
    const raw = window.localStorage.getItem(BUYER_SCORE_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as Partial<Stored> | null;
    if (!o || typeof o !== "object" || o.v !== 1 || typeof o.first !== "number" || !Array.isArray(o.days)) return null;
    return o as Stored;
  } catch {
    return null;
  }
}

function write(s: Stored): void {
  try {
    window.localStorage.setItem(BUYER_SCORE_KEY, JSON.stringify(s));
  } catch {
    /* blocked storage: no score, no event */
  }
}

function sourceNow(): { cls: string; lg: string } | null {
  const v: VisitSource | null = storedVisitSourceForScore();
  return v ? { cls: classifySource(v), lg: landingGroup(v.landing) } : null;
}

/** The score now for a stored state (exported for tests). */
export function scoreStored(s: Stored): number {
  return scoreOf({
    sourceClass: s.cls ?? "Direct/unknown",
    landingGroup: s.lg ?? "none",
    hour: istHour(s.first),
    viewedSellingPage: s.sell,
    openedPack: s.pack,
    startedCheckout: s.co,
    activeDays: s.days.length,
    pageViews: s.pv,
    sawNotes: s.notes,
  });
}

/**
 * Feed one page view or one tracked event. Never throws; never fires on /admin or after a purchase.
 * Returns the tier announced by THIS call, or null.
 */
export function buyerScoreNote(note: BuyerNote, nowMs: number = Date.now()): "warm" | "hot" | null {
  try {
    if (!analyticsEnabled()) return null;
    if (ADMIN_PATH.test(routerPathOf(window.location.pathname))) return null;
    if (note.kind === "page" && ADMIN_PATH.test(note.path)) return null;
    if (readPurchaseSent().length > 0) return null;

    const s: Stored = read() ?? { v: 1, first: nowMs, days: [], pv: 0 };
    const src = sourceNow();
    // Keep the best-known source: a later Direct never overwrites an earlier real one (the 7-day copy expires).
    if (src && (s.cls === undefined || s.cls === "Direct/unknown")) {
      s.cls = src.cls;
      s.lg = src.lg;
    }
    if (s.lg === undefined && note.kind === "page") s.lg = landingGroup(note.path);
    const day = istDayKey(nowMs);
    if (!s.days.includes(day)) s.days = [...s.days, day].slice(-MAX_DAYS);

    if (note.kind === "page") {
      s.pv += 1;
      if (SELLING.test(note.path)) s.sell = true;
      if (landingGroup(note.path) === "notes/SEO") s.notes = true;
    } else if (note.name === "pack_view") {
      s.pack = true;
    } else if (note.name === "begin_checkout" || note.name === "pack_checkout") {
      s.co = true;
    }

    const score = scoreStored(s);
    const tier = tierOf(score);
    let announced: "warm" | "hot" | null = null;
    if (tier !== "cold") {
      const fired = s.fired ?? {};
      const recent = (t: "warm" | "hot") => typeof fired[t] === "number" && nowMs - (fired[t] as number) < BUYER_TIER_REFIRE_MS;
      // Once per tier per 7 days, and never "warm" while a recent "hot" stands.
      if (!recent(tier) && !(tier === "warm" && recent("hot"))) {
        if (trackBuyerTier(tier, score)) {
          s.fired = { ...fired, [tier]: nowMs };
          announced = tier;
        }
      }
    }
    write(s);
    return announced;
  } catch {
    return null;
  }
}
