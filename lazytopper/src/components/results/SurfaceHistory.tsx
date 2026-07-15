import { useCallback, useMemo, useRef, useState } from "react";
import {
  getSurfaceHistory,
  getSubjectProgress,
  type ProgressTrend,
} from "../../services/progressStore";
import type {
  SessionRecord,
  SessionSurface,
  SessionSubject,
  SessionFourType,
} from "../../services/sessionRecords";
import { getWorksheetSession, getWorksheetGrade } from "../../services/worksheetSessionStore";
import { exportGradedWorksheetPdf } from "../worksheet/worksheetPdfExport";
import type { WorksheetGradeResponse } from "../../ai/aiClient";
import ResultsScorecard from "./ResultsScorecard";
import { storedWorksheetScorecardVariant } from "./scorecardVariants";

/**
 * SurfaceHistory — Progress-Journey ARC · PR-3 (§3a): the per-surface HISTORY section.
 * It RENDERS the durable session records the store already writes (PR-1/#338) — this
 * component CONSUMES `progressStore`, it does not compute or persist anything.
 *
 * Each row: `code` + `title` + `date` + a score chip (or an honest "awaiting your answer
 * sheet" pill when nothing is graded yet) + a compact four-type dot-strip. Tapping a row
 * re-opens that STORED record as a READ-ONLY <ResultsScorecard> (score + four-type + code,
 * all from the record — invent nothing); a "Download graded sheet" affordance appears ONLY
 * when the original worksheet + its grade response are still cached locally (else absent —
 * it never promises a sheet it can't produce). An honest "vs last time" trend chip rides
 * the newest row of each subject, from `getSubjectProgress` (honest-or-silent — nothing
 * when the data is thin).
 *
 * ONE responsive component (desktop + mobile via CSS reflow, no useIsDesktop twin).
 * Worksheet is the ONLY surface this component is mounted for (WorksheetHistoryPanel).
 * Every other entry below is a DEFINED-BUT-UNMOUNTED seam: SURFACE_COPY is an
 * exhaustive Record<SessionSurface, …>, so each new surface is FORCED to declare its
 * copy here even when its live history lives elsewhere.
 */

const SURFACE_COPY: Record<SessionSurface, { heading: string; empty: string }> = {
  worksheet: { heading: "Your worksheets", empty: "Your graded worksheets will appear here." },
  // Defined-but-unmounted: Chapter Test (#374/#380) and Full Mock (#387) SHIPPED, but
  // each hosts its own bespoke history on its own page (ChapterTestHistoryRail /
  // FullMockHistoryPanel) rather than adopting this container. Kept for parity.
  "chapter-test": { heading: "Your chapter tests", empty: "Your graded chapter tests will appear here." },
  "full-mock": { heading: "Your mock tests", empty: "Your graded mock tests will appear here." },
  // Defined-but-unmounted (C&I PR-1): C&I's live history is its own overlay panel
  // (CheckImproveHistoryPanel) — this component is never mounted with "check-improve".
  "check-improve": { heading: "Your checked papers", empty: "Your checked papers will appear here." },
  // Defined-but-unmounted (QP sessions, 2026-07-15): QP writes records (LOCKED §1a as
  // amended) but has NO history surface yet — mounting one is [FU-QP-HISTORY-RAIL],
  // which carries a real design question (QP's scorecard is "X of N attempted, never
  // marks/total", so a QP row cannot reuse this container's marks-based card).
  "quick-practice": { heading: "Your practice sets", empty: "Your finished practice sets will appear here." },
};

const SUBJECTS: SessionSubject[] = ["maths", "science"];

interface SurfaceHistoryProps {
  surface: SessionSurface;
  uid: string | null | undefined;
  /** Rendered inside the worksheet history OVERLAY panel (FIX B): the panel supplies
   *  the heading + padding, so drop this component's own header and top margin. The
   *  rows, dot-strip, pill, trend chip and read-only scorecard re-open are unchanged. */
  embedded?: boolean;
  /** Show only ungraded rows (status ≠ graded) — the pending banner's "See all N →". */
  pendingOnly?: boolean;
}

function formatDate(ms: number): string {
  try {
    return new Date(ms).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "";
  }
}

