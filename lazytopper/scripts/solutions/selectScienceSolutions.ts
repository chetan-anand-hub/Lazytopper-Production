// scripts/solutions/selectScienceSolutions.ts
//
// SOLUTIONS-SCI (owner approval, 6 Nov 2026) — the DETERMINISTIC selection of the NCERT Class 10
// SCIENCE textbook rows published on the free, attempt-first solutions pages
// (`/ncert-solutions/<chapter>`), modelled on the Maths selection (`selectSolutions.ts`, whose pure
// helpers it reuses) and verified into its own ledger (`src/config/solutionsSciLedger.ts`).
//
// ★ CODE DECIDES, NEVER AN EYE. Every bank row of a covered chapter whose id names the NCERT book
//   (`-NCERT-<n>-`) is put through the rules below IN ORDER; the first rule it fails is its recorded
//   reason. A row that passes every rule AND is `publish` / `no-verdict` in the ledger with an
//   unchanged content hash is published.
// ★ NCERT AND NCERT EXEMPLAR (SOLUTIONS-SCI-3, owner instruction 6 Nov 19:49 IST). Exemplar rows
//   (`-EXMPLR-<n>-`) are published on `/ncert-exemplar/<chapter>` under the same rules and the same
//   ledger. The Exemplar Science book keeps the OLD (pre-2023) chapter numbers, so each 2026-27
//   chapter carries its Exemplar chapter (EXEMPLAR_SCIENCE_CHAPTER, mapped from each file's CONTENT,
//   never by number); the deleted chapters' files (jeep105 Periodic Classification, jeep114 Sources of
//   Energy, jeep116 Management of Natural Resources) and the sample papers (jeep117/118) map to no page.
// ★ OFF-BOOK TERMS AND THE SUMMARY STEP (#1605 reviews). `off-book-term` is a selection rule: a word of
//   a row's answer / steps that is not in the 2026-27 textbook's word list (ncertScienceVocabulary.json),
//   not in the row's own question and not on its reviewed general list holds the row, in BOTH books.
//   ONE rule for a summary / conclusion final step (also written in ncertScienceVocabulary.json and the
//   ledger header): a Summary or Conclusion step that states values WITH UNITS is content and is KEPT;
//   one that only restates a non-numeric conclusion already given in an earlier step holds the row
//   (ledger `hold`). A step that gives the answer for the first time (the conclusion asked for, or the
//   option chosen on an objective row) is not a restatement.
// ★ NO BOARD-PATTERN SECTION. The Science NCERT rows carry no Assertion-Reason or case-based format
//   (the formats are MCQ / VSA / Short / Long), so the SOLUTIONS-3 section has nothing to show and
//   is not emitted; a row in such a format would fail `adapted-format`.
// ★ CLI. `tsx scripts/solutions/selectScienceSolutions.ts --write` rewrites the SOLUTIONS-SCI blocks
//   of `src/config/solutionsPublishSafe.ts` and `src/config/solutionsPages.ts`; `--report` prints the
//   per-chapter counts (`--excluded` adds every excluded id with its reason); `--candidates <file>`
//   writes every row that passes the RULES (before the ledger) with its content hash: the
//   verifiers' input.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { NCERT_CLASS10_CHAPTERS } from "../../src/config/ncertBooks";
import { SOLUTIONS_SCI_LEDGER } from "../../src/config/solutionsSciLedger";
import type { LedgerEntry } from "../../src/config/solutions2Ledger";
import {
  booksOf,
  parseScienceExemplarRef,
  parseScienceRef,
  solutionsHeadDescription,
  solutionsHeadTitle,
  type SolutionsChapter,
} from "../../src/config/solutionsPublishSafe";
import { syllabusExclusion } from "../../src/lib/boardQuestions/selectionRule";
import { compareAnswer, correctOptionIndex, parseQuantity } from "../../src/lib/solutions/compareAnswer";
import { getFiguresForQuestion } from "../../src/data/visualConceptRegistry";
import { getSolutionFigures } from "../../src/diagrams/registry";
import { WITHHELD_QUESTION_IDS } from "../../src/data/canonicalQuestionBank";
import { SURFACE_BANNED_PHRASES, bannedSubtopicsFor } from "../../../scripts/src/syllabusGuard";
import {
  AUTHORING_ARTIFACT,
  MIN_ROWS_PER_PAGE,
  NEEDS_FIGURE_STEPS,
  PAGES_FILE,
  PUBLISH_SAFE_FILE,
  committedBlock,
  replaceBlock,
  rowHash,
  rowNote,
  verdictEligibility,
  type Row,
  type SelectedRow,
  type VerdictDecision,
} from "./selectSolutions";

