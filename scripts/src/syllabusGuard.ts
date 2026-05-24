import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

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
    // Source: CBSE Class 10 Mathematics Syllabus 2025-26 (cbseacademic.nic.in)
    // Deleted: Constructions (entire chapter), Euclid's Division Lemma,
    //   Polynomial Division Algorithm, Area of Triangle (Coord Geom),
    //   Trig Complementary Angles, Frustum of Cone, Ogive, Step-Deviation,
    //   Cross-Multiplication Method, Decimal Representation of Rationals.
    bannedSubtopics: [
      // Real Numbers — deleted sub-topics
      "Euclid's Division Lemma",
      "Euclid Division Lemma",
      "Euclid's Division Algorithm",
      "Decimal Representation of Rational Numbers",
      "Terminating and Non-Terminating Decimals",
      // Polynomials — deleted sub-topic
      "Division Algorithm for Polynomials",
      "Polynomial Division Algorithm",
      "Division Algorithm",
      // Pair of Linear Equations — deleted method
      "Cross-Multiplication Method",
      "Cross Multiplication Method",
      // Trigonometry — deleted sub-topic
      "Trigonometric Ratios of Complementary Angles",
      "Complementary Angles Trigonometry",
      "T-Ratios of Complementary Angles",
      // Mensuration — deleted sub-topics
      "Frustum of Cone",
      // Statistics — deleted sub-topics
      "Step Deviation Method",
      "Step-Deviation Method",
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
    // Source: CBSE Class 10 Science Syllabus 2025-26 (cbseacademic.nic.in)
    // Deleted: Ch5 Periodic Classification (full), Ch8 Reproductive Health
    //   sub-topics, Ch9 Evolution section, Ch14 Sources of Energy (full),
    //   Ch15 Our Environment (full), Ch16 Management of Natural Resources (full).
    bannedSubtopics: [
      // Ch 5 — Periodic Classification of Elements (entire chapter deleted)
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
      // Ch 8 — Reproductive Health sub-topics deleted
      "Reproductive Health",
      "Contraception",
      "Family Planning",
      "Sexually Transmitted Infections",
      "Sexually Transmitted Diseases",
      "STI",
      "STDs",
      "Barrier Contraception",
      "Contraception Methods",
      "Reasons for Contraception",
      "Contraceptive Methods",
      "Birth Control Methods",
      // Ch 9 — Evolution section deleted (Mendel/genetics retained)
      "Evolution",
      "Natural Selection",
      "Speciation",
      "Phylogeny",
      "Fossil",
      "Fossils",
      "Human Evolution",
      "Evolutionary Relationships",
      "Acquired Traits",
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
      // Ch 15 — Our Environment (entire chapter deleted)
      "Our Environment",
      "Ecosystem",
      "Food Chain",
      "Food Web",
      "Biodegradable",
      "Non-Biodegradable",
      "Ozone Depletion",
      "Ozone Layer",
      "Biological Magnification",
      "Energy Flow",
      "Trophic Levels",
      "Trophic Level",
      "Waste Management",
      "Environmental Problems",
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

const SUBTOPIC_PATTERN = /["']?subtopic["']?\s*:\s*["'`]([^"'`]+)["'`]/g;

export interface Violation {
  file: string;
  subtopic: string;
  matchCount: number;
}

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

function runGuard(): void {
  const workspaceRoot = join(import.meta.dirname, "../..");
  let totalViolations = 0;
  let hasError = false;

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

  if (hasError) {
    console.error(
      `\nSyllabus guard FAILED — ${totalViolations} out-of-syllabus question(s) detected.`
    );
    console.error(
      `Remove or reclassify the flagged questions before merging.\n`
    );
    process.exit(1);
  } else {
    console.log(`\nSyllabus guard passed — all question banks are clean.\n`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runGuard();
}
