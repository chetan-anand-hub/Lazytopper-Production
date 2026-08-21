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
// scorecard with the section AND chapter lenses. NO board-readiness projection.
//
// Reused byte-unchanged: ChapterTestNavigator, PreSubmitConfirm +
// ChapterTestUploadPanel (additive copy props only), scoreObjectiveSection +
// buildChapterTestResponse (via fullMockGradeService), the shared grader, the
// Universal <ResultsScorecard>, the worksheet PDF exporters, and CT_CSS (the
// page renders inside `.lt-ct.lt-fm`; FM_CSS carries only the deltas).
// ONE responsive component — pure-CSS reflow, 360px verified.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { trackUxEvent } from "../services/uxTelemetry";
import { MathText } from "../components/question/MathText";
import type { WorksheetGradeResponse } from "../ai/aiClient";
import type { PersistedWorksheet } from "../services/worksheetSessionStore";
import {
  getSessionRecordsFromCloud,
  getSessionPerQuestion,
  fullMockSequence,
  fullMockNomenclature,
  type SessionRecord,
  type SessionSubject,
  type SessionFocusAggregates,
} from "../services/sessionRecords";
import { scoreObjectiveSection, type ObjectiveScore } from "../services/chapterTestGradeService";
import {
  buildFullMockResponse,
  writeFullMockPartialRecord,
  gradeFullMockUpload,
} from "../services/fullMockGradeService";
import {
  saveFullMockPaperSnapshot,
  fetchFullMockPaperSnapshot,
  deleteFullMockPaperSnapshot,
} from "../services/fullMockPaperStore";
import {
  FM_DURATION_MS,
  drawFullMock,
  fullMockObjectiveQuestions,
  fullMockSubjectiveQuestions,
  type DrawnFullMock,
  type FMSubject,
} from "../components/fullmock/fullMockBlueprint";
import {
  saveFullMockSession,
  loadFullMockSession,
  clearFullMockSession,
  findInProgressSession,
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
  storedFullMockScorecardVariant,
  deriveFullMockChapterLens,
  deriveStoredFullMockChapterLens,
  fullMockFocusLine,
} from "../components/results/scorecardVariants";
import ResultsScorecard, { revealGradedSheet } from "../components/results/ResultsScorecard";
import { exportWorksheetPdf, exportGradedWorksheetPdf } from "../components/worksheet/worksheetPdfExport";
import { buildDesktopWorksheetPath } from "../lib/desktop/navigation";
import { CT_CSS } from "../components/chaptertest/chapterTestStyles";
import { FM_CSS } from "../components/fullmock/fullMockStyles";
import ChapterTestNavigator from "../components/chaptertest/ChapterTestNavigator";
import ChapterTestUploadPanel from "../components/chaptertest/ChapterTestUploadPanel";
import PreSubmitConfirm from "../components/chaptertest/PreSubmitConfirm";
import FullMockHistoryPanel from "../components/fullmock/FullMockHistoryPanel";
import FullMockPendingBanner from "../components/fullmock/FullMockPendingBanner";

type Phase = "setup" | "taking" | "results";

