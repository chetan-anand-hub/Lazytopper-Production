import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

// ---------------------------------------------------------------------------
// Shared file-collection helpers
// ---------------------------------------------------------------------------

function collectTsFiles(dir: string, isRoot = false): string[] {
  const results: string[] = [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    if (isRoot) {
      throw new Error(`Cannot read required question bank root "${dir}": ${err}`);
    }
    return results;
  }
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectTsFiles(fullPath, false));
    } else if (entry.isFile() && entry.name.endsWith(".ts")) {
      results.push(fullPath);
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Check 1: Banned NCERT exercise references
// ---------------------------------------------------------------------------

interface BannedExerciseRule {
  board: string;
  year: string;
  subject: string;
  grade: string;
  bannedExercises: string[];
  reason: string;
  questionBankDir?: string;
}

interface BannedExercisesConfig {
  rules: BannedExerciseRule[];
  [key: string]: unknown;
}

const NCERT_REF_PATTERN = /["']?ncertRef["']?\s*:\s*["'`]([^"'`]+)["'`]/g;

interface BannedViolation {
  file: string;
  exercise: string;
  matchCount: number;
}

function parseExerciseRefs(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function scanFileForBannedExercises(filePath: string, bannedSet: Set<string>): BannedViolation[] {
  const content = readFileSync(filePath, "utf-8");
  const counts = new Map<string, number>();

  let match: RegExpExecArray | null;
  NCERT_REF_PATTERN.lastIndex = 0;
  while ((match = NCERT_REF_PATTERN.exec(content)) !== null) {
    const refs = parseExerciseRefs(match[1]);
    for (const ref of refs) {
      if (bannedSet.has(ref.toLowerCase())) {
        counts.set(ref, (counts.get(ref) ?? 0) + 1);
      }
    }
  }

  return [...counts.entries()].map(([exercise, matchCount]) => ({
    file: filePath,
    exercise,
    matchCount,
  }));
}

function runBannedExerciseValidation(
  workspaceRoot: string,
  questionBankRoots: string[]
): boolean {
  const configPath = join(import.meta.dirname, "bannedExercises.json");
  const config: BannedExercisesConfig = require(configPath);

  let hasError = false;
  let totalViolations = 0;

  for (const rule of config.rules) {
    console.log(
      `\nChecking ncertRef guard — ${rule.grade} ${rule.subject} (${rule.board} ${rule.year})...`
    );
    console.log(`  Reason: ${rule.reason}`);
    console.log(`  Banned exercises: ${rule.bannedExercises.join(", ")}`);

    const bannedSet = new Set(rule.bannedExercises.map((e) => e.toLowerCase()));
    const ruleViolations: BannedViolation[] = [];

    for (const root of questionBankRoots) {
      const relRoot = relative(workspaceRoot, root);
      console.log(`  Scanning: ${relRoot} (recursively)`);

      let tsFiles: string[];
      try {
        tsFiles = collectTsFiles(root, true);
      } catch (err) {
        console.error(`  ERROR: ${err}`);
        hasError = true;
        continue;
      }
      console.log(`    Found ${tsFiles.length} .ts file(s)`);
      for (const filePath of tsFiles) {
        ruleViolations.push(...scanFileForBannedExercises(filePath, bannedSet));
      }
    }

    if (ruleViolations.length === 0) {
      console.log(`  ✓ No banned exercise references found.`);
    } else {
      hasError = true;
      for (const v of ruleViolations) {
        const relFile = relative(workspaceRoot, v.file);
        console.error(
          `  ✗ BANNED EXERCISE "${v.exercise}" found ${v.matchCount} time(s) in ncertRef — ${relFile}`
        );
        totalViolations += v.matchCount;
      }
    }
  }

  if (hasError) {
    console.error(
      `\nBanned exercise check FAILED — ${totalViolations} reference(s) to removed CBSE exercises detected.`
    );
    console.error(
      `Update the ncertRef field on each flagged question to a valid in-syllabus exercise before merging.`
    );
    console.error(
      `To update the banned exercises list, edit: scripts/src/bannedExercises.json\n`
    );
  } else {
    console.log(
      `\nBanned exercise check passed — no banned exercise references found.\n`
    );
  }

  return hasError;
}

// ---------------------------------------------------------------------------
// Check 2: Mark / section mismatch
// ---------------------------------------------------------------------------

/**
 * The authoritative mapping from CBSE section letter to the number of marks
 * awarded for questions in that section (Class X, 2024-25 / 2025-26 scheme).
 *
 *   Section A  →  1 mark   (MCQ / Assertion-Reasoning)
 *   Section B  →  2 marks  (Very Short Answer)
 *   Section C  →  3 marks  (Short Answer)
 *   Section D  →  5 marks  (Long Answer)
 *   Section E  →  4 marks  (Case-Based / Source-Based)
 */
const EXPECTED_MARKS: Record<string, number> = {
  A: 1,
  B: 2,
  C: 3,
  D: 5,
  E: 4,
};

interface MarksMismatch {
  file: string;
  id: string;
  section: string;
  actualMarks: number;
  expectedMarks: number;
}

function isQuestionObject(value: unknown): value is { id: string; section: string; marks: number } {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj["id"] === "string" &&
    typeof obj["section"] === "string" &&
    typeof obj["marks"] === "number"
  );
}

async function checkFileForMarksMismatches(
  filePath: string,
  workspaceRoot: string
): Promise<MarksMismatch[]> {
  const fileUrl = pathToFileURL(filePath).href;
  let mod: Record<string, unknown>;
  try {
    mod = (await import(fileUrl)) as Record<string, unknown>;
  } catch (err) {
    console.error(`  ERROR: Could not import ${relative(workspaceRoot, filePath)}: ${err}`);
    return [{ file: filePath, id: "<import-error>", section: "?", actualMarks: -1, expectedMarks: -1 }];
  }

  const mismatches: MarksMismatch[] = [];

  for (const exportedValue of Object.values(mod)) {
    if (!Array.isArray(exportedValue)) continue;
    for (const item of exportedValue) {
      if (!isQuestionObject(item)) continue;
      const expected = EXPECTED_MARKS[item.section];
      if (expected === undefined) continue;
      if (item.marks !== expected) {
        mismatches.push({
          file: filePath,
          id: item.id,
          section: item.section,
          actualMarks: item.marks,
          expectedMarks: expected,
        });
      }
    }
  }

  return mismatches;
}

async function runMarksSectionValidation(
  workspaceRoot: string,
  questionBankRoots: string[]
): Promise<boolean> {
  console.log("\nChecking mark / section consistency across all question packs...");
  console.log("  Expected mapping: A→1, B→2, C→3, D→5, E→4");

  let totalFilesScanned = 0;
  const allMismatches: MarksMismatch[] = [];

  for (const root of questionBankRoots) {
    const relRoot = relative(workspaceRoot, root);
    console.log(`  Scanning: ${relRoot} (recursively)`);

    let tsFiles: string[];
    try {
      tsFiles = collectTsFiles(root, true);
    } catch (err) {
      console.error(`  ERROR reading directory: ${err}`);
      return true;
    }

    totalFilesScanned += tsFiles.length;
    console.log(`    Found ${tsFiles.length} .ts file(s)`);

    for (const filePath of tsFiles) {
      const mismatches = await checkFileForMarksMismatches(filePath, workspaceRoot);
      allMismatches.push(...mismatches);
    }
  }

  if (allMismatches.length === 0) {
    console.log(
      `  ✓ All mark/section assignments are consistent across ${totalFilesScanned} file(s).`
    );
    console.log(`\nMark/section check passed.\n`);
    return false;
  }

  console.error(
    `\nMark/section check FAILED — ${allMismatches.length} mismatch(es) found:\n`
  );
  for (const m of allMismatches) {
    if (m.id === "<import-error>") {
      const relFile = relative(workspaceRoot, m.file);
      console.error(`  ✗ Could not import ${relFile} — treat as a validation failure`);
      continue;
    }
    const relFile = relative(workspaceRoot, m.file);
    console.error(
      `  ✗ Question "${m.id}" in ${relFile}` +
        ` — section "${m.section}" expects ${m.expectedMarks} mark(s)` +
        ` but marks is set to ${m.actualMarks}`
    );
  }
  console.error(
    `\nFix the marks / section field on each flagged question before merging.`
  );
  console.error(
    `Valid mapping: Section A → 1, B → 2, C → 3, D → 5, E → 4\n`
  );
  return true;
}

// ---------------------------------------------------------------------------
// Check 3: Duplicate question IDs (within each file)
// ---------------------------------------------------------------------------

const ID_PATTERN = /["']?id["']?\s*:\s*["'`]([^"'`]+)["'`]/g;

interface DuplicateIdViolation {
  file: string;
  id: string;
  count: number;
}

function scanFileForDuplicateIds(filePath: string): DuplicateIdViolation[] {
  let src: string;
  try {
    src = readFileSync(filePath, "utf8");
  } catch {
    return [];
  }
  const counts = new Map<string, number>();
  for (const match of src.matchAll(new RegExp(ID_PATTERN.source, "g"))) {
    const id = match[1];
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  const violations: DuplicateIdViolation[] = [];
  for (const [id, count] of counts) {
    if (count > 1) violations.push({ file: filePath, id, count });
  }
  return violations;
}

function runDuplicateIdValidation(
  workspaceRoot: string,
  questionBankRoots: string[]
): boolean {
  console.log("\nChecking for duplicate question IDs within each pack file...");

  let totalFilesScanned = 0;
  const allViolations: DuplicateIdViolation[] = [];

  for (const root of questionBankRoots) {
    const relRoot = relative(workspaceRoot, root);
    console.log(`  Scanning: ${relRoot} (recursively)`);

    let tsFiles: string[];
    try {
      tsFiles = collectTsFiles(root, true);
    } catch (err) {
      console.error(`  ERROR reading directory: ${err}`);
      return true;
    }

    totalFilesScanned += tsFiles.length;
    console.log(`    Found ${tsFiles.length} .ts file(s)`);

    for (const filePath of tsFiles) {
      allViolations.push(...scanFileForDuplicateIds(filePath));
    }
  }

  if (allViolations.length === 0) {
    console.log(
      `  ✓ No duplicate question IDs found across ${totalFilesScanned} file(s).`
    );
    console.log(`\nDuplicate ID check passed.\n`);
    return false;
  }

  console.error(
    `\nDuplicate ID check FAILED — ${allViolations.length} duplicate(s) found:\n`
  );
  for (const v of allViolations) {
    const relFile = relative(workspaceRoot, v.file);
    console.error(`  ✗ ID "${v.id}" appears ${v.count} time(s) in ${relFile}`);
  }
  console.error(
    `\nRenumber the duplicate IDs to unique values before merging.\n`
  );
  return true;
}

// ---------------------------------------------------------------------------
// Entry point — run all checks
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const workspaceRoot = join(import.meta.dirname, "../..");

  const questionBankRoots = [
    join(workspaceRoot, "lazytopper/src/data/questionBanks"),
    join(workspaceRoot, "lib/shared-data/src/questionBanks"),
  ];

  console.log("=== Question Bank Validation ===");

  const bannedFailed = runBannedExerciseValidation(workspaceRoot, questionBankRoots);
  const marksFailed = await runMarksSectionValidation(workspaceRoot, questionBankRoots);
  const dupIdFailed = runDuplicateIdValidation(workspaceRoot, questionBankRoots);

  if (bannedFailed || marksFailed || dupIdFailed) {
    console.error("=== Question bank validation FAILED ===");
    process.exit(1);
  } else {
    console.log("=== Question bank validation passed ===\n");
  }
}

main();
