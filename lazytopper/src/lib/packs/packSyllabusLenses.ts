/**
 * CONTENT lenses for the pack syllabus guard (PACK-SYLLABUS-1, owner ruling 5 Nov 2026).
 *
 * Classes of CBSE 2026-27 deleted content caught by what a question SAYS, so a new row is stopped even if nobody lists its id.
 * Test-only (imported by packSyllabus.guard.test.ts); nothing here runs in the app. A hit is not a verdict: each (question, lens)
 * pair must be an excluded row or carry a reviewed reason in the guard test.
 */
export interface LensQuestion {
  topicKey: string;
  questionText: string;
  options?: readonly string[];
  solutionSteps?: readonly string[];
  finalAnswer?: string;
  answer?: string;
}

const wholeOf = (q: LensQuestion): string =>
  [q.questionText, ...(q.options ?? []), ...(q.solutionSteps ?? []), q.finalAnswer ?? "", q.answer ?? ""].join(" \n ");

/* ── cubic with a given zero / factor, other zeroes found ─────────────────────────────────────────────── */

// x³ / x^3 / x3 / "cubic" / "degree 3" (a leading letter rules out "box3"; a trailing digit rules out x30).
const CUBIC = /(?<![A-Za-z])x\s?(?:³|\^\s?3|3(?![\d.,]))|\bcubic\b|\bdegree\s*(?:3|three)\b|\bthree\s+(?:zeroe?s|roots)\b/i;
// One zero / root / factor is GIVEN.
const GIVEN =
  /\b(?:is|are)\s+(?:a\s+|an\s+)?(?:zero|zeros|zeroes|root|roots|factor|factors)\b|\b(?:one|a|the\s+given)\s+(?:zero|zeros|zeroes|root|roots)\b|\bgiven\s+that\b[^.]{0,60}\b(?:zero|root|factor)|\bdivisible\s+by\b|\bdivided\s+by\s*\(|\bno\s+remainder\b|\bfactor\s+of\b/i;
// The question ASKS for the other / remaining / all zeroes (roots), or to factorise fully.
const ASKS =
  /\b(?:other|remaining|rest\s+of\s+the)\s+(?:two\s+)?(?:zeroe?s|roots?)\b|\ball\s+(?:its\s+|the\s+|three\s+)?(?:zeroe?s|roots?)\b|\bfind\s+(?:the\s+|its\s+)?(?:zeroe?s|roots?)\b|\bfactori[sz]e\s+(?:it\s+|this\s+|the\s+polynomial\s+)?(?:fully|completely)\b|\bcompletely\s+factori[sz]|\bfully\s+factori[sz]|\bfactori[sz]able\b|\bsolve\s+(?:the\s+equation|for\s+x)\b/i;
// The WORKING divides out the given factor or compares coefficients of a quotient.
const DIVIDES = /\bdivid(?:e|ed|es|ing)\b|\bquotient\b|\bcompar(?:e|es|ing)\s+coefficients\b|\blong\s+division\b|\bsynthetic\s+division\b/i;

export function cubicRemainingZeroes(q: LensQuestion): boolean {
  if (q.topicKey !== "polynomials") return false;
  const text = wholeOf(q);
  return CUBIC.test(text) && GIVEN.test(text) && (ASKS.test(text) || DIVIDES.test(text));
}

/* ── evolution ────────────────────────────────────────────────────────────────────────────────────────── */

// "evolution of a gas", "gas evolution", "evolved hydrogen": chemistry, not Evolution.
const CHEMICAL_EVOLUTION = new RegExp(
  [
    String.raw`\b(?:evolution|evolved|evolves?)\s+of\b[^.;:|\n]{0,40}?\b(?:gas|gases|hydrogen|H[₂2]|CO[₂2]|SO[₂2]|NO[₂2]|heat|oxygen|O[₂2]|nitrogen|N[₂2]|ammonia|NH[₃3]|chlorine|Cl[₂2]|bubbles?|vapou?rs?|energy|light|fumes?|odou?r)`,
    String.raw`\b(?:gas|hydrogen|heat|CO[₂2]|energy)\s+evolution\b`,
    String.raw`\bevolved\b`,
  ].join("|"),
  "gi",
);
const EVOLUTION = /\bevolution(?:ary)?\b|\bnatural\s+selection\b|\bspeciation\b|\bfossils?\b(?!\s+fuels?)|\bdarwin(?:ism)?\b|\bvestigial\b|\bhomologous\s+organs?\b|\banalogous\s+organs?\b|\bsurvival\s+of\s+the\s+fittest\b|\bcommon\s+ancest/i;

export function evolutionTerms(q: LensQuestion): boolean {
  return EVOLUTION.test(wholeOf(q).replace(CHEMICAL_EVOLUTION, " "));
}

/* ── the lens list ────────────────────────────────────────────────────────────────────────────────────── */

export interface ContentLens {
  name: string;
  hit: (q: LensQuestion) => boolean;
}

const re = (name: string, r: RegExp, chapter?: string): ContentLens => ({
  name,
  hit: (q) => (!chapter || q.topicKey === chapter) && r.test(wholeOf(q)),
});

export const CONTENT_LENSES: readonly ContentLens[] = [
  re("induced-current", /induced\s+(current|e\.?\s?m\.?\s?f\.?|voltage|potential)/i),
  re("electromagnetic-induction", /electro-?\s?magnetic\s+induction|magnetic\s+induction|faraday/i),
  re(
    "motor-generator-principle",
    /\b(electric|d\.?c\.?|a\.?c\.?|simple)\s+(motor|generator)s?\b|\bmotor\s+(principle|effect)\b|\bgenerators?\b|\bdynamo\b|\bsplit[- ]ring\b|\bcommutator\b|\barmature\b/i,
  ),
  re("acquired-traits", /acquired\s+(and\s+inherited\s+)?traits?/i),
  { name: "evolution-terms", hit: evolutionTerms },
  re("remainder-theorem", /remainder|divisible\s+by|is\s+divided\s+by|on\s+dividing/i, "polynomials"),
  { name: "cubic-remaining-zeroes", hit: cubicRemainingZeroes },
];

/** The names of the lenses `q` trips. */
export function lensHits(q: LensQuestion): string[] {
  return CONTENT_LENSES.filter((l) => l.hit(q)).map((l) => l.name);
}
