import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSubjectContext } from "../../hooks/useSubjectContext";
import { ContextBar } from "../../components/desktop/l2/ContextBar";
import { BackToParent } from "../../components/desktop/l2/BackToParent";
import { MistakeIntelligencePanel } from "../../components/desktop/l2/MistakeIntelligencePanel";
import {
  buildDesktopCheckPath,
  buildDesktopWorksheetPath,
} from "../../lib/desktop/navigation";
import { generatePracticeQuestions } from "../../data/predictionDataService";
import type { LTSubjectKey } from "../../data/predictionTypes";
import { sectionScopeLabel } from "../../components/practice/worksheetGenerator";
import type {
  WorksheetOptions,
  SectionScope,
} from "../../components/practice/worksheetGenerator";

/**
 * DesktopWorksheetsPage — Level 2 graduation (PR-D, parity correction pass).
 *
 * Reference (final desktop prototype):
 *   chetan-anand-hub/topic-focus-lite — src/pages/WorksheetPage.tsx
 *
 * Mobile parity: this page is a desktop sibling of
 *   lazytopper/src/pages/app/Worksheets.tsx
 * It uses the EXACT same generation contract:
 *   - same MATHS_TOPICS / SCIENCE_TOPICS / PRESETS / SECTIONS / DIFFICULTIES
 *   - same generatePracticeQuestions argument shape
 *   - same WorksheetOptions output shape
 *   - same navigate("/practice/worksheets/ready", { state: { opts } })
 * so the existing WorksheetReady page works for both desktop and mobile
 * without modification. Mobile Worksheets.tsx is NOT touched.
 *
 * Composition (single file, mirrors prototype shape):
 *   1. BackToParent — returns to /practice-hub or to ?source/?returnTo if set
 *   2. ContextBar — intent-first header, with right-slot mistake-aware toggle
 *      that is honestly disabled because real per-learner mistake data is
 *      not yet wired into the desktop graduation surface
 *   3. ScopeBuilder-shaped card (left) — Subject + Stream (Science only) +
 *      Scope mode (Single topic enabled; Multi-topic & Full subject visible
 *      but disabled with honest copy) + Topic single-select list
 *   4. Build-mode card (left) — Preset list OR Custom (difficulty + count)
 *   5. Worksheet preview card (right) — preview line/chip, Section A–E
 *      checkbox-style rows (interactive in custom mode, locked in preset
 *      mode), format chips, honest summary list, error message, Generate
 *      CTA, Save worksheet (honestly disabled), Upload your answers (links
 *      to /check-improve with source/returnTo)
 *   6. MistakeIntelligencePanel (right) — empty-state copy that points to
 *      Check & Improve to unlock mistake-focus worksheets
 *
 * Production constraints:
 *   - Inline styles only (no Tailwind, no shadcn classes).
 *   - Inline SVG only (no lucide-react).
 *   - Light theme tokens shared with DesktopShell + DesktopHome + DesktopPracticePage.
 *   - No new npm dependency. No PR #17 imports. No invented learner mistake
 *     data. No new generator — reuses the exact production generator the
 *     mobile Worksheets page already uses.
 */

// ── Mirror mobile constants exactly so generation behavior is identical. ──
//    Source: lazytopper/src/pages/app/Worksheets.tsx
const MATHS_TOPICS = [
  { key: "real-numbers",              label: "Real Numbers" },
  { key: "polynomials",               label: "Polynomials" },
  { key: "pair-of-linear-equations",  label: "Linear Equations" },
  { key: "quadratic-equations",       label: "Quadratic Equations" },
  { key: "arithmetic-progression",    label: "Arithmetic Progression" },
  { key: "triangles",                 label: "Triangles" },
  { key: "coordinate-geometry",       label: "Coordinate Geometry" },
  { key: "circles",                   label: "Circles" },
  { key: "areas-related-to-circles",  label: "Areas Related to Circles" },
  { key: "surface-areas-and-volumes", label: "Surface Areas & Volumes" },
  { key: "trigonometry",              label: "Trigonometry" },
  { key: "statistics",                label: "Statistics" },
  { key: "probability",               label: "Probability" },
];

