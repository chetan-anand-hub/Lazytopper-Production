/**
 * GUIDE-PAGES-1 — everything the page helpers DRAW and SAY, in ONE lazily loaded chunk (Vite emits
 * `assets/pageGuidesChunk-<hash>.js` + CSS). Reached only through the dynamic import in ./pageGuides.tsx.
 *
 *   LimitByteBody — M7: Byte's row inside the fair-use limit panel / trial-day dialog. Every line is
 *                   built from the panel's OWN LimitState (scope, tier, window, resetAt) and its own
 *                   formatted reset time; nothing is guessed. Display only, beside the existing
 *                   Pay / Share QR code / Forward link actions (never a payment control of its own).
 *   PageGuidePop  — the entry / Exam Trends helper: a fixed card at the bottom-left (portalled; it never
 *                   moves the page), closed with "Got it", Esc, or the "?" again.
 *
 * ALL COPY IS IN THE THREE TABLES BELOW (M7_COPY, ENTRY_COPY, TRENDS_COPY) for owner review; tests pin
 * them, and pin every line at 22 words or fewer with no "½". What each line claims was read in code:
 *   - "never uses your limit": server/services/fairUse.cjs refuses ONLY /api/check-solution,
 *     /api/grade-worksheet (CHECK_SOLUTION_PATH / GRADE_WORKSHEET_PATH) and /api/tutor,
 *     /api/more-like-this, /api/detect-question (AI_ROUTES). Notes, Topic Hub, Exam Trends and the
 *     NCERT reader call none of them. Worksheets are NOT named: a worksheet's GRADE is metered.
 *   - Chapter Test / Full Mock objective: tapped on screen, "scored the moment you submit"
 *     (ChapterTestPage / FullMockPage setup copy); the rest is written on paper and uploaded.
 *   - Section A objective = 0 or full (CLAUDE.md §13 objective invariant).
 *   - Exam Trends: each item is what ExamTrendsRanked.tsx renders and where its link goes.
 */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import BlobCharacter from "../BlobCharacter";
import { prefersReducedMotion } from "../rig";
import { guidePreviewActive, trackGuideEvent } from "../guideVariant";
import { MASCOTS_TOAST_COPY, hideMascotsWithUndo } from "../moments/mascotsToast";
import { PREMIUM_WINDOW_LABEL, isMidnightIst, type LimitScope, type LimitState } from "../../usage/fairUseGate";
import "../guide.css";
import "./pageGuides.css";

export type PageGuideId = "m7" | "ws_entry" | "ct_entry" | "fm_entry" | "trends_help";
/** `chooser` is the Practice Hub's Chapter Test picker; every other helper is `page`. */
export type PageGuideStep = "page" | "chooser";

/* ── COPY TABLE 1 — M7, Byte on the limit panel ───────────────────────────────────────────── */

export const M7_COPY = {
  /** Which trial limit was hit — the panel's own `limit.scope`. */
  trialHit: {
    checks: "Your answer checks for today are used up.",
    "chapter-test": "Your chapter test allowance for today is used up.",
    "full-mock": "Your full mock allowance for this week is used up.",
    worksheet: "Your worksheet allowance for this week is used up.",
    tutor: "Your Tutor messages for today are used up.",
    "more-like-this": "Your new practice questions for today are used up.",
  } satisfies Record<LimitScope, string>,
  /** A Premium student at a fair-use window: {window} is the panel's own window label. */
  premiumHit: "You've reached Premium's {window} fair-use limit.",
  /** When it resets — only from the panel's own resetAt; omitted when the server sent none. */
  resetMidnight: "It comes back after midnight.",
  resetAt: "It comes back at {when}.",
  /** What still works now (none of these pages calls a metered route — see the header). */
  still: "Notes, Topic Hub, Exam Trends and NCERT solutions still work. Reading them never uses your limit.",
  /** Trial only: Premium in one line, beside the existing actions. No price, no urgency. */
  premiumLine: "Premium removes the trial's daily and weekly limits. A fair-use limit still applies.",
  adminPreview: "Admin preview",
} as const;

/** PURE. Byte's lines for a limit, from the panel's own data only. */
export function m7Lines(limit: LimitState, when: string): { hit: string; still: string; premium: string | null } {
  const head =
    limit.tier === "premium"
      ? M7_COPY.premiumHit.replace("{window}", PREMIUM_WINDOW_LABEL[limit.window ?? "day"])
      : M7_COPY.trialHit[limit.scope];
  let reset = "";
  if (limit.resetAt && isMidnightIst(limit.resetAt)) reset = M7_COPY.resetMidnight;
  else if (limit.resetAt && when) reset = M7_COPY.resetAt.replace("{when}", when);
  return {
    hit: reset ? `${head} ${reset}` : head,
    still: M7_COPY.still,
    premium: limit.tier === "trial" ? M7_COPY.premiumLine : null,
  };
}

