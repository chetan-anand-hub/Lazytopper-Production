import { topicHubV2Content } from "../../data/topicHubV2Full";
import { normalizeTopicKey } from "../../utils/topicResolver";
import { useTheme } from "../../context/ThemeContext";

export type SubjectTitle = "Maths" | "Science";

export type PerformanceRow = {
  chapterId: string;
  subject: SubjectTitle;
  topicKey: string;
  topicName: string;
  attempted: number;
  correct: number;
  accuracy: number;
  matchScore: number;
  lastPracticedAt?: string;
  tier: string;
};

export type TopicMetaLight = {
  topicName?: string;
  subject?: string;
  weightagePercent?: number;
  approxWeightage?: number;
  tier?: string;
};

export function toTopicMetaLight(value: unknown): TopicMetaLight {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const rec = value as Record<string, unknown>;
  return {
    topicName: typeof rec.topicName === "string" ? rec.topicName : undefined,
    subject: typeof rec.subject === "string" ? rec.subject : undefined,
    weightagePercent: typeof rec.weightagePercent === "number" ? rec.weightagePercent : undefined,
    approxWeightage: typeof rec.approxWeightage === "number" ? rec.approxWeightage : undefined,
    tier: typeof rec.tier === "string" ? rec.tier : undefined,
  };
}

export function parseChapterId(chapterId: string): { grade: string; subject: SubjectTitle; topicKey: string } {
  const raw = String(chapterId || "");
  const match = raw.match(/^(\d+)-([^-]+)-(.+)$/);
  if (!match) return { grade: "10", subject: "Maths", topicKey: normalizeTopicKey(raw) || "topic" };
  return {
    grade: String(match[1] || "10"),
    subject: String(match[2] || "Maths").toLowerCase().includes("science") ? "Science" : "Maths",
    topicKey: normalizeTopicKey(String(match[3] || "")) || "topic",
  };
}

export function displayTopic(topicKey: string): string {
  const rec = toTopicMetaLight((topicHubV2Content as Record<string, unknown>)[topicKey]);
  const topicName = String(rec.topicName || "").trim();
  if (topicName) return topicName;
  return String(topicKey || "topic")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

export function subjectMaxWeightage(subject: SubjectTitle): number {
  const values = Object.entries(topicHubV2Content)
    .map(([, rec]) => toTopicMetaLight(rec))
    .filter((rec) => String(rec.subject || "Maths") === subject)
    .map((rec) => Number(rec.weightagePercent ?? rec.approxWeightage ?? 0))
    .filter((v) => Number.isFinite(v) && v > 0);
  return values.length ? Math.max(...values) : 14;
}

export function nowDayLabel(): string {
  try { return new Date().toLocaleDateString("en-US", { weekday: "long" }); } catch { return "Today"; }
}

export function greetingLabel(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function toPositiveNumber(raw: string | number): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function formatTimeAgo(ts: number): string {
  const now = Date.now();
  const diff = now - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

export function isWidgetUnseen(widgetKey: string): boolean {
  try {
    return !localStorage.getItem(`lazytopper.widgetSeen.${widgetKey}`);
  } catch { return false; }
}
export function markWidgetSeen(widgetKey: string): void {
  try {
    localStorage.setItem(`lazytopper.widgetSeen.${widgetKey}`, "1");
  } catch {}
}

export function isFirstDashboardVisit(): boolean {
  const key = "lazytopper.firstVisitOverlayShown";
  try {
    return !localStorage.getItem(key);
  } catch { return false; }
}

export function markFirstVisitDone() {
  try { localStorage.setItem("lazytopper.firstVisitOverlayShown", "1"); } catch {}
}

export function useThemeColors() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  return {
    isDark,
    textPrimary: isDark ? "#fff" : "#1e293b",
    textSecondary: isDark ? "rgba(255,255,255,0.55)" : "rgba(30,41,59,0.6)",
    textMuted: isDark ? "rgba(255,255,255,0.35)" : "rgba(30,41,59,0.4)",
    textFaint: isDark ? "rgba(255,255,255,0.25)" : "rgba(30,41,59,0.25)",
    cardBg: isDark ? "rgba(255,255,255,0.03)" : "#fff",
    cardBorder: isDark ? "rgba(255,255,255,0.06)" : "#e2e8f0",
    subtleBg: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
    divider: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.06)",
    ringTrack: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)",
    overlayBg: isDark ? "rgba(0,0,0,0.85)" : "rgba(0,0,0,0.5)",
  };
}

export const THEME_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700;800&display=swap');
  .db-root { min-height:100vh; font-family:'Inter',sans-serif; transition: background 0.3s, color 0.3s; }
  .db-root.theme-dark { background:#0a0a0a; color:#fff; }
  .db-root.theme-light { background:#f8fafc; color:#1e293b; }
  .db-root .font-display { font-family:'Space Grotesk',sans-serif; }
  .db-root.theme-dark .glass-card { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:16px; }
  .db-root.theme-light .glass-card { background:#fff; border:1px solid #e2e8f0; border-radius:16px; box-shadow:0 1px 3px rgba(0,0,0,0.06); }
  .db-root.theme-dark .glass-accent { background:rgba(34,197,94,0.06); border:1px solid rgba(34,197,94,0.15); border-radius:16px; }
  .db-root.theme-light .glass-accent { background:rgba(34,197,94,0.04); border:1px solid rgba(34,197,94,0.2); border-radius:16px; }
  .db-root.theme-dark .glass-blue { background:rgba(59,130,246,0.06); border:1px solid rgba(59,130,246,0.15); border-radius:16px; }
  .db-root.theme-light .glass-blue { background:rgba(59,130,246,0.04); border:1px solid rgba(59,130,246,0.2); border-radius:16px; }
  .db-root.theme-dark .glass-warn { background:rgba(249,115,22,0.06); border:1px solid rgba(249,115,22,0.15); border-radius:16px; }
  .db-root.theme-light .glass-warn { background:rgba(249,115,22,0.04); border:1px solid rgba(249,115,22,0.2); border-radius:16px; }
  .db-root * { box-sizing:border-box; }
  .db-root ::-webkit-scrollbar { height:4px; }
  .db-root ::-webkit-scrollbar-track { background:transparent; }
  .db-root.theme-dark ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.1); border-radius:2px; }
  .db-root.theme-light ::-webkit-scrollbar-thumb { background:rgba(0,0,0,0.1); border-radius:2px; }
`;

export const SPRINT_FORMULAS = [
  { subject: "Maths", items: ["x = (−b ± √(b²−4ac)) / 2a", "aₙ = a + (n−1)d, Sₙ = n/2 [2a + (n−1)d]", "sin²θ + cos²θ = 1", "Distance = √[(x₂−x₁)² + (y₂−y₁)²]", "Area of sector = (θ/360) × πr²", "Mode = l + [(f₁−f₀)/(2f₁−f₀−f₂)] × h"] },
  { subject: "Science", items: ["V = IR, P = VI = I²R", "1/f = 1/v + 1/u (mirror)", "pH 7 = neutral, Acid + Base → Salt + Water", "Fleming's Left Hand = Motor, Right = Generator"] },
];
