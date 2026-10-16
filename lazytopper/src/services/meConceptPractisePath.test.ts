// WEAK-AREA-DIRECT - a concept "Practise" (Me's By-concept rows, Quick Practice's "My weak areas"
// card) serves EXACTLY the concept's rows, or honestly the paper's whole set with no focus:
//   - the render-time href never names a concept (no `focus` without `focusBankIds`);
//   - the click resolves (lazily) the Topic Hub's exact path: focusBankIds + strictFocus + count,
//     every id one Me counts under the row's label (mapped concept, or unmapped subtopic);
//   - too few rows, or no chapter of this paper: the whole paper, no focus, never the hub.

import { describe, it, expect } from "vitest";
import { computeMeHomeSummary, meChapterPractisePath, meConceptPractisePath } from "./meHomeSummary";
import { weakAreasCardFrom } from "../components/practice/weakAreasCard";
import { resolveConceptSetPath } from "../lib/desktop/conceptSetPath";
import { bankIndexEntries } from "../data/bankChapters/bankIdIndex";
import { conceptForSubtopic } from "../data/concepts/conceptLabelMap";
import type { RungTrend } from "./progressStore";

const FTA = "Fundamental Theorem of Arithmetic";
const ME_BACK = "Back to Me / Progress";

const parse = (href: string) => {
  const u = new URL(href, "https://x.test");
  return { path: u.pathname, q: u.searchParams };
};
const meta = new Map([...bankIndexEntries()]);
/** The label Me files a bank row under: its concept when mapped, else its subtopic. */
const meLabelOf = (id: string): string | undefined => {
  const m = meta.get(id);
  if (!m) return undefined;
  const sub = m.subtopic.trim();
  return conceptForSubtopic(m.topicKey, sub) ?? sub;
};

describe("the render-time href never names a concept it does not serve", () => {
  it("Me's row href: the paper's whole set, no focus, Back to Me (query + context)", () => {
    const href = meConceptPractisePath(
      "Maths",
      { label: FTA, chapter: "real-numbers" },
      { source: "me", returnTo: "/me", backLabel: ME_BACK },
    );
    const { path, q } = parse(href);
    expect(path).toBe("/practice/10/Maths");
    if (q.get("focus") !== null) expect(q.get("focusBankIds")).not.toBeNull();
    expect(q.get("focus")).toBeNull();
    expect(q.get("subtopicHint")).toBeNull();
    expect(q.get("backLabel")).toBe(ME_BACK);
    expect(q.get("returnTo")).toBe("/me");
    expect(href).not.toContain("/practice-hub");
  });
});

describe("resolveConceptSetPath - the concept's EXACT set", () => {
  it("mapped concept (FTA in Real Numbers): focusBankIds + strictFocus, every id is FTA in Real Numbers", async () => {
    const href = await resolveConceptSetPath(
      "Maths",
      { label: FTA, chapter: "real-numbers" },
      { source: "me", returnTo: "/me", backLabel: ME_BACK },
    );
    const { path, q } = parse(href);
    expect(path).toBe("/practice/10/Maths");
    expect(q.get("topic")).toBe("real-numbers");
    expect(q.get("focus")).toBe(FTA);
    expect(q.get("strictFocus")).toBe("true");
    expect(q.get("subtopicHint")).toBeNull();
    expect(q.get("backLabel")).toBe(ME_BACK);
    const ids = (q.get("focusBankIds") ?? "").split(",").filter(Boolean);
    expect(ids.length).toBeGreaterThanOrEqual(5);
    expect(Number(q.get("count"))).toBe(Math.min(ids.length, 50));
    for (const id of ids) {
      expect(meta.get(id)?.topicKey, id).toBe("real-numbers");
      expect(meLabelOf(id), id).toBe(FTA);
    }
  });

  it("another spelling of the chapter resolves to the board slug", async () => {
    const { q } = parse(await resolveConceptSetPath("Maths", { label: FTA, chapter: "Real Numbers" }));
    expect(q.get("topic")).toBe("real-numbers");
    expect(q.get("strictFocus")).toBe("true");
  });

  it("unmapped subtopic row (Resistance in Electricity): exactly the rows whose subtopic is the label", async () => {
    const { q } = parse(await resolveConceptSetPath("Science", { label: "Resistance", chapter: "electricity" }));
    expect(q.get("topic")).toBe("electricity");
    expect(q.get("focus")).toBe("Resistance");
    const ids = (q.get("focusBankIds") ?? "").split(",").filter(Boolean);
    expect(ids.length).toBeGreaterThanOrEqual(5);
    for (const id of ids) {
      expect(meta.get(id)?.topicKey, id).toBe("electricity");
      expect(meLabelOf(id), id).toBe("Resistance");
    }
  });

  it("too few rows (2 x 'Sum and Product of Roots'): the whole paper, no focus", async () => {
    const href = await resolveConceptSetPath(
      "Maths",
      { label: "Sum and Product of Roots", chapter: "quadratic-equations" },
      { returnTo: "/me" },
    );
    const { path, q } = parse(href);
    expect(path).toBe("/practice/10/Maths");
    expect(q.get("focus")).toBeNull();
    expect(q.get("focusBankIds")).toBeNull();
    expect(q.get("topic")).toBeNull();
    expect(q.get("scope")).toBe("full-subject");
  });

  it("no chapter, an unknown chapter, or the other paper: the whole paper, no focus", async () => {
    for (const chapter of [undefined, "not-a-chapter", "metals-and-non-metals"]) {
      const { path, q } = parse(await resolveConceptSetPath("Maths", { label: FTA, chapter }));
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

  it("computeMeHomeSummary: a concept row carries its chapter and Me's concept href", () => {
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

  it("the QP card: honest href, and its click resolves the concept's exact set with Back to this page", async () => {
    const rows = [{ key: "k", label: FTA, lost: 5, chapter: "real-numbers", practisePath: "/ignored" }];
    const here = "/practice/10/Maths?topic=real-numbers&source=practice";
    const card = weakAreasCardFrom(true, rows, { paper: "Maths", returnTo: here });
    expect(card.kind).toBe("live");
    if (card.kind !== "live" || !card.open) throw new Error("card not live with a click target");
    expect(parse(card.href).q.get("focus")).toBeNull();
    const { path, q } = parse(await resolveConceptSetPath(card.open.paper, card.open.concept, card.open.ctx));
    expect(path).toBe("/practice/10/Maths");
    expect(q.get("topic")).toBe("real-numbers");
    expect(q.get("focus")).toBe(FTA);
    expect(q.get("strictFocus")).toBe("true");
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
