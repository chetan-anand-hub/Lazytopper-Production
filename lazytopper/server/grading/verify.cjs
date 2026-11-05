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

/* GRADER-CORE-1 PR-2b (targeted round) · A FINAL VALUE WITH ITS UNIT IS STILL ARITHMETIC.
   Live, 2026-10-05 (CP02-Q08, a planted slip): "Length of pool = 50 − 16 = 36 m" (50 − 16 = 34)
   was marked correct and scored 5/5 with "executed flawlessly" — the check skipped the line
   because "36 m" carries a letter. A unit written AFTER the last number of the LAST side of an
   equality is set aside before that side is evaluated — only the last side, because a letter
   with more equation after it is a VARIABLE (a quote that joined two lines, "… = −2/45 v =
   −45/2", must never read "v" as volts). Single-letter units only as written (m, g, s, V, A, W,
   J, N — case-sensitive) and only after a SPACE, so "2l" / "3m" (a coefficient on a variable)
   is never read as a number with a unit. */
const MULTI_LETTER_UNIT = new RegExp('(?<=[\\d)])\\s*(?:km\\/h|m\\/s|cm\\/s|kmph|km|cm|mm|kg|mg|ml|kj|kw|hz|ohms?|Ω|hrs?|min|sec)(?:\\s*(?:\\^\\s*\\(?[23]\\)?|[²³]))?\\s*\\.?\\s*$', 'i');
const SINGLE_LETTER_UNIT = /(?<=[\d)])\s+(?:m|g|s|V|A|W|J|N)(?:\s*(?:\^\s*\(?[23]\)?|[²³]))?\s*\.?\s*$/;
function withoutTrailingUnit(side) {
  const s = String(side == null ? '' : side);
  if (MULTI_LETTER_UNIT.test(s)) return s.replace(MULTI_LETTER_UNIT, '');
  if (SINGLE_LETTER_UNIT.test(s)) return s.replace(SINGLE_LETTER_UNIT, '');
  return s;
}

/* GRADER-CORE-1 PR-2b (targeted round) · A QUOTE THAT LOST A SIGN NEVER TURNS A CORRECT STEP WRONG.
   Live, 2026-10-05 (CP01-Q05, 3 of 9 gradings): the student wrote "(−36/7)/(15/7) = −36/15 =
   −12/5"; the model marked the step correct but QUOTED it "(-36/7)/(15/7) = 36/15 = 12/5", and
   this check then charged the correct step "(-36/7)/(15/7) is not 36/15" — a false comment and
   a lost mark. In a line the model QUOTED from the student, two sides that differ ONLY BY SIGN
   (equal size, opposite sign) are not charged: the model judged the step right, so the likelier
   story is a sign dropped while quoting. Where the student's own words are known verbatim (a
   TYPED answer), a quote found in them is the student's real sign slip and is still charged.
   `correctedWorking` (the model's own text) is checked without this exemption. */
const compactExpr = (s) => normaliseExpr(withoutTrailingUnit(s)).replace(/\s+/g, '');
function quotedInSource(leftRaw, rightRaw, source) {
  const src = String(source == null ? '' : source);
  if (!src.trim()) return false;
  const hay = src.split(/\n/).map((l) => normaliseExpr(l).replace(/\s+/g, '')).join('\n');
  return hay.includes(compactExpr(leftRaw) + '=' + compactExpr(rightRaw));
}

/* GRADER-FIX (typed lines), live 16 Oct 2026 (C&I, HCF/LCM of 96 and 404, typed, every line right):
   the model QUOTED two typed lines "96 = 2^5 x 3" / "404 = 2^2 x 101" as ONE step, "96 = 2^5 x 3
   404 = 2^2 x 101"; the clause split (newlines only) read "2^5 x 3 404" as 2^5 × 3404 and charged
   "96 is not 2^5 x 3 404" — ½ off a correct step. Three conservative guards, each can only REMOVE
   a charge, never add one:
   (1) a space between two numbers where the second is followed at once by "=" ("… 3 404 = …") is a
       line boundary: the clause is split there, and each half is checked on its own;
   (2) a side that still holds two numbers separated only by a space is not plain arithmetic (a
       joined line, "1 000"): skipped — except a MIXED NUMBER "3 1/2", which is read as 3½;
   (3) where the student's verbatim TYPED words are known, an equality the quote makes by running
       two typed lines together ("96 = 2^5 x 3404" from "…x 3" + "404 = …") and that no single
       typed line holds is not the student's — it is not charged. */
