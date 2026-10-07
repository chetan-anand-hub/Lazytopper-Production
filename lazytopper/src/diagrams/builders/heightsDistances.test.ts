/**
 * DIAGRAMS-1 PR-2a — the heights-and-distances builder draws the QUESTION'S OWN
 * numbers, and its solved scene gives the question's OWN answer.
 *
 * Every assertion reads the DRAWN figure back through the recorded world -> view
 * transform: a drawn angle (atan2 of the drawn rays) must equal the given angle, a
 * drawn length must equal the given length, a label must show the given value.
 */
import { describe, expect, it } from "vitest";
import { angleBetweenDeg, dist, evalLengthExpr, prettyExpr } from "../figureGeometry";
import type { FigureSpec } from "../figureSpec";
import { ALL_COMPUTED_FIGURE_BINDINGS, buildComputedFigure } from "../registry";
import { buildHeightsDistances, withinCurriculum } from "./heightsDistances";
import type { HdParams } from "./heightsDistances";

const ANGLE_KEYS = ["theta", "far", "near", "left", "right", "lower", "upper", "top", "foot", "ground", "atLeftFoot", "atRightFoot"];
const LEN_KEYS = ["h", "d", "L", "eye", "gap", "dNear", "dFar", "total", "dLeft", "dRight", "h1", "h2", "len", "H1", "H2", "k", "H", "leftH", "rightH"];

/** Every geometric invariant of a drawn H&D figure, checked against its params. */
function assertDrawsItsOwnNumbers(spec: FigureSpec, p: HdParams): void {
  const P = spec.points;
  const t = spec.transform;
  // One uniform scale.
  expect(t.sx).toBe(t.sy);
  for (const el of spec.elements) {
    if (el.t === "seg" && el.role === "structure") expect(Math.abs(P[el.a].x - P[el.b].x)).toBeLessThan(1e-6);
    if (el.t === "seg" && el.role === "ground") expect(Math.abs(P[el.a].y - P[el.b].y)).toBeLessThan(1e-6);
    if (el.t === "right") expect(Math.abs(angleBetweenDeg(P[el.at], P[el.a], P[el.b]) - 90)).toBeLessThan(0.1);
    if (el.t === "angle") {
      // The drawn rays make exactly the angle the arc claims (atan2 of the drawn lines).
      expect(Math.abs(angleBetweenDeg(P[el.at], P[el.from], P[el.to]) - el.deg)).toBeLessThan(0.5);
    }
  }
  const rec = p as unknown as Record<string, unknown>;
  // Every GIVEN angle is drawn, at its value, labelled with its value.
  for (const k of ANGLE_KEYS) {
    const v = rec[k];
    if (typeof v !== "number") continue;
    const arcs = spec.elements.filter((e) => e.t === "angle" && e.deg === v && e.label === `${v}°`);
    expect(arcs.length, `angle ${k}=${v} is drawn and labelled`).toBeGreaterThan(0);
  }
  // Every GIVEN length is drawn at its true scaled length and labelled with its value.
  const scaleFree = rec.scaleFree === true;
  for (const k of LEN_KEYS) {
    const v = rec[k];
    if (typeof v !== "string") continue;
    const text = `${prettyExpr(v)} ${p.unit}`;
    const segs = spec.elements.filter((e) => e.t === "seg" && e.label?.text === text);
    expect(segs.length, `length ${k}=${v} is drawn and labelled "${text}"`).toBeGreaterThan(0);
    const want = evalLengthExpr(v);
    const ok = segs.some((e) => e.t === "seg" && Math.abs(dist(P[e.a], P[e.b]) / t.sx - want) / want < 0.005);
    expect(ok, `length ${k} drawn to scale`).toBe(true);
  }
  if (scaleFree) {
    // D6: no length carries a number.
    for (const e of spec.elements) if (e.t === "seg" && e.label) expect(e.label.text).not.toMatch(/\d/);
  }
  // Letters never repeat.
  const letters = spec.elements.flatMap((e) => (e.t === "label" ? [e.text] : []));
  expect(new Set(letters).size).toBe(letters.length);
}

