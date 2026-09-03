// lazytopper/scripts/seo/questionPageModel.ts
//
// ENGINE-0 — the PURE half of the static question-page generator.
//
// WHY A SEPARATE PURE MODULE. The generator writes files; a test cannot check a
// side effect without re-doing it. Everything that DECIDES anything lives here,
// takes its inputs as arguments, and returns a value — so `seoGenerator.guard.
// test.ts` exercises the identical code the build runs rather than a second,
// drifting model of it. The CLI half (`generateQuestionPages.ts`) does nothing
// but read files, call these functions, and write the result.
//
// ★ THE PROVENANCE LINE IS THE POINT OF THIS FILE (see `yearAttribution`).
// 364 questions carrying a `pyqYear` are AI-generated pack items. Rendering
// "From the 2023 CBSE board paper" on one of those is a fabricated citation on
// an indexed, screenshot-able page. That is not a style preference — it is the
// repo's standing "no fake data" doctrine applied to the one surface where the
// claim is checkable by a stranger.

import type { CanonicalQuestion } from "../../src/data/predictionTypes";

// ---------------------------------------------------------------------------
// 1 · STEP-MARK ANNOTATION — BOTH CONVENTIONS, DELIBERATELY
// ---------------------------------------------------------------------------

/**
 * Leading form: `"[1 mark] …"` / `"[0.5 marks] …"`.
 * This is the convention the Science bank actually uses (474 of 474 annotated
 * Light questions are leading-form; measured, not assumed).
 */
