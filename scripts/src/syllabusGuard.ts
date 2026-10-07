import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// ─────────────────────────────────────────────────────────────────────────────
// SYLLABUS GUARD — CBSE Class 10 (2026-27)
//
// Two scan modes:
//   (1) QUESTION-BANK scan  — exact, full-string match against the `subtopic:`
//       field value. Precise, zero false positives. Gates the question banks.
//   (2) BOARD-PREP SURFACE scan — curated, word-boundary phrase match across the
//       NON-question-bank surfaces that assemble or describe board content (HPQ,
//       mocks, worksheets, practice/daily-mix, exam-trends/topic metadata, tutor
//       teach-contracts). Uses ONLY unambiguous, content-specific phrases and
//       NEVER bare generics (e.g. "Evolution", "Generator", "Motor", "Fossil",
//       "Stakeholders", "Constructions", "Division Algorithm") so it cannot trip
//       on legitimate prose ("gas evolution", "evolution of heat") or code
//       identifiers (worksheetGenerator, dailyMixGenerator). Preserved
//       in-syllabus terms (Heredity, Mendel, Step Deviation, reproductive
//       health, …) are NEVER on any banned list — see SURFACE scan tests.
//
// Authority: owner-signed-off verification report report-syllabus-verification-
// 2026-06-04.md, verified against the LIVE official CBSE 2026-27 Class X syllabus
// (Maths Code 041/241 — Maths_SecP1X_2026-27.pdf; Science Code 086 —
// Science_SecP1_2026-27.pdf; cbseacademic.nic.in).
// ─────────────────────────────────────────────────────────────────────────────

interface BannedSubtopicRule {
  board: string;
  year: string;
  subject: string;
  grade: string;
  bannedSubtopics: string[];
  questionBankDir: string;
}

