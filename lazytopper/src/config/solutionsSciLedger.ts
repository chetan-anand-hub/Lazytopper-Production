// src/config/solutionsSciLedger.ts
//
// SOLUTIONS-SCI (owner approval, 6 Nov 2026) — the VERIFICATION LEDGER for the NCERT Class 10
// SCIENCE solutions pages. Read by `scripts/solutions/selectScienceSolutions.ts`: an id marked
// `ref-mismatch` or `hold` is NOT published; `no-verdict` publishes without a typed ✓/✗.
//
// ★ METHOD — the Maths bar (solutions2Ledger.ts), every pass an independent `claude -p` agent with a
//   fresh context, run over EVERY row that passed the deterministic rules (106 for the pilot):
//   1. BOOK CHECK — each row against the full text of its chapter in OUR STORED COPY of the NCERT
//      Class 10 Science textbook (Firebase Storage `ncert/<subject>/ch<N>.pdf`, footer "Reprint
//      2026-27"; text extracted with pymupdf): MATCH / MISMATCH / NOT_FOUND at the cited reference,
//      whether the row's text is FAITHFUL to the 2026-27 book (same data), and whether the book's
//      question depends on a figure or table the row does not carry. Not MATCH → `ref-mismatch`;
//      not faithful or figure-dependent → `hold`.
//   2. SYLLABUS — already screened by code (syllabusGuard.ts Science lists + syllabus2026-27.ts);
//      the auditors also hold any step that teaches content beyond the 2026-27 Class 10 syllabus.
//   3. BLIND SOLVE — EVERY row (not a 20% sample) solved from the question and options ONLY.
//   4. JUDGE + TEXT/STEPS AUDIT — a further agent compared each blind answer with the stored key and
//      re-read every step: any disagreement, a key or step judged wrong, a drafting artifact, or a
//      non-CBSE term → `hold`.
//   5. SECOND AUDIT — a fresh examiner agent re-read every row still publishable after 1-4, tasked
//      only with finding errors; anything flagged → `hold`. The lane builder then spot-read a sample
//      of the remaining rows (MCQs, numericals, a 5-mark row) by hand.
// ★ CONTENT-BOUND. Each publish entry carries `hash` = rowHash() (selectSolutions.ts) of the question,
//   options, keys, steps and ncertRef the verifiers saw; a changed bank row drops off the page as
//   `unverified` until it is verified again. A candidate not listed here is never published.
// ★ HOLDS are bank-repair work: each note says exactly what is wrong, so a bank lane can fix the row
//   and a later lane can re-verify it (new hash) and publish it.

import type { LedgerEntry } from "./solutions2Ledger";