export const LEADING_MARK = /^\s*\[\s*\d+(?:\.\d+)?\s*mark/i;

/** Trailing form: `"… [2]"`. Present elsewhere in the bank; accepted here too. */
export const TRAILING_MARK = /\[\s*(\d+)\s*\]\s*$/;

/**
 * The mark value a step declares, or `null` when the step is not annotated.
 *
 * ⚠ Returns `null`, never `0`. A silent `0` would let an unannotated step ride
 * along inside a sum that still happened to match — the sum check would then be
 * passing for the wrong reason.
 */
export function stepMarkValue(step: string): number | null {
  const lead = step.match(/^\s*\[\s*(\d+(?:\.\d+)?)\s*mark/i);
  if (lead) return Number.parseFloat(lead[1]);
  const trail = step.match(TRAILING_MARK);
  if (trail) return Number.parseFloat(trail[1]);
  return null;
}

/** True when EVERY step carries a mark annotation in one of the two forms. */
export function isFullyStepAnnotated(q: CanonicalQuestion): boolean {
  const steps = q.solutionSteps;
  if (!Array.isArray(steps) || steps.length === 0) return false;
  return steps.every((s) => stepMarkValue(s) !== null);
}

/** True when the annotated step marks sum EXACTLY to the question's marks. */
export function stepMarksSumToMarks(q: CanonicalQuestion): boolean {
  if (!isFullyStepAnnotated(q)) return false;
  const total = q.solutionSteps!.reduce((acc, s) => acc + (stepMarkValue(s) ?? 0), 0);
  // Half-mark steps are real (CLAUDE.md §13), so the sum can be fractional.
  // Compare with a tolerance rather than `===` so 0.5 + 0.5 + 2 === 3 holds
  // under binary floating point.
  return Math.abs(total - q.marks) < 1e-9;
}

// ---------------------------------------------------------------------------
// 2 · SUPPLIED-FIGURE DEPENDENCE — a filter the spec did not list, and why
// ---------------------------------------------------------------------------

/**
 * ★ A FIFTH FILTER, ADDED DELIBERATELY. ENGINE-0's spec lists four (provenance,
 * step-marking, sum, floor) and separately forbids reading `figures` /
 * `notes/assets` — figures stay behind the login this release (owner ruling).
 *
 * Those two instructions collide on 115 of this topic's 663 non-AI questions
 * (97 carry the bank's own `requiresDiagram` flag; 18 are caught only by their
 * text), which open "Fig. 1 shows the image formed by a convex lens…". With
 * no figure on the page that question is unanswerable, and publishing it is the
 * same defect the honest-empty-state rule exists to prevent — a page that LOOKS
 * like content and cannot be used. So a question that references a SUPPLIED
 * figure is skipped.
 *
 * ⚠ "Draw a ray diagram" is NOT supplied-figure dependence — it is an
 * instruction TO THE STUDENT, and it is how CBSE words a 5-mark Light question.
 * A regex that banned the bare word "diagram" would drop all three of the
 * genuine 2023 board questions in this topic, which are exactly the items whose
 * provenance line this lane exists to render. The word list below is therefore
 * narrow on purpose: it matches a REFERENCE to a figure the page does not have.
 */
const SUPPLIED_FIGURE_PATTERNS: RegExp[] = [
  /\bfig\.?\s*\d/i, //                      "Fig. 1", "fig 2"
  /\b(?:the|this|given|following|above|below)\s+(?:figure|diagram|graph)\b/i,
  /\b(?:figure|diagram|graph)\s+(?:shows?|shown|given|below|above)\b/i,
  /\bshown\s+in\s+the\s+(?:figure|diagram|graph)\b/i,
  /\bas\s+shown\b/i,
];

export function dependsOnSuppliedFigure(q: CanonicalQuestion): boolean {
  if (q.requiresDiagram === true) return true;
  const haystacks = [q.questionText, ...(q.solutionSteps ?? []), q.answer ?? ""];
  return haystacks.some((h) => SUPPLIED_FIGURE_PATTERNS.some((re) => re.test(h)));
}

// ---------------------------------------------------------------------------
// 3 · SELECTION
// ---------------------------------------------------------------------------

export interface SelectionResult {
  selected: CanonicalQuestion[];
  eligible: CanonicalQuestion[];
  counts: {
    topicTotal: number;
    skippedAiPack: number;
    skippedFigure: number;
    skippedStepMarking: number;
    skippedSum: number;
    eligible: number;
    selected: number;
  };
}

/** The floor below which NO page is emitted. A thin page is worse than none. */
export const MIN_QUESTIONS = 8;
/** The ceiling. §2.5 asks for 8–12 questions. */
export const MAX_QUESTIONS = 12;

/**
 * Select the questions for one topic page.
 *
 * ★ FULLY DETERMINISTIC — no `Math.random`, no `Date.now`, no iteration-order
 * dependence. Ties break on `id`, so two runs over the same bank emit the same
 * page byte-for-byte, which is what makes the committed output reviewable.
 *
 * The spread rule: walk the mark bands ascending and take one question from each
 * in turn until the ceiling is reached. A page that is twelve 1-mark MCQs would
 * satisfy every filter and teach a reader nothing about the chapter.
 */
export function selectQuestions(
  bank: readonly CanonicalQuestion[],
  topicKey: string,
  aiGeneratedIds: ReadonlySet<string>,
): SelectionResult {
  const topicQuestions = bank
    .filter((q) => q.topicKey === topicKey)
    .slice()
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  let skippedAiPack = 0;
  let skippedFigure = 0;
  let skippedStepMarking = 0;
  let skippedSum = 0;
  const eligible: CanonicalQuestion[] = [];

  for (const q of topicQuestions) {
    // 1 · Provenance. Non-negotiable, and FIRST — an AI-pack question is never
    //     considered again for any reason.
    if (aiGeneratedIds.has(q.id)) {
      skippedAiPack += 1;
      continue;
    }
    // 2 · Supplied-figure dependence (see the note on the constant above).
    if (dependsOnSuppliedFigure(q)) {
      skippedFigure += 1;
      continue;
    }
    // 3 · Step-marking. A FILTER, NOT A GATE: skip and count, never throw.
    if (!isFullyStepAnnotated(q)) {
      skippedStepMarking += 1;
      continue;
    }
    // 4 · Sum check.
    if (!stepMarksSumToMarks(q)) {
      skippedSum += 1;
      continue;
    }
    eligible.push(q);
  }

  // Spread across mark bands, ascending, round-robin.
  const bands = new Map<number, CanonicalQuestion[]>();
  for (const q of eligible) {
    const band = bands.get(q.marks);
    if (band) band.push(q);
    else bands.set(q.marks, [q]);
  }
  // ★ WITHIN A BAND, A QUESTION WITH VERIFIABLE BOARD PROVENANCE GOES FIRST.
  // Not a cosmetic preference: a real past-paper question is the most valuable
  // item on the page, AND without this rule the id-sorted round-robin never
  // reaches this topic's three genuine 2023 board questions — which would leave
  // `yearAttribution` rendered nowhere on the page it exists to protect, i.e. an
  // assertion about it that passes for want of a subject.
  const orderedBands = [...bands.keys()]
    .sort((a, b) => a - b)
    .map((m) =>
      bands
        .get(m)!
        .sort((a, b) => {
          const aAttr = yearAttribution(a, aiGeneratedIds) !== null ? 0 : 1;
          const bAttr = yearAttribution(b, aiGeneratedIds) !== null ? 0 : 1;
          if (aAttr !== bAttr) return aAttr - bAttr;
          return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
        }),
    );

  const selected: CanonicalQuestion[] = [];
  let cursor = 0;
  while (selected.length < MAX_QUESTIONS && orderedBands.some((b) => b.length > cursor)) {
    for (const band of orderedBands) {
      if (selected.length >= MAX_QUESTIONS) break;
      if (band.length > cursor) selected.push(band[cursor]);
    }
    cursor += 1;
  }

  return {
    selected,
    eligible,
    counts: {
      topicTotal: topicQuestions.length,
      skippedAiPack,
      skippedFigure,
      skippedStepMarking,
      skippedSum,
      eligible: eligible.length,
      selected: selected.length,
    },
  };
}

// ---------------------------------------------------------------------------
// 4 · PROVENANCE — THE FABRICATION LINE
// ---------------------------------------------------------------------------

/**
 * The board-paper attribution for a question, or `null` when there is none to
 * make honestly.
 *
 * Returns `null` when EITHER the question has no `pyqYear` OR it is an
 * AI-generated pack item. The second clause is the one that matters: 364 pack
 * questions carry a `pyqYear`, and rendering it would assert to a crawler, and
 * to a student, that a machine-written question appeared on a CBSE paper.
 *
 * ❌ THIS FUNCTION WILL NEVER RETURN A FREQUENCY. "Appeared in N of the last 10
 * papers" is not derivable from this repo: the bank records a YEAR PER QUESTION
 * and there is no paper inventory anywhere to divide by. A number with no
 * denominator is an invented statistic, and it would be invented on the one
 * surface where a reader cannot check it.
 */
export function yearAttribution(
  q: CanonicalQuestion,
  aiGeneratedIds: ReadonlySet<string>,
): string | null {
  if (aiGeneratedIds.has(q.id)) return null;
  const year = (q.pyqYear ?? "").trim();
  if (!/^\d{4}$/.test(year)) return null;
  return `From the ${year} CBSE board paper`;
}

// ---------------------------------------------------------------------------
// 5 · HTML
// ---------------------------------------------------------------------------

/**
 * Escape for HTML text content.
 *
 * ⚠ `&` IS ESCAPED CONDITIONALLY, AND THAT IS NOT SLOPPINESS. The note specs in
 * `notes/specs/*.json` are authored with entities already in them
 * ("mirrors &amp; lenses"). Escaping unconditionally would ship `&amp;amp;` to a
 * reader; escaping not at all would leave a stray `&` in question text
 * unescaped. So a `&` that already opens a well-formed entity is left alone and
 * every other one is escaped.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&(?!(?:#\d+|#[xX][0-9a-fA-F]+|[A-Za-z][A-Za-z0-9]*);)/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * ★★ LaTeX -> READABLE PLAIN TEXT, AND WHY THIS PAGE CANNOT JUST SHIP THE LaTeX.
 *
 * The note specs store maths as LaTeX inside `$…$` because the APP renders it
 * with KaTeX. This page has no KaTeX and must not acquire it: its entire premise
 * is that a crawler running NO JavaScript sees the content, and a `<script>` tag
 * is precisely what that promise excludes.
 *
 * Shipping the raw source instead is not a neutral choice — an indexed page that
 * reads `$\dfrac{\sin i}{\sin r}$` is broken to a human and to a crawler alike.
 * So the small subset of LaTeX these specs actually use is converted to the
 * plain-text form a student would write by hand: `sin i / sin r`.
 *
 * ⚠ DELIBERATELY NARROW. It handles what `notes/specs/*.json` contains and
 * nothing more. An unrecognised command loses only its backslash, so it degrades
 * to readable text rather than to markup — and the guard test asserts that no
 * stray `$`, `\` or `\dfrac` survives onto the page, so an unhandled construct in
 * a future spec goes RED instead of shipping.
 */
export function mathToText(input: string): string {
  let s = input;
  // ⚠ ORDER IS LOAD-BEARING, AND IT WAS LEARNED BY SHIPPING IT WRONG ONCE.
  // `\dfrac{\text{real depth}}{\text{apparent depth}}` has BRACES INSIDE the
  // fraction's arguments, so the `[^{}]*` fraction pattern cannot match until the
  // inner `\text{…}` groups are gone. Running the fraction pass first left four
  // bare `dfrac` tokens on the rendered page. Wrapper commands are therefore
  // flattened FIRST, to a fixed point, and only then are fractions unwound.
  const wrapper = /\\(?:text|mathrm|mathbf|operatorname)\{([^{}]*)\}/;
  for (let i = 0; i < 8 && wrapper.test(s); i += 1) {
    s = s.replace(new RegExp(wrapper.source, "g"), "$1");
  }
  // Fractions, innermost-first so a nested \dfrac unwinds.
  const frac = /\\[dt]?frac\{([^{}]*)\}\{([^{}]*)\}/;
  for (let i = 0; i < 8 && frac.test(s); i += 1) {
    s = s.replace(frac, (_m, a: string, b: string) => `${a.trim()} / ${b.trim()}`);
  }
  s = s
    .replace(/\\sqrt\{([^{}]*)\}/g, "root($1)")
    .replace(/\\angle/g, "∠")
    .replace(/\\times/g, "×")
    .replace(/\\cdot/g, "·")
    .replace(/\\pm/g, "±")
    .replace(/\\neq/g, "≠")
    .replace(/\\approx/g, "≈")
    .replace(/\\infty/g, "∞")
    .replace(/\\theta/g, "θ")
    .replace(/\\lambda/g, "λ")
    .replace(/\\mu(?![A-Za-z])/g, "μ")
    .replace(/\\circ(?![A-Za-z])/g, "°")
    .replace(/\\rightarrow|\\to(?![A-Za-z])/g, "→")
    .replace(/&nbsp;/g, " ")
    .replace(/\\[,;: ]/g, " ") // thin / medium spaces
    .replace(/\\\\/g, " ")
    .replace(/\\[A-Za-z]+/g, (m) => m.slice(1)) // unknown command: drop the backslash only
    .replace(/[{}]/g, "")
    .replace(/\$/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
  return s;
}

/** The token the renderer leaves where the modification date goes. */
export const DATE_PLACEHOLDER = "__ENGINE0_DATE_MODIFIED__";

/**
 * ★★★ THE BOARD SUBJECT, DERIVED — NEVER THE WORD "SCIENCE" TYPED IN.
 *
 * ⚠ THIS WAS A LIVE FABRICATION WAITING FOR THE SECOND PAGE. Until this function
 * existed the renderer hardcoded "Class 10 Science" in SEVEN places — `<title>`,
 * `<h1>`, `og:title`, the meta description and both JSON-LD blocks — which was
 * true of ENGINE-0's single Physics page and FALSE of five of the ten topics
 * ENGINE-1 emits. `Triangles — Class 10 Science, NCERT Chapter 6` is a wrong fact
 * about the CBSE syllabus, published under our name, on the one surface a stranger
 * can check. That is the "no fake data" doctrine, not a copy nit.
 *
 * `meta.subject` in the note specs is the FINE-GRAINED strand — physics,
 * chemistry, biology, maths. CBSE examines the first three as ONE subject,
 * "Science", and maths as "Mathematics". The board's name is what a student
 * searches for, so the board's name is what the page says.
 */
export function boardSubject(specSubject: string): string {
  return specSubject.trim().toLowerCase() === "maths" ? "Mathematics" : "Science";
}

export interface NoteSpec {
  meta: {
    topic_key: string;
    subject: string;
    chapter_no: number;
    title: string;
    weightage: string;
    source_edition: string;
  };
  board_asks?: string | null;
  big_idea?: { tagline?: string | null; body?: string | null } | null;
  definitions?: Array<{ term: string; plain?: string | null; verbatim?: string | null }>;
  formula_strip?: Array<{ label: string; math: string }>;
  pitfalls?: Array<{ text: string }>;
  source_ledger?: Array<{ item: string; type: string; source: string }>;
}

/** One sibling page this page links to. §4's interlinking is built from these. */
export interface RelatedPage {
  /** Site-absolute path, e.g. `/questions/class-10/maths/triangles/`. */
  urlPath: string;
  /** The chapter title as the note spec states it. */
  title: string;
  /** One line describing the chapter, for the hub and the related list. */
  blurb: string;
}

export interface PageInput {
  note: NoteSpec;
  questions: readonly CanonicalQuestion[];
  aiGeneratedIds: ReadonlySet<string>;
  /** Site-absolute path this page is served at, e.g. `/questions/a/b/`. */
  urlPath: string;
  origin: string;
  /**
   * ★★ THE OTHER PAGES IN THE SET, AND THE HUB ABOVE THEM. §4 — and this is the
   * half ENGINE-0 lacked. Its one page was an ORPHAN: `href="/questions/…"` count
   * was ZERO, and Google returned "Crawled — currently not indexed". A hub with
   * ten children reads as a section of a site; one page in an empty namespace
   * reads as nothing to evaluate. The spec says this "may matter more than the
   * content change".
   *
   * Optional so ENGINE-0's fixtures and any single-page call still render.
   */
  related?: readonly RelatedPage[];
  /** The subject hub this page belongs under, e.g. `/questions/class-10/maths/`. */
  hubPath?: string;
  /** The hub's human name, e.g. "Class 10 Mathematics". */
  hubTitle?: string;
}

/**
 * ★ EVERY NUMBER ON THE PAGE IS DERIVED FROM AN INPUT (§2.4).
 * The chapter number, title and weightage band come from `note.meta`; the marks
 * and the per-step marks come from the question objects; the question count is
 * `questions.length`. Nothing here is typed in by hand, so a test can check any
 * of them against its source rather than against a copy of itself.
 */
/**
 * ★★ THE ONE JSON-LD SERIALISER. Exported so the hub renderer in
 * `generateQuestionPages.ts` CALLS it instead of keeping a second copy.
 *
 * ⚠ THERE WAS A SECOND COPY, AND IT WAS BROKEN. The hub's own version wrote the
 * closing-tag escape with a single backslash, which JavaScript collapses, so it
 * replaced `</` WITH ITSELF — a no-op. CodeQL flagged it MEDIUM as "Replacement
 * of a substring with itself". Nothing else caught it: not 2,004 tests, not the
 * matrices, not the build.
 *
 * A `</script>` inside a JSON string value would otherwise close the block early,
 * which is why this exists at all. One definition, one call path, no drift.
 */
export function jsonLdBlock(o: unknown): string {
  return JSON.stringify(o, null, 2).replace(/<\//g, "<\\/");
}

export function renderPage(input: PageInput): string {
  const { note, questions, aiGeneratedIds, urlPath, origin } = input;
  const meta = note.meta;
  const canonical = `${origin}${urlPath}`;
  const totalMarks = questions.reduce((a, q) => a + q.marks, 0);
  const subject = boardSubject(meta.subject);
  const related = input.related ?? [];

  // Note-spec prose carries LaTeX; this page has no KaTeX and must stay
  // script-free, so maths is flattened to readable text BEFORE escaping.
  const noteText = (s: string) => escapeHtml(mathToText(s));

  const title = escapeHtml(meta.title);
  const heading = `${title} — Class 10 ${subject}, NCERT Chapter ${meta.chapter_no}`;

  // ---- notes -------------------------------------------------------------
  const bigIdea =
    note.big_idea && (note.big_idea.tagline || note.big_idea.body)
      ? `<p class="lede">${noteText(
          [note.big_idea.tagline, note.big_idea.body].filter(Boolean).join(" ") as string,
        )}</p>`
      : // ★ HONEST EMPTY STATE. `big_idea` is `{tagline: null, body: null}` in
        // this topic's spec. §2.3 asks for it; there is nothing there. The page
        // omits the block rather than inventing a sentence to fill it.
        "";

  const boardAsks = note.board_asks
    ? `<section class="block" id="board-asks"><h2>What the board actually asks</h2><p>${noteText(
        note.board_asks,
      )}</p></section>`
    : "";

  /**
   * ★★ EACH DEFINITION CARRIES ITS NCERT PAGE CITATION (§3.4).
   *
   * The citation is the specificity a content farm cannot fake, and the spec puts
   * it ON the definition rather than in a list at the foot — a page number three
   * screens away from the term it belongs to is not a citation a reader can use.
   *
   * ⚠ MATCHED, NEVER SYNTHESISED. `source_ledger[].item` is matched against
   * `definitions[].term`, case- and space-insensitively. Where the ledger has no
   * row for a term the citation is OMITTED — measured at 2339ebf7, `triangles`
   * resolves 7 of 10 and every other spec resolves all of them. Inventing "NCERT
   * p.___" for the other three would be the exact fabrication this page exists to
   * be trusted against, so the honest empty state applies here too.
   */
  const ledgerFor = new Map<string, string>();
  for (const row of note.source_ledger ?? []) {
    const key = (row.item ?? "").trim().toLowerCase().replace(/\s+/g, " ");
    if (key && row.source && !ledgerFor.has(key)) ledgerFor.set(key, row.source);
  }
  const citationFor = (term: string): string => {
    const src = ledgerFor.get(term.trim().toLowerCase().replace(/\s+/g, " "));
    return src ? ` <span class="cite">${escapeHtml(src)}</span>` : "";
  };

  const definitions = (note.definitions ?? []).length
    ? `<section class="block" id="definitions"><h2>Key definitions</h2><dl>${(note.definitions ?? [])
        .map(
          (d) =>
            `<dt>${noteText(d.term)}</dt><dd>${noteText(
              (d.plain ?? d.verbatim ?? "").trim(),
            )}${citationFor(d.term)}</dd>`,
        )
        .join("")}</dl></section>`
    : "";

  const formulas = (note.formula_strip ?? []).length
    ? `<section class="block" id="formula-sheet"><h2>Formula sheet</h2><ul class="formulas">${(
        note.formula_strip ?? []
      )
        .map((f) => `<li><b>${noteText(f.label)}</b> ${noteText(f.math)}</li>`)
        .join("")}</ul></section>`
    : "";

  const pitfalls = (note.pitfalls ?? []).length
    ? `<section class="block" id="pitfalls"><h2>Common mistakes — where marks are lost</h2><ul>${(note.pitfalls ?? [])
        .map((p) => `<li>${noteText(p.text)}</li>`)
        .join("")}</ul></section>`
    : "";

  const ledger = (note.source_ledger ?? []).length
    ? `<section class="block"><h2>NCERT sources</h2><p class="edition">${escapeHtml(
        meta.source_edition,
      )}</p><ul class="ledger">${(note.source_ledger ?? [])
        .map((s) => `<li>${noteText(s.item)} — ${escapeHtml(s.source)}</li>`)
        .join("")}</ul></section>`
    : "";


  /**
   * ★★★ THE INTERLINKING — §4, AND THE HALF ENGINE-0 DID NOT HAVE.
   *
   * ENGINE-0 shipped one page. Google crawled it and returned "Crawled — currently
   * not indexed", and a site-search for its exact `<h1>` returns nothing. That is a
   * JUDGEMENT, not a routing failure: an orphan page in an empty namespace gave the
   * crawler nothing to evaluate. Measured on trunk, this renderer emitted ZERO
   * `href="/questions/…"` links.
   *
   * A hub with ten children, each linking back to the hub and across to its
   * siblings, reads as a SECTION OF A SITE. The spec says this "may matter more
   * than the content change", and it costs nothing to be right about.
   */
  const relatedBlock = related.length
    ? `<section class="block" id="related"><h2>More Class 10 board-question pages</h2><ul class="related">${related
        .map(
          (r) =>
            `<li><a href="${escapeHtml(r.urlPath)}">${escapeHtml(r.title)}</a> — ${escapeHtml(r.blurb)}</li>`,
        )
        .join("")}</ul>${
        input.hubPath
          ? `<p class="hublink"><a href="${escapeHtml(input.hubPath)}">All ${escapeHtml(
              input.hubTitle ?? `Class 10 ${subject}`,
            )} chapters</a></p>`
          : ""
      }</section>`
    : "";

  // ---- questions ---------------------------------------------------------
  const questionBlocks = questions
    .map((q, i) => {
      const attribution = yearAttribution(q, aiGeneratedIds);
      const options =
        Array.isArray(q.options) && q.options.length > 0
          ? `<ol class="options">${q.options
              .map((o) => `<li>${escapeHtml(o)}</li>`)
              .join("")}</ol>`
          : "";
      const steps = (q.solutionSteps ?? [])
        .map((s) => `<li>${escapeHtml(s)}</li>`)
        .join("");
      const finalAnswer = q.finalAnswer
        ? `<p class="final"><b>Answer.</b> ${escapeHtml(q.finalAnswer)}</p>`
        : q.answer
          ? `<p class="final"><b>Answer.</b> ${escapeHtml(q.answer)}</p>`
          : "";
      return [
        `<article class="q" id="q${i + 1}" data-qid="${escapeHtml(q.id)}">`,
        `<h3>Q${i + 1}. <span class="marks">${q.marks} mark${q.marks === 1 ? "" : "s"}</span> <span class="tag">${escapeHtml(q.subtopic)}</span></h3>`,
        attribution ? `<p class="pyq">${escapeHtml(attribution)}</p>` : "",
        `<p class="qtext">${escapeHtml(q.questionText)}</p>`,
        options,
        `<h4>Step-marked solution</h4>`,
        `<ol class="steps">${steps}</ol>`,
        finalAnswer,
        `</article>`,
      ].join("");
    })
    .join("");

  // ---- JSON-LD -----------------------------------------------------------
  const learningResource = {
    "@context": "https://schema.org",
    "@type": ["LearningResource", "Course"],
    name: `${meta.title} — Class 10 ${subject}`,
    description:
      `Step-marked CBSE Class 10 ${subject} questions on ${meta.title} (NCERT ` +
      `Chapter ${meta.chapter_no}), with the mark scheme shown step by step.`,
    url: canonical,
    inLanguage: "en",
    educationalLevel: "CBSE Class 10",
    learningResourceType: "Practice questions with worked solutions",
    teaches: meta.title,
    provider: { "@type": "Organization", name: "LazyTopper", url: origin },
    dateModified: DATE_PLACEHOLDER,
  };

  const quiz = {
    "@context": "https://schema.org",
    "@type": "Quiz",
    name: `${meta.title} — step-marked CBSE questions`,
    url: canonical,
    educationalLevel: "CBSE Class 10",
    about: { "@type": "Thing", name: meta.title },
    numberOfQuestions: questions.length,
    hasPart: questions.map((q) => ({
      "@type": "Question",
      name: q.questionText,
      educationalAlignment: {
        "@type": "AlignmentObject",
        alignmentType: "educationalSubject",
        targetName: q.subtopic,
      },
      acceptedAnswer: {
        "@type": "Answer",
        text: q.finalAnswer ?? q.answer ?? (q.solutionSteps ?? []).join(" "),
      },
    })),
  };

  // ★ `</script>` inside JSON would close the block early. There is none today,
  // but the escape is one line and its absence is a silent XSS-shaped bug.

  const description =
    `${questions.length} step-marked CBSE Class 10 ${subject} questions on ` +
    `${meta.title} (NCERT Chapter ${meta.chapter_no}), ${totalMarks} marks in ` +
    `total, each with the mark scheme shown step by step.`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${heading} | LazyTopper</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${canonical}">
<meta name="robots" content="index,follow">
<meta property="og:type" content="article">
<meta property="og:title" content="${heading}">
<meta property="og:url" content="${canonical}">
<meta property="og:description" content="${escapeHtml(description)}">
<style>
:root{--navy:#0b1f3a;--ink:#12263f;--soft:#f7f9fc;--line:#dfe6ef;--accent:#1f9d63;}
*{box-sizing:border-box}
body{margin:0;background:var(--soft);color:var(--ink);font:16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.wrap{max-width:820px;margin:0 auto;padding:24px 20px 64px}
header.site{background:var(--navy);color:#fff}
header.site .wrap{padding:14px 20px;display:flex;justify-content:space-between;align-items:center}
header.site a{color:#fff;text-decoration:none;font-weight:600}
h1{font-size:1.75rem;line-height:1.25;margin:24px 0 8px;color:var(--navy)}
h2{font-size:1.15rem;margin:32px 0 8px;color:var(--navy)}
h3{font-size:1.02rem;margin:0 0 6px;color:var(--navy)}
h4{font-size:.86rem;text-transform:uppercase;letter-spacing:.06em;color:#5b6b80;margin:14px 0 6px}
.facts{color:#5b6b80;font-size:.92rem;margin:0 0 8px}
.lede{font-size:1.05rem}
.block{border-top:1px solid var(--line);padding-top:4px}
.formulas,.ledger,.options,.steps{padding-left:22px}
.formulas li,.ledger li{margin:4px 0}
dl dt{font-weight:600;margin-top:10px}
dl dd{margin:2px 0 0 0;color:#3b4a5e}
.q{background:#fff;border:1px solid var(--line);border-radius:10px;padding:16px;margin:14px 0}
.marks{color:var(--accent);font-weight:600;font-size:.9rem}
.tag{color:#5b6b80;font-weight:400;font-size:.85rem}
.pyq{display:inline-block;background:#eef6f1;color:#14663f;border-radius:999px;padding:2px 10px;font-size:.8rem;margin:0 0 8px}
.qtext{margin:6px 0}
.steps li{margin:6px 0}
.final{background:var(--soft);border-left:3px solid var(--accent);padding:8px 12px;margin:12px 0 0}
.cta{margin:36px 0 0;background:var(--navy);color:#fff;border-radius:12px;padding:20px}
.cta a{display:inline-block;margin-top:10px;background:var(--accent);color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600}
.cite{display:block;margin-top:2px;color:#5b6b80;font-size:.82rem}
.related{padding-left:22px}
.related li{margin:6px 0}
.related a{color:var(--navy);font-weight:600}
.hublink{margin:12px 0 0}
.hublink a{color:var(--navy);font-weight:600}
footer.site{border-top:1px solid var(--line);margin-top:40px;padding-top:14px;color:#5b6b80;font-size:.85rem}
</style>
<script type="application/ld+json">
${jsonLdBlock(learningResource)}
</script>
<script type="application/ld+json">
${jsonLdBlock(quiz)}
</script>
</head>
<body>
<header class="site"><div class="wrap"><a href="/app/">LazyTopper</a><a href="/app/">Open the study cockpit</a></div></header>
<div class="wrap">
<main>
<h1>${heading}</h1>
<p class="facts">Board weightage: ${escapeHtml(meta.weightage)} &middot; ${questions.length} step-marked questions &middot; ${totalMarks} marks in total</p>
${bigIdea}
${formulas}
${definitions}
${boardAsks}
<section class="block" id="questions"><h2>Practice questions with worked solutions</h2>
<p class="facts">Every solution below is broken into the steps CBSE awards marks for, so you can see where each mark is earned.</p>
${questionBlocks}
</section>
${pitfalls}
${relatedBlock}
${ledger}
<aside class="cta">
<b>Practise this chapter with the mark scheme in front of you.</b>
<p>LazyTopper grades your working step by step, the way a CBSE examiner does.</p>
<a href="/app/">Open LazyTopper</a>
</aside>
</main>
<footer class="site">Last updated ${DATE_PLACEHOLDER} &middot; ${escapeHtml(meta.source_edition)}</footer>
</div>
</body>
</html>
`;
}
