/**
 * GUIDE-SCORE-1 — Byte & Ziggy on EVERY graded scorecard (owner ruling, 22 Oct 2026 23:32 IST).
 * PURE: no React, no storage, no network.
 *
 * Ziggy REACTS to the result (celebrate / encourage / steady); then Byte gives the ONE most useful
 * next step from Mistake Intelligence, with a link to an EXISTING route. They never stand side by
 * side: Ziggy speaks first, Byte replaces him in the same spot (the MOMENTS-1 grammar).
 *
 * ★★ TRUE BY CONSTRUCTION. Every value a line may carry is read from what the scorecard ITSELF
 * prints (ResultsScorecard.tsx), formatted the way it prints it:
 *   {got}/{total}  the score hero (marks: awarded / total) or the "x/y MCQs correct" line;
 *   {loss}         the biggest of the four MI types, from "Where your marks went" (marks, through
 *                  marksWithUnit) or, on a count-only grade, the mistakes block (countWithUnit);
 *   {pending}      the "N questions couldn't be read" strip;
 *   {delta}        Full Mock's own "▲ N marks vs …" line (the only surface whose scorecard already
 *                  carries a previous result — nothing is fetched for this).
 * A value the scorecard does not print is never used, so a line can never claim a number the
 * student cannot see. No line is built from guesswork: no checkable number → no line at all.
 *
 * VARIED, NOT RANDOM. Each situation has a small template set; the pick is a hash of the result id
 * (the record's code — "WS-…", "CT-…", "FM-…", "CI-…" — else the result's own content), so a
 * refresh or a re-open shows the same line, and two results rarely do.
 *
 * Display only: nothing here reads or changes a grade, a mark, a prompt or a mistake type.
 */
import type { Pose } from "./rig";
import type { ScorecardSurface, ScorecardVariant } from "../results/scorecardVariants";
import { countWithUnit, marksWithUnit } from "../../lib/mistakeDisplay";
import type { ScoreGuideMomentSituation, ScoreGuideMomentSurface } from "../../analytics/analytics";

/** The six situations a scorecard can be in (the analytics `situation`). */
export type ScoreSituation = ScoreGuideMomentSituation;

/** The six grading surfaces, as analytics names them (CLAUDE.md §4a). */
export type ScoreGuideSurface = ScoreGuideMomentSurface;

/** Which of Byte's line sets answered — the MI next step. */
export type ByteStep =
  | "conceptual"
  | "calculation"
  | "silly"
  | "presentation"
  | "clean"
  | "untyped"
  | "objective"
  | "pending"
  | "allPending";

export type ZiggySet = "great" | "mixed" | "low" | "improved" | "allPending";

export interface GuideLine {
  pose: Pose;
  text: string;
}

/**
 * ★ THE COPY — ONE table, for the owner's review. Rules: ≤ 22 words each, plain English for a
 * Class 10 student, warm, never shaming, no "Ask" wording, no "½" glyph, NO literal digits (every
 * number comes from a {placeholder} the scorecard prints). Tests pin all of this.
 */
