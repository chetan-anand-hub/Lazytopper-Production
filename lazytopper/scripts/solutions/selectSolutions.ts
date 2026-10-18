// scripts/solutions/selectSolutions.ts
//
// SOLUTIONS-2 (owner ruling, 18 Oct 2026) — the DETERMINISTIC selection of the NCERT / NCERT
// Exemplar rows published on the public solutions pages, for every Maths chapter after the
// Triangles pilot (SOLUTIONS-1, D261, which this script never touches).
//
// ★ CODE DECIDES, NEVER AN EYE. Every row of the bank that carries an NCERT / Exemplar id is put
//   through the rules below IN ORDER; the first rule it fails is its recorded reason. A row that
//   passes every rule AND is not excluded by the verification ledger (`solutions2Ledger.ts`) is
//   published. The same code decides the ✓/✗ opt-in for typed rows (D260).
// ★ PURE CORE. `classifyRow` / `verdictEligibility` / `selectChapter` take plain data, so the guard
//   (`src/config/solutions2Selection.guard.test.ts`) feeds them synthetic violating rows AND
//   re-runs the whole selection on the live bank and compares it with the committed allowlist.
// ★ CLI. `tsx scripts/solutions/selectSolutions.ts --write` rewrites the generated block of
//   `src/config/solutionsPublishSafe.ts` (between the SOLUTIONS-2 markers); `--report` prints the
//   per-chapter counts (`--excluded` adds every excluded id with its reason); `--candidates <file>`
//   writes the selected rows (the verifiers' input) as JSON.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { NCERT_CLASS10_CHAPTERS } from "../../src/config/ncertBooks";
import { SOLUTIONS_2_LEDGER, type LedgerEntry } from "../../src/config/solutions2Ledger";
import { SOLUTIONS_3_BOARD_LEDGER } from "../../src/config/solutions3BoardLedger";
import {
  booksOf,
  solutionsHeadDescription,
  solutionsHeadTitle,
  type SolutionsChapter,
} from "../../src/config/solutionsPublishSafe";
import { allDesktopTopics } from "../../src/lib/desktop/topics";
import { syllabusExclusion } from "../../src/lib/boardQuestions/selectionRule";
import { compareAnswer, correctOptionIndex, parseQuantity, parseRatio } from "../../src/lib/solutions/compareAnswer";
import { getFiguresForQuestion } from "../../src/data/visualConceptRegistry";
import { WITHHELD_QUESTION_IDS } from "../../src/data/canonicalQuestionBank";
import { createHash } from "node:crypto";

/**
 * The content a verifier saw: question, options, keys and steps. The ledger stores this hash per
 * id; a row whose content changed since verification is `unverified` until verified again.
 */
export function rowHash(
  q: Pick<Row, "questionText" | "options" | "answer" | "finalAnswer" | "solutionSteps" | "ncertRef">,
): string {
  // ncertRef is included: the book check is a verdict ABOUT the reference, so a renumbered row re-verifies.
  const payload = JSON.stringify([
    q.questionText ?? null,
    q.options ?? null,
    q.answer ?? null,
    q.finalAnswer ?? null,
    q.solutionSteps ?? [],
    q.ncertRef ?? null,
  ]);
  return createHash("sha256").update(payload, "utf8").digest("hex").slice(0, 16);
}

const here = dirname(fileURLToPath(import.meta.url));
export const LAZYTOPPER_ROOT = resolve(here, "..", "..");
export const PUBLISH_SAFE_FILE = resolve(LAZYTOPPER_ROOT, "src", "config", "solutionsPublishSafe.ts");
export const PAGES_FILE = resolve(LAZYTOPPER_ROOT, "src", "config", "solutionsPages.ts");
const SYLLABUS_GUARD_FILE = resolve(LAZYTOPPER_ROOT, "..", "scripts", "src", "syllabusGuard.ts");

export type Book = "ncert" | "exemplar";

/** The bank row fields the rules read (a CanonicalQuestion satisfies it). */
export interface Row {
  id: string;
  topicKey: string;
  subtopic?: string;
  format?: string;
  marks?: number;
  questionText?: string;
  options?: readonly string[];
  answer?: string;
  finalAnswer?: string;
  solutionSteps?: readonly string[];
  ncertRef?: string;
  sourceOverride?: string;
  requiresDiagram?: boolean;
}

/** One solutions chapter page (URL slug) as the selection sees it. */
export interface ChapterSpec {
  /** URL slug: `/ncert-solutions/<slug>`. The bank slug, unless the bank chapter spans two NCERT chapters. */
  slug: string;
  /** Bank chapter / topics.ts slug. */
  bank: string;
  /** NCERT 2026-27 textbook chapter number. */
  chapter: number;
  /** NCERT 2026-27 chapter title (from `NCERT_CLASS10_CHAPTERS`). */
  title: string;
  /** NCERT Exemplar (Class X Mathematics) chapter number that holds this chapter's problems. */
  exemplarChapter: number;
  /** The topics.ts chapter name (the short form used only when a head text would not fit). */
  topicName?: string;
}

/**
 * The NCERT Exemplar Class X Mathematics book's chapter numbers (ncert.nic.in, jeep201–jeep213):
 * 1 Real Numbers … 8 Introduction to Trigonometry and its Applications, 9 Circles, 10 Constructions
 * (deleted for 2026-27), 11 Area Related to Circles, 12 Surface Areas and Volumes, 13 Statistics
 * and Probability. Keyed by the NCERT 2026-27 textbook chapter number.
 */
export const EXEMPLAR_CHAPTER_FOR_NCERT: Readonly<Record<number, number>> = {
  1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 8, 10: 9, 11: 11, 12: 12, 13: 13, 14: 13,
};

