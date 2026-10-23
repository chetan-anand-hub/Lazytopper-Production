/**
 * GUIDE-PAGES-1 — everything the page helpers DRAW and SAY, in ONE lazily loaded chunk (Vite emits
 * `assets/pageGuidesChunk-<hash>.js` + CSS). Reached only through the dynamic import in ./pageGuides.tsx.
 *
 *   M7Character  — M7: ONLY Byte's drawing for the limit panel row. The row, its words (./m7Copy.ts)
 *                  and its fixed-size character box are EAGER (./pageGuides.tsx), so the panel never
 *                  grows when this chunk arrives.
 *   PageGuidePop — the entry / Exam Trends helper: a fixed card at the bottom-left (portalled; it never
 *                  moves the page), closed with "Got it", Esc, or the "?" again.
 *
 * COPY TABLES for owner review: M7_COPY (./m7Copy.ts, re-exported here), ENTRY_COPY, TRENDS_COPY.
 * Tests pin them, and pin every line at 22 words or fewer with no "½". What each line claims was read in code:
 *   - Chapter Test / Full Mock objective: tapped on screen, "scored the moment you submit"
 *     (ChapterTestPage / FullMockPage setup copy); the rest is written on paper and uploaded.
 *   - Section A objective = 0 or full (CLAUDE.md §13 objective invariant).
 *   - Exam Trends: each item is what ExamTrendsRanked.tsx renders and where its link goes. "Learn" goes
 *     to /topic-hub/:slug (ExamTrendsRanked.tsx learnHref; buildDesktopTopicHubPath), the route at
 *     App.tsx `path="/topic-hub/:topicName"` → DesktopTopicHubPage with NO RequirePremium (only the
 *     legacy /topic-hub/:grade/:subject[/:topicKey] routes are premium-gated), so the line promises
 *     nothing it would not give a trial-ended student.
 *   - Byte and Ziggy are never drawn together: the Exam Trends closing tip is Byte's own line.
 */
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import BlobCharacter from "../BlobCharacter";
import { prefersReducedMotion } from "../rig";
import { guidePreviewActive, setGuideFocusOpen, trackGuideEvent } from "../guideVariant";
import { MASCOTS_TOAST_COPY, hideMascotsWithUndo } from "../moments/mascotsToast";
import "../guide.css";
import "./pageGuides.css";

export { M7_COPY, m7Lines } from "./m7Copy";

export type PageGuideId = "m7" | "ws_entry" | "ct_entry" | "fm_entry" | "trends_help";
/** `chooser` is the Practice Hub's Chapter Test picker; every other helper is `page`. */
export type PageGuideStep = "page" | "chooser";

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
    { key: "hpq", label: "Important Qs", line: "Important Qs opens this chapter's Important Questions page: board-pattern questions built from 10 years of CBSE papers. Patterns, not the actual paper." },
    { key: "learn", label: "Learn", line: "Opens this chapter's Topic Hub, where you learn it concept by concept." },
    { key: "notes", label: "Notes and NCERT", line: "Short revision notes and the NCERT chapter itself, for quick reading before you practise." },
    { key: "select", label: "+", line: "Tap + on a few chapters to practise them together, build one worksheet or see their important questions." },
    { key: "weightage", label: "CBSE's official unit weightage", line: "CBSE's own marks for each unit, so you can see where the 80 marks come from." },
    { key: "guide", label: "Marking guide", line: "How examiners give marks step by step, so you know what to write in the exam." },
  ],
  /** Byte's own closing tip (no second character in this card). */
  tip: "My tip: pick one Must-crack chapter today and finish it. Small steps add up.",
} as const;

