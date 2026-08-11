import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useIsDesktop } from "../hooks/useIsDesktop";
import { useSubscription } from "../hooks/useSubscription";
import {
  getWindowedProgress,
  isShortSpan,
  type ProgressWindow,
  type WindowedProgress,
  type RungTrend,
  type WindowedProgressScope,
} from "../services/progressStore";
import { getMistakeLogs, type MistakeLogEntry } from "../services/mistakeLogService";
import { summarizeCareless } from "../services/mistakeInsightsService";
import { planMistakeRetry, retryCopyFor } from "../services/mistakeRetry";
import { normalizeTopicKey } from "../utils/topicResolver";
import { desktopTopicForWeakAreaKey } from "../lib/desktop/topics";
import { buildActionableDesktopTopicHubContent } from "../lib/desktop/topicHubContent";
import {
  buildDesktopTopicHubPath,
  buildDesktopConceptPracticePath,
  buildDesktopPracticePath,
  buildDesktopWorksheetPath,
  withQuery,
  type DesktopRouteContext,
  type DesktopSubject,
} from "../lib/desktop/navigation";
import { UpgradeSheet } from "../components/subscription/UpgradeSheet";
// DPDP (SETTINGS-1). /me is the account surface - /settings was retired and /profile
// redirects here - so the student's export and erasure rights live on the one routed
// page a signed-in student can already reach from the nav.
import AccountDataControls from "../components/account/AccountDataControls";

/**
 * MeProgressPage - ONE responsive Me / Progress surface for every width.
 *
 * ME-2 (Wave ME-C) rebuilt this page's PRESENTATION on the v7.1 prototype. #631's
 * convergence (one page file, `useIsDesktop()` at 1024px, never two page files) is
 * kept, not re-done. This surface is presentation + wiring ONLY: it reads existing
 * services and changes no counting rule, no store and no grader.
 *
 * ONE STREAM, SO THE NUMBERS RECONCILE (owner-ruled).
 *   Every marks figure on this page comes from ONE read - `getWindowedProgress`.
 *   The hero is the truth; the three deeper views are partitions of it, and each
 *   carries an explicit "not yet traced" remainder so all three add up to the hero.
 *   The remainders are REAL holes in the data, not padding:
 *     - `buildTopicRung` drops a point whose topicKey is unresolvable,
 *     - `concepts` is bank-matched only (C&I and chapter-echo rows stay silent),
 *     - `marksTrend` stays silent below 3 measurable points per half.
 *   The mistake log is used for ONE thing only: SPLITTING the already-known lost
 *   marks into careless vs knowledge. When the two streams disagree (the log
 *   attributes more than the graded stream lost) we say WHAT was lost and refuse to
 *   say WHY - see `splitPaperMarks`.
 *
 * TWO PAPERS, NEVER MIXED. Maths and Science are two separate 80-mark exams.
 *   Subject purity is achieved by SCOPING THE READ (`getWindowedProgress(uid, w,
 *   { subject })`), not by filtering afterwards - `concepts` and `sections` rungs
 *   carry no subject of their own and could not be filtered after the fact.
 *
 * HONEST-OR-SILENT, AT SENTENCE LEVEL:
 *   - No sample data. A block renders only when its read returns data; the first-run
 *     state shows a NAMED EXAMPLE student behind a dashed frame and an explicit
 *     "Example - not your marks" tag, and never the student's own name.
 *   - `silly` and `presentation` are CARELESS MARK-LOSS - exam technique. They are
 *     named in the mistake mix and in the easy-marks card, and are NEVER admitted to
 *     the chapter list or tagged onto a chapter. That is the moat.
 *   - MARKS, NEVER PERCENTAGES. `RungTrend` carries `marksScored`/`marksAvailable`;
 *     the before/now percentages exist but are not a student-facing unit here.
 *
 * BACK-NAV CONTRACT: every outbound CTA carries BOTH mechanisms -
 *   `?source=me&returnTo=/me` AND `state:{ back, backLabel }`. Never a bare <a href>:
 *   a plain href drops location.state and the destination loses its Back button.
 *
 * THE PICKER SHEET IS PORTALLED TO `document.body` ON PURPOSE. The page renders
 *   inside `<main class="animate-float-up">`, whose `transform` becomes the
 *   containing block for `position: fixed` descendants. Without the portal the sheet
 *   is trapped under the mobile BottomNav while every wording assertion still passes.
 *   `AccountDataControls` documents the same defect; do not "tidy" either portal away.
 *
 * No new dependency, no Tailwind, inline SVG only. Static styling is class-driven
 * from one injected stylesheet; the only inline style objects are DATA-DRIVEN values
 * (a bar segment's width and tone), per the CLAUDE.md section 7 ruling for this page.
 */

const ROUTE_CTX: DesktopRouteContext = { source: "me", returnTo: "/me" };
const BACK_LABEL = "Back to Me / Progress";
const BACK_STATE = { back: "/me", backLabel: BACK_LABEL } as const;

const WINDOWS: Array<{ value: ProgressWindow; label: string }> = [
  { value: "week", label: "Week" },
  { value: "2wk", label: "2 weeks" },
  { value: "month", label: "Month" },
  { value: "4mo", label: "4 months" },
];

const WINDOW_PHRASE: Record<ProgressWindow, string> = {
  week: "the last week",
  "2wk": "the last two weeks",
  month: "the last month",
  "4mo": "the last four months",
};

/** The two papers. Two separate 80-mark exams - nothing below the switch mixes them. */
const PAPERS: DesktopSubject[] = ["Maths", "Science"];

/** `SessionSubject` is LOWERCASE ("maths" | "science") - the scope key, not the label. */
type PaperScopeKey = NonNullable<WindowedProgressScope["subject"]>;
const paperScopeKey = (paper: DesktopSubject): PaperScopeKey =>
  paper === "Science" ? "science" : "maths";

/** Careless buckets - exam technique, never a topic weakness. The moat. */
const CARELESS_TYPES = new Set(["silly", "presentation"]);
/** The other two four-type buckets - a real knowledge gap, worth practising. */
const KNOWLEDGE_TYPES = new Set(["conceptual", "calculation"]);

/**
 * The four-type palette. Page-local and NOT exported: the scorecard colours its
 * swatches with CSS classes and the MI panel owns a separate `TYPE_TONE` with
 * different values, so this map has exactly one consumer - this file.
 *
 * TONED FOR CONTRAST, NOT FOR TASTE. Every value here must carry a
 * var(--me-navy) numeral at 4.5:1 - the NORMAL-text threshold - because the bar
 * prints its marks inside the segment. Navy is the darker colour of the pair, so
 * the tone has to be LIGHT enough, not dark enough: a segment needs relative
 * luminance >= 0.3238 to clear 4.5 against navy's 0.0331. Saturation is raised
 * alongside lightness so the hue stays definite instead of washing out.
 *
 * Measured, alpha-composited, navy-on-tone:
 *   conceptual 4.84 - calculation 6.24 - silly 4.84 - presentation 4.91
 *
 * If you change a value here, re-measure it and update the matching legend
 * swatch in ME_CSS, which repeats these colours literally.
 */
const MISTAKE_TONE: Record<string, string> = {
  conceptual: "hsl(215, 85%, 68%)",
  calculation: "hsl(38, 80%, 58%)",
  silly: "hsl(0, 80%, 72%)",
  presentation: "hsl(280, 65%, 72%)",
};

/**
 * The two group headings, VERBATIM from the shipped scorecard
 * (`ResultsScorecard.tsx`, symbol `FourTypeBlock`, under the heading "Where your
 * marks went"). A student who has just read a scorecard must meet the same words
 * here - no invented synonyms, and no "not learnt yet".
 */
const GROUP_HEADING = {
  knowledge: "Knowledge gaps — worth practising",
  careless: "Careless mark-loss — not a weakness",
} as const;

/**
 * The two non-mistake segments. Both already clear 4.5:1 against var(--me-navy)
 * unchanged - secured 4.68, unclassified 6.16, both measured with the same
 * alpha-compositing probe - so neither is retoned. Do not darken them: navy is
 * the text, so darkening a segment REDUCES the numeral's contrast.
 */
const SECURED_TONE = "hsl(152, 55%, 45%)";
const UNCLASSIFIED_TONE = "hsl(215, 15%, 72%)";

/**
 * The share a segment needs PER CHARACTER of its numeral before that numeral is
 * printed inside the bar. Below it the segment stays silent and the legend - which
 * prints every number in full - carries it.
 *
 * DERIVED, NOT CHOSEN. Measured in a real browser at 360px, the narrowest width the
 * product supports and therefore the one that governs:
 *   - the bar's content box is 248px;
 *   - .lt-me__seg renders at 16px/700 there, where one digit advances 9.2035px;
 *   - a numeral reads as belonging to its segment only while colour remains on both
 *     sides of it, so it may fill at most about 70% of the segment.
 *   9.2035 / 0.70 / 248 = 0.0530 per character.
 *
 * PER CHARACTER, because one flat share cannot serve both ends: a one-character
 * numeral needs 5.3% and a three-character one needs 15.9%. A flat threshold either
 * hides numerals that would have fitted, or lets a three-digit numeral overflow a
 * segment whose overflow is hidden - which would clip 100 into a DIFFERENT, WRONG
 * number on screen. String length, not digit count, so a value like 7.5 is measured
 * as the three characters it actually renders.
 *
 * This REPLACES a flat 0.12 sized for an 18.66px bold numeral, i.e. for the
 * large-text contrast workaround. That workaround is gone - the segment tones now
 * clear 4.5:1 at normal text size. (Its 18.66px premise never held below 1024px in
 * any case: .lt-me--mobile .lt-me__seg has always rendered 16px.)
 */
