// ═════════════════════════════════════════════════════════════════════════════
// GUARD-3 (owner order 2026-10-07) — ROW RULES over every SERVED question row.
//
// Mode 3 in syllabusGuard.ts matches LABELS (subtopic / concept / row names) and the
// free text of notes, Hub and promptD stems. It never read a bank row's question text,
// options or solution. GUARD-3 does, for every SERVED row of the bank, HPQ and the
// predicted sets, with these rules (each cites the reference line it enforces):
//
//   G3-TEXT            OUT / FORMATIVE phrases (reference items + LABEL_VARIANTS free
//                      text + the TEXT_SYNONYMS table below) in question text, every
//                      option, answer, explanation, solution steps, final answer, hint.
//   G4-HD-ANGLE        heights & distances: an angle of elevation/depression not in
//                      {30, 45, 60} degrees.
//   G4-HD-TRIANGLES    heights & distances: more than two right triangles (REVIEW).
//   G4-SEGMENT-ANGLE   area of a SEGMENT: a central angle not in {60, 90, 120} degrees.
//   G4-BIMODAL         bimodal / multimodal data.
//   G4-R1-IRRATIONAL   irrationality proofs outside owner ruling R1.
//   G9-1MARK-OPTIONS   a served 1-mark bank row must have options (MCQ or A-R).
//
// A finding is a HIT (a breach) or a REVIEW (ambiguous: never silently passed).
// THE RATCHET (controller ruling G1): `syllabusGuard.baseline.json` lists today's real
// breaches with their owning lane; `syllabusGuard.reviewed.json` lists ambiguous
// findings a reviewer judged IN, each with a reason and evidence. The guard FAILS on
// any finding in neither file and on a listed entry that no longer matches (stale), so
// both lists can only shrink.
//
// Served = the app's own served set: the bank is RAW_CANONICAL_QUESTION_BANK minus
// WITHHELD_QUESTION_IDS (asserted equal in length to `canonicalQuestionBank`, the
// array the app reads); HPQ and predicted rows are served as exported.
// ═════════════════════════════════════════════════════════════════════════════

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import {
  EXCLUSION_STATEMENT,
  matchFreeText,
  normaliseLabel,
  referenceItems,
  type MatchTerm,
  type ReferenceItem,
  type SyllabusMatcher,
  type SyllabusReferenceLike,
} from "./syllabusGuard.js";

export const CONFIG_FILE = "lazytopper/src/config/syllabus2026-27.ts";

// ── Served rows ───────────────────────────────────────────────────────────────

export type RowSurface = "bank" | "hpq" | "predicted";
export type FieldRole = "question" | "option" | "solution";

export interface RowField {
  readonly field: string;
  readonly role: FieldRole;
  readonly text: string;
}

export interface ServedRow {
  readonly surface: RowSurface;
  readonly id: string;
  /** Board chapter key (`topicKey`), when the row carries or implies one. */
  readonly chapter?: string;
  readonly subject?: string;
  readonly marks?: number;
  readonly format?: string;
  readonly origin?: string;
  /** The raw `options` value (G9 reads it as-is). */
  readonly options?: unknown;
  readonly fields: readonly RowField[];
}

/** Every string inside a value (arrays and objects walked), with its path. */
function strings(v: unknown, path: string, out: { path: string; text: string }[]): void {
  if (typeof v === "string") {
    if (v.trim()) out.push({ path, text: v });
  } else if (Array.isArray(v)) {
    v.forEach((x, i) => strings(x, `${path}[${i}]`, out));
  } else if (v && typeof v === "object") {
    for (const [k, x] of Object.entries(v)) strings(x, `${path}.${k}`, out);
  }
}

/** Student-visible fields of a question row, by role (controller ruling G3). */
const QUESTION_KEYS = ["questionText", "question"] as const;
const OPTION_KEYS = ["options"] as const;
const SOLUTION_KEYS = ["answer", "explanation", "solutionSteps", "finalAnswer", "strategyHint"] as const;

export function rowFields(q: Record<string, unknown>): RowField[] {
  const out: RowField[] = [];
  const add = (keys: readonly string[], role: FieldRole) => {
    for (const k of keys) {
      const found: { path: string; text: string }[] = [];
      strings(q[k], k, found);
      for (const f of found) out.push({ field: f.path, role, text: f.text });
    }
  };
  add(QUESTION_KEYS, "question");
  add(OPTION_KEYS, "option");
  add(SOLUTION_KEYS, "solution");
  return out;
}

export interface RowSourcesLike {
  readonly rawBank: readonly unknown[];
  readonly withheldIds: ReadonlySet<string>;
  readonly hpq: readonly { topic: string; questions: readonly unknown[] }[];
  readonly predicted: readonly unknown[];
}

/** Map an HPQ bucket title ("Arithmetic Progressions") to a board chapter key, if one matches. */
export function chapterKeyForTitle(title: string, chapterKeys: Iterable<string>): string | undefined {
  const n = normaliseLabel(title.replace(/&/g, " and "));
  for (const k of chapterKeys) if (normaliseLabel(k.replace(/-/g, " ")) === n) return k;
  return undefined;
}

