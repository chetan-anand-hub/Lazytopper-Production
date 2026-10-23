// src/pages/ChapterTestPage.tsx
//
// CHAPTER TEST — built to LazyTopper_ChapterTest_Design_Spec_LOCKED_2026-07-07 +
// mockup v4. The legacy practice-set implementation (generatePracticeSet + Math.random
// draw + self-marking + masteryLevelService) is fully REPLACED — those are abandoned
// concepts (D-PROG-10 + a past fabrication finding), not reused. The route/entry in
// App.tsx is untouched; this is the page it points at.
//
// Sourcing: the canonical bank via chapterTestBlueprint (decision D1, native path —
// no fabricated field). Grading: two-phase (spec §5) — Section A objective auto-graded
// 0-or-full on submit (PR-348 invariant); Sections B–D subjective via answer-sheet
// upload through the SHARED grader (chapterTestGradeService, byte-unchanged grader).
// Scorecard: the Universal <ResultsScorecard> chapter-test variant (partial → full with
// the by-section A–D lens). Records: sessionRecords surface "chapter-test" + durable
// CT-{S}-{TOPIC}-{NN}. ONE responsive component (pure-CSS reflow, no useIsDesktop twin).

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams, useLocation } from "react-router-dom";
import { resolveTopicDisplayName, normalizeTopicKey } from "../utils/topicResolver";
import { resolveCanonicalSlug } from "../data/syllabus/canonicalTopicSlug";
import { useAuth } from "../context/AuthContext";
import { trackUxEvent } from "../services/uxTelemetry";
import { PageGuide } from "../components/guide/pages/pageGuides";
import { PreTestSlot } from "../components/guide/pages/preTestSlot";
import { MathText, loadKatex } from "../components/question/MathText";
import { QuestionVisualAid } from "../components/question/QuestionVisualAid";
import type { WorksheetGradeResponse } from "../ai/aiClient";
import type { PersistedWorksheet } from "../services/worksheetSessionStore";
import {
  coachingLine as sharedCoachingLine,
  effectivePaperCounts,
  isQuestionNotAttempted,
  gradeStateOf,
  pendingBreakdown,
  paperMarksLost,
} from "../lib/mistakeDisplay";
import {
  getSessionRecordsFromCloud,
  getSessionPerQuestion,
  chapterTestSequence,
  chapterTestNomenclature,
  buildChapterTestSessionRecord,
  type SessionRecord,
  type SessionSubject,
} from "../services/sessionRecords";
import {
  drawChapterTest,
  describeChapterTestPaper,
  type ChapterTestPaperFacts,
  objectiveQuestions,
  subjectiveQuestions,
  type DrawnChapterTest,
} from "../components/chaptertest/chapterTestBlueprint";
import { CbqShareNote } from "../lib/cbq/CbqShareNote";
import { CT_PROGRESS_PREFIX, paperRouteKey } from "../lib/papers/resumablePaper";
import { claimNewPaperView, NEW_PAPER_LIMIT_LINE, NEW_PAPER_LIMIT_SAVED_LINE } from "../components/auth/MockViewGate";
import { useSubscription } from "../hooks/useSubscription";
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
  scoreObjectiveSection,
  buildChapterTestResponse,
  writeChapterTestPartialRecord,
  gradeChapterTestUpload,
  type ObjectiveScore,
} from "../services/chapterTestGradeService";
import {
  saveChapterTestPaper,
  loadChapterTestPaper,
  deleteChapterTestPaper,
  needsSectionAPicks,
  type ChapterTestPaperSnapshot,
} from "../services/chapterTestPaperStore";
// AWAIT-1-PAPERS — a downloaded paper is kept, its code shown, and Section A tapped in at upload.
import {
  CONTINUED_ELSEWHERE_LINE,
  STATUS_UNKNOWN_LINE,
  picksMayContinue,
  readPaperRecordStatus,
  recordPaperDownload,
} from "../components/papers/paperDownloadRecord";
import PaperDownloadedNote from "../components/papers/PaperDownloadedNote";
import SectionAPicker from "../components/papers/SectionAPicker";
// BANK-LEAN-1 (C3): the chapter-test variants join to the question bank (by-concept
// lens), so they live in scorecardBankLenses — scorecardVariants stays bank-free.
import {
  chapterTestScorecardVariant,
  storedChapterTestScorecardVariant,
} from "../components/results/scorecardBankLenses";
import ResultsScorecard, { revealGradedSheet } from "../components/results/ResultsScorecard";
// FOLLOWUPS-1 B — the scorecard's tutor hop + the tutor's return to THIS saved scorecard.
import {
  chapterTestDeltaLine,
  withGuideTarget,
  withPaperTutorAsks,
  type ScorecardTutorAsk,
} from "../components/results/scorecardVariants";
import { trackOnboardingEvent } from "../analytics/analytics";
import { buildTutorPath } from "./tutor/tutorPath";
import {
  SCORECARD_REVIEW_PARAM,
  recordBelongsToUid,
  savedPaperQuestionHop,
  searchWithoutReview,
  withScorecardReviewParam,
} from "./tutor/tutorRoundTrip";
import { exportWorksheetPdf, exportGradedWorksheetPdf } from "../components/worksheet/worksheetPdfExport";
import { CT_CSS } from "../components/chaptertest/chapterTestStyles";
import ChapterTestNavigator from "../components/chaptertest/ChapterTestNavigator";
import ChapterTestHistoryRail from "../components/chaptertest/ChapterTestHistoryRail";
import ChapterTestUploadPanel from "../components/chaptertest/ChapterTestUploadPanel";
import PreSubmitConfirm from "../components/chaptertest/PreSubmitConfirm";
import { useBankChapters } from "../data/bankChapters/useBankChapters";
// FAIR-USE-UI-1 — the fair-use panel (UI1 at grading, UI3 before the test starts).
// Dark unless /api/usage/me says `enforced: true`: with it off this page is unchanged.
import FairUseLimitPanel from "../components/usage/FairUseLimitPanel";
import UsageWarning from "../components/usage/UsageWarning";
import { useFairUse } from "../components/usage/useFairUse";
import { gradingErrorMessage } from "../ai/gradingTransport";
import { resumableJob, sessionJobStore, type GradingJobInterruptedError } from "../ai/gradingJobs";
import GradingJobRows from "../components/grading/GradingJobRows";
import { useGradingJob } from "../components/grading/useGradingJob";

// "pick" (AWAIT-1): a downloaded paper's Section A picks, before its upload step.
type Phase = "setup" | "taking" | "results" | "pick";
type SubjectKey = "Maths" | "Science";

const SECTION_HEAD: Record<string, string> = {
  A: "Section A · Objective · 1 mark each",
  B: "Section B · Very short answer · 1–2 marks",
  C: "Section C · Short answer · 3 marks",
  D: "Section D · Long / case",
};
const SECTION_MARK_HINT: Record<string, string> = {
  B: "write on paper ✍️",
  C: "write on paper ✍️",
  D: "write on paper ✍️",
};

function subjectFromParam(raw: string): SubjectKey {
  return raw?.toLowerCase().includes("science") ? "Science" : "Maths";
}
function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, "0")}`;
}
function mintChapterTestId(): string {
  return `ct-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
/** Product-voice coaching line for the graded PDF, from the counts (never raw model
 *  prose). Honest about what was lost, forward-pointing. */
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
    practiseWhat: "this chapter",
  });
}

/** J2 — what a Chapter Test background grade stores beside its job, to resume after a reload. */
interface ChapterTestJobContext {
  paper: PersistedWorksheet;
  objective: ObjectiveScore;
  code: string;
  name: string;
}

