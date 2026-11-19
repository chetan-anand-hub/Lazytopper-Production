// src/components/testAnalysis/MistakeNotebook.tsx
//
// TS-ANALYSIS-1 (feature 4) — every lost-marks question across the student's graded chapter tests
// and full mocks, filterable by subject / chapter, each with "Practise again" (an exact one-question
// Quick Practice set). Rendered by the results panel and by the /test-series notebook section.

import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { tagWhenSeriesPaper } from "../../lib/testSeries/seriesNav";
import {
  missLabel,
  notebookChapters,
  notebookEntries,
  retryPracticePath,
  type AnalysedQuestion,
  type DisplaySubject,
} from "./testAnalysisModel";
import "./testAnalysis.css";

const NOTEBOOK_PAGE = 20;

export function formatMarks(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export default function MistakeNotebook({
  rows,
  returnTo,
  startOpen = false,
}: {
  rows: readonly AnalysedQuestion[];
  returnTo: string;
  startOpen?: boolean;
}) {
  const loc = useLocation(); // TS-NAV-1: on a series paper the retry link also carries `from=test-series`
  const [open, setOpen] = useState(startOpen);
  const [subject, setSubject] = useState<DisplaySubject | "all">("all");
  const [chapter, setChapter] = useState<string>("all");
  const [shown, setShown] = useState(NOTEBOOK_PAGE);
  const chapters = useMemo(() => notebookChapters(rows, subject), [rows, subject]);
  const list = useMemo(() => notebookEntries(rows, { subject, chapter }), [rows, subject, chapter]);
  const total = useMemo(() => notebookEntries(rows, { subject: "all", chapter: "all" }).length, [rows]);

  return (
    <>
      <h2 className="lt-tsa__h">Mistake notebook</h2>
      {total === 0 ? (
        <p className="lt-tsa__p">No lost-marks questions in your chapter tests and full mocks yet.</p>
      ) : !open ? (
        <button type="button" className="lt-ct__btn lt-ct__btn--ghost lt-ct__btn--sm lt-tsa__plainbtn" onClick={() => setOpen(true)}>
          Open my mistake notebook ({total})
        </button>
      ) : (
        <>
          <div className="lt-tsa__filters">
            <label className="lt-tsa__lbl">
              Subject
              <select
                className="lt-tsa__sel"
                value={subject}
                onChange={(e) => {
                  setSubject(e.target.value as DisplaySubject | "all");
                  setChapter("all");
                  setShown(NOTEBOOK_PAGE);
                }}
              >
                <option value="all">All</option>
                <option value="Maths">Maths</option>
                <option value="Science">Science</option>
              </select>
            </label>
            <label className="lt-tsa__lbl">
              Chapter
              <select
                className="lt-tsa__sel"
                value={chapter}
                onChange={(e) => {
                  setChapter(e.target.value);
                  setShown(NOTEBOOK_PAGE);
                }}
              >
                <option value="all">All chapters</option>
                {chapters.map((c) => (
                  <option key={c.chapter} value={c.chapter}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {list.length === 0 ? (
            <p className="lt-tsa__p">Nothing here for this filter.</p>
          ) : (
            <ul className="lt-tsa__list">
              {list.slice(0, shown).map((r) => (
                <li key={`${r.worksheetId}-${r.qNumber}`} className="lt-tsa__row">
                  <span className="lt-tsa__rowt">
                    <b>
                      Q{r.qNumber} · {r.testTitle}
                    </b>
                    <span className="lt-tsa__muted">
                      {" "}
                      · {r.chapterLabel ?? "Chapter not known"}
                      {r.subtopic ? ` · ${r.subtopic}` : ""} · {formatMarks(r.awarded)}/{formatMarks(r.total)} ·{" "}
                      {r.miss ? missLabel(r.miss) : ""}
                    </span>
                  </span>
                  {r.id && r.chapter ? (
                    <Link
                      className="lt-ct__btn lt-ct__btn--ghost lt-ct__btn--sm"
                      to={tagWhenSeriesPaper(retryPracticePath({ subject: r.subject, chapter: r.chapter, ids: [r.id], returnTo }), loc.pathname, loc.search)}
                    >
                      Practise again
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          {list.length > shown && (
            <button type="button" className="lt-ct__btn lt-ct__btn--ghost lt-ct__btn--sm lt-tsa__plainbtn" onClick={() => setShown((n) => n + NOTEBOOK_PAGE)}>
              Show more ({list.length - shown})
            </button>
          )}
        </>
      )}
    </>
  );
}
