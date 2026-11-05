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

// Degree 3 or more: x³ x⁴ x^3 x^4 x3 x4 (a leading letter rules out "box3", a trailing digit "x30"), "x cubed", "cubic", "quartic",
// "degree 3/4", "three linear factors", "three zeroes". A degree-3+ polynomial is beyond the Class 10 quadratic scope.
const CUBIC =
  /(?<![A-Za-z])x\s?(?:[³⁴⁵]|\^\s?[345](?!\d)|[345](?![\d.,]))|\bx\s+cubed\b|\bcubic\b|\bquartic\b|\bbiquadratic\b|\bdegree\s*(?:[345]|three|four|five)\b|\bthree\s+(?:linear\s+factors|zeroe?s|roots)\b|\bfour\s+(?:zeroe?s|roots)\b/i;
// One or more zeroes / roots / factors are GIVEN.
const GIVEN =
  /\b(?:is|are)\s+(?:a\s+|an\s+|the\s+)?(?:zero|zeros|zeroes|root|roots|factor|factors)\b|\b(?:one|two)\s+of\s+its\s+(?:zeroe?s|roots)\b|\b(?:one|a|the\s+given)\s+(?:zero|zeros|zeroes|root|roots)\b|\bzeroe?s\s+(?:are|is)\b|\bgiven\s+that\b[^.]{0,60}\b(?:zero|root|factor)|\bdivisible\s+by\b|\bdivided\s+by\s*\(|\bno\s+remainder\b|\bfactor\s+of\b|\b[a-zA-Z]\(\s*[-−]?\d+\s*\)\s*=\s*0\b|\bas\s+(?:one\s+of\s+its\s+)?(?:a\s+)?(?:zeroe?s|roots?)\b/i;
// The question ASKS for the other / remaining / all zeroes (roots), or the unknown zeroes, or a full factorisation.
const ASKS =
  /\b(?:other|remaining|rest\s+of\s+the)\s+(?:two\s+|three\s+)?(?:zeroe?s|roots?)?\b|\bremaining\s+(?:two|three|one)\b|\ball\s+(?:its\s+|the\s+|three\s+|other\s+)?(?:zeroe?s|roots?)\b|\bfind\s+(?:the\s+|its\s+)?(?:zeroe?s|roots?)\b|\bfind\s+(?:the\s+values?\s+of\s+)?[αβγ]\b|\b[αβγ]\s+and\s+[βγδ]\b|\b(?:linear\s+factors|factori[sz]e\s+(?:it\s+|this\s+|the\s+polynomial\s+)?(?:fully|completely)|completely\s+factori[sz]|fully\s+factori[sz]|factori[sz]able)\b|\bsolve\s+(?:the\s+equation|for\s+x)\b|\bobtain\s+all\b|\bdetermine\s+the\s+remaining\b/i;
// A degree-3+ polynomial whose zeroes are all asked for, even with none given (x³ − 27: find its zeroes).
const ALL_ZEROES = /\b(?:find|obtain|determine|write\s+down)\s+(?:all\s+)?(?:its|the|all)\s+(?:zeroe?s|roots)\b/i;
// The WORKING divides out the given factor or compares coefficients of a quotient.
const DIVIDES = /\bdivid(?:e|ed|es|ing)\b|\bquotient\b|\bcompar(?:e|es|ing)\s+coefficients\b|\blong\s+division\b|\bsynthetic\s+division\b/i;

export function cubicRemainingZeroes(q: LensQuestion): boolean {
  if (q.topicKey !== "polynomials") return false;
  const text = wholeOf(q);
  if (!CUBIC.test(text)) return false;
  return (GIVEN.test(text) && (ASKS.test(text) || DIVIDES.test(text))) || ALL_ZEROES.test(text);
}

/* ── evolution ────────────────────────────────────────────────────────────────────────────────────────── */

// "evolution of a gas", "gas evolution", "H2 evolved", "evolved gas": chemistry, not Evolution. A bare "evolved" is NOT exempt
// ("how the eye evolved in stages" must trip the lens).
const CHEM_SUBSTANCE = String.raw`(?:gas|gases|hydrogen|H[₂2]|CO[₂2]|SO[₂2]|NO[₂2]|heat|oxygen|O[₂2]|nitrogen|N[₂2]|ammonia|NH[₃3]|chlorine|Cl[₂2]|bubbles?|vapou?rs?|energy|light|fumes?|odou?r)`;
const CHEMICAL_EVOLUTION = new RegExp(
  [
    String.raw`\b(?:evolution|evolved|evolves?)\s+of\b[^.;:|\n]{0,40}?\b${CHEM_SUBSTANCE}`,
    String.raw`\b${CHEM_SUBSTANCE}\s+(?:evolution|(?:is\s+|was\s+|are\s+|were\s+|being\s+)?evolved)\b`,
    String.raw`\bevolved\s+${CHEM_SUBSTANCE}`,
  ].join("|"),
  "gi",
);
const EVOLUTION =
  /\bevolution(?:ary)?\b|\bnatural\s+selection\b|\bspeciation\b|\bnew\s+species\b|\bgeographical\s+isolation\b|\bgenetic\s+drift\b|\blamarck|\bfossils?\b(?!\s+fuels?)|\bdarwin(?:ism)?\b|\bvestigial\b|\bhomologous\s+organs?\b|\banalogous\s+organs?\b|\bsurvival\s+of\s+the\s+fittest\b|\bcommon\s+ancest|\b(?:humans?|man|mankind)\s+(?:originate|originated|originating)\b|\borigin\s+of\s+(?:humans?|man|species|life)\b/i;

// The verb ("the eye evolved", "reflex arcs have evolved") is a lens term everywhere EXCEPT the chemistry chapters, where "the gas
// evolved", "evolves hydrogen", "evolved brown fumes" is the ordinary verb for a gas given off.
const CHEMISTRY_CHAPTERS = new Set(["chemical-reactions-and-equations", "acids-bases-and-salts", "metals-and-non-metals", "carbon-and-its-compounds"]);
const EVOLVE_VERB = /\bevolv(?:e|ed|es|ing)\b/i;

export function evolutionTerms(q: LensQuestion): boolean {
  const text = wholeOf(q).replace(CHEMICAL_EVOLUTION, " ");
  if (EVOLUTION.test(text)) return true;
  return !CHEMISTRY_CHAPTERS.has(q.topicKey) && EVOLVE_VERB.test(text);
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
  re("acquired-traits", /acquired\s+(?:and\s+inherited\s+)?(?:traits?|characters?|characteristics?)/i),
  { name: "evolution-terms", hit: evolutionTerms },
  re("remainder-theorem", /remainder|divisible\s+by|is\s+divided\s+by|on\s+dividing/i, "polynomials"),
  { name: "cubic-remaining-zeroes", hit: cubicRemainingZeroes },
];

/** The names of the lenses `q` trips. */
export function lensHits(q: LensQuestion): string[] {
  return CONTENT_LENSES.filter((l) => l.hit(q)).map((l) => l.name);
}