/* ── COPY TABLE 2 — the entry helpers (Worksheet, Chapter Test, Full Mock) ────────────────── */

export interface EntryCopy {
  what: string;
  how: string;
  first: string;
}

export const ENTRY_COPY = {
  ws_entry: {
    page: {
      what: "A worksheet is a board-pattern set from your chosen chapters. You solve it on paper, not on screen.",
      how: "Upload a photo and it's marked step by step. Section A answers score full marks or zero, like the board.",
      first: "First, tap Preview worksheet to see the questions before you begin.",
    },
  },
  ct_entry: {
    chooser: {
      what: "A chapter test is a board-pattern paper on one chapter, freshly drawn every time.",
      how: "Objective answers are tapped and score full or zero. Write the rest on paper, upload, and get step-marked.",
      first: "First, pick your subject and chapter, then tap Start Chapter Test.",
    },
    page: {
      what: "A chapter test is a board-pattern paper on this one chapter. Each test is a fresh draw.",
      how: "Objective answers are tapped and score full or zero. Write the rest on paper, upload, and get step-marked.",
      first: "First, choose whether you want the timer, then tap Start the test.",
    },
  },
  fm_entry: {
    page: {
      what: "A full mock is a complete board paper: every chapter, CBSE's unit marks and real timing.",
      how: "Objective answers score full or zero when you submit. Write the rest on paper, upload, and get step-marked.",
      first: "First, keep 3 hours free. It's always timed, and your answers are saved if you're interrupted.",
    },
  },
} as const satisfies Record<"ws_entry" | "ct_entry" | "fm_entry", Partial<Record<PageGuideStep, EntryCopy>>>;

/* ── COPY TABLE 3 — Exam Trends, one line per part of the page ────────────────────────────── */

export const TRENDS_COPY = {
  intro: "Here's what each part of this page means for your marks.",
  items: [
    { key: "bands", label: "Must-crack, High-ROI, Good-to-do", line: "Every chapter sits in one band. Start with Must-crack: big marks that come every year." },
    { key: "marks", label: "~ marks", line: "About how many of the 80 board marks this chapter carries. CBSE gives unit marks; we split them by chapter." },
    { key: "tier", label: "High / Medium / Low", line: "How strongly this chapter shows up in past CBSE papers. Never a made-up percentage." },
    { key: "expect", label: "Expect", line: "The question shape that keeps coming back in this chapter. A pattern to prepare, not a promised question." },
    { key: "hpq", label: "Important Qs", line: "This chapter's Important Questions, the ones most likely to come. Open them from the ⋯ menu." },
    { key: "learn", label: "Learn", line: "Opens this chapter's Topic Hub, where you learn it concept by concept." },
    { key: "notes", label: "Notes and NCERT", line: "Short revision notes and the NCERT chapter itself, for quick reading before you practise." },
    { key: "select", label: "+", line: "Tap + on a few chapters to practise them together, build one worksheet or see their important questions." },
    { key: "weightage", label: "CBSE's official unit weightage", line: "CBSE's own marks for each unit, so you can see where the 80 marks come from." },
    { key: "guide", label: "Marking guide", line: "How examiners give marks step by step, so you know what to write in the exam." },
  ],
  ziggy: "Pick one Must-crack chapter today. Small steps add up!",
} as const;

export const POP_COPY = {
  gotIt: "Got it",
  label: "Byte explains this page",
  ziggy: "Ziggy",
  adminPreview: "Admin preview",
} as const;

/* ── shared bits ──────────────────────────────────────────────────────────────────────────── */

/** The "Hide mascots" button every bubble carries (MOMENTS-1 PART 0). */
function HideButton() {
  return (
    <button type="button" className="lt-pg__hide" data-testid="mascots-hide" onClick={hideMascotsWithUndo}>
      {MASCOTS_TOAST_COPY.hide}
    </button>
  );
}

function AdminPill({ on }: { on: boolean }) {
  return on ? (
    <span className="lt-pg__admin" data-testid="guide-admin-preview">
      {POP_COPY.adminPreview}
    </span>
  ) : null;
}

/* ── M7 ───────────────────────────────────────────────────────────────────────────────────── */

export interface LimitByteBodyProps {
  limit: LimitState;
  when: string;
}

