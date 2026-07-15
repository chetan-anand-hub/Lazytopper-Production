// src/pages/PracticePage.tsx
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { usePracticeLimit } from "../components/auth/PracticeLimitGate";

import { type PracticeQuestion } from "../data/predictionDataService";
import {
  resolveTopicDisplayName,
  resolveTopicKey as resolveCanonicalTopicKey,
} from "../utils/topicResolver";
import { fetchStepSolution, type CheckSolutionResponse, type StepSolutionResponse } from "../ai/aiClient";
import { lazy, Suspense } from "react";
import type { ConceptTeachContext } from "../components/tutor/ConceptTeachDrawer";
const ConceptTeachDrawer = lazy(() => import("../components/tutor/ConceptTeachDrawer"));
import type { PracticeSectionFilter } from "../navigation/practiceNavigation";

const COUNT_SOFT_MAX = 50;
const mapEngineMarks = (ui: string): number | undefined => {
  if (ui === "1") return 1;
  if (ui === "5") return 5;
  if (ui === "4") return 4;
  return undefined;
};
// Valid single marks buckets (CBSE section grouping). A `?marks=` value may be a
// single bucket OR a comma-joined SET of buckets (e.g. "1,23") — the latter is how
// a Topic Hub concept-row carries a mark BAND that spans more than one bucket
// (range -> set, PR-E1). "all" is the no-filter sentinel.
const MARKS_BUCKETS = ["1", "23", "5", "4"] as const;
/**
 * Parse a raw `marks` query value into a canonical filter token:
 *   - "all" (or empty/invalid) -> "all"
 *   - a single valid bucket -> that bucket ("1" | "23" | "5" | "4")
 *   - a comma SET of valid buckets -> the deduped, canonically-ordered set joined
 *     by "," (e.g. "23,1" -> "1,23"). A set collapsing to one bucket returns that
 *     single bucket; an empty/invalid set returns "all".
 */
export const parseMarksValue = (raw: string | null): string => {
  if (!raw) return "all";
  if (raw === "all") return "all";
  const parts = raw.split(",").map((p) => p.trim()).filter(Boolean);
  const valid = MARKS_BUCKETS.filter((b) => parts.includes(b));
  if (valid.length === 0) return "all";
  return valid.join(",");
};
/** The set of buckets active for a committed marks token ("all" -> empty set). */
export const marksTokenToBucketSet = (token: string): Set<string> =>
  token === "all" ? new Set() : new Set(token.split(",").filter(Boolean));

export interface MarksRange { min: number; max: number; }
/**
 * Parse the concept-row EXACT mark-range params (`marksMin` / `marksMax`) into a
 * numeric {min,max} (PR-E1 amendment). PATH-CONDITIONAL: only the Topic Hub
 * concept-row emits these; every other entry (the Practice hub included) passes
 * null here and keeps the student-controlled bucket UI at "all". Out-of-CBSE
 * values (outside 1..5) or a missing/invalid pair yield null (honest default —
 * no forced range). A single param present is treated as min==max.
 */
export const parseMarksRangeParams = (
  rawMin: string | null,
  rawMax: string | null,
): MarksRange | null => {
  const toMark = (v: string | null): number | null => {
    if (v == null || v.trim() === "") return null;
    const n = Number(v);
    return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
  };
  const a = toMark(rawMin);
  const b = toMark(rawMax);
  if (a == null && b == null) return null;
  const lo = a ?? (b as number);
  const hi = b ?? (a as number);
  return { min: Math.min(lo, hi), max: Math.max(lo, hi) };
};
const navMarksToUi = (n: number | undefined): string => {
  if (n === 1) return "1";
  if (n === 5) return "5";
  if (n === 4) return "4";
  if (n === 2 || n === 3) return "23";
  return "all";
};

/**
 * PURE filter predicate — does a single bank question pass the active filters?
 * Extracted to module scope (PR-E1 final-bug fix) so the SAME predicate drives
 * BOTH the "N available" hint AND the displayed set (see selectInRangeFromPool).
 * Previously the in-component `matchesFilters` useCallback was the only consumer;
 * the hint counted a SEPARATE engine draw, which let the two pools diverge. The
 * behaviour here is byte-for-byte the prior callback body — exact-range / bucket
 * logic is unchanged. Imported by PracticePage.marksFilter.test.ts.
 */
export const questionMatchesFilters = (
  q: PracticeQuestion,
  marks: string,
  style: string,
  source: string,
  diff: string,
  range: MarksRange | null,
): boolean => {
  // EXACT concept mark-range filter (PR-E1 amendment) — path-conditional: only
  // active when the concept-row entry supplied marksMin/marksMax. Filters on
  // the real numeric `marks` field so "3-5" yields ONLY 3,4,5 (no coarse-bucket
  // 2/3-mark fusion). Questions with no numeric marks fall through to section.
  if (range) {
    const rawMarks = (q as { marks?: unknown }).marks;
    let m = Number(rawMarks ?? NaN);
    if (!Number.isFinite(m) || m <= 0) {
      // Fall back to the CBSE section -> canonical mark when marks is absent.
      const section = String((q as { section?: unknown }).section ?? "").toUpperCase();
      m = section === "A" ? 1 : section === "B" ? 2 : section === "C" ? 3
        : section === "D" ? 5 : section === "E" ? 4 : NaN;
    }
    if (!Number.isFinite(m) || m < range.min || m > range.max) return false;
  }
  if (marks !== "all") {
    const section = String((q as { section?: unknown }).section ?? "").toUpperCase();
    const m = Number((q as { marks?: unknown }).marks ?? 0);
    const fmt = String((q as { format?: unknown }).format ?? "").toLowerCase();
    const is1mk = section === "A" || m === 1 || fmt === "mcq" ||
      fmt.includes("assertion") || fmt === "ar";
    const is23mk = section === "B" || section === "C" || m === 2 || m === 3 ||
      fmt === "short" || fmt === "vsa";
    const is5mk = section === "D" || m === 5 || fmt === "long";
    const is4mk = section === "E" || m === 4 || fmt.includes("case");
    // `marks` is a bucket SET token ("1" | "23" | "5" | "4" or a comma set like
    // "1,23"). A question passes if it matches ANY active bucket (union — a
    // concept band spanning two buckets keeps both). Empty set = no match.
    const active = marksTokenToBucketSet(marks);
    const matchesAnyBucket =
      (active.has("1") && is1mk) ||
      (active.has("23") && is23mk) ||
      (active.has("5") && is5mk) ||
      (active.has("4") && is4mk);
    if (!matchesAnyBucket) return false;
  }

  if (style !== "all") {
    const fmt = String((q as { format?: unknown }).format ?? "").toLowerCase();
    const id = String((q as { id?: unknown }).id ?? "");
    const sub = String((q as { subtopic?: unknown }).subtopic ?? "").toLowerCase();
    const qtext = String((q as { questionText?: unknown }).questionText ?? "")
      .toLowerCase().slice(0, 80);
    const section = String((q as { section?: unknown }).section ?? "");
    const bloom = String((q as { bloomSkill?: unknown }).bloomSkill ?? "");

    if (style === "proof") {
      // ISSUE-007 fix: Section A is never a Proof question.
      if (section === "A") return false;
      const isProof =
        /prf/i.test(id) ||
        /^prove\s+that|^show\s+that|^derive\s/i.test(qtext) ||
        /proof|identit|tangent.propert/i.test(sub) ||
        (fmt.includes("long") && bloom === "Analysing" &&
         (section === "C" || section === "D"));
      if (!isProof) return false;
    }
    if (style === "ar" &&
        !fmt.includes("assertion") && !fmt.includes("ar")) return false;
    if (style === "hots") {
      const d = String((q as { difficulty?: unknown }).difficulty ?? "");
      const isHots = d === "Hard" || bloom === "Analysing" || bloom === "Evaluating";
      if (!isHots) return false;
    }
    if (style === "case" &&
        !fmt.includes("case") && section !== "E") return false;
  }

  if (source !== "all") {
    const qid = String((q as { id?: unknown }).id ?? "").toLowerCase();
    const pyqYear = (q as { pyqYear?: unknown }).pyqYear;
    const isPYQ = Boolean(pyqYear) ||
      Boolean((q as { isPYQ?: unknown }).isPYQ);

    if (source === "pyq" && !isPYQ) return false;

    if (source === "ncert") {
      if (isPYQ) return false;
      const isNcertExemplar =
        /^(rn-n-|poly-n-|ple-n-|qe-n-|ap-n-|tri-n-|cg-n-|trig-n-|circ-n-|arc-n-|sav-n-|stat-n-|prob-n-)/.test(qid) ||
        /ncert|exemplar/.test(qid) ||
        /-exmplr-|-ncert-/.test(qid);
      if (!isNcertExemplar) return false;
    }

    if (source === "others") {
      if (isPYQ) return false;
      // H3-bug fix: also exclude -EXEM- IDs (e.g. POLY-N-EXEM-2-MCQ-001),
      // which contain neither "ncert" nor "exemplar" as substrings but are
      // caught by the NCERT prefix regex above — without this they would
      // appear in BOTH the NCERT and Others filters.
      const isNcertSource = /ncert|exemplar|-exmplr-|-ncert-|-exem-/.test(qid);
      if (isNcertSource) return false;
    }
  }

  if (diff !== "all") {
    const d = String((q as { difficulty?: unknown }).difficulty ?? "");
    if (d !== diff) return false;
  }

  return true;
};

/** Rotate an array left by `offset` (a stable, non-destructive reordering). Empty and
 *  single-element arrays are returned as-is. `offset` is normalised, so any integer —
 *  including one larger than the array — is safe. */
