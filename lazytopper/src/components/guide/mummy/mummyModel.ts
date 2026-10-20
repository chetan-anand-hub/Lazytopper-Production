/**
 * MUMMY-1 — the words, the timings and the small decisions of Mummy's journey on /for-parents
 * (prototype scene D, guide/v2.html). BANK-FREE and tiny on purpose: the page chunk imports it;
 * the drawing code (the rig) lives in the lazily loaded ./mummyChunk.tsx only.
 *
 * Every string the section shows is in MUMMY_COPY / MUMMY_BEATS, so the owner can edit the
 * copy in one place. Rules the copy keeps (pinned by MummyJourney.test.tsx): English with light
 * Hinglish only, never the word "Ask", no "½", no price, no seat count, no deadline.
 */
import { trackOnboardingEvent, type MummyBeatNumber } from "../../../analytics/analytics";
import { guidePreviewActive } from "../guideVariant";

export type { MummyBeatNumber };

/** The rig poses this section uses (a subset of POSES_BY_KIND.mummy; `stern` is never used). */
export type MummyPose = "worried" | "surprised" | "mhappy" | "mproud" | "laugh";

export interface MummyBeat {
  readonly beat: MummyBeatNumber;
  readonly pose: Exclude<MummyPose, "laugh">;
  /** What Mummy says (her speech bubble). */
  readonly line: string;
  readonly title: string;
  readonly text: string;
  /** The Next button's label; beat 4 has none (the page's two actions stand there instead). */
  readonly next: string | null;
}

export const MUMMY_BEATS: readonly MummyBeat[] = [
  {
    beat: 1,
    pose: "worried",
    line: "Where are my child's marks going?",
    title: "Marks cut, but where?",
    text: "The test came back. Nobody explained the lost marks.",
    next: "See the report",
  },
  {
    beat: 2,
    pose: "surprised", // the rig's `surprised` pose holds the phone prop
    line: "Oh! The report shows every step!",
    title: "Step by step, like CBSE",
    text: "Formula, working, unit: each step shows marks given or lost.",
    next: "What next?",
  },
  {
    beat: 3,
    pose: "mhappy",
    line: "Accha! So that's what to fix.",
    title: "Clear next steps",
    text: "Practice on exactly the steps that lost marks.",
    next: "After a week",
  },
  {
    beat: 4,
    pose: "mproud",
    line: "So proud of my child!",
    title: "Hand it to your child",
    text: "One tap sends a free answer check to your child's phone.",
    next: null,
  },
];

export const MUMMY_COPY = {
  heading: "From worry to pride",
  /** The dots' group label, and each dot's label. */
  steps: "The story, step by step",
  stepLabel: (n: number) => `Step ${n} of ${MUMMY_BEATS.length}`,
  /** Tapped: she laughs (prototype). */
  tapLine: "Hehe! Arre, careful!",
} as const;

/** Tap → `laugh` for this long, then back to the beat's pose (spec §2). */
export const MUMMY_LAUGH_MS = 1500;

/** The idle mount's upper bound (requestIdleCallback timeout / the fallback timer). */
export const MUMMY_IDLE_TIMEOUT_MS = 1500;

/**
 * Is the guide PREVIEW on (PREVIEW-1: an admin's valid, unexpired "Guide preview" on this browser,
 * `guidePreviewActive()` in ../guideVariant)? Then the mummy_* events are suppressed, so an admin
 * looking at the page never counts as a parent. ONLY the mummy_* events: the page's
 * `parent_share_click` (including the journey's share button) is NOT suppressed (controller ruling).
 */
export function mummyPreviewActive(): boolean {
  return guidePreviewActive();
}

/**
 * Draw Mummy? Not in an automated browser (`navigator.webdriver`): the prerender capture
 * (scripts/seo/captureStaticBodies.ts) renders every advertised page twice and fails a page
 * whose DOM differs between the runs. An animated rig writes new SVG attributes every frame, so
 * the captured section keeps its text and its fixed-size empty slot, and the SVG is drawn only
 * for a real visitor. Decorative only (aria-hidden): no content is withheld from anyone.
 */
export function shouldDrawMummy(): boolean {
  try {
    return !(typeof navigator !== "undefined" && navigator.webdriver === true);
  } catch {
    return false;
  }
}

/** prefers-reduced-motion, read without importing the rig (which must stay in the lazy chunk). */
export function mummyReducedMotion(): boolean {
  try {
    return typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/** `mummy_beat { beat }` — a visitor moved the story to this beat. Never under the preview. */
export function trackMummyBeat(beat: MummyBeatNumber): void {
  if (mummyPreviewActive()) return;
  trackOnboardingEvent("mummy_beat", { beat });
}

/** `mummy_tap` — a visitor tapped Mummy. Never under the preview. */
export function trackMummyTap(): void {
  if (mummyPreviewActive()) return;
  trackOnboardingEvent("mummy_tap", {});
}
