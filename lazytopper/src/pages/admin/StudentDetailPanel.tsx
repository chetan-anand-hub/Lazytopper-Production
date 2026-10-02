/**
 * StudentDetailPanel — one student's day-by-day timeline on the admin "Students" page
 * (STUDENT-ACTIVITY-1 PR-2, spec S3). Names and counts only: the API never returns a
 * question, an answer, a title or free text, and this panel renders nothing but the
 * fields it is given.
 */
import { useEffect, useState } from "react";
import {
  detailUrl,
  fetchAdmin,
  formatDayKey,
  formatIstDateTime,
  formatIstTime,
  maskEmail,
  maskPhone,
  methodLabel,
  planEventLabel,
  planLabel,
  surfaceLabel,
  type DetailResponse,
  type Refusal,
  type TimelineDay,
} from "./studentsAdminModel";

type State =
  | { status: "loading" }
  | { status: "ok"; data: DetailResponse }
  | { status: "refused"; refusal: Refusal; httpStatus: number | null };

function Counts({ counts }: { counts: Record<string, number> }) {
  const entries = Object.entries(counts).filter(([, n]) => n > 0);
  if (entries.length === 0) return <span className="sa-muted">none</span>;
  return (
    <span className="sa-chips">
      {entries.map(([name, n]) => (
        <span key={name} className="sa-chip">
          {name} ×{n}
        </span>
      ))}
    </span>
  );
}

function DayCard({ day }: { day: TimelineDay }) {
  return (
    <li className="sa-day" data-testid={`sa-day-${day.day}`}>
      <div className="sa-day-head">
        <span className="sa-day-num">{day.dayNumber === null ? "Day" : `Day ${day.dayNumber}`}</span>
        <span className="sa-day-date">{formatDayKey(day.day)}</span>
      </div>
      <dl className="sa-day-rows">
        {day.plan.length > 0 && (
          <div className="sa-day-row">
            <dt>Plan</dt>
            <dd>
              {day.plan.map((ev, i) => (
                <span key={`${ev.kind}-${i}`} className="sa-event">
                  {planEventLabel(ev)} <span className="sa-muted">{formatIstTime(ev.atMs)}</span>
                </span>
              ))}
            </dd>
          </div>
        )}
        {day.activity && (
          <>
            <div className="sa-day-row">
              <dt>Sections used</dt>
              <dd>
                <Counts counts={day.activity.sections} />
                <span className="sa-muted sa-span">
                  {formatIstTime(day.activity.firstSeenMs)} – {formatIstTime(day.activity.lastSeenMs)}
                </span>
              </dd>
            </div>
            <div className="sa-day-row">
              <dt>Actions</dt>
              <dd>
                <Counts counts={day.activity.events} />
              </dd>
            </div>
          </>
        )}
        {day.ai && (
          <div className="sa-day-row">
            <dt>AI usage</dt>
            <dd>
              {day.ai.calls} AI {day.ai.calls === 1 ? "call" : "calls"} · ₹{day.ai.costInr.toFixed(2)}
              {day.ai.checks + day.ai.chapterTests + day.ai.mocks + day.ai.worksheets > 0 && (
                <span className="sa-muted sa-span">
                  trial use: {day.ai.checks} checks, {day.ai.chapterTests} chapter tests, {day.ai.mocks} mocks,{" "}
                  {day.ai.worksheets} worksheets
                </span>
              )}
            </dd>
          </div>
        )}
        {day.sessions.length > 0 && (
          <div className="sa-day-row">
            <dt>Sessions</dt>
            <dd>
              {day.sessions.map((s, i) => (
                <span key={i} className="sa-event">
                  {surfaceLabel(s.surface)}
                  {s.subject ? ` · ${s.subject}` : ""}
                  {s.marksAwarded !== null && s.marksTotal !== null ? ` · ${s.marksAwarded}/${s.marksTotal}` : ""}
                  {s.status && s.status !== "graded" ? ` · ${s.status}` : ""}
                  {s.topics.length > 0 && <span className="sa-muted"> ({s.topics.join(", ")})</span>}
                </span>
              ))}
            </dd>
          </div>
        )}
        {day.practice && (
          <div className="sa-day-row">
            <dt>Practice</dt>
            <dd>
              {day.practice.attempts} {day.practice.attempts === 1 ? "question" : "questions"} ·{" "}
              {day.practice.marksScored}/{day.practice.marksAvailable} marks · {day.practice.correct} fully correct
            </dd>
          </div>
        )}
        {day.mocks.length > 0 && (
          <div className="sa-day-row">
            <dt>Mock scores</dt>
            <dd>
              {day.mocks.map((m, i) => (
                <span key={i} className="sa-event">
                  {m.subject || "Mock"} {m.totalMarks}/{m.maxMarks}
                  {m.percent !== null ? ` (${Math.round(m.percent)}%)` : ""}
                </span>
              ))}
            </dd>
          </div>
        )}
      </dl>
    </li>
  );
}

