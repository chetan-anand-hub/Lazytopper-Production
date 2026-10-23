// QP-WORKING-AFTER-1 (owner design, 23 Oct 22:48 IST) — the FINISH GATE.
//
// "Finish session" with one or more WRITTEN (subjective) questions that have no saved working
// shows this first: those questions, each with its own answer box in place (Upload a photo /
// Type working / Save — the SAME collect-mode box as the set), and a clear secondary
// "Skip — show my scorecard". Working typed or attached in the set but never saved is listed
// with the save nudge and its own Save. Saving here is the set's ordinary save, so it reaches the
// normal session grading and is recorded as usual. ONE gate per Finish (the host never re-opens it
// for the same tap), never a loop. Phone-first: a bottom sheet under 640 px, 44 px taps.
//
// Nothing here grades or records: it only saves (no API call) and then hands back to the host.
import { useEffect, useRef } from "react";
import type { PracticeQuestion } from "../../data/predictionDataService";
import { SolutionChecker, type SolutionCheckerSavedWorking } from "../question/SolutionChecker";
import { MathText } from "../question/MathText";
import { SaveNudge } from "../guide/saveNudge/saveNudge";
import "./finishGate.css";

export interface FinishGateItem {
  q: PracticeQuestion;
  /** The question's number in the displayed set. */
  qNumber: number;
  /** Working typed / attached in the set but never saved (snapshot when the gate opened). */
  draft: SolutionCheckerSavedWorking | null;
}

export interface FinishGateProps {
  items: FinishGateItem[];
  savedAnswers: Record<string, SolutionCheckerSavedWorking>;
  subjectKey: string;
  topicLabel: string;
  uid: string | null | undefined;
  defaultAnswerMode?: "type" | "upload";
  onSave: (qId: string, working: SolutionCheckerSavedWorking) => void;
  onRemove: (qId: string) => void;
  /** Close the gate and show the scorecard (after saving, or skipping). */
  onContinue: () => void;
}

export const FINISH_GATE_COPY = {
  title: "Before your scorecard",
  lede: "These written questions have no saved answer yet. Save your working to have it marked, or skip.",
  draftNote: "You wrote working here but didn't save it.",
  savedNote: "Saved. It will be marked with your set.",
  cont: "Show my scorecard",
  skip: "Skip — show my scorecard",
} as const;

export function FinishGate({ items, savedAnswers, subjectKey, topicLabel, uid, defaultAnswerMode, onSave, onRemove, onContinue }: FinishGateProps) {
  const headRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headRef.current?.focus?.();
  }, []);
  const savedCount = items.filter((it) => savedAnswers[String(it.q.id)]).length;
  return (
    <div className="qp-gate" role="dialog" aria-modal="true" aria-labelledby="qp-gate-title" data-testid="qp-finish-gate">
      <div className="qp-gate__sheet">
        <h2 className="qp-gate__t" id="qp-gate-title" tabIndex={-1} ref={headRef}>
          {FINISH_GATE_COPY.title}
        </h2>
        <p className="qp-gate__lede">{FINISH_GATE_COPY.lede}</p>
        <ol className="qp-gate__list">
          {items.map((it) => {
            const id = String(it.q.id);
            const saved = savedAnswers[id] ?? null;
            return (
              <li key={id} className="qp-gate__item" data-testid="qp-gate-item" data-question-id={id}>
                <div className="qp-gate__qn">{`Question ${it.qNumber} · ${Number(it.q.marks) || 0} mark${Number(it.q.marks) === 1 ? "" : "s"}`}</div>
                <div className="qp-gate__qt">
                  <MathText text={String(it.q.questionText || "")} />
                </div>
                {it.draft && !saved ? (
                  <>
                    <p className="qp-gate__note">{FINISH_GATE_COPY.draftNote}</p>
                    <SaveNudge id={`gate:${id}`} uid={uid} onSave={() => onSave(id, it.draft!)} />
                  </>
                ) : (
                  <SolutionChecker
                    question={String(it.q.questionText || "")}
                    marks={Number(it.q.marks) || 0}
                    subject={subjectKey}
                    topic={topicLabel}
                    questionId={id}
                    section={it.q.section}
                    format={it.q.format}
                    collectMode
                    savedAnswer={saved}
                    onSaveAnswer={(w) => onSave(id, w)}
                    onRemoveAnswer={() => onRemove(id)}
                    defaultAnswerMode={defaultAnswerMode}
                  />
                )}
              </li>
            );
          })}
        </ol>
        <div className="qp-gate__acts">
          {savedCount > 0 ? (
            <button type="button" className="qp-gate__btn qp-gate__btn--primary" data-testid="qp-gate-continue" onClick={onContinue}>
              {FINISH_GATE_COPY.cont}
            </button>
          ) : null}
          <button type="button" className="qp-gate__btn qp-gate__btn--skip" data-testid="qp-gate-skip" onClick={onContinue}>
            {FINISH_GATE_COPY.skip}
          </button>
        </div>
      </div>
    </div>
  );
}
