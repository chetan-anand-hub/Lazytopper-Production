import type { CanonicalQuestion } from "../../data/predictionTypes";
import { MathText } from "../question/MathText";
import "../question/katexEager";
import { cbqFormatLabel } from "./cbqSeo";
import type { CbqSamplesState } from "./useCbqSamples";

/**
 * CBQ-SEO-1 — the sample questions of a chapter page: the stem, the options of an objective question,
 * and the STORED step-wise solution (each step keeps its `[N mark]` prefix exactly as stored) inside a
 * native <details>, so the solution is in the page's HTML for a crawler and needs no script to open.
 */
function Sample({ q, index }: { q: CanonicalQuestion; index: number }) {
  const steps = (q.solutionSteps ?? []).filter(Boolean);
  const marks = Number(q.marks) || 0;
  return (
    <li className="lt-cbqs__q" data-testid={`cbq-sample-${q.id}`}>
      <div className="lt-cbqs__qhead">
        <span className="lt-cbqs__qnum">Question {index + 1}</span>
        <span className="lt-cbqs__chip">{cbqFormatLabel(q.format)}</span>
        <span className="lt-cbqs__chip lt-cbqs__chip--marks">{marks} {marks === 1 ? "mark" : "marks"}</span>
      </div>
      <MathText className="lt-cbqs__stem" text={q.questionText} />
      {Array.isArray(q.options) && q.options.length > 0 && (
        <ul className="lt-cbqs__opts">
          {q.options.map((option, i) => (
            <li key={`${q.id}-o${i}`}>
              <MathText text={option} />
            </li>
          ))}
        </ul>
      )}
      <details className="lt-cbqs__sol">
        <summary>Show step-by-step explanation</summary>
        <ol className="lt-cbqs__steps">
          {steps.map((step, i) => (
            <li key={`${q.id}-s${i}`}>
              <MathText text={step} />
            </li>
          ))}
        </ol>
        {q.finalAnswer ? (
          <p className="lt-cbqs__final">
            <strong>Answer:</strong> <MathText text={q.finalAnswer} />
          </p>
        ) : null}
      </details>
    </li>
  );
}

export default function CbqSampleList({ state }: { state: CbqSamplesState }) {
  if (state.status === "loading") {
    return <p className="lt-cbqs__note lt-cbqs__note--loading" data-testid="cbq-samples-loading">Loading sample questions…</p>;
  }
  if (state.status === "empty") {
    return (
      <p className="lt-cbqs__note" data-testid="cbq-samples-empty">
        Sample questions for this chapter could not be loaded right now. You can still practise its CBQs below.
      </p>
    );
  }
  return (
    <ol className="lt-cbqs__list" data-testid="cbq-samples">
      {state.rows.map((q, i) => (
        <Sample key={q.id} q={q} index={i} />
      ))}
    </ol>
  );
}
