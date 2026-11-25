'use strict';
// server/grading/locate.cjs — LOCATE-FIRST-1 (owner, 25 Nov 2026): find WHICH answer is WHICH before grading.
//
// THE CAUSE (measured 25 Nov, eval key, gemini-3.8-flash). The same Chapter Test sheet graded in 27–30 s when the
// student labelled the answers with the paper's numbers (Q10, Q8 …) and ran into the ~268 s job ceiling when the
// student numbered them their own way (1), 2), 3) …): every grading call — each chunk, each one-question retry, the
// second look — sees the whole document and deliberates (14–18k thinking tokens) over which answer is which.
//
// THE FIX. ONE small "locate" call before grading, on ONE uploaded document holding the answers to two or more
// questions: list every answer on the pages (page, label as written, first line, which question it answers BY
// CONTENT). No thinking (thinkingBudget 0), temperature 0, its own short cap (timing.cjs LOCATE_TIMEOUT_MS), run in
// parallel with the scheme pre-phase. Probe: 2.8–6 s, 20/20 maps exactly right, ≈ Rs 0.1.
// A located map adds ONE block to every grading call of that paper (prompt.cjs locatedBlock) — a hint the grader
// verifies; the grader stays the judge and its page inventory is unchanged.
//
// FAIL-OPEN, always: an error, a timeout, an unparseable reply, a map that places no answer, or a map naming a
// question number that is not in the request → no map, and every grading request is byte-identical to before.
// Kill switch: GRADING_LOCATE_DISABLED=1 (or true/yes) → no locate call at all.

const { fence, fencedNotInstructionsPrompt } = require('./fence.cjs');
const { isObjective } = require('../routes/objectiveScoring.cjs');

const QUESTION_FENCE = 'QUESTION';
const INDENT = '     ';
/** A located first line is quoted back to the grader at most this long (characters). */
const MAX_LINE_CHARS = 200;
const MAX_LABEL_CHARS = 20;
/** At most this many located places are rendered for one question (an answer continued over pages). */
const MAX_PLACES_PER_QUESTION = 3;

/** Kill switch, read per grade. */
function locateDisabled(env = process.env) {
  return /^(1|true|yes)$/i.test(String((env && env.GRADING_LOCATE_DISABLED) || '').trim());
}

/**
 * Review S2/N1: may question `q` carry a located hint line? NOT an objective question (an MCQ / A-R answer such as
 * "1) b" cannot be matched by content: q.objective, an objective qType/section, Section A, printed options or an
 * option key) and NOT a question already answered by typed text or a picked option. Such a question renders exactly
 * as without the block (no line at all).
 */
function hintable(q) {
  if (!q) return false;
  if (q.objective === true || isObjective(q)) return false;
  if (String(q.section || '').trim().toUpperCase() === 'A') return false;
  if (Array.isArray(q.options) && q.options.length > 0) return false;
  if (q.correctOption != null && String(q.correctOption).trim()) return false;
  if (String(q.textAnswer || '').trim() || String(q.pickedOption || '').trim()) return false;
  return true;
}

/** The map restricted to hintable questions (a question number shared with a non-hintable question gets none).
 *  null when no hintable question has a located place — the paper is then graded byte-identically to before. */
function hintableMap(map, questions) {
  if (!(map instanceof Map)) return null;
  const blocked = new Set(questions.filter((q) => !hintable(q)).map((q) => Number(q.qNumber)));
  const out = new Map();
  let placed = 0;
  for (const [n, places] of map) {
    if (blocked.has(n)) continue;
    out.set(n, places);
    if (Array.isArray(places) && places.length > 0) placed += 1;
  }
  return placed > 0 ? out : null;
}

/** The response schema of the locate call (constrained decoding). Small on purpose. */
const LOCATE_RESPONSE_SCHEMA = Object.freeze({
  type: 'OBJECT',
  properties: {
    answers: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          page: { type: 'INTEGER', nullable: true },
          labelAsWritten: { type: 'STRING', nullable: true },
          firstLine: { type: 'STRING', nullable: true },
          answersQuestion: { type: 'INTEGER', nullable: true },
        },
        propertyOrdering: ['page', 'labelAsWritten', 'firstLine', 'answersQuestion'],
      },
    },
  },
  propertyOrdering: ['answers'],
  required: ['answers'],
});

