import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  checkSolutionImage,
  detectQuestion,
  type CheckSolutionResponse,
  type CheckSolutionAnnotatedStep,
  type MistakeType,
} from "../../ai/aiClient";
import { recordMistake } from "../../services/mistakeIntelligence";
import { recordAttempt, type DetectionOverrideLog } from "../../services/practiceInsights";
import { useAuth } from "../../context/AuthContext";
import { desktopTopicsBySubject } from "../../lib/desktop/topics";
import {
  buildConfirmedDetection,
  clampDetectedMarks,
  SHOW_DETECTION_META,
  type ConfirmedDetection,
} from "../../utils/checkImproveDetection";
import {
  buildDesktopPracticePath,
  buildDesktopWorksheetPath,
  buildDesktopTopicHubPath,
  buildDesktopMePath,
  withQuery,
  type DesktopRouteContext,
  type DesktopSubject,
} from "../../lib/desktop/navigation";

/**
 * DesktopCheckImprovePage — real desktop Check & Improve workflow.
 *
 * Replaces the previous static/illustrative graded preview with a workflow
 * that calls the production grading API (`checkSolutionImage`) and writes
 * real mistake logs (`logMistakes`) when a signed-in / local-session user
 * successfully grades an answer.
 *
 * Behaviour summary (locked-prototype contract):
 *   - Default view is the real input/upload state (no fake graded sample,
 *     no fake 3/5 score, no fake mistake category counts, no fake trend
 *     bars, no fake personalised insight).
 *   - Claim 2 (auto-detect): the student no longer picks marks/subject/topic.
 *     The grader determines them from the question (`detectMarks: true`), with the
 *     canonical `topics.ts` vocabulary (`CANONICAL_TOPIC_VOCAB`) passed so the
 *     detected topic is a real key. The detected topic is canonicalised via
 *     `desktopTopicForWeakAreaKey` before storing, keeping MI attribution clean.
 *   - Answer-method tabs: Upload photo (real `<input type="file">` +
 *     `FileReader` -> `imageBase64` + MIME) and Type answer (textarea ->
 *     `textAnswer`).
 *   - Grade CTA is disabled until a question and an answer (image or text)
 *     are present. Pressing it calls `checkSolutionImage(...)` once and
 *     stores grading / loading / error / result in local React state.
 *   - On `result.ok === false` or any thrown error the page shows an
 *     honest "Grading unavailable — please try again" notice with a Retry
 *     button. No synthesised grade is ever rendered.
 *   - Result UI renders ONLY real `CheckSolutionResponse` fields: score,
 *     percentage, annotated steps (status, marksAwarded, marksDeducted,
 *     teacherAnnotation, mistakeType, correctedWorking), mistake summary
 *     counts, and teacher note.
 *   - Mistake logging: only when `useAuth().user` exists do we call
 *     `logMistakes(user.uid, entry)`. `mistakeCounts` is mapped from
 *     `result.mistakeSummary`, `marksLost = max(0, totalMarks -
 *     marksAwarded)`, and `stepDetails` includes only steps with a real
 *     `mistakeType` and `marksDeducted > 0`. Failures show a non-blocking
 *     "Result shown, save unavailable" note — the result is never failed.
 *   - Signed-out / no-user state shows honest copy ("Sign in to save
 *     mistake history") and a CTA to /login that preserves redirect back
 *     to /check-improve. Saved history is never claimed without a user.
 *   - All next-action CTAs route via production paths only
 *     (`/practice-hub`, `/practice/worksheets`, `/topic-hub/:slug`,
 *     `/exam-trends`, `/me`, `/login?...`) and always preserve
 *     `source=check` and `returnTo=/check-improve`. No `/app/*` routes.
 *   - Visual language: the same light desktop tokens used by Home /
 *     Practice / Exam Trends / Topic Hub. Inline styles only. Two-column
 *     layout on wide desktops; single-column stack on narrow widths with
 *     no horizontal overflow.
 */

const PRIMARY_GREEN = "hsl(152, 55%, 45%)";
const TEXT_FG = "hsl(220, 25%, 12%)";
const TEXT_MUTED = "hsl(220, 15%, 42%)";
const BORDER = "hsl(220, 18%, 90%)";
const CARD_BG = "#ffffff";
const MUTED_BG = "hsl(220, 20%, 97%)";
const SECONDARY_BG = "hsl(150, 35%, 94%)";

const ACCENT_FG = "hsl(152, 55%, 35%)";
const ACCENT_SOFT = "hsl(150, 60%, 92%)";
const WARNING_FG = "hsl(35, 80%, 35%)";
const WARNING_SOFT = "hsl(43, 90%, 92%)";
const DANGER_FG = "hsl(0, 70%, 45%)";
const DANGER_SOFT = "hsl(0, 80%, 96%)";
const INFO_FG = "hsl(212, 70%, 42%)";
const INFO_SOFT = "hsl(212, 80%, 95%)";

const FONT_DISPLAY =
  '"Source Serif Pro", "Source Serif 4", Georgia, "Times New Roman", serif';
const FONT_SANS =
  'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const FONT_SERIF = 'Georgia, "Times New Roman", serif';

const ROUTE_CTX: DesktopRouteContext = {
  source: "check",
  returnTo: "/check-improve",
};

// Canonical topic vocabulary (Maths + Science) from topics.ts — the single source
// of truth. Passed to the grader so the AI's detected topic is constrained to a
// real `topics.ts` key (never free text), keeping MI attribution clean (Fix A).
const CANONICAL_TOPIC_VOCAB = [
  ...desktopTopicsBySubject("Maths"),
  ...desktopTopicsBySubject("Science"),
].map((t) => ({ slug: t.slug, name: t.name, subject: t.subject }));

// Meta label for the mark scale (gated by SHOW_DETECTION_META — hides the HOW,
// never the values). Calm phrasing, never anxious "AI low-confidence".
function detectionSourceLabel(
  source: "stated" | "inferred" | "fallback" | "user" | null,
): string {
  switch (source) {
    case "stated":
      return "read from the question";
    case "inferred":
      return "estimated from the question";
    case "user":
      return "you set this";
    default:
      return "";
  }
}

