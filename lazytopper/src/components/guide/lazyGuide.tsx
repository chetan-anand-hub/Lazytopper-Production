/**
 * GUIDE-1 — the ONLY doors into the guide chunk (./guideChunk.tsx). Each is a React.lazy over
 * the same dynamic import, so Vite emits ONE `guideChunk-<hash>.js` that is fetched only when
 * Byte or Ziggy is about to render. A failed chunk load renders nothing (never breaks a page).
 */
import { lazy, Suspense, useEffect, useState, type ComponentType } from "react";
import type { ScorecardScore } from "../results/scorecardVariants";
import { FIRST_GRADED_DELAY_MS, isFirstGradedEligible } from "../feedback/useFirstGradedFeedback";
import { firstResultState } from "../feedback/feedbackPromptModel";
import { loadLocalSessionRecords } from "../../services/sessionRecords";
import { guideAbActive, guideAccountTag, guidePreviewActive, resolveGuideVariant } from "./guideVariant";
import { ziggyReactionFor, type ZiggyReaction } from "./ziggyModel";
import { useMascotsHidden } from "./mascotsMute";

type Chunk = typeof import("./guideChunk");
const load = (): Promise<Chunk> => import("./guideChunk");

/** One named export of the chunk, as a lazy component; a failed load renders nothing. */
function lazyPart<P extends object>(pick: (m: Chunk) => ComponentType<P>) {
  const Nothing: ComponentType<P> = () => null;
  return lazy(() => load().then((m) => ({ default: pick(m) }), () => ({ default: Nothing })));
}

export const LazyByteGuide = lazyPart((m) => m.ByteGuide);
export const LazyGuideChip = lazyPart((m) => m.GuideChip);
const LazyZiggyStrip = lazyPart((m) => m.ZiggyStrip);

/** The signed-in student's uid from Firebase Auth (the feedbackPromptHost pattern), or null. */
async function currentUid(): Promise<string | null> {
  try {
    const { authClient } = await import("../../services/firebaseClient");
    const u = authClient?.currentUser ?? null;
    if (!u || u.isAnonymous || typeof u.uid !== "string" || !u.uid) return null;
    return u.uid;
  } catch {
    return null;
  }
}

/**
 * Review F4 — localStorage `lazytopper.ziggyShown.<tag>` = "1" once Ziggy reacted for this
 * account on this device (<tag> = 8-hex hash of the uid, never the uid), so a re-shown live
 * scorecard neither shows him again nor fires `ziggy_reaction` twice. Blocked storage → the
 * in-memory set holds this page load.
 */
export const ZIGGY_SHOWN_PREFIX = "lazytopper.ziggyShown.";
const ziggyShownThisLoad = new Set<string>();

function claimZiggy(uid: string): boolean {
  const key = ZIGGY_SHOWN_PREFIX + guideAccountTag(uid);
  if (ziggyShownThisLoad.has(key)) return false;
  try {
    if (window.localStorage.getItem(key) === "1") return false;
    window.localStorage.setItem(key, "1");
  } catch {
    /* blocked storage: this page load only */
  }
  ziggyShownThisLoad.add(key);
  return true;
}

export function __resetZiggyShownForTests(): void {
  ziggyShownThisLoad.clear();
}

/** Review F4 — the first-result check waits as long as the feedback card does (the record write
 *  of a slow persist seam has landed by then). */
export const ZIGGY_CHECK_DELAY_MS = FIRST_GRADED_DELAY_MS;

export interface ZiggyFirstResultProps {
  ask: boolean | undefined;
  deferred: boolean | undefined;
  allPending: boolean;
  score: ScorecardScore;
}

/**
 * GUIDE-1 §3D — Ziggy on the FIRST scorecard, guide arm only. Shows only when ALL hold:
 *  - the host opted in (`askFirstFeedback`: a LIVE just-graded scorecard, never history, never
 *    the tutor overlay) and the result is a real graded one (FIRST-FEEDBACK-1's own rule);
 *  - a signed-in, non-anonymous student whose account is in the `guide` arm;
 *  - FIRST-FEEDBACK-1's `firstResultState` over the device's records says "first"
 *    (PREVIEW-1: skipped, with the once-per-device marker, while an admin preview is active).
 * It renders INSIDE the scorecard, in the flow above the score (never over a number, never a
 * modal), so it cannot collide with the "Was this useful?" card (its own fixed layer, 1.5 s later).
 */
export function ZiggyFirstResult({ ask, deferred, allPending, score }: ZiggyFirstResultProps) {
  const eligible = guideAbActive() && isFirstGradedEligible({ ask, deferred, allPending, score });
  const [reaction, setReaction] = useState<ZiggyReaction | null>(null);
  const kind = score.kind;
  const a = score.kind === "marks" ? score.awarded : score.mcqCorrect;
  const b = score.kind === "marks" ? score.total : score.mcqAnswered;
  // MOMENTS-1 PART 0 — "Hide mascots" on this device: no Ziggy (the scorecard is the plain one).
  const mascotsHidden = useMascotsHidden();

  useEffect(() => {
    if (!eligible) return;
    let live = true;
    const t = setTimeout(() => {
      void (async () => {
        const uid = await currentUid();
        if (!live || !uid || resolveGuideVariant(uid) !== "guide") return;
        // PREVIEW-1: under an admin preview ("Show Byte") Ziggy reacts on EVERY live graded
        // scorecard: no first-result check, and the once-per-device marker is neither read nor
        // written (so the account's real first result still gets him after the preview ends).
        const preview = guidePreviewActive();
        if (!preview && firstResultState(loadLocalSessionRecords(uid), Date.now()) !== "first") return;
        const r = ziggyReactionFor(score);
        if (!r || (!preview && !claimZiggy(uid))) return;
        setReaction(r);
      })();
    }, ZIGGY_CHECK_DELAY_MS);
    return () => {
      live = false;
      clearTimeout(t);
    };
    // The reaction is decided once per result (its kind and its two numbers).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eligible, kind, a, b]);

  if (!reaction || mascotsHidden) return null;
  return (
    <Suspense fallback={null}>
      <LazyZiggyStrip reaction={reaction} />
    </Suspense>
  );
}
