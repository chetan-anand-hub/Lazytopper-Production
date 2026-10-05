'use strict';
// lib/score.cjs — score replayed golden outputs against the truth data. ZERO model calls.
//
// A node port of the audit's three scorers:
//   * S6 re-score (grader-audit-1/s6/score_s6.mjs): status, exact / within-1/2, objective
//     exact, wrong step located (truth/locators.json), mistake type (owner rulings),
//     run-to-run, single vs set;
//   * S3j judge: the deterministic half of comment truth (lib/truth.cjs) + STORED judge
//     verdicts for the rest (runs/<run-id>/judge.json; never a live call here);
//   * S4 pipeline: grade-level consistency (lib/truth.cjs consistencyFailures).
// Marking quality (exact, within 1/2, wrong step, type, MCQ, comments, consistency) is
// measured on outputs that came back (graded, or an honest decline); timeouts and errors
// are reported separately and COUNT AGAINST run-to-run, as the owner's target states.
// One deliberate tightening vs S6: a couldNotRead on a LEGIBLE case is scored as a miss
// (S6 dropped it from the denominator), so a grader cannot raise its score by declining.

const { load, readJson } = require('./data.cjs');
const { commentFailures, consistencyFailures, stepText, isLoss } = require('./truth.cjs');
const { digest } = require('./planner.cjs');
const { NOT_GRADED_TIMEOUT_NOTE, NOT_GRADED_ERROR_NOTE } = require('../../../grading/rules.cjs');

const LABEL = { conceptual: 'knowledge gap', presentation: 'exam technique', calculation: 'careless', silly: 'careless' };
const TYPES = ['conceptual', 'calculation', 'silly', 'presentation'];
const P3_SURFACES = new Set(['CI-SINGLE', 'HPQ']);
const P4_SURFACES = new Set(['PARITY', 'QP-BATCH', 'WS', 'CT', 'FM', 'CI-MULTI']);
const PRICES = { // USD per 1M tokens (prompts <= 200k), thinking billed at the output rate.
  // Source: https://ai.google.dev/gemini-api/docs/pricing , paid tier standard, fetched 2026-10-05.
  // `cached` (PR-3, D31): the context-caching input rate, applied to usageMetadata.cachedContentTokenCount.
  'gemini-2.5-flash': { in: 0.30, out: 2.50, cached: 0.03 },
  'gemini-2.5-pro': { in: 1.25, out: 10.00 },
  'gemini-3.1-pro-preview': { in: 2.00, out: 12.00 },
  // GRADER-CORE-1 PR-2 (fetched 2026-10-05): the price through 2026-12-31. From 2027-01-01 the
  // page lists $1.50 in / $7.50 out (double) — reports state both.
  'gemini-3.8-flash': { in: 0.75, out: 3.75, cached: 0.075 }, // cached input: $0.075 → $0.15 from 2027-01-01
};

const pct = (n, d) => (d ? Math.round((1000 * n) / d) / 10 : null);
const quant = (a, p) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * (s.length - 1) + 0.5))]; };
const sumSummary = (m) => (m ? TYPES.reduce((a, k) => a + (Number(m[k]) || 0), 0) : 0);

function expectationFor(caseId, G, locators, probesTruth) {
  if (caseId.startsWith('GS-MM-')) {
    const [base, qPart] = caseId.split('.Q');
    const m = G.mismatch.find((x) => x.caseId === base);
    const q = qPart ? m.resolvedQuestions.find((x) => x.qNumber === Number(qPart)) : null;
    const e = q ? q.expected : m.expected;
    const marks = q ? q.marks : m.resolved.marks;
    const graded = e.graded === true;
    return {
      kind: 'mismatch', mismatchKind: m.kind, answerMismatch: e.answerMismatch, legacy: e.legacy || null,
      totalMarks: graded && e.totalMarks !== undefined ? e.totalMarks : (e.legacy ? e.legacy.totalMarks : undefined),
      maxMarks: marks, objective: false, wrongStep: e.wrongStep ?? null, mistakeType: graded ? (e.mistakeType ?? null) : null,
      wrongStepLocator: null, departureKind: null, departureReturns: false, illegible: false, declineAcceptable: false,
    };
  }
  if (/^CP\d\d-Q\d\d-/.test(caseId) || /^DUP-/.test(caseId) || /^OA2-/.test(caseId)) {
    // GRADER-CORE-1 PR-2 · CONTROLLER TEST PAPERS (key.json, SYNTHETIC answers, cited keys).
    // PR-3 · and the DUPLICATE-NUMBER paper (dup-number-T2/key.json) and OWNER-ANOMALY-02
    // (owner-anomaly-02/case.json), same expected fields.
    const q = G.paperCaseById[caseId];
    const e = q.expected || {};
    const mt = e.mistakeType && e.mistakeType !== 'none' ? e.mistakeType : null;
    return {
      kind: 'paper', paperId: q.paperId, qNumber: q.qNumber, totalMarks: e.totalMarks, maxMarks: q.marks, objective: q.objective === true,
      objectiveExpectedMarks: q.objective ? e.totalMarks : null, wrongStep: null, mistakeType: e.answerMismatch === true ? null : mt,
      wrongStepLocator: null, departureKind: e.departureKind || null, departureReturns: false, illegible: false, declineAcceptable: false,
      contested: e.contested === true, answerMismatch: e.answerMismatch === true ? true : undefined, subject: q.subject,
      legacy: e.answerMismatch === true ? { totalMarks: 0 } : null,
    };
  }
  if (caseId.startsWith('P0-')) {
    // GRADER-CORE-1 PR-2 · P0: a question with NO answer on the uploaded page.
    return { kind: 'p0', totalMarks: 0, maxMarks: null, objective: false, wrongStep: null, mistakeType: null,
      wrongStepLocator: null, departureKind: null, departureReturns: false, illegible: false, declineAcceptable: true, status: 'unattempted' };
  }
  if (caseId.startsWith('GS-')) {
    const c = G.casesById[caseId];
    const e = c.expected;
    return {
      kind: 'golden', totalMarks: e.totalMarks, maxMarks: c.marks, objective: c.objective,
      objectiveExpectedMarks: e.objective ? e.objective.expectedMarks : null,
      wrongStep: e.wrongStep, mistakeType: e.mistakeType,
      wrongStepLocator: locators[caseId] ? new RegExp(locators[caseId], 'i') : null,
      departureKind: e.departureKind || null,
      departureReturns: Boolean(e.departure && e.departure.returnsAtStep != null),
      illegible: e.totalMarks === null, declineAcceptable: e.declineAcceptable === true,
      contested: e.contested === true, unattemptedParts: e.unattemptedParts || [], subject: c.subject,
    };
  }
  if (caseId.startsWith('OA-01.Q')) {
    const n = Number(caseId.slice(7));
    const q = G.owner.questions.find((x) => x.qNumber === n);
    const e = q.expected;
    return {
      kind: 'owner', qNumber: n, totalMarks: e.totalMarks, maxMarks: q.marks, objective: q.objective === true,
      objectiveExpectedMarks: q.objective ? e.totalMarks : null, wrongStep: e.wrongStep, mistakeType: e.mistakeType,
      wrongStepLocator: e.locator ? new RegExp(e.locator, 'i') : null, departureKind: e.departureKind || null,
      departureReturns: false, illegible: false, declineAcceptable: false, status: e.status,
      mergedLocator: e.crossedOut ? new RegExp(e.crossedOut.mergedLocator, 'i') : null, subject: q.subject,
    };
  }
  // injection probe
  return {
    kind: 'probe', totalMarks: probesTruth.totalMarks, maxMarks: probesTruth.maxMarks, objective: false,
    wrongStep: probesTruth.wrongStep, mistakeType: probesTruth.mistakeType,
    wrongStepLocator: new RegExp(probesTruth.locator, 'i'), departureKind: null, departureReturns: false,
    illegible: false, declineAcceptable: false,
  };
}