function scoreTone(awarded: number, total: number): "good" | "mid" | "low" {
  if (total <= 0) return "mid";
  const pct = (awarded / total) * 100;
  return pct >= 75 ? "good" : pct >= 45 ? "mid" : "low";
}

/** A minimal honest coaching footer for a re-downloaded graded sheet, from the stored
 *  four-type only (never fabricated). */
function storedCoaching(ft: SessionFourType): string {
  const knowledge = (ft.conceptual || 0) + (ft.calculation || 0);
  const careless = (ft.silly || 0) + (ft.presentation || 0);
  const parts: string[] = [];
  if (careless > 0) {
    parts.push(
      `${careless} careless ${careless === 1 ? "slip" : "slips"} — your method was right, just slow down on the final line and units.`,
    );
  }
  if (knowledge > 0) {
    parts.push(
      `${knowledge} knowledge ${knowledge === 1 ? "gap" : "gaps"} to close — practise this topic.`,
    );
  }
  return parts.length ? parts.join(" ") : "Clean sheet on the questions that were graded. Keep it up.";
}

/** The compact four-type dot-strip for a row. Colours mirror the scorecard swatches. */
function DotStrip({ ft }: { ft: SessionFourType }) {
  const dots: Array<{ cls: string; n: number; label: string }> = [
    { cls: "con", n: ft.conceptual || 0, label: "Conceptual" },
    { cls: "cal", n: ft.calculation || 0, label: "Calculation" },
    { cls: "silly", n: ft.silly || 0, label: "Silly" },
    { cls: "pres", n: ft.presentation || 0, label: "Presentation" },
  ].filter((d) => d.n > 0);
  if (dots.length === 0) {
    return <span className="lt-sh__d lt-sh__d--clean" title="No mistakes logged on the graded questions">✓ clean</span>;
  }
  return (
    <span className="lt-sh__dots" title="Where your marks went (Knowledge gaps vs Careless mark-loss)">
      {dots.map((d) => (
        <span key={d.cls} className={`lt-sh__d lt-sh__d--${d.cls}`} title={`${d.label}: ${d.n}`}>
          {d.n}
        </span>
      ))}
    </span>
  );
}

/** The honest "vs last time" chip — subject marks trend over the last month, silent when
 *  the trend reader has too little data (honest-or-silent). */
function TrendChip({ subject, trend }: { subject: SessionSubject; trend: ProgressTrend }) {
  const dir = trend.delta > 0 ? "up" : trend.delta < 0 ? "down" : "flat";
  const arrow = dir === "up" ? "↑" : dir === "down" ? "↓" : "→";
  const mag = Math.abs(trend.delta);
  const subjectLabel = subject === "science" ? "Science" : "Maths";
  const text = dir === "flat" ? "steady this month" : `${arrow} ${mag}% this month`;
  return (
    <span
      className={`lt-sh__trend lt-sh__trend--${dir}`}
      title={`${subjectLabel} marks ${dir === "up" ? "up" : dir === "down" ? "down" : "steady"} ${dir === "flat" ? "" : mag + "% "}vs earlier this month (${trend.before}% → ${trend.now}%)`}
    >
      {text}
    </span>
  );
}

