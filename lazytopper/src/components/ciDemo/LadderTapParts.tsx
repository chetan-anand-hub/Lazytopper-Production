/**
 * SPEED-CI-2 — the tap step's question and its four options, drawn by BOTH the lazy ladder (./OneMinuteLadder.tsx)
 * and CiDemoCard's eager first-visit preview (./LadderPreview.tsx), so the preview is the ladder's first frame by
 * construction and the swap from one to the other moves and changes nothing. Presentational only: the 0-or-full
 * verdict stays in OneMinuteLadder (picked === right), unchanged.
 */
import { subscriptFormulas } from "../../lib/chemSubscript";
import { LADDER_CHECKING } from "./ladderCopy";

const LETTERS = ["A", "B", "C", "D"];

export function ladderLetter(i: number): string {
  return LETTERS[i] ?? "";
}

export function LadderMeta({ subject, topicName }: { subject: string; topicName: string }) {
  return (
    <p className="ci-demo__ladder-meta">
      {subject} · {topicName} · 1 mark · CBSE board question
    </p>
  );
}

export function LadderQuestionText({ question }: { question: string }) {
  return (
    <p className="ci-demo__ladder-q" data-testid="one-min-question">
      {question}
    </p>
  );
}

export interface LadderOptionsProps {
  options: readonly string[];
  right: number;
  /** The tapped option (null before the tap). */
  picked: number | null;
  onTap: (i: number) => void;
  /** SPEED-CI-2: an early tap the preview is holding for the ladder (shown pressed, not yet marked). */
  holding?: number | null;
}

export function LadderOptions({ options, right, picked, onTap, holding = null }: LadderOptionsProps) {
  const done = picked !== null;
  return (
    <ul className="ci-demo__opts" role="list">
      {options.map((o, i) => {
        const state = !done ? "" : i === right ? " ci-demo__opt--right" : i === picked ? " ci-demo__opt--wrong" : " ci-demo__opt--dim";
        const held = !done && holding === i;
        return (
          <li key={i}>
            <button
              type="button"
              className={`ci-demo__opt${state}${held ? " ci-demo__opt--held" : ""}`}
              data-testid={`one-min-opt-${i}`}
              disabled={done}
              aria-pressed={picked === i}
              aria-busy={held ? true : undefined}
              onClick={() => onTap(i)}
            >
              <span className="ci-demo__opt-letter" aria-hidden="true">
                {ladderLetter(i)}
              </span>
              <span className="ci-demo__opt-text">{subscriptFormulas(o)}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * SPEED-CI-2 (review of #1639, FU1) — what an EARLY tap shows at once (the static paint's guard inserts the same two
 * nodes): the verdict line's box saying "Checking your answer…" above the options, and the verdict block's box at its
 * final height below them (`ci-demo__verdict--reserve`). The ladder's verdict then lands inside both: nothing moves.
 */
export function LadderHeldMark() {
  return (
    <p className="ci-demo__verdict-mark ci-demo__verdict-mark--held" role="status">
      {LADDER_CHECKING}
    </p>
  );
}

export function LadderVerdictReserve() {
  return <div className="ci-demo__verdict ci-demo__verdict--reserve" />;
}
