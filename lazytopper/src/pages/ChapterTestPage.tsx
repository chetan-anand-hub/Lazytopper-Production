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
  type SessionRecord,
  type SessionSubject,
} from "../services/sessionRecords";
import {
  drawChapterTest,
  objectiveQuestions,
  subjectiveQuestions,
  type DrawnChapterTest,
} from "../components/chaptertest/chapterTestBlueprint";
import { CbqShareNote } from "../lib/cbq/CbqShareNote";
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
} from "../services/chapterTestPaperStore";
// BANK-LEAN-1 (C3): the chapter-test variants join to the question bank (by-concept
// lens), so they live in scorecardBankLenses — scorecardVariants stays bank-free.
import {
  chapterTestScorecardVariant,
  storedChapterTestScorecardVariant,
} from "../components/results/scorecardBankLenses";
import ResultsScorecard, { revealGradedSheet } from "../components/results/ResultsScorecard";
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
import { useFairUse } from "../components/usage/useFairUse";
import { gradingErrorMessage } from "../ai/gradingTransport";
import { resumableJob, sessionJobStore, type GradingJobInterruptedError } from "../ai/gradingJobs";
import GradingJobRows from "../components/grading/GradingJobRows";
import { useGradingJob } from "../components/grading/useGradingJob";

type Phase = "setup" | "taking" | "results";
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
  const { user } = useAuth();

  const grade = params.grade || "10";
  const subject = subjectFromParam(params.subject || sp.get("subject") || "Maths");
  const sessionSubject: SessionSubject = subject === "Science" ? "science" : "maths";
  const rawTopicKey = params.topicKey || sp.get("topic") || "";
  const topicKey = normalizeTopicKey(rawTopicKey) || rawTopicKey;
  const topicName = resolveTopicDisplayName(subject, topicKey);
  const isSignedIn = !!user?.uid && !user?.isLocalSession;
  const fairUse = useFairUse("chapter-test", isSignedIn);

  const navState = (location.state as { back?: string; backLabel?: string } | null) || null;
  const backTo = navState?.back || `/topic-hub/${grade}/${subject.toLowerCase()}/${topicKey}`;
  const backLabel = navState?.backLabel || `Back to ${topicName} · Topic Hub`;

  // ── Durable identity + the fresh draw ────────────────────────────────────────
  const [nomen, setNomen] = useState<{ code: string; name: string } | null>(null);
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
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nomen, bank.ready, subject, topicKey, grade, drawNonce]);

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
  const [reopen, setReopen] = useState<{
    record: SessionRecord;
    response: WorksheetGradeResponse | null;
    awaitingDetail?: string;
  } | null>(null);

  // GRADING-JOBS-1 J2 — a background grade of this chapter's test survives a reload: the paper,
  // its frozen objective score and its code are stored WITH the job (the answers were already
  // cleared at submit), and the page re-opens the upload step on that paper and resumes the poll.
  const jobUi = useGradingJob();
  const jobStore = useMemo(() => sessionJobStore(`chapter-test:${topicKey}`), [topicKey]);
  const [resumedCt, setResumedCt] = useState<ChapterTestJobContext | null>(null);
  const [resumePending, setResumePending] = useState(false);
  const lastUploadRef = useRef<{ imageBase64: string; imageMimeType: string } | null>(null);
  const paper = resumedCt?.paper ?? draw?.paper ?? null;
  const timeLimitSeconds = useMemo(() => Math.max(15, Math.round((paper?.totalMarks ?? 40) * 1.2)) * 60, [paper]);
  const progressKey = nomen ? `lazytopper.ct.progress.${nomen.code}` : null;

  // Autosave restore (honest "✓ saved"): pull any in-flight answers for this test.
  useEffect(() => {
    if (!progressKey || typeof window === "undefined") return;
    try {
      const raw = window.sessionStorage.getItem(progressKey);
      if (!raw) return;
      const saved = JSON.parse(raw) as { answers?: Record<number, string>; flags?: number[]; elapsed?: number };
      if (saved.answers) setAnswers(saved.answers);
      if (Array.isArray(saved.flags)) setFlags(new Set(saved.flags));
      if (typeof saved.elapsed === "number") setElapsed(saved.elapsed);
    } catch {
      /* best-effort */
    }
  }, [progressKey]);

  // Autosave write while taking.
  useEffect(() => {
    if (phase !== "taking" || !progressKey || typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem(progressKey, JSON.stringify({ answers, flags: [...flags], elapsed }));
    } catch {
      /* quota — best-effort */
    }
  }, [answers, flags, elapsed, phase, progressKey]);

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
    setPhase("taking");
    setCurrentQNumber(1);
    trackUxEvent("chapter_test_start", "ChapterTestPage", { topicKey, subject });
  }, [topicKey, subject, fairUse.blockPaperStart]);

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
    setDownloading(true);
    try {
      await exportWorksheetPdf(paper, "questions", nomen.code);
    } catch {
      /* best-effort */
    } finally {
      setDownloading(false);
    }
  }, [paper, nomen, downloading]);
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

  const practiseTopic = useCallback(() => {
    navigate(`/practice/${grade}/${subject.toLowerCase()}?topic=${encodeURIComponent(topicKey)}`);
  }, [navigate, grade, subject, topicKey]);

  // ── Re-open a stored test read-only ──────────────────────────────────────────
  // PENDING-UPLOAD-1: a pending test re-opens ITS OWN paper on the upload step (this device's
  // copy, else the server snapshot). The grade then attaches to the existing record: same code,
  // same worksheetId (so the fair-use paper pass and MI identity are the same paper's).
  const openPendingUpload = useCallback(
    async (record: SessionRecord) => {
      const snap = await loadChapterTestPaper(user, record.id);
      if (snap) {
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
        awaitingDetail:
          "We couldn’t find the saved copy of this paper on this device or online. Open it on the device you sat it on, or start a new one.",
      });
    },
    [user],
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

  const currentQuestion = paper?.questions.find((q) => q.qNumber === currentQNumber) ?? null;
  const currentIsObjective = currentQuestion ? String(currentQuestion.section).toUpperCase() === "A" : false;

  // ══════════════════════════════════════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════════════════════════════════════

  return (
    <div className="lt-ct">
      <style>{CT_CSS}</style>

      {/* Read-only re-open scorecard (from a history card), any phase. */}
      {reopen && (
        <ResultsScorecard
          variant={storedChapterTestScorecardVariant(reopen.record, {
            gradedDateLabel: new Date(reopen.record.gradedAt).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            }),
            response: reopen.response,
            awaitingDetail: reopen.awaitingDetail,
            // Awaiting-sheet records offer "Upload answer sheet" (also a retry after a failed read).
            onUploadSheet:
              reopen.record.status !== "graded" && !reopen.response
                ? () => void openPendingUpload(reopen.record)
                : undefined,
            onDone: () => setReopen(null),
          })}
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

                {!draw && bank.error ? (
                  <div className="lt-ct__empty">
                    We couldn’t load the {topicName} questions. Check your connection and reload the page.
                  </div>
                ) : !draw ? (
                  <div className="lt-ct__empty">Building your test…</div>
                ) : !draw.enoughQuestions ? (
                  <div className="lt-ct__empty">
                    We don’t have enough {topicName} questions in the bank to build a fair test yet. This
                    chapter is still being expanded — check back soon.
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
                      <span className="lt-ct__chip">
                        <b>~{Math.round(timeLimitSeconds / 60)}</b> min
                      </span>
                      <span className="lt-ct__chip">
                        Sections <b>A–D</b>
                      </span>
                    </div>

                    <div className="lt-ct__blueprint">
                      {draw.blueprint.map((row) => (
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
                      cbqMarks={draw.cbqMarks}
                      totalMarks={draw.totalMarks}
                      cbqShortfall={draw.cbqShortfall}
                      plainMcqMarks={draw.plainMcqMarks}
                      constructedMarks={draw.constructedMarks}
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
                    <div className="lt-ct__startrow">
                      <button type="button" className="lt-ct__btn lt-ct__btn--primary" onClick={() => void startTest()} disabled={starting}>
                        Start the test →
                      </button>
                      <button
                        type="button"
                        className="lt-ct__btn lt-ct__btn--ghost lt-ct__btn--sm"
                        onClick={downloadTest}
                        disabled={downloading}
                      >
                        {downloading ? "Preparing…" : "↓ Download this test (PDF)"}
                      </button>
                    </div>

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
                        full-screen so you can focus. <b>Each test is a fresh draw</b> — different questions
                        from your last {topicName} test.
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
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
              variant={chapterTestScorecardVariant({
                name: nomen.name,
                code: nomen.code,
                phase: "full",
                response: fullResponse,
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
              })}
              onClose={() => setScorecardOpen(false)}
            />
          )}
        </>
      )}
    </div>
  );
}
