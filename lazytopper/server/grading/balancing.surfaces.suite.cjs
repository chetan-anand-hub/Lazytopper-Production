'use strict';
// server/grading/balancing.surfaces.suite.cjs — GRADER-BALANCE-1 (owner ruling 5 Nov 2026), proven on EVERY
// grading surface (CLAUDE.md §4a): the nine surface rows of rulings.surfaces.suite.cjs, each driven with ITS OWN
// live request shape through the REAL handlers (/api/check-solution and /api/grade-worksheet), only the model
// stubbed. The scenarios are the synthetic golden fixtures eval/golden/fixtures/grader-balance-1.balancing.json.
//
// THE RULING: grade a little stricter than a CBSE examiner. An equation with the right species that is not
// balanced loses EXACTLY ½, ONCE per equation, never more for balancing alone. The type follows what the student
// WROTE: wrong species or a changed subscript = conceptual; coefficients written but wrong = calculation; correct
// species left skeletal = presentation by default, conceptual ONLY with a verbatim quote of a failed balancing
// attempt elsewhere on the paper.
//
// EACH TEST TELLS THE READINGS APART (a prose rule gets read one step further than meant):
//   "½ per equation" vs "½ per step" / "the whole step"     → GB1-TWO-EQUATIONS (two equations in one step lose 1)
//   "never more for balancing alone" vs "the scheme's 1"    → GB1-SKELETAL (1 → ½)
//   "skeletal = presentation" vs "unbalanced when asked = conceptual" (trunk S4a) → GB1-SKELETAL
//   "coefficients written = calculation" vs the model's tag → GB1-COEFFICIENTS (the PAGE decides)
//   "conceptual only with evidence" vs "never conceptual"   → GB1-EVIDENCE and its five rejected quotes
//   "the species mark follows the scheme" vs "cap it too"   → GB1-SPECIES-ZNCL, GB1-SUBSCRIPT (marks untouched)
//   "the page decides" vs "the model's word decides"        → GB1-PAGE-BALANCED (nothing moves)
//   "DEDUCT ½" vs "only cap"                                → GB1-UNCHARGED (a flagged, uncharged fault costs ½)
//
// Run: node --test server/grading/balancing.surfaces.suite.cjs (it is also required by core.test.cjs, so it runs
// in CI under test:server:grading-core).

const test = require('node:test');
const assert = require('node:assert/strict');

const R = require('./rules.cjs');
const { SURFACES, drive } = require('./rulings.surfaces.suite.cjs');
const FIX = require('../eval/golden/fixtures/grader-balance-1.balancing.json');

const CASES = Object.fromEntries(FIX.cases.map((c) => [c.id, c]));
const clone = (x) => JSON.parse(JSON.stringify(x));
// a SCIENCE question (the guard is Science only): the request's subject on a one-question surface, the
// question's own subject on a paper (core.cjs normCtx subjectHint)
const withQ = (marks, text, subject = 'Science') => (view, req) => {
  view.marks = marks;
  view.questionText = text;
  if (req.questions) view.subject = subject; else req.subject = subject;
  // a Science PAPER: every question Science, so the chunk planner keeps them in ONE model reply (siblings)
  if (req.questions && subject === 'Science-paper') { view.subject = 'Science'; for (const q of req.questions) q.subject = 'Science'; }
  if (req.questions) { if ('finalAnswer' in view) view.finalAnswer = null; } else if ('finalAnswer' in req) req.finalAnswer = null;
};
const typesOf = (out) => out.annotatedSteps.map((st) => [st.status, st.marksAwarded, st.mistakeType]);
const run = (s, c, { steps, acceptsV2 = true, otherSteps, subject } = {}) => drive(s, {
  mutateTarget: withQ(c.marks, c.question, subject), targetSteps: () => clone(steps || c.modelReply), acceptsV2, otherSteps,
});
const MULTI = new Set(['ci-multi', 'quick-practice-batch', 'chapter-test', 'full-mock', 'worksheets', 'free-check-paper']);

test('GRADER-BALANCE-1 fixtures — every case is labelled SYNTHETIC and records both the ruling\'s and trunk\'s result', () => {
  assert.equal(FIX.synthetic, true);
  assert.ok(FIX.cases.length >= 8);
  for (const c of FIX.cases) {
    assert.equal(c.synthetic, true, c.id);
    assert.ok(c.expected && c.trunk && c.reading, c.id);
  }
  // the four readings the lane brief names are all present
  for (const id of ['GB1-SKELETAL', 'GB1-SUBSCRIPT', 'GB1-COEFFICIENTS', 'GB1-EVIDENCE']) assert.ok(CASES[id], id);
});

