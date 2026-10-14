// @vitest-environment node
/**
 * PYTHAGORAS-HUB-2 — what a student SEES on the Triangles topic hub must not teach content ruled OUT for 2026-27:
 * Pythagoras / its converse as a concept (owner ruling 1), the area-of-similar-triangles theorem and the Angle Bisector
 * Theorem (D245). BPT, converse of BPT (statements) and a² + b² = c² as a numeric tool stay IN.
 */
import { describe, it, expect } from "vitest";
import { topicHubContent } from "./topicHubContent";
import { topicHubV2Content } from "./topicHubV2Full";
import { topicHubV2Enrichment } from "./topicHubV2Enrichment";
import { trianglesGuidedMindmap } from "./trianglesGuidedMindmap";
import { trianglesTopicHubPack } from "./geminiTopicHubPacks/trianglesTopicHubPack";
import { MATHS_VISUALS, findVisualForQuestion } from "./visualConceptRegistry";

function strings(v: unknown, acc: string[] = []): string[] {
  if (typeof v === "string") acc.push(v);
  else if (Array.isArray(v)) v.forEach((x) => strings(x, acc));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => strings(x, acc));
  return acc;
}

/** The ruled-OUT patterns. "pythag" is OK only in the identity/trig sense, which never appears in Triangles content. */
export const OUT_PATTERNS: RegExp[] = [
  /pythag/i,
  /converse of (the )?right/i,
  /areas? (ratio|of (two )?similar)/i,
  /ratio of (the |their )?areas/i,
  /ratios? of areas/i,
  /area ratio/i,
  /bisector/i,
];
const offenders = (blob: unknown) => strings(blob).filter((s) => OUT_PATTERNS.some((re) => re.test(s)));

const trianglesHubSurfaces: Record<string, unknown> = {
  "topicHubContent[triangles]": topicHubContent.find((b) => b.topicKey === "triangles"),
  "topicHubV2Full[triangles]": (topicHubV2Content as Record<string, unknown>)["triangles"],
  "topicHubV2Enrichment[triangles]": (topicHubV2Enrichment as Record<string, unknown>)["triangles"],
  trianglesGuidedMindmap,
  trianglesTopicHubPack,
  "visualConceptRegistry[triangles]": MATHS_VISUALS.filter((c) => c.chapterKey === "Triangles").map((c) => c.concepts.map((x) => x.title)),
};

describe("PYTHAGORAS-HUB-2: the Triangles hub shows nothing ruled OUT", () => {
  for (const [name, blob] of Object.entries(trianglesHubSurfaces)) {
    it(`${name}: no Pythagoras / converse concept, area-of-similar-triangles or angle-bisector content`, () => {
      expect(blob).toBeTruthy();
      expect(strings(blob).length).toBeGreaterThan(1); // not vacuous: the surface exists and has text
      expect(offenders(blob)).toEqual([]);
    });
  }

  it("CONTROL: the patterns DO catch the content that was removed", () => {
    const removed = [
      "Pythagoras theorem and converse.",
      "Memorise statement + rough idea of proof of BPT, its converse, and Pythagoras theorem.",
      "Properties of similar triangles: ratio of corresponding sides = ratio of perimeters = ratio of areas (squared).",
      "Mixing up area ratio with side ratio (forgetting square).",
      "Using the Angle Bisector theorem to find segment lengths",
      "Pythagoras Theorem Visual Proof",
      "Areas of Similar Triangles",
    ];
    for (const s of removed) expect(offenders([s]), s).toHaveLength(1);
  });

  it("CONTROL: what stays IN is not caught (BPT, converse of BPT as a statement, a² + b² = c² as a tool)", () => {
    const kept = [
      "Memorise the statement of BPT and its converse, and the proof of BPT.",
      "Basic proportionality theorem (Thales theorem) and converse.",
      "Use a² + b² = c² as a numeric tool to find a missing side of a right‑angled triangle.",
      "Relate the ratios of corresponding sides of similar triangles to the ratio of their perimeters.",
    ];
    for (const s of kept) expect(offenders([s]), s).toEqual([]);
    // and those lines really are present in the live content
    const live = strings(trianglesHubSurfaces).join("\n");
    expect(live).toContain("Memorise the statement of BPT and its converse, and the proof of BPT.");
    expect(live).toContain("a² + b² = c² as a numeric tool");
  });

  it("the Triangles visual registry still lists the in-syllabus concepts (similarity, BPT) and returns no Pythagoras / area visual", () => {
    const titles = MATHS_VISUALS.filter((c) => c.chapterKey === "Triangles").flatMap((c) => c.concepts.map((x) => x.title));
    expect(titles).toEqual(expect.arrayContaining(["Similar Triangles and Criteria", "Basic Proportionality Theorem"]));
    expect(titles.some((t) => /pythag|similar triangles$/i.test(t) && !/criteria/i.test(t))).toBe(false);
  });

  it("the mind map and pack stay well-formed: no dangling edges, every guided node has a core entry, order lists only real nodes", () => {
    const ids = new Set(trianglesTopicHubPack.mindMap.nodes.map((n) => n.id as string));
    expect(trianglesTopicHubPack.mindMap.edges.filter((e) => !ids.has(e.from) || !ids.has(e.to))).toEqual([]);
    const gids = new Set(trianglesGuidedMindmap.nodes.map((n) => n.id));
    expect(trianglesGuidedMindmap.recommendedOrder.filter((i) => !gids.has(i))).toEqual([]);
    expect([...gids].filter((i) => !(i in trianglesGuidedMindmap.coreByNodeId))).toEqual([]);
    expect([...gids].filter((i) => !(i in trianglesGuidedMindmap.coreIdByNodeId))).toEqual([]);
  });

  it("findVisualForQuestion returns NO visual (not the chapter's first one) when nothing in Triangles matches, so a bank row pointing at a removed visual id gets none", () => {
    // a question about the Pythagoras relation or area ratio: the removed visuals must not come back through the fallback
    expect(findVisualForQuestion("Find hypotenuse for legs six eight.", "triangles", "Maths")).toBeNull();
    expect(findVisualForQuestion("What is the ratio of the areas of two similar triangles?", "triangles", "Maths")?.title ?? null).not.toMatch(/pythag|areas of similar/i);
    expect(findVisualForQuestion("Prove something unrelated xyzzy plugh", "triangles", "Maths")).toBeNull();
    expect(findVisualForQuestion("What is the ratio of the areas of two similar triangles?", "triangles", "Maths")?.title).not.toBe("Areas of Similar Triangles");
  });

  it("CONTROL: a Basic Proportionality Theorem question still gets the BPT visual", () => {
    expect(findVisualForQuestion("State and use the basic proportionality theorem thales for a line parallel to BC", "triangles", "Maths")?.title).toBe("Basic Proportionality Theorem");
  });
});