/** The chapters this lane publishes: SOLUTIONS-SCI-1 piloted Ch 1, 5, 11; SOLUTIONS-SCI-2 covers all 13. */
export const SCIENCE_SOLUTIONS_SLUGS: readonly string[] = [
  "chemical-reactions-and-equations",
  "acids-bases-and-salts",
  "metals-and-non-metals",
  "carbon-and-its-compounds",
  "life-processes",
  "control-and-coordination",
  "how-do-organisms-reproduce",
  "heredity",
  "light-reflection-and-refraction",
  "human-eye-and-colourful-world",
  "electricity",
  "magnetic-effects-of-electric-current",
  "our-environment",
];

export interface ScienceChapterSpec {
  /** URL slug = bank chapter = notes / topics.ts slug (every Science chapter is one NCERT chapter). */
  slug: string;
  /** NCERT 2026-27 Science chapter number. */
  chapter: number;
  /** NCERT 2026-27 chapter title (from `NCERT_CLASS10_CHAPTERS`). */
  title: string;
  /** The NCERT Exemplar Class X Science chapter (old numbering) that holds this chapter's problems. */
  exemplarChapter: number;
}

/**
 * NCERT Exemplar Problems, Class X Science (ncert.nic.in/pdf/publication/exemplarproblem/classX/
 * science/jeep1NN.pdf): 2026-27 chapter slug → the Exemplar chapter / file, MAPPED BY EACH FILE'S
 * CONTENT (its first questions), never by number. jeep105 (Periodic Classification), jeep114 (Sources
 * of Energy) and jeep116 (Management of Natural Resources) are deleted chapters; jeep117/118 are
 * sample papers: none maps to a page. jeep109 is "Heredity and Evolution": its Evolution questions
 * are excluded by the syllabus guard.
 */
export const EXEMPLAR_SCIENCE_CHAPTER: Readonly<Record<string, { chapter: number; file: string }>> = {
  "chemical-reactions-and-equations": { chapter: 1, file: "jeep101" },
  "acids-bases-and-salts": { chapter: 2, file: "jeep102" },
  "metals-and-non-metals": { chapter: 3, file: "jeep103" },
  "carbon-and-its-compounds": { chapter: 4, file: "jeep104" },
  "life-processes": { chapter: 6, file: "jeep106" },
  "control-and-coordination": { chapter: 7, file: "jeep107" },
  "how-do-organisms-reproduce": { chapter: 8, file: "jeep108" },
  heredity: { chapter: 9, file: "jeep109" },
  "light-reflection-and-refraction": { chapter: 10, file: "jeep110" },
  "human-eye-and-colourful-world": { chapter: 11, file: "jeep111" },
  electricity: { chapter: 12, file: "jeep112" },
  "magnetic-effects-of-electric-current": { chapter: 13, file: "jeep113" },
  "our-environment": { chapter: 15, file: "jeep115" },
};

/** The covered Science chapters, in book order, derived from ncertBooks.ts (never retyped). */
export function scienceSolutionsChapters(slugs: readonly string[] = SCIENCE_SOLUTIONS_SLUGS): ScienceChapterSpec[] {
  return NCERT_CLASS10_CHAPTERS.filter((r) => r.book === "Science" && slugs.includes(r.slug)).map((r) => ({
    slug: r.slug,
    chapter: r.chapter,
    title: r.title,
    exemplarChapter: EXEMPLAR_SCIENCE_CHAPTER[r.slug].chapter,
  }));
}

export type ScienceBook = "ncert" | "exemplar";

export function scienceBookOf(id: string): ScienceBook | null {
  if (/-NCERT-\d+-/.test(id)) return "ncert";
  if (/-EXMPLR-\d+-/.test(id)) return "exemplar";
  return null;
}

/** The chapter number written in the id (`ELEC-NCERT-11-SA-001` → 11). */
export function scienceIdChapterOf(id: string): number | null {
  const m = /-(?:NCERT|EXMPLR)-(\d+)-/.exec(id);
  return m ? Number(m[1]) : null;
}

// ---------------------------------------------------------------------------------------------
// The syllabus screen. Three layers, each read from its ONE reference, never retyped:
//   (1) `syllabusExclusion` (selectionRule.ts → syllabus2026-27.ts), chapter-scoped;
//   (2) the Science `bannedSubtopics` of scripts/src/syllabusGuard.ts (`bannedSubtopicsFor`),
//       matched EXACTLY against the row's subtopic — the guard's own semantics. The guard bans the
//       Evolution sub-topics; Heredity / Mendel / Laws of Inheritance / Sex Determination are
//       retained and are on no list;
//   (3) the guard's SURFACE_BANNED_PHRASES (unambiguous whole phrases: Periodic Classification,
//       Evolution section, Sources of Energy, Management of Natural Resources, Electric Motor /
//       Generator / Electromagnetic Induction), matched in the question, options, steps and answer.
// ---------------------------------------------------------------------------------------------

