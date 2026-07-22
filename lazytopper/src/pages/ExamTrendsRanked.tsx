import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import {
  buildDesktopPracticePath,
  buildDesktopTopicHubPath,
  buildDesktopWorksheetPath,
  type DesktopStream,
  type DesktopSubject,
} from "../lib/desktop/navigation";
import {
  desktopTopicBySlug,
  desktopTopicsBySubject,
  type DesktopTopicSummary,
  type DesktopTrendTier,
} from "../lib/desktop/topics";
import {
  getHighlyProbableQuestions,
  type HPQStream,
  type HPQTopicBucket,
} from "../data/highlyProbableQuestions";
import MobileShell from "../components/mobile/MobileShell";
import { useIsDesktop } from "../hooks/useIsDesktop";

/**
 * ExamTrendsRanked — ONE responsive Exam Trends page (Option-B convergence).
 *
 * Source of truth (owner-held locked prototype):
 *   02_exam_trends_ranked_list.html — a ranked priority list, now evolved into
 *   THREE collapsible priority BANDS (Must-crack / High-ROI / Good-to-do).
 *
 * This single component renders at every width (~360px → desktop) and RETIRES
 * both twins it replaced:
 *   - src/pages/desktop/DesktopExamTrendsPage.tsx (the old 2-col card grid)
 *   - src/pages/app/ExamTrends.tsx                (the old mobile tier list)
 * At desktop width it mounts inside DesktopShell (sidebar) exactly as the old
 * desktop page did (isDesktopShellRoute keeps "/exam-trends" shell-wrapped); at
 * mobile width it reflows fluidly via flex-wrap + min-width:0 ellipsis — NOT a
 * breakpoint swap to a different file.
 *
 * BAND redesign (layout-only evolution of the flat ranked list):
 *   The flat sorted list made the student reconcile weight-vs-trend via a Sort
 *   toggle. The bands do that synthesis FOR them — the band IS the verdict.
 *   Three collapsible bands replace the Sort toggle: Must-crack (open by
 *   default) → High-ROI (collapsed) → Good-to-do (collapsed). Inside each band
 *   the EXISTING row design is reused verbatim (name + tier chip + marks-weight
 *   bar + Learn → Topic Hub + "⋯" secondary actions). The row gains an "Expect:"
 *   recurring-sub-pattern line (must-crack only — the locked doc supplies these)
 *   and a volatility note on the two highest-but-most-volatile topics. The
 *   Subject + Science-stream filters are kept; only the Sort toggle is removed.
 *
 * DESIGN UPLIFT — PRESENTATION ONLY, zero functionality change:
 *   Rows became cards on a per-band accent (green Must-crack / blue High-ROI /
 *   violet Good-to-do — the shipped DesktopPracticePage MODE_ACCENT hues; no new
 *   colour invented). There is deliberately NO grey band: priority reads from
 *   the numbered badge and the ordering, never from draining colour. The one
 *   copy change is the per-row primary CTA "Open" → "Learn" (same destination,
 *   same params). Styling moved to CSS classes (lt-et-*) because §6's responsive
 *   rules — mobile compaction, the wrapped action row, the two-line Expect:
 *   clamp — and :hover cannot be expressed as inline style objects at all.
 *
 *   The "⋯" menu is a popover ANCHORED TO ITS OWN BUTTON (a position:relative
 *   wrapper + top:calc(100% + 6px)), and the band carries its accent as a
 *   border-left rather than a clipped spine element so the band needs no
 *   overflow:hidden. Both matter: an unanchored absolute menu falls back to its
 *   static position — below the whole card — and an overflow:hidden ancestor
 *   clips it. The menu flips upward (bottom:calc(100% + 6px)) when it would
 *   cross the viewport bottom, measured with getBoundingClientRect() on open.
 *
 * Tier authority (DO NOT re-derive or trust a stale code `tier` field):
 *   LazyTopper_LOCKED_ExamTrends_Tiers_2026-06-05.md — owner-signed-off tiers.
 *   The band membership, sub-patterns and volatility flags below are transcribed
 *   VERBATIM from that locked doc and keyed by canonical topic slug. They are
 *   data sourced from the authority, never computed from `weight`/`trendTier`.
 *
 * Data honesty (doctrine):
 *   - Real production data only (desktopTopicsBySubject — all topics, both
 *     subjects, working Science-stream filter). No fabricated "% likely".
 *   - Trend tier chips render High/Medium/Low — never a fake percentage. The
 *     chip is the every-year/frequency signal that makes a tier defensible.
 *   - Sub-patterns are framed "Expect: [shape]" — a high-probability SHAPE, never
 *     "the paper will ask X". They render ONLY where the locked doc supplies one
 *     (the must-crack topics); High-ROI rows show none rather than an invented
 *     shape (no fake data; nothing re-derived).
 *   - HPQ counts come from getHighlyProbableQuestions only, matched by canonical
 *     topic name; if no bucket matches we render nothing (no invented number).
 *   - The marks label stays "~N marks" — the real `topic.weight`. The weight BAR
 *     is normalised to the widest topic for SHAPE only; that ratio is never
 *     printed, because a bare "100" beside a bar reads as a fake percentage.
 *
 * Routing reuses the production routes the old page used — "Learn" → Topic Hub;
 * the "⋯" secondary actions → existing Practice / Worksheet / Predicted routes;
 * every CTA preserves source=trends + returnTo=/exam-trends.
 */

// ─── Theme tokens (copied verbatim from the retired DesktopExamTrendsPage —
//     the shared desktop grammar; do NOT drift) ──────────────────────────────
const PRIMARY_GREEN = "hsl(152, 55%, 45%)";
const PRIMARY_GREEN_DEEP = "hsl(152, 60%, 38%)";
const TEXT_FG = "hsl(220, 25%, 12%)";
const TEXT_MUTED = "hsl(220, 15%, 42%)";
const TEXT_TERTIARY = "hsl(220, 14%, 55%)";
const BORDER = "hsl(220, 18%, 90%)";
const CARD_BG = "#ffffff";
// Volatility / "prepare deep" honesty note — reuses the medium-tier amber so it
// reads as a caution, not a new color in the grammar.
const CAUTION_FG = "hsl(35, 75%, 32%)";
const CAUTION_BG = "hsl(43, 90%, 95%)";
const CAUTION_LINE = "hsl(40, 60%, 84%)";

