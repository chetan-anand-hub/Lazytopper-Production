/**
 * GUIDE-1 — the ONLY doors into the guide chunk (./guideChunk.tsx). Each is a React.lazy over
 * the same dynamic import, so Vite emits ONE `guideChunk-<hash>.js` that is fetched only when
 * Byte or Ziggy is about to render. A failed chunk load renders nothing (never breaks a page).
 */
import { lazy, Suspense, useEffect, useState, type ComponentType } from "react";
import { CompanionScoreSlot } from "./companion/companion";
import { canShowScene } from "./sceneGuard";
import type { ScorecardVariant } from "../results/scorecardVariants";
import { FIRST_GRADED_DELAY_MS, isFirstGradedEligible } from "../feedback/useFirstGradedFeedback";
import { firstResultState } from "../feedback/feedbackPromptModel";
import { loadLocalSessionRecords } from "../../services/sessionRecords";
import { guideAbActive, guideAccountTag, guidePreviewActive, resolveGuideVariant, trackGuideEvent } from "./guideVariant";
import { ziggyReactionFor, type ZiggyReaction } from "./ziggyModel";
import { scoreGuidePlan, type ScoreGuidePlan, type ScoreScene } from "./scoreGuideModel";
import { mascotsHidden as mascotsHiddenNow, useMascotsHidden } from "./mascotsMute";
import { useHoldStage, useStageHeld } from "./scoreGuideStage";

type Chunk = typeof import("./guideChunk");
const load = (): Promise<Chunk> => import("./guideChunk");

/** One named export of the chunk, as a lazy component; a failed load renders nothing. */
function lazyPart<P extends object>(pick: (m: Chunk) => ComponentType<P>) {
  const Nothing: ComponentType<P> = () => null;
  return lazy(() => load().then((m) => ({ default: pick(m) }), () => ({ default: Nothing })));
}

type LoadFail = { onLoadFail?: () => void };

/** As `lazyPart`, but a failed load ALSO calls `onLoadFail` (the scorecard slot then releases the
 *  stage it holds, so the sidebar's character is not hidden for nothing). */
function lazyPartReporting<P extends object>(pick: (m: Chunk) => ComponentType<P>) {
  const Failed: ComponentType<P & LoadFail> = ({ onLoadFail }) => {
    useEffect(() => {
      onLoadFail?.();
    }, [onLoadFail]);
    return null;
  };
  return lazy(() =>
    load().then(
      (m) => {
        const C = pick(m);
        const Loaded: ComponentType<P & LoadFail> = (props) => {
          const { onLoadFail: _unused, ...rest } = props;
          void _unused;
          return <C {...(rest as P)} />;
        };
        return { default: Loaded };
      },
      () => ({ default: Failed }),
    ),
  );
}

export const LazyByteGuide = lazyPart((m) => m.ByteGuide);
export const LazyGuideChip = lazyPart((m) => m.GuideChip);
const LazyZiggyStrip = lazyPartReporting((m) => m.ZiggyStrip);
const LazyScoreGuideBeats = lazyPartReporting((m) => m.ScoreGuideBeats);

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

/** GUIDE-SCORE-1 (owner: "EVERY scorecard") — how long the FIRST result's Ziggy strip holds before
 *  Byte's next step replaces it in the same slot (the strip's own bounce-back is 2.5 s). */
export const FIRST_STRIP_HOLD_MS = 4000;

/**
 * GUIDE-ALL-1 (22 Oct 2026, the A/B ended) — the arm no longer depends on WHO is signed in:
 * `resolveGuideVariant` returns the test seam / admin preview / dev override, else "guide", for
 * ANY uid. So the scorecard can decide SYNCHRONOUSLY, before the first paint, whether a character
 * will draw (and reserve its slot only then). The probe uid is never stored or sent.
 */
const ARM_PROBE_UID = "scorecard-arm-probe";
function scorecardArmIsGuide(): boolean {
  return resolveGuideVariant(ARM_PROBE_UID) === "guide";
}

export interface ScorecardGuideProps {
  variant: ScorecardVariant;
  /** The host's FIRST-FEEDBACK-1 opt-in (`askFirstFeedback`): a LIVE, just-graded scorecard. */
  ask: boolean | undefined;
  /** The host draws its own all-pending moment (MOMENTS-1 M6) inside the all-pending block. */
  hostOwnsUnreadAllPending?: boolean;
}

type Mode =
  | { kind: "deciding" }
  | { kind: "none" }
  | { kind: "first"; reaction: ZiggyReaction }
  | { kind: "every"; startAt: "ziggy" | "byte" }
  | { kind: "scene"; scene: ScoreScene; uid: string | null };