export function collectServedRows(src: RowSourcesLike, chapterKeys: Iterable<string>): ServedRow[] {
  const keys = [...chapterKeys];
  const rows: ServedRow[] = [];
  const base = (surface: RowSurface, q: Record<string, unknown>, chapter: string | undefined): ServedRow => ({
    surface,
    id: String(q.id),
    chapter,
    subject: typeof q.subject === "string" ? q.subject : undefined,
    marks: typeof q.marks === "number" ? q.marks : undefined,
    format: typeof q.format === "string" ? q.format : typeof q.kind === "string" ? q.kind : typeof q.type === "string" ? q.type : undefined,
    origin: typeof q.origin === "string" ? q.origin : undefined,
    options: q.options,
    fields: rowFields(q),
  });
  for (const raw of src.rawBank) {
    const q = raw as Record<string, unknown>;
    if (src.withheldIds.has(String(q.id))) continue; // withheld = not served = not a hit (G2)
    rows.push(base("bank", q, typeof q.topicKey === "string" ? q.topicKey : undefined));
  }
  for (const b of src.hpq) {
    const ch = chapterKeyForTitle(b.topic, keys);
    for (const raw of b.questions) rows.push(base("hpq", raw as Record<string, unknown>, ch));
  }
  for (const raw of src.predicted) {
    const q = raw as Record<string, unknown>;
    rows.push(base("predicted", q, typeof q.topicKey === "string" ? q.topicKey : undefined));
  }
  return rows;
}

// ── Findings ──────────────────────────────────────────────────────────────────

export type RuleId =
  | "G3-TEXT"
  | "G4-HD-ANGLE"
  | "G4-HD-TRIANGLES"
  | "G4-SEGMENT-ANGLE"
  | "G4-BIMODAL"
  | "G4-R1-IRRATIONAL"
  | "G9-1MARK-OPTIONS";

export interface RowFinding {
  readonly rule: RuleId;
  readonly verdict: "hit" | "review";
  readonly surface: RowSurface;
  readonly rowId: string;
  readonly chapter?: string;
  /** Stable identity of WHAT matched (term + reference item, angle set, ...). Part of the ratchet key. */
  readonly matched: string;
  readonly fields: readonly string[];
  /** A short excerpt of the matching text (for the report; not part of the key). */
  readonly text: string;
}

export function findingKey(f: { rule: string; surface: string; rowId: string; matched: string }): string {
  return `${f.rule}|${f.surface}|${f.rowId}|${f.matched}`;
}

export interface RuleContext {
  /** The G3 text matcher: the Mode-3 matcher with TEXT_SYNONYMS added to its free-text phrases. */
  readonly textMatcher: SyllabusMatcher;
}

export interface RowRule {
  readonly id: RuleId;
  /** `<file>:<line>` of the reference text this rule enforces (pinned by a test). */
  readonly cite: string;
  /** A fragment that must appear on the cited line (pinned by a test). */
  readonly citeQuote: string;
  readonly run: (row: ServedRow, ctx: RuleContext) => Omit<RowFinding, "rule" | "surface" | "rowId" | "chapter">[];
}

const excerpt = (s: string, n = 160) => s.replace(/\s+/g, " ").trim().slice(0, n);