const LINE_JOIN = /(?<=\d)\s+(?=\d+(?:\.\d+)?\s*[=≈])/;
const MIXED_NUMBER = /^\s*(-?)(\d+)\s+(\d+)\s*\/\s*(\d+)\s*$/;
const SPACED_NUMBERS = /\d\s+(?=[\d.])/;
/* GRADER-QUALITY-1 (D3), live 4 Nov 2026 (Answer Checker multi, WS-M-MIX-02 Q21, owner's student, 3 Nov):
   the student verified the zeroes in TWO COLUMNS — "−4 + 6 = 2 / 2 = 2" beside "6 × −4 = −24 / −24 = −24"
   — and the model quoted the second rows as ONE line, "2 = 2 −24 = −24". Guard (1) above splits a join
   only where the next column starts with a DIGIT; here it starts with a SIGN, so "2 −24" was evaluated as
   2 − 24 and a correct step lost ½ with "2 is not 2 −24". (1b) In the MODEL'S QUOTE of a photographed /
   uploaded answer (opts.quoted, no typed source) the line is ALSO read split before a number with a sign
   GLUED to it (-, −, –) that is followed at once by "=", and it is charged only when BOTH readings find it
   false (falseEqualities) — never on the student's TYPED words, never on the model's own corrected working.
   Accepted cost (core.test.cjs §GQ.2): a real slip quoted with a glued sign ("5 -3 = 3") is true when
   split, so it is not charged; spaced ("5 − 3 = 3") or typed, it is. */
const SIGNED_LINE_JOIN = /(?<=\d)\s+(?=[-−–]?\d+(?:\.\d+)?\s*[=≈])/;
function mixedValue(side) {
  const m = MIXED_NUMBER.exec(String(side == null ? '' : side));
  if (!m || Number(m[4]) === 0 || Number(m[3]) >= Number(m[4])) return null;
  const v = Number(m[2]) + Number(m[3]) / Number(m[4]);
  return m[1] ? -v : v;
}
// A typed line that begins a NEW statement ("404 = …", "LCM = …"); a line that begins with "="
// CONTINUES the one above ("x = 2 × 3" / "= 7" is one statement, and its slip is the student's).
const NEW_STATEMENT = /^(?:[A-Za-z][A-Za-z0-9]*|\d+(?:\.\d+)?)=/;
/** null, or the student's own TYPED lines a quoted equality was made from by joining new-statement lines. */
function spansSourceLines(leftRaw, rightRaw, source) {
  const src = String(source == null ? '' : source);
  if (!src.trim()) return null;
  const raw = src.split(/\n/).filter((l) => normaliseExpr(l).replace(/\s+/g, '').length > 0);
  const lines = raw.map((l) => normaliseExpr(l).replace(/\s+/g, ''));
  const target = compactExpr(leftRaw) + '=' + compactExpr(rightRaw);
  if (lines.some((l) => l.includes(target))) return null;
  const joined = lines.join('');
  const starts = [];
  let p = 0;
  for (const l of lines) { starts.push(p); p += l.length; }
  for (let at = joined.indexOf(target); at !== -1; at = joined.indexOf(target, at + 1)) {
    const end = at + target.length;
    const crossed = starts.map((s, i) => ({ s, i })).filter(({ s, i }) => i > 0 && s > at && s < end);
    // only a join across lines that each START A NEW STATEMENT is the quote's doing, not the student's
    if (crossed.length && crossed.every(({ i }) => NEW_STATEMENT.test(lines[i]))) {
      const first = starts.reduce((acc, s, i) => (s <= at ? i : acc), 0);
      const last = starts.reduce((acc, s, i) => (s < end ? i : acc), 0);
      return raw.slice(first, last + 1);
    }
  }
  return null;
}

