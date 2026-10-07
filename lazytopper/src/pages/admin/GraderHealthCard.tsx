/**
 * GraderHealthCard — the read-only "Grader health" card on /admin/students (HARDEN-1 PR-2).
 *
 * ★ ADMIN-ONLY, READ-ONLY. Its one request is GET /api/admin/token-telemetry?view=grader-health,
 * behind the server's existing ADMIN_FIREBASE_UIDS gate (401/403 for anyone else). It has no
 * write action of any kind; its only button LOADS the card (the read scans stored grade records,
 * so it runs when asked, not on every visit to the page).
 *
 * ★ HONEST DATA. Every number is one the server read from a stored record or counter. When the
 * records could not be read, or none are stored for the window, the card says so — it never
 * shows an invented or estimated figure. Day boundaries are IST midnights, and the card says so.
 */
import { useState } from "react";
import { fetchAdmin, formatDayKey, formatIstDateTime, type Refusal } from "./studentsAdminModel";

export const GRADER_HEALTH_URL = "/api/admin/token-telemetry?view=grader-health";

export type NotCompletedReason = "timeout" | "unreadable" | "error" | "interrupted";

export interface GraderWindow {
  records: number;
  questions: number;
  gradesByModel: Record<string, number>;
  notCompleted: Record<NotCompletedReason, { count: number; charged: number }>;
  answerMismatches: number;
}

export interface GraderHealthResponse {
  ok: true;
  view: "grader-health";
  generatedAtMs: number;
  timeZone: string;
  todayKey: string;
  windowStartKey: string;
  windowDays: number;
  models: { configured: string; fallback: string };
  records:
    | { available: false }
    | {
        available: true;
        today: GraderWindow;
        last7Days: GraderWindow;
        oldestRecordMs: number | null;
        studentsInWindow: number;
        studentsScanned: number;
        studentsTruncated: boolean;
        studentsWithRecordsTruncated: number;
        perStudentLimit: number;
        readsFailed: number;
        authTruncated: boolean;
      };
  counters: { uptimeSeconds: number; gradingModelFallback: number; signInRefreshDenials: number };
}

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; data: GraderHealthResponse }
  | { status: "refused"; refusal: Refusal };

export const NOT_COMPLETED_LABELS: Record<NotCompletedReason, string> = {
  timeout: "Timed out",
  unreadable: "Couldn't read",
  error: "Error",
  interrupted: "Interrupted",
};
const REASONS: NotCompletedReason[] = ["timeout", "unreadable", "error", "interrupted"];

/** The model rows: configured first, then fallback, then any other label seen in the records. */
export function modelRows(data: GraderHealthResponse): { label: string; note: string; today: number; week: number }[] {
  if (!data.records.available) return [];
  const { today, last7Days } = data.records;
  const seen = new Set([...Object.keys(last7Days.gradesByModel), ...Object.keys(today.gradesByModel)]);
  const order = [data.models.configured, data.models.fallback, ...[...seen].sort()];
  const rows: { label: string; note: string; today: number; week: number }[] = [];
  const done = new Set<string>();
  for (const label of order) {
    if (done.has(label)) continue;
    done.add(label);
    const note =
      label === data.models.configured
        ? "configured grading model"
        : label === data.models.fallback
          ? "fallback"
          : label === "not-recorded"
            ? "model not recorded on the reply"
            : "";
    rows.push({ label, note, today: today.gradesByModel[label] || 0, week: last7Days.gradesByModel[label] || 0 });
  }
  return rows;
}

function uptimeText(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}

