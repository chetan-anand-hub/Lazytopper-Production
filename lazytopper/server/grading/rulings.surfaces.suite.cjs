'use strict';
// server/grading/rulings.surfaces.suite.cjs — A17 OWNER RULINGS 1-5 (GRADING-JOBS-1 J0), proven on
// EVERY grading surface (the spec's product-wide rule).
//
// THE SURFACES. On the server every grading surface is one of two handlers; what differs is the
// REQUEST each client sends. Each surface below is driven with ITS OWN live request shape — the
// golden planner's job for that call site (eval/golden/shapes/callsites.json, P15: the fields each
// client sends, read from the client code), through the REAL handlers, with only the model stubbed:
//   /api/check-solution  : C&I single (+ the QR hand-off and the Tutor overlay, identical body),
//                          HPQ / SolutionChecker, the free check (single)
//   /api/grade-worksheet : C&I paper (ONE document), Quick Practice batch (typed + pick + photos),
//                          Chapter Test, Full Mock, Worksheets (bank fields + ONE PDF), free-check paper
// The free check sends the SAME body as C&I (only headers differ, and the handler never reads them),
// so its rows run the C&I bodies; what it charges is decided before the handler (services/freeCheck.cjs).
//
// Each surface's TARGET is its first subjective question (the request's own question; its text is
// replaced only where a ruling needs a particular kind of question — a quantity for units). The
// stubbed model answers every question; the target carries the scenario under test, every other
// question a plain correct grade.
//
// Run: node --test server/grading/rulings.surfaces.suite.cjs. Named *.suite.cjs, NOT *.test.cjs: it is
// a part of core.test.cjs (which requires it), so it runs in CI under test:server:grading-core — the
// matrix-wiring guard (a15) enumerates *.test.cjs files that need their own package.json script, and
// package.json is outside the J0 lane.

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const { createCheckSolutionRoute } = require('../routes/checkSolution.cjs');
const { chargeableCountOf } = require('./charge.cjs');
const R = require('./rules.cjs');
const ledgerLib = require('../services/usageLedger.cjs');
const { buildPlan } = require('../eval/golden/lib/planner.cjs');

const PLAN = Object.fromEntries(buildPlan({ includeDetect: true }).map((j) => [j.jobKey, j]));
// call site id → planner job (shapes/callsites.json `planJob`) — the free check reuses C&I's bodies.
const SURFACES = [
  { id: 'ci-single', job: 'S.CI.GS-M04-a' },
  { id: 'hpq-solution-checker', job: 'S.HPQ.GS-M12-a' },
  { id: 'free-check-single', job: 'S.CI.GS-M04-a' },
  { id: 'ci-multi', job: 'W.CIM.CMM' },
  { id: 'quick-practice-batch', job: 'W.QP.QPM' },
  { id: 'chapter-test', job: 'W.CT.CT1' },
  { id: 'full-mock', job: 'W.FM.FM1' },
  { id: 'worksheets', job: 'W.WS.WS1' },
  { id: 'free-check-paper', job: 'W.CIM.CMM' },
];
const VOL_Q = 'A solid toy is a hemisphere of radius 3.5 cm surmounted by a cone of height 12 cm. Find the volume of the toy.';
// A-17 J1b METER-PRICE-1: the model production GRADES with (modelConfig DEFAULT_GRADING_MODEL), priced
// since J1b. Before J1b this suite metered a gemini-2.5-flash call, so it could not see that the real
// grading model recorded 0. The ledger clock is fixed (METER_NOW) so the price is the 2026 one on any run date.
const CALL_USAGE = { model: 'gemini-3.8-flash', promptTokenCount: 1000, candidatesTokenCount: 200, thoughtsTokenCount: 800 };
const METER_NOW = Date.UTC(2026, 9, 7, 6, 0, 0);
const CALL_COST = ledgerLib.buildLedgerIncrement(CALL_USAGE, { env: {}, nowMs: METER_NOW }).increment.costMicroInr;
// (1000 * $0.75 + 1000 * $3.75) / 1M * 88 = Rs 0.396. MUTATION J1b-M1 (no 3.8 row) -> 0 -> RED here.
const CALL_COST_REAL = 396000;

function lenientExtract(text) { try { return JSON.parse(text); } catch { return null; } }

/** The surface's request (a deep copy) and its target question. */
function surfaceRequest(s, mutateTarget) {
  const job = PLAN[s.job];
  assert.ok(job, 'planner job ' + s.job + ' for ' + s.id);
  const req = JSON.parse(JSON.stringify(job.request));
  const single = job.handler === 'handleCheckSolution';
  const subjective = (q) => !(q.objective === true) && !/^a$/i.test(String(q.section || '')) && !(Array.isArray(q.options) && q.options.length);
  const target = single ? null : (req.questions || []).find(subjective);
  if (!single) assert.ok(target, s.id + ': no subjective question in the request');
  const view = single
    ? { get marks() { return Number(req.marks) || 1; }, set marks(m) { req.marks = m; }, set questionText(t) { req.question = t; }, set textAnswer(t) { if ('textAnswer' in req) req.textAnswer = t; }, set finalAnswer(v) { if ('finalAnswer' in req) req.finalAnswer = v; }, qNumber: 1 }
    : target;
  if (mutateTarget) mutateTarget(view, req);
  return { req, single, targetQ: single ? 1 : target.qNumber, targetMarks: single ? Number(req.marks) || 1 : Number(target.marks) || 1, handler: job.handler };
}

/** One request through the real handler, inside a bound student request (for the meter). */
async function drive(s, { mutateTarget, targetSteps, otherSteps, acceptsV2 = false, uid = 'stu-a17', targetExtra = null } = {}) {
  const { req, single, targetQ, targetMarks, handler } = surfaceRequest(s, mutateTarget);
  if (acceptsV2) req.acceptsV2 = true;
  const writes = [];
  const ledger = ledgerLib.createUsageLedger({
    resolveFirestore: () => ({
      db: { collection: () => ({ doc: () => ({ collection: () => ({ doc: () => ({ set: (data) => { writes.push(data); return Promise.resolve(); } }) }) }) }) },
      FieldValue: { increment: (n) => n },
    }),
    telemetry: { increment() {} },
    env: {},
    now: () => METER_NOW,
  });
  const calls = [];
  const resultFor = (n, marks) => {
    const steps = Number(n) === Number(targetQ) ? targetSteps(marks) : (otherSteps ? otherSteps(marks) : [{ description: 'Answer', studentWork: 'worked answer', status: 'correct', marksAwarded: marks, marksDeducted: 0, teacherAnnotation: '✓ Correct.', mistakeType: null }]);
    // GRADER-CREDIT-1: a test may set the target's own verdict fields (finalAnswerCorrect, studentFinalAnswer, teacherNote).
    const extra = Number(n) === Number(targetQ) && targetExtra ? targetExtra : {};
    return { qNumber: Number(n), couldNotRead: false, addressesQuestion: 'yes', annotatedSteps: steps, finalAnswerCorrect: true, teacherNote: 'Note.', ...extra };
  };
  const marksOf = (n) => (single ? targetMarks : Number((req.questions.find((q) => Number(q.qNumber) === Number(n)) || {}).marks) || 1);
  let captured = null;
  const route = createCheckSolutionRoute({
    sendJson: (_res, status, body) => { captured = { status, body }; },
    readJson: async (r) => r,
    callGemini: async (model, contents, genConfig) => {
      calls.push({ model, genConfig, prompt: contents[0].parts.filter((p) => typeof p.text === 'string').map((p) => p.text).join('') });
      ledger.recordUsage(CALL_USAGE); // what geminiClient does after every successful call
      const nums = single ? [1] : req.questions.map((q) => q.qNumber);
      return { text: JSON.stringify({ results: nums.map((n) => resultFor(n, marksOf(n))), summary: 'S.' }), raw: {} };
    },
    GEMINI_MODEL: 'test-model',
    ACTIVE_PROVIDER: 'test',
    isStubMode: () => false,
    extractJsonObjectFromText: lenientExtract,
    buildGeminiImagePart: ({ mimeType, base64 }) => ({ inlineData: { mimeType, data: base64 } }),
    validateMentorImagePayload: () => ({ ok: true }),
    makeFenceNonce: () => 'testnonce',
    telemetry: { increment() {} },
  });
  const res = { setHeader() {} };
  const reqPath = single ? '/api/check-solution' : '/api/grade-worksheet';
  await ledgerLib.runWithRequestContext(async () => {
    ledgerLib.bindRequestUid(uid, reqPath);
    await route[handler](req, res);
  });
  await new Promise((r) => setImmediate(r));
  const body = captured && captured.body;
  const result = single ? body : body.results.find((r) => Number(r.qNumber) === Number(targetQ));
  // the METER writes (costMicroInr) vs the REAL-spend writes (J0-FIXUP: providerSpendMicroInr, never read by fair use)
  const meterWrites = writes.filter((w) => 'costMicroInr' in w);
  const spendWritten = writes.reduce((a, w) => a + (Number(w[ledgerLib.LEDGER_SPEND_FIELD]) || 0), 0);
  const costWritten = meterWrites.reduce((a, w) => a + (Number(w.costMicroInr) || 0), 0);
  return { body, result, res, calls, writes: meterWrites, spendWritten, costWritten, single, targetQ, targetMarks, total: single ? 1 : req.questions.length };
}

// GRADER-BALANCE-1: the balancing suite (balancing.surfaces.suite.cjs) drives the SAME surfaces the same way.
module.exports = { SURFACES, drive };

// A bank question's stored final answer is compared on its own (verify.cjs compareFinalAnswer) and can cap
// the mark independently of units; the unit tests take it out of play (the field stays, null).
const noKey = (q) => { if (Object.getOwnPropertyDescriptor(q, 'finalAnswer') || 'finalAnswer' in q) q.finalAnswer = null; };

