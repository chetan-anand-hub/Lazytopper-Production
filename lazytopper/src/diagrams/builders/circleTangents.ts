/**
 * Circles — tangents, chords and concentric circles: a pure builder from a row's OWN
 * numbers to a FigureSpec (DIAGRAMS-1 PR-2d).
 *
 * Every template SOLVES its configuration exactly, then draws it with ONE uniform
 * scale, so the tangent is drawn perpendicular to the radius at the point of contact,
 * the two tangents from an external point are drawn equal, every drawn angle IS its
 * value and every drawn length ratio IS the true ratio. The solved values come back as
 * `model` for the provenance test to compare with the row's own answer.
 *
 * REFUSAL IS THE SAFE ANSWER (null): an angle outside its open range, lengths that do
 * not make a real configuration (a tangent from a point inside the circle), givens that
 * disagree with each other, a configuration the givens do not fix (only one length, or
 * a chord with only the distance OP — two answers), or a drawing too small to read.
 *
 * Labels: a GIVEN carries its value as the row writes it ("5 cm", "70°"); an UNKNOWN
 * carries the row's own letter from `labels["q.<name>"]` or nothing. A scale-free row
 * (angles only) carries no length number and says so in its note.
 */
import { DEG } from "../figureGeometry";
import type { FigureSpec } from "../figureSpec";
import { GeoScene, agrees, finishGeo, lenText, num, q } from "./geometryCommon";
import type { GeoBuildResult, GeoLabels, GeoUnit, Len } from "./geometryCommon";

interface CircleBase {
  unit: GeoUnit;
  /** The row gives angles only: draw exact angles, no number on any length. */
  scaleFree?: boolean;
}

/** Two tangents PA, PB from an external point P to a circle with centre O. */
export interface TangentPairParams extends CircleBase {
  template: "tangentPair";
  /** Radius OA. */
  r?: Len;
  /** Distance OP of the external point from the centre. */
  d?: Len;
  /** Tangent length PA (= PB). */
  t?: Len;
  /** Chord AB joining the points of contact. */
  chord?: Len;
  /** The distance from P to the nearest point of the circle (along PO). */
  gap?: Len;
  /** ∠APB, the angle between the tangents. */
  angleP?: number;
  /** ∠AOB, the angle the contact points subtend at the centre. */
  angleO?: number;
  /** ∠OPA (half of ∠APB). */
  angleOPA?: number;
  /** ∠AOP (half of ∠AOB). */
  angleAOP?: number;
  /** ∠OAB (= ∠OBA). */
  angleOAB?: number;
  /** ∠PAB (= ∠PBA). */
  anglePAB?: number;
}

/** Two concentric circles; a chord AB of the larger touches the smaller at M. */
export interface ConcentricChordParams extends CircleBase {
  template: "concentricChord";
  R?: Len;
  r?: Len;
  chord?: Len;
  /** AM, half the chord. */
  half?: Len;
}

/** The tangent at P and a chord PQ: ∠(tangent, chord) = θ, ∠POQ = 2θ. */
export interface TangentChordParams extends CircleBase {
  template: "tangentChord";
  /** Angle between the tangent PT and the chord PQ. */
  angleT?: number;
  /** ∠POQ, the angle the chord subtends at the centre. */
  angleO?: number;
  /** ∠OPQ, between the radius OP and the chord. */
  angleOPQ?: number;
}

/**
 * A circle inscribed in triangle ABC, touching BC at D, CA at E and AB at F. The
 * tangent lengths from the vertices are x = AF = AE, y = BD = BF, z = CD = CE.
 */
export interface IncircleParams extends CircleBase {
  template: "incircle";
  AB?: Len;
  BC?: Len;
  CA?: Len;
  /** Tangent length from A (AF = AE). */
  x?: Len;
  /** Tangent length from B (BD = BF). */
  y?: Len;
  /** Tangent length from C (CD = CE). */
  z?: Len;
  r?: Len;
  perimeter?: Len;
  /** 90 when the row says the triangle is right-angled at B. */
  angleB?: number;
}

/** Two circles (centres O and C, radii R ≥ r) and a common tangent AB. */
export interface CommonTangentParams extends CircleBase {
  template: "commonTangent";
  R?: Len;
  r?: Len;
  /** Distance OC between the centres. */
  d?: Len;
  /** Length AB of the common tangent between the points of contact. */
  L?: Len;
}

/** A tangent at P and a chord CD parallel to it, at height h above P. */
export interface ParallelChordParams extends CircleBase {
  template: "parallelChord";
  r?: Len;
  /** Distance of the chord from the tangent (PM). */
  h?: Len;
  chord?: Len;
}

export type CircleParams =
  | TangentPairParams
  | ConcentricChordParams
  | TangentChordParams
  | IncircleParams
  | CommonTangentParams
  | ParallelChordParams;

