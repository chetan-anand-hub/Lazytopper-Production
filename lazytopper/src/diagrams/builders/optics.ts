/**
 * Ray optics (spherical mirrors and thin lenses) — a pure builder: a question's OWN
 * numbers (or its own stated object position) -> FigureSpec (DIAGRAMS-1 PR-2b).
 *
 * SIGN CONVENTION: NCERT New Cartesian. Light travels left to right; the pole P
 * (mirror) or optical centre O (lens) is the origin; the object is in front, so u < 0.
 *   mirror: 1/v + 1/u = 1/f, m = -v/u, f < 0 concave, f > 0 convex
 *   lens:   1/v - 1/u = 1/f, m =  v/u, f > 0 convex,  f < 0 concave
 * The image is placed where the formula puts it (`model.v`), and two principal rays
 * are then drawn by their RULES — a ray parallel to the axis passes through F (or
 * appears to come from F); a ray through O goes undeviated; a ray through (or towards)
 * F leaves parallel; a ray through (or towards) C retraces itself; a ray at P reflects
 * symmetrically. Because the formula IS the paraxial construction, those rays meet
 * exactly at the formula's image: a test checks every ray (or its dashed backward
 * extension) passes through the drawn image tip.
 *
 * MIRROR HONESTY (paraxial model): rays meet a mirror on the vertical line through P —
 * the small-aperture model the mirror formula itself assumes. The mirror is drawn as a
 * SYMBOL: a shallow arc whose edges sit at most MAX_MIRROR_SAG view units off that
 * line, so the gap between "line" and "arc" stays invisible. The figure note says so.
 *
 * SCALE: distances along the axis use one scale (sx). Heights use sy. When the row
 * gives the object height and it is legible at sx, sy === sx; otherwise sy !== sx and
 * the note says heights are drawn to their own scale. An axis-aligned scaling keeps
 * every principal ray a principal ray (parallel stays parallel, a line through F still
 * passes through F), so the construction is exact either way.
 *
 * REFUSAL IS THE SAFE ANSWER: `null` — never a generic figure — when the givens are
 * under- or over-determined, contradict the device (a "real" image the formula puts
 * on the virtual side), put the image at infinity (u = f, numeric template), or would
 * be illegible at phone width (drawn focal length under MIN_F_VIEW, an arrow under
 * MIN_ARROW_VIEW).
 */
import type { FigureElement, FigurePoint, FigureRole, FigureSpec, FigureTransform } from "../figureSpec";
import { evalLengthExpr, prettyExpr } from "../figureGeometry";
import type { BuildResult } from "./heightsDistances";

export type OpticsDevice = "concave mirror" | "convex mirror" | "convex lens" | "concave lens";
/** A length or magnification exactly as the row writes it: "25", "16.67", "-3", "50/3". */
export type OLen = string;
/** The second principal ray (the first is always the ray parallel to the axis). */
export type SecondRay = "F" | "C" | "P" | "O";

export interface OpticsImageParams {
  template: "image";
  device: OpticsDevice;
  unit: "cm" | "m";
  /** Focal length, MAGNITUDE. */
  f?: OLen;
  /** Object distance, MAGNITUDE (the object is always in front). */
  u?: OLen;
  /** Image distance, MAGNITUDE; needs `image` to say which side. */
  v?: OLen;
  /** Which side the row says the image is on (required with `v`; checked when given). */
  image?: "real" | "virtual";
  /** Signed magnification as the row writes it. */
  m?: OLen;
  /** Object height (cm or m), when the row gives it. */
  ho?: OLen;
  /** The second principal ray, when the row's own solution names it. */
  second?: SecondRay;
}

export type CasePosition =
  | "infinity"
  | "beyond C"
  | "at C"
  | "between F and C"
  | "at F"
  | "between P and F"
  | "beyond 2F"
  | "at 2F"
  | "between F and 2F"
  | "between F and O"
  | "finite";

export interface OpticsCaseParams {
  template: "case";
  device: OpticsDevice;
  /** The object position the row states (no numbers). */
  position: CasePosition;
  second?: SecondRay;
}

export type OpticsParams = OpticsImageParams | OpticsCaseParams;
export type OpticsModel = Record<string, number>;

// ───────────────────────── constants ─────────────────────────

const VIEW_W = 400;
const MX = 24;
/** Total drawn height budget (view units) for everything above + below the axis. */
const MAX_SPAN_VIEW = 190;
/** Tallest arrow (view units). */
const MAX_ARROW_VIEW = 100;
/** R6: an arrow shorter than this, or a focal length shorter than MIN_F_VIEW, is illegible: refuse. */
export const MIN_ARROW_VIEW = 10;
/** Heights share the axis scale only when the taller arrow is at least this tall (else the
 *  construction is too flat to read); otherwise sy !== sx and the note says so. */
