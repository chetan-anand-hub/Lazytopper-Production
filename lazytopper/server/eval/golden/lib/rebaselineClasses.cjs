'use strict';
// lib/rebaselineClasses.cjs — what an A17 re-baseline CLASS may change in a stored body, CHECKED.
//
// WHY (J0-FIXUP, audit FU-A17-REBASELINE-CLASS-UNCHECKED). runs/<id>/rebaseline.json accepts a changed
// body by exact from/to digests, and its `class` was only a label: the audit relabelled a
// not-attempted body "a17-r1-units", and made the units code ALSO take ½ from an unrelated step and
// regenerated `to` — both passed golden.test §11. Now every A17 entry carries `a17.base` (the body's
// digest at the trunk the A17 change was made on) and `a17.delta` (every node that changed, base → to).
// golden.test §11 replays the body, UNDOES the delta and must land exactly on `a17.base` (so nothing
// changed outside the delta), then checks the delta against the class rules below. The generator
// (goldenRebaseline.cjs) writes entries only when these same rules accept them.
//
// THE RULES (owner rulings A17-1/2/3, server/grading/rules.cjs):
//   a17-r1-units          only the steps that end carrying a unit text (the fixed "−½: write the unit
//                         (…)" comment, "already charged once", "no mark is lost for a unit") change;
//                         at most ONE step per question carries the fixed unit comment; the question's
//                         mark moves by exactly what those steps moved.
//   a17-r2-not-attempted  only a question that ends NOT ATTEMPTED (the server's not-attempted note,
//                         0 marks) changes.
//   a17-r3-medium         only the steps that end carrying the fixed medium comment or the
//                         "no mark is lost for the language" line change; at most ONE medium-comment
//                         step per question, which moves by ½ at most; the mark moves by exactly what
//                         those steps moved.
//   a17-rb-cap            (FIXUP-2, owner ruling B) only exam-technique steps that end carrying the cap
//                         line give marks back; the mark moves by exactly what those steps moved.
//   Paper totals (gradedMarksAwarded) move by exactly the sum of the question marks that moved.
//
//   g-conseq-1            (GRADER-CONSEQUENTIAL-1, D242; NOT an A17 class: it is checked on its own, an
//                         entry carries `conseq: { base, delta }` beside any `a17`). A loss that follows
//                         from an earlier typed error moves from "untyped" to that error's type. ONLY:
//                         (1) `marksLostByType` buckets move, the total unchanged, "untyped" never up and
//                         no typed bucket down; (2) a step node gains the single new key `consequentialOf`
//                         (an integer pointing at an EARLIER step) and nothing else about it changes.
//                         No mark, status, type, note or annotation changes anywhere.
//
//   g-mcq-habit-1         (MCQ-TYPE-2, owner ruling 2026-10-23; NOT an A17 class, checked on its own, an
//                         entry carries `habit: { base, delta }`). A RIGHT objective answer with flawed
//                         working keeps its type as a 0-mark habit: on a full-mark objective question ONE
//                         step's type goes null → a type and its summary count goes up by one. Nothing else.

const R = require('../../../grading/rules.cjs');