for (const s of SURFACES) {
  for (const c of FIX.cases) {
    test('GRADER-BALANCE-1 — ' + s.id + ': ' + c.id + ' — ' + c.reading, async () => {
      for (const acceptsV2 of [false, true]) {
        const r = await run(s, c, { acceptsV2 });
        assert.equal(r.result.marksAwarded, c.expected.marksAwarded, s.id + ' v2=' + acceptsV2 + ': marks');
        assert.deepEqual(typesOf(r.result), c.expected.steps, s.id + ' v2=' + acceptsV2 + ': steps');
        for (const st of r.result.annotatedSteps) {
          assert.ok(!('equationFault' in st) && !('balancingEvidence' in st) && !('_equationFault' in st), s.id + ': internal only — the response shape is unchanged');
        }
      }
    });
  }

  test('GRADER-BALANCE-1 — ' + s.id + ': a reply WITHOUT the new fields (every stored reply) reads the same where the page and the model\'s own words decide', async () => {
    for (const id of ['GB1-SKELETAL', 'GB1-COEFFICIENTS', 'GB1-TWO-EQUATIONS']) {
      const c = CASES[id];
      const legacy = clone(c.modelReply).map(({ equationFault, balancingEvidence, ...rest }) => rest);
      const r = await run(s, c, { steps: legacy });
      assert.equal(r.result.marksAwarded, c.expected.marksAwarded, s.id + ' ' + id + ' ' + JSON.stringify(typesOf(r.result)));
      assert.deepEqual(typesOf(r.result), c.expected.steps, s.id + ' ' + id);
    }
    // untagged, the model's own type stands where only chemistry knowledge could say otherwise (a changed subscript)
    const sub = CASES['GB1-SUBSCRIPT'];
    const r = await run(s, sub, { steps: clone(sub.modelReply).map(({ equationFault, ...rest }) => rest) });
    assert.deepEqual(typesOf(r.result), sub.trunk.steps, s.id + ': GB1-SUBSCRIPT untagged = trunk');
  });

  test('GRADER-BALANCE-1 — ' + s.id + ': the ½ cap carries the one fixed sentence; the charge carries its own', async () => {
    const capped = await run(s, CASES['GB1-SKELETAL']);
    assert.ok(capped.result.annotatedSteps[1].teacherAnnotation.endsWith(R.BALANCING_CAP_ANNOTATION), s.id);
    assert.ok(capped.result.annotatedSteps[1].teacherAnnotation.startsWith('½ '), s.id + ': the glyph matches the marks');
    const charged = await run(s, CASES['GB1-UNCHARGED']);
    assert.ok(charged.result.annotatedSteps[0].teacherAnnotation.endsWith(R.BALANCING_CHARGE_ANNOTATION), s.id);
    assert.equal(charged.result.marksLostByType.presentation, 0.5, s.id);
    assert.equal(capped.result.marksLostByType.presentation, 0.5, s.id);
    assert.equal(capped.result.marksLostByType.conceptual, 0, s.id + ': no knowledge gap recorded without evidence');
  });

  test('GRADER-BALANCE-1 evidence CONTROLS — ' + s.id + ': a quote that does not prove inability leaves the skeletal equation PRESENTATION', async () => {
    const c = CASES['GB1-EVIDENCE'];
    const variants = [
      ['no quote at all', (st) => { delete st[2].balancingEvidence; }],
      ['a FABRICATED quote, in no step of the student\'s work', (st) => { st[2].balancingEvidence = 'Zn + 2HCl → ZnCl₂ + H₂O'; }],
      ['the quote is the step\'s OWN equation', (st) => { st[2].balancingEvidence = 'Zn + HCl → ZnCl₂ + H₂'; }],
      ['the quote is the QUESTION\'s printed equation', (st) => { st[2].balancingEvidence = 'Fe + H₂O → Fe₃O₄ + H₂'; st[0].studentWork = 'Fe + H₂O → Fe₃O₄ + H₂ so 3Fe + 4H₂O'; }],
      ['the quoted equation was balanced CORRECTLY (evidence of ability)', (st) => { st[0] = { ...st[0], studentWork: '3Fe + 4H₂O → Fe₃O₄ + 4H₂', status: 'correct', marksAwarded: 1, marksDeducted: 0, mistakeType: null, equationFault: null, teacherAnnotation: '✓' }; st[2].balancingEvidence = '3Fe + 4H₂O → Fe₃O₄ + 4H₂'; }],
      // (½ lost there, so the answer's exam-technique total stays within the cap — capExamTechnique, ruling B)
      ['the quoted equation is another SKELETAL one (nothing was attempted)', (st) => { st[0] = { ...st[0], studentWork: 'Fe + H2O → Fe3O4 + H2 (heat)', status: 'partial', marksAwarded: 0.5, marksDeducted: 0.5, equationFault: 'not-balanced', mistakeType: 'presentation' }; st[2].balancingEvidence = 'Fe + H2O → Fe3O4 + H2 (heat)'; }],
      ['a trivially short quote', (st) => { st[2].balancingEvidence = 'Fe + H₂'; }],
    ];
    for (const [why, mut] of variants) {
      const steps = clone(c.modelReply);
      mut(steps);
      const r = await run(s, c, { steps });
      const last = r.result.annotatedSteps[2];
      assert.deepEqual([last.status, last.marksAwarded, last.mistakeType], ['partial', 0.5, 'presentation'], s.id + ': ' + why + ' ' + JSON.stringify(typesOf(r.result)));
    }
  });

  test('GRADER-BALANCE-1 evidence — ' + s.id + ': a failed attempt at a DIFFERENT reaction in ANOTHER QUESTION of the same paper proves inability (paper surfaces); a one-question request has no other question', async () => {
    const c = CASES['GB1-SKELETAL'];
    const steps = clone(c.modelReply);
    steps[1].balancingEvidence = '2Mg + 2O₂ → 2MgO';
    const other = (marks) => [{ description: 'Balanced equation', studentWork: '2Mg + 2O₂ → 2MgO', status: 'incorrect', marksAvailable: marks, marksAwarded: 0, marksDeducted: marks,
      teacherAnnotation: '× Oxygen does not balance.', mistakeType: 'calculation' }];
    const r = await run(s, c, { steps, otherSteps: other, subject: 'Science-paper' });
    assert.deepEqual(typesOf(r.result)[1], ['partial', 0.5, MULTI.has(s.id) ? 'conceptual' : 'presentation'], s.id);
    // CONTROLS: the other question's attempt is at the SAME reaction; or the other question balanced it correctly
    for (const [why, work] of [['same reaction', '2Al + 2H₂O → Al₂O₃ + 2H₂'], ['balanced', '2Mg + O₂ → 2MgO']]) {
      const st2 = clone(c.modelReply); st2[1].balancingEvidence = work;
      const r2 = await run(s, c, { steps: st2, subject: 'Science-paper', otherSteps: (marks) => [{ ...other(marks)[0], studentWork: work, equationFault: 'wrong-coefficients' }] });
      assert.deepEqual(typesOf(r2.result)[1], ['partial', 0.5, 'presentation'], s.id + ': CONTROL ' + why);
    }
  });

  test('GRADER-BALANCE-1 prompt — ' + s.id + ': the ruling reaches THIS surface\'s prompt, and the superseded S4a / mark-size rules do not', async () => {
    const r = await run(s, CASES['GB1-SKELETAL']);
    const p = r.calls[0].prompt;
    assert.ok(p.includes('(3) CORRECT SPECIES LEFT SKELETAL — NO coefficients attempted'), s.id);
    assert.ok(p.includes('loses EXACTLY ½, ONCE PER REACTION in the whole answer'), s.id);
    assert.ok(p.includes('This ½ is NOT part of the exam-technique cap'), s.id + ': outside the cap');
    assert.ok(p.includes('"' + R.BALANCING_EVIDENCE_FIELD + '"') && p.includes('"' + R.EQUATION_FAULT_FIELD + '"'), s.id + ': the two fields are named');
    assert.ok(!p.includes('MARK-SIZE SANITY CHECK') && !p.includes('S4a. UNBALANCED when the question ASKED'), s.id + ': superseded');
  });
}

