/**
 * chapterGlanceContent — SEO-HUB-1 H1. Composes the Topic Hub's "Chapter at a glance"
 * section from the chapter's EXISTING note spec (`notes/specs/<slug>.json`, read through
 * `getNoteSpecForTopic`). Nothing here is written content: every string below is lifted
 * from a spec field, and a field the spec does not carry is omitted — never filled.
 *
 * Why plain text and not <NoteRichText>: NoteRichText statically imports katex and its
 * stylesheet, and that CSS edge on the Topic Hub route is what crashed every chapter in
 * Googlebot's renderer (see ConceptSpine.noteModal.guard.test.ts). The hub must stay off
 * katex, so spec text is flattened here to readable Unicode instead: entities decoded,
 * the spec's light inline tags dropped, and the `$…$` LaTeX the specs use rendered as
 * plain symbols (`\dfrac{Q}{t}` → `Q/t`, `^2` → `²`, `\text{H}_2\text{O}` → `H₂O`).
 * The full, typeset version stays on /notes/<slug>, which the section links to.
 */

import type { NoteSpec } from "../notes/noteSpec.types";

/* ── spec text → plain text ─────────────────────────────────────────── */

const ENTITIES: Readonly<Record<string, string>> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&nbsp;": " ",
  "&theta;": "θ",
  "&pi;": "π",
  "&radic;": "√",
  "&middot;": "·",
  "&rarr;": "→",
  "&larr;": "←",
  "&mdash;": "—",
  "&ndash;": "–",
  "&ldquo;": "“",
  "&rdquo;": "”",
  "&lsquo;": "‘",
  "&rsquo;": "’",
  "&times;": "×",
  "&deg;": "°",
};

/** The spec's light inline markup (NoteRichText renders <b>/<i>); dropped, text kept. */
const INLINE_TAG_RE = /<\/?(?:b|i|em|strong|u|sup|sub)\s*>|<br\s*\/?>/gi;

const SYMBOLS: Readonly<Record<string, string>> = {
  theta: "θ", pi: "π", ell: "ℓ", times: "×", triangle: "△", dots: "…", cdots: "⋯",
  ldots: "…", perp: "⊥", rho: "ρ", approx: "≈", infty: "∞", propto: "∝", neq: "≠",
  ne: "≠", alpha: "α", beta: "β", gamma: "γ", delta: "δ", Delta: "Δ", lambda: "λ",
  mu: "μ", omega: "ω", Omega: "Ω", le: "≤", leq: "≤", ge: "≥", geq: "≥", cdot: "·",
  sum: "Σ", Sigma: "Σ", pm: "±", mid: "|", Rightarrow: "⇒", rightarrow: "→", to: "→",
  parallel: "∥", sim: "~", angle: "∠", circ: "°", degree: "°", div: "÷",
  sin: "sin", cos: "cos", tan: "tan", csc: "cosec", cosec: "cosec", sec: "sec", cot: "cot",
  log: "log", left: "", right: "",
};

const SUPERSCRIPT: Readonly<Record<string, string>> = {
  "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷",
  "8": "⁸", "9": "⁹", "+": "⁺", "-": "⁻", "−": "⁻", n: "ⁿ", i: "ⁱ",
};
const SUBSCRIPT: Readonly<Record<string, string>> = {
  "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆", "7": "₇",
  "8": "₈", "9": "₉", "+": "₊", "-": "₋", a: "ₐ", e: "ₑ", h: "ₕ", i: "ᵢ", j: "ⱼ",
  k: "ₖ", l: "ₗ", m: "ₘ", n: "ₙ", o: "ₒ", p: "ₚ", r: "ᵣ", s: "ₛ", t: "ₜ", u: "ᵤ",
  v: "ᵥ", x: "ₓ",
};

function script(body: string, table: Readonly<Record<string, string>>, marker: string): string {
  const chars = [...body];
  if (chars.length > 0 && chars.every((c) => c in table)) {
    return chars.map((c) => table[c]).join("");
  }
  return chars.length === 1 ? `${marker}${body}` : `${marker}(${body})`;
}

/** A fraction part keeps its meaning only if a compound numerator/denominator is bracketed. */
function part(s: string): string {
  const t = s.trim();
  // Bare only when it cannot be misread: a number, or ONE symbol with its sub/superscripts
  // (`Q`, `Rₚ`, `a₁`, `V²`). `2a` must stay `(2a)` — `-b/2a` reads as `(-b/2)·a`.
  return /^(?:[\p{N}.]+|\p{L}[₀-ₜᵢ-ᵪⱼ²³⁰-ⁿ]*)$/u.test(t)
    ? t
    : `(${t})`;
}

