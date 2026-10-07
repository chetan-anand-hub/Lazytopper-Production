// src/lib/cbq/CbqShareNote.tsx
//
// CBQ-1 PR-2 — the Chapter Test / Full Mock setup legend for the paper's REAL CBQ share.
// "CBQ marks: X of Y · target ≥ 50%", CBSE's pattern (Acad-30/2024: 50% competency, 20% MCQ,
// 30% constructed — "≥" is LazyTopper's target, never attributed to CBSE), the real rest, and
// — only when the paper is short — a calm, honest note. The note claims only what the
// balancer guarantees: every CBQ that FITS the paper's structure is used (a Chapter Test
// swaps within a section; a Full Mock within a section x CBSE unit, so a CBQ outside the
// unit plan stays out). Every number comes from the drawn paper (cbqPaperBalance); nothing is a target
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
        <span className="lt-cbq-share__soft">· target ≥ 50%</span>
      </div>
      <div className="lt-cbq-share__rest">
        The rest: {p.plainMcqMarks} marks of plain MCQs and {p.constructedMarks} marks of short / long
        answers. CBSE pattern: 50% competency, 20% MCQ, 30% constructed.
      </div>
      {p.cbqShortfall > 0 ? (
        <div className="lt-cbq-share__short" data-testid="cbq-share-short" role="note">
          {p.scope === "chapter"
            ? `${p.scopeName} doesn’t have enough competency-based questions yet to fill half the marks, so this test uses every competency-based question that fits its sections and completes the rest with real board-style questions. More are being added.`
            : `The ${p.scopeName} bank doesn’t have enough competency-based questions yet to fill half the marks, so this paper uses every competency-based question that fits its CBSE unit plan and completes the rest with real board-style questions. More are being added.`}
        </div>
      ) : null}
    </div>
  );
}

export default CbqShareNote;