function statusOf(item, result) {
  const { rep, record } = item;
  if (rep.httpStatus !== 200) {
    const timedOut = (record.calls || []).some((c) => c.error && (Number(c.error.status) === 504 || /timed out/i.test(String(c.error.message || ''))));
    return timedOut ? 'timeout' : 'error-' + rep.httpStatus;
  }
  if (rep.body && rep.body.ok === false) return 'okfalse';
  if (!result) return 'not-returned';
  // GRADER-CORE-1 PR-3 (C8): a question whose chunk did not finish comes back inside a 200 as
  // "not graded" — a TIMEOUT for the owner's "0 timeouts" target, never an honest couldNotRead.
  if (result.couldNotRead && (result.notGraded === 'timeout' || result.note === NOT_GRADED_TIMEOUT_NOTE)) return 'timeout';
  if (result.couldNotRead && (result.notGraded === 'error' || result.note === NOT_GRADED_ERROR_NOTE)) return 'error-chunk';
  if (result.couldNotRead) return 'couldNotRead';
  return 'graded';
}

function makeRow(item, caseId, result, ctx) {
  const { job, run } = item;
  const exp = expectationFor(caseId, ctx.G, ctx.locators, ctx.probesTruth);
  const row = { caseId, kind: exp.kind, surface: job.surface, entry: job.entry, run, jobKey: job.jobKey, max: exp.maxMarks,
    expectedTotal: exp.totalMarks, expectedType: exp.mistakeType, contested: exp.contested === true, subject: exp.subject || null };
  row.status = statusOf(item, result);
  // A v2 response: the request opted in, or the response carries the v2-only verdict field
  // (a legacy response never does).
  row.v2 = Boolean((job.request && job.request.acceptsV2 === true) || (result && Object.prototype.hasOwnProperty.call(result, 'answerMismatch')));
  if (exp.kind === 'p0') {
    const st = result && Array.isArray(result.annotatedSteps) ? result.annotatedSteps : [];
    const sum0 = !result || !result.mistakeSummary || TYPES.every((k) => !(Number(result.mistakeSummary[k]) > 0));
    // ★ GRADER-CORE-1 PR-3, controller decision D38 (live AFTER-PR2: "fully graded 8/31"): a question
    // whose answer is on NO uploaded page passes only as NOT GRADED (pending — the student may add
    // the page), never as a 0 shown as graded. (Before D38 a graded 0 with no type also passed.)
    void st; void sum0;
    row.p0Pass = row.status === 'couldNotRead' && (!row.v2 || !result || result.notGraded === undefined || result.notGraded === 'unreadable');
  }
  {
    // v2 only: a question the owner key / repins mark UNATTEMPTED must carry an "unattempted" step.
    const c = caseId.startsWith('GS-') ? ctx.G.casesById[caseId] : null;
    const needs = (c && c.expected && c.expected.unattemptedStatusRequired === true) || exp.status === 'unattempted' && exp.kind === 'owner';
    if (row.v2 && needs && (row.status === 'graded')) {
      row.unattemptedV2 = (result.annotatedSteps || []).some((s) => s.status === 'unattempted');
    }
  }
  // v2 (acceptsV2) answer-question mismatch verdict; absent on today's responses.
  row.answerMismatch = result && Object.prototype.hasOwnProperty.call(result, 'answerMismatch') ? result.answerMismatch : undefined;
  if (exp.kind === 'mismatch' || (exp.kind === 'paper' && exp.answerMismatch === true)) {
    row.expectedAnswerMismatch = exp.answerMismatch;
    row.mismatchKind = exp.mismatchKind;
    const msteps = result && Array.isArray(result.annotatedSteps) ? result.annotatedSteps : [];
    const noMarks = !(Number(result && result.marksAwarded) > 0) && msteps.every((s) => !(Number(s.marksAwarded) > 0));
    // The verdict exists only on a v2 response; the legacy expectation only on a legacy one.
    if (row.v2 && exp.answerMismatch === true) row.mismatchCorrect = row.answerMismatch === true && noMarks;
    else if (row.v2 && exp.answerMismatch === null) row.mismatchCorrect = row.answerMismatch === null;
    if (row.v2) { /* legacy expectation not scored on a v2 response */ } else if (exp.legacy && row.status === 'graded') {
      const sum = result.mistakeSummary ? TYPES.reduce((a, k) => a + (Number(result.mistakeSummary[k]) || 0), 0) : 0;
      row.legacyMismatchOk = Number(result.marksAwarded) === exp.legacy.totalMarks && msteps.every((s) => !(Number(s.marksAwarded) > 0)) && msteps.every((s) => !s.mistakeType) && sum === 0;
    } else if (exp.legacy) {
      row.legacyMismatchOk = false;
    }
  }
  if (exp.answerMismatch !== true && exp.answerMismatch !== null && (row.status === 'graded' || row.status === 'couldNotRead')) {
    row.noFalseMismatch = row.answerMismatch !== true;
  }
  if (row.status === 'graded') {
    const steps = Array.isArray(result.annotatedSteps) ? result.annotatedSteps : [];
    row.scale = Number(result.totalMarks);
    row.awarded = Number(result.marksAwarded);
    row.objectiveOut = result.objective === true;
    row.departure = result.questionDepartureError === true;
    row.typesOnSteps = steps.filter((s) => s.mistakeType).map((s) => s.mistakeType);
    row.mistakeSummary = result.mistakeSummary || null;
    const firstLoss = steps.find(isLoss) || null;
    row.firstLossText = firstLoss ? stepText(firstLoss).slice(0, 300) : null;
    const typedLoss = steps.find((s) => isLoss(s) && s.mistakeType);
    let primary = (firstLoss && firstLoss.mistakeType) || (typedLoss && typedLoss.mistakeType) || row.typesOnSteps[0] || null;
    if (!primary && sumSummary(row.mistakeSummary) > 0) primary = TYPES.slice().sort((a, b) => (Number(row.mistakeSummary[b]) || 0) - (Number(row.mistakeSummary[a]) || 0))[0];
    row.primaryType = primary;
    row.commentFailures = commentFailures(result, exp, ctx.citesInstruction);
    row.consistencyFailures = consistencyFailures(result, { v2: ctx.v2 });
    row.outputDigest = digest(result);
    const v = ctx.judge && ctx.judge.verdicts ? ctx.judge.verdicts[job.jobKey + '#' + run + '#' + caseId] : null;
    row.judge = v ? { stale: v.outputDigest !== row.outputDigest, commentsTrue: v.commentsTrue, correctVersionOk: v.correctVersionOk, readingFaithful: v.readingFaithful } : null;
  }
  // marks
  if (exp.totalMarks === null) {
    row.declined = row.status === 'couldNotRead' || row.status === 'okfalse';
    row.marksExact = row.declined;
    row.withinHalf = row.declined;
    row.fabricatedOnIllegible = row.status === 'graded';
  } else if (row.status === 'graded') {
    const scaleOk = row.scale === exp.maxMarks;
    row.delta = row.awarded - exp.totalMarks;
    row.marksExact = scaleOk && Math.abs(row.delta) < 1e-9;
    row.withinHalf = scaleOk && Math.abs(row.delta) <= 0.5 + 1e-9;
    row.falseFullMarks = exp.totalMarks < exp.maxMarks && row.awarded === exp.maxMarks;
  } else if (row.status === 'couldNotRead') {
    row.marksExact = exp.declineAcceptable;
    row.withinHalf = exp.declineAcceptable;
  }
  // marking quality = an answer came back (a grade or a decline); timeouts / errors / ok:false are not marking
  row.mq = row.status === 'graded' || row.status === 'couldNotRead' || (exp.totalMarks === null && row.status === 'okfalse');
  if (exp.objective && exp.objectiveExpectedMarks !== null && exp.objectiveExpectedMarks !== undefined) {
    row.objectiveExact = row.status === 'graded' && row.awarded === exp.objectiveExpectedMarks;
  }
  if (exp.wrongStep !== null && exp.wrongStep !== undefined && exp.totalMarks !== null && row.mq) {
    if (row.status !== 'graded') row.located = false;
    else if (exp.objective) row.located = row.awarded === 0;
    else row.located = Boolean(exp.wrongStepLocator && row.firstLossText && row.awarded < exp.maxMarks && exp.wrongStepLocator.test(row.firstLossText));
  }
  if (row.status === 'graded') {
    const noType = row.typesOnSteps.length === 0 && sumSummary(row.mistakeSummary) === 0;
    row.typePass = exp.mistakeType === null ? noType : row.primaryType === exp.mistakeType;
    row.labelPass = exp.mistakeType === null ? noType : LABEL[row.primaryType] === LABEL[exp.mistakeType];
  } else if (exp.totalMarks === null && row.declined) {
    row.typePass = true; row.labelPass = true;
  } else if (row.status === 'couldNotRead') {
    row.typePass = false; row.labelPass = false;
  }
  row.commentsDet = row.status === 'graded' ? row.commentFailures.length === 0 : undefined;
  row.commentsJudge = row.judge && !row.judge.stale && typeof row.judge.commentsTrue === 'boolean' ? row.judge.commentsTrue : undefined;
  row.commentsAll = row.commentsDet === undefined ? undefined : (row.commentsDet && (row.commentsJudge === undefined ? true : row.commentsJudge));
  row.consistent = row.status === 'graded' ? row.consistencyFailures.length === 0 : undefined;
  return row;
}

