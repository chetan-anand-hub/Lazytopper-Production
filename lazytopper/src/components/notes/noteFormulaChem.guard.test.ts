/**
 * GUARD — NOTES-FORMULA-2 (D198): Science formula cards show chemistry as chemistry.
 *
 * The owner's screenshot of /notes/life-processes showed `6CO2 + 6H2O --(sunlight, chlorophyll)--> C6H12O6 + 6O2`
 * with no subscripts, an ASCII arrow, and an author note printed under the equation. So:
 *
 *   (a) every chemical equation on a formula card (TeX, `$…$`) is BALANCED atom by atom and in charge,
 *       checked by a small parser, not by eye; the named equations below MUST be among those checked
 *       (a parser that quietly skipped everything would stay green);
 *   (b) no formula card of any of the 26 notes has plain-text chemistry left outside `$…$`:
 *       no ASCII arrow, no letter-digit subscript (CO2, H2O, Fe2O3), no `m2`;
 *   (c) the life-processes card carries no author note;
 *   (d) every formula in every committed noteMath map rendered (no `katex-error`);
 *   (e) CONTROL: the balancer rejects an unbalanced equation and the plain-text detector fires on the old text.
 *
 * Generic reaction patterns ("Metal + Acid → Salt + Hydrogen", "A + B → AB", genotypes) are words and symbols, not
 * element formulas: the parser declines them (it only checks species made of real element symbols).
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { NOTE_MATH_RE } from "./noteMathCore";

const SPECS_DIR = resolve(__dirname, "../../../../notes/specs");
const MATH_DIR = resolve(__dirname, "noteMath");

const ELEMENTS = new Set(
  "H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn".split(" "),
);

type Atoms = Record<string, number>;

/** Parse one formula part (no coefficient): C6H12O6, NaHCO3, H3O (charge already removed). Null if it is not made of real elements. */
function parseFormula(f: string): Atoms | null {
  if (!/^([A-Z][a-z]?\d*)+$/.test(f)) return null;
  const atoms: Atoms = {};
  for (const m of f.matchAll(/([A-Z][a-z]?)(\d*)/g)) {
    if (!ELEMENTS.has(m[1])) return null;
    atoms[m[1]] = (atoms[m[1]] ?? 0) + (m[2] ? Number(m[2]) : 1);
  }
  return atoms;
}

function takeCoefficient(s: string): { coef: number; rest: string } {
  const frac = s.match(/^\\tfrac\{(\d+)\}\{(\d+)\}\s*/);
  if (frac) return { coef: Number(frac[1]) / Number(frac[2]), rest: s.slice(frac[0].length) };
  const num = s.match(/^(\d+)\s*/);
  if (num) return { coef: Number(num[1]), rest: s.slice(num[0].length) };
  return { coef: 1, rest: s };
}

interface Species { atoms: Atoms; charge: number }

function parseSpecies(raw: string): Species | null {
  let s = raw.trim().replace(/\\ /g, " ").replace(/\\text\{([^{}]*)\}/g, "$1");
  s = s.replace(/\((aq|l|g|s)\)/g, "").trim(); // state symbols
  let charge = 0;
  const ch = s.match(/\^\{?(\d*)([+-])\}?$/);
  if (ch) {
    charge = (ch[1] ? Number(ch[1]) : 1) * (ch[2] === "+" ? 1 : -1);
    s = s.slice(0, ch.index).trim();
  }
  const total: Atoms = {};
  const parts = s.split("\\cdot"); // hydrates: CaSO4 · 1/2 H2O
  for (const partRaw of parts) {
    const { coef, rest } = takeCoefficient(partRaw.trim());
    const f = parseFormula(rest.replace(/_\{(\d+)\}/g, "$1").replace(/_(\d)/g, "$1").replace(/\s+/g, ""));
    if (!f) return null;
    for (const [el, n] of Object.entries(f)) total[el] = (total[el] ?? 0) + n * coef;
  }
  return { atoms: total, charge };
}