const rotateBy = <T,>(items: T[], offset: number): T[] => {
  if (items.length <= 1) return items;
  const at = ((Math.trunc(offset) % items.length) + items.length) % items.length;
  if (at === 0) return items;
  return items.slice(at).concat(items.slice(0, at));
};

/**
 * PR-E1 FINAL-BUG FIX — single-pool unification. The "N available" hint and the
 * displayed set are derived from ONE shared `pool` so the hint can NEVER promise
 * more than the display delivers. `available` = total in-pool matches (honest:
 * if the bank truly has fewer than committedCount in-range, this is that real
 * smaller number). `displayed` = the same matches sliced to committedCount.
 *
 * INVARIANT (unit-tested): displayed.length === Math.min(available, committedCount).
 * Therefore available >= displayed.length always — the hint is a faithful upper
 * bound that the display fills to whenever the pool genuinely has enough.
 *
 * ── UNIQUE SETS (2026-07-15) — why this ORDERS and never DROPS ───────────────
 * The set used to be identical on every visit. The `.slice()` was only the last link:
 * the engine returns a predictionScore-sorted top-N and the generator's shuffle is
 * dead code on the default QP path (`isAdaptiveMode` is always true when difficulty is
 * "All"), so `matched` arrived in the same order forever.
 *
 * The fix REORDERS `matched` before the slice — unseen questions first, each partition
 * rotated by a per-session offset:
 *   · `available` is still `matched.length`, so the INVARIANT above holds IDENTICALLY
 *     and the "N available" hint never changes meaning. Dropping seen questions instead
 *     would shrink `available` and make the hint fall as the student practises — a
 *     different (and unasked-for) product promise.
 *   · rotating the SEEN partition delivers exhaustion-recombination for free: once
 *     everything has been seen, a repeat set is still a different combination rather
 *     than the identical list. Only real bank questions are ever recombined — nothing
 *     is fabricated, and the pool is untouched.
 *   · rotating the UNSEEN partition matters too: the seen-set is built from ATTEMPTS,
 *     so a question that was DISPLAYED but skipped stays "unseen". Without rotation an
 *     abandoned set would redraw at the same position — the original complaint.
 *
 * Both new params are OPTIONAL and default to today's exact behaviour, so every
 * existing caller and test is byte-unchanged (that is the no-regression proof).
 */
export const selectInRangeFromPool = (
  pool: PracticeQuestion[],
  marks: string,
  style: string,
  source: string,
  diff: string,
  range: MarksRange | null,
  committedCount: number,
  /** Bank ids this student has already attempted on this topic. Omit → no preference. */
  seenIds?: ReadonlySet<string>,
  /** Deterministic per-session rotation offset. Omit → no rotation. */
  rotateOffset?: number,
): { available: number; displayed: PracticeQuestion[] } => {
  const matched = pool.filter((q) =>
    questionMatchesFilters(q, marks, style, source, diff, range)
  );
  const available = matched.length;

  const offset = rotateOffset ?? 0;
  const hasSeen = !!seenIds && seenIds.size > 0;
  if (!hasSeen && offset === 0) {
    return { available, displayed: matched.slice(0, committedCount) };
  }

  const unseen = hasSeen ? matched.filter((q) => !seenIds!.has(String(q.id))) : matched;
  const seen = hasSeen ? matched.filter((q) => seenIds!.has(String(q.id))) : [];
  const ordered = rotateBy(unseen, offset).concat(rotateBy(seen, offset));

  // `ordered` is a permutation of `matched` — same length, same members — so
  // `available` is untouched and the invariant holds exactly as before.
  return { available, displayed: ordered.slice(0, committedCount) };
};
const uiMarksToSectionScope = (ui: string): "A" | "B" | "C" | "D" | "E" | "All" => {
  if (ui === "1") return "A";
  if (ui === "5") return "D";
  if (ui === "4") return "E";
  return "All";
};
import {
  getQuestionFamiliesForTopic,
  getQuestionMeta,
  getStrategyPackForTopic,
  isStrategyEnabledForTopic,
  resolveCanonicalTopicForStrategy,
} from "../services/questionTypeFirstResolver";
import { trackUxEvent } from "../services/uxTelemetry";
import {
  computeAdaptiveDifficultyMix,
  getWrongConceptsForTopic,
} from "../services/adaptivePracticeEngine";
import type {
  QuestionFamilyOverlay,
} from "../data/contentStrategy/types";
import type { StudentMentorIntent } from "../types/studentMentorIntent";
import { recordDetour } from "../services/guidedJourneyService";
import { getAttempts, getAttemptsFromCloud } from "../services/practiceInsights";
import {
  buildSeenQuestionIds,
  persistQuickPracticeSession,
  sessionRotationOffset,
  type QuickPracticeEntry,
} from "../services/quickPracticeSessionService";
import { toSessionSubject } from "../services/checkImproveGradeService";
import { useAuth } from "../context/AuthContext";
import {
  type SubjectKey,
  type DifficultyChoice,
  type QuestionStrategyDetails,
  MIN_QUESTION_COUNT,
  MAX_QUESTION_COUNT,
  deriveMentorDefaultIntent,
  buildStrategyContextHeader,
  buildRubricContextHeader,
  resolvePracticePackKey,
  buildPracticeQuestionsWithAiTopup,
  buildPracticeQuestionsFromEngine,
  normaliseSubject,
  parseDifficultyChoice,
  parsePositiveInt,
  parseFocusBankIds,
  parseBooleanFlag,
} from "../components/practice/practiceQuestionBuilder";
import { takeBlueprintShare } from "../components/practice/blueprintTake";
import { MentorSolveDrawer } from "../components/practice/MentorSolveDrawer";
import { PracticeControls } from "../components/practice/PracticeControls";
import { PracticeHero } from "../components/practice/PracticeHero";
import { WhyThisQuestionPanel } from "../components/practice/WhyThisQuestionPanel";
import { PracticeQuestionList } from "../components/practice/PracticeQuestionList";
import type { SessionStats } from "../components/practice/SessionProgressBar";
import { downloadWorksheet } from "../components/practice/worksheetGenerator";
import ResultsScorecard from "../components/results/ResultsScorecard";
import { quickPracticeScorecardVariant } from "../components/results/scorecardVariants";

const QTYPE_FIRST_TRIG = import.meta.env.VITE_QTYPE_FIRST_TRIGONOMETRY === "true";

interface PracticeNavState {
  subjectKey?: string;
  subject?: string;
  subjectTitle?: string;
  back?: string;
  backLabel?: string;
  topicKey?: string;
  sectionFilter?: string;
  practiceFilters?: {
    subtopicHint?: string;
    focusBankIds?: string[];
    strictFocus?: boolean;
    recommendedCount?: number;
    difficultyPreset?: DifficultyChoice;
    marksFilter?: number;
  };
}

const FIRST_PRACTICE_KEY = "lazytopper.first_practice_tracked";

