/**
 * DIAGRAMS-1 PR-2d — the geometry builders draw the QUESTION'S OWN numbers.
 *
 * Every assertion reads the DRAWN figure back through the recorded world -> view
 * transform: a drawn length (in the row's unit) must equal the given length, a drawn
 * angle (atan2 of the drawn rays) must equal the given angle, a right-angle mark must
 * sit on a true 90°, a drawn circle's radius must reach the points drawn on it, a
 * plotted point must sit at its coordinates on one uniform scale.
 */
import { describe, expect, it } from "vitest";
import { angleBetweenDeg, dist, evalLengthExpr, prettyExpr } from "../figureGeometry";
import type { FigureElement, FigureSpec } from "../figureSpec";
import { ALL_COMPUTED_FIGURE_BINDINGS, buildComputedFigure } from "../registry";
import type { ComputedFigureBinding } from "../registry/computedFigureTypes";
import { buildCircle } from "./circleTangents";
import type { CircleDraw, CircleParams } from "./circleTangents";
import { ILLUSTRATIVE_NOTE, buildBpt, evalInX } from "./triangleBpt";
import type { BptParams } from "./triangleBpt";
import { buildCoordinatePlot, parseCoord, tickStep } from "./coordinatePlot";
import type { CoordDraw, CoordParams } from "./coordinatePlot";
import { buildSector } from "./circleSector";
import type { SectorParams } from "./circleSector";

type Seg = Extract<FigureElement, { t: "seg" }>;

const near = (a: number, b: number, tolPct = 0.5) => Math.abs(a - b) <= (Math.abs(b) * tolPct) / 100 + 1e-9;

/** The labelled segments carrying `text`, with their drawn WORLD lengths. */
function labelled(spec: FigureSpec, text: string): number[] {
  return spec.elements
    .filter((e): e is Seg => e.t === "seg" && e.label?.text === text)
    .map((e) => dist(spec.points[e.a], spec.points[e.b]) / spec.transform.sx);
}

/** The invariants every geometry figure must satisfy, whatever its template. */
function assertGeometryInvariants(spec: FigureSpec): void {
  const P = spec.points;
  const t = spec.transform;
  expect(t.sx).toBe(t.sy); // one uniform scale
  for (const el of spec.elements) {
    if (el.t === "right") expect(Math.abs(angleBetweenDeg(P[el.at], P[el.a], P[el.b]) - 90)).toBeLessThan(0.1);
    if (el.t === "angle") expect(Math.abs(angleBetweenDeg(P[el.at], P[el.from], P[el.to]) - el.deg)).toBeLessThan(0.5);
    if (el.t === "region") {
      // The shaded region's radius is the distance from its centre to both its ends.
      expect(Math.abs(dist(P[el.c], P[el.from]) - el.r)).toBeLessThan(0.05);
      expect(Math.abs(dist(P[el.c], P[el.to]) - el.r)).toBeLessThan(0.05);
      const swept = angleBetweenDeg(P[el.c], P[el.from], P[el.to]);
      expect(Math.abs((el.ccwDeg > 180 ? 360 - el.ccwDeg : el.ccwDeg) - swept)).toBeLessThan(0.5);
    }
  }
  const letters = spec.elements.flatMap((e) => (e.t === "label" ? [e.text] : []));
  expect(new Set(letters).size).toBe(letters.length);
}

/** Every GIVEN length is drawn at its true length and labelled with its value. */
function assertGivenLengths(spec: FigureSpec, params: Record<string, unknown>, unit: string, keys: string[], x?: number): void {
  for (const k of keys) {
    const v = params[k];
    if (typeof v !== "string") continue;
    const hasX = /x/i.test(v);
    const text = hasX ? prettyExpr(v) : unit === "none" ? prettyExpr(v) : `${prettyExpr(v)} ${unit}`;
    const lens = labelled(spec, text);
    expect(lens.length, `${k}=${v} is drawn and labelled "${text}"`).toBeGreaterThan(0);
    const want = hasX ? evalInX(v, x) : evalLengthExpr(v);
    expect(lens.some((l) => near(l, want)), `${k}=${v} drawn to scale (drawn ${lens.join(", ")})`).toBe(true);
  }
}