function build(p: HdParams, labels = {}) {
  const r = buildHeightsDistances(p, labels);
  expect(r, `builds ${JSON.stringify(p)}`).not.toBeNull();
  assertDrawsItsOwnNumbers(r!.spec, p);
  return r!;
}

const near = (a: number, b: number, tolPct = 0.5) => Math.abs(a - b) / Math.abs(b) <= tolPct / 100;

describe("heights & distances — the design's sample rows", () => {
  it("T1 TRIG-N-NCERT-9-SA-001: d = 15 m, 60° -> h = 15√3 ≈ 25.98 m", () => {
    const r = build({ template: "single", view: "elevation", unit: "m", theta: 60, d: "15" }, { "q.h": "h" });
    expect(near(r.model.h, 25.98)).toBe(true);
    const labels = r.spec.elements.flatMap((e) => (e.t === "seg" && e.label ? [e.label.text] : []));
    expect(labels).toEqual(expect.arrayContaining(["15 m", "h"]));
  });
  it("T2 2026-TRIG-APP-01: 20 m building, depression 30° -> 34.6 m", () => {
    const r = build({ template: "single", view: "depression", unit: "m", theta: 30, h: "20" });
    expect(near(r.model.d, 34.6)).toBe(true);
    // A depression angle sits at the TOP, between the dashed horizontal and the sight line.
    const arc = r.spec.elements.find((e) => e.t === "angle");
    expect(arc && arc.t === "angle" && arc.at).toBe("top");
    expect(r.spec.elements.some((e) => e.t === "seg" && e.role === "horizontal-ref")).toBe(true);
  });
  it("T3 TRIG-N-NCERT-9-LA-003: eye 1.5 m, 30 m building, 30° -> 60° -> walked 19√3 ≈ 32.9 m", () => {
    const r = build({ template: "twoPointsSameSide", view: "elevation", unit: "m", far: 30, near: 60, h: "30", eye: "1.5" });
    expect(near(r.model.gap, 32.9)).toBe(true);
    expect(near(r.model.rise, 28.5)).toBe(true);
  });
  it("T4 LTG-M-TRIG-254: 12 m mast, 45° and 60° -> building 6(√3 + 1) ≈ 16.39 m", () => {
    const r = build({ template: "objectOnObject", unit: "m", lower: 45, upper: 60, len: "12" });
    expect(near(r.model.h1, 16.39)).toBe(true);
  });
  it("T5 PYQ-M-TRIG-009: opposite sides, 100 m, 60° and 30° -> h 43.3, BD 50, AC 75", () => {
    const r = build({ template: "twoPointsOppositeSides", view: "elevation", unit: "m", left: 60, right: 30, total: "100" });
    expect(near(r.model.h, 43.3)).toBe(true);
    expect(near(r.model.LLeft, 50)).toBe(true);
    expect(near(r.model.dRight, 75)).toBe(true);
  });
});

