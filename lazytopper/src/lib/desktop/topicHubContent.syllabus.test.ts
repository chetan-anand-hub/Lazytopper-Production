/**
 * SYLLABUS-FIX-CONTENT PR-2 — the Topic Hub rows and the served notes follow the CBSE
 * 2026-27 syllabus (Maths_SecP1X_2026-27 p.6, Science_SecP1_2026-27 p.5-6).
 *
 *  T1  Triangles + Coordinate Geometry hubs carry no area-ratio, Pythagoras-theorem or
 *      area-of-a-triangle row (deleted from the 2026-27 Maths syllabus).
 *  T2  The Human Eye note and hub carry no "colour of the Sun at sunrise and sunset"
 *      teaching (the syllabus line says "excluding" it). Advance sunrise / delayed sunset
 *      (atmospheric REFRACTION) stays — it is IN.
 *  T3  The IN topics the PR writes are present: Heights and Distances (trigonometry),
 *      AC vs DC + domestic circuits (magnetic effects), the proof of Theorem 10.1 (circles).
 *
 * Every negative assertion is paired with a CONTROL that proves the matcher can fire on
 * the text it would have to catch, so a vacuous pass is impossible.
 */
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { buildActionableDesktopTopicHubContent } from "./topicHubContent";

const SPEC_DIR = path.resolve(__dirname, "../../../../notes/specs");
const readSpec = (slug: string): Record<string, unknown> =>
  JSON.parse(fs.readFileSync(path.join(SPEC_DIR, `${slug}.json`), "utf8"));
const specText = (slug: string): string => JSON.stringify(readSpec(slug));

const hub = (slug: string) => {
  const content = buildActionableDesktopTopicHubContent(slug);
  if (!content) throw new Error(`no Topic Hub content for ${slug}`);
  if (content.isSamplePreview) throw new Error(`${slug} is not seeded — test would be vacuous`);
  return content;
};
const hubText = (slug: string): string => {
  const c = hub(slug);
  return JSON.stringify({
    topicSnapshot: c.topicSnapshot,
    boardEssentials: c.boardEssentials,
    formulaUsePreview: c.formulaUsePreview,
    fullFormulaUseMap: c.fullFormulaUseMap,
    commonMistake: c.commonMistake,
    examinerWarning: c.examinerWarning,
  });
};
const rowNames = (slug: string): string[] => hub(slug).boardEssentials.map((r) => r.name);

