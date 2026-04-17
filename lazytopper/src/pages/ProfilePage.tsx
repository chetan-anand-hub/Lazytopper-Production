import { useState, useEffect, useMemo } from "react";
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

// ── Main Page ─────────────────────────────────────────────────────────────────

const RANGES: Range[] = ["7D", "4W", "3M", "All"];

export default function ProfilePage() {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { user } = useAuth();

  const [range, setRange]               = useState<Range>("7D");
  const [subjectTab, setSubjectTab]     = useState<SubjectTab>("maths");
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
  const [expandedWeak, setExpandedWeak]   = useState<number | null>(null);
  const [hideCountdown, setHideCountdown] = useState<boolean>(
    () => localStorage.getItem("lazytopper.hideCountdown") === "true"
  );

  // Sync hideCountdown when user changes it in Settings (storage event)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "lazytopper.hideCountdown") {
        setHideCountdown(e.newValue === "true");
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

  // Subject stats
  const subjectStats = useMemo(() => computeSubjectStats(), []);

  // Topic chips for current subject tab
  const topicRows = useMemo(() => computeTopicsData(subjectTab), [subjectTab]);

  // Chart data
  const chartData = useMemo(() => computeActivityData(range), [range]);

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
      setBadges(rows);
    } catch {}
  }, []);

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
                            `/exam-simulation?subject=${encodeURIComponent(w.subject)}&topicKey=${encodeURIComponent(w.topicKey)}`,
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
    </div>
  );
}
