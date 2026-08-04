import { useState, useRef, useCallback, useEffect } from "react";
import {
  checkSolutionImage,
  type CheckSolutionResponse,
  type MistakeType,
  type PremiumRequiredError,
} from "../../ai/aiClient";
import { UpgradeSheet, labelForFeature } from "../subscription/UpgradeSheet";
import { useAuth } from "../../context/AuthContext";
import { recordMistake, isSavedOutcome, type RecordMistakeOutcome } from "../../services/mistakeIntelligence";
import { recordAttempt } from "../../services/practiceInsights";
import { EquationInput, EquationRender } from "../equation";
import QrAnswerHandoff from "../qr/QrAnswerHandoff";
import {
  MAX_UPLOAD_IMAGE_BYTES,
  MAX_UPLOAD_PDF_BYTES,
  UPLOAD_LIMIT_SENTENCE,
  formatUploadLimit,
} from "../../services/uploadLimits";

const CHECK_RESULT_KEY_PREFIX = "lazytopper.checkResult.v1.";

function loadSavedResult(questionId: string): CheckSolutionResponse | null {
  try {
    const raw = localStorage.getItem(CHECK_RESULT_KEY_PREFIX + questionId);
    if (!raw) return null;
    return JSON.parse(raw) as CheckSolutionResponse;
  } catch {
    return null;
  }
}

function saveResult(questionId: string, result: CheckSolutionResponse): void {
  try {
    localStorage.setItem(CHECK_RESULT_KEY_PREFIX + questionId, JSON.stringify(result));
  } catch {
  }
}

type LogStatus = "pending" | "saving" | "saved" | "unavailable" | "local-only" | "no-mistakes" | "cached";

/** The two EQUAL answer-input peers. Same shape as C&I's `AnswerTab`
 *  (DesktopCheckImprovePage) / `Tab` (app/CheckImprove) — one vocabulary across every
 *  surface that takes a written answer. */
type AnswerTab = "upload" | "type";

/** Map the single front-door outcome to the evidence-state label. */
function statusFromOutcome(outcome: RecordMistakeOutcome): LogStatus {
  if (isSavedOutcome(outcome)) return "saved";
  if (outcome === "skipped-clean") return "no-mistakes";
  if (outcome === "skipped-no-user" || outcome === "skipped-local") return "local-only";
  return "unavailable";
}


interface SolutionCheckerProps {
  question: string;
  marks: number;
  subject: string;
  topic: string;
  questionId?: string;
  solutionSteps?: string[];
  finalAnswer?: string;
  /** Objective signals (ALL optional). When a bank-sourced caller forwards them
   *  (section/format + the answer key `answer` + `options`), the grader scores an
   *  objective question (MCQ / AR / Section A) deterministically as 0/full instead of
   *  step-marking it. Omitted by non-bank callers → grading is unchanged. */
  section?: string;
  format?: string;
  options?: string[];
  answer?: string;
  onRequestStepSolution?: () => void;
  onResult?: (result: CheckSolutionResponse) => void;
}

// Limits come from services/uploadLimits.ts — the ONE place they are defined, shared
// with every other upload affordance and with the QR phone path below. This file used
// to declare its own 5 MB PDF ceiling, which was never spendable: base64 inflates by
// ~4/3, so a 5 MB PDF is 6.67 MB of body against readJson's 5 MB cap. A student who
// attached a 4-5 MB PDF passed this picker and then died at the grader. #443 fixed the
// three host panels that were free at the time; this file was deliberately held for
// PR-2 (the QP lane owned it), so it is fixed here — with the QR path that would
// otherwise have promised 3.5 MB in the same panel this picker promised 5 MB.

const STATUS_STYLE: Record<string, { border: string; bg: string; badge: string; badgeBg: string }> = {
  correct:   { border: "rgba(34,197,94,0.35)",  bg: "rgba(34,197,94,0.05)",   badge: "#22c55e", badgeBg: "rgba(34,197,94,0.12)"  },
  partial:   { border: "rgba(251,191,36,0.35)",  bg: "rgba(251,191,36,0.05)", badge: "#fbbf24", badgeBg: "rgba(251,191,36,0.12)" },
  incorrect: { border: "rgba(239,68,68,0.4)",   bg: "rgba(239,68,68,0.05)",   badge: "#ef4444", badgeBg: "rgba(239,68,68,0.12)"  },
  missing:   { border: "rgba(148,163,184,0.25)", bg: "var(--bg-card)",         badge: "#94a3b8", badgeBg: "rgba(148,163,184,0.1)" },
};

