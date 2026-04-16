import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

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

interface Violation {
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

function scanFile(filePath: string, bannedSet: Set<string>): Violation[] {
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

  const violations: Violation[] = [];
  for (const [exercise, matchCount] of counts.entries()) {
    violations.push({ file: filePath, exercise, matchCount });
  }
  return violations;
}

function runValidation(): void {
  const workspaceRoot = join(import.meta.dirname, "../..");
  const configPath = join(import.meta.dirname, "bannedExercises.json");
  const config: BannedExercisesConfig = require(configPath);

  const questionBankRoots = [
    join(workspaceRoot, "lazytopper/src/data/questionBanks"),
    join(workspaceRoot, "lib/shared-data/src/questionBanks"),
  ];

  let totalViolations = 0;
  let hasError = false;

  for (const rule of config.rules) {
    console.log(
      `\nChecking ncertRef guard — ${rule.grade} ${rule.subject} (${rule.board} ${rule.year})...`
    );
    console.log(`  Reason: ${rule.reason}`);
    console.log(`  Banned exercises: ${rule.bannedExercises.join(", ")}`);

    const bannedSet = new Set(rule.bannedExercises.map((e) => e.toLowerCase()));
    const ruleViolations: Violation[] = [];

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
        ruleViolations.push(...scanFile(filePath, bannedSet));
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
      `\nQuestion bank validation FAILED — ${totalViolations} reference(s) to removed CBSE exercises detected.`
    );
    console.error(
      `Update the ncertRef field on each flagged question to a valid in-syllabus exercise before merging.`
    );
    console.error(
      `To update the banned exercises list, edit: scripts/src/bannedExercises.json\n`
    );
    process.exit(1);
  } else {
    console.log(
      `\nQuestion bank validation passed — no banned exercise references found.\n`
    );
  }
}

runValidation();
