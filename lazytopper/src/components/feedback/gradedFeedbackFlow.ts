/**
 * FEEDBACK-2 (owner rulings 24 Oct 2026) — what "Was this useful?" does AFTER the student answers.
 * PURE: no React, no DOM, no storage, no network. Every rule that decides a button, a label or a
 * destination lives here so plain unit tests pin all of it.
 *
 * ★ NEVER LOST. Every button leads to a REAL route, and the route is always a plain in-app path:
 *     - practice: /practice/10/<maths|science>?topic=<topicKey>&count=5[&difficulty=X][&style=hots]
 *       (App.tsx:1199 `/practice/:grade/:subject`; PracticePage reads `topic`, `count`, `difficulty`
 *       and `style` — pages/PracticePage.tsx:863, :985-986, :1008-1011)
 *     - the Practice hub chapter picker: /practice-hub (App.tsx:1255)
 *     - Check & Improve: /check-improve (the route the scorecard guide already uses)
 *     - the tutor: the HOST's own scorecard hop for the first question that lost marks (it carries the
 *       question, the saved record and its own returnTo), else the chapter's tutor path with
 *       `returnTo` = the page the student was on.
 *   With no single chapter known there is no "5 more on <chapter>": the button becomes "Choose a
 *   chapter" and goes to the hub — never a random chapter.
 *
 * ★ HONEST. A button appears only when what it promises is true: "Check a written answer" only when
 *   this account has never had a written answer graded (and is not already on Check & Improve); an
 *   easier set only when there is an easier step; "Ask the tutor about it" only when there is a
 *   question or a chapter to ask about.
 *
 * ★ NO FREE TEXT LEAVES THE ACCOUNT. The optional note is saved to the student's own account
 *   (feedbackNotes.ts) and is never sent to a vendor or the activity log; only the NAME of what the
 *   student did travels (feedbackPromptModel.ts FEEDBACK_NEXT_ACTIONS).
 */
import { buildTutorPath, safeInternalReturnTo } from "../../pages/tutor/tutorPath";
import type { ScorecardVariant } from "../results/scorecardVariants";
import type { FeedbackNextAction, FirstGradedAnswer } from "./feedbackPromptModel";

/* ── The voice: ONE exported copy table (approved personality guide) ─────────────────────────────
 * Companion lines are at most 18 words, at most one exclamation mark, no emoji, at most one Hinglish
 * word, never selling, no guilt, no streak pressure. The "Tell us more" form is NOT in Ziggy's voice:
 * it is a plain form (characters never take free-text input). */
export const GRADED_FEEDBACK_COPY = {
  /** Step 1 (the existing question and the four one-tap answers live in feedbackPromptModel.ts). */
  question: "Was this useful?",
  /** Step 2 — Ziggy's ONE line per answer. */
  line: {
    yes: "Nice! Let's keep going.",
    too_easy: "Let's level up.",
    too_hard: "Same here sometimes.",
    not_really: "What was missing?",
  },
  /** Step 2 buttons. `{chapter}` is the result's chapter name when it is known. */
  button: {
    moreOnChapter: "5 more on {chapter}",
    moreGeneric: "5 more questions",
    harder: "Try 5 harder ones",
    hots: "Try 5 HOTS questions",
    easier: "Try 5 easier ones",
    tutor: "Ask the tutor about it",
    written: "Check a written answer",
    chooseChapter: "Choose a chapter",
  },
  /** Step 3 — "Not really": what was missing. */
  why: {
    unclear: "The explanation was unclear",
    marks: "The marks felt wrong",
    chapter: "Wrong chapter for me",
    other: "Something else",
  },
  back: "Back",
  close: "Close",
  /** The plain "Tell us more" form (NOT Ziggy's voice). */
  note: {
    title: "Tell us more",
    marksTitle: "Marks felt wrong",
    marksHint: "Which question, and what did you expect? It helps us look at it.",
    otherHint: "What should we fix or add? It is saved to your account.",
    missedLine: "Tap Report issue under the question.",
    label: "Your note (optional)",
    send: "Send",
    skip: "Skip",
    sending: "Sending…",
    saved: "Thank you. Your note is saved.",
    failed: "That did not save. Check your connection and try Send again.",
    counter: "{n} of {max}",
  },
  /** The old one-line thank-you, kept for a card opened without a flow (a host with no context). */
  thanks: "Thank you — this really helps us.",
} as const;

