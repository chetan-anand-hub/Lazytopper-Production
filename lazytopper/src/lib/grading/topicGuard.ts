// src/lib/grading/topicGuard.ts
//
// TOPIC-FIX-1 (c) - a DETERMINISTIC, HIGH-PRECISION guard for the chapter a Check & Improve question is
// filed under. The chapter decides where a mistake lands (Mistake Intelligence, Me, the Tutor brief, Weak
// Area Practice), so a wrong one shows up as a weakness in a chapter the student never practised.
//
// It may only FILL a gap, and only from vocabulary that belongs to ONE chapter:
//   * the model gave NO chapter (null, or the literal "null"), or
//   * the model's chapter is in the OTHER subject (a Science chapter for a trig identity).
// It NEVER overrides a model answer inside the same subject, and it never fills an UNRESOLVABLE non-null
// name (the caller decides what that means). A guard that second-guesses a confident answer is how a good
// filing becomes a bad one - the first version of this file did exactly that on Science questions (the
// verifier's findings are pinned as negative tests in topicGuard.test.ts).
//
// Every MATHS rule is skipped when the text carries SCIENCE vocabulary (SCIENCE_MARKERS) and every SCIENCE
// rule is skipped when it carries MATHS vocabulary of another Science chapter (the per-rule `unless`).
// Pure; no I/O; no clock; no randomness.

export interface GuardRule {
  /** The canonical topics.ts slug this rule files under. */
  slug: string;
  subject: "Maths" | "Science";
  /** Matches when the question text carries this chapter's own vocabulary. */
  test: RegExp;
  /** Another chapter's vocabulary that makes this rule step aside. */
  unless?: RegExp;
}

/** Words that mark a SCIENCE question: a Maths rule never fires on text carrying any of them. */
const SCIENCE_MARKERS =
  /\b(refraction|refractive|reflection|incidence|ray|lens|mirror|snell|optic|prism|eye|retina|current|charge|resistan\w*|ohm|circuit|joule|voltage|battery|heat produced|galvanometer|solenoid|magnet\w*|cross|F1|F2|gene|genes|trait|inherit\w*|mendel|chromosome|dominant|recessive|sex|child|children|son|daughter|boy|girl|offspring|acid|base|salt|metal|reaction|carbon|hormone|enzyme|digest\w*|photosynthesis|cell|plant|organism|ecosystem|food chain)\b/i;

/** Dice, cards, coins, bags, balls: the real-world props of a MATHS probability question. */
const MATHS_PROBABILITY_PROPS = /\b(dice|die|coin|coins|card|cards|pack of|bag|marble|marbles|ball|balls|spinner|lottery|ticket|tickets|drawn at random|selected at random|chosen at random)\b/i;

// A trig RATIO is a whole word (lower-case or Capitalised) followed by its ANGLE: a single capital letter or
// a Greek letter ("sin θ", "tan A", "cos²A", "sec A"). A digit or a bracket is NOT enough - "sin 30" is Snell's
// law, "5 sec (t = 5 s)" is seconds - and a ratio directly after a number is a unit, never a ratio.
const TRIG_RATIO =
  /(?<![\d.]\s?)\b(?:[Ss]in|[Cc]os|[Tt]an|[Cc]ot|[Ss]ec|[Cc]osec|[Cc]sc)(?:[²³]|\^\s?\d)?\s?(?:[θαβ]|[A-Z]\b)/;

