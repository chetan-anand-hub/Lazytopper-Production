/**
 * Shared scene assembly for the GEOMETRY builders (DIAGRAMS-1 PR-2d): circles and
 * tangents, triangles (BPT), coordinate plots, sectors and segments.
 *
 * The same discipline as heights & distances: a builder places every point in WORLD
 * units computed from the row's own numbers, then ONE uniform world -> view map
 * (sx === sy) draws it, so every drawn angle IS the angle and every drawn length ratio
 * IS the true ratio. Pure: no DOM, no clock, no randomness.
 */
import type { FigureElement, FigurePoint, FigureRole, FigureSpec, FigureTransform, LabelSide } from "../figureSpec";
import { boundsOf, dist, evalLengthExpr, fitUniform, prettyExpr, toView } from "../figureGeometry";

/** A length exactly as the row writes it: "15", "10√3", "8/√3", "20/3". */
export type Len = string;
export type GeoUnit = "cm" | "m" | "km" | "mm";
export type GeoLabels = Record<string, string>;

export interface GeoBuildResult {
  spec: FigureSpec;
  /** The solved WORLD geometry (lengths in the row's unit, angles in degrees). */
  model: Record<string, number>;
}

/** A labelled segment shorter than this (view units) cannot carry its label: refuse. */
export const MIN_LABELLED_SEGMENT = 22;
/** An angle arc needs two rays at least this long (view units). */
export const MIN_ANGLE_RAY = 22;
/** A drawn circle smaller than this radius (view units) is illegible: refuse. */
export const MIN_CIRCLE_R = 14;

export function num(v: Len | undefined): number | undefined {
  if (v === undefined) return undefined;
  const n = evalLengthExpr(v);
  return Number.isFinite(n) && n > 0 ? n : NaN;
}

export function lenText(expr: Len, unit: GeoUnit | "none"): string {
  return unit === "none" ? prettyExpr(expr) : `${prettyExpr(expr)} ${unit}`;
}

/** Relative agreement (a rounded row value like 17.54 against an exact model value). */
export function agrees(a: number, b: number, tolPct = 0.5): boolean {
  return Math.abs(a - b) <= (Math.abs(b) * tolPct) / 100 + 1e-9;
}

interface LetterSpec {
  id: string;
  /** A world point the letter is pushed AWAY from (the figure's interior), or explicit offsets. */
  away?: string;
  dx?: number;
  dy?: number;
}

export class GeoScene {
  pts: Record<string, FigurePoint> = {};
  els: FigureElement[] = [];
  letters: LetterSpec[] = [];
  facts: string[] = [];
  /** Labelled segments: [a, b] must be long enough to carry a label. */
  labelled: Array<[string, string]> = [];
  /** World radii of drawn circles, checked for legibility after the fit. */
  circles: number[] = [];
  p(id: string, x: number, y: number): void {
    this.pts[id] = { x, y };
  }
  seg(a: string, b: string, role: FigureRole, label?: string, side: LabelSide = "a", at?: number): void {
    const lab = label ? (at === undefined ? { text: label, side } : { text: label, side, at: Math.round(at * 1000) / 1000 }) : undefined;
    this.els.push(lab ? { t: "seg", a, b, role, label: lab } : { t: "seg", a, b, role });
    if (label) this.labelled.push([a, b]);
  }
  angle(at: string, from: string, to: string, deg: number, label?: string): void {
    this.els.push(label === undefined ? { t: "angle", at, from, to, deg } : { t: "angle", at, from, to, deg, label });
  }
  right(at: string, a: string, b: string): void {
    this.els.push({ t: "right", at, a, b });
  }
  dot(at: string): void {
    this.els.push({ t: "dot", at });
  }
  /** World radius; converted to view units in finish(). */
  circle(c: string, rWorld: number, role: "edge" | "construction" = "edge"): void {
    this.els.push({ t: "circle", c, r: rWorld, role });
    this.circles.push(rWorld);
  }
  region(kind: "sector" | "segment", c: string, from: string, to: string, rWorld: number, ccwDeg: number): void {
    this.els.push({ t: "region", kind, c, from, to, r: rWorld, ccwDeg });
  }
  text(at: string, text: string, dx: number, dy: number, kind: "tick" | "coord", anchor?: "start" | "middle" | "end"): void {
    this.els.push(anchor ? { t: "text", at, text, dx, dy, kind, anchor } : { t: "text", at, text, dx, dy, kind });
  }
  /** A point letter, pushed away from `away` (a world point id), ~14 view units out. */
  letter(id: string, away: string): void {
    this.letters.push({ id, away });
  }
  letterAt(id: string, dx: number, dy: number): void {
    this.letters.push({ id, dx, dy });
  }
}

