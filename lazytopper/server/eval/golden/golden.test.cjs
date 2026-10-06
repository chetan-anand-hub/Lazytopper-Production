'use strict';
// golden.test.cjs — G1 (the zero-call golden gate) and the golden data, tested. Zero model calls.
//
// Pins DECISIONS, not framework behaviour: the network block fires on every outbound path
// (and a real geminiClient call is stopped by it), the stored baseline replays faithfully,
// the gate passes today and FAILS — naming the metric — when a floor or an owner-paper
// expectation is crossed, the owner rulings are applied exactly once with their guard, and
// the truth data is internally consistent.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const GOLDEN = __dirname;
const LAZY = path.join(GOLDEN, '..', '..', '..');
const GATE = path.join(GOLDEN, 'goldenGate.cjs');
const floor = JSON.parse(fs.readFileSync(path.join(GOLDEN, 'floor.json'), 'utf8'));

function node(args, opts = {}) {
  return spawnSync(process.execPath, args, { cwd: LAZY, encoding: 'utf8', timeout: 240000, env: { ...process.env, API_KEY: '', AI_PROVIDER: '' }, ...opts });
}

// ── §1 the network block ────────────────────────────────────────────────────
test('§1 NETWORK BLOCK — every outbound path throws, and a REAL geminiClient call is stopped by it', () => {
  const script = `
    const nb = require(${JSON.stringify(path.join(GOLDEN, 'lib', 'netblock.cjs'))});
    nb.install();
    const tries = [];
    const t = async (name, fn) => { try { await fn(); tries.push(name + ':NOT-BLOCKED'); } catch (e) { tries.push(name + ':' + (e && e.code)); } };
    (async () => {
      await t('fetch', () => fetch('https://generativelanguage.googleapis.com/v1beta/models/x:generateContent'));
      await t('http.get', () => require('http').get('http://example.com'));
      await t('https.request', () => require('https').request('https://example.com'));
      await t('net.connect', () => require('net').connect(443, 'example.com'));
      await t('socket.connect', () => new (require('net').Socket)().connect(443, 'example.com'));
      await t('tls.connect', () => require('tls').connect(443, 'example.com'));
      await t('dns.lookup', () => require('dns').lookup('example.com', () => {}));
      const { createGeminiClient } = require(${JSON.stringify(path.join(LAZY, 'server', 'services', 'geminiClient.cjs'))});
      const gem = createGeminiClient({ GEMINI_API_KEY: 'k', DIRECT_GEMINI_API_KEY: 'k', HAS_REPLIT_PROXY: false, GEMINI_TIMEOUT_MS: 5000,
        telemetry: { increment() {}, recordWorkloadSample() {} }, usageLedger: { recordUsage() { return null; } } });
      await t('geminiClient.callGemini', () => gem.callGemini('gemini-2.5-flash', [{ role: 'user', parts: [{ text: 'x' }] }], {}));
      console.log(JSON.stringify({ tries, attempts: nb.attempts() }));
    })();`;
  const r = node(['-e', script]);
  assert.strictEqual(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout.trim().split('\n').pop());
  for (const x of out.tries) assert.match(x, /:ENETBLOCKED$/, 'not blocked: ' + x);
  assert.strictEqual(out.tries.length, 8);
  assert.ok(out.attempts >= 8, 'every blocked attempt must be COUNTED (the gate prints this as calls=); got ' + out.attempts);
});

// ── §2 the gate on the committed baseline ───────────────────────────────────
test('§2 G1 GATE — replays the committed baseline with calls=0 and verdict=PASS', () => {
  const r = node([GATE]);
  const line = (r.stdout.split('\n').find((l) => l.startsWith('GOLDEN: ')) || '');
  assert.ok(line, 'no GOLDEN line; stdout: ' + r.stdout.slice(0, 500));
  assert.match(line, / calls=0 /, line);
  assert.match(line, / changed=0 /, 'the stored baseline must replay byte-identically through today\'s post-processing: ' + line);
  assert.match(line, / verdict=PASS$/, line + '\n' + r.stdout);
  assert.strictEqual(r.status, 0);
  for (const k of Object.keys(floor.metrics)) assert.match(line, new RegExp(' ' + k + '='), 'metric ' + k + ' missing from the GOLDEN line');
});

