/**
 * TrueAiCostCard — the read-only "True AI cost" card on /admin/students (COST-TRUTH-1).
 *
 * ★ ADMIN-ONLY, READ-ONLY. One request, GET /api/admin/ai-cost-daily, behind the server's
 * ADMIN_FIREBASE_UIDS gate. The button only LOADS the card.
 *
 * ★ HONEST DATA. The figures come from the global ledger, which counts EVERY Gemini call (any
 * user, signed-out, background, uncounted re-checks). A day with no ledger document is "not
 * recorded", never a zero. Failed calls Google may bill but returned no usage are shown as a
 * COUNT only — their cost is unknown and is not in the rupee figure. Day boundaries are IST.
 */
import { useState } from "react";
import { fetchAdmin, formatDayKey, formatIstDateTime, istDayKeyOf, type Refusal } from "./studentsAdminModel";

export const TRUE_AI_COST_URL = "/api/admin/ai-cost-daily?days=31";

export interface CostDay {
  day: string;
  recorded: boolean;
  calls?: number;
  costInr?: number;
  unknownUsageCalls?: number;
  byWorkload?: Record<string, { calls: number; costInr: number; unknownUsageCalls: number }>;
}

export interface TrueAiCostResponse {
  ok: true;
  generatedAtMs: number;
  todayKey: string;
  usdInr: number;
  usdInrIsDefault: boolean;
  days: CostDay[];
}

export interface CostWindow {
  recordedDays: number;
  calls: number;
  costInr: number;
  unknownUsageCalls: number;
  byWorkload: Record<string, { calls: number; costInr: number }>;
}

/** Sum the recorded days whose key passes `include`. */
export function sumWindow(days: CostDay[], include: (day: string) => boolean): CostWindow {
  const out: CostWindow = { recordedDays: 0, calls: 0, costInr: 0, unknownUsageCalls: 0, byWorkload: {} };
  for (const d of days) {
    if (!d.recorded || !include(d.day)) continue;
    out.recordedDays += 1;
    out.calls += d.calls || 0;
    out.costInr += d.costInr || 0;
    out.unknownUsageCalls += d.unknownUsageCalls || 0;
    for (const [work, w] of Object.entries(d.byWorkload || {})) {
      const row = out.byWorkload[work] || { calls: 0, costInr: 0 };
      row.calls += w.calls;
      row.costInr += w.costInr;
      out.byWorkload[work] = row;
    }
  }
  out.costInr = Math.round(out.costInr * 100) / 100;
  return out;
}

export function windowsFor(data: TrueAiCostResponse): { today: CostWindow; week: CostWindow; month: CostWindow } {
  // By CALENDAR date key, never by entry position: the 7-day window starts at the IST key of (today - 6 days).
  const todayMs = Date.parse(`${data.todayKey}T12:00:00.000+05:30`);
  const weekStart = istDayKeyOf(todayMs - 6 * 86400000);
  const monthPrefix = data.todayKey.slice(0, 7);
  return {
    today: sumWindow(data.days, (d) => d === data.todayKey),
    week: sumWindow(data.days, (d) => d >= weekStart && d <= data.todayKey),
    month: sumWindow(data.days, (d) => d.startsWith(monthPrefix)),
  };
}

