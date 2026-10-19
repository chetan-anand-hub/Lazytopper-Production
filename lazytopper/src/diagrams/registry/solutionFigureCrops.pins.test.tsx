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
import { REFILE_PYQ2026_SOURCES } from "../../data/bankFix/refilePyq2026Ledger";

afterEach(cleanup);

const DIR = "/figures/solutions/ncert-science/life-processes/";
const CC = "/figures/solutions/ncert-science/control-and-coordination/";
const RP = "/figures/solutions/ncert-science/how-do-organisms-reproduce/";
const EYE = "/figures/solutions/ncert-science/human-eye-and-colourful-world/";
const MAG = "/figures/solutions/ncert-science/magnetic-effects-of-electric-current/";
const CARB = "/figures/solutions/ncert-science/carbon-and-its-compounds/";
const MET = "/figures/solutions/ncert-science/metals-and-non-metals/";
const ELEC = "/figures/solutions/ncert-science/electricity/";
const HER = "/figures/solutions/ncert-science/heredity/";
const LIGHT = "/figures/solutions/ncert-science/light-reflection-and-refraction/";
const MS26 = "/figures/solutions/cbse-ms-2026/";

/** [questionId, part, filePath, exact figcaption text] */
const PINNED: ReadonlyArray<readonly [string, string | undefined, string, string]> = [
  ["LIFE-EXMPLR-5-LONG-005", undefined, `${DIR}ncert-fig-5-6-alimentary-canal.webp`, "Official figure: NCERT Class 10 Science, Fig. 5.6"],
  ["sci-lp-hpq-3", "heart", `${DIR}ncert-fig-5-10-human-heart.webp`, "Official figure: NCERT Class 10 Science, Fig. 5.10 — heart"],
  ["sci-lp-hpq-3", "double circulation", `${DIR}ncert-fig-5-11-double-circulation.webp`, "Official figure: NCERT Class 10 Science, Fig. 5.11 — double circulation"],
  ["PYQ-S-2024-LIFEP-007", "(a) experiment", `${DIR}ncert-fig-5-4-koh-experiment.webp`, "Official figure: NCERT Class 10 Science, Fig. 5.4 — (a) experiment"],
  ["PYQ-S-2024-LIFEP-007", "(b)(ii) open stomatal pore", `${DIR}ncert-fig-5-3a-open-stomatal-pore.webp`, "Official figure: NCERT Class 10 Science, Fig. 5.3 (a) — (b)(ii) open stomatal pore"],
  // SOLUTION-FIGS-1 PR-1 (D39/40b, controller D, 2026-10-11): Biology.
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
  // SOLUTION-FIGS-1 PR-2 (controller D, 2026-10-11): Human Eye + Magnetic Effects.
  ["HEY-H01", undefined, `${EYE}ncert-fig-10-1-human-eye.webp`, "Official figure: NCERT Class 10 Science, Fig. 10.1"],
  ["HEY-M01", undefined, `${EYE}ncert-fig-10-2-myopia.webp`, "Official figure: NCERT Class 10 Science, Fig. 10.2"],
  ["HEY-H05", "myopia", `${EYE}ncert-fig-10-2-myopia.webp`, "Official figure: NCERT Class 10 Science, Fig. 10.2 — myopia"],
  ["HEY-H05", "hypermetropia", `${EYE}ncert-fig-10-3-hypermetropia.webp`, "Official figure: NCERT Class 10 Science, Fig. 10.3 — hypermetropia"],
  ["HEY-D04", "myopia", `${EYE}ncert-fig-10-2-myopia.webp`, "Official figure: NCERT Class 10 Science, Fig. 10.2 — myopia"],
  ["HEY-D04", "hypermetropia", `${EYE}ncert-fig-10-3-hypermetropia.webp`, "Official figure: NCERT Class 10 Science, Fig. 10.3 — hypermetropia"],
  ["SCQ-S-EYE-031", "b. correction", `${EYE}ncert-fig-10-2-myopia.webp`, "Official figure: NCERT Class 10 Science, Fig. 10.2 — b. correction"],
  ["EYE-NCERT-10-SA-007", "diagram", `${EYE}ncert-fig-10-3-hypermetropia.webp`, "Official figure: NCERT Class 10 Science, Fig. 10.3 — diagram"],
  ["EYE-EXMPLR-10-LA-003", undefined, `${EYE}ncert-fig-10-4-prism-refraction.webp`, "Official figure: NCERT Class 10 Science, Fig. 10.4"],
  ["PYQ-S-EYE-003", "(A) dispersion", `${EYE}ncert-fig-10-5-dispersion.webp`, "Official figure: NCERT Class 10 Science, Fig. 10.5 — (A) dispersion"],
  ["HEY-H06", undefined, `${EYE}ncert-fig-10-6-recombination.webp`, "Official figure: NCERT Class 10 Science, Fig. 10.6"],
  ["EYE-EXMPLR-10-SA-005", undefined, `${EYE}ncert-fig-10-6-recombination.webp`, "Official figure: NCERT Class 10 Science, Fig. 10.6"],
  ["APQ-S-EYE-006", "(b) recombination", `${EYE}ncert-fig-10-6-recombination.webp`, "Official figure: NCERT Class 10 Science, Fig. 10.6 — (b) recombination"],
  ["PYQ-S-2025-EYE-003", "(c)(i) recombination", `${EYE}ncert-fig-10-6-recombination.webp`, "Official figure: NCERT Class 10 Science, Fig. 10.6 — (c)(i) recombination"],
  ["PYQ-S-EYE-001", "(a) rainbow", `${EYE}ncert-fig-10-8-rainbow.webp`, "Official figure: NCERT Class 10 Science, Fig. 10.8 — (a) rainbow"],
  ["PYQ-S-2026-EYE-004", undefined, `${EYE}ncert-fig-10-8-rainbow.webp`, "Official figure: NCERT Class 10 Science, Fig. 10.8"],
  ["SCQ-S-MAG-044", "(a) bar magnet", `${MAG}ncert-fig-12-4-bar-magnet-field-lines.webp`, "Official figure: NCERT Class 10 Science, Fig. 12.4 — (a) bar magnet"],
  ["PYQ-S-2026-MAG-003", "(A)(i) bar magnet", `${MAG}ncert-fig-12-4-bar-magnet-field-lines.webp`, "Official figure: NCERT Class 10 Science, Fig. 12.4 — (A)(i) bar magnet"],
  ["MAG-EXMPLR-12-LA-003", undefined, `${MAG}ncert-fig-12-8-circular-loop-field.webp`, "Official figure: NCERT Class 10 Science, Fig. 12.8"],
  ["PYQ-S-MAG-007", undefined, `${MAG}ncert-fig-12-10-solenoid-field.webp`, "Official figure: NCERT Class 10 Science, Fig. 12.10"],
  ["APQ-S-MAG-006", "(a) solenoid", `${MAG}ncert-fig-12-10-solenoid-field.webp`, "Official figure: NCERT Class 10 Science, Fig. 12.10 — (a) solenoid"],
  ["PYQ-S-2024-MAG-003", "(b) solenoid", `${MAG}ncert-fig-12-10-solenoid-field.webp`, "Official figure: NCERT Class 10 Science, Fig. 12.10 — (b) solenoid"],
  ["PYQ-S-2024-MAG-004", "(b) solenoid", `${MAG}ncert-fig-12-10-solenoid-field.webp`, "Official figure: NCERT Class 10 Science, Fig. 12.10 — (b) solenoid"],
  ["PYQ-S-2026-MAG-003", "(B)(i) solenoid", `${MAG}ncert-fig-12-10-solenoid-field.webp`, "Official figure: NCERT Class 10 Science, Fig. 12.10 — (B)(i) solenoid"],
  ["MAG-EXMPLR-12-LA-007", undefined, `${MAG}ncert-fig-12-15-domestic-circuit.webp`, "Official figure: NCERT Class 10 Science, Fig. 12.15"],
  // SOLUTION-FIGS-1 PR-3 (controller D, 2026-10-11): Carbon + Metals + Chemical Reactions.
  ["CARB-H03", undefined, `${CARB}ncert-fig-4-12-micelle.webp`, "Official figure: NCERT Class 10 Science, Fig. 4.12"],
  ["PYQ-S-CARB-003", "(b)(ii) micelle", `${CARB}ncert-fig-4-12-micelle.webp`, "Official figure: NCERT Class 10 Science, Fig. 4.12 — (b)(ii) micelle"],
  ["CARB-EXMPLR-4-LONG-005", undefined, `${CARB}ncert-fig-4-11-ester-formation.webp`, "Official figure: NCERT Class 10 Science, Fig. 4.11"],
  ["SCQ-S-CARB-028", "cyclohexane", `${CARB}ncert-fig-4-9-cyclohexane.webp`, "Official figure: NCERT Class 10 Science, Fig. 4.9 — cyclohexane"],
  ["SCQ-S-CARB-028", "benzene", `${CARB}ncert-fig-4-10-benzene.webp`, "Official figure: NCERT Class 10 Science, Fig. 4.10 — benzene"],
  ["CR2-049", "(a) electron transfer", `${MET}ncert-fig-3-5-sodium-chloride.webp`, "Official figure: NCERT Class 10 Science, Fig. 3.5 — (a) electron transfer"],
  ["METAL-EXMPLR-3-LONG-004", "(ii) electrolytic refining", `${MET}ncert-fig-3-12-electrolytic-refining.webp`, "Official figure: NCERT Class 10 Science, Fig. 3.12 — (ii) electrolytic refining"],
  // SOLUTION-FIGS-1 PR-4 (controller D, 2026-10-11): Electricity + Heredity.
  ["PYQ-S-2026-ELEC-004", "(b) V-I graph", `${ELEC}ncert-fig-11-3-v-i-graph.webp`, "Official figure: NCERT Class 10 Science, Fig. 11.3 — (b) V-I graph"],
  ["SCQ-S-ELEC-028", "(b) battery", `${ELEC}ncert-table-11-1-battery.webp`, "Official figure: NCERT Class 10 Science, Table 11.1 (row 2) — (b) battery"],
  ["SCQ-S-ELEC-028", "(b) rheostat", `${ELEC}ncert-table-11-1-rheostat.webp`, "Official figure: NCERT Class 10 Science, Table 11.1 (row 9) — (b) rheostat"],
  ["SCQ-S-HERED-034", undefined, `${HER}ncert-fig-8-6-sex-determination.webp`, "Official figure: NCERT Class 10 Science, Fig. 8.6"],
  // SOLUTION-FIGS-1 PR-5 (controller D, 2026-10-11): Light (glass slab, prism).
  ["LIGHT-EXMPLR-9-LA-003", undefined, `${LIGHT}ncert-fig-9-10-glass-slab.webp`, "Official figure: NCERT Class 10 Science, Fig. 9.10"],
  ["SP-S-2023-LGHT-D-001", "(b) glass slab", `${LIGHT}ncert-fig-9-10-glass-slab.webp`, "Official figure: NCERT Class 10 Science, Fig. 9.10 — (b) glass slab"],
  ["GDR-L-CBJ-016", "(b) glass slab", `${LIGHT}ncert-fig-9-10-glass-slab.webp`, "Official figure: NCERT Class 10 Science, Fig. 9.10 — (b) glass slab"],
  ["PYQ-S-2026-LIGHT-015", "(a) prism", `${EYE}ncert-fig-10-4-prism-refraction.webp`, "Official figure: NCERT Class 10 Science, Fig. 10.4 — (a) prism"],
  // HIDE8-FIG8-1 Part B (19 Oct 2026): official CBSE 2026 marking-scheme drawings.
  ["PYQ-S-2026-CHEMRXN-021", "(B)(iii) CaO", `${MS26}metals-and-non-metals/cbse-ms-2026-31-5-1-q29-cao-electron-dot.webp`, "Official figure: CBSE 2026 Marking Scheme 31/5/1, Q29 (B)(iii) — (B)(iii) CaO"],
  ["PYQ-S-2026-METAL-008", "(a)(ii) MgO", `${MS26}metals-and-non-metals/cbse-ms-2026-31-2-1-q26-mgo-electron-dot.webp`, "Official figure: CBSE 2026 Marking Scheme 31/2/1, Q26 (a)(ii) — (a)(ii) MgO"],
  ["PYQ-S-2026-LIGHT-009", "(B) correction", `${MS26}human-eye-and-colourful-world/cbse-ms-2026-31-5-1-q34-hypermetropia-correction.webp`, "Official figure: CBSE 2026 Marking Scheme 31/5/1, Q34 (B) — (B) correction"],
  ["PYQ-S-2026-HERED-008", "(a) cross", `${MS26}heredity/cbse-ms-2026-31-4-1-q14-red-white-cross.webp`, "Official figure: CBSE 2026 Marking Scheme 31/4/1, Q14 (a) — (a) cross"],
  ["PYQ-S-2026-HERED-010", "parents to F1", `${MS26}heredity/cbse-ms-2026-31-5-1-q13-dihybrid-f1-cross.webp`, "Official figure: CBSE 2026 Marking Scheme 31/5/1, Q13 — parents to F1"],
  ["PYQ-M-2026-CG-003", "(ii) AP : PD", `${MS26}coordinate-geometry/cbse-ms-2026-30-4-1-q38-ii-ap-pd.webp`, "Official figure: CBSE 2026 Marking Scheme 30/4/1, Q38 (ii) — (ii) AP : PD"],
  ["PYQ-M-2026-CG-003", "(iii)(b) AO : OB", `${MS26}coordinate-geometry/cbse-ms-2026-30-4-1-q38-iii-b-ao-ob.webp`, "Official figure: CBSE 2026 Marking Scheme 30/4/1, Q38 (iii)(b) — (iii)(b) AO : OB"],
];