/** Display choices that are NOT numbers from the row (so they need no provenance quote). */
export interface CircleDraw {
  /** Only ONE tangent PA (the row has a single tangent from P). */
  single?: boolean;
  /** Draw the chord AB of contact (and its foot M on OP). */
  chord?: boolean;
  /** Draw the line OP (default true). */
  op?: boolean;
  /** Draw the third tangent at E, the point of the circle on OP nearest P, meeting PA at C and PB at D. */
  third?: boolean;
  /** Common tangents: "direct" (both circles on one side) or "transverse" (crossing the line of centres). */
  kind?: "direct" | "transverse";
  /** Incircle: show the tangent length from A on AE (the row names AR / AE) instead of AF. */
  xOnAE?: boolean;
}

const RAD = (d: number) => d * DEG;
const ANGLE_LABEL = (a: number) => `${a}°`;

function openAngle(a: number | undefined, lo: number, hi: number): boolean {
  return a === undefined || (Number.isFinite(a) && a > lo && a < hi);
}

// ───────────────────────── tangent pair ─────────────────────────

function solvePair(p: TangentPairParams): { phi: number; r: number } | null {
  let r = num(p.r);
  let d = num(p.d);
  const t = num(p.t);
  const chord = num(p.chord);
  const gap = num(p.gap);
  for (const v of [r, d, t, chord, gap]) if (v !== undefined && !Number.isFinite(v)) return null;
  // The gap PE = OP − r turns into a radius or a distance.
  if (gap !== undefined) {
    const fromGap: Array<[number, number]> = [];
    if (r !== undefined) fromGap.push([r, r + gap]);
    if (d !== undefined) fromGap.push([d - gap, d]);
    if (t !== undefined) fromGap.push([(t * t / gap - gap) / 2, (t * t / gap + gap) / 2]);
    if (fromGap.length === 0) return null;
    const [r0, d0] = fromGap[0];
    if (!(r0 > 0) || !fromGap.every(([rr, dd]) => agrees(rr, r0) && agrees(dd, d0))) return null;
    r = r0;
    d = d0;
  }
  if (!openAngle(p.angleP, 0, 180) || !openAngle(p.angleO, 0, 180)) return null;
  if (p.scaleFree && gap !== undefined) return null;
  for (const a of [p.angleOPA, p.angleAOP, p.angleOAB, p.anglePAB]) if (!openAngle(a, 0, 90)) return null;

  // φ = ∠OPA. Every given angle names it.
  const phis: number[] = [];
  if (p.angleP !== undefined) phis.push(p.angleP / 2);
  if (p.angleO !== undefined) phis.push(90 - p.angleO / 2);
  if (p.angleOPA !== undefined) phis.push(p.angleOPA);
  if (p.angleAOP !== undefined) phis.push(90 - p.angleAOP);
  if (p.angleOAB !== undefined) phis.push(p.angleOAB);
  if (p.anglePAB !== undefined) phis.push(90 - p.anglePAB);
  // Two lengths name it too.
  if (r !== undefined && d !== undefined) {
    if (d <= r) return null; // P inside / on the circle: no tangent pair
    phis.push(Math.asin(r / d) / DEG);
  }
  if (r !== undefined && t !== undefined) phis.push(Math.atan(r / t) / DEG);
  if (d !== undefined && t !== undefined) {
    if (t >= d) return null;
    phis.push(Math.acos(t / d) / DEG);
  }
  if (r !== undefined && chord !== undefined) {
    if (chord >= 2 * r) return null;
    phis.push(Math.acos(chord / (2 * r)) / DEG);
  }
  if (t !== undefined && chord !== undefined) {
    if (chord >= 2 * t) return null;
    phis.push(Math.asin(chord / (2 * t)) / DEG);
  }
  if (phis.length === 0) return null; // under-determined (e.g. only d and the chord: two configurations)
  const phi = phis[0];
  if (!(phi > 0 && phi < 90)) return null;
  if (!phis.every((x) => Math.abs(x - phi) < 0.3)) return null; // the givens disagree

  // Scale: every given length names the radius.
  const s = Math.sin(RAD(phi));
  const c = Math.cos(RAD(phi));
  const rs: number[] = [];
  if (r !== undefined) rs.push(r);
  if (d !== undefined) rs.push(d * s);
  if (t !== undefined) rs.push((t * s) / c);
  if (chord !== undefined) rs.push(chord / (2 * c));
  if (p.scaleFree) return rs.length === 0 ? { phi, r: 1 } : null;
  if (rs.length === 0) return null;
  if (!rs.every((x) => agrees(x, rs[0]))) return null;
  return { phi, r: rs[0] };
}

