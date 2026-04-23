import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

/**
 * DesktopCheckImprovePage — locked desktop baseline Check & Improve surface.
 *
 * Source of truth: chetan-anand-hub/lazytopper-desktop-view-e1fc5df7
 *   src/pages/CheckImprove.tsx
 *
 * Composition (mirrors the locked baseline exactly):
 *
 *   UPLOAD STATE
 *     - PageHeader: eyebrow "Check & Improve" / title "Upload your handwritten
 *       answer" / description.
 *     - Dashed-bordered upload drop area centred in a max-1100px column with
 *       upload glyph, "Drag & drop your answer", file/size hint, and two
 *       actions: "Choose file" (dark CTA) + "Use camera" (outline).
 *
 *   GRADED RESULT STATE
 *     - PageHeader with back affordance, eyebrow "Check & Improve · Graded
 *       result", title "Trigonometry · Q4 (5 marks)", description, and two
 *       header actions: "Upload another" (outline) + "Practice this mistake
 *       type" (accent CTA).
 *     - 12-col grid:
 *         LEFT (col-7):
 *           - Uploaded-answer card with score "3/5" and "Needs work" chip,
 *             plus 5 annotated rows (ok/warn/bad).
 *           - Examiner-note card.
 *         RIGHT (col-5):
 *           - Mistake categories card with 4 rows (Conceptual / Calculation
 *             / Silly / Presentation) — colour dot + label + note + count chip.
 *           - Trend over last 5 uploads card with 5 vertical bars + caption.
 *           - Improvement insight gradient card with sparkles glyph, headline,
 *             body, and "Run drill" CTA.
 *
 * Reuse:
 *   - "Practice this mistake type" + insight "Run drill" wire to the existing
 *     production /practice route (the current Check & Improve flow already
 *     leans on Practice for follow-up drills).
 *   - "Upload another" returns the local view to the upload state — same
 *     mental model as the baseline's local useState toggle.
 *   - The graded preview is a faux/illustrative example exactly as in the
 *     locked baseline (it is a desktop preview surface, not a real grade
 *     fetch). The grading backend / OCR / model are NOT touched.
 *
 * Production constraints:
 *   - Inline styles only (no Tailwind, no shadcn classes).
 *   - Inline SVG only (no lucide-react).
 *   - Light theme tokens shared with DesktopShell + DesktopHome +
 *     DesktopPracticePage + DesktopExamTrendsPage + DesktopTopicHubPage.
 */

const PRIMARY_GREEN = "hsl(152, 55%, 45%)";
const PRIMARY_GLOW = "hsl(152, 60%, 55%)";
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

const FONT_DISPLAY =
  '"Source Serif Pro", "Source Serif 4", Georgia, "Times New Roman", serif';
const FONT_SANS =
  'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const FONT_SERIF = 'Georgia, "Times New Roman", serif';

type View = "upload" | "graded";

type Category = {
  id: string;
  label: string;
  dot: string;
  chipBg: string;
  chipFg: string;
  count: number;
  note: string;
};

const CATEGORIES: Category[] = [
  {
    id: "concept",
    label: "Conceptual",
    dot: WARNING_FG,
    chipBg: WARNING_SOFT,
    chipFg: WARNING_FG,
    count: 2,
    note: "Confused arithmetic vs geometric mean.",
  },
  {
    id: "calc",
    label: "Calculation",
    dot: INFO_FG,
    chipBg: "hsl(212, 80%, 95%)",
    chipFg: INFO_FG,
    count: 1,
    note: "Sign error in step 3 of derivation.",
  },
  {
    id: "silly",
    label: "Silly",
    dot: DANGER_FG,
    chipBg: DANGER_SOFT,
    chipFg: DANGER_FG,
    count: 3,
    note: "Missed units (m/s²) twice. Skipped final 'therefore'.",
  },
  {
    id: "present",
    label: "Presentation",
    dot: ACCENT_FG,
    chipBg: ACCENT_SOFT,
    chipFg: ACCENT_FG,
    count: 1,
    note: "Diagram unlabelled — examiner deducted 1 mark.",
  },
];

type AnnotationKind = "ok" | "warn" | "bad";
const ANNOTATIONS: { kind: AnnotationKind; text: string; note: string }[] = [
  { kind: "ok", text: "sin θ = perpendicular / hypotenuse = 3/5", note: "Correct setup" },
  { kind: "ok", text: "cos θ = base / hypotenuse = 4/5", note: "" },
  { kind: "warn", text: "tan θ = sin θ / cos θ = 3/5 × 5/4 = 3/4", note: "Working unclear — show step" },
  { kind: "bad", text: "∴ tan θ = 3/4", note: "Missing 'units / final boxed answer' — silly" },
  { kind: "warn", text: "(diagram of right triangle)", note: "Sides not labelled — presentation" },
];

const TREND_BARS = [2, 3, 2, 4, 3];

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