/**
 * Every FALSE plain numeric equality in a line of student work.
 * @param {string} text
 * @param {{ quoted?: boolean, source?: string }} [opts]  quoted: the text is the MODEL'S QUOTE of the
 *   student's work (a sign-only difference is not charged unless `source`, the student's verbatim
 *   typed answer, contains the same equality).
 * @returns {Array<{ left: string, right: string, leftValue: number, rightValue: number }>}
 */
function falseEqualities(text, opts = {}) {
  // Review 2 (#1207): with the student's TYPED words known, spaced numbers are the student's own
  // writing ("1 000 + 500 = 1600" is charged) — only the line check (guard 3) applies there; the
  // line-boundary split and the spaced-number skip (guards 1–2) are for photo/OCR quotes only.
  const typedSource = String(opts.source == null ? '' : opts.source).trim().length > 0;
  const lines = String(text == null ? '' : text).split(/\n|;|⇒|=>|→|∴|\bso\b|\btherefore\b|\bhence\b|\band\b/i);
  if (typedSource) return falseEqualitiesIn(lines, opts, typedSource);
  if (opts.quoted !== true) return falseEqualitiesIn(lines.flatMap((c) => c.split(LINE_JOIN)), opts, typedSource);
  // (1b) GRADER-QUALITY-1, delta review: a photo quote is read BOTH ways — as trunk reads it (guard (1)) and
  // split before a glued sign — and a line is charged ONLY when BOTH readings find it false (the split
  // reading's text is reported). So the split can only REMOVE a charge: "2 = 2 −24 = −24" (Q21) is true
  // when split; "D = 7² − 4 × 3 × 2 = 49 −24 = 25" and "x = (12 + 4)/2 = 16 −8 = 8" are true unsplit;
  // "3 + 4 = 8 −2 = −2" is false both ways and is charged "3 + 4 is not 8".
  const out = [];
  for (const line of lines) {
    const trunkReading = falseEqualitiesIn(line.split(LINE_JOIN), opts, typedSource);
    if (!trunkReading.length) continue;
    const splitReading = falseEqualitiesIn(line.split(SIGNED_LINE_JOIN), opts, typedSource);
    for (const e of splitReading) if (!out.some((o) => o.left === e.left && o.right === e.right)) out.push(e);
  }
  return out;
}

/** Every FALSE plain numeric equality among already-split clauses (the body of falseEqualities). */
function falseEqualitiesIn(clauses, opts, typedSource) {
  const out = [];
  for (const clause of clauses) {
    if (!/[=≈]/.test(clause)) continue;
    if (/[,:%±∓°<>≤≥≠]/.test(clause)) continue; // lists, ratios, percentages, inequalities: not plain
    const sides = clause.split(/(=|≈)/);
    const parts = [];
    for (let k = 0; k < sides.length; k += 2) parts.push({ raw: sides[k], approxBefore: k > 0 && sides[k - 1] === '≈' });
    for (let k = 0; k + 1 < parts.length; k += 1) {
      const a = parts[k];
      const b = parts[k + 1];
      const lastSide = k + 1 === parts.length - 1;
      const na = normaliseExpr(a.raw);
      const nb = normaliseExpr(lastSide ? withoutTrailingUnit(b.raw) : b.raw);
      if (!na || !nb || !PLAIN.test(na) || !PLAIN.test(nb)) continue;
      const ma = mixedValue(na);
      const mb = mixedValue(nb);
      if (!typedSource && ((ma === null && SPACED_NUMBERS.test(na)) || (mb === null && SPACED_NUMBERS.test(nb)))) continue;
      if (!hasOperator(na) && !hasOperator(nb)) continue; // "8 = 8" — nothing computed
      // A RADICAL WITHOUT BRACKETS beside a + or − has an unknowable scope: the student's
      // vinculum over "196 + 110.25" is quoted as "√196 + 110.25" (live, 2026-10-05, CP03-Q08).
      // It is skipped, never read as (√196) + 110.25 and charged.
      if (ambiguousRadical(na) || ambiguousRadical(nb)) continue;
      // A STACKED FRACTION FLATTENED onto one line has an unknowable grouping too: the
      // student's (−8/7 − 4) over (8/7 + 1) is quoted "-8/7 - 4 / 8/7 + 1" (live, CP01-Q05,
      // 5 of 6 acceptance gradings charged a correct ECF step). Skipped, never charged.
      if (flattenedFraction(na) || flattenedFraction(nb)) continue;
      const va = ma !== null ? ma : evaluate(na);
      const vb = mb !== null ? mb : evaluate(nb);
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
      if (Math.abs(va - vb) > tol) {
        const signOnly = scale > 1e-12 && Math.abs(va + vb) <= tol;
        if (signOnly && opts.quoted === true && !quotedInSource(a.raw, b.raw, opts.source)) continue;
        const covered = opts.quoted === true ? spansSourceLines(a.raw, b.raw, opts.source) : null;
        if (covered) {
          // the joined equality is not the student's — but each typed line it was made from is, and
          // a slip on one of them ("96 = 2^4 x 3") is still charged, as written
          for (const line of covered) {
            for (const e of falseEqualities(line, { source: line })) {
              if (!out.some((o) => o.left === e.left && o.right === e.right)) out.push(e);
            }
          }
          continue;
        }
        out.push({ left: a.raw.trim(), right: b.raw.trim(), leftValue: va, rightValue: vb });
      }
    }
  }
  return out;
}