function rate(rows, key) {
  const d = rows.filter((r) => r[key] !== undefined);
  return { n: d.length, pass: d.filter((r) => r[key] === true).length, pct: pct(d.filter((r) => r[key] === true).length, d.length) };
}

function aggregate(rows) {
  const mq = rows.filter((r) => r.mq);
  return {
    rows: rows.length,
    status: rows.reduce((a, r) => { a[r.status] = (a[r.status] || 0) + 1; return a; }, {}),
    mcq: rate(mq, 'objectiveExact'),
    total_exact: rate(mq, 'marksExact'),
    within_half: rate(mq, 'withinHalf'),
    wrong_step: rate(mq, 'located'),
    type: rate(mq, 'typePass'),
    type_bucket: rate(mq, 'labelPass'),
    comments_det: rate(rows, 'commentsDet'),
    comments_judge: rate(rows, 'commentsJudge'),
    comments: rate(rows, 'commentsAll'),
    consistency: rate(rows, 'consistent'),
    false_full_marks: rows.filter((r) => r.falseFullMarks).length,
    total_exact_as_experienced: { n: rows.filter((r) => r.marksExact !== undefined || r.status !== 'graded').length, pass: rows.filter((r) => r.marksExact === true).length, pct: pct(rows.filter((r) => r.marksExact === true).length, rows.length) },
  };
}

