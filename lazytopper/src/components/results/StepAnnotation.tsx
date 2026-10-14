import type { ReactNode } from "react";
import "./stepAnnotation.css";

/**
 * GRADER-CONSEQUENTIAL-1 (D242) — the ONE teacher-annotation line of a graded step.
 *
 * It replaces the "↳" text glyph. That glyph has no outline in the font html2canvas captures with,
 * so the graded PDF printed "Ⅰ," in its place. The arrow here is an inline SVG: no font, no glyph
 * lookup, the same in the screen render and in the PDF capture. It is coloured by the step's
 * verdict (green = correct, amber = partial, red = lost; muted otherwise), and the annotation text
 * is medium weight. All styling is in stepAnnotation.css (no inline style objects, CLAUDE.md §7).
 *
 * `consequentialOf` is the 1-based step number of the earlier error this step's lost marks follow
 * from (the grader's `annotatedSteps[].consequentialOf`); when present the line says so.
 *
 * The text is passed as `children` because the three call sites render it differently
 * (MathText in the two print docs, EquationRender on screen); this component never reads it.
 */
export type StepAnnotationTone = "ok" | "part" | "bad" | "na" | "struck" | "unk";

export interface StepAnnotationProps {
  /** `stepDisplay(...).tone` of the step. */
  tone: StepAnnotationTone;
  /** The grader's `consequentialOf` (1-based step number), when the step's loss follows from an earlier error. */
  consequentialOf?: number | null;
  /** An extra class of the call site (its own size / background); never a style object. */
  className?: string;
  children: ReactNode;
}

/** The step number to print, or null (a non-integer, zero or negative value is never shown). */
export function followsFromStep(consequentialOf: unknown): number | null {
  return typeof consequentialOf === "number" && Number.isInteger(consequentialOf) && consequentialOf >= 1
    ? consequentialOf
    : null;
}

export function StepAnnotation({ tone, consequentialOf, className, children }: StepAnnotationProps) {
  const follows = followsFromStep(consequentialOf);
  return (
    <div className={`lt-stann lt-stann--${tone}${className ? ` ${className}` : ""}`}>
      <svg
        className="lt-stann__arrow"
        viewBox="0 0 14 14"
        width="14"
        height="14"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M3 1.5V8a2.5 2.5 0 0 0 2.5 2.5H11M8.5 7.5l3 3-3 3" />
      </svg>
      <span className="lt-stann__body">
        <span className="lt-stann__text">{children}</span>
        {follows !== null && <span className="lt-stann__follows">follows from step {follows}</span>}
      </span>
    </div>
  );
}
