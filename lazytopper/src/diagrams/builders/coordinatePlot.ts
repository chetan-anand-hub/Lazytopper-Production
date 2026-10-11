/**
 * Coordinate geometry — a plot of the row's OWN points on true axes (DIAGRAMS-1 PR-2d).
 *
 * Every point is placed at its coordinates with ONE uniform scale (one unit on the
 * x-axis is drawn exactly as long as one unit on the y-axis), on axes whose ticks are
 * at a truthful, evenly spaced step. Each point is labelled with the coordinates the
 * row gives (or its own solution derives). The relations a figure asserts are CHECKED:
 * a point drawn as "dividing AB in m : n" must be exactly that point, a midpoint must be
 * the midpoint, a point drawn on AB must be collinear with A and B — otherwise refuse.
 *
 * Curriculum (CBSE 2026-27): coordinate geometry is distance and the section formula
 * (internal division) only. No area-of-triangle figure, no centroid figure, no
 * external division.
 */
import { evalLengthExpr } from "../figureGeometry";
import { GeoScene, agrees, finishGeo } from "./geometryCommon";
import type { GeoBuildResult } from "./geometryCommon";

/**
 * Points keyed by their letter, each written exactly as the row writes it: "(2, −3)",
 * "(−1, 7)", "(20/7, 3)". `ratio` is the row's "m : n" when a division is drawn.
 */
export interface CoordParams {
  template: "points";
  unit: "none";
  ratio?: string;
  [point: string]: string | undefined;
}

/** Drawing choices that are not numbers from the row. */
export interface CoordDraw {
  /** Segments to draw, by point letters. */
  segs?: Array<[string, string]>;
  /** A closed polygon through these points, in order. */
  polygon?: string[];
  /** `point` divides a–b internally in params.ratio (m : n), m nearer a. */
  section?: { point: string; a: string; b: string };
  /** `point` is the midpoint of a–b. */
  midpoint?: { point: string; a: string; b: string };
  /** `point` lies on segment a–b (the ratio is then solved, e.g. where an axis cuts AB). */
  onSegment?: { point: string; a: string; b: string };
}

const STEPS = [1, 2, 5, 10, 20, 25, 50, 100, 200, 500, 1000];
const MAX_TICKS = 12;
const NON_POINT = new Set(["template", "unit", "ratio"]);

export function parseCoord(raw: string): { x: number; y: number } | null {
  const m = /^\s*\(\s*([^,]+?)\s*,\s*([^,]+?)\s*\)\s*$/.exec(raw);
  if (!m) return null;
  const x = evalSigned(m[1]);
  const y = evalSigned(m[2]);
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
}

function evalSigned(s: string): number {
  const t = s.replace(/−/g, "-").replace(/\s+/g, "");
  if (t === "0") return 0;
  return evalLengthExpr(t);
}

export function parseRatio(raw: string | undefined): { m: number; n: number } | null {
  if (raw === undefined) return null;
  const m = /^\s*(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)\s*$/.exec(raw);
  if (!m) return null;
  const a = Number(m[1]);
  const b = Number(m[2]);
  return a > 0 && b > 0 ? { m: a, n: b } : null;
}

/** A readable tick step: the smallest from 1, 2, 5, 10, ... giving at most MAX_TICKS ticks on the longer axis. */
export function tickStep(span: number): number {
  for (const s of STEPS) if (span / s <= MAX_TICKS) return s;
  return STEPS[STEPS.length - 1];
}

function pretty(raw: string): string {
  return raw.replace(/-/g, "−").replace(/\s*,\s*/, ", ").replace(/\(\s+/, "(").replace(/\s+\)/, ")");
}

