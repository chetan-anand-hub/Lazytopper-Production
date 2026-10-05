import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import type { PersistedWorksheet } from "../../services/worksheetSessionStore";
import { getWorksheetGrade, listStoredWorksheetsLite } from "../../services/worksheetSessionStore";
import { worksheetNomenclature } from "./worksheetModel";
import { exportGradedWorksheetPdf } from "./worksheetPdfExport";
import ResultsScorecard from "../results/ResultsScorecard";
import { worksheetScorecardVariant } from "../results/scorecardVariants";
import {
  MISTAKE_TYPE_LABEL,
  coachingLine,
  effectivePaperCounts,
  isQuestionNotAttempted,
  stepDisplay,
  stepForDisplay,
  gradeStateOf,
  paperMarksLost,
  gradeStateCopy,
  isGradedQuestion,
  questionMarksLost,
  splitWithdrawnSteps,
} from "../../lib/mistakeDisplay";
import { MarksLostLines, RubricBlock, WithdrawnWorkBlock } from "../results/GradeStateParts";
import { MathText } from "../question/MathText";
import QrAnswerHandoff from "../qr/QrAnswerHandoff";
// FAIR-USE-UI-1 (UI1) — dark unless /api/usage/me says `enforced: true`.
import FairUseLimitPanel from "../usage/FairUseLimitPanel";
import { useFairUse } from "../usage/useFairUse";
import { UPLOAD_LIMIT_SENTENCE, checkUploadFile } from "../../services/uploadLimits";
import PageTray, { PhotoSourceButtons, useCoarsePointer, usePageTray } from "../upload/PageTray";
import { gradingErrorMessage, gradingStageLabel, type GradingStage } from "../../ai/gradingTransport";
import {
  gradeWorksheetAndRecord,
  type WorksheetGradeOutcome,
} from "../../services/worksheetGradeService";
import type {
  CheckSolutionAnnotatedStep,
  MistakeType,
  WorksheetGradeResponse,
  WorksheetQuestionGrade,
} from "../../ai/aiClient";

/**
 * WorksheetGradePanel — PR-E2b: the one-PDF structured grade loop on the
 * generated-worksheet view. The student uploads ONE PDF (or photo) of all their
 * handwritten answers, labelled Q1, Q2 …; it is graded against the worksheet's
 * KNOWN scheme in a single call, results render per-question with HONEST totals
 * (graded subtotal kept separate from the worksheet total; unreadable pages shown
 * as "pending — re-upload", never folded into a 0), and each graded mistake feeds
 * Mistake Intelligence (the moat) via the single front door.
 *
 * Class-driven scoped styling (own `lt-wg` prefix), pure-CSS mobile reflow, no
 * inline style objects — the worksheet grammar. The file <input> is hard-scoped
 * (display:none, button-triggered) so the global input{width:100%} rule can't
 * touch it.
 */

// Limits now live in services/uploadLimits.ts — ONE definition shared by every upload
// affordance, so the number enforced and the number promised cannot drift apart again.

/** ONE name per stored type — from lib/mistakeDisplay (SCORECARD-MI-1). */
const MISTAKE_LABEL: Readonly<Record<MistakeType, string>> = MISTAKE_TYPE_LABEL;

const SECTION_ORDER = ["A", "B", "C", "D", "E"];
const SECTION_LABEL: Record<string, string> = {
  A: "Section A · objective",
  B: "Section B · short answer",
  C: "Section C · short answer",
  D: "Section D · long answer",
  E: "Section E · case-based",
};

/**
 * Suppress a model-meta `summary` (display-only, §A6). The grader's `summary` can
 * carry first-person meta-prose — most often a refusal when the whole PDF is
 * unreadable ("I am unable to access the PDF…"). Never render that to a student:
 * hide it when nothing was graded, or when it reads as model meta/refusal text.
 */
function isLeakySummary(summary: string | undefined, gradedCount: number): boolean {
  if (!summary || !summary.trim()) return true;
  if (gradedCount === 0) return true; // all-pending → never show raw summary
  return /\b(I am|I'm|I cannot|I can't|I could not|unable to|as an AI|the (PDF|image|document|file)|access the)\b/i.test(
    summary,
  );
}

/** Product-voice coaching line — SCORECARD-MI-1: the ONE `coachingLine` in lib/mistakeDisplay
 *  (owner's three groups, counts in mistakes, never "Clean" while marks were lost — GA-24). */