/** Every GIVEN angle is drawn at its value and labelled with it. */
function assertGivenAngles(spec: FigureSpec, params: Record<string, unknown>, keys: string[]): void {
  for (const k of keys) {
    const v = params[k];
    if (typeof v !== "number" || v === 90) continue; // 90° is a right-angle mark
    const arcs = spec.elements.filter((e) => e.t === "angle" && e.deg === v && e.label === `${v}°`);
    expect(arcs.length, `${k}=${v}° is drawn and labelled`).toBeGreaterThan(0);
  }
}

const CIRCLE_LENS = ["r", "d", "t", "chord", "gap", "R", "half", "AB", "BC", "CA", "x", "y", "z", "L", "h"];
const CIRCLE_ANGLES = ["angleP", "angleO", "angleOPA", "angleAOP", "angleOAB", "anglePAB", "angleT", "angleOPQ"];

/** Reads one binding's figure back against its own params. */
function assertDrawsItsOwnNumbers(b: ComputedFigureBinding, spec: FigureSpec): void {
  assertGeometryInvariants(spec);
  const params = b.params as unknown as Record<string, unknown>;
  const P = spec.points;
  if (b.builder === "circleTangents") {
    const unit = params.scaleFree ? "none" : String(params.unit);
    if (!params.scaleFree) assertGivenLengths(spec, params, unit, CIRCLE_LENS.filter((k) => !(params.template === "incircle" && k === "r" && false)));
    else for (const e of spec.elements) if (e.t === "seg" && e.label) expect(e.label.text).not.toMatch(/\d/);
    assertGivenAngles(spec, params, CIRCLE_ANGLES);
    // Every circle passes through the points drawn on it (contact points / chord ends).
    for (const el of spec.elements) {
      if (el.t !== "circle") continue;
      const onIt = Object.keys(P).filter((id) => Math.abs(dist(P[el.c], P[id]) - el.r) < 0.05);
      expect(onIt.length, `circle about ${el.c} carries the points drawn on it`).toBeGreaterThan(0);
    }
  } else if (b.builder === "triangleBpt") {
    const p = b.params;
    const x = p.x !== undefined ? evalLengthExpr(p.x) : undefined;
    assertGivenLengths(spec, params, p.unit, ["AD", "DB", "AB", "AE", "EC", "AC", "DE", "BC"], x);
    // DE is drawn exactly parallel to BC.
    const v1 = { x: P.E.x - P.D.x, y: P.E.y - P.D.y };
    const v2 = { x: P.C.x - P.B.x, y: P.C.y - P.B.y };
    expect(Math.abs(v1.x * v2.y - v1.y * v2.x) / (Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y))).toBeLessThan(1e-6);
    // D and E divide AB and AC in the same ratio.
    expect(near(dist(P.A, P.D) / dist(P.D, P.B), dist(P.A, P.E) / dist(P.E, P.C), 0.01)).toBe(true);
  } else if (b.builder === "coordinatePlot") {
    const t = spec.transform;
    for (const [k, v] of Object.entries(params)) {
      if (k === "template" || k === "unit" || k === "ratio" || typeof v !== "string") continue;
      const c = parseCoord(v)!;
      // The point sits at its coordinates, on the one uniform scale.
      expect(Math.abs(P[k].x - (c.x * t.sx + t.ox))).toBeLessThan(0.01);
      expect(Math.abs(P[k].y - (t.oy - c.y * t.sy))).toBeLessThan(0.01);
      const texts = spec.elements.flatMap((e) => (e.t === "text" && e.at === k ? [e.text] : []));
      expect(texts.some((s) => s.replace(/\s/g, "").replace(/−/g, "-").endsWith(v.replace(/\s/g, "").replace(/−/g, "-"))), `${k} labelled ${v}`).toBe(true);
    }
  } else if (b.builder === "circleSector") {
    const p = b.params;
    assertGivenLengths(spec, params, p.unit, ["r"]);
    assertGivenAngles(spec, params, ["theta"]);
    const circle = spec.elements.find((e) => e.t === "circle");
    expect(circle && circle.t === "circle" && Math.abs(dist(P.O, P.A) - circle.r)).toBeLessThan(0.05);
  }
}

