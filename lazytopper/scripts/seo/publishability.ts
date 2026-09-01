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
  | "requires-absent-figure";  // the text demands a figure the page cannot render

/** Minimal shape this contract needs. Deliberately structural, not an import of
 *  the bank's own type — this file must not drag the bank into the generator. */
export interface PublishableQuestion {
  id: string;
  questionText: string;
  marks: number;
  solutionSteps?: readonly string[];
  /** ⚠ Read by nothing since Rule 4 folded into Rule 1. Kept because a caller may
   *  still pass it and because the retirement lane will need it. */
  pyqYear?: string;
  /** Answer text, when present. Scanned by the figure rule alongside the stem. */
  answer?: string;
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
const ARTEFACT = "(figure|fig\\.?|diagram|graph|circuit|table)";

/**
 * ★ POSITIONAL, NOT NOMINAL — and this is the third time the same error was made.
 *
 * A reference only demands a supplied artefact when it points at something the PAGE
 * must render. Naming an artefact is not the same as depending on one:
 *
 *   "from the graph shown above"  -> positional. The page must supply it. REJECT.
 *   "Table 1 shows..."            -> numbered, i.e. an external exhibit.  REJECT.
 *   "From the table, at which..." -> bare noun. The data is INLINE.       PUBLISH.
 *
 * `BX-POLY-E-019` prints `t = 0, 1, 2, 3, 4 -> h = 0, 3, 4, 3, 0` in its own stem and
 * then says "From the table". At least eight rows share that shape. The first version
 * of this list rejected all of them.
 *
 * ⚠ `image` and `picture` are REMOVED from ARTEFACT. In Optics — the chapter of the
 * first live page — "image" IS the subject matter: `CBE-S-LGHT-A-002` says "from the
 * image" about a mirror image. `ELEC-NCERT-11-SA-027` says "from the circuit" about a
 * voltmeter reading with no figure at all. A word that names the physics cannot also
 * be a filter token.
 *
 * ★ THE SAME ERROR, THREE TIMES: "draw a ray diagram" was an INSTRUCTION read as a
 * figure reference; "from the table" is INLINE DATA read as a figure reference. Each
 * time the rule matched a phrase instead of a dependency. Both directions need a
 * control before any change to this list ships.
 */
const POSITION = "(shown|given|above|below|alongside|opposite|attached)";

/**
 * ★ FOUR TIMES IN ONE FILE IS NOT FOUR ACCIDENTS. It is a habit of writing a check
 * that looks discriminating without asking what it excludes that its neighbour does
 * not. Rule 4 was unreachable behind Rule 1. The old pattern 5 was subsumed by the
 * numbered-exhibit pattern. `INLINE_CAPABLE` was declared and referenced nowhere.
 * A verb-prefixed positional pattern was subsumed by the bare positional one.
 * None changed behaviour; all four read as live checks and were not.
 *
 * ⚠ BEFORE ADDING A PATTERN HERE, ask what it matches that no existing pattern
 * matches, and name a real bank row as the answer. The coverage test in
 * `src/config/publishability.guard.test.ts` enforces exactly that, and it is the
 * only reason three of the four were ever found.
 */

/**
 * ★ THE ASYMMETRY. `table`, `graph`, `chart` and `data` CAN be inline text, so a
 * bare mention of one proves nothing — BX-POLY-E-019 prints its table in the stem
 * and then says "From the table". Those need a POSITION token or a number.
 * The list below is the other half: artefacts that CANNOT be inline.
 *
 * ⚠ There is deliberately no INLINE_CAPABLE constant. An earlier version declared
 * one, referenced it nowhere, and `--strict` did not flag it (`noUnusedLocals` is
 * off). That was the THIRD construct in this file to read as live and not be,
 * after Rule 4 and the old pattern 5. The asymmetry is expressed by which patterns
 * require POSITION, not by a constant nothing consumes.
 */
const VISUAL_ONLY = "(figure|fig\\.?|diagram)";
// ⚠ `circuit` is NOT visual-only. ELEC-NCERT-11-SA-027 says "the reading from the
// circuit" meaning the circuit DESCRIBED in the stem — same trap as "image" in
// Optics. A word that names the physics cannot be a visual-only token.

/** ★ EXPORTED so the per-pattern coverage test can reach it. An unexported
 *  constant no test can see is exactly how the dead pattern 5 survived review. */
export const DEMANDS_SUPPLIED_FIGURE = [
  // 1 — positional reference to anything: "from the graph shown above".
  // ⚠ A verb-prefixed variant `(in|from|see|refer to) + ARTEFACT + POSITION` was
  // deleted here: it was wholly subsumed by the bare pattern below, because the
  // prefix narrows nothing that the suffix does not already require.
  new RegExp(`\\b${ARTEFACT}\\s+${POSITION}\\b`, "i"),
  new RegExp(`\\bas\\s+shown\\s+in\\s+(the\\s+)?${ARTEFACT}\\b`, "i"),

  // 2 — numbered exhibit: "Table 1", "Figure 10.2". External by construction.
  new RegExp(`\\b${ARTEFACT}\\s*\\d+(\\.\\d+)?\\b`, "i"),

  // 3 — the artefact IS the answer set; the page cannot supply the options
  new RegExp(`\\bwhich\\s+(row|column|entry)\\s+of\\s+the\\s+${ARTEFACT}\\b`, "i"),

  // 4 ★ IMPERATIVE TO CONSULT — a dependency by construction, not a naming.
  // "Study the diagram and answer" (SCQ-S-EYE-036) has no inline reading, and
  // "Refer to the table in NCERT" (METAL-NCERT-3-VSA-006) names an exhibit the
  // page cannot supply. No POSITION token is required here and requiring one
  // let both of these publish in v3.
  new RegExp(`\\b(study|observe|refer\\s+to|consult)\\s+(the\\s+)?${ARTEFACT}\\b`, "i"),

  // 5 ★ VISUAL-ONLY ARTEFACTS need no position token at all. A bare `table` or
  // `graph` may point at data printed inline two lines above — that is
  // BX-POLY-E-019 and it must publish. A bare `diagram` cannot: a diagram is
  // never prose. Requiring POSITION uniformly was the asymmetry v3 missed.
  new RegExp(`\\b(in|from)\\s+the\\s+${VISUAL_ONLY}\\b`, "i"),
];

/**
 * ⚠ SCAN THE QUESTION, NOT THE SOLUTION — and this is not a style preference.
 *
 * Trunk's own `dependsOnSuppliedFigure` scans `[questionText, ...solutionSteps,
 * answer]` and includes a bare `/\bas\s+shown\b/i`. Measured against this
 * predicate over 5,591 non-AI rows, the two disagree on 203 rows, and 51 of
 * trunk's extra rejections fire on "as shown" with no figure reference anywhere
 * in the stem — e.g. BX-ABS-E-002, a cabbage-juice indicator question needing no
 * figure at all.
 *
 * ★ THE INTERACTION THAT DECIDES IT: scanning `solutionSteps` means a solution
 * a content lane AUTHORS can silently un-publish an otherwise-fine question.
 * Step-marking a row — the single largest job on the content track — would then
 * remove it from the site. The QUESTION is what demands a supplied artefact; a
 * solution merely describes one.
 *
 * Both directions still need a control in any test of this function:
 *   "draw a ray diagram"   -> the STUDENT draws it. PUBLISHABLE.
 *   "in the figure shown"  -> the PAGE must supply it. NOT publishable.
 */
export function demandsSuppliedFigure(text: string): boolean {
  return DEMANDS_SUPPLIED_FIGURE.some((rx) => rx.test(text));
}

/**
 * @param aiIds - `AI_GENERATED_QUESTION_IDS` from canonicalQuestionBank.ts:1874,
 *   passed in rather than imported so this file stays free of bank imports.
 *
 * ⚠ CORRECTED 2026-09-01. The first version of this file took
 * `aiPackSources: ReadonlySet<string>` and tested `q.sources`. BOTH WERE WRONG:
 * `AI_GENERATED_PACK_SOURCES` is `ReadonlyArray<ReadonlyArray<CanonicalQuestion>>`
 * — arrays of question OBJECTS, not filenames — and `CanonicalQuestion` HAS NO
 * `sources` FIELD AT ALL. Adopted as written, Rule 1 would have passed all 2,952
 * AI-generated rows: the exact inverse of its purpose. The repo already derives
 * `AI_GENERATED_QUESTION_IDS` by flattening those arrays to ids. Use that.
 * ★ The author inferred the constant's shape from its NAME instead of opening it.
 */
export function isPublishable(
  q: PublishableQuestion,
  aiIds: ReadonlySet<string>,
): PublishVerdict {
  // RULE 1 — PROVENANCE. Non-negotiable, and it SUBSUMES the old Rule 4.
  // An AI-generated question published as board-prep content is a correctness
  // error that is cached, screenshot-able and permanent. 364 AI-pack rows also
  // carry a `pyqYear`; a separate check for that was dead code, because any row
  // reaching it had already returned here. Rejecting the row rejects the
  // fabricated board attribution with it.
  if (aiIds.has(q.id)) {
    return { ok: false, reason: "ai-generated-source", detail: q.id };
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
  const figureScan = `${q.questionText}\n${q.answer ?? ""}`;
  if (q.requiresDiagram || demandsSuppliedFigure(figureScan)) {
    return { ok: false, reason: "requires-absent-figure", detail: q.id };
  }

  return { ok: true };
}