export const MIN_UNIFORM_TALLEST_VIEW = 45;
export const MIN_F_VIEW = 24;
/** R5: the mirror symbol's edges sit this far off the pole plane (view units). */
export const MIRROR_SAG = 2.5;
export const MAX_MIRROR_SAG = 3;
const TOP_PAD = 30;
const BOTTOM_PAD = 26;
const MEASURE_STEP = 22;
/** Representative object distances for a qualitative case, in multiples of |f|. */
export const CASE_U: Record<Exclude<CasePosition, "infinity">, number> = {
  "beyond C": 3,
  "at C": 2,
  "between F and C": 1.5,
  "at F": 1,
  "between P and F": 0.5,
  "beyond 2F": 3,
  "at 2F": 2,
  "between F and 2F": 1.5,
  "between F and O": 0.5,
  finite: 2,
};
/** Which positions each device has (NCERT's tables). */
export const DEVICE_POSITIONS: Record<OpticsDevice, readonly CasePosition[]> = {
  "concave mirror": ["infinity", "beyond C", "at C", "between F and C", "at F", "between P and F"],
  "convex mirror": ["infinity", "finite"],
  "convex lens": ["infinity", "beyond 2F", "at 2F", "between F and 2F", "at F", "between F and O"],
  "concave lens": ["infinity", "finite", "at F", "between F and 2F", "beyond 2F"],
};

export const MIRROR_NOTE =
  "Rays meet the mirror on the straight line through P — the small-aperture model the mirror formula uses; the curved mirror is drawn as a symbol.";
export const CASE_NOTE =
  "Standard construction, not to scale: the object is drawn at a typical point of the position the question states.";

export function isMirror(d: OpticsDevice): boolean {
  return d === "concave mirror" || d === "convex mirror";
}

/** The signed focal length for a magnitude (New Cartesian). */
export function signedF(d: OpticsDevice, mag: number): number {
  return d === "concave mirror" || d === "concave lens" ? -mag : mag;
}

/** Image distance from the formula (signed). Infinity when the object is at F. */
export function imageDistance(d: OpticsDevice, f: number, u: number): number {
  const inv = isMirror(d) ? 1 / f - 1 / u : 1 / f + 1 / u;
  return Math.abs(inv) < 1e-12 ? Infinity : 1 / inv;
}

export function magnification(d: OpticsDevice, u: number, v: number): number {
  return isMirror(d) ? -v / u : v / u;
}

function num(v: OLen | undefined): number | undefined {
  if (v === undefined) return undefined;
  const n = evalLengthExpr(v);
  return Number.isFinite(n) ? n : NaN;
}

interface Solved {
  f: number;
  u: number;
  v: number;
  m: number;
}

/** Solve the scene from EXACTLY two of f, u, v, m. null = under/over-determined or inconsistent. */
export function solveOptics(p: OpticsImageParams): Solved | null {
  const d = p.device;
  const mir = isMirror(d);
  const fm = num(p.f);
  const um = num(p.u);
  const vm = num(p.v);
  const mm = num(p.m);
  const given = [fm, um, vm, mm].filter((x) => x !== undefined);
  if (given.length !== 2 || given.some((x) => !Number.isFinite(x as number))) return null;
  for (const x of [fm, um, vm]) if (x !== undefined && !(x > 0)) return null;
  if (mm !== undefined && mm === 0) return null;
  if (vm !== undefined && p.image === undefined) return null;
  const f0 = fm === undefined ? undefined : signedF(d, fm);
  const u0 = um === undefined ? undefined : -um;
  const v0 = vm === undefined ? undefined : (mir ? (p.image === "real" ? -vm : vm) : p.image === "real" ? vm : -vm);
  let f: number;
  let u: number;
  let v: number;
  if (f0 !== undefined && u0 !== undefined) {
    f = f0;
    u = u0;
    v = imageDistance(d, f, u);
  } else if (f0 !== undefined && v0 !== undefined) {
    f = f0;
    v = v0;
    const inv = mir ? 1 / f - 1 / v : 1 / v - 1 / f;
    if (Math.abs(inv) < 1e-12) return null;
    u = 1 / inv;
  } else if (u0 !== undefined && v0 !== undefined) {
    u = u0;
    v = v0;
    const inv = mir ? 1 / v + 1 / u : 1 / v - 1 / u;
    if (Math.abs(inv) < 1e-12) return null;
    f = 1 / inv;
  } else if (u0 !== undefined && mm !== undefined) {
    u = u0;
    v = mir ? -mm * u : mm * u;
    const inv = mir ? 1 / v + 1 / u : 1 / v - 1 / u;
    if (Math.abs(inv) < 1e-12) return null;
    f = 1 / inv;
  } else if (v0 !== undefined && mm !== undefined) {
    v = v0;
    u = mir ? -v / mm : v / mm;
    const inv = mir ? 1 / v + 1 / u : 1 / v - 1 / u;
    if (Math.abs(inv) < 1e-12) return null;
    f = 1 / inv;
  } else {
    // f and m
    f = f0!;
    if (mm === 1) return null;
    u = mir ? f * (1 - 1 / mm!) : f * (1 / mm! - 1);
    v = mir ? -mm! * u : mm! * u;
  }
  if (!Number.isFinite(u) || !Number.isFinite(v) || !Number.isFinite(f)) return null;
  // A real object, in front.
  if (!(u < 0)) return null;
  // The focal length's sign must be the device's.
  if (Math.sign(f) !== Math.sign(signedF(d, 1))) return null;
  const m = magnification(d, u, v);
  if (mm !== undefined && Math.abs(m - mm) > 1e-9 * Math.max(1, Math.abs(mm))) return null;
  // The row's "real"/"virtual" must be what the formula gives.
  if (p.image !== undefined) {
    const real = mir ? v < 0 : v > 0;
    if (real !== (p.image === "real")) return null;
  }
  return { f, u, v, m };
}