export default function StudentDetailPanel({
  uid,
  getToken,
  onBack,
}: {
  uid: string;
  getToken: () => Promise<string | null>;
  onBack: () => void;
}) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    setRevealed(false);
    void fetchAdmin<DetailResponse>(detailUrl(uid), getToken).then((r) => {
      if (cancelled) return;
      setState(r.ok ? { status: "ok", data: r.data } : { status: "refused", refusal: r.refusal, httpStatus: r.status });
    });
    return () => {
      cancelled = true;
    };
  }, [uid, getToken]);

  return (
    <section className="sa-detail" aria-label="Student detail">
      <button type="button" className="sa-btn sa-btn-ghost" onClick={onBack}>
        ← All students
      </button>
      {state.status === "loading" && <p className="sa-muted">Loading timeline…</p>}
      {state.status === "refused" && (
        <p className="sa-error" role="alert">
          {state.refusal === "not-authorised"
            ? "Not authorised."
            : state.httpStatus === 404
              ? "This student no longer exists."
              : "The timeline could not be loaded."}
        </p>
      )}
      {state.status === "ok" && (
        <>
          <header className="sa-detail-head">
            <h2 className="sa-detail-title">
              {revealed ? state.data.student.email || state.data.student.phone || "—" : state.data.student.email ? maskEmail(state.data.student.email) : maskPhone(state.data.student.phone)}
            </h2>
            <button type="button" className="sa-btn sa-btn-small" onClick={() => setRevealed((v) => !v)}>
              {revealed ? "Hide" : "Reveal"}
            </button>
          </header>
          <dl className="sa-facts">
            <div>
              <dt>Signed up</dt>
              <dd>{formatIstDateTime(state.data.student.createdMs)}</dd>
            </div>
            <div>
              <dt>Sign-in method</dt>
              <dd>{methodLabel(state.data.student.signInMethods)}</dd>
            </div>
            <div>
              <dt>Plan now</dt>
              <dd>{planLabel(state.data.student.plan)}</dd>
            </div>
            <div>
              <dt>Last sign-in</dt>
              <dd>{formatIstDateTime(state.data.student.lastSignInMs)}</dd>
            </div>
          </dl>
          <p className="sa-note">
            Sections and actions are recorded since {formatDayKey(state.data.sources.activityLog.since)}; AI usage since{" "}
            {formatDayKey(state.data.sources.usageLedger.since)}; sessions since {formatDayKey(state.data.sources.sessionRecords.since)};
            practice and mock scores since {formatDayKey(state.data.sources.practiceAttempts.since)}. Plan history is not stored, so
            plan changes show only the dates the stored plan record keeps. Days with nothing recorded are not shown.
          </p>
          {Object.entries(state.data.reads)
            .filter(([, v]) => v !== "complete")
            .map(([k, v]) => (
              <p key={k} className="sa-note sa-warn">
                {k}: {v === "truncated" ? "only the most recent entries are shown" : "could not be read"}
              </p>
            ))}
          {state.data.timeline.length === 0 ? (
            <p className="sa-empty">Nothing recorded for this student yet.</p>
          ) : (
            <ol className="sa-timeline">
              {state.data.timeline.map((d) => (
                <DayCard key={d.day} day={d} />
              ))}
            </ol>
          )}
        </>
      )}
    </section>
  );
}