// ── T1 ────────────────────────────────────────────────────────────────────
const AREA_RATIO = /areas? of similar triangles|area ratio|ratio of (the )?areas/i;
const PYTHAGORAS_THEOREM = /pythagoras('s)? theorem|a² \+ b² = c²|converse of pythagoras/i;
const AREA_OF_TRIANGLE = /area of (a )?triangle|area[- ]from[- ]coordinates|½ \|x₁/i;

describe("T1 — Triangles and Coordinate Geometry hubs teach no deleted area / Pythagoras topic", () => {
  it("CONTROL: the matchers fire on the rows that used to be served", () => {
    expect(AREA_RATIO.test("Areas of similar triangles ∝ (sides)²")).toBe(true);
    expect(PYTHAGORAS_THEOREM.test("Pythagoras theorem (a² + b² = c²)")).toBe(true);
    expect(AREA_OF_TRIANGLE.test("Area of a triangle from coordinates")).toBe(true);
    expect(AREA_OF_TRIANGLE.test("Sections B/C — distance formula, section formula and area-from-coordinates.")).toBe(true);
  });

  it("Triangles hub: no area-ratio and no Pythagoras-theorem content anywhere", () => {
    const text = hubText("triangles");
    expect(text).not.toMatch(AREA_RATIO);
    expect(text).not.toMatch(PYTHAGORAS_THEOREM);
  });

  it("Coordinate Geometry hub: no area-of-a-triangle content anywhere", () => {
    expect(hubText("coordinate-geometry")).not.toMatch(AREA_OF_TRIANGLE);
  });

  it("the IN rows of both hubs are still served (the hubs were not emptied)", () => {
    expect(rowNames("triangles").some((n) => /Basic Proportionality Theorem/.test(n))).toBe(true);
    expect(rowNames("coordinate-geometry").some((n) => /Distance formula/.test(n))).toBe(true);
    expect(rowNames("coordinate-geometry").some((n) => /Section formula/.test(n))).toBe(true);
  });
});

// ── T2 ────────────────────────────────────────────────────────────────────
const SUN_REDDENING =
  /redden|red sun|sun (looks|appears|is seen) red|sun red|colour of the sun|red(dish)? (at|during) sunrise|sun red at sunrise/i;

describe("T2 — Human Eye note and hub carry no sunrise/sunset reddening of the Sun", () => {
  it("CONTROL: the matcher fires on the removed teaching lines", () => {
    expect(SUN_REDDENING.test("the blue of the sky and the red Sun at sunrise and sunset")).toBe(true);
    expect(SUN_REDDENING.test("the Sun looks red at sunrise and sunset")).toBe(true);
    expect(SUN_REDDENING.test("Scattering (blue sky, reddening of the sun)")).toBe(true);
    expect(SUN_REDDENING.test("Red Sun at sunrise/sunset")).toBe(true);
    // and does NOT fire on IN content (atmospheric refraction, danger signals)
    expect(SUN_REDDENING.test("Advance sunrise, delayed sunset (~2 min)")).toBe(false);
    expect(SUN_REDDENING.test("red is scattered least, so danger signals are red")).toBe(false);
  });

  it("the Human Eye note spec has no reddening teaching", () => {
    expect(specText("human-eye-and-colourful-world")).not.toMatch(SUN_REDDENING);
  });

  it("the Human Eye Topic Hub has no reddening teaching", () => {
    expect(hubText("human-eye-and-colourful-world")).not.toMatch(SUN_REDDENING);
  });

  it("scattering itself (IN) is still taught in the note", () => {
    expect(specText("human-eye-and-colourful-world")).toMatch(/sky is blue/i);
  });
});

// ── T3 ────────────────────────────────────────────────────────────────────
type Concept = { id: string; title: string; body: string };
const concepts = (slug: string): Concept[] => (readSpec(slug).concepts as Concept[]) ?? [];

describe("T3 — the missing 2026-27 IN topics are written", () => {
  it("trigonometry note: a Heights and Distances concept exists with elevation/depression", () => {
    const c = concepts("trigonometry").find((x) => /heights and distances/i.test(x.title));
    expect(c, "Heights and Distances concept").toBeDefined();
    expect(c!.body).toMatch(/elevation/i);
    expect(c!.body).toMatch(/depression/i);
  });

  it("trigonometry hub: the Heights & distances row exists", () => {
    expect(rowNames("trigonometry").some((n) => /Heights & distances/i.test(n))).toBe(true);
  });

  it("magnetic-effects note: AC vs DC and domestic-circuit concepts exist", () => {
    const titles = concepts("magnetic-effects-of-electric-current").map((x) => x.title);
    expect(titles.some((t) => /direct current and alternating current/i.test(t))).toBe(true);
    expect(titles.some((t) => /domestic electric circuits/i.test(t))).toBe(true);
    expect(specText("magnetic-effects-of-electric-current")).toMatch(/50 Hz/);
  });

  it("magnetic-effects hub: AC/DC and domestic-circuit rows exist", () => {
    const names = rowNames("magnetic-effects-of-electric-current");
    expect(names.some((n) => /alternating current/i.test(n))).toBe(true);
    expect(names.some((n) => /Domestic electric circuits/i.test(n))).toBe(true);
  });

  it("circles note: the Proof tab carries the proof of Theorem 10.1", () => {
    const third = readSpec("circles").third_tab_content as { kind: string; steps: { claim: string }[] };
    expect(third.kind).toBe("proof");
    expect(third.steps.some((s) => /Theorem 10\.1/.test(s.claim))).toBe(true);
  });
});

// ── T4 (owner rulings on PR-2) ───────────────────────────────────────────
import { conceptFigureCatalogue } from "../../pages/tutor/conceptVisualCatalogue.data";

describe("T4 — owner rulings: catalogue carries no OUT concept; applications row sits under Light", () => {
  const OUT_LABEL = new RegExp(
    [AREA_RATIO.source, PYTHAGORAS_THEOREM.source, AREA_OF_TRIANGLE.source, SUN_REDDENING.source].join("|"),
    "i",
  );

  it("CONTROL: the combined matcher fires on each label the catalogue used to carry", () => {
    for (const l of [
      "Areas of similar triangles ∝ (sides)²",
      "Pythagoras theorem (a² + b² = c²)",
      "Area of a triangle from coordinates",
      "Scattering of light (Tyndall effect, blue sky, reddening of the sun)",
    ]) expect(OUT_LABEL.test(l), l).toBe(true);
  });

  it("no tutor-catalogue row is labelled with an OUT concept", () => {
    expect(conceptFigureCatalogue.length).toBeGreaterThan(0);
    // Scoped to the chapters the OUT topics belong to: "area of triangle" inside a circle SEGMENT
    // (areas-related-to-circles) is IN and must not trip the guard.
    const SCOPE = new Set(["triangles", "coordinate-geometry", "human-eye-and-colourful-world"]);
    const bad = conceptFigureCatalogue
      .filter((r) => SCOPE.has(r.topicKey) && OUT_LABEL.test(r.conceptLabel))
      .map((r) => r.conceptLabel);
    expect(bad).toEqual([]);
  });

  it("'Applications of spherical mirrors and lenses' is a Light row, not a Human Eye row", () => {
    expect(rowNames("light-reflection-and-refraction").some((n) => /^Applications of spherical mirrors and lenses/.test(n))).toBe(true);
    expect(rowNames("human-eye-and-colourful-world").some((n) => /Applications of spherical mirrors/.test(n))).toBe(false);
  });

  it("the trig hub row keeps the trunk name and carries the LIMIT words in its description", () => {
    const row = hub("trigonometry").boardEssentials.find((r) => r.name === "Heights & distances setup (angle of elevation / depression)");
    expect(row).toBeDefined();
    expect(row!.oneLineUse).toMatch(/only 30°, 45°, 60°; at most two right triangles/);
  });

  it("the coordinate-geometry examiner warning no longer mentions area", () => {
    expect(hub("coordinate-geometry").examinerWarning).not.toMatch(/area|units²/i);
  });
});