export function buildTangentPair(p: TangentPairParams, labels: GeoLabels = {}, draw: CircleDraw = {}): GeoBuildResult | null {
  const sol = solvePair(p);
  if (!sol) return null;
  const { phi, r } = sol;
  const single = draw.single === true;
  if (single && (p.angleP !== undefined || p.angleO !== undefined || p.angleOAB !== undefined || p.anglePAB !== undefined || p.chord !== undefined || draw.chord)) {
    return null; // these need the second tangent
  }
  const s = Math.sin(RAD(phi));
  const c = Math.cos(RAD(phi));
  const d = r / s;
  const t = (r * c) / s;
  const chord = 2 * r * c;
  const model: Record<string, number> = {
    r,
    d,
    t,
    chord,
    halfChord: r * c,
    angleP: 2 * phi,
    angleO: 180 - 2 * phi,
    angleOPA: phi,
    angleAOP: 90 - phi,
    angleOAB: phi,
    anglePAB: 90 - phi,
    areaOAPB: r * t,
    areaOAP: (r * t) / 2,
    perimeterOAPB: 2 * r + 2 * t,
    /** distance from P to the nearest point of the circle */
    pToCircle: d - r,
    /** distance from P to the farthest point of the circle */
    pFar: d + r,
    dOverT: d / t,
    /** OM, M the foot of the chord of contact on OP */
    OM: r * s,
    PM: d - r * s,
  };
  const u = p.scaleFree ? "none" : p.unit;
  const sc = new GeoScene();
  sc.p("O", 0, 0);
  sc.p("P", d, 0);
  sc.p("A", r * s, r * c);
  if (!single) sc.p("B", r * s, -r * c);
  sc.circle("O", r);
  sc.dot("O");
  const lab = (expr: Len | undefined, name: string) => (expr !== undefined && !p.scaleFree ? lenText(expr, u as GeoUnit) : q(labels, name));
  // The distance label goes outside the circle when there is room there, else at the midpoint.
  if (draw.op !== false) sc.seg("O", "P", "radius", lab(p.d, "d"), "b", d - r > 0.35 * d ? (d + r) / (2 * d) : 0.5);
  sc.seg("P", "A", "tangent", lab(p.t, "t"), "a");
  sc.seg("O", "A", "radius", lab(p.r, "r"), "a");
  sc.right("A", "O", "P");
  if (!single) {
    sc.seg("P", "B", "tangent");
    sc.seg("O", "B", "radius");
    sc.right("B", "O", "P");
  }
  if (p.gap !== undefined || draw.third) sc.p("E", r, 0);
  if (p.gap !== undefined) sc.seg("E", "P", "radius", lab(p.gap, "gap"), "a");
  if (draw.third) {
    if (single) return null;
    const ce = (d - r) * Math.tan(RAD(phi));
    sc.p("C", r, ce);
    sc.p("D", r, -ce);
    sc.seg("C", "D", "tangent");
    sc.right("E", "O", "C");
    model.thirdCE = ce;
    model.thirdCD = 2 * ce;
    model.thirdPC = (d - r) / Math.cos(RAD(phi));
    model.perimeterPCD = 2 * t;
  }
  const showChord = !single && (draw.chord || p.chord !== undefined || q(labels, "chord") !== undefined || p.angleOAB !== undefined || p.anglePAB !== undefined);
  if (showChord) {
    sc.p("M", r * s, 0);
    sc.seg("A", "B", "chord", lab(p.chord, "chord"), "r", 0.8);
  }
  const ang = (given: number | undefined, name: string, at: string, from: string, to: string, value: number) => {
    if (given !== undefined) sc.angle(at, from, to, given, ANGLE_LABEL(given));
    else if (q(labels, name) !== undefined) sc.angle(at, from, to, round6(value), q(labels, name));
  };
  if (!single) {
    ang(p.angleP, "angleP", "P", "A", "B", 2 * phi);
    ang(p.angleO, "angleO", "O", "A", "B", 180 - 2 * phi);
    ang(p.angleOAB, "angleOAB", "A", "O", "B", phi);
    ang(p.anglePAB, "anglePAB", "A", "P", "B", 90 - phi);
  }
  ang(p.angleOPA, "angleOPA", "P", "O", "A", phi);
  ang(p.angleAOP, "angleAOP", "O", "A", "P", 90 - phi);

  sc.letterAt("O", -4, 18);
  sc.letter("P", "O");
  sc.letter("A", "O");
  if (!single) sc.letter("B", "O");
  if (showChord) sc.letterAt("M", 10, 16);
  if (p.gap !== undefined || draw.third) sc.letterAt("E", -11, 16);
  if (draw.third) {
    sc.letterAt("C", 8, -6);
    sc.letterAt("D", 8, 16);
  }

  const facts = [`A circle with centre O${p.r && !p.scaleFree ? ` and radius ${lenText(p.r, p.unit)}` : ""}.`];
  facts.push(single ? "PA is a tangent from the external point P, touching the circle at A; OA is perpendicular to PA." : "PA and PB are tangents from the external point P, touching the circle at A and B; each radius is perpendicular to its tangent, and PA = PB.");
  if (p.d && !p.scaleFree) facts.push(`OP = ${lenText(p.d, p.unit)}.`);
  if (p.t && !p.scaleFree) facts.push(`PA = ${lenText(p.t, p.unit)}.`);
  if (p.chord && !p.scaleFree) facts.push(`AB = ${lenText(p.chord, p.unit)}.`);
  for (const [k, name] of [
    ["angleP", "∠APB"],
    ["angleO", "∠AOB"],
    ["angleOPA", "∠OPA"],
    ["angleAOP", "∠AOP"],
    ["angleOAB", "∠OAB"],
    ["anglePAB", "∠PAB"],
  ] as const) {
    const v = p[k];
    if (v !== undefined) facts.push(`${name} = ${v}°.`);
  }
  sc.facts = facts;
  const spec = finishGeo(sc, {
    unit: u,
    title: single ? "Circle with a tangent from an external point" : "Circle with two tangents from an external point",
    note: p.scaleFree ? "Not to scale: only the angles are drawn exactly." : undefined,
    labels,
    defaults: { O: "O", P: "P", A: "A", B: "B", E: "E", C: "C", D: "D" },
  });
  return spec ? { spec, model } : null;
}

