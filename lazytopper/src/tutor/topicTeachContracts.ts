import { canonicalChapters, getCanonicalChapterBySlug } from "../data/syllabus/cbse10Canonical";
import {
  getChapterScopePolicy,
  getScopeBullets,
  getScopeGuardLine,
  violatesAssessedScope,
} from "../data/syllabus/scopePolicy";
import { resolveCanonicalTopicKey } from "../data/syllabus/topicAliasMap";
import { resolveTopicDisplayName } from "../utils/topicResolver";

export interface TopicTeachContract {
  canonicalTopicKey: string;
  subject: "Maths" | "Science";
  contractSource: "topic" | "generic";
  goalLine: string;
  keyIdeas: [string, string, string, string];
  checkpointQuestion: string;
  checkpointAnswer: string;
  commonMistake: string;
  scopeGuardLine?: string;
  assessedScopeBullets?: string[];
  enrichmentScopeBullets?: string[];
}

type TeachContractSeed = {
  subject: "Maths" | "Science";
  goalLine: string;
  keyIdeas: [string, string, string, string];
  checkpointQuestion: string;
  checkpointAnswer: string;
  commonMistake: string;
};

const mathsGeneric: TeachContractSeed = {
  subject: "Maths",
  goalLine: "Learn {topic} in CBSE board-writing format.",
  keyIdeas: [
    "state the core definition used in this question.",
    "name the exact theorem/criterion/formula before applying it.",
    "maintain correspondence and write each logical step with reason.",
    "end with Therefore/Hence and the asked result.",
  ],
  checkpointQuestion:
    "Board checkpoint: For {topic}, write Given, To Prove/Find, theorem/formula used, and final Therefore/Hence line.",
  checkpointAnswer:
    "Expected answer: Given: [state data for {topic}]. To Prove/Find: [required result]. Criterion/Theorem/Formula: [exact name]. Therefore/Hence: [final result line].",
  commonMistake:
    "Common mistake: applying a theorem/formula without conditions or correspondence. This can lose marks in CBSE board checking.",
};

const scienceGeneric: TeachContractSeed = {
  subject: "Science",
  goalLine: "Learn {topic} in CBSE board-writing format with concept clarity and application.",
  keyIdeas: [
    "state the concept/definition in one precise line.",
    "name the governing law/principle/process before using it.",
    "link cause and effect with one evidence-based explanation.",
    "conclude with exam-safe wording and units/labels where required.",
  ],
  checkpointQuestion:
    "Board checkpoint: For {topic}, write Given context, concept/law used, one reasoning step, and a final Therefore/Hence conclusion.",
  checkpointAnswer:
    "Expected answer: Given: [context for {topic}]. To Prove/Find: [required explanation/result]. Principle/Law: [exact name]. Therefore/Hence: [final conclusion line].",
  commonMistake:
    "Common mistake: writing statements without naming the correct principle/law or missing labels/units. This can lose marks in CBSE board checking.",
};