/**
 * ★ SCENES (owner ruling 23 Oct 2026 16:40 IST). Byte and Ziggy may stand TOGETHER only in a
 * short scene, at most ONE per app session (COMPANION-1's ../sceneGuard.ts). On a scorecard the
 * two candidates are the plan's `scene`, decided by COMPANION-1's own rule
 * (companionScoreMoment over the card's whole percentages): "comfort" below 40 %, "improvement"
 * ≥ 10 points over the previous same-total result the card prints (Full Mock ▲, Chapter Test ▲).
 *
 * DEFAULT: COMPANION-1's `CompanionScoreSlot` draws the duet in this slot when `canShowScene()`
 * holds (it marks the session's scene itself, when the duet is actually drawn); otherwise the
 * default Ziggy-then-Byte sequence plays. `registerScoreScene` swaps the renderer (tests; a future
 * scene) — `null` restores the default. The first graded result keeps its own Ziggy strip.
 */
export interface ScoreSceneProps {
  plan: ScoreGuidePlan;
  scene: ScoreScene;
  /** The signed-in student (CompanionScoreSlot draws for a guide-arm account only). */
  uid: string | null;
}
export interface ScoreSceneRegistration {
  canShowScene: () => boolean;
  markSceneShown: () => void;
  Scene: ComponentType<ScoreSceneProps>;
}

/** COMPANION-1's duet in the scorecard slot: comfort (low score) or the high five (improvement). */
function CompanionScene({ plan, uid }: ScoreSceneProps) {
  return (
    <CompanionScoreSlot
      uid={uid}
      pct={plan.pct}
      previousPct={plan.previousPct}
      // "Fix one thing": Byte's own next-step route (an internal path), never a guess.
      fixTo={plan.cta?.to ?? null}
      busy={false} // a scorecard: the test or question is over
    />
  );
}
const COMPANION_SCENE: ScoreSceneRegistration = {
  canShowScene: () => canShowScene({ busy: false }),
  markSceneShown: () => {}, // CompanionScoreSlot marks it when the duet is DRAWN
  Scene: CompanionScene,
};
let sceneRegistration: ScoreSceneRegistration = COMPANION_SCENE;
export function registerScoreScene(r: ScoreSceneRegistration | null): void {
  sceneRegistration = r ?? COMPANION_SCENE;
}

/** Could a scene play for this plan right now (read only — nothing is consumed)? */
function sceneAvailable(plan: ScoreGuidePlan | null): boolean {
  const r = sceneRegistration;
  if (!plan?.scene || !r || mascotsHiddenNow()) return false;
  try {
    return r.canShowScene();
  } catch {
    return false;
  }
}

/** The scene to play for this plan right now, consuming the session's one scene; else null. */
function claimScene(plan: ScoreGuidePlan | null): ScoreScene | null {
  const r = sceneRegistration;
  if (!plan?.scene || !r || mascotsHiddenNow()) return null;
  try {
    if (!r.canShowScene()) return null;
    r.markSceneShown();
    return plan.scene;
  } catch {
    return null; // a broken guard never breaks the scorecard: the default sequence plays
  }
}

/**
 * The scorecard's character slot — ONE place, rendered by the ONE <ResultsScorecard>, so it
 * reaches all six grading surfaces (Check & Improve single and multi, Worksheet, Chapter Test,
 * Full Mock, Quick Practice) through the same call site.
 *
 * GUIDE-1 §3D — the student's FIRST graded result gets today's Ziggy strip: the host opted in (a
 * live, just-graded scorecard), a signed-in student, FIRST-FEEDBACK-1's `firstResultState` says
 * "first" after the 1.5 s wait, once per account per device (PREVIEW-1: every live scorecard, no
 * marker, while an admin preview is active). GUIDE-SCORE-1: Byte's next step then REPLACES the
 * strip in the same slot (owner: EVERY scorecard gets it).
 *
 * GUIDE-SCORE-1 (owner ruling, 22 Oct 23:32 IST) — EVERY OTHER graded scorecard gets Ziggy's
 * reaction and then Byte's one next step, built ONLY from the scorecard's own numbers
 * (./scoreGuideModel.ts). "Hide mascots" → nothing; the admin preview's control arm → nothing.
 *
 * NO LAYOUT SHIFT, NO EMPTY GAP: whether a character will draw is decided SYNCHRONOUSLY on the
 * first render (the arm is "guide" for everyone since GUIDE-ALL-1, so it needs no uid), and the
 * slot is reserved only then. A hidden-mascots device, a control preview or a plan-less result
 * reserve nothing. ONE character at a time: MOMENTS-1 M11's Byte owns the card while it shows.
 */