// ── §GB unit level: the reader, the guard on the STORED reply shapes, and every strict-review repro (#1584) ───
const { readEquation } = require('./chemEquation.cjs');
const { normaliseQuestionResult, applyBalancingRuling } = require('./postprocess.cjs');
const Q = (text, marks, subject = 'Science') => ({ qNumber: 1, marks, questionText: text, subject });
const grade = (q, steps, ctx = {}) => normaliseQuestionResult(q, { annotatedSteps: clone(steps), finalAnswerCorrect: true, teacherNote: 'N.', addressesQuestion: 'yes' }, { acceptsV2: true, ...ctx });
const S = (o) => ({ description: 'Equation', status: 'incorrect', marksAvailable: 1, marksAwarded: 0, marksDeducted: 1, mistakeType: 'conceptual', teacherAnnotation: '×', ...o });
const OK = (o) => ({ description: 'Species', status: 'correct', marksAvailable: 1, marksAwarded: 1, marksDeducted: 0, mistakeType: null, teacherAnnotation: '✓', ...o });
const AL = 'Translate into a balanced chemical equation: aluminium reacts with steam to give aluminium oxide and hydrogen.';

test('§GB.1 the reader counts atoms as written: balanced, coefficients written, or NO VERDICT (null) — never a maths line, an ionic equation or "H20"', () => {
  const r = (t) => { const e = readEquation(t); return e && [e.balanced, e.coefficientsWritten]; };
  assert.deepEqual(r('(i) BaCl₂ + Al₂(SO₄)₃ → BaSO₄ + AlCl₃'), [false, false], 'skeletal');
  assert.deepEqual(r('(i) 3BaCl₂ + Al₂(SO₄)₃ → 3BaSO₄ + 2AlCl₃'), [true, true]);
  assert.deepEqual(r('(ii) 2Al + 3H₂O → Al₂O₃ + 2H₂'), [false, true], 'miscounted');
  assert.deepEqual(r('H2 + O2 → H2O2'), [true, false], 'a changed subscript BALANCES — only the model can see the species are wrong');
  assert.deepEqual(r('(b) 6CO₂ + 12H₂O ⎯⎯(sunlight, chlorophyll)⎯⎯→ C₆H₁₂O₆ + 6O₂ + 6H₂O'), [true, true], 'a condition on the arrow');
  assert.deepEqual(r('Decomposition: CaCO₃ → CaO + CO₂ on heating (calcium carbonate → calcium oxide + carbon dioxide)'), [true, false]);
  assert.deepEqual(r('CuSO4·5H2O → CuSO4 + 5H2O'), [true, true], 'water of crystallisation');
  assert.deepEqual(r('2Pb(NO3)2 → 2PbO + 4NO2 + O2 ↑'), [true, true]);
  for (const t of ['x = 5', '2x = 11 + 3', 'x² − 5x + 6 = 0', 'AB + CD = BC + DA', '(balanced)', 'Fe3+ + OH- → Fe(OH)3', '2H2 + O2 → 2H20', 'Na + H20 → NaOH + H2',
    'Step 1: CH3CH2OH --conc. H2SO4, 170 °C--> CH2=CH2 + H2O']) assert.equal(readEquation(t), null, t);
});