const unitSteps = (marks) => [
  { description: 'Formula and substitution', studentWork: 'V = (2/3)πr³ + (1/3)πr²h', status: 'correct', marksAwarded: marks - 1, marksDeducted: 0, teacherAnnotation: '✓ Correct.', mistakeType: null },
  { description: 'Final answer', studentWork: '= 243.83', status: 'partial', marksAvailable: 1, marksAwarded: 0.5, marksDeducted: 0.5, mistakeType: 'presentation',
    teacherAnnotation: '½ Correct value, but missing cubic units (cm³).', correctedWorking: '243.83 cm³' },
];
const dontKnowSteps = (marks) => [
  // the model's typical wrong report of a "Don't know": an incorrect, TYPED step
  { description: 'Answer', studentWork: "Don't know", status: 'incorrect', marksAwarded: 0, marksDeducted: marks, teacherAnnotation: '× No method shown.', mistakeType: 'conceptual' },
];
// A17 ruling 3 AS CHANGED BY THE OWNER 2026-10-06 (the MEDIUM): fixtures in each medium. A typed
// surface sends the same words as its textAnswer (setText), so the server judges the student's own text.
const HINGLISH = 'Carbon ke paas 4 valence electrons hain, isliye woh electrons share karta hai aur covalent bonds banata hai.';
const ENGLISH_TECH = 'Carbon has 4 valence electrons, so it shares electrons and forms covalent bonds (catenation, tetravalency).';
// J0-FIXUP (audit FU-A17-MEDIUM-AB-TOKEN): ENGLISH Maths/Science full of tokens that collide with Roman
// Hindi — segment AB, the product ab, KE, Se, hue, teen — is still English.
const ENGLISH_NOTATION = 'In triangle ABC, AB = BC, so the angles opposite AB and BC are equal. Let ab be the product of the two sides: ab = 12, so ab is 12 cm². The hue of red light is seen by a teen; KE = ½mv² and Se is selenium. Hence ab = 12.';
const DEVANAGARI_HINDI = 'कार्बन के पास 4 valence electrons होते हैं, इसलिए यह electrons share करके covalent bond बनाता है।';
const setText = (t) => (q) => { q.textAnswer = t; noKey(q); };
const workSteps = (text, last) => (marks) => [
  { description: 'Reason', studentWork: text, status: 'correct', marksAwarded: marks - 1, marksDeducted: 0, teacherAnnotation: '✓ Correct.', mistakeType: null },
  { description: 'Conclusion', studentWork: text, ...last },
];
// the model charged the medium, and too much (a whole mark): held to exactly ½
const hinglishCharged = workSteps(HINGLISH, { status: 'incorrect', marksAvailable: 1, marksAwarded: 0, marksDeducted: 1, mistakeType: 'presentation', teacherAnnotation: '× Correct content, but written in Hinglish; write in proper English.' });
// the model charged nothing: the server applies the ½
const hinglishUncharged = workSteps(HINGLISH, { status: 'correct', marksAvailable: 1, marksAwarded: 1, marksDeducted: 0, mistakeType: null, teacherAnnotation: '✓ Correct.' });
// false positives the model might commit: English with technical terms, Hindi in Devanagari
const englishCharged = workSteps(ENGLISH_TECH, { status: 'partial', marksAvailable: 1, marksAwarded: 0.5, marksDeducted: 0.5, mistakeType: 'presentation', teacherAnnotation: '½ Correct, but informal English with grammar errors.' });
const notationCharged = workSteps(ENGLISH_NOTATION, { status: 'partial', marksAvailable: 1, marksAwarded: 0.5, marksDeducted: 0.5, mistakeType: 'presentation', teacherAnnotation: '½ Correct, but written in Hinglish.' });
const notationUncharged = workSteps(ENGLISH_NOTATION, { status: 'correct', marksAvailable: 1, marksAwarded: 1, marksDeducted: 0, mistakeType: null, teacherAnnotation: '✓ Correct.' });
const devanagariCharged = workSteps(DEVANAGARI_HINDI, { status: 'partial', marksAvailable: 1, marksAwarded: 0.5, marksDeducted: 0.5, mistakeType: 'presentation', teacherAnnotation: '½ Correct, but written in Hindi instead of English.' });
const termSteps = (marks) => [
  { description: 'Working', studentWork: 'Food goes down the food pipe by peristalsis', status: 'partial', marksAvailable: marks, marksAwarded: marks - 0.5, marksDeducted: 0.5, mistakeType: 'presentation',
    teacherAnnotation: '½ Correct idea, but the exact technical term is oesophagus, not food pipe.' },
];
// a Hinglish answer that ALSO omits its unit: the two ½ are independent (controller C-D17)
const HINGLISH_VOL = 'V = (2/3)πr³ + (1/3)πr²h, isliye volume yeh hota hai aur answer ye hai';
const hinglishUnitSteps = (marks) => { const st = unitSteps(marks); st[0] = { ...st[0], studentWork: HINGLISH_VOL }; return st; };

// FIXUP-2 · owner ruling A: ONE stray Roman-script Hindi word is NOT Hinglish; a clause or more is.
const STRAY = {
  'Science, one stray word': 'Carbon has 4 valence electrons, so it shares electrons and forms covalent bonds. Sahi.',
  'Maths, one stray word': 'x² − 2x − 8 = 0 factorises as (x − 4)(x + 2) = 0, matlab the roots are x = 4 and x = −2.',
  // three DIFFERENT strays, one per sentence: a bare count (3 hits, 2+ distinct) would call this Hinglish
  'one word in several sentences': 'The answer is sahi. The working is bahut clear. The final value is ek hundred.',
  'one word repeated': 'Yeh: the current is 2 A. Yeh: the resistance is 5 Ω. Yeh: the voltage is 10 V.',
};
const HINDI_CLAUSE = 'Ohm law ke hisaab se current resistance se inversely proportional hota hai, so I = V/R.';
const strayCharged = (text) => workSteps(text, { status: 'partial', marksAvailable: 1, marksAwarded: 0.5, marksDeducted: 0.5, mistakeType: 'presentation', teacherAnnotation: '½ Correct, but written in Hinglish.' });
const strayUncharged = (text) => workSteps(text, { status: 'correct', marksAvailable: 1, marksAwarded: 1, marksDeducted: 0, mistakeType: null, teacherAnnotation: '✓ Correct.' });
// FIXUP-2 · owner ruling B: all exam-technique (presentation) deductions of one answer ≤ 1 (½ on a 1-mark answer), never below 0.
const oneMarkUnit = () => [{ description: 'Final answer', studentWork: HINGLISH_VOL + ' = 243.83', status: 'partial', marksAvailable: 1, marksAwarded: 0.5, marksDeducted: 0.5, mistakeType: 'presentation',
  teacherAnnotation: '½ Correct value, but the unit cm³ is missing.', correctedWorking: '243.83 cm³' }];
const floorSteps = (marks) => [
  { description: 'Method', studentWork: HINGLISH_VOL, status: 'incorrect', marksAvailable: marks - 1, marksAwarded: 0, marksDeducted: marks - 1, mistakeType: 'conceptual', teacherAnnotation: '× Wrong formula for the cone.' },
  { description: 'Final answer', studentWork: '= 243.83', status: 'partial', marksAvailable: 1, marksAwarded: 0.5, marksDeducted: 0.5, mistakeType: 'presentation', teacherAnnotation: '½ Correct value, but the unit cm³ is missing.', correctedWorking: '243.83 cm³' },
];
const threeEtSteps = (marks) => [
  { description: 'Working', studentWork: HINGLISH_VOL, status: 'correct', marksAvailable: marks - 2, marksAwarded: marks - 2, marksDeducted: 0, mistakeType: null, teacherAnnotation: '✓ Correct.' },
  { description: 'Conclusion', studentWork: 'isliye volume yeh hai', status: 'partial', marksAvailable: 1, marksAwarded: 0.5, marksDeducted: 0.5, mistakeType: 'presentation', teacherAnnotation: '½ The concluding statement is missing.' },
  { description: 'Final answer', studentWork: '= 243.83', status: 'partial', marksAvailable: 1, marksAwarded: 0.5, marksDeducted: 0.5, mistakeType: 'presentation', teacherAnnotation: '½ Correct value, but the unit cm³ is missing.', correctedWorking: '243.83 cm³' },
];
const etLost = (out) => out.annotatedSteps.filter((st) => st.mistakeType === 'presentation').reduce((a, st) => a + st.marksDeducted, 0);