const SEGMENT_NUMERAL_MIN_SHARE_PER_CHAR = 0.053;

/** How many chapter cards "Start here" shows before Show more. */
const START_HERE_VISIBLE = 3;

/* ------------------ query helpers - BOTH nav mechanisms ------------------ */

/** Appends the query half of the back-nav contract to a plain internal path. */
function withMeQuery(path: string): string {
  const params = new URLSearchParams();
  if (ROUTE_CTX.source) params.set("source", ROUTE_CTX.source);
  if (ROUTE_CTX.returnTo) params.set("returnTo", ROUTE_CTX.returnTo);
  return withQuery(path, params);
}

/* ------------------ pure derivation (real data only) ------------------ */

const round1 = (n: number): number => Math.round(n * 10) / 10;

/**
 * Marks LOST on a rung, or null when the rung carries no marks at all.
 *
 * ABSENCE IS MEANINGFUL. The mistake-type rung is a composition SHARE and carries no
 * marks denominator; coercing that absence to 0 would print "0 of 0 marks", which is
 * an invented figure. Returning null keeps the caller silent instead.
 */
export function lostMarksOf(rung: RungTrend): number | null {
  const available = rung.marksAvailable;
  const scored = rung.marksScored;
  if (typeof available !== "number" || typeof scored !== "number") return null;
  if (!Number.isFinite(available) || !Number.isFinite(scored)) return null;
  return Math.max(0, round1(available - scored));
}

export interface PaperSplit {
  available: number;
  secured: number;
  lost: number;
  careless: number;
  knowledge: number;
  unclassified: number;
  /**
   * False when the mistake log attributes MORE marks than the graded stream says
   * were lost. The two streams are deduplicated differently, so this can happen;
   * when it does we show WHAT was lost and refuse to say WHY rather than clamp a
   * number into shape.
   */
  splitKnown: boolean;
}

/**
 * The hero split. `rung` is the subject rung for the chosen paper (the graded stream,
 * which owns the denominators); `logs` are that paper's mistake-log entries, which
 * own the careless/knowledge attribution.
 *
 * `unclassified` is the honest remainder: lost marks that carry no mistake type. It
 * has TWO real sources - binary one-markers, which are simply right or wrong, and
 * [FU-GRADER-DEDUCTION-WITHOUT-TYPE], a live server-side defect where the grader
 * deducts on a step carrying no `mistakeType`. It is never a dumping ground and it is
 * never the place to hide a rounding difference.
 */
export function splitPaperMarks(
  rung: RungTrend | null | undefined,
  logs: MistakeLogEntry[],
): PaperSplit | null {
  if (!rung) return null;
  const available = rung.marksAvailable;
  const secured = rung.marksScored;
  if (typeof available !== "number" || typeof secured !== "number") return null;
  if (!Number.isFinite(available) || !Number.isFinite(secured) || available <= 0) return null;

  const lost = Math.max(0, round1(available - secured));
  let careless = 0;
  let knowledge = 0;
  for (const entry of logs) {
    for (const step of entry.stepDetails ?? []) {
      const type = String(step?.mistakeType ?? "").trim().toLowerCase();
      const marks = Number(step?.marksDeducted);
      if (!Number.isFinite(marks) || marks <= 0) continue;
      if (CARELESS_TYPES.has(type)) careless += marks;
      else if (KNOWLEDGE_TYPES.has(type)) knowledge += marks;
    }
  }
  careless = round1(careless);
  knowledge = round1(knowledge);

  if (careless + knowledge > lost + 0.05) {
    return {
      available: round1(available),
      secured: round1(secured),
      lost,
      careless: 0,
      knowledge: 0,
      unclassified: lost,
      splitKnown: false,
    };
  }
  return {
    available: round1(available),
    secured: round1(secured),
    lost,
    careless,
    knowledge,
    unclassified: Math.max(0, round1(lost - careless - knowledge)),
    splitKnown: true,
  };
}

export interface ViewRow {
  key: string;
  label: string;
  lost: number;
}

/** A deeper-analysis view: rungs with real lost marks, worst first. */
export function viewRowsFrom(rungs: RungTrend[]): ViewRow[] {
  const rows: ViewRow[] = [];
  for (const rung of rungs) {
    const lost = lostMarksOf(rung);
    if (lost === null || lost <= 0) continue;
    rows.push({ key: rung.key, label: rung.label || rung.key, lost });
  }
  return rows.sort((a, b) => b.lost - a.lost);
}

/**
 * The marks a view cannot yet attribute. The hero is the truth and is never shrunk to
 * match the finest grain - the difference is stated in words instead. A student will
 * add the rows up, so this row is what makes the sum come out right.
 */
export function remainderOf(heroLost: number, rows: ViewRow[]): number {
  const sum = rows.reduce((total, r) => total + r.lost, 0);
  return Math.max(0, round1(heroLost - sum));
}

/**
 * The `?concept=` value for a Topic Hub arrival, or null.
 *
 * `BoardConcept` is `{name, oneLineUse, marks}` - it has NO key field, so a concept's
 * identity IS its name, and `DesktopTopicHubPage` (#647) resolves the param with a
 * full-string `boardEssentials.find((c) => c.name === raw)`. Anything slugified,
 * canonicalised or lower-cased silently fails to match.
 *
 * So this does not TRANSFORM a candidate - it CONFIRMS one. A candidate that is not
 * verbatim a `boardEssentials` name yields null and the link then carries no `concept`
 * at all: an honest arrival with no highlight beats a param that quietly never matches.
 */
export function resolveArrivalConcept(
  topicSlug: string | null | undefined,
  candidates: Array<string | null | undefined>,
): string | null {
  if (!topicSlug) return null;
  const essentials = buildActionableDesktopTopicHubContent(topicSlug)?.boardEssentials;
  if (!essentials || essentials.length === 0) return null;
  for (const candidate of candidates) {
    const raw = typeof candidate === "string" ? candidate.trim() : "";
    if (!raw) continue;
    const hit = essentials.find((c) => c.name === raw);
    if (hit) return hit.name;
  }
  return null;
}

interface Chapter {
  key: string;
  label: string;
  slug: string | null;
  subject: DesktopSubject | null;
  lost: number;
  /** The dominant KNOWLEDGE-gap type for this chapter, or null. */
  gapType: "conceptual" | "calculation" | null;
  /** The most recent mistake-log entry for this chapter - the retry candidate. */
  retryEntry: MistakeLogEntry | null;
}

/**
 * The chapter list. Sourced from the windowed topic rungs, resolved against the
 * canonical desktop registry so a chapter that does not resolve is routed honestly
 * rather than emitted as a broken path.
 *
 * Ordering is by marks on the table, descending, with the rung key as the tie-break -
 * so it is STABLE between visits and only moves when new graded data moves it. It is
 * never reshuffled for variety.
 */
function buildChapters(
  topics: RungTrend[],
  paper: DesktopSubject,
  logs: MistakeLogEntry[],
): Chapter[] {
  const byChapter = new Map<string, MistakeLogEntry[]>();
  for (const entry of logs) {
    const key = normalizeTopicKey(entry.topic) || String(entry.topic ?? "").trim().toLowerCase();
    if (!key) continue;
    const bucket = byChapter.get(key) ?? [];
    bucket.push(entry);
    byChapter.set(key, bucket);
  }

  const rows: Chapter[] = [];
  for (const rung of topics) {
    // Careless buckets can never enter the chapter list - they are not chapters.
    if (CARELESS_TYPES.has(rung.key.toLowerCase())) continue;
    const meta = desktopTopicForWeakAreaKey(rung.key);
    // Subject purity. The read is already scoped, so this only ever excludes a row
    // that RESOLVES to the other paper; an unresolvable key is kept and routed honestly.
    if (meta?.subject && meta.subject !== paper) continue;

    const canonical = normalizeTopicKey(rung.key) || rung.key.toLowerCase();
    const entries = (byChapter.get(canonical) ?? [])
      .slice()
      .sort((a, b) => Date.parse(b.timestamp || "") - Date.parse(a.timestamp || ""));

    let conceptual = 0;
    let calculation = 0;
    for (const entry of entries) {
      for (const step of entry.stepDetails ?? []) {
        const type = String(step?.mistakeType ?? "").trim().toLowerCase();
        const marks = Number(step?.marksDeducted);
        if (!Number.isFinite(marks) || marks <= 0) continue;
        if (type === "conceptual") conceptual += marks;
        else if (type === "calculation") calculation += marks;
      }
    }
    // A chapter is tagged ONLY with a knowledge-gap type. A careless-dominant chapter
    // carries no tag at all: naming a chapter after a slip would be the moat breaking
    // in a different costume, and it would send the student to the wrong card.
    const gapType =
      conceptual === 0 && calculation === 0
        ? null
        : conceptual >= calculation
          ? "conceptual"
          : "calculation";

    rows.push({
      key: rung.key,
      label: meta?.name || rung.label || rung.key,
      slug: meta?.slug ?? null,
      subject: meta?.subject ?? null,
      lost: lostMarksOf(rung) ?? 0,
      gapType,
      retryEntry: entries[0] ?? null,
    });
  }

  rows.sort((a, b) => (b.lost !== a.lost ? b.lost - a.lost : a.key.localeCompare(b.key)));
  return rows;
}