/** Sentences of a text (the same split Mode 3 uses, plus ";"). */
function sentences(text: string): string[] {
  return text
    .replace(/<[^>]+>/g, " ")
    .split(/(?<=[.!?;])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// ── G3: TEXT_SYNONYMS ─────────────────────────────────────────────────────────
// Phrase variants the served TEXT uses for a reference OUT / FORMATIVE item. NOT a second
// syllabus: each entry names the reference item (chapter key + kind + the start of its
// text, or a whole OUT / FORMATIVE chapter), and an entry that no longer resolves to
// exactly one reference item is an ERROR at load (it cannot rot silently). Phrases are
// matched normalised, whole-word, sentence by sentence, and a sentence that states the
// content is excluded is skipped (Mode 3's EXCLUSION_STATEMENT). Single words are not
// allowed: "frustum", "ogive", "biogas" alone would hit prose; multi-word forms only.
// The config line each entry cites is the item's line in lazytopper/src/config/syllabus2026-27.ts.

export interface TextSynonymEntry {
  readonly key: string;
  readonly kind: "out" | "formative" | "chapter";
  /** Start of the reference item text (omit for kind "chapter"). */
  readonly itemStartsWith?: string;
  readonly phrases: readonly string[];
  /** As LABEL_VARIANTS.chapterScoped: do not fire on a row known to sit in another board chapter. */
  readonly chapterScoped?: boolean;
}

export const TEXT_SYNONYMS: readonly TextSynonymEntry[] = [
  // config item: real-numbers out[0] Euclid's division lemma / division algorithm
  { key: "real-numbers", kind: "out", itemStartsWith: "Euclid's division lemma",
    phrases: ["euclid's division", "euclid's algorithm", "euclid division algorithm", "euclids division"] },
  // config item: real-numbers out[1] decimal expansions of rational numbers
  { key: "real-numbers", kind: "out", itemStartsWith: "Decimal expansions of rational numbers",
    phrases: ["terminating decimal expansion", "non-terminating repeating decimal", "non terminating recurring decimal",
      "terminating decimal representation"] },
  // config item: real-numbers out[2] irrationality for a general prime p (R1)
  { key: "real-numbers", kind: "out", itemStartsWith: "Irrationality statements or proofs for a general prime",
    phrases: ["square root of a prime number is irrational", "root of any prime", "for every prime number p",
      "for any prime number p"] },
  // config item: polynomials out[1] division algorithm for polynomials
  { key: "polynomials", kind: "out", itemStartsWith: "Division algorithm for polynomials",
    // ("on dividing" is NOT a variant: the remainder-theorem wording of official CFPQ rows uses it.)
    phrases: ["divide the polynomial", "dividing the polynomial", "polynomial long division",
      "dividend divisor quotient", "by long division"] },
  // config item: polynomials out[0] cubic zero-coefficient relationship
  { key: "polynomials", kind: "out", itemStartsWith: "Zero–coefficient relationship for CUBIC",
    phrases: ["zeroes of the cubic polynomial", "zeros of the cubic polynomial", "zeroes of a cubic polynomial",
      "zeros of a cubic polynomial"] },
  // config item: pair-of-linear-equations out[0] cross-multiplication
  { key: "pair-of-linear-equations", kind: "out", itemStartsWith: "Cross-multiplication method",
    phrases: ["cross-multiplication", "method of cross multiplication"] },
  // config item: pair-of-linear-equations out[1] equations reducible to linear form
  { key: "pair-of-linear-equations", kind: "out", itemStartsWith: "Equations reducible to a pair of linear equations",
    phrases: ["reducible to linear", "reduce to a pair of linear equations"] },
  // config item: quadratic-equations out[0] completing the square
  { key: "quadratic-equations", kind: "out", itemStartsWith: "Solving by completing the square",
    phrases: ["completing the square", "complete the square", "method of completing square"] },
  // config item: coordinate-geometry out[1] external division
  { key: "coordinate-geometry", kind: "out", itemStartsWith: "Section formula — external division",
    phrases: ["divides externally", "externally in the ratio", "external division"] },
  // config item: coordinate-geometry out[0] area of a triangle from coordinates (chapter-scoped, as its LABEL_VARIANTS entry)
  { key: "coordinate-geometry", kind: "out", itemStartsWith: "Area of a triangle from coordinates",
    phrases: ["area of the triangle formed by the points", "area of triangle formed by the points",
      "area of the triangle with vertices", "area of triangle with vertices"],
    chapterScoped: true },
  // config item: triangles out[0] ratio of areas of similar triangles
  { key: "triangles", kind: "out", itemStartsWith: "Ratio of areas of similar triangles",
    phrases: ["areas of two similar triangles", "ratio of areas of similar triangles", "ratio of the areas of similar triangles",
      "areas of similar triangles"] },
  // config item: triangles out[1] Pythagoras theorem and its converse as Triangles content / proofs (chapter-scoped)
  { key: "triangles", kind: "out", itemStartsWith: "Pythagoras theorem and its converse",
    phrases: ["square of the hypotenuse is equal to the sum of the squares", "prove the pythagoras theorem",
      "state and prove pythagoras"],
    chapterScoped: true },
  // config item: circles out[0] Constructions. Chapter-scoped: "divides the line segment in the ratio" is the
  // IN section formula in Coordinate Geometry (PYQ-M-2024-CG-003).
  { key: "circles", kind: "out", itemStartsWith: "Constructions",
    phrases: ["construct a pair of tangents", "draw a pair of tangents", "construct a triangle similar to",
      "steps of construction", "construct a tangent to a circle", "divide a line segment in the ratio"],
    chapterScoped: true },
  // config item: trigonometry out[0] trigonometric ratios of complementary angles
  { key: "trigonometry", kind: "out", itemStartsWith: "Trigonometric ratios of complementary angles",
    phrases: ["ratios of complementary angles", "complementary angle identities"] },
  // config item: surface-areas-and-volumes out[0] frustum
  { key: "surface-areas-and-volumes", kind: "out", itemStartsWith: "Frustum of a cone",
    phrases: ["frustum of a cone", "frustum of cone", "form of a frustum", "shape of a frustum", "frustum shaped"] },
  // config item: surface-areas-and-volumes out[1] conversion of solids (chapter-scoped, as its LABEL_VARIANTS entry)
  { key: "surface-areas-and-volumes", kind: "out", itemStartsWith: "Conversion of one solid into another",
    phrases: ["melted and made into", "melted and cast", "melted down", "is melted and", "are melted and", "recast as"],
    chapterScoped: true },
  // config item: statistics out[0] ogive
  { key: "statistics", kind: "out", itemStartsWith: "Graphical representation of cumulative frequency",
    phrases: ["less than ogive", "more than ogive", "draw an ogive", "draw the ogive", "using the ogive", "from the ogive",
      "ogive curve", "less than type ogive", "more than type ogive"] },
  // config item: light out[0] derivation of the mirror / lens formula
  { key: "light-reflection-and-refraction", kind: "out", itemStartsWith: "Derivation of the mirror formula",
    phrases: ["derive the mirror formula", "derive mirror formula", "derive the lens formula", "derive lens formula",
      "derivation of the mirror formula", "derivation of the lens formula"] },
  // config item: light out[1] beyond-Class-X optics
  { key: "light-reflection-and-refraction", kind: "out", itemStartsWith: "Beyond-Class-X optics",
    phrases: ["total internal reflection", "lens maker's formula", "lensmaker's formula", "angle of minimum deviation"] },
  // config item: heredity formative[0] Evolution
  { key: "heredity", kind: "formative", itemStartsWith: "Evolution",
    phrases: ["theory of evolution", "acquired traits", "acquired characters", "genetic drift", "evolutionary relationships",
      "human evolution", "origin of species", "evolution by stages", "evidence of evolution"] },
  // config item: magnetic-effects formative[0] motor / EMI / generator
  { key: "magnetic-effects-of-electric-current", kind: "formative", itemStartsWith: "Electric motor",
    phrases: ["induced current", "induced emf", "ac generator", "dc generator", "principle of electric motor",
      "working of an electric motor", "split ring commutator", "fleming's right-hand rule"] },
  // config item: periodic-classification-of-elements (whole FORMATIVE chapter; item formative[0])
  { key: "periodic-classification-of-elements", kind: "formative", itemStartsWith: "Döbereiner's Triads",
    phrases: ["dobereiner's triads", "law of octaves", "newlands' law", "mendeleev's periodic table", "mendeleev's periodic law",
      "modern periodic law", "modern periodic table"] },
  // config item: sources-of-energy (whole OUT chapter). NOT variants: "solar cooker" (a concave-mirror
  // application, IN in Light: LT-H08, LTG-S-LIGHT-101) and "biogas plant" (waste disposal, IN in Our
  // Environment: SCQ-S-ENV-035).
  { key: "sources-of-energy", kind: "chapter",
    phrases: ["solar cell", "tidal energy", "geothermal energy", "ocean thermal energy",
      "wave energy", "nuclear fission", "nuclear power plant", "wind energy", "hydro power plant", "hydroelectric power plant",
      "non-conventional sources of energy", "conventional sources of energy", "renewable sources of energy"] },
  // config item: management-of-natural-resources (whole OUT chapter)
  { key: "management-of-natural-resources", kind: "chapter",
    phrases: ["rainwater harvesting", "chipko movement", "chipko andolan", "ganga action plan", "water harvesting", "sardar sarovar",
      "management of natural resources", "amrita devi bishnoi", "arabari forest"] },
];

/** Resolve TEXT_SYNONYMS into free-text MatchTerms; any unresolved entry is an error. */
export function synonymTerms(
  entries: readonly TextSynonymEntry[],
  items: readonly ReferenceItem[],
): { terms: MatchTerm[]; errors: string[] } {
  const terms: MatchTerm[] = [];
  const errors: string[] = [];
  for (const e of entries) {
    const hits =
      e.kind === "chapter"
        ? items.filter((i) => i.kind === "chapter" && i.key === e.key)
        : items.filter(
            (i) => i.key === e.key && i.kind === e.kind && i.item.toLowerCase().startsWith((e.itemStartsWith ?? "").toLowerCase()),
          );
    if (hits.length !== 1) {
      errors.push(`TEXT_SYNONYMS entry ${e.key}/${e.kind} "${e.itemStartsWith ?? ""}" resolves to ${hits.length} reference items (must be exactly 1).`);
      continue;
    }
    for (const p of e.phrases) {
      const term = normaliseLabel(p);
      if (!term.includes(" ")) {
        errors.push(`TEXT_SYNONYMS phrase "${p}" must be multi-word.`);
        continue;
      }
      terms.push({
        term,
        mode: "contains",
        itemId: hits[0].id,
        item: hits[0].item,
        source: "variant",
        ...(e.chapterScoped ? { scopeKey: e.key } : {}),
      });
    }
  }
  return { terms, errors };
}

/** The G3 matcher: Mode 3's matcher plus TEXT_SYNONYMS. Throws if a synonym has rotted. */
export function buildTextMatcher(base: SyllabusMatcher, synonyms: readonly TextSynonymEntry[] = TEXT_SYNONYMS): SyllabusMatcher {
  const { terms, errors } = synonymTerms(synonyms, base.items);
  if (errors.length > 0) throw new Error(`syllabusGuard (GUARD-3): ${errors.join(" ")}`);
  const seen = new Set(base.textPhrases.map((t) => `${t.term}|${t.itemId}`));
  const extra = terms.filter((t) => !seen.has(`${t.term}|${t.itemId}`));
  // A chapter-scoped synonym makes its item scoped for its own phrases only (Mode 3 is untouched).
  return { ...base, textPhrases: [...base.textPhrases, ...extra] };
}

// ── G3 rule ───────────────────────────────────────────────────────────────────

const ruleText: RowRule = {
  id: "G3-TEXT",
  // Every OUT / FORMATIVE item of the typed reference (its `out` / `formative` lists and whole
  // OUT / FORMATIVE chapters), read through referenceItems(); the export starts here.
  cite: `${CONFIG_FILE}:123`,
  citeQuote: "export const SYLLABUS_2026_27 = {",
  run: (row, ctx) => {
    const byKey = new Map<string, { matched: string; fields: string[]; text: string }>();
    for (const f of row.fields) {
      for (const h of matchFreeText(f.text, ctx.textMatcher, row.chapter)) {
        const matched = `${h.term.itemId}: "${h.term.term}"`;
        const cur = byKey.get(matched);
        if (cur) {
          if (!cur.fields.includes(f.field)) cur.fields.push(f.field);
        } else {
          byKey.set(matched, { matched, fields: [f.field], text: excerpt(h.sentence) });
        }
      }
    }
    const key = keyOptionField(row);
    return [...byKey.values()].map((v) => {
      // A phrase that appears ONLY in options, none of them the key, is a distractor naming the term:
      // it does not teach it, but it is not silently passed either (REVIEW).
      const optionsOnly = v.fields.every((x) => x.startsWith("options["));
      const verdict = optionsOnly && !(key && v.fields.includes(key)) ? ("review" as const) : ("hit" as const);
      return { verdict, ...v };
    });
  },
};

/** The key option's field ("options[2]"), from a letter answer ("B", "(b)") or an answer equal to an option. */
export function keyOptionField(row: ServedRow): string | undefined {
  if (!Array.isArray(row.options)) return undefined;
  const opts = row.options as unknown[];
  const answers = row.fields.filter((f) => f.field === "answer" || f.field === "finalAnswer").map((f) => f.text.trim());
  for (const a of answers) {
    const letter = a.match(/^\(?([A-Da-d])\)?(?:[.):\s]|$)/);
    if (letter) return `options[${letter[1].toUpperCase().charCodeAt(0) - 65}]`;
    const i = opts.findIndex((o) => typeof o === "string" && o.trim().toLowerCase() === a.toLowerCase());
    if (i >= 0) return `options[${i}]`;
  }
  return undefined;
}

// ── G4: computable limits ─────────────────────────────────────────────────────

/** Angles written in degrees: 30°, 30 °, 30º, 30˚, 30^\circ, 30^{\circ}, 30\degree, 30 degrees. */
const DEGREE = /(?<![\d.])(\d{1,3}(?:\.\d+)?)\s*(?:°|º|˚|\^\s*\{?\s*\\circ\s*\}?|\\degree\b|degrees?\b|deg\b)/gi;

export function anglesIn(text: string): number[] {
  const out: number[] = [];
  for (const m of text.matchAll(DEGREE)) out.push(Number(m[1]));
  return out;
}

const HD_CUE = /\b(?:angles?\s+of\s+(?:elevation|depression)|elevation|depression)\b/i;
const HD_ALLOWED = new Set([30, 45, 60]);
/** Not an angle of elevation/depression: the right angle of the triangle, a straight line, a full turn. */
const HD_NEUTRAL = new Set([0, 90, 180, 360]);

function questionText(row: ServedRow): string {
  return row.fields.filter((f) => f.role === "question").map((f) => f.text).join("\n");
}

const ruleHdAngle: RowRule = {
  id: "G4-HD-ANGLE",
  cite: `${CONFIG_FILE}:706`,
  citeQuote: "Angles of elevation / depression should be only 30°, 45°, and 60°.",
  run: (row) => {
    const q = questionText(row);
    if (!HD_CUE.test(q)) return [];
    const hit = new Set<number>();
    const review = new Set<number>();
    let hitText = "";
    let reviewText = "";
    for (const s of sentences(q)) {
      // "increases by 15°" is a CHANGE of angle, not an angle of elevation (30° + 15° = 45°): REVIEW.
      const changes = new Set(anglesIn(s.match(/\b(?:increases?|decreases?|changes?|increased|decreased|changed)\s+by\s+[^,;.]*/gi)?.join(" ") ?? ""));
      const bad = anglesIn(s).filter((a) => !HD_ALLOWED.has(a) && !HD_NEUTRAL.has(a));
      if (bad.length === 0) continue;
      if (HD_CUE.test(s) && bad.some((a) => !changes.has(a))) {
        bad.forEach((a) => hit.add(a));
        hitText ||= s;
      } else {
        bad.forEach((a) => review.add(a));
        reviewText ||= s;
      }
    }
    const out: ReturnType<RowRule["run"]> = [];
    const fmt = (s: Set<number>) => [...s].sort((a, b) => a - b).map((a) => `${a}°`).join(",");
    // An elevation/depression sentence with an angle outside {30,45,60} is a breach. A non-standard
    // angle elsewhere in a heights-and-distances question may or may not be one: REVIEW.
    if (hit.size) out.push({ verdict: "hit", matched: `elevation/depression angle ${fmt(hit)}`, fields: ["questionText"], text: excerpt(hitText) });
    if (review.size) out.push({ verdict: "review", matched: `other angle in a heights-and-distances question ${fmt(review)}`, fields: ["questionText"], text: excerpt(reviewText) });
    return out;
  },
};

const MORE_THAN_TWO = /\b(?:three|3|four|4)\s+(?:right[- ]angled\s+|right\s+)?(?:triangles|points|positions|observers|towers|buildings|stations|poles|boats|ships)\b/i;

const ruleHdTriangles: RowRule = {
  id: "G4-HD-TRIANGLES",
  cite: `${CONFIG_FILE}:701`,
  citeQuote: "Problems should not involve more than two right triangles.",
  run: (row) => {
    const q = questionText(row);
    if (!HD_CUE.test(q)) return [];
    // Detectable proxies (REVIEW, never a silent pass): three or more angles of elevation/depression,
    // or a count of three or more observation points / objects.
    let count = 0;
    for (const s of sentences(q)) if (HD_CUE.test(s)) count += anglesIn(s).filter((a) => !HD_NEUTRAL.has(a)).length;
    const m = q.match(MORE_THAN_TWO);
    if (count >= 3) return [{ verdict: "review", matched: `${count} elevation/depression angles`, fields: ["questionText"], text: excerpt(q) }];
    if (m) return [{ verdict: "review", matched: `"${m[0].toLowerCase()}"`, fields: ["questionText"], text: excerpt(q) }];
    return [];
  },
};

const SEGMENT_CUE =
  /\b(?:minor|major)\s+segments?\b|\bsegments?\s+of\s+(?:a|the)\s+circle\b|\b(?:area|areas)\s+of\s+(?:the\s+|a\s+|each\s+|corresponding\s+)*(?:minor\s+|major\s+)?segments?\b|\bsegment\s+area\b/i;
const SECTOR_CUE = /\bsectors?\b|\bquadrants?\b/i;
const SEGMENT_ALLOWED = new Set([60, 90, 120]);
/** 360 is the θ/360 of the formula; 180 is a semicircle / straight angle, not a segment's central angle. */
const SEGMENT_NEUTRAL = new Set([180, 360]);

const ruleSegmentAngle: RowRule = {
  id: "G4-SEGMENT-ANGLE",
  cite: `${CONFIG_FILE}:758`,
  citeQuote: "problems should be restricted to central angle of 60°, 90° and 120° only",
  run: (row) => {
    if (row.chapter !== undefined && row.chapter !== "areas-related-to-circles") return [];
    const q = row.fields.filter((f) => f.role !== "solution").map((f) => f.text).join("\n");
    const qOnly = questionText(row);
    if (!SEGMENT_CUE.test(qOnly)) return [];
    const bad = [...new Set(anglesIn(qOnly).filter((a) => !SEGMENT_ALLOWED.has(a) && !SEGMENT_NEUTRAL.has(a)))].sort((a, b) => a - b);
    if (bad.length === 0) return [];
    const matched = `angle ${bad.map((a) => `${a}°`).join(",")}`;
    // The limit is on SEGMENTS only (the reference: "sector area has no angle limit"). A question that
    // also has a sector may give that angle to the sector: REVIEW. Segment-only: a breach.
    const verdict = SECTOR_CUE.test(q) ? ("review" as const) : ("hit" as const);
    return [{ verdict, matched: verdict === "hit" ? `segment central ${matched}` : `segment/sector question ${matched}`, fields: ["questionText"], text: excerpt(qOnly) }];
  },
};

const BIMODAL = /\b(?:bi-?modal|tri-?modal|multi-?modal)\b|\btwo\s+modes\b|\bmore\s+than\s+one\s+mode\b|\btwo\s+modal\s+classes\b/i;

const ruleBimodal: RowRule = {
  id: "G4-BIMODAL",
  cite: `${CONFIG_FILE}:844`,
  citeQuote: "bimodal situation to be avoided",
  run: (row) => {
    // Statistics only ("two modes of asexual reproduction" is Biology: PYQ-S-REPR-004).
    if (row.chapter !== undefined && row.chapter !== "statistics") return [];
    const fields: string[] = [];
    let text = "";
    let posed = false;
    for (const f of row.fields) {
      for (const s of sentences(f.text)) {
        if (!BIMODAL.test(s) || EXCLUSION_STATEMENT.test(s) || /\bavoid/i.test(s)) continue;
        if (!fields.includes(f.field)) fields.push(f.field);
        if (f.role !== "solution") posed = true;
        text ||= s;
      }
    }
    if (!fields.length) return [];
    // Bimodal data in the question or options is a breach; a passing mention in a solution only: REVIEW.
    return [{ verdict: posed ? "hit" : "review", matched: "bimodal/multimodal data", fields, text: excerpt(text) }];
  },
};

// ── G4: R1 irrationality ──────────────────────────────────────────────────────
// R1 (syllabus2026-27.ts l.264-266, IN): same-method proofs for √(named prime) and expressions built
// from such surds; √6 only as a GIVEN surd inside such an expression proof. R1 (l.281-284, OUT): a
// general prime p ("√p for any prime p", "√p + √q", "the square root of every prime is irrational")
// and from-scratch proofs for composite surds ("prove √15 irrational").

const RADICAND = [
  /√\s*\(?\s*(\d+|[a-zA-Z])(?![\da-zA-Z])/g,
  /\\sqrt\s*\{\s*(\d+|[a-zA-Z])\s*\}/g,
  /\\sqrt\s*(\d+)/g,
  /\bsquare\s+root\s+of\s+(\d+|[a-zA-Z])\b/gi,
];
const PROOF_CUE = /\b(?:prove|proved|proving|show|shown|proof|establish|demonstrate)\b/i;
const GENERAL_PRIME = /\b(?:every|any|all|each)\s+primes?\b|\bprime\s+(?:number\s+)?p\b|\bp\s+is\s+(?:a\s+)?prime\b|\bprimes?\s+p\s*(?:,|and)\s*q\b/i;

function radicands(s: string): string[] {
  const out: string[] = [];
  for (const re of RADICAND) for (const m of s.matchAll(re)) out.push(m[1]);
  return out;
}
function isPrime(n: number): boolean {
  if (n < 2 || !Number.isInteger(n)) return false;
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
  return true;
}
const isSquare = (n: number) => Number.isInteger(Math.sqrt(n));

export function givenSurd(text: string, n: string): boolean {
  const surd = `(?:√\\s*\\(?\\s*${n}(?!\\d)|\\\\sqrt\\s*\\{?\\s*${n}(?!\\d)|square\\s+root\\s+of\\s+${n}(?!\\d))`;
  return new RegExp(`\\b(?:given|assum\\w*|use|using)\\b[^.]{0,40}?${surd}[^.]{0,30}?\\birrational\\b`, "i").test(text);
}

const ruleR1: RowRule = {
  id: "G4-R1-IRRATIONAL",
  cite: `${CONFIG_FILE}:281`,
  citeQuote: "prove √15 irrational",
  run: (row) => {
    if (row.chapter !== undefined && row.chapter !== "real-numbers") return [];
    const q = questionText(row);
    if (!/irrational/i.test(q)) return [];
    const out: ReturnType<RowRule["run"]> = [];
    const seen = new Set<string>();
    const push = (verdict: "hit" | "review", matched: string, s: string) => {
      if (seen.has(matched)) return;
      seen.add(matched);
      out.push({ verdict, matched, fields: ["questionText"], text: excerpt(s) });
    };
    for (const s of sentences(q)) {
      if (!/irrational/i.test(s)) continue;
      if (GENERAL_PRIME.test(s)) {
        push("hit", "general prime p", s);
        continue;
      }
      const rs = radicands(s);
      const letters = rs.filter((r) => /^[a-zA-Z]$/.test(r));
      if (letters.some((l) => l === "p" || l === "q")) push("hit", "general prime p", s);
      else if (letters.length > 0 && PROOF_CUE.test(s)) push("review", `letter surd √${letters[0]}`, s);
      if (!PROOF_CUE.test(s)) continue; // a statement / classification, not a proof (see the R1 text)
      const nums = [...new Set(rs.filter((r) => /^\d+$/.test(r)).map(Number))].filter((n) => !isSquare(n));
      for (const n of nums) {
        if (isPrime(n)) continue;
        if (givenSurd(q, String(n))) continue; // e.g. "given √6 is irrational" (R1, 2024 30/5/1 Q26(b))
        push("hit", `composite surd √${n}`, s);
      }
      const primes = nums.filter(isPrime);
      if (primes.length >= 2 && !nums.some((n) => !isPrime(n))) push("review", `two prime surds √${primes.join(", √")}`, s);
    }
    return out;
  },
};

// ── G9: 1-mark rows must have options ─────────────────────────────────────────

/** Assertion–Reason, detected by the row's own format field or its stem ("Assertion (A): …"). */
export function isAssertionReason(row: ServedRow): boolean {
  if (row.format && /assertion/i.test(row.format)) return true;
  return /^\s*Assertion\s*\(A\)/i.test(questionText(row));
}

const ruleOneMarkOptions: RowRule = {
  id: "G9-1MARK-OPTIONS",
  cite: "Desktop/diff/COORD/BOARD.md 2026-10-07T03:17Z (owner ruling: every 1-mark question is an MCQ or assertion-reason)",
  citeQuote: "",
  run: (row) => {
    // The served BANK only: its row contract carries `options`. HPQ rows carry their options inside
    // the stem and A-R choices are drawn by the HPQ page; predicted rows are reported separately.
    if (row.surface !== "bank" || row.marks !== 1) return [];
    if (Array.isArray(row.options) && row.options.length > 0) return [];
    const kind = isAssertionReason(row) ? "A-R" : row.format ?? "unknown";
    return [{ verdict: "hit", matched: `1-mark ${kind} row with no options`, fields: ["options"], text: excerpt(questionText(row), 100) }];
  },
};

/** Every row rule. One per line, so a mutation can disable exactly one. */
export const ROW_RULES: readonly RowRule[] = [
  ruleText, // G3-TEXT
  ruleHdAngle, // G4-HD-ANGLE
  ruleHdTriangles, // G4-HD-TRIANGLES
  ruleSegmentAngle, // G4-SEGMENT-ANGLE
  ruleBimodal, // G4-BIMODAL
  ruleR1, // G4-R1-IRRATIONAL
  ruleOneMarkOptions, // G9-1MARK-OPTIONS
];

export function scanRows(rows: readonly ServedRow[], ctx: RuleContext, rules: readonly RowRule[] = ROW_RULES): RowFinding[] {
  const out: RowFinding[] = [];
  for (const row of rows) {
    for (const r of rules) {
      for (const f of r.run(row, ctx)) {
        out.push({ rule: r.id, surface: row.surface, rowId: row.id, ...(row.chapter ? { chapter: row.chapter } : {}), ...f });
      }
    }
  }
  return out;
}

// ── The ratchet (controller ruling G1) ────────────────────────────────────────

export interface BaselineEntry {
  readonly rule: RuleId;
  readonly surface: RowSurface;
  readonly rowId: string;
  readonly matched: string;
  readonly file: string;
  readonly lane: "C1" | "C2" | "C3";
  readonly fu: string;
  readonly fields?: readonly string[];
  readonly text?: string;
}
export interface ReviewedEntry {
  readonly rule: RuleId;
  readonly surface: RowSurface;
  readonly rowId: string;
  readonly matched: string;
  readonly reason: string;
  readonly evidence: string;
}
export interface RatchetFiles {
  readonly baseline: readonly BaselineEntry[];
  readonly reviewed: readonly ReviewedEntry[];
}

export interface RatchetResult {
  /** Findings in neither list: FAIL. */
  readonly unlisted: RowFinding[];
  /** Baseline entries no finding matches any more: FAIL (remove them; the list only shrinks). */
  readonly staleBaseline: BaselineEntry[];
  /** Reviewed entries no finding matches any more: FAIL. */
  readonly staleReviewed: ReviewedEntry[];
  readonly baselined: RowFinding[];
  readonly reviewed: RowFinding[];
  /** Malformed list entries (missing reason / evidence / lane, duplicates): FAIL. */
  readonly errors: string[];
}

export function applyRatchet(findings: readonly RowFinding[], files: RatchetFiles): RatchetResult {
  const errors: string[] = [];
  const base = new Map<string, BaselineEntry>();
  for (const e of files.baseline) {
    const k = findingKey(e);
    if (base.has(k)) errors.push(`baseline: duplicate entry ${k}`);
    if (!e.lane || !e.fu || !e.file) errors.push(`baseline: entry ${k} needs file, lane and fu`);
    base.set(k, e);
  }
  const rev = new Map<string, ReviewedEntry>();
  for (const e of files.reviewed) {
    const k = findingKey(e);
    if (rev.has(k)) errors.push(`reviewed: duplicate entry ${k}`);
    if (!e.reason?.trim() || !e.evidence?.trim()) errors.push(`reviewed: entry ${k} needs a reason and an evidence citation`);
    if (base.has(k)) errors.push(`entry ${k} is in BOTH the baseline and the reviewed list`);
    rev.set(k, e);
  }
  const unlisted: RowFinding[] = [];
  const baselined: RowFinding[] = [];
  const reviewed: RowFinding[] = [];
  const usedBase = new Set<string>();
  const usedRev = new Set<string>();
  for (const f of findings) {
    const k = findingKey(f);
    if (base.has(k)) {
      baselined.push(f);
      usedBase.add(k);
    } else if (rev.has(k)) {
      reviewed.push(f);
      usedRev.add(k);
    } else {
      unlisted.push(f);
    }
  }
  return {
    unlisted,
    staleBaseline: [...base.entries()].filter(([k]) => !usedBase.has(k)).map(([, e]) => e),
    staleReviewed: [...rev.entries()].filter(([k]) => !usedRev.has(k)).map(([, e]) => e),
    baselined,
    reviewed,
    errors,
  };
}

export const BASELINE_FILE = join(import.meta.dirname, "syllabusGuard.baseline.json");
export const REVIEWED_FILE = join(import.meta.dirname, "syllabusGuard.reviewed.json");

export function loadRatchetFiles(baselineFile = BASELINE_FILE, reviewedFile = REVIEWED_FILE): RatchetFiles {
  const b = JSON.parse(readFileSync(baselineFile, "utf-8")) as { entries: BaselineEntry[] };
  const r = JSON.parse(readFileSync(reviewedFile, "utf-8")) as { entries: ReviewedEntry[] };
  return { baseline: b.entries, reviewed: r.entries };
}

// ── Lanes (for the baseline) ──────────────────────────────────────────────────

/** C2 builds these 7 Maths chapters (CI-1 DEC-15, BOARD.md 2026-10-07T02:47Z); C3 the other 6. */
export const C2_MATHS_CHAPTERS = new Set([
  "real-numbers", "surface-areas-and-volumes", "arithmetic-progression", "circles", "areas-related-to-circles",
  "probability", "polynomials",
]);

/** Owning lane: C1 for official / BANK-FIX rows (and every G9 row); generated rows by subject + chapter. */
export function laneFor(f: RowFinding, row: Pick<ServedRow, "origin" | "subject" | "chapter"> | undefined): "C1" | "C2" | "C3" {
  if (f.rule === "G9-1MARK-OPTIONS") return "C1";
  if (!row || row.origin !== "lt-generated") return "C1";
  if (row.subject && /sci/i.test(row.subject)) return "C2";
  return row.chapter && C2_MATHS_CHAPTERS.has(row.chapter) ? "C2" : "C3";
}

export const FU_FOR_RULE: Record<RuleId, string> = {
  "G3-TEXT": "FU-GUARD3-TEXT-OUT",
  "G4-HD-ANGLE": "FU-GUARD3-HD-ANGLE",
  "G4-HD-TRIANGLES": "FU-GUARD3-HD-TRIANGLES",
  "G4-SEGMENT-ANGLE": "FU-GUARD3-SEGMENT-ANGLE",
  "G4-BIMODAL": "FU-GUARD3-BIMODAL",
  "G4-R1-IRRATIONAL": "FU-GUARD3-R1-IRRATIONAL",
  "G9-1MARK-OPTIONS": "FU-1MARK-MCQ",
};

// ── Row id → source file (for reports and the baseline) ──────────────────────

/** Index `id: "<x>"` declarations under the given directories (repo-relative paths). */
export function indexRowFiles(repoRoot: string, dirs: readonly string[]): Map<string, string> {
  const idx = new Map<string, string>();
  // `id:` or `questionId:` (pack rows whose id is derived from questionId); generated indexes skipped.
  const ID = /["']?\b(?:id|questionId)["']?\s*:\s*(["'`])((?:\\[\s\S]|(?!\1)[^\\\n])*)\1/g;
  const walk = (abs: string) => {
    for (const name of readdirSync(abs)) {
      const p = join(abs, name);
      if (statSync(p).isDirectory()) {
        if (name !== "bankChapters") walk(p);
      } else if (/\.(ts|json)$/.test(name) && !/\.test\.ts$/.test(name)) {
        const text = readFileSync(p, "utf-8");
        for (const m of text.matchAll(ID)) if (!idx.has(m[2])) idx.set(m[2], relative(repoRoot, p).replace(/\\/g, "/"));
      }
    }
  };
  for (const d of dirs) walk(join(repoRoot, d));
  return idx;
}

/** Reference shape with limits (for the load-time check that each G4 rule's limit still exists). */
export interface ReferenceWithLimits extends SyllabusReferenceLike {
  readonly maths: { readonly chapters: readonly (SyllabusReferenceLike["maths"]["chapters"][number] & { limits: readonly { rule: string; quote?: string }[] })[] };
}

/** Each G4 limit must still be in the reference; a missing one is an error (the rule cannot rot). */
export function checkLimitsPresent(ref: SyllabusReferenceLike): string[] {
  const r = ref as ReferenceWithLimits;
  const want: [string, string][] = [
    ["trigonometry", "Angles of elevation / depression should be only 30°, 45°, and 60°."],
    ["trigonometry", "Problems should not involve more than two right triangles."],
    ["areas-related-to-circles", "restricted to central angle of 60°, 90° and 120° only"],
    ["statistics", "bimodal situation to be avoided"],
  ];
  const errors: string[] = [];
  for (const [key, quote] of want) {
    const ch = r.maths.chapters.find((c) => c.key === key);
    if (!ch || !(ch.limits ?? []).some((l) => (l.quote ?? "").includes(quote))) {
      errors.push(`GUARD-3: limit "${quote}" is no longer in ${key}.limits of the reference.`);
    }
  }
  const r1 = referenceItems(ref).find((i) => i.key === "real-numbers" && i.item.startsWith("Irrationality statements or proofs for a general prime"));
  if (!r1) errors.push("GUARD-3: the R1 OUT item (general prime / composite surds) is no longer in the reference.");
  return errors;
}
