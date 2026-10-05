// src/components/practice/cbqAvailability.ts
//
// CBQ-ENTRY-1 (P6) — which chapters have REAL competency-based (Section E) questions.
//
// Decided the SAME way Practice decides whether its Competency preset is live
// (PracticePage `competencyAvailable`): a Section-E engine draw over the ASSEMBLED bank
// for the chapter, kept only if a question passes the Competency preset's own filter
// (marks "4", style "case") through Practice's own predicate. The topic label is derived
// exactly as Practice derives it from a `?topic=` slug. Never a text scan; the bank is
// only read.
//
// ⚠ LOAD THIS MODULE WITH `import()` ONLY. It reaches the question bank (the engine, the
// chapter loader, Practice's predicate), and the Practice Hub must stay bank-free in its
// static graph (src/config/bankReach.guard.test.ts). CbqChapterPicker imports it lazily,
// when the chooser opens.

import { ensureBankSubject } from "../../data/bankChapters/loader";
import { questionMatchesFilters } from "../../pages/PracticePage";
import { resolveTopicDisplayName, resolveTopicKey } from "../../utils/topicResolver";
import { buildPracticeQuestionsFromEngine, type SubjectKey } from "./practiceQuestionBuilder";

/** The bank label Practice reads for a `?topic=<slug>` arrival (PracticePage `topicLabel`). */
export function practiceTopicLabel(subject: SubjectKey, slug: string): string {
  const canonical = resolveTopicKey({
    subjectKey: subject.toLowerCase(),
    topicParam: slug,
    topicKey: null,
  });
  if (canonical && canonical.toLowerCase() !== "generic") {
    return resolveTopicDisplayName(subject, canonical);
  }
  if (!slug || slug.toLowerCase() === "generic") return slug;
  return resolveTopicDisplayName(subject, canonical || slug);
}

/**
 * True when the chapter has at least one real Section-E competency question. Its chapter
 * must already be loaded (see `chaptersWithCbqs`, which loads the subject first).
 */
export function chapterHasCbqs(subject: SubjectKey, slug: string): boolean {
  const label = practiceTopicLabel(subject, slug);
  if (!label || label.toLowerCase() === "generic") return false;
  const drawn = buildPracticeQuestionsFromEngine({
    subjectKey: subject,
    topicKey: label,
    count: 200,
    difficulty: "All",
    boardPattern: "E",
  });
  return drawn.some((q) => questionMatchesFilters(q, "4", "case", "all", "all", null));
}

/** Load the subject's chapters, then return the slugs (of `slugs`) that have real CBQs. */
export async function chaptersWithCbqs(
  subject: SubjectKey,
  slugs: readonly string[],
): Promise<Set<string>> {
  await ensureBankSubject(subject);
  return new Set(slugs.filter((slug) => chapterHasCbqs(subject, slug)));
}