export const SCORE_GUIDE_LINES = {
  ziggy: {
    great: [
      { pose: "excited", text: "{got} out of {total}! I'm doing a happy dance over here." },
      { pose: "cheer", text: "Yes! {got} out of {total}. You really know this one." },
      { pose: "proud", text: "{got} out of {total}. That's a score to be proud of!" },
    ],
    mixed: [
      { pose: "determined", text: "{got} out of {total}. Solid work, with a few marks still to grab." },
      { pose: "happy", text: "{got} out of {total}. Good base, and the missing marks are fixable." },
      { pose: "determined", text: "Nice effort: {got} out of {total}. Let's go after the rest together." },
    ],
    low: [
      { pose: "determined", text: "{got} out of {total} this time. Now we know exactly where to start." },
      { pose: "detective", text: "Tough one: {got} out of {total}. Every lost mark is a clue for next time." },
      { pose: "determined", text: "{got} out of {total}. Hard papers teach the most. We'll fix it step by step." },
    ],
    improved: [
      { pose: "excited", text: "Up {delta} on your earlier mock! Your practice is working." },
      { pose: "proud", text: "{delta} more than your earlier mock. That's real progress!" },
    ],
    allPending: [
      { pose: "confused", text: "Hmm, nothing got marked this time. So nothing is lost either." },
      { pose: "confused", text: "No score yet, and that's okay. These answers just need another go." },
    ],
  },
  byte: {
    conceptual: [
      { pose: "explain", text: "Biggest loss: Concept gap, {loss}. Go back to the idea once, then practise more like these." },
      { pose: "think", text: "Concept gap cost the most here ({loss}). Learn the idea properly, then try a fresh set." },
    ],
    calculation: [
      { pose: "explain", text: "Biggest loss: Calculation slip, {loss}. Write every step and recheck the numbers before the final answer." },
      { pose: "technique", text: "Calculation slip cost the most here ({loss}). Slow down on the working and check each line." },
    ],
    silly: [
      { pose: "point", text: "Biggest loss: Silly slip, {loss}. Re-check signs and copying before moving on." },
      { pose: "explain", text: "Silly slip cost the most here ({loss}). You know this, so read each line once more." },
    ],
    presentation: [
      { pose: "technique", text: "Biggest loss: Presentation, {loss}. Write units, labels and a clear final answer, the way CBSE marks it." },
      { pose: "explain", text: "Presentation cost the most here ({loss}). Add units, labels and a neat final line every time." },
    ],
    clean: [
      { pose: "cheer", text: "No mistake pattern to fix here. Keep it fresh with another set." },
      { pose: "wink", text: "Nothing stood out to fix. Try a fresh set and stretch yourself a little." },
    ],
    untyped: [
      { pose: "explain", text: "Practise a fresh set, then check one written answer. I'll show which step earns each mark." },
      { pose: "think", text: "Keep going with a fresh set. Written answers show me exactly where marks slip." },
    ],
    objective: [
      { pose: "point", text: "Taps show the right option, not why. Check a written answer to see where marks slip." },
      { pose: "explain", text: "Next, try one written answer. I'll show which step earns marks, like a CBSE examiner." },
    ],
    pending: [
      { pose: "point", text: "First, re-upload the {pending} that couldn't be read. Then your score is complete." },
      { pose: "explain", text: "A clearer photo for {pending} will finish your score. Flat page, good light." },
    ],
    allPending: [
      { pose: "explain", text: "Read the note below, then send the answers again. I'll mark them step by step." },
      { pose: "think", text: "Check the note below, fix that one thing, and try again. I'll be ready." },
    ],
  },
  cta: {
    practise: "Practise more like these",
    check: "Check a written answer",
  },
} as const satisfies {
  ziggy: Record<ZiggySet, readonly GuideLine[]>;
  byte: Record<ByteStep, readonly GuideLine[]>;
  cta: Record<"practise" | "check", string>;
};

/** Byte's link — an EXISTING route only: the Quick Practice hub or Check & Improve. */
export interface ScoreGuideCta {
  label: string;
  to: "/practice-hub" | "/check-improve";
}

export interface ScoreGuidePlan {
  situation: ScoreSituation;
  surface: ScoreGuideSurface;
  /** The stable seed (result id, or the result's own content). */
  seed: string;
  ziggy: GuideLine;
  byte: GuideLine;
  byteStep: ByteStep;
  cta: ScoreGuideCta | null;
  /**
   * SCENE HOOK (owner ruling 23 Oct 2026 16:40 IST): the two situations where Byte and Ziggy MAY
   * appear together in one short scene — once COMPANION-1 ships the duet poses and its session
   * guard (canShowScene / markSceneShown). Null → the default one-at-a-time sequence.
   *   "comfort"     — a low score: below 40 % on the scorecard's own numbers;
   *   "improvement" — Full Mock's own printed ▲ delta (same subject, same paper total — the only
   *                   previous result a scorecard already carries) is at least 10 percentage points.
   * The scene renderer itself is registered from outside (lazyGuide.registerScoreScene).
   */
  scene: ScoreScene | null;
}