// ── §3 the floor can fail, and names the metric ─────────────────────────────
test('§3 CONTROL — a floor one notch above today fails the gate and NAMES the metric', () => {
  const tmp = path.join(os.tmpdir(), 'golden-floor-control-' + process.pid + '.json');
  // "Today" is what the gate MEASURES on the current code, read from its own --json output —
  // not the floor file's value, which equals today only until post-processing changes
  // (GRADER-CORE-1 PR-2 replays the PR-1 run through new post-processing; the floor becomes
  // the acceptance bar, above or below today's number).
  const today = path.join(os.tmpdir(), 'golden-today-' + process.pid + '.json');
  node([GATE, '--json', today]);
  const measured = JSON.parse(fs.readFileSync(today, 'utf8')).metrics;
  fs.unlinkSync(today);
  const raised = JSON.parse(JSON.stringify(floor));
  raised.metrics.total_exact = Math.round((Number(measured.total_exact) + 0.1) * 10) / 10;
  fs.writeFileSync(tmp, JSON.stringify(raised));
  try {
    const r = node([GATE, '--floor', tmp]);
    assert.strictEqual(r.status, 1, 'a raised floor must FAIL the gate');
    assert.match(r.stdout, /verdict=FAIL/);
    assert.match(r.stdout, /below floor: total_exact=/, 'the failing metric must be named: ' + r.stdout);
  } finally { fs.unlinkSync(tmp); }
});

// ── §4 replay fidelity + owner paper control, in-process ────────────────────
test('§4 replay fidelity, and the owner-paper within-1/2 check FAILS when an expected owner mark moves', async () => {
  const quiet = { warn: console.warn, error: console.error };
  console.warn = () => {}; console.error = () => {};
  try {
    const { evaluateRun } = require('./lib/evaluate.cjs');
    const runDir = path.join(GOLDEN, 'runs', floor.runId);
    const ev = await evaluateRun(runDir);
    assert.strictEqual(ev.integrity.requestDigestMismatch.length, 0, 'every stored request re-derives byte-for-byte');
    assert.strictEqual(ev.integrity.replayIncomplete.length, 0, 'every replay consumes exactly its stored responses');
    assert.strictEqual(ev.integrity.changed, 0, 'today\'s post-processing reproduces every stored live body');
    assert.ok(ev.res.owner.n >= 10, 'the owner paper is in the baseline');
    // The production-setting baseline may never GRADE the owner paper (55 s timeouts), so the
    // owner check is exercised on the committed owner DIAGNOSTIC run (floor.extraRuns), whose
    // outputs are graded. CONTROL (M6 in-suite): move the expected mark of a question the
    // grader got within 1/2 by 1.5 and the within-1/2 rate must drop.
    // GRADER-CORE-1 PR-2: the acceptance run grades the owner paper at PRODUCTION settings
    // (80 s), so the floor run itself carries the graded owner outputs; the PR-1 diagnostic
    // extra run is used only when the floor still names one.
    const diag = (floor.extraRuns || []).find((x) => /owner/.test(x.label));
    const diagDir = diag ? path.join(GOLDEN, 'runs', diag.runId) : runDir;
    const d1 = await evaluateRun(diagDir);
    assert.strictEqual(d1.integrity.changed, 0, 'the owner diagnostic replays byte-identically');
    const graded = d1.res.rows.filter((r) => r.kind === 'owner' && r.status === 'graded');
    assert.ok(graded.length >= 10, 'the owner diagnostic must contain graded owner questions (got ' + graded.length + ')');
    const hit = graded.find((r) => r.withinHalf === true);
    assert.ok(hit, 'no owner question within 1/2 to perturb');
    const before = d1.res.owner.pct;
    const G = require('./lib/data.cjs').load();
    const q = G.owner.questions.find((x) => x.qNumber === Number(hit.caseId.slice(7)));
    const saved = q.expected.totalMarks;
    q.expected.totalMarks = saved + 1.5;
    try {
      const d2 = await evaluateRun(diagDir);
      assert.ok(d2.res.owner.pct < before, 'owner within-1/2 did not drop (' + before + ' -> ' + d2.res.owner.pct + ') — the owner check cannot fail');
    } finally { q.expected.totalMarks = saved; }
  } finally { console.warn = quiet.warn; console.error = quiet.error; }
});

