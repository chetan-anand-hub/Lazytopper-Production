/**
 * publishability.ts — THE CONTRACT BETWEEN THE BANK TRACK AND THE SEO TRACK.
 *
 * ★ WHY THIS FILE EXISTS, AND WHY IT IS NOT INSIDE EITHER TRACK.
 * Two workstreams run in parallel and cannot talk to each other: a content track
 * fixing and expanding the question bank, and an SEO track emitting static pages.
 * They must NOT coordinate by message — every attempt to do that degrades, and the
 * owner becomes the message bus. They coordinate MECHANICALLY, through this one
 * predicate:
 *
 *   - The generator emits a question ONLY if isPublishable() returns ok.
 *   - A bank-side test asserts that rows a content lane touched are publishable.
 *
 * So a content lane makes a question pass; the next SEO build emits a page for it.
 * Neither track needs to know the other exists. THE GATE IS THE COORDINATION.
 *
 * ⚠ CHANGING A RULE HERE CHANGES WHAT BOTH TRACKS MEAN BY "DONE".
 * Do not relax a rule to make a page appear. If a rule is wrong, say so and get a
 * ruling — a page that ships because the gate was loosened is worse than no page.
 */

export type PublishVerdict =
  | { ok: true }
  | { ok: false; reason: PublishRejection; detail: string };

export type PublishRejection =
  | "ai-generated-source"      // provenance
  | "no-solution-steps"
  | "unmarked-step"            // a step carries no mark annotation
  | "marks-do-not-sum"
  | "fabricated-pyq-year"      // a board-paper attribution we cannot stand behind
  | "requires-absent-figure";  // the text demands a diagram the page cannot render

/** Minimal shape this contract needs. Deliberately structural, not an import of
 *  the bank's own type — this file must not drag the bank into the generator. */
export interface PublishableQuestion {
  id: string;
  questionText: string;
  marks: number;
  solutionSteps?: readonly string[];
  pyqYear?: string;
  /** The source-file identifiers this row came from. */
  sources?: readonly string[];
  /** True when the row references a figure the bank does not ship. */
  requiresDiagram?: boolean;
}

/**
 * RULE 2 — STEP MARK ANNOTATION. Two conventions exist in the bank and BOTH are
 * valid. Counting only the first silently discards roughly 600 questions.
 *   leading:  "[2 marks] Substitute into the lens equation..."
 *   trailing: "Substitute into the lens equation... [2]"
 */
const LEADING_MARK = /^\s*\[\s*(\d+(?:\.\d+)?)\s*marks?\s*\]/i;
const TRAILING_MARK = /\[\s*(\d+(?:\.\d+)?)\s*\]\s*$/;

export function stepMarks(step: string): number | null {
  const m = LEADING_MARK.exec(step) ?? TRAILING_MARK.exec(step);
  return m ? Number(m[1]) : null;
}

/**
 * RULE 5 — THE FIGURE RULE, AND THE NEAR-MISS THAT SHAPED IT.
 *
 * ⚠ A naive filter banning the word "diagram" DELETED ALL THREE genuine 2023
 * board questions from the first generated page, because their text says
 * "draw a ray diagram" — an INSTRUCTION TO THE STUDENT, not a reference to a
 * supplied figure. Every gate stayed green. It would have silently emptied the
 * very feature the provenance work exists to protect.
 *
 * ★ THE RULE IS ABOUT WHAT THE PAGE MUST SUPPLY, NOT ABOUT A WORD.
 *   - "draw a ray diagram"        -> the STUDENT draws it. PUBLISHABLE.
 *   - "in the figure shown"       -> the PAGE must supply it. NOT publishable
 *                                    unless the figure ships.
 * Both directions must be pinned by a control in any test of this function.
 */
const DEMANDS_SUPPLIED_FIGURE = [
  /\bin\s+the\s+(figure|diagram|circuit|graph)\s+(shown|given|above|below)\b/i,
  /\b(figure|diagram|graph)\s+(shown|given)\s+(above|below|alongside)\b/i,
  /\bfrom\s+the\s+(figure|graph|diagram)\b/i,
  /\bas\s+shown\s+in\s+(the\s+)?(figure|fig\.?|diagram)\b/i,
  /\bstudy\s+the\s+(figure|diagram|graph)\b/i,
  /\bobserve\s+the\s+(figure|diagram)\b/i,
];

export function demandsSuppliedFigure(text: string): boolean {
  return DEMANDS_SUPPLIED_FIGURE.some((rx) => rx.test(text));
}

/**
 * @param aiPackSources - AI_GENERATED_PACK_SOURCES, passed in rather than imported
 *   so this file stays free of bank imports. The caller owns provenance truth.
 */
export function isPublishable(
  q: PublishableQuestion,
  aiPackSources: ReadonlySet<string>,
): PublishVerdict {
  // RULE 1 — PROVENANCE. Non-negotiable. An AI-generated question published as
  // board-prep content is a correctness error that is cached, screenshot-able
  // and permanent.
  const aiSrc = (q.sources ?? []).find((s) => aiPackSources.has(s));
  if (aiSrc) return { ok: false, reason: "ai-generated-source", detail: aiSrc };

  // RULE 4 — NO FABRICATED BOARD ATTRIBUTION. 364 AI-pack rows carry a pyqYear.
  // "From the 2024 CBSE board paper" on an invented question is a fabrication we
  // would be publishing under our own name.
  if (q.pyqYear && aiSrc) {
    return { ok: false, reason: "fabricated-pyq-year", detail: q.pyqYear };
  }

  // RULE 2 — EVERY step carries a mark, in either convention.
  const steps = q.solutionSteps ?? [];
  if (steps.length === 0) return { ok: false, reason: "no-solution-steps", detail: q.id };
  const marks = steps.map(stepMarks);
  const missing = marks.findIndex((m) => m === null);
  if (missing >= 0) {
    return { ok: false, reason: "unmarked-step", detail: `step ${missing + 1}` };
  }

  // RULE 3 — THE STEPS MUST SUM TO THE QUESTION'S MARKS. A page that shows a
  // mark scheme which does not add up teaches the student the wrong thing.
  const total = (marks as number[]).reduce((a, b) => a + b, 0);
  if (Math.abs(total - q.marks) > 1e-9) {
    return { ok: false, reason: "marks-do-not-sum", detail: `${total} vs ${q.marks}` };
  }

  // RULE 5 — THE FIGURE RULE. See the note above before editing.
  if (q.requiresDiagram || demandsSuppliedFigure(q.questionText)) {
    return { ok: false, reason: "requires-absent-figure", detail: q.id };
  }

  return { ok: true };
}
