import { join } from "node:path";
import { pathToFileURL } from "node:url";

interface HasId {
  id: string;
}

interface BankDescriptor {
  name: string;
  questions: HasId[];
}

function findDuplicates(questions: HasId[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const q of questions) {
    if (seen.has(q.id)) {
      duplicates.add(q.id);
    } else {
      seen.add(q.id);
    }
  }
  return Array.from(duplicates);
}

async function loadBanks(workspaceRoot: string): Promise<BankDescriptor[]> {
  const dataDir = join(workspaceRoot, "lazytopper/src/data");

  const [
    { canonicalQuestionBank },
    { sciencePredictedQuestions },
    { predictedQuestions },
    { predictedScienceQuestions },
  ] = await Promise.all([
    import(pathToFileURL(join(dataDir, "canonicalQuestionBank.ts")).href),
    import(pathToFileURL(join(dataDir, "predictedQuestionsScience.ts")).href),
    import(pathToFileURL(join(dataDir, "predictedQuestions.ts")).href),
    import(pathToFileURL(join(dataDir, "predictedScienceQuestions.ts")).href),
  ]);

  return [
    { name: "Canonical Question Bank", questions: canonicalQuestionBank as HasId[] },
    { name: "Predicted Questions – Science", questions: sciencePredictedQuestions as HasId[] },
    { name: "Predicted Questions – Maths", questions: predictedQuestions as HasId[] },
    { name: "Predicted Science Questions (Engine)", questions: predictedScienceQuestions as HasId[] },
  ];
}

async function main(): Promise<void> {
  const workspaceRoot = join(import.meta.dirname, "../..");

  console.log("=== Checking for duplicate question IDs across assembled banks ===");

  let banks: BankDescriptor[];
  try {
    banks = await loadBanks(workspaceRoot);
  } catch (err) {
    console.error(`[checkDuplicateQuestionIds] Failed to load question banks: ${err}`);
    process.exit(1);
  }

  let anyDuplicatesFound = false;

  for (const bank of banks) {
    const dupes = findDuplicates(bank.questions);
    if (dupes.length > 0) {
      anyDuplicatesFound = true;
      console.error(
        `[checkDuplicateQuestionIds] Duplicate IDs within "${bank.name}" (${dupes.length} duplicate${dupes.length === 1 ? "" : "s"}):`,
        dupes,
      );
    }
  }

  const allQuestions = banks.flatMap((b) => b.questions);
  const crossBankDupes = findDuplicates(allQuestions);
  if (crossBankDupes.length > 0) {
    const withinBankDupeIds = new Set(
      banks.flatMap((b) => findDuplicates(b.questions)),
    );
    const uniqueCrossBankDupes = crossBankDupes.filter(
      (id) => !withinBankDupeIds.has(id),
    );
    if (uniqueCrossBankDupes.length > 0) {
      anyDuplicatesFound = true;
      console.error(
        `[checkDuplicateQuestionIds] IDs duplicated across question banks (${uniqueCrossBankDupes.length}):`,
        uniqueCrossBankDupes,
      );
    }
  }

  if (anyDuplicatesFound) {
    console.error(
      "\n[checkDuplicateQuestionIds] Duplicate question IDs detected — build blocked.\n" +
        "Rename the duplicate IDs to unique values before rebuilding.",
    );
    process.exit(1);
  }

  const total = banks.reduce((acc, b) => acc + b.questions.length, 0);
  console.log(
    `[checkDuplicateQuestionIds] All ${total} question IDs are unique across all banks.\n`,
  );
}

main();
