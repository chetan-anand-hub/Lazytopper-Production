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
const withQ = (marks, text) => (view, req) => {
  view.marks = marks;
  view.questionText = text;
  if (req.questions) { if ('finalAnswer' in view) view.finalAnswer = null; } else if ('finalAnswer' in req) req.finalAnswer = null;
};
const typesOf = (out) => out.annotatedSteps.map((st) => [st.status, st.marksAwarded, st.mistakeType]);
const run = (s, c, { steps, acceptsV2 = true, otherSteps } = {}) => drive(s, {
  mutateTarget: withQ(c.marks, c.question), targetSteps: () => clone(steps || c.modelReply), acceptsV2, otherSteps,
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

  test('GRADER-BALANCE-1 evidence — ' + s.id + ': a failed attempt in ANOTHER QUESTION of the same paper proves inability (paper surfaces); a one-question request has no other question', async () => {
    const c = CASES['GB1-SKELETAL'];
    const steps = clone(c.modelReply);
    steps[1].balancingEvidence = '2Al + 2H₂O → Al₂O₃ + 2H₂';
    const other = (marks) => [{ description: 'Balanced equation', studentWork: '2Al + 2H₂O → Al₂O₃ + 2H₂', status: 'incorrect', marksAvailable: marks, marksAwarded: 0, marksDeducted: marks,
      teacherAnnotation: '× Oxygen and hydrogen do not balance.', mistakeType: 'calculation', equationFault: 'wrong-coefficients' }];
    const r = await run(s, c, { steps, otherSteps: other });
    const want = MULTI.has(s.id) ? 'conceptual' : 'presentation';
    assert.deepEqual(typesOf(r.result)[1], ['partial', 0.5, want], s.id);
    // CONTROL: the other question balanced it correctly → evidence of ability, never of inability
    const good = (marks) => [{ description: 'Balanced equation', studentWork: '2Al + 3H₂O → Al₂O₃ + 3H₂', status: 'correct', marksAvailable: marks, marksAwarded: marks, marksDeducted: 0, teacherAnnotation: '✓', mistakeType: null }];
    const steps2 = clone(c.modelReply); steps2[1].balancingEvidence = '2Al + 3H₂O → Al₂O₃ + 3H₂';
    const r2 = await run(s, c, { steps: steps2, otherSteps: good });
    assert.deepEqual(typesOf(r2.result)[1], ['partial', 0.5, 'presentation'], s.id + ': CONTROL');
  });

  test('GRADER-BALANCE-1 prompt — ' + s.id + ': the ruling reaches THIS surface\'s prompt, and the superseded S4a / mark-size rules do not', async () => {
    const r = await run(s, CASES['GB1-SKELETAL']);
    const p = r.calls[0].prompt;
    assert.ok(p.includes('(3) CORRECT SPECIES LEFT SKELETAL — NO coefficients attempted'), s.id);
    assert.ok(p.includes('loses EXACTLY ½, ONCE PER EQUATION, and never more for balancing alone'), s.id);
    assert.ok(p.includes('"' + R.BALANCING_EVIDENCE_FIELD + '"') && p.includes('"' + R.EQUATION_FAULT_FIELD + '"'), s.id + ': the two fields are named');
    assert.ok(!p.includes('MARK-SIZE SANITY CHECK') && !p.includes('S4a. UNBALANCED when the question ASKED'), s.id + ': superseded');
  });
}

// ── §GB unit level: the reader, and the guard on the shapes the STORED golden replies show ─────────────────
const { readEquation } = require('./chemEquation.cjs');
const { normaliseQuestionResult, applyBalancingRuling } = require('./postprocess.cjs');
const Q = (text, marks) => ({ qNumber: 1, marks, questionText: text, subject: 'Science' });
const grade = (q, steps, ctx = {}) => normaliseQuestionResult(q, { annotatedSteps: clone(steps), finalAnswerCorrect: true, teacherNote: 'N.', addressesQuestion: 'yes' }, { acceptsV2: true, ...ctx });
const S = (o) => ({ description: 'Equation', status: 'incorrect', marksAvailable: 1, marksAwarded: 0, marksDeducted: 1, mistakeType: 'conceptual', teacherAnnotation: '×', ...o });

test('§GB.1 the reader counts atoms as written: balanced, coefficients written, or not an equation (null) — and never reads a maths line', () => {
  const r = (t) => { const e = readEquation(t); return e && [e.balanced, e.coefficientsWritten]; };
  assert.deepEqual(r('(i) BaCl₂ + Al₂(SO₄)₃ → BaSO₄ + AlCl₃'), [false, false], 'skeletal');
  assert.deepEqual(r('(i) 3BaCl₂ + Al₂(SO₄)₃ → 3BaSO₄ + 2AlCl₃'), [true, true]);
  assert.deepEqual(r('(ii) 2Al + 3H₂O → Al₂O₃ + 2H₂'), [false, true], 'miscounted');
  assert.deepEqual(r('H2 + O2 → H2O2'), [true, false], 'a changed subscript BALANCES — only the model can see the species are wrong');
  assert.deepEqual(r('(b) 6CO₂ + 12H₂O ⎯⎯(sunlight, chlorophyll)⎯⎯→ C₆H₁₂O₆ + 6O₂ + 6H₂O'), [true, true], 'a condition on the arrow');
  assert.deepEqual(r('Decomposition: CaCO₃ → CaO + CO₂ on heating (calcium carbonate → calcium oxide + carbon dioxide)'), [true, false], 'a label before, a remark after');
  assert.deepEqual(r('2NaHCO₃ → Na₂CO₃ + H₂O + CO₂ (on heating)'), [true, true]);
  assert.deepEqual(r('CuSO4·5H2O → CuSO4 + 5H2O'), [true, true], 'water of crystallisation');
  assert.deepEqual(r('2Pb(NO3)2 → 2PbO + 4NO2 + O2 ↑'), [true, true]);
  for (const t of ['x = 5', 'AB + CD = BC + DA', 'BC = DA', '(balanced)', 'Stomata are pores', 'Step 1: CH3CH2OH --conc. H2SO4, 170 °C--> CH2=CH2 + H2O']) assert.equal(readEquation(t), null, t);
});

test('§GB.2 the stored OA2-Q15 shapes: one step, or a "(balanced)" step split from its species step — ½ lost, presentation, either way', () => {
  const q = Q('Write the balanced chemical equation for the reaction of sodium with water and name the type of reaction.', 2);
  const one = grade(q, [S({ studentWork: 'Na + H2O → NaOH + H2 (balanced)', status: 'partial', marksAwarded: 0.5, marksDeducted: 0.5, teacherAnnotation: '½ Correct reactants and products, but the equation is unbalanced' }),
    { description: 'Type', studentWork: 'It is a displacement reaction.', status: 'correct', marksAvailable: 1, marksAwarded: 1, marksDeducted: 0, mistakeType: null, teacherAnnotation: '✓' }]);
  assert.deepEqual(typesOf(one), [['partial', 0.5, 'presentation'], ['correct', 1, null]]);
  const split = grade(q, [{ description: 'Species', studentWork: 'Na + H2O → NaOH + H2', status: 'correct', marksAvailable: 0.5, marksAwarded: 0.5, marksDeducted: 0, mistakeType: null, teacherAnnotation: '✓ Correct species written' },
    S({ description: 'Balancing the chemical equation', studentWork: '(balanced)', marksAvailable: 0.5, marksDeducted: 0.5, teacherAnnotation: '× Equation is not balanced (LHS has 2 H atoms, RHS has 3 H atoms)' }),
    { description: 'Type', studentWork: 'It is a displacement reaction.', status: 'correct', marksAvailable: 1, marksAwarded: 1, marksDeducted: 0, mistakeType: null, teacherAnnotation: '✓' }]);
  assert.deepEqual(typesOf(split), [['correct', 0.5, null], ['incorrect', 0, 'presentation'], ['correct', 1, null]], 'the equation is read from the step before');
});

test('§GB.3 the stored OA2-Q17 shapes: a WRONG FORMULA (ZnCl) blocks the balancing guard — in the same step, or in a separate formula step of the same equation', () => {
  const q = Q('Write the balanced chemical equation for the reaction of zinc with dilute hydrochloric acid.', 2);
  for (const ann of ['× Zinc chloride formula is ZnCl₂ and the reaction is not balanced', '× Incorrect formula ZnCl (zinc chloride is ZnCl₂, not ZnCl) and equation is not balanced.']) {
    const r = grade(q, [S({ studentWork: 'Zn + HCl → ZnCl + H2', marksAvailable: 2, marksDeducted: 2, teacherAnnotation: ann })]);
    assert.deepEqual(typesOf(r), [['incorrect', 0, 'conceptual']], ann);
  }
  const split = grade(q, [S({ description: 'Formulae', studentWork: 'Zn + HCl → ZnCl + H2', teacherAnnotation: '× Zinc chloride has the chemical formula ZnCl₂, not ZnCl.' }),
    S({ description: 'Balancing the chemical equation', studentWork: 'Zn + HCl → ZnCl + H2', teacherAnnotation: '× Equation left unbalanced (1 H on LHS vs 2 H on RHS).' })]);
  assert.deepEqual(typesOf(split), [['incorrect', 0, 'conceptual'], ['incorrect', 0, 'conceptual']], 'no ½ given back on an equation whose species are wrong');
  // CONTROL: the same split with the formula step CORRECT is a balancing fault — ½, presentation
  const ok = grade(q, [{ description: 'Formulae', studentWork: 'Zn + HCl → ZnCl2 + H2', status: 'correct', marksAvailable: 1, marksAwarded: 1, marksDeducted: 0, mistakeType: null, teacherAnnotation: '✓' },
    S({ description: 'Balancing the chemical equation', studentWork: 'Zn + HCl → ZnCl2 + H2', teacherAnnotation: '× Equation left unbalanced.' })]);
  assert.deepEqual(typesOf(ok), [['correct', 1, null], ['partial', 0.5, 'presentation']]);
});

test('§GB.4 a question that PRINTS the skeletal equation ("Balance: …") keeps its scheme mark: balancing is the whole task, so no ½ cap; copied back unbalanced it is not case (3) at all', () => {
  const printed = grade(Q('Balance the following chemical equation: Fe + H₂O → Fe₃O₄ + H₂', 1), [S({ studentWork: 'Fe + H2O → Fe3O4 + H2', teacherAnnotation: '× Not balanced.', equationFault: 'not-balanced' })]);
  assert.deepEqual(typesOf(printed), [['incorrect', 0, 'conceptual']], 'no ½ for copying the question, and no exam-technique type (the cap would hand ½ back): the model\'s grade stands');
  const tried = grade(Q('Balance the following chemical equation: Fe + H₂O → Fe₃O₄ + H₂', 1), [S({ studentWork: 'Fe + 2H2O → Fe3O4 + 2H2', teacherAnnotation: '× Not balanced.', equationFault: 'not-balanced' })]);
  assert.deepEqual(typesOf(tried), [['incorrect', 0, 'calculation']]);
  // CONTROL: the question names the reaction in words — the ½ cap applies
  const words = grade(Q('Write the balanced chemical equation for the reaction of iron with steam.', 1), [S({ studentWork: 'Fe + H2O → Fe3O4 + H2', teacherAnnotation: '× Not balanced.', equationFault: 'not-balanced' })]);
  assert.deepEqual(typesOf(words), [['partial', 0.5, 'presentation']]);
});

test('§GB.5 the exam-technique cap (owner ruling B, 1 mark per answer) still bounds balancing typed presentation: three skeletal equations cost 1, not 1½ — OWNER QUESTION recorded in the PR', () => {
  const q = Q('Write balanced chemical equations for the three reactions described above.', 3);
  const r = grade(q, ['Na + H2O → NaOH + H2', 'Mg + O2 → MgO', 'Al + O2 → Al2O3'].map((w) => S({ studentWork: w, teacherAnnotation: '× Not balanced.', equationFault: 'not-balanced' })));
  assert.equal(r.marksAwarded, 2, 'BAL-1 alone would give 1.5; ruling B caps exam technique at 1');
  assert.equal(r.marksLostByType.presentation, 1);
});

test('§GB.6 applyBalancingRuling never touches: a step that lost nothing and was not flagged, a withdrawn or unattempted step, a correct balanced equation', () => {
  const st = [
    { part: null, description: 'E', studentWork: '2H2 + O2 → 2H2O', status: 'correct', marksAwarded: 1, marksDeducted: 0, _available: 1, teacherAnnotation: '✓ Balanced.', mistakeType: null },
    { part: null, description: 'W', studentWork: 'Fe + 4H2O -> Fe3O4 + 4H2', status: 'withdrawn', marksAwarded: 0, marksDeducted: 0, _available: 0, teacherAnnotation: '', mistakeType: null },
    { part: null, description: 'U', studentWork: '', status: 'unattempted', marksAwarded: 0, marksDeducted: 1, _available: 1, teacherAnnotation: '', mistakeType: null },
  ];
  const before = JSON.stringify(st);
  assert.deepEqual(applyBalancingRuling(st, { q: Q('Write equations.', 2) }), { capped: 0, charged: 0, retyped: 0 });
  assert.equal(JSON.stringify(st), before);
});
