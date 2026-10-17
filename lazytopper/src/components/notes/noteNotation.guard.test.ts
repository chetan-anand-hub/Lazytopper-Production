/**
 * GUARD — FORMULA-RENDER-1: maths and chemistry notation in the notes renders as notation everywhere,
 * not only on the formula cards (noteFormulaChem.guard.test.ts covers the cards).
 *
 * Only text inside `$…$` becomes KaTeX (noteMathCore NOTE_MATH_RE); everything else is printed as HTML.
 * The 17 Oct audit found, outside `$…$`: mindmaps typed in ASCII (CO2, H+(aq), x^2, (pi), sqrt(…), R1, F1, ->),
 * raw `\textbf{…}` on the real-numbers cards, plain-text chemistry and `->` in the chemistry note prose, and
 * card titles whose uppercase style turned θ into Θ and $n$ into N. So:
 *
 *   (a) MINDMAPS (all 26 notes): no plain-text chemistry (ASCII arrow, letter-digit subscript, flat unit power,
 *       a bare ion such as H+ / OH-) and no flat maths (x^2, x_i, (pi), sqrt( ) outside `$…$`;
 *   (b) NOTE PROSE of the four chemistry chapters: the same chemistry rule on every rendered field, except the
 *       NCERT-verbatim fields (definitions[].verbatim, examples[].problem_verbatim), which
 *       notes/verify_note_fidelity.py checks letter for letter against the NCERT PDF;
 *   (c) EVERY rendered field of all 26 notes: no LaTeX command (\frac, \textbf, \mathrm, \text, ^{, _{) and no
 *       bare ASCII arrow `->` outside `$…$`;
 *   (d) card titles: the uppercase rule never reaches KaTeX (Note.tsx keeps `.lt-note__flabel .katex` at
 *       text-transform none) and no title carries a bare Greek letter outside `$…$`;
 *   (e) CONTROL: each detector fires on the text the audit found.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { NOTE_MATH_RE } from "./noteMathCore";

const SPECS_DIR = resolve(__dirname, "../../../../notes/specs");
const NOTE_TSX = resolve(__dirname, "Note.tsx");

const CHEMISTRY = new Set(["acids-bases-and-salts", "carbon-and-its-compounds", "chemical-reactions-and-equations", "metals-and-non-metals"]);

/** Keys whose string values are never rendered as note text, or are NCERT-verbatim (fidelity-checked). */
const NOT_PROSE = new Set(["source", "source_ledger", "id", "asset", "bucket", "kind", "tier", "type", "clean", "pdf", "edition", "params", "generator", "svg_ref", "crop", "figure_ref", "topic_key", "verbatim", "problem_verbatim", "subject", "weightage", "source_edition", "concept_ids", "ncert_fig", "tag"]);

interface Field { slug: string; path: string; text: string }

function fieldsOf(value: unknown, path: string, out: Array<{ path: string; text: string }>): void {
  if (typeof value === "string") out.push({ path, text: value });
  else if (Array.isArray(value)) value.forEach((v, i) => fieldsOf(v, `${path}[${i}]`, out));
  else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) if (!NOT_PROSE.has(k)) fieldsOf(v, path ? `${path}.${k}` : k, out);
  }
}

function allFields(): Field[] {
  const out: Field[] = [];
  for (const f of readdirSync(SPECS_DIR).filter((x) => x.endsWith(".json"))) {
    const slug = f.replace(/\.json$/, "");
    const spec = JSON.parse(readFileSync(resolve(SPECS_DIR, f), "utf8")) as Record<string, unknown>;
    const list: Array<{ path: string; text: string }> = [];
    fieldsOf(spec, "", list);
    for (const x of list) out.push({ slug, ...x });
  }
  return out;
}

const outsideMath = (s: string) => s.replace(NOTE_MATH_RE, " ");