function Body({ data }: { data: GraderHealthResponse }) {
  const r = data.records;
  return (
    <>
      <p className="sa-muted gh-note">
        Day boundaries are IST (midnight Asia/Kolkata). Today = {formatDayKey(data.todayKey)}; 7 days ={" "}
        {formatDayKey(data.windowStartKey)} – {formatDayKey(data.todayKey)}. Loaded {formatIstDateTime(data.generatedAtMs)}.
      </p>
      {!r.available ? (
        <p className="sa-note sa-warn" data-testid="gh-records-unavailable">
          Grade records could not be read (no data). Nothing below is per day.
        </p>
      ) : r.last7Days.records === 0 ? (
        <p className="sa-empty" data-testid="gh-empty">
          No data yet: no grade records are stored for these 7 days.
        </p>
      ) : (
        <div className="sa-table-wrap">
          <table className="sa-table gh-table" data-testid="gh-table">
            <thead>
              <tr>
                <th scope="col">Grader</th>
                <th scope="col">Today</th>
                <th scope="col">7 days</th>
              </tr>
            </thead>
            <tbody>
              {modelRows(data).map((m) => (
                <tr key={m.label} data-testid={`gh-model-${m.label}`}>
                  <td data-label="Grader">
                    Grades by {m.label}
                    {m.note && <span className="sa-covered-note"> ({m.note})</span>}
                  </td>
                  <td data-label="Today">{m.today}</td>
                  <td data-label="7 days">{m.week}</td>
                </tr>
              ))}
              {REASONS.map((reason) => (
                <tr key={reason} data-testid={`gh-not-completed-${reason}`}>
                  <td data-label="Grader">
                    Not completed: {NOT_COMPLETED_LABELS[reason]}{" "}
                    <span className="gh-charged">charged: {r.last7Days.notCompleted[reason].charged}</span>
                  </td>
                  <td data-label="Today">{r.today.notCompleted[reason].count}</td>
                  <td data-label="7 days">{r.last7Days.notCompleted[reason].count}</td>
                </tr>
              ))}
              <tr data-testid="gh-mismatch">
                <td data-label="Grader">Answer–question mismatches</td>
                <td data-label="Today">{r.today.answerMismatches}</td>
                <td data-label="7 days">{r.last7Days.answerMismatches}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
      {r.available && (
        <p className="sa-muted gh-note">
          Counted from stored grade records ({r.last7Days.records} in 7 days, from {r.studentsScanned} students
          active in the window). Only a signed-in student&apos;s grade is stored (never the signed-out free
          check), only a reply that was sent (not a server error), and records expire after 24 h — older days
          count only the records still stored.
          {r.oldestRecordMs !== null && ` Oldest record read: ${formatIstDateTime(r.oldestRecordMs)}.`}
        </p>
      )}
      {r.available && (r.studentsTruncated || r.authTruncated || r.studentsWithRecordsTruncated > 0 || r.readsFailed > 0) && (
        <p className="sa-note sa-warn" data-testid="gh-limits">
          Undercount possible:
          {r.studentsTruncated && ` only ${r.studentsScanned} of ${r.studentsInWindow} active students were read;`}
          {r.authTruncated && " not every account was listed;"}
          {r.studentsWithRecordsTruncated > 0 &&
            ` ${r.studentsWithRecordsTruncated} students hit the ${r.perStudentLimit}-record limit;`}
          {r.readsFailed > 0 && ` ${r.readsFailed} students' records could not be read.`}
        </p>
      )}
      <div className="sa-cards gh-counters" data-testid="gh-counters">
        <div className="sa-card">
          <span className="sa-card-label">grading.model_fallback</span>
          <span className="sa-card-value">{data.counters.gradingModelFallback}</span>
          <span className="sa-card-note">grading calls served by the fallback model</span>
        </div>
        <div className="sa-card">
          <span className="sa-card-label">Sign-in refresh denials</span>
          <span className="sa-card-value">{data.counters.signInRefreshDenials}</span>
          <span className="sa-card-note">requests refused 401 for an expired or invalid sign-in token</span>
        </div>
      </div>
      <p className="sa-muted gh-note">
        These two are counters since the server last started ({uptimeText(data.counters.uptimeSeconds)} ago), not
        per day; a restart resets them to 0.
      </p>
    </>
  );
}

export default function GraderHealthCard({ getToken }: { getToken: () => Promise<string | null> }) {
  const [state, setState] = useState<State>({ status: "idle" });

  const load = () => {
    setState({ status: "loading" });
    void fetchAdmin<GraderHealthResponse>(GRADER_HEALTH_URL, getToken).then((r) => {
      setState(r.ok ? { status: "ok", data: r.data } : { status: "refused", refusal: r.refusal });
    });
  };

  return (
    <section className="gh-card" aria-labelledby="gh-title" data-testid="grader-health">
      <div className="gh-head">
        <h2 id="gh-title" className="gh-title">
          Grader health
        </h2>
        <button type="button" className="sa-btn" onClick={load} disabled={state.status === "loading"}>
          {state.status === "idle" ? "Load grader health" : "Refresh"}
        </button>
      </div>
      {state.status === "idle" && (
        <p className="sa-muted gh-note">Read-only. Loads on request (it reads the stored grade records).</p>
      )}
      {state.status === "loading" && <p className="sa-muted gh-note">Loading grader health…</p>}
      {state.status === "refused" && (
        <p className="sa-error" role="alert" data-testid="gh-refused">
          {state.refusal === "not-authorised"
            ? "Not authorised."
            : state.refusal === "unconfigured"
              ? "Admin access is not configured on the server (ADMIN_FIREBASE_UIDS)."
              : "Grader health could not be loaded."}
        </p>
      )}
      {state.status === "ok" && <Body data={state.data} />}
    </section>
  );
}