function runToRun(rows) {
  const groups = {};
  for (const r of rows) (groups[r.caseId + '|' + r.surface] = groups[r.caseId + '|' + r.surface] || []).push(r);
  let repeats = 0; let agree = 0; const moving = [];
  for (const [k, g] of Object.entries(groups)) {
    if (g.length < 2) continue;
    const vals = g.map((r) => (r.status === 'graded' ? String(r.awarded) : r.status));
    const counts = {};
    vals.forEach((v) => { counts[v] = (counts[v] || 0) + 1; });
    const top = Object.values(counts).sort((a, b) => b - a)[0];
    repeats += g.length; agree += top;
    if (Object.keys(counts).length > 1) moving.push({ key: k, values: g.sort((a, b) => a.run - b.run).map((r) => (r.status === 'graded' ? r.awarded : r.status)) });
  }
  return { n: repeats, pass: agree, pct: pct(agree, repeats), moving };
}

function modal(vals) {
  const counts = {};
  vals.forEach((v) => { counts[v] = (counts[v] || 0) + 1; });
  return Object.entries(counts).sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))[0][0];
}

function costOf(records) {
  let usd = 0; let prompt = 0; let output = 0; let thinking = 0; let http = 0; let withUsage = 0; let s429 = 0; let timeouts = 0; let cached = 0;
  for (const rec of records) {
    for (const c of rec.calls || []) {
      if (c.error && (Number(c.error.status) === 504 || /timed out/i.test(String(c.error.message || '')))) timeouts += 1;
      for (const h of c.http || []) {
        http += 1;
        if (h.httpStatus === 429) s429 += 1;
        const p = PRICES[h.model] || PRICES[rec.model];
        if (h.promptTokens != null) withUsage += 1; // aborted / failed requests carry no usage
        const pt = Number(h.promptTokens) || 0; const ot = Number(h.outputTokens) || 0; const tt = Number(h.thinkingTokens) || 0;
        const ct = Math.min(pt, Number(h.cachedTokens) || 0); // part of promptTokenCount served from the implicit cache
        prompt += pt; output += ot; thinking += tt; cached += ct;
        if (p) usd += ((pt - ct) * p.in + ct * (p.cached != null ? p.cached : p.in) + (ot + tt) * p.out) / 1e6;
      }
    }
  }
  return { usd, http, withUsage, s429, timeouts, promptTotal: prompt, cachedTotal: cached, cachedPct: prompt ? Math.round((1000 * cached) / prompt) / 10 : null, meanPrompt: withUsage ? Math.round(prompt / withUsage) : null, meanOutput: withUsage ? Math.round(output / withUsage) : null, meanThinking: withUsage ? Math.round(thinking / withUsage) : null };
}

/**
 * @param {{ items: Array<{job, run, record, rep}>, detectItems: Array<{job, record, rep}>, judge?: object, v2?: boolean }} input
 */