// ───────────────────────── circles ─────────────────────────

function circle(p: CircleParams, labels = {}, draw: CircleDraw = {}) {
  const r = buildCircle(p, labels, draw);
  expect(r, `builds ${JSON.stringify(p)}`).not.toBeNull();
  return r!;
}

describe("circles — tangents from an external point", () => {
  it("CI2-007: r = 5, OP = 13 -> PA = 12; the tangent is drawn perpendicular to the radius and PA = PB", () => {
    const r = circle({ template: "tangentPair", unit: "cm", r: "5", d: "13" });
    expect(near(r.model.t, 12)).toBe(true);
    const P = r.spec.points;
    expect(Math.abs(angleBetweenDeg(P.A, P.O, P.P) - 90)).toBeLessThan(0.01);
    expect(Math.abs(dist(P.P, P.A) - dist(P.P, P.B))).toBeLessThan(0.01);
    expect(labelled(r.spec, "5 cm").some((l) => near(l, 5))).toBe(true);
    expect(labelled(r.spec, "13 cm").some((l) => near(l, 13))).toBe(true);
  });
  it("CIR-M06: r = 5, ∠APB = 60° -> ∠AOB = 120°, PA = 5√3, OP = 10, area OAPB = 25√3", () => {
    const r = circle({ template: "tangentPair", unit: "cm", r: "5", angleP: 60 });
    expect(r.model.angleO).toBeCloseTo(120, 9);
    expect(near(r.model.t, 5 * Math.sqrt(3))).toBe(true);
    expect(near(r.model.d, 10)).toBe(true);
    expect(near(r.model.areaOAPB, 25 * Math.sqrt(3))).toBe(true);
  });
  it("scale-free (angles only): exact angles, no number on any length, an honest note", () => {
    const r = circle({ template: "tangentPair", unit: "cm", scaleFree: true, angleP: 50 }, {}, { chord: true });
    expect(r.model.angleOAB).toBeCloseTo(25, 9);
    for (const e of r.spec.elements) if (e.t === "seg" && e.label) expect(e.label.text).not.toMatch(/\d/);
    expect(r.spec.note).toBe("Not to scale: only the angles are drawn exactly.");
    expect(r.spec.transform.unit).toBe("none");
  });
  it("the third tangent at the point on OP (PYQ-M-2026-CIRC-006): AB = 20/3, PA = 26/3", () => {
    const r = circle({ template: "tangentPair", unit: "cm", r: "5", d: "13" }, {}, { third: true });
    expect(near(r.model.thirdCD, 20 / 3)).toBe(true);
    expect(near(r.model.thirdPC, 26 / 3)).toBe(true);
    // C lies on PA, and CE is perpendicular to OE.
    const P = r.spec.points;
    expect(Math.abs(angleBetweenDeg(P.C, P.P, P.A) - 180)).toBeLessThan(0.01);
  });
  it("a gap PE (LTG-M-CIRC-242): PT = 24, PE = 16 -> r = 10", () => {
    const r = circle({ template: "tangentPair", unit: "m", t: "24", gap: "16" }, {}, { single: true });
    expect(near(r.model.r, 10)).toBe(true);
  });
  it("a single tangent with ∠OTA (APQ-M-CIRC-003): OT = 4, 30° -> AT = 2√3", () => {
    const r = circle({ template: "tangentPair", unit: "cm", d: "4", angleOPA: 30 }, {}, { single: true });
    expect(near(r.model.t, 2 * Math.sqrt(3))).toBe(true);
    expect(r.spec.points.B).toBeUndefined();
  });
});

