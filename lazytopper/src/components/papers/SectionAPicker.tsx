// src/components/papers/SectionAPicker.tsx
//
// AWAIT-1-PAPERS (owner ruling 17 Oct, option a) — a DOWNLOADED Chapter Test / Full Mock was
// sat on paper, so its Section A picks are not in the app. Before the upload, the student taps
// the option they wrote for each Section A question; the page then scores those picks with the
// EXISTING `scoreObjectiveSection` (the same 0-or-full scorer an in-app sitting uses) and the
// EXISTING upload grades the written sections. No grader change. An untapped question is NOT
// ATTEMPTED, and the screen says so plainly before the student continues.
//
// Renders inside the page's `.lt-ct` chrome and reuses its option-button classes.
import { useState } from "react";
import { MathText } from "../question/MathText";
import type { PersistedWorksheetQuestion } from "../../services/worksheetSessionStore";
import "./papers.css";

export const UNTAPPED_LINE = "Untapped questions count as not attempted.";

export interface SectionAPickerProps {
  eyebrow: string;
  name: string;
  code: string;
  /** The paper's Section A (objective) questions, in paper order. */
  questions: PersistedWorksheetQuestion[];
  /** Picks keyed by qNumber, as OPTION TEXT (the shape `scoreObjectiveSection` reads). */
  onContinue: (picks: Record<number, string>) => void;
  onCancel: () => void;
}

export default function SectionAPicker({ eyebrow, name, code, questions, onContinue, onCancel }: SectionAPickerProps) {
  const [picks, setPicks] = useState<Record<number, string>>({});
  const tapped = questions.filter((q) => !!picks[q.qNumber]).length;
  const untapped = questions.length - tapped;
  return (
    <div className="lt-paper-pick" data-testid="section-a-picker">
      <div className="lt-ct__eyebrow">{eyebrow}</div>
      <div className="lt-ct__title lt-ct__fr">{name}</div>
      <div className="lt-ct__sub">
        {code} · Section A. Tap the option you wrote on your paper for each question. These are scored the
        same way as a test taken in the app.
      </div>
      <div className="lt-paper-pick__note" role="note">
        <b>{UNTAPPED_LINE}</b>
      </div>

      {questions.map((q) => (
        <div className="lt-paper-pick__q" key={q.qNumber}>
          <div className="lt-paper-pick__qhead">Q{q.qNumber}.</div>
          <div className="lt-paper-pick__qtext">
            <MathText text={q.questionText} />
          </div>
          {(q.options ?? []).map((opt, oi) => {
            const sel = picks[q.qNumber] === opt;
            return (
              <button
                key={oi}
                type="button"
                aria-pressed={sel}
                className={`lt-ct__opt${sel ? " lt-ct__opt--sel" : ""}`}
                onClick={() =>
                  setPicks((prev) => {
                    const next = { ...prev };
                    if (next[q.qNumber] === opt) delete next[q.qNumber];
                    else next[q.qNumber] = opt;
                    return next;
                  })
                }
              >
                <span className="lt-ct__opt-k">{String.fromCharCode(65 + oi)}</span>
                <MathText text={opt} />
              </button>
            );
          })}
        </div>
      ))}

      <div className="lt-paper-pick__foot">
        <span className="lt-paper-pick__count">
          {tapped} of {questions.length} tapped
          {untapped > 0 ? ` · ${untapped} will count as not attempted` : ""}
        </span>
        <span className="lt-paper-pick__actions">
          <button type="button" className="lt-ct__btn lt-ct__btn--ghost lt-ct__btn--sm" onClick={onCancel}>
            Not now
          </button>
          <button type="button" className="lt-ct__btn lt-ct__btn--primary" onClick={() => onContinue(picks)}>
            Continue to upload →
          </button>
        </span>
      </div>
    </div>
  );
}
