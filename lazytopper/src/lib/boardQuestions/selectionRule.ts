/**
 * selectionRule — THE deterministic rule that picks the board questions published
 * on every notes page (lane CBQ-TAB-1).
 *
 * This module is the SINGLE definition of the rule. It is consumed by exactly two
 * callers, and deliberately by NOTHING in the app:
 *   1. `scripts/generateBoardQuestions.ts` — emits `boardQuestions.generated.ts`.
 *   2. `boardQuestions.guard.test.ts`      — re-runs it against the LIVE bank and
 *                                            asserts the artifact still matches.
 *
 * ★ WHY THE APP DOES NOT IMPORT THIS FILE.
 * `<Note>` imports the GENERATED artifact only. Importing the live bank into the
 * note would pull `src/data/questionBanks/` — 11 MB across 413 files — into the
 * notes-page chunk on all 26 prerendered pages. That is the PERF-1 regression
 * already on record in this repo (topic hubs froze 10.6 s on one module-scope
 * line; main chunk 9,988 kB), and it would land on the exact surface this lane
 * exists to make fast and crawlable. The artifact is 59 kB. Keep it that way:
 * this module takes the bank as an ARGUMENT and imports none of it, so the
 * coupling cannot be reintroduced by accident.
 *
 * The rule itself is fixed by owner ruling and must not be "improved" in place —
 * changing it silently rewrites what 26 published pages say.
 */

import { isPublishable } from "../../../scripts/seo/publishability";
// The ONE syllabus reference (owner ruling 6). `SYLLABUS_2026_27_SOURCE` is the scout JSON
// verbatim, deep-equal to the transitional fixture it replaces (FU-B16-SYLLABUS-FIXTURE-SWITCH,
// closed in SYLLABUS-FIX-CONTENT PR-3), so the item-index phrase table resolves identically.
import { SYLLABUS_2026_27_SOURCE as SYLLABUS_2026_27_SCOUT_FIXTURE } from "../../config/syllabus2026-27";

/** Questions published per topic. Owner ruling (a): N = 3, across all 26 topics. */
export const BOARD_QUESTION_COUNT = 3;

/**
 * ★ CODEPOINT ORDER — DO NOT "SIMPLIFY" THIS TO `localeCompare`. THIS IS LOAD-BEARING.
 *
 * `localeCompare` uses ICU collation, which varies with the Node build (small-icu
 * vs full-icu) and with the locale. The published selection would then differ
 * between machines, and the prerendered artifact would churn on every capture —
 * the precise failure this rule exists to prevent.
 *
 * This is not theoretical. 41 of the bank's 8,545 ids are lowercase
 * (`HE-D01a`, `OE-E01a`, `sci-phy-elec-3m-2026-01`, ...), and ICU interleaves case
 * while codepoint order does not. Measured 2026-09-18: codepoint and
 * `localeCompare` disagree at index 1762 of the qualifying pool under EVERY locale
 * tested (en-US, de-DE, sv-SE, tr-TR) — codepoint `SCO-S-ACID-001` vs locale
 * `sci-phy-elec-3m-2026-01`. The two comparators genuinely pick different
 * questions.
 *
 * `<` / `>` on strings is UTF-16 code-unit order, defined by the ECMAScript spec.
 * It is identical on every engine, every ICU build and every locale.
 */
export const compareById = (a: string, b: string): number =>
  a < b ? -1 : a > b ? 1 : 0;

/** The bank fields this rule reads. Structural on purpose — this module must not
 *  drag the bank's own type (and therefore the bank) into its consumers. */
export interface SelectableQuestion {
  id: string;
  subject: string;
  topicKey: string;
  subtopic?: string;
  questionText: string;
  marks: number;
  section: string;
  solutionSteps?: string[];
  pyqYear?: string;
  isCompetencyBased?: boolean;
  requiresDiagram?: boolean;
  answer?: string;
}

/** One published question, exactly as the note renders it. */
export interface BoardQuestionRow {
  id: string;
  questionText: string;
  marks: number;
  section: string;
  solutionSteps: readonly string[];
  /** Present only where the row genuinely carries a board year. Measured
   *  2026-09-18: 3 of the 78 selected rows do. §2.2 renders it only when present. */
  pyqYear?: string;
}

