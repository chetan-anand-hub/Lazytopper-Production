// src/lib/solutions/compareAnswer.ts
//
// SOLUTIONS-1 (lane G; #973 D260) — compare a student's TYPED final answer with a row's
// `finalAnswer`, for the public solutions pages. Pure, no dependencies.
//
// ★ THE ONE RULE: NEVER MARK A CORRECT STUDENT WRONG. "wrong" is returned only when BOTH the
//   key and the student's answer parse unambiguously as values in the same dimension and they
//   differ. Anything the parser is not sure of (words, two numbers, an unknown unit, an area
//   unit against a length key, a ratio against a number) is "none": the page then shows the
//   model answer with no verdict.
//
// Handled: integers and decimals; fractions a/b (½ and 1⁄2 normalised); simple surds a√b,
// √b, a*sqrt(b), sqrt(b); a ratio a:b against a ratio key (reduced); an optional length unit
// mm / cm / m / km, converted. A leading label ("EC = 2 cm") is ignored on both sides.
// A decimal is accepted for a non-integer key when it is that key rounded to the decimals the
// student wrote, with at least 3 significant figures (55/3 → 18.3 or 18.33 ✓, 18 ✗).
//
// SOLUTIONS-SCI-UNITS (6 Nov 2026) — an OPT-IN Science mode, `{ units: "science" }`, for the NCERT
// Science solutions pages: one SI quantity with its unit, case-SENSITIVE (mA ≠ MA, mW ≠ MW) —
// charge C, current A, potential difference V, resistance Ω / ohm, energy J / kWh, power W,
// time s / min / h, plus the length units — each converted within its own dimension. A unit from
// another dimension, or an unknown / ambiguous unit, is "none" (the same one rule). The DEFAULT mode
// is the length-only behaviour above, unchanged: every Maths caller gets byte-identical results.

export type Verdict = "right" | "wrong" | "none";

export interface CompareResult {
  verdict: Verdict;
  /** The student's answer as typed (trimmed), for "Your answer: X". */
  shown: string;
}

type LengthUnit = "mm" | "cm" | "m" | "km";
const TO_CM: Readonly<Record<LengthUnit, number>> = { mm: 0.1, cm: 1, m: 100, km: 100_000 };

export type UnitMode = "length" | "science";

/** A Science unit: its dimension and its factor to that dimension's SI base unit. */
interface SciUnit {
  dim: "length" | "charge" | "current" | "voltage" | "resistance" | "energy" | "power" | "time";
  factor: number;
}
const MICRO = ["μ", "µ", "u"];
const SCI_UNITS: ReadonlyArray<[string, SciUnit]> = [
  ["mm", { dim: "length", factor: 1e-3 }],
  ["cm", { dim: "length", factor: 1e-2 }],
  ["km", { dim: "length", factor: 1e3 }],
  ["m", { dim: "length", factor: 1 }],
  ["C", { dim: "charge", factor: 1 }],
  ["mC", { dim: "charge", factor: 1e-3 }],
  ...MICRO.map((u): [string, SciUnit] => [`${u}C`, { dim: "charge", factor: 1e-6 }]),
  ["coulomb", { dim: "charge", factor: 1 }],
  ["coulombs", { dim: "charge", factor: 1 }],
  ["A", { dim: "current", factor: 1 }],
  ["mA", { dim: "current", factor: 1e-3 }],
  ...MICRO.map((u): [string, SciUnit] => [`${u}A`, { dim: "current", factor: 1e-6 }]),
  ["ampere", { dim: "current", factor: 1 }],
  ["amperes", { dim: "current", factor: 1 }],
  ["V", { dim: "voltage", factor: 1 }],
  ["mV", { dim: "voltage", factor: 1e-3 }],
  ["kV", { dim: "voltage", factor: 1e3 }],
  ["volt", { dim: "voltage", factor: 1 }],
  ["volts", { dim: "voltage", factor: 1 }],
  ["Ω", { dim: "resistance", factor: 1 }],
  ["kΩ", { dim: "resistance", factor: 1e3 }],
  ["MΩ", { dim: "resistance", factor: 1e6 }],
  ["ohm", { dim: "resistance", factor: 1 }],
  ["ohms", { dim: "resistance", factor: 1 }],
  ["J", { dim: "energy", factor: 1 }],
  ["kJ", { dim: "energy", factor: 1e3 }],
  ["MJ", { dim: "energy", factor: 1e6 }],
  ["kWh", { dim: "energy", factor: 3.6e6 }],
  ["joule", { dim: "energy", factor: 1 }],
  ["joules", { dim: "energy", factor: 1 }],
  ["W", { dim: "power", factor: 1 }],
  ["kW", { dim: "power", factor: 1e3 }],
  ["MW", { dim: "power", factor: 1e6 }],
  ["watt", { dim: "power", factor: 1 }],
  ["watts", { dim: "power", factor: 1 }],
  ["s", { dim: "time", factor: 1 }],
  ["min", { dim: "time", factor: 60 }],
  ["h", { dim: "time", factor: 3600 }],
];
// Longest token first, so "kWh" is never read as "h" and "mm" never as "m".
const SCI_UNITS_BY_LENGTH = [...SCI_UNITS].sort((a, b) => b[0].length - a[0].length);