export type ScoreScene = "comfort" | "improvement";

/** Below this share of the marks, a result is a "comfort" scene candidate (owner: < 40 %). */
export const COMFORT_SCENE_BELOW = 0.4;
/** At least this many percentage points up on the previous result → an "improvement" scene. */
export const IMPROVEMENT_SCENE_MIN_POINTS = 10;

export interface ScoreGuideOptions {
  /** The host draws its own "couldn't read any answers" moment (MOMENTS-1 M6) inside the
   *  all-pending block: Byte & Ziggy are already there, so this slot stays empty for it. */
  hostOwnsUnreadAllPending?: boolean;
}

/**
 * ★ COMPANION-1 SEAM (the parallel lane supplies a low-score "comfort" pose and line; this lane
 * does not build it). Register a provider once (e.g. from COMPANION-1's own module); on a LOW
 * result (score below half, not "improved") Ziggy's reaction comes from it instead of the table.
 * The provider returns a TEMPLATE: any number must come through the same placeholders
 * ({got}, {total}) so the truth rule still holds; null → the table's line. Byte's next step is
 * never replaced. Unregister with `setScoreComfortProvider(null)`.
 */
export interface ScoreComfortInput {
  surface: ScoreGuideSurface;
  seed: string;
  got: string;
  total: string;
}
export type ScoreComfortProvider = (input: ScoreComfortInput) => GuideLine | null;
let comfortProvider: ScoreComfortProvider | null = null;
export function setScoreComfortProvider(p: ScoreComfortProvider | null): void {
  comfortProvider = p;
}

/** The scorecard's own all-pending title for an unreadable paper (= moments.UNREAD_ALL_TITLE). */
const UNREAD_ALL_TITLE = "We couldn’t read any answers";

const MI_ORDER = ["conceptual", "calculation", "silly", "presentation"] as const;
type MiType = (typeof MI_ORDER)[number];

/** A number exactly as the score hero prints it (no float noise, no trailing ".0"). */
function num(x: number): string {
  return String(Math.round(x * 100) / 100);
}

/** FNV-1a, 32-bit — a stable, tiny hash for the template pick. */
export function seedHash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const RESULT_CODE = /\b(?:WS|CT|FM|CI|QP)-[A-Za-z0-9-]+/;

/** The result id: the saved record's ref, else the code the subtitle prints, else the result's
 *  own content (surface, title, score, MI) — never the clock, never a random draw. */
export function scoreGuideSeed(v: ScorecardVariant): string {
  if (v.parentResultRef) return v.parentResultRef;
  const code = RESULT_CODE.exec(v.subtitle ?? "")?.[0];
  if (code) return code;
  const s = v.score;
  const scorePart = s.kind === "marks" ? `m${s.awarded}/${s.total}` : `a${s.attempted}/${s.ofN}/${s.mcqCorrect}/${s.mcqAnswered}`;
  const mi = v.marksLost ? MI_ORDER.map((t) => v.marksLost!.byType[t]).join(",") : v.fourType ? MI_ORDER.map((t) => v.fourType![t]).join(",") : "";
  return `${v.surface}|${v.title}|${scorePart}|${mi}`;
}

/** The analytics surface. Check & Improve's single-question path adapts ONE question into the
 *  paper shape (singleCheckToWorksheetResponse), so its scorecard counts exactly one question. */
