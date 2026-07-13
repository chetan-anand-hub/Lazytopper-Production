// src/components/progress/TopicProgressTrend.tsx
//
// arc PR-4 — the Topic Hub's per-topic trajectory. PR-B-v2 re-points it at the
// CROSS-DEVICE engine read (progressStore.getTopicTrendFromCloud — the unified
// graded stream across all four surfaces, canonical-key matched) and adds the
// running-accuracy micro-trend: an SVG bar per recent graded answer (the student's
// REAL scores — never a fitted line), visible from as few as 2 points while the
// before→now delta needs 6. Read-only; never edits the data layer.
//
// HONEST-OR-SILENT: nothing renders (not a broken "no data" card) until there is
// real graded work on this topic. When the before→now trend fires but the practice
// span is short relative to the window (isShortSpan), an explicit label calls it a
// short-term trend — never a claimed 4-month trend, never silence-that-looks-broken.
// Signed-out / local session → nothing. Never a fabricated curve.
//
// ONE responsive component (desktop Topic Hub + 360px mobile — the hub is a single
// responsive page). Class-driven CSS (CLAUDE.md §7), one injected <style> block; the
// sparkline is SVG geometry (attributes, not style objects).
//
// NOT Mistake Intel — this is honest progress data, distinct from the navy-sidebar MI
// chrome the Topic Hub body deliberately omits.

import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  getTopicTrendFromCloud,
  isShortSpan,
  type ProgressWindow,
  type TopicCloudTrend,
} from "../../services/progressStore";

interface TopicProgressTrendProps {
  /** Canonical topic key (topics.ts slug) to read this topic's trend for. Any known
   *  spelling resolves — the engine canonicalises both sides of the match. */
  topicKey: string;
  /** Window for the before→now split. Topic learning plays out over months, so the
   *  hub reads the widest window by default. */
  window?: ProgressWindow;
}

const WINDOW_TEXT: Record<ProgressWindow, string> = {
  week: "week",
  "2wk": "2-week",
  month: "month",
  "4mo": "4-month",
};

// Sparkline geometry (SVG viewBox units — rendered via attributes, not styles).
const BAR_W = 9;
const BAR_GAP = 3;
const SPARK_H = 34;

function clampPct(v: number): number {
  return Math.max(0, Math.min(100, v));
}

function deltaDir(delta: number): "up" | "down" | "flat" {
  const rounded = Math.round(delta * 10) / 10;
  return rounded > 0.05 ? "up" : rounded < -0.05 ? "down" : "flat";
}

function deltaText(delta: number): string {
  const rounded = Math.round(delta * 10) / 10;
  if (rounded > 0.05) return `▲ +${rounded}%`;
  if (rounded < -0.05) return `▼ ${rounded}%`;
  return "no change";
}

