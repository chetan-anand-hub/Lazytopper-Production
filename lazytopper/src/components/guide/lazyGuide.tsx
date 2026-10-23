/**
 * GUIDE-1 — the ONLY doors into the guide chunk (./guideChunk.tsx). Each is a React.lazy over
 * the same dynamic import, so Vite emits ONE `guideChunk-<hash>.js` that is fetched only when
 * Byte or Ziggy is about to render. A failed chunk load renders nothing (never breaks a page).
 */
import { lazy, Suspense, useEffect, useState, type ComponentType } from "react";
import type { ScorecardVariant } from "../results/scorecardVariants";
import { FIRST_GRADED_DELAY_MS, isFirstGradedEligible } from "../feedback/useFirstGradedFeedback";
import { firstResultState } from "../feedback/feedbackPromptModel";
import { loadLocalSessionRecords } from "../../services/sessionRecords";
import { guideAbActive, guideAccountTag, guidePreviewActive, resolveGuideVariant, trackGuideEvent } from "./guideVariant";
import { ziggyReactionFor, type ZiggyReaction } from "./ziggyModel";
import { scoreGuidePlan, type ScoreGuidePlan, type ScoreScene } from "./scoreGuideModel";
import { mascotsHidden as mascotsHiddenNow, useMascotsHidden } from "./mascotsMute";
import { publicMomentArm } from "./moments/moments";
import { useHoldStage, useStageHeld } from "./scoreGuideStage";

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
const LazyScoreGuideBeats = lazyPart((m) => m.ScoreGuideBeats);

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
  | { kind: "every" }
  | { kind: "scene"; scene: ScoreScene };

/**
 * ★ SCENE HOOK (owner ruling 23 Oct 2026 16:40 IST). Byte and Ziggy may stand TOGETHER only in a
 * short scene, at most ONE per session; on a scorecard the two candidates are the plan's
 * `scene` ("comfort" below 40 %, "improvement" ≥ 10 points — ./scoreGuideModel.ts). COMPANION-1
 * owns the duet poses and the session guard; it registers them here once:
 *
 *   registerScoreScene({ canShowScene, markSceneShown, Scene })
 *
 * Then a scene-eligible scorecard shows `<Scene plan scene />` in the same reserved slot IF
 * `canShowScene()` (and marks it shown); otherwise — or with nothing registered, as today — the
 * default Ziggy-then-Byte sequence. The first graded result keeps its own Ziggy strip.
 */
export interface ScoreSceneProps {
  plan: ScoreGuidePlan;
  scene: ScoreScene;
}
export interface ScoreSceneRegistration {
  canShowScene: () => boolean;
  markSceneShown: () => void;
  Scene: ComponentType<ScoreSceneProps>;
}
let sceneRegistration: ScoreSceneRegistration | null = null;
export function registerScoreScene(r: ScoreSceneRegistration | null): void {
  sceneRegistration = r;
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
 * GUIDE-1 §3D (unchanged) — the student's FIRST graded result gets today's Ziggy strip: the host
 * opted in (a live, just-graded scorecard), a signed-in guide-arm student, FIRST-FEEDBACK-1's
 * `firstResultState` says "first" after the 1.5 s wait, once per account per device (PREVIEW-1:
 * every live scorecard, no marker, while an admin preview is active).
 *
 * GUIDE-SCORE-1 (owner ruling, 22 Oct 23:32 IST) — EVERY OTHER graded scorecard (later results,
 * stored re-opens, all-pending states) gets Ziggy's reaction and then Byte's one next step, built
 * ONLY from the scorecard's own numbers (./scoreGuideModel.ts). Guide arm only (the public arm for
 * a signed-out visitor); "Hide mascots" → nothing.
 *
 * NO LAYOUT SHIFT: while the arm and the first-result check are decided, the slot is RESERVED
 * (an empty block of the character's height), and the character then fills it. It collapses only
 * for the control arm — the plain scorecard of today.
 */
export function ScorecardGuide({ variant, ask, hostOwnsUnreadAllPending }: ScorecardGuideProps) {
  const mascotsHidden = useMascotsHidden();
  const plan: ScoreGuidePlan | null = scoreGuidePlan(variant, { hostOwnsUnreadAllPending });
  const score = variant.score;
  const firstEligible =
    guideAbActive() && isFirstGradedEligible({ ask, deferred: variant.deferred, allPending: !!variant.allPending, score });
  const active = guideAbActive() && !variant.deferred && (plan !== null || firstEligible);
  const [mode, setMode] = useState<Mode>({ kind: "deciding" });
  const planKey = plan ? `${plan.seed}|${plan.situation}|${plan.byteStep}|${plan.ziggy.text}` : "";

  useEffect(() => {
    if (!active) return;
    let live = true;
    let t: ReturnType<typeof setTimeout> | null = null;
    setMode({ kind: "deciding" });
    void (async () => {
      const uid = await currentUid();
      if (!live) return;
      const arm = uid ? resolveGuideVariant(uid) : publicMomentArm();
      if (arm !== "guide") {
        setMode({ kind: "none" });
        return;
      }
      const every = () => {
        const scene = claimScene(plan);
        if (scene && plan) {
          // The scene replaces ScoreGuideBeats, so the score moment is reported here (same shape,
          // same sender — trackGuideEvent suppresses it under an admin preview).
          trackGuideEvent("guide_moment_shown", { moment: "score", surface: plan.surface, situation: plan.situation });
          setMode({ kind: "scene", scene });
          return;
        }
        setMode(plan ? { kind: "every" } : { kind: "none" });
      };
      if (!uid || !firstEligible) {
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
            return;
          }
        }
        every();
      }, ZIGGY_CHECK_DELAY_MS);
    })();
    return () => {
      live = false;
      if (t) clearTimeout(t);
    };
    // Decided once per result (its plan key and the first-result inputs).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, planKey, firstEligible]);

  // ONE character at a time: MOMENTS-1 M11 (Byte's once-per-account nudge below the score of a
  // tap-only Quick Practice card) owns the scorecard while it shows, so this slot yields; while
  // this slot draws a character it holds the stage, so the sidebar's MI voice row steps aside.
  const m11OnStage = useStageHeld("m11");
  const drawing = active && !mascotsHidden && !m11OnStage && (mode.kind === "first" || mode.kind === "every" || mode.kind === "scene");
  useHoldStage("scorecard", drawing);

  if (!active || mascotsHidden || m11OnStage || mode.kind === "none") return null;
  return (
    <div className="lt-sc__guide" data-testid="score-guide-slot" data-mode={mode.kind}>
      {mode.kind === "first" ? (
        <Suspense fallback={null}>
          <LazyZiggyStrip reaction={mode.reaction} />
        </Suspense>
      ) : mode.kind === "every" && plan ? (
        <Suspense fallback={null}>
          <LazyScoreGuideBeats key={planKey} plan={plan} />
        </Suspense>
      ) : mode.kind === "scene" && plan && sceneRegistration ? (
        <Suspense fallback={null}>
          <sceneRegistration.Scene plan={plan} scene={mode.scene} />
        </Suspense>
      ) : null}
    </div>
  );
}