// ───────────────────────── concentric circles ─────────────────────────

export function buildConcentricChord(p: ConcentricChordParams, labels: GeoLabels = {}): GeoBuildResult | null {
  if (p.scaleFree) return null;
  let R = num(p.R);
  let r = num(p.r);
  const chord = num(p.chord);
  const half0 = num(p.half);
  for (const v of [R, r, chord, half0]) if (v !== undefined && !Number.isFinite(v)) return null;
  const halves = [chord !== undefined ? chord / 2 : undefined, half0].filter((v): v is number => v !== undefined);
  if (halves.length === 2 && !agrees(halves[0], halves[1])) return null;
  let half = halves[0];
  const known = [R, r, half].filter((v) => v !== undefined).length;
  if (known < 2) return null;
  if (R === undefined) R = Math.hypot(r!, half!);
  if (r === undefined) {
    if (half! >= R) return null;
    r = Math.sqrt(R * R - half! * half!);
  }
  if (r >= R) return null;
  const h = Math.sqrt(R * R - r * r);
  if (half !== undefined && !agrees(half, h)) return null; // three givens that disagree
  half = h;
  const model = { R, r, chord: 2 * h, half: h, ringArea: Math.PI * (R * R - r * r) };
  const sc = new GeoScene();
  sc.p("O", 0, 0);
  sc.p("M", 0, -r);
  sc.p("A", -h, -r);
  sc.p("B", h, -r);
  sc.circle("O", R);
  sc.circle("O", r);
  sc.dot("O");
  const lab = (expr: Len | undefined, name: string) => (expr !== undefined ? lenText(expr, p.unit) : q(labels, name));
  sc.seg("O", "M", "radius", lab(p.r, "r"), "r");
  sc.seg("O", "A", "radius", lab(p.R, "R"), "a");
  if (p.half !== undefined || (p.chord === undefined && q(labels, "half") !== undefined)) {
    sc.seg("A", "M", "chord", lab(p.half, "half"), "b");
    sc.seg("M", "B", "chord");
  } else {
    sc.seg("A", "B", "chord", lab(p.chord, "chord"), "b", 0.22);
  }
  sc.right("M", "O", "B");
  sc.letterAt("O", -12, -6);
  sc.letterAt("M", 0, 20);
  sc.letter("A", "O");
  sc.letter("B", "O");
  sc.facts = [
    `Two concentric circles with centre O${p.R ? `, outer radius ${lenText(p.R, p.unit)}` : ""}${p.r ? `, inner radius ${lenText(p.r, p.unit)}` : ""}.`,
    `The chord AB of the larger circle touches the smaller circle at M, so OM is perpendicular to AB and M bisects AB.`,
    ...(p.chord ? [`AB = ${lenText(p.chord, p.unit)}.`] : []),
  ];
  const spec = finishGeo(sc, {
    unit: p.unit,
    title: "Two concentric circles with a chord of the larger touching the smaller",
    labels,
    defaults: { O: "O", M: "M", A: "A", B: "B" },
  });
  return spec ? { spec, model } : null;
}

// ───────────────────────── tangent and chord ─────────────────────────