const kebab = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Every Maths chapter of the 2026-27 NCERT book, as a solutions page, derived from ncertBooks.ts. */
export function maths202627Chapters(): ChapterSpec[] {
  const maths = NCERT_CLASS10_CHAPTERS.filter((r) => r.book === "Maths");
  return maths.map((r) => {
    const shared = maths.filter((o) => o.slug === r.slug).length > 1;
    const topicName = shared ? undefined : allDesktopTopics().find((t) => t.slug === r.slug)?.name;
    return {
      slug: shared ? kebab(r.title) : r.slug,
      bank: r.slug,
      chapter: r.chapter,
      title: r.title,
      exemplarChapter: EXEMPLAR_CHAPTER_FOR_NCERT[r.chapter],
      ...(topicName ? { topicName } : {}),
    };
  });
}

/** SOLUTIONS-2 covers every Maths chapter except the Triangles pilot (D261, unchanged). */
export function solutions2Chapters(): ChapterSpec[] {
  return maths202627Chapters().filter((c) => c.bank !== "triangles");
}

export function bookOf(id: string): Book | null {
  if (/-N-NCERT-/.test(id)) return "ncert";
  if (/-N-(?:EXMPLR|EXEM2?)-/.test(id)) return "exemplar";
  return null;
}

/** The chapter number written in the id (`TRIG-N-NCERT-9-SA-001` → 9). */
export function idChapterOf(id: string): number | null {
  const m = /-N-(?:NCERT|EXMPLR|EXEM2?)-(\d+)-/.exec(id);
  return m ? Number(m[1]) : null;
}

// ---------------------------------------------------------------------------------------------
// The syllabus screen. Three layers, each read from its ONE reference:
//   (1) `syllabusExclusion` (src/lib/boardQuestions/selectionRule.ts → syllabus2026-27.ts);
//   (2) the Maths `bannedSubtopics` of scripts/src/syllabusGuard.ts, matched EXACTLY against the
//       row's subtopic (the guard's own semantics), read from the guard file's text, never retyped;
//   (3) the Maths block of the guard's SURFACE_BANNED_PHRASES (unambiguous phrases), matched as
//       whole phrases in the question, options, steps and answer.
// ---------------------------------------------------------------------------------------------

const fold = (s: string) =>
  String(s ?? "").normalize("NFKC").replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim().toLowerCase();

