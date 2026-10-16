/**
 * tutor.test.cjs — TUTOR-FIX-1: the Tutor's model call and its honest cut-off signal.
 *
 * Run: `node --test server/routes/tutor.test.cjs`
 *
 * The defect: the Tutor called gemini with maxOutputTokens 900 and no thinking setting, so
 * thinking tokens came out of the same budget and replies stopped mid-sentence (eval,
 * ops/evals/tutor-fix-1: 8 of 30 at MAX_TOKENS). Each test below was RED before the fix.
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createTutorRoute, TUTOR_CALL_CONFIG } = require('./tutor.cjs');

function harness(geminiReply) {
  const calls = [];
  const route = createTutorRoute({
    sendJson: (res, status, body) => { res.status = status; res.body = body; },
    readJson: async (req) => req.body,
    callGemini: async (model, contents, cfg) => {
      calls.push({ model, cfg });
      return geminiReply;
    },
    GEMINI_TUTOR_MODEL: 'gemini-2.5-flash',
    GEMINI_MODEL: 'gemini-2.5-flash',
    ACTIVE_PROVIDER: 'gemini',
    isStubMode: () => false,
  });
  async function ask() {
    const res = {};
    await route.handleTutorRequest(
      { body: { subject: 'science', topicKey: 'electricity', topicLabel: 'Electricity', messages: [{ role: 'student', content: 'Why does R double when length doubles?' }] } },
      res,
    );
    return res;
  }
  return { calls, ask };
}

test('the Tutor call turns thinking off and keeps temperature 0.55; TUTOR-FIX-2 T3 raises the cap to 1600 tokens', async () => {
  const h = harness({ text: 'Because R = ρl/A.', finishReason: 'STOP' });
  await h.ask();
  assert.equal(h.calls.length, 1);
  assert.deepEqual(h.calls[0].cfg, { temperature: 0.55, maxOutputTokens: 1600, thinkingConfig: { thinkingBudget: 0 } });
  assert.equal(h.calls[0].cfg, TUTOR_CALL_CONFIG);
});

test('finishReason MAX_TOKENS reaches the response as truncated: true', async () => {
  const res = await harness({ text: 'Resistance depends on the length because', finishReason: 'MAX_TOKENS' }).ask();
  assert.equal(res.status, 200);
  assert.equal(res.body.truncated, true);
});

test('a complete reply (STOP, or no finishReason) is truncated: false', async () => {
  for (const finishReason of ['STOP', null, undefined]) {
    const res = await harness({ text: 'Because R = ρl/A.', finishReason }).ask();
    assert.equal(res.body.truncated, false, String(finishReason));
  }
});

test('the offer tag is still extracted from the reply', async () => {
  const res = await harness({ text: 'R = ρl/A, so doubling l doubles R.\n[[offer:practice]]', finishReason: 'STOP' }).ask();
  assert.equal(res.body.offer, 'practice');
  assert.equal(/\[\[/.test(res.body.reply), false);
});

/* ── TUTOR-FIX-2 (server lane S-A) ─────────────────────────────────────────────────────────── */

const { detectOfferIntent, normalizeBrief, mentionsDiagram } = require('./tutor.cjs');

function routeWith(geminiReply, telemetryEvents) {
  const prompts = [];
  const route = createTutorRoute({
    sendJson: (res, status, body) => { res.status = status; res.body = body; },
    readJson: async (req) => req.body,
    callGemini: async (model, contents) => {
      // system prompt + primer + conversation, as the model receives them
      prompts.push(contents.map((c) => c.parts[0].text).join('\n'));
      return geminiReply;
    },
    GEMINI_TUTOR_MODEL: 'gemini-2.5-flash',
    GEMINI_MODEL: 'gemini-2.5-flash',
    ACTIVE_PROVIDER: 'gemini',
    isStubMode: () => false,
    telemetry: { increment: (e) => telemetryEvents && telemetryEvents.push(e) },
  });
  async function send(body) {
    const res = {};
    await route.handleTutorRequest({ body: { subject: 'maths', topicKey: 'real-numbers', topicLabel: 'Real Numbers', ...body } }, res);
    return res;
  }
  return { prompts, send };
}

