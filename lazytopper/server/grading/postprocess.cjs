'use strict';
// server/grading/postprocess.cjs — THE ONE POST-PROCESSING PATH (GRADER-CORE-1 PR-2).
//
// Every question the product grades — one question from /api/check-solution, or each of N
// from /api/grade-worksheet — leaves the model through `normaliseQuestionResult`. The two
// entry points used to run two copies of this logic plus a third in the eval harness.
//
// Order of operations (each later stage sees the earlier stage's result):
//   1. couldNotRead (honest-pending)                       — never a fabricated 0
//   2. step normalisation (status, part, marks on the ½ grid)
//   3. ANSWER–QUESTION MISMATCH guard (C3b, evidence-gated)
//   4. withdrawn work set aside (ruling 4: not assessed)
//   5. OBJECTIVE clamp (0 or full on the option alone; C5) / honesty guard
//   6. SUBJECTIVE: unattempted steps → per-PART departure zeroing (ruling 3, C2)
//      → C4 arithmetic check → final-answer key check → no-full-marks cap
//   7. the step ledger reconciled to the mark (steps sum to the total; deductions to the loss)
//   8. comments made true (glyphs, leaks, departure sentence for its kind, rubric validated)
//   9. injected-instruction check (C6): a grade that cites one is withheld, never shipped
//  10. marksLostByType (C7) — computed LAST, asserted to sum to total − awarded
//  11. the legacy shape (no acceptsV2: byte-shape identical to before) or the v2 shape

const {
  isObjective,
  clampObjectiveResult,
  applyObjectiveMistakeGuard,
} = require('../routes/objectiveScoring.cjs');
const R = require('./rules.cjs');
const { falseEqualities, compareFinalAnswer } = require('./verify.cjs');

const TYPES = R.MISTAKE_TYPES;
const VALID_TYPES = new Set(TYPES);
const VALID_STATUS = new Set(R.MODEL_STEP_STATUSES);
const VALID_KINDS = new Set(R.DEPARTURE_KINDS);

const half = (n) => Math.max(0, Math.round((Number(n) || 0) * 2) / 2);
const r2 = (n) => Math.round(n * 100) / 100;
const zeroLost = () => ({ conceptual: 0, calculation: 0, silly: 0, presentation: 0, unattempted: 0, untyped: 0 });

/* ── text helpers ─────────────────────────────────────────────────────────── */

