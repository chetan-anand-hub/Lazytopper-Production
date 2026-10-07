/**
 * Official raster CROPS bound to solutions (DIAGRAMS-1 PR-2). Empty on purpose in
 * PR-2a: crops are produced by their own lane (e.g. Life Processes NCERT solution
 * figures) and bound by the controller after eye-confirmation. Each entry must point
 * at a WebP under /figures/solutions/ of at most 80 KB, for a served row
 * (enforced by computedFigures.provenance.test.ts).
 */
import type { CropFigureBinding } from "./computedFigureTypes";

export const SOLUTION_FIGURE_CROPS: CropFigureBinding[] = [];