const fold = (s: string) =>
  String(s ?? "").normalize("NFKC").replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim().toLowerCase();
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export interface ScienceGuardLists {
  bannedSubtopics: readonly string[];
  surfacePhrases: readonly string[];
}

export function scienceSyllabusGuard(): ScienceGuardLists {
  const bannedSubtopics = bannedSubtopicsFor("Science");
  // Sentinels: the lists this reads still have the shape it expects.
  for (const s of ["Evolution", "Natural Selection", "Periodic Classification", "Sources of Energy"]) {
    if (!bannedSubtopics.includes(s)) throw new Error(`selectScienceSolutions: syllabusGuard Science list lost "${s}"`);
  }
  for (const s of ["Heredity", "Mendel's contribution", "Laws of Inheritance", "Sex Determination"]) {
    if (bannedSubtopics.map(fold).includes(fold(s))) throw new Error(`selectScienceSolutions: "${s}" is retained, never banned`);
  }
  if (!SURFACE_BANNED_PHRASES.includes("Electric Motor")) throw new Error("selectScienceSolutions: surface phrases moved");
  return { bannedSubtopics, surfacePhrases: SURFACE_BANNED_PHRASES };
}

function allText(q: Row): string {
  return [q.questionText, ...(q.options ?? []), ...(q.solutionSteps ?? []), q.finalAnswer, q.answer]
    .map((s) => String(s ?? ""))
    .join("\n");
}

export function scienceSyllabusReason(q: Row, guard: ScienceGuardLists): string | null {
  const ex = syllabusExclusion({ topicKey: q.topicKey, subtopic: q.subtopic ?? "", questionText: q.questionText ?? "" });
  if (ex) return ex;
  const sub = fold(q.subtopic ?? "");
  const banned = guard.bannedSubtopics.find((b) => fold(b) === sub);
  if (banned) return `syllabusGuard banned sub-topic "${banned}"`;
  const hay = allText(q);
  const phrase = guard.surfacePhrases.find((p) => new RegExp(`(?<![\\w])${escapeRe(p)}(?![\\w])`, "i").test(hay));
  if (phrase) return `syllabusGuard surface phrase "${phrase}"`;
  return null;
}

// ---------------------------------------------------------------------------------------------
// The book reference. The Science bank writes its NCERT references in three book forms; anything
// else ("Exercise / In-text …", a page-qualified "(p. 212)" the 2026-27 reprint may have moved) is
// not shown as a book reference.
// ---------------------------------------------------------------------------------------------

/** A page qualifier ("(p. 212)") or any other trailing note: the 2026-27 reprint's pages are not checked. */
const PAGE_QUALIFIED = /\(p(?:age|\.)\s*\d+\)/i;

// ---------------------------------------------------------------------------------------------
// The rules.
// ---------------------------------------------------------------------------------------------

/**
 * The question needs a figure the page would have to show. Same detector as the Maths rule, except
 * for "draw": in Science it is also the verb for current ("will the bulb draw from a 220 V source",
 * "what current will the heater draw if …"), so it counts only with a drawing as its object.
 */
export const SCIENCE_NEEDS_FIGURE_TEXT =
  /\bfig(?:ure|ures|s)?\b\.?|\bfig\.|diagram|\bshown\b|\bgraph\b|adjoining|\bplotted\b|\bpicture\b|\bsketch\b|\bdraw\s+(?:a\s+|an\s+|the\s+)?(?:neat|labell?ed|schematic|ray|circuit|structure|flow ?chart)\b/i;

/**
 * A paper mark bled into the text (the Maths detector), except after a decimal point: Science
 * quantities read "0.5 A", "2.5 V", which are values, not a mark followed by the next question.
 */
