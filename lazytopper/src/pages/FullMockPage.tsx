// src/pages/FullMockPage.tsx
//
// FULL MOCK — built to LazyTopper_FullMock_Design_Spec_LOCKED_2026-07-09 +
// mockup v1, inheriting the merged Chapter Test (#374/#380) and building only
// the DELTAS: whole-subject board paper (A–E, ~38Q/80mk) · DUAL-SOURCE draw
// (predicted + canonical via fullMockBlueprint → drawBalancedSet) · ALWAYS-ON
// 3-hour PERSISTED WALL-CLOCK timer (§8a — startedAt + durationMs, remaining
// computed from Date.now(); never a ticking counter that dies with the tab) ·
// per-interaction autosave + resume + guarded exit · §8b focus aggregates ·
// subject-scoped history OVERLAY panel + pending banner (worksheet pattern) ·
// scorecard with the section AND chapter lenses. TS-BOARDSCORE-1 (owner ruling 23 Nov 2026, superseding the old
// "NO board-readiness projection"): a fully graded 80-mark paper also shows the full-paper line, the trend across the
// student's own full tests and a labelled board ESTIMATE range (lib/fullmock/boardEstimate.ts).
//
// Reused byte-unchanged: ChapterTestNavigator, PreSubmitConfirm +
// ChapterTestUploadPanel (additive copy props only), scoreObjectiveSection +
// buildChapterTestResponse (via fullMockGradeService), the shared grader, the
// Universal <ResultsScorecard>, the worksheet PDF exporters, and CT_CSS (the
// page renders inside `.lt-ct.lt-fm`; FM_CSS carries only the deltas).
// ONE responsive component — pure-CSS reflow, 360px verified.

import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { trackUxEvent } from "../services/uxTelemetry";
import { PageGuide } from "../components/guide/pages/pageGuides";
import { PreTestSlot } from "../components/guide/pages/preTestSlot";
import { MathText } from "../components/question/MathText";
// LOW-END-1: maths on the first screen — KaTeX up front, never a plain-text stand-in.
import "../components/question/katexEager";
import { QuestionVisualAid } from "../components/question/QuestionVisualAid";
import type { WorksheetGradeResponse } from "../ai/aiClient";
import {
  coachingLine as sharedCoachingLine,
  effectivePaperCounts,
  isQuestionNotAttempted,
  gradeStateOf,
  pendingBreakdown,
  paperMarksLost,
} from "../lib/mistakeDisplay";
import type { PersistedWorksheet } from "../services/worksheetSessionStore";
import {
  getSessionRecordsFromCloud,
  getSessionPerQuestion,
  mintUniqueFullMockNomenclature,
  nameForCode,
  onRecordRelocated,
  RecordCodeCheckError,
  RECORD_CODE_CHECK_FAILED_LINE,
  buildFullMockSessionRecord,
  type SessionRecord,
  type SessionSubject,
  type SessionFocusAggregates,
} from "../services/sessionRecords";
import { scoreObjectiveSection, type ObjectiveScore } from "../services/chapterTestGradeService";
import {
  buildFullMockResponse,
  writeFullMockPartialRecord,
  gradeFullMockUpload,
  markFullMockQuestion,
} from "../services/fullMockGradeService";
import { MARK_ON_PHOTO_ACTION, MARK_STILL_UNREAD_COPY, bankMarkableRows, markErrorMessage, uploadedPhotoPages } from "../services/markOnPhoto";
import {
  saveFullMockPaperSnapshot,
  fetchFullMockPaperSnapshot,
  deleteFullMockPaperSnapshot,
  type FullMockPaperSnapshot,
} from "../services/fullMockPaperStore";
// AWAIT-1-PAPERS — a downloaded paper is kept, its code shown, and Section A tapped in at upload.
import {
  CONTINUED_ELSEWHERE_LINE,
  STATUS_UNKNOWN_LINE,
  picksMayContinue,
  readPaperRecordStatus,
  recordPaperDownload,
} from "../components/papers/paperDownloadRecord";
import PaperDownloadedNote from "../components/papers/PaperDownloadedNote";
import PassOwnerOfferLazy from "../components/passOwnerOffers/PassOwnerOfferLazy";
import SectionAPicker from "../components/papers/SectionAPicker";
import {
  FM_DURATION_MS,
  blueprintRowArithmetic,
  drawFullMock,
  fullMockObjectiveQuestions,
  fullMockSubjectiveQuestions,
  type DrawnFullMock,
  type FMSubject,
} from "../components/fullmock/fullMockBlueprint";
import { CbqShareNote } from "../lib/cbq/CbqShareNote";
import { claimNewPaperView, NEW_PAPER_LIMIT_LINE, NEW_PAPER_LIMIT_SAVED_LINE } from "../components/auth/MockViewGate";
import { useSubscription } from "../hooks/useSubscription";
import { useLimitedDownload } from "../hooks/useLimitedDownload";
import LimitChip from "../components/limits/LimitChip";
import {
  attemptsLogged,
  freshnessLine,
  loadServedLog,
  mintDrawSeed,
  recordServed,
  servedAtFor,
  servedOwner,
  type ServedAt,
} from "../lib/freshSet/servedHistory";
import {
  saveFullMockSession,
  loadFullMockSession,
  clearFullMockSession,
  findInProgressSession,
  fullMockJobStore,
  listFullMockSessions,
  remainingMs,
  formatRemaining,
  type FullMockSessionState,
} from "../components/fullmock/fullMockSession";
import {
  useFocusAggregates,
  EMPTY_FOCUS,
} from "../components/fullmock/useFocusAggregates";
import {
  fullMockScorecardVariant,
  deriveFullMockChapterLens,
  biggestMistakeLossRow,
  fullMockFocusLine,
  withPaperTutorAsks,
  withGuideTarget,
  withMarkOnPhoto,
  type ScorecardTutorAsk,
  withSaleMock,
  withSeriesWorksheet,
} from "../components/results/scorecardVariants";
// FOLLOWUPS-1 B — the scorecard's tutor hop + the tutor's return to THIS saved scorecard.
import { trackOnboardingEvent } from "../analytics/analytics";
import { buildTutorPath } from "./tutor/tutorPath";
import {
  SCORECARD_REVIEW_PARAM,
  recordBelongsToUid,
  savedPaperQuestionHop,
  searchWithoutReview,
  withScorecardReviewParam,
} from "./tutor/tutorRoundTrip";
import { getSurfaceHistory } from "../services/progressStore";
import { bankRowMeta } from "../data/bankChapters/bankIdIndex";
import { resolveCanonicalSlug } from "../data/syllabus/canonicalTopicSlug";
// BANK-LEAN-1 (C3): the stored re-open chapter join reads the question bank, so it
// lives in scorecardBankLenses — scorecardVariants stays bank-free.
import {
  storedFullMockScorecardVariant,
  deriveStoredFullMockChapterLens,
} from "../components/results/scorecardBankLenses";
import ResultsScorecard, { revealGradedSheet } from "../components/results/ResultsScorecard";
import { useDetailLock } from "../components/results/useDetailLock";
import { downloadStoredPaperGradedSheet, hasStoredPaperSheet } from "../services/storedPaperGradedSheet";
import { exportWorksheetPdf, exportGradedWorksheetPdf } from "../components/worksheet/worksheetPdfExport";
import { GRADED_SHEET_KIND } from "../components/worksheet/WorksheetGradedPrintDoc";
import { buildDesktopWorksheetPath } from "../lib/desktop/navigation";
import { formatScoreNumber } from "../components/results/scoreNumber";
import { buildBoardScoreView, fullTestScores } from "../lib/fullmock/boardEstimate";
import { paperMarksScore, resultCardParts } from "../components/results/scoreTotals";
import { boardEstimateDisabled } from "../lib/fullmock/boardEstimateFlag";
import { CT_CSS } from "../components/chaptertest/chapterTestStyles";
import NotFoundAddPageLine from "../components/chaptertest/NotFoundAddPageLine";
import { ADD_PAGES_UPLOAD_BANNER, ADD_PAGES_USES_CHECK_LINE, notCountedReasonOf, notFoundSummary } from "../lib/notFoundNotAttempted";
import { FM_CSS } from "../components/fullmock/fullMockStyles";
// TS-FREE-SIGNEDOUT — a signed-out visitor sits a Test Series paper; sign-in is asked for only to get it marked.
import SignInToMarkCard from "../components/testSeries/SignInToMarkCard";
import TimeUpSubmitCard from "../components/testSeries/TimeUpSubmitCard";
import {
  SIGNED_OUT_ATTEMPT_RESTORED_LINE,
  SIGNED_OUT_TAKING_NOTE,
  clearSignedOutAttempt,
  paperQuestionIds,
  readSignedOutAttempt,
  saveSignedOutAttempt,
  signInToMarkPath,
  SIGNED_OUT_ATTEMPT_KEPT_LINE,
  isSignedOutSample,
  tsFreeSignedOutDisabled,
  type SignedOutAttempt,
} from "../lib/testSeries/signedOutAttempt";
import ChapterTestNavigator from "../components/chaptertest/ChapterTestNavigator";
import ChapterTestUploadPanel from "../components/chaptertest/ChapterTestUploadPanel";
import PreSubmitConfirm from "../components/chaptertest/PreSubmitConfirm";
import FullMockHistoryPanel from "../components/fullmock/FullMockHistoryPanel";
import { useQuestionTimes } from "../components/testAnalysis/questionTimes";
import { FULL_MOCK_SECONDS_PER_MARK } from "../components/testAnalysis/testAnalysisModel";
// TS-ANALYSIS-1 — after-test analysis, its own chunk, mounted at the END of the results body.
const TestAnalysisPanel = lazy(() => import("../components/testAnalysis/TestAnalysisPanel"));
// MARK-ON-PHOTO-2 — the "Mark it on your photo" dialog, its own chunk (fetched on the first tap).
const MarkOnPhotoDialog = lazy(() => import("../components/checkimprove/MarkOnPhoto").then((m) => ({ default: m.MarkOnPhotoDialog })));
import FullMockPendingBanner from "../components/fullmock/FullMockPendingBanner";
import { pendingMockRecords } from "../components/fullmock/pendingMocks";
// FAIR-USE-UI-1 — the fair-use panel (UI1 at grading, UI3 before the mock starts).
// Dark unless /api/usage/me says `enforced: true`: with it off this page is unchanged.
import FairUseLimitPanel from "../components/usage/FairUseLimitPanel";
import UsageWarning from "../components/usage/UsageWarning";
import { useFairUse } from "../components/usage/useFairUse";
// FAIRUSE-TS-OWNER-1 - who the trial paper wall is not for (a Board Pass holder; a Test Series owner on a series paper).
import { paperWallVerdict, tsOwnerWallExemptDisabled } from "../components/usage/fairUseGate";
import { isPaidPremium } from "../services/subscriptionService";
import { gradingErrorMessage, gradingStageLabel, type GradingStage } from "../ai/gradingTransport";
import { UpgradeSheet } from "../components/subscription/UpgradeSheet";
import { isPremiumRequiredRefusal, isTrialLimitRefusal } from "../components/limits/limitsCopy";
import { resumableJob, type GradingJobInterruptedError } from "../ai/gradingJobs";
import GradingJobRows from "../components/grading/GradingJobRows";
import { useGradingJob } from "../components/grading/useGradingJob";
import { useBankSubject } from "../data/bankChapters/useBankChapters";
import { useScrollTopOnChange } from "../hooks/useScrollTopOnRouteChange";
import { ACCESS_CHECKING_LINE, ACCESS_FAILED_LINE, AccessChecking, AccessFailed, DownloadWithPlanLink, FreeTestNote, ResultAccessSlot, SeriesOwnerNotice, SeriesOfferButtons, SeriesStartWall, TutorBoardPassWall, WrittenCheckUpgradeCard, seriesFreeTestWritten, useBoardPassHolder, useSeriesAccess, SeriesChecksLeftLine } from "../components/testSeries/WrittenCheckGate";
import { FREE_TESTS_ALLOWED, countTestsTaken, isBeforeSeriesRules, scorecardUploadNotAllowed, seriesStartDecision } from "../lib/testSeries/seriesAccess";
import SeriesCrumb from "../components/testSeries/SeriesCrumb";
import { TEST_SERIES_NAV_PATH, seriesPaperBackTarget, seriesPaperPath, tsNavDisabled, withSeriesReturn } from "../lib/testSeries/seriesNav";
import { FM_PAPER_PARAM, fullMockSeriesLabel, seriesMockNumber, seriesMockWorksheetId, seriesPaperKeyOfWorksheetId } from "../lib/testSeries/testSeries";
import { FOCUS_PARAM, focusSectionsLabel, focusSetCodeOfWorksheetId, focusSetLabel, focusSetOf, focusSetWorksheetId } from "../lib/testSeries/focusSets";
import { useDerivedWrittenGraded } from "../hooks/useDerivedWrittenGraded";

// "pick" (AWAIT-1): a downloaded paper's Section A picks, before its upload step.
type Phase = "setup" | "taking" | "results" | "pick";

const SECTION_HEAD: Record<string, string> = {
  A: "Section A · Objective · 1 mark each",
  B: "Section B · Very short answer · 2 marks",
  C: "Section C · Short answer · 3 marks",
  D: "Section D · Long answer · 5 marks",
  E: "Section E · Case-based · 4 marks",
};

/** Bar segment grow class (lt-fm__g1..g20) for a unit: its marks scaled so the largest
 *  unit is g20 — proportional across the bar (presentation only). */
function unitBarGrow(marks: number, units: ReadonlyArray<{ target: number }>): number {
  const max = units.reduce((m, u) => Math.max(m, u.target), 1);
  return Math.max(1, Math.min(20, Math.round((marks / max) * 20)));
}

/** The weightage-bar palette (presentation only — cycled by index). */
const WBAR_CLASSES = 8;

