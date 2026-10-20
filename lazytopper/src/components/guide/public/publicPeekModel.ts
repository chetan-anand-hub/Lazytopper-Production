/**
 * GUIDE-PUBLIC-1 — Byte peeks in on the PUBLIC chapter pages (`/notes/<chapter>`, the topic hub).
 * The pure rules and the small device / tab memories. BANK-FREE and tiny on purpose: the two
 * pages import ./PublicPeek.tsx (which imports this) statically; everything Byte DRAWS lives in
 * the lazily loaded ./publicPeekChunk.tsx.
 *
 * ── WHO SEES HIM ──────────────────────────────────────────────────────────────────────────
 *   signed in  → the account's GUIDE-1 arm (`resolveGuideVariant(uid)`): guide → Byte, control →
 *                nothing on screen.
 *   signed out → a per-DEVICE arm, localStorage `lazytopper.guidePublicArm` = "guide" | "control",
 *                assigned ONCE, 50/50, from `crypto.getRandomValues` (never Math.random). It is a
 *                device key: sign-out does not clear it. The arm is copied into this tab's
 *                `lazytopper.guideIntent` record (`public_arm`) so a sign-up that follows can be
 *                attributed.
 * Both arms fire `guide_public_shown` at the same trigger moment, so both count alike.
 *
 * ── WHEN ──────────────────────────────────────────────────────────────────────────────────
 * After the page is idle AND the reader has scrolled ≥ 40 % of the article or spent 20 s,
 * whichever first. Once per tab per page type (sessionStorage `lazytopper.guidePublicPeek.<page>`);
 * after his × he does not come back in that tab.
 */
import { GUIDE_INTENT_KEY, VISIT_SOURCE_KEY } from "../../../analytics/visitSource";
import type { GuidePublicOption, GuidePublicPage, GuideVariant } from "../../../analytics/analytics";
import { isSafeInternalPath } from "../../../utils/safeInternalPath";
import { guidePreviewActive, readGuidePreview } from "../guideVariant";

export type { GuidePublicOption, GuidePublicPage };

/* ── PREVIEW-1 ─────────────────────────────────────────────────────────────────────────── */

/**
 * PREVIEW-1 (#1279): the owner's per-browser admin preview (`guidePreviewActive()`). Under it
 * every guide_public_* event and the GA4 `guide_public_arm` property are suppressed
 * (PublicPeek.tsx / publicPeekChunk.tsx; trackOnboardingEvent itself drops only start_here_*),
 * the peek shows an "Admin preview" pill, and a SIGNED-OUT preview takes the previewed arm
 * instead of this device's arm (no device arm is drawn or written, nothing is copied into the
 * intent record), so the owner can see the public peek without touching the test.
 */
export function previewOn(): boolean {
  return guidePreviewActive();
}

/** The previewed arm while a valid preview is set on this browser, else null. */
export function previewArm(): GuideVariant | null {
  return readGuidePreview()?.arm ?? null;
}

/* ── the trigger ───────────────────────────────────────────────────────────────────────── */

/** The reader has scrolled this far through the article … */
export const PEEK_SCROLL_FRACTION = 0.4;
/** … or spent this long on the page (whichever first; the page must also be idle). */
export const PEEK_DWELL_MS = 20_000;

/**
 * How far through the article the reader has scrolled, 0..1, from the article's bounding box
 * and the viewport height (container-independent: the page may scroll the window or an inner
 * shell). An article that fits on one screen has nothing to scroll: 0 (only the dwell time
 * can trigger then).
 */
export function articleScrollFraction(rect: { top: number; height: number }, viewportHeight: number): number {
  const scrollable = rect.height - viewportHeight;
  if (!(scrollable > 0)) return 0;
  const passed = -rect.top;
  return Math.max(0, Math.min(1, passed / scrollable));
}

export function peekTriggerReached(idle: boolean, fraction: number, dwellMs: number): boolean {
  return idle && (fraction >= PEEK_SCROLL_FRACTION || dwellMs >= PEEK_DWELL_MS);
}

