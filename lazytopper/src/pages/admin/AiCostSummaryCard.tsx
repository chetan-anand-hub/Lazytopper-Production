/**
 * AiCostSummaryCard — COST-1. "AI cost" at the top of /admin/students: the total the usage
 * ledger metered for a SPEND window, how many students it was spent on, the average and median
 * per student with cost, the top 10 students and the split by plan. READ-ONLY.
 *
 * ★ LOADS ON REQUEST. The summary reads one ledger day document per student per day (the
 * server states the exact count it read), so it is fetched only when the admin presses
 * "Load AI cost" — never on every page view. Once loaded it follows the page's period.
 * ★ HONEST DATA. Every number is the server's; a read that failed is counted as "could not be
 * read", never as ₹0. Signed-out spend is not in the ledger, so it is shown as "not recorded".
 * ★ ADMIN-ONLY. Rendered by StudentsAdminPage only after the admin API answered OK; the data
 * comes from the ADMIN_FIREBASE_UIDS-gated `/api/admin/students/ai-cost`.
 */
import { useEffect, useRef, useState } from "react";
import {
  AI_COST_NOTE,
  AI_COST_SCOPE_NOTE,
  aiCostUrl,
  fetchAdmin,
  formatCostInr,
  formatDayKey,
  maskEmail,
  maskPhone,
  planLabel,
  type AiCostResponse,
  type CostPlan,
  type Period,
} from "./studentsAdminModel";

export type AiCostState = { status: "idle" } | { status: "loading" } | { status: "ok"; data: AiCostResponse } | { status: "failed" };

/**
 * The page's AI-cost loader. Held by StudentsAdminPage (NOT the card), so the admin's choice to
 * load and each period's result survive the card re-mounting (the list refetching on a period
 * change, a return from a student's detail) — one fetch per period per page visit, never a
 * second read of the ledger for a period already loaded or loading.
 */
export function useAiCostSummary(period: Period, getToken: () => Promise<string | null>) {
  const [requested, setRequested] = useState(false);
  const [byPeriod, setByPeriod] = useState<Partial<Record<Period, AiCostState>>>({});
  const [retries, setRetries] = useState(0);
  const startedRef = useRef<Partial<Record<Period, boolean>>>({});

  useEffect(() => {
    if (!requested || startedRef.current[period]) return;
    startedRef.current[period] = true;
    setByPeriod((s) => ({ ...s, [period]: { status: "loading" } }));
    void fetchAdmin<AiCostResponse>(aiCostUrl(period), getToken).then((r) => {
      setByPeriod((s) => ({ ...s, [period]: r.ok ? { status: "ok", data: r.data } : { status: "failed" } }));
    });
  }, [requested, period, getToken, retries]);

  const state: AiCostState = !requested ? { status: "idle" } : byPeriod[period] || { status: "loading" };
  return {
    state,
    request: () => setRequested(true),
    retry: () => {
      startedRef.current[period] = false;
      setRetries((n) => n + 1);
    },
  };
}

const SPEND_WINDOW_LABELS: Record<Period, string> = {
  all: "Since the ledger began",
  "1": "Today (IST)",
  "7": "Last 7 days (IST)",
  "30": "Last 30 days (IST)",
};

const PLAN_ROWS: { key: CostPlan; label: string }[] = [
  { key: "trial", label: "Trial" },
  { key: "premium", label: "Premium" },
  { key: "basic", label: "Basic" },
  { key: "unknown", label: "Plan could not be read" },
];

/** Presentational: the state comes from `useAiCostSummary`, held by the page. */
export default function AiCostSummaryCard({
  period,
  state,
  onRequest,
  onRetry,
  onOpenStudent,
}: {
  period: Period;
  state: AiCostState;
  onRequest: () => void;
  onRetry: () => void;
  onOpenStudent: (uid: string) => void;
}) {
  return (
    <section className="gh-card ac-card" aria-labelledby="ac-title" data-testid="ai-cost-summary">
      <h2 id="ac-title" className="gh-title">
        AI cost · {SPEND_WINDOW_LABELS[period]}
      </h2>
      <p className="sa-muted gh-note" data-testid="ai-cost-note">
        {AI_COST_NOTE} {AI_COST_SCOPE_NOTE}
      </p>
      {state.status === "idle" && (
        <button type="button" className="sa-btn" data-testid="ai-cost-load" onClick={onRequest}>
          Load AI cost
        </button>
      )}
      {state.status === "loading" && <p className="sa-muted">Loading AI cost…</p>}
      {state.status === "failed" && (
        <p className="sa-note sa-warn" role="alert" data-testid="ai-cost-failed">
          The AI cost summary could not be loaded.{" "}
          <button type="button" className="sa-btn sa-btn-small" onClick={onRetry}>
            Try again
          </button>
        </p>
      )}
      {state.status === "ok" && <Loaded data={state.data} onOpenStudent={onOpenStudent} />}
    </section>
  );
}