function side(text: string): Species[] | null {
  const out: Species[] = [];
  for (const raw of text.split(/\s\+\s/)) {
    if (/^\\text\{[Hh]eat[^{}]*\}$/.test(raw.trim())) continue; // energy is not a species
    const { coef, rest } = takeCoefficient(raw.trim());
    const sp = parseSpecies(rest);
    if (!sp) return null;
    out.push({ atoms: Object.fromEntries(Object.entries(sp.atoms).map(([k, v]) => [k, v * coef])), charge: sp.charge * coef });
  }
  return out;
}

const sum = (list: Species[]): { atoms: Atoms; charge: number } => {
  const atoms: Atoms = {};
  let charge = 0;
  for (const s of list) {
    charge += s.charge;
    for (const [k, v] of Object.entries(s.atoms)) atoms[k] = (atoms[k] ?? 0) + v;
  }
  return { atoms, charge };
};

type Verdict = { kind: "generic" } | { kind: "balanced" } | { kind: "unbalanced"; left: Atoms; right: Atoms; lc: number; rc: number };

/** One `$…$` TeX segment: balanced / unbalanced / generic (not made of element formulas). */
function checkSegment(tex: string): Verdict {
  const norm = tex.replace(/\\xrightarrow\{(?:[^{}]|\{[^{}]*\})*\}/g, "\\rightarrow");
  const sides = norm.split("\\rightarrow");
  if (sides.length !== 2) return { kind: "generic" };
  const L = side(sides[0]);
  const R = side(sides[1]);
  if (!L || !R) return { kind: "generic" };
  const l = sum(L), r = sum(R);
  const els = new Set([...Object.keys(l.atoms), ...Object.keys(r.atoms)]);
  const same = [...els].every((e) => Math.abs((l.atoms[e] ?? 0) - (r.atoms[e] ?? 0)) < 1e-9) && l.charge === r.charge;
  return same ? { kind: "balanced" } : { kind: "unbalanced", left: l.atoms, right: r.atoms, lc: l.charge, rc: r.charge };
}

interface Strip { slug: string; i: number; label: string; math: string }
function allStrips(): Strip[] {
  const out: Strip[] = [];
  for (const f of readdirSync(SPECS_DIR).filter((x) => x.endsWith(".json"))) {
    const spec = JSON.parse(readFileSync(resolve(SPECS_DIR, f), "utf8")) as { formula_strip?: Array<{ label: string; math: string }> };
    (spec.formula_strip ?? []).forEach((it, i) => out.push({ slug: f.replace(/\.json$/, ""), i, label: it.label, math: it.math }));
  }
  return out;
}

/** The text of a card outside its `$…$` formulas, entities decoded the way the page shows them. */
const outsideMath = (s: string) => s.replace(NOTE_MATH_RE, " ").replace(/&[a-z]+;/g, " ");

const PLAIN_CHEM = [
  /-{1,2}>|-{2}&gt;|-{2}[[(]|[\])]-{2}/, // an ASCII arrow: -> , --> , --&gt; , --[O]-- , --(UV)--
  /[A-Z][a-z]?\d/, // a letter-digit subscript: CO2, H2O, Fe2O3, F2
  /\b[a-z]{0,2}m\d\b/, // a unit power typed flat: m2
];
const plainChemistry = (s: string) => PLAIN_CHEM.some((re) => re.test(outsideMath(s)));

/** The real equations that MUST be seen and balanced (an id here that the parser skipped fails the test). */
const MUST_BE_CHECKED: Array<[string, number, number]> = [
  // [slug, strip index, how many balanced segments it must contribute]
  ["acids-bases-and-salts", 2, 1], // H+ + OH- -> H2O  (the generic first half is skipped)
  ["acids-bases-and-salts", 3, 2], // HCl + H2O -> H3O+ + Cl- ; NaOH -> Na+ + OH-
  ["acids-bases-and-salts", 5, 1], // chlor-alkali
  ["acids-bases-and-salts", 7, 1], // plaster of Paris -> gypsum
  ["metals-and-non-metals", 0, 0], // generic (Metal + Oxygen): checked as generic, not balanced
  ["metals-and-non-metals", 6, 1], // thermit
  ["carbon-and-its-compounds", 6, 1], // CH4 + Cl2 -> CH3Cl + HCl
  ["life-processes", 0, 1], // photosynthesis
  ["our-environment", 4, 2], // O2 -> O + O ; O + O2 -> O3
];

