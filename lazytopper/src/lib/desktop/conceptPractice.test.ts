// @vitest-environment node
/**
 * CONCEPT-MAP-FILL-1 PR-2 — Topic Hub concept cards ↔ concepts ↔ served rows.
 *
 *  P1  every `conceptKeys` entry on a card is a real concept of that chapter (Exam Trends or tracking), verbatim.
 *  P2  every tracking concept has exactly ONE card that stands for it — except the one named exemption.
 *  P3  a card's Practise ids are EXACTLY the served rows that resolve to its concept(s): nothing more, nothing less.
 *  P4  fewer than MIN_CONCEPT_PRACTISE_ROWS rows → no Practise (an honest note), never a padded set.
 *  P5  a card without `conceptKeys` keeps the old behaviour (legacy).
 */
import { describe, it, expect } from "vitest";
import { bankIndexEntries } from "../../data/bankChapters/bankIdIndex";
import { BANK_CHAPTER_SLUGS } from "../../data/bankChapters/chapterRegistry.generated";
import { EXAM_TRENDS_CONCEPTS, conceptForSubtopic } from "../../data/concepts/conceptLabelMap";
import { TRACKING_CONCEPTS } from "../../data/concepts/trackingConcepts";
import { allDesktopTopics } from "./topics";
import { buildActionableDesktopTopicHubContent, type BoardConcept } from "./topicHubContent";
import {
  CONCEPT_PRACTISE_MAX_COUNT,
  MIN_CONCEPT_PRACTISE_ROWS,
  conceptBankIds,
  conceptPractiseTarget,
} from "./conceptPractice";

/** Tracking concepts that deliberately have NO Topic Hub card, with the reason. */
const NO_CARD: Record<string, string> = {
  "triangles/Right-Triangle Lengths (a² + b² = c² as a tool)":
    "topicHubContent.syllabus.test.ts T1 keeps the Triangles hub free of Pythagoras content (deleted from the 2026-27 syllabus); the concept still rolls up on Me / the Tutor brief / Weak Area Practice.",
};

type Card = { chapter: string; card: BoardConcept };
const cards: Card[] = [];
for (const t of allDesktopTopics()) {
  const hub = buildActionableDesktopTopicHubContent(t.slug);
  if (!hub || hub.isSamplePreview) continue;
  for (const card of hub.boardEssentials) cards.push({ chapter: t.slug, card });
}
const keyed = cards.filter((c) => c.card.conceptKeys && c.card.conceptKeys.length > 0);

const vocabulary = (ch: string): string[] => [
  ...(EXAM_TRENDS_CONCEPTS[ch as keyof typeof EXAM_TRENDS_CONCEPTS] ?? []),
  ...(TRACKING_CONCEPTS[ch as keyof typeof TRACKING_CONCEPTS] ?? []),
];

describe("P1 — conceptKeys are real concepts of the card's own chapter", () => {
  it("there are keyed cards to check (the suite is not vacuous)", () => {
    expect(keyed.length).toBeGreaterThanOrEqual(30);
  });

  it.each(keyed.map((c) => [c.chapter, c.card.name, c.card.conceptKeys!] as const))(
    "%s / %s",
    (ch, _name, keys) => {
      for (const k of keys) expect(vocabulary(ch), `${ch}: ${k}`).toContain(k);
    },
  );

  it("CONTROL: a misspelt key is caught by the same check", () => {
    expect(vocabulary("metals-and-non-metals")).not.toContain("Alloy");
    expect(vocabulary("metals-and-non-metals")).toContain("Alloys");
  });
});

describe("P2 — every tracking concept is one card's concept, once", () => {
  const owners = new Map<string, string[]>();
  for (const { chapter, card } of keyed)
    for (const k of card.conceptKeys!) owners.set(`${chapter}/${k}`, [...(owners.get(`${chapter}/${k}`) ?? []), card.name]);

  const tracking = BANK_CHAPTER_SLUGS.flatMap((ch) => TRACKING_CONCEPTS[ch].map((n) => `${ch}/${n}`));

  it.each(tracking)("%s", (id) => {
    if (NO_CARD[id]) {
      expect(owners.get(id), `${id} is exempt (${NO_CARD[id]}) but a card claims it`).toBeUndefined();
      return;
    }
    expect(owners.get(id)?.length, `${id}: exactly one card`).toBe(1);
  });

  it("no Exam Trends or tracking concept is claimed by two cards (no duplicate cards)", () => {
    for (const [id, names] of owners) expect(names.length, `${id}: ${names.join(" | ")}`).toBe(1);
  });
});

describe("P3 — a keyed card's Practise ids are exactly the concept's served rows", () => {
  it.each(keyed.map((c) => [c.chapter, c.card.name, c.card.conceptKeys!] as const))("%s / %s", (ch, _name, keys) => {
    const ids = conceptBankIds(ch, keys);
    // brute force, written independently of conceptBankIds
    const want: string[] = [];
    for (const [id, meta] of bankIndexEntries()) {
      const concept = meta.topicKey === ch ? conceptForSubtopic(ch, meta.subtopic.trim()) : undefined;
      if (concept !== undefined && keys.includes(concept)) want.push(id);
    }
    expect(ids).toEqual(want);
    expect(ids.length).toBeGreaterThanOrEqual(MIN_CONCEPT_PRACTISE_ROWS);
  });

  it("exact set: a different chapter's rows and an unrelated concept's rows are NOT included", () => {
    const alloys = new Set(conceptBankIds("metals-and-non-metals", ["Alloys"]));
    const ionic = conceptBankIds("metals-and-non-metals", ["Formation and Properties of Ionic Compounds"]);
    expect(alloys.size).toBeGreaterThan(0);
    for (const id of ionic) expect(alloys.has(id)).toBe(false);
    for (const [id, meta] of bankIndexEntries()) if (alloys.has(id)) expect(meta.topicKey).toBe("metals-and-non-metals");
  });

  it("the target is `exact` with count = the whole set up to Practice's own cap", () => {
    const card = cards.find((c) => c.chapter === "metals-and-non-metals" && c.card.name === "Alloys")!.card;
    const t = conceptPractiseTarget("metals-and-non-metals", card);
    expect(t.kind).toBe("exact");
    if (t.kind === "exact") expect(t.count).toBe(Math.min(t.ids.length, CONCEPT_PRACTISE_MAX_COUNT));
    const big = cards.find((c) => c.chapter === "carbon-and-its-compounds" && c.card.name.startsWith("Covalent bonds"))!.card;
    const tb = conceptPractiseTarget("carbon-and-its-compounds", big);
    if (tb.kind === "exact") expect(tb.count).toBeLessThanOrEqual(CONCEPT_PRACTISE_MAX_COUNT);
  });
});

describe("P4 / P5 — too few rows, and the legacy card", () => {
  it("a concept with fewer than the minimum served rows has no Practise (too-few), never a padded set", () => {
    const fake: BoardConcept = { name: "x", oneLineUse: "x", marks: "1–2", conceptKeys: ["Not A Concept"] };
    expect(conceptPractiseTarget("metals-and-non-metals", fake)).toEqual({ kind: "too-few", rows: 0 });
  });

  it("a card without conceptKeys is legacy (unchanged behaviour)", () => {
    const legacy: BoardConcept = { name: "Reactivity series", oneLineUse: "x", marks: "1–3" };
    expect(conceptPractiseTarget("metals-and-non-metals", legacy)).toEqual({ kind: "legacy" });
    expect(conceptPractiseTarget("metals-and-non-metals", { ...legacy, conceptKeys: [] })).toEqual({ kind: "legacy" });
  });
});