const topicSpecificSeeds: Record<string, TeachContractSeed> = {
  "real-numbers": {
    ...mathsGeneric,
    goalLine: "Learn {topic} with Euclid's division and Fundamental Theorem of Arithmetic in CBSE board-writing format.",
    keyIdeas: [
      "state Euclid's division lemma: a = bq + r, 0 ≤ r < b.",
      "apply the Fundamental Theorem of Arithmetic (unique prime factorisation) before finding HCF/LCM.",
      "use HCF × LCM = product of two numbers and verify the result.",
      "prove irrationality by contradiction: assume √p is rational, derive that p divides both a and b, contradicting co-primality.",
    ],
    checkpointQuestion:
      "Board checkpoint: Find HCF of 420 and 130 using Euclid's division algorithm. Write each step with Given, algorithm application, and Therefore/Hence.",
    checkpointAnswer:
      "Expected answer: Given: 420, 130. Step 1: 420 = 130 × 3 + 30. Step 2: 130 = 30 × 4 + 10. Step 3: 30 = 10 × 3 + 0. Therefore HCF(420, 130) = 10.",
    commonMistake:
      "Common mistake: stopping Euclid's algorithm before the remainder reaches zero, or confusing HCF and LCM formulas. This can lose marks in CBSE board checking.",
  },
  polynomials: {
    ...mathsGeneric,
    goalLine: "Learn {topic} with zeroes-coefficient relationships and division algorithm in CBSE board-writing format.",
    keyIdeas: [
      "state the relationship between zeroes and coefficients: sum = −b/a, product = c/a for quadratic.",
      "verify zeroes by substituting back into the polynomial.",
      "use the division algorithm: p(x) = g(x)·q(x) + r(x) to find unknown coefficients.",
      "form a quadratic polynomial from given zeroes using x² − (sum)x + (product).",
    ],
    checkpointQuestion:
      "Board checkpoint: If α and β are zeroes of 2x² − 5x + 3, find α + β and αβ. Verify by finding actual zeroes.",
    checkpointAnswer:
      "Expected answer: Given: p(x) = 2x² − 5x + 3, a=2, b=−5, c=3. Sum α + β = −b/a = 5/2. Product αβ = c/a = 3/2. Zeroes: x = 1 and x = 3/2. Verification: 1 + 3/2 = 5/2 ✓, 1 × 3/2 = 3/2 ✓.",
    commonMistake:
      "Common mistake: forgetting the negative sign in sum = −b/a, or dividing by the wrong coefficient. This can lose marks in CBSE board checking.",
  },
  "pair-of-linear-equations-in-two-variables": {
    ...mathsGeneric,
    goalLine: "Learn {topic} with substitution/elimination methods and graphical consistency checks in CBSE board-writing format.",
    keyIdeas: [
      "classify the pair using a₁/a₂, b₁/b₂, c₁/c₂ ratios (consistent/inconsistent/dependent).",
      "solve by substitution: express one variable, substitute into the other equation.",
      "solve by elimination: multiply to equalise coefficients, subtract to eliminate one variable.",
      "verify the solution by substituting back into both original equations.",
    ],
    checkpointQuestion:
      "Board checkpoint: Solve 2x + 3y = 7 and 3x − y = 5 by elimination. Show Given, method, and Therefore/Hence.",
    checkpointAnswer:
      "Expected answer: Given: 2x + 3y = 7 …(i), 3x − y = 5 …(ii). Multiply (ii) by 3: 9x − 3y = 15 …(iii). Add (i) + (iii): 11x = 22, x = 2. Substitute in (ii): y = 1. Therefore x = 2, y = 1.",
    commonMistake:
      "Common mistake: sign errors while eliminating a variable, or not verifying the solution in both equations. This can lose marks in CBSE board checking.",
  },
  "quadratic-equations": {
    ...mathsGeneric,
    goalLine: "Learn {topic} with factorisation, formula method, and discriminant analysis in CBSE board-writing format.",
    keyIdeas: [
      "write the equation in standard form ax² + bx + c = 0 before solving.",
      "solve by factorisation (splitting the middle term) or quadratic formula x = (−b ± √D) / 2a.",
      "compute discriminant D = b² − 4ac to determine nature of roots (D > 0: distinct real, D = 0: equal, D < 0: no real roots).",
      "frame quadratic equations from word problems by defining the variable clearly.",
    ],
    checkpointQuestion:
      "Board checkpoint: Solve 2x² − 7x + 3 = 0 by factorisation. Write Given, factorisation steps, and Therefore/Hence.",
    checkpointAnswer:
      "Expected answer: Given: 2x² − 7x + 3 = 0. Split middle term: 2x² − 6x − x + 3 = 0. Factor: 2x(x − 3) − 1(x − 3) = 0. (2x − 1)(x − 3) = 0. Therefore x = 1/2 or x = 3.",
    commonMistake:
      "Common mistake: incorrect middle-term splitting (product must equal a × c) or sign errors in factorisation. This can lose marks in CBSE board checking.",
  },
  "arithmetic-progressions": {
    ...mathsGeneric,
    goalLine: "Learn {topic} with nth term and sum formulas in CBSE board-writing format.",
    keyIdeas: [
      "identify first term (a) and common difference (d) from the given sequence.",
      "use nth term formula: aₙ = a + (n − 1)d to find any specific term.",
      "use sum formula: Sₙ = n/2 [2a + (n − 1)d] or Sₙ = n/2 (a + l) when last term is known.",
      "apply AP properties in word problems: frame a, d, n from the context before substitution.",
    ],
    checkpointQuestion:
      "Board checkpoint: Find the sum of first 20 terms of the AP: 3, 7, 11, 15, … Write Given, formula, and Therefore/Hence.",
    checkpointAnswer:
      "Expected answer: Given: a = 3, d = 4, n = 20. Sₙ = n/2 [2a + (n − 1)d] = 20/2 [2(3) + 19(4)] = 10 [6 + 76] = 10 × 82 = 820. Therefore S₂₀ = 820.",
    commonMistake:
      "Common mistake: using n instead of (n − 1) in the nth term formula, or confusing Sₙ with aₙ. This can lose marks in CBSE board checking.",
  },
  triangles: {
    ...mathsGeneric,
    goalLine: "Learn {topic} with similarity logic in CBSE board-writing format.",
    keyIdeas: [
      "define similarity in terms of corresponding angles/sides.",
      "state AA/SAS/SSS or BPT criterion exactly before proof.",
      "maintain vertex correspondence order through all ratios.",
      "close with Therefore/Hence and required proportionality/result.",
    ],
    checkpointQuestion:
      "Board checkpoint: Which similarity criterion is valid in this {topic} question? Use Given, To Prove, criterion, and Therefore/Hence format.",
    checkpointAnswer:
      "Expected answer: Given: [matching angle/side data]. To Prove: [triangles are similar or required relation]. Criterion/Theorem: [AA/SAS/SSS/BPT exact name]. Therefore/Hence: [final similarity/proportionality line].",
    commonMistake:
      "Common mistake: skipping correspondence order or criterion name in similarity proofs. This can lose marks in CBSE board checking.",
  },
  "coordinate-geometry": {
    ...mathsGeneric,
    goalLine: "Learn {topic} with formula setup and coordinate substitution in CBSE board-writing format.",
    keyIdeas: [
      "state coordinate points and required relation clearly.",
      "name the distance/section formula before substitution.",
      "substitute coordinates carefully with sign discipline.",
      "conclude with final coordinate/distance statement.",
    ],
    checkpointQuestion:
      "Board checkpoint: In this {topic} question, write Given points, To Find, formula used, and Therefore/Hence final value.",
    checkpointAnswer:
      "Expected answer: Given: [coordinates]. To Find: [distance/section]. Criterion/Theorem/Formula: [distance/section formula]. Therefore/Hence: [final computed result].",
    commonMistake:
      "Common mistake: sign errors during coordinate substitution. This can lose marks in CBSE board checking.",
  },
  trigonometry: {
    ...mathsGeneric,
    goalLine: "Learn {topic} with ratio selection and identity discipline in CBSE board-writing format.",
    keyIdeas: [
      "define ratio/identity with respect to the chosen angle.",
      "state the exact identity/formula before substitution.",
      "track opposite-adjacent-hypotenuse and sign carefully.",
      "conclude with simplified final value/result and units if needed.",
    ],
    checkpointQuestion:
      "Board checkpoint: For this {topic} item, write Given, To Find, formula used, and Therefore/Hence conclusion.",
    checkpointAnswer:
      "Expected answer: Given: [angle/side data]. To Find: [ratio/value]. Criterion/Theorem/Formula: [trigonometric identity or ratio]. Therefore/Hence: [final simplified value].",
    commonMistake:
      "Common mistake: selecting the wrong ratio or identity for the given angle setup. This can lose marks in CBSE board checking.",
  },
  "maths-applications-trigonometry": {
    ...mathsGeneric,
    goalLine: "Learn {topic} with angle-based application setup in CBSE board-writing format.",
    keyIdeas: [
      "identify the angle of elevation/depression and sketch the relation.",
      "state the exact formula or trigonometric relation before substitution.",
      "map distances/heights to the selected ratio with clear correspondence.",
      "end with the final numerical result and therefore/hence line.",
    ],
    checkpointQuestion:
      "Board checkpoint: For this {topic} item, write Given data, To Find, formula used, and final Therefore/Hence result.",
    checkpointAnswer:
      "Expected answer: Given: [angle and distance data]. To Find: [height/distance result]. Criterion/Theorem/Formula: [chosen trigonometric formula]. Therefore/Hence: [final computed result].",
    commonMistake:
      "Common mistake: choosing the wrong angle or formula in height-distance applications. This can lose marks in CBSE board checking.",
  },
  circles: {
    ...mathsGeneric,
    goalLine: "Learn {topic} with tangent properties and theorem-based proofs in CBSE board-writing format.",
    keyIdeas: [
      "state that a tangent to a circle is perpendicular to the radius at the point of contact.",
      "use the theorem: tangent lengths from an external point are equal.",
      "construct the proof with Given, To Prove, Construction, and Proof steps.",
      "conclude with Therefore/Hence and the required geometric result.",
    ],
    checkpointQuestion:
      "Board checkpoint: Prove that the tangent at any point of a circle is perpendicular to the radius through the point of contact. Use Given, To Prove, Construction, Proof format.",
    checkpointAnswer:
      "Expected answer: Given: Circle with centre O, tangent XY at point P. To Prove: OP ⊥ XY. Construction: Take any point Q on XY other than P. Proof: OQ > OP (Q is outside the circle). OP is the shortest distance from O to XY. Therefore OP ⊥ XY.",
    commonMistake:
      "Common mistake: assuming tangent properties without stating the theorem, or not drawing the construction clearly. This can lose marks in CBSE board checking.",
  },
  constructions: {
    ...mathsGeneric,
    goalLine: "Learn {topic} with step-by-step geometric construction and justification in CBSE board-writing format.",
    keyIdeas: [
      "list the steps of construction in numbered order with compass/ruler actions.",
      "state the geometric principle behind each construction step.",
      "draw the figure with all arcs, labels, and measurements clearly marked.",
      "write the justification: why the construction gives the required result.",
    ],
    checkpointQuestion:
      "Board checkpoint: Construct a triangle similar to a given triangle with sides 3/5 of the corresponding sides. Write steps of construction.",
    checkpointAnswer:
      "Expected answer: Steps: 1. Draw the given triangle ABC. 2. Draw ray BX making acute angle with BC. 3. Mark 5 points B₁ to B₅ on BX at equal intervals. 4. Join B₅ to C. 5. Through B₃, draw line parallel to B₅C meeting BC at C'. 6. Through C', draw line parallel to CA meeting BA at A'. Therefore △A'BC' ~ △ABC with ratio 3/5.",
    commonMistake:
      "Common mistake: marking unequal arcs on the ray or drawing parallel lines without proper construction. This can lose marks in CBSE board checking.",
  },
  "areas-related-to-circles": {
    ...mathsGeneric,
    goalLine: "Learn {topic} with sector/segment area formulas in CBSE board-writing format.",
    keyIdeas: [
      "state the formula for area of sector: (θ/360) × πr² and length of arc: (θ/360) × 2πr.",
      "compute area of segment = area of sector − area of triangle.",
      "identify the angle and radius from the figure/question before substitution.",
      "express the final answer with π or as a decimal with correct units (cm², m²).",
    ],
    checkpointQuestion:
      "Board checkpoint: Find the area of a sector of a circle with radius 7 cm and angle 60°. Use π = 22/7. Write Given, formula, and Therefore/Hence.",
    checkpointAnswer:
      "Expected answer: Given: r = 7 cm, θ = 60°. Area of sector = (θ/360) × πr² = (60/360) × (22/7) × 49 = (1/6) × 154 = 25.67 cm². Therefore area = 25.67 cm².",
    commonMistake:
      "Common mistake: using diameter instead of radius in the formula, or forgetting to subtract the triangle area for segment problems. This can lose marks in CBSE board checking.",
  },
  "surface-areas-and-volumes": {
    ...mathsGeneric,
    goalLine: "Learn {topic} with combined solid formulas and conversion logic in CBSE board-writing format.",
    keyIdeas: [
      "identify the component solids (cone, cylinder, hemisphere, etc.) in the combined figure.",
      "state the individual SA/Volume formula for each component before calculation.",
      "for conversion problems, equate volumes: volume of original = volume of new shape.",
      "express final answers with correct units (cm², cm³) and simplify using π = 22/7 or 3.14.",
    ],
    checkpointQuestion:
      "Board checkpoint: A solid is in the shape of a cone mounted on a hemisphere. Radius = 7 cm, height of cone = 24 cm. Find total surface area. Write Given, formulas, and Therefore/Hence.",
    checkpointAnswer:
      "Expected answer: Given: r = 7 cm, h = 24 cm. Slant height l = √(r² + h²) = √(49 + 576) = 25 cm. CSA of cone = πrl = 22/7 × 7 × 25 = 550 cm². CSA of hemisphere = 2πr² = 2 × 22/7 × 49 = 308 cm². Total SA = 550 + 308 = 858 cm².",
    commonMistake:
      "Common mistake: adding the base area of the cone when it is mounted on another solid (the base is not exposed). This can lose marks in CBSE board checking.",
  },
  statistics: {
    ...mathsGeneric,
    goalLine: "Learn {topic} with mean/median/mode calculations for grouped data in CBSE board-writing format.",
    keyIdeas: [
      "construct the frequency table with class intervals, frequencies, and cumulative frequencies.",
      "compute mean using direct/assumed-mean/step-deviation method: x̄ = a + (Σfᵢuᵢ / Σfᵢ) × h.",
      "find median using: Median = l + [(n/2 − cf) / f] × h, identifying the median class correctly.",
      "find mode using: Mode = l + [(f₁ − f₀) / (2f₁ − f₀ − f₂)] × h for the modal class.",
    ],
    checkpointQuestion:
      "Board checkpoint: Find the mean of the following data using step-deviation method: CI: 10-20, 20-30, 30-40, 40-50; f: 5, 8, 12, 5. Write Given, table, formula, and Therefore/Hence.",
    checkpointAnswer:
      "Expected answer: Given: data table. Assumed mean a = 25, h = 10. Calculate uᵢ = (xᵢ − a)/h for each class. Σfᵢuᵢ = 5(−1) + 8(0) + 12(1) + 5(2) = 17. Mean = 25 + (17/30) × 10 = 25 + 5.67 = 30.67. Therefore mean = 30.67.",
    commonMistake:
      "Common mistake: choosing the wrong median class (must use n/2, not n/2 + 1 for grouped data) or incorrect cf calculation. This can lose marks in CBSE board checking.",
  },
  probability: {
    ...mathsGeneric,
    goalLine: "Learn {topic} with sample space listing and event probability in CBSE board-writing format.",
    keyIdeas: [
      "define the experiment and list the complete sample space S with total outcomes.",
      "identify the favourable outcomes for the event precisely.",
      "apply P(E) = number of favourable outcomes / total outcomes.",
      "verify: P(E) + P(not E) = 1 as a cross-check.",
    ],
    checkpointQuestion:
      "Board checkpoint: Two dice are thrown. Find the probability of getting a sum of 7. Write Given, sample space count, favourable outcomes, and Therefore/Hence.",
    checkpointAnswer:
      "Expected answer: Given: two dice thrown. Total outcomes = 36. Favourable outcomes for sum 7: (1,6), (2,5), (3,4), (4,3), (5,2), (6,1) = 6. P(sum 7) = 6/36 = 1/6. Therefore P = 1/6.",
    commonMistake:
      "Common mistake: not listing all favourable outcomes systematically, or confusing 'at least' with 'exactly'. This can lose marks in CBSE board checking.",
  },
  "chemical-reactions-and-equations": {
    ...scienceGeneric,
    goalLine: "Learn {topic} with reaction balancing and type identification in CBSE board-writing format.",
    keyIdeas: [
      "write the word equation first, then convert to a balanced chemical equation.",
      "balance using hit-and-trial method: equalise atoms on both sides element by element.",
      "classify the reaction type: combination, decomposition, displacement, double displacement, or redox.",
      "identify oxidation (oxygen gain / hydrogen loss) and reduction (oxygen loss / hydrogen gain) in redox reactions.",
    ],
    checkpointQuestion:
      "Board checkpoint: Balance the equation Fe + H₂O → Fe₃O₄ + H₂ and identify the type of reaction. Write Given, balancing steps, and Therefore/Hence.",
    checkpointAnswer:
      "Expected answer: Given: Fe + H₂O → Fe₃O₄ + H₂. Balance Fe: 3Fe. Balance O: 4H₂O. Balance H: 4H₂. Balanced: 3Fe + 4H₂O → Fe₃O₄ + 4H₂. Type: Redox reaction (Fe is oxidised, H₂O is reduced). Therefore the balanced equation is 3Fe + 4H₂O → Fe₃O₄ + 4H₂.",
    commonMistake:
      "Common mistake: changing subscripts instead of coefficients while balancing, or not identifying the oxidised/reduced species. This can lose marks in CBSE board checking.",
  },
  "acids-bases-and-salts": {
    ...scienceGeneric,
    goalLine: "Learn {topic} with indicator tests, neutralisation, and pH reasoning in CBSE board-writing format.",
    keyIdeas: [
      "define acids (H⁺ donors) and bases (OH⁻ donors) with examples and indicator colour changes.",
      "write neutralisation reactions: Acid + Base → Salt + Water with balanced equations.",
      "explain the pH scale (0-14) and relate pH < 7 (acidic), pH = 7 (neutral), pH > 7 (basic) to everyday substances.",
      "describe preparation of common salts: bleaching powder, baking soda, washing soda, Plaster of Paris with equations.",
    ],
    checkpointQuestion:
      "Board checkpoint: What happens when sodium hydroxide is added to hydrochloric acid? Write the balanced equation, identify the type of reaction, and state the pH change.",
    checkpointAnswer:
      "Expected answer: Given: NaOH + HCl. Balanced equation: NaOH + HCl → NaCl + H₂O. Type: Neutralisation (double displacement). pH change: acidic solution becomes neutral (pH moves towards 7). Therefore the products are common salt and water.",
    commonMistake:
      "Common mistake: not writing the state symbols or confusing strong/weak acids with concentrated/dilute. This can lose marks in CBSE board checking.",
  },
  "metals-and-non-metals": {
    ...scienceGeneric,
    goalLine: "Learn {topic} with reactivity series reasoning and extraction logic in CBSE board-writing format.",
    keyIdeas: [
      "compare physical properties: metals are malleable, ductile, lustrous; non-metals are brittle.",
      "use the reactivity series to predict displacement reactions and extraction methods.",
      "describe extraction steps: enrichment → reduction → refining, with method depending on reactivity.",
      "write ionic bond formation: metal loses electrons → cation; non-metal gains electrons → anion.",
    ],
    checkpointQuestion:
      "Board checkpoint: Why is aluminium extracted by electrolytic reduction and not by carbon reduction? Explain using the reactivity series.",
    checkpointAnswer:
      "Expected answer: Given: Al is highly reactive (above carbon in reactivity series). Carbon cannot reduce Al₂O₃ because Al is more reactive than carbon. Therefore electrolytic reduction of molten Al₂O₃ is used (Hall-Héroult process).",
    commonMistake:
      "Common mistake: confusing the position of metals in the reactivity series or stating the wrong extraction method. This can lose marks in CBSE board checking.",
  },
  "carbon-and-its-compounds": {
    ...scienceGeneric,
    goalLine: "Learn {topic} with bonding, nomenclature, and reaction types in CBSE board-writing format.",
    keyIdeas: [
      "explain covalent bonding in carbon compounds: carbon forms 4 bonds (tetravalent) by sharing electrons.",
      "use IUPAC nomenclature: identify the longest chain, functional group suffix (-ol, -al, -one, -oic acid).",
      "describe homologous series properties: same functional group, differ by CH₂, similar chemical properties.",
      "write reactions: combustion, oxidation, addition (unsaturated), substitution (saturated) with equations.",
    ],
    checkpointQuestion:
      "Board checkpoint: Write the structural formula of ethanoic acid. Give one chemical property with a balanced equation.",
    checkpointAnswer:
      "Expected answer: Structural formula: CH₃COOH (methyl group bonded to carboxyl group). Reaction with sodium: 2CH₃COOH + 2Na → 2CH₃COONa + H₂. This is a displacement reaction. Therefore ethanoic acid reacts with active metals to release hydrogen gas.",
    commonMistake:
      "Common mistake: confusing structural and molecular formulas, or writing wrong functional group suffixes in IUPAC names. This can lose marks in CBSE board checking.",
  },
  "life-processes": {
    ...scienceGeneric,
    goalLine: "Learn {topic} with process-sequence clarity in CBSE board-writing format.",
    keyIdeas: [
      "define the biological process and key term first.",
      "name the governing concept/process relation explicitly.",
      "explain the sequence with cause-effect logic, body system context, and labels.",
      "conclude with the asked function/result in crisp exam language.",
    ],
    checkpointQuestion:
      "Board checkpoint: For this {topic} question, write Given context, process principle, one reasoning step, and final Therefore/Hence line.",
    checkpointAnswer:
      "Expected answer: Given: [biological context]. To Prove/Find: [function/outcome]. Principle/Law: [named process concept]. Therefore/Hence: [final biologically correct conclusion].",
    commonMistake:
      "Common mistake: listing facts without process sequence or correct terminology. This can lose marks in CBSE board checking.",
  },
  "control-and-co-ordination": {
    ...scienceGeneric,
    goalLine: "Learn {topic} with nervous system pathways and hormonal regulation in CBSE board-writing format.",
    keyIdeas: [
      "distinguish nervous control (electrical impulses, fast, short-lived) from hormonal control (chemical, slow, long-lasting).",
      "trace the reflex arc: receptor → sensory neuron → spinal cord → motor neuron → effector.",
      "name key plant hormones (auxin, gibberellin, cytokinin) and their specific growth effects.",
      "describe feedback mechanisms for hormonal regulation with specific gland-hormone-target examples.",
    ],
    checkpointQuestion:
      "Board checkpoint: Draw and explain a reflex arc with all five components. What is the role of the spinal cord?",
    checkpointAnswer:
      "Expected answer: Reflex arc: Receptor (detects stimulus) → Sensory neuron (carries impulse to CNS) → Relay neuron in spinal cord (processes) → Motor neuron (carries response) → Effector (muscle/gland responds). The spinal cord acts as the integration centre for reflex actions without involving the brain. Therefore reflex actions are involuntary and rapid.",
    commonMistake:
      "Common mistake: confusing reflex action with reflex arc, or stating that the brain controls all reflexes. This can lose marks in CBSE board checking.",
  },
  reproduction: {
    ...scienceGeneric,
    goalLine: "Learn {topic} with reproductive process clarity and diagram labelling in CBSE board-writing format.",
    keyIdeas: [
      "distinguish asexual reproduction modes: fission, budding, fragmentation, regeneration, vegetative propagation, spore formation.",
      "describe sexual reproduction in flowering plants: pollination → fertilisation → seed/fruit formation.",
      "explain human male and female reproductive systems with organ functions and gamete formation.",
      "describe menstrual cycle phases and the role of hormones (estrogen, progesterone) in regulation.",
    ],
    checkpointQuestion:
      "Board checkpoint: Describe the process of fertilisation in flowering plants from pollination to seed formation.",
    checkpointAnswer:
      "Expected answer: Pollination: pollen grain lands on stigma. Pollen tube grows through style to ovule. Male gamete fuses with egg cell (fertilisation). Zygote develops into embryo. Ovule becomes seed, ovary becomes fruit. Therefore fertilisation in plants involves pollen tube growth and fusion of gametes inside the ovule.",
    commonMistake:
      "Common mistake: confusing pollination with fertilisation, or not mentioning the pollen tube growth step. This can lose marks in CBSE board checking.",
  },
  "heredity-and-evolution": {
    ...scienceGeneric,
    goalLine: "Learn {topic} with Mendel's laws, inheritance patterns, and evolutionary evidence in CBSE board-writing format.",
    keyIdeas: [
      "state Mendel's laws: dominance, segregation (3:1 in F₂), independent assortment.",
      "use Punnett squares to show genotypic and phenotypic ratios for monohybrid and dihybrid crosses.",
      "distinguish between acquired and inherited traits with examples.",
      "explain evidence for evolution: homologous organs, analogous organs, fossils, DNA comparison.",
    ],
    checkpointQuestion:
      "Board checkpoint: In a monohybrid cross between tall (TT) and dwarf (tt) pea plants, show the F₁ and F₂ generations with genotypic and phenotypic ratios.",
    checkpointAnswer:
      "Expected answer: P: TT × tt. F₁: all Tt (tall, heterozygous). F₁ × F₁: Tt × Tt. F₂ Punnett square: TT, Tt, Tt, tt. Genotypic ratio: 1 TT : 2 Tt : 1 tt. Phenotypic ratio: 3 tall : 1 dwarf. Therefore the 3:1 ratio demonstrates the law of segregation.",
    commonMistake:
      "Common mistake: confusing genotypic ratio with phenotypic ratio, or not distinguishing homozygous from heterozygous. This can lose marks in CBSE board checking.",
  },
  "light-reflection-and-refraction-incl-human-eye-prism": {
    ...scienceGeneric,
    goalLine: "Learn {topic} with ray-rule reasoning in CBSE board-writing format.",
    keyIdeas: [
      "state mirror/lens/ray concept with proper sign convention.",
      "name the governing law/formula before solving.",
      "trace rays/labels correctly and justify image nature.",
      "conclude with final observation/result in exam-safe language.",
    ],
    checkpointQuestion:
      "Board checkpoint: For this {topic} prompt, write Given setup, law/formula used, one reasoned step, and final Therefore/Hence conclusion.",
    checkpointAnswer:
      "Expected answer: Given: [optical setup]. To Prove/Find: [image or value]. Principle/Law: [reflection/refraction/lens formula]. Therefore/Hence: [final image/result statement].",
    commonMistake:
      "Common mistake: wrong sign convention or unlabeled ray diagram reasoning. This can lose marks in CBSE board checking.",
  },
  electricity: {
    ...scienceGeneric,
    goalLine: "Learn {topic} with circuit-law reasoning in CBSE board-writing format.",
    keyIdeas: [
      "define current/voltage/resistance/power in context.",
      "state Ohm's law or circuit rule before calculation.",
      "show substitution with units and valid series/parallel logic.",
      "conclude with interpreted result and unit.",
    ],
    checkpointQuestion:
      "Board checkpoint: For this {topic} circuit case, write Given values, law used, one calculation step, and final Therefore/Hence result.",
    checkpointAnswer:
      "Expected answer: Given: [circuit values]. To Prove/Find: [required electrical quantity]. Principle/Law: [Ohm's law/series-parallel rule]. Therefore/Hence: [final value with unit].",
    commonMistake:
      "Common mistake: mixing series and parallel resistance rules or omitting units. This can lose marks in CBSE board checking.",
  },
  "magnetic-effects-of-electric-current": {
    ...scienceGeneric,
    goalLine: "Learn {topic} with field rules and motor/generator principles in CBSE board-writing format.",
    keyIdeas: [
      "apply the right-hand thumb rule to determine magnetic field direction around a current-carrying conductor.",
      "state Fleming's left-hand rule for motor effect: Force direction from current and field directions.",
      "explain electromagnetic induction: changing magnetic field induces EMF (Faraday's law), state Fleming's right-hand rule.",
      "describe the working of electric motor and AC generator with labelled diagrams.",
    ],
    checkpointQuestion:
      "Board checkpoint: State Fleming's left-hand rule. How is it used to determine the direction of force on a current-carrying conductor in a magnetic field?",
    checkpointAnswer:
      "Expected answer: Fleming's left-hand rule: Stretch the thumb, forefinger, and middle finger of the left hand mutually perpendicular. Forefinger → direction of magnetic field (B). Middle finger → direction of current (I). Thumb → direction of force (F). Therefore the force on the conductor is perpendicular to both the current and the magnetic field.",
    commonMistake:
      "Common mistake: confusing Fleming's left-hand rule (motor) with right-hand rule (generator), or mixing up which finger represents which quantity. This can lose marks in CBSE board checking.",
  },
  "our-environment": {
    ...scienceGeneric,
    goalLine: "Learn {topic} with food chain, ecosystem, and waste management concepts in CBSE board-writing format.",
    keyIdeas: [
      "define ecosystem components: biotic (producers, consumers, decomposers) and abiotic (sunlight, water, air, soil).",
      "trace energy flow through food chains and food webs with the 10% energy transfer rule.",
      "explain biological magnification: concentration of non-biodegradable substances increases at each trophic level.",
      "distinguish biodegradable from non-biodegradable waste and describe the ozone layer depletion mechanism.",
    ],
    checkpointQuestion:
      "Board checkpoint: What is biological magnification? Explain with a food chain example showing how pesticide concentration increases at each trophic level.",
    checkpointAnswer:
      "Expected answer: Biological magnification: progressive increase in concentration of non-biodegradable chemicals at successive trophic levels. Example: Water (0.003 ppm DDT) → Algae (0.04 ppm) → Small fish (0.5 ppm) → Large fish (2 ppm) → Fish-eating birds (25 ppm). Therefore top predators accumulate the highest concentration of harmful chemicals.",
    commonMistake:
      "Common mistake: confusing biological magnification with bioaccumulation, or not showing the increasing concentration trend across trophic levels. This can lose marks in CBSE board checking.",
  },
};

