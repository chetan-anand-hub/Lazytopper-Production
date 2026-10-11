// FIGURES-ALL-SURFACES-1 PR-2 — the solution-slot figure for the printed / PDF worksheet documents.
//
// A STATIC rendering of what <SolutionFigure> shows on screen (no lightbox, no buttons, nothing html2canvas
// cannot capture). Loaded with a dynamic import by worksheetPdfExport, so the diagrams registry only ships
// when a student actually downloads a PDF. Returns null when the question has no solution figure.
import type { ReactNode } from "react";
import { buildComputedFigure, getSolutionFigures } from "./registry";
import { FigureSvg } from "./render/FigureSvg";
import { printFigureSrc } from "../components/worksheet/printFigures";
import { SOLUTION_CASE_CAPTION, SOLUTION_CROP_CAPTION, SOLUTION_FIGURE_CAPTION } from "./SolutionFigure";

export function renderPrintSolutionFigure(questionId: string): ReactNode {
  const items: ReactNode[] = [];
  getSolutionFigures(questionId).forEach((b, i) => {
    if (b.kind === "crop") {
      items.push(
        <figure key={`crop-${b.part ?? i}`} className="lt-pfig__fig" data-figure-kind="crop">
          <img className="lt-pfig__img" src={printFigureSrc(b.filePath)} alt={b.alt} decoding="sync" />
          <figcaption className="lt-pfig__cap">{`${SOLUTION_CROP_CAPTION}: ${b.source.figure}`}</figcaption>
        </figure>,
      );
      return;
    }
    const built = buildComputedFigure(b);
    if (!built) return;
    items.push(
      <figure key={`computed-${b.part ?? i}`} className="lt-pfig__fig" data-figure-kind="computed">
        <FigureSvg spec={built.spec} idPrefix={`ltpf-${questionId}-${i}`} />
        <figcaption className="lt-pfig__cap">{b.builder === "opticsCase" ? SOLUTION_CASE_CAPTION : SOLUTION_FIGURE_CAPTION}</figcaption>
      </figure>,
    );
  });
  return items.length === 0 ? null : (
    <div className="lt-pfig" data-question-id={questionId}>
      {items}
    </div>
  );
}
