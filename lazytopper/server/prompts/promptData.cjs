const PRIORITY_GRIND_TOPIC_PROFILES = {
  'pair-of-linear-equations': {
    label: 'Pair of Linear Equations in Two Variables',
    marks: 3,
    given: [
      'Identify both equations in standard form.',
      'Note whether the target is intersection point, consistency, or value of variables.',
    ],
    toProve: ['Solve x and y with clear elimination/substitution steps.'],
    figureHints: ['Write equations one below another and align variable coefficients.'],
    steps: [
      'Choose elimination/substitution method and justify the choice briefly.',
      'Show one clean elimination/substitution step.',
      'Write x and y values, then verify in one original equation.',
    ],
    checkpoints: [
      'Method selected correctly for the pair of equations.',
      'Algebraic manipulation without sign errors.',
      'Final values written and verified.',
    ],
    traps: [
      { trap: 'Sign mistake during elimination.', fix: 'Write each transformed equation line-by-line before subtraction.' },
      { trap: 'Stopping after finding one variable.', fix: 'Back-substitute and report both x and y.' },
    ],
    drills: [
      { prompt: 'Solve one pair using elimination in 3 lines.', answerKey: 'Eliminate one variable, solve the other, back-substitute.' },
      { prompt: 'State condition for infinitely many solutions.', answerKey: 'a1/a2 = b1/b2 = c1/c2' },
    ],
    nextNodeId: 'quadratic-equations',
    nextReason: 'Quadratic solving is the next high-yield algebra progression.',
  },
  'quadratic-equations': {
    label: 'Quadratic Equations',
    marks: 4,
    given: [
      'Rewrite equation in ax^2 + bx + c = 0 form.',
      'Identify method: factorization / completing square / quadratic formula.',
    ],
    toProve: ['Find roots with valid method and check by substitution.'],
    figureHints: ['Keep discriminant and root calculations in separate lines.'],
    steps: [
      'State chosen method and why it fits this equation.',
      'Compute roots with one justified transformation chain.',
      'Write both roots and validate one root quickly.',
    ],
    checkpoints: [
      'Correct standard form setup.',
      'Correct discriminant/factor decomposition.',
      'Both roots written with correct sign.',
    ],
    traps: [
      { trap: 'Missing second root.', fix: 'Always write x1 and x2 explicitly.' },
      { trap: 'Incorrect sign in formula.', fix: 'Bracket numerator: (-b ± √D) / 2a before simplifying.' },
    ],
    drills: [
      { prompt: 'Compute discriminant and predict nature of roots.', answerKey: 'Use D = b^2 - 4ac and classify from D.' },
      { prompt: 'Solve one factorable quadratic in board format.', answerKey: 'Factor, set each factor to zero, list both roots.' },
    ],
    nextNodeId: 'pair-of-linear-equations',
    nextReason: 'Switch to linear systems to strengthen algebra fluency.',
  },
  trigonometry: {
    label: 'Trigonometry',
    marks: 3,
    given: [
      'Identify right triangle and known angle/side.',
      'Select ratio (sin, cos, tan) matching required side.',
    ],
    toProve: ['Compute unknown side/angle with correct ratio and units.'],
    figureHints: ['Mark opposite, adjacent, and hypotenuse relative to the given angle.'],
    steps: [
      'Write target ratio formula with substituted values.',
      'Rearrange cleanly and compute final value.',
      'Add unit and practical rounding if needed.',
    ],
    checkpoints: [
      'Correct ratio selected from context.',
      'Correct side mapping (opp/adj/hyp).',
      'Final answer with units.',
    ],
    traps: [
      { trap: 'Mixing opposite and adjacent sides.', fix: 'Anchor sides with respect to theta before formula.' },
      { trap: 'Using Pythagoras when not needed.', fix: 'Use direct trigonometric ratio first if one angle is given.' },
    ],
    drills: [
      { prompt: 'Pick correct ratio for each mini scenario.', answerKey: 'Match target side relation to sin/cos/tan.' },
      { prompt: 'One board-style height-distance calculation.', answerKey: 'Ratio equation + substitution + unit.' },
    ],
    nextNodeId: 'maths_applications_trigonometry',
    nextReason: 'Applications build exam-oriented word-problem fluency.',
  },
  electricity: {
    label: 'Electricity',
    marks: 3,
    given: [
      'List known values with units (V, I, R, P).',
      'Identify required quantity and relevant law/formula.',
    ],
    toProve: ['Compute unknown quantity with unit-consistent steps.'],
    figureHints: ['Draw a simple circuit label (source, resistor, current direction).'],
    steps: [
      'Write governing formula (Ohm’s law / power relation).',
      'Substitute values with SI units only.',
      'Compute and state final quantity with unit.',
    ],
    checkpoints: [
      'Correct formula chosen for target variable.',
      'Units handled correctly before substitution.',
      'Numerical result and unit both correct.',
    ],
    traps: [
      { trap: 'Using mA without conversion.', fix: 'Convert to A before formula substitution.' },
      { trap: 'Confusing power and energy formulas.', fix: 'Use P = VI and E = Pt with explicit unit checks.' },
    ],
    drills: [
      { prompt: 'Find resistance using V and I.', answerKey: 'R = V/I with SI units.' },
      { prompt: 'Compute energy for given power and time.', answerKey: 'E = Pt; convert time to seconds when needed.' },
    ],
    nextNodeId: 'magnetic-effects-of-electric-current',
    nextReason: 'Magnetic effects is the natural continuation of electricity concepts.',
  },
  'life-processes': {
    label: 'Life Processes',
    marks: 3,
    given: [
      'Identify process focus (nutrition, respiration, transport, excretion).',
      'List key biological terms used in the question.',
    ],
    toProve: ['Write mechanism in correct sequence with one function line.'],
    figureHints: ['Use simple labelled flow chart (organ -> role -> outcome).'],
    steps: [
      'State the biological process definition.',
      'Write sequence of steps/events in order.',
      'End with exam-ready function/result statement.',
    ],
    checkpoints: [
      'Correct process identified from question cue.',
      'Sequence of steps is biologically accurate.',
      'Conclusion links process to organism survival.',
    ],
    traps: [
      { trap: 'Mixing respiration and breathing.', fix: 'Differentiate process location and purpose in one line.' },
      { trap: 'Missing keyword terms in answers.', fix: 'Include textbook terms: tissue/organ/enzyme/gas exchange as relevant.' },
    ],
    drills: [
      { prompt: 'Write a 3-line process flow for one life process.', answerKey: 'Definition -> key steps -> function.' },
      { prompt: 'One difference question with 2 points.', answerKey: 'Point-wise contrast with textbook keywords.' },
    ],
    nextNodeId: 'science_control_coordination',
    nextReason: 'Control and coordination builds on foundational biology process understanding.',
  },
};