// T11 — the intent table, phrasings from the live probes (addendum v2 + v3) plus the extras.
const CHECK_PHRASES = [
  'Can you check my answer?',
  'Yes, I will show my working. Open Check & Improve',
  'I want to upload a photo of my answer sheet and get it graded',
  'Mera answer check karo, kitne marks milenge?',
  'grade my answer',
  'Find the zeroes of x^2 - 5x + 6. My answer: (x-2)(x-3), zeroes 2 and 3. How many marks would I get?',
  'en answer check pannunga',
  'naa answer check cheyyandi, enni marks vastayi?',
  'is my answer right?',
  'mark this out of 3',
  'upload',
  'मेरा उत्तर जाँच दो, कितने अंक मिलेंगे?',
];
const PRACTICE_PHRASES = [
  'Give me some practice questions on this chapter',
  'Test me with 5 questions',
  'mujhe is chapter ki practice karni hai',
  'ok got it, now quiz me',
  'I keep losing marks in this chapter, what should I do?',
  'aur sawal do board jaise',
  'मुझे इस अध्याय के सवाल दो',
];
const NEUTRAL_PHRASES = [
  'show me how this is solved',
  'can you give me an example?',
  'what would a board question on this look like?',
  'walk me through one',
  'explain step 2',
  'what is the fundamental theorem of arithmetic?',
  'whats my biggest mistake',
  'which concept in Real Numbers do I get wrong',
  'what do toppers do',
  'just tell me which question I got wrong last week',
  'I have a few questions about refraction',
];

test('T11 detectOfferIntent: every check-improve phrasing -> check-improve', () => {
  for (const p of CHECK_PHRASES) assert.equal(detectOfferIntent(p)?.offer, 'check-improve', p);
});

test('T11 detectOfferIntent: every practice phrasing -> practice', () => {
  for (const p of PRACTICE_PHRASES) assert.equal(detectOfferIntent(p)?.offer, 'practice', p);
});

test('T11 detectOfferIntent: teaching / data / general asks -> no offer', () => {
  for (const p of NEUTRAL_PHRASES) assert.equal(detectOfferIntent(p), null, p);
});

test('T11 detectOfferIntent: a bare "yes" follows the tutor\'s own offer, and only then', () => {
  const ci = 'You can upload it in Check & Improve and get it board-marked. Would you like to do that?';
  const pr = 'Want to try a couple on this?';
  assert.equal(detectOfferIntent('yes please', { prevTutor: ci })?.offer, 'check-improve');
  assert.equal(detectOfferIntent('haan', { prevTutor: pr })?.offer, 'practice');
  assert.equal(detectOfferIntent('yes', { prevTutor: 'Want to see how a question like this is solved?' }), null);
  assert.equal(detectOfferIntent('yes please'), null);
  // Review fix: ordinary teaching lines are not practice offers; explicit offers still are.
  for (const prev of [
    'Try one more step: divide both sides by 2. Does that make sense?',
    'Try 2 as a factor first. Shall I go on?',
    'This is the idea a board quiz usually tests. Clear?',
  ]) assert.equal(detectOfferIntent('yes', { prevTutor: prev }), null, prev);
  for (const prev of [
    'I can give you a couple of questions to try. Want them?',
    'Want to practise a few on this?',
    'Shall we do a quick practice set?',
  ]) assert.equal(detectOfferIntent('yes', { prevTutor: prev })?.rule, 'yes-to-practice-offer', prev);
});

test('Review fix: "is that correct?" needs the student\'s own work nearby', () => {
  for (const p of ['so sin = p/h, is that correct?', 'and the HCF divides the LCM, is that right?']) {
    assert.equal(detectOfferIntent(p), null, p);
  }
  for (const p of [
    'My answer is x = 3, is that correct?',
    'Here is my working: 2x = 6 so x = 3. Is this right?',
    'is this right? my solution: x = 3',
    'did I do it right?',
  ]) assert.equal(detectOfferIntent(p)?.offer, 'check-improve', p);
});

