/**
 * Official raster CROPS bound to solutions (DIAGRAMS-1 PR-2). Crops are produced by
 * their own lane and bound by the controller after eye-confirmation. Each entry must
 * point at a WebP under /figures/solutions/ of at most 80 KB, for a served row
 * (enforced by computedFigures.provenance.test.ts).
 *
 * PR-2e — Life Processes: NCERT Class 10 Science (Reprint 2026-27, jesc105.pdf)
 * textbook figures, cropped in #1020 (assets) and bound here to rows whose question
 * asks for that exact diagram (or, for PYQ-S-2024-LIFEP-007 (a), whose own solution is
 * the NCERT activity the figure draws). A row is bound only when every label its
 * question AND its own answer ask for is labelled in the NCERT figure (manifest:
 * Desktop/diff/b19/pr3/solution-crops.csv). Not bound: lp-hpq-104 (its answer names
 * loop of Henle / proximal and distal tubules, which Fig. 5.14 does not label),
 * LP-H03 (its solution step describes a labelled nephron, not Fig. 5.13), LPSD-018
 * (its answer requires labelled valves; Fig. 5.10 labels none),
 * SCQ-S-LIFE-043/-044 (third-party booklet rows, pending the booklet withhold), the
 * 2026-LP-* predicted rows (no solution mount on that surface).
 *
 * SOLUTION-FIGS-1 PR-1 (D39/40b, controller D) — Biology. NCERT Class 10 Science
 * (Reprint 2026-27, jesc105/106/107.pdf from ncert.nic.in) figures, bound under the same
 * rule: every label the question AND its own answer ask for is labelled in the figure.
 * Also binds Fig. 5.13 (already on trunk) to the kept booklet rows SCQ-S-LIFE-043/-044 (BOOKLET-WITHHOLD-1 was cancelled, D21; the figure is
 * NCERT's, not the booklet's). Not bound, with reason: CC-M01 / CTRL-EXMPLR-6-LA-001
 * (answer labels myelin sheath / nodes of Ranvier; Fig. 6.1 does not), CC-M07 (asks a
 * flowchart), CNC2-047 (blink reflex via the brainstem; Fig. 6.2 is a spinal arm reflex),
 * CC-H03 (geotropism stem, phototropism diagram step: bank NOTE), REP-M01 /
 * REPR-NCERT-7-LA-001 (answer labels ovule / receptacle; Fig. 7.7 does not),
 * REPR-EXMPLR-7-LA-003 (style, ovule unlabelled in Fig. 7.8), BX-REP-D-001 (epididymis
 * unlabelled in Fig. 7.10), SQP-S-2023-REPR-D-001 (hypha, sporangium unlabelled in
 * Fig. 7.6), sci-bio-repro-3m-2026-01 (Fig. 7.1(a) carries no labels), LPSD-018 (valves),
 * LP-H03 (still: its step 1 points at a labelled nephron; verifier FAIL 2026-10-11, bank NOTE).
 */
import type { CropFigureBinding } from "./computedFigureTypes";

const NCERT_LP = "NCERT Class 10 Science (Reprint 2026-27) jesc105.pdf";
const BY = "controller B-20: row read + crop eye-checked against the labels asked, 2026-10-08";
const NCERT_CC = "NCERT Class 10 Science (Reprint 2026-27) jesc106.pdf";
const NCERT_RP = "NCERT Class 10 Science (Reprint 2026-27) jesc107.pdf";
const BY_D = "controller D (SOLUTION-FIGS-1): row read + crop eye-checked against the labels asked, 2026-10-11";
const LP_DIR = "/figures/solutions/ncert-science/life-processes/";
const CC_DIR = "/figures/solutions/ncert-science/control-and-coordination/";
const RP_DIR = "/figures/solutions/ncert-science/how-do-organisms-reproduce/";