const MISTAKE_BADGE: Record<MistakeType, { label: string; color: string; bg: string }> = {
  conceptual:   { label: "Conceptual",   color: "#ef4444", bg: "rgba(239,68,68,0.1)"   },
  calculation:  { label: "Calculation",  color: "#f59e0b", bg: "rgba(245,158,11,0.1)"  },
  silly:        { label: "Silly",        color: "#f97316", bg: "rgba(249,115,22,0.1)"  },
  presentation: { label: "Presentation", color: "#3b82f6", bg: "rgba(59,130,246,0.1)"  },
};

function MistakeBadge({ type }: { type: MistakeType | null }) {
  if (!type) return null;
  const b = MISTAKE_BADGE[type];
  return (
    <span style={{
      fontSize: "0.63rem", fontWeight: 700, padding: "2px 6px",
      borderRadius: 999, color: b.color, background: b.bg,
      letterSpacing: "0.02em", textTransform: "uppercase",
      flexShrink: 0,
    }}>
      {b.label}
    </span>
  );
}

function AnnotatedStepCard({ step, objective }: { step: CheckSolutionResponse["annotatedSteps"][0]; objective?: boolean }) {
  const [showCorrected, setShowCorrected] = useState(false);
  const ss = STATUS_STYLE[step.status] || STATUS_STYLE.partial;
  const isNegative = step.marksAwarded === 0 && step.status !== "correct";
  const marksColor = step.marksAwarded > 0 ? "#22c55e" : "#ef4444";
  const marksBg = step.marksAwarded > 0 ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)";
  const marksLabel = step.marksAwarded > 0
    ? `+${step.marksAwarded}`
    : isNegative && step.marksDeducted > 0
      ? `−${step.marksDeducted}`
      : "0";

  return (
    <div style={{
      borderRadius: 10,
      border: `1.5px solid ${ss.border}`,
      background: ss.bg,
      marginBottom: 8,
      overflow: "hidden",
    }}>
      {/* Step header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "8px 10px 6px",
        borderBottom: step.studentWork || step.teacherAnnotation || step.correctedWorking
          ? `1px solid ${ss.border}`
          : "none",
      }}>
        <div style={{
          minWidth: 22, height: 22, borderRadius: "50%",
          background: ss.badge, color: "white",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "0.68rem", fontWeight: 700, flexShrink: 0,
        }}>
          {step.stepNumber}
        </div>
        <div style={{ flex: 1, fontSize: "0.78rem", fontWeight: 600, color: "var(--text)" }}>
          <EquationRender text={step.description} />
        </div>
        <MistakeBadge type={step.mistakeType} />
        {/* Objective questions carry NO per-step marks by design (the whole 0-or-full
            mark is at answer level, PR-348). Showing "0 marks" per step reads as the
            student scoring 0 — misleading. Suppress the chip; keep the annotation. */}
        {!objective && (
          <span style={{
            fontSize: "0.72rem", fontWeight: 800,
            padding: "2px 7px", borderRadius: 999,
            color: marksColor, background: marksBg, flexShrink: 0,
          }}>
            {marksLabel} {Math.abs(step.marksAwarded) === 1 ? "mark" : "marks"}
          </span>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: "7px 10px 9px" }}>
        {/* Student's work */}
        {step.studentWork && (
          <div style={{ marginBottom: 5 }}>
            <div style={{ fontSize: "0.66rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Your work
            </div>
            <div style={{
              fontSize: "0.77rem", color: "var(--text)", lineHeight: 1.5,
              background: "rgba(0,0,0,0.06)", borderRadius: 6,
              padding: "5px 8px", fontFamily: "monospace",
            }}>
              <EquationRender text={step.studentWork} />
            </div>
          </div>
        )}

        {/* Teacher annotation */}
        {step.teacherAnnotation && (
          <div style={{
            fontSize: "0.76rem", color: ss.badge,
            fontWeight: 600, marginBottom: step.correctedWorking ? 6 : 0,
          }}>
            <EquationRender text={step.teacherAnnotation} />
          </div>
        )}

        {/* Corrected working */}
        {step.correctedWorking && (
          <div>
            <button
              type="button"
              onClick={() => setShowCorrected((v) => !v)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                fontSize: "0.72rem", color: "#3b82f6", fontWeight: 600,
                padding: "0", display: "flex", alignItems: "center", gap: 4,
              }}
            >
              <span>{showCorrected ? "▲" : "▼"}</span>
              {showCorrected ? "Hide corrected working" : "See corrected working"}
            </button>
            {showCorrected && (
              <div style={{
                marginTop: 5, padding: "6px 8px",
                background: "rgba(34,197,94,0.07)", borderRadius: 6,
                border: "1px solid rgba(34,197,94,0.2)",
                fontSize: "0.77rem", color: "#22c55e", lineHeight: 1.5,
                fontFamily: "monospace",
              }}>
                <EquationRender text={step.correctedWorking} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MistakeSummaryLine({ summary }: { summary: CheckSolutionResponse["mistakeSummary"] }) {
  const parts: string[] = [];
  if (summary.conceptual > 0) parts.push(`${summary.conceptual} conceptual`);
  if (summary.calculation > 0) parts.push(`${summary.calculation} calculation`);
  if (summary.silly > 0) parts.push(`${summary.silly} silly`);
  if (summary.presentation > 0) parts.push(`${summary.presentation} presentation`);
  if (parts.length === 0) return null;
  const total = parts.reduce((acc, p) => acc + parseInt(p), 0);
  return (
    <div style={{ fontSize: "0.73rem", color: "var(--text-muted)", marginTop: 3 }}>
      {parts.join(" · ")} {total === 1 ? "mistake" : "mistakes"}
    </div>
  );
}

export function SolutionChecker({
  question, marks, subject, topic, questionId, solutionSteps, finalAnswer, section, format, options, answer, onRequestStepSolution, onResult,
}: SolutionCheckerProps) {
  const { user } = useAuth();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string>("image/jpeg");
  const [fileName, setFileName] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState(false);
  const [textAnswer, setTextAnswer] = useState("");
  // Which answer-input peer is showing. Defaults to "upload", matching both shipped
  // C&I controls. (Typing is no longer hidden by that default — it is an equal,
  // always-visible peer; the old default hid it behind a disclosure.)
  const [answerTab, setAnswerTab] = useState<AnswerTab>("upload");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CheckSolutionResponse | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logStatus, setLogStatus] = useState<LogStatus>("pending");
  /**
   * GATE-2 — the Premium boundary, when the server refuses a grade (402).
   *
   * ★★ ONE OPENER, DELIBERATELY: `handleCheck`'s catch, and nothing else. An earlier
   * draft ALSO had aiClient broadcast the refusal to a subscriber here, so one
   * blocked tap would have opened the sheet twice. Two mechanisms for one event is
   * how a double-open gets built; there is exactly one, and it is the catch.
   *
   * ⚠ AND WHY THE DETECTION IS BY `name`, NOT `isPremiumRequiredError`.
   * `SolutionChecker.contract.test.tsx` (FORBID-1's replacement for the blanket ban)
   * mocks `../../ai/aiClient` as a COMPLETE REPLACEMENT exporting only
   * `checkSolutionImage`. Any new VALUE import from that module throws
   * "No X export is defined on the mock" in all 19 of its tests — verified, not
   * assumed — and that suite must pass UNMODIFIED. Type-only imports are erased and
   * stay safe. So the branch reads the `name` the class already sets, which needs no
   * runtime import and behaves identically for the real error.
   */
  const [premiumBlock, setPremiumBlock] = useState<
    Pick<PremiumRequiredError, "feature" | "trialEndedAt"> | null
  >(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backfilledRef = useRef<string | null>(null);

  useEffect(() => {
    if (!questionId) return;
    const saved = loadSavedResult(questionId);
    if (saved) {
      setResult(saved);
      setIsFromCache(true);
      setLogStatus("cached");
      onResult?.(saved);
    }
  }, [questionId]);

  // Cache short-circuit fix: a previously-cached result restored on mount used
  // to display without ever persisting the mistake. Route it through the front
  // door (deduped), so a mistake cached before sign-in / before this fix is
  // back-filled exactly once. recordMistake dedups against the fresh-check log,
  // so this never double-logs a result that was just checked.
  useEffect(() => {
    if (!result || !isFromCache) return;
    if (!user?.uid || user.isLocalSession) return;
    const sig = questionId || "";
    if (backfilledRef.current === sig) return;
    backfilledRef.current = sig;
    let cancelled = false;
    setLogStatus("saving");
    void recordMistake(user, result, { subject, topic, question, questionId }).then((res) => {
      if (!cancelled) setLogStatus(statusFromOutcome(res.outcome));
    });
    // Score-twin: a restored graded result is also an attempt (deduped, so a
    // cache-restore of the same score never double-counts toward accuracy).
    recordAttempt(user, {
      subject, topic, question, questionId,
      marksScored: result.marksAwarded,
      marksAvailable: result.totalMarks,
      mode: "graded",
    });
    return () => { cancelled = true; };
  }, [result, isFromCache, user, questionId, subject, topic, question]);


  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isFilePdf = file.type === "application/pdf";
    const isImage = file.type === "image/jpeg" || file.type === "image/png";

    if (!isFilePdf && !isImage) {
      setError("Please select a JPG, PNG, or PDF file");
      return;
    }

    const maxSize = isFilePdf ? MAX_UPLOAD_PDF_BYTES : MAX_UPLOAD_IMAGE_BYTES;
    const maxLabel = formatUploadLimit(maxSize);
    if (file.size > maxSize) {
      setError(`File must be under ${maxLabel}`);
      return;
    }

    setError(null);
    setResult(null);
    setFileName(file.name);
    setIsPdf(isFilePdf);

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1];
      setImageBase64(base64);
      if (isFilePdf) {
        setImagePreview(null);
        setImageMimeType("application/pdf");
      } else {
        setImagePreview(dataUrl);
        setImageMimeType(file.type === "image/png" ? "image/png" : "image/jpeg");
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const handleCheck = useCallback(async () => {
    // Send what the ACTIVE tab shows. The grader route is image-XOR-text (it ignores
    // textAnswer whenever an image is present), so this makes the send match what the
    // student is looking at instead of letting a stale attachment win invisibly.
    const hasImage = answerTab === "upload" && !!imageBase64;
    const hasText = answerTab === "type" && textAnswer.trim().length > 0;
    if (!hasImage && !hasText) return;

    setLoading(true);
    setError(null);
    setLogStatus("pending");

    try {
      const response = await checkSolutionImage({
        question,
        marks,
        subject,
        topic,
        ...(hasImage ? { imageBase64: imageBase64!, imageMimeType } : {}),
        ...(hasText ? { textAnswer: textAnswer.trim() } : {}),
        ...(solutionSteps && solutionSteps.length > 0 ? { solutionSteps } : {}),
        ...(finalAnswer ? { finalAnswer } : {}),
        // Objective signals — forwarded only when a bank-sourced caller supplies them,
        // so the grader can score an MCQ/AR deterministically (0/full). Omitted → the
        // grade call is byte-identical to before.
        ...(section ? { section } : {}),
        ...(format ? { format } : {}),
        ...(options && options.length > 0 ? { options } : {}),
        ...(answer ? { answer } : {}),
      });

      if (response.ok) {
        setResult(response);
        setIsFromCache(false);
        if (questionId) {
          saveResult(questionId, response);
        }
        onResult?.(response);

        // Single ingestion front door. The old `mistakeCount > 0` guard (which
        // keyed off the LLM's self-reported summary and silently dropped graded
        // mistakes whose summary was under-reported) is gone — recordMistake
        // decides from the actual score + per-step mistakeType, and owns the
        // builder, dedup, and the weak-area bridge.
        setLogStatus("saving");
        const rec = await recordMistake(user, response, { subject, topic, question, questionId });
        setLogStatus(statusFromOutcome(rec.outcome));
        // Score-twin of the mistake door: record the graded score as an attempt
        // (every graded answer, including full marks — accuracy needs both).
        recordAttempt(user, {
          subject, topic, question, questionId,
          marksScored: response.marksAwarded,
          marksAvailable: response.totalMarks,
          mode: "graded",
        });
      } else {
        setError(response.error || "Could not evaluate. Try a clearer image or type your answer.");
        setLogStatus("unavailable");
      }
    } catch (err) {
      // ★ A LOCKED FEATURE IS NOT A FAULT. GATE-1's copy is correct and kind, but it
      // used to land in the error box below — red text, red border — which told the
      // student they had done something wrong at the exact moment they had not.
      // Owner-verified live. The sheet (opened by the subscription above) carries
      // this now, so the refusal deliberately sets NO error string.
      // 429 and 500 are untouched and still render there: rate-limited or broken is
      // not unentitled, and a student who meets an upgrade sheet during an outage
      // learns something false about the product.
      if (err instanceof Error && err.name === "PremiumRequiredError") {
        const premium = err as PremiumRequiredError;
        setPremiumBlock({ feature: premium.feature, trialEndedAt: premium.trialEndedAt });
      } else {
        setError(err instanceof Error ? err.message : "Failed to check solution");
      }
      setLogStatus("unavailable");
    } finally {
      setLoading(false);
    }
  }, [imageBase64, imageMimeType, textAnswer, question, marks, subject, topic, user, questionId, solutionSteps, finalAnswer, section, format, options, answer]);

  const handleClear = useCallback(() => {
    setImagePreview(null);
    setImageBase64(null);
    setFileName(null);
    setIsPdf(false);
    setResult(null);
    setIsFromCache(false);
    setError(null);
    setLogStatus("pending");
    setTextAnswer("");
    setAnswerTab("upload");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleRecheck = useCallback(() => {
    setResult(null);
    setIsFromCache(false);
    setError(null);
    setLogStatus("pending");
    setImagePreview(null);
    setImageBase64(null);
    setFileName(null);
    setIsPdf(false);
    setTextAnswer("");
    setAnswerTab("upload");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const hasFile = imageBase64 !== null;
  const hasText = textAnswer.trim().length > 0;
  // The ACTIVE tab decides what counts — what you see is what you send. (Before, an
  // attached file silently beat typed text even while the text box was open.)
  const canCheck = answerTab === "upload" ? hasFile : hasText;
  const isPerfect = result && result.percentage === 100;

  const scoreColor = result
    ? result.percentage >= 80 ? "#22c55e"
      : result.percentage >= 50 ? "#fbbf24"
        : "#ef4444"
    : "var(--text-muted)";

  const totalMistakes = result?.mistakeSummary
    ? result.mistakeSummary.conceptual + result.mistakeSummary.calculation +
      result.mistakeSummary.silly + result.mistakeSummary.presentation
    : 0;

  return (
    <div style={{
      marginTop: 12,
      padding: "14px 16px",
      borderRadius: 12,
      border: "1px solid hsl(220, 18%, 90%)",
      background: "#ffffff",
      boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <strong style={{ fontSize: "0.87rem", color: "hsl(220, 25%, 12%)" }}>
          Check my answer
        </strong>
        <span style={{ fontSize: "0.72rem", color: "hsl(220, 15%, 42%)" }}>
          Upload or type your working
        </span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,application/pdf"
        onChange={handleFileSelect}
        style={{ display: "none" }}
      />

      {/* ── Answer-input mode: two EQUAL peers ──────────────────
          Typing used to be a ~0.72rem borderless "▼ Or type your answer instead" link
          UNDER a ~66px dashed hero dropzone — ~4.7× the height, so the path a desktop
          student most often wants was hidden behind the one they didn't. These are now
          peers: same size, same weight, side by side, no disclosure chevron.

          This is the SAME segmented control Check & Improve already ships
          (DesktopCheckImprovePage / app/CheckImprove) — matching it rather than
          inventing a third pattern. It is also more HONEST than what it replaces: the
          old copy promised "Or add text notes too" alongside a file, but the client
          (`hasText && !hasImage`) and the grader route both drop text whenever an image
          is present, so those notes were silently discarded. A tab makes the real
          image-XOR-text behaviour visible instead of promising something that never
          worked. (Making both work at once would mean changing the grader — out of
          scope: [FU-SOLUTIONCHECKER-TEXT-XOR-IMAGE].) */}
      {!result && (
        <div
          style={{
            display: "flex", background: "hsl(220, 20%, 97%)", borderRadius: 10,
            padding: 4, gap: 4, border: "1px solid hsl(220, 18%, 90%)", marginBottom: 10,
          }}
          role="tablist"
          aria-label="How to give your answer"
        >
          {(["type", "upload"] as AnswerTab[]).map((t) => {
            const active = answerTab === t;
            return (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setAnswerTab(t)}
                style={{
                  // flex:1 — equal peers at every width. At 360px the card's inner width
                  // is ~328px, so each CTA gets ~162px against ~105px of label: it fits
                  // without stacking, which is also what both C&I controls do.
                  flex: 1, height: 34, borderRadius: 7, border: "none",
                  background: active ? "#ffffff" : "transparent",
                  color: active ? "hsl(220, 25%, 12%)" : "hsl(220, 15%, 42%)",
                  fontWeight: 600, fontSize: "0.8rem", cursor: "pointer",
                  boxShadow: active ? "0 1px 2px rgba(15,23,42,0.06)" : "none",
                }}
              >
                {t === "type" ? "Type my working" : "Upload a photo"}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Upload zone ────────────────── */}
      {answerTab === "upload" && !hasFile && !result && (
        <>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          style={{
            width: "100%",
            padding: "22px 14px",
            borderRadius: 12,
            border: "2px dashed hsl(220, 18%, 82%)",
            background: "hsl(210, 33%, 96%)",
            color: "hsl(220, 25%, 12%)",
            fontSize: "0.85rem",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 7,
          }}
        >
          <span>Upload a photo or PDF of your answer</span>
          <span style={{ fontSize: "0.7rem", fontWeight: 400, opacity: 0.8 }}>
            {UPLOAD_LIMIT_SENTENCE}
          </span>
        </button>

        {/* Solved it on paper? Send it straight from your phone instead of emailing it
            to yourself. A QR handoff produces a FILE — the same tuple handleFileSelect
            fills — so it is a SUB-MODE OF UPLOAD, deliberately attached inside this
            panel and NEVER a third peer beside the type/upload control: at 360px a
            third CTA drops each from ~162px to ~105px against ~105px of label, silently
            re-breaking the two-peer fix the owner verified by screenshot.

            Sibling of the dropzone, not nested inside it — that <button> is an
            interactive element and QrAnswerHandoff renders its own.

            Desktop-only + signed-in-only; renders nothing otherwise, so when QR is
            unused this panel behaves exactly as it did before. */}
        <QrAnswerHandoff
          // "photo": one handwritten answer to ONE question — the photo IS the answer.
          // (Contrast the Chapter Test, which needs "document": a multi-page PDF, where
          // camera-first copy would have a student shoot page 1 and believe they were
          // done.) `mode` rides to the phone as `variant` on the coordination doc and
          // drives both its copy and its camera default.
          mode="photo"
          disabled={loading}
          onImageReceived={({ imageBase64: b64, imageMimeType: mime }) => {
            // The phone's picker keeps accept="...,application/pdf" in EVERY mode —
            // `capture` only hints at the camera, it does not restrict the picker — so a
            // PDF can legitimately arrive here even in "photo" mode. Set the full state
            // tuple the preview/PDF branches below read: a PDF with isPdf unset would
            // fall into the <img> branch and render broken.
            const pdf = mime === "application/pdf";
            setError(null);
            setResult(null);
            setFileName(pdf ? "PDF from your phone" : "Photo from your phone");
            setIsPdf(pdf);
            setImageMimeType(mime);
            setImagePreview(pdf ? null : `data:${mime};base64,${b64}`);
            setImageBase64(b64);
          }}
        />
        </>
      )}

      {/* ── Image preview ────────────────── */}
      {answerTab === "upload" && imagePreview && !isPdf && !result && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ position: "relative", display: "inline-block", maxWidth: "100%" }}>
            <img
              src={imagePreview}
              alt="Your solution"
              style={{ maxWidth: "100%", maxHeight: 220, borderRadius: 10, border: "1px solid var(--bg-card-border)" }}
            />
            <button
              type="button"
              onClick={handleClear}
              style={{
                position: "absolute", top: 4, right: 4,
                width: 24, height: 24, borderRadius: "50%",
                border: "none", background: "rgba(0,0,0,0.6)",
                color: "white", fontSize: "0.7rem", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >✕</button>
          </div>
        </div>
      )}

      {/* ── PDF indicator ────────────────── */}
      {answerTab === "upload" && isPdf && fileName && !result && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
          borderRadius: 10, background: "hsl(210, 33%, 96%)",
          border: "1px solid hsl(220, 18%, 90%)", marginBottom: 10,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {fileName}
            </div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>PDF ready — all pages will be read</div>
          </div>
          <button
            type="button"
            onClick={handleClear}
            style={{
              flexShrink: 0, width: 24, height: 24, borderRadius: "50%",
              border: "none", background: "rgba(0,0,0,0.15)",
              color: "var(--text-muted)", fontSize: "0.7rem",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >✕</button>
        </div>
      )}

      {/* ── Type panel ──────────────────
          The shared <EquationInput> (#429) is unchanged — only WHERE it is mounted
          moved: out from behind the disclosure, into a first-class peer panel. Its
          props and string contract are untouched (EQUATION_INPUT_API_CONTRACT §"one
          writer per file" — this lane never edits src/components/equation/**). */}
      {answerTab === "type" && !result && (
        <EquationInput
          value={textAnswer}
          onChange={setTextAnswer}
          placeholder="Type your working and answer here..."
          rows={4}
          ariaLabel="Type your working and answer"
        />
      )}

      {/* ── Check button ────────────────── */}
      {canCheck && !result && (
        <button
          type="button"
          onClick={handleCheck}
          disabled={loading}
          style={{
            marginTop: 10, width: "100%", padding: "11px 14px",
            borderRadius: 10, border: "1px solid hsl(152, 55%, 45%)",
            background: loading
              ? "hsl(152, 30%, 62%)"
              : "hsl(152, 55%, 45%)",
            color: "white", fontSize: "0.84rem", fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.8 : 1,
          }}
        >
          {loading ? "Checking your answer..." : "Check my answer"}
        </button>
      )}

      {/* ── Premium boundary (GATE-2) ──────────────────
          Mounted ONLY while blocked. `UpgradeSheet` calls router hooks, and this
          component is rendered by suites that mount no router, so an always-mounted
          `open={false}` sheet would throw for every one of them. Conditional mount
          is the contract, not an optimisation. */}
      {premiumBlock && (
        <UpgradeSheet
          featureLabel={labelForFeature(premiumBlock.feature)}
          trialEndedAt={premiumBlock.trialEndedAt}
          onClose={() => setPremiumBlock(null)}
        />
      )}

      {/* ── Error ────────────────── */}
      {error && (
        <div style={{
          padding: "8px 12px", borderRadius: 8,
          background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)",
          color: "#ef4444", fontSize: "0.78rem", marginTop: 8,
        }}>
          {error}
        </div>
      )}

      {/* ── Result ────────────────── */}
      {result && (
        <div style={{ marginTop: 4 }}>
          {/* Cached result notice */}
          {isFromCache && (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              gap: 8, padding: "6px 10px", marginBottom: 8,
              borderRadius: 8, background: "hsl(210, 33%, 96%)",
              border: "1px solid hsl(220, 18%, 90%)",
            }}>
              <span style={{ fontSize: "0.72rem", color: "hsl(220, 15%, 42%)", fontWeight: 600 }}>
                Showing your previous check result
              </span>
              <button
                type="button"
                onClick={handleRecheck}
                style={{
                  flexShrink: 0, padding: "3px 10px", borderRadius: 999,
                  border: "1px solid hsl(152, 55%, 45%)",
                  background: "hsl(152, 55%, 95%)", color: "hsl(152, 55%, 28%)",
                  fontSize: "0.71rem", fontWeight: 700, cursor: "pointer",
                }}
              >
                Re-check
              </button>
            </div>
          )}
          {/* Evidence state label */}
          {result && (
            <div style={{
              display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", marginBottom: 10,
              borderRadius: 8, fontSize: "0.71rem", fontWeight: 600,
              ...(logStatus === "saved" || logStatus === "no-mistakes"
                ? {
                    background: "rgba(34,197,94,0.08)",
                    border: "1px solid rgba(34,197,94,0.2)",
                    color: "hsl(152, 55%, 28%)",
                  }
                : logStatus === "local-only" || logStatus === "cached" || logStatus === "pending"
                ? {
                    background: "hsl(215, 75%, 95%)",
                    border: "1px solid hsl(215, 65%, 84%)",
                    color: "hsl(215, 65%, 32%)",
                  }
                : logStatus === "saving"
                ? {
                    background: "hsl(43, 90%, 94%)",
                    border: "1px solid hsl(38, 75%, 78%)",
                    color: "hsl(35, 80%, 35%)",
                  }
                : {
                    background: "rgba(239,68,68,0.08)",
                    border: "1px solid rgba(239,68,68,0.2)",
                    color: "#ef4444",
                  }),
            }}>
              <span style={{ fontSize: "0.8rem" }}>
                {logStatus === "saved"
                  ? "✓"
                  : logStatus === "local-only"
                  ? "○"
                  : logStatus === "no-mistakes"
                  ? "✓"
                  : logStatus === "cached"
                  ? "○"
                  : "!"}
              </span>
              <span>
                {logStatus === "saved"
                  ? "Checked and saved to mistake history."
                  : logStatus === "no-mistakes"
                  ? "Checked — no mistakes found to save."
                  : logStatus === "local-only"
                  ? "Checked locally — not saved. Sign in to save mistake history."
                  : logStatus === "saving"
                  ? "Saving to mistake history..."
                  : logStatus === "cached"
                  ? "Previous check result loaded from this device — not newly saved."
                  : "Checked — save to mistake history unavailable right now."}
              </span>
            </div>
          )}
          {/* Score banner */}
          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "12px 14px", borderRadius: 12, marginBottom: 12,
            background: isPerfect ? "rgba(34,197,94,0.08)" : result.percentage >= 80 ? "rgba(34,197,94,0.06)" : result.percentage >= 50 ? "rgba(251,191,36,0.06)" : "rgba(239,68,68,0.06)",
            border: `1px solid ${isPerfect ? "rgba(34,197,94,0.4)" : result.percentage >= 80 ? "rgba(34,197,94,0.3)" : result.percentage >= 50 ? "rgba(251,191,36,0.3)" : "rgba(239,68,68,0.3)"}`,
          }}>
            <div style={{
              minWidth: 54, height: 54, borderRadius: "50%",
              background: scoreColor, color: "white",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              fontSize: "0.68rem", fontWeight: 700, lineHeight: 1.1, flexShrink: 0,
            }}>
              <span style={{ fontSize: "1.15rem" }}>{result.marksAwarded}</span>
              <span>/{result.totalMarks}</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "0.87rem", fontWeight: 700, color: scoreColor }}>
                {result.percentage}%
                {" — "}
                {isPerfect ? "Full marks" : result.percentage >= 80 ? "Strong answer" : result.percentage >= 50 ? "Partly correct" : "Needs correction"}
              </div>
              {!isPerfect && totalMistakes > 0 && (
                <MistakeSummaryLine summary={result.mistakeSummary} />
              )}
              {isPerfect && (
                <div style={{ fontSize: "0.74rem", color: "#22c55e", marginTop: 2 }}>
                  Full marks on this check.
                </div>
              )}
            </div>
          </div>

          {/* Annotated steps */}
          {result.annotatedSteps && result.annotatedSteps.length > 0 && (
            <>
              {/* The "1-mark question · step marks are AI guidance only" banner that
                  used to sit here is removed: it was a vestigial pre-clamp mitigation
                  for exactly the objective/"+0 marks" confusion that the `objective`
                  flag now cures at the source. It was also dead in practice — every
                  1-mark bank row is Section A (so the grader treats it objective and
                  zeroes the step marks, making the `marksAwarded > 0.5` condition
                  false), and the two surfaces that could show an unclamped 1-mark
                  question gate 1-mark items out. Suppressing the chip is the honest
                  fix; a disclaimer under a misleading chip was not. */}
              {result.annotatedSteps.map((step) => (
                <AnnotatedStepCard key={step.stepNumber} step={step} objective={result.objective} />
              ))}
            </>
          )}

          {/* Teacher's Note */}
          {result.teacherNote && (
            <div style={{
              marginTop: 10, padding: "12px 14px",
              borderRadius: 10, background: "hsl(210, 33%, 96%)",
              border: "1px solid hsl(220, 18%, 90%)",
            }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "hsl(220, 25%, 12%)", marginBottom: 5, display: "flex", alignItems: "center", gap: 6 }}>
                Examiner note
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--text)", lineHeight: 1.6 }}>
                {result.teacherNote}
              </div>
            </div>
          )}


          {/* See Model Answer CTA */}
          {onRequestStepSolution && (
            <button
              type="button"
              onClick={onRequestStepSolution}
              style={{
                marginTop: 10, width: "100%", padding: "11px 14px",
                borderRadius: 10, border: "none",
                background: "linear-gradient(135deg, rgba(59,130,246,0.12), rgba(59,130,246,0.18))",
                color: "#60a5fa", fontSize: "0.84rem", fontWeight: 700,
                cursor: "pointer", display: "flex", alignItems: "center",
                justifyContent: "center", gap: 8,
                boxShadow: "inset 0 0 0 1px rgba(59,130,246,0.3)",
              }}
            >
              <span>See the Model Answer</span>
              <span style={{ fontSize: "1rem" }}>→</span>
            </button>
          )}

          {/* Try another / Re-check */}
          {!isFromCache && (
            <button
              type="button"
              onClick={handleClear}
              style={{
                marginTop: 8, width: "100%", padding: "8px 12px",
                borderRadius: 8, border: "1px solid hsl(220, 18%, 82%)",
                background: "#ffffff", color: "hsl(220, 25%, 12%)",
                fontSize: "0.78rem", fontWeight: 600, cursor: "pointer",
              }}
            >
              Try another solution
            </button>
          )}
        </div>
      )}
    </div>
  );
}
