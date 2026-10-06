// src/components/practice/cbqAvailability.ts
//
// CBQ-ENTRY-1 (P6) + CBQ-1 PR-1 — which chapters have REAL competency-based questions, and
// how many of each mark value.
//
// CBQ-1 PR-1 (ruling 2, closes FU-CBQ-CHOOSER-ALL-MARKS): a CBQ is decided by the ONE
// classifier, `isCbq` (src/lib/cbq/cbqClassification.ts) — a CBQ can be 1, 2, 3, 4 or 5
// marks. The count is taken over the SAME pool Practice serves for a CBQ set
// (`buildCbqPracticePool`), so the chooser's "coming soon" and the landing's gate cannot
// disagree. It replaced the old rule (a Section-E engine draw kept through the marks "4" /
// style "case" filter), which counted only 4-mark case studies and trusted no CBQ flag.
// The topic label is derived exactly as Practice derives it from a `?topic=` slug. Never a
// text scan; the bank is only read.
//
// ⚠ LOAD THIS MODULE WITH `import()` ONLY. It reaches the question bank (the chapter
// loader, the served pool), and the Practice Hub must stay bank-free in its static graph
// (src/config/bankReach.guard.test.ts). CbqChapterPicker imports it lazily, when the
// chooser opens.

import { ensureBankSubject } from "../../data/bankChapters/loader";
import { countCbqsByMarks, type CbqMarkCounts } from "../../lib/cbq/cbqClassification";
import { resolveTopicDisplayName, resolveTopicKey } from "../../utils/topicResolver";
import { buildCbqPracticePool, type SubjectKey } from "./practiceQuestionBuilder";

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
 * The chapter's served CBQs per mark value (every mark, via `isCbq`). Its chapter must
 * already be loaded (see `chaptersWithCbqs`, which loads the subject first).
 */
export function chapterCbqCounts(subject: SubjectKey, slug: string): CbqMarkCounts {
  const label = practiceTopicLabel(subject, slug);
  if (!label || label.toLowerCase() === "generic") return countCbqsByMarks([]);
  return countCbqsByMarks(buildCbqPracticePool({ subjectKey: subject, topicKey: label }));
}

/** True when the chapter has at least one real CBQ (of any mark value). */
export function chapterHasCbqs(subject: SubjectKey, slug: string): boolean {
  return chapterCbqCounts(subject, slug).total > 0;
}

/** Load the subject's chapters, then return the slugs (of `slugs`) that have real CBQs. */
export async function chaptersWithCbqs(
  subject: SubjectKey,
  slugs: readonly string[],
): Promise<Set<string>> {
  await ensureBankSubject(subject);
  return new Set(slugs.filter((slug) => chapterHasCbqs(subject, slug)));
}
