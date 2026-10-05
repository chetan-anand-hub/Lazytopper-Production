'use strict';
// lib/shape.cjs — G2, the response-SHAPE guard.
//
// For every P15 call site (shapes/callsites.json) the call site's request shape (a planner
// job, WITHOUT acceptsV2) is run through the CURRENT real handlers with a STUBBED model, in
// three outcomes — a normal grade, a parse miss (unparseable reply twice), a provider
// timeout — and the response's SHAPE is taken: key set, value types and nesting, never the
// values. Arrays are shaped element by element, so a couldNotRead entry and a graded entry
// are pinned separately. shapes/snapshot.json holds today's shapes; shapes.test.cjs fails,
// naming the call site, outcome and path, if any of them moves.

const fs = require('fs');
const path = require('path');
const { createDriver } = require('./driver.cjs');
const { buildPlan } = require('./planner.cjs');

const SHAPES_DIR = path.join(__dirname, '..', 'shapes');

function shapeOf(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return v.map(shapeOf);
  if (typeof v === 'object') {
    const o = {};
    for (const k of Object.keys(v).sort()) o[k] = shapeOf(v[k]);
    return o;
  }
  return typeof v;
}

// Canned model replies — fixed, so the snapshot is reproducible. Deliberately exercise the
// optional fields (a typed partial step, a departure flag, couldNotRead) so a field that
// appears or disappears in ANY branch moves the shape.
function cannedSingle() {
  return JSON.stringify({
    totalMarks: 2, marksAwarded: 1.5,
    annotatedSteps: [
      { stepNumber: 1, description: 'Method', studentWork: 'line 1', status: 'correct', marksAwarded: 1, marksDeducted: 0, teacherAnnotation: 'ok', mistakeType: null, correctedWorking: null, isDeparture: false, isReturn: false },
      { stepNumber: 2, description: 'Answer', studentWork: 'line 2', status: 'partial', marksAwarded: 0.5, marksDeducted: 0.5, teacherAnnotation: 'slip', mistakeType: 'calculation', correctedWorking: 'fixed', isDeparture: false, isReturn: false },
    ],
    mistakeSummary: { conceptual: 0, calculation: 1, silly: 0, presentation: 0 },
    finalAnswerCorrect: false, teacherNote: 'note',
  });
}
function cannedSet(questions) {
  const results = questions.map((q, i) => {
    if (questions.length > 1 && i === questions.length - 1) return { qNumber: q.qNumber, couldNotRead: true, note: 'unreadable' };
    return {
      qNumber: q.qNumber, couldNotRead: false, marksAwarded: 1,
      annotatedSteps: [
        { stepNumber: 1, description: 'Method', studentWork: 'w', status: 'correct', marksAwarded: 1, marksDeducted: 0, teacherAnnotation: 'ok', mistakeType: null, correctedWorking: null, isDeparture: false, isReturn: false },
        { stepNumber: 2, description: 'Answer', studentWork: 'w2', status: 'incorrect', marksAwarded: 0, marksDeducted: 1, teacherAnnotation: 'x', mistakeType: 'conceptual', correctedWorking: 'c', isDeparture: i === 0, isReturn: false },
      ],
      mistakeSummary: { conceptual: 1, calculation: 0, silly: 0, presentation: 0 },
      finalAnswerCorrect: false, teacherNote: 'n',
    };
  });
  return JSON.stringify({ results, summary: 's' });
}
function cannedDetect() {
  return JSON.stringify({ detectedMarks: 2, marksSource: 'stated', detectedSubject: 'Maths', detectedTopic: 'polynomials', detectedObjective: false, detectedAnswer: null,
    questions: [{ questionNumber: 1, questionText: 'q', marks: 2, marksSource: 'stated', objective: false, answer: null }] });
}

function stubFor(job, outcome) {
  return async () => {
    if (outcome === 'timeout') { const e = new Error('Gemini request timed out after 55000ms'); e.status = 504; throw e; }
    if (outcome === 'parseMiss') return { text: 'not json', raw: { candidates: [{ finishReason: 'MAX_TOKENS' }] } };
    const text = job.handler === 'handleCheckSolution' ? cannedSingle()
      : job.handler === 'handleGradeWorksheet' ? cannedSet(job.request.questions)
        : cannedDetect();
    return { text, raw: { candidates: [{ finishReason: 'STOP' }] } };
  };
}

async function computeAll() {
  const sites = JSON.parse(fs.readFileSync(path.join(SHAPES_DIR, 'callsites.json'), 'utf8')).callSites;
  const plan = Object.fromEntries(buildPlan({ includeDetect: true }).map((j) => [j.jobKey, j]));
  const out = {};
  for (const s of sites) {
    const job = plan[s.planJob];
    if (!job) throw new Error('shape: plan job ' + s.planJob + ' not found for call site ' + s.id);
    if ('acceptsV2' in job.request) throw new Error('shape: call site ' + s.id + ' request carries acceptsV2 — G2 pins the WITHOUT-flag shape');
    out[s.id] = { handler: job.handler, requestKeys: Object.keys(job.request).sort() };
    for (const outcome of ['success', 'parseMiss', 'timeout']) {
      const driver = createDriver({ callGemini: stubFor(job, outcome), model: 'gemini-2.5-flash' });
      const r = await driver.run(job);
      out[s.id][outcome] = { httpStatus: r.httpStatus, body: shapeOf(r.body) };
    }
  }
  return out;
}

function firstDiff(a, b, p = '$') {
  if (JSON.stringify(a) === JSON.stringify(b)) return null;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null || Array.isArray(a) !== Array.isArray(b)) {
    return p + ': snapshot ' + JSON.stringify(a) + ' vs current ' + JSON.stringify(b);
  }
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    if (!(k in a)) return p + '.' + k + ': NEW field in current (' + JSON.stringify(b[k]).slice(0, 60) + ')';
    if (!(k in b)) return p + '.' + k + ': field MISSING in current';
    const d = firstDiff(a[k], b[k], p + '.' + k);
    if (d) return d;
  }
  return p + ': differs';
}

module.exports = { computeAll, shapeOf, firstDiff, SHAPES_DIR };

if (require.main === module) {
  computeAll().then((shapes) => {
    const file = path.join(SHAPES_DIR, 'snapshot.json');
    if (process.argv.includes('--write')) {
      fs.writeFileSync(file, JSON.stringify({ _about: 'G2 response-shape snapshot per P15 call site (lib/shape.cjs). Requests carry NO acceptsV2. Regenerate only deliberately: node server/eval/golden/lib/shape.cjs --write', shapes }, null, 1) + '\n');
      process.stdout.write('wrote ' + file + ' (' + Object.keys(shapes).length + ' call sites)\n');
    } else {
      process.stdout.write(JSON.stringify(shapes, null, 1).slice(0, 2000) + '\n');
    }
  }).catch((e) => { process.stderr.write(String(e.stack || e) + '\n'); process.exit(1); });
}
