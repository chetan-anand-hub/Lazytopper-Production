import React from "react";
import { useNavigate } from "react-router-dom";
import { useSubjectContext } from "../../hooks/useSubjectContext";
import {
  ScopeBuilder,
  isDesktopScopeValueValid,
  type DesktopScopeValue,
} from "../../components/desktop/l2/ScopeBuilder";
import { PaperBlueprint } from "../../components/desktop/l2/PaperBlueprint";
import { ContextBar } from "../../components/desktop/l2/ContextBar";
import {
  buildDesktopCheckPath,
  buildDesktopTopicHubPath,
  buildDesktopWorksheetPath,
  withQuery,
} from "../../lib/desktop/navigation";
import {
  desktopTopicsBySubject,
  desktopTopicBySlug,
  displayDesktopTopicNames,
} from "../../lib/desktop/topics";
import { desktopTopicHubContentBySlug } from "../../lib/desktop/topicHubContent";

/**
 * DesktopPracticePage — Level 2 graduation (PR-C).
 *
 * Reference (final desktop prototype):
 *   chetan-anand-hub/topic-focus-lite — src/pages/Practice (intent-first hub)
 *
 * This page replaces the Level 1 launcher (PageHeader + Worksheet hero +
 * 4 mode cards) with a graduated topic-focus-lite workspace. It answers
 * "What kind of practice do you want to generate now?" — intent-first.
 *
 * Composition (single file):
 *   1. ContextBar  — intent-first header with the active subject/stream chips
 *   2. ScopeBuilder — subject · stream · scope · topic(s) selection from the
 *      curated `desktopTopicsBySubject` bridge (suggested / starter list)
 *   3. Practice modes — Topic / Multi-topic / Timed / Worksheet, plus
 *      Predicted and Full Mock that route to existing premium routes
 *   4. Mistake-aware tile — honest empty-state copy ("Check an answer to
 *      unlock mistake-aware practice.") linking to /check-improve. We do NOT
 *      surface the static `mistakeData.ts` library as if it were the
 *      learner's own history.
 *   5. Optional PaperBlueprint preview — only when a single topic is picked
 *
 * Routing reuse — every CTA points at an existing production route.
 *   - Worksheet → buildDesktopWorksheetPath (= /practice/worksheets?...)
 *   - Topic Hub → buildDesktopTopicHubPath (= /topic-hub/:slug?...)
 *   - Check / Mistakes → buildDesktopCheckPath (= /check-improve?...)
 *   - Practice / Timed → /practice/:grade/:subject?... (legacy practice page)
 *   - Predicted → /highly-probable/:grade/:subject (premium-gated route)
 *   - Full Mock → /exam-simulation (premium-gated route)
 * All carry `source=practice` and `returnTo=/practice-hub` for back-nav.
 *
 * Production constraints:
 *   - Inline styles only (no Tailwind, no shadcn classes).
 *   - Inline SVG only (no lucide-react).
 *   - Light theme tokens shared with DesktopShell + DesktopHome.
 *   - No new npm dependency. No PR #17 imports. No real practice generator.
 */

// ── Tokens ────────────────────────────────────────────────────────────────
const PRIMARY_GREEN = "hsl(152, 55%, 45%)";
const PRIMARY_GREEN_SOFT = "hsl(152, 55%, 95%)";
const TEXT_FG = "hsl(220, 25%, 12%)";
const TEXT_MUTED = "hsl(220, 15%, 42%)";
const BORDER = "hsl(220, 18%, 90%)";
const CARD_BG = "#ffffff";
const PILL_BG = "hsl(210, 33%, 96%)";
const ACCENT_SOFT = "hsl(43, 90%, 92%)";
const ACCENT_FG = "hsl(35, 80%, 35%)";

const FONT_DISPLAY =
  '"Fraunces", "Source Serif Pro", Georgia, "Times New Roman", serif';
const FONT_BODY =
  '"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';

// ── Inline SVG glyphs ─────────────────────────────────────────────────────
const IconStroke: React.CSSProperties = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