export const GUARD_RULES: readonly GuardRule[] = [
  { slug: "trigonometry", subject: "Maths", test: TRIG_RATIO, unless: SCIENCE_MARKERS },
  // AP: its own words only. The bare letters "AP" are a geometry SEGMENT name (AP and AQ are tangents), so they
  // are not a signal; neither is a "sum of first n terms" (a series is not necessarily an AP).
  { slug: "arithmetic-progression", subject: "Maths", test: /\b(common difference|arithmetic progression|nth term)\b/i, unless: SCIENCE_MARKERS },
  // Probability: the word WITH a Maths prop, and never with genetics / sex-determination vocabulary.
  { slug: "probability", subject: "Maths", test: /\bprobabilit(?:y|ies)\b/i, unless: SCIENCE_MARKERS },
  { slug: "statistics", subject: "Maths", test: /\b(cumulative frequency|class interval|ogive|modal class|median class|frequency distribution)\b/i },
  // Light: mirrors and refraction vocabulary only - "focal length" and "lens" are shared with the Human Eye chapter.
  { slug: "light-reflection-and-refraction", subject: "Science", test: /\b(concave mirror|convex mirror|spherical mirror|plane mirror|angle of incidence|angle of reflection|principal axis|snell)/i, unless: /\b(retina|cornea|iris|myopia|hypermetropia|presbyopia|cataract|human eye|eye lens|ciliary)\b/i },
  // Electricity: its laws only - "potential difference" / "electric power" also appear in magnetism questions.
  { slug: "electricity", subject: "Science", test: /\b(ohm'?s law|resistivity|resistors? (?:are |is )?(?:connected )?in (?:series|parallel))/i, unless: /\b(solenoid|magnetic|compass|galvanometer|motor|generator|fleming)\b/i },
  { slug: "heredity", subject: "Science", test: /\b(mendel|dominant trait|recessive trait|F1 generation|F2 generation|monohybrid|dihybrid)\b/i },
];

const SUBJECT_OF = (slug: string): "Maths" | "Science" | null => GUARD_RULES.find((r) => r.slug === slug)?.subject ?? null;

/** True when a rule's own pattern matches and no step-aside vocabulary is present. */
function fires(rule: GuardRule, text: string): boolean {
  if (!rule.test.test(text)) return false;
  if (rule.slug === "probability" && !MATHS_PROBABILITY_PROPS.test(text)) return false;
  return !(rule.unless && rule.unless.test(text));
}

/** The slug the guard would file this text under, or null (no rule, or two rules disagree). */
export function guardSlugFor(questionText: string | null | undefined): string | null {
  const text = String(questionText ?? "");
  if (!text.trim()) return null;
  const hits = GUARD_RULES.filter((r) => fires(r, text)).map((r) => r.slug);
  return hits.length === 1 ? hits[0] : null; // ambiguous -> the model decides
}

export interface GuardInput {
  /** What the model said (a canonical slug, a name the client later resolves, or null). */
  detectedTopic: string | null | undefined;
  detectedSubject: string | null | undefined;
  questionText: string | null | undefined;
  /** Subject of a chapter the model named, when the caller can resolve it (so "other subject" can be judged). */
  subjectOfDetectedTopic?: "Maths" | "Science" | null;
}

export interface GuardResult {
  detectedTopic: string | null;
  detectedSubject: "Maths" | "Science" | string | null;
  /** True when the guard changed the model's answer. */
  overridden: boolean;
}

/**
 * Apply the guard. Fills a missing chapter; replaces a chapter from the OTHER subject; leaves every other
 * model answer (same subject, or an unresolvable name) exactly as it came.
 */
export function guardTopic(input: GuardInput): GuardResult {
  const asIs: GuardResult = { detectedTopic: input.detectedTopic ?? null, detectedSubject: input.detectedSubject ?? null, overridden: false };
  const slug = guardSlugFor(input.questionText);
  if (!slug) return asIs;
  const guardSubject = SUBJECT_OF(slug);
  if (!guardSubject) return asIs;

  const model = String(input.detectedTopic ?? "").trim();
  const modelMissing = !model || model.toLowerCase() === "null";
  const modelSubject = input.subjectOfDetectedTopic ?? null;
  const otherSubject = !modelMissing && modelSubject !== null && modelSubject !== guardSubject;
  if (!modelMissing && !otherSubject) return asIs;
  return { detectedTopic: slug, detectedSubject: guardSubject, overridden: true };
}
