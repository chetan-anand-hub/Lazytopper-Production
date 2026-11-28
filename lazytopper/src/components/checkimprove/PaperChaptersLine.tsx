/**
 * CI-READ-TOPICS-1 — the Answer Checker's whole-paper confirm step names EACH question's chapter
 * as soon as the paper is read, not only after grading.
 *
 * History (why this line exists): until SCORECARD-MI-1 (#935, 5 Oct 2026) the chip showed ONE
 * paper-level subject + chapter — the first question's — which was wrong for every other question
 * of a mixed paper (owner ruling B2: each question under ITS OWN subject and chapter). #935 removed
 * that line and said "each question's subject and chapter are read when it is graded", because the
 * per-question chapter reads (C&I PR-2, #416) ran only AFTER the grade. This lane runs those same
 * reads right after the paper is read, so the student sees each question's own chapter here.
 *
 * Honesty: a question whose chapter the read could not place says "chapter not sure" — never a
 * guess, never the paper's or the first question's chapter. Display only; it changes no grade.
 *
 * Styling is class-based (a scoped <style> block, the PaperMarksEditor convention) — CLAUDE.md §7.
 */
import type { PerQuestionTopic } from "../../utils/checkImproveDetection";

export const CHAPTER_NOT_SURE = "chapter not sure";

export interface ChapterGroup {
  /** The chapter's display name, or CHAPTER_NOT_SURE for questions the read could not place. */
  label: string;
  /** The question numbers in this chapter, in paper order. */
  questions: number[];
}

/** Group a paper's questions by their own resolved chapter, in the order each chapter first appears.
 *  Unplaced questions form ONE "chapter not sure" group, always last. Pure. */
export function groupQuestionsByChapter(
  questionNumbers: number[],
  topics: PerQuestionTopic[],
): ChapterGroup[] {
  const byQ = new Map(topics.map((t) => [t.qNumber, t]));
  const groups: ChapterGroup[] = [];
  const index = new Map<string, ChapterGroup>();
  const unsure: number[] = [];
  for (const n of questionNumbers) {
    const t = byQ.get(n);
    const name = t && t.topicSlug ? String(t.topicName || "").trim() : "";
    if (!name) {
      unsure.push(n);
      continue;
    }
    let g = index.get(name);
    if (!g) {
      g = { label: name, questions: [] };
      index.set(name, g);
      groups.push(g);
    }
    g.questions.push(n);
  }
  if (unsure.length > 0) groups.push({ label: CHAPTER_NOT_SURE, questions: unsure });
  return groups;
}

const CSS = `
.lt-pcl { font-size: 12.5px; color: hsl(220, 15%, 32%); margin-top: 6px; line-height: 1.5; }
.lt-pcl-muted { color: hsl(220, 15%, 45%); }
.lt-pcl-row { display: inline; }
.lt-pcl-row + .lt-pcl-row::before { content: " · "; color: hsl(220, 15%, 55%); }
.lt-pcl-name { font-weight: 600; }
.lt-pcl-unsure { font-style: italic; font-weight: 400; }
`;

/**
 * `topics` undefined → this read has no chapter lookup (the free check): the old line.
 * `topics` null → the lookup is running. An array → each question's own chapter.
 */
export default function PaperChaptersLine({
  questionNumbers,
  topics,
}: {
  questionNumbers: number[];
  topics: PerQuestionTopic[] | null | undefined;
}) {
  if (topics === undefined) {
    return (
      <span className="lt-pcl-muted" data-testid="ci-chapters-at-grade">
        {" · each question’s subject and chapter are read when it is graded"}
      </span>
    );
  }
  if (topics === null) {
    return (
      <>
        <style>{CSS}</style>
        <div className="lt-pcl lt-pcl-muted" data-testid="ci-chapters-loading">Finding each question’s chapter…</div>
      </>
    );
  }
  const groups = groupQuestionsByChapter(questionNumbers, topics);
  const single = groups.length === 1 && groups[0].label !== CHAPTER_NOT_SURE;
  return (
    <>
    <style>{CSS}</style>
    <div className="lt-pcl" data-testid="ci-chapters">
      {single ? "Chapter: " : "Chapters: "}
      {groups.map((g) => (
        <span className="lt-pcl-row" key={g.label}>
          <span className={g.label === CHAPTER_NOT_SURE ? "lt-pcl-name lt-pcl-unsure" : "lt-pcl-name"}>{g.label}</span>
          {single ? "" : ` (${g.questions.map((n) => `Q${n}`).join(", ")})`}
        </span>
      ))}
    </div>
    </>
  );
}