export function buildTangentChord(p: TangentChordParams, labels: GeoLabels = {}): GeoBuildResult | null {
  // Angles only: this template never carries a length.
  if (!p.scaleFree) return null;
  if (!openAngle(p.angleT, 0, 90) || !openAngle(p.angleO, 0, 180) || !openAngle(p.angleOPQ, 0, 90)) return null;
  const thetas: number[] = [];
  if (p.angleT !== undefined) thetas.push(p.angleT);
  if (p.angleO !== undefined) thetas.push(p.angleO / 2);
  if (p.angleOPQ !== undefined) thetas.push(90 - p.angleOPQ);
  if (thetas.length === 0) return null;
  const th = thetas[0];
  if (!thetas.every((x) => Math.abs(x - th) < 1e-6)) return null;
  const r = 1;
  const model = { angleT: th, angleO: 2 * th, angleOPQ: 90 - th, angleOQP: 90 - th, angleInMajorArc: th, angleInMinorArc: 180 - th };
  const sc = new GeoScene();
  sc.p("O", 0, 0);
  sc.p("P", 0, -r);
  sc.p("T", 1.35 * r, -r);
  sc.p("T2", -1.1 * r, -r);
  sc.p("Q", r * Math.sin(RAD(2 * th)), -r * Math.cos(RAD(2 * th)));
  sc.circle("O", r);
  sc.dot("O");
  sc.seg("T2", "T", "tangent");
  sc.seg("O", "P", "radius");
  sc.seg("O", "Q", "radius");
  sc.seg("P", "Q", "chord");
  sc.right("P", "O", "T2");
  const ang = (given: number | undefined, name: string, at: string, from: string, to: string, value: number) => {
    if (given !== undefined) sc.angle(at, from, to, given, ANGLE_LABEL(given));
    else if (q(labels, name) !== undefined) sc.angle(at, from, to, round6(value), q(labels, name));
  };
  ang(p.angleT, "angleT", "P", "T", "Q", th);
  ang(p.angleO, "angleO", "O", "P", "Q", 2 * th);
  ang(p.angleOPQ, "angleOPQ", "P", "O", "Q", 90 - th);
  sc.letterAt("O", -10, -6);
  sc.letterAt("P", 0, 20);
  sc.letter("Q", "O");
  sc.letterAt("T", 4, 18);
  sc.facts = [
    "A circle with centre O; PT is the tangent at P and PQ is a chord, so OP is perpendicular to PT.",
    ...(p.angleT !== undefined ? [`The chord PQ makes ${p.angleT}° with the tangent.`] : []),
    ...(p.angleO !== undefined ? [`∠POQ = ${p.angleO}°.`] : []),
    ...(p.angleOPQ !== undefined ? [`∠OPQ = ${p.angleOPQ}°.`] : []),
  ];
  const spec = finishGeo(sc, {
    unit: "none",
    title: "Circle with a tangent and a chord at the point of contact",
    note: "Not to scale: only the angles are drawn exactly.",
    labels,
    defaults: { O: "O", P: "P", Q: "Q", T: "T" },
  });
  return spec ? { spec, model } : null;
}

// ───────────────────────── incircle of a triangle ─────────────────────────

type Xyz = { x?: number; y?: number; z?: number };

function solveIncircle(p: IncircleParams): { x: number; y: number; z: number } | null {
  const vals: Record<string, number | undefined> = {};
  for (const k of ["AB", "BC", "CA", "x", "y", "z", "r", "perimeter"] as const) {
    const v = num(p[k]);
    if (v !== undefined && !Number.isFinite(v)) return null;
    vals[k] = v;
  }
  if (p.angleB !== undefined && p.angleB !== 90) return null;
  const right = p.angleB === 90;
  const t: Xyz = { x: vals.x, y: vals.y, z: vals.z };
  // Sides as sums of tangent lengths; a right angle at B adds the hypotenuse.
  let CA = vals.CA;
  if (right && CA === undefined && vals.AB !== undefined && vals.BC !== undefined) CA = Math.hypot(vals.AB, vals.BC);
  if (right && vals.r !== undefined) t.y = t.y ?? vals.r; // the square at B: BD = BF = r
  const eqs: Array<[Array<keyof Xyz>, number]> = [];
  if (vals.AB !== undefined) eqs.push([["x", "y"], vals.AB]);
  if (vals.BC !== undefined) eqs.push([["y", "z"], vals.BC]);
  if (CA !== undefined) eqs.push([["z", "x"], CA]);
  if (vals.perimeter !== undefined) eqs.push([["x", "y", "z"], vals.perimeter / 2]);
  const known = () => (["x", "y", "z"] as const).filter((k) => t[k] !== undefined).length;
  for (let pass = 0; pass < 6; pass++) {
    for (const [ks, v] of eqs) {
      const unk = ks.filter((k) => t[k] === undefined);
      if (unk.length === 1) t[unk[0]] = v - ks.filter((k) => k !== unk[0]).reduce((a, k) => a + (t[k] as number), 0);
    }
    // Three side equations with no single tangent known: x + y + z = (AB + BC + CA)/2.
    if (known() === 0 && vals.AB !== undefined && vals.BC !== undefined && CA !== undefined) {
      const s = (vals.AB + vals.BC + CA) / 2;
      t.x = s - vals.BC;
      t.y = s - CA;
      t.z = s - vals.AB;
    }
    if (known() === 2 && right) {
      if (t.x === undefined) t.x = (t.y! * (t.y! + t.z!)) / (t.z! - t.y!);
      else if (t.z === undefined) t.z = (t.y! * (t.y! + t.x!)) / (t.x! - t.y!);
      else if (t.y === undefined) t.y = (-(t.x + t.z!) + Math.sqrt((t.x + t.z!) ** 2 + 4 * t.x * t.z!)) / 2;
    }
    if (known() === 2 && vals.r !== undefined && !right) {
      const r2 = vals.r * vals.r;
      const k = (["x", "y", "z"] as const).find((kk) => t[kk] === undefined)!;
      const [a, b] = (["x", "y", "z"] as const).filter((kk) => kk !== k).map((kk) => t[kk] as number);
      if (a * b <= r2) return null;
      t[k] = (r2 * (a + b)) / (a * b - r2);
    }
  }
  if (known() !== 3) return null;
  const x = t.x!;
  const y = t.y!;
  const z = t.z!;
  if (!(x > 0 && y > 0 && z > 0)) return null;
  // Every given must hold.
  const checks: Array<[number | undefined, number]> = [
    [vals.AB, x + y],
    [vals.BC, y + z],
    [vals.CA, z + x],
    [vals.x, x],
    [vals.y, y],
    [vals.z, z],
    [vals.perimeter, 2 * (x + y + z)],
    [vals.r, Math.sqrt((x * y * z) / (x + y + z))],
  ];
  for (const [g, m] of checks) if (g !== undefined && !agrees(g, m)) return null;
  if (right) {
    const a = y + z;
    const c = x + y;
    const b = z + x;
    if (Math.abs(a * a + c * c - b * b) > 0.01 * b * b) return null;
  }
  return { x, y, z };
}