// Tier chips — the semantic mapping is UNCHANGED (high/medium/low). Only the
// "low" swatch moves off grey onto the Good-to-do violet, so no part of the page
// reads dead. Never a percentage. The swatches live in CSS (.lt-et-tier--*).
const TIER_CLASS: Record<DesktopTrendTier, string> = {
  high: "lt-et-tier--high",
  medium: "lt-et-tier--medium",
  low: "lt-et-tier--low",
};
const TIER_LABEL: Record<DesktopTrendTier, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

const FONT_DISPLAY =
  '"Fraunces", "Source Serif Pro", Georgia, "Times New Roman", serif';
const FONT_BODY =
  '"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';

// ─── Priority bands (owner-locked) ───────────────────────────────────────────
// Transcribed VERBATIM from LazyTopper_LOCKED_ExamTrends_Tiers_2026-06-05.md.
// Do NOT re-tier or re-derive from weight/trendTier — this map IS the authority.
type Band = "must-crack" | "high-roi" | "good-to-do";

interface BandMeta {
  band: Band;
  /** "Expect: [shape]" recurring sub-pattern — only where the locked doc gives one. */
  subPattern?: string;
  /** Highest-weight but most volatile in its subject — "prepare deep, weight varies". */
  volatile?: boolean;
}

const BAND_BY_SLUG: Record<string, BandMeta> = {
  // ── MATHEMATICS — Must-crack (5) ──
  trigonometry: {
    band: "must-crack",
    subPattern: "5-mk Heights & Distances LA + standard-angle evaluation",
    volatile: true,
  },
  circles: {
    band: "must-crack",
    subPattern: "1-mk tangent MCQ + chord/tangent proof",
  },
  triangles: {
    band: "must-crack",
    subPattern: "similarity / BPT proof + 1-mk MCQ",
  },
  "surface-areas-and-volumes": {
    band: "must-crack",
    subPattern: "5-mk combination-of-solids LA + 4-mk case study",
  },
  polynomials: {
    band: "must-crack",
    subPattern: "2-mk zeroes-of-polynomial",
  },
  // ── MATHEMATICS — High-ROI ──
  "coordinate-geometry": { band: "high-roi" },
  "real-numbers": { band: "high-roi" },
  probability: { band: "high-roi" },
  "quadratic-equations": { band: "high-roi" },
  statistics: { band: "high-roi" },
  // ── MATHEMATICS — Good-to-do ──
  "arithmetic-progression": { band: "good-to-do" },
  "pair-of-linear-equations": { band: "good-to-do" },
  "areas-related-to-circles": { band: "good-to-do" },

  // ── SCIENCE — Must-crack (6) ──
  "chemical-reactions-and-equations": {
    band: "must-crack",
    subPattern: "2-mk balancing + 3-mk displacement (full A–E spread)",
  },
  "light-reflection-and-refraction": {
    band: "must-crack",
    subPattern: "5-mk concave-mirror numerical/ray + 3-mk convex-lens",
  },
  "life-processes": {
    band: "must-crack",
    subPattern: "full A–E spread (nutrition, respiration, transport, excretion)",
  },
  "acids-bases-and-salts": {
    band: "must-crack",
    subPattern: "5-mk pH & indicators LA + case study",
  },
  electricity: {
    band: "must-crack",
    subPattern: "Ohm's-law / circuit numericals",
    volatile: true,
  },
  heredity: {
    band: "must-crack",
    subPattern: "2–3-mk Mendelian crosses",
  },
  // ── SCIENCE — High-ROI ──
  "control-and-coordination": { band: "high-roi" },
  "metals-and-non-metals": { band: "high-roi" },
  "magnetic-effects-of-electric-current": { band: "high-roi" },
  "how-do-organisms-reproduce": { band: "high-roi" },
  "carbon-and-its-compounds": { band: "high-roi" },
  // ── SCIENCE — Good-to-do ──
  "our-environment": { band: "good-to-do" },
  "human-eye-and-colourful-world": { band: "good-to-do" },
};

const BAND_ORDER: Band[] = ["must-crack", "high-roi", "good-to-do"];

const BAND_DISPLAY: Record<
  Band,
  { label: string; definition: string; defaultOpen: boolean }
> = {
  "must-crack": {
    label: "Must-crack",
    definition: "The non-negotiables — big marks, every year. Prepare deep.",
    defaultOpen: true,
  },
  "high-roi": {
    label: "High-ROI",
    definition: "Best marks-per-hour — scoreable, consistent, formula-driven.",
    defaultOpen: false,
  },
  "good-to-do": {
    label: "Good-to-do",
    definition: "Lower weight or more volatile — do these if time permits.",
    defaultOpen: false,
  },
};

// ─── Band presentation ──────────────────────────────────────────────────────
// PRESENTATION ONLY. Nothing here decides membership; it only colours and
// numbers a band that BAND_BY_SLUG has ALREADY assigned. The ordinal is the
// priority signal that replaces the retired grey-drain treatment.
const BAND_INDEX: Record<Band, number> = {
  "must-crack": 1,
  "high-roi": 2,
  "good-to-do": 3,
};