export function isRealImage(d: OpticsDevice, v: number): boolean {
  return isMirror(d) ? v < 0 : v > 0;
}

/** NCERT size classes, computed from |m|: 0.5 point-sized, 1 diminished, 2 same size, 3 magnified, 4 highly magnified (image at infinity). */
export function sizeCode(m: number): number {
  const a = Math.abs(m);
  if (!Number.isFinite(a) || a > 1e6) return 4;
  if (a < 1e-3) return 0.5;
  if (Math.abs(a - 1) < 1e-6) return 2;
  return a < 1 ? 1 : 3;
}

// ───────────────────────── scene ─────────────────────────

interface Ray {
  /** Where the ray starts (object tip, or the left edge for an object at infinity). */
  from: FigurePoint;
  /** Incidence point on the pole / lens plane (x = 0). */
  inc: FigurePoint;
  /** Direction after the mirror / lens (unit not required). */
  out: FigurePoint;
  /** The point the rule refers to (F, C, F₁...), for a dashed construction / extension. */
  ref?: FigurePoint;
  kind: "parallel" | "F" | "C" | "P" | "O";
}

interface MarkSpec {
  id: string;
  x: number;
  text: string;
}

interface MeasureSpec {
  id: string;
  x0: number;
  x1: number;
  text: string;
}

interface SceneIn {
  device: OpticsDevice;
  f: number;
  /** Object distance (signed), or -Infinity for an object at infinity. */
  u: number;
  /** Image distance (signed), Infinity for an image at infinity. */
  v: number;
  m: number;
  /** World object height (cm/m when given, else a drawing size). */
  ho: number;
  hoGiven: boolean;
  /** Prefer sy === sx (only when the object height is given). */
  uniformWanted: boolean;
  rays: Ray[];
  measures: MeasureSpec[];
  unit: FigureTransform["unit"];
  title: string;
  desc: string;
  notes: string[];
  objectLabel?: string;
  imageLabel?: string;
  /** The given object height, e.g. "h = 5 cm", drawn beside the object arrow. */
  heightLabel?: string;
}

function lineYAt(a: FigurePoint, b: FigurePoint, x: number): number {
  return a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x);
}

/** The two principal rays for an object tip T, by their rules. */
function principalRays(d: OpticsDevice, f: number, T: FigurePoint, second: SecondRay | undefined): Ray[] | null {
  const mir = isMirror(d);
  const rays: Ray[] = [];
  // 1. Parallel to the axis -> through F (or as if from F).
  {
    const inc = { x: 0, y: T.y };
    const F = { x: f, y: 0 };
    let out = { x: F.x - inc.x, y: F.y - inc.y };
    if ((mir && out.x > 0) || (!mir && out.x < 0)) out = { x: -out.x, y: -out.y };
    rays.push({ from: T, inc, out, ref: F, kind: "parallel" });
  }
  // 2. The second ray.
  const cands: Ray[] = [];
  const mk = (k: SecondRay): Ray | null => {
    if (k === "O") {
      if (mir) return null;
      return { from: T, inc: { x: 0, y: 0 }, out: { x: -T.x, y: -T.y }, kind: "O" };
    }
    if (k === "P") {
      if (!mir) return null;
      return { from: T, inc: { x: 0, y: 0 }, out: { x: T.x, y: -T.y }, kind: "P" };
    }
    if (k === "F") {
      // Mirror: through / towards F, leaves parallel. Lens: through F₁ (convex) or towards F₂ (concave), leaves parallel.
      const Q = mir ? { x: f, y: 0 } : { x: -f, y: 0 };
      if (Math.abs(T.x - Q.x) < 1e-9) return null;
      const inc = { x: 0, y: lineYAt(T, Q, 0) };
      return { from: T, inc, out: { x: mir ? -1 : 1, y: 0 }, ref: Q, kind: "F" };
    }
    // C (mirrors only): retraces itself.
    if (!mir) return null;
    const C = { x: 2 * f, y: 0 };
    if (Math.abs(T.x - C.x) < 1e-9) return null;
    const inc = { x: 0, y: lineYAt(T, C, 0) };
    return { from: T, inc, out: { x: T.x - inc.x, y: T.y - inc.y }, ref: C, kind: "C" };
  };
  if (second) {
    const r = mk(second);
    if (!r) return null;
    rays.push(r);
    return rays;
  }
  if (!mir) {
    rays.push(mk("O")!);
    return rays;
  }
  for (const k of ["F", "C"] as const) {
    const r = mk(k);
    if (r) cands.push(r);
  }
  if (d === "convex mirror") {
    // NCERT's construction: the ray directed towards C.
    const c = cands.find((r) => r.kind === "C");
    if (!c) return null;
    rays.push(c);
    return rays;
  }
  if (cands.length === 0) return null;
  cands.sort((a, b) => Math.abs(a.inc.y) - Math.abs(b.inc.y));
  rays.push(cands[0]);
  return rays;
}

