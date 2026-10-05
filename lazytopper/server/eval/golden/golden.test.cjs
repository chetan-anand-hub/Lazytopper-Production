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
    const diag = (floor.extraRuns || []).find((x) => /owner/.test(x.label));
    assert.ok(diag, 'floor.extraRuns must carry the owner-paper diagnostic run');
    const diagDir = path.join(GOLDEN, 'runs', diag.runId);
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

test('§6 owner rulings — applied once, guarded, and the contested cases they settle are settled', () => {
  const D = require('./lib/data.cjs');
  const G = D.load();
  assert.strictEqual(G.casesById['GS-M15-a'].expected.totalMarks, 2, 'ruling (3): GS-M15-a re-pinned 0.5 -> 2');
  assert.strictEqual(G.casesById['GS-M15-a'].expected.departureFlagRequired, false);
  assert.strictEqual(G.casesById['GS-S12-a'].expected.mistakeType, null, 'ruling (7): unattempted balancing = no type');
  for (const id of ['GS-M07-a', 'GS-SUP-03', 'GS-SUP-02', 'GS-M22-a', 'GS-M04-b', 'GS-M09-b', 'GS-M15-a', 'GS-S12-a']) {
    assert.strictEqual(G.casesById[id].expected.contested, false, id + ' should be settled by a ruling');
  }
  assert.strictEqual(G.casesById['GS-M07-a'].expected.totalMarks, 1.5, 'ruling (2): miscopy penalised once');
  assert.strictEqual(G.casesById['GS-M07-a'].expected.mistakeType, 'silly');
  // GUARD: a re-pin whose recorded old value no longer matches must THROW, never overwrite.
  const fake = { 'GS-X': { expected: { totalMarks: 1, perStep: [] } } };
  assert.throws(() => D.applyRepins(fake, { repins: [{ caseId: 'GS-X', kind: 'changed', field: 'totalMarks', old: 0.5, new: 2, ruling: '3' }] }), /no longer equals the recorded old value/);
});