// ─── Inline SVG glyphs (same family as the retired page) ────────────────────
const ICON: React.CSSProperties = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};
function IconLayers({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={ICON} aria-hidden>
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}
function IconClipboard({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={ICON} aria-hidden>
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    </svg>
  );
}
function IconSparkles({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={ICON} aria-hidden>
      <path d="M12 3l1.8 4.6L18 9.4l-4.2 1.8L12 15.8l-1.8-4.6L6 9.4l4.2-1.8z" />
      <path d="M19 14l.7 1.8L21.5 16.5l-1.8.7L19 19l-.7-1.8L16.5 16.5l1.8-.7z" />
    </svg>
  );
}
function IconBook({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={ICON} aria-hidden>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}
function IconPlus({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={ICON} aria-hidden>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
function IconCheck({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={ICON} aria-hidden>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function IconTrash({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={ICON} aria-hidden>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}
function IconMore({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={ICON} aria-hidden>
      <circle cx="5" cy="12" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
    </svg>
  );
}
function IconChevron({ size = 18, open }: { size?: number; open: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{
        ...ICON,
        transform: open ? "rotate(90deg)" : "rotate(0deg)",
        transition: "transform 180ms ease",
      }}
      aria-hidden
    >
      <polyline points="9 6 15 12 9 18" />
    </svg>
  );
}
function IconAward({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={ICON} aria-hidden>
      <circle cx="12" cy="8" r="6" />
      <path d="M15.5 13.5L17 22l-5-3-5 3 1.5-8.5" />
    </svg>
  );
}
function IconAlert({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={ICON} aria-hidden>
      <path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

// ─── Honest HPQ matching (lifted verbatim from the retired desktop page) ─────
const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");

const STREAM_TO_HPQ: Record<DesktopStream, HPQStream | undefined> = {
  All: undefined,
  Physics: "Physics",
  Chemistry: "Chemistry",
  Biology: "Biology",
};

function countHPQForTopic(topic: DesktopTopicSummary): number {
  const stream = topic.subject === "Science" ? STREAM_TO_HPQ[topic.stream] : undefined;
  const buckets: HPQTopicBucket[] = getHighlyProbableQuestions(topic.subject, stream);
  if (buckets.length === 0) return 0;
  const slugNorm = normalize(topic.slug);
  const nameNorm = normalize(topic.name);
  const match = buckets.find((bucket) => {
    const t = normalize(bucket.topic);
    if (t === slugNorm || t === nameNorm) return true;
    return t.startsWith(nameNorm) || nameNorm.startsWith(t);
  });
  if (!match) return 0;
  return match.questions.length;
}

// ─── Page stylesheet ─────────────────────────────────────────────────────────
// CSS classes rather than inline style objects: §6's responsive rules and the
// hover lifts cannot be expressed inline at all. Same technique already shipping
// in DesktopPracticePage. Band accents ride CSS custom properties set by the
// band's modifier class, so a card never needs to know its own colour.
const STYLES = `
.lt-et {
  --fg: ${TEXT_FG};
  --muted: ${TEXT_MUTED};
  --tert: ${TEXT_TERTIARY};
  --border: ${BORDER};
  --card: ${CARD_BG};
  --caution-fg: ${CAUTION_FG};
  --caution-bg: ${CAUTION_BG};
  --caution-line: ${CAUTION_LINE};
  width: 100%;
  max-width: 880px;
  margin: 0 auto;
  padding: 24px 16px 64px;
  box-sizing: border-box;
  font-family: ${FONT_BODY};
  color: var(--fg);
  min-width: 0;
}
.lt-et *, .lt-et *::before, .lt-et *::after { box-sizing: border-box; }

/* ── Hero — green→blue→violet wash previewing the three bands ─────────── */
.lt-et-hero {
  position: relative;
  overflow: hidden;
  background: linear-gradient(118deg, hsl(152,50%,96%), hsl(205,70%,96%) 52%, hsl(255,60%,96.5%));
  border: 1px solid hsl(152,42%,85%);
  border-radius: 18px;
  padding: 20px 22px;
  margin-bottom: 16px;
  box-shadow: 0 3px 14px -8px hsla(200,40%,35%,.3);
}
.lt-et-cred {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  background: var(--card);
  border: 1px solid hsl(152,42%,85%);
  border-radius: 999px;
  padding: 5px 12px;
  font-size: 11px;
  font-weight: 750;
  color: hsl(152,60%,34%);
  margin-bottom: 10px;
}
.lt-et-hero h1 {
  font-family: ${FONT_DISPLAY};
  font-size: 25px;
  font-weight: 600;
  letter-spacing: -0.015em;
  margin: 0 0 5px;
  line-height: 1.2;
}
.lt-et-hero p {
  margin: 0;
  max-width: 60ch;
  font-size: 13px;
  line-height: 1.6;
  color: hsl(220,20%,32%);
}

/* ── Filters ──────────────────────────────────────────────────────────── */
.lt-et-filters {
  display: flex;
  gap: 9px;
  flex-wrap: wrap;
  align-items: center;
  margin-top: 15px;
}
.lt-et-seg {
  display: inline-flex;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 13px;
  padding: 3px;
  gap: 2px;
  box-shadow: 0 2px 8px -5px hsla(220,30%,40%,.3);
}
.lt-et-seg button {
  appearance: none;
  border: 0;
  background: transparent;
  border-radius: 10px;
  padding: 9px 18px;
  font-family: ${FONT_BODY};
  font-size: 13px;
  font-weight: 650;
  color: var(--muted);
  cursor: pointer;
  transition: background 150ms ease, color 150ms ease;
}
.lt-et-seg button[aria-pressed="true"] {
  background: linear-gradient(140deg, ${PRIMARY_GREEN}, hsl(152,60%,34%));
  color: #fff;
  box-shadow: 0 4px 12px -4px hsla(152,55%,30%,.6);
}
.lt-et-chip {
  appearance: none;
  border: 1px solid hsl(205,60%,84%);
  background: var(--card);
  border-radius: 999px;
  padding: 7px 13px;
  font-family: ${FONT_BODY};
  font-size: 12px;
  font-weight: 650;
  color: hsl(205,72%,36%);
  cursor: pointer;
  transition: background 150ms ease;
}
.lt-et-chip[aria-pressed="true"] { background: hsl(205,70%,96%); }
.lt-et-chip:disabled { opacity: .5; cursor: not-allowed; }

/* ── Band — the accent is a border-left, NOT a clipped spine element. That
      is precisely what lets us drop overflow:hidden, which would clip the
      ⋯ popover (§5 cause 1). ─────────────────────────────────────────── */
.lt-et-band {
  position: relative;
  border-radius: 18px;
  border: 1px solid var(--a-line);
  border-left: 5px solid var(--a);
  background: linear-gradient(175deg, var(--a-tint), var(--card) 34%);
  margin-bottom: 14px;
  box-shadow: 0 3px 12px -7px hsla(220,30%,40%,.22);
}
.lt-et-band--must-crack {
  --a: ${PRIMARY_GREEN};
  --a-tint: hsl(152,50%,96%);
  --a-line: hsl(152,42%,85%);
  --a-deep: hsl(152,60%,34%);
  --a-card-line: hsl(152,35%,90%);
  --a-shadow: hsla(152,55%,30%,.55);
  --a-bar: hsl(152,60%,58%);
}
.lt-et-band--high-roi {
  --a: hsl(205,70%,52%);
  --a-tint: hsl(205,70%,96%);
  --a-line: hsl(205,60%,84%);
  --a-deep: hsl(205,72%,36%);
  --a-card-line: hsl(205,45%,91%);
  --a-shadow: hsla(205,70%,32%,.5);
  --a-bar: hsl(205,72%,64%);
}
.lt-et-band--good-to-do {
  --a: hsl(255,50%,58%);
  --a-tint: hsl(255,60%,96.5%);
  --a-line: hsl(255,50%,87%);
  --a-deep: hsl(255,45%,45%);
  --a-card-line: hsl(255,35%,92%);
  --a-shadow: hsla(255,45%,40%,.5);
  --a-bar: hsl(255,58%,70%);
}
.lt-et-bandhead {
  appearance: none;
  width: 100%;
  text-align: left;
  background: transparent;
  border: 0;
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 16px 18px;
  cursor: pointer;
  min-width: 0;
  font-family: ${FONT_BODY};
  border-radius: 13px;
}
.lt-et-bandnum {
  width: 34px;
  height: 34px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  flex: none;
  color: #fff;
  font-family: ${FONT_DISPLAY};
  font-weight: 800;
  font-size: 15px;
  background: linear-gradient(140deg, var(--a), var(--a-deep));
  box-shadow: 0 4px 11px -4px var(--a-shadow);
}
.lt-et-bandtxt { flex: 1; min-width: 0; }
.lt-et-bandtitle {
  display: flex;
  align-items: center;
  gap: 9px;
  flex-wrap: wrap;
  font-family: ${FONT_DISPLAY};
  font-weight: 700;
  font-size: 16.5px;
  letter-spacing: -0.015em;
  color: var(--fg);
  min-width: 0;
}
.lt-et-bandcount {
  font-family: ${FONT_BODY};
  font-size: 10.5px;
  font-weight: 750;
  border-radius: 999px;
  padding: 3px 10px;
  white-space: nowrap;
  background: var(--card);
  color: var(--a-deep);
  border: 1px solid var(--a-line);
}
.lt-et-banddef {
  display: block;
  margin-top: 3px;
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--muted);
  min-width: 0;
}
.lt-et-bandchev { flex: none; display: inline-flex; color: var(--a-deep); }
.lt-et-rows { display: grid; gap: 10px; padding: 0 12px 12px; min-width: 0; }

/* ── Topic card ───────────────────────────────────────────────────────── */
.lt-et-card {
  position: relative;
  background: var(--card);
  border: 1px solid var(--a-card-line);
  border-radius: 15px;
  padding: 14px 15px;
  min-width: 0;
  box-shadow: 0 2px 8px -5px hsla(220,30%,40%,.18);
  transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease, background 160ms ease;
}
.lt-et-card:hover {
  border-color: var(--a);
  box-shadow: 0 11px 24px -13px var(--a-shadow);
  transform: translateY(-2px);
}
.lt-et-card.is-selected { background: var(--a-tint); border-color: var(--a); }
/* The card with an open menu must out-stack its siblings, or the popover
   slides underneath the next card. */
.lt-et-card.is-menuopen { z-index: 40; }
.lt-et-cardtop { display: flex; align-items: flex-start; gap: 12px; min-width: 0; }
.lt-et-cardmain { flex: 1; min-width: 0; }
.lt-et-name {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
}
.lt-et-title {
  font-family: ${FONT_DISPLAY};
  font-size: 15px;
  font-weight: 700;
  color: var(--fg);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.lt-et-tier {
  flex: none;
  font-size: 9.5px;
  font-weight: 800;
  letter-spacing: .05em;
  border-radius: 999px;
  padding: 3px 9px;
  white-space: nowrap;
  border: 1px solid transparent;
}
/* Semantic mapping unchanged — only "low" moves off grey onto the band violet. */
.lt-et-tier--high { background: hsl(152,55%,94%); color: hsl(152,60%,30%); border-color: hsl(152,45%,86%); }
.lt-et-tier--medium { background: hsl(43,90%,93%); color: ${CAUTION_FG}; border-color: hsl(40,60%,84%); }
.lt-et-tier--low { background: hsl(255,55%,96%); color: hsl(255,45%,45%); border-color: hsl(255,50%,87%); }
.lt-et-hpq {
  flex: none;
  font-size: 9.5px;
  font-weight: 750;
  border-radius: 999px;
  padding: 3px 9px;
  white-space: nowrap;
  background: var(--card);
  color: var(--a-deep);
  border: 1px solid var(--a-line);
}
/* The chapter blurb — real catalogue content. Restyled, never removed: silence
   in a spec is not authorisation to delete rendered content. Single-line
   ellipsis exactly as trunk rendered it. */
.lt-et-blurb {
  margin-top: 4px;
  font-size: 11.5px;
  line-height: 1.45;
  color: var(--tert);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.lt-et-weight { margin-top: 10px; display: flex; align-items: center; gap: 10px; min-width: 0; }
.lt-et-bar {
  flex: 1;
  min-width: 0;
  max-width: 220px;
  height: 8px;
  border-radius: 999px;
  background: hsl(220,16%,94%);
  overflow: hidden;
}
.lt-et-barfill {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--a-bar), var(--a-deep));
}
.lt-et-marks {
  flex: none;
  font-size: 11px;
  font-weight: 750;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.lt-et-expect {
  margin-top: 11px;
  display: flex;
  gap: 9px;
  align-items: flex-start;
  border-radius: 12px;
  padding: 10px 12px;
  min-width: 0;
  background: var(--a-tint);
  border: 1px solid var(--a-line);
}
.lt-et-expect-lb {
  flex: none;
  margin-top: 2px;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: var(--a-deep);
}
.lt-et-expect-tx { min-width: 0; font-size: 12px; line-height: 1.5; color: hsl(220,22%,26%); }
.lt-et-caution {
  margin-top: 9px;
  display: flex;
  gap: 7px;
  align-items: flex-start;
  background: var(--caution-bg);
  border: 1px solid var(--caution-line);
  border-radius: 11px;
  padding: 8px 11px;
  font-size: 11.5px;
  line-height: 1.45;
  color: var(--caution-fg);
  min-width: 0;
}
.lt-et-caution svg { flex: none; margin-top: 1px; }

/* ── Actions ──────────────────────────────────────────────────────────── */
.lt-et-actions { display: flex; align-items: center; gap: 7px; flex: none; }
.lt-et-btn {
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-radius: 11px;
  padding: 9px 16px;
  font-family: ${FONT_BODY};
  font-size: 12.5px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  border: 1px solid transparent;
  transition: filter 150ms ease, border-color 150ms ease, color 150ms ease, background 150ms ease;
}
.lt-et-btn--primary {
  background: linear-gradient(140deg, var(--a), var(--a-deep));
  color: #fff;
  box-shadow: 0 4px 12px -4px var(--a-shadow);
}
.lt-et-btn--primary:hover { filter: brightness(1.08); }
.lt-et-btn--ghost {
  background: var(--card);
  border-color: var(--border);
  color: var(--muted);
  padding: 9px 12px;
}
.lt-et-btn--ghost:hover { border-color: var(--a); color: var(--a-deep); }
.lt-et-btn--ghost[aria-pressed="true"] {
  border-color: var(--a);
  color: var(--a-deep);
  background: var(--a-tint);
}

/* ── The ⋯ popover — anchored to ITS OWN button (§5 cause 2) ──────────── */
.lt-et-mwrap { position: relative; flex: none; display: inline-flex; }
.lt-et-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  min-width: 210px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 14px;
  box-shadow: 0 18px 42px -14px hsla(220,40%,20%,.45);
  padding: 6px;
  z-index: 60;
}
.lt-et-menu.is-up { top: auto; bottom: calc(100% + 6px); }
.lt-et-menu button {
  appearance: none;
  display: flex;
  width: 100%;
  align-items: center;
  gap: 10px;
  border: 0;
  background: transparent;
  border-radius: 10px;
  padding: 10px 12px;
  font-family: ${FONT_BODY};
  font-size: 12.5px;
  font-weight: 600;
  color: var(--fg);
  text-align: left;
  cursor: pointer;
}
.lt-et-menu button:hover { background: var(--a-tint); color: var(--a-deep); }

/* ── Selected tray ────────────────────────────────────────────────────── */
.lt-et-tray {
  --a: ${PRIMARY_GREEN};
  --a-deep: ${PRIMARY_GREEN_DEEP};
  --a-tint: hsl(152,50%,96%);
  --a-shadow: hsla(152,55%,30%,.6);
  background: linear-gradient(160deg, var(--card), hsl(152,50%,96%));
  border: 1px solid hsl(152,42%,85%);
  border-radius: 18px;
  padding: 15px 17px;
  margin-bottom: 16px;
  box-shadow: 0 6px 20px -14px hsla(220,40%,25%,.4);
  min-width: 0;
}
.lt-et-tray-h {
  font-size: 9.5px;
  font-weight: 800;
  letter-spacing: .1em;
  text-transform: uppercase;
  color: hsl(152,60%,34%);
  margin-bottom: 5px;
}
.lt-et-tray-n {
  font-family: ${FONT_DISPLAY};
  font-size: 14px;
  font-weight: 600;
  line-height: 1.5;
  margin-bottom: 12px;
  color: var(--fg);
}
.lt-et-tray-a { display: flex; gap: 8px; flex-wrap: wrap; }

.lt-et-empty {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 18px;
  padding: 28px;
  text-align: center;
  color: var(--muted);
  font-size: 14px;
}
.lt-et-foot {
  margin-top: 18px;
  font-size: 11.5px;
  line-height: 1.6;
  color: var(--tert);
  text-align: center;
  padding: 0 10px;
}

/* ── Responsive — ONE component at every width, no breakpoint file-swap ─ */
@media (max-width: 640px) {
  .lt-et { padding: 16px 13px 56px; }
  .lt-et-hero { padding: 15px 14px; margin-bottom: 13px; }
  .lt-et-hero h1 { font-size: 20px; }
  .lt-et-hero p { font-size: 12.5px; }
  .lt-et-band { margin-bottom: 11px; }
  .lt-et-bandhead { padding: 12px 13px; gap: 10px; }
  .lt-et-bandnum { width: 30px; height: 30px; font-size: 13.5px; border-radius: 10px; }
  .lt-et-rows { padding: 0 9px 9px; gap: 8px; }
}
@media (max-width: 540px) {
  /* The action row wraps beneath the content; Learn stretches so the primary
     action stays thumb-sized. Never shrink it. */
  .lt-et-cardtop { flex-wrap: wrap; }
  .lt-et-actions { width: 100%; margin-top: 10px; }
  .lt-et-actions .lt-et-btn--primary { flex: 1; }
  .lt-et-menu { min-width: 186px; }
}
@media (max-width: 520px) {
  .lt-et-card { padding: 11px 12px; border-radius: 13px; }
  .lt-et-title { font-size: 13.5px; }
  .lt-et-bandtitle { font-size: 14.5px; gap: 7px; }
  .lt-et-banddef { font-size: 11px; margin-top: 2px; }
  .lt-et-name { gap: 6px; }
  .lt-et-blurb { font-size: 11px; margin-top: 3px; }
  .lt-et-tier, .lt-et-hpq { font-size: 9px; padding: 2px 7px; }
  .lt-et-weight { margin-top: 8px; gap: 8px; }
  .lt-et-bar { height: 5px; }
  .lt-et-marks { font-size: 10px; }
  .lt-et-expect { margin-top: 9px; padding: 8px 10px; gap: 7px; border-radius: 10px; }
  .lt-et-expect-tx {
    font-size: 11px;
    line-height: 1.45;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .lt-et-caution { font-size: 10.5px; padding: 7px 9px; margin-top: 8px; border-radius: 9px; }
  .lt-et-btn { padding: 9px 14px; font-size: 12px; }
  .lt-et-tray-a { flex-direction: column; }
  .lt-et-tray-a .lt-et-btn { width: 100%; }
}
`;

// ─── Hero ────────────────────────────────────────────────────────────────────
function PageHero({ children }: { children: React.ReactNode }) {
  return (
    <header className="lt-et-hero">
      <span className="lt-et-cred">
        <IconAward />
        Ten years of real CBSE papers
      </span>
      <h1>Exam Trends</h1>
      <p>
        Every chapter ranked into three priority bands. Start at the top — the band
        is the verdict, so you never have to weigh marks against frequency yourself.
      </p>
      {children}
    </header>
  );
}

// ─── Controls row (Subject + Science stream) — flex-wraps on phones ─────────
function ControlsRow({
  subject,
  stream,
  onSubject,
  onStream,
}: {
  subject: DesktopSubject;
  stream: DesktopStream;
  onSubject: (s: DesktopSubject) => void;
  onStream: (s: DesktopStream) => void;
}) {
  const scienceDisabled = subject !== "Science";
  return (
    <div className="lt-et-filters">
      <span className="lt-et-seg">
        {(["Maths", "Science"] as DesktopSubject[]).map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={subject === s}
            onClick={() => onSubject(s)}
          >
            {s}
          </button>
        ))}
      </span>
      {(["All", "Physics", "Chemistry", "Biology"] as DesktopStream[]).map((s) => (
        <button
          key={s}
          type="button"
          className="lt-et-chip"
          aria-pressed={!scienceDisabled && stream === s}
          disabled={scienceDisabled}
          onClick={() => onStream(s)}
        >
          {s}
        </button>
      ))}
    </div>
  );
}

// ─── Selected-topic tray — multi-select secondary surface (honest, optional) ─
// Kept IN FLOW rather than the prototype's sticky-bottom: at mobile width this
// page renders inside MobileShell with a fixed BottomNav, which a sticky tray
// would sit underneath.
function SelectedTopicTray({
  selectedSlugs,
  subject,
  stream,
  onPractice,
  onWorksheet,
  onPredicted,
  onClear,
}: {
  selectedSlugs: string[];
  subject: DesktopSubject;
  stream: DesktopStream;
  onPractice: () => void;
  onWorksheet: () => void;
  onPredicted: () => void;
  onClear: () => void;
}) {
  const names = selectedSlugs
    .map((slug) => desktopTopicBySlug(slug)?.name)
    .filter(Boolean) as string[];
  const subjectLabel =
    subject === "Science" && stream !== "All" ? `Science · ${stream}` : subject;
  return (
    <section className="lt-et-tray">
      <div className="lt-et-tray-h">Selected · {subjectLabel}</div>
      <div className="lt-et-tray-n">{names.join(" + ")}</div>
      <div className="lt-et-tray-a">
        <button type="button" className="lt-et-btn lt-et-btn--primary" onClick={onPractice}>
          <IconLayers />
          Practice selected
        </button>
        <button type="button" className="lt-et-btn lt-et-btn--ghost" onClick={onWorksheet}>
          <IconClipboard />
          Worksheet
        </button>
        <button type="button" className="lt-et-btn lt-et-btn--ghost" onClick={onPredicted}>
          <IconSparkles />
          Predicted Qs
        </button>
        <button type="button" className="lt-et-btn lt-et-btn--ghost" onClick={onClear}>
          <IconTrash />
          Clear
        </button>
      </div>
    </section>
  );
}

// ─── Topic card — the ranked-list unit, reused inside every band ────────────
function TopicCard({
  topic,
  meta,
  maxWeight,
  hpqCount,
  selected,
  menuOpen,
  onToggleMenu,
  onOpen,
  onPractice,
  onWorksheet,
  onPredicted,
  onToggleSelect,
}: {
  topic: DesktopTopicSummary;
  meta: BandMeta | undefined;
  maxWeight: number;
  hpqCount: number;
  selected: boolean;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onOpen: () => void;
  onPractice: () => void;
  onWorksheet: () => void;
  onPredicted: () => void;
  onToggleSelect: () => void;
}) {
  const barPct = Math.min(100, (topic.weight / maxWeight) * 100);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [flipUp, setFlipUp] = useState(false);

  // §5 — a card near the viewport bottom must open its menu UPWARD. Rendered
  // downward first, measured, then flipped if it would be cut off.
  useLayoutEffect(() => {
    if (!menuOpen) {
      setFlipUp(false);
      return;
    }
    const el = menuRef.current;
    if (!el || typeof el.getBoundingClientRect !== "function") return;
    const rect = el.getBoundingClientRect();
    const viewportH = window.innerHeight || document.documentElement.clientHeight;
    if (rect.height > 0 && rect.bottom > viewportH - 8) setFlipUp(true);
  }, [menuOpen]);

  const menuId = `lt-et-menu-${topic.slug}`;
  return (
    <article
      className={`lt-et-card${selected ? " is-selected" : ""}${menuOpen ? " is-menuopen" : ""}`}
      data-topic-slug={topic.slug}
    >
      <div className="lt-et-cardtop">
        <div className="lt-et-cardmain">
          <div className="lt-et-name">
            <span className="lt-et-title">{topic.name}</span>
            <span className={`lt-et-tier ${TIER_CLASS[topic.trendTier]}`}>
              {TIER_LABEL[topic.trendTier]}
            </span>
            {/* HPQ chip — the real count only; no bucket match renders nothing. */}
            {hpqCount > 0 && (
              <span className="lt-et-hpq">
                {hpqCount} predicted Q{hpqCount === 1 ? "" : "s"}
              </span>
            )}
          </div>

          {/* Real catalogue copy — restyled, never dropped. */}
          <div className="lt-et-blurb">{topic.blurb}</div>

          {/* Marks-weight bar + the REAL marks label (never the bar's ratio). */}
          <div className="lt-et-weight">
            <span className="lt-et-bar">
              <span className="lt-et-barfill" style={{ width: `${barPct}%` }} />
            </span>
            <span className="lt-et-marks">~{topic.weight} marks</span>
          </div>

          {/* Recurring sub-pattern — the SHAPE, never a specific question. Renders
              only where the locked doc supplies one (must-crack topics). */}
          {meta?.subPattern && (
            <div className="lt-et-expect">
              <span className="lt-et-expect-lb">Expect</span>
              <span className="lt-et-expect-tx">{meta.subPattern}</span>
            </div>
          )}

          {meta?.volatile && (
            <div className="lt-et-caution">
              <IconAlert />
              <span>
                Highest-weight but most volatile — prepare deep, don&apos;t bank a fixed
                mark-total.
              </span>
            </div>
          )}
        </div>

        {/* Right block — select, Learn, ⋯; wraps under the content below 540px */}
        <div className="lt-et-actions">
          <button
            type="button"
            className="lt-et-btn lt-et-btn--ghost"
            aria-pressed={selected}
            aria-label={
              selected
                ? `Remove ${topic.name} from selection`
                : `Add ${topic.name} to selection`
            }
            onClick={onToggleSelect}
          >
            {selected ? <IconCheck /> : <IconPlus />}
          </button>
          <button type="button" className="lt-et-btn lt-et-btn--primary" onClick={onOpen}>
            <IconBook />
            Learn
          </button>
          {/* position:relative wrapper — without it the absolute menu falls back
              to its static position, i.e. below the whole card (§5 cause 2). */}
          <span className="lt-et-mwrap" data-lt-et-menu-wrap="">
            <button
              type="button"
              className="lt-et-btn lt-et-btn--ghost"
              aria-label={`More actions for ${topic.name}`}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-controls={menuOpen ? menuId : undefined}
              onClick={onToggleMenu}
            >
              <IconMore />
            </button>
            {menuOpen && (
              <div
                id={menuId}
                ref={menuRef}
                role="menu"
                className={`lt-et-menu${flipUp ? " is-up" : ""}`}
              >
                <button type="button" role="menuitem" onClick={onPractice}>
                  <IconLayers />
                  Practice this chapter
                </button>
                <button type="button" role="menuitem" onClick={onWorksheet}>
                  <IconClipboard />
                  Build a worksheet
                </button>
                <button type="button" role="menuitem" onClick={onPredicted}>
                  <IconSparkles />
                  Predicted questions
                </button>
              </div>
            )}
          </span>
        </div>
      </div>
    </article>
  );
}

// ─── Priority band — collapsible header + the reused cards ──────────────────
function PriorityBand({
  band,
  topics,
  open,
  maxWeight,
  hpqCounts,
  selectedSlugs,
  openMenuSlug,
  onToggleOpen,
  onToggleMenu,
  onOpen,
  onPractice,
  onWorksheet,
  onPredicted,
  onToggleSelect,
}: {
  band: Band;
  topics: DesktopTopicSummary[];
  open: boolean;
  maxWeight: number;
  hpqCounts: Map<string, number>;
  selectedSlugs: string[];
  openMenuSlug: string | null;
  onToggleOpen: () => void;
  onToggleMenu: (slug: string) => void;
  onOpen: (topic: DesktopTopicSummary) => void;
  onPractice: (topic: DesktopTopicSummary) => void;
  onWorksheet: (topic: DesktopTopicSummary) => void;
  onPredicted: (topic: DesktopTopicSummary) => void;
  onToggleSelect: (slug: string) => void;
}) {
  const display = BAND_DISPLAY[band];
  const count = topics.length;
  return (
    <section className={`lt-et-band lt-et-band--${band}`} data-band={band}>
      <button
        type="button"
        className="lt-et-bandhead"
        onClick={onToggleOpen}
        aria-expanded={open}
      >
        <span className="lt-et-bandnum" aria-hidden>
          {BAND_INDEX[band]}
        </span>
        <span className="lt-et-bandtxt">
          <span className="lt-et-bandtitle">
            {display.label}
            <span className="lt-et-bandcount">
              {count} chapter{count === 1 ? "" : "s"}
            </span>
          </span>
          <span className="lt-et-banddef">{display.definition}</span>
        </span>
        <span className="lt-et-bandchev">
          <IconChevron open={open} />
        </span>
      </button>

      {open && (
        <div className="lt-et-rows">
          {topics.map((topic) => (
            <TopicCard
              key={topic.slug}
              topic={topic}
              meta={BAND_BY_SLUG[topic.slug]}
              maxWeight={maxWeight}
              hpqCount={hpqCounts.get(topic.slug) ?? 0}
              selected={selectedSlugs.includes(topic.slug)}
              menuOpen={openMenuSlug === topic.slug}
              onToggleMenu={() => onToggleMenu(topic.slug)}
              onOpen={() => onOpen(topic)}
              onPractice={() => onPractice(topic)}
              onWorksheet={() => onWorksheet(topic)}
              onPredicted={() => onPredicted(topic)}
              onToggleSelect={() => onToggleSelect(topic.slug)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function ExamTrendsRanked() {
  const navigate = useNavigate();
  const location = useLocation();
  // C&I PR-2 item E — at mobile width this page owns the shared MobileShell header
  // (the app-wide avatar-dropdown), retiring the old global brand bar. Desktop width
  // stays inside DesktopShell, unchanged.
  const isDesktop = useIsDesktop();
  const [subject, setSubject] = useState<DesktopSubject>("Maths");
  const [stream, setStream] = useState<DesktopStream>("All");
  const [openBands, setOpenBands] = useState<Record<Band, boolean>>(() => ({
    "must-crack": BAND_DISPLAY["must-crack"].defaultOpen,
    "high-roi": BAND_DISPLAY["high-roi"].defaultOpen,
    "good-to-do": BAND_DISPLAY["good-to-do"].defaultOpen,
  }));
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const [openMenuSlug, setOpenMenuSlug] = useState<string | null>(null);
  const currentExamTrendsUrl = `${location.pathname}${location.search}`;

  // §5 — a click anywhere outside an open menu closes it. Anchored on the wrapper
  // (which contains the ⋯ button itself) so re-clicking that button still toggles
  // rather than close-then-reopen.
  useEffect(() => {
    if (!openMenuSlug) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        typeof target.closest === "function" &&
        target.closest("[data-lt-et-menu-wrap]")
      ) {
        return;
      }
      setOpenMenuSlug(null);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [openMenuSlug]);

  // Science → Maths resets the stream so the (disabled) toggle is never left
  // pre-selected on a stream when the user toggles back later.
  const handleSubject = (next: DesktopSubject) => {
    setSubject(next);
    if (next === "Maths") setStream("All");
  };

  // One filtered, weight-desc list; the bands regroup it (the band IS the
  // synthesis, so there is no more weight-vs-trend Sort toggle).
  const sortedTopics = useMemo<DesktopTopicSummary[]>(() => {
    const list = desktopTopicsBySubject(subject, stream);
    return [...list].sort((a, b) => b.weight - a.weight);
  }, [subject, stream]);

  const maxWeight = useMemo(
    () => sortedTopics.reduce((m, t) => Math.max(m, t.weight), 1),
    [sortedTopics],
  );

  // Group the filtered list into the three owner-locked bands, preserving the
  // weight-desc order inside each band. A topic with no locked entry (shouldn't
  // happen — the locked doc covers every topic) falls back to Good-to-do rather
  // than being silently dropped.
  const bandedTopics = useMemo<Record<Band, DesktopTopicSummary[]>>(() => {
    const groups: Record<Band, DesktopTopicSummary[]> = {
      "must-crack": [],
      "high-roi": [],
      "good-to-do": [],
    };
    sortedTopics.forEach((topic) => {
      const band = BAND_BY_SLUG[topic.slug]?.band ?? "good-to-do";
      groups[band].push(topic);
    });
    return groups;
  }, [sortedTopics]);

  const hpqCounts = useMemo(() => {
    const map = new Map<string, number>();
    sortedTopics.forEach((topic) => map.set(topic.slug, countHPQForTopic(topic)));
    return map;
  }, [sortedTopics]);

  const toggleSelect = (slug: string) => {
    setSelectedSlugs((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
  };

  const toggleMenu = (slug: string) => {
    setOpenMenuSlug((prev) => (prev === slug ? null : slug));
  };

  const toggleBand = (band: Band) => {
    // Toggling a band closes any open menu — its anchoring card may unmount.
    setOpenMenuSlug(null);
    setOpenBands((prev) => ({ ...prev, [band]: !prev[band] }));
  };

  const goPracticeTopic = (topic: DesktopTopicSummary) => {
    navigate(
      buildDesktopPracticePath({
        scope: "topic",
        subject: topic.subject,
        stream: topic.subject === "Science" ? topic.stream : undefined,
        topic: topic.slug,
        mode: "practice-set",
        source: "trends",
        returnTo: currentExamTrendsUrl,
      }),
    );
  };

  const goWorksheetTopic = (topic: DesktopTopicSummary) => {
    navigate(
      buildDesktopWorksheetPath({
        scope: "topic",
        subject: topic.subject,
        stream: topic.subject === "Science" ? topic.stream : undefined,
        topic: topic.slug,
        source: "trends",
        returnTo: currentExamTrendsUrl,
      }),
    );
  };

  const goPredictedTopic = (topic: DesktopTopicSummary) => {
    const params = new URLSearchParams();
    params.set("topic", topic.slug);
    params.set("source", "trends");
    params.set("returnTo", currentExamTrendsUrl);
    navigate(`/highly-probable/10/${topic.subject}?${params.toString()}`);
  };

  const goTopicHub = (topic: DesktopTopicSummary) => {
    navigate(
      buildDesktopTopicHubPath(topic.slug, {
        source: "trends",
        returnTo: currentExamTrendsUrl,
      }),
    );
  };

  const goPracticeSelected = () => {
    if (selectedSlugs.length === 0) return;
    navigate(
      buildDesktopPracticePath({
        scope: "multi-topic",
        subject,
        stream: subject === "Science" ? stream : undefined,
        topics: selectedSlugs,
        mode: "practice-set",
        source: "trends",
        returnTo: currentExamTrendsUrl,
      }),
    );
  };

  const goWorksheetSelected = () => {
    if (selectedSlugs.length === 0) return;
    navigate(
      buildDesktopWorksheetPath({
        scope: "multi-topic",
        subject,
        stream: subject === "Science" ? stream : undefined,
        topics: selectedSlugs,
        source: "trends",
        returnTo: currentExamTrendsUrl,
      }),
    );
  };

  const goPredictedSelected = () => {
    if (selectedSlugs.length === 0) return;
    const params = new URLSearchParams();
    params.set("topics", selectedSlugs.join(","));
    params.set("source", "trends");
    params.set("returnTo", currentExamTrendsUrl);
    navigate(`/highly-probable/10/${subject}?${params.toString()}`);
  };

  const clearSelection = () => setSelectedSlugs([]);

  const hasTopics = sortedTopics.length > 0;

  const pageBody = (
    <div className="lt-et">
      <style>{STYLES}</style>

      <PageHero>
        <ControlsRow
          subject={subject}
          stream={stream}
          onSubject={handleSubject}
          onStream={setStream}
        />
      </PageHero>

      {selectedSlugs.length > 0 && (
        <SelectedTopicTray
          selectedSlugs={selectedSlugs}
          subject={subject}
          stream={stream}
          onPractice={goPracticeSelected}
          onWorksheet={goWorksheetSelected}
          onPredicted={goPredictedSelected}
          onClear={clearSelection}
        />
      )}

      {!hasTopics ? (
        <div className="lt-et-empty">No topics match this filter yet.</div>
      ) : (
        BAND_ORDER.filter((band) => bandedTopics[band].length > 0).map((band) => (
          <PriorityBand
            key={band}
            band={band}
            topics={bandedTopics[band]}
            open={openBands[band]}
            maxWeight={maxWeight}
            hpqCounts={hpqCounts}
            selectedSlugs={selectedSlugs}
            openMenuSlug={openMenuSlug}
            onToggleOpen={() => toggleBand(band)}
            onToggleMenu={toggleMenu}
            onOpen={goTopicHub}
            onPractice={goPracticeTopic}
            onWorksheet={goWorksheetTopic}
            onPredicted={goPredictedTopic}
            onToggleSelect={toggleSelect}
          />
        ))
      )}

      <p className="lt-et-foot">
        Trend strength shows High / Medium / Low — never an invented percentage.
      </p>
    </div>
  );

  // Mobile: wrap in the shared header (avatar-dropdown). Desktop: bare — DesktopShell
  // already provides the chrome (item E).
  return isDesktop ? (
    pageBody
  ) : (
    <MobileShell title="Exam Trends" subtitle="What to prioritise" showNav>
      {pageBody}
    </MobileShell>
  );
}
