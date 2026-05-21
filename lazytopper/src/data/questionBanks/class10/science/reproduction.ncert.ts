import type { CanonicalQuestion } from '../../../predictionTypes';

// Source: NCERT Class 10 Science — Chapter 7: How do Organisms Reproduce?
// topicKey: "reproduction"
// Extraction date: 2026-05-21
// Source PDF: cbse-papers/gdrive/.../Science/ebooks/jesc107.pdf (READY)
// Coverage: §7.2 (2+5), §7.3 (5) in-text + 11 exercises = 23 questions

export const REPRODUCTION_NCERT: CanonicalQuestion[] = [
  // ===== §7.2 In-text (DNA + Variation) =====
  { id: "REPR-NCERT-7-SA-001", subject: "Science", topicKey: "reproduction", subtopic: "DNA Copying", section: "B", marks: 2, format: "Short", difficulty: "Easy", bloomSkill: "Understanding",
    questionText: "What is the importance of DNA copying in reproduction?",
    answer: "DNA copying ensures that the genetic information (blueprint for body design) is transmitted from parent to offspring, maintaining the species' identity. Each new cell or organism needs its own copy of DNA. Slight errors during copying produce variations that are essential for evolution and species survival under changing environments.",
    solutionSteps: ["DNA carries genetic information for body design and proteins.", "Copying ensures offspring inherit parent's traits → species continuity.", "Small copying errors → variations → raw material for evolution.", "Without DNA copying, no inheritance and no survival of species."],
    finalAnswer: "Ensures continuity of species by transmitting genetic info; copying errors create variations driving evolution.",
    ncertRef: "In-text Q1 (after §7.1)", isCompetencyBased: true,
    strategyHint: "Mention BOTH continuity (inheritance) AND variation (evolution)." },

  { id: "REPR-NCERT-7-SA-002", subject: "Science", topicKey: "reproduction", subtopic: "Variation", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Why is variation beneficial to the species but not necessarily for the individual?",
    answer: "Variation may not benefit each individual — some variants may be poorly adapted and die. However, at the species level, variation ensures that if environmental conditions change drastically (e.g., temperature rise, disease), at least some individuals with the favourable variants will survive and continue the species. Thus variation is insurance for species survival, not guaranteed benefit for every individual.",
    solutionSteps: ["Variation arises from copying errors during reproduction.", "Some variations may even harm individuals → may die or be disadvantaged.", "But at population level: in case of environmental change, variants adapted to new conditions survive.", "Hence variation = species' insurance against extinction, not individual benefit."],
    finalAnswer: "Variation may not help every individual but ensures species survives environmental change.",
    ncertRef: "In-text Q2 (after §7.1)", isCompetencyBased: true,
    strategyHint: "Distinguish species-level benefit vs individual-level outcome." },

  // ===== §7.2 In-text (after asexual reproduction) =====
  { id: "REPR-NCERT-7-SA-003", subject: "Science", topicKey: "reproduction", subtopic: "Fission Modes", section: "C", marks: 3, format: "Short", difficulty: "Easy", bloomSkill: "Understanding",
    questionText: "How does binary fission differ from multiple fission?",
    answer: "Binary fission: parent cell divides into TWO equal daughter cells (e.g., Amoeba, bacteria). Multiple fission: parent cell divides into MANY (numerous) daughter cells simultaneously (e.g., Plasmodium). In binary, division occurs once → 2 cells; in multiple, nucleus divides many times first, then cytoplasm splits → many cells at once.",
    solutionSteps: ["Binary fission: one cell → 2 daughter cells. Single division.", "Multiple fission: one cell → many daughter cells (e.g., Plasmodium produces many at once).", "Binary occurs in normal favourable conditions; multiple often occurs during unfavourable conditions (within a protective cyst).", "Examples: Binary = Amoeba, bacteria; Multiple = Plasmodium, Amoeba (during unfavourable conditions)."],
    finalAnswer: "Binary: 1 → 2 cells. Multiple: 1 → many cells simultaneously.",
    ncertRef: "In-text Q1 (after §7.2)", isCompetencyBased: true },

  { id: "REPR-NCERT-7-SA-004", subject: "Science", topicKey: "reproduction", subtopic: "Spores", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "How will an organism be benefited if it reproduces through spores?",
    answer: "Spore reproduction allows the organism to: (i) produce a large number of spores at once → high reproductive rate; (ii) spores have thick protective walls → survive harsh conditions like dryness or heat; (iii) spores are light and easily dispersed by wind/water/animals → colonise new areas; (iv) can remain dormant until conditions are favourable.",
    solutionSteps: ["Spores are produced in large numbers in sporangia.", "Thick protective wall → survives unfavourable conditions.", "Easily dispersed by wind/water → wide spread.", "Spores germinate only when conditions are favourable → high survival."],
    finalAnswer: "Large numbers, protective coat, easy dispersal, survival in harsh conditions, dormancy until favourable.",
    ncertRef: "In-text Q2 (after §7.2)", isCompetencyBased: true },

  { id: "REPR-NCERT-7-SA-005", subject: "Science", topicKey: "reproduction", subtopic: "Regeneration Limits", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Can you think of reasons why more complex organisms cannot give rise to new individuals through regeneration?",
    answer: "Complex organisms have highly specialised cells organised into tissues, organs and organ systems arranged in specific positions. Each cell type performs a specialised function. Their cells cannot dedifferentiate easily and rebuild the entire body plan. Regeneration would require coordinated growth of all systems (nervous, circulatory, etc.), which is not possible from random body pieces.",
    solutionSteps: ["Complex organisms have many specialised cell types organised into tissues and organs.", "Cells are differentiated → cannot easily become other cell types.", "Each organ has specific position and function → rebuilding requires coordinated development.", "Random body pieces lack the organisation needed for an entire body plan → regeneration impossible."],
    finalAnswer: "Complex bodies have specialised tissues and organs; cells can't dedifferentiate to rebuild whole body plan.",
    ncertRef: "In-text Q3 (after §7.2)", isCompetencyBased: true },

  { id: "REPR-NCERT-7-SA-006", subject: "Science", topicKey: "reproduction", subtopic: "Vegetative Propagation", section: "B", marks: 2, format: "Short", difficulty: "Easy", bloomSkill: "Understanding",
    questionText: "Why is vegetative propagation practised for growing some types of plants?",
    answer: "Vegetative propagation is practised because: (i) plants flower and fruit earlier than those grown from seeds; (ii) genetically identical to parent → desirable traits preserved; (iii) useful for plants that have lost seed-producing ability (e.g., banana, orange, rose, jasmine); (iv) all plants produced are uniform; (v) faster method of propagation.",
    solutionSteps: ["Vegetative propagation = new plant from root, stem or leaf of parent.", "Used for seedless plants (banana, orange, rose, jasmine).", "Plants flower/fruit earlier than seed-grown ones.", "All offspring are genetically identical (clones) — preserves desirable traits."],
    finalAnswer: "Faster fruit-bearing, useful for seedless plants, preserves desirable traits, all clones of parent.",
    ncertRef: "In-text Q4 (after §7.2)", isCompetencyBased: true },

  { id: "REPR-NCERT-7-SA-007", subject: "Science", topicKey: "reproduction", subtopic: "DNA Copying", section: "B", marks: 2, format: "Short", difficulty: "Easy", bloomSkill: "Understanding",
    questionText: "Why is DNA copying an essential part of the process of reproduction?",
    answer: "DNA contains genetic information that determines body design and traits of an organism. During reproduction, parent must pass on this information to offspring. Without DNA copying, the offspring would lack the blueprint for forming the same kind of organism. DNA copying ensures continuity of life and species, and slight errors create variations that drive evolution.",
    solutionSteps: ["DNA holds blueprint for body design (proteins, traits).", "Reproduction transfers parent's genetic info to offspring → requires DNA copy.", "Without copying: offspring lacks genetic info → cannot form organism.", "Copying errors give variations → basis of evolution."],
    finalAnswer: "DNA copying ensures offspring inherit parent's blueprint → continuity of species; errors give evolutionary variation.",
    ncertRef: "In-text Q5 (after §7.2)", isCompetencyBased: false },

  // ===== §7.3 In-text =====
  { id: "REPR-NCERT-7-SA-008", subject: "Science", topicKey: "reproduction", subtopic: "Pollination vs Fertilisation", section: "C", marks: 3, format: "Short", difficulty: "Easy", bloomSkill: "Understanding",
    questionText: "How is the process of pollination different from fertilisation?",
    answer: "Pollination: transfer of pollen grains from anther (male part) to stigma (female part) of a flower, by agents like wind, water, insects, animals. Self-pollination (same flower) or cross-pollination (different flowers). Fertilisation: fusion of the male gamete (in pollen) with the female gamete (in ovule) inside the ovary → forms zygote. Pollination precedes fertilisation; pollination is external transfer, fertilisation is fusion of gametes.",
    solutionSteps: ["Pollination = transfer of pollen from anther to stigma (by wind, insects, etc.).", "Fertilisation = fusion of male gamete (sperm in pollen) with female gamete (egg in ovule) → zygote.", "Pollination is external; fertilisation is internal in ovule.", "Pollination happens FIRST; then pollen tube grows → fertilisation occurs in ovule.", "Pollination = transfer; Fertilisation = fusion."],
    finalAnswer: "Pollination: transfer of pollen (anther → stigma). Fertilisation: fusion of male + female gametes → zygote.",
    ncertRef: "In-text Q1 (after §7.3)", isCompetencyBased: true,
    strategyHint: "Common confusion — pollination is transfer, fertilisation is fusion." },

  { id: "REPR-NCERT-7-SA-009", subject: "Science", topicKey: "reproduction", subtopic: "Male Reproductive System", section: "B", marks: 2, format: "Short", difficulty: "Easy", bloomSkill: "Remembering",
    questionText: "What is the role of the seminal vesicles and the prostate gland?",
    answer: "Seminal vesicles and prostate gland secrete fluids that mix with sperms during their transport through the vas deferens. These secretions: (i) provide a fluid medium for sperm transport (easier passage); (ii) provide nutrition (e.g., fructose for sperm energy); (iii) make the medium slightly alkaline to protect sperms from acidic vaginal environment; (iv) increase sperm motility.",
    solutionSteps: ["Both glands secrete fluids into the vas deferens that mix with sperms.", "Fluid provides nutrition (especially fructose for sperm energy).", "Fluid creates an alkaline medium → neutralises vaginal acidity.", "Helps in sperm transport and motility."],
    finalAnswer: "Provide fluid medium, nutrition, and alkaline environment to sperms — aids transport and survival.",
    ncertRef: "In-text Q2 (after §7.3)", isCompetencyBased: false },

  { id: "REPR-NCERT-7-SA-010", subject: "Science", topicKey: "reproduction", subtopic: "Puberty (Female)", section: "B", marks: 2, format: "Short", difficulty: "Easy", bloomSkill: "Remembering",
    questionText: "What are the changes seen in girls at the time of puberty?",
    answer: "Changes in girls at puberty: (i) breast size increases with darkening of nipple area; (ii) onset of menstruation; (iii) growth of thick hair in armpits and pubic region; (iv) skin becomes oily, may develop pimples; (v) widening of hips; (vi) increase in height and weight; (vii) increased self-awareness and emotional changes.",
    solutionSteps: ["Caused by secretion of oestrogen from ovaries.", "Physical: breast development, darkening of nipple area.", "Reproductive: onset of menstruation (menarche).", "Hair: growth in armpits, pubic area.", "Skin: oily, pimples may develop.", "Skeletal: widening of hips, growth in height."],
    finalAnswer: "Breast development, menstruation onset, hair growth, oily skin, widening hips, height increase.",
    ncertRef: "In-text Q3 (after §7.3)", isCompetencyBased: false },

  { id: "REPR-NCERT-7-SA-011", subject: "Science", topicKey: "reproduction", subtopic: "Embryo Nourishment", section: "B", marks: 2, format: "Short", difficulty: "Easy", bloomSkill: "Understanding",
    questionText: "How does the embryo get nourishment inside the mother's body?",
    answer: "The embryo gets nourishment through a special tissue called the placenta. Placenta is a disc-like structure embedded in the uterine wall. It has villi (finger-like projections) on the embryo's side; on the mother's side are blood spaces surrounding the villi. This provides a large surface area for diffusion of glucose, oxygen and nutrients from mother's blood to the embryo, and removal of waste from the embryo to the mother's blood.",
    solutionSteps: ["A special tissue called PLACENTA develops in the uterine wall.", "Embryo's side has villi (finger-like projections) → large surface area.", "Mother's side has blood spaces around villi.", "Glucose and O₂ diffuse from mother's blood to embryo via placenta.", "Embryo's waste (urea, CO₂) diffuses back to mother for excretion."],
    finalAnswer: "Through placenta — villi on embryo's side + maternal blood spaces; allows nutrient/gas exchange.",
    ncertRef: "In-text Q4 (after §7.3)", isCompetencyBased: true,
    strategyHint: "Mention BOTH nutrient supply AND waste removal." },

  { id: "REPR-NCERT-7-SA-012", subject: "Science", topicKey: "reproduction", subtopic: "Contraception", section: "B", marks: 2, format: "Short", difficulty: "Easy", bloomSkill: "Understanding",
    questionText: "If a woman is using a copper-T, will it help in protecting her from sexually transmitted diseases?",
    answer: "No. Copper-T is an Intra-Uterine Contraceptive Device (IUCD) that prevents pregnancy by stopping the fertilised egg from implanting in the uterus. However, it does NOT create a barrier between the male and female reproductive organs, so it does NOT prevent the exchange of body fluids during intercourse. Therefore, it provides NO protection against sexually transmitted diseases (STDs) like HIV-AIDS, syphilis, gonorrhoea. Only condoms provide some protection against STDs.",
    solutionSteps: ["Copper-T = IUCD placed inside the uterus → only prevents pregnancy.", "It does NOT block exchange of body fluids during intercourse.", "STDs (HIV, syphilis, gonorrhoea) spread via body fluids.", "Hence Copper-T offers NO protection from STDs.", "Only condoms (barrier method) can prevent STDs to some extent."],
    finalAnswer: "No — Copper-T prevents only pregnancy, not STDs (no barrier to body fluid exchange).",
    ncertRef: "In-text Q5 (after §7.3)", isCompetencyBased: true,
    strategyHint: "Distinguish contraception (preventing pregnancy) from STD protection (barrier needed)." },

  // ===== EXERCISES =====
  { id: "REPR-NCERT-7-MCQ-001", subject: "Science", topicKey: "reproduction", subtopic: "Budding", section: "A", marks: 1, format: "MCQ", difficulty: "Easy", bloomSkill: "Remembering",
    questionText: "Asexual reproduction takes place through budding in",
    options: ["Amoeba", "Yeast", "Plasmodium", "Leishmania"],
    answer: "Yeast",
    solutionSteps: ["Amoeba: binary fission. Plasmodium: multiple fission. Leishmania: binary fission.", "Yeast: BUDDING — small bud grows on parent and detaches."],
    finalAnswer: "(b) Yeast.", ncertRef: "Exercise Q1", isCompetencyBased: false },

  { id: "REPR-NCERT-7-MCQ-002", subject: "Science", topicKey: "reproduction", subtopic: "Female Reproductive Anatomy", section: "A", marks: 1, format: "MCQ", difficulty: "Easy", bloomSkill: "Remembering",
    questionText: "Which of the following is not a part of the female reproductive system in human beings?",
    options: ["Ovary", "Uterus", "Vas deferens", "Fallopian tube"],
    answer: "Vas deferens",
    solutionSteps: ["Ovary, uterus, fallopian tube = female reproductive organs.", "Vas deferens = MALE reproductive duct (carries sperms)."],
    finalAnswer: "(c) Vas deferens.", ncertRef: "Exercise Q2", isCompetencyBased: false },

  { id: "REPR-NCERT-7-MCQ-003", subject: "Science", topicKey: "reproduction", subtopic: "Flower Parts", section: "A", marks: 1, format: "MCQ", difficulty: "Easy", bloomSkill: "Remembering",
    questionText: "The anther contains",
    options: ["sepals", "ovules", "pistil", "pollen grains"],
    answer: "pollen grains",
    solutionSteps: ["Anther is the top of stamen (male part).", "It produces and contains pollen grains (male gametes)."],
    finalAnswer: "(d) Pollen grains.", ncertRef: "Exercise Q3", isCompetencyBased: false },

  { id: "REPR-NCERT-7-SA-013", subject: "Science", topicKey: "reproduction", subtopic: "Sexual vs Asexual", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "What are the advantages of sexual reproduction over asexual reproduction?",
    answer: "Advantages of sexual reproduction: (i) Generates more variation (combines DNA from two parents) → faster evolution; (ii) Better adaptation to changing environment; (iii) Offspring are not exact copies → at least some may survive new conditions; (iv) Helps in speciation and natural selection; (v) Halving + recombination of chromosomes maintains chromosome number across generations.",
    solutionSteps: ["Sexual reproduction combines DNA from two parents.", "This generates MORE variation than asexual (which gives clones).", "Variations → better adaptability to changing environments.", "Useful for evolution and survival of species in long term.", "Asexual offspring are identical → entire population could be wiped out by same threat."],
    finalAnswer: "More variation → better adaptability, evolution, survival under environmental changes.",
    ncertRef: "Exercise Q4", isCompetencyBased: true },

  { id: "REPR-NCERT-7-SA-014", subject: "Science", topicKey: "reproduction", subtopic: "Testes Function", section: "B", marks: 2, format: "Short", difficulty: "Easy", bloomSkill: "Remembering",
    questionText: "What are the functions performed by the testis in human beings?",
    answer: "Two main functions: (1) Production of male gametes (sperms) via spermatogenesis — occurs in seminiferous tubules of the testes; requires temperature lower than body, hence testes are in scrotum outside abdomen. (2) Secretion of male sex hormone testosterone — regulates sperm production and brings about male secondary sexual characters (facial hair, voice cracking, muscle development) at puberty.",
    solutionSteps: ["Testes are located in scrotum (outside abdomen) for lower temperature needed for sperm production.", "Function 1: Produce sperms (male gametes).", "Function 2: Secrete testosterone (male sex hormone).", "Testosterone causes puberty changes and regulates sperm production."],
    finalAnswer: "(1) Sperm production; (2) Secretion of testosterone (male sex hormone).",
    ncertRef: "Exercise Q5", isCompetencyBased: false },

  { id: "REPR-NCERT-7-SA-015", subject: "Science", topicKey: "reproduction", subtopic: "Menstruation", section: "B", marks: 2, format: "Short", difficulty: "Easy", bloomSkill: "Understanding",
    questionText: "Why does menstruation occur?",
    answer: "Each month, the uterine lining thickens and becomes vascular in preparation to receive a fertilised egg. If fertilisation does NOT occur, the egg disintegrates and the uterine lining is no longer needed. The thickened lining (with blood, mucus, unfertilised egg) breaks down and is shed through the vagina over 2–8 days. This is menstruation. It marks the unsuccessful conception of that cycle and prepares the uterus for the next cycle.",
    solutionSteps: ["Ovary releases one egg per month (ovulation).", "Uterus prepares its lining (thick + vascular) to receive a fertilised egg.", "If fertilisation does NOT occur, egg dies within ~1 day.", "Thickened lining is shed → menstruation (blood + tissue + mucus) for 2–8 days.", "Marks one menstrual cycle; uterus prepares again next month."],
    finalAnswer: "Menstruation = shedding of unfertilised uterine lining when no pregnancy occurs.",
    ncertRef: "Exercise Q6", isCompetencyBased: true },

  { id: "REPR-NCERT-7-LA-001", subject: "Science", topicKey: "reproduction", subtopic: "Flower Diagram", section: "D", marks: 5, format: "Long", difficulty: "Medium", bloomSkill: "Understanding",
    questionText: "Draw a labelled diagram of the longitudinal section of a flower.",
    answer: "Longitudinal section shows: outermost — sepals (calyx), then petals (corolla), then stamens (anther + filament — male part), and the central pistil (stigma + style + ovary with ovules — female part). The receptacle is at the base where all parts attach.",
    solutionSteps: ["Draw the receptacle at the base.", "From outside in: sepals (green, outermost), petals (coloured, attractive).", "Stamens (male): filament + anther (with pollen).", "Pistil (female, central): stigma at top + style + ovary at bottom containing ovules.", "Label all parts clearly: sepal, petal, anther, filament, stigma, style, ovary, ovule, receptacle.", "Show inside the ovary with ovules visible."],
    finalAnswer: "Diagram should show: sepals, petals, stamens (anther + filament), pistil (stigma + style + ovary with ovules), receptacle.",
    ncertRef: "Exercise Q7", isCompetencyBased: false,
    strategyHint: "REQUIRES-FIGURE: standard flower longitudinal section diagram." },

  { id: "REPR-NCERT-7-SA-016", subject: "Science", topicKey: "reproduction", subtopic: "Contraception Methods", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Understanding",
    questionText: "What are the different methods of contraception?",
    answer: "Four main categories: (1) Mechanical/Barrier methods — condom (male), diaphragm (female): physically prevent sperm from meeting egg. (2) Chemical methods — oral pills, hormonal injections: change hormonal balance to prevent ovulation. (3) Intra-Uterine Devices (IUDs) — Copper-T, loop: placed in uterus to prevent implantation. (4) Surgical methods — vasectomy (cutting vas deferens in male), tubectomy (blocking fallopian tubes in female): permanent prevention of gamete passage.",
    solutionSteps: ["Barrier methods: condom (male), diaphragm (female) — physical block.", "Hormonal methods: oral contraceptive pills, hormonal injections — prevent ovulation.", "IUDs: Copper-T, loop — prevent implantation in uterus.", "Surgical methods: vasectomy (male), tubectomy (female) — permanent block of gamete passage.", "Some methods (condoms) also protect against STDs."],
    finalAnswer: "Barrier (condom), hormonal (pills), IUD (Copper-T), surgical (vasectomy, tubectomy).",
    ncertRef: "Exercise Q8", isCompetencyBased: true },

  { id: "REPR-NCERT-7-SA-017", subject: "Science", topicKey: "reproduction", subtopic: "Reproduction Modes", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "How are the modes for reproduction different in unicellular and multicellular organisms?",
    answer: "Unicellular organisms: use simple methods — fission (binary in Amoeba, multiple in Plasmodium), budding (yeast), spore formation. Cell division IS reproduction. Multicellular organisms: have specialised cells/tissues, cannot just divide. Use complex methods — fragmentation (Spirogyra), regeneration (Hydra, Planaria), budding (Hydra), vegetative propagation (plants), spore formation (Rhizopus), and sexual reproduction (involving gametes from specialised reproductive organs).",
    solutionSteps: ["Unicellular: entire cell IS the organism → cell division = reproduction.", "Methods: binary fission (Amoeba), multiple fission (Plasmodium), budding (yeast), spore formation.", "Multicellular: have specialised tissues and organs.", "Cannot divide cell-by-cell — need specialised reproductive cells/organs.", "Methods: fragmentation, regeneration, budding (Hydra), vegetative propagation, spore formation, sexual reproduction.", "Sexual reproduction requires gametes from specialised organs."],
    finalAnswer: "Unicellular: simple cell division. Multicellular: specialised reproductive structures + complex methods including sexual reproduction.",
    ncertRef: "Exercise Q9", isCompetencyBased: true },

  { id: "REPR-NCERT-7-SA-018", subject: "Science", topicKey: "reproduction", subtopic: "Population Stability", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "How does reproduction help in providing stability to populations of species?",
    answer: "Reproduction balances the death rate by producing new individuals to maintain population size. It transmits parental traits to offspring (via DNA copying), preserving species characteristics and ensuring they remain adapted to their ecological niche. Variations created during reproduction help the species adapt to environmental changes, preventing extinction. Together, reproduction ensures both consistency (species identity) and adaptability (survival under change) — both essential for population stability.",
    solutionSteps: ["Reproduction creates new individuals → replaces those that die.", "DNA copying transmits parental traits → species identity preserved.", "Variations from reproduction enable adaptation to environmental change.", "Stable population = balance of birth, death, and adaptation.", "Hence reproduction is the basis for population stability over time."],
    finalAnswer: "Reproduction maintains population by creating new individuals AND ensures species adaptability through variation.",
    ncertRef: "Exercise Q10", isCompetencyBased: true },

  { id: "REPR-NCERT-7-SA-019", subject: "Science", topicKey: "reproduction", subtopic: "Reasons for Contraception", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Understanding",
    questionText: "What could be the reasons for adopting contraceptive methods?",
    answer: "Reasons: (1) To prevent unwanted pregnancies — avoid health risks to mother/child if not ready; (2) To space children — allow time between pregnancies for mother's recovery and child care; (3) To control population growth — important for resource availability and standard of living; (4) Protection from sexually transmitted diseases (barrier methods like condoms); (5) Family planning according to economic and social circumstances; (6) Reduces maternal mortality from unsafe abortions.",
    solutionSteps: ["Prevent unwanted pregnancies that may harm woman's physical/mental health.", "Allow spacing between children for better health of mother and child.", "Population control — better standard of living and resource distribution.", "Barrier methods (condoms) also protect against STDs (HIV, syphilis).", "Enables family planning aligned with economic and social factors."],
    finalAnswer: "Avoid unwanted pregnancy, space children, population control, STD protection, family planning.",
    ncertRef: "Exercise Q11", isCompetencyBased: true,
    strategyHint: "Mention BOTH individual reasons (health) AND societal reasons (population control)." },
];