export const SOLUTION_FIGURE_CROPS: CropFigureBinding[] = [
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

  {
    kind: "crop",
    questionId: "SCQ-S-LIFE-043",
    slot: "solution",
    part: "(c) excretory system",
    filePath: `${LP_DIR}ncert-fig-5-13-excretory-system.webp`,
    alt: "Human excretory system: kidneys, ureters, urinary bladder and urethra, with the aorta, vena cava and renal vessels",
    source: { file: NCERT_LP, page: 18, figure: "NCERT Class 10 Science, Fig. 5.13" },
    eyeConfirm: "asked (c): organs that form urine, carry it from the kidney, store it; answer: kidney, ureter, urinary bladder, urethra; all four labelled in Fig. 5.13",
    confirmedBy: BY_D,
  },
  {
    kind: "crop",
    questionId: "SCQ-S-LIFE-044",
    slot: "solution",
    part: "(b) urinary system",
    filePath: `${LP_DIR}ncert-fig-5-13-excretory-system.webp`,
    alt: "Human excretory system: kidneys, ureters, urinary bladder and urethra, with the aorta, vena cava and renal vessels",
    source: { file: NCERT_LP, page: 18, figure: "NCERT Class 10 Science, Fig. 5.13" },
    eyeConfirm: "asked (b): labelled human urinary system; answer: kidneys, ureters, urinary bladder, urethra; all labelled in Fig. 5.13",
    confirmedBy: BY_D,
  },
  {
    kind: "crop",
    questionId: "SCQ-S-CTRL-041",
    slot: "solution",
    part: "(a) neuron",
    filePath: `${CC_DIR}ncert-fig-6-1a-neuron.webp`,
    alt: "Structure of a neuron: dendrites, cell body with nucleus, axon and nerve ending",
    source: { file: NCERT_CC, page: 2, figure: "NCERT Class 10 Science, Fig. 6.1 (a)" },
    eyeConfirm: "asked (a): Nucleus, Dendrite, Cell body, Axon; answer adds nerve endings; Fig. 6.1(a) labels all five",
    confirmedBy: BY_D,
  },
  {
    kind: "crop",
    questionId: "CNC2-040",
    slot: "solution",
    filePath: `${CC_DIR}ncert-fig-6-2-reflex-arc.webp`,
    alt: "Reflex arc: heat/pain receptors in the skin, sensory neuron to the spinal cord, relay neuron, motor neuron to the muscle in the arm (effector)",
    source: { file: NCERT_CC, page: 4, figure: "NCERT Class 10 Science, Fig. 6.2" },
    eyeConfirm: "asked: reflex arc on touching a hot surface (Fig. 6.2 draws exactly a hand over a hot pan); answer: receptor, sensory neuron, relay neuron in the spinal cord, motor neuron, effector (muscle); Fig. 6.2 labels receptors in skin, sensory neuron, spinal cord (CNS), relay neuron, motor neuron, effector = muscle in arm",
    confirmedBy: BY_D,
  },
  {
    kind: "crop",
    questionId: "sci-cc-hpq-2",
    slot: "solution",
    filePath: `${CC_DIR}ncert-fig-6-2-reflex-arc.webp`,
    alt: "Reflex arc: heat/pain receptors in the skin, sensory neuron to the spinal cord, relay neuron, motor neuron to the muscle in the arm (effector)",
    source: { file: NCERT_CC, page: 4, figure: "NCERT Class 10 Science, Fig. 6.2" },
    eyeConfirm: "asked: pathway of a simple reflex arc; answer: receptor, sensory neuron, relay neuron in the spinal cord, motor neuron, effector (muscle); Fig. 6.2 labels receptors in skin, sensory neuron, spinal cord (CNS), relay neuron, motor neuron, effector = muscle in arm",
    confirmedBy: BY_D,
  },
  {
    kind: "crop",
    questionId: "sci-bio-cc-3m-2026-01",
    slot: "solution",
    filePath: `${CC_DIR}ncert-fig-6-2-reflex-arc.webp`,
    alt: "Reflex arc: heat/pain receptors in the skin, sensory neuron to the spinal cord, relay neuron, motor neuron to the muscle in the arm (effector)",
    source: { file: NCERT_CC, page: 4, figure: "NCERT Class 10 Science, Fig. 6.2" },
    eyeConfirm: "asked: reflex-arc pathway with a labelled diagram; answer: receptor, sensory neuron, relay neuron in the spinal cord, motor neuron, effector (muscle); Fig. 6.2 labels receptors in skin, sensory neuron, spinal cord (CNS), relay neuron, motor neuron, effector = muscle in arm",
    confirmedBy: BY_D,
  },
  {
    kind: "crop",
    questionId: "CC-H01",
    slot: "solution",
    filePath: `${CC_DIR}ncert-fig-6-3-human-brain.webp`,
    alt: "Human brain: cerebrum, mid-brain, hypothalamus, pituitary gland, pons, medulla, cerebellum and spinal cord, with the fore-, mid- and hind-brain regions",
    source: { file: NCERT_CC, page: 5, figure: "NCERT Class 10 Science, Fig. 6.3" },
    eyeConfirm: "asked: cerebrum, cerebellum, medulla oblongata; answer adds pons and the fore/mid/hind-brain regions; Fig. 6.3 labels all",
    confirmedBy: BY_D,
  },
  {
    kind: "crop",
    questionId: "SCQ-S-CTRL-039",
    slot: "solution",
    filePath: `${CC_DIR}ncert-fig-6-3-human-brain.webp`,
    alt: "Human brain: cerebrum, mid-brain, hypothalamus, pituitary gland, pons, medulla, cerebellum and spinal cord, with the fore-, mid- and hind-brain regions",
    source: { file: NCERT_CC, page: 5, figure: "NCERT Class 10 Science, Fig. 6.3" },
    eyeConfirm: "asked: cerebrum, cerebellum, medulla; answer adds pons, hypothalamus and the three regions; Fig. 6.3 labels all",
    confirmedBy: BY_D,
  },
  {
    kind: "crop",
    questionId: "SCQ-S-CTRL-043",
    slot: "solution",
    part: "(a) geotropism",
    filePath: `${CC_DIR}ncert-fig-6-6-geotropism.webp`,
    alt: "Potted plant laid on its side: the shoot bends upward (negatively geotropic) and the roots grow downward (positively geotropic)",
    source: { file: NCERT_CC, page: 8, figure: "NCERT Class 10 Science, Fig. 6.6" },
    eyeConfirm: "asked (a): labelled diagram of gravity changing growth direction; answer: shoot up (negatively geotropic), root down (positively geotropic); Fig. 6.6 labels both. The light part is NOT bound: Fig. 6.5 carries no labels",
    confirmedBy: BY_D,
  },
  {
    kind: "crop",
    questionId: "REP-M08",
    slot: "solution",
    filePath: `${RP_DIR}ncert-fig-7-11-female-reproductive-system.webp`,
    alt: "Human female reproductive system: ovaries, oviducts (fallopian tubes), uterus, cervix and vagina",
    source: { file: NCERT_RP, page: 11, figure: "NCERT Class 10 Science, Fig. 7.11" },
    eyeConfirm: "answer: ovaries, fallopian tubes (oviducts), uterus, cervix, vagina; Fig. 7.11 labels all five",
    confirmedBy: BY_D,
  },
  {
    kind: "crop",
    questionId: "REP-H01",
    slot: "solution",
    filePath: `${RP_DIR}ncert-fig-7-11-female-reproductive-system.webp`,
    alt: "Human female reproductive system: ovaries, oviducts (fallopian tubes), uterus, cervix and vagina",
    source: { file: NCERT_RP, page: 11, figure: "NCERT Class 10 Science, Fig. 7.11" },
    eyeConfirm: "asked: labelled female reproductive system; answer: ovaries, fallopian tubes, uterus, cervix, vagina; Fig. 7.11 labels all five",
    confirmedBy: BY_D,
  },
  {
    kind: "crop",
    questionId: "PYQ-S-2024-REPR-006",
    slot: "solution",
    part: "(a) budding in Hydra",
    filePath: `${RP_DIR}ncert-fig-7-4-budding-hydra.webp`,
    alt: "Budding in Hydra: a bud grows out of the parent's body, develops tentacles and becomes a new individual",
    source: { file: NCERT_RP, page: 5, figure: "NCERT Class 10 Science, Fig. 7.4" },
    eyeConfirm: "asked (a): labelled diagram of budding in Hydra; answer: outgrowth (bud) that develops into a tiny individual; Fig. 7.4 labels bud and tentacles across the stages",
    confirmedBy: BY_D,
  },
  {
    kind: "crop",
    questionId: "REPR-EXMPLR-7-LA-005",
    slot: "solution",
    filePath: `${RP_DIR}ncert-fig-7-7-flower-ls.webp`,
    alt: "Longitudinal section of a flower: sepal, petal, stamen (anther, filament) and pistil (stigma, style, ovary)",
    source: { file: NCERT_RP, page: 8, figure: "NCERT Class 10 Science, Fig. 7.7" },
    eyeConfirm: "asked: the four whorls; answer: sepals, petals, stamens (anther, filament), pistil (stigma, style, ovary); Fig. 7.7 labels Sepal, Petal, Stamen, Pistil and each sub-part",
    confirmedBy: BY_D,
  },
];