/* ── the signed-out device arm ─────────────────────────────────────────────────────────── */

export const GUIDE_PUBLIC_ARM_KEY = "lazytopper.guidePublicArm";

/** One random byte → an arm. 0..127 guide, 128..255 control: exactly 50/50. */
export function armFromByte(byte: number): GuideVariant {
  return (byte & 0xff) < 128 ? "guide" : "control";
}

/** A fresh random byte from the platform CSPRNG, or null when there is none. */
function randomByte(): number | null {
  try {
    const c = globalThis.crypto;
    if (!c || typeof c.getRandomValues !== "function") return null;
    return c.getRandomValues(new Uint8Array(1))[0];
  } catch {
    return null;
  }
}

export function readPublicArm(): GuideVariant | null {
  try {
    const v = window.localStorage.getItem(GUIDE_PUBLIC_ARM_KEY);
    return v === "guide" || v === "control" ? v : null;
  } catch {
    return null;
  }
}

/** In-memory arm for a device whose storage is blocked (this page load only). */
let memoryArm: GuideVariant | null = null;

/**
 * This device's arm, assigning it once when there is none (`fresh` = it was assigned just now,
 * the moment to report the GA4 user property). No CSPRNG → null (no arm, nothing shows, nothing
 * is reported): an arm is never invented from a weak source.
 */
export function ensurePublicArm(): { arm: GuideVariant; fresh: boolean } | null {
  const stored = readPublicArm();
  if (stored) return { arm: stored, fresh: false };
  if (memoryArm) return { arm: memoryArm, fresh: false };
  const byte = randomByte();
  if (byte === null) return null;
  const arm = armFromByte(byte);
  try {
    window.localStorage.setItem(GUIDE_PUBLIC_ARM_KEY, arm);
  } catch {
    /* blocked storage: this page load only */
  }
  memoryArm = arm;
  return { arm, fresh: true };
}

/**
 * Copy the arm into this tab's `lazytopper.guideIntent` record (analytics/visitSource.ts writes
 * it at landing) as `public_arm`. The record's own fields are left exactly as they are; a tab
 * with no record yet gets one seeded from the visit source's three coarse fields (or nulls).
 */
export function copyArmToIntent(arm: GuideVariant): void {
  try {
    const ss = window.sessionStorage;
    let rec: Record<string, unknown> = {};
    const raw = ss.getItem(GUIDE_INTENT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) rec = parsed as Record<string, unknown>;
    } else {
      const vs = ss.getItem(VISIT_SOURCE_KEY);
      const v = vs ? (JSON.parse(vs) as Record<string, unknown>) : {};
      const str = (x: unknown): string | null => (typeof x === "string" && x ? x : null);
      rec = { landing: str(v.landing), utm_content: str(v.utm_content), utm_campaign: str(v.utm_campaign) };
    }
    rec.public_arm = arm;
    ss.setItem(GUIDE_INTENT_KEY, JSON.stringify(rec));
  } catch {
    /* blocked storage / a malformed record: attribution is simply not carried */
  }
}

export function __resetPublicArmForTests(): void {
  memoryArm = null;
}

/* ── once per tab per page type ────────────────────────────────────────────────────────── */

/** THIS TAB's sessionStorage: "1" once the peek moment happened on that page type. */
export const GUIDE_PUBLIC_PEEK_PREFIX = "lazytopper.guidePublicPeek.";
const peekedThisLoad = new Set<string>();