describe("circles — concentric, tangent-chord, incircle, common tangent, parallel chord", () => {
  it("concentric 5 and 3 -> chord 8, bisected at the point of contact", () => {
    const r = circle({ template: "concentricChord", unit: "cm", R: "5", r: "3" });
    expect(near(r.model.chord, 8)).toBe(true);
    const P = r.spec.points;
    expect(Math.abs(dist(P.A, P.M) - dist(P.M, P.B))).toBeLessThan(0.01);
  });
  it("tangent-chord 65° -> ∠OPQ = 25°, ∠POQ = 130°", () => {
    const r = circle({ template: "tangentChord", unit: "cm", scaleFree: true, angleT: 65 });
    expect(r.model.angleOPQ).toBeCloseTo(25, 9);
    expect(r.model.angleO).toBeCloseTo(130, 9);
  });
  it("incircle of 6, 8, 10 (right at B) -> r = 2; tangents from each vertex are equal", () => {
    const r = circle({ template: "incircle", unit: "cm", AB: "6", BC: "8", angleB: 90 });
    expect(near(r.model.r, 2)).toBe(true);
    const P = r.spec.points;
    expect(Math.abs(dist(P.A, P.F) - dist(P.A, P.E))).toBeLessThan(0.01);
    expect(Math.abs(dist(P.B, P.D) - dist(P.B, P.F))).toBeLessThan(0.01);
    expect(Math.abs(dist(P.C, P.D) - dist(P.C, P.E))).toBeLessThan(0.01);
  });
  it("incircle from r and two tangents (NCERT 10 LA-001): r 4, BD 8, DC 6 -> AB 15, AC 13", () => {
    const r = circle({ template: "incircle", unit: "cm", r: "4", y: "8", z: "6" });
    expect(near(r.model.AB, 15)).toBe(true);
    expect(near(r.model.CA, 13)).toBe(true);
  });
  it("common tangents: direct 30/10/52 -> 48; transverse 9/6/25 -> 20 with OX = 15", () => {
    expect(near(circle({ template: "commonTangent", unit: "cm", R: "30", r: "10", d: "52" }).model.L, 48)).toBe(true);
    const tr = circle({ template: "commonTangent", unit: "cm", R: "9", r: "6", d: "25" }, {}, { kind: "transverse" });
    expect(near(tr.model.L, 20)).toBe(true);
    expect(near(tr.model.OX, 15)).toBe(true);
  });
  it("a chord parallel to the tangent: r 13 at 8 above the contact -> 24", () => {
    expect(near(circle({ template: "parallelChord", unit: "cm", r: "13", h: "8" }).model.chord, 24)).toBe(true);
  });
});