// ── §5 the golden data ──────────────────────────────────────────────────────
test('§5 golden data — counts, sums, labels, locators', () => {
  const G = require('./lib/data.cjs').load();
  assert.strictEqual(G.cases.length, 54, '51 verified + 3 supplement cases');
  for (const c of G.cases) {
    const e = c.expected;
    if (e.totalMarks !== null) {
      const s = e.perStep.reduce((a, p) => a + Number(p.awarded), 0);
      assert.ok(Math.abs(s - e.totalMarks) < 1e-9, c.caseId + ': perStep sums to ' + s + ' not ' + e.totalMarks);
      assert.ok(e.totalMarks >= 0 && e.totalMarks <= c.marks, c.caseId + ' expected out of range');
    }
    if (c.mode === 'image') assert.strictEqual(c.synthetic, true, c.caseId + ' image must be labelled SYNTHETIC');
  }
  const manifest = JSON.parse(fs.readFileSync(path.join(GOLDEN, 'images', 'manifest.json'), 'utf8'));
  for (const [k, v] of Object.entries(manifest)) assert.strictEqual(v.synthetic, true, k + ' manifest entry not labelled synthetic');
  const loc = require('./truth/locators.json').locators;
  for (const c of G.cases) {
    if (c.expected.wrongStep != null && c.expected.totalMarks !== null && !c.objective) assert.ok(loc[c.caseId], c.caseId + ' has a wrong step but no locator');
  }
  const oa = G.owner;
  assert.strictEqual(oa.label, 'REAL');
  assert.strictEqual(oa.questions.length, 10);
  assert.strictEqual(oa.questions.reduce((a, q) => a + q.marks, 0), 24);
  assert.strictEqual(oa.questions.reduce((a, q) => a + q.expected.totalMarks, 0), oa.expectedTotal);
  assert.strictEqual(oa.expectedTotal, 15);
  assert.strictEqual(oa.questions.filter((q) => q.subject === 'Science').length, 4, 'the paper has 4 Science questions (Q5, Q7, Q8, Q10)');
  assert.strictEqual(new Set(oa.questions.map((q) => q.chapterKey)).size, 10, '10 chapters');
  assert.ok(oa.questions.find((q) => q.qNumber === 2).questionText.includes('− 7x'), 'Q2 keeps its minus sign');
  assert.ok(oa.questions.find((q) => q.qNumber === 6).questionText.includes('−3'), 'Q6 keeps its minus sign');
  for (const f of Object.values(oa.files)) assert.ok(fs.existsSync(path.join(GOLDEN, f)), 'missing owner file ' + f);
  for (const p of G.probes.probes) if (p.twin) assert.ok(G.probes.probes.some((x) => x.probeId === p.twin && x.isTwin), p.probeId + ' has no clean twin');
  const vocabSrc = fs.readFileSync(path.join(LAZY, 'src', 'lib', 'desktop', 'topics.ts'), 'utf8');
  for (const v of G.vocab) assert.ok(vocabSrc.includes('"' + v.slug + '"'), 'topic slug ' + v.slug + ' no longer in topics.ts');
});