for (const s of SURFACES) {
  test('A17 ruling 1 (units) — ' + s.id + ': a missing unit on the final answer costs EXACTLY ½, typed presentation, with the one fixed comment', async () => {
    for (const acceptsV2 of [false, true]) {
      const r = await drive(s, { mutateTarget: (q) => { q.questionText = VOL_Q; noKey(q); }, targetSteps: unitSteps, acceptsV2 });
      const out = r.result;
      assert.equal(out.marksAwarded, r.targetMarks - 0.5, s.id + ' v2=' + acceptsV2);
      const unitStep = out.annotatedSteps.find((st) => /write the unit/.test(st.teacherAnnotation));
      assert.ok(unitStep, s.id + ': the unit step');
      assert.equal(unitStep.teacherAnnotation, R.unitComment('cm³'));
      assert.equal(unitStep.teacherAnnotation, '−½: write the unit (cm³) with your final answer.');
      assert.deepEqual([unitStep.marksDeducted, unitStep.mistakeType], [0.5, 'presentation']);
      assert.equal(out.mistakeSummary.presentation, 1);
      if (acceptsV2) assert.equal(out.marksLostByType.presentation, 0.5);
    }
    // the rule is in the prompt this surface sends — Maths AND Science
    const p = (await drive(s, { targetSteps: unitSteps })).calls[0].prompt;
    assert.ok(p.includes('in MATHS AND IN SCIENCE ALIKE') && p.includes('NEVER for a PURE NUMBER'), s.id + ': the units rule reaches the prompt');
  });

  test('A17 ruling 1 (units) — ' + s.id + ': NEVER on a pure number (a probability): the deduction is given back', async () => {
    const r = await drive(s, { mutateTarget: (q) => { q.questionText = 'A die is thrown once. Find the probability of getting a prime number.'; noKey(q); }, targetSteps: unitSteps });
    assert.equal(r.result.marksAwarded, r.targetMarks, s.id);
    assert.ok(r.result.annotatedSteps.every((st) => st.mistakeType === null), s.id + ': no type left');
  });

  test('A17 ruling 2 ("Don\'t know") — ' + s.id + ': a SUBJECTIVE "Don\'t know" is NOT ATTEMPTED — 0, no mistake type, NOT charged, NOT metered', async () => {
    for (const acceptsV2 of [false, true]) {
      const r = await drive(s, { mutateTarget: (q) => { q.textAnswer = "Don't know"; }, targetSteps: dontKnowSteps, acceptsV2 });
      const out = r.result;
      assert.equal(out.marksAwarded, 0, s.id);
      assert.equal(out.teacherNote, R.NOT_ATTEMPTED_NOTE, s.id + ': the not-attempted note');
      assert.ok(out.annotatedSteps.every((st) => st.mistakeType === null), s.id + ': never a mistake type');
      assert.deepEqual(out.mistakeSummary, { conceptual: 0, calculation: 0, silly: 0, presentation: 0, departure: 0 }, s.id + ': no MI entry implied');
      if (acceptsV2) {
        assert.equal(out.annotatedSteps[0].status, 'unattempted');
        assert.equal(out.marksLostByType.unattempted, r.targetMarks);
        if (!r.single) assert.equal(out.notGraded, null);
      }
      // trial / paper-pass charge = chargeableCountOf(res) (fairUse.cjs servedCommit): the DK is never in it
      assert.equal(chargeableCountOf(r.res), r.total - 1, s.id + ': charged only the graded questions');
    }
    // the premium meter: a request whose every question is "Don't know" writes NOTHING
    const all = await drive(s, { mutateTarget: (q) => { q.textAnswer = "Don't know"; }, targetSteps: dontKnowSteps, otherSteps: dontKnowSteps });
    assert.equal(chargeableCountOf(all.res), 0, s.id + ': nothing charged');
    assert.equal(all.writes.length, 0, s.id + ': nothing metered');
    // J0-FIXUP (FU-A17-METER-SPEND-VISIBILITY): the REAL provider spend is still recorded, apart from the meter
    // (J1b: at gemini-3.8-flash's real price — before J1b this was 0 on the production model).
    assert.equal(CALL_COST, CALL_COST_REAL, 'J1b: a gemini-3.8-flash grading call costs its real price');
    assert.ok(all.spendWritten > 0, s.id + ': real spend is not 0');
    assert.equal(all.spendWritten, CALL_COST * all.calls.length, s.id + ': real spend recorded in providerSpendMicroInr');
  });

  test('A17 ruling 3 (medium) — ' + s.id + ': a HINGLISH answer keeps its content marks and loses EXACTLY ½ once, typed presentation, with the one fixed comment — whether or not the model charged it', async () => {
    for (const [label, steps] of [['model over-charged', hinglishCharged], ['model charged nothing', hinglishUncharged]]) {
      for (const acceptsV2 of [false, true]) {
        const r = await drive(s, { mutateTarget: setText(HINGLISH + '\n' + HINGLISH), targetSteps: steps, acceptsV2 });
        const out = r.result;
        assert.equal(out.marksAwarded, r.targetMarks - 0.5, s.id + ' ' + label);
        const m = out.annotatedSteps.filter((st) => st.teacherAnnotation === R.MEDIUM_COMMENT);
        assert.equal(m.length, 1, s.id + ' ' + label + ': one medium step');
        assert.equal(R.MEDIUM_COMMENT, 'Write in English (or Hindi in Devanagari): board examiners expect one medium.');
        assert.deepEqual([m[0].marksDeducted, m[0].mistakeType, m[0].status], [0.5, 'presentation', 'partial'], s.id + ' ' + label);
        // J0-FIXUP (FU-A17-MEDIUM-STEP-STATUS): the content is right — no step is shown "incorrect"
        assert.ok(out.annotatedSteps.every((st) => st.status !== 'incorrect'), s.id + ' ' + label + ': no content step marked incorrect');
        if (acceptsV2) assert.equal(out.marksLostByType.presentation, 0.5);
      }
    }
    const p = (await drive(s, { targetSteps: hinglishCharged })).calls[0].prompt;
    assert.ok(p.includes('MEDIUM OF THE ANSWER') && p.includes(R.MEDIUM_COMMENT) && p.includes('TERMINOLOGY STILL COUNTS'), s.id + ': the medium rule reaches the prompt');
    assert.ok(!p.includes('NCERT-standard language') && !p.includes('LANGUAGE IS NEVER MARKED'), s.id + ': the superseded wording is gone');
  });

  test('A17 ruling 3 (medium) — ' + s.id + ': FALSE-POSITIVE GUARD — English with technical terms and Hindi in Devanagari never lose the ½ (a model deduction for language is given back)', async () => {
    for (const [label, text, steps] of [['English + technical terms', ENGLISH_TECH, englishCharged], ['Hindi in Devanagari', DEVANAGARI_HINDI, devanagariCharged],
      ['English geometry/physics notation (AB, ab, KE, Se, hue, teen) — model charged', ENGLISH_NOTATION, notationCharged], ['the same — model charged nothing', ENGLISH_NOTATION, notationUncharged]]) {
      const r = await drive(s, { mutateTarget: setText(text + '\n' + text), targetSteps: steps });
      assert.equal(r.result.marksAwarded, r.targetMarks, s.id + ' ' + label);
      assert.ok(!r.result.annotatedSteps.some((st) => st.teacherAnnotation === R.MEDIUM_COMMENT), s.id + ' ' + label + ': no medium comment');
      assert.ok(r.result.annotatedSteps.every((st) => st.mistakeType === null), s.id + ' ' + label + ': no type');
    }
  });

  test('A17 ruling 3 (medium) — ' + s.id + ': the medium ½ and the units ½ are independent; a TERMINOLOGY deduction stands', async () => {
    const r = await drive(s, { mutateTarget: (q) => { q.questionText = VOL_Q; noKey(q); q.textAnswer = HINGLISH_VOL + '\n= 243.83'; }, targetSteps: hinglishUnitSteps });
    assert.equal(r.result.marksAwarded, r.targetMarks - 1, s.id + ': ½ for the medium + ½ for the unit');
    assert.ok(r.result.annotatedSteps.some((st) => st.teacherAnnotation === R.MEDIUM_COMMENT));
    assert.ok(r.result.annotatedSteps.some((st) => st.teacherAnnotation === R.unitComment('cm³')));
    const t = await drive(s, { targetSteps: termSteps });
    assert.equal(t.result.marksAwarded, t.targetMarks - 0.5, s.id + ': the exact CBSE term is still marked (CLAUDE.md §13)');
  });

  test('FIXUP-2 ruling A (medium) — ' + s.id + ': ONE stray Roman-script Hindi word is NOT Hinglish (Science, Maths, several sentences, repeated); a Roman-Hindi CLAUSE is', async () => {
    for (const [label, text] of Object.entries(STRAY)) {
      for (const steps of [strayCharged(text), strayUncharged(text)]) {
        const r = await drive(s, { mutateTarget: setText(text), targetSteps: steps });
        assert.equal(r.result.marksAwarded, r.targetMarks, s.id + ' ' + label + ': no ½');
        assert.ok(!r.result.annotatedSteps.some((st) => st.teacherAnnotation === R.MEDIUM_COMMENT), s.id + ' ' + label);
      }
    }
    const c = await drive(s, { mutateTarget: setText(HINDI_CLAUSE), targetSteps: strayUncharged(HINDI_CLAUSE) });
    assert.equal(c.result.marksAwarded, c.targetMarks - 0.5, s.id + ': a Roman-Hindi clause costs ½');
  });

  test('FIXUP-2 ruling B (exam-technique cap) — ' + s.id + ': units ½ + medium ½ stack to −1; capped at ½ on a 1-mark answer; never below 0; every presentation deduction counts toward the cap', async () => {
    const vol = (q) => { q.questionText = VOL_Q; noKey(q); q.textAnswer = HINGLISH_VOL + '\n= 243.83'; };
    // multi-mark: both apply → −1 (the existing independence test, re-asserted against the cap)
    const both = await drive(s, { mutateTarget: vol, targetSteps: hinglishUnitSteps });
    assert.equal(both.result.marksAwarded, both.targetMarks - 1, s.id + ': −1');
    assert.equal(etLost(both.result), 1);
    // a 1-mark answer with both → −½ only
    const one = await drive(s, { mutateTarget: (q) => { vol(q); q.marks = 1; }, targetSteps: oneMarkUnit });
    assert.equal(one.targetMarks, 1);
    assert.equal(one.result.marksAwarded, 0.5, s.id + ': ½ on a 1-mark answer');
    assert.ok(one.result.annotatedSteps[0].teacherAnnotation.startsWith(R.unitComment('cm³')) && one.result.annotatedSteps[0].teacherAnnotation.includes(R.EXAM_TECHNIQUE_CAP_ANNOTATION), s.id + ': the unit comment stays; the cap is said');
    // content 0.5 and both → floor 0, never below
    const fl = await drive(s, { mutateTarget: (q) => { vol(q); q.marks = 3; }, targetSteps: floorSteps });
    assert.equal(fl.result.marksAwarded, 0, s.id + ': floor 0');
    assert.ok(fl.result.annotatedSteps.every((st) => st.marksAwarded >= 0));
    // a missing conclusion + the unit + the medium = 1½ of exam technique → capped at 1
    const three = await drive(s, { mutateTarget: (q) => { vol(q); q.marks = 4; }, targetSteps: threeEtSteps });
    assert.equal(three.result.marksAwarded, 3, s.id + ': 4 − 1 (capped)');
    assert.equal(etLost(three.result), 1);
  });

  test('A17 ruling 4 (immaterial miscopy) — ' + s.id + ': the "silly" definition itself carries the immaterial-miscopy exception in this surface\'s prompt', async () => {
    const p = (await drive(s, { targetSteps: unitSteps })).calls[0].prompt;
    const silly = p.slice(p.indexOf('"silly" = COPIED WRONGLY'), p.indexOf('"calculation" = PERFORMED WRONGLY'));
    assert.ok(silly.includes('IMMATERIAL') && silly.includes('NOT silly and NOT a mistake at all'), s.id + ': the definition agrees with case law 5');
  });

  test('A17 ruling 5 (premium meter) — ' + s.id + ': each call is metered by the CHARGEABLE share of the questions it graded', async () => {
    // all graded: every call metered in full
    const full = await drive(s, { targetSteps: (m) => [{ description: 'Answer', studentWork: 'right', status: 'correct', marksAwarded: m, marksDeducted: 0, teacherAnnotation: '✓', mistakeType: null }] });
    assert.equal(full.writes.length, full.calls.length, s.id + ': one write per call');
    assert.equal(CALL_COST, CALL_COST_REAL, 'J1b: the meter is fed the real gemini-3.8-flash price');
    assert.equal(full.costWritten, CALL_COST * full.calls.length, s.id + ': full cost');
    // the target "Don't know": its call is metered at (graded questions in that call) / (questions in that call)
    const dk = await drive(s, { mutateTarget: (q) => { q.textAnswer = "Don't know"; }, targetSteps: dontKnowSteps });
    let expected = 0;
    for (const c of dk.calls) {
      const ids = String(c.genConfig.chunkKey || '').split('+').filter(Boolean);
      const n = ids.length || 1;
      const targetIn = dk.single || ids.some((id) => Number(id.slice(1)) === dk.body.results.findIndex((x) => Number(x.qNumber) === Number(dk.targetQ)));
      expected += Math.round(CALL_COST * ((targetIn ? n - 1 : n) / n));
    }
    assert.equal(dk.costWritten, expected, s.id + ': the not-attempted share is never metered');
    assert.ok(dk.costWritten < full.costWritten, s.id + ': strictly less than a fully graded request');
  });
}

test('A17 ruling 5 — a chunk RETRY and a scheme-cache GENERATION follow the same rule (0 when their questions are not graded)', async () => {
  const writes = [];
  const ledger = ledgerLib.createUsageLedger({
    resolveFirestore: () => ({ db: { collection: () => ({ doc: () => ({ collection: () => ({ doc: () => ({ set: (d) => { writes.push(d); return Promise.resolve(); } }) }) }) }) }, FieldValue: { increment: (n) => n } }),
    telemetry: { increment() {} }, env: {}, now: () => METER_NOW,
  });
  let n = 0;
  const reply = (steps) => JSON.stringify({ results: [{ qNumber: 1, couldNotRead: false, addressesQuestion: 'yes', annotatedSteps: steps, teacherNote: 'N.' }] });
  const route = createCheckSolutionRoute({
    sendJson: () => {}, readJson: async (r) => r,
    callGemini: async () => { n += 1; ledger.recordUsage(CALL_USAGE); return { text: n === 1 ? 'not json' : reply(dontKnowSteps(3)), raw: {} }; },
    GEMINI_MODEL: 'test-model', ACTIVE_PROVIDER: 'test', isStubMode: () => false, extractJsonObjectFromText: lenientExtract,
    buildGeminiImagePart: ({ mimeType, base64 }) => ({ inlineData: { mimeType, data: base64 } }), validateMentorImagePayload: () => ({ ok: true }),
    makeFenceNonce: () => 'testnonce', telemetry: { increment() {} },
    solutionCache: { getOrCreateModelSolution: async () => { ledger.recordUsage(CALL_USAGE); return { schemeSteps: ['Factorise [1]', 'Solve [2]'] }; } },
  });
  const res = { setHeader() {} };
  await ledgerLib.runWithRequestContext(async () => {
    ledgerLib.bindRequestUid('stu-a17', '/api/check-solution');
    await route.handleCheckSolution({ question: 'Solve x^2 - 2x - 8 = 0.', marks: 3, subject: 'Maths', topic: 'Quadratic Equations', textAnswer: "Don't know" }, res);
  });
  await new Promise((r) => setImmediate(r));
  assert.equal(n, 2, 'a parse miss and its retry');
  assert.equal(chargeableCountOf(res), 0);
  const meterWrites = writes.filter((w) => 'costMicroInr' in w);
  assert.equal(meterWrites.length, 0, 'the first attempt, the retry and the cache generation all record 0 for a not-attempted question');
  assert.equal(writes.reduce((a, w) => a + (Number(w[ledgerLib.LEDGER_SPEND_FIELD]) || 0), 0), CALL_COST * 3, 'the REAL spend of all three calls is still recorded');
});