/** The longest note we keep. */
export const FEEDBACK_NOTE_MAX = 500;

export type SubjectSeg = "maths" | "science";
export type DifficultyStep = "Easy" | "Medium" | "Hard";

/**
 * What the scorecard hands the card (built by ResultsScorecard inside the router, from the variant).
 * `navigate` is the ROUTER's navigate — the card lives in its own React root with no router of its
 * own, and `window.location` is never used to move the student.
 */
export interface GradedFeedbackContextInput {
  navigate: (to: string) => void;
  /** The result's surface (`ScorecardVariant.surface`): quick-practice, worksheet, chapter-test, full-mock, check-improve. */
  surface: string;
  /** The result's ONE chapter, when it has one (from the host's own `guideTarget`). Null: several or unknown. */
  subject: SubjectSeg | null;
  topicKey: string | null;
  chapter: string | null;
  /**
   * The set's REAL difficulty, when the host knows it (Quick Practice hands over the committed filter
   * through `guideTarget.difficulty`). Null: mixed / unknown (Chapter Test, Full Mock, Worksheet, Check &
   * Improve) — then "harder" means Hard and "easier" means Easy.
   */
  difficulty: DifficultyStep | null;
  /**
   * Quick Practice with a missed MCQ only: the scorecard's own in-page way to the first missed question
   * (`ScorecardVariant.onShowMissed`), where the question's "Report issue" form lives. Null elsewhere.
   */
  showMissed: (() => void) | null;
  /** Who asked (the scorecard's ask component). The card is removed when this owner goes away. */
  owner?: object;
  /** Is the asking scorecard still mounted? Checked before the card is drawn. Omitted: assume yes. */
  isAlive?: () => boolean;
  /** The page address (path + search) right now. The host compares it with where the ask started. */
  getAddress?: () => string;
  /** The scorecard's in-flow slot (below its buttons) for phone widths. Null / omitted: float. */
  getSlot?: () => HTMLElement | null;
  /** The host's own "Ask the tutor" hop for the FIRST question that lost marks, when it has one. */
  firstWrongTutor: (() => void) | null;
  /** The chapter's tutor path (returnTo = this page), for when there is no question-level hop. Null: no chapter. */
  chapterTutorTo: string | null;
  /** The scorecard's own page (path + search) — what "back" means for anything that leaves it. */
  returnTo: string;
}

/** The full context: the input plus what only the host can know (the account's history). */
export interface GradedFeedbackContext extends GradedFeedbackContextInput {
  /** True: a written answer was graded for this account before; false: never; null: could not tell. */
  writtenGradedEver: boolean | null;
}

/* ── Building the context from the scorecard's variant (pure) ───────────────────────────────── */

/** Parse the subject + chapter out of the host's own guide target. Several shapes exist (see header). */
export function chapterFromGuideTarget(
  to: string | null | undefined,
): { subject: SubjectSeg; topicKey: string } | null {
  const safe = safeInternalReturnTo(typeof to === "string" ? to : null);
  if (!safe) return null;
  const q = safe.indexOf("?");
  const path = q < 0 ? safe : safe.slice(0, q);
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(q < 0 ? "" : safe.slice(q + 1));
  } catch {
    return null;
  }
  const topic = (params.get("topic") || "").trim();
  if (!topic || topic.startsWith("mixed:")) return null;
  let subjectRaw = "";
  const practice = /^\/practice\/[^/]+\/([^/]+)$/.exec(path);
  if (practice && practice[1] !== "worksheets") subjectRaw = practice[1];
  else if (path === "/practice/worksheets") subjectRaw = params.get("subject") || "";
  else return null;
  if (!subjectRaw) return null;
  return { subject: /sci/i.test(subjectRaw) ? "science" : "maths", topicKey: topic };
}