export function scoreGuideSurface(v: ScorecardVariant): ScoreGuideSurface {
  const map: Record<Exclude<ScorecardSurface, "check-improve">, ScoreGuideSurface> = {
    worksheet: "worksheet",
    "quick-practice": "quick_practice",
    "chapter-test": "chapter_test",
    "full-mock": "full_mock",
  };
  if (v.surface === "check-improve") {
    return v.score.kind === "marks" && v.score.totalQuestions === 1 ? "check_improve_single" : "check_improve_multi";
  }
  return map[v.surface];
}

/** The unreadable count the pending strip PRINTS ("N questions couldn't be read"), else 0. */
function printedUnread(v: ScorecardVariant): number {
  const p = v.pending;
  if (!p) return 0;
  const mismatch = (p.mismatch ?? []).length;
  const notGraded = (p.items ?? []).filter((it) => it.state === "not-graded").length;
  return Math.max(0, p.count - mismatch - notGraded);
}

/** The biggest MI loss the scorecard PRINTS: marks from "Where your marks went" when that block
 *  renders, else mistake counts from the count block when THAT renders; null otherwise. */
function printedBiggestLoss(v: ScorecardVariant): { type: MiType; text: string } | null {
  if (v.marksLost) {
    if (!(v.marksLost.lost > 0)) return null; // neither block renders
    const by = v.marksLost.byType;
    let best: MiType | null = null;
    for (const t of MI_ORDER) if (by[t] > 0 && (best === null || by[t] > by[best])) best = t;
    return best ? { type: best, text: marksWithUnit(by[best]) } : null;
  }
  if (v.fourType) {
    const ft = v.fourType;
    let best: MiType | null = null;
    for (const t of MI_ORDER) {
      const c = Number(ft[t]) || 0;
      if (c > 0 && (best === null || c > (Number(ft[best]) || 0))) best = t;
    }
    return best ? { type: best, text: countWithUnit(Number(ft[best]) || 0) } : null;
  }
  return null;
}

/** Full Mock's own printed delta ("▲ 9 marks vs …"): the number, as printed, when it went UP. */
function printedImprovement(v: ScorecardVariant): { text: string; marks: number } | null {
  if (v.surface !== "full-mock" || !v.message) return null;
  const m = /^▲\s*(\d+(?:\.\d+)?)\s*marks?\b/.exec(v.message.trim());
  if (!m) return null;
  const n = Number(m[1]);
  return n > 0 ? { text: `${m[1]} mark${n === 1 ? "" : "s"}`, marks: n } : null;
}

/**
 * A tap-only (MCQ-only) Quick Practice result: the legacy attempts hero, or the MCQ-marks hero
 * (PRACTICE-HONESTY-1) with no written grade on the card — no "Where your marks went", no graded
 * answer sheet, no MCQ/written split, no typed mistake. Taps record WHICH option, never WHY, so
 * Byte's next step there is a written answer, never a claimed mistake pattern.
 */
export function isObjectiveOnly(v: ScorecardVariant): boolean {
  if (v.score.kind === "attempts") return true;
  if (v.surface !== "quick-practice") return false;
  const typed = !!v.fourType && MI_ORDER.some((t) => (Number(v.fourType![t]) || 0) > 0);
  return !v.marksLost && !(v.gradedAnswers && v.gradedAnswers.length > 0) && !v.split && !typed;
}

function fill(text: string, vals: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (_, k: string) => vals[k] ?? "");
}

function pick(list: readonly GuideLine[], h: number): GuideLine {
  return list[h % list.length];
}

/**
 * The scorecard's guide plan, or null when there is nothing TRUE to say (a deferred stub, no
 * checkable number, or an all-pending state the host already covers with its own moment).
 */