/* ── GRADER-CORE-1 PR-2b (targeted round) · NO ECF THROUGH A FUDGED STEP ─────────────────
   Owner ruling (5 Oct): error carried forward rewards the CORRECT method applied to a carried
   value — never work reached THROUGH an invented step. Golden GS-M15-a (4 of 6 gradings 3/5 or
   2.5/5 against the key's 2): the student's own quadratic x² − 8x + 1280 = 0 has NO REAL ROOTS,
   yet the next line "factorises" it as (x − 40)(x + 32) = 0 — which multiplies out to
   x² − 8x − 1280 — and lands on the expected 40 km/h. The model flagged the factorisation
   every time and then credited the roots and the answer by ECF anyway.
   ★ NARROW BY CONSTRUCTION: a factorisation is FUDGED only when (1) the line is a product of
   two linear factors set to 0, (2) the nearest earlier quadratic "… = 0" of the same part in
   the student's own work does NOT expand to it (coefficients not proportional), AND (3) that
   quadratic has NO REAL ROOTS (b² − 4ac < 0) — so no honest factorisation of it into real
   factors exists. A wrong factorisation of a quadratic that HAS real roots is an ordinary slip
   (calculation) and the roots read off it keep their ECF; anything not parsed is skipped. */
function polyNorm(s) {
  return String(s == null ? '' : s)
    .replace(/[−–—]/g, '-').replace(/[×·⋅∙]/g, '*').replace(/²/g, '^2').replace(/\s+/g, '').toLowerCase();
}
/** Parse "ax^2 + bx + c" (one variable, no brackets) → { v, a, b, c } or null. */
function parseQuadratic(expr) {
  const s = polyNorm(expr);
  if (!s || /[()]/.test(s) || !/\^2/.test(s)) return null;
  const terms = s.replace(/-/g, '+-').split('+').filter((t) => t !== '');
  let v = null; const co = { a: 0, b: 0, c: 0 };
  for (const t of terms) {
    const m = t.match(/^(-?)(\d*\.?\d*)\*?(?:([a-z])(\^2)?)?$/);
    if (!m || (m[2] === '' && !m[3])) return null;
    const k = (m[1] ? -1 : 1) * (m[2] === '' ? 1 : Number(m[2]));
    if (!Number.isFinite(k)) return null;
    if (m[3]) {
      if (v && v !== m[3]) return null;
      v = m[3];
      co[m[4] ? 'a' : 'b'] += k;
    } else co.c += k;
  }
  if (!v || co.a === 0) return null;
  return { v, ...co };
}
/** Parse "k(px + q)(rx + s)" → { v, a, b, c } (expanded) or null. */
function parseFactorised(expr) {
  const s = polyNorm(expr);
  const m = s.match(/^(-?\d*\.?\d*)\*?\(([^()]+)\)\*?\(([^()]+)\)$/);
  if (!m) return null;
  const k = m[1] === '' ? 1 : m[1] === '-' ? -1 : Number(m[1]);
  const lin = (t) => {
    const terms = t.replace(/-/g, '+-').split('+').filter((x) => x !== '');
    let v = null; let p = 0; let q = 0;
    for (const x of terms) {
      const mm = x.match(/^(-?)(\d*\.?\d*)\*?([a-z])?$/);
      if (!mm || (mm[2] === '' && !mm[3])) return null;
      const c = (mm[1] ? -1 : 1) * (mm[2] === '' ? 1 : Number(mm[2]));
      if (mm[3]) { if (v && v !== mm[3]) return null; v = mm[3]; p += c; } else q += c;
    }
    return v && p !== 0 ? { v, p, q } : null;
  };
  const f = lin(m[2]); const g = lin(m[3]);
  if (!Number.isFinite(k) || k === 0 || !f || !g || f.v !== g.v) return null;
  return { v: f.v, a: k * f.p * g.p, b: k * (f.p * g.q + f.q * g.p), c: k * f.q * g.q };
}
/** One side of "LHS = RHS" equal to 0 → the other side; else null. */
function zeroEquated(clause) {
  const sides = String(clause).split('=');
  if (sides.length !== 2) return null;
  const z = (x) => /^\s*0\s*$/.test(x);
  if (z(sides[1]) && !z(sides[0])) return sides[0];
  if (z(sides[0]) && !z(sides[1])) return sides[1];
  return null;
}
const proportional = (P, Q) => {
  const eps = 1e-9 * Math.max(1, Math.abs(P.a), Math.abs(P.b), Math.abs(P.c), Math.abs(Q.a), Math.abs(Q.b), Math.abs(Q.c)) ** 2;
  return Math.abs(P.a * Q.b - P.b * Q.a) <= eps && Math.abs(P.a * Q.c - P.c * Q.a) <= eps && Math.abs(P.b * Q.c - P.c * Q.b) <= eps;
};
/**
 * The first FUDGED factorisation in a question's steps (see above), or null.
 * @param {Array<{ studentWork?: string, part?: string|null, status?: string }>} steps
 * @returns {{ index: number, quadratic: string, factorised: string }|null}
 */
