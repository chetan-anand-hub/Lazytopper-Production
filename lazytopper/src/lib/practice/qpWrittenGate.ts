/**
 * GATE-QP-1 (owner ruling 19 Nov 2026) — graded Quick Practice (written practice answers marked) is BOARD PASS ONLY for a free /
 * Basic account (a Test Series-only buyer is also tier "free": a pack never changes the tier). The TRIAL keeps it (the trial shows
 * the full product) and the Board Pass is unchanged. The SERVER is authoritative (limits.cjs gradingGate answers the ordinary
 * premium_required 402); this module only lets the client show the Board Pass screen BEFORE the student writes or uploads.
 *
 * Untouched on purpose: MCQ taps (scored instantly in the browser), every solution, the Answer Checker, Worksheet, Chapter Test and
 * Full Mock. Kill switch: VITE_GATE_QP_DISABLED=1 restores the previous behaviour (no wall).
 *
 * PURE: no hooks, no network, no clock. Fails OPEN: the wall needs a POSITIVE "this signed-in account is on the free tier" read
 * from a hydrated subscription; anything unknown shows no wall (the server then decides, exactly as it does for any request).
 */

export function gateQpDisabled(): boolean {
  return import.meta.env?.VITE_GATE_QP_DISABLED === "1";
}

export interface QpWallInput {
  /** The signed-in student's uid ("" / null when signed out: the sign-in-to-grade offer handles that student, not this wall). */
  uid: string | null | undefined;
  /** The subscription was read from the cloud for this uid (never decide from the local cache alone). */
  hydrated: boolean;
  /** "free" | "trial" | "premium". */
  tier: string | null | undefined;
}

/** True only for a signed-in, hydrated, tier-"free" account (Basic, an expired trial, a Test Series-only buyer). */
export function qpWrittenWallApplies(i: QpWallInput): boolean {
  if (gateQpDisabled()) return false;
  return Boolean(i.uid) && i.hydrated === true && i.tier === "free";
}

export const QP_WALL_TITLE = "Getting your practice answers marked step by step comes with the Board Pass";
export const QP_WALL_BODY = "Multiple-choice questions are still scored the moment you tap, and every question and solution is here to read.";
export const QP_WALL_PATH = "/board-pass";
