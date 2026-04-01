// Auto-generated from Prompt D JSON batches.
// PracticePacksIndex: subject -> topicKey -> TopicPracticePack

export type Subject = 'maths' | 'science';

export type DifficultyLevel = 'Easy' | 'Medium' | 'Hard';

export interface DifficultyMix {
  Easy: number;
  Medium: number;
  Hard: number;
}

export interface ModeConfig {
  targetCount: number;
  difficultyMix: DifficultyMix;
}

export interface ModesConfig {
  [modeKey: string]: ModeConfig;
}

export interface McqVariant {
  optionLabel: string;
  optionText: string;
  isCorrect: boolean;
}

export interface PracticeQuestion {
  id: string;
  text: string;
  marks: number;
  difficulty: DifficultyLevel;
  questionType: string;
  canonicalId?: string;
  mcqVariants?: McqVariant[];
}

export interface TopicPracticePack {
  subject: Subject;
  topicKey: string;
  topicName: string;
  modes: ModesConfig;
  questions: PracticeQuestion[];
}

export type PracticePacksIndex = {
  [subject in Subject]: {
    [topicKey: string]: TopicPracticePack;
  };
};

export const promptDPracticePacks: PracticePacksIndex = 
{
  "science": {
    "chemical_reactions_equations": {
      "subject": "science",
      "topicKey": "chemical_reactions_equations",
      "topicName": "Chemical Reactions and Equations",
      "modes": {
        "speed_practice": {
          "targetCount": 10,
          "difficultyMix": {
            "Easy": 5,
            "Medium": 4,
            "Hard": 1
          }
        },
        "exam_mix": {
          "targetCount": 10,
          "difficultyMix": {
            "Easy": 3,
            "Medium": 5,
            "Hard": 2
          }
        }
      },
      "questions": [
        {
          "id": "S-CHEM-1",
          "text": "Write a balanced chemical equation for rusting of iron.",
          "marks": 1,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "S-CHEM-2",
          "text": "Define a combination reaction with one example (balanced).",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "S-CHEM-3",
          "text": "Balance the equation: Fe + H2O → Fe3O4 + H2.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-CHEM-4",
          "text": "What is a redox reaction? Give one example each of oxidation and reduction in the same reaction.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-CHEM-5",
          "text": "Explain rancidity. How can it be prevented?",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "S-CHEM-6",
          "text": "Classify the reaction CaCO3 → CaO + CO2 and write one more example of same type.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-CHEM-7",
          "text": "What is corrosion? Explain with example and write one method to prevent it.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-CHEM-8",
          "text": "Explain with a suitable example how precipitation reaction leads to formation of an insoluble salt.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-CHEM-9",
          "text": "A solution of substance ‘X’ is used for whitewashing. Name ‘X’ and write the chemical reaction of its preparation.",
          "marks": 3,
          "difficulty": "Hard",
          "questionType": "subjective"
        },
        {
          "id": "S-CHEM-10",
          "text": "Write balanced equations for: (a) displacement reaction of zinc with copper sulphate, (b) a neutralisation reaction.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        }
      ]
    },
    "acids_bases_salts": {
      "subject": "science",
      "topicKey": "acids_bases_salts",
      "topicName": "Acids, Bases and Salts",
      "modes": {
        "speed_practice": {
          "targetCount": 10,
          "difficultyMix": {
            "Easy": 5,
            "Medium": 4,
            "Hard": 1
          }
        },
        "exam_mix": {
          "targetCount": 10,
          "difficultyMix": {
            "Easy": 3,
            "Medium": 5,
            "Hard": 2
          }
        }
      },
      "questions": [
        {
          "id": "S-ABS-1",
          "text": "What is the pH of a neutral solution at 25°C?",
          "marks": 1,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "S-ABS-2",
          "text": "Name the acid present in vinegar and write its formula.",
          "marks": 1,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "S-ABS-3",
          "text": "Define universal indicator. How is it different from litmus?",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-ABS-4",
          "text": "Explain why tooth enamel gets damaged when pH in mouth falls below 5.5.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-ABS-5",
          "text": "Write chemical formula and one use each of baking soda and washing soda.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-ABS-6",
          "text": "What is Plaster of Paris? Write its chemical name and one important use.",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "S-ABS-7",
          "text": "A solution turns red litmus blue. Identify the type of solution and give one example.",
          "marks": 1,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "S-ABS-8",
          "text": "Explain with equation how an acid reacts with a metal carbonate.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-ABS-9",
          "text": "Give reason: Farmers often add quicklime or slaked lime to acidic soil.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-ABS-10",
          "text": "Describe the preparation of washing soda from baking soda with balanced chemical equations.",
          "marks": 3,
          "difficulty": "Hard",
          "questionType": "subjective"
        }
      ]
    },
    "metals_nonmetals": {
      "subject": "science",
      "topicKey": "metals_nonmetals",
      "topicName": "Metals and Non-Metals",
      "modes": {
        "speed_practice": {
          "targetCount": 10,
          "difficultyMix": {
            "Easy": 5,
            "Medium": 4,
            "Hard": 1
          }
        },
        "exam_mix": {
          "targetCount": 10,
          "difficultyMix": {
            "Easy": 3,
            "Medium": 5,
            "Hard": 2
          }
        }
      },
      "questions": [
        {
          "id": "S-MNM-1",
          "text": "Write any two physical properties of metals.",
          "marks": 1,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "S-MNM-2",
          "text": "Why is sodium stored in kerosene?",
          "marks": 1,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "S-MNM-3",
          "text": "Define corrosion and give its one harmful effect.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-MNM-4",
          "text": "What is an alloy? Give one example with its use.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-MNM-5",
          "text": "Explain with example how a more reactive metal displaces a less reactive metal from its salt solution.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-MNM-6",
          "text": "Name the ore of aluminium and write the name of the process used for its extraction.",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "S-MNM-7",
          "text": "Describe the conditions necessary for rusting of iron and write one method to prevent it.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-MNM-8",
          "text": "Explain why copper does not react with dilute acids like HCl under ordinary conditions.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-MNM-9",
          "text": "List any three differences between metals and non-metals based on their properties.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-MNM-10",
          "text": "Explain the term ‘electrolytic refining’ of metals with one example.",
          "marks": 3,
          "difficulty": "Hard",
          "questionType": "subjective"
        }
      ]
    },
    "carbon_compounds": {
      "subject": "science",
      "topicKey": "carbon_compounds",
      "topicName": "Carbon and its Compounds",
      "modes": {
        "speed_practice": {
          "targetCount": 10,
          "difficultyMix": {
            "Easy": 5,
            "Medium": 4,
            "Hard": 1
          }
        },
        "exam_mix": {
          "targetCount": 10,
          "difficultyMix": {
            "Easy": 3,
            "Medium": 5,
            "Hard": 2
          }
        }
      },
      "questions": [
        {
          "id": "S-CARB-1",
          "text": "State the valency of carbon. Why does it form covalent bonds?",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "S-CARB-2",
          "text": "Define homologous series. Give its two characteristics.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-CARB-3",
          "text": "Draw the electron dot structure of methane (CH4).",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-CARB-4",
          "text": "What is the functional group in ethanol? Write its structural formula.",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "S-CARB-5",
          "text": "Explain the term ‘catenation’ with reference to carbon.",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "S-CARB-6",
          "text": "Why are detergents preferred over soaps in hard water?",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-CARB-7",
          "text": "What happens when ethanol is heated with excess concentrated H2SO4? Write balanced equation.",
          "marks": 3,
          "difficulty": "Hard",
          "questionType": "subjective"
        },
        {
          "id": "S-CARB-8",
          "text": "How does soap cleanse? Explain the role of micelles in cleansing action.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-CARB-9",
          "text": "Name and draw the structural formula of first three members of alkane series.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-CARB-10",
          "text": "Differentiate between saturated and unsaturated hydrocarbons with one example and a test for each.",
          "marks": 3,
          "difficulty": "Hard",
          "questionType": "subjective"
        }
      ]
    },
    "life_processes": {
      "subject": "science",
      "topicKey": "life_processes",
      "topicName": "Life Processes",
      "modes": {
        "speed_practice": {
          "targetCount": 10,
          "difficultyMix": {
            "Easy": 5,
            "Medium": 4,
            "Hard": 1
          }
        },
        "exam_mix": {
          "targetCount": 10,
          "difficultyMix": {
            "Easy": 3,
            "Medium": 5,
            "Hard": 2
          }
        }
      },
      "questions": [
        {
          "id": "S-LIFE-1",
          "text": "Define nutrition and name its two main types.",
          "marks": 1,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "S-LIFE-2",
          "text": "Name the enzyme present in saliva and state its function.",
          "marks": 1,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "S-LIFE-3",
          "text": "Differentiate between aerobic and anaerobic respiration (any two points).",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-LIFE-4",
          "text": "Explain the role of alveoli in respiration.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-LIFE-5",
          "text": "What is double circulation? Why is it important in humans?",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-LIFE-6",
          "text": "Draw a labelled diagram of human nephron OR list four functions of kidney.",
          "marks": 3,
          "difficulty": "Hard",
          "questionType": "subjective"
        },
        {
          "id": "S-LIFE-7",
          "text": "Describe the route taken by blood in human body starting and ending at right atrium.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-LIFE-8",
          "text": "How is food transported in plants? Name the tissue involved and direction of movement.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-LIFE-9",
          "text": "Why is the small intestine in herbivores longer than in carnivores?",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-LIFE-10",
          "text": "Explain any three differences between autotrophic and heterotrophic nutrition.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        }
      ]
    },
    "electricity": {
      "subject": "science",
      "topicKey": "electricity",
      "topicName": "Electricity",
      "modes": {
        "speed_practice": {
          "targetCount": 10,
          "difficultyMix": {
            "Easy": 5,
            "Medium": 4,
            "Hard": 1
          }
        },
        "exam_mix": {
          "targetCount": 10,
          "difficultyMix": {
            "Easy": 3,
            "Medium": 5,
            "Hard": 2
          }
        }
      },
      "questions": [
        {
          "id": "S-ELEC-1",
          "text": "Define electric current and write its SI unit.",
          "marks": 1,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "S-ELEC-2",
          "text": "State Ohm’s law and draw a labelled V–I graph for an ohmic conductor.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-ELEC-3",
          "text": "A potential difference of 12 V is applied across resistor of 6 Ω. Calculate current flowing.",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "S-ELEC-4",
          "text": "What is resistivity? How does it differ from resistance?",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-ELEC-5",
          "text": "Two resistors of 4 Ω and 6 Ω are connected in series. Find their equivalent resistance and total current when connected to 5 V supply.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-ELEC-6",
          "text": "Draw a circuit diagram to show three resistors connected in parallel and write expression for equivalent resistance.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-ELEC-7",
          "text": "Define electric power. Derive relation P = I^2R.",
          "marks": 3,
          "difficulty": "Hard",
          "questionType": "subjective"
        },
        {
          "id": "S-ELEC-8",
          "text": "An electric iron of power 1000 W is used for 2 hours daily. Calculate energy consumed in kWh in 30 days.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-ELEC-9",
          "text": "Why are household electric appliances usually connected in parallel, not in series? Give two reasons.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-ELEC-10",
          "text": "State the factors on which resistance of a conductor depends and explain qualitatively.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        }
      ]
    },
    "periodic_classification": {
      "subject": "science",
      "topicKey": "periodic_classification",
      "topicName": "Periodic Classification of Elements",
      "modes": {
        "speed_practice": {
          "targetCount": 10,
          "difficultyMix": {
            "Easy": 5,
            "Medium": 4,
            "Hard": 1
          }
        },
        "exam_mix": {
          "targetCount": 10,
          "difficultyMix": {
            "Easy": 3,
            "Medium": 5,
            "Hard": 2
          }
        }
      },
      "questions": [
        {
          "id": "S-PER-1",
          "text": "State Modern Periodic Law.",
          "marks": 1,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "S-PER-2",
          "text": "Define period and group in Modern Periodic Table.",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "S-PER-3",
          "text": "How does atomic size change on moving down a group and why?",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-PER-4",
          "text": "State how metallic character varies on moving from left to right in a period. Give reason.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-PER-5",
          "text": "Explain why elements in a group show similar chemical properties.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-PER-6",
          "text": "What were limitations of Dobereiner’s triads as a classification scheme? (Any two)",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-PER-7",
          "text": "An element X is in group 1 and element Y is in group 17. Predict type of bond in compound XY and justify.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-PER-8",
          "text": "In same period of periodic table, element A has atomic number 12 and B has 17. Compare their metallic character and size.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-PER-9",
          "text": "Explain why noble gases are placed in separate group in Modern Periodic Table.",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "S-PER-10",
          "text": "Element X forms basic oxide, is solid at room temperature and forms XCl2. Predict its position (group and likely side) in periodic table with reason.",
          "marks": 3,
          "difficulty": "Hard",
          "questionType": "subjective"
        }
      ]
    },
    "control_coordination": {
      "subject": "science",
      "topicKey": "control_coordination",
      "topicName": "Control and Coordination",
      "modes": {
        "speed_practice": {
          "targetCount": 10,
          "difficultyMix": {
            "Easy": 5,
            "Medium": 4,
            "Hard": 1
          }
        },
        "exam_mix": {
          "targetCount": 10,
          "difficultyMix": {
            "Easy": 3,
            "Medium": 5,
            "Hard": 2
          }
        }
      },
      "questions": [
        {
          "id": "S-CC-1",
          "text": "Name the basic functional unit of nervous system.",
          "marks": 1,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "S-CC-2",
          "text": "Draw a simple labelled diagram of neuron OR write two functions of neuron.",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "S-CC-3",
          "text": "Define reflex action and reflex arc.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-CC-4",
          "text": "Name three major parts of human brain and give one function of each.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-CC-5",
          "text": "What is role of plant hormones in control and coordination? Give two examples.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-CC-6",
          "text": "How does adrenaline help body to face an emergency situation?",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-CC-7",
          "text": "Distinguish between voluntary and involuntary actions with one example each.",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "S-CC-8",
          "text": "Explain phototropism in plants with neat labelled sketch or stepwise explanation.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-CC-9",
          "text": "Why is spinal cord injury more serious than injury to muscle in leg?",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-CC-10",
          "text": "Explain briefly how chemical coordination is brought about in animals by hormones.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        }
      ]
    },
    "reproduction": {
      "subject": "science",
      "topicKey": "reproduction",
      "topicName": "How do Organisms Reproduce?",
      "modes": {
        "speed_practice": {
          "targetCount": 10,
          "difficultyMix": {
            "Easy": 5,
            "Medium": 4,
            "Hard": 1
          }
        },
        "exam_mix": {
          "targetCount": 10,
          "difficultyMix": {
            "Easy": 3,
            "Medium": 5,
            "Hard": 2
          }
        }
      },
      "questions": [
        {
          "id": "S-REP-1",
          "text": "Define asexual reproduction and give one example organism.",
          "marks": 1,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "S-REP-2",
          "text": "Differentiate between binary fission and multiple fission with one example each.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-REP-3",
          "text": "Explain regeneration with example of planaria or hydra.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-REP-4",
          "text": "List four parts of a flower involved in sexual reproduction.",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "S-REP-5",
          "text": "Briefly describe process of fertilisation in human beings.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-REP-6",
          "text": "What is menstrual cycle? State its significance.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-REP-7",
          "text": "Explain vegetative propagation and mention one advantage to farmer/gardener.",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "S-REP-8",
          "text": "Why is variation beneficial to a species but not necessarily to an individual?",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-REP-9",
          "text": "State any three methods to avoid pregnancy and mention one advantage of family planning.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-REP-10",
          "text": "Explain the need for sex education among adolescents.",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective"
        }
      ]
    },
    "heredity_evolution": {
      "subject": "science",
      "topicKey": "heredity_evolution",
      "topicName": "Heredity and Evolution",
      "modes": {
        "speed_practice": {
          "targetCount": 10,
          "difficultyMix": {
            "Easy": 5,
            "Medium": 4,
            "Hard": 1
          }
        },
        "exam_mix": {
          "targetCount": 10,
          "difficultyMix": {
            "Easy": 3,
            "Medium": 5,
            "Hard": 2
          }
        }
      },
      "questions": [
        {
          "id": "S-HER-1",
          "text": "Define heredity and variation.",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "S-HER-2",
          "text": "State Mendel’s law of dominance with an example.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-HER-3",
          "text": "Differentiate between genotype and phenotype with one example.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-HER-4",
          "text": "What is a monohybrid cross? Show with example of tall and dwarf pea plants.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-HER-5",
          "text": "Why are traits such as big biceps of a person not inherited by his children?",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-HER-6",
          "text": "What evidence do fossils provide in support of evolution?",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-HER-7",
          "text": "Differentiate between homologous and analogous organs with one example each.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-HER-8",
          "text": "Explain briefly how sex of a child is determined in human beings.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-HER-9",
          "text": "Define speciation and mention any two factors that lead to it.",
          "marks": 3,
          "difficulty": "Hard",
          "questionType": "subjective"
        },
        {
          "id": "S-HER-10",
          "text": "Give one example each where evolution is observed in day-to-day life (e.g. bacteria, insects).",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective"
        }
      ]
    },
    "light_reflection_refraction": {
      "subject": "science",
      "topicKey": "light_reflection_refraction",
      "topicName": "Light – Reflection and Refraction",
      "modes": {
        "speed_practice": {
          "targetCount": 10,
          "difficultyMix": {
            "Easy": 5,
            "Medium": 4,
            "Hard": 1
          }
        },
        "exam_mix": {
          "targetCount": 10,
          "difficultyMix": {
            "Easy": 3,
            "Medium": 5,
            "Hard": 2
          }
        }
      },
      "questions": [
        {
          "id": "S-LIGHT-1",
          "text": "State the laws of reflection of light.",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "S-LIGHT-2",
          "text": "Define focal length of a concave mirror.",
          "marks": 1,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "S-LIGHT-3",
          "text": "Write mirror formula and explain meaning of symbols used.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-LIGHT-4",
          "text": "State Snell’s law of refraction and define refractive index.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-LIGHT-5",
          "text": "Draw ray diagram for image formed by a concave mirror when object is placed between F and 2F.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-LIGHT-6",
          "text": "An object is placed 30 cm in front of concave mirror of focal length 15 cm. Find image position using mirror formula.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-LIGHT-7",
          "text": "Define power of lens and state its SI unit.",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "S-LIGHT-8",
          "text": "A convex lens of focal length 20 cm forms image of object placed 30 cm in front of it. Find image distance (take appropriate sign convention).",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-LIGHT-9",
          "text": "Why does a pencil partly immersed in water appear bent at the surface?",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-LIGHT-10",
          "text": "Mention any two uses each of concave mirror and convex mirror in daily life.",
          "marks": 3,
          "difficulty": "Easy",
          "questionType": "subjective"
        }
      ]
    },
    "human_eye_colourful_world": {
      "subject": "science",
      "topicKey": "human_eye_colourful_world",
      "topicName": "The Human Eye and the Colourful World",
      "modes": {
        "speed_practice": {
          "targetCount": 10,
          "difficultyMix": {
            "Easy": 5,
            "Medium": 4,
            "Hard": 1
          }
        },
        "exam_mix": {
          "targetCount": 10,
          "difficultyMix": {
            "Easy": 3,
            "Medium": 5,
            "Hard": 2
          }
        }
      },
      "questions": [
        {
          "id": "S-EYE-1",
          "text": "Name the part of human eye that controls amount of light entering it.",
          "marks": 1,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "S-EYE-2",
          "text": "Define far point and near point of a normal eye.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-EYE-3",
          "text": "What is myopia? State its cause and correction briefly.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-EYE-4",
          "text": "What is hypermetropia? Which lens is used to correct it?",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "S-EYE-5",
          "text": "State conditions necessary for formation of rainbow in the sky.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-EYE-6",
          "text": "Explain briefly why the Sun appears reddish at sunrise and sunset.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-EYE-7",
          "text": "What is atmospheric refraction? Give one example to illustrate it.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-EYE-8",
          "text": "Explain why danger signals are red in colour.",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "S-EYE-9",
          "text": "What is persistence of vision and how does it help in watching movies?",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-EYE-10",
          "text": "Explain reason for advanced sunrise and delayed sunset as seen from Earth.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        }
      ]
    },
    "magnetic_effects": {
      "subject": "science",
      "topicKey": "magnetic_effects",
      "topicName": "Magnetic Effects of Electric Current",
      "modes": {
        "speed_practice": {
          "targetCount": 10,
          "difficultyMix": {
            "Easy": 5,
            "Medium": 4,
            "Hard": 1
          }
        },
        "exam_mix": {
          "targetCount": 10,
          "difficultyMix": {
            "Easy": 3,
            "Medium": 5,
            "Hard": 2
          }
        }
      },
      "questions": [
        {
          "id": "S-MAG-1",
          "text": "State one property of magnetic field lines.",
          "marks": 1,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "S-MAG-2",
          "text": "What is right-hand thumb rule? State its use.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-MAG-3",
          "text": "Name rule used to find direction of force on a current-carrying conductor placed in magnetic field.",
          "marks": 1,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "S-MAG-4",
          "text": "Write two factors on which magnetic field produced by current-carrying solenoid depends.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-MAG-5",
          "text": "How does Fleming’s left-hand rule help in understanding working of electric motor?",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-MAG-6",
          "text": "What is meant by electromagnetic induction? Name one device based on this principle.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-MAG-7",
          "text": "Draw a neat diagram of simple electric motor (or describe its main parts).",
          "marks": 3,
          "difficulty": "Hard",
          "questionType": "subjective"
        },
        {
          "id": "S-MAG-8",
          "text": "State difference between direct current (DC) and alternating current (AC) in two points.",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "S-MAG-9",
          "text": "What is role of fuse in domestic circuit? Why is its wire always placed in live wire?",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-MAG-10",
          "text": "Why is earthing provided in domestic wiring?",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective"
        }
      ]
    },
    "our_environment": {
      "subject": "science",
      "topicKey": "our_environment",
      "topicName": "Our Environment",
      "modes": {
        "speed_practice": {
          "targetCount": 10,
          "difficultyMix": {
            "Easy": 5,
            "Medium": 4,
            "Hard": 1
          }
        },
        "exam_mix": {
          "targetCount": 10,
          "difficultyMix": {
            "Easy": 3,
            "Medium": 5,
            "Hard": 2
          }
        }
      },
      "questions": [
        {
          "id": "S-ENV-1",
          "text": "Define ecosystem and give one example.",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "S-ENV-2",
          "text": "Distinguish between producers and consumers with one example each.",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "S-ENV-3",
          "text": "What is 10% law of energy transfer? Explain briefly.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-ENV-4",
          "text": "What is biological magnification? State its effect on human beings.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-ENV-5",
          "text": "Give one reason each: (a) energy flow is unidirectional, (b) food chains are usually short.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-ENV-6",
          "text": "Differentiate between biodegradable and non-biodegradable wastes with one example each.",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "S-ENV-7",
          "text": "Explain how use of non-biodegradable pesticides affects food chain.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-ENV-8",
          "text": "Draw a simple food chain from grass to eagle (or write in words).",
          "marks": 1,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "S-ENV-9",
          "text": "Why are bacteria and fungi called decomposers? What is their importance?",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-ENV-10",
          "text": "Suggest any two ways students can contribute to environmental protection in school.",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective"
        }
      ]
    },
    "natural_resources_management": {
      "subject": "science",
      "topicKey": "natural_resources_management",
      "topicName": "Management of Natural Resources",
      "modes": {
        "speed_practice": {
          "targetCount": 10,
          "difficultyMix": {
            "Easy": 5,
            "Medium": 4,
            "Hard": 1
          }
        },
        "exam_mix": {
          "targetCount": 10,
          "difficultyMix": {
            "Easy": 3,
            "Medium": 5,
            "Hard": 2
          }
        }
      },
      "questions": [
        {
          "id": "S-NR-1",
          "text": "What do you mean by ‘natural resources’? Give one example.",
          "marks": 1,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "S-NR-2",
          "text": "State the three R’s of waste management.",
          "marks": 1,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "S-NR-3",
          "text": "Why should we conserve forests? Give two reasons.",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "S-NR-4",
          "text": "Explain how water harvesting helps in sustainable management of water resources.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-NR-5",
          "text": "What is meant by sustainable development? Give one example.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-NR-6",
          "text": "Describe briefly the Chipko movement and its significance.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-NR-7",
          "text": "Why is reuse considered better than recycle in waste management?",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-NR-8",
          "text": "State any three problems caused by excessive use of fossil fuels.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-NR-9",
          "text": "What role can local people play in managing forests and wildlife?",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "S-NR-10",
          "text": "Suggest any two ways you as a student can help in conservation of natural resources.",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective"
        }
      ]
    }
  },
  "maths": {
    "real_numbers": {
      "subject": "maths",
      "topicKey": "real_numbers",
      "topicName": "Real Numbers",
      "modes": {
        "speed_practice": {
          "targetCount": 10,
          "difficultyMix": {
            "Easy": 5,
            "Medium": 4,
            "Hard": 1
          }
        },
        "exam_mix": {
          "targetCount": 10,
          "difficultyMix": {
            "Easy": 3,
            "Medium": 5,
            "Hard": 2
          }
        }
      },
      "questions": [
        {
          "id": "M-REAL-1",
          "text": "State whether 27/125 has a terminating or non-terminating decimal expansion.",
          "marks": 1,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "M-REAL-2",
          "text": "Without actual division, decide whether 13/2^2·5^3 will have a terminating decimal expansion. Justify briefly.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "M-REAL-3",
          "text": "Use Euclid’s division algorithm to find the HCF of 84 and 120.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "M-REAL-4",
          "text": "Express 392 as a product of prime factors and hence find the HCF of 392 and 252.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "M-REAL-5",
          "text": "Prove that √5 is an irrational number.",
          "marks": 3,
          "difficulty": "Hard",
          "questionType": "subjective"
        },
        {
          "id": "M-REAL-6",
          "text": "Explain why 2/7 has a non-terminating repeating decimal expansion.",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "M-REAL-7",
          "text": "Show that the product of two consecutive positive integers is always even, using Fundamental Theorem of Arithmetic idea.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "M-REAL-8",
          "text": "If HCF of two numbers is 9 and their product is 1458, find their LCM.",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "M-REAL-9",
          "text": "Prove that any positive integer of the form 6q+2 or 6q+4 is always even but not divisible by 3.",
          "marks": 3,
          "difficulty": "Hard",
          "questionType": "subjective"
        },
        {
          "id": "M-REAL-10",
          "text": "Check whether 17/2·5^2·3 will have a terminating decimal or not. Give reason based on its denominator.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective"
        }
      ]
    },
    "polynomials": {
      "subject": "maths",
      "topicKey": "polynomials",
      "topicName": "Polynomials",
      "modes": {
        "speed_practice": {
          "targetCount": 10,
          "difficultyMix": {
            "Easy": 5,
            "Medium": 4,
            "Hard": 1
          }
        },
        "exam_mix": {
          "targetCount": 10,
          "difficultyMix": {
            "Easy": 3,
            "Medium": 5,
            "Hard": 2
          }
        }
      },
      "questions": [
        {
          "id": "M-POLY-1",
          "text": "Find the degree of the polynomial 7x^4 − 3x^2 + 5x − 11.",
          "marks": 1,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "M-POLY-2",
          "text": "If one zero of the polynomial x^2 − 5x + 6 is 2, find the other zero.",
          "marks": 1,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "M-POLY-3",
          "text": "For the quadratic polynomial 2x^2 − 7x + 3, find the sum and product of its zeroes.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "M-POLY-4",
          "text": "Find a quadratic polynomial whose zeroes are 3 and −2.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "M-POLY-5",
          "text": "Given that one zero of polynomial 2x^2 + kx + 3 is 1, find the value of k and the other zero.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "M-POLY-6",
          "text": "If α and β are zeroes of 3x^2 − 2x + 1, find the polynomial whose zeroes are 1/α and 1/β.",
          "marks": 3,
          "difficulty": "Hard",
          "questionType": "subjective"
        },
        {
          "id": "M-POLY-7",
          "text": "Draw a rough sketch of a graph of a cubic polynomial with three distinct real zeroes and explain how zeroes are seen from the graph.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "M-POLY-8",
          "text": "If the graph of a quadratic polynomial intersects the x-axis at two distinct points, what can you say about its zeroes? Give reason.",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "M-POLY-9",
          "text": "For polynomial f(x) = x^3 − 4x^2 + x + 6, if (x − 2) is a factor, find the remaining factors and all zeroes.",
          "marks": 4,
          "difficulty": "Hard",
          "questionType": "subjective"
        },
        {
          "id": "M-POLY-10",
          "text": "The zeroes of a quadratic polynomial are −1 and 4. Form the polynomial and verify the relation between coefficients and zeroes.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        }
      ]
    },
    "pair_of_linear_equations": {
      "subject": "maths",
      "topicKey": "pair_of_linear_equations",
      "topicName": "Pair of Linear Equations in Two Variables",
      "modes": {
        "speed_practice": {
          "targetCount": 10,
          "difficultyMix": {
            "Easy": 5,
            "Medium": 4,
            "Hard": 1
          }
        },
        "exam_mix": {
          "targetCount": 10,
          "difficultyMix": {
            "Easy": 3,
            "Medium": 5,
            "Hard": 2
          }
        }
      },
      "questions": [
        {
          "id": "M-PLE-1",
          "text": "Write condition on coefficients for the pair a1x + b1y + c1 = 0 and a2x + b2y + c2 = 0 to represent parallel lines.",
          "marks": 1,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "M-PLE-2",
          "text": "Solve the pair: x + 2y = 7 and 3x − y = 5 using substitution method.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "M-PLE-3",
          "text": "Solve the pair: 2x + 3y = 13 and 3x − 2y = 4 using elimination method.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "M-PLE-4",
          "text": "For what value of k will the pair 3x + 4y = 10 and 6x + 8y = k have infinitely many solutions?",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "M-PLE-5",
          "text": "Graphically represent the pair 2x + y = 6 and 4x + 2y = 12 and comment on number of solutions.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "M-PLE-6",
          "text": "The sum of two numbers is 27 and their difference is 5. Form a pair of linear equations and find the numbers.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "M-PLE-7",
          "text": "A fraction becomes 1/2 when 1 is subtracted from numerator and 2 is added to denominator. It becomes 1 when 4 is added to both. Find the fraction.",
          "marks": 4,
          "difficulty": "Hard",
          "questionType": "subjective"
        },
        {
          "id": "M-PLE-8",
          "text": "Ticket for a movie costs ₹120 for adults and ₹80 for children. If 25 tickets cost ₹2500, find number of adult and child tickets using linear equations.",
          "marks": 4,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "M-PLE-9",
          "text": "Check graphically whether pair 2x − 3y = 8 and 4x − 6y = 16 has unique, infinite or no solution.",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "M-PLE-10",
          "text": "Form a pair of linear equations for: 'The sum of a number and its double is 18 and their difference is 6', then solve it.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        }
      ]
    },
    "quadratic_equations": {
      "subject": "maths",
      "topicKey": "quadratic_equations",
      "topicName": "Quadratic Equations",
      "modes": {
        "speed_practice": {
          "targetCount": 10,
          "difficultyMix": {
            "Easy": 5,
            "Medium": 4,
            "Hard": 1
          }
        },
        "exam_mix": {
          "targetCount": 10,
          "difficultyMix": {
            "Easy": 3,
            "Medium": 5,
            "Hard": 2
          }
        }
      },
      "questions": [
        {
          "id": "M-QUAD-1",
          "text": "Write the discriminant of quadratic equation ax^2 + bx + c = 0 and state what it indicates.",
          "marks": 1,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "M-QUAD-2",
          "text": "Find the nature of roots of equation 4x^2 − 4x + 1 = 0.",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "M-QUAD-3",
          "text": "Solve x^2 − 7x + 10 = 0 by factorisation method.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "M-QUAD-4",
          "text": "Solve 3x^2 − 5x − 2 = 0 using quadratic formula.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "M-QUAD-5",
          "text": "For what values of k will quadratic equation x^2 + kx + 9 = 0 have equal roots?",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "M-QUAD-6",
          "text": "If α and β are roots of equation x^2 − 4x + 1 = 0, find the equation whose roots are α+1 and β+1.",
          "marks": 4,
          "difficulty": "Hard",
          "questionType": "subjective"
        },
        {
          "id": "M-QUAD-7",
          "text": "Sum of reciprocals of the roots of a quadratic equation is 5 and their product is 2. Form the equation.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "M-QUAD-8",
          "text": "A rectangular garden has area 96 m^2 and length exceeds breadth by 4 m. Form and solve a quadratic equation to find its dimensions.",
          "marks": 4,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "M-QUAD-9",
          "text": "Determine the value of m if one root of 2x^2 + mx + 3 = 0 is double the other.",
          "marks": 3,
          "difficulty": "Hard",
          "questionType": "subjective"
        },
        {
          "id": "M-QUAD-10",
          "text": "Solve for x: 1/(x+1) + 1/(x−2) = 3/2.",
          "marks": 3,
          "difficulty": "Hard",
          "questionType": "subjective"
        }
      ]
    },
    "arithmetic_progressions": {
      "subject": "maths",
      "topicKey": "arithmetic_progressions",
      "topicName": "Arithmetic Progressions",
      "modes": {
        "speed_practice": {
          "targetCount": 10,
          "difficultyMix": {
            "Easy": 5,
            "Medium": 4,
            "Hard": 1
          }
        },
        "exam_mix": {
          "targetCount": 10,
          "difficultyMix": {
            "Easy": 3,
            "Medium": 5,
            "Hard": 2
          }
        }
      },
      "questions": [
        {
          "id": "M-AP-1",
          "text": "In AP 5, 9, 13, …, write the first four terms and find common difference.",
          "marks": 1,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "M-AP-2",
          "text": "Find the 15th term of the AP 7, 10, 13, … .",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "M-AP-3",
          "text": "Which term of AP 3, 8, 13, … is 103?",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "M-AP-4",
          "text": "Find the sum of first 20 terms of AP whose first term is 4 and common difference is 3.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "M-AP-5",
          "text": "Sum of first n terms of an AP is 3n^2 + 5n. Find its 10th term.",
          "marks": 3,
          "difficulty": "Hard",
          "questionType": "subjective"
        },
        {
          "id": "M-AP-6",
          "text": "The 8th term of an AP is 37 and 13th term is 62. Find the AP.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "M-AP-7",
          "text": "Three numbers in AP have sum 21 and product 315. Find the numbers.",
          "marks": 4,
          "difficulty": "Hard",
          "questionType": "subjective"
        },
        {
          "id": "M-AP-8",
          "text": "A sum of ₹1000 is to be distributed among 10 students such that each gets ₹5 more than previous one. Find amount received by the first and last student.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "M-AP-9",
          "text": "How many terms of AP 6, 10, 14, … are needed to give sum 136?",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "M-AP-10",
          "text": "If S_n denotes sum of first n terms of AP and S_5 = 45, S_10 = 145, find a and d.",
          "marks": 3,
          "difficulty": "Hard",
          "questionType": "subjective"
        }
      ]
    },
    "triangles": {
      "subject": "maths",
      "topicKey": "triangles",
      "topicName": "Triangles",
      "modes": {
        "speed_practice": {
          "targetCount": 10,
          "difficultyMix": {
            "Easy": 5,
            "Medium": 4,
            "Hard": 1
          }
        },
        "exam_mix": {
          "targetCount": 10,
          "difficultyMix": {
            "Easy": 3,
            "Medium": 5,
            "Hard": 2
          }
        }
      },
      "questions": [
        {
          "id": "M-TRI-1",
          "text": "State the Basic Proportionality Theorem (Thales’ theorem).",
          "marks": 1,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "M-TRI-2",
          "text": "In ΔABC, DE ∥ BC and D, E lie on AB, AC respectively. If AD = 2, DB = 3, find AE/EC.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "M-TRI-3",
          "text": "In two similar triangles, ratio of their corresponding sides is 3:5. Find ratio of their areas.",
          "marks": 1,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "M-TRI-4",
          "text": "Prove that if a line is drawn parallel to one side of a triangle to intersect other two sides, then it divides them in the same ratio.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "M-TRI-5",
          "text": "Prove that in a right-angled triangle, the square on hypotenuse is equal to sum of squares on other two sides.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "M-TRI-6",
          "text": "In ΔABC, right-angled at B, if AB = 6 cm and BC = 8 cm, find AC and verify Pythagoras theorem.",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "M-TRI-7",
          "text": "Two triangles are similar and area of first is 49 cm^2 while area of second is 121 cm^2. If one side of first triangle is 7 cm, find corresponding side of second.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "M-TRI-8",
          "text": "In ΔABC and ΔPQR, if ∠A = ∠P, ∠B = ∠Q and BC/QR = CA/RP, prove that triangles are similar.",
          "marks": 4,
          "difficulty": "Hard",
          "questionType": "subjective"
        },
        {
          "id": "M-TRI-9",
          "text": "In ΔABC, DE ∥ BC with AD/DB = 3/2. If area of ΔADE is 27 cm^2, find area of trapezium DECB.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "M-TRI-10",
          "text": "Show that in a right triangle, if altitude is drawn to hypotenuse, then triangles on each side of altitude are similar to original triangle and to each other.",
          "marks": 4,
          "difficulty": "Hard",
          "questionType": "subjective"
        }
      ]
    },
    "coordinate_geometry": {
      "subject": "maths",
      "topicKey": "coordinate_geometry",
      "topicName": "Coordinate Geometry",
      "modes": {
        "speed_practice": {
          "targetCount": 10,
          "difficultyMix": {
            "Easy": 5,
            "Medium": 4,
            "Hard": 1
          }
        },
        "exam_mix": {
          "targetCount": 10,
          "difficultyMix": {
            "Easy": 3,
            "Medium": 5,
            "Hard": 2
          }
        }
      },
      "questions": [
        {
          "id": "M-CG-1",
          "text": "Find the distance between points (2, 3) and (8, 15).",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "M-CG-2",
          "text": "Find the coordinates of the midpoint of the line segment joining (−4, 5) and (6, −3).",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "M-CG-3",
          "text": "Using section formula, find the coordinates of point dividing the line segment joining (1, −2) and (5, 6) in ratio 1:3 internally.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "M-CG-4",
          "text": "Find the area of triangle with vertices (1, 1), (4, 5) and (7, 2).",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "M-CG-5",
          "text": "For what value of k are points (2, 3), (4, k) and (6, 7) collinear?",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "M-CG-6",
          "text": "The points A(2, 3), B(6, 7) and C(4, 5) form a triangle. Show that its area is zero.",
          "marks": 3,
          "difficulty": "Hard",
          "questionType": "subjective"
        },
        {
          "id": "M-CG-7",
          "text": "If A(1, 2), B(4, y) and C(7, 8) are collinear, find y.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "M-CG-8",
          "text": "A point P(x, 4) is equidistant from A(2, 3) and B(6, 7). Find x.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "M-CG-9",
          "text": "Find the coordinates of a point on x-axis which is equidistant from (−3, 4) and (5, −2).",
          "marks": 3,
          "difficulty": "Hard",
          "questionType": "subjective"
        },
        {
          "id": "M-CG-10",
          "text": "If vertices of a triangle are (0, 0), (a, 0) and (0, b), find its area and comment when a or b is zero.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        }
      ]
    },
    "introduction_to_trigonometry": {
      "subject": "maths",
      "topicKey": "introduction_to_trigonometry",
      "topicName": "Introduction to Trigonometry",
      "modes": {
        "speed_practice": {
          "targetCount": 10,
          "difficultyMix": {
            "Easy": 5,
            "Medium": 4,
            "Hard": 1
          }
        },
        "exam_mix": {
          "targetCount": 10,
          "difficultyMix": {
            "Easy": 3,
            "Medium": 5,
            "Hard": 2
          }
        }
      },
      "questions": [
        {
          "id": "M-TRIG-1",
          "text": "Write values of sin 30° and cos 60°.",
          "marks": 1,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "M-TRIG-2",
          "text": "If tan θ = 3/4 and θ is acute, find sin θ and cos θ.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "M-TRIG-3",
          "text": "Using identities, prove that sin²θ + cos²θ = 1.",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "M-TRIG-4",
          "text": "Evaluate: sin 30° cos 60° + cos 30° sin 60°.",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "M-TRIG-5",
          "text": "Show that sec²θ − tan²θ = 1 for all θ where both are defined.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "M-TRIG-6",
          "text": "If sin A = 5/13, A acute, find value of 2 tan A − 3 cot A.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "M-TRIG-7",
          "text": "Prove that cos(90° − A) = sin A and hence find cos 30° from table of sin values.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "M-TRIG-8",
          "text": "Simplify: (1 − sin θ)(1 + sin θ) / cos²θ.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "M-TRIG-9",
          "text": "If 3 tan A = 4, find values of (sin A − cos A) / (sin A + cos A).",
          "marks": 3,
          "difficulty": "Hard",
          "questionType": "subjective"
        },
        {
          "id": "M-TRIG-10",
          "text": "Without using calculator, evaluate: sin²30° + cos²45° + tan²45° − 2 sin 60° cos 30°.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        }
      ]
    },
    "applications_of_trigonometry": {
      "subject": "maths",
      "topicKey": "applications_of_trigonometry",
      "topicName": "Applications of Trigonometry",
      "modes": {
        "speed_practice": {
          "targetCount": 10,
          "difficultyMix": {
            "Easy": 5,
            "Medium": 4,
            "Hard": 1
          }
        },
        "exam_mix": {
          "targetCount": 10,
          "difficultyMix": {
            "Easy": 3,
            "Medium": 5,
            "Hard": 2
          }
        }
      },
      "questions": [
        {
          "id": "M-APPTRIG-1",
          "text": "Define angle of elevation with a neat statement.",
          "marks": 1,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "M-APPTRIG-2",
          "text": "A ladder 10 m long leans against a wall, making an angle of 60° with ground. Find height of wall reached.",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "M-APPTRIG-3",
          "text": "From the top of a 20 m tower, angle of depression of a car on ground is 30°. Find distance of car from tower base.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "M-APPTRIG-4",
          "text": "A flagstaff stands on top of a 15 m building. From a point on ground, angles of elevation of top of building and top of flagstaff are 30° and 45° respectively. Find height of flagstaff.",
          "marks": 4,
          "difficulty": "Hard",
          "questionType": "subjective"
        },
        {
          "id": "M-APPTRIG-5",
          "text": "The angle of elevation of top of a tower from a point A is 45°. On moving 10 m towards base, angle becomes 60°. Find height of tower.",
          "marks": 4,
          "difficulty": "Hard",
          "questionType": "subjective"
        },
        {
          "id": "M-APPTRIG-6",
          "text": "From a ship at sea, top of a lighthouse is seen at elevation 30°. If lighthouse is 50 m high, find distance of ship from lighthouse base.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "M-APPTRIG-7",
          "text": "At a point on level ground, angle of elevation of a vertical tower is 40°. On moving 20 m closer, angle becomes 60°. Find height of tower.",
          "marks": 4,
          "difficulty": "Hard",
          "questionType": "subjective"
        },
        {
          "id": "M-APPTRIG-8",
          "text": "The shadow of a tree is 10 m long when Sun’s elevation is 45°. Find height of tree.",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "M-APPTRIG-9",
          "text": "From the top of a building 24 m high, the angle of depression to a point on ground is 30°. Find horizontal distance to the point.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "M-APPTRIG-10",
          "text": "Two persons on opposite sides of a tower measure angles of elevation as 45° and 60°. If distance between them is 40 m, find height of tower.",
          "marks": 4,
          "difficulty": "Hard",
          "questionType": "subjective"
        }
      ]
    },
    "circles": {
      "subject": "maths",
      "topicKey": "circles",
      "topicName": "Circles",
      "modes": {
        "speed_practice": {
          "targetCount": 10,
          "difficultyMix": {
            "Easy": 5,
            "Medium": 4,
            "Hard": 1
          }
        },
        "exam_mix": {
          "targetCount": 10,
          "difficultyMix": {
            "Easy": 3,
            "Medium": 5,
            "Hard": 2
          }
        }
      },
      "questions": [
        {
          "id": "M-CIR-1",
          "text": "State the property of tangent to a circle at point of contact with radius.",
          "marks": 1,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "M-CIR-2",
          "text": "From an external point P, two tangents PA and PB are drawn to a circle with centre O. If PA = 8 cm, find PB.",
          "marks": 1,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "M-CIR-3",
          "text": "Prove that tangents drawn from external point to a circle are equal in length.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "M-CIR-4",
          "text": "In figure, PA and PB are tangents from external point P to circle with centre O. If ∠APB = 70°, find ∠AOB.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "M-CIR-5",
          "text": "From point P outside circle, two tangents are drawn touching circle at A and B. Prove that the quadrilateral PAOB is cyclic.",
          "marks": 4,
          "difficulty": "Hard",
          "questionType": "subjective"
        },
        {
          "id": "M-CIR-6",
          "text": "A tangent PT is drawn to circle from external point P, and secant PAB cuts circle at A and B. Prove that PT² = PA × PB.",
          "marks": 4,
          "difficulty": "Hard",
          "questionType": "subjective"
        },
        {
          "id": "M-CIR-7",
          "text": "Two concentric circles with common centre O have radii 5 cm and 3 cm. Find length of chord of larger circle which is tangent to smaller circle.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "M-CIR-8",
          "text": "If a circle touches all sides of a square, relate radius of circle to side of square.",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "M-CIR-9",
          "text": "Prove that the angle between two tangents drawn from an external point to circle is supplementary to angle subtended by line segment joining points of contact at centre.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "M-CIR-10",
          "text": "In a circle of radius 13 cm, a tangent is drawn from a point C at distance 15 cm from centre. Find length of tangent.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective"
        }
      ]
    },
    "constructions": {
      "subject": "maths",
      "topicKey": "constructions",
      "topicName": "Constructions",
      "modes": {
        "speed_practice": {
          "targetCount": 10,
          "difficultyMix": {
            "Easy": 5,
            "Medium": 4,
            "Hard": 1
          }
        },
        "exam_mix": {
          "targetCount": 10,
          "difficultyMix": {
            "Easy": 3,
            "Medium": 5,
            "Hard": 2
          }
        }
      },
      "questions": [
        {
          "id": "M-CONST-1",
          "text": "Construct a triangle ABC with BC = 6 cm, ∠B = 60° and ∠C = 45°. (Write only steps of construction.)",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "M-CONST-2",
          "text": "Construct a triangle similar to given ΔABC with scale factor 3/2. (Outline the method.)",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "M-CONST-3",
          "text": "Describe steps to divide a line segment AB of length 9 cm in ratio 4:5 internally.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "M-CONST-4",
          "text": "Construct a triangle with one side 7 cm and two angles 60° and 45°. (No need to draw here, just list steps.)",
          "marks": 3,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "M-CONST-5",
          "text": "How will you construct a triangle similar to given triangle with scale factor 2/3 using ray method? Explain briefly.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "M-CONST-6",
          "text": "Describe how to construct a tangent to a circle from a point outside it, using circle and triangle concept.",
          "marks": 4,
          "difficulty": "Hard",
          "questionType": "subjective"
        },
        {
          "id": "M-CONST-7",
          "text": "Explain the construction steps to draw perpendicular from a point outside a given line.",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "M-CONST-8",
          "text": "Explain why segments on ray for similar triangle construction must be equal in length.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "M-CONST-9",
          "text": "Outline how to construct angle of 75° using only compass and straightedge.",
          "marks": 2,
          "difficulty": "Hard",
          "questionType": "subjective"
        },
        {
          "id": "M-CONST-10",
          "text": "Explain steps to construct ΔABC given base, base angle and sum of other two sides.",
          "marks": 4,
          "difficulty": "Hard",
          "questionType": "subjective"
        }
      ]
    },
    "areas_related_to_circles": {
      "subject": "maths",
      "topicKey": "areas_related_to_circles",
      "topicName": "Areas Related to Circles",
      "modes": {
        "speed_practice": {
          "targetCount": 10,
          "difficultyMix": {
            "Easy": 5,
            "Medium": 4,
            "Hard": 1
          }
        },
        "exam_mix": {
          "targetCount": 10,
          "difficultyMix": {
            "Easy": 3,
            "Medium": 5,
            "Hard": 2
          }
        }
      },
      "questions": [
        {
          "id": "M-ARC-1",
          "text": "Find area of a circle of radius 7 cm (use π = 22/7).",
          "marks": 1,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "M-ARC-2",
          "text": "A circle has circumference 44 cm. Find its radius (π = 22/7).",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "M-ARC-3",
          "text": "Find area of a sector of circle of radius 6 cm and angle 60°.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "M-ARC-4",
          "text": "Find area of ring formed between two concentric circles of radii 7 cm and 14 cm.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "M-ARC-5",
          "text": "In a circle of radius 10 cm, find length of arc subtending central angle of 72°.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "M-ARC-6",
          "text": "A square of side 14 cm is inscribed in a circle. Find area of circle not covered by square.",
          "marks": 4,
          "difficulty": "Hard",
          "questionType": "subjective"
        },
        {
          "id": "M-ARC-7",
          "text": "Four equal circles of radius 3.5 cm touch each other in a square pattern. Find area of region between them inside square touching their centres.",
          "marks": 4,
          "difficulty": "Hard",
          "questionType": "subjective"
        },
        {
          "id": "M-ARC-8",
          "text": "A horse is tied to a rope of length 7 m at corner of rectangular field so that it can graze in quarter-circle. Find grazing area.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "M-ARC-9",
          "text": "In a semicircle of radius r, find area enclosed by diameter and arc.",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "M-ARC-10",
          "text": "A circular park has radius 20 m. A path of uniform width 2 m runs around inside. Find area of path.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        }
      ]
    },
    "surface_areas_volumes": {
      "subject": "maths",
      "topicKey": "surface_areas_volumes",
      "topicName": "Surface Areas and Volumes",
      "modes": {
        "speed_practice": {
          "targetCount": 10,
          "difficultyMix": {
            "Easy": 5,
            "Medium": 4,
            "Hard": 1
          }
        },
        "exam_mix": {
          "targetCount": 10,
          "difficultyMix": {
            "Easy": 3,
            "Medium": 5,
            "Hard": 2
          }
        }
      },
      "questions": [
        {
          "id": "M-SAV-1",
          "text": "Find total surface area of a cube of edge 5 cm.",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "M-SAV-2",
          "text": "A cuboid has dimensions 4 cm × 5 cm × 10 cm. Find its volume.",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "M-SAV-3",
          "text": "Find curved surface area of cylinder of radius 7 cm and height 10 cm (π = 22/7).",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "M-SAV-4",
          "text": "A cone has radius 3.5 cm and slant height 10 cm. Find its curved surface area.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "M-SAV-5",
          "text": "A cylindrical pipe has internal radius 3 cm, height 21 cm. Find volume of water it can hold.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "M-SAV-6",
          "text": "A solid cylinder of radius 7 cm and height 10 cm is melted and recast into spheres of radius 7 cm. Find number of spheres formed.",
          "marks": 4,
          "difficulty": "Hard",
          "questionType": "subjective"
        },
        {
          "id": "M-SAV-7",
          "text": "Find volume of sphere whose diameter is 14 cm.",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "M-SAV-8",
          "text": "A cone and cylinder have same base radius and height. If volume of cylinder is 300 cm³, find volume of cone.",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "M-SAV-9",
          "text": "A solid hemisphere is placed on top of a solid cylinder of same radius 3 cm and height 7 cm. Find total surface area of solid.",
          "marks": 4,
          "difficulty": "Hard",
          "questionType": "subjective"
        },
        {
          "id": "M-SAV-10",
          "text": "Rainwater from a roof of 22 m × 20 m drains into cylindrical tank of radius 4 m. If rainfall is 2.5 cm, find rise in water level in tank.",
          "marks": 4,
          "difficulty": "Medium",
          "questionType": "subjective"
        }
      ]
    },
    "statistics": {
      "subject": "maths",
      "topicKey": "statistics",
      "topicName": "Statistics",
      "modes": {
        "speed_practice": {
          "targetCount": 10,
          "difficultyMix": {
            "Easy": 5,
            "Medium": 4,
            "Hard": 1
          }
        },
        "exam_mix": {
          "targetCount": 10,
          "difficultyMix": {
            "Easy": 3,
            "Medium": 5,
            "Hard": 2
          }
        }
      },
      "questions": [
        {
          "id": "M-STAT-1",
          "text": "Define mean of ungrouped data and write its formula.",
          "marks": 1,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "M-STAT-2",
          "text": "Find mean of data: 6, 8, 10, 14, 12.",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "M-STAT-3",
          "text": "Explain what is meant by ‘class interval’ and ‘class mark’ in grouped data.",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "M-STAT-4",
          "text": "The mean of 8 numbers is 15. If two numbers 10 and 17 are added, find new mean.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "M-STAT-5",
          "text": "In a frequency distribution of marks, explain how you would find modal class.",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "M-STAT-6",
          "text": "From grouped frequency table, describe steps to calculate median of data.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "M-STAT-7",
          "text": "A data set has mode 20 and mean greater than median. Comment on skewness (just direction).",
          "marks": 2,
          "difficulty": "Hard",
          "questionType": "subjective"
        },
        {
          "id": "M-STAT-8",
          "text": "The following table shows class intervals and frequencies. State which measure of central tendency (mean/median/mode) is best for quick estimate and why.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "M-STAT-9",
          "text": "Discuss one advantage and one disadvantage of using mean as central tendency for data with extreme values.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "M-STAT-10",
          "text": "Explain briefly how ogives are used to find median graphically.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        }
      ]
    },
    "probability": {
      "subject": "maths",
      "topicKey": "probability",
      "topicName": "Probability",
      "modes": {
        "speed_practice": {
          "targetCount": 10,
          "difficultyMix": {
            "Easy": 5,
            "Medium": 4,
            "Hard": 1
          }
        },
        "exam_mix": {
          "targetCount": 10,
          "difficultyMix": {
            "Easy": 3,
            "Medium": 5,
            "Hard": 2
          }
        }
      },
      "questions": [
        {
          "id": "M-PROB-1",
          "text": "Define theoretical probability of an event.",
          "marks": 1,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "M-PROB-2",
          "text": "A coin is tossed once. What is probability of getting a tail?",
          "marks": 1,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "M-PROB-3",
          "text": "Find probability of getting an even number when a fair die is rolled.",
          "marks": 1,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "M-PROB-4",
          "text": "A bag contains 3 red and 5 blue balls. One ball drawn at random. Find probability that it is red.",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "M-PROB-5",
          "text": "A card drawn from a well-shuffled deck of 52 cards. Find probability of getting (i) a heart, (ii) a king.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "M-PROB-6",
          "text": "A die is thrown once. Find probability of getting a number greater than 4.",
          "marks": 1,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "M-PROB-7",
          "text": "If P(E) = 0.37, find P(not E).",
          "marks": 1,
          "difficulty": "Easy",
          "questionType": "subjective"
        },
        {
          "id": "M-PROB-8",
          "text": "Two dice are tossed once. Find probability of getting sum equal to 9.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "M-PROB-9",
          "text": "For a game, probability of winning is 0.3. If player plays 10 times, how many wins are expected on average?",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective"
        },
        {
          "id": "M-PROB-10",
          "text": "Event A is certain to happen and event B is impossible. What are P(A) and P(B)?",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective"
        }
      ]
    }
  }
}
;

// Alias + expansion for weak-topic drill demand:
// canonical topic key `trigonometry` should have a dense question bank so
// students can request high counts for focused weakness repair.
{
  const intro = promptDPracticePacks.maths.introduction_to_trigonometry?.questions || [];
  const applications = promptDPracticePacks.maths.applications_of_trigonometry?.questions || [];
  const seed = [...intro, ...applications];
  const expanded = [...seed];
  for (let i = 0; i < seed.length; i++) {
    const q = seed[i];
    expanded.push({
      ...q,
      id: `${String(q.id || `TRIG-${i + 1}`)}-D2`,
      text: `${String(q.text || "").trim()} (Drill variant)`,
    });
  }

  promptDPracticePacks.maths.trigonometry = {
    subject: "maths",
    topicKey: "trigonometry",
    topicName: "Trigonometry",
    modes: {
      speed_practice: {
        targetCount: 20,
        difficultyMix: { Easy: 8, Medium: 8, Hard: 4 },
      },
      exam_mix: {
        targetCount: 20,
        difficultyMix: { Easy: 6, Medium: 10, Hard: 4 },
      },
      weak_topic_recovery: {
        targetCount: 40,
        difficultyMix: { Easy: 12, Medium: 18, Hard: 10 },
      },
    },
    questions: expanded.slice(0, 40),
  };
}

// Backwards compatibility: re-export promptDPracticePacks under the original name
// used by the practice engine.  This alias allows existing imports of
// `practicePacks` to continue working without modification.
export const practicePacks = promptDPracticePacks;
