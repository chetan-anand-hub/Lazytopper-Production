/**
 * SPEED-CI-2 — moved here from ./ciDemoChunk.tsx UNCHANGED, so CiDemoCard's eager first-visit preview asks exactly
 * the question the lazy card asks ("will the ladder lead?") and the two can never disagree.
 */
import { guidePlanFor } from "../guide/guideInputs";
import { parseChallengeId } from "./challengeModel";

/**
 * LADDER-REACH-1 — the one-minute ladder leads for EVERY visitor the card is shown to (an ad arrival that qualifies by
 * `ciDemoModel`), except a CBQ arrival, which keeps today's sample picker (owner rule 30 Oct: CBQ arrivals see CBQ first;
 * GUIDE-1's intent map encodes that as intent "cbq" and is read, never changed). Before this, the ladder led only when
 * the map's FIRST option was "check_one", so any ad whose utm_content said sample / mock / preboard / quick / mcq / tap /
 * pack (or a ?quick=1 URL) was classed papers / packs / quick and fell back to the picker: ~1% of arrivals saw the ladder.
 * "Watch a sample get marked" stays reachable from the ladder (onWatch).
 */
export function ladderLeads(uid: string | null | undefined, forced: boolean): boolean {
  if (forced) return true;
  // FRIEND-CHALLENGE-1 - a friend's challenge link (a valid-shaped id) leads with the ladder; the ladder itself
  // falls back to its normal starter when the id resolves to nothing.
  try {
    if (typeof window !== "undefined" && parseChallengeId(window.location.search)) return true;
  } catch {
    /* no param */
  }
  try {
    return guidePlanFor("check_improve", uid ?? null).intent !== "cbq";
  } catch {
    return false;
  }
}

/** A friend's challenge link names a question (a valid-shaped id): the ladder then loads THAT question, not a starter. */
export function hasChallengeParam(): boolean {
  try {
    return typeof window !== "undefined" && parseChallengeId(window.location.search) !== null;
  } catch {
    return false;
  }
}
