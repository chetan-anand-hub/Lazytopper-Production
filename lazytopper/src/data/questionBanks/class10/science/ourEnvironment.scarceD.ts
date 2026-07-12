import type { CanonicalQuestion } from "../../../predictionTypes";

// Section-D (5-mark, "Long") scarce-band expansion for topic our-environment (Ch15).
// Authored (NOT PYQ) content modelled on authentic CBSE 2026-27 archetypes.
// Ch15-ONLY scope: ecosystem components, food chains/webs, trophic levels, energy
// flow (10% law / unidirectional / non-cyclic), biological magnification, ozone
// layer + depletion, biodegradable vs non-biodegradable waste, decomposers.
// Deleted Ch16 resource-management content is intentionally excluded.
// Each item is a genuinely distinct analytical demand — deduped against the
// assembled 7,262-row bank (Jaccard word-token < 0.45, 40-char prefix unique) and
// mutually distinct. Items flagged requiresDiagram carry a diagramDescription for a
// later figure pass (no figure is fabricated here). Every step prefix sums to 5.
export const OE_SCARCE_D: CanonicalQuestion[] = [
  {
    "id": "OESD-001",
    "subject": "Science",
    "topicKey": "our-environment",
    "subtopic": "Food Chains and Food Webs",
    "section": "D",
    "marks": 5,
    "format": "Long",
    "difficulty": "Medium",
    "bloomSkill": "Understanding",
    "questionText": "Distinguish between a food chain and a food web, giving one example of each. Explain, using the idea of energy transfer between trophic levels, why a food chain in nature rarely has more than four or five links.",
    "options": [],
    "answer": "A food chain is a single linear feeding pathway (e.g. Grass -> Deer -> Tiger); a food web is many interlinked food chains. Because only about 10% of energy passes to each next level, the usable energy runs out after four or five levels, so chains stay short.",
    "solutionSteps": [
      "[1 mark] Food chain: a single, straight-line sequence of organisms through which energy and nutrients pass, each organism eating the one before it. Each stage is a trophic level. Example: Grass -> Deer -> Tiger.",
      "[1 mark] Food web: a network formed by many food chains that are interconnected, because most organisms eat, and are eaten by, more than one kind of organism. Example: in a grassland the grass is eaten by deer, rabbits and grasshoppers, which are in turn eaten by several predators, so the chains cross and link.",
      "[1 mark] Key differences: a food chain is a single isolated pathway and is less stable, whereas a food web offers alternative food routes and so makes the ecosystem more stable; if one species is lost, a web can adjust but a lone chain may break.",
      "[1 mark] Energy transfer: at each trophic level only about 10% of the energy is stored as body mass and passed to the next level (the ten per cent law); about 90% is lost as heat in respiration and other life processes.",
      "[1 mark] Consequence for chain length: because the energy left keeps falling to a tenth at each step, after four or five levels the energy remaining is too little to support a further trophic level, so food chains in nature are usually limited to three to five links."
    ],
    "finalAnswer": "A food chain is one linear pathway while a food web is interlinked chains; because ~10% energy transfers per level, energy is exhausted after 4-5 levels, keeping food chains short.",
    "isCompetencyBased": false,
    "requiresDiagram": true,
    "diagramDescription": "A grassland food web: central 'Grass' (producer) with arrows to Grasshopper, Rabbit and Deer (primary consumers); Grasshopper -> Frog -> Snake; Rabbit and Deer -> Hawk/Tiger; Snake also -> Hawk. Arrows point in the direction of energy flow (from eaten to eater), showing several chains crossing to form a web. Alongside, a simple linear food chain Grass -> Deer -> Tiger for contrast."
  },
  {
    "id": "OESD-002",
    "subject": "Science",
    "topicKey": "our-environment",
    "subtopic": "Biological Magnification",
    "section": "D",
    "marks": 5,
    "format": "Long",
    "difficulty": "Hard",
    "bloomSkill": "Analysing",
    "questionText": "What is biological magnification? Explain the mechanism by which it occurs and state why organisms at the higher trophic levels are the most severely affected. Illustrate your answer with a worked example of a harmful chemical passing along the food chain: Phytoplankton -> Small fish -> Large fish -> Fish-eating bird.",
    "options": [],
    "answer": "Biological magnification is the progressive increase in the concentration of a harmful non-biodegradable chemical at each successive trophic level of a food chain. Because such chemicals are not broken down and each predator eats many prey, top consumers accumulate the highest concentration and are worst affected.",
    "solutionSteps": [
      "[1 mark] Definition: biological magnification (biomagnification) is the progressive increase in the concentration of a harmful, non-biodegradable chemical - such as certain pesticides (DDT) or mercury - in the bodies of organisms as we move to each successive trophic level of a food chain.",
      "[1 mark] Mechanism: these chemicals cannot be broken down or excreted, so they are stored in the body (mostly in fat). Since a predator eats a large number of prey over its life, it takes in the combined chemical load of all that prey, and this stored amount builds up at every step of the chain.",
      "[1 mark] Why top levels suffer most: because the concentration is multiplied at each transfer, the highest trophic level carries the greatest concentration; therefore the fish-eating bird (a top consumer) - and human beings, who also sit at the top of many food chains - are the most severely harmed.",
      "[1 mark] Worked example: suppose the chemical is present at 0.02 ppm in phytoplankton. Small fish that eat great numbers of phytoplankton concentrate it to about 0.2 ppm; large fish eating many small fish reach about 2 ppm; the fish-eating bird reaches about 20 ppm - roughly a thousand-fold rise from producer to top consumer. (These figures are illustrative, showing the ten-fold-per-level build-up.)",
      "[1 mark] Consequence: at such high concentrations the chemical causes serious harm - for example thinning of eggshells and reproductive failure in birds, and nerve, liver and reproductive damage in humans - which is why the use of non-biodegradable pesticides must be kept to a minimum."
    ],
    "finalAnswer": "Biomagnification is the step-by-step rise of a non-biodegradable chemical up a food chain; in the illustrative chain it climbs from ~0.02 ppm in phytoplankton to ~20 ppm in the fish-eating bird, so top consumers (including humans) are worst affected.",
    "isCompetencyBased": false,
    "requiresDiagram": false
  },
  {
    "id": "OESD-003",
    "subject": "Science",
    "topicKey": "our-environment",
    "subtopic": "Decomposers and Nutrient Cycling",
    "section": "D",
    "marks": 5,
    "format": "Long",
    "difficulty": "Medium",
    "bloomSkill": "Analysing",
    "questionText": "Who are decomposers? Explain their role in an ecosystem and describe, step by step, what would happen to the ecosystem if all the decomposers were suddenly removed.",
    "options": [],
    "answer": "Decomposers are micro-organisms (bacteria and fungi) that break down dead remains and waste into simple inorganic substances and return nutrients to the environment. Without them, dead matter would pile up, nutrients would stay locked in it, soil fertility would fall, plants would die and the whole ecosystem would collapse.",
    "solutionSteps": [
      "[1 mark] Decomposers are micro-organisms - chiefly bacteria and fungi - that feed on the dead remains and waste products (dead plants, animal bodies, excreta) of an ecosystem and break them down into simpler inorganic substances.",
      "[1 mark] Role 1 - recycling nutrients: while breaking down dead matter they release simple nutrients (minerals, nitrogen compounds, carbon dioxide) back into the soil, water and air, where producers absorb and reuse them, so the nutrient cycles keep running.",
      "[1 mark] Role 2 - cleaning and soil fertility: they clear away dead bodies and waste so that these do not accumulate, and by returning organic matter and minerals they keep the soil fertile for plant growth.",
      "[1 mark] If removed - immediate effect: dead bodies, leaf litter and waste would no longer be broken down and would pile up in the environment, and the nutrients present in them would remain locked inside the un-decayed matter.",
      "[1 mark] If removed - chain of consequences: with nutrients not returned, the soil would lose its fertility; producers (green plants) would not get minerals and would die; the food and energy supply for all consumers would then fail; and the nutrient cycles would break, so the entire ecosystem would gradually collapse."
    ],
    "finalAnswer": "Decomposers (bacteria and fungi) break down dead matter and recycle nutrients; if removed, waste accumulates, nutrients stay locked, soil turns infertile, plants and then consumers die, and the ecosystem collapses.",
    "isCompetencyBased": false,
    "requiresDiagram": false
  },
  {
    "id": "OESD-004",
    "subject": "Science",
    "topicKey": "our-environment",
    "subtopic": "Energy Flow Levels",
    "section": "D",
    "marks": 5,
    "format": "Long",
    "difficulty": "Hard",
    "bloomSkill": "Evaluating",
    "questionText": "The flow of energy in an ecosystem is said to be unidirectional and non-cyclic, whereas nutrients are recycled. Justify this statement, explaining what happens to the energy captured by producers as it passes to higher trophic levels and why that energy cannot be reused.",
    "options": [],
    "answer": "Energy enters as sunlight fixed by producers, and at each trophic level about 90% is lost as heat that organisms cannot recapture, so energy travels one way and never returns (unidirectional and non-cyclic). Nutrients, by contrast, are returned to the soil by decomposers and reused, so matter cycles while energy does not.",
    "solutionSteps": [
      "[1 mark] Entry of energy: producers (green plants) capture sunlight (energy from the Sun) and convert a small fraction (about 1%) of the sunlight falling on their leaves into chemical energy stored in food by photosynthesis; this is the energy that enters the ecosystem.",
      "[1 mark] Loss at each level: when this food energy passes from one trophic level to the next, only about 10% is stored and passed on, while about 90% is used up in respiration, movement and other life processes and is given out to the surroundings as heat energy.",
      "[1 mark] Why it cannot be reused: the heat energy released into the environment cannot be recaptured by organisms and converted back into food or biological work, so the energy makes a strictly one-way journey - Sun -> producers -> consumers -> lost as heat - which is why the flow is called unidirectional.",
      "[1 mark] Why it is non-cyclic: because energy is steadily lost as heat and never comes back to the producers or to the Sun, it does not move in a cycle; a continuous fresh supply of sunlight is needed every day to keep the ecosystem going.",
      "[1 mark] Contrast with nutrients: chemical nutrients such as carbon and nitrogen are not lost from the ecosystem - decomposers break down dead matter and return these nutrients to the soil, water and air, and producers reuse them. Thus matter is recycled again and again, whereas energy is not - justifying the statement."
    ],
    "finalAnswer": "Energy is fixed by producers, loses ~90% as unrecoverable heat at every level, and never returns - so its flow is unidirectional and non-cyclic; nutrients, being returned by decomposers, are recycled.",
    "isCompetencyBased": false,
    "requiresDiagram": false
  },
  {
    "id": "OESD-005",
    "subject": "Science",
    "topicKey": "our-environment",
    "subtopic": "Trophic Level Energy Analysis",
    "section": "D",
    "marks": 5,
    "format": "Long",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "A food chain in a grassland is: Grass -> Grasshopper -> Lizard -> Snake -> Hawk. The grass (producer) traps 1,00,000 J of energy. Using the ten per cent law, calculate the energy available at each successive trophic level, name the trophic level occupied by each organism, and state one conclusion about the length of food chains that follows from your figures.",
    "options": [],
    "answer": "Using the ten per cent law: Grass (T1) = 1,00,000 J, Grasshopper (T2) = 10,000 J, Lizard (T3) = 1,000 J, Snake (T4) = 100 J, Hawk (T5) = 10 J. The energy falls to only 10 J at the fifth level, showing why food chains rarely exceed four or five links.",
    "solutionSteps": [
      "[1 mark] Ten per cent law: only about 10% of the energy present at one trophic level is stored as body mass and handed on to the next level; the remaining ~90% is lost mainly as heat in respiration and life activities.",
      "[1 mark] Naming the trophic levels: Grass = producer (T1); Grasshopper = primary consumer / herbivore (T2); Lizard = secondary consumer (T3); Snake = tertiary consumer (T4); Hawk = quaternary consumer / top carnivore (T5).",
      "[1 mark] Energy at the lower levels: T1 grass = 1,00,000 J; T2 grasshopper = 10% of 1,00,000 = 10,000 J; T3 lizard = 10% of 10,000 = 1,000 J.",
      "[1 mark] Energy at the higher levels: T4 snake = 10% of 1,000 = 100 J; T5 hawk = 10% of 100 = 10 J.",
      "[1 mark] Conclusion: the energy has fallen from 1,00,000 J to just 10 J - only one ten-thousandth of the producer energy - by the fifth level. So little energy is left that a further trophic level could not be supported, which is why food chains are usually limited to four or five levels."
    ],
    "finalAnswer": "T1 = 1,00,000 J, T2 = 10,000 J, T3 = 1,000 J, T4 = 100 J, T5 = 10 J; the rapid ten-fold drop per level leaves too little energy after 4-5 links, so food chains stay short.",
    "isCompetencyBased": false,
    "requiresDiagram": true,
    "diagramDescription": "A horizontal food chain illustrating the ten per cent law: Grass (T1, 1,00,000 J) -> Grasshopper (T2, 10,000 J) -> Lizard (T3, 1,000 J) -> Snake (T4, 100 J) -> Hawk (T5, 10 J). Each arrow is labelled to show that only about 10% of the energy passes to the next level while about 90% is lost as heat and in respiration, so the energy available decreases ten-fold along the chain."
  },
  {
    "id": "OESD-006",
    "subject": "Science",
    "topicKey": "our-environment",
    "subtopic": "Ecological Systems",
    "section": "D",
    "marks": 5,
    "format": "Long",
    "difficulty": "Hard",
    "bloomSkill": "Evaluating",
    "questionText": "Organisms in an ecosystem are interdependent. (a) Explain how producers, consumers and decomposers depend on one another. (b) Predict, with reasons, what would happen to a grassland ecosystem if (i) all the green plants were destroyed, and (ii) all the top carnivores (such as hawks and snakes) were removed.",
    "options": [],
    "answer": "Consumers depend on producers for food, and producers depend on decomposers to return nutrients to the soil, so all three are interlinked. Destroying all green plants cuts off the food source and starves the whole ecosystem; removing all top carnivores lets herbivores multiply unchecked until they overgraze and destroy the producers - showing every component is needed for balance.",
    "solutionSteps": [
      "[1 mark] (a) Producers and consumers: producers (green plants) make food using sunlight; all consumers depend on producers for food and energy, either directly (herbivores eating plants) or indirectly (carnivores eating herbivores).",
      "[1 mark] (a) Role of decomposers: decomposers break down the dead bodies of producers and consumers and return the nutrients to the soil, which the producers absorb and reuse. Thus producers also depend on decomposers, and this interlinking keeps the ecosystem in balance.",
      "[1 mark] (b)(i) If all green plants were destroyed: the only source of food and captured energy would be cut off, so the herbivores would starve and die; the carnivores that feed on those herbivores would then also die, and the ecosystem would collapse.",
      "[1 mark] (b)(ii) If all top carnivores were removed: their prey - the herbivores and smaller animals - would no longer be checked by predation, so their populations would grow rapidly and become very large.",
      "[1 mark] (b)(ii) Result of the herbivore explosion: the greatly increased herbivores would overgraze and destroy the grass (the producers); the loss of food would then cause famine and disease among the animals - showing that removing even one component upsets the balance of the whole ecosystem."
    ],
    "finalAnswer": "Producers, consumers and decomposers are mutually dependent; destroying producers starves and collapses the ecosystem, while removing top carnivores causes a herbivore explosion that overgrazes and destroys the producers - both disturb the whole balance.",
    "isCompetencyBased": false,
    "requiresDiagram": false
  },
  {
    "id": "OESD-007",
    "subject": "Science",
    "topicKey": "our-environment",
    "subtopic": "Ozone Layer Depletion",
    "section": "D",
    "marks": 5,
    "format": "Long",
    "difficulty": "Hard",
    "bloomSkill": "Analysing",
    "questionText": "Ozone (O3) in the stratosphere is continually formed and destroyed by chemical reactions. (a) Write the reactions by which ozone is formed from oxygen in the stratosphere. (b) Explain, with the reactions involved, how chlorofluorocarbons (CFCs) destroy ozone and why one CFC molecule can destroy a very large number of ozone molecules. (c) State two harmful effects of ozone depletion.",
    "options": [],
    "answer": "Ozone forms when UV splits O2 into oxygen atoms (O2 -> O + O) which then join O2 (O + O2 -> O3). CFCs release chlorine atoms under UV; each chlorine destroys ozone (Cl + O3 -> ClO + O2) and is then regenerated, acting as a catalyst that breaks down many O3 molecules. Depletion lets more UV-B reach Earth, causing skin cancer and cataracts and damaging crops.",
    "solutionSteps": [
      "[1 mark] (a) Formation - step 1: high-energy ultraviolet (UV) radiation from the Sun splits an oxygen molecule into two free oxygen atoms: O2 -> (UV) O + O.",
      "[1 mark] (a) Formation - step 2: each free, reactive oxygen atom combines with an oxygen molecule to form ozone: O + O2 -> O3. (Overall, under UV, 3 O2 -> 2 O3.)",
      "[1 mark] (b) CFC action: CFCs drift up to the stratosphere, where UV frees a chlorine atom from them, e.g. CF2Cl2 -> (UV) CF2Cl + Cl. This chlorine atom then reacts with ozone: Cl + O3 -> ClO + O2, destroying an ozone molecule.",
      "[1 mark] (b) Why one CFC destroys many: the ClO formed reacts further and regenerates the chlorine atom (ClO + O -> Cl + O2), so the same chlorine atom is free again to attack more ozone. Acting as a catalyst, one chlorine atom can therefore break down thousands of ozone molecules before it is finally removed.",
      "[1 mark] (c) Harmful effects of depletion: a thinner ozone layer lets more harmful UV-B radiation reach the ground, which causes skin cancer, cataracts (eye damage) and weakened immunity in humans, and damages crops and phytoplankton (any two)."
    ],
    "finalAnswer": "Ozone forms via O2 -> O + O then O + O2 -> O3; CFCs release chlorine that catalytically destroys ozone (Cl + O3 -> ClO + O2, chlorine regenerated), so one CFC breaks down thousands of O3 molecules, raising UV-B and causing skin cancer, cataracts and crop damage.",
    "isCompetencyBased": false,
    "requiresDiagram": false
  }
];