test('§7 MISMATCH (owner addendum) — cases resolve, and the scorer\'s three checks can pass AND fail', () => {
  const G = require('./lib/data.cjs').load();
  const { buildPlan } = require('./lib/planner.cjs');
  const { score } = require('./lib/score.cjs');
  assert.deepStrictEqual(G.mismatch.map((m) => m.caseId), ['GS-MM-01', 'GS-MM-02', 'GS-MM-03', 'GS-MM-04', 'GS-MM-05', 'GS-MM-06']);
  for (const m of G.mismatch) assert.strictEqual(m.label, 'SYNTHETIC');
  const m5 = G.mismatch.find((m) => m.caseId === 'GS-MM-05');
  assert.strictEqual(m5.resolvedQuestions.filter((q) => q.expected.answerMismatch === true).length, 1, 'M5: exactly ONE mismatched question');
  assert.deepStrictEqual(m5.entries, ['set'], 'M5 is set only');
  assert.strictEqual(G.mismatch.find((m) => m.caseId === 'GS-MM-06').expected.answerMismatch, null, 'M6 is undecidable (null)');
  assert.strictEqual(G.mismatch.find((m) => m.caseId === 'GS-MM-04').expected.answerMismatch, false, 'M4 (partly relevant) is graded normally');
  const job = buildPlan({ filter: (k) => k === 'W.MM.GS-MM-05' })[0];
  assert.ok(job && job.caseIds.length === 4);
  const step = (aw, type) => ({ stepNumber: 1, description: 'd', studentWork: 'w', status: aw > 0 ? 'correct' : 'incorrect', marksAwarded: aw, marksDeducted: 0, teacherAnnotation: '', mistakeType: type, correctedWorking: null });
  const res = (q, aw, extra) => ({ qNumber: q, couldNotRead: false, totalMarks: 2, marksAwarded: aw, annotatedSteps: [step(aw, null)], mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 }, ...extra });
  const run = (results) => score({ items: [{ job, run: 1, record: { calls: [], wallMs: 1 }, rep: { httpStatus: 200, body: { ok: true, results } } }], detectItems: [] }).mismatch;
  // Legacy-shaped response (no field): Q3 scored 0 with no step marks / types -> legacy OK, detect = "not detected".
  const legacy = run([res(1, 2), res(2, 1.5), res(3, 0), res(4, 2.5)]);
  assert.strictEqual(legacy.legacy.pass, 1, 'legacy check must PASS on a 0-mark, untyped Q3');
  assert.strictEqual(legacy.detect.pass, 0, 'no answerMismatch field = not detected');
  assert.strictEqual(legacy.noFalse.pct, 100);
  // Legacy FAIL: Q3 awarded marks.
  assert.strictEqual(run([res(1, 2), res(2, 1.5), res(3, 1), res(4, 2.5)]).legacy.pass, 0, 'legacy check must FAIL when the mismatched answer earns marks');
  // v2-shaped: Q3 flagged and ungraded -> detect PASS; Q1 wrongly flagged -> a FALSE mismatch.
  const v2 = run([res(1, 2, { answerMismatch: true }), res(2, 1.5, { answerMismatch: false }), res(3, 0, { answerMismatch: true }), res(4, 2.5, { answerMismatch: false })]);
  assert.strictEqual(v2.detect.pass, 1, 'a flagged, ungraded Q3 must count as detected');
  assert.ok(v2.noFalse.pct < 100, 'a mismatch flag on a matching answer must count as a FALSE mismatch');
  // Flagged but still given marks is NOT a correct mismatch verdict.
  assert.strictEqual(run([res(1, 2), res(2, 1.5), res(3, 1, { answerMismatch: true }), res(4, 2.5)]).detect.pass, 0, 'a mismatch that still awards marks is wrong');
});

test('§8 single vs set compares each side\'s MEDIAN — the verdict never depends on the order or spelling of labels (D37)', () => {
  const { sideValue, sidesAgree, legacyModal } = require('./lib/score.cjs');
  const perms = (xs) => (xs.length <= 1 ? [xs] : xs.flatMap((x, i) => perms([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p])));
  // GS-M15-a on the stored run: single 2 / 2.5 / 2, set 2.5 / 1.5 / 2 — both medians 2, in every run order
  for (const p of perms([2.5, 1.5, 2])) {
    assert.strictEqual(sideValue(p), 2, JSON.stringify(p));
    assert.ok(sidesAgree(sideValue([2, 2.5, 2]), sideValue(p)), 'the medians agree whatever the order: ' + JSON.stringify(p));
  }
  // the legacy modal broke the same three-way tie by sorting the marks as STRINGS ("1.5" first)
  assert.strictEqual(legacyModal(['2.5', '1.5', '2']), '1.5');
  // an even count takes the mean of the two middle values (no choice between them); statuses are a SET
  assert.strictEqual(sideValue([2, 3]), 2.5);
  assert.strictEqual(sideValue(['timeout', 'declined', 'declined']), sideValue(['declined', 'declined', 'timeout']));
  assert.ok(sidesAgree(sideValue(['declined', 'declined', 'declined']), sideValue(['declined', 'declined', 2])), 'mostly declined = declined');
  // within-½ is a separate variant; a real disagreement still disagrees (CONTROL)
  assert.ok(!sidesAgree(sideValue([2, 2.5, 2.5]), sideValue([2, 2, 2.5])) && sidesAgree(2.5, 2, 0.5), 'GS-M12-a: 2.5 vs 2 is not exact, is within ½');
  assert.ok(!sidesAgree(sideValue([2, 2, 2]), sideValue([3, 3, 3]), 0.5), 'CONTROL: 2 vs 3 disagrees in both variants');
});

