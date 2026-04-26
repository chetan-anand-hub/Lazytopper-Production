import type { ReactNode } from "react";

/**
 * Desktop Level 2 — ContextBar
 *
 * Reference (final desktop prototype):
 *   chetan-anand-hub/topic-focus-lite — src/components/ContextBar.tsx
 *
 * Presentational page header used at the top of every Level 2 desktop page.
 * Composition (left → right):
 *   - Eyebrow (uppercase short label) + display title + subtitle paragraph
 *   - Optional chip row (scope / mode / status pills)
 *   - Optional right-slot (custom CTAs like "Open" / "Save")
 *
 * Design contract (matches existing DesktopShell / DesktopHome styles):
 *   - No Tailwind, no lucide. Inline styles + inline SVG only.
 *   - Pure props in / DOM out. No data fetching, no router hooks.
 */

const TEXT = "hsl(220, 45%, 14%)";
const TEXT_MUTED = "hsl(220, 15%, 45%)";
const ACCENT = "hsl(152, 55%, 45%)";
const CHIP_BG = "hsl(210, 33%, 96%)";
const CHIP_BORDER = "hsl(215, 25%, 90%)";
const FONT_DISPLAY = "'Fraunces', Georgia, serif";

export type DesktopContextChipTone = "neutral" | "accent" | "warning" | "info";

export interface DesktopContextChip {
  label: string;
  tone?: DesktopContextChipTone;
}

interface ContextBarProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  chips?: DesktopContextChip[];
  right?: ReactNode;
  compact?: boolean;
}

const chipColor = (tone: DesktopContextChipTone): { bg: string; fg: string; border: string } => {
  switch (tone) {
    case "accent":
      return { bg: "hsl(152, 55%, 95%)", fg: "hsl(152, 55%, 28%)", border: "hsl(152, 55%, 80%)" };
    case "warning":
      return { bg: "hsl(38, 92%, 95%)", fg: "hsl(38, 65%, 32%)", border: "hsl(38, 70%, 80%)" };
    case "info":
      return { bg: "hsl(215, 75%, 95%)", fg: "hsl(215, 65%, 32%)", border: "hsl(215, 65%, 80%)" };
    default:
      return { bg: CHIP_BG, fg: TEXT_MUTED, border: CHIP_BORDER };
  }
};

export function ContextBar({
  eyebrow,
  title,
  subtitle,
  chips,
  right,
  compact = false,
}: ContextBarProps) {
  const titleSize = compact ? 22 : 30;
  const titleLine = compact ? 1.2 : 1.15;
  const blockGap = compact ? 6 : 10;
  const sectionGap = compact ? 14 : 22;

  return (
    <header
      style={{
        marginBottom: sectionGap,
        display: "flex",
        flexDirection: "column",
        gap: blockGap,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ minWidth: 0, flex: "1 1 auto" }}>
          {eyebrow ? (
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: ACCENT,
                marginBottom: 4,
              }}
            >
              {eyebrow}
            </div>
          ) : null}

          <h1
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: titleSize,
              lineHeight: titleLine,
              fontWeight: 600,
              color: TEXT,
              margin: 0,
              letterSpacing: "-0.01em",
            }}
          >
            {title}
          </h1>

          {subtitle ? (
            <p
              style={{
                marginTop: 6,
                marginBottom: 0,
                color: TEXT_MUTED,
                fontSize: 14,
                lineHeight: 1.5,
                maxWidth: 720,
              }}
            >
              {subtitle}
            </p>
          ) : null}
        </div>

        {right ? <div style={{ flex: "0 0 auto" }}>{right}</div> : null}
      </div>

      {chips && chips.length > 0 ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          {chips.map((chip, idx) => {
            const tone = chip.tone ?? "neutral";
            const { bg, fg, border } = chipColor(tone);
            return (
              <span
                key={`${chip.label}-${idx}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "4px 10px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 500,
                  background: bg,
                  color: fg,
                  border: `1px solid ${border}`,
                  whiteSpace: "nowrap",
                }}
              >
                {chip.label}
              </span>
            );
          })}
        </div>
      ) : null}
    </header>
  );
}
