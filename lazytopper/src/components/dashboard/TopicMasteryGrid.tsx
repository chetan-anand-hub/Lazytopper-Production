
import { useState, useEffect } from "react";
import { useThemeColors, type PerformanceRow } from "./dashboardUtils";
import {
  getChapterMasteryLevel,
  MASTERY_LABELS,
  MASTERY_COLORS,
  MASTERY_ICONS,
  MASTERY_POINTS,
  MASTERY_RING_FRACTION,
  isNewlyMastered,
  clearNewlyMastered,
} from "../../services/masteryLevelService";
import { NewBadge } from "./DashboardWidgets";
import { MasteredBadge } from "../celebrations";

export interface TopicMasteryGridProps {
  mathsMastery: PerformanceRow[];
  scienceMastery: PerformanceRow[];
  gradeNum: string | number;
  showNewBadge: boolean;
  navigate: (path: string, opts?: { state?: Record<string, unknown> }) => void;
  getRowMasteryLevel: (row: PerformanceRow) => ReturnType<typeof getChapterMasteryLevel>;
}

function MasteryRing({ row, subject, gradeNum, navigate, getRowMasteryLevel }: {
  row: PerformanceRow; subject: string; gradeNum: string | number;
  navigate: (path: string, opts?: { state?: Record<string, unknown> }) => void;
  getRowMasteryLevel: TopicMasteryGridProps["getRowMasteryLevel"];
}) {
  const tc = useThemeColors();
  const level = getRowMasteryLevel(row);
  const chapterKey = `${gradeNum}-${subject}-${row.topicKey}`;
  const [shouldAnimate, setShouldAnimate] = useState(false);

  useEffect(() => {
    if (level === "mastered" && isNewlyMastered(chapterKey)) {
      setShouldAnimate(true);
      const t = setTimeout(() => clearNewlyMastered(chapterKey), 1000);
      return () => clearTimeout(t);
    }
  }, [level, chapterKey]);

  return (
    <div style={{ textAlign: "center", cursor: "pointer" }} onClick={() => navigate(`/topic-hub/${gradeNum}/${subject}/${encodeURIComponent(row.topicKey)}`, { state: { back: "/dashboard", backLabel: "Back to Dashboard" } })}>
      <div style={{ position: "relative", width: 48, height: 48, margin: "0 auto 4px" }}>
        <svg width={48} height={48} style={{ display: "block" }}>
          <circle cx={24} cy={24} r={20} fill="none" stroke={tc.ringTrack} strokeWidth={4} />
          <circle cx={24} cy={24} r={20} fill="none" stroke={MASTERY_COLORS[level]} strokeWidth={4}
            strokeDasharray={`${MASTERY_RING_FRACTION[level] * 2 * Math.PI * 20} ${(1 - MASTERY_RING_FRACTION[level]) * 2 * Math.PI * 20}`}
            strokeDashoffset={2 * Math.PI * 20 / 4} strokeLinecap="round" style={{ transition: "stroke-dasharray 0.5s ease" }} />
          <text x={24} y={28} textAnchor="middle" fontSize={16} fill={MASTERY_COLORS[level]}>{MASTERY_ICONS[level]}</text>
        </svg>
      </div>
      {level === "mastered" ? (
        <MasteredBadge animate={shouldAnimate} />
      ) : (
        <div style={{ fontSize: 8, fontWeight: 700, color: MASTERY_COLORS[level], marginBottom: 1 }}>{MASTERY_LABELS[level]}</div>
      )}
      <div style={{ fontSize: 7, fontWeight: 600, color: tc.textFaint }}>{MASTERY_POINTS[level]}pts</div>
      <div style={{ fontSize: 9, fontWeight: 600, color: tc.textSecondary, lineHeight: 1.2 }}>{row.topicName.length > 14 ? row.topicName.slice(0, 12) + "\u2026" : row.topicName}</div>
    </div>
  );
}

export function TopicMasteryGrid({ mathsMastery, scienceMastery, gradeNum, showNewBadge, navigate, getRowMasteryLevel }: TopicMasteryGridProps) {
  const tc = useThemeColors();
  return (
    <div className="glass-card" style={{ padding: 16, marginBottom: 16 }}>
      <span className="font-display" style={{ fontSize: 14, fontWeight: 700, display: "inline", marginBottom: 14 }}>Topic Mastery{showNewBadge && <NewBadge />}</span>
      <div style={{ marginBottom: 14 }} />

      {mathsMastery.length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 600, color: tc.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Maths</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: scienceMastery.length > 0 ? 16 : 0 }}>
            {mathsMastery.map((t) => (
              <MasteryRing key={t.topicKey} row={t} subject="Maths" gradeNum={gradeNum} navigate={navigate} getRowMasteryLevel={getRowMasteryLevel} />
            ))}
          </div>
        </>
      )}

      {scienceMastery.length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 600, color: tc.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Science</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
            {scienceMastery.map((t) => (
              <MasteryRing key={t.topicKey} row={t} subject="Science" gradeNum={gradeNum} navigate={navigate} getRowMasteryLevel={getRowMasteryLevel} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