function subjectFromParam(raw: string): FMSubject {
  return raw?.toLowerCase().includes("science") ? "Science" : "Maths";
}
function mintFullMockId(): string {
  return `fm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
/** Product-voice coaching line for the graded PDF (mirrors the CT page's local
 *  helper — a page-level presentation string, not shared logic). */
/** TS-BOARDSCORE-1 - a re-opened result's paper for the board view: out of the paper's full marks (owner ruling 23 Nov 2026,
 *  19:59 IST). With the stored payload, its own full/graded totals; without it, the record (a graded record is fully marked). */
function reopenBoardPaper(record: SessionRecord, response: WorksheetGradeResponse | null | undefined) {
  if (response) {
    const ps = paperMarksScore(response);
    return { awarded: record.marksAwarded, total: ps.total, pendingCount: Number(response.pendingCount) || 0, notMarkedMarks: ps.notMarked?.marks ?? 0 };
  }
  return { awarded: record.marksAwarded, total: record.marksTotal, pendingCount: record.status === "graded" ? 0 : 1 };
}

function coachingLine(resp: WorksheetGradeResponse): string {
  // SCORECARD-MI-1 — the ONE coaching function (lib/mistakeDisplay): owner's groups, counts in
  // mistakes, and never "Clean" while marks were lost (GA-24).
  return sharedCoachingLine({
    marksAwarded: resp.gradedMarksAwarded,
    marksTotal: resp.gradedMarksTotal,
    counts: effectivePaperCounts(resp.results),
    // SCORECARD-MI-1 PR-2 (B7) — in MARKS when the grade carries them (else counts, unit-labelled).
    marks: paperMarksLost(resp.results)?.byType ?? null,
    mismatchCount: resp.results.filter((r) => gradeStateOf(r) === "answer-mismatch").length,
    notGradedCount: pendingBreakdown(resp.results, resp.pendingCount).notGraded,
    pendingCount: resp.pendingCount,
    notAttemptedCount: resp.results.filter((r) => isQuestionNotAttempted(r)).length,
    practiseWhat: "the chapters that cost you marks",
  });
}

/** The active mock — a fresh draw or a resumed/rehydrated session. */
interface ActiveMock {
  paper: PersistedWorksheet;
  code: string;
  name: string;
  startedAt: number;
  durationMs: number;
  pyqCount?: number;
  freshCount?: number;
}

export default function FullMockPage() {
  const params = useParams<"grade" | "subject">();
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();

  const grade = params.grade || "10";
  const subject = subjectFromParam(params.subject || sp.get("subject") || "Maths");
  const sessionSubject: SessionSubject = subject === "Science" ? "science" : "maths";
  // TEST-SERIES-1 — `?paper=<n>` opens series Full Mock #n: the SAME paper as PDF Mock #n, for every student.
  // Kill switch: VITE_TEST_SERIES_DISABLED=1 (the param is then ignored and the fresh mock opens, as before).
  const seriesN = import.meta.env?.VITE_TEST_SERIES_DISABLED === "1" ? null : seriesMockNumber(sp.get(FM_PAPER_PARAM));
  // TS-THEMES-1 — `?focus=FS-M-LA-1` opens a Test Series FOCUS SET (a short one-question-type paper, pinned) on this page: the same
  // grading, access rules and server admission as a series Full-Length Test. A `?paper=` wins; VITE_TS_FOCUS_SETS_DISABLED (inside
  // focusSetOf) or VITE_TEST_SERIES_DISABLED -> the param is ignored and the ordinary fresh mock opens.
  const focusSet = seriesN !== null || import.meta.env?.VITE_TEST_SERIES_DISABLED === "1" ? null : focusSetOf(sp.get(FOCUS_PARAM), subject);
  const onSeriesPaper = seriesN !== null || focusSet !== null;
  // TS-NAV-2 (owner, 25 Nov 2026) - ONE name per paper: on a series paper the page and the record it saves name the PAPER
  // ("Maths · Full-Length Test 2"; a focus set "Maths · Long answers · Set 2"), never the student's personal attempt count
  // ("Maths · Mock #3"). The record CODE (FM-M-03) is unchanged; old records keep their names; a non-series mock is unchanged.
  // Kill switch VITE_TS_NAV2_DISABLED -> the personal name, as before.
  const tsNav2Off = (() => {
    const v = import.meta.env?.VITE_TS_NAV2_DISABLED;
    return typeof v === "string" && !["", "0", "false"].includes(v.trim().toLowerCase());
  })();
  const seriesPaperName = tsNav2Off ? null : seriesN !== null ? `${subject} · Full-Length Test ${seriesN}` : focusSet ? `${subject} · ${focusSet.themeTitle} · Set ${focusSet.n}` : null;
  const isSignedIn = !!user?.uid && !user?.isLocalSession;
  // TS-FREE-SIGNEDOUT (owner ruling 26 Nov 2026, 19:23 IST): a SIGNED-OUT visitor may open and sit a Test Series paper (a full-length
  // test or a focus set); the account is asked for only at "get my answers marked". Nothing is marked, written or recorded signed out.
  // Kill switch VITE_TS_FREE_SIGNEDOUT_DISABLED.
  // Owner decision (26 Nov ~20:10 IST): only the fixed signed-out SAMPLE papers (SIGNED_OUT_SAMPLE_CODES: Full-Length Test 1 of each
  // subject) open signed out; every other paper and every focus set keeps the sign-in-first path.
  const signedOutSitting =
    !isSignedIn && seriesN !== null && !focusSet && isSignedOutSample(`FM-${subject === "Science" ? "S" : "M"}${seriesN}`) && !tsFreeSignedOutDisabled();
  const fairUse = useFairUse("full-mock", isSignedIn);
  // CT-RESUME-2: premium is unlimited on the daily paper gate — read live (see ChapterTestPage).
  const { isPremium, status: subscriptionStatus } = useSubscription();
  const paidPremium = isPaidPremium(subscriptionStatus);
  // TEST-SERIES-1 (owner ruling 18 Nov 19:31 IST) — written-answer checking and the paper download need the Test Series or the Board Pass here.
  // TS-PACK-1: a signed-in Test Series Pack owner gets through too (ownsTestSeries from /api/packs/mine).
  // MYPACKS-TS-1: three-state (checking / failed / decided); downloads also open for a PDF pack that covers this subject's mocks.
  const seriesAccess = useSeriesAccess(user?.uid ?? null, { kind: "full-mock", subject: subject === "Science" ? "science" : "maths" });
  const seriesPaperAccess = seriesAccess.canCheck;
  // LIVE-FIX-1 (live run 23 Nov 2026): on a Test Series paper the fair-use panel offers the Test Series beside its Board Pass - only
  // once access is DECIDED and the account can't check (a Board Pass holder or a Test Series owner never sees it; the panel itself
  // also draws it on a trial refusal only).
  const fairUseSeriesOffer =
    onSeriesPaper && !seriesAccess.checking && !seriesAccess.failed && !seriesAccess.canCheck ? <SeriesOfferButtons testIdPrefix="fair-use" only="test-series" showTotal /> : null;
  const seriesDownloadAccess = seriesAccess.canDownload;
  // FAIRUSE-TS-OWNER-1: the trial paper wall is never drawn for a Board Pass holder, nor for a Test Series owner on a series
  // paper / focus set (the server mints both without the trial limit). `seriesPaper` is decided by the caller (this page's URL,
  // or the saved paper's worksheetId on the continue path). Kill switch VITE_FAIRUSE_TS_OWNER_EXEMPT_DISABLED.
  const wallVerdictFor = useCallback(
    (seriesPaper: boolean) =>
      paperWallVerdict({
        disabled: tsOwnerWallExemptDisabled(),
        paidPremium,
        seriesPaper,
        ownsSeries: seriesAccess.ownsSeries,
        checking: seriesAccess.checking,
        failed: seriesAccess.failed,
      }),
    [paidPremium, seriesAccess.ownsSeries, seriesAccess.checking, seriesAccess.failed],
  );
  // FAIRUSE-TS-OWNER-1: a Test Series owner on a series paper never downloads against the weekly count (limits.cjs), and a Board
  // Pass holder is not metered - so the LIMITS-1 "first download is free" chip is not theirs to read.
  const hideDownloadChip = !tsOwnerWallExemptDisabled() && (paidPremium || (onSeriesPaper && seriesAccess.ownsSeries));
  // TEST-SERIES-1 (owner 19:44 IST): one test in total for free / trial; the scorecard's tutor entry is Board Pass only.
  const boardPassHolder = useBoardPassHolder();
  const [startWall, setStartWall] = useState(false);
  const [tutorWall, setTutorWall] = useState(false);
  const sessionUid = user?.uid ?? null;
  // TS-NAV-1 — a Test Series paper's parent is /test-series, not Practice (kill switch VITE_TS_NAV_DISABLED -> Practice, as before).
  const seriesNavOn = onSeriesPaper && !tsNavDisabled();
  // TS-UX-SCORE-1: a paper opened from the Practice-hub chooser carries a safe `returnTo` and Back leads there; else /test-series.
  const seriesBack = seriesPaperBackTarget(location.search);
  const backTo = seriesNavOn ? seriesBack.to : "/practice-hub";
  const backWord = seriesNavOn ? seriesBack.word : "Practice";
  // This paper's own URL (`?paper=<n>` kept, one-shot review/upload dropped): where a link that leaves the paper returns to.
  const seriesPaperUrl = seriesNavOn ? seriesPaperPath(location.pathname, location.search) : null;

  // ── Records (history panel · pending banner · durable #NN) ──────────────────
  const [records, setRecords] = useState<SessionRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(true);
  // RECORD-SAFE-1: the code could not be checked against the student's saved papers; mintNonce retries.
  const [codeCheckFailed, setCodeCheckFailed] = useState(false);
  const [mintNonce, setMintNonce] = useState(0);
  const loadRecords = useCallback(async () => {
    try {
      const all = await getSessionRecordsFromCloud(user?.uid);
      setRecords(all);
      return all;
    } catch {
      setRecords([]);
      return [] as SessionRecord[];
    }
  }, [user?.uid]);

  const [nomen, setNomen] = useState<{ code: string; name: string } | null>(null);
  const [drawNonce] = useState(0);
  // FRESH-SET-TESTS — the served history + seed, snapshotted with each nomenclature mint (mount,
  // and the re-mint after a submit) so a drawn paper never changes under the student.
  const [freshInputs, setFreshInputs] = useState<{ servedAt: ServedAt; seed: number } | null>(null);
  const servedOwnerId = servedOwner(isSignedIn ? user?.uid : null);
  const snapshotFresh = (all: SessionRecord[], seq: number) => {
    const log = loadServedLog(servedOwnerId);
    setFreshInputs({
      servedAt: servedAtFor({ surface: "full-mock", records: all, log }),
      seed: mintDrawSeed({
        owner: servedOwnerId,
        surface: "full-mock",
        scope: sessionSubject,
        attempt: seq + attemptsLogged(log, "full-mock", sessionSubject),
      }),
    });
  };

  useEffect(() => {
    let live = true;
    (async () => {
      setRecordsLoading(true);
      const all = await loadRecords();
      if (!live) return;
      // RECORD-SAFE-1: checked against the student's real records and saved papers; unknown -> mint nothing.
      let nm: Awaited<ReturnType<typeof mintUniqueFullMockNomenclature>>;
      try {
        nm = await mintUniqueFullMockNomenclature(sessionSubject, all, user);
      } catch (error) {
        if (!(error instanceof RecordCodeCheckError)) console.warn("[FullMockPage] code mint failed", error);
        if (!live) return;
        setCodeCheckFailed(true);
        setRecordsLoading(false);
        return;
      }
      if (!live) return;
      setCodeCheckFailed(false);
      snapshotFresh(all, nm.sequence);
      setNomen({ code: nm.code, name: nm.name });
      setRecordsLoading(false);
    })();
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, sessionSubject, mintNonce]);

  const mockRecords = useMemo(
    () => records.filter((r) => r.surface === "full-mock").sort((a, b) => b.gradedAt - a.gradedAt),
    [records],
  );
  // RESULT-LIST-BACKFILL-1: the DISPLAY copy for the history panel and the awaiting banner - a pre-#1802 partial
  // whose stored payload proves the written sheet was graded is not "awaiting" (read-time only; nothing is written).
  const listedMockRecords = useDerivedWrittenGraded(mockRecords, isSignedIn ? user?.uid : null);

  // ── The fresh draw (only for a NEW mock; resume restores its own paper) ─────
  // BANK-SPLIT-1 PR-2 (L4): the draw reads every chapter of this subject from the
  // per-chapter cache, so it waits until they have loaded ("Building your mock…").
  const bank = useBankSubject(subject);
  // TEST-SERIES-1 — the series paper is drawn by the pack's own code (lazy chunk, after a paint so "Building your mock…" shows).
  // A paper that cannot be drawn falls back to the ordinary fresh mock rather than a blank page.
  // TS-PIN-1 - the paper is built from its PINNED question ids (seriesFullMock.buildSeriesFullMock); `missingIds` are pinned ids that no
  // longer exist anywhere (left out, never swapped). VITE_TS_PIN_DISABLED / no pinned entry -> today's seeded draw.
  // TS-THEMES-1: a focus set rides the same state (its own builder, lazy chunk) and carries its own time limit (`durationMs`).
  const [series, setSeries] = useState<{ key: string; drawn: DrawnFullMock | null; failed: boolean; missingIds: string[]; durationMs?: number } | null>(null);
  const seriesKey = nomen && (seriesN || focusSet) ? `${nomen.code}|${subject}|${seriesN ?? focusSet?.code}` : null;
  useEffect(() => {
    if (!seriesKey || !nomen || !(seriesN || focusSet) || !bank.ready) return undefined;
    let live = true;
    const timer = setTimeout(() => {
      const build: Promise<{ drawn: DrawnFullMock; missingIds: string[]; durationMs?: number } | null> = focusSet
        ? import("../lib/testSeries/pinnedFocusSet").then((m) =>
            m.buildFocusSet(focusSet, {
              worksheetId: focusSetWorksheetId(mintFullMockId(), focusSet),
              code: nomen.code,
              name: seriesPaperName ?? nomen.name,
            }),
          )
        : import("../lib/testSeries/seriesFullMock").then((m) =>
            m.buildSeriesFullMock(subject, seriesN as number, {
              worksheetId: seriesMockWorksheetId(mintFullMockId(), subject, seriesN as number),
              code: nomen.code,
              name: seriesPaperName ?? nomen.name,
            }),
          );
      build
        .then((r) => {
          if (!live) return;
          setSeries({ key: seriesKey, drawn: r ? r.drawn : null, failed: !r, missingIds: r ? r.missingIds : [], ...(r?.durationMs ? { durationMs: r.durationMs } : {}) });
        })
        .catch(() => {
          if (live) setSeries({ key: seriesKey, drawn: null, failed: true, missingIds: [] });
        });
    }, 0);
    return () => {
      live = false;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seriesKey, bank.ready]);
  const seriesState = series && series.key === seriesKey ? series : null;
  const seriesActive = onSeriesPaper && !seriesState?.failed;
  // TS-THEMES-1: the focus set is what is on screen (not its fresh-mock fallback).
  const focusActive = !!focusSet && seriesActive;
  // TS-NAV-2: the name on screen and on the NEXT record - the paper's name while the series paper is what is drawn (its fresh-mock
  // fallback keeps the personal name).
  const paperName = seriesActive && seriesPaperName ? seriesPaperName : nomen?.name;
  const freshDraw: DrawnFullMock | null = useMemo(() => {
    if (!nomen || !bank.ready || seriesActive) return null;
    return drawFullMock({
      subject,
      grade,
      worksheetId: mintFullMockId(),
      code: nomen.code,
      name: nomen.name,
      // FRESH-SET-TESTS — a seeded paper (owner + attempt + clock, never Math.random) that
      // draws questions this student has not had in an earlier mock first.
      seed: freshInputs?.seed ?? mintDrawSeed({ owner: servedOwnerId, surface: "full-mock", scope: sessionSubject, attempt: 0 }),
      servedAt: freshInputs?.servedAt,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nomen, bank.ready, subject, grade, drawNonce, seriesActive]);
  const draw: DrawnFullMock | null = seriesActive ? seriesState?.drawn ?? null : freshDraw;

  // ── Test-taking state ────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>("setup");
  useScrollTopOnChange(phase); // SCROLL-TOP-1 — each phase/view opens at the top
  const [activeMock, setActiveMock] = useState<ActiveMock | null>(null);
  // TS-FREE-CHECK-1 (owner ruling 23 Nov 2026): a free / trial account's ONE free test includes written-answer checking on a Test
  // Series paper - this paper's key (the sitting's, else the series paper opened) against the server's free-test pin + the
  // one-test rule's records. The SERVER pins the free paper and refuses every other one; this only decides what the page SHOWS.
  const freeTestPaperKey =
    seriesPaperKeyOfWorksheetId(activeMock?.paper.worksheetId) ??
    (seriesN !== null
      ? seriesPaperKeyOfWorksheetId(seriesMockWorksheetId("fm-0-0", subject === "Science" ? "Science" : "Maths", seriesN))
      : // TS-THEMES-1: a focus set can be the free test too (its server key "TS-FS-M-LA-1").
        focusSet
        ? seriesPaperKeyOfWorksheetId(focusSetWorksheetId("fm-0-0", focusSet))
        : null);
  const freeWritten = isSignedIn && seriesFreeTestWritten(seriesAccess, freeTestPaperKey, records);
  // RECORD-SAFE-1: when a record had to be saved under a different code than the paper was drawn with (that code
  // belonged to another paper), the sitting follows it - scorecard, graded sheet, detail lock, delta line and
  // downloads all read `activeMock.code`.
  const adoptFmCode = useCallback((savedCode: string | undefined, a: { code: string; name: string; paper: PersistedWorksheet }): { code: string; name: string } => {
    if (!savedCode || savedCode === a.code) return { code: a.code, name: a.name };
    const next = { code: savedCode, name: nameForCode(a.name, savedCode) };
    setActiveMock((m) => (m && m.paper.worksheetId === a.paper.worksheetId ? { ...m, ...next } : m));
    return next;
  }, []);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [flags, setFlags] = useState<Set<number>>(new Set());
  const [currentQNumber, setCurrentQNumber] = useState(1);
  const [focusSeed, setFocusSeed] = useState<SessionFocusAggregates>(EMPTY_FOCUS);
  // TS-FREE-SIGNEDOUT: the signed-out visitor submitted (or the clock ran out) - the sign-in card in place of the paper.
  const [signInAsk, setSignInAsk] = useState<{ timeUp: boolean } | null>(null);
  // TS-FREE-SIGNEDOUT: the kept signed-out attempt for this paper, back after sign-in (used, then cleared, when the paper starts).
  const [signedOutKept, setSignedOutKept] = useState<SignedOutAttempt | null>(null);
  // TS-FREE-SIGNEDOUT (review blocker): THIS sitting was started signed out - latched at Start, never re-derived from the live auth
  // state, so an account that appears mid-sitting (a sign-in in another tab) can never submit a paper its start rules never ran for.
  const signedOutLatch = useRef(false);
  // review nit (a): a kept sitting whose time had run out opens at its submit step - the clock does not auto-submit it.
  const noAutoSubmitRef = useRef(false);
  // review nit 1 (PR #1897): ...and its answers are LOCKED - the time-up card stands in place of the paper (no option, flag or
  // question is rendered), so nothing can be changed past time; the student taps submit to get it marked.
  const [timeUpLocked, setTimeUpLocked] = useState(false);
  const signedOutRestoreDone = useRef(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [nowTick, setNowTick] = useState(() => Date.now());

  // Latest values for the autosave writer (avoids stale closures in callbacks).
  const answersRef = useRef(answers);
  // RECORD-SAFE-1 (D): a record that had to move to a free code takes the page, the device session and the server
  // paper copy with it. Called with the code the page holds NOW, so a record that moves twice ends on the final one.
  const moveFmPaper = useCallback(
    (from: string, to: string, a: ActiveMock, obj: ObjectiveScore, focus: SessionFocusAggregates) => {
      const eff = adoptFmCode(to, a);
      const sess = loadFullMockSession(sessionUid, from);
      if (sess) {
        saveFullMockSession(sessionUid, { ...sess, code: eff.code, name: eff.name });
        clearFullMockSession(sessionUid, from);
      }
      saveFullMockPaperSnapshot(user, {
        code: eff.code,
        name: eff.name,
        subject,
        grade,
        paper: a.paper,
        startedAt: a.startedAt,
        durationMs: a.durationMs,
        objective: obj,
        focus,
        pyqCount: a.pyqCount,
        freshCount: a.freshCount,
      });
      deleteFullMockPaperSnapshot(user, from, a.paper.worksheetId);
    },
    [adoptFmCode, sessionUid, user, subject, grade],
  );
  const flagsRef = useRef(flags);
  const currentQRef = useRef(currentQNumber);
  const focusRef = useRef<SessionFocusAggregates>(EMPTY_FOCUS);
  const phaseRef = useRef(phase);
  const activeRef = useRef<ActiveMock | null>(null);
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);
  useEffect(() => {
    flagsRef.current = flags;
  }, [flags]);
  useEffect(() => {
    currentQRef.current = currentQNumber;
  }, [currentQNumber]);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  useEffect(() => {
    activeRef.current = activeMock;
  }, [activeMock]);

  /** §8a autosave — the WHOLE session state (incl. the paper) per interaction. */
  const persistTaking = useCallback(() => {
    const a = activeRef.current;
    if (!a || phaseRef.current !== "taking") return;
    // TS-FREE-SIGNEDOUT (review nit b): a signed-out sitting is kept in THIS TAB only (the signed-out attempt), never on the device.
    if (signedOutLatch.current) {
      saveSignedOutAttempt({
        surface: "full-mock",
        path: window.location.pathname + window.location.search,
        ids: paperQuestionIds(a.paper),
        answers: answersRef.current,
        flags: [...flagsRef.current],
        currentQNumber: currentQRef.current,
        elapsedMs: Math.max(0, Math.min(a.durationMs, Date.now() - a.startedAt)),
      });
      return;
    }
    saveFullMockSession(sessionUid, {
      code: a.code,
      name: a.name,
      subject,
      grade,
      paper: a.paper,
      startedAt: a.startedAt,
      durationMs: a.durationMs,
      answers: answersRef.current,
      flags: [...flagsRef.current],
      currentQNumber: currentQRef.current,
      focus: focusRef.current,
      phase: "taking",
      pyqCount: a.pyqCount,
      freshCount: a.freshCount,
      updatedAt: Date.now(),
    });
  }, [sessionUid, subject, grade]);

  useEffect(() => {
    if (phase === "taking") persistTaking();
  }, [answers, flags, currentQNumber, phase, persistTaking]);

  // ── §8b focus aggregates (timed surface only; the clock never pauses) ───────
  const focusCtl = useFocusAggregates(
    phase === "taking" && !!activeMock,
    focusSeed,
    useCallback(
      (f: SessionFocusAggregates) => {
        focusRef.current = f;
        persistTaking();
      },
      [persistTaking],
    ),
  );

  // ── In-progress resume (§8a) ─────────────────────────────────────────────────
  const [inProgress, setInProgress] = useState<FullMockSessionState | null>(null);
  useEffect(() => {
    if (phase === "setup") setInProgress(findInProgressSession(sessionUid));
  }, [phase, sessionUid]);

  // ── Results state (two-phase) ────────────────────────────────────────────────
  const [objective, setObjective] = useState<ObjectiveScore | null>(null);
  const objectiveRef = useRef<ObjectiveScore | null>(null);
  objectiveRef.current = objective;
  useEffect(
    () =>
      onRecordRelocated((_from, to, worksheetId) => {
        const a = activeRef.current;
        const obj = objectiveRef.current;
        if (!a || !obj || a.paper.worksheetId !== worksheetId || a.code === to) return;
        moveFmPaper(a.code, to, a, obj, focusRef.current);
      }),
    [moveFmPaper],
  );
  const [resultsPhase, setResultsPhase] = useState<"partial" | "full">("partial");
  // LIVE-FIX-1 #5 - "If you answered these, upload all your pages again, including the missing one": back to THIS paper's upload step (the same step the first upload used;
  // the grade then replaces this result under the same code). Re-upload rules and check counts are the server's, unchanged.
  // REVIEW B2: the upload step it opens says to upload EVERY page (the new check replaces the last one; grades are not merged).
  const [addingPages, setAddingPages] = useState(false);
  const addMissingPage = useCallback(() => {
    setScorecardOpen(false);
    setAddingPages(true);
    setResultsPhase("partial");
  }, []);
  useEffect(() => {
    if (resultsPhase === "full") setAddingPages(false);
  }, [resultsPhase]);
  useEffect(() => {
    if (phase !== "results") setAddingPages(false); // leaving the paper ends the add-pages step
  }, [phase]);
  const [scorecardOpen, setScorecardOpen] = useState(false);
  const [fullResponse, setFullResponse] = useState<WorksheetGradeResponse | null>(null);
  // TS-ANALYSIS-1 (feature 2) — time on screen per question while the mock is being taken (device-local).
  useQuestionTimes(activeMock?.paper.worksheetId ?? null, phase === "taking", currentQNumber);
  // SHEET-HEADER-1 — when THIS fullResponse was marked (set beside it; it is only ever set from a fresh grade).
  const fullGradedAtRef = useRef<number | null>(null);
  const [grading, setGrading] = useState(false);
  /** GRADE-RESULT-COPY-1 - the grade call's transport stage; only a retry is shown. */
  const [gradeStage, setGradeStage] = useState<GradingStage | null>(null);
  const [gradeError, setGradeError] = useState<string | null>(null);
  // PAPER-WALLS-1: the upgrade sheet (Board Pass first, the Mock Pack second) for a Basic 402 / spent trial allowance.
  const [paperWall, setPaperWall] = useState(false);
  // OFFERS-V2: the wall's buying block - this mock's subject rows (Bundle, CBQ, Mock Pack) under the Board Pass card. An unknown subject keeps the Bundle only.
  const paperOffers = useMemo(() => {
    const subject = String(sessionSubject ?? "").toLowerCase();
    return { kind: "full-mock" as const, subject: subject === "maths" || subject === "science" ? (subject as "maths" | "science") : null };
  }, [sessionSubject]);
  const [downloading, setDownloading] = useState(false);
  // AWAIT-1-PAPERS — the paper just downloaded (the confirmation card), a downloaded paper
  // re-opened for its Section A picks, and whether the ACTIVE mock was sat on paper: a
  // downloaded mock has no in-app timer, so no time or focus figure is recorded or shown.
  const [downloadedNote, setDownloadedNote] = useState<{ code: string; name: string } | null>(null);
  const [pickSnap, setPickSnap] = useState<FullMockPaperSnapshot | null>(null);
  const [paperNotice, setPaperNotice] = useState<string | null>(null);
  const downloadedRef = useRef(false);
  const [reopen, setReopen] = useState<{
    record: SessionRecord;
    response: WorksheetGradeResponse | null;
    awaitingDetail?: string;
    /** PAPER-REBUILD-1 (D103a): the paper lookup failed; the scorecard offers "Start a new test". */
    noPaper?: boolean;
    /** REVIEW NIT4: this paper's saved copy is there, so "Upload all pages again" can open its upload step (else no button). */
    canAddPages?: boolean;
    /** MARK-ON-PHOTO-2: that saved copy's paper and the sitting's focus figures (only with canAddPages), so a question can be
     *  marked on its photo and the record re-saved as it was. */
    paper?: PersistedWorksheet;
    focus?: SessionFocusAggregates;
  } | null>(null);

  // MARK-ON-PHOTO-2 (owner rulings 25 Nov 2026) — "Mark it on your photo" on a fresh result and on a re-opened one that offers
  // "Upload all pages again". `index` is the row in the result on screen; `where` says which result that is.
  const [mark, setMark] = useState<{ index: number; where: "fresh" | "reopen" } | null>(null);
  const [markBusy, setMarkBusy] = useState(false);
  const [markError, setMarkError] = useState<string | null>(null);
  const markSeq = useRef(0);

  // TUTOR-RETURN-SHEET-1 - the restored card's graded-sheet download (the page re-mounted on the
  // tutor trip, so the live paper is gone: the sheet is rebuilt from the stored payload + the
  // record's bank ids). Offered only when something was graded and the detail lock is open.
  const [reopenDownloading, setReopenDownloading] = useState(false);
  const reopenSheetOpen =
    useDetailLock(
      reopen ? { kind: "full-mock", resultKey: reopen.record.id, worksheetId: reopen.record.worksheetId } : undefined,
      Boolean(reopen && hasStoredPaperSheet(reopen.response)),
    ) === "open";
  const downloadReopenSheet = useCallback(async () => {
    if (!reopen || reopenDownloading) return;
    setReopenDownloading(true);
    try {
      await downloadStoredPaperGradedSheet(reopen.record, reopen.response);
    } catch {
      /* best-effort, as the live download */
    } finally {
      setReopenDownloading(false);
    }
  }, [reopen, reopenDownloading]);

  // ── History panel + banner ───────────────────────────────────────────────────
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelPendingOnly, setPanelPendingOnly] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [latestWeakLine, setLatestWeakLine] = useState<string | null>(null);

  // Honest weakest-chapter line for the latest COMPLETED mock — derived from its
  // stored per-question payload; silent when it can't be derived.
  useEffect(() => {
    let live = true;
    const latest = mockRecords.find((r) => r.status === "graded");
    if (!latest) {
      setLatestWeakLine(null);
      return undefined;
    }
    (async () => {
      const payload = await getSessionPerQuestion(user?.uid, latest.perQuestionRef);
      if (!live) return;
      const resp = payload?.response;
      if (
        resp &&
        Array.isArray(latest.questionIds) &&
        latest.questionIds.length === resp.results.length
      ) {
        const lens = deriveStoredFullMockChapterLens(resp, latest.questionIds);
        const worst = lens?.[0];
        setLatestWeakLine(worst && worst.lost > 0 ? `Weakest: ${worst.label} ·` : null);
      } else {
        setLatestWeakLine(null);
      }
    })();
    return () => {
      live = false;
    };
  }, [mockRecords, user?.uid]);

  // ── The persisted wall clock (§8a.3) ─────────────────────────────────────────
  const remaining = activeMock ? remainingMs(activeMock, nowTick) : FM_DURATION_MS;
  const submittedRef = useRef(false);

  useEffect(() => {
    // Tick while taking (the clock display) AND while a resume strip is visible
    // (its "left" label must stay honest). The wall-clock deadline is the truth;
    // this interval only drives the re-render.
    if (phase !== "taking" && !inProgress) return undefined;
    const t = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [phase, inProgress]);

  /** Submit — from the confirm, the expiring clock, or an expired resume. Scores
   *  the objective section deterministically, writes the PARTIAL record (with
   *  the §8b aggregates), flips the persisted session to awaiting-upload. */
  const doSubmit = useCallback(
    (a: ActiveMock, currentAnswers: Record<number, string>, focus: SessionFocusAggregates) => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      // TS-FREE-SIGNEDOUT: signed out, a submit marks NOTHING and writes nothing - the attempt is kept in this tab and the visitor is
      // asked to sign in to get it marked (the signed-in submit below then runs unchanged).
      if (signedOutLatch.current) {
        // An account appeared mid-sitting: back to the start screen with the answers kept (the signed-in start rules run first).
        if (isSignedIn) {
          submittedRef.current = false;
          bounceRef.current();
          return;
        }
        saveSignedOutAttempt({
          surface: "full-mock",
          path: location.pathname + location.search,
          ids: paperQuestionIds(a.paper),
          answers: currentAnswers,
          flags: [...flagsRef.current],
          currentQNumber: currentQRef.current,
          elapsedMs: Math.max(0, Math.min(a.durationMs, Date.now() - a.startedAt)),
        });
        setSignInAsk({ timeUp: remainingMs(a, Date.now()) <= 0 });
        return;
      }
      const objQs = fullMockObjectiveQuestions(a.paper);
      const subjQs = fullMockSubjectiveQuestions(a.paper);
      const obj = scoreObjectiveSection(objQs, currentAnswers);
      const partialResponse = buildFullMockResponse({
        paper: a.paper,
        objective: obj,
        subjectiveQuestions: subjQs,
        subjectiveResponse: null,
      });
      // RECORD-SAFE-1: the partial record, the device session and the server paper copy are written NOW, under the
      // requested code, with no wait on any cloud read (as before). If that code turns out to belong to another paper
      // the cloud write saves it under a free code and onRecordRelocated moves the page + these copies to it.
      const wrote = writeFullMockPartialRecord({
        user,
        paper: a.paper,
        code: a.code,
        subject: sessionSubject,
        response: partialResponse,
        focus,
      });
      // Keep the paper + frozen objective for a later upload on THIS device.
      saveFullMockSession(sessionUid, {
        code: a.code,
        name: a.name,
        subject,
        grade,
        paper: a.paper,
        startedAt: a.startedAt,
        durationMs: a.durationMs,
        answers: currentAnswers,
        flags: [...flagsRef.current],
        currentQNumber: currentQRef.current,
        focus,
        phase: "awaiting-upload",
        objective: obj,
        pyqCount: a.pyqCount,
        freshCount: a.freshCount,
        updatedAt: Date.now(),
      });
      // …and persist the SAME paper server-side (text only — never an answer
      // image, not even the typed answers) so a later upload from ANY signed-in
      // device re-grades the REAL paper [FU-FM-CROSS-DEVICE-UPLOAD]. Best-effort:
      // a miss keeps the device-local path and the honest cross-device fallback.
      saveFullMockPaperSnapshot(user, {
        code: a.code,
        name: a.name,
        subject,
        grade,
        paper: a.paper,
        startedAt: a.startedAt,
        durationMs: a.durationMs,
        objective: obj,
        focus,
        pyqCount: a.pyqCount,
        freshCount: a.freshCount,
      });
      // the device mirror may already have moved the record to a free code: follow it
      const written = wrote.then((savedCode) => {
        if (savedCode && savedCode !== a.code) moveFmPaper(a.code, savedCode, a, obj, focus);
      });
      focusRef.current = focus;
      setObjective(obj);
      setResultsPhase("partial");
      setScorecardOpen(true);
      setPhase("results");
      setInProgress(null);
      trackUxEvent("full_mock_submit", "FullMockPage", {
        subject,
        objective: `${obj.awarded}/${obj.total}`,
      });
      // Re-mint the NEXT mock's nomenclature off the fresh records (this mock's
      // record now exists) — otherwise a same-visit second mock would reuse this
      // code and overwrite this record.
      void written.then(() => loadRecords()).then(async (all) => {
        try {
          const nm = await mintUniqueFullMockNomenclature(sessionSubject, all, user);
          snapshotFresh(all, nm.sequence);
          setNomen({ code: nm.code, name: nm.name });
        } catch {
          // Unknown -> no new code is minted; the page asks the student to retry (the submitted mock is safe).
          setNomen(null);
          setCodeCheckFailed(true);
        }
      });
    },
    [user, sessionSubject, sessionUid, subject, grade, loadRecords, moveFmPaper, isSignedIn, location.pathname, location.search],
  );

  /** TS-FREE-SIGNEDOUT (review blocker): an account appeared mid-sitting - the answers are kept for this paper and the page returns to
   *  its start screen, where Start runs the signed-in rules (one free test, the focus-set rule, fair use) before anything is marked. */
  const bounceRef = useRef<() => void>(() => {});
  bounceRef.current = () => {
    const a = activeRef.current;
    if (a) {
      saveSignedOutAttempt({
        surface: "full-mock",
        path: location.pathname + location.search,
        ids: paperQuestionIds(a.paper),
        answers: answersRef.current,
        flags: [...flagsRef.current],
        currentQNumber: currentQRef.current,
        elapsedMs: Math.max(0, Math.min(a.durationMs, Date.now() - a.startedAt)),
      });
    }
    signedOutLatch.current = false;
    signedOutRestoreDone.current = false;
    phaseRef.current = "setup";
    activeRef.current = null;
    setActiveMock(null);
    setSignInAsk(null);
    setShowConfirm(false);
    setPhase("setup");
  };
  useEffect(() => {
    if (isSignedIn && signedOutLatch.current && phase === "taking") bounceRef.current();
  }, [isSignedIn, phase]);

  /** TS-FREE-SIGNEDOUT: back to the paper from the sign-in card (the clock never paused - the exam-hall rule). */
  const backToPaperSignedOut = useCallback(() => {
    submittedRef.current = false;
    setSignInAsk(null);
  }, []);
  /** TS-FREE-SIGNEDOUT: "Sign in to get my answers marked" - the kept attempt goes with the visitor; this device's signed-out autosave
   *  of the sitting is dropped (nothing of it stays on the device). */
  const goSignInToMark = useCallback(() => {
    // the sitting ends here: no later autosave (focus flush on unmount) may write it again; the kept attempt goes with the visitor
    phaseRef.current = "setup";
    activeRef.current = null;
    navigate(signInToMarkPath(location.pathname, location.search));
  }, [navigate, location.pathname, location.search]);

  // TS-FREE-SIGNEDOUT: back from sign-in - the attempt kept for THIS paper (same question ids) is held for Start, once. Nothing starts
  // here: Start runs the signed-in start rules unchanged (one free test, the focus-set rule, fair use), and a refused start shows the
  // existing wall. A saved sitting of the account's own (inProgress) wins.
  useEffect(() => {
    if (!(isSignedIn ? onSeriesPaper : signedOutSitting) || !onSeriesPaper || tsFreeSignedOutDisabled() || signedOutRestoreDone.current || inProgress || phase !== "setup" || !draw) return;
    const kept = readSignedOutAttempt("full-mock", paperQuestionIds(draw.paper));
    if (!kept) return;
    signedOutRestoreDone.current = true;
    setSignedOutKept(kept);
  }, [isSignedIn, onSeriesPaper, signedOutSitting, inProgress, phase, draw]);

  const finishToPartial = useCallback(() => {
    const a = activeRef.current;
    if (!a) return;
    doSubmit(a, answersRef.current, focusCtl.snapshot());
  }, [doSubmit, focusCtl]);

  // Auto-submit when the wall clock runs out — like the board hall, once.
  useEffect(() => {
    if (phase !== "taking" || !activeMock) return;
    if (remaining <= 0 && !submittedRef.current && !noAutoSubmitRef.current && !timeUpLocked) finishToPartial();
  }, [phase, activeMock, remaining, finishToPartial, timeUpLocked]);

  // Guarded exit (§8a): confirm before the tab closes mid-test. Answers + timer
  // are saved, but a silent loss of the sitting flow deserves a stop.
  useEffect(() => {
    if (phase !== "taking") return undefined;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [phase]);

  // ── Start / resume ───────────────────────────────────────────────────────────
  const startTest = useCallback(() => {
    if (!draw || !nomen || !draw.enoughQuestions) return;
    // TEST-SERIES-1 (owner 19:44 IST): a free / trial account takes ONE test in total; signed out signs in first.
    // LIVE-FIX-1 (live run 23 Nov 2026): decided BEFORE the weekly fair-use check. A trial account that has used its one free
    // test is told THAT ("You've used your 1 free test") with the Test Series AND the Board Pass - not the weekly mock limit
    // with the Board Pass alone (the week resetting would not let it start anyway). Entitled accounts decide "start" here.
    const startDecision = seriesStartDecision({ entitled: seriesPaperAccess, signedIn: isSignedIn, testsTaken: countTestsTaken(records) });
    if (startDecision === "upgrade" && seriesAccess.checking) {
      setPaperNotice(ACCESS_CHECKING_LINE);
      return;
    }
    if (startDecision === "sign-in" && signedOutSitting) {
      // TS-FREE-SIGNEDOUT: the paper opens signed out - no fair-use read, no ownership read, nothing served or recorded. The day's
      // paper view is the device's own count (MockViewGate), as for any signed-out paper.
      // a signed-out reload of this sitting: its kept answers and time (this tab only) - a RESUME, never counted as a new paper
      const soKept = signedOutKept && signedOutKept.ids.join("|") === paperQuestionIds(draw.paper).join("|") ? signedOutKept : null;
      if (!soKept && !claimNewPaperView(location.pathname, null, false, location.search)) {
        setPaperNotice(inProgress ? NEW_PAPER_LIMIT_SAVED_LINE : NEW_PAPER_LIMIT_LINE);
        return;
      }
      submittedRef.current = false;
      downloadedRef.current = false;
      noAutoSubmitRef.current = false;
      setTimeUpLocked(false);
      const so: ActiveMock = {
        paper: draw.paper,
        code: nomen.code,
        name: paperName ?? nomen.name,
        startedAt: Date.now() - (soKept ? soKept.elapsedMs : 0),
        durationMs: focusActive && seriesState?.durationMs ? seriesState.durationMs : FM_DURATION_MS,
        pyqCount: draw.pyqCount,
        freshCount: draw.freshCount,
      };
      setActiveMock(so);
      activeRef.current = so;
      setAnswers(soKept ? soKept.answers : {});
      answersRef.current = soKept ? soKept.answers : {};
      setFlags(new Set(soKept ? soKept.flags : []));
      setCurrentQNumber(soKept && draw.paper.questions.some((q) => q.qNumber === soKept.currentQNumber) ? soKept.currentQNumber : 1);
      setFocusSeed({ ...EMPTY_FOCUS });
      focusRef.current = { ...EMPTY_FOCUS };
      setSignedOutKept(null);
      signedOutLatch.current = true;
      // review nit (a): the kept time had already run out -> straight to the sign-in card (nothing is marked signed out)
      setSignInAsk(soKept && remainingMs(so, Date.now()) <= 0 ? { timeUp: true } : null);
      if (soKept && remainingMs(so, Date.now()) <= 0) submittedRef.current = true;
      setPhase("taking");
      trackUxEvent("full_mock_start", "FullMockPage", { subject, code: nomen.code, signedOut: true });
      return;
    }
    if (startDecision === "sign-in") {
      navigate(`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`);
      return;
    }
    if (startDecision === "upgrade") {
      setStartWall(true);
      return;
    }
    // TS-THEMES-1 (review fix): a focus set has NO Section A, so as a free / trial account's one free test it is worth taking only when
    // its WRITTEN answers will be marked (TS-FREE-CHECK-1). When they will not (server switch off, the free test pinned elsewhere, or
    // the access read not settled) the set never becomes the free test: the upgrade card, not a sitting where nothing is marked.
    if (focusActive && !seriesPaperAccess && !freeWritten) {
      if (seriesAccess.checking) {
        setPaperNotice(ACCESS_CHECKING_LINE);
        return;
      }
      setStartWall(true);
      return;
    }
    // FAIR-USE-UI-1 (UI3): this week's mock already used -> the panel, not the paper. A RESUME is not a start and is never blocked.
    // FAIRUSE-TS-OWNER-1 (resolves [FU-FAIRUSE-TS-OWNER-EXEMPT]): the server now mints a trial Test Series owner's series paper and
    // a Board Pass holder's paper without the trial limit, so neither is walled here; while ownership is unknown the page waits.
    const wall = wallVerdictFor(onSeriesPaper);
    if (wall === "wait") {
      setPaperNotice(ACCESS_CHECKING_LINE);
      return;
    }
    if (wall === "unconfirmed") {
      setStartWall(true);
      return;
    }
    if (wall !== "exempt" && fairUse.blockPaperStart()) return;
    // CT-RESUME-2: a visit let through as a RESUME of a saved mock was not counted. Starting a NEW
    // mock instead is counted now — or refused when today's papers are used up.
    if (!claimNewPaperView(location.pathname, user?.uid ?? null, isPremium || (seriesAccess.ownsSeries && onSeriesPaper), location.search)) {
      setPaperNotice(inProgress ? NEW_PAPER_LIMIT_SAVED_LINE : NEW_PAPER_LIMIT_LINE);
      return;
    }
    submittedRef.current = false;
    downloadedRef.current = false;
    // TS-FREE-SIGNEDOUT: the attempt kept from before sign-in (this paper's ids) becomes this sitting - its answers, and the time it
    // had already used (the clock is not reset by signing in).
    const kept = signedOutKept && signedOutKept.ids.join("|") === paperQuestionIds(draw.paper).join("|") ? signedOutKept : null;
    const a: ActiveMock = {
      paper: draw.paper,
      code: nomen.code,
      name: paperName ?? nomen.name,
      startedAt: Date.now() - (kept ? kept.elapsedMs : 0),
      // TS-THEMES-1: a focus set is timed at the Full Mock's pace for ITS marks (80 marks in 3 hours), e.g. 20 marks -> 45 minutes.
      durationMs: focusActive && seriesState?.durationMs ? seriesState.durationMs : FM_DURATION_MS,
      pyqCount: draw.pyqCount,
      freshCount: draw.freshCount,
    };
    setActiveMock(a);
    activeRef.current = a;
    setAnswers(kept ? kept.answers : {});
    answersRef.current = kept ? kept.answers : {};
    setFlags(new Set(kept ? kept.flags : []));
    setCurrentQNumber(kept && draw.paper.questions.some((q) => q.qNumber === kept.currentQNumber) ? kept.currentQNumber : 1);
    signedOutLatch.current = false;
    // review nit (a): the kept time had already run out - the paper opens at its submit step, not an instant auto-submit.
    noAutoSubmitRef.current = !!kept && remainingMs(a, Date.now()) <= 0;
    // review nit 1: answers locked, no "keep working" - the time-up card (not the dismissible confirm) is the only way on.
    setTimeUpLocked(noAutoSubmitRef.current);
    setShowConfirm(false);
    if (signedOutKept) {
      clearSignedOutAttempt();
      setSignedOutKept(null);
    }
    setFocusSeed({ ...EMPTY_FOCUS });
    focusRef.current = { ...EMPTY_FOCUS };
    recordServed(servedOwnerId, {
      surface: "full-mock",
      scope: sessionSubject,
      ids: draw.paper.questions.map((q) => String(q.id ?? "")),
    });
    setPhase("taking");
    trackUxEvent("full_mock_start", "FullMockPage", { subject, code: nomen.code });
  }, [draw, nomen, paperName, subject, fairUse.blockPaperStart, wallVerdictFor, servedOwnerId, sessionSubject, location.pathname, location.search, user?.uid, isPremium, inProgress, seriesPaperAccess, seriesAccess.checking, seriesAccess.ownsSeries, onSeriesPaper, focusActive, freeWritten, seriesState?.durationMs, isSignedIn, records, navigate, signedOutSitting, signedOutKept]);

  const resumeMock = useCallback(() => {
    const s = inProgress ?? findInProgressSession(sessionUid);
    if (!s) return;
    signedOutLatch.current = false;
    noAutoSubmitRef.current = false;
    setTimeUpLocked(false);
    setPanelOpen(false);
    downloadedRef.current = false;
    const a: ActiveMock = {
      paper: s.paper,
      code: s.code,
      name: s.name,
      startedAt: s.startedAt,
      durationMs: s.durationMs,
      pyqCount: s.pyqCount,
      freshCount: s.freshCount,
    };
    setActiveMock(a);
    activeRef.current = a;
    setAnswers(s.answers || {});
    answersRef.current = s.answers || {};
    setFlags(new Set(s.flags || []));
    setCurrentQNumber(s.currentQNumber || 1);
    setFocusSeed({ ...EMPTY_FOCUS, ...s.focus });
    focusRef.current = { ...EMPTY_FOCUS, ...s.focus };
    submittedRef.current = false;
    if (remainingMs(s) <= 0) {
      // The clock ran out while away — the exam-hall rule: submit what is saved.
      doSubmit(a, s.answers || {}, { ...EMPTY_FOCUS, ...s.focus });
    } else {
      setNowTick(Date.now());
      setPhase("taking");
      trackUxEvent("full_mock_resume", "FullMockPage", { subject, code: s.code });
    }
  }, [inProgress, sessionUid, doSubmit, subject]);

  const pickOption = useCallback((qNumber: number, optionText: string) => {
    // review nit 1: past time on a kept attempt, the answers are locked (belt and braces - the paper is not rendered then).
    if (noAutoSubmitRef.current) return;
    setAnswers((prev) => ({ ...prev, [qNumber]: optionText }));
  }, []);
  const toggleFlag = useCallback((qNumber: number) => {
    setFlags((prev) => {
      const next = new Set(prev);
      if (next.has(qNumber)) next.delete(qNumber);
      else next.add(qNumber);
      return next;
    });
  }, []);

  // ── Upload → full (same sitting, or rehydrated from the pending banner) ─────
  // GRADING-JOBS-1 J2 — a background grade: rows as they land; the job lives on the persisted
  // awaiting-upload session, so a reload resumes it; "grade the remaining N" after an interruption.
  const jobUi = useGradingJob();
  const lastUploadRef = useRef<{ imageBase64: string; imageMimeType: string } | null>(null);
  const handleGrade = useCallback(
    async (
      upload: { imageBase64: string; imageMimeType: string },
      mode: { resume?: boolean; continueFrom?: GradingJobInterruptedError } = {},
    ) => {
      const a = activeRef.current;
      if (!a || !objective || grading) return;
      setGrading(true);
      setGradeStage(null);
      setGradeError(null);
      fairUse.clearLimit();
      if (!mode.resume) lastUploadRef.current = upload;
      if (!mode.continueFrom) jobUi.reset();
      try {
        const outcome = await gradeFullMockUpload({
          user,
          paper: a.paper,
          code: a.code,
          subject: sessionSubject,
          objective,
          subjectiveQuestions: fullMockSubjectiveQuestions(a.paper),
          upload,
          onStage: setGradeStage,
          // AWAIT-1: a mock sat on paper has no measured focus — none is recorded (never zeros).
          focus: downloadedRef.current ? undefined : focusRef.current,
          job: {
            store: fullMockJobStore(sessionUid, a.code),
            paperKey: a.paper.worksheetId,
            onProgress: jobUi.onProgress,
            ...(mode.resume ? { resumeOnly: true } : {}),
            ...(mode.continueFrom ? { continueFrom: mode.continueFrom } : {}),
          },
        });
        jobUi.reset();
        if (!outcome.ok) {
          setGradeError(outcome.response.error || "We couldn’t grade your answers. Try a clearer scan, or try again.");
        } else {
          fullGradedAtRef.current = Date.now();
          setFullResponse(outcome.response);
          setResultsPhase("full");
          setScorecardOpen(true);
          fairUse.noteGraded();
          const gradedAs = adoptFmCode(outcome.savedCode, a);
          clearFullMockSession(sessionUid, a.code);
          // Fully graded — the durable record + perQuestion payload exist; the
          // cross-device paper snapshot has done its job. Only THIS paper's copy (by identity).
          // LIVE-FIX-1 #5: a paper with answers not found on the pages keeps its snapshot - "Upload all pages again" re-opens its upload step.
          if (notFoundSummary(outcome.response.results) === null) {
            deleteFullMockPaperSnapshot(user, a.code, a.paper.worksheetId);
            if (gradedAs.code !== a.code) deleteFullMockPaperSnapshot(user, gradedAs.code, a.paper.worksheetId);
          }
          trackUxEvent("full_mock_complete", "FullMockPage", {
            subject,
            score: `${outcome.response.gradedMarksAwarded}/${outcome.response.gradedMarksTotal}`,
          });
          void loadRecords();
        }
      } catch (err) {
        // J2 §6: an interrupted background grade keeps its marked rows and offers the rest back.
        if (jobUi.captureInterrupted(err)) return;
        // FAIR-USE-UI-1 (UI1): a fair-use refusal shows the calm panel instead of the error.
        // PAPER-WALLS-1: a Basic 402 is the upgrade sheet, never red text.
        if (isPremiumRequiredRefusal(err)) {
          setPaperWall(true);
          return;
        }
        if (await fairUse.handleRefusal(err)) return;
        if (isTrialLimitRefusal(err)) {
          setPaperWall(true);
          return;
        }
        // LOW-END-1 R2: never a raw platform message ("Failed to fetch") — a plain sentence.
        setGradeError(gradingErrorMessage(err, "We couldn't grade your answers just now. Your answers are still here — please try again."));
      } finally {
        setGrading(false);
        setGradeStage(null);
      }
    },
    [objective, grading, user, sessionSubject, sessionUid, subject, loadRecords, jobUi.reset, jobUi.onProgress, jobUi.captureInterrupted, fairUse.clearLimit, fairUse.noteGraded, fairUse.handleRefusal, adoptFmCode],
  );

  // J2 — resume after a reload: an awaiting-upload mock on this device with a background grade
  // still stored re-opens on its upload step and polls the SAME job. Once, for a signed-in uid.
  const [resumeCode, setResumeCode] = useState<string | null>(null);
  const resumeCheckedRef = useRef(false);
  useEffect(() => {
    if (resumeCheckedRef.current || !sessionUid) return;
    resumeCheckedRef.current = true;
    const s = listFullMockSessions(sessionUid).find(
      (x) => x.phase === "awaiting-upload" && !!x.objective && !!resumableJob(fullMockJobStore(sessionUid, x.code), x.paper.worksheetId),
    );
    if (!s || !s.objective) return;
    const a: ActiveMock = {
      paper: s.paper,
      code: s.code,
      name: s.name,
      startedAt: s.startedAt,
      durationMs: s.durationMs,
      pyqCount: s.pyqCount,
      freshCount: s.freshCount,
    };
    setActiveMock(a);
    activeRef.current = a;
    setObjective(s.objective);
    focusRef.current = { ...EMPTY_FOCUS, ...s.focus };
    submittedRef.current = true; // already submitted — the grade only
    downloadedRef.current = s.downloaded === true;
    setFullResponse(null);
    setResultsPhase("partial");
    setScorecardOpen(false);
    setPhase("results");
    setResumeCode(s.code);
  }, [sessionUid]);
  useEffect(() => {
    if (!resumeCode || !objective || activeRef.current?.code !== resumeCode) return;
    setResumeCode(null);
    void handleGrade({ imageBase64: "", imageMimeType: "application/pdf" }, { resume: true });
  }, [resumeCode, objective, handleGrade]);

  // ── Pending deep-link (banner / panel): attach to the EXISTING record ────────
  const openPendingUpload = useCallback(
    async (record: SessionRecord) => {
      setPanelOpen(false);
      let s = loadFullMockSession(sessionUid, record.id);
      if (!(s && s.phase === "awaiting-upload" && s.objective)) {
        // Not on this device (or evicted): retrieve the SAME drawn paper from
        // the server-side snapshot so the upload grades the REAL paper
        // [FU-FM-CROSS-DEVICE-UPLOAD]. No snapshot → the honest fallback below.
        const snap = await fetchFullMockPaperSnapshot(user, record.id);
        // AWAIT-1: a downloaded paper first takes its Section A picks (then continueFromPicks).
        if (snap && snap.downloaded === true && !snap.objective) {
          // The same fair-use gate as an in-app start (UI3): an exhausted allowance is stopped
          // BEFORE a client-scored partial record could be written. FAIRUSE-TS-OWNER-1: "series" is the SAVED paper's own id.
          const wall = wallVerdictFor(seriesPaperKeyOfWorksheetId(snap.paper?.worksheetId) !== null);
          if (wall === "wait") {
            setPaperNotice(ACCESS_CHECKING_LINE);
            return;
          }
          if (wall === "unconfirmed") {
            setPaperNotice(`${ACCESS_FAILED_LINE} - please try again.`);
            seriesAccess.retry();
            return;
          }
          if (wall !== "exempt" && fairUse.blockPaperStart()) return;
          setReopen(null);
          setPickSnap(snap);
          setPhase("pick");
          return;
        }
        if (snap) {
          s = {
            code: snap.code,
            name: snap.name,
            subject: snap.subject,
            grade: snap.grade,
            paper: snap.paper,
            startedAt: snap.startedAt,
            durationMs: snap.durationMs,
            answers: {},
            flags: [],
            currentQNumber: 1,
            focus: { ...EMPTY_FOCUS, ...snap.focus },
            phase: "awaiting-upload",
            objective: snap.objective,
            pyqCount: snap.pyqCount,
            freshCount: snap.freshCount,
            ...(snap.downloaded ? { downloaded: true } : {}),
            updatedAt: Date.now(),
          };
          // Re-seed this device's session so the rest of the upload flow (and
          // a later revisit) behaves exactly like the sitting device.
          saveFullMockSession(sessionUid, s);
        }
      }
      if (s && s.phase === "awaiting-upload" && s.objective) {
        const a: ActiveMock = {
          paper: s.paper,
          code: s.code,
          name: s.name,
          startedAt: s.startedAt,
          durationMs: s.durationMs,
          pyqCount: s.pyqCount,
          freshCount: s.freshCount,
        };
        setActiveMock(a);
        activeRef.current = a;
        setObjective(s.objective);
        focusRef.current = { ...EMPTY_FOCUS, ...s.focus };
        submittedRef.current = true; // already submitted — upload only
        downloadedRef.current = s.downloaded === true;
        setFullResponse(null);
        setResultsPhase("partial");
        setScorecardOpen(false);
        setPhase("results");
      } else {
        // The paper is genuinely unavailable (pre-snapshot mock, offline, or a
        // failed snapshot write) — say so plainly; never fabricate a paper to
        // grade against (owner-ratified).
        // PAPER-REBUILD-1 (D103a): the Section A result frozen at submit lives only with the paper,
        // so a mock cannot be rebuilt here; the way forward is a new mock. The sitting device may
        // still hold its local copy (§8a), so the line says "here", not "never".
        setReopen({
          record,
          response: null,
          noPaper: true,
          awaitingDetail:
            "This mock's saved paper isn't on this device or online, so it can't be uploaded here. " +
            "If you sat it on another device, open LazyTopper there; otherwise start a new mock.",
        });
      }
    },
    [sessionUid, user, fairUse.blockPaperStart, wallVerdictFor, seriesAccess.retry],
  );

  // ── Re-open a stored mock read-only ──────────────────────────────────────────
  const openStored = useCallback(
    async (record: SessionRecord) => {
      let response: WorksheetGradeResponse | null = null;
      if (record.status !== "pending-upload") {
        const payload = await getSessionPerQuestion(user?.uid, record.perQuestionRef);
        response = payload?.response ?? null;
      }
      // REVIEW NIT4: "Upload all pages again" only when this paper's saved copy is there to open (never the no-paper dead end).
      let canAddPages = false;
      // MARK-ON-PHOTO-2: the saved copy's paper (and the sitting's focus figures, as the record carries them) for a mark.
      let saved: { paper: PersistedWorksheet; focus?: SessionFocusAggregates } | null = null;
      if (notFoundSummary(response?.results)) {
        const local = loadFullMockSession(sessionUid, record.id);
        if (local && local.phase === "awaiting-upload" && local.objective) {
          canAddPages = true;
          saved = { paper: local.paper };
        } else {
          const snap = await fetchFullMockPaperSnapshot(user, record.id);
          canAddPages = Boolean(snap?.objective);
          if (snap && snap.objective) saved = { paper: snap.paper };
        }
        if (saved && record.focus) saved.focus = record.focus;
      }
      setPanelOpen(false);
      setReopen({ record, response, ...(canAddPages ? { canAddPages, ...(saved ? saved : {}) } : {}) });
    },
    [user, sessionUid],
  );

  // MARK-ON-PHOTO-2 — leaving the result the mark belongs to closes the dialog and drops a reply still in flight from the screen.
  const reopenId = reopen?.record.id ?? null;
  useEffect(() => {
    markSeq.current += 1;
    setMark(null);
    setMarkBusy(false);
    setMarkError(null);
  }, [phase, resultsPhase, activeMock?.code, reopenId]);

  /** The result a mark is made on: the paper, its code, and the rows on screen; null when it is not there. */
  const markContext = useCallback(
    (where: "fresh" | "reopen") => {
      if (where === "fresh") {
        return activeMock && fullResponse && resultsPhase === "full"
          ? {
              paper: activeMock.paper,
              code: activeMock.code,
              subject: sessionSubject,
              response: fullResponse,
              // AWAIT-1: a mock sat on paper has no measured focus — none is recorded (never zeros), as on its grade.
              focus: downloadedRef.current ? undefined : focusRef.current,
            }
          : null;
      }
      return reopen && reopen.canAddPages && reopen.paper && reopen.response
        ? { paper: reopen.paper, code: reopen.record.id, subject: reopen.record.subject, response: reopen.response, focus: reopen.focus }
        : null;
    },
    [activeMock, fullResponse, resultsPhase, sessionSubject, reopen],
  );

  const submitMark = useCallback(
    async (image: { imageBase64: string; imageMimeType: string }) => {
      const m = mark;
      const ctx = m ? markContext(m.where) : null;
      if (!m || !ctx || markBusy) return;
      const token = ++markSeq.current;
      const stillShowing = () => markSeq.current === token;
      setMarkBusy(true);
      setMarkError(null);
      fairUse.clearLimit();
      try {
        const out = await markFullMockQuestion({ user, ...ctx, index: m.index, image });
        if (out.kind === "unread") {
          if (stillShowing()) setMarkError(MARK_STILL_UNREAD_COPY);
          return;
        }
        fairUse.noteGraded();
        void loadRecords();
        // As the fresh grade does: once no answer is missing from the pages, this paper's snapshot has done its job (by identity).
        if (notFoundSummary(out.response.results) === null) {
          deleteFullMockPaperSnapshot(user, ctx.code, ctx.paper.worksheetId);
          if (out.savedCode && out.savedCode !== ctx.code) deleteFullMockPaperSnapshot(user, out.savedCode, ctx.paper.worksheetId);
        }
        if (!stillShowing()) return;
        if (m.where === "fresh") {
          setFullResponse(out.response);
          if (activeMock) adoptFmCode(out.savedCode, activeMock);
        } else {
          // S1: a re-opened scorecard reads its score, types, status and board view from the RECORD: swap in the one just re-saved.
          setReopen((r) => (r && r.record.id === ctx.code ? { ...r, ...(out.record ? { record: out.record } : {}), response: out.response } : r));
        }
        setMark(null);
      } catch (e) {
        if (!stillShowing()) return;
        // A fair-use limit shows the calm limit panel inside the dialog; anything else reads its own sentence.
        if (await fairUse.handleRefusal(e)) return;
        setMarkError(markErrorMessage(e));
      } finally {
        if (stillShowing()) setMarkBusy(false);
      }
    },
    [mark, markContext, markBusy, user, activeMock, adoptFmCode, loadRecords, fairUse.clearLimit, fairUse.noteGraded, fairUse.handleRefusal],
  );
  const openMark = useCallback(
    (where: "fresh" | "reopen") => (index: number) => {
      setMarkError(null);
      fairUse.clearLimit();
      setMark({ index, where });
    },
    [fairUse.clearLimit],
  );

  // FOLLOWUPS-1 B — "Ask the tutor why I lost this mark" on a SAVED mock's scorecard (the QP /
  // C&I hop): the tutor reads the student's OWN record (`from`) and the question (`q` = its bank
  // id), and its back arrow returns here with `review=<record id>`, which reopens THAT scorecard
  // through `openStored` above. Signed-in, own record, and the question's ONE chapter known from
  // the served bank (a predicted-sourced id has none -> no button) — else no button.
  const reviewUid = isSignedIn ? user!.uid : null;
  const fmTutorAskFor = useCallback(
    (record: SessionRecord | null | undefined, response: WorksheetGradeResponse | null | undefined) =>
      (qNumber: number): ScorecardTutorAsk | null => {
        if (!reviewUid || !record || record.surface !== "full-mock" || !recordBelongsToUid(record, reviewUid)) return null;
        const hop = savedPaperQuestionHop(record, response, qNumber, (id) => resolveCanonicalSlug(bankRowMeta(id)?.topicKey) || null);
        if (!hop) return null;
        return {
          onAsk: () => {
            // TEST-SERIES-1 (owner 19:44 IST): the tutor is the Board Pass's; anyone else sees the wall (client only).
            if (!boardPassHolder) {
              setTutorWall(true);
              return;
            }
            trackOnboardingEvent("tutor_from_scorecard", { surface: "full_mock" });
            // CI-TUTOR-RETURN-1 - name THIS saved paper on the entry we leave, so browser Back (not just the tutor's arrow) reopens it.
            navigate(withScorecardReviewParam(location.pathname + searchWithoutReview(location.search), record.id), { replace: true });
            navigate(
              buildTutorPath({
                subject,
                topicKey: hop.topicKey,
                grade: String(grade),
                source: "scorecard",
                returnTo: withScorecardReviewParam(location.pathname + searchWithoutReview(location.search), record.id),
                questionId: hop.questionId,
                from: record.id,
              }),
            );
          },
        };
      },
    [reviewUid, navigate, subject, grade, location.pathname, location.search, boardPassHolder],
  );

  // The tutor's back arrow: `review=<record id>` reopens that saved mock ONCE (read-only, through
  // `openStored`), and the param is stripped with `replace`. Signed-out / not this student's /
  // not a full mock -> just stripped; the page is otherwise unchanged.
  const reviewParam = sp.get(SCORECARD_REVIEW_PARAM);
  const reviewConsumedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!reviewParam || authLoading) return;
    if (reviewConsumedRef.current === reviewParam) return;
    reviewConsumedRef.current = reviewParam;
    navigate({ pathname: location.pathname, search: searchWithoutReview(location.search) }, { replace: true, state: location.state });
    if (!reviewUid) return;
    void (async () => {
      try {
        const all = await getSessionRecordsFromCloud(reviewUid);
        const record = all.find((r) => r.id === reviewParam && r.surface === "full-mock" && recordBelongsToUid(r, reviewUid));
        if (record) await openStored(record);
      } catch {
        /* honest fallback: the plain page */
      }
    })();
  }, [reviewParam, authLoading, reviewUid, location.pathname, location.search, location.state, navigate, openStored]);

  // GRADE-ROUTE-1 - `?upload=<code>` opens THAT pending mock's upload, exactly like the pending banner's
  // Upload button (`openPendingUpload`: attaches to the EXISTING record, never a new one). Used by Home, the
  // bell and the Answer Checker's "grade it on its own page" offer. Consumed once and stripped with `replace`.
  // Signed out (kept for after login) / unknown / not this student's / already graded -> the normal page.
  const uploadParam = sp.get("upload");
  const uploadConsumedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!uploadParam || authLoading || !reviewUid) return;
    if (uploadConsumedRef.current === uploadParam) return;
    uploadConsumedRef.current = uploadParam;
    const rest = new URLSearchParams(location.search);
    rest.delete("upload");
    const q = rest.toString();
    navigate({ pathname: location.pathname, search: q ? `?${q}` : "" }, { replace: true, state: location.state });
    void (async () => {
      try {
        const own = (r: SessionRecord) =>
          r.id === uploadParam && r.surface === "full-mock" && r.status !== "graded" && recordBelongsToUid(r, reviewUid);
        // This device's records first (a mock the Answer Checker found only locally), then the cloud list.
        let record = getSurfaceHistory("full-mock", reviewUid).find(own);
        if (!record) {
          try {
            record = (await getSessionRecordsFromCloud(reviewUid)).find(own);
          } catch {
            /* offline: nothing more to look at */
          }
        }
        if (record) await openPendingUpload(record);
      } catch {
        /* honest fallback: the plain page */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadParam, authLoading, reviewUid]);

  // The live (just graded) mock's saved record — only once it is in the student's store and holds
  // THIS grade (same graded marks), and only while the paper on screen is the record's paper.
  const liveRecord = useMemo(
    () =>
      activeMock && fullResponse
        ? records.find(
            (r) =>
              r.id === activeMock.code &&
              r.surface === "full-mock" &&
              r.status !== "pending-upload" &&
              r.marksAwarded === (Number(fullResponse.gradedMarksAwarded) || 0) &&
              r.marksTotal === (Number(fullResponse.gradedMarksTotal) || 0),
          ) ?? null
        : null,
    [records, activeMock, fullResponse],
  );
  const liveTutorAskFor = useMemo(() => {
    if (!liveRecord || !fullResponse || !activeMock) return undefined;
    const ask = fmTutorAskFor(liveRecord, fullResponse);
    return (qNumber: number): ScorecardTutorAsk | null => {
      const q = activeMock.paper.questions.find((pq) => pq.qNumber === qNumber);
      return q && String(q.id) === liveRecord.questionIds[qNumber - 1] ? ask(qNumber) : null;
    };
  }, [liveRecord, fullResponse, activeMock, fmTutorAskFor]);

  // ── Downloads (the triad — name + code on all three) ─────────────────────────
  const paperForExport = activeMock?.paper ?? draw?.paper ?? null;
  const codeForExport = activeMock?.code ?? nomen?.code;
  const nameForExport = activeMock?.name ?? paperName;
  // LIMITS-1: the weekly download limit (dark until VITE_LIMITS_ENABLED). A paper + its solutions share one key.
  const { guard: guardDownload, wall: downloadWall } = useLimitedDownload();
  const downloadPaper = useCallback(async () => {
    if (!paperForExport || downloading || !seriesDownloadAccess) return;
    // CT-RESUME-2: downloading the NEW draw (not the mock being sat) is a new paper.
    if (!activeMock && !claimNewPaperView(location.pathname, user?.uid ?? null, isPremium || (seriesAccess.ownsSeries && onSeriesPaper), location.search)) {
      setPaperNotice(inProgress ? NEW_PAPER_LIMIT_SAVED_LINE : NEW_PAPER_LIMIT_LINE);
      return;
    }
    setDownloading(true); // busy BEFORE the guard: it can take a moment, and a second tap must do nothing
    if (!(await guardDownload("full-mock", paperForExport.worksheetId, { subject: sessionSubject }))) {
      setDownloading(false);
      return;
    }
    try {
      await exportWorksheetPdf(paperForExport, "questions", codeForExport);
      recordServed(servedOwnerId, {
        surface: "full-mock",
        scope: sessionSubject,
        ids: paperForExport.questions.map((q) => String(q.id ?? "")),
      });
      // AWAIT-1-PAPERS: the downloaded paper is kept under the code PRINTED on it — a
      // pending-upload record (nothing graded) + the paper with no Section A result, no
      // timer and no focus — so "Upload now" can come back to THIS paper. Signed out: export
      // only (the note says so). A mock already submitted in the app is never replaced.
      if (codeForExport && nameForExport) {
        setDownloadedNote({ code: codeForExport, name: nameForExport });
        if (isSignedIn) {
          const dlPaper = paperForExport;
          const dl = { code: codeForExport, name: nameForExport };
          const mix =
            activeMock && activeMock.paper === dlPaper
              ? { pyqCount: activeMock.pyqCount, freshCount: activeMock.freshCount }
              : draw && draw.paper === dlPaper
                ? { pyqCount: draw.pyqCount, freshCount: draw.freshCount }
                : {};
          void recordPaperDownload({
            user,
            code: dl.code,
            paper: dlPaper,
            buildRecord: (response, uid) =>
              buildFullMockSessionRecord({ paper: dlPaper, code: dl.code, subject: sessionSubject, response, uid }),
            saveSnapshot: () =>
              saveFullMockPaperSnapshot(user, {
                code: dl.code,
                name: dl.name,
                subject,
                grade,
                paper: dlPaper,
                // Not a sitting: the download moment, and no in-app duration.
                startedAt: Date.now(),
                durationMs: 0,
                objective: null,
                downloaded: true,
                ...mix,
              }),
          })
            .then((outcome) => {
              if (outcome === "written") void loadRecords();
            })
            .catch(() => {
              /* best-effort: the PDF is already downloaded */
            });
        }
      }
    } catch {
      /* best-effort */
    } finally {
      setDownloading(false);
    }
  }, [paperForExport, codeForExport, nameForExport, downloading, isSignedIn, activeMock, draw, user, sessionSubject, subject, grade, loadRecords, servedOwnerId, location.pathname, isPremium, inProgress, guardDownload, seriesDownloadAccess, seriesAccess.ownsSeries, onSeriesPaper]);

  // AWAIT-1-PAPERS (owner ruling, option a): a downloaded mock's Section A was answered on
  // paper. The student taps those picks in; the EXISTING scorer scores them (0-or-full), and
  // from here it is an in-app submitted mock (partial record + paper copy + this device's
  // awaiting-upload session), minus anything timed: no focus is recorded or shown.
  const continueFromPicks = useCallback(
    async (picks: Record<number, string>) => {
      const snap = pickSnap;
      if (!snap) return;
      // Server first: if this mock was already continued (Section A entered, or graded) on
      // another device, write NOTHING here — say so and open its current state instead.
      const status = await readPaperRecordStatus(user, snap.code);
      if (!picksMayContinue(status)) {
        if (status === "unknown") {
          setPaperNotice(STATUS_UNKNOWN_LINE);
          return;
        }
        setPaperNotice(CONTINUED_ELSEWHERE_LINE);
        setPickSnap(null);
        setPhase("setup");
        const all = await loadRecords();
        const current = all.find((r) => r.id === snap.code && r.surface === "full-mock");
        if (current) await (current.status === "graded" ? openStored(current) : openPendingUpload(current));
        return;
      }
      setPaperNotice(null);
      const obj = scoreObjectiveSection(fullMockObjectiveQuestions(snap.paper), picks);
      const savedCode = await writeFullMockPartialRecord({
        user,
        paper: snap.paper,
        code: snap.code,
        subject: sessionSubject,
        response: buildFullMockResponse({
          paper: snap.paper,
          objective: obj,
          subjectiveQuestions: fullMockSubjectiveQuestions(snap.paper),
          subjectiveResponse: null,
        }),
      });
      const fin = savedCode && savedCode !== snap.code ? { code: savedCode, name: nameForCode(snap.name, savedCode) } : { code: snap.code, name: snap.name };
      saveFullMockSession(sessionUid, {
        code: fin.code,
        name: fin.name,
        subject: snap.subject,
        grade: snap.grade,
        paper: snap.paper,
        startedAt: snap.startedAt,
        durationMs: snap.durationMs,
        answers: {},
        flags: [],
        currentQNumber: 1,
        focus: { ...EMPTY_FOCUS },
        phase: "awaiting-upload",
        objective: obj,
        pyqCount: snap.pyqCount,
        freshCount: snap.freshCount,
        downloaded: true,
        updatedAt: Date.now(),
      });
      saveFullMockPaperSnapshot(user, {
        code: fin.code,
        name: fin.name,
        subject: snap.subject,
        grade: snap.grade,
        paper: snap.paper,
        startedAt: snap.startedAt,
        durationMs: snap.durationMs,
        objective: obj,
        downloaded: true,
        pyqCount: snap.pyqCount,
        freshCount: snap.freshCount,
      });
      const a: ActiveMock = {
        paper: snap.paper,
        code: fin.code,
        name: fin.name,
        startedAt: snap.startedAt,
        durationMs: snap.durationMs,
        pyqCount: snap.pyqCount,
        freshCount: snap.freshCount,
      };
      setActiveMock(a);
      activeRef.current = a;
      focusRef.current = { ...EMPTY_FOCUS };
      downloadedRef.current = true;
      submittedRef.current = true; // Section A entered — upload only
      setPickSnap(null);
      setObjective(obj);
      setFullResponse(null);
      setGradeError(null);
      setResultsPhase("partial");
      setScorecardOpen(false);
      setPhase("results");
      void loadRecords();
    },
    [pickSnap, user, sessionSubject, sessionUid, loadRecords, openStored, openPendingUpload],
  );
  const downloadSolution = useCallback(async () => {
    if (!paperForExport || downloading) return;
    setDownloading(true);
    if (!(await guardDownload("full-mock", paperForExport.worksheetId, { subject: sessionSubject }))) {
      setDownloading(false);
      return;
    }
    try {
      await exportWorksheetPdf(paperForExport, "answers", codeForExport);
    } catch {
      /* best-effort */
    } finally {
      setDownloading(false);
    }
  }, [paperForExport, codeForExport, downloading, guardDownload]);
  // LIMITS-1 PR-2 — the graded sheet is the per-answer detail: the SAME server lock as the scorecard
  // (same kind + key) decides whether this page may print it. "open" when the flag is off.
  const gradedSheetOpen =
    useDetailLock(
      fullResponse && activeMock ? { kind: "full-mock", resultKey: activeMock.code, worksheetId: activeMock.paper.worksheetId } : undefined,
      Boolean(fullResponse && fullResponse.gradedCount > 0),
    ) === "open";
  const downloadGraded = useCallback(async () => {
    const a = activeRef.current;
    if (!a || !fullResponse || downloading || !gradedSheetOpen) return;
    setDownloading(true);
    try {
      await exportGradedWorksheetPdf({
        ws: a.paper,
        response: fullResponse,
        name: a.name,
        code: a.code,
        coaching: coachingLine(fullResponse),
        kindLabel: GRADED_SHEET_KIND["full-mock"],
        gradedAt: fullGradedAtRef.current,
      });
    } catch {
      /* best-effort */
    } finally {
      setDownloading(false);
    }
  }, [fullResponse, downloading, gradedSheetOpen]);

  // ── Scorecard inputs (delta honest-or-silent · §8b focus line) ───────────────
  const deltaLine = useMemo(() => {
    if (!fullResponse || !activeMock) return null;
    const prev = mockRecords.find(
      (r) =>
        r.subject === sessionSubject &&
        r.status === "graded" &&
        r.id !== activeMock.code &&
        r.marksTotal === fullResponse.gradedMarksTotal &&
        r.marksTotal > 0 &&
        // TS-THEMES-1: a full mock compares only with full mocks, a focus set only with an earlier sitting of the SAME set.
        focusSetCodeOfWorksheetId(r.worksheetId) === focusSetCodeOfWorksheetId(activeMock.paper.worksheetId),
    );
    if (!prev) return null;
    const d = fullResponse.gradedMarksAwarded - prev.marksAwarded;
    if (d === 0) return null;
    // GUIDE-SCORE-1 — the hero's number format (no float noise), so Ziggy's line quotes it exactly.
    return `${d > 0 ? "▲" : "▼"} ${formatScoreNumber(Math.abs(d))} mark${Math.abs(d) === 1 ? "" : "s"} vs ${prev.title || prev.id}`;
  }, [fullResponse, activeMock, mockRecords, sessionSubject]);

  // TS-BOARDSCORE-1 (owner ruling 23 Nov 2026, 19:04 IST) - the board view: the honest full-paper line, the trend and the board
  // estimate, from THIS student's fully graded 80-mark full tests of THIS subject (graded SessionRecords - never
  // mockScoreHistory, which this page does not write). The paper on screen is the newest point; null unless it is fully graded
  // out of 80. Read-only: nothing is written.
  const boardScore = useMemo(() => {
    if (!fullResponse || !activeMock) return null;
    // TS-THEMES-1: a focus set is not a full board paper - no full-paper line, trend or board estimate on its scorecard.
    if (focusSetCodeOfWorksheetId(activeMock.paper.worksheetId)) return null;
    const current = {
      id: activeMock.code,
      score: fullResponse.gradedMarksAwarded,
      gradedAt: Number.MAX_SAFE_INTEGER, // always the newest point (fullTestScores appends it last)
    };
    // Owner ruling 23 Nov 2026, 19:59 IST: out of the paper's FULL marks; marks not marked yet are listed, never extrapolated.
    const ps = paperMarksScore(fullResponse);
    return buildBoardScoreView({
      paper: { awarded: ps.awarded, total: ps.total, pendingCount: fullResponse.pendingCount, notMarkedMarks: ps.notMarked?.marks ?? 0 },
      scores: fullTestScores(mockRecords, sessionSubject, { current }),
      estimateDisabled: boardEstimateDisabled(),
    });
  }, [fullResponse, activeMock, mockRecords, sessionSubject]);

  // Cheap per-render read: focusRef is frozen once the test ends, which is the
  // only time this line renders (partial + full scorecards).
  // AWAIT-1: a mock sat on paper shows no on-screen time line (none was measured).
  const focusLine = downloadedRef.current ? null : fullMockFocusLine(focusRef.current);

  // GUIDE-SCORE-1 — ONE worst-chapter route: the menu's practise action and Byte's link both use
  // it. Byte's link exists only when there IS a worst chapter (a single topic); else his
  // fallback is the Quick Practice hub.
  const worstChapterPractice = () => {
    const a = activeRef.current;
    const lens =
      a && fullResponse ? deriveFullMockChapterLens(fullResponse, a.paper.questions) : null;
    // LIVE-FIX-1 #4 - the SAME chapter the scorecard names as "your biggest loss": marks lost to mistakes, never not attempted.
    const worst = biggestMistakeLossRow(lens);
    const single = !!worst;
    const built = buildDesktopWorksheetPath({
      ...(single ? { scope: "topic" as const, topic: worst!.key } : { scope: "full-subject" as const }),
      subject,
      source: "full-mock",
      returnTo: seriesPaperUrl ?? `/full-mock/${grade}/${subject}`,
    });
    // TS-NAV-1: the worksheet page's Back row also reads `from=test-series` (returnTo is the paper itself, set above).
    const to = seriesPaperUrl ? withSeriesReturn(built, seriesPaperUrl) : built;
    return { to, target: single ? { to, chapter: worst!.label } : null };
  };
  const practiseWorstChapter = useCallback(() => {
    navigate(worstChapterPractice().to);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, subject, grade, fullResponse, seriesPaperUrl]);

  // TS-THEMES-1 (review nit): the written section(s) the upload / upgrade cards name - a focus set's own (e.g. "Section D"), else B–E.
  const writtenSectionsLabel =
    activeMock && focusSetCodeOfWorksheetId(activeMock.paper.worksheetId)
      ? focusSectionsLabel(fullMockSubjectiveQuestions(activeMock.paper).map((q) => String(q.section)))
      : "Sections B–E";
  const currentQuestion = activeMock?.paper.questions.find((q) => q.qNumber === currentQNumber) ?? null;
  const currentIsObjective = currentQuestion ? String(currentQuestion.section).toUpperCase() === "A" : false;
  const unansweredObjective = activeMock
    ? fullMockObjectiveQuestions(activeMock.paper).filter(
        (q) => !(answers[q.qNumber] && answers[q.qNumber] !== ""),
      ).length
    : 0;

  // TS-FIX-2: a graded sitting never keeps the "awaiting your answer sheet" banner alive.
  const pendingRecords = pendingMockRecords(listedMockRecords, fullResponse && activeMock ? activeMock.code : null);
  const awaitingCount = pendingRecords.length;

  // ══════════════════════════════════════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════════════════════════════════════

  return (
    <div className="lt-ct lt-fm">
      <style>{CT_CSS}</style>
      <style>{FM_CSS}</style>
      <UsageWarning scope="full-mock" snapshot={fairUse.snapshot} />
      {downloadWall}
      {tutorWall && <TutorBoardPassWall onClose={() => setTutorWall(false)} />}
      {paperNotice && (
        <div className="lt-paper-dl lt-paper-dl--signedout" role="status" data-testid="paper-notice">
          {paperNotice}
        </div>
      )}

      {/* Read-only re-open scorecard (history card / cross-device pending). */}
      {reopen && (
        <ResultsScorecard
          limitKey={{ kind: "full-mock", resultKey: reopen.record.id, worksheetId: reopen.record.worksheetId }} // LIMITS-1 PR-2 — stored re-open
          variant={withMarkOnPhoto(withPaperTutorAsks(storedFullMockScorecardVariant(reopen.record, {
            gradedDateLabel: new Date(reopen.record.gradedAt).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            }),
            response: reopen.response,
            awaitingDetail: reopen.awaitingDetail,
            // TS-BOARDSCORE-1 - the board view as of THIS record (papers graded at or before it), so it reads as the live card did.
            boardScore: focusSetCodeOfWorksheetId(reopen.record.worksheetId)
              ? null // TS-THEMES-1: a re-opened focus set has no board view either.
              : buildBoardScoreView({
                  paper: reopenBoardPaper(reopen.record, reopen.response),
                  scores: fullTestScores(mockRecords, reopen.record.subject, { asOf: { id: reopen.record.id, gradedAt: reopen.record.gradedAt } }),
                  estimateDisabled: boardEstimateDisabled(),
                }),
            ...(seriesDownloadAccess && reopenSheetOpen && hasStoredPaperSheet(reopen.response)
              ? { onDownloadGraded: () => void downloadReopenSheet(), downloading: reopenDownloading }
              : {}),
            onDone: () => setReopen(null),
            // LIVE-FIX-1 #5 - a record with answers not found on the pages offers its own upload step, only when its saved copy is
            // there (REVIEW NIT4); the step says to upload every page (REVIEW B2).
            onAddPage: reopen.canAddPages
              ? () => {
                  const record = reopen.record;
                  setReopen(null);
                  setAddingPages(true);
                  void openPendingUpload(record);
                }
              : undefined,
            // PAPER-REBUILD-1 (D103a): the no-paper state's way forward, through the setup's own start.
            onStartNew: reopen.noPaper
              ? () => {
                  setReopen(null);
                  startTest();
                }
              : undefined,
          }), reopen.response, fmTutorAskFor(reopen.record, reopen.response)), reopen.response, markContext("reopen") ? openMark("reopen") : null, markBusy)}
          onClose={() => setReopen(null)}
        />
      )}

      {/* MARK-ON-PHOTO-2 — point to one answer on the photo; only that question is graded and slotted back into this paper. */}
      {mark && markContext(mark.where)?.response.results[mark.index] && (
        <Suspense fallback={null}>
          <MarkOnPhotoDialog
            onTop
            label={`Q${markContext(mark.where)!.response.results[mark.index].qNumber}`}
            pages={mark.where === "fresh" ? uploadedPhotoPages(lastUploadRef.current) : []}
            busy={markBusy}
            error={markError}
            notice={
              fairUse.limit ? (
                <FairUseLimitPanel limit={fairUse.limit} offers={paperOffers} seriesOffer={fairUseSeriesOffer} tsOwner={seriesAccess.ownsSeries} />
              ) : !boardPassHolder && seriesPaperKeyOfWorksheetId(markContext(mark.where)!.paper.worksheetId) !== null ? (
                <p className="lt-mop-sub" data-testid="mark-uses-check">{ADD_PAGES_USES_CHECK_LINE}</p>
              ) : null
            }
            onSubmit={(image) => void submitMark(image)}
            onClose={() => {
              if (!markBusy) {
                setMark(null);
                setMarkError(null);
              }
            }}
          />
        </Suspense>
      )}

      {/* History overlay panel (worksheet pattern — spec §4). */}
      {panelOpen && (
        <FullMockHistoryPanel
          records={listedMockRecords}
          loading={recordsLoading}
          defaultSubject={sessionSubject}
          pendingOnly={panelPendingOnly}
          latestWeakLine={latestWeakLine}
          inProgress={
            inProgress
              ? {
                  code: inProgress.code,
                  name: inProgress.name,
                  remainingLabel: formatRemaining(remainingMs(inProgress)),
                }
              : null
          }
          onResume={resumeMock}
          onOpen={openStored}
          onUpload={openPendingUpload}
          onClose={() => {
            setPanelOpen(false);
            setPanelPendingOnly(false);
          }}
        />
      )}

      {/* ─────────────── SETUP ─────────────── */}
      {phase === "setup" && (
        <>
          <div className="lt-ct__pagebar">
            <button type="button" className="lt-ct__back" onClick={() => navigate(backTo)}>
              ← {backWord}
            </button>
            <span className="lt-ct__pagetitle">Full Mock</span>
            {seriesNavOn && seriesBack.to !== TEST_SERIES_NAV_PATH && <SeriesCrumb />}
            {/* GUIDE-PAGES-1 — Byte's "?" helper (first visit opens once; a fixed card, no shift). */}
            <PageGuide id="fm_entry" step="page" uid={user && !user.isLocalSession ? user.uid : null} placement="end" bare />
          </div>

          <div className="lt-ct__setup">
            <div className="lt-ct__setup-main">
              <div className="lt-fm__headrow">
                <div>
                  <div className="lt-ct__eyebrow" data-testid={seriesActive ? "fm-series-label" : undefined}>
                    {focusActive && focusSet
                      ? `${focusSetLabel(focusSet)} · ${subject}`
                      : seriesActive && seriesN
                        ? tsNav2Off
                          ? `${fullMockSeriesLabel(seriesN)} · ${subject}`
                          : `Test Series · ${subject}`
                        : `Full mock · ${subject}`}
                  </div>
                  <h1 className="lt-ct__fr" data-testid="fm-title">{paperName ?? `${subject} · Mock`}</h1>
                </div>
                <button type="button" className="lt-fm__hctl" onClick={() => setPanelOpen(true)}>
                  <span>Your mocks</span>
                  <span className="lt-fm__hctl-cnt">· {mockRecords.length}</span>
                  {/* TS-NAV-2: "Your mocks · 2 · 1 awaiting" - not "· 21 awaiting". */}
                  {awaitingCount > 0 && !tsNav2Off && (
                    <span className="lt-fm__hctl-cnt" data-testid="fm-hctl-sep">
                      {" "}·{" "}
                    </span>
                  )}
                  {awaitingCount > 0 && (
                    <span className="lt-fm__hctl-await">{awaitingCount} awaiting</span>
                  )}
                  <span className="lt-fm__hctl-caret">⌄</span>
                </button>
              </div>

              {inProgress && (
                <div className="lt-fm__resume">
                  <span>
                    ⏸ <b>{inProgress.name}</b> is in progress · {formatRemaining(remainingMs(inProgress, nowTick))} left.
                    Your answers and timer are saved.
                  </span>
                  <button type="button" className="lt-fm__resume-act" onClick={resumeMock}>
                    Resume →
                  </button>
                </div>
              )}

              {!bannerDismissed && (
                <FullMockPendingBanner
                  pending={pendingRecords}
                  onUpload={openPendingUpload}
                  onSeeAll={() => {
                    setPanelPendingOnly(true);
                    setPanelOpen(true);
                  }}
                  onDismiss={() => setBannerDismissed(true)}
                />
              )}

              <div className="lt-ct__card">
                {focusActive ? (
                  // TS-THEMES-1 — a focus set is one question type, written answers only: say so (no full-paper claims).
                  <div className="lt-ct__sub" data-testid="fm-focus-sub">
                    A short Test Series focus set: one question type, from different chapters, timed at board pace. Write your
                    answers on paper and upload them for step-by-step marking.
                  </div>
                ) : (
                <div className="lt-ct__sub">
                  A complete board paper — every chapter, CBSE&rsquo;s unit marks, real timing. Objective is
                  scored the moment you submit; write the rest on paper and upload for the full result.
                </div>
                )}

                {!draw && bank.error ? (
                  <div className="lt-ct__empty">
                    We couldn’t load the {subject} questions. Check your connection and reload the page.
                  </div>
                ) : !draw && codeCheckFailed ? (
                  <div className="lt-ct__empty" role="alert">
                    {RECORD_CODE_CHECK_FAILED_LINE}{" "}
                    <button type="button" className="lt-ct__btn" onClick={() => setMintNonce((n) => n + 1)}>
                      Try again
                    </button>
                  </div>
                ) : !draw ? (
                  <div className="lt-ct__empty">Building your mock…</div>
                ) : !draw.enoughQuestions ? (
                  <div className="lt-ct__empty">
                    We don’t have enough {subject} questions in the bank to build a fair board mock
                    yet. This subject is still being expanded — check back soon.
                  </div>
                ) : (
                  <>
                    <div className="lt-ct__metarow">
                      <span className="lt-ct__chip">
                        <b>{draw.paper.questions.length}</b> questions
                      </span>
                      <span className="lt-ct__chip">
                        <b>{draw.totalMarks}</b> marks
                      </span>
                      {focusActive ? (
                        <span className="lt-ct__chip" data-testid="fm-focus-minutes">
                          <b>{Math.round((seriesState?.durationMs ?? FM_DURATION_MS) / 60000)}</b> minutes
                        </span>
                      ) : (
                        <span className="lt-ct__chip">
                          <b>3</b> hours
                        </span>
                      )}
                      <span className="lt-ct__chip">
                        {focusActive ? "Written answers" : <>Sections <b>A–E</b></>}
                      </span>
                      <span className="lt-ct__chip">⏱ always timed</span>
                    </div>

                    <div className="lt-ct__blueprint">
                      {draw.blueprint.filter((row) => !focusActive || row.actualCount > 0).map((row) => (
                        <div
                          key={row.section}
                          className={`lt-ct__bp-row${row.actualCount === 0 ? " lt-ct__bp-row--empty" : ""}`}
                        >
                          <span>
                            <span className="lt-ct__sec-tag">{row.section}</span>
                            {row.label}
                          </span>
                          <span className="lt-ct__bp-meta">
                            {row.actualCount > 0
                              ? `${blueprintRowArithmetic(row)} · ${
                                  row.autoGraded ? "instant" : "upload"
                                }`
                              : "none available yet"}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* TS-THEMES-1: a one-type focus set has no unit-marks or CBQ-share target - those lines are for the full paper. */}
                    {!focusActive && (
                    <>
                    {/* SYLLABUS-FIX-CODE F3: marks per CBSE UNIT, the only split CBSE publishes
                        (src/config/syllabus2026-27.ts). No per-chapter claim. A unit the bank
                        could not fill shows its real marks against CBSE's, never a padded total. */}
                    <div className="lt-ct__histrail-h">
                      Marks per unit{" "}
                      <span className="lt-fm__lbl-soft">— by CBSE&rsquo;s unit marks</span>
                    </div>
                    <div className="lt-fm__wbar" aria-hidden="true">
                      {draw.unitMarks.map((u, i) => (
                        <i
                          key={u.unit}
                          className={`lt-fm__wseg lt-fm__g${unitBarGrow(u.target, draw.unitMarks)} lt-fm__c${i % WBAR_CLASSES}`}
                        />
                      ))}
                    </div>
                    <div className="lt-fm__wlegend">
                      {draw.unitMarks.map((u, i) => (
                        <div className="lt-fm__wlegend-item" key={u.unit}>
                          <span className={`lt-fm__wlegend-sw lt-fm__c${i % WBAR_CLASSES}`} />
                          {u.name}{" "}
                          {u.actual === u.target ? `${u.target} marks` : `${u.actual} of ${u.target} marks`}
                        </div>
                      ))}
                    </div>
                    </>
                    )}

                    <div className="lt-fm__mix">
                      This draw: <b>{draw.pyqCount}</b> past-year board question
                      {draw.pyqCount === 1 ? "" : "s"} · <b>{draw.freshCount}</b> fresh from the
                      LazyTopper bank.
                    </div>

                    {/* CBQ-1 PR-2: the paper's REAL CBQ share (target ≥ 40 of 80; CBSE pattern 50% competency); an honest note when short. */}
                    {!focusActive && (
                    <CbqShareNote
                      cbqMarks={draw.cbqMarks}
                      totalMarks={draw.totalMarks}
                      cbqShortfall={draw.cbqShortfall}
                      plainMcqMarks={draw.plainMcqMarks}
                      constructedMarks={draw.constructedMarks}
                      scope="subject"
                      scopeName={subject}
                    />
                    )}

                    {fairUse.limit ? <FairUseLimitPanel limit={fairUse.limit} onDismiss={fairUse.clearLimit} offers={paperOffers} seriesOffer={fairUseSeriesOffer} tsOwner={seriesAccess.ownsSeries} /> : null}

                    {/* GUIDE-PAGES-1 — reserved for COMPANION-1's optional pre-test "breathe" moment (renders nothing today). */}
                    <PreTestSlot surface="full_mock" />
                    <div className="lt-ct__startrow">
                      <button type="button" className="lt-ct__btn lt-ct__btn--primary" onClick={startTest}>
                        Start the mock →
                      </button>
                      {seriesDownloadAccess ? (
                        <button
                          type="button"
                          className="lt-ct__btn lt-ct__btn--ghost lt-ct__btn--sm"
                          onClick={downloadPaper}
                          disabled={downloading}
                        >
                          {downloading ? "Preparing…" : focusActive ? "⤓ Download this paper (PDF)" : "⤓ Download this paper (PDF) — recommended for a 3-hour sitting"}
                        </button>
                      ) : seriesAccess.checking ? (
                        <AccessChecking />
                      ) : (
                        <DownloadWithPlanLink />
                      )}
                      {seriesDownloadAccess && !hideDownloadChip && <LimitChip />}
                    </div>
                    {/* TS-THEMES-1: on a focus set the free-test note shows only when its written answers WILL be marked (no "MCQs marked free"
                        line on a paper with no MCQs); otherwise starting it shows the upgrade card below. */}
                    {isSignedIn && !seriesPaperAccess && !seriesAccess.checking && countTestsTaken(records) < FREE_TESTS_ALLOWED && (!focusActive || freeWritten) && <FreeTestNote written={freeWritten} />}
                    {signedOutSitting && (
                      <p className="lt-wcg__line" data-testid="ts-signed-out-note">
                        {SIGNED_OUT_TAKING_NOTE}
                      </p>
                    )}
                    {signedOutKept && (
                      <p className="lt-wcg__line" role="status" data-testid="ts-signed-out-restored">
                        {isSignedIn ? SIGNED_OUT_ATTEMPT_RESTORED_LINE : SIGNED_OUT_ATTEMPT_KEPT_LINE}
                      </p>
                    )}
                    {startWall && !seriesPaperAccess && focusActive && !freeWritten && !seriesAccess.checking && !seriesAccess.failed && (
                      <p className="lt-wcg__line" data-testid="fm-focus-free-unavailable">
                        A focus set has only written answers, and written marking for a free test is not available on it right now.
                      </p>
                    )}
                    {startWall && !seriesPaperAccess && (seriesAccess.failed ? <AccessFailed onRetry={seriesAccess.retry} /> : seriesAccess.checking ? <AccessChecking /> : <SeriesStartWall />)}

                    {downloadedNote && (
                      <PaperDownloadedNote
                        signedIn={isSignedIn}
                        code={downloadedNote.code}
                        label={downloadedNote.name}
                        path={location.pathname}
                        surface="full_mock"
                      />
                    )}
                    {/* PASS-OWNER-PACKS-1: a Board Pass owner who just downloaded this paper - ONE quiet line, this subject's Mock Pack. */}
                    {downloadedNote && isSignedIn && (
                      <PassOwnerOfferLazy placement="pass_download" hint={{ subject: sessionSubject }} />
                    )}

                    {/* CBSE-PAGE-1 — a real <Link>, deliberately OUTSIDE
                        .lt-ct__startrow (that rule gives buttons inside it flex:1,
                        so an extra child would have resized the existing two). */}
                    <Link
                      to={`/cbse/class-10?returnTo=${encodeURIComponent(seriesPaperUrl ?? `/full-mock/${grade}/${subject}`)}${seriesPaperUrl ? "&from=test-series" : ""}`
                        + `&backLabel=${encodeURIComponent(`Back to the ${subject} full mock`)}`
                        + `&subject=${subject.toLowerCase()}#papers`}
                      className="lt-ct__btn lt-ct__btn--ghost lt-ct__btn--sm"
                    >
                      See CBSE’s official marking scheme →
                    </Link>

                    <div className="lt-ct__honest">
                      <span>·</span>
                      <span>
                        {focusActive ? `This is a ${Math.round((seriesState?.durationMs ?? FM_DURATION_MS) / 60000)}-minute paper.` : "This is a 3-hour paper."} Your answers and timer are saved — if you’re
                        interrupted you can resume exactly where you left off. Your on-screen time is
                        recorded, like the real exam hall; leaving doesn’t pause the clock.{" "}
                        {seriesActive ? (
                          // TEST-SERIES-1 — a fixed paper: not a fresh draw, so no freshness claim.
                          <span data-testid="fm-series-line">
                            {focusActive && focusSet ? (
                              <>
                                <b>A Test Series focus set</b> — every student gets the same {subject} {focusSet.themeTitle.toLowerCase()} set {focusSet.n} ({focusSet.code}).
                              </>
                            ) : (
                              <>
                                <b>A Test Series paper</b> — every student gets the same {subject} Full-Length Test {seriesN}.
                              </>
                            )}
                            {seriesState && seriesState.missingIds.length > 0 ? (
                              // TS-PIN-1 - a pinned question that no longer exists anywhere is left out, never swapped for another.
                              <span data-testid="fm-series-missing">
                                {" "}
                                {seriesState.missingIds.length === 1 ? "One question" : `${seriesState.missingIds.length} questions`} on this paper {seriesState.missingIds.length === 1 ? "is" : "are"} no longer available and {seriesState.missingIds.length === 1 ? "has" : "have"} been left out (not replaced).
                              </span>
                            ) : null}
                          </span>
                        ) : draw && draw.repeatCount > 0 ? (
                          // FRESH-SET-TESTS — the honest line when a section's unseen pool ran out.
                          <b data-testid="fm-fresh-line" data-tone="repeats">
                            {freshnessLine({
                              repeats: draw.repeatCount,
                              total: draw.paper.questions.length,
                              hasHistory: draw.hasServedHistory,
                              servedShare: draw.servedShare,
                              repeatSections: draw.repeatSections,
                              scopeNoun: "subject",
                              setNoun: "mock",
                            })?.text}
                          </b>
                        ) : draw?.hasServedHistory ? (
                          <span data-testid="fm-fresh-line" data-tone="fresh">
                            <b>Each mock is a fresh draw</b> — different from your last.
                          </span>
                        ) : (
                          // A first-ever mock: no "last" to compare against, so no such claim.
                          <span data-testid="fm-fresh-line" data-tone="first">
                            <b>Each mock is a fresh draw</b> from the {subject} question bank.
                          </span>
                        )}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ─────────────── PICK (AWAIT-1: a downloaded paper's Section A) ─────────────── */}
      {phase === "pick" && pickSnap && (
        <>
          <div className="lt-ct__pagebar">
            <button type="button" className="lt-ct__back" onClick={() => navigate(backTo)}>
              ← {backWord}
            </button>
            <span className="lt-ct__pagetitle">Mock · Upload</span>
            {seriesNavOn && seriesBack.to !== TEST_SERIES_NAV_PATH && <SeriesCrumb />}
          </div>
          <SectionAPicker
            eyebrow={`Full mock · ${subject}`}
            name={pickSnap.name}
            code={pickSnap.code}
            questions={fullMockObjectiveQuestions(pickSnap.paper)}
            onContinue={continueFromPicks}
            onCancel={() => {
              setPickSnap(null);
              setPhase("setup");
            }}
          />
        </>
      )}

      {/* ─────────────── TAKING (full screen, always timed) ─────────────── */}
      {/* TS-FREE-SIGNEDOUT: a signed-out submit - sign in to get the kept answers marked (nothing is marked here). */}
      {phase === "taking" && signInAsk && (
        <div className="lt-ct__fs">
          <SignInToMarkCard onSignIn={goSignInToMark} onBack={signInAsk.timeUp ? null : backToPaperSignedOut} />
        </div>
      )}
      {/* review nit 1: a kept attempt back after sign-in with its time run out - answers locked; the student taps submit. */}
      {phase === "taking" && !signInAsk && timeUpLocked && activeMock && (
        <div className="lt-ct__fs">
          {/* the lock stays on through submit (it leaves "taking" for the results); every Start / resume resets it */}
          <TimeUpSubmitCard onSubmit={finishToPartial} />
        </div>
      )}
      {phase === "taking" && !signInAsk && !timeUpLocked && activeMock && currentQuestion && (
        <div className="lt-ct__fs">
          <div className="lt-ct__fsbar">
            <div className="lt-ct__fsbar-l">
              {activeMock.name}
              <small>
                Section {currentQuestion.section} · Q{currentQNumber} of {activeMock.paper.questions.length}
              </small>
            </div>
            <div className="lt-ct__timer">
              <span className="lt-ct__save">✓ saved</span>
              <button type="button" className="lt-fm__pausebtn" onClick={focusCtl.pause}>
                ⏸ Pause
              </button>
              <span
                className={`lt-ct__clock${remaining < 10 * 60 * 1000 ? " lt-ct__clock--low" : ""}`}
              >
                ⏱ {formatRemaining(remaining)}
              </span>
              <button type="button" className="lt-ct__exit" onClick={() => setShowConfirm(true)}>
                Submit &amp; exit →
              </button>
              <button
                type="button"
                className="lt-ct__flag"
                onClick={() => setShowExitConfirm(true)}
                aria-label="Leave the mock"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="lt-ct__track">
            {activeMock.paper.questions.map((q) => (
              <span key={q.qNumber} className={`lt-ct__seg${q.qNumber <= currentQNumber ? " lt-ct__seg--on" : ""}`} />
            ))}
          </div>

          {focusCtl.awayNotice && (
            <div className="lt-fm__away" role="status">
              <span>{focusCtl.awayNotice}</span>
              <button type="button" onClick={focusCtl.dismissAwayNotice} aria-label="Dismiss">
                ✕
              </button>
            </div>
          )}

          <div className="lt-ct__fsbody">
            <div className="lt-ct__fsq">
              <div className="lt-ct__sechead">
                {SECTION_HEAD[currentQuestion.section] ?? `Section ${currentQuestion.section}`}
              </div>
              <div className="lt-ct__qhead">
                <div className="lt-ct__qnum lt-ct__fr">Q{currentQNumber}.</div>
                <button
                  type="button"
                  className={`lt-ct__flag${flags.has(currentQNumber) ? " lt-ct__flag--on" : ""}`}
                  onClick={() => toggleFlag(currentQNumber)}
                >
                  ⚑ {flags.has(currentQNumber) ? "Flagged" : "Flag for review"}
                </button>
              </div>
              <span className={`lt-ct__qtag${currentIsObjective ? "" : " lt-ct__qtag--sa"}`}>
                {currentIsObjective
                  ? `Objective · ${currentQuestion.marks} mark · auto-graded`
                  : `${currentQuestion.marks}-mark · write on paper ✍️`}
              </span>
              <div className="lt-ct__qtext">
                <MathText text={currentQuestion.questionText} />
              </div>

              {/* FIGURE-HONESTY-1 PR-2 — see ChapterTestPage. Bound figure renders here;
                  unbound renders nothing, so this surface is unchanged from today. */}
              <QuestionVisualAid
                subject={currentQuestion.subject}
                topicKey={currentQuestion.topicKey}
                questionText={currentQuestion.questionText}
                marks={currentQuestion.marks}
                questionId={String(currentQuestion.id)}
              />

              {currentIsObjective && currentQuestion.options ? (
                <div>
                  {currentQuestion.options.map((opt, oi) => {
                    const sel = answers[currentQNumber] === opt;
                    return (
                      <button
                        key={oi}
                        type="button"
                        className={`lt-ct__opt${sel ? " lt-ct__opt--sel" : ""}`}
                        onClick={() => pickOption(currentQNumber, opt)}
                      >
                        <span className="lt-ct__opt-k">{String.fromCharCode(65 + oi)}</span>
                        <MathText text={opt} />
                      </button>
                    );
                  })}
                  <div className="lt-ct__honest">
                    <span>·</span>
                    <span>MCQs are scored instantly — no working needed, exactly like the board.</span>
                  </div>
                </div>
              ) : (
                <div className="lt-ct__subjbox">
                  <b>Write this one on paper ✍️</b>
                  Label it “Q{currentQNumber}”. Upload all written answers at the end — shows as “to
                  upload” in the navigator.
                </div>
              )}

              <div className="lt-ct__fsactions">
                <button
                  type="button"
                  className="lt-ct__btn lt-ct__btn--ghost"
                  onClick={() => setCurrentQNumber((n) => Math.max(1, n - 1))}
                  disabled={currentQNumber <= 1}
                >
                  ← Previous
                </button>
                {currentQNumber < activeMock.paper.questions.length ? (
                  <button
                    type="button"
                    className="lt-ct__btn lt-ct__btn--primary"
                    onClick={() =>
                      setCurrentQNumber((n) => Math.min(activeMock.paper.questions.length, n + 1))
                    }
                  >
                    Next →
                  </button>
                ) : (
                  <button type="button" className="lt-ct__btn lt-ct__btn--primary" onClick={() => setShowConfirm(true)}>
                    Submit &amp; exit →
                  </button>
                )}
              </div>
            </div>

            <ChapterTestNavigator
              questions={activeMock.paper.questions}
              currentQNumber={currentQNumber}
              answers={answers}
              flags={flags}
              onJump={setCurrentQNumber}
            />
          </div>

          {focusCtl.paused && (
            <div className="lt-fm__pause" role="dialog" aria-modal="true" aria-label="Paused">
              <div className="lt-fm__pause-box">
                <div className="lt-fm__pause-h lt-ct__fr">Paused — but the clock isn’t</div>
                <p className="lt-fm__pause-p">
                  Like the real exam hall, the clock keeps running while you’re away. Come back when
                  you’re ready — your answers are saved.
                </p>
                <div className="lt-fm__pause-clock">⏱ {formatRemaining(remaining)} left</div>
                <button type="button" className="lt-ct__btn lt-ct__btn--primary" onClick={focusCtl.resumeFromPause}>
                  Back to the paper →
                </button>
              </div>
            </div>
          )}

          {showConfirm && (
            <PreSubmitConfirm
              title="Submit your mock?"
              timeLeftLabel={remaining > 0 ? formatRemaining(remaining) : undefined}
              unanswered={unansweredObjective}
              flagged={flags.size}
              onKeepWorking={() => setShowConfirm(false)}
              onSubmit={() => {
                setShowConfirm(false);
                finishToPartial();
              }}
            />
          )}

          {showExitConfirm && (
            <div
              className="lt-ct__confirm"
              role="dialog"
              aria-modal="true"
              aria-label="Leave the mock"
              onClick={() => setShowExitConfirm(false)}
            >
              <div className="lt-ct__confirm-box" onClick={(e) => e.stopPropagation()}>
                <h3 className="lt-ct__confirm-h lt-ct__fr">Leave the mock?</h3>
                <p className="lt-ct__confirm-p">
                  Your answers and timer are saved — you can resume exactly where you left off from
                  “Your mocks”. <b>The clock keeps running</b>, just like the exam hall.
                </p>
                <div className="lt-ct__confirm-row">
                  <button type="button" className="lt-ct__btn lt-ct__btn--ghost" onClick={() => setShowExitConfirm(false)}>
                    Keep working
                  </button>
                  <button
                    type="button"
                    className="lt-ct__btn lt-ct__btn--primary"
                    onClick={() => {
                      setShowExitConfirm(false);
                      persistTaking();
                      setPhase("setup");
                    }}
                  >
                    Save &amp; leave →
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─────────────── RESULTS (two-phase) ─────────────── */}
      {phase === "results" && activeMock && objective && (
        <>
          <div className="lt-ct__pagebar">
            <button type="button" className="lt-ct__back" onClick={() => navigate(backTo)}>
              ← {backWord}
            </button>
            <span className="lt-ct__pagetitle">Mock · Result</span>
            {seriesNavOn && seriesBack.to !== TEST_SERIES_NAV_PATH && <SeriesCrumb />}
          </div>

          {resultsPhase === "partial" && fairUse.limit ? <FairUseLimitPanel limit={fairUse.limit} offers={paperOffers} seriesOffer={fairUseSeriesOffer} tsOwner={seriesAccess.ownsSeries} /> : null}
          {paperWall && (seriesAccess.ownsSeries ? (
            <SeriesOwnerNotice onClose={() => setPaperWall(false)} worksheetId={activeMock.paper.worksheetId} status={seriesAccess.status} />
          ) : (
            <UpgradeSheet featureLabel="Grading your full mock" offers={paperOffers} onClose={() => setPaperWall(false)} />
          ))}

          {resultsPhase === "partial" && (
            <GradingJobRows
              progress={jobUi.progress}
              interrupted={jobUi.interrupted}
              onGradeRemaining={
                jobUi.interrupted && lastUploadRef.current
                  ? () => void handleGrade(lastUploadRef.current!, { continueFrom: jobUi.interrupted! })
                  : undefined
              }
              busy={grading}
            />
          )}
          {resultsPhase === "partial" ? (
            <ResultAccessSlot
              access={seriesAccess}
              uploadAllowed={seriesPaperAccess || freeWritten || isBeforeSeriesRules(Date.parse(activeMock.paper.createdAt))}
              worksheetId={activeMock.paper.worksheetId}
              upgrade={
                <WrittenCheckUpgradeCard
                  eyebrow="Full Mock · Result"
                  name={activeMock.name}
                  code={activeMock.code}
                  objective={{ awarded: objective.awarded, total: objective.total }}
                  sectionsLabel={writtenSectionsLabel}
                  onDone={() => setPhase("setup")}
                />
              }
              upload={
                <>
                  {/* REVIEW B2 - the upload step opened by "Upload all pages again": every page, and what it costs on a series paper. */}
                  {addingPages && (
                    <p className="lt-ct__nfna" data-testid="add-pages-banner">
                      <b>{ADD_PAGES_UPLOAD_BANNER}</b>
                      {onSeriesPaper && !boardPassHolder ? ` ${ADD_PAGES_USES_CHECK_LINE}` : ""}
                    </p>
                  )}
                  {/* TS-PACK-1: a Test Series Pack owner sees how many checks this series paper has left. */}
                  <SeriesChecksLeftLine uid={user?.uid ?? null} worksheetId={activeMock.paper.worksheetId} refreshKey={`${resultsPhase}:${grading}`} freeTest={freeWritten} notCountedReason={addingPages ? notCountedReasonOf(fullResponse?.results) : null} />
                  <ChapterTestUploadPanel
                    eyebrow="Full Mock · Result"
                    sectionsLabel={writtenSectionsLabel}
                    name={activeMock.name}
                    code={activeMock.code}
                    objective={{ awarded: objective.awarded, total: objective.total }}
                    grading={grading}
                    error={gradeError}
                    isSignedIn={isSignedIn}
                    onGrade={(upload) => void handleGrade(upload)}
                    stageLabel={grading && gradeStage?.kind === "retrying" ? gradingStageLabel(gradeStage) : null}
                    onSkip={() => setPhase("setup")}
                  />
                </>
              }
            />
          ) : (
            <div className="lt-ct__upload">
              <div className="lt-ct__uploadcard">
                <div className="lt-ct__eyebrow">Full Mock · Result</div>
                <div className="lt-ct__title lt-ct__fr">{activeMock.name}</div>
                <div className="lt-ct__sub">
                  {/* TS-BOARDSCORE-1 - consistent with the hero: out of the paper's full marks; "fully graded" only when it is. */}
                  {activeMock.code} · {fullResponse ? resultCardParts(fullResponse).status : "graded"} —{" "}
                  <b>{fullResponse ? resultCardParts(fullResponse).score : null}</b>
                  {fullResponse ? resultCardParts(fullResponse).tail : ""}
                </div>
                <SeriesChecksLeftLine uid={user?.uid ?? null} worksheetId={activeMock.paper.worksheetId} refreshKey={`${resultsPhase}:${grading}`} freeTest={freeWritten} notCountedReason={notCountedReasonOf(fullResponse?.results)} />
                <NotFoundAddPageLine response={fullResponse} onAddPage={addMissingPage} />
                {/* MARK-ON-PHOTO-2 — the same action as the scorecard's, for each question that can be pointed to on the photo. */}
                {bankMarkableRows(fullResponse).length > 0 && (
                  <p className="lt-ct__nfna" data-testid="fm-mark-on-photo">
                    <b>{MARK_ON_PHOTO_ACTION}</b> — point to your answer on the photo; only that question is marked.
                    {bankMarkableRows(fullResponse).map((r) => (
                      <button
                        key={r.index}
                        type="button"
                        className="lt-ct__nfna-btn"
                        data-testid="fm-mark-on-photo-btn"
                        aria-label={`${MARK_ON_PHOTO_ACTION} for Q${r.qNumber}`}
                        disabled={markBusy}
                        onClick={() => openMark("fresh")(r.index)}
                      >
                        Q{r.qNumber}
                      </button>
                    ))}
                  </p>
                )}
                <div className="lt-ct__startrow">
                  <button type="button" className="lt-ct__btn lt-ct__btn--primary" onClick={() => setScorecardOpen(true)}>
                    View scorecard
                  </button>
                  {seriesDownloadAccess && (
                  <>
                  {gradedSheetOpen && (
                  <button
                    type="button"
                    className="lt-ct__btn lt-ct__btn--ghost lt-ct__btn--sm"
                    onClick={downloadGraded}
                    disabled={downloading}
                  >
                    {downloading ? "Preparing…" : "⤓ Graded sheet"}
                  </button>
                  )}
                  </>
                  )}
                  {seriesDownloadAccess && (
                  <button
                    type="button"
                    className="lt-ct__btn lt-ct__btn--ghost lt-ct__btn--sm"
                    onClick={downloadSolution}
                    disabled={downloading}
                  >
                    ⤓ Solution key
                  </button>
                  )}
                </div>
                <div className="lt-ct__honest">
                  <span>·</span>
                  <span>
                    Solution-key marks follow the <b>real CBSE scheme per step</b> (variable, not a
                    flat 1/step). Saved as <b>{activeMock.name}</b> — now in “Your mocks” and feeding
                    Me / Progress.
                  </span>
                </div>
              </div>
              {/* PASS-OWNER-PACKS-1: a fully graded mock - ONE card under the result, this subject's Mock Pack (Board Pass owners only). */}
              <PassOwnerOfferLazy placement="pass_mock" hint={{ subject: sessionSubject }} />
            </div>
          )}

          {/* TS-ANALYSIS-1 — re-attempt / time per question / weakest chapters / plan / notebook. */}
          <Suspense fallback={null}>
            <TestAnalysisPanel
              surface="full-mock"
              subject={subject === "Science" ? "Science" : "Maths"}
              uid={user?.uid ?? null}
              current={{
                worksheetId: activeMock.paper.worksheetId,
                title: activeMock.name,
                // A resumed/stored objective may carry no per-question results: then only a full grade feeds the panel.
                response:
                  resultsPhase === "full" && fullResponse
                    ? fullResponse
                    : !Array.isArray(objective.results)
                      ? null
                      : buildFullMockResponse({
                        paper: activeMock.paper,
                        objective,
                        subjectiveQuestions: fullMockSubjectiveQuestions(activeMock.paper),
                        subjectiveResponse: null,
                      }),
                questionIds: [...activeMock.paper.questions].sort((x, y) => x.qNumber - y.qNumber).map((q) => String(q.id ?? "")),
              }}
              secondsPerMark={FULL_MOCK_SECONDS_PER_MARK}
              returnTo={seriesPaperUrl ? withScorecardReviewParam(seriesPaperUrl, activeMock.code) : location.pathname}
            />
          </Suspense>

          {scorecardOpen && resultsPhase === "partial" && (
            <ResultsScorecard
              askFirstFeedback // FIRST-FEEDBACK-1 — live, just-graded scorecard only
              variant={withSeriesWorksheet(fullMockScorecardVariant({
                // TS-UX-SCORE-1: the SAME allow-logic the paywall below uses (ResultAccessSlot `uploadAllowed`); while the read is
                // pending or failed the page shows neither paywall nor card, so the scorecard keeps today's upload prompt.
                uploadNotAllowed: scorecardUploadNotAllowed({ canCheck: seriesPaperAccess || freeWritten, createdMs: Date.parse(activeMock.paper.createdAt), checking: seriesAccess.checking, failed: seriesAccess.failed }),
                name: activeMock.name,
                code: activeMock.code,
                phase: "partial",
                response: buildFullMockResponse({
                  paper: activeMock.paper,
                  objective,
                  subjectiveQuestions: fullMockSubjectiveQuestions(activeMock.paper),
                  subjectiveResponse: null,
                }),
                focusLine,
                onUpload: () => setScorecardOpen(false),
                onUploadLater: () => {
                  setScorecardOpen(false);
                  setPhase("setup");
                },
              }), activeMock.paper.worksheetId)}
              onClose={() => setScorecardOpen(false)}
            />
          )}

          {scorecardOpen && resultsPhase === "full" && fullResponse && (
            <ResultsScorecard
              askFirstFeedback // FIRST-FEEDBACK-1 — live, just-graded scorecard only
              limitKey={{ kind: "full-mock", resultKey: activeMock.code, worksheetId: activeMock.paper.worksheetId }} // LIMITS-1 PR-2 — Full Mock surface
              variant={withMarkOnPhoto(withSeriesWorksheet(withSaleMock(withPaperTutorAsks(withGuideTarget(fullMockScorecardVariant({
                name: activeMock.name,
                code: activeMock.code,
                phase: "full",
                response: fullResponse,
                questions: activeMock.paper.questions,
                deltaLine,
                focusLine,
                boardScore,
                downloading,
                // GRADED-STEP-BLOCK - the read-sheet action now TAKES the student to their
                // graded answer sheet inside the open scorecard, instead of closing the panel.
                // It was never a dead handler: the identical call is CORRECT on Check & Improve,
                // which renders a bespoke graded view in the page body underneath. This surface
                // has no such view, so closing dropped the student onto a summary card whose only
                // primary action reopened the panel they had just left - a loop with no way on.
                onReadSheet: revealGradedSheet,
                // LIVE-FIX-1 #5 - "If you answered these, upload all your pages again, including the missing one": back to this paper's upload step (re-upload rules unchanged).
                onAddPage: addMissingPage,
                onPractiseChapter: () => {
                  setScorecardOpen(false);
                  practiseWorstChapter();
                },
                // TEST-SERIES-1: the PDFs are for a Test Series / Board Pass holder.
                ...(seriesDownloadAccess
                  ? {
                      onDownloadGraded: () => {
                        setScorecardOpen(false);
                        void downloadGraded();
                      },
                      onDownloadSolution: () => {
                        setScorecardOpen(false);
                        void downloadSolution();
                      },
                    }
                  : {}),
              }), worstChapterPractice().target), fullResponse, liveTutorAskFor), sessionSubject), activeMock.paper.worksheetId), fullResponse, openMark("fresh"), markBusy)}
              onClose={() => setScorecardOpen(false)}
            />
          )}
        </>
      )}
    </div>
  );
}
