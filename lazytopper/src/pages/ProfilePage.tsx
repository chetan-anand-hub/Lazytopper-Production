import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useProfile } from "../context/ProfileContext";
import { useAuth } from "../context/AuthContext";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Label,
} from "recharts";
// Inline icon helpers (no lucide-react dependency)
const IcoSettings = ({ size = 17, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);
const IcoFlame = ({ size = 13, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
  </svg>
);
const IcoCalendar = ({ size = 14, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);
const IcoBook = ({ size = 12, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
  </svg>
);
const IcoPen = ({ size = 12, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/>
  </svg>
);
const IcoFile = ({ size = 13, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
  </svg>
);
const IcoTrophy = ({ size = 16, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="8 21 12 21 16 21"/><line x1="12" y1="17" x2="12" y2="21"/><path d="M7 4h10v7a5 5 0 0 1-10 0z"/><path d="M7 9H4a2 2 0 0 1-2-2V5h5"/><path d="M17 9h3a2 2 0 0 0 2-2V5h-5"/>
  </svg>
);
const IcoChevronUp = ({ size = 14, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="18 15 12 9 6 15"/>
  </svg>
);
const IcoChevronDown = ({ size = 14, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);
const IcoShare = ({ size = 16, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
  </svg>
);
const IcoDownload = ({ size = 16, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);
import { loadInsights } from "../services/practiceInsights";
import { loadMockScoreHistory } from "../services/mockScoreHistory";
import { loadTopicMasterySnapshot } from "../services/topicHubMastery";
import { getWeakAreas, type WeakArea } from "../services/weakAreaAggregator";
import {
  buildBadgeContext, evaluateBadges, BADGE_DEFINITIONS,
} from "../services/badgeEngine";
import { canonicalChapters } from "../data/syllabus/cbse10Canonical";
import { normalizeTopicKey } from "../utils/topicResolver";

// ── Types ────────────────────────────────────────────────────────────────────

type Range = "7D" | "4W" | "3M" | "All";
type SubjectTab = "maths" | "science";
type MistakeType = "Concept Gap" | "Speed Issue" | "Accuracy";

interface TopicRow {
  topicKey: string;
  name: string;
  subject: SubjectTab;
  status: "mastered" | "needs_practice" | "learning" | "unseen";
  learnPct: number;
  practicePct: number;
  masteryPct: number;
}

interface WeakSpot {
  rank: number;
  topicKey: string;
  topic: string;
  subject: string;
  acc: number;
  mistakeType: MistakeType;
}

interface BadgeRow {
  id: string;
  name: string;
  icon: string;
  earnedAt: string;
}

interface ChartBar {
  name: string;
  Learn: number;
  Practice: number;
  Test: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function dayLabel(ts: number): string {
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date(ts).getDay()];
}

function monthLabel(ts: number): string {
  return new Date(ts).toLocaleString("default", { month: "short" });
}

function isoToTs(iso: string): number {
  try { return new Date(iso).getTime(); } catch { return 0; }
}

/**
 * Collect learn-activity events per canonical chapter node.
 * TopicHub's in-session `conceptsCompleted[]` stores concept titles only (no timestamps),
 * so the persisted topicHubMastery node `updatedAt` is the only available per-concept
 * timestamp. Counting non-unseen nodes by their `updatedAt` gives the best-available
 * "concepts completed" count per day/period.
 */
function collectLearnEvents(): number[] {
  const events: number[] = [];
  for (const ch of canonicalChapters) {
    const key = normalizeTopicKey(ch.canonicalSlug);
    const snap = loadTopicMasterySnapshot(key);
    for (const node of Object.values(snap.nodes)) {
      if (node.state !== "unseen" && node.updatedAt) {
        events.push(isoToTs(node.updatedAt));
      }
    }
  }
  return events;
}

interface TrendResult {
  current: number;
  previous: number;
  pct: number | null;
  label: string;
}

function computeTrend(range: Range): TrendResult | null {
  if (range === "All") return null;

  const now = Date.now();
  const practiceAttempts = loadInsights().attempts;
  const testEntries = loadMockScoreHistory().entries;
  const learnEvents = collectLearnEvents();

  function countAll(from: number, to: number): number {
    return (
      learnEvents.filter(t => t >= from && t < to).length +
      practiceAttempts.filter(a => a.timestamp >= from && a.timestamp < to).length +
      testEntries.filter(e => e.timestamp >= from && e.timestamp < to).length
    );
  }

  let current = 0;
  let previous = 0;
  let label = "";

  if (range === "7D") {
    const curStart  = startOfDay(now - 6 * 86400000);
    const curEnd    = startOfDay(now) + 86400000;
    const prevStart = curStart - 7 * 86400000;
    const prevEnd   = curStart;
    current  = countAll(curStart, curEnd);
    previous = countAll(prevStart, prevEnd);
    label = "vs last week";
  } else if (range === "4W") {
    const curStart  = startOfDay(now - (3 * 7 + 6) * 86400000);
    const curEnd    = startOfDay(now) + 86400000;
    const prevStart = curStart - 28 * 86400000;
    const prevEnd   = curStart;
    current  = countAll(curStart, curEnd);
    previous = countAll(prevStart, prevEnd);
    label = "vs prev 4 wks";
  } else if (range === "3M") {
    const d = new Date(now);
    d.setMonth(d.getMonth() - 2, 1);
    d.setHours(0, 0, 0, 0);
    const curStart = d.getTime();
    const curEnd   = startOfDay(now) + 86400000;

    const pd = new Date(d);
    pd.setMonth(pd.getMonth() - 3);
    const prevStart = pd.getTime();
    const prevEnd   = curStart;
    current  = countAll(curStart, curEnd);
    previous = countAll(prevStart, prevEnd);
    label = "vs prev 3 months";
  }

  const pct = previous === 0
    ? (current > 0 ? null : 0)
    : Math.round(((current - previous) / previous) * 100);

  return { current, previous, pct, label };
}

function computeActivityData(range: Range): ChartBar[] {
  const now = Date.now();

  const practiceAttempts = loadInsights().attempts;
  const testEntries = loadMockScoreHistory().entries;
  const learnEvents = collectLearnEvents();

  if (range === "7D") {
    const result: ChartBar[] = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = startOfDay(now - i * 86400000);
      const dayEnd   = dayStart + 86400000;
      result.push({
        name: dayLabel(dayStart),
        Learn:    learnEvents.filter(t => t >= dayStart && t < dayEnd).length,
        Practice: practiceAttempts.filter(a => a.timestamp >= dayStart && a.timestamp < dayEnd).length,
        Test:     testEntries.filter(e => e.timestamp >= dayStart && e.timestamp < dayEnd).length,
      });
    }
    return result;
  }

  if (range === "4W") {
    const result: ChartBar[] = [];
    for (let w = 3; w >= 0; w--) {
      const weekStart = startOfDay(now - (w * 7 + 6) * 86400000);
      const weekEnd   = startOfDay(now - (w * 7 - 1) * 86400000);
      result.push({
        name: `Wk ${4 - w}`,
        Learn:    learnEvents.filter(t => t >= weekStart && t < weekEnd).length,
        Practice: practiceAttempts.filter(a => a.timestamp >= weekStart && a.timestamp < weekEnd).length,
        Test:     testEntries.filter(e => e.timestamp >= weekStart && e.timestamp < weekEnd).length,
      });
    }
    return result;
  }

  if (range === "3M") {
    const result: ChartBar[] = [];
    for (let m = 2; m >= 0; m--) {
      const d = new Date(now);
      d.setMonth(d.getMonth() - m, 1);
      d.setHours(0, 0, 0, 0);
      const monthStart = d.getTime();
      d.setMonth(d.getMonth() + 1);
      const monthEnd   = d.getTime();
      result.push({
        name: monthLabel(monthStart),
        Learn:    learnEvents.filter(t => t >= monthStart && t < monthEnd).length,
        Practice: practiceAttempts.filter(a => a.timestamp >= monthStart && a.timestamp < monthEnd).length,
        Test:     testEntries.filter(e => e.timestamp >= monthStart && e.timestamp < monthEnd).length,
      });
    }
    return result;
  }

  // All — group by month from earliest event
  const allTs = [
    ...learnEvents,
    ...practiceAttempts.map(a => a.timestamp),
    ...testEntries.map(e => e.timestamp),
  ].filter(t => t > 0);

  if (allTs.length === 0) {
    return [{ name: monthLabel(now), Learn: 0, Practice: 0, Test: 0 }];
  }

  const earliest = new Date(Math.min(...allTs));
  earliest.setDate(1);
  earliest.setHours(0, 0, 0, 0);

  const result: ChartBar[] = [];
  const cursor = new Date(earliest);
  while (cursor.getTime() <= now) {
    const monthStart = cursor.getTime();
    cursor.setMonth(cursor.getMonth() + 1);
    const monthEnd = cursor.getTime();
    result.push({
      name: monthLabel(monthStart),
      Learn:    learnEvents.filter(t => t >= monthStart && t < monthEnd).length,
      Practice: practiceAttempts.filter(a => a.timestamp >= monthStart && a.timestamp < monthEnd).length,
      Test:     testEntries.filter(e => e.timestamp >= monthStart && e.timestamp < monthEnd).length,
    });
  }
  return result;
}

function computeSubjectStats() {
  const allAttempts = loadInsights().attempts;
  const result = {
    maths:   { mastered: 0, total: 0, acc: 0, attempted: 0 },
    science: { mastered: 0, total: 0, acc: 0, attempted: 0 },
  };

  for (const ch of canonicalChapters) {
    const subj = ch.subjectId as "maths" | "science";
    result[subj].total++;
    const snap = loadTopicMasterySnapshot(normalizeTopicKey(ch.canonicalSlug));
    const nodes = Object.values(snap.nodes);
    const allMastered = nodes.length > 0 && nodes.every(n => n.state === "mastered");
    if (allMastered) result[subj].mastered++;
  }

  for (const subj of ["maths", "science"] as const) {
    const subjAttempts = allAttempts.filter(a => a.subject === subj);
    result[subj].attempted = subjAttempts.length;
    result[subj].acc = subjAttempts.length > 0
      ? Math.round((subjAttempts.filter(a => a.correct).length / subjAttempts.length) * 100)
      : 0;
  }

  return result;
}

function computeTopicsData(subject: SubjectTab): TopicRow[] {
  const allAttempts = loadInsights().attempts;
  return canonicalChapters
    .filter(ch => ch.subjectId === subject)
    .map(ch => {
      const key = normalizeTopicKey(ch.canonicalSlug);
      const snap = loadTopicMasterySnapshot(key);
      const nodes = Object.values(snap.nodes);

      const nonUnseen = nodes.filter(n => n.state !== "unseen");
      const learnPct = nodes.length > 0
        ? Math.round((nonUnseen.length / nodes.length) * 100)
        : 0;
      const masteryPct = nodes.length > 0
        ? Math.round((nodes.filter(n => n.state === "mastered").length / nodes.length) * 100)
        : 0;

      const topicAttempts = allAttempts.filter(a => normalizeTopicKey(a.topicKey) === key);
      const practicePct = topicAttempts.length > 0
        ? Math.round((topicAttempts.filter(a => a.correct).length / topicAttempts.length) * 100)
        : 0;

      let status: TopicRow["status"] = "unseen";
      if (nodes.length > 0) {
        const worst = nodes.some(n => n.state === "unseen" || n.state === "learning")
          ? "learning"
          : nodes.every(n => n.state === "mastered")
          ? "mastered"
          : "needs_practice";
        status = worst;
      }

      return {
        topicKey: key,
        name: ch.title,
        subject,
        status,
        learnPct,
        practicePct,
        masteryPct,
      };
    });
}

function deriveMistakeType(w: WeakArea): MistakeType {
  if (w.masteryPercent < 40) return "Concept Gap";
  if (w.totalAttempts >= 5 && w.accuracy < 55) return "Speed Issue";
  return "Accuracy";
}

function mistakeStyle(t: MistakeType): { color: string; bg: string } {
  if (t === "Concept Gap") return { color: "#ef4444", bg: "#fef2f2" };
  if (t === "Speed Issue") return { color: "#f97316", bg: "#fff7ed" };
  return { color: "#f59e0b", bg: "#fffbeb" };
}

function statusDot(s: TopicRow["status"]): string {
  return s === "mastered" ? "#10b981" : s === "needs_practice" ? "#f59e0b" : s === "learning" ? "#6366f1" : "#cbd5e1";
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { name: string; value: number; fill: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "var(--bg-card, #fff)",
      border: "none",
      borderRadius: 10,
      boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
      padding: "10px 14px",
      fontSize: 12,
      fontWeight: 600,
    }}>
      <div style={{ color: "var(--text-muted, #64748b)", marginBottom: 4, fontWeight: 700 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.fill, marginBottom: 2 }}>
          {p.name}: {p.value} Qs
        </div>
      ))}
    </div>
  );
}

// ── SVG circular ring ────────────────────────────────────────────────────────

function CircleRing({ pct, color, size = 64 }: { pct: number; color: string; size?: number }) {
  const stroke = 7;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = Math.max(0, Math.min(1, pct / 100)) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", display: "block" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg-card-border, #f1f5f9)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
    </svg>
  );
}

// ── Mini progress bar ─────────────────────────────────────────────────────────

function MiniBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between mb-0.5" style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted, #94a3b8)" }}>
        <span>{label}</span>
        <span style={{ color }}>{pct}%</span>
      </div>
      <div style={{ height: 6, borderRadius: 6, background: "var(--bg-card-border, #f1f5f9)", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 6, background: color, transition: "width 0.3s" }} />
      </div>
    </div>
  );
}

