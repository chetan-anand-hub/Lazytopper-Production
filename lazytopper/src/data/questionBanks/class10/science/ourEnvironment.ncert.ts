import type { CanonicalQuestion } from '../../../predictionTypes';

// Source: NCERT Class 10 Science — Chapter 13: Our Environment (jesc113.pdf)
// Source URL: https://ncert.nic.in/textbook/pdf/jesc113.pdf (official NCERT site), every page
//   footed "Reprint 2026-27". Downloaded 2026-10-17, 4194929 bytes,
//   SHA-256 3F61F0574E60BB8FC41FEB3CC13F818621D9C17A5D5F51634154A5DE35918B2D.
// topicKey: "our-environment"
// Extraction date: 2026-10-17 (pymupdf + ftfy.fix_text; question text verbatim)
// Syllabus: CBSE 2026-27 — Our Environment is RETAINED (Unit V; syllabusGuard.ts bans no
//   sub-topic of this chapter), so no question is filtered for syllabus.
// Coverage: in-text QUESTIONS blocks p. 212 (2), p. 214 (3), p. 216 (2) + Exercises Q2-Q9 (8)
//   = 15 questions. Exercise Q1 skipped: its key is not unique (options (c) and (d) both list
//   only biodegradable items; leather in (a) is biodegradable too), and an MCQ must have one key.
// Solutions: AUTHORED model answers (NCERT prints no solutions). The whole array is registered
//   in AI_GENERATED_SOLUTION_SOURCES (canonicalQuestionBank.ts): the question is authentic, the
//   worked solution awaits owner/teacher verification.

