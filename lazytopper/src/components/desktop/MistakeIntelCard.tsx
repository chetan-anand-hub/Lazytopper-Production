import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  getMistakeLogs,
  type MistakeLogEntry,
} from "../../services/mistakeLogService";
import { getAttemptsFromCloud, type PracticeAttempt } from "../../services/practiceInsights";
import { aggregateEntryMarks } from "../../services/mistakeInsightsService";
import {
  groupCounts,
  groupMarks,
  marksWithUnit,
  countWithUnit,
  mistakeGroupByKey,
  type MistakeGroupKey,
} from "../../lib/mistakeDisplay";

/**
 * MistakeIntelCard — sidebar block in the locked desktop baseline AppShell.
 *
 * Source of truth (locked desktop baseline repo):
 *   chetan-anand-hub/lazytopper-desktop-view-e1fc5df7
 *   src/components/lt/AppShell.tsx (sidebar Mistake Intel block)
 *
 * This is the SIDEBAR variant (small accent block at the bottom of the
 * sidebar). The desktop Home page renders a separate, larger Mistake
 * Intelligence card in its content composition — that one lives in
 * pages/desktop/DesktopHome.tsx.
 *
 * PR-I3 — Honest Mistake Intel.
 *
 * Replaces the previous hard-coded "You lose 38% marks to silly errors in
 * Maths." claim (which violated LazyTopper's data-honesty rule) with a real-
 * data driven sidebar that reads from the same production source the rest
 * of the desktop surfaces use:
 *
 *   getMistakeLogs(uid, days)
 *
 * which returns real `MistakeLogEntry[]` for the signed-in user from
 * Firestore (with a localStorage fallback when offline / not yet wired).
 *
 * States:
 *   1. Loading         — auth still resolving, or first fetch in flight.
 *   2. Signed out      — no user; honest CTA to sign in for mistake-aware
 *                        practice.
 *   3. Error           — fetch threw; honest message + CTA to /me.
 *   4. Signed in,
 *      no logs         — user exists but has not graded any answers yet;
 *                        honest "no patterns yet" prompt + CTA to
 *                        /check-improve.
 *   5. Signed in,
 *      with logs       — compact summary computed from the user's real
 *                        7-day data: checked-answer count, marks-lost total,
 *                        and the biggest loss (only when it is > 0).
 *
 * SCORECARD-MI-1 PR-2 (H3, GA-23) — superseded by owner ruling 2026-10-05 (taxonomy and
 * wording; marks not counts):
 *   - the group names come ONLY from lib/mistakeDisplay (knowledge gap / exam technique /
 *     careless) — no local label map of its own;
 *   - "checked answers" counts GRADED ANSWERS (the attempt store, one per submission — H1), not
 *     Mistake-Intelligence log entries: a full-mark answer has no MI entry, so the log could
 *     only ever count answers that lost marks;
 *   - the biggest loss is decided in MARKS per group when the window's entries carry v2 marks
 *     (versioned), else in mistakes — each number carries its unit, never a bare number.
 *
 * Visual contract:
 *   - Same compact card shape, padding, accent label, sparkles icon, dark
 *     sidebar surface, and link colour as the previous baseline.
 *   - Inline styles only (production has no Tailwind / shadcn classes).
 *   - Inline SVG only (production has no lucide-react).
 *
 * Navigation:
 *   - Production routes only ("/login", "/me", "/check-improve").
 *     The browser may show "/app/login" etc. because the artifact is
 *     mounted under BASE_PATH=/app — that is correct and expected.
 *
 * Forbidden (per PR-I3 task contract):
 *   - No PR #17 symbols (aggregateErrorCategories, readLocalMistakeLogsSince,
 *     ErrorCategory).
 *   - No invented percentages, fake weakness diagnoses, or demo data.
 *   - Only show a top pattern when its real count is greater than zero.
 */

const WINDOW_DAYS = 7;

/** The biggest loss, in the owner's groups (lib/mistakeDisplay), with its real unit. */
export interface MiCardTopLoss {
  group: MistakeGroupKey;
  /** The group's label from lib/mistakeDisplay ("Knowledge gap", "Exam technique", "Careless"). */
  label: string;
  /** "2 marks" when decided in marks (v2 entries), "3 mistakes" when decided in counts. */
  amount: string;
  basis: "marks" | "counts";
}