/** The locate request's contents: the question list (fenced) + the document. */
function buildLocateContents({ questions, document, nonce, buildGeminiImagePart }) {
  const mime = String((document && document.imageMimeType) || 'application/pdf');
  const what = mime === 'application/pdf' ? 'PDF' : 'image';
  const text =
    'The attached ' + what + ' holds a CBSE Class 10 student\'s handwritten answers to some of the questions listed below. ' +
    'Students often answer in a DIFFERENT ORDER from the paper, number their answers their OWN way (1), 2), (a) …) or not at all, and continue an answer on a later page. ' +
    'Do NOT grade anything. Only find the answers.\n\n' +
    fencedNotInstructionsPrompt(nonce) + '\n\n' +
    'For EVERY answer written on the pages, in page order, give one entry in "answers":\n' +
    '  - "page": the page number (1 = first page);\n' +
    '  - "labelAsWritten": the label the student wrote beside it, exactly as written ("1)", "Q10", "(b)"), or null if none;\n' +
    '  - "firstLine": the first line of the student\'s own writing of that answer, verbatim;\n' +
    '  - "answersQuestion": the number (as listed below) of the question this answer is an attempt at, decided by its CONTENT (the given values, what it finds or explains) — never by its label alone; null if it clearly answers none of them.\n' +
    'Never list the printed question paper itself, and never list a line that is struck out. Respond ONLY with JSON: { "answers": [ ... ] }.\n\n' +
    'QUESTIONS:\n' +
    questions.map((q) => '  Q' + q.qNumber + '.\n' + fence(QUESTION_FENCE, String(q.questionText || ''), nonce, INDENT)).join('\n');
  const docPart = buildGeminiImagePart({ mimeType: mime, base64: String(document.imageBase64) });
  return [{ role: 'user', parts: [{ text }, docPart] }];
}

const clip = (s, n) => {
  const t = String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n) + '…' : t;
};

/**
 * Validate a parsed locate reply against the request. Returns { ok:true, map, n } or { ok:false, why }.
 * `map`: printed number → [{ page, label, firstLine }]; a number that occurs more than once in the paper → null (no hint).
 * Rejected whole (fail-open): not an object / no answers[] / any answersQuestion that is not a question of the
 * request / no answer placed on any question.
 */
function validateLocate(parsed, questions) {
  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.answers)) return { ok: false, why: 'unparseable' };
  const counts = new Map();
  for (const q of questions) {
    const n = Number(q && q.qNumber);
    counts.set(n, (counts.get(n) || 0) + 1);
  }
  const map = new Map();
  // A printed number that repeats in the paper is ambiguous: it gets NO hint line at all (null), never "none located".
  for (const [qn, c] of counts) if (c !== 1) map.set(qn, null);
  let placed = 0;
  let n = 0;
  for (const a of parsed.answers) {
    if (!a || typeof a !== 'object') continue;
    n += 1;
    const raw = a.answersQuestion;
    if (raw === null || raw === undefined || raw === '') continue;
    const qn = Number(raw);
    if (!Number.isInteger(qn) || !counts.has(qn)) return { ok: false, why: 'unknownQuestion' };
    if (counts.get(qn) !== 1) continue; // ambiguous (above)
    const firstLine = clip(a.firstLine, MAX_LINE_CHARS);
    if (!firstLine) continue;
    const page = Number(a.page);
    const place = { page: Number.isInteger(page) && page > 0 ? page : null, label: clip(a.labelAsWritten, MAX_LABEL_CHARS), firstLine };
    if (!map.has(qn)) map.set(qn, []);
    if (map.get(qn).length < MAX_PLACES_PER_QUESTION) map.get(qn).push(place);
    placed += 1;
  }
  if (placed === 0) return { ok: false, why: 'empty' };
  return { ok: true, map, n };
}

/** Every student-written string of a map (for the nonce: it must occur in none of them). */
function locatedTexts(map) {
  const out = [];
  for (const places of (map instanceof Map ? map.values() : [])) for (const p of (places || [])) out.push(p.label, p.firstLine);
  return out;
}

module.exports = {
  locateDisabled,
  hintable,
  hintableMap,
  LOCATE_RESPONSE_SCHEMA,
  buildLocateContents,
  validateLocate,
  locatedTexts,
  MAX_LINE_CHARS,
  MAX_PLACES_PER_QUESTION,
};