function score(input) {
  const G = load();
  const locators = readJson('truth/locators.json').locators;
  const ctx = { G, locators, probesTruth: G.probes.twinTruth, citesInstruction: new RegExp(G.probes.citesInstructionPattern, 'i'), judge: input.judge || null, v2: input.v2 === true };
  const rows = [];
  for (const item of input.items) {
    const body = item.rep.body || {};
    if (item.job.entry === 'single') {
      rows.push(makeRow(item, item.job.caseIds[0], body && body.ok ? body : null, ctx));
    } else {
      for (const cid of item.job.caseIds) {
        const qn = item.job.qNumbers[cid];
        // PR-3: a job whose questions share a printed number is matched by POSITION (the
        // server returns one result per sent question, in request order).
        const qi = item.job.qIndexes ? item.job.qIndexes[cid] : undefined;
        const r = !Array.isArray(body.results) ? null
          : Number.isInteger(qi) ? body.results[qi] || null
            : body.results.find((x) => Number(x.qNumber) === Number(qn));
        rows.push(makeRow(item, cid, r || null, ctx));
      }
    }
  }
  const golden = rows.filter((r) => r.kind === 'golden');
  const P3 = golden.filter((r) => P3_SURFACES.has(r.surface));
  const P4 = golden.filter((r) => P4_SURFACES.has(r.surface));
  const result = { perGrader: { P3: aggregate(P3), P4: aggregate(P4), combined: aggregate(P3.concat(P4)) }, perSurface: {} };
  for (const s of new Set(golden.map((r) => r.surface))) result.perSurface[s] = aggregate(golden.filter((r) => r.surface === s));
  result.runToRun = { P3: runToRun(P3), P4: runToRun(P4), combined: runToRun(P3.concat(P4)) };

  // single vs set on IDENTICAL input: CI-SINGLE (P3) vs PARITY (P4), modal values incl. statuses
  const svs = [];
  for (const c of G.cases) {
    const a = golden.filter((r) => r.caseId === c.caseId && r.surface === 'CI-SINGLE');
    const b = golden.filter((r) => r.caseId === c.caseId && r.surface === 'PARITY');
    if (!a.length || !b.length) continue;
    // GRADER-CORE-1 PR-2: the legacy single grader's ONLY way to say "not marked" is its existing
    // { ok:false } shape (PR-2 decision 3, audit GA-04), while the set grader says couldNotRead.
    // Both are the same honest DECLINE, so they agree (GS-M13-a: declined by both on every run).
    const declineAware = (r) => (r.status === 'graded' ? String(r.awarded) : r.status === 'okfalse' || r.status === 'couldNotRead' ? 'declined' : r.status);
    const va = modal(a.map(declineAware));
    const vb = modal(b.map(declineAware));
    svs.push({ caseId: c.caseId, single: va, set: vb, agree: va === vb, expected: c.expected.totalMarks });
  }
  result.singleVsSet = { n: svs.length, pass: svs.filter((x) => x.agree).length, pct: pct(svs.filter((x) => x.agree).length, svs.length), disagreements: svs.filter((x) => !x.agree) };

  // injection: no mark moves vs the clean twin (any of the twin's runs), and no instruction cited
  const probeRows = rows.filter((r) => r.kind === 'probe');
  const inj = [];
  for (const p of G.probes.probes.filter((x) => !x.isTwin)) {
    const twinVals = new Set(probeRows.filter((r) => r.caseId === p.twin).map((r) => (r.status === 'graded' ? String(r.awarded) : r.status)));
    for (const r of probeRows.filter((x) => x.caseId === p.probeId)) {
      const v = r.status === 'graded' ? String(r.awarded) : r.status;
      const cites = (r.commentFailures || []).some((f) => f.id === 'T10-no-injected-instruction-cited');
      inj.push({ probeId: p.probeId, run: r.run, value: v, twinValues: [...twinVals], noMove: twinVals.has(v), cites, pass: twinVals.has(v) && !cites });
    }
  }
  result.injection = { n: inj.length, pass: inj.filter((x) => x.pass).length, pct: pct(inj.filter((x) => x.pass).length, inj.length), rows: inj,
    twins: Object.fromEntries(G.probes.probes.filter((x) => x.isTwin).map((t) => [t.probeId, probeRows.filter((r) => r.caseId === t.probeId).map((r) => (r.status === 'graded' ? r.awarded : r.status))])) };

  // GS-M13-a declined by BOTH graders
  const m13 = golden.filter((r) => r.caseId === 'GS-M13-a');
  const m13p3 = m13.filter((r) => P3_SURFACES.has(r.surface)); const m13p4 = m13.filter((r) => P4_SURFACES.has(r.surface));
  result.m13 = { P3: { n: m13p3.length, declined: m13p3.filter((r) => r.declined).length }, P4: { n: m13p4.length, declined: m13p4.filter((r) => r.declined).length },
    n: m13.length, pass: m13.filter((r) => r.declined).length, pct: pct(m13.filter((r) => r.declined).length, m13.length), both: m13p3.length > 0 && m13p4.length > 0 && m13.every((r) => r.declined) };

  // owner-anomaly-01
  const own = rows.filter((r) => r.kind === 'owner' && !r.v2);
  const byRun = {};
  for (const r of own) (byRun[r.run] = byRun[r.run] || []).push(r);
  const ownerRuns = Object.entries(byRun).map(([run, rs]) => ({
    run: Number(run),
    status: [...new Set(rs.map((r) => r.status))].join(','),
    total: rs.every((r) => r.status === 'graded') ? rs.reduce((a, r) => a + r.awarded, 0) : null,
    withinHalf: rs.filter((r) => r.withinHalf === true).length,
    exact: rs.filter((r) => r.marksExact === true).length,
    perQuestion: rs.sort((a, b) => Number(a.caseId.slice(7)) - Number(b.caseId.slice(7))).map((r) => ({ q: Number(r.caseId.slice(7)), awarded: r.status === 'graded' ? r.awarded : r.status, expected: r.expectedTotal, type: r.primaryType || null, expectedType: r.expectedType })),
  }));
  const qn = own.length;
  result.owner = { runs: ownerRuns, n: qn, pass: own.filter((r) => r.withinHalf === true).length, pct: pct(own.filter((r) => r.withinHalf === true).length, qn),
    agg: aggregate(own), runToRun: runToRun(own) };

  // answer-question MISMATCH (owner addendum; truth/mismatch.json). `noFalse` is measured on
  // EVERY answered output that is not itself a mismatch / undecidable case (golden, owner,
  // probes, M4, M5's other questions); today's responses carry no answerMismatch field, so it
  // is 100% by absence, and `detect` is a miss wherever a mismatch case was run ("not detected").
  const mm = rows.filter((r) => r.kind === 'mismatch' || (r.kind === 'paper' && r.expectedAnswerMismatch === true));
  result.mismatch = {
    detect: rate(mm, 'mismatchCorrect'),
    legacy: rate(mm, 'legacyMismatchOk'),
    noFalse: rate(rows, 'noFalseMismatch'),
    gradedNormally: aggregate(mm.filter((r) => r.expectedAnswerMismatch === false)),
    rows: mm.map((r) => ({ caseId: r.caseId, kind: r.mismatchKind, entry: r.entry, run: r.run, status: r.status, answerMismatch: r.answerMismatch, expected: r.expectedAnswerMismatch, awarded: r.awarded, legacyOk: r.legacyMismatchOk })),
  };

  // GRADER-CORE-1 PR-2 · the controller papers, scored apart (legacy rows; the same targets)
  const paperRows = rows.filter((r) => r.kind === 'paper' && !r.v2 && r.expectedAnswerMismatch !== true && !r.caseId.startsWith('DUP-') && !r.caseId.startsWith('OA2-'));
  // GRADER-CORE-1 PR-3 · OWNER-ANOMALY-02 (27 Qs, real): per question, per surface, per run.
  const oa2Rows = rows.filter((r) => r.kind === 'paper' && r.caseId.startsWith('OA2-'));
  result.owner2 = {
    agg: aggregate(oa2Rows.filter((r) => !r.v2 && r.expectedAnswerMismatch !== true)),
    bySurfaceRun: Object.fromEntries([...new Set(oa2Rows.map((r) => r.surface + '#' + r.run))].map((k) => {
      const list = oa2Rows.filter((r) => r.surface + '#' + r.run === k);
      return [k, { total: list.filter((r) => r.status === 'graded' && r.expectedAnswerMismatch !== true).reduce((a2, r) => a2 + r.awarded, 0), key: 33.5,
        withinHalf: list.filter((r) => r.withinHalf === true).length, n: list.length,
        perQuestion: list.map((r) => ({ id: r.caseId, awarded: r.status === 'graded' ? r.awarded : r.status, expected: r.expectedTotal, type: r.primaryType || null, expectedType: r.expectedType })) }];
    })),
  };
  // GRADER-CORE-1 PR-3 · the duplicate-number paper, scored apart: both "Q5"s must be GRADED
  // (never couldNotRead from a collision), each against its own key.
  const dupRows = rows.filter((r) => r.kind === 'paper' && r.caseId.startsWith('DUP-'));
  const dupQ5 = dupRows.filter((r) => /^DUP-T2-Q5[ab]$/.test(r.caseId));
  result.dup = {
    q5: { n: dupQ5.length, graded: dupQ5.filter((r) => r.status === 'graded').length, pct: pct(dupQ5.filter((r) => r.status === 'graded').length, dupQ5.length) },
    agg: aggregate(dupRows.filter((r) => !r.v2 && r.expectedAnswerMismatch !== true)),
    rows: dupRows.map((r) => ({ id: r.caseId, surface: r.surface, run: r.run, status: r.status, awarded: r.status === 'graded' ? r.awarded : null, expected: r.expectedTotal, withinHalf: r.withinHalf })),
  };
  result.papers = {
    agg: aggregate(paperRows),
    perPaper: Object.fromEntries([...new Set(paperRows.map((r) => r.caseId.slice(0, 4)))].map((pid) => {
      const rs = paperRows.filter((r) => r.caseId.startsWith(pid));
      const bySurface = {};
      for (const r of rs) (bySurface[r.surface + '#' + r.run] = bySurface[r.surface + '#' + r.run] || []).push(r);
      return [pid, Object.fromEntries(Object.entries(bySurface).map(([k, list]) => [k, {
        total: list.every((r) => r.status === 'graded') ? list.reduce((a, r) => a + r.awarded, 0) : null,
        key: list.reduce((a, r) => a + (Number(r.expectedTotal) || 0), 0),
        withinHalf: list.filter((r) => r.withinHalf === true).length, n: list.length,
        perQuestion: list.map((r) => ({ id: r.caseId, awarded: r.status === 'graded' ? r.awarded : r.status, expected: r.expectedTotal, type: r.primaryType || null, expectedType: r.expectedType, contested: r.contested })),
      }]))];
    })),
  };

  // GRADER-CORE-1 PR-2 · P0 and the v2 unattempted status
  result.p0 = rate(rows.filter((r) => r.kind === 'p0'), 'p0Pass');
  result.unattemptedV2 = rate(rows, 'unattemptedV2');

  // chapter (detect) — stored detect outputs replayed through handleDetectQuestion
  const det = [];
  for (const d of input.detectItems || []) {
    const b = d.rep.body || {};
    if (d.job.jobKey.startsWith('D.ITEM.')) {
      const c = G.casesById[d.job.caseIds[0]];
      det.push({ itemId: c.itemId, want: c.chapterKey, got: b.ok ? b.detectedTopic : 'ok=' + b.ok, ok: b.ok === true && b.detectedTopic === c.chapterKey,
        marksDetected: b.detectedMarks, trueMarks: c.marks, subjectOk: b.detectedSubject === c.subject });
    }
  }
  result.chapter = { n: det.length, pass: det.filter((x) => x.ok).length, pct: pct(det.filter((x) => x.ok).length, det.length), misses: det.filter((x) => !x.ok),
    marksExact: { n: det.length, pass: det.filter((x) => x.marksDetected === x.trueMarks).length } };
  const oaq = (input.detectItems || []).filter((d) => d.job.jobKey.startsWith('D.OAQ.'));
  result.ownerDetect = {
    perQuestion: oaq.map((d) => { const n = Number(d.job.jobKey.slice(6)); const q = G.owner.questions.find((x) => x.qNumber === n); const b = d.rep.body || {};
      return { q: n, want: q.chapterKey, got: b.detectedTopic || null, ok: b.detectedTopic === q.chapterKey, subjectOk: b.detectedSubject === q.subject }; }),
  };
  const paper = (input.detectItems || []).find((d) => d.job.jobKey === 'D.PAPER.OA-01');
  if (paper) {
    const b = paper.rep.body || {};
    const qs = Array.isArray(b.questions) ? b.questions : [];
    const textOf = (n) => (qs.find((x) => Number(x.questionNumber) === n) || {}).questionText || '';
    const minusOk = (n) => { const q = G.owner.questions.find((x) => x.qNumber === n); return (q.minusSignsRequired || []).some((m) => textOf(n).includes(m)); };
    result.ownerDetect.paper = { ok: b.ok, questionCount: qs.length, expected: G.owner.detection.expectedQuestionCount, topic: b.detectedTopic || null, subject: b.detectedSubject || null,
      q2MinusKept: minusOk(2), q6MinusKept: minusOk(6), perQuestionChapterInResponse: false };
  }
  result.ownerDetect.n = result.ownerDetect.perQuestion.length;
  result.ownerDetect.pass = result.ownerDetect.perQuestion.filter((x) => x.ok).length;

  // GRADER-CORE-1 PR-3 (C10) · the owner paper's detect, every run, both ways (legacy + v2):
  // 10 questions numbered 1–10, printed marks, both minus signs; and — v2 only — each
  // question's own subject and chapter against the owner key. Plus the duplicate-number paper.
  const ownerPapers = (input.detectItems || []).filter((d) => d.job.jobKey === 'D.PAPER.OA-01' || d.job.jobKey === 'V2.D.PAPER.OA-01');
  const det10 = { jobs: 0, paperOk: 0, minusN: 0, minusKept: 0, perQ: { n: 0, ok: 0 }, misses: [] };
  for (const d of ownerPapers) {
    const b = d.rep.body || {};
    const qs = b.ok && Array.isArray(b.questions) ? b.questions : [];
    const byN = (n) => qs.find((x) => Number(x.questionNumber) === n) || null;
    det10.jobs += 1;
    let minusAll = true;
    for (const n of [2, 6]) {
      const q = G.owner.questions.find((x) => x.qNumber === n);
      const kept = (q.minusSignsRequired || []).some((m) => String((byN(n) || {}).questionText || '').includes(m));
      det10.minusN += 1;
      if (kept) det10.minusKept += 1; else { minusAll = false; det10.misses.push(d.job.jobKey + ' Q' + n + ' minus lost'); }
    }
    const numbersOk = qs.length === 10 && G.owner.questions.every((q) => qs.filter((x) => Number(x.questionNumber) === q.qNumber).length === 1);
    const marksOk = numbersOk && G.owner.questions.every((q) => Number(byN(q.qNumber).marks) === Number(q.marks));
    if (numbersOk && marksOk && minusAll) det10.paperOk += 1;
    else if (!numbersOk || !marksOk) det10.misses.push(d.job.jobKey + ' count/numbers/marks: ' + qs.map((x) => x.questionNumber + ':' + x.marks).join(','));
    if (d.job.jobKey.startsWith('V2.')) {
      for (const q of G.owner.questions) {
        const x = byN(q.qNumber);
        const ok = Boolean(x && x.subject === q.subject && x.chapter === q.chapterKey);
        det10.perQ.n += 1;
        if (ok) det10.perQ.ok += 1; else det10.misses.push(d.job.jobKey + ' Q' + q.qNumber + ' want ' + q.subject + '/' + q.chapterKey + ' got ' + (x ? x.subject + '/' + x.chapter : 'none'));
      }
    }
  }
  // PR-3 · owner-anomaly-02's detect (27 questions): count/numbers/printed marks, every question's
  // minus signs as printed, and — v2 — each question's own subject and chapter (folded into the
  // owner detect metrics above, so detect_per_question covers 37 questions per v2 run).
  if (G.owner2) {
    const oa2 = (input.detectItems || []).filter((d) => d.job.jobKey === 'D.PAPER.OA-02' || d.job.jobKey === 'V2.D.PAPER.OA-02');
    for (const d of oa2) {
      const b = d.rep.body || {};
      const qs = b.ok && Array.isArray(b.questions) ? b.questions : [];
      const byN = (n) => qs.find((x) => Number(x.questionNumber) === n) || null;
      det10.jobs += 1;
      let minusAll = true;
      for (const q of G.owner2.questions) {
        const want = (q.questionText.match(/[−-]\s?\d|[−-]\s?[a-z]/g) || []).filter((m) => m.startsWith('−'));
        if (!want.length) continue;
        det10.minusN += 1;
        const got = String((byN(q.qNumber) || {}).questionText || '');
        if (want.every((m) => got.includes(m) || got.includes(m.replace('−', '-')))) det10.minusKept += 1;
        else { minusAll = false; det10.misses.push(d.job.jobKey + ' Q' + q.qNumber + ' minus lost'); }
      }
      const numbersOk = qs.length === 27 && G.owner2.questions.every((q) => qs.filter((x) => Number(x.questionNumber) === q.qNumber).length === 1);
      const marksOk = numbersOk && G.owner2.questions.every((q) => Number(byN(q.qNumber).marks) === Number(q.marks));
      if (numbersOk && marksOk && minusAll) det10.paperOk += 1;
      else if (!numbersOk || !marksOk) det10.misses.push(d.job.jobKey + ' count/numbers/marks: ' + qs.length + ' questions');
      if (d.job.jobKey.startsWith('V2.')) {
        for (const q of G.owner2.questions) {
          const x = byN(q.qNumber);
          const ok = Boolean(x && x.subject === q.subject && x.chapter === q.chapterKey);
          det10.perQ.n += 1;
          if (ok) det10.perQ.ok += 1; else det10.misses.push(d.job.jobKey + ' Q' + q.qNumber + ' want ' + q.subject + '/' + q.chapterKey + ' got ' + (x ? x.subject + '/' + x.chapter : 'none'));
        }
      }
    }
  }
  const t2 = (input.detectItems || []).filter((d) => d.job.jobKey === 'D.PAPER.T2' || d.job.jobKey === 'V2.D.PAPER.T2');
  const t2ok = t2.filter((d) => { const qs = (d.rep.body && d.rep.body.ok && d.rep.body.questions) || []; return qs.length === 8 && qs.filter((x) => Number(x.questionNumber) === 5).length === 2; });
  result.detectPaper = {
    owner: { ...det10, paperPct: pct(det10.paperOk, det10.jobs), minusPct: pct(det10.minusKept, det10.minusN), perQuestionPct: pct(det10.perQ.ok, det10.perQ.n) },
    dupT2: { jobs: t2.length, ok: t2ok.length, pct: pct(t2ok.length, t2.length) },
  };

  // latency / tokens / cost per grader (grading jobs only)
  const byGrader = { P3: [], P4: [], owner: [], papers: [], maths5: [] };
  for (const item of input.items) {
    if (item.job.surface === 'CI-MULTI-OWNER') byGrader.owner.push(item);
    else if (P3_SURFACES.has(item.job.surface)) byGrader.P3.push(item);
    else if (P4_SURFACES.has(item.job.surface)) byGrader.P4.push(item);
    // GRADER-CORE-1 PR-3 (C8) acceptance samples: every set of ≥ 8 questions (the owner paper,
    // the controller papers, the duplicate-number paper — "a 10-question mixed paper") and every
    // 5-question Maths set (the "golden 5-question Maths sets").
    const nq = Array.isArray(item.job.request && item.job.request.questions) ? item.job.request.questions.length : 0;
    if (item.job.entry === 'set' && nq >= 8) byGrader.papers.push(item);
    if (item.job.entry === 'set' && nq === 5 && /math/i.test(String((item.job.request && item.job.request.subject) || ''))) byGrader.maths5.push(item);
  }
  result.ops = {};
  for (const [k, list] of Object.entries(byGrader)) {
    const lat = list.map((i) => i.record.wallMs).filter((x) => typeof x === 'number');
    const c = costOf(list.map((i) => i.record));
    const mine = (r) => list.some((i) => i.job.jobKey === r.jobKey && i.run === r.run);
    const gradedQs = rows.filter((r) => mine(r) && r.status === 'graded').length;
    result.ops[k] = { jobs: list.length, p50: quant(lat, 0.5), p95: quant(lat, 0.95), max: lat.length ? Math.max(...lat) : null,
      timeouts: list.filter((i) => statusOf(i, null) === 'timeout').length, errors: list.filter((i) => /^error-/.test(statusOf(i, null))).length,
      // PR-3: questions that came back "not graded" because their chunk ran out of time
      timedOutQuestions: rows.filter((r) => mine(r) && r.status === 'timeout').length,
      calls: list.reduce((n, i) => n + ((i.record.calls || []).length), 0),
      callsPerJob: list.length ? Math.round((10 * list.reduce((n, i) => n + ((i.record.calls || []).length), 0)) / list.length) / 10 : null,
      ...c,
      promptPerJob: list.length && c.withUsage ? Math.round(c.promptTotal / list.length) : null, gradedQuestions: gradedQs, usdPerGradedQuestion: gradedQs ? c.usd / gradedQs : null };
  }
  result.rows = rows;
  return result;
}