export const SCIENCE_MARK_BLEED = /(?<!\d)[.:?]\s*[1-5]\s+(?:\(|[A-Z])/;

/** U+FFFD (built from its code), and the common UTF-8-read-as-Latin-1 shapes (escaped, for check:mojibake). */
const REPLACEMENT_CHAR = String.fromCharCode(0xfffd);
const MOJIBAKE = new RegExp(["\\u00C3.", "\\u00E2\\u20AC", "\\u00C2[^\\w]"].join("|"));
/** Formats neither NCERT book has (Assertion-Reason, case-based): LazyTopper adaptations. */
const ADAPTED_FORMAT = /assertion|case[ -]?(?:based|study)/i;
const ADAPTED_ID = /-(?:AR|CB|CRE)-\d+$/;

/**
 * CLAUDE.md §13 — the CBSE 2026-27 step-marking MINIMUM per question value: a 1-mark item earns 1
 * step, 2 marks 2, 3 marks 3, a 4-mark case 4, a 5-mark long answer 5.
 */
export const CBSE_MIN_STEPS: Readonly<Record<number, number>> = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 };
const MARK_PREFIX = /^\s*\[\s*(\d+(?:\.\d+)?)\s*marks?\s*\]/i;

/** Why the row's steps do not meet the CBSE step-marking scheme, or null. */
export function stepMarkingReason(q: Pick<Row, "marks" | "solutionSteps">): string | null {
  const steps = (q.solutionSteps ?? []).map((s) => String(s));
  const marks = Number(q.marks);
  const min = CBSE_MIN_STEPS[marks];
  if (!min) return `marks ${q.marks}: not a CBSE question value`;
  if (steps.length < min) return `${steps.length} steps for ${marks} marks (CBSE minimum ${min})`;
  const prefixed = steps.map((s) => MARK_PREFIX.exec(s)).filter((m): m is RegExpExecArray => m !== null);
  if (prefixed.length > 0) {
    if (prefixed.length !== steps.length) return `${prefixed.length} of ${steps.length} steps carry a [N mark] prefix`;
    const sum = prefixed.reduce((a, m) => a + Number(m[1]), 0);
    if (Math.abs(sum - marks) > 1e-9) return `step marks sum to ${sum}, the question is worth ${marks}`;
  }
  // SOLUTIONS-SCI-2: steps WITHOUT [N mark] prefixes are accepted when they meet the CBSE minimum
  // count (the Maths bar and the brief: "solutionSteps matching CBSE step counts"); prefixes, when
  // present, must cover every step and sum to the marks.
  return null;
}

// ---------------------------------------------------------------------------------------------
// #1605 review (6 Nov 2026): the OFF-BOOK TERM rule, mechanical. `ncertScienceVocabulary.json` holds
// the word list of the 13 official 2026-27 NCERT Science chapter files (not their text) and a short,
// reviewed list of general words. A row whose answer or steps use any other word (one not in its own
// question either) is not published: a term the textbook never uses ("stoichiometry", "lattice",
// "ionise", "genotype") teaches beyond the book.
// ---------------------------------------------------------------------------------------------

const VOCAB_FILE = resolve(dirname(fileURLToPath(import.meta.url)), "ncertScienceVocabulary.json");
let vocabCache: { words: Set<string>; stems: Set<string>; allow: Set<string> } | null = null;

const stemWord = (w: string) => {
  for (const suf of ["ing", "ed", "es", "s"]) if (w.length > 4 + suf.length && w.endsWith(suf)) return w.slice(0, -suf.length);
  return w;
};
const words = (t: string) => String(t ?? "").normalize("NFKC").toLowerCase().match(/[a-z]+/g) ?? [];

export function ncertScienceVocabulary(): { words: Set<string>; stems: Set<string>; allow: Set<string> } {
  if (!vocabCache) {
    const v = JSON.parse(readFileSync(VOCAB_FILE, "utf8")) as { words: string[]; allowGeneral: string[] };
    const all = new Set(v.words);
    vocabCache = { words: all, stems: new Set([...all].map(stemWord)), allow: new Set(v.allowGeneral) };
  }
  return vocabCache;
}

/** The words (4+ letters) of a row's answer and steps that are neither NCERT words nor its own question's, nor reviewed general words. */
export function offBookTerms(q: Pick<Row, "questionText" | "options" | "answer" | "finalAnswer" | "solutionSteps">): string[] {
  const v = ncertScienceVocabulary();
  const asked = new Set(words([q.questionText, ...(q.options ?? [])].map((x) => String(x ?? "")).join("\n")));
  const out = new Set<string>();
  for (const w of words([q.answer, q.finalAnswer, ...(q.solutionSteps ?? [])].map((x) => String(x ?? "")).join("\n"))) {
    if (w.length < 4 || v.words.has(w) || v.stems.has(stemWord(w)) || asked.has(w) || v.allow.has(w)) continue;
    out.add(w);
  }
  return [...out].sort();
}

export type ScienceExclusionReason =
  | "other-chapter"
  | "withheld"
  | "source-others"
  | "adapted-format"
  | "ref-not-a-book-question"
  | "ref-stale-numbering"
  | "syllabus"
  | "off-book-term"
  | "needs-figure"
  | "garbled"
  | "step-marking"
  | "mcq-key-ambiguous"
  | "duplicate"
  | "held"
  | "ref-mismatch"
  | "unverified"
  | "thin-page";