export function peekUsedInTab(page: GuidePublicPage): boolean {
  const key = GUIDE_PUBLIC_PEEK_PREFIX + page;
  if (peekedThisLoad.has(key)) return true;
  try {
    return window.sessionStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

export function markPeekUsedInTab(page: GuidePublicPage): void {
  const key = GUIDE_PUBLIC_PEEK_PREFIX + page;
  peekedThisLoad.add(key);
  try {
    window.sessionStorage.setItem(key, "1");
  } catch {
    /* blocked storage: this page load only */
  }
}

export function __resetPeekUsedForTests(): void {
  peekedThisLoad.clear();
}

/* ── what Byte says and offers ─────────────────────────────────────────────────────────── */

export interface PeekChapter {
  slug: string;
  name: string;
  subject: "Maths" | "Science";
}

export const PUBLIC_PEEK_COPY = {
  notesLine: "Want this chapter's important questions?",
  hubLine: (name: string) => `Doing ${name}? I can help.`,
  open: "Open Byte's suggestions",
  close: "Close Byte",
  panelHeading: "Byte's suggestions",
  important: (name: string) => `Important questions for ${name}`,
  importantSub: "The ones boards keep asking",
  checkFree: "Check one answer free",
  checkSignedIn: "Check one answer",
  checkSub: "See where marks slip",
  quick: (name: string) => `5 quick questions on ${name}`,
  quickSubOut: "Free account · about 2 min",
  quickSubIn: "Tap to answer · about 2 min",
  quickFailed: "Couldn't get the questions. Try again?",
  /** PREVIEW-1 — so a screenshot can never pass for a real visitor's view. */
  adminPreview: "Admin preview",
} as const;

export function peekLine(page: GuidePublicPage, chapter: PeekChapter): string {
  return page === "notes" ? PUBLIC_PEEK_COPY.notesLine : PUBLIC_PEEK_COPY.hubLine(chapter.name);
}

export interface PeekOption {
  id: GuidePublicOption;
  title: string;
  sub: string;
  /** route → navigate to `path`; quick → pick the chapter's Start-here set, then go. */
  action: { kind: "route"; path: string } | { kind: "quick" };
}

/**
 * The chapter's important questions: the HPQ page scoped to the chapter by `?topic=<slug>` —
 * the same deep link Exam Trends uses (ExamTrendsRanked.tsx goPredictedTopic). Route:
 * `/highly-probable/:grade/:subject` (App.tsx). With no chapter slug, subject level.
 */
export function importantPath(chapter: { slug?: string | null; subject: "Maths" | "Science" }): string {
  const base = `/highly-probable/10/${chapter.subject}`;
  return chapter.slug ? `${base}?topic=${encodeURIComponent(chapter.slug)}` : base;
}

/** At most three options, every one a real route; "quick" only when the chapter can host a set. */
export function peekOptions(args: { chapter: PeekChapter; signedIn: boolean; quickOffered: boolean }): PeekOption[] {
  const { chapter, signedIn, quickOffered } = args;
  const out: PeekOption[] = [
    {
      id: "important",
      title: PUBLIC_PEEK_COPY.important(chapter.name),
      sub: PUBLIC_PEEK_COPY.importantSub,
      action: { kind: "route", path: importantPath(chapter) },
    },
    {
      id: "check_one",
      title: signedIn ? PUBLIC_PEEK_COPY.checkSignedIn : PUBLIC_PEEK_COPY.checkFree,
      sub: PUBLIC_PEEK_COPY.checkSub,
      action: { kind: "route", path: "/check-improve" },
    },
  ];
  if (quickOffered) {
    out.push({
      id: "quick",
      title: PUBLIC_PEEK_COPY.quick(chapter.name),
      sub: signedIn ? PUBLIC_PEEK_COPY.quickSubIn : PUBLIC_PEEK_COPY.quickSubOut,
      action: { kind: "quick" },
    });
  }
  return out.slice(0, 3);
}

/**
 * Signed out: the Start-here practice path goes behind sign-in, as `/login?redirect=<path>`.
 * Safe redirect only (CLAUDE.md §5): anything that is not an internal path → plain `/login`.
 */
export function loginThen(target: string): string {
  if (!isSafeInternalPath(target)) return "/login";
  return `/login?redirect=${encodeURIComponent(target)}`;
}
