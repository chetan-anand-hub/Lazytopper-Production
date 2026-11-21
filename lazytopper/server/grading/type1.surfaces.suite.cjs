'use strict';
// server/grading/type1.surfaces.suite.cjs — GRADER-TYPE-1 (owner rulings R1-R2, 22 Nov 2026), proven on EVERY grading
// surface (CLAUDE.md 4a): the nine surface rows of rulings.surfaces.suite.cjs, each driven with ITS OWN request shape through
// the REAL handlers (/api/check-solution and /api/grade-worksheet), only the model stubbed.
//
//   R2  a blank asked-for REASON beside a right answer, nothing on the page proving the student knows it -> the lost mark is
//       typed `conceptual` (it was Not attempted / "reason not recorded"). With proof -> `presentation`, as the 5 Nov ruling.
//       Two shapes: a SEPARATE blank step (deterministic from the step's description + the question asking for a reason, or
//       the model's structured `omittedAsk`), and a FOLDED reason (the model's structured `omittedAsk` on the answer step).
//   R1  HCF/LCM-type dropped power: silly only where the page shows the rule applied elsewhere, else conceptual — this is a
//       PROMPT rule (case law 13); the server passes the model's type through, and these cases pin the consequences (marks).
//   Never read: teacherAnnotation / comment prose (the #1584 precedent).
//
// Run: node --test server/grading/type1.surfaces.suite.cjs. Required by rulings.surfaces.suite.cjs, so it also runs in CI under
// test:server:grading-core (core.test.cjs requires that file).

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('child_process');
const path = require('path');

const R = require('./rules.cjs');
const { SURFACES, drive } = require('./rulings.surfaces.suite.cjs');
const FIX = require('../eval/golden/fixtures/grader-type-1.json');
const Q25 = require('../eval/golden/fixtures/grader-quality-1.ws-m-mix-02.json').cases.find((c) => c.id === 'GQ1-WS02-Q25');

const CASES = Object.fromEntries(FIX.cases.map((c) => [c.id, c]));
const clone = (x) => JSON.parse(JSON.stringify(x));
const withMarks = (marks, text) => (view) => { view.marks = marks; view.questionText = text; };
const typesOf = (out) => out.annotatedSteps.map((st) => [st.status, st.marksAwarded, st.mistakeType]);
const run = (s, c, { steps, acceptsV2 = true, text, marks } = {}) => drive(s, {
  mutateTarget: withMarks(marks || c.marks, text || c.questionText), targetSteps: () => clone(steps || c.modelReply), acceptsV2,
});
const lostSubset = (lost, keys) => Object.fromEntries(Object.keys(keys).map((k) => [k, lost[k]]));
async function withEnv(name, value, fn) {
  const was = process.env[name];
  process.env[name] = value;
  try { return await fn(); } finally { if (was === undefined) delete process.env[name]; else process.env[name] = was; }
}

test('GRADER-TYPE-1 fixtures — every case is SYNTHETIC; each states its reading and the expected result', () => {
  assert.equal(FIX.synthetic, true);
  assert.ok(FIX.cases.length >= 8);
  for (const c of FIX.cases) assert.ok(c.expected && c.reading && c.modelReply && c.questionText, c.id);
  for (const id of ['WS-M-FULL-02-Q25i-FOLDED', 'LCM-DROP-NO-RULE', 'LCM-DROP-RULE-SHOWN-ELSEWHERE', 'LCM-LOWEST-POWERS-THROUGHOUT', 'LCM-HIGHEST-POWERS-MULT-SLIP']) assert.ok(CASES[id], id);
});