const PRIORITY_GRIND_TOPIC_ALIASES = {
  'maths_introduction_trigonometry': 'trigonometry',
  'maths_applications_trigonometry': 'trigonometry',
  'science_light_reflection_refraction': 'trigonometry',
  'chemical-reactions-equations': 'life-processes',
  'carbon-and-its-compounds': 'life-processes',
  'magnetic-effects-of-electric-current': 'electricity',
};

const MINDMAP_NODE_TO_CORE_ID = {
  gQ1: 'N1',
  gAA: 'N2',
  gSAS: 'N3',
  gSSS: 'N4',
  gBPT: 'N5',
  gWarnNotBPT: 'N6',
  gCPST: 'N7',
  gArea: 'N8',
  gPyth: 'N9',
  gQ5: 'N10',
  gEnd: 'N11',
  gCPSTrule: 'N12',
};

const MINDMAP_TEACH_OUTLINES = {
  N1: {
    goal: 'Understand triangle similarity.',
    explanation: [
      'Define similarity as equal angles with proportional sides.',
      'Explain why similarity helps solve geometry problems.',
      'Show how to check similarity from given data.',
    ],
    example: 'Check whether triangle ABC and triangle PQR are similar when AB/PQ = BC/QR = AC/PR.',
    check: 'What two conditions must hold for triangles to be similar?',
    exam: 'State that triangle ABC ~ triangle PQR because corresponding angles are equal and sides are proportional.',
  },
  N2: {
    goal: 'Apply AA similarity criterion.',
    explanation: [
      'Identify two pairs of equal angles.',
      'Use angle sum property to infer the third angle is equal.',
      'Conclude similarity by AA.',
    ],
    example: 'If angle A = angle P and angle B = angle Q in triangles ABC and PQR, prove they are similar.',
    check: 'How many angle pairs are needed to apply the AA criterion?',
    exam: 'By AA criterion, since angle A = angle P and angle B = angle Q, conclude triangle ABC ~ triangle PQR.',
  },
  N3: {
    goal: 'Use the SAS similarity criterion.',
    explanation: [
      'Identify one equal included angle.',
      'Check ratios of the adjacent sides around that angle.',
      'Conclude similarity by SAS.',
    ],
    example: 'In triangles ABC and PQR, if angle A = angle P and AB/PQ = AC/PR, prove similarity.',
    check: 'Which angle must you use when applying the SAS criterion?',
    exam: 'By SAS criterion, one equal angle and adjacent sides in proportion imply triangle ABC ~ triangle PQR.',
  },
  N4: {
    goal: 'Apply the SSS similarity criterion.',
    explanation: [
      'Compute all three sides of both triangles.',
      'Match corresponding sides correctly and confirm ratios are equal.',
      'Conclude similarity by SSS.',
    ],
    example: 'Show triangle ABC ~ triangle PQR if AB:BC:AC = 3:4:5 and PQ:QR:RP = 6:8:10.',
    check: 'Do you need any angle information to use SSS?',
    exam: 'If AB/PQ = BC/QR = AC/RP, then triangle ABC ~ triangle PQR by SSS.',
  },
  N5: {
    goal: 'Understand and apply the Basic Proportionality Theorem (BPT).',
    explanation: [
      'State BPT: a line parallel to one side divides the other two sides in equal ratios.',
      'Identify the parallel line in the diagram.',
      'Use AD/DB = AE/EC to find unknowns.',
    ],
    example: 'In triangle ABC, DE || BC, AD = 3 cm and DB = 2 cm. Find AE/EC.',
    check: 'What must be parallel to apply the Basic Proportionality Theorem?',
    exam: 'Since DE || BC, by BPT we write AD/DB = AE/EC.',
  },
  N6: {
    goal: 'Recognize when BPT is not applicable.',
    explanation: [
      'BPT needs a line parallel to a side; ratios alone are not enough.',
      'Use the converse only after proving the parallel condition.',
      'Verify parallel lines before applying BPT.',
    ],
    example: 'In triangle ABC, AD/DB = AE/EC but DE is not marked parallel; decide what to do first.',
    check: 'Can you apply BPT if the line is not given as parallel?',
    exam: 'Use BPT only when the line is given parallel; otherwise prove parallelism first.',
  },
  N7: {
    goal: 'Use corresponding parts of similar triangles (CPST).',
    explanation: [
      'After proving triangles similar, write ratios of corresponding sides.',
      'Use the ratios to find unknown side lengths or perimeters.',
      'Recall corresponding angles are equal.',
    ],
    example: 'If triangle ABC ~ triangle PQR and AB = 4 cm, BC = 5 cm, AC = 6 cm, PQ = 2 cm, find QR.',
    check: 'How do you use CPST to find unknown lengths after proving similarity?',
    exam: 'From triangle ABC ~ triangle PQR, set up AB/PQ = BC/QR = AC/RP and solve.',
  },
  N8: {
    goal: 'Apply the area ratio property of similar triangles.',
    explanation: [
      'Area ratio equals the square of the corresponding side ratio.',
      'Relate side ratio to area ratio.',
      'Use it to compute area or side length.',
    ],
    example: 'If AB/PQ = 2/3, find area(triangle ABC)/area(triangle PQR).',
    check: 'Why do we square the side ratio when comparing areas?',
    exam: 'For similar triangles, area(ABC)/area(PQR) = (AB/PQ)^2.',
  },
  N9: {
    goal: 'Apply Pythagoras theorem in right triangles.',
    explanation: [
      'Use only for right-angled triangles.',
      'Identify the hypotenuse correctly.',
      'Apply hypotenuse^2 = sum of squares of other two sides.',
    ],
    example: 'In right-angled triangle ABC, AB = 6 cm and AC = 8 cm. Find BC.',
    check: 'Which side is the hypotenuse in a right triangle?',
    exam: 'In right-angled triangle ABC, BC^2 = AB^2 + AC^2 by Pythagoras.',
  },
  N10: {
    goal: 'Distinguish between BPT and similarity criteria.',
    explanation: [
      'BPT needs a parallel line; similarity needs angle/side criteria.',
      'Decide which tool fits the given information.',
      'Do not use ratios alone to claim similarity.',
    ],
    example: 'Given AD/DB = AE/EC, does this imply triangle ADE ~ triangle ABC?',
    check: 'Why cannot equal side ratios alone prove triangles are similar?',
    exam: 'Check for a parallel line before using BPT; otherwise use AA, SAS, or SSS to prove similarity.',
  },
  N11: {
    goal: 'Build a self-check habit for mastery.',
    explanation: [
      'Verify the theorem matches the given information.',
      'Re-check ratios or angle conditions.',
      'Confirm the conclusion answers the question.',
    ],
    example: 'You concluded triangle ABC ~ triangle PQR by SSS; verify the side ratios are equal.',
    check: 'What should you verify after proving triangles similar?',
    exam: 'Always confirm the chosen theorem fits the given data and the conclusion is correct.',
  },
  N12: {
    goal: 'Use angle equality consequences in similar triangles.',
    explanation: [
      'Similar triangles have equal corresponding angles.',
      'Use angle equality to show lines are parallel.',
      'Apply angle equality in proofs.',
    ],
    example: 'After proving triangle ABC ~ triangle PQR, use angle A = angle P to show AB || PQ (when extended).',
    check: 'How can equal angles from similarity help prove lines are parallel?',
    exam: 'From triangle ABC ~ triangle PQR, write angle A = angle P, angle B = angle Q, and angle C = angle R.',
  },
};