/**
 * The practice subject for a topic, as the practice ROUTE spells it.
 *
 * ⚠ This is derived from the BANK (`q.subject`), never from the note spec.
 * `NoteMeta.subject` has FOUR values (physics | chemistry | biology | maths), and
 * `normaliseSubject` (practiceQuestionBuilder.ts:325-329) maps anything that is not
 * "science"/"sci" to Maths WITHOUT ERRORING. Deriving the CTA subject from the note
 * spec would therefore serve maths questions on a physics note, silently. The bank's
 * `subject` is already exactly "Maths" | "Science"; every one of the 26 topics maps
 * to exactly one of them (asserted by the guard test).
 */
export type PracticeSubject = "maths" | "science";

export interface BoardQuestionTopic {
  subject: PracticeSubject;
  questions: readonly BoardQuestionRow[];
}

export type BoardQuestionArtifact = Readonly<Record<string, BoardQuestionTopic>>;

export const toPracticeSubject = (bankSubject: string): PracticeSubject =>
  bankSubject.toLowerCase() === "science" ? "science" : "maths";

// ---------------------------------------------------------------------------
// SYLLABUS FILTER — CBSE 2026-27 (SYLLABUS-FIX-CONTENT PR-1)
// ---------------------------------------------------------------------------
// The notes "Questions" tab must never publish a question on content the 2026-27
// curriculum PDFs mark OUT (absent / beyond a limit) or FORMATIVE (assessed only
// formatively). Two layers, both read from the ONE reference (`src/config/syllabus2026-27.ts`):
//   1. whole chapters whose reference status is OUT or FORMATIVE;
//   2. per-chapter OUT / FORMATIVE items, each recognised by the phrases below.
// Every phrase entry names the reference item it implements (`slug`, `kind`,
// `item` index); `SYLLABUS_PHRASES` throws at module load if that item does not
// exist, so the phrase table cannot drift away from the reference silently.
// The phrases are a recogniser for the reference items, not a second syllabus.
// `WITHHELD_QUESTION_IDS` stays the primary gate (see `qualifies`).

type ReferenceKind = "out" | "formative";

interface ReferenceChapter {
  slug: string;
  status?: string;
  out?: readonly { item: string }[];
  formative?: readonly { item: string }[];
}

const REFERENCE_CHAPTERS: readonly ReferenceChapter[] = [
  ...SYLLABUS_2026_27_SCOUT_FIXTURE.maths.chapters,
  ...SYLLABUS_2026_27_SCOUT_FIXTURE.science.chapters,
] as readonly ReferenceChapter[];

/** Chapters the reference marks OUT or FORMATIVE as a whole. */
export const SYLLABUS_EXCLUDED_CHAPTERS: ReadonlySet<string> = new Set(
  REFERENCE_CHAPTERS.filter((c) => c.status === "OUT" || c.status === "FORMATIVE").map((c) => c.slug),
);

interface PhraseEntry {
  slug: string;
  kind: ReferenceKind;
  item: number;
  /** "any" = subtopic + question text; "subtopic" = the subtopic label only
   *  (for words that also appear as harmless context in IN questions). */
  field: "any" | "subtopic";
  phrases: readonly string[];
}