const MISTAKE_LABELS: Record<MistakeType, { label: string; fg: string; bg: string }> = {
  conceptual: { label: "Conceptual", fg: WARNING_FG, bg: WARNING_SOFT },
  calculation: { label: "Calculation", fg: INFO_FG, bg: INFO_SOFT },
  silly: { label: "Silly", fg: DANGER_FG, bg: DANGER_SOFT },
  presentation: { label: "Presentation", fg: ACCENT_FG, bg: ACCENT_SOFT },
};

type AnswerTab = "upload" | "type";
type GradeStatus = "idle" | "loading" | "error" | "ready";
type SaveStatus = "idle" | "saving" | "saved" | "save-failed" | "no-user";

interface GradedContext {
  subject: DesktopSubject;
  topicName: string;
  topicSlug: string;
  question: string;
  marks: number;
  /** How the mark scale was set (detect-then-confirm). */
  marksSource: "stated" | "inferred" | "fallback" | "user" | null;
  /** Non-null only when the student corrected the AI's detection. */
  detectionOverride: DetectionOverrideLog | null;
}

/* ────────────────── inline SVG glyphs ────────────────── */

const glyphProps = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const UploadGlyph = ({ size = 28, color = PRIMARY_GREEN }: { size?: number; color?: string }) => (
  <svg {...glyphProps} width={size} height={size} style={{ color }}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const ChevronRightGlyph = ({ size = 16 }: { size?: number }) => (
  <svg {...glyphProps} width={size} height={size}>
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const ArrowLeftGlyph = () => (
  <svg {...glyphProps} width={16} height={16}>
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

const CheckGlyph = ({ color }: { color: string }) => (
  <svg {...glyphProps} width={16} height={16} style={{ color }}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="9 12 12 15 16 10" />
  </svg>
);

const AlertGlyph = ({ color }: { color: string }) => (
  <svg {...glyphProps} width={16} height={16} style={{ color }}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const XCircleGlyph = ({ color }: { color: string }) => (
  <svg {...glyphProps} width={16} height={16} style={{ color }}>
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);

const SpinnerGlyph = ({ color = PRIMARY_GREEN }: { color?: string }) => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" style={{ color }}>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
    <path
      d="M21 12a9 9 0 0 0-9-9"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
    >
      <animateTransform
        attributeName="transform"
        type="rotate"
        from="0 12 12"
        to="360 12 12"
        dur="0.9s"
        repeatCount="indefinite"
      />
    </path>
  </svg>
);

/* ────────────────── shared building blocks ────────────────── */

const PageHeader: React.FC<{
  eyebrow: string;
  title: string;
  description: string;
  showBack?: boolean;
  onBack?: () => void;
  actions?: React.ReactNode;
  isNarrow: boolean;
}> = ({ eyebrow, title, description, showBack, onBack, actions, isNarrow }) => (
  <div
    style={{
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 24,
      marginBottom: 24,
      flexDirection: isNarrow ? "column" : "row",
    }}
  >
    <div style={{ minWidth: 0, flex: 1 }}>
      {showBack && (
        <button
          type="button"
          onClick={onBack}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 10px 4px 6px",
            marginBottom: 10,
            border: "none",
            background: "transparent",
            color: TEXT_MUTED,
            fontFamily: FONT_SANS,
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            borderRadius: 6,
          }}
        >
          <ArrowLeftGlyph /> Back
        </button>
      )}
      <div
        style={{
          fontFamily: FONT_SANS,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: TEXT_MUTED,
          marginBottom: 8,
        }}
      >
        {eyebrow}
      </div>
      <h1
        style={{
          margin: 0,
          fontFamily: FONT_DISPLAY,
          fontSize: isNarrow ? 24 : 30,
          fontWeight: 600,
          lineHeight: 1.2,
          color: TEXT_FG,
        }}
      >
        {title}
      </h1>
      <p
        style={{
          margin: "10px 0 0",
          fontFamily: FONT_SANS,
          fontSize: 14,
          lineHeight: 1.55,
          color: TEXT_MUTED,
          maxWidth: 720,
        }}
      >
        {description}
      </p>
    </div>
    {actions && (
      <div
        style={{
          display: "flex",
          gap: 10,
          flexShrink: 0,
          paddingTop: 4,
          flexWrap: "wrap",
        }}
      >
        {actions}
      </div>
    )}
  </div>
);

const cardStyle: React.CSSProperties = {
  background: CARD_BG,
  border: `1px solid ${BORDER}`,
  borderRadius: 14,
  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
};

const chipBase: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "3px 9px",
  borderRadius: 999,
  fontFamily: FONT_SANS,
  fontSize: 11,
  fontWeight: 600,
  border: `1px solid ${BORDER}`,
  background: MUTED_BG,
  color: TEXT_FG,
};

const buttonOutline: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 14px",
  borderRadius: 8,
  border: `1px solid ${BORDER}`,
  background: CARD_BG,
  color: TEXT_FG,
  fontFamily: FONT_SANS,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};

const buttonAccent: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 14px",
  borderRadius: 8,
  border: `1px solid ${PRIMARY_GREEN}`,
  background: PRIMARY_GREEN,
  color: "#ffffff",
  fontFamily: FONT_SANS,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};

const sectionEyebrow: React.CSSProperties = {
  fontFamily: FONT_SANS,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: TEXT_MUTED,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 40,
  borderRadius: 10,
  border: `1px solid ${BORDER}`,
  background: CARD_BG,
  color: TEXT_FG,
  fontFamily: FONT_SANS,
  fontSize: 14,
  padding: "0 12px",
  boxSizing: "border-box",
  outline: "none",
};

/* ────────────────── status / step rendering ────────────────── */

const STATUS_META: Record<
  CheckSolutionAnnotatedStep["status"],
  { label: string; fg: string; bg: string; Icon: React.FC<{ color: string }> }
> = {
  correct: { label: "Correct", fg: ACCENT_FG, bg: ACCENT_SOFT, Icon: CheckGlyph },
  partial: { label: "Partial", fg: WARNING_FG, bg: WARNING_SOFT, Icon: AlertGlyph },
  incorrect: { label: "Incorrect", fg: DANGER_FG, bg: DANGER_SOFT, Icon: XCircleGlyph },
  missing: { label: "Missing", fg: DANGER_FG, bg: DANGER_SOFT, Icon: XCircleGlyph },
};