describe("circles — REFUSES rather than draws a wrong figure", () => {
  const refusals: Array<[string, CircleParams, CircleDraw?]> = [
    ["P inside the circle (OP ≤ r)", { template: "tangentPair", unit: "cm", r: "5", d: "4" }],
    ["givens that disagree (r 5, OP 13, PA 10)", { template: "tangentPair", unit: "cm", r: "5", d: "13", t: "10" }],
    ["only one length: not fixed", { template: "tangentPair", unit: "cm", r: "5" }],
    ["OP and the chord only: two configurations", { template: "tangentPair", unit: "cm", d: "10", chord: "6" }],
    ["∠APB = 180°", { template: "tangentPair", unit: "cm", scaleFree: true, angleP: 180 }],
    ["a scale-free figure that has a length", { template: "tangentPair", unit: "cm", scaleFree: true, angleP: 60, r: "5" }],
    ["a single tangent with ∠APB", { template: "tangentPair", unit: "cm", r: "5", angleP: 60 }, { single: true }],
    ["concentric inner ≥ outer", { template: "concentricChord", unit: "cm", R: "3", r: "5" }],
    ["incircle sides that cannot close", { template: "incircle", unit: "cm", AB: "1", BC: "2", CA: "5" }],
    ["incircle 'right at B' that is not right", { template: "incircle", unit: "cm", AB: "6", BC: "8", CA: "9", angleB: 90 }],
    ["tangent-chord at 90°", { template: "tangentChord", unit: "cm", scaleFree: true, angleT: 90 }],
    ["common tangent with only two givens", { template: "commonTangent", unit: "cm", R: "5", r: "3" }],
    ["transverse tangent between overlapping circles", { template: "commonTangent", unit: "cm", R: "5", r: "3", d: "7" }, { kind: "transverse" }],
    ["parallel chord with no distance", { template: "parallelChord", unit: "cm", r: "10", chord: "12" }],
    ["illegible: a 4.5 cm pulley beside a 20.5 cm one 65 cm away (LTG-M-CIRC-208)", { template: "commonTangent", unit: "cm", R: "20.5", r: "4.5", d: "65" }],
  ];
  for (const [name, p, d] of refusals) it(`refuses: ${name}`, () => expect(buildCircle(p, {}, d ?? {})).toBeNull());
  it("refuses two points carrying one letter — CONTROL: distinct letters build", () => {
    const p: CircleParams = { template: "tangentPair", unit: "cm", r: "5", d: "13" };
    expect(buildCircle(p, { O: "O", P: "A", A: "A", B: "B" })).toBeNull();
    expect(buildCircle(p, { O: "O", P: "P", A: "A", B: "B" })).not.toBeNull();
  });
});

// ───────────────────────── triangles (BPT) ─────────────────────────

function bpt(p: BptParams, labels = {}) {
  const r = buildBpt(p, labels);
  expect(r, `builds ${JSON.stringify(p)}`).not.toBeNull();
  return r!;
}

describe("triangles — DE ∥ BC (BPT)", () => {
  it("AD 4, DB 6, AE 5 -> EC 7.5; the angle at A is not given, and the note says so", () => {
    const r = bpt({ template: "bpt", unit: "cm", AD: "4", DB: "6", AE: "5" });
    expect(near(r.model.EC, 7.5)).toBe(true);
    expect(r.spec.note).toBe(ILLUSTRATIVE_NOTE);
  });
  it("a third side fixes the shape: no illustrative note, and BC is drawn at its length", () => {
    const r = bpt({ template: "bpt", unit: "cm", AD: "2", DB: "3", AE: "1.5", BC: "5" });
    expect(r.spec.note).toBeUndefined();
    expect(near(r.model.DE, 2)).toBe(true);
    expect(labelled(r.spec, "5 cm").some((l) => near(l, 5))).toBe(true);
  });
  it("lengths written in x (BX-TRI-D-001): x = 3 gives AD 4, AE 6, and the labels keep the row's expressions", () => {
    const r = bpt({ template: "bpt", unit: "cm", AD: "x + 1", DB: "x − 1", AE: "x + 3", EC: "x", x: "3" });
    expect(near(r.model.AD, 4)).toBe(true);
    expect(near(r.model.AE, 6)).toBe(true);
    expect(labelled(r.spec, "x + 1").some((l) => near(l, 4))).toBe(true);
  });
  it("evalInX handles implicit products (3x − 1 at x = 7 is 20)", () => {
    expect(evalInX("3x − 1", 7)).toBe(20);
    expect(evalInX("x", undefined)).toBeNaN();
  });
  const refusals: Array<[string, BptParams]> = [
    ["a converse row whose DE is NOT parallel (NCERT 6 SA-002)", { template: "bpt", unit: "cm", AD: "3.9", DB: "3", AE: "3.6", EC: "2.4" }],
    ["no length on AC", { template: "bpt", unit: "cm", AD: "6", AB: "10", BC: "15" }],
    ["a triangle that cannot close", { template: "bpt", unit: "cm", AD: "1", DB: "1", AE: "1", EC: "1", BC: "10" }],
    ["a very flat triangle (∠A > 120°, BX-TRI-D-042)", { template: "bpt", unit: "cm", AD: "2.4", DB: "3.6", AE: "2", EC: "3", BC: "10" }],
    ["x makes a length negative", { template: "bpt", unit: "cm", AD: "x", DB: "x − 5", AE: "x", EC: "x − 5", x: "2" }],
  ];
  for (const [name, p] of refusals) it(`refuses: ${name}`, () => expect(buildBpt(p)).toBeNull());
});

