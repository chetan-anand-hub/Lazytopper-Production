import type { CanonicalQuestion } from "../../../predictionTypes";

// Source: CBSE Additional Practice Questions 2023-24 — Class X Science (086)
// Papers: Science-PQ.pdf + Science-PQMS.pdf
// topicKey: "acids-bases-and-salts"
// Extraction date: 2026-05-25

export const ACIDS_BASES_SALTS_APQ: CanonicalQuestion[] = [
  // Science-PQ Q3 (Section A, MCQ, 1 mark)
  { id: "APQ-S-ACID-001", competencyVerified: true, subject: "Science", topicKey: "acids-bases-and-salts", subtopic: "Identifying Acids and Bases", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Neetu has two test tubes containing dilute hydrochloric acid and dilute sodium hydroxide solution, but they are not labeled. Adding which of the following solutions to the test tubes will help her visually identify the acidic and basic solution?",
    options: ["only vinegar", "only baking soda", "only sodium chloride", "either vinegar or sodium chloride"],
    answer: "only baking soda",
    solutionSteps: ["[0.5 mark] Baking soda (NaHCO3) reacts with acid (HCl) to release CO2 gas (visible effervescence) but does not react visibly with base (NaOH).", "[0.5 mark] Vinegar (an acid) would only react with the base (no visible cue distinguishing test tubes clearly). NaCl gives no reaction with either."],
    finalAnswer: "(b) only baking soda",
    ncertRef: "APQ Science-PQ Q3", isCompetencyBased: true },

  // Science-PQ Q4 (Section A, MCQ, 1 mark)
  { id: "APQ-S-ACID-002", subject: "Science", topicKey: "acids-bases-and-salts", subtopic: "pH of Salt Solutions", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Sonia has aqueous solutions of three salts — sodium acetate, sodium chloride and ammonium chloride — in three test tubes. The test tubes are not labelled. On checking, she finds the pH of the solutions to be 4.6, 7.0 and 8.9. Which of the following correctly matches the salts with their respective pH?",
    options: ["pH 4.6 = sodium acetate, pH 7.0 = sodium chloride, pH 8.9 = ammonium chloride", "pH 4.6 = sodium chloride, pH 7.0 = ammonium chloride, pH 8.9 = sodium acetate", "pH 4.6 = ammonium chloride, pH 7.0 = sodium acetate, pH 8.9 = sodium chloride", "pH 4.6 = ammonium chloride, pH 7.0 = sodium chloride, pH 8.9 = sodium acetate"],
    answer: "pH 4.6 = ammonium chloride, pH 7.0 = sodium chloride, pH 8.9 = sodium acetate",
    solutionSteps: ["Salt of strong acid + strong base (NaCl) → pH neutral ≈ 7.", "Salt of weak acid + strong base (sodium acetate, NaOAc) → pH basic > 7 ⟹ 8.9.", "Salt of strong acid + weak base (NH4Cl) → pH acidic < 7 ⟹ 4.6."],
    finalAnswer: "(d) pH 4.6 = ammonium chloride, pH 7.0 = sodium chloride, pH 8.9 = sodium acetate",
    ncertRef: "APQ Science-PQ Q4", isCompetencyBased: true,
    sourceOverride: "others", },

  // ----- Source: Science-PQ2.pdf + Science-PQMS2.pdf (appended 2026-05-25) -----

  // Science-PQ2 Q3 (Section A, MCQ, 1 mark)
  { id: "APQ-S-ACID-003", subject: "Science", topicKey: "acids-bases-and-salts", subtopic: "Common Salts — Washing Soda", section: "A", marks: 1, format: "MCQ", difficulty: "Easy", bloomSkill: "Remembering",
    questionText: "Washing soda is hydrated:",
    options: ["Sodium hydrogen carbonate", "Calcium hydrogen carbonate", "Slaked carbonate", "Sodium carbonate"],
    answer: "Sodium carbonate",
    solutionSteps: ["[1 mark] Washing soda is the common name for hydrated sodium carbonate, Na2CO3·10 H2O. It is obtained by recrystallisation of sodium carbonate."],
    finalAnswer: "(d) Sodium carbonate",
    ncertRef: "APQ Science-PQ2 Q3", isCompetencyBased: false },

  // Science-PQ2 Q21 (Section B, Short, 2 marks)
  { id: "APQ-S-ACID-004", subject: "Science", topicKey: "acids-bases-and-salts", subtopic: "Neutralisation — Parent Acid and Base of Salts", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Understanding",
    questionText: "Salts are formed by the neutralisation reaction between an acid and a base. Complete the following table by filling the missing data: (1) Ammonium Chloride (NH4Cl): parent base = ?, parent acid = ?. (2) Copper Sulphate (formula = ?): parent base = Cu(OH)2, parent acid = ?.",
    answer: "(1) NH4OH + HCl. (2) CuSO4 ; parent acid H2SO4.",
    solutionSteps: ["[1 mark] NH4Cl is the salt of ammonium hydroxide (NH4OH, weak base) and hydrochloric acid (HCl, strong acid): NH4OH + HCl → NH4Cl + H2O.", "[1 mark] Copper sulphate has formula CuSO4. It is the salt of copper(II) hydroxide (Cu(OH)2, weak base) and sulphuric acid (H2SO4, strong acid): Cu(OH)2 + H2SO4 → CuSO4 + 2 H2O."],
    finalAnswer: "(1) NH4OH, HCl; (2) CuSO4, H2SO4.",
    ncertRef: "APQ Science-PQ2 Q21", isCompetencyBased: true },

  // Science-PQ2 Q37 first variant (Section E, Case-Based, 4 marks)
  { id: "APQ-S-ACID-005", competencyVerified: true, subject: "Science", topicKey: "acids-bases-and-salts", subtopic: "Chlor-alkali Process and Bleaching Powder", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Understanding",
    questionText: "Electricity is passed through an aqueous solution of common salt. A substance 'Z' is produced along with the evolution of gases 'X' and 'Y'. Burning matchstick brought near 'Y' burns with a pop sound; 'X' is used for disinfecting drinking water. When 'X' is passed through slaked lime, an insoluble substance 'A' is produced. (a) Name the gases 'X' and 'Y'. (b) Write the balanced chemical equation for the formation of substance 'A'. (c) Observation when (i) blue litmus is added to aqueous Z, (ii) methyl orange is added to Z.",
    answer: "(a) X = Cl2, Y = H2. (b) Ca(OH)2 + Cl2 → CaOCl2 + H2O. (c)(i) no change to red; (ii) yellow.",
    solutionSteps: ["[1 mark] (a) X = chlorine gas (Cl2) — used to disinfect water; Y = hydrogen gas (H2) — burns with pop sound. Z = sodium hydroxide (NaOH) — the chlor-alkali product.", "[1 mark] (b) Cl2 reacting with slaked lime gives bleaching powder: Ca(OH)2 + Cl2 → CaOCl2 + H2O. Substance A = bleaching powder (CaOCl2).", "[1 mark] (c)(i) Z (NaOH) is basic, so blue litmus does NOT turn red — colour remains blue.", "[1 mark] (c)(ii) Methyl orange in basic medium turns YELLOW."],
    finalAnswer: "(a) Cl2 and H2; (b) Ca(OH)2 + Cl2 → CaOCl2 + H2O; (c) blue litmus unchanged, methyl orange yellow.",
    ncertRef: "APQ Science-PQ2 Q37 (first variant)", isCompetencyBased: true,
 },

  // Science-PQ2 Q37 OR variant (Section E, Case-Based, 4 marks)
  { id: "APQ-S-ACID-006", subject: "Science", topicKey: "acids-bases-and-salts", subtopic: "Reaction of H2 and Cl2; Acidic Nature of Wet HCl", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "In the chlor-alkali process, electrolysis of brine gives gas 'X' (chlorine) at the anode and gas 'Y' (hydrogen) at the cathode.\n(i) Write a balanced chemical equation for the reaction that takes place when 'X' and 'Y' react with each other.\n(ii) The product so formed turns blue litmus red only when it is wet, not when dry. Why?",
    answer: "(i) H2 + Cl2 → 2HCl. (ii) Dry HCl gas does not release H+ ions; only in the presence of water does it ionise (HCl + H2O → H3O+ + Cl−), and these H+ ions turn blue litmus red.",
    solutionSteps: ["[1 mark] (i) H2(g) + Cl2(g) → 2HCl(g).", "[1 mark] (ii) HCl shows acidic behaviour only in water: HCl + H2O → H3O+ + Cl−; dry HCl gives no H+ ions, so only wet HCl turns blue litmus red."],
    finalAnswer: "(i) H2 + Cl2 → 2HCl; (ii) H+ (H3O+) ions form only in the presence of water.",
    ncertRef: "APQ Science-PQ2 Q37 (OR variant)", isCompetencyBased: true,
    sourceOverride: "others", },
];
