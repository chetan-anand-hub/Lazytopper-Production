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
  // BANK-FIX-1 PR-2: model answer + CBSE step-mark scheme ("[N mark] ..." steps summing to `marks`).
  answer?: string;
  finalAnswer?: string;
  solutionSteps?: string[];
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
          "questionType": "subjective",
          "answer": "Rusting is the slow oxidation of iron by oxygen in the presence of moisture, forming hydrated iron(III) oxide (rust): 4Fe(s) + 3O2(g) + 2xH2O(l) → 2Fe2O3·xH2O(s).",
          "finalAnswer": "4Fe + 3O2 + 2xH2O → 2Fe2O3·xH2O (rust)",
          "solutionSteps": [
            "[1 mark] Correct reactants and product: iron + oxygen + water → hydrated iron(III) oxide, Fe2O3·xH2O; Balanced equation: 4Fe(s) + 3O2(g) + 2xH2O(l) → 2Fe2O3·xH2O(s)"
          ]
        },
        {
          "id": "S-CHEM-2",
          "text": "Define a combination reaction with one example (balanced).",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective",
          "answer": "A combination reaction is one in which two or more reactants combine to form a single product. Example: CaO(s) + H2O(l) → Ca(OH)2(aq) + heat (quicklime + water → slaked lime). Another: 2H2(g) + O2(g) → 2H2O(l).",
          "finalAnswer": "Two or more reactants form a single product; e.g. CaO + H2O → Ca(OH)2",
          "solutionSteps": [
            "[1 mark] Definition: a reaction in which two or more reactants combine to form a single product.",
            "[0.5 mark] Example with correct reactants and product: calcium oxide + water → calcium hydroxide.",
            "[0.5 mark] Balanced equation with state symbols: CaO(s) + H2O(l) → Ca(OH)2(aq) + heat."
          ]
        },
        {
          "id": "S-CHEM-3",
          "text": "Balance the equation: Fe + H2O → Fe3O4 + H2.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "Unbalanced: Fe + H2O → Fe3O4 + H2. Balance Fe: 3 Fe atoms on the right, so take 3Fe. Balance O: 4 O atoms in Fe3O4, so take 4H2O. Then 8 H atoms on the left, so take 4H2. Balanced equation: 3Fe(s) + 4H2O(g) → Fe3O4(s) + 4H2(g).",
          "finalAnswer": "3Fe + 4H2O → Fe3O4 + 4H2",
          "solutionSteps": [
            "[1 mark] Balance Fe and O: 3Fe on the left (3 Fe in Fe3O4) and 4H2O on the left (4 O in Fe3O4).",
            "[1 mark] Balance H with 4H2 on the right: 3Fe(s) + 4H2O(g) → Fe3O4(s) + 4H2(g)."
          ]
        },
        {
          "id": "S-CHEM-4",
          "text": "What is a redox reaction? Give one example each of oxidation and reduction in the same reaction.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "A redox reaction is one in which oxidation and reduction take place simultaneously — one reactant gains oxygen/loses hydrogen (is oxidised) while the other loses oxygen/gains hydrogen (is reduced). Example: CuO + H₂ → Cu + H₂O (on heating). Here CuO loses oxygen and is reduced to Cu, while H₂ gains oxygen and is oxidised to H₂O.",
          "finalAnswer": "Oxidation and reduction occurring together; e.g. CuO + H₂ → Cu + H₂O (CuO reduced, H₂ oxidised)",
          "solutionSteps": [
            "[1 mark] Definition: a reaction in which one substance is oxidised (gains oxygen / loses hydrogen) and another is reduced (loses oxygen / gains hydrogen) simultaneously.",
            "[1 mark] Example: CuO + H₂ → Cu + H₂O (heat); CuO is reduced to Cu and H₂ is oxidised to H₂O."
          ]
        },
        {
          "id": "S-CHEM-6",
          "text": "Classify the reaction CaCO3 → CaO + CO2 and write one more example of same type.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "CaCO3(s) --heat--> CaO(s) + CO2(g) is a thermal decomposition reaction: a single reactant (calcium carbonate) breaks down on heating into two simpler products (calcium oxide/quicklime and carbon dioxide). Another example of the same type: 2FeSO4(s) --heat--> Fe2O3(s) + SO2(g) + SO3(g).",
          "finalAnswer": "Thermal decomposition; e.g. 2FeSO4 → Fe2O3 + SO2 + SO3 (on heating)",
          "solutionSteps": [
            "[1 mark] Classification: thermal decomposition reaction — one reactant breaks down on heating into simpler products (CaO and CO2).",
            "[1 mark] Another example: 2FeSO4(s) --heat--> Fe2O3(s) + SO2(g) + SO3(g) (or 2Pb(NO3)2 → 2PbO + 4NO2 + O2 on heating)."
          ]
        },
        {
          "id": "S-CHEM-7",
          "text": "What is corrosion? Explain with example and write one method to prevent it.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "Corrosion is the slow eating away (deterioration) of a metal when its surface is attacked by air, moisture, acids or other substances around it. Example: iron, when exposed to moist air, gets coated with a reddish-brown flaky substance called rust (hydrated iron(III) oxide, Fe2O3·xH2O); similarly silver turns black (silver sulphide) and copper acquires a green coating (basic copper carbonate). Prevention: painting, oiling/greasing, galvanisation (coating iron with zinc), chrome plating or alloying.",
          "finalAnswer": "Corrosion = gradual destruction of metal by air/moisture/chemicals; e.g. rusting of iron; prevented by painting/galvanisation",
          "solutionSteps": [
            "[1 mark] Definition: corrosion is the slow deterioration of a metal when it is attacked by air, moisture, acids etc. around it.",
            "[1 mark] Example: iron in moist air forms reddish-brown rust (Fe2O3·xH2O) (or silver turns black, copper turns green).",
            "[1 mark] One method of prevention: painting / oiling / galvanisation (zinc coating) / chrome plating / alloying."
          ]
        },
        {
          "id": "S-CHEM-8",
          "text": "Explain with a suitable example how precipitation reaction leads to formation of an insoluble salt.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "A precipitation reaction is a double displacement reaction in which two soluble salts exchange ions and one of the products is an insoluble salt that separates out as a solid (precipitate). Example: when aqueous sodium sulphate is mixed with aqueous barium chloride, a white precipitate of barium sulphate forms: Na2SO4(aq) + BaCl2(aq) → BaSO4(s)↓ + 2NaCl(aq). Ba²⁺ and SO4²⁻ ions combine to form BaSO4, which is insoluble in water and settles as a white precipitate, while NaCl stays in solution.",
          "finalAnswer": "Na2SO4(aq) + BaCl2(aq) → BaSO4(s)↓ (white ppt) + 2NaCl(aq)",
          "solutionSteps": [
            "[1 mark] Definition: a double displacement reaction in which ions are exchanged between two soluble salts and an insoluble product (precipitate) is formed.",
            "[1 mark] Example with balanced equation: Na2SO4(aq) + BaCl2(aq) → BaSO4(s)↓ + 2NaCl(aq).",
            "[1 mark] Explanation: Ba²⁺ and SO4²⁻ combine to form insoluble BaSO4, which separates as a white precipitate; NaCl remains dissolved."
          ]
        },
        {
          "id": "S-CHEM-9",
          "text": "A substance X (calcium oxide), used in the preparation of whitewash, reacts vigorously with water. Name X and write its formula; write the reaction of X with water.",
          "marks": 3,
          "difficulty": "Hard",
          "questionType": "subjective",
          "answer": "X is calcium oxide (quick lime), formula CaO. It reacts vigorously with water to form slaked lime (calcium hydroxide), releasing a large amount of heat: CaO(s) + H2O(l) → Ca(OH)2(aq) + heat. This is a combination reaction and is exothermic.",
          "finalAnswer": "X = calcium oxide (quick lime), CaO; CaO + H2O → Ca(OH)2 + heat",
          "solutionSteps": [
            "[1 mark] Name and formula of X: calcium oxide (quick lime), CaO.",
            "[1 mark] Balanced equation: CaO(s) + H2O(l) → Ca(OH)2(aq) (slaked lime) + heat.",
            "[1 mark] The reaction is a combination reaction and is exothermic (heat is released)."
          ]
        },
        {
          "id": "S-CHEM-10",
          "text": "Write balanced equations for: (a) displacement reaction of zinc with copper sulphate, (b) a neutralisation reaction.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "(a) Zinc is more reactive than copper, so it displaces copper from copper sulphate solution: Zn(s) + CuSO4(aq) → ZnSO4(aq) + Cu(s). The blue colour of the solution fades and reddish-brown copper is deposited on zinc.\n(b) Neutralisation (acid + base → salt + water): NaOH(aq) + HCl(aq) → NaCl(aq) + H2O(l).",
          "finalAnswer": "(a) Zn + CuSO4 → ZnSO4 + Cu; (b) NaOH + HCl → NaCl + H2O",
          "solutionSteps": [
            "[1 mark] (a) Displacement: Zn(s) + CuSO4(aq) → ZnSO4(aq) + Cu(s) (balanced)",
            "[1 mark] (b) Neutralisation: NaOH(aq) + HCl(aq) → NaCl(aq) + H2O(l) (balanced)",
            "[1 mark] Correct state symbols and identification: Zn being more reactive displaces Cu; acid + base gives salt + water"
          ]
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
          "questionType": "subjective",
          "answer": "A neutral solution (e.g. pure water) at 25°C has [H⁺] = [OH⁻], so its pH is 7.",
          "finalAnswer": "pH = 7",
          "solutionSteps": [
            "[1 mark] A neutral solution has equal H⁺ and OH⁻ ion concentration; its pH at 25°C is 7."
          ]
        },
        {
          "id": "S-ABS-2",
          "text": "Name the acid present in vinegar and write its formula.",
          "marks": 1,
          "difficulty": "Easy",
          "questionType": "subjective",
          "answer": "Vinegar contains acetic acid (ethanoic acid), CH3COOH.",
          "finalAnswer": "Acetic (ethanoic) acid, CH3COOH",
          "solutionSteps": [
            "[1 mark] Acid: acetic acid (ethanoic acid); Formula: CH3COOH"
          ]
        },
        {
          "id": "S-ABS-3",
          "text": "Define universal indicator. How is it different from litmus?",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "Universal indicator is a mixture of several indicators that shows different colours at different pH values (concentrations of H+ ions) of a solution. Difference: litmus only tells whether a solution is acidic (blue litmus turns red) or basic (red litmus turns blue), whereas universal indicator also indicates the strength of the acid or base, i.e. the approximate pH (0–14), by a range of colours.",
          "finalAnswer": "Mixture of indicators showing different colours at different pH; gives strength (pH), litmus only acid/base",
          "solutionSteps": [
            "[1 mark] Definition: universal indicator is a mixture of several indicators that shows different colours at different pH values.",
            "[1 mark] Difference: litmus shows only whether a solution is acidic or basic; universal indicator also shows the strength (approximate pH) of the acid or base."
          ]
        },
        {
          "id": "S-ABS-4",
          "text": "Explain why tooth enamel gets damaged when pH in mouth falls below 5.5.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "Bacteria in the mouth break down sugar and food particles left after eating and produce acids, which lower the pH in the mouth. Tooth enamel is made of calcium hydroxyapatite (calcium phosphate), the hardest substance in the body. It does not dissolve in water, but it is corroded when the pH falls below 5.5. Using a basic toothpaste neutralises the excess acid and prevents tooth decay.",
          "finalAnswer": "Acids from bacterial breakdown of sugar lower pH below 5.5 and corrode the calcium phosphate (enamel)",
          "solutionSteps": [
            "[1 mark] Bacteria degrade sugar/food particles left in the mouth to produce acids, lowering the pH below 5.5.",
            "[1 mark] Enamel (calcium hydroxyapatite/calcium phosphate) gets corroded at pH below 5.5, causing tooth decay; a basic toothpaste neutralises the acid."
          ]
        },
        {
          "id": "S-ABS-5",
          "text": "Write chemical formula and one use each of baking soda and washing soda.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "Baking soda: sodium hydrogencarbonate, NaHCO₃ — used as an antacid to neutralise excess acid in the stomach (also in baking powder for making cakes soft and spongy). Washing soda: sodium carbonate decahydrate, Na₂CO₃·10H₂O — used to remove permanent hardness of water (also in glass, soap and paper industries, and as a cleaning agent).",
          "finalAnswer": "NaHCO₃ (antacid / baking powder); Na₂CO₃·10H₂O (removing permanent hardness of water / cleaning)",
          "solutionSteps": [
            "[1 mark] Baking soda: NaHCO₃ (sodium hydrogencarbonate); washing soda: Na₂CO₃·10H₂O (sodium carbonate decahydrate) — 0.5 mark each.",
            "[1 mark] Use of baking soda: antacid to neutralise excess stomach acid, or ingredient of baking powder.",
            "[1 mark] Use of washing soda: removing permanent hardness of water, or in glass/soap/paper industries, or as cleaning agent."
          ]
        },
        {
          "id": "S-ABS-6",
          "text": "What is Plaster of Paris? Write its chemical name and one important use.",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective",
          "answer": "Plaster of Paris is a white powder obtained by heating gypsum (CaSO4·2H2O) at 373 K: CaSO4·2H2O → CaSO4·½H2O + 1½H2O. Its chemical name is calcium sulphate hemihydrate (CaSO4·½H2O). Use: for supporting/setting fractured bones in the right position (also making toys, decorative materials, smoothing surfaces).",
          "finalAnswer": "Calcium sulphate hemihydrate, CaSO4·½H2O; used for plastering fractured bones",
          "solutionSteps": [
            "[1 mark] Plaster of Paris is obtained by heating gypsum at 373 K; chemical name calcium sulphate hemihydrate, CaSO4·½H2O.",
            "[1 mark] Use: for supporting fractured bones in the right position (or making toys/decorative materials/smoothing walls)."
          ]
        },
        {
          "id": "S-ABS-7",
          "text": "A solution turns red litmus blue. Identify the type of solution and give one example.",
          "marks": 1,
          "difficulty": "Easy",
          "questionType": "subjective",
          "answer": "A solution that turns red litmus blue is basic (alkaline). Example: sodium hydroxide (NaOH) solution (or lime water, Ca(OH)2).",
          "finalAnswer": "Basic (alkaline) solution, e.g. NaOH",
          "solutionSteps": [
            "[1 mark] The solution is basic (alkaline); example: NaOH solution / lime water."
          ]
        },
        {
          "id": "S-ABS-8",
          "text": "Explain with equation how an acid reacts with a metal carbonate.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "Acids react with metal carbonates to give a salt, carbon dioxide and water. Metal carbonate + Acid → Salt + Carbon dioxide + Water. Example: Na2CO3(s) + 2HCl(aq) → 2NaCl(aq) + H2O(l) + CO2(g). The CO2 evolved (brisk effervescence) turns lime water milky: Ca(OH)2 + CO2 → CaCO3 + H2O.",
          "finalAnswer": "Salt + CO2 + H2O; e.g. Na2CO3 + 2HCl → 2NaCl + H2O + CO2",
          "solutionSteps": [
            "[1 mark] Statement: metal carbonate + acid → salt + carbon dioxide + water (CO2 gas evolved with effervescence, turns lime water milky).",
            "[1 mark] Balanced equation: Na2CO3(s) + 2HCl(aq) → 2NaCl(aq) + H2O(l) + CO2(g)."
          ]
        },
        {
          "id": "S-ABS-9",
          "text": "Give reason: Farmers often add quicklime or slaked lime to acidic soil.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "Quicklime (CaO) and slaked lime [Ca(OH)2] are bases. Acidic soil (pH too low) is not suitable for the growth of most crops. Adding these bases neutralises the excess acid in the soil, raising the pH to near neutral, which is favourable for plant growth.",
          "finalAnswer": "They are bases that neutralise excess acidity of soil",
          "solutionSteps": [
            "[1 mark] Quicklime/slaked lime are basic in nature; most plants need soil pH near neutral and do not grow well in acidic soil.",
            "[1 mark] The base neutralises the excess acid in soil (neutralisation), raising soil pH and making it suitable for crops."
          ]
        },
        {
          "id": "S-ABS-10",
          "text": "Describe the preparation of washing soda from baking soda with balanced chemical equations.",
          "marks": 3,
          "difficulty": "Hard",
          "questionType": "subjective",
          "answer": "Step 1: Baking soda (sodium hydrogencarbonate) is heated; it decomposes to give sodium carbonate, water and carbon dioxide:\n2NaHCO3(s) →(heat) Na2CO3(s) + H2O(l) + CO2(g).\nStep 2: The anhydrous sodium carbonate obtained is dissolved in water and recrystallised to get washing soda (sodium carbonate decahydrate):\nNa2CO3 + 10H2O → Na2CO3·10H2O.",
          "finalAnswer": "Heat NaHCO3 to get Na2CO3, then recrystallise: Na2CO3·10H2O (washing soda)",
          "solutionSteps": [
            "[1 mark] Heating baking soda (NaHCO3) decomposes it into sodium carbonate, water and CO2",
            "[1 mark] Balanced equation: 2NaHCO3 →(heat) Na2CO3 + H2O + CO2",
            "[1 mark] Recrystallisation: Na2CO3 + 10H2O → Na2CO3·10H2O (washing soda)"
          ]
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
          "questionType": "subjective",
          "answer": "(i) Metals are lustrous (have a shining surface). (ii) Metals are malleable and ductile, and are good conductors of heat and electricity (any two).",
          "finalAnswer": "Lustrous; malleable/ductile; good conductors of heat and electricity (any two)",
          "solutionSteps": [
            "[1 mark] Any two correct physical properties, e.g. metallic lustre, malleability, ductility, good conductor of heat and electricity, sonorous, high melting point (0.5 mark each)."
          ]
        },
        {
          "id": "S-MNM-2",
          "text": "Why is sodium stored in kerosene?",
          "marks": 1,
          "difficulty": "Easy",
          "questionType": "subjective",
          "answer": "Sodium is a highly reactive metal; it reacts vigorously with oxygen and moisture in air and catches fire. To prevent this, it is stored immersed in kerosene, with which it does not react and which keeps air and moisture away.",
          "finalAnswer": "Highly reactive; kerosene keeps air and moisture away to prevent reaction/fire",
          "solutionSteps": [
            "[1 mark] Sodium reacts vigorously with oxygen and moisture of air (can catch fire), so it is kept immersed in kerosene, which does not react with it and cuts off air and moisture."
          ]
        },
        {
          "id": "S-MNM-3",
          "text": "Define corrosion and give its one harmful effect.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "Corrosion is the process in which a metal is slowly eaten up/damaged by the action of air, moisture or chemicals (such as acids) on its surface, e.g. rusting of iron (formation of hydrated iron(III) oxide, Fe2O3·xH2O). Harmful effect: rusting weakens iron structures such as bridges, railings, ships and car bodies, causing huge economic loss every year (and replacement costs).",
          "finalAnswer": "Gradual damage of a metal by air, moisture or chemicals; e.g. rusting weakens iron bridges/structures",
          "solutionSteps": [
            "[1 mark] Definition: corrosion is the slow eating away of a metal by the action of air, moisture or chemicals on its surface (e.g. rusting of iron).",
            "[1 mark] One harmful effect: it weakens metal structures such as iron bridges, ships, railings and car bodies, causing huge economic loss."
          ]
        },
        {
          "id": "S-MNM-4",
          "text": "What is an alloy? Give one example with its use.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "An alloy is a homogeneous mixture of two or more metals, or of a metal and a non-metal. Example: Brass, an alloy of copper and zinc, is used to make utensils, decorative items and electrical fittings. (Other examples: stainless steel (iron, nickel, chromium) for utensils; solder (lead, tin) for welding electrical wires.)",
          "finalAnswer": "Homogeneous mixture of metals (or metal + non-metal), e.g. brass (Cu + Zn) for utensils",
          "solutionSteps": [
            "[1 mark] Definition: an alloy is a homogeneous mixture of two or more metals, or a metal and a non-metal.",
            "[1 mark] Example with use: brass (copper + zinc), used for utensils/decorative articles (or solder for welding electrical wires, etc.)."
          ]
        },
        {
          "id": "S-MNM-5",
          "text": "Explain with example how a more reactive metal displaces a less reactive metal from its salt solution.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "In a displacement reaction, a more reactive metal loses electrons more readily and so pushes out a less reactive metal from the solution of its salt. Example: when an iron nail is dipped in copper sulphate solution, Fe + CuSO₄(aq) → FeSO₄(aq) + Cu(s). The blue colour of the solution fades to pale green and a reddish-brown coating of copper forms on the nail, because iron is more reactive than copper.",
          "finalAnswer": "Fe + CuSO₄ → FeSO₄ + Cu (iron displaces copper)",
          "solutionSteps": [
            "[1 mark] Explanation: a more reactive metal (higher in the reactivity series) displaces a less reactive metal from its salt solution.",
            "[1 mark] Example with equation: Fe + CuSO₄(aq) → FeSO₄(aq) + Cu(s); blue solution turns pale green, reddish-brown copper deposits on iron."
          ]
        },
        {
          "id": "S-MNM-6",
          "text": "Name the ore of aluminium and write the name of the process used for its extraction.",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective",
          "answer": "The chief ore of aluminium is bauxite (Al2O3·2H2O). Aluminium is highly reactive, so it is extracted by electrolytic reduction (electrolysis) of its molten oxide (alumina).",
          "finalAnswer": "Bauxite; electrolytic reduction",
          "solutionSteps": [
            "[1 mark] Ore of aluminium: bauxite (Al2O3·2H2O).",
            "[1 mark] Process: electrolytic reduction of molten alumina (aluminium is too reactive to be reduced by carbon)."
          ]
        },
        {
          "id": "S-MNM-7",
          "text": "Describe the conditions necessary for rusting of iron and write one method to prevent it.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "Rusting of iron requires both air (oxygen) and water (moisture) to be present together; iron does not rust in dry air or in boiled water (free of dissolved air) kept under an oil layer. Rust is hydrated iron(III) oxide, Fe2O3·xH2O. Prevention: galvanisation — coating iron with a layer of zinc (also painting, oiling, greasing, chrome plating, alloying).",
          "finalAnswer": "Both air (oxygen) and moisture (water) needed; prevent by galvanisation/painting",
          "solutionSteps": [
            "[1 mark] Rusting needs the presence of air (oxygen).",
            "[1 mark] Rusting also needs water/moisture — both must be present together (no rusting in dry air or air-free water).",
            "[1 mark] One method of prevention: galvanisation (zinc coating) / painting / oiling / greasing / alloying."
          ]
        },
        {
          "id": "S-MNM-8",
          "text": "Explain why copper does not react with dilute acids like HCl under ordinary conditions.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "Copper is less reactive than hydrogen; it lies below hydrogen in the reactivity series. Metals react with dilute acids by displacing hydrogen from the acid. Since copper is less reactive than hydrogen, it cannot displace hydrogen from dilute HCl, so no reaction occurs and no hydrogen gas is evolved.",
          "finalAnswer": "Copper is below hydrogen in the reactivity series, so it cannot displace hydrogen from dilute acids.",
          "solutionSteps": [
            "[1 mark] Copper is less reactive than hydrogen (placed below hydrogen in the reactivity series).",
            "[1 mark] Hence it cannot displace hydrogen from dilute HCl, so no reaction/no H2 gas is produced."
          ]
        },
        {
          "id": "S-MNM-9",
          "text": "List any three differences between metals and non-metals based on their properties.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "(i) Lustre: metals have metallic lustre (shiny), non-metals are generally dull (except iodine, graphite). (ii) Malleability and ductility: metals are malleable and ductile; non-metals are brittle (solids) and non-ductile. (iii) Conductivity: metals are good conductors of heat and electricity; non-metals are poor conductors (except graphite). (Also: metals form basic oxides, non-metals form acidic or neutral oxides; metals are generally solids with high melting points.)",
          "finalAnswer": "Lustre, malleability/ductility, conductivity (any three valid differences)",
          "solutionSteps": [
            "[1 mark] Metals are lustrous; non-metals are generally dull (exception: iodine/graphite).",
            "[1 mark] Metals are malleable and ductile; solid non-metals are brittle.",
            "[1 mark] Metals are good conductors of heat and electricity; non-metals are poor conductors (exception: graphite). (Any other valid difference, e.g. basic vs acidic oxides, also accepted.)"
          ]
        },
        {
          "id": "S-MNM-10",
          "text": "Explain the term ‘electrolytic refining’ of metals with one example.",
          "marks": 3,
          "difficulty": "Hard",
          "questionType": "subjective",
          "answer": "Electrolytic refining is the method of purifying an impure metal by electrolysis. The impure metal is made the anode, a thin strip of the pure metal is made the cathode, and a solution of a soluble salt of the same metal is used as the electrolyte. On passing current, the pure metal from the anode dissolves into the electrolyte and an equivalent amount of pure metal from the electrolyte is deposited on the cathode. Soluble impurities go into the solution, while insoluble impurities settle at the bottom of the anode as anode mud.\nExample: Refining of copper — anode: impure copper; cathode: thin strip of pure copper; electrolyte: acidified copper sulphate solution. Anode: Cu → Cu²⁺ + 2e⁻; Cathode: Cu²⁺ + 2e⁻ → Cu.",
          "finalAnswer": "Purification of impure metal by electrolysis, e.g. copper with acidified CuSO4",
          "solutionSteps": [
            "[1 mark] Definition: purification of an impure metal by electrolysis",
            "[1 mark] Set-up and process: impure metal as anode, thin strip of pure metal as cathode, soluble salt of the metal as electrolyte; pure metal deposits on cathode, insoluble impurities collect as anode mud",
            "[1 mark] Example: copper — impure Cu anode, pure Cu cathode, acidified CuSO4 electrolyte"
          ]
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
          "questionType": "subjective",
          "answer": "The valency of carbon is 4 (atomic number 6, electronic configuration 2, 4; it has 4 valence electrons). Carbon cannot easily gain 4 electrons to form C⁴⁻ (six protons cannot hold ten electrons) nor lose 4 electrons to form C⁴⁺ (requires a very large amount of energy). Hence it attains the noble gas configuration by sharing its four valence electrons with other atoms, i.e. it forms covalent bonds.",
          "finalAnswer": "Valency 4; it shares electrons because gaining or losing 4 electrons is energetically difficult",
          "solutionSteps": [
            "[1 mark] Valency of carbon = 4 (configuration 2, 4; four valence electrons).",
            "[1 mark] Gaining 4 electrons (C⁴⁻) or losing 4 electrons (C⁴⁺) is energetically unfavourable, so carbon shares its electrons and forms covalent bonds."
          ]
        },
        {
          "id": "S-CARB-2",
          "text": "Define homologous series. Give its two characteristics.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "A homologous series is a series of carbon compounds having the same functional group and similar chemical properties, in which successive members differ by a –CH2– unit. Characteristics: (i) successive members differ by –CH2– (molecular mass difference of 14 u); (ii) all members have the same general formula and similar chemical properties, while physical properties (melting point, boiling point) change gradually with increasing molecular mass.",
          "finalAnswer": "Series of compounds with same functional group, successive members differing by –CH2–",
          "solutionSteps": [
            "[1 mark] Definition: series of carbon compounds with the same functional group/general formula and similar chemical properties, successive members differing by a –CH2– unit",
            "[1 mark] Two characteristics (0.5 each): e.g. successive members differ by 14 u; same general formula and similar chemical properties; gradual gradation in physical properties"
          ]
        },
        {
          "id": "S-CARB-3",
          "text": "Draw the electron dot structure of methane (CH4).",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "In methane (CH4), carbon (atomic number 6, electronic configuration 2,4) has 4 valence electrons and each hydrogen has 1 valence electron. Carbon shares its four valence electrons with four hydrogen atoms, forming four C–H single covalent bonds (each a shared pair). Electron dot structure: C at the centre, with one H on each of the four sides (top, bottom, left, right); between C and each H is drawn one shared pair — one dot (carbon's electron) and one cross (hydrogen's electron). Thus carbon attains an octet and each hydrogen attains a duplet. Structural formula: H–C(–H)(–H)–H.",
          "finalAnswer": "C in centre sharing one electron pair with each of 4 H atoms (4 C–H single covalent bonds)",
          "solutionSteps": [
            "[1 mark] Diagram: carbon at the centre with four hydrogen atoms around it, each C–H bond shown as one shared pair of electrons (one dot from C, one cross from H).",
            "[1 mark] Diagram accuracy: total 4 shared pairs (8 electrons around C — octet; 2 around each H — duplet), showing four single covalent bonds."
          ]
        },
        {
          "id": "S-CARB-4",
          "text": "What is the functional group in ethanol? Write its structural formula.",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective",
          "answer": "The functional group in ethanol is the alcohol (hydroxyl) group, –OH. Molecular formula C2H5OH. Structural formula: H3C–CH2–OH, i.e. a two-carbon chain in which the first carbon carries three H atoms, the second carbon carries two H atoms and the –OH group (H–C(H)(H)–C(H)(H)–O–H).",
          "finalAnswer": "Alcohol (hydroxyl) group –OH; CH3–CH2–OH",
          "solutionSteps": [
            "[1 mark] Functional group: alcohol (hydroxyl) group, –OH.",
            "[1 mark] Structural formula: H–C(H2)–C(H2)–O–H, i.e. CH3–CH2–OH, showing all bonds."
          ]
        },
        {
          "id": "S-CARB-5",
          "text": "Explain the term ‘catenation’ with reference to carbon.",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective",
          "answer": "Catenation is the unique ability of carbon atoms to form strong covalent bonds with other carbon atoms, giving rise to long chains (straight or branched) and rings. This is because of the small size of the carbon atom, which makes C–C bonds very strong and stable. Catenation is one of the main reasons for the very large number of carbon compounds.",
          "finalAnswer": "Self-linking of carbon atoms by covalent bonds into chains and rings",
          "solutionSteps": [
            "[1 mark] Definition: property of carbon atoms to bond covalently with other carbon atoms forming long chains, branched chains and rings.",
            "[1 mark] Reason/significance: small size of carbon makes C–C bonds strong; leads to a very large number of carbon compounds."
          ]
        },
        {
          "id": "S-CARB-6",
          "text": "Why are detergents preferred over soaps in hard water?",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "Hard water contains calcium and magnesium salts. Soap reacts with these ions to form an insoluble precipitate called scum, so much soap is wasted and cleaning is poor. Detergents are generally sodium salts of sulphonic acids or ammonium salts; their charged ends do not form insoluble precipitates with calcium and magnesium ions, so they lather well and remain effective in hard water.",
          "finalAnswer": "Detergents do not form scum with Ca²⁺/Mg²⁺ ions of hard water",
          "solutionSteps": [
            "[1 mark] Soap reacts with Ca²⁺ and Mg²⁺ ions in hard water to form insoluble scum, wasting soap.",
            "[1 mark] Detergents (sulphonate/ammonium salts) do not form insoluble precipitates with these ions, so they remain effective in hard water."
          ]
        },
        {
          "id": "S-CARB-7",
          "text": "What happens when ethanol is heated with excess concentrated H2SO4? Write balanced equation.",
          "marks": 3,
          "difficulty": "Hard",
          "questionType": "subjective",
          "answer": "When ethanol is heated at 443 K with excess concentrated sulphuric acid, it is dehydrated (a molecule of water is removed) to form ethene. Concentrated H2SO4 acts as a dehydrating agent.\nCH3CH2OH --(hot conc. H2SO4, 443 K)--> CH2=CH2 + H2O",
          "finalAnswer": "Ethanol is dehydrated to ethene: CH3CH2OH → CH2=CH2 + H2O (conc. H2SO4, 443 K)",
          "solutionSteps": [
            "[1 mark] Ethanol undergoes dehydration (loses water) to form ethene (an unsaturated hydrocarbon).",
            "[0.5 mark] Concentrated H2SO4 acts as a dehydrating agent.",
            "[1 mark] Balanced equation: CH3CH2OH → CH2=CH2 + H2O",
            "[0.5 mark] Condition written over the arrow: hot conc. H2SO4, 443 K."
          ]
        },
        {
          "id": "S-CARB-8",
          "text": "How does soap cleanse? Explain the role of micelles in cleansing action.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "A soap molecule is a sodium or potassium salt of a long-chain carboxylic acid. It has an ionic (hydrophilic) end that dissolves in water and a long hydrocarbon (hydrophobic) tail that dissolves in oil/grease. When soap is added to water containing oily dirt, the molecules arrange themselves in clusters called micelles: the hydrocarbon tails point inwards towards the oily dirt and trap it in the centre, while the ionic ends face outwards towards water. The micelle thus forms an emulsion in water; the dirt held inside the micelles is pulled out of the cloth and is washed away when the cloth is rinsed with water (agitation/scrubbing helps).",
          "finalAnswer": "Soap forms micelles: hydrophobic tails trap oily dirt inside, ionic ends face water, so dirt is emulsified and rinsed away.",
          "solutionSteps": [
            "[1 mark] Structure: soap molecule has a hydrophilic ionic end (soluble in water) and a hydrophobic long hydrocarbon tail (soluble in oil).",
            "[1 mark] Micelle formation: tails point inwards towards the oily dirt and ionic ends point outwards towards water, trapping dirt at the centre of the micelle.",
            "[1 mark] Cleansing: micelles form an emulsion in water; the trapped dirt is removed from the cloth and washed away on rinsing."
          ]
        },
        {
          "id": "S-CARB-9",
          "text": "Name and draw the structural formula of first three members of alkane series.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "General formula CnH2n+2. (i) Methane, CH4: one C atom bonded to four H atoms by single bonds — H–C(H)(H)–H. (ii) Ethane, C2H6: H3C–CH3, i.e. two C atoms joined by a single bond, each carrying three H atoms. (iii) Propane, C3H8: H3C–CH2–CH3, a chain of three C atoms joined by single bonds, the end carbons carrying three H and the middle carbon two H. In the full structural formulae every bond (C–C and C–H) is shown as a line and each carbon has four single bonds.",
          "finalAnswer": "Methane CH4, ethane C2H6, propane C3H8",
          "solutionSteps": [
            "[1 mark] Methane, CH4 — structure: central C with four single C–H bonds.",
            "[1 mark] Ethane, C2H6 — structure: H3C–CH3 with all C–H and the C–C bond shown as single lines.",
            "[1 mark] Propane, C3H8 — structure: H3C–CH2–CH3 with every carbon showing four single bonds."
          ]
        },
        {
          "id": "S-CARB-10",
          "text": "Differentiate between saturated and unsaturated hydrocarbons with one example and a test for each.",
          "marks": 3,
          "difficulty": "Hard",
          "questionType": "subjective",
          "answer": "Saturated hydrocarbons: carbon atoms are linked only by single bonds; e.g. ethane (C2H6). They burn with a clean (blue, non-sooty) flame.\nUnsaturated hydrocarbons: contain at least one carbon–carbon double or triple bond; e.g. ethene (C2H4) or ethyne (C2H2). They burn with a yellow, sooty (smoky) flame.\nTest: Burn the compound — a clean blue flame indicates a saturated hydrocarbon, a yellow sooty flame indicates an unsaturated hydrocarbon. (Also, unsaturated hydrocarbons undergo addition reactions, e.g. they decolourise bromine water; saturated ones do not.)",
          "finalAnswer": "Saturated: only single bonds (ethane), clean flame; Unsaturated: double/triple bonds (ethene), sooty flame",
          "solutionSteps": [
            "[1 mark] Difference: saturated — only C–C single bonds; unsaturated — C=C double or C≡C triple bond",
            "[1 mark] Examples: saturated — ethane (C2H6); unsaturated — ethene (C2H4)/ethyne (C2H2)",
            "[1 mark] Test: on burning, saturated gives clean blue flame, unsaturated gives yellow sooty flame (or unsaturated decolourises bromine water)"
          ]
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
          "questionType": "subjective",
          "answer": "Nutrition is the process by which an organism takes in food and utilises it to obtain energy and materials for growth, repair and maintenance of the body. Its two main types are autotrophic nutrition and heterotrophic nutrition.",
          "finalAnswer": "Autotrophic and heterotrophic nutrition",
          "solutionSteps": [
            "[1 mark] Correct definition of nutrition (0.5 mark) + naming autotrophic and heterotrophic nutrition (0.5 mark)."
          ]
        },
        {
          "id": "S-LIFE-2",
          "text": "Name the enzyme present in saliva and state its function.",
          "marks": 1,
          "difficulty": "Easy",
          "questionType": "subjective",
          "answer": "Saliva contains the enzyme salivary amylase. It breaks down starch (a complex carbohydrate) into simple sugar (maltose).",
          "finalAnswer": "Salivary amylase; converts starch into sugar (maltose)",
          "solutionSteps": [
            "[1 mark] Enzyme: salivary amylase; Function: breaks down starch into simple sugar (maltose)"
          ]
        },
        {
          "id": "S-LIFE-3",
          "text": "Differentiate between aerobic and anaerobic respiration (any two points).",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "Aerobic respiration: (i) takes place in the presence of oxygen; (ii) glucose is completely broken down into carbon dioxide and water; (iii) releases a large amount of energy; (iv) first step in cytoplasm, later in mitochondria. Anaerobic respiration: (i) takes place in the absence of oxygen; (ii) glucose is incompletely broken down into ethanol and carbon dioxide (in yeast) or lactic acid (in muscle cells); (iii) releases much less energy; (iv) occurs only in the cytoplasm.",
          "finalAnswer": "Aerobic: with O2, CO2 + H2O, more energy; Anaerobic: without O2, ethanol + CO2 / lactic acid, less energy",
          "solutionSteps": [
            "[1 mark] Point 1: aerobic respiration occurs in the presence of oxygen; anaerobic respiration occurs in the absence of oxygen.",
            "[1 mark] Point 2: aerobic gives CO2 + H2O and much energy (cytoplasm + mitochondria); anaerobic gives ethanol + CO2 (yeast) or lactic acid (muscles) and less energy (cytoplasm only)."
          ]
        },
        {
          "id": "S-LIFE-4",
          "text": "Explain the role of alveoli in respiration.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "Alveoli are tiny balloon-like structures at the ends of the bronchioles in the lungs. They provide a very large surface area for exchange of gases. Their walls are thin and contain an extensive network of blood capillaries. Oxygen from inhaled air diffuses across the alveolar walls into the blood, and carbon dioxide diffuses from the blood into the alveoli to be breathed out.",
          "finalAnswer": "Alveoli give a large, thin, capillary-rich surface for exchange of O2 and CO2",
          "solutionSteps": [
            "[1 mark] Alveoli are balloon-like sacs at the ends of the bronchioles that provide a large surface area, with thin walls and a rich network of blood capillaries.",
            "[1 mark] O2 diffuses from alveolar air into the blood and CO2 diffuses from the blood into the alveoli, so gases are exchanged."
          ]
        },
        {
          "id": "S-LIFE-5",
          "text": "What is double circulation? Why is it important in humans?",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "Double circulation: in humans, blood passes through the heart twice during one complete cycle — once through the pulmonary circulation (right ventricle → lungs → left atrium) and once through the systemic circulation (left ventricle → body → right atrium). Importance: the right and left sides of the heart are completely separated, so oxygenated and deoxygenated blood do not mix. This gives a highly efficient supply of oxygen to the body, which is needed by mammals and birds that have high energy needs to maintain a constant body temperature.",
          "finalAnswer": "Blood passes through the heart twice per cycle; keeps oxygenated and deoxygenated blood separate for efficient O₂ supply",
          "solutionSteps": [
            "[1 mark] Definition: blood flows through the heart twice in one complete cycle of the body.",
            "[1 mark] Two circuits: pulmonary (heart → lungs → heart) and systemic (heart → body organs → heart).",
            "[1 mark] Importance: no mixing of oxygenated and deoxygenated blood → efficient oxygen supply for high energy needs and maintaining constant body temperature."
          ]
        },
        {
          "id": "S-LIFE-6",
          "text": "Draw a labelled diagram of human nephron OR list four functions of kidney.",
          "marks": 3,
          "difficulty": "Hard",
          "questionType": "subjective",
          "answer": "(Answering the 'list four functions' alternative.) Functions of the kidney: (i) Filtration of blood to remove nitrogenous wastes such as urea and uric acid; (ii) Formation of urine and its passage to the urinary bladder via the ureters; (iii) Osmoregulation — selective reabsorption of water to maintain the water balance of the body; (iv) Maintaining salt/ion balance by selective reabsorption of glucose, amino acids and salts. (Diagram alternative: nephron showing glomerulus, Bowman's capsule, tubular part, collecting duct, renal artery and renal vein branches.)",
          "finalAnswer": "Filters blood/removes urea; forms urine; osmoregulation; maintains salt balance",
          "solutionSteps": [
            "[1 mark] Filtration of blood to remove nitrogenous wastes (urea, uric acid) — excretion.",
            "[1 mark] Formation of urine, which passes through ureters to the urinary bladder; and osmoregulation (reabsorption of water to regulate water content).",
            "[1 mark] Selective reabsorption of useful substances (glucose, amino acids, salts) to maintain salt/ion balance. [OR for the diagram alternative: correct nephron drawing with labels — glomerulus, Bowman's capsule, tubule, collecting duct.]"
          ]
        },
        {
          "id": "S-LIFE-7",
          "text": "Describe the route taken by blood in human body starting and ending at right atrium.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "Right atrium → (tricuspid valve) → right ventricle → pulmonary artery → lungs (blood is oxygenated) → pulmonary veins → left atrium → (bicuspid valve) → left ventricle → aorta → arteries to body organs/tissues (oxygen delivered, blood becomes deoxygenated) → veins → vena cava (superior and inferior) → right atrium. Thus blood passes through the heart twice in one cycle (double circulation).",
          "finalAnswer": "RA → RV → pulmonary artery → lungs → pulmonary vein → LA → LV → aorta → body → vena cava → RA",
          "solutionSteps": [
            "[1 mark] Right atrium → right ventricle → pulmonary artery → lungs (oxygenation).",
            "[1 mark] Lungs → pulmonary veins → left atrium → left ventricle → aorta.",
            "[1 mark] Aorta → arteries → body tissues (deoxygenation) → veins → vena cava → right atrium (double circulation)."
          ]
        },
        {
          "id": "S-LIFE-8",
          "text": "How is food transported in plants? Name the tissue involved and direction of movement.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "Transport of soluble products of photosynthesis (food) from leaves to other parts of the plant is called translocation. It occurs through the phloem tissue (sieve tubes with the help of companion cells). Translocation is an active process using energy from ATP: sucrose is loaded into phloem, osmotic pressure increases, water enters, and the pressure moves material to tissues with lower pressure. Movement is in both directions — upward and downward (from leaves to storage organs, roots, fruits, growing parts, as per need).",
          "finalAnswer": "Translocation through phloem; movement is both upward and downward.",
          "solutionSteps": [
            "[1 mark] Process is called translocation and occurs through phloem (sieve tubes and companion cells), using energy from ATP.",
            "[1 mark] Direction: both upward and downward (bidirectional), from leaves (source) to parts that need or store food."
          ]
        },
        {
          "id": "S-LIFE-9",
          "text": "Why is the small intestine in herbivores longer than in carnivores?",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "Herbivores eat plant material (grass) rich in cellulose, which is difficult to digest. A longer small intestine gives more time and surface for the digestion of cellulose and absorption of food. Carnivores eat meat, which is easier to digest, so they have a shorter small intestine.",
          "finalAnswer": "Cellulose in plant food needs longer time to digest",
          "solutionSteps": [
            "[1 mark] Herbivores eat grass/plant food containing cellulose, which takes a long time to digest; hence a longer small intestine allows complete digestion and absorption.",
            "[1 mark] Carnivores eat meat, which is easily digested, so a shorter small intestine is sufficient."
          ]
        },
        {
          "id": "S-LIFE-10",
          "text": "Explain any three differences between autotrophic and heterotrophic nutrition.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "1. Source of food: In autotrophic nutrition, organisms make their own food from simple inorganic substances (CO2 and water); in heterotrophic nutrition, organisms obtain ready-made food from other organisms.\n2. Chlorophyll/sunlight: Autotrophs (green plants) need chlorophyll and sunlight for photosynthesis; heterotrophs do not have chlorophyll and do not need sunlight to make food.\n3. Trophic level: Autotrophs are producers (first trophic level); heterotrophs are consumers (herbivores, carnivores, parasites, saprophytes). Example: autotrophic — green plants; heterotrophic — animals, fungi.",
          "finalAnswer": "Self-made food vs ready-made food; chlorophyll needed vs not; producers vs consumers",
          "solutionSteps": [
            "[1 mark] Autotrophs synthesise food from CO2 and water; heterotrophs depend on ready-made organic food",
            "[1 mark] Autotrophs need chlorophyll and sunlight (photosynthesis); heterotrophs lack chlorophyll",
            "[1 mark] Autotrophs are producers (e.g. green plants); heterotrophs are consumers (e.g. animals, fungi)"
          ]
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
          "questionType": "subjective",
          "answer": "Electric current is the rate of flow of electric charge through any cross-section of a conductor, I = Q/t. Its SI unit is the ampere (A).",
          "finalAnswer": "Rate of flow of charge (I = Q/t); SI unit ampere (A)",
          "solutionSteps": [
            "[1 mark] Definition: rate of flow of electric charge, I = Q/t (0.5 mark); SI unit ampere, A (0.5 mark)."
          ]
        },
        {
          "id": "S-ELEC-2",
          "text": "State Ohm’s law and draw a labelled V–I graph for an ohmic conductor.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "Ohm's law: the electric current flowing through a metallic conductor is directly proportional to the potential difference across its ends, provided its temperature remains the same; V ∝ I, i.e. V = IR. V–I graph: with current I (A) on the x-axis and potential difference V (V) on the y-axis, the graph for an ohmic conductor is a straight line passing through the origin; its slope gives the resistance R.",
          "finalAnswer": "V = IR (at constant temperature); V–I graph is a straight line through origin",
          "solutionSteps": [
            "[1 mark] Statement: current through a conductor is directly proportional to the potential difference across its ends at constant temperature (V = IR)",
            "[1 mark] Graph: straight line through the origin with axes labelled I (in A) and V (in V)"
          ]
        },
        {
          "id": "S-ELEC-3",
          "text": "A potential difference of 12 V is applied across resistor of 6 Ω. Calculate current flowing.",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective",
          "answer": "Given V = 12 V, R = 6 Ω. By Ohm's law, V = IR, so I = V/R = 12 V / 6 Ω = 2 A. The current flowing through the resistor is 2 A.",
          "finalAnswer": "2 A",
          "solutionSteps": [
            "[1 mark] Given V = 12 V, R = 6 Ω; Ohm's law: V = IR ⇒ I = V/R.",
            "[1 mark] I = 12/6 = 2 A (with unit)."
          ]
        },
        {
          "id": "S-ELEC-4",
          "text": "What is resistivity? How does it differ from resistance?",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "Resistivity (ρ) of a material is the resistance of a conductor of that material having unit length and unit area of cross-section; from R = ρl/A, ρ = RA/l. Its SI unit is Ω m. Difference: resistivity is a characteristic property of the material and depends only on the material (and temperature), not on the dimensions of the conductor. Resistance (unit Ω) depends on the material as well as on the length and area of cross-section of the conductor (R ∝ l, R ∝ 1/A).",
          "finalAnswer": "ρ = RA/l (Ω m); depends only on material, whereas resistance (Ω) also depends on length and area",
          "solutionSteps": [
            "[1 mark] Definition: resistivity is the resistance of a conductor of unit length and unit cross-sectional area, ρ = RA/l, SI unit Ω m.",
            "[1 mark] Difference: resistivity depends only on the nature of the material (and temperature); resistance (Ω) also depends on the length and area of cross-section of the conductor."
          ]
        },
        {
          "id": "S-ELEC-5",
          "text": "Two resistors of 4 Ω and 6 Ω are connected in series. Find their equivalent resistance and total current when connected to 5 V supply.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "In series, R_s = R₁ + R₂ = 4 Ω + 6 Ω = 10 Ω. By Ohm's law, I = V/R_s = 5 V / 10 Ω = 0.5 A.",
          "finalAnswer": "R = 10 Ω, I = 0.5 A",
          "solutionSteps": [
            "[1 mark] Formula for series: R_s = R₁ + R₂.",
            "[1 mark] R_s = 4 Ω + 6 Ω = 10 Ω.",
            "[1 mark] I = V/R = 5 V / 10 Ω = 0.5 A."
          ]
        },
        {
          "id": "S-ELEC-6",
          "text": "Draw a circuit diagram to show three resistors connected in parallel and write expression for equivalent resistance.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "Circuit: a battery, plug key and ammeter in series with a combination of three resistors R1, R2 and R3 connected in parallel between the same two points X and Y (each resistor on its own branch, so the same potential difference V appears across each); a voltmeter is connected across X and Y. Total current I = I1 + I2 + I3 = V/R1 + V/R2 + V/R3. Since I = V/Rp, the equivalent resistance is given by 1/Rp = 1/R1 + 1/R2 + 1/R3.",
          "finalAnswer": "1/Rp = 1/R1 + 1/R2 + 1/R3",
          "solutionSteps": [
            "[1 mark] Diagram: battery, key and ammeter in series with three resistors R1, R2, R3 connected in parallel between points X and Y; voltmeter across XY.",
            "[1 mark] Same p.d. V across each resistor; total current I = I1 + I2 + I3 = V/R1 + V/R2 + V/R3.",
            "[1 mark] Using I = V/Rp: 1/Rp = 1/R1 + 1/R2 + 1/R3."
          ]
        },
        {
          "id": "S-ELEC-7",
          "text": "Define electric power. Derive relation P = I^2R.",
          "marks": 3,
          "difficulty": "Hard",
          "questionType": "subjective",
          "answer": "Electric power is the rate at which electrical energy is consumed (or work is done) in a circuit: P = W/t. SI unit: watt (W); 1 W = 1 J/s = 1 V × 1 A.\nDerivation: work done in moving charge Q through potential difference V is W = VQ, so P = W/t = VQ/t = VI (since I = Q/t). By Ohm's law V = IR, so P = (IR)I = I²R.",
          "finalAnswer": "P = W/t (unit watt); P = VI = I²R",
          "solutionSteps": [
            "[1 mark] Definition: electric power is the rate of consumption of electrical energy, P = W/t; SI unit watt (W).",
            "[1 mark] W = VQ and I = Q/t, so P = VQ/t = VI.",
            "[1 mark] Using Ohm's law V = IR: P = (IR)I = I²R."
          ]
        },
        {
          "id": "S-ELEC-8",
          "text": "An electric iron of power 1000 W is used for 2 hours daily. Calculate energy consumed in kWh in 30 days.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "P = 1000 W = 1 kW. Time per day = 2 h, so total time in 30 days = 2 × 30 = 60 h. Energy = P × t = 1 kW × 60 h = 60 kWh.",
          "finalAnswer": "60 kWh",
          "solutionSteps": [
            "[1 mark] Given: P = 1000 W = 1 kW; total time t = 2 h × 30 = 60 h.",
            "[1 mark] Formula: E = P × t.",
            "[1 mark] E = 1 kW × 60 h = 60 kWh (60 units)."
          ]
        },
        {
          "id": "S-ELEC-9",
          "text": "Why are household electric appliances usually connected in parallel, not in series? Give two reasons.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "(i) In parallel, each appliance gets the same full mains voltage (220 V), so each works at its rated power. (ii) Each appliance has its own independent circuit/switch; if one appliance is switched off or fails, the others keep working. (Also, the total resistance is lower in parallel, so each draws the current it needs.) In series, the voltage would be divided and a fault in one would break the whole circuit.",
          "finalAnswer": "Same voltage to each appliance; each can be operated independently",
          "solutionSteps": [
            "[1 mark] In parallel, every appliance gets the same mains voltage and draws the current it needs, so it works at its rated power (in series the voltage gets divided).",
            "[1 mark] Appliances can be switched on/off independently; failure of one does not break the circuit for others (in series, one fault stops all)."
          ]
        },
        {
          "id": "S-ELEC-10",
          "text": "State the factors on which resistance of a conductor depends and explain qualitatively.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "The resistance R of a conductor depends on:\n1. Length (l): R is directly proportional to length — a longer wire offers more resistance (R ∝ l).\n2. Area of cross-section (A): R is inversely proportional to the area of cross-section — a thicker wire offers less resistance (R ∝ 1/A).\n3. Nature of the material: different materials have different resistivity (ρ); e.g. copper has low resistivity, nichrome high.\nCombining: R = ρl/A. (Resistance also depends on temperature — for metals it increases with temperature.)",
          "finalAnswer": "Length (R ∝ l), area of cross-section (R ∝ 1/A), nature of material (ρ); R = ρl/A",
          "solutionSteps": [
            "[1 mark] Length: R directly proportional to length of conductor",
            "[1 mark] Area of cross-section: R inversely proportional to area of cross-section",
            "[1 mark] Nature of material (resistivity ρ) and combined relation R = ρl/A"
          ]
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
          "questionType": "subjective",
          "answer": "The neuron (nerve cell) is the basic structural and functional unit of the nervous system.",
          "finalAnswer": "Neuron (nerve cell)",
          "solutionSteps": [
            "[1 mark] Neuron (nerve cell)."
          ]
        },
        {
          "id": "S-CC-2",
          "text": "Draw a simple labelled diagram of neuron OR write two functions of neuron.",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective",
          "answer": "Functions of a neuron (any two): (i) Dendrites receive information/stimulus and convert it into a chemical reaction that sets off an electrical impulse. (ii) The impulse travels from the dendrite to the cell body and along the axon to its end. (iii) At the axon end, chemicals are released which cross the synapse and start an impulse in the next neuron, thus transmitting messages in the body. (Alternatively, a labelled diagram showing dendrite, cell body with nucleus, axon and nerve ending.)",
          "finalAnswer": "Receives stimuli and conducts/transmits nerve impulses",
          "solutionSteps": [
            "[1 mark] Function 1: dendrites receive information/stimulus and generate an electrical impulse (OR diagram drawn correctly)",
            "[1 mark] Function 2: conducts impulse via cell body and axon and transmits it to the next neuron across the synapse by releasing chemicals (OR labels: dendrite, cell body, nucleus, axon, nerve ending)"
          ]
        },
        {
          "id": "S-CC-3",
          "text": "Define reflex action and reflex arc.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "Reflex action: a sudden, automatic and involuntary response to a stimulus, without conscious thinking, controlled by the spinal cord (e.g. withdrawing the hand on touching a hot object). Reflex arc: the pathway followed by nerve impulses in a reflex action — receptor → sensory neuron → relay neuron in the spinal cord → motor neuron → effector (muscle/gland).",
          "finalAnswer": "Reflex action: sudden involuntary response; reflex arc: receptor → sensory neuron → spinal cord → motor neuron → effector",
          "solutionSteps": [
            "[1 mark] Reflex action: a sudden, automatic, involuntary response to a stimulus, controlled by the spinal cord (example: pulling hand away from a hot object).",
            "[1 mark] Reflex arc: the pathway of impulses in a reflex action — receptor → sensory neuron → relay neuron (spinal cord) → motor neuron → effector."
          ]
        },
        {
          "id": "S-CC-4",
          "text": "Name three major parts of human brain and give one function of each.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "1. Fore-brain (cerebrum): the main thinking part of the brain; it has sensory areas that receive impulses from receptors, motor areas that control voluntary muscles, and is the centre of thinking, memory, learning and intelligence. 2. Mid-brain: controls involuntary actions such as reflex movements of the head, neck and eyes and change in pupil size. 3. Hind-brain: the cerebellum maintains posture and balance of the body and controls precision of voluntary actions; the medulla controls involuntary actions such as blood pressure, salivation and vomiting; the pons regulates respiration.",
          "finalAnswer": "Fore-brain (thinking, voluntary actions), mid-brain (involuntary reflexes of head/eyes), hind-brain (cerebellum – balance/posture; medulla – BP, vomiting)",
          "solutionSteps": [
            "[1 mark] Fore-brain (cerebrum): main thinking part — thinking, memory, receives sensory impulses and controls voluntary actions.",
            "[1 mark] Mid-brain: controls involuntary actions, e.g. reflex movements of the head, neck and eyes.",
            "[1 mark] Hind-brain: cerebellum maintains posture and balance (precision of voluntary actions); medulla controls involuntary actions like blood pressure, salivation, vomiting."
          ]
        },
        {
          "id": "S-CC-5",
          "text": "What is role of plant hormones in control and coordination? Give two examples.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "Plants have no nervous system; control and coordination are brought about by plant hormones (phytohormones). They coordinate growth, development and responses to the environment (e.g. tropic movements). Examples: (i) Auxin — synthesised at the shoot tip, promotes cell elongation and helps the shoot bend towards light (phototropism). (ii) Gibberellins — promote growth of the stem. (Also: Cytokinins promote cell division; Abscisic acid inhibits growth and causes wilting of leaves.)",
          "finalAnswer": "Plant hormones coordinate growth and responses; e.g. auxin, gibberellin (also cytokinin, abscisic acid)",
          "solutionSteps": [
            "[1 mark] Role: plant hormones (chemical messengers) coordinate growth, development and responses to stimuli such as light and gravity.",
            "[1 mark] Example 1: Auxin — promotes cell elongation; causes bending of shoot towards light.",
            "[1 mark] Example 2: Gibberellin — promotes stem growth (or cytokinin — promotes cell division; abscisic acid — inhibits growth, wilting of leaves)."
          ]
        },
        {
          "id": "S-CC-6",
          "text": "How does adrenaline help body to face an emergency situation?",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "Adrenaline is secreted by the adrenal glands directly into the blood in an emergency (fight-or-flight). It acts on target organs: the heart beats faster, supplying more oxygen to muscles; blood supply to the digestive system and skin is reduced (by contraction of muscles around small arteries) and diverted to skeletal muscles; breathing rate increases due to contraction of the diaphragm and rib muscles. All these responses prepare the body to deal with the emergency.",
          "finalAnswer": "Adrenaline raises heart and breathing rate and diverts blood to skeletal muscles",
          "solutionSteps": [
            "[1 mark] Adrenaline is secreted by adrenal glands into the blood during an emergency; heart beats faster to supply more oxygen to muscles.",
            "[1 mark] Blood to digestive system and skin is reduced and diverted to skeletal muscles; breathing rate increases — body is prepared to face the situation."
          ]
        },
        {
          "id": "S-CC-7",
          "text": "Distinguish between voluntary and involuntary actions with one example each.",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective",
          "answer": "Voluntary actions are actions done consciously, according to our will, and controlled by the fore-brain (cerebrum), e.g. writing, walking, talking. Involuntary actions occur without conscious control/thinking, controlled by the mid-brain and hind-brain (medulla), e.g. heartbeat, breathing, salivation, vomiting.",
          "finalAnswer": "Voluntary: conscious, by cerebrum (e.g. writing); involuntary: without will, by medulla/mid-brain (e.g. heartbeat)",
          "solutionSteps": [
            "[1 mark] Voluntary actions are under conscious control of the will and are controlled by the fore-brain (cerebrum); example: writing / walking.",
            "[1 mark] Involuntary actions take place without conscious thought, controlled by mid-brain and hind-brain (medulla); example: heartbeat / breathing / salivation."
          ]
        },
        {
          "id": "S-CC-8",
          "text": "Explain phototropism in plants with neat labelled sketch or stepwise explanation.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "Phototropism is the directional growth movement of a plant part in response to light. (1) When light falls on a growing shoot from one side, the plant hormone auxin, synthesised at the shoot tip, diffuses towards the shaded side of the shoot. (2) The higher concentration of auxin on the shaded side stimulates the cells there to elongate more than the cells on the lighted side. (3) As a result the shoot bends towards the light (positive phototropism); roots generally bend away from light (negative phototropism).",
          "finalAnswer": "Shoot bends towards light because auxin accumulates on the shaded side and causes more cell elongation there.",
          "solutionSteps": [
            "[1 mark] Definition: phototropism is the growth movement of a plant part in response to the direction of light (shoot — positively phototropic; root — negatively phototropic).",
            "[1 mark] Auxin synthesised at the shoot tip diffuses to the side away from light (shaded side).",
            "[1 mark] Cells on the shaded side elongate more, so the shoot bends towards light."
          ]
        },
        {
          "id": "S-CC-9",
          "text": "Why is spinal cord injury more serious than injury to muscle in leg?",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "The spinal cord is part of the central nervous system; it carries messages between the brain and the body and controls reflex actions. Injury to it disrupts the transmission of impulses to and from all body parts below the injury, causing loss of sensation and movement (paralysis), and it cannot easily heal. An injury to a leg muscle affects only that muscle locally and generally heals.",
          "finalAnswer": "Spinal cord (CNS) injury blocks impulses to/from many body parts, causing paralysis",
          "solutionSteps": [
            "[1 mark] Spinal cord is part of the CNS; it conducts impulses between brain and body and controls reflex actions.",
            "[1 mark] Its injury stops messages to/from all parts below the injury (loss of sensation/paralysis), whereas a leg-muscle injury is local and affects only that muscle."
          ]
        },
        {
          "id": "S-CC-10",
          "text": "Explain briefly how chemical coordination is brought about in animals by hormones.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "In animals, chemical coordination is brought about by hormones secreted by endocrine glands. Endocrine glands are ductless; they release hormones directly into the blood, which carries them to target organs/cells where they act. Hormones are needed in very small amounts and regulate growth, development and metabolism. Examples: adrenaline from the adrenal glands prepares the body for emergency (increases heart rate, diverts blood to muscles); insulin from the pancreas lowers blood sugar; thyroxine from the thyroid regulates carbohydrate, protein and fat metabolism. The timing and amount of hormone release are regulated by feedback mechanisms — e.g. a rise in blood sugar is detected by pancreatic cells, which then secrete more insulin; when sugar falls, insulin secretion is reduced.",
          "finalAnswer": "Endocrine glands secrete hormones into blood → target organs; regulated by feedback mechanism",
          "solutionSteps": [
            "[1 mark] Hormones are secreted by ductless endocrine glands directly into the blood and carried to target organs",
            "[1 mark] Example(s) of action, e.g. adrenaline (adrenal) in emergency, insulin (pancreas) lowers blood sugar",
            "[1 mark] Timing and amount regulated by feedback mechanism (e.g. blood sugar–insulin)"
          ]
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
          "questionType": "subjective",
          "answer": "Asexual reproduction is the mode of reproduction in which a single parent produces new individuals without the formation and fusion of gametes. Example: Amoeba (binary fission) / Hydra (budding) / yeast (budding).",
          "finalAnswer": "Single-parent reproduction without gametes; e.g. Amoeba",
          "solutionSteps": [
            "[1 mark] Definition: a single parent produces offspring without fusion of gametes (0.5 mark); one correct example such as Amoeba, Hydra, yeast or Planaria (0.5 mark)."
          ]
        },
        {
          "id": "S-REP-2",
          "text": "Differentiate between binary fission and multiple fission with one example each.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "Binary fission: the parent cell divides into two daughter cells; e.g. Amoeba (also Leishmania, Paramecium). Multiple fission: the parent cell divides into many daughter cells simultaneously (often within a cyst); e.g. Plasmodium (malarial parasite).",
          "finalAnswer": "Binary: 2 daughter cells (Amoeba); Multiple: many daughter cells (Plasmodium)",
          "solutionSteps": [
            "[1 mark] Binary fission – one parent cell divides into two daughter cells; example: Amoeba",
            "[1 mark] Multiple fission – one parent cell divides into many daughter cells at once; example: Plasmodium"
          ]
        },
        {
          "id": "S-REP-3",
          "text": "Explain regeneration with example of planaria or hydra.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "Regeneration is the ability of a fully differentiated organism to give rise to new individual organisms from its body parts. In Planaria (or Hydra), if the body is cut or broken into many pieces, each piece grows into a complete new organism. This is carried out by specialised cells which proliferate and make large numbers of cells; these cells then undergo changes to become various cell types and tissues in an organised sequence (development).",
          "finalAnswer": "Formation of complete organisms from body pieces; e.g. each cut piece of Planaria grows into a new Planaria",
          "solutionSteps": [
            "[1 mark] Definition: regeneration is the ability of an organism to give rise to new individuals from its body parts, carried out by specialised cells that proliferate and differentiate.",
            "[1 mark] Example: when Planaria (or Hydra) is cut into several pieces, each piece grows into a complete new organism."
          ]
        },
        {
          "id": "S-REP-4",
          "text": "List four parts of a flower involved in sexual reproduction.",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective",
          "answer": "Parts of a flower involved in sexual reproduction: (1) Stamen — the male reproductive part; its anther produces pollen grains. (2) Stigma — the sticky terminal part of the pistil that receives pollen. (3) Style — the tube through which the pollen tube grows to reach the ovary. (4) Ovary — the swollen basal part of the pistil containing ovules, each having an egg cell. (Stigma, style and ovary together form the pistil/carpel, the female reproductive part.)",
          "finalAnswer": "Stamen (anther), stigma, style, ovary",
          "solutionSteps": [
            "[1 mark] Male part: stamen (anther producing pollen grains, on a filament) — any two correct parts named.",
            "[1 mark] Female parts of the pistil: stigma, style and ovary (containing ovules) — remaining parts named to make four."
          ]
        },
        {
          "id": "S-REP-5",
          "text": "Briefly describe process of fertilisation in human beings.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "During sexual intercourse, sperms are deposited in the vagina. They travel upward through the cervix and uterus into the oviduct (fallopian tube). The ovary releases one egg every month, which also enters the oviduct. Fertilisation — fusion of the sperm with the egg — takes place in the oviduct, forming a zygote. The zygote divides repeatedly to form an embryo, which moves down to the uterus and gets implanted in the thick, blood-rich uterine lining, where it develops further.",
          "finalAnswer": "Fusion of sperm and egg in the oviduct forming a zygote",
          "solutionSteps": [
            "[1 mark] Sperms deposited in vagina travel through cervix and uterus to the oviduct; ovary releases an egg into the oviduct.",
            "[1 mark] Fusion of male and female gametes takes place in the oviduct (fallopian tube), forming a zygote.",
            "[1 mark] Zygote divides to form an embryo, which is implanted in the thickened uterine wall."
          ]
        },
        {
          "id": "S-REP-6",
          "text": "What is menstrual cycle? State its significance.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "Menstrual cycle: the cycle of changes in the female reproductive system repeated roughly every 28 days. Each month an ovary releases an egg and the uterine lining thickens and becomes spongy and richly supplied with blood to nourish an embryo if fertilisation occurs. If the egg is not fertilised, it lives for about one day; the thick, spongy uterine lining is no longer needed and breaks down slowly, coming out through the vagina as blood and mucus — menstruation, which lasts about 2–8 days. Significance: it prepares the uterus every month to receive and nourish a fertilised egg (embryo), and when fertilisation does not occur it removes the unused lining so that a fresh lining can be built for the next cycle.",
          "finalAnswer": "Monthly cycle of uterine lining build-up and shedding (menstruation) when egg is not fertilised; prepares uterus for pregnancy",
          "solutionSteps": [
            "[1 mark] Every month an ovary releases one egg and the uterine lining thickens, becoming spongy and rich in blood vessels.",
            "[1 mark] If the egg is not fertilised, the lining breaks down and is discharged through the vagina as blood and mucus (menstruation), about every 28 days, lasting 2–8 days.",
            "[1 mark] Significance: prepares the uterus to receive and nourish a fertilised egg; removes unused lining so a fresh one is formed each cycle."
          ]
        },
        {
          "id": "S-REP-7",
          "text": "Explain vegetative propagation and mention one advantage to farmer/gardener.",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective",
          "answer": "Vegetative propagation is a method of asexual reproduction in plants in which new plants are produced from vegetative parts such as roots, stems or leaves (e.g. Bryophyllum leaf buds, potato tubers, layering/grafting in rose, sugarcane, banana). Advantage: plants bear flowers and fruits earlier than those produced from seeds; it also helps grow plants that have lost the capacity to produce seeds (banana, orange, rose, jasmine), and all plants are genetically similar to the parent, preserving desirable characters.",
          "finalAnswer": "Asexual reproduction from roots/stems/leaves; advantage: earlier flowering/fruiting, seedless plants grown, desirable traits preserved",
          "solutionSteps": [
            "[1 mark] Vegetative propagation: new plants arise from vegetative parts (root, stem, leaf) of the parent plant, e.g. Bryophyllum, potato, rose by layering/grafting.",
            "[1 mark] One advantage: earlier flowering and fruiting / propagation of seedless plants (banana, rose) / offspring genetically identical, so desirable characters retained."
          ]
        },
        {
          "id": "S-REP-8",
          "text": "Why is variation beneficial to a species but not necessarily to an individual?",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "Variations in a population increase the chances of survival of the species: if the environment changes drastically (e.g. rise in temperature), some individuals with suitable variations may survive and continue the species, so the species is not wiped out. For an individual, however, a particular variation may not be useful in its present environment and may even be harmful; the individual cannot change it, and its survival depends only on whether that variation suits the conditions.",
          "finalAnswer": "Variation helps some individuals survive changed conditions, so the species continues; a given variation may not help (or may harm) a particular individual.",
          "solutionSteps": [
            "[1 mark] Benefit to species: variation ensures some individuals can survive drastic environmental changes, so the population/species survives.",
            "[1 mark] Not necessarily to individual: a particular variation may not be advantageous (or may be harmful) to that individual in its environment."
          ]
        }
      ]
    },
    "heredity_evolution": {
      "subject": "science",
      "topicKey": "heredity_evolution",
      "topicName": "Heredity",
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
          "questionType": "subjective",
          "answer": "Heredity: the transmission (inheritance) of characters/traits from parents to their offspring, generation after generation. Variation: the differences in characters/traits among individuals of the same species (including between parents and offspring and among siblings).",
          "finalAnswer": "Heredity = inheritance of traits from parents to offspring; variation = differences among individuals of a species",
          "solutionSteps": [
            "[1 mark] Heredity: transmission of characters from parents to offspring.",
            "[1 mark] Variation: differences in characters among individuals of the same species."
          ]
        },
        {
          "id": "S-HER-2",
          "text": "State Mendel’s law of dominance with an example.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "Law of dominance: When a pair of contrasting traits (alleles) is present together in an individual, only one of them expresses itself in the F1 generation; it is called the dominant trait, while the other, which remains hidden, is the recessive trait.\nExample: When a pure tall pea plant (TT) is crossed with a pure dwarf pea plant (tt), all F1 plants are tall (Tt). Tallness is dominant and dwarfness is recessive.",
          "finalAnswer": "Only the dominant trait appears in F1; e.g. TT × tt gives all tall (Tt)",
          "solutionSteps": [
            "[1 mark] Statement: of a pair of contrasting traits, only the dominant one is expressed in F1; the recessive one is masked",
            "[1 mark] Example: pure tall (TT) × pure dwarf (tt) pea plants → all F1 tall (Tt)"
          ]
        },
        {
          "id": "S-HER-3",
          "text": "Differentiate between genotype and phenotype with one example.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "Genotype is the genetic constitution (set of genes/alleles) of an organism for a trait, e.g. TT or Tt for height in pea plants. Phenotype is the observable (external) expression of that trait, e.g. a tall pea plant. Plants with genotypes TT and Tt both have the same phenotype – tall.",
          "finalAnswer": "Genotype = genetic make-up (TT/Tt); phenotype = observable trait (tall)",
          "solutionSteps": [
            "[1 mark] Genotype: genetic constitution of an organism for a trait, e.g. TT or Tt.",
            "[1 mark] Phenotype: observable/visible expression of the trait, e.g. tall plant (both TT and Tt are tall)."
          ]
        },
        {
          "id": "S-HER-4",
          "text": "What is a monohybrid cross? Show with example of tall and dwarf pea plants.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "A monohybrid cross is a cross between two individuals considering only one pair of contrasting characters (one trait). Example: pure tall (TT) × pure dwarf (tt) pea plants. Gametes: T and t. F1: all Tt – tall. Selfing F1: Tt × Tt gives gametes T, t from each parent; F2: TT, Tt, Tt, tt. Phenotypic ratio 3 tall : 1 dwarf; genotypic ratio 1 TT : 2 Tt : 1 tt.",
          "finalAnswer": "Cross for one trait; F1 all tall, F2 3 tall : 1 dwarf (genotype 1:2:1)",
          "solutionSteps": [
            "[1 mark] Definition: cross between two plants considering only one pair of contrasting characters",
            "[1 mark] Parents TT (tall) × tt (dwarf) → gametes T, t → F1 all Tt (tall)",
            "[1 mark] F1 selfed (Tt × Tt) → F2 TT : Tt : tt = 1 : 2 : 1; phenotypic ratio 3 tall : 1 dwarf"
          ]
        },
        {
          "id": "S-HER-8",
          "text": "Explain briefly how sex of a child is determined in human beings.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "In human beings, sex is genetically determined by sex chromosomes. Females have a perfect pair of sex chromosomes, XX; males have a mismatched pair, XY. So all eggs (ova) produced by the mother carry an X chromosome, whereas the father produces two kinds of sperms — half carrying X and half carrying Y. If a sperm carrying X fertilises the egg, the zygote is XX and develops into a girl; if a sperm carrying Y fertilises the egg, the zygote is XY and develops into a boy. Thus the sex of the child is determined by the type of sperm (from the father) that fertilises the egg; the chance of a boy or a girl is 50:50.",
          "finalAnswer": "Determined by father's sperm: X sperm + X egg → XX girl; Y sperm + X egg → XY boy",
          "solutionSteps": [
            "[1 mark] Females have XX and males have XY sex chromosomes; all eggs carry X, while sperms are of two types — X-bearing and Y-bearing.",
            "[1 mark] X-bearing sperm + egg (X) → XX zygote → girl; Y-bearing sperm + egg (X) → XY zygote → boy.",
            "[1 mark] Hence the sex of the child depends on which type of sperm from the father fertilises the egg; probability of boy or girl is 50% each."
          ]
        },
        {
          "id": "S-HER-11",
          "text": "What is meant by a dominant trait? Give one example from Mendel's experiments.",
          "marks": 1,
          "difficulty": "Easy",
          "questionType": "subjective",
          "answer": "A dominant trait is the trait that expresses itself in the F1 generation (in the presence of the contrasting trait) when two pure parents with contrasting traits are crossed. Example: in Mendel's pea plants, tallness (T) is dominant over dwarfness (t) — a cross of tall × dwarf gave all tall plants in F1. (Also round seed over wrinkled, violet flower over white.)",
          "finalAnswer": "Trait expressed in F1/hybrid; e.g. tall over dwarf in pea",
          "solutionSteps": [
            "[1 mark] A dominant trait is the one that is expressed in the F1 generation even in the presence of the contrasting allele, e.g. tallness over dwarfness in pea plants."
          ]
        },
        {
          "id": "S-HER-12",
          "text": "In Mendel's monohybrid cross, what does the 3:1 phenotypic ratio in F₂ generation represent?",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective",
          "answer": "The 3:1 ratio in F₂ shows that three-fourths of the plants show the dominant trait (e.g. tall) and one-fourth show the recessive trait (e.g. short). It means the recessive trait was not lost in F₁ but was only masked; the two factors (alleles) for a trait separate during gamete formation and recombine, so F₂ has TT : Tt : tt = 1 : 2 : 1, of which TT and Tt both appear tall.",
          "finalAnswer": "3 dominant : 1 recessive phenotype; recessive trait reappears (genotype 1 TT : 2 Tt : 1 tt)",
          "solutionSteps": [
            "[1 mark] 3/4 of F₂ plants show the dominant trait and 1/4 show the recessive trait.",
            "[1 mark] Recessive trait was hidden (not lost) in F₁; factors separate in gametes and recombine — genotypic ratio 1 TT : 2 Tt : 1 tt gives 3 tall : 1 short."
          ]
        },
        {
          "id": "S-HER-13",
          "text": "What are the two ways in which variations arise in organisms? Why is variation important for a species?",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective",
          "answer": "Variations arise (i) due to inaccuracies/errors in DNA copying during reproduction, and (ii) due to sexual reproduction, which combines DNA from two different individuals (parents), producing new combinations. Importance: variations help a species to survive in a changing environment — some variants may be better suited to new conditions (e.g. heat-resistant bacteria surviving a heat wave), so the species is not wiped out.",
          "finalAnswer": "DNA copying errors and sexual reproduction; variation helps species survive changing environments",
          "solutionSteps": [
            "[1 mark] Two ways: inaccuracies in DNA copying during reproduction; and sexual reproduction combining DNA of two parents.",
            "[1 mark] Importance: variation enables some individuals to survive changes in the environment, ensuring survival of the species."
          ]
        },
        {
          "id": "S-HER-14",
          "text": "A man has blood group A (genotype AO) and a woman has blood group B (genotype BO). List all possible blood groups their children could have. Show using a cross.",
          "marks": 3,
          "difficulty": "Hard",
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
          "questionType": "subjective",
          "answer": "Laws of reflection: (i) The angle of incidence is equal to the angle of reflection (∠i = ∠r). (ii) The incident ray, the normal to the mirror at the point of incidence and the reflected ray all lie in the same plane.",
          "finalAnswer": "∠i = ∠r; incident ray, normal and reflected ray lie in the same plane.",
          "solutionSteps": [
            "[1 mark] First law: angle of incidence equals angle of reflection.",
            "[1 mark] Second law: incident ray, normal at the point of incidence and reflected ray lie in the same plane."
          ]
        },
        {
          "id": "S-LIGHT-2",
          "text": "Define focal length of a concave mirror.",
          "marks": 1,
          "difficulty": "Easy",
          "questionType": "subjective",
          "answer": "The focal length of a concave mirror is the distance between its pole (P) and its principal focus (F), i.e. f = R/2. As per the New Cartesian sign convention it is negative for a concave mirror.",
          "finalAnswer": "Distance between pole and principal focus (f = R/2)",
          "solutionSteps": [
            "[1 mark] Focal length is the distance between the pole and the principal focus of the mirror (f = R/2)."
          ]
        },
        {
          "id": "S-LIGHT-3",
          "text": "Write mirror formula and explain meaning of symbols used.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "Mirror formula: 1/v + 1/u = 1/f\nwhere u = object distance (distance of object from the pole of the mirror), v = image distance (distance of image from the pole), f = focal length of the mirror. All distances are measured from the pole and take signs according to the New Cartesian sign convention.",
          "finalAnswer": "1/v + 1/u = 1/f",
          "solutionSteps": [
            "[1 mark] Mirror formula: 1/v + 1/u = 1/f",
            "[1 mark] u = object distance, v = image distance, f = focal length, all measured from the pole (New Cartesian sign convention)"
          ]
        },
        {
          "id": "S-LIGHT-4",
          "text": "State Snell’s law of refraction and define refractive index.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "Snell's law: For light of a given colour and a given pair of media, the ratio of the sine of the angle of incidence to the sine of the angle of refraction is a constant, sin i / sin r = constant (the incident ray, refracted ray and normal at the point of incidence also lie in the same plane). Refractive index: this constant is called the refractive index of the second medium with respect to the first, n₂₁ = sin i / sin r; equivalently n₂₁ = v₁/v₂, the ratio of the speed of light in medium 1 to that in medium 2. (Absolute refractive index n = c/v.)",
          "finalAnswer": "sin i / sin r = constant; refractive index n₂₁ = sin i/sin r = v₁/v₂",
          "solutionSteps": [
            "[1 mark] Snell's law: sin i / sin r = constant for a given pair of media and given colour of light.",
            "[1 mark] Refractive index: the constant n₂₁ = sin i / sin r = v₁/v₂ (speed of light in medium 1 / speed in medium 2)."
          ]
        },
        {
          "id": "S-LIGHT-5",
          "text": "Draw a ray diagram for the image formed by a concave mirror when the object is placed between F and C (2F). State the position and nature of the image.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "For a concave mirror, the point 2F is the centre of curvature C. Object AB is placed between F and C. Ray 1 from A parallel to the principal axis reflects and passes through the principal focus F. Ray 2 from A passing through F (or along the line through C) reflects parallel to the principal axis (or retraces its path). The reflected rays meet beyond C, forming image A'B'. Image: beyond C, real, inverted and enlarged (magnified).",
          "finalAnswer": "Image beyond C (2F); real, inverted, enlarged",
          "solutionSteps": [
            "[1 mark] Diagram: concave mirror with P, F, C marked; object between F and C; two correct incident rays (parallel to axis; through F or C)",
            "[1 mark] Diagram: correct reflected rays (through F; parallel to axis/retracing) with arrows meeting beyond C",
            "[1 mark] Image position beyond C and nature: real, inverted, enlarged"
          ]
        },
        {
          "id": "S-LIGHT-6",
          "text": "An object is placed 30 cm in front of concave mirror of focal length 15 cm. Find image position using mirror formula.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "Using New Cartesian sign convention: u = −30 cm, f = −15 cm (concave mirror). Mirror formula: 1/v + 1/u = 1/f ⇒ 1/v = 1/f − 1/u = 1/(−15) − 1/(−30) = −1/15 + 1/30 = (−2 + 1)/30 = −1/30. So v = −30 cm. The image is formed 30 cm in front of the mirror (at the centre of curvature, C); it is real, inverted and of the same size as the object (m = −v/u = −1).",
          "finalAnswer": "v = −30 cm (30 cm in front of mirror, at C; real, inverted, same size)",
          "solutionSteps": [
            "[1 mark] Sign convention: u = −30 cm, f = −15 cm; mirror formula 1/v + 1/u = 1/f.",
            "[1 mark] Substitution: 1/v = 1/f − 1/u = −1/15 + 1/30 = −1/30.",
            "[1 mark] v = −30 cm: image 30 cm in front of the mirror (at C), real and inverted (same size)."
          ]
        },
        {
          "id": "S-LIGHT-7",
          "text": "Define power of lens and state its SI unit.",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective",
          "answer": "Power of a lens is the degree of convergence or divergence of light rays achieved by the lens. It is defined as the reciprocal of its focal length expressed in metres: P = 1/f (f in m). Its SI unit is the dioptre (D); 1 D is the power of a lens of focal length 1 m (1 D = 1 m⁻¹). Power of a convex lens is positive and of a concave lens is negative.",
          "finalAnswer": "P = 1/f (f in metres); SI unit dioptre (D)",
          "solutionSteps": [
            "[1 mark] Power of a lens is the degree of convergence/divergence of light it produces, equal to the reciprocal of its focal length in metres: P = 1/f.",
            "[1 mark] SI unit: dioptre (D); 1 D = 1 m⁻¹ (power of a lens of focal length 1 m)."
          ]
        },
        {
          "id": "S-LIGHT-8",
          "text": "A convex lens of focal length 20 cm forms image of object placed 30 cm in front of it. Find image distance (take appropriate sign convention).",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "Using New Cartesian sign convention: u = −30 cm, f = +20 cm. Lens formula: 1/v − 1/u = 1/f ⇒ 1/v = 1/f + 1/u = 1/20 + 1/(−30) = (3 − 2)/60 = 1/60. So v = +60 cm. The image is formed 60 cm on the other side of the lens; it is real and inverted.",
          "finalAnswer": "v = +60 cm (real, inverted, on other side of lens)",
          "solutionSteps": [
            "[1 mark] Given with signs: u = −30 cm, f = +20 cm; lens formula 1/v − 1/u = 1/f.",
            "[1 mark] Substitution: 1/v = 1/20 − 1/30 = 1/60.",
            "[1 mark] v = +60 cm; image is real, inverted, 60 cm behind the lens."
          ]
        },
        {
          "id": "S-LIGHT-9",
          "text": "Why does a pencil partly immersed in water appear bent at the surface?",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "Light from the immersed part of the pencil travels from water (optically denser) into air (optically rarer) and bends away from the normal at the water surface (refraction). The refracted rays appear to come from a point higher than the actual position, so the immersed part appears raised; hence the pencil appears bent (displaced) at the surface of water.",
          "finalAnswer": "Due to refraction of light at water–air boundary",
          "solutionSteps": [
            "[1 mark] Light from the immersed part passes from water (denser) to air (rarer) and bends away from the normal — refraction.",
            "[1 mark] The rays appear to come from a raised point, so the immersed part looks raised and the pencil appears bent at the surface."
          ]
        },
        {
          "id": "S-LIGHT-10",
          "text": "Mention any two uses each of concave mirror and convex mirror in daily life.",
          "marks": 3,
          "difficulty": "Easy",
          "questionType": "subjective",
          "answer": "Concave mirror: (i) used as shaving/make-up mirror to see an enlarged face; (ii) used as reflector in torches, vehicle headlights and searchlights to get powerful parallel beams of light (also used by dentists to see enlarged images of teeth, and in solar furnaces to concentrate sunlight).\nConvex mirror: (i) used as rear-view (wing) mirror in vehicles because it always gives an erect, diminished image and has a wider field of view; (ii) used at blind turns of roads and in shops/ATMs as security mirrors for a wide field of view.",
          "finalAnswer": "Concave: shaving mirror, headlights/torches; Convex: rear-view mirror, blind-turn/security mirror",
          "solutionSteps": [
            "[1.5 mark] Two uses of concave mirror: shaving/make-up mirror (enlarged image); reflector in torches/headlights/searchlights (or dentist's mirror, solar furnace).",
            "[1.5 mark] Two uses of convex mirror: rear-view mirror in vehicles (erect, diminished image, wider field of view); security mirror at blind turns/shops."
          ]
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
          "questionType": "subjective",
          "answer": "The iris controls the amount of light entering the eye by regulating the size of the pupil.",
          "finalAnswer": "Iris",
          "solutionSteps": [
            "[1 mark] Iris — it adjusts the size of the pupil to control the light entering the eye."
          ]
        },
        {
          "id": "S-EYE-2",
          "text": "Define far point and near point of a normal eye.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "Far point: the farthest point up to which the eye can see objects clearly; for a normal eye it is at infinity. Near point: the minimum distance at which objects can be seen most distinctly without strain; for a normal adult eye it is about 25 cm.",
          "finalAnswer": "Far point = infinity; near point = 25 cm",
          "solutionSteps": [
            "[1 mark] Far point: farthest point up to which the eye can see clearly; at infinity for a normal eye.",
            "[1 mark] Near point (least distance of distinct vision): closest point at which objects are seen clearly without strain; about 25 cm for a normal eye."
          ]
        },
        {
          "id": "S-EYE-3",
          "text": "What is myopia? State its cause and correction briefly.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "Myopia (near-sightedness) is a defect of vision in which a person can see nearby objects clearly but cannot see distant objects distinctly; the image of a distant object is formed in front of the retina (far point is less than infinity).\nCauses: (i) excessive curvature of the eye lens, (ii) elongation of the eyeball.\nCorrection: by using a concave (diverging) lens of suitable power, which brings the image back onto the retina.",
          "finalAnswer": "Near-sightedness; caused by excessive curvature of eye lens/elongated eyeball; corrected by concave lens",
          "solutionSteps": [
            "[1 mark] Myopia: near objects seen clearly, distant objects not; image forms in front of retina",
            "[1 mark] Cause: excessive curvature of eye lens or elongation of eyeball",
            "[1 mark] Correction: concave lens of suitable power"
          ]
        },
        {
          "id": "S-EYE-4",
          "text": "What is hypermetropia? Which lens is used to correct it?",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective",
          "answer": "Hypermetropia (far-sightedness) is the defect of vision in which a person can see distant objects clearly but cannot see nearby objects distinctly; the near point is farther than 25 cm and the image is formed behind the retina. It is caused by too long a focal length of the eye lens or the eyeball being too small. It is corrected using a convex (converging) lens of suitable power.",
          "finalAnswer": "Far-sightedness; corrected by a convex (converging) lens",
          "solutionSteps": [
            "[1 mark] Hypermetropia: nearby objects not seen clearly, near point beyond 25 cm, image formed behind the retina.",
            "[1 mark] Corrected using a convex (converging) lens of suitable power."
          ]
        },
        {
          "id": "S-EYE-5",
          "text": "State conditions necessary for formation of rainbow in the sky.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "A rainbow forms when: (i) there are tiny water droplets suspended in the air (just after rain); (ii) the Sun is behind the observer and the observer faces the droplets, i.e. the rainbow is seen in the direction opposite to the Sun. The droplets act as small prisms, causing refraction, dispersion and total internal reflection of sunlight.",
          "finalAnswer": "Water droplets in air; Sun behind the observer",
          "solutionSteps": [
            "[1 mark] Tiny water droplets must be present in the atmosphere (after a shower), which act as prisms (refraction, dispersion, internal reflection)",
            "[1 mark] The Sun must be behind the observer; rainbow is seen opposite to the Sun"
          ]
        },
        {
          "id": "S-EYE-7",
          "text": "What is atmospheric refraction? Give one example to illustrate it.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "Atmospheric refraction is the refraction of light by the Earth's atmosphere, caused by layers of air having different (gradually changing) optical densities/refractive indices, so that light bends as it passes through them. Example: twinkling of stars — starlight entering the atmosphere is continuously refracted by layers of varying refractive index; since the physical conditions of the atmosphere keep changing, the apparent position and the amount of starlight entering the eye flicker, so the star appears to twinkle. (Other examples: advance sunrise and delayed sunset by about 2 minutes; stars appearing higher than their actual position.)",
          "finalAnswer": "Refraction of light by atmospheric layers of varying refractive index; e.g. twinkling of stars",
          "solutionSteps": [
            "[1 mark] Definition: refraction of light by the Earth's atmosphere due to air layers of gradually changing optical density (refractive index).",
            "[1 mark] Example with explanation: twinkling of stars (or advance sunrise and delayed sunset) — varying refraction makes the apparent position/brightness of the star fluctuate."
          ]
        },
        {
          "id": "S-EYE-8",
          "text": "Explain why danger signals are red in colour.",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective",
          "answer": "Danger signals are red because red light has the longest wavelength in the visible spectrum. Scattering of light by fine particles (fog, smoke, dust) is least for longer wavelengths, so red light is scattered the least. It therefore travels the longest distance through fog or smoke without fading and can be seen clearly from far away.",
          "finalAnswer": "Red has the longest wavelength, so it is scattered least by fog/smoke and is visible from a distance",
          "solutionSteps": [
            "[1 mark] Red light has the longest wavelength among visible colours.",
            "[1 mark] Hence it is least scattered by fog/smoke/dust particles and can be seen clearly from a long distance."
          ]
        },
        {
          "id": "S-EYE-9",
          "text": "What is persistence of vision and how does it help in watching movies?",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "Persistence of vision: the impression of an image on the retina persists for about 1/16th of a second after the object is removed from view. In movies, still pictures are projected in quick succession (about 24 frames per second). Since each new frame appears before the impression of the previous one fades, the eye sees the frames as continuous motion.",
          "finalAnswer": "Image persists on retina ~1/16 s; rapid frames appear as continuous motion",
          "solutionSteps": [
            "[1 mark] Definition: the sensation of an image persists on the retina for about 1/16 s after the object is removed.",
            "[1 mark] Movies: successive still frames (~24 per second) are shown faster than this time, so they merge and appear as continuous motion."
          ]
        },
        {
          "id": "S-EYE-10",
          "text": "Explain reason for advanced sunrise and delayed sunset as seen from Earth.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "This is due to atmospheric refraction. The Earth's atmosphere is optically denser near the surface and rarer higher up. When the Sun is slightly below the horizon, its light entering the atmosphere is refracted (bent towards the normal) progressively as it passes into denser layers, curving towards the Earth's surface. An observer therefore sees the Sun at an apparent position above its actual position, i.e. the Sun is visible even when it is slightly below the horizon. So the Sun is seen about 2 minutes before actual sunrise and for about 2 minutes after actual sunset — the time from sunrise to sunset increases by about 4 minutes.",
          "finalAnswer": "Atmospheric refraction; Sun visible ~2 min before actual sunrise and ~2 min after actual sunset",
          "solutionSteps": [
            "[1 mark] Cause: atmospheric refraction — air density (refractive index) increases towards the Earth's surface.",
            "[1 mark] Sunlight from the Sun just below the horizon bends towards the Earth on passing through denser layers, so the Sun's apparent position is above the horizon.",
            "[1 mark] Hence the Sun is seen ~2 minutes before actual sunrise and ~2 minutes after actual sunset (day lengthened by ~4 minutes)."
          ]
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
          "questionType": "subjective",
          "answer": "Magnetic field lines never intersect each other (because if they did, there would be two directions of the magnetic field at one point, which is not possible). Other properties: they are closed continuous curves, emerging from the north pole and merging at the south pole outside the magnet; they are crowded where the field is stronger.",
          "finalAnswer": "Magnetic field lines never intersect each other",
          "solutionSteps": [
            "[1 mark] Any one property, e.g. magnetic field lines never intersect / they are closed curves going from N to S outside the magnet / crowded where field is strong."
          ]
        },
        {
          "id": "S-MAG-2",
          "text": "What is right-hand thumb rule? State its use.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "Right-hand thumb rule: Imagine holding a current-carrying straight conductor in the right hand such that the thumb points in the direction of current; then the direction in which the fingers wrap around the conductor gives the direction of the magnetic field lines. Use: it is used to find the direction of the magnetic field (field lines) around a current-carrying straight conductor (also for a circular loop/solenoid).",
          "finalAnswer": "Thumb along current, curled fingers give direction of magnetic field; used to find field direction around a current-carrying conductor.",
          "solutionSteps": [
            "[1 mark] Statement: hold the straight conductor in the right hand with the thumb pointing along the current; the curled fingers give the direction of the magnetic field lines.",
            "[1 mark] Use: to find the direction of the magnetic field around a current-carrying straight conductor."
          ]
        },
        {
          "id": "S-MAG-3",
          "text": "Name rule used to find direction of force on a current-carrying conductor placed in magnetic field.",
          "marks": 1,
          "difficulty": "Easy",
          "questionType": "subjective",
          "answer": "Fleming's left-hand rule: stretch the thumb, forefinger and middle finger of the left hand mutually perpendicular; if the forefinger points along the magnetic field and the middle finger along the current, the thumb gives the direction of force (motion) on the conductor.",
          "finalAnswer": "Fleming's left-hand rule",
          "solutionSteps": [
            "[1 mark] Fleming's left-hand rule."
          ]
        },
        {
          "id": "S-MAG-4",
          "text": "Write two factors on which magnetic field produced by current-carrying solenoid depends.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "The magnetic field produced by a current-carrying solenoid depends on: (i) the number of turns in the solenoid — more turns, stronger field; (ii) the strength of current flowing through it — larger current, stronger field. (Also on the nature of core material, e.g. a soft iron core increases the field.)",
          "finalAnswer": "Number of turns and magnitude of current",
          "solutionSteps": [
            "[1 mark] Number of turns of the coil — field increases with number of turns",
            "[1 mark] Strength of current — field increases with current"
          ]
        },
        {
          "id": "S-MAG-8",
          "text": "State difference between direct current (DC) and alternating current (AC) in two points.",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective",
          "answer": "(i) Direct current (DC) flows in one direction only, whereas alternating current (AC) reverses its direction periodically (in India every 1/100 s, frequency 50 Hz). (ii) DC is obtained from cells/batteries, whereas AC is supplied by power stations to homes; AC can be transmitted over long distances without much loss of energy, DC cannot.",
          "finalAnswer": "DC flows in one direction; AC reverses direction periodically (50 Hz in India)",
          "solutionSteps": [
            "[1 mark] DC flows in one direction only; AC reverses direction periodically (50 Hz in India).",
            "[1 mark] Second valid point: DC from cells/batteries vs AC from power stations / AC transmitted over long distances with less loss."
          ]
        },
        {
          "id": "S-MAG-9",
          "text": "What is role of fuse in domestic circuit? Why is its wire always placed in live wire?",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "A fuse is a safety device that protects circuits and appliances from overloading and short-circuiting. It is a wire of a material with low melting point. When an unduly high current flows, the fuse wire heats up (Joule heating), melts and breaks the circuit, stopping the current. It is placed in the live wire so that when it blows, the appliance is disconnected from the high-potential live wire; if it were in the neutral wire, the appliance would remain connected to the live wire even after the fuse blows, risking electric shock.",
          "finalAnswer": "Fuse cuts off excess current by melting; in live wire so appliance is disconnected from supply when it blows",
          "solutionSteps": [
            "[1 mark] Role: safety device that prevents damage to circuit/appliances due to overloading or short-circuiting",
            "[1 mark] Working: low melting point wire melts due to heating when excessive current flows and breaks the circuit",
            "[1 mark] Placed in live wire so the appliance gets disconnected from the high-potential supply when the fuse blows; otherwise the appliance stays live and can give shock"
          ]
        },
        {
          "id": "S-MAG-10",
          "text": "Why is earthing provided in domestic wiring?",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective",
          "answer": "Earthing is a safety measure. The earth wire (green insulation) connects the metallic body of appliances like electric iron, toaster, fridge to a metal plate buried deep in the earth. If, due to leakage of current or a fault in insulation, the metal body becomes live, the earth wire provides a low-resistance conducting path for the current to flow to the earth. This keeps the body of the appliance at the potential of the earth, so the user does not get a severe electric shock.",
          "finalAnswer": "Provides a low-resistance path for leakage current to earth, keeping metal body at earth potential and preventing shock",
          "solutionSteps": [
            "[1 mark] The earth wire connects the metallic body of the appliance to the earth and provides a low-resistance conducting path for any leakage current.",
            "[1 mark] This keeps the metallic body at the earth's potential (zero), so the user is protected from a severe electric shock."
          ]
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
          "questionType": "subjective",
          "answer": "An ecosystem is a self-sustaining functional unit consisting of all the biotic components (living organisms – plants, animals, micro-organisms) of an area together with the abiotic components (physical factors like temperature, rainfall, wind, soil, minerals), interacting with each other. Example: a pond, forest, lake (natural) or a garden, crop field, aquarium (artificial).",
          "finalAnswer": "Biotic + abiotic components of an area interacting together; e.g. pond / forest / aquarium",
          "solutionSteps": [
            "[1 mark] Definition: all the living (biotic) organisms of an area together with the non-living (abiotic) factors, interacting with each other, form an ecosystem.",
            "[1 mark] Example: pond, forest or lake (natural) / garden, crop field or aquarium (artificial)."
          ]
        },
        {
          "id": "S-ENV-2",
          "text": "Distinguish between producers and consumers with one example each.",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective",
          "answer": "Producers are organisms that make their own food from simple inorganic substances using sunlight (photosynthesis), e.g. green plants, algae. Consumers are organisms that cannot make their own food and depend directly or indirectly on producers for food, e.g. herbivores like deer (also carnivores like lion).",
          "finalAnswer": "Producers make own food (green plants); consumers depend on others (deer, lion)",
          "solutionSteps": [
            "[1 mark] Producers: autotrophs that make food by photosynthesis — e.g. green plants.",
            "[1 mark] Consumers: heterotrophs that depend on producers directly or indirectly — e.g. deer / lion."
          ]
        },
        {
          "id": "S-ENV-3",
          "text": "What is 10% law of energy transfer? Explain briefly.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "The 10% law states that only about 10% of the energy available at one trophic level is transferred to (available as food for) the next trophic level. Explanation: green plants capture about 1% of the sunlight falling on leaves; at each level most of the energy is used for life processes (respiration, movement) or lost as heat, so only ~10% is stored in body and passed on. E.g. 1000 J in plants → 100 J herbivores → 10 J carnivores. Hence food chains usually have only 3–4 trophic levels.",
          "finalAnswer": "Only ~10% of energy at one trophic level passes to the next",
          "solutionSteps": [
            "[1 mark] Statement: only about 10% of the energy of one trophic level is transferred to the next trophic level.",
            "[1 mark] Explanation: the rest is used in life processes/lost as heat; e.g. 1000 J → 100 J → 10 J, so food chains have only 3–4 levels."
          ]
        },
        {
          "id": "S-ENV-4",
          "text": "What is biological magnification? State its effect on human beings.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "Biological magnification is the progressive increase in the concentration of non-biodegradable harmful chemicals (such as pesticides like DDT) at successive trophic levels of a food chain. Effect on humans: since humans occupy the top level of many food chains, the maximum concentration of these chemicals accumulates in our bodies (through food such as grains, vegetables, fish), causing harmful effects/diseases (damage to organs, nervous system, etc.).",
          "finalAnswer": "Increasing concentration of non-biodegradable chemicals along trophic levels; humans at top accumulate maximum, harming health",
          "solutionSteps": [
            "[1 mark] Definition: progressive increase in concentration of non-biodegradable chemicals (e.g. DDT, pesticides) at each successive trophic level of a food chain.",
            "[1 mark] Effect: humans at the top of the food chain accumulate the maximum concentration of these chemicals, which harms health (diseases, organ damage)."
          ]
        },
        {
          "id": "S-ENV-5",
          "text": "Give one reason each: (a) energy flow is unidirectional, (b) food chains are usually short.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "(a) Energy flow is unidirectional because the energy captured by autotrophs (producers) does not revert to the Sun, and the energy passed to herbivores does not come back to autotrophs; it moves progressively from one trophic level to the next and is not available to the previous level. (b) Food chains are usually short (3–4 trophic levels) because only about 10% of the energy is transferred from one trophic level to the next (10% law); the rest is lost as heat or used in life processes, so after a few levels the available energy is too little to support another trophic level.",
          "finalAnswer": "(a) Energy passed to a higher trophic level never returns to the lower one. (b) Only ~10% energy passes to the next level, so little energy remains after 3–4 levels.",
          "solutionSteps": [
            "[1.5 mark] (a) Energy captured by producers does not revert to the Sun and energy passed to herbivores does not return to producers — it flows only to the next trophic level.",
            "[1.5 mark] (b) Only about 10% of energy is transferred to the next trophic level (rest lost as heat/used in life processes), so after 3–4 levels too little energy is left to support another level."
          ]
        },
        {
          "id": "S-ENV-6",
          "text": "Differentiate between biodegradable and non-biodegradable wastes with one example each.",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective",
          "answer": "Biodegradable wastes are substances that can be broken down into simpler harmless substances by the action of decomposers (bacteria, fungi), e.g. vegetable peels, paper, cotton. Non-biodegradable wastes cannot be broken down by biological processes/decomposers and persist in the environment for a long time, e.g. plastics, polythene, glass, DDT.",
          "finalAnswer": "Biodegradable: broken down by decomposers (e.g. vegetable peels); non-biodegradable: not broken down (e.g. plastic)",
          "solutionSteps": [
            "[1 mark] Biodegradable: broken down by decomposers (bacteria/fungi) into harmless substances; example — vegetable/fruit peels.",
            "[1 mark] Non-biodegradable: not broken down by biological processes, persist in environment; example — plastic/polythene."
          ]
        },
        {
          "id": "S-ENV-7",
          "text": "Explain how use of non-biodegradable pesticides affects food chain.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "Non-biodegradable pesticides are not broken down by decomposers. When sprayed on crops, they are washed into the soil and water bodies, and are absorbed by plants (producers) along with water and minerals. From plants they enter the food chain. Since they cannot be degraded or excreted, they accumulate progressively at each trophic level. This increase in concentration of harmful chemicals at successive trophic levels is called biological magnification. Organisms at the top of the food chain (e.g. human beings) therefore get the maximum concentration, which harms their health.",
          "finalAnswer": "They accumulate and increase at each trophic level — biological magnification",
          "solutionSteps": [
            "[1 mark] Pesticides are non-biodegradable; they reach soil and water and are absorbed by plants",
            "[1 mark] They enter the food chain and accumulate at each trophic level as they cannot be degraded",
            "[1 mark] Biological magnification — maximum concentration in top consumers such as humans"
          ]
        },
        {
          "id": "S-ENV-8",
          "text": "Draw a simple food chain from grass to eagle (or write in words).",
          "marks": 1,
          "difficulty": "Easy",
          "questionType": "subjective",
          "answer": "Grass → Grasshopper → Frog → Snake → Eagle",
          "finalAnswer": "Grass → Grasshopper → Frog → Snake → Eagle",
          "solutionSteps": [
            "[1 mark] Correct food chain in order with arrows pointing towards the consumer: Grass → Grasshopper → Frog → Snake → Eagle (any valid sequence of producer to top consumer accepted)."
          ]
        },
        {
          "id": "S-ENV-9",
          "text": "Why are bacteria and fungi called decomposers? What is their importance?",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "Bacteria and fungi are called decomposers because they break down the complex organic substances of dead plants, animals and their wastes into simple inorganic substances. Importance: (i) they return nutrients to the soil, so they can be reused by plants (recycling of nutrients); (ii) they clean the environment by removing dead remains and wastes; (iii) they help in maintaining the balance/flow of matter in the ecosystem.",
          "finalAnswer": "They break down dead organic matter into simple substances; recycle nutrients and clean the environment",
          "solutionSteps": [
            "[1 mark] They break down complex organic matter of dead organisms and wastes into simple inorganic substances",
            "[1 mark] Importance 1: return/replenish nutrients to soil for reuse by plants (nutrient recycling)",
            "[1 mark] Importance 2: clean the environment by decomposing dead bodies and wastes"
          ]
        },
        {
          "id": "S-ENV-10",
          "text": "Suggest any two ways students can contribute to environmental protection in school.",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective",
          "answer": "Students can: (i) practise the 3 Rs — reduce use of paper and plastic, reuse notebooks/one-side-used sheets and bottles, recycle waste; (ii) segregate waste into biodegradable (green bin) and non-biodegradable (blue bin) in school, and compost biodegradable waste such as leftover food and leaves. Other valid ways: plant and care for trees; switch off fans and lights when not in use; turn off taps to save water; avoid plastic bags.",
          "finalAnswer": "e.g. practise the 3 Rs (reduce, reuse, recycle); segregate biodegradable and non-biodegradable waste",
          "solutionSteps": [
            "[1 mark] Way 1: practise the 3 Rs — reduce, reuse and recycle (e.g. reuse paper, avoid single-use plastic).",
            "[1 mark] Way 2: segregate biodegradable and non-biodegradable waste in separate bins (or save electricity/water, plant trees)."
          ]
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
            "text": "[MCQ — Competency-based] Which of the following is an irrational number? (a) √4 (b) √9/√16 (c) √5 (d) 0.333...",
            "marks": 1,
            "difficulty": "Easy",
            "questionType": "MCQ",
            "answer": "√4 = 2 (rational); √9/√16 = 3/4 (rational); 0.333... = 1/3 (rational, non-terminating repeating). √5 is irrational since 5 is not a perfect square. Answer: (c) √5.",
            "finalAnswer": "(c) √5",
            "solutionSteps": [
              "[1 mark] √4 = 2, √9/√16 = 3/4 and 0.333… = 1/3 are rational; √5 is irrational since 5 is not a perfect square — option (c)."
            ]
          },
          {
            "id": "M-REAL-2",
            "text": "Prove that 3 + 2√5 is irrational, given that √5 is irrational.",
            "marks": 2,
            "difficulty": "Medium",
            "questionType": "subjective",
            "answer": "Assume, to the contrary, that 3 + 2√5 is rational. Then 3 + 2√5 = a/b, where a, b are co-prime integers and b ≠ 0. So 2√5 = a/b − 3 ⇒ √5 = (a − 3b)/(2b). Since a, b are integers, (a − 3b)/(2b) is rational, so √5 would be rational. This contradicts the given fact that √5 is irrational. Hence 3 + 2√5 is irrational.",
            "finalAnswer": "3 + 2√5 is irrational (by contradiction)",
            "solutionSteps": [
              "[1 mark] Assume 3 + 2√5 = a/b (a, b co-prime integers, b ≠ 0) and rearrange: √5 = (a − 3b)/(2b).",
              "[1 mark] RHS is rational ⇒ √5 rational, contradicting given fact; hence 3 + 2√5 is irrational."
            ]
          },
          {
            "id": "M-REAL-3",
            "text": "Find the HCF and LCM of 96 and 360 using the prime factorisation method. Verify that HCF × LCM = product of the two numbers.",
            "marks": 3,
            "difficulty": "Medium",
            "questionType": "subjective",
            "answer": "96 = 2⁵ × 3; 360 = 2³ × 3² × 5. HCF = product of smallest powers of common primes = 2³ × 3 = 24. LCM = product of greatest powers of all primes = 2⁵ × 3² × 5 = 1440. Verification: HCF × LCM = 24 × 1440 = 34560; product of numbers = 96 × 360 = 34560. Hence HCF × LCM = product of the two numbers.",
            "finalAnswer": "HCF = 24, LCM = 1440; 24 × 1440 = 34560 = 96 × 360",
            "solutionSteps": [
              "[1 mark] Prime factorisation: 96 = 2⁵ × 3, 360 = 2³ × 3² × 5.",
              "[1 mark] HCF = 2³ × 3 = 24; LCM = 2⁵ × 3² × 5 = 1440.",
              "[1 mark] Verification: 24 × 1440 = 34560 = 96 × 360."
            ]
          },
          {
            "id": "M-REAL-4",
            "text": "Express 392 as a product of prime factors and hence find the HCF of 392 and 252.",
            "marks": 3,
            "difficulty": "Medium",
            "questionType": "subjective",
            "answer": "392 = 2 × 196 = 2 × 2 × 98 = 2 × 2 × 2 × 49 = 2³ × 7².\n252 = 2 × 126 = 2 × 2 × 63 = 2² × 3² × 7.\nHCF = product of smallest powers of common prime factors = 2² × 7 = 28.",
            "finalAnswer": "392 = 2³ × 7²; HCF(392, 252) = 28",
            "solutionSteps": [
              "[1 mark] 392 = 2³ × 7².",
              "[1 mark] 252 = 2² × 3² × 7.",
              "[1 mark] HCF = 2² × 7 = 28."
            ]
          },
          {
            "id": "M-REAL-5",
            "text": "[Competency-based — Higher Order Thinking] Prove that √5 is an irrational number.",
            "marks": 3,
            "difficulty": "Hard",
            "questionType": "subjective",
            "answer": "Assume, to the contrary, that √5 is rational. Then √5 = a/b, where a, b are co-prime integers and b ≠ 0. So a = √5 b ⇒ a² = 5b². Hence 5 divides a², and since 5 is prime, 5 divides a. Let a = 5c. Then 25c² = 5b² ⇒ b² = 5c², so 5 divides b², hence 5 divides b. Thus 5 is a common factor of a and b, contradicting that a and b are co-prime. Hence our assumption is wrong, and √5 is irrational.",
            "finalAnswer": "√5 is irrational (proved by contradiction).",
            "solutionSteps": [
              "[1 mark] Assume √5 = a/b with a, b co-prime integers, b ≠ 0; squaring gives a² = 5b², so 5 | a² ⇒ 5 | a.",
              "[1 mark] Put a = 5c: 25c² = 5b² ⇒ b² = 5c², so 5 | b² ⇒ 5 | b.",
              "[1 mark] 5 is a common factor of a and b — contradiction with co-primeness; hence √5 is irrational."
            ]
          },
          {
            "id": "M-REAL-7",
            "text": "Prove that √3 is an irrational number.",
            "marks": 2,
            "difficulty": "Medium",
            "questionType": "subjective",
            "answer": "Assume, to the contrary, that √3 is rational. Then √3 = a/b, where a, b are integers, b ≠ 0, and a, b are coprime. Squaring: 3b² = a², so 3 divides a², hence 3 divides a (3 is prime). Let a = 3c. Then 3b² = 9c² ⇒ b² = 3c², so 3 divides b², hence 3 divides b. Thus 3 is a common factor of a and b, contradicting that a and b are coprime. Hence √3 is irrational.",
            "finalAnswer": "√3 is irrational (proof by contradiction)",
            "solutionSteps": [
              "[1 mark] Assume √3 = a/b (a, b coprime integers, b ≠ 0); squaring gives a² = 3b², so 3 | a²  ⇒ 3 | a; write a = 3c.",
              "[1 mark] Then b² = 3c² ⇒ 3 | b, so 3 is a common factor of a and b — contradiction; hence √3 is irrational."
            ]
          },
          {
            "id": "M-REAL-8",
            "text": "[Competency-based] If HCF of two numbers is 9 and their product is 1458, find their LCM. Also verify using HCF × LCM = product.",
            "marks": 2,
            "difficulty": "Easy",
            "questionType": "MCQ",
            "answer": "For two numbers, HCF × LCM = product of the numbers.\nLCM = 1458 / 9 = 162.\nVerification: HCF × LCM = 9 × 162 = 1458 = product of the numbers. Verified.",
            "finalAnswer": "LCM = 162",
            "solutionSteps": [
              "[1 mark] Using HCF × LCM = product: LCM = 1458/9 = 162",
              "[1 mark] Verification: 9 × 162 = 1458 = product"
            ]
          },
          {
            "id": "M-REAL-9",
            "text": "Prove that if p is a prime and p divides a², then p divides a.",
            "marks": 2,
            "difficulty": "Medium",
            "questionType": "subjective",
            "answer": "Let the prime factorisation of a be a = p₁p₂…pₙ, where p₁, p₂, …, pₙ are primes (not necessarily distinct). Then a² = (p₁p₂…pₙ)(p₁p₂…pₙ) = p₁²p₂²…pₙ². Given p divides a². By the Fundamental Theorem of Arithmetic, the prime factorisation of a² is unique, so the only prime factors of a² are p₁, p₂, …, pₙ. Hence p is one of p₁, p₂, …, pₙ. Since a = p₁p₂…pₙ, p divides a. Hence proved.",
            "finalAnswer": "p divides a (proved using the Fundamental Theorem of Arithmetic)",
            "solutionSteps": [
              "[1 mark] Writing a = p₁p₂…pₙ and a² = p₁²p₂²…pₙ².",
              "[1 mark] By uniqueness of prime factorisation (FTA), the prime p dividing a² must be one of p₁,…,pₙ, hence p divides a."
            ]
          },
          {
            "id": "M-REAL-10",
            "text": "[Case-Based — Competency-based] Three bells ring at intervals of 12, 15, and 18 minutes respectively. They ring together at 8:00 AM. (i) Find the LCM of 12, 15, and 18. (ii) After how many minutes will they ring together again? (iii) How many times will they ring together between 8:00 AM and 12:00 PM (excluding 8:00 AM)?",
            "marks": 4,
            "difficulty": "Hard",
            "questionType": "case-based",
            "answer": "(i) 12 = 2²×3, 15 = 3×5, 18 = 2×3². LCM = 2²×3²×5 = 180. (ii) They ring together again after 180 minutes = 3 hours, i.e. at 11:00 AM. (iii) Between 8:00 AM and 12:00 PM (240 min), common rings occur at multiples of 180 min after 8:00 AM: 11:00 AM only (next at 2:00 PM). So they ring together 1 time.",
            "finalAnswer": "(i) 180 (ii) 180 minutes (iii) 1 time (at 11:00 AM)",
            "solutionSteps": [
              "[1 mark] (i) Prime factorisation 12 = 2²×3, 15 = 3×5, 18 = 2×3²; LCM = 2²×3²×5 = 180",
              "[1 mark] (ii) They ring together again after 180 minutes (3 hours), at 11:00 AM",
              "[1 mark] (iii) Interval 8:00 AM–12:00 PM = 240 min; common rings at 180-min multiples: 180 ≤ 240 < 360",
              "[1 mark] (iii) Hence they ring together only once (at 11:00 AM)"
            ]
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
          "questionType": "subjective",
          "answer": "The highest power of x in 7x^4 − 3x^2 + 5x − 11 is 4, so the degree of the polynomial is 4 (it is a biquadratic polynomial).",
          "finalAnswer": "4",
          "solutionSteps": [
            "[1 mark] The highest power of x is 4, so the degree is 4."
          ]
        },
        {
          "id": "M-POLY-2",
          "text": "If one zero of the polynomial x^2 − 5x + 6 is 2, find the other zero.",
          "marks": 1,
          "difficulty": "Easy",
          "questionType": "subjective",
          "answer": "For x² − 5x + 6, sum of zeroes = −b/a = 5. Given one zero α = 2, the other zero β = 5 − 2 = 3. (Check: product = 2 × 3 = 6 = c/a.)",
          "finalAnswer": "3",
          "solutionSteps": [
            "[1 mark] Sum of zeroes = −(−5)/1 = 5, so the other zero = 5 − 2 = 3."
          ]
        },
        {
          "id": "M-POLY-3",
          "text": "For the quadratic polynomial 2x^2 − 7x + 3, find the sum and product of its zeroes.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "For ax² + bx + c with a = 2, b = −7, c = 3: Sum of zeroes = −b/a = −(−7)/2 = 7/2. Product of zeroes = c/a = 3/2. (Check: 2x² − 7x + 3 = (2x − 1)(x − 3), zeroes 1/2 and 3; sum 7/2, product 3/2.)",
          "finalAnswer": "Sum = 7/2, Product = 3/2",
          "solutionSteps": [
            "[1 mark] Sum of zeroes = −b/a = 7/2.",
            "[1 mark] Product of zeroes = c/a = 3/2."
          ]
        },
        {
          "id": "M-POLY-4",
          "text": "Find a quadratic polynomial whose zeroes are 3 and −2.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "Sum of zeroes = 3 + (−2) = 1; product of zeroes = 3 × (−2) = −6. Required polynomial = k[x² − (sum)x + product] = k(x² − x − 6); taking k = 1, p(x) = x² − x − 6.",
          "finalAnswer": "x² − x − 6 (or k(x² − x − 6), k ≠ 0)",
          "solutionSteps": [
            "[1 mark] Sum of zeroes = 1, product of zeroes = −6.",
            "[1 mark] Polynomial = x² − (sum)x + product = x² − x − 6."
          ]
        },
        {
          "id": "M-POLY-5",
          "text": "Given that one zero of polynomial 2x^2 + kx + 3 is 1, find the value of k and the other zero.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "Let p(x) = 2x² + kx + 3. Since 1 is a zero, p(1) = 0: 2 + k + 3 = 0 ⇒ k = −5.\nSo p(x) = 2x² − 5x + 3. Product of zeros = c/a = 3/2, so 1 × β = 3/2 ⇒ β = 3/2.\n(Check: sum = 1 + 3/2 = 5/2 = −b/a.)",
          "finalAnswer": "k = −5; other zero = 3/2",
          "solutionSteps": [
            "[1 mark] p(1) = 0 ⇒ 2 + k + 3 = 0.",
            "[1 mark] k = −5, so p(x) = 2x² − 5x + 3.",
            "[1 mark] Product of zeros = 3/2 ⇒ 1·β = 3/2 ⇒ other zero = 3/2."
          ]
        },
        {
          "id": "M-POLY-6",
          "text": "If α and β are zeroes of 3x^2 − 2x + 1, find the polynomial whose zeroes are 1/α and 1/β.",
          "marks": 3,
          "difficulty": "Hard",
          "questionType": "subjective",
          "answer": "For 3x² − 2x + 1: α + β = −(−2)/3 = 2/3 and αβ = 1/3. Sum of new zeroes = 1/α + 1/β = (α + β)/αβ = (2/3)/(1/3) = 2. Product = 1/(αβ) = 3. Required polynomial = k[x² − (sum)x + product] = k(x² − 2x + 3), k ≠ 0; e.g. x² − 2x + 3.",
          "finalAnswer": "x² − 2x + 3 (or k(x² − 2x + 3))",
          "solutionSteps": [
            "[1 mark] α + β = 2/3, αβ = 1/3.",
            "[1 mark] 1/α + 1/β = (α+β)/αβ = 2 and (1/α)(1/β) = 1/αβ = 3.",
            "[1 mark] Required polynomial: x² − 2x + 3 (or any non-zero multiple k(x² − 2x + 3))."
          ]
        },
        {
          "id": "M-POLY-7",
          "text": "Draw a rough sketch of a graph of a cubic polynomial with three distinct real zeroes and explain how zeroes are seen from the graph.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "Rough sketch: the graph of a cubic p(x) = ax³ + bx² + cx + d (a > 0) starts from the bottom left, rises, turns down, turns up again and goes to the top right (an 'S'-shaped curve), cutting the x-axis at three distinct points, e.g. for p(x) = (x + 2)(x − 1)(x − 3) it cuts the x-axis at x = −2, 1 and 3. The zeroes of the polynomial are the x-coordinates of the points where the graph intersects the x-axis; since the curve meets the x-axis at three distinct points, the polynomial has three distinct real zeroes.",
          "finalAnswer": "Zeroes = x-coordinates of the 3 points where the curve cuts the x-axis",
          "solutionSteps": [
            "[1 mark] Correct rough sketch: S-shaped cubic curve cutting the x-axis at three distinct points (e.g. x = −2, 1, 3).",
            "[1 mark] Zeroes are the x-coordinates of the points where the graph intersects the x-axis; three intersections ⇒ three distinct real zeroes."
          ]
        },
        {
          "id": "M-POLY-8",
          "text": "If the graph of a quadratic polynomial intersects the x-axis at two distinct points, what can you say about its zeroes? Give reason.",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective",
          "answer": "The polynomial has two distinct real zeroes. Reason: the zeroes of a polynomial p(x) are the x-coordinates of the points where the graph of y = p(x) intersects the x-axis (there y = p(x) = 0). Since the graph cuts the x-axis at two distinct points, there are exactly two distinct real zeroes.",
          "finalAnswer": "Two distinct real zeroes",
          "solutionSteps": [
            "[1 mark] The quadratic polynomial has two distinct real zeroes",
            "[1 mark] Reason: zeroes are the x-coordinates of points where y = p(x) meets the x-axis"
          ]
        },
        {
          "id": "M-POLY-10",
          "text": "The zeroes of a quadratic polynomial are −1 and 4. Form the polynomial and verify the relation between coefficients and zeroes.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "Zeroes α = −1, β = 4. Sum α + β = 3, product αβ = −4. Required polynomial = k[x² − (α+β)x + αβ] = x² − 3x − 4 (taking k = 1). Verification: here a = 1, b = −3, c = −4. −b/a = 3 = α + β ✓; c/a = −4 = αβ ✓. Hence the relation between zeroes and coefficients is verified.",
          "finalAnswer": "p(x) = x² − 3x − 4 (or any non-zero multiple)",
          "solutionSteps": [
            "[1 mark] Sum of zeroes = 3, product of zeroes = −4.",
            "[1 mark] Polynomial = x² − (sum)x + product = x² − 3x − 4.",
            "[1 mark] Verification: −b/a = 3 = α + β and c/a = −4 = αβ."
          ]
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
          "questionType": "subjective",
          "answer": "The lines are parallel (no solution, inconsistent) if a1/a2 = b1/b2 ≠ c1/c2.",
          "finalAnswer": "a1/a2 = b1/b2 ≠ c1/c2",
          "solutionSteps": [
            "[1 mark] Condition for parallel lines: a1/a2 = b1/b2 ≠ c1/c2"
          ]
        },
        {
          "id": "M-PLE-2",
          "text": "Solve the pair: x + 2y = 7 and 3x − y = 5 using substitution method.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "x + 2y = 7 …(1), 3x − y = 5 …(2). From (1), x = 7 − 2y. Substituting in (2): 3(7 − 2y) − y = 5 ⇒ 21 − 6y − y = 5 ⇒ −7y = −16 ⇒ y = 16/7. Then x = 7 − 2(16/7) = 7 − 32/7 = 17/7. Check: 3(17/7) − 16/7 = 35/7 = 5 ✓. Solution: x = 17/7, y = 16/7.",
          "finalAnswer": "x = 17/7, y = 16/7",
          "solutionSteps": [
            "[1 mark] From x + 2y = 7, x = 7 − 2y; substituting in 3x − y = 5: 21 − 7y = 5 ⇒ y = 16/7.",
            "[1 mark] x = 7 − 32/7 = 17/7; solution x = 17/7, y = 16/7."
          ]
        },
        {
          "id": "M-PLE-3",
          "text": "Solve the pair: 2x + 3y = 13 and 3x − 2y = 4 using elimination method.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "2x + 3y = 13 …(1), 3x − 2y = 4 …(2). Multiply (1) by 2: 4x + 6y = 26 …(3). Multiply (2) by 3: 9x − 6y = 12 …(4). Adding (3) and (4): 13x = 38, so x = 38/13. Substituting in (1): 3y = 13 − 76/13 = 93/13, so y = 31/13. Check in (2): 3(38/13) − 2(31/13) = (114 − 62)/13 = 52/13 = 4 ✓. Solution: x = 38/13, y = 31/13.",
          "finalAnswer": "x = 38/13, y = 31/13",
          "solutionSteps": [
            "[1 mark] Make coefficients of y equal: (1)×2 gives 4x + 6y = 26 and (2)×3 gives 9x − 6y = 12.",
            "[1 mark] Add to eliminate y: 13x = 38, so x = 38/13.",
            "[1 mark] Substitute in (1): 3y = 13 − 76/13 = 93/13, so y = 31/13 (verified in (2))."
          ]
        },
        {
          "id": "M-PLE-4",
          "text": "For what value of k will the pair 3x + 4y = 10 and 6x + 8y = k have infinitely many solutions?",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "For infinitely many solutions, a₁/a₂ = b₁/b₂ = c₁/c₂. Here a₁/a₂ = 3/6 = 1/2, b₁/b₂ = 4/8 = 1/2, c₁/c₂ = 10/k. So 10/k = 1/2 ⇒ k = 20.",
          "finalAnswer": "k = 20",
          "solutionSteps": [
            "[1 mark] Condition: a₁/a₂ = b₁/b₂ = c₁/c₂, with 3/6 = 4/8 = 1/2.",
            "[1 mark] 10/k = 1/2 ⇒ k = 20."
          ]
        },
        {
          "id": "M-PLE-5",
          "text": "Graphically represent the pair 2x + y = 6 and 4x + 2y = 12 and comment on number of solutions.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "2x + y = 6 → y = 6 − 2x: points (0, 6), (1, 4), (3, 0). 4x + 2y = 12 → y = (12 − 4x)/2 = 6 − 2x: points (0, 6), (2, 2), (3, 0). Plotting, both lines pass through the same points, so the lines are coincident. Also a1/a2 = 2/4 = 1/2, b1/b2 = 1/2, c1/c2 = 6/12 = 1/2 — all equal. Hence the pair is consistent (dependent) and has infinitely many solutions.",
          "finalAnswer": "Coincident lines; infinitely many solutions",
          "solutionSteps": [
            "[1 mark] Table for 2x + y = 6: (0, 6), (3, 0), (1, 4); table for 4x + 2y = 12: (0, 6), (3, 0), (2, 2).",
            "[1 mark] Plotting the points gives the same straight line for both — the lines coincide (a1/a2 = b1/b2 = c1/c2 = 1/2).",
            "[1 mark] Conclusion: dependent/consistent pair with infinitely many solutions."
          ]
        },
        {
          "id": "M-PLE-6",
          "text": "The sum of two numbers is 27 and their difference is 5. Form a pair of linear equations and find the numbers.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "Let the numbers be x and y (x > y).\nx + y = 27 ...(1)\nx − y = 5 ...(2)\nAdding: 2x = 32 ⇒ x = 16. From (1): y = 27 − 16 = 11.\nThe numbers are 16 and 11.",
          "finalAnswer": "The numbers are 16 and 11",
          "solutionSteps": [
            "[1 mark] Equations: x + y = 27 and x − y = 5.",
            "[1 mark] Adding: 2x = 32 ⇒ x = 16.",
            "[1 mark] y = 11; numbers are 16 and 11."
          ]
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
          "text": "Ticket for a movie costs ₹120 for adults and ₹80 for children. If 25 tickets cost ₹2400, find number of adult and child tickets using linear equations.",
          "marks": 4,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "Let the number of adult tickets be x and child tickets be y. Then x + y = 25 …(1) and 120x + 80y = 2400 …(2). From (1), y = 25 − x. Substituting in (2): 120x + 80(25 − x) = 2400 ⇒ 40x + 2000 = 2400 ⇒ x = 10. Then y = 25 − 10 = 15. So 10 adult tickets and 15 child tickets.",
          "finalAnswer": "10 adult tickets and 15 child tickets",
          "solutionSteps": [
            "[1 mark] Forming the equations: x + y = 25 and 120x + 80y = 2400.",
            "[1 mark] Substituting y = 25 − x: 120x + 80(25 − x) = 2400 ⇒ 40x = 400.",
            "[1 mark] x = 10 (adult tickets).",
            "[1 mark] y = 25 − 10 = 15 (child tickets)."
          ]
        },
        {
          "id": "M-PLE-9",
          "text": "Check graphically whether pair 2x − 3y = 8 and 4x − 6y = 16 has unique, infinite or no solution.",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective",
          "answer": "2x − 3y = 8 → points: (4, 0), (1, −2), (−2, −4).\n4x − 6y = 16 → points: (4, 0), (1, −2), (−2, −4).\nBoth equations give the same points, so on plotting, the two lines coincide. (Check: a1/a2 = 2/4 = 1/2, b1/b2 = −3/−6 = 1/2, c1/c2 = 8/16 = 1/2.)\nHence the pair has infinitely many solutions (consistent, dependent).",
          "finalAnswer": "Coincident lines — infinitely many solutions",
          "solutionSteps": [
            "[1 mark] Tables of values: both lines pass through (4, 0), (1, −2), (−2, −4); plotted lines coincide",
            "[1 mark] Coincident lines ⇒ infinitely many solutions"
          ]
        },
        {
          "id": "M-PLE-10",
          "text": "The sum of two numbers is 18 and their difference is 6 (the larger number is double the smaller). Form a pair of linear equations and solve it.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "Let the number be y and its double be x (two numbers). Equations: x + y = 18 …(1) and x − y = 6 …(2). Adding (1) and (2): 2x = 24, so x = 12. Substituting in (1): y = 18 − 12 = 6. Check: 12 = 2 × 6, 12 + 6 = 18, 12 − 6 = 6. The numbers are 6 and 12 (the number is 6, its double is 12).",
          "finalAnswer": "Number = 6, its double = 12",
          "solutionSteps": [
            "[1 mark] Forming the equations x + y = 18 and x − y = 6.",
            "[1 mark] Solving (elimination/substitution): 2x = 24, x = 12.",
            "[1 mark] y = 6; the number is 6 and its double 12 (verified)."
          ]
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
          "questionType": "subjective",
          "answer": "Discriminant D = b² − 4ac. If D > 0: two distinct real roots; D = 0: two equal real roots; D < 0: no real roots. It thus indicates the nature of roots.",
          "finalAnswer": "D = b² − 4ac; determines nature of roots",
          "solutionSteps": [
            "[1 mark] D = b² − 4ac; Indicates nature of roots: D > 0 two distinct real, D = 0 two equal real, D < 0 no real roots"
          ]
        },
        {
          "id": "M-QUAD-2",
          "text": "Find the nature of roots of equation 4x^2 − 4x + 1 = 0.",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective",
          "answer": "Comparing 4x^2 − 4x + 1 = 0 with ax^2 + bx + c = 0: a = 4, b = −4, c = 1. Discriminant D = b^2 − 4ac = (−4)^2 − 4(4)(1) = 16 − 16 = 0. Since D = 0, the equation has two equal real roots (each x = −b/2a = 1/2).",
          "finalAnswer": "D = 0; two equal real roots (x = 1/2, 1/2)",
          "solutionSteps": [
            "[1 mark] a = 4, b = −4, c = 1; D = b^2 − 4ac = 16 − 16 = 0.",
            "[1 mark] Since D = 0, the roots are real and equal (x = 1/2)."
          ]
        },
        {
          "id": "M-QUAD-3",
          "text": "Solve x^2 − 7x + 10 = 0 by factorisation method.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "x² − 7x + 10 = 0. Split the middle term: −7x = −5x − 2x (since (−5)(−2) = 10 and −5 − 2 = −7). x² − 5x − 2x + 10 = 0 ⇒ x(x − 5) − 2(x − 5) = 0 ⇒ (x − 5)(x − 2) = 0. So x − 5 = 0 or x − 2 = 0, giving x = 5 or x = 2.",
          "finalAnswer": "x = 2, 5",
          "solutionSteps": [
            "[1 mark] Split the middle term and factorise: x² − 5x − 2x + 10 = (x − 5)(x − 2) = 0.",
            "[1 mark] Roots: x = 5 or x = 2."
          ]
        },
        {
          "id": "M-QUAD-4",
          "text": "Solve 3x^2 − 5x − 2 = 0 using quadratic formula.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "Here a = 3, b = −5, c = −2. D = b² − 4ac = 25 + 24 = 49 > 0. x = [−b ± √D]/(2a) = (5 ± 7)/6. So x = 12/6 = 2 or x = −2/6 = −1/3.",
          "finalAnswer": "x = 2, x = −1/3",
          "solutionSteps": [
            "[1 mark] Identify a = 3, b = −5, c = −2 and compute D = b² − 4ac = 49.",
            "[1 mark] x = (−b ± √D)/2a = (5 ± 7)/6.",
            "[1 mark] Roots: x = 2 and x = −1/3."
          ]
        },
        {
          "id": "M-QUAD-5",
          "text": "For what values of k will quadratic equation x^2 + kx + 9 = 0 have equal roots?",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "For equal roots, discriminant D = b² − 4ac = 0. Here a = 1, b = k, c = 9: k² − 4(1)(9) = 0 ⇒ k² = 36 ⇒ k = ±6.",
          "finalAnswer": "k = 6 or k = −6",
          "solutionSteps": [
            "[1 mark] Condition for equal roots: b² − 4ac = 0, with a = 1, b = k, c = 9.",
            "[1 mark] k² − 36 = 0 ⇒ k² = 36.",
            "[1 mark] k = ±6."
          ]
        },
        {
          "id": "M-QUAD-6",
          "text": "If α and β are roots of equation x^2 − 4x + 1 = 0, find the equation whose roots are α+1 and β+1.",
          "marks": 4,
          "difficulty": "Hard",
          "questionType": "subjective",
          "answer": "For x² − 4x + 1 = 0: α + β = 4, αβ = 1.\nSum of new roots = (α+1) + (β+1) = α + β + 2 = 6.\nProduct = (α+1)(β+1) = αβ + (α+β) + 1 = 1 + 4 + 1 = 6.\nRequired equation: x² − (sum)x + product = 0 ⇒ x² − 6x + 6 = 0.",
          "finalAnswer": "x² − 6x + 6 = 0",
          "solutionSteps": [
            "[1 mark] α + β = 4 and αβ = 1.",
            "[1 mark] Sum of new roots = α + β + 2 = 6.",
            "[1 mark] Product of new roots = αβ + α + β + 1 = 6.",
            "[1 mark] Required equation: x² − 6x + 6 = 0."
          ]
        },
        {
          "id": "M-QUAD-7",
          "text": "The sum of the reciprocals of the roots of a quadratic equation is 5 and the product of the roots is 2. Form the equation.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "Let the roots be α and β. Given αβ = 2 and 1/α + 1/β = (α + β)/αβ = 5 ⇒ α + β = 5 × 2 = 10. Required quadratic: x² − (α + β)x + αβ = 0 ⇒ x² − 10x + 2 = 0.",
          "finalAnswer": "x² − 10x + 2 = 0",
          "solutionSteps": [
            "[1 mark] 1/α + 1/β = (α + β)/αβ = 5 with αβ = 2.",
            "[1 mark] Hence α + β = 10.",
            "[1 mark] Equation: x² − (α+β)x + αβ = 0 ⇒ x² − 10x + 2 = 0."
          ]
        },
        {
          "id": "M-QUAD-8",
          "text": "A rectangular garden has area 96 m^2 and length exceeds breadth by 4 m. Form and solve a quadratic equation to find its dimensions.",
          "marks": 4,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "Let breadth = x m; then length = (x + 4) m. Area: x(x + 4) = 96 ⇒ x² + 4x − 96 = 0. Factorising: x² + 12x − 8x − 96 = 0 ⇒ (x + 12)(x − 8) = 0 ⇒ x = 8 or x = −12. Breadth cannot be negative, so x = 8. Breadth = 8 m, length = 12 m. Check: 8 × 12 = 96 m².",
          "finalAnswer": "Breadth = 8 m, length = 12 m",
          "solutionSteps": [
            "[1 mark] Let breadth = x m, length = (x + 4) m; area gives x(x + 4) = 96.",
            "[1 mark] Quadratic equation: x² + 4x − 96 = 0.",
            "[1 mark] Solve: (x + 12)(x − 8) = 0 ⇒ x = 8 or x = −12.",
            "[1 mark] Reject negative value; breadth = 8 m, length = 12 m."
          ]
        },
        {
          "id": "M-QUAD-9",
          "text": "Determine the value of m if one root of 2x^2 + mx + 3 = 0 is double the other.",
          "marks": 3,
          "difficulty": "Hard",
          "questionType": "subjective",
          "answer": "Let the roots be α and 2α.\nSum of roots: α + 2α = 3α = −m/2 ⇒ α = −m/6.\nProduct of roots: α·2α = 2α² = 3/2 ⇒ α² = 3/4.\nSubstituting α = −m/6: 2(m²/36) = 3/2 ⇒ m²/18 = 3/2 ⇒ m² = 27 ⇒ m = ±3√3.",
          "finalAnswer": "m = ±3√3",
          "solutionSteps": [
            "[1 mark] Let roots be α, 2α; sum 3α = −m/2",
            "[1 mark] Product 2α² = 3/2 ⇒ α² = 3/4",
            "[1 mark] Eliminating α: m² = 27 ⇒ m = ±3√3"
          ]
        },
        {
          "id": "M-QUAD-10",
          "text": "Solve for x: 1/(x+1) + 1/(x−2) = 3/2.",
          "marks": 3,
          "difficulty": "Hard",
          "questionType": "subjective",
          "answer": "Here x ≠ −1, 2. 1/(x+1) + 1/(x−2) = 3/2 ⇒ (x − 2 + x + 1)/[(x+1)(x−2)] = 3/2 ⇒ (2x − 1)/(x² − x − 2) = 3/2 ⇒ 2(2x − 1) = 3(x² − x − 2) ⇒ 4x − 2 = 3x² − 3x − 6 ⇒ 3x² − 7x − 4 = 0. Using the quadratic formula: D = b² − 4ac = 49 + 48 = 97. x = [7 ± √97]/6. Both values are admissible (neither is −1 or 2).",
          "finalAnswer": "x = (7 + √97)/6 or x = (7 − √97)/6",
          "solutionSteps": [
            "[1 mark] Combining fractions: (2x − 1)/(x² − x − 2) = 3/2.",
            "[1 mark] Simplifying to the quadratic 3x² − 7x − 4 = 0.",
            "[1 mark] D = 97; x = (7 ± √97)/6 (both valid since x ≠ −1, 2)."
          ]
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
          "text": "For the AP 5, 9, 13, …, write the first four terms and find the common difference.",
          "marks": 1,
          "difficulty": "Easy",
          "questionType": "subjective",
          "answer": "First four terms: 5, 9, 13, 17. Common difference d = 9 − 5 = 4.",
          "finalAnswer": "5, 9, 13, 17; d = 4",
          "solutionSteps": [
            "[1 mark] d = 9 − 5 = 4; First four terms: 5, 9, 13, 17"
          ]
        },
        {
          "id": "M-AP-2",
          "text": "Find the 15th term of the AP 7, 10, 13, … .",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective",
          "answer": "Here a = 7, d = 10 − 7 = 3, n = 15. a_n = a + (n − 1)d ⇒ a_15 = 7 + 14 × 3 = 7 + 42 = 49. The 15th term is 49.",
          "finalAnswer": "49",
          "solutionSteps": [
            "[1 mark] a = 7, d = 3; a_n = a + (n − 1)d.",
            "[1 mark] a_15 = 7 + 14 × 3 = 49."
          ]
        },
        {
          "id": "M-AP-3",
          "text": "Which term of AP 3, 8, 13, … is 103?",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "Here a = 3, d = 8 − 3 = 5. Let aₙ = 103. aₙ = a + (n − 1)d ⇒ 103 = 3 + (n − 1)5 ⇒ (n − 1)5 = 100 ⇒ n − 1 = 20 ⇒ n = 21. So 103 is the 21st term.",
          "finalAnswer": "21st term",
          "solutionSteps": [
            "[1 mark] a = 3, d = 5; aₙ = a + (n − 1)d ⇒ 103 = 3 + (n − 1)5.",
            "[1 mark] (n − 1) = 20 ⇒ n = 21; 103 is the 21st term."
          ]
        },
        {
          "id": "M-AP-4",
          "text": "Find the sum of first 20 terms of AP whose first term is 4 and common difference is 3.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "a = 4, d = 3, n = 20. S_n = (n/2)[2a + (n − 1)d] = (20/2)[8 + 19 × 3] = 10 × (8 + 57) = 10 × 65 = 650.",
          "finalAnswer": "S₂₀ = 650",
          "solutionSteps": [
            "[1 mark] S_n = n/2[2a + (n − 1)d] with a = 4, d = 3, n = 20.",
            "[1 mark] S₂₀ = 10 × (8 + 57) = 650."
          ]
        },
        {
          "id": "M-AP-5",
          "text": "Sum of first n terms of an AP is 3n^2 + 5n. Find its 10th term.",
          "marks": 3,
          "difficulty": "Hard",
          "questionType": "subjective",
          "answer": "Sₙ = 3n² + 5n. a₁₀ = S₁₀ − S₉. S₁₀ = 3(100) + 5(10) = 350; S₉ = 3(81) + 5(9) = 243 + 45 = 288. a₁₀ = 350 − 288 = 62. (Check: aₙ = Sₙ − Sₙ₋₁ = 6n + 2, a₁₀ = 62.)",
          "finalAnswer": "a₁₀ = 62",
          "solutionSteps": [
            "[1 mark] Use aₙ = Sₙ − Sₙ₋₁, so a₁₀ = S₁₀ − S₉.",
            "[1 mark] S₁₀ = 300 + 50 = 350; S₉ = 243 + 45 = 288.",
            "[1 mark] a₁₀ = 350 − 288 = 62."
          ]
        },
        {
          "id": "M-AP-6",
          "text": "The 8th term of an AP is 37 and 13th term is 62. Find the AP.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "a₈ = a + 7d = 37 ...(1); a₁₃ = a + 12d = 62 ...(2).\nSubtracting: 5d = 25 ⇒ d = 5. Then a = 37 − 35 = 2.\nAP: 2, 7, 12, 17, ...",
          "finalAnswer": "AP: 2, 7, 12, 17, … (a = 2, d = 5)",
          "solutionSteps": [
            "[1 mark] a + 7d = 37 and a + 12d = 62.",
            "[1 mark] 5d = 25 ⇒ d = 5; a = 2.",
            "[1 mark] AP: 2, 7, 12, 17, ..."
          ]
        },
        {
          "id": "M-AP-7",
          "text": "Three numbers in AP have sum 21 and product 315. Find the numbers.",
          "marks": 4,
          "difficulty": "Hard",
          "questionType": "subjective",
          "answer": "Let the numbers be a − d, a, a + d. Sum: 3a = 21 ⇒ a = 7. Product: (a − d)a(a + d) = a(a² − d²) = 315 ⇒ 7(49 − d²) = 315 ⇒ 49 − d² = 45 ⇒ d² = 4 ⇒ d = ±2. For d = 2: 5, 7, 9; for d = −2: 9, 7, 5. The numbers are 5, 7, 9.",
          "finalAnswer": "5, 7, 9",
          "solutionSteps": [
            "[1 mark] Take the numbers as a − d, a, a + d.",
            "[1 mark] Sum: 3a = 21 ⇒ a = 7.",
            "[1 mark] Product: 7(49 − d²) = 315 ⇒ d² = 4 ⇒ d = ±2.",
            "[1 mark] Numbers: 5, 7, 9 (or 9, 7, 5)."
          ]
        },
        {
          "id": "M-AP-8",
          "text": "A sum of ₹1000 is to be distributed among 10 students such that each gets ₹5 more than previous one. Find amount received by the first and last student.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "Amounts form an AP with n = 10, d = 5, S10 = 1000. S_n = n/2[2a + (n − 1)d] ⇒ 1000 = 5[2a + 45] ⇒ 2a + 45 = 200 ⇒ a = 77.5. Last student: a10 = a + 9d = 77.5 + 45 = 122.5. First student gets ₹77.50 and last student gets ₹122.50.",
          "finalAnswer": "First: ₹77.50; last: ₹122.50",
          "solutionSteps": [
            "[1 mark] AP with n = 10, d = 5, S10 = 1000; use S_n = n/2[2a + (n − 1)d]: 1000 = 5(2a + 45).",
            "[1 mark] 2a + 45 = 200 ⇒ a = ₹77.50 (first student).",
            "[1 mark] a10 = a + 9d = 77.5 + 45 = ₹122.50 (last student)."
          ]
        },
        {
          "id": "M-AP-9",
          "text": "How many terms of AP 6, 10, 14, … are needed to give sum 126?",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "Here a = 6 and d = 4. S_n = n/2 [2a + (n − 1)d] = n/2 [12 + 4(n − 1)] = 2n² + 4n. Setting 2n² + 4n = 126 gives n² + 2n − 63 = 0, i.e. (n + 9)(n − 7) = 0. Since n must be a natural number, n = 7. So 7 terms are needed.",
          "finalAnswer": "7 terms",
          "solutionSteps": [
            "[1 mark] a = 6, d = 4; S_n = n/2 [12 + 4(n − 1)] = 2n² + 4n.",
            "[1 mark] 2n² + 4n = 126 ⇒ n² + 2n − 63 = 0 ⇒ (n + 9)(n − 7) = 0.",
            "[1 mark] n = 7 (n = −9 is rejected, as n is a natural number)."
          ]
        },
        {
          "id": "M-AP-10",
          "text": "If S_n denotes sum of first n terms of AP and S_5 = 45, S_10 = 145, find a and d.",
          "marks": 3,
          "difficulty": "Hard",
          "questionType": "subjective",
          "answer": "S_n = n/2[2a + (n − 1)d]. S₅ = 5/2(2a + 4d) = 45 ⇒ 2a + 4d = 18 ⇒ a + 2d = 9 …(1). S₁₀ = 10/2(2a + 9d) = 145 ⇒ 2a + 9d = 29 …(2). From (1), 2a + 4d = 18; subtracting from (2): 5d = 11 ⇒ d = 11/5. Then a = 9 − 2(11/5) = 9 − 22/5 = 23/5.",
          "finalAnswer": "a = 23/5, d = 11/5",
          "solutionSteps": [
            "[1 mark] S₅ = 45 gives a + 2d = 9.",
            "[1 mark] S₁₀ = 145 gives 2a + 9d = 29.",
            "[1 mark] Solving: d = 11/5, a = 23/5."
          ]
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
          "questionType": "subjective",
          "answer": "If a line is drawn parallel to one side of a triangle to intersect the other two sides in distinct points, the other two sides are divided in the same ratio. In ΔABC, if DE ∥ BC with D on AB and E on AC, then AD/DB = AE/EC.",
          "finalAnswer": "Line parallel to one side divides the other two sides in the same ratio",
          "solutionSteps": [
            "[1 mark] Statement: a line drawn parallel to one side of a triangle intersecting the other two sides at distinct points divides those sides in the same ratio (AD/DB = AE/EC)"
          ]
        },
        {
          "id": "M-TRI-2",
          "text": "In ΔABC, DE ∥ BC and D, E lie on AB, AC respectively. If AD = 2, DB = 3, find AE/EC.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "Since DE ∥ BC, by the Basic Proportionality Theorem (Thales theorem), AD/DB = AE/EC. Therefore AE/EC = 2/3.",
          "finalAnswer": "AE/EC = 2/3",
          "solutionSteps": [
            "[1 mark] DE ∥ BC, so by the Basic Proportionality Theorem, AD/DB = AE/EC.",
            "[1 mark] AE/EC = 2/3."
          ]
        },
        {
          "id": "M-TRI-4",
          "text": "Prove that if a line is drawn parallel to one side of a triangle to intersect other two sides, then it divides them in the same ratio.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "Given: In ΔABC, a line DE ∥ BC intersects AB at D and AC at E. To prove: AD/DB = AE/EC. Construction: Join BE and CD; draw DM ⊥ AC and EN ⊥ AB. Proof: ar(ADE) = ½ × AD × EN and ar(BDE) = ½ × DB × EN, so ar(ADE)/ar(BDE) = AD/DB …(1). Similarly ar(ADE) = ½ × AE × DM and ar(DEC) = ½ × EC × DM, so ar(ADE)/ar(DEC) = AE/EC …(2). ΔBDE and ΔDEC are on the same base DE and between the same parallels BC and DE, so ar(BDE) = ar(DEC) …(3). From (1), (2) and (3): AD/DB = AE/EC. Hence proved.",
          "finalAnswer": "AD/DB = AE/EC (Basic Proportionality Theorem)",
          "solutionSteps": [
            "[1 mark] Given, to prove and construction: ΔABC with DE ∥ BC; join BE, CD; draw EN ⊥ AB and DM ⊥ AC.",
            "[1 mark] ar(ADE)/ar(BDE) = (½·AD·EN)/(½·DB·EN) = AD/DB and ar(ADE)/ar(DEC) = (½·AE·DM)/(½·EC·DM) = AE/EC.",
            "[1 mark] ar(BDE) = ar(DEC) (same base DE, between same parallels DE and BC), hence AD/DB = AE/EC."
          ]
        },
        {
          "id": "M-TRI-8",
          "text": "In ΔABC and ΔPQR, if ∠A = ∠P, ∠B = ∠Q and BC/QR = CA/RP, prove that triangles are similar.",
          "marks": 4,
          "difficulty": "Hard",
          "questionType": "subjective",
          "answer": "In ΔABC and ΔPQR: ∠A = ∠P (given) and ∠B = ∠Q (given). By angle sum property, ∠C = 180° − ∠A − ∠B = 180° − ∠P − ∠Q = ∠R. Hence the triangles are equiangular, so by AA (AAA) similarity criterion, ΔABC ~ ΔPQR. Consequently, corresponding sides are proportional: AB/PQ = BC/QR = CA/RP, which is consistent with the given ratio BC/QR = CA/RP.",
          "finalAnswer": "ΔABC ~ ΔPQR (AA similarity)",
          "solutionSteps": [
            "[1 mark] Given: ∠A = ∠P and ∠B = ∠Q; to prove ΔABC ~ ΔPQR.",
            "[1 mark] Angle sum property: ∠C = 180° − (∠A + ∠B) = 180° − (∠P + ∠Q) = ∠R.",
            "[1 mark] All corresponding angles equal ⇒ ΔABC ~ ΔPQR by AA (AAA) criterion.",
            "[1 mark] Hence AB/PQ = BC/QR = CA/RP, consistent with the given ratio."
          ]
        },
        {
          "id": "M-TRI-10",
          "text": "Show that in a right triangle, if altitude is drawn to hypotenuse, then triangles on each side of altitude are similar to original triangle and to each other.",
          "marks": 4,
          "difficulty": "Hard",
          "questionType": "subjective",
          "answer": "Let ΔABC be right-angled at B, and BD ⊥ AC (D on hypotenuse AC). To prove: ΔADB ~ ΔABC, ΔBDC ~ ΔABC and ΔADB ~ ΔBDC. (i) In ΔADB and ΔABC: ∠A = ∠A (common), ∠ADB = ∠ABC = 90°. So ΔADB ~ ΔABC (AA). (ii) In ΔBDC and ΔABC: ∠C = ∠C (common), ∠BDC = ∠ABC = 90°. So ΔBDC ~ ΔABC (AA). (iii) From (i) and (ii), ∠ABD = ∠C and ∠DBC = ∠A; in ΔADB and ΔBDC: ∠ADB = ∠BDC = 90° and ∠A = ∠DBC. So ΔADB ~ ΔBDC (AA). Hence the triangles on each side of the altitude are similar to the whole triangle and to each other.",
          "finalAnswer": "ΔADB ~ ΔABC, ΔBDC ~ ΔABC, ΔADB ~ ΔBDC (AA similarity)",
          "solutionSteps": [
            "[1 mark] Figure and given/to prove: ΔABC right-angled at B, BD ⊥ AC.",
            "[1 mark] ΔADB ~ ΔABC: ∠A common, ∠ADB = ∠ABC = 90° (AA).",
            "[1 mark] ΔBDC ~ ΔABC: ∠C common, ∠BDC = ∠ABC = 90° (AA).",
            "[1 mark] ΔADB ~ ΔBDC: ∠ADB = ∠BDC = 90°, ∠A = ∠DBC (from above) — AA; hence proved."
          ]
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
          "questionType": "subjective",
          "answer": "Distance = √[(8 − 2)² + (15 − 3)²] = √(36 + 144) = √180 = 6√5 units.",
          "finalAnswer": "6√5 units (≈ 13.42 units)",
          "solutionSteps": [
            "[1 mark] d = √[(8 − 2)² + (15 − 3)²] = √(6² + 12²).",
            "[1 mark] = √180 = 6√5 units."
          ]
        },
        {
          "id": "M-CG-2",
          "text": "Find the coordinates of the midpoint of the line segment joining (−4, 5) and (6, −3).",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective",
          "answer": "Midpoint = ((x₁ + x₂)/2, (y₁ + y₂)/2) = ((−4 + 6)/2, (5 + (−3))/2) = (2/2, 2/2) = (1, 1).",
          "finalAnswer": "(1, 1)",
          "solutionSteps": [
            "[1 mark] Midpoint formula: ((x₁ + x₂)/2, (y₁ + y₂)/2).",
            "[1 mark] ((−4 + 6)/2, (5 − 3)/2) = (1, 1)."
          ]
        },
        {
          "id": "M-CG-3",
          "text": "Using section formula, find the coordinates of point dividing the line segment joining (1, −2) and (5, 6) in ratio 1:3 internally.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "Let P(x, y) divide A(1, −2) and B(5, 6) in the ratio m1 : m2 = 1 : 3. Section formula: x = (m1x2 + m2x1)/(m1 + m2) = (1×5 + 3×1)/4 = 8/4 = 2; y = (m1y2 + m2y1)/(m1 + m2) = (1×6 + 3×(−2))/4 = 0/4 = 0. Required point is (2, 0).",
          "finalAnswer": "(2, 0)",
          "solutionSteps": [
            "[1 mark] Section formula: P = ((m1x2 + m2x1)/(m1 + m2), (m1y2 + m2y1)/(m1 + m2)) with m1 : m2 = 1 : 3.",
            "[1 mark] x = (1×5 + 3×1)/4 = 2.",
            "[1 mark] y = (1×6 + 3×(−2))/4 = 0; point is (2, 0)."
          ]
        },
        {
          "id": "M-CG-8",
          "text": "A point P(x, 4) is equidistant from A(2, 3) and B(6, 7). Find x.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "PA = PB ⇒ PA² = PB².\nPA² = (x − 2)² + (4 − 3)² = x² − 4x + 4 + 1 = x² − 4x + 5.\nPB² = (x − 6)² + (4 − 7)² = x² − 12x + 36 + 9 = x² − 12x + 45.\nx² − 4x + 5 = x² − 12x + 45 ⇒ 8x = 40 ⇒ x = 5.",
          "finalAnswer": "x = 5",
          "solutionSteps": [
            "[1 mark] PA = PB ⇒ PA² = PB² using distance formula",
            "[1 mark] (x − 2)² + 1 = (x − 6)² + 9 ⇒ x² − 4x + 5 = x² − 12x + 45",
            "[1 mark] 8x = 40 ⇒ x = 5"
          ]
        },
        {
          "id": "M-CG-9",
          "text": "Find the coordinates of a point on x-axis which is equidistant from (−3, 4) and (5, −2).",
          "marks": 3,
          "difficulty": "Hard",
          "questionType": "subjective",
          "answer": "Let the point on the x-axis be P(x, 0), with A(−3, 4) and B(5, −2). PA = PB ⇒ PA² = PB². (x + 3)² + (0 − 4)² = (x − 5)² + (0 + 2)² ⇒ x² + 6x + 9 + 16 = x² − 10x + 25 + 4 ⇒ 6x + 25 = −10x + 29 ⇒ 16x = 4 ⇒ x = 1/4. The required point is (1/4, 0).",
          "finalAnswer": "(1/4, 0)",
          "solutionSteps": [
            "[1 mark] Taking P(x, 0) and setting PA² = PB²: (x + 3)² + 16 = (x − 5)² + 4.",
            "[1 mark] Expanding and simplifying: 6x + 25 = −10x + 29, i.e. 16x = 4.",
            "[1 mark] x = 1/4; required point (1/4, 0)."
          ]
        },
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
          "questionType": "subjective",
          "answer": "sin 30° = 1/2 and cos 60° = 1/2.",
          "finalAnswer": "sin 30° = 1/2, cos 60° = 1/2",
          "solutionSteps": [
            "[1 mark] sin 30° = 1/2; cos 60° = 1/2"
          ]
        },
        {
          "id": "M-TRIG-2",
          "text": "If tan θ = 3/4 and θ is acute, find sin θ and cos θ.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "tan θ = 3/4 = opposite/adjacent. In a right triangle take opposite side = 3k, adjacent side = 4k. Hypotenuse = √((3k)^2 + (4k)^2) = √(25k^2) = 5k. Hence sin θ = 3k/5k = 3/5 and cos θ = 4k/5k = 4/5 (both positive since θ is acute).",
          "finalAnswer": "sin θ = 3/5, cos θ = 4/5",
          "solutionSteps": [
            "[1 mark] Opposite = 3k, adjacent = 4k; hypotenuse = √(9k^2 + 16k^2) = 5k (Pythagoras).",
            "[1 mark] sin θ = 3/5, cos θ = 4/5."
          ]
        },
        {
          "id": "M-TRIG-3",
          "text": "Prove that sin²θ + cos²θ = 1.",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective",
          "answer": "Consider right ΔABC, right-angled at B, with ∠A = θ. Then sin θ = BC/AC and cos θ = AB/AC. sin²θ + cos²θ = BC²/AC² + AB²/AC² = (AB² + BC²)/AC². By Pythagoras theorem, AB² + BC² = AC². Therefore sin²θ + cos²θ = AC²/AC² = 1. Hence proved.",
          "finalAnswer": "sin²θ + cos²θ = 1",
          "solutionSteps": [
            "[1 mark] In right ΔABC (right angle at B, ∠A = θ): sin θ = BC/AC, cos θ = AB/AC, so sin²θ + cos²θ = (BC² + AB²)/AC².",
            "[1 mark] By Pythagoras theorem AB² + BC² = AC², so sin²θ + cos²θ = AC²/AC² = 1."
          ]
        },
        {
          "id": "M-TRIG-4",
          "text": "Evaluate: sin 30° cos 60° + cos 30° sin 60°.",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective",
          "answer": "sin 30° cos 60° + cos 30° sin 60° = (1/2)(1/2) + (√3/2)(√3/2) = 1/4 + 3/4 = 1.",
          "finalAnswer": "1",
          "solutionSteps": [
            "[1 mark] Substitute values: (1/2)(1/2) + (√3/2)(√3/2).",
            "[1 mark] = 1/4 + 3/4 = 1."
          ]
        },
        {
          "id": "M-TRIG-5",
          "text": "Show that sec²θ − tan²θ = 1 for all θ where both are defined.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "sec θ = 1/cos θ and tan θ = sin θ/cos θ (cos θ ≠ 0). sec²θ − tan²θ = 1/cos²θ − sin²θ/cos²θ = (1 − sin²θ)/cos²θ = cos²θ/cos²θ = 1 (using sin²θ + cos²θ = 1). Hence proved.",
          "finalAnswer": "sec²θ − tan²θ = 1",
          "solutionSteps": [
            "[1 mark] Write sec²θ − tan²θ = 1/cos²θ − sin²θ/cos²θ = (1 − sin²θ)/cos²θ.",
            "[1 mark] Using sin²θ + cos²θ = 1: = cos²θ/cos²θ = 1. Hence proved."
          ]
        },
        {
          "id": "M-TRIG-6",
          "text": "If sin A = 5/13, A acute, find value of 2 tan A − 3 cot A.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "sin A = 5/13 = P/H; take P = 5k, H = 13k. Base = √(169k² − 25k²) = 12k.\ntan A = 5/12, cot A = 12/5.\n2 tan A − 3 cot A = 2(5/12) − 3(12/5) = 5/6 − 36/5 = (25 − 216)/30 = −191/30.",
          "finalAnswer": "−191/30",
          "solutionSteps": [
            "[1 mark] Using Pythagoras, adjacent side = 12k, so cos A = 12/13.",
            "[1 mark] tan A = 5/12, cot A = 12/5.",
            "[1 mark] 2(5/12) − 3(12/5) = 5/6 − 36/5 = −191/30."
          ]
        },
        {
          "id": "M-TRIG-8",
          "text": "Simplify: (1 − sin θ)(1 + sin θ) / cos²θ.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "(1 − sin θ)(1 + sin θ)/cos²θ = (1 − sin²θ)/cos²θ = cos²θ/cos²θ = 1.",
          "finalAnswer": "1",
          "solutionSteps": [
            "[1 mark] (1 − sin θ)(1 + sin θ) = 1 − sin²θ.",
            "[1 mark] Using sin²θ + cos²θ = 1: 1 − sin²θ = cos²θ.",
            "[1 mark] cos²θ/cos²θ = 1."
          ]
        },
        {
          "id": "M-TRIG-9",
          "text": "If 3 tan A = 4, find values of (sin A − cos A) / (sin A + cos A).",
          "marks": 3,
          "difficulty": "Hard",
          "questionType": "subjective",
          "answer": "3 tan A = 4 ⇒ tan A = 4/3. Dividing numerator and denominator by cos A: (sin A − cos A)/(sin A + cos A) = (tan A − 1)/(tan A + 1) = (4/3 − 1)/(4/3 + 1) = (1/3)/(7/3) = 1/7. (Alternatively, sin A = 4/5, cos A = 3/5 gives (1/5)/(7/5) = 1/7.)",
          "finalAnswer": "1/7",
          "solutionSteps": [
            "[1 mark] tan A = 4/3 (or sin A = 4/5, cos A = 3/5 using a right triangle with sides 3, 4, 5).",
            "[1 mark] Divide by cos A: expression = (tan A − 1)/(tan A + 1) (or substitute sin A, cos A).",
            "[1 mark] = (1/3)/(7/3) = 1/7."
          ]
        },
        {
          "id": "M-TRIG-10",
          "text": "Without using calculator, evaluate: sin²30° + cos²45° + tan²45° − 2 sin 60° cos 30°.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "sin 30° = 1/2, cos 45° = 1/√2, tan 45° = 1, sin 60° = cos 30° = √3/2.\nsin²30° + cos²45° + tan²45° − 2 sin 60° cos 30°\n= 1/4 + 1/2 + 1 − 2(√3/2)(√3/2)\n= 7/4 − 3/2 = 1/4.",
          "finalAnswer": "1/4",
          "solutionSteps": [
            "[1 mark] Values: sin 30° = 1/2, cos 45° = 1/√2, tan 45° = 1, sin 60° = cos 30° = √3/2",
            "[1 mark] Substitution: 1/4 + 1/2 + 1 − 2 × (3/4)",
            "[1 mark] = 7/4 − 3/2 = 1/4"
          ]
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
          "questionType": "subjective",
          "answer": "The angle of elevation of a point viewed (above the horizontal level) is the angle formed by the line of sight with the horizontal line through the observer's eye, when the point is above the horizontal level, i.e. when the observer raises the head to look at the object.",
          "finalAnswer": "Angle between line of sight and horizontal when the object is above eye level",
          "solutionSteps": [
            "[1 mark] Angle formed by the line of sight with the horizontal when the object viewed is above the horizontal level of the observer's eye."
          ]
        },
        {
          "id": "M-APPTRIG-2",
          "text": "A ladder 10 m long leans against a wall, making an angle of 60° with the ground. Find the height of the wall reached by the ladder.",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective",
          "answer": "Let the ladder AC = 10 m make 60° with the ground, and AB be the height reached on the wall. sin 60° = AB/AC ⇒ √3/2 = AB/10 ⇒ AB = 5√3 m ≈ 8.66 m.",
          "finalAnswer": "5√3 m ≈ 8.66 m",
          "solutionSteps": [
            "[1 mark] sin 60° = height/ladder ⇒ √3/2 = h/10",
            "[1 mark] h = 5√3 m ≈ 8.66 m"
          ]
        },
        {
          "id": "M-APPTRIG-3",
          "text": "From the top of a 20 m tower, angle of depression of a car on ground is 30°. Find distance of car from tower base.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "Let AB be the tower, AB = 20 m, A the top, and C the car on the ground, BC = x m. The angle of depression from A to C is 30°, so ∠ACB = 30° (alternate angles). In right ΔABC, tan 30° = AB/BC ⇒ 1/√3 = 20/x ⇒ x = 20√3 m ≈ 20 × 1.732 = 34.64 m. The car is 20√3 m ≈ 34.64 m from the base of the tower.",
          "finalAnswer": "20√3 m ≈ 34.64 m",
          "solutionSteps": [
            "[1 mark] Figure/setup: tower AB = 20 m, car at C; angle of depression 30° ⇒ ∠ACB = 30° (alternate angles).",
            "[1 mark] In ΔABC, tan 30° = AB/BC ⇒ 1/√3 = 20/BC.",
            "[1 mark] BC = 20√3 m ≈ 34.64 m."
          ]
        },
        {
          "id": "M-APPTRIG-4",
          "text": "A flagstaff stands on top of a 15 m building. From a point on ground, angles of elevation of top of building and top of flagstaff are 30° and 45° respectively. Find height of flagstaff.",
          "marks": 4,
          "difficulty": "Hard",
          "questionType": "subjective",
          "answer": "Let BC = 15 m be the building, CD = h m the flagstaff on top of it, and A the point on the ground with AB = x m. In right ΔABC: tan 30° = BC/AB ⇒ 1/√3 = 15/x ⇒ x = 15√3 m. In right ΔABD: tan 45° = BD/AB ⇒ 1 = (15 + h)/x ⇒ 15 + h = 15√3. So h = 15√3 − 15 = 15(√3 − 1) m ≈ 15 × 0.732 = 10.98 m. Height of the flagstaff = 15(√3 − 1) m ≈ 10.98 m.",
          "finalAnswer": "15(√3 − 1) m ≈ 10.98 m",
          "solutionSteps": [
            "[1 mark] Figure/notation: building BC = 15 m, flagstaff CD = h, point A on ground at distance AB = x; ∠BAC = 30°, ∠BAD = 45°.",
            "[1 mark] In ΔABC: tan 30° = 15/x ⇒ x = 15√3 m.",
            "[1 mark] In ΔABD: tan 45° = (15 + h)/x ⇒ 15 + h = 15√3.",
            "[1 mark] h = 15(√3 − 1) m ≈ 10.98 m."
          ]
        },
        {
          "id": "M-APPTRIG-5",
          "text": "The angle of elevation of top of a tower from a point A is 45°. On moving 10 m towards base, angle becomes 60°. Find height of tower.",
          "marks": 4,
          "difficulty": "Hard",
          "questionType": "subjective",
          "answer": "Let CD = h be the tower, D the foot, A the first point and B the point 10 m closer, with BD = x m, so AD = (x + 10) m. In right ΔBDC: tan 60° = h/x ⇒ h = √3x. In right ΔADC: tan 45° = h/(x + 10) ⇒ h = x + 10. So √3x = x + 10 ⇒ x = 10/(√3 − 1) = 5(√3 + 1). Hence h = x + 10 = 5√3 + 5 + 10 = 5(3 + √3) = 15 + 5√3 ≈ 23.66 m.",
          "finalAnswer": "h = 5(3 + √3) m ≈ 23.66 m",
          "solutionSteps": [
            "[1 mark] Let height = h, BD = x; from ΔBDC: tan 60° = h/x ⇒ h = √3x.",
            "[1 mark] From ΔADC: tan 45° = h/(x + 10) ⇒ h = x + 10.",
            "[1 mark] √3x = x + 10 ⇒ x = 10/(√3 − 1) = 5(√3 + 1) m.",
            "[1 mark] h = x + 10 = 15 + 5√3 = 5(3 + √3) m ≈ 23.66 m."
          ]
        },
        {
          "id": "M-APPTRIG-6",
          "text": "From a ship at sea, top of a lighthouse is seen at elevation 30°. If lighthouse is 50 m high, find distance of ship from lighthouse base.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "Let AB = 50 m be the lighthouse and C the ship, with ∠ACB = 30°, ∠ABC = 90°. In right ΔABC, tan 30° = AB/BC ⇒ 1/√3 = 50/BC ⇒ BC = 50√3 m ≈ 50 × 1.732 = 86.6 m.",
          "finalAnswer": "50√3 m ≈ 86.6 m",
          "solutionSteps": [
            "[1 mark] Figure: lighthouse AB = 50 m, ship at C, angle of elevation ∠ACB = 30°.",
            "[1 mark] tan 30° = AB/BC ⇒ 1/√3 = 50/BC.",
            "[1 mark] BC = 50√3 m ≈ 86.6 m."
          ]
        },
        {
          "id": "M-APPTRIG-7",
          "text": "At a point on level ground, angle of elevation of a vertical tower is 30°. On moving 20 m closer, angle becomes 60°. Find height of tower.",
          "marks": 4,
          "difficulty": "Hard",
          "questionType": "subjective",
          "answer": "Let AB = h be the tower, D the first point, C the point 20 m closer, BC = x.\nIn ΔABC: tan 60° = h/x ⇒ h = √3 x.\nIn ΔABD: tan 30° = h/(x + 20) ⇒ x + 20 = √3 h = √3(√3 x) = 3x ⇒ 2x = 20 ⇒ x = 10 m.\nh = 10√3 m ≈ 17.32 m.",
          "finalAnswer": "Height = 10√3 m ≈ 17.32 m",
          "solutionSteps": [
            "[1 mark] Correct figure/setup: tower AB = h, BC = x, CD = 20 m.",
            "[1 mark] tan 60° = h/x ⇒ h = √3 x.",
            "[1 mark] tan 30° = h/(x + 20) ⇒ x + 20 = 3x ⇒ x = 10 m.",
            "[1 mark] h = 10√3 m ≈ 17.32 m."
          ]
        },
        {
          "id": "M-APPTRIG-8",
          "text": "The shadow of a tree is 10 m long when Sun’s elevation is 45°. Find height of tree.",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective",
          "answer": "Let height of tree = h m and shadow = 10 m. tan 45° = h/10 ⇒ 1 = h/10 ⇒ h = 10 m.",
          "finalAnswer": "10 m",
          "solutionSteps": [
            "[1 mark] tan 45° = height/shadow = h/10.",
            "[1 mark] Since tan 45° = 1, h = 10 m."
          ]
        },
        {
          "id": "M-APPTRIG-9",
          "text": "From the top of a building 24 m high, the angle of depression to a point on ground is 30°. Find horizontal distance to the point.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "Let AB = 24 m be the building and C the point on the ground, BC = d. Angle of depression 30° = angle of elevation of A from C, so ∠ACB = 30°. In right ΔABC, tan 30° = AB/BC ⇒ 1/√3 = 24/d ⇒ d = 24√3 m ≈ 41.57 m.",
          "finalAnswer": "24√3 m ≈ 41.57 m",
          "solutionSteps": [
            "[1 mark] Angle of depression from top = angle of elevation at the point, ∠ACB = 30°; in right ΔABC, tan 30° = AB/BC.",
            "[1 mark] 1/√3 = 24/d.",
            "[1 mark] d = 24√3 m ≈ 41.57 m."
          ]
        },
        {
          "id": "M-APPTRIG-10",
          "text": "Two persons on opposite sides of a tower measure angles of elevation as 45° and 60°. If distance between them is 40 m, find height of tower.",
          "marks": 4,
          "difficulty": "Hard",
          "questionType": "subjective",
          "answer": "Let AB = h m be the tower, with persons at C and D on opposite sides, ∠ACB = 45°, ∠ADB = 60°, CD = 40 m.\nIn △ABC: tan 45° = h/BC ⇒ BC = h.\nIn △ABD: tan 60° = h/BD ⇒ BD = h/√3.\nBC + BD = 40 ⇒ h + h/√3 = 40 ⇒ h(√3 + 1)/√3 = 40\n⇒ h = 40√3/(√3 + 1) = 40√3(√3 − 1)/2 = 20(3 − √3) = 60 − 20√3 ≈ 25.36 m.",
          "finalAnswer": "h = 20(3 − √3) m ≈ 25.36 m",
          "solutionSteps": [
            "[1 mark] Figure/setup: tower AB = h, persons at C and D on opposite sides, BC + BD = 40 m",
            "[1 mark] tan 45° = h/BC ⇒ BC = h",
            "[1 mark] tan 60° = h/BD ⇒ BD = h/√3; h + h/√3 = 40",
            "[1 mark] h = 40√3/(√3 + 1) = 20(3 − √3) m ≈ 25.36 m"
          ]
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
          "questionType": "subjective",
          "answer": "The tangent at any point of a circle is perpendicular to the radius through the point of contact.",
          "finalAnswer": "Tangent ⟂ radius at point of contact",
          "solutionSteps": [
            "[1 mark] The tangent at any point of a circle is perpendicular to the radius through the point of contact."
          ]
        },
        {
          "id": "M-CIR-2",
          "text": "From an external point P, two tangents PA and PB are drawn to a circle with centre O. If PA = 8 cm, find PB.",
          "marks": 1,
          "difficulty": "Easy",
          "questionType": "subjective",
          "answer": "Lengths of tangents drawn from an external point to a circle are equal. Hence PB = PA = 8 cm.",
          "finalAnswer": "PB = 8 cm",
          "solutionSteps": [
            "[1 mark] Tangents from an external point are equal, so PB = PA = 8 cm"
          ]
        },
        {
          "id": "M-CIR-3",
          "text": "Prove that tangents drawn from external point to a circle are equal in length.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "Given: a circle with centre O; PA and PB are two tangents from an external point P touching the circle at A and B. To prove: PA = PB. Construction: join OA, OB and OP. Proof: ∠OAP = ∠OBP = 90° (a tangent at any point of a circle is perpendicular to the radius through the point of contact). In right triangles OAP and OBP: OA = OB (radii of the same circle); OP = OP (common hypotenuse); ∠OAP = ∠OBP = 90°. So ΔOAP ≅ ΔOBP (RHS congruence). Hence PA = PB (CPCT). Thus tangents drawn from an external point to a circle are equal in length.",
          "finalAnswer": "PA = PB (by RHS congruence, ΔOAP ≅ ΔOBP)",
          "solutionSteps": [
            "[1 mark] Given, to prove and construction with figure: circle centre O, tangents PA, PB from P; join OA, OB, OP.",
            "[1 mark] ∠OAP = ∠OBP = 90° (tangent ⊥ radius); OA = OB (radii); OP common.",
            "[1 mark] ΔOAP ≅ ΔOBP (RHS), so PA = PB (CPCT)."
          ]
        },
        {
          "id": "M-CIR-4",
          "text": "PA and PB are tangents drawn from an external point P to a circle with centre O. If ∠APB = 70°, find ∠AOB.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "OA ⊥ PA and OB ⊥ PB (the tangent at any point of a circle is perpendicular to the radius through the point of contact), so ∠OAP = ∠OBP = 90°. In quadrilateral OAPB the angles add up to 360°: ∠AOB + 90° + 70° + 90° = 360°, so ∠AOB = 110°.",
          "finalAnswer": "∠AOB = 110°",
          "solutionSteps": [
            "[1 mark] Radius ⊥ tangent at the point of contact: ∠OAP = ∠OBP = 90°.",
            "[1 mark] Angle sum of quadrilateral OAPB: ∠AOB = 360° − (90° + 70° + 90°) = 110°."
          ]
        },
        {
          "id": "M-CIR-5",
          "text": "From point P outside circle, two tangents are drawn touching circle at A and B. Prove that the quadrilateral PAOB is cyclic.",
          "marks": 4,
          "difficulty": "Hard",
          "questionType": "subjective",
          "answer": "Let O be the centre. PA and PB are tangents at A and B, and OA, OB are radii. Since the tangent at any point of a circle is perpendicular to the radius through the point of contact, ∠OAP = 90° and ∠OBP = 90°. So ∠OAP + ∠OBP = 180°. In quadrilateral PAOB, the sum of all angles is 360°, so ∠APB + ∠AOB = 360° − 180° = 180°. Since both pairs of opposite angles are supplementary, quadrilateral PAOB is cyclic.",
          "finalAnswer": "PAOB is cyclic (opposite angles ∠A + ∠B = 180°)",
          "solutionSteps": [
            "[1 mark] Join OA, OB; tangent ⟂ radius at point of contact ⇒ ∠OAP = 90°.",
            "[1 mark] Similarly ∠OBP = 90°.",
            "[1 mark] ∠OAP + ∠OBP = 180°, hence ∠APB + ∠AOB = 360° − 180° = 180°.",
            "[1 mark] Opposite angles supplementary ⇒ PAOB is a cyclic quadrilateral."
          ]
        },
        {
          "id": "M-CIR-7",
          "text": "Two concentric circles with common centre O have radii 5 cm and 3 cm. Find length of chord of larger circle which is tangent to smaller circle.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "Let chord AB of the larger circle touch the smaller circle at P. OP ⊥ AB (radius ⊥ tangent), OP = 3 cm, OA = 5 cm. In right ΔOPA: AP = √(OA² − OP²) = √(25 − 9) = 4 cm. The perpendicular from the centre bisects the chord, so AB = 2 × AP = 8 cm.",
          "finalAnswer": "8 cm",
          "solutionSteps": [
            "[1 mark] OP ⊥ AB at point of contact P (radius ⊥ tangent); OP = 3 cm, OA = 5 cm.",
            "[1 mark] AP = √(5² − 3²) = √16 = 4 cm.",
            "[1 mark] Perpendicular from centre bisects chord: AB = 2 × 4 = 8 cm."
          ]
        },
        {
          "id": "M-CIR-8",
          "text": "If a circle touches all sides of a square, relate radius of circle to side of square.",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective",
          "answer": "When a circle touches all four sides of a square (inscribed circle), the distance between two opposite sides equals the diameter of the circle (the radii to opposite points of contact are perpendicular to the parallel sides and lie on one line through the centre). So side a = 2r, i.e. r = a/2.",
          "finalAnswer": "r = a/2 (side = diameter)",
          "solutionSteps": [
            "[1 mark] Radii to points of contact on opposite sides are perpendicular to those parallel sides and together form a diameter equal to the distance between them.",
            "[1 mark] Hence side of square = 2r, i.e. r = a/2."
          ]
        },
        {
          "id": "M-CIR-9",
          "text": "Prove that the angle between two tangents drawn from an external point to circle is supplementary to angle subtended by line segment joining points of contact at centre.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "Let PA and PB be tangents from external point P to a circle with centre O, touching it at A and B. To prove: ∠APB + ∠AOB = 180°. Proof: The tangent at any point of a circle is perpendicular to the radius through the point of contact, so ∠OAP = 90° and ∠OBP = 90°. In quadrilateral OAPB, ∠OAP + ∠APB + ∠OBP + ∠AOB = 360° ⇒ 90° + ∠APB + 90° + ∠AOB = 360° ⇒ ∠APB + ∠AOB = 180°. Hence the angle between the tangents is supplementary to the angle subtended by AB at the centre.",
          "finalAnswer": "∠APB + ∠AOB = 180°",
          "solutionSteps": [
            "[1 mark] Given/To prove with figure: tangents PA, PB from P to circle with centre O; prove ∠APB + ∠AOB = 180°.",
            "[1 mark] Radius ⟂ tangent at point of contact: ∠OAP = ∠OBP = 90°.",
            "[1 mark] Angle sum of quadrilateral OAPB = 360° ⇒ ∠APB + ∠AOB = 180°."
          ]
        },
        {
          "id": "M-CIR-10",
          "text": "In a circle of radius 13 cm, a tangent is drawn from a point C at distance 15 cm from centre. Find length of tangent.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "Let O be the centre, OC = 15 cm, and CT the tangent touching the circle at T, OT = 13 cm. Radius ⟂ tangent at point of contact, so ∠OTC = 90°. By Pythagoras: CT² = OC² − OT² = 225 − 169 = 56 ⇒ CT = √56 = 2√14 cm ≈ 7.48 cm.",
          "finalAnswer": "2√14 cm ≈ 7.48 cm",
          "solutionSteps": [
            "[1 mark] OT ⟂ CT (radius ⟂ tangent); CT² = OC² − OT² = 15² − 13².",
            "[1 mark] CT² = 56 ⇒ CT = 2√14 cm ≈ 7.48 cm."
          ]
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
          "questionType": "subjective",
          "answer": "Area = πr² = (22/7) × 7 × 7 = 154 cm².",
          "finalAnswer": "154 cm²",
          "solutionSteps": [
            "[1 mark] Area = πr² = (22/7) × 49 = 154 cm²"
          ]
        },
        {
          "id": "M-ARC-2",
          "text": "A circle has circumference 44 cm. Find its radius (π = 22/7).",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective",
          "answer": "Circumference = 2πr = 44 cm ⇒ 2 × 22/7 × r = 44 ⇒ r = 44 × 7/44 = 7 cm.",
          "finalAnswer": "r = 7 cm",
          "solutionSteps": [
            "[1 mark] Using 2πr = 44: 2 × (22/7) × r = 44.",
            "[1 mark] r = 44 × 7/(2 × 22) = 7 cm."
          ]
        },
        {
          "id": "M-ARC-3",
          "text": "Find area of a sector of circle of radius 6 cm and angle 60°.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "Area of sector = (θ/360°) × πr² = (60/360) × (22/7) × 6 × 6 = (1/6) × (792/7) = 132/7 cm² ≈ 18.86 cm².",
          "finalAnswer": "132/7 cm² ≈ 18.86 cm²",
          "solutionSteps": [
            "[1 mark] Area = (θ/360°)πr² = (60/360) × (22/7) × 6²",
            "[1 mark] = 132/7 cm² ≈ 18.86 cm²"
          ]
        },
        {
          "id": "M-ARC-4",
          "text": "Find area of ring formed between two concentric circles of radii 7 cm and 14 cm.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "Area of ring = π(R^2 − r^2) with R = 14 cm, r = 7 cm. = (22/7)(14^2 − 7^2) = (22/7)(196 − 49) = (22/7)(147) = 22 × 21 = 462 cm².",
          "finalAnswer": "462 cm²",
          "solutionSteps": [
            "[1 mark] Area of ring = area of outer circle − area of inner circle = π(R^2 − r^2).",
            "[1 mark] Substitution: (22/7)(14^2 − 7^2) = (22/7)(196 − 49) = (22/7) × 147.",
            "[1 mark] Area = 462 cm² (with unit)."
          ]
        },
        {
          "id": "M-ARC-5",
          "text": "In a circle of radius 10 cm, find length of arc subtending central angle of 72°.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "Length of arc l = (θ/360°) × 2πr = (72/360) × 2 × π × 10 = (1/5) × 20π = 4π cm. Taking π = 22/7, l = 88/7 ≈ 12.57 cm (with π = 3.14, l = 12.56 cm).",
          "finalAnswer": "4π cm ≈ 12.57 cm",
          "solutionSteps": [
            "[1 mark] Formula: l = (θ/360°) × 2πr; substitute θ = 72°, r = 10 cm.",
            "[1 mark] l = (1/5) × 20π = 4π cm ≈ 12.57 cm (with unit)."
          ]
        },
        {
          "id": "M-ARC-6",
          "text": "A square of side 14 cm is inscribed in a circle. Find area of circle not covered by square.",
          "marks": 4,
          "difficulty": "Hard",
          "questionType": "subjective",
          "answer": "The diagonal of the inscribed square is a diameter of the circle. Diagonal = 14√2 cm, so radius r = 7√2 cm and r² = 98 cm². Area of circle = πr² = (22/7) × 98 = 308 cm². Area of square = 14² = 196 cm². Area not covered = 308 − 196 = 112 cm².",
          "finalAnswer": "112 cm²",
          "solutionSteps": [
            "[1 mark] Diagonal of square = diameter = 14√2 cm ⇒ r = 7√2 cm.",
            "[1 mark] Area of circle = (22/7) × 98 = 308 cm².",
            "[1 mark] Area of square = 14 × 14 = 196 cm².",
            "[1 mark] Required area = 308 − 196 = 112 cm²."
          ]
        },
        {
          "id": "M-ARC-7",
          "text": "Four equal circles, each of radius 3.5 cm, are placed so that each touches two others, with their centres forming a square. Find the area of the region enclosed between the circles inside the square formed by joining their centres. (Use π = 22/7)",
          "marks": 4,
          "difficulty": "Hard",
          "questionType": "subjective",
          "answer": "Joining the centres of the four touching circles forms a square of side 2r = 7 cm. Area of square = 7² = 49 cm². Each corner of the square contains a quadrant (angle 90°) of a circle: area of 4 quadrants = area of one circle = πr² = (22/7) × 3.5 × 3.5 = 38.5 cm². Required area = 49 − 38.5 = 10.5 cm².",
          "finalAnswer": "10.5 cm²",
          "solutionSteps": [
            "[1 mark] Square joining centres has side 2 × 3.5 = 7 cm; area = 49 cm².",
            "[1 mark] Each corner contains a quadrant (90° sector) of radius 3.5 cm; 4 quadrants = one full circle.",
            "[1 mark] Area of 4 quadrants = (22/7) × 3.5² = 38.5 cm².",
            "[1 mark] Required area = 49 − 38.5 = 10.5 cm²."
          ]
        },
        {
          "id": "M-ARC-8",
          "text": "A horse is tied to a rope of length 7 m at corner of rectangular field so that it can graze in quarter-circle. Find grazing area.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "The horse grazes a quadrant (90° sector) of radius r = 7 m (corner angle of rectangle = 90°).\nArea = (90/360) × πr² = (1/4) × (22/7) × 7 × 7 = 77/2 = 38.5 m².",
          "finalAnswer": "38.5 m²",
          "solutionSteps": [
            "[1 mark] Grazing region is a quadrant of radius 7 m (angle 90°).",
            "[1 mark] Area = (1/4)πr² = (1/4) × (22/7) × 49.",
            "[1 mark] = 38.5 m²."
          ]
        },
        {
          "id": "M-ARC-9",
          "text": "In a semicircle of radius r, find area enclosed by diameter and arc.",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective",
          "answer": "Area enclosed by the diameter and the arc = area of semicircle = ½ × area of circle = ½πr² = πr²/2.",
          "finalAnswer": "πr²/2",
          "solutionSteps": [
            "[1 mark] Region is a semicircle = half of the circle of radius r (area πr²).",
            "[1 mark] Area = ½πr² = πr²/2 square units."
          ]
        },
        {
          "id": "M-ARC-10",
          "text": "A circular park has radius 20 m. A path of uniform width 2 m runs around inside. Find area of path.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "Outer radius R = 20 m; path is inside, so inner radius r = 20 − 2 = 18 m. Area of path = πR² − πr² = π(20² − 18²) = π(400 − 324) = 76π m² = 76 × 22/7 = 1672/7 ≈ 238.86 m².",
          "finalAnswer": "76π m² ≈ 238.86 m²",
          "solutionSteps": [
            "[1 mark] Outer radius R = 20 m, inner radius r = 20 − 2 = 18 m.",
            "[1 mark] Area of path = π(R² − r²) = π(400 − 324) = 76π.",
            "[1 mark] = 76 × 22/7 ≈ 238.86 m²."
          ]
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
          "questionType": "subjective",
          "answer": "TSA of cube = 6a² = 6 × 5² = 6 × 25 = 150 cm².",
          "finalAnswer": "150 cm²",
          "solutionSteps": [
            "[1 mark] TSA of cube = 6a²",
            "[1 mark] = 6 × 25 = 150 cm²"
          ]
        },
        {
          "id": "M-SAV-2",
          "text": "A cuboid has dimensions 4 cm × 5 cm × 10 cm. Find its volume.",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective",
          "answer": "Volume of cuboid = l × b × h = 4 cm × 5 cm × 10 cm = 200 cm³.",
          "finalAnswer": "200 cm³",
          "solutionSteps": [
            "[1 mark] Volume of cuboid = l × b × h = 4 × 5 × 10.",
            "[1 mark] Volume = 200 cm³."
          ]
        },
        {
          "id": "M-SAV-3",
          "text": "Find curved surface area of cylinder of radius 7 cm and height 10 cm (π = 22/7).",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "CSA of cylinder = 2πrh = 2 × (22/7) × 7 × 10 = 440 cm².",
          "finalAnswer": "440 cm²",
          "solutionSteps": [
            "[1 mark] CSA = 2πrh = 2 × (22/7) × 7 × 10",
            "[1 mark] = 440 cm²"
          ]
        },
        {
          "id": "M-SAV-4",
          "text": "A cone has radius 3.5 cm and slant height 10 cm. Find its curved surface area.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "Curved surface area of a cone = πrl, with r = 3.5 cm, l = 10 cm. CSA = (22/7) × 3.5 × 10 = 22 × 0.5 × 10 = 110 cm².",
          "finalAnswer": "110 cm²",
          "solutionSteps": [
            "[1 mark] CSA of cone = πrl = (22/7) × 3.5 × 10.",
            "[1 mark] CSA = 110 cm² (with unit)."
          ]
        },
        {
          "id": "M-SAV-5",
          "text": "A cylindrical pipe has internal radius 3 cm, height 21 cm. Find volume of water it can hold.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "Volume of water the pipe can hold = volume of cylinder with internal radius r = 3 cm and height h = 21 cm = πr²h = (22/7) × 3 × 3 × 21 = 22 × 9 × 3 = 594 cm³.",
          "finalAnswer": "594 cm³",
          "solutionSteps": [
            "[1 mark] Volume of water = volume of cylinder = πr²h, with r = 3 cm, h = 21 cm.",
            "[1 mark] Substitution: (22/7) × 3² × 21 = 22 × 9 × 3.",
            "[1 mark] Volume = 594 cm³."
          ]
        },
        {
          "id": "M-SAV-7",
          "text": "Find volume of sphere whose diameter is 14 cm.",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective",
          "answer": "Radius r = 14/2 = 7 cm. Volume = (4/3)πr³ = (4/3) × (22/7) × 7 × 7 × 7 = (4 × 22 × 49)/3 = 4312/3 ≈ 1437.33 cm³.",
          "finalAnswer": "4312/3 cm³ ≈ 1437.33 cm³",
          "solutionSteps": [
            "[1 mark] r = 7 cm; V = (4/3)πr³.",
            "[1 mark] V = (4/3) × (22/7) × 343 = 4312/3 ≈ 1437.33 cm³."
          ]
        },
        {
          "id": "M-SAV-8",
          "text": "A cone and cylinder have same base radius and height. If volume of cylinder is 300 cm³, find volume of cone.",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective",
          "answer": "Volume of cylinder = πr²h = 300 cm³. Volume of cone with the same r and h = (1/3)πr²h = (1/3) × 300 = 100 cm³.",
          "finalAnswer": "100 cm³",
          "solutionSteps": [
            "[1 mark] Volume of cone = (1/3)πr²h = (1/3) × volume of cylinder (same r, h).",
            "[1 mark] = (1/3) × 300 = 100 cm³."
          ]
        },
        {
          "id": "M-SAV-9",
          "text": "A solid hemisphere is placed on top of a solid cylinder of same radius 3 cm and height 7 cm. Find total surface area of solid.",
          "marks": 4,
          "difficulty": "Hard",
          "questionType": "subjective",
          "answer": "r = 3 cm, h = 7 cm. The hemisphere's flat face covers the top of the cylinder exactly, so exposed surfaces are: curved surface of cylinder, base of cylinder and curved surface of hemisphere.\nTSA = 2πrh + πr² + 2πr² = πr(2h + 3r) = (22/7) × 3 × (14 + 9) = (22/7) × 69 = 1518/7 ≈ 216.86 cm².",
          "finalAnswer": "1518/7 cm² ≈ 216.86 cm²",
          "solutionSteps": [
            "[1 mark] Identify exposed surfaces: CSA of cylinder + base of cylinder + CSA of hemisphere.",
            "[1 mark] TSA = 2πrh + πr² + 2πr² = πr(2h + 3r).",
            "[1 mark] = (22/7) × 3 × (14 + 9) = (22/7) × 69.",
            "[1 mark] = 1518/7 ≈ 216.86 cm²."
          ]
        },
        {
          "id": "M-SAV-10",
          "text": "Rainwater from a roof of 22 m × 20 m drains into cylindrical tank of radius 4 m. If rainfall is 2.5 cm, find rise in water level in tank.",
          "marks": 4,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "Volume of rainwater on roof = 22 m × 20 m × 2.5 cm = 22 × 20 × 0.025 m³ = 11 m³. Let the rise in water level be h m. Volume in tank = πr²h = (22/7) × 4² × h. Equating: (22/7) × 16 × h = 11 ⇒ h = (11 × 7)/(22 × 16) = 7/32 m = 0.21875 m ≈ 21.9 cm.",
          "finalAnswer": "7/32 m ≈ 0.219 m (≈ 21.9 cm)",
          "solutionSteps": [
            "[1 mark] Rainfall 2.5 cm = 0.025 m; volume of water = 22 × 20 × 0.025 = 11 m³.",
            "[1 mark] Volume of water in tank = πr²h = (22/7) × 16 × h.",
            "[1 mark] (22/7) × 16 × h = 11.",
            "[1 mark] h = 7/32 m ≈ 0.219 m (≈ 21.9 cm)."
          ]
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
          "questionType": "subjective",
          "answer": "The mean of ungrouped data is the sum of all the observations divided by the number of observations: x̄ = (x1 + x2 + … + xn)/n = Σxi/n (for a frequency distribution, x̄ = Σfixi/Σfi).",
          "finalAnswer": "x̄ = Σxi / n",
          "solutionSteps": [
            "[1 mark] Mean = sum of observations ÷ number of observations, x̄ = Σxi/n (or Σfixi/Σfi)."
          ]
        },
        {
          "id": "M-STAT-2",
          "text": "Find mean of data: 6, 8, 10, 14, 12.",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective",
          "answer": "Mean = sum of observations / number of observations = (6 + 8 + 10 + 14 + 12)/5 = 50/5 = 10.",
          "finalAnswer": "10",
          "solutionSteps": [
            "[1 mark] Sum of observations = 50, number of observations = 5",
            "[1 mark] Mean = 50/5 = 10"
          ]
        },
        {
          "id": "M-STAT-3",
          "text": "Explain what is meant by ‘class interval’ and ‘class mark’ in grouped data.",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective",
          "answer": "Class interval: in grouped data, each group into which the observations are divided, e.g. 10–20, is called a class interval; its lower and upper values are the class limits and their difference is the class size (width). Class mark: the mid-point of a class interval, class mark = (upper class limit + lower class limit)/2, e.g. for 10–20 the class mark is 15. It is taken as the representative value of the class.",
          "finalAnswer": "Class interval = a group such as 10–20; class mark = (upper limit + lower limit)/2",
          "solutionSteps": [
            "[1 mark] Class interval: a group/range of values such as 10–20 into which data are grouped (with lower and upper limits).",
            "[1 mark] Class mark = (upper class limit + lower class limit)/2, the mid-point, e.g. 15 for 10–20."
          ]
        },
        {
          "id": "M-STAT-4",
          "text": "The mean of 8 numbers is 15. If two numbers 10 and 17 are added, find new mean.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "Sum of 8 numbers = 8 × 15 = 120. New sum = 120 + 10 + 17 = 147. New mean = 147/10 = 14.7.",
          "finalAnswer": "14.7",
          "solutionSteps": [
            "[1 mark] Sum of 8 numbers = 8 × 15 = 120; new sum = 120 + 10 + 17 = 147",
            "[1 mark] New mean = 147 ÷ 10 = 14.7"
          ]
        },
        {
          "id": "M-STAT-5",
          "text": "In a frequency distribution of marks, explain how you would find modal class.",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective",
          "answer": "In a grouped frequency distribution, the modal class is the class interval having the maximum frequency. So: (i) look at the frequency column and identify the highest frequency; (ii) the class interval corresponding to this highest frequency is the modal class. (The mode is then found within it using Mode = l + [(f1 − f0)/(2f1 − f0 − f2)] × h, where l is the lower limit of the modal class.)",
          "finalAnswer": "Modal class = class interval with the highest frequency",
          "solutionSteps": [
            "[1 mark] Modal class is the class interval with the maximum frequency.",
            "[1 mark] Method: scan the frequency column, find the highest frequency, and take its corresponding class interval as the modal class (used with l, f1, f0, f2, h in the mode formula)."
          ]
        },
        {
          "id": "M-STAT-6",
          "text": "From grouped frequency table, describe steps to calculate median of data.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "Steps to find the median of grouped data: (1) Prepare the cumulative frequency (cf) column and find n = Σfᵢ; compute n/2. (2) Locate the median class: the class whose cumulative frequency is just greater than (or equal to) n/2. Note l = lower limit of the median class, cf = cumulative frequency of the class preceding the median class, f = frequency of the median class, h = class size. (Make classes continuous if needed.) (3) Apply the formula: Median = l + [(n/2 − cf)/f] × h, and simplify.",
          "finalAnswer": "Median = l + [(n/2 − cf)/f] × h",
          "solutionSteps": [
            "[1 mark] Find cumulative frequencies, n = Σf and n/2.",
            "[1 mark] Identify the median class (cf just greater than n/2) and read l, cf (preceding class), f and h.",
            "[1 mark] Compute Median = l + [(n/2 − cf)/f] × h."
          ]
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
          "questionType": "subjective",
          "answer": "Advantage of mean: it is based on all the observations, is easy to calculate and is rigidly (mathematically) defined, so it can be used for further calculations and comparison of data sets.\nDisadvantage: it is strongly affected by extreme values (outliers) — e.g. for 2, 3, 4, 5, 100 the mean is 22.8, which does not represent most of the values. Hence, for data with extreme values, the median is a better measure of central tendency.",
          "finalAnswer": "Advantage: uses all observations; disadvantage: distorted by extreme values — median preferred",
          "solutionSteps": [
            "[1 mark] Advantage: mean uses every observation and is rigidly defined / easy to compute and use further.",
            "[1 mark] Disadvantage: mean is pulled by extreme values (outliers), so it may not represent the data (example illustrating).",
            "[1 mark] Conclusion: for data with extreme values, median is a more suitable measure."
          ]
        },
        {
          "id": "M-STAT-10",
          "text": "Using the empirical relationship Mode = 3 Median − 2 Mean, find the mode if Mean = 50.5 and Median = 52.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "Mode = 3 Median − 2 Mean = 3 × 52 − 2 × 50.5 = 156 − 101 = 55.",
          "finalAnswer": "55",
          "solutionSteps": [
            "[1 mark] Mode = 3 Median − 2 Mean.",
            "[1 mark] = 3 × 52 − 2 × 50.5 = 156 − 101.",
            "[1 mark] Mode = 55."
          ]
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
          "questionType": "subjective",
          "answer": "The theoretical (classical) probability of an event E is P(E) = (number of outcomes favourable to E)/(number of all possible outcomes of the experiment), assuming the outcomes are equally likely.",
          "finalAnswer": "P(E) = favourable outcomes / total equally likely outcomes",
          "solutionSteps": [
            "[1 mark] P(E) = number of outcomes favourable to E ÷ total number of possible (equally likely) outcomes."
          ]
        },
        {
          "id": "M-PROB-2",
          "text": "A coin is tossed once. What is probability of getting a tail?",
          "marks": 1,
          "difficulty": "Easy",
          "questionType": "subjective",
          "answer": "Possible outcomes: {H, T} = 2; favourable outcome (tail) = 1. P(tail) = 1/2.",
          "finalAnswer": "1/2",
          "solutionSteps": [
            "[1 mark] P(tail) = 1/2 (one favourable out of two equally likely outcomes)"
          ]
        },
        {
          "id": "M-PROB-3",
          "text": "Find probability of getting an even number when a fair die is rolled.",
          "marks": 1,
          "difficulty": "Easy",
          "questionType": "subjective",
          "answer": "Total outcomes = 6 {1, 2, 3, 4, 5, 6}. Favourable outcomes (even numbers) = {2, 4, 6} = 3. P(even) = 3/6 = 1/2.",
          "finalAnswer": "1/2",
          "solutionSteps": [
            "[1 mark] Favourable outcomes {2, 4, 6} = 3 out of 6, so P(even) = 3/6 = 1/2."
          ]
        },
        {
          "id": "M-PROB-4",
          "text": "A bag contains 3 red and 5 blue balls. One ball drawn at random. Find probability that it is red.",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective",
          "answer": "Total balls = 3 + 5 = 8, so total outcomes = 8. Favourable outcomes (red) = 3. P(red) = 3/8.",
          "finalAnswer": "3/8",
          "solutionSteps": [
            "[1 mark] Total outcomes = 3 + 5 = 8; favourable outcomes = 3",
            "[1 mark] P(red) = 3/8"
          ]
        },
        {
          "id": "M-PROB-5",
          "text": "A card drawn from a well-shuffled deck of 52 cards. Find probability of getting (i) a heart, (ii) a king.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "Total number of outcomes = 52. (i) Number of hearts = 13, so P(heart) = 13/52 = 1/4. (ii) Number of kings = 4, so P(king) = 4/52 = 1/13.",
          "finalAnswer": "(i) 1/4 (ii) 1/13",
          "solutionSteps": [
            "[1 mark] (i) Hearts = 13 of 52 cards; P(heart) = 13/52 = 1/4.",
            "[1 mark] (ii) Kings = 4 of 52 cards; P(king) = 4/52 = 1/13."
          ]
        },
        {
          "id": "M-PROB-6",
          "text": "A die is thrown once. Find probability of getting a number greater than 4.",
          "marks": 1,
          "difficulty": "Easy",
          "questionType": "subjective",
          "answer": "Possible outcomes when a die is thrown: 1, 2, 3, 4, 5, 6 (6 outcomes). Favourable outcomes (number > 4): 5, 6 (2 outcomes). P(number > 4) = 2/6 = 1/3.",
          "finalAnswer": "1/3",
          "solutionSteps": [
            "[1 mark] Favourable outcomes {5, 6} out of 6, so P = 2/6 = 1/3."
          ]
        },
        {
          "id": "M-PROB-7",
          "text": "If P(E) = 0.37, find P(not E).",
          "marks": 1,
          "difficulty": "Easy",
          "questionType": "subjective",
          "answer": "P(not E) = 1 − P(E) = 1 − 0.37 = 0.63.",
          "finalAnswer": "0.63",
          "solutionSteps": [
            "[1 mark] P(not E) = 1 − P(E) = 1 − 0.37 = 0.63."
          ]
        },
        {
          "id": "M-PROB-8",
          "text": "Two dice are tossed once. Find probability of getting sum equal to 9.",
          "marks": 3,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "Total outcomes when two dice are tossed = 6 × 6 = 36. Favourable outcomes for sum 9: (3, 6), (4, 5), (5, 4), (6, 3) = 4. P(sum = 9) = 4/36 = 1/9.",
          "finalAnswer": "1/9",
          "solutionSteps": [
            "[1 mark] Total equally likely outcomes = 36.",
            "[1 mark] Favourable outcomes: (3,6), (4,5), (5,4), (6,3) — 4 outcomes.",
            "[1 mark] P = 4/36 = 1/9."
          ]
        },
        {
          "id": "M-PROB-9",
          "text": "The probability of winning a game is 0.3. Find the probability of not winning it.",
          "marks": 2,
          "difficulty": "Medium",
          "questionType": "subjective",
          "answer": "Let E be the event of winning. P(not E) = 1 − P(E) = 1 − 0.3 = 0.7. So the probability of not winning the game is 0.7.",
          "finalAnswer": "0.7",
          "solutionSteps": [
            "[1 mark] P(not E) = 1 − P(E), where E is the event of winning.",
            "[1 mark] P(not winning) = 1 − 0.3 = 0.7."
          ]
        },
        {
          "id": "M-PROB-10",
          "text": "Event A is certain to happen and event B is impossible. What are P(A) and P(B)?",
          "marks": 2,
          "difficulty": "Easy",
          "questionType": "subjective",
          "answer": "Probability of a sure (certain) event is 1, and of an impossible event is 0. Hence P(A) = 1 and P(B) = 0.",
          "finalAnswer": "P(A) = 1, P(B) = 0",
          "solutionSteps": [
            "[1 mark] A is a sure event, so P(A) = 1.",
            "[1 mark] B is an impossible event, so P(B) = 0."
          ]
        }
      ]
    }
  }
}
;

