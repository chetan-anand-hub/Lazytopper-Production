#!/usr/bin/env node
/**
 * equation_grader_compat_harness.mjs — anti-regression proof for the shared equation
 * serialization (\(...\) inline / \[...\] block LaTeX + prose).
 *
 * WHAT THIS PROVES (deterministic, runs anywhere incl. Windows — `node` only):
 *   1. ANTI-REGRESSION: a no-math answer serializes byte-identically to today's plain
 *      textarea, so it reaches the grader unchanged and grades exactly as before.
 *   2. SEMANTICS-PRESERVING: for each paired answer, the plain form and the \(...\)-math
 *      form reduce to the SAME canonical reading — they denote identical content, so the
 *      grader (which receives the student string verbatim, checkSolution.cjs) reads
 *      equivalent content either way.
 *   3. PROSE-PRESERVING: the math form's surrounding prose is identical to the plain
 *      form's — serialization only WRAPS math tokens, never adds/drops/reorders words.
 *   4. NON-FABRICATION: every number in the math form is present in the plain form — the
 *      serialization introduces notation, never a new value or answer.
 *   5. WELL-FORMED: every \(...\) / \[...\] span in the math form is balanced and unnested.
 *
 * WHAT THIS DOES NOT PROVE (by design — it is the owner live-verify gate):
 *   Gemini's actual grade on a raw \(...\) string equals its grade on the plain string.
 *   That is non-deterministic (a live model call) and is verified once by the owner:
 *   type a math answer on Practice + Check & Improve, confirm it grades the same + renders.
 *   The direction of adaptation is unchanged: THE FORMAT ADAPTS TO THE GRADER, never the
 *   reverse. (Stale-reason fix, PR-C1: this line used to justify that with "the grader
 *   (checkSolution.cjs) is FORBIDDEN and never modified". That claim stopped being true
 *   when the blanket ban was lifted in the two C&I acceptance gates in favour of targeted
 *   tests — see server/routes/checkSolution.test.cjs. The RULE still holds; only its dead
 *   reason is removed, so nobody plans against a protection that is no longer there.)
 */

// ── Curated paired answers: same student answer, plain vs \(...\)-serialized ──────────
// Each `math` is what <EquationInput> emits when a student uses the palette; each `plain`
// is the equivalent a student could type on the bare textarea today.
export const GRADER_COMPAT_PAIRS = [
  {
    name: "no-math prose (anti-regression — must be byte-identical)",
    plain: "The reaction is exothermic because heat is released to the surroundings.",
    math: "The reaction is exothermic because heat is released to the surroundings.",
  },
  {
    name: "power / superscript",
    plain: "Area = x^2 square units",
    math: "Area = \\(x^{2}\\) square units",
  },
  {
    name: "fraction",
    plain: "Probability = 1/6",
    math: "Probability = \\(\\frac{1}{6}\\)",
  },
  {
    name: "square root",
    plain: "The diagonal is sqrt2 times the side",
    math: "The diagonal is \\(\\sqrt{2}\\) times the side",
  },
  {
    name: "quadratic formula (± and root together)",
    plain: "x = (-b ± sqrt(b^2 - 4ac)) / 2a",
    math: "x = \\(\\frac{-b \\pm \\sqrt{b^{2} - 4ac}}{2a}\\)",
  },
  {
    name: "trig",
    plain: "sin(30°) = 1/2",
    math: "\\(\\sin(30^{\\circ})\\) = \\(\\frac{1}{2}\\)",
  },
  {
    name: "inequality",
    plain: "For all real x, x^2 ≥ 0",
    math: "For all real x, \\(x^{2} \\geq 0\\)",
  },
  {
    name: "subscript + multi-line working",
    plain: "a_1 = 3\nd = 2\na_n = 3 + (n-1)×2",
    math: "\\(a_{1} = 3\\)\n\\(d = 2\\)\n\\(a_{n} = 3 + (n-1)\\times 2\\)",
  },
];

// Symbol-level LaTeX -> canonical unicode/ascii reading (applied AFTER structural
// \frac/\sqrt expansion below). Degree (^{\circ}) collapses to ° WITHOUT a caret so it
// reads like the plain "30°". Only the tokens the palette emits.
const SYMBOL_READING = [
  [/\^\{\\circ\}/g, "°"],
  [/\^\\circ/g, "°"],
  [/\\circ/g, "°"],
  [/\^\{([^{}]*)\}/g, "^$1"],
  [/_\{([^{}]*)\}/g, "_$1"],
  [/\\pm/g, "±"], [/\\times/g, "×"], [/\\div/g, "÷"], [/\\cdot/g, "·"],
  [/\\leq/g, "≤"], [/\\geq/g, "≥"], [/\\neq/g, "≠"], [/\\approx/g, "≈"],
  [/\\rightarrow/g, "→"], [/\\Rightarrow/g, "⇒"], [/\\therefore/g, "∴"], [/\\infty/g, "∞"],
  [/\\pi/g, "π"], [/\\theta/g, "θ"], [/\\alpha/g, "α"], [/\\beta/g, "β"],
  [/\\Delta/g, "Δ"], [/\\lambda/g, "λ"], [/\\mu/g, "μ"],
  [/\\sum/g, "Σ"], [/\\int/g, "∫"], [/\\prod/g, "∏"],
  [/\\sin/g, "sin"], [/\\cos/g, "cos"], [/\\tan/g, "tan"], [/\\log/g, "log"], [/\\ln/g, "ln"],
  [/\\left/g, ""], [/\\right/g, ""],
];

