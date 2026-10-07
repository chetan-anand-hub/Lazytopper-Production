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
  formatInr,
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
  type ActivityFeedItem,
  type TimelineDay,
} from "./studentsAdminModel";
import { feedItemLabel, orderedFeed, pageRows } from "./activityDetailModel";

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

/** "—" for a day recorded before pages/feed existed: honest "not recorded", never "none". */
function NotRecorded() {
  return <span className="sa-muted">— (not recorded)</span>;
}

/** ACTIVITY-DETAIL-1 F3 — page, visits; most visits first. */
function PagesVisited({ pages }: { pages: Record<string, number> | null | undefined }) {
  if (!pages) return <NotRecorded />;
  const rows = pageRows(pages);
  if (rows.length === 0) return <span className="sa-muted">none</span>;
  return (
    <table className="sa-pages" data-testid="sa-pages">
      <thead>
        <tr>
          <th scope="col">Page</th>
          <th scope="col">Visits</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.key}>
            <td>{r.label}</td>
            <td className="sa-num">{r.visits}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** ACTIVITY-DETAIL-1 F3 — the day's feed in time order, IST clock times, plain words. */
function ActivityFeed({ feed, truncated }: { feed: ActivityFeedItem[] | null | undefined; truncated: boolean }) {
  if (!feed) return <NotRecorded />;
  if (feed.length === 0) return <span className="sa-muted">none</span>;
  return (
    <>
      <ol className="sa-feed" data-testid="sa-feed">
        {orderedFeed(feed).map((item, i) => (
          <li key={i} className="sa-feed-item">
            <span className="sa-feed-time">{formatIstTime(item.t)}</span>
            <span>{feedItemLabel(item)}</span>
          </li>
        ))}
      </ol>
      {truncated && (
        <p className="sa-muted sa-feed-note">
          Only the first {feed.length} entries of this day are listed; the counts above are complete.
        </p>
      )}
    </>
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
            <div className="sa-day-row">
              <dt>Pages visited</dt>
              <dd>
                <PagesVisited pages={day.activity.pages} />
              </dd>
            </div>
            <div className="sa-day-row">
              <dt>Activity</dt>
              <dd>
                <ActivityFeed feed={day.activity.feed} truncated={day.activity.feedTruncated === true} />
              </dd>
            </div>
          </>
        )}
        {day.ai && (
          <div className="sa-day-row">
            <dt>AI usage</dt>
            <dd>
              {day.ai.calls} AI {day.ai.calls === 1 ? "call" : "calls"}
              {/* HARDEN-1 PR-2: two separate, labelled numbers — never one copied into the other. */}
              <span className="sa-spend" data-testid="sa-usage-meter">
                {" · "}usage meter (graded) {formatInr(day.ai.costInr)}
              </span>
              <span className="sa-spend" data-testid="sa-actual-spend">
                {" · "}actual AI spend {formatInr(day.ai.providerSpendInr)}
              </span>
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
            {/* GA-33 (SCORECARD-MI-1) — says exactly what is counted: every graded-answer
                record from EVERY surface (practice, worksheets, tests, C&I), one per answer;
                a re-grade with a different score is a second record until the attempt key
                changes (held for an owner ruling). */}
            <dt>Graded answers</dt>
            <dd>
              {day.practice.attempts} graded {day.practice.attempts === 1 ? "answer" : "answers"} (all surfaces) ·{" "}
              {day.practice.marksScored}/{day.practice.marksAvailable} marks · {day.practice.correct} full marks
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
            plan changes show only the dates the stored plan record keeps. Days with nothing recorded are not shown. Pages
            visited and the activity feed began later than sections; a day from before then shows &ldquo;— (not recorded)&rdquo;.
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