// ── Skeleton helpers ──────────────────────────────────────────────────────────

const SHIMMER_STYLE_ID = "lt-skeleton-shimmer";

function injectShimmerCSS() {
  if (document.getElementById(SHIMMER_STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = SHIMMER_STYLE_ID;
  el.textContent = `
    @keyframes lt-shimmer {
      0%   { background-position: -200% 0; }
      100% { background-position:  200% 0; }
    }
    @keyframes lt-fadein {
      from { opacity: 0; transform: translateY(-4px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .lt-skel {
      background: linear-gradient(90deg,
        var(--bg-card-border,#f1f5f9) 25%,
        #e2e8f0 50%,
        var(--bg-card-border,#f1f5f9) 75%
      );
      background-size: 200% 100%;
      animation: lt-shimmer 1.4s ease-in-out infinite;
      border-radius: 8px;
    }
  `;
  document.head.appendChild(el);
}

function Skel({ w = "100%", h = 12, r = 8, mb = 0 }: { w?: number | string; h?: number; r?: number; mb?: number }) {
  return (
    <div
      className="lt-skel"
      style={{ width: w, height: h, borderRadius: r, marginBottom: mb, flexShrink: 0 }}
    />
  );
}

function SkeletonCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: "var(--bg-card, #fff)",
      border: "1px solid var(--bg-card-border, #e2e8f0)",
      borderRadius: 20,
      padding: "20px",
      ...style,
    }}>
      {children}
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div style={{ maxWidth: 560, margin: "0 auto", paddingBottom: 100 }}>
      {/* Header skeleton */}
      <div style={{
        background: "var(--bg-card, #fff)",
        borderBottom: "1px solid var(--bg-card-border, #e2e8f0)",
        padding: "44px 20px 16px",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Skel w={44} h={44} r={99} />
            <div>
              <Skel w={120} h={14} mb={6} />
              <Skel w={80} h={10} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Skel w={80} h={38} r={14} />
            <Skel w={38} h={38} r={12} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <Skel w={120} h={30} r={10} />
          <Skel w={180} h={14} r={8} />
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20, padding: "20px 16px" }}>

        {/* Activity chart skeleton */}
        <SkeletonCard>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <Skel w={70} h={14} />
            <Skel w={120} h={28} r={10} />
          </div>
          <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
            <Skel w={50} h={10} /><Skel w={60} h={10} /><Skel w={45} h={10} />
          </div>
          {/* Fake bars */}
          <div style={{ height: 175, display: "flex", alignItems: "flex-end", gap: 6, padding: "0 4px" }}>
            {[70, 100, 55, 130, 90, 45, 110].map((h, i) => (
              <Skel key={i} w="13%" h={h} r={4} />
            ))}
          </div>
        </SkeletonCard>

        {/* Subject cards skeleton */}
        <div style={{ display: "flex", gap: 12 }}>
          {[0, 1].map(i => (
            <SkeletonCard key={i} style={{ flex: 1, padding: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
                <Skel w={50} h={11} /><Skel w={30} h={11} />
              </div>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
                <Skel w={64} h={64} r={99} />
              </div>
              <Skel w="100%" h={6} r={6} mb={8} />
              <Skel w="60%" h={10} r={6} />
            </SkeletonCard>
          ))}
        </div>

        {/* Syllabus mastery skeleton */}
        <SkeletonCard>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
            <Skel w={130} h={14} />
            <Skel w={110} h={28} r={10} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skel key={i} w="100%" h={42} r={12} />
            ))}
          </div>
        </SkeletonCard>

        {/* Focus areas skeleton */}
        <SkeletonCard>
          <Skel w={140} h={14} mb={14} />
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[0, 1, 2].map(i => (
              <Skel key={i} w="100%" h={72} r={14} />
            ))}
          </div>
        </SkeletonCard>

        {/* Badges skeleton */}
        <SkeletonCard>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <Skel w={16} h={16} r={4} />
            <Skel w={110} h={14} />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {[0, 1, 2].map(i => (
              <Skel key={i} w={76} h={90} r={14} />
            ))}
          </div>
        </SkeletonCard>

      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const RANGES: Range[] = ["7D", "4W", "3M", "All"];

