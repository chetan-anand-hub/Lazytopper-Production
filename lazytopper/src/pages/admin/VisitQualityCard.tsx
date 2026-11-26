/**
 * VisitQualityCard - QUICK-LEAVE-1 (owner YES 26 Nov 2026). The real bounce number on /admin/students: visits that left WITHOUT
 * engaging (engaged = 10 s visible, or a first tap / key / 200 px scroll), by source x landing page. Target: under 30%.
 * Counts only, read-only, loads on request. Rows above 30% are highlighted. The server answers 404-free: the card shows an
 * honest empty state when nothing has been recorded yet (the kill switch VISIT_METRICS_DISABLED stops new counts).
 */
import { useCallback, useState } from "react";
import { fetchAdmin } from "./studentsAdminModel";

export const VISIT_QUALITY_URL = "/api/admin/visit-quality";
export const QUICK_LEAVE_TARGET_PCT = 30;

export interface VisitQualityRow {
  source: string;
  path: string;
  visits: number;
  quickLeaves: number;
  quickLeavePct: number | null;
  inAppVisits: number;
  inAppQuickLeaves: number;
  inAppQuickLeavePct: number | null;
}
export interface VisitQualityResponse {
  ok: true;
  days: number;
  from: string;
  to: string;
  rows: VisitQualityRow[];
  totals: { visits: number; quickLeaves: number; quickLeavePct: number | null };
  bySource: Array<{ source: string; visits: number; quickLeaves: number; quickLeavePct: number | null }>;
}

type State = { status: "idle" } | { status: "loading" } | { status: "ok"; data: VisitQualityResponse } | { status: "failed" };

export function visitQualityUrl(days: 1 | 7 | 30): string {
  return `${VISIT_QUALITY_URL}?days=${days}`;
}
export function isOverTarget(pct: number | null): boolean {
  return typeof pct === "number" && pct > QUICK_LEAVE_TARGET_PCT;
}
export function pctText(pct: number | null): string {
  return typeof pct === "number" ? `${pct.toFixed(1)}%` : "—";
}
const SOURCE_LABEL: Record<string, string> = {
  google_ads: "Google Ads",
  google_organic: "Google organic",
  meta: "Facebook / Instagram",
  youtube: "YouTube",
  llm: "ChatGPT / AI assistants",
  direct: "Direct",
  other: "Other",
};
export function sourceLabel(s: string): string {
  return SOURCE_LABEL[s] || s;
}

export default function VisitQualityCard({ getToken }: { getToken: () => Promise<string | null> }) {
  const [days, setDays] = useState<1 | 7 | 30>(7);
  const [state, setState] = useState<State>({ status: "idle" });

  const load = useCallback(
    (d: 1 | 7 | 30) => {
      setDays(d);
      setState({ status: "loading" });
      void fetchAdmin<VisitQualityResponse>(visitQualityUrl(d), getToken).then((r) => {
        if (r.ok && r.data && Array.isArray(r.data.rows)) setState({ status: "ok", data: r.data });
        else setState({ status: "failed" });
      });
    },
    [getToken],
  );

  return (
    <section className="gh-card" aria-labelledby="vq-title" data-testid="visit-quality">
      <h2 id="vq-title" className="gh-title">
        Quick-leave rate (visits that left without engaging)
      </h2>
      <p className="sa-muted gh-note">
        A visit is the first page load of a browser tab. Engaged means 10 seconds on the page, or a first tap, key press or scroll.
        Target: under {QUICK_LEAVE_TARGET_PCT}%. Counts only, no visitor is identified. Times are IST days.
      </p>
      <div className="sa-filters">
        {([1, 7, 30] as const).map((d) => (
          <button key={d} type="button" className="sa-btn sa-btn-small" data-testid={`vq-${d}d`} disabled={state.status === "loading"} onClick={() => load(d)}>
            {d === 1 ? "Today" : `Last ${d} days`}
          </button>
        ))}
      </div>
      {state.status === "loading" && <p className="sa-muted">Loading…</p>}
      {state.status === "failed" && (
        <p className="sa-note sa-warn" role="alert" data-testid="vq-failed">
          The visit numbers could not be loaded.{" "}
          <button type="button" className="sa-btn sa-btn-small" onClick={() => load(days)}>
            Try again
          </button>
        </p>
      )}
      {state.status === "ok" &&
        (state.data.rows.length === 0 ? (
          <p className="sa-empty" data-testid="vq-empty">
            No visits recorded in this window yet.
          </p>
        ) : (
          <>
            <p data-testid="vq-total" className={isOverTarget(state.data.totals.quickLeavePct) ? "sa-warn" : undefined}>
              All visits: {state.data.totals.visits} · left without engaging: {state.data.totals.quickLeaves} ({pctText(state.data.totals.quickLeavePct)})
            </p>
            <div className="sa-table-wrap">
              <table className="sa-table" data-testid="vq-sources">
                <thead>
                  <tr>
                    <th>Source</th>
                    <th>Visits</th>
                    <th>Quick-leave</th>
                  </tr>
                </thead>
                <tbody>
                  {state.data.bySource.map((s) => (
                    <tr key={s.source} className={isOverTarget(s.quickLeavePct) ? "sa-warn" : undefined}>
                      <td>{sourceLabel(s.source)}</td>
                      <td>{s.visits}</td>
                      <td>{pctText(s.quickLeavePct)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="sa-table-wrap">
              <table className="sa-table" data-testid="vq-table">
                <thead>
                  <tr>
                    <th>Source</th>
                    <th>Landing page</th>
                    <th>Visits</th>
                    <th>Quick-leave</th>
                    <th>In-app (FB/IG) visits</th>
                    <th>In-app quick-leave</th>
                  </tr>
                </thead>
                <tbody>
                  {state.data.rows.map((r) => (
                    <tr key={`${r.source}|${r.path}`} data-over={isOverTarget(r.quickLeavePct) ? "1" : "0"} className={isOverTarget(r.quickLeavePct) ? "sa-warn" : undefined}>
                      <td>{sourceLabel(r.source)}</td>
                      <td>{r.path}</td>
                      <td>{r.visits}</td>
                      <td>{pctText(r.quickLeavePct)}</td>
                      <td>{r.inAppVisits}</td>
                      <td>{pctText(r.inAppQuickLeavePct)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ))}
    </section>
  );
}
