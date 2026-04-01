// This file contains competency‑heavy science question additions for Class 10.
// These additions strengthen assertion‑reasoning, case‑based and diagram questions for must‑crack science topics.

import type { ScienceSubtopicQuestion } from "./class10SciencePredictiveEngine";

export const scienceQuestionAdditions: Record<
  string,
  Record<string, ScienceSubtopicQuestion[]>
> = {
  // Metals and Non‑Metals (must‑crack)
  "SCI-MNM": {
    "Properties": [
      {
        id: "2026-MNM-06",
        type: "Assertion-Reason",
        section: "A",
        marks: 1,
        difficulty: "Medium",
        bloomSkill: "Analysing",
        questionText:
          "Assertion (A): Aluminium has a lower density than iron but becomes strong when alloyed.\nReason (R): Alloying alters the properties of metals by mixing them with other metals or non‑metals.",
        answer:
          "Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
        explanation:
          "Aluminium is lightweight, yet alloys such as duralumin are stronger. Alloying changes the crystal lattice, improving strength and hardness.",
      },
      {
        id: "2026-MNM-07",
        type: "Assertion-Reason",
        section: "A",
        marks: 1,
        difficulty: "Medium",
        bloomSkill: "Analysing",
        questionText:
          "Assertion (A): Aluminium is extracted from aluminium oxide by electrolytic reduction.\nReason (R): Aluminium is highly reactive and cannot be extracted from its oxide using carbon.",
        answer:
          "Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
        explanation:
          "Aluminium is more reactive than carbon and is therefore obtained by electrolysis of molten alumina dissolved in cryolite.",
      },
    ],
    "Properties & Alloys": [
      {
        id: "2026-MNM-08",
        type: "Short",
        section: "C",
        marks: 3,
        difficulty: "Medium",
        bloomSkill: "Understanding",
        questionText:
          "Explain why metals are good conductors of electricity whereas non‑metals are generally poor conductors. Give two examples of each.",
        answer:
          "Metals have free electrons that can move easily, allowing electric current to flow. Examples: copper, aluminium. Non‑metals have covalent bonding with no free electrons, so they do not conduct; examples: sulphur, phosphorus.",
        explanation:
          "Electrical conduction requires mobile charge carriers; metallic bonds provide delocalised electrons, whereas covalent bonds localise electrons.",
      },
      {
        id: "2026-MNM-09",
        type: "Short",
        section: "C",
        marks: 3,
        difficulty: "Medium",
        bloomSkill: "Applying",
        questionText:
          "State two reasons why (i) solder is used for joining electrical wires, and (ii) nichrome is used as the heating element in appliances.",
        answer:
          "(i) Solder (lead–tin alloy) has a low melting point and wets metal surfaces, so it fuses wires without damaging them. (ii) Nichrome has high resistivity and can withstand high temperatures without oxidising, making it ideal for heating elements.",
        explanation:
          "Low melting point alloys are used in soldering; high‑resistance alloys produce heat and are stable at high temperatures.",
      },
    ],
    "Activity Series": [
      {
        id: "2026-MNM-10",
        type: "Case-Based",
        section: "E",
        marks: 4,
        difficulty: "Medium",
        bloomSkill: "Analysing",
        questionText:
          "Three samples of metals A, B and C were tested by placing small pieces in dilute hydrochloric acid. Gas bubbles formed vigorously around metal A, slowly around metal B, and not at all around metal C.\nArrange A, B and C in decreasing order of reactivity and identify which sample could be copper. Give a reason for your answer.",
        answer:
          "A is the most reactive, followed by B, and C is the least reactive. Sample C is likely copper because it does not react with dilute acids to release hydrogen gas.",
        explanation:
          "According to the reactivity series, metals that react vigorously with dilute acid are above hydrogen, while copper is below hydrogen and does not displace hydrogen from acids.",
      },
    ],
  },

  // Life Processes (must‑crack)
  "SCI-LP": {
    "Nutrition (plants and animals)": [
      {
        id: "2026-LP-05",
        type: "Assertion-Reason",
        section: "A",
        marks: 1,
        difficulty: "Medium",
        bloomSkill: "Understanding",
        questionText:
          "Assertion (A): Leaves are called the food factories of plants.\nReason (R): Photosynthesis occurs in chloroplasts present in leaves which produce glucose.",
        answer:
          "Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
        explanation:
          "Leaves contain chlorophyll and chloroplasts that capture light energy and synthesise carbohydrates; hence they are the sites of food production.",
      },
    ],
    "Transport": [
      {
        id: "2026-LP-06",
        type: "Assertion-Reason",
        section: "A",
        marks: 1,
        difficulty: "Medium",
        bloomSkill: "Analysing",
        questionText:
          "Assertion (A): All arteries carry oxygenated blood.\nReason (R): The pulmonary artery carries deoxygenated blood from the heart to the lungs.",
        answer: "Assertion is false but Reason is true.",
        explanation:
          "Most arteries carry oxygenated blood, but the pulmonary artery is an exception; it carries deoxygenated blood to the lungs. Hence the assertion is incorrect.",
      },
      {
        id: "2026-LP-08",
        type: "Diagram",
        section: "C",
        marks: 3,
        difficulty: "Medium",
        bloomSkill: "Applying",
        questionText:
          "Draw a neat labelled diagram of the human heart and describe the flow of blood through its chambers during one complete circulation.",
        answer:
          "Diagram should show right atrium, right ventricle, left atrium, left ventricle, vena cavae, pulmonary artery, pulmonary veins and aorta. Deoxygenated blood enters the right atrium from the body, passes to the right ventricle and is pumped to the lungs via the pulmonary artery. Oxygenated blood returns through the pulmonary veins to the left atrium, flows into the left ventricle and is pumped to the body through the aorta.",
        explanation:
          "The heart ensures double circulation, keeping oxygen‑rich and oxygen‑poor blood separate.",
      },
    ],
    "Respiration": [
      {
        id: "2026-LP-07",
        type: "Short",
        section: "C",
        marks: 3,
        difficulty: "Medium",
        bloomSkill: "Applying",
        questionText:
          "Describe the role of the diaphragm and intercostal muscles in the process of inhalation and exhalation in human beings.",
        answer:
          "During inhalation the diaphragm contracts and flattens while the external intercostal muscles lift the rib cage; thoracic volume increases and air flows in. During exhalation the diaphragm relaxes and domes upward and the rib cage moves down; thoracic volume decreases and air is expelled.",
        explanation:
          "Breathing involves muscular movements that change chest cavity volume and therefore air pressure.",
      },
    ],
    "Respiration/Transport": [
      {
        id: "2026-LP-09",
        type: "Case-Based",
        section: "E",
        marks: 4,
        difficulty: "Medium",
        bloomSkill: "Analysing",
        questionText:
          "A group of students recorded their pulse rates before and after running 400 m:\nStudent A: before 72 bpm, after 110 bpm\nStudent B: before 70 bpm, after 105 bpm\nStudent C: before 74 bpm, after 115 bpm\n(a) What does the increase in pulse rate indicate about the body’s demand?\n(b) Which organ systems respond to meet this demand?\n(c) Explain why lactic acid may accumulate in muscles during such activity.",
        answer:
          "(a) The increase in pulse rate shows that tissues require more oxygen and nutrients. (b) The circulatory and respiratory systems respond by increasing heart rate and breathing rate. (c) If oxygen supply is insufficient, muscles respire anaerobically and produce lactic acid, leading to fatigue.",
        explanation:
          "Exercise increases ATP demand. The heart and lungs work harder to supply oxygen and nutrients. When aerobic respiration cannot meet the demand, anaerobic respiration occurs, forming lactic acid.",
      },
    ],
  },
};