describe("heights & distances — one fixture per remaining template", () => {
  it("slant (ladder): 60°, 5 m -> 10 m ladder, 5√3 m high", () => {
    const r = build({ template: "slant", object: "ladder", unit: "m", theta: 60, d: "5" });
    expect(near(r.model.L, 10)).toBe(true);
    expect(near(r.model.h, 5 * Math.sqrt(3))).toBe(true);
  });
  it("slant (broken tree): 30°, 8 m -> total 8√3 m", () => {
    const r = build({ template: "slant", object: "broken-tree", unit: "m", theta: 30, d: "8" });
    expect(near(r.model.total, 8 * Math.sqrt(3))).toBe(true);
  });
  it("elevDepFromHeight: 12 m, 45° up, 30° down -> 12(1 + √3) m", () => {
    const r = build({ template: "elevDepFromHeight", unit: "m", H1: "12", top: 45, topView: "elevation", foot: 30 });
    expect(near(r.model.H2, 12 * (1 + Math.sqrt(3)))).toBe(true);
  });
  it("elevDepFromHeight (shorter house): 60 m tower, depressions 30° (top) and 60° (foot) -> 40 m", () => {
    const r = build({ template: "elevDepFromHeight", unit: "m", H1: "60", top: 30, topView: "depression", foot: 60 });
    expect(near(r.model.H2, 40)).toBe(true);
  });
  it("twoVerticalPoints: 60° from P, 45° from Q 10 m above -> 15 + 5√3 m", () => {
    const r = build({ template: "twoVerticalPoints", unit: "m", ground: 60, upper: 45, k: "10" });
    expect(near(r.model.H, 15 + 5 * Math.sqrt(3))).toBe(true);
  });
  it("twoStructuresCross: 50 m tower, 60° and 30° -> building 50/3 m", () => {
    const r = build({ template: "twoStructuresCross", unit: "m", atLeftFoot: 60, atRightFoot: 30, rightH: "50" });
    expect(near(r.model.leftH, 50 / 3)).toBe(true);
  });
  it("twoPointsSameSide (depression, ships): 75 m, 45° and 30° -> 75(√3 − 1) m", () => {
    const r = build({ template: "twoPointsSameSide", view: "depression", unit: "m", far: 30, near: 45, h: "75" });
    expect(near(r.model.gap, 75 * (Math.sqrt(3) - 1))).toBe(true);
  });
  it("twoPointsSameSide (moving object): 20 m, eye 1.5 m, 60° -> 30° gives the 2/√3 × 18.5 m drift", () => {
    const r = build({ template: "twoPointsSameSide", view: "elevation", subject: "object", unit: "m", far: 30, near: 60, h: "20", eye: "1.5" });
    expect(near(r.model.gap, 18.5 * (Math.sqrt(3) - 1 / Math.sqrt(3)))).toBe(true);
  });
  it("REFUSES rather than float a label: a 1.2 m eye height against 88.2 m (TRIG-N-NCERT-9-LA-006) is under 6 view units", () => {
    expect(buildHeightsDistances({ template: "twoPointsSameSide", view: "elevation", subject: "object", unit: "m", far: 30, near: 60, h: "88.2", eye: "1.2" })).toBeNull();
  });
  it("scale-free (D6, speed/time with no length): exact angles, no number on any length", () => {
    const r = build({ template: "twoPointsSameSide", view: "depression", unit: "m", far: 30, near: 60, scaleFree: true }, { "q.h": "h" });
    // 6 s for the gap -> 3 s for the rest (TRIG-N-NCERT-9-CB-002).
    expect(near(r.model.nearOverGap * 6, 3)).toBe(true);
    expect(r.spec.transform.unit).toBe("none");
    // True for every scale-free row (a speed × time row may still imply a length).
    expect(r.spec.note).toBe("Not to scale: only the angles are drawn exactly.");
  });
  it("rising object: 3 km, 30° -> 60° -> rose 2√3 km", () => {
    const r = build({ template: "objectOnObject", style: "rising", unit: "km", lower: 30, upper: 60, d: "3" });
    expect(near(r.model.len, 2 * Math.sqrt(3))).toBe(true);
  });
});

describe("heights & distances — REFUSES rather than draws a wrong figure", () => {
  const refusals: Array<[string, HdParams]> = [
    ["θ = 90° (degenerate)", { template: "single", view: "elevation", unit: "m", theta: 90, h: "2" }],
    ["θ = 0°", { template: "single", view: "elevation", unit: "m", theta: 0, d: "2" }],
    ["under-determined single (angle only)", { template: "single", view: "elevation", unit: "m", theta: 30 }],
    ["over-determined single (angle + two lengths)", { template: "single", view: "elevation", unit: "m", theta: 30, h: "10", d: "10" }],
    ["scale-free single (a symbolic sketch)", { template: "single", view: "elevation", unit: "m", theta: 30, scaleFree: true }],
    ["same side with θ_far ≥ θ_near", { template: "twoPointsSameSide", view: "elevation", unit: "m", far: 60, near: 30, gap: "10" }],
    ["same side with equal angles", { template: "twoPointsSameSide", view: "elevation", unit: "m", far: 45, near: 45, gap: "10" }],
    ["same side with two lengths", { template: "twoPointsSameSide", view: "elevation", unit: "m", far: 30, near: 60, gap: "10", h: "5" }],
    ["object-on-object with lower ≥ upper", { template: "objectOnObject", unit: "m", lower: 60, upper: 45, d: "10" }],
    ["elevDep: top of the second structure below its foot", { template: "elevDepFromHeight", unit: "m", H1: "10", top: 60, topView: "depression", foot: 30 }],
    ["two vertical points with upper ≥ ground angle", { template: "twoVerticalPoints", unit: "m", ground: 30, upper: 45, k: "10" }],
    ["a length that is not a number", { template: "single", view: "elevation", unit: "m", theta: 30, d: "x" }],
    ["eye at or above the top", { template: "single", view: "elevation", unit: "m", theta: 30, h: "1.5", eye: "1.5" }],
    ["illegible: a labelled eye height under 6 view units", { template: "single", view: "elevation", unit: "m", theta: 45, d: "100", eye: "1" }],
  ];
  for (const [name, p] of refusals) {
    it(`refuses: ${name}`, () => {
      expect(buildHeightsDistances(p)).toBeNull();
    });
  }
  it("refuses when two points would carry the same letter", () => {
    const p: HdParams = { template: "twoPointsSameSide", view: "elevation", unit: "m", far: 30, near: 60, gap: "20" };
    expect(buildHeightsDistances(p, { far: "A", near: "A" })).toBeNull();
    // CONTROL: distinct letters build.
    expect(buildHeightsDistances(p, { far: "A", near: "B" })).not.toBeNull();
  });
});