export default function ProfilePage() {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { user } = useAuth();

  const [loading, setLoading]           = useState<boolean>(true);
  const [range, setRange]               = useState<Range>("7D");
  const [subjectTab, setSubjectTab]     = useState<SubjectTab>("maths");
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
  const [expandedWeak, setExpandedWeak]   = useState<number | null>(null);
  // SettingsPage stores "1" for hide, "0" for show
  const [hideCountdown, setHideCountdown] = useState<boolean>(
    () => localStorage.getItem("lazytopper.hideCountdown") === "1"
  );

  // Inject shimmer CSS and resolve loading state after a brief paint cycle
  useEffect(() => {
    injectShimmerCSS();
    const id = setTimeout(() => setLoading(false), 200);
    return () => clearTimeout(id);
  }, []);

  const shareCardRef = useRef<HTMLDivElement>(null);
  const [sharing, setSharing] = useState(false);

  const generateShareCanvas = useCallback(async () => {
    if (!shareCardRef.current) throw new Error("No share card");
    const { default: html2canvas } = await import("html2canvas");
    return html2canvas(shareCardRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: null,
      logging: false,
    });
  }, []);

  const handleShare = useCallback(async () => {
    if (!shareCardRef.current || sharing) return;
    setSharing(true);
    try {
      const canvas = await generateShareCanvas();

      const blob = await new Promise<Blob | null>(resolve =>
        canvas.toBlob(resolve, "image/png")
      );
      if (!blob) throw new Error("Failed to generate image");

      const file = new File([blob], "my-progress.png", { type: "image/png" });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "My LazyTopper Progress",
          text: `Check out my study progress! 🔥`,
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "my-progress.png";
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        console.error("Share failed:", err);
      }
    } finally {
      setSharing(false);
    }
  }, [sharing, generateShareCanvas]);

  const [downloading, setDownloading] = useState(false);

  const handleDownload = useCallback(async () => {
    if (!shareCardRef.current || downloading) return;
    setDownloading(true);
    try {
      const canvas = await generateShareCanvas();
      const blob = await new Promise<Blob | null>(resolve =>
        canvas.toBlob(resolve, "image/png")
      );
      if (!blob) throw new Error("Failed to generate image");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "my-progress.png";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (err: unknown) {
      if (err instanceof Error) console.error("Download failed:", err);
    } finally {
      setDownloading(false);
    }
  }, [downloading, generateShareCanvas]);

  // Sync hideCountdown when user changes it in Settings (same or cross-tab storage event)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "lazytopper.hideCountdown") {
        setHideCountdown(e.newValue === "1");
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // ── Derived data ────────────────────────────────────────────────────────────

  const displayName = user?.displayName || user?.email?.split("@")[0] || "Student";
  const initials = displayName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
  const studentClass = profile?.studentClass || "10";

  const daysLeft = useMemo(() => {
    try {
      const raw = localStorage.getItem(`lazytopper.cbseExamDate.official.${studentClass}`);
      if (raw) {
        const p = JSON.parse(raw);
        if (p?.date) return Math.max(0, Math.ceil((new Date(p.date).getTime() - Date.now()) / 86400000));
      }
    } catch {}
    return profile?.daysLeft ?? 0;
  }, [studentClass, profile?.daysLeft]);

  // Hero stats
  const heroStats = useMemo(() => {
    const badgeCtx = buildBadgeContext();
    const attempts = loadInsights().attempts;
    const total = attempts.length;
    const correct = attempts.filter(a => a.correct).length;
    return {
      streak: badgeCtx.streak,
      totalQ: total,
      accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
    };
  }, []);

  const handleWhatsAppShare = useCallback(() => {
    const lines: string[] = [
      `🚀 My LazyTopper Progress`,
      ``,
      `🔥 Streak: ${heroStats.streak} days`,
      `📝 Questions answered: ${heroStats.totalQ}`,
      `🎯 Accuracy: ${heroStats.accuracy}%`,
    ];
    if (daysLeft > 0) lines.push(`📅 ${daysLeft} days to boards — let's go!`);
    lines.push(``, `Study smarter at https://lazytopper.in`);
    const text = encodeURIComponent(lines.join("\n"));
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
  }, [heroStats, daysLeft]);

  const [sharingInstagram, setSharingInstagram] = useState(false);
  const [instagramTip, setInstagramTip] = useState<string | null>(null);

  const handleInstagramShare = useCallback(async () => {
    if (!shareCardRef.current || sharingInstagram) return;
    setSharingInstagram(true);
    setInstagramTip(null);
    try {
      const canvas = await generateShareCanvas();
      const blob = await new Promise<Blob | null>(resolve =>
        canvas.toBlob(resolve, "image/png")
      );
      if (!blob) throw new Error("Failed to generate image");

      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

      if (isMobile) {
        let copiedToClipboard = false;
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob }),
          ]);
          copiedToClipboard = true;
        } catch {
          // Clipboard API unavailable
        }

        const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
        const deepLink = isIOS
          ? "instagram-stories://share"
          : "intent://instagram.com/#Intent;package=com.instagram.android;scheme=https;end";

        window.location.href = deepLink;

        const tip = copiedToClipboard
          ? "Image copied! Paste it in your Instagram Story 📋"
          : "Tap the sticker / gallery button to add your progress card 📸";
        setTimeout(() => {
          setInstagramTip(tip);
          setTimeout(() => setInstagramTip(null), 5000);
        }, 400);
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "my-progress.png";
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        setInstagramTip("Image downloaded! Upload it to your Instagram Story on mobile 📸");
        setTimeout(() => setInstagramTip(null), 5000);
      }
    } catch (err: unknown) {
      if (err instanceof Error) console.error("Instagram share failed:", err);
    } finally {
      setSharingInstagram(false);
    }
  }, [sharingInstagram, generateShareCanvas]);

  // Subject stats
  const subjectStats = useMemo(() => computeSubjectStats(), []);

  // Topic chips for current subject tab
  const topicRows = useMemo(() => computeTopicsData(subjectTab), [subjectTab]);

  // Chart data
  const chartData = useMemo(() => computeActivityData(range), [range]);

  // Trend indicator
  const trend = useMemo(() => computeTrend(range), [range]);

  // Weak areas
  const weakSpots = useMemo((): WeakSpot[] => {
    const { weakAreas } = getWeakAreas({ limit: 3 });
    return weakAreas.map((w, i) => ({
      rank: i + 1,
      topicKey: w.topicKey,
      topic: w.topicName,
      subject: w.subject,
      acc: w.accuracy,
      mistakeType: deriveMistakeType(w),
    }));
  }, []);

  // Badges
  const [badges, setBadges] = useState<BadgeRow[]>([]);
  useEffect(() => {
    try {
      const ctx = buildBadgeContext();
      const earned = evaluateBadges(ctx, []);
      const rows: BadgeRow[] = earned.map(e => {
        const def = BADGE_DEFINITIONS.find(d => d.id === e.id);
        return {
          id: e.id,
          name: def?.name ?? e.id,
          icon: def?.icon ?? "🏅",
          earnedAt: e.earnedAt,
        };
      });
      rows.sort((a, b) => new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime());
      setBadges(rows);
    } catch {}
  }, []);

  const topBadge = badges.length > 0 ? badges[0] : null;

  // ── Handlers ────────────────────────────────────────────────────────────────

  const toggleTopic = (key: string) =>
    setExpandedTopic(p => (p === key ? null : key));

  const toggleWeak = (idx: number) =>
    setExpandedWeak(p => (p === idx ? null : idx));

  // ── Render ───────────────────────────────────────────────────────────────────

  const cardStyle: React.CSSProperties = {
    background: "var(--bg-card, #fff)",
    border: "1px solid var(--bg-card-border, #e2e8f0)",
    borderRadius: 20,
    padding: "20px",
  };

  const mutedColor = "var(--text-muted, #94a3b8)";
  const textColor  = "var(--text, #0f172a)";

  if (loading) return <ProfileSkeleton />;

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", paddingBottom: 100 }}>

      {/* ── Header ── */}
      <div style={{
        background: "var(--bg-card, #fff)",
        borderBottom: "1px solid var(--bg-card-border, #e2e8f0)",
        padding: "44px 20px 16px",
        position: "sticky",
        top: 0,
        zIndex: 20,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: "50%",
              background: "#e0e7ff", color: "#4338ca",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 15, fontWeight: 800,
            }}>
              {initials}
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 800, color: textColor, lineHeight: 1.2 }}>{displayName}</div>
              <div style={{ fontSize: 11, color: mutedColor, fontWeight: 500 }}>Class 10 · CBSE</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {!hideCountdown && daysLeft > 0 && (
              <div style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "#fff1f2", border: "1px solid #fecdd3",
                borderRadius: 14, padding: "8px 12px",
              }}>
                <IcoCalendar size={14} color="#f43f5e" />
                <div>
                  <div style={{ fontSize: 15, fontWeight: 900, color: "#e11d48", lineHeight: 1 }}>{daysLeft}</div>
                  <div style={{ fontSize: 9, color: "#f43f5e", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>days left</div>
                </div>
              </div>
            )}
            <button
              onClick={() => navigate("/settings")}
              style={{
                width: 38, height: 38, borderRadius: 12,
                background: "var(--bg-card-border, #f1f5f9)",
                border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <IcoSettings size={17} color={mutedColor} />
            </button>
          </div>
        </div>

        {/* Sub-header: streak + summary */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "#fff7ed", border: "1px solid #fed7aa",
            borderRadius: 10, padding: "6px 12px",
          }}>
            <IcoFlame size={13} color="#f97316" />
            <span style={{ fontSize: 13, fontWeight: 800, color: textColor }}>{heroStats.streak} day streak</span>
          </div>
          <span style={{ color: mutedColor, fontSize: 12 }}>·</span>
          <span style={{ fontSize: 12, color: mutedColor, fontWeight: 500 }}>
            {heroStats.totalQ} questions · {heroStats.accuracy}% accuracy
          </span>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20, padding: "20px 16px" }}>

        {/* ── Share Progress button ── */}
        <button
          onClick={handleShare}
          disabled={sharing}
          style={{
            width: "100%",
            padding: "13px 20px",
            borderRadius: 16,
            border: "2px solid #4f46e5",
            background: sharing ? "#e0e7ff" : "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
            color: sharing ? "#4f46e5" : "#fff",
            fontSize: 14,
            fontWeight: 800,
            cursor: sharing ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            letterSpacing: "0.01em",
            boxShadow: sharing ? "none" : "0 4px 14px rgba(79, 70, 229, 0.3)",
            transition: "all 0.2s",
          }}
        >
          {sharing ? (
            <>
              <IcoDownload size={16} color="#4f46e5" />
              Generating…
            </>
          ) : (
            <>
              <IcoShare size={16} color="#fff" />
              Share My Progress
            </>
          )}
        </button>

        {/* ── Quick share actions ── */}
        <div style={{ display: "flex", gap: 8 }}>
          {/* WhatsApp */}
          <button
            onClick={handleWhatsAppShare}
            style={{
              flex: 1,
              padding: "11px 8px",
              borderRadius: 14,
              border: "1.5px solid #22c55e",
              background: "#f0fdf4",
              color: "#15803d",
              fontSize: 12,
              fontWeight: 800,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
              transition: "all 0.15s",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#dcfce7"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "#f0fdf4"; }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="#22c55e">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.556 4.122 1.528 5.858L.057 23.215a.5.5 0 0 0 .615.637l5.543-1.453A11.94 11.94 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.794 9.794 0 0 1-5.003-1.373l-.358-.213-3.713.974.992-3.614-.234-.372A9.793 9.793 0 0 1 2.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/>
            </svg>
            WhatsApp
          </button>

          {/* Instagram */}
          <button
            onClick={handleInstagramShare}
            disabled={sharingInstagram}
            style={{
              flex: 1,
              padding: "11px 8px",
              borderRadius: 14,
              border: "1.5px solid #e1306c",
              background: sharingInstagram ? "#fce7f3" : "#fdf2f8",
              color: sharingInstagram ? "#f9a8d4" : "#be185d",
              fontSize: 12,
              fontWeight: 800,
              cursor: sharingInstagram ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
              transition: "all 0.15s",
            }}
            onMouseEnter={e => { if (!sharingInstagram) (e.currentTarget as HTMLButtonElement).style.background = "#fce7f3"; }}
            onMouseLeave={e => { if (!sharingInstagram) (e.currentTarget as HTMLButtonElement).style.background = "#fdf2f8"; }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#e1306c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
              <circle cx="12" cy="12" r="4"/>
              <circle cx="17.5" cy="6.5" r="1" fill="#e1306c" stroke="none"/>
            </svg>
            {sharingInstagram ? "Opening…" : "Instagram"}
          </button>

          {/* Download */}
          <button
            onClick={handleDownload}
            disabled={downloading}
            style={{
              flex: 1,
              padding: "11px 8px",
              borderRadius: 14,
              border: "1.5px solid #6366f1",
              background: downloading ? "#e0e7ff" : "#f5f3ff",
              color: downloading ? "#a5b4fc" : "#4f46e5",
              fontSize: 12,
              fontWeight: 800,
              cursor: downloading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
              transition: "all 0.15s",
            }}
            onMouseEnter={e => { if (!downloading) (e.currentTarget as HTMLButtonElement).style.background = "#ede9fe"; }}
            onMouseLeave={e => { if (!downloading) (e.currentTarget as HTMLButtonElement).style.background = "#f5f3ff"; }}
          >
            <IcoDownload size={14} color={downloading ? "#a5b4fc" : "#4f46e5"} />
            {downloading ? "Saving…" : "Download"}
          </button>
        </div>

        {/* ── Instagram tip banner ── */}
        {instagramTip && (
          <div style={{
            padding: "10px 14px",
            borderRadius: 12,
            background: "linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%)",
            border: "1px solid #f9a8d4",
            color: "#be185d",
            fontSize: 13,
            fontWeight: 600,
            textAlign: "center",
            animation: "lt-fadein 0.2s ease",
          }}>
            {instagramTip}
          </div>
        )}

        {/* ── Activity Chart ── */}
        <div style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: textColor }}>Activity</span>
            {/* Range toggle */}
            <div style={{
              display: "flex", background: "var(--bg-card-border, #f1f5f9)",
              borderRadius: 10, padding: 2, gap: 2,
            }}>
              {RANGES.map(r => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  style={{
                    padding: "4px 10px", fontSize: 11, fontWeight: 700, borderRadius: 8,
                    border: "none", cursor: "pointer", transition: "all 0.15s",
                    background: range === r ? "var(--bg-card, #fff)" : "transparent",
                    color: range === r ? textColor : mutedColor,
                    boxShadow: range === r ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Trend indicator */}
          {trend && (
            <div style={{ marginBottom: 10 }}>
              {trend.pct === null ? (
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  fontSize: 11, fontWeight: 700,
                  color: "#4f46e5",
                  background: "#eef2ff",
                  borderRadius: 8, padding: "3px 9px",
                }}>
                  ↑ New activity · {trend.label}
                </span>
              ) : trend.pct === 0 ? (
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  fontSize: 11, fontWeight: 700,
                  color: "#64748b",
                  background: "var(--bg-card-border, #f1f5f9)",
                  borderRadius: 8, padding: "3px 9px",
                }}>
                  → No change · {trend.label}
                </span>
              ) : trend.pct > 0 ? (
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  fontSize: 11, fontWeight: 700,
                  color: "#16a34a",
                  background: "#f0fdf4",
                  borderRadius: 8, padding: "3px 9px",
                }}>
                  <IcoChevronUp size={12} color="#16a34a" />
                  {trend.pct}% · {trend.label}
                </span>
              ) : (
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  fontSize: 11, fontWeight: 700,
                  color: "#dc2626",
                  background: "#fef2f2",
                  borderRadius: 8, padding: "3px 9px",
                }}>
                  <IcoChevronDown size={12} color="#dc2626" />
                  {Math.abs(trend.pct)}% · {trend.label}
                </span>
              )}
            </div>
          )}

          {/* Legend */}
          <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
            {[["Learn", "#4f46e5"], ["Practice", "#0ea5e9"], ["Test", "#8b5cf6"]].map(([l, c]) => (
              <div key={l} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, color: mutedColor, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: c, display: "inline-block" }} />
                {l}
              </div>
            ))}
          </div>

          <div style={{ height: 175 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: 2, bottom: 16 }} barGap={2} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--bg-card-border, #f1f5f9)" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: mutedColor }}
                  dy={8}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: mutedColor }}
                  width={34}
                  allowDecimals={false}
                >
                  <Label
                    value="Questions"
                    angle={-90}
                    position="insideLeft"
                    offset={10}
                    style={{ fontSize: 9, fill: "#cbd5e1", fontWeight: 700, textAnchor: "middle" }}
                  />
                </YAxis>
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(99,102,241,0.04)" }} />
                <Bar dataKey="Learn"    fill="#4f46e5" radius={[3, 3, 0, 0]} maxBarSize={10} />
                <Bar dataKey="Practice" fill="#0ea5e9" radius={[3, 3, 0, 0]} maxBarSize={10} />
                <Bar dataKey="Test"     fill="#8b5cf6" radius={[3, 3, 0, 0]} maxBarSize={10} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Subject Cards ── */}
        <div style={{ display: "flex", gap: 12 }}>
          {(["maths", "science"] as const).map(s => {
            const st = subjectStats[s];
            const pct = st.total > 0 ? Math.round((st.mastered / st.total) * 100) : 0;
            const ringColor = s === "maths" ? "#4f46e5" : "#0ea5e9";
            return (
              <div key={s} style={{ ...cardStyle, flex: 1, padding: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: mutedColor, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    {s === "maths" ? "Maths" : "Science"}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: mutedColor }}>{st.mastered}/{st.total}</span>
                </div>
                {/* Circular ring centred with % label */}
                <div style={{ position: "relative", width: 64, height: 64, margin: "0 auto 12px" }}>
                  <CircleRing pct={pct} color={ringColor} size={64} />
                  <div style={{
                    position: "absolute", inset: 0,
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  }}>
                    <span style={{ fontSize: 14, fontWeight: 900, color: textColor, lineHeight: 1 }}>{pct}%</span>
                    <span style={{ fontSize: 8, color: mutedColor, fontWeight: 600 }}>mastered</span>
                  </div>
                </div>
                {/* Accuracy bar */}
                <div style={{ marginBottom: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, fontWeight: 600, color: mutedColor, marginBottom: 3 }}>
                    <span>Accuracy</span><span>{st.acc}%</span>
                  </div>
                  <div style={{ height: 5, borderRadius: 5, background: "var(--bg-card-border, #f1f5f9)", overflow: "hidden" }}>
                    <div style={{ width: `${st.acc}%`, height: "100%", borderRadius: 5, background: ringColor }} />
                  </div>
                </div>
                {/* Questions attempted */}
                <div style={{ fontSize: 10, color: mutedColor, fontWeight: 500, textAlign: "center" }}>
                  {st.attempted} Qs attempted
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Syllabus Mastery — expandable topic chips ── */}
        <div style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: textColor }}>Syllabus Mastery</span>
            <div style={{
              display: "flex", background: "var(--bg-card-border, #f1f5f9)",
              borderRadius: 10, padding: 2,
            }}>
              {(["maths", "science"] as const).map(s => (
                <button
                  key={s}
                  onClick={() => { setSubjectTab(s); setExpandedTopic(null); }}
                  style={{
                    padding: "4px 12px", fontSize: 11, fontWeight: 700, borderRadius: 8,
                    border: "none", cursor: "pointer", transition: "all 0.15s",
                    background: subjectTab === s ? "var(--bg-card, #fff)" : "transparent",
                    color: subjectTab === s ? textColor : mutedColor,
                    boxShadow: subjectTab === s ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                  }}
                >
                  {s === "maths" ? "Maths" : "Science"}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {topicRows.map(t => {
              const isOpen = expandedTopic === t.topicKey;
              const dot    = statusDot(t.status);
              return (
                <div key={t.topicKey}>
                  {/* Row: pill navigates to TopicHub; chevron button expands details */}
                  <div style={{
                    display: "flex", alignItems: "center",
                    background: isOpen ? "#eef2ff" : "var(--bg-card-border, #f8fafc)",
                    border: `1px solid ${isOpen ? "#c7d2fe" : "var(--bg-card-border, #e2e8f0)"}`,
                    borderRadius: 12, overflow: "hidden",
                  }}>
                    <button
                      onClick={() => navigate(`/topic-hub/10/${subjectTab}/${t.topicKey}`)}
                      style={{
                        flex: 1, display: "flex", alignItems: "center", gap: 8,
                        padding: "10px 12px", background: "transparent", border: "none",
                        cursor: "pointer", textAlign: "left", minWidth: 0,
                      }}
                    >
                      <span style={{ width: 10, height: 10, borderRadius: "50%", background: dot, flexShrink: 0, display: "inline-block" }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: textColor, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {t.name}
                      </span>
                      {t.masteryPct > 0 && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: dot, flexShrink: 0 }}>{t.masteryPct}%</span>
                      )}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleTopic(t.topicKey); }}
                      style={{
                        padding: "10px 12px", background: "transparent", border: "none",
                        cursor: "pointer", display: "flex", alignItems: "center", flexShrink: 0,
                      }}
                    >
                      {isOpen
                        ? <IcoChevronUp size={14} color="#6366f1" />
                        : <IcoChevronDown size={14} color={mutedColor} />
                      }
                    </button>
                  </div>

                  {isOpen && (
                    <div style={{
                      margin: "2px 4px 4px",
                      padding: "12px 16px",
                      background: "var(--bg-card, #fff)",
                      border: "1px solid #c7d2fe",
                      borderRadius: "0 0 12px 12px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}>
                      <MiniBar label="Learn progress"    pct={t.learnPct}    color="#4f46e5" />
                      <MiniBar label="Practice accuracy" pct={t.practicePct} color="#0ea5e9" />
                      <MiniBar label="Mastery"           pct={t.masteryPct}  color="#10b981" />
                      <div style={{ display: "flex", gap: 6, paddingTop: 4 }}>
                        <button
                          onClick={() => navigate(`/topic-hub/10/${subjectTab}/${t.topicKey}`)}
                          style={{
                            flex: 1, padding: "7px 0", borderRadius: 8, border: "none",
                            background: "#4f46e5", color: "#fff", fontSize: 11, fontWeight: 700,
                            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                          }}
                        >
                          <IcoBook size={12} /> Learn
                        </button>
                        <button
                          onClick={() => navigate(`/practice/10/${subjectTab}`)}
                          style={{
                            flex: 1, padding: "7px 0", borderRadius: 8, border: "none",
                            background: "#0ea5e9", color: "#fff", fontSize: 11, fontWeight: 700,
                            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                          }}
                        >
                          <IcoPen size={12} /> Practice
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{ display: "flex", gap: 14, marginTop: 14, flexWrap: "wrap" }}>
            {[["#10b981","Mastered"],["#f59e0b","Review"],["#6366f1","Learning"],["#cbd5e1","Unseen"]].map(([c,l]) => (
              <div key={l} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, color: mutedColor, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: c, display: "inline-block" }} />
                {l}
              </div>
            ))}
          </div>
        </div>

        {/* ── Top Focus Areas — expandable weak spots ── */}
        {weakSpots.length > 0 && (
          <div style={cardStyle}>
            <div style={{ fontSize: 14, fontWeight: 800, color: textColor, marginBottom: 14 }}>Top Focus Areas</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {weakSpots.map((w, i) => {
                const isOpen = expandedWeak === i;
                const ms = mistakeStyle(w.mistakeType);
                return (
                  <div key={i} style={{
                    border: "1px solid var(--bg-card-border, #e2e8f0)",
                    borderRadius: 14, overflow: "hidden",
                  }}>
                    {/* Card header */}
                    <div style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "12px", background: "var(--bg-card-border, #f8fafc)",
                    }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: "50%",
                        background: "#e2e8f0", color: "#64748b",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 10, fontWeight: 900, flexShrink: 0,
                      }}>
                        #{w.rank}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: mutedColor, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                            {w.subject}
                          </span>
                          <span style={{
                            fontSize: 9, fontWeight: 800, padding: "2px 6px",
                            borderRadius: 20, color: ms.color, background: ms.bg,
                          }}>
                            {w.mistakeType}
                          </span>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: textColor, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {w.topic}
                        </div>
                        <div style={{ fontSize: 10, color: mutedColor, fontWeight: 500 }}>
                          Accuracy: {w.acc}%
                        </div>
                      </div>
                      <button
                        onClick={() => toggleWeak(i)}
                        style={{
                          display: "flex", alignItems: "center", gap: 4,
                          padding: "6px 12px", borderRadius: 10, border: "none",
                          background: "#eef2ff", color: "#4338ca",
                          fontSize: 11, fontWeight: 700, cursor: "pointer", flexShrink: 0,
                        }}
                      >
                        Fix it {isOpen ? <IcoChevronUp size={12} /> : <IcoChevronDown size={12} />}
                      </button>
                    </div>

                    {/* Expanded CTA row */}
                    {isOpen && (
                      <div style={{
                        padding: "10px 12px",
                        background: "#f0f4ff",
                        borderTop: "1px solid #c7d2fe",
                        display: "flex", gap: 8,
                      }}>
                        <button
                          onClick={() => navigate(`/topic-hub/10/${w.subject.toLowerCase()}/${w.topicKey}`)}
                          style={{
                            flex: 1, padding: "9px 0", borderRadius: 10, border: "none",
                            background: "#4338ca", color: "#fff", fontSize: 11, fontWeight: 700,
                            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                          }}
                        >
                          <IcoBook size={13} /> Learn
                        </button>
                        <button
                          onClick={() => navigate(`/practice/10/${w.subject.toLowerCase()}?topic=${w.topicKey}`)}
                          style={{
                            flex: 1, padding: "9px 0", borderRadius: 10, border: "none",
                            background: "#0284c7", color: "#fff", fontSize: 11, fontWeight: 700,
                            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                          }}
                        >
                          <IcoPen size={13} /> Practice
                        </button>
                        <button
                          onClick={() => navigate(
                            `/chapter-test/10/${w.subject.toLowerCase()}/${w.topicKey}`,
                            { state: { back: "/profile", backLabel: "Back to Dashboard" } }
                          )}
                          style={{
                            flex: 1, padding: "9px 0", borderRadius: 10, border: "none",
                            background: "#7c3aed", color: "#fff", fontSize: 11, fontWeight: 700,
                            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                          }}
                        >
                          <IcoFile size={13} /> Test
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Badges ── */}
        <div style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <IcoTrophy size={16} color="#eab308" />
            <span style={{ fontSize: 14, fontWeight: 800, color: textColor }}>Earned Badges</span>
          </div>
          {badges.length === 0 ? (
            <div style={{ textAlign: "center", padding: "24px 0", color: mutedColor, fontSize: 13 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🏅</div>
              Complete questions and streaks to earn your first badge!
            </div>
          ) : (
            <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 6 }}>
              {badges.map(b => (
                <div key={b.id} style={{
                  flexShrink: 0, width: 76,
                  display: "flex", flexDirection: "column", alignItems: "center",
                  padding: "12px 8px", borderRadius: 14,
                  background: "var(--bg-card-border, #f8fafc)",
                  border: "1px solid var(--bg-card-border, #e2e8f0)",
                }}>
                  <div style={{ fontSize: 26, marginBottom: 6 }}>{b.icon}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: textColor, textAlign: "center", lineHeight: 1.2 }}>{b.name}</div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* ── Hidden Share Card (captured by html2canvas) ── */}
      <div
        ref={shareCardRef}
        style={{
          position: "fixed",
          left: -9999,
          top: 0,
          width: 360,
          background: "linear-gradient(145deg, #1e1b4b 0%, #312e81 40%, #4c1d95 100%)",
          borderRadius: 24,
          padding: "28px 24px 24px",
          fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
          color: "#fff",
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
          overflow: "hidden",
        }}
        aria-hidden="true"
      >
        {/* Card header: logo + brand */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10,
              background: "rgba(255,255,255,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16,
            }}>
              🚀
            </div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#c7d2fe", letterSpacing: "0.02em" }}>
              LazyTopper
            </div>
          </div>
          <div style={{
            background: "rgba(244, 63, 94, 0.2)",
            border: "1px solid rgba(244, 63, 94, 0.4)",
            borderRadius: 12,
            padding: "4px 10px",
            fontSize: 11,
            fontWeight: 700,
            color: "#fda4af",
          }}>
            {daysLeft > 0 ? `📅 ${daysLeft} days to boards` : "📅 Board exam ready!"}
          </div>
        </div>

        {/* Student name */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>
            Weekly Progress Report
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#fff", lineHeight: 1.2 }}>
            {displayName}
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: 500, marginTop: 2 }}>
            Class 10 · CBSE
          </div>
        </div>

        {/* Stats row */}
        <div style={{
          display: "flex",
          gap: 10,
          marginBottom: 20,
        }}>
          {/* Streak */}
          <div style={{
            flex: 1,
            background: "rgba(255,255,255,0.08)",
            borderRadius: 16,
            padding: "14px 10px",
            textAlign: "center",
            border: "1px solid rgba(255,255,255,0.12)",
          }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: "#fb923c", lineHeight: 1 }}>
              {heroStats.streak}
            </div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.55)", fontWeight: 700, marginTop: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              🔥 Streak
            </div>
          </div>

          {/* Questions */}
          <div style={{
            flex: 1,
            background: "rgba(255,255,255,0.08)",
            borderRadius: 16,
            padding: "14px 10px",
            textAlign: "center",
            border: "1px solid rgba(255,255,255,0.12)",
          }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: "#38bdf8", lineHeight: 1 }}>
              {heroStats.totalQ}
            </div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.55)", fontWeight: 700, marginTop: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              📚 Questions
            </div>
          </div>

          {/* Accuracy */}
          <div style={{
            flex: 1,
            background: "rgba(255,255,255,0.08)",
            borderRadius: 16,
            padding: "14px 10px",
            textAlign: "center",
            border: "1px solid rgba(255,255,255,0.12)",
          }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: "#34d399", lineHeight: 1 }}>
              {heroStats.accuracy}%
            </div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.55)", fontWeight: 700, marginTop: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              🎯 Accuracy
            </div>
          </div>
        </div>

        {/* Top badge */}
        {topBadge ? (
          <div style={{
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 16,
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 16,
          }}>
            <div style={{ fontSize: 28 }}>{topBadge.icon}</div>
            <div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>
                Latest Badge
              </div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#fde68a" }}>
                {topBadge.name}
              </div>
              {badges.length > 1 && (
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", marginTop: 1 }}>
                  + {badges.length - 1} more badge{badges.length > 2 ? "s" : ""}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 16,
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 16,
          }}>
            <div style={{ fontSize: 28 }}>🏅</div>
            <div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>
                Next Badge
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.6)" }}>
                Keep practising to earn one!
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{
          textAlign: "center",
          fontSize: 10,
          color: "rgba(255,255,255,0.3)",
          fontWeight: 600,
          letterSpacing: "0.04em",
          marginTop: 4,
        }}>
          lazytopper.com · Keep the streak alive! 🔥
        </div>
      </div>

    </div>
  );
}
