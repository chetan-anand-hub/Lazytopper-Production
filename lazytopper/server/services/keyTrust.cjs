'use strict';
/**
 * keyTrust - TUTOR-KEY-TRUST-1. PURE helpers (no network, no Firestore, no clock) for evidence-based key trust.
 *
 * The tutor explains the bank key by default. It may say the key looks wrong ONLY on evidence INSIDE the row:
 * the row's own solution steps / final answer arrive at a DIFFERENT option than the key, or an MCQ key names no
 * option. `detectKeyMismatch` finds that evidence in code (not in the model's opinion) so the prompt can carry it
 * and the server can flag it. A bare disagreement from the model is an "opinion", logged but never voiced.
 */

// Same shapes as tutor.cjs TUTOR_LETTER_CLAIM, plus the "option X is correct" word order. Letters a-d only.
const LETTER_CLAIMS = [
  /\b(?:(?:correct|right)\s+(?:answer|option|choice)\s+(?:is|would be)|answer\s+(?:is|would be)|answer\s*[:=])\s*(?:option\s+)?\(?([a-d])\b/gi,
  /\b(?:option|choice)\s*\(?([a-d])\)?\s+(?:is|would be)\s+(?:the\s+)?(?:correct|right)\b/gi,
];
const BARE_LETTER = /^\s*(?:option\s+)?\(?([a-d])\)?\s*[.)]?\s*$/i;
const LETTERS = 'ABCDEFGH';

function lettersClaimedIn(text) {
  const out = [];
  const t = String(text || '');
  for (const re of LETTER_CLAIMS) {
    re.lastIndex = 0;
    for (const m of t.matchAll(re)) out.push(m[1].toUpperCase());
  }
  return out;
}

/**
 * The row's own evidence that its key is wrong, or null. `a` is a NORMALISED anchorQuestion (tutor.cjs).
 *  - "steps-differ": a solution step / the final answer names option X as the answer, but the key is option Y.
 *  - "no-option":    the row has options but its key resolves to none of them (answerLetter absent).
 * Returns { kind, reason } where reason is plain text safe to show the tutor (letters only, no free text).
 */
function detectKeyMismatch(a) {
  if (!a || typeof a !== 'object') return null;
  const options = Array.isArray(a.options) ? a.options.filter((o) => typeof o === 'string' && o.trim()) : [];
  const hasKey = !!((typeof a.answer === 'string' && a.answer.trim()) || (typeof a.finalAnswer === 'string' && a.finalAnswer.trim()));
  const letter = typeof a.answerLetter === 'string' && /^[A-H]$/.test(a.answerLetter) ? a.answerLetter : '';
  if (options.length >= 2 && hasKey && !letter) {
    return { kind: 'no-option', reason: 'The key does not match any of the listed options.' };
  }
  if (!letter) return null;
  const claimed = new Set();
  const steps = Array.isArray(a.solutionSteps) ? a.solutionSteps : [];
  for (const s of steps) for (const l of lettersClaimedIn(s)) claimed.add(l);
  const fa = typeof a.finalAnswer === 'string' ? a.finalAnswer : '';
  for (const l of lettersClaimedIn(fa)) claimed.add(l);
  const bare = BARE_LETTER.exec(fa);
  if (bare) claimed.add(bare[1].toUpperCase());
  const others = [...claimed].filter((l) => l !== letter);
  if (others.length === 0) return null;
  return {
    kind: 'steps-differ',
    reason: `The solution steps / final answer point to option ${others.sort().join(' or ')}, but the key is option ${letter}.`,
  };
}

const FLAG_KINDS = new Set(['mismatch', 'opinion']);
const REASON_MAX = 200;
function cleanReason(v) {
  return String(v || '').replace(/\[\[|\]\]/g, '').replace(/[\u0000-\u001F\u007F\u2028\u2029]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, REASON_MAX);
}

/**
 * Pull the hidden `[[keyflag:<mismatch|opinion>:<reason>]]` sentinel out of the model's prose. Strips EVERY
 * well-formed tag AND any malformed `[[keyflag...` fragment (so nothing of it can reach the student), and returns
 * the LAST valid one as { kind, reason }. No tag / unknown kind -> keyFlag null (prose still stripped).
 */
function extractKeyFlagTag(raw) {
  let keyFlag = null;
  const wellFormed = /\[\[\s*keyflag\s*:\s*([a-z]+)\s*:\s*((?:(?!\]\]).)*?)\s*\]\]/gis;
  let text = String(raw == null ? '' : raw).replace(wellFormed, (_m, kind, reason) => {
    const k = String(kind).toLowerCase();
    if (FLAG_KINDS.has(k)) keyFlag = { kind: k, reason: cleanReason(reason) };
    return '';
  });
  // Defensive: an unterminated or oddly-shaped `[[keyflag...` is removed to the end of its line.
  text = text.replace(/\[\[\s*keyflag\b[^\n]*/gi, '');
  text = text.replace(/[ \t]+\n/g, '\n').trim();
  return { text, keyFlag };
}

// A student message may carry a name or contact detail; the dispute log keeps ONLY the gist.
function scrubChallenge(v) {
  return String(v == null ? '' : v)
    .replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, '[email]')
    .replace(/\+?\d[\d\s-]{6,}\d/g, '[number]')
    .replace(/[\u0000-\u001F\u007F\u2028\u2029]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 300);
}

/** The folder-ish hint of a bank id for the admin queue: "CHEM-EXMPLR-1-MCQ-002" -> "CHEM-EXMPLR-1-MCQ". */
function fileHintOf(questionId) {
  return String(questionId || '').replace(/[-_]?\d+$/, '').slice(0, 80);
}

module.exports = { detectKeyMismatch, extractKeyFlagTag, scrubChallenge, fileHintOf, FLAG_KINDS, REASON_MAX, LETTERS };
