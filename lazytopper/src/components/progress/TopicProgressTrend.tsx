// src/components/progress/TopicProgressTrend.tsx
//
// arc PR-4 — the Topic Hub's per-topic before→now trajectory. CONSUMES
// progressStore.getTopicProgress(topicKey) (read-only; never edits the data layer)
// and renders the student's marks trend ON THIS TOPIC.
//
// HONEST-OR-SILENT: getTopicProgress returns null unless BOTH halves of the window
// carry enough graded practice on this topic — so this renders NOTHING (not a broken
// "no data" card) until there is a real, data-backed trend. Signed-out / local session
// → nothing. Never a fabricated curve.
//
// ONE responsive component (desktop Topic Hub + 360px mobile — the hub is a single
// responsive page). Class-driven CSS (CLAUDE.md §7), one injected <style> block.
//
// NOT Mistake Intel — this is honest progress data, distinct from the navy-sidebar MI
// chrome the Topic Hub body deliberately omits.

import React from "react";
import { useAuth } from "../../context/AuthContext";
import { getTopicProgress, type ProgressWindow } from "../../services/progressStore";

interface TopicProgressTrendProps {
  /** Canonical topic key (topics.ts slug) to read this topic's trend for. */
  topicKey: string;
  /** Window for the before→now split. Topic learning plays out over months, so the
   *  hub reads the widest window by default. */
  window?: ProgressWindow;
}

function clampPct(v: number): number {
  return Math.max(0, Math.min(100, v));
}

export function TopicProgressTrend({
  topicKey,
  window = "4mo",
}: TopicProgressTrendProps): React.ReactElement | null {
  const { user } = useAuth();

  // Cross-device progress needs a real (non-local) account; getTopicProgress reads the
  // device-local attempts stream scoped to the active user. Signed-out / local → silent.
  const uid = user && !user.isLocalSession ? user.uid : null;
  const key = String(topicKey || "").trim();
  const trend = uid && key ? getTopicProgress(key, window, uid) : null;

  // Honest-or-silent: no data-backed trend on both sides of the window → render nothing.
  if (!trend) return null;

  const before = clampPct(trend.before);
  const now = clampPct(trend.now);
  const rounded = Math.round(trend.delta * 10) / 10;
  const dir = rounded > 0.05 ? "up" : rounded < -0.05 ? "down" : "flat";
  const deltaText = dir === "up" ? `▲ +${rounded}%` : dir === "down" ? `▼ ${rounded}%` : "no change";

  return (
    <section className="lt-tpt" aria-label="Your trajectory on this topic">
      <style>{TPT_STYLE}</style>
      <div className="lt-tpt__head">
        <span className="lt-tpt__eyebrow">Your trajectory on this topic</span>
        <span className={`lt-tpt__delta lt-tpt__delta--${dir}`}>{deltaText}</span>
      </div>
      <div className="lt-tpt__nums">
        <span className="lt-tpt__before">{before}%</span>
        <span className="lt-tpt__sep" aria-hidden="true">
          →
        </span>
        <span className="lt-tpt__now">{now}%</span>
      </div>
      <div className="lt-tpt__foot">
        marks before → now · {trend.sampleBefore} then {trend.sampleNow} graded answers on this topic
      </div>
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
`;

export default TopicProgressTrend;