function fudgedFactorisation(steps) {
  if (!Array.isArray(steps)) return null;
  const partOf = (p) => (p == null ? '' : String(p).toLowerCase().replace(/[^a-z0-9]/g, ''));
  const lastQuad = new Map(); // part -> { q, text }
  for (let i = 0; i < steps.length; i += 1) {
    const st = steps[i];
    if (!st || st.status === 'withdrawn') continue;
    const part = partOf(st.part);
    const clauses = String(st.studentWork || '').split(/\n|;|⇒|=>|→|∴|\bor\b|,/i);
    for (const cl of clauses) {
      const side = zeroEquated(cl);
      if (side === null) continue;
      const fac = parseFactorised(side);
      if (fac) {
        const prev = lastQuad.get(part);
        if (prev && prev.q.v === fac.v && !proportional(prev.q, fac)) {
          const disc = prev.q.b * prev.q.b - 4 * prev.q.a * prev.q.c;
          if (disc < 0) return { index: i, quadratic: prev.text.trim(), factorised: cl.trim() };
        }
        continue;
      }
      const q = parseQuadratic(side);
      if (q) lastQuad.set(part, { q, text: cl });
    }
  }
  return null;
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
  const first = compareFinalAnswerRaw(studentText, keyText);
  if (first !== 'mismatch') return first;
  // GRADER-FIX (examiner gap): a "mismatch" read off the WRITTEN FORM is retried on the VALUE —
  // digit grouping ("1,21,000" / "9,696" for 121000 / 9696) and powers ("2 × 10^8", "2^2" for
  // 200000000, 4) — before half a mark goes. Only a mismatch is retried and only a 'match' replaces
  // it, so this can never take a mark the old comparison gave.
  // Review (#1207): only the FINAL VALUE (right of the last "=" on the last line) is re-read, so a
  // power or a grouped number in the WORKING ("HCF = 2^2 x 3 = 12", "x = 1,000 - 100 = 900") never
  // supplies the key's number; a final value that is still an expression is not re-read at all.
  // Review 2 (#1207): the retry is for a ONE-VALUE key and ONE student final value only — a key with
  // several values ("HCF = 4, LCM = 9696", "x = 4, y = 8") keeps the original comparison, so every
  // one of its values must still appear as written.
  const stu = finalValueOf(studentText);
  const tuple = hasTuple(stu) || hasTuple(keyText);
  // A single comma ("2,300") in the KEY may be a pair; only unambiguous grouping (2+ commas) is read there.
  const s = valueForm(stu, { grouping: !tuple, minCommas: 1 });
  const k = valueForm(keyText, { grouping: !tuple, minCommas: 2 });
  if (isExpression(s) || isExpression(k)) return first;
  if (numbersIn(k).length !== 1 || numbersIn(s).length !== 1) return first;
  return compareFinalAnswerRaw(s, k) === 'match' ? 'match' : first;
}
function finalValueOf(text) {
  const lines = String(text == null ? '' : text).split(/\n/).map((l) => l.trim()).filter(Boolean);
  const last = lines.length ? lines[lines.length - 1] : '';
  const parts = last.split(/=|≈/);
  return parts[parts.length - 1].trim();
}
const GROUPED = /(?<![\d.,])(?:\d{1,3}(?:,\d{3})+|\d{1,2}(?:,\d{2})+,\d{3})(?![\d,])/g;
/** A comma that is not digit grouping, or any comma inside brackets: a pair/tuple/list, never one number. */
function hasTuple(text) {
  const t = String(text == null ? '' : text);
  if (/[([{][^)\]}]*,/.test(t)) return true;
  return t.replace(GROUPED, '').includes(',');
}
/** Still an arithmetic expression after the value form (a binary + − × between numbers). */
function isExpression(text) {
  return /\d\s*[-+×xX*·÷]\s*\d/.test(String(text == null ? '' : text).replace(/[−–—]/g, '-'));
}
const SUPERSCRIPT_RUN = /[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+/g;
function plainNumber(v) {
  if (!Number.isFinite(v)) return null;
  if (Number.isInteger(v) && Math.abs(v) < 1e21) return v.toFixed(0);
  return String(Number(v.toPrecision(12))).includes('e') ? null : String(Number(v.toPrecision(12)));
}
function valueForm(text, opts = {}) {
  let t = String(text == null ? '' : text).replace(/[−–—]/g, '-');
  t = t.replace(SUPERSCRIPT_RUN, (m) => '^(' + m.split('').map((c) => SUPERSCRIPT[c]).join('') + ')');
  // digit grouping — western 9,696 / 1,000,000 and Indian 1,21,000 — only when no tuple is in play
  if (opts.grouping) {
    t = t.replace(GROUPED, (m) => ((m.match(/,/g) || []).length >= (opts.minCommas || 1) ? m.replace(/,/g, '') : m));
  }
  const pow = (base, exp) => plainNumber(Math.pow(Number(base), Number(exp)));
  t = t.replace(/(?<![A-Za-z\d.])(\d+(?:\.\d+)?)\s*[×xX*·]\s*10\s*\^\s*\(?\s*(-?\d+)\s*\)?/g, (m, a, e) => {
    const p = pow(10, e);
    const v = p === null ? null : plainNumber(Number(a) * Number(p));
    return v === null ? m : v;
  });
  t = t.replace(/(?<![A-Za-z\d.])(\d+(?:\.\d+)?)\s*\^\s*\(?\s*(-?\d+)\s*\)?(?![\d.])/g, (m, a, e) => {
    const v = pow(a, e);
    return v === null ? m : v;
  });
  // a mixed number "3 1/2" is 3.5
  t = t.replace(/(?<![\d./])(\d+)\s+(\d+)\s*\/\s*(\d+)(?![\d./])/g, (m, w, n, d) => {
    if (!(Number(d) > 0) || Number(n) >= Number(d)) return m;
    const v = plainNumber(Number(w) + Number(n) / Number(d));
    return v === null ? m : v;
  });
  return t;
}
function compareFinalAnswerRaw(studentText, keyText) {
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

/* ── GRADER-CREDIT-1 · EQUAL VALUE IN ANOTHER FORM (owner ruling B, 5 Nov 2026) ──────────────
   CBSE examiners tick an answer that is EQUAL to the key in another form — 45/48 for 15/16
   (2025 Maths 30/6/2 Q22, answer book p.7), 4.5 A for 4.54 A (2025 Science 31/1/3 Q37(b), p.28).
   `equivalentFinalValue` reads ONE final value from each text (the right of the last "=" on the
   last line), sets a trailing unit aside, and evaluates it with the same fixed grammar as the
   arithmetic check (numbers, + − × ÷ / ^ √ and π — no eval). It is used ONLY to GIVE BACK a mark
   (postprocess.cjs restoreEquivalentFinalAnswer), never to take one, so anything it is not sure
   of is 'skip':
     - a tuple / list / "or" / "±" (two roots, two values: shared credit is the prompt's job);
     - a unit on the key that the student's value does not carry, or two different units;
     - a value it cannot evaluate.
   'equivalent' needs EITHER exact equality (two exact forms: fractions, surds, π, integers) OR
   agreement within the rounding of the LESS precise decimal written (½ in its last place) AND
   within 1% of the key — so "5" is never 4.54, and "4.5" is. 'different' otherwise. */
const EQ_UNIT_TAIL = /\s*(?:km\s*\/\s*h|m\s*\/\s*s\^?2?|m\s*\/\s*s²|cm\s*\/\s*s|kmph|km|cm|mm|m|kg|mg|g|ml|mL|l|L|kJ|kW|kWh|Hz|ohms?|Ω|hrs?|h|min|sec|s|A|V|W|J|N|D|°C|°|K|Rs\.?|₹|rupees)(?:\s*(?:\^\s*\(?[23]\)?|[²³]))?\s*\.?\s*$/;
const EQ_UNIT_HEAD = /^\s*(?:Rs\.?|₹)\s*/;
function eqUnitOf(s) {
  const t = String(s == null ? '' : s);
  const head = EQ_UNIT_HEAD.exec(t);
  if (head) return { rest: t.slice(head[0].length), unit: '₹' };
  const m = EQ_UNIT_TAIL.exec(t);
  // a single LOWER-CASE letter glued to a number ("2x", "3m" written without a space) is a variable, not a unit
  if (!m || !/\d|\)|π/.test(t.slice(0, m.index).trim().slice(-1))) return { rest: t, unit: null };
  const raw = m[0].trim().replace(/\.$/, '');
  if (/^[a-z]$/.test(raw.replace(/\s/g, '')) && !/\s/.test(m[0][0] || '')) return { rest: t, unit: null };
  const unit = raw.replace(/\s+/g, '').replace(/^ohms?$/i, 'Ω').replace(/^(?:Rs\.?|rupees)$/i, '₹').replace(/\^\(?([23])\)?/, (x, d) => (d === '2' ? '²' : '³'));
  return { rest: t.slice(0, m.index), unit };
}
/** One final value: { value, exact, decimals, unit } or null. */
function finalValueParsed(text) {
  const lines = String(text == null ? '' : text).split(/\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return null;
  const last = lines[lines.length - 1];
  if (/±|∓|,|;|\bor\b|\band\b/i.test(last)) return null;
  const parts = last.split(/=|≈/);
  const { rest, unit } = eqUnitOf(parts[parts.length - 1].trim());
  let expr = rest.trim();
  if (!expr || /[A-Za-z]/.test(expr.replace(/π|pi/gi, ''))) return null;
  const exact = /\/|√|π|pi/i.test(expr) || !/\./.test(expr);
  expr = expr.replace(/π|\bpi\b/gi, '(' + Math.PI + ')');
  const n = normaliseExpr(expr);
  const value = evaluate(n);
  if (value === null) return null;
  return { value, exact, decimals: exact ? Infinity : decimalsOf(rest), unit };
}
/** The label a line's value is assigned to ("x", "I", "AB", "R₁"), or null. */
function valueLabelOf(text) {
  const lines = String(text == null ? '' : text).split(/\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return null;
  const parts = lines[lines.length - 1].split(/=|≈/);
  if (parts.length < 2) return null;
  const m = /^([A-Za-z][A-Za-z0-9₀-₉']{0,3})$/.exec(parts[0].trim());
  return m ? m[1] : null;
}
/* Review round 1 (#1583, item 1): the WORKING before the final value must itself give the key's value, so the
   only difference is the FORM or ROUNDING of the final number — "I = 900/200 = 4.5 A" (a wrong substitution)
   or "1000/222 = 4.5 A" is never given back for key 4.54 A, while "1000/220 = 4.5 A" is. Every side of the
   last line before the final value that holds a number must evaluate (unit set aside) and agree with the key:
   exactly for an exact key, within ONE unit of the key's last decimal place for a rounded key (a scheme's
   4·54 is 1000/220 = 4.545… truncated). A first-side label ("I", "P(E)") is passed over; no numeric side at all, or
   one that cannot be evaluated, is 'skip'. */
function workingGivesKey(studentText, k) {
  const lines = String(studentText == null ? '' : studentText).split(/\n/).map((l) => l.trim()).filter(Boolean);
  // the FIRST side may be a label ("I", "P(a 2digit no.)") when it is not plain arithmetic; it is passed over
  const all = lines[lines.length - 1].split(/=|≈/).slice(0, -1).map((x) => x.trim());
  const sides = all.filter((x, i) => /\d/.test(x) && !(i === 0 && /[A-Za-z]/.test(x.replace(/π|\bpi\b/gi, ''))));
  if (!sides.length) return 'skip';
  const tol = k.exact ? 1e-9 * Math.max(1, Math.abs(k.value)) : Math.pow(10, -k.decimals) + 1e-12;
  for (const side of sides) {
    const { rest } = eqUnitOf(side);
    const t = rest.trim();
    if (/[A-Za-z]/.test(t.replace(/π|\bpi\b/gi, ''))) return 'skip';
    const v = evaluate(normaliseExpr(t.replace(/π|\bpi\b/gi, '(' + Math.PI + ')')));
    if (v === null) return 'skip';
    if (Math.abs(v - k.value) > tol) return 'different';
  }
  return 'equivalent';
}
/**
 * @param {{ requireWorking?: boolean }} [opts] requireWorking: the student's own working on the final line must
 *   give the key's value too (workingGivesKey) — used for the step the guard gives back.
 * @returns {'equivalent'|'different'|'skip'}
 */
function equivalentFinalValue(studentText, keyText, opts = {}) {
  // Review round 1 (item 4): a key of more than one line ("x = 4\nx = −4") is several values — never one.
  if (String(keyText == null ? '' : keyText).split(/\n/).filter((l) => l.trim()).length !== 1) return 'skip';
  const s = finalValueParsed(studentText);
  const k = finalValueParsed(keyText);
  if (!s || !k) return 'skip';
  if (k.unit && s.unit !== k.unit) return 'skip';
  if (s.unit && k.unit && s.unit !== k.unit) return 'skip';
  // Review round 1 (item 5): "y = 2" is not the key's "x = 2" — where both name the variable, it must be the same one.
  const sl = valueLabelOf(studentText);
  const kl = valueLabelOf(keyText);
  if (sl && kl && sl !== kl) return 'skip';
  const diff = Math.abs(s.value - k.value);
  let verdict;
  if (diff <= 1e-9 * Math.max(1, Math.abs(k.value))) verdict = 'equivalent';
  else if (s.exact && k.exact) verdict = 'different';
  else {
    const d = Math.min(s.decimals, k.decimals);
    const tol = 0.5 * Math.pow(10, -d) + 1e-12;
    verdict = diff <= tol && diff <= 0.01 * Math.abs(k.value) ? 'equivalent' : 'different';
  }
  if (verdict !== 'equivalent' || !opts.requireWorking) return verdict;
  return workingGivesKey(studentText, k);
}

module.exports = { normaliseExpr, evaluate, falseEqualities, compareFinalAnswer, numbersIn, fudgedFactorisation, parseQuadratic, parseFactorised, equivalentFinalValue };