export const OE_NCERT: CanonicalQuestion[] = [
  // ===== §13.1 In-text (p. 212) =====
  { id: "OE-NCERT-13-SA-001", subject: "Science", topicKey: "our-environment", subtopic: "Food Chain and Trophic Levels", section: "C", marks: 3, format: "Short", difficulty: "Easy", bloomSkill: "Understanding",
    questionText: "What are trophic levels? Give an example of a food chain and state the different trophic levels in it.",
    answer: "Each step or level of a food chain at which transfer of food (energy) takes place is called a trophic level. Example (grassland): Grass → Grasshopper → Frog → Snake. Grass (producer/autotroph) is at the first trophic level; the grasshopper (herbivore, primary consumer) at the second; the frog (small carnivore, secondary consumer) at the third; and the snake (larger carnivore, tertiary consumer) at the fourth trophic level.",
    solutionSteps: ["[1 mark] Trophic level: each step or level of a food chain at which transfer of food (energy) takes place.", "[1 mark] Example of a food chain: Grass → Grasshopper → Frog → Snake.", "[1 mark] Trophic levels: grass (producer) — first; grasshopper (herbivore / primary consumer) — second; frog (secondary consumer) — third; snake (tertiary consumer) — fourth."],
    finalAnswer: "Trophic levels are the steps of a food chain; e.g. Grass (T1, producer) → Grasshopper (T2, primary consumer) → Frog (T3, secondary consumer) → Snake (T4, tertiary consumer).",
    ncertRef: "In-text Q1 §13.1 (p. 212)", isCompetencyBased: false },

  { id: "OE-NCERT-13-SA-002", subject: "Science", topicKey: "our-environment", subtopic: "Decomposers", section: "B", marks: 2, format: "Short", difficulty: "Easy", bloomSkill: "Remembering",
    questionText: "What is the role of decomposers in the ecosystem?",
    answer: "Decomposers (micro-organisms such as bacteria and fungi) break down the dead remains and waste products of organisms, converting complex organic substances into simple inorganic substances. These simple substances go into the soil and are used up once more by plants, so decomposers replenish the soil and recycle nutrients; they also clear the environment of dead bodies and wastes.",
    solutionSteps: ["[1 mark] Decomposers (bacteria and fungi) break down the dead remains and waste products of organisms — complex organic substances into simple inorganic substances.", "[1 mark] These simple substances return to the soil and are used again by plants, so nutrients are recycled, the soil is replenished and the environment is kept clean."],
    finalAnswer: "They break down dead remains and wastes into simple inorganic substances that return to the soil for reuse by plants (nutrient recycling and natural replenishment of soil).",
    ncertRef: "In-text Q2 §13.1 (p. 212)", isCompetencyBased: false },

  // ===== §13.2.2 In-text (p. 214) =====
  { id: "OE-NCERT-13-SA-003", subject: "Science", topicKey: "our-environment", subtopic: "Biodegradable and Non-biodegradable", section: "B", marks: 2, format: "Short", difficulty: "Easy", bloomSkill: "Understanding",
    questionText: "Why are some substances biodegradable and some non-biodegradable?",
    answer: "Enzymes are specific in their action, so a particular substance is broken down only if micro-organisms (bacteria and other saprophytes) have the specific enzymes for it. Substances such as food waste, paper and wood are broken down by these biological processes, so they are biodegradable. Human-made materials such as plastics are not broken down by the action of bacteria or other saprophytes, as no enzymes act on them, so they are non-biodegradable and persist for a long time.",
    solutionSteps: ["[1 mark] Enzymes are specific: a substance is broken down by biological processes only if micro-organisms (bacteria, saprophytes) have enzymes for it — such substances are biodegradable.", "[1 mark] Substances like plastics are not acted upon by these enzymes, so they are not broken down by micro-organisms and persist — they are non-biodegradable."],
    finalAnswer: "Because decomposer enzymes are specific: substances they can break down are biodegradable; substances (e.g. plastics) with no such enzymes are non-biodegradable.",
    ncertRef: "In-text Q1 §13.2.2 (p. 214)", isCompetencyBased: false },

  { id: "OE-NCERT-13-SA-004", subject: "Science", topicKey: "our-environment", subtopic: "Biodegradable and Non-biodegradable Waste", section: "B", marks: 2, format: "Short", difficulty: "Easy", bloomSkill: "Understanding",
    questionText: "Give any two ways in which biodegradable substances would affect the environment.",
    answer: "(i) When biodegradable waste piles up in large amounts, its decomposition produces a foul smell and the heaps become breeding grounds for flies, mosquitoes and disease-causing germs, spreading diseases. (ii) Decomposition of large amounts of such waste releases gases such as carbon dioxide and methane into the air (and can pollute nearby water). When managed properly (e.g. composting), biodegradable substances are broken down into simple substances that enrich the soil with nutrients.",
    solutionSteps: ["[1 mark] Large heaps of decomposing biodegradable waste give a foul smell and breed flies, mosquitoes and germs, spreading diseases.", "[1 mark] Their decomposition releases gases such as carbon dioxide and methane into the atmosphere (when composted properly, they instead return nutrients to the soil as manure)."],
    finalAnswer: "(i) Foul smell and breeding of disease-carrying flies/germs when they pile up; (ii) release of gases like CO₂ and methane on decomposition (properly composted, they enrich the soil).",
    ncertRef: "In-text Q2 §13.2.2 (p. 214)", isCompetencyBased: false },

  { id: "OE-NCERT-13-SA-005", subject: "Science", topicKey: "our-environment", subtopic: "Biodegradable and Non-biodegradable Waste", section: "B", marks: 2, format: "Short", difficulty: "Easy", bloomSkill: "Understanding",
    questionText: "Give any two ways in which non-biodegradable substances would affect the environment.",
    answer: "(i) Non-biodegradable substances persist in the environment for a long time and accumulate, polluting the soil and water; for example, plastics reduce soil fertility, choke drains and harm animals that swallow them. (ii) Harmful non-biodegradable chemicals such as pesticides enter food chains and get accumulated progressively at each trophic level (biological magnification), harming organisms, including human beings, at the top.",
    solutionSteps: ["[1 mark] They persist and accumulate, polluting soil and water (e.g. plastics reduce soil fertility, choke drains, and harm animals that swallow them).", "[1 mark] Harmful non-biodegradable chemicals (e.g. pesticides) enter the food chain and concentrate at higher trophic levels — biological magnification."],
    finalAnswer: "(i) They persist and pollute soil and water (e.g. plastics); (ii) toxic ones enter food chains and undergo biological magnification.",
    ncertRef: "In-text Q3 §13.2.2 (p. 214)", isCompetencyBased: false },

  // ===== §13.2.2 In-text (p. 216) =====
  { id: "OE-NCERT-13-SA-006", subject: "Science", topicKey: "our-environment", subtopic: "Ozone Layer and Its Depletion", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Understanding",
    questionText: "What is ozone and how does it affect any ecosystem?",
    answer: "Ozone (O₃) is a molecule formed by three atoms of oxygen. At the higher levels of the atmosphere it is formed when UV radiation splits some O₂ molecules into free oxygen atoms (O₂ → O + O), which combine with O₂ (O + O₂ → O₃). This ozone shields the surface of the earth from the Sun's ultraviolet (UV) radiation, which is highly damaging to organisms (for example, it causes skin cancer in human beings). If the ozone layer is depleted (e.g. by CFCs), more UV radiation reaches the earth, harming living organisms — causing skin cancer and eye damage in humans and harming plants and aquatic organisms — and so disturbing the whole ecosystem. (At ground level ozone itself is a deadly poison.)",
    solutionSteps: ["[1 mark] Ozone (O₃) is a molecule of three oxygen atoms, formed in the upper atmosphere when UV radiation splits O₂ into O atoms which combine with O₂ (O + O₂ → O₃).", "[1 mark] The ozone layer shields the earth's surface from the Sun's harmful ultraviolet (UV) radiation.", "[1 mark] Depletion of the ozone layer (by CFCs) lets more UV radiation reach the earth, causing skin cancer and eye damage in humans and harming plants and other organisms, which disturbs the ecosystem."],
    finalAnswer: "Ozone (O₃) is a three-oxygen-atom molecule; in the upper atmosphere it protects ecosystems by absorbing the Sun's harmful UV radiation, and its depletion exposes organisms to UV damage.",
    ncertRef: "In-text Q1 §13.2.2 (p. 216)", isCompetencyBased: false },

  { id: "OE-NCERT-13-SA-007", subject: "Science", topicKey: "our-environment", subtopic: "Waste Management", section: "B", marks: 2, format: "Short", difficulty: "Easy", bloomSkill: "Applying",
    questionText: "How can you help in reducing the problem of waste disposal? Give any two methods.",
    answer: "(i) Segregate waste at home into biodegradable and non-biodegradable waste, and turn the biodegradable (kitchen) waste into compost. (ii) Reduce, reuse and recycle — for example, carry cloth bags instead of plastic bags, reuse containers, and send paper, plastic and metal waste for recycling.",
    solutionSteps: ["[1 mark] Segregate biodegradable and non-biodegradable waste at home and compost the biodegradable (kitchen) waste.", "[1 mark] Reduce, reuse and recycle — e.g. use cloth bags instead of plastic bags, reuse containers, and send paper/plastic/metal for recycling."],
    finalAnswer: "(i) Segregate waste and compost biodegradable waste; (ii) reduce, reuse and recycle (e.g. cloth bags instead of plastic bags).",
    ncertRef: "In-text Q2 §13.2.2 (p. 216)", isCompetencyBased: true },

  // ===== Exercises (pp. 216-217) =====
  // Exercise Q1 deliberately not included — see header (non-unique key).
  { id: "OE-NCERT-13-MCQ-001", subject: "Science", topicKey: "our-environment", subtopic: "Food Chain", section: "A", marks: 1, format: "MCQ", difficulty: "Easy", bloomSkill: "Understanding",
    questionText: "Which of the following constitute a food-chain?",
    options: ["Grass, wheat and mango", "Grass, goat and human", "Goat, cow and elephant", "Grass, fish and goat"],
    answer: "Grass, goat and human",
    solutionSteps: ["[1 mark] Grass (producer) is eaten by the goat (herbivore), which is eaten by humans (consumer), so Grass → Goat → Human is a food chain; (a) has only producers, (c) only herbivores, and in (d) the goat does not eat fish — option (b)."],
    finalAnswer: "Grass, goat and human — option (b)",
    ncertRef: "Exercise Q2", isCompetencyBased: false },

  { id: "OE-NCERT-13-MCQ-002", subject: "Science", topicKey: "our-environment", subtopic: "Human Impact on the Environment", section: "A", marks: 1, format: "MCQ", difficulty: "Easy", bloomSkill: "Understanding",
    questionText: "Which of the following are environment-friendly practices?",
    options: ["Carrying cloth-bags to put purchases in while shopping", "Switching off unnecessary lights and fans", "Walking to school instead of getting your mother to drop you on her scooter", "All of the above"],
    answer: "All of the above",
    solutionSteps: ["[1 mark] Cloth bags avoid non-biodegradable plastic bags, switching off unnecessary lights and fans saves electricity, and walking avoids fuel use and vehicle pollution — all three are environment-friendly, so option (d)."],
    finalAnswer: "All of the above — option (d)",
    ncertRef: "Exercise Q3", isCompetencyBased: false },

  { id: "OE-NCERT-13-SA-008", subject: "Science", topicKey: "our-environment", subtopic: "Food Chain — Impact of Removing a Trophic Level", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "What will happen if we kill all the organisms in one trophic level?",
    answer: "The food chain will be broken and the ecological balance disturbed. The organisms of the next higher trophic level lose their food, so they will starve and die (or move away). The organisms of the lower trophic level, which were eaten by the killed organisms, will no longer be kept in check, so their population will increase greatly. For example, if all the frogs in Grass → Grasshopper → Frog → Snake are killed, the snakes lose their food while the grasshoppers multiply and may destroy the grass. If the producers are killed, all the consumers will die for want of food.",
    solutionSteps: ["[1 mark] The food chain breaks: organisms of the next higher trophic level lose their food and will starve and die (or migrate).", "[1 mark] Organisms of the lower trophic level are no longer eaten, so their population increases greatly (e.g. killing all frogs: snakes starve, grasshoppers multiply and damage the grass).", "[1 mark] Hence the ecological balance of the ecosystem is disturbed; if the producers are killed, all the consumers die."],
    finalAnswer: "The food chain breaks: the next higher level starves, the lower level multiplies unchecked, and the ecological balance is upset.",
    ncertRef: "Exercise Q4", isCompetencyBased: true },

  { id: "OE-NCERT-13-SA-009", subject: "Science", topicKey: "our-environment", subtopic: "Food Chain — Impact of Removing a Trophic Level", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Will the impact of removing all the organisms in a trophic level be different for different trophic levels? Can the organisms of any trophic level be removed without causing any damage to the ecosystem?",
    answer: "Yes, the impact differs. Removing the producers would be the most damaging: no energy from sunlight would enter the ecosystem and all the consumers would die. Removing the herbivores would let the producers grow unchecked while the carnivores starve. Removing the top carnivores would let the herbivores multiply and over-consume the vegetation. Removing the decomposers would let dead remains and wastes pile up and stop the return of nutrients to the soil. No — the organisms of no trophic level can be removed without causing damage, because all the levels are interdependent and removing any one upsets the ecological balance.",
    solutionSteps: ["[1 mark] Yes, the impact differs: removing producers is the most damaging — no energy enters the ecosystem and all consumers die.", "[1 mark] Removing herbivores: producers grow unchecked and carnivores starve; removing top carnivores: herbivores multiply and overgraze; removing decomposers: wastes pile up and nutrients are not recycled.", "[1 mark] No — no trophic level can be removed without damage, because all trophic levels are interdependent and the ecological balance is disturbed."],
    finalAnswer: "Yes, the impact differs from level to level (worst for producers); no trophic level can be removed without damaging the ecosystem, as all levels are interdependent.",
    ncertRef: "Exercise Q5", isCompetencyBased: true },

  { id: "OE-NCERT-13-SA-010", subject: "Science", topicKey: "our-environment", subtopic: "Biological Magnification", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Understanding",
    questionText: "What is biological magnification? Will the levels of this magnification be different at different levels of the ecosystem?",
    answer: "Biological magnification is the progressive accumulation (increase in concentration) of harmful non-biodegradable chemicals, such as pesticides, at each successive trophic level of a food chain. Yes, the levels differ: these chemicals are not degraded, so they get accumulated progressively at each trophic level. The concentration is lowest at the producer level and highest at the top trophic level; as human beings occupy the top level in any food chain, the maximum concentration of these chemicals accumulates in our bodies.",
    solutionSteps: ["[1 mark] Biological magnification: progressive increase in the concentration of harmful non-biodegradable chemicals (e.g. pesticides) at successive trophic levels of a food chain.", "[1 mark] Yes, the levels differ: since the chemicals are not degraded, they accumulate progressively at each trophic level.", "[1 mark] Concentration is lowest in producers and highest at the top trophic level — maximum in human beings, who occupy the top of food chains."],
    finalAnswer: "Accumulation of non-biodegradable chemicals at increasing concentration along a food chain; yes — lowest in producers, highest at the top level (humans).",
    ncertRef: "Exercise Q6", isCompetencyBased: false },

  { id: "OE-NCERT-13-SA-011", subject: "Science", topicKey: "our-environment", subtopic: "Biodegradable and Non-biodegradable Waste", section: "C", marks: 3, format: "Short", difficulty: "Easy", bloomSkill: "Understanding",
    questionText: "What are the problems caused by the non-biodegradable wastes that we generate?",
    answer: "(i) They are not broken down by micro-organisms, so they persist for a long time and pile up as garbage, needing more and more land for disposal. (ii) They pollute the soil and water; plastics reduce soil fertility and choke drains and sewers, causing water-logging, and animals that swallow plastic bags can die. (iii) Harmful non-biodegradable chemicals such as pesticides enter food chains and get concentrated at higher trophic levels (biological magnification), harming human health; burning such wastes also releases toxic gases.",
    solutionSteps: ["[1 mark] They are not decomposed by micro-organisms, so they persist and pile up as garbage, needing more land for disposal.", "[1 mark] They pollute soil and water: plastics reduce soil fertility, choke drains (water-logging) and kill animals that swallow them.", "[1 mark] Toxic non-biodegradable chemicals (e.g. pesticides) enter food chains and undergo biological magnification, harming human health; burning such waste releases toxic gases."],
    finalAnswer: "They persist and accumulate, pollute soil and water (plastics choke drains and harm animals), and toxic ones biomagnify through food chains.",
    ncertRef: "Exercise Q7", isCompetencyBased: false },

  { id: "OE-NCERT-13-SA-012", subject: "Science", topicKey: "our-environment", subtopic: "Biodegradable and Non-biodegradable Waste", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Evaluating",
    questionText: "If all the waste we generate is biodegradable, will this have no impact on the environment?",
    answer: "No, it will still have an impact, though a smaller one. Biodegradable waste takes time to decompose, and the very large amounts we generate would pile up faster than they decompose. Such heaps give a foul smell and become breeding grounds for flies, mosquitoes and germs that spread diseases; their decomposition releases gases such as methane and carbon dioxide, and liquids seeping from them can pollute water. So even biodegradable waste must be managed properly, for example by segregation and composting.",
    solutionSteps: ["[1 mark] No — biodegradable waste will still affect the environment, as large amounts take time to decompose and pile up.", "[1 mark] The heaps give a foul smell, breed flies, mosquitoes and germs that spread diseases, and release gases like methane and CO₂ (and can pollute water).", "[1 mark] Hence the impact is smaller than that of non-biodegradable waste but not zero; it must be managed properly, e.g. by segregation and composting."],
    finalAnswer: "No. Large amounts of biodegradable waste still cause foul smell, disease-spreading pests and gas release; it must be managed (e.g. composting).",
    ncertRef: "Exercise Q8", isCompetencyBased: true },

  { id: "OE-NCERT-13-SA-013", subject: "Science", topicKey: "our-environment", subtopic: "Ozone Layer Depletion", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Understanding",
    questionText: "Why is damage to the ozone layer a cause for concern? What steps are being taken to limit this damage?",
    answer: "The ozone layer in the upper atmosphere shields the surface of the earth from the Sun's ultraviolet (UV) radiation. If it is damaged, more UV radiation reaches the earth; UV radiation is highly damaging to organisms — it causes skin cancer (and eye damage such as cataract) in human beings and harms plants and other organisms. The damage has been linked to synthetic chemicals such as chlorofluorocarbons (CFCs), used as refrigerants and in fire extinguishers. Steps: in 1987 the United Nations Environment Programme (UNEP) forged an agreement to freeze CFC production at 1986 levels, and it is now mandatory for all manufacturing companies to make CFC-free refrigerators throughout the world.",
    solutionSteps: ["[1 mark] The ozone layer shields the earth from the Sun's harmful UV radiation; damage lets more UV reach the earth.", "[1 mark] UV radiation causes skin cancer (and eye damage) in humans and harms plants and other organisms; the damage is linked to CFCs used as refrigerants and in fire extinguishers.", "[1 mark] Steps: the 1987 UNEP agreement to freeze CFC production at 1986 levels, and making CFC-free refrigerators mandatory throughout the world."],
    finalAnswer: "Ozone depletion lets harmful UV radiation reach the earth (skin cancer, harm to organisms); CFC production was frozen at 1986 levels by the 1987 UNEP agreement and CFC-free refrigerators are now mandatory.",
    ncertRef: "Exercise Q9", isCompetencyBased: false },
];
