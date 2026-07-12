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
import { useNavigate, useParams, useSearchParams, useLocation } from "react-router-dom";
import { resolveTopicDisplayName, normalizeTopicKey } from "../utils/topicResolver";
import { resolveCanonicalSlug } from "../data/syllabus/canonicalTopicSlug";
import { useAuth } from "../context/AuthContext";
import { trackUxEvent } from "../services/uxTelemetry";
import { MathText } from "../components/question/MathText";
import type { WorksheetGradeResponse } from "../ai/aiClient";
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
import {
  scoreObjectiveSection,
  buildChapterTestResponse,
  writeChapterTestPartialRecord,
  gradeChapterTestUpload,
  type ObjectiveScore,
} from "../services/chapterTestGradeService";
import {
  chapterTestScorecardVariant,
  storedChapterTestScorecardVariant,
} from "../components/results/scorecardVariants";
import ResultsScorecard from "../components/results/ResultsScorecard";
import { exportWorksheetPdf, exportGradedWorksheetPdf } from "../components/worksheet/worksheetPdfExport";
import { CT_CSS } from "../components/chaptertest/chapterTestStyles";
import ChapterTestNavigator from "../components/chaptertest/ChapterTestNavigator";
import ChapterTestHistoryRail from "../components/chaptertest/ChapterTestHistoryRail";
import ChapterTestUploadPanel from "../components/chaptertest/ChapterTestUploadPanel";
import PreSubmitConfirm from "../components/chaptertest/PreSubmitConfirm";

type Phase = "setup" | "taking" | "results";
type SubjectKey = "Maths" | "Science";

const SECTION_HEAD: Record<string, string> = {
  A: "Section A · Objective · 1 mark each",
  B: "Section B · Very short answer · 2 marks",
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
    parts.push(`${knowledge} knowledge gap${knowledge === 1 ? "" : "s"} — practise this chapter to close ${knowledge === 1 ? "it" : "them"}.`);
  if (resp.pendingCount > 0)
    parts.push(`Re-upload the ${resp.pendingCount} pending page${resp.pendingCount === 1 ? "" : "s"} to complete your score.`);
  return parts.length ? parts.join(" ") : "Clean sheet — every question you uploaded scored full marks. Keep this up.";
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

  const draw: DrawnChapterTest | null = useMemo(() => {
    if (!nomen) return null;
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
  }, [nomen, subject, topicKey, grade, drawNonce]);

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
  const [reopen, setReopen] = useState<{ record: SessionRecord; response: WorksheetGradeResponse | null } | null>(null);

  const paper = draw?.paper ?? null;
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
  }, [paper, nomen, objectiveQs, subjectiveQs, answers, user, sessionSubject, topicKey, progressKey, loadRecords]);

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

  const startTest = useCallback(() => {
    setPhase("taking");
    setCurrentQNumber(1);
    trackUxEvent("chapter_test_start", "ChapterTestPage", { topicKey, subject });
  }, [topicKey, subject]);

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
    async (upload: { imageBase64: string; imageMimeType: string }) => {
      if (!paper || !nomen || !objective || grading) return;
      setGrading(true);
      setGradeError(null);
      try {
        const outcome = await gradeChapterTestUpload({
          user,
          paper,
          code: nomen.code,
          subject: sessionSubject,
          topicKey,
          objective,
          subjectiveQuestions: subjectiveQs,
          upload,
        });
        if (!outcome.ok) {
          setGradeError(outcome.response.error || "We couldn’t grade your answers. Try a clearer scan, or try again.");
        } else {
          setFullResponse(outcome.response);
          setResultsPhase("full");
          setScorecardOpen(true);
          trackUxEvent("chapter_test_complete", "ChapterTestPage", {
            topicKey,
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
    [paper, nomen, objective, grading, user, sessionSubject, topicKey, subjectiveQs, loadRecords],
  );

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
  const openStored = useCallback(
    async (record: SessionRecord) => {
      let response: WorksheetGradeResponse | null = null;
      if (record.status !== "pending-upload") {
        const payload = await getSessionPerQuestion(user?.uid, record.perQuestionRef);
        response = payload?.response ?? null;
      }
      setReopen({ record, response });
    },
    [user?.uid],
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

                {!draw ? (
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

                    <div className="lt-ct__startrow">
                      <button type="button" className="lt-ct__btn lt-ct__btn--primary" onClick={startTest}>
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

          {resultsPhase === "partial" ? (
            <ChapterTestUploadPanel
              name={nomen.name}
              code={nomen.code}
              objective={{ awarded: objective.awarded, total: objective.total }}
              grading={grading}
              error={gradeError}
              isSignedIn={isSignedIn}
              onGrade={handleGrade}
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
                onReadSheet: () => setScorecardOpen(false),
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
