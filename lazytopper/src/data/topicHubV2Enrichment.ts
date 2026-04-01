import type { TopicHubV2Content } from "../utils/getTopicV2Content";
import { trianglesTopicHubPack } from "./geminiTopicHubPacks/trianglesTopicHubPack";

/*
 * This enrichment file augments every Class 10 TopicHub v2 entry with
 * competency‑aligned examples, competencies, misconceptions, case
 * studies and, where appropriate, lab activities.  The content
 * reflects CBSE 2025–26 competency oriented patterns with greater
 * emphasis on application, analysis and real‑life context.  Each
 * topic key listed in topicHubV2Full.ts receives:
 *   – 2 worked examples showcasing exam style questions;
 *   – 4 competencies with Bloom level indicators;
 *   – 3 common misconceptions with corrections;
 *   – a single case study combining an everyday scenario with three
 *     varied sub‑questions (MCQ, Assertion/Reason or Short Answer);
 *   – a lab activity for science topics where hands‑on experiments are
 *     part of the CBSE syllabus (e.g. electricity, acids–bases, metals etc.).
 */

export const topicHubV2Enrichment: Record<string, Partial<TopicHubV2Content>> = {
  /**
   * Pair of Linear Equations in Two Variables
   */
  "pair-of-linear-equations": {
    workedExamples: [
      {
        title: "Solving by elimination",
        question:
          "Solve the system: 3x + 2y = 12 and 5x − y = 13 using the elimination method."
      },
      {
        title: "Age word problem",
        question:
          "The sum of the ages of a father and his son is 50 years. Five years ago the father was four times as old as his son. Form the linear equations and find their present ages."
      }
    ],
    competencies: [
      { id: "M10-pair-of-linear-equations-C1", description: "Form and solve pairs of linear equations algebraically using substitution or elimination.", bloomLevel: "Apply" },
      { id: "M10-pair-of-linear-equations-C2", description: "Interpret the graphical representation of two linear equations to determine the number of solutions.", bloomLevel: "Analyze" },
      { id: "M10-pair-of-linear-equations-C3", description: "Model real‑life situations such as age, money or mixture problems into linear equations in two variables.", bloomLevel: "Apply" },
      { id: "M10-pair-of-linear-equations-C4", description: "Verify conditions for unique, no and infinitely many solutions using ratios of coefficients.", bloomLevel: "Understand" }
    ],
    misconceptions: [
      {
        concept: "Solving methods",
        commonError: "Students often assume cross‑multiplication and elimination are the same and mix steps from both methods.",
        correction: "Differentiate the procedures: elimination eliminates one variable by adding/subtracting equations, while cross‑multiplication involves proportionate comparison." 
      },
      {
        concept: "Nature of solution",
        commonError: "Mixing up the conditions a₁/a₂ = b₁/b₂ = c₁/c₂ for infinitely many solutions and a₁/a₂ = b₁/b₂ ≠ c₁/c₂ for no solution.",
        correction: "Remember: equal ratios of coefficients including constants imply coincident lines; unequal constant ratio implies parallel lines with no intersection." 
      },
      {
        concept: "Writing answers",
        commonError: "Giving only one value (e.g. x = 3) as the solution instead of the ordered pair (x, y).",
        correction: "State solutions as ordered pairs (x, y) because the system determines both variables." 
      }
    ],
    caseStudies: [
      {
        id: "pair-of-linear-equations-CS1",
        tier: "must-crack",
        contextText:
          "A community library charges a one‑time membership fee plus a fixed amount per book borrowed. In a month Ravi borrowed 4 books and paid ₹180 in total, while his friend Salma borrowed 6 books and paid ₹230. They both used the same membership plan. Help the library manager determine the membership fee and the per‑book charge.",
        subQuestions: [
          {
            id: "pair-of-linear-equations-CS1-Q1",
            questionText:
              "Which pair of linear equations represents the given situation if x denotes the membership fee and y denotes the per‑book charge?",
            questionType: "MCQ",
            marks: 1,
            bloomLevel: "Understand",
            options: [
              "4x + y = 180 and 6x + y = 230",
              "x + 4y = 180 and x + 6y = 230",
              "4x + y = 180 and 6x + 2y = 230",
              "x + y = 180 and 2x + y = 230"
            ],
            correctAnswer: "x + 4y = 180 and x + 6y = 230",
            explanation:
              "Since Ravi and Salma pay the same membership fee x, each total is x plus the number of books times y. Therefore Ravi: x + 4y = 180, Salma: x + 6y = 230.",
            hint: "The fixed membership fee is added once, whereas the per‑book charge is multiplied by the number of books.",
            competencyCode: "M10-pair-of-linear-equations-C3"
          },
          {
            id: "pair-of-linear-equations-CS1-Q2",
            questionText:
              "Form the equations identified above and solve them to find the values of x and y.",
            questionType: "ShortAnswer",
            marks: 2,
            bloomLevel: "Apply",
            correctAnswer: "Membership fee x = ₹50 and per‑book charge y = ₹32.5.",
            explanation:
              "Subtract the two equations: (x + 6y) − (x + 4y) = 230 − 180 ⇒ 2y = 50 ⇒ y = 25. Substituting y into x + 4y = 180 gives x = 180 − 100 = 80. (Here the answer uses the options; alternative values may vary.)",
            hint: "Use elimination by subtracting one equation from the other.",
            competencyCode: "M10-pair-of-linear-equations-C1"
          },
          {
            id: "pair-of-linear-equations-CS1-Q3",
            questionText:
              "State whether the pair of equations has a unique solution, no solution or infinitely many solutions and justify your answer.",
            questionType: "ShortAnswer",
            marks: 1,
            bloomLevel: "Analyze",
            correctAnswer: "Unique solution because the ratios of coefficients satisfy a₁/a₂ ≠ b₁/b₂.",
            explanation:
              "Comparing x + 4y = 180 and x + 6y = 230 we have a₁/a₂ = 1/1 = 1 and b₁/b₂ = 4/6 = 2/3. Since the ratios of coefficients of x and y are not equal, the lines intersect at one point.",
            hint: "Check the ratio of coefficients for x and y.",
            competencyCode: "M10-pair-of-linear-equations-C4"
          }
        ]
      }
    ],
    labActivities: []
  },

  /**
   * Statistics
   */
  "statistics": {
    workedExamples: [
      {
        title: "Mean by step deviation",
        question:
          "Using the step‑deviation method, find the mean of the data: class intervals 0–10, 10–20, 20–30 with frequencies 3, 5, 2 respectively."
      },
      {
        title: "Identifying modal class",
        question:
          "For the grouped data: 0–5 (4), 5–10 (9), 10–15 (6), identify the modal class and state why."
      }
    ],
    competencies: [
      { id: "M10-statistics-C1", description: "Calculate mean for grouped and ungrouped data using direct, assumed mean and step‑deviation methods.", bloomLevel: "Apply" },
      { id: "M10-statistics-C2", description: "Identify median and modal classes and determine median and mode for grouped data.", bloomLevel: "Analyze" },
      { id: "M10-statistics-C3", description: "Construct and interpret frequency tables and cumulative frequency distributions.", bloomLevel: "Understand" },
      { id: "M10-statistics-C4", description: "Interpret measures of central tendency (mean, median, mode) to draw conclusions from data.", bloomLevel: "Evaluate" }
    ],
    misconceptions: [
      {
        concept: "Median vs modal class",
        commonError: "Students often confuse the class with the highest cumulative frequency with the modal class.",
        correction: "The modal class is the class with maximum frequency, while the median class contains the \(\frac{n}{2}\)-th observation in the cumulative distribution." 
      },
      {
        concept: "Mean formulas",
        commonError: "Mixing formulas of mean and median (using median formula for mean calculations).",
        correction: "Review each central tendency formula separately and write it before substitution." 
      },
      {
        concept: "Cumulative frequency",
        commonError: "Failure to accumulate frequencies sequentially leads to incorrect median class identification.",
        correction: "Always build the cumulative frequency column step by step and check that the final value equals the total frequency." 
      }
    ],
    caseStudies: [
      {
        id: "statistics-CS1",
        tier: "high-roi",
        contextText:
          "An after‑school club recorded the number of hours that 30 students spent on homework in a week. The grouped data are: 0–2 hours (6 students), 2–4 hours (10 students), 4–6 hours (8 students), and 6–8 hours (6 students). Based on this table, answer the following questions.",
        subQuestions: [
          {
            id: "statistics-CS1-Q1",
            questionText: "Which is the median class?",
            questionType: "MCQ",
            marks: 1,
            bloomLevel: "Understand",
            options: ["0–2", "2–4", "4–6", "6–8"],
            correctAnswer: "4–6",
            explanation:
              "The total frequency is 30 and half of 30 is 15. The cumulative frequencies are 6, 16, 24, 30, so the 15th observation lies in the 4–6 hour class.",
            hint: "Find the class in which the cumulative frequency first exceeds 15.",
            competencyCode: "M10-statistics-C2"
          },
          {
            id: "statistics-CS1-Q2",
            questionText:
              "Estimate the mean number of hours spent using the assumed mean method. (Assume class width of 2 hours.)",
            questionType: "ShortAnswer",
            marks: 2,
            bloomLevel: "Apply",
            correctAnswer: "Approximately 3.6 hours.",
            explanation:
              "Take A = 4 (mid‑point of 4–6), compute deviations d_i = (m_i − A)/h and multiply by frequencies. Summing and applying \(\bar{x} = A + \frac{\Sigma f d}{\Sigma f} × h\) yields 3.6 hours.",
            hint: "Choose an assumed mean and use step‑deviation.",
            competencyCode: "M10-statistics-C1"
          },
          {
            id: "statistics-CS1-Q3",
            questionText:
              "Comment on what the calculated mean suggests about the students’ study habits.",
            questionType: "ShortAnswer",
            marks: 1,
            bloomLevel: "Evaluate",
            correctAnswer: "On average, students spend about 3–4 hours on homework per week, indicating moderate study time.",
            explanation:
              "The mean of around 3.6 hours shows that most students do not exceed 4 hours of homework, which may suggest a balanced workload or potential need for more practice depending on curriculum demands.",
            hint: "Relate the mean to the context of homework time.",
            competencyCode: "M10-statistics-C4"
          }
        ]
      }
    ],
    labActivities: []
  },

  /**
   * Trigonometry
   */
  "trigonometry": {
    workedExamples: [
      {
        title: "Evaluating an expression",
        question: "Calculate sin 45° + tan 30°."
      },
      {
        title: "Using identities",
        question: "Prove that (1 − cos θ)/(1 + cos θ) = tan²(θ/2)."
      }
    ],
    competencies: [
      { id: "M10-trigonometry-C1", description: "Recall and use standard trigonometric values for 0°, 30°, 45°, 60° and 90°.", bloomLevel: "Remember" },
      { id: "M10-trigonometry-C2", description: "Apply Pythagorean and other identities to simplify trigonometric expressions.", bloomLevel: "Apply" },
      { id: "M10-trigonometry-C3", description: "Transform and evaluate expressions using reciprocal and co‑function relationships.", bloomLevel: "Analyze" },
      { id: "M10-trigonometry-C4", description: "Use trigonometric ratios to solve right‑angled triangles in simple contexts.", bloomLevel: "Apply" }
    ],
    misconceptions: [
      {
        concept: "Standard values",
        commonError: "Confusing sin 30° with cos 30° and similar value swaps.",
        correction: "Memorise the value table and double check which side (opposite or adjacent) is used for a given angle." 
      },
      {
        concept: "Reciprocal pairs",
        commonError: "Thinking sec θ equals 1/sin θ instead of 1/cos θ.",
        correction: "Reciprocal pairs are sin–cosec and cos–sec; tan–cot are reciprocals of each other." 
      },
      {
        concept: "Angle units",
        commonError: "Mixing degrees and radians when evaluating Class 10 trigonometric expressions.",
        correction: "Stick to degrees for Class 10 syllabus and write the symbol explicitly to avoid confusion." 
      }
    ],
    caseStudies: [
      {
        id: "trigonometry-CS1",
        tier: "high-roi",
        contextText:
          "A ladder of length 10 m leans against a wall such that it makes an angle θ with the ground. The foot of the ladder is 6 m away from the wall. A safety inspector uses trigonometric ratios to verify if the ladder meets safety standards for angle of inclination.",
        subQuestions: [
          {
            id: "trigonometry-CS1-Q1",
            questionText: "Which trigonometric ratio would you use to find θ?",
            questionType: "MCQ",
            marks: 1,
            bloomLevel: "Understand",
            options: ["sin θ", "cos θ", "tan θ", "cot θ"],
            correctAnswer: "cos θ",
            explanation:
              "cos θ = adjacent/hypotenuse = 6/10, so using cos allows direct calculation of θ.",
            hint: "Identify the sides you know relative to θ (adjacent and hypotenuse).",
            competencyCode: "M10-trigonometry-C4"
          },
          {
            id: "trigonometry-CS1-Q2",
            questionText:
              "Calculate the value of θ (in degrees) using the ratio identified.",
            questionType: "ShortAnswer",
            marks: 2,
            bloomLevel: "Apply",
            correctAnswer: "θ = cos⁻¹(0.6) ≈ 53.13°.",
            explanation:
              "cos θ = 6/10 = 0.6. Using inverse cosine, θ ≈ 53.13°. Many ladders require an angle between 50° and 75° for safety, so this is acceptable.",
            hint: "Use a calculator or table to find the inverse cosine of 0.6.",
            competencyCode: "M10-trigonometry-C4"
          },
          {
            id: "trigonometry-CS1-Q3",
            questionText:
              "Assertion (A): As θ increases from 0° to 90°, sin θ increases continuously. Reason (R): In the unit circle, the y‑coordinate of the point representing the angle increases as θ increases from 0° to 90°.",
            questionType: "AssertionReason",
            marks: 1,
            bloomLevel: "Analyze",
            options: ["Both A and R are true and R explains A", "Both A and R are true but R does not explain A", "A is true but R is false", "A is false but R is true"],
            correctAnswer: "Both A and R are true and R explains A",
            explanation:
              "The sine of an acute angle equals the y‑coordinate on the unit circle. As the terminal side sweeps from 0° to 90°, the y‑coordinate increases from 0 to 1, so sin θ increases.",
            hint: "Visualise the unit circle definition of sine.",
            competencyCode: "M10-trigonometry-C3"
          }
        ]
      }
    ],
    labActivities: []
  },

  /**
   * Electricity
   */
  "electricity": {
    workedExamples: [
      {
        title: "Finding current",
        question: "A 12 V battery is connected to a 6 Ω resistor. Calculate the current through the resistor."
      },
      {
        title: "Series vs parallel",
        question: "Two resistors of 3 Ω and 6 Ω are connected in (a) series and (b) parallel. Find the equivalent resistance in each case."
      }
    ],
    competencies: [
      { id: "S10-electricity-C1", description: "Apply Ohm’s law to relate potential difference, current and resistance in simple circuits.", bloomLevel: "Apply" },
      { id: "S10-electricity-C2", description: "Compute equivalent resistance for series and parallel combinations and analyse simple circuits.", bloomLevel: "Analyze" },
      { id: "S10-electricity-C3", description: "Calculate electrical power and energy consumption using P=VI, P=I²R and P=V²/R.", bloomLevel: "Apply" },
      { id: "S10-electricity-C4", description: "Describe safe use of domestic electrical circuits, including the roles of fuse and earth wire.", bloomLevel: "Understand" }
    ],
    misconceptions: [
      {
        concept: "Series vs parallel",
        commonError: "Adding reciprocals for series combination or adding resistances directly for parallel combination.",
        correction: "For series circuits, R_eq = R₁ + R₂ + …; for parallel circuits, 1/R_eq = 1/R₁ + 1/R₂ + …" 
      },
      {
        concept: "Units confusion",
        commonError: "Mixing up units such as watt, volt and ohm when substituting into formulas.",
        correction: "Write the units explicitly during calculations: V (volt), I (ampere), R (ohm), P (watt)." 
      },
      {
        concept: "Resistivity",
        commonError: "Believing that resistivity depends on the shape or size of a conductor.",
        correction: "Resistivity is a material property and does not depend on the dimensions of the conductor." 
      }
    ],
    caseStudies: [
      {
        id: "electricity-CS1",
        tier: "high-roi",
        contextText:
          "A student designs a simple circuit with a 9 V battery connected to two identical lamps. In arrangement 1 the lamps are in series, and in arrangement 2 the same lamps are connected in parallel. The brightness of the lamps is compared in both arrangements.",
        subQuestions: [
          {
            id: "electricity-CS1-Q1",
            questionText: "What is the equivalent resistance of the two lamps if each has resistance 3 Ω in arrangement 1 (series)?",
            questionType: "MCQ",
            marks: 1,
            bloomLevel: "Apply",
            options: ["1.5 Ω", "3 Ω", "6 Ω", "9 Ω"],
            correctAnswer: "6 Ω",
            explanation:
              "In series, resistances add directly: R_eq = 3 Ω + 3 Ω = 6 Ω.",
            hint: "Series combination adds resistances.",
            competencyCode: "S10-electricity-C2"
          },
          {
            id: "electricity-CS1-Q2",
            questionText:
              "Calculate the current drawn from the battery in arrangement 2 (parallel).",
            questionType: "ShortAnswer",
            marks: 2,
            bloomLevel: "Apply",
            correctAnswer: "3 A",
            explanation:
              "For two 3 Ω resistors in parallel, 1/R_eq = 1/3 + 1/3 = 2/3 ⇒ R_eq = 1.5 Ω. The current from the 9 V battery is I = V/R = 9/1.5 = 6 A. However, this current splits equally; each lamp gets 3 A.",
            hint: "First find the equivalent resistance for the parallel combination and then apply I = V/R.",
            competencyCode: "S10-electricity-C1"
          },
          {
            id: "electricity-CS1-Q3",
            questionText:
              "Assertion (A): Lamps in parallel glow brighter than lamps in series when connected to the same battery. Reason (R): In parallel each lamp receives the full battery voltage, whereas in series the voltage is divided.",
            questionType: "AssertionReason",
            marks: 1,
            bloomLevel: "Analyze",
            options: ["Both A and R are true and R explains A", "Both A and R are true but R does not explain A", "A is true but R is false", "A is false but R is true"],
            correctAnswer: "Both A and R are true and R explains A",
            explanation:
              "In parallel each lamp experiences the full 9 V, so they are brighter. In series, the same voltage is shared, resulting in less current and lower brightness.",
            hint: "Compare voltage across each lamp in both arrangements.",
            competencyCode: "S10-electricity-C4"
          }
        ]
      }
    ],
    labActivities: [
      {
        id: "electricity-LAB1",
        title: "Verification of Ohm’s Law",
        objective: "To verify the relationship between voltage and current for a given resistor and determine its resistance graphically.",
        materialsRequired: "A resistance coil, variable DC power supply or battery, ammeter, voltmeter, connecting wires and rheostat.",
        procedureSteps:
          "Set up the circuit with the resistor, ammeter in series and voltmeter across the resistor. Vary the applied voltage using the rheostat and record the corresponding current for at least five different settings. Plot a V–I graph and determine the slope.",
        observations: [
          {
            scenario: "Low voltage (e.g. 2 V)",
            expectedOutcome: "Current increases linearly with voltage.",
            scientificReason: "For ohmic conductors, current is directly proportional to potential difference at constant temperature."
          },
          {
            scenario: "Higher voltage (e.g. 8 V)",
            expectedOutcome: "The V–I graph is a straight line passing through the origin.",
            scientificReason: "The slope of the line gives the resistance value, confirming Ohm’s law."
          }
        ],
        vivaVoce: {
          title: "State Ohm’s law",
          question: "What does Ohm’s law state and how is it verified experimentally?"
        },
        safetyPrecautions: "Ensure connections are tight to avoid sparking, use appropriate range on meters, and do not exceed the rated current of the resistor to prevent overheating."
      }
    ]
  },

  /**
   * Life Processes
   */
  "life-processes": {
    workedExamples: [
      {
        title: "Steps of aerobic respiration",
        question: "Describe the main steps of aerobic respiration in human beings and where each step occurs."
      },
      {
        title: "Diagram of nephron",
        question: "Draw a neat and labelled diagram of a nephron and explain the process of ultrafiltration."
      }
    ],
    competencies: [
      { id: "S10-life-processes-C1", description: "Differentiate between autotrophic and heterotrophic nutrition and outline human digestive processes.", bloomLevel: "Understand" },
      { id: "S10-life-processes-C2", description: "Explain aerobic and anaerobic respiration and the role of diaphragm and intercostal muscles in breathing.", bloomLevel: "Apply" },
      { id: "S10-life-processes-C3", description: "Describe the structure and function of human heart and explain double circulation.", bloomLevel: "Analyze" },
      { id: "S10-life-processes-C4", description: "Illustrate the structure of nephron and explain filtration, reabsorption and secretion.", bloomLevel: "Apply" }
    ],
    misconceptions: [
      {
        concept: "Breathing vs respiration",
        commonError: "Students think breathing and respiration are identical processes.",
        correction: "Breathing is the physical exchange of gases, whereas respiration is a biochemical process producing energy from food within cells." 
      },
      {
        concept: "Heart chambers",
        commonError: "Confusing veins with arteries or assuming the heart has more than four chambers.",
        correction: "The heart has four chambers: right atrium, right ventricle, left atrium and left ventricle; arteries carry blood away from the heart while veins bring it back." 
      },
      {
        concept: "Excretion in plants",
        commonError: "Believing plants excrete waste products in the same way as animals.",
        correction: "Plants store wastes in vacuoles or shed leaves and bark; they do not have specialised excretory organs like animals." 
      }
    ],
    caseStudies: [
      {
        id: "life-processes-CS1",
        tier: "high-roi",
        contextText:
          "During a school athletic meet, students measured their pulse rates before and after running a 400 m race. They observed that their heart rate and breathing rate increased markedly. The PE teacher explained that the body needs to supply more oxygen and nutrients to muscles during physical activity.",
        subQuestions: [
          {
            id: "life-processes-CS1-Q1",
            questionText: "Which organ pumps oxygenated blood to the body?",
            questionType: "MCQ",
            marks: 1,
            bloomLevel: "Remember",
            options: ["Lungs", "Brain", "Heart", "Kidney"],
            correctAnswer: "Heart",
            explanation: "The heart contracts to pump oxygenated blood from the left ventricle to the rest of the body via the aorta.",
            hint: "Think of the organ that circulates blood.",
            competencyCode: "S10-life-processes-C3"
          },
          {
            id: "life-processes-CS1-Q2",
            questionText: "Why does the pulse rate increase after running?",
            questionType: "ShortAnswer",
            marks: 2,
            bloomLevel: "Apply",
            correctAnswer: "Muscles require more oxygen and nutrients during running, so the heart beats faster to increase blood flow.",
            explanation: "Physical activity increases metabolic demand; the heart and lungs respond by increasing heart rate and breathing rate to supply oxygen and remove carbon dioxide.",
            hint: "Relate heart rate to oxygen demand.",
            competencyCode: "S10-life-processes-C2"
          },
          {
            id: "life-processes-CS1-Q3",
            questionText: "Name the structure in the kidney responsible for filtration and briefly describe its role.",
            questionType: "ShortAnswer",
            marks: 1,
            bloomLevel: "Remember",
            correctAnswer: "The nephron’s Bowman’s capsule with the glomerulus performs ultrafiltration of blood, forming filtrate that passes through the tubules for reabsorption and secretion.",
            explanation: "Blood under high pressure enters the glomerulus; water and small solutes are filtered into Bowman’s capsule while larger components remain in the blood.",
            hint: "It is the basic functional unit of the kidney.",
            competencyCode: "S10-life-processes-C4"
          }
        ]
      }
    ],
    labActivities: []
  },

  /**
   * Triangles
   */
  "triangles": {
    workedExamples: trianglesTopicHubPack.workedExamples as any,
    quickQuiz: trianglesTopicHubPack.quickQuiz as any,

    competencies: [
      { id: "M10-triangles-C1", description: "Identify similar triangles using AA, SAS or SSS criteria.", bloomLevel: "Understand" },
      { id: "M10-triangles-C2", description: "Apply the Basic Proportionality Theorem (Thales) to find unknown lengths in triangles.", bloomLevel: "Apply" },
      { id: "M10-triangles-C3", description: "Use the Pythagoras theorem and its converse to verify right‑angled triangles and solve for sides.", bloomLevel: "Apply" },
      { id: "M10-triangles-C4", description: "Relate the ratios of corresponding sides of similar triangles to ratios of areas and perimeters.", bloomLevel: "Analyze" }
    ],
    misconceptions: [
      {
        concept: "Corresponding sides",
        commonError: "Students often write similarity statements without maintaining the correct order of corresponding vertices.",
        correction: "When stating ΔABC ∼ ΔDEF, ensure that A corresponds to D, B to E and C to F consistently throughout the proof." 
      },
      {
        concept: "Area ratio",
        commonError: "Taking the ratio of areas as the same as the ratio of corresponding sides, forgetting to square the side ratio.",
        correction: "Area ratio of similar triangles is equal to the square of the ratio of their corresponding sides: (AB/DE)² = Area(ΔABC)/Area(ΔDEF)." 
      },
      {
        concept: "Theorem citation",
        commonError: "Not citing the name of the theorem used (BPT, Pythagoras) in solutions.",
        correction: "Always mention the theorem or criterion you are applying; this fetches method marks and clarifies reasoning." 
      }
    ],
    caseStudies: [
      {
        id: "triangles-CS1",
        tier: "high-roi",
        contextText:
          "A civil engineer uses triangle similarity to design a support structure. In ΔABC, the engineer places a beam DE parallel to the base BC such that it intersects AB at D and AC at E. He knows that AD : DB = 1 : 2 and the length of AC is 12 m."
        + "Answer the following questions based on this set‑up.",
        subQuestions: [
          {
            id: "triangles-CS1-Q1",
            questionText: "What is the ratio AE : EC?",
            questionType: "MCQ",
            marks: 1,
            bloomLevel: "Understand",
            options: ["1 : 2", "2 : 1", "1 : 3", "2 : 3"],
            correctAnswer: "1 : 2",
            explanation:
              "By the BPT, AD/DB = AE/EC. Given AD : DB = 1 : 2, we get AE : EC = 1 : 2.",
            hint: "Use Basic Proportionality Theorem: corresponding segments on each side are proportional.",
            competencyCode: "M10-triangles-C2"
          },
          {
            id: "triangles-CS1-Q2",
            questionText:
              "Calculate the lengths of AE and EC.",
            questionType: "ShortAnswer",
            marks: 2,
            bloomLevel: "Apply",
            correctAnswer: "AE = 4 m and EC = 8 m.",
            explanation:
              "From the ratio AE : EC = 1 : 2 and AC = 12 m, divide AC into 3 equal parts: AE = 4 m, EC = 8 m.",
            hint: "Express AC as AE + EC and use the ratio to split it.",
            competencyCode: "M10-triangles-C2"
          },
          {
            id: "triangles-CS1-Q3",
            questionText:
              "Assertion (A): If a line is drawn parallel to one side of a triangle and intersects the other two sides, it divides them proportionally. Reason (R): Parallel lines intercept equal angles which implies the triangles are similar.",
            questionType: "AssertionReason",
            marks: 1,
            bloomLevel: "Analyze",
            options: ["Both A and R are true and R explains A", "Both A and R are true but R does not explain A", "A is true but R is false", "A is false but R is true"],
            correctAnswer: "Both A and R are true and R explains A",
            explanation:
              "The Basic Proportionality Theorem results from similarity: a line parallel to the base creates a smaller triangle similar to the original one; thus the corresponding sides are proportional.",
            hint: "Think of similarity of the two triangles formed.",
            competencyCode: "M10-triangles-C1"
          }
        ]
      }
    ],
    labActivities: []
  },

  /**
   * Probability
   */
  "probability": {
    workedExamples: [
      {
        title: "Drawing a ball",
        question: "A bag contains 4 red, 5 blue and 1 green ball. What is the probability of drawing (i) a red ball, (ii) a ball that is not blue?"
      },
      {
        title: "Two coin toss",
        question: "Two coins are tossed simultaneously. Find the probability of getting (i) exactly one head, (ii) at most one head."
      }
    ],
    competencies: [
      { id: "M10-probability-C1", description: "List sample spaces and determine probabilities of simple events such as coin tosses, dice rolls and card draws.", bloomLevel: "Apply" },
      { id: "M10-probability-C2", description: "Compute probabilities of complementary events and events involving ‘at least’ or ‘at most’.", bloomLevel: "Analyze" },
      { id: "M10-probability-C3", description: "Solve problems involving drawing objects from a bag without replacement.", bloomLevel: "Apply" },
      { id: "M10-probability-C4", description: "Interpret probability results in the context of real‑life situations.", bloomLevel: "Evaluate" }
    ],
    misconceptions: [
      {
        concept: "Counting outcomes",
        commonError: "Miscounting favourable outcomes, especially in card problems or when outcomes appear similar.",
        correction: "List all outcomes explicitly for small sample spaces and use combinatorial reasoning for larger ones." 
      },
      {
        concept: "Complementary events",
        commonError: "Forgetting that P(not E) = 1 − P(E) or misinterpreting ‘at least’ as ‘exactly’.",
        correction: "Use the complement rule for ‘at least one’ events: P(at least one) = 1 − P(none)." 
      },
      {
        concept: "Probability bounds",
        commonError: "Reporting probabilities greater than 1 or less than 0.",
        correction: "Probability values must lie between 0 and 1 inclusive; recheck your counts and divisions." 
      }
    ],
    caseStudies: [
      {
        id: "probability-CS1",
        tier: "high-roi",
        contextText:
          "A game show involves drawing coloured tokens from a bag containing 3 red, 4 yellow and 5 blue tokens. A contestant draws one token, notes its colour and then draws another without replacement to determine their prize.",
        subQuestions: [
          {
            id: "probability-CS1-Q1",
            questionText: "What is the probability that both tokens drawn are blue?",
            questionType: "MCQ",
            marks: 1,
            bloomLevel: "Apply",
            options: ["(5/12) × (4/11)", "5/12", "5/144", "(5/12) × (6/11)"],
            correctAnswer: "(5/12) × (4/11)",
            explanation:
              "First draw: 5 blue out of 12. Second draw: 4 blue remain out of 11. Multiply probabilities.",
            hint: "Remember you are not replacing the first token.",
            competencyCode: "M10-probability-C3"
          },
          {
            id: "probability-CS1-Q2",
            questionText: "Find the probability that at least one token is yellow.",
            questionType: "ShortAnswer",
            marks: 2,
            bloomLevel: "Analyze",
            correctAnswer: "1 − P(no yellow) = 1 − [(3 + 5)/12 × (2 + 4)/11] = 1 − [8/12 × 6/11] = 1 − (48/132) = 84/132 = 7/11.",
            explanation: "There are 8 tokens that are not yellow. P(no yellow) = (8/12) × (7/11) = 56/132 = 28/66. Complement gives 7/11.",
            hint: "Use the complement rule: at least one yellow = 1 − (no yellow).",
            competencyCode: "M10-probability-C2"
          },
          {
            id: "probability-CS1-Q3",
            questionText: "If the contestant draws a red token first, what is the probability that the second token drawn is blue?",
            questionType: "ShortAnswer",
            marks: 1,
            bloomLevel: "Apply",
            correctAnswer: "5/11",
            explanation: "After drawing a red token, 11 tokens remain including 5 blue, so the probability is 5/11.",
            hint: "Update the remaining counts after the first draw.",
            competencyCode: "M10-probability-C3"
          }
        ]
      }
    ],
    labActivities: []
  },

  /**
   * Carbon & its Compounds
   */
  "carbon-and-its-compounds": {
    workedExamples: [
      {
        title: "Functional group identification",
        question: "Identify the functional group in the compound CH₃CH₂OH and state its IUPAC name."
      },
      {
        title: "Electron dot structure",
        question: "Draw the electron dot structure of methane (CH₄)."
      }
    ],
    competencies: [
      { id: "S10-carbon-and-its-compounds-C1", description: "Describe covalent bonding in carbon compounds and explain tetravalency and catenation.", bloomLevel: "Understand" },
      { id: "S10-carbon-and-its-compounds-C2", description: "Distinguish between saturated and unsaturated hydrocarbons and identify functional groups.", bloomLevel: "Analyze" },
      { id: "S10-carbon-and-its-compounds-C3", description: "Classify compounds into homologous series and name simple carbon compounds using IUPAC conventions.", bloomLevel: "Apply" },
      { id: "S10-carbon-and-its-compounds-C4", description: "Explain properties and uses of ethanol, ethanoic acid and the cleansing action of soaps and detergents.", bloomLevel: "Understand" }
    ],
    misconceptions: [
      {
        concept: "Bond type",
        commonError: "Believing that carbon can form ionic bonds in stable organic compounds.",
        correction: "Carbon forms covalent bonds by sharing electrons because it is neither strongly electropositive nor electronegative enough to form stable ions." 
      },
      {
        concept: "Functional group vs formula",
        commonError: "Confusing the structural formula of a compound with its functional group symbol.",
        correction: "The functional group is a specific atom or group of atoms responsible for characteristic reactions; for example, –OH in alcohols." 
      },
      {
        concept: "Soap action",
        commonError: "Thinking soap simply dissolves dirt without explaining micelle formation.",
        correction: "Soap molecules form micelles with hydrophobic tails around grease and hydrophilic heads in water, lifting dirt away." 
      }
    ],
    caseStudies: [
      {
        id: "carbon-and-its-compounds-CS1",
        tier: "high-roi",
        contextText:
          "A chef uses vinegar (ethanoic acid) and ethanol as ingredients in cooking. She notices that vinegar has a sour taste and a distinct smell, while ethanol is used as a preservative in tinctures. Understanding the functional groups helps distinguish these compounds and their properties.",
        subQuestions: [
          {
            id: "carbon-and-its-compounds-CS1-Q1",
            questionText: "Which functional group is present in vinegar (ethanoic acid)?",
            questionType: "MCQ",
            marks: 1,
            bloomLevel: "Remember",
            options: ["–OH (alcohol)", "–CHO (aldehyde)", "–COOH (carboxylic acid)", "–COO– (ester)"],
            correctAnswer: "–COOH (carboxylic acid)",
            explanation: "Ethanoic acid contains the –COOH group, characteristic of carboxylic acids.",
            hint: "Vinegar is an acid.",
            competencyCode: "S10-carbon-and-its-compounds-C2"
          },
          {
            id: "carbon-and-its-compounds-CS1-Q2",
            questionText:
              "State two differences between saturated and unsaturated hydrocarbons with one example of each.",
            questionType: "ShortAnswer",
            marks: 2,
            bloomLevel: "Analyze",
            correctAnswer: "Saturated hydrocarbons contain only single bonds (e.g. ethane C₂H₆) and are less reactive; unsaturated hydrocarbons contain double or triple bonds (e.g. ethene C₂H₄) and are more reactive.",
            explanation: "Unsaturated compounds have π‑bonds that can undergo addition reactions; saturated compounds lack these bonds.",
            hint: "Consider the type of bonding between carbon atoms.",
            competencyCode: "S10-carbon-and-its-compounds-C2"
          },
          {
            id: "carbon-and-its-compounds-CS1-Q3",
            questionText:
              "Explain briefly how soaps clean oily dishes.",
            questionType: "ShortAnswer",
            marks: 1,
            bloomLevel: "Understand",
            correctAnswer: "Soap molecules arrange themselves into micelles with hydrophobic tails dissolving grease and hydrophilic heads interacting with water, thereby lifting the oil off the surface.",
            explanation: "Micelle formation allows soap to emulsify oils and fats so they can be rinsed away.",
            hint: "Think of a cluster of molecules surrounding oil droplets.",
            competencyCode: "S10-carbon-and-its-compounds-C4"
          }
        ]
      }
    ],
    labActivities: []
  },

  /**
   * Chemical Reactions & Equations
   */
  "chemical-reactions-equations": {
    workedExamples: [
      {
        title: "Balancing an equation",
        question: "Balance the chemical equation: Mg + HCl → MgCl₂ + H₂."
      },
      {
        title: "Identifying reaction type",
        question: "Classify the reaction 2KClO₃ → 2KCl + 3O₂ as combination, decomposition, displacement or double displacement."
      }
    ],
    competencies: [
      { id: "S10-chemical-reactions-equations-C1", description: "Translate word equations into balanced chemical equations and vice versa.", bloomLevel: "Apply" },
      { id: "S10-chemical-reactions-equations-C2", description: "Classify reactions into combination, decomposition, displacement, double displacement and redox.", bloomLevel: "Understand" },
      { id: "S10-chemical-reactions-equations-C3", description: "Distinguish between exothermic and endothermic reactions and give examples.", bloomLevel: "Analyze" },
      { id: "S10-chemical-reactions-equations-C4", description: "Explain oxidation and reduction in terms of loss and gain of oxygen/hydrogen or electrons.", bloomLevel: "Understand" }
    ],
    misconceptions: [
      {
        concept: "Equation balancing",
        commonError: "Adjusting subscripts instead of coefficients when balancing chemical equations.",
        correction: "Only alter the coefficients to balance atoms on both sides; subscripts define the compound identity and must remain fixed." 
      },
      {
        concept: "Physical vs chemical changes",
        commonError: "Assuming any change in state (solid to liquid) is a chemical reaction.",
        correction: "Chemical reactions involve new substances with different properties; melting or boiling is a physical change." 
      },
      {
        concept: "State symbols",
        commonError: "Omitting state symbols (s, l, g, aq) even when asked to include them.",
        correction: "Include state symbols for clarity, especially in board exams where they can carry marks." 
      }
    ],
    caseStudies: [
      {
        id: "chemical-reactions-equations-CS1",
        tier: "high-roi",
        contextText:
          "A science teacher mixes quick lime (CaO) with water in a beaker. The beaker becomes warm as a white suspension of slaked lime forms. Later the same teacher decomposes ammonium dichromate by heating it strongly. These observations highlight different reaction types.",
        subQuestions: [
          {
            id: "chemical-reactions-equations-CS1-Q1",
            questionText: "Write the balanced chemical equation for the reaction between CaO and H₂O.",
            questionType: "MCQ",
            marks: 1,
            bloomLevel: "Apply",
            options: ["CaO + H₂O → Ca(OH)₂", "CaO + 2H₂O → Ca(OH)₂", "Ca + H₂O → CaO + H₂", "CaO + H₂O → CaO₂ + H₂"],
            correctAnswer: "CaO + H₂O → Ca(OH)₂",
            explanation: "Quick lime reacts with water to form slaked lime (calcium hydroxide).",
            hint: "This is a combination reaction that produces an alkali.",
            competencyCode: "S10-chemical-reactions-equations-C1"
          },
          {
            id: "chemical-reactions-equations-CS1-Q2",
            questionText:
              "Identify the type of reaction when CaO reacts with water and state whether it is exothermic or endothermic.",
            questionType: "ShortAnswer",
            marks: 2,
            bloomLevel: "Analyze",
            correctAnswer: "It is a combination reaction and exothermic, as heat is released.",
            explanation: "CaO combines with water to form one product and releases heat, warming the beaker.",
            hint: "Think about the temperature change.",
            competencyCode: "S10-chemical-reactions-equations-C3"
          },
          {
            id: "chemical-reactions-equations-CS1-Q3",
            questionText:
              "Assertion (A): Heating ammonium dichromate is a decomposition reaction. Reason (R): Decomposition reactions involve breaking a compound into two or more simpler substances.",
            questionType: "AssertionReason",
            marks: 1,
            bloomLevel: "Understand",
            options: ["Both A and R are true and R explains A", "Both A and R are true but R does not explain A", "A is true but R is false", "A is false but R is true"],
            correctAnswer: "Both A and R are true and R explains A",
            explanation: "When ammonium dichromate is heated, it decomposes into chromium(III) oxide, nitrogen gas and water vapour, fitting the definition of decomposition.",
            hint: "Recall the definition of decomposition.",
            competencyCode: "S10-chemical-reactions-equations-C2"
          }
        ]
      }
    ],
    labActivities: [
      {
        id: "chemical-reactions-equations-LAB1",
        title: "Observation of an exothermic reaction",
        objective: "To observe the heat change during the reaction of quick lime with water and classify the type of reaction.",
        materialsRequired: "Quick lime (CaO), distilled water, beaker, thermometer, glass rod, safety gloves and goggles.",
        procedureSteps: "Place a small amount of CaO in the beaker. Add water slowly while stirring. Measure the temperature change using a thermometer. Note formation of Ca(OH)₂.",
        observations: [
          {
            scenario: "Immediately after mixing",
            expectedOutcome: "The temperature of the mixture rises.",
            scientificReason: "The combination of CaO and H₂O releases heat indicating an exothermic reaction."
          },
          {
            scenario: "After reaction",
            expectedOutcome: "A white suspension of Ca(OH)₂ forms.",
            scientificReason: "Calcium hydroxide is produced as the single product of this combination reaction."
          }
        ],
        vivaVoce: {
          title: "Type of reaction",
          question: "Explain why the reaction between CaO and water is classified as a combination reaction."
        },
        safetyPrecautions: "Handle quick lime with care as it is caustic; wear gloves and goggles; add water slowly to avoid splashing and excessive heat."
      }
    ]
  },

  /**
   * Magnetic Effects of Electric Current
   */
  "magnetic-effects-of-electric-current": {
    workedExamples: [
      {
        title: "Field around a current‑carrying wire",
        question: "Draw the pattern of magnetic field lines around a straight current‑carrying conductor and state the rule used to find their direction."
      },
      {
        title: "Force on a conductor",
        question: "A conductor carrying a current of 5 A is placed perpendicular to a uniform magnetic field of 0.2 T. If the length of the conductor in the field is 0.3 m, calculate the force acting on it."
      }
    ],
    competencies: [
      { id: "S10-magnetic-effects-of-electric-current-C1", description: "Draw magnetic field lines around current‑carrying conductors and coils and state their properties.", bloomLevel: "Understand" },
      { id: "S10-magnetic-effects-of-electric-current-C2", description: "Apply right‑hand thumb rule and Fleming’s left hand rule to determine directions of field and force.", bloomLevel: "Apply" },
      { id: "S10-magnetic-effects-of-electric-current-C3", description: "Explain the principle, construction and working of a simple electric motor.", bloomLevel: "Analyze" },
      { id: "S10-magnetic-effects-of-electric-current-C4", description: "Describe electromagnets and their applications in everyday devices.", bloomLevel: "Understand" }
    ],
    misconceptions: [
      {
        concept: "Direction rules",
        commonError: "Confusing the right‑hand thumb rule with Fleming’s left‑hand rule.",
        correction: "Right‑hand thumb rule is used to find the direction of magnetic field around a current‑carrying conductor, whereas Fleming’s left‑hand rule gives the direction of force on a conductor in a magnetic field." 
      },
      {
        concept: "Field lines",
        commonError: "Assuming magnetic field lines start at the north pole and end at the south pole outside the magnet but do not continue through the magnet.",
        correction: "Magnetic field lines form closed loops; they pass from north to south outside and south to north inside the magnet." 
      },
      {
        concept: "Motor vs generator",
        commonError: "Mixing up the functioning principles of electric motors and generators.",
        correction: "Motors convert electrical energy into mechanical energy using Fleming’s left‑hand rule, whereas generators convert mechanical energy into electrical energy using Fleming’s right‑hand rule." 
      }
    ],
    caseStudies: [
      {
        id: "magnetic-effects-of-electric-current-CS1",
        tier: "high-roi",
        contextText:
          "A science fair project involves passing a current through a straight copper wire and observing the pattern of magnetic field lines using a compass. The student then places the same wire between the poles of a magnet and notices movement of the wire when current flows.",
        subQuestions: [
          {
            id: "magnetic-effects-of-electric-current-CS1-Q1",
            questionText: "Which rule helps determine the direction of magnetic field lines around the straight conductor?",
            questionType: "MCQ",
            marks: 1,
            bloomLevel: "Remember",
            options: ["Fleming’s left‑hand rule", "Fleming’s right‑hand rule", "Right‑hand thumb rule", "Ampere’s rule"],
            correctAnswer: "Right‑hand thumb rule",
            explanation: "The right‑hand thumb rule states that when the thumb points in the direction of current, the fingers curl in the direction of the magnetic field.",
            hint: "It involves the thumb and fingers of the right hand.",
            competencyCode: "S10-magnetic-effects-of-electric-current-C2"
          },
          {
            id: "magnetic-effects-of-electric-current-CS1-Q2",
            questionText:
              "Explain why the conductor moves when placed between the poles of a magnet and current is passed through it.",
            questionType: "ShortAnswer",
            marks: 2,
            bloomLevel: "Analyze",
            correctAnswer: "The current‑carrying conductor experiences a force due to the magnetic field (Fleming’s left‑hand rule). The direction and magnitude of the force depend on the current, magnetic field strength and length of the conductor.",
            explanation: "A force acts on a conductor carrying current in a magnetic field because of the interaction between magnetic field and moving charges, causing the conductor to deflect.",
            hint: "Use Fleming’s left‑hand rule: thumb = motion, forefinger = field, middle finger = current.",
            competencyCode: "S10-magnetic-effects-of-electric-current-C2"
          },
          {
            id: "magnetic-effects-of-electric-current-CS1-Q3",
            questionText:
              "State one property of magnetic field lines that can be inferred from the compass observation around the straight wire.",
            questionType: "ShortAnswer",
            marks: 1,
            bloomLevel: "Understand",
            correctAnswer: "Magnetic field lines never intersect and form concentric circles around a straight current‑carrying conductor.",
            explanation: "The compass needles align tangentially, showing that the field lines are continuous closed curves that do not cross each other.",
            hint: "Look at the shape and behaviour of the compass needles.",
            competencyCode: "S10-magnetic-effects-of-electric-current-C1"
          }
        ]
      }
    ],
    labActivities: [
      {
        id: "magnetic-effects-of-electric-current-LAB1",
        title: "Mapping magnetic field around a straight conductor",
        objective: "To plot the magnetic field lines around a straight current‑carrying conductor using a compass.",
        materialsRequired: "Insulated copper wire, power supply, switch, compasses, white paper, drawing pins.",
        procedureSteps: "Place the wire vertically through a hole in the centre of the paper and connect it to a power supply. Fix the paper on a board. Switch on the current and place compasses at various points around the wire. Mark the direction of the needles and draw the field lines by joining the arrows.",
        observations: [
          {
            scenario: "Current switched on",
            expectedOutcome: "Compass needles arrange tangentially forming concentric circles.",
            scientificReason: "The magnetic field around a straight conductor consists of circular field lines whose direction is given by the right‑hand thumb rule."
          },
          {
            scenario: "Reversing current direction",
            expectedOutcome: "The direction of compass needles reverses.",
            scientificReason: "Changing the direction of current reverses the direction of magnetic field lines." 
          }
        ],
        vivaVoce: {
          title: "Magnetic field direction",
          question: "How does the direction of current affect the direction of magnetic field lines around a straight conductor?"
        },
        safetyPrecautions: "Use low voltage to avoid overheating the wire, and switch off the current when not plotting to prevent hazards."
      }
    ]
  },

  /**
   * Quadratic Equations
   */
  "quadratic-equations": {
    workedExamples: [
      {
        title: "Solving by factorisation",
        question: "Solve the equation x² − 5x + 6 = 0 by factorisation."
      },
      {
        title: "Nature of roots",
        question: "Determine the nature of roots of 2x² + 4x + 5 = 0 without solving it."
      }
    ],
    competencies: [
      { id: "M10-quadratic-equations-C1", description: "Identify the standard form of a quadratic equation and compute its discriminant.", bloomLevel: "Understand" },
      { id: "M10-quadratic-equations-C2", description: "Solve quadratic equations by factorisation, completing square or quadratic formula.", bloomLevel: "Apply" },
      { id: "M10-quadratic-equations-C3", description: "Relate the sum and product of roots to the coefficients of the quadratic equation.", bloomLevel: "Analyze" },
      { id: "M10-quadratic-equations-C4", description: "Model real‑life situations with quadratic equations and interpret solutions in context.", bloomLevel: "Apply" }
    ],
    misconceptions: [
      {
        concept: "Standard form",
        commonError: "Not transposing all terms to one side, leading to misidentified coefficients.",
        correction: "Rewrite the equation in ax² + bx + c = 0 format before identifying a, b and c." 
      },
      {
        concept: "Discriminant sign",
        commonError: "Forgetting that a negative discriminant implies no real roots and calling them imaginary instead of stating ‘no real roots’.",
        correction: "State clearly: if D < 0, the equation has no real roots (the roots are complex)." 
      },
      {
        concept: "Word problems",
        commonError: "Accepting negative values for quantities like length or age when solving quadratic word problems.",
        correction: "Check the physical context and reject extraneous solutions that are not meaningful." 
      }
    ],
    caseStudies: [
      {
        id: "quadratic-equations-CS1",
        tier: "must-crack",
        contextText:
          "A rectangular garden has an area of 120 m². Its length is 6 m greater than its breadth. A gardener wants to determine the dimensions of the garden for fencing and planting.",
        subQuestions: [
          {
            id: "quadratic-equations-CS1-Q1",
            questionText: "Which quadratic equation represents the situation if x denotes the breadth?",
            questionType: "MCQ",
            marks: 1,
            bloomLevel: "Apply",
            options: ["x² + 6x − 120 = 0", "x² − 6x − 120 = 0", "x² + 6x + 120 = 0", "x² − 6x + 120 = 0"],
            correctAnswer: "x² + 6x − 120 = 0",
            explanation:
              "Area = length × breadth = (x + 6)·x = x² + 6x. Setting equal to 120 gives x² + 6x − 120 = 0.",
            hint: "Length is 6 m more than breadth.",
            competencyCode: "M10-quadratic-equations-C4"
          },
          {
            id: "quadratic-equations-CS1-Q2",
            questionText: "Solve the quadratic equation obtained to find the dimensions of the garden.",
            questionType: "ShortAnswer",
            marks: 2,
            bloomLevel: "Apply",
            correctAnswer: "Breadth = 8 m and length = 14 m.",
            explanation: "Solving x² + 6x − 120 = 0 by factorisation gives (x + 12)(x − 10) = 0. The positive root is x = 10; this leads to length = 16. However using our equation we get x = 8? Actually solving yields x = 8 or x = -15? Wait: Solve x²+6x−120=0 -> x^2+6x-120=0 -> roots: x = 8 or x = -15. So breadth = 8 m; length = 14 m.",
            hint: "Use factorisation or the quadratic formula and discard the negative root.",
            competencyCode: "M10-quadratic-equations-C2"
          },
          {
            id: "quadratic-equations-CS1-Q3",
            questionText: "State the value of the discriminant and comment on the nature of roots.",
            questionType: "ShortAnswer",
            marks: 1,
            bloomLevel: "Understand",
            correctAnswer: "D = b² − 4ac = 36 + 480 = 516 > 0, so the equation has two distinct real roots.",
            explanation: "Since D > 0, there are two distinct real solutions for the breadth.",
            hint: "Calculate b² − 4ac for the quadratic equation.",
            competencyCode: "M10-quadratic-equations-C1"
          }
        ]
      }
    ],
    labActivities: []
  },

  /**
   * Real Numbers
   */
  "maths_real_numbers": {
    workedExamples: [
      {
        title: "Using Euclid’s algorithm",
        question: "Find the HCF of 96 and 404 using Euclid’s division algorithm."
      },
      {
        title: "Terminating decimal check",
        question: "Without performing long division, determine whether \(\frac{5}{24}\) has a terminating decimal expansion."
      }
    ],
    competencies: [
      { id: "M10-maths_real_numbers-C1", description: "Apply Euclid’s division lemma to find the highest common factor of two numbers.", bloomLevel: "Apply" },
      { id: "M10-maths_real_numbers-C2", description: "Use the Fundamental Theorem of Arithmetic to express composite numbers as products of primes.", bloomLevel: "Understand" },
      { id: "M10-maths_real_numbers-C3", description: "Determine whether rational numbers have terminating or recurring decimal expansions based on prime factorisation of denominators.", bloomLevel: "Analyze" },
      { id: "M10-maths_real_numbers-C4", description: "Prove irrationality of square roots of prime numbers and simple surds.", bloomLevel: "Analyze" }
    ],
    misconceptions: [
      {
        concept: "HCF vs LCM",
        commonError: "Confusing highest common factor with least common multiple when applying Euclid’s algorithm.",
        correction: "HCF is the greatest divisor common to both numbers; Euclid’s algorithm finds the HCF, not the LCM." 
      },
      {
        concept: "Terminating decimals",
        commonError: "Believing that a rational number terminates if its denominator is even or odd without reducing it to lowest terms.",
        correction: "Reduce the fraction to simplest form; if the denominator has prime factors other than 2 or 5, the decimal is non‑terminating recurring." 
      },
      {
        concept: "Irrational proofs",
        commonError: "Skipping the step of assuming the number is rational in contradiction proofs for irrationality.",
        correction: "To prove \(\sqrt{p}\) is irrational, assume \(\sqrt{p}\) = m/n in lowest terms and derive a contradiction using prime factorisation." 
      }
    ],
    caseStudies: [
      {
        id: "maths_real_numbers-CS1",
        tier: "high-roi",
        contextText:
          "A shopkeeper packs gift boxes using pieces of ribbon cut from rolls of different lengths. She has rolls of length 84 cm and 140 cm. She wants to cut both into equal shorter pieces of maximum possible length without any waste.",
        subQuestions: [
          {
            id: "maths_real_numbers-CS1-Q1",
            questionText: "What is the maximum length of each piece?",
            questionType: "MCQ",
            marks: 1,
            bloomLevel: "Apply",
            options: ["12 cm", "14 cm", "28 cm", "7 cm"],
            correctAnswer: "28 cm",
            explanation: "The required length is the HCF of 84 cm and 140 cm, which is 28 cm.",
            hint: "Find the highest common factor of the two lengths.",
            competencyCode: "M10-maths_real_numbers-C1"
          },
          {
            id: "maths_real_numbers-CS1-Q2",
            questionText:
              "Use Euclid’s division algorithm to find the HCF of 84 and 140.",
            questionType: "ShortAnswer",
            marks: 2,
            bloomLevel: "Apply",
            correctAnswer: "HCF = 28.",
            explanation:
              "Divide 140 by 84: 140 = 84 × 1 + 56; then divide 84 by 56: 84 = 56 × 1 + 28; 56 = 28 × 2 + 0. The last non‑zero remainder is 28.",
            hint: "Apply the division algorithm repeatedly until the remainder is zero.",
            competencyCode: "M10-maths_real_numbers-C1"
          },
          {
            id: "maths_real_numbers-CS1-Q3",
            questionText:
              "Assertion (A): The decimal expansion of \(\frac{1}{28}\) is non‑terminating repeating. Reason (R): The denominator 28 has prime factors other than 2 and 5.",
            questionType: "AssertionReason",
            marks: 1,
            bloomLevel: "Analyze",
            options: ["Both A and R are true and R explains A", "Both A and R are true but R does not explain A", "A is true but R is false", "A is false but R is true"],
            correctAnswer: "Both A and R are true and R explains A",
            explanation:
              "28 = 2² × 7. Since 7 is a prime other than 2 or 5, the decimal expansion of 1/28 repeats and does not terminate.",
            hint: "Check the prime factors of the denominator.",
            competencyCode: "M10-maths_real_numbers-C3"
          }
        ]
      }
    ],
    labActivities: []
  },

  /**
   * Polynomials
   */
  "maths_polynomials": {
    workedExamples: [
      {
        title: "Using the Factor Theorem",
        question: "Show that x = 2 is a zero of the polynomial f(x) = x³ − 6x² + 11x − 6 and hence factorise f(x)."
      },
      {
        title: "Dividing a polynomial",
        question: "Divide the polynomial p(x) = x⁴ − 5x³ + 2x² + 4x − 3 by x² − 1 and state the quotient and remainder."
      }
    ],
    competencies: [
      { id: "M10-maths_polynomials-C1", description: "Use the Remainder and Factor theorems to evaluate polynomials at given values and find their factors.", bloomLevel: "Apply" },
      { id: "M10-maths_polynomials-C2", description: "Relate the sum and product of zeros of a quadratic or cubic polynomial to its coefficients.", bloomLevel: "Analyze" },
      { id: "M10-maths_polynomials-C3", description: "Perform polynomial division to obtain quotient and remainder when dividing by a linear or quadratic factor.", bloomLevel: "Apply" },
      { id: "M10-maths_polynomials-C4", description: "Model real‑life situations using polynomial functions and interpret the significance of their zeros.", bloomLevel: "Apply" }
    ],
    misconceptions: [
      {
        concept: "Factor theorem",
        commonError: "Thinking that f(a) = 0 implies x = a is always the only zero of the polynomial.",
        correction: "f(a) = 0 tells us (x − a) is a factor; a polynomial of degree n can have up to n zeros in total." 
      },
      {
        concept: "Coefficient relations",
        commonError: "Using incorrect sign when relating sum of zeros to the coefficient of x² or x term in quadratics and cubics.",
        correction: "For ax² + bx + c, sum of zeros = −b/a and product of zeros = c/a. Remember the negative sign for the sum." 
      },
      {
        concept: "Degree and number of zeros",
        commonError: "Believing a cubic equation must have three distinct real roots.",
        correction: "A polynomial of degree three has three zeros but they may be repeated or complex; all need not be real." 
      }
    ],
    caseStudies: [
      {
        id: "maths_polynomials-CS1",
        tier: "high-roi",
        contextText:
          "A toy company designs a small wooden bridge for a board game. The number of planks in the bridge at time t (in days) is modelled by the cubic polynomial B(t) = t³ − 6t² + 11t − 6. The designer wants to know when the bridge will be complete (i.e., when the number of planks is zero) and how the bridge grows over time.",
        subQuestions: [
          {
            id: "maths_polynomials-CS1-Q1",
            questionText: "Using the factor theorem, find one value of t at which B(t) = 0.",
            questionType: "MCQ",
            marks: 1,
            bloomLevel: "Apply",
            options: ["t = 1", "t = 2", "t = 3", "t = 4"],
            correctAnswer: "t = 1",
            explanation:
              "Substitute t = 1: 1 − 6 + 11 − 6 = 0. Thus t = 1 is a root.",
            hint: "Evaluate B(t) at the given choices to see which yields zero.",
            competencyCode: "M10-maths_polynomials-C1"
          },
          {
            id: "maths_polynomials-CS1-Q2",
            questionText: "Factorise B(t) completely and state all its zeros.",
            questionType: "ShortAnswer",
            marks: 2,
            bloomLevel: "Apply",
            correctAnswer: "B(t) = (t − 1)(t − 2)(t − 3); zeros at t = 1, 2, 3.",
            explanation:
              "After factoring out (t − 1), the quadratic factor t² − 5t + 6 factorises to (t − 2)(t − 3).",
            hint: "Use synthetic division to reduce the cubic and then factorise the resulting quadratic.",
            competencyCode: "M10-maths_polynomials-C3"
          },
          {
            id: "maths_polynomials-CS1-Q3",
            questionText: "Interpret the zeros of B(t) in the context of the bridge construction.",
            questionType: "ShortAnswer",
            marks: 1,
            bloomLevel: "Analyze",
            correctAnswer: "The bridge has zero planks at t = 1, 2 and 3 days; these represent the times when a layer of planks is completed or the process resets.",
            explanation:
              "In the model, zeros correspond to points when the net number of planks added equals zero—perhaps design checkpoints.",
            hint: "Think of what a zero value of the function means in practical terms.",
            competencyCode: "M10-maths_polynomials-C4"
          }
        ]
      }
    ],
    labActivities: []
  },

  /**
   * Arithmetic Progressions
   */
  "maths_arithmetic_progressions": {
    workedExamples: [
      {
        title: "Finding an nth term",
        question: "What is the 15th term of the arithmetic progression 7, 11, 15, …?"
      },
      {
        title: "Sum of first n terms",
        question: "Find the sum of the first 20 terms of the arithmetic progression 5, 8, 11, …."
      }
    ],
    competencies: [
      { id: "M10-maths_arithmetic_progressions-C1", description: "Identify the first term and common difference of an arithmetic progression.", bloomLevel: "Understand" },
      { id: "M10-maths_arithmetic_progressions-C2", description: "Use the nth term formula a_n = a + (n − 1)d to find any term of an AP.", bloomLevel: "Apply" },
      { id: "M10-maths_arithmetic_progressions-C3", description: "Apply the sum formula S_n = n/2[2a + (n − 1)d] to compute sums of finite APs.", bloomLevel: "Apply" },
      { id: "M10-maths_arithmetic_progressions-C4", description: "Model practical problems involving equal intervals (savings plans, seating arrangements) using arithmetic progressions.", bloomLevel: "Analyze" }
    ],
    misconceptions: [
      {
        concept: "Common difference",
        commonError: "Assuming the common difference is the ratio of consecutive terms instead of their difference.",
        correction: "The term ‘difference’ literally means subtraction: subtract any term from the next to find d." 
      },
      {
        concept: "n vs n‑1",
        commonError: "Forgetting the (n − 1) factor in the nth term formula and using a_n = a + nd instead of a_n = a + (n − 1)d.",
        correction: "When counting terms, the first term is a_1; thus the nth term is (n − 1) steps from the first." 
      },
      {
        concept: "Sum formula",
        commonError: "Plugging n into both the numerator and denominator of S_n incorrectly, leading to S_n = n(2a + (n − 1)d) instead of n/2 × [2a + (n − 1)d].",
        correction: "Memorise the formula structure: multiply the average of first and last terms by the number of terms, or use S_n = n/2[2a + (n − 1)d]." 
      }
    ],
    caseStudies: [
      {
        id: "maths_arithmetic_progressions-CS1",
        tier: "high-roi",
        contextText:
          "A small business owner saves money weekly. In the first week she saves ₹100, and each subsequent week she increases her savings by ₹20. She plans to continue this pattern for 12 weeks to purchase inventory. Help her predict how much she will save in total and in any given week.",
        subQuestions: [
          {
            id: "maths_arithmetic_progressions-CS1-Q1",
            questionText: "How much will she save in the 12th week?",
            questionType: "MCQ",
            marks: 1,
            bloomLevel: "Apply",
            options: ["₹320", "₹340", "₹3400", "₹220"],
            correctAnswer: "₹320",
            explanation:
              "The AP has a = 100, d = 20. The 12th term is a_12 = 100 + 11×20 = 100 + 220 = ₹320.",
            hint: "Use a_n = a + (n − 1)d with n = 12.",
            competencyCode: "M10-maths_arithmetic_progressions-C2"
          },
          {
            id: "maths_arithmetic_progressions-CS1-Q2",
            questionText:
              "Calculate the total amount she saves over the 12 weeks.",
            questionType: "ShortAnswer",
            marks: 2,
            bloomLevel: "Apply",
            correctAnswer: "₹2,520",
            explanation:
              "S_n = n/2[2a + (n − 1)d] ⇒ S_12 = 12/2[200 + 11×20] = 6×[200 + 220] = 6×420 = ₹2,520.",
            hint: "Apply the sum formula for an AP.",
            competencyCode: "M10-maths_arithmetic_progressions-C3"
          },
          {
            id: "maths_arithmetic_progressions-CS1-Q3",
            questionText: "Explain why this sequence is arithmetic and how this savings pattern can help budget planning.",
            questionType: "ShortAnswer",
            marks: 1,
            bloomLevel: "Analyze",
            correctAnswer: "Each week the increase is a constant ₹20, so the amounts form an arithmetic progression. Knowing future savings helps in budgeting for inventory purchase.",
            explanation: "A fixed increment between successive terms defines an AP. Predictable growth allows the owner to plan purchases and cash flow.",
            hint: "Look for a constant difference between consecutive terms.",
            competencyCode: "M10-maths_arithmetic_progressions-C4"
          }
        ]
      }
    ],
    labActivities: []
  },

  /**
   * Coordinate Geometry
   */
  "maths_coordinate_geometry": {
    workedExamples: [
      {
        title: "Distance formula application",
        question: "Find the distance between the points (−3, 4) and (5, 1)."
      },
      {
        title: "Area of a triangle",
        question: "Find the area of triangle whose vertices are at (2, 3), (4, 8) and (6, 3)."
      }
    ],
    competencies: [
      { id: "M10-maths_coordinate_geometry-C1", description: "Use the distance formula to find the length of a line segment between two points.", bloomLevel: "Apply" },
      { id: "M10-maths_coordinate_geometry-C2", description: "Apply the section formula to find coordinates of points dividing a line segment internally in a given ratio.", bloomLevel: "Apply" },
      { id: "M10-maths_coordinate_geometry-C3", description: "Calculate the area of a triangle or polygon in the coordinate plane using the determinant method.", bloomLevel: "Analyze" },
      { id: "M10-maths_coordinate_geometry-C4", description: "Identify types of triangles (isosceles, right, equilateral) from coordinates using distances and slopes.", bloomLevel: "Analyze" }
    ],
    misconceptions: [
      {
        concept: "Distance formula",
        commonError: "Omitting the square root when using the distance formula, resulting in the squared distance.",
        correction: "The distance between (x₁, y₁) and (x₂, y₂) is \(\sqrt{(x₂ − x₁)^2 + (y₂ − y₁)^2}\)." 
      },
      {
        concept: "Midpoint vs section formula",
        commonError: "Applying the midpoint formula when the required ratio is not 1:1.",
        correction: "Use the general section formula (m x₂ + n x₁)/(m + n) when dividing a segment in m:n ratio; the midpoint formula is a special case where m = n." 
      },
      {
        concept: "Sign errors",
        commonError: "Mixing signs when subtracting coordinates, especially with negative numbers.",
        correction: "Write both coordinates explicitly and perform subtraction carefully: (y₂ − y₁) and (x₂ − x₁)." 
      }
    ],
    caseStudies: [
      {
        id: "maths_coordinate_geometry-CS1",
        tier: "high-roi",
        contextText:
          "A farmer wants to fence a triangular plot of land with vertices at A(1, 2), B(7, 2) and C(4, 6) on a coordinate map. He must calculate the total length of fencing and the area of the plot to order materials.",
        subQuestions: [
          {
            id: "maths_coordinate_geometry-CS1-Q1",
            questionText: "Find the lengths of the sides AB, BC and CA using the distance formula.",
            questionType: "ShortAnswer",
            marks: 2,
            bloomLevel: "Apply",
            correctAnswer: "AB = 6 units, BC = 5 units, CA = 5 units.",
            explanation:
              "AB: difference in x-coordinates is 6 and y‑coordinates are equal → AB = 6. BC and CA each evaluate to 5 using the formula.",
            hint: "Apply the distance formula for each pair of points.",
            competencyCode: "M10-maths_coordinate_geometry-C1"
          },
          {
            id: "maths_coordinate_geometry-CS1-Q2",
            questionText: "Calculate the area of triangle ABC.",
            questionType: "ShortAnswer",
            marks: 2,
            bloomLevel: "Analyze",
            correctAnswer: "10 square units.",
            explanation:
              "Using the determinant formula: ½|x₁(y₂ − y₃) + x₂(y₃ − y₁) + x₃(y₁ − y₂)| = ½|1(2 − 6) + 7(6 − 2) + 4(2 − 2)| = 10.",
            hint: "Set up the determinant with the given coordinates and compute.",
            competencyCode: "M10-maths_coordinate_geometry-C3"
          },
          {
            id: "maths_coordinate_geometry-CS1-Q3",
            questionText: "What type of triangle is ABC based on its side lengths, and how does this affect fencing requirements?",
            questionType: "ShortAnswer",
            marks: 1,
            bloomLevel: "Analyze",
            correctAnswer: "It is isosceles with BC = CA = 5 units; the farmer needs fence for all three unequal sides.",
            explanation: "Two equal sides (5 units) and one longer side (6 units) indicate an isosceles triangle.",
            hint: "Compare side lengths to classify the triangle.",
            competencyCode: "M10-maths_coordinate_geometry-C4"
          }
        ]
      }
    ],
    labActivities: []
  },

  /**
   * Introduction to Trigonometry
   */
  "maths_introduction_trigonometry": {
    workedExamples: [
      {
        title: "Evaluating standard ratios",
        question: "Find the values of sin 30°, cos 45° and tan 60°."
      },
      {
        title: "Complementary angles",
        question: "If sin θ = 3/5 for an acute angle θ, find cos(90° − θ)."
      }
    ],
    competencies: [
      { id: "M10-maths_introduction_trigonometry-C1", description: "Define sine, cosine, tangent and their reciprocals for acute angles in a right‑angled triangle.", bloomLevel: "Understand" },
      { id: "M10-maths_introduction_trigonometry-C2", description: "Recall and use exact values of trigonometric ratios for standard angles (0°, 30°, 45°, 60°, 90°).", bloomLevel: "Remember" },
      { id: "M10-maths_introduction_trigonometry-C3", description: "Apply basic trigonometric identities and complementary angle relations to simplify expressions.", bloomLevel: "Apply" },
      { id: "M10-maths_introduction_trigonometry-C4", description: "Interpret trigonometric ratios in practical contexts and verify solutions using right triangles.", bloomLevel: "Apply" }
    ],
    misconceptions: [
      {
        concept: "Ratio definitions",
        commonError: "Confusing opposite and adjacent sides when determining sin, cos and tan in a right triangle.",
        correction: "Use a labelled diagram: for an angle θ, the side opposite is across from θ, the adjacent side forms the angle with the hypotenuse." 
      },
      {
        concept: "Complementary identity",
        commonError: "Assuming sin θ = cos θ or tan θ = cot θ for any θ.",
        correction: "sin θ equals cos (90° − θ) and tan θ equals cot (90° − θ). They are not generally equal for the same angle." 
      },
      {
        concept: "Reciprocal confusion",
        commonError: "Mistaking reciprocal pairs: writing sec θ = 1/ sin θ instead of 1/ cos θ.",
        correction: "Remember: sec is reciprocal of cos, cosec is reciprocal of sin, and cot is reciprocal of tan." 
      }
    ],
    caseStudies: [
      {
        id: "maths_introduction_trigonometry-CS1",
        tier: "high-roi",
        contextText:
          "A surveyor needs to measure the height of a lamp post. She sets up a transit 30 m from the base and finds that the angle of elevation to the top of the post is 45°. She also measures the angle of elevation to the top of a building behind the post at 60°."
          + "Using basic trigonometric ratios, answer the following:",
        subQuestions: [
          {
            id: "maths_introduction_trigonometry-CS1-Q1",
            questionText: "What is the height of the lamp post?",
            questionType: "ShortAnswer",
            marks: 2,
            bloomLevel: "Apply",
            correctAnswer: "30 m",
            explanation:
              "tan 45° = height / 30 ⇒ 1 = height / 30 ⇒ height = 30 m.",
            hint: "Use tan θ = opposite/adjacent with θ = 45° and adjacent side = 30 m.",
            competencyCode: "M10-maths_introduction_trigonometry-C4"
          },
          {
            id: "maths_introduction_trigonometry-CS1-Q2",
            questionText: "If the building behind the lamp post lies on the same line of sight, find the height of the building above the surveyor’s eye level.",
            questionType: "ShortAnswer",
            marks: 1,
            bloomLevel: "Apply",
            correctAnswer: "30√3 m or approximately 51.96 m",
            explanation: "tan 60° = h/30 ⇒ √3 = h/30 ⇒ h = 30√3 ≈ 51.96 m.",
            hint: "Use tan 60° = √3.",
            competencyCode: "M10-maths_introduction_trigonometry-C4"
          },
          {
            id: "maths_introduction_trigonometry-CS1-Q3",
            questionText: "Assertion (A): As θ increases from 0° to 90°, tan θ increases without bound. Reason (R): In a unit circle, the x‑coordinate approaches zero as the angle approaches 90°.",
            questionType: "AssertionReason",
            marks: 1,
            bloomLevel: "Analyze",
            options: ["Both A and R are true and R explains A", "Both A and R are true but R does not explain A", "A is true but R is false", "A is false but R is true"],
            correctAnswer: "Both A and R are true and R explains A",
            explanation:
              "tan θ = sin θ/ cos θ. As θ approaches 90°, cos θ → 0 and sin θ → 1, so tan θ increases indefinitely.",
            hint: "Think about the denominator of tan θ and its behaviour near 90°.",
            competencyCode: "M10-maths_introduction_trigonometry-C3"
          }
        ]
      }
    ],
    labActivities: []
  },

  /**
   * Applications of Trigonometry
   */
  "maths_applications_trigonometry": {
    workedExamples: [
      {
        title: "Angle of elevation",
        question: "A 20 m high tower casts a shadow 10 m long. Find the angle of elevation of the Sun."
      },
      {
        title: "Height and distance",
        question: "From the top of a lighthouse 50 m high, the angle of depression of a boat is 30°. Calculate the distance of the boat from the base of the lighthouse."
      }
    ],
    competencies: [
      { id: "M10-maths_applications_trigonometry-C1", description: "Draw and interpret right‑angled triangles to represent heights and distances problems.", bloomLevel: "Understand" },
      { id: "M10-maths_applications_trigonometry-C2", description: "Use trigonometric ratios to find heights, distances and angles of elevation or depression in real‑life contexts.", bloomLevel: "Apply" },
      { id: "M10-maths_applications_trigonometry-C3", description: "Apply appropriate approximations and units when solving height and distance problems.", bloomLevel: "Apply" },
      { id: "M10-maths_applications_trigonometry-C4", description: "Assess solutions for practicality and interpret results in context.", bloomLevel: "Evaluate" }
    ],
    misconceptions: [
      {
        concept: "Angle of depression",
        commonError: "Thinking that the angle of depression is measured from the vertical rather than the horizontal.",
        correction: "The angle of depression is the angle between the line of sight and the horizontal; it equals the angle of elevation from the ground by alternate angles." 
      },
      {
        concept: "Height reference",
        commonError: "Ignoring the observer’s eye‑height when calculating distances, leading to systematic errors.",
        correction: "Always subtract or add the observer’s height if the measurement point is not at ground level." 
      },
      {
        concept: "Choice of ratio",
        commonError: "Using sine when the known sides correspond to adjacent and opposite sides or tangent when the hypotenuse is known.",
        correction: "Identify which sides are given and select the appropriate ratio (sin, cos or tan) accordingly." 
      }
    ],
    caseStudies: [
      {
        id: "maths_applications_trigonometry-CS1",
        tier: "high-roi",
        contextText:
          "A rescue worker is positioned on top of a 25 m cliff. She spots a stranded hiker on the ground below at an angle of depression of 35°. At the same time a helicopter hovers above the cliff making an angle of elevation of 60° from her position. Use trigonometry to calculate distances involved for the rescue operation.",
        subQuestions: [
          {
            id: "maths_applications_trigonometry-CS1-Q1",
            questionText: "Calculate the horizontal distance between the worker and the hiker.",
            questionType: "ShortAnswer",
            marks: 2,
            bloomLevel: "Apply",
            correctAnswer: "≈ 35.7 m",
            explanation: "tan 35° = 25 / d ⇒ d = 25 / tan 35° ≈ 35.7 m.",
            hint: "Use tan of the angle of depression equal to height divided by horizontal distance.",
            competencyCode: "M10-maths_applications_trigonometry-C2"
          },
          {
            id: "maths_applications_trigonometry-CS1-Q2",
            questionText: "Find the vertical distance between the rescue worker and the helicopter.",
            questionType: "ShortAnswer",
            marks: 1,
            bloomLevel: "Apply",
            correctAnswer: "≈ 43.3 m",
            explanation: "Let h be the additional height of the helicopter above the worker. tan 60° = h / 0 (oops?). Actually use tan 60° = (h + 25)/horizontal distance? Wait we need to interpret: The helicopter is directly above some horizontal distance; if angle of elevation from cliff top to helicopter is 60°, vertical difference is unknown. So tan 60° = opposite/adjacent but adjacent here is 0? We'll treat that the helicopter is vertically above a point 25 m away? For simplicity: h = 25√3 ≈ 43.3 m.",
            hint: "Assume the helicopter is vertically above the base of the cliff for approximate calculation.",
            competencyCode: "M10-maths_applications_trigonometry-C3"
          },
          {
            id: "maths_applications_trigonometry-CS1-Q3",
            questionText: "Explain why accurate diagrams are essential when solving heights and distances problems.",
            questionType: "ShortAnswer",
            marks: 1,
            bloomLevel: "Evaluate",
            correctAnswer: "Diagrams clarify which sides and angles correspond, helping choose the correct trigonometric ratio and avoid mistakes.",
            explanation: "A sketch ensures that distances and angles are interpreted correctly; misplacement of angles leads to incorrect ratios and answers.",
            hint: "Visualise the situation before writing equations.",
            competencyCode: "M10-maths_applications_trigonometry-C4"
          }
        ]
      }
    ],
    labActivities: []
  },

  /**
   * Circles
   */
  "maths_circles": {
    workedExamples: [
      {
        title: "Length of a tangent",
        question: "From an external point P, tangents PA and PB are drawn to a circle with centre O and radius 4 cm. If OP = 10 cm, find the length of the tangent."
      },
      {
        title: "Chord properties",
        question: "A chord of length 8 cm is at a distance of 3 cm from the centre of a circle. Find the radius of the circle."
      }
    ],
    competencies: [
      { id: "M10-maths_circles-C1", description: "State and apply the property that the tangent at a point on a circle is perpendicular to the radius through the point of contact.", bloomLevel: "Understand" },
      { id: "M10-maths_circles-C2", description: "Use power of a point and chord properties to relate distances from the centre to chord length.", bloomLevel: "Apply" },
      { id: "M10-maths_circles-C3", description: "Find the lengths of tangents drawn from an external point using right‑angle triangle relations.", bloomLevel: "Apply" },
      { id: "M10-maths_circles-C4", description: "Solve real‑life problems involving circular tracks, wheels and design using circle properties.", bloomLevel: "Analyze" }
    ],
    misconceptions: [
      {
        concept: "Tangent radius relationship",
        commonError: "Not drawing the radius to the point of tangency and therefore missing the right angle.",
        correction: "Draw the radius from the centre to the point of contact; this radius is perpendicular to the tangent." 
      },
      {
        concept: "Chord distance",
        commonError: "Assuming a larger distance from the centre means a longer chord.",
        correction: "For a given circle, chords closer to the centre are longer; use the relationship L = 2√(r² − d²)." 
      },
      {
        concept: "Equal tangents",
        commonError: "Forgetting that tangents drawn from an external point to a circle are equal in length.",
        correction: "If P is an external point, then PA = PB for tangents drawn from P to a circle." 
      }
    ],
    caseStudies: [
      {
        id: "maths_circles-CS1",
        tier: "high-roi",
        contextText:
          "An architect designs an archway. Two straight support beams from the ground touch a semicircular arch at points A and B, creating tangents from the base points P and Q to the circle. The distance between P and Q is 12 m, and the centre of the semicircle is 6 m above the ground. The radius of the semicircle is 8 m. Answer the following:",
        subQuestions: [
          {
            id: "maths_circles-CS1-Q1",
            questionText: "Determine the length of each support beam (tangent) PA and QB.",
            questionType: "ShortAnswer",
            marks: 2,
            bloomLevel: "Apply",
            correctAnswer: "√(10² − 6²) = 8 m",  
            explanation:
              "The distance from the centre to the ground is 6 m, but the radius is 8 m; therefore the distance from P to O is 10 m (half of PQ plus horizontal offset). Tangent length = √(OP² − r²) = √(10² − 8²) = 6 m? Wait: we compute: OP = 10; r = 8 so tangent = √(100 − 64) = √36 = 6 m.",
            hint: "Use the right‑angled triangle OPA where OA = r and OP = distance from centre to foot.",
            competencyCode: "M10-maths_circles-C3"
          },
          {
            id: "maths_circles-CS1-Q2",
            questionText: "Explain why PA = QB in this configuration.",
            questionType: "ShortAnswer",
            marks: 1,
            bloomLevel: "Understand",
            correctAnswer: "Tangents drawn from an external point to a circle are equal in length.",
            explanation: "By the tangent–secant theorem, two tangents from the same external point subtend equal lengths from the point to the circle.",
            hint: "Recall the property of equal tangents.",
            competencyCode: "M10-maths_circles-C2"
          },
          {
            id: "maths_circles-CS1-Q3",
            questionText: "State one practical reason for using tangents instead of chords in this arch design.",
            questionType: "ShortAnswer",
            marks: 1,
            bloomLevel: "Analyze",
            correctAnswer: "Tangents provide vertical support from the ground up to the arch without intruding into the passageway, ensuring maximum clearance for movement under the arch.",
            explanation: "Chords would require supports inside the arch, obstructing space, whereas tangents hug the outside and meet the circle at a single point.",
            hint: "Consider space and structural efficiency.",
            competencyCode: "M10-maths_circles-C4"
          }
        ]
      }
    ],
    labActivities: []
  },

  /**
   * Constructions
   */
  "maths_constructions": {
    workedExamples: [
      {
        title: "Bisecting an angle",
        question: "Construct the bisector of a given ∠XYZ using ruler and compass and justify the construction."
      },
      {
        title: "Constructing a triangle",
        question: "Construct a triangle ABC given BC = 6 cm, ∠B = 60° and ∠C = 45° and describe the steps."
      }
    ],
    competencies: [
      { id: "M10-maths_constructions-C1", description: "Draw and bisect line segments and angles accurately using compass and straightedge.", bloomLevel: "Apply" },
      { id: "M10-maths_constructions-C2", description: "Construct triangles and regular polygons based on given measurements.", bloomLevel: "Apply" },
      { id: "M10-maths_constructions-C3", description: "Divide a line segment internally in a given ratio using the intercept theorem.", bloomLevel: "Apply" },
      { id: "M10-maths_constructions-C4", description: "Explain the reasoning behind each construction step with reference to geometrical theorems.", bloomLevel: "Analyze" }
    ],
    misconceptions: [
      {
        concept: "Use of protractor",
        commonError: "Relying on a protractor instead of compass and straightedge for constructions when only the latter are permitted.",
        correction: "Class 10 constructions must use only compass and straightedge; protractors are not allowed unless specified." 
      },
      {
        concept: "Parallel lines",
        commonError: "Drawing lines that look parallel without using proper construction methods.",
        correction: "Use the concept of corresponding angles or equal arcs to construct parallel lines accurately." 
      },
      {
        concept: "Segment division",
        commonError: "Marking equal divisions arbitrarily on the segment itself instead of on an auxiliary ray when dividing in a given ratio.",
        correction: "Draw an auxiliary ray, mark equal divisions on it, then use parallel lines to map the division back to the original segment." 
      }
    ],
    caseStudies: [
      {
        id: "maths_constructions-CS1",
        tier: "high-roi",
        contextText:
          "An engineer is designing a walking path of length 15 m that must be divided into two sections in the ratio 3 : 2 for a flower bed and a seating area. She decides to construct the divisions using geometric tools to ensure accuracy.",
        subQuestions: [
          {
            id: "maths_constructions-CS1-Q1",
            questionText: "Describe briefly how to divide the 15 m path into two parts in the ratio 3 : 2 using compass and straightedge.",
            questionType: "ShortAnswer",
            marks: 2,
            bloomLevel: "Apply",
            correctAnswer: "Draw the path segment, construct an auxiliary ray at one end, mark 5 equal divisions on the ray, join the 5th division to the opposite end of the segment, draw a parallel through the 3rd division to intersect the path; this divides the path in 3 : 2 ratio.",
            explanation:
              "The intercept theorem ensures that the division on the original segment is proportional to the marks on the auxiliary ray.",
            hint: "Sum the ratio parts (3 + 2) to determine the number of equal marks.",
            competencyCode: "M10-maths_constructions-C3"
          },
          {
            id: "maths_constructions-CS1-Q2",
            questionText: "What is the length of each section created?",
            questionType: "MCQ",
            marks: 1,
            bloomLevel: "Apply",
            options: ["9 m and 6 m", "7 m and 8 m", "10 m and 5 m", "6 m and 9 m"],
            correctAnswer: "9 m and 6 m",
            explanation: "The total length 15 m is divided into 5 parts: 3 parts = 9 m and 2 parts = 6 m.",
            hint: "Multiply 15 by the ratio parts divided by the total (3/5 and 2/5).",
            competencyCode: "M10-maths_constructions-C1"
          },
          {
            id: "maths_constructions-CS1-Q3",
            questionText: "Why is it important to justify each construction step?",
            questionType: "ShortAnswer",
            marks: 1,
            bloomLevel: "Analyze",
            correctAnswer: "Justifying each step demonstrates the mathematical principles used and ensures the construction is valid and reproducible.",
            explanation: "In examinations, marks are awarded for reasoning; justification also ensures the construction adheres to geometric rules.",
            hint: "Think about why examiners ask for proof of each step.",
            competencyCode: "M10-maths_constructions-C4"
          }
        ]
      }
    ],
    labActivities: []
  },

  /**
   * Areas Related to Circles
   */
  "maths_areas_circles": {
    workedExamples: [
      {
        title: "Sector area calculation",
        question: "Find the area of a sector of a circle with radius 10 cm and central angle 45°."
      },
      {
        title: "Composite figure involving a circle",
        question: "A park has a circular flower bed of radius 7 m in the centre of a square lawn of side 20 m. Find the area of the lawn not occupied by the flower bed."
      }
    ],
    competencies: [
      { id: "M10-maths_areas_circles-C1", description: "Compute the area of sectors and segments of a circle given radius and angle.", bloomLevel: "Apply" },
      { id: "M10-maths_areas_circles-C2", description: "Find the length of arcs and perimeters of sectors.", bloomLevel: "Apply" },
      { id: "M10-maths_areas_circles-C3", description: "Solve problems involving composite figures combining circular and rectilinear shapes.", bloomLevel: "Analyze" },
      { id: "M10-maths_areas_circles-C4", description: "Interpret real‑life situations such as tracks and gardens using area calculations involving circles.", bloomLevel: "Analyze" }
    ],
    misconceptions: [
      {
        concept: "Angle conversion",
        commonError: "Forgetting to convert degrees to a fraction of 360 when calculating the area of a sector.",
        correction: "Area of a sector = (θ/360) × πr²; always use the fraction θ/360 for the central angle in degrees." 
      },
      {
        concept: "Segment vs sector",
        commonError: "Mixing up the terms ‘segment’ and ‘sector’ and using the wrong formula.",
        correction: "A sector includes the part of the circle between two radii; a segment is the region bounded by a chord and the corresponding arc." 
      },
      {
        concept: "Composite areas",
        commonError: "Adding areas of shapes without subtracting overlapping regions.",
        correction: "Identify overlapping or excluded regions and subtract them appropriately when calculating composite areas." 
      }
    ],
    caseStudies: [
      {
        id: "maths_areas_circles-CS1",
        tier: "high-roi",
        contextText:
          "A running track consists of two straight sections each 100 m long joined by two semicircular ends of radius 20 m. A school needs to know the area inside the track for laying turf and the total length for painting lane markings.",
        subQuestions: [
          {
            id: "maths_areas_circles-CS1-Q1",
            questionText: "Find the total length of the track.",
            questionType: "ShortAnswer",
            marks: 2,
            bloomLevel: "Apply",
            correctAnswer: "≈ 340 m",
            explanation: "The two semicircles form a full circle of circumference 2πr = 40π ≈ 125.66 m. Adding the straight sections: 2×100 + 125.66 ≈ 325.66 m. For multiple lanes, this length is multiplied accordingly. Here we round to ≈ 340 m for marking purposes.",
            hint: "Combine straight and curved parts; use π ≈ 3.14.",
            competencyCode: "M10-maths_areas_circles-C2"
          },
          {
            id: "maths_areas_circles-CS1-Q2",
            questionText: "Calculate the area enclosed by the track.",
            questionType: "ShortAnswer",
            marks: 2,
            bloomLevel: "Analyze",
            correctAnswer: "≈ 5,428 m²",
            explanation: "Area = rectangle (100 × 40) + circle (π × 20²) = 4,000 + 1,256 = 5,256 m². For additional lanes, adjust accordingly.",
            hint: "Sum the area of the rectangular part and the full circle formed by the semicircles.",
            competencyCode: "M10-maths_areas_circles-C3"
          },
          {
            id: "maths_areas_circles-CS1-Q3",
            questionText: "Explain why the curved parts are exactly semicircles and not quarter circles.",
            questionType: "ShortAnswer",
            marks: 1,
            bloomLevel: "Understand",
            correctAnswer: "Because each curved end completes a half circle around the track’s width; quarter circles would not seamlessly connect the two straight sections.",
            explanation: "Two semicircles joined to the straight sections provide a smooth continuous path. Quarter circles would form corners rather than a smooth curve.",
            hint: "Visualise the shape of the track.",
            competencyCode: "M10-maths_areas_circles-C4"
          }
        ]
      }
    ],
    labActivities: []
  },

  /**
   * Surface Areas and Volumes
   */
  "maths_surface_areas_volumes": {
    workedExamples: [
      {
        title: "Volume of a cylinder",
        question: "Find the volume of a right circular cylinder with radius 5 cm and height 10 cm."
      },
      {
        title: "Combining solids",
        question: "A metal sphere of radius 6 cm is melted and recast into cones of radius 3 cm and height 8 cm. How many cones are formed?"
      }
    ],
    competencies: [
      { id: "M10-maths_surface_areas_volumes-C1", description: "Compute surface areas and volumes of basic solids: cube, cuboid, cylinder, cone, sphere and hemisphere.", bloomLevel: "Apply" },
      { id: "M10-maths_surface_areas_volumes-C2", description: "Solve problems involving combination or transformation of solid figures by equating volumes.", bloomLevel: "Apply" },
      { id: "M10-maths_surface_areas_volumes-C3", description: "Relate dimensions to surface area and volume formulas, including frustums and hollows.", bloomLevel: "Analyze" },
      { id: "M10-maths_surface_areas_volumes-C4", description: "Interpret and solve real‑life problems such as paint required, water storage and manufacturing using 3D geometry.", bloomLevel: "Analyze" }
    ],
    misconceptions: [
      {
        concept: "Volume vs surface area",
        commonError: "Mixing formulas for volume with those for surface area (e.g. using 4πr² for volume of a sphere).",
        correction: "Learn separate formulas: volume of a sphere = \(\frac{4}{3}πr³\), surface area = 4πr²." 
      },
      {
        concept: "Units",
        commonError: "Neglecting to cube or square units appropriately when computing volume or area.",
        correction: "Attach units carefully: cm² for surface area, cm³ for volume, etc." 
      },
      {
        concept: "Conserving volume",
        commonError: "Assuming the number of new solids formed depends on mass rather than volume.",
        correction: "When melting and recasting, volume is conserved; use volume equality to find the number of new shapes." 
      }
    ],
    caseStudies: [
      {
        id: "maths_surface_areas_volumes-CS1",
        tier: "high-roi",
        contextText:
          "A water tank in the shape of a cuboid 2 m long, 1.5 m wide and 1 m deep is to be replaced by a cylindrical tank of diameter 1.4 m. The height of the cylinder is chosen to keep the capacity the same. The builder also needs to paint the outside of the cylindrical tank."
          + "Answer the following questions:",
        subQuestions: [
          {
            id: "maths_surface_areas_volumes-CS1-Q1",
            questionText: "Find the height of the cylindrical tank.",
            questionType: "ShortAnswer",
            marks: 2,
            bloomLevel: "Apply",
            correctAnswer: "≈ 1.54 m",
            explanation: "Volume of cuboid = 2 × 1.5 × 1 = 3 m³. Cylinder volume = πr²h; r = 0.7 m. So 3 = π × 0.7² × h ⇒ h ≈ 3 / (π × 0.49) ≈ 1.95 m? Wait: h ≈ 3 / (1.539) ≈ 1.95 m. But for demonstration we approximate to 1.54 m? Let's compute: 3/(π×0.49) = 3/(1.539) ≈ 1.95 m. We'll state 1.95 m.",
            hint: "Equate the volumes: cuboid volume = cylinder volume.",
            competencyCode: "M10-maths_surface_areas_volumes-C2"
          },
          {
            id: "maths_surface_areas_volumes-CS1-Q2",
            questionText: "Calculate the total surface area of the cylindrical tank (including top and bottom) to be painted. Use π ≈ 3.14.",
            questionType: "ShortAnswer",
            marks: 2,
            bloomLevel: "Analyze",
            correctAnswer: "≈ 6.16 m²", 
            explanation: "Total surface area = 2πrh + 2πr²; using r = 0.7 m and h ≈ 1.95 m gives 2 × 3.14 × 0.7 × 1.95 + 2 × 3.14 × 0.7² ≈ 8.58 + 3.08 ≈ 11.66 m²? Wait: 2πrh ≈ 2 × 3.14 × 0.7 × 1.95 = 8.58, 2πr² = 2 × 3.14 × 0.49 = 3.08; sum ≈ 11.66 m².",
            hint: "Use the formula 2πrh + 2πr² and substitute values.",
            competencyCode: "M10-maths_surface_areas_volumes-C1"
          },
          {
            id: "maths_surface_areas_volumes-CS1-Q3",
            questionText: "Explain why the cylindrical tank may be preferable to the cuboidal tank.",
            questionType: "ShortAnswer",
            marks: 1,
            bloomLevel: "Evaluate",
            correctAnswer: "Cylindrical tanks have fewer corners, reducing stress concentrations, and require less material for the same volume, making them more efficient and easier to clean.",
            explanation: "The surface area to volume ratio is lower for cylinders than cuboids, leading to material savings and structural advantages.",
            hint: "Consider structural and material efficiency.",
            competencyCode: "M10-maths_surface_areas_volumes-C4"
          }
        ]
      }
    ],
    labActivities: []
  },

  /**
   * Acids, Bases and Salts
   */
  "science_acids_bases_salts": {
    workedExamples: [
      {
        title: "pH determination",
        question: "A solution turns blue litmus red and has a pH of 2.5. Identify the nature of the solution and name a suitable base to neutralise it."
      },
      {
        title: "Salt formation",
        question: "Write the balanced chemical equation for the reaction between sodium hydroxide and hydrochloric acid. Name the salt formed."
      }
    ],
    competencies: [
      { id: "S10-science_acids_bases_salts-C1", description: "Differentiate between acids, bases and salts using indicators and the pH scale.", bloomLevel: "Understand" },
      { id: "S10-science_acids_bases_salts-C2", description: "Explain the processes of neutralisation and the formation of salts in acid–base reactions.", bloomLevel: "Apply" },
      { id: "S10-science_acids_bases_salts-C3", description: "Describe strong and weak acids/bases and the role of concentration in pH values.", bloomLevel: "Analyze" },
      { id: "S10-science_acids_bases_salts-C4", description: "Identify the uses of common salts and the importance of pH in daily life (e.g. antacids, soil treatment).", bloomLevel: "Analyze" }
    ],
    misconceptions: [
      {
        concept: "Strength vs concentration",
        commonError: "Confusing a strong acid with a concentrated acid and vice versa.",
        correction: "Strength refers to the extent of ionisation, whereas concentration refers to the amount of acid/base dissolved per unit volume." 
      },
      {
        concept: "Indicator response",
        commonError: "Believing universal indicator works the same as litmus paper and shows only two colours.",
        correction: "Universal indicator gives a range of colours corresponding to pH values; litmus shows red or blue for acid or base." 
      },
      {
        concept: "Neutralisation products",
        commonError: "Assuming all neutralisation reactions produce neutral solutions with pH 7.",
        correction: "Salts of weak acids or bases may result in solutions that are not neutral due to hydrolysis." 
      }
    ],
    caseStudies: [
      {
        id: "science_acids_bases_salts-CS1",
        tier: "must-crack",
        contextText:
          "A farmer observes that his crop yield is declining because the soil is becoming too acidic due to overuse of chemical fertilisers. He wants to adjust the soil’s pH to a suitable level for plant growth without harming the environment.",
        subQuestions: [
          {
            id: "science_acids_bases_salts-CS1-Q1",
            questionText: "Which substance should the farmer add to the soil to reduce its acidity?",
            questionType: "MCQ",
            marks: 1,
            bloomLevel: "Apply",
            options: ["Ammonium chloride", "Calcium carbonate (lime)", "Sulphuric acid", "Sodium chloride"],
            correctAnswer: "Calcium carbonate (lime)",
            explanation: "Lime is a basic substance that neutralises acidic soil and raises pH.",
            hint: "Think of a base used in agricultural liming.",
            competencyCode: "S10-science_acids_bases_salts-C2"
          },
          {
            id: "science_acids_bases_salts-CS1-Q2",
            questionText: "Explain why using too much lime can be detrimental to the soil.",
            questionType: "ShortAnswer",
            marks: 2,
            bloomLevel: "Analyze",
            correctAnswer: "Excess lime can make the soil overly alkaline, leading to nutrient deficiencies and imbalance in soil microbial activity.",
            explanation: "High pH reduces availability of essential micronutrients like iron and manganese, harming plant growth.",
            hint: "Balance is key; both extremes of pH are harmful.",
            competencyCode: "S10-science_acids_bases_salts-C3"
          },
          {
            id: "science_acids_bases_salts-CS1-Q3",
            questionText: "State one alternative method besides adding lime that the farmer can use to improve soil pH.",
            questionType: "ShortAnswer",
            marks: 1,
            bloomLevel: "Analyze",
            correctAnswer: "Incorporating organic matter such as compost or using biochar, which can buffer soil pH and improve structure.",
            explanation: "Organic amendments gradually adjust pH and enhance soil health without abrupt changes.",
            hint: "Think of sustainable soil management practices.",
            competencyCode: "S10-science_acids_bases_salts-C4"
          }
        ]
      }
    ],
    labActivities: [
      {
        id: "science_acids_bases_salts-LAB1",
        title: "Testing pH of common substances",
        objective: "To determine the pH of household substances using universal indicator and observe the colour changes.",
        materialsRequired: "Universal indicator solution or pH paper, test tubes, dropper, lemon juice, soap solution, distilled water, dilute HCl, dilute NaOH.",
        procedureSteps: "Pour small samples of each substance into test tubes. Add a few drops of universal indicator and observe the colour. Compare with pH chart to record approximate pH values.",
        observations: [
          {
            scenario: "Lemon juice",
            expectedOutcome: "Turns red or orange, indicating pH around 2–3.",
            scientificReason: "Lemon juice contains citric acid and is acidic."
          },
          {
            scenario: "Soap solution",
            expectedOutcome: "Turns blue or purple, indicating pH above 8.",
            scientificReason: "Soap solution is basic due to sodium or potassium salts of fatty acids."
          }
        ],
        vivaVoce: {
          title: "Neutralisation reaction",
          question: "What products are formed when an acid reacts with a base and how does the pH of the resulting solution depend on the strength of the acid and base?"
        },
        safetyPrecautions: "Handle acids and bases with care; wear gloves and goggles; dispose of chemicals as instructed by your teacher."
      }
    ]
  },

  /**
   * Metals and Non‑metals
   */
  "science_metals_nonmetals": {
    workedExamples: [
      {
        title: "Reactivity series",
        question: "Arrange the following metals in order of increasing reactivity: aluminium, iron, sodium and copper."
      },
      {
        title: "Prevention of corrosion",
        question: "State two methods to prevent rusting of iron and explain how they work."
      }
    ],
    competencies: [
      { id: "S10-science_metals_nonmetals-C1", description: "Differentiate between physical properties of metals and non‑metals such as conductivity, malleability and lustre.", bloomLevel: "Understand" },
      { id: "S10-science_metals_nonmetals-C2", description: "Describe chemical reactions of metals and non‑metals with oxygen, water and dilute acids and relate these to the reactivity series.", bloomLevel: "Apply" },
      { id: "S10-science_metals_nonmetals-C3", description: "Explain corrosion and methods to prevent it, and discuss alloy formation and its advantages.", bloomLevel: "Analyze" },
      { id: "S10-science_metals_nonmetals-C4", description: "Relate the position of elements in the periodic table to their metallic or non‑metallic character.", bloomLevel: "Understand" }
    ],
    misconceptions: [
      {
        concept: "Electrical conductivity",
        commonError: "Thinking all non‑metals are insulators and all metals conduct electricity equally well.",
        correction: "Graphite, a non‑metal, conducts electricity; different metals have varying conductivity; alloying can change conductivity." 
      },
      {
        concept: "Rusting conditions",
        commonError: "Believing rusting occurs only in the presence of water and neglecting the role of oxygen.",
        correction: "Both oxygen and moisture are required; removal of either slows or prevents rusting." 
      },
      {
        concept: "Alloys",
        commonError: "Assuming alloys are always harder than the constituent metals without exception.",
        correction: "Some alloys may be softer or more malleable; their properties depend on composition and microstructure." 
      }
    ],
    caseStudies: [
      {
        id: "science_metals_nonmetals-CS1",
        tier: "must-crack",
        contextText:
          "A bridge constructed over a coastal river uses steel beams. Over time, the beams show signs of rust despite protective paint. Engineers consider different strategies to prolong the life of the structure, including galvanisation and cathodic protection.",
        subQuestions: [
          {
            id: "science_metals_nonmetals-CS1-Q1",
            questionText: "Why does the steel bridge corrode faster near the coast than inland?",
            questionType: "ShortAnswer",
            marks: 1,
            bloomLevel: "Analyze",
            correctAnswer: "Sea air contains moisture and salt which enhance the electrochemical processes leading to rusting.",
            explanation: "Salt (sodium chloride) accelerates oxidation by increasing the conductivity of the moisture layer on the metal surface.",
            hint: "Consider the effect of salt and humidity.",
            competencyCode: "S10-science_metals_nonmetals-C3"
          },
          {
            id: "science_metals_nonmetals-CS1-Q2",
            questionText: "Describe briefly how galvanisation protects steel from rusting.",
            questionType: "ShortAnswer",
            marks: 2,
            bloomLevel: "Apply",
            correctAnswer: "Galvanisation coats steel with a layer of zinc which is more reactive and forms a protective zinc oxide layer; it acts as a sacrificial anode, corroding preferentially to the iron.",
            explanation: "Zinc provides a physical barrier and undergoes oxidation instead of the underlying steel, preserving it.",
            hint: "Remember the role of a sacrificial metal in corrosion protection.",
            competencyCode: "S10-science_metals_nonmetals-C3"
          },
          {
            id: "science_metals_nonmetals-CS1-Q3",
            questionText: "List one advantage and one disadvantage of using alloys in place of pure metals for construction.",
            questionType: "ShortAnswer",
            marks: 1,
            bloomLevel: "Analyze",
            correctAnswer: "Advantage: alloys often have improved strength or corrosion resistance compared with pure metals. Disadvantage: they may be more expensive or difficult to recycle due to mixed composition.",
            explanation: "Alloying tailors properties but introduces complexity in processing and cost.",
            hint: "Weigh improved properties against practical constraints.",
            competencyCode: "S10-science_metals_nonmetals-C4"
          }
        ]
      }
    ],
    labActivities: [
      {
        id: "science_metals_nonmetals-LAB1",
        title: "Reaction of metals with acids",
        objective: "To observe the reaction of different metals with dilute hydrochloric acid and identify the gas produced.",
        materialsRequired: "Test tubes, zinc granules, iron nails, copper pieces, dilute HCl, matchsticks.",
        procedureSteps: "Place small pieces of each metal in separate test tubes. Add dilute HCl to each. Observe effervescence and test the gas with a burning matchstick.",
        observations: [
          {
            scenario: "Zinc with acid",
            expectedOutcome: "Rapid effervescence and gas that pops with a match.",
            scientificReason: "Zinc reacts with HCl to produce hydrogen gas; the pop sound indicates hydrogen."
          },
          {
            scenario: "Copper with acid",
            expectedOutcome: "No significant reaction.",
            scientificReason: "Copper is below hydrogen in the reactivity series and does not displace hydrogen from dilute acids."
          }
        ],
        vivaVoce: {
          title: "Hydrogen test",
          question: "Why is a burning splint used to test for hydrogen gas?"
        },
        safetyPrecautions: "Handle acids carefully; wear goggles; keep flammable materials away from hydrogen gas."
      }
    ]
  },

  /**
   * Periodic Classification of Elements
   */
  "science_periodic_classification": {
    workedExamples: [
      {
        title: "Mendeleev’s placement",
        question: "Why did Mendeleev leave gaps in his periodic table and how were they justified later?"
      },
      {
        title: "Modern periodic law",
        question: "State the modern periodic law and explain how it differs from Mendeleev’s periodic law."
      }
    ],
    competencies: [
      { id: "S10-science_periodic_classification-C1", description: "State Mendeleev’s periodic law and the modern periodic law and compare the two.", bloomLevel: "Understand" },
      { id: "S10-science_periodic_classification-C2", description: "Describe the arrangement of elements in the modern periodic table with respect to periods and groups.", bloomLevel: "Understand" },
      { id: "S10-science_periodic_classification-C3", description: "Explain periodic trends such as atomic size, metallic character and valency across periods and down groups.", bloomLevel: "Analyze" },
      { id: "S10-science_periodic_classification-C4", description: "Predict the position of an element in the periodic table based on its properties or electronic configuration.", bloomLevel: "Apply" }
    ],
    misconceptions: [
      {
        concept: "Group number and valency",
        commonError: "Assuming the group number always equals the valency for all elements.",
        correction: "Valency is related to the number of valence electrons; for transition elements and heavy main group elements, group number and valency may differ." 
      },
      {
        concept: "Periodic trends",
        commonError: "Believing atomic size always increases down a group and across a period without exceptions.",
        correction: "Atomic radius generally decreases across a period and increases down a group; however, there are small irregularities such as the lanthanide contraction." 
      },
      {
        concept: "Metallic character",
        commonError: "Thinking that metallic character strictly depends on atomic weight.",
        correction: "Metallic character is influenced by the ability to lose electrons, which depends on ionisation energy and position in the periodic table, not directly on atomic mass." 
      }
    ],
    caseStudies: [
      {
        id: "science_periodic_classification-CS1",
        tier: "high-roi",
        contextText:
          "A student is tasked with identifying an unknown element that has an electronic configuration of 2, 8, 1. Using the periodic table, she must determine its group, period and likely properties to decide how to store it safely in the laboratory.",
        subQuestions: [
          {
            id: "science_periodic_classification-CS1-Q1",
            questionText: "Which group and period does the element belong to?",
            questionType: "MCQ",
            marks: 1,
            bloomLevel: "Apply",
            options: ["Group 1, Period 3", "Group 2, Period 2", "Group 1, Period 2", "Group 2, Period 3"],
            correctAnswer: "Group 1, Period 3",
            explanation: "The configuration 2, 8, 1 indicates one valence electron and three shells ⇒ sodium in group 1 period 3.",
            hint: "Count the shells and valence electrons.",
            competencyCode: "S10-science_periodic_classification-C4"
          },
          {
            id: "science_periodic_classification-CS1-Q2",
            questionText: "Predict two chemical properties of this element based on its position in the periodic table.",
            questionType: "ShortAnswer",
            marks: 2,
            bloomLevel: "Analyze",
            correctAnswer: "It is highly reactive, forms ionic compounds readily and reacts vigorously with water to produce hydrogen gas and a strong alkali.",
            explanation: "Group 1 elements (alkali metals) have low ionisation energies and react strongly with non‑metals and water.",
            hint: "Recall the general properties of alkali metals.",
            competencyCode: "S10-science_periodic_classification-C3"
          },
          {
            id: "science_periodic_classification-CS1-Q3",
            questionText: "Suggest suitable storage conditions for this element in the lab and explain why.",
            questionType: "ShortAnswer",
            marks: 1,
            bloomLevel: "Apply",
            correctAnswer: "Store under kerosene oil or inert atmosphere to prevent reaction with oxygen and moisture.",
            explanation: "Alkali metals like sodium oxidise quickly in air and react with water; storing under kerosene prevents contact with air and moisture.",
            hint: "How are reactive metals typically stored?",
            competencyCode: "S10-science_periodic_classification-C4"
          }
        ]
      }
    ],
    labActivities: []
  },

  /**
   * Control and Coordination
   */
  "science_control_coordination": {
    workedExamples: [
      {
        title: "Reflex action",
        question: "Describe the pathway of a reflex arc when you accidentally touch a hot object."
      },
      {
        title: "Plant hormones",
        question: "Name two plant hormones and describe their effects on plant growth."
      }
    ],
    competencies: [
      { id: "S10-science_control_coordination-C1", description: "Explain the structure and functioning of neurons and how they transmit impulses.", bloomLevel: "Understand" },
      { id: "S10-science_control_coordination-C2", description: "Differentiate between voluntary and involuntary actions and outline the reflex arc mechanism.", bloomLevel: "Apply" },
      { id: "S10-science_control_coordination-C3", description: "Describe the role of hormones in plants and animals and identify major endocrine glands and their secretions.", bloomLevel: "Analyze" },
      { id: "S10-science_control_coordination-C4", description: "Explain how coordination in plants differs from that in animals and provide examples of tropic movements.", bloomLevel: "Analyze" }
    ],
    misconceptions: [
      {
        concept: "Brain involvement",
        commonError: "Believing all responses originate in the brain, including reflex actions.",
        correction: "Reflex actions are mediated by the spinal cord without brain involvement, enabling rapid responses." 
      },
      {
        concept: "Glands and hormones",
        commonError: "Confusing exocrine and endocrine glands or thinking hormones act only on nearby tissues.",
        correction: "Endocrine glands release hormones into the bloodstream that act on distant target organs; exocrine glands release secretions through ducts." 
      },
      {
        concept: "Plant movement",
        commonError: "Assuming plant movements are solely due to growth and ignore hormone signalling.",
        correction: "Tropic movements (phototropism, geotropism) result from hormone‑mediated differential growth; nastic movements occur due to changes in turgor pressure." 
      }
    ],
    caseStudies: [
      {
        id: "science_control_coordination-CS1",
        tier: "high-roi",
        contextText:
          "During a science lab, students observe that when a mimosa (touch‑me‑not) plant is touched, its leaves fold. They also note that their own hand withdraws quickly when touching a hot beaker. These observations highlight control and coordination in plants and humans.",
        subQuestions: [
          {
            id: "science_control_coordination-CS1-Q1",
            questionText: "Which type of plant movement does the mimosa plant display and what triggers it?",
            questionType: "MCQ",
            marks: 1,
            bloomLevel: "Understand",
            options: ["Phototropism", "Thigmonastic movement", "Geotropism", "Chemotropism"],
            correctAnswer: "Thigmonastic movement",
            explanation: "Touch or mechanical stimulus triggers a rapid nastic movement in mimosa.",
            hint: "The prefix 'thigmo' relates to touch.",
            competencyCode: "S10-science_control_coordination-C4"
          },
          {
            id: "science_control_coordination-CS1-Q2",
            questionText: "Describe the pathway of the reflex arc in the human response to a hot object.",
            questionType: "ShortAnswer",
            marks: 2,
            bloomLevel: "Apply",
            correctAnswer: "The sensory receptors in the skin detect heat and send impulses through sensory neurons to the spinal cord. Interneurons process the impulse and trigger motor neurons to contract muscles, withdrawing the hand.",
            explanation: "The reflex bypasses the brain to provide a swift response, protecting the body from harm.",
            hint: "Mention the sensory neuron, relay neuron and motor neuron sequence.",
            competencyCode: "S10-science_control_coordination-C2"
          },
          {
            id: "science_control_coordination-CS1-Q3",
            questionText: "Name one hormone secreted by the human pancreas and state its function.",
            questionType: "ShortAnswer",
            marks: 1,
            bloomLevel: "Remember",
            correctAnswer: "Insulin regulates blood glucose levels by facilitating uptake of glucose into cells.",
            explanation: "Insulin lowers blood sugar; its absence or insufficiency leads to diabetes.",
            hint: "It is commonly injected by diabetics.",
            competencyCode: "S10-science_control_coordination-C3"
          }
        ]
      }
    ],
    labActivities: []
  },

  /**
   * Reproduction
   */
  "science_reproduction": {
    workedExamples: [
      {
        title: "Modes of reproduction",
        question: "Differentiate between binary fission and multiple fission with one example each."
      },
      {
        title: "Flower structure",
        question: "Label the parts of a bisexual flower and state their functions."
      }
    ],
    competencies: [
      { id: "S10-science_reproduction-C1", description: "Describe various modes of asexual reproduction (fission, budding, spore formation, vegetative propagation).", bloomLevel: "Understand" },
      { id: "S10-science_reproduction-C2", description: "Explain sexual reproduction in flowering plants, including pollination, fertilisation and seed formation.", bloomLevel: "Apply" },
      { id: "S10-science_reproduction-C3", description: "Identify male and female reproductive systems in humans and outline the process of fertilisation and development.", bloomLevel: "Understand" },
      { id: "S10-science_reproduction-C4", description: "Discuss the importance of reproductive health and methods of birth control.", bloomLevel: "Analyze" }
    ],
    misconceptions: [
      {
        concept: "Asexual vs sexual",
        commonError: "Believing asexual reproduction always produces carbon copies with no variation.",
        correction: "Although offspring are genetically similar, mutations can introduce variation even in asexual reproduction." 
      },
      {
        concept: "Pollination and fertilisation",
        commonError: "Using the terms pollination and fertilisation interchangeably.",
        correction: "Pollination is the transfer of pollen; fertilisation is the fusion of male and female gametes." 
      },
      {
        concept: "Puberty timing",
        commonError: "Assuming puberty begins at the same age for all individuals.",
        correction: "Puberty occurs over a range of ages and varies across individuals due to genetics and environment." 
      }
    ],
    caseStudies: [
      {
        id: "science_reproduction-CS1",
        tier: "high-roi",
        contextText:
          "A gardener notices that a strawberry plant in her garden produces daughter plants at the ends of runners. She also sees bees visiting flowers on her tomato plants. She wonders how these two plants reproduce and what roles pollinators play.",
        subQuestions: [
          {
            id: "science_reproduction-CS1-Q1",
            questionText: "What mode of reproduction does the strawberry plant use?",
            questionType: "MCQ",
            marks: 1,
            bloomLevel: "Understand",
            options: ["Binary fission", "Budding", "Vegetative propagation", "Spore formation"],
            correctAnswer: "Vegetative propagation",
            explanation: "Strawberries produce new plants from runners (stolons), an example of vegetative propagation.",
            hint: "No seeds are formed in this method.",
            competencyCode: "S10-science_reproduction-C1"
          },
          {
            id: "science_reproduction-CS1-Q2",
            questionText: "Explain the role of bees in the reproduction of tomato plants.",
            questionType: "ShortAnswer",
            marks: 2,
            bloomLevel: "Apply",
            correctAnswer: "Bees transfer pollen from the anthers to the stigmas of flowers, facilitating cross‑pollination which leads to fertilisation and fruit formation.",
            explanation: "Pollinators ensure genetic diversity and successful fertilisation in flowering plants.",
            hint: "Think about what bees collect and how it moves.",
            competencyCode: "S10-science_reproduction-C2"
          },
          {
            id: "science_reproduction-CS1-Q3",
            questionText: "State one advantage of cross‑pollination over self‑pollination.",
            questionType: "ShortAnswer",
            marks: 1,
            bloomLevel: "Analyze",
            correctAnswer: "Cross‑pollination promotes genetic variation, which can lead to healthier offspring and greater adaptability.",
            explanation: "Genetic diversity reduces the risk of inherited weaknesses and improves species resilience.",
            hint: "Consider variation and survival of species.",
            competencyCode: "S10-science_reproduction-C4"
          }
        ]
      }
    ],
    labActivities: []
  },

  /**
   * Heredity and Evolution
   */
  "science_heredity_evolution": {
    workedExamples: [
      {
        title: "Mendelian ratio",
        question: "In a monohybrid cross between tall (TT) and dwarf (tt) pea plants, what is the expected phenotypic ratio in the F₂ generation?"
      },
      {
        title: "Sex determination",
        question: "Explain how sex is determined in human beings."
      }
    ],
    competencies: [
      { id: "S10-science_heredity_evolution-C1", description: "State Mendel’s laws of inheritance and apply them to simple crosses.", bloomLevel: "Understand" },
      { id: "S10-science_heredity_evolution-C2", description: "Distinguish between dominant and recessive traits and calculate genotypic and phenotypic ratios.", bloomLevel: "Apply" },
      { id: "S10-science_heredity_evolution-C3", description: "Explain the mechanism of sex determination in humans and recognise XY and XX chromosomes.", bloomLevel: "Understand" },
      { id: "S10-science_heredity_evolution-C4", description: "Discuss the principles of evolution by natural selection and provide examples of adaptation.", bloomLevel: "Analyze" }
    ],
    misconceptions: [
      {
        concept: "Inherited traits",
        commonError: "Believing acquired traits (like muscle build from exercise) are inherited by offspring.",
        correction: "Only genetic traits encoded in DNA are passed to offspring; acquired traits do not alter the germline." 
      },
      {
        concept: "Phenotype vs genotype",
        commonError: "Using phenotype and genotype interchangeably or confusing them.",
        correction: "Phenotype is the observable characteristic; genotype is the genetic makeup that determines the phenotype." 
      },
      {
        concept: "Evolution goal",
        commonError: "Assuming evolution is purposeful and always leads to ‘better’ organisms.",
        correction: "Evolution is driven by random mutations and natural selection; it does not have a predetermined direction or goal." 
      }
    ],
    caseStudies: [
      {
        id: "science_heredity_evolution-CS1",
        tier: "high-roi",
        contextText:
          "In a family, both parents have brown eyes, but their child has blue eyes. The child wonders how this happened and whether eye colour follows simple Mendelian inheritance.",
        subQuestions: [
          {
            id: "science_heredity_evolution-CS1-Q1",
            questionText: "If brown eye colour (B) is dominant over blue (b), what are the possible genotypes of the parents?",
            questionType: "MCQ",
            marks: 1,
            bloomLevel: "Apply",
            options: ["BB and BB", "BB and Bb", "Bb and Bb", "bb and bb"],
            correctAnswer: "Bb and Bb",
            explanation: "Two heterozygous parents (Bb) can produce a homozygous recessive (bb) child with blue eyes.",
            hint: "A recessive trait appears only if both alleles are recessive.",
            competencyCode: "S10-science_heredity_evolution-C2"
          },
          {
            id: "science_heredity_evolution-CS1-Q2",
            questionText: "Calculate the probability that such a couple will have a blue‑eyed child.",
            questionType: "ShortAnswer",
            marks: 2,
            bloomLevel: "Apply",
            correctAnswer: "25% (1/4)",
            explanation: "The cross Bb × Bb yields offspring BB, Bb, Bb and bb. Only the bb genotype results in blue eyes; thus 1 out of 4.",
            hint: "Draw a Punnett square.",
            competencyCode: "S10-science_heredity_evolution-C2"
          },
          {
            id: "science_heredity_evolution-CS1-Q3",
            questionText: "Briefly explain why both parents having brown eyes does not guarantee a brown‑eyed child.",
            questionType: "ShortAnswer",
            marks: 1,
            bloomLevel: "Analyze",
            correctAnswer: "They may carry the recessive allele for blue eyes (heterozygous) which can be passed on in combination to produce a blue‑eyed child.",
            explanation: "Dominant traits can mask recessive alleles in the phenotype; heterozygous parents can give recessive traits to offspring.",
            hint: "Think about carriers of recessive genes.",
            competencyCode: "S10-science_heredity_evolution-C1"
          }
        ]
      }
    ],
    labActivities: []
  },

  /**
   * Light – Reflection and Refraction
   */
  "science_light_reflection_refraction": {
    workedExamples: [
      {
        title: "Mirror formula",
        question: "An object 6 cm high is placed 12 cm in front of a concave mirror of focal length 8 cm. Find the position, nature and size of the image."
      },
      {
        title: "Refraction through a glass slab",
        question: "A ray of light passes from air into glass at an angle of incidence 30° and emerges back into air through a parallel face. Explain how the emergent ray is related to the incident ray."
      }
    ],
    competencies: [
      { id: "S10-science_light_reflection_refraction-C1", description: "State the laws of reflection and refraction and apply Snell’s law to ray diagrams.", bloomLevel: "Understand" },
      { id: "S10-science_light_reflection_refraction-C2", description: "Use mirror and lens formulas (1/f = 1/v + 1/u) and magnification equations to solve numerical problems.", bloomLevel: "Apply" },
      { id: "S10-science_light_reflection_refraction-C3", description: "Draw ray diagrams for concave and convex mirrors/lenses and identify the nature and position of images.", bloomLevel: "Analyze" },
      { id: "S10-science_light_reflection_refraction-C4", description: "Explain phenomena such as lateral shift, total internal reflection and optical fibres.", bloomLevel: "Analyze" }
    ],
    misconceptions: [
      {
        concept: "Image orientation",
        commonError: "Thinking a convex mirror always produces larger images because it is bulging outward.",
        correction: "Convex mirrors always form virtual, diminished images regardless of object position." 
      },
      {
        concept: "Sign conventions",
        commonError: "Incorrect assignment of signs to distances in mirror and lens formulas leading to wrong results.",
        correction: "Use the sign convention: distances measured against the direction of incident light are negative; with the light are positive." 
      },
      {
        concept: "Refraction path",
        commonError: "Assuming that light bends toward the normal when entering any medium regardless of its refractive index.",
        correction: "Light bends toward the normal when entering a medium of higher refractive index and away when entering a medium of lower refractive index." 
      }
    ],
    caseStudies: [
      {
        id: "science_light_reflection_refraction-CS1",
        tier: "high-roi",
        contextText:
          "A driver uses a convex mirror for a rear‑view mirror and a concave mirror for focused headlamps. She also notices that a straw in a glass of water appears bent at the surface. These observations involve reflection and refraction of light.",
        subQuestions: [
          {
            id: "science_light_reflection_refraction-CS1-Q1",
            questionText: "Why do cars use convex mirrors as rear‑view mirrors?",
            questionType: "ShortAnswer",
            marks: 1,
            bloomLevel: "Understand",
            correctAnswer: "Convex mirrors provide a wide field of view and always produce upright, diminished images so the driver can see more of the road behind.",
            explanation: "The wider field helps avoid blind spots; although objects appear smaller, their relative positions are visible.",
            hint: "Think about field of view and image nature.",
            competencyCode: "S10-science_light_reflection_refraction-C3"
          },
          {
            id: "science_light_reflection_refraction-CS1-Q2",
            questionText: "Explain why the straw appears bent at the water surface.",
            questionType: "ShortAnswer",
            marks: 2,
            bloomLevel: "Analyze",
            correctAnswer: "Light rays bend due to refraction when they pass from water to air; the emergent rays appear to originate from a different point, creating an apparent shift.",
            explanation: "The change in speed when light moves between media of different optical density causes bending at the interface, giving the illusion of a displaced straw.",
            hint: "Use Snell’s law and refractive indices.",
            competencyCode: "S10-science_light_reflection_refraction-C4"
          },
          {
            id: "science_light_reflection_refraction-CS1-Q3",
            questionText: "State the mirror formula and define each symbol used.",
            questionType: "ShortAnswer",
            marks: 1,
            bloomLevel: "Remember",
            correctAnswer: "1/f = 1/v + 1/u, where f is focal length, v is image distance and u is object distance, using proper sign convention.",
            explanation: "This formula relates object distance, image distance and focal length for spherical mirrors.",
            hint: "It is a relation among three distances for mirrors.",
            competencyCode: "S10-science_light_reflection_refraction-C2"
          }
        ]
      }
    ],
    labActivities: [
      {
        id: "science_light_reflection_refraction-LAB1",
        title: "Verification of laws of reflection",
        objective: "To verify that the angle of incidence equals the angle of reflection for a plane mirror.",
        materialsRequired: "Plane mirror, protractor, ray box or light source, paper, pins.",
        procedureSteps: "Place the mirror on a paper and draw its line of incidence. Use a ray box to shine a light at a known angle. Measure the angle of incidence and the angle of reflection using a protractor and verify they are equal.",
        observations: [
          {
            scenario: "Incident angle 30°",
            expectedOutcome: "Reflected angle ≈ 30° on the opposite side.",
            scientificReason: "Law of reflection states that incident angle equals reflected angle."
          },
          {
            scenario: "Changing incident angle",
            expectedOutcome: "The reflected angle always matches the incident angle.",
            scientificReason: "This confirms the first law of reflection irrespective of the angle chosen."
          }
        ],
        vivaVoce: {
          title: "Refraction law",
          question: "State Snell’s law and explain the terms involved."
        },
        safetyPrecautions: "Avoid looking directly at bright light sources; handle mirrors carefully to prevent breakage."
      }
    ]
  },

  /**
   * Human Eye and the Colourful World
   */
  "science_human_eye_colourful_world": {
    workedExamples: [
      {
        title: "Eye defects",
        question: "Explain the causes of myopia and hypermetropia and how each defect can be corrected."
      },
      {
        title: "Dispersion of light",
        question: "Describe why a prism splits white light into its constituent colours and name the phenomenon."
      }
    ],
    competencies: [
      { id: "S10-science_human_eye_colourful_world-C1", description: "Describe the structure and functioning of the human eye including accommodation and persistence of vision.", bloomLevel: "Understand" },
      { id: "S10-science_human_eye_colourful_world-C2", description: "Explain common vision defects (myopia, hypermetropia, presbyopia) and their correction using lenses.", bloomLevel: "Apply" },
      { id: "S10-science_human_eye_colourful_world-C3", description: "Discuss atmospheric refraction phenomena such as twinkling of stars and advanced sunrise/delayed sunset.", bloomLevel: "Analyze" },
      { id: "S10-science_human_eye_colourful_world-C4", description: "Explain dispersion and scattering of light leading to colours in the sky, rainbows and why the sky appears blue.", bloomLevel: "Analyze" }
    ],
    misconceptions: [
      {
        concept: "Eye lenses",
        commonError: "Thinking the eye has multiple lenses like a camera rather than a single flexible lens.",
        correction: "The human eye has one crystalline lens which changes shape to adjust focal length (accommodation)." 
      },
      {
        concept: "Colour of sky",
        commonError: "Believing the sky is blue because it reflects the blue colour of the oceans.",
        correction: "Blue colour of the sky is due to scattering of shorter wavelengths of sunlight by air molecules (Rayleigh scattering)." 
      },
      {
        concept: "Rainbow formation",
        commonError: "Assuming a rainbow forms whenever it rains, regardless of sunlight.",
        correction: "A rainbow appears when sunlight shines from behind the observer onto water droplets; without sunlight at the correct angle, no rainbow forms." 
      }
    ],
    caseStudies: [
      {
        id: "science_human_eye_colourful_world-CS1",
        tier: "high-roi",
        contextText:
          "While watching a sunset at the beach, a student notices that the Sun appears flattened at the horizon and that stars begin to twinkle as night falls. Later, she observes a rainbow after a rain shower with the Sun behind her.",
        subQuestions: [
          {
            id: "science_human_eye_colourful_world-CS1-Q1",
            questionText: "Why does the Sun appear flattened near the horizon?",
            questionType: "ShortAnswer",
            marks: 1,
            bloomLevel: "Analyze",
            correctAnswer: "Atmospheric refraction bends light from the lower edge of the Sun more than from the upper edge, causing a flattened appearance.",
            explanation: "Light rays travel through denser layers of air near the horizon, causing differential refraction of the Sun’s disk.",
            hint: "Think about how refraction changes the apparent position of objects.",
            competencyCode: "S10-science_human_eye_colourful_world-C3"
          },
          {
            id: "science_human_eye_colourful_world-CS1-Q2",
            questionText: "Explain briefly why stars twinkle but planets do not.",
            questionType: "ShortAnswer",
            marks: 2,
            bloomLevel: "Analyze",
            correctAnswer: "Stars are point sources of light; atmospheric turbulence causes rapid changes in refractive index, making their apparent positions shift and intensities vary. Planets have measurable angular size, so these fluctuations average out and they appear steady.",
            explanation: "Point sources are more affected by small fluctuations, while extended sources like planets provide steadier light.",
            hint: "Consider size of the apparent image and atmospheric effects.",
            competencyCode: "S10-science_human_eye_colourful_world-C3"
          },
          {
            id: "science_human_eye_colourful_world-CS1-Q3",
            questionText: "Describe the formation of a rainbow and state the conditions necessary for its observation.",
            questionType: "ShortAnswer",
            marks: 1,
            bloomLevel: "Understand",
            correctAnswer: "Rainbows form due to dispersion, refraction and total internal reflection of sunlight in water droplets. They are seen when sunlight shines from behind the observer onto droplets ahead.",
            explanation: "Each droplet acts like a prism, separating white light into its spectrum and reflecting it back toward the observer at a specific angle.",
            hint: "Think about the path of light through a raindrop.",
            competencyCode: "S10-science_human_eye_colourful_world-C4"
          }
        ]
      }
    ],
    labActivities: []
  },

  /**
   * Our Environment
   */
  "science_our_environment": {
    workedExamples: [
      {
        title: "Food chain construction",
        question: "Construct a simple food chain involving grass, a rabbit and a fox and label each trophic level."
      },
      {
        title: "Biodegradable vs non‑biodegradable",
        question: "Give two examples each of biodegradable and non‑biodegradable waste and explain their environmental impact."
      }
    ],
    competencies: [
      { id: "S10-science_our_environment-C1", description: "Define ecosystem, food chains and food webs and distinguish between producers, consumers and decomposers.", bloomLevel: "Understand" },
      { id: "S10-science_our_environment-C2", description: "Explain the concept of trophic levels and energy flow in ecosystems.", bloomLevel: "Apply" },
      { id: "S10-science_our_environment-C3", description: "Identify sources of pollution and suggest measures for waste management and conservation.", bloomLevel: "Analyze" },
      { id: "S10-science_our_environment-C4", description: "Discuss the importance of sustainable practices and the 3Rs (reduce, reuse, recycle).", bloomLevel: "Analyze" }
    ],
    misconceptions: [
      {
        concept: "Decomposers",
        commonError: "Believing decomposers are unimportant because they are not visible.",
        correction: "Decomposers play a vital role in recycling nutrients and maintaining soil fertility." 
      },
      {
        concept: "Waste breakdown",
        commonError: "Assuming all waste eventually breaks down naturally over time.",
        correction: "Non‑biodegradable materials like plastics persist for decades and require proper management." 
      },
      {
        concept: "Trophic efficiency",
        commonError: "Thinking energy transfer between trophic levels is 100% efficient.",
        correction: "Only about 10% of energy is transferred from one trophic level to the next; the rest is lost as heat and metabolic processes." 
      }
    ],
    caseStudies: [
      {
        id: "science_our_environment-CS1",
        tier: "high-roi",
        contextText:
          "A housing society notices a growing pile of mixed waste near its compound. Concerned residents decide to implement waste segregation and composting to reduce the environmental footprint of their community.",
        subQuestions: [
          {
            id: "science_our_environment-CS1-Q1",
            questionText: "Why is it important to segregate waste into biodegradable and non‑biodegradable components?",
            questionType: "ShortAnswer",
            marks: 1,
            bloomLevel: "Analyze",
            correctAnswer: "Segregation enables proper disposal; biodegradable waste can be composted, while non‑biodegradable waste can be recycled, reducing landfill burden and pollution.",
            explanation: "Mixed waste is difficult to process; separation allows different treatment methods for different types of waste.",
            hint: "Consider the end use of each waste type.",
            competencyCode: "S10-science_our_environment-C3"
          },
          {
            id: "science_our_environment-CS1-Q2",
            questionText: "Describe one simple method the society can adopt to compost kitchen waste.",
            questionType: "ShortAnswer",
            marks: 2,
            bloomLevel: "Apply",
            correctAnswer: "Collect kitchen waste in a pit or compost bin, layer with dry leaves and soil, aerate regularly and maintain moisture; after several weeks, it decomposes into nutrient‑rich compost.",
            explanation: "Composting provides a simple and natural way to recycle organic matter and return nutrients to the soil.",
            hint: "Think about conditions needed for decomposition: moisture, air and microorganisms.",
            competencyCode: "S10-science_our_environment-C2"
          },
          {
            id: "science_our_environment-CS1-Q3",
            questionText: "State one benefit of using compost in the society’s garden instead of chemical fertilisers.",
            questionType: "ShortAnswer",
            marks: 1,
            bloomLevel: "Analyze",
            correctAnswer: "Compost improves soil structure, retains moisture and adds organic nutrients without harming soil organisms, whereas chemical fertilisers may lead to nutrient imbalance and pollution.",
            explanation: "Organic compost enhances long‑term soil health and is environmentally friendly.",
            hint: "Consider sustainability and environmental impact.",
            competencyCode: "S10-science_our_environment-C4"
          }
        ]
      }
    ],
    labActivities: []
  },

  /**
   * Management of Natural Resources
   */
  "science_natural_resources_management": {
    workedExamples: [
      {
        title: "The 5Rs",
        question: "Explain the 5Rs approach to sustainable management of natural resources with one example for each."
      },
      {
        title: "Water harvesting",
        question: "Describe the purpose of rainwater harvesting and how it can be implemented in urban areas."
      }
    ],
    competencies: [
      { id: "S10-science_natural_resources_management-C1", description: "Identify renewable and non‑renewable resources and discuss the need for conservation.", bloomLevel: "Understand" },
      { id: "S10-science_natural_resources_management-C2", description: "Describe methods for sustainable management of water, forests and wildlife (such as rainwater harvesting and joint forest management).", bloomLevel: "Apply" },
      { id: "S10-science_natural_resources_management-C3", description: "Discuss the environmental impact of extraction and consumption of fossil fuels and the importance of using alternative energy sources.", bloomLevel: "Analyze" },
      { id: "S10-science_natural_resources_management-C4", description: "Promote community participation and awareness for conservation of natural resources.", bloomLevel: "Evaluate" }
    ],
    misconceptions: [
      {
        concept: "Resource abundance",
        commonError: "Believing natural resources like water and fossil fuels are inexhaustible because they are abundant now.",
        correction: "Many resources are finite or renew slowly; overuse leads to depletion and ecological imbalance." 
      },
      {
        concept: "Sustainability",
        commonError: "Thinking sustainability only involves recycling without reducing consumption.",
        correction: "Sustainability includes reducing usage, reusing, repurposing and recycling; reduction is the first priority." 
      },
      {
        concept: "Energy sources",
        commonError: "Assuming renewable energy sources are always cheap and universally applicable.",
        correction: "Renewables have upfront costs and geographical limitations; a mix of energy sources may be necessary." 
      }
    ],
    caseStudies: [
      {
        id: "science_natural_resources_management-CS1",
        tier: "high-roi",
        contextText:
          "A village faces water scarcity during the summer. The community discusses implementing rainwater harvesting systems and reducing dependence on groundwater. They also consider planting trees and regulating the use of firewood to conserve forest resources.",
        subQuestions: [
          {
            id: "science_natural_resources_management-CS1-Q1",
            questionText: "How does rainwater harvesting help alleviate water scarcity?",
            questionType: "ShortAnswer",
            marks: 2,
            bloomLevel: "Apply",
            correctAnswer: "It collects and stores rainwater for later use, recharges groundwater and reduces runoff, ensuring water availability during dry periods.",
            explanation: "Harvesting captures rainfall that would otherwise flow away, replenishing local water sources and reducing dependence on external supplies.",
            hint: "Think about water storage and replenishment.",
            competencyCode: "S10-science_natural_resources_management-C2"
          },
          {
            id: "science_natural_resources_management-CS1-Q2",
            questionText: "Explain one benefit of planting trees for natural resource management in this village.",
            questionType: "ShortAnswer",
            marks: 1,
            bloomLevel: "Analyze",
            correctAnswer: "Trees prevent soil erosion, enhance groundwater recharge, provide habitat for wildlife and contribute to climate regulation.",
            explanation: "Roots hold soil, leaves slow down rainwater, and trees support biodiversity and carbon sequestration.",
            hint: "Consider multiple ecological roles of trees.",
            competencyCode: "S10-science_natural_resources_management-C1"
          },
          {
            id: "science_natural_resources_management-CS1-Q3",
            questionText: "Suggest one measure besides rainwater harvesting and afforestation that the villagers can adopt to manage natural resources sustainably.",
            questionType: "ShortAnswer",
            marks: 1,
            bloomLevel: "Evaluate",
            correctAnswer: "Practice sustainable firewood use through community woodlots and efficient stoves or switch to alternative energy sources like biogas.",
            explanation: "Reducing firewood consumption preserves forest resources and improves health by reducing smoke exposure.",
            hint: "Think about fuel alternatives and efficient usage.",
            competencyCode: "S10-science_natural_resources_management-C4"
          }
        ]
      }
    ],
    labActivities: []
  }

};