for (const s of SURFACES) {
  for (const c of FIX.cases) {
    test('GRADER-TYPE-1 — ' + s.id + ': ' + c.id + ' — ' + c.reading, async () => {
      for (const acceptsV2 of [false, true]) {
        const r = await run(s, c, { acceptsV2 });
        const tag = s.id + ' v2=' + acceptsV2 + ': ';
        assert.equal(r.result.marksAwarded, c.expected.marksAwarded, tag + 'marks');
        assert.deepEqual(typesOf(r.result), c.expected.steps, tag + 'steps');
        if (acceptsV2) assert.deepEqual(lostSubset(r.result.marksLostByType, c.expected.marksLostByType), c.expected.marksLostByType, tag + 'marksLostByType');
        for (const st of r.result.annotatedSteps) assert.ok(!('omittedAsk' in st) && !('_omittedAsk' in st), tag + 'internal only — the response shape is unchanged');
      }
    });
  }

  test('GRADER-TYPE-1 — ' + s.id + ': under GRADER_TYPE_1_DISABLED=1 the server rules read exactly as trunk (folded + placeholder shapes)', async () => {
    await withEnv('GRADER_TYPE_1_DISABLED', '1', async () => {
      for (const id of ['WS-M-FULL-02-Q25i-FOLDED', 'T1-Q25i-PLACEHOLDER']) {
        const c = CASES[id];
        const r = await run(s, c);
        assert.deepEqual(typesOf(r.result), c.trunk.steps, s.id + ' ' + id);
        assert.deepEqual(lostSubset(r.result.marksLostByType, c.trunk.marksLostByType), c.trunk.marksLostByType, s.id + ' ' + id);
        assert.equal(r.result.marksAwarded, c.trunk.marksAwarded, s.id + ' ' + id);
      }
    });
  });

  test('GRADER-TYPE-1 — ' + s.id + ': R1 consequences — typed silly the dropped power gets the miscopy-½ restore (+½); typed conceptual it does not', async () => {
    const c = CASES['LCM-DROP-RULE-SHOWN-ELSEWHERE'];
    const silly = await run(s, c);
    assert.equal(silly.result.marksAwarded, 3.5, s.id);
    const conceptual = await run(s, c, { steps: clone(c.modelReply).map((st) => (st.mistakeType === 'silly' ? { ...st, mistakeType: 'conceptual' } : st)) });
    assert.equal(conceptual.result.marksAwarded, c.ifConceptual.marksAwarded, s.id);
    assert.deepEqual(typesOf(conceptual.result), c.ifConceptual.steps, s.id);
    assert.deepEqual(lostSubset(conceptual.result.marksLostByType, c.ifConceptual.marksLostByType), c.ifConceptual.marksLostByType, s.id);
  });

  test('GRADER-TYPE-1 — ' + s.id + ': GUARDS — R2 never fires where the shape is not "right answer + blank asked-for reason with no proof"', async () => {
    const q25 = CASES['WS-M-FULL-02-Q25i-FOLDED'];
    // (1) a FOLDED reason without the model's structured flag is never guessed at: it stays untyped (U1 asks the model to split it).
    const noFlag = await run(s, q25, { steps: clone(q25.modelReply).map(({ omittedAsk, ...rest }) => rest) });
    assert.deepEqual(typesOf(noFlag.result)[0], ['partial', 0.5, null], s.id + ': no flag, no type');
    assert.equal(noFlag.result.marksLostByType.untyped, 0.5, s.id);
    // (2) the flagged step is WRONG (the answer it justifies is not right) -> untouched
    const wrong = await run(s, q25, { steps: clone(q25.modelReply).map((st, i) => (i === 0 ? { ...st, status: 'incorrect', marksAwarded: 0, marksDeducted: 1 } : st)) });
    assert.equal(wrong.result.annotatedSteps[0].mistakeType, null, s.id + ': a wrong answer is not typed by this rule');
    // (3) the QUESTION does not ask for a reason -> a step the model happened to call "reason" is not typed (description alone is not enough)
    const noAsk = await run(s, CASES['T1-Q25i-PLACEHOLDER'], { text: 'Which is the highest power of 2 and the highest power of 3 that must divide the number of chocolates? Find the least number of chocolates. [4 marks]' });
    assert.ok(noAsk.result.annotatedSteps.every((st) => st.mistakeType !== 'conceptual'), s.id + ': the question asked for no reason');
    // (4) the reason is its OWN part, wholly blank, the other part answered -> an unattempted sub-part (rules.cjs), not a concept gap
    const ownPart = await run(s, q25, { text: '(i) State the highest power of 2 among 1 to 10. [2 marks]\n(ii) Give a reason for your answer to (i). [2 marks]', steps: [
      { part: '(i)', description: 'Highest power of 2', studentWork: '2³', status: 'correct', marksAvailable: 2, marksAwarded: 2, marksDeducted: 0, teacherAnnotation: '✓', mistakeType: null },
      { part: '(ii)', description: 'Reason for the highest power of 2', studentWork: '', status: 'unattempted', marksAvailable: 2, marksAwarded: 0, marksDeducted: 2, teacherAnnotation: '×', mistakeType: null },
    ] });
    assert.equal(ownPart.result.annotatedSteps[1].mistakeType, null, s.id + ': a reason that is a whole part stays unattempted');
    // (5) the model already typed it conceptual -> left alone (the server only fills the untyped / unattempted)
    const typed = await run(s, CASES['T1-Q25i-PLACEHOLDER'], { steps: clone(CASES['T1-Q25i-PLACEHOLDER'].modelReply).map((st) => (st.status === 'missing' ? { ...st, mistakeType: 'conceptual' } : st)) });
    assert.deepEqual(typesOf(typed.result)[1], ['missing', 0, 'conceptual'], s.id);
    // (6) a placeholder on a step the model did NOT report absent is the STUDENT'S text, never blank (U2a is read only on missing/unattempted)
    const student = await run(s, CASES['T1-Q25i-PLACEHOLDER'], { steps: clone(CASES['T1-Q25i-PLACEHOLDER'].modelReply).map((st) => (st.status === 'missing' ? { ...st, status: 'incorrect', teacherAnnotation: '× wrong' } : st)) });
    assert.equal(student.result.annotatedSteps[1].mistakeType, null, s.id + ': a written "Reason not given" on an incorrect step is not a blank reason');
  });

  test('GRADER-TYPE-1 — ' + s.id + ': the evidence quote in the QUESTION is not proof — the blank reason is a concept gap, not exam technique', async () => {
    const c = CASES['T1-TANGENT-CONTROL'];
    const r = await run(s, c, { steps: clone(c.modelReply).map((st) => (st.knowledgeEvidence ? { ...st, knowledgeEvidence: 'Give a reason' } : st)) });
    assert.deepEqual(typesOf(r.result)[1], ['missing', 0, 'conceptual'], s.id);
  });

  test('GRADER-TYPE-1 — ' + s.id + ': the rule reaches the prompt and the schema on this surface (ONE rulebook, ONE schema)', async () => {
    const call = (await run(s, CASES['LCM-DROP-NO-RULE'])).calls[0];
    assert.ok(call.prompt.includes('ALWAYS ITS OWN STEP') && call.prompt.includes('"omittedAsk": "reason"'), s.id + ': U1 reason rule');
    assert.ok(call.prompt.includes('13. A FACTORISATION WRITTEN CORRECTLY, THEN USED WITH A POWER OR FACTOR DROPPED'), s.id + ': M1 case law 13');
    assert.ok(call.prompt.includes('NEVER fold it into the answer step'), s.id);
    assert.ok(JSON.stringify(call.genConfig.responseSchema).includes('"omittedAsk":{"type":"STRING","nullable":true}'), s.id + ': schema offers omittedAsk (nullable)');
  });
}