const PracticePage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams<{ grade?: string; subject?: string }>();
  const { recordQuestionAnswered } = usePracticeLimit();
  const { user: authUserForJourney } = useAuth();

  useEffect(() => {
    try {
      const tracked = localStorage.getItem(FIRST_PRACTICE_KEY);
      if (!tracked) {
        trackUxEvent("first_practice_start", "practice", {});
        localStorage.setItem(FIRST_PRACTICE_KEY, "started");
      }
    } catch {}
  }, []);

  const grade = params.grade || "10";
  const subjectKey: SubjectKey = normaliseSubject(params.subject ?? "Maths");

  const qp = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const rawTopicParam = qp.get("topic") || "";
  const topicParam = rawTopicParam && rawTopicParam.toLowerCase() !== "generic"
    ? rawTopicParam
    : (subjectKey === "Science" ? "chemical-reactions-and-equations" : "real-numbers");
  const topicKeyParam = qp.get("topicKey");
  const journeyMentorMode = String(qp.get("journeyMentor") || "").trim().toLowerCase();
  const isTargetedSession = qp.get("targeted") === "1";
  const targetMistakeType = qp.get("targetMistakeType") || "";

  const navState = (location.state as PracticeNavState) || {};

  const subjectKeyStr = String(navState.subjectKey ?? navState.subject ?? subjectKey ?? "").toLowerCase();
  const subjectTitle = String(
    navState.subjectTitle ||
    (subjectKeyStr.includes("math") ? "Maths" :
     subjectKeyStr.includes("sci")  ? "Science" :
     (subjectKeyStr ? subjectKeyStr.charAt(0).toUpperCase() + subjectKeyStr.slice(1) : "Subject"))
  );
  const back: string | undefined = navState.back;
  const qpSource = qp.get("source");
  const safeReturnTo = useMemo(() => {
    const rawReturnTo = qp.get("returnTo");
    if (!rawReturnTo) return null;
    let decoded = rawReturnTo;
    try {
      decoded = decodeURIComponent(rawReturnTo);
    } catch {
      decoded = rawReturnTo;
    }
    if (!decoded.startsWith("/") || decoded.startsWith("//")) return null;
    if (/^[a-z][a-z0-9+.-]*:/i.test(decoded)) return null;
    return decoded;
  }, [qp]);
  const practiceBackTo = useMemo(() => {
    if (safeReturnTo) return safeReturnTo;
    if (back && typeof back === "string") return back;
    if (qpSource === "trends") return "/exam-trends";
    return "/practice-hub";
  }, [safeReturnTo, back, qpSource]);
  // `backLabel` may arrive via nav-state OR (Topic Hub concept-row uses a plain
  // <Link to={url}> that cannot carry nav-state) the `?backLabel=` query param —
  // e.g. "Back to Trigonometry", so concept-row Back returns to the SPECIFIC
  // topic page with the right label (PR-E1 amendment item 4).
  const queryBackLabel = useMemo(() => {
    const raw = qp.get("backLabel");
    return raw && raw.trim() ? raw.trim() : null;
  }, [qp]);
  const backLabel: string =
    navState.backLabel ||
    queryBackLabel ||
    (practiceBackTo.includes("/practice-hub")
      ? "Back to Practice"
      : practiceBackTo.includes("/exam-trends") || practiceBackTo.includes("/trends")
      ? "Back to trends"
      : "Back");

  const practiceFilters = navState.practiceFilters || {};

  const initialPracticeDefaults = useMemo(() => {
    const navSubtopicHint = String(practiceFilters.subtopicHint || "").trim() || undefined;
    const navFocusBankIds = Array.isArray(practiceFilters.focusBankIds)
      ? practiceFilters.focusBankIds.map((id) => String(id || "").trim()).filter(Boolean)
      : undefined;
    const navStrictFocus = Boolean(practiceFilters.strictFocus);
    const navRecommendedCount = parsePositiveInt(practiceFilters.recommendedCount);
    const navDifficultyPreset = parseDifficultyChoice(practiceFilters.difficultyPreset);
    const navMarksFilter = typeof practiceFilters.marksFilter === "number" ? practiceFilters.marksFilter : undefined;

    const querySubtopicHint = String(qp.get("subtopicHint") || "").trim() || undefined;
    const queryFocusBankIds = parseFocusBankIds(qp.get("focusBankIds"));
    const queryStrictFocus = parseBooleanFlag(qp.get("strictFocus"));
    const queryRecommendedCount = parsePositiveInt(qp.get("count"));
    const queryDifficultyPreset = parseDifficultyChoice(qp.get("difficulty"));

    const recommendedCount = queryRecommendedCount ?? navRecommendedCount ?? 10;
    const clampedCount = Math.max(
      MIN_QUESTION_COUNT,
      Math.min(COUNT_SOFT_MAX, Math.min(MAX_QUESTION_COUNT, recommendedCount))
    );

    const queryMarks = qp.get("marks");
    const queryStyle = qp.get("style");
    const querySource = qp.get("source");
    const queryDiff = qp.get("diff");
    // `marks` may be "all", a single bucket, or a comma SET of buckets (a Topic
    // Hub concept-row carries the concept's mark BAND as a bucket set — range ->
    // set, PR-E1). parseMarksValue canonicalises all three forms.
    const parsedQueryMarks = queryMarks ? parseMarksValue(queryMarks) : null;
    const marksUi = parsedQueryMarks && parsedQueryMarks !== "all"
      ? parsedQueryMarks
      : queryMarks === "all"
        ? "all"
        : navMarksFilter !== undefined ? navMarksToUi(navMarksFilter) : "all";
    const styleUi = queryStyle && ["all", "proof", "ar", "hots", "case"].includes(queryStyle)
      ? queryStyle
      : "all";
    const sourceUi = querySource && ["all", "pyq", "ncert", "others"].includes(querySource)
      ? querySource
      : "all";
    const diffUi = queryDiff && ["all", "Easy", "Medium", "Hard"].includes(queryDiff)
      ? queryDiff
      : navDifficultyPreset && navDifficultyPreset !== "All" ? navDifficultyPreset : "all";

    return {
      subtopicHint: querySubtopicHint ?? navSubtopicHint,
      focusBankIds: queryFocusBankIds ?? navFocusBankIds,
      strictFocus: queryStrictFocus ?? navStrictFocus ?? false,
      recommendedCount: clampedCount,
      difficultyPreset: queryDifficultyPreset ?? navDifficultyPreset ?? "All",
      marksUi,
      styleUi,
      sourceUi,
      diffUi,
    };
  }, [practiceFilters, qp]);

  // Concept-row EXACT mark range (PR-E1 amendment). PATH-CONDITIONAL: present ONLY
  // on the Topic Hub concept-row entry (which emits marksMin/marksMax). On every
  // other entry (the Practice hub included) this is null and the page keeps its
  // student-controlled bucket UI at "all". A STARTING filter, not a lock — held in
  // state so the student can clear/widen it via the advanced filter.
  const conceptMarksRange = useMemo(
    () => parseMarksRangeParams(qp.get("marksMin"), qp.get("marksMax")),
    [qp]
  );
  // Concept name carried by the concept-row entry (`?focus=`), used by the
  // applied-band indicator. Concept-row-only — null elsewhere.
  const conceptFocusLabel = useMemo(() => {
    const raw = (qp.get("focus") || "").trim();
    return raw || null;
  }, [qp]);

  const didInitFromUrlRef = useRef(false);
  const didAutoOpenJourneyMentorRef = useRef(false);

  const [subtopicHint, setSubtopicHint] = useState<string | undefined>(
    () => initialPracticeDefaults.subtopicHint
  );
  const [focusBankIds, setFocusBankIds] = useState<string[] | undefined>(
    () => initialPracticeDefaults.focusBankIds
  );
  const [strictFocus, setStrictFocus] = useState<boolean>(
    () => Boolean(initialPracticeDefaults.strictFocus)
  );
  const [questionCount, setQuestionCount] = useState<number>(
    () => initialPracticeDefaults.recommendedCount
  );
  const [difficulty, setDifficulty] = useState<DifficultyChoice>(
    () => initialPracticeDefaults.difficultyPreset
  );
  // Pending state — drives chip UI and the live "N available" hint.
  const [pendingMarks, setPendingMarks] = useState<string>(
    () => initialPracticeDefaults.marksUi
  );
  const [pendingStyle, setPendingStyle] = useState<string>(
    () => initialPracticeDefaults.styleUi
  );
  const [pendingSource, setPendingSource] = useState<string>(
    () => initialPracticeDefaults.sourceUi
  );
  const [pendingDifficulty, setPendingDifficulty] = useState<string>(
    () => initialPracticeDefaults.diffUi
  );
  // Committed state — drives the visible question list (and engine fetch deps).
  const [committedMarks, setCommittedMarks] = useState<string>(
    () => initialPracticeDefaults.marksUi
  );
  const [committedStyle, setCommittedStyle] = useState<string>(
    () => initialPracticeDefaults.styleUi
  );
  const [committedSource, setCommittedSource] = useState<string>(
    () => initialPracticeDefaults.sourceUi
  );
  const [committedDifficulty, setCommittedDifficulty] = useState<string>(
    () => initialPracticeDefaults.diffUi
  );
  const [committedCount, setCommittedCount] = useState<number>(
    () => initialPracticeDefaults.recommendedCount
  );
  // EXACT concept mark-range filter (PR-E1 amendment) — separate from the coarse
  // bucket UI so "3-5" yields ONLY 3,4,5 with no 2-mark contamination. Pending
  // mirrors committed; both seed from the URL range (null off the concept path)
  // and are cleared by Clear/Edit filters so the student can widen it.
  const [pendingMarksRange, setPendingMarksRange] = useState<MarksRange | null>(
    () => conceptMarksRange
  );
  const [committedMarksRange, setCommittedMarksRange] = useState<MarksRange | null>(
    () => conceptMarksRange
  );
  const [isBuilt, setIsBuilt] = useState<boolean>(false);

  // ── QP SESSION IDENTITY + THE SEEN-SET (unique sets, 2026-07-15) ───────────
  // When this VISIT began. Captured once per mount: a new visit is a new session, so
  // it both varies the draw and (at finish) makes the record id idempotent within the
  // visit while distinct across visits. Never re-read — a changing value would
  // reshuffle the set under the student mid-session.
  const [sessionStartedAt] = useState<number>(() => Date.now());
  // The COMMITTED filters that decide WHICH questions this set contains. Change any of
  // them and it is a different set → a different session identity → a different draw.
  // `pending*` is deliberately absent (it hasn't been applied yet), as are nav/display
  // params (returnTo/backLabel/focus) which change nothing about the questions.
  const filterSignature = useMemo(
    () =>
      [
        committedMarks,
        committedStyle,
        committedSource,
        committedDifficulty,
        committedMarksRange ? `${committedMarksRange.min}-${committedMarksRange.max}` : "none",
        String(committedCount),
      ].join("|"),
    [committedMarks, committedStyle, committedSource, committedDifficulty, committedMarksRange, committedCount],
  );
  // Bank ids already attempted on this topic. Seeded SYNCHRONOUSLY from the local
  // attempts blob so the very first draw is already informed, then unioned with the
  // cross-device cloud read below. Honest degradation: if the cloud read fails, the
  // set is merely smaller → a less-optimal rotation, never a wrong or invented one.
  const [seenQuestionIds, setSeenQuestionIds] = useState<ReadonlySet<string>>(() => new Set());
  // Deterministic per-session rotation — NOT Math.random() (CLAUDE.md §7). Seeded from
  // `topicParam` rather than `canonicalTopicKey` purely for declaration order (the
  // canonical key is derived further down, after this memo); sessionRotationOffset
  // canonicalises whatever it is given, so both spellings land on the same offset.
  const rotationOffset = useMemo(
    () => sessionRotationOffset(topicParam, filterSignature, sessionStartedAt),
    [topicParam, filterSignature, sessionStartedAt],
  );
  // Load-bearing scorecard trigger: the student DECLARES completion (partial or
  // full) by tapping "Finish session", which sets this true and surfaces the
  // scorecard. `allDone` (every question attempted) remains a convenience
  // auto-offer. Reset on every fresh build/regenerate (see the fetch effect).
  const [sessionFinished, setSessionFinished] = useState<boolean>(false);
  // The Universal <ResultsScorecard> presents as an auto-appearing modal; this lets the
  // student dismiss it (✕ / dim / Escape) without fighting the derived trigger. Reset on
  // an explicit Finish tap and on every fresh build/regenerate.
  const [scorecardDismissed, setScorecardDismissed] = useState<boolean>(false);
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);

  useEffect(() => {
    if (didInitFromUrlRef.current) return;
    setSubtopicHint(initialPracticeDefaults.subtopicHint);
    setFocusBankIds(initialPracticeDefaults.focusBankIds);
    setStrictFocus(Boolean(initialPracticeDefaults.strictFocus));
    setQuestionCount(initialPracticeDefaults.recommendedCount);
    setDifficulty(initialPracticeDefaults.difficultyPreset);
    setPendingMarks(initialPracticeDefaults.marksUi);
    setPendingStyle(initialPracticeDefaults.styleUi);
    setPendingSource(initialPracticeDefaults.sourceUi);
    setPendingDifficulty(initialPracticeDefaults.diffUi);
    setCommittedMarks(initialPracticeDefaults.marksUi);
    setCommittedStyle(initialPracticeDefaults.styleUi);
    setCommittedSource(initialPracticeDefaults.sourceUi);
    setCommittedDifficulty(initialPracticeDefaults.diffUi);
    setCommittedCount(initialPracticeDefaults.recommendedCount);
    setPendingMarksRange(conceptMarksRange);
    setCommittedMarksRange(conceptMarksRange);
    // Gap-B auto-serve: a TARGETED arrival — an explicit topic in the URL (from
    // a "practise where you lose marks" CTA, Topic Hub, or the desktop hub's
    // "Start quick practice") or a Fix-My-Mistakes session (targeted=1) — should
    // land the student IN a ready, scoped set rather than behind the builder.
    // The generate effect already fetches on mount; flipping isBuilt surfaces it.
    // A bare subject-level arrival (no explicit topic) keeps the manual builder,
    // and "Edit filters" remains available to refine a served set.
    const arrivedTargeted =
      (!!rawTopicParam && rawTopicParam.toLowerCase() !== "generic") || isTargetedSession;
    if (arrivedTargeted) {
      setIsBuilt(true);
    }
    didInitFromUrlRef.current = true;
  }, [initialPracticeDefaults]);

  const engineMarksFilter = useMemo(() => mapEngineMarks(committedMarks), [committedMarks]);

  // PR-E1 FINAL-BUG FIX — derive BOTH the displayed set AND the post-build "N
  // available" hint from this ONE realized pool (`questions`), via the shared
  // selectInRangeFromPool helper. Before, `filteredQuestions` filtered the
  // fetched `questions` while `bankAvailableCount` counted a SEPARATE engine
  // draw, so the hint could promise more than the display delivered. Now the
  // hint is `committedPoolSelection.available` (matches in THIS pool) and the
  // display is `committedPoolSelection.displayed` (the same matches, sliced to
  // committedCount) — the two can no longer diverge.
  const committedPoolSelection = useMemo(() => {
    if (!isBuilt || !questions || questions.length === 0) {
      return { available: 0, displayed: [] as PracticeQuestion[] };
    }
    // The engine deliberately over-fetches when a marks/section filter (or an
    // exact concept range) is active so the random-sample bias toward the
    // Easy/Section-A bucket doesn't starve other sections. We narrow client-side
    // and trim to the committed count so the rendered list matches the request.
    return selectInRangeFromPool(
      questions,
      committedMarks,
      committedStyle,
      committedSource,
      committedDifficulty,
      committedMarksRange,
      committedCount,
      seenQuestionIds,
      rotationOffset,
    );
  }, [questions, isBuilt, committedMarks, committedStyle, committedSource, committedDifficulty, committedMarksRange, committedCount, seenQuestionIds, rotationOffset]);

  const filteredQuestions = committedPoolSelection.displayed;

  const handleSetStyle = useCallback((v: string) => {
    setPendingStyle(v);
    if (v === "hots") {
      setPendingDifficulty("Hard");
    } else if (pendingStyle === "hots" && v !== "hots") {
      setPendingDifficulty("all");
    }
  }, [pendingStyle]);

  const handleClearFilters = useCallback(() => {
    setPendingMarks("all");
    setPendingStyle("all");
    setPendingSource("all");
    setPendingDifficulty("all");
    // Widen out of the pre-applied concept band too (PR-E1 amendment): "Clear
    // filters" must let the student escape the starting range, not just the buckets.
    setPendingMarksRange(null);
    setQuestionCount(10);
  }, []);

  const handleEditFilters = useCallback(() => {
    setIsBuilt(false);
    setPendingMarks(committedMarks);
    setPendingStyle(committedStyle);
    setPendingSource(committedSource);
    setPendingDifficulty(committedDifficulty);
    setPendingMarksRange(committedMarksRange);
    setQuestionCount(committedCount);
  }, [committedMarks, committedStyle, committedSource, committedDifficulty, committedMarksRange, committedCount]);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [isWhyPanelOpen, setIsWhyPanelOpen] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [expandedAnswers, setExpandedAnswers] = useState<
    Record<string, boolean>
  >({});
  const [regenerationKey, setRegenerationKey] = useState<number>(0);
  const previousQuestionKeys = useRef<Set<string>>(new Set());
  const [selfAssessments, setSelfAssessments] = useState<Record<string, "got_it" | "need_practice">>({});
  const [mcqSelections, setMcqSelections] = useState<Record<string, number>>({});
  const [mcqResults, setMcqResults] = useState<Record<string, "correct" | "wrong">>({});
  // The graded payload per question, lifted from SolutionChecker via onGraded. Read
  // ONLY to assemble the (non-counting) session record at finish — SolutionChecker's
  // own recordAttempt/recordMistake sinks are the counting path and are untouched.
  const [gradedResults, setGradedResults] = useState<Record<string, CheckSolutionResponse>>({});
  // Which session identity has already been written. A one-shot latch: the scorecard
  // re-renders, and `allDone` can raise it without any click, so without this the
  // write would fire on every render.
  const recordedSessionRef = useRef<string | null>(null);
  const [practiceSolutionData, setPracticeSolutionData] = useState<Record<string, StepSolutionResponse>>({});
  const [practiceSolutionLoading, setPracticeSolutionLoading] = useState<Record<string, boolean>>({});
  const [practiceSolutionError, setPracticeSolutionError] = useState<Record<string, string | undefined>>({});

  const [conceptDrawerOpen, setConceptDrawerOpen] = useState(false);
  const [conceptDrawerContext, setConceptDrawerContext] = useState<ConceptTeachContext | null>(null);

  const openConceptDrawer = (q: PracticeQuestion) => {
    setConceptDrawerContext({
      topicKey: q.topicKey || canonicalTopicKey || topicParam,
      subject: subjectKey,
      questionText: q.questionText,
      marks: q.marks,
      subtopic: q.subtopic,
    });
    setConceptDrawerOpen(true);
  };