describe("NOTES-FORMULA-2 — chemistry on the formula cards", () => {
  const strips = allStrips();

  it("(a) every element-formula equation is balanced in atoms and charge; the named ones are really checked", () => {
    const checked = new Map<string, number>();
    const bad: string[] = [];
    for (const s of strips) {
      for (const m of s.math.matchAll(NOTE_MATH_RE)) {
        const v = checkSegment(m[1]);
        if (v.kind === "balanced") checked.set(`${s.slug}#${s.i}`, (checked.get(`${s.slug}#${s.i}`) ?? 0) + 1);
        if (v.kind === "unbalanced") bad.push(`${s.slug}#${s.i} ${JSON.stringify(v)}`);
      }
    }
    expect(bad).toEqual([]);
    for (const [slug, i, n] of MUST_BE_CHECKED) expect(checked.get(`${slug}#${i}`) ?? 0, `${slug}#${i}`).toBe(n);
    expect([...checked.values()].reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(10);
  });

  it("(b) no formula card of any note has plain-text chemistry left outside $…$", () => {
    const left = strips.filter((s) => plainChemistry(s.math) || plainChemistry(s.label)).map((s) => `${s.slug}#${s.i}: ${s.label} | ${s.math}`);
    expect(left).toEqual([]);
  });

  it("(c) the life-processes photosynthesis card carries no author note", () => {
    const p = strips.find((s) => s.slug === "life-processes" && s.i === 0)!;
    expect(p.math).not.toMatch(/standard CBSE equation|NCERT states/i);
    expect(p.math.startsWith("$")).toBe(true);
  });

  it("(d) every committed noteMath map rendered every formula (no katex-error)", () => {
    const broken: string[] = [];
    for (const f of readdirSync(MATH_DIR).filter((x) => x.endsWith(".json"))) {
      const map = JSON.parse(readFileSync(resolve(MATH_DIR, f), "utf8")) as Record<string, string>;
      for (const [latex, html] of Object.entries(map)) if (html.includes("katex-error")) broken.push(`${f}: ${latex}`);
    }
    expect(broken).toEqual([]);
  });

  it("(e) CONTROL: the balancer rejects an unbalanced equation; the detector fires on the old plain text", () => {
    expect(checkSegment("\\text{H}_2 + \\text{O}_2 \\rightarrow \\text{H}_2\\text{O}").kind).toBe("unbalanced");
    expect(checkSegment("2\\text{H}_2 + \\text{O}_2 \\rightarrow 2\\text{H}_2\\text{O}").kind).toBe("balanced");
    expect(checkSegment("\\text{H}^+ + \\text{OH}^- \\rightarrow \\text{H}_2\\text{O}(l)").kind).toBe("balanced");
    expect(checkSegment("\\text{H}^+ + \\text{Cl}^- \\rightarrow \\text{HCl}^+").kind).toBe("unbalanced"); // charge counted
    expect(checkSegment("\\text{Metal} + \\text{Acid} \\rightarrow \\text{Salt}").kind).toBe("generic");
    expect(plainChemistry("6CO2 + 6H2O --(sunlight, chlorophyll)--&gt; C6H12O6 + 6O2")).toBe(true);
    expect(plainChemistry("Acid + Metal -> Salt + Hydrogen gas")).toBe(true);
    expect(plainChemistry("about 80 m2")).toBe(true);
    expect(plainChemistry("$6\\text{CO}_2 \\rightarrow \\text{C}_6\\text{H}_{12}\\text{O}_6$")).toBe(false);
  });
});