export function buildIncircle(p: IncircleParams, labels: GeoLabels = {}, draw: CircleDraw = {}): GeoBuildResult | null {
  if (p.scaleFree) return null;
  const sol = solveIncircle(p);
  if (!sol) return null;
  const { x, y, z } = sol;
  const a = y + z; // BC
  const b = z + x; // CA
  const c = x + y; // AB
  const s = x + y + z;
  const r = Math.sqrt((x * y * z) / s);
  const Ax = (c * c - b * b + a * a) / (2 * a);
  const Ay = Math.sqrt(Math.max(c * c - Ax * Ax, 0));
  const A = { x: Ax, y: Ay };
  const B = { x: 0, y: 0 };
  const C = { x: a, y: 0 };
  const I = { x: (a * A.x + b * B.x + c * C.x) / (a + b + c), y: (a * A.y + b * B.y + c * C.y) / (a + b + c) };
  const at = (P: { x: number; y: number }, Q: { x: number; y: number }, len: number, total: number) => ({
    x: P.x + ((Q.x - P.x) * len) / total,
    y: P.y + ((Q.y - P.y) * len) / total,
  });
  const D = at(B, C, y, a);
  const E = at(C, A, z, b);
  const F = at(A, B, x, c);
  const angle = (opp: number, s1: number, s2: number) => Math.acos((s1 * s1 + s2 * s2 - opp * opp) / (2 * s1 * s2)) / DEG;
  const model: Record<string, number> = {
    AB: c,
    BC: a,
    CA: b,
    x,
    y,
    z,
    r,
    s,
    perimeter: 2 * s,
    area: r * s,
    angleA: angle(a, b, c),
    angleB: angle(b, a, c),
    angleC: angle(c, a, b),
    /** distance from a vertex to the centre (A, B, C) */
    OA: Math.hypot(x, r),
    OB: Math.hypot(y, r),
    OC: Math.hypot(z, r),
  };
  const sc = new GeoScene();
  for (const [id, P] of Object.entries({ A, B, C, D, E, F, O: I })) sc.p(id, P.x, P.y);
  const lab = (expr: Len | undefined, name: string) => (expr !== undefined ? lenText(expr, p.unit) : q(labels, name));
  // Whole sides, labelled OUTSIDE; tangent lengths, labelled INSIDE on their own part.
  // A side's label sits in the middle of its LONGER tangent part, clear of the contact point's letter.
  const away = (part: number, whole: number) => (part > whole / 2 ? part / (2 * whole) : (part + whole) / (2 * whole));
  sc.seg("A", "B", "edge", lab(p.AB, "AB"), "l", away(x, c));
  sc.seg("B", "C", "edge", lab(p.BC, "BC"), "b", away(y, a));
  sc.seg("C", "A", "edge", lab(p.CA, "CA"), "r", away(z, b));
  if (p.x !== undefined || q(labels, "x")) {
    if (draw.xOnAE) sc.seg("A", "E", "edge", lab(p.x, "x"), p.CA === undefined ? "r" : "l");
    else sc.seg("A", "F", "edge", lab(p.x, "x"), "r");
  }
  if (p.y !== undefined || q(labels, "y")) sc.seg("B", "D", "edge", lab(p.y, "y"), "a");
  if (p.z !== undefined || q(labels, "z")) sc.seg("C", "E", "edge", lab(p.z, "z"), "l");
  sc.circle("O", r);
  sc.dot("O");
  sc.seg("O", "D", "radius", lab(p.r, "r"), "r");
  sc.right("D", "O", "C");
  if (p.angleB === 90) sc.right("B", "A", "C");
  sc.letterAt("A", 0, -9);
  sc.letterAt("B", -10, 16);
  sc.letterAt("C", 10, 16);
  sc.letterAt("D", -8, 18);
  sc.letter("E", "O");
  sc.letter("F", "O");
  sc.letterAt("O", -10, -6);
  const given = (["AB", "BC", "CA"] as const).filter((k) => p[k] !== undefined).map((k) => `${k} = ${lenText(p[k]!, p.unit)}`);
  sc.facts = [
    `A circle with centre O is inscribed in triangle ABC${p.angleB === 90 ? ", right-angled at B" : ""}; it touches BC at D, CA at E and AB at F, and the tangents from each vertex are equal (AF = AE, BD = BF, CD = CE).`,
    ...(given.length ? [`${given.join(", ")}.`] : []),
    ...(p.r ? [`The radius is ${lenText(p.r, p.unit)}.`] : []),
  ];
  const spec = finishGeo(sc, {
    unit: p.unit,
    title: "Circle inscribed in a triangle",
    labels,
    defaults: { A: "A", B: "B", C: "C", D: "D", E: "E", F: "F", O: "O" },
    pad: { l: 64, r: 64, t: 26, b: 30 },
  });
  return spec ? { spec, model } : null;
}

