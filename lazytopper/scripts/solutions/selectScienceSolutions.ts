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
// ★ NCERT ONLY. The bank also holds NCERT Exemplar Science rows (`-EXMPLR-`), but none of them has a
//   verification record, and our Storage holds no copy of the Exemplar Science book to check them
//   against, so they are excluded as `exemplar-unverified` (counted, never published). No
//   `/ncert-exemplar/<science chapter>` URL exists.
// ★ NO BOARD-PATTERN SECTION. The Science NCERT rows carry no Assertion-Reason or case-based format
//   (the formats are MCQ / VSA / Short / Long), so the SOLUTIONS-3 section has nothing to show and
//   is not emitted; a row in such a format would fail `adapted-format`.
// ★ CLI. `tsx scripts/solutions/selectScienceSolutions.ts --write` rewrites the SOLUTIONS-SCI blocks
//   of `src/config/solutionsPublishSafe.ts` and `src/config/solutionsPages.ts`; `--report` prints the
//   per-chapter counts (`--excluded` adds every excluded id with its reason); `--candidates <file>`
//   writes every row that passes the RULES (before the ledger) with its content hash: the
//   verifiers' input.

import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

import { NCERT_CLASS10_CHAPTERS } from "../../src/config/ncertBooks";
import { SOLUTIONS_SCI_LEDGER } from "../../src/config/solutionsSciLedger";
import type { LedgerEntry } from "../../src/config/solutions2Ledger";
import {
  booksOf,
  parseScienceRef,
  solutionsHeadDescription,
  solutionsHeadTitle,
  type SolutionsChapter,
} from "../../src/config/solutionsPublishSafe";
import { syllabusExclusion } from "../../src/lib/boardQuestions/selectionRule";
import { correctOptionIndex } from "../../src/lib/solutions/compareAnswer";
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
} from "./selectSolutions";

/** The chapters this lane publishes (SOLUTIONS-SCI-1 pilot). */
export const SCIENCE_SOLUTIONS_SLUGS: readonly string[] = [
  "chemical-reactions-and-equations",
  "life-processes",
  "electricity",
];

export interface ScienceChapterSpec {
  /** URL slug = bank chapter = notes / topics.ts slug (every Science chapter is one NCERT chapter). */
  slug: string;
  /** NCERT 2026-27 Science chapter number. */
  chapter: number;
  /** NCERT 2026-27 chapter title (from `NCERT_CLASS10_CHAPTERS`). */
  title: string;
}