export function buildCoordinatePlot(p: CoordParams, labels: Record<string, string> = {}, draw: CoordDraw = {}): GeoBuildResult | null {
  const pts: Record<string, { x: number; y: number }> = {};
  for (const [k, v] of Object.entries(p)) {
    if (NON_POINT.has(k) || v === undefined) continue;
    if (!/^[A-Z][A-Za-z0-9′']{0,2}$/.test(k)) return null;
    const c = parseCoord(v);
    if (!c) return null;
    pts[k] = c;
  }
  const names = Object.keys(pts);
  if (names.length < 2) return null;
  // Two points with the same coordinates cannot both be labelled legibly.
  for (let i = 0; i < names.length; i++)
    for (let j = i + 1; j < names.length; j++) if (pts[names[i]].x === pts[names[j]].x && pts[names[i]].y === pts[names[j]].y) return null;

  const model: Record<string, number> = {};
  for (const n of names) {
    model[`${n}.x`] = pts[n].x;
    model[`${n}.y`] = pts[n].y;
  }
  const d = (a: string, b: string) => Math.hypot(pts[a].x - pts[b].x, pts[a].y - pts[b].y);
  for (let i = 0; i < names.length; i++)
    for (let j = i + 1; j < names.length; j++) {
      const v = d(names[i], names[j]);
      model[`${names[i]}${names[j]}`] = v;
      model[`${names[j]}${names[i]}`] = v;
    }
  const needs = (...ids: string[]) => ids.every((id) => pts[id] !== undefined);
  const collinearBetween = (P: string, A: string, B: string) => {
    const cross = (pts[B].x - pts[A].x) * (pts[P].y - pts[A].y) - (pts[B].y - pts[A].y) * (pts[P].x - pts[A].x);
    const len = d(A, B);
    if (Math.abs(cross) / len > 1e-6 * Math.max(1, len)) return false;
    return agrees(d(A, P) + d(P, B), len, 1e-4);
  };
  if (draw.section) {
    const { point, a, b } = draw.section;
    const r = parseRatio(p.ratio);
    if (!r || !needs(point, a, b)) return null;
    const ex = (r.m * pts[b].x + r.n * pts[a].x) / (r.m + r.n);
    const ey = (r.m * pts[b].y + r.n * pts[a].y) / (r.m + r.n);
    if (Math.abs(ex - pts[point].x) > 1e-6 || Math.abs(ey - pts[point].y) > 1e-6) return null;
    model.ratio = r.m / r.n;
  } else if (p.ratio !== undefined) {
    return null; // a ratio with nothing to divide
  }
  if (draw.midpoint) {
    const { point, a, b } = draw.midpoint;
    if (!needs(point, a, b)) return null;
    if (Math.abs((pts[a].x + pts[b].x) / 2 - pts[point].x) > 1e-6 || Math.abs((pts[a].y + pts[b].y) / 2 - pts[point].y) > 1e-6) return null;
  }
  if (draw.onSegment) {
    const { point, a, b } = draw.onSegment;
    if (!needs(point, a, b) || !collinearBetween(point, a, b)) return null;
    model.ratio = d(a, point) / d(point, b);
  }
  const segs: Array<[string, string]> = [...(draw.segs ?? [])];
  if (draw.polygon) {
    if (draw.polygon.length < 3) return null;
    draw.polygon.forEach((n, i) => segs.push([n, draw.polygon![(i + 1) % draw.polygon!.length]]));
  }
  for (const rel of [draw.section, draw.midpoint, draw.onSegment]) if (rel) segs.push([rel.a, rel.b]);
  for (const [a, b] of segs) if (!needs(a, b)) return null;

  // Axes: always include the origin, one step of room past the outermost point.
  const xs = [0, ...names.map((n) => pts[n].x)];
  const ys = [0, ...names.map((n) => pts[n].y)];
  const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), 1);
  const step = tickStep(span);
  const lo = (v: number) => (Math.floor(v / step) - 1) * step;
  const hi = (v: number) => (Math.ceil(v / step) + 1) * step;
  const x0 = lo(Math.min(...xs));
  const x1 = hi(Math.max(...xs));
  const y0 = lo(Math.min(...ys));
  const y1 = hi(Math.max(...ys));

  const sc = new GeoScene();
  sc.p("ax0", x0, 0);
  sc.p("ax1", x1, 0);
  sc.p("ay0", 0, y0);
  sc.p("ay1", 0, y1);
  sc.p("Og", 0, 0);
  sc.seg("ax0", "ax1", "axis");
  sc.seg("ay0", "ay1", "axis");
  const tickLen = step * 0.12;
  for (let v = x0 + step; v < x1 - 1e-9; v += step) {
    if (Math.abs(v) < 1e-9) continue;
    const id = `tx${v}`;
    const besideOrigin = Math.abs(v + step) < 1e-9; // its number would collide with the origin's "O"
    sc.p(`${id}a`, v, -tickLen);
    sc.p(`${id}b`, v, tickLen);
    sc.seg(`${id}a`, `${id}b`, "axis");
    if (!besideOrigin) sc.text(`${id}a`, fmt(v), 0, 13, "tick");
  }
  for (let v = y0 + step; v < y1 - 1e-9; v += step) {
    if (Math.abs(v) < 1e-9) continue;
    const id = `ty${v}`;
    sc.p(`${id}a`, -tickLen, v);
    sc.p(`${id}b`, tickLen, v);
    sc.seg(`${id}a`, `${id}b`, "axis");
    sc.text(`${id}a`, fmt(v), -4, 4, "tick", "end");
  }
  sc.text("ax1", "x", 0, 16, "tick");
  sc.text("ay1", "y", 10, 4, "tick");
  // The origin's "O" — unless a plotted point sits there and carries its own label.
  if (!names.some((n) => pts[n].x === 0 && pts[n].y === 0)) sc.text("Og", "O", -7, 14, "tick", "end");
  for (const [a, b] of segs) sc.seg(a, b, "edge");
  // Each point: a dot and "A(2, −3)" placed away from the points' centre.
  const cx = names.reduce((s, n) => s + pts[n].x, 0) / names.length;
  const cy = names.reduce((s, n) => s + pts[n].y, 0) / names.length;
  for (const n of names) {
    sc.p(n, pts[n].x, pts[n].y);
    sc.dot(n);
    const name = labels[n] ?? n;
    const text = `${name}${pretty(p[n]!)}`;
    // A point INSIDE a drawn segment (a division or mid-point) is labelled off the line, on its upper side.
    const rel = [draw.section, draw.midpoint, draw.onSegment].find((r) => r && r.point === n);
    if (rel) {
      const dx = pts[rel.b].x - pts[rel.a].x;
      const dy = pts[rel.b].y - pts[rel.a].y;
      const len = Math.hypot(dx, dy) || 1;
      let vx = -dy / len; // the world normal, as a VIEW direction (view y points down)
      let vy = -dx / len;
      if (vy > 0) {
        vx = -vx;
        vy = -vy;
      }
      const anchor = vx > 0.3 ? "start" : vx < -0.3 ? "end" : "middle";
      sc.text(n, text, Math.round(vx * 10), Math.round(vy * 10) + (vy > -0.3 ? 4 : 0), "coord", anchor);
    } else {
      let right = pts[n].x >= cx;
      // Never write a label across the y-axis' tick numbers.
      const sEst = 320 / (x1 - x0);
      if (!right && pts[n].x > 0 && pts[n].x * sEst < 70) right = true;
      if (right && pts[n].x < 0 && -pts[n].x * sEst < 70) right = false;
      const up = pts[n].y >= cy;
      sc.text(n, text, right ? 7 : -7, up ? -8 : 17, "coord", right ? "start" : "end");
    }
  }
  sc.facts = [
    `Points plotted on the coordinate axes at one scale: ${names.map((n) => `${labels[n] ?? n}${pretty(p[n]!)}`).join(", ")}.`,
    ...(draw.section ? [`${draw.section.point} divides ${draw.section.a}${draw.section.b} internally in the ratio ${p.ratio}.`] : []),
    ...(draw.midpoint ? [`${draw.midpoint.point} is the midpoint of ${draw.midpoint.a}${draw.midpoint.b}.`] : []),
    ...(draw.onSegment ? [`${draw.onSegment.point} lies on ${draw.onSegment.a}${draw.onSegment.b}.`] : []),
  ];
  const spec = finishGeo(sc, {
    unit: "none",
    title: "Points on the coordinate axes",
    labels: {},
    defaults: {},
    view: { w: 320, h: 260 },
    pad: { l: 70, r: 70, t: 24, b: 24 },
  });
  if (!spec) return null;
  // Ticks must be far enough apart to read.
  if (step * spec.transform.sx < 16) return null;
  // A very flat (or very thin) plot squeezes its points together: refuse.
  if ((x1 - x0) * spec.transform.sx < 90 || (y1 - y0) * spec.transform.sx < 90) return null;
  const dataX = Math.max(...names.map((n) => pts[n].x)) - Math.min(...names.map((n) => pts[n].x));
  const dataY = Math.max(...names.map((n) => pts[n].y)) - Math.min(...names.map((n) => pts[n].y));
  if (Math.min(dataX, dataY) < Math.max(dataX, dataY) / 6) return null;
  return { spec, model };
}

function fmt(v: number): string {
  const r = Math.round(v * 1000) / 1000;
  return r < 0 ? `−${Math.abs(r)}` : `${r}`;
}