const FileImageGlyph = () => (
  <svg {...glyphProps} width={16} height={16}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <circle cx="10" cy="13" r="2" />
    <path d="M20 17l-3.5-3.5L9 21" />
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

const TrendingUpGlyph = () => (
  <svg {...glyphProps} width={14} height={14}>
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);

const SparklesGlyph = () => (
  <svg {...glyphProps} width={14} height={14}>
    <path d="M12 3l1.9 4.6L18 9l-4.1 1.4L12 15l-1.9-4.6L6 9l4.1-1.4z" />
    <path d="M19 14l.8 1.9L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8z" />
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

/* ────────────────── shared building blocks ────────────────── */

const PageHeader: React.FC<{
  eyebrow: string;
  title: string;
  description: string;
  showBack?: boolean;
  onBack?: () => void;
  actions?: React.ReactNode;
}> = ({ eyebrow, title, description, showBack, onBack, actions }) => (
  <div
    style={{
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 24,
      marginBottom: 24,
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
          fontSize: 30,
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
      <div style={{ display: "flex", gap: 10, flexShrink: 0, paddingTop: 4 }}>
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

const buttonDark: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 14px",
  borderRadius: 8,
  border: "1px solid hsl(220, 25%, 18%)",
  background: TEXT_FG,
  color: "#ffffff",
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

/* ────────────────── annotated row ────────────────── */

const Annotation: React.FC<{ kind: AnnotationKind; text: string; note: string }> = ({
  kind,
  text,
  note,
}) => {
  const color =
    kind === "ok" ? ACCENT_FG : kind === "warn" ? WARNING_FG : DANGER_FG;
  const bg =
    kind === "ok" ? "transparent" : kind === "warn" ? WARNING_SOFT : DANGER_SOFT;
  const Icon =
    kind === "ok" ? CheckGlyph : kind === "warn" ? AlertGlyph : XCircleGlyph;
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
      <div style={{ marginTop: 2, flexShrink: 0 }}>
        <Icon color={color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            display: "inline-block",
            padding: kind === "ok" ? 0 : "2px 6px",
            borderRadius: 4,
            background: bg,
            fontFamily: FONT_SERIF,
            fontSize: 15,
            color: TEXT_FG,
            lineHeight: 1.55,
          }}
        >
          {text}
        </span>
        {note && (
          <div
            style={{
              marginTop: 4,
              fontFamily: FONT_SANS,
              fontStyle: "normal",
              fontSize: 12,
              color,
            }}
          >
            ↳ {note}
          </div>
        )}
      </div>
    </div>
  );
};

/* ────────────────── page ────────────────── */

const DesktopCheckImprovePage: React.FC = () => {
  const navigate = useNavigate();
  // Match the locked baseline default — open in graded view so reviewers see
  // the desktop two-column composition immediately. The header's "Upload
  // another" + the in-page back arrow toggle to the upload state.
  const [view, setView] = useState<View>("graded");

  if (view === "upload") {
    return (
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "32px 32px 64px",
          fontFamily: FONT_SANS,
        }}
      >
        <PageHeader
          eyebrow="Check & Improve"
          title="Upload your handwritten answer"
          description="Snap a photo or upload a PDF. We'll grade examiner-style and show you exactly where marks slipped."
        />
        <div
          style={{
            ...cardStyle,
            padding: 56,
            textAlign: "center",
            borderStyle: "dashed",
            borderWidth: 2,
            borderColor: BORDER,
          }}
        >
          <div
            style={{
              height: 64,
              width: 64,
              margin: "0 auto",
              borderRadius: 16,
              background: SECONDARY_BG,
              display: "grid",
              placeItems: "center",
            }}
          >
            <UploadGlyph />
          </div>
          <h3
            style={{
              margin: "20px 0 6px",
              fontFamily: FONT_DISPLAY,
              fontSize: 20,
              fontWeight: 600,
              color: TEXT_FG,
            }}
          >
            Drag &amp; drop your answer
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              color: TEXT_MUTED,
            }}
          >
            PNG, JPG or PDF · up to 10 MB
          </p>
          <div
            style={{
              marginTop: 24,
              display: "flex",
              justifyContent: "center",
              gap: 12,
            }}
          >
            <button type="button" style={buttonDark} onClick={() => setView("graded")}>
              <FileImageGlyph /> Choose file
            </button>
            <button type="button" style={buttonOutline} onClick={() => setView("graded")}>
              Use camera
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: 1500,
        margin: "0 auto",
        padding: "32px 32px 64px",
        fontFamily: FONT_SANS,
      }}
    >
      <PageHeader
        showBack
        onBack={() => setView("upload")}
        eyebrow="Check & Improve · Graded result"
        title="Trigonometry · Q4 (5 marks)"
        description="Examiner-style grading. Mistake categorised. Next action queued."
        actions={
          <>
            <button type="button" style={buttonOutline} onClick={() => setView("upload")}>
              Upload another
            </button>
            <button
              type="button"
              style={buttonAccent}
              onClick={() => navigate("/practice")}
            >
              Practice this mistake type <ChevronRightGlyph />
            </button>
          </>
        }
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 7fr) minmax(0, 5fr)",
          gap: 24,
        }}
      >
        {/* LEFT — answer + annotations */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20, minWidth: 0 }}>
          <div style={{ ...cardStyle, padding: 24 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
                gap: 12,
              }}
            >
              <div style={sectionEyebrow}>Your uploaded answer</div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    fontFamily: FONT_DISPLAY,
                    fontSize: 24,
                    fontWeight: 600,
                    color: TEXT_FG,
                  }}
                >
                  3
                  <span style={{ fontSize: 14, color: TEXT_MUTED, fontWeight: 500 }}>
                    /5
                  </span>
                </div>
                <span
                  style={{
                    ...chipBase,
                    background: WARNING_SOFT,
                    color: WARNING_FG,
                    border: `1px solid ${WARNING_SOFT}`,
                  }}
                >
                  Needs work
                </span>
              </div>
            </div>

            <div
              style={{
                borderRadius: 10,
                border: `1px solid ${BORDER}`,
                background: MUTED_BG,
                padding: 20,
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              {ANNOTATIONS.map((a, i) => (
                <Annotation key={i} kind={a.kind} text={a.text} note={a.note} />
              ))}
            </div>
          </div>

          <div style={{ ...cardStyle, padding: 24 }}>
            <div style={{ ...sectionEyebrow, marginBottom: 12 }}>Examiner note</div>
            <p
              style={{
                margin: 0,
                fontSize: 14,
                lineHeight: 1.6,
                color: TEXT_FG,
              }}
            >
              "Strong start with correct ratios, but step 3 lost a mark for unclear
              working and step 4 lost a mark for not labelling the diagram. Final
              answer is correct — make your method visible to the examiner."
            </p>
          </div>
        </div>

        {/* RIGHT — categories + insights */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20, minWidth: 0 }}>
          <div style={{ ...cardStyle, padding: 24 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
                gap: 12,
              }}
            >
              <div style={sectionEyebrow}>Mistake categories</div>
              <span style={chipBase}>This answer</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {CATEGORIES.map((c) => (
                <div
                  key={c.id}
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
                      background: c.dot,
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
                      {c.label}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: TEXT_MUTED,
                        marginTop: 2,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {c.note}
                    </div>
                  </div>
                  <span
                    style={{
                      ...chipBase,
                      background: c.chipBg,
                      color: c.chipFg,
                      border: `1px solid ${c.chipBg}`,
                    }}
                  >
                    {c.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ ...cardStyle, padding: 24 }}>
            <div
              style={{
                ...sectionEyebrow,
                display: "flex",
                alignItems: "center",
                gap: 6,
                color: TEXT_MUTED,
              }}
            >
              <TrendingUpGlyph /> Trend over last 5 uploads
            </div>
            <div
              style={{
                marginTop: 16,
                display: "flex",
                alignItems: "flex-end",
                gap: 8,
                height: 96,
              }}
            >
              {TREND_BARS.map((v, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6,
                    height: "100%",
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      flex: 1,
                      background: MUTED_BG,
                      borderRadius: 6,
                      display: "flex",
                      alignItems: "flex-end",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: "100%",
                        height: `${(v / 5) * 100}%`,
                        background: `linear-gradient(180deg, ${PRIMARY_GLOW}, ${PRIMARY_GREEN})`,
                        borderRadius: 6,
                      }}
                    />
                  </div>
                  <div style={{ fontSize: 10, color: TEXT_MUTED }}>{v}/5</div>
                </div>
              ))}
            </div>
            <p
              style={{
                margin: "12px 0 0",
                fontSize: 12,
                color: TEXT_MUTED,
              }}
            >
              Silly mistakes dropped 40% over 2 weeks. Keep going.
            </p>
          </div>

          <div
            style={{
              ...cardStyle,
              padding: 20,
              border: "none",
              background: `linear-gradient(135deg, ${PRIMARY_GREEN}, ${PRIMARY_GLOW})`,
              color: "#ffffff",
            }}
          >
            <div
              style={{
                ...sectionEyebrow,
                color: "rgba(255, 255, 255, 0.85)",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <SparklesGlyph /> Improvement insight
            </div>
            <h4
              style={{
                margin: "10px 0 0",
                fontFamily: FONT_DISPLAY,
                fontSize: 18,
                fontWeight: 600,
                lineHeight: 1.35,
              }}
            >
              You lose 1 mark per answer to "no boxed final answer."
            </h4>
            <p
              style={{
                margin: "10px 0 0",
                fontSize: 13,
                lineHeight: 1.55,
                color: "rgba(255, 255, 255, 0.85)",
              }}
            >
              We've prepared a 5-Q presentation drill that focuses on
              examiner-friendly formatting.
            </p>
            <button
              type="button"
              onClick={() => navigate("/practice")}
              style={{
                marginTop: 16,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 12px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.95)",
                background: "#ffffff",
                color: PRIMARY_GREEN,
                fontFamily: FONT_SANS,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Run drill <ChevronRightGlyph />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DesktopCheckImprovePage;