function quotedStrings(block: string): string[] {
  const out: string[] = [];
  for (const line of block.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("//")) continue;
    // A list entry is `"text",` — a trailing `// comment` after the comma is not an entry.
    const code = t.replace(/,\s*\/\/.*$/, ",");
    for (const m of code.matchAll(/(["'])((?:\\.|(?!\1).)*)\1/g)) out.push(m[2].replace(/\\(.)/g, "$1"));
  }
  return out;
}

export interface GuardLists {
  bannedSubtopics: string[];
  surfacePhrases: string[];
}

/** The Maths lists of scripts/src/syllabusGuard.ts, parsed from its text. Throws if the shape moved. */
export function readSyllabusGuard(text: string = readFileSync(SYLLABUS_GUARD_FILE, "utf8")): GuardLists {
  const mathsAt = text.indexOf('subject: "Maths"');
  const listAt = text.indexOf("bannedSubtopics: [", mathsAt);
  const listEnd = text.indexOf("],", listAt);
  const surfaceAt = text.indexOf("export const SURFACE_BANNED_PHRASES");
  // Anchor on the section header itself ("// ── Maths — board-deleted …"), not on any "Maths".
  const mathsHead = text.indexOf("// ── Maths", surfaceAt);
  const blockStart = text.indexOf("\n", mathsHead);
  const nextHead = text.indexOf("// ──", blockStart);
  if (mathsAt < 0 || listAt < 0 || listEnd < 0 || surfaceAt < 0 || mathsHead < 0 || nextHead < 0) {
    throw new Error("selectSolutions: scripts/src/syllabusGuard.ts no longer has the Maths lists this reads.");
  }
  const bannedSubtopics = quotedStrings(text.slice(listAt + "bannedSubtopics: [".length, listEnd));
  const surfacePhrases = quotedStrings(text.slice(blockStart, nextHead));
  // Sentinels from each end of each list: a truncated or shifted parse fails loudly.
  const sentinels: Array<[string[], string]> = [
    [bannedSubtopics, "Euclid's Division Lemma"],
    [bannedSubtopics, "Constructing Similar Triangles"],
    [surfacePhrases, "Euclid's Division Lemma"],
    [surfacePhrases, "Division of a Line Segment"],
  ];
  const missing = sentinels.filter(([list, s]) => !list.includes(s)).map(([, s]) => s);
  if (missing.length || surfacePhrases.some((p) => /Periodic|Evolution|Energy/i.test(p))) {
    throw new Error(`selectSolutions: syllabusGuard parse looks wrong (missing ${missing.join(", ") || "-"}).`);
  }
  return { bannedSubtopics, surfacePhrases };
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function allText(q: Row): string {
  return [q.questionText, ...(q.options ?? []), ...(q.solutionSteps ?? []), q.finalAnswer, q.answer]
    .map((s) => String(s ?? ""))
    .join("\n");
}

export function syllabusReason(q: Row, guard: GuardLists): string | null {
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
// The rules.
// ---------------------------------------------------------------------------------------------

/** The page renders NO figure (SolutionsPage has no figure slot), so a row that needs one is out. */
export const NEEDS_FIGURE_TEXT =
  /\bfig(?:ure|ures|s)?\b\.?|\bfig\.|diagram|\bshown\b|\bgraph\b|\bdraw\b|adjoining|\bplotted\b|\bpicture\b/i;
/** A solution that points at a figure the page cannot show. */
export const NEEDS_FIGURE_STEPS =
  /\b(?:see|from|in|refer to|using) (?:the )?(?:given |adjoining |above |following )?(?:fig\.?|figure|diagram|graph)\b/i;
/** U+FFFD (built from its code), and the common UTF-8-read-as-Latin-1 shapes. */
const REPLACEMENT_CHAR = String.fromCharCode(0xfffd);
// (written with escapes so this file itself passes check:mojibake)
const MOJIBAKE = new RegExp(["\\u00C3.", "\\u00E2\\u20AC", "\\u00C2[^\\w]"].join("|"));
/** A paper mark bled into the text (same detector as checkimprove/boardQuestionPick.ts). */
export const MARK_BLEED = /[.:?]\s*[1-5]\s+(?:\(|[A-Z])/;
/** A drafting self-correction left in the text ("[Actually prove:]", "= 4s? Actually Area = r·s"). */
export const AUTHORING_ARTIFACT = /\[\s*actually\b|\?\s+actually\b/i;
/** Formats the NCERT / Exemplar books do not have: these rows are LazyTopper adaptations. */
const ADAPTED_FORMAT = /assertion|case[ -]?(?:based|study)/i;
const ADAPTED_ID = /-(?:AR|CB|CRE)-\d+$/;

/** A reference that names one real problem of the book; anything else is not a book question. */
const NCERT_REF =
  /^NCERT (?:Ex (\d+)\.(\d+) Q(\d+)(?:\([ivx]+(?:,[ivx]+)*\))?|Example (\d+)(?:\([ivx]+\))?)(?: \(([^()]*)\))?$/;
const EXEMPLAR_REF =
  /^Exemplar (?:Ch ?(\d+) )?(?:Ex (\d+)\.(\d+) Q(\d+)(?:\([ivx]+\))?|MCQ Q\d+|Sample (?:Question|Q) ?\d+|Sample LA Q\d+|LA Sample Q\d+)(?: \(([^()]*)\))?$/;
/** Qualifiers that mean the row was changed from the book's problem (or is not one). */
const NOT_THE_BOOK_QUALIFIER = /style|based|derived|concept|applied|extended|cross-check|design|section|§|theorem/i;

export type ExclusionReason =
  | "not-a-book-id"
  | "other-chapter"
  | "source-others"
  | "adapted-format"
  | "ref-not-a-book-question"
  | "ref-stale-numbering"
  | "syllabus"
  | "needs-figure"
  | "garbled"
  | "mcq-key-ambiguous"
  | "duplicate"
  | "ref-mismatch"
  | "held"
  | "unverified"
  | "thin-page"
  | "withheld";

export interface Classified {
  id: string;
  book: Book | null;
  reason: ExclusionReason | null;
  detail: string;
}

/** The first rule a row fails (null reason = candidate). Duplicates and the ledger are applied later. */
export function classifyRow(
  q: Row,
  spec: ChapterSpec,
  guard: GuardLists,
  withheld: ReadonlySet<string> = WITHHELD_QUESTION_IDS,
): Classified {
  const id = q.id;
  const book = bookOf(id);
  const out = (reason: ExclusionReason | null, detail = ""): Classified => ({ id, book, reason, detail });
  if (!book) return out("not-a-book-id");
  if (q.topicKey !== spec.bank) return out("other-chapter", `topicKey ${q.topicKey}`);
  // The chapter loader already drops withheld rows; checked again here so the rule stands on its own.
  if (withheld.has(id)) return out("withheld", "WITHHELD_QUESTION_IDS");
  const idCh = idChapterOf(id);
  // A bank chapter that spans two NCERT chapters (trigonometry: 8 and 9) splits on the id's number.
  if (spec.bank !== spec.slug && idCh !== spec.chapter) return out("other-chapter", `id chapter ${idCh}`);
  if (q.sourceOverride === "others") return out("source-others", "BANK-FIX-1: source not confirmed as NCERT");
  if (ADAPTED_FORMAT.test(String(q.format ?? "").trim()) || ADAPTED_ID.test(id)) {
    return out("adapted-format", `${q.format}: the book has no such item`);
  }
  const ref = String(q.ncertRef ?? "").trim();
  if (book === "ncert") {
    const m = NCERT_REF.exec(ref);
    // Groups: 1-3 = Ex chapter.section Q, 4 = Example number, 5 = the trailing "(note)".
    if (!m || (m[5] && NOT_THE_BOOK_QUALIFIER.test(m[5]))) return out("ref-not-a-book-question", ref);
    // The 2026-27 book renumbered chapters 11-14 (old 12-15) and its pages; a pre-2023 reference
    // cannot be shown on a 2026-27 page (the bank keeps it; a renumbering lane can fix it).
    if (m[1] && Number(m[1]) !== spec.chapter) return out("ref-stale-numbering", ref);
    if (m[5] && /\bpage\b/i.test(m[5])) return out("ref-stale-numbering", ref);
    const chq = m[5] ? /^Ch ?(\d+)$/.exec(m[5]) : null;
    if (chq && Number(chq[1]) !== spec.chapter) return out("ref-stale-numbering", ref);
  } else {
    const m = EXEMPLAR_REF.exec(ref);
    if (!m || (m[5] && NOT_THE_BOOK_QUALIFIER.test(m[5]) && !/^Applications$/i.test(m[5]))) {
      return out("ref-not-a-book-question", ref);
    }
    const ch = m[1] ?? m[2];
    if (ch && Number(ch) !== spec.exemplarChapter) return out("ref-stale-numbering", ref);
  }
  const syl = syllabusReason(q, guard);
  if (syl) return out("syllabus", syl);
  if (q.requiresDiagram === true) return out("needs-figure", "requiresDiagram");
  if (getFiguresForQuestion(id).length > 0) return out("needs-figure", "a bound figure the page does not render");
  if (NEEDS_FIGURE_TEXT.test(String(q.questionText ?? ""))) return out("needs-figure", "question refers to a figure/graph");
  if ((q.solutionSteps ?? []).some((s) => NEEDS_FIGURE_STEPS.test(String(s)))) {
    return out("needs-figure", "solution refers to a figure");
  }
  const text = allText(q);
  if (text.includes(REPLACEMENT_CHAR)) return out("garbled", "U+FFFD");
  if (MOJIBAKE.test(text)) return out("garbled", "mojibake");
  if (MARK_BLEED.test(String(q.questionText ?? ""))) return out("garbled", "mark bleed");
  if (AUTHORING_ARTIFACT.test(text)) return out("garbled", "drafting artifact");
  if (!String(q.questionText ?? "").trim() || !(q.solutionSteps ?? []).length || !String(q.finalAnswer ?? q.answer ?? "").trim()) {
    return out("garbled", "missing question, steps or answer");
  }
  if (Array.isArray(q.options) && q.options.length > 0) {
    if (correctOptionIndex(String(q.answer ?? ""), q.options) === null) return out("mcq-key-ambiguous", String(q.answer));
  }
  return out(null);
}

/** Questions that never get a typed verdict whatever their key looks like (D260). */
const NO_VERDICT_ASK = /\b(?:hence|also|both|roots|zeroes|zeros|values)\b/i;

export interface VerdictDecision {
  verdict: boolean;
  why: string;
}

/**
 * D260 typed-row opt-in, BY CODE: the key is ONE value (+ length unit) that compareAnswer parses
 * and compares to itself, the key has at most one "=", no list separators, and the question asks
 * for one thing. When in doubt: no verdict.
 */
export function verdictEligibility(q: Row): VerdictDecision {
  if (Array.isArray(q.options) && q.options.length > 0) return { verdict: false, why: "MCQ (option verdict)" };
  const key = String(q.finalAnswer ?? "").trim();
  const text = String(q.questionText ?? "");
  if (/\b(?:prove|show that)\b/i.test(text)) return { verdict: false, why: "proof" };
  if (/\b(?:verify|whether|true or false|yes or no|justify)\b/i.test(text)) return { verdict: false, why: "yes/no, true/false or verify, with reason" };
  if (/\((?:i|ii|iii|a|b)\)/i.test(text)) return { verdict: false, why: "multi-part" };
  if (NO_VERDICT_ASK.test(text)) return { verdict: false, why: "asks for more than one value" };
  if (!key) return { verdict: false, why: "no final answer" };
  if ((key.match(/=/g) ?? []).length > 1 || /[,;±]|\band\b|\bor\b/i.test(key)) return { verdict: false, why: "more than one value in the answer" };
  // compareAnswer reads only what follows "="; the left side must be a LABEL ("BD", "Height of
  // the pole"), never an expression ("x − y = 2" is a relation, not the value 2).
  const eq = key.indexOf("=");
  if (eq >= 0 && /[+\-−–×*/^²³√()]/.test(key.slice(0, eq))) return { verdict: false, why: "a relation, not one value" };
  // An approximated or rounded key, or a question that fixes an approximation (π = 22/7, √3 = 1.73,
  // "nearest", "correct to"), can mark a correct equivalent answer wrong (10√3 vs 17.32; 3.14 vs 22/7).
  const steps = (q.solutionSteps ?? []).join("\n");
  if (/π|\bpi\b|√\s*\d+\s*=|\bapprox|nearest|correct to|decimal place|significant/i.test(text)) {
    return { verdict: false, why: "approximation in the question" };
  }
  if (/≈|\bapprox|π/i.test(key) || /≈|\bapprox|\brounded\b|\bnearest\b/i.test(steps)) {
    return { verdict: false, why: "approximate / rounded key" };
  }
  if (parseRatio(key)) return { verdict: false, why: "ratio answer" };
  if (!parseQuantity(key)) return { verdict: false, why: "not one comparable value" };
  if (compareAnswer(key, key).verdict !== "right") return { verdict: false, why: "key does not compare to itself" };
  return { verdict: true, why: key };
}

/** Normalised text for duplicate detection. */
const dupKey = (s: string) => fold(s).replace(/[^a-z0-9]+/g, "");

/**
 * The book problem a reference names: the reference minus a trailing " (note)" qualifier, except a
 * page qualifier, which tells apart Exemplar "Sample Question 1 (page 50)" and "(page 54)".
 * A sub-part written without a space ("Q1(ii)") is part of the problem's name and is kept.
 */
export function refKey(book: Book, ref: string | undefined): string {
  const r = String(ref ?? "").trim();
  const m = / \(([^()]*)\)$/.exec(r);
  return `${book}|${m && !/\bpage\b/i.test(m[1]) ? r.slice(0, m.index) : r}`;
}

export interface SelectedRow {
  id: string;
  verdict: boolean;
  note: string;
}

export interface ChapterSelection {
  spec: ChapterSpec;
  ncert: SelectedRow[];
  exemplar: SelectedRow[];
  excluded: Classified[];
  /** SOLUTIONS-3: the CBSE board-pattern section, per published page. */
  board: BoardSelection;
}

/** The note written beside a published id (one short note per non-trivial row). */
export function rowNote(q: Row, v: VerdictDecision): string {
  if (Array.isArray(q.options) && q.options.length > 0) return "";
  const one = (s: string) => s.replace(/\s+/g, " ").replace(/\.$/, "").trim();
  if (v.verdict) return one(String(q.finalAnswer)).slice(0, 70);
  return v.why;
}

/**
 * The selection for one chapter page: candidate rows in bank order, minus duplicates (the first
 * of a repeated reference or a repeated question text in the same book wins), minus every id the
 * ledger HOLDs or marks a reference mismatch.
 */
export function selectChapter(
  rows: readonly Row[],
  spec: ChapterSpec,
  guard: GuardLists,
  ledger: Readonly<Record<string, LedgerEntry>> = SOLUTIONS_2_LEDGER,
  boardLedger: Readonly<Record<string, LedgerEntry>> = SOLUTIONS_3_BOARD_LEDGER,
): ChapterSelection {
  const sel: ChapterSelection = { spec, ncert: [], exemplar: [], excluded: [], board: { ncert: [], exemplar: [], excluded: [] } };
  // Pass 1: the rules. Candidates keep bank order.
  const candidates: Array<{ q: Row; c: Classified }> = [];
  for (const q of rows) {
    const c = classifyRow(q, spec, guard);
    if (c.reason === "not-a-book-id" || c.reason === "other-chapter") continue;
    if (c.reason) sel.excluded.push(c);
    else candidates.push({ q, c });
  }
  // Pass 2: one row per book reference. For the NCERT textbook (which has no MCQs) the typed row
  // wins over an MCQ adaptation of the same problem; otherwise the first in bank order wins.
  const isMcq = (q: Row) => Array.isArray(q.options) && q.options.length > 0;
  const winner = new Map<string, Row>();
  for (const { q, c } of candidates) {
    const rk = refKey(c.book!, q.ncertRef);
    const w = winner.get(rk);
    if (!w || (c.book === "ncert" && isMcq(w) && !isMcq(q))) winner.set(rk, q);
  }
  const seenText = new Map<string, string>();
  for (const { q, c } of candidates) {
    const book = c.book!;
    const w = winner.get(refKey(book, q.ncertRef))!;
    if (w !== q) {
      sel.excluded.push({ ...c, reason: "duplicate", detail: `same reference as ${w.id}` });
      continue;
    }
    const tk = `${book}|${dupKey(String(q.questionText))}`;
    const dupOf = seenText.get(tk);
    if (dupOf) {
      sel.excluded.push({ ...c, reason: "duplicate", detail: `same question as ${dupOf}` });
      continue;
    }
    seenText.set(tk, q.id);
    const l = ledger[q.id];
    // A row the verifiers never saw is not published (a later bank row cannot slip onto a public page).
    if (!l) {
      sel.excluded.push({ ...c, reason: "unverified", detail: "not in solutions2Ledger.ts" });
      continue;
    }
    if ((l.status === "publish" || l.status === "no-verdict") && l.hash !== rowHash(q)) {
      sel.excluded.push({ ...c, reason: "unverified", detail: "content changed since verification (hash)" });
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
    const code = verdictEligibility(q);
    const v = l.status === "no-verdict" && code.verdict ? { verdict: false, why: "verifier: not one value" } : code;
    sel[book].push({ id: q.id, verdict: v.verdict, note: rowNote(q, v) });
  }
  // A book page with fewer than MIN_ROWS_PER_PAGE rows is not published at all (a thin page is
  // worse than none); its rows stay verified in the ledger for when the bank grows.
  for (const book of ["ncert", "exemplar"] as const) {
    if (sel[book].length > 0 && sel[book].length < MIN_ROWS_PER_PAGE) {
      for (const r of sel[book]) {
        sel.excluded.push({ id: r.id, book, reason: "thin-page", detail: `only ${sel[book].length} publishable rows` });
      }
      sel[book] = [];
    }
  }
  // SOLUTIONS-3: the board-pattern section rides on the pages the book rows publish (never creates one).
  sel.board = selectBoard(rows, spec, guard, { ncert: sel.ncert.length > 0, exemplar: sel.exemplar.length > 0 }, boardLedger);
  return sel;
}

/** The fewest rows a published book page may have. */
export const MIN_ROWS_PER_PAGE = 5;

// ---------------------------------------------------------------------------------------------
// SOLUTIONS-3 (owner ruling 1, 18 Oct 2026) — the CBSE BOARD-PATTERN section.
//
// For 2026-27 Class 10 keeps the rationalised NCERT books, and neither the textbook nor the
// Exemplar has Assertion-Reason items: AR and case-based questions are a CBSE board-paper FORMAT.
// So these rows are published in ONE clearly labelled section per page ("CBSE board pattern:
// Assertion-Reason and case-based questions"), NEVER as numbered NCERT / Exemplar questions: the
// page shows the format, not the row's `ncertRef`.
//
// ★ CANDIDATES: the chapter's NCERT / Exemplar-id rows whose FORMAT is Assertion-Reason or
//   Case-Based. A "design task" (-CRE-) row in Short format is neither, so it stays out.
// ★ RULES (first failure is the reason): withheld · source "others" · not a board format · a
//   PYQ / board-paper claim without an official source · a book LOCATION cited in the text
//   (§ / Section / Theorem / Example / Exercise / page + number: a pre-2023 number would be
//   shown as fact, and the section must not read as book content) · syllabus · figure ·
//   garbled · AR without exactly four options and exactly one equal to the key · duplicate text ·
//   ledger (`solutions3BoardLedger.ts`, content-hash bound like SOLUTIONS-2).
// ★ PLACEMENT: a row goes on the page of the book its id names when that page is published, else
//   on the chapter's other published page; a chapter with no published book page shows none (no
//   URL is ever created for this section).
// ---------------------------------------------------------------------------------------------

export type BoardKind = "assertion-reason" | "case-based";

/** The board-paper format of a row, or null. Decided by `format` (the id suffix alone is not enough: -CRE- rows are Short). */
export function boardKindOf(q: Pick<Row, "format">): BoardKind | null {
  const f = String(q.format ?? "").trim();
  if (/assertion/i.test(f)) return "assertion-reason";
  if (/case[ -]?(?:based|study)/i.test(f)) return "case-based";
  return null;
}

/** A claim to be a past CBSE paper question (which then needs a board label AND an official source). */
export const PYQ_CLAIM = /\bPYQ\b|\bprevious year\b|\bCBSE\s*(?:board\s*)?(?:20\d\d|sample paper|SQP)\b|\bboard (?:exam|paper)\s*20\d\d\b/i;
/** A book location cited in the text: § / Section / Theorem / Example / Exercise / Ex / page + a number. */
export const BOOK_LOCATION_CITED = /§\s*\d|\b(?:Section|Theorem|Example|Exercise|Ex\.?|page|pg\.?)\s*\d/i;
/** "similar / congruent / plane figures": shapes, not a drawing (board-section figure screen only). */
export const FIGURE_AS_SHAPE =
  /\b(?:similar|congruent|plane|geometric(?:al)?)\s+figures?\b|\bfigures?\s+(?:are|is)\s+(?:similar|congruent)\b/gi;

export type BoardExclusionReason =
  | "withheld"
  | "source-others"
  | "not-board-format"
  | "pyq-without-official-source"
  | "cites-book-location"
  | "syllabus"
  | "needs-figure"
  | "garbled"
  | "ar-options"
  | "mcq-key-ambiguous"
  | "duplicate"
  | "held"
  | "unverified";

export interface BoardClassified {
  id: string;
  book: Book;
  kind: BoardKind | null;
  reason: BoardExclusionReason | null;
  detail: string;
}

/**
 * The first board-section rule a row fails (null reason = candidate), or null when the row is not
 * a board-section candidate at all (not an NCERT / Exemplar id of this chapter page, or not an
 * adapted AR / case / CRE row).
 */
export function classifyBoardRow(
  q: Row,
  spec: ChapterSpec,
  guard: GuardLists,
  withheld: ReadonlySet<string> = WITHHELD_QUESTION_IDS,
): BoardClassified | null {
  const id = q.id;
  const book = bookOf(id);
  if (!book || q.topicKey !== spec.bank) return null;
  if (spec.bank !== spec.slug && idChapterOf(id) !== spec.chapter) return null;
  if (!ADAPTED_FORMAT.test(String(q.format ?? "").trim()) && !ADAPTED_ID.test(id)) return null;
  const kind = boardKindOf(q);
  const out = (reason: BoardExclusionReason | null, detail = ""): BoardClassified => ({ id, book, kind, reason, detail });
  if (withheld.has(id)) return out("withheld", "WITHHELD_QUESTION_IDS");
  if (q.sourceOverride === "others") return out("source-others", "BANK-FIX-1: stays in the Practice Hub only");
  if (!kind) return out("not-board-format", `${q.format}: neither Assertion-Reason nor case-based`);
  const text = allText(q);
  // No row in this section is shown as a past paper: a PYQ claim would need its board label and an
  // official source, which these adapted rows do not carry.
  if (PYQ_CLAIM.test(text)) return out("pyq-without-official-source", "claims a CBSE paper without an official source");
  const cited = BOOK_LOCATION_CITED.exec([q.questionText, ...(q.solutionSteps ?? []), q.finalAnswer, q.answer].join("\n"));
  if (cited) return out("cites-book-location", cited[0]);
  const syl = syllabusReason(q, guard);
  if (syl) return out("syllabus", syl);
  if (q.requiresDiagram === true) return out("needs-figure", "requiresDiagram");
  if (getFiguresForQuestion(id).length > 0) return out("needs-figure", "a bound figure the page does not render");
  // "similar / congruent figures" names shapes (the Triangles concept), not a drawing the page lacks.
  if (NEEDS_FIGURE_TEXT.test(String(q.questionText ?? "").replace(FIGURE_AS_SHAPE, "shapes"))) {
    return out("needs-figure", "question refers to a figure/graph");
  }
  if ((q.solutionSteps ?? []).some((s) => NEEDS_FIGURE_STEPS.test(String(s)))) return out("needs-figure", "solution refers to a figure");
  if (text.includes(REPLACEMENT_CHAR)) return out("garbled", "U+FFFD");
  if (MOJIBAKE.test(text)) return out("garbled", "mojibake");
  if (MARK_BLEED.test(String(q.questionText ?? ""))) return out("garbled", "mark bleed");
  if (AUTHORING_ARTIFACT.test(text)) return out("garbled", "drafting artifact");
  if (!String(q.questionText ?? "").trim() || !(q.solutionSteps ?? []).length || !String(q.finalAnswer ?? q.answer ?? "").trim()) {
    return out("garbled", "missing question, steps or answer");
  }
  const opts = Array.isArray(q.options) ? q.options : [];
  if (kind === "assertion-reason" && opts.length !== 4) return out("ar-options", `${opts.length} options`);
  if (opts.length > 0 && correctOptionIndex(String(q.answer ?? ""), opts) === null) return out("mcq-key-ambiguous", String(q.answer));
  return out(null);
}

export interface BoardSelection {
  ncert: SelectedRow[];
  exemplar: SelectedRow[];
  excluded: BoardClassified[];
}

/** The book page a board row is shown on (its id's book when published, else the other), or null. */
export function boardPageFor(book: Book, published: Readonly<Record<Book, boolean>>): Book | null {
  if (published[book]) return book;
  const other: Book = book === "ncert" ? "exemplar" : "ncert";
  return published[other] ? other : null;
}

/** The board-pattern section of one chapter page (bank order; AR rows have an option verdict, case rows none). */
export function selectBoard(
  rows: readonly Row[],
  spec: ChapterSpec,
  guard: GuardLists,
  published: Readonly<Record<Book, boolean>>,
  ledger: Readonly<Record<string, LedgerEntry>> = SOLUTIONS_3_BOARD_LEDGER,
): BoardSelection {
  const sel: BoardSelection = { ncert: [], exemplar: [], excluded: [] };
  const seenText = new Map<string, string>();
  for (const q of rows) {
    const c = classifyBoardRow(q, spec, guard);
    if (!c) continue;
    if (c.reason) {
      sel.excluded.push(c);
      continue;
    }
    const tk = dupKey(String(q.questionText));
    const dupOf = seenText.get(tk);
    if (dupOf) {
      sel.excluded.push({ ...c, reason: "duplicate", detail: `same question as ${dupOf}` });
      continue;
    }
    seenText.set(tk, q.id);
    const l = ledger[q.id];
    if (!l) {
      sel.excluded.push({ ...c, reason: "unverified", detail: "not in solutions3BoardLedger.ts" });
      continue;
    }
    if (l.status === "hold" || l.status === "ref-mismatch") {
      sel.excluded.push({ ...c, reason: "held", detail: l.note });
      continue;
    }
    if (l.hash !== rowHash(q)) {
      sel.excluded.push({ ...c, reason: "unverified", detail: "content changed since verification (hash)" });
      continue;
    }
    const page = boardPageFor(c.book, published);
    if (!page) continue; // the chapter has no published page: nothing to attach the section to
    sel[page].push({ id: q.id, verdict: false, note: c.kind === "assertion-reason" ? "" : "case-based" });
  }
  return sel;
}

// ---------------------------------------------------------------------------------------------
// Emitting the allowlist block.
// ---------------------------------------------------------------------------------------------

export const BLOCK_BEGIN = "  // <SOLUTIONS-2:BEGIN> generated by scripts/solutions/selectSolutions.ts --write; do not hand-edit";
export const BLOCK_END = "  // <SOLUTIONS-2:END>";

const commentSafe = (s: string) => s.replace(/\*\//g, "* /");

function emitRows(rows: readonly SelectedRow[]): string {
  return rows
    .map((r) => `      ${r.verdict ? "v" : "r"}(${JSON.stringify(r.id)}),${r.note ? ` // ${commentSafe(r.note)}` : ""}`)
    .join("\n");
}

/** SOLUTIONS-3: the `boardPattern` lines of a chapter (none when the section is empty). */
function emitBoard(b: BoardSelection): string[] {
  if (b.ncert.length + b.exemplar.length === 0) return [];
  const list = (rows: readonly SelectedRow[]) =>
    rows.length ? `[\n${rows.map((r) => `  ${emitRows([r])}`).join("\n")}\n      ]` : "[]";
  return [
    `    boardPattern: {`,
    `      ncert: ${list(b.ncert)},`,
    `      exemplar: ${list(b.exemplar)},`,
    `    },`,
  ];
}

/** The chapter as solutionsPublishSafe.ts will hold it (for the head-text ladders). */
function asChapter(s: ChapterSelection, shortTitle?: string): SolutionsChapter {
  const { spec } = s;
  return {
    slug: spec.slug,
    ...(spec.bank !== spec.slug ? { bank: spec.bank } : {}),
    subject: "Maths",
    chapter: spec.chapter,
    ...(spec.exemplarChapter !== spec.chapter ? { exemplarChapter: spec.exemplarChapter } : {}),
    title: spec.title,
    ...(shortTitle ? { shortTitle } : {}),
    decision: SOLUTIONS_2_DECISION,
    ncert: s.ncert.map((r) => ({ id: r.id })),
    exemplar: s.exemplar.map((r) => ({ id: r.id })),
  };
}

/**
 * `shortTitle` is written ONLY when a head title / description cannot fit its cap with the full
 * NCERT title; it is then the chapter's topics.ts name ("Pair of Linear Equations").
 */
export function shortTitleFor(s: ChapterSelection): string | undefined {
  const full = asChapter(s);
  try {
    for (const b of booksOf(full)) {
      solutionsHeadTitle(b, full);
      solutionsHeadDescription(b, full);
    }
    return undefined;
  } catch {
    return s.spec.topicName && s.spec.topicName !== s.spec.title ? s.spec.topicName : undefined;
  }
}

export const SOLUTIONS_2_DECISION = "SOLUTIONS-2 (owner 18 Oct)";

export function emitBlock(selections: readonly ChapterSelection[]): string {
  const parts = selections
    .filter((s) => s.ncert.length + s.exemplar.length > 0)
    .map((s) => {
      const { spec } = s;
      const short = shortTitleFor(s);
      const extra = [
        spec.bank !== spec.slug ? `    bank: ${JSON.stringify(spec.bank)},` : null,
      ].filter((x): x is string => x !== null);
      return [
        "  {",
        `    slug: ${JSON.stringify(spec.slug)},`,
        ...extra,
        '    subject: "Maths",',
        `    chapter: ${spec.chapter},`,
        ...(spec.exemplarChapter !== spec.chapter ? [`    exemplarChapter: ${spec.exemplarChapter},`] : []),
        `    title: ${JSON.stringify(spec.title)},`,
        ...(short ? [`    shortTitle: ${JSON.stringify(short)},`] : []),
        `    decision: ${JSON.stringify(SOLUTIONS_2_DECISION)},`,
        s.ncert.length ? `    ncert: [\n${emitRows(s.ncert)}\n    ],` : "    ncert: [],",
        s.exemplar.length ? `    exemplar: [\n${emitRows(s.exemplar)}\n    ],` : "    exemplar: [],",
        ...emitBoard(s.board),
        "  },",
      ].join("\n");
    });
  return [BLOCK_BEGIN, ...parts, BLOCK_END].join("\n");
}

export const PAGES_BEGIN =
  "  // <SOLUTIONS-2-PAGES:BEGIN> generated by scripts/solutions/selectSolutions.ts --write; do not hand-edit";
export const PAGES_END = "  // <SOLUTIONS-2-PAGES:END>";

/** The light `SOLUTIONS_PAGES` entries: slug + the books that have rows (never an empty page). */
export function emitPagesBlock(selections: readonly ChapterSelection[]): string {
  const lines = selections
    .map((s) => ({ slug: s.spec.slug, books: (["ncert", "exemplar"] as const).filter((b) => s[b].length > 0) }))
    .filter((p) => p.books.length > 0)
    .map((p) => `  { slug: ${JSON.stringify(p.slug)}, books: [${p.books.map((b) => JSON.stringify(b)).join(", ")}] },`);
  return [PAGES_BEGIN, ...lines, PAGES_END].join("\n");
}

/** Replace a generated block. Throws when the markers are missing. */
export function replaceBlock(source: string, block: string, begin = BLOCK_BEGIN, end = BLOCK_END): string {
  const eol = source.includes("\r\n") ? "\r\n" : "\n"; // keep the file's own line endings
  const s = source.replace(/\r\n/g, "\n");
  const a = s.indexOf(begin);
  const b = s.indexOf(end);
  if (a < 0 || b < a) throw new Error(`selectSolutions: markers ${begin.trim().slice(0, 30)}… not found`);
  return (s.slice(0, a) + block + s.slice(b + end.length)).replace(/\n/g, eol);
}

/** A committed block, as text (for the determinism guard). Line endings normalised to LF. */
export function committedBlock(
  source: string = readFileSync(PUBLISH_SAFE_FILE, "utf8"),
  begin = BLOCK_BEGIN,
  end = BLOCK_END,
): string {
  const s = source.replace(/\r\n/g, "\n");
  const a = s.indexOf(begin);
  const b = s.indexOf(end);
  if (a < 0 || b < a) throw new Error("selectSolutions: markers not found");
  return s.slice(a, b + end.length);
}

export async function selectAll(ledger: Readonly<Record<string, LedgerEntry>> = SOLUTIONS_2_LEDGER): Promise<ChapterSelection[]> {
  const { ensureBankSubject, getBankRows } = await import("../../src/data/bankChapters/loader");
  await ensureBankSubject("Maths");
  const guard = readSyllabusGuard();
  return solutions2Chapters().map((spec) => selectChapter(getBankRows([spec.bank]) as Row[], spec, guard, ledger));
}

async function main(argv: string[]): Promise<void> {
  const selections = await selectAll();
  if (argv.includes("--report")) {
    for (const s of selections) {
      const by = new Map<string, number>();
      for (const e of s.excluded) by.set(`${e.book}:${e.reason}`, (by.get(`${e.book}:${e.reason}`) ?? 0) + 1);
      console.log(
        `${s.spec.slug}\tncert ${s.ncert.length} (v ${s.ncert.filter((r) => r.verdict).length})\t` +
          `exemplar ${s.exemplar.length} (v ${s.exemplar.filter((r) => r.verdict).length})\t` +
          [...by.entries()].map(([k, n]) => `${k}=${n}`).join(" "),
      );
    }
    if (argv.includes("--excluded")) {
      for (const s of selections) for (const e of s.excluded) console.log(`EXCL\t${s.spec.slug}\t${e.id}\t${e.reason}\t${e.detail}`);
    }
  }
  if (argv.includes("--board")) {
    for (const s of selections) {
      console.log(`BOARD\t${s.spec.slug}\tncert ${s.board.ncert.length}\texemplar ${s.board.exemplar.length}`);
      for (const e of s.board.excluded) console.log(`BOARD-EXCL\t${s.spec.slug}\t${e.id}\t${e.reason}\t${e.detail}`);
    }
  }
  const bi = argv.indexOf("--board-candidates");
  if (bi >= 0) {
    // Every row that passes the board-section RULES (before the ledger), with its content hash: the verifiers' input.
    const { getBankRows } = await import("../../src/data/bankChapters/loader");
    const guard = readSyllabusGuard();
    // All 14 chapters: the Triangles pilot's board rows are verified into the same ledger.
    const out = maths202627Chapters().flatMap((spec) =>
      (getBankRows([spec.bank]) as Row[]).flatMap((q) => {
        const c = classifyBoardRow(q, spec, guard);
        return c ? [{ slug: spec.slug, id: q.id, kind: c.kind, reason: c.reason, detail: c.detail, hash: rowHash(q) }] : [];
      }),
    );
    writeFileSync(argv[bi + 1], JSON.stringify(out, null, 1));
    console.log(`board candidates: ${out.length} -> ${argv[bi + 1]}`);
  }
  const ci = argv.indexOf("--candidates");
  if (ci >= 0) {
    const { getBankRows } = await import("../../src/data/bankChapters/loader");
    const out = selections.flatMap((s) => {
      const byId = new Map((getBankRows([s.spec.bank]) as Row[]).map((q) => [q.id, q] as const));
      return (["ncert", "exemplar"] as const).flatMap((book) =>
        s[book].map((r) => ({
          slug: s.spec.slug,
          chapter: s.spec.chapter,
          exemplarChapter: s.spec.exemplarChapter,
          book,
          verdict: r.verdict,
          row: byId.get(r.id),
        })),
      );
    });
    writeFileSync(argv[ci + 1], JSON.stringify(out, null, 1));
    console.log(`candidates: ${out.length} -> ${argv[ci + 1]}`);
  }
  if (argv.includes("--write")) {
    const src = readFileSync(PUBLISH_SAFE_FILE, "utf8");
    writeFileSync(PUBLISH_SAFE_FILE, replaceBlock(src, emitBlock(selections)));
    const pages = readFileSync(PAGES_FILE, "utf8");
    writeFileSync(PAGES_FILE, replaceBlock(pages, emitPagesBlock(selections), PAGES_BEGIN, PAGES_END));
    console.log("solutionsPublishSafe.ts + solutionsPages.ts: SOLUTIONS-2 blocks written");
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
