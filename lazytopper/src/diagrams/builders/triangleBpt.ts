/**
 * Triangles — the Basic Proportionality configuration (DE ∥ BC), a pure builder from a
 * row's OWN numbers to a FigureSpec (DIAGRAMS-1 PR-2d).
 *
 * D lies on AB and E on AC with DE ∥ BC, so AD/DB = AE/EC (Thales / BPT). The builder
 * SOLVES the configuration from the row's lengths (a length may be an expression in the
 * row's own unknown x, with x the value the row's own solution derives), checks every
 * given against BPT, and draws it with ONE uniform scale: D and E are at their true
 * positions along AB and AC and DE is drawn exactly parallel to BC.
 *
 * The SHAPE of the triangle is fixed only when a third side (BC, or DE) or the angle at
 * A is given. Otherwise the angle at A is a drawing choice and the figure says so in its
 * note — the lengths along AB and AC are still to scale.
 *
 * REFUSAL (null): lengths that break BPT (a converse row whose DE is not parallel to
 * BC), a side length that is not positive, a triangle that cannot close, too few
 * lengths to place D and E, or a drawing too small to read.
 */
import { DEG, evalLengthExpr, prettyExpr } from "../figureGeometry";
import { GeoScene, agrees, finishGeo, lenText, q } from "./geometryCommon";
import type { GeoBuildResult, GeoLabels, GeoUnit, Len } from "./geometryCommon";

export interface BptParams {
  template: "bpt";
  /** "none" when the row gives bare numbers (no unit). */
  unit: GeoUnit | "none";
  AD?: Len;
  DB?: Len;
  AB?: Len;
  AE?: Len;
  EC?: Len;
  AC?: Len;
  DE?: Len;
  BC?: Len;
  /** The angle at A, when the row gives it. */
  angleA?: number;
  /** The row's own unknown x, as its solution derives it; lengths may be written in x. */
  x?: Len;
}

/** The angle at A drawn when the row does not fix the triangle's shape (an illustration). */
export const ILLUSTRATIVE_ANGLE_A = 55;
export const ILLUSTRATIVE_NOTE = "The question does not fix the angle at A, so the triangle's shape is illustrative; lengths along AB and AC are to scale.";

const KEYS = ["AD", "DB", "AB", "AE", "EC", "AC", "DE", "BC"] as const;
type Key = (typeof KEYS)[number];

function hasX(expr: string): boolean {
  return /x/i.test(expr);
}

/** Evaluate a length that may be written in x ("x − 2", "3x + 4", "2x"). */
export function evalInX(expr: Len, x: number | undefined): number {
  if (!hasX(expr)) return evalLengthExpr(expr);
  if (x === undefined || !Number.isFinite(x)) return NaN;
  return evalLengthExpr(expr.replace(/x/gi, `(${x})`));
}