test('T11 safety net: no model tag + a check ask -> offer check-improve, counted', async () => {
  const events = [];
  const res = await routeWith({ text: 'Check & Improve gives you the board mark for that.', finishReason: 'STOP' }, events)
    .send({ messages: [{ role: 'student', content: 'Mera answer check karo, kitne marks milenge?' }] });
  assert.equal(res.body.offer, 'check-improve');
  assert.equal(res.body.offerSource, 'safety-net');
  assert.deepEqual(events, ['tutor.offer_safety_net.check-improve']);
});

test('T11 safety net: "yes please" after the tutor\'s own C&I question -> offer check-improve', async () => {
  const res = await routeWith({ text: 'Great, open it below.', finishReason: 'STOP' }).send({
    messages: [
      { role: 'student', content: 'I want to get my sheet looked at' },
      { role: 'tutor', content: 'You can upload a photo in Check & Improve and get it board-marked. Would you like to do that?' },
      { role: 'student', content: 'yes please' },
    ],
  });
  assert.equal(res.body.offer, 'check-improve');
});

test('T11 safety net never overrides a model tag, and stays silent on a teaching ask', async () => {
  const events = [];
  const a = await routeWith({ text: 'Here is a set.\n[[offer:practice]]', finishReason: 'STOP' }, events)
    .send({ messages: [{ role: 'student', content: 'check my answer and then give me more questions' }] });
  assert.equal(a.body.offer, 'practice');
  assert.equal(a.body.offerSource, 'model');
  const b = await routeWith({ text: 'Step 1: ...', finishReason: 'STOP' }, events)
    .send({ messages: [{ role: 'student', content: 'show me how this is solved' }] });
  assert.equal(b.body.offer, null);
  assert.deepEqual(events, []);
});

test('T11 the safety net reads what the student typed, not the language directive', async () => {
  const res = await routeWith({ text: 'Sure.', finishReason: 'STOP' })
    .send({ language: 'Hindi', messages: [{ role: 'student', content: 'explain HCF' }] });
  assert.equal(res.body.offer, null);
});

// T4 — counter only; the reply is never rewritten.
test('T4 a diagram claim without a valid figure tag is counted, the text untouched', async () => {
  const events = [];
  const text = 'Look at the diagram beside us: the ray bends towards the normal.';
  const res = await routeWith({ text, finishReason: 'STOP' }, events)
    .send({ messages: [{ role: 'student', content: 'explain refraction' }] });
  assert.equal(res.body.reply, text);
  assert.deepEqual(events, ['tutor.diagram_claim_without_tag']);
});

test('T4 a diagram claim WITH a valid figure tag is not counted', async () => {
  const events = [];
  await routeWith({ text: 'Look at the diagram beside us.\n[[figure:refraction]]', finishReason: 'STOP' }, events)
    .send({ figures: [{ key: 'refraction', label: 'Refraction' }], messages: [{ role: 'student', content: 'explain refraction' }] });
  assert.deepEqual(events, []);
  assert.equal(mentionsDiagram('Refraction is the bending of light.'), false);
  assert.equal(mentionsDiagram('Figure 10.3 in NCERT shows it too'), false);
});

