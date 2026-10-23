// src/components/practice/practiceFilters.ts
//
// FILTER-FIX-1 — THE single source of truth for what the Quick Practice filters CLASSIFY.
//
// One pure predicate, `questionMatchesFilters`, decides whether a bank row passes the
// Marks / Style / Source / Difficulty filters (plus a Topic Hub concept's exact mark
// range). PracticePage's served set, the "N available" hint, and the chip counts that
// grey a chip out (`chipCounts`, below) all call it, so the three can never disagree.
// PracticePage re-exports `questionMatchesFilters` for its existing importers.
//
// Bank-free by design: pure functions over a row (only a TYPE import from the data layer).
//
// What FILTER-FIX-1 changed, against the real bank (trunk 49e82c5e):
//   · Others  = not PYQ AND not NCERT, through the SAME `isNcertSourceId` the NCERT filter
//     uses. The old Others regex missed `-EXEM2-` ids, so 100 exemplar rows showed under
//     BOTH NCERT and Others.
//   · Proof / Derivation — the proof phrase is matched ANYWHERE in the question (word
//     boundaries), not only at the start of the first 80 chars; Science derivations
//     (derive, derivation, obtain an expression / relation / formula, deduce) count; an
//     "activity / experiment to show that" is a practical, not a proof. The old
//     "Long + Analysing in section C/D" rule added 350 non-proofs and is gone.
//   · Marks "4" = section E or exactly 4 marks. "Formatted Case-Based" alone no longer
//     qualifies (a 2-mark and a 3-mark case item sat in the 4-mark bucket).
//   · HOTS is no longer tied to Hard — that lock lived in the UI, not here.
//   GUIDE-FILTER-1 (owner ruling 23 Oct 2026): HOTS = higher-order bloom at Medium / Hard only
//   (see isHotsRow).

import type { PracticeQuestion } from "../../data/predictionDataService";
import { isCbq } from "../../lib/cbq/cbqClassification";

export interface MarksRange { min: number; max: number; }

/** Marks bucket tokens the Marks row offers ("all" = no filter). */
export const MARKS_FILTER_VALUES = ["all", "1", "23", "5", "4"] as const;
/** Style tokens the Style row offers. */
export const STYLE_FILTER_VALUES = ["all", "proof", "ar", "hots", "case", "cbq"] as const;
/** Source tokens the Source row offers. */
export const SOURCE_FILTER_VALUES = ["all", "pyq", "ncert", "others"] as const;
/** Difficulty tokens the Difficulty row offers. */
export const DIFF_FILTER_VALUES = ["all", "Easy", "Medium", "Hard"] as const;

/** The set of buckets active for a committed marks token ("all" -> empty set). */
export const marksTokenToBucketSet = (token: string): Set<string> =>
  token === "all" ? new Set() : new Set(token.split(",").filter(Boolean));

const str = (v: unknown): string => String(v ?? "");

/** NCERT textbook / Exemplar source, by id. The ONE rule both the NCERT and Others filters use. */
export const isNcertSourceId = (rawId: string): boolean => {
  const qid = rawId.toLowerCase();
  return (
    /^(rn-n-|poly-n-|ple-n-|qe-n-|ap-n-|tri-n-|cg-n-|trig-n-|circ-n-|arc-n-|sav-n-|stat-n-|prob-n-)/.test(qid) ||
    /ncert|exemplar/.test(qid) ||
    /-exmplr-|-ncert-|-exem\d*-/.test(qid)
  );
};

/** BANK-FIX-1 ruling 2: a corrected / unconfirmed row is filed under "Others" only. */
const isSourceOverridden = (q: PracticeQuestion): boolean =>
  (q as { sourceOverride?: unknown }).sourceOverride === "others";

/** A board-paper PYQ (never when the source is overridden). */
export const isPyqRow = (q: PracticeQuestion): boolean =>
  !isSourceOverridden(q) &&
  (Boolean((q as { pyqYear?: unknown }).pyqYear) || Boolean((q as { isPYQ?: unknown }).isPYQ));

/** The source bucket a row is filed under — exactly one of pyq / ncert / others. */
export const sourceBucketOf = (q: PracticeQuestion): "pyq" | "ncert" | "others" => {
  if (isSourceOverridden(q)) return "others";
  if (isPyqRow(q)) return "pyq";
  if (isNcertSourceId(str((q as { id?: unknown }).id))) return "ncert";
  return "others";
};

