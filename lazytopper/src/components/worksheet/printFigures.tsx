// FIGURES-ALL-SURFACES-1 PR-2 — figures in the printed / PDF worksheet documents.
//
// The on-screen Practice card shows a question's bound official figure; the PDF used to drop it, so a
// printed question could say "in the figure" with no figure. These pieces are shared by WorksheetPrintDoc and
// WorksheetGradedPrintDoc. The QUESTION figure comes from the same id-keyed binder the screen uses
// (`getFiguresForQuestion`, already in the worksheet chunk through publishability) and is a plain, EAGER <img>
// (html2canvas cannot capture a lazy one). The SOLUTION figure is injected by the exporter
// (`renderSolutionFigure`) so the diagrams registry stays out of this chunk.
import type { ReactNode } from "react";
import { getFiguresForQuestion } from "../../data/visualConceptRegistry";

/** Renders the solution-slot figure(s) of a question, or nothing. Supplied by worksheetPdfExport. */
export type RenderSolutionFigure = (questionId: string) => ReactNode;

const BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

/** A public path ("/figures/...") under the app's base path. */
export function printFigureSrc(filePath: string): string {
  if (/^(blob:|https?:|data:)/.test(filePath)) return filePath;
  return filePath.startsWith("/") ? `${BASE}${filePath}` : filePath;
}

/** The official figure(s) bound to this question, in order. Nothing when none is bound (honest empty state). */
export function PrintQuestionFigures({ questionId }: { questionId: string }) {
  const figures = getFiguresForQuestion(questionId);
  if (figures.length === 0) return null;
  return (
    <div className="lt-pfig" data-question-id={questionId}>
      {figures.map((f) => (
        <figure key={f.id} className="lt-pfig__fig">
          <img className="lt-pfig__img" src={printFigureSrc(f.filePath)} alt={f.title} decoding="sync" />
        </figure>
      ))}
    </div>
  );
}

/** Shared by both print documents; appended to each document's own <style> text. */
export const PRINT_FIGURE_CSS = `
.lt-pfig { margin: 6px 0 4px; break-inside: avoid; }
.lt-pfig__fig { margin: 0 0 6px; text-align: center; }
.lt-pfig__img { max-width: 100%; max-height: 260px; width: auto; height: auto; border: 1px solid #d8d8d8; background: #ffffff; }
.lt-pfig__fig svg { display: block; margin: 0 auto; width: 100%; max-width: 340px; height: auto; }
.lt-pfig__cap { font-size: 10px; color: #555; margin-top: 2px; }
`;
