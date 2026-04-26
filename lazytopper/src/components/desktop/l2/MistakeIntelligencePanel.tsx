import type { DesktopMistakeInsight, DesktopMistakeType } from "../../../lib/desktop/mistakeData";

/**
 * Desktop Level 2 — MistakeIntelligencePanel
 *
 * Reference (final desktop prototype):
 *   chetan-anand-hub/topic-focus-lite — src/components/MistakeIntelligencePanel.tsx
 *
 * Full-width panel that lists DesktopMistakeInsight entries with a type badge,
 * label, detail, recommended drill, and an optional "Act on this" CTA.
 *
 * Design contract (matches existing DesktopShell / DesktopHome styles):
 *   - No Tailwind, no lucide. Inline styles + inline SVG only.
 *   - Pure props in / DOM out. Action is a callback the parent wires.
 */

const CARD_BG = "hsl(0, 0%, 100%)";
const CARD_BORDER = "hsl(215, 25%, 90%)";
const TEXT = "hsl(220, 45%, 14%)";
const TEXT_MUTED = "hsl(220, 15%, 45%)";
const ACCENT = "hsl(152, 55%, 45%)";
const SHADOW_SM = "0 1px 2px hsla(222, 40%, 20%, 0.04)";
const FONT_DISPLAY = "'Fraunces', Georgia, serif";

const TYPE_TONE: Record<DesktopMistakeType, { bg: string; fg: string; label: string }> = {
  conceptual: { bg: "hsl(215, 75%, 95%)", fg: "hsl(215, 65%, 32%)", label: "Conceptual" },
  calculation: { bg: "hsl(38, 92%, 95%)", fg: "hsl(38, 65%, 32%)", label: "Calculation" },
  silly: { bg: "hsl(0, 75%, 96%)", fg: "hsl(0, 60%, 38%)", label: "Silly mistake" },
  presentation: { bg: "hsl(280, 60%, 96%)", fg: "hsl(280, 50%, 35%)", label: "Presentation" },
};

function SparklesIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" />
    </svg>
  );
}

function ArrowRightIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

interface MistakeIntelligencePanelProps {
  title?: string;
  insights: DesktopMistakeInsight[];
  emptyMessage?: string;
  onActOn?: (insight: DesktopMistakeInsight) => void;
}

export function MistakeIntelligencePanel({
  title = "Mistake Intelligence",
  insights,
  emptyMessage = "No tracked mistakes yet — practice a few sets to see patterns appear here.",
  onActOn,
}: MistakeIntelligencePanelProps) {
  return (
    <section
      style={{
        background: CARD_BG,
        border: `1px solid ${CARD_BORDER}`,
        borderRadius: 16,
        padding: 24,
        boxShadow: SHADOW_SM,
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 16,
          color: ACCENT,
        }}
      >
        <SparklesIcon />
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          {title}
        </span>
      </header>

      {insights.length === 0 ? (
        <p
          style={{
            margin: 0,
            color: TEXT_MUTED,
            fontSize: 14,
            lineHeight: 1.55,
          }}
        >
          {emptyMessage}
        </p>
      ) : (
        <ul
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {insights.map((insight) => {
            const tone = TYPE_TONE[insight.mistakeType];
            return (
              <li
                key={insight.id}
                style={{
                  borderTop: `1px solid ${CARD_BORDER}`,
                  paddingTop: 16,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ minWidth: 0, flex: "1 1 auto" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 4,
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "2px 8px",
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 600,
                          background: tone.bg,
                          color: tone.fg,
                        }}
                      >
                        {tone.label}
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          color: TEXT_MUTED,
                          fontWeight: 500,
                        }}
                      >
                        {insight.topicName}
                      </span>
                    </div>
                    <h3
                      style={{
                        fontFamily: FONT_DISPLAY,
                        margin: 0,
                        fontSize: 17,
                        fontWeight: 600,
                        color: TEXT,
                        lineHeight: 1.3,
                      }}
                    >
                      {insight.mistakeLabel}
                    </h3>
                  </div>

                  {onActOn ? (
                    <button
                      type="button"
                      onClick={() => onActOn(insight)}
                      style={{
                        flexShrink: 0,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "6px 12px",
                        borderRadius: 8,
                        border: `1px solid ${ACCENT}`,
                        background: "transparent",
                        color: ACCENT,
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Act on this
                      <ArrowRightIcon />
                    </button>
                  ) : null}
                </div>

                <p
                  style={{
                    margin: 0,
                    color: TEXT_MUTED,
                    fontSize: 13,
                    lineHeight: 1.55,
                  }}
                >
                  {insight.detail}
                </p>

                <p
                  style={{
                    margin: 0,
                    color: TEXT,
                    fontSize: 13,
                    lineHeight: 1.5,
                  }}
                >
                  <strong style={{ color: TEXT, fontWeight: 600 }}>Recommended drill:</strong>{" "}
                  {insight.recommendedDrill}
                </p>

                {insight.recommendedFilters.length > 0 ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 2 }}>
                    {insight.recommendedFilters.map((f) => (
                      <span
                        key={f}
                        style={{
                          fontSize: 11,
                          color: TEXT_MUTED,
                          padding: "2px 8px",
                          background: "hsl(210, 33%, 96%)",
                          border: `1px solid ${CARD_BORDER}`,
                          borderRadius: 999,
                        }}
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
