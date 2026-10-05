'use strict';
// server/grading/verify.cjs — C4 · VERIFICATION AFTER THE MODEL.
//
// WHY: the only answer-based cap used to key on the MODEL'S OWN verdict
// (`finalAnswerCapApplied = finalAnswerCorrect !== true`, P1), so a model that called a
// wrong line right handed out full marks: "1232/308 = 8 ✓" scored 3/3 on every run
// (GA-01, 15% of graded outputs). Two deterministic checks now run after the model:
//   1. ARITHMETIC — every PLAIN numeric equality in a step the model marked correct is
//      re-computed ("1232/308 = 8", "10 × 78 = 780", "1/60 + 1/40 = 2/100"). A false one
//      flags the step and the question can no longer reach full marks.
//   2. FINAL ANSWER — where a stored final answer exists, the student's final value is
//      compared with it before full marks are allowed.
// ★ CONSERVATIVE BY CONSTRUCTION: only expressions made of numbers and + − × ÷ / ^ √ ( )
// are evaluated. Anything with a letter, a unit, a comma, ±, ':' or '%' is skipped — a
// skipped check can never cost a student a mark. No `eval`, no Function: a small
// recursive-descent parser over a fixed grammar.

const SUPERSCRIPT = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-' };

/** Normalise the typographic variants students and models use into the parser's ASCII grammar. */
function normaliseExpr(s) {
  let t = String(s == null ? '' : s);
  t = t.replace(/[−–—]/g, '-').replace(/[×·⋅∙]/g, '*').replace(/÷/g, '/');
  t = t.replace(/[[{]/g, '(').replace(/[\]}]/g, ')');
  // superscript runs -> ^(…)
  t = t.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+/g, (m) => '^(' + m.split('').map((c) => SUPERSCRIPT[c]).join('') + ')');
  t = t.replace(/√/g, 'r');
  // "3 x 4" / "3x4" as multiplication only BETWEEN two numbers.
  t = t.replace(/(\d)\s*[xX]\s*(?=\d)/g, '$1*');
  return t.trim();
}

const PLAIN = /^[0-9.\s+\-*/^()r]+$/;

/** Parse + evaluate a normalised plain expression. Returns a finite number or null. */
function evaluate(expr) {
  const src = String(expr).replace(/\s+/g, '');
  if (!src || !PLAIN.test(src) || !/\d/.test(src)) return null;
  let i = 0;
  const peek = () => src[i];
  function number() {
    const m = /^(\d+(\.\d+)?|\.\d+)/.exec(src.slice(i));
    if (!m) return null;
    i += m[0].length;
    return Number(m[0]);
  }
  function primary() {
    const c = peek();
    if (c === '(') {
      i += 1;
      const v = additive();
      if (v === null || peek() !== ')') return null;
      i += 1;
      return v;
    }
    if (c === 'r') {
      i += 1;
      const v = power();
      return v === null || v < 0 ? null : Math.sqrt(v);
    }
    return number();
  }
  function power() {
    let base = primary();
    if (base === null) return null;
    if (peek() === '^') {
      i += 1;
      const exp = unary();
      if (exp === null) return null;
      base = Math.pow(base, exp);
    }
    return base;
  }
  function unary() {
    if (peek() === '-') { i += 1; const v = unary(); return v === null ? null : -v; }
    if (peek() === '+') { i += 1; return unary(); }
    return power();
  }
  // Implicit multiplication — 2(3), (19)4, )(, 3√3 — has the SAME precedence as × and ÷ and
  // associates left to right, exactly as students write it: "n/2 [2a + (n − 1)d]" is
  // (n/2)·[…], never n/(2·[…]).
  function multiplicative() {
    let v = unary();
    while (v !== null) {
      const c = peek();
      if (c === '*' || c === '/') {
        i += 1;
        const r = unary();
        if (r === null) return null;
        if (c === '/') { if (r === 0) return null; v /= r; } else v *= r;
        continue;
      }
      if (c === '(' || c === 'r' || (/\d/.test(c || '') && src[i - 1] === ')')) {
        const r = power();
        if (r === null) return null;
        v *= r;
        continue;
      }
      break;
    }
    return v;
  }
  function additive() {
    let v = multiplicative();
    while (v !== null && (peek() === '+' || peek() === '-')) {
      const op = peek();
      i += 1;
      const r = multiplicative();
      if (r === null) return null;
      v = op === '+' ? v + r : v - r;
    }
    return v;
  }
  const out = additive();
  if (out === null || i !== src.length || !Number.isFinite(out)) return null;
  return out;
}