/* ── GRADER-QUALITY-1 (5 Nov 2026) — proven on EVERY surface, with each surface's own request ─────────
   Shapes from WS-M-MIX-02 (the owner's student, answers of 3 Nov; graded live on the Answer Checker 4 and
   5 Nov): Q15 (an inequality step left out between attempted lines, final answer right), Q24(i) (BP, CQ
   written, the reason left out), Q21 (a two-column verification quoted as one line), plus the controls.
   D1 runs after every mark is final: a TYPE/STATUS change only, the marks are asserted unchanged. */
const PHOTO_B64 = 'UEhPVE8=';
/** Make the target a PHOTO answer on every surface (D3's check exempts typed words, which are the student's own). */
const asPhoto = (view, req) => {
  if (req.questions) {
    const t = req.questions.find((q) => Number(q.qNumber) === Number(view.qNumber));
    if (t) {
      delete t.textAnswer;
      if (!req.document) {
        req.uploads = (req.uploads || []).filter((u) => Number(u.qNumber) !== Number(t.qNumber));
        req.uploads.push({ qNumber: t.qNumber, imageBase64: PHOTO_B64, imageMimeType: 'image/jpeg' });
      }
    }
  } else {
    delete req.textAnswer;
    req.imageBase64 = PHOTO_B64;
    req.imageMimeType = 'image/jpeg';
  }
};
const withMarks = (m, text) => (view, req) => { view.marks = m; if (text) view.questionText = text; if ('finalAnswer' in (req.questions ? view : req)) { if (req.questions) view.finalAnswer = null; else req.finalAnswer = null; } };
// The fixtures (and their provenance) are the golden file — one source for these tests and the live eval.
const GQ1 = Object.fromEntries(require('../eval/golden/fixtures/grader-quality-1.ws-m-mix-02.json').cases.map((c) => [c.id, c]));
const fixtureSteps = (id) => () => JSON.parse(JSON.stringify(GQ1[id].modelReply));
const Q15_TEXT = GQ1['GQ1-WS02-Q15'].questionText;
const q15Steps = fixtureSteps('GQ1-WS02-Q15');
const Q24_TEXT = GQ1['GQ1-WS02-Q24'].questionText;
// The REAL paper's Q24 (transcribed, book page 8) and a SYNTHETIC answer that writes the equal-tangent sums.
const q24RealSteps = fixtureSteps('GQ1-WS02-Q24');
const q24Steps = fixtureSteps('GQ1-SYNTH-Q24-EVIDENCE');
const OA2_Q22_TEXT = GQ1['GQ1-OA2-Q22-CONTROL'].questionText;
const oa2q22Steps = fixtureSteps('GQ1-OA2-Q22-CONTROL');
const Q21_TEXT = GQ1['GQ1-WS02-Q21'].questionText;
const q21Steps = (verify) => () => { const st = JSON.parse(JSON.stringify(GQ1['GQ1-WS02-Q21'].modelReply)); st[1].studentWork = verify; return st; };
const typesOf = (out) => out.annotatedSteps.map((st) => [st.status, st.marksAwarded, st.mistakeType]);

// Review round 1 (coordinator, 5 Nov): reviewer probes — each must stay EXACTLY as on trunk ("unattempted").
const GAS_TEXT = 'When zinc reacts with dilute sulphuric acid, name the gas evolved and the type of reaction.';
const gasSteps = () => [
  { description: 'Gas evolved', studentWork: '', status: 'unattempted', marksAvailable: 1, marksAwarded: 0, marksDeducted: 1, teacherAnnotation: '× Gas not named', mistakeType: null },
  { description: 'Type of reaction', studentWork: 'Displacement reaction', status: 'correct', marksAvailable: 1, marksAwarded: 1, marksDeducted: 0, teacherAnnotation: '✓', mistakeType: null },
];
const threeSteps = (mid) => () => [
  { description: 'First value', studentWork: 'x = 4', status: 'correct', marksAvailable: 1, marksAwarded: 1, marksDeducted: 0, teacherAnnotation: '✓', mistakeType: null },
  { description: 'Second value', studentWork: '', status: 'unattempted', marksAvailable: 1, marksAwarded: 0, marksDeducted: 1, teacherAnnotation: '× Not attempted', mistakeType: null, ...mid },
  { description: 'Third value', studentWork: 'z = 6', status: 'correct', marksAvailable: 1, marksAwarded: 1, marksDeducted: 0, teacherAnnotation: '✓', mistakeType: null },
];
const ROMAN_TEXT = 'For the AP 3, 7, 11, … i) find the 10th term ii) find the sum of 10 terms iii) is 101 a term?';
const NUMBERED_TEXT = 'For the AP 3, 7, 11, … answer: 1. the 10th term 2. the sum of 10 terms 3. whether 101 is a term';
const PLAIN_TEXT = 'For the AP 3, 7, 11, … find x, y and z as defined in the table above, showing your working.';
const unlabelled = (text) => (view, req) => withMarks(3, text)(view, req);

