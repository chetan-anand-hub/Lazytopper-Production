// src/components/progress/ProgressWindowArc.tsx
//
// The progress-memory layer's visible surface — the "Your study mirror" arc. A
// window selector (week / 2 weeks / month / 4 months) over the ONE cross-device
// aggregation (progressStore.getWindowedProgress), rendering a before→now trend at
// EVERY rung the data exposes:
//   • Subjects        — big before→now marks arcs (the hero).
//   • CBSE sections   — compact A–E marks rows.
//   • Topics          — compact per-topic marks rows (capped, honest overflow note).
//   • Concepts        — compact bank-matched subtopic rows (capped, honest overflow).
//   • Mistake mix     — the four-type COMPOSITION share then→now (neutral framing,
//                       never a fabricated good/bad score — polarity read per type).
//
// CONSUMPTION-ONLY: reads getWindowedProgress; never edits the data layer. Every rung
// is HONEST-OR-SILENT (a group renders only when its window carries a data-backed
// trend). When NOTHING resolves but there IS in-window practice, the empty state
// explains the honest reason (the before→now split needs data in BOTH halves) rather
// than a bare "not enough data" that looks broken beside a populated narrower window.
//
// ONE responsive component — reused on desktop Me AND the mobile Me (arc PR-4). Class-
// driven CSS (CLAUDE.md §7 — no inline style objects); one injected <style> block with
// a pure-CSS mobile reflow, so the same markup serves desktop → 360px with no JS width
// branch. The chosen window persists to dashboardPrefs.progressWindow (cross-device).

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  getWindowedProgress,
  isShortSpan,
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

const WINDOW_LABEL: Record<ProgressWindow, string> = {
  week: "week",
  "2wk": "2 weeks",
  month: "month",
  "4mo": "4 months",
};

const DEFAULT_WINDOW: ProgressWindow = "month";

/** How many compact rows to show per capped group before an honest overflow note. */
const ROW_CAP = 6;

function isProgressWindow(v: unknown): v is ProgressWindow {
  return v === "week" || v === "2wk" || v === "month" || v === "4mo";
}

/** Which post-load state the arc renders.
 *   • "rungs"    — at least one rung resolved to a data-backed before→now trend.
 *   • "lopsided" — there IS in-window practice, but nothing resolved (the before→now
 *                  split needs data in BOTH halves; the honest §B explanation, not a
 *                  bare "no data" that looks broken beside a populated narrower window).
 *   • "empty"    — no in-window practice at all yet.
 * Pure + exported so the honest-empty-state decision is unit-testable without a render. */
