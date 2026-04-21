// src/data/predictedScienceQuestions.ts

import {
  class10SciencePredictiveEngine,
  type ScienceSubtopicQuestion,
} from "./class10SciencePredictiveEngine";

const scienceQuestionAdditions: Record<
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
        solutionSteps: [
          "Assertion (A) is true: Aluminium is less dense than iron and its strength significantly increases when alloyed.",
          "Reason (R) is true: Alloying is the process of mixing metals with other elements to modify and improve their properties.",
          "Reason (R) correctly explains why alloying makes aluminium strong by altering its inherent properties.",
        ],
        finalAnswer: "Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
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
        solutionSteps: [
          "Assertion (A) is true: Aluminium is extracted from aluminium oxide (alumina) using electrolytic reduction.",
          "Reason (R) is true: Aluminium is a highly reactive metal, placed above carbon in the reactivity series.",
          "Due to its high reactivity, carbon cannot reduce aluminium oxide, hence electrolytic reduction is required.",
        ],
        finalAnswer: "Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
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
        solutionSteps: [
          "Metals are good conductors of electricity because they possess a 'sea' of delocalised or free electrons.",
          "These free electrons can move easily throughout the metal lattice, allowing electric current to flow.",
          "Non-metals are generally poor conductors as their electrons are tightly held within covalent bonds.",
          "They lack free electrons to carry electric charge, thus hindering the flow of electricity.",
          "Examples: Metals - Copper, Aluminium. Non-metals - Sulphur, Phosphorus.",
        ],
        finalAnswer: "Metals have free electrons that can move easily, allowing electric current to flow. Examples: copper, aluminium. Non‑metals have covalent bonding with no free electrons, so they do not conduct; examples: sulphur, phosphorus.",
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
        solutionSteps: [
          "For solder: It has a low melting point, which prevents damage to electrical wires during joining.",
          "For solder: It wets metal surfaces well, ensuring a strong and reliable electrical connection.",
          "For nichrome: It has high resistivity, meaning it offers significant resistance to current flow, generating heat.",
          "For nichrome: It can withstand very high temperatures without melting or oxidizing (burning) in air, ensuring durability.",
        ],
        finalAnswer: "(i) Solder (lead–tin alloy) has a low melting point and wets metal surfaces, so it fuses wires without damaging them. (ii) Nichrome has high resistivity and can withstand high temperatures without oxidising, making it ideal for heating elements.",
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
        solutionSteps: [
          "The vigor of gas bubble formation indicates the reactivity of the metal with dilute acid.",
          "Metal A reacts vigorously, indicating it is the most reactive.",
          "Metal B reacts slowly, indicating it is less reactive than A but more reactive than C.",
          "Metal C shows no reaction, indicating it is the least reactive.",
          "Decreasing order of reactivity: A > B > C.",
          "Sample C is likely copper because copper is less reactive than hydrogen and does not react with dilute acids to produce hydrogen gas.",
        ],
        finalAnswer: "A is the most reactive, followed by B, and C is the least reactive. Sample C is likely copper because it does not react with dilute acids to release hydrogen gas.",
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
        solutionSteps: [
          "Assertion (A) is true: Leaves are the primary sites for photosynthesis, where food is produced.",
          "Reason (R) is true: Photosynthesis, the process of producing glucose (food), occurs in chloroplasts found in leaves.",
          "Reason (R) correctly explains Assertion (A) as it details why leaves are considered food factories.",
        ],
        finalAnswer: "Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
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
        solutionSteps: [
          "Assertion (A): All arteries carry oxygenated blood. This statement is false because the pulmonary artery carries deoxygenated blood.",
          "Reason (R): The pulmonary artery carries deoxygenated blood from the heart to the lungs. This statement is true.",
          "Therefore, Assertion is false but Reason is true.",
        ],
        finalAnswer: "Assertion is false but Reason is true.",
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
        solutionSteps: [
          "Draw a neat labelled diagram of the human heart, showing all four chambers and major blood vessels.",
          "Deoxygenated blood from the body enters the right atrium via the vena cavae, then moves to the right ventricle.",
          "The right ventricle pumps this deoxygenated blood to the lungs through the pulmonary artery for oxygenation.",
          "Oxygenated blood returns from the lungs to the left atrium via the pulmonary veins.",
          "From the left atrium, blood moves to the left ventricle, which then pumps it to the rest of the body through the aorta.",
        ],
        finalAnswer: "Diagram should show right atrium, right ventricle, left atrium, left ventricle, vena cavae, pulmonary artery, pulmonary veins and aorta. Deoxygenated blood enters the right atrium from the body, passes to the right ventricle and is pumped to the lungs via the pulmonary artery. Oxygenated blood retur",
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
        solutionSteps: [
          "During inhalation, the diaphragm contracts and flattens, moving downwards.",
          "Simultaneously, the external intercostal muscles contract, lifting the rib cage upwards and outwards. This increases the volume of the thoracic cavity, causing air to rush in.",
          "During exhalation, the diaphragm relaxes and domes upwards, returning to its original position.",
          "The intercostal muscles also relax, allowing the rib cage to move downwards and inwards. This decreases the volume of the thoracic cavity, forcing air out.",
        ],
        finalAnswer: "During inhalation the diaphragm contracts and flattens while the external intercostal muscles lift the rib cage; thoracic volume increases and air flows in. During exhalation the diaphragm relaxes and domes upward and the rib cage moves down; thoracic volume decreases and air is expelled.",
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
        solutionSteps: [
          "Increased pulse rate indicates an increased heart rate and blood flow to the body parts.",
          "This shows that the tissues and muscles have a higher demand for oxygen and nutrients to produce more energy.",
          "The circulatory system (heart, blood vessels) and the respiratory system (lungs) respond to meet this increased demand.",
          "During strenuous activities like running, the oxygen supply to muscle cells may not be sufficient to meet the high energy requirement.",
          "In such conditions, muscle cells switch to anaerobic respiration to produce energy without oxygen.",
          "Anaerobic respiration in muscles produces lactic acid as a byproduct, which accumulates and leads to muscle fatigue and cramps.",
        ],
        finalAnswer: "(a) The increase in pulse rate shows that tissues require more oxygen and nutrients. (b) The circulatory and respiratory systems respond by increasing heart rate and breathing rate. (c) If oxygen supply is insufficient, muscles respire anaerobically and produce lactic acid, leading to fatigue.",
      },
    ],
  },
};
// Alias type for convenience (similar spirit to PredictedQuestion in Maths)
export type PredictedScienceQuestion = ScienceSubtopicQuestion;

