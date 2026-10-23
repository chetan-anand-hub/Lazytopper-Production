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
 *   {got}/{total}  the score hero (marks, through the hero's own formatScoreNumber) or the
 *                  "x/y MCQs correct" line;
 *   {loss}         the biggest MI type, from "Where your marks went" (marks, marksWithUnit) or, on a
 *                  count-only grade, the mistakes block (countWithUnit);
 *   {lead}         "Biggest loss" ONLY when that type's marks are ≥ every other lost-marks row
 *                  (Not attempted and reason-not-recorded included); else "Most marks lost to a
 *                  mistake"; on a count-only grade "Most common mistake";
 *   {pending}      the "N questions couldn't be read" strip;
 *   {delta}        the card's own "▲ N marks …" line (Full Mock vs an earlier mock; Chapter Test
 *                  since the last same-total test of the chapter) — nothing is fetched for this.
 * A value the scorecard does not print is never used. No checkable number → no line at all.
 *
 * VARIED, NOT RANDOM. Each situation has a small template set; the pick is a hash of the result id
 * (the record's code — "WS-…", "CT-…", "FM-…", "CI-…" — else the result's own content), so a
 * refresh or a re-open shows the same line, and two results rarely do.
 *
 * Display only: nothing here reads or changes a grade, a mark, a prompt or a mistake type.
 */
import type { Pose } from "./rig";
import type { ScorecardSurface, ScorecardVariant } from "../results/scorecardVariants";
import { formatScoreNumber } from "../results/scoreNumber";
import { countWithUnit, marksWithUnit } from "../../lib/mistakeDisplay";
import { companionScoreMoment, scorePct } from "./companion/companionModel";
import type { ScoreGuideMomentSituation, ScoreGuideMomentSurface } from "../../analytics/analytics";

/** The situations a scorecard can be in (the analytics `situation`). */
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
  | "objectiveWrong"
  | "pending"
  | "allPending"
  | "awaitingSheet";

export type ZiggySet = "great" | "mixed" | "low" | "improved" | "allPending" | "awaitingSheet";

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
      // {prev}: "your last mock" on Full Mock, "your earlier attempt" on Chapter Test.
      { pose: "excited", text: "Up {delta} on {prev}! Keep it going." },
      { pose: "proud", text: "{delta} more than {prev}. That's real progress!" },
    ],
    allPending: [
      { pose: "confused", text: "Hmm, nothing got marked this time. So nothing is lost either." },
      { pose: "confused", text: "No score yet, and that's okay. These answers just need another go." },
    ],
    awaitingSheet: [
      { pose: "happy", text: "Objective part done! Your written answers will complete the picture." },
      { pose: "determined", text: "That's the objective part scored. Your written answers come next." },
    ],
  },
  byte: {
    conceptual: [
      { pose: "explain", text: "{lead}: Concept gap, {loss}. Go back to the idea once, then practise more like these." },
      { pose: "think", text: "{lead}: Concept gap ({loss}). Learn the idea properly, then try a fresh set." },
    ],
    calculation: [
      { pose: "explain", text: "{lead}: Calculation slip, {loss}. Write every step and recheck the numbers before the final answer." },
      { pose: "technique", text: "{lead}: Calculation slip ({loss}). Slow down on the working and check each line." },
    ],
    silly: [
      { pose: "point", text: "{lead}: Silly slip, {loss}. Re-check signs and copying before moving on." },
      { pose: "explain", text: "{lead}: Silly slip ({loss}). You know this, so read each line once more." },
    ],
    presentation: [
      { pose: "technique", text: "{lead}: Presentation, {loss}. Write units, labels and a clear final answer, the way CBSE marks it." },
      { pose: "explain", text: "{lead}: Presentation ({loss}). Add units, labels and a neat final line every time." },
    ],
    clean: [
      { pose: "cheer", text: "No mistake pattern to fix here. Keep it fresh with another set." },
      { pose: "wink", text: "Nothing stood out to fix. Try a fresh set and stretch yourself a little." },
    ],
    untyped: [
      { pose: "explain", text: "Practise a fresh set, then check one written answer. I'll show which step earns each mark." },
      { pose: "think", text: "Keep going with a fresh set. Written answers show me exactly where marks slip." },
    ],
    // Owner ruling 23 Oct 17:57: Quick Practice lets the student add working IN the session, so
    // these point to the set's own working box — never to another page.
    objective: [
      // MCQ working sets the mistake type only; it is never step-marked (CLAUDE.md §13).
      { pose: "point", text: "Taps done! Add working to one, and I'll check your method is solid too." },
      { pose: "explain", text: "Taps show the right option, not why. Add working to one and I'll check your reasoning." },
    ],
    // Owner idea (23 Oct): a wrong tap has no mistake type until working is added. The working is
    // read for Mistake Intelligence ONLY — the mark never changes (CLAUDE.md §13), and the line says so.
    // {wrong} reads "1 question wrong" / "3 questions wrong".
    objectiveWrong: [
      { pose: "detective", text: "{wrong}. Add working to one and I'll say: concept gap or slip? Your mark won't change." },
      { pose: "explain", text: "{wrong}. Show me your working for one and I'll find what went wrong. The mark stays as it is." },
    ],
    pending: [
      { pose: "point", text: "First, re-upload the {pending} that couldn't be read. Then your score is complete." },
      { pose: "explain", text: "A clearer photo for {pending} will finish your score. Flat page, good light." },
    ],
    allPending: [
      { pose: "explain", text: "Read the note below, then send the answers again. I'll mark them step by step." },
      { pose: "think", text: "Check the note below, fix that one thing, and try again. I'll be ready." },
    ],
    awaitingSheet: [
      { pose: "point", text: "Upload your written answers to see where marks went." },
      { pose: "explain", text: "Upload your written answers to see where marks went. I'll check every step." },
    ],
  },
  lead: {
    biggest: "Biggest loss",
    mostMistake: "Most marks lost to a mistake",
    mostCommon: "Most common mistake",
  },
  cta: {
    practise: "Practise more like these",
    practiseChapter: "Practise {chapter} →",
    check: "Check a written answer",
    showMissed: "Show me the first one I missed →",
    addWorking: "Add working to one →",
  },
} as const satisfies {
  ziggy: Record<ZiggySet, readonly GuideLine[]>;
  byte: Record<ByteStep, readonly GuideLine[]>;
  lead: Record<"biggest" | "mostMistake" | "mostCommon", string>;
  cta: Record<"practise" | "practiseChapter" | "check" | "showMissed" | "addWorking", string>;
};