test('§6 owner rulings — applied once, guarded, and the contested cases they settle are settled', () => {
  const D = require('./lib/data.cjs');
  const G = D.load();
  assert.strictEqual(G.casesById['GS-M15-a'].expected.totalMarks, 2, 'ruling (3): GS-M15-a re-pinned 0.5 -> 2');
  assert.strictEqual(G.casesById['GS-M15-a'].expected.departureFlagRequired, false);
  // Controller decision D33 (PR-2b): the student ATTEMPTED (correct skeletal equations), so it is not
  // unattempted; balancing not attempted where asked = conceptual (S4a) — the verified value stands.
  assert.strictEqual(G.casesById['GS-S12-a'].expected.mistakeType, 'conceptual', 'D33: an unbalanced equation when a balanced one was asked = conceptual');
  for (const id of ['GS-M07-a', 'GS-SUP-03', 'GS-SUP-02', 'GS-M22-a', 'GS-M04-b', 'GS-M09-b', 'GS-M15-a', 'GS-S12-a']) {
    assert.strictEqual(G.casesById[id].expected.contested, false, id + ' should be settled by a ruling');
  }
  assert.strictEqual(G.casesById['GS-M07-a'].expected.totalMarks, 1.5, 'ruling (2): miscopy penalised once');
  assert.strictEqual(G.casesById['GS-M07-a'].expected.mistakeType, 'silly');
  // GUARD: a re-pin whose recorded old value no longer matches must THROW, never overwrite.
  const fake = { 'GS-X': { expected: { totalMarks: 1, perStep: [] } } };
  assert.throws(() => D.applyRepins(fake, { repins: [{ caseId: 'GS-X', kind: 'changed', field: 'totalMarks', old: 0.5, new: 2, ruling: '3' }] }), /no longer equals the recorded old value/);
});

// ── §8 GRADER-CORE-1 PR-3 (C8): stored calls are matched by CHUNK IDENTITY, not by order ──
test('§8 replay keying — keyed records match model+chunkKey+attempt; legacy records serve the k-th attempt; nothing else', () => {
  const { pickStoredCall } = require('./lib/replay.cjs');
  const call = (model, extra = {}) => ({ ok: true, text: '{}', http: [{ model }], ...extra });
  // KEYED (a PR-3 live run): parallel chunks finish in any order; each gets its own stored call.
  const keyed = [call('m', { chunkKey: 'q2+q3', attempt: 1 }), call('m', { chunkKey: 'q0+q1', attempt: 1 }), call('m', { chunkKey: 'q0', attempt: 2 })];
  const used = new Set();
  assert.strictEqual(pickStoredCall(keyed, used, 'm', { chunkKey: 'q0+q1', attempt: 1 }), 1);
  assert.strictEqual(pickStoredCall(keyed, used, 'm', { chunkKey: 'q2+q3', attempt: 1 }), 0);
  assert.strictEqual(pickStoredCall(keyed, used, 'm', { chunkKey: 'q0', attempt: 2 }), 2);
  assert.strictEqual(pickStoredCall(keyed, used, 'm', { chunkKey: 'q1', attempt: 2 }), -1, 'a request the live run never made finds NOTHING (honest: a new run is needed)');
  assert.strictEqual(pickStoredCall(keyed, used, 'other-model', { chunkKey: 'q0+q1', attempt: 1 }), -1);
  // LEGACY (PR-1/PR-2 runs, one call per group + parse-miss retry): every chunk's attempt k reads stored call k.
  const legacy = [call('m'), call('m')];
  assert.deepStrictEqual([1, 1, 1, 2].map((a) => pickStoredCall(legacy, new Set(), 'm', { attempt: a, chunkKey: 'q' + a })), [0, 0, 0, 1]);
  assert.strictEqual(pickStoredCall([call('m')], new Set(), 'm', { attempt: 2 }), 0, 'fewer stored calls than attempts: the last one (a stored timeout replays as a timeout)');
  // No hint at all: first unconsumed for the model, as before.
  const u = new Set([0]);
  assert.strictEqual(pickStoredCall(legacy, u, 'm', {}), 1);
});