function applyTopic(seed: string, topic: string): string {
  return String(seed || "").replace(/\{topic\}/g, topic);
}

function sanitizeScopeLine(canonicalTopicKey: string, value: string, fallback: string): string {
  const line = String(value || "").trim();
  if (!line) return fallback;
  if (violatesAssessedScope(canonicalTopicKey, line)) return fallback;
  return line;
}

function buildGeneratedSeed(
  canonicalTopicKey: string,
  subject: "Maths" | "Science"
): TeachContractSeed {
  const base = subject === "Science" ? scienceGeneric : mathsGeneric;
  const scope = getScopeBullets(canonicalTopicKey, "assessed");
  const scope1 = scope[0] || base.keyIdeas[0];
  const scope2 = scope[1] || base.keyIdeas[1];
  const scope3 = scope[2] || base.keyIdeas[2];
  const guard = getScopeGuardLine(canonicalTopicKey);

  return {
    ...base,
    goalLine: `${base.goalLine} Stay within assessed chapter scope.`,
    keyIdeas: [
      sanitizeScopeLine(canonicalTopicKey, `state this assessed scope anchor: ${scope1}`, base.keyIdeas[0]),
      sanitizeScopeLine(canonicalTopicKey, `name the exact board anchor before solving: ${scope2}`, base.keyIdeas[1]),
      sanitizeScopeLine(canonicalTopicKey, `show one reasoning link from assessed scope: ${scope3}`, base.keyIdeas[2]),
      base.keyIdeas[3],
    ],
    commonMistake: guard
      ? `${base.commonMistake} ${guard}`
      : base.commonMistake,
  };
}

