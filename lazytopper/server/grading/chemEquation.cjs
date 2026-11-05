'use strict';
// server/grading/chemEquation.cjs — a small, conservative reader of chemical equations as a student
// writes them (GRADER-BALANCE-1, owner ruling 5 Nov 2026).
//
// WHY: the balancing ruling is enforced after the model (postprocess.cjs applyBalancingRuling): ½ per
// unbalanced equation, and the type by what the student WROTE — coefficients written but wrong is
// "calculation", a skeletal equation (no coefficients) is "presentation" by default. Whether an equation
// balances and whether coefficients were written are facts of the page, so they are counted here rather
// than taken from the model's prose.
//
// CONSERVATIVE BY CONSTRUCTION: anything this reader is not sure of returns null (it is not an equation
// it can read), and callers then do nothing on its account. It never decides whether the SPECIES are
// right — that needs chemistry knowledge the page does not carry, and stays the model's judgement.

const ELEMENTS = new Set(('H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr ' +
  'Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os ' +
  'Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu').split(' '));

const SUBSCRIPTS = { '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9' };
const STATE_SYMBOL = /\(\s*(?:s|l|g|aq)\s*\)/gi;
// An arrow, optionally carrying a condition written on it ("--heat-->", "⎯⎯(sunlight, chlorophyll)⎯⎯→",
// "—sunlight, chlorophyll→", "--conc. H2SO4, 170 °C-->").
const ARROW_WITH_LABEL = /\s(?:[-—–―⎯]+[^→⟶>\n]*?[-—–―⎯]*(?:>|→|⟶)|[-—–―⎯]*(?:→|⟶|⇌|⇒))\s?|\s?(?:-+>|[—–―⎯]+>|→|⟶|⇌)\s?/;
const UP_DOWN = /[↑↓]/g;

/** Atom counts of one formula ("Al2(SO4)3", "CuSO4·5H2O"), or null if it is not a formula of real elements. */
function atomsOf(formula) {
  const parts = String(formula).split(/[·.*]/);
  const total = {};
  for (let k = 0; k < parts.length; k += 1) {
    let p = parts[k];
    let mult = 1;
    if (k > 0) {
      const m = p.match(/^(\d+)/);
      if (m) { mult = Number(m[1]); p = p.slice(m[1].length); }
    }
    const one = groupAtoms(p);
    if (!one) return null;
    for (const [el, n] of Object.entries(one)) total[el] = (total[el] || 0) + n * mult;
  }
  return Object.keys(total).length ? total : null;
}

function groupAtoms(s) {
  const stack = [{}];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === '(' || c === '[') { stack.push({}); i += 1; continue; }
    if (c === ')' || c === ']') {
      if (stack.length < 2) return null;
      const g = stack.pop();
      i += 1;
      const m = s.slice(i).match(/^\d+/);
      if (m && /0$/.test(m[0])) return null; // "…)20": a digit 0 where the letter O is likely meant — no verdict
      const n = m ? Number(m[0]) : 1;
      if (m) i += m[0].length;
      const top = stack[stack.length - 1];
      for (const [el, k] of Object.entries(g)) top[el] = (top[el] || 0) + k * n;
      continue;
    }
    const m = s.slice(i).match(/^([A-Z][a-z]?)(\d*)/);
    if (!m) return null;
    let el = m[1];
    let len = m[0].length;
    if (!ELEMENTS.has(el)) {
      // "Co" vs "C" + "o": a lowercase letter that does not make an element is not a formula.
      return null;
    }
    // "H20" for H2O: a count ending in the digit 0 is far likelier a typed/OCR'd letter O than 10, 20, 30 atoms —
    // no verdict (strict review of #1584). Class 10 equations carry no such counts.
    if (/0$/.test(m[2])) return null;
    const n = m[2] ? Number(m[2]) : 1;
    const top = stack[stack.length - 1];
    top[el] = (top[el] || 0) + n;
    i += len;
  }
  if (stack.length !== 1) return null;
  return stack[0];
}