function marksFor(d: OpticsDevice, f: number): MarkSpec[] {
  const a = Math.abs(f);
  if (isMirror(d)) {
    return [
      { id: "P", x: 0, text: "P" },
      { id: "F", x: f, text: "F" },
      { id: "C", x: 2 * f, text: "C" },
    ];
  }
  return [
    { id: "O", x: 0, text: "O" },
    { id: "F1", x: -a, text: "F₁" },
    { id: "F2", x: a, text: "F₂" },
    { id: "2F1", x: -2 * a, text: "2F₁" },
    { id: "2F2", x: 2 * a, text: "2F₂" },
  ];
}

class Builder {
  pts: Record<string, FigurePoint> = {};
  els: FigureElement[] = [];
  private n = 0;
  p(id: string, x: number, y: number): string {
    this.pts[id] = { x, y };
    return id;
  }
  auto(x: number, y: number): string {
    return this.p(`_${this.n++}`, x, y);
  }
  seg(a: string, b: string, role: FigureRole, arrow?: "mid" | "end"): void {
    this.els.push(arrow ? { t: "seg", a, b, role, arrow } : { t: "seg", a, b, role });
  }
}

/** Where a ray from `p` along `d` leaves the drawing box (x in [xl, xr], y in [yb, yt]). */
function toEdge(p: FigurePoint, d: FigurePoint, xl: number, xr: number, yb: number, yt: number): FigurePoint {
  let t = Infinity;
  if (d.x > 1e-12) t = Math.min(t, (xr - p.x) / d.x);
  if (d.x < -1e-12) t = Math.min(t, (xl - p.x) / d.x);
  if (d.y > 1e-12) t = Math.min(t, (yt - p.y) / d.y);
  if (d.y < -1e-12) t = Math.min(t, (yb - p.y) / d.y);
  if (!Number.isFinite(t) || t < 0) t = 0;
  return { x: p.x + d.x * t, y: p.y + d.y * t };
}

/** Approximate text box (view units) for collision checks: 8.4 per character, 15 tall. */
function textBox(x: number, y: number, text: string): { l: number; r: number; t: number; b: number } {
  const w = Math.max(1, [...text].length) * 8.4;
  return { l: x - w / 2, r: x + w / 2, t: y - 12, b: y + 3 };
}

function boxesHit(a: { l: number; r: number; t: number; b: number }, b: { l: number; r: number; t: number; b: number }): boolean {
  return a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
}

function segHitsBox(p: FigurePoint, q: FigurePoint, bx: { l: number; r: number; t: number; b: number }): boolean {
  // Sample the segment (labels are small; 24 samples is plenty).
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const x = p.x + (q.x - p.x) * t;
    const y = p.y + (q.y - p.y) * t;
    if (x > bx.l - 1 && x < bx.r + 1 && y > bx.t - 1 && y < bx.b + 1) return true;
  }
  return false;
}

