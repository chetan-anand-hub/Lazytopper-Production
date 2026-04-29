import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  getMistakeLogs,
  type MistakeLogEntry,
} from "../../services/mistakeLogService";

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
 *                        7-day MistakeLogEntry[]: checked-answer count,
 *                        marks-lost total, top mistake pattern (only when
 *                        the count is > 0).
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

type Pattern = "conceptual" | "calculation" | "silly" | "presentation";

const PATTERN_LABELS: Record<Pattern, string> = {
  conceptual: "concept gaps",
  calculation: "calculation slips",
  silly: "silly mistakes",
  presentation: "presentation issues",
};

interface RealSummary {
  answerCount: number;
  totalMarksLost: number;
  topPattern: Pattern | null;
}

function computeSummary(entries: MistakeLogEntry[]): RealSummary {
  let totalMarksLost = 0;
  const patternCounts: Record<Pattern, number> = {
    conceptual: 0,
    calculation: 0,
    silly: 0,
    presentation: 0,
  };

  for (const entry of entries) {
    if (Number.isFinite(entry.marksLost)) {
      totalMarksLost += entry.marksLost;
    }
    const counts = entry.mistakeCounts;
    if (counts) {
      if (Number.isFinite(counts.conceptual)) patternCounts.conceptual += counts.conceptual;
      if (Number.isFinite(counts.calculation)) patternCounts.calculation += counts.calculation;
      if (Number.isFinite(counts.silly)) patternCounts.silly += counts.silly;
      if (Number.isFinite(counts.presentation)) patternCounts.presentation += counts.presentation;
    }
  }

  let topPattern: Pattern | null = null;
  let topCount = 0;
  for (const key of ["conceptual", "calculation", "silly", "presentation"] as Pattern[]) {
    const count = patternCounts[key];
    if (count > topCount) {
      topPattern = key;
      topCount = count;
    }
  }

  return {
    answerCount: entries.length,
    totalMarksLost: Math.round(totalMarksLost * 10) / 10,
    topPattern,
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
  | { kind: "with-data"; summary: RealSummary };

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
  }>({ status: "idle", entries: [] });

  useEffect(() => {
    if (!uid) {
      // No user — clear any prior fetch state so we render the signed-out
      // surface immediately instead of leaking the previous user's data.
      setFetchState({ status: "idle", entries: [] });
      return;
    }

    let cancelled = false;
    setFetchState((prev) => ({ status: "loading", entries: prev.entries }));

    void (async () => {
      try {
        const entries = await getMistakeLogs(uid, WINDOW_DAYS);
        if (cancelled) return;
        setFetchState({ status: "ok", entries });
      } catch {
        if (cancelled) return;
        setFetchState({ status: "error", entries: [] });
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
    return { kind: "with-data", summary: computeSummary(fetchState.entries) };
  }, [authLoading, uid, fetchState.status, fetchState.entries]);

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
          <p style={BODY_STYLE}>
            Last {WINDOW_DAYS} days:{" "}
            <span style={{ color: "#fff", fontWeight: 700 }}>
              {view.summary.answerCount} checked{" "}
              {view.summary.answerCount === 1 ? "answer" : "answers"}
            </span>
            {view.summary.totalMarksLost > 0 ? (
              <>
                ,{" "}
                <span style={{ color: "#fff", fontWeight: 700 }}>
                  {formatMarks(view.summary.totalMarksLost)} marks lost
                </span>
              </>
            ) : null}
            .
            {view.summary.topPattern ? (
              <>
                {" "}Top pattern:{" "}
                <span style={{ color: "#fff", fontWeight: 700 }}>
                  {PATTERN_LABELS[view.summary.topPattern]}
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