for (const s of SURFACES) {
  test('GRADER-QUALITY-1 D1 — ' + s.id + ': Q15 shape — an inequality step left out BETWEEN attempted lines is "missing", typed exam technique; marks unchanged', async () => {
    for (const acceptsV2 of [false, true]) {
      const r = await drive(s, { mutateTarget: withMarks(2, Q15_TEXT), targetSteps: q15Steps, acceptsV2 });
      const out = r.result;
      assert.equal(out.marksAwarded, GQ1['GQ1-WS02-Q15'].expected.marksAwarded, s.id + ' v2=' + acceptsV2 + ': 1 of 2, exactly as before');
      assert.deepEqual(typesOf(out), GQ1['GQ1-WS02-Q15'].expected.steps, s.id + ' v2=' + acceptsV2);
      assert.equal(out.mistakeSummary.presentation, 1, s.id + ': an MI exam-technique entry (R1)');
      assert.notEqual(out.teacherNote, R.NOT_ATTEMPTED_NOTE, s.id);
      if (acceptsV2) assert.deepEqual(out.marksLostByType, { conceptual: 0, calculation: 0, silly: 0, presentation: 1, unattempted: 0, untyped: 0 }, s.id);
    }
  });

  test('GRADER-QUALITY-1 D1 — ' + s.id + ': SYNTHETIC Q24 (not the student\'s paper) — a blank asked-for REASON is exam technique ½ ONLY with proof: (ii) writes "CD = CR + DR = 12 + 6" (owner ruling 5 Nov 2026)', async () => {
    const X = GQ1['GQ1-SYNTH-Q24-EVIDENCE'];
    assert.equal(X.synthetic, true);
    const r = await drive(s, { mutateTarget: withMarks(4, Q24_TEXT), targetSteps: q24Steps, acceptsV2: true });
    assert.equal(r.result.marksAwarded, X.expected.marksAwarded, s.id);
    assert.deepEqual(typesOf(r.result), X.expected.steps, s.id);
    assert.equal(r.result.marksLostByType.presentation, 0.5, s.id);
    assert.equal(r.result.marksLostByType.unattempted, 0, s.id);
    assert.ok(!('knowledgeEvidence' in r.result.annotatedSteps[1]) && !('_knowledgeEvidence' in r.result.annotatedSteps[1]), s.id + ': internal only — the response shape is unchanged');
  });

  test('GRADER-QUALITY-1 D1 — ' + s.id + ': the REAL paper\'s Q24 (book page 8) — "AB + CD = BC + DA" is the question\'s own "Show that …", not proof: (i)\'s blank reason stays as trunk, unlabelled AND labelled', async () => {
    const X = GQ1['GQ1-WS02-Q24'];
    const real = await drive(s, { mutateTarget: withMarks(4, Q24_TEXT), targetSteps: q24RealSteps, acceptsV2: true });
    assert.equal(real.result.marksAwarded, X.expected.marksAwarded, s.id);
    assert.deepEqual(typesOf(real.result), X.expected.steps, s.id);
    // the same reply with part labels, so ONLY the question-text rule stands between it and a flip
    const labelled = await drive(s, { mutateTarget: withMarks(4, Q24_TEXT), acceptsV2: true, targetSteps: () => {
      const st = q24RealSteps(); ['(i)', '(i)', '(ii)', '(iii)', '(iii)'].forEach((p, i) => { st[i].part = p; }); st[2] = { ...st[2], status: 'correct', marksAwarded: 1, marksDeducted: 0, mistakeType: null }; return st;
    } });
    assert.deepEqual([labelled.result.annotatedSteps[1].status, labelled.result.annotatedSteps[1].mistakeType], ['unattempted', null], s.id + ': evidence that is the question text is rejected (delta item 3)');
  });

  // OWNER RULING 5 Nov 2026: no proof, no exam technique — each stays EXACTLY as on trunk (unattempted, untyped).
  const NO_PROOF = [
    ['no knowledgeEvidence at all (an old reply)', (st) => { delete st[1].knowledgeEvidence; }],
    ['knowledgeEvidence null', (st) => { st[1].knowledgeEvidence = null; }],
    ['a FABRICATED quote, in no step of the student\'s work', (st) => { st[1].knowledgeEvidence = 'tangents from an external point are equal'; }],
    ['the quote found only in the SAME step', (st) => { st[1].knowledgeEvidence = 'BP and CQ are tangents'; st[1].studentWork = ''; st[1].teacherAnnotation = 'BP and CQ are tangents'; }],
    ['the quote found only in an INCORRECT step', (st) => { st[2] = { ...st[2], studentWork: 'CD = CR + DR = 12 + 6 = 20 m', status: 'incorrect', marksAwarded: 0, marksDeducted: 1, mistakeType: 'calculation' }; }],
    ['delta item 3: the quote is in the QUESTION TEXT ("Show that AB + CD = BC + DA")', (st) => { st[1].knowledgeEvidence = 'AB + CD = BC + DA'; st[3] = { ...st[3], studentWork: 'AB + CD = BC + DA, LHS = 36, RHS = 36, hence proved' }; }],
    ['delta item 3: a BARE VALUE ("DA = 14 m"), written in (ii)', (st) => { st[1].knowledgeEvidence = 'DA = 14 m'; st[2] = { ...st[2], studentWork: st[2].studentWork + ', so DA = 14 m' }; }],
    ['delta item 3: a bare value with a long name ("perimeter = 72 m")', (st) => { st[1].knowledgeEvidence = 'perimeter = 72 m'; st[3] = { ...st[3], studentWork: st[3].studentWork + ', perimeter = 72 m' }; }],
    ['delta item 3: found only in an EARLIER step of the same part (the answer the reason justifies)', (st) => { st[1].knowledgeEvidence = 'BP = 10 m, CQ = 12 m'; }],
    ['a trivially short quote ("= 3")', (st) => { st[1].knowledgeEvidence = '= 3'; }],
  ];
  for (const [label, mutate] of NO_PROOF) {
    test('GRADER-QUALITY-1 D1 evidence — ' + s.id + ': ' + label + ' → the blank reason stays as on trunk', async () => {
      const r = await drive(s, { mutateTarget: withMarks(4, Q24_TEXT), acceptsV2: true, targetSteps: () => { const st = q24Steps(); mutate(st); return st; } });
      assert.deepEqual([r.result.annotatedSteps[1].status, r.result.annotatedSteps[1].mistakeType], ['unattempted', null], s.id + ' — ' + label);
      assert.equal(r.result.marksLostByType.presentation, 0, s.id + ' — ' + label);
    });
  }

  // OWNER RULING 5 Nov 2026, option (B), owner-approved: the MODEL'S OWN exam-technique typing of a blank
  // reason / justification / verification step needs the same proof. GS-M22-a shape ("…and verify your answer").
  const VERIFY_TEXT = 'Solve 7x − 2y = 5 and 8x + 7y = 15, and verify your answer.';
  const verifySteps = (extra) => () => [
    { description: 'Elimination of y and solving for x', studentWork: '49x − 14y = 35, 16x + 14y = 30, 65x = 65, x = 1', status: 'correct', marksAvailable: 1, marksAwarded: 1, marksDeducted: 0, teacherAnnotation: '✓', mistakeType: null },
    { description: 'Finding y', studentWork: 'Put x = 1 in (1): 7 − 2y = 5, y = 1', status: 'correct', marksAvailable: 0.5, marksAwarded: 0.5, marksDeducted: 0, teacherAnnotation: '✓', mistakeType: null },
    { description: 'Verification of values in both original equations', studentWork: '', status: 'missing', marksAvailable: 0.5, marksAwarded: 0, marksDeducted: 0.5, teacherAnnotation: '× Verification step requested in the question is missing.', mistakeType: 'presentation', ...extra },
  ];
  test('GRADER-QUALITY-1 D1 evidence (B) — ' + s.id + ': GS-M22-a shape — the MODEL typed a blank verification exam technique with NO proof → the fourth state (unattempted, untyped); marks unchanged', async () => {
    for (const acceptsV2 of [false, true]) {
      const r = await drive(s, { mutateTarget: withMarks(2, VERIFY_TEXT), targetSteps: verifySteps({}), acceptsV2 });
      assert.equal(r.result.marksAwarded, 1.5, s.id + ' v2=' + acceptsV2);
      assert.deepEqual([r.result.annotatedSteps[2].status, r.result.annotatedSteps[2].mistakeType], [acceptsV2 ? 'unattempted' : 'missing', null], s.id + ' v2=' + acceptsV2 + ' (the legacy shape has no "unattempted")');
      assert.equal(r.result.mistakeSummary.presentation, 0, s.id + ': no exam-technique MI entry without proof');
      if (acceptsV2) assert.deepEqual(r.result.marksLostByType, { conceptual: 0, calculation: 0, silly: 0, presentation: 0, unattempted: 0.5, untyped: 0 }, s.id);
    }
  });
  test('GRADER-QUALITY-1 D1 evidence (B) CONTROL — ' + s.id + ': the model\'s exam-technique typing STANDS with proof, as working not shown (a gap), or when the step is not blank', async () => {
    // proof: the student verified the same way elsewhere — quoted, and found in a correct step
    // (another PART of the question shows the student substitutes back and checks: delta item 3 — not an earlier step)
    const proven = await drive(s, { mutateTarget: withMarks(3, VERIFY_TEXT), acceptsV2: true, targetSteps: () => {
      const st = verifySteps({ knowledgeEvidence: 'x = 1 and y = 1 satisfy 8x + 7y = 15' })().map((x) => ({ ...x, part: '(a)' }));
      st.push({ part: '(b)', description: 'Second check', studentWork: 'x = 1 and y = 1 satisfy 8x + 7y = 15 as 8 + 7 = 15', status: 'correct', marksAvailable: 1, marksAwarded: 1, marksDeducted: 0, teacherAnnotation: '✓', mistakeType: null });
      return st;
    } });
    assert.deepEqual([proven.result.annotatedSteps[2].status, proven.result.annotatedSteps[2].mistakeType], ['missing', 'presentation'], s.id + ': proven');
    // a gap: attempted work before AND after the blank verification
    const gap = await drive(s, { mutateTarget: withMarks(2, VERIFY_TEXT), acceptsV2: true, targetSteps: () => {
      const st = verifySteps({})(); st[1].marksAvailable = 0.25; return [st[0], st[2], { ...st[1], marksAvailable: 0.5 }];
    } });
    // MISSING-TYPE-1 review item 2 (coordinator, 5 Nov 2026): the question ASKS "verify your answer", so a blank
    // verification is an asked deliverable even between two written lines — Not attempted, never working not shown.
    assert.deepEqual([gap.result.annotatedSteps[1].status, gap.result.annotatedSteps[1].mistakeType], ['unattempted', null], s.id + ': an ASKED verification in a gap is Not attempted');
    // the gap exemption still holds where the question did not ask for the step
    const gapNotAsked = await drive(s, { mutateTarget: withMarks(2, 'Solve 7x − 2y = 5 and 8x + 7y = 15.'), acceptsV2: true, targetSteps: () => {
      const st = verifySteps({})(); st[1].marksAvailable = 0.25; return [st[0], st[2], { ...st[1], marksAvailable: 0.5 }];
    } });
    assert.equal(gapNotAsked.result.annotatedSteps[1].mistakeType, 'presentation', s.id + ': a gap in the working the question did not ask for is working not shown');
    // not blank: a conclusion LINE missing after a written check is a format element (rules.cjs PRESENTATION)
    const line = await drive(s, { mutateTarget: withMarks(2, VERIFY_TEXT), acceptsV2: true, targetSteps: verifySteps({ studentWork: 'LHS = 7 − 2 = 5 = RHS', status: 'partial', marksAwarded: 0, teacherAnnotation: '× "Hence verified" line missing.' }) });
    assert.equal(line.result.annotatedSteps[2].mistakeType, 'presentation', s.id + ': a written check keeps its format deduction');
  });

  // DELTA REVIEW item 2 (minimum fix): a model-typed blank reason step that still HOLDS marks (its own, or given
  // back by the exam-technique cap before the withdrawal runs) keeps the model's typing — marks AND type as on trunk.
  const HOLDING = [
    ['a 2-mark blank justification the cap gives 1 back to (4-mark answer)', 4, () => [
      { description: 'Solving', studentWork: 'x = 4', status: 'correct', marksAvailable: 2, marksAwarded: 2, marksDeducted: 0, teacherAnnotation: '✓', mistakeType: null },
      { description: 'Justification of the method', studentWork: '', status: 'missing', marksAvailable: 2, marksAwarded: 0, marksDeducted: 2, teacherAnnotation: '× Justification missing.', mistakeType: 'presentation' },
    ], 1, 3],
    ['a single blank-reason step, 1 of 2 after the cap', 2, () => [
      { description: 'Reason for the answer', studentWork: '', status: 'missing', marksAvailable: 2, marksAwarded: 0, marksDeducted: 2, teacherAnnotation: '× Reason missing.', mistakeType: 'presentation' },
    ], 0, 1],
    ['a blank verification step the model left holding ½', 2, () => [
      { description: 'Solving', studentWork: 'x = 1, y = 1', status: 'correct', marksAvailable: 1, marksAwarded: 1, marksDeducted: 0, teacherAnnotation: '✓', mistakeType: null },
      { description: 'Verification of the values', studentWork: '', status: 'missing', marksAvailable: 1, marksAwarded: 0.5, marksDeducted: 0.5, teacherAnnotation: '½ Verification incomplete.', mistakeType: 'presentation' },
    ], 1, 1.5],
  ];
  for (const [label, marks, targetSteps, idx, total] of HOLDING) {
    test('GRADER-QUALITY-1 D1 evidence (B) — ' + s.id + ': delta item 2: ' + label + ' — keeps the model\'s typing; marks as on trunk; never an "unattempted" step holding marks', async () => {
      for (const acceptsV2 of [false, true]) {
        const r = await drive(s, { mutateTarget: withMarks(marks, PLAIN_TEXT), targetSteps, acceptsV2 });
        assert.equal(r.result.marksAwarded, total, s.id + ' v2=' + acceptsV2 + ': marks as on trunk');
        assert.deepEqual([r.result.annotatedSteps[idx].status, r.result.annotatedSteps[idx].mistakeType], ['missing', 'presentation'], s.id + ' v2=' + acceptsV2);
        assert.ok(r.result.annotatedSteps.every((st) => st.status !== 'unattempted' || st.marksAwarded === 0), s.id + ': no unattempted step holds marks');
      }
    });
  }

  test('GRADER-QUALITY-1 D1 CONTROL — ' + s.id + ': delta nit: a skipped DIAGRAM between written lines is a deliverable, never "working not shown" — stays NOT ATTEMPTED', async () => {
    const r = await drive(s, { mutateTarget: unlabelled(PLAIN_TEXT), acceptsV2: true, targetSteps: threeSteps({ description: 'Labelled ray diagram' }) });
    assert.deepEqual([r.result.annotatedSteps[1].status, r.result.annotatedSteps[1].mistakeType], ['unattempted', null], s.id);
    assert.equal(r.result.marksAwarded, 2, s.id);
  });

  test('GRADER-QUALITY-1 D1 evidence — ' + s.id + ': (c) a WRONG reason actually written is untouched (the model\'s type stands); the objective clamp is untouched', async () => {
    const r = await drive(s, { mutateTarget: withMarks(4, Q24_TEXT), acceptsV2: true, targetSteps: () => {
      const st = q24Steps();
      st[1] = { ...st[1], studentWork: 'because BP and CQ are parallel', status: 'incorrect', marksAwarded: 0, marksDeducted: 0.5, mistakeType: 'conceptual', knowledgeEvidence: 'AB + CD = BC + DA' };
      return st;
    } });
    assert.deepEqual([r.result.annotatedSteps[1].status, r.result.annotatedSteps[1].mistakeType], ['incorrect', 'conceptual'], s.id);
    assert.equal(r.result.marksAwarded, 3.5, s.id);
    // both paths ask the model for the field — additive and optional in the ONE grading schema
    const call = (await drive(s, { targetSteps: unitSteps })).calls[0];
    const steps = JSON.stringify(call.genConfig.responseSchema);
    assert.ok(steps.includes('"knowledgeEvidence":{"type":"STRING","nullable":true}'), s.id + ': the schema offers knowledgeEvidence (nullable)');
    assert.ok(call.prompt.includes('knowledgeEvidence') && call.prompt.includes('never guess why it is blank'), s.id + ': the rule reaches the prompt');
  });

  // CONTROLS — trunk behaviour: each of these stays "unattempted", untyped, marks as on trunk. Most also
  // FAILED on the first head of this PR (d44ad0fc) — review round 1, items 1–8 (named per assertion).
  // CONTROLS — trunk behaviour: each probe stays "unattempted", untyped, marks as on trunk. ONE TEST PER PROBE:
  // all pass on trunk 1b268a52; the review-round-1 probes (items 1–5, 7, 8) FAILED on this PR's first head d44ad0fc.
  const CONTROL_PROBES = [
    ['OA2 Q22 (owner key)', withMarks(3, OA2_Q22_TEXT), oa2q22Steps, 1, 1.5],
    ['skipped labelled part', withMarks(4, Q24_TEXT), () => {
      const st = q24Steps(); st[1] = { ...st[1], status: 'correct', studentWork: 'tangents from an external point are equal', marksAwarded: 0.5, marksDeducted: 0 };
      st[2] = { ...st[2], description: 'Reason and lengths of CD and DA', studentWork: '', status: 'unattempted', marksAwarded: 0, marksDeducted: 1 };
      return st;
    }, 2, 3],
    ['"Don\'t know" (ruling 7)', withMarks(2, Q15_TEXT), () => { const st = q15Steps(); st[1] = { ...st[1], studentWork: "Don't know" }; return st; }, 1, 1],
    ['item 1: gas blank, reaction answered', withMarks(2, GAS_TEXT), gasSteps, 0, 1],
    ['item 2: "i) ii) iii)" text', unlabelled(ROMAN_TEXT), threeSteps({ description: 'Verification of the sum' }), 1, 2],
    ['item 2: "1. 2. 3." text', unlabelled(NUMBERED_TEXT), threeSteps({ description: 'Verification of the sum' }), 1, 2],
    ['item 2: no real question text (the question is only in the photo)', unlabelled('Submitted question'), threeSteps({}), 1, 2],
    ['item 2: the step names its own part', unlabelled(PLAIN_TEXT), threeSteps({ description: 'Part (ii): second value' }), 1, 2],
    ['item 3: "I don\'t know this part"', unlabelled(PLAIN_TEXT), threeSteps({ studentWork: "I don't know this part" }), 1, 2],
    ['item 4: a "Not written" missing step before it', unlabelled(PLAIN_TEXT), () => {
      const st = threeSteps({ description: 'Reason for the second value' })();
      st[0] = { ...st[0], studentWork: 'Not written', status: 'missing', marksAwarded: 0, marksDeducted: 1 };
      return st;
    }, 1, 1],
    ['item 5: justification word only in the annotation', unlabelled(PLAIN_TEXT), () => threeSteps({ teacherAnnotation: '× Give the reason why' })().slice(0, 2), 1, 1],
    ['item 7: beside a calculation slip', withMarks(2, Q15_TEXT), () => { const st = q15Steps(); st[2] = { ...st[2], studentWork: 'a12 = 4500 - 11 x 350 = 750', status: 'incorrect', marksAwarded: 0, marksDeducted: 0.5, mistakeType: 'calculation' }; return st; }, 1, 0.5],
    ['item 8: a 5-mark answer missing a 2-mark justification', withMarks(5, Q15_TEXT), () => {
      const st = q15Steps();
      st[0] = { ...st[0], marksAvailable: 1.5, marksAwarded: 1.5 };
      st[1] = { ...st[1], description: 'Justification of the condition', marksAvailable: 2, marksDeducted: 2 };
      st[2] = { ...st[2], marksAvailable: 1.5, marksAwarded: 1.5 };
      return st;
    }, 1, 3],
  ];
  for (const [label, mutateTarget, targetSteps, idx, marks] of CONTROL_PROBES) {
    test('GRADER-QUALITY-1 D1 CONTROL — ' + s.id + ': ' + label + ' — stays NOT ATTEMPTED, untyped, marks as on trunk', async () => {
      const r = await drive(s, { mutateTarget, targetSteps, acceptsV2: true });
      assert.deepEqual([r.result.annotatedSteps[idx].status, r.result.annotatedSteps[idx].mistakeType], ['unattempted', null], s.id + ' — ' + label);
      assert.equal(r.result.marksAwarded, marks, s.id + ' — ' + label + ': marks as on trunk');
      assert.equal(r.result.marksLostByType.presentation, 0, s.id + ' — ' + label + ': no exam technique invented');
    });
  }

  test('GRADER-QUALITY-1 D1 — ' + s.id + ': item 6 — the exam-technique cap counts each step at the larger of its lost marks and its DEDUCTION: an omission that would take the answer over 1 mark is left alone', async () => {
    // a 4-mark answer that already lost ½ to a unit, with the model's deduction on that step recorded as 1
    const r = await drive(s, { mutateTarget: withMarks(4, PLAIN_TEXT), acceptsV2: true, targetSteps: () => [
      { description: 'First value', studentWork: 'x = 4', status: 'correct', marksAvailable: 1, marksAwarded: 1, marksDeducted: 0, teacherAnnotation: '✓', mistakeType: null },
      { description: 'Reason for the second value', studentWork: '', status: 'unattempted', marksAvailable: 1, marksAwarded: 0, marksDeducted: 1, teacherAnnotation: '×', mistakeType: null },
      { description: 'Third value', studentWork: 'z = 6 cm', status: 'correct', marksAvailable: 1, marksAwarded: 1, marksDeducted: 0, teacherAnnotation: '✓', mistakeType: null },
      { description: 'Conclusion', studentWork: 'so the answer is 10', status: 'partial', marksAvailable: 1, marksAwarded: 0.5, marksDeducted: 0.5, teacherAnnotation: '½ The concluding statement is incomplete.', mistakeType: 'presentation' },
    ] });
    const lost = r.result.marksLostByType;
    assert.ok(lost.presentation <= 1, s.id + ': exam technique never over the A17 cap (got ' + lost.presentation + ')');
    assert.equal(r.result.annotatedSteps[1].status, 'unattempted', s.id + ': ½ + 1 > 1 — the omission is left as on trunk');
    assert.equal(r.result.marksAwarded, 2.5, s.id);
  });

  test('GRADER-QUALITY-1 D3 — ' + s.id + ': Q21 shape — a two-column check quoted as one row from a PHOTO is never charged; each column is still checked on its own', async () => {
    const photoQ21 = (view, req) => { withMarks(3, Q21_TEXT)(view, req); asPhoto(view, req); };
    for (const quote of [GQ1['GQ1-WS02-Q21'].photoQuote, '-4 + 6 = 2 6 x -4 = -24\n2 = 2 -24 = -24', '2 = 2 –24 = –24',
      // delta review item 1: CORRECT glued-minus chains are never charged by the split
      'D = 7² − 4 × 3 × 2 = 49 −24 = 25', 'x = (12 + 4)/2 = 16 −8 = 8', '2 × 3 = 7 -1 = 6']) {
      const r = await drive(s, { mutateTarget: photoQ21, targetSteps: q21Steps(quote), acceptsV2: true });
      assert.equal(r.result.marksAwarded, 3, s.id + ': ' + JSON.stringify(quote));
      assert.ok(!r.result.annotatedSteps.some((st) => /Check the arithmetic/.test(st.teacherAnnotation || '')), s.id + ': no false arithmetic comment');
      assert.equal(r.result.marksLostByType.calculation, 0, s.id);
    }
    // CONTROLS: the check is LIVE here — a spaced false subtraction, and a false FIRST column beside a true second
    for (const wrong of ['2 = 2 − 24', '3 + 4 = 8 −2 = −2']) {
      const c = await drive(s, { mutateTarget: photoQ21, targetSteps: q21Steps(wrong), acceptsV2: true });
      assert.equal(c.result.marksAwarded, 2.5, s.id + ': ' + wrong + ' is still charged ½');
    }
  });

  test('GRADER-QUALITY-1 D1/D2/D3 — ' + s.id + ': the three rules reach THIS surface\'s prompt, the D1 rule bounded by the cap', async () => {
    const p = (await drive(s, { targetSteps: unitSteps })).calls[0].prompt;
    const conceptual = p.slice(p.indexOf('"conceptual" = METHOD MISUNDERSTOOD'), p.indexOf('"presentation" = CBSE FORMAT ONLY'));
    assert.ok(conceptual.includes('IF THE STUDENT\'S LATER STEPS PROVE THEY KNOW THE METHOD, IT IS NOT CONCEPTUAL'), s.id + ': D2 tell-tale in the conceptual definition');
    assert.ok(conceptual.includes('ONLY IN ITS WORDING OR VARIABLE NAMES') && conceptual.includes('ANYTHING THAT CHANGES WHETHER THE MATHEMATICS IS RIGHT IS NOT PRESENTATION'), s.id + ': D2 limited to wording');
    assert.ok(p.includes('AN OMISSION INSIDE AN ATTEMPTED ANSWER IS NOT "unattempted" — WITHIN THE EXAM-TECHNIQUE CAP'), s.id + ': D1');
    assert.ok(p.includes('BIGGER omission is reported exactly as before') && p.includes('NEVER typed "presentation"'), s.id + ': D1 is bounded by the cap (item 8)');
    assert.ok(p.includes('The ONE exception is an omitted value point of its own worth no more than the cap'), s.id + ': the presentation-vs-missing rule reconciled with D1');
    assert.ok(p.includes('SIDE-BY-SIDE WORK IS READ COLUMN BY COLUMN'), s.id + ': D3');
  });
}