/**
 * BANK-FIX-1 PR-2: Prompt-D rows that are not served. Ids never change; a withheld row is
 * filtered out of its pack below, before any alias pack is built from it.
 */
export const PROMPT_D_WITHHELD_IDS: ReadonlySet<string> = new Set<string>([
  "M-STAT-7",  // out-of-syllabus: skewness is not in CBSE Class 10 Statistics (2026-27)
  "M-STAT-8",  // unanswerable: refers to a frequency table that is not given (figure/table missing)
  "S-HER-14",  // out-of-syllabus: ABO blood-group inheritance (multiple alleles) is Class 12 content
  "M-PLE-7",   // garbled: the data give the degenerate fraction 4/4; the second condition is meaningless
]);

for (const packs of Object.values(promptDPracticePacks)) {
  for (const pack of Object.values(packs)) {
    pack.questions = pack.questions.filter((q) => !PROMPT_D_WITHHELD_IDS.has(q.id));
  }
}

// Alias for weak-topic drill demand: canonical topic key `trigonometry` serves the
// introduction + applications rows. BANK-FIX-1 PR-2 removed the 19 "-D2" "(Drill variant)"
// clones that used to pad it: they were the same questions again under a second id.
{
  const intro = promptDPracticePacks.maths.introduction_to_trigonometry?.questions || [];
  const applications = promptDPracticePacks.maths.applications_of_trigonometry?.questions || [];
  const seed = [...intro, ...applications];

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
    questions: seed,
  };
}

// Backwards compatibility: re-export promptDPracticePacks under the original name
// used by the practice engine.  This alias allows existing imports of
// `practicePacks` to continue working without modification.
export const practicePacks = promptDPracticePacks;