function assemble(s: SceneIn, d: OpticsDevice): FigureSpec | null {
  const mir = isMirror(d);
  const f = s.f;
  const marks = marksFor(d, f);
  const atInfinityObj = !Number.isFinite(s.u);
  const atInfinityImg = !Number.isFinite(s.v);
  const hi = atInfinityImg || atInfinityObj ? NaN : s.m * s.ho;

  // ── world x-range ──
  const xs: number[] = [0, ...marks.map((k) => k.x)];
  if (!atInfinityObj) xs.push(s.u);
  if (!atInfinityImg) xs.push(s.v);
  for (const r of s.rays) {
    if (r.ref) xs.push(r.ref.x);
    xs.push(r.from.x);
  }
  let xl = Math.min(...xs);
  let xr = Math.max(...xs);
  const span0 = xr - xl;
  if (atInfinityImg) {
    if (mir) xl -= span0 * 0.25;
    else xr += span0 * 0.25;
  }
  // Outgoing rays need room after the device: a mirror sends light back left; a lens on to the right.
  if (!mir && xr < Math.abs(f) * 2.4) xr = Math.abs(f) * 2.4;
  const pad = (xr - xl) * 0.06;
  xl -= pad;
  xr += pad;
  // Room on the left for a given object height's label (the object is the leftmost thing drawn).
  const ML = s.heightLabel ? MX + 52 : MX;
  const sx = (VIEW_W - ML - MX) / (xr - xl);
  if (Math.abs(f) * sx < MIN_F_VIEW) return refuse(`illegible: focal length drawn ${(Math.abs(f) * sx).toFixed(1)} < ${MIN_F_VIEW} view units`);

  // ── world y-range and the height scale ──
  const ys: number[] = [0, s.ho];
  if (!Number.isNaN(hi)) ys.push(hi);
  for (const r of s.rays) ys.push(r.inc.y, r.from.y);
  const yTop = Math.max(...ys);
  const yBot = Math.min(...ys);
  const ext = yTop - yBot;
  let sy = Math.min(MAX_SPAN_VIEW / ext, MAX_ARROW_VIEW / Math.max(s.ho, Number.isNaN(hi) ? 0 : Math.abs(hi)));
  let uniform = false;
  const tallest = Math.max(s.ho, Number.isNaN(hi) ? 0 : Math.abs(hi));
  if (
    s.uniformWanted &&
    sx <= sy &&
    tallest * sx >= MIN_UNIFORM_TALLEST_VIEW &&
    s.ho * sx >= MIN_ARROW_VIEW &&
    (Number.isNaN(hi) || Math.abs(hi) * sx >= MIN_ARROW_VIEW)
  ) {
    sy = sx;
    uniform = true;
  }
  if (s.ho * sy < MIN_ARROW_VIEW) return refuse("illegible: object arrow too short");
  if (!Number.isNaN(hi) && Math.abs(hi) * sy < MIN_ARROW_VIEW) return refuse("illegible: image arrow too short");
  // Ray clipping box (world), a little past the drawn points.
  const yt = yTop + 24 / sy;
  const yb = yBot - 24 / sy;

  const B = new Builder();
  B.p("axL", xl, 0);
  B.p("axR", xr, 0);
  B.seg("axL", "axR", "axis");
  const poleId = mir ? "P" : "O";
  for (const k of marks) B.p(k.id, k.x, 0);

  // Object
  if (!atInfinityObj) {
    B.p("Ob", s.u, 0);
    B.p("Ot", s.u, s.ho);
    B.seg("Ob", "Ot", "object", "end");
    B.p("Om", s.u, s.ho / 2);
  }
  // Image
  const realImg = !atInfinityImg && isRealImage(d, s.v);
  /** Light diverges after the device: rays need dashed backward extensions. */
  const diverging = !atInfinityImg && !realImg;
  if (!atInfinityImg && !atInfinityObj) {
    B.p("Ib", s.v, 0);
    B.p("It", s.v, hi);
    B.seg("Ib", "It", realImg ? "image" : "image-virtual", "end");
  }

  // Rays
  let maxInc = Math.max(s.ho, Number.isNaN(hi) ? 0 : Math.abs(hi));
  s.rays.forEach((r, i) => {
    maxInc = Math.max(maxInc, Math.abs(r.inc.y));
    const fromId = B.p(`r${i}a`, r.from.x, r.from.y);
    const incId = B.p(`r${i}i`, r.inc.x, r.inc.y);
    B.seg(fromId, incId, "ray", "mid");
    const end = toEdge(r.inc, r.out, xl, xr, yb, yt);
    const endId = B.p(`r${i}e`, end.x, end.y);
    B.seg(incId, endId, "ray", "mid");
    // A rule point the incident ray only "appears to come from", or was "directed towards":
    // a dashed construction line, so the rule is visible.
    if (r.ref && r.kind !== "parallel") {
      const dirIn = { x: r.inc.x - r.from.x, y: r.inc.y - r.from.y };
      const tRef = Math.abs(dirIn.x) > 1e-12 ? (r.ref.x - r.from.x) / dirIn.x : 0;
      if (tRef < -1e-9) B.seg(B.p(`r${i}q`, r.ref.x, r.ref.y), fromId, "construction");
      else if (tRef > 1 + 1e-9 && !(r.kind === "C" && diverging)) B.seg(incId, B.p(`r${i}q`, r.ref.x, r.ref.y), "construction");
    }
    // Diverging after the device: the dashed backward extension to the virtual image
    // (or to F for a parallel beam), and on to the ray's rule point when that is farther.
    const back = { x: -r.out.x, y: -r.out.y };
    if (diverging) {
      const targets: FigurePoint[] = [];
      if (!atInfinityImg && !atInfinityObj) targets.push({ x: s.v, y: hi });
      if (r.ref && (r.kind === "parallel" || r.kind === "C")) targets.push(r.ref);
      if (atInfinityObj && !atInfinityImg) targets.push({ x: s.v, y: 0 });
      let far: FigurePoint | null = null;
      let best = 1e-9;
      for (const tg of targets) {
        const t = Math.abs(back.x) > 1e-12 ? (tg.x - r.inc.x) / back.x : (tg.y - r.inc.y) / back.y;
        if (t > best) {
          best = t;
          far = { x: r.inc.x + back.x * t, y: r.inc.y + back.y * t };
        }
      }
      if (far && !(r.kind === "O")) B.seg(incId, B.p(`r${i}v`, far.x, far.y), "ray-virtual");
      else if (far && r.kind === "O") {
        // The undeviated ray's backward extension is its own incident line; dash only the
        // part beyond the object tip (a magnified virtual image lies farther out).
        const tTip = (r.from.x - r.inc.x) / back.x;
        if (best > tTip + 1e-9) B.seg(fromId, B.p(`r${i}v`, far.x, far.y), "ray-virtual");
      }
    }
  });

  // Device symbol
  const half = maxInc * sy + 12;
  // Drawn first, so every ray stays visible across it.
  if (mir) B.els.splice(1, 0, { t: "mirror", at: poleId, half, sag: MIRROR_SAG, kind: d === "concave mirror" ? "concave" : "convex" });
  else B.els.splice(1, 0, { t: "lens", at: poleId, half, kind: d === "convex lens" ? "convex" : "concave" });

  // ── transform ──
  const allY = Object.values(B.pts).map((q) => q.y);
  const halfW = half / sy;
  const top = Math.max(...allY, halfW);
  const bot = Math.min(...allY, -halfW);
  const ox = ML - xl * sx;
  const oy = TOP_PAD + top * sy;
  const t: FigureTransform = { sx, sy, ox, oy, unit: s.unit };
  const toV = (q: FigurePoint): FigurePoint => ({ x: round3(q.x * sx + ox), y: round3(oy - q.y * sy) });

  // Dimension lines (numeric template only), stacked below everything.
  let yBelowView = oy - bot * sy + 22;
  const measureEls: FigureElement[] = [];
  const measurePts: Record<string, FigurePoint> = {};
  s.measures.forEach((mm, i) => {
    const y = yBelowView + i * MEASURE_STEP;
    const a = `m${i}a`;
    const b = `m${i}b`;
    measurePts[a] = { x: round3(mm.x0 * sx + ox), y: round3(y) };
    measurePts[b] = { x: round3(mm.x1 * sx + ox), y: round3(y) };
    measurePts[`${a}t`] = { x: measurePts[a].x, y: round3(y - 5) };
    measurePts[`${b}t`] = { x: measurePts[b].x, y: round3(y - 5) };
    measureEls.push({ t: "seg", a, b, role: "measure", label: { text: mm.text, side: "b" } });
    measureEls.push({ t: "seg", a, b: `${a}t`, role: "measure" });
    measureEls.push({ t: "seg", a: b, b: `${b}t`, role: "measure" });
  });
  if (s.measures.length) yBelowView += (s.measures.length - 1) * MEASURE_STEP + 14;
  const height = Math.round(Math.max(oy - bot * sy + BOTTOM_PAD, yBelowView + BOTTOM_PAD - 4));

  const points: Record<string, FigurePoint> = {};
  for (const [id, w] of Object.entries(B.pts)) points[id] = toV(w);
  Object.assign(points, measurePts);

  // Legibility: marks must not crowd each other.
  const mx = marks.map((k) => points[k.id].x).sort((a, b) => a - b);
  for (let i = 1; i < mx.length; i++) if (mx[i] - mx[i - 1] < 18) return refuse("illegible: axis marks crowd each other");

  // ── labels: marks below the axis unless an arrow or a ray is in the way ──
  const segs = B.els.filter((e): e is Extract<FigureElement, { t: "seg" }> => e.t === "seg" && e.role !== "axis");
  const placed: Array<{ l: number; r: number; t: number; b: number }> = [];
  const labels: FigureElement[] = [];
  const tryPlace = (at: string, text: string, cands: Array<[number, number]>): boolean => {
    const P = points[at];
    for (const [dx, dy] of cands) {
      const bx = textBox(P.x + dx, P.y + dy, text);
      if (bx.l < 2 || bx.r > VIEW_W - 2 || bx.t < 2 || bx.b > height - 2) continue;
      if (placed.some((q) => boxesHit(q, bx))) continue;
      if (segs.some((sg) => segHitsBox(points[sg.a], points[sg.b], bx))) continue;
      placed.push(bx);
      labels.push({ t: "label", at, text, dx, dy });
      return true;
    }
    return false;
  };
  for (const k of marks) {
    labels.push({ t: "dot", at: k.id });
  }
  const markOrder = [...marks].sort((a, b) => (a.id === poleId ? -1 : b.id === poleId ? 1 : 0));
  const poleDx = mir ? 9 : 17;
  for (const k of markOrder) {
    const ok = tryPlace(k.id, k.text, [
      [k.id === poleId ? poleDx : 0, 18],
      [k.id === poleId ? poleDx : 0, -7],
      [12, 18],
      [-12, 18],
      [12, -7],
      [-12, -7],
      [16, 30],
      [-16, 30],
      [22, 18],
      [-22, 18],
      [22, -7],
      [-22, -7],
      [0, 34],
      [0, -22],
    ]);
    if (!ok) return refuse(`illegible: no clear place for the label ${k.text}`);
  }
  // "Object" / "Image": beyond the tip, beside the arrow, or past its foot on the far
  // side of the axis — the first clear spot. No clear spot = refuse (an unlabelled
  // pair of arrows is ambiguous).
  const arrowSpots = (tip: string, foot: string): Array<[number, number]> => {
    const T = points[tip];
    const Fo = points[foot];
    const up = T.y < Fo.y;
    const len = Math.abs(Fo.y - T.y);
    const s1 = up ? -1 : 1;
    const out: Array<[number, number]> = [];
    for (const dy of [s1 * 9 + (up ? 0 : 9), s1 * 22 + (up ? 0 : 9), s1 * 36 + (up ? 0 : 9)]) for (const dx of [0, 28, -28, 44, -44]) out.push([dx, dy]);
    for (const dx of [-34, 34, -48, 48]) out.push([dx, (up ? 1 : -1) * len * 0.5 + 4]);
    for (const dx of [0, 26, -26]) out.push([dx, (up ? 1 : -1) * len + (up ? 18 : -8)]);
    return out;
  };
  if (s.objectLabel && points.Ot) {
    if (!tryPlace("Ot", s.objectLabel, arrowSpots("Ot", "Ob"))) return refuse("illegible: no clear place for the object label");
  }
  if (s.heightLabel && points.Om) {
    const spots: Array<[number, number]> = [];
    for (const dx of [-34, 34, -46, 46, -64, -84]) for (const dy of [4, 14, -6]) spots.push([dx, dy]);
    // Last resort: under the object's foot, below the axis.
    const below = points.Ob.y - points.Om.y;
    for (const dx of [0, -20, 20]) spots.push([dx, below + 32]);
    if (!tryPlace("Om", s.heightLabel, spots)) return refuse("illegible: no clear place for the object-height label");
  }
  if (s.imageLabel && points.It) {
    if (!tryPlace("It", s.imageLabel, arrowSpots("It", "Ib"))) return refuse("illegible: no clear place for the image label");
  }

  const els: FigureElement[] = [...B.els, ...measureEls, ...labels];
  const notes = [...s.notes];
  if (!uniform && s.hoGiven) notes.push("Heights are drawn to a different scale from distances along the axis; the image keeps its true ratio to the object.");
  if (!s.hoGiven && Number.isFinite(s.u) && s.unit !== "none") notes.push("The object's height is not given: it is drawn at a convenient size, and the image in its true ratio to it.");
  if (mir) notes.push(MIRROR_NOTE);
  return {
    kind: "lt_figure_v1",
    viewBox: { w: VIEW_W, h: height },
    transform: t,
    title: s.title,
    desc: s.desc,
    note: notes.join(" ") || undefined,
    points,
    elements: els,
  };
}

