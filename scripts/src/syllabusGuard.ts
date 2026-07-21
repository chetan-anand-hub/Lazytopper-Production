import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

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

const BOARD_PREP_SURFACES: string[] = [
  // HPQ / predicted-questions
  "data/highlyProbableQuestions.ts",
  "data/predictedQuestions.ts",
  "data/predictedQuestionsScience.ts",
  "data/predictedScienceQuestions.ts",
  "data/hpqCompetencyAdditions.ts",
  "prediction/hpqConfidence.ts",
  // Mocks / full-length / chapter-test engines
  "utils/topicMockEngine.ts",
  "utils/mockBlueprint.ts",
  "utils/mockPaperEngine.ts",
  "utils/mockPaperEngineScience.ts",
  // Worksheet generator
  "components/practice/worksheetGenerator.ts",
  "services/worksheetProfileService.ts",
  "lib/desktop/savedWorksheets.ts",
  // Practice / daily-mix
  "data/practiceSetGenerator.ts",
  "services/dailyMixGenerator.ts",
  "services/dailyMixService.ts",
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

const SUBTOPIC_PATTERN = /["']?subtopic["']?\s*:\s*["'`]([^"'`]+)["'`]/g;

export interface Violation {
  file: string;
  subtopic: string;
  matchCount: number;
}

// ── Mode 1: question-bank scan — exact `subtopic:` field-value match ──
export function scanFile(filePath: string, bannedSubtopics: string[]): Violation[] {
  const content = readFileSync(filePath, "utf-8");
  const violations: Violation[] = [];

  const bannedSet = new Set(bannedSubtopics.map((s) => s.toLowerCase()));
  const counts = new Map<string, number>();

  let match: RegExpExecArray | null;
  SUBTOPIC_PATTERN.lastIndex = 0;
  while ((match = SUBTOPIC_PATTERN.exec(content)) !== null) {
    const subtopic = match[1];
    if (bannedSet.has(subtopic.toLowerCase())) {
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

function runGuard(): void {
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

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runGuard();
}