/** An ASCII arrow: -> , --> , --&gt; , --Heat--> , --[O]-- , --(UV)-- */
const ASCII_ARROW = /-{1,2}(?:>|&gt;)|-{2}[[(A-Za-z]|[\])]-{2}/;
const CHEM_FLAT = [
  /[A-Z][a-z]?\d/, // a letter-digit subscript: CO2, H2O, R1, F1
  /\b[a-z]{0,2}m\d\b/, // a unit power typed flat: m2
  /(?:^|[\s(/,;:])(?:[A-Z][a-z]?\d*)+[+-](?=\(aq\)|[\s,;.)/]|$)/, // a bare ion: H+, OH-, Cl-, H3O+
];
const MATH_FLAT = [
  /\w\^\w/, // x^2
  /\b[A-Za-z]_[A-Za-z0-9]/, // x_i
  /\(pi\)/, // (pi)
  /\bsqrt\(/, // sqrt(
];
const LATEX_OUTSIDE = /\\(?:frac|tfrac|dfrac|textbf|textit|mathrm|mathbf|text|sqrt|times|cdot|rightarrow|xrightarrow|pi|theta|alpha|beta|Sigma|bar)\b|\^\{|_\{/;
const GREEK = /[Ͱ-Ͽ]/;

function plainChem(s: string): boolean {
  const out = outsideMath(s);
  if (ASCII_ARROW.test(out)) return true;
  const spaced = out.replace(/&[a-z]+;/g, " ");
  return CHEM_FLAT.some((re) => re.test(spaced));
}
function flatMaths(s: string): boolean {
  const out = outsideMath(s).replace(/&[a-z]+;/g, " ");
  return MATH_FLAT.some((re) => re.test(out));
}
function latexOutside(s: string): boolean {
  return LATEX_OUTSIDE.test(outsideMath(s));
}
function asciiArrow(s: string): boolean {
  return ASCII_ARROW.test(outsideMath(s));
}

const show = (f: Field) => `${f.slug} ${f.path}: ${f.text.slice(0, 120)}`;

describe("FORMULA-RENDER-1 — notation renders as notation outside the formula cards", () => {
  const fields = allFields();

  it("(a) no mindmap item of any note has plain-text chemistry or flat maths outside $…$", () => {
    const mm = fields.filter((f) => f.path.startsWith("mindmap"));
    expect(mm.length).toBeGreaterThan(26 * 10); // the walk really reaches the 26 mindmaps
    expect(mm.filter((f) => plainChem(f.text) || flatMaths(f.text)).map(show)).toEqual([]);
  });

  it("(b) no rendered prose field of a chemistry note has plain-text chemistry outside $…$", () => {
    const prose = fields.filter((f) => CHEMISTRY.has(f.slug) && !f.path.startsWith("mindmap") && !f.path.startsWith("formula_strip"));
    expect(prose.length).toBeGreaterThan(200);
    expect(prose.filter((f) => plainChem(f.text)).map(show)).toEqual([]);
  });

  it("(c) no rendered field of any note has a LaTeX command or an ASCII arrow outside $…$", () => {
    expect(fields.filter((f) => latexOutside(f.text) || asciiArrow(f.text)).map(show)).toEqual([]);
  });

  it("(d) formula-card titles keep math and Greek letters in their own case", () => {
    const css = readFileSync(NOTE_TSX, "utf8");
    expect(css).toMatch(/\.lt-note__flabel\s+\.katex\s*\{[^}]*text-transform:\s*none/);
    const titles = fields.filter((f) => /^formula_strip\[\d+\]\.label$/.test(f.path));
    expect(titles.length).toBeGreaterThan(100);
    expect(titles.filter((f) => GREEK.test(outsideMath(f.text))).map(show)).toEqual([]);
  });

  it("(e) CONTROL: the detectors fire on the audit's text and pass the fixed notation", () => {
    expect(plainChem("Acid -> H+(aq) / H3O+")).toBe(true);
    expect(plainChem("Strong vs weak (more / less H+)")).toBe(true);
    expect(plainChem("Washing soda Na2CO3.10H2O")).toBe(true);
    expect(plainChem("2NaHCO3 --Heat--> Na2CO3 + H2O + CO2")).toBe(true);
    expect(plainChem("Series: Rs = R1 + R2 + R3")).toBe(true);
    expect(plainChem("Acid $\\rightarrow$ $\\text{H}^+(\\text{aq})$ / $\\text{H}_3\\text{O}^+$")).toBe(false);
    expect(plainChem("Sour or bitter - decoded by pH; a 3-5 mark question")).toBe(false);
    expect(flatMaths("Cylinder: 2(pi)rh, (pi)r^2 h")).toBe(true);
    expect(flatMaths("Class mark x_i = (upper + lower)/2")).toBe(true);
    expect(flatMaths("Slant height l = sqrt(r^2 + h^2) first")).toBe(true);
    expect(flatMaths("Cylinder: $2\\pi rh$, $\\pi r^2 h$")).toBe(false);
    expect(latexOutside("product of the \\textbf{smallest} power")).toBe(true);
    expect(latexOutside("product of the <b>smallest</b> power, $\\frac{a}{b}$")).toBe(false);
    expect(asciiArrow("Converse of BPT -> isosceles")).toBe(true);
    expect(GREEK.test(outsideMath("Length of an arc (angle θ)"))).toBe(true);
    expect(GREEK.test(outsideMath("Length of an arc (angle $\\theta$)"))).toBe(false);
  });
});