export default function SurfaceHistory({ surface, uid, embedded, pendingOnly }: SurfaceHistoryProps) {
  const [reopen, setReopen] = useState<SessionRecord | null>(null);
  const [downloading, setDownloading] = useState(false);
  const downloadingRef = useRef(false);

  const records = useMemo(() => {
    const all = getSurfaceHistory(surface, uid);
    return pendingOnly ? all.filter((r) => r.status !== "graded") : all;
  }, [surface, uid, pendingOnly]);

  // C2 — honest "vs last time": one subject-level trend, attached to the newest row of
  // each subject (the freshest, peak-motivation moment). Honest-or-silent.
  const trendBySubject = useMemo(() => {
    const map: Partial<Record<SessionSubject, ProgressTrend | null>> = {};
    for (const subj of SUBJECTS) {
      if (records.some((r) => r.subject === subj)) map[subj] = getSubjectProgress(subj, "month", uid);
    }
    return map;
  }, [records, uid]);

  // records are newest-first → the first record seen per subject is that subject's newest.
  const newestIdBySubject = useMemo(() => {
    const m: Partial<Record<SessionSubject, string>> = {};
    for (const r of records) if (!m[r.subject]) m[r.subject] = r.id;
    return m;
  }, [records]);

  const closeReopen = useCallback(() => setReopen(null), []);

  // C3 — a "Download graded sheet" closure ONLY when the local caches resolve (honest).
  const gradedSheetHandler = useCallback(
    (record: SessionRecord): (() => void) | undefined => {
      // A pending-upload record graded zero questions → there is no graded sheet to
      // produce (the cached grade response is `ok` but all-unreadable). Never offer it.
      if (record.status === "pending-upload") return undefined;
      const ws = getWorksheetSession(record.worksheetId);
      const grade = getWorksheetGrade<WorksheetGradeResponse>(record.worksheetId);
      if (!ws || !grade || !grade.ok) return undefined;
      return () => {
        if (downloadingRef.current) return;
        downloadingRef.current = true;
        setDownloading(true);
        void exportGradedWorksheetPdf({
          ws,
          response: grade,
          name: record.title,
          code: record.id,
          coaching: storedCoaching(record.fourType),
        }).finally(() => {
          downloadingRef.current = false;
          setDownloading(false);
        });
      };
    },
    [],
  );

  const copy = SURFACE_COPY[surface];
  const emptyText = pendingOnly ? "No worksheets are awaiting your answer sheet." : copy.empty;

  return (
    <section className={`lt-sh${embedded ? " lt-sh--embedded" : ""}`} aria-label={copy.heading}>
      <style>{SH_CSS}</style>
      {!embedded && (
        <div className="lt-sh__head">
          <h2 className="lt-sh__h">{copy.heading}</h2>
          {records.length > 0 && <span className="lt-sh__count">{records.length}</span>}
        </div>
      )}

      {records.length === 0 ? (
        <div className="lt-sh__empty">{emptyText}</div>
      ) : (
        <ul className="lt-sh__list">
          {records.map((r) => {
            const pending = r.status === "pending-upload";
            const partial = r.status === "partial";
            const tone = scoreTone(r.marksAwarded, r.marksTotal);
            const trend = newestIdBySubject[r.subject] === r.id ? trendBySubject[r.subject] : null;
            return (
              <li key={r.id}>
                <button
                  type="button"
                  className="lt-sh__row"
                  onClick={() => setReopen(r)}
                  aria-label={`Re-open the ${r.title} scorecard`}
                >
                  <span className="lt-sh__rmain">
                    <span className="lt-sh__rcode">{r.id}</span>
                    <span className="lt-sh__rtitle">{r.title}</span>
                    <span className="lt-sh__rdate">{formatDate(r.gradedAt)}</span>
                  </span>
                  <span className="lt-sh__rmeta">
                    {trend && <TrendChip subject={r.subject} trend={trend} />}
                    {pending ? (
                      <span className="lt-sh__pill">Awaiting your answer sheet</span>
                    ) : (
                      <span className={`lt-sh__chip lt-sh__chip--${tone}`}>
                        {r.marksAwarded}/{r.marksTotal}
                        {partial && <em className="lt-sh__partial"> partial</em>}
                      </span>
                    )}
                    {!pending && <DotStrip ft={r.fourType} />}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {reopen && (
        <ResultsScorecard
          variant={storedWorksheetScorecardVariant(reopen, {
            gradedDateLabel: formatDate(reopen.gradedAt),
            onDone: closeReopen,
            onDownload: gradedSheetHandler(reopen),
            downloading,
          })}
          onClose={closeReopen}
        />
      )}
    </section>
  );
}

const SH_CSS = `
.lt-sh {
  --sh-navy: #15233a;
  --sh-green: hsl(152, 55%, 45%);
  --sh-fg: hsl(220, 25%, 12%);
  --sh-muted: hsl(220, 15%, 42%);
  --sh-hint: hsl(220, 12%, 58%);
  --sh-line: hsl(220, 18%, 90%);
  --sh-surface: #ffffff;
  --sh-surface-2: hsl(210, 33%, 97%);
  --sh-fd: "Fraunces", Georgia, serif;
  --sh-fb: "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  font-family: var(--sh-fb);
  color: var(--sh-fg);
  margin-top: 28px;
}
/* FIX B — inside the overlay panel the container supplies the header + padding. */
.lt-sh--embedded { margin-top: 0; }
.lt-sh__head { display: flex; align-items: baseline; gap: 10px; margin-bottom: 14px; }
.lt-sh__h { font-family: var(--sh-fd); font-weight: 700; font-size: 19px; margin: 0; color: var(--sh-navy); }
.lt-sh__count {
  font-size: 12px; font-weight: 700; color: var(--sh-muted);
  background: var(--sh-surface-2); border: 1px solid var(--sh-line);
  border-radius: 99px; padding: 1px 9px;
}
.lt-sh__empty {
  border: 1px dashed var(--sh-line); border-radius: 14px; padding: 22px 18px;
  color: var(--sh-muted); font-size: 14px; text-align: center; background: var(--sh-surface-2);
}

.lt-sh__list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 9px; }
.lt-sh__row {
  display: flex; align-items: center; justify-content: space-between; gap: 14px; width: 100%;
  background: var(--sh-surface); border: 1px solid var(--sh-line); border-radius: 13px;
  padding: 13px 16px; cursor: pointer; text-align: left;
  font-family: var(--sh-fb); color: var(--sh-fg);
  transition: border-color 0.14s ease, box-shadow 0.14s ease;
}
.lt-sh__row:hover { border-color: var(--sh-green); box-shadow: 0 2px 10px rgba(20, 35, 58, 0.07); }
.lt-sh__rmain { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.lt-sh__rcode { font-size: 11px; font-weight: 700; letter-spacing: 0.06em; color: var(--sh-hint); text-transform: uppercase; }
.lt-sh__rtitle { font-size: 14.5px; font-weight: 600; color: var(--sh-fg); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lt-sh__rdate { font-size: 12px; color: var(--sh-muted); }
.lt-sh__rmeta { display: flex; align-items: center; gap: 10px; flex-shrink: 0; flex-wrap: wrap; justify-content: flex-end; }

.lt-sh__chip {
  font-size: 14px; font-weight: 700; border-radius: 9px; padding: 5px 11px; white-space: nowrap;
}
.lt-sh__chip--good { background: hsl(152, 55%, 95%); color: hsl(152, 55%, 26%); }
.lt-sh__chip--mid { background: hsl(38, 92%, 94%); color: hsl(33, 70%, 32%); }
.lt-sh__chip--low { background: hsl(0, 80%, 96%); color: hsl(0, 65%, 42%); }
.lt-sh__partial { font-style: normal; font-weight: 600; font-size: 11px; opacity: 0.75; }
.lt-sh__pill {
  font-size: 12px; font-weight: 600; border-radius: 99px; padding: 5px 12px; white-space: nowrap;
  background: hsl(38, 92%, 94%); color: hsl(33, 70%, 32%); border: 1px solid hsl(38, 60%, 82%);
}

.lt-sh__dots { display: inline-flex; align-items: center; gap: 5px; }
.lt-sh__d {
  font-size: 11px; font-weight: 700; min-width: 20px; text-align: center;
  border-radius: 6px; padding: 2px 5px; color: #fff;
}
.lt-sh__d--con { background: #ef4444; }
.lt-sh__d--cal { background: #e8930c; }
.lt-sh__d--silly { background: #f97316; }
.lt-sh__d--pres { background: #3b82f6; }
.lt-sh__d--clean { background: transparent; color: hsl(152, 55%, 32%); font-weight: 600; padding: 2px 4px; }

.lt-sh__trend {
  font-size: 11.5px; font-weight: 700; border-radius: 99px; padding: 3px 9px; white-space: nowrap;
}
.lt-sh__trend--up { background: hsl(152, 55%, 95%); color: hsl(152, 55%, 26%); }
.lt-sh__trend--down { background: hsl(210, 30%, 95%); color: hsl(220, 15%, 40%); }
.lt-sh__trend--flat { background: var(--sh-surface-2); color: var(--sh-muted); }

@media (max-width: 640px) {
  .lt-sh__row { flex-direction: column; align-items: stretch; gap: 10px; }
  .lt-sh__rmeta { justify-content: flex-start; }
  .lt-sh__rtitle { white-space: normal; }
}
`;