const TERM = /^(\d+)?\s*([A-Z][A-Za-z0-9()[\]·.]*)$/;

function parseSide(text, which) {
  const raw = text.split('+').map((t) => t.trim());
  if (raw.length === 0 || raw.some((t) => t === '')) return null;
  // The equation sits inside a line: "(i) BaCl2 + …", "Combination: CaO + …", "… → CaO + CO2 on heating".
  if (which === 'left') {
    const m = raw[0].match(/(\d*\s*[A-Z][A-Za-z0-9()[\]·.]*)$/);
    if (!m) return null;
    raw[0] = m[1].trim();
  } else {
    const last = raw.length - 1;
    const m = raw[last].match(/^(\d*\s*[A-Z][A-Za-z0-9()[\]·]*)/);
    if (!m) return null;
    raw[last] = m[1].trim().replace(/\.$/, '');
  }
  const terms = [];
  for (const t of raw) {
    const m = t.match(TERM);
    if (!m) return null;
    const atoms = atomsOf(m[2].replace(/\.$/, ''));
    if (!atoms) return null;
    terms.push({ coefficient: m[1] ? Number(m[1]) : null, formula: m[2], atoms });
  }
  return terms;
}

/** One equation in one line of text, or null. */
function readEquation(line) {
  let t = String(line == null ? '' : line).normalize('NFKC');
  t = t.replace(/[₀-₉]/g, (d) => SUBSCRIPTS[d] || d);
  t = t.replace(STATE_SYMBOL, '').replace(UP_DOWN, '');
  // A parenthetical with no capital letter is a remark ("(on heating)", "(balanced)"), not a formula.
  t = t.replace(/\([^()A-Z]*\)/g, ' ');
  // A structural formula ("CH2=CH2", "CH3-CH3", "HC≡CH") is not read: its bonds would be cut as separators
  // (review of #1584: "CH₂=CH₂ + H₂O → CH₃CH₂OH" was read as "CH2 + H2O → …").
  if (/[A-Za-z0-9)]\s*[=≡]\s*[A-Z(]/.test(t) && /→|⟶|⇌|->|[—–―⎯]>/.test(t)) return null;
  if (/[a-z0-9)]-[A-Z(]/.test(t)) return null;
  let m = t.match(ARROW_WITH_LABEL);
  let left;
  let right;
  if (m) {
    left = t.slice(0, m.index);
    right = t.slice(m.index + m[0].length);
    if (ARROW_WITH_LABEL.test(right)) return null; // two arrows: not one equation
  } else {
    // "=" as an arrow only when both sides read as formulae (a maths line never does).
    const eq = t.split('=');
    if (eq.length !== 2) return null;
    [left, right] = eq;
  }
  const L = parseSide(left, 'left');
  const R = parseSide(right, 'right');
  if (!L || !R) return null;
  const count = (side) => {
    const out = {};
    for (const term of side) for (const [el, n] of Object.entries(term.atoms)) out[el] = (out[el] || 0) + n * (term.coefficient || 1);
    return out;
  };
  const a = count(L);
  const b = count(R);
  const els = new Set([...Object.keys(a), ...Object.keys(b)]);
  let balanced = true;
  for (const el of els) if ((a[el] || 0) !== (b[el] || 0)) balanced = false;
  // The two sides must share their elements, or this is not a reaction (a misread line).
  for (const el of els) if (!(el in a) || !(el in b)) return null;
  const coefficientsWritten = [...L, ...R].some((x) => x.coefficient != null && x.coefficient !== 1);
  return { balanced, coefficientsWritten, left: L.map((x) => x.formula), right: R.map((x) => x.formula) };
}

/** Every equation this reader can read in a step's text (one per line or ';'-separated clause). */
function readEquations(text) {
  return String(text == null ? '' : text).split(/\n|;|\s\/\s/).map(readEquation).filter(Boolean);
}

module.exports = { readEquation, readEquations, atomsOf };