export interface FinishOptions {
  view?: { w: number; h: number };
  pad?: { l: number; r: number; t: number; b: number };
  unit: FigureTransform["unit"];
  title: string;
  note?: string;
  /** Point letters: the row's own (labels) override the template defaults. */
  labels: GeoLabels;
  defaults: Record<string, string>;
}

const DEFAULT_VIEW = { w: 320, h: 240 };
const DEFAULT_PAD = { l: 34, r: 34, t: 26, b: 30 };
const LETTER_OFFSET = 14;

/**
 * Fit the world scene with ONE uniform scale, crop the view to the drawing (a pure
 * translation), convert world radii to view units, place the letters, and refuse
 * anything that would not be legible. Returns null on refusal.
 */
export function finishGeo(scene: GeoScene, o: FinishOptions): FigureSpec | null {
  const view = o.view ?? DEFAULT_VIEW;
  const pad = o.pad ?? DEFAULT_PAD;
  // The circles' full extent belongs in the fitted box.
  const extent: FigurePoint[] = [...Object.values(scene.pts)];
  for (const el of scene.els) {
    if (el.t !== "circle") continue;
    const c = scene.pts[el.c];
    extent.push({ x: c.x - el.r, y: c.y - el.r }, { x: c.x + el.r, y: c.y + el.r });
  }
  const box = boundsOf(extent);
  const fit = fitUniform(box, view, { l: 0, r: 0, t: 0, b: 0 }, o.unit);
  const raw = extent.map((w) => toView(fit, w));
  const vb = boundsOf(raw);
  const t: FigureTransform = { ...fit, ox: fit.ox + pad.l - vb.minX, oy: fit.oy + pad.t - vb.minY };
  const viewBox = {
    w: Math.round(vb.maxX - vb.minX + pad.l + pad.r),
    h: Math.round(vb.maxY - vb.minY + pad.t + pad.b),
  };
  const points: Record<string, FigurePoint> = {};
  for (const [id, w] of Object.entries(scene.pts)) points[id] = toView(t, w);

  const els: FigureElement[] = scene.els.map((el) =>
    el.t === "circle" || el.t === "region" ? { ...el, r: Math.round(el.r * t.sx * 1000) / 1000 } : el,
  );

  // Legibility.
  for (const r of scene.circles) if (r * t.sx < MIN_CIRCLE_R) return null;
  for (const [a, b] of scene.labelled) if (dist(points[a], points[b]) < MIN_LABELLED_SEGMENT) return null;
  for (const el of els) {
    if (el.t !== "angle") continue;
    if (dist(points[el.at], points[el.from]) < MIN_ANGLE_RAY || dist(points[el.at], points[el.to]) < MIN_ANGLE_RAY) return null;
  }

  // Letters: the row's own when the binding gives ANY, else the template defaults.
  const rowGives = scene.letters.some((L) => o.labels[L.id] !== undefined);
  const used = new Set<string>();
  const letters: FigureElement[] = [];
  for (const L of scene.letters) {
    const text = rowGives ? o.labels[L.id] : o.defaults[L.id];
    if (!text) continue;
    if (used.has(text)) return null;
    used.add(text);
    let dx = L.dx ?? 0;
    let dy = L.dy ?? 0;
    if (L.away) {
      const p = points[L.id];
      const a = points[L.away];
      const n = Math.hypot(p.x - a.x, p.y - a.y) || 1;
      dx = ((p.x - a.x) / n) * LETTER_OFFSET;
      dy = ((p.y - a.y) / n) * LETTER_OFFSET + 5;
    }
    letters.push({ t: "label", at: L.id, text, dx: Math.round(dx * 10) / 10, dy: Math.round(dy * 10) / 10 });
  }
  return {
    kind: "lt_figure_v1",
    viewBox,
    transform: t,
    title: o.title,
    desc: scene.facts.join(" "),
    note: o.note,
    points,
    elements: [...els, ...letters],
  };
}

export function q(labels: GeoLabels, name: string): string | undefined {
  return labels[`q.${name}`];
}