// ───────────────────────── common tangent of two circles ─────────────────────────

export function buildCommonTangent(p: CommonTangentParams, labels: GeoLabels = {}, draw: CircleDraw = {}): GeoBuildResult | null {
  if (p.scaleFree) return null;
  const kind = draw.kind ?? "direct";
  let R = num(p.R);
  let r = num(p.r);
  let d = num(p.d);
  let L = num(p.L);
  for (const v of [R, r, d, L]) if (v !== undefined && !Number.isFinite(v)) return null;
  const sgn = kind === "direct" ? -1 : 1;
  const k = (RR: number, rr: number) => RR + sgn * rr; // R − r (direct) or R + r (transverse)
  const known = [R, r, d, L].filter((v) => v !== undefined).length;
  if (known < 3) return null;
  if (L === undefined) {
    const kk = k(R!, r!);
    if (d! <= Math.abs(kk)) return null;
    L = Math.sqrt(d! * d! - kk * kk);
  } else if (d === undefined) d = Math.hypot(L, k(R!, r!));
  else if (R === undefined) R = kind === "direct" ? r! + Math.sqrt(d * d - L * L) : Math.sqrt(d * d - L * L) - r!;
  else if (r === undefined) r = kind === "direct" ? R - Math.sqrt(d * d - L * L) : Math.sqrt(d * d - L * L) - R;
  if (!(R! > 0 && r! > 0 && r! <= R! && d! > 0 && L > 0)) return null;
  const kk = k(R!, r!);
  if (!agrees(L * L + kk * kk, d! * d!)) return null; // four givens that disagree
  if (kind === "transverse" && d! <= R! + r!) return null;
  if (kind === "direct" && d! < R! - r!) return null;
  const nx = kk / d!;
  const ny = Math.sqrt(1 - nx * nx);
  const A = { x: R! * nx, y: R! * ny };
  const B = kind === "direct" ? { x: d! + r! * nx, y: r! * ny } : { x: d! - r! * nx, y: -r! * ny };
  const model: Record<string, number> = { R: R!, r: r!, d: d!, L, ...(kind === "transverse" ? { OX: (d! * R!) / (R! + r!), CX: (d! * r!) / (R! + r!) } : {}) };
  const sc = new GeoScene();
  sc.p("O", 0, 0);
  sc.p("C", d!, 0);
  sc.p("A", A.x, A.y);
  sc.p("B", B.x, B.y);
  sc.circle("O", R!);
  sc.circle("C", r!);
  sc.dot("O");
  sc.dot("C");
  const lab = (expr: Len | undefined, name: string) => (expr !== undefined ? lenText(expr, p.unit) : q(labels, name));
  sc.seg("A", "B", "tangent", lab(p.L, "L"), kind === "direct" ? "a" : "r");
  sc.seg("O", "A", "radius", lab(p.R, "R"), "l");
  sc.seg("C", "B", "radius", lab(p.r, "r"), "r");
  sc.seg("O", "C", "construction", lab(p.d, "d"), "b", kind === "transverse" ? 0.3 : 0.5);
  sc.right("A", "O", "B");
  sc.right("B", "C", "A");
  if (kind === "transverse") {
    sc.p("X", (d! * R!) / (R! + r!), 0);
    sc.letterAt("X", 0, 18);
  }
  sc.letterAt("O", -10, 16);
  sc.letterAt("C", 12, kind === "transverse" ? -7 : 16);
  sc.letter("A", "O");
  sc.letter("B", "C");
  sc.facts = [
    `Two circles with centres O and C${p.R ? `, radii ${lenText(p.R, p.unit)}` : ""}${p.r ? ` and ${lenText(p.r, p.unit)}` : ""}${p.d ? `, centres ${lenText(p.d, p.unit)} apart` : ""}.`,
    `AB is a common tangent touching them at A and B (${kind === "direct" ? "both circles on the same side of it" : "the circles on opposite sides of it"}), so OA and CB are both perpendicular to AB.`,
  ];
  const spec = finishGeo(sc, {
    unit: p.unit,
    title: "Two circles with a common tangent",
    labels,
    defaults: { O: "O", C: "C", A: "A", B: "B", X: "X" },
  });
  return spec ? { spec, model } : null;
}

