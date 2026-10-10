// src/lib/grading/topicGuard.ts
//
// TOPIC-FIX-1 (c) - a DETERMINISTIC, HIGH-PRECISION guard for the chapter a Check & Improve question is
// filed under. The chapter decides where a mistake lands (Mistake Intelligence, Me, the Tutor brief, Weak
// Area Practice), so a wrong one shows up as a weakness in a chapter the student never practised.
//
// It fires on tokens that occur in ONE chapter only, and it may only FILL a gap:
//   * the model gave NO chapter (null / unresolvable), or
//   * the model's chapter is in the OTHER subject (a Science chapter for a trig identity).
// It NEVER overrides a model answer inside the same subject - the eval showed no case where that helps
// (the set's only wrong answers are Chemistry-vs-Chemistry), and a guard that second-guesses a confident
// answer is how a good filing becomes a bad one. Pure; no I/O; no clock; no randomness.

export interface GuardRule {
  /** The canonical topics.ts slug this rule files under. */
  slug: string;
  subject: "Maths" | "Science";
  /** Matches when the question text carries this chapter's own vocabulary. */
  test: RegExp;
}

// Order matters only for readability: a question matching two rules is left to the model (see guardTopic).
export const GUARD_RULES: readonly GuardRule[] = [
  // Trigonometry: a trig ratio WITH an identity / proof / value context. Heights & distances are the same
  // chapter in this vocabulary (there is no separate Applications slug), so "height" does not exclude it.
  {
    slug: "trigonometry",
    subject: "Maths",
    // A trig RATIO is a whole word followed by its argument: sin30, cos²A, tan(A), sin θ, sec A. The argument
    // must be a digit / power / bracket / Greek letter / a single capital angle letter - never more letters,
    // so "sector", "tangent", "secant" and "cost" do not fire.
    test: /\b(sin|cos|tan|cot|sec|cosec|csc)(?:\s*(?:\^?\s*\d|²|³|\()|\s*[θαβ]|\s+[A-Z]\b|[A-Z]\b)/,
  },
  { slug: "arithmetic-progression", subject: "Maths", test: /\b(common difference|nth term|arithmetic progression|A\.?P\.?)\b|\ba_n\b|\bsum of (the )?first \w+ terms\b/i },
  { slug: "probability", subject: "Maths", test: /\bprobabilit(y|ies)\b/i },
  { slug: "statistics", subject: "Maths", test: /\b(cumulative frequency|class interval|ogive|modal class|median class|frequency distribution)\b/i },
  { slug: "light-reflection-and-refraction", subject: "Science", test: /\b(focal length|concave mirror|convex mirror|convex lens|concave lens|refractive index|angle of incidence|principal axis)\b/i },
  { slug: "electricity", subject: "Science", test: /\b(ohm'?s law|resistivity|potential difference|resistors? (?:are )?(?:connected )?in (?:series|parallel)|electric power)\b/i },
  { slug: "heredity", subject: "Science", test: /\b(mendel|dominant trait|recessive trait|F1 generation|F2 generation|monohybrid|dihybrid)\b/i },
];

const SUBJECT_OF = (slug: string): "Maths" | "Science" | null => GUARD_RULES.find((r) => r.slug === slug)?.subject ?? null;

/** The slug the guard would file this text under, or null (no rule, or two rules disagree). */
export function guardSlugFor(questionText: string | null | undefined): string | null {
  const text = String(questionText ?? "");
  if (!text.trim()) return null;
  const hits = GUARD_RULES.filter((r) => r.test.test(text)).map((r) => r.slug);
  return hits.length === 1 ? hits[0] : null; // ambiguous -> the model decides
}

export interface GuardInput {
  /** What the model said (a canonical slug, a name the client later resolves, or null). */
  detectedTopic: string | null | undefined;
  detectedSubject: string | null | undefined;
  questionText: string | null | undefined;
  /** Subject of a slug the model named, when the caller can resolve it (so "other subject" can be judged). */
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
 * model answer exactly as it came.
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
