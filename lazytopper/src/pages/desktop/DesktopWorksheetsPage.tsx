import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSubjectContext } from "../../hooks/useSubjectContext";
import { useAuth } from "../../context/AuthContext";
import { ContextBar } from "../../components/desktop/l2/ContextBar";
import { BackToParent } from "../../components/desktop/l2/BackToParent";
import { MistakeIntelligencePanel } from "../../components/desktop/l2/MistakeIntelligencePanel";
import {
  buildDesktopCheckPath,
  buildDesktopPracticePath,
  buildDesktopWorksheetPath,
} from "../../lib/desktop/navigation";
import {
  saveWorksheet,
  countSavedWorksheets,
} from "../../lib/desktop/savedWorksheets";
import {
  saveWorksheetToProfile,
  // recordWorksheetActivity, // K2C follow-up
} from "../../services/worksheetProfileService";
import type { SavedSectionFilter } from "../../lib/desktop/savedWorksheets";
import { generatePracticeQuestions } from "../../data/predictionDataService";
import type {
  PracticeQuestion,
  DifficultyChoice,
} from "../../data/predictionDataService";
import type { LTSubjectKey } from "../../data/predictionTypes";
import { sectionScopeLabel } from "../../components/practice/worksheetGenerator";
import type {
  WorksheetOptions,
  SectionScope,
} from "../../components/practice/worksheetGenerator";
import type { DesktopMistakeInsight } from "../../lib/desktop/mistakeData";

