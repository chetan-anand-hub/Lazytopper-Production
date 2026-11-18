// src/components/testAnalysis/TestAnalysisPanel.tsx
//
// TS-ANALYSIS-1 — the after-test analysis under a Chapter Test / Full Mock result: re-attempt
// the lost-marks questions, time per question, the 3 weakest chapters, this week's plan and the
// mistake notebook. DISPLAY + ROUTING only (see testAnalysisModel.ts). Mounted at the END of the
// results body, so nothing above it moves when the history arrives (CLS 0).

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { WorksheetGradeResponse } from "../../ai/aiClient";
import { getAllSessionPerQuestionFromCloud, getSessionRecordsFromCloud } from "../../services/sessionRecords";
import {
  analyseHistory,
  analyseTest,
  buildRetryPlan,
  formatDuration,
  questionTimeRows,
  tsAnalysisDisabled,
  weakestChapters,
  takenSeriesMocks,
  weekPlan,
  type AnalysedQuestion,
  type AnalysisSurface,
  type DisplaySubject,
} from "./testAnalysisModel";
import { loadQuestionTimes } from "./questionTimes";
import MistakeNotebook, { formatMarks } from "./MistakeNotebook";
import { currentIstDate, seriesCalendarRows } from "./seriesCalendar";
import "./testAnalysis.css";

export interface TestAnalysisCurrent {
  worksheetId: string;
  title: string;
  /** null = nothing graded to analyse yet (the panel renders nothing). */
  response: WorksheetGradeResponse | null;
  questionIds: readonly string[];
  chapterTopicKey?: string | null;
}

export interface TestAnalysisPanelProps {
  surface: AnalysisSurface;
  subject: DisplaySubject;
  uid: string | null | undefined;
  current: TestAnalysisCurrent;
  secondsPerMark: number;
  returnTo: string;
}

const RETRY_ANCHOR = "lt-tsa-retry";

type HistoryState = { status: "idle" | "loading" | "ready" | "error"; rows: AnalysedQuestion[]; worksheetIds: string[] };

const EMPTY_RESPONSE: WorksheetGradeResponse = {
  ok: true,
  results: [],
  totalQuestions: 0,
  gradedCount: 0,
  pendingCount: 0,
  gradedMarksAwarded: 0,
  gradedMarksTotal: 0,
  worksheetTotalMarks: 0,
};

export default function TestAnalysisPanel(props: TestAnalysisPanelProps) {
  if (!props.current.response || !Array.isArray(props.current.response.results)) return null;
  return <TestAnalysisPanelBody {...props} />;
}