/** The reason the last build refused (diagnostics for tests and the refusal table; never shown to students). */
export const OPTICS_REFUSAL = { last: "" };
function refuse(reason: string): null {
  OPTICS_REFUSAL.last = reason;
  return null;
}

function round3(v: number): number {
  return Math.round(v * 1000) / 1000;
}

function nature(d: OpticsDevice, v: number, m: number): string {
  const real = isRealImage(d, v);
  const size = sizeCode(m);
  const sz = size === 3 ? "magnified" : size === 2 ? "the same size" : size === 1 ? "diminished" : "point-sized";
  return `${real ? "real" : "virtual"}, ${m < 0 ? "inverted" : "erect"}, ${sz}`;
}

function fmt(n: number): string {
  const r = Math.round(n * 100) / 100;
  return String(r).replace("-", "−");
}

function signed(text: string, sign: number): string {
  return `${sign < 0 ? "−" : "+"}${prettyExpr(text).replace(/^[-−+]/, "")}`;
}

// ───────────────────────── templates ─────────────────────────

function buildImage(p: OpticsImageParams): BuildResult<OpticsModel> | null {
  const sol = solveOptics(p);
  if (!sol) return refuse("givens under/over-determined or inconsistent with the device");
  const { f, u, v, m } = sol;
  if (!Number.isFinite(v)) return refuse("object at F: image at infinity");
  const hoNum = num(p.ho);
  if (hoNum !== undefined && !(hoNum > 0)) return refuse("object height not a positive number");
  const ho = hoNum ?? Math.abs(f) * 0.4;
  const real = isRealImage(p.device, v);
  const T = { x: u, y: ho };
  const rays = principalRays(p.device, f, T, p.second);
  if (!rays) return refuse("the requested second ray does not exist for this scene");
  const hi = m * ho;
  const model: OpticsModel = {
    f,
    u,
    v,
    m,
    absF: Math.abs(f),
    absU: Math.abs(u),
    absV: Math.abs(v),
    absM: Math.abs(m),
    R: 2 * f,
    absR: Math.abs(2 * f),
    ho,
    hi,
    absHi: Math.abs(hi),
    real: real ? 1 : -1,
    erect: m > 0 ? 1 : -1,
    size: sizeCode(m),
  };
  const unit = p.unit;
  const uLabel = p.u !== undefined ? `u = ${signed(p.u, -1)} ${unit}` : "u = ?";
  const vLabel = p.v !== undefined ? `v = ${signed(p.v, Math.sign(v))} ${unit}` : "v = ?";
  const fLabel = p.f !== undefined ? `f = ${signed(p.f, Math.sign(f))} ${unit}` : "f = ?";
  const measures: MeasureSpec[] = [
    { id: "f", x0: 0, x1: f, text: fLabel },
    { id: "u", x0: 0, x1: u, text: uLabel },
    { id: "v", x0: 0, x1: v, text: vLabel },
  ];
  const dev = p.device;
  const hoTxt = p.ho !== undefined ? `${prettyExpr(p.ho)} ${unit} tall ` : "";
  const desc =
    `Ray diagram for a ${dev} of focal length ${fmt(Math.abs(f))} ${unit}: an object ${hoTxt}${fmt(Math.abs(u))} ${unit} in front of it. ` +
    `Its image is ${nature(dev, v, m)}, ${fmt(Math.abs(v))} ${unit} ${real ? (isMirror(dev) ? "in front of the mirror" : "behind the lens") : isMirror(dev) ? "behind the mirror" : "on the object's side of the lens"}.`;
  const spec = assemble(
    {
      device: dev,
      f,
      u,
      v,
      m,
      ho,
      hoGiven: hoNum !== undefined,
      uniformWanted: hoNum !== undefined,
      rays,
      measures,
      unit,
      title: `Ray diagram: ${dev}, object ${fmt(Math.abs(u))} ${unit} away`,
      desc,
      notes: [],
      objectLabel: "Object",
      imageLabel: "Image",
      heightLabel: p.ho !== undefined ? `h = ${prettyExpr(p.ho)} ${unit}` : undefined,
    },
    dev,
  );
  return spec ? { spec, model } : null;
}