export interface ScienceClassified {
  id: string;
  reason: ScienceExclusionReason | null;
  detail: string;
}

/**
 * The first rule a row fails (null reason = candidate), or null when the row is not a book row of
 * this chapter at all. Duplicates and the ledger are applied later.
 */
export function classifyScienceRow(
  q: Row,
  spec: ScienceChapterSpec,
  guard: ScienceGuardLists,
  withheld: ReadonlySet<string> = WITHHELD_QUESTION_IDS,
): ScienceClassified | null {
  const id = q.id;
  const book = scienceBookOf(id);
  if (!book || q.topicKey !== spec.slug) return null;
  const out = (reason: ScienceExclusionReason | null, detail = ""): ScienceClassified => ({ id, reason, detail });
  if (scienceIdChapterOf(id) !== spec.chapter) return out("other-chapter", `id chapter ${scienceIdChapterOf(id)}`);
  if (withheld.has(id)) return out("withheld", "WITHHELD_QUESTION_IDS");
  if (q.sourceOverride === "others") return out("source-others", "BANK-FIX-1: source not confirmed as NCERT");
  if (ADAPTED_FORMAT.test(String(q.format ?? "").trim()) || ADAPTED_ID.test(id)) {
    return out("adapted-format", `${q.format}: the book has no such item`);
  }
  const rawRef = String(q.ncertRef ?? "").trim();
  if (PAGE_QUALIFIED.test(rawRef)) return out("ref-stale-numbering", rawRef);
  if (book === "ncert") {
    const ref = parseScienceRef(rawRef);
    if (!ref) return out("ref-not-a-book-question", rawRef);
    if (ref.chapter !== null && ref.chapter !== spec.chapter) return out("ref-stale-numbering", rawRef);
  } else {
    // The Exemplar Science book numbers its chapters the OLD way (Life Processes is Exemplar Ch 6).
    const ref = parseScienceExemplarRef(rawRef, q.format);
    if (!ref) return out("ref-not-a-book-question", rawRef);
    if (ref.chapter !== null && ref.chapter !== spec.exemplarChapter) return out("ref-stale-numbering", rawRef);
  }
  const syl = scienceSyllabusReason(q, guard);
  if (syl) return out("syllabus", syl);
  const offBook = offBookTerms(q);
  if (offBook.length > 0) return out("off-book-term", `not in the 2026-27 NCERT textbook: ${offBook.join(", ")}`);
  if (q.requiresDiagram === true) return out("needs-figure", "requiresDiagram");
  if (getFiguresForQuestion(id).length > 0) return out("needs-figure", "a bound question figure the page does not render");
  // SOLUTIONS-SCI-2: a row whose ANSWER is a bound solution figure (an NCERT crop or a computed ray
  // diagram, each bound by its own lane after the labels were eye-checked) is shown WITH that figure
  // (SolutionsPage renders <SolutionFigure> in the solution), so "draw a ray diagram" is not missing
  // anything. A question figure the page cannot render still excludes the row (checked above).
  const solutionFigure = getSolutionFigures(id).length > 0;
  if (!solutionFigure && SCIENCE_NEEDS_FIGURE_TEXT.test(String(q.questionText ?? ""))) return out("needs-figure", "question refers to a figure/graph/drawing");
  if (!solutionFigure && (q.solutionSteps ?? []).some((s) => NEEDS_FIGURE_STEPS.test(String(s)))) return out("needs-figure", "solution refers to a figure");
  const text = allText(q);
  if (text.includes(REPLACEMENT_CHAR)) return out("garbled", "U+FFFD");
  if (MOJIBAKE.test(text)) return out("garbled", "mojibake");
  if (SCIENCE_MARK_BLEED.test(String(q.questionText ?? ""))) return out("garbled", "mark bleed");
  if (AUTHORING_ARTIFACT.test(text)) return out("garbled", "drafting artifact");
  if (!String(q.questionText ?? "").trim() || !(q.solutionSteps ?? []).length || !String(q.finalAnswer ?? q.answer ?? "").trim()) {
    return out("garbled", "missing question, steps or answer");
  }
  const steps = stepMarkingReason(q);
  if (steps) return out("step-marking", steps);
  if (Array.isArray(q.options) && q.options.length > 0) {
    if (correctOptionIndex(String(q.answer ?? ""), q.options) === null) return out("mcq-key-ambiguous", String(q.answer));
  }
  return out(null);
}