test('§GB.2 the stored OA2-Q15 shapes: one equation-only step → ½, presentation; a split "(balanced)" step acts ONLY when TAGGED (comment text never triggers)', () => {
  const q = Q('Write the balanced chemical equation for the reaction of sodium with water and name the type of reaction.', 2);
  const type = { description: 'Type', studentWork: 'It is a displacement reaction.', status: 'correct', marksAvailable: 1, marksAwarded: 1, marksDeducted: 0, mistakeType: null, teacherAnnotation: '✓' };
  const one = grade(q, [S({ studentWork: 'Na + H2O → NaOH + H2 (balanced)', status: 'partial', marksAwarded: 0.5, marksDeducted: 0.5, teacherAnnotation: '½ Correct reactants and products, but the equation is unbalanced' }), type]);
  assert.deepEqual(typesOf(one), [['partial', 0.5, 'presentation'], ['correct', 1, null]]);
  const split = (tag) => grade(q, [OK({ studentWork: 'Na + H2O → NaOH + H2', marksAvailable: 0.5, marksAwarded: 0.5 }),
    S({ description: 'Balancing', studentWork: '(balanced)', marksAvailable: 0.5, marksDeducted: 0.5, teacherAnnotation: '× Equation is not balanced', ...(tag ? { equationFault: 'not-balanced' } : {}) }), type]);
  assert.deepEqual(typesOf(split(false)), [['correct', 0.5, null], ['incorrect', 0, 'conceptual'], ['correct', 1, null]], 'untagged: the model\'s grade stands');
  assert.deepEqual(typesOf(split(true)), [['correct', 0.5, null], ['incorrect', 0, 'presentation'], ['correct', 1, null]], 'tagged: read from the step before');
});