function normText(s) {
  return String(s == null ? '' : s)
    .normalize('NFKC')
    .replace(/[−–—]/g, '-')
    .replace(/[“”"'‘’`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}
function contains(hay, needle) {
  const n = normText(needle);
  return n.length > 0 && normText(hay).includes(n);
}

const INSTRUCTION_WORD = /\b(find|prove|show|explain|what|why|how|which|who|where|when|calculate|compute|state|draw|write|name|give|define|describe|balance|solve|determine|evaluate|simplify|list|identify|compare|differentiate|derive|verify|construct|complete|fill|choose|select|mention|discuss|justify|predict|classify|express|factori[sz]e|convert|obtain|deduce|if|is|are|does|do|can|will|would)\b/i;

/** C3b: is there a REAL question to compare the work against? A chapter/topic name or
 *  "Submitted question" (what Check & Improve sends for a photographed question) is not. */
function isRealQuestionText(q) {
  const t = normText(q && q.questionText);
  if (!t) return false;
  if (t === 'submitted question') return false;
  for (const label of [q.topic, q.topicLabel, q.chapter, q.chapterName]) {
    if (label && normText(label) === t) return false;
  }
  const words = t.split(' ').filter(Boolean);
  if (!/\d/.test(t) && !t.includes('?') && words.length <= 6 && !INSTRUCTION_WORD.test(t)) return false;
  return true;
}

/** C6 · a comment that CITES an instruction found in the work or the question means the
 *  model took that text as instruction. Kept narrow: an ordinary "as per the formula" is
 *  not a citation. */
const INJECTION_CITE = /\b(head examiner|examiner(?:'s|s)? (?:panel|instruction|instructions|override|note)|examiner panel)\b|\bgrading (?:rules )?(?:update|override)\b|\bas (?:per|instructed by) (?:the )?(?:examiner|instruction|instructions|note|panel|system|paper)\b|\binstructions? (?:printed|given|written) (?:on|in) (?:this|the) (?:paper|answer|question|work|page)\b|\bignore (?:all )?previous\b|\bverified as fully correct\b|\baward(?:ed)? full marks as\b|\boverride verified\b/i;

/** C3 · internal machinery a student must never be told about (golden T09). */
const LEAK_SENTENCE = /marking scheme (?:had|has|contained|contains|is|was) (?:an )?(?:error|wrong|garbled|incorrect)|stored (?:marking )?scheme|question text (?:was|is|appears|seems) (?:garbled|corrupt|incomplete)|derived rubric|my derivation|the provided (?:marking )?scheme/i;

function scrubSentences(text, pattern) {
  const s = String(text || '').trim();
  if (!s) return s;
  const pieces = s.split(/(?<=[.!?])\s+/);
  const kept = pieces.filter((p) => !pattern.test(p));
  return kept.join(' ').trim();
}

/** The model is now asked for the rubric in its own field; an older reply (or a model
 *  that ignores the instruction) may still lead its note with "Marked against: …". */
function stripRubricFromNote(note) {
  const s = String(note || '').trim();
  const i = s.indexOf('Marked against');
  if (i < 0) return s;
  const before = s.slice(0, i).trim();
  const after = s.slice(i);
  // the rubric list ends at the first sentence break followed by a capitalised word, or a newline
  const m = after.match(/\.(?=\s+[A-Z])|\n/);
  const rest = m ? after.slice(m.index + 1).trim() : '';
  return (before + ' ' + rest).trim();
}

const TICK = /^\s*(✓|✔)\s*/;
const CROSS = /^\s*(×|✗|✘|x(?=\s))\s*/;
function fixGlyph(ann, step) {
  const a = String(ann || '').trim();
  const lost = (Number(step.marksDeducted) || 0) > 0 || ['incorrect', 'missing', 'unattempted'].includes(step.status);
  if (TICK.test(a) && lost) return a.replace(TICK, (Number(step.marksAwarded) || 0) > 0 ? '½ ' : '× ');
  if (CROSS.test(a) && step.status === 'correct' && !((Number(step.marksDeducted) || 0) > 0)) return a.replace(CROSS, '✓ ');
  return a;
}

/* ── C3 · P0 — "student working" that is really the stored marking scheme ────────
   OR-LIVE R5 (production, 2026-10-05): a Chapter Test photo answered ONLY Q11, and the grader
   returned full marks for eight unanswered questions, their "student working" written from
   the marking scheme the request carries. Two deterministic defences run after the model:
     1. where the server KNOWS a question had no answer input (no photo, no typed text — every
        transport except one document for the whole set), it is UNATTEMPTED, whatever the
        model returned;
     2. a credited step whose `studentWork` reproduces the stored scheme NEAR-VERBATIM — the
        scheme's mark brackets ("[1 mark]"), or its own prose — is not on the page.
   ⚠ CALIBRATED ON THE GOLDEN SET, AND ITS LIMIT IS STATED: a correct student writes the
   scheme's MATHEMATICS (golden genuine lines reach 4-gram containment 1.00 against their
   scheme), so mathematics overlap can never be the signal. The detector fires only on scheme
   PROSE (≥ 4 distinct scheme-only words) at ≥ 0.85 containment, or on a mark bracket — no
   golden genuine line trips it. A PARAPHRASED scheme (what R5 actually returned) scores below
   that and is caught only by the prompt rule and, where it applies, defence 1. */
const SCHEME_COPY_STOP = new Set('that this with from then have into each which their there where when what will shall must should also both such than more less only some same given find show hence therefore thus value values answer correct number numbers equal equals since because step steps write writes written using used method required following question part total marks mark the and for are'.split(' '));
const MARK_BRACKET = /\[\s*(?:\d+(?:\.\d+)?|½)\s*(?:marks?)?\s*\]/i;
const words4 = (s) => normText(s).match(/[a-z]{4,}/g) || [];
function gramContainment(a, b) {
  const n = (s) => String(s || '').normalize('NFKC').toLowerCase().replace(/[×·]/g, 'x').replace(/[−–—]/g, '-')
    .replace(/\[[^\]]*marks?\]/g, '').replace(/[^a-z0-9=+\-/^x.]/g, '');
  const A = n(a);
  const B = n(b);
  if (A.length < 4) return 0;
  const set = new Set();
  for (let i = 0; i + 4 <= B.length; i += 1) set.add(B.slice(i, i + 4));
  let total = 0;
  let hit = 0;
  for (let i = 0; i + 4 <= A.length; i += 1) { total += 1; if (set.has(A.slice(i, i + 4))) hit += 1; }
  return total ? hit / total : 0;
}
/** Does this line of "student work" reproduce the stored scheme rather than the page? */
function copiesScheme(work, q) {
  const w = String(work || '').trim();
  const schemeText = [...(Array.isArray(q.solutionSteps) ? q.solutionSteps : []), q.finalAnswer || ''].join(' ');
  if (!w || !schemeText.trim()) return false;
  // a TYPED answer is on the page by definition: a line found in it is the student's own
  if (String(q.textAnswer || '').trim() && gramContainment(w, q.textAnswer) >= 0.8) return false;
  if (MARK_BRACKET.test(w) && MARK_BRACKET.test(schemeText)) return true;
  const qWords = new Set(words4(q.questionText));
  const schemeOnly = new Set(words4(schemeText).filter((x) => !qWords.has(x) && !SCHEME_COPY_STOP.has(x)));
  const shared = new Set(words4(w).filter((x) => schemeOnly.has(x)));
  return shared.size >= 4 && gramContainment(w, schemeText) >= 0.85;
}

/* ── rubric (C7) ─────────────────────────────────────────────────────────── */

function validRubric(raw, total) {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const items = [];
  for (const it of raw) {
    const point = String((it && it.point) || '').trim();
    const marks = Number(it && it.marks);
    if (!point || !Number.isFinite(marks) || marks < 0 || Math.round(marks * 2) !== marks * 2) return null;
    items.push({ point, marks });
  }
  const sum = r2(items.reduce((a, b) => a + b.marks, 0));
  return Math.abs(sum - total) < 0.01 ? items : null;
}
function rubricLine(items) {
  return 'Marked against: ' + items.map((i) => i.point + ' ' + i.marks).join(', ') + '.';
}

/* ── departures (ruling 3, per PART) ───────────────────────────────────────── */

const partKey = (p) => (p == null ? '' : String(p).toLowerCase().replace(/[^a-z0-9]/g, ''));

/**
 * Accepted departures: a step with isDeparture AND a valid departureKind, at most one per
 * part (two in one part is a contradiction and fails safe to "no departure" in that part).
 * A departure flag WITHOUT a kind zeroes nothing (a miscopy or a slip is not a departure;
 * an absent kind is not evidence).
 * @returns {Array<{ index:number, part:string, kind:string, returnIndex:number }>}
 */
function acceptedDepartures(steps) {
  const byPart = new Map();
  steps.forEach((s, i) => {
    if (s.isDeparture === true && VALID_KINDS.has(s.departureKind)) {
      const k = partKey(s.part);
      (byPart.get(k) || byPart.set(k, []).get(k)).push(i);
    }
  });
  const out = [];
  for (const [k, idx] of byPart) {
    if (idx.length !== 1) continue;
    const d = idx[0];
    let ret = -1;
    for (let j = d + 1; j < steps.length; j += 1) {
      if (partKey(steps[j].part) === k && steps[j].isReturn === true) { ret = j; break; }
    }
    out.push({ index: d, part: k, kind: steps[d].departureKind, returnIndex: ret });
  }
  return out.sort((a, b) => a.index - b.index);
}

/* ── the step ledger ───────────────────────────────────────────────────────── */

function normaliseSteps(rawSteps) {
  return (Array.isArray(rawSteps) ? rawSteps : [])
    .filter((s) => s && s.description)
    .map((s) => {
      const status = VALID_STATUS.has(s.status) ? s.status : 'partial';
      const marksAwardedModel = half(s.marksAwarded);
      const marksDeductedModel = half(s.marksDeducted);
      const avail = s.marksAvailable == null || s.marksAvailable === '' ? null : Number(s.marksAvailable);
      const step = {
        part: s.part == null || String(s.part).trim() === '' || String(s.part).toLowerCase() === 'null' ? null : String(s.part).trim(),
        description: String(s.description || '').trim(),
        studentWork: String(s.studentWork || '').trim(),
        status,
        marksAvailable: Number.isFinite(avail) && avail >= 0 ? half(avail) : null,
        marksAwarded: marksAwardedModel,
        marksDeducted: marksDeductedModel,
        teacherAnnotation: String(s.teacherAnnotation || '').trim(),
        mistakeType: VALID_TYPES.has(s.mistakeType) ? s.mistakeType : null,
        correctedWorking: s.correctedWorking ? String(s.correctedWorking).trim() : null,
        isDeparture: s.isDeparture === true,
        departureKind: VALID_KINDS.has(s.departureKind) ? s.departureKind : null,
        isReturn: s.isReturn === true,
      };
      // What the step could earn, by the model's own ledger when it did not say.
      step._available = step.marksAvailable != null ? step.marksAvailable : half(marksAwardedModel + marksDeductedModel);
      if (status === 'withdrawn') {
        step.marksAwarded = 0; step.marksDeducted = 0; step.marksAvailable = 0; step._available = 0; step.mistakeType = null;
        step.isDeparture = false; step.isReturn = false; step.departureKind = null;
      }
      if (status === 'unattempted') {
        step.marksAwarded = 0; step.mistakeType = null; step.isDeparture = false; step.departureKind = null; step.isReturn = false;
        step.marksDeducted = half(Math.max(step._available, marksDeductedModel));
      }
      return step;
    });
}

/** Spread a reduction of `amount` over the steps from the LAST graded one backwards. */
function takeFromEnd(steps, amount, onTake) {
  let left = half(amount);
  for (let i = steps.length - 1; i >= 0 && left > 0; i -= 1) {
    const s = steps[i];
    if (s.status === 'withdrawn' || !(s.marksAwarded > 0)) continue;
    const t = Math.min(s.marksAwarded, left);
    s.marksAwarded = half(s.marksAwarded - t);
    left = half(left - t);
    if (onTake) onTake(s, t);
  }
}

/* ── the one normaliser ────────────────────────────────────────────────────── */

/**
 * @param {object} q     the SENT question (trusted marks/scheme/key).
 * @param {object|null} raw  the model's entry for it (null when it omitted the question).
 * @param {{ acceptsV2?: boolean, hasTypedAnswer?: boolean }} ctx
 * @returns {object} one per-question result in the legacy or v2 shape. Internal facts for the
 *          caller (`_graded`, `_withheld`) are non-enumerable.
 */
function normaliseQuestionResult(q, raw, ctx = {}) {
  const v2 = ctx.acceptsV2 === true;
  const totalMarks = Number(q.marks) > 0 ? Number(q.marks) : 1;
  const typed = String((q && q.textAnswer) || '').trim().length > 0;
  const bankObjective = isObjective(q);
  const questionIsObjective = bankObjective || (q.objective === true && totalMarks <= 1);

  const pending = (note, extra = {}) => {
    const out = { qNumber: q.qNumber, couldNotRead: true, totalMarks, marksAwarded: 0, note };
    if (v2) {
      Object.assign(out, {
        answerMismatch: null,
        departureKind: null,
        marksLostByType: zeroLost(),
        rubric: null,
        objectiveResolved: questionIsObjective ? false : null,
      }, extra.v2 || {});
    }
    Object.defineProperty(out, '_graded', { value: false });
    Object.defineProperty(out, '_reason', { value: extra.reason || 'couldNotRead' });
    return out;
  };

  // 1 · Honest failure: the model could not locate/read this answer. Never a fabricated 0.
  if (!raw || raw.couldNotRead === true || raw.couldNotRead === 'true') {
    return pending(pendingNote(q, String((raw && raw.note) || '').trim()), { reason: 'couldNotRead' });
  }

  // C3 · P0 — a question with NO answer input is UNATTEMPTED: no marks, no type, whatever
  // the model returned (the model has nothing of the student's to grade for it).
  const unattempted = (note) => {
    const step = {
      stepNumber: 1, description: 'Answer', studentWork: '', status: v2 ? 'unattempted' : 'missing',
      marksAwarded: 0, marksDeducted: totalMarks, teacherAnnotation: '', mistakeType: null,
      correctedWorking: null, isDeparture: false, isReturn: false,
    };
    if (v2) { step.part = null; step.marksAvailable = totalMarks; }
    const out = {
      qNumber: q.qNumber, couldNotRead: false, ok: true, totalMarks, marksAwarded: 0, percentage: 0,
      annotatedSteps: [step],
      mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 0, departure: 0 },
      teacherNote: note, questionDepartureError: false, objective: questionIsObjective,
    };
    if (v2) {
      const lost = zeroLost();
      lost.unattempted = totalMarks;
      Object.assign(out, { answerMismatch: null, departureKind: null, marksLostByType: lost, rubric: null, objectiveResolved: questionIsObjective ? true : null });
    }
    Object.defineProperty(out, '_graded', { value: true });
    Object.defineProperty(out, '_reason', { value: 'unattempted' });
    return out;
  };
  if (ctx.answerInput === false) return unattempted(R.NO_ANSWER_SUBMITTED_NOTE);

  // 2 · steps
  const all = normaliseSteps(raw.annotatedSteps);

  // C3 · P0 — "working" that reproduces the stored scheme is not on the page. When most of
  // the credited steps do, the answer was never there: UNATTEMPTED, never marks.
  {
    const credited = all.filter((s) => (s.status === 'correct' || s.status === 'partial') && s.marksAwarded > 0 && s.studentWork);
    const copied = credited.filter((s) => copiesScheme(s.studentWork, q));
    if (copied.length > 0 && copied.length * 2 >= credited.length) return unattempted(R.NO_ANSWER_ON_PAGE_NOTE);
  }

  // 3 · ANSWER–QUESTION MISMATCH (C3b). Evidence-gated, conservative: the target is ZERO
  //     false mismatches, so "no" is accepted only with a verbatim quote from the question
  //     that really is in the question, a quote from the work (that really is in a typed
  //     answer), and no step the model itself marked correct with marks.
  let answerMismatch = null;
  if (isRealQuestionText(q)) {
    const addr = String(raw.addressesQuestion || '').toLowerCase();
    if (addr === 'yes' || addr === 'partly') answerMismatch = false;
    else if (addr === 'no') {
      const ev = raw.mismatchEvidence || {};
      const qOk = contains(q.questionText, ev.question);
      const wq = String(ev.work || '').trim();
      const wOk = wq.length > 0 && (!typed || contains(q.textAnswer, wq));
      const creditedStep = all.some((s) => s.status === 'correct' && s.marksAwarded > 0);
      answerMismatch = qOk && wOk && !creditedStep;
    }
  }
  if (answerMismatch === true) {
    const out = {
      qNumber: q.qNumber, couldNotRead: false, ok: true, totalMarks, marksAwarded: 0, percentage: 0,
      annotatedSteps: [],
      mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 0, departure: 0 },
      teacherNote: v2 ? R.MISMATCH_NOTE_V2 : R.MISMATCH_NOTE_LEGACY,
      questionDepartureError: false,
      objective: questionIsObjective,
    };
    if (v2) Object.assign(out, { answerMismatch: true, departureKind: null, marksLostByType: zeroLost(), rubric: null, objectiveResolved: questionIsObjective ? false : null });
    Object.defineProperty(out, '_graded', { value: !v2 }); // legacy: a real examiner 0; v2: not graded
    Object.defineProperty(out, '_reason', { value: 'answerMismatch' });
    return out;
  }

  // 4 · withdrawn work is not assessed: it never enters marks, ECF, types or counts.
  const steps = all.filter((s) => s.status !== 'withdrawn');

  // 5 · OBJECTIVE: 0 or full on the option alone.
  let objectiveVerdict = null;
  if (questionIsObjective) {
    objectiveVerdict = clampObjectiveResult(q, steps, totalMarks, raw.finalAnswerCorrect);
    if (!objectiveVerdict.resolved && v2) {
      // An unread pick is honest-UNGRADED, never a 0 (owner ruling ②) — said to a client
      // that can render it (`objectiveResolved: false`). The legacy shape has no way to say
      // "ungraded" for an answered question, so a legacy client keeps today's 0 (C7: opt-in).
      return pending(R.UNREAD_OPTION_NOTE, { reason: 'objectiveUnresolved', v2: { objectiveResolved: false } });
    }
  }
  applyObjectiveMistakeGuard(steps, { objective: questionIsObjective, options: q.options });

  // 6 · SUBJECTIVE marks
  let departures = [];
  const zeroedBy = new Map(); // step index -> departure step index
  let noFullMarks = false;
  let arithmeticFlags = 0;
  if (!questionIsObjective) {
    departures = acceptedDepartures(steps);
    for (const d of departures) {
      const end = d.returnIndex >= 0 ? d.returnIndex : steps.length;
      for (let j = d.index + 1; j < end; j += 1) {
        if (partKey(steps[j].part) !== d.part) continue;
        if (steps[j].status === 'unattempted') continue;
        steps[j].marksAwarded = 0;
        zeroedBy.set(j, d.index);
      }
    }
    // C4.1 · arithmetic: a plain numeric equality that is false is not a correct step.
    steps.forEach((s, i) => {
      if (zeroedBy.has(i) || s.status !== 'correct' || !(s.marksAwarded > 0)) return;
      const bad = falseEqualities(s.studentWork);
      if (!bad.length) return;
      arithmeticFlags += 1;
      s.marksAwarded = s.marksAwarded <= 1 ? 0 : half(s.marksAwarded - 1);
      s.status = s.marksAwarded > 0 ? 'partial' : 'incorrect';
      if (!s.mistakeType) s.mistakeType = 'calculation';
      const note = 'Check the arithmetic here: ' + bad[0].left + ' is not ' + bad[0].right + '.';
      s.teacherAnnotation = (s.marksAwarded > 0 ? '½ ' : '× ') + note;
      s._flagged = true;
    });
    if (arithmeticFlags > 0) noFullMarks = true;
  }
  // C3 · a corrected version that is itself arithmetically false is not shown.
  for (const s of steps) {
    if (s.correctedWorking && falseEqualities(s.correctedWorking).length) s.correctedWorking = null;
  }

  // The model's stated verdict on the final answer (derived from the last step when silent).
  let finalAnswerCorrect;
  if (raw.finalAnswerCorrect === true || raw.finalAnswerCorrect === 'true') finalAnswerCorrect = true;
  else if (raw.finalAnswerCorrect === false || raw.finalAnswerCorrect === 'false') finalAnswerCorrect = false;
  else finalAnswerCorrect = steps.length ? steps[steps.length - 1].status === 'correct' : false;

  let marksAwarded;
  let keyCheck = 'skip';
  if (questionIsObjective) {
    marksAwarded = objectiveVerdict.marksAwarded;
  } else {
    // C4.2 · the stored final answer, compared before full marks are allowed.
    if (q.finalAnswer) {
      const last = [...steps].reverse().find((s) => s.studentWork) || null;
      keyCheck = compareFinalAnswer(raw.studentFinalAnswer || (last && last.studentWork) || '', q.finalAnswer);
      if (keyCheck === 'mismatch') { noFullMarks = true; finalAnswerCorrect = false; }
    }
    if (finalAnswerCorrect === false) noFullMarks = true;
    const stepSum = steps.reduce((a, s) => a + (Number(s.marksAwarded) || 0), 0);
    const cap = noFullMarks ? Math.max(0, totalMarks - 0.5) : totalMarks;
    marksAwarded = half(Math.min(stepSum, cap));
    // 7 · the steps shown must sum to the mark: take any excess from the end.
    if (stepSum > marksAwarded) {
      takeFromEnd(steps, stepSum - marksAwarded, (s) => {
        if (s.status === 'correct') s.status = s.marksAwarded > 0 ? 'partial' : 'incorrect';
        if (keyCheck === 'mismatch' && !s._flagged) {
          s.teacherAnnotation = (s.marksAwarded > 0 ? '½ ' : '× ') + 'Your final answer does not match the correct value — re-check this step.';
          s._flagged = true;
        }
      });
    }
  }

  // 7b · deductions: what each step could earn minus what it earned; below a departure the
  //      charge is ONCE, on the departure step (CBSE 11), so zeroed steps carry no deduction.
  if (!questionIsObjective) {
    steps.forEach((s, i) => {
      if (zeroedBy.has(i)) { s.marksDeducted = 0; return; }
      if (s.status === 'unattempted') return;
      const ded = half(Math.max(0, s._available - s.marksAwarded));
      if (s._flagged || s.marksAvailable != null || ded > s.marksDeducted) s.marksDeducted = ded;
    });
    if (departures.length === 0) {
      const lost = half(totalMarks - marksAwarded);
      let sum = half(steps.reduce((a, s) => a + s.marksDeducted, 0));
      if (sum > lost) {
        // over-charged: release untyped charges first, then typed ones, from the end
        for (const typedPass of [false, true]) {
          for (let i = steps.length - 1; i >= 0 && sum > lost; i -= 1) {
            const s = steps[i];
            if (Boolean(s.mistakeType) !== typedPass || !(s.marksDeducted > 0)) continue;
            const t = Math.min(s.marksDeducted, half(sum - lost));
            s.marksDeducted = half(s.marksDeducted - t);
            sum = half(sum - t);
          }
        }
      } else if (sum < lost) {
        const target = [...steps].reverse().find((s) => s.marksDeducted > 0 || s.status !== 'correct') || steps[steps.length - 1];
        if (target) target.marksDeducted = half(target.marksDeducted + (lost - sum));
      }
    }
  }

  // Types are owed only where marks were lost (owner: no type where none is due).
  if (questionIsObjective) {
    if (objectiveVerdict.correct) for (const s of steps) s.mistakeType = null;
  } else {
    for (const s of steps) {
      if (s.mistakeType && !(s.marksDeducted > 0) && s.marksAwarded >= s._available && s.status === 'correct') s.mistakeType = null;
    }
  }

  // 8 · comments made true
  const primaryDeparture = departures[0] || null;
  for (const s of steps) {
    s.teacherAnnotation = scrubSentences(fixGlyph(s.teacherAnnotation, s), LEAK_SENTENCE);
  }
  let note = stripRubricFromNote(raw.teacherNote);
  note = scrubSentences(note, LEAK_SENTENCE);
  const rubric = validRubric(raw.rubric, totalMarks);
  if (primaryDeparture) {
    const line = primaryDeparture.returnIndex >= 0
      ? R.DEPARTURE_RETURN_LINES[primaryDeparture.kind]
      : R.DEPARTURE_LINES[primaryDeparture.kind];
    note = note ? note + ' ' + line : line;
  }
  if (!v2 && rubric) note = note ? rubricLine(rubric) + ' ' + note : rubricLine(rubric);
  if (!note) note = 'You scored ' + marksAwarded + ' of ' + totalMarks + '.';

  // 9 · C6: a grade whose comments cite an injected instruction is withheld, never shipped.
  const commentText = [note, ...steps.map((s) => s.teacherAnnotation)].join(' \n ');
  if (INJECTION_CITE.test(commentText)) {
    return pending(R.INJECTION_WITHHELD_NOTE, { reason: 'injectionCited' });
  }

  // mistake counts: step types, the departure charged ONCE, zeroed steps uncounted.
  const counts = { conceptual: 0, calculation: 0, silly: 0, presentation: 0 };
  steps.forEach((s, i) => {
    if (zeroedBy.has(i)) return;
    if (s.mistakeType && counts[s.mistakeType] !== undefined) counts[s.mistakeType] += 1;
  });
  const mistakeSummary = { ...counts, departure: departures.length > 0 ? 1 : 0 };

  // 10 · marksLostByType — LAST, from the final ledger; sums to total − awarded by construction.
  const lost = half(totalMarks - marksAwarded);
  const marksLostByType = zeroLost();
  if (questionIsObjective) {
    if (lost > 0) {
      const typed1 = steps.find((s) => s.mistakeType);
      marksLostByType[typed1 ? typed1.mistakeType : 'untyped'] = lost;
    }
  } else {
    let left = lost;
    const put = (bucket, amt) => {
      const t = Math.min(left, half(amt));
      if (t > 0) { marksLostByType[bucket] = half(marksLostByType[bucket] + t); left = half(left - t); }
    };
    steps.forEach((s, i) => {
      if (zeroedBy.has(i)) {
        const dep = steps[zeroedBy.get(i)];
        put(dep && dep.mistakeType ? dep.mistakeType : 'untyped', Math.max(0, s._available - s.marksAwarded));
        return;
      }
      if (s.status === 'unattempted') { put('unattempted', s.marksDeducted); return; }
      put(s.mistakeType || 'untyped', s.marksDeducted);
    });
    if (left > 0) put('untyped', left);
  }
  const lostSum = half(Object.values(marksLostByType).reduce((a, b) => a + b, 0));
  if (Math.abs(lostSum - lost) > 1e-9) {
    // unreachable by construction; never ship a ledger that does not add up
    marksLostByType.untyped = half(Math.max(0, marksLostByType.untyped + (lost - lostSum)));
  }

  // 11 · shape
  // v2 keeps each withdrawn attempt as its own 0-mark step (D11); legacy never sees them.
  const emitted = v2 ? all : steps;
  const outSteps = emitted.map((s, i) => {
    const base = {
      stepNumber: i + 1,
      description: s.description,
      studentWork: s.studentWork,
      status: v2 ? s.status : s.status === 'unattempted' ? 'missing' : s.status,
      marksAwarded: s.marksAwarded,
      marksDeducted: s.marksDeducted,
      teacherAnnotation: s.teacherAnnotation,
      mistakeType: s.mistakeType,
      correctedWorking: s.correctedWorking,
      isDeparture: s.isDeparture,
      isReturn: s.isReturn,
    };
    if (v2) {
      base.part = s.part;
      base.marksAvailable = s.status === 'withdrawn' ? 0 : s._available;
    }
    return base;
  });

  const out = {
    qNumber: q.qNumber,
    couldNotRead: false,
    ok: true,
    totalMarks,
    marksAwarded,
    percentage: Math.round((marksAwarded / totalMarks) * 100),
    annotatedSteps: outSteps,
    mistakeSummary,
    teacherNote: note,
    questionDepartureError: departures.length > 0,
    objective: questionIsObjective,
  };
  if (v2) {
    Object.assign(out, {
      answerMismatch,
      departureKind: primaryDeparture ? primaryDeparture.kind : null,
      marksLostByType,
      rubric,
      objectiveResolved: questionIsObjective ? true : null,
    });
  }
  Object.defineProperty(out, '_graded', { value: true });
  Object.defineProperty(out, '_reason', { value: 'graded' });
  Object.defineProperty(out, '_finalAnswerCorrect', { value: finalAnswerCorrect });
  Object.defineProperty(out, '_keyCheck', { value: keyCheck });
  Object.defineProperty(out, '_arithmeticFlags', { value: arithmeticFlags });
  return out;
}

/* ── honest-pending notes (TYPED-3: never "re-upload" for a student who typed) ── */
const PHOTO_ADVICE = /re-?upload|re-?scan|re-?photograph|photo|picture|image|scan|legib|handwrit|hand-writ|clear(er|ly)? (?:writ|hand)/i;
const TYPED_PENDING_NOTE = "We couldn't grade your typed answer for this question — try writing out your working step by step and submit again.";
const PHOTO_PENDING_NOTE = "We couldn't read your answer for this question clearly — re-upload this page.";
function pendingNote(q, modelNote) {
  const typed = String((q && q.textAnswer) || '').trim().length > 0;
  if (!typed) return modelNote || PHOTO_PENDING_NOTE;
  if (!modelNote || PHOTO_ADVICE.test(modelNote)) return TYPED_PENDING_NOTE;
  return modelNote;
}

module.exports = {
  normaliseQuestionResult,
  copiesScheme,
  gramContainment,
  isRealQuestionText,
  acceptedDepartures,
  validRubric,
  stripRubricFromNote,
  INJECTION_CITE,
  LEAK_SENTENCE,
  TYPED_PENDING_NOTE,
  PHOTO_PENDING_NOTE,
  zeroLost,
};
