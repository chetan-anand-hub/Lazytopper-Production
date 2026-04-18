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
    bannedSubtopics: [
      "Division Algorithm",
      "Cross-Multiplication Method",
      "Frustum of Cone",
      "Ogive",
      "Graph/Ogive",
    ],
    questionBankDir: join(
      import.meta.dirname,
      "../../lazytopper/src/data/questionBanks/class10/maths"
    ),
  },
  {
    // Source: CBSE Class 10 Science syllabus rationalisation 2026-27
    // Reference: CBSE Curriculum 2026-27, Secondary (Class IX-X), Science
    board: "CBSE",
    year: "2026-27",
    subject: "Science",
    grade: "Class 10",
    bannedSubtopics: [
      // Ch 9 (Heredity and Evolution) — Evolution section deleted
      "Evolution",
      "Natural Selection",
      "Speciation",
      "Phylogeny",
      "Fossil",
      "Human Evolution",
      "Evolutionary Relationships",
      "Acquired Traits",
      "Origin of Life",
      // Ch 14 (Sources of Energy) — entire chapter deleted
      "Sources of Energy",
      "Conventional Sources",
      "Non-conventional Sources",
      "Solar Energy",
      "Wind Energy",
      "Hydropower",
      "Nuclear Energy",
      "Biogas",
      "Tidal Energy",
      "Geothermal Energy",
      "Fossil Fuels",
      "Thermal Power",
      // Ch 15 (Our Environment) — entire chapter deleted
      "Our Environment",
      "Ecosystem",
      "Food Chain",
      "Food Web",
      "Biodegradable",
      "Ozone Depletion",
      "Biological Magnification",
      "Energy Flow",
      "Trophic Levels",
      "Waste Management",
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