/** HIDE8-FIG8-1 Part B: each marking-scheme crop -> the SHA-256 of its source PDF as recorded in the REFILE ledger. */
const MS_CROP_SOURCE_SHA: ReadonlyArray<readonly [string, string, string]> = [
  ["PYQ-S-2026-CHEMRXN-021", "(B)(iii) CaO", "6a7fea975308fcb19f5605b16cf4b01e935eb111abbcfc84b298abc3c623be6b"],
  ["PYQ-S-2026-METAL-008", "(a)(ii) MgO", "df498adaf59d0107bae16c445d0bd99d473502e88f69e31838dc4573d90a4fb9"],
  ["PYQ-S-2026-LIGHT-009", "(B) correction", "6a7fea975308fcb19f5605b16cf4b01e935eb111abbcfc84b298abc3c623be6b"],
  ["PYQ-S-2026-HERED-008", "(a) cross", "7260ef95fb531a7c99a6d35169fe628c4e32bdc9d882641fc8462f876732c1db"],
  ["PYQ-S-2026-HERED-010", "parents to F1", "6a7fea975308fcb19f5605b16cf4b01e935eb111abbcfc84b298abc3c623be6b"],
  ["PYQ-M-2026-CG-003", "(ii) AP : PD", "f2657403b8851b76108b954519877c2b41f4913ddfda52f3755708dc91d15dea"],
  ["PYQ-M-2026-CG-003", "(iii)(b) AO : OB", "f2657403b8851b76108b954519877c2b41f4913ddfda52f3755708dc91d15dea"],
];