const UNIT_TEXT = /write the unit \(|The unit was already charged once|No mark is lost for a unit here/;
const MEDIUM_TEXT = /Write in English \(or Hindi in Devanagari\)|No mark is lost for the language this is written in/;
const CAP_TEXT = /Exam-technique deductions in one answer are capped/; // FIXUP-2 ruling B
const STEP_FIELDS = new Set(['teacherAnnotation', 'correctedWorking', 'marksAwarded', 'marksDeducted', 'mistakeType', 'status']);
const RESULT_TOTALS = new Set(['marksAwarded', 'percentage', 'mistakeSummary', 'marksLostByType', 'teacherNote']);
const A17_CLASSES = ['a17-r1-units', 'a17-r2-not-attempted', 'a17-r3-medium', 'a17-rb-cap'];

const isObj = (v) => v !== null && typeof v === 'object';
/** Every node that differs between a and b: [path, aValue, bValue] at the FIRST differing node. */
function diffBodies(a, b, path = [], out = []) {
  if (JSON.stringify(a) === JSON.stringify(b)) return out;
  if (!isObj(a) || !isObj(b) || Array.isArray(a) !== Array.isArray(b) || (Array.isArray(a) && a.length !== b.length)
    || (!Array.isArray(a) && JSON.stringify(Object.keys(a)) !== JSON.stringify(Object.keys(b)))) {
    out.push([path, a === undefined ? null : a, b === undefined ? null : b]);
    return out;
  }
  for (const k of Object.keys(a)) diffBodies(a[k], b[k], path.concat([Array.isArray(a) ? Number(k) : k]), out);
  return out;
}
const getAt = (o, p) => p.reduce((x, k) => (x == null ? undefined : x[k]), o);
/** The body before the delta, or null when the body does not carry the delta's `to` values. */
function undoDelta(body, delta) {
  const c = JSON.parse(JSON.stringify(body));
  for (const [p, from, to] of delta) {
    if (JSON.stringify(getAt(c, p)) !== JSON.stringify(to)) return null;
    if (p.length === 0) return from;
    getAt(c, p.slice(0, -1))[p[p.length - 1]] = from;
  }
  return c;
}

const CONSEQ_CLASS = 'g-conseq-1';
const BUCKETS = ['conceptual', 'calculation', 'silly', 'presentation', 'unattempted', 'untyped'];
/** g-conseq-1 rule violations for ONE delta (see the header). Independent of the A17 classes. */
function conseqViolations(delta, toBody) {
  const out = [];
  const perResult = new Map(); // result key -> { buckets: {bucket: move}, steps: n, pointed: Set(types of the steps pointed at) }
  for (const [p, from, to] of delta) {
    const at = p[0] === 'results' && Number.isInteger(p[1]) ? { key: JSON.stringify(p.slice(0, 2)), rest: p.slice(2) } : { key: '[]', rest: p };
    if (!perResult.has(at.key)) perResult.set(at.key, { buckets: {}, steps: 0, pointed: new Set() });
    const pr = perResult.get(at.key);
    if (at.rest[0] === 'marksLostByType' && at.rest.length === 2 && BUCKETS.includes(at.rest[1])) {
      pr.buckets[at.rest[1]] = (Number(to) || 0) - (Number(from) || 0);
      continue;
    }
    if (at.rest[0] === 'annotatedSteps' && Number.isInteger(at.rest[1]) && at.rest.length === 2 && isObj(from) && isObj(to)) {
      const k = at.rest[1];
      const { consequentialOf, ...toRest } = to;
      if (from.consequentialOf !== undefined) { out.push(p.join('.') + ': the step already carried consequentialOf'); continue; }
      if (!Number.isInteger(consequentialOf) || consequentialOf < 1 || consequentialOf > k) { out.push(p.join('.') + ': consequentialOf must name an EARLIER step'); continue; }
      if (JSON.stringify(from) !== JSON.stringify(toRest)) { out.push(p.join('.') + ': the step changed by more than the new consequentialOf key'); continue; }
      // D248: the loss moves to the type of the step it points at - that step must exist in the body and be typed
      const origin = getAt(toBody, at.key === '[]' ? [] : JSON.parse(at.key).concat(['annotatedSteps', consequentialOf - 1]));
      if (!isObj(origin) || typeof origin.mistakeType !== 'string' || !BUCKETS.includes(origin.mistakeType)) { out.push(p.join('.') + ': consequentialOf points at a step with no type'); continue; }
      pr.pointed.add(origin.mistakeType);
      pr.steps += 1;
      continue;
    }
    out.push(p.join('.') + ': outside the ' + CONSEQ_CLASS + ' rules');
  }
  for (const [key, pr] of perResult) {
    const moves = BUCKETS.map((b) => pr.buckets[b] || 0);
    const sum = moves.reduce((a, b) => a + b, 0);
    if (Math.abs(sum) > 1e-9) out.push(key + ': the loss total moved by ' + sum);
    if ((pr.buckets.untyped || 0) > 1e-9) out.push(key + ': "untyped" went up');
    for (const b of BUCKETS) if (b !== 'untyped' && (pr.buckets[b] || 0) < -1e-9) out.push(key + ': ' + b + ' went down');
    if (pr.steps === 0 && moves.some((m) => Math.abs(m) > 1e-9)) out.push(key + ': buckets moved but no step carries consequentialOf');
    if (pr.steps > 0 && !(pr.buckets.untyped < -1e-9)) out.push(key + ': a step is consequential but no untyped loss moved');
    // D248: the buckets that gained are exactly the types of the steps pointed at
    const gained = BUCKETS.filter((b) => b !== 'untyped' && (pr.buckets[b] || 0) > 1e-9);
    for (const b of gained) if (!pr.pointed.has(b)) out.push(key + ': ' + b + ' gained but no consequential step points at a ' + b + ' step');
    for (const b of pr.pointed) if (!gained.includes(b)) out.push(key + ': a consequential step points at a ' + b + ' step but ' + b + ' did not gain');
  }
  return out;
}

const HABIT_CLASS = 'g-mcq-habit-1';
const HABIT_TYPES = ['conceptual', 'calculation', 'silly', 'presentation'];
/** g-mcq-habit-1 (MCQ-TYPE-2, owner ruling 2026-10-23) rule violations for ONE delta. A RIGHT objective
 *  answer with flawed working keeps its type as a 0-mark habit. ONLY, per question: the question is
 *  objective and scores FULL in the new body; exactly one step's `mistakeType` goes null → a type;
 *  `mistakeSummary.<that type>` goes up by exactly one and nothing else in the summary moves. No mark,
 *  status, annotation, marksLostByType, note or any other field changes anywhere. */
function habitViolations(delta, toBody) {
  const out = [];
  const perResult = new Map(); // key -> { result, stepGains: {type: n}, summaryGains: {type: n} }
  for (const [p, from, to] of delta) {
    const at = p[0] === 'results' && Number.isInteger(p[1]) ? { prefix: p.slice(0, 2), rest: p.slice(2) } : { prefix: [], rest: p };
    const key = JSON.stringify(at.prefix);
    if (!perResult.has(key)) perResult.set(key, { result: getAt(toBody, at.prefix), stepGains: {}, summaryGains: {} });
    const pr = perResult.get(key);
    if (at.rest.length === 3 && at.rest[0] === 'annotatedSteps' && Number.isInteger(at.rest[1]) && at.rest[2] === 'mistakeType') {
      if (from !== null || !HABIT_TYPES.includes(to)) { out.push(p.join('.') + ': a step type may only go from null to a mistake type'); continue; }
      pr.stepGains[to] = (pr.stepGains[to] || 0) + 1;
      continue;
    }
    if (at.rest.length === 2 && at.rest[0] === 'mistakeSummary' && HABIT_TYPES.includes(at.rest[1])) {
      pr.summaryGains[at.rest[1]] = (Number(to) || 0) - (Number(from) || 0);
      continue;
    }
    out.push(p.join('.') + ': outside the ' + HABIT_CLASS + ' rules');
  }
  for (const [key, pr] of perResult) {
    const r = pr.result;
    if (!isObj(r) || r.objective !== true) { out.push(key + ': not an objective question'); continue; }
    if (!(Number(r.marksAwarded) === Number(r.totalMarks) && Number(r.totalMarks) > 0)) out.push(key + ': not a full-mark answer');
    const gained = Object.values(pr.stepGains).reduce((a, b) => a + b, 0);
    if (gained !== 1) out.push(key + ': ' + gained + ' steps gained a type (exactly one may)');
    for (const t of HABIT_TYPES) if ((pr.stepGains[t] || 0) !== (pr.summaryGains[t] || 0)) out.push(key + ': ' + t + ' summary moved ' + (pr.summaryGains[t] || 0) + ' but steps gained ' + (pr.stepGains[t] || 0));
  }
  return out;
}

/** Rule violations of `classes` (array) for one entry's delta; [] = accepted. */
function classViolations(classes, delta, toBody) {
  const cls = new Set(classes);
  const out = [];
  const perResult = new Map(); // result path key -> { result, steps: Map(k -> marks delta), marks: delta|null }
  const resultOf = (p) => (p[0] === 'results' && Number.isInteger(p[1]) ? { prefix: p.slice(0, 2), rest: p.slice(2) } : { prefix: [], rest: p });
  let topGraded = null;
  for (const [p, from, to] of delta) {
    if (p[0] === 'gradedMarksAwarded') { topGraded = Number(to) - Number(from); continue; }
    const { prefix, rest } = resultOf(p);
    const result = getAt(toBody, prefix);
    const key = JSON.stringify(prefix);
    if (!perResult.has(key)) perResult.set(key, { result, steps: new Map(), marks: null });
    const pr = perResult.get(key);
    if (!isObj(result)) { out.push(p.join('.') + ': not inside a question result'); continue; }
    if (cls.has('a17-r2-not-attempted') && result.teacherNote === R.NOT_ATTEMPTED_NOTE && Number(result.marksAwarded) === 0) continue;
    if (rest[0] === 'annotatedSteps' && Number.isInteger(rest[1]) && (rest.length === 2 || STEP_FIELDS.has(rest[2]))) {
      const step = (result.annotatedSteps || [])[rest[1]] || {};
      const ann = String(step.teacherAnnotation || '');
      const ok = (cls.has('a17-r1-units') && UNIT_TEXT.test(ann)) || (cls.has('a17-r3-medium') && MEDIUM_TEXT.test(ann)) || (cls.has('a17-rb-cap') && CAP_TEXT.test(ann));
      if (!ok) { out.push(p.join('.') + ': a step that ends with no ' + [...cls].join('/') + ' text changed'); continue; }
      if (rest[2] === 'marksAwarded') pr.steps.set(rest[1], (pr.steps.get(rest[1]) || 0) + (Number(to) - Number(from)));
      continue;
    }
    if (RESULT_TOTALS.has(rest[0]) && (cls.has('a17-r1-units') || cls.has('a17-r3-medium') || cls.has('a17-rb-cap'))) {
      if (rest[0] === 'marksAwarded' && rest.length === 1) pr.marks = Number(to) - Number(from);
      continue;
    }
    out.push(p.join('.') + ': outside every rule of ' + [...cls].join('+'));
  }
  let questionMoves = 0;
  for (const [key, pr] of perResult) {
    const r = pr.result;
    if (!isObj(r)) continue;
    const steps = Array.isArray(r.annotatedSteps) ? r.annotatedSteps : [];
    if (steps.filter((s) => /^−½: write the unit \(/.test(String(s.teacherAnnotation || ''))).length > 1) out.push(key + ': more than one unit charge in a question');
    const medium = steps.filter((s) => s.teacherAnnotation === R.MEDIUM_COMMENT);
    if (medium.length > 1) out.push(key + ': more than one medium charge in a question');
    if (r.teacherNote === R.NOT_ATTEMPTED_NOTE && cls.has('a17-r2-not-attempted')) continue;
    const stepSum = [...pr.steps.values()].reduce((a, b) => a + b, 0);
    const mark = pr.marks === null ? 0 : pr.marks;
    if (Math.abs(stepSum - mark) > 1e-9) out.push(key + ': the mark moved ' + mark + ' but the rule steps moved ' + stepSum);
    for (const [k, d] of pr.steps) if (steps[k] && steps[k].teacherAnnotation === R.MEDIUM_COMMENT && (d < -0.5 - 1e-9)) out.push(key + ': the medium step lost more than ½');
    questionMoves += mark;
  }
  if (topGraded !== null && Math.abs(topGraded - questionMoves) > 1e-9) out.push('gradedMarksAwarded moved ' + topGraded + ' but the questions moved ' + questionMoves);
  return out;
}

/** The smallest set of A17 classes that accepts a delta, or null. */
function classesFor(delta, toBody) {
  // every non-empty subset, smallest first
  const n = A17_CLASSES.length;
  const sets = [];
  for (let m = 1; m < (1 << n); m += 1) sets.push(A17_CLASSES.filter((_, i) => m & (1 << i)));
  sets.sort((x, y) => x.length - y.length);
  for (const s of sets) {
    if (classViolations(s, delta, toBody).length) continue;
    // each class in the set must be NEEDED (a superfluous label is a false label)
    if (s.every((c) => s.length === 1 || classViolations(s.filter((x) => x !== c), delta, toBody).length > 0)) return s;
  }
  return null;
}

module.exports = { diffBodies, undoDelta, classViolations, classesFor, A17_CLASSES, CONSEQ_CLASS, conseqViolations, HABIT_CLASS, habitViolations };