export interface MiCardSummary {
  /** GRADED answers in the window (attempts with mode "graded", one per submission). */
  checkedCount: number;
  totalMarksLost: number;
  topLoss: MiCardTopLoss | null;
}

const GROUP_ORDER: MistakeGroupKey[] = ["knowledge", "technique", "careless"];

function topOf(by: Record<MistakeGroupKey, number>): MistakeGroupKey | null {
  let best: MistakeGroupKey | null = null;
  let bestN = 0;
  for (const k of GROUP_ORDER) {
    if ((Number(by[k]) || 0) > bestN) {
      best = k;
      bestN = Number(by[k]) || 0;
    }
  }
  return best;
}

/**
 * H3 — the card's numbers, from real data only. `entries` are the 7-day MI entries; `attempts`
 * the same window's attempts (the graded-answer count). Marks decide the biggest loss when any
 * entry carries v2 marks; a count-only window is decided in mistakes. Never invented: a group
 * with nothing lost is never named.
 */
export function computeMiCardSummary(entries: MistakeLogEntry[], attempts: PracticeAttempt[]): MiCardSummary {
  let totalMarksLost = 0;
  for (const entry of entries) {
    if (Number.isFinite(entry.marksLost)) totalMarksLost += entry.marksLost;
  }
  const checkedCount = attempts.filter((a) => a.mode === "graded").length;

  let topLoss: MiCardTopLoss | null = null;
  const marks = aggregateEntryMarks(entries);
  const byMarks = marks ? groupMarks(marks) : null;
  const markTop = byMarks ? topOf(byMarks) : null;
  if (byMarks && markTop) {
    topLoss = {
      group: markTop,
      label: mistakeGroupByKey(markTop).label,
      amount: marksWithUnit(byMarks[markTop]),
      basis: "marks",
    };
  } else {
    const counts = { conceptual: 0, calculation: 0, silly: 0, presentation: 0 };
    for (const entry of entries) {
      const c = entry.mistakeCounts;
      if (!c) continue;
      counts.conceptual += Number(c.conceptual) || 0;
      counts.calculation += Number(c.calculation) || 0;
      counts.silly += Number(c.silly) || 0;
      counts.presentation += Number(c.presentation) || 0;
    }
    const byCount = groupCounts(counts);
    const countTop = topOf(byCount);
    if (countTop) {
      topLoss = {
        group: countTop,
        label: mistakeGroupByKey(countTop).label,
        amount: countWithUnit(byCount[countTop]),
        basis: "counts",
      };
    }
  }

  return {
    checkedCount,
    totalMarksLost: Math.round(totalMarksLost * 10) / 10,
    topLoss,
  };
}

function formatMarks(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(1);
}

type ViewState =
  | { kind: "loading" }
  | { kind: "signed-out" }
  | { kind: "error" }
  | { kind: "no-data" }
  | { kind: "with-data"; summary: MiCardSummary };

const CARD_STYLE: React.CSSProperties = {
  borderRadius: 12,
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  padding: 16,
};

const HEADER_ROW_STYLE: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  color: "#22c55e",
};

const HEADER_LABEL_STYLE: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const BODY_STYLE: React.CSSProperties = {
  fontSize: 13,
  lineHeight: 1.45,
  color: "rgba(255,255,255,0.85)",
  margin: "8px 0 0",
};

const CTA_STYLE: React.CSSProperties = {
  marginTop: 10,
  display: "inline-block",
  fontSize: 12,
  color: "#22c55e",
  textDecoration: "none",
  fontWeight: 600,
};

function SparklesIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" />
    </svg>
  );
}