export const POP_COPY = {
  gotIt: "Got it",
  label: "Byte explains this page",
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

/** Byte's drawing only, inside the eager row's fixed-size box (so its arrival moves nothing). */
export function M7Character() {
  const reduce = useRef(prefersReducedMotion());
  return <BlobCharacter kind="byte" pose="explain" className="lt-pg-m7__char" still={reduce.current || undefined} />;
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

/* ── GUIDE-PAGES-FLAKE-1: the card never covers the page's primary action ──────────────────── */

/**
 * The element the card must never sit on, per helper: the start row / button a student came to
 * press. Exam Trends has no single primary action (its card covers the left of the list only).
 */
export const PAGE_GUIDE_AVOID: Partial<Record<string, string>> = {
  "ct_entry:page": ".lt-ct__startrow",
  "ct_entry:chooser": "[data-testid='ct-picker-open']",
  "fm_entry:page": ".lt-ct__startrow",
  // the hero's Preview row AND the Customise drawer's own Preview row (FIX B)
  "ws_entry:page": ".lt-ws__herobot, .lt-ws__drawerfoot",
};

export interface Box {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface PlaceInput {
  /** viewport height */
  vh: number;
  /** the card's DEFAULT box (bottom-placed, natural height) — measured, never assumed */
  card: Box;
  /** the primary action(s) the card must not cover */
  avoid: Box[];
  /** what the card must never cover when it moves: the "?" toggle that closes it */
  keep: Box[];
  /** the card's measured gap from the bottom edge (the CSS bottom offset, incl. safe-area) */
  bottomGap: number;
  /** the gap kept from the top edge when it moves up */
  topGap: number;
}

/** Breathing room kept between the card and anything it must not cover. */
const AVOID_MARGIN = 8;

const laidOut = (b: Box, vh: number) => b.bottom > b.top && b.bottom > 0 && b.top < vh;
const sideBySide = (a: Box, b: Box) => a.right <= b.left || a.left >= b.right;
const overlaps = (a: Box, b: Box) => !sideBySide(a, b) && a.top < b.bottom && a.bottom > b.top;

/**
 * PURE. Where the card goes so it never covers the primary action:
 *   `null` — the DEFAULT box covers no primary action: nothing moves (the default stands).
 *   otherwise — the largest free vertical band between the top gap and the bottom offset that
 *   holds none of the primary actions NOR the "?" toggle (only what is in the card's columns
 *   counts), with the bubble capped to that band (it scrolls inside). `anchor: "bottom"` keeps the
 *   default bottom edge when that band reaches it; otherwise the card's top is `top`.
 */
export function placePageGuide(p: PlaceInput): { anchor: "top" | "bottom"; top: number; maxH: number } | null {
  const { vh, card } = p;
  const avoid = p.avoid.filter((b) => laidOut(b, vh));
  if (!avoid.some((b) => overlaps(b, card))) return null;
  const limitTop = p.topGap;
  const limitBottom = vh - p.bottomGap;
  const blocks = [...avoid, ...p.keep.filter((b) => laidOut(b, vh))]
    .filter((b) => !sideBySide(b, card))
    .map((b) => ({ top: b.top - AVOID_MARGIN, bottom: b.bottom + AVOID_MARGIN }))
    .sort((a, b) => a.top - b.top);
  const bands: { top: number; bottom: number }[] = [];
  let cursor = limitTop;
  for (const b of blocks) {
    if (b.top > cursor) bands.push({ top: cursor, bottom: Math.min(b.top, limitBottom) });
    cursor = Math.max(cursor, b.bottom);
  }
  if (cursor < limitBottom) bands.push({ top: cursor, bottom: limitBottom });
  const best = bands.filter((b) => b.bottom > b.top).sort((a, b) => b.bottom - b.top - (a.bottom - a.top))[0];
  if (!best) return { anchor: "top", top: limitTop, maxH: 0 };
  const maxH = Math.floor(best.bottom - best.top);
  return best.bottom >= limitBottom
    ? { anchor: "bottom", top: Math.floor(best.top), maxH }
    : { anchor: "top", top: Math.ceil(best.top), maxH };
}

const boxOf = (el: Element): Box => {
  const r = el.getBoundingClientRect();
  return { top: r.top, bottom: r.bottom, left: r.left, right: r.right };
};

/** Keeps the card off the primary action while it is open (scroll, resize, the page filling in). */
function useAvoidPrimary(popRef: RefObject<HTMLDivElement | null>, selector: string | undefined, doorSelector: string): void {
  useLayoutEffect(() => {
    const pop = popRef.current;
    if (!pop || !selector || typeof window === "undefined") return;
    let raf = 0;
    const apply = () => {
      raf = 0;
      // Measure the DEFAULT box first (the CSS placement, natural height), so the card only moves
      // when where it really is would cover the primary action.
      delete pop.dataset.place;
      pop.style.removeProperty("--lt-pg-max");
      pop.style.removeProperty("--lt-pg-top");
      const vh = window.innerHeight;
      const card = boxOf(pop);
      // The bottom offset the CSS really applied (68px + env(safe-area-inset-bottom) on a phone,
      // 16px on desktop): read from the laid-out card, else from its computed style.
      const cssBottom = parseFloat(window.getComputedStyle(pop).bottom);
      const bottomGap = card.bottom > card.top ? vh - card.bottom : Number.isFinite(cssBottom) ? cssBottom : 68;
      const placed = placePageGuide({
        vh,
        card,
        avoid: Array.from(document.querySelectorAll(selector)).map(boxOf),
        keep: Array.from(document.querySelectorAll(doorSelector)).map(boxOf),
        bottomGap,
        topGap: window.innerWidth >= 1024 ? 16 : 8,
      });
      if (!placed) return;
      pop.dataset.place = placed.anchor;
      pop.style.setProperty("--lt-pg-max", `${placed.maxH}px`);
      if (placed.anchor === "top") pop.style.setProperty("--lt-pg-top", `${placed.top}px`);
    };
    const schedule = () => {
      if (!raf) raf = window.requestAnimationFrame(apply);
    };
    apply();
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, { capture: true, passive: true });
    const mo = typeof MutationObserver === "function" ? new MutationObserver(schedule) : null;
    mo?.observe(document.body, { childList: true, subtree: true });
    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, { capture: true });
      mo?.disconnect();
    };
  }, [popRef, selector, doorSelector]);
}

