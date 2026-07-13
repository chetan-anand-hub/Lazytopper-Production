// src/components/progress/ProgressWindowArc.tsx
//
// PR-B — the minimal, ADDITIVE visible surface for the progress-memory layer: a
// window selector (week / 2 weeks / month / 4 months) + the per-subject before→now
// marks arc, read from the ONE cross-device aggregation (progressStore.getWindowedProgress).
// The full Me/Progress redesign is arc PR-4; this card only makes the data layer
// live-verifiable.
//
// HONEST-OR-SILENT: renders a real before→now arc ONLY when the window carries enough
// graded practice in both halves; otherwise an honest early state — never a fabricated
// curve. The chosen window persists to dashboardPrefs.progressWindow (cross-device).
//
// Class-driven CSS (CLAUDE.md §7 — no inline style objects); one injected <style> block.

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  getWindowedProgress,
  type ProgressWindow,
  type WindowedProgress,
  type RungTrend,
} from "../../services/progressStore";
import { loadDashboardPrefs, saveDashboardPrefs } from "../../services/studentCloudStore";

interface ProgressWindowArcProps {
  /** The real signed-in (non-local) uid, or null. null → the card renders nothing
   *  (the page owns the signed-out / browse states). */
  uid: string | null;
}

const WINDOW_OPTIONS: Array<{ key: ProgressWindow; label: string }> = [
  { key: "week", label: "Week" },
  { key: "2wk", label: "2 weeks" },
  { key: "month", label: "Month" },
  { key: "4mo", label: "4 months" },
];

const DEFAULT_WINDOW: ProgressWindow = "month";

function isProgressWindow(v: unknown): v is ProgressWindow {
  return v === "week" || v === "2wk" || v === "month" || v === "4mo";
}

function deltaClass(delta: number): string {
  if (delta > 0.05) return "lt-pwa__delta--up";
  if (delta < -0.05) return "lt-pwa__delta--down";
  return "lt-pwa__delta--flat";
}

function deltaText(delta: number): string {
  const rounded = Math.round(delta * 10) / 10;
  if (rounded > 0.05) return `▲ +${rounded}%`;
  if (rounded < -0.05) return `▼ ${rounded}%`;
  return "no change";
}

function SubjectArc({ trend }: { trend: RungTrend }): React.ReactElement {
  const nowPct = Math.max(0, Math.min(100, trend.now));
  const beforePct = Math.max(0, Math.min(100, trend.before));
  return (
    <div className="lt-pwa__arc">
      <div className="lt-pwa__arc-head">
        <span className="lt-pwa__arc-label">{trend.label}</span>
        <span className={`lt-pwa__delta ${deltaClass(trend.delta)}`}>{deltaText(trend.delta)}</span>
      </div>
      <div className="lt-pwa__arc-nums">
        <span className="lt-pwa__arc-before">{beforePct}%</span>
        <span className="lt-pwa__arc-sep" aria-hidden="true">
          →
        </span>
        <span className="lt-pwa__arc-now">{nowPct}%</span>
      </div>
      <div className="lt-pwa__arc-foot">
        marks before → now · {trend.sampleBefore} then {trend.sampleNow} graded answers
      </div>
    </div>
  );
}