/** The page's `?difficulty=` when it is one real step (Easy / Medium / Hard). Anything else: unknown. */
export function difficultyFromSearch(search: string | null | undefined): DifficultyStep | null {
  try {
    const raw = new URLSearchParams(search || "").get("difficulty");
    const s = String(raw ?? "").trim().toLowerCase();
    if (s === "easy") return "Easy";
    if (s === "medium") return "Medium";
    if (s === "hard") return "Hard";
  } catch {
    /* unparseable: unknown */
  }
  return null;
}

/** The first question that lost marks AND has a tutor hop the host built (its own navigation, record and returnTo). */
export function firstWrongTutorHop(variant: Pick<ScorecardVariant, "wrongAnswers" | "gradedAnswers">): (() => void) | null {
  for (const w of variant.wrongAnswers ?? []) {
    const ask = w?.tutorAsk;
    if (ask && typeof ask.onAsk === "function") return ask.onAsk;
  }
  for (const a of variant.gradedAnswers ?? []) {
    const ask = a?.tutorAsk;
    const lost =
      typeof a?.awarded === "number" && typeof a?.available === "number" && a.awarded < a.available;
    if (ask && lost && typeof ask.onAsk === "function") return ask.onAsk;
  }
  return null;
}

function stepOrNull(d: unknown): DifficultyStep | null {
  return d === "Easy" || d === "Medium" || d === "Hard" ? d : null;
}

export function buildGradedFeedbackContextInput(args: {
  variant: Pick<ScorecardVariant, "surface" | "guideTarget" | "wrongAnswers" | "gradedAnswers"> & {
    onShowMissed?: (() => void) | null;
  };
  navigate: (to: string) => void;
  pathname: string;
  search: string;
  owner?: object;
  isAlive?: () => boolean;
  getAddress?: () => string;
  getSlot?: () => HTMLElement | null;
}): GradedFeedbackContextInput {
  const { variant } = args;
  const chapter = chapterFromGuideTarget(variant.guideTarget?.to);
  const name = typeof variant.guideTarget?.chapter === "string" ? variant.guideTarget.chapter.trim() : "";
  const returnTo = safeInternalReturnTo(`${args.pathname}${args.search}`) ?? "/practice-hub";
  return {
    navigate: args.navigate,
    surface: String(variant.surface),
    subject: chapter ? chapter.subject : null,
    topicKey: chapter ? chapter.topicKey : null,
    chapter: chapter && name ? name : null,
    difficulty: stepOrNull(variant.guideTarget?.difficulty),
    showMissed: typeof variant.onShowMissed === "function" ? variant.onShowMissed : null,
    owner: args.owner,
    isAlive: args.isAlive,
    getAddress: args.getAddress,
    getSlot: args.getSlot,
    firstWrongTutor: firstWrongTutorHop(variant),
    chapterTutorTo: chapter
      ? buildTutorPath({
          subject: chapter.subject === "science" ? "Science" : "Maths",
          topicKey: chapter.topicKey,
          grade: "10",
          source: "scorecard",
          returnTo,
        })
      : null,
    returnTo,
  };
}

/* ── Destinations ───────────────────────────────────────────────────────────────────────────── */

export const PRACTICE_HUB_PATH = "/practice-hub";
export const CHECK_IMPROVE_PATH = "/check-improve";
export const FEEDBACK_SET_SIZE = 5;

/** Difficulty one step UP: Easy -> Medium -> Hard -> HOTS (null = no harder step). Unknown counts as Medium. */
export function stepUp(d: DifficultyStep | null): { difficulty: DifficultyStep; hots: boolean } {
  if (d === "Easy") return { difficulty: "Medium", hots: false };
  if (d === "Medium" || d === null) return { difficulty: "Hard", hots: false };
  return { difficulty: "Hard", hots: true };
}

/** Difficulty one step DOWN: Hard -> Medium -> Easy; at Easy there is none (null). Unknown counts as Medium. */
export function stepDown(d: DifficultyStep | null): DifficultyStep | null {
  if (d === "Hard") return "Medium";
  if (d === "Medium" || d === null) return "Easy";
  return null;
}