describe("heights & distances — determinism and the registry", () => {
  it("the same params give a deep-equal spec", () => {
    const p: HdParams = { template: "twoPointsOppositeSides", view: "depression", unit: "m", left: 60, right: 30, h: "150" };
    expect(buildHeightsDistances(p)).toEqual(buildHeightsDistances(p));
  });
  it("EVERY registered binding builds and draws its own numbers", () => {
    expect(ALL_COMPUTED_FIGURE_BINDINGS.length).toBeGreaterThan(0);
    for (const b of ALL_COMPUTED_FIGURE_BINDINGS) {
      const r = buildComputedFigure(b);
      expect(r, b.questionId).not.toBeNull();
      assertDrawsItsOwnNumbers(r!.spec, b.params);
    }
  });
});

describe("heights & distances — CURRICULUM LIMITS (30°/45°/60° only, at most 2 right triangles)", () => {
  const offSyllabus: Array<[string, HdParams]> = [
    ["a given 50° elevation", { template: "single", view: "elevation", unit: "m", theta: 50, d: "10" }],
    ["a given 15° depression", { template: "single", view: "depression", unit: "m", theta: 15, h: "10" }],
    ["a solved angle that is not 30/45/60 (h = 10, d = 20)", { template: "single", view: "elevation", unit: "m", h: "10", d: "20" }],
    ["two points with 20° and 60°", { template: "twoPointsSameSide", view: "elevation", unit: "m", far: 20, near: 60, gap: "10" }],
    ["opposite sides with 75°", { template: "twoPointsOppositeSides", view: "elevation", unit: "m", left: 75, right: 30, h: "10" }],
  ];
  for (const [name, p] of offSyllabus) {
    it(`refuses ${name}`, () => {
      expect(buildHeightsDistances(p)).toBeNull();
    });
  }
  it("refuses a scene with more than two right triangles (three angle arcs)", () => {
    const r = buildHeightsDistances({ template: "twoPointsSameSide", view: "elevation", unit: "m", far: 30, near: 60, gap: "20" })!;
    const third = { t: "angle" as const, at: "far", from: "near", to: "top", deg: 30, label: "30°" };
    expect(withinCurriculum({ elements: [...r.spec.elements, third] })).toBe(false);
    expect(withinCurriculum({ elements: r.spec.elements.map((e) => (e.t === "angle" ? { ...e, deg: 50 } : e)) })).toBe(false);
  });
  it("CONTROL: a 30°/60° two-triangle scene, and a solved 60° angle, still draw", () => {
    const r = buildHeightsDistances({ template: "twoPointsSameSide", view: "elevation", unit: "m", far: 30, near: 60, gap: "20" });
    expect(r).not.toBeNull();
    expect(withinCurriculum(r!.spec)).toBe(true);
    expect(buildHeightsDistances({ template: "single", view: "shadow", unit: "m", h: "8", d: "8/√3" })).not.toBeNull();
    expect(buildHeightsDistances({ template: "objectOnObject", unit: "m", lower: 45, upper: 60, len: "12" })).not.toBeNull();
  });
});
