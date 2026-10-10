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

/** [questionId, part, filePath, exact figcaption text] */
const PINNED: ReadonlyArray<readonly [string, string | undefined, string, string]> = [
  ["LIFE-EXMPLR-5-LONG-005", undefined, `${DIR}ncert-fig-5-6-alimentary-canal.webp`, "Official figure: NCERT Class 10 Science, Fig. 5.6"],
  ["sci-lp-hpq-3", "heart", `${DIR}ncert-fig-5-10-human-heart.webp`, "Official figure: NCERT Class 10 Science, Fig. 5.10 — heart"],
  ["sci-lp-hpq-3", "double circulation", `${DIR}ncert-fig-5-11-double-circulation.webp`, "Official figure: NCERT Class 10 Science, Fig. 5.11 — double circulation"],
  ["PYQ-S-2024-LIFEP-007", "(a) experiment", `${DIR}ncert-fig-5-4-koh-experiment.webp`, "Official figure: NCERT Class 10 Science, Fig. 5.4 — (a) experiment"],
  ["PYQ-S-2024-LIFEP-007", "(b)(ii) open stomatal pore", `${DIR}ncert-fig-5-3a-open-stomatal-pore.webp`, "Official figure: NCERT Class 10 Science, Fig. 5.3 (a) — (b)(ii) open stomatal pore"],
];

const key = (q: string, part: string | undefined, file: string) => `${q} | ${part ?? "-"} | ${file}`;

describe("solution-figure crop bindings are pinned (FU-1038-PIN-BINDINGS)", () => {
  it("the registry holds EXACTLY the 5 pinned (questionId, part, filePath) tuples", () => {
    const actual = SOLUTION_FIGURE_CROPS.map((c) => key(c.questionId, c.part, c.filePath)).sort();
    const expected = PINNED.map(([q, part, file]) => key(q, part, file)).sort();
    expect(actual).toEqual(expected);
    expect(SOLUTION_FIGURE_CROPS).toHaveLength(5);
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