test('§9 CONTROL — chunking is result-neutral on a LEGACY whole-paper reply: the merged paper equals the one-call grade', async () => {
  const { replayJob } = require('./lib/replay.cjs');
  const { buildPlan } = require('./lib/planner.cjs');
  const job = buildPlan({ includeDetect: false }).find((j) => j.entry === 'set' && (j.request.questions || []).length >= 4 && !('acceptsV2' in j.request));
  assert.ok(job, 'a stored-plan paper with ≥ 4 questions exists');
  const qs = job.request.questions;
  const text = JSON.stringify({ results: qs.map((q, i) => ({ qNumber: q.qNumber, couldNotRead: false, addressesQuestion: 'yes', marksAwarded: Math.min(1, q.marks),
    annotatedSteps: [{ description: 's', studentWork: 'answer ' + i, status: 'correct', marksAwarded: Math.min(1, q.marks), marksDeducted: 0, teacherAnnotation: 'ok', mistakeType: null }], teacherNote: 'n' + i })), summary: 's' });
  const record = { jobKey: job.jobKey, requestDigest: job.requestDigest, calls: [{ ok: true, text, http: [{ model: 'gemini-2.5-flash' }] }] };
  const quiet = console.warn; console.warn = () => {};
  let rep;
  try { rep = await replayJob(job, record, { model: 'gemini-2.5-flash' }); } finally { console.warn = quiet; }
  assert.strictEqual(rep.httpStatus, 200);
  assert.strictEqual(rep.body.results.length, qs.length);
  assert.ok(rep.body.results.every((r, i) => r.couldNotRead === false && r.teacherNote.startsWith('n' + i)), 'every chunk read ITS OWN questions from the one stored reply');
  assert.deepStrictEqual([rep.servedCalls, rep.unusedCalls], [1, 0], 'one stored call, counted once though it served every chunk');
});

test('§10 the DUPLICATE-NUMBER paper (B\'s T2) is planned and scored by POSITION; its files are the copied originals', () => {
  const { buildPlan } = require('./lib/planner.cjs');
  const { load } = require('./lib/data.cjs');
  const crypto = require('crypto');
  const G = load();
  assert.strictEqual(G.dupPaper.key.synthetic, true);
  const plan = buildPlan({ includeDetect: true });
  const job = plan.find((j) => j.jobKey === 'W.DUP.T2');
  assert.ok(job && plan.find((j) => j.jobKey === 'V2.W.DUP.T2') && plan.find((j) => j.jobKey === 'D.PAPER.T2') && plan.find((j) => j.jobKey === 'V2.D.PAPER.OA-01'));
  assert.deepStrictEqual(job.request.questions.map((q) => q.qNumber), [1, 2, 3, 4, 5, 5, 6, 7], 'two questions printed "Q5"');
  assert.deepStrictEqual(Object.values(job.qIndexes), [0, 1, 2, 3, 4, 5, 6, 7]);
  assert.ok(!('acceptsV2' in job.request), 'the legacy job is the client shape of today');
  // scorer: a body whose two Q5 results differ is read by position, not by number
  const { score } = require('./lib/score.cjs');
  const results = job.request.questions.map((q, i) => ({ qNumber: q.qNumber, couldNotRead: false, totalMarks: q.marks, marksAwarded: i === 5 ? 1 : i === 4 ? 1.5 : 0, annotatedSteps: [], mistakeSummary: {}, teacherNote: 'n' }));
  const res = score({ items: [{ job, run: 1, record: { wallMs: 1000, calls: [] }, rep: { httpStatus: 200, body: { ok: true, results } } }], detectItems: [] });
  assert.deepStrictEqual(res.dup.q5, { n: 2, graded: 2, pct: 100 });
  const q5 = res.dup.rows.filter((r) => /Q5/.test(r.id)).map((r) => [r.id, r.awarded, r.expected]);
  assert.deepStrictEqual(q5, [['DUP-T2-Q5a', 1.5, 1.5], ['DUP-T2-Q5b', 1, 1]], 'each Q5 is scored against ITS OWN key');
  // the copied files are byte-identical to the key's declared set (no edit in place)
  for (const f of ['T2_questions.pdf', 'T2_answers.pdf', 'expected-key.md']) assert.ok(fs.existsSync(path.join(GOLDEN, 'dup-number-T2', f)), f);
  assert.strictEqual(crypto.createHash('sha256').update(fs.readFileSync(path.join(GOLDEN, 'dup-number-T2', 'T2_answers.pdf'))).digest('hex').slice(0, 16), 'a5954695ad4a47cc');
});

