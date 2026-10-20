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
 */
import { trackGuideVariantAssigned, type GuideVariant } from "../../analytics/analytics";

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

/** The arm for this signed-in account, or null (signed out, or the split is off). */
export function resolveGuideVariant(uid: string | null | undefined): GuideVariant | null {
  if (!uid || !guideAbActive()) return null;
  if (variantOverrideForTests) return variantOverrideForTests;
  return devOverride() ?? guideVariantFor(uid);
}

/* ── once per account per device: the GA4 user property + the activity name ─────────────── */

/** localStorage `lazytopper.guideVariant.<tag>` = "1" once the arm was reported on this device. */
export const GUIDE_VARIANT_SENT_PREFIX = "lazytopper.guideVariant.";
const sentThisLoad = new Set<string>();

export function noteGuideVariantAssigned(uid: string, variant: GuideVariant): void {
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
