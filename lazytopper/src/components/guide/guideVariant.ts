/**
 * GUIDE-1 — the A/B split and the small device memories of the Byte guide. BANK-FREE and
 * tiny on purpose: Start-here imports it on every page it mounts on; the drawing code lives
 * in the lazily loaded guide chunk (ByteGuide.tsx / ZiggyStrip.tsx).
 *
 * ── THE SPLIT ─────────────────────────────────────────────────────────────────────────────
 * Deterministic per ACCOUNT, the same on every device and every visit:
 *
 *   h = fmix32( FNV-1a-32( "guide-1:" + uid ) )      variant = h % 2 === 0 ? "guide" : "control"
 *
 * FNV-1a alone is a poor bit-mixer in its low bit (the parity of the last character leaks
 * straight through), so the murmur3 finaliser `fmix32` is applied before taking the bit. The
 * salt "guide-1:" keeps this split independent of any other test hashed on the uid. Nothing
 * is stored to decide it and nothing about the uid leaves the device.
 *
 * ── TEST MODE ─────────────────────────────────────────────────────────────────────────────
 * Under Vitest (`import.meta.env.MODE === "test"`) the split is OFF unless a test turns it on
 * (`__setGuideAbForTests`): every account then gets exactly today's Start-here card with
 * today's events. Forty-odd existing suites (several of them page suites outside this lane)
 * render Start-here with fixed uids such as "u1"; they keep pinning today's behaviour. The
 * guide suites switch the split on and force each arm explicitly. Production and preview
 * builds are never in test mode.
 *
 * ── DEV-ONLY OVERRIDE ─────────────────────────────────────────────────────────────────────
 * `localStorage["lazytopper.guideVariantOverride"] = "guide" | "control"` forces an arm, but
 * ONLY in a Vite dev server (`import.meta.env.DEV`); a production build compiles the branch
 * away, so the key is ignored there.
 *
 * ── ADMIN PREVIEW (PREVIEW-1) ─────────────────────────────────────────────────────────────
 * `localStorage["lazytopper.guidePreview"] = { "arm": "guide" | "control", "until": <epoch ms> }`
 * forces an arm for ANY account signed in on THIS browser until `until` (7 days from when it
 * was set), in production too. It is written ONLY by the "Guide preview" panel on
 * /admin/students, which renders only after the server's ADMIN_FIREBASE_UIDS gate answered OK.
 * It is DEVICE state, not student data: sign-out does not clear it (the owner sets it as admin,
 * signs out, signs in as a test student). While it is active:
 *  - the guide's own analytics are SUPPRESSED (every guide_* event, ziggy_reaction, the GA4
 *    `guide_variant` user property and the `guide_variant_assigned` activity), so a preview
 *    never lands in the A/B numbers; non-guide events are untouched;
 *  - Start-here / Byte show even on an account with graded results, and Ziggy reacts on every
 *    live graded scorecard (no once-per-device marker), each with an "Admin preview" pill.
 * An expired or malformed value is ignored and removed.
 *
 * PRECEDENCE in `resolveGuideVariant`: test seam > admin preview > dev override > uid hash.
 */
import {
  trackGuideVariantAssigned,
  trackOnboardingEvent,
  type GuideVariant,
  type OnboardingEvent,
  type OnboardingEventParams,
} from "../../analytics/analytics";

export type { GuideVariant };

const SALT = "guide-1:";

function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** murmur3's 32-bit finaliser: every input bit reaches every output bit. */
function fmix32(h: number): number {
  let x = h >>> 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x85ebca6b) >>> 0;
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35) >>> 0;
  x ^= x >>> 16;
  return x >>> 0;
}

/** The arm an account is in. Pure; stable forever for a uid. */
export function guideVariantFor(uid: string): GuideVariant {
  return fmix32(fnv1a(SALT + uid)) % 2 === 0 ? "guide" : "control";
}

/** 8 hex chars — a device-local key suffix only (never the uid, never sent). */
export function guideAccountTag(uid: string): string {
  return fnv1a(uid).toString(16).padStart(8, "0");
}

let abOverrideForTests: boolean | null = null;
let variantOverrideForTests: GuideVariant | null = null;

/** Test seam: switch the split on/off (null = the default for the mode). */
export function __setGuideAbForTests(on: boolean | null, force: GuideVariant | null = null): void {
  abOverrideForTests = on;
  variantOverrideForTests = force;
}

export function guideAbActive(): boolean {
  if (abOverrideForTests !== null) return abOverrideForTests;
  return import.meta.env.MODE !== "test";
}

export const GUIDE_DEV_OVERRIDE_KEY = "lazytopper.guideVariantOverride";

function devOverride(): GuideVariant | null {
  if (!import.meta.env.DEV) return null;
  try {
    const v = window.localStorage.getItem(GUIDE_DEV_OVERRIDE_KEY);
    return v === "guide" || v === "control" ? v : null;
  } catch {
    return null;
  }
}

/* ── PREVIEW-1 — the admin's per-browser preview ───────────────────────────────────────── */

export const GUIDE_PREVIEW_KEY = "lazytopper.guidePreview";
/** How long one "Show Byte" / "Show control" lasts on this browser. */
export const GUIDE_PREVIEW_MS = 7 * 24 * 60 * 60 * 1000;

