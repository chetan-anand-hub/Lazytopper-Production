import { describe, it, expect } from "vitest";
import { hpqTopicMatches, importantTargetFor } from "./importantTarget";
import { desktopTopicsBySubject } from "../../../lib/desktop/topics";

/**
 * GUIDE-PUBLIC-1 (review F5) — "Important questions for <Chapter>" is chapter-scoped only when
 * the HPQ page will match the chapter; otherwise it is the subject-level page (no `?topic`).
 */
describe("GUIDE-PUBLIC-1 · F5 · the important-questions target", () => {
  it("★ a slug the HPQ page cannot match → the SUBJECT-level link, no ?topic", () => {
    expect(hpqTopicMatches({ slug: "not-a-real-chapter-xyz", subject: "Maths" })).toBe(false);
    expect(importantTargetFor({ slug: "not-a-real-chapter-xyz", subject: "Maths" })).toBe("/highly-probable/10/Maths");
    expect(importantTargetFor({ slug: "zz-fake-slug", subject: "Science" })).toBe("/highly-probable/10/Science");
  });

  it("a matching chapter → the chapter-scoped link", () => {
    expect(importantTargetFor({ slug: "trigonometry", subject: "Maths" })).toBe("/highly-probable/10/Maths?topic=trigonometry");
    expect(importantTargetFor({ slug: "electricity", subject: "Science" })).toBe("/highly-probable/10/Science?topic=electricity");
  });

  it("★ pinned: every registry chapter of both subjects matches today (a drift in the HPQ data or the mirrored matcher shows here)", () => {
    for (const s of ["Maths", "Science"] as const) {
      const misses = desktopTopicsBySubject(s).filter((t) => !hpqTopicMatches({ slug: t.slug, subject: s })).map((t) => t.slug);
      expect(misses, s).toEqual([]);
    }
  });

  it("a chapter of the OTHER subject does not match by accident", () => {
    expect(hpqTopicMatches({ slug: "electricity", subject: "Maths" })).toBe(false);
  });
});