/**
 * Chapters whose numerical answers follow the NCERT New Cartesian sign convention: "f = 10 cm" and
 * "f = −10 cm" are BOTH correct answers for a concave mirror, and compareAnswer would mark the signed
 * one wrong. So no typed ✓/✗ there, ever ("never mark a correct student wrong; when in doubt, none").
 */
export const SIGN_CONVENTION_SLUGS: ReadonlySet<string> = new Set(["light-reflection-and-refraction", "human-eye-and-colourful-world"]);

export function signConventionVerdict(slug: string, v: VerdictDecision): VerdictDecision {
  return v.verdict && SIGN_CONVENTION_SLUGS.has(slug) ? { verdict: false, why: "sign convention: ± forms are both correct" } : v;
}

/**
 * SOLUTIONS-SCI-2 + #1604: the Maths opt-in rules (verdictEligibility: no proof, multi-part,
 * multi-value, relation, approximation, ratio), then the key must be ONE SI quantity that compares
 * to itself in compareAnswer's opt-in Science mode ("I = 0.5 A", "R = 15 Ω", "9.6 kWh").
 */
export function scienceVerdictEligibility(q: Row): VerdictDecision {
  const v = verdictEligibility(q);
  if (v.verdict || (v.why !== "not one comparable value" && v.why !== "key does not compare to itself")) return v;
  const key = String(q.finalAnswer ?? "").trim();
  if (!parseQuantity(key, "science")) return v;
  if (compareAnswer(key, key, "science").verdict !== "right") return { verdict: false, why: "key does not compare to itself" };
  return { verdict: true, why: key };
}

const dupKey = (s: string) => fold(s).replace(/[^a-z0-9]+/g, "");

export interface ScienceChapterSelection {
  spec: ScienceChapterSpec;
  ncert: SelectedRow[];
  /** SOLUTIONS-SCI-3: the chapter's NCERT Exemplar page. */
  exemplar: SelectedRow[];
  excluded: ScienceClassified[];
}

/**
 * One chapter page: candidates in bank order, minus duplicates (the first row of a repeated
 * reference or question text wins), minus every row the ledger does not clear with its live hash.
 */
export function selectScienceChapter(
  rows: readonly Row[],
  spec: ScienceChapterSpec,
  guard: ScienceGuardLists,
  ledger: Readonly<Record<string, LedgerEntry>> = SOLUTIONS_SCI_LEDGER,
): ScienceChapterSelection {
  const sel: ScienceChapterSelection = { spec, ncert: [], exemplar: [], excluded: [] };
  const seenRef = new Map<string, string>();
  const seenText = new Map<string, string>();
  for (const q of rows) {
    const c = classifyScienceRow(q, spec, guard);
    if (!c) continue;
    if (c.reason) {
      sel.excluded.push(c);
      continue;
    }
    const book = scienceBookOf(q.id)!;
    const rk = `${book}|${String(q.ncertRef ?? "").trim()}`;
    const tk = `${book}|${dupKey(String(q.questionText))}`;
    const dup = seenRef.get(rk) ?? seenText.get(tk);
    if (dup) {
      sel.excluded.push({ ...c, reason: "duplicate", detail: `same reference or question as ${dup}` });
      continue;
    }
    seenRef.set(rk, q.id);
    seenText.set(tk, q.id);
    const l = ledger[q.id];
    if (!l) {
      sel.excluded.push({ ...c, reason: "unverified", detail: "not in solutionsSciLedger.ts" });
      continue;
    }
    if (l.status === "ref-mismatch") {
      sel.excluded.push({ ...c, reason: "ref-mismatch", detail: l.note });
      continue;
    }
    if (l.status === "hold") {
      sel.excluded.push({ ...c, reason: "held", detail: l.note });
      continue;
    }
    if (l.hash !== rowHash(q)) {
      sel.excluded.push({ ...c, reason: "unverified", detail: "content changed since verification (hash)" });
      continue;
    }
    const code = signConventionVerdict(spec.slug, scienceVerdictEligibility(q));
    const v = l.status === "no-verdict" && code.verdict ? { verdict: false, why: "verifier: not one value" } : code;
    sel[book].push({ id: q.id, verdict: v.verdict, note: rowNote(q, v) });
  }
  // A book page with fewer than MIN_ROWS_PER_PAGE rows is not published (a thin page is worse than none).
  for (const book of ["ncert", "exemplar"] as const) {
    if (sel[book].length > 0 && sel[book].length < MIN_ROWS_PER_PAGE) {
      for (const r of sel[book]) sel.excluded.push({ id: r.id, reason: "thin-page", detail: `only ${sel[book].length} publishable ${book} rows` });
      sel[book] = [];
    }
  }
  return sel;
}

