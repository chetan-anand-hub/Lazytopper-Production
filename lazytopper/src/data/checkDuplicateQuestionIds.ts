import { canonicalQuestionBank } from "./canonicalQuestionBank";
import { sciencePredictedQuestions } from "./predictedQuestionsScience";
import { predictedQuestions } from "./predictedQuestions";
import { predictedScienceQuestions } from "./predictedScienceQuestions";

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

export function checkDuplicateQuestionIds(): void {
  const banks: BankDescriptor[] = [
    { name: "Canonical Question Bank", questions: canonicalQuestionBank },
    { name: "Predicted Questions – Science", questions: sciencePredictedQuestions },
    { name: "Predicted Questions – Maths", questions: predictedQuestions },
    { name: "Predicted Science Questions (Engine)", questions: predictedScienceQuestions },
  ];

  let anyDuplicatesFound = false;

  for (const bank of banks) {
    const dupes = findDuplicates(bank.questions);
    if (dupes.length > 0) {
      anyDuplicatesFound = true;
      console.error(
        `[checkDuplicateQuestionIds] Duplicate IDs found in "${bank.name}" (${dupes.length} duplicate${dupes.length === 1 ? "" : "s"}):`,
        dupes,
      );
    }
  }

  const allQuestions = banks.flatMap((b) => b.questions);
  const crossBankDupes = findDuplicates(allQuestions);
  if (crossBankDupes.length > 0) {
    const uniqueDupes = crossBankDupes.filter(
      (id) => !banks.some((b) => findDuplicates(b.questions).includes(id)),
    );
    if (uniqueDupes.length > 0) {
      anyDuplicatesFound = true;
      console.error(
        `[checkDuplicateQuestionIds] IDs duplicated across question banks (${uniqueDupes.length}):`,
        uniqueDupes,
      );
    }
  }

  if (anyDuplicatesFound && import.meta.env.DEV) {
    throw new Error(
      "[checkDuplicateQuestionIds] Duplicate question IDs detected. See console errors above for details.",
    );
  }
}
