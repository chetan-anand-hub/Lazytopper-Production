/**
 * ASK-FIX-1 — the PURE half of the trial-ended screen ("Your free week is over").
 *
 * WHY THIS EXISTS. Until now the only thing a student whose trial had ended ever got was the
 * why-not-upgrading feedback card, mounted on Home only (`useTrialEndFeedback`), behind
 * hydration, behind a 24-hour quiet period, and one-shot per device. It asked a question; it never
 * made the ask. This screen makes the ask — on the first visit after the end, on any main page the
 * shell mounts it on — and the feedback card now follows "Continue with Basic".
 *
 * ★ HONEST BY CONSTRUCTION. The counts are the student's real graded session records since the
 * trial began (the same `countTrialActivity` the trial-ending banner uses): zero is said as zero.
 * No timer, no seat count, nothing pre-selected. Prices are read from config/pricing.ts by
 * ../pricing/boardPassOffer.ts.
 *
 * ★ ONCE PER STUDENT PER DEVICE. There is no per-student flag store the client may write (the
 * subscription record is server-owned), so "seen" is remembered on THIS device, keyed by uid and
 * by the trial's server-set start. A second device shows it once more; that is the honest cost of
 * not inventing a server flag. The localStorage value is DISMISSAL state only — never trial or
 * premium state (CLAUDE.md §7).
 */
import { trialEndFeedbackKey, type TrialEndFeedbackInput } from "../feedback/useTrialEndFeedback";
import type { TrialActivityCounts } from "./trialEndBannerModel";

export const TRIAL_END_SCREEN_KEY_PREFIX = "lazytopper.trialEndScreen.";

/** Routes that never show the screen: the student is already on the offer, signing in, or in admin. */
const EXCLUDED_PREFIXES = ["/pricing", "/login", "/welcome", "/admin"] as const;

export function trialEndScreenPathAllowed(pathname: string): boolean {
  return !EXCLUDED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export interface TrialEndScreenInput extends TrialEndFeedbackInput {
  pathname: string;
}

/**
 * The trial key (its server-set start) when the screen applies to this state, else null. Same
 * conditions as the feedback card — a signed-in student, hydrated cloud record, trial ended, not
 * paid, trial identifiable — plus an allowed route.
 */
export function trialEndScreenKey(input: TrialEndScreenInput): string | null {
  if (!trialEndScreenPathAllowed(input.pathname)) return null;
  return trialEndFeedbackKey(input);
}

export interface TrialEndScreenRecord {
  /** The trial key this record is about. */
  k: string;
}

function storageKey(uid: string): string {
  return TRIAL_END_SCREEN_KEY_PREFIX + uid;
}

export function readTrialEndScreen(uid: string): TrialEndScreenRecord | null {
  try {
    const raw = window.localStorage.getItem(storageKey(uid));
    if (!raw) return null;
    const v: unknown = JSON.parse(raw);
    if (v && typeof v === "object" && typeof (v as { k?: unknown }).k === "string") {
      return { k: (v as { k: string }).k };
    }
    return null;
  } catch {
    return null;
  }
}

/** Remember the screen was shown for this trial. Returns false when the device cannot store it. */
export function writeTrialEndScreen(uid: string, trialKey: string): boolean {
  try {
    window.localStorage.setItem(storageKey(uid), JSON.stringify({ k: trialKey }));
    return readTrialEndScreen(uid)?.k === trialKey;
  } catch {
    return false;
  }
}

/** The screen was shown in THIS page load (also covers a device that cannot store the record). */
let shownThisLoad = false;
export function trialEndScreenShownThisLoad(): boolean {
  return shownThisLoad;
}
export function markTrialEndScreenShownThisLoad(): void {
  shownThisLoad = true;
}
/** Test seam. */
export function __resetTrialEndScreenForTests(): void {
  shownThisLoad = false;
}

/** Has this device already shown the screen for this trial (in an earlier load or this one)? */
export function trialEndScreenSeen(uid: string, trialKey: string): boolean {
  return shownThisLoad || readTrialEndScreen(uid)?.k === trialKey;
}

/**
 * Should the Home feedback card hold back? It waits while the screen has yet to be shown (the
 * screen comes first) and while the screen is on screen in this load (the card follows "Continue
 * with Basic"). It runs on a LATER load once the screen has been seen.
 */
export function feedbackShouldDeferToScreen(uid: string | null | undefined, trialKey: string | null): boolean {
  if (!uid || !trialKey) return false;
  if (shownThisLoad) return true;
  return readTrialEndScreen(uid)?.k !== trialKey;
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/**
 * What the student did in the free week, as one sentence. Real counts; a zero is said as zero.
 * `null` counts (the records could not be read) return null: say nothing rather than a number.
 */
export function trialEndActivityLine(counts: TrialActivityCounts | null): string | null {
  if (!counts) return null;
  const parts: string[] = [];
  if (counts.checks > 0) parts.push(plural(counts.checks, "answer checked", "answers checked"));
  if (counts.tests > 0) parts.push(plural(counts.tests, "test taken", "tests taken"));
  if (counts.practiceSets > 0) parts.push(plural(counts.practiceSets, "practice set finished", "practice sets finished"));
  if (parts.length === 0) return "In your free week you didn't check an answer or take a test.";
  return `In your free week: ${parts.join(", ")}.`;
}