test('§GB.3 OA2-Q17: a WRONG FORMULA (ZnCl) blocks the guard — in the same step, or in a separate formula step of the same reaction', () => {
  const q = Q('Write the balanced chemical equation for the reaction of zinc with dilute hydrochloric acid.', 2);
  for (const ann of ['× Zinc chloride formula is ZnCl₂ and the reaction is not balanced', '× Incorrect formula ZnCl (zinc chloride is ZnCl₂, not ZnCl) and equation is not balanced.']) {
    assert.deepEqual(typesOf(grade(q, [S({ studentWork: 'Zn + HCl → ZnCl + H2', marksAvailable: 2, marksDeducted: 2, teacherAnnotation: ann })])), [['incorrect', 0, 'conceptual']], ann);
  }
  const split = grade(q, [S({ description: 'Formulae', studentWork: 'Zn + HCl → ZnCl + H2', teacherAnnotation: '× Zinc chloride has the chemical formula ZnCl₂, not ZnCl.' }),
    S({ description: 'Balancing', studentWork: 'Zn + HCl → ZnCl + H2', teacherAnnotation: '× Equation left unbalanced.', equationFault: 'not-balanced' })]);
  assert.deepEqual(typesOf(split), [['incorrect', 0, 'conceptual'], ['incorrect', 0, 'conceptual']]);
});

test('§GB.4 a question that PRINTS the skeletal equation: the scheme mark stands (no cap); copied back unbalanced → UNATTEMPTED (coordinator ruling 3); wrong coefficients → calculation', () => {
  const q = Q('Balance the following chemical equation: Fe + H₂O → Fe₃O₄ + H₂', 1);
  const copied = grade(q, [S({ studentWork: 'Fe + H2O → Fe3O4 + H2', teacherAnnotation: '× Not balanced.', equationFault: 'not-balanced' })]);
  assert.deepEqual(copied.annotatedSteps.map((st) => [st.status, st.marksAwarded, st.mistakeType]), [['unattempted', 0, null]]);
  assert.equal(copied.marksLostByType.unattempted, 1);
  const tried = grade(q, [S({ studentWork: 'Fe + 2H2O → Fe3O4 + 2H2', teacherAnnotation: '× Not balanced.', equationFault: 'not-balanced' })]);
  assert.deepEqual(typesOf(tried), [['incorrect', 0, 'calculation']], 'no ½ given back');
  const words = grade(Q('Write the balanced chemical equation for the reaction of iron with steam.', 1), [S({ studentWork: 'Fe + H2O → Fe3O4 + H2', equationFault: 'not-balanced' })]);
  assert.deepEqual(typesOf(words), [['partial', 0.5, 'presentation']], 'CONTROL: named in words → the ½ cap');
});

test('§GB.5 balancing is OUTSIDE the exam-technique cap (coordinator ruling 1): three skeletal reactions cost 1½; a unit ½ beside them still counts on its own', () => {
  const q = Q('Write balanced chemical equations for the three reactions described above.', 3);
  const r = grade(q, ['Na + H2O → NaOH + H2', 'Mg + O2 → MgO', 'Al + O2 → Al2O3'].map((w) => S({ studentWork: w, equationFault: 'not-balanced' })));
  assert.equal(r.marksAwarded, 1.5);
  assert.equal(r.marksLostByType.presentation, 1.5);
});

test('§GB.6 REPRO 1 — a skeletal line followed by its BALANCED version (same step or next step) is working: nothing is charged or retyped', () => {
  const q = Q(AL, 2);
  const two = grade(q, [OK({ studentWork: 'Al + H₂O → Al₂O₃ + H₂', teacherAnnotation: '✓ Skeletal equation, unbalanced at this stage.' }),
    OK({ description: 'Balanced', studentWork: '2Al + 3H₂O → Al₂O₃ + 3H₂', equationFault: 'not-balanced' })]);
  assert.equal(two.marksAwarded, 2);
  const one = grade(q, [OK({ studentWork: 'Al + H₂O → Al₂O₃ + H₂\n2Al + 3H₂O → Al₂O₃ + 3H₂', marksAvailable: 2, marksAwarded: 2, equationFault: 'not-balanced' })]);
  assert.equal(one.marksAwarded, 2);
});

