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
// (src/config/bankReach.guard.test.ts).
//
// SPEED-HUB-1 (6 Nov 2026): the chooser NO LONGER calls this at runtime. Opening it used to
// load every chapter of the subject (13 chapter chunks, ~5.5 MB of JS on a phone) and build
// each chapter's CBQ pool in one ~5 s main-thread task, just to mark "coming soon". The
// answer is now precomputed by THIS module's own rule into ./cbqChapters.generated.ts
// (`computeCbqChapterMap` + `renderCbqChaptersFile` below; generator
// scripts/generateCbqChapters.mjs; drift guard in cbqAvailability.test.ts), and the chooser
// reads that small file. The landing (PracticePage, preset=comp) still loads and checks the
// one chosen chapter itself.

import { ensureBankSubject } from "../../data/bankChapters/loader";
import { desktopTopicsBySubject } from "../../lib/desktop/topics";
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

/** The subjects the CBQ chooser lists (DesktopSubject). */
export const CBQ_CHAPTER_SUBJECTS = ["Maths", "Science"] as const satisfies readonly SubjectKey[];
export type CbqChapterMap = Record<(typeof CBQ_CHAPTER_SUBJECTS)[number], Record<string, boolean>>;

/**
 * SPEED-HUB-1 — the chooser's whole answer, computed with the runtime rule above over the
 * REAL bank: per subject, every chapter the chooser lists (desktopTopicsBySubject order) ->
 * whether it has at least one real CBQ. Tooling and the drift guard only.
 */
export async function computeCbqChapterMap(): Promise<CbqChapterMap> {
  const out = {} as CbqChapterMap;
  for (const subject of CBQ_CHAPTER_SUBJECTS) {
    const slugs = desktopTopicsBySubject(subject).map((t) => t.slug);
    const found = await chaptersWithCbqs(subject, slugs);
    const entry: Record<string, boolean> = {};
    for (const slug of slugs) entry[slug] = found.has(slug);
    out[subject] = entry;
  }
  return out;
}

/** The generated file's exact text (LF, chapter order = the chooser's list order). */
export function renderCbqChaptersFile(map: CbqChapterMap): string {
  const lines: string[] = [
    "// src/components/practice/cbqChapters.generated.ts",
    "//",
    "// GENERATED. DO NOT EDIT. Regenerate from `lazytopper/` with:",
    "//     node scripts/generateCbqChapters.mjs --write",
    "// Guarded by the SPEED-HUB-1 block of cbqAvailability.test.ts (equals the runtime computation",
    "// `chaptersWithCbqs` over the real bank, byte for byte).",
    "//",
    "// SPEED-HUB-1: per subject -> chapter slug -> true when the chapter has at least one real CBQ",
    "// (isCbq, over the pool Practice serves for preset=comp). The CBQ chooser marks a `false`",
    "// chapter \"coming soon\" with NO bank download; the bank is fetched only for the chosen chapter.",
    "",
    "export const CBQ_CHAPTERS = {",
  ];
  for (const subject of CBQ_CHAPTER_SUBJECTS) {
    lines.push(`  ${subject}: {`);
    for (const [slug, has] of Object.entries(map[subject])) lines.push(`    ${JSON.stringify(slug)}: ${has},`);
    lines.push("  },");
  }
  lines.push('} as const satisfies Record<"Maths" | "Science", Record<string, boolean>>;');
  lines.push("");
  return lines.join("\n");
}
