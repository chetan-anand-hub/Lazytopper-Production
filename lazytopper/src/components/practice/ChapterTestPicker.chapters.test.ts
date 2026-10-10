import { describe, it, expect } from "vitest";
// The draw reads the bank's per-chapter cache synchronously, so every chapter is preloaded.
import "../../test/preloadBankChapters";
import { matchPath } from "react-router-dom";
import { chapterTestLandingPath } from "./ChapterTestPicker";
import { desktopTopicsBySubject } from "../../lib/desktop/topics";
import { drawChapterTest } from "../chapterTest/chapterTestBlueprint";
import { normalizeTopicKey, resolveTopicDisplayName } from "../../utils/topicResolver";
import { resolveCanonicalSlug } from "../../data/syllabus/canonicalTopicSlug";

/**
 * CT-ENTRY-1 — owner condition (DECISION 32a): "ensure the chapter test picker takes the
 * students to the correct chapter test, like CBQ does."
 *
 * For EVERY chapter the picker offers (26), follow the real path end to end:
 *   picker (subject, slug) → chapterTestLandingPath → the App's Chapter Test route params
 *   (App.tsx `/chapter-test/:grade/:subject/:topicKey`) → the page's own param handling
 *   (ChapterTestPage.tsx:148-153, mirrored below because the page keeps it private and is
 *   byte-identical in this lane) → drawChapterTest, the page's question selection.
 * Every drawn question must belong to that same chapter, and the set must be non-empty.
 */
const CHAPTER_TEST_ROUTE = "/chapter-test/:grade/:subject/:topicKey";

/** ChapterTestPage.tsx:95-97, verbatim. */
function subjectFromParam(raw: string): "Maths" | "Science" {
  return raw?.toLowerCase().includes("science") ? "Science" : "Maths";
}

const CHAPTERS = (["Maths", "Science"] as const).flatMap((subject) =>
  desktopTopicsBySubject(subject).map((t) => ({ subject, slug: t.slug, name: t.name })),
);

describe("CT-ENTRY-1 — the Chapter Test picker opens the RIGHT chapter's test (all chapters)", () => {
  it("offers all 26 chapters (13 Maths + 13 Science)", () => {
    expect(CHAPTERS).toHaveLength(26);
  });

  it.each(CHAPTERS)("$subject · $slug → that chapter's Chapter Test, every question from it", ({ subject, slug }) => {
    const url = new URL(chapterTestLandingPath(subject, slug), "https://www.lazytopper.com");
    const match = matchPath(CHAPTER_TEST_ROUTE, url.pathname);
    expect(match, `${url.pathname} does not reach the Chapter Test route`).not.toBeNull();

    const pageSubject = subjectFromParam(match!.params.subject ?? "");
    const rawTopicKey = match!.params.topicKey ?? "";
    const pageTopicKey = normalizeTopicKey(rawTopicKey) || rawTopicKey;
    expect(pageSubject).toBe(subject);
    expect(resolveCanonicalSlug(pageTopicKey)).toBe(slug);

    const draw = drawChapterTest({
      subject: pageSubject,
      topicKey: pageTopicKey,
      topicLabel: resolveTopicDisplayName(pageSubject, pageTopicKey),
      worksheetId: "ct-entry-1-pin",
      code: "CT-PIN",
      name: "pin",
      seed: 1,
      createdAt: "2026-10-10T00:00:00.000Z",
    });
    expect(draw.enoughQuestions).toBe(true);
    expect(draw.paper.questions.length).toBeGreaterThan(0);
    const offChapter = draw.paper.questions.filter((q) => resolveCanonicalSlug(q.topicKey) !== slug);
    expect(offChapter.map((q) => `${q.id}:${q.topicKey}`)).toEqual([]);
  });
});