const TRIANGLES_LEARN_SEED = {
  keyDefinitions: {
    simpleExplanation: [
      'Similar triangles have the same shape but can be different sizes.',
      'Corresponding angles are equal and corresponding sides are in the same ratio.',
      'AA: two equal angles are enough to prove similarity.',
      'SAS: included angle equal and adjacent sides proportional.',
      'SSS: all three pairs of sides proportional.',
      'CPST: corresponding parts of similar triangles are proportional/equal.',
    ],
    cbseExamSentence: [
      'If ∠A = ∠P and ∠B = ∠Q, then ΔABC ~ ΔPQR by AA.',
      'From similarity, AB/PQ = BC/QR = AC/PR (CPST).',
    ],
    workedExamples: [
      {
        title: 'AA similarity',
        question: 'If ∠A = ∠P and ∠B = ∠Q, prove ΔABC ~ ΔPQR.',
        steps: [
          { text: 'Given ∠A = ∠P and ∠B = ∠Q.', marks: 1 },
          { text: 'Two angles equal ⇒ AA similarity.', marks: 1 },
          { text: 'So ΔABC ~ ΔPQR.', marks: 1 },
        ],
        totalMarks: 3,
        finalAnswer: 'ΔABC ~ ΔPQR by AA.',
      },
      {
        title: 'CPST application',
        question: 'If ΔABC ~ ΔPQR, AB = 6 cm, PQ = 3 cm, BC = 5 cm, find QR.',
        steps: [
          { text: 'AB/PQ = BC/QR by CPST.', marks: 1 },
          { text: '6/3 = 5/QR ⇒ 2 = 5/QR.', marks: 1 },
          { text: 'QR = 2.5 cm.', marks: 1 },
        ],
        totalMarks: 3,
        finalAnswer: 'QR = 2.5 cm.',
      },
    ],
    commonMistakes: [
      'Mixing correspondence order.',
      'Using SAS with a non-included angle.',
      'Using CPST before proving similarity.',
    ],
    checkQuestion: 'What two conditions must be verified before using AA similarity?',
    diagramType: 'SIMILARITY_AA',
    diagramLabels: { A: 'A', B: 'B', C: 'C', P: 'P', Q: 'Q', R: 'R' },
  },
  mindmapNodes: {
    gQ1: {
      bullets: [
        'Similarity means equal corresponding angles.',
        'Side ratios of corresponding sides are equal.',
        'Order of vertices fixes correspondence.',
        'Similarity helps find unknown sides.',
        'Use AA/SSS/SAS to prove it first.',
      ],
      examLines: [
        'State the criterion and the correspondence order.',
        'Write ΔABC ~ ΔPQR before using CPST.',
      ],
      example: {
        question: 'If ∠A = ∠P and ∠B = ∠Q, prove similarity and state one ratio.',
        steps: ['AA similarity ⇒ ΔABC ~ ΔPQR.', 'Then AB/PQ = BC/QR.'],
        finalAnswer: 'ΔABC ~ ΔPQR and AB/PQ = BC/QR.',
      },
      commonError: 'Skipping the correspondence order.',
      commonFix: 'Write the angle equalities and the matching order before using CPST.',
      checkQuestion: 'Which criterion proves similarity when two angles match?',
    },
  },
  proof: {
    given: ['In ΔABC, DE || BC with D on AB and E on AC.'],
    toProve: ['AD/DB = AE/EC.'],
    construction: ['Not required.'],
    proofSteps: [
      { statement: '∠ADE = ∠ABC and ∠AED = ∠ACB.', reason: 'Alternate interior angles', mark: 1 },
      { statement: 'ΔADE ~ ΔABC.', reason: 'AA similarity', mark: 1 },
      { statement: 'AD/AB = AE/AC.', reason: 'CPST', mark: 1 },
      { statement: 'AD/DB = AE/EC.', reason: 'Componendo', mark: 1 },
    ],
    conclusion: ['Hence AD/DB = AE/EC.'],
    totalMarks: 4,
    diagramType: 'BPT',
    diagramLabels: { A: 'A', B: 'B', C: 'C', D: 'D', E: 'E' },
  },
  solveWithMe: {
    question: 'Which two triangles are being compared for similarity here?',
    answerFormat: 'Short sentence (e.g., ΔADE and ΔABC).',
  },
};

function createPromptData() {
  return {
    PRIORITY_GRIND_TOPIC_PROFILES,
    PRIORITY_GRIND_TOPIC_ALIASES,
    MINDMAP_NODE_TO_CORE_ID,
    MINDMAP_TEACH_OUTLINES,
    TRIANGLES_LEARN_SEED,
  };
}
module.exports = {
  createPromptData,
  PRIORITY_GRIND_TOPIC_PROFILES,
  PRIORITY_GRIND_TOPIC_ALIASES,
};
