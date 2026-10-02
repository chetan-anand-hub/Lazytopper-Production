/**
 * StudentsAdminPage — /admin/students (STUDENT-ACTIVITY-1 PR-2, spec S1–S3).
 *
 * The LazyTopper team's view of every signed-up student: newest sign-ups first, 50 per
 * page, with summary cards and a per-student timeline. READ-ONLY.
 *
 * ★ ADMIN-ONLY. The route sits behind RequireAuth (like /admin/question-reports), and
 * every byte of student data comes from the admin-gated `/api/admin/students*` API. A
 * signed-in student who opens this URL gets 403 from the server and sees "Not
 * authorised" — the page has nothing else to show them.
 *
 * ★ HONEST DATA. Activity (days active, last active, active students, returns) is
 * recorded only since STUDENT-ACTIVITY-1 PR-1 went live; every such number carries its
 * "since" date, and a student who signed up earlier shows "—", never 0.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import StudentDetailPanel from "./StudentDetailPanel";
import {
  coveredCount,
  fetchAdmin,
  formatDayKey,
  formatIstDateTime,
  listUrl,
  maskEmail,
  maskPhone,
  methodLabel,
  planLabel,
  PERIOD_OPTIONS,
  PLAN_OPTIONS,
  summaryUrl,
  type ListResponse,
  type Period,
  type PlanFilter,
  type Refusal,
  type StudentRow,
  type SummaryResponse,
} from "./studentsAdminModel";
import "./studentsAdmin.css";

type ListState =
  | { status: "loading" }
  | { status: "ok"; data: ListResponse }
  | { status: "refused"; refusal: Refusal };

type SummaryState = { status: "loading" } | { status: "ok"; data: SummaryResponse } | { status: "failed" };

function NotAuthorised() {
  return (
    <div className="sa-refusal" role="alert" data-testid="sa-not-authorised">
      <h1 className="sa-title">Not authorised</h1>
      <p className="sa-muted">This page is for the LazyTopper team only.</p>
    </div>
  );
}

function SummaryCards({ state, periodLabel }: { state: SummaryState; periodLabel: string }) {
  if (state.status === "loading") return <p className="sa-muted">Loading summary…</p>;
  if (state.status === "failed") return <p className="sa-note sa-warn">The summary could not be loaded.</p>;
  const s = state.data;
  const since = formatDayKey(s.activeStudents.since);
  const ratio = (r: { returned: number; eligible: number }) => (r.eligible === 0 ? "—" : `${r.returned} / ${r.eligible}`);
  return (
    <>
      <div className="sa-cards" data-testid="sa-summary">
        <div className="sa-card">
          <span className="sa-card-label">Sign-ups</span>
          <span className="sa-card-value">{s.signUps}</span>
          <span className="sa-card-note">{periodLabel}</span>
        </div>
        <div className="sa-card">
          <span className="sa-card-label">Active students</span>
          <span className="sa-card-value">{s.activeStudents.count}</span>
          <span className="sa-card-note">≥ 1 graded answer check recorded since {since}</span>
        </div>
        <div className="sa-card">
          <span className="sa-card-label">Returned on day 2</span>
          <span className="sa-card-value">{ratio(s.returnedDay2)}</span>
          <span className="sa-card-note">of students whose day 2 has ended and falls on or after {since}</span>
        </div>
        <div className="sa-card">
          <span className="sa-card-label">Returned within 7 days</span>
          <span className="sa-card-value">{ratio(s.returnedWithin7Days)}</span>
          <span className="sa-card-note">of students whose 7 days have ended and fall on or after {since}</span>
        </div>
        <div className="sa-card">
          <span className="sa-card-label">Trial starts</span>
          <span className="sa-card-value">{s.trialStarts.count}</span>
          <span className="sa-card-note">of these sign-ups, with a trial start on record</span>
        </div>
      </div>
      {s.limits.summaryTruncated && (
        <p className="sa-note sa-warn">
          Cards after sign-ups are measured on the newest {s.limits.maxSummaryStudents} of {s.signUps} sign-ups.
        </p>
      )}
    </>
  );
}

function Contact({ row, revealed, onToggle }: { row: StudentRow; revealed: boolean; onToggle: () => void }) {
  const full = row.email || row.phone;
  const masked = row.email ? maskEmail(row.email) : maskPhone(row.phone);
  return (
    <span className="sa-contact">
      <span className="sa-contact-text">{revealed ? full || "—" : masked}</span>
      {full && (
        <button
          type="button"
          className="sa-btn sa-btn-small"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          aria-label={revealed ? "Hide email" : "Reveal email"}
        >
          {revealed ? "Hide" : "Reveal"}
        </button>
      )}
    </span>
  );
}

function Covered({ count, coverage, since }: { count: number | null; coverage: "full" | "partial"; since?: string }) {
  const c = coveredCount(count, coverage, since);
  return (
    <span className="sa-covered" title={c.note || undefined}>
      {c.text}
      {c.note && <span className="sa-covered-note">{c.note}</span>}
    </span>
  );
}

export default function StudentsAdminPage() {
  const { getToken } = useAuth();
  const [period, setPeriod] = useState<Period>("all");
  const [plan, setPlan] = useState<PlanFilter>("all");
  const [page, setPage] = useState(1);
  const [list, setList] = useState<ListState>({ status: "loading" });
  const [summary, setSummary] = useState<SummaryState>({ status: "loading" });
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<string | null>(null);

  // The fetch effects must not re-run when the auth context hands out a new function
  // identity (that would refetch in a loop); read the latest getToken through a ref.
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;
  const stableGetToken = useCallback(() => getTokenRef.current(), []);

  useEffect(() => {
    let cancelled = false;
    setList({ status: "loading" });
    void fetchAdmin<ListResponse>(listUrl(period, plan, page), stableGetToken).then((r) => {
      if (cancelled) return;
      setList(r.ok ? { status: "ok", data: r.data } : { status: "refused", refusal: r.refusal });
    });
    return () => {
      cancelled = true;
    };
  }, [period, plan, page, stableGetToken]);

  useEffect(() => {
    let cancelled = false;
    setSummary({ status: "loading" });
    void fetchAdmin<SummaryResponse>(summaryUrl(period), stableGetToken).then((r) => {
      if (cancelled) return;
      setSummary(r.ok ? { status: "ok", data: r.data } : { status: "failed" });
    });
    return () => {
      cancelled = true;
    };
  }, [period, stableGetToken]);

  if (list.status === "refused" && list.refusal === "not-authorised") {
    return (
      <main className="sa-page">
        <NotAuthorised />
      </main>
    );
  }

  const periodLabel = PERIOD_OPTIONS.find((p) => p.value === period)?.label || "";

  return (
    <main className="sa-page">
      <header className="sa-header">
        <h1 className="sa-title">Students</h1>
        <p className="sa-muted">Every signed-up student, newest first. Read-only. Times are IST.</p>
      </header>

      {selected ? (
        <StudentDetailPanel uid={selected} getToken={stableGetToken} onBack={() => setSelected(null)} />
      ) : (
        <>
          <div className="sa-filters">
            <label className="sa-filter">
              <span>Signed up</span>
              <select
                value={period}
                onChange={(e) => {
                  setPeriod(e.target.value as Period);
                  setPage(1);
                }}
              >
                {PERIOD_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="sa-filter">
              <span>Plan</span>
              <select
                value={plan}
                onChange={(e) => {
                  setPlan(e.target.value as PlanFilter);
                  setPage(1);
                }}
              >
                {PLAN_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {list.status !== "refused" && <SummaryCards state={summary} periodLabel={periodLabel} />}

          {list.status === "loading" && <p className="sa-muted">Loading students…</p>}
          {list.status === "refused" && (
            <p className="sa-error" role="alert">
              {list.refusal === "unconfigured"
                ? "Admin access is not configured on the server (ADMIN_FIREBASE_UIDS)."
                : "Students could not be loaded."}
            </p>
          )}
          {list.status === "ok" && (
            <>
              <p className="sa-note">
                Days active and last active are recorded since {formatDayKey(list.data.sources.activityLog.since)}. Answer checks
                (graded Check &amp; Improve sessions) and tests taken (chapter tests + full mocks) are counted since{" "}
                {formatDayKey(list.data.sources.sessionRecords.since)}. “—” means not recorded, not zero.
              </p>
              {list.data.limits.authTruncated && (
                <p className="sa-note sa-warn">Only the first {list.data.limits.authUsersScanned} accounts were scanned.</p>
              )}
              {list.data.limits.planScanTruncated && (
                <p className="sa-note sa-warn">
                  The plan filter checked the newest {list.data.limits.maxPlanScan} sign-ups in this period.
                </p>
              )}
              {list.data.rows.length === 0 ? (
                <p className="sa-empty" data-testid="sa-empty">
                  No students match these filters.
                </p>
              ) : (
                <div className="sa-table-wrap">
                  <table className="sa-table">
                    <thead>
                      <tr>
                        <th scope="col">Signed up</th>
                        <th scope="col">Email</th>
                        <th scope="col">Method</th>
                        <th scope="col">Plan</th>
                        <th scope="col">Days active</th>
                        <th scope="col">Answer checks</th>
                        <th scope="col">Tests</th>
                        <th scope="col">Last active</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.data.rows.map((row) => (
                        <tr
                          key={row.uid}
                          className="sa-row"
                          tabIndex={0}
                          onClick={() => setSelected(row.uid)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") setSelected(row.uid);
                          }}
                          data-testid="sa-row"
                        >
                          <td data-label="Signed up">{formatIstDateTime(row.createdMs)}</td>
                          <td data-label="Email">
                            <Contact
                              row={row}
                              revealed={revealed[row.uid] === true}
                              onToggle={() => setRevealed((r) => ({ ...r, [row.uid]: !r[row.uid] }))}
                            />
                          </td>
                          <td data-label="Method">{methodLabel(row.signInMethods)}</td>
                          <td data-label="Plan">
                            <span className={`sa-plan sa-plan-${row.plan.kind}`}>{planLabel(row.plan)}</span>
                          </td>
                          <td data-label="Days active">
                            <Covered
                              count={row.activity.daysActive}
                              coverage={row.activity.coverage}
                              since={list.data.sources.activityLog.since}
                            />
                          </td>
                          <td data-label="Answer checks">
                            <Covered
                              count={row.answerChecks.count}
                              coverage={row.answerChecks.coverage}
                              since={list.data.sources.sessionRecords.since}
                            />
                          </td>
                          <td data-label="Tests">
                            <Covered
                              count={row.testsTaken.count}
                              coverage={row.testsTaken.coverage}
                              since={list.data.sources.sessionRecords.since}
                            />
                          </td>
                          <td data-label="Last active">
                            {row.activity.lastActiveMs === null && row.activity.coverage === "partial"
                              ? `— (no data before ${formatDayKey(list.data.sources.activityLog.since)})`
                              : formatIstDateTime(row.activity.lastActiveMs)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <nav className="sa-pager" aria-label="Pages">
                <button type="button" className="sa-btn" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  Previous
                </button>
                <span className="sa-muted">
                  Page {list.data.page} of {list.data.totalPages} · {list.data.total} students
                </span>
                <button
                  type="button"
                  className="sa-btn"
                  disabled={page >= list.data.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </nav>
            </>
          )}
        </>
      )}
    </main>
  );
}