// A practical ("Describe an activity to show that …") is not a proof: these phrasings are
// removed before the proof phrases are looked for.
const PRACTICAL_PHRASE = /\b(?:an?\s+)?(?:activity|experiment)s?\s+to\s+(?:show|prove|demonstrate)\s+that\b/gi;
// A derivation, anywhere in the question.
const DERIVE_PHRASE = new RegExp(
  [
    String.raw`\bderive\b`,
    String.raw`\bderivation\b`,
    String.raw`\bobtain\s+(?:an?\s+|the\s+)?(?:expression|relation|formula)\b`,
    // "Deduce the formula of aluminium oxide" is chemistry, not a derivation — no "formula" here.
    String.raw`\bdeduce\s+(?:an?\s+|the\s+)?(?:expression|relation)\b`,
  ].join("|"),
  "i",
);
// "prove / show / deduce that …", anywhere — but only as an instruction to the student.
const THAT_PHRASE = /\b(?:prove|show|deduce)\s+that\b/gi;
// Narrative, not an instruction: "Reports show that …", "How would you show that …",
// "Mendel's experiments show that …", "Rohan wanted to show that …".
const NARRATIVE_LEAD = new RegExp(
  String.raw`\b(?:you|we|they|he|she|it|i|which|who|would|will|can|could|should|may|might|must|does|do|did|` +
    String.raw`experiments?|reports?|studies|study|data|results?|observations?|findings|records|readings|` +
    String.raw`graphs?|tables?|surveys?|tests?|evidence|(?:want|wanted|wants|tried|tries|try|decided|decides|needs|needed|asked|planned|hoped|aims?|aimed)\s+to)\s+$`,
  "i",
);

// Science "prove / show that" must OPEN a sentence, a clause or a part label —
// "(i) Prove that the graph follows Ohm's law", "With the help of a ray diagram, show that …".
const CLAUSE_LEAD = /(?:^|[.?!:;,)\]\n—–-]|\b(?:and|then|hence|also|thus))\s*$/i;

const hasInstructionThat = (text: string, clauseInitialOnly: boolean): boolean => {
  for (const m of text.matchAll(THAT_PHRASE)) {
    const before = text.slice(Math.max(0, (m.index ?? 0) - 40), m.index ?? 0);
    if (clauseInitialOnly ? CLAUSE_LEAD.test(before) : !NARRATIVE_LEAD.test(before)) return true;
  }
  return false;
};

// ── SCIENCE (controller ruling on #1298 review) ─────────────────────────────────────────────
// A Science "show that" is mostly a reasoning task ("(a) Show that her conclusion is wrong"),
// and a bare "derive" is often prose ("Plants derive their energy …"). So in Science:
//   (a) derive / derivation counts only when an expression / formula / relation / equation
//       or an "=" follows within ~40 characters ("Derive H = I²Rt", "Derive the relation …");
//   (b) "obtain an expression / relation / formula" counts;
//   (c) clause-initial "prove / show that" counts ONLY in the physics chapters below, with
//       "activity / experiment to show that" still removed first.
const SCIENCE_DERIVE = /\bderiv(?:e|ation)\b[^.?!\n]{0,40}?(?:expression|formula|relation|equation|=)/i;
const OBTAIN_EXPRESSION = /\bobtain\s+(?:an?\s+|the\s+)?(?:expression|relation|formula)\b/i;
const PHYSICS_CHAPTER = /^(?:electricity|light|human[\s_-]+eye|magnetic)/i;

const isPhysicsRow = (q: PracticeQuestion): boolean =>
  PHYSICS_CHAPTER.test(str((q as { topicKey?: unknown }).topicKey).trim());

/**
 * Proof / Derivation — a question that asks the student to prove, show or derive a result
 * (Maths proofs; Science derivations such as "Derive an expression for the equivalent
 * resistance …" or "Obtain an expression for refractive index").
 */
