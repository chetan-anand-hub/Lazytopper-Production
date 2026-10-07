/**
 * Binding of a COMPUTED figure to one served question (DIAGRAMS-1 PR-2).
 *
 * The registry is id-keyed and lives here, not in a bank file: no question row is
 * edited to attach a figure. Each binding carries its own evidence:
 *   - `provenance`: for every number the figure is drawn from, the EXACT substring of
 *     the served row it was read from. A test re-reads the row and fails if a quote is
 *     gone (a later text edit to the row must re-confirm the figure, never silently
 *     keep a figure the row no longer supports).
 *   - `expect`: the row's OWN final answer(s). A test builds the figure and asserts the
 *     solved geometry gives that answer — proof that the template and its reading of
 *     the question are right, not only the numbers.
 */
import type { HdLabels, HdParams } from "../builders/heightsDistances";
import type { CircleDraw, CircleParams } from "../builders/circleTangents";
import type { BptParams } from "../builders/triangleBpt";
import type { CoordDraw, CoordParams } from "../builders/coordinatePlot";
import type { SectorDraw, SectorParams } from "../builders/circleSector";

export type FigureSlot = "solution" | "question";

export type ProvenanceField = "questionText" | "solutionSteps" | "finalAnswer" | "answer";

export interface FigureProvenance {
  /** The param this quote supports, e.g. "theta", "h", "near". */
  param: string;
  field: ProvenanceField;
  /** An exact substring of that field of the served row. */
  quote: string;
  /** Set when the param is COMPUTED from the quote rather than read off it (e.g. "30° + 15°"). */
  derived?: string;
}

export interface FigureExpectation {
  /** A key of the builder's solved model. */
  quantity: string;
  /** The row's own answer for that quantity (times `factor`, when the answer is a multiple of it). */
  value: number;
  /** Relative tolerance, percent (rows round, e.g. √3 = 1.73). */
  tolPct: number;
  factor?: number;
  /** Where the answer was read. */
  quote: string;
}

interface ComputedFigureBindingBase {
  kind: "computed";
  /** Exact served row id. */
  questionId: string;
  slot: FigureSlot;
  /** Set when the figure covers one part / one alternative of the row. */
  part?: string;
  caption?: string;
  provenance: FigureProvenance[];
  expect: FigureExpectation[];
  /** Who read the row against the rendered figure, and when. */
  confirmedBy: string;
}

export interface HdFigureBinding extends ComputedFigureBindingBase {
  builder: "heightsDistances";
  params: HdParams;
  /** Point letters matching the row's own solution, and unknown-length letters ("q.h"). */
  labels?: HdLabels;
}

/**
 * Geometry figures (DIAGRAMS-1 PR-2d). `params` holds ONLY numbers read from the row
 * (each one quoted in `provenance`, plus template/unit/scaleFree); `draw` holds display
 * choices that are not numbers (which segments, which region is shaded).
 */
export interface CircleFigureBinding extends ComputedFigureBindingBase {
  builder: "circleTangents";
  params: CircleParams;
  draw?: CircleDraw;
  labels?: Record<string, string>;
}
export interface TriangleFigureBinding extends ComputedFigureBindingBase {
  builder: "triangleBpt";
  params: BptParams;
  labels?: Record<string, string>;
}
export interface CoordinateFigureBinding extends ComputedFigureBindingBase {
  builder: "coordinatePlot";
  params: CoordParams;
  draw?: CoordDraw;
  labels?: Record<string, string>;
}
export interface SectorFigureBinding extends ComputedFigureBindingBase {
  builder: "circleSector";
  params: SectorParams;
  draw?: SectorDraw;
  labels?: Record<string, string>;
}

export type ComputedFigureBinding =
  | HdFigureBinding
  | CircleFigureBinding
  | TriangleFigureBinding
  | CoordinateFigureBinding
  | SectorFigureBinding;

/**
 * An OFFICIAL raster crop bound to a solution (NCERT / CBSE answer figures). Never a
 * lookalike: the crop must be of THIS question's own figure, eye-confirmed.
 * File rules (enforced by computedFigures.provenance.test.ts): under
 * /figures/solutions/, WebP, at most 80 KB, row served.
 */
export interface CropFigureBinding {
  kind: "crop";
  questionId: string;
  slot: FigureSlot;
  /** Public path, e.g. "/figures/solutions/life-processes/NCERT-LP-001.webp". */
  filePath: string;
  /** Alt text: what the figure shows. */
  alt: string;
  source: { file: string; page: number; figure: string };
  /** What was matched against the row (labels, values, orientation). */
  eyeConfirm: string;
  part?: string;
  caption?: string;
  confirmedBy: string;
}

export type SolutionFigureBinding = ComputedFigureBinding | CropFigureBinding;