export interface GuidePreview {
  arm: GuideVariant;
  /** epoch ms; the preview is ignored (and removed) from this instant on. */
  until: number;
}

function removePreviewKey(): void {
  try {
    window.localStorage.removeItem(GUIDE_PREVIEW_KEY);
  } catch {
    /* blocked storage: nothing was stored either */
  }
}

/** The valid, unexpired preview on this browser, or null. An expired or malformed value is removed. */
export function readGuidePreview(now?: number): GuidePreview | null {
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(GUIDE_PREVIEW_KEY);
  } catch {
    return null;
  }
  // No key (every student's browser): return before the clock is read at all.
  if (raw === null) return null;
  const at = now ?? Date.now();
  try {
    const v = JSON.parse(raw) as Record<string, unknown> | null;
    const arm = v && typeof v === "object" ? v.arm : undefined;
    const until = v && typeof v === "object" ? v.until : undefined;
    if ((arm === "guide" || arm === "control") && typeof until === "number" && Number.isFinite(until) && until > at) {
      return { arm, until };
    }
  } catch {
    /* malformed: removed below */
  }
  removePreviewKey();
  return null;
}

/** True while a valid, unexpired admin preview is set on this browser. */
export function guidePreviewActive(): boolean {
  return readGuidePreview() !== null;
}

/** The admin panel's write: an arm for 7 days from `now`, or null (Off) to remove it. */
export function setGuidePreview(arm: GuideVariant | null, now: number = Date.now()): GuidePreview | null {
  if (arm === null) {
    removePreviewKey();
    return null;
  }
  const p: GuidePreview = { arm, until: now + GUIDE_PREVIEW_MS };
  try {
    window.localStorage.setItem(GUIDE_PREVIEW_KEY, JSON.stringify(p));
  } catch {
    return null; // blocked storage: no preview
  }
  return p;
}

/**
 * The arm for this signed-in account, or null (signed out, or the split is off).
 * Precedence: test seam > admin preview > dev override > uid hash.
 */
export function resolveGuideVariant(uid: string | null | undefined): GuideVariant | null {
  if (!uid || !guideAbActive()) return null;
  if (variantOverrideForTests) return variantOverrideForTests;
  const preview = readGuidePreview();
  if (preview) return preview.arm;
  return devOverride() ?? guideVariantFor(uid);
}

/* ── the guide's own analytics (suppressed under an admin preview) ───────────────────────── */

/** Every event the guide owns. Nothing else goes through `trackGuideEvent`. */
export type GuideEventName = Extract<
  OnboardingEvent,
  | "guide_shown"
  | "guide_option"
  | "guide_dismissed"
  | "guide_reopened"
  | "ziggy_reaction"
  // MOMENTS-1 — the moments and the "Hide mascots" switch (vendors only, like every guide event).
  | "guide_moment_shown"
  | "mascots_hidden"
  | "mascots_shown"
>;

/** The guide's events: today's `trackOnboardingEvent`, dropped while an admin preview is active. */
export function trackGuideEvent<E extends GuideEventName>(name: E, params: OnboardingEventParams[E]): void {
  if (guidePreviewActive()) return;
  trackOnboardingEvent(name, params);
}

/* ── once per account per device: the GA4 user property + the activity name ─────────────── */

/** localStorage `lazytopper.guideVariant.<tag>` = "1" once the arm was reported on this device. */
export const GUIDE_VARIANT_SENT_PREFIX = "lazytopper.guideVariant.";
const sentThisLoad = new Set<string>();

export function noteGuideVariantAssigned(uid: string, variant: GuideVariant): void {
  // PREVIEW-1: a previewed arm is not this account's arm — report nothing and write no marker,
  // so the account's REAL arm is still reported once the preview ends.
  if (guidePreviewActive()) return;
  try {
    const key = GUIDE_VARIANT_SENT_PREFIX + guideAccountTag(uid);
    if (sentThisLoad.has(key)) return;
    sentThisLoad.add(key);
    try {
      if (window.localStorage.getItem(key) === "1") return;
      window.localStorage.setItem(key, "1");
    } catch {
      /* blocked storage: the in-memory set still holds this page load */
    }
    trackGuideVariantAssigned(variant);
  } catch {
    /* analytics must never break the page */
  }
}

export function __resetGuideVariantSentForTests(): void {
  sentThisLoad.clear();
}

/* ── the corner chip ───────────────────────────────────────────────────────────────────── */

/** THIS TAB's sessionStorage: "1" once the student closed the corner chip with its own ×. */
export const GUIDE_CHIP_CLOSED_KEY = "lazytopper.guideChipClosed";

export function isGuideChipClosed(): boolean {
  try {
    return window.sessionStorage.getItem(GUIDE_CHIP_CLOSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function closeGuideChipForTab(): void {
  try {
    window.sessionStorage.setItem(GUIDE_CHIP_CLOSED_KEY, "1");
  } catch {
    /* blocked storage: closed for this mount only */
  }
}

/* ── is a focused guide open on this page? (the chip waits while one is) ─────────────────── */

let focusOpen = 0;
const listeners = new Set<() => void>();

export function setGuideFocusOpen(open: boolean): void {
  focusOpen = Math.max(0, focusOpen + (open ? 1 : -1));
  for (const l of listeners) l();
}

export function guideFocusOpen(): boolean {
  return focusOpen > 0;
}

export function subscribeGuideFocus(l: () => void): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