export function LimitByteBody({ limit, when }: LimitByteBodyProps) {
  const reduce = useRef(prefersReducedMotion());
  const [preview] = useState(() => guidePreviewActive());
  // guide_moment_shown — once per refusal shown (a NEW limit object is a new refusal).
  useEffect(() => {
    trackGuideEvent("guide_moment_shown", { moment: "m7" });
  }, [limit]);
  const lines = m7Lines(limit, when);
  return (
    <div className="lt-pg-m7" data-testid="guide-moment-m7" data-tier={limit.tier} data-scope={limit.scope} role="group" aria-label="Byte">
      <BlobCharacter kind="byte" pose="explain" className="lt-pg-m7__char" still={reduce.current || undefined} />
      <div className="lt-pg__bub lt-pg-m7__bub">
        <AdminPill on={preview} />
        <p className="lt-pg__say" data-testid="guide-m7-hit">
          {lines.hit}
        </p>
        <p className="lt-pg__say lt-pg__say--soft" data-testid="guide-m7-still">
          {lines.still}
        </p>
        {lines.premium ? (
          <p className="lt-pg__say lt-pg__say--soft" data-testid="guide-m7-premium">
            {lines.premium}
          </p>
        ) : null}
        <HideButton />
      </div>
    </div>
  );
}

/* ── the entry / Exam Trends card ─────────────────────────────────────────────────────────── */

export interface PageGuidePopProps {
  id: Exclude<PageGuideId, "m7">;
  step: PageGuideStep;
  bare: boolean;
  onClose: () => void;
}

function entryCopyFor(id: PageGuidePopProps["id"], step: PageGuideStep): EntryCopy | null {
  if (id === "trends_help") return null;
  const byStep = ENTRY_COPY[id] as Partial<Record<PageGuideStep, EntryCopy>>;
  return byStep[step] ?? byStep.page ?? null;
}

export function PageGuidePop({ id, step, bare, onClose }: PageGuidePopProps) {
  const reduce = useRef(prefersReducedMotion());
  const [preview] = useState(() => guidePreviewActive());
  const gotIt = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    trackGuideEvent("guide_moment_shown", { moment: id });
    // Opened by a tap on "?": hand focus to "Got it". Opened by itself (first visit): leave focus alone.
    const active = typeof document !== "undefined" ? (document.activeElement as HTMLElement | null) : null;
    if (active && typeof active.closest === "function" && active.closest(".lt-pg-door")) gotIt.current?.focus();
  }, [id]);

  if (typeof document === "undefined") return null;
  const entry = entryCopyFor(id, step);

  return createPortal(
    <div
      className={`lt-pg-pop${bare ? " lt-pg-pop--bare" : ""}${id === "trends_help" ? " lt-pg-pop--list" : ""}`}
      data-testid={`page-guide-pop-${id}`}
      data-step={step}
      role="dialog"
      aria-modal="false"
      aria-label={POP_COPY.label}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <BlobCharacter kind="byte" pose={id === "trends_help" ? "point" : "explain"} className="lt-pg-pop__byte" still={reduce.current || undefined} />
      <div className="lt-pg__bub lt-pg-pop__bub">
        <AdminPill on={preview} />
        {entry ? (
          <>
            <p className="lt-pg__say" data-testid="page-guide-line">
              {entry.what}
            </p>
            <p className="lt-pg__say lt-pg__say--soft" data-testid="page-guide-line">
              {entry.how}
            </p>
            <p className="lt-pg__say lt-pg__say--first" data-testid="page-guide-line">
              {entry.first}
            </p>
          </>
        ) : (
          <>
            <p className="lt-pg__say" data-testid="page-guide-line">
              {TRENDS_COPY.intro}
            </p>
            <dl className="lt-pg-pop__list">
              {TRENDS_COPY.items.map((it) => (
                <div className="lt-pg-pop__item" key={it.key} data-testid={`trends-help-${it.key}`}>
                  <dt>{it.label}</dt>
                  <dd>{it.line}</dd>
                </div>
              ))}
            </dl>
            <p className="lt-pg-pop__ziggy" data-testid="page-guide-ziggy">
              <span className="lt-pg-pop__zname">{POP_COPY.ziggy}</span> {TRENDS_COPY.ziggy}
            </p>
          </>
        )}
        <div className="lt-pg-pop__acts">
          <button ref={gotIt} type="button" className="lt-pg-pop__ok" data-testid="page-guide-close" onClick={onClose}>
            {POP_COPY.gotIt}
          </button>
          <HideButton />
        </div>
      </div>
    </div>,
    document.body,
  );
}
