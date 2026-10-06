// src/lib/cbq/CbqShareNote.tsx
//
// CBQ-1 PR-2 — the Chapter Test / Full Mock setup legend for the paper's REAL CBQ share.
// "CBQ marks: X of Y (CBSE: ≥ 50%)", the 20 / 30 rest, and — only when the pool ran out — a
// calm, honest note that this chapter / subject does not have enough competency questions
// yet. Every number comes from the drawn paper (cbqPaperBalance); nothing is a target
// dressed up as a result. Class-driven styling (CLAUDE.md §7), navy / soft-white / green.

import "./cbqShareNote.css";

export interface CbqShareNoteProps {
  cbqMarks: number;
  totalMarks: number;
  cbqShortfall: number;
  plainMcqMarks: number;
  constructedMarks: number;
  /** What the shortfall note names: "Light – Reflection and Refraction", "Maths". */
  scopeName: string;
  /** "chapter" (Chapter Test) or "subject" (Full Mock) — wording of the short note. */
  scope: "chapter" | "subject";
}

export function CbqShareNote(p: CbqShareNoteProps) {
  return (
    <div className="lt-cbq-share" data-testid="cbq-share">
      <div className="lt-cbq-share__main">
        CBQ marks: <b>{p.cbqMarks}</b> of <b>{p.totalMarks}</b>{" "}
        <span className="lt-cbq-share__soft">(CBSE: ≥ 50%)</span>
      </div>
      <div className="lt-cbq-share__rest">
        The rest: {p.plainMcqMarks} marks of plain MCQs and {p.constructedMarks} marks of short / long
        answers (CBSE: 20% and 30%).
      </div>
      {p.cbqShortfall > 0 ? (
        <div className="lt-cbq-share__short" data-testid="cbq-share-short" role="note">
          {p.scope === "chapter" ? `${p.scopeName} doesn’t` : `The ${p.scopeName} bank doesn’t`} have enough
          competency-based questions yet to fill half the marks, so this paper uses every one we have and
          completes the rest with real board-style questions. More are being added.
        </div>
      ) : null}
    </div>
  );
}

export default CbqShareNote;