/* ── GRADER-CREDIT-1 (owner rulings A and B, 5 Nov 2026) — on EVERY grading surface ─────────────────────
   (A) shared credit for separately required values: PROMPT (the model awards the share); the server must keep
       a ½ the model gives on such a step (never floored, never re-typed).
   (B) equal forms: PROMPT everywhere + a give-back-only guard (postprocess.cjs restoreEquivalentFinalAnswer)
       that fires only where the request carries a stored key — the surfaces whose live request has a
       `finalAnswer` field (HPQ, Worksheets, Chapter Test, Full Mock, Quick Practice). The Answer Checker
       (single and multi) sends no key: there the prompt rule alone decides, and the test proves the guard
       never fires (the model's reply stands, exactly as on trunk). */
const GC1 = Object.fromEntries(require('../eval/golden/fixtures/grader-credit-1.json').cases.map((c) => [c.id, c]));
const gcSteps = (id) => () => JSON.parse(JSON.stringify(GC1[id].modelReply));
const gcExtra = (id, over = {}) => ({ finalAnswerCorrect: GC1[id].finalAnswerCorrect, ...(GC1[id].studentFinalAnswer ? { studentFinalAnswer: GC1[id].studentFinalAnswer } : {}), ...over });
/** The fixture's question on this surface; its key only where the surface's live request carries the field. */
const gcTarget = (id, text) => (view, req) => {
  view.marks = GC1[id].marks;
  view.questionText = text || GC1[id].questionText;
  if (req.questions) { if ('finalAnswer' in view) view.finalAnswer = GC1[id].finalAnswer; } else if ('finalAnswer' in req) req.finalAnswer = GC1[id].finalAnswer;
};
const carriesKey = (s) => {
  const job = PLAN[s.job];
  if (job.handler === 'handleCheckSolution') return 'finalAnswer' in job.request;
  const q = (job.request.questions || []).find((x) => !(x.objective === true) && !/^a$/i.test(String(x.section || '')) && !(Array.isArray(x.options) && x.options.length));
  return Boolean(q) && 'finalAnswer' in q;
};
const modelSum = (id) => GC1[id].modelReply.reduce((a, st) => a + st.marksAwarded, 0);

test('GRADER-CREDIT-1 §4a — which surfaces carry a stored key (the deterministic guard reaches exactly these; the prompt reaches all)', () => {
  const withKey = SURFACES.filter(carriesKey).map((s) => s.id).sort();
  assert.deepEqual(withKey, ['chapter-test', 'full-mock', 'hpq-solution-checker', 'quick-practice-batch', 'worksheets']);
});