/**
 * Flat bank of all predicted Science questions
 * (topic → subtopic → questions flattened).
 * You can plug this into MockPaper / diagnostics just like Maths.
 */
export const predictedScienceQuestions: PredictedScienceQuestion[] =
  (() => {
    const seen = new Set<string>();
    const out: PredictedScienceQuestion[] = [];

    // 1) Engine-first: take all existing engine questions, then append additions
    for (const topic of class10SciencePredictiveEngine.topics) {
      const topicAdd = (scienceQuestionAdditions as any)[topic.code] as
        | Record<string, ScienceSubtopicQuestion[]>
        | undefined;

      for (const sub of topic.subtopics) {
        const merged = [...sub.questions, ...((topicAdd?.[sub.subtopic] ?? []) as any)];
        for (const q of merged) {
          if (seen.has(q.id)) continue;
          seen.add(q.id);
          out.push(q);
        }
      }

      // 2) Additions for any subtopics not present in engine spec
      if (topicAdd) {
        for (const [subName, qs] of Object.entries(topicAdd)) {
          const exists = topic.subtopics.some((s) => s.subtopic === subName);
          if (exists) continue;
          for (const q of qs) {
            if (seen.has(q.id)) continue;
            seen.add(q.id);
            out.push(q);
          }
        }
      }
    }

    return out;
  })();
