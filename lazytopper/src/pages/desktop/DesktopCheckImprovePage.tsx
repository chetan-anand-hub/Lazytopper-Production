import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ReturnTicketStrip, useReturnTicket } from "../../components/navigation/ReturnTicket";
import {
  checkSolutionImage,
  detectQuestion,
  gradeWorksheet,
  type CheckSolutionResponse,
  type CheckSolutionAnnotatedStep,
  type MistakeType,
  type DetectedQuestion,
  type WorksheetGradeResponse,
  type WorksheetQuestionGrade,
} from "../../ai/aiClient";
import { recordMistake } from "../../services/mistakeIntelligence";
import { recordAttempt, type DetectionOverrideLog } from "../../services/practiceInsights";
import { useAuth } from "../../context/AuthContext";
import { EquationInput, EquationRender } from "../../components/equation";
import { checkUploadFile, UPLOAD_LIMIT_SENTENCE } from "../../services/uploadLimits";
import QrAnswerHandoff from "../../components/qr/QrAnswerHandoff";
import MobileShell from "../../components/mobile/MobileShell";
import { useIsDesktop } from "../../hooks/useIsDesktop";
import { desktopTopicsBySubject } from "../../lib/desktop/topics";
import {
  buildConfirmedDetection,
  clampDetectedMarks,
  resolvePerQuestionGradeTopics,
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
import { exportGradedCheckImprovePdf } from "../../components/worksheet/worksheetPdfExport";
import {
  CheckImproveGradedPrintDoc,
  buildCiCoaching,
  type CiGradedQuestion,
  type CheckImproveGradedPrintDocProps,
} from "../../components/checkimprove/CheckImproveGradedPrintDoc";
// C&I PR-1 — the SessionSurface plumbing: durable code + session record + the 5th
// scorecard variant + the history panel. The detection/correction/MI paths above
// this seam are byte-unchanged; these imports only ADD persistence around them.
import {
  ensureCheckImproveSessionCode,
  getSessionRecordsFromCloud,
  getSessionPerQuestion,
  type SessionRecord,
  type SessionTopicSource,
} from "../../services/sessionRecords";
import {
  deriveTopicSource,
  persistCheckImproveSession,
  singleCheckToWorksheetResponse,
  toSessionSubject,
} from "../../services/checkImproveGradeService";
import ResultsScorecard from "../../components/results/ResultsScorecard";
import {
  checkImproveScorecardVariant,
  storedCheckImproveScorecardVariant,
} from "../../components/results/scorecardVariants";
import CheckImproveHistoryPanel from "../../components/checkimprove/CheckImproveHistoryPanel";

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
 *   - Answer-method tabs: Upload image (real `<input type="file">` +
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

/* ── CONVERGENCE (§2.1) — the fluid layout constants ─────────────────────────
   This surface renders at EVERY width from one component: there is no desktop /
   mobile twin any more, and no window-derived value drives layout. It reflows
   because the BOX runs out of room, never because something asked the window how
   wide it is — which is why it survives being rendered inside an 820px overlay
   panel, not just at 820px of window.

   CARD_BASIS is the whole mechanism. 340 is not arbitrary: the shell sidebar is
   260px (DesktopShell.tsx:203) and this page adds 64px of padding, so at a 1024px
   window the content box is 1024 − 260 − 64 = 700px. Two cards + a 16px gap must
   fit in 700 ⇒ basis ≤ 342. At 420 (the first draft) the cards needed a 1180px
   window and STACKED on every 1024/1152 laptop — the opposite of the intent.

   NOTE on clamp(): `vw` is window-relative, so type/padding scale to the window
   even inside an overlay panel. That is deliberate and harmless — it sizes TYPE,
   not structure. The LAYOUT (which card sits where, and when they wrap) is driven
   only by flex-basis against the real container. */
const CARD_BASIS = 340;
const CARD_GAP = 16;
const PAGE_PADDING = "clamp(20px, 3vw, 32px) clamp(16px, 3vw, 32px) 56px";

/* HEADER_TITLE_BASIS — the same mechanism as CARD_BASIS, one level up, fixing the
   same class of bug. The header row (title block | actions) had the title block on
   `flex: 1`, which is `flex: 1 1 0%` — a ZERO basis never demands width, so the row
   can never overflow and `flexWrap` is unreachable. The title just shrank to whatever
   was left after "Your papers · N ⌄" took its ~140px; at 360px that starved it to
   ~190px and the 30px display face wrapped to five lines.

   A real basis makes the wrap reachable. The row wraps when
     TITLE_BASIS + actions(~140) + gap(24) > content width.
   Content width per breakpoint (page padding is ~16px each side at 360, sidebar only
   at ≥1024): 360→~328 · 768→~722 · 820 overlay→~756 · 1024→~700 · 1440→~1116.
   Any basis in (154, 526] wraps at 360 (actions drop below, title gets the full row)
   AND stays one row at ≥768 including the 1024 desktop the owner verified. 320 sits
   mid-window with margin on both ends — desktop is provably UNCHANGED (484 ≤ 700). */
const HEADER_TITLE_BASIS = 320;
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

/* ──────────── multi-question (Check & Improve) helpers ──────────── */

// The device-local CI sequence (`lt:ci-multi-seq` + nextCiMultiSequence +
// buildCiSessionCode) is RETIRED (owner decision 2026-07-13, no shadow path): it
// was the cross-device collision bug — the same paper graded on phone + laptop
// minted the same #NN. The code is now minted ONCE per session at grade time via
// `ensureCheckImproveSessionCode` (sessionRecords.ts — counts this student's
// existing check-improve records under the same subject+topic-token prefix,
// cross-device) and frozen in `ciCode`, exactly like the CT/FM surfaces.

// Adapt one legible per-question grade into the CheckSolutionResponse shape the
// MI front door consumes — the SAME shape single-question Check & Improve feeds
// it, so routing + dedup behave identically (mirror of worksheetGradeService).
function multiQuestionToCsr(g: WorksheetQuestionGrade): CheckSolutionResponse {
  return {
    ok: true,
    totalMarks: Number(g.totalMarks) || 0,
    marksAwarded: Number(g.marksAwarded) || 0,
    percentage: Number(g.percentage) || 0,
    annotatedSteps: g.annotatedSteps ?? [],
    mistakeSummary: g.mistakeSummary ?? { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
    teacherNote: g.teacherNote ?? "",
  };
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
  description?: string;
  showBack?: boolean;
  onBack?: () => void;
  actions?: React.ReactNode;
}> = ({ eyebrow, title, description, showBack, onBack, actions }) => (
  // Fluid: the actions block wraps under the title when the ROW runs out of room.
  // `flexWrap` measures this box, not the window — so it reflows identically inside
  // an 820px overlay panel and at 820px of window. (Convergence rule, §2.1.)
  // The title block carries HEADER_TITLE_BASIS, NOT `flex: 1`: a zero-basis item
  // never demands width, so the wrap could never actually fire (see the constant).
  <div
    style={{
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 24,
      marginBottom: 24,
      flexWrap: "wrap",
    }}
  >
    <div style={{ minWidth: 0, flex: `1 1 ${HEADER_TITLE_BASIS}px` }}>
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
          // Floor 22, TWO lines at 360px — owner ruling, and the measurement is why.
          // Fitting ONE line at 360px needs ~16px (headless Chromium, Fraunces 600: the
          // title is 270px at 16px; the real content is 288px — 360 − MobileShell's
          // 20px×2 − this page's 16px×2, the 40px the first estimate missed). But 16px
          // EQUALS MobileShell's own 16px chrome title directly above it, so the page H1
          // stops reading as a title and becomes a label — a display serif rendered at
          // body size. The owner's complaint was "extending in a paragraph form" (five
          // lines); two lines at 22px cures that, and Fix A + the deleted lede reclaim
          // the fold regardless. MAX stays 30 (hit at ≥500px viewport) so 768 / 820 /
          // 1024 / 1440 are pinned at 30 and desktop is byte-for-byte UNCHANGED.
          fontSize: "clamp(22px, 6vw, 30px)",
          fontWeight: 600,
          lineHeight: 1.2,
          color: TEXT_FG,
        }}
      >
        {title}
      </h1>
      {description && (
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
      )}
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

const AnnotatedStepRow: React.FC<{ step: CheckSolutionAnnotatedStep; objective?: boolean }> = ({ step, objective }) => {
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
        {/* Objective question → per-step marks are zeroed by design; suppress the
            misleading "+0" chip, keep the status + annotation. */}
        {!objective && (
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
        )}
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
          <EquationRender text={step.description} />
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
          <EquationRender text={step.studentWork} />
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
          ↳ <EquationRender text={step.teacherAnnotation} />
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
          ✓ <EquationRender text={step.correctedWorking} />
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

/** INVESTIGATION PROTOTYPE (TutorOverlay v1.2, Option A). Present ONLY when the page is
 *  mounted inside the tutor overlay; ABSENT on every direct /check-improve route visit,
 *  where the page is byte-identical to today. See report §2 + §5.1. */
export interface CheckImproveOverlayProps {
  /** Honest MVP: usually undefined — the tutor holds no clean question text at offer time
   *  (report §3). The seam exists (via #472's `question` state) for a future prompt lane
   *  that carries the question; seeding it here is byte-identical when undefined. */
  seedQuestion?: string;
  /** Cosmetic breadcrumb only (mirrors the existing ?topic= param). C&I derives the real
   *  topic from the question; this is never a functional topic input. */
  seedTopicSlug?: string;
  /** Overlay-mode return: called INSTEAD of navigate() on the two return-home paths. */
  onClose: (outcome?: CheckImproveOverlayOutcome) => void;
}
export interface CheckImproveOverlayOutcome {
  /** The code C&I minted for the grade just completed — handed back so the tutor resolves
   *  the round-trip without a cloud poll (report §6.4). */
  ciCode?: string | null;
}

const DesktopCheckImprovePage: React.FC<{ overlay?: CheckImproveOverlayProps }> = ({ overlay }) => {
  const navigate = useNavigate();
  // The return ticket (Section C). Null on a direct visit — this page then renders
  // exactly as it always has. ROUTE_CTX below is the OUTBOUND context this page hands
  // to the surfaces it links to; it is not, and was never, a way back INTO here.
  const returnTicket = useReturnTicket();
  const returnTicketInput = useMemo(
    () =>
      // OVERLAY MODE: the way back is closing the panel, not navigating. Byte-identical
      // when `overlay` is undefined — the original expression is the else-branch verbatim.
      // (The ciCode hand-back for the round-trip's poll-free path is wired at the scorecard
      //  close, where ciCode is in scope — NOT here, which renders before ciCode exists.)
      overlay
        ? { label: "Back to your tutor", onReturn: () => overlay.onClose() }
        : returnTicket
          ? { label: returnTicket.label, onReturn: () => navigate(returnTicket.path) }
          : undefined,
    [overlay, returnTicket, navigate],
  );
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── DEVICE CAPABILITY — not layout (§2.1) ────────────────────────
  // This replaced a `matchMedia("(max-width: 960px)")` listener that drove an
  // `isNarrow` flag through 13 sites, including BOTH layout grids. That flag asked
  // the WINDOW, so the page rendered a two-column grid inside an 820px overlay
  // panel on a 1440px screen — it could not see the box it was actually in. Layout
  // is now fluid (flex-wrap + clamp) and measures the container.
  //
  // What survives here is the ONLY question that is genuinely about the device and
  // not about the box: does this thing have a camera worth offering, and who owns
  // the chrome? A phone gets Camera/Files and MobileShell; a desktop gets the QR
  // affordance and DesktopShell. Both are true regardless of how wide the render
  // box happens to be — which is exactly what makes them legitimate.
  const isDesktop = useIsDesktop();

  // CHROME OWNERSHIP — the same convention ExamTrendsRanked established when it
  // converged (pages/ExamTrendsRanked.tsx:1274-1282), and the reason App.tsx needs
  // no chrome change: "/check-improve" is ALREADY in `isMobileSelfChromedRoute`
  // (App.tsx:217), which suppresses the old global brand bar for routes whose page
  // owns its own header. The retired twin owned that header; now this page does.
  //
  // Desktop: bare — DesktopShell already wraps this route (isDesktopShellRoute:536).
  // Mobile: this page carries the shared MobileShell header (the app-wide account
  // avatar-dropdown), REUSED and never forked. Back is left to the in-page
  // PageHeader, which already has it, so a student never meets two back controls.
  const withChrome = (body: React.ReactNode, subtitle: string) =>
    isDesktop ? (
      <>{body}</>
    ) : (
      <MobileShell title="Check & Improve" subtitle={subtitle} showNav>
        {body}
      </MobileShell>
    );

  // ── input form state ─────────────────────────────────────────────
  // Subject / topic / marks are NO LONGER student-picked — the grader determines
  // them from the question (Claim 2). The student supplies only the question + the
  // answer; the detected values come back on the graded result.
  // Question input — type/paste OR upload a photo of the QUESTION (distinct from
  // the answer photo). The photo lets the grader read the printed "[3]" directly.
  // BYTE-IDENTICAL DEFAULT-OFF (report §5.1 guard #1): `overlay?.seedQuestion` is undefined
  // on every direct visit ⇒ `?? ""` ⇒ exactly `useState<string>("")`. Same proof shape that
  // protected autoGrow default-off and the document/photo QR copy.
  const [question, setQuestion] = useState<string>(overlay?.seedQuestion ?? "");
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

  // Picker refusals — DELIBERATELY separate from `errorMessage` (the grade-failure
  // channel). `errorMessage`'s surface hard-codes "No score has been generated. Press
  // Retry to call the grader again." A file refused HERE never reached the grader, so
  // that sub-line would be a lie and "Retry" would re-run a call that never happened.
  // Two different failures, two different truths, two different states.
  const [answerFileError, setAnswerFileError] = useState<string | null>(null);
  const [questionFileError, setQuestionFileError] = useState<string | null>(null);
  const [detected, setDetected] = useState<ConfirmedDetection | null>(null);
  const [confirmed, setConfirmed] = useState<ConfirmedDetection | null>(null);
  const [editing, setEditing] = useState<boolean>(false);

  // ── grading + result state ───────────────────────────────────────
  const [status, setStatus] = useState<GradeStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<CheckSolutionResponse | null>(null);
  const [resultCtx, setResultCtx] = useState<GradedContext | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  // ── multi-question detect (additive; single-question path untouched) ──
  // Every question read from the upload. `length > 1` switches the UI to the
  // multi-question grade path (grade ALL via the worksheet structured grader).
  const [detectedQuestions, setDetectedQuestions] = useState<DetectedQuestion[] | null>(null);
  // The whole-paper grade result + its session code (CI-{S}-{TOPIC}-{NN}).
  const [wsResult, setWsResult] = useState<WorksheetGradeResponse | null>(null);
  const [ciCode, setCiCode] = useState<string | null>(null);

  // ── C&I PR-1: SessionSurface plumbing state (additive — around the flows above) ──
  // The durable nomenclature's friendly name (minted with ciCode, frozen together).
  const [ciName, setCiName] = useState<string | null>(null);
  // Topic provenance, stamped at grade time from the detect-then-confirm flow.
  const [ciTopicSource, setCiTopicSource] = useState<SessionTopicSource | null>(null);
  // True once the student touches the topic/subject correction — the ONLY signal
  // that upgrades "inferred" to "confirmed" (provenance tag, not a new picker).
  const [topicTouched, setTopicTouched] = useState(false);
  // Whether THIS session's record was persisted (drives the honest "saved" copy).
  const [ciSaved, setCiSaved] = useState(false);
  // The 5th <ResultsScorecard> variant, opened on every completed grade.
  const [scorecardOpen, setScorecardOpen] = useState(false);
  // "Your checked papers" — durable cross-device records + the overlay panel +
  // the read-only stored-scorecard reopen.
  const [ciRecords, setCiRecords] = useState<SessionRecord[]>([]);
  const [ciRecordsLoading, setCiRecordsLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  // "How it works" open state, controlled so the chevron can reflect it (this file is
  // inline-styles only — there is no CSS `details[open]` selector to lean on). `null`
  // = untouched, so it falls back to the first-run default (open when no papers yet);
  // once the student toggles, their choice sticks.
  const [howItWorksOpen, setHowItWorksOpen] = useState<boolean | null>(null);
  const [reopen, setReopen] = useState<SessionRecord | null>(null);
  // ABSORBED FROM THE RETIRED TWIN — and the reason matters. The two twins had
  // DRIFTED here, and the mobile one was AHEAD: it lazily loaded a re-opened paper's
  // per-question payload so the by-topic lens could render on re-open (C&I PR-2
  // item A/B), while this file never fetched it and silently showed no lens.
  // Converging on the desktop file wholesale would therefore have REGRESSED a
  // student on a phone. The richer path wins — honest-null until the payload
  // arrives, and `storedCheckImproveScorecardVariant` omits the lens when it is
  // absent rather than inventing one.
  const [reopenResponse, setReopenResponse] = useState<WorksheetGradeResponse | null>(null);

  const loadCiRecords = useCallback(async () => {
    try {
      const all = await getSessionRecordsFromCloud(user?.uid);
      setCiRecords(all.filter((r) => r.surface === "check-improve"));
    } catch {
      /* honest-degrade — the store already fell back to the local mirror */
    } finally {
      setCiRecordsLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    setCiRecordsLoading(true);
    void loadCiRecords();
  }, [loadCiRecords]);

  // ── PART B: graded-solution download + read-on-screen (both C&I paths) ──
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [readProps, setReadProps] = useState<CheckImproveGradedPrintDocProps | null>(null);
  // ── PART A: which multi-question cards are expanded to show per-step working ──
  const [expandedQ, setExpandedQ] = useState<Record<number, boolean>>({});

  const hasQuestion =
    questionTab === "type" ? question.trim().length > 0 : Boolean(qImageBase64);
  // Two or more questions were read from the upload → grade the whole paper.
  const isMultiQuestion = Boolean(detectedQuestions && detectedQuestions.length > 1);
  const hasAnswer =
    tab === "upload" ? Boolean(imageBase64) : textAnswer.trim().length >= 10;
  // Grade only after the question has been read + confirmed AND an answer exists.
  // Multi-question grading REQUIRES an uploaded answer sheet (image or PDF) — the
  // whole-paper grader reads the answers from that one upload.
  const canGrade =
    Boolean(confirmed) &&
    (isMultiQuestion ? Boolean(imageBase64) : hasAnswer) &&
    status !== "loading";

  function handleFileChosen(file: File) {
    // Refuse what the grader would refuse anyway, HERE, while the student can still
    // act on it. Before this guard there was NO ceiling at all on this input: a 10 MB
    // PDF base64'd fine, travelled, and died at the grader ("Request body too large")
    // after the student believed they were done.
    const check = checkUploadFile(file, "answers");
    if (!check.ok) {
      setAnswerFileError(check.message);
      return;
    }
    setAnswerFileError(null);

    const reader = new FileReader();
    reader.onload = () => {
      const data = reader.result as string;
      const [, b64] = data.split(",");
      setImageBase64(b64 || null);
      setImageMime(check.mimeType);
      setImageName(file.name);
    };
    reader.onerror = () => {
      setImageBase64(null);
      setImageName("");
      setAnswerFileError("We couldn't read that file — please try another.");
    };
    reader.readAsDataURL(file);
  }

  function clearImage() {
    setImageBase64(null);
    setImageName("");
    setAnswerFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // MIRROR 4 — paste, on BOTH cards. A desktop student who screenshotted their question
  // (Win+Shift+S) or answer can drop it straight in with Ctrl/Cmd+V, no save-then-upload
  // detour. It reuses the EXISTING file handlers, so checkUploadFile refuses a bad
  // type/size pasted file EXACTLY as a picked one — the guard is untouched. Text paste is
  // deliberately left alone: with no file on the clipboard we return WITHOUT
  // preventDefault, so pasting text into an EquationInput textarea behaves normally. Bound
  // at the CARD level: the `paste` event bubbles from whatever is focused inside, and the
  // focused card disambiguates which side the file belongs to — the one genuine upside of
  // two cards sharing one screen. Switches to the upload tab so the pasted file is visible
  // and gradeable (on the type tab, hasQuestion/hasAnswer read the textarea, not the file).
  function handleCardPaste(e: React.ClipboardEvent, target: "question" | "answer") {
    const file = e.clipboardData?.files?.[0];
    if (!file) return; // text / non-file paste — let the browser handle it normally
    e.preventDefault();
    if (target === "question") {
      setQuestionTab("upload");
      handleQuestionFile(file);
    } else {
      setTab("upload");
      handleFileChosen(file);
    }
  }

  // Question photo → base64. Reading a new question invalidates any prior detection.
  function handleQuestionFile(file: File) {
    // The question photo is as capable of killing a submission as the answer file —
    // it rides the SAME request to the SAME body cap — so it gets the same guard.
    // "question" (not "answers"): the copy must name what THIS input actually wants.
    const check = checkUploadFile(file, "question");
    if (!check.ok) {
      setQuestionFileError(check.message);
      return;
    }
    setQuestionFileError(null);

    const reader = new FileReader();
    reader.onload = () => {
      const data = reader.result as string;
      const [, b64] = data.split(",");
      setQImageBase64(b64 || null);
      setQImageMime(check.mimeType);
      setQImageName(file.name);
      clearDetection();
    };
    reader.onerror = () => {
      setQImageBase64(null);
      setQImageName("");
      setQuestionFileError("We couldn't read that file — please try another.");
    };
    reader.readAsDataURL(file);
  }

  function clearDetection() {
    setDetected(null);
    setConfirmed(null);
    setEditing(false);
    setDetectError(null);
    // A NEW question read starts a fresh session — drop the prior multi-question
    // detection, its grade, and its code (the next grade gets a new CI sequence).
    setDetectedQuestions(null);
    setWsResult(null);
    setCiCode(null);
    // C&I PR-1: the fresh session also resets its nomenclature + provenance state.
    setCiName(null);
    setCiTopicSource(null);
    setTopicTouched(false);
    setCiSaved(false);
    setScorecardOpen(false);
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
      // A fresh read = a fresh, untouched detection (provenance starts "inferred").
      setTopicTouched(false);
      // Multi-question: keep every detected question. A single-item (or absent)
      // array leaves the existing single-question flow exactly as before.
      setDetectedQuestions(d.questions && d.questions.length > 0 ? d.questions : null);
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
    setTopicTouched(true); // provenance tag: the student engaged the topic (C&I PR-1)
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
    setTopicTouched(true); // provenance tag: confirmed/corrected by the student (C&I PR-1)
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
    // Drop the multi-question grade but KEEP ciCode/detectedQuestions so a re-grade
    // of the SAME session reuses the same code + stable MI ids (dedup). A brand-new
    // question (clearDetection) is what resets the code.
    setWsResult(null);
    // Clear the graded-solution download/read state for the next grade.
    setReadProps(null);
    setDownloadError(null);
    setExpandedQ({});
    // C&I PR-1: never carry an open scorecard back to the input view. The session
    // nomenclature/provenance state stays (same-session re-grade reuses the code).
    setScorecardOpen(false);
  }

  // ── PART B helpers: build the branded graded-solution props (single OR multi),
  // then download it as a PDF or reveal it on screen. BOTH paths feed the SAME
  // <CheckImproveGradedPrintDoc> and the SAME worksheet PDF-export core, so the
  // two stay consistent (a bridge toward the Universal <ResultsScorecard>). The
  // grade shown is a snapshot of what is already on screen — never a re-grade.
  function buildSinglePrintProps(): CheckImproveGradedPrintDocProps | null {
    if (!result || !resultCtx) return null;
    // The durable code is minted at grade time now (C&I PR-1) — by the time this
    // sheet is built, ciCode is always frozen; "CI" is the same defensive fallback
    // the multi sheet uses.
    const code = ciCode ?? "CI";
    const ms = result.mistakeSummary ?? { conceptual: 0, calculation: 0, silly: 0, presentation: 0 };
    const knowledge = ms.conceptual + ms.calculation;
    const careless = ms.silly + ms.presentation;
    return {
      code,
      name: `${resultCtx.topicName || resultCtx.subject} · Check & Improve`,
      metaLine: `Check & Improve · ${resultCtx.marks} mark${resultCtx.marks === 1 ? "" : "s"}`,
      questions: [
        {
          questionText: resultCtx.question,
          totalMarks: result.totalMarks,
          marksAwarded: result.marksAwarded,
          couldNotRead: false,
          annotatedSteps: result.annotatedSteps,
          mistakeSummary: result.mistakeSummary,
          teacherNote: result.teacherNote,
          objective: result.objective,
        },
      ],
      gradedMarksAwarded: result.marksAwarded,
      gradedMarksTotal: result.totalMarks,
      pendingCount: 0,
      coaching: buildCiCoaching({
        gradedMarksAwarded: result.marksAwarded,
        gradedMarksTotal: result.totalMarks,
        knowledge,
        careless,
        pendingCount: 0,
      }),
    };
  }

  function buildMultiPrintProps(): CheckImproveGradedPrintDocProps | null {
    if (!wsResult) return null;
    const ws = wsResult;
    const code = ciCode ?? "CI";
    const agg = ws.results.reduce(
      (a, g) => {
        if (g.couldNotRead || !g.mistakeSummary) return a;
        a.k += (g.mistakeSummary.conceptual || 0) + (g.mistakeSummary.calculation || 0);
        a.c += (g.mistakeSummary.silly || 0) + (g.mistakeSummary.presentation || 0);
        return a;
      },
      { k: 0, c: 0 },
    );
    const questions: CiGradedQuestion[] = ws.results.map((g) => ({
      qNumber: g.qNumber,
      questionText: detectedQuestions?.find((q) => q.questionNumber === g.qNumber)?.questionText,
      totalMarks: g.totalMarks,
      marksAwarded: g.marksAwarded,
      couldNotRead: g.couldNotRead,
      annotatedSteps: g.annotatedSteps,
      mistakeSummary: g.mistakeSummary,
      teacherNote: g.teacherNote,
      objective: g.objective,
    }));
    return {
      code,
      name: `${confirmed?.topicName || confirmed?.subject || "Check & Improve"} · Check & Improve paper`,
      metaLine: `Check & Improve · ${ws.totalQuestions} question${ws.totalQuestions === 1 ? "" : "s"} · ${ws.worksheetTotalMarks} marks`,
      questions,
      gradedMarksAwarded: ws.gradedMarksAwarded,
      gradedMarksTotal: ws.gradedMarksTotal,
      pendingCount: ws.pendingCount,
      coaching: buildCiCoaching({
        gradedMarksAwarded: ws.gradedMarksAwarded,
        gradedMarksTotal: ws.gradedMarksTotal,
        knowledge: agg.k,
        careless: agg.c,
        pendingCount: ws.pendingCount,
      }),
    };
  }

  // Download the branded graded-solution PDF. Never blocks the shown grade: a
  // failure only surfaces a small inline notice.
  async function downloadGraded(props: CheckImproveGradedPrintDocProps | null) {
    if (!props) return;
    setDownloadError(null);
    setDownloading(true);
    try {
      await exportGradedCheckImprovePdf(props);
    } catch {
      setDownloadError("Couldn't build the PDF — please try again.");
    } finally {
      setDownloading(false);
    }
  }

  // Toggle the on-screen "Read" view of the same branded graded solution. `build`
  // is invoked OUTSIDE the state updater (it may setCiCode) so the updater stays
  // pure and StrictMode's double-invoke can't run it twice.
  function toggleRead(build: () => CheckImproveGradedPrintDocProps | null) {
    if (readProps) {
      setReadProps(null);
      return;
    }
    setReadProps(build());
  }

  async function persistMistakeLog(
    ctx: GradedContext,
    graded: CheckSolutionResponse,
  ) {
    setSaveStatus("saving");
    // Recording is DECOUPLED from the shown grade: the grade is already on screen
    // (setResult ran before this fire-and-forget call), so a persistence failure must
    // only downgrade the save status — never surface a grading error, and never leave
    // the status stuck on "saving" via an unhandled rejection.
    try {
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
    } catch (e) {
      console.warn("[check-improve] MI recording failed (grade preserved):", e);
      setSaveStatus("save-failed");
    }
  }

  // Multi-question grade: grade the WHOLE detected paper in one structured call
  // (the surface-agnostic worksheet grader), then fan each legible result through
  // Mistake Intelligence exactly as the worksheet grade loop does.
  async function gradeMultiQuestion() {
    if (!confirmed || !detectedQuestions || !imageBase64) return;
    setErrorMessage(null);
    setStatus("loading");
    setSaveStatus("idle");

    // One code per session; reuse it if this session was already graded once so a
    // re-grade reuses the same stable MI ids (dedup) instead of double-counting.
    // Minted DURABLY (cross-device record count) — the retired device-local
    // localStorage sequence collided across devices (C&I PR-1).
    const sessionSubject = toSessionSubject(confirmed.subject);
    let sessionCode = ciCode;
    let sessionTitle = ciName;
    if (!sessionCode) {
      const nomen = await ensureCheckImproveSessionCode(
        sessionSubject,
        confirmed.topicSlug,
        confirmed.topicName,
        user,
      );
      sessionCode = nomen.code;
      sessionTitle = nomen.name;
      setCiCode(nomen.code);
      setCiName(nomen.name);
    }

    try {
      const response = await gradeWorksheet({
        worksheetId: `ci:${sessionCode}`,
        subject: confirmed.subject,
        questions: detectedQuestions.map((q) => ({
          qNumber: q.questionNumber,
          marks: q.marks,
          topic: confirmed.topicName || undefined,
          topicLabel: confirmed.topicName || undefined,
          questionText: q.questionText,
          // Keyless objective flag from the detect step — the grader clamps a ≤1-mark
          // objective question to 0/full off the model's binary verdict (no key here).
          objective: q.objective === true,
        })),
        imageBase64,
        imageMimeType: imageMime,
      });
      if (!response || response.ok === false) {
        setErrorMessage("Grading unavailable — please try a clearer scan, or try again.");
        setStatus("error");
        return;
      }

      // C&I PR-2 (item A) — resolve a per-QUESTION topic by re-running the EXISTING
      // /detect-question read once per question (route A2 — no grader edit), then attach
      // it to each graded result. Unresolved stays empty (honest, never guessed). This
      // enriches the response the record + payload + scorecard all consume, lighting up
      // the by-topic lens + counted "N topics" chip for a mixed paper. Best-effort: a
      // detect miss leaves that question's topic empty and NEVER blocks the shown grade.
      try {
        const perQTopics = await resolvePerQuestionGradeTopics(
          detectedQuestions.map((q) => ({
            questionNumber: q.questionNumber,
            questionText: q.questionText,
          })),
          CANONICAL_TOPIC_VOCAB,
        );
        const topicByQ = new Map(perQTopics.map((t) => [t.qNumber, t]));
        for (const r of response.results) {
          const t = topicByQ.get(r.qNumber);
          if (t && t.topicSlug) {
            r.topicSlug = t.topicSlug;
            r.topicLabel = t.topicName;
          }
        }
      } catch (e) {
        console.warn("[check-improve] per-question topic resolution failed (grade preserved):", e);
      }

      setWsResult(response);
      setStatus("ready");
      setSaveStatus("saving");

      // C&I PR-1 — the session record (idempotent by id = the frozen code): every
      // graded session persists; a session where NOTHING was read writes no record
      // (the service gates on gradedCount). Provenance is derived from the EXISTING
      // detect-then-confirm flow; a MIX session writes topicKeys [] — never a
      // majority-guessed topic. Decoupled from the grade AND from MI below.
      const topicSource = deriveTopicSource(confirmed.topicSlug, topicTouched);
      setCiTopicSource(topicSource);
      const persistOutcome = persistCheckImproveSession({
        user,
        code: sessionCode,
        title: sessionTitle ?? `Check & Improve · ${sessionCode}`,
        subject: sessionSubject,
        topicSlug: confirmed.topicSlug,
        topicSource,
        response,
      });
      setCiSaved(persistOutcome === "recorded");
      if (persistOutcome === "recorded") void loadCiRecords();
      setScorecardOpen(true);

      // MI recording is DECOUPLED from the shown grade: a persistence failure must
      // NEVER wipe the graded result. The recording work runs in its OWN try/catch,
      // so a thrown recordMistake only downgrades the save status (grade preserved)
      // and never reaches the outer catch (reserved for genuine grade-call failures).
      try {
        // MI parity with the worksheet loop: every LEGIBLE per-question grade feeds
        // the SINGLE front door (recordMistake) + its score twin (recordAttempt) on a
        // stable, session-scoped id. couldNotRead (pending) is skipped — never a 0,
        // never a fabricated mistake.
        let anyRecorded = false;
        for (const g of response.results) {
          if (g.couldNotRead) continue;
          const csr = multiQuestionToCsr(g);
          const questionId = `ci:${sessionCode}:q${g.qNumber}`;
          const qText =
            detectedQuestions.find((q) => q.questionNumber === g.qNumber)?.questionText ||
            `${sessionCode} · Q${g.qNumber}`;
          // eslint-disable-next-line no-await-in-loop
          const rec = await recordMistake(user, csr, {
            subject: confirmed.subject,
            topic: confirmed.topicName,
            topicKey: confirmed.topicSlug,
            question: qText,
            questionId,
          });
          recordAttempt(user, {
            subject: confirmed.subject,
            topic: confirmed.topicName,
            topicKey: confirmed.topicSlug,
            question: qText,
            questionId,
            marksScored: csr.marksAwarded,
            marksAvailable: csr.totalMarks,
            mode: "graded",
          });
          if (rec.outcome === "logged" || rec.outcome === "duplicate" || rec.outcome === "skipped-clean") {
            anyRecorded = true;
          }
        }
        setSaveStatus(anyRecorded ? "saved" : "no-user");
      } catch (e) {
        console.warn("[check-improve] MI recording failed (grade preserved):", e);
        setSaveStatus("save-failed");
      }
    } catch {
      setErrorMessage("Grading unavailable — please try again.");
      setStatus("error");
    }
  }

  async function handleGrade() {
    if (!canGrade || !confirmed) return;
    // Multi-question paper → grade the whole set via the structured grader.
    if (isMultiQuestion) {
      void gradeMultiQuestion();
      return;
    }
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
        // Keyless objective flag from the detect step — the grader clamps a ≤1-mark
        // objective question to 0/full off the model's binary verdict (never a
        // fraction). Omitted (non-objective) → grading is byte-identical to before.
        ...(detectedQuestions?.[0]?.objective === true ? { objective: true } : {}),
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

      // C&I PR-1 — mint the durable code at GRADE time (owner decision 2026-07-13:
      // the lazy export-time mint is retired — every graded session gets a record,
      // so singles no longer vanish on close). A totally unreadable answer returns
      // ok:false above and never reaches here — no grade, no record.
      const sessionSubject = toSessionSubject(confirmed.subject);
      let sessionCode = ciCode;
      let sessionTitle = ciName;
      if (!sessionCode) {
        const nomen = await ensureCheckImproveSessionCode(
          sessionSubject,
          confirmed.topicSlug,
          confirmed.topicName,
          user,
        );
        sessionCode = nomen.code;
        sessionTitle = nomen.name;
        setCiCode(nomen.code);
        setCiName(nomen.name);
      }

      setResult(graded);
      setResultCtx(ctx);
      setStatus("ready");
      void persistMistakeLog(ctx, graded);

      // The session record — the single grade adapted into the same unified
      // one-question response shape the record store + stored scorecard consume.
      const topicSource = deriveTopicSource(confirmed.topicSlug, topicTouched);
      setCiTopicSource(topicSource);
      const persistOutcome = persistCheckImproveSession({
        user,
        code: sessionCode,
        title: sessionTitle ?? `Check & Improve · ${sessionCode}`,
        subject: sessionSubject,
        topicSlug: confirmed.topicSlug,
        topicSource,
        response: singleCheckToWorksheetResponse(graded),
      });
      setCiSaved(persistOutcome === "recorded");
      if (persistOutcome === "recorded") void loadCiRecords();
      setScorecardOpen(true);
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
  // C&I PR-1: the scorecard's "Practise {topic}" deep-link for the multi-question
  // path (no resultCtx there) — the same worksheet-builder link the single path's
  // gotoWorksheetForResult produces. Only offered when a single topic resolved.
  function gotoWorksheetForTopic(subject: DesktopSubject, topicSlug: string) {
    navigate(
      buildDesktopWorksheetPath({
        scope: "topic",
        subject,
        topic: topicSlug,
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

  // Re-open a stored checked paper read-only; lazily load its per-question payload so
  // the by-topic lens can render on re-open (C&I PR-2 item A/B) — honest-null until it
  // arrives, and honestly ABSENT if the fetch fails. Absorbed verbatim in behaviour
  // from the retired mobile twin, which was ahead of this file here.
  async function openReopen(r: SessionRecord) {
    setPanelOpen(false);
    setReopen(r);
    setReopenResponse(null);
    try {
      const payload = await getSessionPerQuestion(user?.uid, r.perQuestionRef);
      setReopenResponse(payload?.response ?? null);
    } catch {
      setReopenResponse(null);
    }
  }

  /* ────────────────── INPUT VIEW ────────────────── */

  if (status !== "ready" || (!wsResult && (!result || !resultCtx))) {
    return withChrome(
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: PAGE_PADDING,
          fontFamily: FONT_SANS,
          minWidth: 0,
        }}
      >
        {/* The return ticket's contextual strip (Section C) — a quiet line, never a
            modal, never blocking. Renders nothing on a direct visit. */}
        <ReturnTicketStrip ticket={returnTicket} onNavigate={(p) => navigate(p)} />
        {/* No lede here — deleted at both widths (owner-decided). Every clause it
            carried already ships better elsewhere: "How it works" step 3 says the same
            with the D4 noun ("image", not "photo"), step 4 names annotated steps, and
            "We never invent a score" sits under the Grade CTA where the decision to
            spend effort happens. Dropping this "photo" plus the QR-delivery label
            below (the two remaining student-visible "photo"s) completes D4. */}
        <PageHeader
          eyebrow="Check & Improve"
          title="Grade your answer, examiner-style"
          actions={
            <button type="button" style={buttonOutline} onClick={() => setPanelOpen(true)}>
              Your papers · {ciRecordsLoading ? "…" : ciRecords.length} ⌄
            </button>
          }
        />

        {/* C&I PR-1 — "Your checked papers": the overlay history panel (spec §6
            volume rule) + the read-only stored-scorecard reopen. Fixed-inset
            overlays — DOM placement here is presentation-neutral. */}
        {panelOpen && (
          <CheckImproveHistoryPanel
            records={ciRecords}
            loading={ciRecordsLoading}
            defaultSubject={ciRecords[0]?.subject ?? "maths"}
            onOpen={(r) => void openReopen(r)}
            onClose={() => setPanelOpen(false)}
          />
        )}
        {reopen && (
          <ResultsScorecard
            variant={storedCheckImproveScorecardVariant(reopen, {
              gradedDateLabel: new Date(reopen.gradedAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              }),
              onDone: () => {
                setReopen(null);
                setReopenResponse(null);
              },
              response: reopenResponse,
            })}
            onClose={() => {
              setReopen(null);
              setReopenResponse(null);
            }}
          />
        )}

        {/* ── HOW IT WORKS — collapsible (§2.2). Permanent rail space was being
            spent on a one-time need; it now opens on demand and defaults open only
            for a student who has never checked a paper. The anti-fabrication
            promise that used to live in this card has MOVED to the grade bar, where
            the decision to spend effort actually happens (§2.2, F5).

            Fix D (2026-07-18): it was white-on-near-white AND `listStyle:"none"`
            stripped the disclosure triangle without replacing it — invisible, and it
            didn't even look expandable, worst of all for the RETURNING student who
            sees it collapsed. Now it wears the file's own informational tint
            (SECONDARY_BG / ACCENT_SOFT / ACCENT_FG — the same pairing the deleted
            Mistake-history card used) and carries the existing ChevronRightGlyph,
            rotated 90° when open. No new token, no native triangle: the accent green
            is the CTA weight, so an explainer gets the TINT, never the full accent. */}
        <details
          open={howItWorksOpen ?? ciRecords.length === 0}
          onToggle={(e) => setHowItWorksOpen(e.currentTarget.open)}
          style={{
            ...cardStyle,
            background: SECONDARY_BG,
            borderColor: ACCENT_SOFT,
            padding: "12px 20px",
            marginBottom: 16,
            minWidth: 0,
          }}
        >
          <summary
            style={{
              ...sectionEyebrow,
              color: ACCENT_FG,
              cursor: "pointer",
              listStyle: "none",
              padding: "6px 0",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            How it works
            <span
              aria-hidden="true"
              style={{
                display: "inline-flex",
                color: ACCENT_FG,
                transition: "transform 0.15s ease",
                transform: (howItWorksOpen ?? ciRecords.length === 0) ? "rotate(90deg)" : "rotate(0deg)",
              }}
            >
              <ChevronRightGlyph size={15} />
            </span>
          </summary>
          <ol
            style={{
              margin: "8px 0 12px",
              paddingLeft: 18,
              fontSize: 13,
              lineHeight: 1.65,
              color: TEXT_FG,
            }}
          >
            <li>Add the question (type, paste, or an image) and tap “Read the question”.</li>
            <li>Check what we read — marks, subject, chapter — and change it if it’s off.</li>
            <li>Upload an image of your written answer or type it out, then grade.</li>
            <li>
              We call our examiner-style grader and show the real score,
              annotated steps and where marks were lost.
            </li>
          </ol>
        </details>

        {/* ★★ THE CONVERGENCE (§2.1) — one fluid row, rendered at every width.
            DOM order is QUESTION then ANSWER, always. The inverted-flow bug the
            mobile twin shipped (answer above question) is now STRUCTURALLY
            IMPOSSIBLE: there is only one order, and no branch that could reverse
            it. The cards sit side by side while they fit and wrap when they do
            not — because flex-basis ran out of room in THIS box, not because
            anything asked the window. */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: CARD_GAP,
            alignItems: "flex-start",
            minWidth: 0,
          }}
        >
          {/* 1 · THE QUESTION — always first in the DOM */}
          <section
            onPaste={(e) => handleCardPaste(e, "question")}
            style={{
              ...cardStyle,
              flex: `1 1 ${CARD_BASIS}px`,
              minWidth: 0,
              padding: 20,
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
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
                      {t === "type" ? "Type / paste" : "Upload question(s)"}
                    </button>
                  );
                })}
              </div>

              {questionTab === "type" ? (
                // MIRROR 1 — the question gets the answer's hands: the plain single-line
                // <input> becomes <EquationInput>, the same math-palette control the
                // answer already uses (:2152). A CBSE question is as full of powers,
                // roots and fractions as its answer, and had no way to type them.
                // clearDetection() STILL fires on every edit — an edited question must
                // drop its stale detection chip, exactly as before.
                <EquationInput
                  value={question}
                  onChange={(v) => { setQuestion(v); clearDetection(); }}
                  placeholder="e.g. Find the 10th term of the AP 3, 7, 11, … [3]"
                  rows={3}
                  autoGrow
                  maxRows={8}
                  ariaLabel="Type the question"
                />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <input
                    ref={qFileInputRef}
                    type="file"
                    /* Tight accept, matching QrAnswerUploadPage:163 and the guard's real
                       contract. `image/*` OFFERED a student's iPhone picker HEIC, which
                       checkUploadFile then refused — an avoidable refusal manufactured by
                       our own hint. accept is a HINT, not a guard: checkUploadFile below
                       is unchanged and still refuses type AND size at the picker (§2.5). */
                    accept="image/jpeg,image/png,application/pdf"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleQuestionFile(f);
                    }}
                  />
                  <button type="button" style={buttonOutline} onClick={() => qFileInputRef.current?.click()}>
                    {qImageName ? `Question file: ${qImageName}` : "Upload question paper — PDF or image"}
                  </button>
                  <div style={{ fontSize: 12, color: TEXT_MUTED }}>
                    Upload an image or PDF of your question paper. We&rsquo;ll read all questions. Then upload your answer below.
                  </div>

                  {/* MIRROR 2 — QR handoff for the QUESTION, mirroring the answer's
                      (:2068). A desktop student whose question paper is on their phone no
                      longer has to email it to themselves: scan, pick the file, and it
                      lands in the same qImageBase64 tuple handleQuestionFile fills.
                      mode="question" — its OWN mode (not "document", whose copy says "your
                      answers"): question-voice words, PDF-or-photo file picker (no
                      camera-first). It mints/persists/round-trips through the server
                      (qrUploadChannel accepts "question"), so the phone reads question copy.
                      Desktop-AND-signed-in gating is inherited free (QrAnswerHandoff:192)
                      — NO useIsDesktop branch here. Retires once the file lands. */}
                  {!qImageBase64 && (
                    <QrAnswerHandoff
                      mode="question"
                      label="Question paper on your phone?"
                      disabled={detecting}
                      onImageReceived={({ imageBase64: b64, imageMimeType: mime }) => {
                        setQuestionFileError(null);
                        setQImageBase64(b64);
                        setQImageMime(mime);
                        // "Image", not "Photo" (D4) — the noun stays complete across the
                        // surface now that the question side has a delivery of its own.
                        setQImageName(
                          mime === "application/pdf" ? "PDF from your phone" : "Image from your phone",
                        );
                      }}
                    />
                  )}

                  {/* MIRROR 3 — Camera / Files for the QUESTION on a touch device,
                      mirroring the answer's (:2114). Same two buttons toggling
                      capture="environment" on the EXISTING hidden qFileInputRef input —
                      no second file input. Device-gated (!isDesktop), hidden once a file
                      exists, so it never competes with the chosen-file state. */}
                  {!isDesktop && !qImageBase64 && (
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      {([
                        { label: "Camera", capture: true },
                        { label: "Files", capture: false },
                      ] as const).map(({ label, capture }) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() => {
                            const el = qFileInputRef.current;
                            if (!el) return;
                            if (capture) el.setAttribute("capture", "environment");
                            else el.removeAttribute("capture");
                            el.click();
                          }}
                          style={{
                            ...buttonOutline,
                            flex: 1,
                            height: 40,
                            justifyContent: "center",
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
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
              {/* Picker refusal for the QUESTION photo — mirrors detectError's shape so
                  the two read as one voice. Deliberately NOT the grade-failure channel:
                  nothing was graded, so "Retry the grader" would be a lie. */}
              {questionFileError && (
                <div style={{ fontSize: 12.5, color: DANGER_FG }}>{questionFileError}</div>
              )}

              {/* Multi-question summary chip — N questions detected; grade the whole
                  paper. Replaces the single-question correctable chip in this mode. */}
              {confirmed && isMultiQuestion && detectedQuestions && (
                <div
                  style={{
                    background: MUTED_BG,
                    border: `1px solid ${BORDER}`,
                    borderRadius: 10,
                    padding: "12px 14px",
                    fontSize: 13,
                    color: TEXT_FG,
                    lineHeight: 1.5,
                  }}
                >
                  <strong>{detectedQuestions.length} questions detected</strong> · {confirmed.subject}
                  {confirmed.topicName ? ` · ${confirmed.topicName}` : ""}
                  <div style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 4, display: "flex", flexWrap: "wrap", gap: "0 16px" }}>
                    {detectedQuestions.map((q) => (
                      <span key={q.questionNumber}>
                        Q{q.questionNumber} · {q.marks} {q.marks === 1 ? "mark" : "marks"}
                      </span>
                    ))}
                  </div>
                  <div style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 4 }}>
                    Upload your answer sheet (image or PDF) below to grade all {detectedQuestions.length}.
                  </div>
                </div>
              )}

              {/* Confirmation chip — the detected values, always visible + correctable */}
              {confirmed && !isMultiQuestion && (
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
          </section>

          {/* 2 · YOUR ANSWER — always second in the DOM (upload an image of YOUR
              work, or type it). Same fluid basis as the question, so the two share
              the row evenly and wrap together. */}
          <section
            onPaste={(e) => handleCardPaste(e, "answer")}
            style={{
              ...cardStyle,
              flex: `1 1 ${CARD_BASIS}px`,
              minWidth: 0,
              padding: 20,
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
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
                      {t === "upload" ? "Upload image" : "Type answer"}
                    </button>
                  );
                })}
              </div>

              {tab === "upload" ? (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    /* C&I PR-2 (item C) — the solution upload now accepts a PDF for
                       BOTH single- and multi-question, mirroring the question upload.
                       handleFileChosen already derives the PDF mime from the file, and
                       /check-solution reads a PDF natively (same as SolutionChecker).
                       Tight accept per §2.5 — see the question input above. */
                    accept="image/jpeg,image/png,application/pdf"
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
                          Choose your answer — PDF or image
                        </div>
                        {/* The canonical promise, rendered from the constant that the
                            guard enforces — never hand-written. This box used to say
                            "PNG or JPG", which hid PDF: the very path checkUploadFile's
                            own refusal calls RECOMMENDED. A student with a 3-page
                            solution read that and concluded PDF was not allowed.
                            [FU-CI-UPLOAD-COPY-CANONICAL] */}
                        <div style={{ fontSize: 12, color: TEXT_MUTED }}>
                          {UPLOAD_LIMIT_SENTENCE}
                        </div>
                      </>
                    )}
                  </button>

                  {/* Solved it on paper? Send it from your phone instead of emailing it
                      to yourself. A QR handoff produces a FILE — the same
                      imageBase64/imageMime/imageName tuple handleFileChosen fills — so
                      it is a SUB-MODE OF UPLOAD, attached inside this panel and never a
                      third peer beside the Upload/Type control.

                      Desktop-only + signed-in-only; renders nothing otherwise, so when
                      QR is unused this panel behaves exactly as it did before. Hidden
                      once a file exists, so the QR session cannot outlive its own
                      purpose: delivery unmounts it (its cleanup cancels polling) and
                      `clearImage` remounts a fresh idle instance. */}
                  {!imageBase64 && (
                    <QrAnswerHandoff
                      /* ★ C&I IS BIMODAL — the ONE host so far that is not a single
                         shape, so a fixed mode would misdescribe one of its two real
                         states.
                           multi-question -> "document": the answers to a WHOLE PAPER,
                             one multi-page PDF. Camera-first copy here is precisely the
                             failure QrAnswerHandoff's `mode` exists to prevent — its own
                             docblock: "'photograph your answer' makes a student shoot
                             page 1 of a 20-question mock and walk away believing they
                             are done."
                           single-question -> "photo": one handwritten answer; the photo
                             IS the answer.
                         `isMultiQuestion` derives from the QUESTION upload's detection,
                         which settles BEFORE the answer upload is reachable — so this
                         always holds a real value by the time the QR renders. */
                      mode={isMultiQuestion ? "document" : "photo"}
                      disabled={status === "loading"}
                      onImageReceived={({ imageBase64: b64, imageMimeType: mime }) => {
                        // C&I's dropzone renders a glyph + filename for ANY accepted
                        // type — there is no `!isPdf`-gated <img> here — so a delivered
                        // PDF needs no extra state. (SolutionChecker DID need a
                        // five-field tuple for exactly that reason: do not assume a
                        // sibling wire's shape transfers, in either direction.)
                        setAnswerFileError(null);
                        setImageBase64(b64);
                        setImageMime(mime);
                        setImageName(
                          // "Image", not "Photo" (D4). This is the filename label the
                          // dropzone renders after a QR delivery — a SECOND
                          // student-visible "photo" the header spec's D4 audit missed.
                          // The lede is not the last one; this is. Now it is complete.
                          mime === "application/pdf" ? "PDF from your phone" : "Image from your phone",
                        );
                      }}
                    />
                  )}

                  {/* CAMERA / FILES — absorbed from the retired mobile twin (which
                      owned this and the desktop twin never had it). This is the ONE
                      legitimate use of useIsDesktop in this file's answer path: it
                      asks "does this DEVICE have a camera worth offering?", which is
                      a question about the device, not about how wide this box is.
                      A touch student taps Camera and shoots their working; the same
                      input, the same handleFileChosen, the same guard — `capture` only
                      changes which picker the OS opens. Hidden once a file exists, so
                      it cannot compete with "Remove image". */}
                  {!isDesktop && !imageBase64 && (
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      {([
                        { label: "Camera", capture: true },
                        { label: "Files", capture: false },
                      ] as const).map(({ label, capture }) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() => {
                            const el = fileInputRef.current;
                            if (!el) return;
                            if (capture) el.setAttribute("capture", "environment");
                            else el.removeAttribute("capture");
                            el.click();
                          }}
                          style={{
                            ...buttonOutline,
                            flex: 1,
                            height: 40,
                            justifyContent: "center",
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}

                  {imageBase64 && (
                    <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
                      <button type="button" onClick={clearImage} style={buttonOutline}>
                        Remove image
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <EquationInput
                  value={textAnswer}
                  onChange={setTextAnswer}
                  placeholder="Type your answer here. Include each step on a new line — examiners award method marks even when the final answer slips."
                  // Both boxes now START at the same min-3 height (owner: "the default
                  // untyped box sizes same — this makes the initial look clean"). Typing
                  // is the minority path, so the old fixed 8-row rectangle over-provisioned
                  // the rare case. It grows with the answer up to 14 rows, then scrolls.
                  rows={3}
                  autoGrow
                  maxRows={14}
                  ariaLabel="Type your answer"
                />
              )}

              {/* Picker refusal for the ANSWER file. Sits ABOVE the grade-failure box
                  and is a separate state on purpose — this file never reached the
                  grader, so it must not borrow that box's "Press Retry to call the
                  grader again." No score was attempted; there is nothing to retry. */}
              {answerFileError && (
                <div style={{ fontSize: 12.5, color: DANGER_FG }}>{answerFileError}</div>
              )}

              {/* THE TIP — inline at the uploader. The rail used to hold this; on
                  this ONE detail the retired mobile twin was the northstar, because
                  advice about photographing a page belongs beside the thing that
                  takes the photo, not in a column the student's eye never reaches.
                  Carries the multi-page line (§2.4 / D5): the honest, true promise —
                  PDF is the multi-page path, and a phone's own scan feature is how a
                  student makes one. Building an image→PDF merge is [FU-CI-MULTIPAGE-CAPTURE]
                  and is deliberately NOT built here. */}
              <div
                style={{
                  borderRadius: 9,
                  padding: "9px 11px",
                  background: INFO_SOFT,
                  border: `1px solid ${INFO_SOFT}`,
                  fontSize: 12,
                  lineHeight: 1.5,
                  color: TEXT_FG,
                }}
              >
                <strong style={{ color: INFO_FG }}>Tip:</strong> even lighting and a
                flat page give the grader the best chance. Include each working step,
                not just the final answer — examiners reward method.
                <br />
                More than one page? Use your phone&rsquo;s scan feature to send it as one PDF.
              </div>
          </section>
        </div>

        {/* ── THE GRADE BAR ───────────────────────────────────────────────
            The action, and the two things a student deserves to read AT the moment
            they decide to spend effort — not in a rail beside it.

            "We never invent a score" moved here from the How-it-works card (§2.2):
            it is the anti-fabrication promise, and it means most where the score is
            about to be produced.

            The signed-out disclosure + the only gotoLogin on this surface also moved
            here — owner decision (c), 2026-07-17. The rail card that held them is
            deleted. This matters more than it looks: the QR affordance is
            desktop-AND-signed-in only (QrAnswerHandoff:192), so without this a
            signed-out student on desktop would meet no QR and no way to sign in —
            a dead end. It renders only when signed out, and it never blocks grading:
            we still grade for a signed-out student, and say so plainly. */}
        <div
          style={{
            ...cardStyle,
            marginTop: 16,
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            gap: 14,
            flexWrap: "wrap",
            minWidth: 0,
          }}
        >
          <div style={{ flex: "1 1 220px", minWidth: 0 }}>
            <div style={{ fontSize: 12, color: TEXT_MUTED, lineHeight: 1.5 }}>
              <strong style={{ color: ACCENT_FG }}>We never invent a score.</strong>{" "}
              If grading fails, you&rsquo;ll see an honest error and can retry.
            </div>
            {!user && (
              <div style={{ marginTop: 8, fontSize: 12, color: TEXT_MUTED, lineHeight: 1.5 }}>
                Sign in to save mistake history. Without an account we&rsquo;ll still
                grade your answer, but the result won&rsquo;t be remembered after you
                leave.
              </div>
            )}
          </div>

          {!user && (
            <button type="button" style={buttonOutline} onClick={gotoLogin}>
              Sign in to save history <ChevronRightGlyph />
            </button>
          )}

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

        {/* The grade-failure box — beside the action that failed, and unchanged:
            no score was invented, and Retry calls the grader again. */}
        {errorMessage && (
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              marginTop: 12,
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
      </div>,
      "Board-style examiner grading",
    );
  }

  /* ──────────── MULTI-QUESTION RESULT VIEW (whole paper) ──────────── */

  if (wsResult) {
    const ws = wsResult;
    return withChrome(
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: PAGE_PADDING,
          fontFamily: FONT_SANS,
          minWidth: 0,
        }}
      >
        <PageHeader
          showBack
          onBack={resetToInput}
          eyebrow="Check & Improve · Graded paper"
          title={`${ciCode ?? "Graded paper"} · ${ws.gradedCount}/${ws.totalQuestions} graded`}
          description="Examiner-style grading of your whole question paper. Any page we couldn't read is marked pending — it is never scored 0."
          actions={
            <>
              <button type="button" style={buttonOutline} onClick={resetToInput}>
                Grade another
              </button>
              <button type="button" style={buttonAccent} onClick={gotoMe}>
                See your progress <ChevronRightGlyph />
              </button>
            </>
          }
        />

        {/* C&I PR-1 — the 5th <ResultsScorecard> variant, opened on grade. The
            bespoke graded views below stay byte-intact underneath as "the graded
            sheet" behind the primary action. */}
        {scorecardOpen && confirmed && ciCode && (
          <ResultsScorecard
            variant={checkImproveScorecardVariant({
              returnTicket: returnTicketInput,
              topicName: confirmed.topicName,
              code: ciCode,
              topicSource: ciTopicSource ?? deriveTopicSource(confirmed.topicSlug, topicTouched),
              response: ws,
              saved: ciSaved,
              downloading,
              onReadSheet: () => setScorecardOpen(false),
              onDownloadGraded: () => void downloadGraded(buildMultiPrintProps()),
              ...(confirmed.topicSlug
                ? {
                    onPractiseTopic: () =>
                      gotoWorksheetForTopic(confirmed.subject, confirmed.topicSlug),
                  }
                : {}),
            })}
            onClose={() => setScorecardOpen(false)}
          />
        )}

        {/* Honest totals — the graded subtotal excludes pending pages. */}
        <div style={{ ...cardStyle, padding: 24, marginTop: 20 }}>
          <div style={sectionEyebrow}>Score (graded questions)</div>
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
            {ws.gradedMarksAwarded}
            <span style={{ fontSize: 18, color: TEXT_MUTED, fontWeight: 500 }}>
              /{ws.gradedMarksTotal}
            </span>
          </div>
          {ws.pendingCount > 0 && (
            <div style={{ fontSize: 12.5, color: WARNING_FG, marginTop: 8 }}>
              {ws.pendingCount} page{ws.pendingCount === 1 ? "" : "s"} couldn&rsquo;t be read — re-upload
              {ws.pendingCount === 1 ? " it" : " them"} to grade. Not scored 0.
            </div>
          )}
          {ws.summary && (
            <p style={{ margin: "12px 0 0", fontSize: 13.5, color: TEXT_FG, lineHeight: 1.6 }}>
              {ws.summary}
            </p>
          )}
        </div>

        {/* PART B — graded-solution actions: download the branded PDF + read the
            same branded sheet on screen (mirrors the worksheet, shares the export). */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
          <button
            type="button"
            style={{ ...buttonAccent, opacity: downloading ? 0.7 : 1 }}
            disabled={downloading}
            onClick={() => void downloadGraded(buildMultiPrintProps())}
          >
            {downloading ? "Preparing PDF…" : "↓ Download graded solution"}
          </button>
          <button type="button" style={buttonOutline} onClick={() => toggleRead(buildMultiPrintProps)}>
            {readProps ? "Hide graded sheet" : "Read on screen"}
          </button>
        </div>
        {downloadError && (
          <div style={{ fontSize: 12.5, color: DANGER_FG, marginTop: 8 }}>{downloadError}</div>
        )}
        {readProps && (
          <div style={{ ...cardStyle, padding: 0, marginTop: 14, overflowX: "auto" }}>
            <CheckImproveGradedPrintDoc {...readProps} />
          </div>
        )}

        {/* Per-question list — marks + honest pending + mistake grouping + per-step working. */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
          {ws.results.map((g, qi) => {
            const m = g.mistakeSummary ?? { conceptual: 0, calculation: 0, silly: 0, presentation: 0 };
            const knowledge = m.conceptual + m.calculation;
            const careless = m.silly + m.presentation;
            // PART A: per-question steps (same AnnotatedStepRow as single-Q),
            // expandable so a multi-question paper isn't a wall of steps. Keyed by
            // array index (not qNumber) so a grader-mislabelled duplicate qNumber
            // can't collide the React key or expand two cards in lockstep.
            const steps = g.annotatedSteps ?? [];
            const canExpand = !g.couldNotRead && steps.length > 0;
            const open = !!expandedQ[qi];
            const qText = detectedQuestions?.find((q) => q.questionNumber === g.qNumber)?.questionText;
            const toggle = () => setExpandedQ((p) => ({ ...p, [qi]: !p[qi] }));
            return (
              <div key={qi} style={{ ...cardStyle, padding: 16 }}>
                <div
                  role={canExpand ? "button" : undefined}
                  tabIndex={canExpand ? 0 : undefined}
                  aria-expanded={canExpand ? open : undefined}
                  onClick={canExpand ? toggle : undefined}
                  onKeyDown={
                    canExpand
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            toggle();
                          }
                        }
                      : undefined
                  }
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                    cursor: canExpand ? "pointer" : "default",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700, color: TEXT_FG }}>
                    {canExpand && (
                      <span style={{ color: TEXT_MUTED, fontSize: 12 }}>{open ? "▾" : "▸"}</span>
                    )}
                    Q{g.qNumber}
                  </div>
                  {g.couldNotRead ? (
                    <span style={{ ...chipBase, color: WARNING_FG }}>
                      Couldn&rsquo;t read — re-upload this page
                    </span>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      {knowledge > 0 && (
                        <span style={{ ...chipBase, color: DANGER_FG }}>Knowledge gap ×{knowledge}</span>
                      )}
                      {careless > 0 && (
                        <span style={{ ...chipBase, color: WARNING_FG }}>Careless ×{careless}</span>
                      )}
                      <span
                        style={{
                          fontFamily: FONT_DISPLAY,
                          fontWeight: 700,
                          fontSize: 16,
                          color: TEXT_FG,
                        }}
                      >
                        {g.marksAwarded}
                        <span style={{ fontSize: 13, color: TEXT_MUTED, fontWeight: 500 }}>
                          /{g.totalMarks}
                        </span>
                      </span>
                    </div>
                  )}
                </div>
                {!g.couldNotRead && g.teacherNote && (
                  <p style={{ margin: "10px 0 0", fontSize: 13, color: TEXT_MUTED, lineHeight: 1.55 }}>
                    {g.teacherNote}
                  </p>
                )}
                {canExpand && !open && (
                  <button
                    type="button"
                    onClick={toggle}
                    style={{
                      marginTop: 10,
                      background: "none",
                      border: "none",
                      padding: 0,
                      color: PRIMARY_GREEN,
                      fontFamily: FONT_SANS,
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Show step-by-step working ▸
                  </button>
                )}
                {canExpand && open && (
                  <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                    {qText && (
                      <div style={{ fontSize: 13, color: TEXT_FG, lineHeight: 1.5, fontFamily: FONT_SERIF }}>
                        {qText}
                      </div>
                    )}
                    {steps.map((step) => (
                      <AnnotatedStepRow key={step.stepNumber} step={step} objective={g.objective} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {saveStatus === "save-failed" && (
          <div style={{ fontSize: 12.5, color: DANGER_FG, marginTop: 14 }}>
            Result shown, save unavailable. Your grading is fine — we just
            couldn't write to your mistake history this time.
          </div>
        )}
        {saveStatus === "no-user" && (
          <div style={{ fontSize: 12.5, color: TEXT_MUTED, marginTop: 14 }}>
            Sign in to save these mistakes to your progress.
          </div>
        )}
      </div>,
      "Graded paper",
    );
  }

  /* ────────────────── RESULT VIEW ────────────────── */

  // Defensive: the gate above guarantees result+resultCtx here (wsResult already
  // returned), but the compound condition no longer narrows them for the compiler.
  if (!result || !resultCtx) return null;

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

  return withChrome(
    <div
      style={{
        maxWidth: 1500,
        margin: "0 auto",
        padding: PAGE_PADDING,
        fontFamily: FONT_SANS,
        minWidth: 0,
      }}
    >
      <PageHeader
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

      {/* C&I PR-1 — the 5th <ResultsScorecard> variant on the single-question
          path (the grade adapted into the same unified one-question shape). The
          bespoke graded view below stays byte-intact as "the graded sheet". */}
      {scorecardOpen && ciCode && (
        <ResultsScorecard
          variant={checkImproveScorecardVariant({
              returnTicket: returnTicketInput,
            topicName: resultCtx.topicName,
            code: ciCode,
            topicSource: ciTopicSource ?? deriveTopicSource(resultCtx.topicSlug, topicTouched),
            response: singleCheckToWorksheetResponse(result),
            saved: ciSaved,
            downloading,
            onReadSheet: () => setScorecardOpen(false),
            onDownloadGraded: () => void downloadGraded(buildSinglePrintProps()),
            ...(resultCtx.topicSlug ? { onPractiseTopic: gotoWorksheetForResult } : {}),
          })}
          onClose={() => setScorecardOpen(false)}
        />
      )}

      {/* The RESULT view reflows on the same rule as the input view (§2.1): fluid,
          container-relative, no window-derived value. The 7:5 proportion the old grid
          had is preserved by flex-GROW (7 vs 5) while both bases fit; when they do
          not, the summary rail wraps under the score instead of being crushed.
          Unlike the input view, this rail STAYS — it carries the mistake summary and
          the save state (§4.8), which are the student's result, not help text. */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 24,
          alignItems: "flex-start",
          minWidth: 0,
        }}
      >
        {/* LEFT — score + annotated steps + teacher note */}
        <div style={{ display: "flex", flex: "7 1 400px", flexDirection: "column", gap: 20, minWidth: 0 }}>
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

          {/* PART B — graded-solution actions: download the branded PDF + read the
              same branded sheet on screen (shares the worksheet export core). */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              style={{ ...buttonAccent, opacity: downloading ? 0.7 : 1 }}
              disabled={downloading}
              onClick={() => void downloadGraded(buildSinglePrintProps())}
            >
              {downloading ? "Preparing PDF…" : "↓ Download graded solution"}
            </button>
            <button type="button" style={buttonOutline} onClick={() => toggleRead(buildSinglePrintProps)}>
              {readProps ? "Hide graded sheet" : "Read on screen"}
            </button>
          </div>
          {downloadError && <div style={{ fontSize: 12.5, color: DANGER_FG }}>{downloadError}</div>}
          {readProps && (
            <div style={{ ...cardStyle, padding: 0, overflowX: "auto" }}>
              <CheckImproveGradedPrintDoc {...readProps} />
            </div>
          )}

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
                  <AnnotatedStepRow key={step.stepNumber} step={step} objective={result.objective} />
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
        <div style={{ display: "flex", flex: "5 1 260px", flexDirection: "column", gap: 20, minWidth: 0 }}>
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
    </div>,
    "Your result",
  );
};

export default DesktopCheckImprovePage;
