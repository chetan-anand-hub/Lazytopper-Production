import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * Carbon and its Compounds — CBSE Sample Question Paper 2023-24 (Science — Code 086)
 * Source: Science-SQP.pdf (8pp) + Science-MS.pdf (6pp), cbseacademic.nic.in
 * Extracted: 2026-05-24 (P2 SQP-only scope; APQ deferred to follow-up PR)
 * topicKey: "carbon-and-its-compounds"
 * Section distribution: D=1, E=1 (case-based)
 */
export const CARBON_COMPOUNDS_SQP: CanonicalQuestion[] = [
  {
    "id": "SQP-S-CC-001",
    "subject": "Science",
    "topicKey": "carbon-and-its-compounds",
    "subtopic": "Substitution Reaction of Methane and Chlor-Alkali Process",
    "section": "D",
    "marks": 5,
    "format": "Long",
    "difficulty": "Hard",
    "bloomSkill": "Analysing",
    "questionText": "(a) Rehmat classified the reaction between Methane and Chlorine in presence of sunlight as a substitution reaction. Support Rehmat's view with suitable justification and illustrate the reaction with the help of a balanced chemical equation.\n(b) Chlorine gas was prepared using electrolysis of brine solution. Write the chemical equation to represent the change. Identify the other products formed in the process and give one application of each.\n\n[OR]\n\nRaina while doing certain reactions observed that heating of substance 'X' with vinegar like smell with a substance 'Y' (which is used as an industrial solvent) in presence of conc. Sulphuric acid on a water bath gives a sweet-smelling liquid 'Z' having molecular formula C₄H₈O₂. When heated with caustic soda (NaOH), 'Z' gives back the sodium salt of X and the compound Y. Identify X, Y, and Z. Illustrate the changes with the help of suitable chemical equations.",
    "options": [],
    "answer": "(a) Substitution justified; CH₄ + Cl₂ → CH₃Cl + HCl (sunlight). (b) Brine electrolysis: 2NaCl + 2H₂O → 2NaOH + Cl₂ + H₂. OR: X = ethanoic acid (CH₃COOH), Y = ethanol (C₂H₅OH), Z = ethyl ethanoate (CH₃COOC₂H₅).",
    "solutionSteps": [
      "(a) Rehmat's observation is correct because in the methane–chlorine reaction in sunlight, hydrogen atoms of methane are substituted (replaced) by chlorine atoms one at a time. Balanced equation (first step): CH₄ + Cl₂ → (sunlight) → CH₃Cl + HCl. Further substitutions yield CH₂Cl₂, CHCl₃, CCl₄ in subsequent steps.",
      "(b) Chlor-alkali process (electrolysis of brine): 2NaCl(aq) + 2H₂O(l) → (electricity) → 2NaOH(aq) + Cl₂(g) + H₂(g). At anode: 2Cl⁻ → Cl₂ + 2e⁻; at cathode: 2H⁺ + 2e⁻ → H₂; Na⁺ + OH⁻ → NaOH.",
      "Other products: NaOH (caustic soda) and H₂. Uses of NaOH (any one): degreasing of metals; soap/detergent making; paper making; artificial fibres. Uses of H₂ (any one): fuel; making margarine (hydrogenation); manufacture of ammonia for fertilizers.",
      "OR (alternative): X = ethanoic acid (CH₃COOH) — has vinegar smell. Y = ethanol (C₂H₅OH) — industrial solvent. Z = ethyl ethanoate (CH₃COOC₂H₅) — sweet-smelling ester, formula C₄H₈O₂.",
      "OR equations: Esterification (with conc. H₂SO₄): CH₃COOH + C₂H₅OH ⇌ CH₃COOC₂H₅ + H₂O. Saponification (with NaOH): CH₃COOC₂H₅ + NaOH → CH₃COONa + C₂H₅OH (yields sodium salt of X back, plus Y)."
    ],
    "finalAnswer": "(a) Substitution: CH₄ + Cl₂ → CH₃Cl + HCl. (b) 2NaCl + 2H₂O → 2NaOH + Cl₂ + H₂. OR: X=CH₃COOH, Y=C₂H₅OH, Z=CH₃COOC₂H₅.",
    "isCompetencyBased": true
  },
  {
    "id": "SQP-S-CC-002",
    "subject": "Science",
    "topicKey": "carbon-and-its-compounds",
    "subtopic": "Case-Based — Quiz: Ethanol Oxidation, Dehydration, Hydrogenation",
    "section": "E",
    "marks": 4,
    "format": "Case-Based",
    "difficulty": "Hard",
    "bloomSkill": "Analysing",
    "questionText": "The table given below shows the hints given by the quiz master in a quiz.\n(i) Substance 'C' is used as a preservative.\n(ii) 'C' has two carbon atoms; 'C' is obtained by the reaction of 'A' in presence of alkaline Potassium permanganate followed by acidification.\n(iii) Misuse of 'A' in industries is prevented by adding Methanol, Benzene, and pyridine to 'A'.\n(iv) 'F' is formed on heating 'A' in presence of conc Sulphuric acid.\n(v) 'F' reacts with Hydrogen gas in presence of Nickel and Palladium catalyst.\n\nBased on the above hints answer the following questions.\n(a) Give the IUPAC names of A and F.\n(b) Illustrate with the help of chemical equations the changes taking place (A→C and A→F).\n\n[OR]\n\nName the chemical reactions which occur in steps 2 and 5. Identify the compounds formed in these steps if 'A' is replaced with its next homologue.",
    "options": [],
    "answer": "(a) A = Ethanol; F = Ethene. (b) A→C: CH₃CH₂OH + [O] → CH₃COOH; A→F: CH₃CH₂OH → (170°C, conc. H₂SO₄) → CH₂=CH₂ + H₂O. OR: Step 2 = Oxidation; Step 5 = Addition/Hydrogenation. With propanol: A→C gives propanoic acid; A→F gives propene.",
    "solutionSteps": [
      "Identifying substances from hints: 'A' is ethanol (CH₃CH₂OH) — denaturation with methanol/benzene/pyridine matches industrial alcohol; 'C' is ethanoic acid (CH₃COOH) — 2-carbon preservative obtained from ethanol via alkaline KMnO₄ then acidification; 'F' is ethene (CH₂=CH₂) — formed from ethanol with conc. H₂SO₄ at ~443 K.",
      "(a) IUPAC names: A = Ethanol (CH₃CH₂OH); F = Ethene (CH₂=CH₂).",
      "(b) A → C is an oxidation reaction. Equation (using alkaline KMnO₄ + H⁺): CH₃CH₂OH + 2(O) → CH₃COOH + H₂O. The oxidising agent supplies two oxygen atoms.",
      "(b) A → F is a dehydration reaction. Equation (conc. H₂SO₄, ~443 K): CH₃CH₂OH → CH₂=CH₂ + H₂O.",
      "F + H₂ → CH₃CH₃ (ethane). Reaction is addition (hydrogenation) with Ni/Pd catalyst.",
      "OR (alternative): Step 2 (A→C) = Oxidation; Step 5 (F + H₂) = Addition / Hydrogenation. If A is replaced with its next homologue propanol (CH₃CH₂CH₂OH), then C becomes propanoic acid (CH₃CH₂COOH) and F becomes propene (CH₃CH=CH₂)."
    ],
    "finalAnswer": "A = Ethanol; F = Ethene. OR Step 2 = Oxidation; Step 5 = Hydrogenation; with propanol → propanoic acid + propene.",
    "isCompetencyBased": true
  }
];