/**
 * DesktopWorksheetsPage — Level 2 graduation (PR-D, functional parity pass).
 *
 * Reference (final desktop prototype):
 *   chetan-anand-hub/topic-focus-lite — src/pages/WorksheetPage.tsx
 *
 * Mobile parity: this page is a desktop sibling of
 *   lazytopper/src/pages/app/Worksheets.tsx
 * and reuses the EXACT same generation primitives:
 *   - same MATHS_TOPICS / SCIENCE_TOPICS / PRESETS / SECTIONS / DIFFICULTIES
 *   - same generatePracticeQuestions argument shape
 *   - same WorksheetOptions output shape
 *   - same navigate("/practice/worksheets/ready", { state: { opts } })
 * so the existing WorksheetReady page works for both desktop and mobile
 * without modification. Mobile Worksheets.tsx is NOT touched.
 *
 * What is REAL on this surface:
 *   - Single-topic worksheet generation (production generator).
 *   - Multi-topic worksheet generation: the user picks 2+ topics, the
 *     page invokes the production generator once per topic with
 *     allowRepeats:false, de-dupes by question.id, shuffles, and truncates
 *     to the requested count. Truthful smaller worksheets when the bank
 *     genuinely has fewer matching unique questions.
 *   - Full-subject worksheet generation: same aggregator across every
 *     topic in the active subject + (Science) stream filter.
 *   - Save worksheet:
 *       - Signed-out: persists the current plan to localStorage only (device-only, not portable).
 *       - Signed-in: attempts to save to your profile via worksheetProfileService (cloud sync if available, local fallback if not).
 *     The CTA copy and status are always honest:
 *       - "Saved to your profile" (profile-saved)
 *       - "Saved locally. Profile sync is unavailable right now." (local-only)
 *       - "Saved on this device" (skipped-signed-out)
 *       - "Couldn’t save — local or profile save failed." (failed)
 *     Saving a worksheet does NOT count as progress, mastery, or Mistake Intelligence.
 *   - Mistake-aware mini-section: reads the user's actual mistake log
 *     written by the existing Check & Improve flow (mistakeLogService —
 *     `lazytopper.mistakeLogs.v1:<uid>`). When at least one entry exists,
 *     the toggle becomes enabled and turning it on auto-focuses the
 *     worksheet on the user's top-marked-down topic for the requested
 *     subject + stream. No PR #17 imports. No DESKTOP_MISTAKE_LIBRARY is
 *     presented as the learner's history.
 *   - Upload your answers: routes to /check-improve with source=worksheet
 *     and returnTo=current desktop worksheet path.
 *
 * What is HONESTLY not real:
 *   - Saved worksheets are still not progress, mastery, score, or
 *     Mistake Intelligence. Signed-in profile save can sync when available;
 *     signed-out saves remain purely local/device-only.
 *   - Mistake-aware mini-section when the learner has not graded any
 *     answers yet — toggle stays disabled with a clear unlock message.
 *
 * Production constraints:
 *   - Inline styles only (no Tailwind, no shadcn classes).
 *   - Inline SVG only (no lucide-react).
 *   - Light theme tokens shared with DesktopShell + DesktopHome + DesktopPracticePage.
 *   - No new npm dependency. No PR #17 imports. No invented learner
 *     mistake data.
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

interface TopicEntry { key: string; label: string; }

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
const ACCENT_BG = "hsl(38, 92%, 95%)";
const ACCENT_FG = "hsl(38, 65%, 32%)";
const ACCENT_BORDER = "hsl(38, 70%, 80%)";

const FONT_DISPLAY =
  '"Fraunces", "Source Serif Pro", Georgia, "Times New Roman", serif';
const FONT_BODY =
  '"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';

// ── localStorage key parity (read-only sync) ──────────────────────────────
// Source of truth: lazytopper/src/services/mistakeLogService.ts
//   const LOCAL_KEY_PREFIX = "lazytopper.mistakeLogs.v1";
//   localKey(uid) → `${LOCAL_KEY_PREFIX}:${uid}`
// Read-only mirror here so the desktop worksheet page can detect whether
// the learner already has graded mistakes and (if so) auto-focus the
// worksheet on their top-marked-down topic.
const MISTAKE_LOG_PREFIX = "lazytopper.mistakeLogs.v1";

interface RawMistakeLogEntry {
  id: string;
  timestamp: string;
  questionText: string;
  topic: string;
  subject: string;
  totalMarks: number;
  marksLost: number;
  mistakeCounts?: {
    conceptual?: number;
    calculation?: number;
    silly?: number;
    presentation?: number;
  };
}

function readMistakeLogsLocal(uid: string | null | undefined): RawMistakeLogEntry[] {
  if (!uid) return [];
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(`${MISTAKE_LOG_PREFIX}:${uid}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is RawMistakeLogEntry =>
        !!e && typeof e === "object" &&
        typeof e.timestamp === "string" &&
        typeof e.topic === "string" &&
        typeof e.subject === "string",
    );
  } catch {
    return [];
  }
}

type MistakeKind = "conceptual" | "calculation" | "silly" | "presentation";

interface MistakeFocus {
  hasData: boolean;
  totalEntries: number;
  topTopicLabel: string | null;
  topTopicKey: string | null;
  topTopicMarksLost: number;
  topTopicSubject: "Maths" | "Science" | null;
  topMistakeKind: MistakeKind | null;
  recentDays: number;
}

const DEFAULT_MISTAKE_FOCUS: MistakeFocus = {
  hasData: false,
  totalEntries: 0,
  topTopicLabel: null,
  topTopicKey: null,
  topTopicMarksLost: 0,
  topTopicSubject: null,
  topMistakeKind: null,
  recentDays: 30,
};

const MISTAKE_KIND_LABEL: Record<MistakeKind, string> = {
  conceptual:   "Conceptual",
  calculation:  "Calculation",
  silly:        "Silly mistake",
  presentation: "Presentation",
};

function normalizeLabel(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function findTopicKeyByName(
  name: string,
  subject: "Maths" | "Science",
): string | null {
  const target = normalizeLabel(name);
  const list: TopicEntry[] = subject === "Maths" ? MATHS_TOPICS : SCIENCE_TOPICS;
  // Exact normalized label match first.
  const exact = list.find((t) => normalizeLabel(t.label) === target);
  if (exact) return exact.key;
  // Fall back to substring match either way.
  const partial = list.find(
    (t) => normalizeLabel(t.label).includes(target) || target.includes(normalizeLabel(t.label)),
  );
  return partial ? partial.key : null;
}

function computeMistakeFocus(
  entries: RawMistakeLogEntry[],
  recentDays = 30,
): MistakeFocus {
  if (entries.length === 0) return DEFAULT_MISTAKE_FOCUS;
  const cutoff = Date.now() - recentDays * 24 * 60 * 60 * 1000;
  const recent = entries.filter((e) => {
    const t = new Date(e.timestamp).getTime();
    return Number.isFinite(t) && t >= cutoff;
  });
  const window = recent.length > 0 ? recent : entries;

  // Topic aggregation by marks lost (fall back to attempt count).
  type TopicAgg = {
    topic: string;
    subject: string;
    marksLost: number;
    count: number;
  };
  const byTopic = new Map<string, TopicAgg>();
  const kindTotals: Record<MistakeKind, number> = {
    conceptual: 0, calculation: 0, silly: 0, presentation: 0,
  };

  for (const e of window) {
    const subject = e.subject || "";
    const subjectNorm: "Maths" | "Science" | "" =
      /maths|math/i.test(subject) ? "Maths" :
      /sci|phys|chem|bio/i.test(subject) ? "Science" : "";
    const key = `${subjectNorm}::${e.topic}`;
    const prev = byTopic.get(key) ?? {
      topic: e.topic, subject: subjectNorm, marksLost: 0, count: 0,
    };
    prev.marksLost += Number(e.marksLost) || 0;
    prev.count += 1;
    byTopic.set(key, prev);

    const c = e.mistakeCounts ?? {};
    kindTotals.conceptual   += Number(c.conceptual)   || 0;
    kindTotals.calculation  += Number(c.calculation)  || 0;
    kindTotals.silly        += Number(c.silly)        || 0;
    kindTotals.presentation += Number(c.presentation) || 0;
  }

  let topTopic: TopicAgg | null = null;
  for (const t of byTopic.values()) {
    if (
      !topTopic ||
      t.marksLost > topTopic.marksLost ||
      (t.marksLost === topTopic.marksLost && t.count > topTopic.count)
    ) {
      topTopic = t;
    }
  }

  const topMistakeKind: MistakeKind | null = (() => {
    let best: MistakeKind | null = null;
    let max = 0;
    for (const k of ["conceptual", "calculation", "silly", "presentation"] as MistakeKind[]) {
      if (kindTotals[k] > max) { max = kindTotals[k]; best = k; }
    }
    return best;
  })();

  if (!topTopic || (topTopic.subject !== "Maths" && topTopic.subject !== "Science")) {
    return {
      hasData: window.length > 0,
      totalEntries: window.length,
      topTopicLabel: topTopic?.topic ?? null,
      topTopicKey: null,
      topTopicMarksLost: topTopic?.marksLost ?? 0,
      topTopicSubject: null,
      topMistakeKind,
      recentDays,
    };
  }

  const topKey = findTopicKeyByName(
    topTopic.topic,
    topTopic.subject as "Maths" | "Science",
  );

  return {
    hasData: true,
    totalEntries: window.length,
    topTopicLabel: topTopic.topic,
    topTopicKey: topKey,
    topTopicMarksLost: topTopic.marksLost,
    topTopicSubject: topTopic.subject as "Maths" | "Science",
    topMistakeKind,
    recentDays,
  };
}

// ── Inline icons (no lucide) ─────────────────────────────────────────────
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
function IconSparkles({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ ...IconStroke, strokeWidth: 2.4 }} aria-hidden>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" />
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
  const { user } = useAuth();

  const [subject, setSubject] = React.useState<"Maths" | "Science">(
    (ctx.subject as "Maths" | "Science") || "Maths",
  );
  const [stream, setStream]   = React.useState<ScienceStream>("All");
  const [paperScope, setPaperScope] = React.useState<PaperScope>("topic");

  const visibleTopics: TopicEntry[] = subject === "Maths"
    ? MATHS_TOPICS
    : SCIENCE_TOPICS.filter((t) => stream === "All" || t.stream === stream);

  const [topicKey, setTopicKey] = React.useState(visibleTopics[0].key);
  const [selectedTopicKeys, setSelectedTopicKeys] = React.useState<string[]>([]);

  React.useEffect(() => {
    // Re-sync single-topic and multi-topic selections whenever the visible
    // catalogue changes (subject or science stream filter changed) so we
    // never keep stale slugs.
    if (!visibleTopics.find((t) => t.key === topicKey)) {
      setTopicKey(visibleTopics[0].key);
    }
    setSelectedTopicKeys((prev) => prev.filter((k) => visibleTopics.some((t) => t.key === k)));
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
  const [info, setInfo]             = React.useState<string | null>(null);

  // ── Mistake-aware (real Check & Improve data, no PR #17 imports) ──────
  // Sync read of the learner's mistake log from localStorage. Recomputes
  // when the active uid changes and after a worksheet is generated (which
  // typically navigates away — the recompute is mostly relevant after a
  // login state change).
  const [mistakeFocus, setMistakeFocus] =
    React.useState<MistakeFocus>(DEFAULT_MISTAKE_FOCUS);

  React.useEffect(() => {
    const uid = user?.uid ?? null;
    const entries = readMistakeLogsLocal(uid);
    setMistakeFocus(computeMistakeFocus(entries));
  }, [user?.uid]);

  // For the active subject + stream filter, is there a mappable hotspot
  // we can auto-focus the worksheet on?
  const mistakeHotspotForActiveScope = (() => {
    if (!mistakeFocus.hasData) return null;
    if (!mistakeFocus.topTopicSubject || !mistakeFocus.topTopicKey) return null;
    if (mistakeFocus.topTopicSubject !== subject) return null;
    if (subject === "Science" && stream !== "All") {
      const t = SCIENCE_TOPICS.find((x) => x.key === mistakeFocus.topTopicKey);
      if (!t) return null;
      if (t.stream !== stream) return null;
    }
    return mistakeFocus;
  })();

  const canEnableMistakeAware = !!mistakeHotspotForActiveScope;
  const [mistakeAware, setMistakeAware] = React.useState<boolean>(false);

  // If the toggle becomes invalid (e.g. stream changed away from the
  // hotspot's stream) silently turn it off so we never claim to be in
  // mistake-aware mode while we don't have a hotspot.
  React.useEffect(() => {
    if (!canEnableMistakeAware && mistakeAware) setMistakeAware(false);
  }, [canEnableMistakeAware, mistakeAware]);

  function switchSubject(s: "Maths" | "Science") {
    setSubject(s);
    if (s === "Maths") setStream("All");
  }

  function toggleCustomSection(id: SectionId) {
    setCustomSections((prev) => {
      if (prev.includes(id)) {
        const next = prev.filter((s) => s !== id);
        return next.length === 0 ? prev : next;
      }
      return [...prev, id];
    });
  }

  function setScope(next: PaperScope) {
    setPaperScope(next);
    if (next === "multi-topic" && selectedTopicKeys.length === 0) {
      // Seed multi-topic with the current single topic so the user has a
      // starting point and the disabled-Generate state has an obvious fix.
      setSelectedTopicKeys([topicKey]);
    }
  }

  function toggleSelectedTopic(key: string) {
    setSelectedTopicKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  // Compute effective scope for both UI preview and generation.
  const activePreset = PRESETS.find((p) => p.key === preset)!;
  const effectiveDifficulty: DifficultyChoice =
    mode === "preset" ? activePreset.difficulty : difficulty;
  const effectiveCount      = mode === "preset" ? activePreset.count      : count;
  const effectiveSections: SectionScope = (() => {
    if (mode === "preset") return activePreset.sections;
    if (customSections.length === ALL_SECTIONS.length) return "All";
    return [...customSections].sort();
  })();

  // ── Mistake-aware is ADDITIVE (not a replacement scope) ───────────────
  //   Locked prototype intent: "Add mistake-focus mini-section" augments
  //   the user's selected scope with a small extra block of real
  //   questions from their top-marked-down topic. It MUST NOT replace
  //   single-topic / multi-topic / full-subject selections.
  //
  //   Two parallel scopes are computed below:
  //     - mainGenerationTopicKeys  → exactly the user's selected scope.
  //     - mistakeMiniTopicKey      → optional top-mistake topic add-on.
  //   The Generate handler runs the main scope first, then (if enabled)
  //   appends a 3–5 question mini-section from mistakeMiniTopicKey,
  //   de-duplicated against the main set by question.id.
  const MINI_SECTION_TARGET = 5;
  const MINI_SECTION_MIN = 3;

  // MAIN scope (driven only by the user's picks; never by mistakeAware).
  const mainGenerationTopicKeys: string[] = (() => {
    if (paperScope === "topic") return [topicKey];
    if (paperScope === "multi-topic") return selectedTopicKeys;
    // full-subject: every topic in the active subject + stream filter.
    return visibleTopics.map((t) => t.key);
  })();

  const mainGenerationTopicLabels = mainGenerationTopicKeys
    .map((k) => visibleTopics.find((t) => t.key === k)?.label ?? k);

  const mainScopeLabel: string = (() => {
    if (paperScope === "topic") {
      return visibleTopics.find((t) => t.key === topicKey)?.label ?? topicKey;
    }
    if (paperScope === "multi-topic") {
      if (mainGenerationTopicLabels.length === 0) return "—";
      if (mainGenerationTopicLabels.length <= 3) return mainGenerationTopicLabels.join(" + ");
      return `${mainGenerationTopicLabels.slice(0, 2).join(" + ")} + ${mainGenerationTopicLabels.length - 2} more`;
    }
    // full-subject
    return subject === "Science" && stream !== "All"
      ? `Full ${subject} · ${stream}`
      : `Full ${subject}`;
  })();

  // Mistake-focus add-on (independent of main scope; only set when the
  // toggle is on AND a mappable hotspot exists for the active subject +
  // stream filter).
  const mistakeMiniTopicKey: string | null =
    mistakeAware && mistakeHotspotForActiveScope?.topTopicKey
      ? mistakeHotspotForActiveScope.topTopicKey
      : null;

  const mistakeMiniTopicLabel: string | null =
    mistakeAware && mistakeHotspotForActiveScope?.topTopicLabel
      ? mistakeHotspotForActiveScope.topTopicLabel
      : null;

  // The preview / WorksheetOptions topicLabel must reflect BOTH the
  // user's main scope and (if active) the add-on, so WorksheetReady's
  // single-topic-label slot honestly describes the combined output.
  const previewTopicLabel: string = (() => {
    if (mistakeMiniTopicLabel) {
      return `${mainScopeLabel} + up to ${MINI_SECTION_TARGET} from ${mistakeMiniTopicLabel} (mistake-focus)`;
    }
    return mainScopeLabel;
  })();

  // Which section IDs should appear "checked" in the preview card.
  const previewActiveSections: Set<string> = (() => {
    if (effectiveSections === "All") return new Set<string>(ALL_SECTIONS);
    return new Set<string>(effectiveSections as string[]);
  })();

  // Honest preview chip line. Always shows the main scope first; the
  // add-on is appended as a separate clause so the user can see at a
  // glance that the mini-section is additive, not a replacement.
  const previewLine = (() => {
    const scopeStr = sectionScopeLabel(effectiveSections);
    const base = `${mainScopeLabel} · ${scopeStr} · up to ${effectiveCount} main question${effectiveCount === 1 ? "" : "s"}`;
    if (mistakeMiniTopicLabel) {
      return `${base} + up to ${MINI_SECTION_TARGET} mistake-focus questions from ${mistakeMiniTopicLabel}`;
    }
    return base;
  })();

  // Validity rules so Generate can short-circuit with a useful message.
  // Mistake-aware no longer relaxes scope validity — it's an add-on, so
  // the main scope must still be valid on its own.
  const generationBlockerMessage: string | null = (() => {
    if (paperScope === "multi-topic" && mainGenerationTopicKeys.length < 2) {
      return "Pick at least 2 topics to build a multi-topic worksheet.";
    }
    if (paperScope === "full-subject" && mainGenerationTopicKeys.length === 0) {
      return "No topics available for this subject + stream combination.";
    }
    return null;
  })();

  // ContextBar chips
  const chips = [
    { label: subject, tone: "accent" as const },
    { label: "Class 10 · CBSE", tone: "info" as const },
    {
      label: paperScope === "topic" ? "Single topic"
        : paperScope === "multi-topic" ? `Multi-topic · ${mainGenerationTopicKeys.length}`
        : "Full subject",
      tone: "neutral" as const,
    },
    {
      label: mode === "preset" ? `Preset: ${activePreset.label}` : "Custom filters",
      tone: "neutral" as const,
    },
    ...(mistakeMiniTopicLabel
      ? [{ label: `+ Mistake-focus: ${mistakeMiniTopicLabel}`, tone: "neutral" as const }]
      : []),
  ];

  // Build the canonical desktop-worksheet path so Upload-your-answers can
  // round-trip the user back to the exact same scope (source + returnTo).
  // Mistake-aware is now an additive flag, not a scope replacement, so
  // the path always reflects the MAIN scope keys (not the add-on).
  const currentWorksheetPath = buildDesktopWorksheetPath({
    scope: paperScope,
    subject,
    stream,
    topic: paperScope === "topic" ? topicKey : undefined,
    topics: paperScope === "multi-topic" ? mainGenerationTopicKeys : undefined,
    mistakeAware,
    source: "worksheet",
  });

  const checkPath = buildDesktopCheckPath(
    paperScope === "topic" ? topicKey : undefined,
    { source: "worksheet", returnTo: currentWorksheetPath },
  );

  // ── Saved worksheets (local only) ─────────────────────────────────────
  const [savedCount, setSavedCount] = React.useState<number>(0);
  const [saveStatus, setSaveStatus] = React.useState<
    | "idle"
    | "saved-device"
    | "saved-profile"
    | "saved-local-only"
    | "skipped-signed-out"
    | "failed"
  >("idle");
  const [saveMessage, setSaveMessage] = React.useState<string | null>(null);
  const [learnerLoopStatus, setLearnerLoopStatus] = React.useState<
    "idle" | "attempt-started"
  >("idle");

  React.useEffect(() => {
    setSavedCount(countSavedWorksheets());
  }, []);


  const learnerLoopTopicKey =
    paperScope === "topic" ? topicKey : mainGenerationTopicKeys[0];

  const learnerLoopReturnTo = buildDesktopWorksheetPath({
    scope: paperScope,
    subject,
    stream,
    topic: paperScope === "topic" ? topicKey : undefined,
    topics: paperScope === "multi-topic" ? mainGenerationTopicKeys : undefined,
    mistakeAware,
    source: "worksheet",
    returnTo: "/practice/worksheets",
  });

  const learnerLoopCheckPath = buildDesktopCheckPath(learnerLoopTopicKey, {
    source: "worksheet",
    returnTo: learnerLoopReturnTo,
  });

  const learnerLoopPracticePath = buildDesktopPracticePath({
    scope: learnerLoopTopicKey ? "topic" : paperScope,
    subject,
    stream,
    topic: learnerLoopTopicKey,
    topics: learnerLoopTopicKey
      ? undefined
      : paperScope === "multi-topic"
        ? mainGenerationTopicKeys
        : undefined,
    mode: "practice-set",
    source: "worksheet",
    returnTo: learnerLoopReturnTo,
  });

  async function handleSave() {
    if (generationBlockerMessage) {
      setError(generationBlockerMessage);
      setSaveStatus("failed");
      setSaveMessage(null);
      return;
    }
    const sectionsForSave: SavedSectionFilter =
      effectiveSections === "All" ? "All" : [...(effectiveSections as string[])];

    const savedLabel = (() => {
      const presetOrCustom = mode === "preset" ? activePreset.label : "Custom";
      return `${previewTopicLabel} · ${presetOrCustom}`;
    })();

    // If signed in, use profile save helper
    if (user && user.uid) {
      // Build SavedWorksheetDraft (K2A contract)
      const draft = {
        worksheetId: `sw-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        savedAt: new Date().toISOString(),
        label: savedLabel,
        subject,
        stream,
        scope: paperScope,
        topicKey: paperScope === "topic"
          ? mainGenerationTopicKeys[0]
          : mainGenerationTopicKeys,
        sectionFilter: sectionsForSave,
        difficulty: effectiveDifficulty,
        questionCount: effectiveCount,
        mistakeFocusTopicKey: mistakeMiniTopicKey ?? undefined,
      };
      try {
        const result = await saveWorksheetToProfile(user.uid, draft);
        if (result.status === "profile-saved") {
          setSaveStatus("saved-profile");
          setSaveMessage("Saved to your profile.");
        } else if (result.status === "local-only") {
          setSaveStatus("saved-local-only");
          setSaveMessage("Saved locally. Profile sync is unavailable right now.");
        } else if (result.status === "skipped-signed-out") {
          // Fallback to device-only save
          const record = saveWorksheet({
            label: savedLabel,
            subject,
            stream,
            scope: paperScope,
            topicKeys: mainGenerationTopicKeys,
            topicLabel: previewTopicLabel,
            sections: sectionsForSave,
            difficulty: effectiveDifficulty,
            count: effectiveCount,
            mistakeAware,
            mistakeFocusTopicKey: mistakeMiniTopicKey,
            mistakeFocusTopicLabel: mistakeMiniTopicLabel,
          });
          if (record) {
            setSaveStatus("saved-device");
            setSaveMessage("Saved on this device.");
          } else {
            setSaveStatus("failed");
            setSaveMessage("Couldn’t save — local or profile save failed.");
          }
        } else {
          setSaveStatus("failed");
          setSaveMessage("Couldn’t save — local or profile save failed.");
        }
        setSavedCount(countSavedWorksheets());
        setError(null);
        setInfo(null);
        window.setTimeout(() => setSaveStatus((s) => (s !== "idle" ? "idle" : s)), 4000);
      } catch (e) {
        setSaveStatus("failed");
        setSaveMessage("Couldn’t save — local or profile save failed.");
      }
    } else {
      // Signed out: device-only save
      const record = saveWorksheet({
        label: savedLabel,
        subject,
        stream,
        scope: paperScope,
        topicKeys: mainGenerationTopicKeys,
        topicLabel: previewTopicLabel,
        sections: sectionsForSave,
        difficulty: effectiveDifficulty,
        count: effectiveCount,
        mistakeAware,
        mistakeFocusTopicKey: mistakeMiniTopicKey,
        mistakeFocusTopicLabel: mistakeMiniTopicLabel,
      });
      if (record) {
        setSaveStatus("saved-device");
        setSaveMessage("Saved on this device.");
      } else {
        setSaveStatus("failed");
        setSaveMessage("Couldn’t save — local or profile save failed.");
      }
      setSavedCount(countSavedWorksheets());
      setError(null);
      setInfo(null);
      window.setTimeout(() => setSaveStatus((s) => (s !== "idle" ? "idle" : s)), 4000);
    }
  }

  // ── Generation (additive: main scope + optional mistake-focus add-on) ──
  async function handleGenerate() {
    setError(null);
    setInfo(null);

    if (generationBlockerMessage) {
      setError(generationBlockerMessage);
      return;
    }

    setGenerating(true);
    try {
      const sectionsArg: string[] | undefined =
        effectiveSections === "All" ? undefined : (effectiveSections as string[]);

      // ── Step 1: build the MAIN worksheet from the user's selected scope.
      //   - Call the production generator once per main-scope topic with
      //     allowRepeats:false so each call returns the unique pool for
      //     that topic (truthful sparse counts).
      //   - De-duplicate across topics by question.id.
      //   - Shuffle the combined unique set, then truncate to the
      //     requested count. A smaller result means the bank genuinely
      //     has fewer matching unique questions across the chosen scope.
      const mainSeenIds = new Set<string>();
      const mainCollected: PracticeQuestion[] = [];

      for (const tk of mainGenerationTopicKeys) {
        const perTopic = generatePracticeQuestions({
          subject: subject as LTSubjectKey,
          topicKey: tk,
          // Per-topic cap: the full count, so single-topic behavior is
          // identical to today and multi/full-subject can pull broadly
          // before we de-dup + shuffle + truncate.
          count: effectiveCount,
          difficulty: effectiveDifficulty === "All"
            ? undefined
            : (effectiveDifficulty as never),
          sections: sectionsArg,
          allowRepeats: false,
        });
        for (const q of perTopic) {
          if (!mainSeenIds.has(q.id)) {
            mainSeenIds.add(q.id);
            mainCollected.push(q);
          }
        }
      }

      // Shuffle the combined unique main set so multi-topic / full-subject
      // worksheets aren't visually clumped by topic.
      for (let i = mainCollected.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [mainCollected[i], mainCollected[j]] = [mainCollected[j], mainCollected[i]];
      }
      const mainFinal = mainCollected.slice(0, effectiveCount);

      // ── Step 2: optional MISTAKE-FOCUS mini-section (additive).
      //   - Generates from `mistakeMiniTopicKey` only when the toggle is
      //     on AND a mappable hotspot is available.
      //   - Uses the SAME difficulty + section filter as the main set so
      //     the worksheet feels coherent (no surprise hard 5-mark
      //     questions slipping into a Quick drill).
      //   - Targets up to MINI_SECTION_TARGET (5) extra questions; falls
      //     back to fewer when the bank is sparse. Min target
      //     (MINI_SECTION_MIN, 3) drives the truthful-sparse copy.
      //   - De-duplicates against the main set by question.id so the
      //     learner never sees the same question twice in one worksheet.
      const miniFinal: PracticeQuestion[] = [];
      let miniRequested = 0;
      if (mistakeMiniTopicKey) {
        miniRequested = MINI_SECTION_TARGET;
        const miniPool = generatePracticeQuestions({
          subject: subject as LTSubjectKey,
          topicKey: mistakeMiniTopicKey,
          // Pull a generous over-sample so dedup against the main set
          // still leaves room to hit the mini target. allowRepeats:false
          // keeps this honest — no duplicated questions inside the mini.
          count: miniRequested * 4,
          difficulty: effectiveDifficulty === "All"
            ? undefined
            : (effectiveDifficulty as never),
          sections: sectionsArg,
          allowRepeats: false,
        });
        for (const q of miniPool) {
          if (miniFinal.length >= miniRequested) break;
          if (!mainSeenIds.has(q.id)) miniFinal.push(q);
        }
      }

      // Final question array: main first, then the mini-section appended
      // at the end. The mini is intentionally NOT shuffled into the main
      // pool — it stays as a coherent trailing block so a learner can see
      // the focused questions together. The combined topicLabel above
      // describes both.
      const finalSet: PracticeQuestion[] = [...mainFinal, ...miniFinal];

      if (finalSet.length === 0) {
        const scopeStr = sectionScopeLabel(effectiveSections);
        setError(
          `No questions found for ${scopeStr} in this scope. ` +
          `Try a different topic, widen the section filter, or choose the "Board exam mix" preset.`,
        );
        setGenerating(false);
        return;
      }

      // Honest sparse-bank copy. Each clause only fires when relevant so
      // the user always sees the truth about what was actually generated.
      const honestyClauses: string[] = [];
      if (mainFinal.length < effectiveCount) {
        honestyClauses.push(
          `the main bank only had ${mainFinal.length} unique question${mainFinal.length === 1 ? "" : "s"} matching this scope`,
        );
      }
      if (mistakeMiniTopicKey) {
        if (miniFinal.length === 0) {
          honestyClauses.push(
            `no extra mistake-focus questions could be added (the bank had no unique entries for ${mistakeMiniTopicLabel} after de-duplicating against the main set)`,
          );
        } else if (miniFinal.length < MINI_SECTION_MIN) {
          honestyClauses.push(
            `only ${miniFinal.length} mistake-focus question${miniFinal.length === 1 ? "" : "s"} could be added (target was ${MINI_SECTION_TARGET})`,
          );
        } else if (miniFinal.length < miniRequested) {
          honestyClauses.push(
            `${miniFinal.length} mistake-focus question${miniFinal.length === 1 ? "" : "s"} added (target was up to ${MINI_SECTION_TARGET})`,
          );
        } else {
          honestyClauses.push(
            `${miniFinal.length} mistake-focus question${miniFinal.length === 1 ? "" : "s"} appended from ${mistakeMiniTopicLabel}`,
          );
        }
      }
      if (honestyClauses.length > 0) {
        setInfo(`Honest scope: ${honestyClauses.join("; ")}.`);
      }

      const opts: WorksheetOptions = {
        topicLabel: previewTopicLabel,
        subjectKey: subject,
        grade: "10",
        difficulty: effectiveDifficulty,
        sectionFilter: effectiveSections,
        questions: finalSet,
      };

      navigate("/practice/worksheets/ready", { state: { opts } });
    } catch {
      setError("Worksheet generation failed. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  // ── Mistake-aware mini-toggle (right slot of ContextBar) ───────────────
  const mistakeToggle = (() => {
    if (canEnableMistakeAware) {
      return (
        <label
          title={
            `Auto-focus this worksheet on your top-marked-down topic ` +
            `("${mistakeHotspotForActiveScope?.topTopicLabel}") from the last ${mistakeHotspotForActiveScope?.recentDays} days.`
          }
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 10px",
            background: mistakeAware ? PRIMARY_GREEN_SOFT : PILL_BG,
            border: `1px solid ${mistakeAware ? PRIMARY_GREEN : BORDER}`,
            borderRadius: 999,
            color: mistakeAware ? PRIMARY_GREEN_FG : TEXT_FG,
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: FONT_BODY,
          }}
        >
          <input
            type="checkbox"
            checked={mistakeAware}
            onChange={(e) => setMistakeAware(e.target.checked)}
            style={{ accentColor: PRIMARY_GREEN, cursor: "pointer" }}
            aria-label="Add mistake-focus mini-section"
          />
          <IconSparkles />
          Add mistake-focus mini-section
        </label>
      );
    }
    return (
      <span
        title="Grade an answer in Check & Improve to unlock mistake-focus worksheets."
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
  })();

  // ── Mistake intelligence panel insights (real, no fakes) ──────────────
  const mistakeInsights: DesktopMistakeInsight[] = (() => {
    if (!mistakeFocus.hasData || !mistakeFocus.topTopicLabel || !mistakeFocus.topMistakeKind) return [];
    const subjectStr: "Maths" | "Science" =
      mistakeFocus.topTopicSubject ?? subject;
    const streamStr =
      subjectStr === "Science"
        ? (() => {
          const t = SCIENCE_TOPICS.find((x) => x.key === mistakeFocus.topTopicKey);
          return (t?.stream ?? "All") as ScienceStream;
        })()
        : "All";
    const kindLabel = MISTAKE_KIND_LABEL[mistakeFocus.topMistakeKind];
    const recommendedTopic = mistakeFocus.topTopicKey
      ? [mistakeFocus.topTopicKey]
      : [];
    return [
      {
        id: `live-top-${mistakeFocus.topTopicKey ?? "topic"}`,
        topicSlug: mistakeFocus.topTopicKey ?? "",
        topicName: mistakeFocus.topTopicLabel,
        subject: subjectStr,
        stream: streamStr,
        mistakeType: mistakeFocus.topMistakeKind,
        mistakeLabel: `Most-marked-down topic (last ${mistakeFocus.recentDays} days)`,
        detail:
          `From your real Check & Improve attempts: ${kindLabel.toLowerCase()} ` +
          `mistakes on ${mistakeFocus.topTopicLabel} cost the most marks ` +
          `(${mistakeFocus.topTopicMarksLost} mark${mistakeFocus.topTopicMarksLost === 1 ? "" : "s"} across ${mistakeFocus.totalEntries} graded entries).`,
        recommendedDrill:
          `Toggle "Add mistake-focus mini-section" above and press Generate — ` +
          `the worksheet will auto-focus on this exact topic.`,
        recommendedMode: "worksheet",
        recommendedFilters: [],
        recommendedTopicSlugs: recommendedTopic,
        createdAt: new Date().toISOString(),
      },
    ];
  })();

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
        subtitle="Pick a topic, a topic combination, or the full subject. Choose a board-pattern preset or set your own filters. Nothing is generated until you press Generate — the preview on the right shows exactly what will come out."
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

            {/* Scope mode (all three enabled) */}
            <div>
              <SectionLabel>Scope</SectionLabel>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <ScopeButton
                  active={paperScope === "topic"}
                  onClick={() => setScope("topic")}
                >
                  Single topic
                </ScopeButton>
                <ScopeButton
                  active={paperScope === "multi-topic"}
                  onClick={() => setScope("multi-topic")}
                >
                  Multi-topic
                </ScopeButton>
                <ScopeButton
                  active={paperScope === "full-subject"}
                  onClick={() => setScope("full-subject")}
                >
                  Full subject
                </ScopeButton>
              </div>
              {paperScope === "multi-topic" ? (
                <p style={{ margin: "8px 0 0", fontSize: 12, color: TEXT_MUTED, lineHeight: 1.5 }}>
                  Generation runs once per selected topic (no duplicates), then
                  shuffles and trims to the question count. Pick 2 or more
                  topics below.
                </p>
              ) : paperScope === "full-subject" ? (
                <p style={{ margin: "8px 0 0", fontSize: 12, color: TEXT_MUTED, lineHeight: 1.5 }}>
                  Generation pulls unique questions from <strong>every</strong>{" "}
                  {subject}{subject === "Science" && stream !== "All" ? ` · ${stream}` : ""}{" "}
                  topic visible below, then shuffles and trims to the question
                  count.
                </p>
              ) : null}
            </div>

            {/* Topic picker — single radio for "topic", multi checkbox for
                "multi-topic", read-only list for "full-subject". */}
            {paperScope === "full-subject" ? (
              <div>
                <SectionLabel>Topics in scope ({visibleTopics.length})</SectionLabel>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 6,
                    padding: "10px 12px",
                    border: `1px dashed ${BORDER}`,
                    background: PILL_BG,
                    borderRadius: 10,
                  }}
                >
                  {visibleTopics.map((t) => (
                    <span
                      key={t.key}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        padding: "4px 10px",
                        borderRadius: 999,
                        fontSize: 12,
                        background: CARD_BG,
                        color: TEXT_FG,
                        border: `1px solid ${BORDER}`,
                        fontWeight: 500,
                      }}
                    >
                      {t.label}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <SectionLabel>
                  {paperScope === "topic" ? "Topic" : `Topics (pick 2+) · ${selectedTopicKeys.length} selected`}
                </SectionLabel>
                {paperScope === "multi-topic" && selectedTopicKeys.length < 2 ? (
                  <p
                    role="status"
                    style={{
                      margin: "0 0 6px",
                      fontSize: 12,
                      color: TEXT_MUTED,
                    }}
                  >
                    Select at least <strong style={{ color: TEXT_FG }}>2 topics</strong> to
                    enable multi-topic generation.
                  </p>
                ) : null}
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
                  {visibleTopics.map((t) => {
                    const checked = paperScope === "topic"
                      ? topicKey === t.key
                      : selectedTopicKeys.includes(t.key);
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
                            type={paperScope === "topic" ? "radio" : "checkbox"}
                            name={paperScope === "topic" ? "desktop-worksheet-topic" : `desktop-worksheet-topics-${t.key}`}
                            checked={checked}
                            onChange={() =>
                              paperScope === "topic"
                                ? setTopicKey(t.key)
                                : toggleSelectedTopic(t.key)
                            }
                            style={{ accentColor: PRIMARY_GREEN }}
                          />
                          <span style={{ minWidth: 0 }}>{t.label}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
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

            {/* Mistake-aware mini-section banner (real data, additive). */}
            {mistakeAware && mistakeHotspotForActiveScope ? (
              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: ACCENT_BG,
                  color: ACCENT_FG,
                  border: `1px solid ${ACCENT_BORDER}`,
                  fontSize: 13,
                  lineHeight: 1.5,
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700 }}>
                  <IconSparkles /> Mistake-focus mini-section (additive)
                </div>
                <div>
                  <strong>{mistakeHotspotForActiveScope.topTopicLabel}</strong>
                  {" — "}
                  {MISTAKE_KIND_LABEL[mistakeHotspotForActiveScope.topMistakeKind ?? "conceptual"].toLowerCase()} mistakes (last {mistakeHotspotForActiveScope.recentDays} days, {mistakeHotspotForActiveScope.totalEntries} graded entries).
                </div>
                <div style={{ fontSize: 12 }}>
                  Adds up to <strong>{MINI_SECTION_TARGET}</strong> extra
                  questions on top of your main scope ({mainScopeLabel}).
                  Your main scope is preserved — this is an add-on, not a
                  replacement.
                </div>
                <div style={{ fontSize: 11, opacity: 0.85 }}>
                  Recommended, not required. Mini-section uses the same
                  difficulty + section filter as the main worksheet, and
                  is de-duplicated against the main set so no question
                  appears twice.
                </div>
              </div>
            ) : null}

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
              <SummaryRow
                label="Scope"
                value={
                  paperScope === "topic" ? "Single topic"
                    : paperScope === "multi-topic" ? `Multi-topic · ${mainGenerationTopicKeys.length}`
                    : `Full subject · ${mainGenerationTopicKeys.length} topics`
                }
              />
              <SummaryRow label="Main topics" value={mainScopeLabel} />
              {mistakeMiniTopicLabel ? (
                <SummaryRow
                  label="Mistake-focus add-on"
                  value={`${mistakeMiniTopicLabel} (up to ${MINI_SECTION_TARGET} extra)`}
                />
              ) : null}
              <SummaryRow
                label="Sections"
                value={sectionScopeLabel(effectiveSections)}
              />
              <SummaryRow
                label="Difficulty"
                value={effectiveDifficulty === "All" ? "All levels" : effectiveDifficulty}
              />
              <SummaryRow
                label="Question count"
                value={
                  mistakeMiniTopicLabel
                    ? `up to ${effectiveCount} main + up to ${MINI_SECTION_TARGET} mistake-focus`
                    : `up to ${effectiveCount}`
                }
                accent
              />
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

            {info ? (
              <div
                role="status"
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: PRIMARY_GREEN_SOFT,
                  border: `1px solid ${BORDER}`,
                  color: PRIMARY_GREEN_FG,
                  fontSize: 12.5,
                  lineHeight: 1.5,
                }}
              >
                {info}
              </div>
            ) : null}

            {/* Actions: Generate (primary) · Save (real local) · Upload (link) */}
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
                disabled={generating || !!generationBlockerMessage}
                title={generationBlockerMessage ?? undefined}
                style={{
                  appearance: "none",
                  WebkitAppearance: "none",
                  width: "100%",
                  height: 48,
                  borderRadius: 12,
                  border: "none",
                  background: (generating || generationBlockerMessage)
                    ? "hsl(152, 30%, 75%)"
                    : PRIMARY_GREEN,
                  color: "#ffffff",
                  fontFamily: FONT_BODY,
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: (generating || generationBlockerMessage) ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  transition: "background 120ms ease",
                }}
              >
                <IconWorksheet />
                {generating
                  ? "Generating…"
                  : mistakeAware
                    ? "Generate mistake-aware worksheet"
                    : paperScope === "full-subject"
                      ? `Generate full ${subject} worksheet`
                      : paperScope === "multi-topic"
                        ? "Generate selected-topic worksheet"
                        : `Generate ${previewTopicLabel} worksheet`}
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
                  onClick={handleSave}
                  disabled={!!generationBlockerMessage}
                  title={generationBlockerMessage ?? (saveMessage || "Save worksheet")}
                  style={{
                    appearance: "none",
                    WebkitAppearance: "none",
                    flex: "1 1 180px",
                    height: 40,
                    borderRadius: 10,
                    border: `1px solid ${
                      saveStatus === "saved-profile"
                        ? PRIMARY_GREEN
                        : saveStatus === "saved-local-only"
                        ? ACCENT_BORDER
                        : saveStatus === "saved-device"
                        ? BORDER
                        : BORDER
                    }`,
                    background:
                      saveStatus === "saved-profile"
                        ? PRIMARY_GREEN_SOFT
                        : saveStatus === "saved-local-only"
                        ? ACCENT_BG
                        : saveStatus === "saved-device"
                        ? CARD_BG
                        : CARD_BG,
                    color:
                      saveStatus === "saved-profile"
                        ? PRIMARY_GREEN_FG
                        : saveStatus === "saved-local-only"
                        ? ACCENT_FG
                        : saveStatus === "saved-device"
                        ? TEXT_FG
                        : generationBlockerMessage
                        ? DISABLED_FG
                        : TEXT_FG,
                    fontFamily: FONT_BODY,
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: generationBlockerMessage ? "not-allowed" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    opacity: generationBlockerMessage ? 0.7 : 1,
                  }}
                >
                  <IconSave />
                  {saveStatus === "saved-profile"
                    ? "Saved to your profile"
                    : saveStatus === "saved-local-only"
                    ? "Saved locally (profile sync unavailable)"
                    : saveStatus === "saved-device"
                    ? "Saved on this device"
                    : "Save worksheet"}
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
                {saveStatus === "saved-profile"
                  ? "Saved to your profile. "
                  : saveStatus === "saved-local-only"
                  ? "Saved locally. Profile sync is unavailable right now. "
                  : saveStatus === "saved-device"
                  ? "Saved on this device. "
                  : saveStatus === "failed"
                  ? "Couldn’t save — local or profile save failed. "
                  : savedCount > 0
                  ? `${savedCount} worksheet${savedCount === 1 ? "" : "s"} saved on this device. `
                  : user && user.uid
                  ? "Saving a worksheet attempts to sync to your profile (if signed in). This does not count as progress or mastery."
                  : "Save worksheet stores the plan locally on this device only. "}
                Upload your answers takes you to Check &amp; Improve with this topic pre-selected.
              </p>
              {saveStatus === "failed" ? (
                <p style={{ margin: 0, fontSize: 12, color: DANGER_FG, lineHeight: 1.5 }}>
                  Couldn&rsquo;t save — local or profile save failed.
                </p>
              ) : null}

              <div
                style={{
                  marginTop: 14,
                  padding: 14,
                  borderRadius: 12,
                  border: `1px solid ${BORDER}`,
                  background: PILL_BG,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 800, color: TEXT_FG, marginBottom: 4 }}>
                  Learner loop
                </div>
                <div style={{ fontSize: 12, color: TEXT_MUTED, lineHeight: 1.5, marginBottom: 10 }}>
                  Attempt first, check through the real Check &amp; Improve flow, then practice similar questions.
                  Attempt activity is not progress, mastery, grading, or Mistake Intelligence.
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setLearnerLoopStatus("attempt-started");
                      setError(null);
                      setInfo("Attempt this worksheet on your own first. Nothing is graded or counted as progress until you use Check & Improve.");
                    }}
                    style={{
                      border: `1px solid ${BORDER}`,
                      background: CARD_BG,
                      color: TEXT_FG,
                      borderRadius: 999,
                      padding: "7px 11px",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: FONT_BODY,
                    }}
                  >
                    Attempt this worksheet
                  </button>

                  <Link
                    to={learnerLoopCheckPath}
                    style={{
                      border: `1px solid ${PRIMARY_GREEN}`,
                      background: PRIMARY_GREEN_SOFT,
                      color: PRIMARY_GREEN_FG,
                      borderRadius: 999,
                      padding: "7px 11px",
                      fontSize: 12,
                      fontWeight: 800,
                      fontFamily: FONT_BODY,
                      textDecoration: "none",
                    }}
                  >
                    Check my answer
                  </Link>

                  <Link
                    to={learnerLoopPracticePath}
                    style={{
                      border: `1px solid ${BORDER}`,
                      background: CARD_BG,
                      color: TEXT_FG,
                      borderRadius: 999,
                      padding: "7px 11px",
                      fontSize: 12,
                      fontWeight: 700,
                      fontFamily: FONT_BODY,
                      textDecoration: "none",
                    }}
                  >
                    Practice similar questions
                  </Link>
                </div>

                {learnerLoopStatus === "attempt-started" ? (
                  <div style={{ marginTop: 10, fontSize: 12, color: TEXT_MUTED, lineHeight: 1.5 }}>
                    Attempt started locally. Use Check my answer when you are ready for real grading.
                  </div>
                ) : null}
              </div>
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

          {/* Mistake intelligence panel — real data only. Empty when the
              learner has not graded any answers yet. */}
          <MistakeIntelligencePanel
            title="Mistake-focus worksheets"
            insights={mistakeInsights}
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