function buildContract(
  canonicalTopicKey: string,
  seed: TeachContractSeed,
  topicLabel: string,
  contractSource: "topic" | "generic"
): TopicTeachContract {
  const policy = getChapterScopePolicy(canonicalTopicKey);
  return {
    canonicalTopicKey,
    subject: seed.subject,
    contractSource,
    goalLine: applyTopic(seed.goalLine, topicLabel),
    keyIdeas: [
      applyTopic(seed.keyIdeas[0], topicLabel),
      applyTopic(seed.keyIdeas[1], topicLabel),
      applyTopic(seed.keyIdeas[2], topicLabel),
      applyTopic(seed.keyIdeas[3], topicLabel),
    ],
    checkpointQuestion: applyTopic(seed.checkpointQuestion, topicLabel),
    checkpointAnswer: applyTopic(seed.checkpointAnswer, topicLabel),
    commonMistake: applyTopic(seed.commonMistake, topicLabel),
    scopeGuardLine: getScopeGuardLine(canonicalTopicKey) || undefined,
    assessedScopeBullets: policy?.assessedScopeBullets || undefined,
    enrichmentScopeBullets: policy?.enrichmentScopeBullets || undefined,
  };
}

export function resolveTopicTeachContract(input: {
  topicKey?: string;
  subject?: string;
  nodeTitle?: string;
}): TopicTeachContract | null {
  const topicRaw = String(input.topicKey || "").trim();
  const canonicalInput = resolveCanonicalTopicKey(topicRaw);
  const subject = String(input.subject || "").toLowerCase().includes("science")
    ? "Science"
    : "Maths";
  const canonicalChapter = getCanonicalChapterBySlug(canonicalInput || topicRaw);
  const canonicalTopicKey =
    canonicalChapter?.canonicalSlug || canonicalInput || resolveCanonicalTopicKey(String(input.nodeTitle || ""));
  const topicLabel =
    String(input.nodeTitle || "").trim() ||
    resolveTopicDisplayName(subject, canonicalTopicKey || topicRaw) ||
    "this concept";

  if (canonicalChapter && canonicalTopicKey) {
    const seed =
      topicSpecificSeeds[canonicalTopicKey] || buildGeneratedSeed(canonicalTopicKey, subject);
    return buildContract(canonicalTopicKey, seed, topicLabel, "topic");
  }

  if (canonicalTopicKey && topicSpecificSeeds[canonicalTopicKey]) {
    return buildContract(canonicalTopicKey, topicSpecificSeeds[canonicalTopicKey], topicLabel, "topic");
  }

  const genericSeed = subject === "Science" ? scienceGeneric : mathsGeneric;
  const fallbackKey = canonicalTopicKey || resolveCanonicalTopicKey(topicLabel) || "generic-topic";
  return buildContract(fallbackKey, genericSeed, topicLabel, "generic");
}

export function getTopicTeachContractCoverage(): {
  totalCanonical: number;
  topicContracts: number;
  genericFallback: number;
  missingCanonical: string[];
} {
  const missingCanonical: string[] = [];
  let topicContracts = 0;
  let genericFallback = 0;

  for (const chapter of canonicalChapters) {
    const subject = chapter.subjectId === "science" ? "Science" : "Maths";
    const contract = resolveTopicTeachContract({
      topicKey: chapter.canonicalSlug,
      subject,
      nodeTitle: chapter.title,
    });
    if (!contract || contract.contractSource !== "topic") {
      missingCanonical.push(chapter.canonicalSlug);
      continue;
    }
    topicContracts += 1;
  }

  genericFallback = Math.max(0, canonicalChapters.length - topicContracts);
  return {
    totalCanonical: canonicalChapters.length,
    topicContracts,
    genericFallback,
    missingCanonical,
  };
}