interface Quantity {
  value: number;
  unit: LengthUnit | null;
  /** Science mode only: the parsed unit (dimension + SI factor); null when none was written. */
  sci?: SciUnit | null;
  /** Decimals written, when the value was typed as a plain decimal; else null. */
  decimals: number | null;
  sigFigs: number | null;
}

const NUM = String.raw`\d+(?:\.\d+)?`;
const TERM = new RegExp(String.raw`^(${NUM})?(?:√(${NUM}))?$`);

function normalise(raw: string): string {
  let s = String(raw ?? "").normalize("NFKC").toLowerCase();
  s = s.replace(/⁄/g, "/").replace(/[−–]/g, "-");
  const eq = s.lastIndexOf("=");
  if (eq >= 0) s = s.slice(eq + 1);
  s = s.replace(/\s+/g, "").replace(/\.+$/, "");
  s = s.replace(/sqrt\(([^()]+)\)/g, "√$1").replace(/sqrt/g, "√");
  s = s.replace(/[*×·](?=√)/g, "");
  return s;
}

function evalTerm(t: string): number | null {
  if (!t) return null;
  const m = TERM.exec(t);
  if (!m || (m[1] === undefined && m[2] === undefined)) return null;
  const coeff = m[1] === undefined ? 1 : Number(m[1]);
  const root = m[2] === undefined ? 1 : Math.sqrt(Number(m[2]));
  const value = coeff * root;
  return Number.isFinite(value) ? value : null;
}

function sigFigsOf(digits: string): number {
  return digits.replace(".", "").replace(/^0+/, "").length;
}

/** Science mode: split "0.5 A" / "R = 15 Ω." into the number text and its unit (case kept). */
function splitScienceUnit(raw: string): { num: string; sci: SciUnit | null } | null {
  let s = String(raw ?? "").normalize("NFKC").replace(/⁄/g, "/").replace(/[−–]/g, "-");
  const eq = s.lastIndexOf("=");
  if (eq >= 0) s = s.slice(eq + 1);
  s = s.replace(/\s+/g, "").replace(/\.+$/, "");
  for (const [token, unit] of SCI_UNITS_BY_LENGTH) {
    if (s.endsWith(token) && /[0-9)]$/.test(s.slice(0, -token.length))) return { num: s.slice(0, -token.length), sci: unit };
  }
  // Letters left over that are not a known unit (MA, mW, Ωm, …): not unambiguous.
  return /[A-Za-zΩμµ]$/.test(s) ? null : { num: s, sci: null };
}

/** One value + optional unit (length units by default; SI Science units with `units: "science"`), or null. */
export function parseQuantity(raw: string, units: UnitMode = "length"): Quantity | null {
  if (units === "science") {
    const split = splitScienceUnit(raw);
    if (!split) return null;
    const q = parseQuantity(split.num, "length");
    if (!q || q.unit) return null;
    return { ...q, sci: split.sci };
  }
  let s = normalise(raw);
  let unit: LengthUnit | null = null;
  const u = /(mm|cm|km|m)$/.exec(s);
  if (u) {
    unit = u[1] as LengthUnit;
    s = s.slice(0, -u[1].length);
  }
  let negative = false;
  if (s.startsWith("-")) {
    negative = true;
    s = s.slice(1);
  }
  if (s.startsWith("(") && s.endsWith(")")) s = s.slice(1, -1);
  if (!s || /[^0-9./√]/.test(s)) return null;
  const parts = s.split("/");
  if (parts.length > 2) return null;
  const num = evalTerm(parts[0]);
  const den = parts.length === 2 ? evalTerm(parts[1]) : 1;
  if (num === null || den === null || den === 0) return null;
  const plain = parts.length === 1 && /^\d+(?:\.\d+)?$/.test(parts[0]);
  return {
    value: (negative ? -1 : 1) * (num / den),
    unit,
    decimals: plain ? (parts[0].split(".")[1]?.length ?? 0) : null,
    sigFigs: plain ? sigFigsOf(parts[0]) : null,
  };
}