export const isProofOrDerivation = (q: PracticeQuestion): boolean => {
  // ISSUE-007: Section A (1-mark objective) is never a proof.
  if (str((q as { section?: unknown }).section).toUpperCase() === "A") return false;
  const text = str((q as { questionText?: unknown }).questionText).replace(PRACTICAL_PHRASE, " ");
  if (str((q as { subject?: unknown }).subject).trim().toLowerCase() === "science") {
    return (
      SCIENCE_DERIVE.test(text) ||
      OBTAIN_EXPRESSION.test(text) ||
      (isPhysicsRow(q) && hasInstructionThat(text, true))
    );
  }
  // MATHS (unchanged by the review): proof id / proof subtopic, any derivation phrase, or an
  // instruction "prove / show / deduce that" not led by narrative.
  if (/prf/i.test(str((q as { id?: unknown }).id))) return true;
  if (/proof|identit|tangent.propert/i.test(str((q as { subtopic?: unknown }).subtopic))) return true;
  return DERIVE_PHRASE.test(text) || hasInstructionThat(text, false);
};

/**
 * HOTS — OWNER RULING 23 Oct 2026 (GUIDE-FILTER-1): a higher-order thinking question
 * (bloomSkill Analysing / Evaluating / Creating) at Medium or Hard difficulty ONLY.
 *   · The old "every Hard row is HOTS" clause is gone: a Hard row tagged Applying /
 *     Understanding is routine, not higher-order (controller census: 645 such rows).
 *   · Easy is excluded: the 127 higher-order rows tagged Easy are likely mis-tagged (listed for a
 *     content review; question data is not edited here). With HOTS chosen the Easy chip therefore
 *     counts 0 and greys out through `chipCounts` — no hand-written lock.
 * Served pools, 26 chapters (trunk 10223b90, after PYQ-RESTORE-B): 4,134 -> 3,360 (Maths 678
 * Hard + 820 Medium; Science 765 Hard + 1,097 Medium).
 */
const HOTS_BLOOM = new Set(["Analysing", "Evaluating", "Creating"]);
export const isHotsRow = (q: PracticeQuestion): boolean => {
  const d = str((q as { difficulty?: unknown }).difficulty);
  const bloom = str((q as { bloomSkill?: unknown }).bloomSkill);
  return HOTS_BLOOM.has(bloom) && (d === "Medium" || d === "Hard");
};

/**
 * PURE filter predicate — does a single bank question pass the active filters?
 * The ONE classifier for the served set, the "N available" hint and the chip counts.
 */
export const questionMatchesFilters = (
  q: PracticeQuestion,
  marks: string,
  style: string,
  source: string,
  diff: string,
  range: MarksRange | null,
): boolean => {
  // EXACT concept mark-range filter (PR-E1 amendment) — path-conditional: only
  // active when the concept-row entry supplied marksMin/marksMax. Filters on
  // the real numeric `marks` field so "3-5" yields ONLY 3,4,5 (no coarse-bucket
  // 2/3-mark fusion). Questions with no numeric marks fall through to section.
  if (range) {
    const rawMarks = (q as { marks?: unknown }).marks;
    let m = Number(rawMarks ?? NaN);
    if (!Number.isFinite(m) || m <= 0) {
      const section = str((q as { section?: unknown }).section).toUpperCase();
      m = section === "A" ? 1 : section === "B" ? 2 : section === "C" ? 3
        : section === "D" ? 5 : section === "E" ? 4 : NaN;
    }
    if (!Number.isFinite(m) || m < range.min || m > range.max) return false;
  }
  if (marks !== "all") {
    const section = str((q as { section?: unknown }).section).toUpperCase();
    const m = Number((q as { marks?: unknown }).marks ?? 0);
    const fmt = str((q as { format?: unknown }).format).toLowerCase();
    const is1mk = section === "A" || m === 1 || fmt === "mcq" ||
      fmt.includes("assertion") || fmt === "ar";
    const is23mk = section === "B" || section === "C" || m === 2 || m === 3 ||
      fmt === "short" || fmt === "vsa";
    const is5mk = section === "D" || m === 5 || fmt === "long";
    // FILTER-FIX-1: section E or exactly 4 marks — a 2- or 3-mark "Case-Based" item is not 4 marks.
    const is4mk = section === "E" || m === 4;
    // `marks` is a bucket SET token; a question passes if it matches ANY active bucket.
    const active = marksTokenToBucketSet(marks);
    const matchesAnyBucket =
      (active.has("1") && is1mk) ||
      (active.has("23") && is23mk) ||
      (active.has("5") && is5mk) ||
      (active.has("4") && is4mk);
    if (!matchesAnyBucket) return false;
  }

  if (style !== "all") {
    const fmt = str((q as { format?: unknown }).format).toLowerCase();
    const section = str((q as { section?: unknown }).section);
    if (style === "proof" && !isProofOrDerivation(q)) return false;
    if (style === "ar" && !fmt.includes("assertion") && !fmt.includes("ar")) return false;
    if (style === "hots" && !isHotsRow(q)) return false;
    if (style === "case" && !fmt.includes("case") && section !== "E") return false;
    // CBQ-1 PR-1 — ONLY rows the one classifier calls a CBQ, of every mark value.
    if (style === "cbq" && !isCbq(q)) return false;
  }

  if (source !== "all") {
    const bucket = sourceBucketOf(q);
    if (source === "pyq" && bucket !== "pyq") return false;
    if (source === "ncert" && bucket !== "ncert") return false;
    if (source === "others" && bucket !== "others") return false;
  }

  if (diff !== "all") {
    if (str((q as { difficulty?: unknown }).difficulty) !== diff) return false;
  }

  return true;
};

