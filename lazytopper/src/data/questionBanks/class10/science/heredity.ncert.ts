import type { CanonicalQuestion } from '../../../predictionTypes';

// Source: NCERT Class 10 Science — Chapter 8: Heredity
// topicKey: "heredity"
// Extraction date: 2026-05-22
// Syllabus: CBSE 2026-27 (Evolution section removed; only Heredity retained)
// Coverage: §8.1 in-text (2) + §8.2 in-text (4) + Exercises (4) = 10 questions

export const HEREDITY_NCERT: CanonicalQuestion[] = [
  // ===== §8.1 In-text (Variation during Reproduction) =====
  { id: "HERED-NCERT-8-SA-001", subject: "Science", topicKey: "heredity", subtopic: "Variation in Reproduction", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "If a trait A exists in 10% of a population of an asexually reproducing species and a trait B exists in 60% of the same population, which trait is likely to have arisen earlier?",
    answer: "Trait B (present in 60%) is likely to have arisen earlier. In asexual reproduction, variations arise only due to small inaccuracies in DNA copying and accumulate slowly across generations. A trait that has existed longer has had more generations to be passed down and to spread through the population. Trait A (only 10%) appears to be a more recent variation and has had less time to accumulate.",
    solutionSteps: ["Asexual reproduction creates new variation only via DNA-copying errors; spread is slow.", "A trait existing in a larger fraction of the population has had more generations to be inherited.", "Trait B = 60% → present for many generations → arose earlier.", "Trait A = 10% → recent variation → arose later."],
    finalAnswer: "Trait B arose earlier — its higher frequency means it has had more generations to accumulate.",
    ncertRef: "In-text Q1 §8.1", isCompetencyBased: true,
    strategyHint: "Frequency of a trait ∝ time it has had to accumulate in an asexually reproducing population." },

  { id: "HERED-NCERT-8-SA-002", subject: "Science", topicKey: "heredity", subtopic: "Variation in Reproduction", section: "B", marks: 2, format: "Short", difficulty: "Easy", bloomSkill: "Understanding",
    questionText: "How does the creation of variations in a species promote survival?",
    answer: "Variations within a species ensure that not all individuals are identical. If the environment changes drastically (temperature rise, new disease, food shortage), some individuals will have variations that allow them to survive the new conditions, while others may perish. Variation therefore acts as the species' insurance against extinction — at least some variants will be suited to new environments, ensuring continuity of the species even when conditions change.",
    solutionSteps: ["Variations make individuals in a species slightly different in traits and tolerances.", "When environment changes (heat wave, disease, resource scarcity), some variants will be better suited.", "Those suited variants survive and reproduce → species continues.", "Without variation, a single environmental change could wipe out the entire species."],
    finalAnswer: "Variation lets some individuals survive environmental change, ensuring species' long-term survival.",
    ncertRef: "In-text Q2 §8.1", isCompetencyBased: true,
    strategyHint: "Variation is species-level insurance — talk about environmental change, not individual benefit." },

  // ===== §8.2 In-text (Heredity, Mendel, Sex Determination) =====
  { id: "HERED-NCERT-8-SA-003", subject: "Science", topicKey: "heredity", subtopic: "Dominant vs Recessive", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Understanding",
    questionText: "How do Mendel's experiments show that traits may be dominant or recessive?",
    answer: "Mendel crossed a pure tall pea plant (TT) with a pure short plant (tt). The F1 progeny were ALL tall — none was medium-height and none was short. This showed that only one of the two parental traits (tallness) was expressed in the F1, while shortness was hidden. When F1 tall plants were self-pollinated, the F2 generation had both tall and short plants in a 3:1 ratio. The trait that appeared in F1 and dominated in F2 is the dominant trait (tallness); the trait that disappeared in F1 but reappeared in F2 is the recessive trait (shortness).",
    solutionSteps: ["Mendel crossed pure tall (TT) × pure short (tt) pea plants.", "F1 generation: all plants tall — no medium-height plants → shortness was hidden, not blended.", "F1 (Tt) selfed → F2 = 3 tall : 1 short (TT, Tt, Tt, tt).", "Tallness reappears in F2 in 3/4 plants → dominant. Shortness reappears in only 1/4 → recessive.", "Conclusion: a single T can mask the t allele, so T is dominant and t recessive."],
    finalAnswer: "F1 showed only one trait (tall), F2 reappearance in 3:1 ratio → tall = dominant, short = recessive.",
    ncertRef: "Exercise / In-text Q1 §8.2", isCompetencyBased: true,
    strategyHint: "Use the TT × tt cross and the 3:1 F2 ratio — that is the textbook proof." },

  { id: "HERED-NCERT-8-SA-004", subject: "Science", topicKey: "heredity", subtopic: "Dihybrid Cross", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "How do Mendel's experiments show that traits are inherited independently?",
    answer: "Mendel crossed a pure tall plant with round seeds (TTRR) with a pure short plant with wrinkled seeds (ttrr). The F1 progeny were all tall and round-seeded. When F1 plants were self-pollinated, the F2 generation showed FOUR combinations of traits: tall-round, tall-wrinkled, short-round, short-wrinkled, in a ratio of approximately 9:3:3:1. The appearance of NEW combinations (tall-wrinkled and short-round, not present in parents) shows that the gene for height segregates independently of the gene for seed shape. Hence each trait is inherited independently of the other.",
    solutionSteps: ["Mendel performed a dihybrid cross: TTRR (tall, round) × ttrr (short, wrinkled).", "F1 generation: all TtRr — tall, round seeds (both dominant traits shown).", "F1 selfed → F2 shows 4 phenotypes in 9:3:3:1 ratio.", "New combinations (tall-wrinkled, short-round) appear that were not in parents.", "These new combinations are possible only if the two traits separate independently during gamete formation."],
    finalAnswer: "F2 = 9:3:3:1 with new combinations → each trait is inherited independently of the other.",
    ncertRef: "Exercise / In-text Q2 §8.2", isCompetencyBased: true,
    strategyHint: "Highlight the new combinations and the 9:3:3:1 ratio — that's the signature of independent inheritance." },

  { id: "HERED-NCERT-8-SA-005", subject: "Science", topicKey: "heredity", subtopic: "Inheritance", section: "C", marks: 3, format: "Short", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "A man with blood group A marries a woman with blood group O and their daughter has blood group O. Is this information enough to tell you which of the traits — blood group A or O — is dominant? Why or why not?",
    answer: "No, this single observation is NOT enough to decide which is dominant. The daughter being O means she has two O alleles (one from each parent). Since the mother is O (OO), she contributed an O allele. The father, being A, contributed an O allele to the daughter — so he must be heterozygous (AO). For the father to express blood group A despite having one O allele, A must be dominant over O. However, to firmly conclude this, we would need to see this result across many such matings, since one family could be a special case. The key reasoning that supports A being dominant is that the father expressed A despite carrying an O allele.",
    solutionSteps: ["Daughter is blood group O → genotype must be OO.", "Mother is O → genotype OO → gave an O allele to daughter.", "So the father (blood group A) must have given an O allele → his genotype is AO, not AA.", "Even though father carries an O allele, he EXPRESSES A → A is dominant over O.", "The information is suggestive, not conclusive — we would need many such crosses to be sure; one family doesn't prove the rule, but the logic above supports A being dominant."],
    finalAnswer: "Yes, the logic suggests A is dominant (father AO still shows A); but one family isn't conclusive proof.",
    ncertRef: "In-text Q3 §8.2", isCompetencyBased: true,
    strategyHint: "Write parental genotypes, then ask: 'How can the father show A if he carries an O allele?'" },

  { id: "HERED-NCERT-8-SA-006", subject: "Science", topicKey: "heredity", subtopic: "Sex Determination", section: "C", marks: 3, format: "Short", difficulty: "Easy", bloomSkill: "Understanding",
    questionText: "How is the sex of the child determined in human beings?",
    answer: "Humans have 23 pairs of chromosomes; 22 pairs are autosomes and the 23rd pair is the sex chromosomes. Females have two X chromosomes (XX) while males have one X and one Y (XY). The mother always passes an X chromosome to her child. The father can pass either an X (→ daughter, XX) or a Y (→ son, XY). Therefore, the sex of the child is determined by the chromosome contributed by the FATHER. If father gives X → girl; if father gives Y → boy. The chance of either outcome is approximately 50%.",
    solutionSteps: ["Females have sex chromosomes XX; males have XY.", "Mother always passes one X chromosome to the child (her gametes are all X).", "Father's gametes are 50% X and 50% Y.", "If sperm carries X → zygote XX → girl. If sperm carries Y → zygote XY → boy.", "Hence the father's chromosome decides the child's sex."],
    finalAnswer: "The father's sperm decides sex — X-bearing sperm → girl (XX), Y-bearing sperm → boy (XY).",
    ncertRef: "In-text Q4 §8.2", isCompetencyBased: true,
    strategyHint: "Be precise: mother contributes ONLY X; the father's chromosome (X or Y) decides." },

  // ===== Exercises =====
  { id: "HERED-NCERT-8-MCQ-001", subject: "Science", topicKey: "heredity", subtopic: "Dihybrid Cross", section: "A", marks: 1, format: "MCQ", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "A Mendelian experiment consisted of breeding tall pea plants bearing violet flowers with short pea plants bearing white flowers. The progeny all bore violet flowers, but almost half of them were short. This suggests that the genetic make-up of the tall parent can be depicted as",
    options: ["TTWW", "TTww", "TtWW", "TtWw"],
    answer: "TtWW",
    solutionSteps: ["All progeny had violet flowers → violet (W) is dominant; since ALL progeny are violet, the tall parent must be homozygous WW (because if it were Ww, ~half would be white given a ww parent).", "Almost half the progeny are short → tallness segregates 1:1 → the tall parent must be heterozygous Tt (because Tt × tt → 1 Tt : 1 tt = 50% tall, 50% short).", "Combining: tall parent = Tt for height and WW for flower colour → TtWW.", "So option (c) TtWW is correct."],
    finalAnswer: "TtWW — option (c).",
    ncertRef: "Exercise Q1", isCompetencyBased: true,
    strategyHint: "Analyse each trait separately: all violet → WW; half short → Tt." },

  { id: "HERED-NCERT-8-SA-007", subject: "Science", topicKey: "heredity", subtopic: "Inheritance", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "A study found that children with light-coloured eyes are likely to have parents with light-coloured eyes. On this basis, can we say anything about whether the light eye colour trait is dominant or recessive? Why or why not?",
    answer: "No, this observation alone cannot tell us whether light eye colour is dominant or recessive. The data only tells us that the trait IS inherited (children resemble parents), but does not show what happens when parents have CONTRASTING eye colours. To decide dominance vs recessiveness, we need to study children of parents with different eye colours (e.g., one light-eyed and one dark-eyed) and observe what proportion of children show each trait. Knowing that like begets like is consistent with both dominant and recessive inheritance — we need contrasting parent crosses to distinguish.",
    solutionSteps: ["The given data: light-eyed parents → light-eyed children. This shows inheritance, not dominance.", "Dominance is identified by what happens when contrasting traits are crossed — e.g., light × dark parents.", "If most children of light × dark parents are dark → dark is dominant. If light → light is dominant.", "The given study lacks crosses between light and dark — so dominance cannot be inferred.", "Hence the information is insufficient to conclude whether light eye colour is dominant or recessive."],
    finalAnswer: "No — the data shows only inheritance; we need crosses between contrasting eye colours to identify dominance.",
    ncertRef: "Exercise Q2", isCompetencyBased: true,
    strategyHint: "Dominance is judged from contrasting crosses, not from like-with-like matings." },

  { id: "HERED-NCERT-8-LA-001", subject: "Science", topicKey: "heredity", subtopic: "Monohybrid Cross", section: "D", marks: 5, format: "Long", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Outline a project which aims to find the dominant coat colour in dogs.",
    answer: "Project: To determine which dog coat colour is dominant. (1) Select pairs of pure-bred dogs with two contrasting coat colours (e.g., pure black-coated and pure white-coated dogs); ensure each parent's lineage is homozygous by checking that their parents and grandparents all showed the same colour. (2) Cross each black dog with a white dog and record the coat colour of every puppy in the F1 generation. (3) If ALL F1 puppies show the SAME colour (say, black), then black is dominant over white. (4) To confirm, allow F1 dogs to interbreed (or back-cross) and record F2 ratios; a 3:1 ratio of the F1 colour to the other colour confirms dominance. (5) Repeat the cross with several independent pairs to rule out chance, and tabulate the data.",
    solutionSteps: ["Select pure-bred dogs with two contrasting coat colours (e.g., black vs white) — verify purity by checking ancestry.", "Cross black × white parents and record the coat colour of all F1 puppies.", "If ALL F1 puppies show one colour (say, black), tentatively conclude black is dominant.", "Confirm by interbreeding F1 dogs and recording F2 ratio; a 3:1 ratio (black : white) confirms black is dominant and white is recessive.", "Repeat with several independent parent pairs and tabulate results to ensure the finding isn't due to chance."],
    finalAnswer: "Cross pure-bred dogs of two coat colours, observe F1 (uniform colour = dominant) and F2 (3:1 confirms).",
    ncertRef: "Exercise Q3", isCompetencyBased: true,
    strategyHint: "Mimic Mendel's monohybrid design: pure parents → F1 → F2; the dominant trait appears in all F1 and 3/4 of F2." },

  { id: "HERED-NCERT-8-SA-008", subject: "Science", topicKey: "heredity", subtopic: "Genes and Chromosomes", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Understanding",
    questionText: "How is the equal genetic contribution of male and female parents ensured in the progeny?",
    answer: "Both male and female parents contribute equally because of the chromosomal mechanism of inheritance. Each somatic cell has chromosomes in pairs — one set from each parent. During gamete formation (meiosis), the homologous chromosomes separate so that each gamete (sperm or egg) gets only ONE chromosome from each pair — i.e., half the genetic material. When the male gamete (n chromosomes) fuses with the female gamete (n chromosomes) at fertilisation, the zygote receives the full set (2n) — half from the father and half from the mother. Thus the contribution of each parent is exactly equal at the chromosomal level.",
    solutionSteps: ["Somatic cells have chromosomes in pairs (2n) — one of each pair from father, one from mother.", "During gamete formation (meiosis), pairs separate so each gamete carries only ONE chromosome of each pair (n).", "Sperm: n chromosomes from father; Egg: n chromosomes from mother.", "Fertilisation: sperm (n) + egg (n) → zygote (2n) → half from each parent.", "Hence the genetic contribution of male and female parents to the progeny is exactly equal."],
    finalAnswer: "Each parent contributes one chromosome of each pair via gametes; sperm + egg → zygote with equal genetic material from both.",
    ncertRef: "Exercise Q4", isCompetencyBased: true,
    strategyHint: "Key idea: paired chromosomes split during gamete formation; fertilisation restores the pair." },
];