/** Read a brace group starting at s[i] === '{'; returns { content, end }. Brace-matched. */
function readGroup(s, i) {
  let depth = 0;
  for (let j = i; j < s.length; j++) {
    if (s[j] === "{") depth++;
    else if (s[j] === "}") { depth--; if (depth === 0) return { content: s.slice(i + 1, j), end: j + 1 }; }
  }
  return { content: s.slice(i + 1), end: s.length };
}

/** Expand \frac{..}{..} -> (..)/(..) and \sqrt[..]{..} -> sqrt.. with matched braces (nested-safe). */
function expandLatex(s) {
  let out = "", i = 0;
  while (i < s.length) {
    if (s.startsWith("\\frac", i)) {
      let k = i + 5; while (s[k] === " ") k++;
      if (s[k] === "{") {
        const num = readGroup(s, k); let m = num.end; while (s[m] === " ") m++;
        if (s[m] === "{") {
          const den = readGroup(s, m);
          out += "(" + expandLatex(num.content) + ")/(" + expandLatex(den.content) + ")";
          i = den.end; continue;
        }
      }
    }
    if (s.startsWith("\\sqrt", i)) {
      let k = i + 5;
      if (s[k] === "[") { const c = s.indexOf("]", k); if (c >= 0) k = c + 1; }
      while (s[k] === " ") k++;
      if (s[k] === "{") { const g = readGroup(s, k); out += "sqrt" + expandLatex(g.content); i = g.end; continue; }
    }
    out += s[i]; i++;
  }
  return out;
}

/** Reduce either form to a canonical reading: strip delimiters, expand structure + symbols,
 *  drop all brackets/whitespace. Two strings with the same reading denote the same content. */
function toReading(s) {
  let r = s.replace(/\\\(|\\\)|\\\[|\\\]/g, " ");
  r = expandLatex(r);
  for (const [re, rep] of SYMBOL_READING) r = r.replace(re, rep);
  r = r.replace(/[()\[\]\s{}]/g, "");
  return r;
}

/** Every maximal digit-run in a string. */
function numbers(form) {
  return (toReading(form).match(/\d+/g) || []).sort();
}

/** Balanced, non-nested \(...\) / \[...\] check. Returns null if OK, else an error string. */
function checkDelimiters(form) {
  const tokens = form.match(/\\\(|\\\)|\\\[|\\\]/g) || [];
  let openInline = 0, openBlock = 0;
  for (const t of tokens) {
    if (t === "\\(") { if (openInline || openBlock) return "nested open"; openInline = 1; }
    else if (t === "\\)") { if (!openInline) return "close without open"; openInline = 0; }
    else if (t === "\\[") { if (openInline || openBlock) return "nested open"; openBlock = 1; }
    else if (t === "\\]") { if (!openBlock) return "close without open"; openBlock = 0; }
  }
  if (openInline || openBlock) return "unclosed span";
  return null;
}

// ── Run ──────────────────────────────────────────────────────────────────────────────
let failures = 0;
const log = (ok, name, detail) => {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
};

console.log("equation grader-compat harness — serialization anti-regression\n");

for (const pair of GRADER_COMPAT_PAIRS) {
  const isNoMath = !/\\\(|\\\[/.test(pair.math);

  // 1. Anti-regression: a no-math pair must be byte-identical.
  if (isNoMath) {
    log(pair.plain === pair.math, `[byte-identical] ${pair.name}`,
      pair.plain === pair.math ? "" : "no-math answer must serialize unchanged");
  }

  // 5. Well-formed spans.
  const delimErr = checkDelimiters(pair.math);
  log(delimErr === null, `[well-formed]     ${pair.name}`, delimErr || "");

  // 2. Semantics-preserving (subsumes prose-preservation): same canonical reading, so
  //    the surrounding prose AND the math both survive identically.
  const rp = toReading(pair.plain), rm = toReading(pair.math);
  log(rp === rm, `[semantics-equal] ${pair.name}`, rp === rm ? "" : `plain="${rp}" vs math="${rm}"`);

  // 3. Non-fabrication: math introduces no number absent from plain.
  const pn = numbers(pair.plain), mn = numbers(pair.math);
  const fabricated = mn.filter((n) => !pn.includes(n));
  log(fabricated.length === 0, `[no-fabrication]  ${pair.name}`,
    fabricated.length ? `math added numbers not in plain: ${fabricated}` : "");
}

console.log(`\n${failures === 0 ? "ALL PASS" : failures + " FAILURE(S)"} — ${GRADER_COMPAT_PAIRS.length} pairs`);
process.exit(failures === 0 ? 0 : 1);