/** Byte's link — an EXISTING internal route only (the host's own practice link, the Quick
 *  Practice hub, or Check & Improve), or the host's own IN-PAGE action (`action`, no route). */
export interface ScoreGuideCta {
  label: string;
  to?: string;
  action?: () => void;
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
   *   "improvement" — the card's own printed ▲ delta (Full Mock vs an earlier same-total mock;
   *                   Chapter Test vs the last same-total test of the chapter) is ≥ 10 points.
   * The scene renderer itself is registered from outside (lazyGuide.registerScoreScene).
   */
  scene: ScoreScene | null;
  /** This result's whole percentage (COMPANION-1 scorePct over the card's own marks), or null. */
  pct: number | null;
  /** The previous same-total result's whole percentage, from the card's own ▲ line, or null. */
  previousPct: number | null;
}

export type ScoreScene = "comfort" | "improvement";

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
/** Every lost-marks row "Where your marks went" can print (MarksLostByType's six buckets). */
const LOST_ROWS = ["conceptual", "calculation", "silly", "presentation", "unattempted", "untyped"] as const;

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

/** The biggest MI loss the scorecard PRINTS, and the honest lead for it: marks from "Where your
 *  marks went" when that block renders, else mistake counts from the count block; null otherwise. */
function printedBiggestLoss(v: ScorecardVariant): { type: MiType; text: string; lead: string } | null {
  const L = SCORE_GUIDE_LINES.lead;
  if (v.marksLost) {
    if (!(v.marksLost.lost > 0)) return null; // neither block renders
    const by = v.marksLost.byType;
    let best: MiType | null = null;
    for (const t of MI_ORDER) if (by[t] > 0 && (best === null || by[t] > by[best])) best = t;
    if (!best) return null;
    const top = by[best];
    // "Biggest loss" only when no other lost-marks row (Not attempted, reason not recorded, the
    // other types) is larger; a tie still makes it (one of) the biggest.
    const dominant = LOST_ROWS.every((k) => k === best || !((Number(by[k]) || 0) > top));
    return { type: best, text: marksWithUnit(top), lead: dominant ? L.biggest : L.mostMistake };
  }
  if (v.fourType) {
    const ft = v.fourType;
    let best: MiType | null = null;
    for (const t of MI_ORDER) {
      const c = Number(ft[t]) || 0;
      if (c > 0 && (best === null || c > (Number(ft[best]) || 0))) best = t;
    }
    return best ? { type: best, text: countWithUnit(Number(ft[best]) || 0), lead: L.mostCommon } : null;
  }
  return null;
}

/** The card's own printed improvement ("▲ 9 marks vs …" on Full Mock, "▲ 4 marks since your last
 *  … test" on Chapter Test): the number as printed, when it went UP. */
