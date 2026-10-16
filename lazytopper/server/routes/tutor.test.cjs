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