/** a:b (decimals allowed) → [a, b], else null. */
export function parseRatio(raw: string): [number, number] | null {
  const s = normalise(raw);
  const m = new RegExp(`^(${NUM}):(${NUM})$`).exec(s);
  if (!m) return null;
  const a = Number(m[1]);
  const b = Number(m[2]);
  return b === 0 ? null : [a, b];
}

const close = (a: number, b: number) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(b));

/** Compare a typed answer with a `finalAnswer` key. See the file header for the rules. */
export function compareAnswer(typed: string, key: string, units: UnitMode = "length"): CompareResult {
  const shown = String(typed ?? "").trim();
  if (!shown) return { verdict: "none", shown };
  if (units === "science") return compareScience(typed, key, shown);

  const keyRatio = parseRatio(key);
  if (keyRatio) {
    const got = parseRatio(typed);
    if (!got) return { verdict: "none", shown };
    return { verdict: close(got[0] * keyRatio[1], got[1] * keyRatio[0]) ? "right" : "wrong", shown };
  }

  const k = parseQuantity(key);
  const g = parseQuantity(typed);
  if (!k || !g) return { verdict: "none", shown };
  if (g.unit && !k.unit) return { verdict: "none", shown };
  const kv = k.unit ? k.value * TO_CM[k.unit] : k.value;
  const gv = k.unit ? g.value * TO_CM[g.unit ?? k.unit] : g.value;

  if (close(gv, kv)) return { verdict: "right", shown };
  // A rounded decimal of a non-integer key, at the student's own precision (3+ sig figs).
  if (g.decimals !== null && g.sigFigs !== null && g.decimals >= 1 && g.sigFigs >= 3 && !Number.isInteger(kv)) {
    const factor = 10 ** g.decimals;
    if (close(Math.round(kv * factor) / factor, gv)) return { verdict: "right", shown };
  }
  return { verdict: "wrong", shown };
}

/** Science mode: same rules, units converted within one dimension; another dimension is "none". */
function compareScience(typed: string, key: string, shown: string): CompareResult {
  if (parseRatio(key)) return { verdict: "none", shown };
  const k = parseQuantity(key, "science");
  const g = parseQuantity(typed, "science");
  if (!k || !g) return { verdict: "none", shown };
  if (g.sci && !k.sci) return { verdict: "none", shown };
  if (g.sci && k.sci && g.sci.dim !== k.sci.dim) return { verdict: "none", shown };
  const kv = k.value * (k.sci?.factor ?? 1);
  const gv = g.value * (g.sci?.factor ?? k.sci?.factor ?? 1);
  if (close(gv, kv)) return { verdict: "right", shown };
  // A rounded decimal at the student's own precision (3+ sig figs), in the unit they wrote.
  if (g.decimals !== null && g.sigFigs !== null && g.decimals >= 1 && g.sigFigs >= 3) {
    const inTheirUnit = kv / (g.sci?.factor ?? k.sci?.factor ?? 1);
    if (!Number.isInteger(inTheirUnit)) {
      const factor = 10 ** g.decimals;
      if (close(Math.round(inTheirUnit * factor) / factor, g.value)) return { verdict: "right", shown };
    }
  }
  return { verdict: "wrong", shown };
}

const fold = (s: string) => String(s ?? "").replace(/\s+/g, " ").trim().toLowerCase();

/** The option that equals the key, or null when not exactly one does. */
export function correctOptionIndex(answer: string, options: readonly string[]): number | null {
  const key = fold(answer);
  const hits = options.map((o, i) => (fold(o) === key ? i : -1)).filter((i) => i >= 0);
  return hits.length === 1 ? hits[0] : null;
}

/**
 * MCQ / Assertion-Reason: ✓ or ✗ only when EXACTLY ONE option equals the key (whitespace and
 * case folded). Any other shape (no match, two matches) gives "none" — never a guess.
 */
export function compareOption(chosenIndex: number, answer: string, options: readonly string[]): Verdict {
  const correct = correctOptionIndex(answer, options);
  if (correct === null) return "none";
  return chosenIndex === correct ? "right" : "wrong";
}