export function ProgressWindowArc({ uid }: ProgressWindowArcProps): React.ReactElement | null {
  const [window, setWindow] = useState<ProgressWindow>(DEFAULT_WINDOW);
  const [prefLoaded, setPrefLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<WindowedProgress | null>(null);
  const reqSeq = useRef(0);

  // Load the persisted window preference once per uid (cross-device).
  useEffect(() => {
    let alive = true;
    if (!uid) {
      setPrefLoaded(true);
      return;
    }
    setPrefLoaded(false);
    loadDashboardPrefs(uid)
      .then((prefs) => {
        if (!alive) return;
        if (prefs && isProgressWindow(prefs.progressWindow)) setWindow(prefs.progressWindow);
      })
      .catch(() => {
        /* honest-degrade: keep the default window */
      })
      .finally(() => {
        if (alive) setPrefLoaded(true);
      });
    return () => {
      alive = false;
    };
  }, [uid]);

  // Fetch the windowed aggregation whenever uid or window changes (after pref load).
  useEffect(() => {
    if (!uid || !prefLoaded) return;
    const seq = ++reqSeq.current;
    setLoading(true);
    getWindowedProgress(uid, window)
      .then((result) => {
        if (seq !== reqSeq.current) return; // a newer request superseded this one
        setData(result);
      })
      .catch(() => {
        if (seq === reqSeq.current) setData(null);
      })
      .finally(() => {
        if (seq === reqSeq.current) setLoading(false);
      });
  }, [uid, window, prefLoaded]);

  const onPick = useCallback(
    (next: ProgressWindow) => {
      if (next === window) return;
      setWindow(next);
      if (uid) {
        // Persist the choice (cross-device); best-effort, never blocks the UI.
        void saveDashboardPrefs(uid, { progressWindow: next }).catch(() => {
          /* honest-degrade: the window still applies for this session */
        });
      }
    },
    [uid, window],
  );

  if (!uid) return null;

  const subjects = data?.subjects ?? [];
  const hasArc = subjects.length > 0;

  return (
    <section className="lt-pwa" aria-label="Progress over time">
      <style>{PWA_STYLE}</style>
      <div className="lt-pwa__head">
        <div className="lt-pwa__title-wrap">
          <div className="lt-pwa__eyebrow">Progress over time</div>
          <h2 className="lt-pwa__title">Are you improving?</h2>
        </div>
        <div className="lt-pwa__windows" role="group" aria-label="Choose a time window">
          {WINDOW_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              className={`lt-pwa__win${opt.key === window ? " lt-pwa__win--on" : ""}`}
              aria-pressed={opt.key === window}
              onClick={() => onPick(opt.key)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="lt-pwa__state">Reading your saved practice…</div>
      ) : hasArc ? (
        <div className="lt-pwa__arcs">
          {subjects.map((s) => (
            <SubjectArc key={s.key} trend={s} />
          ))}
        </div>
      ) : (
        <div className="lt-pwa__state lt-pwa__state--empty">
          Not enough graded practice in this window yet. Keep going — your marks
          before→now will appear here once there's real data on both sides, never a
          guessed line.
        </div>
      )}
    </section>
  );
}

const PWA_STYLE = `
.lt-pwa {
  border: 1px solid hsl(220, 18%, 90%);
  border-radius: 14px;
  background: #ffffff;
  padding: 20px 22px;
  margin-bottom: 24px;
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}
.lt-pwa__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 18px;
}
.lt-pwa__eyebrow {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: hsl(152, 55%, 35%);
  margin-bottom: 4px;
}
.lt-pwa__title {
  margin: 0;
  font-family: "Source Serif Pro", "Source Serif 4", Georgia, serif;
  font-size: 20px;
  font-weight: 600;
  color: hsl(220, 25%, 12%);
  line-height: 1.25;
}
.lt-pwa__windows { display: flex; gap: 6px; flex-wrap: wrap; }
.lt-pwa__win {
  border: 1px solid hsl(220, 18%, 88%);
  background: hsl(220, 20%, 97%);
  color: hsl(220, 15%, 42%);
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 999px;
  cursor: pointer;
}
.lt-pwa__win--on {
  background: hsl(152, 55%, 45%);
  border-color: hsl(152, 55%, 45%);
  color: #ffffff;
}
.lt-pwa__arcs {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}
.lt-pwa__arc {
  border: 1px solid hsl(220, 18%, 92%);
  border-radius: 12px;
  background: hsl(220, 20%, 98%);
  padding: 14px 16px;
}
.lt-pwa__arc-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.lt-pwa__arc-label { font-size: 14px; font-weight: 700; color: hsl(220, 25%, 12%); }
.lt-pwa__delta { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 999px; white-space: nowrap; }
.lt-pwa__delta--up { color: hsl(152, 55%, 30%); background: hsl(150, 45%, 92%); }
.lt-pwa__delta--down { color: hsl(0, 65%, 42%); background: hsl(0, 65%, 95%); }
.lt-pwa__delta--flat { color: hsl(220, 15%, 42%); background: hsl(220, 18%, 93%); }
.lt-pwa__arc-nums { display: flex; align-items: baseline; gap: 8px; margin: 10px 0 8px; }
.lt-pwa__arc-before { font-size: 15px; font-weight: 600; color: hsl(220, 15%, 55%); }
.lt-pwa__arc-sep { font-size: 14px; color: hsl(220, 15%, 60%); }
.lt-pwa__arc-now {
  font-family: "Source Serif Pro", "Source Serif 4", Georgia, serif;
  font-size: 24px;
  font-weight: 700;
  color: hsl(152, 55%, 32%);
}
.lt-pwa__arc-foot { margin-top: 4px; font-size: 11px; color: hsl(220, 15%, 50%); }
.lt-pwa__state {
  font-size: 13px;
  line-height: 1.55;
  color: hsl(220, 15%, 42%);
  background: hsl(220, 20%, 97%);
  border: 1px dashed hsl(220, 18%, 85%);
  border-radius: 10px;
  padding: 16px 18px;
  max-width: 640px;
}
.lt-pwa__state--empty { color: hsl(220, 15%, 38%); }
@media (max-width: 420px) {
  .lt-pwa { padding: 16px; }
  .lt-pwa__arcs { grid-template-columns: 1fr; }
  .lt-pwa__win { padding: 6px 10px; }
}
`;

export default ProgressWindowArc;