const rupees = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function Body({ data }: { data: TrueAiCostResponse }) {
  const w = windowsFor(data);
  const rows: { key: string; label: string; win: CostWindow }[] = [
    { key: "today", label: "Today", win: w.today },
    { key: "week", label: "Last 7 days", win: w.week },
    { key: "month", label: "This month", win: w.month },
  ];
  const workloads = [...new Set(rows.flatMap((r) => Object.keys(r.win.byWorkload)))].sort(
    (a, b) => (w.month.byWorkload[b]?.costInr || 0) - (w.month.byWorkload[a]?.costInr || 0),
  );
  const none = !data.days.some((d) => d.recorded);
  return (
    <>
      <p className="sa-muted gh-note">
        Day boundaries are IST. Today = {formatDayKey(data.todayKey)}. Loaded {formatIstDateTime(data.generatedAtMs)}. USD→INR rate{" "}
        {data.usdInr}
        {data.usdInrIsDefault ? " (default; LT_USD_INR is not set)" : ""}.
      </p>
      {none ? (
        <p className="sa-empty" data-testid="tc-empty">
          No data yet: the ledger has no recorded day in this range.
        </p>
      ) : (
        <div className="sa-table-wrap">
          <table className="sa-table gh-table" data-testid="tc-table">
            <thead>
              <tr>
                <th scope="col">Workload</th>
                {rows.map((r) => (
                  <th key={r.key} scope="col">
                    {r.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr data-testid="tc-total">
                <td data-label="Workload">
                  <strong>True AI cost (all calls)</strong>
                </td>
                {rows.map((r) => (
                  <td key={r.key} data-label={r.label}>
                    {r.win.recordedDays === 0 ? (
                      <span className="sa-muted">No record yet</span>
                    ) : (
                      <>
                        <strong>{rupees(r.win.costInr)}</strong> <span className="sa-muted">({r.win.calls} calls)</span>
                      </>
                    )}
                  </td>
                ))}
              </tr>
              {workloads.map((work) => (
                <tr key={work} data-testid={`tc-work-${work}`}>
                  <td data-label="Workload">{work}</td>
                  {rows.map((r) => (
                    <td key={r.key} data-label={r.label}>
                      {rupees(r.win.byWorkload[work]?.costInr || 0)}{" "}
                      <span className="sa-muted">({r.win.byWorkload[work]?.calls || 0})</span>
                    </td>
                  ))}
                </tr>
              ))}
              <tr data-testid="tc-unknown">
                <td data-label="Workload">Failed calls with no usage (cost unknown, not in the rupees above)</td>
                {rows.map((r) => (
                  <td key={r.key} data-label={r.label}>
                    {r.win.unknownUsageCalls}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
      <p className="sa-muted gh-note">
        Counts every Gemini call at list prices, whoever made it (signed-out, background and uncounted re-checks
        included), so it will be higher than the per-student meter. The ledger starts the day this shipped; earlier
        days show no data. {w.month.recordedDays} of this month&apos;s days recorded.
      </p>
    </>
  );
}

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; data: TrueAiCostResponse }
  | { status: "refused"; refusal: Refusal };

export default function TrueAiCostCard({ getToken }: { getToken: () => Promise<string | null> }) {
  const [state, setState] = useState<State>({ status: "idle" });

  const load = () => {
    setState({ status: "loading" });
    void fetchAdmin<TrueAiCostResponse>(TRUE_AI_COST_URL, getToken).then((r) => {
      setState(r.ok ? { status: "ok", data: r.data } : { status: "refused", refusal: r.refusal });
    });
  };

  return (
    <section className="gh-card" aria-labelledby="tc-title" data-testid="true-ai-cost">
      <div className="gh-head">
        <h2 id="tc-title" className="gh-title">
          True AI cost
        </h2>
        <button type="button" className="sa-btn" onClick={load} disabled={state.status === "loading"}>
          {state.status === "idle" ? "Load true AI cost" : "Refresh"}
        </button>
      </div>
      {state.status === "idle" && <p className="sa-muted gh-note">Read-only. Loads on request.</p>}
      {state.status === "loading" && <p className="sa-muted gh-note">Loading true AI cost…</p>}
      {state.status === "refused" && (
        <p className="sa-error" role="alert" data-testid="tc-refused">
          {state.refusal === "not-authorised"
            ? "Not authorised."
            : state.refusal === "unconfigured"
              ? "Admin access is not configured on the server (ADMIN_FIREBASE_UIDS)."
              : "True AI cost could not be loaded."}
        </p>
      )}
      {state.status === "ok" && <Body data={state.data} />}
    </section>
  );
}