function buildCoaching(response: WorksheetGradeResponse): string {
  return coachingLine({
    marksAwarded: response.gradedMarksAwarded,
    marksTotal: response.gradedMarksTotal,
    counts: effectivePaperCounts(response.results),
    // SCORECARD-MI-1 PR-2 (B7) — in MARKS when the grade carries them (else counts, unit-labelled).
    marks: paperMarksLost(response.results)?.byType ?? null,
    mismatchCount: response.results.filter((r) => gradeStateOf(r) === "answer-mismatch").length,
    pendingCount: response.pendingCount,
    notAttemptedCount: response.results.filter((r) => isQuestionNotAttempted(r)).length,
  });
}

type MiBanner = "saved" | "no-mistakes" | "local-only" | "none";

/** Collapse the per-question MI outcomes into one honest banner state. */
function miBannerFrom(outcome: WorksheetGradeOutcome | null): MiBanner {
  if (!outcome || outcome.miOutcomes.length === 0) return "none";
  const outcomes = outcome.miOutcomes.map((o) => o.mistakeOutcome);
  if (outcomes.some((o) => o === "logged" || o === "duplicate")) return "saved";
  if (outcomes.some((o) => o === "skipped-no-user" || o === "skipped-local")) return "local-only";
  if (outcomes.every((o) => o === "skipped-clean" || o === "skipped-not-attempted")) return "no-mistakes";
  return "none";
}

function StepRow({ step, objective }: { step: CheckSolutionAnnotatedStep; objective?: boolean }) {
  // SCORECARD-MI-1 — step state from the ONE module ("missing" = Not attempted, no "−N";
  // an unknown status is neutral, never "Incorrect").
  const display = stepDisplay(step.status);
  const cls =
    display.kind === "correct"
      ? "ok"
      : display.kind === "lost"
        ? "bad"
        : display.kind === "not-attempted" || display.kind === "unknown"
          ? "miss"
          : "part";
  return (
    <li className={`lt-wg__step lt-wg__step--${cls}`}>
      <div className="lt-wg__stephead">
        {/* GA-40 — maths through the shared renderer, never raw x^2 / a_20. */}
        <span className="lt-wg__stepdesc"><MathText text={step.description || ""} /></span>
        {step.mistakeType && MISTAKE_LABEL[step.mistakeType] && (
          <span className="lt-wg__steptag">{MISTAKE_LABEL[step.mistakeType]}</span>
        )}
        {(display.kind === "not-attempted" || display.kind === "unknown") && (
          <span className="lt-wg__steptag">{display.label}</span>
        )}
        {/* Objective question → per-step marks are zeroed by design; suppress the
            misleading "0" chip, keep the annotation. */}
        {!objective && display.showDeduction && (
          <span className="lt-wg__stepmk">
            {step.marksAwarded > 0 ? `+${step.marksAwarded}` : step.marksDeducted > 0 ? `−${step.marksDeducted}` : "0"}
          </span>
        )}
      </div>
      {step.teacherAnnotation && <div className="lt-wg__stepnote"><MathText text={step.teacherAnnotation} /></div>}
      {step.correctedWorking && (
        <div className="lt-wg__stepfix">Should be: <MathText text={step.correctedWorking} /></div>
      )}
    </li>
  );
}

function QuestionResult({ ws, g }: { ws: PersistedWorksheet; g: WorksheetQuestionGrade }) {
  const q = ws.questions.find((x) => x.qNumber === g.qNumber);
  // SCORECARD-MI-1 PR-2 (B8 + owner addendum) — not graded: the owner's sentence, no mark.
  if (!isGradedQuestion(g)) {
    const state = gradeStateOf(g);
    return (
      <div className="lt-wg__q lt-wg__q--pending" data-grade-state={state}>
        <div className="lt-wg__qhead">
          <span className="lt-wg__qn">Q{g.qNumber}</span>
          <span className="lt-wg__qpending">{gradeStateCopy(g)}</span>
        </div>
        <p className="lt-wg__qnote">
          {state === "answer-mismatch"
            ? "Nothing has been marked, scored 0 or saved for it."
            : g.note || "We couldn’t read your answer for this question clearly. Re-scan that page and upload again — it isn’t counted as wrong."}
        </p>
      </div>
    );
  }
  // B8 — crossed-out attempts are drawn apart, struck; never inside the marked working.
  const { marked } = splitWithdrawnSteps(g.annotatedSteps ?? []);
  const qMarks = questionMarksLost(g);
  const pct = Number(g.percentage) || 0;
  const tone = pct >= 80 ? "good" : pct >= 50 ? "mid" : "low";
  return (
    <div className="lt-wg__q">
      <div className="lt-wg__qhead">
        <span className="lt-wg__qn">Q{g.qNumber}</span>
        {q?.topicLabel && <span className="lt-wg__qtopic">{q.topicLabel}</span>}
        <span className={`lt-wg__qscore lt-wg__qscore--${tone}`}>
          {g.marksAwarded}/{g.totalMarks}
        </span>
      </div>
      {q?.questionText && <p className="lt-wg__qtext"><MathText text={q.questionText} /></p>}
      {marked.length > 0 && (
        <ul className="lt-wg__steps">
          {marked.map((s) => (
            <StepRow key={s.stepNumber} step={stepForDisplay(s, g)} objective={g.objective} />
          ))}
        </ul>
      )}
      <WithdrawnWorkBlock steps={g.annotatedSteps} />
      {g.teacherNote && <div className="lt-wg__qexaminer">{g.teacherNote}</div>}
      <RubricBlock rubric={g.rubric} />
      {qMarks && <MarksLostLines marks={qMarks} />}
    </div>
  );
}