test('§11 the RE-BASELINE (runs/<id>/rebaseline.json) is digest-pinned: a tampered entry counts as changed, an unused entry is stale', async () => {
  const quiet = { warn: console.warn, error: console.error };
  console.warn = () => {}; console.error = () => {};
  const rbFile = path.join(GOLDEN, 'runs', floor.runId, 'rebaseline.json');
  const original = fs.readFileSync(rbFile, 'utf8');
  try {
    const { evaluateRun } = require('./lib/evaluate.cjs');
    const runDir = path.join(GOLDEN, 'runs', floor.runId);
    const rb = JSON.parse(original);
    const keys = Object.keys(rb.entries);
    // A17 owner rulings 1 and 2 (GRADING-JOBS-1 J0) add two declared classes: the one fixed unit comment,
    // and a subjective non-attempt that is now NOT ATTEMPTED instead of a graded 0.
    const DECLARED = ['v2-notGraded-field', 'detect-symbols-restored', 'd38-not-found-pending', 'd38-blank-slot-unattempted', 'a17-r1-units', 'a17-r2-not-attempted'];
    assert.ok(keys.length > 0 && keys.every((k) => rb.entries[k].class.split('+').every((c) => DECLARED.includes(c))), 'only the declared classes');
    // A LEGACY grading body may change only by controller decision D38 (not found → pending; a blank
    // slot → unattempted) or an A17 owner ruling (1: the unit comment; 2: not attempted); the v2 field
    // and the detect restore never touch one.
    assert.ok(keys.filter((k) => !k.startsWith('detect:') && !/:V2\./.test(k)).every((k) => rb.entries[k].class.split('+').every((c) => /^(?:d38-|a17-)/.test(c))), 'a legacy body changes only under D38 or an A17 ruling');
    const ok = await evaluateRun(runDir);
    assert.deepStrictEqual([ok.integrity.changed, ok.integrity.rebaselined, ok.integrity.rebaselineStale.length], [0, keys.length, 0]);
    // CONTROL 1: one tampered `to` → that body counts as changed again.
    const t = JSON.parse(original); t.entries[keys[0]].to = '0'.repeat(64);
    fs.writeFileSync(rbFile, JSON.stringify(t));
    const bad = await evaluateRun(runDir);
    assert.strictEqual(bad.integrity.changed, 1);
    assert.deepStrictEqual(bad.integrity.rebaselineStale, [keys[0]]);
    // CONTROL 2: an entry for a body that did not change is STALE (the gate names it).
    const s = JSON.parse(original); s.entries['run1:S.CI.GS-M01-a'] = { from: 'x', to: 'y', class: 'v2-notGraded-field' };
    fs.writeFileSync(rbFile, JSON.stringify(s));
    const stale = await evaluateRun(runDir);
    assert.deepStrictEqual(stale.integrity.rebaselineStale, ['run1:S.CI.GS-M01-a']);
  } finally {
    fs.writeFileSync(rbFile, original);
    console.warn = quiet.warn; console.error = quiet.error;
  }
});