const SECTION_HEAD: Record<string, string> = {
  A: "Section A · Objective · 1 mark each",
  B: "Section B · Very short answer · 2 marks",
  C: "Section C · Short answer · 3 marks",
  D: "Section D · Long answer · 5 marks",
  E: "Section E · Case-based · 4 marks",
};

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
function coachingLine(resp: WorksheetGradeResponse): string {
  let knowledge = 0;
  let careless = 0;
  for (const r of resp.results) {
    if (r.couldNotRead || !r.mistakeSummary) continue;
    knowledge += (r.mistakeSummary.conceptual || 0) + (r.mistakeSummary.calculation || 0);
    careless += (r.mistakeSummary.silly || 0) + (r.mistakeSummary.presentation || 0);
  }
  const parts: string[] = [];
  if (careless > 0)
    parts.push(`${careless} careless slip${careless === 1 ? "" : "s"} — your method was right, slow down on the final line and units.`);
  if (knowledge > 0)
    parts.push(`${knowledge} knowledge gap${knowledge === 1 ? "" : "s"} — practise the chapters that cost you marks.`);
  if (resp.pendingCount > 0)
    parts.push(`Re-upload the ${resp.pendingCount} pending page${resp.pendingCount === 1 ? "" : "s"} to complete your score.`);
  return parts.length ? parts.join(" ") : "Clean sheet — every question you uploaded scored full marks. Keep this up.";
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
  const { user } = useAuth();

  const grade = params.grade || "10";
  const subject = subjectFromParam(params.subject || sp.get("subject") || "Maths");
  const sessionSubject: SessionSubject = subject === "Science" ? "science" : "maths";
  const isSignedIn = !!user?.uid && !user?.isLocalSession;
  const sessionUid = user?.uid ?? null;
  const backTo = "/practice-hub";

  // ── Records (history panel · pending banner · durable #NN) ──────────────────
  const [records, setRecords] = useState<SessionRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(true);
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

  useEffect(() => {
    let live = true;
    (async () => {
      setRecordsLoading(true);
      const all = await loadRecords();
      if (!live) return;
      const seq = fullMockSequence(all, sessionSubject);
      const nm = fullMockNomenclature(sessionSubject, seq);
      setNomen({ code: nm.code, name: nm.name });
      setRecordsLoading(false);
    })();
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, sessionSubject]);

  const mockRecords = useMemo(
    () => records.filter((r) => r.surface === "full-mock").sort((a, b) => b.gradedAt - a.gradedAt),
    [records],
  );
  const pendingRecords = useMemo(
    () => mockRecords.filter((r) => r.status !== "graded"),
    [mockRecords],
  );

  // ── The fresh draw (only for a NEW mock; resume restores its own paper) ─────
  const draw: DrawnFullMock | null = useMemo(() => {
    if (!nomen) return null;
    return drawFullMock({
      subject,
      grade,
      worksheetId: mintFullMockId(),
      code: nomen.code,
      name: nomen.name,
      // A fresh random seed per draw — the spec-mandated fresh paper. The seeded
      // engine underneath keeps the DRAW itself deterministic + unit-testable.
      seed: (Math.random() * 0xffffffff) >>> 0,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nomen, subject, grade, drawNonce]);

  // ── Test-taking state ────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>("setup");
  const [activeMock, setActiveMock] = useState<ActiveMock | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [flags, setFlags] = useState<Set<number>>(new Set());
  const [currentQNumber, setCurrentQNumber] = useState(1);
  const [focusSeed, setFocusSeed] = useState<SessionFocusAggregates>(EMPTY_FOCUS);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [nowTick, setNowTick] = useState(() => Date.now());

  // Latest values for the autosave writer (avoids stale closures in callbacks).
  const answersRef = useRef(answers);
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
      const objQs = fullMockObjectiveQuestions(a.paper);
      const subjQs = fullMockSubjectiveQuestions(a.paper);
      const obj = scoreObjectiveSection(objQs, currentAnswers);
      const partialResponse = buildFullMockResponse({
        paper: a.paper,
        objective: obj,
        subjectiveQuestions: subjQs,
        subjectiveResponse: null,
      });
      writeFullMockPartialRecord({
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
      void loadRecords().then((all) => {
        const seq = fullMockSequence(all, sessionSubject);
        const nm = fullMockNomenclature(sessionSubject, seq);
        setNomen({ code: nm.code, name: nm.name });
      });
    },
    [user, sessionSubject, sessionUid, subject, grade, loadRecords],
  );

  const finishToPartial = useCallback(() => {
    const a = activeRef.current;
    if (!a) return;
    doSubmit(a, answersRef.current, focusCtl.snapshot());
  }, [doSubmit, focusCtl]);

  // Auto-submit when the wall clock runs out — like the board hall, once.
  useEffect(() => {
    if (phase !== "taking" || !activeMock) return;
    if (remaining <= 0 && !submittedRef.current) finishToPartial();
  }, [phase, activeMock, remaining, finishToPartial]);

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
    submittedRef.current = false;
    const a: ActiveMock = {
      paper: draw.paper,
      code: nomen.code,
      name: nomen.name,
      startedAt: Date.now(),
      durationMs: FM_DURATION_MS,
      pyqCount: draw.pyqCount,
      freshCount: draw.freshCount,
    };
    setActiveMock(a);
    activeRef.current = a;
    setAnswers({});
    setFlags(new Set());
    setCurrentQNumber(1);
    setFocusSeed({ ...EMPTY_FOCUS });
    focusRef.current = { ...EMPTY_FOCUS };
    setPhase("taking");
    trackUxEvent("full_mock_start", "FullMockPage", { subject, code: nomen.code });
  }, [draw, nomen, subject]);

  const resumeMock = useCallback(() => {
    const s = inProgress ?? findInProgressSession(sessionUid);
    if (!s) return;
    setPanelOpen(false);
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
  const handleGrade = useCallback(
    async (upload: { imageBase64: string; imageMimeType: string }) => {
      const a = activeRef.current;
      if (!a || !objective || grading) return;
      setGrading(true);
      setGradeError(null);
      try {
        const outcome = await gradeFullMockUpload({
          user,
          paper: a.paper,
          code: a.code,
          subject: sessionSubject,
          objective,
          subjectiveQuestions: fullMockSubjectiveQuestions(a.paper),
          upload,
          focus: focusRef.current,
        });
        if (!outcome.ok) {
          setGradeError(outcome.response.error || "We couldn’t grade your answers. Try a clearer scan, or try again.");
        } else {
          setFullResponse(outcome.response);
          setResultsPhase("full");
          setScorecardOpen(true);
          clearFullMockSession(sessionUid, a.code);
          // Fully graded — the durable record + perQuestion payload exist; the
          // cross-device paper snapshot has done its job.
          deleteFullMockPaperSnapshot(user, a.code);
          trackUxEvent("full_mock_complete", "FullMockPage", {
            subject,
            score: `${outcome.response.gradedMarksAwarded}/${outcome.response.gradedMarksTotal}`,
          });
          void loadRecords();
        }
      } catch (err) {
        setGradeError(err instanceof Error ? err.message : "Failed to grade your answers.");
      } finally {
        setGrading(false);
      }
    },
    [objective, grading, user, sessionSubject, sessionUid, subject, loadRecords],
  );

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
        setFullResponse(null);
        setResultsPhase("partial");
        setScorecardOpen(false);
        setPhase("results");
      } else {
        // The paper is genuinely unavailable (pre-snapshot mock, offline, or a
        // failed snapshot write) — say so plainly; never fabricate a paper to
        // grade against (owner-ratified).
        setReopen({
          record,
          response: null,
          awaitingDetail:
            "This mock was sat on another device (or its saved paper is gone from this one). " +
            "Open LazyTopper on the device you used to upload its answer sheet — nothing has been lost.",
        });
      }
    },
    [sessionUid, user],
  );

  // ── Re-open a stored mock read-only ──────────────────────────────────────────
  const openStored = useCallback(
    async (record: SessionRecord) => {
      let response: WorksheetGradeResponse | null = null;
      if (record.status !== "pending-upload") {
        const payload = await getSessionPerQuestion(user?.uid, record.perQuestionRef);
        response = payload?.response ?? null;
      }
      setPanelOpen(false);
      setReopen({ record, response });
    },
    [user?.uid],
  );

  // ── Downloads (the triad — name + code on all three) ─────────────────────────
  const paperForExport = activeMock?.paper ?? draw?.paper ?? null;
  const codeForExport = activeMock?.code ?? nomen?.code;
  const downloadPaper = useCallback(async () => {
    if (!paperForExport || downloading) return;
    setDownloading(true);
    try {
      await exportWorksheetPdf(paperForExport, "questions", codeForExport);
    } catch {
      /* best-effort */
    } finally {
      setDownloading(false);
    }
  }, [paperForExport, codeForExport, downloading]);
  const downloadSolution = useCallback(async () => {
    if (!paperForExport || downloading) return;
    setDownloading(true);
    try {
      await exportWorksheetPdf(paperForExport, "answers", codeForExport);
    } catch {
      /* best-effort */
    } finally {
      setDownloading(false);
    }
  }, [paperForExport, codeForExport, downloading]);
  const downloadGraded = useCallback(async () => {
    const a = activeRef.current;
    if (!a || !fullResponse || downloading) return;
    setDownloading(true);
    try {
      await exportGradedWorksheetPdf({
        ws: a.paper,
        response: fullResponse,
        name: a.name,
        code: a.code,
        coaching: coachingLine(fullResponse),
      });
    } catch {
      /* best-effort */
    } finally {
      setDownloading(false);
    }
  }, [fullResponse, downloading]);

  // ── Scorecard inputs (delta honest-or-silent · §8b focus line) ───────────────
  const deltaLine = useMemo(() => {
    if (!fullResponse || !activeMock) return null;
    const prev = mockRecords.find(
      (r) =>
        r.subject === sessionSubject &&
        r.status === "graded" &&
        r.id !== activeMock.code &&
        r.marksTotal === fullResponse.gradedMarksTotal &&
        r.marksTotal > 0,
    );
    if (!prev) return null;
    const d = fullResponse.gradedMarksAwarded - prev.marksAwarded;
    if (d === 0) return null;
    return `${d > 0 ? "▲" : "▼"} ${Math.abs(d)} mark${Math.abs(d) === 1 ? "" : "s"} vs ${prev.title || prev.id}`;
  }, [fullResponse, activeMock, mockRecords, sessionSubject]);

  // Cheap per-render read: focusRef is frozen once the test ends, which is the
  // only time this line renders (partial + full scorecards).
  const focusLine = fullMockFocusLine(focusRef.current);

  const practiseWorstChapter = useCallback(() => {
    const a = activeRef.current;
    const lens =
      a && fullResponse ? deriveFullMockChapterLens(fullResponse, a.paper.questions) : null;
    const worst = lens?.[0];
    navigate(
      buildDesktopWorksheetPath({
        ...(worst && worst.lost > 0
          ? { scope: "topic" as const, topic: worst.key }
          : { scope: "full-subject" as const }),
        subject,
        source: "full-mock",
        returnTo: `/full-mock/${grade}/${subject}`,
      }),
    );
  }, [navigate, subject, grade, fullResponse]);

  const currentQuestion = activeMock?.paper.questions.find((q) => q.qNumber === currentQNumber) ?? null;
  const currentIsObjective = currentQuestion ? String(currentQuestion.section).toUpperCase() === "A" : false;
  const unansweredObjective = activeMock
    ? fullMockObjectiveQuestions(activeMock.paper).filter(
        (q) => !(answers[q.qNumber] && answers[q.qNumber] !== ""),
      ).length
    : 0;

  const awaitingCount = pendingRecords.length;

  // ══════════════════════════════════════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════════════════════════════════════

  return (
    <div className="lt-ct lt-fm">
      <style>{CT_CSS}</style>
      <style>{FM_CSS}</style>

      {/* Read-only re-open scorecard (history card / cross-device pending). */}
      {reopen && (
        <ResultsScorecard
          variant={storedFullMockScorecardVariant(reopen.record, {
            gradedDateLabel: new Date(reopen.record.gradedAt).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            }),
            response: reopen.response,
            awaitingDetail: reopen.awaitingDetail,
            onDone: () => setReopen(null),
          })}
          onClose={() => setReopen(null)}
        />
      )}

      {/* History overlay panel (worksheet pattern — spec §4). */}
      {panelOpen && (
        <FullMockHistoryPanel
          records={mockRecords}
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
              ← Practice
            </button>
            <span className="lt-ct__pagetitle">Full Mock</span>
          </div>

          <div className="lt-ct__setup">
            <div className="lt-ct__setup-main">
              <div className="lt-fm__headrow">
                <div>
                  <div className="lt-ct__eyebrow">Full mock · {subject}</div>
                  <h1 className="lt-ct__fr">{nomen?.name ?? `${subject} · Mock`}</h1>
                </div>
                <button type="button" className="lt-fm__hctl" onClick={() => setPanelOpen(true)}>
                  <span>Your mocks</span>
                  <span className="lt-fm__hctl-cnt">· {mockRecords.length}</span>
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
                <div className="lt-ct__sub">
                  A complete board paper — every chapter, real weightage, real timing. Objective is
                  scored the moment you submit; write the rest on paper and upload for the full result.
                </div>

                {!draw ? (
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
                      <span className="lt-ct__chip">
                        <b>3</b> hours
                      </span>
                      <span className="lt-ct__chip">
                        Sections <b>A–E</b>
                      </span>
                      <span className="lt-ct__chip">⏱ always timed</span>
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
                                  row.autoGraded ? "instant" : "upload"
                                }`
                              : "none available yet"}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="lt-ct__histrail-h">
                      Chapter weightage{" "}
                      <span className="lt-fm__lbl-soft">— as the board distributes it</span>
                    </div>
                    <div className="lt-fm__wbar" aria-hidden="true">
                      {draw.chapterWeights.map((w, i) => (
                        <i
                          key={w.slug}
                          className={`lt-fm__wseg lt-fm__g${Math.max(1, Math.min(20, Math.round(w.percent)))} lt-fm__c${i % WBAR_CLASSES}`}
                        />
                      ))}
                    </div>
                    <div className="lt-fm__wlegend">
                      {draw.chapterWeights.map((w, i) => (
                        <div className="lt-fm__wlegend-item" key={w.slug}>
                          <span className={`lt-fm__wlegend-sw lt-fm__c${i % WBAR_CLASSES}`} />
                          {w.label} {Math.round(w.percent)}%
                        </div>
                      ))}
                    </div>

                    <div className="lt-fm__mix">
                      This draw: <b>{draw.pyqCount}</b> past-year board question
                      {draw.pyqCount === 1 ? "" : "s"} · <b>{draw.freshCount}</b> fresh from the
                      LazyTopper bank.
                    </div>

                    <div className="lt-ct__startrow">
                      <button type="button" className="lt-ct__btn lt-ct__btn--primary" onClick={startTest}>
                        Start the mock →
                      </button>
                      <button
                        type="button"
                        className="lt-ct__btn lt-ct__btn--ghost lt-ct__btn--sm"
                        onClick={downloadPaper}
                        disabled={downloading}
                      >
                        {downloading ? "Preparing…" : "⤓ Download this paper (PDF) — recommended for a 3-hour sitting"}
                      </button>
                    </div>

                    <div className="lt-ct__honest">
                      <span>·</span>
                      <span>
                        This is a 3-hour paper. Your answers and timer are saved — if you’re
                        interrupted you can resume exactly where you left off. Your on-screen time is
                        recorded, like the real exam hall; leaving doesn’t pause the clock.{" "}
                        <b>Each mock is a fresh draw</b> — different from your last.
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ─────────────── TAKING (full screen, always timed) ─────────────── */}
      {phase === "taking" && activeMock && currentQuestion && (
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
              ← Practice
            </button>
            <span className="lt-ct__pagetitle">Mock · Result</span>
          </div>

          {resultsPhase === "partial" ? (
            <ChapterTestUploadPanel
              eyebrow="Full Mock · Result"
              sectionsLabel="Sections B–E"
              name={activeMock.name}
              code={activeMock.code}
              objective={{ awarded: objective.awarded, total: objective.total }}
              grading={grading}
              error={gradeError}
              isSignedIn={isSignedIn}
              onGrade={handleGrade}
              onSkip={() => setPhase("setup")}
            />
          ) : (
            <div className="lt-ct__upload">
              <div className="lt-ct__uploadcard">
                <div className="lt-ct__eyebrow">Full Mock · Result</div>
                <div className="lt-ct__title lt-ct__fr">{activeMock.name}</div>
                <div className="lt-ct__sub">
                  {activeMock.code} · fully graded —{" "}
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
                    {downloading ? "Preparing…" : "⤓ Graded sheet"}
                  </button>
                  <button
                    type="button"
                    className="lt-ct__btn lt-ct__btn--ghost lt-ct__btn--sm"
                    onClick={downloadSolution}
                    disabled={downloading}
                  >
                    ⤓ Solution key
                  </button>
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
            </div>
          )}

          {scorecardOpen && resultsPhase === "partial" && (
            <ResultsScorecard
              variant={fullMockScorecardVariant({
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
              })}
              onClose={() => setScorecardOpen(false)}
            />
          )}

          {scorecardOpen && resultsPhase === "full" && fullResponse && (
            <ResultsScorecard
              variant={fullMockScorecardVariant({
                name: activeMock.name,
                code: activeMock.code,
                phase: "full",
                response: fullResponse,
                questions: activeMock.paper.questions,
                deltaLine,
                focusLine,
                downloading,
                // GRADED-STEP-BLOCK - the read-sheet action now TAKES the student to their
                // graded answer sheet inside the open scorecard, instead of closing the panel.
                // It was never a dead handler: the identical call is CORRECT on Check & Improve,
                // which renders a bespoke graded view in the page body underneath. This surface
                // has no such view, so closing dropped the student onto a summary card whose only
                // primary action reopened the panel they had just left - a loop with no way on.
                onReadSheet: revealGradedSheet,
                onPractiseChapter: () => {
                  setScorecardOpen(false);
                  practiseWorstChapter();
                },
                onDownloadGraded: () => {
                  setScorecardOpen(false);
                  void downloadGraded();
                },
                onDownloadSolution: () => {
                  setScorecardOpen(false);
                  void downloadSolution();
                },
              })}
              onClose={() => setScorecardOpen(false)}
            />
          )}
        </>
      )}
    </div>
  );
}
