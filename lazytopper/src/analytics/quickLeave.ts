/**
 * QUICK-LEAVE-1 (owner ruling 26 Nov 2026) — the REAL bounce number: visitors who leave WITHOUT engaging.
 *
 * Vercel's bounce rate counts every one-page visit, including a buyer who pays in the Razorpay sheet on the landing page.
 * The owner wants "left without engaging" under 30%, by source and landing page. A VISIT is the first page load of a browser
 * TAB session (tab-scoped sessionStorage flag: a reload or a later landing in the same tab is not a second visit). ENGAGED is
 * the existing engagedVisit.ts rule, untouched: analytics.ts calls `quickLeaveEngaged()` when that rule fires.
 *
 * ONE small first-party beacon per visit to OUR server (`/api/metrics/visit`), nothing to any vendor:
 *   { path, source, engaged, inApp, device }   (+ `late: true` in the one correction case below)
 *   - path   the REDACTED router path of the landing (normalisePath: no query, no hash, ids redacted);
 *   - source a closed bucket (google_ads | google_organic | meta | youtube | llm | direct | other) — never a referrer host,
 *            a utm value or a click id;
 *   - inApp  Facebook / Instagram in-app browser, a boolean; device "mobile" | "desktop".
 *   No uid, no email, no IP, no user agent, no query string, no storage beyond the one tab flag.
 *
 * WHEN: the moment the visit becomes engaged (engaged: true); otherwise when the page is hidden / left (engaged: false).
 * A tab that is only hidden may come back and engage, so a visit already reported as a leave that later engages sends ONE
 * correction (`engaged: true, late: true`); the server then moves it from "left" to "engaged", so visits never double count.
 *
 * Skipped: automated contexts, /admin/*, the owner's own device (the `lazytopper.internal` flag). Never throws.
 * KILL SWITCH: VITE_QUICK_LEAVE_DISABLED=1 — nothing is read, listened to or sent (this module is inert).
 */
import { inAppBrowser } from "../utils/inAppBrowser";

export const VISIT_METRICS_ENDPOINT = "/api/metrics/visit";
/** The one tab flag (sessionStorage): this tab session's visit has already been recorded. */
export const QUICK_LEAVE_TAB_KEY = "lazytopper.qlVisit";

export type VisitSourceBucket = "google_ads" | "google_organic" | "meta" | "youtube" | "llm" | "direct" | "other";

export interface VisitBeacon {
  path: string;
  source: VisitSourceBucket;
  engaged: boolean;
  inApp: boolean;
  device: "mobile" | "desktop";
  late?: true;
}

/** Client kill switch: VITE_QUICK_LEAVE_DISABLED=1 (or true/on/yes) -> inert. */
export function isQuickLeaveDisabled(): boolean {
  try {
    const raw: unknown = import.meta.env.VITE_QUICK_LEAVE_DISABLED;
    return /^(1|true|on|yes)$/i.test(raw === undefined || raw === null ? "" : String(raw).trim());
  } catch {
    return false;
  }
}