export function MistakeIntelCard() {
  const { user, loading: authLoading, mistakeLogsHydrated } = useAuth();

  const uid = user?.uid ?? null;

  const [fetchState, setFetchState] = useState<{
    status: "idle" | "loading" | "ok" | "error";
    entries: MistakeLogEntry[];
    attempts: PracticeAttempt[];
  }>({ status: "idle", entries: [], attempts: [] });

  useEffect(() => {
    if (!uid) {
      // No user — clear any prior fetch state so we render the signed-out
      // surface immediately instead of leaking the previous user's data.
      setFetchState({ status: "idle", entries: [], attempts: [] });
      return;
    }

    let cancelled = false;
    setFetchState((prev) => ({ status: "loading", entries: prev.entries, attempts: prev.attempts }));

    void (async () => {
      try {
        // H3 — the graded-answer count comes from the attempt store (one per submission),
        // read for the SAME 7-day window; it never fails the card (an empty read counts 0).
        const since = Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000;
        const [entries, attempts] = await Promise.all([
          getMistakeLogs(uid, WINDOW_DAYS),
          getAttemptsFromCloud(uid, { start: since }).catch(() => [] as PracticeAttempt[]),
        ]);
        if (cancelled) return;
        setFetchState({ status: "ok", entries, attempts });
      } catch {
        if (cancelled) return;
        setFetchState({ status: "error", entries: [], attempts: [] });
      }
    })();

    return () => {
      cancelled = true;
    };
    // Re-fetch when the user changes, and again after Firestore hydration
    // completes (mistakeLogsHydrated bumps from AuthContext) so newly
    // imported cloud entries are reflected without a manual refresh.
  }, [uid, mistakeLogsHydrated]);

  const view: ViewState = useMemo(() => {
    if (authLoading) return { kind: "loading" };
    if (!uid) return { kind: "signed-out" };
    if (fetchState.status === "loading" && fetchState.entries.length === 0) {
      return { kind: "loading" };
    }
    if (fetchState.status === "error") return { kind: "error" };
    if (fetchState.entries.length === 0) return { kind: "no-data" };
    return { kind: "with-data", summary: computeMiCardSummary(fetchState.entries, fetchState.attempts) };
  }, [authLoading, uid, fetchState.status, fetchState.entries, fetchState.attempts]);

  return (
    <div style={CARD_STYLE}>
      <div style={HEADER_ROW_STYLE}>
        <SparklesIcon />
        <span style={HEADER_LABEL_STYLE}>Mistake Intel</span>
      </div>

      {view.kind === "loading" && (
        <>
          <p style={BODY_STYLE}>Looking for recent mistake patterns…</p>
        </>
      )}

      {view.kind === "signed-out" && (
        <>
          <p style={BODY_STYLE}>
            Sign in to see mistake patterns from your checked answers.
          </p>
          <Link to="/login?reason=mistake-aware&redirect=/me" style={CTA_STYLE}>
            Sign in →
          </Link>
        </>
      )}

      {view.kind === "error" && (
        <>
          <p style={BODY_STYLE}>
            Couldn&rsquo;t load mistake patterns. Try Me / Progress.
          </p>
          <Link to="/me" style={CTA_STYLE}>
            Open Me →
          </Link>
        </>
      )}

      {view.kind === "no-data" && (
        <>
          <p style={BODY_STYLE}>
            No mistake patterns yet. Check an answer to build your mistake
            history.
          </p>
          <Link to="/check-improve" style={CTA_STYLE}>
            Check an answer →
          </Link>
        </>
      )}

      {view.kind === "with-data" && (
        <>
          <p style={BODY_STYLE} data-testid="mi-card-summary">
            Last {WINDOW_DAYS} days:{" "}
            {view.summary.checkedCount > 0 ? (
              <span style={{ color: "#fff", fontWeight: 700 }} data-testid="mi-card-checked">
                {view.summary.checkedCount} checked{" "}
                {view.summary.checkedCount === 1 ? "answer" : "answers"}
              </span>
            ) : null}
            {view.summary.totalMarksLost > 0 ? (
              <>
                {view.summary.checkedCount > 0 ? ", " : ""}
                <span style={{ color: "#fff", fontWeight: 700 }}>
                  {formatMarks(view.summary.totalMarksLost)} {view.summary.totalMarksLost === 1 ? "mark" : "marks"} lost
                </span>
              </>
            ) : null}
            .
            {view.summary.topLoss ? (
              <>
                {" "}Biggest loss:{" "}
                <span style={{ color: "#fff", fontWeight: 700 }} data-testid="mi-card-top" data-basis={view.summary.topLoss.basis}>
                  {view.summary.topLoss.label} ({view.summary.topLoss.amount})
                </span>
                .
              </>
            ) : null}
          </p>
          <Link to="/me" style={CTA_STYLE}>
            See where →
          </Link>
        </>
      )}
    </div>
  );
}