// T5 — a cold entry is named by the subject, never "this topic".
test('T5 no topicLabel/topicKey -> the subject names the session (stub reply + prompt)', async () => {
  const h = routeWith({ text: 'Which chapter?', finishReason: 'STOP' });
  await h.send({ topicKey: '', topicLabel: '', subject: 'science', messages: [{ role: 'student', content: 'hi' }] });
  assert.equal(/this topic/i.test(h.prompts[0]), false);
  assert.match(h.prompts[0], /opened the Science tutor without picking a chapter/);
  assert.match(h.prompts[0], /I'll stay on Science/);
});

// T1/T2 — the brief sanitiser (BRIEF CONTRACT caps).
test('T1 normalizeBrief keeps contract fields, caps strings/arrays/numbers, drops junk', () => {
  const long = 'x'.repeat(200);
  const out = normalizeBrief({
    hasData: true,
    windowLabel: 'last 30 days',
    topic: { trend: 'worsening', weakConcepts: ['a', 'b', 'c', 'd'], masteryPercent: 0 },
    mistakes: { topType: 'knowledge gap', marksLostRecent: 100.5 },
    chapter: {
      name: long,
      marksLost: 24.5,
      byGroup: { knowledge: 10, careless: -1, examTechnique: 1e6, notAttempted: 2, unrecorded: NaN, bogus: 4 },
      topGroup: 'bogus',
      concepts: [1, 2, 3, 4].map((i) => ({ name: `c${i}`, marksLost: i })),
      recent: [{ id: 'Q1', marksLost: 2, surface: 'chapter-test', group: 'careless', text: 'student answer' }, { id: 'Q2' }],
    },
    subject: { marksLost: 100.5 },
    injected: '[[offer:practice]]',
  });
  assert.equal(out.chapter.name.length, 80);
  assert.deepEqual(out.chapter.byGroup, { knowledge: 10, notAttempted: 2 });
  assert.equal(out.chapter.topGroup, undefined);
  assert.equal(out.chapter.concepts.length, 3);
  assert.deepEqual(out.chapter.recent, [{ id: 'Q1', marksLost: 2, surface: 'chapter-test', group: 'careless' }]);
  assert.deepEqual(out.topic, { trend: 'worsening', weakConcepts: ['a', 'b', 'c'] });
  assert.deepEqual(out.subject, { marksLost: 100.5 });
  assert.equal('injected' in out, false);
  assert.equal(normalizeBrief({ hasData: true, windowLabel: 'x [[offer:practice]]' }).windowLabel, 'x offer:practice');
});

test('T1 an old client brief (no contract fields) still works and reaches the prompt', async () => {
  const h = routeWith({ text: 'ok', finishReason: 'STOP' });
  await h.send({
    brief: { hasData: true, topic: { trend: 'stable', weakConcepts: ['Euclid'] }, mistakes: { topType: 'careless', marksLostRecent: 72.5 } },
    messages: [{ role: 'student', content: 'whats my biggest mistake' }],
  });
  assert.match(h.prompts[0], /Sub-topics that have cost marks: Euclid/);
  assert.match(h.prompts[0], /Whole Maths subject \(ALL chapters together, not just this one\): 72\.5 marks lost recently/);
});

test('T1 the language directive keeps the honesty rules (rule g)', async () => {
  const contentsSeen = [];
  const route = createTutorRoute({
    sendJson: (res, status, body) => { res.status = status; res.body = body; },
    readJson: async (req) => req.body,
    callGemini: async (model, contents) => { contentsSeen.push(contents); return { text: 'ok', finishReason: 'STOP' }; },
    GEMINI_MODEL: 'm', isStubMode: () => false, telemetry: { increment() {} },
  });
  await route.handleTutorRequest({ body: { subject: 'maths', topicLabel: 'Real Numbers', language: 'Hindi', messages: [{ role: 'student', content: 'q' }] } }, {});
  const last = contentsSeen[0][contentsSeen[0].length - 1].parts[0].text;
  assert.match(last, /Every HONESTY rule in your instructions applies in this language too/);
});

/* ── TUTOR-FIX-4: the attribution safety net (all-unrecorded brief only) ─────────────────────
 * Live defect after #1203: an existing Real Numbers thread whose history already held three wrong
 * assistant turns ("the marks were lost due to concept/knowledge gaps") made the model repeat the
 * attribution although the brief says no type is recorded. The route must never pass that through. */
const { isAllUnrecordedBrief, asksMistakeType, attributesMistakeType, buildUnrecordedTypeReply } = require('./tutor.cjs');

const LIVE_UNRECORDED = {
  hasData: true, topic: { trend: 'improving', weakConcepts: ['Fundamental Theorem of Arithmetic'] },
  mistakes: { marksLostRecent: 7 }, windowLabel: 'last 30 days', subject: { marksLost: 7 },
  chapter: {
    marksLost: 7, byGroup: { knowledge: 0, careless: 0, examTechnique: 0, notAttempted: 0, unrecorded: 7 },
    concepts: [{ name: 'Fundamental Theorem of Arithmetic', marksLost: 5 }], name: 'Real Numbers',
  },
};
const MIXED_BRIEF = {
  hasData: true, windowLabel: 'last 30 days',
  chapter: { name: 'Real Numbers', marksLost: 8, byGroup: { knowledge: 3, careless: 0, examTechnique: 1, notAttempted: 0, unrecorded: 4 } },
};
const WRONG_TURN = 'In the last 30 days you lost 7 marks in Real Numbers, and the marks were lost due to concept/knowledge gaps. There were no marks lost due to careless slips.';
const WRONG_HISTORY = [
  { role: 'student', content: 'what are my mistakes in real numbers?' }, { role: 'tutor', content: WRONG_TURN },
  { role: 'student', content: 'which concept?' }, { role: 'tutor', content: 'Fundamental Theorem of Arithmetic, 5 marks. The marks were lost due to concept/knowledge gaps.' },
  { role: 'student', content: 'ok' }, { role: 'tutor', content: 'Those marks were lost due to concept/knowledge gaps, so revise the theorem.' },
];

test('TF4 isAllUnrecordedBrief: only when every lost chapter mark is unrecorded', () => {
  assert.equal(isAllUnrecordedBrief(normalizeBrief(LIVE_UNRECORDED)), true);
  assert.equal(isAllUnrecordedBrief(normalizeBrief(MIXED_BRIEF)), false);
  assert.equal(isAllUnrecordedBrief(normalizeBrief({ hasData: true, chapter: { byGroup: { careless: 2 } } })), false);
  assert.equal(isAllUnrecordedBrief(normalizeBrief({ hasData: false })), false);
  assert.equal(isAllUnrecordedBrief(null), false);
  assert.equal(isAllUnrecordedBrief(normalizeBrief({ hasData: true, chapter: { byGroup: { unrecorded: 0 } } })), false);
});

test('TF4 attributesMistakeType table (English + Hinglish)', () => {
  const YES = [
    'the marks were lost due to concept/knowledge gaps.',
    'These were conceptual gaps, not careless.',
    'Your mistakes are concept or knowledge gaps.',
    'It was a knowledge gap.',
    'There were no marks lost due to careless slips.',
    'mostly careless mistakes',
    'you lost marks to exam technique',
    'just silly slips',
    'a silly mistake here',
    'ye concept galti thi',
    'tumhari careless galti hai',
    'Concept / knowledge gap',
  ];
  const NO = [
    'In the last 30 days you lost 7 marks in Real Numbers.',
    'Let us revise the Fundamental Theorem of Arithmetic.',
    'HCF x LCM = product of the two numbers.',
    'Can you tell me which concept confuses you?',
  ];
  for (const s of YES) assert.equal(attributesMistakeType(s), true, s);
  for (const s of NO) assert.equal(attributesMistakeType(s), false, s);
});

test('TF4 asksMistakeType table (English + Hinglish)', () => {
  const YES = [
    'are my mistakes in real numbers careless or concept?',
    'last 2 weeks careless or concept?',
    'kya meri galtiyan careless hain?',
    'am I making silly mistakes?',
    'concept galti hai ya careless galti?',
    'what type of mistakes do I make?',
    'is it a concept gap?',
    'conceptual or careless?',
  ];
  const NO = ['explain this concept', 'what is HCF?', 'whats my biggest mistake', 'Give me some practice questions on this chapter'];
  for (const s of YES) assert.equal(asksMistakeType(s), true, s);
  for (const s of NO) assert.equal(asksMistakeType(s), false, s);
});

test('TF4 buildUnrecordedTypeReply uses the brief figures, never a type', () => {
  const text = buildUnrecordedTypeReply(normalizeBrief(LIVE_UNRECORDED), 'Real Numbers');
  assert.match(text, /^In the last 30 days you lost 7 marks in Real Numbers\./);
  assert.match(text, /No mistake type is recorded for them/);
  assert.match(text, /Check & Improve/);
  assert.doesNotMatch(text, /due to|were (concept|careless|knowledge)|no marks/i);
  const noWindow = buildUnrecordedTypeReply(normalizeBrief({ ...LIVE_UNRECORDED, windowLabel: undefined }), 'Real Numbers');
  assert.match(noWindow, /^Recently you lost 7 marks in Real Numbers\./);
});

test('TF4 RED->GREEN: the live defect reply (wrong history) is replaced, offer=check-improve, counter logged', async () => {
  const events = [];
  const h = routeWith({ text: `${WRONG_TURN}\n[[offer:practice]]`, finishReason: 'STOP' }, events);
  const res = await h.send({ brief: LIVE_UNRECORDED, messages: [...WRONG_HISTORY, { role: 'student', content: 'are my mistakes in real numbers careless or concept?' }] });
  assert.equal(res.status, 200);
  assert.equal(res.body.reply, buildUnrecordedTypeReply(normalizeBrief(LIVE_UNRECORDED), 'Real Numbers'));
  assert.doesNotMatch(res.body.reply, /due to concept|no marks lost due to careless/i);
  assert.match(res.body.reply, /lost 7 marks in Real Numbers/);
  assert.equal(res.body.offer, 'check-improve');
  assert.equal(res.body.offerSource, 'attribution-override');
  assert.ok(events.includes('tutor.attribution_override'));
});

test('TF4 the student asking careless-vs-concept in the all-unrecorded case gets the honest template even if the model wandered', async () => {
  const h = routeWith({ text: 'Good question! Let us look at HCF first.', finishReason: 'STOP' }, []);
  const res = await h.send({ brief: LIVE_UNRECORDED, messages: [{ role: 'student', content: 'kya meri galtiyan careless hain?' }] });
  assert.match(res.body.reply, /No mistake type is recorded/);
  assert.equal(res.body.offer, 'check-improve');
});

test('TF4 narrow: mixed brief, no-data brief and a non-type reply pass through untouched', async () => {
  const events = [];
  const mixed = await routeWith({ text: 'The marks were lost due to concept/knowledge gaps.', finishReason: 'STOP' }, events)
    .send({ brief: MIXED_BRIEF, messages: [{ role: 'student', content: 'careless or concept?' }] });
  assert.equal(mixed.body.reply, 'The marks were lost due to concept/knowledge gaps.');
  const plain = await routeWith({ text: 'HCF is the highest common factor.', finishReason: 'STOP' }, events)
    .send({ brief: LIVE_UNRECORDED, messages: [{ role: 'student', content: 'what is HCF?' }] });
  assert.equal(plain.body.reply, 'HCF is the highest common factor.');
  assert.equal(events.includes('tutor.attribution_override'), false);
});

test('TF4 history hygiene: an all-unrecorded brief appends the brief-wins note to the last turn sent to the model', async () => {
  const h = routeWith({ text: 'ok', finishReason: 'STOP' }, []);
  await h.send({ brief: LIVE_UNRECORDED, messages: [...WRONG_HISTORY, { role: 'student', content: 'what next?' }] });
  assert.match(h.prompts[0], /the student-data brief wins/i);
  const h2 = routeWith({ text: 'ok', finishReason: 'STOP' }, []);
  await h2.send({ brief: MIXED_BRIEF, messages: [{ role: 'student', content: 'what next?' }] });
  assert.doesNotMatch(h2.prompts[0], /the student-data brief wins/i);
});
