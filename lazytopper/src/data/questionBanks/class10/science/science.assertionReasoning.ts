import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * Science Assertion-Reason Pack — Electricity + Life Processes
 *
 * Content basis:
 * - CBSE Class X Science SQP 2025-26
 * - NCERT Class X Science Chapter 12 (Electricity)
 * - NCERT Class X Science Chapter 6 (Life Processes)
 * - CBSE Board Papers 2022-2025
 *
 * FORMAT: All AR questions use the same 4 fixed options:
 * (A) Both Assertion and Reason are true and Reason is the correct
 *     explanation of Assertion.
 * (B) Both Assertion and Reason are true but Reason is NOT the correct
 *     explanation of Assertion.
 * (C) Assertion is true but Reason is false.
 * (D) Assertion is false but Reason is true.
 *
 * Section A = 1 mark each.
 *
 * ID format:
 *   AR-EL-001 to AR-EL-010   (Electricity)
 *   AR-LP-001 to AR-LP-010   (Life Processes)
 */
export const SCIENCE_AR_QUESTIONS: CanonicalQuestion[] = [

  // ═══════════════════════════════════════════
  // ELECTRICITY — 10 Assertion-Reason Questions
  // ═══════════════════════════════════════════

  {
    "id": "AR-EL-001",
    "subject": "Science",
    "topicKey": "electricity",
    "subtopic": "Ohm's Law",
    "section": "A",
    "marks": 1,
    "format": "Assertion-Reasoning",
    "difficulty": "Easy",
    "bloomSkill": "Understanding",
    "questionText": "Assertion (A): The current through a resistor is directly proportional to the potential difference across it at constant temperature.\nReason (R): Ohm's Law states that V = IR, where R is constant for a given conductor at constant temperature.",
    "options": [
      "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
      "(B) Both Assertion and Reason are true but Reason is NOT the correct explanation of Assertion.",
      "(C) Assertion is true but Reason is false.",
      "(D) Assertion is false but Reason is true."
    ],
    "answer": "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
    "solutionSteps": [
      "Assertion: I ∝ V at constant temperature — this is the direct statement of Ohm's Law. TRUE.",
      "Reason: V = IR where R is constant at constant temperature. Rearranging: I = V/R, confirming I ∝ V. TRUE.",
      "R is the exact law that explains A.",
      "Answer: (A)"
    ],
    "finalAnswer": "(A)",
    "explanation": "Both true. Ohm's Law (V = IR, R constant) directly explains the proportional relationship between I and V stated in A.",
    "isCompetencyBased": false,
    "pyqYear": "2024",
    "pyqSet": "30/1/1",
    "ncertRef": "NCERT Ch12 InText, Ex 12.1"
  },

  {
    "id": "AR-EL-002",
    "subject": "Science",
    "topicKey": "electricity",
    "subtopic": "Resistance",
    "section": "A",
    "marks": 1,
    "format": "Assertion-Reasoning",
    "difficulty": "Easy",
    "bloomSkill": "Understanding",
    "questionText": "Assertion (A): Resistance of a conductor increases with increase in its length.\nReason (R): Resistance is inversely proportional to the length of the conductor.",
    "options": [
      "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
      "(B) Both Assertion and Reason are true but Reason is NOT the correct explanation of Assertion.",
      "(C) Assertion is true but Reason is false.",
      "(D) Assertion is false but Reason is true."
    ],
    "answer": "(C) Assertion is true but Reason is false.",
    "solutionSteps": [
      "Assertion: R = ρL/A. As L increases, R increases (directly proportional). TRUE.",
      "Reason: R is DIRECTLY proportional to length (R ∝ L), not inversely proportional. The statement 'inversely proportional' is wrong. FALSE.",
      "A is true (longer wire = more resistance). R is false (the relationship is direct, not inverse).",
      "Answer: (C)"
    ],
    "finalAnswer": "(C)",
    "explanation": "A is true — longer conductor has higher resistance. R is false — R is DIRECTLY proportional to length (R = ρL/A), not inversely proportional. Classic CBSE trap.",
    "isCompetencyBased": true,
    "pyqYear": "2023",
    "pyqSet": "30/2/1",
    "ncertRef": "NCERT Ch12 Ex 12.2"
  },

  {
    "id": "AR-EL-003",
    "subject": "Science",
    "topicKey": "electricity",
    "subtopic": "Series and Parallel Circuits",
    "section": "A",
    "marks": 1,
    "format": "Assertion-Reasoning",
    "difficulty": "Medium",
    "bloomSkill": "Analysing",
    "questionText": "Assertion (A): In a series circuit, if one component fails (open circuit), the entire circuit stops working.\nReason (R): In a series circuit, all components carry the same current and there is only one path for current flow.",
    "options": [
      "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
      "(B) Both Assertion and Reason are true but Reason is NOT the correct explanation of Assertion.",
      "(C) Assertion is true but Reason is false.",
      "(D) Assertion is false but Reason is true."
    ],
    "answer": "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
    "solutionSteps": [
      "Assertion: In series, there is only one path for current. If any component breaks (open circuit), the path is broken and no current flows anywhere. TRUE.",
      "Reason: Series circuit — same current through all components, single path. TRUE.",
      "R explains A: because there is only one path (R), a break anywhere stops all current flow (A).",
      "Answer: (A)"
    ],
    "finalAnswer": "(A)",
    "explanation": "Both true. In series circuits, the single current path means one failure stops everything. R (single path, same current) is the direct explanation of A.",
    "isCompetencyBased": true,
    "pyqYear": "2022",
    "pyqSet": "30/1/1",
    "ncertRef": "NCERT Ch12 Ex 12.4"
  },

  {
    "id": "AR-EL-004",
    "subject": "Science",
    "topicKey": "electricity",
    "subtopic": "Series and Parallel Circuits",
    "section": "A",
    "marks": 1,
    "format": "Assertion-Reasoning",
    "difficulty": "Medium",
    "bloomSkill": "Analysing",
    "questionText": "Assertion (A): Household electrical appliances are connected in parallel.\nReason (R): In parallel connection, each appliance gets the full supply voltage and can be operated independently.",
    "options": [
      "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
      "(B) Both Assertion and Reason are true but Reason is NOT the correct explanation of Assertion.",
      "(C) Assertion is true but Reason is false.",
      "(D) Assertion is false but Reason is true."
    ],
    "answer": "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
    "solutionSteps": [
      "Assertion: Yes, household appliances are wired in parallel. TRUE.",
      "Reason: In parallel, each branch has the same voltage (full supply voltage) and each appliance can be switched on/off independently. TRUE.",
      "R gives the practical reasons (full voltage + independent operation) that explain why parallel is used for household wiring.",
      "Answer: (A)"
    ],
    "finalAnswer": "(A)",
    "explanation": "Both true. Household appliances in parallel (A) because each gets full voltage and operates independently (R). R is the correct explanation.",
    "isCompetencyBased": true,
    "pyqYear": "2024",
    "pyqSet": "30/3/1",
    "ncertRef": "NCERT Ch12 Ex 12.5"
  },

  {
    "id": "AR-EL-005",
    "subject": "Science",
    "topicKey": "electricity",
    "subtopic": "Heating Effect of Current",
    "section": "A",
    "marks": 1,
    "format": "Assertion-Reasoning",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "Assertion (A): The filament of an electric bulb is made of tungsten.\nReason (R): Tungsten has a very high melting point and high resistivity, making it suitable for producing light by heating.",
    "options": [
      "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
      "(B) Both Assertion and Reason are true but Reason is NOT the correct explanation of Assertion.",
      "(C) Assertion is true but Reason is false.",
      "(D) Assertion is false but Reason is true."
    ],
    "answer": "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
    "solutionSteps": [
      "Assertion: Electric bulb filaments are made of tungsten. TRUE.",
      "Reason: Tungsten has the highest melting point among metals (~3422°C) and high resistivity — it can be heated to incandescence without melting, producing light. TRUE.",
      "R directly explains why tungsten is chosen for the filament (the material property justifies the design choice).",
      "Answer: (A)"
    ],
    "finalAnswer": "(A)",
    "explanation": "Both true. Tungsten filament (A) is used because of its high melting point and resistivity (R) — it glows white-hot without melting.",
    "isCompetencyBased": true,
    "pyqYear": "2025",
    "pyqSet": "30/2/1",
    "ncertRef": "NCERT Ch12 Heating Effect section"
  },

  {
    "id": "AR-EL-006",
    "subject": "Science",
    "topicKey": "electricity",
    "subtopic": "Electric Power",
    "section": "A",
    "marks": 1,
    "format": "Assertion-Reasoning",
    "difficulty": "Hard",
    "bloomSkill": "Evaluating",
    "questionText": "Assertion (A): A 100W bulb glows brighter than a 60W bulb when both are connected in series.\nReason (R): In series connection, the bulb with higher resistance dissipates more power.",
    "options": [
      "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
      "(B) Both Assertion and Reason are true but Reason is NOT the correct explanation of Assertion.",
      "(C) Assertion is true but Reason is false.",
      "(D) Assertion is false but Reason is true."
    ],
    "answer": "(D) Assertion is false but Reason is true.",
    "solutionSteps": [
      "Assertion: In series, same current flows through both bulbs. Power = I²R. The bulb with HIGHER resistance dissipates MORE power and glows brighter.",
      "The 60W bulb has higher resistance (R = V²/P; at same voltage, lower P means higher R).",
      "So the 60W bulb glows BRIGHTER than the 100W bulb in series. The assertion says 100W glows brighter — FALSE.",
      "Reason: In series, P = I²R. Higher R → more power dissipated → brighter glow. TRUE.",
      "A is false (60W is brighter in series). R is true (higher R dissipates more power in series).",
      "Answer: (D)"
    ],
    "finalAnswer": "(D)",
    "explanation": "A is false — in series, 60W bulb (higher resistance) glows brighter than 100W bulb (lower resistance). R is true: P = I²R in series, so higher R = more power = brighter. Classic CBSE conceptual trap.",
    "isCompetencyBased": true,
    "pyqYear": "2023",
    "pyqSet": "30/1/1",
    "ncertRef": "NCERT Ch12 Ex 12.6"
  },

  {
    "id": "AR-EL-007",
    "subject": "Science",
    "topicKey": "electricity",
    "subtopic": "Resistance",
    "section": "A",
    "marks": 1,
    "format": "Assertion-Reasoning",
    "difficulty": "Hard",
    "bloomSkill": "Evaluating",
    "questionText": "Assertion (A): When resistors are connected in parallel, the equivalent resistance is less than the smallest individual resistance.\nReason (R): In parallel, total current is the sum of individual currents, so the effective opposition to current is reduced.",
    "options": [
      "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
      "(B) Both Assertion and Reason are true but Reason is NOT the correct explanation of Assertion.",
      "(C) Assertion is true but Reason is false.",
      "(D) Assertion is false but Reason is true."
    ],
    "answer": "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
    "solutionSteps": [
      "Assertion: For parallel combination 1/Rp = 1/R1 + 1/R2 + ... Each additional resistor adds another current path, making Rp < R1 and Rp < R2. TRUE.",
      "Reason: In parallel, multiple current paths exist, so total current I = I1 + I2 + ... More paths = less total opposition = lower equivalent resistance. TRUE.",
      "R provides the physical explanation (more current paths) for the mathematical result in A.",
      "Answer: (A)"
    ],
    "finalAnswer": "(A)",
    "explanation": "Both true. Parallel resistors reduce equivalent resistance below the smallest (A) because total current splits across multiple paths, reducing effective opposition (R).",
    "isCompetencyBased": true,
    "pyqYear": undefined,
    "pyqSet": undefined,
    "ncertRef": "NCERT Ch12 Ex 12.4"
  },

  {
    "id": "AR-EL-008",
    "subject": "Science",
    "topicKey": "electricity",
    "subtopic": "Electric Power",
    "section": "A",
    "marks": 1,
    "format": "Assertion-Reasoning",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "Assertion (A): Thick copper wires are used for electrical transmission to reduce power loss.\nReason (R): Power lost as heat = I²R. Thicker wires have lower resistance, so power loss is reduced.",
    "options": [
      "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
      "(B) Both Assertion and Reason are true but Reason is NOT the correct explanation of Assertion.",
      "(C) Assertion is true but Reason is false.",
      "(D) Assertion is false but Reason is true."
    ],
    "answer": "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
    "solutionSteps": [
      "Assertion: Thick copper wires are used in transmission lines to minimise power loss. TRUE.",
      "Reason: P_loss = I²R. Thicker wire → larger cross-sectional area A → R = ρL/A decreases → lower I²R loss. TRUE.",
      "R (P = I²R formula + R decreases with thickness) directly explains A.",
      "Answer: (A)"
    ],
    "finalAnswer": "(A)",
    "explanation": "Both true. Thick wires (larger area A) have lower resistance R. By P = I²R, lower R means less heat loss. R explains A perfectly.",
    "isCompetencyBased": true,
    "pyqYear": "2022",
    "pyqSet": "30/2/1",
    "ncertRef": "NCERT Ch12 Power section"
  },

  {
    "id": "AR-EL-009",
    "subject": "Science",
    "topicKey": "electricity",
    "subtopic": "Heating Effect of Current",
    "section": "A",
    "marks": 1,
    "format": "Assertion-Reasoning",
    "difficulty": "Hard",
    "bloomSkill": "Evaluating",
    "questionText": "Assertion (A): An electric fuse is connected in series in a circuit.\nReason (R): A fuse wire has very high resistance so that it gets hot quickly and melts to break the circuit.",
    "options": [
      "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
      "(B) Both Assertion and Reason are true but Reason is NOT the correct explanation of Assertion.",
      "(C) Assertion is true but Reason is false.",
      "(D) Assertion is false but Reason is true."
    ],
    "answer": "(C) Assertion is true but Reason is false.",
    "solutionSteps": [
      "Assertion: A fuse is always connected in series so the full circuit current passes through it. TRUE.",
      "Reason: A fuse wire does NOT have high resistance. It has LOW resistance (so it doesn't waste energy normally) but a LOW MELTING POINT so it melts quickly when excess current flows. The reason incorrectly states 'high resistance'. FALSE.",
      "A is true (series connection). R is false (fuse has LOW resistance, LOW melting point — not high resistance).",
      "Answer: (C)"
    ],
    "finalAnswer": "(C)",
    "explanation": "A is true — fuse is in series. R is false — fuse wire has LOW resistance and LOW melting point, not high resistance. The fuse melts due to excessive current heating it beyond its melting point.",
    "isCompetencyBased": true,
    "pyqYear": "2024",
    "pyqSet": "30/2/1",
    "ncertRef": "NCERT Ch12 Safety devices section"
  },

  {
    "id": "AR-EL-010",
    "subject": "Science",
    "topicKey": "electricity",
    "subtopic": "Ohm's Law",
    "section": "A",
    "marks": 1,
    "format": "Assertion-Reasoning",
    "difficulty": "Hard",
    "bloomSkill": "Evaluating",
    "questionText": "Assertion (A): Resistance of a conductor is independent of the potential difference applied across it.\nReason (R): Resistance depends only on the nature, length, cross-sectional area and temperature of the conductor.",
    "options": [
      "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
      "(B) Both Assertion and Reason are true but Reason is NOT the correct explanation of Assertion.",
      "(C) Assertion is true but Reason is false.",
      "(D) Assertion is false but Reason is true."
    ],
    "answer": "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
    "solutionSteps": [
      "Assertion: For an ohmic conductor at constant temperature, R = V/I is constant regardless of V. Changing V changes I proportionally, keeping R the same. TRUE.",
      "Reason: R = ρL/A — depends on resistivity (material/temperature), length and area. NOT on voltage. TRUE.",
      "R explains why A is true: resistance is a property of the conductor's physical characteristics, not of the applied voltage.",
      "Answer: (A)"
    ],
    "finalAnswer": "(A)",
    "explanation": "Both true. Resistance is an intrinsic property (material, length, area, temperature) — not affected by voltage. R correctly explains why A holds.",
    "isCompetencyBased": false,
    "pyqYear": "2025",
    "pyqSet": "30/1/1",
    "ncertRef": "NCERT Ch12 Resistance section"
  },

  // ═══════════════════════════════════════════════
  // LIFE PROCESSES — 10 Assertion-Reason Questions
  // ═══════════════════════════════════════════════

  {
    "id": "AR-LP-001",
    "subject": "Science",
    "topicKey": "life-processes",
    "subtopic": "Nutrition — Photosynthesis",
    "section": "A",
    "marks": 1,
    "format": "Assertion-Reasoning",
    "difficulty": "Easy",
    "bloomSkill": "Understanding",
    "questionText": "Assertion (A): Leaves are the primary site of photosynthesis in most plants.\nReason (R): Leaves have a large surface area, contain chlorophyll and have stomata for gas exchange.",
    "options": [
      "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
      "(B) Both Assertion and Reason are true but Reason is NOT the correct explanation of Assertion.",
      "(C) Assertion is true but Reason is false.",
      "(D) Assertion is false but Reason is true."
    ],
    "answer": "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
    "solutionSteps": [
      "Assertion: Leaves are the main photosynthetic organs in most plants. TRUE.",
      "Reason: Leaves have: (1) large flat surface to capture sunlight, (2) chlorophyll in chloroplasts to absorb light, (3) stomata for CO₂ entry and O₂ exit. TRUE.",
      "R gives the structural and functional reasons that explain why leaves are the primary photosynthesis site.",
      "Answer: (A)"
    ],
    "finalAnswer": "(A)",
    "explanation": "Both true. Leaves are the primary photosynthesis site (A) because of their large surface, chlorophyll content and stomata (R). R explains A.",
    "isCompetencyBased": false,
    "pyqYear": "2023",
    "pyqSet": "30/1/1",
    "ncertRef": "NCERT Ch6 Photosynthesis section"
  },

  {
    "id": "AR-LP-002",
    "subject": "Science",
    "topicKey": "life-processes",
    "subtopic": "Nutrition — Photosynthesis",
    "section": "A",
    "marks": 1,
    "format": "Assertion-Reasoning",
    "difficulty": "Medium",
    "bloomSkill": "Analysing",
    "questionText": "Assertion (A): Oxygen released during photosynthesis comes from water molecules.\nReason (R): During the light reaction of photosynthesis, water molecules are split by sunlight (photolysis) to release oxygen.",
    "options": [
      "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
      "(B) Both Assertion and Reason are true but Reason is NOT the correct explanation of Assertion.",
      "(C) Assertion is true but Reason is false.",
      "(D) Assertion is false but Reason is true."
    ],
    "answer": "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
    "solutionSteps": [
      "Assertion: The oxygen released in photosynthesis comes from H₂O, not CO₂ — confirmed by isotope tracer experiments. TRUE.",
      "Reason: Photolysis of water (2H₂O → 4H⁺ + 4e⁻ + O₂) occurs in the light reaction using solar energy. TRUE.",
      "R is the biochemical mechanism that explains A.",
      "Answer: (A)"
    ],
    "finalAnswer": "(A)",
    "explanation": "Both true. O₂ in photosynthesis comes from water (A) via photolysis in the light reaction (R). This is a key CBSE concept — the source of oxygen is water, not CO₂.",
    "isCompetencyBased": true,
    "pyqYear": "2024",
    "pyqSet": "30/2/1",
    "ncertRef": "NCERT Ch6 Photosynthesis section"
  },

  {
    "id": "AR-LP-003",
    "subject": "Science",
    "topicKey": "life-processes",
    "subtopic": "Respiration",
    "section": "A",
    "marks": 1,
    "format": "Assertion-Reasoning",
    "difficulty": "Medium",
    "bloomSkill": "Analysing",
    "questionText": "Assertion (A): Yeast can survive both in aerobic and anaerobic conditions.\nReason (R): Yeast performs aerobic respiration in the presence of oxygen and anaerobic respiration (fermentation) in the absence of oxygen, producing ethanol and CO₂.",
    "options": [
      "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
      "(B) Both Assertion and Reason are true but Reason is NOT the correct explanation of Assertion.",
      "(C) Assertion is true but Reason is false.",
      "(D) Assertion is false but Reason is true."
    ],
    "answer": "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
    "solutionSteps": [
      "Assertion: Yeast is a facultative anaerobe — it can survive with or without oxygen. TRUE.",
      "Reason: In O₂ presence → aerobic respiration (complete oxidation). In O₂ absence → anaerobic fermentation (glucose → ethanol + CO₂ + energy). TRUE.",
      "R explains exactly how yeast manages both conditions, directly explaining A.",
      "Answer: (A)"
    ],
    "finalAnswer": "(A)",
    "explanation": "Both true. Yeast survives in both conditions (A) because it switches between aerobic and anaerobic pathways (R). R is the mechanism explaining A.",
    "isCompetencyBased": true,
    "pyqYear": "2022",
    "pyqSet": "30/1/1",
    "ncertRef": "NCERT Ch6 Respiration section"
  },

  {
    "id": "AR-LP-004",
    "subject": "Science",
    "topicKey": "life-processes",
    "subtopic": "Respiration",
    "section": "A",
    "marks": 1,
    "format": "Assertion-Reasoning",
    "difficulty": "Hard",
    "bloomSkill": "Evaluating",
    "questionText": "Assertion (A): During vigorous exercise, humans may experience muscle cramps.\nReason (R): During intense exercise, insufficient oxygen leads to anaerobic respiration in muscles, producing lactic acid which accumulates and causes cramps.",
    "options": [
      "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
      "(B) Both Assertion and Reason are true but Reason is NOT the correct explanation of Assertion.",
      "(C) Assertion is true but Reason is false.",
      "(D) Assertion is false but Reason is true."
    ],
    "answer": "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
    "solutionSteps": [
      "Assertion: Muscle cramps do occur during vigorous exercise. TRUE.",
      "Reason: During intense activity, O₂ supply falls short of demand. Muscles switch to anaerobic respiration: glucose → lactic acid + energy. Lactic acid accumulation causes the cramping sensation. TRUE.",
      "R is the precise biochemical explanation for why cramps occur in A.",
      "Answer: (A)"
    ],
    "finalAnswer": "(A)",
    "explanation": "Both true. Vigorous exercise → insufficient O₂ → anaerobic respiration → lactic acid accumulation → cramps. R is the complete mechanism explaining A.",
    "isCompetencyBased": true,
    "pyqYear": "2025",
    "pyqSet": "30/1/1",
    "ncertRef": "NCERT Ch6 Respiration section"
  },

  {
    "id": "AR-LP-005",
    "subject": "Science",
    "topicKey": "life-processes",
    "subtopic": "Transportation",
    "section": "A",
    "marks": 1,
    "format": "Assertion-Reasoning",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "Assertion (A): In humans, arteries carry oxygenated blood and veins carry deoxygenated blood.\nReason (R): The pulmonary artery carries deoxygenated blood from the heart to the lungs, and the pulmonary vein carries oxygenated blood from the lungs to the heart.",
    "options": [
      "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
      "(B) Both Assertion and Reason are true but Reason is NOT the correct explanation of Assertion.",
      "(C) Assertion is true but Reason is false.",
      "(D) Assertion is false but Reason is true."
    ],
    "answer": "(D) Assertion is false but Reason is true.",
    "solutionSteps": [
      "Assertion: This is a common misconception. While most arteries carry oxygenated blood, the pulmonary artery carries DEOXYGENATED blood. So the general statement 'arteries always carry oxygenated' is FALSE.",
      "Reason: Pulmonary artery → deoxygenated blood to lungs. Pulmonary vein → oxygenated blood back to heart. This is an important exception to the general rule. TRUE.",
      "A is false (not all arteries carry oxygenated blood — pulmonary artery is an exception). R is true (correct description of pulmonary circulation).",
      "Answer: (D)"
    ],
    "finalAnswer": "(D)",
    "explanation": "A is false — the pulmonary artery is a key exception that carries deoxygenated blood. R is true — pulmonary artery takes deoxygenated blood to lungs, pulmonary vein returns oxygenated blood. Classic CBSE board trap.",
    "isCompetencyBased": true,
    "pyqYear": "2024",
    "pyqSet": "30/3/1",
    "ncertRef": "NCERT Ch6 Transportation section"
  },

  {
    "id": "AR-LP-006",
    "subject": "Science",
    "topicKey": "life-processes",
    "subtopic": "Transportation",
    "section": "A",
    "marks": 1,
    "format": "Assertion-Reasoning",
    "difficulty": "Medium",
    "bloomSkill": "Analysing",
    "questionText": "Assertion (A): The left ventricle has thicker walls than the right ventricle.\nReason (R): The left ventricle pumps blood to the entire body (systemic circulation) requiring greater force, while the right ventricle only pumps blood to the lungs.",
    "options": [
      "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
      "(B) Both Assertion and Reason are true but Reason is NOT the correct explanation of Assertion.",
      "(C) Assertion is true but Reason is false.",
      "(D) Assertion is false but Reason is true."
    ],
    "answer": "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
    "solutionSteps": [
      "Assertion: The left ventricle wall is indeed thicker (more muscular) than the right ventricle. TRUE.",
      "Reason: Left ventricle → pumps to the entire body via the aorta (longer distance, higher pressure needed). Right ventricle → pumps only to nearby lungs (shorter distance, lower pressure). TRUE.",
      "R directly explains why A is true — greater workload demands thicker walls.",
      "Answer: (A)"
    ],
    "finalAnswer": "(A)",
    "explanation": "Both true. Left ventricle is thicker (A) because it must pump blood throughout the whole body against higher resistance (R). R correctly explains A.",
    "isCompetencyBased": true,
    "pyqYear": "2023",
    "pyqSet": "30/2/1",
    "ncertRef": "NCERT Ch6 Transportation section"
  },

  {
    "id": "AR-LP-007",
    "subject": "Science",
    "topicKey": "life-processes",
    "subtopic": "Excretion",
    "section": "A",
    "marks": 1,
    "format": "Assertion-Reasoning",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "Assertion (A): Reabsorption of useful substances from the glomerular filtrate occurs in the nephron tubule.\nReason (R): The glomerular filtrate contains both useful substances (glucose, amino acids, water, salts) and waste products (urea), which need to be separated.",
    "options": [
      "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
      "(B) Both Assertion and Reason are true but Reason is NOT the correct explanation of Assertion.",
      "(C) Assertion is true but Reason is false.",
      "(D) Assertion is false but Reason is true."
    ],
    "answer": "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
    "solutionSteps": [
      "Assertion: In the nephron tubule (PCT, loop of Henle, DCT), useful substances like glucose, water, amino acids and salts are selectively reabsorbed back into the blood. TRUE.",
      "Reason: Glomerular filtration is non-selective — both useful and waste substances are filtered out. The filtrate contains useful materials that must be recovered, necessitating reabsorption. TRUE.",
      "R explains why reabsorption (A) is necessary — because filtration is non-selective, recovery is needed.",
      "Answer: (A)"
    ],
    "finalAnswer": "(A)",
    "explanation": "Both true. Tubular reabsorption (A) is necessary because glomerular filtration non-selectively removes both useful and waste substances (R). R explains the need for A.",
    "isCompetencyBased": true,
    "pyqYear": "2024",
    "pyqSet": "30/1/1",
    "ncertRef": "NCERT Ch6 Excretion section"
  },

  {
    "id": "AR-LP-008",
    "subject": "Science",
    "topicKey": "life-processes",
    "subtopic": "Excretion",
    "section": "A",
    "marks": 1,
    "format": "Assertion-Reasoning",
    "difficulty": "Hard",
    "bloomSkill": "Evaluating",
    "questionText": "Assertion (A): Plants do not have a specialised excretory system like animals.\nReason (R): Plants excrete waste products only through stomata.",
    "options": [
      "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
      "(B) Both Assertion and Reason are true but Reason is NOT the correct explanation of Assertion.",
      "(C) Assertion is true but Reason is false.",
      "(D) Assertion is false but Reason is true."
    ],
    "answer": "(C) Assertion is true but Reason is false.",
    "solutionSteps": [
      "Assertion: Plants do not have dedicated excretory organs like kidneys or lungs. They use various strategies for waste removal. TRUE.",
      "Reason: Plants use MULTIPLE excretion methods: (1) stomata (for CO₂ and water vapour), (2) shedding leaves (carrying waste products), (3) storing wastes in vacuoles, bark, resins and gums, (4) excreting into surrounding soil. Stomata alone is NOT the only method. FALSE.",
      "A is true (no specialised system). R is false (plants use multiple excretion pathways, not just stomata).",
      "Answer: (C)"
    ],
    "finalAnswer": "(C)",
    "explanation": "A is true — plants lack specialised excretory organs. R is false — plants excrete through multiple pathways (stomata, leaf fall, vacuole storage, soil excretion) not through stomata alone.",
    "isCompetencyBased": true,
    "pyqYear": "2023",
    "pyqSet": "30/3/1",
    "ncertRef": "NCERT Ch6 Excretion section"
  },

  {
    "id": "AR-LP-009",
    "subject": "Science",
    "topicKey": "life-processes",
    "subtopic": "Nutrition — Digestion",
    "section": "A",
    "marks": 1,
    "format": "Assertion-Reasoning",
    "difficulty": "Hard",
    "bloomSkill": "Evaluating",
    "questionText": "Assertion (A): The inner wall of the small intestine has finger-like projections called villi.\nReason (R): Villi increase the surface area for absorption of digested food into the blood.",
    "options": [
      "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
      "(B) Both Assertion and Reason are true but Reason is NOT the correct explanation of Assertion.",
      "(C) Assertion is true but Reason is false.",
      "(D) Assertion is false but Reason is true."
    ],
    "answer": "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
    "solutionSteps": [
      "Assertion: The small intestine's inner wall has villi (and microvilli forming the brush border) — confirmed anatomical fact. TRUE.",
      "Reason: Villi dramatically increase the surface area available for absorption of amino acids, glucose, fatty acids etc. into blood vessels and lacteals. TRUE.",
      "R is the functional reason (increased surface area for absorption) that explains the structural feature in A.",
      "Answer: (A)"
    ],
    "finalAnswer": "(A)",
    "explanation": "Both true. Villi in small intestine (A) exist to maximise surface area for nutrient absorption (R). R is the direct functional explanation of the structural feature in A.",
    "isCompetencyBased": false,
    "pyqYear": "2022",
    "pyqSet": "30/2/1",
    "ncertRef": "NCERT Ch6 Nutrition section"
  },

  {
    "id": "AR-LP-010",
    "subject": "Science",
    "topicKey": "life-processes",
    "subtopic": "Respiration",
    "section": "A",
    "marks": 1,
    "format": "Assertion-Reasoning",
    "difficulty": "Hard",
    "bloomSkill": "Evaluating",
    "questionText": "Assertion (A): Aerobic respiration releases more energy than anaerobic respiration from the same amount of glucose.\nReason (R): In aerobic respiration, glucose is completely oxidised to CO₂ and H₂O, releasing 38 ATP, whereas anaerobic respiration yields only 2 ATP.",
    "options": [
      "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
      "(B) Both Assertion and Reason are true but Reason is NOT the correct explanation of Assertion.",
      "(C) Assertion is true but Reason is false.",
      "(D) Assertion is false but Reason is true."
    ],
    "answer": "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
    "solutionSteps": [
      "Assertion: Aerobic respiration releases significantly more energy per glucose molecule than anaerobic. TRUE.",
      "Reason: Aerobic: C₆H₁₂O₆ + 6O₂ → 6CO₂ + 6H₂O + 38 ATP (complete oxidation). Anaerobic: glucose → lactic acid (or ethanol + CO₂) + 2 ATP (partial breakdown only). TRUE.",
      "R gives the precise ATP counts that explain the greater energy yield in A.",
      "Answer: (A)"
    ],
    "finalAnswer": "(A)",
    "explanation": "Both true. Aerobic respiration yields more energy (A) because glucose is completely oxidised producing 38 ATP vs only 2 ATP in anaerobic respiration (R). R is the quantitative explanation of A.",
    "isCompetencyBased": true,
    "pyqYear": "2025",
    "pyqSet": "30/2/1",
    "ncertRef": "NCERT Ch6 Respiration section"
  }
];