// Practice Mentor Drawer (Solve With Me / Board Steps)
const [mentorDrawerOpen, setMentorDrawerOpen] = useState(false);
const [mentorSolveStyle, setMentorSolveStyle] = useState<"socratic" | "board">("socratic");
const [mentorSeedExample, setMentorSeedExample] = useState<{
  title: string;
  questionId: string;
  question: string;
  marks?: number;
  section?: string;
  defaultIntent?: StudentMentorIntent;
  strategyContextHeader?: string;
  rubricContextHeader?: string;
  questionFamilyId?: string;
  questionFamilyLabel?: string;
  questionTypeId?: string;
  chapterStep?: string;
  practiceSectionFilter?: PracticeSectionFilter;
  suggestedPracticeIds?: string[];
  theoremFocus?: string[];
  recommendedDiagramType?: string;
} | null>(null);


  const canonicalTopicKey = useMemo(() => {
  const explicitFromState = navState.topicKey;
  return resolveCanonicalTopicKey({
    subjectKey: String(subjectKey).toLowerCase(),
    topicParam,
    topicKey: topicKeyParam || explicitFromState || null,
  });
}, [subjectKey, topicParam, topicKeyParam, navState]);

  // Load the seen-set for THIS topic: the local blob first (synchronous, offline-safe,
  // and it already carries answers from this very visit), then the durable cloud
  // subcollection unioned on top for cross-device. There is no hydration path from
  // cloud → localStorage, so without the cloud read a student who practises on their
  // phone would see the same set again on their laptop.
  // Honest degradation: a failed/absent cloud read just leaves the set smaller, which
  // biases the draw less well — it never produces a wrong or fabricated question.
  useEffect(() => {
    let cancelled = false;
    const topicForSeen = canonicalTopicKey || topicParam;
    if (!topicForSeen) return;
    setSeenQuestionIds(buildSeenQuestionIds(getAttempts(), topicForSeen));
    const uid = authUserForJourney?.uid;
    if (!uid || authUserForJourney?.isLocalSession) return;
    void getAttemptsFromCloud(uid)
      .then((cloudAttempts) => {
        if (cancelled) return;
        const fromCloud = buildSeenQuestionIds(cloudAttempts, topicForSeen);
        setSeenQuestionIds((local) => {
          const union = new Set(local);
          for (const id of fromCloud) union.add(id);
          return union;
        });
      })
      .catch(() => {
        /* honest degrade: keep the device-local set */
      });
    return () => {
      cancelled = true;
    };
  }, [canonicalTopicKey, topicParam, authUserForJourney?.uid, authUserForJourney?.isLocalSession]);

  const strategyTopicSeed = useMemo(() => {
    const explicitFromState = navState.topicKey;
    return canonicalTopicKey || topicKeyParam || explicitFromState || topicParam || "";
  }, [canonicalTopicKey, topicKeyParam, navState, topicParam]);
  const strategyCanonicalTopicKey = useMemo(
    () => resolveCanonicalTopicForStrategy(strategyTopicSeed),
    [strategyTopicSeed]
  );
  const isWhyThisQuestionEnabled =
    QTYPE_FIRST_TRIG && isStrategyEnabledForTopic(strategyCanonicalTopicKey);
  const strategyPack = useMemo(() => {
    if (!isWhyThisQuestionEnabled) return null;
    return getStrategyPackForTopic(strategyCanonicalTopicKey);
  }, [isWhyThisQuestionEnabled, strategyCanonicalTopicKey]);

  const getQuestionStrategyDetails = useCallback(
    (question: PracticeQuestion | null): QuestionStrategyDetails | null => {
      if (!isWhyThisQuestionEnabled || !strategyPack || !question) return null;
      const meta = getQuestionMeta(String(question.id), strategyCanonicalTopicKey);
      if (!meta) return null;
      const loSet = new Set(meta.loIds || []);
      const learningObjects = strategyPack.learningObjects.filter((lo) => loSet.has(lo.loId));
      const mistakes: string[] = [];
      if (Array.isArray(meta.mistakeTags)) {
        mistakes.push(...meta.mistakeTags.map((m) => String(m).trim()).filter(Boolean));
      }
      for (const lo of learningObjects) {
        if (!Array.isArray(lo.commonMistakes)) continue;
        mistakes.push(...lo.commonMistakes.map((m) => String(m).trim()).filter(Boolean));
      }
      const commonMistakes = Array.from(new Set(mistakes)).slice(0, 3);
      const boardWritingTip =
        learningObjects
          .map((lo) => String(lo.boardWritingTip || "").trim())
          .find(Boolean) || "";
      return {
        meta,
        learningObjects,
        commonMistakes,
        boardWritingTip,
      };
    },
    [isWhyThisQuestionEnabled, strategyPack, strategyCanonicalTopicKey]
  );
  const strategyFamilies = useMemo(
    () => getQuestionFamiliesForTopic(strategyCanonicalTopicKey),
    [strategyCanonicalTopicKey]
  );
  const resolveQuestionFamily = useCallback(
    (question: PracticeQuestion | null, details: QuestionStrategyDetails | null): QuestionFamilyOverlay | null => {
      if (!question || strategyFamilies.length === 0) return null;
      const questionId = String(question.id || "").trim();
      if (!questionId) return null;

      const exactFocusMatch =
        strategyFamilies.find((family) =>
          Array.isArray(family.focusBankIds) &&
          family.focusBankIds.map((id) => String(id || "").trim()).includes(questionId)
        ) || null;
      if (exactFocusMatch) return exactFocusMatch;

      const skillFamily = String(details?.meta.skillFamily || "").trim().toLowerCase();
      if (skillFamily) {
        const bySkill =
          strategyFamilies.find(
            (family) => String(family.skillFamily || "").trim().toLowerCase() === skillFamily
          ) || null;
        if (bySkill) return bySkill;
      }

      if (/proof/i.test(skillFamily)) {
        return (
          strategyFamilies.find((family) => family.familyId === "TRI_FAMILY_PROOF_STRUCTURE") ||
          null
        );
      }
      return null;
    },
    [strategyFamilies]
  );

  // Two topic identifiers are used:
  // - topicLabel: display name used by the canonical bank (e.g., "Real Numbers")
  // - packTopicKey: snake_case key used by Prompt-D packs (e.g., "real_numbers")
  const topicLabel = useMemo(() => {
    if (canonicalTopicKey && canonicalTopicKey.toLowerCase() !== "generic") {
      return resolveTopicDisplayName(subjectKey, canonicalTopicKey);
    }
    if (!topicParam || topicParam.toLowerCase() === "generic") return topicParam;
    return resolveTopicDisplayName(subjectKey, canonicalTopicKey || topicParam);
  }, [subjectKey, canonicalTopicKey, topicParam]);

  useEffect(() => {
    const slug = canonicalTopicKey || topicParam;
    if (slug && slug.toLowerCase() !== "generic") {
      recordDetour(slug, topicLabel || slug, authUserForJourney?.uid);
    }
  }, [canonicalTopicKey, topicParam, topicLabel, authUserForJourney?.uid]);