const PHRASES: readonly PhraseEntry[] = [
  { slug: "real-numbers", kind: "out", item: 0, field: "any", phrases: ["euclid's division", "division lemma"] },
  { slug: "real-numbers", kind: "out", item: 1, field: "any", phrases: ["decimal expansion", "terminating decimal", "non-terminating"] },
  { slug: "polynomials", kind: "out", item: 0, field: "any", phrases: ["α + β + γ", "α+β+γ", "αβγ", "zeroes of cubic", "zeros of cubic", "zeroes of a cubic", "zeros of a cubic"] },
  { slug: "polynomials", kind: "out", item: 1, field: "any", phrases: ["division algorithm", "long division"] },
  { slug: "pair-of-linear-equations", kind: "out", item: 0, field: "any", phrases: ["cross-multiplication", "cross multiplication"] },
  { slug: "pair-of-linear-equations", kind: "out", item: 1, field: "any", phrases: ["reducible to a pair", "reducible to linear", "reducible to a linear"] },
  { slug: "quadratic-equations", kind: "out", item: 0, field: "any", phrases: ["completing the square"] },
  { slug: "quadratic-equations", kind: "out", item: 1, field: "any", phrases: ["complex root", "non-real root"] },
  { slug: "coordinate-geometry", kind: "out", item: 0, field: "any", phrases: ["area of a triangle", "area of triangle", "area of the triangle", "collinearity via area"] },
  { slug: "coordinate-geometry", kind: "out", item: 1, field: "any", phrases: ["external division", "divides externally", "externally in the ratio"] },
  { slug: "triangles", kind: "out", item: 0, field: "any", phrases: ["ratio of the areas", "ratio of areas", "ratio of their areas", "areas of similar triangles", "area ratio"] },
  { slug: "triangles", kind: "out", item: 1, field: "any", phrases: ["converse of pythagoras", "prove the pythagoras", "pythagoras theorem states"] },
  { slug: "triangles", kind: "out", item: 2, field: "any", phrases: ["prove the converse of the basic proportionality", "prove the converse of bpt"] },
  { slug: "circles", kind: "out", item: 0, field: "any", phrases: ["construct a tangent", "construction of tangent", "constructions"] },
  { slug: "trigonometry", kind: "out", item: 0, field: "any", phrases: ["complementary angle", "(90° −", "(90°−", "(90° -", "(90°-"] },
  { slug: "surface-areas-and-volumes", kind: "out", item: 0, field: "any", phrases: ["frustum"] },
  { slug: "surface-areas-and-volumes", kind: "out", item: 1, field: "any", phrases: ["melted", "recast", "reshape"] },
  { slug: "statistics", kind: "out", item: 0, field: "any", phrases: ["ogive", "cumulative frequency curve", "cumulative frequency graph"] },
  { slug: "acids-bases-and-salts", kind: "out", item: 0, field: "any", phrases: ["-log", "−log", "logarithm"] },
  { slug: "light-reflection-and-refraction", kind: "out", item: 0, field: "any", phrases: ["derive the mirror formula", "derive the lens formula", "derivation of the mirror formula", "derivation of the lens formula"] },
  { slug: "light-reflection-and-refraction", kind: "out", item: 1, field: "any", phrases: ["critical angle", "total internal reflection", "lens maker", "lens-maker", "apparent depth", "minimum deviation"] },
  { slug: "human-eye-and-colourful-world", kind: "out", item: 0, field: "any", phrases: ["colour of the sun at sunrise", "color of the sun at sunrise", "sun appears red", "sun appear red", "reddish", "red at sunrise", "red at sunset", "red near the horizon", "reddening"] },
  { slug: "heredity", kind: "formative", item: 0, field: "any", phrases: ["speciation", "fossil", "acquired trait", "acquired and inherited", "evolutionary", "theory of evolution", "human evolution", "evolution by stages", "homologous organ", "analogous organ", "artificial selection"] },
  { slug: "magnetic-effects-of-electric-current", kind: "formative", item: 0, field: "any", phrases: ["electromagnetic induction", "induced current", "electric generator", "ac generator", "dc generator", "galvanometer", "fleming's right", "fleming’s right", "fleming right"] },
  { slug: "magnetic-effects-of-electric-current", kind: "formative", item: 0, field: "subtopic", phrases: ["electric motor", "electromagnetic induction", "generator"] },
];

/** The phrase table, each entry checked against the reference item it names. */
export const SYLLABUS_PHRASES: readonly (PhraseEntry & { referenceItem: string })[] = PHRASES.map((e) => {
  const chapter = REFERENCE_CHAPTERS.find((c) => c.slug === e.slug);
  const referenceItem = chapter?.[e.kind]?.[e.item]?.item;
  if (!referenceItem) {
    throw new Error(`selectionRule: syllabus phrase entry ${e.slug}/${e.kind}[${e.item}] has no reference item.`);
  }
  return { ...e, referenceItem };
});

/**
 * Why a question falls outside the 2026-27 board syllabus, or `null` if it does not.
 * Matching is case-insensitive substring, scoped to the question's own chapter.
 */
export function syllabusExclusion(q: Pick<SelectableQuestion, "topicKey" | "subtopic" | "questionText">): string | null {
  if (SYLLABUS_EXCLUDED_CHAPTERS.has(q.topicKey)) return `${q.topicKey}: chapter is OUT/FORMATIVE for 2026-27`;
  const subtopic = (q.subtopic ?? "").toLowerCase();
  const any = `${subtopic}\n${(q.questionText ?? "").toLowerCase()}`;
  for (const e of SYLLABUS_PHRASES) {
    if (e.slug !== q.topicKey) continue;
    const hay = e.field === "subtopic" ? subtopic : any;
    const hit = e.phrases.find((p) => hay.includes(p));
    if (hit) return `${e.slug} ${e.kind.toUpperCase()}: ${e.referenceItem} (matched "${hit}")`;
  }
  return null;
}