for (const s of SURFACES) {
  test('GRADER-CREDIT-1 (A)+(B) — ' + s.id + ': both rulings reach THIS surface\'s prompt, each with the limits that tell the readings apart', async () => {
    const p = (await drive(s, { targetSteps: unitSteps })).calls[0].prompt;
    assert.ok(p.includes(R.SEPARATE_VALUES_PROMPT), s.id + ': (A) shared credit');
    assert.ok(p.includes(R.EQUIVALENT_ANSWERS_PROMPT), s.id + ': (B) equivalent answers');
    // (A) the share — AND its limits: never a single indivisible result / a count (case law 12), never a wrong method
    assert.ok(p.includes('½ of a 1-mark point for one root of two') && p.includes('NEVER split a SINGLE indivisible result') && p.includes('earns NOTHING'), s.id);
    assert.ok(p.includes('INCOMPLETE LIST OR COUNT IS A WRONG VALUE') && p.includes('a COUNT is one value; TWO SEPARATELY ASKED values are not'), s.id + ': case law 12 kept, and told apart');
    assert.ok(p.includes('VALUE POINTS ARE EARNED OR NOT') && p.includes('is shared between them (see SEPARATE VALUES)'), s.id + ': the old rule now points at the exception');
    // (B) accept equal forms — AND enforce a demanded form / a stated precision; units unchanged
    assert.ok(p.includes('45/48 or 90/96 for 15/16') && p.includes('4.5 A for 4.54 A'), s.id);
    assert.ok(p.includes('"correct to two decimal places" means exactly two places') && p.includes('EXPLICITLY asks to SIMPLIFY'), s.id);
    assert.ok(p.includes('still loses the ½ for the unit'), s.id + ': units rule untouched');
    assert.ok(p.includes('A different but EQUAL form of the same value'), s.id + ': READING FIDELITY re-derives by value');
  });

  test('GRADER-CREDIT-1 (A) — ' + s.id + ': one of two roots right (WS-M-MIX-05 Q2 shape): the model\'s ½ on the roots step is KEPT, typed by the ruler', async () => {
    for (const acceptsV2 of [false, true]) {
      const r = await drive(s, { mutateTarget: gcTarget('GC1-ROOTS-HALF'), targetSteps: gcSteps('GC1-ROOTS-HALF'), targetExtra: gcExtra('GC1-ROOTS-HALF'), acceptsV2 });
      const want = GC1['GC1-ROOTS-HALF'].expected;
      assert.equal(r.result.marksAwarded, want.marksAwarded, s.id + ' v2=' + acceptsV2);
      assert.deepEqual(typesOf(r.result), want.steps, s.id + ' v2=' + acceptsV2);
      if (acceptsV2) assert.equal(r.result.marksLostByType.silly, 0.5, s.id);
    }
    const t = await drive(s, { mutateTarget: gcTarget('GC1-REASONS-HALF'), targetSteps: gcSteps('GC1-REASONS-HALF'), targetExtra: gcExtra('GC1-REASONS-HALF'), acceptsV2: true });
    assert.equal(t.result.marksAwarded, GC1['GC1-REASONS-HALF'].expected.marksAwarded, s.id + ': two reasons, one given');
    assert.deepEqual(typesOf(t.result), GC1['GC1-REASONS-HALF'].expected.steps, s.id);
  });

  test('GRADER-CREDIT-1 (B) — ' + s.id + ': an EQUAL final answer (45/48 for 15/16; 4.5 A for 4.54 A) keeps its mark where a key is sent; the model\'s reply stands where none is', async () => {
    for (const id of ['GC1-EQ-45-48', 'GC1-EQ-4-5A']) {
      for (const acceptsV2 of [false, true]) {
        const r = await drive(s, { mutateTarget: gcTarget(id), targetSteps: gcSteps(id), targetExtra: gcExtra(id, { teacherNote: 'Good work. Your final answer is not simplified.' }), acceptsV2 });
        if (carriesKey(s)) {
          assert.equal(r.result.marksAwarded, GC1[id].expected.marksAwarded, s.id + ' ' + id + ' v2=' + acceptsV2);
          assert.deepEqual(typesOf(r.result), GC1[id].expected.steps, s.id + ' ' + id);
          const last = r.result.annotatedSteps[r.result.annotatedSteps.length - 1];
          assert.equal(last.teacherAnnotation, '✓ ' + R.EQUIVALENT_FINAL_ANSWER_ANNOTATION, s.id + ': one true comment');
          assert.equal(last.correctedWorking, null, s.id);
          assert.ok(!/simplif/i.test(r.result.teacherNote), s.id + ': the false note sentence goes');
          if (acceptsV2) assert.deepEqual(Object.values(r.result.marksLostByType).reduce((a, b) => a + b, 0), 0, s.id);
        } else {
          assert.equal(r.result.marksAwarded, modelSum(id), s.id + ' ' + id + ': no key on this surface — the model decides, as on trunk');
        }
      }
    }
  });

  test('GRADER-CREDIT-1 (B) — ' + s.id + ': a DEMANDED form or precision is enforced (lowest terms asked; "correct to two decimal places") — never given back; without the demand the same reply is', async () => {
    for (const id of ['GC1-SIMPLIFY-ASKED', 'GC1-DP-VIOLATED']) {
      const r = await drive(s, { mutateTarget: gcTarget(id), targetSteps: gcSteps(id), targetExtra: gcExtra(id), acceptsV2: true });
      assert.equal(r.result.marksAwarded, GC1[id].expected.marksAwarded, s.id + ' ' + id);
      assert.deepEqual(typesOf(r.result), GC1[id].expected.steps, s.id + ' ' + id);
    }
    // CONTROL — the very same reply, the demand taken out of the question: given back where a key is sent
    const plain = GC1['GC1-DP-VIOLATED'].questionText.replace(' correct to two decimal places', '');
    const c = await drive(s, { mutateTarget: gcTarget('GC1-DP-VIOLATED', plain), targetSteps: gcSteps('GC1-DP-VIOLATED'), targetExtra: gcExtra('GC1-DP-VIOLATED'), acceptsV2: true });
    assert.equal(c.result.marksAwarded, carriesKey(s) ? 2 : 1.5, s.id + ': 44.0 m is 43.98 m to one place');
  });
}

/* ── MISSING-TYPE-1 (5 Nov 2026) — no lost mark leaves the grader without a reason it can name ──────────────
   (1) WS-M-MIX-02 Q25(i): a blank asked-for reason came back "missing", untyped → "reason not recorded" (Q24's
   identical shape said "Not attempted"). (2) Answer Checker single, "Which term of the AP … is 47?" answered
   "47 is the 15th term.": blank working steps → "reason not recorded · 1½". OWNER RULING 5 Nov 2026 14:04: working
   not shown before a right step is exam technique ("missing", presentation), its marks lost, NEVER given back by
   the A17 ruling-B cap; an asked-for deliverable left blank stays "unattempted". Every surface, both paths. */
const telemetry = require('../telemetry.cjs');
const zeroLostOf = require('./postprocess.cjs').zeroLost;
const counterOf = (k) => Number(telemetry.snapshot()['grading.untyped_loss.' + k]) || 0;
const Q25_TEXT = GQ1['GQ1-WS02-Q25'].questionText;
const AP = GQ1['MT1-AP-47-SINGLE'];
const apAs = (status, mistakeType) => () => fixtureSteps('MT1-AP-47-SINGLE')().map((st, i) => (i < 2 ? { ...st, status, mistakeType } : st));
const apTarget = (view, req) => { withMarks(2, AP.questionText)(view, req); view.textAnswer = AP.textAnswer; };

for (const s of SURFACES) {
  test('MISSING-TYPE-1 — ' + s.id + ': Q25 shape (book page 9) — a blank asked-for REASON, untyped "missing", is NOT ATTEMPTED like Q24, never "reason not recorded"; marks unchanged', async () => {
    const X = GQ1['GQ1-WS02-Q25'];
    for (const acceptsV2 of [false, true]) {
      const r = await drive(s, { mutateTarget: withMarks(4, Q25_TEXT), targetSteps: fixtureSteps('GQ1-WS02-Q25'), acceptsV2 });
      assert.equal(r.result.marksAwarded, X.expected.marksAwarded, s.id + ' v2=' + acceptsV2);
      if (!acceptsV2) { assert.deepEqual([r.result.annotatedSteps[1].status, r.result.annotatedSteps[1].mistakeType], ['missing', null], s.id + ': the legacy shape shows the fourth state as "missing"'); continue; }
      assert.deepEqual(typesOf(r.result), X.expected.steps, s.id);
      assert.deepEqual(r.result.marksLostByType, { ...zeroLostOf(), unattempted: 0.5 }, s.id + ': Not attempted ½, untyped 0');
    }
    // the SAME label as the real Q24 (i) — same shape, one label
    const q24 = await drive(s, { mutateTarget: withMarks(4, Q24_TEXT), targetSteps: q24RealSteps, acceptsV2: true });
    assert.deepEqual(typesOf(q24.result), GQ1['GQ1-WS02-Q24'].expected.steps, s.id + ': Q24 unchanged');
    assert.equal(q24.result.marksLostByType.unattempted, 0.5, s.id);
  });

  test('MISSING-TYPE-1 — ' + s.id + ': SYNTHETIC Q25 — #1575 takes precedence: a blank reason WITH proof of knowledge in (ii) is exam technique ½, not Not attempted', async () => {
    const X = GQ1['GQ1-SYNTH-Q25-EVIDENCE'];
    assert.equal(X.synthetic, true);
    const r = await drive(s, { mutateTarget: withMarks(4, Q25_TEXT), targetSteps: fixtureSteps('GQ1-SYNTH-Q25-EVIDENCE'), acceptsV2: true });
    assert.equal(r.result.marksAwarded, X.expected.marksAwarded, s.id);
    assert.deepEqual(typesOf(r.result), X.expected.steps, s.id);
    assert.deepEqual(r.result.marksLostByType, { ...zeroLostOf(), presentation: 0.5 }, s.id);
  });

  test('MISSING-TYPE-1 — ' + s.id + ': AP "47 is the 15th term." (live, single path) — blank working steps are exam technique 1½, 0.5/2 NOT raised by the cap, whether the model said unattempted, missing or missing + presentation (owner ruling 14:04)', async () => {
    // [status the model gave steps 1–2, its type] — on trunk: unattempted → Not attempted 1½ (and "reason not recorded" in the
    // live summary), missing/null → untyped 1½, missing/presentation → the A17 cap gave ½ back (1/2). Now all read the same.
    for (const [status, type] of [['unattempted', null], ['missing', null], ['missing', 'presentation']]) {
      for (const acceptsV2 of [false, true]) {
        const r = await drive(s, { mutateTarget: apTarget, targetSteps: apAs(status, type), acceptsV2 });
        const tag = s.id + ' ' + status + '/' + type + ' v2=' + acceptsV2;
        assert.equal(r.result.marksAwarded, AP.expected.marksAwarded, tag + ': 0.5 of 2 — the cap never gives back marks for working not shown');
        assert.deepEqual(typesOf(r.result), AP.expected.steps, tag);
        assert.equal(r.result.mistakeSummary.presentation, 2, tag + ': two exam-technique MI entries');
        if (acceptsV2) assert.deepEqual(r.result.marksLostByType, { ...zeroLostOf(), presentation: 1.5 }, tag + ': "Exam technique 1½" — no "reason not recorded", no Not attempted');
      }
    }
  });

  test('MISSING-TYPE-1 — ' + s.id + ': owner ruling 14:04 — the GAP shape beyond the cap (a 2-mark working step on a 3-mark answer, #1575\'s former "item 7" control) is now exam technique, uncapped; marks unchanged', async () => {
    const r = await drive(s, { mutateTarget: withMarks(3, Q15_TEXT), acceptsV2: true, targetSteps: () => { const st = q15Steps(); st[1] = { ...st[1], marksAvailable: 2, marksDeducted: 2 }; return st; } });
    assert.deepEqual([r.result.annotatedSteps[1].status, r.result.annotatedSteps[1].mistakeType], ['missing', 'presentation'], s.id);
    assert.equal(r.result.marksAwarded, 1, s.id + ': marks as on trunk');
    assert.equal(r.result.marksLostByType.presentation, 2, s.id + ': working not shown is not held to the 1-mark cap');
  });

  test('MISSING-TYPE-1 — ' + s.id + ': a step WITH work the model left untyped gets no guessed type — it stays "reason not recorded" and is COUNTED for admin', async () => {
    const before = counterOf('kept_untyped');
    const r = await drive(s, { mutateTarget: withMarks(3, PLAIN_TEXT), acceptsV2: true, targetSteps: () => [
      { description: 'First value', studentWork: 'x = 4', status: 'correct', marksAvailable: 1, marksAwarded: 1, marksDeducted: 0, teacherAnnotation: '✓', mistakeType: null },
      { description: 'Second value', studentWork: 'y = 5', status: 'incorrect', marksAvailable: 2, marksAwarded: 0, marksDeducted: 2, teacherAnnotation: '× y = 7', mistakeType: null },
    ] });
    assert.deepEqual([r.result.annotatedSteps[1].status, r.result.annotatedSteps[1].mistakeType], ['incorrect', null], s.id + ': no invented type');
    assert.equal(r.result.marksLostByType.untyped, 2, s.id);
    assert.ok(counterOf('kept_untyped') > before, s.id + ': grading.untyped_loss.kept_untyped counted');
  });
}

