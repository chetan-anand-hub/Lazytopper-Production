// @vitest-environment node
/**
 * PYTHAGORAS-HUB-1 — owner ruling 1 (src/config/syllabus2026-27.ts r1): Pythagoras as a numeric TOOL is IN; stating or
 * proving it or its converse, or teaching it as a Class-X concept, is OUT. The Triangles topic hub must not teach it
 * (concept cards, objectives, mind-map nodes, a formula card named after the theorem, a video about it).
 */
import { describe, it, expect } from "vitest";
import { trianglesTopicHubPack } from "./trianglesTopicHubPack";

interface LoosePack {
  definitions: { title: string }[];
  competencies: { title: string; detail: string }[];
  workedExamples: { id: string; question: string; finalAnswer: string }[];
  formulae: { id: string; title: string; formula: string }[];
  videos: { id: string }[];
  mindMap: { nodes: { id: string }[]; edges: { from: string; to: string }[] };
}
type Pack = LoosePack;
/** The pack is `as const`; the checks compare against ids that no longer exist, so read it through a loose shape. */
const pack = trianglesTopicHubPack as unknown as Pack;

function strings(v: unknown, acc: string[] = []): string[] {
  if (typeof v === "string") acc.push(v);
  else if (Array.isArray(v)) v.forEach((x) => strings(x, acc));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => strings(x, acc));
  return acc;
}
const teaches = (pack: unknown) => strings(pack).filter((s) => /pythag/i.test(s) || /converse of (the )?right/i.test(s));

describe("the Triangles topic hub does not teach Pythagoras or its converse as a concept (owner ruling 1)", () => {
  it("no string anywhere in the pack names the Pythagoras theorem or its converse", () => {
    expect(teaches(trianglesTopicHubPack)).toEqual([]);
  });

  it("CONTROL: the check does fail on the content it replaced", () => {
    const old = { definitions: [{ title: "Converse of Pythagoras" }], videos: [{ title: "Pythagoras Theorem and Its Converse | CBSE Class 10" }] };
    expect(teaches(old)).toHaveLength(2);
  });

  it("the numeric tool a² + b² = c² survives, as a tool (a competency, a worked example and a formula card)", () => {
    const comp = pack.competencies.find((c) => /numeric tool/i.test(c.title));
    expect(comp?.detail).toContain("a² + b² = c²");
    const we = pack.workedExamples.find((w) => w.id === "we3");
    expect(we?.question).toMatch(/Find AC/);
    expect(we?.finalAnswer).toBe("AC = 25 cm.");
    expect(25 ** 2).toBe(7 ** 2 + 24 ** 2); // the worked example's arithmetic
    const card = pack.formulae.find((f) => f.id === "for_pyth");
    expect(card?.formula).toContain("a² + b² = c²");
    expect(card?.title).toMatch(/numeric tool/i);
  });

  it("the converse formula card, the converse video and the two Pythagoras mind-map nodes are gone", () => {
    expect(pack.formulae.some((f) => f.id === "for_converse_pyth")).toBe(false);
    expect(pack.videos.some((v) => v.id === "vid3")).toBe(false);
    expect(pack.mindMap.nodes.some((n) => n.id === "n6" || n.id === "n7")).toBe(false);
  });

  it("the mind map stays well-formed: every edge joins two existing nodes (no dangling edge from the removed nodes)", () => {
    const check = (pack: Pack) => {
      const ids = new Set(pack.mindMap.nodes.map((n) => n.id));
      return pack.mindMap.edges.filter((e) => !ids.has(e.from) || !ids.has(e.to));
    };
    expect(check(pack)).toEqual([]);
    // CONTROL: a pack with a node removed but its edge left WOULD be caught
    const broken: Pack = { ...pack, mindMap: { ...pack.mindMap, nodes: pack.mindMap.nodes.filter((n) => n.id !== "n8") } };
    expect(check(broken).length).toBeGreaterThan(0);
  });

  it("the other hub content is untouched (BPT, similarity, angle bisector cards remain)", () => {
    const titles = pack.definitions.map((d) => d.title);
    expect(titles).toEqual(["Similar Figures", "Similar Triangles", "Basic Proportionality Theorem (BPT)", "Converse of BPT", "Similarity Criteria", "Angle Bisector Theorem"]);
    expect(pack.videos.map((v) => v.id)).toEqual(["vid1", "vid2", "vid4"]);
  });
});