function TestAnalysisPanelBody(props: TestAnalysisPanelProps) {
  const { surface, subject, uid, secondsPerMark, returnTo } = props;
  const current = { ...props.current, response: props.current.response ?? EMPTY_RESPONSE };
  const disabled = tsAnalysisDisabled(import.meta.env.VITE_TS_ANALYSIS_DISABLED);

  const currentRows = useMemo(
    () =>
      analyseTest({
        worksheetId: current.worksheetId,
        title: current.title,
        surface,
        subject,
        gradedAt: Number.MAX_SAFE_INTEGER, // the test on screen is always the newest
        response: current.response,
        questionIds: current.questionIds,
        chapterTopicKey: current.chapterTopicKey ?? null,
      }),
    [current, surface, subject],
  );
  const retry = useMemo(() => buildRetryPlan(currentRows, returnTo), [currentRows, returnTo]);

  const times = useMemo(() => loadQuestionTimes(current.worksheetId), [current.worksheetId]);
  const timeRows = useMemo(
    () =>
      questionTimeRows(
        current.response.results.map((r) => ({ qNumber: r.qNumber, marks: Number(r.totalMarks) || 0 })),
        times,
        secondsPerMark,
      ),
    [current.response, times, secondsPerMark],
  );
  const measured = timeRows.some((r) => r.ms !== null);
  const overCount = timeRows.filter((r) => r.over).length;

  const [history, setHistory] = useState<HistoryState>({ status: "idle", rows: [], worksheetIds: [] });
  useEffect(() => {
    if (disabled || !uid) return;
    let live = true;
    setHistory({ status: "loading", rows: [], worksheetIds: [] });
    Promise.all([getSessionRecordsFromCloud(uid), getAllSessionPerQuestionFromCloud(uid)])
      .then(([records, payloads]) => {
        if (live)
          setHistory({
            status: "ready",
            rows: analyseHistory(records, payloads, current.worksheetId),
            worksheetIds: records.map((r) => String(r.worksheetId ?? "")),
          });
      })
      .catch(() => {
        if (live) setHistory({ status: "error", rows: [], worksheetIds: [] });
      });
    return () => {
      live = false;
    };
  }, [uid, current.worksheetId, disabled]);

  const allRows = useMemo(() => [...currentRows, ...history.rows], [currentRows, history.rows]);
  const weakest = useMemo(() => (history.status === "ready" ? weakestChapters(allRows) : []), [allRows, history.status]);
  const plan = useMemo(
    () =>
      history.status === "ready"
        ? weekPlan({
            retry: retry.groups.length ? { count: retry.groups.reduce((n, g) => n + g.ids.length, 0), testTitle: current.title } : null,
            weakest,
            subject,
            calendar: {
              rows: seriesCalendarRows(),
              todayIso: currentIstDate(),
              takenMocks: takenSeriesMocks([...history.worksheetIds, current.worksheetId]),
            },
          })
        : [],
    [history.status, history.worksheetIds, retry, weakest, subject, current.title, current.worksheetId],
  );

  if (disabled) return null;

  const scrollToRetry = () => document.getElementById(RETRY_ANCHOR)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <section className="lt-tsa" aria-label="Test analysis">
      {/* 1 — re-attempt the lost-marks questions */}
      <div className="lt-tsa__card" id={RETRY_ANCHOR}>
        <h2 className="lt-tsa__h">Fix what cost you marks</h2>
        {retry.missedCount === 0 ? (
          <p className="lt-tsa__p">No marks lost on the questions graded so far. Nothing to re-attempt.</p>
        ) : (
          <>
            <p className="lt-tsa__p">
              You lost marks on <b>{retry.missedCount}</b> graded question{retry.missedCount === 1 ? "" : "s"}. Re-attempt exactly
              those — objective ones are marked the moment you answer.
            </p>
            <div className="lt-tsa__btns">
              {retry.groups.map((g) => (
                <Link key={`${g.subject}-${g.chapter}`} className="lt-ct__btn lt-ct__btn--primary lt-ct__btn--sm lt-tsa__btn" to={g.to}>
                  {retry.groups.length === 1
                    ? `Re-attempt my wrong questions (${g.ids.length})`
                    : `${g.label}: re-attempt ${g.ids.length}`}
                </Link>
              ))}
            </div>
            {retry.unroutable > 0 && (
              <p className="lt-tsa__note">
                {retry.unroutable} question{retry.unroutable === 1 ? "" : "s"} could not be reopened as practice (not in the question bank).
              </p>
            )}
          </>
        )}
      </div>

      {/* 2 — time per question */}
      <div className="lt-tsa__card">
        <h2 className="lt-tsa__h">Time on each question</h2>
        {!measured ? (
          <p className="lt-tsa__p">Time per question was not measured for this test (sat on paper or on another device).</p>
        ) : (
          <>
            <p className="lt-tsa__p">
              Budget: {formatDuration(secondsPerMark * 1000)} min per mark.{" "}
              {overCount > 0 ? (
                <>
                  <b>{overCount}</b> question{overCount === 1 ? "" : "s"} went over.
                </>
              ) : (
                "Every measured question was within budget."
              )}
            </p>
            <table className="lt-tsa__tbl">
              <thead>
                <tr>
                  <th className="lt-tsa__c lt-tsa__c--l">Q</th>
                  <th className="lt-tsa__c">Marks</th>
                  <th className="lt-tsa__c">Time</th>
                  <th className="lt-tsa__c">Budget</th>
                </tr>
              </thead>
              <tbody>
                {timeRows.map((r) => (
                  <tr key={r.qNumber} className={r.over ? "lt-tsa__r--over" : undefined}>
                    <td className="lt-tsa__c lt-tsa__c--l">Q{r.qNumber}</td>
                    <td className="lt-tsa__c">{r.marks}</td>
                    <td className="lt-tsa__c">
                      {formatDuration(r.ms)}
                      {r.over && <span className="lt-tsa__flag">Over time</span>}
                    </td>
                    <td className="lt-tsa__c">{formatDuration(r.budgetMs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="lt-tsa__note">Time on screen on this device. “—” means it was not measured.</p>
          </>
        )}
      </div>

      {/* 3 + 5 — weakest chapters and this week's plan (from the student's own history) */}
      <div className="lt-tsa__card">
        <h2 className="lt-tsa__h">Your 3 weakest chapters</h2>
        {!uid ? (
          <p className="lt-tsa__p">Sign in to see your weakest chapters across all your tests.</p>
        ) : history.status === "loading" || history.status === "idle" ? (
          <p className="lt-tsa__p">Reading your tests…</p>
        ) : history.status === "error" ? (
          <p className="lt-tsa__p">Your past tests could not be read right now. Try again later.</p>
        ) : weakest.length === 0 ? (
          <p className="lt-tsa__p">Not enough graded chapter tests and full mocks yet to name a weak chapter. Take a few more and this fills in.</p>
        ) : (
          <ol className="lt-tsa__list">
            {weakest.map((w) => (
              <li key={`${w.subject}-${w.chapter}`} className="lt-tsa__row">
                <span className="lt-tsa__rowt">
                  <b>{w.label}</b>
                  <span className="lt-tsa__muted">
                    {" "}
                    · {w.subject} · {w.pct}% ({formatMarks(w.awarded)}/{formatMarks(w.total)})
                  </span>
                </span>
                <Link className="lt-ct__btn lt-ct__btn--ghost lt-ct__btn--sm" to={w.practiseTo}>
                  Practise this chapter
                </Link>
              </li>
            ))}
          </ol>
        )}

        {plan.length > 0 && (
          <>
            <h3 className="lt-tsa__h lt-tsa__h--sub">This week’s plan</h3>
            <ol className="lt-tsa__list">
              {plan.map((t) => (
                <li key={t.key} className="lt-tsa__row">
                  <span className="lt-tsa__rowt">{t.text}</span>
                  {t.to ? (
                    <Link className="lt-ct__btn lt-ct__btn--ghost lt-ct__btn--sm" to={t.to}>
                      Start
                    </Link>
                  ) : (
                    <button type="button" className="lt-ct__btn lt-ct__btn--ghost lt-ct__btn--sm" onClick={scrollToRetry}>
                      Start
                    </button>
                  )}
                </li>
              ))}
            </ol>
          </>
        )}
      </div>

      {/* 4 — mistake notebook */}
      {uid && history.status === "ready" && (
        <div className="lt-tsa__card">
          <MistakeNotebook rows={allRows} returnTo={returnTo} />
        </div>
      )}
    </section>
  );
}