/** The covered Science chapters, in book order, derived from ncertBooks.ts (never retyped). */
export function scienceSolutionsChapters(slugs: readonly string[] = SCIENCE_SOLUTIONS_SLUGS): ScienceChapterSpec[] {
  return NCERT_CLASS10_CHAPTERS.filter((r) => r.book === "Science" && slugs.includes(r.slug)).map((r) => ({
    slug: r.slug,
    chapter: r.chapter,
    title: r.title,
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
  } else if (marks > 1) {
    return `${marks}-mark row without [N mark] step prefixes`;
  }
  return null;
}

export type ScienceExclusionReason =
  | "exemplar-unverified"
  | "other-chapter"
  | "withheld"
  | "source-others"
  | "adapted-format"
  | "ref-not-a-book-question"
  | "ref-stale-numbering"
  | "syllabus"
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
  if (book === "exemplar") return out("exemplar-unverified", "no verification record and no stored Exemplar Science copy");
  if (scienceIdChapterOf(id) !== spec.chapter) return out("other-chapter", `id chapter ${scienceIdChapterOf(id)}`);
  if (withheld.has(id)) return out("withheld", "WITHHELD_QUESTION_IDS");
  if (q.sourceOverride === "others") return out("source-others", "BANK-FIX-1: source not confirmed as NCERT");
  if (ADAPTED_FORMAT.test(String(q.format ?? "").trim()) || ADAPTED_ID.test(id)) {
    return out("adapted-format", `${q.format}: the book has no such item`);
  }
  const rawRef = String(q.ncertRef ?? "").trim();
  if (PAGE_QUALIFIED.test(rawRef)) return out("ref-stale-numbering", rawRef);
  const ref = parseScienceRef(rawRef);
  if (!ref) return out("ref-not-a-book-question", rawRef);
  if (ref.chapter !== null && ref.chapter !== spec.chapter) return out("ref-stale-numbering", rawRef);
  const syl = scienceSyllabusReason(q, guard);
  if (syl) return out("syllabus", syl);
  if (q.requiresDiagram === true) return out("needs-figure", "requiresDiagram");
  if (getFiguresForQuestion(id).length > 0) return out("needs-figure", "a bound question figure the page does not render");
  if (getSolutionFigures(id).length > 0) return out("needs-figure", "a bound solution figure the page does not render");
  if (SCIENCE_NEEDS_FIGURE_TEXT.test(String(q.questionText ?? ""))) return out("needs-figure", "question refers to a figure/graph/drawing");
  if ((q.solutionSteps ?? []).some((s) => NEEDS_FIGURE_STEPS.test(String(s)))) return out("needs-figure", "solution refers to a figure");
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

const dupKey = (s: string) => fold(s).replace(/[^a-z0-9]+/g, "");

export interface ScienceChapterSelection {
  spec: ScienceChapterSpec;
  ncert: SelectedRow[];
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
  const sel: ScienceChapterSelection = { spec, ncert: [], excluded: [] };
  const seenRef = new Map<string, string>();
  const seenText = new Map<string, string>();
  for (const q of rows) {
    const c = classifyScienceRow(q, spec, guard);
    if (!c) continue;
    if (c.reason) {
      sel.excluded.push(c);
      continue;
    }
    const rk = String(q.ncertRef ?? "").trim();
    const tk = dupKey(String(q.questionText));
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
    const code = verdictEligibility(q);
    const v = l.status === "no-verdict" && code.verdict ? { verdict: false, why: "verifier: not one value" } : code;
    sel.ncert.push({ id: q.id, verdict: v.verdict, note: rowNote(q, v) });
  }
  if (sel.ncert.length > 0 && sel.ncert.length < MIN_ROWS_PER_PAGE) {
    for (const r of sel.ncert) sel.excluded.push({ id: r.id, reason: "thin-page", detail: `only ${sel.ncert.length} publishable rows` });
    sel.ncert = [];
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

// The NCERT page's head title (SOLUTIONS-SCI publishes no Science Exemplar page yet).
// (solutionsHeadTitle keeps only "Class 10 Science" forms for Science and throws when none fits.)
const headSaysClass10Science = (ch: SolutionsChapter) => {
  try {
    return solutionsHeadTitle("ncert", ch).includes("Class 10 Science");
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
    title: s.spec.title,
    ...(shortTitle ? { shortTitle } : {}),
    decision: SOLUTIONS_SCI_DECISION,
    ncert: s.ncert.map((r) => ({ id: r.id })),
    exemplar: [],
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
    .filter((s) => s.ncert.length > 0)
    .map((s) => {
      const short = scienceShortTitle(s);
      checkHeads(s, short);
      const rows = s.ncert
        .map((r) => `      ${r.verdict ? "v" : "r"}(${JSON.stringify(r.id)}),${r.note ? ` // ${commentSafe(r.note)}` : ""}`)
        .join("\n");
      return [
        "  {",
        `    slug: ${JSON.stringify(s.spec.slug)},`,
        '    subject: "Science",',
        `    chapter: ${s.spec.chapter},`,
        `    title: ${JSON.stringify(s.spec.title)},`,
        ...(short ? [`    shortTitle: ${JSON.stringify(short)},`] : []),
        `    decision: ${JSON.stringify(SOLUTIONS_SCI_DECISION)},`,
        `    ncert: [\n${rows}\n    ],`,
        "    exemplar: [],",
        "  },",
      ].join("\n");
    });
  return [SCI_BLOCK_BEGIN, ...parts, SCI_BLOCK_END].join("\n");
}

export function emitSciencePagesBlock(selections: readonly ScienceChapterSelection[]): string {
  const lines = selections.filter((s) => s.ncert.length > 0).map((s) => `  { slug: ${JSON.stringify(s.spec.slug)}, books: ["ncert"] },`);
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
      console.log(`${s.spec.slug}\tncert ${s.ncert.length} (v ${s.ncert.filter((r) => r.verdict).length})\t${[...by.entries()].map(([k, n]) => `${k}=${n}`).join(" ")}`);
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