// ───────────────────────── a chord parallel to a tangent ─────────────────────────

export function buildParallelChord(p: ParallelChordParams, labels: GeoLabels = {}): GeoBuildResult | null {
  if (p.scaleFree) return null;
  let r = num(p.r);
  const h = num(p.h);
  const chord = num(p.chord);
  for (const v of [r, h, chord]) if (v !== undefined && !Number.isFinite(v)) return null;
  let half = chord !== undefined ? chord / 2 : undefined;
  // The chord's distance from the tangent is always needed: a radius and a chord alone fit two chords.
  if (h === undefined) return null;
  if (r === undefined) {
    if (half === undefined) return null;
    r = (half * half + h * h) / (2 * h);
  }
  if (!(h > 0 && h < 2 * r)) return null;
  const hh = Math.sqrt(r * r - (r - h) * (r - h));
  if (half !== undefined && !agrees(half, hh)) return null;
  half = hh;
  const model = { r, h, chord: 2 * half, half, OM: Math.abs(r - h) };
  const sc = new GeoScene();
  sc.p("O", 0, 0);
  sc.p("P", 0, -r);
  sc.p("M", 0, -r + h);
  sc.p("C", -half, -r + h);
  sc.p("D", half, -r + h);
  sc.p("T1", -1.25 * r, -r);
  sc.p("T2", 1.25 * r, -r);
  sc.circle("O", r);
  sc.dot("O");
  const lab = (expr: Len | undefined, name: string) => (expr !== undefined ? lenText(expr, p.unit) : q(labels, name));
  sc.seg("T1", "T2", "tangent");
  sc.seg("C", "D", "chord", lab(p.chord, "chord"), "a", 0.25);
  sc.seg("P", "M", "radius", lab(p.h, "h"), "r");
  // A radius to an end of the chord, labelled when the row gives the radius.
  sc.seg("O", "C", "radius", lab(p.r, "r"), "l");
  sc.seg("O", "P", "construction");
  sc.right("P", "O", "T2");
  sc.right("M", "O", "D");
  sc.letterAt("O", 11, -4);
  sc.letterAt("P", -10, 18);
  sc.letterAt("M", 10, h < r ? 16 : -6);
  sc.letter("C", "O");
  sc.letter("D", "O");
  sc.facts = [
    `A circle with centre O${p.r ? ` and radius ${lenText(p.r, p.unit)}` : ""}; the tangent at P is perpendicular to OP, and the chord CD is parallel to the tangent, so OP is perpendicular to CD and bisects it at M.`,
    ...(p.h ? [`PM = ${lenText(p.h, p.unit)}.`] : []),
    ...(p.chord ? [`CD = ${lenText(p.chord, p.unit)}.`] : []),
  ];
  const spec = finishGeo(sc, {
    unit: p.unit,
    title: "Circle with a chord parallel to a tangent",
    labels,
    defaults: { O: "O", P: "P", M: "M", C: "C", D: "D" },
  });
  return spec ? { spec, model } : null;
}

function round6(v: number): number {
  return Math.round(v * 1e6) / 1e6;
}

export function buildCircle(p: CircleParams, labels: GeoLabels = {}, draw: CircleDraw = {}): GeoBuildResult | null {
  switch (p.template) {
    case "tangentPair":
      return buildTangentPair(p, labels, draw);
    case "concentricChord":
      return buildConcentricChord(p, labels);
    case "tangentChord":
      return buildTangentChord(p, labels);
    case "incircle":
      return buildIncircle(p, labels, draw);
    case "commonTangent":
      return buildCommonTangent(p, labels, draw);
    case "parallelChord":
      return buildParallelChord(p, labels);
    default:
      return null;
  }
}

export type { FigureSpec };