export function TopicProgressTrend({
  topicKey,
  window = "4mo",
}: TopicProgressTrendProps): React.ReactElement | null {
  const { user } = useAuth();

  // Cross-device progress needs a real (non-local) account; the engine read honors
  // this uid against the durable cloud streams. Signed-out / local → silent.
  const uid = user && !user.isLocalSession ? user.uid : null;
  const key = String(topicKey || "").trim();

  const [data, setData] = useState<TopicCloudTrend | null>(null);
  const reqSeq = useRef(0);

  useEffect(() => {
    if (!uid || !key) {
      setData(null);
      return;
    }
    const seq = ++reqSeq.current;
    getTopicTrendFromCloud(key, window, uid)
      .then((result) => {
        if (seq === reqSeq.current) setData(result);
      })
      .catch(() => {
        if (seq === reqSeq.current) setData(null);
      });
  }, [uid, key, window]);

  const trend = data?.trend ?? null;
  const points = data?.points ?? [];

  // Honest-or-silent: no data-backed trend AND too few real points → render nothing
  // (loading passes through here too — no flicker, no skeleton card).
  if (!trend && points.length < 2) return null;

  const sparkW = points.length * (BAR_W + BAR_GAP) - BAR_GAP;

  return (
    <section className="lt-tpt" aria-label="Your trajectory on this topic">
      <style>{TPT_STYLE}</style>
      <div className="lt-tpt__head">
        <span className="lt-tpt__eyebrow">
          {trend ? "Your trajectory on this topic" : "Your recent work on this topic"}
        </span>
        {trend && (
          <span className={`lt-tpt__delta lt-tpt__delta--${deltaDir(trend.delta)}`}>
            {deltaText(trend.delta)}
          </span>
        )}
      </div>

      {trend && (
        <>
          <div className="lt-tpt__nums">
            <span className="lt-tpt__before">{clampPct(trend.before)}%</span>
            <span className="lt-tpt__sep" aria-hidden="true">
              →
            </span>
            <span className="lt-tpt__now">{clampPct(trend.now)}%</span>
          </div>
          <div className="lt-tpt__foot">
            marks before → now · {trend.sampleBefore} then {trend.sampleNow} graded answers on this topic
          </div>
          {isShortSpan(window, trend.spanDays) && (
            <div className="lt-tpt__span">
              Your practice here is recent — this is your short-term trend over the last{" "}
              {trend.spanDays === 1 ? "day" : `${trend.spanDays} days`}, not a{" "}
              {WINDOW_TEXT[window]} claim.
            </div>
          )}
        </>
      )}

      {points.length >= 2 && (
        <div className="lt-tpt__sparkwrap">
          <svg
            className="lt-tpt__spark"
            width={sparkW}
            height={SPARK_H}
            viewBox={`0 0 ${sparkW} ${SPARK_H}`}
            role="img"
            aria-label={`Your last ${points.length} graded answers on this topic, oldest to newest`}
          >
            {points.map((p, i) => {
              const h = Math.max(2, Math.round((clampPct(p.pct) / 100) * (SPARK_H - 2)));
              return (
                <rect
                  key={`${p.ts}-${i}`}
                  className="lt-tpt__bar"
                  x={i * (BAR_W + BAR_GAP)}
                  y={SPARK_H - h}
                  width={BAR_W}
                  height={h}
                  rx="1.5"
                />
              );
            })}
          </svg>
          <div className="lt-tpt__spark-cap">
            each bar = one graded answer (marks %) · oldest → newest
          </div>
        </div>
      )}
    </section>
  );
}

const TPT_STYLE = `
.lt-tpt {
  margin-top: 12px;
  border: 1px solid hsl(220, 18%, 90%);
  border-radius: 12px;
  background: hsl(152, 45%, 98%);
  padding: 13px 16px;
  font-family: var(--font-body, "Inter", system-ui, sans-serif);
}
.lt-tpt__head { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.lt-tpt__eyebrow {
  font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
  color: hsl(152, 45%, 32%);
}
.lt-tpt__delta { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 999px; white-space: nowrap; }
.lt-tpt__delta--up { color: hsl(152, 55%, 28%); background: hsl(150, 45%, 92%); }
.lt-tpt__delta--down { color: hsl(0, 65%, 42%); background: hsl(0, 65%, 95%); }
.lt-tpt__delta--flat { color: hsl(220, 15%, 42%); background: hsl(220, 18%, 93%); }
.lt-tpt__nums { display: flex; align-items: baseline; gap: 8px; margin: 8px 0 4px; }
.lt-tpt__before { font-size: 15px; font-weight: 600; color: hsl(220, 15%, 55%); }
.lt-tpt__sep { font-size: 14px; color: hsl(220, 15%, 60%); }
.lt-tpt__now {
  font-family: var(--font-display, "Fraunces", Georgia, serif);
  font-size: 24px; font-weight: 700; color: hsl(152, 55%, 30%);
}
.lt-tpt__foot { font-size: 11px; color: hsl(220, 15%, 48%); }
.lt-tpt__span {
  margin-top: 6px;
  font-size: 11px;
  line-height: 1.5;
  color: hsl(35, 60%, 32%);
  background: hsl(42, 80%, 95%);
  border: 1px solid hsl(42, 60%, 86%);
  border-radius: 8px;
  padding: 6px 9px;
}
.lt-tpt__sparkwrap { margin-top: 10px; max-width: 100%; overflow-x: auto; }
.lt-tpt__spark { display: block; }
.lt-tpt__bar { fill: hsl(152, 50%, 45%); }
.lt-tpt__spark-cap { margin-top: 4px; font-size: 10.5px; color: hsl(220, 15%, 52%); }
`;

export default TopicProgressTrend;