const packTopicKey = useMemo(() => {
  const explicitFromState = navState.topicKey;
  return resolvePracticePackKey({
    subjectKey,
    topicParam,
    explicitTopicKey: topicKeyParam || explicitFromState || null,
  });
}, [subjectKey, topicParam, topicKeyParam, navState]);

  // Availability hint ("N available").
  //
  // POST-BUILD (single-pool unification, PR-E1 final-bug fix): once a set is
  // built/served, the hint MUST reflect the SAME realized pool the display
  // filters (`questions`), not a separate engine draw. Reporting a fresh
  // 200-draw count here was the root cause of the two-pool divergence — the
  // separate draw landed more in-range matches than the (smaller, independent)
  // display draw, so the hint promised e.g. 10 while the display showed 5–6.
  // Now post-build the hint === `committedPoolSelection.available` (matches in
  // THIS pool), so the hint can never exceed what the display delivers, and a
  // narrow in-range band reliably fills to committedCount when the pool has
  // enough. The honest thin-bank case is preserved: if the realized pool truly
  // has fewer than committedCount in-range, `available` IS that real number.
  //
  // PRE-BUILD: there is no realized pool yet, so keep the deep candidate-pool
  // preview over the PENDING filters (live "N available" as the student tunes
  // filters on the builder, before the first Build).
  const preBuildAvailableCount = useMemo(() => {
    const sectionForMarks = uiMarksToSectionScope(pendingMarks);
    // ⚠ DELIBERATELY NO `seenQuestionIds` HERE — do not "complete" this call by adding it.
    // "N available" is a faithful count of the POOL, not of what is left FOR YOU. Passing
    // the seen-set would make the number FALL as the student practises ("42 available" →
    // "31 available" for the same unchanged bank), which reads as the bank shrinking and
    // is a broken product promise. The seen-set belongs on the two SET-BUILDING fetches
    // only. Pinned by a test.
    const bankQuestions = buildPracticeQuestionsFromEngine({
      subjectKey,
      topicKey: topicLabel,
      count: 200,
      difficulty: "All",
      boardPattern: sectionForMarks === "All" ? undefined : sectionForMarks,
    });
    return bankQuestions.filter((q) =>
      questionMatchesFilters(q, pendingMarks, pendingStyle, pendingSource, pendingDifficulty, pendingMarksRange)
    ).length;
  }, [subjectKey, topicLabel, pendingMarks, pendingStyle, pendingSource, pendingDifficulty, pendingMarksRange]);

  const bankAvailableCount = isBuilt
    ? committedPoolSelection.available
    : preBuildAvailableCount;

  useEffect(() => {
    if (filteredQuestions.length === 0) {
      if (activeQuestionId !== null) setActiveQuestionId(null);
      return;
    }
    if (
      activeQuestionId &&
      filteredQuestions.some((q) => String(q.id) === String(activeQuestionId))
    ) {
      return;
    }
    setActiveQuestionId(String(filteredQuestions[0].id));
  }, [filteredQuestions, activeQuestionId]);

  useEffect(() => {
    // PR-K2H-8e: clear exclusion set when filter changes so the
    // new filter cohort is not immediately excluded.
    previousQuestionKeys.current = new Set<string>();

    let cancelled = false;

    const run = async () => {
      setIsLoading(true);
      setError(null);

      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("__timeout__")), 15000)
      );

      try {
        const adaptiveMix = difficulty === "All"
          ? computeAdaptiveDifficultyMix(canonicalTopicKey || topicParam)
          : undefined;
        const wrongConcepts = adaptiveMix
          ? getWrongConceptsForTopic(canonicalTopicKey || topicParam)
          : [];
        const priorityConceptKeys = wrongConcepts.length > 0
          ? wrongConcepts.map((e) => e.conceptKey)
          : undefined;

        // Engine section filter — routes the engine to fetch from the
        // correct Section directly instead of a random sample biased by
        // the default difficulty mix (which is Section-A-heavy). For the
        // "23" combo we fetch unrestricted and let the client narrow B+C.
        const engineSectionFilter = (() => {
          if (committedMarks === "1") return "A";
          if (committedMarks === "5") return "D";
          if (committedMarks === "4") return "E";
          return undefined;
        })();

        // Engine fetch count.
        //   "23" / any multi-bucket SET → 100: the client narrows from a mixed
        //               sample, so a deep pool is needed for the filter to clear.
        //   exact single section (A/D/E) → 5× requested, capped at 100: precise.
        //   "all" → just questionCount (balanced mix, no narrowing).
        const engineCount = (() => {
          // Concept-row EXACT range (PR-E1 amendment): the bucket UI is "all" here,
          // so over-fetch the full blueprint pool (100) and let the client-side
          // numeric-range narrowing trim it — otherwise a narrow band (e.g. 3-5)
          // could starve a 10-question blueprint sample.
          if (committedMarksRange) return 100;
          if (committedMarks === "all") return questionCount;
          if (committedMarks === "23" || committedMarks.includes(",")) return 100;
          return Math.min(questionCount * 5, 100);
        })();

        let next: PracticeQuestion[];

        if (committedMarks === "all") {
          // CBSE Class 10 board paper blueprint:
          //   Section A (1mk) 30% · B (2mk) 20% · C (3mk) 20% · D (5mk) 20% · E (4mk) 10%
          // Fan out one engine call per section so the returned mix mirrors
          // the board's section weighting instead of generatePracticeSet's
          // default difficulty bucketing (which over-pulls from the Easy /
          // Section-A bucket and produces non-board-shaped sets).
          const BLUEPRINT: Array<{ section: "A" | "B" | "C" | "D" | "E"; share: number }> = [
            { section: "A", share: 0.30 },
            { section: "B", share: 0.20 },
            { section: "C", share: 0.20 },
            { section: "D", share: 0.20 },
            { section: "E", share: 0.10 },
          ];

          const sectionResults = await Promise.race([
            Promise.all(
              BLUEPRINT.map(({ section, share }) =>
                buildPracticeQuestionsWithAiTopup({
                  grade,
                  subjectKey,
                  topicLabel,
                  packTopicKey,
                  count: Math.max(1, Math.round(questionCount * share)),
                  difficulty,
                  subtopicHint,
                  focusBankIds,
                  strictFocus,
                  sectionFilter: section,
                  adaptiveMix,
                  priorityConceptKeys,
                  marksFilter: engineMarksFilter,
                  pyqOnly: committedSource === "pyq" || undefined,
                  excludeKeys: previousQuestionKeys.current.size > 0 ? previousQuestionKeys.current : undefined,
                  // The seen-set at the FETCH layer: the engine skips already-attempted
                  // questions BEFORE its head-take, so repeat sessions walk DOWN the
                  // predictionScore list instead of re-serving its head forever.
                  seenQuestionIds,
                })
              )
            ),
            timeout,
          ]);

          // Take each section's BLUEPRINT SHARE from its own batch (A3·B2·C2·D2·E1 at
          // count=10) instead of concatenating and tail-slicing.
          //
          // The old `merged.slice(0, questionCount)` looked equivalent and was not: the
          // MIN_QUESTION_COUNT=3 floor inflates every section's request to 3 (a requested
          // 3/2/2/2/1 arrives as 3/3/3/3/3 = 15), and the tail slice then kept
          // A(3)+B(3)+C(3)+D(1)+E(0). Realised shape ≈ A30/B30/C30/D10/E0 — Section E
          // (case-based) NEVER rendered on the default path and D was starved with it,
          // against an intended 30/20/20/20/10. See blueprintTake.ts; the shape is now a
          // pinned property rather than an unguarded product claim.
          next = takeBlueprintShare(
            BLUEPRINT.map(({ section, share }, i) => ({
              section,
              share,
              questions: sectionResults[i] ?? [],
            })),
            questionCount,
            // Dedup key mirrors the old merge's (questionText, first 80 chars) so a
            // question appearing in two batches still resolves to one.
            (q) => String(q.questionText || "").trim().toLowerCase().slice(0, 80),
          );
        } else {
          next = await Promise.race([
            buildPracticeQuestionsWithAiTopup({
              grade,
              subjectKey,
              topicLabel,
              packTopicKey,
              count: engineCount,
              difficulty,
              subtopicHint,
              focusBankIds,
              strictFocus,
              sectionFilter: engineSectionFilter,
              adaptiveMix,
              priorityConceptKeys,
              marksFilter: engineMarksFilter,
              pyqOnly: committedSource === "pyq" || undefined,
              excludeKeys: previousQuestionKeys.current.size > 0 ? previousQuestionKeys.current : undefined,
              // Fetch-layer seen-set — see the blueprint branch above.
              seenQuestionIds,
            }),
            timeout,
          ]);
        }

        if (!cancelled) {
          setQuestions(next);
          setSessionFinished(false);
          setScorecardDismissed(false);
          setExpandedAnswers({});
          setSelfAssessments({});
          setMcqSelections({});
          setMcqResults({});
          setGradedResults({});
          // A rebuilt/regenerated set is a NEW session: clear the write latch or the
          // new set would be silently skipped (and clear the grades with it, or they
          // would leak across the boundary into the next record).
          recordedSessionRef.current = null;
          setPracticeSolutionData({});
          setPracticeSolutionLoading({});
          setPracticeSolutionError({});
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "";
        console.error("Error generating practice questions:", err);
        if (!cancelled) {
          setQuestions([]);
          setPracticeSolutionData({});
          setPracticeSolutionLoading({});
          setPracticeSolutionError({});
          setError(
            errMsg === "__timeout__"
              ? "Loading took too long. Please try again or pick a different topic."
              : "Could not generate practice questions right now. Please try again."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [
    grade,
    subjectKey,
    topicLabel,
    packTopicKey,
    questionCount,
    difficulty,
    subtopicHint,
    focusBankIds,
    strictFocus,
    engineMarksFilter,
    committedMarks,
    committedMarksRange,
    committedSource,
    regenerationKey,
  ]);

  useEffect(() => {
    previousQuestionKeys.current.clear();
  }, [topicParam, subjectKey]);

  const regenerateQuestions = () => {
    for (const q of questions) {
      const key = String(q.questionText || "").trim().toLowerCase().slice(0, 120);
      if (key) previousQuestionKeys.current.add(key);
    }
    setRegenerationKey((prev) => prev + 1);
  };

  const handleDownloadWorksheet = async () => {
    const scope = uiMarksToSectionScope(committedMarks);
    await downloadWorksheet({
      topicLabel: topicLabel || topicParam,
      subjectKey,
      grade,
      difficulty,
      sectionFilter: scope === "All" ? "All" : [scope],
      questions: filteredQuestions,
    });
  };

  const [linkCopied, setLinkCopied] = useState(false);
  const linkCopiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (linkCopiedTimerRef.current) clearTimeout(linkCopiedTimerRef.current);
    };
  }, []);

  const handleCopyLink = useCallback(() => {
    const ids = filteredQuestions.map((q) => String(q.id)).filter(Boolean);
    if (ids.length === 0) return;

    const base = window.location.origin + window.location.pathname;
    const params = new URLSearchParams();
    params.set("topic", topicParam);
    if (difficulty !== "All") params.set("difficulty", difficulty);
    if (committedMarks !== "all") params.set("marks", committedMarks);
    if (committedStyle !== "all") params.set("style", committedStyle);
    if (committedSource !== "all") params.set("source", committedSource);
    if (committedDifficulty !== "all") params.set("diff", committedDifficulty);
    params.set("count", String(ids.length));
    params.set("focusBankIds", ids.join(","));
    params.set("strictFocus", "true");

    const url = `${base}?${params.toString()}`;

    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      if (linkCopiedTimerRef.current) clearTimeout(linkCopiedTimerRef.current);
      linkCopiedTimerRef.current = setTimeout(() => setLinkCopied(false), 2500);
    }).catch(() => {
      try {
        const ta = document.createElement("textarea");
        ta.value = url;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        setLinkCopied(true);
        if (linkCopiedTimerRef.current) clearTimeout(linkCopiedTimerRef.current);
        linkCopiedTimerRef.current = setTimeout(() => setLinkCopied(false), 2500);
      } catch {}
    });
  }, [filteredQuestions, topicParam, difficulty, committedMarks, committedStyle, committedSource, committedDifficulty]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.altKey) return;
      if (event.key.toLowerCase() === "r") {
        event.preventDefault();
        regenerateQuestions();
        return;
      }
      const presetMap: Record<string, number> = {
        "1": 10,
        "2": 20,
        "3": 40,
        "4": 60,
        "5": 100,
      };
      const next = presetMap[event.key];
      if (!next) return;
      event.preventDefault();
      setQuestionCount(Math.max(MIN_QUESTION_COUNT, Math.min(MAX_QUESTION_COUNT, next)));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleToggleAnswer = async (id: string, q?: PracticeQuestion) => {
    const willOpen = !expandedAnswers[id];
    setExpandedAnswers((prev) => ({
      ...prev,
      [id]: willOpen,
    }));

    if (willOpen && q && !practiceSolutionData[id] && !practiceSolutionLoading[id]) {
      setPracticeSolutionLoading((prev) => ({ ...prev, [id]: true }));
      setPracticeSolutionError((prev) => ({ ...prev, [id]: undefined }));
      try {
        const result = await fetchStepSolution({
          subject: subjectKey,
          topic: topicParam || "",
          question: q.questionText,
          marks: q.marks || 1,
          type: q.format || "",
          section: q.section || "",
          answer: q.answer || "",
          explanation: q.explanation || "",
          solutionSteps: q.solutionSteps?.length ? q.solutionSteps : undefined,
          finalAnswer: q.finalAnswer || undefined,
        });
        setPracticeSolutionData((prev) => ({ ...prev, [id]: result }));
      } catch {
        setPracticeSolutionError((prev) => ({
          ...prev,
          [id]: "Solution steps are unavailable right now. You can still check your work or try again.",
        }));
      } finally {
        setPracticeSolutionLoading((prev) => ({ ...prev, [id]: false }));
      }
    }
  };

  const openMentorForQuestion = useCallback(
    (
      q: PracticeQuestion,
      idx: number,
      entryMode: "auto" | "hint" | "check_cbse",
      trigger?: EventTarget | null
    ) => {
      const strategyDetails = getQuestionStrategyDetails(q);
      const family = resolveQuestionFamily(q, strategyDetails);
      const autoIntent = deriveMentorDefaultIntent(strategyDetails?.meta || null);
      const defaultIntent =
        entryMode === "auto"
          ? autoIntent
          : entryMode === "check_cbse"
            ? "check_cbse"
            : "hint";
      setMentorSeedExample({
        title: `Q${idx + 1}`,
        questionId: String(q.id),
        question: String(q.questionText || ""),
        marks: Number(q.marks) || undefined,
        section: String(q.section || ""),
        defaultIntent,
        strategyContextHeader: buildStrategyContextHeader(strategyDetails),
        rubricContextHeader: buildRubricContextHeader(
          strategyDetails,
          defaultIntent,
          strategyCanonicalTopicKey
        ),
        questionFamilyId: family?.familyId,
        questionFamilyLabel: family?.studentLabel || strategyDetails?.meta.skillFamily,
        questionTypeId: family?.qtypeId,
        chapterStep: family?.tutorNodeId || undefined,
        practiceSectionFilter:
          family?.sectionFilter ||
          ((String(q.section || "").toUpperCase() as PracticeSectionFilter | "") || undefined),
        suggestedPracticeIds: family?.focusBankIds,
        theoremFocus: family ? [family.theoremFamily, family.skillFamily] : undefined,
        recommendedDiagramType: family?.recommendedDiagramType,
      });
      setMentorSolveStyle(defaultIntent === "check_cbse" ? "board" : "socratic");
      setMentorDrawerOpen(true);
      if (trigger instanceof HTMLElement) {
        const detailsEl = trigger.closest("details");
        if (detailsEl instanceof HTMLDetailsElement) {
          detailsEl.open = false;
        }
      }
    },
    [getQuestionStrategyDetails, resolveQuestionFamily, strategyCanonicalTopicKey]
  );

  useEffect(() => {
    if (didAutoOpenJourneyMentorRef.current) return;
    if (!journeyMentorMode || filteredQuestions.length === 0) return;
    const firstQuestion = filteredQuestions[0];
    const entryMode =
      journeyMentorMode === "check_cbse"
        ? "check_cbse"
        : journeyMentorMode === "hint"
          ? "hint"
          : "auto";
    setActiveQuestionId(String(firstQuestion.id));
    openMentorForQuestion(firstQuestion, 0, entryMode);
    didAutoOpenJourneyMentorRef.current = true;
  }, [filteredQuestions, journeyMentorMode, openMentorForQuestion]);

  const title = useMemo(() => {
    if (!rawTopicParam || rawTopicParam.toLowerCase() === "generic") {
      return `Practice - Class ${grade} ${subjectKey}`;
    }
    return `Practice - ${topicLabel}`;
  }, [rawTopicParam, topicLabel, grade, subjectKey]);

  const activeQuestion = useMemo(() => {
    if (filteredQuestions.length === 0) return null;
    if (!activeQuestionId) return filteredQuestions[0];
    const hit = filteredQuestions.find((q) => String(q.id) === String(activeQuestionId));
    return hit || filteredQuestions[0];
  }, [filteredQuestions, activeQuestionId]);

  const activeQuestionNumber = useMemo(() => {
    if (!activeQuestion) return null;
    const idx = filteredQuestions.findIndex(
      (q) => String(q.id) === String(activeQuestion.id)
    );
    return idx >= 0 ? idx + 1 : null;
  }, [filteredQuestions, activeQuestion]);

  const sessionStats = useMemo<SessionStats>(() => {
    const attemptedIds = new Set<string>([
      ...Object.keys(mcqSelections),
      ...Object.keys(selfAssessments),
    ]);
    const localMcqAnswered = Object.keys(mcqSelections).length;
    return {
      total: questions.length,
      attemptedInSet: attemptedIds.size,
      markedUnderstood: Object.values(selfAssessments).filter((r) => r === "got_it").length,
      needsAnotherLook: Object.values(selfAssessments).filter((r) => r === "need_practice").length,
      localMcqAnswered,
      localMcqCorrect: Object.values(mcqResults).filter((r) => r === "correct").length,
    };
  }, [questions.length, mcqSelections, selfAssessments, mcqResults]);

  // Scorecard trigger. `sessionFinished` (the explicit "Finish session" tap) is
  // the primary, always-available trigger; `allDone` (every question attempted)
  // is a convenience auto-offer. Either surfaces the same scorecard.
  const allDone = questions.length > 0 && sessionStats.attemptedInSet >= questions.length;
  const showScorecard =
    (sessionFinished || allDone) && questions.length > 0 && !scorecardDismissed;

  // ── The QP session record (LOCKED §1a as amended — NON-COUNTING) ───────────
  // Written when the scorecard FIRST appears, not on the "Finish session" click alone:
  // `showScorecard` is (sessionFinished || allDone), so a student who answers every
  // question reaches the scorecard WITHOUT ever tapping Finish — hanging the write off
  // the click would silently miss exactly the most-complete sessions. Either route is a
  // finish; both land here.
  //
  // Latched by session identity (the scorecard re-renders), so the write is one-shot.
  // Nothing is written before this point: an ABANDONED session allocates no id and
  // leaves no record (owner ruling), and there is no unmount/beforeunload hook — a
  // closed tab writes nothing, by design.
  useEffect(() => {
    if (!showScorecard) return;
    const displayed = committedPoolSelection.displayed;
    if (displayed.length === 0) return;
    const identityKey = `${filterSignature}::${displayed.map((q) => String(q.id)).join(",")}`;
    if (recordedSessionRef.current === identityKey) return;
    recordedSessionRef.current = identityKey;

    const entries: QuickPracticeEntry[] = displayed.map((q) => {
      const qId = String(q.id);
      return {
        questionId: qId,
        marks: Number(q.marks) || 0,
        // A graded result carries real working; a bare MCQ click carries none. Keyed
        // off which INTERACTION produced the outcome, never off `format === "mcq"` —
        // a student can submit written working for an MCQ, and that working is real.
        ...(gradedResults[qId] ? { graded: gradedResults[qId] } : {}),
        ...(mcqResults[qId] ? { mcq: mcqResults[qId] } : {}),
      };
    });

    persistQuickPracticeSession({
      user: authUserForJourney,
      title: topicLabel ? `${topicLabel} · Practice set` : "Practice set",
      subject: toSessionSubject(subjectKey),
      topicSlug: canonicalTopicKey || topicParam,
      filterSignature,
      startedAt: sessionStartedAt,
      entries,
    });
  }, [
    showScorecard, committedPoolSelection.displayed, gradedResults, mcqResults,
    authUserForJourney, topicLabel, subjectKey, canonicalTopicKey, topicParam,
    filterSignature, sessionStartedAt,
  ]);

  const activeQuestionStrategyDetails = useMemo(
    () => getQuestionStrategyDetails(activeQuestion),
    [getQuestionStrategyDetails, activeQuestion]
  );
  const activeQuestionMeta = activeQuestionStrategyDetails?.meta || null;
  const activeQuestionLearningObjects = activeQuestionStrategyDetails?.learningObjects || [];
  const whyCommonMistakes = activeQuestionStrategyDetails?.commonMistakes || [];
  const whyBoardWritingTip = activeQuestionStrategyDetails?.boardWritingTip || "";
  return (
    <div
      className="dark-page"
      style={{
        "--bg": "hsl(210, 40%, 98%)",
        "--bg-card": "#ffffff",
        "--bg-card-border": "hsl(220, 18%, 90%)",
        "--text": "hsl(220, 25%, 12%)",
        "--text-muted": "hsl(220, 15%, 42%)",
        minHeight: "100vh",
        background: "hsl(210, 40%, 98%)",
        color: "hsl(220, 25%, 12%)",
        paddingBottom: "80px",
      } as React.CSSProperties}
    >
      <div
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "28px clamp(20px, 4vw, 32px) 56px",
        }}
      >
        <nav
          aria-label="Practice context"
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 10,
            marginBottom: 18,
            fontSize: "0.8rem",
            color: "hsl(220, 15%, 42%)",
          }}
        >
          <button
            type="button"
            onClick={() => navigate(practiceBackTo)}
            style={{
              border: "1px solid hsl(220, 18%, 90%)",
              background: "#ffffff",
              color: "hsl(220, 25%, 12%)",
              borderRadius: 8,
              padding: "7px 11px",
              fontSize: "0.78rem",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
            }}
          >
            {backLabel}
          </button>
          <span aria-hidden="true">/</span>
          <span style={{ fontWeight: 700, color: "hsl(220, 25%, 12%)" }}>Practice</span>
          <span aria-hidden="true">/</span>
          <span>Class {grade} - {subjectTitle}</span>
        </nav>

        {/* Applied-band indicator (PR-E1 amendment item 6/7) — concept-row entry
            ONLY: shown when this session arrived from the Topic Hub with an exact
            mark range (conceptMarksRange). Honestly surfaces the pre-applied band
            and that it is changeable via the advanced filter. The hub entry never
            emits marksMin/marksMax, so this never renders there (neutral). */}
        {conceptMarksRange && committedMarksRange && (
          <div
            style={{
              margin: "0 0 14px 0",
              padding: "9px 13px",
              borderRadius: 10,
              background: "hsl(152, 45%, 96%)",
              border: "1px solid hsl(152, 45%, 84%)",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 8,
              fontSize: "0.78rem",
              color: "hsl(152, 45%, 26%)",
            }}
          >
            <span style={{ fontWeight: 800 }}>
              {conceptFocusLabel
                ? `Practising ${conceptFocusLabel}`
                : "Practising this concept"}
            </span>
            <span aria-hidden="true">{"·"}</span>
            <span style={{ fontWeight: 700 }}>
              {committedMarksRange.min === committedMarksRange.max
                ? `${committedMarksRange.min} marks`
                : `${committedMarksRange.min}–${committedMarksRange.max} marks`}
            </span>
            <span aria-hidden="true">{"·"}</span>
            <span style={{ fontWeight: 600, color: "hsl(220, 15%, 42%)" }}>
              edit filters to change
            </span>
          </div>
        )}

        <PracticeHero
          grade={grade}
          subjectKey={subjectKey}
          title={title}
          topicParam={topicParam}
          questionCount={questionCount}
        />

        {isTargetedSession && ((() => {
          const MISTAKE_LABEL: Record<string, string> = {
            conceptual: "Conceptual", calculation: "Calculation",
            silly: "Silly", presentation: "Presentation",
          };
          const mistakeLabel = MISTAKE_LABEL[targetMistakeType] || targetMistakeType;
          const displayTopic = topicLabel || rawTopicParam;
          return (
            <div style={{
              margin: "0 0 14px 0", padding: "12px 14px",
              borderRadius: 12, background: "hsl(215, 75%, 95%)",
              border: "1px solid hsl(215, 65%, 84%)",
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <div>
                <span style={{ fontSize: 12, fontWeight: 800, color: "hsl(215, 65%, 32%)" }}>Targeted session</span>
                <span style={{ fontSize: 12, color: "hsl(220, 25%, 12%)", fontWeight: 500 }}>
                  {" - focusing on "}
                  <strong>{displayTopic}</strong>
                  {mistakeLabel ? ` (${mistakeLabel} mistakes)` : ""}
                </span>
              </div>
            </div>
          );
        })())}

        <PracticeControls
          pendingMarks={pendingMarks}
          pendingStyle={pendingStyle}
          pendingSource={pendingSource}
          pendingDifficulty={pendingDifficulty}
          pendingCount={questionCount}
          availableCount={bankAvailableCount}
          onSetMarks={setPendingMarks}
          onSetStyle={handleSetStyle}
          onSetSource={setPendingSource}
          onSetDifficulty={(v) => {
            setPendingDifficulty(v);
            setDifficulty(v === "all" ? "All" : (v as DifficultyChoice));
          }}
          onSetCount={setQuestionCount}
          onClearFilters={handleClearFilters}
          committedMarks={committedMarks}
          committedStyle={committedStyle}
          committedSource={committedSource}
          committedDifficulty={committedDifficulty}
          committedCount={committedCount}
          onBuildSet={() => {
            trackUxEvent("practice_regenerate_click", "practice", {
              action: "build_set",
              topic: topicParam,
              subject: subjectKey,
              questionCount,
            });
            setCommittedMarks(pendingMarks);
            setCommittedStyle(pendingStyle);
            setCommittedSource(pendingSource);
            setCommittedDifficulty(pendingDifficulty);
            setCommittedMarksRange(pendingMarksRange);
            setCommittedCount(questionCount);
            setIsBuilt(true);
            regenerateQuestions();
          }}
          isBuilt={isBuilt}
          onEditFilters={handleEditFilters}
          onRegenerate={() => {
            trackUxEvent("practice_regenerate_click", "practice", {
              action: "regenerate_set",
              topic: topicParam,
              subject: subjectKey,
              questionCount,
            });
            regenerateQuestions();
          }}
          onDownloadPdf={handleDownloadWorksheet}
          onCopyLink={handleCopyLink}
          linkCopied={linkCopied}
          hasQuestions={filteredQuestions.length > 0}
          visibleQuestionCount={filteredQuestions.length}
        />

        {isWhyThisQuestionEnabled && (
          <WhyThisQuestionPanel
            isOpen={isWhyPanelOpen}
            onToggle={() => setIsWhyPanelOpen((prev) => !prev)}
            activeQuestionNumber={activeQuestionNumber}
            meta={activeQuestionMeta}
            learningObjects={activeQuestionLearningObjects}
            commonMistakes={whyCommonMistakes}
            boardWritingTip={whyBoardWritingTip}
          />
        )}

        {isBuilt && (
        <section
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: 14,
            flexWrap: "wrap",
            margin: "18px 0 12px",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "1.25rem",
                fontWeight: 600,
                letterSpacing: "-0.01em",
                color: "hsl(220, 25%, 12%)",
                margin: 0,
              }}
            >
              Practice workspace
            </h2>
            <p
              style={{
                margin: "4px 0 0",
                color: "hsl(220, 15%, 42%)",
                fontSize: "0.84rem",
                lineHeight: 1.5,
              }}
            >
              Solve in your own order. Check my answer gives real feedback;
              step solutions are for comparison and learning.
            </p>
          </div>
          {filteredQuestions.length > 0 && (
            <span
              style={{
                borderRadius: 999,
                border: "1px solid hsl(220, 18%, 90%)",
                background: "hsl(210, 33%, 96%)",
                color: "hsl(220, 15%, 42%)",
                padding: "4px 10px",
                fontSize: "0.75rem",
                fontWeight: 700,
              }}
            >
              {filteredQuestions.length} visible question{filteredQuestions.length === 1 ? "" : "s"}
            </span>
          )}
        </section>
        )}

        {isBuilt && (
        <PracticeQuestionList
          isLoading={isLoading}
          error={error}
          questions={questions}
          filteredQuestions={filteredQuestions}
          subjectKey={subjectKey}
          topicLabel={topicLabel}
          difficultyFilter={difficulty}
          expandedAnswers={expandedAnswers}
          selfAssessments={selfAssessments}
          mcqSelections={mcqSelections}
          mcqResults={mcqResults}
          practiceSolutionLoading={practiceSolutionLoading}
          practiceSolutionError={practiceSolutionError}
          practiceSolutionData={practiceSolutionData}
          onSetActiveQuestion={setActiveQuestionId}
          onToggleAnswer={handleToggleAnswer}
          onMcqSelect={(qId, oi) => setMcqSelections((prev) => ({ ...prev, [qId]: oi }))}
          onMcqResult={(qId, result) => setMcqResults((prev) => ({ ...prev, [qId]: result }))}
          onGraded={(qId, result) => setGradedResults((prev) => ({ ...prev, [qId]: result }))}
          onSelfAssessGotIt={(question) => {
            setSelfAssessments((prev) => ({ ...prev, [question.id]: "got_it" }));
            recordQuestionAnswered();
          }}
          onSelfAssessNeedPractice={(question) => {
            setSelfAssessments((prev) => ({ ...prev, [question.id]: "need_practice" }));
            recordQuestionAnswered();
          }}
          onOpenConceptDrawer={openConceptDrawer}
          onOpenMentorBoard={(question, idx) => openMentorForQuestion(question, idx, "check_cbse")}
        />
        )}

        {isBuilt && filteredQuestions.length > 0 && !showScorecard && (
          <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 8 }}>
            <button
              type="button"
              onClick={() => {
                trackUxEvent("practice_finish_session_click", "practice", {
                  topic: topicParam,
                  subject: subjectKey,
                  attempted: sessionStats.attemptedInSet,
                  total: questions.length,
                });
                setScorecardDismissed(false);
                setSessionFinished(true);
              }}
              style={{
                width: "100%",
                padding: "13px 16px",
                borderRadius: 12,
                border: "1px solid hsl(152, 45%, 32%)",
                background: "hsl(152, 45%, 32%)",
                color: "#ffffff",
                fontSize: "0.92rem",
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
              }}
            >
              Finish session
            </button>
            <p style={{ margin: 0, fontSize: "0.76rem", color: "hsl(220, 15%, 42%)", textAlign: "center", lineHeight: 1.5 }}>
              See your scorecard for what you've done so far - attempt as many or as few as you like.
            </p>
          </div>
        )}