test('§12 replay of a PR-3 live run is faithful: a call still in flight at the request deadline replays as that TIMEOUT; detection replays on the run\'s own (proxy) detect model', async () => {
  const { replayJob } = require('./lib/replay.cjs');
  const { buildPlan } = require('./lib/planner.cjs');
  const grading = require('../../grading/rules.cjs');
  const plan = buildPlan({ includeDetect: true });
  // D43: only a paper of MORE than 10 questions is chunked — the owner's 27-question paper (9 chunks of 3).
  const job = plan.find((j) => j.jobKey === 'W.OA2.MULTI');
  assert.ok(job && job.request.questions.length === 27, 'the 27-question owner paper is planned (chunks q0+q1+q2 … q24+q25+q26)');
  const qs = job.request.questions;
  const text = JSON.stringify({ results: qs.map((q, i) => ({ qNumber: q.qNumber, couldNotRead: false, addressesQuestion: 'yes', marksAwarded: Math.min(1, q.marks),
    annotatedSteps: [{ description: 's', studentWork: 'answer ' + i, status: 'correct', marksAwarded: Math.min(1, q.marks), marksDeducted: 0, teacherAnnotation: 'ok', mistakeType: null }], teacherNote: 'n' + i })), summary: 's' });
  const ok = (chunkKey, attempt) => ({ ok: true, text, chunkKey, attempt, http: [{ model: 'gemini-2.5-flash', httpStatus: 200 }] });
  // live 2026-10-06 (V2.W.OA2.MULTI): a chunk timed out at 45 s, its single-question retries ran,
  // and one retry was still in flight when the request deadline ended the job — stored with no
  // outcome and no HTTP record. Live, that question came back NOT GRADED as a timeout.
  const keys = Array.from({ length: 9 }, (_, k) => ['q' + 3 * k, 'q' + (3 * k + 1), 'q' + (3 * k + 2)].join('+'));
  const timedOut = { ok: false, chunkKey: 'q24+q25+q26', attempt: 1, error: { status: 504, message: 'Gemini request timed out after 45000ms' }, http: [{ model: 'gemini-2.5-flash', errClass: 'AbortError' }] };
  const inFlight = { ok: false, chunkKey: 'q26', attempt: 2, http: [] };
  const record = (last) => ({ jobKey: job.jobKey, requestDigest: job.requestDigest, calls: [...keys.slice(0, 8).map((k) => ok(k, 1)), timedOut, ok('q24', 2), ok('q25', 2), last] });
  const quiet = console.warn; console.warn = () => {};
  let rep; let ctl;
  try {
    rep = await replayJob(job, record(inFlight), { model: 'gemini-2.5-flash' });
    // CONTROL: the same retry stored as a real provider error replays as an ERROR, not a timeout
    ctl = await replayJob(job, record({ ok: false, chunkKey: 'q26', attempt: 2, error: { status: 500, message: 'internal' }, http: [{ model: 'gemini-2.5-flash', httpStatus: 500 }] }), { model: 'gemini-2.5-flash' });
  } finally { console.warn = quiet; }
  const r = rep.body.results;
  assert.strictEqual(r.length, 27);
  assert.strictEqual(r[26].note, grading.NOT_GRADED_TIMEOUT_NOTE, 'the in-flight retry replays as the deadline TIMEOUT it was live');
  assert.ok(r.slice(0, 26).every((x) => x.note !== grading.NOT_GRADED_TIMEOUT_NOTE && x.note !== grading.NOT_GRADED_ERROR_NOTE), 'every other question was graded');
  assert.deepStrictEqual([rep.servedCalls, rep.unusedCalls], [12, 0], 'every stored call consumed — the replay is complete');
  assert.strictEqual(ctl.body.results[26].note, grading.NOT_GRADED_ERROR_NOTE, 'CONTROL: a stored provider error stays an error');
  // Detection: the body names the model that detected, so a --detect-model (proxy) run replays on it.
  const dj = plan.find((j) => j.entry === 'detect' && j.jobKey.startsWith('D.ITEM.'));
  const dtext = JSON.stringify({ detectedMarks: 2, marksSource: 'inferred', detectedSubject: 'Maths', detectedTopic: 'polynomials', detectedObjective: false, detectedAnswer: null,
    questions: [{ questionNumber: null, questionText: 'Find the zeroes of the polynomial x² − 5x + 6.', marks: 2, marksSource: 'inferred', objective: false, answer: null }] });
  const drec = { jobKey: dj.jobKey, requestDigest: dj.requestDigest, calls: [{ ok: true, text: dtext, attempt: 1, http: [{ model: 'gemini-3.8-flash', httpStatus: 200 }] }] };
  const config = { core: true, model: 'gemini-3.8-flash', thinkingBudget: null, gradingMode: 'single' };
  console.warn = () => {};
  let proxy; let dflt;
  try {
    proxy = await replayJob(dj, drec, { config, detectModel: 'gemini-3.8-flash' });
    dflt = await replayJob(dj, drec, { config });
  } finally { console.warn = quiet; }
  assert.ok(JSON.stringify(proxy.body).includes('gemini-3.8-flash') && !JSON.stringify(proxy.body).includes('gemini-2.5-flash'), 'the proxy run replays on its own detect model');
  assert.ok(JSON.stringify(dflt.body).includes('gemini-2.5-flash'), 'CONTROL: without detectModel the production detect model is used (PR-1/PR-2 runs)');
});
