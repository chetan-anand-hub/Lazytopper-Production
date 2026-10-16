// WEAK-AREA-DIRECT — a concept "Practise" (Me's By-concept rows, Quick Practice's "My weak areas"
// card) opens a Quick Practice SET on that concept: /practice/10/<Subject>?topic=<chapter>&focus=..
// &subtopicHint=.. (the tutor's concept-focus path PracticePage already reads), never the generic
// /practice-hub picker, which ignores `focus` (the live defect on 998ab2a3).

import { describe, it, expect } from "vitest";
import { computeMeHomeSummary, meChapterPractisePath, meConceptPractisePath } from "./meHomeSummary";
import { weakAreasCardFrom } from "../components/practice/weakAreasCard";
import type { RungTrend } from "./progressStore";

const FTA = "Fundamental Theorem of Arithmetic";

const parse = (href: string) => {
  const u = new URL(href, "https://x.test");
  return { path: u.pathname, q: u.searchParams };
};

describe("meConceptPractisePath — the concept's own Quick Practice set", () => {
  it("chapter known: /practice/10/Maths with topic + focus + subtopicHint, Back to Me", () => {
    const href = meConceptPractisePath("Maths", { label: FTA, chapter: "real-numbers" });
    const { path, q } = parse(href);
    expect(path).toBe("/practice/10/Maths");
    expect(q.get("topic")).toBe("real-numbers");
    expect(q.get("focus")).toBe(FTA);
    expect(q.get("subtopicHint")).toBe(FTA);
    expect(q.get("source")).toBe("me");
    expect(q.get("returnTo")).toBe("/me");
    expect(href).not.toContain("/practice-hub");
  });

  it("a row's chapter in another spelling still resolves to the board slug", () => {
    const { q } = parse(meConceptPractisePath("Science", { label: "Alloys", chapter: "Metals and Non-metals" }));
    expect(q.get("topic")).toBe("metals-and-non-metals");
    expect(q.get("focus")).toBe("Alloys");
  });

  it("no chapter: the subject's Quick Practice page, no focus, never the hub", () => {
    const href = meConceptPractisePath("Maths", { label: "Some unmapped subtopic" });
    const { path, q } = parse(href);
    expect(path).toBe("/practice/10/Maths");
    expect(q.get("focus")).toBeNull();
    expect(q.get("topic")).toBeNull();
    expect(q.get("returnTo")).toBe("/me");
    expect(href).not.toContain("/practice-hub");
  });

  it("an unresolvable chapter, or one from the other paper, takes the same fallback", () => {
    for (const chapter of ["not-a-chapter", "metals-and-non-metals"]) {
      const { path, q } = parse(meConceptPractisePath("Maths", { label: FTA, chapter }));
      expect(path).toBe("/practice/10/Maths");
      expect(q.get("focus")).toBeNull();
      expect(q.get("topic")).toBeNull();
    }
  });
});

describe("Me's rows and the Quick Practice card share the builder", () => {
  const rung = (key: string, label: string, extra: Record<string, unknown> = {}): RungTrend =>
    ({
      key,
      label,
      accuracyNow: 0.4,
      accuracyBefore: null,
      sampleNow: 4,
      sampleBefore: 0,
      marksScored: 4,
      marksAvailable: 10,
      ...extra,
    }) as unknown as RungTrend;

  it("computeMeHomeSummary: a concept row carries its chapter and Me's concept-set href", () => {
    const summary = computeMeHomeSummary(
      { progress: { subjects: [] } } as never,
      "Maths",
      { topics: [], concepts: [rung(`real-numbers|${FTA}`, FTA, { chapter: "real-numbers" })] } as never,
      { entries: [], byChapter: {} },
    );
    const row = summary.concepts[0];
    expect(row?.chapter).toBe("real-numbers");
    expect(row?.practisePath).toBe(meConceptPractisePath("Maths", { label: FTA, chapter: "real-numbers" }));
    expect(parse(row!.practisePath).path).toBe("/practice/10/Maths");
  });

  it("the QP card: same builder, Back returns to the practice page it was opened from", () => {
    const rows = [{ key: "k", label: FTA, lost: 5, chapter: "real-numbers", practisePath: "/ignored" }];
    const here = "/practice/10/Maths?topic=real-numbers&source=practice";
    const card = weakAreasCardFrom(true, rows, { paper: "Maths", returnTo: here });
    expect(card.kind).toBe("live");
    if (card.kind !== "live") return;
    expect(card.href).toBe(meConceptPractisePath("Maths", rows[0], { returnTo: here }));
    const { path, q } = parse(card.href);
    expect(path).toBe("/practice/10/Maths");
    expect(q.get("topic")).toBe("real-numbers");
    expect(q.get("focus")).toBe(FTA);
    expect(q.get("returnTo")).toBe(here);
    // Never `source=practice`: that value lands on the preset chooser, not a built set.
    expect(q.get("source")).not.toBe("practice");
  });

  it("chapter Practise (Me's Start-here, Home) already opens the chapter's Quick Practice page", () => {
    const href = meChapterPractisePath({ slug: "real-numbers", subject: "Maths", label: "Real Numbers" });
    const { path, q } = parse(href);
    expect(path).toBe("/practice/10/Maths");
    expect(q.get("topic")).toBe("real-numbers");
    expect(q.get("returnTo")).toBe("/me");
  });
});