function printedImprovement(v: ScorecardVariant): { text: string; marks: number } | null {
  if ((v.surface !== "full-mock" && v.surface !== "chapter-test") || !v.message) return null;
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

/** The missed taps the card PRINTS: its "Where marks slipped" rows (one per missed MCQ), else on
 *  the attempts hero the "x/y MCQs correct" line (y − x). Never estimated from marks. */
function printedWrongTaps(v: ScorecardVariant): number {
  if (v.wrongAnswers && v.wrongAnswers.length > 0) return v.wrongAnswers.length;
  const s = v.score;
  if (s.kind === "attempts" && Number.isFinite(s.mcqAnswered) && Number.isFinite(s.mcqCorrect)) {
    return Math.max(0, s.mcqAnswered - s.mcqCorrect);
  }
  return 0;
}

/** An internal, same-site route only ("/x…", never "//host", a scheme or a backslash) — else null. */
function safeInternal(to: unknown): string | null {
  return typeof to === "string" && to.startsWith("/") && !to.startsWith("//") && !to.includes("\\") ? to : null;
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
  // Byte's practise link: the host's OWN practice route for this result's chapter when it has one
  // (ScorecardVariant.guideTarget), else the Quick Practice hub.
  const targetTo = safeInternal(v.guideTarget?.to);
  const chapter = typeof v.guideTarget?.chapter === "string" ? v.guideTarget.chapter.trim() : "";
  const practise: ScoreGuideCta = targetTo
    ? { label: chapter ? fill(L.cta.practiseChapter, { chapter }) : L.cta.practise, to: targetTo }
    : { label: L.cta.practise, to: "/practice-hub" };
  // On Check & Improve itself, "check a written answer" would point where the student already is;
  // Quick Practice has its OWN in-session working check (owner ruling 23 Oct 17:57), so it never
  // sends a student to Check & Improve either.
  const checkOrPractise = v.surface === "check-improve" || v.surface === "quick-practice" ? practise : check;

  if (v.allPending) {
    if (opts.hostOwnsUnreadAllPending && v.allPending.title === UNREAD_ALL_TITLE) return null;
    const z = pick(L.ziggy.allPending, hz);
    const b = pick(L.byte.allPending, hb);
    return { situation: "all-pending", surface, seed, ziggy: { ...z }, byte: { ...b }, byteStep: "allPending", cta: null, scene: null, pct: null, previousPct: null };
  }

  // Objective part scored, written sheet awaited: nothing about mistakes is known yet, so no
  // pattern and no practice link — the card's own Upload action stays the primary step.
  if (v.awaitingSheet) {
    const z = pick(L.ziggy.awaitingSheet, hz);
    const b = pick(L.byte.awaitingSheet, hb);
    return { situation: "awaiting-sheet", surface, seed, ziggy: { ...z }, byte: { ...b }, byteStep: "awaitingSheet", cta: null, scene: null, pct: null, previousPct: null };
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

  // The numbers EXACTLY as the card prints them (the hero's formatter; MCQ counts are integers).
  const vals: Record<string, string> = { got: formatScoreNumber(got), total: formatScoreNumber(total) };
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
  if (delta) {
    vals.delta = delta.text;
    vals.prev = v.surface === "full-mock" ? "your last mock" : "your earlier attempt";
  }
  // The scene: COMPANION-1's OWN rule (companionScoreMoment) over whole percentages — the previous
  // result is the card's printed ▲ (both hosts print one only for an equal paper total, so the
  // previous mark is this total's got − delta). Improvement ≥ 10 points wins; else comfort < 40 %.
  const pct = scorePct(got, total);
  const previousPct = delta ? scorePct(got - delta.marks, total) : null;
  const moment = companionScoreMoment(pct, previousPct);
  const scene: ScoreScene | null = moment?.moment === "improve" ? "improvement" : moment?.moment === "lowScore" ? "comfort" : null;

  let byteStep: ByteStep;
  let cta: ScoreGuideCta | null;
  const unread = printedUnread(v);
  const biggest = printedBiggestLoss(v);
  if (unread > 0) {
    byteStep = "pending";
    vals.pending = countWithUnit(unread, "question");
    cta = null; // the re-upload lives on the scorecard itself
  } else if (objectiveOnly) {
    const wrong = printedWrongTaps(v);
    if (wrong > 0) {
      byteStep = "objectiveWrong";
      vals.wrong = `${countWithUnit(wrong, "question")} wrong`;
      // The host's in-page way back to the missed questions (working box); none → no link.
      cta = typeof v.onShowMissed === "function" ? { label: L.cta.showMissed, action: v.onShowMissed } : null;
    } else {
      byteStep = "objective";
      // The host's in-page way into the set's review, working box open; none → no link.
      cta = typeof v.onAddWorking === "function" ? { label: L.cta.addWorking, action: v.onAddWorking } : null;
    }
  } else if (biggest) {
    byteStep = biggest.type;
    vals.loss = biggest.text;
    vals.lead = biggest.lead;
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
    pct,
    previousPct,
  };
}