export interface PendingFilters {
  marks: string;
  style: string;
  source: string;
  diff: string;
  range: MarksRange | null;
}

/** For each chip of each row: how many pool rows match if THAT chip were picked, the other rows as they stand. */
export interface ChipCounts {
  marks: Record<string, number>;
  style: Record<string, number>;
  source: Record<string, number>;
  diff: Record<string, number>;
  /** Rows in the pool that are a Proof / Derivation, whatever the other filters — 0 hides the chip. */
  proofInPool: number;
}

/**
 * FILTER-FIX-1 (owner ruling) — a chip greys out ONLY when the chosen chapter(s) really
 * hold 0 questions for that combination. Counts are taken over the FULL served pool with
 * `questionMatchesFilters`, so structural impossibilities count 0 on their own and no
 * hand-written incompatibility table is needed.
 */
export const chipCounts = (pool: readonly PracticeQuestion[], f: PendingFilters): ChipCounts => {
  const count = (marks: string, style: string, source: string, diff: string) => {
    let n = 0;
    for (const q of pool) if (questionMatchesFilters(q, marks, style, source, diff, f.range)) n += 1;
    return n;
  };
  const out: ChipCounts = { marks: {}, style: {}, source: {}, diff: {}, proofInPool: 0 };
  for (const v of MARKS_FILTER_VALUES) out.marks[v] = count(v, f.style, f.source, f.diff);
  for (const v of STYLE_FILTER_VALUES) out.style[v] = count(f.marks, v, f.source, f.diff);
  for (const v of SOURCE_FILTER_VALUES) out.source[v] = count(f.marks, f.style, v, f.diff);
  for (const v of DIFF_FILTER_VALUES) out.diff[v] = count(f.marks, f.style, f.source, v);
  for (const q of pool) if (isProofOrDerivation(q)) out.proofInPool += 1;
  return out;
};

/**
 * GUIDE-FILTER-1 (live defect, 23 Oct 2026) — the Style / Source / Difficulty values a URL or
 * preset asked for that the chosen chapter(s) hold NONE of, whatever the other rows say. Such a
 * value can only ever serve 0 questions (and Proof / Derivation's chip is not even drawn then:
 * `proofInPool === 0` hides it), so the page falls that row back to "all" instead of landing the
 * student on "0 questions" under a filter they cannot see. A COMBINATION that is empty is NOT
 * reset here (that is the honest filters-empty state). CBQ is exempt: a CBQ request has its own
 * honest landing (CBQ-1 / CBQ-ENTRY-1). An empty pool (bank not loaded) resets nothing.
 */
export interface FilterRowsToReset { style: boolean; source: boolean; diff: boolean; }
export const filtersTheChapterLacks = (
  pool: readonly PracticeQuestion[],
  f: { style: string; source: string; diff: string },
): FilterRowsToReset => {
  const none: FilterRowsToReset = { style: false, source: false, diff: false };
  if (pool.length === 0) return none;
  const lacks = (style: string, source: string, diff: string) =>
    !pool.some((q) => questionMatchesFilters(q, "all", style, source, diff, null));
  return {
    style: f.style !== "all" && f.style !== "cbq" && lacks(f.style, "all", "all"),
    source: f.source !== "all" && lacks("all", f.source, "all"),
    diff: f.diff !== "all" && lacks("all", "all", f.diff),
  };
};

/** The chip values a row may NOT be set to: a count of 0. "all" is never disabled (it only widens). */
export const zeroCountChips = (counts: Record<string, number>): Set<string> =>
  new Set(Object.entries(counts).filter(([v, n]) => v !== "all" && n === 0).map(([v]) => v));