/**
 * §2.3 — EXACTLY these filters, and no others.
 *
 * ★ `AI_GENERATED_SOLUTION_IDS` is deliberately NOT consulted. Owner ruling (b),
 * 2026-09-17: the bank was built with proper scrutiny and AI-generated SOLUTIONS
 * are included. It is a DIFFERENT id-set from `AI_GENERATED_QUESTION_IDS`, which IS
 * an exclusion. Do not "fix" this by adding the solution set — that would empty
 * topics that the owner has ruled publishable.
 *
 * SYLLABUS-FIX-CONTENT PR-1 added one filter: `syllabusExclusion` (the CBSE 2026-27
 * syllabus). `withheldIds` was already honoured and still is.
 */
export function qualifies(
  q: SelectableQuestion,
  aiQuestionIds: ReadonlySet<string>,
  withheldIds: ReadonlySet<string>,
): boolean {
  if (q.isCompetencyBased !== true) return false;
  if (aiQuestionIds.has(q.id)) return false;
  if (withheldIds.has(q.id)) return false;
  if (syllabusExclusion(q) !== null) return false;
  return isPublishable(q, aiQuestionIds).ok;
}

/**
 * Run the rule over a bank. Returns topics in codepoint order, each with its
 * `BOARD_QUESTION_COUNT` questions in codepoint id order.
 *
 * Throws — loudly, naming the topic — if any topic cannot be filled. §2.5: the
 * scout measured 26/26 at N=3, so a shortfall means the bank MOVED and the owner
 * must know. This throw runs at BUILD time (generator) and in CI (guard test),
 * never in the browser: a throw on a prerendered page would not fail a build, it
 * would paint the error boundary — the soft-404 mechanism already on record here.
 */
export function selectBoardQuestions(
  bank: readonly SelectableQuestion[],
  aiQuestionIds: ReadonlySet<string>,
  withheldIds: ReadonlySet<string>,
  count: number = BOARD_QUESTION_COUNT,
): BoardQuestionArtifact {
  const topics = [...new Set(bank.map((q) => q.topicKey))].sort(compareById);
  const out: Record<string, BoardQuestionTopic> = {};
  const short: string[] = [];

  // Bucket by topicKey in ONE pass, rather than filtering the whole bank once per
  // topic. Note there is deliberately no `q.topicKey === topicKey` compare anywhere
  // here: `topickey_guard_acceptance.mjs` Guard B flags raw `.topicKey ===` compares
  // because they are the bank-question-vs-chosen-topic bug pattern, and bucketing
  // sidesteps the pattern entirely instead of asking for an allowlist exemption.
  // (It is also O(n) instead of O(26n) over 8,545 rows.)
  const byTopic = new Map<string, SelectableQuestion[]>();
  for (const q of bank) {
    if (!qualifies(q, aiQuestionIds, withheldIds)) continue;
    const bucket = byTopic.get(q.topicKey);
    if (bucket) bucket.push(q);
    else byTopic.set(q.topicKey, [q]);
  }

  for (const topicKey of topics) {
    const pool = (byTopic.get(topicKey) ?? []).sort((a, b) => compareById(a.id, b.id));

    if (pool.length < count) {
      short.push(`${topicKey} (${pool.length} of ${count})`);
      continue;
    }

    out[topicKey] = {
      subject: toPracticeSubject(pool[0].subject),
      questions: pool.slice(0, count).map((q) => {
        const row: BoardQuestionRow = {
          id: q.id,
          questionText: q.questionText,
          marks: q.marks,
          section: q.section,
          solutionSteps: [...(q.solutionSteps ?? [])],
        };
        if (q.pyqYear) row.pyqYear = q.pyqYear;
        return row;
      }),
    };
  }

  if (short.length > 0) {
    throw new Error(
      `CBQ-TAB-1: ${short.length} topic(s) cannot be filled at N=${count}: ${short.join(", ")}. ` +
        `The bank has moved. Do NOT render fewer and do NOT fall back silently — ` +
        `re-run the generator and have the owner review the shortfall.`,
    );
  }

  return out;
}
