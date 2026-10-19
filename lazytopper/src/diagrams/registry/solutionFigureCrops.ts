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
 *
 * SOLUTION-FIGS-1 PR-2 (controller D) — Human Eye (jesc110.pdf) + Magnetic Effects
 * (jesc112.pdf), same rule. Ray diagrams are bound where the row demands no text label the
 * NCERT figure lacks. Not bound, with reason: EYE-EXMPLR-10-SA-001/-002 and
 * sci-phy-eye-3m-2026-01 (steps demand text labels: lens, retina, image position),
 * EYE-EXMPLR-10-SA-006 (all seven colours labelled; Fig. 10.5 labels R and V),
 * CBE-S-HEYE-C-001 / PYQ-S-EYE-003 (B) / PYQ-S-2025-EYE-003 (c)(ii) (red/violet order or labels,
 * observer; Fig. 10.8 does not show them), APQ-S-EYE-002 (three prisms), PYQ-S-2026-LIGHT-009 and
 * HEY-H05's presbyopia (NCERT draws no presbyopia correction), ME-M03 / sci-mec-hpq-2 /
 * SCQ-S-MAG-042 / PYQ-S-2025-MAG-007 (poles or the uniform region marked; Fig. 12.10 does
 * not), PYQ-S-MAG-006 / SCQ-S-MAG-033 / PYQ-S-2025-MAG-005 / PYQ-S-MAG-009 (a specific current
 * direction or viewing face), MAG-NCERT-12-SA-003 (no NCERT figure), PYQ-S-2026-MAG-002
 * (on B's question-figure list; left to B), SCQ-S-EYE-037 (its step 4 calls the normal near point
 * N; Fig. 10.3 keys it N') and EYE-EXMPLR-10-LA-005 (its answer orders the colours V..R from the
 * top; Fig. 10.5 has R at the top): verifier FAIL 2026-10-11, row text to the bank lane.
 *
 * SOLUTION-FIGS-1 PR-3 (controller D) — Carbon (jesc104.pdf), Metals (jesc103.pdf) and one
 * Chemical Reactions row that asks for the NaCl electron transfer (Fig. 3.5), same rule. Not
 * bound, with reason: the NCERT electron-dot exercise rows (CO2, S8, cyclopentane, CCl4, C3H6O
 * isomers, ethanoic acid / H2S / propanone / F2, ethyne, Cl2: NCERT prints no figure of these
 * answers), CARB-EXMPLR-4-MCQ-010/-022 and APQ-S-CARB-006 (MCQs: the options are the figures),
 * PYQ-S-CARB-003 (a)(i) (Fig. 4.8 (b) draws both C4H10 isomers), MNM2-047 (no NCERT figure of
 * galvanised iron), METAL-NCERT-3-LONG-001 / SCQ-S-METAL-040 / LTG-S-METAL-290 (Na2O, MgO,
 * CaCl2, CaO: NCERT draws NaCl and MgCl2 only), CBE-S-MNM-D-001 (alumina electrolysis: no
 * NCERT figure), MNM-M03 (its step asks to label the ionic bond; Fig. 3.5 does not; verifier
 * FAIL 2026-10-11).
 *
 * SOLUTION-FIGS-1 PR-4 (controller D) — Electricity (jesc111.pdf) + Heredity (jesc108.pdf),
 * same rule. Not bound, with reason: EL-H04 / SP-S-2023-ELEC-C-001 (answers include a
 * rheostat; Fig. 11.2 has none), the circuits with given resistor values
 * (ELEC-NCERT-11-SA-017, ELEC-NCERT-11-LA-002, ELEC-EXMPLR-11-LA-001, PYQ-S-2025-ELEC-007:
 * no NCERT figure draws them; no circuit builder yet), SCQ-S-ELEC-041 (needs a question
 * figure: B's Rule-5 lane), PYQ-S-ELEC-003 (B's list), sci-he-comp-01 / CBE-S-HERD-* /
 * sci-bio-heredity-3m-2026-01
 * (Punnett squares or other allele letters; NCERT draws neither), OE-C01 (Fig. 13.1 is
 * unlabelled).
 *
 * SOLUTION-FIGS-1 PR-5 (controller D) — Light rows the optics builder does not cover:
 * NCERT Fig. 9.10 (jesc109.pdf, glass slab) and the existing Fig. 10.4 prism crop. Not
 * bound, with reason: FND-L-SPQ-014 (asks angles i, r, e; Fig. 9.10 marks i1, r1, i2, r2),
 * SCQ-S-LIGHT-033 / GDR-L-NUM-071 (lateral displacement marked; Fig. 9.10 does not),
 * sci-light-hpq-3 (a single glass-to-air interface), PYQ-S-2024-LIGHT-009 (B's list), and the
 * Light MCQs / CBE / CFPQ rows whose figure is part of the question.
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
const NCERT_EYE = "NCERT Class 10 Science (Reprint 2026-27) jesc110.pdf";
const NCERT_MAG = "NCERT Class 10 Science (Reprint 2026-27) jesc112.pdf";
const EYE_DIR = "/figures/solutions/ncert-science/human-eye-and-colourful-world/";
const MAG_DIR = "/figures/solutions/ncert-science/magnetic-effects-of-electric-current/";
const NCERT_CARB = "NCERT Class 10 Science (Reprint 2026-27) jesc104.pdf";
const NCERT_MET = "NCERT Class 10 Science (Reprint 2026-27) jesc103.pdf";
const CARB_DIR = "/figures/solutions/ncert-science/carbon-and-its-compounds/";
const MET_DIR = "/figures/solutions/ncert-science/metals-and-non-metals/";
const NCERT_ELEC = "NCERT Class 10 Science (Reprint 2026-27) jesc111.pdf";
const NCERT_HER = "NCERT Class 10 Science (Reprint 2026-27) jesc108.pdf";
const ELEC_DIR = "/figures/solutions/ncert-science/electricity/";
const HER_DIR = "/figures/solutions/ncert-science/heredity/";
const NCERT_LIGHT = "NCERT Class 10 Science (Reprint 2026-27) jesc109.pdf";
const LIGHT_DIR = "/figures/solutions/ncert-science/light-reflection-and-refraction/";
// HIDE8-FIG8-1 Part B: official CBSE 2026 marking schemes. Each `file` is a key of REFILE_PYQ2026_SOURCES
// (bankFix/refilePyq2026Ledger.ts), which records the SHA-256 of that PDF; the pin test asserts it.
const MS_SCI_31_2 = "https://www.cbse.gov.in/cbsenew/marking-scheme/2026/X/086_SCIENCE.zip#086_SCIENCE/X_086_Set-.2(31.2.1 to 31.2.3) in  ENGLISH.pdf";
const MS_SCI_31_4 = "https://www.cbse.gov.in/cbsenew/marking-scheme/2026/X/086_SCIENCE.zip#086_SCIENCE/Revised MS X_086_31.4 ALL ENGLISH.pdf";
const MS_SCI_31_5 = "https://www.cbse.gov.in/cbsenew/marking-scheme/2026/X/086_SCIENCE.zip#086_SCIENCE/X_086_Set-5 (31.5.1 to 31.5.3)  in ENGLISH.pdf";
const MS_MATHS_30_4_1 = "https://www.cbse.gov.in/cbsenew/marking-scheme/2026/X/041_MATHEMATICS_STANDARD.zip#041_MATHEMATICS STANDARD/MS_X_041_Mathematics_30-4-1_2025-26 (1).pdf";
const MS26_DIR = "/figures/solutions/cbse-ms-2026/";
const BY_H8 = "HIDE8-FIG8-1 builder: row read + crop eye-checked against the scheme page (PDF re-hashed against the ledger), 2026-10-19";

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
  {
    kind: "crop",
    questionId: "HEY-H01",
    slot: "solution",
    filePath: `${EYE_DIR}ncert-fig-10-1-human-eye.webp`,
    alt: "Human eye: cornea, aqueous humour, pupil, iris, crystalline lens, ciliary muscles, vitreous humour, retina and optic nerve",
    source: { file: NCERT_EYE, page: 1, figure: "NCERT Class 10 Science, Fig. 10.1" },
    eyeConfirm: "asked: cornea, iris, eye lens, retina, optic nerve; answer adds aqueous humour, pupil, ciliary muscles, vitreous humour; Fig. 10.1 labels all nine",
    confirmedBy: BY_D,
  },
  {
    kind: "crop",
    questionId: "HEY-M01",
    slot: "solution",
    filePath: `${EYE_DIR}ncert-fig-10-2-myopia.webp`,
    alt: "Myopia: (a) far point of a myopic eye, (b) image of a distant object formed in front of the retina, (c) correction with a concave lens",
    source: { file: NCERT_EYE, page: 3, figure: "NCERT Class 10 Science, Fig. 10.2" },
    eyeConfirm: "asked: myopia with a ray diagram and its correction; Fig. 10.2 draws (b) the myopic eye (image in front of the retina) and (c) correction with a concave lens",
    confirmedBy: BY_D,
  },
  {
    kind: "crop",
    questionId: "HEY-H05",
    slot: "solution",
    part: "myopia",
    filePath: `${EYE_DIR}ncert-fig-10-2-myopia.webp`,
    alt: "Myopia: (a) far point of a myopic eye, (b) image of a distant object formed in front of the retina, (c) correction with a concave lens",
    source: { file: NCERT_EYE, page: 3, figure: "NCERT Class 10 Science, Fig. 10.2" },
    eyeConfirm: "asked: a ray diagram for each defect; this part: myopia, defect and concave-lens correction (Fig. 10.2 (b), (c))",
    confirmedBy: BY_D,
  },
  {
    kind: "crop",
    questionId: "HEY-H05",
    slot: "solution",
    part: "hypermetropia",
    filePath: `${EYE_DIR}ncert-fig-10-3-hypermetropia.webp`,
    alt: "Hypermetropia: (a) near point N of a hypermetropic eye, (b) rays from N' focused behind the retina, (c) correction with a convex lens",
    source: { file: NCERT_EYE, page: 3, figure: "NCERT Class 10 Science, Fig. 10.3" },
    eyeConfirm: "asked: a ray diagram for each defect; this part: hypermetropia, image behind the retina and convex-lens correction (Fig. 10.3 (b), (c)). Presbyopia not bound: no NCERT figure",
    confirmedBy: BY_D,
  },
  {
    kind: "crop",
    questionId: "HEY-D04",
    slot: "solution",
    part: "myopia",
    filePath: `${EYE_DIR}ncert-fig-10-2-myopia.webp`,
    alt: "Myopia: (a) far point of a myopic eye, (b) image of a distant object formed in front of the retina, (c) correction with a concave lens",
    source: { file: NCERT_EYE, page: 3, figure: "NCERT Class 10 Science, Fig. 10.2" },
    eyeConfirm: "asked: myopia and hypermetropia with ray diagrams and correction; this part: Fig. 10.2 (concave lens)",
    confirmedBy: BY_D,
  },
  {
    kind: "crop",
    questionId: "HEY-D04",
    slot: "solution",
    part: "hypermetropia",
    filePath: `${EYE_DIR}ncert-fig-10-3-hypermetropia.webp`,
    alt: "Hypermetropia: (a) near point N of a hypermetropic eye, (b) rays from N' focused behind the retina, (c) correction with a convex lens",
    source: { file: NCERT_EYE, page: 3, figure: "NCERT Class 10 Science, Fig. 10.3" },
    eyeConfirm: "asked: myopia and hypermetropia with ray diagrams and correction; this part: Fig. 10.3 (convex lens)",
    confirmedBy: BY_D,
  },
  {
    kind: "crop",
    questionId: "SCQ-S-EYE-031",
    slot: "solution",
    part: "b. correction",
    filePath: `${EYE_DIR}ncert-fig-10-2-myopia.webp`,
    alt: "Myopia: (a) far point of a myopic eye, (b) image of a distant object formed in front of the retina, (c) correction with a concave lens",
    source: { file: NCERT_EYE, page: 3, figure: "NCERT Class 10 Science, Fig. 10.2" },
    eyeConfirm: "asked (b): ray diagram showing how myopia (cannot read the blackboard) is remedied; answer: concave lens; Fig. 10.2 (c) correction for myopia with a concave lens",
    confirmedBy: BY_D,
  },
  {
    kind: "crop",
    questionId: "EYE-NCERT-10-SA-007",
    slot: "solution",
    part: "diagram",
    filePath: `${EYE_DIR}ncert-fig-10-3-hypermetropia.webp`,
    alt: "Hypermetropia: (a) near point N of a hypermetropic eye, (b) rays from N' focused behind the retina, (c) correction with a convex lens",
    source: { file: NCERT_EYE, page: 3, figure: "NCERT Class 10 Science, Fig. 10.3" },
    eyeConfirm: "asked: a diagram showing how hypermetropia is corrected; answer: convex lens; Fig. 10.3 (c) correction for hypermetropic eye",
    confirmedBy: BY_D,
  },

  {
    kind: "crop",
    questionId: "EYE-EXMPLR-10-LA-003",
    slot: "solution",
    filePath: `${EYE_DIR}ncert-fig-10-4-prism-refraction.webp`,
    alt: "Refraction through a triangular glass prism: incident ray PE, refracted ray EF, emergent ray FS, angles i, r, e, A and the angle of deviation D",
    source: { file: NCERT_EYE, page: 6, figure: "NCERT Class 10 Science, Fig. 10.4" },
    eyeConfirm: "asked: labelled ray diagram of refraction through a prism and the angle of deviation; answer names PE, EF, FS, angles i, r, e, A and D at the same letters; Fig. 10.4 labels all",
    confirmedBy: BY_D,
  },

  {
    kind: "crop",
    questionId: "PYQ-S-EYE-003",
    slot: "solution",
    part: "(A) dispersion",
    filePath: `${EYE_DIR}ncert-fig-10-5-dispersion.webp`,
    alt: "Dispersion of a white light beam by a glass prism into a spectrum, red at the top and violet at the bottom",
    source: { file: NCERT_EYE, page: 7, figure: "NCERT Class 10 Science, Fig. 10.5" },
    eyeConfirm: "asked (A): diagram of dispersion of white light; answer: red least deviated at the top, violet at the bottom; Fig. 10.5 labels white light beam, glass prism, R at the top and V at the bottom",
    confirmedBy: BY_D,
  },
  {
    kind: "crop",
    questionId: "HEY-H06",
    slot: "solution",
    filePath: `${EYE_DIR}ncert-fig-10-6-recombination.webp`,
    alt: "Recombination: prism P1 splits white light into R to V, an inverted identical prism P2 recombines it into white light on the screen",
    source: { file: NCERT_EYE, page: 7, figure: "NCERT Class 10 Science, Fig. 10.6" },
    eyeConfirm: "asked: Newton's two-prism experiment; answer: first prism splits, inverted second prism recombines into white light; Fig. 10.6 draws P1, inverted P2, R/V and white light on the screen",
    confirmedBy: BY_D,
  },
  {
    kind: "crop",
    questionId: "EYE-EXMPLR-10-SA-005",
    slot: "solution",
    filePath: `${EYE_DIR}ncert-fig-10-6-recombination.webp`,
    alt: "Recombination: prism P1 splits white light into R to V, an inverted identical prism P2 recombines it into white light on the screen",
    source: { file: NCERT_EYE, page: 7, figure: "NCERT Class 10 Science, Fig. 10.6" },
    eyeConfirm: "asked: two identical prisms giving white light out of the second, draw the diagram; the row's own step cites NCERT Fig. 10.6",
    confirmedBy: BY_D,
  },
  {
    kind: "crop",
    questionId: "APQ-S-EYE-006",
    slot: "solution",
    part: "(b) recombination",
    filePath: `${EYE_DIR}ncert-fig-10-6-recombination.webp`,
    alt: "Recombination: prism P1 splits white light into R to V, an inverted identical prism P2 recombines it into white light on the screen",
    source: { file: NCERT_EYE, page: 7, figure: "NCERT Class 10 Science, Fig. 10.6" },
    eyeConfirm: "asked (b): diagram showing recombination of the spectrum; answer: Prism 1 disperses, inverted Prism 2 recombines on the screen; Fig. 10.6",
    confirmedBy: BY_D,
  },
  {
    kind: "crop",
    questionId: "PYQ-S-2025-EYE-003",
    slot: "solution",
    part: "(c)(i) recombination",
    filePath: `${EYE_DIR}ncert-fig-10-6-recombination.webp`,
    alt: "Recombination: prism P1 splits white light into R to V, an inverted identical prism P2 recombines it into white light on the screen",
    source: { file: NCERT_EYE, page: 7, figure: "NCERT Class 10 Science, Fig. 10.6" },
    eyeConfirm: "asked (c)(i): labelled ray diagram of an arrangement to recombine the spectrum; answer: two identical prisms, B inverted with respect to A; Fig. 10.6 (P1, P2, R, V, white light, screen)",
    confirmedBy: BY_D,
  },
  {
    kind: "crop",
    questionId: "PYQ-S-EYE-001",
    slot: "solution",
    part: "(a) rainbow",
    filePath: `${EYE_DIR}ncert-fig-10-8-rainbow.webp`,
    alt: "Rainbow formation: sunlight refracted and dispersed on entering a raindrop, internally reflected, and refracted again on leaving",
    source: { file: NCERT_EYE, page: 7, figure: "NCERT Class 10 Science, Fig. 10.8" },
    eyeConfirm: "asked (a): labelled ray diagram of rainbow formation; answer names no labels; Fig. 10.8 labels sunlight and raindrop and draws refraction, dispersion, internal reflection and refraction out",
    confirmedBy: BY_D,
  },
  {
    kind: "crop",
    questionId: "PYQ-S-2026-EYE-004",
    slot: "solution",
    filePath: `${EYE_DIR}ncert-fig-10-8-rainbow.webp`,
    alt: "Rainbow formation: sunlight refracted and dispersed on entering a raindrop, internally reflected, and refracted again on leaving",
    source: { file: NCERT_EYE, page: 7, figure: "NCERT Class 10 Science, Fig. 10.8" },
    eyeConfirm: "asked: labelled ray diagram for rainbow formation; answer: refraction and dispersion, internal reflection, refraction on leaving the drop; Fig. 10.8 draws exactly that, labelling sunlight and raindrop",
    confirmedBy: BY_D,
  },
  {
    kind: "crop",
    questionId: "SCQ-S-MAG-044",
    slot: "solution",
    part: "(a) bar magnet",
    filePath: `${MAG_DIR}ncert-fig-12-4-bar-magnet-field-lines.webp`,
    alt: "Magnetic field lines around a bar magnet: closed curves leaving the N pole and entering the S pole, crowded near the poles, arrows marked",
    source: { file: NCERT_MAG, page: 3, figure: "NCERT Class 10 Science, Fig. 12.4" },
    eyeConfirm: "asked (a): field lines of a bar magnet; answer: N to S outside, closed curves with arrows, crowded near the poles; Fig. 12.4 shows all of these",
    confirmedBy: BY_D,
  },
  {
    kind: "crop",
    questionId: "PYQ-S-2026-MAG-003",
    slot: "solution",
    part: "(A)(i) bar magnet",
    filePath: `${MAG_DIR}ncert-fig-12-4-bar-magnet-field-lines.webp`,
    alt: "Magnetic field lines around a bar magnet: closed curves leaving the N pole and entering the S pole, crowded near the poles, arrows marked",
    source: { file: NCERT_MAG, page: 3, figure: "NCERT Class 10 Science, Fig. 12.4" },
    eyeConfirm: "asked (A)(i): field lines around a bar magnet; answer: closed curves leaving N, entering S, arrows marked; Fig. 12.4",
    confirmedBy: BY_D,
  },
  {
    kind: "crop",
    questionId: "MAG-EXMPLR-12-LA-003",
    slot: "solution",
    filePath: `${MAG_DIR}ncert-fig-12-8-circular-loop-field.webp`,
    alt: "Magnetic field lines of a current-carrying circular loop, with the current direction (+, -) and the N and S faces marked",
    source: { file: NCERT_MAG, page: 6, figure: "NCERT Class 10 Science, Fig. 12.8" },
    eyeConfirm: "asked: labelled diagram of the field of a current through a circular loop; answer: current direction marked, lines through the loop, N face and S face; Fig. 12.8 marks +/- current, N and S",
    confirmedBy: BY_D,
  },
  {
    kind: "crop",
    questionId: "PYQ-S-MAG-007",
    slot: "solution",
    filePath: `${MAG_DIR}ncert-fig-12-10-solenoid-field.webp`,
    alt: "Field lines of a current-carrying solenoid: parallel straight lines inside, and outside like a bar magnet from N to S, with the battery and key",
    source: { file: NCERT_MAG, page: 7, figure: "NCERT Class 10 Science, Fig. 12.10" },
    eyeConfirm: "asked: pattern of the field around a current-carrying solenoid; answer: parallel inside, N to S outside like a bar magnet, current and field directions marked; Fig. 12.10 marks battery polarity, arrows and S/N ends",
    confirmedBy: BY_D,
  },
  {
    kind: "crop",
    questionId: "APQ-S-MAG-006",
    slot: "solution",
    part: "(a) solenoid",
    filePath: `${MAG_DIR}ncert-fig-12-10-solenoid-field.webp`,
    alt: "Field lines of a current-carrying solenoid: parallel straight lines inside, and outside like a bar magnet from N to S, with the battery and key",
    source: { file: NCERT_MAG, page: 7, figure: "NCERT Class 10 Science, Fig. 12.10" },
    eyeConfirm: "asked (a): field-line pattern of a current-carrying solenoid; answer: parallel inside, N to S outside, current and field directions; Fig. 12.10",
    confirmedBy: BY_D,
  },
  {
    kind: "crop",
    questionId: "PYQ-S-2024-MAG-003",
    slot: "solution",
    part: "(b) solenoid",
    filePath: `${MAG_DIR}ncert-fig-12-10-solenoid-field.webp`,
    alt: "Field lines of a current-carrying solenoid: parallel straight lines inside, and outside like a bar magnet from N to S, with the battery and key",
    source: { file: NCERT_MAG, page: 7, figure: "NCERT Class 10 Science, Fig. 12.10" },
    eyeConfirm: "asked (b): field lines inside a current-carrying solenoid; answer: parallel straight lines, uniform field; Fig. 12.10",
    confirmedBy: BY_D,
  },
  {
    kind: "crop",
    questionId: "PYQ-S-2024-MAG-004",
    slot: "solution",
    part: "(b) solenoid",
    filePath: `${MAG_DIR}ncert-fig-12-10-solenoid-field.webp`,
    alt: "Field lines of a current-carrying solenoid: parallel straight lines inside, and outside like a bar magnet from N to S, with the battery and key",
    source: { file: NCERT_MAG, page: 7, figure: "NCERT Class 10 Science, Fig. 12.10" },
    eyeConfirm: "asked (b): field lines inside a current-carrying solenoid; answer: uniform field (any one diagram); Fig. 12.10",
    confirmedBy: BY_D,
  },
  {
    kind: "crop",
    questionId: "PYQ-S-2026-MAG-003",
    slot: "solution",
    part: "(B)(i) solenoid",
    filePath: `${MAG_DIR}ncert-fig-12-10-solenoid-field.webp`,
    alt: "Field lines of a current-carrying solenoid: parallel straight lines inside, and outside like a bar magnet from N to S, with the battery and key",
    source: { file: NCERT_MAG, page: 7, figure: "NCERT Class 10 Science, Fig. 12.10" },
    eyeConfirm: "asked (B)(i): field lines of a current-carrying solenoid with direction marked; answer: parallel inside, spreading at the ends like a bar magnet; Fig. 12.10",
    confirmedBy: BY_D,
  },
  {
    kind: "crop",
    questionId: "MAG-EXMPLR-12-LA-007",
    slot: "solution",
    filePath: `${MAG_DIR}ncert-fig-12-15-domestic-circuit.webp`,
    alt: "Schematic domestic circuit: earth, live and neutral wires, electricity board's fuse, meter, distribution box with main switch and fuses, sockets in parallel at 220 V",
    source: { file: NCERT_MAG, page: 11, figure: "NCERT Class 10 Science, Fig. 12.15" },
    eyeConfirm: "asked: schematic diagram of common domestic circuits; answer: live (red) and neutral (black) at 220 V through the main fuse, meter and distribution box, appliances in parallel, earth wire; Fig. 12.15 labels all",
    confirmedBy: BY_D,
  },
  {
    kind: "crop",
    questionId: "CARB-H03",
    slot: "solution",
    filePath: `${CARB_DIR}ncert-fig-4-12-micelle.webp`,
    alt: "Formation of micelles: soap molecules arranged around an oil droplet, ionic (Na+) ends facing outward into water, carbon chains pointing inward",
    source: { file: NCERT_CARB, page: 17, figure: "NCERT Class 10 Science, Fig. 4.12" },
    eyeConfirm: "asked: cleansing action of soap with a diagram of micelle formation; answer: ionic heads outward into water, carbon-chain tails inward around the oil droplet; Fig. 4.12 draws exactly that, labelling Na+ and the oil droplet",
    confirmedBy: BY_D,
  },
  {
    kind: "crop",
    questionId: "PYQ-S-CARB-003",
    slot: "solution",
    part: "(b)(ii) micelle",
    filePath: `${CARB_DIR}ncert-fig-4-12-micelle.webp`,
    alt: "Formation of micelles: soap molecules arranged around an oil droplet, ionic (Na+) ends facing outward into water, carbon chains pointing inward",
    source: { file: NCERT_CARB, page: 17, figure: "NCERT Class 10 Science, Fig. 4.12" },
    eyeConfirm: "asked (b)(ii): formation of micelles between oily dirt and soap, with its diagram; answer: the chain end towards the oil droplet, the ionic end facing outside; Fig. 4.12",
    confirmedBy: BY_D,
  },
  {
    kind: "crop",
    questionId: "CARB-EXMPLR-4-LONG-005",
    slot: "solution",
    filePath: `${CARB_DIR}ncert-fig-4-11-ester-formation.webp`,
    alt: "Formation of ester: a test tube containing the reaction mixture warmed in a beaker of water on a wire gauze, tripod stand and burner",
    source: { file: NCERT_CARB, page: 16, figure: "NCERT Class 10 Science, Fig. 4.11" },
    eyeConfirm: "asked: activity for preparing an ester with a well labelled diagram; answer: the test tube warmed in a water-bath beaker; Fig. 4.11 labels test tube containing reaction mixture, water, beaker, wire gauze, tripod stand, burner",
    confirmedBy: BY_D,
  },
  {
    kind: "crop",
    questionId: "SCQ-S-CARB-028",
    slot: "solution",
    part: "cyclohexane",
    filePath: `${CARB_DIR}ncert-fig-4-9-cyclohexane.webp`,
    alt: "Structure of cyclohexane: (a) the six-carbon ring skeleton, (b) the complete molecule, every carbon bonded to two hydrogens by single bonds",
    source: { file: NCERT_CARB, page: 8, figure: "NCERT Class 10 Science, Fig. 4.9" },
    eyeConfirm: "asked: compare benzene and cyclohexane by drawing them; answer: cyclohexane has all single bonds; Fig. 4.9 (b) draws the complete molecule",
    confirmedBy: BY_D,
  },
  {
    kind: "crop",
    questionId: "SCQ-S-CARB-028",
    slot: "solution",
    part: "benzene",
    filePath: `${CARB_DIR}ncert-fig-4-10-benzene.webp`,
    alt: "Structure of benzene, C6H6: a six-carbon ring with three alternating double bonds, one hydrogen on each carbon",
    source: { file: NCERT_CARB, page: 8, figure: "NCERT Class 10 Science, Fig. 4.10" },
    eyeConfirm: "asked: compare benzene and cyclohexane by drawing them; answer: benzene has 3 double bonds; Fig. 4.10 draws them",
    confirmedBy: BY_D,
  },

  {
    kind: "crop",
    questionId: "CR2-049",
    slot: "solution",
    part: "(a) electron transfer",
    filePath: `${MET_DIR}ncert-fig-3-5-sodium-chloride.webp`,
    alt: "Formation of sodium chloride: Na (2,8,1) loses an electron to Cl (2,8,7), shown with dots and crosses, giving Na+ and Cl- ions",
    source: { file: NCERT_MET, page: 11, figure: "NCERT Class 10 Science, Fig. 3.5" },
    eyeConfirm: "asked (a): electron-dot structures showing the transfer of electrons in 2Na + Cl2 -> 2NaCl; Fig. 3.5 draws the Na -> Cl electron transfer with dots and crosses",
    confirmedBy: BY_D,
  },
  {
    kind: "crop",
    questionId: "METAL-EXMPLR-3-LONG-004",
    slot: "solution",
    part: "(ii) electrolytic refining",
    filePath: `${MET_DIR}ncert-fig-3-12-electrolytic-refining.webp`,
    alt: "Electrolytic refining of copper: impure copper anode, pure copper cathode, acidified copper sulphate solution in a tank, key and battery, anode mud below the anode",
    source: { file: NCERT_MET, page: 16, figure: "NCERT Class 10 Science, Fig. 3.12" },
    eyeConfirm: "asked (ii): a neat, well-labelled diagram of electrolytic refining of copper; answer: tank, impure Cu anode (+), pure Cu cathode (-), CuSO4 electrolyte, switch, battery, anode mud; Fig. 3.12 labels anode, cathode, acidified copper sulphate solution, tank, key, impurities (anode mud)",
    confirmedBy: BY_D,
  },
  {
    kind: "crop",
    questionId: "PYQ-S-2026-ELEC-004",
    slot: "solution",
    part: "(b) V-I graph",
    filePath: `${ELEC_DIR}ncert-fig-11-3-v-i-graph.webp`,
    alt: "V-I graph for a nichrome wire: potential difference (V) against current (A), a straight line through the origin",
    source: { file: NCERT_ELEC, page: 6, figure: "NCERT Class 10 Science, Fig. 11.3" },
    eyeConfirm: "asked (b): V-I graph for a conductor obeying Ohm's law; answer: V directly proportional to I at constant temperature; Fig. 11.3 is a straight line through the origin with labelled axes",
    confirmedBy: BY_D,
  },
  {
    kind: "crop",
    questionId: "SCQ-S-ELEC-028",
    slot: "solution",
    part: "(b) battery",
    filePath: `${ELEC_DIR}ncert-table-11-1-battery.webp`,
    alt: "Circuit symbol for a battery or a combination of cells: cells in series, long line +, short line -",
    source: { file: NCERT_ELEC, page: 4, figure: "NCERT Class 10 Science, Table 11.1 (row 2)" },
    eyeConfirm: "asked (b): symbol of a battery; answer: cells in series, long line +, short line -; Table 11.1 row 2 draws exactly that",
    confirmedBy: BY_D,
  },
  {
    kind: "crop",
    questionId: "SCQ-S-ELEC-028",
    slot: "solution",
    part: "(b) rheostat",
    filePath: `${ELEC_DIR}ncert-table-11-1-rheostat.webp`,
    alt: "Circuit symbol for a variable resistance or rheostat: a resistor with an arrow across it, or with a sliding contact",
    source: { file: NCERT_ELEC, page: 5, figure: "NCERT Class 10 Science, Table 11.1 (row 9)" },
    eyeConfirm: "asked (b): symbol of a rheostat; answer: a zigzag resistor with an arrow drawn diagonally across it; Table 11.1 row 9 draws it (and the sliding-contact alternative)",
    confirmedBy: BY_D,
  },
  {
    kind: "crop",
    questionId: "SCQ-S-HERED-034",
    slot: "solution",
    filePath: `${HER_DIR}ncert-fig-8-6-sex-determination.webp`,
    alt: "Sex determination in human beings: the father's X or Y gamete with the mother's X gives an XX girl or an XY boy",
    source: { file: NCERT_HER, page: 5, figure: "NCERT Class 10 Science, Fig. 8.6" },
    eyeConfirm: "asked: a flow chart justifying that a boy or a girl is a matter of chance; answer: the mother gives X, the father X or Y with equal chance; Fig. 8.6 draws XY male / XX female, gametes X, Y, X, zygotes XX and XY, offspring female and male",
    confirmedBy: BY_D,
  },
  {
    kind: "crop",
    questionId: "LIGHT-EXMPLR-9-LA-003",
    slot: "solution",
    filePath: `${LIGHT_DIR}ncert-fig-9-10-glass-slab.webp`,
    alt: "Refraction through a rectangular glass slab: incident ray EO bends towards the normal NN' at O (angles i1, r1), emerges at O' away from the normal MM' (i2, r2), parallel to the incident direction, shifted sideways",
    source: { file: NCERT_LIGHT, page: 14, figure: "NCERT Class 10 Science, Fig. 9.10" },
    eyeConfirm: "asked: laws of refraction with a ray diagram through a rectangular glass slab; answer: i1 and the normal at the first face, r1 < i1 inside, i2 = r1 and r2 = i1 at the second face, emergent ray parallel and laterally displaced; Fig. 9.10 marks i1, r1, i2, r2, both normals and the displaced parallel ray",
    confirmedBy: BY_D,
  },
  {
    kind: "crop",
    questionId: "SP-S-2023-LGHT-D-001",
    slot: "solution",
    part: "(b) glass slab",
    filePath: `${LIGHT_DIR}ncert-fig-9-10-glass-slab.webp`,
    alt: "Refraction through a rectangular glass slab: incident ray EO bends towards the normal NN' at O (angles i1, r1), emerges at O' away from the normal MM' (i2, r2), parallel to the incident direction, shifted sideways",
    source: { file: NCERT_LIGHT, page: 14, figure: "NCERT Class 10 Science, Fig. 9.10" },
    eyeConfirm: "asked (b): ray diagram of refraction through a rectangular glass slab; answer: bends towards the normal at the first surface, emerges parallel with a lateral displacement; Fig. 9.10",
    confirmedBy: BY_D,
  },
  {
    kind: "crop",
    questionId: "GDR-L-CBJ-016",
    slot: "solution",
    part: "(b) glass slab",
    filePath: `${LIGHT_DIR}ncert-fig-9-10-glass-slab.webp`,
    alt: "Refraction through a rectangular glass slab: incident ray EO bends towards the normal NN' at O (angles i1, r1), emerges at O' away from the normal MM' (i2, r2), parallel to the incident direction, shifted sideways",
    source: { file: NCERT_LIGHT, page: 14, figure: "NCERT Class 10 Science, Fig. 9.10" },
    eyeConfirm: "asked (b): ray diagram showing the emergent ray parallel to the incident ray but shifted sideways; answer: towards the normal on entering, away on leaving, parallel and laterally displaced; Fig. 9.10",
    confirmedBy: BY_D,
  },
  {
    kind: "crop",
    questionId: "PYQ-S-2026-LIGHT-015",
    slot: "solution",
    part: "(a) prism",
    filePath: `${EYE_DIR}ncert-fig-10-4-prism-refraction.webp`,
    alt: "Refraction through a triangular glass prism: incident ray PE, refracted ray EF, emergent ray FS, angles i, r, e, A and the angle of deviation D",
    source: { file: NCERT_EYE, page: 6, figure: "NCERT Class 10 Science, Fig. 10.4" },
    eyeConfirm: "asked (a): ray diagram for refraction through a glass prism, marking the angle of refraction and the angle of deviation; Fig. 10.4 marks r at the first face and D, with i, e and A",
    confirmedBy: BY_D,
  },
  // HIDE8-FIG8-1 Part B (19 Oct 2026, owner ruling 06:54 IST "correct and provide diagrams where it is missing"):
  // the drawing each 2026 row's OWN official CBSE marking scheme prints for its answer, cropped at 200 dpi
  // (PyMuPDF 1.27.2.3) from the cbse.gov.in PDF whose SHA-256 is recorded in bankFix/refilePyq2026Ledger.ts
  // (REFILE_PYQ2026_SOURCES; `source.file` is that key). Never redrawn; the row's text steps are unchanged.
  // Not bound, with reason: PYQ-S-2026-EYE-004 (already shows NCERT Fig. 10.8, which the scheme reprints),
  // PYQ-S-2026-ELEC-004 (b) (already shows NCERT Fig. 11.3, the V-I graph), PYQ-S-2026-METAL-007 (B) (the
  // scheme's flow chart is one line of text, which the row carries verbatim). PYQ-S-2026-HERED-010 binds the
  // scheme's parents -> F1 drawing only: the scheme's checkerboard labels its fourth row "Ry" (should be "ry").
  {
    kind: "crop",
    questionId: "PYQ-S-2026-CHEMRXN-021",
    slot: "solution",
    part: "(B)(iii) CaO",
    filePath: `${MS26_DIR}metals-and-non-metals/cbse-ms-2026-31-5-1-q29-cao-electron-dot.webp`,
    alt: "Electron dot structure of CaO: Ca with two dots, curved arrows to O shown with six crosses, giving [Ca2+][:O:]2-",
    source: { file: MS_SCI_31_5, page: 7, figure: "CBSE 2026 Marking Scheme 31/5/1, Q29 (B)(iii)" },
    eyeConfirm: "asked (B)(iii): formation of CaO with electron dot structure; the scheme draws Ca: + O (six crosses) with two arrows -> [Ca2+][:O:]2-, matching the row's step",
    confirmedBy: BY_H8,
  },
  {
    kind: "crop",
    questionId: "PYQ-S-2026-METAL-008",
    slot: "solution",
    part: "(a)(ii) MgO",
    filePath: `${MS26_DIR}metals-and-non-metals/cbse-ms-2026-31-2-1-q26-mgo-electron-dot.webp`,
    alt: "Electron transfer forming MgO: Mg with two dots, curved arrows to O shown with six crosses, giving [Mg2+][O2-]",
    source: { file: MS_SCI_31_2, page: 6, figure: "CBSE 2026 Marking Scheme 31/2/1, Q26 (a)(ii)" },
    eyeConfirm: "asked (a)(ii): how Mg combines with O by transfer of electrons; the scheme draws Mg: + O with two arrows -> [Mg2+][O2-], the row's step 5",
    confirmedBy: BY_H8,
  },
  {
    kind: "crop",
    questionId: "PYQ-S-2026-LIGHT-009",
    slot: "solution",
    part: "(B) correction",
    filePath: `${MS26_DIR}human-eye-and-colourful-world/cbse-ms-2026-31-5-1-q34-hypermetropia-correction.webp`,
    alt: "Correction with a convex lens: rays from an object at N' pass through the lens as if coming from N and meet on the retina of the eye",
    source: { file: MS_SCI_31_5, page: 8, figure: "CBSE 2026 Marking Scheme 31/5/1, Q34 (B)" },
    eyeConfirm: "asked (B): ray diagram correcting the defect of an eye that cannot see closer than 1 m; the scheme draws N, N', a convex lens and the eye with ray directions, as the row's step describes",
    confirmedBy: BY_H8,
  },
  {
    kind: "crop",
    questionId: "PYQ-S-2026-HERED-008",
    slot: "solution",
    part: "(a) cross",
    filePath: `${MS26_DIR}heredity/cbse-ms-2026-31-4-1-q14-red-white-cross.webp`,
    alt: "Cross of RR (red flowers) x rr (white flowers): gametes R and r give F1 Rr (all red); Rr x Rr gametes give F2 RR, Rr, Rr (red) and rr (white)",
    source: { file: MS_SCI_31_4, page: 4, figure: "CBSE 2026 Marking Scheme 31/4/1, Q14 (a)" },
    eyeConfirm: "asked (a): depict the table as a cross; the scheme's drawing shows parents RR x rr, gametes, F1 Rr all red, Rr x Rr and F2 RR Rr Rr rr, matching the row's four (a) steps",
    confirmedBy: BY_H8,
  },
  {
    kind: "crop",
    questionId: "PYQ-S-2026-HERED-010",
    slot: "solution",
    part: "parents to F1",
    filePath: `${MS26_DIR}heredity/cbse-ms-2026-31-5-1-q13-dihybrid-f1-cross.webp`,
    alt: "Parents RRYY (round, yellow) x rryy (wrinkled, green) give F1 RrYy (round, yellow), followed by self pollination",
    source: { file: MS_SCI_31_5, page: 4, figure: "CBSE 2026 Marking Scheme 31/5/1, Q13" },
    eyeConfirm: "asked: the cross up to F2; the scheme's drawing shows parents RRYY x rryy -> F1 RrYy (round, yellow) -> self pollination, the row's step 1; its F2 checkerboard (a text table with a 'Ry' row-label typo) is not cropped",
    confirmedBy: BY_H8,
  },
  {
    kind: "crop",
    questionId: "PYQ-M-2026-CG-003",
    slot: "solution",
    part: "(ii) AP : PD",
    filePath: `${MS26_DIR}coordinate-geometry/cbse-ms-2026-30-4-1-q38-ii-ap-pd.webp`,
    alt: "Line segment from A(-4, 2) to D(-5, -2) with P(x, 0) dividing it in the ratio K : 1",
    source: { file: MS_MATHS_30_4_1, page: 25, figure: "CBSE 2026 Marking Scheme 30/4/1, Q38 (ii)" },
    eyeConfirm: "asked (ii): the ratio in which the X-axis divides AD; the scheme draws A(-4, 2), P(x, 0), D(-5, -2) with K and 1, as the row's step 'P(x, 0) divides AD in the ratio K : 1'",
    confirmedBy: BY_H8,
  },
  {
    kind: "crop",
    questionId: "PYQ-M-2026-CG-003",
    slot: "solution",
    part: "(iii)(b) AO : OB",
    filePath: `${MS26_DIR}coordinate-geometry/cbse-ms-2026-30-4-1-q38-iii-b-ao-ob.webp`,
    alt: "Line segment from A(-4, 2) to B(4, -4) with O(0, 0) marked between them, parts labelled K and 1",
    source: { file: MS_MATHS_30_4_1, page: 25, figure: "CBSE 2026 Marking Scheme 30/4/1, Q38 (iii)(b)" },
    eyeConfirm: "asked (iii)(b): show A, O, B are not collinear using the section formula; the scheme draws A(-4, 2), O(0, 0), B(4, -4) with AO : OB = K : 1, the row's OR step",
    confirmedBy: BY_H8,
  },
];