const AnnotatedStepRow: React.FC<{ step: CheckSolutionAnnotatedStep }> = ({ step }) => {
  const meta = STATUS_META[step.status] ?? STATUS_META.incorrect;
  const Icon = meta.Icon;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: 14,
        borderRadius: 10,
        border: `1px solid ${BORDER}`,
        background: MUTED_BG,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Icon color={meta.fg} />
          <span
            style={{
              fontFamily: FONT_SANS,
              fontSize: 12,
              fontWeight: 700,
              color: TEXT_MUTED,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Step {step.stepNumber}
          </span>
          <span
            style={{
              ...chipBase,
              background: meta.bg,
              color: meta.fg,
              border: `1px solid ${meta.bg}`,
            }}
          >
            {meta.label}
          </span>
          {step.mistakeType && MISTAKE_LABELS[step.mistakeType] && (
            <span
              style={{
                ...chipBase,
                background: MISTAKE_LABELS[step.mistakeType].bg,
                color: MISTAKE_LABELS[step.mistakeType].fg,
                border: `1px solid ${MISTAKE_LABELS[step.mistakeType].bg}`,
              }}
            >
              {MISTAKE_LABELS[step.mistakeType].label}
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: FONT_SANS, fontSize: 12, color: TEXT_MUTED }}>
            +{step.marksAwarded}
          </span>
          {step.marksDeducted > 0 && (
            <span style={{ fontFamily: FONT_SANS, fontSize: 12, color: DANGER_FG }}>
              −{step.marksDeducted}
            </span>
          )}
        </div>
      </div>

      {step.description && (
        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 13,
            fontWeight: 600,
            color: TEXT_FG,
            lineHeight: 1.45,
          }}
        >
          {step.description}
        </div>
      )}

      {step.studentWork && (
        <div
          style={{
            fontFamily: FONT_SERIF,
            fontSize: 14,
            color: TEXT_FG,
            background: CARD_BG,
            border: `1px solid ${BORDER}`,
            borderRadius: 8,
            padding: "8px 10px",
            lineHeight: 1.5,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {step.studentWork}
        </div>
      )}

      {step.teacherAnnotation && (
        <div
          style={{
            fontFamily: FONT_SANS,
            fontStyle: "italic",
            fontSize: 12,
            color: meta.fg,
            lineHeight: 1.5,
          }}
        >
          ↳ {step.teacherAnnotation}
        </div>
      )}

      {step.correctedWorking && (
        <div
          style={{
            fontFamily: FONT_SERIF,
            fontSize: 13,
            color: ACCENT_FG,
            background: ACCENT_SOFT,
            borderRadius: 8,
            padding: "8px 10px",
            lineHeight: 1.5,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          ✓ {step.correctedWorking}
        </div>
      )}
    </div>
  );
};

/* ────────────────── data helpers ────────────────── */

// Entry building + persistence now live behind the single front door
// `recordMistake` (src/services/mistakeIntelligence.ts). The previous local
// buildLogEntry was removed so desktop + mobile can no longer diverge.

/* ────────────────── page ────────────────── */

const DesktopCheckImprovePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── responsive layout ────────────────────────────────────────────
  const [isNarrow, setIsNarrow] = useState<boolean>(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(max-width: 960px)");
    const apply = () => setIsNarrow(mq.matches);
    apply();
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
    mq.addListener(apply);
    return () => mq.removeListener(apply);
  }, []);

  // ── input form state ─────────────────────────────────────────────
  // Subject / topic / marks are NO LONGER student-picked — the grader determines
  // them from the question (Claim 2). The student supplies only the question + the
  // answer; the detected values come back on the graded result.
  // Question input — type/paste OR upload a photo of the QUESTION (distinct from
  // the answer photo). The photo lets the grader read the printed "[3]" directly.
  const [question, setQuestion] = useState<string>("");
  const [questionTab, setQuestionTab] = useState<"type" | "upload">("type");
  const [qImageBase64, setQImageBase64] = useState<string | null>(null);
  const [qImageMime, setQImageMime] = useState<string>("image/jpeg");
  const [qImageName, setQImageName] = useState<string>("");
  const qFileInputRef = useRef<HTMLInputElement>(null);

  // Answer input (unchanged).
  const [tab, setTab] = useState<AnswerTab>("upload");
  const [textAnswer, setTextAnswer] = useState<string>("");
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string>("image/jpeg");
  const [imageName, setImageName] = useState<string>("");

  // Detect-then-confirm: `detected` is the AI's read (immutable record for the
  // override log); `confirmed` is what grading runs against (the student may
  // correct it). `editing` toggles the inline correction.
  const [detecting, setDetecting] = useState<boolean>(false);
  const [detectError, setDetectError] = useState<string | null>(null);
  const [detected, setDetected] = useState<ConfirmedDetection | null>(null);
  const [confirmed, setConfirmed] = useState<ConfirmedDetection | null>(null);
  const [editing, setEditing] = useState<boolean>(false);

  // ── grading + result state ───────────────────────────────────────
  const [status, setStatus] = useState<GradeStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<CheckSolutionResponse | null>(null);
  const [resultCtx, setResultCtx] = useState<GradedContext | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  const hasQuestion =
    questionTab === "type" ? question.trim().length > 0 : Boolean(qImageBase64);
  const hasAnswer =
    tab === "upload" ? Boolean(imageBase64) : textAnswer.trim().length >= 10;
  // Grade only after the question has been read + confirmed AND an answer exists.
  const canGrade = Boolean(confirmed) && hasAnswer && status !== "loading";

  function handleFileChosen(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const data = reader.result as string;
      const [prefix, b64] = data.split(",");
      const mime = prefix.match(/:(.*?);/)?.[1] || file.type || "image/jpeg";
      setImageBase64(b64 || null);
      setImageMime(mime);
      setImageName(file.name);
    };
    reader.onerror = () => {
      setImageBase64(null);
      setImageName("");
    };
    reader.readAsDataURL(file);
  }

  function clearImage() {
    setImageBase64(null);
    setImageName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // Question photo → base64. Reading a new question invalidates any prior detection.
  function handleQuestionFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const data = reader.result as string;
      const [prefix, b64] = data.split(",");
      const mime = prefix.match(/:(.*?);/)?.[1] || file.type || "image/jpeg";
      setQImageBase64(b64 || null);
      setQImageMime(mime);
      setQImageName(file.name);
      clearDetection();
    };
    reader.onerror = () => {
      setQImageBase64(null);
      setQImageName("");
    };
    reader.readAsDataURL(file);
  }

  function clearDetection() {
    setDetected(null);
    setConfirmed(null);
    setEditing(false);
    setDetectError(null);
  }

  // Read the question ALONE (one deliberate, cheap call) → show the detected chip.
  async function handleReadQuestion() {
    if (detecting) return;
    const q = question.trim();
    if (questionTab === "type" && !q) return;
    if (questionTab === "upload" && !qImageBase64) return;
    setDetecting(true);
    setDetectError(null);
    try {
      const d = await detectQuestion({
        question: q || undefined,
        ...(questionTab === "upload" && qImageBase64
          ? { imageBase64: qImageBase64, imageMimeType: qImageMime }
          : {}),
        topicVocabulary: CANONICAL_TOPIC_VOCAB,
      });
      if (!d || d.ok === false) {
        setDetectError(d?.error ?? "We couldn't read the question — please try again.");
        return;
      }
      const cd = buildConfirmedDetection(d);
      setDetected(cd);
      setConfirmed(cd);
      setEditing(false);
    } catch {
      setDetectError("We couldn't read the question — please try again.");
    } finally {
      setDetecting(false);
    }
  }

  // Constrained corrections — topic stays a canonical key; marks 1–6; subject
  // toggle re-seeds the topic. A corrected mark is flagged marksSource "user".
  function correctSubject(next: DesktopSubject) {
    const first = CANONICAL_TOPIC_VOCAB.find((t) => t.subject === next);
    setConfirmed((c) =>
      c
        ? { ...c, subject: next, topicSlug: first?.slug ?? "", topicName: first?.name ?? "" }
        : c,
    );
  }
  function correctTopic(slug: string) {
    const t = CANONICAL_TOPIC_VOCAB.find((x) => x.slug === slug);
    setConfirmed((c) =>
      c
        ? {
            ...c,
            topicSlug: t?.slug ?? "",
            topicName: t?.name ?? "",
            subject: (t?.subject as DesktopSubject) ?? c.subject,
          }
        : c,
    );
  }
  function correctMarks(m: number) {
    setConfirmed((c) => (c ? { ...c, marks: clampDetectedMarks(m), marksSource: "user" } : c));
  }

  function resetToInput() {
    setStatus("idle");
    setErrorMessage(null);
    setResult(null);
    setResultCtx(null);
    setSaveStatus("idle");
  }

  async function persistMistakeLog(
    ctx: GradedContext,
    graded: CheckSolutionResponse,
  ) {
    setSaveStatus("saving");
    const rec = await recordMistake(user, graded, {
      subject: ctx.subject,
      topic: ctx.topicName,
      topicKey: ctx.topicSlug, // canonical slug → aligns the weak-area bridge
      question: ctx.question,
    });
    // Score-twin: persist the graded score as an attempt (feeds the Me
    // scorecard / accuracy). Every graded answer, including full marks. Carries the
    // detect-then-confirm telemetry (mark-scale source + any student override).
    recordAttempt(user, {
      subject: ctx.subject,
      topic: ctx.topicName,
      topicKey: ctx.topicSlug,
      question: ctx.question,
      marksScored: graded.marksAwarded,
      marksAvailable: graded.totalMarks,
      mode: "graded",
      marksSource: ctx.marksSource ?? undefined,
      detectionOverride: ctx.detectionOverride,
    });
    switch (rec.outcome) {
      case "logged":
      case "duplicate":
      case "skipped-clean":
        setSaveStatus("saved");
        break;
      case "skipped-no-user":
      case "skipped-local":
        setSaveStatus("no-user");
        break;
      default:
        setSaveStatus("save-failed");
    }
  }

  async function handleGrade() {
    if (!canGrade || !confirmed) return;
    setErrorMessage(null);
    setStatus("loading");
    setSaveStatus("idle");

    const trimmedQuestion = question.trim();

    try {
      // Detect-then-confirm: grade against the CONFIRMED (possibly corrected)
      // marks/subject/topic via the trusted-marks path (no re-detection at grade
      // time). The question is sent as text when typed; when it was a photo we send
      // its description-free label so the grader still has the question text — for a
      // photo-only question we fall back to the answer image carrying the work.
      const answerPart =
        tab === "upload" && imageBase64
          ? { imageBase64, imageMimeType: imageMime }
          : { textAnswer: textAnswer.trim() };

      const graded = await checkSolutionImage({
        question: trimmedQuestion || confirmed.topicName || "Submitted question",
        subject: confirmed.subject,
        topic: confirmed.topicName,
        marks: confirmed.marks,
        ...answerPart,
      });
      if (!graded || graded.ok === false) {
        setErrorMessage(
          graded?.error
            ? `Grading unavailable — ${graded.error}`
            : "Grading unavailable — please try again.",
        );
        setStatus("error");
        return;
      }

      // The override log: detected vs confirmed, only when the student changed it.
      const overrideLog: DetectionOverrideLog | null =
        detected &&
        (detected.marks !== confirmed.marks ||
          detected.subject !== confirmed.subject ||
          detected.topicSlug !== confirmed.topicSlug)
          ? {
              detected: {
                marks: detected.marks,
                subject: detected.subject,
                topicKey: detected.topicSlug,
              },
              confirmed: {
                marks: confirmed.marks,
                subject: confirmed.subject,
                topicKey: confirmed.topicSlug,
              },
            }
          : null;

      const ctx: GradedContext = {
        subject: confirmed.subject,
        topicName: confirmed.topicName,
        topicSlug: confirmed.topicSlug,
        question: trimmedQuestion,
        marks: graded.totalMarks,
        marksSource: confirmed.marksSource,
        detectionOverride: overrideLog,
      };

      setResult(graded);
      setResultCtx(ctx);
      setStatus("ready");
      void persistMistakeLog(ctx, graded);
    } catch {
      setErrorMessage("Grading unavailable — please try again.");
      setStatus("error");
    }
  }

  // ── route helpers ────────────────────────────────────────────────
  function gotoPracticeForResult() {
    if (!resultCtx) return;
    navigate(
      buildDesktopPracticePath({
        scope: resultCtx.topicSlug ? "topic" : "full-subject",
        subject: resultCtx.subject,
        topic: resultCtx.topicSlug || undefined,
        ...ROUTE_CTX,
      }),
    );
  }
  function gotoWorksheetForResult() {
    if (!resultCtx) return;
    navigate(
      buildDesktopWorksheetPath({
        scope: resultCtx.topicSlug ? "topic" : "full-subject",
        subject: resultCtx.subject,
        topic: resultCtx.topicSlug || undefined,
        mistakeAware: true,
        ...ROUTE_CTX,
      }),
    );
  }
  function gotoTopicHubForResult() {
    if (!resultCtx) return;
    if (resultCtx.topicSlug) {
      navigate(buildDesktopTopicHubPath(resultCtx.topicSlug, ROUTE_CTX));
    } else {
      navigate(
        withQuery(
          "/exam-trends",
          new URLSearchParams({
            source: "check",
            returnTo: "/check-improve",
          }),
        ),
      );
    }
  }
  function gotoExamTrends() {
    navigate(
      withQuery(
        "/exam-trends",
        new URLSearchParams({
          source: "check",
          returnTo: "/check-improve",
        }),
      ),
    );
  }
  function gotoMe() {
    navigate(buildDesktopMePath(ROUTE_CTX));
  }
  function gotoLogin() {
    const params = new URLSearchParams({
      reason: "grade-answer",
      redirect: "/check-improve",
    });
    navigate(withQuery("/login", params));
  }

  /* ────────────────── INPUT VIEW ────────────────── */

  if (status !== "ready" || !result || !resultCtx) {
    return (
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: isNarrow ? "20px 16px 56px" : "32px 32px 64px",
          fontFamily: FONT_SANS,
          minWidth: 0,
        }}
      >
        <PageHeader
          isNarrow={isNarrow}
          eyebrow="Check & Improve"
          title="Grade your answer, examiner-style"
          description="Upload a photo of your handwritten work or type it out. We send it to our examiner-style grader and show exactly where marks were lost — no fake scores, no shortcuts."
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isNarrow ? "minmax(0, 1fr)" : "minmax(0, 7fr) minmax(0, 5fr)",
            gap: 24,
            minWidth: 0,
          }}
        >
          {/* LEFT — input panel */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20, minWidth: 0 }}>
            {/* STEP 1 — the question (type / paste / upload a photo of the QUESTION) */}
            <div style={{ ...cardStyle, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={sectionEyebrow}>1 · The question</div>
              <div style={{ display: "flex", gap: 8 }}>
                {(["type", "upload"] as const).map((t) => {
                  const active = questionTab === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => { setQuestionTab(t); clearDetection(); }}
                      style={{
                        flex: 1, height: 34, borderRadius: 8,
                        border: active ? "none" : `1px solid ${BORDER}`,
                        background: active ? TEXT_FG : CARD_BG,
                        color: active ? "#ffffff" : TEXT_FG,
                        fontFamily: FONT_SANS, fontWeight: 600, fontSize: 12.5, cursor: "pointer",
                      }}
                    >
                      {t === "type" ? "Type / paste" : "Photo of the question"}
                    </button>
                  );
                })}
              </div>

              {questionTab === "type" ? (
                <input
                  type="text"
                  value={question}
                  onChange={(e) => { setQuestion(e.target.value); clearDetection(); }}
                  placeholder="e.g. Find the 10th term of the AP 3, 7, 11, … [3]"
                  style={inputStyle}
                />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <input
                    ref={qFileInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleQuestionFile(f);
                    }}
                  />
                  <button type="button" style={buttonOutline} onClick={() => qFileInputRef.current?.click()}>
                    {qImageName ? `Question photo: ${qImageName}` : "Choose a photo of the question"}
                  </button>
                  <div style={{ fontSize: 12, color: TEXT_MUTED }}>
                    A clear photo lets us read the printed marks (e.g. “[3]”) straight off the page.
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleReadQuestion}
                disabled={!hasQuestion || detecting}
                style={{
                  ...buttonAccent,
                  opacity: !hasQuestion || detecting ? 0.55 : 1,
                  cursor: !hasQuestion || detecting ? "not-allowed" : "pointer",
                  alignSelf: "flex-start",
                }}
              >
                {detecting ? "Reading…" : confirmed ? "Re-read the question" : "Read the question →"}
              </button>
              {detectError && (
                <div style={{ fontSize: 12.5, color: DANGER_FG }}>{detectError}</div>
              )}

              {/* Confirmation chip — the detected values, always visible + correctable */}
              {confirmed && (
                <div
                  style={{
                    background: MUTED_BG,
                    border: `1px solid ${BORDER}`,
                    borderRadius: 10,
                    padding: "12px 14px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  <div style={{ fontSize: 13, color: TEXT_FG, lineHeight: 1.5 }}>
                    <strong>Detected:</strong> {confirmed.subject}
                    {confirmed.topicName ? ` · ${confirmed.topicName}` : ""} ·{" "}
                    {confirmed.marks} mark{confirmed.marks === 1 ? "" : "s"}
                    {SHOW_DETECTION_META && detectionSourceLabel(confirmed.marksSource) ? (
                      <span style={{ color: TEXT_MUTED }}>
                        {" "}({detectionSourceLabel(confirmed.marksSource)})
                      </span>
                    ) : null}
                  </div>
                  {!editing ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: 12.5, color: TEXT_MUTED }}>Looks right?</span>
                      <button
                        type="button"
                        onClick={() => setEditing(true)}
                        style={{
                          background: "none", border: "none", padding: 0,
                          color: PRIMARY_GREEN, fontFamily: FONT_SANS, fontWeight: 600,
                          fontSize: 12.5, cursor: "pointer",
                        }}
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <div style={{ display: "flex", gap: 8 }}>
                        {(["Maths", "Science"] as DesktopSubject[]).map((s) => {
                          const active = confirmed.subject === s;
                          return (
                            <button
                              key={s}
                              type="button"
                              onClick={() => correctSubject(s)}
                              style={{
                                flex: 1, height: 32, borderRadius: 8,
                                border: active ? "none" : `1px solid ${BORDER}`,
                                background: active ? TEXT_FG : CARD_BG,
                                color: active ? "#ffffff" : TEXT_FG,
                                fontFamily: FONT_SANS, fontWeight: 600, fontSize: 12, cursor: "pointer",
                              }}
                            >
                              {s}
                            </button>
                          );
                        })}
                      </div>
                      <select
                        value={confirmed.topicSlug}
                        onChange={(e) => correctTopic(e.target.value)}
                        style={inputStyle}
                      >
                        <option value="">(no specific topic)</option>
                        {CANONICAL_TOPIC_VOCAB.filter((t) => t.subject === confirmed.subject).map((t) => (
                          <option key={t.slug} value={t.slug}>{t.name}</option>
                        ))}
                      </select>
                      <div style={{ display: "flex", gap: 6 }}>
                        {[1, 2, 3, 4, 5, 6].map((m) => {
                          const active = confirmed.marks === m;
                          return (
                            <button
                              key={m}
                              type="button"
                              onClick={() => correctMarks(m)}
                              style={{
                                flex: 1, height: 32, borderRadius: 8,
                                border: active ? "none" : `1px solid ${BORDER}`,
                                background: active ? PRIMARY_GREEN : CARD_BG,
                                color: active ? "#ffffff" : TEXT_FG,
                                fontFamily: FONT_SANS, fontWeight: 700, fontSize: 12, cursor: "pointer",
                              }}
                            >
                              {m}
                            </button>
                          );
                        })}
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditing(false)}
                        style={{ ...buttonOutline, alignSelf: "flex-start" }}
                      >
                        Done
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* STEP 2 — the answer (upload a photo of YOUR work, or type it) */}
            <div style={{ ...cardStyle, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={sectionEyebrow}>2 · Your answer</div>
              <div
                style={{
                  display: "flex",
                  background: MUTED_BG,
                  borderRadius: 10,
                  padding: 4,
                  gap: 4,
                  border: `1px solid ${BORDER}`,
                }}
              >
                {(["upload", "type"] as AnswerTab[]).map((t) => {
                  const active = tab === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTab(t)}
                      style={{
                        flex: 1,
                        height: 34,
                        borderRadius: 7,
                        border: "none",
                        background: active ? CARD_BG : "transparent",
                        color: active ? TEXT_FG : TEXT_MUTED,
                        fontFamily: FONT_SANS,
                        fontWeight: 600,
                        fontSize: 13,
                        cursor: "pointer",
                        boxShadow: active ? "0 1px 2px rgba(15,23,42,0.06)" : "none",
                      }}
                    >
                      {t === "upload" ? "Upload photo" : "Type answer"}
                    </button>
                  );
                })}
              </div>

              {tab === "upload" ? (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileChosen(f);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      width: "100%",
                      minHeight: 140,
                      borderRadius: 12,
                      border: imageBase64
                        ? `2px solid ${PRIMARY_GREEN}`
                        : `2px dashed ${BORDER}`,
                      background: imageBase64 ? SECONDARY_BG : MUTED_BG,
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 10,
                      padding: 16,
                    }}
                  >
                    {imageBase64 ? (
                      <>
                        <CheckGlyph color={PRIMARY_GREEN} />
                        <div style={{ fontSize: 13, fontWeight: 700, color: ACCENT_FG }}>
                          Image loaded
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: TEXT_MUTED,
                            maxWidth: "100%",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {imageName}
                        </div>
                        <div style={{ fontSize: 11, color: TEXT_MUTED }}>
                          Click to choose a different file
                        </div>
                      </>
                    ) : (
                      <>
                        <UploadGlyph />
                        <div style={{ fontSize: 14, fontWeight: 600, color: TEXT_FG }}>
                          Choose a photo of your answer
                        </div>
                        <div style={{ fontSize: 12, color: TEXT_MUTED }}>
                          PNG or JPG · clear lighting works best
                        </div>
                      </>
                    )}
                  </button>
                  {imageBase64 && (
                    <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
                      <button type="button" onClick={clearImage} style={buttonOutline}>
                        Remove image
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <textarea
                  value={textAnswer}
                  onChange={(e) => setTextAnswer(e.target.value)}
                  placeholder="Type your answer here. Include each step on a new line — examiners award method marks even when the final answer slips."
                  style={{
                    width: "100%",
                    minHeight: 180,
                    borderRadius: 10,
                    border: `1px solid ${BORDER}`,
                    background: CARD_BG,
                    color: TEXT_FG,
                    fontFamily: FONT_SANS,
                    fontSize: 14,
                    padding: "12px 14px",
                    resize: "vertical",
                    boxSizing: "border-box",
                    lineHeight: 1.55,
                    outline: "none",
                  }}
                />
              )}

              {errorMessage && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    padding: "12px 14px",
                    borderRadius: 10,
                    background: DANGER_SOFT,
                    border: `1px solid ${DANGER_SOFT}`,
                    color: DANGER_FG,
                    fontSize: 13,
                  }}
                >
                  <AlertGlyph color={DANGER_FG} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, marginBottom: 2 }}>{errorMessage}</div>
                    <div style={{ fontSize: 12, color: DANGER_FG, opacity: 0.85 }}>
                      No score has been generated. Press Retry to call the grader again.
                    </div>
                  </div>
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  justifyContent: "flex-end",
                  flexWrap: "wrap",
                }}
              >
                {!canGrade && status !== "loading" && (
                  <span style={{ fontSize: 12, color: TEXT_MUTED }}>
                    {!confirmed
                      ? "Read the question first (step 1)"
                      : "Add an answer (image or text) to continue"}
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleGrade}
                  disabled={!canGrade}
                  style={{
                    ...buttonAccent,
                    background: canGrade ? PRIMARY_GREEN : "hsl(220, 18%, 85%)",
                    border: `1px solid ${canGrade ? PRIMARY_GREEN : "hsl(220, 18%, 85%)"}`,
                    cursor: canGrade ? "pointer" : "not-allowed",
                    opacity: canGrade ? 1 : 0.85,
                    paddingLeft: 18,
                    paddingRight: 18,
                  }}
                >
                  {status === "loading" ? (
                    <>
                      <SpinnerGlyph color="#ffffff" /> Grading…
                    </>
                  ) : status === "error" ? (
                    <>Retry grading <ChevronRightGlyph /></>
                  ) : (
                    <>Grade my answer <ChevronRightGlyph /></>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT — help + save state */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20, minWidth: 0 }}>
            <div style={{ ...cardStyle, padding: 20 }}>
              <div style={sectionEyebrow}>How it works</div>
              <ol
                style={{
                  margin: "12px 0 0",
                  paddingLeft: 18,
                  fontSize: 13,
                  lineHeight: 1.65,
                  color: TEXT_FG,
                }}
              >
                <li>Add the question (type, paste, or photo) and tap “Read the question”.</li>
                <li>Check what we read — marks, subject, chapter — and change it if it’s off.</li>
                <li>Upload a photo of your written answer or type it out, then grade.</li>
                <li>
                  We call our examiner-style grader and show the real score,
                  annotated steps and where marks were lost.
                </li>
              </ol>
              <p style={{ margin: "12px 0 0", fontSize: 12, color: TEXT_MUTED, lineHeight: 1.55 }}>
                We never invent a score. If grading fails, you'll see an honest
                error and can retry.
              </p>
            </div>

            <div
              style={{
                ...cardStyle,
                padding: 20,
                background: user ? SECONDARY_BG : MUTED_BG,
                borderColor: user ? ACCENT_SOFT : BORDER,
              }}
            >
              <div style={sectionEyebrow}>Mistake history</div>
              {user ? (
                <p style={{ margin: "10px 0 0", fontSize: 13, color: TEXT_FG, lineHeight: 1.55 }}>
                  Signed in as{" "}
                  <strong>{user.displayName || user.email || "your account"}</strong>.
                  Each successful grading is saved to your mistake history so we
                  can spot patterns over time.
                </p>
              ) : (
                <>
                  <p style={{ margin: "10px 0 0", fontSize: 13, color: TEXT_FG, lineHeight: 1.55 }}>
                    Sign in to save mistake history. Without an account we'll
                    still grade your answer, but the result won't be remembered
                    after you leave.
                  </p>
                  <div style={{ marginTop: 12 }}>
                    <button type="button" style={buttonOutline} onClick={gotoLogin}>
                      Sign in to save history <ChevronRightGlyph />
                    </button>
                  </div>
                </>
              )}
            </div>

            <div style={{ ...cardStyle, padding: 20 }}>
              <div style={sectionEyebrow}>Tip</div>
              <p style={{ margin: "10px 0 0", fontSize: 13, color: TEXT_FG, lineHeight: 1.55 }}>
                Photos with even lighting and a flat page give the grader the
                best chance. Include each working step, not just the final
                answer — examiners reward method.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ────────────────── RESULT VIEW ────────────────── */

  const totalMarks = result.totalMarks;
  const marksAwarded = result.marksAwarded;
  const pct = Math.round(result.percentage ?? 0);
  const ringColor =
    pct >= 70 ? ACCENT_FG : pct >= 40 ? WARNING_FG : DANGER_FG;
  const summary = result.mistakeSummary ?? {
    conceptual: 0,
    calculation: 0,
    silly: 0,
    presentation: 0,
  };
  const lostSteps = result.annotatedSteps.filter((s) => s.status !== "correct");

  return (
    <div
      style={{
        maxWidth: 1500,
        margin: "0 auto",
        padding: isNarrow ? "20px 16px 56px" : "32px 32px 64px",
        fontFamily: FONT_SANS,
        minWidth: 0,
      }}
    >
      <PageHeader
        isNarrow={isNarrow}
        showBack
        onBack={resetToInput}
        eyebrow="Check & Improve · Graded result"
        title={`${resultCtx.topicName || resultCtx.subject} · ${
          resultCtx.question.length > 60
            ? resultCtx.question.slice(0, 57) + "…"
            : resultCtx.question
        } (${resultCtx.marks} marks)`}
        description={`Examiner-style grading from the live grader — marks${
          resultCtx.marksSource === "stated"
            ? ", subject & topic read from the question"
            : resultCtx.marksSource === "inferred"
              ? " estimated from the question, plus subject & topic"
              : ", subject & topic"
        } auto-detected. Mistakes categorised. Next action queued.`}
        actions={
          <>
            <button type="button" style={buttonOutline} onClick={resetToInput}>
              Grade another
            </button>
            <button type="button" style={buttonAccent} onClick={gotoPracticeForResult}>
              Practice this mistake type <ChevronRightGlyph />
            </button>
          </>
        }
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isNarrow ? "minmax(0, 1fr)" : "minmax(0, 7fr) minmax(0, 5fr)",
          gap: 24,
          minWidth: 0,
        }}
      >
        {/* LEFT — score + annotated steps + teacher note */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20, minWidth: 0 }}>
          <div style={{ ...cardStyle, padding: 24 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <div>
                <div style={sectionEyebrow}>Score</div>
                <div
                  style={{
                    fontFamily: FONT_DISPLAY,
                    fontSize: 36,
                    fontWeight: 700,
                    color: TEXT_FG,
                    lineHeight: 1.1,
                    marginTop: 6,
                  }}
                >
                  {marksAwarded}
                  <span style={{ fontSize: 18, color: TEXT_MUTED, fontWeight: 500 }}>
                    /{totalMarks}
                  </span>
                </div>
              </div>
              <div
                style={{
                  width: 76,
                  height: 76,
                  borderRadius: "50%",
                  border: `4px solid ${ringColor}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: FONT_DISPLAY,
                  fontWeight: 700,
                  fontSize: 18,
                  color: ringColor,
                }}
              >
                {pct}%
              </div>
            </div>
          </div>

          <div style={{ ...cardStyle, padding: 24 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 14,
                gap: 12,
              }}
            >
              <div style={sectionEyebrow}>Annotated steps</div>
              <span style={chipBase}>
                {result.annotatedSteps.length} step
                {result.annotatedSteps.length === 1 ? "" : "s"}
              </span>
            </div>
            {result.annotatedSteps.length === 0 ? (
              <p style={{ margin: 0, fontSize: 13, color: TEXT_MUTED, lineHeight: 1.55 }}>
                The grader did not return any annotated steps for this answer.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {result.annotatedSteps.map((step) => (
                  <AnnotatedStepRow key={step.stepNumber} step={step} />
                ))}
              </div>
            )}
          </div>

          {result.teacherNote && (
            <div style={{ ...cardStyle, padding: 24 }}>
              <div style={{ ...sectionEyebrow, marginBottom: 12 }}>Examiner note</div>
              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: TEXT_FG,
                  whiteSpace: "pre-wrap",
                }}
              >
                {result.teacherNote}
              </p>
            </div>
          )}
        </div>

        {/* RIGHT — mistake summary + save status + next actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20, minWidth: 0 }}>
          <div style={{ ...cardStyle, padding: 24 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 14,
                gap: 12,
              }}
            >
              <div style={sectionEyebrow}>Mistake summary</div>
              <span style={chipBase}>This answer</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {(Object.keys(MISTAKE_LABELS) as MistakeType[]).map((key) => {
                const meta = MISTAKE_LABELS[key];
                const count = summary[key] ?? 0;
                return (
                  <div
                    key={key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: 12,
                      borderRadius: 10,
                      background: MUTED_BG,
                    }}
                  >
                    <div
                      style={{
                        height: 10,
                        width: 10,
                        borderRadius: "50%",
                        background: meta.fg,
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: TEXT_FG,
                          lineHeight: 1.3,
                        }}
                      >
                        {meta.label}
                      </div>
                      <div style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 2 }}>
                        {count === 0
                          ? "No mistakes of this type"
                          : `${count} flagged on this answer`}
                      </div>
                    </div>
                    <span
                      style={{
                        ...chipBase,
                        background: count > 0 ? meta.bg : MUTED_BG,
                        color: count > 0 ? meta.fg : TEXT_MUTED,
                        border: `1px solid ${count > 0 ? meta.bg : BORDER}`,
                      }}
                    >
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
            <p style={{ margin: "12px 0 0", fontSize: 12, color: TEXT_MUTED, lineHeight: 1.5 }}>
              Counts come straight from the grader response — no synthesised
              trends or invented categories.
            </p>
          </div>

          <div
            style={{
              ...cardStyle,
              padding: 20,
              background:
                saveStatus === "save-failed"
                  ? DANGER_SOFT
                  : saveStatus === "saved"
                    ? SECONDARY_BG
                    : MUTED_BG,
              borderColor:
                saveStatus === "save-failed"
                  ? DANGER_SOFT
                  : saveStatus === "saved"
                    ? ACCENT_SOFT
                    : BORDER,
            }}
          >
            <div style={sectionEyebrow}>Mistake history</div>
            {saveStatus === "saved" && (
              <p style={{ margin: "10px 0 0", fontSize: 13, color: ACCENT_FG, lineHeight: 1.55 }}>
                ✓ Saved to your mistake history.
              </p>
            )}
            {saveStatus === "saving" && (
              <p style={{ margin: "10px 0 0", fontSize: 13, color: TEXT_MUTED, lineHeight: 1.55 }}>
                Saving to your mistake history…
              </p>
            )}
            {saveStatus === "save-failed" && (
              <p style={{ margin: "10px 0 0", fontSize: 13, color: DANGER_FG, lineHeight: 1.55 }}>
                Result shown, save unavailable. Your grading is fine — we just
                couldn't write to your mistake history this time.
              </p>
            )}
            {saveStatus === "no-user" && (
              <>
                <p
                  style={{
                    margin: "10px 0 0",
                    fontSize: 13,
                    color: TEXT_FG,
                    lineHeight: 1.55,
                  }}
                >
                  Sign in to save mistake history. This grading is shown for
                  this session only.
                </p>
                <div style={{ marginTop: 12 }}>
                  <button type="button" style={buttonOutline} onClick={gotoLogin}>
                    Sign in to save history <ChevronRightGlyph />
                  </button>
                </div>
              </>
            )}
            {saveStatus === "idle" && (
              <p style={{ margin: "10px 0 0", fontSize: 13, color: TEXT_MUTED, lineHeight: 1.55 }}>
                Preparing to update your mistake history…
              </p>
            )}
          </div>

          <div style={{ ...cardStyle, padding: 20 }}>
            <div style={sectionEyebrow}>Next actions</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
              <button
                type="button"
                onClick={gotoPracticeForResult}
                style={{
                  ...buttonOutline,
                  width: "100%",
                  justifyContent: "space-between",
                  height: 44,
                }}
              >
                <span>Practice this topic</span>
                <ChevronRightGlyph />
              </button>
              <button
                type="button"
                onClick={gotoWorksheetForResult}
                style={{
                  ...buttonOutline,
                  width: "100%",
                  justifyContent: "space-between",
                  height: 44,
                }}
              >
                <span>Generate a targeted worksheet</span>
                <ChevronRightGlyph />
              </button>
              <button
                type="button"
                onClick={gotoTopicHubForResult}
                style={{
                  ...buttonOutline,
                  width: "100%",
                  justifyContent: "space-between",
                  height: 44,
                }}
              >
                <span>
                  {resultCtx.topicSlug ? "Open Topic Hub" : "Open Exam Trends"}
                </span>
                <ChevronRightGlyph />
              </button>
              <button
                type="button"
                onClick={gotoExamTrends}
                style={{
                  ...buttonOutline,
                  width: "100%",
                  justifyContent: "space-between",
                  height: 44,
                }}
              >
                <span>See exam trends</span>
                <ChevronRightGlyph />
              </button>
              <button
                type="button"
                onClick={gotoMe}
                style={{
                  ...buttonOutline,
                  width: "100%",
                  justifyContent: "space-between",
                  height: 44,
                }}
              >
                <span>See full progress in Me</span>
                <ChevronRightGlyph />
              </button>
            </div>
            <p style={{ margin: "12px 0 0", fontSize: 12, color: TEXT_MUTED, lineHeight: 1.5 }}>
              All links route inside the production app and remember you came
              from Check &amp; Improve.
            </p>
          </div>

          {lostSteps.length > 0 && (
            <div style={{ ...cardStyle, padding: 20 }}>
              <div style={sectionEyebrow}>Where you lost marks</div>
              <ul style={{ margin: "10px 0 0", paddingLeft: 18, fontSize: 13, lineHeight: 1.6, color: TEXT_FG }}>
                {lostSteps.map((s) => (
                  <li key={s.stepNumber}>
                    <strong>Step {s.stepNumber}:</strong>{" "}
                    {s.teacherAnnotation || s.description || "Marks deducted"}
                    {s.marksDeducted > 0 && (
                      <span style={{ color: DANGER_FG }}> · −{s.marksDeducted}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DesktopCheckImprovePage;