/** `/practice/10/<subject>?topic=<key>&count=5[&difficulty=X][&style=hots]` — or null with no single chapter. */
export function practicePath(
  ctx: Pick<GradedFeedbackContextInput, "subject" | "topicKey">,
  opts: { difficulty?: DifficultyStep | null; hots?: boolean } = {},
): string | null {
  if (!ctx.subject || !ctx.topicKey) return null;
  const q = new URLSearchParams();
  q.set("topic", ctx.topicKey);
  q.set("count", String(FEEDBACK_SET_SIZE));
  if (opts.difficulty) q.set("difficulty", opts.difficulty);
  if (opts.hots) q.set("style", "hots");
  return `/practice/10/${ctx.subject}?${q.toString()}`;
}

/* ── Step 2 / step 3 ────────────────────────────────────────────────────────────────────────── */

export interface GradedButton {
  /** Stable id (test ids, keys). */
  id: string;
  label: string;
  /** The NAME recorded when it is tapped (`feedback_<moment>_next_<action>`). */
  action: FeedbackNextAction;
  /** The route it leads to (for tests and the PR table); the tutor hop is a function and has none. */
  to: string | null;
  /** Do it: navigates with the ROUTER's navigate (or the host's own hop). Never `window.location`. */
  run: () => void;
}

export interface GradedNextStep {
  /** Ziggy's one line. */
  line: string;
  /** Buttons, primary first. May be empty (then only "Close" shows). */
  buttons: GradedButton[];
}

function go(ctx: GradedFeedbackContext, to: string): () => void {
  return () => ctx.navigate(to);
}

function hubButton(ctx: GradedFeedbackContext): GradedButton {
  return {
    id: "picker",
    label: GRADED_FEEDBACK_COPY.button.chooseChapter,
    action: "picker",
    to: PRACTICE_HUB_PATH,
    run: go(ctx, PRACTICE_HUB_PATH),
  };
}

function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_m, k: string) => vars[k] ?? "");
}

/** A button that tutors the student on the first question that lost marks, else on the chapter, else none. */
function tutorButton(ctx: GradedFeedbackContext): GradedButton | null {
  if (ctx.firstWrongTutor) {
    return { id: "tutor", label: GRADED_FEEDBACK_COPY.button.tutor, action: "tutor", to: null, run: ctx.firstWrongTutor };
  }
  if (ctx.chapterTutorTo) {
    return {
      id: "tutor",
      label: GRADED_FEEDBACK_COPY.button.tutor,
      action: "tutor",
      to: ctx.chapterTutorTo,
      run: go(ctx, ctx.chapterTutorTo),
    };
  }
  return null;
}

function writtenButton(ctx: GradedFeedbackContext): GradedButton | null {
  // Only when this account has NEVER had a written answer graded (false). Unknown (null) shows nothing,
  // and Check & Improve itself would point where the student already is.
  // Quick Practice never sends a student to Check & Improve (owner ruling 23 Oct 2026).
  if (ctx.writtenGradedEver !== false || ctx.surface === "check-improve" || ctx.surface === "quick-practice") return null;
  return {
    id: "written",
    label: GRADED_FEEDBACK_COPY.button.written,
    action: "written",
    to: CHECK_IMPROVE_PATH,
    run: go(ctx, CHECK_IMPROVE_PATH),
  };
}