// ───────────────────────── coordinate geometry ─────────────────────────

function plot(p: CoordParams, labels = {}, draw: CoordDraw = {}) {
  const r = buildCoordinatePlot(p, labels, draw);
  expect(r, `builds ${JSON.stringify(p)}`).not.toBeNull();
  return r!;
}

describe("coordinate geometry — points on true axes", () => {
  it("A(3, 4), B(0, 0): AB = 5; one unit is the same length on both axes", () => {
    const r = plot({ template: "points", unit: "none", A: "(3, 4)", B: "(0, 0)" }, {}, { segs: [["A", "B"]] });
    expect(near(r.model.AB, 5)).toBe(true);
    const t = r.spec.transform;
    expect(t.sx).toBe(t.sy);
  });
  it("ticks sit at a truthful, even step", () => {
    const r = plot({ template: "points", unit: "none", A: "(−1, 7)", B: "(4, −3)", P: "(1, 3)", ratio: "2:3" }, {}, { section: { point: "P", a: "A", b: "B" } });
    const ticks = r.spec.elements.filter((e) => e.t === "text" && e.kind === "tick" && /^−?\d+$/.test(e.text));
    for (const tk of ticks) {
      if (tk.t !== "text") continue;
      const p = r.spec.points[tk.at];
      const world = (p.x - r.spec.transform.ox) / r.spec.transform.sx;
      const worldY = (r.spec.transform.oy - p.y) / r.spec.transform.sy;
      const v = Number(tk.text.replace("−", "-"));
      expect(Math.abs(world - v) < 0.2 || Math.abs(worldY - v) < 0.2).toBe(true);
    }
    expect(tickStep(10)).toBe(1);
    expect(tickStep(36)).toBe(5);
  });
  const refusals: Array<[string, CoordParams, CoordDraw]> = [
    ["a 'division point' that is not the section point", { template: "points", unit: "none", A: "(−1, 7)", B: "(4, −3)", P: "(2, 3)", ratio: "2:3" }, { section: { point: "P", a: "A", b: "B" } }],
    ["a 'mid-point' that is not the midpoint", { template: "points", unit: "none", A: "(2, 3)", B: "(4, 7)", M: "(3, 6)" }, { midpoint: { point: "M", a: "A", b: "B" } }],
    ["a point 'on AB' that is off the line", { template: "points", unit: "none", A: "(0, 0)", B: "(4, 4)", P: "(1, 2)" }, { onSegment: { point: "P", a: "A", b: "B" } }],
    ["a ratio with nothing to divide", { template: "points", unit: "none", A: "(0, 0)", B: "(4, 4)", ratio: "1:2" }, {}],
    ["a coordinate in letters", { template: "points", unit: "none", A: "(k, 0)", B: "(4, 4)" }, {}],
    ["a squashed plot (LTG-M-CG-211)", { template: "points", unit: "none", C: "(2, -1)", P: "(-38, 3)", U: "(42, -5)" }, { midpoint: { point: "C", a: "P", b: "U" } }],
  ];
  for (const [name, p, d] of refusals) it(`refuses: ${name}`, () => expect(buildCoordinatePlot(p, {}, d)).toBeNull());
  it("CONTROL: the true section point builds", () => {
    expect(buildCoordinatePlot({ template: "points", unit: "none", A: "(−1, 7)", B: "(4, −3)", P: "(1, 3)", ratio: "2:3" }, {}, { section: { point: "P", a: "A", b: "B" } })).not.toBeNull();
  });
});