function Loaded({ data, onOpenStudent }: { data: AiCostResponse; onOpenStudent: (uid: string) => void }) {
  const range =
    data.window.from === data.window.to
      ? formatDayKey(data.window.to)
      : `${formatDayKey(data.window.from)} – ${formatDayKey(data.window.to)}`;
  return (
    <>
      <div className="sa-cards" data-testid="ai-cost-cards">
        <div className="sa-card">
          <span className="sa-card-label">Total AI cost (INR)</span>
          <span className="sa-card-value" data-testid="ai-cost-total">
            {formatCostInr(data.totalInr)}
          </span>
          <span className="sa-card-note">{range}</span>
        </div>
        <div className="sa-card">
          <span className="sa-card-label">Students with cost</span>
          <span className="sa-card-value" data-testid="ai-cost-students">
            {data.studentsWithCost}
          </span>
          <span className="sa-card-note">cost above ₹0 in this window</span>
        </div>
        <div className="sa-card">
          <span className="sa-card-label">Average per student (INR)</span>
          <span className="sa-card-value" data-testid="ai-cost-average">
            {formatCostInr(data.averageInr)}
          </span>
          <span className="sa-card-note">over students with cost</span>
        </div>
        <div className="sa-card">
          <span className="sa-card-label">Median per student (INR)</span>
          <span className="sa-card-value" data-testid="ai-cost-median">
            {formatCostInr(data.medianInr)}
          </span>
          <span className="sa-card-note">over students with cost</span>
        </div>
      </div>

      <div className="ac-split">
        <div>
          <h3 className="ac-subtitle">By plan now</h3>
          <table className="sa-pages ac-table" data-testid="ai-cost-by-plan">
            <thead>
              <tr>
                <th scope="col">Plan</th>
                <th scope="col">Students with cost</th>
                <th scope="col">AI cost (INR)</th>
              </tr>
            </thead>
            <tbody>
              {PLAN_ROWS.filter((p) => p.key !== "unknown" || data.byPlan.unknown.studentsWithCost > 0).map((p) => (
                <tr key={p.key}>
                  <td>{p.label}</td>
                  <td className="sa-num">{data.byPlan[p.key].studentsWithCost}</td>
                  <td className="sa-num">{formatCostInr(data.byPlan[p.key].costInr)}</td>
                </tr>
              ))}
              <tr>
                <td>Signed out</td>
                <td className="sa-num">—</td>
                <td className="sa-num" data-testid="ai-cost-signed-out">
                  {data.signedOut.ledgered ? "—" : "— (not recorded in the ledger)"}
                </td>
              </tr>
            </tbody>
          </table>
          <p className="sa-muted ac-small">Plan is the plan each student is on now; plan history is not stored.</p>
        </div>
        <div>
          <h3 className="ac-subtitle">Top 10 students by AI cost</h3>
          {data.top.length === 0 ? (
            <p className="sa-muted" data-testid="ai-cost-top-empty">
              No AI cost recorded in this window.
            </p>
          ) : (
            <ol className="ac-top" data-testid="ai-cost-top">
              {data.top.map((t) => (
                <li key={t.uid}>
                  <button type="button" className="sa-btn sa-btn-ghost ac-top-btn" onClick={() => onOpenStudent(t.uid)}>
                    <span className="sa-contact-text">{t.email ? maskEmail(t.email) : maskPhone(t.phone)}</span>
                    <span className="sa-muted"> · {planLabel(t.plan)}</span>
                    <span className="ac-top-cost"> {formatCostInr(t.costInr)}</span>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      <p className="sa-muted ac-small" data-testid="ai-cost-reads">
        Measured {data.studentsScanned} accounts; this summary read {data.reads.total} Firestore documents ({data.reads.subscriptions}{" "}
        plan records + {data.reads.ledgerDays} ledger days).
      </p>
      {data.window.capped && (
        <p className="sa-note sa-warn">“All time” is capped to the last {data.window.maxDays} days.</p>
      )}
      {data.limits.studentsTruncated && (
        <p className="sa-note sa-warn">Only the newest {data.limits.maxStudents} accounts were measured.</p>
      )}
      {data.limits.authTruncated && (
        <p className="sa-note sa-warn">Only the first {data.limits.authUsersScanned} accounts were listed.</p>
      )}
      {data.studentsUnknown > 0 && (
        <p className="sa-note sa-warn" data-testid="ai-cost-unknown">
          {data.studentsUnknown} {data.studentsUnknown === 1 ? "student's" : "students'"} ledger could not be read
          {data.readErrors.usageLedger ? ` (${data.readErrors.usageLedger})` : ""}; they are not in these numbers.
        </p>
      )}
    </>
  );
}