/** Step 2 for Yes / Too easy / Too hard. (Not really goes to step 3: see `NOT_REALLY_REASONS`.) */
export function nextStepFor(answer: Exclude<FirstGradedAnswer, "not_really">, ctx: GradedFeedbackContext): GradedNextStep {
  const L = GRADED_FEEDBACK_COPY;
  const buttons: GradedButton[] = [];
  const hasChapter = !!ctx.subject && !!ctx.topicKey;

  if (answer === "yes") {
    const to = practicePath(ctx, { difficulty: ctx.difficulty });
    if (to) {
      buttons.push({
        id: "more",
        label: ctx.chapter ? fill(L.button.moreOnChapter, { chapter: ctx.chapter }) : L.button.moreGeneric,
        action: "more",
        to,
        run: go(ctx, to),
      });
    } else {
      buttons.push(hubButton(ctx));
    }
    const w = writtenButton(ctx);
    if (w) buttons.push(w);
    return { line: L.line.yes, buttons };
  }

  if (answer === "too_easy") {
    if (hasChapter) {
      const up = stepUp(ctx.difficulty);
      const to = practicePath(ctx, { difficulty: up.difficulty, hots: up.hots });
      if (to) {
        buttons.push({
          id: "harder",
          label: up.hots ? L.button.hots : L.button.harder,
          action: "harder",
          to,
          run: go(ctx, to),
        });
      }
    } else {
      buttons.push(hubButton(ctx));
    }
    return { line: L.line.too_easy, buttons };
  }

  // too_hard
  if (hasChapter) {
    const down = stepDown(ctx.difficulty);
    const to = down ? practicePath(ctx, { difficulty: down }) : null;
    if (to) buttons.push({ id: "easier", label: L.button.easier, action: "easier", to, run: go(ctx, to) });
  }
  const t = tutorButton(ctx);
  if (t) buttons.push(t);
  return { line: L.line.too_hard, buttons };
}

/** Step 3 — the four "what was missing" choices, in order. */
export type NotReallyReason = "unclear" | "marks" | "chapter" | "other";
export const NOT_REALLY_REASONS: ReadonlyArray<{ id: NotReallyReason; label: string }> = [
  { id: "unclear", label: GRADED_FEEDBACK_COPY.why.unclear },
  { id: "marks", label: GRADED_FEEDBACK_COPY.why.marks },
  { id: "chapter", label: GRADED_FEEDBACK_COPY.why.chapter },
  { id: "other", label: GRADED_FEEDBACK_COPY.why.other },
];

export type NotReallyOutcome =
  | { kind: "go"; button: GradedButton }
  | { kind: "note"; noteKind: "marks" | "other"; title: string; hint: string }
  /** Quick Practice, a missed MCQ: open that question (its "Report issue" form) and say where to tap. */
  | { kind: "missed"; line: string; run: () => void }
  | { kind: "none" };

/**
 * Where each "Not really" choice leads.
 *   - Explanation unclear -> the tutor (first wrong question, else the chapter). No tutor available -> a note.
 *   - Marks felt wrong    -> Quick Practice with a missed MCQ: the scorecard's own `onShowMissed` opens that
 *     question, where the existing "Report issue" form lives (PracticeQuestionCard.tsx), and one plain line says
 *     "Tap Report issue under the question." (owner ruling, #1342 review). Every other surface (and Quick
 *     Practice with nothing missed): the "Tell us more" box labelled "Marks felt wrong".
 *   - Wrong chapter       -> the Practice hub chapter picker.
 *   - Something else      -> the plain "Tell us more" box.
 */
export function notReallyOutcome(reason: NotReallyReason, ctx: GradedFeedbackContext): NotReallyOutcome {
  const L = GRADED_FEEDBACK_COPY;
  if (reason === "unclear") {
    const t = tutorButton(ctx);
    if (t) return { kind: "go", button: t };
    return { kind: "note", noteKind: "other", title: L.note.title, hint: L.note.otherHint };
  }
  if (reason === "marks") {
    if (ctx.surface === "quick-practice" && ctx.showMissed) {
      return { kind: "missed", line: L.note.missedLine, run: ctx.showMissed };
    }
    return { kind: "note", noteKind: "marks", title: L.note.marksTitle, hint: L.note.marksHint };
  }
  if (reason === "chapter") {
    return { kind: "go", button: hubButton(ctx) };
  }
  return { kind: "note", noteKind: "other", title: L.note.title, hint: L.note.otherHint };
}

/** Trim and bound a note; null when there is nothing to keep. */
export function cleanNoteText(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const t = raw.replace(/\r\n/g, "\n").trim();
  if (!t) return null;
  return t.slice(0, FEEDBACK_NOTE_MAX);
}