function hostOf(referrer: string): string {
  try {
    const url = new URL(referrer);
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";
    return url.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

const hostIs = (host: string, base: string): boolean => host === base || host.endsWith(`.${base}`);
const LLM_HOSTS = ["chatgpt.com", "chat.openai.com", "openai.com", "perplexity.ai", "claude.ai", "gemini.google.com", "copilot.microsoft.com", "bard.google.com"];
const LLM_UTM = /^(chatgpt|openai|perplexity|claude|gemini|copilot)/i;

/**
 * PURE. Which closed bucket does this landing belong to? Reads only the click-id / utm_source / utm_medium PRESENCE and the
 * referrer HOST; returns a label, never the values. Order matters: a paid click wins over any referrer.
 */
export function bucketVisitSource(search: string, referrer: string, ownHost: string): VisitSourceBucket {
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(search || "");
  } catch {
    params = new URLSearchParams();
  }
  const utmSource = (params.get("utm_source") || "").trim().toLowerCase();
  const utmMedium = (params.get("utm_medium") || "").trim().toLowerCase();
  const has = (k: string) => (params.get(k) || "") !== "";
  const host = hostOf(String(referrer || ""));
  const own = String(ownHost || "").toLowerCase().replace(/^www\./, "");
  const isOwnHost = host !== "" && own !== "" && hostIs(host, own);

  if (has("gclid") || has("gbraid") || has("wbraid")) return "google_ads";
  if ((utmSource === "google" || utmSource === "adwords") && /^(cpc|ppc|paid|paidsearch|paid_search|display)$/.test(utmMedium)) return "google_ads";
  if (has("fbclid") || /^(facebook|fb|instagram|ig|meta)$/.test(utmSource)) return "meta";
  if (host && (hostIs(host, "facebook.com") || hostIs(host, "instagram.com") || hostIs(host, "fb.com") || hostIs(host, "fb.me"))) return "meta";
  if (utmSource === "youtube" || (host && (hostIs(host, "youtube.com") || hostIs(host, "youtu.be")))) return "youtube";
  if (LLM_UTM.test(utmSource) || (host && LLM_HOSTS.some((h) => hostIs(host, h)))) return "llm";
  if (host && /(^|\.)google\.[a-z.]+$/.test(host)) return "google_organic";
  if (utmSource !== "") return "other";
  if (host === "" || isOwnHost || hostIs(host, "firebaseapp.com") || hostIs(host, "web.app")) return "direct";
  return "other";
}

/** PURE. The beacon body: only the closed fields, nothing else. */
export function buildVisitBeacon(
  input: { path: string; source: VisitSourceBucket; engaged: boolean; userAgent: string; late?: boolean },
): VisitBeacon {
  const app = inAppBrowser(input.userAgent, false);
  const beacon: VisitBeacon = {
    path: input.path,
    source: input.source,
    engaged: input.engaged,
    inApp: app === "facebook" || app === "instagram",
    device: /Mobi|Android|iPhone|iPad|iPod/i.test(input.userAgent || "") ? "mobile" : "desktop",
  };
  if (input.late) beacon.late = true;
  return beacon;
}

interface Visit {
  path: string;
  source: VisitSourceBucket;
  userAgent: string;
  engaged: boolean;
  leftSent: boolean;
  engagedSent: boolean;
}

let visit: Visit | null = null;
let started = false;

function post(beacon: VisitBeacon): void {
  try {
    const body = JSON.stringify(beacon);
    const nav = window.navigator;
    if (typeof nav.sendBeacon === "function" && nav.sendBeacon(VISIT_METRICS_ENDPOINT, body)) return;
    void fetch(VISIT_METRICS_ENDPOINT, { method: "POST", body, keepalive: true, credentials: "omit" }).catch(() => undefined);
  } catch {
    /* a metric is never worth a broken page */
  }
}

function sendLeft(): void {
  if (!visit || visit.engagedSent || visit.leftSent) return;
  visit.leftSent = true;
  post(buildVisitBeacon({ path: visit.path, source: visit.source, engaged: false, userAgent: visit.userAgent }));
}

function onHidden(): void {
  try {
    if (document.visibilityState === "hidden") sendLeft();
  } catch {
    /* ditto */
  }
}

/**
 * Called by trackPageview on every page view; acts ONCE per document, on the first one (the landing — the only moment its
 * path is the landing's). `routerPath` is the REDACTED router path. Must only be called when analytics is enabled.
 */
export function startQuickLeaveWatch(routerPath: string, isAdminPath: boolean, isInternal: boolean): void {
  if (started) return;
  started = true;
  try {
    if (isQuickLeaveDisabled() || isAdminPath || isInternal) return;
    if (typeof window === "undefined" || typeof document === "undefined") return;
    try {
      if (window.sessionStorage.getItem(QUICK_LEAVE_TAB_KEY) !== null) return; // this tab session's visit was already counted
      window.sessionStorage.setItem(QUICK_LEAVE_TAB_KEY, "1");
    } catch {
      /* blocked storage: count the load */
    }
    visit = {
      path: routerPath,
      source: bucketVisitSource(window.location.search, document.referrer, window.location.hostname),
      userAgent: String(window.navigator?.userAgent || ""),
      engaged: false,
      leftSent: false,
      engagedSent: false,
    };
    window.addEventListener("pagehide", sendLeft, { capture: true });
    document.addEventListener("visibilitychange", onHidden);
  } catch {
    visit = null;
  }
}

/** The existing engaged_visit rule fired (analytics.ts): report it, once. */
export function quickLeaveEngaged(): void {
  try {
    if (!visit || visit.engagedSent) return;
    visit.engaged = true;
    visit.engagedSent = true;
    post(buildVisitBeacon({ path: visit.path, source: visit.source, engaged: true, userAgent: visit.userAgent, late: visit.leftSent }));
    window.removeEventListener("pagehide", sendLeft, { capture: true });
    document.removeEventListener("visibilitychange", onHidden);
  } catch {
    /* ditto */
  }
}

/** Test seam. */
export function __resetQuickLeaveForTests(): void {
  try {
    window.removeEventListener("pagehide", sendLeft, { capture: true });
    document.removeEventListener("visibilitychange", onHidden);
  } catch {
    /* ditto */
  }
  visit = null;
  started = false;
}
