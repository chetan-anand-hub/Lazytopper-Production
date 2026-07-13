import type { CanonicalQuestion } from "../../../predictionTypes";

// Section E (4-mark Case-Based) expansion pack — Heredity, MENDELIAN GENETICS
// sub-domain (crosses & laws in plants/animals). Each question demonstrates a
// DISTINCT genetic principle (not a trait-swapped twin). AUTHORED — no pyqYear.
export const HEREDITY_EXPAND_CASE_E1: CanonicalQuestion[] = [
  {
    id: "BX-HER-E1-001",
    subject: "Science",
    topicKey: "heredity",
    subtopic: "Test Cross and Genotype Determination",
    section: "E",
    marks: 4,
    format: "Case-Based",
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "A seed company has a tall pea plant that shows the dominant trait (tallness, allele T is dominant over dwarfness t). By looking at the plant, the breeder cannot tell whether it is homozygous TT or heterozygous Tt, because both look tall. To find out, the breeder performs a test cross. Based on this case, answer: (i) With which plant should the tall plant be crossed to perform a test cross? (ii) What offspring would appear if the tall parent were homozygous TT? (iii) What offspring ratio would appear if the tall parent were heterozygous Tt, and how does the result reveal the unknown genotype?",
    options: [],
    answer:
      "Cross the tall plant with a homozygous recessive dwarf (tt): all-tall offspring means it was TT, a 1 tall : 1 dwarf ratio means it was Tt.",
    solutionSteps: [
      "[1 mark] A test cross means crossing the individual of unknown genotype (dominant tall) with a homozygous recessive dwarf plant (tt), which forms only t gametes.",
      "[1 mark] If the tall parent is TT: TT x tt gives all Tt offspring — 100% tall, no dwarf appears.",
      "[1 mark] If the tall parent is Tt: Tt x tt gives 1 Tt : 1 tt = 1 tall : 1 dwarf (a 1:1 ratio).",
      "[1 mark] Interpretation: all tall offspring proves the parent is homozygous TT; appearance of dwarf offspring in a 1:1 ratio proves the parent is heterozygous Tt — so the test cross reveals the hidden genotype.",
    ],
    finalAnswer:
      "Test-cross with dwarf tt; all-tall offspring => TT (homozygous), 1 tall : 1 dwarf => Tt (heterozygous).",
    isCompetencyBased: true,
    requiresDiagram: false,
  },
  {
    id: "BX-HER-E1-002",
    subject: "Science",
    topicKey: "heredity",
    subtopic: "Dihybrid Cross and Independent Assortment",
    section: "E",
    marks: 4,
    format: "Case-Based",
    difficulty: "Hard",
    bloomSkill: "Analysing",
    questionText:
      "A student crosses a pure-breeding pea plant having round, yellow seeds (RRYY) with a pure-breeding plant having wrinkled, green seeds (rryy). Round (R) is dominant over wrinkled (r), and yellow (Y) is dominant over green (y). The F1 plants are grown and then self-pollinated to raise the F2 generation. Based on this case, answer: (i) What is the phenotype and genotype of the F1 seeds? (ii) List the four different seed phenotypes that appear in the F2 generation. (iii) State the F2 phenotypic ratio and explain why two new combinations (round-green and wrinkled-yellow) appear.",
    options: [],
    answer:
      "F1 = RrYy, all round-yellow; F2 shows round-yellow, round-green, wrinkled-yellow and wrinkled-green in a 9:3:3:1 ratio, arising because the two gene pairs assort independently.",
    solutionSteps: [
      "[1 mark] F1: RRYY x rryy gives RrYy — all seeds are round and yellow (both dominant traits expressed), genotype RrYy.",
      "[1 mark] Self-pollinating F1 (RrYy x RrYy) gives four F2 phenotypes: round-yellow, round-green, wrinkled-yellow and wrinkled-green.",
      "[1 mark] The F2 phenotypic ratio is 9 round-yellow : 3 round-green : 3 wrinkled-yellow : 1 wrinkled-green (9:3:3:1).",
      "[1 mark] The new parental-unlike combinations (round-green, wrinkled-yellow) appear because the seed-shape gene and seed-colour gene are inherited independently of each other — Mendel's law of independent assortment.",
    ],
    finalAnswer:
      "F1 RrYy (round-yellow); F2 = 9 round-yellow : 3 round-green : 3 wrinkled-yellow : 1 wrinkled-green (independent assortment).",
    isCompetencyBased: true,
    requiresDiagram: false,
  },
  {
    id: "BX-HER-E1-003",
    subject: "Science",
    topicKey: "heredity",
    subtopic: "Law of Segregation",
    section: "E",
    marks: 4,
    format: "Case-Based",
    difficulty: "Medium",
    bloomSkill: "Understanding",
    questionText:
      "In a monohybrid cross, a pure tall pea plant (TT) is crossed with a pure dwarf plant (tt). All F1 plants are tall, and the dwarf character seems to have disappeared. When the F1 tall plants are self-pollinated, the dwarf character reappears in the F2 generation. A student is puzzled about how a trait that vanished in F1 can come back in F2. Based on this case, answer: (i) Why did no dwarf plant appear in the F1 generation? (ii) Explain, in terms of gametes, how the dwarf trait reappears in F2. (iii) Name the law that this behaviour of alleles illustrates and give the F2 genotypic ratio.",
    options: [],
    answer:
      "The recessive t allele was present but masked in the tall F1 (Tt); F1 gametes carry either T or t separately, so t + t can combine to give dwarf (tt) in F2 — the law of segregation, F2 genotypes 1 TT : 2 Tt : 1 tt.",
    solutionSteps: [
      "[1 mark] The F1 plants are all Tt: the dwarf allele t is present but its effect is masked by the dominant tall allele T, so every F1 plant looks tall and no dwarf appears.",
      "[1 mark] During gamete formation in the F1 (Tt), the two alleles separate so that each gamete carries only one allele — half the gametes carry T and half carry t.",
      "[1 mark] On self-pollination, a t-bearing egg can fuse with a t-bearing pollen, producing a tt plant, so the dwarf trait reappears in the F2 generation.",
      "[1 mark] This separation of alleles into different gametes is Mendel's law of segregation; the resulting F2 genotypic ratio is 1 TT : 2 Tt : 1 tt (giving a 3 tall : 1 dwarf phenotypic ratio).",
    ],
    finalAnswer:
      "t masked in F1 (Tt); alleles segregate into gametes, tt reforms in F2 — law of segregation, F2 genotype 1 TT : 2 Tt : 1 tt.",
    isCompetencyBased: true,
    requiresDiagram: false,
  },
  {
    id: "BX-HER-E1-004",
    subject: "Science",
    topicKey: "heredity",
    subtopic: "Incomplete Dominance",
    section: "E",
    marks: 4,
    format: "Case-Based",
    difficulty: "Hard",
    bloomSkill: "Analysing",
    questionText:
      "In the four-o'clock plant (Mirabilis jalapa), a cross between a pure red-flowered plant (RR) and a pure white-flowered plant (rr) gives F1 plants that all bear pink flowers. When these pink F1 plants are self-pollinated, the F2 generation contains red, pink and white flowered plants. A student notices that the F2 phenotypic ratio here is NOT the usual 3:1 seen in pea plants. Based on this case, answer: (i) What is the phenotypic ratio of red : pink : white plants in the F2 generation? (ii) Explain why, in this cross, the phenotypic ratio is the same as the genotypic ratio, unlike an ordinary monohybrid cross. (iii) Does this result violate Mendel's law of segregation? Justify.",
    options: [],
    answer:
      "F2 is 1 red : 2 pink : 1 white; the phenotypic ratio equals the genotypic ratio because the heterozygote Rr has its own distinct pink phenotype (incomplete dominance); it does not violate segregation, as alleles still separate normally.",
    solutionSteps: [
      "[1 mark] Self-pollinating the pink F1 (Rr x Rr) gives F2 genotypes 1 RR : 2 Rr : 1 rr, which show as 1 red : 2 pink : 1 white — a 1:2:1 phenotypic ratio.",
      "[1 mark] This is incomplete dominance: neither allele is fully dominant, so the heterozygote Rr shows an intermediate pink colour instead of matching a parent.",
      "[1 mark] Because each genotype (RR, Rr, rr) produces a different, recognisable phenotype (red, pink, white), the phenotypic ratio is identical to the genotypic ratio 1:2:1 — unlike a 3:1 cross where RR and Rr look alike.",
      "[1 mark] It does NOT violate the law of segregation: the R and r alleles still separate cleanly into different gametes and recombine at random; only the dominance relationship differs, so both parental colours reappear in F2.",
    ],
    finalAnswer:
      "F2 = 1 red : 2 pink : 1 white (1:2:1); phenotype ratio equals genotype ratio because Rr is distinctly pink; segregation is not violated.",
    isCompetencyBased: true,
    requiresDiagram: false,
  },
  {
    id: "BX-HER-E1-005",
    subject: "Science",
    topicKey: "heredity",
    subtopic: "Mendel's Experiments and Laws of Inheritance",
    section: "E",
    marks: 4,
    format: "Case-Based",
    difficulty: "Medium",
    bloomSkill: "Understanding",
    questionText:
      "Gregor Mendel carried out his famous inheritance experiments using the garden pea plant (Pisum sativum). Before starting his crosses, he first grew pure-breeding (true-breeding) lines for each trait for several generations, and he studied clear contrasting characters such as tall/dwarf and round/wrinkled seeds. He also raised and counted large numbers of F1 and F2 plants. Based on this case, answer: (i) Give two features of the pea plant that made it suitable for such breeding experiments. (ii) Why was it important for Mendel to start with pure-breeding (true-breeding) lines? (iii) Why did Mendel need to raise and study plants over successive generations (F1 and F2) rather than stopping at the first cross?",
    options: [],
    answer:
      "Pea plants have easily seen contrasting traits, a short life cycle and can be self- or cross-pollinated; true-breeding lines gave a known, constant (homozygous) starting genotype; several generations were needed because recessive traits stay hidden in F1 and reappear only in F2, revealing the inheritance pattern.",
    solutionSteps: [
      "[1 mark] Suitable features of the pea plant: it shows several pairs of clearly contrasting, easily observed characters (e.g. tall/dwarf, round/wrinkled) and has a short life cycle producing many offspring, and it can be both self-pollinated and cross-pollinated by the experimenter.",
      "[1 mark] Pure-breeding (true-breeding) lines are homozygous and give the same trait generation after generation, so Mendel began each cross with a known, constant parental genotype and reliable, repeatable results.",
      "[1 mark] Studying the F1 generation alone was not enough because a recessive trait is completely masked in F1 (all F1 look alike); the hidden trait shows itself only when F1 are self-pollinated.",
      "[1 mark] By raising the F2 generation and counting the large numbers of plants, Mendel could see the recessive trait reappear in fixed ratios (such as 3:1), which let him deduce the rules of inheritance.",
    ],
    finalAnswer:
      "Contrasting traits + short cycle + controllable pollination; true-breeding = known homozygous start; F1/F2 needed because recessives hide in F1 and reappear in ratio in F2.",
    isCompetencyBased: true,
    requiresDiagram: false,
  },
  {
    id: "BX-HER-E1-006",
    subject: "Science",
    topicKey: "heredity",
    subtopic: "Monohybrid Cross and F2 Ratio",
    section: "E",
    marks: 4,
    format: "Case-Based",
    difficulty: "Hard",
    bloomSkill: "Evaluating",
    questionText:
      "A researcher studies flower colour in pea plants, where violet (V) is dominant over white (v). She records the F2 generation of one experiment and counts 315 violet-flowered plants and 108 white-flowered plants. All the F1 plants in this experiment had been violet-flowered. She wants to work backwards from this data to identify the type of cross involved. Based on this case, answer: (i) Reduce the F2 count 315 : 108 to a simple whole-number ratio. (ii) What does this ratio tell you about the number of genes and the dominance relationship controlling flower colour? (iii) Deduce the genotypes of the two F1 plants that were crossed to give this F2, and of the original pure parents.",
    options: [],
    answer:
      "315 : 108 is about 3 : 1, a monohybrid ratio showing one gene with complete dominance; the F1 cross was Vv x Vv, and the original pure parents were VV (violet) x vv (white).",
    solutionSteps: [
      "[1 mark] Divide both counts by the smaller: 315/108 is approximately 2.9, so the ratio 315 : 108 reduces to about 3 : 1.",
      "[1 mark] A 3 : 1 F2 ratio is the signature of a monohybrid cross — a single gene with two alleles and complete dominance (violet fully dominant over white).",
      "[1 mark] Since all F1 were violet and the F2 splits 3 : 1, the F1 plants crossed must both be heterozygous: Vv x Vv (self-pollination of the violet F1).",
      "[1 mark] Working further back, the two pure parents that produced the uniform violet F1 were homozygous VV (violet) x vv (white).",
    ],
    finalAnswer:
      "315 : 108 = 3 : 1 (monohybrid, complete dominance); F1 cross Vv x Vv; pure parents VV (violet) x vv (white).",
    isCompetencyBased: true,
    requiresDiagram: false,
  },
  {
    id: "BX-HER-E1-007",
    subject: "Science",
    topicKey: "heredity",
    subtopic: "Independent Assortment (Dihybrid Test Cross)",
    section: "E",
    marks: 4,
    format: "Case-Based",
    difficulty: "Hard",
    bloomSkill: "Analysing",
    questionText:
      "To confirm that two genes are inherited independently, a scientist takes an F1 pea plant that is heterozygous for both seed shape and seed colour (RrYy, round and yellow) and crosses it with a plant that is wrinkled and green (rryy). Round (R) is dominant over wrinkled (r), and yellow (Y) is dominant over green (y). She then classifies all the offspring by phenotype. Based on this case, answer: (i) What kinds of gametes can the RrYy plant produce? (ii) List the phenotypes of the offspring from this cross. (iii) State the expected offspring ratio and explain how it supports the law of independent assortment.",
    options: [],
    answer:
      "RrYy makes four gamete types (RY, Ry, rY, ry); crossed with rryy it gives round-yellow, round-green, wrinkled-yellow and wrinkled-green offspring in a 1:1:1:1 ratio, showing the two genes assort independently.",
    solutionSteps: [
      "[1 mark] The doubly heterozygous RrYy plant produces four kinds of gametes in equal numbers: RY, Ry, rY and ry.",
      "[1 mark] The wrinkled-green parent rryy is homozygous recessive and produces only ry gametes; combining each RrYy gamete with ry gives offspring RrYy, Rryy, rrYy and rryy.",
      "[1 mark] These offspring show four phenotypes — round-yellow, round-green, wrinkled-yellow and wrinkled-green — in an equal 1 : 1 : 1 : 1 ratio.",
      "[1 mark] Equal numbers of all four combinations (including the non-parental round-green and wrinkled-yellow) show that the seed-shape alleles segregate independently of the seed-colour alleles — this supports Mendel's law of independent assortment.",
    ],
    finalAnswer:
      "RrYy gives RY, Ry, rY, ry gametes; test cross with rryy => round-yellow : round-green : wrinkled-yellow : wrinkled-green = 1:1:1:1 (independent assortment).",
    isCompetencyBased: true,
    requiresDiagram: false,
  },
];