/** One `$…$` body → plain text. Innermost braces are resolved first, so nesting works. */
function latexToPlain(latex: string): string {
  let s = latex;
  // Spacing commands.
  s = s.replace(/\\[,;:!]|\\ /g, " ");
  s = s.replace(/\\([%{}$&#_])/g, "$1");
  // Known symbols FIRST, while every command is still delimited: resolving a fraction
  // first would glue `\rho\dfrac{l}{A}` into `\rhol/A` and lose the symbol.
  s = s.replace(/\\([A-Za-z]+)/g, (m, name: string) => SYMBOLS[name] ?? m);
  let prev: string;
  do {
    prev = s;
    // Single-token scripts first, so a fraction part like `R_p` is already `Rₚ`.
    s = s.replace(/\^([^\s{}\\])/g, (_m, a: string) => script(a, SUPERSCRIPT, "^"));
    s = s.replace(/_([^\s{}\\])/g, (_m, a: string) => script(a, SUBSCRIPT, "_"));
    s = s.replace(/\\[dt]?frac\{([^{}]*)\}\{([^{}]*)\}/g, (_m, a: string, b: string) =>
      `${part(a)}/${part(b)}`,
    );
    s = s.replace(/\\sqrt\{([^{}]*)\}/g, (_m, a: string) => `√${part(a)}`);
    s = s.replace(/\\bar\{([^{}]*)\}|\\overline\{([^{}]*)\}/g, (_m, a?: string, b?: string) =>
      `${a ?? b ?? ""}̄`,
    );
    s = s.replace(/\\(?:text|textbf|mathrm|mathbf|operatorname|textit)\{([^{}]*)\}/g, "$1");
    s = s.replace(/\^\{([^{}]*)\}/g, (_m, a: string) => script(a, SUPERSCRIPT, "^"));
    s = s.replace(/_\{([^{}]*)\}/g, (_m, a: string) => script(a, SUBSCRIPT, "_"));
  } while (s !== prev);
  s = s.replace(/\\sqrt\s*/g, "√");
  s = s.replace(/\\([A-Za-z]+)/g, (_m, name: string) => SYMBOLS[name] ?? name);
  s = s.replace(/[{}]/g, "");
  return s;
}

/**
 * A note-spec text field → plain, readable text. LaTeX is converted only INSIDE `$…$`
 * (prose outside math legitimately contains `_`/`^`-free text, and the only command that
 * appears outside `$` in the specs is `\textbf{…}`, handled explicitly).
 */
export function noteTextToPlain(text: string | null | undefined): string {
  if (!text) return "";
  let s = text.replace(INLINE_TAG_RE, "");
  s = s.replace(/&[a-zA-Z]+;|&#\d+;/g, (e) => {
    if (e in ENTITIES) return ENTITIES[e];
    const num = /^&#(\d+);$/.exec(e);
    return num ? String.fromCodePoint(Number(num[1])) : e;
  });
  s = s.replace(/\$([^$]+)\$/g, (_m, body: string) => latexToPlain(body));
  s = s.replace(/\\(?:textbf|text|textit)\{([^{}]*)\}/g, "$1");
  return s.replace(/\s+/g, " ").trim();
}

/* ── the section model ──────────────────────────────────────────────── */

export interface GlanceItem {
  label: string;
  text: string;
}

export interface ChapterAtAGlance {
  /** big_idea.tagline — omitted when the spec carries none. */
  lead: string;
  /** big_idea.body — omitted when the spec carries none. */
  summary: string;
  /** board_asks — the spec's own "what the board actually asks" sentence. */
  boardAsks: string;
  /** concepts[] title → `tested` (the real CBSE pattern, which carries the marks). */
  boardPatterns: GlanceItem[];
  /** formula_strip[] label → formula. */
  formulas: GlanceItem[];
  /** headline definitions: term → NCERT verbatim wording. */
  definitions: GlanceItem[];
}

function sentenceCase(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

export function buildChapterAtAGlance(spec: NoteSpec): ChapterAtAGlance {
  return {
    lead: noteTextToPlain(spec.big_idea?.tagline),
    summary: noteTextToPlain(spec.big_idea?.body),
    // The spec writes this as the tail of "What the board actually asks: …" (lower-case
    // start); here it sits under its own heading, so only its first letter is raised.
    boardAsks: sentenceCase(noteTextToPlain(spec.board_asks)),
    boardPatterns: spec.concepts
      .filter((c) => c.tested)
      .map((c) => ({ label: noteTextToPlain(c.title), text: noteTextToPlain(c.tested) })),
    formulas: spec.formula_strip.map((f) => ({
      label: noteTextToPlain(f.label),
      text: noteTextToPlain(f.math),
    })),
    definitions: spec.definitions
      .filter((d) => d.tier !== "key-term")
      .map((d) => ({ label: noteTextToPlain(d.term), text: noteTextToPlain(d.verbatim) })),
  };
}