/** True while the student is typing somewhere (Esc there belongs to that field, not the card). */
function typingIn(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (el as HTMLElement).isContentEditable === true;
}

/** Esc closes the open card wherever focus is — unless the student is typing in a field. */
function useEscAnywhere(onClose: () => void): void {
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (typeof document === "undefined") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || typingIn(document.activeElement)) return;
      // The card goes first: one Esc closes it (a host overlay behind it gets the next Esc).
      e.stopPropagation();
      close.current();
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, []);
}

export function PageGuidePop({ id, step, bare, onClose }: PageGuidePopProps) {
  const reduce = useRef(prefersReducedMotion());
  const [preview] = useState(() => guidePreviewActive());
  const gotIt = useRef<HTMLButtonElement | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);
  useAvoidPrimary(popRef, PAGE_GUIDE_AVOID[`${id}:${step}`], `[data-testid='page-guide-${id}-help']`);
  useEscAnywhere(onClose);

  // While this card is open it is the page's one focused guide (guideVariant's focus counter — the
  // same signal StartHereCard uses), so another character can wait instead of appearing beside it.
  useEffect(() => {
    setGuideFocusOpen(true);
    return () => setGuideFocusOpen(false);
  }, []);

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
      ref={popRef}
      className={`lt-pg-pop${bare ? " lt-pg-pop--bare" : ""}${id === "trends_help" ? " lt-pg-pop--list" : ""}`}
      data-testid={`page-guide-pop-${id}`}
      data-step={step}
      role="dialog"
      aria-modal="false"
      aria-label={POP_COPY.label}
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
            <p className="lt-pg__say lt-pg__say--first" data-testid="page-guide-tip">
              {TRENDS_COPY.tip}
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
