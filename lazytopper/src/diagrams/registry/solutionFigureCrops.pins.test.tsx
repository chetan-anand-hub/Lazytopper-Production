/**
 * FU-1038-PIN-BINDINGS — pins the EXACT set of official solution-figure crop bindings
 * (questionId, part, filePath) and the exact caption SolutionFigure renders for each:
 * "Official figure: <source.figure>" (+ " — <part>" when the binding has a part).
 *
 * The tuples are literals copied from trunk's solutionFigureCrops.ts (#1038). Adding,
 * removing or re-pointing a crop must be a deliberate edit HERE as well; a silent change
 * to the registry (or to the caption wording) turns this RED.
 */
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SOLUTION_FIGURE_CROPS } from "./solutionFigureCrops";
import { SolutionFigure } from "../SolutionFigure";

afterEach(cleanup);

const DIR = "/figures/solutions/ncert-science/life-processes/";
const CC = "/figures/solutions/ncert-science/control-and-coordination/";
const RP = "/figures/solutions/ncert-science/how-do-organisms-reproduce/";

/** [questionId, part, filePath, exact figcaption text] */
const PINNED: ReadonlyArray<readonly [string, string | undefined, string, string]> = [
  ["LIFE-EXMPLR-5-LONG-005", undefined, `${DIR}ncert-fig-5-6-alimentary-canal.webp`, "Official figure: NCERT Class 10 Science, Fig. 5.6"],
  ["sci-lp-hpq-3", "heart", `${DIR}ncert-fig-5-10-human-heart.webp`, "Official figure: NCERT Class 10 Science, Fig. 5.10 — heart"],
  ["sci-lp-hpq-3", "double circulation", `${DIR}ncert-fig-5-11-double-circulation.webp`, "Official figure: NCERT Class 10 Science, Fig. 5.11 — double circulation"],
  ["PYQ-S-2024-LIFEP-007", "(a) experiment", `${DIR}ncert-fig-5-4-koh-experiment.webp`, "Official figure: NCERT Class 10 Science, Fig. 5.4 — (a) experiment"],
  ["PYQ-S-2024-LIFEP-007", "(b)(ii) open stomatal pore", `${DIR}ncert-fig-5-3a-open-stomatal-pore.webp`, "Official figure: NCERT Class 10 Science, Fig. 5.3 (a) — (b)(ii) open stomatal pore"],
  // SOLUTION-FIGS-1 PR-1 (D39/40b, controller D, 2026-10-11): Biology.
  ["LP-H03", "excretory system", `${DIR}ncert-fig-5-13-excretory-system.webp`, "Official figure: NCERT Class 10 Science, Fig. 5.13 — excretory system"],
  ["SCQ-S-LIFE-043", "(c) excretory system", `${DIR}ncert-fig-5-13-excretory-system.webp`, "Official figure: NCERT Class 10 Science, Fig. 5.13 — (c) excretory system"],
  ["SCQ-S-LIFE-044", "(b) urinary system", `${DIR}ncert-fig-5-13-excretory-system.webp`, "Official figure: NCERT Class 10 Science, Fig. 5.13 — (b) urinary system"],
  ["SCQ-S-CTRL-041", "(a) neuron", `${CC}ncert-fig-6-1a-neuron.webp`, "Official figure: NCERT Class 10 Science, Fig. 6.1 (a) — (a) neuron"],
  ["CNC2-040", undefined, `${CC}ncert-fig-6-2-reflex-arc.webp`, "Official figure: NCERT Class 10 Science, Fig. 6.2"],
  ["sci-cc-hpq-2", undefined, `${CC}ncert-fig-6-2-reflex-arc.webp`, "Official figure: NCERT Class 10 Science, Fig. 6.2"],
  ["sci-bio-cc-3m-2026-01", undefined, `${CC}ncert-fig-6-2-reflex-arc.webp`, "Official figure: NCERT Class 10 Science, Fig. 6.2"],
  ["CC-H01", undefined, `${CC}ncert-fig-6-3-human-brain.webp`, "Official figure: NCERT Class 10 Science, Fig. 6.3"],
  ["SCQ-S-CTRL-039", undefined, `${CC}ncert-fig-6-3-human-brain.webp`, "Official figure: NCERT Class 10 Science, Fig. 6.3"],
  ["SCQ-S-CTRL-043", "(a) geotropism", `${CC}ncert-fig-6-6-geotropism.webp`, "Official figure: NCERT Class 10 Science, Fig. 6.6 — (a) geotropism"],
  ["REP-M08", undefined, `${RP}ncert-fig-7-11-female-reproductive-system.webp`, "Official figure: NCERT Class 10 Science, Fig. 7.11"],
  ["REP-H01", undefined, `${RP}ncert-fig-7-11-female-reproductive-system.webp`, "Official figure: NCERT Class 10 Science, Fig. 7.11"],
  ["PYQ-S-2024-REPR-006", "(a) budding in Hydra", `${RP}ncert-fig-7-4-budding-hydra.webp`, "Official figure: NCERT Class 10 Science, Fig. 7.4 — (a) budding in Hydra"],
  ["REPR-EXMPLR-7-LA-005", undefined, `${RP}ncert-fig-7-7-flower-ls.webp`, "Official figure: NCERT Class 10 Science, Fig. 7.7"],
];

const key = (q: string, part: string | undefined, file: string) => `${q} | ${part ?? "-"} | ${file}`;

describe("solution-figure crop bindings are pinned (FU-1038-PIN-BINDINGS)", () => {
  it("the registry holds EXACTLY the 19 pinned (questionId, part, filePath) tuples", () => {
    const actual = SOLUTION_FIGURE_CROPS.map((c) => key(c.questionId, c.part, c.filePath)).sort();
    const expected = PINNED.map(([q, part, file]) => key(q, part, file)).sort();
    expect(actual).toEqual(expected);
    expect(SOLUTION_FIGURE_CROPS).toHaveLength(19);
  });

  it.each(PINNED.map(([q, part, file, caption]) => ({ q, part, file, caption })))(
    "$q $part renders its crop with the caption \"$caption\"",
    ({ q, part, file, caption }) => {
      const { container } = render(<SolutionFigure questionId={q} />);
      const figs = Array.from(container.querySelectorAll("figure.lt-solfig[data-figure-kind='crop']"));
      const fig = figs.find((f) => f.querySelector("img")?.getAttribute("src")?.endsWith(file));
      expect(fig, `${q}: no crop figure for ${file}`).toBeTruthy();
      expect(fig!.getAttribute("data-question-id")).toBe(q);
      expect(fig!.querySelector("figcaption")!.textContent).toBe(caption);
      if (part === undefined) expect(figs).toHaveLength(1);
    },
  );
});