test('§GB.7 REPRO 2 — ½ per REACTION across steps: a species step + a balancing step, or a skeletal line + a wrong attempt, of the SAME reaction lose ½ in all', () => {
  const q = Q(AL, 2);
  const split = grade(q, [S({ description: 'Species', studentWork: 'Al + H₂O → Al₂O₃ + H₂', equationFault: 'not-balanced', status: 'correct', marksAwarded: 1, marksDeducted: 0, teacherAnnotation: '✓ Correct species; not balanced.' }),
    S({ description: 'Balancing', studentWork: 'Al + H₂O → Al₂O₃ + H₂', equationFault: 'not-balanced', marksDeducted: 1 })]);
  assert.equal(split.marksAwarded, 1.5, 'not 1, not ½');
  const tries = grade(q, [S({ description: 'Skeletal', studentWork: 'Al + H₂O → Al₂O₃ + H₂', equationFault: 'not-balanced' }),
    S({ description: 'Attempt', studentWork: '2Al + 3H₂O → Al₂O₃ + 2H₂', equationFault: 'wrong-coefficients' })]);
  assert.equal(tries.marksAwarded, 1.5, 'one reaction, ½');
  assert.deepEqual(tries.annotatedSteps.map((st) => st.mistakeType).filter(Boolean), ['calculation'], 'coefficients were attempted: calculation');
});

test('§GB.8 REPRO 3 — Maths, and equations the reader gives NO verdict on, are never touched — tag or no tag', () => {
  const maths = grade(Q('Solve 2x − 3 = 11.', 1, 'Maths'), [S({ studentWork: '2x = 11 + 3', equationFault: 'not-balanced' })]);
  assert.deepEqual(typesOf(maths), [['incorrect', 0, 'conceptual']]);
  const quad = grade(Q('Find the roots of x² − 5x + 6 = 0.', 2, 'Maths'), [S({ studentWork: 'x² − 5x + 6 = 0', marksAvailable: 2, marksDeducted: 2, equationFault: 'wrong-coefficients' })]);
  assert.equal(quad.marksAwarded, 0);
  const ionic = grade(Q('Write the ionic equation for the precipitation of iron(III) hydroxide.', 1), [S({ studentWork: 'Fe3+ + OH- → Fe(OH)3', equationFault: 'not-balanced' })]);
  assert.deepEqual(typesOf(ionic), [['incorrect', 0, 'conceptual']], 'no verdict: no give-back, no retype');
  const sciNoSubject = grade({ qNumber: 1, marks: 1, questionText: AL }, [S({ studentWork: 'Al + H₂O → Al₂O₃ + H₂', equationFault: 'not-balanced' })]);
  assert.deepEqual(typesOf(sciNoSubject), [['partial', 0.5, 'presentation']], 'no subject given: the reader reading a chemical equation makes it Science');
  const mathsSubject = grade(Q(AL, 1, 'Maths'), [S({ studentWork: 'Al + H₂O → Al₂O₃ + H₂', equationFault: 'not-balanced' })]);
  assert.deepEqual(typesOf(mathsSubject), [['incorrect', 0, 'conceptual']], 'explicitly Maths: never touched');
  const noSubjMaths = grade({ qNumber: 1, marks: 1, questionText: 'Solve 2x − 3 = 11.' }, [S({ studentWork: '2x = 11 + 3', equationFault: 'not-balanced' })]);
  assert.deepEqual(typesOf(noSubjMaths), [['incorrect', 0, 'conceptual']], 'no subject, no chemical equation read: nothing moves');
});