const key = (q: string, part: string | undefined, file: string) => `${q} | ${part ?? "-"} | ${file}`;

describe("solution-figure crop bindings are pinned (FU-1038-PIN-BINDINGS)", () => {
  it("the registry holds EXACTLY the 65 pinned (questionId, part, filePath) tuples", () => {
    const actual = SOLUTION_FIGURE_CROPS.map((c) => key(c.questionId, c.part, c.filePath)).sort();
    const expected = PINNED.map(([q, part, file]) => key(q, part, file)).sort();
    expect(actual).toEqual(expected);
    expect(SOLUTION_FIGURE_CROPS).toHaveLength(65); // 58 + 7 (HIDE8-FIG8-1 Part B)
  });

  it("every CBSE marking-scheme crop cites a PDF whose SHA-256 the REFILE-PYQ2026 ledger records (HIDE8-FIG8-1)", () => {
    const ms = SOLUTION_FIGURE_CROPS.filter((c) => c.filePath.startsWith(MS26));
    expect(ms.map((c) => key(c.questionId, c.part, "")).sort()).toEqual(MS_CROP_SOURCE_SHA.map(([q, p]) => key(q, p, "")).sort());
    for (const [q, part, sha] of MS_CROP_SOURCE_SHA) {
      const c = ms.find((x) => x.questionId === q && x.part === part)!;
      expect(c.source.file, `${q} ${part}`).toMatch(/^https:\/\/www\.cbse\.gov\.in\/cbsenew\/marking-scheme\/2026\/X\//);
      expect(REFILE_PYQ2026_SOURCES[c.source.file], `${q} ${part}: source not in the ledger`).toBe(sha);
      expect(c.source.figure, `${q} ${part}`).toMatch(/^CBSE 2026 Marking Scheme /);
    }
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