function IconLayers({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={IconStroke} aria-hidden>
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}
function IconShuffle({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={IconStroke} aria-hidden>
      <polyline points="16 3 21 3 21 8" />
      <line x1="4" y1="20" x2="21" y2="3" />
      <polyline points="21 16 21 21 16 21" />
      <line x1="15" y1="15" x2="21" y2="21" />
      <line x1="4" y1="4" x2="9" y2="9" />
    </svg>
  );
}
function IconTimer({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={IconStroke} aria-hidden>
      <circle cx="12" cy="13" r="8" />
      <polyline points="12 9 12 13 15 15" />
      <line x1="9" y1="2" x2="15" y2="2" />
    </svg>
  );
}
function IconWorksheet({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={IconStroke} aria-hidden>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="9" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="13" y2="17" />
    </svg>
  );
}
function IconSparkles({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={IconStroke} aria-hidden>
      <path d="M12 3l1.8 4.6L18 9.4l-4.2 1.8L12 15.8l-1.8-4.6L6 9.4l4.2-1.8z" />
      <path d="M19 14l.9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9z" />
    </svg>
  );
}
function IconClipboard({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={IconStroke} aria-hidden>
      <rect x="6" y="4" width="12" height="18" rx="2" />
      <path d="M9 4V3a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1" />
      <polyline points="9 13 11 15 15 11" />
    </svg>
  );
}
function IconScan({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={IconStroke} aria-hidden>
      <path d="M3 7V5a2 2 0 0 1 2-2h2" />
      <path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
      <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
      <path d="M7 12h10" />
    </svg>
  );
}
function IconCompass({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={IconStroke} aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}
function IconArrowRight({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={IconStroke} aria-hidden>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

// ── Practice mode card ────────────────────────────────────────────────────
interface ModeCard {
  key: string;
  title: string;
  desc: string;
  cta: string;
  icon: React.ReactElement;
  to: string | null; // null → disabled
  disabledHint?: string;
}

function ModeCardButton({ card, onActivate }: { card: ModeCard; onActivate: (to: string) => void }) {
  const [hover, setHover] = React.useState(false);
  const disabled = card.to === null;
  return (
    <button
      type="button"
      onClick={() => card.to && onActivate(card.to)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      disabled={disabled}
      aria-disabled={disabled}
      title={disabled ? card.disabledHint : undefined}
      style={{
        appearance: "none",
        WebkitAppearance: "none",
        textAlign: "left",
        cursor: disabled ? "not-allowed" : "pointer",
        background: CARD_BG,
        border: `1px solid ${BORDER}`,
        borderRadius: 14,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 0,
        opacity: disabled ? 0.55 : 1,
        transition:
          "transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease",
        transform: hover && !disabled ? "translateY(-2px)" : "translateY(0)",
        boxShadow:
          hover && !disabled
            ? "0 8px 24px -12px rgba(15, 23, 42, 0.18)"
            : "0 1px 2px rgba(15, 23, 42, 0.04)",
        borderColor: hover && !disabled ? "hsl(220, 18%, 80%)" : BORDER,
        fontFamily: FONT_BODY,
        color: TEXT_FG,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: PRIMARY_GREEN_SOFT,
            color: PRIMARY_GREEN,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {card.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: "1.08rem",
              fontWeight: 600,
              color: TEXT_FG,
              margin: 0,
              marginBottom: 4,
              letterSpacing: "-0.005em",
            }}
          >
            {card.title}
          </h3>
          <p
            style={{
              fontSize: "0.85rem",
              lineHeight: 1.5,
              color: TEXT_MUTED,
              margin: 0,
              marginBottom: 12,
            }}
          >
            {card.desc}
          </p>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: "0.82rem",
              fontWeight: 600,
              color: disabled ? TEXT_MUTED : PRIMARY_GREEN,
            }}
          >
            {disabled ? card.disabledHint ?? card.cta : card.cta}
            {!disabled ? <IconArrowRight /> : null}
          </span>
        </div>
      </div>
    </button>
  );
}

// ── Mistake-aware tile (honest empty-state) ───────────────────────────────
function MistakeAwareTile({ onOpen }: { onOpen: () => void }) {
  const [hover, setHover] = React.useState(false);
  return (
    <div
      style={{
        background: CARD_BG,
        border: `1px solid ${BORDER}`,
        borderRadius: 14,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 32,
            height: 32,
            borderRadius: 8,
            background: ACCENT_SOFT,
            color: ACCENT_FG,
          }}
        >
          <IconScan size={18} />
        </span>
        <span
          style={{
            fontSize: "0.72rem",
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: ACCENT_FG,
          }}
        >
          Mistake-aware practice
        </span>
      </div>
      <p
        style={{
          fontSize: "0.92rem",
          lineHeight: 1.55,
          color: TEXT_FG,
          margin: 0,
        }}
      >
        Check an answer to unlock mistake-aware practice.
      </p>
      <p
        style={{
          fontSize: "0.82rem",
          lineHeight: 1.5,
          color: TEXT_MUTED,
          margin: 0,
        }}
      >
        Once you grade a few answers in Check &amp; Improve, this tile will
        recommend drills built from your real mistakes — not a sample feed.
      </p>
      <button
        type="button"
        onClick={onOpen}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          alignSelf: "flex-start",
          marginTop: 4,
          appearance: "none",
          WebkitAppearance: "none",
          background: hover ? PRIMARY_GREEN_SOFT : CARD_BG,
          border: `1px solid ${PRIMARY_GREEN}`,
          color: PRIMARY_GREEN,
          padding: "8px 14px",
          borderRadius: 10,
          fontSize: "0.85rem",
          fontWeight: 600,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          transition: "background 120ms ease",
        }}
      >
        Open Check &amp; Improve
        <IconArrowRight />
      </button>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────
const RETURN_TO = "/practice-hub";
const SOURCE = "practice" as const;

export default function DesktopPracticePage() {
  const navigate = useNavigate();
  const { grade, subject } = useSubjectContext();

  // Map the legacy subject string from useSubjectContext onto the
  // L2 DesktopSubject union. Default to "Maths" when uncertain — this only
  // pre-fills ScopeBuilder; the user is free to change it.
  const initialSubject: DesktopScopeValue["subject"] =
    subject === "Science" ? "Science" : "Maths";

  const [scope, setScope] = React.useState<DesktopScopeValue>({
    subject: initialSubject,
    stream: "All",
    scope: "topic",
    topicSlug: null,
    selectedTopicSlugs: [],
  });

  const topics = React.useMemo(
    () => desktopTopicsBySubject(scope.subject, scope.stream),
    [scope.subject, scope.stream],
  );
  const validScope = isDesktopScopeValueValid(scope);
  const selectedTopic = scope.topicSlug ? desktopTopicBySlug(scope.topicSlug) : undefined;
  const blueprintContent =
    scope.scope === "topic" && scope.topicSlug
      ? desktopTopicHubContentBySlug(scope.topicSlug)
      : undefined;

  // Build the legacy `/practice/:grade/:subject` path with optional flags +
  // honest source/returnTo trail. Used for the practice + timed CTAs since
  // the L2 helpers point back at /practice-hub itself.
  const buildLegacyPracticePath = (params: { timed?: boolean; topic?: string }): string => {
    const sp = new URLSearchParams();
    if (params.topic) sp.set("topic", params.topic);
    if (params.timed) sp.set("timed", "1");
    sp.set("source", SOURCE);
    sp.set("returnTo", RETURN_TO);
    return withQuery(`/practice/${grade}/${subject}`, sp);
  };

  const buildPredictedPath = (): string => {
    const sp = new URLSearchParams();
    sp.set("source", SOURCE);
    sp.set("returnTo", RETURN_TO);
    return withQuery(`/highly-probable/${grade}/${subject}`, sp);
  };

  const buildMockPath = (): string => {
    const sp = new URLSearchParams();
    sp.set("source", SOURCE);
    sp.set("returnTo", RETURN_TO);
    return withQuery(`/exam-simulation`, sp);
  };

  // Worksheet helper — uses the real L2 helper which already targets
  // /practice/worksheets and forwards scope to that page.
  const worksheetPath = (() => {
    if (scope.scope === "topic" && scope.topicSlug) {
      return buildDesktopWorksheetPath({
        scope: "topic",
        subject: scope.subject,
        stream: scope.stream,
        topic: scope.topicSlug,
        source: SOURCE,
        returnTo: RETURN_TO,
      });
    }
    if (scope.scope === "multi-topic" && scope.selectedTopicSlugs.length >= 2) {
      return buildDesktopWorksheetPath({
        scope: "multi-topic",
        subject: scope.subject,
        stream: scope.stream,
        topics: scope.selectedTopicSlugs,
        source: SOURCE,
        returnTo: RETURN_TO,
      });
    }
    if (scope.scope === "full-subject") {
      return buildDesktopWorksheetPath({
        scope: "full-subject",
        subject: scope.subject,
        stream: scope.stream,
        source: SOURCE,
        returnTo: RETURN_TO,
      });
    }
    return null;
  })();

  // Mode cards — disabled when scope is not satisfied for that mode.
  const modeCards: ModeCard[] = [
    {
      key: "topic",
      title: "Topic drill",
      desc: "Focused set on the single topic you picked above.",
      cta: "Start topic drill",
      icon: <IconLayers />,
      to:
        scope.scope === "topic" && scope.topicSlug
          ? buildLegacyPracticePath({ topic: scope.topicSlug })
          : null,
      disabledHint: "Pick a single topic above to enable",
    },
    {
      key: "multi-topic",
      title: "Multi-topic mix",
      desc: "Shuffled questions across the topics you selected.",
      cta: "Start mix",
      icon: <IconShuffle />,
      to:
        scope.scope === "multi-topic" && scope.selectedTopicSlugs.length >= 2
          ? buildLegacyPracticePath({})
          : null,
      disabledHint: "Switch scope to Multi-topic and pick 2+ topics",
    },
    {
      key: "timed",
      title: "Timed drill",
      desc: "Beat-the-clock practice. Builds exam-day pace + pressure tolerance.",
      cta: "Start timer",
      icon: <IconTimer />,
      to: validScope
        ? buildLegacyPracticePath({
            timed: true,
            topic: scope.scope === "topic" && scope.topicSlug ? scope.topicSlug : undefined,
          })
        : null,
      disabledHint: "Pick a scope above first",
    },
    {
      key: "worksheet",
      title: "Worksheet",
      desc: "Printable PDF with mixed sections (A → E). Board-pattern aligned.",
      cta: "Open worksheet generator",
      icon: <IconWorksheet />,
      to: worksheetPath,
      disabledHint: "Pick a scope above first",
    },
    {
      key: "predicted",
      title: "Predicted questions",
      desc: "Most-likely 2026 board questions, ranked by probability.",
      cta: "View predicted Qs",
      icon: <IconSparkles />,
      to: buildPredictedPath(),
    },
    {
      key: "full-mock",
      title: "Full mock paper",
      desc: "Full-length board pattern. Auto-graded with mistake breakdown.",
      cta: "Take a mock",
      icon: <IconClipboard />,
      to: buildMockPath(),
    },
  ];

  const goCheck = () =>
    navigate(buildDesktopCheckPath(scope.topicSlug ?? undefined, { source: SOURCE, returnTo: RETURN_TO }));
  const goTopicHub = () => {
    if (!scope.topicSlug) return;
    navigate(buildDesktopTopicHubPath(scope.topicSlug, { source: SOURCE, returnTo: RETURN_TO }));
  };

  // Header chips — describe the active scope honestly.
  const chips = [
    { label: scope.subject, tone: "accent" as const },
    ...(scope.subject === "Science" && scope.stream !== "All"
      ? [{ label: scope.stream, tone: "info" as const }]
      : []),
    {
      label:
        scope.scope === "topic"
          ? selectedTopic
            ? `Topic: ${selectedTopic.name}`
            : "Topic: pick one"
          : scope.scope === "multi-topic"
            ? `Multi-topic: ${scope.selectedTopicSlugs.length} picked`
            : `Full subject`,
      tone: "neutral" as const,
    },
  ];

  return (
    <div
      style={{
        padding: "32px 32px 56px",
        maxWidth: 1180,
        margin: "0 auto",
        fontFamily: FONT_BODY,
        color: TEXT_FG,
      }}
    >
      <ContextBar
        eyebrow="Practice"
        title="What kind of practice tonight?"
        subtitle="Pick a scope on the left, then jump into the mode that matches your goal. Every CTA routes to your existing practice flows — nothing here generates a new paper on its own."
        chips={chips}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.2fr)",
          gap: 24,
          alignItems: "start",
        }}
      >
        {/* LEFT — scope */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <ScopeBuilder
            topics={topics}
            value={scope}
            onChange={setScope}
            title="Suggested topics"
          />

          {/* Honest disclaimer about the curated topic catalog */}
          <p
            style={{
              margin: 0,
              padding: "10px 14px",
              border: `1px dashed ${BORDER}`,
              background: PILL_BG,
              borderRadius: 10,
              fontSize: "0.8rem",
              lineHeight: 1.5,
              color: TEXT_MUTED,
            }}
          >
            Showing a starter set of high-yield topics from the desktop bridge,
            not the full chapter list. Use the existing chapter pages for
            anything outside this short list.
          </p>

          {/* Optional truthful blueprint preview — single topic only */}
          {blueprintContent ? (
            <PaperBlueprint
              title={`Blueprint preview · ${blueprintContent.topic.name}`}
              sections={blueprintContent.blueprint}
              totalMarks={blueprintContent.totalMarks}
            />
          ) : null}
        </div>

        {/* RIGHT — modes + mistake tile */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <section
            style={{
              background: CARD_BG,
              border: `1px solid ${BORDER}`,
              borderRadius: 16,
              padding: 20,
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <header style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: PRIMARY_GREEN,
                }}
              >
                Practice modes
              </span>
              <h2
                style={{
                  fontFamily: FONT_DISPLAY,
                  margin: 0,
                  fontSize: "1.3rem",
                  fontWeight: 600,
                  color: TEXT_FG,
                  letterSpacing: "-0.01em",
                }}
              >
                Pick how you want to practise
              </h2>
              <p
                style={{
                  margin: 0,
                  marginTop: 2,
                  fontSize: "0.85rem",
                  color: TEXT_MUTED,
                  lineHeight: 1.5,
                }}
              >
                {scope.scope === "multi-topic" && scope.selectedTopicSlugs.length > 0
                  ? `Active mix: ${displayDesktopTopicNames(scope.selectedTopicSlugs).join(", ")}`
                  : selectedTopic
                    ? `Focused on ${selectedTopic.name}.`
                    : "Pick a scope on the left to enable topic / multi-topic / worksheet."}
              </p>
            </header>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 12,
              }}
            >
              {modeCards.map((card) => (
                <ModeCardButton
                  key={card.key}
                  card={card}
                  onActivate={(to) => navigate(to)}
                />
              ))}
            </div>
          </section>

          <MistakeAwareTile onOpen={goCheck} />

          {/* Single-topic shortcut row — only when a topic is picked */}
          {selectedTopic ? (
            <div
              style={{
                background: CARD_BG,
                border: `1px solid ${BORDER}`,
                borderRadius: 14,
                padding: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                <span
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: PRIMARY_GREEN_SOFT,
                    color: PRIMARY_GREEN,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <IconCompass />
                </span>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: "0.92rem",
                      fontWeight: 600,
                      color: TEXT_FG,
                      lineHeight: 1.3,
                    }}
                  >
                    Open the Topic Hub for {selectedTopic.name}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: TEXT_MUTED }}>
                    Notes, refresher and previous-year questions for this topic.
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={goTopicHub}
                style={{
                  appearance: "none",
                  WebkitAppearance: "none",
                  background: PRIMARY_GREEN,
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 10,
                  padding: "8px 14px",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  flexShrink: 0,
                }}
              >
                Open Topic Hub
                <IconArrowRight />
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