export const SOLUTIONS_SCI_LEDGER: Readonly<Record<string, LedgerEntry>> = {
  // chemical-reactions-and-equations · ncert (book: our Storage copy ncert/chemistry/ch1.pdf, NCERT Reprint 2026-27)
  "CHEM-NCERT-1-VSA-001": { status: "publish", hash: "efc05e412f4b06d6", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "CHEM-NCERT-1-SA-001": { status: "publish", hash: "b5fd03f7c193bcc7", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "CHEM-NCERT-1-SA-002": { status: "hold", note: "judge/audit: Step (ii) says 'O 1+1=1+1', which is wrong. O is 1 on each side (NaOH on the left, H2O on the right)." },
  "CHEM-NCERT-1-SA-003": { status: "publish", hash: "ec810a8e3db1d51f", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "CHEM-NCERT-1-VSA-002": { status: "publish", hash: "1645cded4a4e7754", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "CHEM-NCERT-1-VSA-003": { status: "publish", hash: "b081fb9487a70e83", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "CHEM-NCERT-1-VSA-004": { status: "publish", hash: "bfd4ae291fd94698", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "CHEM-NCERT-1-SA-004": { status: "hold", note: "judge/audit: Step (i) explains O2 as 'gaining electrons / accepting from Na'. That is the electron concept, which is inconsistent with the oxygen-gain/loss framing used here and outside this chapter's treatment." },
  "CHEM-NCERT-1-MCQ-001": { status: "hold", note: "judge/audit: Final step has the drafting artifact 'Answer: (i). Answer: (A)'. The reasoning that (a) is incorrect is also shaky: PbO is reduced to Pb, so 'lead is reduced' is arguable. Rewrite the steps." },
  "CHEM-NCERT-1-MCQ-002": { status: "publish", hash: "3512b825ce80784a", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "CHEM-NCERT-1-MCQ-003": { status: "publish", hash: "56668510cf9ce527", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "CHEM-NCERT-1-SA-005": { status: "publish", hash: "48f0de511b8577fc", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "CHEM-NCERT-1-SA-006": { status: "hold", note: "judge/audit: Step (b) counts O on the RHS as '2+2=4' and then puts 3 before O2. RHS O is actually 2+4=6. The step (b) wording about S is also muddled. The final equation is correct." },
  "CHEM-NCERT-1-SA-007": { status: "publish", hash: "c6b7f6921a82097c", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "CHEM-NCERT-1-LONG-001": { status: "publish", hash: "b0a7bf8fed062ce6", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "CHEM-NCERT-1-SA-009": { status: "publish", hash: "757506788a1d253f", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "CHEM-NCERT-1-SA-010": { status: "publish", hash: "406b1eefa6ab6e8a", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "CHEM-NCERT-1-SA-011": { status: "publish", hash: "d5b6a79802b66868", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "CHEM-NCERT-1-SA-012": { status: "publish", hash: "f3e6036b74b41724", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "CHEM-NCERT-1-SA-013": { status: "publish", hash: "97b7b071f63bcc8f", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "CHEM-NCERT-1-VSA-005": { status: "publish", hash: "a5202461e3710a06", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "CHEM-NCERT-1-SA-014": { status: "publish", hash: "23ee1929754d80bc", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "CHEM-NCERT-1-LONG-002": { status: "publish", hash: "db6da2f2d0314f42", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "CHEM-NCERT-1-VSA-006": { status: "publish", hash: "6bb6a4c47c92b059", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "CHEM-NCERT-1-VSA-007": { status: "publish", hash: "540fa32b8d4c79dd", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  // life-processes · ncert (book: our Storage copy ncert/biology/ch5.pdf, NCERT Reprint 2026-27)
  "LIFE-NCERT-5-SA-001": { status: "publish", hash: "08feb6a4325c07d8", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "LIFE-NCERT-5-VSA-001": { status: "hold", note: "judge/audit: Key is muddled: 'visible movement (or growth, or metabolism)' mixes the criterion with the list of life processes, and the 'visible/invisible movement' step reads as a drafting artifact. The NCERT answer is movement (including growth-related movement), with molecular movement as the non-visible case." },
  "LIFE-NCERT-5-VSA-002": { status: "publish", hash: "daac4aef6c14bc1b", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "LIFE-NCERT-5-VSA-003": { status: "publish", hash: "1f80684ce0e3c549", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "LIFE-NCERT-5-SA-002": { status: "publish", hash: "027dc586c58065f1", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "LIFE-NCERT-5-VSA-004": { status: "hold", note: "second audit: Key and steps disagree. The key lists chlorophyll as the fourth 'raw material', but the steps give minerals instead. Chlorophyll and sunlight are not raw materials; they are conditions." },
  "LIFE-NCERT-5-VSA-005": { status: "publish", hash: "69b1d70f2d965fa2", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "LIFE-NCERT-5-VSA-006": { status: "hold", note: "judge/audit: Step says 'carbohydrates → glucose (by amylase)', but amylase gives maltose, which contradicts the saliva row. Pepsin and trypsin give peptides, not amino acids directly." },
  "LIFE-NCERT-5-VSA-007": { status: "publish", hash: "c62742adda95da5e", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "LIFE-NCERT-5-SA-003": { status: "publish", hash: "847257de2ea7c62a", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "LIFE-NCERT-5-SA-004": { status: "publish", hash: "e0d0a745d0dc76be", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "LIFE-NCERT-5-VSA-008": { status: "hold", note: "judge/audit: The NCERT answer is CO₂ transported dissolved in plasma. The key's bicarbonate and 'bound to haemoglobin' detail is outside the Class 10 syllabus, and 'dissolved bicarbonate' is loosely worded." },
  "LIFE-NCERT-5-VSA-009": { status: "hold", note: "judge/audit: Key says the alveolar area is 'about the size of a tennis court', which is exaggerated and contradicts the steps' ~80 m²." },
  "LIFE-NCERT-5-VSA-010": { status: "hold", note: "second audit: The key says arteries carry oxygenated blood and veins carry deoxygenated blood. This is wrong for the pulmonary artery and pulmonary vein. NCERT defines arteries as carrying blood away from the heart and veins as carrying blood to the heart." },
  "LIFE-NCERT-5-SA-005": { status: "publish", hash: "50798baeb4e03efc", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "LIFE-NCERT-5-VSA-011": { status: "publish", hash: "80e8ea42b57c253f", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "LIFE-NCERT-5-VSA-012": { status: "hold", note: "judge/audit: Step says root hairs absorb water and minerals by osmosis. Minerals are taken up by active transport/ions, not osmosis. Root pressure is omitted." },
  "LIFE-NCERT-5-VSA-013": { status: "publish", hash: "0b62ce5612c3f3d8", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "LIFE-NCERT-5-VSA-014": { status: "hold", note: "second audit: The answer awards marks for tubular 'secretion', proximal tubule, loop of Henle and distal tubule. NCERT Class 10 does not cover these; it covers only filtration, reabsorption and the collecting duct. This is beyond the syllabus but presented as required." },
  "LIFE-NCERT-5-VSA-015": { status: "hold", note: "judge/audit: Key and step say gums and resins are excreted into the soil via roots. In NCERT, gums and resins are stored in old xylem, and separately, some wastes are excreted into the soil." },
  "LIFE-NCERT-5-VSA-016": { status: "hold", note: "second audit: ADH (antidiuretic hormone) and its mechanism are not in NCERT Class 10 but are given as a mark-bearing step. NCERT says only that urine volume depends on the body's water excess and the amount of dissolved waste." },
  "LIFE-NCERT-5-MCQ-001": { status: "publish", hash: "6681b28ca5e8f7da", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "LIFE-NCERT-5-MCQ-002": { status: "publish", hash: "2e5bf2b6fea9ce5a", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "LIFE-NCERT-5-MCQ-003": { status: "publish", hash: "1c0b9db9c1ce3634", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "LIFE-NCERT-5-MCQ-004": { status: "publish", hash: "5bfcbac4a467832c", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "LIFE-NCERT-5-SA-006": { status: "publish", hash: "cc192757648ffa0c", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "LIFE-NCERT-5-VSA-017": { status: "publish", hash: "9c6538e4cb02c7de", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "LIFE-NCERT-5-SA-007": { status: "publish", hash: "77ae2c0fb33d7666", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "LIFE-NCERT-5-LONG-001": { status: "publish", hash: "b7cd7fed89f9d4ea", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "LIFE-NCERT-5-SA-008": { status: "publish", hash: "d5760ffd7015bcd4", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "LIFE-NCERT-5-VSA-018": { status: "publish", hash: "9ae00f96092a9762", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "LIFE-NCERT-5-LONG-002": { status: "publish", hash: "007540bfed108254", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "LIFE-NCERT-5-SA-009": { status: "publish", hash: "45bff7cf1693555f", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "LIFE-NCERT-5-LONG-003": { status: "hold", note: "judge/audit: Steps say 'Both increase surface area massively' and 'both have thin walls', which is unsupported for nephrons. The 'functional unit' and 'passive vs active' framing is also loose." },
  // electricity · ncert (book: our Storage copy ncert/physics/ch11.pdf, NCERT Reprint 2026-27)
  "ELEC-NCERT-11-SA-001": { status: "publish", hash: "b74b391e2eeced93", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "ELEC-NCERT-11-SA-002": { status: "publish", hash: "6d21aa7087206c12", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "ELEC-NCERT-11-SA-003": { status: "publish", hash: "c3d2ceb71de804f0", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "ELEC-NCERT-11-SA-004": { status: "publish", hash: "1c55977bc258e9eb", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "ELEC-NCERT-11-SA-005": { status: "publish", hash: "28f10b1e997cf271", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "ELEC-NCERT-11-SA-006": { status: "publish", hash: "0e358e45c0a914c6", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "ELEC-NCERT-11-SA-007": { status: "publish", hash: "d1c0b14ae2fd1d7f", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "ELEC-NCERT-11-SA-008": { status: "publish", hash: "c965c87a00a84464", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "ELEC-NCERT-11-SA-009": { status: "publish", hash: "c0fad0d30bd834f1", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "ELEC-NCERT-11-SA-010": { status: "publish", hash: "8b0bc80d8b619930", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "ELEC-NCERT-11-SA-011": { status: "publish", hash: "fd89b0b22f077107", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "ELEC-NCERT-11-SA-012": { status: "hold", note: "judge/audit: Claims 'alloys have high melting points' as a general fact; alloys generally melt lower than their constituent metals. The NCERT reasons are higher resistivity and no oxidation at high temperature. Remove the melting-point claim." },
  "ELEC-NCERT-11-SA-014": { status: "publish", hash: "eaf5906ed45f87ee", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "ELEC-NCERT-11-SA-015": { status: "publish", hash: "6e9dde52e68951bd", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "ELEC-NCERT-11-SA-016": { status: "publish", hash: "799548e2907a3458", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "ELEC-NCERT-11-LA-002": { status: "publish", hash: "ac4c04b79931b6bc", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "ELEC-NCERT-11-LA-003": { status: "publish", hash: "88f61c11f432063e", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "ELEC-NCERT-11-SA-018": { status: "publish", hash: "f5182ced9b789748", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "ELEC-NCERT-11-LA-004": { status: "publish", hash: "020dc36946397c5c", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "ELEC-NCERT-11-SA-019": { status: "publish", hash: "7ff7e3bec4443ce4", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "ELEC-NCERT-11-LA-005": { status: "publish", hash: "ba6f5f435c8274a9", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "ELEC-NCERT-11-SA-020": { status: "publish", hash: "c643dded3aa5a0be", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "ELEC-NCERT-11-SA-021": { status: "publish", hash: "f43e9ad59b7f39ce", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "ELEC-NCERT-11-SA-022": { status: "publish", hash: "98c80fc72df0ec8f", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "ELEC-NCERT-11-SA-023": { status: "publish", hash: "1598b087a10007e7", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "ELEC-NCERT-11-LA-008": { status: "hold", note: "judge/audit: The minimum-heating resistance is wrong. The exact value is 220²/360 ≈ 134.4 Ω, but the key gives 134.15 Ω because it rounded I to 1.64 A first. The same rounding makes the 57.60 Ω step slightly off (220/3.82 = 57.59). Compute R = V²/P or use unrounded I." },
  "ELEC-NCERT-11-SA-024": { status: "publish", hash: "a139e62436a5dc59", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "ELEC-NCERT-11-SA-025": { status: "publish", hash: "686b414ca30a5f21", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "ELEC-NCERT-11-SA-026": { status: "publish", hash: "43d18e51cc5fe194", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "ELEC-NCERT-11-LA-010": { status: "publish", hash: "05e030b529f38123", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "ELEC-NCERT-11-MCQ-001": { status: "publish", hash: "38b5fff1c3e71497", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "ELEC-NCERT-11-MCQ-002": { status: "publish", hash: "70ad0e8863156d02", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "ELEC-NCERT-11-MCQ-003": { status: "publish", hash: "b21470a029b74564", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "ELEC-NCERT-11-MCQ-004": { status: "publish", hash: "d937fab134b871bc", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "ELEC-NCERT-11-SA-027": { status: "publish", hash: "1a87cc8943ab73d4", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "ELEC-NCERT-11-LA-011": { status: "publish", hash: "df744dc4e2d34331", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "ELEC-NCERT-11-SA-028": { status: "publish", hash: "e059f2214e64e2c9", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "ELEC-NCERT-11-SA-029": { status: "publish", hash: "fc0a43074b9923bc", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "ELEC-NCERT-11-SA-030": { status: "publish", hash: "516e6a1fb3fd82b3", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "ELEC-NCERT-11-LA-013": { status: "publish", hash: "2af576294f8a8b3d", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "ELEC-NCERT-11-SA-031": { status: "publish", hash: "de49794071642b79", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "ELEC-NCERT-11-LA-014": { status: "publish", hash: "cbfea33c8e7227a6", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "ELEC-NCERT-11-LA-015": { status: "publish", hash: "444bdb229bb407cd", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "ELEC-NCERT-11-SA-032": { status: "publish", hash: "f186f8cc3ab76778", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "ELEC-NCERT-11-SA-033": { status: "publish", hash: "cf0007b2bc1835e2", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
  "ELEC-NCERT-11-SA-034": { status: "hold", note: "book check MATCH but row text not the 2026-27 book's: The reference is correct (Exercise Q17), but the data is wrong. The book says 44 Ω and 5 A for 2 hours. The row says 8 Ω and 15 A. The row's wording also drops 'for' before '2 hours'." },
  "ELEC-NCERT-11-LA-016": { status: "publish", hash: "64dac8d634d1f6ab", note: "book check MATCH, text faithful; syllabus IN (guard); blind solve agrees; judge + text/steps audit clean; second audit clean" },
};