export function scoreGuidePlan(v: ScorecardVariant, opts: ScoreGuideOptions = {}): ScoreGuidePlan | null {
  if (v.deferred) return null;
  const seed = scoreGuideSeed(v);
  const h = seedHash(seed);
  const hz = h;
  const hb = Math.floor(h / 7);
  const surface = scoreGuideSurface(v);
  const L = SCORE_GUIDE_LINES;
  const check: ScoreGuideCta = { label: L.cta.check, to: "/check-improve" };
  const practise: ScoreGuideCta = { label: L.cta.practise, to: "/practice-hub" };
  // On Check & Improve itself, "check a written answer" would point where the student already is.
  const checkOrPractise = v.surface === "check-improve" ? practise : check;

  if (v.allPending) {
    if (opts.hostOwnsUnreadAllPending && v.allPending.title === UNREAD_ALL_TITLE) return null;
    const z = pick(L.ziggy.allPending, hz);
    const b = pick(L.byte.allPending, hb);
    return { situation: "all-pending", surface, seed, ziggy: { ...z }, byte: { ...b }, byteStep: "allPending", cta: null, scene: null };
  }

  const s = v.score;
  let got: number;
  let total: number;
  if (s.kind === "marks") {
    if (!Number.isFinite(s.total) || s.total <= 0 || !Number.isFinite(s.awarded) || s.awarded < 0) return null;
    got = s.awarded;
    total = s.total;
  } else {
    if (!Number.isFinite(s.mcqAnswered) || s.mcqAnswered <= 0 || !Number.isFinite(s.mcqCorrect)) return null;
    got = s.mcqCorrect;
    total = s.mcqAnswered;
  }
  const ratio = got / total;
  const band: "great" | "mixed" | "low" = ratio >= 0.8 ? "great" : ratio >= 0.5 ? "mixed" : "low";
  const delta = printedImprovement(v);
  const objectiveOnly = isObjectiveOnly(v);
  const situation: ScoreSituation = objectiveOnly ? "objective-only" : delta ? "improved" : band;

  const vals: Record<string, string> = { got: num(got), total: num(total) };
  let comfort: GuideLine | null = null;
  if (!delta && band === "low" && comfortProvider) {
    try {
      comfort = comfortProvider({ surface, seed, got: vals.got, total: vals.total });
    } catch {
      comfort = null; // a broken provider never breaks the scorecard
    }
    // The truth rule holds for the seam too: a literal digit (a number not from a placeholder) is refused.
    if (comfort && (typeof comfort.text !== "string" || /\d/.test(comfort.text))) comfort = null;
  }
  const z: GuideLine = comfort ?? (delta ? pick(L.ziggy.improved, hz) : pick(L.ziggy[band], hz));
  if (delta) vals.delta = delta.text;
  // The scene hook: improvement ≥ 10 points (the delta over THIS paper's total, which the
  // previous mock shared — FullMockPage only prints a delta for an equal marksTotal), else comfort < 40 %.
  const scene: ScoreScene | null =
    delta && (delta.marks / total) * 100 >= IMPROVEMENT_SCENE_MIN_POINTS
      ? "improvement"
      : !delta && ratio < COMFORT_SCENE_BELOW
        ? "comfort"
        : null;

  let byteStep: ByteStep;
  let cta: ScoreGuideCta | null;
  const unread = printedUnread(v);
  const biggest = printedBiggestLoss(v);
  if (unread > 0) {
    byteStep = "pending";
    vals.pending = countWithUnit(unread, "question");
    cta = null; // the re-upload lives on the scorecard itself
  } else if (objectiveOnly) {
    byteStep = "objective";
    cta = checkOrPractise;
  } else if (biggest) {
    byteStep = biggest.type;
    vals.loss = biggest.text;
    cta = biggest.type === "presentation" ? checkOrPractise : practise;
  } else {
    byteStep = band === "great" ? "clean" : "untyped";
    cta = practise;
  }
  const b = pick(L.byte[byteStep], hb);
  return {
    situation,
    surface,
    seed,
    ziggy: { pose: z.pose, text: fill(z.text, vals) },
    byte: { pose: b.pose, text: fill(b.text, vals) },
    byteStep,
    cta,
    scene,
  };
}