function decimalsOf(text) {
  let max = 0;
  for (const m of String(text).matchAll(/\d+\.(\d+)/g)) max = Math.max(max, m[1].length);
  return max;
}
const hasOperator = (norm) => /[+\-*/^r()]/.test(norm.replace(/^[-+]/, ''));
const ambiguousRadical = (norm) => /r(?!\s*\()/.test(norm) && /[+\-]/.test(norm.replace(/^\s*[-+]/, ''));
// No brackets at all, and either a division beside a + or − ("a - b / c + d") or two divisions
// in a row ("a/b / c/d"): the line is a stacked fraction flattened by the transcription.
const flattenedFraction = (norm) => {
  const s = norm.replace(/\s+/g, '');
  if (/[()]/.test(s) || !s.includes('/')) return false;
  return /[+\-]/.test(s.replace(/^[-+]/, '')) || (s.match(/\//g) || []).length >= 2;
};

/**
 * Every FALSE plain numeric equality in a line of student work.
 * @returns {Array<{ left: string, right: string, leftValue: number, rightValue: number }>}
 */
function falseEqualities(text) {
  const out = [];
  const clauses = String(text == null ? '' : text).split(/\n|;|⇒|=>|→|∴|\bso\b|\btherefore\b|\bhence\b|\band\b/i);
  for (const clause of clauses) {
    if (!/[=≈]/.test(clause)) continue;
    if (/[,:%±∓°<>≤≥≠]/.test(clause)) continue; // lists, ratios, percentages, inequalities: not plain
    const sides = clause.split(/(=|≈)/);
    const parts = [];
    for (let k = 0; k < sides.length; k += 2) parts.push({ raw: sides[k], approxBefore: k > 0 && sides[k - 1] === '≈' });
    for (let k = 0; k + 1 < parts.length; k += 1) {
      const a = parts[k];
      const b = parts[k + 1];
      const na = normaliseExpr(a.raw);
      const nb = normaliseExpr(b.raw);
      if (!na || !nb || !PLAIN.test(na) || !PLAIN.test(nb)) continue;
      if (!hasOperator(na) && !hasOperator(nb)) continue; // "8 = 8" — nothing computed
      // A RADICAL WITHOUT BRACKETS beside a + or − has an unknowable scope: the student's
      // vinculum over "196 + 110.25" is quoted as "√196 + 110.25" (live, 2026-10-05, CP03-Q08).
      // It is skipped, never read as (√196) + 110.25 and charged.
      if (ambiguousRadical(na) || ambiguousRadical(nb)) continue;
      // A STACKED FRACTION FLATTENED onto one line has an unknowable grouping too: the
      // student's (−8/7 − 4) over (8/7 + 1) is quoted "-8/7 - 4 / 8/7 + 1" (live, CP01-Q05,
      // 5 of 6 acceptance gradings charged a correct ECF step). Skipped, never charged.
      if (flattenedFraction(na) || flattenedFraction(nb)) continue;
      const va = evaluate(na);
      const vb = evaluate(nb);
      if (va === null || vb === null) continue;
      // ROUNDING IS NOT A MISTAKE. Every decimal literal on either side may itself be a
      // rounded value ("3 × 2.73" for 3(√3 + 1)), and its rounding error is carried through
      // the arithmetic. The allowed error is the sum of each literal's RELATIVE rounding
      // error (½ unit in its last place over its size), applied to the result's size. Two
      // sides made only of integers and fractions are exact and must agree exactly.
      let rel = 0;
      for (const m of (a.raw + ' ' + b.raw).matchAll(/\d*\.(\d+)|\d+/g)) {
        if (!m[1]) continue;
        const v = Math.abs(Number(m[0]));
        if (v > 0) rel += (0.5 * Math.pow(10, -m[1].length)) / v;
      }
      const scale = Math.max(Math.abs(va), Math.abs(vb));
      let tol = rel * scale + 1e-9 * Math.max(1, scale);
      if (b.approxBefore) tol = Math.max(tol, scale * 0.01);
      if (Math.abs(va - vb) > tol) out.push({ left: a.raw.trim(), right: b.raw.trim(), leftValue: va, rightValue: vb });
    }
  }
  return out;
}

/* ── final-answer comparison against a stored key ───────────────────────────── */

const UNIT_RE = /\b(cm|mm|km|m|s|kg|g|a|v|w|j|n|hz|ohm|ohms|l|ml)\b|Ω|°|%/gi;
function numbersIn(text) {
  const t = String(text == null ? '' : text).replace(/[−–—]/g, '-');
  const out = [];
  // a signed fraction or decimal, not glued to a letter on its left (x2, a1 are names)
  for (const m of t.matchAll(/(^|[^a-zA-Z0-9.])(-?\d+(?:\.\d+)?)(?:\s*\/\s*(\d+(?:\.\d+)?))?/g)) {
    const n = Number(m[2]);
    const den = m[3] ? Number(m[3]) : null;
    if (den === 0) continue;
    out.push({ value: den ? n / den : n, decimals: Math.max(decimalsOf(m[2]), den ? 6 : 0) });
  }
  return out;
}
function unitsIn(text) {
  return new Set((String(text || '').match(UNIT_RE) || []).map((u) => u.toLowerCase().replace(/^ohms?$/, 'Ω')));
}

/**
 * Compare a student's final answer with a stored key. Conservative: returns
 * 'mismatch' only when the key carries 1–3 plain numbers, the student's answer carries at
 * least one number, units do not conflict, and NONE of the key's numbers appears in the
 * student's answer. Everything else is 'match' or 'skip' (a skip never costs a mark).
 * @returns {'match'|'mismatch'|'skip'}
 */
function compareFinalAnswer(studentText, keyText) {
  const key = String(keyText == null ? '' : keyText);
  const stu = String(studentText == null ? '' : studentText);
  if (!key.trim() || !stu.trim()) return 'skip';
  if (/±|∓|√|π|\bproved\b|\bhence\b/i.test(key)) return 'skip';
  const kn = numbersIn(key);
  const sn = numbersIn(stu);
  if (kn.length === 0 || kn.length > 3 || sn.length === 0) return 'skip';
  const ku = unitsIn(key);
  const su = unitsIn(stu);
  if (ku.size && su.size && ![...ku].some((u) => su.has(u))) return 'skip';
  const close = (a, b) => {
    const d = Math.min(a.decimals, b.decimals);
    const tol = Math.max(d > 0 ? 0.5 * Math.pow(10, -Math.min(d, 6)) : 1e-9, 1e-6 * Math.abs(a.value));
    return Math.abs(a.value - b.value) <= tol + 1e-12;
  };
  const found = kn.filter((k) => sn.some((s) => close(k, s)));
  if (found.length === kn.length) return 'match';
  if (found.length === 0) return 'mismatch';
  return 'skip';
}

module.exports = { normaliseExpr, evaluate, falseEqualities, compareFinalAnswer, numbersIn };
