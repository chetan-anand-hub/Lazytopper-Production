// src/pages/tutor/tutorDemoQuestion.ts
// Fix 4 (bank-over-self-invented): pre-select ONE real, owner-verified bank question for
// the tutor's "see how it's solved" demonstration, so the tutor solves a verified question
// rather than inventing a fabrication-prone one. Reuses the ONE sanctioned bank accessor
// (selectBankQuestions → resolveCanonicalSlug). Topic-matched is the clean granularity; we
// then softly prefer questions whose `subtopic` matches the opened concept, and REQUIRE a
// pre-authored solutionSteps so the demonstration rides a verified worked solution. Returns
// null when the bank has nothing usable → the server prompt falls back to a correctness-
// railed simpler self-generated example.

import { selectBankQuestions } from "../../data/bankQuery";
import type { TutorDemoQuestion } from "../../ai/tutorClient";

/** A short, demonstrable band — a 3-mark short-answer is the sweet spot for a walked
 *  solution (a 1-mark MCQ teaches little; a 5-mark long-answer is a wall of text on a
 *  phone). Best-effort: if the band is empty we widen to the whole topic below. */
const DEMO_MARKS_MIN = 2;
const DEMO_MARKS_MAX = 3;

function normalizeConcept(concept?: string): string {
  return (concept || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function toDemo(q: {
  questionText: string;
  marks?: number;
  solutionSteps?: string[];
}): TutorDemoQuestion {
  return {
    questionText: q.questionText,
    ...(typeof q.marks === "number" && q.marks > 0 ? { marks: q.marks } : {}),
    ...(Array.isArray(q.solutionSteps) && q.solutionSteps.length ? { solutionSteps: q.solutionSteps } : {}),
  };
}

/**
 * Pick a verified bank question to demonstrate for (subject, canonical topicKey, concept).
 * Prefers a concept (`subtopic`) match in the demonstrable mark band; falls back to any
 * topic question that carries a real worked solution. Deterministic (first match — no
 * Math.random, per doctrine). Returns null when nothing usable exists.
 */
export function selectTutorDemoQuestion(args: {
  subject: "maths" | "science" | "";
  topicKey: string;
  concept?: string;
}): TutorDemoQuestion | null {
  const subject = args.subject === "science" ? "Science" : args.subject === "maths" ? "Maths" : undefined;
  if (!args.topicKey) return null;

  // Only questions with an owner-authored solution can back a verified demonstration.
  const withSolution = <T extends { solutionSteps?: string[] }>(qs: T[]): T[] =>
    qs.filter((q) => Array.isArray(q.solutionSteps) && q.solutionSteps.length > 0);

  const banded = withSolution(
    selectBankQuestions({
      subject,
      topicKeys: [args.topicKey],
      marksMin: DEMO_MARKS_MIN,
      marksMax: DEMO_MARKS_MAX,
    }),
  );
  const topicWide = banded.length
    ? banded
    : withSolution(selectBankQuestions({ subject, topicKeys: [args.topicKey] }));

  if (topicWide.length === 0) return null;

  // Soft concept preference on the `subtopic` field (the finest tag on the bank object);
  // fall back to the first solution-bearing topic question when nothing matches.
  const wantConcept = normalizeConcept(args.concept);
  if (wantConcept) {
    const conceptMatch = topicWide.find((q) => {
      const sub = normalizeConcept((q as { subtopic?: string }).subtopic);
      return sub && (sub.includes(wantConcept) || wantConcept.includes(sub));
    });
    if (conceptMatch) return toDemo(conceptMatch);
  }
  return toDemo(topicWide[0]);
}