test('GRADER-TYPE-1 — GRADER_TYPE_1_DISABLED=1 at process start selects the previous PROMPT wording (no case 13, the old (b))', () => {
  const rulesPath = path.join(__dirname, 'rules.cjs');
  const out = spawnSync(process.execPath, ['-e', `
    const R = require(${JSON.stringify(rulesPath)});
    process.stdout.write(JSON.stringify({ off: R.GRADER_TYPE_1_OFF, case13: R.ECF_CASE_LAW_PROMPT.includes('13. A FACTORISATION'),
      ownStep: R.UNATTEMPTED_AND_WITHDRAWN_PROMPT.includes('ALWAYS ITS OWN STEP'), oldB: R.UNATTEMPTED_AND_WITHDRAWN_PROMPT.includes('leave the step EXACTLY as you would otherwise report it') }));
  `], { encoding: 'utf8', env: { ...process.env, GRADER_TYPE_1_DISABLED: '1' } });
  assert.deepEqual(JSON.parse(out.stdout), { off: true, case13: false, ownStep: false, oldB: true });
  assert.equal(R.GRADER_TYPE_1_OFF, false);
  assert.ok(R.UNATTEMPTED_AND_WITHDRAWN_PROMPT.includes('ALWAYS ITS OWN STEP') && !R.UNATTEMPTED_AND_WITHDRAWN_PROMPT.includes('leave the step EXACTLY as you would otherwise report it (status as it is, mistakeType null) and leave "knowledgeEvidence" null — never guess why it is blank. A reason'), 'new wording is the default');
});

test('GRADER-TYPE-1 — the Q25(i) reconstruction in the quality fixture is the SAME reply shape the folded case builds on', () => {
  assert.equal(CASES['WS-M-FULL-02-Q25i-FOLDED'].questionText, Q25.questionText);
});