test('§GB.9 REPRO 4 — comment text never triggers: "✓ Balanced; no atom miscounted" with "H20" (digit zero) loses nothing', () => {
  const r = grade(Q('Write the balanced equation for the formation of water.', 2), [OK({ studentWork: '2H2 + O2 → 2H20', marksAvailable: 2, marksAwarded: 2, teacherAnnotation: '✓ Balanced; no atom miscounted.' })]);
  assert.equal(r.marksAwarded, 2);
  const unb = grade(Q('Write the balanced equation for the formation of water.', 2), [OK({ studentWork: 'H2 + O2 → H2O', marksAvailable: 2, marksAwarded: 2, teacherAnnotation: '✓ Correct; the equation is unbalanced.' })]);
  assert.equal(unb.marksAwarded, 2, 'an untagged comment saying "unbalanced" takes nothing (decision 4: a charge needs the model\'s TAG)');
});

test('§GB.10 REPRO 5 — evidence must be a DIFFERENT reaction the reader confirms as a failed attempt; the same reaction, or a tag on a balanced line, is not', () => {
  const q = Q('(i) Write the balanced equation for magnesium burning in air. (ii) Write the balanced equation for aluminium with steam.', 3);
  const base = (ev, first) => [first, OK({ part: '(ii)', studentWork: 'Al + H₂O → Al₂O₃ + H₂' }), S({ part: '(ii)', description: 'Balancing', studentWork: 'Al + H₂O → Al₂O₃ + H₂', equationFault: 'not-balanced', balancingEvidence: ev })];
  const failedMg = S({ part: '(i)', studentWork: '2Mg + 2O₂ → 2MgO', equationFault: 'wrong-coefficients' });
  assert.equal(grade(q, base('2Mg + 2O₂ → 2MgO', failedMg)).annotatedSteps[2].mistakeType, 'conceptual', 'a different reaction, confirmed failed: conceptual');
  const sameReaction = [OK({ part: '(i)', studentWork: '2Mg + O₂ → 2MgO' }), OK({ part: '(ii)', studentWork: 'Al + H₂O → Al₂O₃ + H₂' }),
    S({ part: '(ii)', description: 'Balancing', studentWork: '2Al + 3H₂O → Al₂O₃ + 2H₂', equationFault: 'wrong-coefficients', balancingEvidence: '2Al + 3H₂O → Al₂O₃ + 2H₂' })];
  assert.deepEqual(grade(q, sameReaction).annotatedSteps.map((st) => st.mistakeType).filter(Boolean), ['calculation'], 'its own wrong attempt at the SAME reaction: calculation, never conceptual on top');
  const taggedButBalanced = S({ part: '(i)', studentWork: '2Mg + O₂ → 2MgO', equationFault: 'wrong-coefficients' });
  assert.equal(grade(q, base('2Mg + O₂ → 2MgO', taggedButBalanced)).annotatedSteps[2].mistakeType, 'presentation', 'the model\'s tag on a line the page shows balanced is not evidence');
  const laterFixed = S({ part: '(i)', studentWork: '2Mg + 2O₂ → 2MgO\n2Mg + O₂ → 2MgO', equationFault: 'wrong-coefficients' });
  assert.equal(grade(q, base('2Mg + 2O₂ → 2MgO', laterFixed)).annotatedSteps[2].mistakeType, 'presentation', 'an attempt the student then balanced is working, not inability');
});

test('§GB.11 applyBalancingRuling never touches a step that lost nothing and is untagged, a withdrawn or unattempted step, or a correct balanced equation', () => {
  const st = [
    { part: null, description: 'E', studentWork: '2H2 + O2 → 2H2O', status: 'correct', marksAwarded: 1, marksDeducted: 0, _available: 1, teacherAnnotation: '✓ Balanced.', mistakeType: null },
    { part: null, description: 'W', studentWork: 'Fe + 4H2O -> Fe3O4 + 4H2', status: 'withdrawn', marksAwarded: 0, marksDeducted: 0, _available: 0, teacherAnnotation: '', mistakeType: null },
    { part: null, description: 'U', studentWork: '', status: 'unattempted', marksAwarded: 0, marksDeducted: 1, _available: 1, teacherAnnotation: '', mistakeType: null },
    { part: null, description: 'S', studentWork: 'Na + H2O → NaOH + H2', status: 'correct', marksAwarded: 1, marksDeducted: 0, _available: 1, teacherAnnotation: '✓ unbalanced', mistakeType: null },
  ];
  const before = JSON.stringify(st);
  assert.deepEqual(applyBalancingRuling(st, { q: Q('Write equations.', 2), subject: 'Science' }), { capped: 0, charged: 0, retyped: 0, unattempted: 0 });
  assert.equal(JSON.stringify(st), before);
});