// ---------------------------------------------------------------------------------------------
// Emitting the generated blocks.
// ---------------------------------------------------------------------------------------------

export const SCI_BLOCK_BEGIN =
  "  // <SOLUTIONS-SCI:BEGIN> generated by scripts/solutions/selectScienceSolutions.ts --write; do not hand-edit";
export const SCI_BLOCK_END = "  // <SOLUTIONS-SCI:END>";
export const SCI_PAGES_BEGIN =
  "  // <SOLUTIONS-SCI-PAGES:BEGIN> generated by scripts/solutions/selectScienceSolutions.ts --write; do not hand-edit";
export const SCI_PAGES_END = "  // <SOLUTIONS-SCI-PAGES:END>";
export const SOLUTIONS_SCI_DECISION = "SOLUTIONS-SCI (owner 6 Nov)";

const commentSafe = (s: string) => s.replace(/\*\//g, "* /");

/**
 * Shorter chapter names, used ONLY when the full NCERT title would push "Class 10 Science" out of
 * the 60-character head title (SOLUTIONS-SCI-1 review: every Science head title says "Class 10
 * Science"). Each is a plain contraction of the NCERT title, never a different topic.
 */
export const SCIENCE_SHORT_TITLES: Readonly<Record<string, readonly string[]>> = {
  "chemical-reactions-and-equations": ["Chemical Reactions"],
  "acids-bases-and-salts": ["Acids, Bases & Salts", "Acids Bases Salts"],
  "metals-and-non-metals": ["Metals & Non-metals"],
  "carbon-and-its-compounds": ["Carbon Compounds"],
  "control-and-coordination": ["Control & Coordination", "Coordination"],
  "how-do-organisms-reproduce": ["Reproduction"],
  "light-reflection-and-refraction": ["Light"],
  "human-eye-and-colourful-world": ["Human Eye"],
  "magnetic-effects-of-electric-current": ["Magnetic Effects"],
};

// Every published book page's head title (solutionsHeadTitle keeps only "Class 10 Science" forms for
// Science and throws when none fits).
const headSaysClass10Science = (ch: SolutionsChapter) => {
  try {
    return booksOf(ch).every((b) => solutionsHeadTitle(b, ch).includes("Class 10 Science"));
  } catch {
    return false;
  }
};

/** The shortTitle a chapter needs (undefined when its full title already fits with "Class 10 Science"). */
export function scienceShortTitle(s: ScienceChapterSelection): string | undefined {
  if (headSaysClass10Science(asChapter(s))) return undefined;
  for (const t of SCIENCE_SHORT_TITLES[s.spec.slug] ?? []) if (headSaysClass10Science(asChapter(s, t))) return t;
  throw new Error(`selectScienceSolutions: no head title for ${s.spec.slug} says "Class 10 Science" within 60 characters`);
}

function asChapter(s: ScienceChapterSelection, shortTitle?: string): SolutionsChapter {
  return {
    slug: s.spec.slug,
    subject: "Science",
    chapter: s.spec.chapter,
    ...(s.spec.exemplarChapter !== s.spec.chapter ? { exemplarChapter: s.spec.exemplarChapter } : {}),
    title: s.spec.title,
    ...(shortTitle ? { shortTitle } : {}),
    decision: SOLUTIONS_SCI_DECISION,
    ncert: s.ncert.map((r) => ({ id: r.id })),
    exemplar: s.exemplar.map((r) => ({ id: r.id })),
  };
}

/** Throws when no head title / description fits with the full title (the ladders have shorter forms first). */
function checkHeads(s: ScienceChapterSelection, shortTitle?: string): void {
  const ch = asChapter(s, shortTitle);
  for (const b of booksOf(ch)) {
    solutionsHeadTitle(b, ch);
    solutionsHeadDescription(b, ch);
  }
}

export function emitScienceBlock(selections: readonly ScienceChapterSelection[]): string {
  const parts = selections
    .filter((s) => s.ncert.length + s.exemplar.length > 0)
    .map((s) => {
      const short = scienceShortTitle(s);
      checkHeads(s, short);
      const list = (rows: readonly SelectedRow[]) =>
        rows.length === 0
          ? "[]"
          : `[\n${rows
              .map((r) => {
                const ctor = r.verdict ? "v" : getSolutionFigures(r.id).length > 0 ? "f" : "r";
                const note = ctor === "f" ? "answer shown with its bound solution figure" : r.note;
                return `      ${ctor}(${JSON.stringify(r.id)}),${note ? ` // ${commentSafe(note)}` : ""}`;
              })
              .join("\n")}\n    ]`;
      return [
        "  {",
        `    slug: ${JSON.stringify(s.spec.slug)},`,
        '    subject: "Science",',
        `    chapter: ${s.spec.chapter},`,
        ...(s.spec.exemplarChapter !== s.spec.chapter ? [`    exemplarChapter: ${s.spec.exemplarChapter},`] : []),
        `    title: ${JSON.stringify(s.spec.title)},`,
        ...(short ? [`    shortTitle: ${JSON.stringify(short)},`] : []),
        `    decision: ${JSON.stringify(SOLUTIONS_SCI_DECISION)},`,
        `    ncert: ${list(s.ncert)},`,
        `    exemplar: ${list(s.exemplar)},`,
        "  },",
      ].join("\n");
    });
  return [SCI_BLOCK_BEGIN, ...parts, SCI_BLOCK_END].join("\n");
}

export function emitSciencePagesBlock(selections: readonly ScienceChapterSelection[]): string {
  const lines = selections
    .map((s) => ({ slug: s.spec.slug, books: (["ncert", "exemplar"] as const).filter((b) => s[b].length > 0) }))
    .filter((p) => p.books.length > 0)
    .map((p) => `  { slug: ${JSON.stringify(p.slug)}, books: [${p.books.map((b) => JSON.stringify(b)).join(", ")}] },`);
  return [SCI_PAGES_BEGIN, ...lines, SCI_PAGES_END].join("\n");
}

export function committedScienceBlocks(): { publishSafe: string; pages: string } {
  return {
    publishSafe: committedBlock(readFileSync(PUBLISH_SAFE_FILE, "utf8"), SCI_BLOCK_BEGIN, SCI_BLOCK_END),
    pages: committedBlock(readFileSync(PAGES_FILE, "utf8"), SCI_PAGES_BEGIN, SCI_PAGES_END),
  };
}

export async function selectAllScience(
  ledger: Readonly<Record<string, LedgerEntry>> = SOLUTIONS_SCI_LEDGER,
): Promise<ScienceChapterSelection[]> {
  const { ensureBankSubject, getBankRows } = await import("../../src/data/bankChapters/loader");
  await ensureBankSubject("Science");
  const guard = scienceSyllabusGuard();
  return scienceSolutionsChapters().map((spec) => selectScienceChapter(getBankRows([spec.slug]) as Row[], spec, guard, ledger));
}

async function main(argv: string[]): Promise<void> {
  const selections = await selectAllScience();
  if (argv.includes("--report")) {
    for (const s of selections) {
      const by = new Map<string, number>();
      for (const e of s.excluded) by.set(String(e.reason), (by.get(String(e.reason)) ?? 0) + 1);
      console.log(`${s.spec.slug}\tncert ${s.ncert.length} (v ${s.ncert.filter((r) => r.verdict).length})\texemplar ${s.exemplar.length} (v ${s.exemplar.filter((r) => r.verdict).length})\t${[...by.entries()].map(([k, n]) => `${k}=${n}`).join(" ")}`);
    }
    if (argv.includes("--excluded")) {
      for (const s of selections) for (const e of s.excluded) console.log(`EXCL\t${s.spec.slug}\t${e.id}\t${e.reason}\t${e.detail}`);
    }
  }
  const ci = argv.indexOf("--candidates");
  if (ci >= 0) {
    const { getBankRows } = await import("../../src/data/bankChapters/loader");
    const guard = scienceSyllabusGuard();
    const out = scienceSolutionsChapters().flatMap((spec) =>
      (getBankRows([spec.slug]) as Row[]).flatMap((q) => {
        const c = classifyScienceRow(q, spec, guard);
        return c && c.reason === null ? [{ slug: spec.slug, chapter: spec.chapter, hash: rowHash(q), verdictByCode: verdictEligibility(q), row: q }] : [];
      }),
    );
    writeFileSync(argv[ci + 1], JSON.stringify(out, null, 1));
    console.log(`candidates: ${out.length} -> ${argv[ci + 1]}`);
  }
  if (argv.includes("--write")) {
    writeFileSync(PUBLISH_SAFE_FILE, replaceBlock(readFileSync(PUBLISH_SAFE_FILE, "utf8"), emitScienceBlock(selections), SCI_BLOCK_BEGIN, SCI_BLOCK_END));
    writeFileSync(PAGES_FILE, replaceBlock(readFileSync(PAGES_FILE, "utf8"), emitSciencePagesBlock(selections), SCI_PAGES_BEGIN, SCI_PAGES_END));
    console.log("solutionsPublishSafe.ts + solutionsPages.ts: SOLUTIONS-SCI blocks written");
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