type ScienceStream = "All" | "Physics" | "Chemistry" | "Biology";

interface ScienceTopic {
  key: string;
  label: string;
  stream: Exclude<ScienceStream, "All">;
}

const SCIENCE_TOPICS: ScienceTopic[] = [
  { key: "chemical-reactions-equations", label: "Chemical Reactions",            stream: "Chemistry" },
  { key: "acids-bases-salts",            label: "Acids, Bases & Salts",          stream: "Chemistry" },
  { key: "metals-non-metals",            label: "Metals & Non-Metals",           stream: "Chemistry" },
  { key: "carbon-and-its-compounds",     label: "Carbon Compounds",              stream: "Chemistry" },
  { key: "life-processes",               label: "Life Processes",                stream: "Biology"   },
  { key: "control-and-coordination",     label: "Control & Coordination",        stream: "Biology"   },
  { key: "reproduction",                 label: "Reproduction",                  stream: "Biology"   },
  { key: "heredity-and-evolution",       label: "Heredity & Evolution",          stream: "Biology"   },
  { key: "light",                        label: "Light – Reflection & Refraction", stream: "Physics" },
  { key: "electricity",                  label: "Electricity",                   stream: "Physics"   },
  { key: "magnetic-effects",             label: "Magnetic Effects of Current",   stream: "Physics"   },
  { key: "our-environment",              label: "Our Environment",               stream: "Biology"   },
];

interface PresetConfig {
  key: string;
  label: string;
  desc: string;
  sections: SectionScope;
  difficulty: "All" | "Easy" | "Medium" | "Hard";
  count: number;
}

const PRESETS: PresetConfig[] = [
  {
    key: "board-mix",
    label: "Board exam mix",
    desc: "All sections A–E · All difficulty · 25 questions",
    sections: "All",
    difficulty: "All",
    count: 25,
  },
  {
    key: "quick-drill",
    label: "Quick drill",
    desc: "Sections A–B · All difficulty · 15 questions",
    sections: ["A", "B"],
    difficulty: "All",
    count: 15,
  },
  {
    key: "marks-focus",
    label: "High-marks focus",
    desc: "Sections C–E · Hard difficulty · 20 questions",
    sections: ["C", "D", "E"],
    difficulty: "Hard",
    count: 20,
  },
];

const ALL_SECTIONS = ["A", "B", "C", "D", "E"] as const;
type SectionId = typeof ALL_SECTIONS[number];

interface SectionMeta {
  id: SectionId;
  label: string;
}

// Prototype-shape section labels (mark weight + format hint).
const SECTION_META: SectionMeta[] = [
  { id: "A", label: "Section A · MCQ / Assertion-Reason (1m)" },
  { id: "B", label: "Section B · Short Answer I (2m)" },
  { id: "C", label: "Section C · Short Answer II (3m)" },
  { id: "D", label: "Section D · Long Answer (5m)" },
  { id: "E", label: "Section E · Case-based (4m)" },
];

const FORMAT_CHIPS = [
  "MCQ",
  "Short answer",
  "Long answer",
  "Case-based",
  "Assertion-Reason",
  "Diagram",
  "Numerical",
  "Proof",
];

const DIFFICULTIES = ["All", "Easy", "Medium", "Hard"] as const;

type Mode = "preset" | "custom";
type PaperScope = "topic" | "multi-topic" | "full-subject";

// ── Tokens (parity with DesktopPracticePage) ──────────────────────────────
const PRIMARY_GREEN = "hsl(152, 55%, 45%)";
const PRIMARY_GREEN_SOFT = "hsl(152, 55%, 95%)";
const PRIMARY_GREEN_FG = "hsl(152, 55%, 28%)";
const TEXT_FG = "hsl(220, 25%, 12%)";
const TEXT_MUTED = "hsl(220, 15%, 42%)";
const BORDER = "hsl(220, 18%, 90%)";
const CARD_BG = "#ffffff";
const PILL_BG = "hsl(210, 33%, 96%)";
const DISABLED_FG = "hsl(220, 12%, 60%)";
const DANGER_FG = "hsl(0, 65%, 38%)";
const DANGER_BG = "hsl(0, 75%, 96%)";
const DANGER_BORDER = "hsl(0, 70%, 88%)";