{(() => {
  if (!showScorecard) return null;
  // Quick Practice variant of the Universal <ResultsScorecard> (§2.1): "X of N
  // attempted" (never marks/total), honest empty state, NO graded-sheet download, a
  // personalized what-next menu. Figures come from existing session state (no new
  // plumbing); Quick Practice writes NO session record (LOCKED §1a) — this only
  // DISPLAYS. Reuses the #249 finish-session trigger above.
  const topicK = canonicalTopicKey || topicParam;
  const back = { state: { back: location.pathname + location.search, backLabel: "Back to practice" } };
  return (
    <ResultsScorecard
      variant={quickPracticeScorecardVariant({
        attempted: sessionStats.attemptedInSet,
        totalInSet: questions.length,
        mcqAnswered: sessionStats.localMcqAnswered,
        mcqCorrect: sessionStats.localMcqCorrect,
        allDone,
        // A manual Finish on a partial set must not trap the student — let them
        // return to the same set. The builder omits this on the allDone auto-offer.
        onKeepPracticing: () => setSessionFinished(false),
        onFreshSet: () => regenerateQuestions(),
        onChapterTest: () => navigate(`/chapter-test/${grade}/${subjectKey}/${topicK}`, back),
        onPredicted: () => navigate(`/highly-probable/${grade}/${subjectKey}?topic=${encodeURIComponent(topicK)}`, back),
        onStudy: () => navigate(`/topic-hub/${grade}/${subjectKey}/${topicK}`, back),
      })}
      onClose={() => {
        setScorecardDismissed(true);
        setSessionFinished(false);
      }}
    />
  );
})()}

<MentorSolveDrawer
  open={mentorDrawerOpen}
  onClose={() => setMentorDrawerOpen(false)}
  seed={mentorSeedExample}
  solveStyle={mentorSolveStyle}
  grade={Number(grade)}

  subjectTitle={subjectTitle}
  topicKey={canonicalTopicKey}
/>

      {conceptDrawerContext && (
        <Suspense fallback={null}>
          <ConceptTeachDrawer
            open={conceptDrawerOpen}
            onClose={() => setConceptDrawerOpen(false)}
            context={conceptDrawerContext}
          />
        </Suspense>
      )}
      </div>
    </div>
  );
};

export default PracticePage;