/**
 * The one-line reason under a chapter card. HONEST-OR-SILENT AT SENTENCE LEVEL: it
 * renders only when `stepDetails` actually carried that type, and the sentence
 * describes the SAME type as the tag above it - so tag and subtext cannot disagree.
 */
function gapSentence(gapType: "conceptual" | "calculation"): string {
  return gapType === "conceptual"
    ? "The marks went on the idea itself, not the arithmetic."
    : "The method held up each time; the arithmetic did not.";
}

const GAP_LABEL: Record<"conceptual" | "calculation", string> = {
  conceptual: "Conceptual",
  calculation: "Calculation",
};

/* ------------------ inline glyphs ------------------ */

const glyph = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const ChevronGlyph = () => (
  <svg {...glyph} width={16} height={16}>
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const LockGlyph = ({ size = 14 }: { size?: number }) => (
  <svg {...glyph} width={size} height={size}>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0110 0v4" />
  </svg>
);

const ArrowRightGlyph = ({ size = 15 }: { size?: number }) => (
  <svg {...glyph} width={size} height={size}>
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

const TrendUpGlyph = () => (
  <svg {...glyph} width={18} height={18}>
    <path d="M4 17 10 11l4 4 6-6" />
    <polyline points="15 5 20 5 20 10" />
  </svg>
);

const TrendDownGlyph = () => (
  <svg {...glyph} width={18} height={18}>
    <path d="M4 7 10 13l4-4 6 6" />
    <polyline points="15 19 20 19 20 14" />
  </svg>
);

/* ------------------ atoms ------------------ */

/**
 * LockedCta - the GATE-3 (#602) locked treatment, matched not re-derived: a visibly
 * disabled control that stays FOCUSABLE and is announced as unavailable
 * (`aria-disabled`, never the `disabled` attribute), with the Premium badge adjacent,
 * and TAPPING IT OPENS THE UPGRADE SHEET rather than doing nothing.
 */
const LockedCta = ({
  label,
  onOpenPremium,
  testId,
}: {
  label: string;
  onOpenPremium: () => void;
  testId?: string;
}) => (
  <button
    type="button"
    className="lt-me__cta lt-me__cta--locked"
    aria-disabled="true"
    data-testid={testId}
    onClick={onOpenPremium}
  >
    <span className="lt-me__lock-icon" aria-hidden="true">
      <LockGlyph />
    </span>
    <span>{label}</span>
    <span className="lt-me__badge">Premium</span>
  </button>
);

/** An outbound CTA carrying BOTH back-nav mechanisms. Never a bare <a href>. */
const NavCta = ({
  to,
  label,
  variant = "outline",
  testId,
}: {
  to: string;
  label: string;
  variant?: "outline" | "accent";
  testId?: string;
}) => (
  <Link
    to={to}
    state={BACK_STATE}
    data-testid={testId}
    className={`lt-me__cta lt-me__cta--${variant}`}
  >
    <span>{label}</span>
    <ArrowRightGlyph />
  </Link>
);

/** A quiet in-row action - the ONE action a deeper-analysis row is allowed. */
const RowCta = ({ to, label, testId }: { to: string; label: string; testId?: string }) => (
  <Link to={to} state={BACK_STATE} data-testid={testId} className="lt-me__rowcta">
    {label}
  </Link>
);

const MarksWord = ({ value }: { value: number }) => (
  <>
    {value} mark{value === 1 ? "" : "s"}
  </>
);

/* ------------------ page ------------------ */

export default function MeProgressPage() {
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const { user, loading, mistakeLogsHydrated } = useAuth();
  const { isPremium } = useSubscription();

  // The cross-device reads need a REAL account. A local/browse session has no
  // server-side progress, and we say so rather than inventing one.
  const realUid = user && !user.isLocalSession ? user.uid : null;

  const [windowSel, setWindowSel] = useState<ProgressWindow>("month");
  const [paper, setPaper] = useState<DesktopSubject>("Maths");
  const [paperTouched, setPaperTouched] = useState(false);
  const [slicer, setSlicer] = useState<"concepts" | "chapters" | "sections">("concepts");
  const [openChapter, setOpenChapter] = useState<string | null>(null);
  const [showAllChapters, setShowAllChapters] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const [all, setAll] = useState<WindowedProgress | null>(null);
  // Tracks the UNSCOPED read specifically. Without it, the window between the two
  // reads resolving renders "you have no work yet" to a student who does.
  const [allLoading, setAllLoading] = useState(true);
  const [data, setData] = useState<WindowedProgress | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [openConcepts, setOpenConcepts] = useState<RungTrend[]>([]);
  const [mistakeLogs, setMistakeLogs] = useState<MistakeLogEntry[]>([]);
  const [premiumBlock, setPremiumBlock] = useState<string | null>(null);

  const openPremium = useCallback((feature: string) => {
    setPremiumBlock(feature);
  }, []);

  /* -- the UNSCOPED read: both papers' totals for the switch + the has-data decision -- */
  useEffect(() => {
    let cancelled = false;
    setAllLoading(true);
    void (async () => {
      try {
        const next = await getWindowedProgress(realUid, windowSel);
        if (!cancelled) setAll(next);
      } catch {
        // Honest degradation: no data beats a guessed number.
        if (!cancelled) setAll(null);
      } finally {
        if (!cancelled) setAllLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [realUid, windowSel]);

  /* -- the SCOPED read: everything below the paper switch, for ONE paper only -- */
  useEffect(() => {
    let cancelled = false;
    setDataLoading(true);
    void (async () => {
      try {
        const next = await getWindowedProgress(realUid, windowSel, {
          subject: paperScopeKey(paper),
        });
        if (!cancelled) setData(next);
      } catch {
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [realUid, windowSel, paper]);

  /* -- the open chapter's concepts. Concept rungs are keyed by subtopic alone and
        carry no topic reference, so they cannot be filtered to a chapter after the
        fact - the scope must go INTO the read. -- */
  useEffect(() => {
    if (!openChapter) {
      setOpenConcepts([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const scoped = await getWindowedProgress(realUid, windowSel, {
          topicKey: openChapter,
        });
        if (!cancelled) setOpenConcepts(Array.isArray(scoped.concepts) ? scoped.concepts : []);
      } catch {
        if (!cancelled) setOpenConcepts([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [openChapter, windowSel, realUid]);

  /* -- mistake logs: the careless/knowledge split and the retry candidates -- */
  useEffect(() => {
    if (!user) {
      setMistakeLogs([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const logs = await getMistakeLogs(user.uid, 30);
        if (!cancelled) setMistakeLogs(Array.isArray(logs) ? logs : []);
      } catch {
        if (!cancelled) setMistakeLogs([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.uid, mistakeLogsHydrated]);

  /* -- derived -- */

  const subjectRungs = useMemo(() => all?.subjects ?? [], [all]);

  const lostByPaper = useMemo(() => {
    const out: Record<string, number | null> = {};
    for (const p of PAPERS) {
      const rung = subjectRungs.find((r) => r.key.toLowerCase() === paperScopeKey(p));
      out[p] = rung ? lostMarksOf(rung) : null;
    }
    return out;
  }, [subjectRungs]);

  // The paper the student most likely came for: the one with more marks on the table.
  // Once they touch the switch it is theirs and we never move it under them.
  useEffect(() => {
    if (paperTouched || subjectRungs.length === 0) return;
    const best = PAPERS.slice().sort((a, b) => (lostByPaper[b] ?? -1) - (lostByPaper[a] ?? -1))[0];
    if (best && (lostByPaper[best] ?? 0) > 0) setPaper(best);
  }, [subjectRungs, lostByPaper, paperTouched]);

  const paperLogs = useMemo(() => {
    const key = paperScopeKey(paper);
    return mistakeLogs.filter((e) => String(e.subject ?? "").trim().toLowerCase() === key);
  }, [mistakeLogs, paper]);

  const paperRung = useMemo(
    () => subjectRungs.find((r) => r.key.toLowerCase() === paperScopeKey(paper)) ?? null,
    [subjectRungs, paper],
  );

  const split = useMemo(() => splitPaperMarks(paperRung, paperLogs), [paperRung, paperLogs]);

  const careless = useMemo(() => summarizeCareless(paperLogs), [paperLogs]);

  const chapters = useMemo(
    () => buildChapters(data?.topics ?? [], paper, paperLogs),
    [data, paper, paperLogs],
  );

  const mistakeRungs = useMemo(() => data?.mistakeTypes ?? [], [data]);
  const carelessRungs = useMemo(
    () => mistakeRungs.filter((m) => CARELESS_TYPES.has(m.key.toLowerCase())),
    [mistakeRungs],
  );
  const knowledgeRungs = useMemo(
    () => mistakeRungs.filter((m) => KNOWLEDGE_TYPES.has(m.key.toLowerCase())),
    [mistakeRungs],
  );

  const conceptRows = useMemo(() => viewRowsFrom(data?.concepts ?? []), [data]);
  const sectionRows = useMemo(() => viewRowsFrom(data?.sections ?? []), [data]);
  const chapterRows = useMemo<ViewRow[]>(
    () => chapters.map((c) => ({ key: c.key, label: c.label, lost: c.lost })).filter((r) => r.lost > 0),
    [chapters],
  );

  const heroLost = split?.lost ?? 0;

  const shortSpan = useMemo(
    () => (data ? isShortSpan(windowSel, data.activitySpanDays) : false),
    [data, windowSel],
  );

  const studentName =
    user?.displayName?.trim().split(" ")[0] || user?.email?.split("@")[0] || "";

  const booting = dataLoading || allLoading;

  const hasAnyWork =
    (all?.subjects.length ?? 0) > 0 ||
    (all?.topics.length ?? 0) > 0 ||
    (all?.concepts.length ?? 0) > 0 ||
    (all?.sections.length ?? 0) > 0 ||
    (all?.mistakeTypes.length ?? 0) > 0 ||
    mistakeLogs.length > 0;

  const worksheetPath = buildDesktopWorksheetPath({
    scope: "full-subject",
    subject: paper,
    mistakeAware: true,
    ...ROUTE_CTX,
  });
  const quickPracticePath = withMeQuery(`/practice/10/${paper}`);

  /* -- the signed-out locked hero --
     NOTE, verified on trunk: `/me` is wrapped in <RequireAuth>, which redirects a
     user-less visitor to /login, so this branch is not reachable THROUGH THE ROUTE
     today. It is retained deliberately: it is the surface's honesty contract, it is
     the only correct render if the page is ever mounted outside RequireAuth, and
     deleting it would silently drop a locked-state guarantee. */
  if (!loading && !user) {
    return (
      <div className="lt-me lt-me--locked">
        <style>{ME_CSS}</style>
        <div className="lt-me__card lt-me__signin">
          <div className="lt-me__lock-badge" aria-hidden="true">
            <LockGlyph size={18} />
          </div>
          <div>
            <div className="lt-me__eyebrow">Sign in to see your progress</div>
            <h1 className="lt-me__signin-title">
              Your study mirror needs saved attempts.
            </h1>
            <p className="lt-me__empty-body">
              Sign in to save your practice attempts and graded answers. Your marks,
              your weak chapters and your before&rarr;now trend all derive from real
              saved data &mdash; nothing is invented while you&rsquo;re signed out.
            </p>
            <button
              type="button"
              className="lt-me__cta lt-me__cta--accent"
              data-testid="me-login-cta"
              onClick={() =>
                navigate(
                  withQuery(
                    "/login",
                    new URLSearchParams({
                      reason: "open-progress",
                      redirect: "/me",
                    }),
                  ),
                )
              }
            >
              <span>Sign in to open progress</span>
              <ArrowRightGlyph />
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- the paper switch ---------- */
  const paperSwitch = (
    <div className="lt-me__papers" role="group" aria-label="Which paper">
      {PAPERS.map((p) => {
        const lost = lostByPaper[p];
        return (
          <button
            key={p}
            type="button"
            className={`lt-me__paper${paper === p ? " lt-me__paper--on" : ""}`}
            aria-pressed={paper === p}
            data-testid={`me-paper-${p.toLowerCase()}`}
            onClick={() => {
              setPaper(p);
              setPaperTouched(true);
              setOpenChapter(null);
              setShowAllChapters(false);
            }}
          >
            {p}
            <small>
              {lost === null
                ? "no graded marks yet"
                : `${lost} mark${lost === 1 ? "" : "s"} on the table`}
            </small>
          </button>
        );
      })}
    </div>
  );

  /* ---------- the hero bar ---------- */
  const segments = split
    ? [
        { key: "secured", value: split.secured, tone: SECURED_TONE },
        { key: "careless", value: split.careless, tone: MISTAKE_TONE.silly },
        { key: "knowledge", value: split.knowledge, tone: MISTAKE_TONE.conceptual },
        { key: "unclassified", value: split.unclassified, tone: UNCLASSIFIED_TONE },
      ].filter((s) => s.value > 0)
    : [];

  const barLabel = split
    ? `Of ${split.available} marks in your ${paper} paper: ${split.secured} secured, ` +
      `${split.careless} lost to careless slips, ${split.knowledge} lost to knowledge gaps, ` +
      `${split.unclassified} not yet classified.`
    : "";

  /* ---------- deeper analysis ---------- */
  const activeRows =
    slicer === "concepts" ? conceptRows : slicer === "sections" ? sectionRows : chapterRows;
  const remainder = remainderOf(heroLost, activeRows);
  const remainderNoun =
    slicer === "concepts" ? "a concept" : slicer === "sections" ? "a section" : "a chapter";

  const visibleChapters = showAllChapters ? chapters : chapters.slice(0, START_HERE_VISIBLE);

  return (
    <div className={`lt-me${isDesktop ? " lt-me--desktop" : " lt-me--mobile"}`}>
      <style>{ME_CSS}</style>

      <header className="lt-me__header">
        <div className="lt-me__eyebrow">Me &middot; Progress</div>
        {booting ? (
          <h1 className="lt-me__title">Your journey</h1>
        ) : !hasAnyWork ? (
          <h1 className="lt-me__title">This is where your marks will show up.</h1>
        ) : split ? (
          <h1 className="lt-me__title">
            {studentName ? `${studentName}, there ` : "There "}
            {split.lost === 1 ? "is" : "are"} <MarksWord value={split.lost} /> on the table.
          </h1>
        ) : (
          <h1 className="lt-me__title">
            {studentName ? `${studentName}, your ` : "Your "}
            {paper} sheet is still filling in.
          </h1>
        )}
      </header>

      <div className="lt-me__windows" role="group" aria-label="Progress window">
        {WINDOWS.map((w) => (
          <button
            key={w.value}
            type="button"
            className={`lt-me__chip${windowSel === w.value ? " lt-me__chip--on" : ""}`}
            aria-pressed={windowSel === w.value}
            onClick={() => setWindowSel(w.value)}
          >
            {w.label}
          </button>
        ))}
      </div>

      {booting ? (
        <p className="lt-me__empty-body" data-testid="me-booting">
          Reading your saved work&hellip;
        </p>
      ) : !hasAnyWork ? (
        <FirstRun
          practiceAttempts={all?.activity.practiceAttempts ?? 0}
          quickPracticePath={quickPracticePath}
        />
      ) : (
        <>
          {/* ---- paper switch + hero ---- */}
          <section className="lt-me__hero" aria-label="Marks on the table">
            {paperSwitch}
            <p className="lt-me__lede">
              {split ? (
                <>
                  In your {paper} paper, out of <MarksWord value={split.available} /> we have
                  graded in {WINDOW_PHRASE[windowSel]}.{" "}
                  {paper === "Maths" ? "Science" : "Maths"} is counted separately &mdash; it
                  is a different exam.
                </>
              ) : (
                <>
                  Your {paper} sheet fills in as answers are graded. We will not name a
                  weakness from one or two questions.
                </>
              )}
            </p>

            {split ? (
              <div className="lt-me__card">
                <div className="lt-me__barcap">
                  <span>
                    Your last <MarksWord value={split.available} />
                  </span>
                  <span>{split.secured} secured</span>
                </div>
                <div className="lt-me__bar" role="img" aria-label={barLabel} data-testid="me-hero-bar">
                  {segments.map((seg) => {
                    const share = seg.value / split.available;
                    const numeral = String(seg.value);
                    const fits = share >= numeral.length * SEGMENT_NUMERAL_MIN_SHARE_PER_CHAR;
                    return (
                      <div
                        key={seg.key}
                        className="lt-me__seg"
                        data-segment={seg.key}
                        style={{ width: `${(share * 100).toFixed(1)}%`, background: seg.tone }}
                      >
                        {fits ? seg.value : ""}
                      </div>
                    );
                  })}
                </div>

                <ul className="lt-me__legend">
                  <li className="lt-me__lg">
                    <span className="lt-me__sw" data-tone="secured" aria-hidden="true" />
                    <span>
                      <b>{split.secured} secured</b>
                      You got these right.
                    </span>
                  </li>
                  <li className="lt-me__lg">
                    <span className="lt-me__sw" data-tone="careless" aria-hidden="true" />
                    <span>
                      <b>{split.careless} careless slips</b>
                      {GROUP_HEADING.careless}. You knew these &mdash; steps skipped, units
                      missing, a sign flipped.
                    </span>
                  </li>
                  <li className="lt-me__lg">
                    <span className="lt-me__sw" data-tone="knowledge" aria-hidden="true" />
                    <span>
                      <b>{split.knowledge} knowledge gaps</b>
                      {GROUP_HEADING.knowledge}. These need the idea first.
                    </span>
                  </li>
                  <li className="lt-me__lg">
                    <span className="lt-me__sw" data-tone="unclassified" aria-hidden="true" />
                    <span>
                      <b>{split.unclassified} unclassified</b>
                      {split.splitKnown
                        ? "One-mark answers are marked right or wrong, so we cannot say why."
                        : "We can see which marks went, but not yet why, so we are not going to guess."}
                    </span>
                  </li>
                </ul>
              </div>
            ) : null}

            {mistakeRungs.length > 0 ? (
              <div className="lt-me__card">
                <div className="lt-me__eyebrow">Where your marks went</div>
                <div className="lt-me__mix" data-testid="me-mistake-mix">
                  <div className="lt-me__mixgroup">
                    <div className="lt-me__mixhead">{GROUP_HEADING.knowledge}</div>
                    {knowledgeRungs.length > 0 ? (
                      <ul className="lt-me__mixlist">
                        {knowledgeRungs.map((m) => (
                          <li key={m.key}>
                            <span
                              className="lt-me__dot"
                              style={{ background: MISTAKE_TONE[m.key.toLowerCase()] }}
                              aria-hidden="true"
                            />
                            {m.label}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="lt-me__empty-body">Nothing logged here yet.</p>
                    )}
                  </div>
                  <div className="lt-me__mixgroup">
                    <div className="lt-me__mixhead">{GROUP_HEADING.careless}</div>
                    {carelessRungs.length > 0 ? (
                      <ul className="lt-me__mixlist">
                        {carelessRungs.map((m) => (
                          <li key={m.key}>
                            <span
                              className="lt-me__dot"
                              style={{ background: MISTAKE_TONE[m.key.toLowerCase()] }}
                              aria-hidden="true"
                            />
                            {m.label}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="lt-me__empty-body">Nothing logged here yet.</p>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {shortSpan ? (
              <p className="lt-me__note" data-testid="me-short-span">
                Your practice in this window is concentrated in a short stretch &mdash; what
                you see is your honest short-term movement, not the whole window.
              </p>
            ) : null}
          </section>

          {/* ---- easy marks ---- */}
          {careless.hasData && careless.marksLost > 0 ? (
            <section className="lt-me__section" aria-label="Easy marks">
              <div className="lt-me__easy" data-testid="me-easy-marks">
                <div className="lt-me__easy-n">{careless.marksLost}</div>
                <div className="lt-me__easy-body">
                  <p className="lt-me__easy-head">
                    <MarksWord value={careless.marksLost} /> you already knew &mdash; take
                    these back first.
                  </p>
                  <p className="lt-me__empty-body">
                    {careless.sillyCount} silly &middot; {careless.presentationCount}{" "}
                    presentation. {GROUP_HEADING.careless}. They went on skipped steps,
                    missing units and sign slips.
                  </p>
                  <button
                    type="button"
                    className="lt-me__cta lt-me__cta--accent"
                    data-testid="me-easy-cta"
                    onClick={() => setPickerOpen(true)}
                  >
                    <span>Take these marks back</span>
                    <ArrowRightGlyph />
                  </button>
                </div>
              </div>
            </section>
          ) : null}

          {/* ---- start here: one card per chapter ---- */}
          <section className="lt-me__section" aria-label="Start here">
            <div className="lt-me__eyebrow">
              {chapters.length > 0
                ? `Start here — your ${chapters.length} biggest win${chapters.length === 1 ? "" : "s"}`
                : "Start here"}
            </div>
            {chapters.length === 0 ? (
              <div className="lt-me__card">
                <p className="lt-me__empty-body">
                  Your topics appear here after you practise. We only name a chapter once
                  there is real graded work behind it.
                </p>
                <NavCta
                  to={withMeQuery("/practice-hub")}
                  label="Start practice"
                  variant="accent"
                  testId="me-cta-empty-practice"
                />
              </div>
            ) : (
              <>
                <ul className="lt-me__chapters" data-testid="me-drill-topics">
                  {visibleChapters.map((c, index) => {
                    const learnPath = c.slug
                      ? buildDesktopTopicHubPath(c.slug, ROUTE_CTX)
                      : withMeQuery("/exam-trends");
                    const practisePath =
                      c.slug && c.subject
                        ? buildDesktopConceptPracticePath({
                            subject: c.subject,
                            topic: c.slug,
                            backLabel: `Back to ${c.label}`,
                            ...ROUTE_CTX,
                          })
                        : withMeQuery("/exam-trends");
                    const plan = c.retryEntry ? planMistakeRetry(c.retryEntry) : null;
                    // The module decides the words AND whether there is a control at all.
                    // `null` means the entry carries no question identity, so nothing can
                    // honestly be re-served: we render NO affordance, not a fallback.
                    const retryCopy = plan ? retryCopyFor(plan) : null;
                    const retryPath =
                      plan && retryCopy && c.slug && c.subject
                        ? buildDesktopConceptPracticePath({
                            subject: c.subject,
                            topic: c.slug,
                            focus: plan.kind === "none" ? undefined : (plan.concept ?? undefined),
                            markBand:
                              plan.kind !== "none" && plan.marks !== null
                                ? String(plan.marks)
                                : undefined,
                            backLabel: `Back to ${c.label}`,
                            ...ROUTE_CTX,
                          })
                        : null;
                    return (
                      <li key={c.key} className="lt-me__card lt-me__chapter">
                        <div className="lt-me__rank" aria-hidden="true">
                          {index + 1}
                        </div>
                        <div className="lt-me__chapter-main">
                          <p className="lt-me__chapter-name">{c.label}</p>
                          <p className="lt-me__chapter-meta">
                            {c.gapType ? (
                              <span className="lt-me__tag" data-tone={c.gapType}>
                                {GAP_LABEL[c.gapType]}
                              </span>
                            ) : null}
                            <span className="lt-me__worth">
                              <MarksWord value={c.lost} /> on the table
                            </span>
                          </p>
                          {c.gapType ? (
                            <p className="lt-me__empty-body">{gapSentence(c.gapType)}</p>
                          ) : null}
                        </div>
                        <div className="lt-me__chapter-ctas">
                          {isPremium ? (
                            <NavCta
                              to={learnPath}
                              label="Learn"
                              testId={`me-cta-learn-${c.key}`}
                            />
                          ) : (
                            <LockedCta
                              label="Learn"
                              onOpenPremium={() => openPremium("Topic Hub")}
                              testId={`me-cta-learn-locked-${c.key}`}
                            />
                          )}
                          <NavCta
                            to={practisePath}
                            label="Practise"
                            variant="accent"
                            testId={`me-cta-practise-${c.key}`}
                          />
                          {retryCopy && retryPath ? (
                            <NavCta
                              to={retryPath}
                              label={retryCopy}
                              testId={`me-cta-retry-${c.key}`}
                            />
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
                {chapters.length > START_HERE_VISIBLE ? (
                  showAllChapters ? (
                    <button
                      type="button"
                      className="lt-me__more"
                      data-testid="me-show-less"
                      onClick={() => setShowAllChapters(false)}
                    >
                      Show less
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="lt-me__more"
                      data-testid="me-show-more"
                      onClick={() => setShowAllChapters(true)}
                    >
                      Show {chapters.length - START_HERE_VISIBLE} more
                    </button>
                  )
                ) : null}
              </>
            )}
          </section>

          {/* ---- journey ---- */}
          <JourneyLine rung={paperRung} />

          {/* ---- deeper analysis ---- */}
          <section className="lt-me__section" aria-label="Deeper analysis">
            <div className="lt-me__eyebrow">Deeper analysis</div>
            <div className="lt-me__card">
              <div className="lt-me__cardhead">Every mark you have lost, three ways</div>
              <div className="lt-me__tabs" role="group" aria-label="Slice by">
                <button
                  type="button"
                  className={`lt-me__tab${slicer === "concepts" ? " lt-me__tab--on" : ""}`}
                  aria-pressed={slicer === "concepts"}
                  data-testid="me-slicer-concepts"
                  onClick={() => {
                    setSlicer("concepts");
                    setOpenChapter(null);
                  }}
                >
                  By concept
                </button>
                <button
                  type="button"
                  className={`lt-me__tab${slicer === "chapters" ? " lt-me__tab--on" : ""}`}
                  aria-pressed={slicer === "chapters"}
                  data-testid="me-slicer-chapters"
                  onClick={() => setSlicer("chapters")}
                >
                  By chapter
                </button>
                <button
                  type="button"
                  className={`lt-me__tab${slicer === "sections" ? " lt-me__tab--on" : ""}`}
                  aria-pressed={slicer === "sections"}
                  data-testid="me-slicer-sections"
                  onClick={() => {
                    setSlicer("sections");
                    setOpenChapter(null);
                  }}
                >
                  By CBSE section
                </button>
              </div>

              {slicer === "concepts" ? (
                <ul className="lt-me__rows" data-testid="me-view-concepts">
                  {conceptRows.map((row) => (
                    <li key={row.key} className="lt-me__row">
                      <span className="lt-me__row-name">{row.label}</span>
                      <span className="lt-me__row-marks">
                        <MarksWord value={row.lost} />
                      </span>
                      <RowCta
                        to={buildDesktopPracticePath({
                          scope: "full-subject",
                          subject: paper,
                          focus: row.label,
                          ...ROUTE_CTX,
                        })}
                        label="Practise"
                        testId={`me-practise-concept-${row.key}`}
                      />
                    </li>
                  ))}
                  <RemainderRow marks={remainder} noun={remainderNoun} />
                </ul>
              ) : slicer === "sections" ? (
                <ul className="lt-me__rows" data-testid="me-view-sections">
                  {sectionRows.map((row) => (
                    <li key={row.key} className="lt-me__row">
                      <span className="lt-me__row-name">{row.label}</span>
                      <span className="lt-me__row-marks">
                        <MarksWord value={row.lost} />
                      </span>
                      <RowCta
                        to={buildDesktopPracticePath({
                          scope: "full-subject",
                          subject: paper,
                          section: row.key,
                          ...ROUTE_CTX,
                        })}
                        label="Practise"
                        testId={`me-practise-section-${row.key}`}
                      />
                    </li>
                  ))}
                  <RemainderRow marks={remainder} noun={remainderNoun} />
                </ul>
              ) : (
                <ul className="lt-me__rows" data-testid="me-view-chapters">
                  {chapters
                    .filter((c) => c.lost > 0)
                    .map((c) => {
                      const isOpen = openChapter === c.key;
                      const arrivalConcept = isOpen
                        ? resolveArrivalConcept(
                            c.slug,
                            viewRowsFrom(openConcepts).map((r) => r.label),
                          )
                        : null;
                      return (
                        <li key={c.key} className="lt-me__accrow">
                          <button
                            type="button"
                            className="lt-me__acchead"
                            aria-expanded={isOpen}
                            data-testid={`me-chapter-${c.key}`}
                            onClick={() => setOpenChapter(isOpen ? null : c.key)}
                          >
                            <span className="lt-me__row-name">{c.label}</span>
                            <span className="lt-me__row-marks">
                              <MarksWord value={c.lost} />
                            </span>
                            <span
                              className={`lt-me__chev${isOpen ? " lt-me__chev--open" : ""}`}
                              aria-hidden="true"
                            >
                              <ChevronGlyph />
                            </span>
                          </button>
                          {isOpen ? (
                            <div className="lt-me__accbody" data-testid={`me-chapter-body-${c.key}`}>
                              {viewRowsFrom(openConcepts).length > 0 ? (
                                <ul className="lt-me__rows">
                                  {viewRowsFrom(openConcepts).map((row) => (
                                    <li key={row.key} className="lt-me__row">
                                      <span className="lt-me__row-name">{row.label}</span>
                                      <span className="lt-me__row-marks">
                                        <MarksWord value={row.lost} />
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="lt-me__empty-body">
                                  No per-concept marks for this chapter in this window yet.
                                </p>
                              )}
                              {c.slug ? (
                                <NavCta
                                  to={buildDesktopTopicHubPath(
                                    c.slug,
                                    ROUTE_CTX,
                                    arrivalConcept ? { concept: arrivalConcept } : {},
                                  )}
                                  label={`Learn ${c.label}`}
                                  testId={`me-cta-learn-chapter-${c.key}`}
                                />
                              ) : null}
                            </div>
                          ) : null}
                        </li>
                      );
                    })}
                  <RemainderRow marks={remainder} noun={remainderNoun} />
                </ul>
              )}
            </div>
          </section>
        </>
      )}

      {/* ---- DPDP: download my data / delete my account (SETTINGS-1) ----
          Last section on the page by design: it is a rarely-used, irreversible control
          and must not sit above the student's work. It renders in EVERY signed-in
          state, first-run included - a student's export and erasure rights do not
          depend on how much work they have done. */}
      <AccountDataControls />

      <p className="lt-me__footer">
        Every number here comes from your saved attempts and graded answers. An empty card
        means there is no data yet &mdash; never a sample number.
      </p>

      {pickerOpen
        ? createPortal(
            <PickerSheet
              paper={paper}
              worksheetPath={worksheetPath}
              quickPracticePath={quickPracticePath}
              onClose={() => setPickerOpen(false)}
            />,
            document.body,
          )
        : null}

      {premiumBlock ? (
        <UpgradeSheet
          featureLabel={premiumBlock}
          trialEndedAt={null}
          onClose={() => setPremiumBlock(null)}
        />
      ) : null}
    </div>
  );
}

/* ------------------ sub-views ------------------ */

/**
 * The "not yet traced" row. Renders only when there really is an unattributed
 * remainder - a zero remainder row would be noise, and a negative one is impossible
 * because every view is a partition of the same graded stream.
 */
function RemainderRow({ marks, noun }: { marks: number; noun: string }) {
  if (marks <= 0) return null;
  return (
    <li className="lt-me__row lt-me__row--rest" data-testid="me-remainder">
      <span className="lt-me__row-name">
        <MarksWord value={marks} /> not yet traced to {noun}
      </span>
      <span className="lt-me__row-note">
        These count in the total above. They come from answers we could not match to a
        bank question.
      </span>
    </li>
  );
}

/**
 * The journey line. Marks, never percentages - `RungTrend.delta` is a marks-PERCENTAGE
 * and turning it into "N marks a paper" would multiply a rate by an 80-mark paper the
 * student has not sat. That is a performance projection, so we state the real movement
 * instead: what they secured earlier in the window against what they secure now.
 */
function JourneyLine({ rung }: { rung: RungTrend | null }) {
  const beforeScored = rung?.marksScoredBefore;
  const beforeAvailable = rung?.marksAvailableBefore;
  const nowScored = rung?.marksScoredNow;
  const nowAvailable = rung?.marksAvailableNow;
  if (
    typeof beforeScored !== "number" ||
    typeof beforeAvailable !== "number" ||
    typeof nowScored !== "number" ||
    typeof nowAvailable !== "number" ||
    beforeAvailable <= 0 ||
    nowAvailable <= 0
  ) {
    return null;
  }
  const rising = nowScored / nowAvailable > beforeScored / beforeAvailable;
  const level = nowScored / nowAvailable === beforeScored / beforeAvailable;
  return (
    <section className="lt-me__section" aria-label="Your journey">
      <div className="lt-me__card lt-me__journey" data-testid="me-journey">
        <span className={`lt-me__jico${rising ? " lt-me__jico--up" : ""}`} aria-hidden="true">
          {rising ? <TrendUpGlyph /> : <TrendDownGlyph />}
        </span>
        <p className="lt-me__empty-body">
          <b>
            {nowScored} of {nowAvailable} marks
          </b>{" "}
          secured in your recent work, against {beforeScored} of {beforeAvailable} earlier
          in this window.{" "}
          {level
            ? "Holding steady."
            : rising
              ? "You are keeping more of what you attempt."
              : "You are keeping less of what you attempt than you were."}
        </p>
      </div>
    </section>
  );
}

/**
 * The first-run sheet. A NAMED EXAMPLE student behind a dashed frame, tagged
 * "Example - not your marks", so a new student can see the shape of the page without
 * ever being shown an invented number as their own.
 *
 * The example's tag and its sentence describe the SAME mistake type. An earlier
 * prototype iteration tagged a dropped-state-symbols slip as a conceptual gap - a
 * contradiction in the first sentence a new student ever reads. Dropped state symbols
 * are Presentation; this example is a genuine conceptual gap and says so.
 */
function FirstRun({
  practiceAttempts,
  quickPracticePath,
}: {
  practiceAttempts: number;
  quickPracticePath: string;
}) {
  const done = Math.max(0, Math.min(5, practiceAttempts));
  return (
    <section className="lt-me__section" aria-label="What this page will show" data-testid="me-first-run">
      <p className="lt-me__lede">
        Nothing here is yours yet &mdash; the sheet below belongs to an example student,
        so you can see the shape of it.
      </p>

      <div className="lt-me__example">
        <span className="lt-me__extag">Example &mdash; not your marks</span>
        <p className="lt-me__exnote">
          This is <b>Aarav</b>, who has had fourteen answers graded. Once yours are
          graded, this page becomes yours and every number will be your own.
        </p>
        <div className="lt-me__exin" aria-hidden="true">
          <div className="lt-me__card">
            <div className="lt-me__barcap">
              <span>Aarav&rsquo;s last 80 marks &middot; Science</span>
              <span>51 secured</span>
            </div>
            <div className="lt-me__bar">
              <div className="lt-me__seg" style={{ width: "63.8%", background: SECURED_TONE }}>
                51
              </div>
              <div className="lt-me__seg" style={{ width: "20.0%", background: MISTAKE_TONE.silly }}>
                16
              </div>
              <div
                className="lt-me__seg"
                style={{ width: "12.5%", background: MISTAKE_TONE.conceptual }}
              >
                10
              </div>
              <div className="lt-me__seg" style={{ width: "3.7%", background: UNCLASSIFIED_TONE }} />
            </div>
            <div className="lt-me__chapter lt-me__chapter--flat">
              <div className="lt-me__chapter-main">
                <p className="lt-me__chapter-name">Balancing chemical equations</p>
                <p className="lt-me__chapter-meta">
                  <span className="lt-me__tag" data-tone="conceptual">
                    Conceptual
                  </span>
                  <span className="lt-me__worth">7 marks on the table</span>
                </p>
                <p className="lt-me__empty-body">
                  Aarav balances the atoms but cannot yet say which side is oxidised.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="lt-me__card lt-me__unlock">
        <div className="lt-me__stepc">{done} of 5 answers graded</div>
        <div className="lt-me__pips" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className={`lt-me__pip${i < done ? " lt-me__pip--on" : ""}`} />
          ))}
        </div>
        <p className="lt-me__unlock-head">Get five answers graded and this page becomes yours.</p>
        <p className="lt-me__empty-body">
          Every time you upload your working and we mark it, your sheet fills in a little
          more. Five is usually enough to name the first thing worth fixing &mdash; before
          that we would only be guessing, and we would rather not.
        </p>
        <div className="lt-me__chapter-ctas">
          <NavCta
            to={withMeQuery("/check-improve")}
            label="Check my first answer"
            variant="accent"
            testId="me-cta-first-check"
          />
          <NavCta
            to={quickPracticePath}
            label="Try a quick practice set"
            testId="me-cta-empty-practice"
          />
        </div>
      </div>
    </section>
  );
}

/**
 * The picker sheet behind the easy-marks CTA. Two honest destinations for the same
 * slips, because slips span several chapters and a single-chapter set would drop most
 * of them: a mistake-aware worksheet across the whole paper (`mistakeAware=1`, read by
 * `studyContext.ts` and mapped by `savedWorksheets.ts`), or an on-screen practice set.
 *
 * Mirrors `TutorPickerModal` (role="dialog" + aria-modal + click-out + Escape). It is
 * PORTALLED by its caller - see the file header.
 */
function PickerSheet({
  paper,
  worksheetPath,
  quickPracticePath,
  onClose,
}: {
  paper: DesktopSubject;
  worksheetPath: string;
  quickPracticePath: string;
  onClose: () => void;
}) {
  return (
    <div
      className="lt-me-mask"
      data-testid="me-picker"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <style>{ME_CSS}</style>
      <div
        className="lt-me-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="How would you like to take these marks back"
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
      >
        <h2 className="lt-me-sheet__h">How would you like to take them back?</h2>
        <p className="lt-me__empty-body">
          Your slips are spread across your whole {paper} paper, so both of these cover
          all of them.
        </p>
        <Link
          to={worksheetPath}
          state={BACK_STATE}
          className="lt-me-sheet__opt"
          data-testid="me-picker-worksheet"
          onClick={onClose}
        >
          <b>A slip-fixing worksheet</b>
          <span>
            A printable set across your whole {paper} paper. Write full working, then
            upload it to be marked.
          </span>
        </Link>
        <Link
          to={quickPracticePath}
          state={BACK_STATE}
          className="lt-me-sheet__opt"
          data-testid="me-picker-practice"
          onClick={onClose}
        >
          <b>A quick practice session</b>
          <span>Answer on screen, marked as you go.</span>
        </Link>
        <button type="button" className="lt-me-sheet__x" onClick={onClose}>
          Not now
        </button>
      </div>
    </div>
  );
}

/* ------------------ styles ------------------
   Class-driven. One injected stylesheet, no new dependency.

   WARNING: this is a TEMPLATE LITERAL. A single backtick anywhere inside it - even in
   a CSS comment - terminates the literal and kills the build. This repo has been bitten
   by exactly that twice. Do not add one.

   --me-navy is defined HERE and nowhere else: it is page-local, so it dies with any
   rebuild that forgets to carry it forward. */

const ME_CSS = `
.lt-me {
  --me-bg: hsl(210, 33%, 96%);
  --me-card: #ffffff;
  --me-border: hsl(215, 25%, 90%);
  --me-fg: hsl(220, 45%, 14%);
  --me-muted: hsl(220, 15%, 45%);
  --me-accent: hsl(152, 55%, 45%);
  --me-navy: hsl(222, 47%, 24%);
  --me-display: 'Fraunces', Georgia, serif;
  display: flex;
  flex-direction: column;
  gap: 20px;
  background: var(--me-bg);
  color: var(--me-fg);
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  padding: 20px 16px 56px;
  /* The surface owns its background to the fold - without this the page tint stops at
     the content and leaves a white band above the mobile BottomNav. */
  min-height: 100vh;
}
.lt-me--desktop { max-width: 1060px; margin: 0 auto; padding: 32px 32px 64px; gap: 24px; }

.lt-me__header { display: flex; flex-direction: column; gap: 6px; }
.lt-me__eyebrow {
  font-size: 11px; font-weight: 700; letter-spacing: 0.13em;
  text-transform: uppercase; color: var(--me-muted);
}
.lt-me__title {
  font-family: var(--me-display);
  font-size: clamp(22px, 5vw, 31px); font-weight: 700;
  margin: 4px 0 0; letter-spacing: -0.015em; line-height: 1.18;
}
.lt-me__lede { margin: 0; font-size: 14px; color: var(--me-muted); line-height: 1.55; }

.lt-me__windows, .lt-me__tabs { display: flex; flex-wrap: wrap; gap: 8px; }
.lt-me__chip {
  padding: 7px 13px; border-radius: 999px;
  border: 1px solid var(--me-border); background: var(--me-card);
  color: var(--me-muted); font-size: 12.5px; font-weight: 600; cursor: pointer;
  font-family: inherit; min-height: 36px;
}
.lt-me__chip--on { background: var(--me-navy); border-color: var(--me-navy); color: #fff; }

.lt-me__hero, .lt-me__section { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
.lt-me__card {
  background: var(--me-card); border: 1px solid var(--me-border);
  border-radius: 16px; padding: 18px;
  display: flex; flex-direction: column; gap: 12px; min-width: 0;
}
.lt-me__cardhead { font-size: 15px; font-weight: 700; }

/* --- paper switch --- */
.lt-me__papers {
  display: flex; gap: 6px; padding: 5px; background: hsl(210, 28%, 92%);
  border-radius: 12px; width: fit-content; max-width: 100%;
}
.lt-me__paper {
  font-family: inherit; font-size: 14px; font-weight: 700;
  padding: 8px 18px; border-radius: 9px; border: 1px solid transparent;
  background: transparent; color: var(--me-muted); cursor: pointer; min-height: 44px;
}
.lt-me__paper--on {
  background: var(--me-card); border-color: var(--me-border); color: var(--me-fg);
  box-shadow: 0 2px 6px rgba(7, 26, 61, 0.09);
}
.lt-me__paper small { display: block; font-size: 10.5px; font-weight: 600; color: var(--me-muted); margin-top: 1px; }
.lt-me__paper--on small { color: hsl(152, 55%, 30%); }

/* --- the bar. Numerals are var(--me-navy) at 700 weight, 19px on desktop and 16px
       below 1024px. They are NORMAL text at that size, so every segment tone has to
       clear 4.5:1 against navy on its own - measured live at 360px: secured 4.67,
       careless 4.82, gaps 4.84, unclassified 6.15. Nothing here leans on the
       large-text 3:1 exemption, which 16px/700 never qualified for anyway.
       A segment too narrow for its numeral prints nothing and the legend, which
       prints every number, carries it - see SEGMENT_NUMERAL_MIN_SHARE_PER_CHAR. --- */
.lt-me__barcap {
  display: flex; justify-content: space-between; align-items: baseline;
  font-size: 12px; color: var(--me-muted); font-weight: 600;
}
.lt-me__bar {
  display: flex; height: 50px; border-radius: 11px; overflow: hidden;
  border: 1px solid var(--me-border);
}
.lt-me__seg {
  display: flex; align-items: center; justify-content: center;
  font-size: 19px; font-weight: 700; color: var(--me-navy);
  min-width: 0; overflow: hidden;
}
.lt-me__legend {
  list-style: none; margin: 0; padding: 0;
  display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px;
}
.lt-me__lg { display: flex; align-items: flex-start; gap: 8px; font-size: 13px; line-height: 1.5; color: var(--me-muted); }
.lt-me__lg b { display: block; font-weight: 700; color: var(--me-fg); }
.lt-me__sw { width: 11px; height: 11px; border-radius: 3px; flex: none; margin-top: 4px; }
/* These four repeat SECURED_TONE, MISTAKE_TONE.silly, MISTAKE_TONE.conceptual and
   UNCLASSIFIED_TONE literally. A legend swatch that does not match its segment
   stops binding the legend to the bar, so they move together or not at all. */
.lt-me__sw[data-tone="secured"] { background: hsl(152, 55%, 45%); }
.lt-me__sw[data-tone="careless"] { background: hsl(0, 80%, 72%); }
.lt-me__sw[data-tone="knowledge"] { background: hsl(215, 85%, 68%); }
.lt-me__sw[data-tone="unclassified"] { background: hsl(215, 15%, 72%); }

/* --- the four-type mix --- */
.lt-me__mix { display: grid; gap: 14px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
.lt-me__mixhead { font-size: 12px; font-weight: 700; color: var(--me-muted); margin-bottom: 7px; }
.lt-me__mixlist { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 7px; }
.lt-me__mixlist li { display: flex; align-items: center; gap: 8px; font-size: 13.5px; font-weight: 600; }
.lt-me__dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }

/* --- easy marks --- */
.lt-me__easy {
  background: hsl(152, 55%, 97%); border: 1px solid hsl(152, 45%, 84%);
  border-left: 5px solid hsl(0, 70%, 62%);
  border-radius: 16px; padding: 18px 20px;
  display: flex; gap: 16px; align-items: flex-start; flex-wrap: wrap;
}
.lt-me__easy-n {
  font-family: var(--me-display); font-size: 38px; font-weight: 700;
  line-height: 1; color: hsl(152, 55%, 30%); flex: none;
}
.lt-me__easy-body { display: flex; flex-direction: column; gap: 8px; min-width: 0; flex: 1; }
.lt-me__easy-head { margin: 0; font-size: 15px; font-weight: 700; line-height: 1.45; }

/* --- chapter cards --- */
.lt-me__chapters { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 11px; }
.lt-me__chapter { display: grid; grid-template-columns: auto 1fr auto; gap: 14px; align-items: center; }
.lt-me__chapter--flat { border: none; padding: 0; grid-template-columns: 1fr; }
.lt-me__rank {
  width: 30px; height: 30px; border-radius: 50%; flex: none;
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 700; color: #fff; background: var(--me-navy);
}
.lt-me__chapter-main { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
.lt-me__chapter-name { margin: 0; font-size: 15px; font-weight: 700; overflow-wrap: anywhere; }
.lt-me__chapter-meta { margin: 0; display: flex; flex-wrap: wrap; gap: 7px; align-items: center; }
.lt-me__tag {
  display: inline-flex; padding: 3px 9px; border-radius: 999px;
  font-size: 11px; font-weight: 700;
}
.lt-me__tag[data-tone="conceptual"] { background: hsl(215, 75%, 96%); color: hsl(215, 68%, 34%); }
.lt-me__tag[data-tone="calculation"] { background: hsl(38, 80%, 95%); color: hsl(38, 68%, 30%); }
.lt-me__worth { font-size: 12.5px; font-weight: 700; color: var(--me-muted); }
.lt-me__chapter-ctas { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }
.lt-me__more {
  width: 100%; padding: 12px; border-radius: 12px;
  border: 1px dashed var(--me-border); background: var(--me-card);
  font-family: inherit; font-size: 13px; font-weight: 700; color: var(--me-navy);
  cursor: pointer; min-height: 46px;
}

/* --- journey --- */
.lt-me__journey { flex-direction: row; align-items: center; gap: 14px; }
.lt-me__jico {
  width: 34px; height: 34px; border-radius: 10px; flex: none;
  display: flex; align-items: center; justify-content: center;
  background: hsl(210, 25%, 94%); color: var(--me-muted);
}
.lt-me__jico--up { background: hsl(152, 55%, 94%); color: hsl(152, 55%, 30%); }

/* --- deeper analysis --- */
.lt-me__tab {
  font-family: inherit; font-size: 13px; font-weight: 700;
  padding: 9px 14px; border-radius: 8px; border: 1px solid transparent;
  background: hsl(210, 28%, 93%); color: var(--me-muted); cursor: pointer; min-height: 42px;
}
.lt-me__tab--on { background: var(--me-card); border-color: var(--me-border); color: var(--me-fg); }
.lt-me__rows { list-style: none; margin: 0; padding: 0; }
.lt-me__row {
  display: grid; grid-template-columns: 1fr auto auto; gap: 12px; align-items: center;
  padding: 13px 0; border-top: 1px solid var(--me-border);
}
.lt-me__rows > .lt-me__row:first-child, .lt-me__rows > .lt-me__accrow:first-child { border-top: none; }
.lt-me__row--rest { grid-template-columns: 1fr; gap: 4px; color: var(--me-muted); }
.lt-me__row-name { font-size: 14px; font-weight: 600; overflow-wrap: anywhere; }
.lt-me__row-marks { font-size: 13px; font-weight: 700; white-space: nowrap; }
.lt-me__row-note { font-size: 12px; color: var(--me-muted); line-height: 1.5; }
.lt-me__rowcta {
  font-family: inherit; font-size: 13px; font-weight: 700; color: var(--me-navy);
  text-decoration: underline; text-underline-offset: 3px;
  padding: 8px 2px; min-height: 40px; display: inline-flex; align-items: center;
}
.lt-me__accrow { border-top: 1px solid var(--me-border); }
.lt-me__acchead {
  display: grid; grid-template-columns: 1fr auto auto; gap: 12px; align-items: center;
  width: 100%; text-align: left; font-family: inherit; color: inherit;
  padding: 14px 0; background: none; border: none; cursor: pointer; min-height: 52px;
}
.lt-me__chev { color: var(--me-muted); display: inline-flex; transition: transform 0.18s; }
.lt-me__chev--open { transform: rotate(90deg); }
.lt-me__accbody {
  padding: 2px 0 14px 14px; border-left: 2px solid var(--me-border);
  margin: 0 0 4px 4px; display: flex; flex-direction: column; gap: 12px;
}

/* --- first run --- */
.lt-me__example {
  position: relative; border: 2px dashed hsl(215, 40%, 78%);
  border-radius: 18px; padding: 16px; background: hsl(214, 44%, 97%);
}
.lt-me__extag {
  position: absolute; top: -11px; left: 18px;
  background: var(--me-navy); color: #fff; font-size: 10.5px; font-weight: 700;
  letter-spacing: 0.09em; text-transform: uppercase; padding: 4px 11px; border-radius: 999px;
}
.lt-me__exnote { margin: 4px 0 13px; font-size: 13.5px; line-height: 1.6; color: hsl(222, 40%, 32%); }
.lt-me__exin { opacity: 0.75; pointer-events: none; }
.lt-me__unlock { gap: 10px; }
.lt-me__stepc { font-size: 12px; font-weight: 700; color: var(--me-muted); }
.lt-me__pips { display: flex; gap: 6px; }
.lt-me__pip { flex: 1; height: 7px; border-radius: 4px; background: hsl(210, 25%, 90%); }
.lt-me__pip--on { background: var(--me-accent); }
.lt-me__unlock-head { margin: 0; font-size: 16px; font-weight: 700; }

/* --- shared atoms --- */
.lt-me__empty-body { margin: 0; font-size: 13px; color: var(--me-muted); line-height: 1.55; }
.lt-me__note { margin: 0; font-size: 12px; color: var(--me-muted); line-height: 1.5; font-style: italic; }
.lt-me__footer { margin: 0; font-size: 11.5px; color: var(--me-muted); line-height: 1.55; text-align: center; }

.lt-me__cta {
  display: inline-flex; align-items: center; justify-content: center; gap: 7px;
  padding: 10px 15px; border-radius: 10px; cursor: pointer;
  font-family: inherit; font-size: 13px; font-weight: 700;
  text-decoration: none; border: 1px solid var(--me-border);
  background: var(--me-card); color: var(--me-fg);
  max-width: 100%; text-align: left; overflow-wrap: anywhere;
  align-self: flex-start; min-height: 44px;
}
.lt-me__cta--accent { background: var(--me-navy); border-color: var(--me-navy); color: #fff; }
.lt-me__cta--locked { background: hsl(220, 20%, 96%); border-color: var(--me-border); color: var(--me-muted); }
.lt-me__lock-icon { display: inline-flex; flex-shrink: 0; }
.lt-me__badge {
  font-size: 10.5px; font-weight: 700; letter-spacing: 0.04em;
  padding: 2px 7px; border-radius: 999px;
  background: var(--me-navy); color: #fff; flex-shrink: 0;
}

.lt-me__signin { flex-direction: row; align-items: flex-start; gap: 16px; }
.lt-me__lock-badge {
  width: 40px; height: 40px; border-radius: 10px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: hsl(150, 35%, 94%); color: hsl(152, 55%, 35%);
}
.lt-me__signin-title { font-family: var(--me-display); font-size: 20px; font-weight: 600; margin: 4px 0 8px; line-height: 1.3; }

/* --- the picker sheet. Rendered through a document.body portal, so it is styled
       OUTSIDE .lt-me and its selectors must not depend on that ancestor. --- */
.lt-me-mask {
  position: fixed; inset: 0; background: rgba(7, 26, 61, 0.45);
  display: flex; align-items: center; justify-content: center; padding: 18px; z-index: 60;
}
.lt-me-sheet {
  background: #fff; border-radius: 20px; max-width: 460px; width: 100%;
  padding: 24px 22px; box-shadow: 0 24px 60px rgba(7, 26, 61, 0.3);
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  color: hsl(220, 45%, 14%);
  display: flex; flex-direction: column; gap: 10px;
}
.lt-me-sheet__h { margin: 0; font-family: 'Fraunces', Georgia, serif; font-size: 20px; font-weight: 700; }
.lt-me-sheet__opt {
  display: flex; flex-direction: column; gap: 3px; text-align: left;
  padding: 15px 16px; border-radius: 14px; border: 1px solid hsl(215, 25%, 90%);
  background: #fff; text-decoration: none; color: inherit; min-height: 44px;
}
.lt-me-sheet__opt b { font-size: 15px; font-weight: 700; }
.lt-me-sheet__opt span { font-size: 13px; color: hsl(220, 15%, 45%); line-height: 1.5; }
.lt-me-sheet__x {
  width: 100%; padding: 12px; border-radius: 12px; border: none; background: transparent;
  color: hsl(220, 15%, 45%); font-family: inherit; font-weight: 700; cursor: pointer; min-height: 44px;
}

/* --- MOBILE. ONE responsive design, not two: the chapter list is a stacked grid by
       default and becomes a horizontal snap rail ONLY below the 1024px breakpoint. --- */
.lt-me--mobile .lt-me__chapter { grid-template-columns: auto 1fr; }
.lt-me--mobile .lt-me__chapter-ctas {
  grid-column: 1 / -1; flex-direction: column; align-items: stretch;
}
/* Full width, one per line. Splitting a ~300px row three ways left ~95px per control,
   which is narrower than the word "Premium" - the label then broke to one letter per
   line. Again: caught by a screenshot, not by an assertion. */
.lt-me--mobile .lt-me__chapter-ctas > * { width: 100%; align-self: stretch; justify-content: center; }
.lt-me--mobile .lt-me__papers { width: 100%; }
.lt-me--mobile .lt-me__paper { flex: 1; }
.lt-me--mobile .lt-me__bar { height: 44px; }
.lt-me--mobile .lt-me__seg { font-size: 16px; }
.lt-me--mobile .lt-me__row, .lt-me--mobile .lt-me__acchead { grid-template-columns: 1fr auto; }
/* The remainder row is a SENTENCE, not a two-column row. Without this it inherits the
   rule above (equal specificity, earlier in the sheet) and renders one letter per line.
   Found only by a 390px screenshot - every assertion about it still passed. */
.lt-me--mobile .lt-me__row--rest { grid-template-columns: 1fr; }
.lt-me--mobile .lt-me__row .lt-me__rowcta { grid-column: 2; }
.lt-me--mobile .lt-me__journey { align-items: flex-start; }

@media (prefers-reduced-motion: reduce) {
  .lt-me__chev { transition: none; }
}
`;