export function buildBpt(p: BptParams, labels: GeoLabels = {}): GeoBuildResult | null {
  const x = p.x !== undefined ? evalLengthExpr(p.x) : undefined;
  if (p.x !== undefined && !Number.isFinite(x as number)) return null;
  const v: Partial<Record<Key, number>> = {};
  for (const k of KEYS) {
    const e = p[k];
    if (e === undefined) continue;
    const n = evalInX(e, x);
    if (!(Number.isFinite(n) && n > 0)) return null; // a non-positive length: the row's x is wrong for this figure
    v[k] = n;
  }
  // The ratio k = AD/AB = AE/AC from whichever side has two of its three lengths.
  const sideRatio = (part1?: number, part2?: number, whole?: number): number | undefined => {
    if (part1 !== undefined && part2 !== undefined) {
      if (whole !== undefined && !agrees(part1 + part2, whole)) return NaN;
      return part1 / (part1 + part2);
    }
    if (part1 !== undefined && whole !== undefined) return whole > part1 ? part1 / whole : NaN;
    if (part2 !== undefined && whole !== undefined) return whole > part2 ? 1 - part2 / whole : NaN;
    return undefined;
  };
  const kB = sideRatio(v.AD, v.DB, v.AB);
  const kC = sideRatio(v.AE, v.EC, v.AC);
  if (Number.isNaN(kB) || Number.isNaN(kC)) return null;
  const kDE = v.DE !== undefined && v.BC !== undefined ? v.DE / v.BC : undefined;
  const ks = [kB, kC, kDE].filter((k): k is number => k !== undefined);
  if (ks.length === 0) return null;
  const k = ks[0];
  if (!(k > 0 && k < 1)) return null;
  if (!ks.every((kk) => agrees(kk, k))) return null; // BPT fails: DE is not parallel to BC

  const wholeOf = (part1?: number, part2?: number, whole?: number): number | undefined =>
    whole ?? (part1 !== undefined ? part1 / k : part2 !== undefined ? part2 / (1 - k) : undefined);
  const AB = wholeOf(v.AD, v.DB, v.AB);
  const AC = wholeOf(v.AE, v.EC, v.AC);
  if (AB === undefined || AC === undefined) return null; // one side has no length at all

  // The third side fixes the shape: BC directly, or DE = k·BC.
  const BCs = [v.BC, v.DE !== undefined ? v.DE / k : undefined].filter((b): b is number => b !== undefined);
  if (BCs.length === 2 && !agrees(BCs[0], BCs[1])) return null;
  let angleA: number;
  let shapeFixed = true;
  if (BCs.length > 0) {
    const BC = BCs[0];
    if (!(BC < AB + AC && AB < BC + AC && AC < AB + BC)) return null; // the triangle cannot close
    angleA = Math.acos((AB * AB + AC * AC - BC * BC) / (2 * AB * AC)) / DEG;
    if (p.angleA !== undefined && Math.abs(p.angleA - angleA) > 0.5) return null;
  } else if (p.angleA !== undefined) {
    if (!(p.angleA > 0 && p.angleA < 180)) return null;
    angleA = p.angleA;
  } else {
    angleA = ILLUSTRATIVE_ANGLE_A;
    shapeFixed = false;
  }
  const BC = Math.sqrt(AB * AB + AC * AC - 2 * AB * AC * Math.cos(angleA * DEG));
  // A tiny or reflex-like apex is illegible.
  if (angleA < 15 || angleA > 120) return null; // a very flat triangle crowds every label at A

  // World: B at the origin, C on the x-axis, A above.
  const Ax = (AB * AB - AC * AC + BC * BC) / (2 * BC);
  const Ay = Math.sqrt(Math.max(AB * AB - Ax * Ax, 0));
  const A = { x: Ax, y: Ay };
  const B = { x: 0, y: 0 };
  const C = { x: BC, y: 0 };
  const lerp = (P: { x: number; y: number }, Q: { x: number; y: number }, t: number) => ({ x: P.x + (Q.x - P.x) * t, y: P.y + (Q.y - P.y) * t });
  const D = lerp(A, B, k);
  const E = lerp(A, C, k);
  const model: Record<string, number> = {
    k,
    ratio: k / (1 - k), // AD/DB = AE/EC
    AD: AB * k,
    DB: AB * (1 - k),
    AB,
    AE: AC * k,
    EC: AC * (1 - k),
    AC,
    DE: BC * k,
    BC,
    angleA,
    ...(x !== undefined ? { x } : {}),
  };

  const sc = new GeoScene();
  sc.p("A", A.x, A.y);
  sc.p("B", B.x, B.y);
  sc.p("C", C.x, C.y);
  sc.p("D", D.x, D.y);
  sc.p("E", E.x, E.y);
  const text = (expr: Len) => (hasX(expr) ? prettyExpr(expr) : lenText(expr, p.unit));
  const lab = (key: Key) => (p[key] !== undefined ? text(p[key]!) : q(labels, key));
  // A whole side given alongside a part is shown on a dimension line just outside.
  const wholeLeft = p.AB !== undefined && (p.AD !== undefined || p.DB !== undefined);
  const wholeRight = p.AC !== undefined && (p.AE !== undefined || p.EC !== undefined);
  const leftLabelOnParts = !(p.AB !== undefined && !wholeLeft);
  const rightLabelOnParts = !(p.AC !== undefined && !wholeRight);
  if (leftLabelOnParts) {
    sc.seg("A", "D", "edge", lab("AD"), "l");
    sc.seg("D", "B", "edge", lab("DB"), "l");
  } else {
    sc.seg("A", "D", "edge");
    sc.seg("D", "B", "edge");
  }
  if (rightLabelOnParts) {
    sc.seg("A", "E", "edge", lab("AE"), "r");
    sc.seg("E", "C", "edge", lab("EC"), "r");
  } else {
    sc.seg("A", "E", "edge");
    sc.seg("E", "C", "edge");
  }
  sc.seg("B", "C", "edge", lab("BC"), "b");
  sc.seg("D", "E", "edge", lab("DE"), "a");
  // Whole sides: on the side itself (an invisible-free overlay) when no part is labelled,
  // else on a dimension line offset outward.
  const scaleEst = 260 / Math.max(BC, Ay, 1e-9);
  const off = 22 / scaleEst;
  /** The whole side's label sits beside the part that carries NO label, clear of the part's own label. */
  const wholeAt = (near?: Len, far?: Len) => (near !== undefined && far === undefined ? (1 + k) / 2 : far !== undefined && near === undefined ? k / 2 : 0.5);
  const G = { x: (A.x + B.x + C.x) / 3, y: (A.y + B.y + C.y) / 3 };
  /** The unit normal of side PQ that points AWAY from the triangle's interior, times the offset. */
  const outward = (P: { x: number; y: number }, Q: { x: number; y: number }) => {
    const dx = Q.x - P.x;
    const dy = Q.y - P.y;
    const n = Math.hypot(dx, dy);
    let nx = -dy / n;
    let ny = dx / n;
    if (nx * (P.x - G.x) + ny * (P.y - G.y) < 0) {
      nx = -nx;
      ny = -ny;
    }
    return { x: nx * off, y: ny * off };
  };
  if (p.AB !== undefined) {
    const o = outward(A, B);
    sc.p("ab1", A.x + o.x, A.y + o.y);
    sc.p("ab2", B.x + o.x, B.y + o.y);
    sc.seg("ab1", "ab2", "measure", text(p.AB), "l", wholeAt(p.AD, p.DB));
  }
  if (p.AC !== undefined) {
    const o = outward(A, C);
    sc.p("ac1", A.x + o.x, A.y + o.y);
    sc.p("ac2", C.x + o.x, C.y + o.y);
    sc.seg("ac1", "ac2", "measure", text(p.AC), "r", wholeAt(p.AE, p.EC));
  }
  if (p.angleA === 90) sc.right("A", "B", "C");
  else if (p.angleA !== undefined) sc.angle("A", "B", "C", p.angleA, `${p.angleA}°`);
  sc.letterAt("A", 0, -9);
  sc.letterAt("B", -10, 16);
  sc.letterAt("C", 10, 16);
  sc.letterAt("D", -14, -2);
  sc.letterAt("E", 14, -2);
  const given = KEYS.filter((kk) => p[kk] !== undefined).map((kk) => `${kk} = ${text(p[kk]!)}`);
  sc.facts = [
    "Triangle ABC with D on AB and E on AC such that DE is parallel to BC, so AD/DB = AE/EC.",
    ...(given.length ? [`Given: ${given.join(", ")}.`] : []),
    ...(p.x !== undefined ? [`x = ${prettyExpr(p.x)}.`] : []),
  ];
  const spec = finishGeo(sc, {
    unit: p.unit,
    title: "Triangle with a line parallel to one side",
    note: shapeFixed ? undefined : ILLUSTRATIVE_NOTE,
    labels,
    defaults: { A: "A", B: "B", C: "C", D: "D", E: "E" },
    pad: { l: 64, r: 64, t: 26, b: 30 },
  });
  return spec ? { spec, model } : null;
}