const FONT_DISPLAY =
  '"Fraunces", "Source Serif Pro", Georgia, "Times New Roman", serif';
const FONT_BODY =
  '"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';

const IconStroke: React.CSSProperties = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

function IconWorksheet({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={IconStroke} aria-hidden>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="9" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="13" y2="17" />
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
function IconLock({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={IconStroke} aria-hidden>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
function IconSave({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={IconStroke} aria-hidden>
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: PRIMARY_GREEN,
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  );
}

function ScopeButton({
  active,
  disabled,
  onClick,
  children,
  title,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      title={title}
      style={{
        appearance: "none",
        WebkitAppearance: "none",
        border: `1px solid ${active ? PRIMARY_GREEN : BORDER}`,
        background: active ? PRIMARY_GREEN_SOFT : CARD_BG,
        color: disabled ? DISABLED_FG : (active ? PRIMARY_GREEN_FG : TEXT_FG),
        padding: "6px 12px",
        borderRadius: 8,
        fontSize: 13,
        fontWeight: active ? 600 : 500,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.7 : 1,
        fontFamily: FONT_BODY,
        transition: "background 120ms ease, border-color 120ms ease, color 120ms ease",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      {children}
    </button>
  );
}

function Pill({
  active,
  onClick,
  children,
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        appearance: "none",
        WebkitAppearance: "none",
        border: `1px solid ${active ? PRIMARY_GREEN : BORDER}`,
        background: active ? PRIMARY_GREEN_SOFT : CARD_BG,
        color: active ? PRIMARY_GREEN_FG : TEXT_MUTED,
        padding: "6px 12px",
        borderRadius: 999,
        fontSize: 13,
        fontWeight: active ? 700 : 500,
        cursor: "pointer",
        fontFamily: FONT_BODY,
        transition: "background 120ms ease, border-color 120ms ease, color 120ms ease",
      }}
    >
      {children}
    </button>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────
export default function DesktopWorksheetsPage() {
  const navigate = useNavigate();
  const ctx = useSubjectContext();

  const [subject, setSubject] = React.useState<"Maths" | "Science">(
    (ctx.subject as "Maths" | "Science") || "Maths",
  );
  const [stream, setStream]   = React.useState<ScienceStream>("All");
  // Multi-topic and full-subject are honest scope shapes from the prototype.
  // The production worksheet generator currently only supports a single
  // topic, so those scope modes are visible but disabled — see ScopeBuilder
  // section below. Default scope is the supported "topic" mode.
  const [paperScope, setPaperScope] = React.useState<PaperScope>("topic");

  const topics = subject === "Maths"
    ? MATHS_TOPICS
    : SCIENCE_TOPICS.filter((t) => stream === "All" || t.stream === stream);

  const [topicKey, setTopicKey] = React.useState(topics[0].key);

  // Re-sync topicKey whenever the visible topic list changes (subject or
  // science stream filter changed) so we never keep a stale slug.
  React.useEffect(() => {
    if (!topics.find((t) => t.key === topicKey)) {
      setTopicKey(topics[0].key);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject, stream]);

  const [mode, setMode]             = React.useState<Mode>("preset");
  const [preset, setPreset]         = React.useState<string>("board-mix");
  const [customSections, setCustomSections] =
    React.useState<SectionId[]>([...ALL_SECTIONS]);
  const [difficulty, setDifficulty] =
    React.useState<typeof DIFFICULTIES[number]>("All");
  const [count, setCount]           = React.useState(20);
  const [generating, setGenerating] = React.useState(false);
  const [error, setError]           = React.useState<string | null>(null);

  function switchSubject(s: "Maths" | "Science") {
    setSubject(s);
    if (s === "Maths") setStream("All");
  }

  function toggleCustomSection(id: SectionId) {
    setCustomSections((prev) => {
      if (prev.includes(id)) {
        // Always keep at least one section selected so generation never
        // produces an empty sections filter accidentally.
        const next = prev.filter((s) => s !== id);
        return next.length === 0 ? prev : next;
      }
      return [...prev, id];
    });
  }

  // Compute effective scope for both UI preview and generation.
  const activePreset = PRESETS.find((p) => p.key === preset)!;
  const effectiveDifficulty = mode === "preset" ? activePreset.difficulty : difficulty;
  const effectiveCount      = mode === "preset" ? activePreset.count      : count;
  const effectiveSections: SectionScope = (() => {
    if (mode === "preset") return activePreset.sections;
    if (customSections.length === ALL_SECTIONS.length) return "All";
    return [...customSections].sort();
  })();

  const topicLabel = topics.find((t) => t.key === topicKey)?.label ?? topicKey;

  // Which section IDs should appear "checked" in the preview card.
  const previewActiveSections: Set<string> = (() => {
    if (effectiveSections === "All") return new Set<string>(ALL_SECTIONS);
    return new Set<string>(effectiveSections as string[]);
  })();

  // Honest preview chip line (mirrors prototype previewLine shape).
  const previewLine = (() => {
    const scopeStr = sectionScopeLabel(effectiveSections);
    return `${topicLabel} worksheet · ${scopeStr} · ${effectiveCount} questions`;
  })();

  // ContextBar chips
  const chips = [
    { label: subject, tone: "accent" as const },
    { label: "Class 10 · CBSE", tone: "info" as const },
    { label: `Topic: ${topicLabel}`, tone: "neutral" as const },
    {
      label: mode === "preset" ? `Preset: ${activePreset.label}` : "Custom filters",
      tone: "neutral" as const,
    },
  ];

  // Build the current desktop-worksheet path so Upload-your-answers can
  // round-trip the user back to the exact same scope (source + returnTo).
  const currentWorksheetPath = buildDesktopWorksheetPath({
    scope: paperScope,
    subject,
    stream,
    topic: paperScope === "topic" ? topicKey : undefined,
    source: "worksheet",
  });

  const checkPath = buildDesktopCheckPath(topicKey, {
    source: "worksheet",
    returnTo: currentWorksheetPath,
  });

  // Keep the same generation contract the mobile page uses.
  // Source: lazytopper/src/pages/app/Worksheets.tsx — handleGenerate
  async function handleGenerate() {
    setError(null);
    setGenerating(true);
    try {
      const sectionsArg: string[] | undefined =
        effectiveSections === "All" ? undefined : (effectiveSections as string[]);

      const questions = generatePracticeQuestions({
        subject: subject as LTSubjectKey,
        topicKey,
        count: effectiveCount,
        difficulty: effectiveDifficulty === "All" ? undefined : effectiveDifficulty as never,
        sections: sectionsArg,
        // Worksheets must never repeat questions to inflate count — same
        // contract mobile uses. A smaller result means the bank genuinely
        // has fewer matching unique questions.
        allowRepeats: false,
      });

      if (questions.length === 0) {
        const scopeStr = sectionScopeLabel(effectiveSections);
        setError(
          `No questions found for ${scopeStr} in this topic. ` +
          `Try a different topic or the "Board exam mix" preset for full coverage.`,
        );
        setGenerating(false);
        return;
      }

      const opts: WorksheetOptions = {
        topicLabel,
        subjectKey: subject,
        grade: "10",
        difficulty: effectiveDifficulty,
        sectionFilter: effectiveSections,
        questions,
      };

      navigate("/practice/worksheets/ready", { state: { opts } });
    } catch {
      setError("Worksheet generation failed. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  // Mistake-aware mini-toggle: kept in the prototype's right-of-ContextBar
  // slot, but honestly disabled because real per-learner mistake intel is
  // not yet wired into the desktop graduation surface.
  const mistakeToggleNote =
    "Grade an answer in Check & Improve to unlock mistake-focus worksheets.";

  const mistakeToggle = (
    <span
      title={mistakeToggleNote}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 10px",
        background: PILL_BG,
        border: `1px solid ${BORDER}`,
        borderRadius: 999,
        color: TEXT_MUTED,
        fontSize: 12,
        fontWeight: 500,
        cursor: "not-allowed",
        opacity: 0.85,
        fontFamily: FONT_BODY,
      }}
      aria-disabled="true"
    >
      <input
        type="checkbox"
        checked={false}
        readOnly
        disabled
        style={{ accentColor: PRIMARY_GREEN, cursor: "not-allowed" }}
        aria-label="Add mistake-focus mini-section (not yet available)"
      />
      <IconLock />
      Add mistake-focus mini-section
    </span>
  );

  return (
    <div
      style={{
        padding: "24px 32px 56px",
        maxWidth: 1180,
        margin: "0 auto",
        fontFamily: FONT_BODY,
        color: TEXT_FG,
      }}
    >
      <BackToParent
        fallbackPath="/practice-hub"
        fallbackLabel="Back to Practice"
      />

      <ContextBar
        eyebrow="Practice · Worksheet"
        title="What worksheet do you want to build?"
        subtitle="Pick a topic, then choose a board-pattern preset or set your own filters. Nothing is generated until you press Generate — the preview on the right shows exactly what will come out."
        chips={chips}
        right={mistakeToggle}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
          gap: 24,
          alignItems: "start",
        }}
      >
        {/* ── LEFT — setup panel ───────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* ── ScopeBuilder-shaped card (subject / stream / scope / topic) ── */}
          <section
            style={{
              background: CARD_BG,
              border: `1px solid ${BORDER}`,
              borderRadius: 16,
              padding: 20,
              display: "flex",
              flexDirection: "column",
              gap: 18,
            }}
          >
            <h3
              style={{
                fontFamily: FONT_DISPLAY,
                fontSize: 17,
                fontWeight: 600,
                color: TEXT_FG,
                margin: 0,
              }}
            >
              Study scope
            </h3>

            {/* Subject */}
            <div>
              <SectionLabel>Subject</SectionLabel>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {(["Maths", "Science"] as const).map((s) => (
                  <ScopeButton
                    key={s}
                    active={subject === s}
                    onClick={() => switchSubject(s)}
                  >
                    {s}
                  </ScopeButton>
                ))}
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "4px 10px",
                    borderRadius: 999,
                    background: PILL_BG,
                    color: TEXT_MUTED,
                    border: `1px solid ${BORDER}`,
                    fontSize: 12,
                    fontWeight: 500,
                    marginLeft: "auto",
                  }}
                >
                  Class 10 · CBSE
                </span>
              </div>
            </div>

            {/* Stream — Science only */}
            {subject === "Science" ? (
              <div>
                <SectionLabel>Stream</SectionLabel>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {(["All", "Physics", "Chemistry", "Biology"] as ScienceStream[]).map((st) => (
                    <ScopeButton
                      key={st}
                      active={stream === st}
                      onClick={() => setStream(st)}
                    >
                      {st}
                    </ScopeButton>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Scope mode */}
            <div>
              <SectionLabel>Scope</SectionLabel>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <ScopeButton
                  active={paperScope === "topic"}
                  onClick={() => setPaperScope("topic")}
                >
                  Single topic
                </ScopeButton>
                <ScopeButton
                  active={false}
                  disabled
                  onClick={() => {}}
                  title="Multi-topic worksheets aren't available on desktop yet — generation currently uses one topic at a time."
                >
                  <IconLock /> Multi-topic
                </ScopeButton>
                <ScopeButton
                  active={false}
                  disabled
                  onClick={() => {}}
                  title="Full-subject worksheets aren't available on desktop yet — generation currently uses one topic at a time."
                >
                  <IconLock /> Full subject
                </ScopeButton>
              </div>
              <p
                style={{
                  margin: "8px 0 0",
                  fontSize: 12,
                  color: TEXT_MUTED,
                  lineHeight: 1.5,
                }}
              >
                Multi-topic and full-subject worksheets aren&rsquo;t available on
                desktop yet — generation currently uses the single selected
                topic from the list below.
              </p>
            </div>

            {/* Topic single-select */}
            <div>
              <SectionLabel>Topic</SectionLabel>
              <ul
                style={{
                  listStyle: "none",
                  margin: 0,
                  padding: 0,
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                  gap: 8,
                  maxHeight: 264,
                  overflowY: "auto",
                  paddingRight: 4,
                }}
              >
                {topics.map((t) => {
                  const checked = topicKey === t.key;
                  return (
                    <li key={t.key}>
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "10px 12px",
                          border: `1px solid ${checked ? PRIMARY_GREEN : BORDER}`,
                          background: checked ? PRIMARY_GREEN_SOFT : PILL_BG,
                          borderRadius: 10,
                          cursor: "pointer",
                          fontSize: 13,
                          fontWeight: checked ? 600 : 500,
                          color: checked ? PRIMARY_GREEN_FG : TEXT_FG,
                          lineHeight: 1.3,
                        }}
                      >
                        <input
                          type="radio"
                          name="desktop-worksheet-topic"
                          checked={checked}
                          onChange={() => setTopicKey(t.key)}
                          style={{ accentColor: PRIMARY_GREEN, marginTop: 0 }}
                        />
                        <span style={{ minWidth: 0 }}>{t.label}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>

          {/* Mode tabs */}
          <section
            style={{
              background: CARD_BG,
              border: `1px solid ${BORDER}`,
              borderRadius: 16,
              padding: 20,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <SectionLabel>Build mode</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {(["preset", "custom"] as Mode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  style={{
                    appearance: "none",
                    WebkitAppearance: "none",
                    padding: "14px 14px",
                    borderRadius: 12,
                    border: mode === m
                      ? `2px solid ${PRIMARY_GREEN}`
                      : `1px solid ${BORDER}`,
                    background: mode === m ? PRIMARY_GREEN_SOFT : CARD_BG,
                    color: TEXT_FG,
                    textAlign: "left",
                    cursor: "pointer",
                    fontFamily: FONT_BODY,
                    transition: "border 0.15s, background 0.15s",
                  }}
                >
                  <div
                    style={{
                      fontFamily: FONT_DISPLAY,
                      fontWeight: 600,
                      fontSize: "1rem",
                      marginBottom: 4,
                    }}
                  >
                    {m === "preset" ? "Preset board mix" : "Custom filters"}
                  </div>
                  <div style={{ fontSize: 12, color: TEXT_MUTED, lineHeight: 1.5 }}>
                    {m === "preset"
                      ? "Curated board-pattern combinations"
                      : "You control sections, difficulty, and count"}
                  </div>
                </button>
              ))}
            </div>

            {/* Preset list */}
            {mode === "preset" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {PRESETS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setPreset(p.key)}
                    style={{
                      appearance: "none",
                      WebkitAppearance: "none",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: 12,
                      border: preset === p.key
                        ? `2px solid ${PRIMARY_GREEN}`
                        : `1px solid ${BORDER}`,
                      background: preset === p.key ? PRIMARY_GREEN_SOFT : CARD_BG,
                      cursor: "pointer",
                      textAlign: "left",
                      color: TEXT_FG,
                      fontFamily: FONT_BODY,
                      transition: "border 0.15s, background 0.15s",
                    }}
                  >
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        border: preset === p.key
                          ? `5px solid ${PRIMARY_GREEN}`
                          : `2px solid ${BORDER}`,
                        flexShrink: 0,
                        transition: "border 0.15s",
                      }}
                      aria-hidden
                    />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{p.label}</div>
                      <div style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 2 }}>
                        {p.desc}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Custom controls */}
            {mode === "custom" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <SectionLabel>Difficulty</SectionLabel>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {DIFFICULTIES.map((d) => (
                      <Pill key={d} active={difficulty === d} onClick={() => setDifficulty(d)}>
                        {d}
                      </Pill>
                    ))}
                  </div>
                </div>

                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 8,
                    }}
                  >
                    <SectionLabel>Question count</SectionLabel>
                    <span
                      style={{
                        fontFamily: FONT_DISPLAY,
                        fontWeight: 700,
                        fontSize: 16,
                        color: PRIMARY_GREEN,
                      }}
                    >
                      {count}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={50}
                    step={5}
                    value={count}
                    onChange={(e) => setCount(Number(e.target.value))}
                    style={{ width: "100%", accentColor: PRIMARY_GREEN }}
                  />
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 11,
                      color: TEXT_MUTED,
                      marginTop: 4,
                    }}
                  >
                    <span>5</span><span>50</span>
                  </div>
                  <p
                    style={{
                      margin: "8px 0 0",
                      fontSize: 11,
                      color: TEXT_MUTED,
                      lineHeight: 1.5,
                    }}
                  >
                    Toggle sections in the worksheet preview on the right.
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* ── RIGHT — preview / blueprint + mistake panel ─────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <section
            style={{
              background: CARD_BG,
              border: `1px solid ${BORDER}`,
              borderRadius: 16,
              padding: 20,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <header style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <SectionLabel>Worksheet preview</SectionLabel>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <h2
                  style={{
                    fontFamily: FONT_DISPLAY,
                    margin: 0,
                    fontSize: "1.3rem",
                    fontWeight: 600,
                    letterSpacing: "-0.005em",
                    color: TEXT_FG,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <IconWorksheet size={20} />
                  Will be generated
                </h2>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "4px 10px",
                    borderRadius: 999,
                    fontSize: 12,
                    background: PRIMARY_GREEN_SOFT,
                    color: PRIMARY_GREEN_FG,
                    border: `1px solid ${BORDER}`,
                    fontWeight: 500,
                  }}
                >
                  {previewLine}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: TEXT_MUTED, lineHeight: 1.5 }}>
                Honest summary of the request. The actual question set is built
                only when you press Generate.
              </p>
            </header>

            {/* Sections checkbox-style rows (prototype shape) */}
            <div>
              <SectionLabel>Sections</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {SECTION_META.map((s) => {
                  const checked = previewActiveSections.has(s.id);
                  const isCustom = mode === "custom";
                  return (
                    <label
                      key={s.id}
                      title={
                        isCustom
                          ? undefined
                          : "Section selection is locked by the active preset. Switch to Custom filters to edit."
                      }
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: `1px solid ${checked ? PRIMARY_GREEN : BORDER}`,
                        background: checked ? PRIMARY_GREEN_SOFT : PILL_BG,
                        cursor: isCustom ? "pointer" : "not-allowed",
                        opacity: isCustom ? 1 : 0.95,
                        fontSize: 13,
                        color: checked ? PRIMARY_GREEN_FG : TEXT_FG,
                        fontWeight: checked ? 600 : 500,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={!isCustom}
                        onChange={() => {
                          if (isCustom) toggleCustomSection(s.id);
                        }}
                        style={{ accentColor: PRIMARY_GREEN }}
                      />
                      <span>{s.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Format chips (informational, mirrors prototype) */}
            <div>
              <SectionLabel>Formats</SectionLabel>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {FORMAT_CHIPS.map((f) => (
                  <span
                    key={f}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "4px 10px",
                      borderRadius: 999,
                      fontSize: 12,
                      background: PILL_BG,
                      color: TEXT_MUTED,
                      border: `1px solid ${BORDER}`,
                      fontWeight: 500,
                    }}
                  >
                    {f}
                  </span>
                ))}
              </div>
              <p
                style={{
                  margin: "6px 0 0",
                  fontSize: 11,
                  color: TEXT_MUTED,
                  lineHeight: 1.5,
                }}
              >
                Format mix is set by the question bank for the selected
                sections — no per-format filter on desktop yet.
              </p>
            </div>

            {/* Honest summary list */}
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
              <SummaryRow label="Subject" value={subject} />
              <SummaryRow
                label="Stream"
                value={subject === "Science" ? stream : "—"}
              />
              <SummaryRow label="Class" value="Class 10 · CBSE" />
              <SummaryRow label="Topic" value={topicLabel} />
              <SummaryRow
                label="Sections"
                value={sectionScopeLabel(effectiveSections)}
              />
              <SummaryRow
                label="Difficulty"
                value={effectiveDifficulty === "All" ? "All levels" : effectiveDifficulty}
              />
              <SummaryRow label="Question count" value={String(effectiveCount)} accent />
            </ul>

            {error ? (
              <div
                role="alert"
                style={{
                  padding: "12px 14px",
                  borderRadius: 10,
                  background: DANGER_BG,
                  border: `1px solid ${DANGER_BORDER}`,
                  color: DANGER_FG,
                  fontSize: 13,
                  lineHeight: 1.5,
                }}
              >
                {error}
              </div>
            ) : null}

            {/* Actions: Generate (primary) · Save (disabled) · Upload (link) */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                paddingTop: 8,
                borderTop: `1px solid ${BORDER}`,
              }}
            >
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating}
                style={{
                  appearance: "none",
                  WebkitAppearance: "none",
                  width: "100%",
                  height: 48,
                  borderRadius: 12,
                  border: "none",
                  background: generating ? "hsl(152, 30%, 75%)" : PRIMARY_GREEN,
                  color: "#ffffff",
                  fontFamily: FONT_BODY,
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: generating ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  transition: "background 120ms ease",
                }}
              >
                <IconWorksheet />
                {generating ? "Generating…" : `Generate ${topicLabel} worksheet`}
                {!generating ? <IconArrowRight /> : null}
              </button>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  disabled
                  title="Save worksheet is not available yet on desktop."
                  style={{
                    appearance: "none",
                    WebkitAppearance: "none",
                    flex: "1 1 180px",
                    height: 40,
                    borderRadius: 10,
                    border: `1px solid ${BORDER}`,
                    background: PILL_BG,
                    color: DISABLED_FG,
                    fontFamily: FONT_BODY,
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: "not-allowed",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    opacity: 0.85,
                  }}
                  aria-disabled="true"
                >
                  <IconLock />
                  <IconSave />
                  Save worksheet
                </button>

                <Link
                  to={checkPath}
                  style={{
                    flex: "1 1 180px",
                    height: 40,
                    borderRadius: 10,
                    border: `1px solid ${BORDER}`,
                    background: CARD_BG,
                    color: TEXT_FG,
                    fontFamily: FONT_BODY,
                    fontWeight: 600,
                    fontSize: 13,
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  Upload your answers
                  <IconArrowRight size={14} />
                </Link>
              </div>

              <p
                style={{
                  margin: 0,
                  fontSize: 11,
                  color: TEXT_MUTED,
                  lineHeight: 1.5,
                }}
              >
                Save worksheet isn&rsquo;t wired up on desktop yet. Upload
                your answers takes you to Check &amp; Improve with this
                topic pre-selected.
              </p>
            </div>

            <p
              style={{
                margin: 0,
                fontSize: 12,
                color: TEXT_MUTED,
                lineHeight: 1.5,
              }}
            >
              On Generate, you&rsquo;ll be taken to the worksheet ready page
              where you can download a PDF or jump straight into practice.
            </p>
          </section>

          {/* Mistake intelligence panel — empty-state shape, no invented data. */}
          <MistakeIntelligencePanel
            title="Mistake-focus worksheets"
            insights={[]}
            emptyMessage="Grade an answer in Check & Improve to unlock mistake-focus worksheets. Once you have graded attempts, your weakest mistake type appears here as a recommended worksheet drill."
          />

          {/* Honest disclaimer mirroring the bridge convention used elsewhere */}
          <p
            style={{
              margin: 0,
              padding: "10px 14px",
              border: `1px dashed ${BORDER}`,
              background: PILL_BG,
              borderRadius: 10,
              fontSize: 12.5,
              lineHeight: 1.5,
              color: TEXT_MUTED,
            }}
          >
            Topic list mirrors the mobile worksheet generator (Class 10 CBSE
            chapters) so desktop and mobile produce the same worksheets from
            the same question bank — no extra coverage is implied.
          </p>
        </div>
      </div>

    </div>
  );
}

function SummaryRow({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <li
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(120px, 0.8fr) 1fr",
        alignItems: "center",
        gap: 12,
        padding: "10px 12px",
        background: PILL_BG,
        border: `1px solid ${BORDER}`,
        borderRadius: 10,
      }}
    >
      <span style={{ fontSize: 12, color: TEXT_MUTED, fontWeight: 500 }}>{label}</span>
      <span
        style={{
          fontSize: 14,
          fontWeight: accent ? 700 : 600,
          color: accent ? PRIMARY_GREEN : TEXT_FG,
          textAlign: "right",
        }}
      >
        {value}
      </span>
    </li>
  );
}