const RULES: BannedSubtopicRule[] = [
  {
    board: "CBSE",
    year: "2026-27",
    subject: "Maths",
    grade: "Class 10",
    // Source: official CBSE Class X Mathematics (Code 041 & 241) Syllabus
    //   2026-27 (cbseacademic.nic.in — SecPart1/Maths_SecP1X_2026-27.pdf).
    // OUT of the official 2026-27 Class X content (banned at question-bank level):
    //   Constructions (entire chapter), Euclid's Division Lemma/Algorithm,
    //   Polynomial Division Algorithm, Decimal Representation of Rationals,
    //   Cross-Multiplication Method, Trig Complementary Angles, Frustum of Cone,
    //   Ogive / Cumulative Frequency Graph, Area of Triangle (Coordinate
    //   Geometry), Conversion of Solids (Surface Areas & Volumes), and the
    //   CUBIC zeroes–coefficient relationship (Polynomials is restricted to the
    //   QUADRATIC zeroes–coefficient relationship only).
    // IN (do NOT ban): Step Deviation Method — official Statistics text reads
    //   "Computes the mean … using direct, assumed mean and step deviation
    //   method." Banning it wrongly stripped a valid examined method.
    bannedSubtopics: [
      // Real Numbers — deleted sub-topics
      "Euclid's Division Lemma",
      "Euclid Division Lemma",
      "Euclid's Division Algorithm",
      "Decimal Representation of Rational Numbers",
      "Terminating and Non-Terminating Decimals",
      // Polynomials — deleted sub-topic + CUBIC zeroes–coefficient (quadratic only is IN)
      "Division Algorithm for Polynomials",
      "Polynomial Division Algorithm",
      "Division Algorithm",
      "Zeroes and Coefficients of Cubic Polynomials",
      "Zeroes of Cubic Polynomials",
      "Cubic Polynomial Zeroes-Coefficient Relationship",
      "Relationship Between Zeroes and Coefficients of Cubic Polynomials",
      // Pair of Linear Equations — deleted method
      "Cross-Multiplication Method",
      "Cross Multiplication Method",
      // Coordinate Geometry — deleted sub-topic (Coord Geom = distance + section only)
      "Area of a Triangle in Coordinate Geometry",
      "Area of Triangle in Coordinate Geometry",
      "Area of Triangle (Coordinate Geometry)",
      // Trigonometry — deleted sub-topic
      "Trigonometric Ratios of Complementary Angles",
      "Complementary Angles Trigonometry",
      "T-Ratios of Complementary Angles",
      // Mensuration — deleted sub-topics
      "Frustum of Cone",
      "Conversion of Solids",
      "Conversion of Solid from One Shape to Another",
      // Statistics — deleted sub-topics
      //   (Step Deviation Method is IN — NOT banned. Ogive/graph forms are OUT.)
      "Ogive",
      "Graph/Ogive",
      "Cumulative Frequency Graph",
      "Cumulative Frequency Curve",
      "Less Than Ogive",
      "More Than Ogive",
      "Less-Than Ogive",
      "More-Than Ogive",
      // Constructions — entire chapter deleted
      "Constructions",
      "Division of Line Segment",
      "Division of a Line Segment",
      "Construction of Tangents",
      "Construction of Similar Triangles",
      "Constructing Similar Triangles",
    ],
    questionBankDir: join(
      import.meta.dirname,
      "../../lazytopper/src/data/questionBanks/class10/maths"
    ),
  },
  {
    board: "CBSE",
    year: "2026-27",
    subject: "Science",
    grade: "Class 10",
    // Source: official CBSE Class X Science (Code 086) Syllabus 2026-27
    //   (cbseacademic.nic.in — SecPart1/Science_SecP1_2026-27.pdf).
    // OUT of board-assessed scope (banned at question-bank level):
    //   • Ch5 Periodic Classification of Elements (formative-only — not assessed
    //     in the year-end exam; excluded from board-prep surfaces by owner doctrine)
    //   • Ch9 Evolution section (formative-only — Heredity/Mendel/sex-determination
    //     are RETAINED & assessed and are NOT banned)
    //   • Ch14 Sources of Energy (truly deleted)
    //   • Ch16 Management of Natural Resources (truly deleted)
    // RETAINED & ASSESSED in 2026-27 (do NOT ban — must NOT match any banned term):
    //   • Heredity, Mendel's contribution, Laws of Inheritance, Sex Determination
    //   • Ch8 Reproduction incl. reproductive health (family planning, safe sex
    //     vs HIV/AIDS, child bearing & women's health)
    //   • Ch15 Our Environment (ecology, food chains, trophic levels, pollution,
    //     waste management — Unit V, 5 marks)
    //   • Carbon & its Compounds "homologous series" (distinct from the banned
    //     evolution term "homologous organs")
    // Formative-only Motor / Electromagnetic Induction / Electric Generator are
    //   enforced as board-prep exclusions via the SURFACE scan below (precise
    //   multi-word phrases only), NOT at the question-bank level.
    bannedSubtopics: [
      // Ch 5 — Periodic Classification of Elements (formative-only; board-excluded)
      "Periodic Classification",
      "Periodic Classification of Elements",
      "Newlands Octaves",
      "Dobereiner's Triads",
      "Dobereiner Triads",
      "Mendeleev's Periodic Table",
      "Mendeleev Periodic Table",
      "Modern Periodic Table",
      "Modern Periodic Law",
      "Periods and Groups",
      "Periodicity of Properties",
      // Ch 8 Reproductive Health subtopics — RETAINED in 2026-27 (no entries)
      // Ch 9 — Evolution section (formative-only; board-excluded). Heredity/
      //   Mendel/Sex-Determination/Inheritance of Traits are RETAINED — NOT here.
      "Evolution",
      "Natural Selection",
      "Speciation",
      "Phylogeny",
      "Fossil",
      "Fossils",
      "Human Evolution",
      "Evolutionary Relationships",
      "Tracing Evolutionary Relationships",
      "Evolution and Classification",
      "Evolution by Stages",
      "Acquired Traits",
      "Acquired and Inherited Traits",
      "Origin of Life",
      "Homologous Organs",
      "Analogous Organs",
      "Vestigial Organs",
      "Darwin",
      "Darwinism",
      "Neo-Darwinism",
      "Evidence of Evolution",
      // Ch 14 — Sources of Energy (entire chapter deleted)
      "Sources of Energy",
      "Conventional Sources of Energy",
      "Conventional Sources",
      "Non-conventional Sources",
      "Non-Conventional Sources of Energy",
      "Solar Energy",
      "Wind Energy",
      "Hydropower",
      "Hydro Energy",
      "Nuclear Energy",
      "Nuclear Fission",
      "Nuclear Fusion",
      "Biogas",
      "Tidal Energy",
      "Geothermal Energy",
      "Fossil Fuels",
      "Thermal Power",
      "Ocean Thermal Energy",
      "Wave Energy",
      "Energy from Sea",
      // Ch 15 Our Environment — RETAINED in 2026-27 under Unit V (5 marks; no entries)
      // Ch 16 — Management of Natural Resources (entire chapter deleted)
      "Management of Natural Resources",
      "Natural Resources Management",
      "Conservation of Natural Resources",
      "Reforestation",
      "Water Harvesting",
      "Rainwater Harvesting",
      "Ganga Action Plan",
      "Wildlife Conservation",
      "Chipko Movement",
      "Sustainable Development",
      "Reduce Reuse Recycle",
      "Forest Conservation",
      "Stakeholders",
    ],
    questionBankDir: join(
      import.meta.dirname,
      "../../lazytopper/src/data/questionBanks/class10/science"
    ),
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// BOARD-PREP SURFACE scan (PART C)
//
// Curated, unambiguous, content-specific banned phrases. Matched as whole
// phrases with word boundaries (case-insensitive) anywhere in a surface file.
// DELIBERATELY EXCLUDES bare generics that collide with legitimate prose or
// code: "Evolution" (gas evolution), "Generator"/"Motor"/"Induction" (code +
// retained-chapter prose), "Fossil"/"Darwin" (record/prose), "Constructions",
// "Division Algorithm", "Stakeholders", "Sustainable Development". It also
// NEVER contains a preserved in-syllabus term.
// ─────────────────────────────────────────────────────────────────────────────

export const SURFACE_BANNED_PHRASES: string[] = [
  // ── Maths — board-deleted (unambiguous phrases) ──
  "Euclid's Division Lemma",
  "Euclid's Division Algorithm",
  "Decimal Representation of Rational Numbers",
  "Division Algorithm for Polynomials",
  "Cross-Multiplication Method",
  "Cross Multiplication Method",
  "Area of a Triangle in Coordinate Geometry",
  "Area of Triangle in Coordinate Geometry",
  "Trigonometric Ratios of Complementary Angles",
  "Frustum of Cone",
  "Frustum of a Cone",
  "Conversion of Solids",
  "Ogive",
  "Cumulative Frequency Graph",
  "Cumulative Frequency Curve",
  "Construction of Tangents",
  "Construction of Similar Triangles",
  "Division of a Line Segment",
  // ── Science — Periodic Classification (formative-only; board-excluded) ──
  "Periodic Classification",
  "Newlands Octaves",
  "Dobereiner's Triads",
  "Mendeleev's Periodic Table",
  "Modern Periodic Table",
  "Modern Periodic Law",
  // ── Science — Evolution section (formative-only; board-excluded) ──
  //   precise phrases only — bare "Evolution"/"Fossil"/"Darwin" deliberately omitted.
  "Natural Selection",
  "Speciation",
  "Human Evolution",
  "Evolutionary Relationships",
  "Tracing Evolutionary Relationships",
  "Evolution and Classification",
  "Evolution by Stages",
  "Acquired and Inherited Traits",
  "Homologous Organs",
  "Analogous Organs",
  "Vestigial Organs",
  "Evidence of Evolution",
  "Origin of Life",
  // ── Science — Sources of Energy (deleted) ──
  "Sources of Energy",
  "Conventional Sources of Energy",
  "Non-Conventional Sources of Energy",
  "Solar Energy",
  "Wind Energy",
  "Nuclear Energy",
  "Tidal Energy",
  "Geothermal Energy",
  "Ocean Thermal Energy",
  "Wave Energy",
  "Fossil Fuels",
  "Biogas",
  "Hydropower",
  // ── Science — Management of Natural Resources (deleted) ──
  "Management of Natural Resources",
  "Rainwater Harvesting",
  "Ganga Action Plan",
  "Chipko Movement",
  "Wildlife Conservation",
  "Forest Conservation",
  "Reforestation",
  // ── Science — Motor / EMI / Generator (formative-only; board-excluded —
  //   precise multi-word phrases only; bare "Motor"/"Generator"/"Induction" omitted) ──
  "Electromagnetic Induction",
  "Electric Motor",
  "Electric Generator",
];

// Board-prep surfaces that assemble or describe board-relevant content. Paths are
// relative to lazytopper/src. Verified present 2026-06-04; new siblings should be
// added here (the SEQUENCING NOTE in the task asks for periodic re-grep).
const LAZYTOPPER_SRC = join(import.meta.dirname, "../../lazytopper/src");

// CLEANUP-2: five entries left with their files - topicMockEngine.ts, worksheetProfileService.ts,
// savedWorksheets.ts, dailyMixGenerator.ts, dailyMixService.ts were orphans (nothing live imported
// them), deleted by owner ruling. A missing surface is a hard ERROR below, so the entry goes too.
const BOARD_PREP_SURFACES: string[] = [
  // HPQ / predicted-questions
  "data/highlyProbableQuestions.ts",
  "data/predictedQuestions.ts",
  "data/predictedQuestionsScience.ts",
  "data/predictedScienceQuestions.ts",
  "data/hpqCompetencyAdditions.ts",
  "prediction/hpqConfidence.ts",
  // Mocks / full-length / chapter-test engines
  "utils/mockBlueprint.ts",
  "utils/mockPaperEngine.ts",
  "utils/mockPaperEngineScience.ts",
  // Worksheet generator
  "components/practice/worksheetGenerator.ts",
  // Practice / daily-mix
  "data/practiceSetGenerator.ts",
  // Exam Trends / topic metadata
  "lib/desktop/topics.ts",
  "lib/desktop/topicHubContent.ts",
  "data/class10MathTopicTrends.ts",
  "data/class10ScienceTopicTrends.ts",
  // Practice filters / content config
  "data/practiceFilters.ts",
  "data/class10ContentConfig.ts",
  // Tutor teach-contracts (must NOT teach excluded/formative-only topics)
  "tutor/topicTeachContracts.ts",
];

// FU-SYLLABUSGUARD-APOSTROPHE. The value is matched by its OWN opening quote (group 1)
// and closed only by that same quote (the backreference \1), skipping any backslash
// escape, so a double-quoted value may contain an apostrophe ("Euclid's Division Lemma")
// and a single-quoted one an escaped apostrophe ('Euclid\'s Division Lemma'). The old
// capture `[^"'`]+` stopped at ANY quote char, read "Euclid's Division Lemma" as
// "Euclid", and so passed every banned name that contains an apostrophe.
// Group 2 is the RAW literal body; `unescapeLiteral` undoes the escapes before comparing.
// Matching semantics are unchanged: exact full-string, case-insensitive (as before).
const SUBTOPIC_PATTERN = /["']?subtopic["']?\s*:\s*(["'`])((?:\\[\s\S]|(?!\1)[^\\])*)\1/g;

/** Undo string-literal escapes in a captured value: `\'` -> `'`, `\"` -> `"`, `\\` -> `\`. */
function unescapeLiteral(raw: string): string {
  return raw.replace(/\\([\s\S])/g, "$1");
}

/**
 * The comparison form of a sub-topic: lower case, with a typographic apostrophe (U+2018, U+2019,
 * U+02BC) folded to ' (GUARD-3 G5), so "Euclid’s Division Lemma" is the banned "Euclid's Division
 * Lemma". Still an exact, full-string comparison: nothing else is normalised.
 */
export function foldForCompare(s: string): string {
  return s.replace(/[‘’ʼ]/g, "'").toLowerCase();
}

export interface Violation {
  file: string;
  subtopic: string;
  matchCount: number;
}

// ── Mode 1: question-bank scan — exact `subtopic:` field-value match ──
export function scanFile(filePath: string, bannedSubtopics: string[]): Violation[] {
  const content = readFileSync(filePath, "utf-8");
  const violations: Violation[] = [];

  const bannedSet = new Set(bannedSubtopics.map(foldForCompare));
  const counts = new Map<string, number>();

  let match: RegExpExecArray | null;
  SUBTOPIC_PATTERN.lastIndex = 0;
  while ((match = SUBTOPIC_PATTERN.exec(content)) !== null) {
    const subtopic = unescapeLiteral(match[2]);
    if (bannedSet.has(foldForCompare(subtopic))) {
      counts.set(subtopic, (counts.get(subtopic) ?? 0) + 1);
    }
  }

  for (const [subtopic, matchCount] of counts.entries()) {
    violations.push({ file: filePath, subtopic, matchCount });
  }

  return violations;
}

// ── Mode 2: board-prep surface scan — curated word-boundary phrase match ──
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Whole-phrase, case-insensitive match that will NOT fire when the phrase is part
// of a larger word (so "Ogive" does not match "Ogives", and bare-word collisions
// are avoided). Phrases begin/end with alphanumerics, so alnum lookarounds suffice.
export function scanContentForPhrases(
  content: string,
  phrases: string[]
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const phrase of phrases) {
    const re = new RegExp(
      `(?<![A-Za-z0-9])${escapeRegExp(phrase)}(?![A-Za-z0-9])`,
      "gi"
    );
    const matches = content.match(re);
    if (matches && matches.length > 0) {
      counts.set(phrase, matches.length);
    }
  }
  return counts;
}

export function scanSurfaceFile(filePath: string, phrases: string[]): Violation[] {
  const content = readFileSync(filePath, "utf-8");
  const counts = scanContentForPhrases(content, phrases);
  const violations: Violation[] = [];
  for (const [subtopic, matchCount] of counts.entries()) {
    violations.push({ file: filePath, subtopic, matchCount });
  }
  return violations;
}

// ═════════════════════════════════════════════════════════════════════════════
// SERVED-SET SCAN (SYLLABUS-FIX-CONTENT PR-3)
//
// Modes 1 and 2 above read FILE TEXT and match EXACT strings. They pass while
// students are served "Areas of Similar Triangles" (no guard string is spelled
// that way) and they would fail on a row that is written in a file but withheld.
// Mode 3 fixes both:
//   • ONE REFERENCE. IN / OUT / FORMATIVE knowledge comes from the reference module
//     `lazytopper/src/config/syllabus2026-27.ts` (owner ruling 6). The only list kept
//     here is LABEL_VARIANTS: the spellings the served data actually uses, each keyed
//     BY the reference item it is a variant of. A variant that names an item the
//     reference does not have is a hard error at load (it cannot rot silently).
//   • NORMALISED matching (case, punctuation, diacritics, plurals, "(from …)"-style
//     qualifiers), never exact-string matching.
//   • THE SERVED SET, AT RUNTIME. The real modules are imported and walked: the bank
//     AFTER `WITHHELD_QUESTION_IDS`, HPQ (incl. hpqCompetencyAdditions), predicted
//     (Maths + Science), the promptD fallback packs, every student-visible text field of
//     `notes/specs/*.json`, the Topic Hub rows as `buildActionableDesktopTopicHubContent`
//     renders them, and the tutor concept catalogue labels. A withheld row cannot fail
//     the guard; a served one cannot hide.
//   • Labels (subtopic, concept, row names) are matched against reference items and
//     their variants. Free text (notes, Hub one-liners, promptD stems) is matched only
//     against multi-word exclusion phrases, sentence by sentence, and a sentence that
//     says the content is excluded ("… are no longer in this chapter") is not teaching
//     it, so it is not flagged.
// IN is never matched: Heredity / Mendel / sex determination, atmospheric refraction,
// twinkling, advance sunrise, and "Right-Triangle Lengths (a² + b² = c² as a tool)"
// (owner ruling 1: Pythagoras used as a tool is IN) are pinned as PASS in the tests.
// ═════════════════════════════════════════════════════════════════════════════

/** The reference shape this guard reads (structural: `SYLLABUS_2026_27` satisfies it). */
export interface ReferenceChapterLike {
  readonly key: string;
  readonly status: string;
  readonly out: readonly { readonly item: string }[];
  readonly formative: readonly { readonly item: string }[];
}
export interface SyllabusReferenceLike {
  readonly maths: { readonly chapters: readonly ReferenceChapterLike[] };
  readonly science: { readonly chapters: readonly ReferenceChapterLike[] };
}

export type ReferenceKind = "out" | "formative" | "chapter";

export interface ReferenceItem {
  /** `<chapter key>/<kind>[<index>]`, or `<chapter key>/chapter` for a whole chapter. */
  readonly id: string;
  readonly key: string;
  readonly kind: ReferenceKind;
  readonly item: string;
}

/** Every OUT / FORMATIVE item of the reference, plus each whole OUT / FORMATIVE chapter. */
export function referenceItems(ref: SyllabusReferenceLike): ReferenceItem[] {
  const items: ReferenceItem[] = [];
  for (const chapter of [...ref.maths.chapters, ...ref.science.chapters]) {
    if (chapter.status === "OUT" || chapter.status === "FORMATIVE") {
      items.push({ id: `${chapter.key}/chapter`, key: chapter.key, kind: "chapter", item: chapter.key });
    }
    chapter.out.forEach((x, i) => items.push({ id: `${chapter.key}/out[${i}]`, key: chapter.key, kind: "out", item: x.item }));
    chapter.formative.forEach((x, i) =>
      items.push({ id: `${chapter.key}/formative[${i}]`, key: chapter.key, kind: "formative", item: x.item }),
    );
  }
  return items;
}

export interface LabelVariantEntry {
  /** Reference chapter key + kind + the START of the reference item text: must resolve to exactly one item. */
  readonly key: string;
  readonly kind: "out" | "formative";
  readonly itemStartsWith: string;
  /** Label spellings seen on served data (SYLLABUS-SCOUT-1 report §5), matched normalised. */
  readonly labels: readonly string[];
  /** Multi-word phrases that, in free text, teach this item. */
  readonly freeText?: readonly string[];
  /**
   * The item is OUT only as content OF ITS OWN CHAPTER, so its terms do not fire on a
   * served item known to sit in a DIFFERENT board chapter. Used where the same words are
   * IN elsewhere: Pythagoras / its converse as a tool (owner ruling 1 — e.g. the NCERT
   * Coordinate Geometry example that names a right triangle by the converse), and "area of
   * the triangle" inside the segment formula of Areas Related to Circles. An item whose
   * chapter is unknown (no board chapter key on it) is still matched — strict.
   */
  readonly chapterScoped?: boolean;
}

/**
 * The label spellings the reference items appear under in the served data. NOT a second
 * syllabus: every entry names the reference item it is a variant of, and resolveVariants
 * fails if that item is missing. Source: SYLLABUS-SCOUT-1 report §5 ("OUT labels the guard
 * cannot see") plus the existing Mode-1 spellings of the same items.
 */
export const LABEL_VARIANTS: readonly LabelVariantEntry[] = [
  { key: "real-numbers", kind: "out", itemStartsWith: "Euclid's division lemma",
    labels: ["Euclid's Division Lemma", "Euclid's Division Algorithm", "Euclid Division Lemma", "HCF by Euclid's Division"],
    freeText: ["euclid's division lemma", "euclid's division algorithm"] },
  // QUICK-FIXES-1 PR-2 — owner rulings R1–R3 of 2026-10-06 (evidence rule). Same-method proofs for a NAMED prime
  // (√7, 6 − √7) are IN and are never matched; only the general-prime / composite-surd forms are.
  { key: "real-numbers", kind: "out", itemStartsWith: "Irrationality statements or proofs for a general prime",
    labels: ["Irrationality of √p", "Irrationality of Square Root of a Prime", "Square Root of Every Prime is Irrational",
      "Irrationality of √p + √q"],
    freeText: ["square root of every prime", "square root of any prime", "is irrational for any prime", "is irrational for every prime"] },
  { key: "real-numbers", kind: "out", itemStartsWith: "Decimal expansions of rational numbers",
    labels: ["Decimal Expansion(s)", "Decimal Expansions of Rational Numbers", "Decimal Representation of Rational Numbers",
      "Terminating and Non-Terminating Decimals", "Terminating Decimal Expansion"] },
  { key: "polynomials", kind: "out", itemStartsWith: "Zero–coefficient relationship for CUBIC",
    labels: ["Zeroes of Cubic Polynomial", "Zeros of Cubic Polynomial", "Cubic Polynomial Zeroes-Coefficient Relationship",
      "Relationship Between Zeroes and Coefficients of Cubic Polynomials"] },
  { key: "polynomials", kind: "out", itemStartsWith: "Division algorithm for polynomials",
    labels: ["Division Algorithm for Polynomials", "Polynomial Division Algorithm", "Division Algorithm", "Polynomial Long Division"],
    freeText: ["division algorithm for polynomials"] },
  { key: "pair-of-linear-equations", kind: "out", itemStartsWith: "Cross-multiplication method",
    labels: ["Cross-Multiplication Method", "Cross Multiplication"],
    freeText: ["cross multiplication method"] },
  { key: "pair-of-linear-equations", kind: "out", itemStartsWith: "Equations reducible to a pair of linear equations",
    labels: ["Equations Reducible to a Pair of Linear Equations", "Equations Reducible to Linear Form", "Reducible to Linear Equations"],
    freeText: ["equations reducible to a pair of linear equations", "reducible to a pair of linear equations"] },
  { key: "quadratic-equations", kind: "out", itemStartsWith: "Solving by completing the square",
    labels: ["Completing the Square", "Method of Completing the Square", "Solving by Completing the Square"] },
  { key: "coordinate-geometry", kind: "out", itemStartsWith: "Area of a triangle from coordinates",
    labels: ["Area of Triangle (from Coordinates)", "Area of a Triangle in Coordinate Geometry", "Area of Triangle (Coordinate Geometry)",
      "Collinearity using Area"],
    freeText: ["area of a triangle from coordinates", "area of a triangle from its vertices", "area of a triangle whose vertices"],
    chapterScoped: true },
  { key: "coordinate-geometry", kind: "out", itemStartsWith: "Centroid of a triangle",
    labels: ["Centroid", "Centroid of a Triangle", "Centroid Formula", "Coordinates of the Centroid"],
    freeText: ["centroid of a triangle", "centroid of the triangle", "centroid formula"] },
  // "Combinations of Plane Figures" and "Combined Figures" are NOT variants: served IN rows carry them (the official
  // vertex-sector row ARC-N-EXEM-11-LA-002, and sector-only LazyTopper rows); the reference term itself
  // ("area(s) of combination(s) of plane figures") is matched. Rings / annuli are IN (owner Round 2: Maths Basic
  // papers count; 2024 Basic 430/3/1 Q12, Q37), so no ring label or phrase is a variant.
  { key: "areas-related-to-circles", kind: "out", itemStartsWith: "Areas of combinations of plane figures",
    labels: ["Area of Combined Figures", "Areas of Combined Figures"],
    freeText: ["combination of plane figures", "combinations of plane figures", "combination figure"] },
  { key: "coordinate-geometry", kind: "out", itemStartsWith: "Section formula — external division",
    labels: ["External Division", "Section Formula for External Division"] },
  { key: "triangles", kind: "out", itemStartsWith: "Ratio of areas of similar triangles",
    labels: ["Areas of Similar Triangles", "Area Ratio in Similar Triangles", "Ratio of Areas of Similar Triangles", "Area Theorem (Similar Triangles)"],
    freeText: ["areas of similar triangles", "ratio of the areas of two similar triangles", "areas of similar triangles are proportional"] },
  { key: "triangles", kind: "out", itemStartsWith: "Pythagoras theorem and its converse",
    labels: ["Pythagoras Theorem", "Converse of Pythagoras", "Converse of Pythagoras Theorem", "Pythagoras/Converse",
      "Pythagoras Theorem and its Converse", "Proof of Pythagoras Theorem"],
    freeText: ["converse of pythagoras theorem", "prove pythagoras theorem", "proof of pythagoras theorem"],
    chapterScoped: true },
  { key: "triangles", kind: "out", itemStartsWith: "PROOFS of the converse of BPT",
    labels: ["Proof of Converse of BPT"] },
  { key: "circles", kind: "out", itemStartsWith: "Constructions",
    labels: ["Constructions", "Construction of Tangents", "Division of a Line Segment", "Construction of Similar Triangles"],
    freeText: ["construction of tangents to a circle"] },
  { key: "trigonometry", kind: "out", itemStartsWith: "Trigonometric ratios of complementary angles",
    labels: ["Complementary Angles", "Trigonometric Ratios of Complementary Angles", "T-Ratios of Complementary Angles"],
    freeText: ["trigonometric ratios of complementary angles"] },
  { key: "surface-areas-and-volumes", kind: "out", itemStartsWith: "Frustum of a cone",
    labels: ["Frustum", "Frustum of a Cone"] },
  { key: "surface-areas-and-volumes", kind: "out", itemStartsWith: "Conversion of one solid into another",
    labels: ["Conversion of Solids", "Conversion of Solid from One Shape to Another", "Melting and Recasting", "Recasting of Solids"],
    // QUICK-FIXES-1 PR-2 (FU-A16-B-SAV-MELTING-ROWS): bank rows filed under "Combination/Transformation" carry no OUT
    // label, so the free-text phrases catch a melting/recasting stem on the text surfaces (promptD, notes, Hub).
    // chapterScoped: a melted-and-recast WIRE in Electricity (resistance, R = ρl/A) is IN (Fable ruling, SCO-S-ELEC-009).
    freeText: ["melted and recast", "is melted into", "recast into", "melted to form"],
    chapterScoped: true },
  { key: "statistics", kind: "out", itemStartsWith: "Graphical representation of cumulative frequency",
    labels: ["Ogive", "Cumulative Frequency Graph", "Cumulative Frequency Curve", "Less Than Ogive", "More Than Ogive", "Median from Ogive"] },
  // QUICK-FIXES-1 PR-2 — owner rulings 2026-10-06. Corrosion is IN (Metals, p5): every served corrosion-only row was
  // relabelled "Corrosion" (owner Round 2, incl. the two official rows' topic tag), so the combined label is now a variant.
  { key: "chemical-reactions-and-equations", kind: "out", itemStartsWith: "Rancidity",
    labels: ["Rancidity", "Rancidity and its Prevention", "Prevention of Rancidity", "Corrosion and Rancidity", "Corrosion & Rancidity"],
    freeText: ["prevent rancidity", "prevention of rancidity", "rancidity of food", "corrosion and rancidity", "become rancid",
      "rancidity is", "rusting and rancidity", "rancidity of fats", "rancidity or corrosion", "rusting rancidity"] },
  { key: "carbon-and-its-compounds", kind: "out", itemStartsWith: "Nomenclature of carboxylic acids",
    labels: ["Nomenclature of Carboxylic Acids", "Naming Carboxylic Acids", "IUPAC Naming of Carboxylic Acids"],
    freeText: ["naming carboxylic acids", "oic acid suffix", "suffix oic acid"] },
  { key: "light-reflection-and-refraction", kind: "out", itemStartsWith: "Derivation of the mirror formula",
    labels: ["Derivation of Mirror Formula", "Derivation of Lens Formula"] },
  { key: "light-reflection-and-refraction", kind: "out", itemStartsWith: "Beyond-Class-X optics",
    labels: ["Total Internal Reflection", "Critical Angle", "Lens Maker's Formula", "Apparent Depth"] },
  { key: "human-eye-and-colourful-world", kind: "out", itemStartsWith: "Colour of the Sun at sunrise and sunset",
    labels: ["Colour of the Sun at Sunrise and Sunset", "Reddening of the Sun", "Red Colour of the Sun at Sunrise"],
    freeText: ["colour of the sun at sunrise", "colour of the sun at sunset", "reddening of the sun", "sun appears red at sunrise",
      "sun appears reddish", "red colour of the sun"] },
  { key: "heredity", kind: "formative", itemStartsWith: "Evolution",
    labels: ["Evolution", "Natural Selection", "Speciation", "Fossils", "Homologous Organs", "Analogous Organs", "Human Evolution",
      "Acquired and Inherited Traits", "Evolutionary Relationships"],
    freeText: ["natural selection", "homologous organs", "analogous organs"] },
  { key: "magnetic-effects-of-electric-current", kind: "formative", itemStartsWith: "Electric motor",
    labels: ["Electric Motor", "Electromagnetic Induction", "EMI", "Electric Generator", "AC Generator", "DC Generator",
      "Fleming's Right-Hand Rule"],
    freeText: ["electromagnetic induction", "fleming's right hand rule", "electric generator"] },
  { key: "periodic-classification-of-elements", kind: "formative", itemStartsWith: "Döbereiner's Triads",
    labels: ["Periodic Classification", "Periodic Classification of Elements", "Modern Periodic Table", "Mendeleev's Periodic Table",
      "Newlands Octaves", "Dobereiner's Triads"] },
];

export interface ResolvedVariant extends LabelVariantEntry {
  readonly itemId: string;
  readonly item: string;
}

/** Resolve each variant entry to exactly one reference item. Any miss / ambiguity is an error. */
export function resolveVariants(
  entries: readonly LabelVariantEntry[],
  items: readonly ReferenceItem[],
): { resolved: ResolvedVariant[]; errors: string[] } {
  const resolved: ResolvedVariant[] = [];
  const errors: string[] = [];
  for (const e of entries) {
    const want = e.itemStartsWith.toLowerCase();
    const hits = items.filter((i) => i.key === e.key && i.kind === e.kind && i.item.toLowerCase().startsWith(want));
    if (hits.length !== 1) {
      errors.push(
        `LABEL_VARIANTS entry ${e.key}/${e.kind} "${e.itemStartsWith}" resolves to ${hits.length} reference items (must be exactly 1).`,
      );
      continue;
    }
    resolved.push({ ...e, itemId: hits[0].id, item: hits[0].item });
  }
  return { resolved, errors };
}

const ARTICLES = new Set(["a", "an", "the"]);

function singular(w: string): string {
  if (w.length <= 3) return w;
  if (w.endsWith("oes")) return w.slice(0, -2); // zeroes -> zero
  if (w.endsWith("ies")) return `${w.slice(0, -3)}y`;
  if (/(ss|us|is)$/.test(w)) return w;
  if (w.endsWith("s")) return w.slice(0, -1);
  return w;
}

/**
 * Normalise a label or a sentence for matching: case, diacritics, curly quotes,
 * possessives, "(s)" plurals, parenthetical qualifiers ("(from Coordinates)",
 * "(as a tool)"), punctuation, articles, plurals, colour/color.
 */
export function normaliseLabel(s: string): string {
  let t = s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  t = t.replace(/[\u2018\u2019\u02bc`\u00b4]/g, "'").replace(/\(s\)/g, "s");
  let prev: string;
  do {
    prev = t;
    t = t.replace(/\([^()]*\)/g, " ");
  } while (t !== prev);
  t = t.replace(/'s\b/g, "").replace(/\bcolor\b/g, "colour").replace(/&/g, " and ");
  t = t.replace(/[^a-z0-9]+/g, " ").trim();
  return t
    .split(" ")
    .filter((w) => w && !ARTICLES.has(w))
    .map(singular)
    .join(" ");
}

/** Derived single-word terms too generic to match a label on their own. */
const GENERIC_DERIVED_TERMS = new Set(["trend"]);

/**
 * Terms a reference item names directly. Parentheticals are dropped; the item is split
 * on ";" and "/"; a "Head: a, b, c" item also yields its head and each listed part. Plain
 * commas are NOT split ("PROOFS of the converse of BPT, AAA, SSS, SAS criteria" must not
 * yield "SAS criteria", which is IN when stated without proof).
 */
export function deriveReferenceTerms(item: string): string[] {
  let t = item;
  let prev: string;
  do {
    prev = t;
    t = t.replace(/\([^()]*\)/g, " ");
  } while (t !== prev);
  const parts: string[] = [];
  for (const piece of t.split(/[;/]/)) {
    const colon = piece.indexOf(":");
    if (colon >= 0) {
      parts.push(piece.slice(0, colon), ...piece.slice(colon + 1).split(","));
    } else {
      parts.push(piece);
    }
  }
  return parts
    .map((p) => p.replace(/\b(as a (topic|method)|and problems using it|etc\.?)\s*$/i, ""))
    .map(normaliseLabel)
    .filter((p) => p.length > 0 && !GENERIC_DERIVED_TERMS.has(p));
}

export interface MatchTerm {
  /** Normalised term. */
  readonly term: string;
  /** "equal": the whole normalised label must be the term; "contains": whole-word containment. */
  readonly mode: "equal" | "contains";
  readonly itemId: string;
  readonly item: string;
  readonly source: "reference" | "variant" | "chapter";
  /** Set for a chapterScoped item: do not fire on an item known to sit in another board chapter. */
  readonly scopeKey?: string;
}

export interface SyllabusMatcher {
  readonly items: readonly ReferenceItem[];
  readonly labelTerms: readonly MatchTerm[];
  readonly textPhrases: readonly MatchTerm[];
  readonly excludedChapterKeys: ReadonlyMap<string, ReferenceItem>;
  /** Every chapter key the reference knows (board or not). */
  readonly chapterKeys: ReadonlySet<string>;
}

/** Build the matcher from the reference + LABEL_VARIANTS. Throws if a variant has rotted. */
export function buildSyllabusMatcher(
  ref: SyllabusReferenceLike,
  variants: readonly LabelVariantEntry[] = LABEL_VARIANTS,
): SyllabusMatcher {
  const items = referenceItems(ref);
  const { resolved, errors } = resolveVariants(variants, items);
  if (errors.length > 0) throw new Error(`syllabusGuard: ${errors.join(" ")}`);
  const scoped = new Set(resolved.filter((v) => v.chapterScoped).map((v) => v.itemId));
  const labelTerms: MatchTerm[] = [];
  const textPhrases: MatchTerm[] = [];
  const add = (
    list: MatchTerm[],
    term: string,
    it: { id: string; item: string; key: string },
    source: MatchTerm["source"],
    mode?: MatchTerm["mode"],
  ) => {
    if (!term || list.some((x) => x.term === term && x.itemId === it.id)) return;
    list.push({
      term,
      mode: mode ?? (term.includes(" ") ? "contains" : "equal"),
      itemId: it.id,
      item: it.item,
      source,
      ...(scoped.has(it.id) ? { scopeKey: it.key } : {}),
    });
  };
  const excludedChapterKeys = new Map<string, ReferenceItem>();
  for (const it of items) {
    if (it.kind === "chapter") {
      // A whole OUT / FORMATIVE chapter: its key on a served row, or a label that IS its
      // name. Never as a phrase inside other text ("a source of energy" is Life Processes).
      excludedChapterKeys.set(it.key, it);
      add(labelTerms, normaliseLabel(it.key.replace(/-/g, " ")), it, "chapter", "equal");
      continue;
    }
    for (const term of deriveReferenceTerms(it.item)) {
      add(labelTerms, term, it, "reference");
      if (term.includes(" ")) add(textPhrases, term, it, "reference");
    }
  }
  for (const v of resolved) {
    const it = items.find((i) => i.id === v.itemId)!;
    for (const l of v.labels) add(labelTerms, normaliseLabel(l), it, "variant");
    for (const p of v.freeText ?? []) {
      const n = normaliseLabel(p);
      if (!n.includes(" ")) throw new Error(`syllabusGuard: free-text phrase "${p}" must be multi-word.`);
      add(textPhrases, n, it, "variant");
    }
  }
  const chapterKeys = new Set([...ref.maths.chapters, ...ref.science.chapters].map((c) => c.key));
  return { items, labelTerms, textPhrases, excludedChapterKeys, chapterKeys };
}

function inScope(t: MatchTerm, chapter: string | undefined, matcher: SyllabusMatcher): boolean {
  if (!t.scopeKey || chapter === undefined || !matcher.chapterKeys.has(chapter)) return true;
  return chapter === t.scopeKey;
}

/**
 * A label matches a term when, after normalisation, it EQUALS a one-word term or
 * CONTAINS a multi-word term as whole words ("Area of Triangle (from Coordinates)"
 * and "Areas of Similar Triangles — problems" both hit). `chapter` is the board
 * chapter key the label sits in, when known.
 */
export function matchLabel(label: string, matcher: SyllabusMatcher, chapter?: string): MatchTerm | null {
  const n = normaliseLabel(label);
  if (!n) return null;
  const padded = ` ${n} `;
  for (const t of matcher.labelTerms) {
    if (!inScope(t, chapter, matcher)) continue;
    if (t.mode === "equal" ? n === t.term : padded.includes(` ${t.term} `)) return t;
  }
  return null;
}

/** A sentence that states content is excluded is not teaching it. */
export const EXCLUSION_STATEMENT =
  /\b(no longer|not (?:in|part of|on|examined|assessed|asked|included|required|taught)|excluded|excludes?|out of (?:the )?(?:[\w-]+ ){0,3}(?:syllabus|chapter|scope|course)|deleted|dropped|removed|assessed only formatively|formative(?:ly)?|beyond (?:the )?(?:class x|syllabus))\b/i;

/** Free-text match: sentence by sentence, multi-word phrases only, exclusion statements skipped. */
export function matchFreeText(
  text: string,
  matcher: SyllabusMatcher,
  chapter?: string,
): { term: MatchTerm; sentence: string }[] {
  const hits: { term: MatchTerm; sentence: string }[] = [];
  const plain = text.replace(/<[^>]+>/g, " ");
  for (const sentence of plain.split(/(?<=[.!?])\s+|\n+/)) {
    if (EXCLUSION_STATEMENT.test(sentence)) continue;
    const padded = ` ${normaliseLabel(sentence)} `;
    for (const t of matcher.textPhrases) {
      if (!inScope(t, chapter, matcher)) continue;
      if (!padded.includes(` ${t.term} `)) continue;
      // one finding per (sentence, reference item)
      if (hits.some((h) => h.sentence === sentence.trim() && h.term.itemId === t.itemId)) continue;
      hits.push({ term: t, sentence: sentence.trim() });
    }
  }
  return hits;
}

// ── Served items ──────────────────────────────────────────────────────────────

export type ServedSurface = "bank" | "hpq" | "predicted" | "promptD" | "notes" | "hub" | "catalogue" | "legacyHub";

export interface ServedItem {
  readonly surface: ServedSurface;
  /** Row id / file path — whatever names it in a finding. */
  readonly id: string;
  readonly field: string;
  readonly text: string;
  readonly kind: "label" | "text" | "chapterKey";
  /** The chapter key the item sits in, when the surface carries one (scopes chapterScoped items). */
  readonly chapter?: string;
}

/** Structural views of the served modules (only the fields this guard reads). */
export interface BankRowLike { id: string; topicKey: string; subtopic?: string }
export interface HpqBucketLike {
  topic: string;
  questions: readonly { id: string; subtopic?: string; concept?: string }[];
}
export interface PredictedRowLike { id: string; topicKey: string; subtopic: string }
export interface PromptDPackLike {
  topicKey: string;
  topicName: string;
  questions: readonly { id: string; text: string }[];
}
export interface HubContentLike {
  topic: { slug: string; name: string; blurb: string };
  topicSnapshot: { likelySection: string; examinerNotes: string };
  boardEssentials: readonly { name: string; oneLineUse: string }[];
  formulaUsePreview: HubCardLike;
  fullFormulaUseMap: readonly HubCardLike[];
  commonMistake: string;
  examinerWarning: string;
}
export interface HubCardLike {
  title: string;
  whenToUse: readonly string[];
  commonTrap: string;
  directUse?: string;
  hiddenUse?: string;
  combinedUse?: string;
}
export interface CatalogueRowLike { conceptKey: string; topicKey: string; conceptLabel: string; scopeCaveat?: string }

export interface ServedSources {
  /** The RAW bank — the guard applies `withheldIds` itself. */
  rawBank: readonly BankRowLike[];
  withheldIds: ReadonlySet<string>;
  hpq: readonly HpqBucketLike[];
  predicted: readonly PredictedRowLike[];
  promptD: readonly PromptDPackLike[];
  notes: readonly { file: string; spec: unknown }[];
  hub: readonly HubContentLike[];
  catalogue: readonly CatalogueRowLike[];
  /**
   * QUICK-FIXES-1 PR-2 (owner, 2026-10-06: "so older content can't hide again"): the two legacy Topic Hub
   * datasets, `data/topicHubContent.ts` and `data/topicHubV2Full.ts`, walked as served text.
   */
  legacyHub: readonly { file: string; data: unknown }[];
}

/** Notes-spec keys that are machine metadata, never shown to a student. */
const NOTES_HIDDEN_KEYS = new Set([
  "id", "type", "tier", "kind", "edition", "source", "pdf", "asset", "figure_ref", "ncert_fig", "schema_version",
  "topic_key", "subject", "weightage", "source_edition", "bucket", "shape", "sign", "generator", "crop_units",
  "render_matrix", "bank_id", "pyq_year", "paper", "ncert_exercise", "ncert_example", "ncert_equation", "tag",
]);
/** Notes-spec keys whose value is a label (a term / heading / row name). */
const NOTES_LABEL_KEYS = new Set(["term", "item", "label", "title", "heading", "name", "concept_tag", "badge"]);

function walkNotes(file: string, chapter: string | undefined, v: unknown, path: string, key: string, out: ServedItem[]): void {
  if (typeof v === "string") {
    if (NOTES_HIDDEN_KEYS.has(key)) return;
    out.push({ surface: "notes", id: file, field: path, text: v, kind: NOTES_LABEL_KEYS.has(key) ? "label" : "text", chapter });
    return;
  }
  if (Array.isArray(v)) {
    v.forEach((x, i) => walkNotes(file, chapter, x, `${path}[${i}]`, key, out));
    return;
  }
  if (v && typeof v === "object") {
    for (const [k, x] of Object.entries(v)) walkNotes(file, chapter, x, path ? `${path}.${k}` : k, k, out);
  }
}

/** Legacy Topic Hub keys that are metadata; `title` / `topicName` are labels; every other string is text. */
const LEGACY_HUB_HIDDEN_KEYS = new Set(["topicKey", "subject", "tier", "id", "slug", "kind"]);
const LEGACY_HUB_LABEL_KEYS = new Set(["title", "topicName", "name"]);

function walkLegacyHub(file: string, chapter: string | undefined, v: unknown, path: string, key: string, out: ServedItem[]): void {
  if (typeof v === "string") {
    if (LEGACY_HUB_HIDDEN_KEYS.has(key)) return;
    out.push({ surface: "legacyHub", id: file, field: path, text: v, kind: LEGACY_HUB_LABEL_KEYS.has(key) ? "label" : "text", chapter });
    return;
  }
  if (Array.isArray(v)) {
    v.forEach((x, i) => walkLegacyHub(file, chapter, x, `${path}[${i}]`, key, out));
    return;
  }
  if (v && typeof v === "object") {
    const tk = (v as { topicKey?: unknown }).topicKey;
    const ch = typeof tk === "string" ? tk : chapter;
    for (const [k, x] of Object.entries(v)) walkLegacyHub(file, ch, x, path ? `${path}.${k}` : k, k, out);
  }
}

/** Flatten every served source into the items the guard matches. */
export function collectServedItems(src: ServedSources): ServedItem[] {
  const out: ServedItem[] = [];
  for (const q of src.rawBank) {
    if (src.withheldIds.has(q.id)) continue; // the SERVED bank — what students get
    out.push({ surface: "bank", id: q.id, field: "topicKey", text: q.topicKey, kind: "chapterKey" });
    if (q.subtopic) out.push({ surface: "bank", id: q.id, field: "subtopic", text: q.subtopic, kind: "label", chapter: q.topicKey });
  }
  for (const b of src.hpq) {
    out.push({ surface: "hpq", id: `bucket:${b.topic}`, field: "topic", text: b.topic, kind: "label" });
    for (const q of b.questions) {
      if (q.subtopic) out.push({ surface: "hpq", id: q.id, field: "subtopic", text: q.subtopic, kind: "label" });
      if (q.concept) out.push({ surface: "hpq", id: q.id, field: "concept", text: q.concept, kind: "label" });
    }
  }
  for (const q of src.predicted) {
    out.push({ surface: "predicted", id: q.id, field: "topicKey", text: q.topicKey, kind: "chapterKey" });
    out.push({ surface: "predicted", id: q.id, field: "subtopic", text: q.subtopic, kind: "label", chapter: q.topicKey });
  }
  for (const p of src.promptD) {
    out.push({ surface: "promptD", id: `pack:${p.topicKey}`, field: "topicKey", text: p.topicKey, kind: "chapterKey" });
    out.push({ surface: "promptD", id: `pack:${p.topicKey}`, field: "topicName", text: p.topicName, kind: "label", chapter: p.topicKey });
    for (const q of p.questions) out.push({ surface: "promptD", id: q.id, field: "text", text: q.text, kind: "text", chapter: p.topicKey });
  }
  for (const n of src.notes) {
    const meta = (n.spec as { meta?: { topic_key?: unknown } } | null)?.meta;
    walkNotes(n.file, typeof meta?.topic_key === "string" ? meta.topic_key : undefined, n.spec, "", "", out);
  }
  for (const h of src.hub) {
    const id = `hub:${h.topic.slug}`;
    const push = (field: string, text: string | undefined, kind: ServedItem["kind"]) => {
      if (text) out.push({ surface: "hub", id, field, text, kind, chapter: h.topic.slug });
    };
    push("topic.slug", h.topic.slug, "chapterKey");
    push("topic.blurb", h.topic.blurb, "text");
    push("topicSnapshot.likelySection", h.topicSnapshot.likelySection, "text");
    push("topicSnapshot.examinerNotes", h.topicSnapshot.examinerNotes, "text");
    h.boardEssentials.forEach((r, i) => {
      push(`boardEssentials[${i}].name`, r.name, "label");
      push(`boardEssentials[${i}].oneLineUse`, r.oneLineUse, "text");
    });
    [h.formulaUsePreview, ...h.fullFormulaUseMap].forEach((c, i) => {
      const f = i === 0 ? "formulaUsePreview" : `fullFormulaUseMap[${i - 1}]`;
      push(`${f}.title`, c.title, "label");
      c.whenToUse.forEach((w, j) => push(`${f}.whenToUse[${j}]`, w, "text"));
      push(`${f}.commonTrap`, c.commonTrap, "text");
      push(`${f}.directUse`, c.directUse, "text");
      push(`${f}.hiddenUse`, c.hiddenUse, "text");
      push(`${f}.combinedUse`, c.combinedUse, "text");
    });
    push("commonMistake", h.commonMistake, "text");
    push("examinerWarning", h.examinerWarning, "text");
  }
  for (const l of src.legacyHub) walkLegacyHub(l.file, undefined, l.data, "", "", out);
  for (const c of src.catalogue) {
    out.push({ surface: "catalogue", id: c.conceptKey, field: "topicKey", text: c.topicKey, kind: "chapterKey" });
    out.push({ surface: "catalogue", id: c.conceptKey, field: "conceptLabel", text: c.conceptLabel, kind: "label", chapter: c.topicKey });
    if (c.scopeCaveat) {
      out.push({ surface: "catalogue", id: c.conceptKey, field: "scopeCaveat", text: c.scopeCaveat, kind: "text", chapter: c.topicKey });
    }
  }
  return out;
}

export interface ServedHit {
  readonly surface: ServedSurface;
  readonly id: string;
  readonly field: string;
  readonly text: string;
  readonly referenceItemId: string;
  readonly referenceItem: string;
  readonly matched: string;
}

/** Match every served item. Labels → reference terms + variants; text → exclusion phrases. */
export function scanServedItems(items: readonly ServedItem[], matcher: SyllabusMatcher): ServedHit[] {
  const hits: ServedHit[] = [];
  for (const s of items) {
    if (s.kind === "chapterKey") {
      const ch = matcher.excludedChapterKeys.get(s.text);
      if (ch) hits.push({ ...pick(s), referenceItemId: ch.id, referenceItem: ch.item, matched: s.text });
      continue;
    }
    if (s.kind === "label") {
      const t = matchLabel(s.text, matcher, s.chapter);
      if (t) hits.push({ ...pick(s), referenceItemId: t.itemId, referenceItem: t.item, matched: t.term });
      continue;
    }
    for (const h of matchFreeText(s.text, matcher, s.chapter)) {
      hits.push({ ...pick(s), text: h.sentence, referenceItemId: h.term.itemId, referenceItem: h.term.item, matched: h.term.term });
    }
  }
  return hits;
}

function pick(s: ServedItem) {
  return { surface: s.surface, id: s.id, field: s.field, text: s.text };
}

/** Per-surface counts of what was scanned (for the report). */
export function countBySurface(items: readonly ServedItem[]): Record<ServedSurface, number> {
  const c: Record<ServedSurface, number> = { bank: 0, hpq: 0, predicted: 0, promptD: 0, notes: 0, hub: 0, catalogue: 0, legacyHub: 0 };
  for (const s of items) c[s.surface]++;
  return c;
}

// ── Runtime loaders (the REAL modules) ────────────────────────────────────────
// Computed-URL dynamic imports: the app modules are loaded at runtime by tsx, and
// stay outside this package's `tsc` rootDir (the precedent: deletionGuard.test.ts,
// practiceSetGeneratorGuard.test.ts import lazytopper/src the same way).

const REPO_ROOT = join(import.meta.dirname, "../..");

async function importApp<T>(relFromSrc: string): Promise<T> {
  return (await import(pathToFileURL(join(LAZYTOPPER_SRC, relFromSrc)).href)) as T;
}

/** The ONE reference: `lazytopper/src/config/syllabus2026-27.ts` (`SYLLABUS_2026_27`). */
export async function loadReference(): Promise<SyllabusReferenceLike> {
  const mod = await importApp<{ SYLLABUS_2026_27: SyllabusReferenceLike }>("config/syllabus2026-27.ts");
  return mod.SYLLABUS_2026_27;
}

export interface LoadedServedSources extends ServedSources {
  /** `canonicalQuestionBank.length` — the app's own served bank, for the identity check. */
  servedBankLength: number;
}

/** Load the served set from the real modules. */
export async function loadServedSources(): Promise<LoadedServedSources> {
  const bank = await importApp<{
    RAW_CANONICAL_QUESTION_BANK: BankRowLike[];
    WITHHELD_QUESTION_IDS: ReadonlySet<string>;
    canonicalQuestionBank: BankRowLike[];
  }>("data/canonicalQuestionBank.ts");
  const hpq = await importApp<{ highlyProbableQuestions: HpqBucketLike[] }>("data/highlyProbableQuestions.ts");
  const pm = await importApp<{ predictedQuestions: PredictedRowLike[] }>("data/predictedQuestions.ts");
  const ps = await importApp<{ predictedQuestionsScience: PredictedRowLike[] }>("data/predictedQuestionsScience.ts");
  const pd = await importApp<{ promptDPracticePacks: Record<string, Record<string, PromptDPackLike>> }>(
    "data/promptDPracticePacks.ts",
  );
  const topics = await importApp<{ allDesktopTopics: () => { slug: string }[] }>("lib/desktop/topics.ts");
  const hubMod = await importApp<{ buildActionableDesktopTopicHubContent: (slug: string) => HubContentLike | undefined }>(
    "lib/desktop/topicHubContent.ts",
  );
  const cat = await importApp<{ conceptFigureCatalogue: CatalogueRowLike[] }>("pages/tutor/conceptVisualCatalogue.data.ts");
  const legacy = await importApp<{ topicHubContent: unknown }>("data/topicHubContent.ts");
  const legacyV2 = await importApp<{ topicHubV2Content: unknown }>("data/topicHubV2Full.ts");

  const notesDir = join(REPO_ROOT, "notes/specs");
  const notes = readdirSync(notesDir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => ({ file: `notes/specs/${f}`, spec: JSON.parse(readFileSync(join(notesDir, f), "utf-8")) as unknown }));

  const hub: HubContentLike[] = [];
  for (const t of topics.allDesktopTopics()) {
    const h = hubMod.buildActionableDesktopTopicHubContent(t.slug);
    if (h) hub.push(h);
  }

  return {
    rawBank: bank.RAW_CANONICAL_QUESTION_BANK,
    withheldIds: bank.WITHHELD_QUESTION_IDS,
    servedBankLength: bank.canonicalQuestionBank.length,
    hpq: hpq.highlyProbableQuestions,
    predicted: [...pm.predictedQuestions, ...ps.predictedQuestionsScience],
    promptD: Object.values(pd.promptDPracticePacks).flatMap((bySubject) => Object.values(bySubject)),
    notes,
    hub,
    catalogue: cat.conceptFigureCatalogue,
    legacyHub: [
      { file: "lazytopper/src/data/topicHubContent.ts", data: legacy.topicHubContent },
      { file: "lazytopper/src/data/topicHubV2Full.ts", data: legacyV2.topicHubV2Content },
    ],
  };
}

/** Load the reference + the served set and scan it. */
export async function runServedSetScan(): Promise<{
  items: ServedItem[];
  hits: ServedHit[];
  counts: Record<ServedSurface, number>;
  sources: LoadedServedSources;
}> {
  const matcher = buildSyllabusMatcher(await loadReference());
  const sources = await loadServedSources();
  const items = collectServedItems(sources);
  return { items, hits: scanServedItems(items, matcher), counts: countBySurface(items), sources };
}

async function runGuard(): Promise<void> {
  const workspaceRoot = join(import.meta.dirname, "../..");
  let totalViolations = 0;
  let hasError = false;

  // ── Mode 1: question banks ──
  for (const rule of RULES) {
    console.log(
      `\nChecking ${rule.grade} ${rule.subject} (${rule.board} ${rule.year})...`
    );
    console.log(`  Banned subtopics: ${rule.bannedSubtopics.join(", ")}`);
    console.log(`  Scanning: ${relative(workspaceRoot, rule.questionBankDir)}`);

    let files: string[];
    try {
      files = readdirSync(rule.questionBankDir).filter((f) => f.endsWith(".ts"));
    } catch (err) {
      console.error(
        `  ERROR: Could not read directory: ${rule.questionBankDir}`
      );
      hasError = true;
      continue;
    }

    const ruleViolations: Violation[] = [];
    for (const file of files) {
      const filePath = join(rule.questionBankDir, file);
      const violations = scanFile(filePath, rule.bannedSubtopics);
      ruleViolations.push(...violations);
    }

    if (ruleViolations.length === 0) {
      console.log(`  ✓ No out-of-syllabus subtopics found.`);
    } else {
      hasError = true;
      for (const v of ruleViolations) {
        const relFile = relative(workspaceRoot, v.file);
        console.error(
          `  ✗ BANNED SUBTOPIC "${v.subtopic}" found ${v.matchCount} time(s) in ${relFile}`
        );
        totalViolations += v.matchCount;
      }
    }
  }

  // ── Mode 2: board-prep surfaces ──
  console.log(
    `\nChecking board-prep surfaces (curated phrase scan, ${BOARD_PREP_SURFACES.length} files)...`
  );
  const surfaceViolations: Violation[] = [];
  for (const rel of BOARD_PREP_SURFACES) {
    const filePath = join(LAZYTOPPER_SRC, rel);
    if (!existsSync(filePath)) {
      console.error(`  ERROR: surface file missing: lazytopper/src/${rel}`);
      hasError = true;
      continue;
    }
    surfaceViolations.push(...scanSurfaceFile(filePath, SURFACE_BANNED_PHRASES));
  }

  if (surfaceViolations.length === 0) {
    console.log(`  ✓ No board-excluded phrases found on any board-prep surface.`);
  } else {
    hasError = true;
    for (const v of surfaceViolations) {
      const relFile = relative(workspaceRoot, v.file);
      console.error(
        `  ✗ BOARD-EXCLUDED PHRASE "${v.subtopic}" found ${v.matchCount} time(s) in ${relFile}`
      );
      totalViolations += v.matchCount;
    }
  }

  // ── Mode 3: the served set, at runtime, against the one reference ──
  const served = await runServedSetScan();
  console.log(
    `\nChecking the SERVED set against lazytopper/src/config/syllabus2026-27.ts ` +
      `(${Object.entries(served.counts).map(([k, n]) => `${k} ${n}`).join(" · ")})...`
  );
  if (served.hits.length === 0) {
    console.log(`  ✓ No OUT / FORMATIVE item is served on any surface.`);
  } else {
    hasError = true;
    for (const h of served.hits) {
      console.error(
        `  ✗ SERVED ${h.surface} ${h.id} ${h.field}: "${h.text.slice(0, 120)}" -> ${h.referenceItemId} (matched "${h.matched}")`
      );
      totalViolations += 1;
    }
  }

  // ── Mode 4 (GUARD-3): row rules over every served row + the ratchet ──
  const g3 = await runRowRules(served.sources);
  console.log(
    `\nChecking every SERVED row's text, options and solutions (GUARD-3: ${g3.rowCount} rows, ` +
      `${g3.findings.length} finding(s); baseline ${g3.ratchet.baselined.length}, reviewed ${g3.ratchet.reviewed.length})...`
  );
  for (const [rule, n] of Object.entries(g3.countsByRule)) console.log(`  ${rule}: ${n}`);
  const g3Failures =
    g3.ratchet.unlisted.length + g3.ratchet.staleBaseline.length + g3.ratchet.staleReviewed.length + g3.ratchet.errors.length;
  if (g3Failures === 0) {
    console.log(`  ✓ No finding outside the baseline / reviewed lists, and no stale entry.`);
  } else {
    hasError = true;
    for (const f of g3.ratchet.unlisted) {
      console.error(
        `  ✗ ${f.rule} ${f.verdict.toUpperCase()} ${f.surface} ${f.rowId}${g3.fileOf(f.rowId) ? ` (${g3.fileOf(f.rowId)})` : ""} ` +
          `[${f.fields.join(",")}]: ${f.matched} — "${f.text}"`
      );
    }
    for (const e of g3.ratchet.staleBaseline) {
      console.error(`  ✗ STALE baseline entry (no longer matches; remove it): ${e.rule} ${e.surface} ${e.rowId} ${e.matched}`);
    }
    for (const e of g3.ratchet.staleReviewed) {
      console.error(`  ✗ STALE reviewed entry (no longer matches; remove it): ${e.rule} ${e.surface} ${e.rowId} ${e.matched}`);
    }
    for (const e of g3.ratchet.errors) console.error(`  ✗ ${e}`);
    totalViolations += g3Failures;
  }

  if (hasError) {
    console.error(
      `\nSyllabus guard FAILED — ${totalViolations} out-of-syllabus item(s) detected.`
    );
    console.error(
      `Remove or reclassify the flagged questions/content before merging.\n`
    );
    process.exit(1);
  } else {
    console.log(`\nSyllabus guard passed — all banks and surfaces are clean.\n`);
  }
}

/** GUARD-3 (Mode 4): the row rules + ratchet over the served set already loaded for Mode 3. */
export async function runRowRules(sources: LoadedServedSources) {
  // Loaded at run time: syllabusGuard.rows.ts imports this module, so a static import would be a cycle.
  const rows = await import("./syllabusGuard.rows.js");
  const ref = await loadReference();
  const limitErrors = rows.checkLimitsPresent(ref);
  if (limitErrors.length > 0) throw new Error(`syllabusGuard: ${limitErrors.join(" ")}`);
  const base = buildSyllabusMatcher(ref);
  const served = rows.collectServedRows(sources, base.chapterKeys);
  const findings = rows.scanRows(served, { textMatcher: rows.buildTextMatcher(base) });
  const ratchet = rows.applyRatchet(findings, rows.loadRatchetFiles());
  const countsByRule: Record<string, number> = {};
  for (const r of rows.ROW_RULES) countsByRule[r.id] = 0;
  for (const f of findings) countsByRule[f.rule]++;
  let index: Map<string, string> | undefined;
  const fileOf = (id: string) => {
    if (ratchet.unlisted.length === 0) return undefined;
    index ??= rows.indexRowFiles(REPO_ROOT, ["lazytopper/src/data/questionBanks", "lazytopper/src/data"]);
    return index.get(id);
  };
  return { rowCount: served.length, findings, ratchet, countsByRule, fileOf };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  // Not a top-level await: runRowRules() imports syllabusGuard.rows.ts, which imports this module,
  // and that import cannot settle while this module is still evaluating a top-level await.
  runGuard().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}