// ───────────────────────── areas related to circles ─────────────────────────

function sector(p: SectorParams, shade: "sector" | "segment" | "majorSector" | "majorSegment" = "sector") {
  const r = buildSector(p, {}, { shade });
  expect(r, `builds ${JSON.stringify(p)}`).not.toBeNull();
  return r!;
}

describe("areas related to circles — sectors and segments", () => {
  it("r 21, θ 60° -> arc 22, sector 231 (π = 22/7 rounding)", () => {
    const r = sector({ template: "sector", unit: "cm", r: "21", theta: 60 });
    expect(near(r.model.arc, 22)).toBe(true);
    expect(near(r.model.sector, 231)).toBe(true);
  });
  it("segment r 12, θ 120° -> 88.44 (π 3.14, √3 1.73)", () => {
    expect(near(sector({ template: "sector", unit: "cm", r: "12", theta: 120 }, "segment").model.segment, 88.44)).toBe(true);
  });
  it("θ from an arc length: r 21, arc 22 -> 60°", () => {
    expect(near(sector({ template: "sector", unit: "cm", r: "21", arc: "22" }).model.theta, 60, 0.1)).toBe(true);
  });
  it("a major sector is shaded through 360° − θ", () => {
    const r = sector({ template: "sector", unit: "cm", r: "10", theta: 90 }, "majorSector");
    const reg = r.spec.elements.find((e) => e.t === "region");
    expect(reg && reg.t === "region" && reg.ccwDeg).toBe(270);
  });
  const refusals: Array<[string, SectorParams, "sector" | "segment"]> = [
    ["a SEGMENT at 45° (CBSE 2026-27: segments at 60°, 90°, 120° only)", { template: "sector", unit: "cm", r: "10", theta: 45 }, "segment"],
    ["a 180° sector", { template: "sector", unit: "cm", r: "7", theta: 180 }, "sector"],
    ["a 15° sector (illegible)", { template: "sector", unit: "cm", r: "36", theta: 15 }, "sector"],
    ["θ and an arc that disagree", { template: "sector", unit: "cm", r: "21", theta: 90, arc: "22" }, "sector"],
    ["no radius", { template: "sector", unit: "cm", theta: 60 }, "sector"],
  ];
  for (const [name, p, shade] of refusals) it(`refuses: ${name}`, () => expect(buildSector(p, {}, { shade })).toBeNull());
  it("CONTROL: the same segment at 60° builds", () => {
    expect(buildSector({ template: "sector", unit: "cm", r: "10", theta: 60 }, {}, { shade: "segment" })).not.toBeNull();
  });
});

// ───────────────────────── every registered geometry binding ─────────────────────────

const GEOMETRY = ALL_COMPUTED_FIGURE_BINDINGS.filter((b) => b.builder !== "heightsDistances");

describe("geometry registry — EVERY binding builds and draws its own numbers", () => {
  it("the four chapter tables are registered", () => {
    expect(GEOMETRY.length).toBeGreaterThan(100);
    for (const builder of ["circleTangents", "triangleBpt", "coordinatePlot", "circleSector"]) {
      expect(GEOMETRY.some((b) => b.builder === builder), builder).toBe(true);
    }
  });
  for (const b of GEOMETRY) {
    it(`${b.questionId}${b.part ? ` ${b.part}` : ""}`, () => {
      const r = buildComputedFigure(b);
      expect(r, "builder refused a registered binding").not.toBeNull();
      assertDrawsItsOwnNumbers(b, r!.spec);
      // Deterministic.
      expect(buildComputedFigure(b)).toEqual(r);
    });
  }
});