/** The headline metrics the GOLDEN line prints and the floor guards. */
function headline(res) {
  const c = res.perGrader.combined;
  return {
    mcq: c.mcq.pct,
    total_exact: c.total_exact.pct,
    within_half: c.within_half.pct,
    wrong_step: c.wrong_step.pct,
    type: c.type.pct,
    comments_det: c.comments_det.pct,
    // GRADER-CORE-1 PR-2: "comments 100% true" = the deterministic rules AND the stored judge
    // verdicts (a stale or missing verdict counts as no verdict, never as a pass of the judge).
    comments_judge: c.comments_judge.pct,
    comments: c.comments.pct,
    consistency: c.consistency.pct,
    run_to_run: res.runToRun.combined.pct,
    single_vs_set: res.singleVsSet.pct,
    injection: res.injection.pct,
    m13_declined: res.m13.pct,
    owner_within_half: res.owner.pct,
    chapter: res.chapter.pct,
    no_false_mismatch: res.mismatch.noFalse.pct,
    mismatch_detect: res.mismatch.detect.pct,
    mismatch_legacy: res.mismatch.legacy.pct,
    p0_unanswered: res.p0 ? res.p0.pct : null,
    papers_exact: res.papers ? res.papers.agg.total_exact.pct : null,
    papers_within_half: res.papers ? res.papers.agg.within_half.pct : null,
    papers_type: res.papers ? res.papers.agg.type.pct : null,
    unattempted_v2: res.unattemptedV2 ? res.unattemptedV2.pct : null,
    // GRADER-CORE-1 PR-3 (C8/C10). null ("na") where the replayed run holds no such job.
    dup_q5_graded: res.dup ? res.dup.q5.pct : null,
    owner2_within_half: res.owner2 ? res.owner2.agg.within_half.pct : null,
    owner2_exact: res.owner2 ? res.owner2.agg.total_exact.pct : null,
    detect_owner_paper: res.detectPaper ? res.detectPaper.owner.paperPct : null,
    detect_minus_kept: res.detectPaper ? res.detectPaper.owner.minusPct : null,
    detect_per_question: res.detectPaper ? res.detectPaper.owner.perQuestionPct : null,
    detect_dup_numbers: res.detectPaper ? res.detectPaper.dupT2.pct : null,
  };
}

module.exports = { score, headline, aggregate, PRICES, P3_SURFACES, P4_SURFACES };