export type ProgressArcStateKind = "rungs" | "lopsided" | "empty";
export function progressArcStateKind(data: WindowedProgress | null): ProgressArcStateKind {
  if (!data) return "empty";
  const hasAnyRung =
    data.subjects.length > 0 ||
    data.sections.length > 0 ||
    data.topics.length > 0 ||
    data.concepts.length > 0 ||
    data.mistakeTypes.length > 0;
  if (hasAnyRung) return "rungs";
  if ((data.activity?.practiceAttempts ?? 0) > 0) return "lopsided";
  return "empty";
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

function clampPct(v: number): number {
  return Math.max(0, Math.min(100, v));
}

/** Big before→now marks arc (subjects — the hero rung). */
function ScoreArc({ trend }: { trend: RungTrend }): React.ReactElement {
  return (
    <div className="lt-pwa__arc">
      <div className="lt-pwa__arc-head">
        <span className="lt-pwa__arc-label">{trend.label}</span>
        <span className={`lt-pwa__delta ${deltaClass(trend.delta)}`}>{deltaText(trend.delta)}</span>
      </div>
      <div className="lt-pwa__arc-nums">
        <span className="lt-pwa__arc-before">{clampPct(trend.before)}%</span>
        <span className="lt-pwa__arc-sep" aria-hidden="true">
          →
        </span>
        <span className="lt-pwa__arc-now">{clampPct(trend.now)}%</span>
      </div>
      <div className="lt-pwa__arc-foot">
        marks before → now · {trend.sampleBefore} then {trend.sampleNow} graded answers
      </div>
    </div>
  );
}

/** Compact before→now marks row (sections / topics / concepts). */
function TrendRow({ trend }: { trend: RungTrend }): React.ReactElement {
  return (
    <div className="lt-pwa__row">
      <span className="lt-pwa__row-label" title={trend.label}>
        {trend.label}
      </span>
      <span className="lt-pwa__row-nums">
        <span className="lt-pwa__row-before">{clampPct(trend.before)}%</span>
        <span className="lt-pwa__arc-sep" aria-hidden="true">
          →
        </span>
        <span className="lt-pwa__row-now">{clampPct(trend.now)}%</span>
      </span>
      <span className={`lt-pwa__delta ${deltaClass(trend.delta)}`}>{deltaText(trend.delta)}</span>
    </div>
  );
}

/** A labelled group of compact rows, capped with an honest overflow note (never a
 *  silent truncation). Renders nothing when the group is empty (honest-or-silent). */
function RowGroup({
  title,
  hint,
  rows,
}: {
  title: string;
  hint: string;
  rows: RungTrend[];
}): React.ReactElement | null {
  if (rows.length === 0) return null;
  const shown = rows.slice(0, ROW_CAP);
  const overflow = rows.length - shown.length;
  return (
    <div className="lt-pwa__group">
      <div className="lt-pwa__group-head">
        <span className="lt-pwa__group-title">{title}</span>
        <span className="lt-pwa__group-hint">{hint}</span>
      </div>
      <div className="lt-pwa__rows">
        {shown.map((t) => (
          <TrendRow key={t.key} trend={t} />
        ))}
      </div>
      {overflow > 0 && (
        <div className="lt-pwa__overflow">
          +{overflow} more {overflow === 1 ? "row has" : "rows have"} a trend in this window.
        </div>
      )}
    </div>
  );
}

/** Mistake COMPOSITION share then→now — NEUTRAL framing. This is not a score, so it
 *  never uses the good(up)/bad(down) colouring; it shows what the student's logged
 *  mistakes are made of, earlier half → recent half, with an honest read of polarity. */
function MistakeComposition({ rows }: { rows: RungTrend[] }): React.ReactElement | null {
  if (rows.length === 0) return null;
  const ordered = [...rows].sort((a, b) => b.now - a.now);
  return (
    <div className="lt-pwa__group">
      <div className="lt-pwa__group-head">
        <span className="lt-pwa__group-title">What your mistakes are made of</span>
        <span className="lt-pwa__group-hint">share of your logged mistakes · earlier → recent</span>
      </div>
      <div className="lt-pwa__rows">
        {ordered.map((t) => {
          const rounded = Math.round(t.delta * 10) / 10;
          const arrow = rounded > 0.05 ? "▲" : rounded < -0.05 ? "▼" : "·";
          return (
            <div className="lt-pwa__row lt-pwa__row--mix" key={t.key}>
              <span className="lt-pwa__row-label">{t.label}</span>
              <span className="lt-pwa__row-nums">
                <span className="lt-pwa__row-before">{clampPct(t.before)}%</span>
                <span className="lt-pwa__arc-sep" aria-hidden="true">
                  →
                </span>
                <span className="lt-pwa__row-now lt-pwa__row-now--mix">{clampPct(t.now)}%</span>
              </span>
              <span className="lt-pwa__mix-delta" aria-hidden="true">
                {arrow} {Math.abs(rounded)}%
              </span>
            </div>
          );
        })}
      </div>
      <div className="lt-pwa__mix-note">
        A rising share of conceptual or calculation mistakes is a knowledge gap to close;
        a rising share of silly or presentation slips is exam technique to tighten.
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
  const sections = data?.sections ?? [];
  const topics = data?.topics ?? [];
  const concepts = data?.concepts ?? [];
  const mistakeTypes = data?.mistakeTypes ?? [];
  const stateKind = progressArcStateKind(data);

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
      ) : stateKind === "rungs" ? (
        <div className="lt-pwa__body">
          {subjects.length > 0 && (
            <div className="lt-pwa__group">
              <div className="lt-pwa__group-head">
                <span className="lt-pwa__group-title">By subject</span>
                <span className="lt-pwa__group-hint">marks before → now</span>
              </div>
              <div className="lt-pwa__arcs">
                {subjects.map((s) => (
                  <ScoreArc key={s.key} trend={s} />
                ))}
              </div>
            </div>
          )}
          <RowGroup title="By CBSE section" hint="marks before → now" rows={sections} />
          <RowGroup title="By topic" hint="marks before → now · most-practised first" rows={topics} />
          <RowGroup
            title="By concept"
            hint="bank-matched subtopics only · marks before → now"
            rows={concepts}
          />
          <MistakeComposition rows={mistakeTypes} />
          {data != null &&
            data.activitySpanDays != null &&
            isShortSpan(window, data.activitySpanDays) && (
              <div className="lt-pwa__span-note">
                Your practice in this {WINDOW_LABEL[window]} is concentrated in the last{" "}
                {data.activitySpanDays === 1 ? "day" : `${data.activitySpanDays} days`} — the
                trends above are your honest short-term movement over that stretch, not the
                whole {WINDOW_LABEL[window]}.
              </div>
            )}
        </div>
      ) : stateKind === "lopsided" ? (
        <div className="lt-pwa__state lt-pwa__state--empty">
          You&rsquo;ve practised in this {WINDOW_LABEL[window]}, but a before→now comparison
          needs enough graded answers in <strong>both halves</strong> of the window. Your
          practice is concentrated on one side right now — keep going, or try a shorter
          window. We&rsquo;ll never draw a guessed line.
        </div>
      ) : (
        <div className="lt-pwa__state lt-pwa__state--empty">
          Not enough graded practice in this {WINDOW_LABEL[window]} yet. Keep going — your
          marks before→now will appear here once there&rsquo;s real data on both sides,
          never a guessed line.
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
.lt-pwa__body { display: flex; flex-direction: column; gap: 22px; }
.lt-pwa__group { display: flex; flex-direction: column; gap: 10px; }
.lt-pwa__group-head { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.lt-pwa__group-title { font-size: 13px; font-weight: 700; color: hsl(220, 25%, 12%); }
.lt-pwa__group-hint { font-size: 11.5px; color: hsl(220, 15%, 50%); }
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

/* Compact trend rows (sections / topics / concepts / mistake mix) */
.lt-pwa__rows { display: flex; flex-direction: column; gap: 2px; }
.lt-pwa__row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 10px;
  border-radius: 9px;
  background: hsl(220, 20%, 98%);
  border: 1px solid hsl(220, 18%, 93%);
}
.lt-pwa__row-label {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  font-weight: 600;
  color: hsl(220, 25%, 14%);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.lt-pwa__row-nums { display: flex; align-items: baseline; gap: 6px; flex-shrink: 0; }
.lt-pwa__row-before { font-size: 12.5px; font-weight: 600; color: hsl(220, 15%, 55%); }
.lt-pwa__row-now { font-size: 15px; font-weight: 700; color: hsl(152, 55%, 32%); }
.lt-pwa__row-now--mix { color: hsl(220, 25%, 20%); }
.lt-pwa__mix-delta { font-size: 11px; font-weight: 700; color: hsl(220, 15%, 45%); white-space: nowrap; flex-shrink: 0; }
.lt-pwa__mix-note {
  font-size: 11.5px;
  line-height: 1.5;
  color: hsl(220, 15%, 45%);
  padding: 0 2px;
}
.lt-pwa__overflow { font-size: 11.5px; color: hsl(220, 15%, 50%); padding: 2px 2px 0; }

/* PR-B-v2 honest span label — shown when the window's practice is concentrated in a
   short recent stretch (isShortSpan), so a "month" view never silently implies a
   month-long trend. Additive only. */
.lt-pwa__span-note {
  font-size: 11.5px;
  line-height: 1.55;
  color: hsl(35, 60%, 32%);
  background: hsl(42, 80%, 95%);
  border: 1px solid hsl(42, 60%, 86%);
  border-radius: 10px;
  padding: 10px 12px;
  max-width: 640px;
}

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
.lt-pwa__state strong { font-weight: 700; color: hsl(220, 25%, 25%); }

@media (max-width: 640px) {
  .lt-pwa { padding: 16px; }
  .lt-pwa__arcs { grid-template-columns: 1fr; }
  .lt-pwa__win { padding: 6px 10px; }
  .lt-pwa__row { gap: 8px; padding: 8px; }
  .lt-pwa__row-now { font-size: 14px; }
}
`;

export default ProgressWindowArc;