export function ScorecardGuide({ variant, ask, hostOwnsUnreadAllPending }: ScorecardGuideProps) {
  const mascotsHidden = useMascotsHidden();
  const m11OnStage = useStageHeld("m11");
  const plan: ScoreGuidePlan | null = scoreGuidePlan(variant, { hostOwnsUnreadAllPending });
  const score = variant.score;
  const firstEligible =
    guideAbActive() && isFirstGradedEligible({ ask, deferred: variant.deferred, allPending: !!variant.allPending, score });
  // Decided synchronously, before the first paint.
  const willDraw =
    guideAbActive() && !variant.deferred && !mascotsHidden && (plan !== null || firstEligible) && scorecardArmIsGuide();
  const planKey = plan ? `${plan.seed}|${plan.situation}|${plan.byteStep}|${plan.ziggy.text}|${plan.cta?.to ?? ""}` : "";
  // A scene candidate (a scene that can show now — read only) starts "deciding": the reserved slot
  // stays empty and the default sequence is NOT mounted (so it reports nothing) until the scene is
  // claimed or declined, once the signed-in uid is known.
  const sceneCandidate = !firstEligible && sceneAvailable(plan);
  const initial = (): Mode =>
    firstEligible || sceneCandidate ? { kind: "deciding" } : plan ? { kind: "every", startAt: "ziggy" } : { kind: "none" };
  const [mode, setMode] = useState<Mode>(initial);
  const [loadFailed, setLoadFailed] = useState(false);

  // The FIRST graded result (today's check: uid + records, after the feedback card's wait), or a
  // scene candidate (needs the uid for CompanionScoreSlot's guide-arm check).
  useEffect(() => {
    if (!willDraw || !(firstEligible || sceneCandidate)) return;
    let live = true;
    let t: ReturnType<typeof setTimeout> | null = null;
    let t2: ReturnType<typeof setTimeout> | null = null;
    const every = () => setMode(plan ? { kind: "every", startAt: "ziggy" } : { kind: "none" });
    void (async () => {
      const uid = await currentUid();
      if (!live) return;
      if (!firstEligible) {
        const scene = plan ? claimScene(plan) : null;
        if (!scene || !plan) {
          every();
          return;
        }
        // The scene replaces ScoreGuideBeats, so the score moment is reported here (same shape,
        // same sender — trackGuideEvent suppresses it under an admin preview).
        trackGuideEvent("guide_moment_shown", { moment: "score", surface: plan.surface, situation: plan.situation });
        setMode({ kind: "scene", scene, uid });
        return;
      }
      if (!uid) {
        every();
        return;
      }
      t = setTimeout(() => {
        if (!live) return;
        // PREVIEW-1: under an admin preview ("Show Byte") Ziggy's first-result strip shows on EVERY
        // live graded scorecard: no first-result check, and the once-per-device marker is neither
        // read nor written (so the account's real first result still gets him after the preview).
        const preview = guidePreviewActive();
        if (preview || firstResultState(loadLocalSessionRecords(uid), Date.now()) === "first") {
          const r = ziggyReactionFor(score);
          if (r && (preview || claimZiggy(uid))) {
            setMode({ kind: "first", reaction: r });
            // GUIDE-SCORE-1: then Byte's next step, in the same slot (Ziggy has already reacted).
            if (plan) t2 = setTimeout(() => live && setMode({ kind: "every", startAt: "byte" }), FIRST_STRIP_HOLD_MS);
            return;
          }
        }
        every();
      }, ZIGGY_CHECK_DELAY_MS);
    })();
    return () => {
      live = false;
      if (t) clearTimeout(t);
      if (t2) clearTimeout(t2);
    };
    // Decided once per result (its plan key and the first-result inputs).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [willDraw, planKey, firstEligible]);

  const showing = willDraw && !m11OnStage && !loadFailed && mode.kind !== "none";
  // While a character is (about to be) drawn here, the sidebar's MI voice steps aside. A layout
  // effect: the hold lands before the browser paints this card.
  useHoldStage("scorecard", showing && mode.kind !== "deciding");

  if (!showing) return null;
  const onLoadFail = () => setLoadFailed(true);
  return (
    <div className="lt-sc__guide" data-testid="score-guide-slot" data-mode={mode.kind}>
      {mode.kind === "first" ? (
        <Suspense fallback={null}>
          <LazyZiggyStrip reaction={mode.reaction} onLoadFail={onLoadFail} />
        </Suspense>
      ) : mode.kind === "every" && plan ? (
        <Suspense fallback={null}>
          <LazyScoreGuideBeats key={`${planKey}|${mode.startAt}`} plan={plan} startAt={mode.startAt} onLoadFail={onLoadFail} />
        </Suspense>
      ) : mode.kind === "scene" && plan ? (
        <Suspense fallback={null}>
          <sceneRegistration.Scene plan={plan} scene={mode.scene} uid={mode.uid} />
        </Suspense>
      ) : null}
    </div>
  );
}