/* MISSING-TYPE-1 review round 1 (coordinator, 5 Nov 2026, at 50dcaa10) — three labelling defects, one test per repro. */
const ASKED_FORMULA_TEXT = 'State the formula for the nth term of an AP and find the 10th term of 2, 5, 8, …';
const SOLVE_VERIFY_TEXT = 'Solve 2x + 3 = 11 and verify your answer.';
const rv = (description, studentWork, status, marksAvailable, marksAwarded, mistakeType = null) => ({ description, studentWork, status, marksAvailable, marksAwarded, marksDeducted: marksAvailable - marksAwarded, teacherAnnotation: status === 'correct' ? '✓' : '×', mistakeType });
const apWith = (work, status, type) => () => [rv('Identify a, d and the nth-term formula', work, status, 0.5, 0, type), rv('Substitute and solve for n', work, status, 1, 0, type), rv('Final answer', '47 is the 15th term.', 'correct', 0.5, 0.5)];
for (const s of SURFACES) {
  test('MISSING-TYPE-1 review 1 — ' + s.id + ': a blank step the QUESTION ASKS FOR ("State the formula …") is NOT ATTEMPTED, never working not shown', async () => {
    for (const [status, type] of [['missing', null], ['unattempted', null], ['missing', 'presentation']]) {
      const r = await drive(s, { mutateTarget: withMarks(2, ASKED_FORMULA_TEXT), acceptsV2: true, targetSteps: () => [rv('State the formula for nth term', '', status, 0.5, 0, type), rv('10th term', 'a10 = 2 + 9 × 3 = 29', 'correct', 1.5, 1.5)] });
      const tag = s.id + ' ' + status + '/' + type;
      assert.deepEqual([r.result.annotatedSteps[0].status, r.result.annotatedSteps[0].mistakeType], ['unattempted', null], tag);
      assert.deepEqual([r.result.marksAwarded, r.result.marksLostByType.unattempted, r.result.marksLostByType.presentation, r.result.marksLostByType.untyped], [1.5, 0.5, 0, 0], tag);
    }
  });
  test('MISSING-TYPE-1 review 2 — ' + s.id + ': "… and verify your answer" — a blank VERIFY step between two right lines is NOT ATTEMPTED (the gap rule never takes an asked item), and so is one in last place', async () => {
    for (const order of ['middle', 'last']) {
      const steps = [rv('Subtract 3 from both sides', '2x = 8', 'correct', 1, 1), rv('Verify by substitution', '', 'missing', 1, 0), rv('Solve for x', 'x = 4', 'correct', 1, 1)];
      if (order === 'last') steps.push(steps.splice(1, 1)[0]);
      const r = await drive(s, { mutateTarget: withMarks(3, SOLVE_VERIFY_TEXT), acceptsV2: true, targetSteps: () => steps });
      const v = r.result.annotatedSteps.find((st) => st.description === 'Verify by substitution');
      assert.deepEqual([v.status, v.mistakeType], ['unattempted', null], s.id + ' ' + order);
      assert.deepEqual([r.result.marksAwarded, r.result.marksLostByType.unattempted, r.result.marksLostByType.presentation], [2, 1, 0], s.id + ' ' + order);
    }
  });
  test('MISSING-TYPE-1 review 3 — ' + s.id + ': a MODEL PLACEHOLDER ("Not shown", "(no working shown)", "Working not shown", "No working", "Not attempted") is blank work: AP stays 0.5/2, exam technique 1½, for every reading', async () => {
    for (const ph of ['Not shown', '(no working shown)', 'Working not shown', 'No working', 'Not attempted']) {
      for (const [status, type] of [['unattempted', null], ['missing', null], ['missing', 'presentation']]) {
        const r = await drive(s, { mutateTarget: apTarget, targetSteps: apWith(ph, status, type), acceptsV2: true });
        const tag = s.id + ' "' + ph + '" ' + status + '/' + type;
        assert.equal(r.result.marksAwarded, 0.5, tag + ': never 1/2 (the cap) and never a whole Not attempted');
        assert.deepEqual(r.result.annotatedSteps.map((st) => [st.status, st.mistakeType]), [['missing', 'presentation'], ['missing', 'presentation'], ['correct', null]], tag);
        assert.deepEqual(r.result.marksLostByType, { ...zeroLostOf(), presentation: 1.5 }, tag);
      }
    }
    // CONTROL: a STUDENT'S "Don't know" stays ruling 7's — Not attempted, never exam technique
    const dk = await drive(s, { mutateTarget: apTarget, targetSteps: () => { const st = apWith('', 'missing', null)(); st[0].studentWork = "Don't know"; return st; }, acceptsV2: true });
    assert.deepEqual([dk.result.annotatedSteps[0].status, dk.result.annotatedSteps[0].mistakeType], ['unattempted', null], s.id + ': "Don\'t know" is the student\'s non-attempt');
  });
  test('MISSING-TYPE-1 review (lower) — ' + s.id + ': a BLANK working step the model judged "incorrect" before a right answer is handled like missing: exam technique, 0.5/2', async () => {
    const r = await drive(s, { mutateTarget: apTarget, targetSteps: apWith('', 'incorrect', null), acceptsV2: true });
    assert.equal(r.result.marksAwarded, 0.5, s.id);
    assert.deepEqual(r.result.marksLostByType, { ...zeroLostOf(), presentation: 1.5 }, s.id);
  });
}

/* MISSING-TYPE-1 review round 2 (coordinator, at 1fb17753): placeholder words are blank only on a step the model
   reported absent — a student's own wrong "None" / "NA" / "missing" on a step judged "incorrect" is an attempt. */
for (const s of SURFACES) {
  test('MISSING-TYPE-1 review 2b — ' + s.id + ': a student\'s own wrong "None" on an INCORRECT working step stays as the model judged it (never exam technique); "Not shown" on a missing step is still blank', async () => {
    for (const word of ['None', 'NA', 'missing']) {
      const r = await drive(s, { mutateTarget: apTarget, acceptsV2: true, targetSteps: () => [
        rv('Identify a, d and the nth-term formula', word, 'incorrect', 0.5, 0), rv('Substitute and solve for n', '47 = 5 + (n − 1)3, n = 15', 'correct', 1, 1), rv('Final answer', '47 is the 15th term.', 'correct', 0.5, 0.5)] });
      assert.deepEqual([r.result.annotatedSteps[0].status, r.result.annotatedSteps[0].mistakeType], ['incorrect', null], s.id + ' "' + word + '"');
      assert.equal(r.result.marksLostByType.presentation, 0, s.id + ' "' + word + '": no exam technique invented');
      assert.equal(r.result.marksAwarded, 1.5, s.id);
    }
    const ph = await drive(s, { mutateTarget: apTarget, acceptsV2: true, targetSteps: apWith('None', 'missing', null) });
    assert.deepEqual(ph.result.marksLostByType, { ...zeroLostOf(), presentation: 1.5 }, s.id + ': the same word on a step the MODEL reported missing is a placeholder');
  });
}

/* MISSING-TYPE-1 × GRADER-CREDIT-1 (#1583) — rebase check (coordinator, 5 Nov 2026): #1583 gives an EQUAL final answer in
   another form its mark back AFTER the cap. Blank working before it must still be exam technique, never given back by
   the cap, and the tag must follow the final state. GC1-EQ-4-5A ("4.5 A" for the key "4.54 A") with its working blank. */
const eqBlankWorking = (status, mistakeType) => () => [
  rv('Relation between power, voltage and current', '', status, 1, 0, mistakeType),
  rv('Substitution of P and V', '', status, 1, 0, mistakeType),
  { ...GC1['GC1-EQ-4-5A'].modelReply[1] },
];
for (const s of SURFACES) {
  test('MISSING-TYPE-1 × #1583 — ' + s.id + ': "4.5 A" for the key "4.54 A" with the working blank — the equal answer keeps its mark, the working is exam technique 2 (never given back by the cap), whatever the model\'s reading', async () => {
    for (const [status, type] of [['missing', 'presentation'], ['missing', null], ['unattempted', null]]) {
      const r = await drive(s, { mutateTarget: (view, req) => { gcTarget('GC1-EQ-4-5A')(view, req); view.marks = 3; }, targetSteps: eqBlankWorking(status, type), targetExtra: gcExtra('GC1-EQ-4-5A'), acceptsV2: true });
      const tag = s.id + ' ' + status + '/' + type;
      if (carriesKey(s)) {
        assert.deepEqual(typesOf(r.result), [['missing', 0, 'presentation'], ['missing', 0, 'presentation'], ['correct', 1, null]], tag);
        assert.deepEqual([r.result.marksAwarded, r.result.marksLostByType.presentation, r.result.marksLostByType.untyped], [1, 2, 0], tag + ': 1/3 — the cap gives nothing back for working not shown');
      } else {
        // no key on this surface: #1583's guard does not fire, the final answer stays as the model judged it (wrong),
        // so the working is not "before a right answer" — nothing is typed working-not-shown on its account
        assert.equal(r.result.annotatedSteps[2].status, 'incorrect', tag);
        assert.equal(r.result.marksLostByType.untyped, 0, tag + ': still never "reason not recorded"');
      }
    }
  });
}
