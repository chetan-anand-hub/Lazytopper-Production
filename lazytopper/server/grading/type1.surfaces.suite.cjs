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

  // B1 (review BLOCK): the sub-part guards of omissionsInAttemptedWork also hold where the model gives NO part label. Each probe is a
  // CONTROL that must keep TRUNK behaviour: the blank step is typed nothing, exactly as with the rule switched off.
  const B1_PROBES = {
    'A unlabelled own-part reason (guard 4, unlabelled)': { text: '(i) State the highest power of 2 among 1 to 10. [2 marks]\n(ii) Give a reason for your answer to (i). [2 marks]', marks: 4, steps: [
      { description: 'Highest power of 2', studentWork: '2³', status: 'correct', marksAvailable: 2, marksAwarded: 2, marksDeducted: 0, teacherAnnotation: '✓', mistakeType: null },
      { description: 'Reason for the highest power of 2', studentWork: '', status: 'missing', marksAvailable: 2, marksAwarded: 0, marksDeducted: 2, teacherAnnotation: '×', mistakeType: null },
    ] },
    'B blank VERIFICATION step in a question that also says "Why"': { text: 'Find the sum of the first 10 terms of the AP 2, 5, 8, … Why is the sum positive? [4 marks]', marks: 4, steps: [
      { description: 'Sum of 10 terms', studentWork: 'S = 155', status: 'correct', marksAvailable: 3, marksAwarded: 3, marksDeducted: 0, teacherAnnotation: '✓', mistakeType: null },
      { description: 'Verification justifying the relationship', studentWork: '', status: 'missing', marksAvailable: 1, marksAwarded: 0, marksDeducted: 1, teacherAnnotation: '×', mistakeType: null },
    ] },
    'C unlabelled "(ii) Explain why …" part, wholly blank': { text: '(i) Find the zeroes of x² - 5x + 6. [2 marks]\n(ii) Explain why both zeroes are positive. [2 marks]', marks: 4, steps: [
      { description: 'Zeroes of the polynomial', studentWork: 'x = 2, 3', status: 'correct', marksAvailable: 2, marksAwarded: 2, marksDeducted: 0, teacherAnnotation: '✓', mistakeType: null },
      { description: 'Reason both zeroes are positive', studentWork: '', status: 'missing', marksAvailable: 2, marksAwarded: 0, marksDeducted: 2, teacherAnnotation: '×', mistakeType: null },
    ] },
    // N1 (re-review): the bare "a)" / "i." marker styles SUB_PART_MARKER detects split the text too
    'D bare "a) / b)" markers, (b) is a reason-only part': { text: 'a) Find the HCF of 12 and 18. [2 marks]\nb) Give a reason for your answer to a). [2 marks]', marks: 4, steps: [
      { description: 'HCF of 12 and 18', studentWork: '6', status: 'correct', marksAvailable: 2, marksAwarded: 2, marksDeducted: 0, teacherAnnotation: '✓', mistakeType: null },
      { description: 'Reason for the HCF', studentWork: '', status: 'missing', marksAvailable: 2, marksAwarded: 0, marksDeducted: 2, teacherAnnotation: '×', mistakeType: null, omittedAsk: 'reason' },
    ] },
    'E bare "i. / ii." markers, ii. is a reason-only part': { text: 'i. Find the HCF of 12 and 18. [2 marks]\nii. Give a reason for your answer to i. [2 marks]', marks: 4, steps: [
      { description: 'HCF of 12 and 18', studentWork: '6', status: 'correct', marksAvailable: 2, marksAwarded: 2, marksDeducted: 0, teacherAnnotation: '✓', mistakeType: null },
      { description: 'Reason for the HCF', studentWork: '', status: 'missing', marksAvailable: 2, marksAwarded: 0, marksDeducted: 2, teacherAnnotation: '×', mistakeType: null, omittedAsk: 'reason' },
    ] },
    // N2: one riding segment must not license a blank reason that may belong to another, reason-only segment
    'F one riding segment + one reason-only segment, the blank reason is the second': { text: '(i) Is 6^n composite? Find its factors, giving a reason. [2 marks]\n(ii) Give a reason why 6^n cannot end with 0. [2 marks]', marks: 4, steps: [
      { description: 'Factors of 6^n', studentWork: '2^n x 3^n', status: 'correct', marksAvailable: 2, marksAwarded: 2, marksDeducted: 0, teacherAnnotation: '✓', mistakeType: null },
      { description: 'Reason why 6^n cannot end with 0', studentWork: '', status: 'missing', marksAvailable: 2, marksAwarded: 0, marksDeducted: 2, teacherAnnotation: '×', mistakeType: null, omittedAsk: 'reason' },
    ] },
    'G Section E (iii) "Explain why" whole part blank': { text: '(i) Find the first term. [1 mark]\n(ii) Find the common difference. [1 mark]\n(iii) Explain why the sequence is increasing. [2 marks]', marks: 4, steps: [
      { description: 'First term', studentWork: 'a = 3', status: 'correct', marksAvailable: 1, marksAwarded: 1, marksDeducted: 0, teacherAnnotation: '✓', mistakeType: null },
      { description: 'Common difference', studentWork: 'd = 2', status: 'correct', marksAvailable: 1, marksAwarded: 1, marksDeducted: 0, teacherAnnotation: '✓', mistakeType: null },
      { description: 'Reason the sequence is increasing', studentWork: '', status: 'missing', marksAvailable: 2, marksAwarded: 0, marksDeducted: 2, teacherAnnotation: '×', mistakeType: null, omittedAsk: 'reason' },
    ] },
  };
  for (const [name, probe] of Object.entries(B1_PROBES)) {
    test('GRADER-TYPE-1 B1 — ' + s.id + ': control ' + name + ' keeps TRUNK behaviour (never a concept gap)', async () => {
      const base = CASES['T1-Q25i-PLACEHOLDER'];
      const go = (extra) => run(s, base, { text: probe.text, marks: probe.marks, steps: probe.steps, ...extra });
      const now = await go();
      const trunk = await withEnv('GRADER_TYPE_1_DISABLED', '1', () => go());
      assert.deepEqual(typesOf(now.result), typesOf(trunk.result), s.id + ': identical to the rule switched off');
      const lastStep = now.result.annotatedSteps[now.result.annotatedSteps.length - 1];
      assert.notEqual(lastStep.mistakeType, 'conceptual', s.id);
      assert.equal(lastStep.mistakeType, null, s.id + ': untyped, as on trunk');
      assert.equal(now.result.marksAwarded, trunk.result.marksAwarded, s.id + ': marks never move');
    });
  }

  // The CORRECT shapes the re-review kept: a right answer + a blank reason the question ASKED for -> conceptual (and trunk typed nothing).
  const POSITIVES = {
    '"Is 0.1010… rational? Justify your answer."': { text: 'Is 0.1010… rational? Justify your answer. [2 marks]', marks: 2 },
    '"Do you agree? Give reason."': { text: 'Do you agree? Give reason. [2 marks]', marks: 2 },
    '"State whether true or false and justify"': { text: 'State whether the statement is true or false and justify. [2 marks]', marks: 2 },
  };
  for (const [name, pos] of Object.entries(POSITIVES)) {
    test('GRADER-TYPE-1 N1/N2 — ' + s.id + ': positive ' + name + ' — a blank asked-for reason beside a right answer is a concept gap', async () => {
      const steps = [
        { description: 'Answer', studentWork: 'Yes', status: 'correct', marksAvailable: 1, marksAwarded: 1, marksDeducted: 0, teacherAnnotation: '✓', mistakeType: null },
        { description: 'Reason for the answer', studentWork: '', status: 'missing', marksAvailable: 1, marksAwarded: 0, marksDeducted: 1, teacherAnnotation: '×', mistakeType: null },
      ];
      const go = () => run(s, CASES['T1-Q25i-PLACEHOLDER'], { text: pos.text, marks: pos.marks, steps });
      const now = await go();
      const trunk = await withEnv('GRADER_TYPE_1_DISABLED', '1', go);
      assert.deepEqual(typesOf(now.result)[1], ['missing', 0, 'conceptual'], s.id);
      assert.equal(trunk.result.annotatedSteps[1].mistakeType, null, s.id + ': trunk typed nothing');
      assert.equal(now.result.marksAwarded, trunk.result.marksAwarded, s.id + ': marks never move');
    });
  }
  test('GRADER-TYPE-1 N1/N2 — ' + s.id + ': positive Section E "(iii) Which term is 40? Give reason." — the reason rides on an answer ask, a blank reason is a concept gap', async () => {
    const steps = [
      { description: 'First term', studentWork: 'a = 3', status: 'correct', marksAvailable: 1, marksAwarded: 1, marksDeducted: 0, teacherAnnotation: '✓', mistakeType: null },
      { description: 'Common difference', studentWork: 'd = 2', status: 'correct', marksAvailable: 1, marksAwarded: 1, marksDeducted: 0, teacherAnnotation: '✓', mistakeType: null },
      { description: 'Which term is 40', studentWork: 'n = 19.5, so none', status: 'correct', marksAvailable: 1, marksAwarded: 1, marksDeducted: 0, teacherAnnotation: '✓', mistakeType: null },
      { description: 'Reason that 40 is not a term', studentWork: '', status: 'missing', marksAvailable: 1, marksAwarded: 0, marksDeducted: 1, teacherAnnotation: '×', mistakeType: null },
    ];
    const text = '(i) Find the first term. [1 mark]\n(ii) Find the common difference. [1 mark]\n(iii) Which term is 40? Give reason. [2 marks]';
    const now = await run(s, CASES['T1-Q25i-PLACEHOLDER'], { text, marks: 4, steps });
    assert.deepEqual(typesOf(now.result)[3], ['missing', 0, 'conceptual'], s.id);
  });

  test('GRADER-TYPE-1 telemetry — ' + s.id + ': blank_reason_flag_only_photo counts a step typed conceptual by the omittedAsk flag ALONE on a photo-only question (and not on a real one)', async () => {
    const tel = require('../telemetry.cjs');
    const was = tel.increment;
    const seen = {};
    tel.increment = (name, n) => { seen[name] = (seen[name] || 0) + (n === undefined ? 1 : n); };
    try {
      const steps = [
        { description: 'Answer', studentWork: 'Yes', status: 'correct', marksAvailable: 1, marksAwarded: 1, marksDeducted: 0, teacherAnnotation: '✓', mistakeType: null },
        { description: 'The reason', studentWork: '', status: 'missing', marksAvailable: 1, marksAwarded: 0, marksDeducted: 1, teacherAnnotation: '×', mistakeType: null, omittedAsk: 'reason' },
      ];
      const photo = await run(s, CASES['T1-Q25i-PLACEHOLDER'], { text: 'Submitted question', marks: 2, steps });
      assert.deepEqual(typesOf(photo.result)[1], ['missing', 0, 'conceptual'], s.id + ': typed by the flag alone');
      assert.equal(seen['grading.untyped_loss.blank_reason_flag_only_photo'], 1, s.id + ': counted once: ' + JSON.stringify(seen));
      assert.equal(seen['grading.untyped_loss.blank_reason_to_conceptual'], 1, s.id);
      for (const k of Object.keys(seen)) delete seen[k];
      await run(s, CASES['T1-Q25i-PLACEHOLDER'], { text: 'Do you agree? Give reason. [2 marks]', marks: 2, steps });
      assert.equal(seen['grading.untyped_loss.blank_reason_to_conceptual'], 1, s.id + ': typed on a real question');
      assert.equal(seen['grading.untyped_loss.blank_reason_flag_only_photo'], undefined, s.id + ': a real question is not the photo-only path');
    } finally { tel.increment = was; }
  });

  test('GRADER-TYPE-1 — ' + s.id + ': the evidence quote in the QUESTION is not proof — the blank reason is a concept gap, not exam technique', async () => {
    const c = CASES['T1-TANGENT-CONTROL'];
    const r = await run(s, c, { steps: clone(c.modelReply).map((st) => (st.knowledgeEvidence ? { ...st, knowledgeEvidence: 'Give a reason' } : st)) });
    assert.deepEqual(typesOf(r.result)[1], ['missing', 0, 'conceptual'], s.id);
  });

  // T1-Q25-REASON-BLANK paid probe (22 Nov 2026): the model typed the blank reason `presentation` and quoted, as knowledgeEvidence, the
  // student's own part (ii) calculation "LCM = 2^3 x 3^2 x 5 x 7 = ... = 2520" — a LATER part, but the same RESULT, not the principle.
  // The three STORED replies (probes-2026-11-22, W shape: runs 2 and 3 typed presentation, run 1 typed conceptual) are replayed here.
  test('GRADER-TYPE-1 — ' + s.id + ': STORED probe replies — a blank reason whose "evidence" is a calculation repeating the result is a concept gap (runs 2, 3); the conceptual reply stays (run 1)', async () => {
    const fs = require('fs');
    const dir = path.join(__dirname, '..', 'eval', 'golden', 'runs', 't1-probes-2026-11-22');
    const probe = require('../eval/golden/probes/grader-type-1.json').probes.find((p) => p.probeId === 'T1-Q25-REASON-BLANK');
    for (const n of [1, 2, 3]) {
      const rec = fs.readFileSync(path.join(dir, 'run' + n + '.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).find((r) => r.jobKey === 'W.T1.T1-Q25-REASON-BLANK');
      const steps = JSON.parse(rec.calls[rec.calls.length - 1].text).results[0].annotatedSteps;
      if (n > 1) assert.equal(steps[1].mistakeType, 'presentation', 'run ' + n + ' is the failing stored reply: the model typed presentation');
      const r = await run(s, CASES['T1-Q25i-PLACEHOLDER'], { text: probe.question, marks: probe.marks, steps });
      assert.deepEqual(typesOf(r.result)[1], ['missing', 0, 'conceptual'], s.id + ' run ' + n);
      assert.equal(r.result.marksAwarded, 1.5, s.id + ' run ' + n + ': marks unchanged');
      assert.equal(r.result.marksLostByType.conceptual, 0.5, s.id + ' run ' + n);
      assert.equal(r.result.marksLostByType.presentation, 0, s.id + ' run ' + n);
      // the SAME reply under the kill switch reads as trunk: the model's presentation typing stands
      if (n > 1) {
        const off = await withEnv('GRADER_TYPE_1_DISABLED', '1', () => run(s, CASES['T1-Q25i-PLACEHOLDER'], { text: probe.question, marks: probe.marks, steps }));
        assert.equal(off.result.annotatedSteps[1].mistakeType, 'presentation', s.id + ' run ' + n + ': switch off = trunk');
      }
    }
  });

  // Review of 07a604d7: the evidence test is the reviewer's tighter rule (filler dropped, label excluded, any script, relations on 2+ sides).
  test('GRADER-TYPE-1 — ' + s.id + ': evidence for a blank asked reason — a result (any filler / unit wrapping) is a concept gap; a stated or applied principle stays presentation', async () => {
    const c = CASES['T1-TANGENT-CONTROL'];
    const withEv = (ev) => clone(c.modelReply).map((st, i, a) => {
      if (st.knowledgeEvidence) return { ...st, knowledgeEvidence: ev };
      return i === a.length - 1 ? { ...st, studentWork: ev } : st;
    });
    const LCM = '2^3 x 3^2 x 5 x 7 = 8 x 9 x 35 = 2520';
    const RESULTS = ['LCM = ' + LCM, 'Hence LCM = ' + LCM, 'So LCM = ' + LCM, 'LCM is 2^3 x 3^2 x 5 x 7 = 2520', 'Ans: LCM = ' + LCM,
      'Required number = ' + LCM, 'Therefore ∠OAB = 90° − 50° = 40°', 'Area = 22/7 x 7 x 7 = 154 cm²'];
    const PRINCIPLES = ['tangent is perpendicular to the radius', 'LCM = product of the highest powers of the primes = ' + LCM, 'AB + CD = BC + DA',
      'CD = CR + DR = 12 + 6', 'a^2 + b^2 = c^2', 'V = IR = 0.5 x 10 = 5 V', '1/v - 1/u = 1/f', 'OA ⊥ AT', 'AD/DB = AE/EC (BPT)',
      '2H2 + O2 → 2H2O', 'स्पर्श रेखा त्रिज्या पर लम्ब होती है', '∠OPT = 90° = ∠OQT'];
    for (const ev of RESULTS) {
      const r = await run(s, c, { steps: withEv(ev) });
      assert.equal(typesOf(r.result)[1][2], 'conceptual', s.id + ': a RESULT is not proof — ' + ev);
    }
    for (const ev of PRINCIPLES) {
      const r = await run(s, c, { steps: withEv(ev) });
      assert.equal(typesOf(r.result)[1][2], 'presentation', s.id + ': a principle is proof — ' + ev);
    }
  });

  test('GRADER-TYPE-1 — ' + s.id + ': the stricter evidence test is gated on the QUESTION asking for a reason (unasked = trunk); a "Justify" description is a reason step without the omittedAsk flag', async () => {
    const c = CASES['T1-TANGENT-CONTROL'];
    const calc = 'LCM = 2^3 x 3^2 x 5 x 7 = 8 x 9 x 35 = 2520';
    const mk = (mut) => clone(c.modelReply).map((st, i, a) => mut(st.knowledgeEvidence ? { ...st, knowledgeEvidence: calc } : (i === a.length - 1 ? { ...st, studentWork: calc } : st), i));
    const unasked = await run(s, c, { text: c.questionText.replace(/,?\s*giving a reason|\s*Give a reason\.?|\s*Give reason\.?/gi, ''), steps: mk((st) => st) });
    assert.ok(!/reason|justif/i.test(c.questionText.replace(/,?\s*giving a reason|\s*Give a reason\.?|\s*Give reason\.?/gi, '')), 'fixture question must really be unasked');
    assert.notEqual(typesOf(unasked.result)[1][2], 'conceptual', s.id + ': an unasked reason keeps trunk behaviour');
    const justify = await run(s, c, { steps: mk((st) => (st.knowledgeEvidence !== undefined && st.knowledgeEvidence !== null ? { ...st, omittedAsk: null, description: 'Justify the property used' } : st)) });
    assert.equal(typesOf(justify.result)[1][2], 'conceptual', s.id + ': Justify description, result-only evidence');
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

test('GRADER-TYPE-1 B2 — GRADER_TYPE_1_DISABLED=1 restores the TRUNK PROMPT BYTE-FOR-BYTE (the pinned sha c9c7d082…, not substrings) and drops omittedAsk from the request schema', () => {
  const TRUNK = 'c9c7d082996e62ca538d48ff795b3b0d58713dbbc6b0fb62e56dd4e60eb48860';
  const env = { ...process.env, GRADER_TYPE_1_DISABLED: '1' };
  delete env.NODE_TEST_CONTEXT; // a nested `node --test` inside a test run must report on its own stdout
  // routes/checkSolution.test.cjs §7.1 is the pinned-prompt acceptance test; under the switch it pins the TRUNK sha.
  const out = spawnSync(process.execPath, ['--test', '--test-name-pattern=§7.1 ★★ ACCEPTANCE', path.join(__dirname, '..', 'routes', 'checkSolution.test.cjs')], { encoding: 'utf8', env });
  assert.equal(out.status, 0, out.stdout.slice(-1500));
  assert.match(out.stdout, /# pass [1-9]/, 'the pinned-prompt test actually RAN (not vacuously selected)');
  assert.match(out.stdout, /# fail 0/);
  const src = require('fs').readFileSync(path.join(__dirname, '..', 'routes', 'checkSolution.test.cjs'), 'utf8');
  assert.ok(src.includes(TRUNK), 'the trunk sha is pinned in the acceptance test');
  const sch = spawnSync(process.execPath, ['-e', `process.stdout.write(JSON.stringify(require(${JSON.stringify(path.join(__dirname, 'schema.cjs'))}).GRADING_RESPONSE_SCHEMA).includes('omittedAsk') ? 'HAS' : 'NONE')`], { encoding: 'utf8', env });
  assert.equal(sch.stdout, 'NONE', 'the request schema is the trunk schema under the switch');
  assert.ok(JSON.stringify(require('./schema.cjs').GRADING_RESPONSE_SCHEMA).includes('omittedAsk'), 'default: omittedAsk offered');
});

test('GRADER-TYPE-1 — the Q25(i) reconstruction in the quality fixture is the SAME reply shape the folded case builds on', () => {
  assert.equal(CASES['WS-M-FULL-02-Q25i-FOLDED'].questionText, Q25.questionText);
});