const CASE_F = 10;

function buildCase(p: OpticsCaseParams): BuildResult<OpticsModel> | null {
  const d = p.device;
  if (!DEVICE_POSITIONS[d].includes(p.position)) return refuse(`no position "${p.position}" for a ${d}`);
  const f = signedF(d, CASE_F);
  const mir = isMirror(d);
  const ho = 4;
  if (p.position === "infinity") {
    // A beam parallel to the axis: converges at F (or appears to diverge from F).
    const xl = -CASE_F * 3.2;
    const rays: Ray[] = [ho, -ho].map((y) => {
      const inc = { x: 0, y };
      const F = { x: f, y: 0 };
      let out = { x: F.x - inc.x, y: F.y - inc.y };
      if ((mir && out.x > 0) || (!mir && out.x < 0)) out = { x: -out.x, y: -out.y };
      return { from: { x: xl, y }, inc, out, ref: F, kind: "parallel" as const };
    });
    // The image of a very distant object, by the formula's limit.
    const uFar = -1e9 * CASE_F;
    const vFar = imageDistance(d, f, uFar);
    const mFar = magnification(d, uFar, vFar);
    const real = isRealImage(d, vFar);
    const model: OpticsModel = {
      f,
      vOverF: vFar / f,
      real: real ? 1 : -1,
      erect: mFar > 0 ? 1 : -1,
      size: sizeCode(mFar),
    };
    const spec = assemble(
      {
        device: d,
        f,
        u: -Infinity,
        v: f,
        m: 0,
        ho,
        hoGiven: false,
        uniformWanted: false,
        rays,
        measures: [],
        unit: "none",
        title: `Ray diagram: ${d}, object at infinity`,
        desc: `Ray diagram for a ${d}: rays parallel to the principal axis (an object at infinity) ${real ? "meet" : "appear to meet"} at the principal focus F — the image is ${real ? "real" : "virtual"}, ${real ? "inverted" : "erect"}, point-sized, at F.`,
        notes: [CASE_NOTE],
      },
      d,
    );
    return spec ? { spec, model } : null;
  }
  const u = -CASE_U[p.position] * CASE_F;
  const T = { x: u, y: ho };
  const v = imageDistance(d, f, u);
  const atF = !Number.isFinite(v);
  // At F the image is at infinity: its nature is the limit just beyond F.
  const uNear = atF ? u * (1 + 1e-7) : u;
  const vN = imageDistance(d, f, uNear);
  const mN = magnification(d, uNear, vN);
  const real = isRealImage(d, vN);
  const rays = principalRays(d, f, T, p.second);
  if (!rays) return refuse("the requested second ray does not exist for this scene");
  const model: OpticsModel = {
    f,
    u,
    v,
    vOverF: v / f,
    m: atF ? NaN : mN,
    real: real ? 1 : -1,
    erect: mN > 0 ? 1 : -1,
    size: sizeCode(atF ? Infinity : mN),
  };
  const where = atF
    ? "at infinity (the rays leave parallel)"
    : `${real ? "real" : "virtual"}, ${mN < 0 ? "inverted" : "erect"}, ${sizeCode(mN) === 3 ? "magnified" : sizeCode(mN) === 2 ? "the same size" : "diminished"}`;
  const spec = assemble(
    {
      device: d,
      f,
      u,
      v,
      m: atF ? NaN : mN,
      ho,
      hoGiven: false,
      uniformWanted: false,
      rays,
      measures: [],
      unit: "none",
      title: `Ray diagram: ${d}, object ${p.position === "finite" ? "in front of it" : p.position}`,
      desc: `Ray diagram for a ${d} with the object ${p.position === "finite" ? "at a finite distance in front of it" : p.position}: the image is ${where}.`,
      notes: [CASE_NOTE],
      objectLabel: "Object",
      imageLabel: atF ? undefined : "Image",
    },
    d,
  );
  return spec ? { spec, model } : null;
}

/** Build a ray diagram from a row's own numbers / stated position, or refuse with null. */
export function buildOptics(p: OpticsParams): BuildResult<OpticsModel> | null {
  OPTICS_REFUSAL.last = "";
  if (p.template === "image") return buildImage(p);
  if (p.template === "case") return buildCase(p);
  return null;
}
