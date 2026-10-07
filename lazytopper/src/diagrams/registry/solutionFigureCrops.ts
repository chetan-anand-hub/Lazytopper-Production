/**
 * Official raster CROPS bound to solutions (DIAGRAMS-1 PR-2). Crops are produced by
 * their own lane and bound by the controller after eye-confirmation. Each entry must
 * point at a WebP under /figures/solutions/ of at most 80 KB, for a served row
 * (enforced by computedFigures.provenance.test.ts).
 *
 * PR-2e — Life Processes: NCERT Class 10 Science (Reprint 2026-27, jesc105.pdf)
 * textbook figures, cropped in #1020 (assets) and bound here to rows whose answer
 * asks the student to DRAW that exact diagram with those labels. A row is bound only
 * when every label the row asks for is labelled in the NCERT figure (manifest:
 * Desktop/diff/b19/pr3/solution-crops.csv). Not bound: lp-hpq-104 (its answer names
 * loop of Henle / proximal and distal tubules, which Fig. 5.14 does not label),
 * SCQ-S-LIFE-043/-044 (third-party booklet rows, pending the booklet withhold), the
 * 2026-LP-* predicted rows (no solution mount on that surface).
 */
import type { CropFigureBinding } from "./computedFigureTypes";

const NCERT_LP = "NCERT Class 10 Science (Reprint 2026-27) jesc105.pdf";
const BY = "controller B-20: row read + crop eye-checked against the labels asked, 2026-10-08";

export const SOLUTION_FIGURE_CROPS: CropFigureBinding[] = [
  {
    kind: "crop",
    questionId: "LP-H03",
    slot: "solution",
    filePath: "/figures/solutions/ncert-science/life-processes/ncert-fig-5-13-excretory-system.webp",
    alt: "Human excretory system: kidneys, ureters, urinary bladder and urethra, with the aorta, vena cava and renal artery and vein",
    source: { file: NCERT_LP, page: 18, figure: "NCERT Class 10 Science, Fig. 5.13" },
    eyeConfirm: "asked: Kidney, Ureter, Urinary bladder, Urethra; all four are labelled in Fig. 5.13",
    confirmedBy: BY,
  },
  {
    kind: "crop",
    questionId: "LIFE-EXMPLR-5-LONG-005",
    slot: "solution",
    filePath: "/figures/solutions/ncert-science/life-processes/ncert-fig-5-6-alimentary-canal.webp",
    alt: "Human alimentary canal: mouth, oesophagus, stomach, small and large intestine, with the liver and pancreas",
    source: { file: NCERT_LP, page: 7, figure: "NCERT Class 10 Science, Fig. 5.6" },
    eyeConfirm: "asked: Mouth, Oesophagus, Stomach, Intestine; Fig. 5.6 labels mouth (buccal cavity), oesophagus, stomach, small and large intestine",
    confirmedBy: BY,
  },
  {
    kind: "crop",
    questionId: "LPSD-018",
    slot: "solution",
    filePath: "/figures/solutions/ncert-science/life-processes/ncert-fig-5-10-human-heart.webp",
    alt: "Sectional view of the human heart: four chambers, septum, aorta, pulmonary arteries and veins, vena cava, with arrows for blood flow",
    source: { file: NCERT_LP, page: 14, figure: "NCERT Class 10 Science, Fig. 5.10" },
    eyeConfirm: "asked: labelled heart, its four chambers and the major vessels; Fig. 5.10 labels right/left atrium, right/left ventricle, aorta, pulmonary arteries, pulmonary veins, vena cava (valves are asked only to be explained, not labelled)",
    confirmedBy: BY,
  },
  {
    kind: "crop",
    questionId: "sci-lp-hpq-3",
    slot: "solution",
    part: "heart",
    filePath: "/figures/solutions/ncert-science/life-processes/ncert-fig-5-10-human-heart.webp",
    alt: "Sectional view of the human heart: four chambers, septum, aorta, pulmonary arteries and veins, vena cava, with arrows for blood flow",
    source: { file: NCERT_LP, page: 14, figure: "NCERT Class 10 Science, Fig. 5.10" },
    eyeConfirm: "asked: labelled heart (RA, RV, LA, LV, major vessels); all labelled in Fig. 5.10",
    confirmedBy: BY,
  },
  {
    kind: "crop",
    questionId: "sci-lp-hpq-3",
    slot: "solution",
    part: "double circulation",
    filePath: "/figures/solutions/ncert-science/life-processes/ncert-fig-5-11-double-circulation.webp",
    alt: "Double circulation: pulmonary artery to the lungs, pulmonary vein from the lungs, aorta to the body and vena cava from the body",
    source: { file: NCERT_LP, page: 14, figure: "NCERT Class 10 Science, Fig. 5.11" },
    eyeConfirm: "asked: route of blood showing double circulation; Fig. 5.11 shows the pulmonary loop (lung capillaries) and the systemic loop (body capillaries) with the named vessels",
    confirmedBy: BY,
  },
  {
    kind: "crop",
    questionId: "PYQ-S-2024-LIFEP-007",
    slot: "solution",
    part: "(a) experiment",
    filePath: "/figures/solutions/ncert-science/life-processes/ncert-fig-5-4-koh-experiment.webp",
    alt: "Two potted plants under bell jars; set-up (a) has a watch-glass containing potassium hydroxide, set-up (b) does not",
    source: { file: NCERT_LP, page: 5, figure: "NCERT Class 10 Science, Fig. 5.4" },
    eyeConfirm: "asked (a): an experiment showing CO2 is essential for photosynthesis; the row's own solution is NCERT Activity 5.2, which Fig. 5.4 draws (bell jars, KOH watch-glass in (a) only)",
    confirmedBy: BY,
  },
  {
    kind: "crop",
    questionId: "PYQ-S-2024-LIFEP-007",
    slot: "solution",
    part: "(b)(ii) open stomatal pore",
    filePath: "/figures/solutions/ncert-science/life-processes/ncert-fig-5-3a-open-stomatal-pore.webp",
    alt: "Open stomatal pore between two guard cells, with chloroplasts labelled",
    source: { file: NCERT_LP, page: 5, figure: "NCERT Class 10 Science, Fig. 5.3 (a)" },
    eyeConfirm: "asked (b)(ii): open stomatal pore labelled (I) Guard cells (II) Chloroplast; Fig. 5.3(a) labels guard cells, stomatal pore and chloroplast",
    confirmedBy: BY,
  },
];