export default function WorksheetGradePanel({ ws }: { ws: PersistedWorksheet }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isSignedIn = !!user?.uid && !user?.isLocalSession;
  const fairUse = useFairUse("worksheet", isSignedIn);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string>("application/pdf");
  const [grading, setGrading] = useState(false);
  // LOW-END-1 R2: Uploading NN% -> Sent ✓ -> Grading… -> Done (or offline).
  const [stage, setStage] = useState<GradingStage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<WorksheetGradeOutcome | null>(null);
  const [fromCache, setFromCache] = useState(false);
  // PR-A: the auto scorecard popup + the tap-to-reveal sheet state.
  const [scorecardOpen, setScorecardOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [openSecs, setOpenSecs] = useState<Record<string, boolean>>({});
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // Restore a previously-saved grade for this worksheet (revisit). The scorecard
  // does NOT auto-open on a cache restore (it would be jarring on mount); a "View
  // scorecard" affordance reopens it. It auto-opens only after a FRESH grade.
  useEffect(() => {
    const saved = getWorksheetGrade<WorksheetGradeResponse>(ws.worksheetId);
    if (saved && saved.ok) {
      setOutcome({ response: saved, miOutcomes: [] });
      setFromCache(true);
    }
  }, [ws.worksheetId]);

  const response = outcome?.response ?? null;
  const miBanner = useMemo(() => miBannerFrom(outcome), [outcome]);

  // Worksheet nomenclature (name + code) for this worksheet (§A7). PR-1 makes the
  // code DURABLE + cross-device: prefer the code minted for the completed grade
  // (outcome.sessionCode), then the frozen value on the worksheet, else the
  // device-local compute — so the scorecard, graded PDF, and header all agree with
  // the persisted session-record id.
  const nomen = useMemo(() => {
    const local = worksheetNomenclature(ws, listStoredWorksheetsLite());
    return {
      ...local,
      code: outcome?.sessionCode ?? ws.code ?? local.code,
      name: outcome?.sessionName ?? ws.name ?? local.name,
    };
  }, [ws, outcome?.sessionCode, outcome?.sessionName]);

  // Group the per-question results into collapsible sections (tap-to-reveal §A4).
  const sections = useMemo(() => {
    if (!response) return [] as Array<{ sec: string; label: string; rows: WorksheetQuestionGrade[] }>;
    const secOf = new Map(ws.questions.map((q) => [q.qNumber, String(q.section || "").toUpperCase()]));
    const groups = new Map<string, WorksheetQuestionGrade[]>();
    for (const r of response.results) {
      const sec = secOf.get(r.qNumber) || "";
      const key = SECTION_ORDER.includes(sec) ? sec : "?";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(r);
    }
    const ordered = [...SECTION_ORDER.filter((s) => groups.has(s)), ...(groups.has("?") ? ["?"] : [])];
    return ordered.map((sec) => ({
      sec,
      label: sec === "?" ? "Other questions" : SECTION_LABEL[sec] || `Section ${sec}`,
      rows: groups.get(sec)!,
    }));
  }, [response, ws.questions]);

  // First section open by default so the student sees something; rest tap-to-reveal.
  useEffect(() => {
    if (sections.length > 0) setOpenSecs({ [sections[0].sec]: true });
  }, [sections]);

  const handleDownload = useCallback(async () => {
    if (!response || downloading) return;
    setDownloadError(null);
    setDownloading(true);
    try {
      await exportGradedWorksheetPdf({
        ws,
        response,
        name: nomen.name,
        code: nomen.code,
        coaching: buildCoaching(response),
      });
    } catch {
      setDownloadError("Couldn’t build the PDF — please try again.");
    } finally {
      setDownloading(false);
    }
  }, [response, downloading, ws, nomen]);

  const handlePractise = useCallback(() => {
    const subjectLower = /sci/i.test(ws.subject) ? "science" : "maths";
    const distinct = Array.from(new Set(ws.questions.map((q) => q.topicKey).filter(Boolean)));
    if (distinct.length === 1) {
      navigate(`/practice/10/${subjectLower}?topic=${encodeURIComponent(distinct[0])}`);
    } else {
      navigate(`/practice-hub`);
    }
  }, [navigate, ws]);

  // UPLOAD-2 — the shared upload step replaces this panel's inline size wall: a photo
  // is cropped (optional), turned upright and compressed BEFORE the one guard
  // (`checkUploadFile`) runs, and several photos — one per page — are assembled on the
  // device into the ONE PDF this panel has always asked for.
  const coarsePointer = useCoarsePointer();
  const tray = usePageTray({
    check: (file) => checkUploadFile(file, "answers"),
    onPayload: (p) => {
      if (!p) {
        setFileName(null);
        setImageBase64(null);
        return;
      }
      setError(null);
      setOutcome(null);
      setFromCache(false);
      setFileName(p.name);
      setImageMimeType(p.imageMimeType);
      setImageBase64(p.imageBase64);
    },
    onError: setError,
  });

  const handleFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files ? Array.from(e.target.files) : [];
      e.target.value = "";
      tray.addFiles(files, { replace: true });
    },
    [tray.addFiles],
  );

  const handleGrade = useCallback(async () => {
    if (!imageBase64 || grading) return;
    setGrading(true);
    setStage(null);
    setError(null);
    fairUse.clearLimit();
    try {
      const result = await gradeWorksheetAndRecord(user, ws, { imageBase64, imageMimeType }, { onStage: setStage });
      if (!result.response.ok) {
        // The grader REFUSES rather than guessing a mark — correct, and never to be
        // softened. But "couldn't grade it" leaves a student with nothing to act on, so
        // say what to actually check.
        //
        // WHY ONE MESSAGE AND NOT TWO: we cannot honestly distinguish "unreadable"
        // (blurry/corrupt) from "wrong file" here. A whole-file refusal returns a bare
        // `{ ok: false }` with no reason (checkSolution.cjs) — the per-question
        // `couldNotRead`/`note` signal only exists once a file HAS been read. Inventing
        // a specific cause from no signal would be a guess dressed as a diagnosis, so
        // this names both possibilities and lets the student tell them apart.
        setError(
          result.response.error ||
            "We couldn’t read that file — check it’s a clear photo or PDF of your answer sheet for this worksheet, then try again. We never guess a mark.",
        );
      } else {
        setOutcome(result);
        setFromCache(false);
        setScorecardOpen(true); // auto scorecard popup on grade-complete (§A2)
        fairUse.noteGraded();
      }
    } catch (err) {
      // FAIR-USE-UI-1 (UI1): a fair-use refusal shows the calm panel instead of the error.
      if (await fairUse.handleRefusal(err)) return;
      // LOW-END-1 R2: never the raw message ("Failed to fetch") — a plain sentence.
      setStage(null);
      setError(gradingErrorMessage(err, "We couldn’t grade your worksheet just now. Your file is still here — please try again."));
    } finally {
      setGrading(false);
    }
  }, [imageBase64, imageMimeType, grading, user, ws, fairUse.clearLimit, fairUse.noteGraded, fairUse.handleRefusal]);

  const handleReset = useCallback(() => {
    tray.clear();
    setFileName(null);
    setImageBase64(null);
    setOutcome(null);
    setFromCache(false);
    setStage(null);
    setError(null);
    setScorecardOpen(false);
    setDownloadError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [tray.clear]);

  const hasFile = !!imageBase64;

  return (
    <div className="lt-wg">
      <style>{WG_CSS}</style>

      <h2 className="lt-wg__h">Check your answers</h2>
      <p className="lt-wg__lead">
        Solved it on paper? Upload <strong>one PDF</strong> of all your answers (labelled Q1, Q2 …) and
        get every question graded against this worksheet’s marking scheme — your mistakes feed your
        Mistake Intelligence.
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,application/pdf"
        multiple
        onChange={handleFile}
        className="lt-wg__file"
      />

      {/* ── Upload + grade controls (hidden once results show) ── */}
      {!response && (
        <>
          {!hasFile && tray.pages.length === 0 ? (
            coarsePointer ? (
              // A phone: camera and gallery are two choices — the input above carries
              // `multiple`, which on Android takes the camera away (UPLOAD-2-FIX-1).
              <PhotoSourceButtons
                onCameraChange={handleFile}
                onGallery={() => fileInputRef.current?.click()}
                hint={`${UPLOAD_LIMIT_SENTENCE} · label each answer Q1, Q2 …`}
                testIdPrefix="wg-photo"
                acceptsFiles
              />
            ) : (
              <button type="button" className="lt-wg__drop" onClick={() => fileInputRef.current?.click()}>
                <span className="lt-wg__dropt">Upload your answers — one PDF, or a photo of each page</span>
                <span className="lt-wg__dropd">{UPLOAD_LIMIT_SENTENCE} · label each answer Q1, Q2 …</span>
              </button>
            )
          ) : (
            <div className="lt-wg__filerow">
              <span className="lt-wg__filenm">{fileName ?? "Preparing your pages…"}</span>
              <button type="button" className="lt-wg__filex" onClick={handleReset} aria-label="Remove file">✕</button>
            </div>
          )}

          {/* "Solved it on paper?" (the lead above) is exactly the moment this
              helps: send the photo from your phone instead of emailing it to
              yourself. Desktop-only + signed-in-only; renders nothing otherwise,
              so the upload path above behaves exactly as before when QR is unused.
              It fills the SAME state the file input fills — handleGrade is untouched. */}
          {/* The crop step + page tray (UPLOAD-2): one photo per page, sent as ONE PDF. */}
          <PageTray tray={tray} disabled={grading} />

          {!hasFile && tray.pages.length === 0 && (
            <QrAnswerHandoff
              // "document": the lead above asks for ONE PDF of all answers, so the phone
              // must lead with the PDF too — a single photo would send one page of it.
              mode="document"
              disabled={grading}
              onImageReceived={({ imageBase64: b64, imageMimeType: mime }) => {
                setError(null);
                setFileName(mime === "application/pdf" ? "PDF from your phone" : "Photo from your phone");
                setImageMimeType(mime);
                setImageBase64(b64);
              }}
            />
          )}

          {hasFile && (
            <button type="button" className="lt-wg__grade" onClick={handleGrade} disabled={grading}>
              {grading ? (stage ? gradingStageLabel(stage) : "Grading your worksheet… ~30–60s") : "Grade my answers →"}
            </button>
          )}
          {grading && (
            <p className="lt-wg__progress">Reading each answer and marking it against the scheme. Please keep this page open.</p>
          )}
          {error && <div className="lt-wg__err" role="alert">{error}</div>}
          {fairUse.limit ? <FairUseLimitPanel limit={fairUse.limit} /> : null}
          <p className="lt-wg__tip">
            Tip: a clear, upright scan of each page grades best. If a page is blurry we’ll tell you which question to re-upload — we never guess a mark.
          </p>
        </>
      )}

      {/* ── Auto scorecard popup (on grade-complete) — the Universal <ResultsScorecard>,
             worksheet variant (behaviour-identical to the shipped WorksheetScorecard) ── */}
      {response && response.ok && scorecardOpen && (
        <ResultsScorecard
          variant={worksheetScorecardVariant({
            name: nomen.name,
            code: nomen.code,
            response,
            downloading,
            onRead: () => setScorecardOpen(false),
            onDownload: () => {
              setScorecardOpen(false);
              void handleDownload();
            },
          })}
          onClose={() => setScorecardOpen(false)}
        />
      )}

      {/* ── The graded sheet (behind the popup; revealed on dismiss) ── */}
      {response && response.ok && (
        <div className="lt-wg__results">
          {/* LOW-END-1 R2: the last stage — the grade came back. */}
          {!fromCache && stage?.kind === "done" && (
            <p className="lt-wg__done" role="status">✓ {gradingStageLabel(stage)}</p>
          )}
          {fromCache && (
            <div className="lt-wg__cache">
              Showing your last graded result for this worksheet.
              <button type="button" className="lt-wg__regrade" onClick={handleReset}>Grade again</button>
            </div>
          )}

          {/* Nomenclature header */}
          <div className="lt-wg__sheethead">
            <div className="lt-wg__sheetname">{nomen.name}</div>
            <div className="lt-wg__sheetcode">{nomen.code}</div>
          </div>

          {/* Honest totals — graded subtotal kept SEPARATE from the worksheet total */}
          <div className="lt-wg__totals">
            <div className="lt-wg__totmain">
              <span className="lt-wg__totscore">{response.gradedMarksAwarded}/{response.gradedMarksTotal}</span>
              <span className="lt-wg__totlbl">
                across {response.gradedCount} of {response.totalQuestions} question{response.totalQuestions === 1 ? "" : "s"} graded
              </span>
              <button type="button" className="lt-wg__viewsc" onClick={() => setScorecardOpen(true)}>
                View scorecard
              </button>
            </div>
            {response.pendingCount > 0 && (
              <div className="lt-wg__totpending">
                {/* PR-2 — an answer that does not match its question was read: it is not "unreadable". */}
                {(() => {
                  const mismatch = response.results.filter((r) => gradeStateOf(r) === "answer-mismatch").length;
                  const unread = Math.max(0, response.pendingCount - mismatch);
                  return (
                    <>
                      {unread > 0 && (
                        <>
                          {unread} question{unread === 1 ? "" : "s"} couldn’t be read — re-upload those pages to complete your score.{" "}
                        </>
                      )}
                      {mismatch > 0 && (
                        <>
                          {mismatch} answer{mismatch === 1 ? "" : "s"} not marked — {mismatch === 1 ? "it doesn’t" : "they don’t"} seem to match the question.{" "}
                        </>
                      )}
                      The worksheet is worth {response.worksheetTotalMarks} marks in total.
                    </>
                  );
                })()}
              </div>
            )}
          </div>

          {/* MI evidence line */}
          {!fromCache && miBanner !== "none" && (
            <div className={`lt-wg__mi lt-wg__mi--${miBanner}`}>
              {miBanner === "saved"
                ? "✓ Saved to your Mistake Intelligence — these feed your Me / Progress and personalise your next worksheet."
                : miBanner === "no-mistakes"
                  ? "✓ Graded — no mistakes to save on the questions we could read. Well done."
                  : "○ Graded on this device — sign in to save these to your Mistake Intelligence."}
            </div>
          )}

          {/* Summary — suppressed when it is model meta-prose (§A6, display-only) */}
          {!isLeakySummary(response.summary, response.gradedCount) && (
            <div className="lt-wg__summary">{response.summary}</div>
          )}

          {/* Tap-to-reveal per-section question list */}
          <div className="lt-wg__seclist">
            {sections.map(({ sec, label, rows }) => {
              const open = !!openSecs[sec];
              return (
                <div key={sec} className="lt-wg__sec">
                  <button
                    type="button"
                    className="lt-wg__sectoggle"
                    aria-expanded={open}
                    onClick={() => setOpenSecs((prev) => ({ ...prev, [sec]: !prev[sec] }))}
                  >
                    <span className="lt-wg__seccaret" aria-hidden="true">{open ? "▾" : "▸"}</span>
                    <span className="lt-wg__seclbl">{label}</span>
                    <span className="lt-wg__seccount">{rows.length} Q</span>
                  </button>
                  {open && (
                    <div className="lt-wg__qlist">
                      {rows.map((g) => (
                        <QuestionResult key={g.qNumber} ws={ws} g={g} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Action row — Download (primary) + Practise (ghost) */}
          <div className="lt-wg__actions">
            <button type="button" className="lt-wg__act lt-wg__act--primary" onClick={handleDownload} disabled={downloading}>
              {downloading ? "Preparing PDF…" : "↓ Download graded sheet (PDF)"}
            </button>
            <button type="button" className="lt-wg__act lt-wg__act--ghost" onClick={handlePractise}>
              Practise this topic
            </button>
          </div>
          {downloadError && <div className="lt-wg__err" role="alert">{downloadError}</div>}

          <button type="button" className="lt-wg__again" onClick={handleReset}>
            Upload a different scan
          </button>
        </div>
      )}

      {!isSignedIn && !response && (
        <p className="lt-wg__signin">You can grade signed-out, but sign in to save your mistakes and personalise future worksheets.</p>
      )}
    </div>
  );
}

const WG_CSS = `
.lt-wg {
  --wg-green: hsl(152, 55%, 45%);
  --wg-green-soft: hsl(152, 55%, 96%);
  --wg-green-b: hsl(152, 45%, 80%);
  --wg-green-fg: hsl(152, 55%, 28%);
  --wg-navy: hsl(220, 25%, 12%);
  --wg-fg: hsl(220, 25%, 12%);
  --wg-muted: hsl(220, 15%, 42%);
  --wg-line: hsl(220, 18%, 90%);
  --wg-surface-2: hsl(210, 33%, 97%);
  --wg-amber-bg: hsl(38, 92%, 95%);
  --wg-amber-b: hsl(38, 60%, 82%);
  --wg-amber-fg: hsl(33, 70%, 32%);
  --wg-fb: "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  --wg-fd: "Fraunces", Georgia, serif;
  font-family: var(--wg-fb);
  color: var(--wg-fg);
}
.lt-wg__h { font-family: var(--wg-fd); font-weight: 600; font-size: 17px; margin: 0 0 6px; }
.lt-wg__lead { font-size: 13px; color: var(--wg-muted); margin: 0 0 14px; line-height: 1.55; }
.lt-wg__lead strong { color: var(--wg-fg); }

.lt-wg__file { display: none; }

.lt-wg__drop {
  width: 100%; border: 2px dashed var(--wg-green-b); background: var(--wg-green-soft);
  border-radius: 12px; padding: 20px 16px; cursor: pointer; display: flex; flex-direction: column;
  align-items: center; gap: 6px; font-family: var(--wg-fb); text-align: center;
}
.lt-wg__dropt { font-size: 14px; font-weight: 700; color: var(--wg-green-fg); }
.lt-wg__dropd { font-size: 11.5px; color: var(--wg-muted); line-height: 1.4; }

.lt-wg__filerow {
  display: flex; align-items: center; gap: 10px; border: 1px solid var(--wg-line);
  border-radius: 10px; padding: 11px 14px; background: var(--wg-surface-2);
}
.lt-wg__filenm { flex: 1; min-width: 0; font-size: 13px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lt-wg__filex { flex-shrink: 0; width: 24px; height: 24px; border-radius: 50%; border: none;
  background: rgba(0,0,0,0.12); color: var(--wg-muted); cursor: pointer; font-size: 12px; }

.lt-wg__grade {
  width: 100%; margin-top: 12px; border: none; background: var(--wg-green); color: #fff;
  border-radius: 10px; padding: 13px; font-size: 14px; font-weight: 700; cursor: pointer; font-family: var(--wg-fd);
}
.lt-wg__grade:disabled { background: hsl(152, 25%, 72%); cursor: not-allowed; }
.lt-wg__progress { font-size: 12px; color: var(--wg-muted); margin: 8px 0 0; line-height: 1.5; }
.lt-wg__done { font-size: 12px; font-weight: 700; color: hsl(152, 55%, 32%); margin: 0 0 8px; }
.lt-wg__tip { font-size: 11.5px; color: hsl(220, 12%, 58%); margin: 10px 0 0; line-height: 1.5; }
.lt-wg__signin { font-size: 11.5px; color: hsl(220, 12%, 58%); margin: 10px 0 0; line-height: 1.5; }

.lt-wg__err {
  margin-top: 10px; font-size: 12.5px; border-radius: 9px; padding: 9px 12px;
  background: hsl(0, 75%, 97%); border: 1px solid hsl(0, 70%, 88%); color: hsl(0, 65%, 38%);
}

/* ── Results ── */
.lt-wg__results { margin-top: 4px; }
.lt-wg__cache {
  display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap;
  font-size: 12px; color: var(--wg-muted); background: var(--wg-surface-2);
  border: 1px solid var(--wg-line); border-radius: 9px; padding: 8px 12px; margin-bottom: 12px;
}
.lt-wg__regrade { border: 1px solid var(--wg-green); background: var(--wg-green-soft); color: var(--wg-green-fg);
  border-radius: 999px; padding: 4px 12px; font-size: 11.5px; font-weight: 700; cursor: pointer; }

.lt-wg__totals { background: var(--wg-navy); border-radius: 12px; padding: 16px 18px; margin-bottom: 12px; }
.lt-wg__totmain { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.lt-wg__totscore { font-family: var(--wg-fd); font-size: 26px; font-weight: 600; color: #fff; }
.lt-wg__totlbl { font-size: 12.5px; color: hsl(220, 18%, 82%); }
.lt-wg__totpending {
  margin-top: 10px; font-size: 12px; line-height: 1.5; color: hsl(38, 80%, 78%);
  border-top: 1px solid hsl(220, 20%, 24%); padding-top: 10px;
}

.lt-wg__mi { font-size: 12.5px; font-weight: 600; border-radius: 9px; padding: 9px 12px; margin-bottom: 12px; line-height: 1.45; }
.lt-wg__mi--saved { background: var(--wg-green-soft); border: 1px solid var(--wg-green-b); color: var(--wg-green-fg); }
.lt-wg__mi--no-mistakes { background: var(--wg-green-soft); border: 1px solid var(--wg-green-b); color: var(--wg-green-fg); }
.lt-wg__mi--local-only { background: hsl(215, 75%, 96%); border: 1px solid hsl(215, 65%, 86%); color: hsl(215, 65%, 34%); }

.lt-wg__summary {
  font-size: 13px; color: var(--wg-fg); line-height: 1.6; background: var(--wg-surface-2);
  border: 1px solid var(--wg-line); border-radius: 10px; padding: 12px 14px; margin-bottom: 14px;
}

.lt-wg__qlist { display: flex; flex-direction: column; gap: 10px; }
.lt-wg__q { border: 1px solid var(--wg-line); border-radius: 11px; padding: 12px 14px; background: #fff; }
.lt-wg__q--pending { border-color: var(--wg-amber-b); background: var(--wg-amber-bg); }
.lt-wg__qhead { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.lt-wg__qn { font-weight: 800; font-size: 13px; color: var(--wg-navy); }
.lt-wg__qtopic { font-size: 11px; color: var(--wg-muted); }
.lt-wg__qpending { font-size: 12px; font-weight: 700; color: var(--wg-amber-fg); }
.lt-wg__qscore { margin-left: auto; font-size: 12.5px; font-weight: 800; padding: 2px 9px; border-radius: 999px; }
.lt-wg__qscore--good { color: var(--wg-green-fg); background: var(--wg-green-soft); }
.lt-wg__qscore--mid { color: hsl(38, 80%, 32%); background: hsl(38, 92%, 93%); }
.lt-wg__qscore--low { color: hsl(0, 65%, 42%); background: hsl(0, 75%, 96%); }
.lt-wg__qtext { font-size: 12px; color: var(--wg-muted); margin: 7px 0 0; line-height: 1.5; }
.lt-wg__qnote { font-size: 12px; color: var(--wg-amber-fg); margin: 7px 0 0; line-height: 1.5; }
.lt-wg__qexaminer { font-size: 12px; color: var(--wg-fg); margin-top: 9px; padding-top: 9px;
  border-top: 1px solid var(--wg-line); line-height: 1.55; }

.lt-wg__steps { list-style: none; margin: 9px 0 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.lt-wg__step { border-radius: 8px; padding: 7px 10px; border: 1px solid var(--wg-line); }
.lt-wg__step--ok { border-color: var(--wg-green-b); background: var(--wg-green-soft); }
.lt-wg__step--part { border-color: hsl(38, 60%, 82%); background: hsl(38, 92%, 96%); }
.lt-wg__step--bad { border-color: hsl(0, 70%, 88%); background: hsl(0, 75%, 98%); }
.lt-wg__step--miss { border-color: var(--wg-line); background: var(--wg-surface-2); }
.lt-wg__stephead { display: flex; align-items: center; gap: 8px; }
.lt-wg__stepdesc { flex: 1; min-width: 0; font-size: 12px; font-weight: 600; }
.lt-wg__steptag { font-size: 9.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.03em;
  color: hsl(0, 65%, 45%); background: hsl(0, 75%, 96%); padding: 1px 6px; border-radius: 999px; }
.lt-wg__stepmk { font-size: 11.5px; font-weight: 800; color: var(--wg-fg); }
.lt-wg__stepnote { font-size: 11.5px; color: var(--wg-muted); margin-top: 3px; line-height: 1.45; }
.lt-wg__stepfix { font-size: 11.5px; color: var(--wg-green-fg); margin-top: 3px; line-height: 1.45; }

.lt-wg__again {
  width: 100%; margin-top: 14px; border: 1px solid var(--wg-line); background: #fff; color: var(--wg-fg);
  border-radius: 10px; padding: 11px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: var(--wg-fb);
}

/* ── PR-A: nomenclature header + scorecard re-open + tap-to-reveal + actions ── */
.lt-wg__sheethead { margin-bottom: 10px; }
.lt-wg__sheetname { font-family: var(--wg-fd); font-weight: 700; font-size: 16px; color: var(--wg-navy); }
.lt-wg__sheetcode { font-size: 11px; color: var(--wg-muted); letter-spacing: 0.04em; margin-top: 2px; }

.lt-wg__totmain { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.lt-wg__viewsc {
  margin-left: auto; border: 1px solid hsl(220, 20%, 30%); background: transparent; color: #fff;
  border-radius: 999px; padding: 4px 12px; font-size: 11.5px; font-weight: 700; cursor: pointer; font-family: var(--wg-fb);
}

.lt-wg__seclist { display: flex; flex-direction: column; gap: 8px; }
.lt-wg__sec { border: 1px solid var(--wg-line); border-radius: 11px; overflow: hidden; }
.lt-wg__sectoggle {
  width: 100%; display: flex; align-items: center; gap: 10px; padding: 11px 14px; cursor: pointer;
  background: var(--wg-surface-2); border: none; font-family: var(--wg-fb); text-align: left;
}
.lt-wg__seccaret { color: var(--wg-muted); font-size: 11px; }
.lt-wg__seclbl { flex: 1; min-width: 0; font-size: 12.5px; font-weight: 700; color: var(--wg-fg);
  text-transform: uppercase; letter-spacing: 0.04em; }
.lt-wg__seccount { font-size: 11.5px; font-weight: 700; color: var(--wg-muted); }
.lt-wg__sec .lt-wg__qlist { padding: 10px 12px; }

.lt-wg__actions { display: flex; gap: 12px; margin-top: 16px; }
.lt-wg__act {
  flex: 1; border-radius: 11px; padding: 12px 14px; font-size: 13.5px; font-weight: 700; cursor: pointer;
  font-family: var(--wg-fb); text-align: center; border: none;
}
.lt-wg__act--primary { background: var(--wg-green); color: #fff; }
.lt-wg__act--primary:disabled { background: hsl(152, 25%, 72%); cursor: not-allowed; }
.lt-wg__act--ghost { background: #fff; color: var(--wg-fg); border: 1.5px solid var(--wg-line); }

@media (max-width: 1023px) {
  .lt-wg__actions { flex-direction: column; }
}
`;
