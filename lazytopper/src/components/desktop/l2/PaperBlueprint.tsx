import type {
  DesktopHubBlueprintSection,
  DesktopHubSectionId,
} from "../../../lib/desktop/topicHubContent";

/**
 * Desktop Level 2 — PaperBlueprint
 *
 * Reference (final desktop prototype):
 *   chetan-anand-hub/topic-focus-lite — src/components/PaperBlueprint.tsx
 *
 * Renders a board-paper blueprint for a single topic: a stack of section rows
 * (A → E) with question count, marks-each, and a one-line description, plus a
 * footer total.
 *
 * Design contract (matches existing DesktopShell / DesktopHome styles):
 *   - No Tailwind, no lucide. Inline styles only.
 *   - Pure props in / DOM out.
 */

const CARD_BG = "hsl(0, 0%, 100%)";
const CARD_BORDER = "hsl(215, 25%, 90%)";
const TEXT = "hsl(220, 45%, 14%)";
const TEXT_MUTED = "hsl(220, 15%, 45%)";
const ACCENT = "hsl(152, 55%, 45%)";
const PILL_BG = "hsl(210, 33%, 96%)";
const FONT_DISPLAY = "'Fraunces', Georgia, serif";

const SECTION_TONE: Record<DesktopHubSectionId, { bg: string; fg: string }> = {
  A: { bg: "hsl(215, 75%, 95%)", fg: "hsl(215, 65%, 32%)" },
  B: { bg: "hsl(180, 55%, 95%)", fg: "hsl(180, 50%, 28%)" },
  C: { bg: "hsl(152, 55%, 95%)", fg: "hsl(152, 55%, 28%)" },
  D: { bg: "hsl(38, 92%, 95%)", fg: "hsl(38, 65%, 32%)" },
  E: { bg: "hsl(280, 60%, 96%)", fg: "hsl(280, 50%, 35%)" },
};

interface PaperBlueprintProps {
  title?: string;
  sections: DesktopHubBlueprintSection[];
  totalMarks?: number;
}

export function PaperBlueprint({
  title = "Paper blueprint",
  sections,
  totalMarks,
}: PaperBlueprintProps) {
  const computedTotal =
    typeof totalMarks === "number"
      ? totalMarks
      : sections.reduce((acc, s) => acc + s.count * s.marksEach, 0);

  return (
    <section
      style={{
        background: CARD_BG,
        border: `1px solid ${CARD_BORDER}`,
        borderRadius: 16,
        padding: 24,
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <header style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <h3
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 18,
            fontWeight: 600,
            color: TEXT,
            margin: 0,
          }}
        >
          {title}
        </h3>
        <span style={{ fontSize: 12, color: TEXT_MUTED }}>
          Total{" "}
          <strong style={{ color: ACCENT, fontWeight: 700 }}>{computedTotal}</strong> marks
        </span>
      </header>

      {sections.length === 0 ? (
        <p style={{ margin: 0, fontSize: 13, color: TEXT_MUTED }}>
          No blueprint available for this topic yet.
        </p>
      ) : (
        <ul
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {sections.map((s) => {
            const tone = SECTION_TONE[s.section];
            const subtotal = s.count * s.marksEach;
            return (
              <li
                key={s.section}
                style={{
                  display: "grid",
                  gridTemplateColumns: "44px 1fr auto",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 12px",
                  background: PILL_BG,
                  border: `1px solid ${CARD_BORDER}`,
                  borderRadius: 10,
                }}
              >
                <span
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    display: "grid",
                    placeItems: "center",
                    background: tone.bg,
                    color: tone.fg,
                    fontWeight: 700,
                    fontSize: 14,
                  }}
                >
                  {s.section}
                </span>
                <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>
                    {s.description}
                  </span>
                  <span style={{ fontSize: 11, color: TEXT_MUTED }}>
                    {s.count} × {s.marksEach}-mark question{s.count === 1 ? "" : "s"}
                  </span>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: ACCENT }}>
                  {subtotal} m
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
