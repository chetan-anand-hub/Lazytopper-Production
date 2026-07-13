import type { CanonicalQuestion } from "../../../predictionTypes";

// Bank-expansion — Heredity, Section E (4-mark Case-Based).
// Sub-domain: HUMAN GENETICS & SOCIETY (sex determination, pedigree analysis,
// X-linked inheritance, single-gene recessive disorders as inheritance examples,
// DNA/genes as hereditary material, heritable vs non-heritable variation, and the
// scientific message against blaming women). Each question is a DISTINCT inheritance
// PATTERN — not a trait-renamed twin of an already-banked case. In-syllabus for CBSE
// Class 10 (2026-27); NO evolution / NO Class-12 molecular or clinical depth.
export const HEREDITY_EXPAND_CASE_E2: CanonicalQuestion[] = [
  {
    "id": "BX-HER-E2-001",
    "subject": "Science",
    "topicKey": "heredity",
    "subtopic": "Pedigree Analysis — Autosomal Dominant Trait",
    "section": "E",
    "marks": 4,
    "format": "Case-Based",
    "difficulty": "Hard",
    "bloomSkill": "Analysing",
    "questionText": "Polydactyly is a condition in which a person is born with an extra finger or toe. It is controlled by an autosomal gene (not on a sex chromosome). A student traces it through three generations of a family and records the following:\n• Generation I: The grandmother has polydactyly; the grandfather does not.\n• Generation II: One of their sons (Ravi's father) has polydactyly, but their daughter (Ravi's aunt) does not.\n• Generation III: Ravi has polydactyly; his sister does not. The aunt's two children do not have polydactyly.\n\nThe allele for polydactyly is written D and the normal allele is written d.\n(i) Is polydactyly a dominant or a recessive trait? Give one reason based on the pedigree.\n(ii) Ravi's father has polydactyly but Ravi's sister does not. What must Ravi's father's genotype be, and why?\n(iii) Ravi's aunt does not have polydactyly. Write her genotype and explain why none of her children show the trait.\n(iv) Why does polydactyly keep appearing in every generation of Ravi's branch but disappears completely from the aunt's branch?",
    "options": [],
    "answer": "(i) Dominant — it appears in every generation and every affected person has an affected parent. (ii) Dd — an unaffected child (dd) must have received a d from him. (iii) dd — she carries no D allele, so she cannot pass the trait on. (iv) The dominant allele D is expressed whenever present and is passed to about half of an affected parent's children, while the aunt (dd) has no D allele to transmit.",
    "solutionSteps": [
      "[1 mark] (i) Polydactyly is DOMINANT. In the pedigree the trait appears in every generation and every affected individual (grandmother, father, Ravi) has an affected parent — it never skips a generation. A recessive trait can hide in unaffected carriers and skip generations; a dominant trait cannot, so the pattern shows dominance.",
      "[1 mark] (ii) Ravi's father must be heterozygous, Dd. He shows the trait (so he carries at least one D), but his unaffected daughter is dd and must have received one d allele from each parent — so the father must carry a d allele as well. Genotype = Dd.",
      "[1 mark] (iii) Ravi's aunt is unaffected, so her genotype is dd (homozygous recessive normal). She carries no dominant D allele; therefore she can pass only d to her children. With an unaffected (dd) partner every child is dd and unaffected — the trait cannot appear in her branch.",
      "[1 mark] (iv) A single dominant allele D always shows in the phenotype, and each affected parent (Dd) passes D to about 50% of the children, so the trait reappears generation after generation in Ravi's branch. The aunt's branch is entirely dd, with no D allele to transmit, so the trait vanishes permanently unless a D allele is reintroduced by marriage."
    ],
    "finalAnswer": "(i) Dominant — appears every generation, never skips. (ii) Dd (unaffected dd child means he carries d). (iii) dd — no D allele to pass on. (iv) D expresses whenever present and is passed to ~50% of an affected parent's children; the aunt's dd branch has no D to transmit.",
    "isCompetencyBased": true,
    "ncertRef": "NCERT Class 10 Science, Ch. Heredity"
  },
  {
    "id": "BX-HER-E2-002",
    "subject": "Science",
    "topicKey": "heredity",
    "subtopic": "Pedigree Analysis — Recessive Trait Across Generations",
    "section": "E",
    "marks": 4,
    "format": "Case-Based",
    "difficulty": "Hard",
    "bloomSkill": "Analysing",
    "questionText": "Albinism (very little or no skin/hair pigment) is inherited as a single-gene recessive trait. A family is studied across three generations:\n• Generation I: The grandmother is an albino; the grandfather is not.\n• Generation II: Their son Arjun is NOT an albino. He marries Meena, who is also NOT an albino.\n• Generation III: Arjun and Meena's daughter Priya IS an albino.\n\nThe normal allele is written A and the albino allele is written a.\n(i) Is albinism dominant or recessive? Justify using the fact that it disappears in Generation II but reappears in Generation III.\n(ii) Arjun is not an albino, yet his mother was. Write Arjun's genotype and explain why he must be a carrier.\n(iii) Both Arjun and Meena look normal, yet Priya is an albino. Draw the cross and state the probability that their NEXT child will be an albino.\n(iv) What single word describes an unaffected person like Arjun and Meena who still carries the albino allele?",
    "options": [],
    "answer": "(i) Recessive — it can be carried unexpressed and so skips Generation II and reappears in III. (ii) Aa — he received 'a' from his albino mother and 'A' from his father. (iii) Aa × Aa → 1 AA : 2 Aa : 1 aa; probability of an albino child = 1/4 (25%). (iv) Carrier.",
    "solutionSteps": [
      "[1 mark] (i) Albinism is RECESSIVE. A recessive allele can be carried in a heterozygote without showing, so the trait can be hidden in Generation II (Arjun and Meena look normal) and then reappear in Generation III (Priya) when both parents pass on the recessive allele. A dominant trait cannot skip a generation like this.",
      "[1 mark] (ii) Arjun's genotype is Aa (a carrier). His mother was an albino (aa), so she could give him only an 'a' allele. Since Arjun is not an albino he must also have a normal 'A' allele from his father. Therefore he is Aa — normal in appearance but carrying the albino allele.",
      "[1 mark] (iii) Meena is also a carrier (Aa), otherwise Priya could not be an albino. Cross Aa × Aa: gametes A, a from each. Punnett square gives AA : Aa : Aa : aa = 1 AA : 2 Aa : 1 aa. Only aa is an albino, so the probability that the next child is an albino = 1/4 = 25%.",
      "[1 mark] (iv) Such an unaffected individual who carries one copy of the recessive allele (Aa) is called a CARRIER (heterozygous carrier)."
    ],
    "finalAnswer": "(i) Recessive — carried unexpressed, so it skips Gen II and reappears in Gen III. (ii) Aa — 'a' from albino mother, 'A' from father. (iii) Aa × Aa → 1 : 2 : 1; albino child probability = 1/4 (25%). (iv) Carrier.",
    "isCompetencyBased": true,
    "ncertRef": "NCERT Class 10 Science, Ch. Heredity"
  },
  {
    "id": "BX-HER-E2-003",
    "subject": "Science",
    "topicKey": "heredity",
    "subtopic": "X-Linked Recessive Inheritance",
    "section": "E",
    "marks": 4,
    "format": "Case-Based",
    "difficulty": "Hard",
    "bloomSkill": "Analysing",
    "questionText": "Haemophilia is an X-linked recessive condition in which blood clots very slowly. A woman whose father had haemophilia does NOT have haemophilia herself. She marries a man who does not have haemophilia. The normal allele is written Xᴴ and the haemophilia allele is written Xʰ; the Y chromosome carries no copy of this gene.\n(i) The woman does not have haemophilia even though her father did. Write her genotype and explain why she is unaffected.\n(ii) Show the cross between this woman and her unaffected husband and list the genotypes of the children that can result.\n(iii) What is the probability that a SON of this couple will have haemophilia? What is the probability that a DAUGHTER will have it?\n(iv) Explain why haemophilia and other X-linked recessive conditions are far more common in males than in females.",
    "options": [],
    "answer": "(i) XᴴXʰ (carrier) — the normal dominant allele on her other X masks the recessive one. (ii) XᴴXʰ × XᴴY → XᴴXᴴ, XᴴXʰ, XᴴY, XʰY. (iii) Sons: 50% affected; daughters: 0% affected (50% carriers). (iv) Males have only one X, so a single recessive allele (XʰY) is enough; females need both X chromosomes to carry it.",
    "solutionSteps": [
      "[1 mark] (i) Her genotype is XᴴXʰ — a carrier. Her affected father (XʰY) passed his only X (Xʰ) to her, and her mother gave her a normal Xᴴ. Because the normal dominant allele Xᴴ on her second X chromosome masks the recessive Xʰ, she is unaffected. A female must have BOTH X chromosomes carrying the recessive allele (XʰXʰ) to actually have haemophilia.",
      "[1 mark] (ii) Cross XᴴXʰ (mother) × XᴴY (father). Mother's eggs: Xᴴ or Xʰ; father's sperm: Xᴴ or Y. Punnett square gives four children: XᴴXᴴ (normal daughter), XᴴXʰ (carrier daughter), XᴴY (normal son) and XʰY (haemophilic son).",
      "[1 mark] (iii) Sons receive their single X from the mother: half get Xᴴ (normal) and half get Xʰ (XʰY → affected), so the probability a son has haemophilia = 50%. Daughters always receive a normal Xᴴ from the father, so none of the daughters can be affected — probability = 0% (though 50% of daughters are carriers).",
      "[1 mark] (iv) Males have only one X chromosome, so a single recessive allele on it (XʰY) is enough to cause the condition — there is no second X to mask it. Females have two X chromosomes, so the recessive allele on one X is usually masked by a normal allele on the other; both X chromosomes must carry it (XʰXʰ), which is far rarer. Hence the condition is much more common in males."
    ],
    "finalAnswer": "(i) XᴴXʰ carrier — normal allele masks the recessive one. (ii) XᴴXʰ × XᴴY → XᴴXᴴ, XᴴXʰ, XᴴY, XʰY. (iii) Sons 50% affected; daughters 0% affected. (iv) Males have a single X, so one recessive allele suffices; females need both X chromosomes to carry it.",
    "isCompetencyBased": true,
    "ncertRef": "NCERT Class 10 Science, Ch. Heredity"
  },
  {
    "id": "BX-HER-E2-004",
    "subject": "Science",
    "topicKey": "heredity",
    "subtopic": "Genes and Chromosomes as Hereditary Material",
    "section": "E",
    "marks": 4,
    "format": "Case-Based",
    "difficulty": "Medium",
    "bloomSkill": "Understanding",
    "questionText": "Sara notices that she has her mother's eye colour and her father's type of hair. She asks her teacher how such features are passed from parents to children. The teacher explains that characteristics are controlled by genes, that genes are located on chromosomes inside the nucleus, and that the egg and the sperm carry these genes from the parents to the child.\n(i) Name the chemical substance that genes are made of and that acts as the hereditary material.\n(ii) Where inside the cell are genes located, and in which structures are they carried?\n(iii) A human body cell contains 23 pairs (46) of chromosomes. How many chromosomes does each gamete (egg or sperm) carry, and why is this halving necessary?\n(iv) Explain why Sara shows a mixture of features inherited from BOTH her parents.",
    "options": [],
    "answer": "(i) DNA. (ii) On chromosomes, inside the nucleus of the cell. (iii) 23 chromosomes; halving keeps the chromosome number constant — fertilisation restores 46. (iv) She receives one chromosome (one set of genes) of each pair from her mother's egg and one from her father's sperm.",
    "solutionSteps": [
      "[1 mark] (i) Genes are made of DNA (deoxyribonucleic acid). DNA is the hereditary material that carries the information for a trait from parents to offspring.",
      "[1 mark] (ii) Genes are located on the chromosomes, which are present in the nucleus of the cell. Each chromosome carries many genes arranged along its length.",
      "[1 mark] (iii) Each gamete (egg or sperm) carries 23 chromosomes — half the number in a body cell. This halving is necessary so that when the egg and sperm fuse at fertilisation the offspring again has 46 chromosomes (23 pairs), keeping the chromosome number of the species constant from one generation to the next.",
      "[1 mark] (iv) At fertilisation Sara receives one chromosome of each pair — and therefore one set of genes — from her mother's egg and the other from her father's sperm. Because her genes come from both parents, she shows a mixture of features inherited from each of them."
    ],
    "finalAnswer": "(i) DNA. (ii) On chromosomes in the nucleus. (iii) 23 chromosomes; halving keeps the number constant so fertilisation restores 46. (iv) She gets one chromosome (one gene set) of each pair from each parent, so traits come from both.",
    "isCompetencyBased": true,
    "ncertRef": "NCERT Class 10 Science, Ch. Heredity"
  },
  {
    "id": "BX-HER-E2-005",
    "subject": "Science",
    "topicKey": "heredity",
    "subtopic": "Variation and Inheritance",
    "section": "E",
    "marks": 4,
    "format": "Case-Based",
    "difficulty": "Medium",
    "bloomSkill": "Analysing",
    "questionText": "Ramesh is discussing which of his features his future children might inherit. He has naturally curly hair and blood group B. He also has a scar on his arm from a childhood accident and large arm muscles that he built up through years of gym exercise.\n(i) Classify Ramesh's four features into those that are inherited (genetically controlled) and those that are not.\n(ii) Why can curly hair and blood group be passed to his children, while the scar and the gym-built muscles cannot?\n(iii) For a variation to be passed to the next generation, in which cells must the change occur — body (somatic) cells or germ cells (gametes)? Explain.\n(iv) Ramesh claims that if he keeps exercising, his children will be born already muscular. Is he scientifically correct? Give a reason.",
    "options": [],
    "answer": "(i) Inherited: curly hair, blood group B. Not inherited: the scar, the gym-built muscles. (ii) Curly hair and blood group are controlled by genes carried in his gametes; the scar and muscles are changes in body cells that do not change the genes in his gametes. (iii) In the germ cells (gametes), because only the DNA passed through gametes reaches the offspring. (iv) No — exercise changes only his body cells, not the DNA of his gametes, so muscularity from exercise is not inherited.",
    "solutionSteps": [
      "[1 mark] (i) Inherited (genetically controlled): curly hair and blood group B. Not inherited: the scar (caused by an injury) and the large muscles (built by gym exercise). The first two are decided by his genes; the last two are caused by the environment or his activity.",
      "[1 mark] (ii) Curly hair and blood group B are determined by genes present in Ramesh's DNA, and these genes are passed on through his gametes (sperm). The scar and the gym-built muscles are changes that occurred only in his body cells; they do not alter the genes in his gametes, so they cannot be transmitted to his children.",
      "[1 mark] (iii) The change must occur in the germ cells (gametes — the sperm or egg). Only the DNA carried in the gametes is passed to the offspring, so only a variation present in the germ-cell DNA can be inherited. A change limited to body (somatic) cells affects only that individual and dies with them.",
      "[1 mark] (iv) No, he is not correct. The muscles he built through exercise are a change only in his body cells; the DNA in his gametes is unchanged, so this feature is not passed on. Whether his children are muscular depends on the genes they inherit, not on how much Ramesh exercises."
    ],
    "finalAnswer": "(i) Inherited: curly hair, blood group B; not inherited: scar, gym-built muscles. (ii) The first two are gene-controlled and passed through gametes; the other two are body-cell changes that never reach the gametes. (iii) In the germ cells (gametes), since only their DNA reaches offspring. (iv) No — exercise changes body cells only, not gamete DNA, so it is not inherited.",
    "isCompetencyBased": true,
    "ncertRef": "NCERT Class 10 Science, Ch. Heredity"
  }
];