function readChapterTestJobContext(raw: unknown): ChapterTestJobContext | null {
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Partial<ChapterTestJobContext>;
  if (!c.paper || !Array.isArray(c.paper.questions) || typeof c.paper.worksheetId !== "string") return null;
  if (!c.objective || typeof c.code !== "string" || typeof c.name !== "string") return null;
  return c as ChapterTestJobContext;
}

export default function ChapterTestPage() {
  const params = useParams<"grade" | "subject" | "topicKey">();
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();

  const grade = params.grade || "10";
  const subject = subjectFromParam(params.subject || sp.get("subject") || "Maths");
  const sessionSubject: SessionSubject = subject === "Science" ? "science" : "maths";
  const rawTopicKey = params.topicKey || sp.get("topic") || "";
  const topicKey = normalizeTopicKey(rawTopicKey) || rawTopicKey;
  const topicName = resolveTopicDisplayName(subject, topicKey);
  const isSignedIn = !!user?.uid && !user?.isLocalSession;
  const fairUse = useFairUse("chapter-test", isSignedIn);
  // CT-RESUME-2: premium is unlimited on the daily paper gate — read live, so a student who pays
  // mid-session (or whose cloud status lands after the gate ran) is never refused a new paper.
  const { isPremium } = useSubscription();

  const navState = (location.state as { back?: string; backLabel?: string } | null) || null;
  const backTo = navState?.back || `/topic-hub/${grade}/${subject.toLowerCase()}/${topicKey}`;
  const backLabel = navState?.backLabel || `Back to ${topicName} · Topic Hub`;

  // ── Durable identity + the fresh draw ────────────────────────────────────────
  const [nomen, setNomen] = useState<{ code: string; name: string } | null>(null);
  // FRESH-SET-TESTS — the served history + seed, snapshotted ONCE with the nomenclature so the
  // drawn paper never changes under the student (a later records reload must not redraw it).
  const [freshInputs, setFreshInputs] = useState<{ servedAt: ServedAt; seed: number } | null>(null);
  const [records, setRecords] = useState<SessionRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [drawNonce] = useState(0);

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

  // On mount: read the cross-device records ONCE, mint the durable CT code/#NN from
  // them (mint-once, BEFORE any record is written), and populate the history rail.
  useEffect(() => {
    let live = true;
    (async () => {
      setRecordsLoading(true);
      const all = await loadRecords();
      if (!live) return;
      const seq = chapterTestSequence(all, sessionSubject, topicKey);
      const nm = chapterTestNomenclature(sessionSubject, topicKey, topicName, seq);
      const owner = servedOwner(isSignedIn ? user?.uid : null);
      const log = loadServedLog(owner);
      const scope = resolveCanonicalSlug(topicKey) || topicKey;
      setFreshInputs({
        servedAt: servedAtFor({ surface: "chapter-test", records: all, log }),
        seed: mintDrawSeed({
          owner,
          surface: "chapter-test",
          scope,
          attempt: seq + attemptsLogged(log, "chapter-test", scope),
        }),
      });
      setNomen({ code: nm.code, name: nm.name });
      setRecordsLoading(false);
    })();
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, topicKey, sessionSubject]);

  // BANK-SPLIT-1 PR-2 (L4): the draw reads this chapter from the per-chapter cache, so it
  // waits until the chapter chunk has loaded (the "Building your test…" state covers it).
  const bank = useBankChapters([topicKey]);

  const draw: DrawnChapterTest | null = useMemo(() => {
    if (!nomen || !bank.ready) return null;
    return drawChapterTest({
      subject,
      topicKey,
      topicLabel: topicName,
      grade,
      worksheetId: mintChapterTestId(),
      code: nomen.code,
      name: nomen.name,
      // FRESH-SET-TESTS — unseen questions first; seeded, never Math.random.
      seed: freshInputs?.seed,
      servedAt: freshInputs?.servedAt,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nomen, bank.ready, subject, topicKey, grade, drawNonce]);

  /** FRESH-SET-TESTS — log this paper as served on this device (start / download). */
  const markServed = useCallback((p: PersistedWorksheet | null) => {
    if (!p) return;
    recordServed(servedOwner(isSignedIn ? user?.uid : null), {
      surface: "chapter-test",
      scope: resolveCanonicalSlug(topicKey) || topicKey,
      ids: p.questions.map((q) => String(q.id ?? "")),
    });
  }, [isSignedIn, user?.uid, topicKey]);
  const freshLine = draw
    ? freshnessLine({
        repeats: draw.repeatCount,
        total: draw.paper.questions.length,
        hasHistory: draw.hasServedHistory,
        servedShare: draw.servedShare,
        repeatSections: draw.repeatSections,
        scopeNoun: "chapter",
        setNoun: "test",
      })
    : null;

  const topicRecords = useMemo(() => {
    const slug = resolveCanonicalSlug(topicKey);
    return records
      .filter(
        (r) =>
          r.surface === "chapter-test" &&
          r.subject === sessionSubject &&
          r.topicKeys.some((k) => resolveCanonicalSlug(k) === slug),
      )
      .sort((a, b) => b.gradedAt - a.gradedAt);
  }, [records, topicKey, sessionSubject]);

  // ── Test-taking state ────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>("setup");
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [flags, setFlags] = useState<Set<number>>(new Set());
  const [currentQNumber, setCurrentQNumber] = useState(1);
  const [timerEnabled, setTimerEnabled] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Results state (two-phase) ────────────────────────────────────────────────
  const [objective, setObjective] = useState<ObjectiveScore | null>(null);
  const [resultsPhase, setResultsPhase] = useState<"partial" | "full">("partial");
  const [scorecardOpen, setScorecardOpen] = useState(false);
  const [fullResponse, setFullResponse] = useState<WorksheetGradeResponse | null>(null);
  const [grading, setGrading] = useState(false);
  const [gradeError, setGradeError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  // AWAIT-1-PAPERS — the paper just downloaded (the confirmation card) and a downloaded paper
  // re-opened for its Section A picks.
  const [downloadedNote, setDownloadedNote] = useState<{ code: string; name: string } | null>(null);
  const [pickPaper, setPickPaper] = useState<ChapterTestPaperSnapshot | null>(null);
  const [paperNotice, setPaperNotice] = useState<string | null>(null);
  // CT-RESUME-2: a daily-paper-limit refusal, shown right under the button that was tapped.
  const [limitNotice, setLimitNotice] = useState<string | null>(null);
  // `openStored` is declared further down; the picks guard reaches it through this ref.
  const openStoredRef = useRef<((record: SessionRecord) => Promise<void>) | null>(null);
  const [reopen, setReopen] = useState<{
    record: SessionRecord;
    response: WorksheetGradeResponse | null;
    awaitingDetail?: string;
    /** PAPER-REBUILD-1 (D102): the paper lookup already failed, so the modal offers no upload action. */
    noPaper?: boolean;
  } | null>(null);

  // GRADING-JOBS-1 J2 — a background grade of this chapter's test survives a reload: the paper,
  // its frozen objective score and its code are stored WITH the job (the answers were already
  // cleared at submit), and the page re-opens the upload step on that paper and resumes the poll.
  const jobUi = useGradingJob();
  const jobStore = useMemo(() => sessionJobStore(`chapter-test:${topicKey}`), [topicKey]);
  const [resumedCt, setResumedCt] = useState<ChapterTestJobContext | null>(null);
  const [resumePending, setResumePending] = useState(false);
  const lastUploadRef = useRef<{ imageBase64: string; imageMimeType: string } | null>(null);
  // CT-RELOAD-1 — the paper of an in-progress attempt, restored after a reload (see below).
  const [restoredPaper, setRestoredPaper] = useState<PersistedWorksheet | null>(null);
  const paper = resumedCt?.paper ?? restoredPaper ?? draw?.paper ?? null;
  // CT-RESUME-2 — the start screen describes the paper the student will actually sit: the SAVED
  // paper when one is being offered for resume (its counts, marks, sections and CBQ share), else
  // this visit's fresh draw. Never the hidden new draw behind a resume.
  const shownFacts: ChapterTestPaperFacts | null = useMemo(() => {
    if (restoredPaper) return bank.ready ? describeChapterTestPaper(restoredPaper) : null;
    if (!draw) return null;
    return {
      questionCount: draw.paper.questions.length,
      totalMarks: draw.totalMarks,
      blueprint: draw.blueprint,
      cbqMarks: draw.cbqMarks,
      cbqTarget: draw.cbqTarget,
      cbqShortfall: draw.cbqShortfall,
      plainMcqMarks: draw.plainMcqMarks,
      constructedMarks: draw.constructedMarks,
    };
  }, [restoredPaper, bank.ready, draw]);
  const timeLimitSeconds = useMemo(() => Math.max(15, Math.round((paper?.totalMarks ?? 40) * 1.2)) * 60, [paper]);
  const progressKey = nomen ? `lazytopper.ct.progress.${nomen.code}` : null;

  // Autosave restore (honest "✓ saved") — CT-RELOAD-1. A reload mid-test used to land on the
  // setup screen with a NEW draw and then restore the saved answers (keyed by question NUMBER)
  // onto it, so answers landed on the wrong questions. The in-progress attempt now saves ITS
  // paper (ids, order, text) beside the answers, and a reload restores exactly that paper with its
  // answers, offered as "Resume your test" on the start screen — the Full Mock resume model (an
  // explicit resume, never an automatic jump, and never counted as a new start). A saved
  // entry without its paper (written before this fix) is dropped: its answers belong to a
  // paper that no longer exists on this page, and guessing would put them on the wrong rows.
  useEffect(() => {
    if (!progressKey || typeof window === "undefined") return;
    try {
      // CT-RESUME-2: an older in-progress entry for THIS route under another test code (its
      // number moved on since) can never be resumed here; drop it, so the daily paper gate
      // never treats this visit as a resume of a paper this page will not offer.
      const route = paperRouteKey(location.pathname);
      for (let i = window.sessionStorage.length - 1; i >= 0; i -= 1) {
        const key = window.sessionStorage.key(i);
        if (!key || key === progressKey || !key.startsWith(CT_PROGRESS_PREFIX)) continue;
        try {
          const other = JSON.parse(window.sessionStorage.getItem(key) || "null") as { route?: unknown } | null;
          if (other && typeof other.route === "string" && paperRouteKey(other.route) === route) {
            window.sessionStorage.removeItem(key);
          }
        } catch {
          /* leave an unreadable entry alone */
        }
      }
      const raw = window.sessionStorage.getItem(progressKey);
      if (!raw) return;
      const saved = JSON.parse(raw) as {
        answers?: Record<number, string>;
        flags?: number[];
        elapsed?: number;
        currentQNumber?: number;
        timerEnabled?: boolean;
        paper?: PersistedWorksheet;
      };
      const sp = saved.paper;
      if (!sp || !Array.isArray(sp.questions) || sp.questions.length === 0 || typeof sp.worksheetId !== "string") {
        window.sessionStorage.removeItem(progressKey);
        return;
      }
      setRestoredPaper(sp);
      setAnswers(saved.answers ?? {});
      setFlags(new Set(Array.isArray(saved.flags) ? saved.flags : []));
      if (typeof saved.elapsed === "number") setElapsed(saved.elapsed);
      if (typeof saved.timerEnabled === "boolean") setTimerEnabled(saved.timerEnabled);
      const qn = Number(saved.currentQNumber);
      setCurrentQNumber(sp.questions.some((q) => q.qNumber === qn) ? qn : 1);
    } catch {
      /* best-effort */
    }
  }, [progressKey, location.pathname]);

  // Autosave write while taking — the paper rides along so a reload restores THIS paper.
  useEffect(() => {
    if (phase !== "taking" || !progressKey || !paper || typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem(
        progressKey,
        // CT-RESUME-2: `route` lets the daily paper gate (MockViewGate) recognise a reload of THIS
        // chapter's saved paper as a resume — not a new paper (lib/papers/resumablePaper).
        JSON.stringify({ answers, flags: [...flags], elapsed, currentQNumber, timerEnabled, paper, route: paperRouteKey(location.pathname) }),
      );
    } catch {
      /* quota — best-effort */
    }
  }, [answers, flags, elapsed, currentQNumber, timerEnabled, phase, progressKey, paper, location.pathname]);

  const objectiveQs = useMemo(() => (paper ? objectiveQuestions(paper) : []), [paper]);
  const subjectiveQs = useMemo(() => (paper ? subjectiveQuestions(paper) : []), [paper]);

  const unansweredObjective = objectiveQs.filter((q) => !(answers[q.qNumber] && answers[q.qNumber] !== "")).length;

  // ── Submit → partial ─────────────────────────────────────────────────────────
  const finishToPartial = useCallback(() => {
    if (!paper || !nomen) return;
    if (timerRef.current) clearInterval(timerRef.current);
    const obj = scoreObjectiveSection(objectiveQs, answers);
    setObjective(obj);
    const partialResponse = buildChapterTestResponse({
      paper,
      objective: obj,
      subjectiveQuestions: subjectiveQs,
      subjectiveResponse: null,
    });
    writeChapterTestPartialRecord({
      user,
      paper,
      code: nomen.code,
      subject: sessionSubject,
      topicKey,
      response: partialResponse,
    });
    // PENDING-UPLOAD-1: keep the SAME paper + frozen objective so "Upload later" can come
    // back to it, on this device or any other signed-in one (text only, never an image).
    saveChapterTestPaper(user, {
      code: nomen.code,
      name: nomen.name,
      subject,
      topicKey,
      paper,
      objective: obj,
    });
    if (progressKey && typeof window !== "undefined") {
      try {
        window.sessionStorage.removeItem(progressKey);
      } catch {
        /* best-effort */
      }
    }
    setResultsPhase("partial");
    setScorecardOpen(true);
    setPhase("results");
    void loadRecords();
  }, [paper, nomen, objectiveQs, subjectiveQs, answers, user, sessionSubject, subject, topicKey, progressKey, loadRecords]);

  // Keep a LIVE ref to the latest finishToPartial so the timer's auto-submit scores
  // with CURRENT answers — the interval effect must NOT re-subscribe on every keystroke
  // (that would reset the clock), so it can't close over finishToPartial directly.
  const finishRef = useRef(finishToPartial);
  useEffect(() => {
    finishRef.current = finishToPartial;
  }, [finishToPartial]);

  // Timer.
  useEffect(() => {
    if (phase !== "taking") return;
    timerRef.current = setInterval(() => {
      setElapsed((e) => {
        const next = e + 1;
        if (timerEnabled && next >= timeLimitSeconds) {
          // Time up → auto-submit (like a real exam), once, with current answers.
          if (timerRef.current) clearInterval(timerRef.current);
          setTimeout(() => finishRef.current(), 0);
        }
        return next;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, timerEnabled, timeLimitSeconds]);

  // CT-KATEX-2 (LOW-END-1 L6/R6): the start screen shows no maths, so KaTeX is fetched on
  // the student's FIRST INTERACTION with it (pointerdown / touchstart / keydown / scroll —
  // passive, once), never by load, idle or a timer. On a budget phone (profile A) both a
  // mount-time fetch and a load+idle prefetch landed before the start screen was usable.
  // `startTest` below AWAITS it (starting it if no interaction did), so the first question
  // paints with KaTeX, never a plain-text swap.
  const katexAskedRef = useRef(false);
  useEffect(() => {
    if (phase !== "setup" || katexAskedRef.current || typeof window === "undefined") return;
    const events = ["pointerdown", "touchstart", "keydown", "scroll"] as const;
    const opts: AddEventListenerOptions = { capture: true, passive: true };
    const disarm = () => events.forEach((e) => window.removeEventListener(e, onFirst, opts));
    function onFirst() {
      disarm();
      if (katexAskedRef.current) return;
      katexAskedRef.current = true;
      loadKatex().catch(() => {
        /* Start (or MathText) fetches it again */
      });
    }
    events.forEach((e) => window.addEventListener(e, onFirst, opts));
    return disarm;
  }, [phase]);

  const [starting, setStarting] = useState(false);
  const startTest = useCallback(async () => {
    // FAIR-USE-UI-1 (UI3): today's chapter test already used -> the panel, not the paper.
    if (fairUse.blockPaperStart()) return;
    // CT-RESUME-2: starting a paper is a NEW paper. A visit the daily gate let through uncounted
    // (it looked like a resume) is counted now — or refused at today's limit.
    if (!claimNewPaperView(location.pathname, user?.uid ?? null, isPremium)) {
      setLimitNotice(NEW_PAPER_LIMIT_LINE);
      return;
    }
    // LOW-END-1 R6 / CT-KATEX-2: the first question renders KaTeX on its FIRST paint. Usually
    // already in flight (the first interaction started it — pressing Start is one); if not,
    // this starts it. A failed fetch still starts the paper — MathText then retries.
    setStarting(true);
    try {
      await loadKatex();
    } catch {
      /* MathText fetches it again when a question needs it */
    }
    setStarting(false);
    markServed(paper);
    setPhase("taking");
    setCurrentQNumber(1);
    trackUxEvent("chapter_test_start", "ChapterTestPage", { topicKey, subject });
  }, [topicKey, subject, fairUse.blockPaperStart, markServed, paper, location.pathname, user?.uid, isPremium]);

  // CT-RELOAD-1 — continue the restored paper where it was left. A resume, not a new start:
  // never re-counted against the fair-use allowance.
  const resumeTest = useCallback(async () => {
    if (!restoredPaper) return;
    setStarting(true);
    try {
      await loadKatex();
    } catch {
      /* MathText fetches it again when a question needs it */
    }
    setStarting(false);
    setPhase("taking");
  }, [restoredPaper]);
  /** Drop the restored attempt (unsubmitted, nothing graded) and show this visit's fresh draw. */
  const discardRestored = useCallback(() => {
    // CT-RESUME-2: this visit was let through as a RESUME (not counted). A new paper instead is
    // counted now — or refused when today's papers are used up (the saved test stays).
    if (!claimNewPaperView(location.pathname, user?.uid ?? null, isPremium)) {
      setLimitNotice(NEW_PAPER_LIMIT_SAVED_LINE);
      return;
    }
    if (progressKey && typeof window !== "undefined") {
      try {
        window.sessionStorage.removeItem(progressKey);
      } catch {
        /* best-effort */
      }
    }
    setRestoredPaper(null);
    setAnswers({});
    setFlags(new Set());
    setElapsed(0);
    setCurrentQNumber(1);
  }, [progressKey, location.pathname, user?.uid, isPremium]);

  const pickOption = useCallback((qNumber: number, optionText: string) => {
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

  // ── Upload → full ────────────────────────────────────────────────────────────
  const handleGrade = useCallback(
    async (
      upload: { imageBase64: string; imageMimeType: string },
      mode: { resume?: boolean; continueFrom?: GradingJobInterruptedError } = {},
    ) => {
      if (!paper || !nomen || !objective || grading) return;
      setGrading(true);
      setGradeError(null);
      fairUse.clearLimit();
      if (!mode.resume) lastUploadRef.current = upload;
      if (!mode.continueFrom) jobUi.reset();
      try {
        const context: ChapterTestJobContext = { paper, objective, code: nomen.code, name: nomen.name };
        const outcome = await gradeChapterTestUpload({
          user,
          paper,
          code: nomen.code,
          subject: sessionSubject,
          topicKey,
          objective,
          subjectiveQuestions: subjectiveQs,
          upload,
          job: {
            store: jobStore,
            paperKey: paper.worksheetId,
            context,
            onProgress: jobUi.onProgress,
            ...(mode.resume ? { resumeOnly: true } : {}),
            ...(mode.continueFrom ? { continueFrom: mode.continueFrom } : {}),
          },
        });
        jobUi.reset();
        if (!outcome.ok) {
          setGradeError(outcome.response.error || "We couldn’t grade your answers. Try a clearer scan, or try again.");
        } else {
          setFullResponse(outcome.response);
          setResultsPhase("full");
          setScorecardOpen(true);
          fairUse.noteGraded();
          // Fully graded: the record + per-question payload are the durable copy now.
          if (outcome.response.pendingCount === 0) deleteChapterTestPaper(user, nomen.code);
          trackUxEvent("chapter_test_complete", "ChapterTestPage", {
            topicKey,
            score: `${outcome.response.gradedMarksAwarded}/${outcome.response.gradedMarksTotal}`,
          });
          void loadRecords();
        }
      } catch (err) {
        // J2 §6: an interrupted background grade keeps its marked rows and offers the rest back.
        if (jobUi.captureInterrupted(err)) return;
        // FAIR-USE-UI-1 (UI1): a fair-use refusal shows the calm panel instead of the error.
        if (await fairUse.handleRefusal(err)) return;
        // LOW-END-1 R2: never a raw platform message ("Failed to fetch") — a plain sentence.
        setGradeError(gradingErrorMessage(err, "We couldn't grade your answers just now. Your answers are still here — please try again."));
      } finally {
        setGrading(false);
      }
    },
    [paper, nomen, objective, grading, user, sessionSubject, topicKey, subjectiveQs, loadRecords, jobStore, jobUi.reset, jobUi.onProgress, jobUi.captureInterrupted, fairUse.clearLimit, fairUse.noteGraded, fairUse.handleRefusal],
  );

  // J2 — resume after a reload. Once the durable records have loaded (so the mount effect has
  // set its own code), re-open the stored paper on the upload step and poll the stored job.
  const resumeCheckedRef = useRef(false);
  useEffect(() => {
    if (resumeCheckedRef.current || recordsLoading || !nomen) return;
    resumeCheckedRef.current = true;
    const rec = resumableJob(jobStore);
    const ctx = rec ? readChapterTestJobContext(rec.context) : null;
    if (!rec || !ctx || ctx.paper.worksheetId !== rec.paperKey) return;
    setResumedCt(ctx);
    setObjective(ctx.objective);
    setResultsPhase("partial");
    setScorecardOpen(false);
    setPhase("results");
    setResumePending(true);
  }, [recordsLoading, nomen, jobStore]);
  // The resumed paper keeps ITS code, whatever the mount effect minted meanwhile.
  useEffect(() => {
    if (resumedCt && nomen && nomen.code !== resumedCt.code) setNomen({ code: resumedCt.code, name: resumedCt.name });
  }, [resumedCt, nomen]);
  useEffect(() => {
    if (!resumePending || !resumedCt || !objective || nomen?.code !== resumedCt.code || paper !== resumedCt.paper) return;
    setResumePending(false);
    void handleGrade({ imageBase64: "", imageMimeType: "application/pdf" }, { resume: true });
  }, [resumePending, resumedCt, objective, nomen, paper, handleGrade]);

  // ── Downloads ────────────────────────────────────────────────────────────────
  const downloadTest = useCallback(async () => {
    if (!paper || !nomen || downloading) return;
    // CT-RESUME-2: downloading THIS visit's draw is a new paper (the saved paper on offer is not).
    if (!restoredPaper && !claimNewPaperView(location.pathname, user?.uid ?? null, isPremium)) {
      setLimitNotice(NEW_PAPER_LIMIT_LINE);
      return;
    }
    setDownloading(true);
    try {
      await exportWorksheetPdf(paper, "questions", nomen.code);
      markServed(paper);
      // AWAIT-1-PAPERS: the downloaded paper is kept under the code PRINTED on it — a
      // pending-upload record (nothing graded) + the paper with no Section A result yet — so
      // "Upload" can come back to THIS paper. Signed out: export only (the note says so).
      setDownloadedNote({ code: nomen.code, name: nomen.name });
      if (isSignedIn) {
        const dlPaper = paper;
        const dl = { code: nomen.code, name: nomen.name };
        void recordPaperDownload({
          user,
          code: dl.code,
          paper: dlPaper,
          buildRecord: (response, uid) =>
            buildChapterTestSessionRecord({ paper: dlPaper, code: dl.code, subject: sessionSubject, topicKey, response, uid }),
          saveSnapshot: () =>
            saveChapterTestPaper(user, {
              code: dl.code,
              name: dl.name,
              subject,
              topicKey,
              paper: dlPaper,
              objective: null,
              downloaded: true,
            }),
        })
          .then((outcome) => {
            if (outcome === "written") void loadRecords();
          })
          .catch(() => {
            /* best-effort: the PDF is already downloaded */
          });
      }
    } catch {
      /* best-effort */
    } finally {
      setDownloading(false);
    }
  }, [paper, nomen, downloading, isSignedIn, user, sessionSubject, subject, topicKey, loadRecords, markServed, restoredPaper, location.pathname, isPremium]);

  // AWAIT-1-PAPERS (owner ruling, option a): a downloaded paper's Section A was answered on
  // paper. The student taps those picks in; the EXISTING scorer scores them (0-or-full), and
  // from here the paper is exactly an in-app submitted test: the same partial record + paper
  // copy `finishToPartial` writes, then the existing upload step. No grader change.
  const continueFromPicks = useCallback(
    async (picks: Record<number, string>) => {
      const p = pickPaper;
      if (!p) return;
      // Server first: if this paper was already continued (Section A entered, or graded) on
      // another device, write NOTHING here — say so and open its current state instead.
      const status = await readPaperRecordStatus(user, p.code);
      if (!picksMayContinue(status)) {
        if (status === "unknown") {
          setPaperNotice(STATUS_UNKNOWN_LINE);
          return;
        }
        setPaperNotice(CONTINUED_ELSEWHERE_LINE);
        setPickPaper(null);
        setPhase("setup");
        const all = await loadRecords();
        const current = all.find((r) => r.id === p.code && r.surface === "chapter-test");
        if (current) await openStoredRef.current?.(current);
        return;
      }
      setPaperNotice(null);
      const obj = scoreObjectiveSection(objectiveQuestions(p.paper), picks);
      writeChapterTestPartialRecord({
        user,
        paper: p.paper,
        code: p.code,
        subject: sessionSubject,
        topicKey: p.topicKey,
        response: buildChapterTestResponse({
          paper: p.paper,
          objective: obj,
          subjectiveQuestions: subjectiveQuestions(p.paper),
          subjectiveResponse: null,
        }),
      });
      saveChapterTestPaper(user, {
        code: p.code,
        name: p.name,
        subject: p.subject,
        topicKey: p.topicKey,
        paper: p.paper,
        objective: obj,
        downloaded: true,
      });
      setPickPaper(null);
      setFullResponse(null);
      setGradeError(null);
      setResumedCt({ paper: p.paper, objective: obj, code: p.code, name: p.name });
      setNomen({ code: p.code, name: p.name });
      setObjective(obj);
      setResultsPhase("partial");
      setScorecardOpen(false);
      setPhase("results");
      void loadRecords();
    },
    [pickPaper, user, sessionSubject, loadRecords],
  );
  const downloadSolution = useCallback(async () => {
    if (!paper || !nomen || downloading) return;
    setDownloading(true);
    try {
      await exportWorksheetPdf(paper, "answers", nomen.code);
    } catch {
      /* best-effort */
    } finally {
      setDownloading(false);
    }
  }, [paper, nomen, downloading]);
  const downloadGraded = useCallback(async () => {
    if (!paper || !nomen || !fullResponse || downloading) return;
    setDownloading(true);
    try {
      await exportGradedWorksheetPdf({
        ws: paper,
        response: fullResponse,
        name: nomen.name,
        code: nomen.code,
        coaching: coachingLine(fullResponse),
      });
    } catch {
      /* best-effort */
    } finally {
      setDownloading(false);
    }
  }, [paper, nomen, fullResponse, downloading]);

  // GUIDE-SCORE-1 — ONE practice route for this chapter: the menu's "Practise the marks you
  // lost" and Byte's link on the scorecard both go here.
  const practiseTopicPath = `/practice/${grade}/${subject.toLowerCase()}?topic=${encodeURIComponent(topicKey)}`;
  const practiseTopic = useCallback(() => {
    navigate(practiseTopicPath);
  }, [navigate, practiseTopicPath]);
  const ctGuideTarget = useMemo(() => ({ to: practiseTopicPath, chapter: topicName }), [practiseTopicPath, topicName]);
  // GUIDE-SCORE-1 — the honest change since the last same-total test of THIS chapter, from the
  // history this page already loaded (topicRecords); nothing is fetched.
  const ctDeltaLine = useMemo(
    () =>
      fullResponse && nomen
        ? chapterTestDeltaLine(
            { code: nomen.code, awarded: fullResponse.gradedMarksAwarded, total: fullResponse.gradedMarksTotal },
            topicRecords,
            topicName,
          )
        : null,
    [fullResponse, nomen, topicRecords, topicName],
  );

  // ── Re-open a stored test read-only ──────────────────────────────────────────
  // PENDING-UPLOAD-1: a pending test re-opens ITS OWN paper on the upload step (this device's
  // copy, else the server snapshot). The grade then attaches to the existing record: same code,
  // same worksheetId (so the fair-use paper pass and MI identity are the same paper's).
  const openPendingUpload = useCallback(
    async (record: SessionRecord) => {
      let snap = await loadChapterTestPaper(user, record.id);
      // AWAIT-1: this device may hold the DOWNLOADED copy of a paper whose Section A was since
      // entered on another device (the record is no longer pending): read the server copy.
      if (snap && needsSectionAPicks(snap) && record.status !== "pending-upload") {
        snap = await loadChapterTestPaper(user, record.id, { preferServer: true });
        // Still no Section A anywhere for a record that moved on: no paper to continue (honest line).
        if (snap && needsSectionAPicks(snap)) snap = null;
      }
      // AWAIT-1: a downloaded paper first takes its Section A picks (then continueFromPicks).
      if (snap && needsSectionAPicks(snap)) {
        // The same fair-use gate as an in-app start (UI3): an exhausted allowance is stopped
        // BEFORE a client-scored partial record could be written.
        if (fairUse.blockPaperStart()) return;
        setReopen(null);
        setPickPaper(snap);
        setPhase("pick");
        return;
      }
      if (snap && snap.objective) {
        setReopen(null);
        setFullResponse(null);
        setGradeError(null);
        setResumedCt({ paper: snap.paper, objective: snap.objective, code: snap.code, name: snap.name });
        setNomen({ code: snap.code, name: snap.name });
        setObjective(snap.objective);
        setResultsPhase("partial");
        setScorecardOpen(false);
        setPhase("results");
        return;
      }
      setReopen({
        record,
        response: null,
        noPaper: true,
        // PAPER-REBUILD-1 (D103a, owner copy verbatim): without the paper snapshot the Section A
        // result frozen at submit is gone, so the test cannot be rebuilt without inventing grade
        // inputs — it cannot be uploaded (FU-CT-FM-LEGACY-OBJECTIVE).
        awaitingDetail:
          "This test was taken before papers were saved, so it can't be uploaded. Start a new test to practise this chapter.",
      });
    },
    [user, fairUse.blockPaperStart],
  );

  const openStored = useCallback(
    async (record: SessionRecord) => {
      // A submitted-but-not-uploaded test is stored as "partial" (its objective rows count as
      // graded) with NO per-question payload; "pending-upload" is the zero-graded case. Either,
      // with nothing graded from the sheet yet, goes back to the upload step.
      if (record.status === "pending-upload") {
        await openPendingUpload(record);
        return;
      }
      const payload = await getSessionPerQuestion(user?.uid, record.perQuestionRef);
      if (record.status === "partial" && !payload?.response) {
        await openPendingUpload(record);
        return;
      }
      setReopen({ record, response: payload?.response ?? null });
    },
    [user?.uid, openPendingUpload],
  );
  useEffect(() => {
    openStoredRef.current = openStored;
  }, [openStored]);

  // FOLLOWUPS-1 B — "Ask the tutor why I lost this mark" on a SAVED test's scorecard (the QP /
  // C&I hop): the tutor reads the student's OWN record (`from`) and the question (`q` = its bank
  // id), and its back arrow returns here with `review=<record id>`, which reopens THAT scorecard
  // through `openStored` above. Signed-in, own record, a single known chapter — else no button.
  const reviewUid = isSignedIn ? user!.uid : null;
  const ctTutorAskFor = useCallback(
    (record: SessionRecord | null | undefined, response: WorksheetGradeResponse | null | undefined) =>
      (qNumber: number): ScorecardTutorAsk | null => {
        if (!reviewUid || !record || record.surface !== "chapter-test" || !recordBelongsToUid(record, reviewUid)) return null;
        const chapter = record.topicKeys.length === 1 ? record.topicKeys[0] : null;
        const hop = savedPaperQuestionHop(record, response, qNumber, () => chapter);
        if (!hop) return null;
        return {
          onAsk: () => {
            trackOnboardingEvent("tutor_from_scorecard", { surface: "chapter_test" });
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
    [reviewUid, navigate, subject, grade, location.pathname, location.search],
  );
  // The live (just graded) test's saved record — present only once it is in the student's store.
  // It must already hold THIS grade (same graded marks), so a failed write or the submit-time
  // objective-only record never gets a button; and the paper on screen must be the record's paper.
  const liveRecord = useMemo(
    () =>
      nomen && fullResponse
        ? records.find(
            (r) =>
              r.id === nomen.code &&
              r.surface === "chapter-test" &&
              r.status !== "pending-upload" &&
              r.marksAwarded === (Number(fullResponse.gradedMarksAwarded) || 0) &&
              r.marksTotal === (Number(fullResponse.gradedMarksTotal) || 0),
          ) ?? null
        : null,
    [records, nomen, fullResponse],
  );
  const liveTutorAskFor = useMemo(() => {
    if (!liveRecord || !fullResponse || !paper) return undefined;
    const ask = ctTutorAskFor(liveRecord, fullResponse);
    return (qNumber: number): ScorecardTutorAsk | null => {
      const q = paper.questions.find((pq) => pq.qNumber === qNumber);
      return q && String(q.id) === liveRecord.questionIds[qNumber - 1] ? ask(qNumber) : null;
    };
  }, [liveRecord, fullResponse, paper, ctTutorAskFor]);

  // The tutor's back arrow: `review=<record id>` reopens that saved test ONCE (read-only, through
  // `openStored`), and the param is stripped with `replace`. Signed-out / not this student's /
  // not a chapter test -> just stripped; the page is otherwise unchanged.
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
        const record = all.find((r) => r.id === reviewParam && r.surface === "chapter-test" && recordBelongsToUid(r, reviewUid));
        if (record) await openStored(record);
      } catch {
        /* honest fallback: the plain page */
      }
    })();
  }, [reviewParam, authLoading, reviewUid, location.pathname, location.search, location.state, navigate, openStored]);

  const currentQuestion = paper?.questions.find((q) => q.qNumber === currentQNumber) ?? null;
  const currentIsObjective = currentQuestion ? String(currentQuestion.section).toUpperCase() === "A" : false;

  // ══════════════════════════════════════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════════════════════════════════════

  return (
    <div className="lt-ct">
      <style>{CT_CSS}</style>
      <UsageWarning scope="chapter-test" snapshot={fairUse.snapshot} />
      {paperNotice && (
        <div className="lt-paper-dl lt-paper-dl--signedout" role="status" data-testid="paper-notice">
          {paperNotice}
        </div>
      )}

      {/* Read-only re-open scorecard (from a history card), any phase. */}
      {reopen && (
        <ResultsScorecard
          variant={withPaperTutorAsks(withGuideTarget(storedChapterTestScorecardVariant(reopen.record, {
            gradedDateLabel: new Date(reopen.record.gradedAt).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            }),
            response: reopen.response,
            awaitingDetail: reopen.awaitingDetail,
            // Awaiting-sheet records offer "Upload answer sheet" — never after the lookup just failed
            // (PAPER-REBUILD-1, D102: re-running it was the owner's dead loop).
            onUploadSheet:
              reopen.record.status !== "graded" && !reopen.response && !reopen.noPaper
                ? () => void openPendingUpload(reopen.record)
                : undefined,
            // The no-paper state's way forward (D103a): a new test of this chapter, through the
            // same start as the setup button (fair-use gate included).
            onStartNew: reopen.noPaper
              ? () => {
                  setReopen(null);
                  void startTest();
                }
              : undefined,
            onDone: () => setReopen(null),
          }), ctGuideTarget), reopen.response, ctTutorAskFor(reopen.record, reopen.response))}
          onClose={() => setReopen(null)}
        />
      )}

      {/* ─────────────── SETUP ─────────────── */}
      {phase === "setup" && (
        <>
          <div className="lt-ct__pagebar">
            <button type="button" className="lt-ct__back" onClick={() => navigate(backTo)}>
              ← {backLabel}
            </button>
            <span className="lt-ct__pagetitle">Chapter Test</span>
            {/* GUIDE-PAGES-1 — Byte's "?" helper (first visit opens once; a fixed card, no shift). */}
            <PageGuide id="ct_entry" step="page" uid={user && !user.isLocalSession ? user.uid : null} placement="end" bare />
          </div>

          <div className="lt-ct__setup">
            <ChapterTestHistoryRail
              topicLabel={topicName}
              records={topicRecords}
              loading={recordsLoading}
              onOpen={openStored}
            />

            <div className="lt-ct__setup-main">
              <div className="lt-ct__card">
                <div className="lt-ct__eyebrow">Chapter Test · {topicName}</div>
                <div className="lt-ct__title lt-ct__fr">Ready for a board-pattern test?</div>
                <div className="lt-ct__sub">
                  Objective questions are scored the moment you submit. Write the rest on paper, upload, and
                  get your full graded result with a mistake breakdown.
                </div>

                {!shownFacts && bank.error ? (
                  <div className="lt-ct__empty">
                    We couldn’t load the {topicName} questions. Check your connection and reload the page.
                  </div>
                ) : !shownFacts ? (
                  <div className="lt-ct__empty">Building your test…</div>
                ) : !restoredPaper && draw && !draw.enoughQuestions ? (
                  <div className="lt-ct__empty">
                    We don’t have enough {topicName} questions in the bank to build a fair test yet. This
                    chapter is still being expanded — check back soon.
                  </div>
                ) : (
                  <>
                    <div className="lt-ct__metarow">
                      <span className="lt-ct__chip">
                        <b>{shownFacts.questionCount}</b> questions
                      </span>
                      <span className="lt-ct__chip">
                        <b>{shownFacts.totalMarks}</b> marks
                      </span>
                      <span className="lt-ct__chip">
                        <b>~{Math.round(timeLimitSeconds / 60)}</b> min
                      </span>
                      <span className="lt-ct__chip">
                        Sections <b>A–D</b>
                      </span>
                    </div>

                    <div className="lt-ct__blueprint" data-testid="ct-blueprint">
                      {shownFacts.blueprint.map((row) => (
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
                              ? `${row.actualCount} × ${row.marksEach} = ${row.actualMarks} · ${
                                  row.autoGraded ? "scored instantly" : "write & upload"
                                }`
                              : "none available yet"}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* CBQ-1 PR-2: the paper's REAL CBQ share (target ≥ 50%; CBSE pattern 50% competency); an honest note when short. */}
                    <CbqShareNote
                      cbqMarks={shownFacts.cbqMarks}
                      totalMarks={shownFacts.totalMarks}
                      cbqShortfall={shownFacts.cbqShortfall}
                      plainMcqMarks={shownFacts.plainMcqMarks}
                      constructedMarks={shownFacts.constructedMarks}
                      scope="chapter"
                      scopeName={topicName}
                    />

                    <div className="lt-ct__toggle">
                      <div className="lt-ct__toggle-lab">
                        <b>⏱ Timed (board practice)</b>
                        <p>{Math.round(timeLimitSeconds / 60)}-min countdown. Turn off to practise without the clock.</p>
                      </div>
                      <button
                        type="button"
                        className={`lt-ct__tg${timerEnabled ? "" : " lt-ct__tg--off"}`}
                        aria-pressed={timerEnabled}
                        aria-label="Toggle timer"
                        onClick={() => setTimerEnabled((p) => !p)}
                      />
                    </div>

                    {fairUse.limit ? <FairUseLimitPanel limit={fairUse.limit} onDismiss={fairUse.clearLimit} /> : null}
                    {restoredPaper && (
                      <div className="lt-ct__honest" data-testid="ct-resume-note">
                        <span>·</span>
                        <span>
                          You were part-way through this test — it&rsquo;s saved exactly as you left it (Q
                          {currentQNumber} of {restoredPaper.questions.length}, {Object.keys(answers).length} answered).{" "}
                          <button type="button" className="lt-ct__btn lt-ct__btn--ghost lt-ct__btn--sm" onClick={discardRestored}>
                            Start a fresh test instead
                          </button>
                        </span>
                      </div>
                    )}
                    {/* GUIDE-PAGES-1 — reserved for COMPANION-1's optional pre-test "breathe" moment (renders nothing today). */}
                    <PreTestSlot surface="chapter_test" />
                    <div className="lt-ct__startrow">
                      {restoredPaper ? (
                        <button type="button" className="lt-ct__btn lt-ct__btn--primary" onClick={() => void resumeTest()} disabled={starting}>
                          Resume your test →
                        </button>
                      ) : (
                        <button type="button" className="lt-ct__btn lt-ct__btn--primary" onClick={() => void startTest()} disabled={starting}>
                          Start the test →
                        </button>
                      )}
                      <button
                        type="button"
                        className="lt-ct__btn lt-ct__btn--ghost lt-ct__btn--sm"
                        onClick={downloadTest}
                        disabled={downloading}
                      >
                        {downloading ? "Preparing…" : "↓ Download this test (PDF)"}
                      </button>
                    </div>
                    {limitNotice && (
                      <div className="lt-ct__honest" role="alert" data-testid="ct-limit-notice">
                        <span>·</span>
                        <span>{limitNotice}</span>
                      </div>
                    )}

                    {downloadedNote && (
                      <PaperDownloadedNote
                        signedIn={isSignedIn}
                        code={downloadedNote.code}
                        label={topicName}
                        path={location.pathname}
                        surface="chapter_test"
                      />
                    )}

                    {/* CBSE-PAGE-1 — a real <Link>, and deliberately OUTSIDE
                        .lt-ct__startrow: that rule gives every .lt-ct__btn inside it
                        flex:1, so placing it in the row would have resized the two
                        existing buttons. Out here it keeps its natural width and the
                        start row renders exactly as it does on production. */}
                    <Link
                      to={`/cbse/class-10?returnTo=${encodeURIComponent(location.pathname)}`
                        + `&backLabel=${encodeURIComponent(`Back to the ${topicName} chapter test`)}`
                        + `&subject=${subject.toLowerCase()}#papers`}
                      className="lt-ct__btn lt-ct__btn--ghost lt-ct__btn--sm"
                    >
                      See CBSE’s official marking scheme →
                    </Link>

                    <div className="lt-ct__honest">
                      <span>·</span>
                      <span>
                        Prefer paper? Download this test, solve it, and upload the whole thing. Opens
                        full-screen so you can focus.{" "}
                        {restoredPaper ? null /* CT-RESUME-2: the freshness line describes the NEW draw — not shown while a saved paper is offered */ : draw && draw.repeatCount > 0 ? (
                          // FRESH-SET-TESTS — the honest line when this chapter's unseen pool ran out.
                          <b data-testid="ct-fresh-line" data-tone="repeats">{freshLine?.text}</b>
                        ) : draw?.hasServedHistory ? (
                          <span data-testid="ct-fresh-line" data-tone="fresh">
                            <b>Each test is a fresh draw</b> — different questions from your last {topicName} test.
                          </span>
                        ) : (
                          // A first-ever test: no "last test" to compare against, so no such claim.
                          <span data-testid="ct-fresh-line" data-tone="first">
                            <b>Each test is a fresh draw</b> from this chapter&rsquo;s question bank.
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
      {phase === "pick" && pickPaper && (
        <>
          <div className="lt-ct__pagebar">
            <button type="button" className="lt-ct__back" onClick={() => navigate(backTo)}>
              ← {backLabel}
            </button>
            <span className="lt-ct__pagetitle">Chapter Test · Upload</span>
          </div>
          <SectionAPicker
            eyebrow={`Chapter Test · ${topicName}`}
            name={pickPaper.name}
            code={pickPaper.code}
            questions={objectiveQuestions(pickPaper.paper)}
            onContinue={continueFromPicks}
            onCancel={() => {
              setPickPaper(null);
              setPhase("setup");
            }}
          />
        </>
      )}

      {/* ─────────────── TAKING (full screen) ─────────────── */}
      {phase === "taking" && paper && currentQuestion && (
        <div className="lt-ct__fs">
          <div className="lt-ct__fsbar">
            <div className="lt-ct__fsbar-l">
              {topicName} · Chapter Test
              <small>
                Section {currentQuestion.section} · Q{currentQNumber} of {paper.questions.length}
              </small>
            </div>
            <div className="lt-ct__timer">
              <span className="lt-ct__save">✓ saved</span>
              <button
                type="button"
                className="lt-ct__minitg"
                onClick={() => setTimerEnabled((p) => !p)}
                aria-pressed={timerEnabled}
              >
                <span className={`d${timerEnabled ? "" : " off"}`} />
                Timer
              </button>
              <span
                className={`lt-ct__clock${!timerEnabled ? " lt-ct__clock--off" : ""}${
                  timerEnabled && timeLimitSeconds - elapsed < 120 ? " lt-ct__clock--low" : ""
                }`}
              >
                {timerEnabled ? `⏱ ${formatClock(timeLimitSeconds - elapsed)}` : `⏱ ${formatClock(elapsed)} · off`}
              </span>
              <button type="button" className="lt-ct__exit" onClick={() => setShowConfirm(true)}>
                Submit &amp; exit →
              </button>
            </div>
          </div>

          {/* Class-driven segmented progress (no inline style — §7): one segment per
              question, filled up to the current question. */}
          <div className="lt-ct__track">
            {paper.questions.map((q) => (
              <span key={q.qNumber} className={`lt-ct__seg${q.qNumber <= currentQNumber ? " lt-ct__seg--on" : ""}`} />
            ))}
          </div>

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
                  : `${currentQuestion.marks}-mark · ${SECTION_MARK_HINT[currentQuestion.section] ?? "write on paper ✍️"}`}
              </span>
              <div className="lt-ct__qtext">
                <MathText text={currentQuestion.questionText} />
              </div>

              {/* FIGURE-HONESTY-1 PR-2 — a question whose figure is BOUND renders it
                  here, exactly as Practice does (PracticeQuestionCard.tsx:549). With no
                  binding the component returns null (PR-1), so an unbound question
                  renders no extra node and this surface is unchanged from today. */}
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
                    <span>MCQs are scored instantly — no working needed (just like a real board paper).</span>
                  </div>
                </div>
              ) : (
                <div className="lt-ct__subjbox">
                  <b>Write this one on paper ✍️</b>
                  Label it “Q{currentQNumber}”. Upload all written answers at the end — shows as “to upload”
                  in the navigator.
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
                {currentQNumber < paper.questions.length ? (
                  <button
                    type="button"
                    className="lt-ct__btn lt-ct__btn--primary"
                    onClick={() => setCurrentQNumber((n) => Math.min(paper.questions.length, n + 1))}
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
              questions={paper.questions}
              currentQNumber={currentQNumber}
              answers={answers}
              flags={flags}
              onJump={setCurrentQNumber}
            />
          </div>

          {showConfirm && (
            <PreSubmitConfirm
              unanswered={unansweredObjective}
              flagged={flags.size}
              onKeepWorking={() => setShowConfirm(false)}
              onSubmit={() => {
                setShowConfirm(false);
                finishToPartial();
              }}
            />
          )}
        </div>
      )}

      {/* ─────────────── RESULTS (two-phase) ─────────────── */}
      {phase === "results" && paper && nomen && objective && (
        <>
          <div className="lt-ct__pagebar">
            <button type="button" className="lt-ct__back" onClick={() => navigate(backTo)}>
              ← {backLabel}
            </button>
            <span className="lt-ct__pagetitle">Chapter Test · Result</span>
          </div>

          {resultsPhase === "partial" && fairUse.limit ? <FairUseLimitPanel limit={fairUse.limit} /> : null}
          {resultsPhase === "partial" ? (
            <ChapterTestUploadPanel
              name={nomen.name}
              code={nomen.code}
              objective={{ awarded: objective.awarded, total: objective.total }}
              grading={grading}
              error={gradeError}
              isSignedIn={isSignedIn}
              onGrade={(upload) => void handleGrade(upload)}
              onSkip={() => navigate(backTo)}
            />
          ) : (
            <div className="lt-ct__upload">
              <div className="lt-ct__uploadcard">
                <div className="lt-ct__eyebrow">Chapter Test · Result</div>
                <div className="lt-ct__title lt-ct__fr">{nomen.name}</div>
                <div className="lt-ct__sub">
                  {nomen.code} · fully graded —{" "}
                  <b>
                    {fullResponse?.gradedMarksAwarded}/{fullResponse?.gradedMarksTotal}
                  </b>
                  {fullResponse && fullResponse.pendingCount > 0
                    ? ` · ${fullResponse.pendingCount} page(s) pending`
                    : ""}
                </div>
                <div className="lt-ct__startrow">
                  <button type="button" className="lt-ct__btn lt-ct__btn--primary" onClick={() => setScorecardOpen(true)}>
                    View scorecard
                  </button>
                  <button
                    type="button"
                    className="lt-ct__btn lt-ct__btn--ghost lt-ct__btn--sm"
                    onClick={downloadGraded}
                    disabled={downloading}
                  >
                    {downloading ? "Preparing…" : "↓ Graded sheet"}
                  </button>
                  <button
                    type="button"
                    className="lt-ct__btn lt-ct__btn--ghost lt-ct__btn--sm"
                    onClick={downloadSolution}
                    disabled={downloading}
                  >
                    ↓ Solution key
                  </button>
                </div>
                <div className="lt-ct__startrow">
                  <button type="button" className="lt-ct__btn lt-ct__btn--ghost lt-ct__btn--sm" onClick={practiseTopic}>
                    Practise this chapter
                  </button>
                  <button type="button" className="lt-ct__btn lt-ct__btn--ghost lt-ct__btn--sm" onClick={() => navigate(backTo)}>
                    Revisit in Topic Hub
                  </button>
                </div>
                <div className="lt-ct__honest">
                  <span>·</span>
                  <span>
                    Solution-key marks follow the <b>real CBSE scheme per step</b> (variable, not a flat
                    1/step). Saved as <b>{nomen.name}</b> — now in “Your {topicName} tests”.
                  </span>
                </div>
              </div>
            </div>
          )}

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

          {scorecardOpen && resultsPhase === "partial" && (
            <ResultsScorecard
              askFirstFeedback // FIRST-FEEDBACK-1 — live, just-graded scorecard only
              variant={chapterTestScorecardVariant({
                name: nomen.name,
                code: nomen.code,
                phase: "partial",
                response: buildChapterTestResponse({
                  paper,
                  objective,
                  subjectiveQuestions: subjectiveQs,
                  subjectiveResponse: null,
                }),
                onUpload: () => setScorecardOpen(false),
                onUploadLater: () => {
                  setScorecardOpen(false);
                  navigate(backTo);
                },
              })}
              onClose={() => setScorecardOpen(false)}
            />
          )}

          {scorecardOpen && resultsPhase === "full" && fullResponse && (
            <ResultsScorecard
              askFirstFeedback // FIRST-FEEDBACK-1 — live, just-graded scorecard only
              variant={withPaperTutorAsks(withGuideTarget(chapterTestScorecardVariant({
                name: nomen.name,
                code: nomen.code,
                phase: "full",
                response: fullResponse,
                deltaLine: ctDeltaLine,
                // qNumber + canonical id per question → the by-concept lens join
                // ([FU-CT-CONCEPT-LENS]); PersistedWorksheetQuestion satisfies
                // ConceptLensQuestion structurally.
                questions: paper.questions,
                downloading,
                // GRADED-STEP-BLOCK - the read-sheet action now TAKES the student to their
                // graded answer sheet inside the open scorecard, instead of closing the panel.
                // It was never a dead handler: the identical call is CORRECT on Check & Improve,
                // which renders a bespoke graded view in the page body underneath. This surface
                // has no such view, so closing dropped the student onto a summary card whose only
                // primary action reopened the panel they had just left - a loop with no way on.
                onReadSheet: revealGradedSheet,
                onPractise: practiseTopic,
                onDownloadGraded: () => {
                  setScorecardOpen(false);
                  void downloadGraded();
                },
                onDownloadSolution: () => {
                  setScorecardOpen(false);
                  void downloadSolution();
                },
                onRevisit: () => navigate(backTo),
              }), ctGuideTarget), fullResponse, liveTutorAskFor)}
              onClose={() => setScorecardOpen(false)}
            />
          )}
        </>
      )}
    </div>
  );
}
