/**
 * Heights & distances — a pure builder: a question's OWN numbers -> FigureSpec
 * (DIAGRAMS-1 PR-2a).
 *
 * Every template SOLVES its scene with exact trigonometry in world units (metres or
 * km), then lays it out with ONE uniform scale (sx === sy), so every drawn angle IS
 * the given angle and every drawn length ratio IS the true ratio. The solved world
 * values come back as `model`, which a test compares with the row's own final answer.
 *
 * REFUSAL IS THE SAFE ANSWER. A builder returns `null` — never a generic or
 * "close enough" figure — when the scene is degenerate (an angle of 0° or 90°,
 * angles in the wrong order for the template), inconsistent (a negative height),
 * under- or over-determined, or would not be legible at the figure size.
 *
 * Labels: a GIVEN carries its value exactly as the question writes it ("15 m",
 * "10√3 m", "60°"). An UNKNOWN carries the row's own letter ("h", "x") or nothing.
 * With `scaleFree` (a row that fixes the scene only up to scale — speed/time rows
 * with no length, controller decision D6) NO length carries a number.
 */
import type { FigureElement, FigurePoint, FigureRole, FigureSpec, LabelSide } from "../figureSpec";
import {
  DEG,
  boundsOf,
  dist,
  evalLengthExpr,
  fitUniform,
  prettyExpr,
  tanDeg,
  toView,
} from "../figureGeometry";

/** A length exactly as the row writes it: "15", "10√3", "8/√3", "12(1+√3)". */
export type Len = string;
export type View = "elevation" | "depression" | "shadow";

interface HdBase {
  unit: "m" | "km";
  /** D6: the row fixes the scene only up to scale — draw exact angles, letters only. */
  scaleFree?: boolean;
}

export interface HdSingle extends HdBase {
  template: "single";
  view: View;
  /** The angle at the observer (elevation / sun) or at the top (depression), degrees. */
  theta?: number;
  /** Height of the top above the ground. */
  h?: Len;
  /** Horizontal distance (ground). */
  d?: Len;
  /** Line of sight / ray length (hypotenuse). */
  L?: Len;
  /** Observer eye (or roof) height above the ground — the angle is measured at that level. */
  eye?: Len;
  /** Draw the hypotenuse label even when it is not asked about. */
  showL?: boolean;
}

export interface HdSlant extends HdBase {
  template: "slant";
  /** Angle the slant line makes with the ground. */
  theta: number;
  h?: Len;
  d?: Len;
  L?: Len;
  /** What the slant line is: a ladder against a wall, a kite string, a broken tree's top part. */
  object: "ladder" | "string" | "broken-tree";
}

export interface HdTwoSameSide extends HdBase {
  template: "twoPointsSameSide";
  view: View;
  /** The smaller angle (the farther point). */
  far: number;
  /** The larger angle (the nearer point). */
  near: number;
  h?: Len;
  gap?: Len;
  dNear?: Len;
  dFar?: Len;
  eye?: Len;
  /** "tower": a fixed structure, two observer points. "object": one observer, an object
   *  moving horizontally at a fixed height (balloon, bird). */
  subject?: "tower" | "object";
}

export interface HdOpposite extends HdBase {
  template: "twoPointsOppositeSides";
  view: "elevation" | "depression";
  /** Angle at (or towards) the LEFT point. */
  left: number;
  /** Angle at (or towards) the RIGHT point. */
  right: number;
  h?: Len;
  total?: Len;
  dLeft?: Len;
  dRight?: Len;
}

export interface HdStacked extends HdBase {
  template: "objectOnObject";
  /** Elevation of the LOWER point (top of the building / pedestal / first position). */
  lower: number;
  /** Elevation of the UPPER point. */
  upper: number;
  d?: Len;
  h1?: Len;
  h2?: Len;
  len?: Len;
  /** "stacked": an object standing on a structure. "rising": one thing seen at two heights. */
  style?: "stacked" | "rising";
}

export interface HdElevDep extends HdBase {
  template: "elevDepFromHeight";
  /** Angle from the observer to the TOP of the second structure. */
  top: number;
  topView: "elevation" | "depression";
  /** Angle of depression from the observer to the FOOT of the second structure. */
  foot: number;
  H1?: Len;
  d?: Len;
  H2?: Len;
}

export interface HdTwoVertical extends HdBase {
  template: "twoVerticalPoints";
  /** Elevation of the top from P on the ground. */
  ground: number;
  /** Elevation of the top from Q, vertically above P. */
  upper: number;
  k?: Len;
  H?: Len;
  d?: Len;
}

export interface HdTwoStructures extends HdBase {
  template: "twoStructuresCross";
  /** Elevation, measured at the LEFT structure's foot, of the RIGHT structure's top. */
  atLeftFoot: number;
  /** Elevation, measured at the RIGHT structure's foot, of the LEFT structure's top. */
  atRightFoot: number;
  leftH?: Len;
  rightH?: Len;
  d?: Len;
}

export type HdParams =
  | HdSingle
  | HdSlant
  | HdTwoSameSide
  | HdOpposite
  | HdStacked
  | HdElevDep
  | HdTwoVertical
  | HdTwoStructures;

export type HdModel = Record<string, number>;

/** Point letters (keyed by the template's point ids) and unknown-length letters ("q.<name>"). */
export type HdLabels = Record<string, string>;

export interface BuildResult<M> {
  spec: FigureSpec;
  model: M;
}

const VIEW = { w: 320, h: 220 };
const MARGIN = { l: 30, r: 30, t: 20, b: 30 };
/** A segment labelled ALONG its length (a/b) shorter than this (view units) is illegible: refuse. */
/**
 * CURRICULUM LIMITS (owner standing rule): CBSE Class 10 heights & distances uses
 * angles of elevation/depression of 30°, 45° and 60° ONLY, and at most TWO right
 * triangles in one scene. A figure outside that is refused.
 */
export const CURRICULUM_ANGLES: readonly number[] = [30, 45, 60];
export const MAX_RIGHT_TRIANGLES = 2;

/** True when every drawn angle is 30°/45°/60° and the scene has at most two right triangles
 *  (each angle arc in an H&D figure belongs to exactly one right triangle). */
export function withinCurriculum(spec: Pick<FigureSpec, "elements">): boolean {
  const arcs = spec.elements.filter((e) => e.t === "angle");
  if (arcs.length > MAX_RIGHT_TRIANGLES) return false;
  return arcs.every((e) => e.t === "angle" && CURRICULUM_ANGLES.some((a) => Math.abs(a - e.deg) < 1e-6));
}

/** Room kept around the drawing for point letters and length labels (view units). */
const CROP_PAD = { l: 50, r: 50, t: 22, b: 38 };
export const MIN_LABELLED_SEGMENT = 14;
/** A segment labelled BESIDE it (l/r — e.g. a 1.5 m eye height drawn to scale) must still be visible. */
export const MIN_SIDE_LABELLED_SEGMENT = 1.5;

// ───────────────────────── scene assembly ─────────────────────────

interface LetterSpec {
  id: string;
  dx: number;
  dy: number;
}

class Scene {
  pts: Record<string, FigurePoint> = {};
  els: FigureElement[] = [];
  letters: LetterSpec[] = [];
  facts: string[] = [];
  /** Labelled segments and whether the label sits ALONG them (a/b) or beside them (l/r). */
  labelled: Array<[string, string, boolean]> = [];
  p(id: string, x: number, y: number): void {
    this.pts[id] = { x, y };
  }
  seg(a: string, b: string, role: FigureRole, label?: string, side: LabelSide = "a"): void {
    this.els.push(label ? { t: "seg", a, b, role, label: { text: label, side } } : { t: "seg", a, b, role });
    if (label) this.labelled.push([a, b, side === "a" || side === "b"]);
  }
  angle(at: string, from: string, to: string, deg: number, label: string): void {
    this.els.push({ t: "angle", at, from, to, deg, label });
  }
  right(at: string, a: string, b: string): void {
    this.els.push({ t: "right", at, a, b });
  }
  letter(id: string, dx: number, dy: number): void {
    this.letters.push({ id, dx, dy });
  }
}

function num(v: Len | undefined): number | undefined {
  if (v === undefined) return undefined;
  const n = evalLengthExpr(v);
  return Number.isFinite(n) && n > 0 ? n : NaN;
}

function okAngle(a: number | undefined): a is number {
  return typeof a === "number" && Number.isFinite(a) && a > 0 && a < 90;
}

/** Exactly one of the listed lengths must be given (non-scaleFree), or none (scaleFree). */
function oneGiven(p: HdBase, vals: Array<number | undefined>): boolean {
  const given = vals.filter((v) => v !== undefined);
  if (given.some((v) => !Number.isFinite(v as number))) return false;
  return p.scaleFree ? given.length === 0 : given.length === 1;
}

function lenLabel(p: HdBase, expr: Len | undefined, unknownLetter: string | undefined): string | undefined {
  if (expr !== undefined && !p.scaleFree) return `${prettyExpr(expr)} ${p.unit}`;
  return unknownLetter || undefined;
}

/** A world offset that lands ~`viewUnits` below the ground once the scene is fitted. */
function belowGround(width: number, height: number, viewUnits: number): number {
  const sEst = Math.min((VIEW.w - MARGIN.l - MARGIN.r) / width, (VIEW.h - MARGIN.t - MARGIN.b) / height);
  return -viewUnits / sEst;
}

function deg(a: number): string {
  return `${a}°`;
}

function finish(
  scene: Scene,
  p: HdBase,
  labels: HdLabels,
  defaults: Record<string, string>,
  title: string,
): FigureSpec | null {
  // Ground line, extended a little past the outermost ground points.
  const all = Object.values(scene.pts);
  const box0 = boundsOf(all);
  const pad = (box0.maxX - box0.minX) * 0.07;
  scene.pts.__g0 = { x: box0.minX - pad, y: 0 };
  scene.pts.__g1 = { x: box0.maxX + pad, y: 0 };
  scene.els.unshift({ t: "seg", a: "__g0", b: "__g1", role: "ground" });

  if (!withinCurriculum({ elements: scene.els })) return null;
  const box = boundsOf(Object.values(scene.pts));
  const unit = p.scaleFree ? "none" : p.unit;
  const fit = fitUniform(box, VIEW, MARGIN, unit);
  // Crop the view to the drawing (plus room for labels), so a tall or narrow scene
  // fills the card instead of floating in white space. A pure translation: the scale,
  // and so every drawn angle and length ratio, is unchanged.
  const raw = Object.values(scene.pts).map((w) => toView(fit, w));
  const vb = boundsOf(raw);
  const dx = CROP_PAD.l - vb.minX;
  const dy = CROP_PAD.t - vb.minY;
  const t = { ...fit, ox: fit.ox + dx, oy: fit.oy + dy };
  const viewBox = {
    w: Math.round(vb.maxX - vb.minX + CROP_PAD.l + CROP_PAD.r),
    h: Math.round(vb.maxY - vb.minY + CROP_PAD.t + CROP_PAD.b),
  };
  const points: Record<string, FigurePoint> = {};
  for (const [id, w] of Object.entries(scene.pts)) points[id] = toView(t, w);

  // Legibility: every labelled segment must be long enough to carry its label.
  for (const [a, b, along] of scene.labelled) {
    if (dist(points[a], points[b]) < (along ? MIN_LABELLED_SEGMENT : MIN_SIDE_LABELLED_SEGMENT)) return null;
  }
  // Every angle arc needs two rays of a usable length.
  for (const el of scene.els) {
    if (el.t !== "angle") continue;
    if (dist(points[el.at], points[el.from]) < 16 || dist(points[el.at], points[el.to]) < 16) return null;
  }

  // Point letters: the row's own letters when the binding gives ANY (then only those
  // are drawn, so a template default can never collide with a row letter); otherwise
  // the template defaults. Two points never carry the same letter.
  const rowGivesLetters = scene.letters.some((L) => labels[L.id] !== undefined);
  const letters: FigureElement[] = [];
  const used = new Set<string>();
  for (const L of scene.letters) {
    const text = rowGivesLetters ? labels[L.id] : defaults[L.id];
    if (!text) continue;
    if (used.has(text)) return null;
    used.add(text);
    letters.push({ t: "label", at: L.id, text, dx: L.dx, dy: L.dy });
  }
  const desc = scene.facts.join(" ");
  return {
    kind: "lt_figure_v1",
    viewBox,
    transform: t,
    title,
    desc,
    note: p.scaleFree ? "Not to scale: the question gives no length, so only the angles are exact." : undefined,
    points,
    elements: [...scene.els, ...letters],
  };
}

function q(labels: HdLabels, name: string): string | undefined {
  const v = labels[`q.${name}`];
  return v === undefined ? undefined : v;
}

// ───────────────────────── templates ─────────────────────────

function buildSingle(p: HdSingle, labels: HdLabels): BuildResult<HdModel> | null {
  const e = p.eye === undefined ? 0 : num(p.eye);
  if (e === undefined || !Number.isFinite(e) || e < 0) return null;
  let h = num(p.h);
  let d = num(p.d);
  let L = num(p.L);
  let theta = p.theta;
  if (p.scaleFree) return null; // a single triangle with no length is a symbolic sketch: no figure
  if ([h, d, L].some((v) => v !== undefined && !Number.isFinite(v))) return null;
  if (theta !== undefined) {
    if (!okAngle(theta)) return null;
    const given = [h, d, L].filter((v) => v !== undefined).length;
    if (given !== 1) return null;
    const tn = tanDeg(theta);
    if (h !== undefined) {
      if (h <= e) return null;
      d = (h - e) / tn;
    } else if (d !== undefined) {
      h = d * tn + e;
    } else {
      h = L! * Math.sin(theta * DEG) + e;
      d = L! * Math.cos(theta * DEG);
    }
  } else {
    if (h === undefined || d === undefined || L !== undefined) return null;
    if (h <= e) return null;
    theta = Math.atan((h - e) / d) / DEG;
    if (!okAngle(theta)) return null;
  }
  const rise = h! - e;
  L = Math.hypot(rise, d!);
  const model: HdModel = { h: h!, d: d!, L, theta: theta!, rise, e };

  const s = new Scene();
  const thetaLabel = p.theta !== undefined ? deg(p.theta) : (q(labels, "theta") ?? "θ");
  const hLabel = lenLabel(p, p.h, q(labels, "h"));
  const dLabel = lenLabel(p, p.d, q(labels, "d"));
  const LLabel = p.L !== undefined || p.showL ? lenLabel(p, p.L, q(labels, "L")) : undefined;
  const what = p.view === "shadow" ? "shadow" : "line of sight";
  if (p.view === "depression") {
    // Structure on the LEFT, object on the RIGHT; the angle is at the top, below the horizontal.
    s.p("top", 0, h!);
    s.p("foot", 0, 0);
    s.p("obs", d!, 0);
    s.p("href", d! * 0.85, h!);
    s.seg("foot", "top", "structure", hLabel, "l");
    s.seg("foot", "obs", "ground", dLabel, "b");
    s.seg("top", "href", "horizontal-ref");
    s.seg("top", "obs", "sight", LLabel, "a");
    s.angle("top", "href", "obs", theta!, thetaLabel);
    s.right("foot", "top", "obs");
    s.letter("top", -10, -6);
    s.letter("foot", -10, 14);
    s.letter("obs", 4, 15);
    s.facts.push(
      `Observer at the top of a vertical structure of height ${hLabel ?? "unknown"} looks down at a point on the ground ${dLabel ?? "an unknown distance"} from its foot; angle of depression ${thetaLabel}.`,
    );
  } else {
    // Observer (or shadow tip) on the LEFT, structure on the RIGHT.
    s.p("obs", 0, 0);
    s.p("foot", d!, 0);
    s.p("top", d!, h!);
    if (e > 0) {
      s.p("eye", 0, e);
      s.p("eyeT", d!, e);
      s.seg("obs", "eye", "structure", lenLabel(p, p.eye, undefined), "l");
      s.seg("foot", "top", "structure", hLabel, "r");
      s.seg("eye", "eyeT", "construction");
      s.seg("obs", "foot", "ground", dLabel, "b");
      s.seg("eye", "top", "sight", LLabel, "a");
      s.angle("eye", "eyeT", "top", theta!, thetaLabel);
      s.right("eyeT", "eye", "top");
      s.right("foot", "obs", "top");
      s.letter("eye", -12, -4);
    } else {
      s.seg("foot", "top", "structure", hLabel, "r");
      s.seg("obs", "foot", "ground", dLabel, "b");
      s.seg("obs", "top", "sight", LLabel, "a");
      s.angle("obs", "foot", "top", theta!, thetaLabel);
      s.right("foot", "obs", "top");
    }
    s.letter("top", 8, -6);
    s.letter("foot", 8, 15);
    s.letter("obs", -6, 15);
    s.facts.push(
      p.view === "shadow"
        ? `A vertical object of height ${hLabel ?? "unknown"} casts a shadow ${dLabel ?? "of unknown length"} on level ground; the Sun's angle of elevation is ${thetaLabel}.`
        : `A vertical structure of height ${hLabel ?? "unknown"}; an observer ${e > 0 ? `with eye height ${lenLabel(p, p.eye, undefined)} ` : ""}on the ground ${dLabel ?? "an unknown distance"} from its foot sees the top at an angle of elevation ${thetaLabel}.`,
    );
  }
  if (LLabel) s.facts.push(`The ${what} has length ${LLabel}.`);
  const spec = finish(s, p, labels, { top: "A", foot: "B", obs: "C", eye: "" }, `Heights and distances: angle ${thetaLabel}`);
  return spec ? { spec, model } : null;
}

function buildSlant(p: HdSlant, labels: HdLabels): BuildResult<HdModel> | null {
  if (!okAngle(p.theta) || p.scaleFree) return null;
  const h0 = num(p.h);
  const d0 = num(p.d);
  const L0 = num(p.L);
  const given = [h0, d0, L0].filter((v) => v !== undefined);
  if (given.length !== 1 || !given.every((v) => Number.isFinite(v as number))) return null;
  const sn = Math.sin(p.theta * DEG);
  const cs = Math.cos(p.theta * DEG);
  let L = L0 ?? (h0 !== undefined ? h0 / sn : d0! / cs);
  const h = L * sn;
  const d = L * cs;
  L = Math.hypot(h, d);
  const model: HdModel = { h, d, L, theta: p.theta, total: h + L };
  const s = new Scene();
  s.p("ground", 0, 0);
  s.p("foot", d, 0);
  s.p("top", d, h);
  s.seg("foot", "top", "structure", lenLabel(p, p.h, q(labels, "h")), "r");
  s.seg("ground", "foot", "ground", lenLabel(p, p.d, q(labels, "d")), "b");
  s.seg("ground", "top", "sight", lenLabel(p, p.L, q(labels, "L")), "a");
  s.angle("ground", "foot", "top", p.theta, deg(p.theta));
  s.right("foot", "ground", "top");
  s.letter("top", 8, -6);
  s.letter("foot", 8, 15);
  s.letter("ground", -6, 15);
  const thing = p.object === "ladder" ? "A ladder" : p.object === "string" ? "A kite string" : "The broken top part of a tree";
  s.facts.push(
    `${thing} makes an angle of ${deg(p.theta)} with the ground; vertical side ${lenLabel(p, p.h, q(labels, "h")) ?? "unknown"}, ground distance ${lenLabel(p, p.d, q(labels, "d")) ?? "unknown"}, slant length ${lenLabel(p, p.L, q(labels, "L")) ?? "unknown"}.`,
  );
  const spec = finish(s, p, labels, { top: "A", foot: "B", ground: "C" }, `Heights and distances: slant at ${deg(p.theta)}`);
  return spec ? { spec, model } : null;
}

function buildTwoSameSide(p: HdTwoSameSide, labels: HdLabels): BuildResult<HdModel> | null {
  if (!okAngle(p.far) || !okAngle(p.near) || !(p.far < p.near)) return null;
  const e = p.eye === undefined ? 0 : num(p.eye);
  if (e === undefined || !Number.isFinite(e) || e < 0) return null;
  const h0 = num(p.h);
  const g0 = num(p.gap);
  const n0 = num(p.dNear);
  const f0 = num(p.dFar);
  if (!oneGiven(p, [h0, g0, n0, f0])) return null;
  const cn = 1 / tanDeg(p.near);
  const cf = 1 / tanDeg(p.far);
  // rise = height of the top above eye level.
  let rise: number;
  if (h0 !== undefined) rise = h0 - e;
  else if (g0 !== undefined) rise = g0 / (cf - cn);
  else if (n0 !== undefined) rise = n0 / cn;
  else if (f0 !== undefined) rise = f0 / cf;
  else rise = 1; // scale-free
  if (!(rise > 0)) return null;
  const dNear = rise * cn;
  const dFar = rise * cf;
  const gap = dFar - dNear;
  const h = rise + e;
  const model: HdModel = {
    h,
    rise,
    dNear,
    dFar,
    gap,
    e,
    nearOverGap: dNear / gap,
    LNear: Math.hypot(dNear, rise),
    LFar: Math.hypot(dFar, rise),
  };
  const s = new Scene();
  const hL = lenLabel(p, p.h, q(labels, "h"));
  const gL = lenLabel(p, p.gap, q(labels, "gap"));
  const nL = lenLabel(p, p.dNear, q(labels, "dNear"));
  const fL = lenLabel(p, p.dFar, q(labels, "dFar"));
  const subject = p.subject ?? "tower";
  if (subject === "object") {
    // One observer at the left; the object at height h at two horizontal positions.
    s.p("obs", 0, 0);
    s.p("eye", 0, e);
    s.p("near", dNear, h);
    s.p("far", dFar, h);
    s.p("nearE", dNear, e);
    s.p("farE", dFar, e);
    s.p("nearG", dNear, 0);
    s.p("farG", dFar, 0);
    if (e > 0) {
      s.seg("obs", "eye", "structure", lenLabel(p, p.eye, undefined), "l");
      s.seg("nearE", "nearG", "construction");
      s.seg("farE", "farG", "construction");
    }
    s.seg("eye", "farE", "construction");
    s.seg("nearE", "near", "construction");
    s.seg("farG", "far", "measure", hL, "r");
    s.seg("near", "far", "path", gL, "a");
    s.seg("eye", "near", "sight");
    s.seg("eye", "far", "sight");
    s.angle("eye", "farE", "near", p.near, deg(p.near));
    s.angle("eye", "farE", "far", p.far, deg(p.far));
    s.right("nearE", "eye", "near");
    s.right("farE", "eye", "far");
    if (nL || fL) {
      const y = belowGround(dFar, h, 30);
      s.p("dim0", 0, y);
      if (nL) {
        s.p("dimN", dNear, y);
        s.seg("dim0", "dimN", "measure", nL, "b");
      }
      if (fL) {
        const y2 = nL ? belowGround(dFar, h, 52) : y;
        s.p("dim0b", 0, y2);
        s.p("dimF", dFar, y2);
        s.seg("dim0b", "dimF", "measure", fL, "b");
      }
    }
    s.letter("eye", -12, -4);
    s.letter("obs", -6, 15);
    s.letter("near", -4, -9);
    s.letter("far", 4, -9);
    s.letter("nearE", 5, 14);
    s.letter("farE", 5, 14);
    s.facts.push(
      `An observer${e > 0 ? ` with eye height ${lenLabel(p, p.eye, undefined)}` : ""} sees an object moving horizontally at height ${hL ?? "unknown"}: first at an angle of elevation ${deg(p.near)}, later at ${deg(p.far)}; distance moved ${gL ?? "unknown"}.`,
    );
  } else if (p.view === "depression") {
    // Structure on the LEFT; the two points to the right, nearer first.
    s.p("top", 0, h);
    s.p("foot", 0, 0);
    s.p("near", dNear, 0);
    s.p("far", dFar, 0);
    s.p("href", dFar, h);
    s.seg("foot", "top", "structure", hL, "l");
    s.seg("top", "href", "horizontal-ref");
    s.seg("foot", "near", "ground", nL, "b");
    s.seg("near", "far", "ground", gL, "b");
    s.seg("top", "near", "sight");
    s.seg("top", "far", "sight");
    s.angle("top", "href", "far", p.far, deg(p.far));
    s.angle("top", "href", "near", p.near, deg(p.near));
    s.right("foot", "top", "near");
    if (fL) {
      const y = belowGround(dFar, h, 32);
      s.p("dimA", 0, y);
      s.p("dimB", dFar, y);
      s.seg("dimA", "dimB", "measure", fL, "b");
    }
    s.letter("top", -10, -6);
    s.letter("foot", -10, 14);
    s.letter("near", 0, 15);
    s.letter("far", 0, 15);
    s.facts.push(
      `From the top of a vertical structure of height ${hL ?? "unknown"}, the angles of depression of two points on the same side are ${deg(p.near)} (nearer) and ${deg(p.far)} (farther); the points are ${gL ?? "an unknown distance"} apart.`,
    );
  } else {
    // Points on the LEFT (far, then near), structure on the RIGHT.
    s.p("far", 0, 0);
    s.p("near", gap, 0);
    s.p("foot", dFar, 0);
    s.p("top", dFar, h);
    if (e > 0) {
      s.p("farEye", 0, e);
      s.p("nearEye", gap, e);
      s.p("eyeT", dFar, e);
      s.seg("far", "farEye", "structure", lenLabel(p, p.eye, undefined), "l");
      s.seg("near", "nearEye", "structure");
      s.seg("farEye", "eyeT", "construction");
      s.seg("foot", "top", "structure", hL, "r");
      s.seg("far", "near", "ground", gL, "b");
      s.seg("near", "foot", "ground", nL, "b");
      s.seg("farEye", "top", "sight");
      s.seg("nearEye", "top", "sight");
      s.angle("farEye", "eyeT", "top", p.far, deg(p.far));
      s.angle("nearEye", "eyeT", "top", p.near, deg(p.near));
      s.right("eyeT", "farEye", "top");
    } else {
      s.seg("foot", "top", "structure", hL, "r");
      s.seg("far", "near", "ground", gL, "b");
      s.seg("near", "foot", "ground", nL, "b");
      s.seg("far", "top", "sight");
      s.seg("near", "top", "sight");
      s.angle("far", "near", "top", p.far, deg(p.far));
      s.angle("near", "foot", "top", p.near, deg(p.near));
      s.right("foot", "near", "top");
    }
    if (fL) {
      const y = belowGround(dFar, h, 32);
      s.p("dimA", 0, y);
      s.p("dimB", dFar, y);
      s.seg("dimA", "dimB", "measure", fL, "b");
      s.facts.push(`The farther point is ${fL} from the foot.`);
    }
    s.letter("top", 8, -6);
    s.letter("foot", 8, 15);
    s.letter("far", -4, 15);
    s.letter("near", 0, 15);
    s.facts.push(
      p.view === "shadow"
        ? `A vertical object of height ${hL ?? "unknown"}; with the Sun at ${deg(p.near)} its shadow ends at the nearer point, with the Sun at ${deg(p.far)} at the farther point; the tips are ${gL ?? "an unknown distance"} apart.`
        : `A vertical structure of height ${hL ?? "unknown"}; from two points on the same side, ${gL ?? "an unknown distance"} apart, the angles of elevation of the top are ${deg(p.far)} (farther) and ${deg(p.near)} (nearer).`,
    );
  }
  const spec = finish(
    s,
    p,
    labels,
    { top: "A", foot: "B", near: "C", far: "D" },
    `Heights and distances: angles ${deg(p.far)} and ${deg(p.near)}`,
  );
  return spec ? { spec, model } : null;
}

function buildOpposite(p: HdOpposite, labels: HdLabels): BuildResult<HdModel> | null {
  if (!okAngle(p.left) || !okAngle(p.right)) return null;
  const h0 = num(p.h);
  const t0 = num(p.total);
  const l0 = num(p.dLeft);
  const r0 = num(p.dRight);
  if (!oneGiven(p, [h0, t0, l0, r0])) return null;
  const cl = 1 / tanDeg(p.left);
  const cr = 1 / tanDeg(p.right);
  let h: number;
  if (h0 !== undefined) h = h0;
  else if (t0 !== undefined) h = t0 / (cl + cr);
  else if (l0 !== undefined) h = l0 / cl;
  else if (r0 !== undefined) h = r0 / cr;
  else h = 1;
  const dLeft = h * cl;
  const dRight = h * cr;
  const model: HdModel = { h, dLeft, dRight, total: dLeft + dRight, LLeft: Math.hypot(dLeft, h), LRight: Math.hypot(dRight, h) };
  const s = new Scene();
  const hL = lenLabel(p, p.h, q(labels, "h"));
  const lL = lenLabel(p, p.dLeft, q(labels, "dLeft"));
  const rL = lenLabel(p, p.dRight, q(labels, "dRight"));
  const tL = lenLabel(p, p.total, q(labels, "total"));
  s.p("top", 0, h);
  s.p("foot", 0, 0);
  s.p("left", -dLeft, 0);
  s.p("right", dRight, 0);
  s.seg("foot", "top", "structure", hL, "r");
  s.seg("left", "foot", "ground", lL, "b");
  s.seg("foot", "right", "ground", rL, "b");
  s.seg("left", "top", "sight");
  s.seg("right", "top", "sight");
  if (p.view === "depression") {
    s.p("hrefL", -dLeft * 0.75, h);
    s.p("hrefR", dRight * 0.75, h);
    s.seg("hrefL", "hrefR", "horizontal-ref");
    s.angle("top", "hrefL", "left", p.left, deg(p.left));
    s.angle("top", "hrefR", "right", p.right, deg(p.right));
  } else {
    s.angle("left", "foot", "top", p.left, deg(p.left));
    s.angle("right", "foot", "top", p.right, deg(p.right));
  }
  if (tL) {
    // The given total as a dimension line below the ground, ~30 view units down.
    const sEst = Math.min((VIEW.w - MARGIN.l - MARGIN.r) / (dLeft + dRight), (VIEW.h - MARGIN.t - MARGIN.b) / h);
    const below = -30 / sEst;
    s.p("dimL", -dLeft, below);
    s.p("dimR", dRight, below);
    s.seg("dimL", "dimR", "measure", tL, "b");
  }
  s.right("foot", "left", "top");
  s.letter("top", 7, -7);
  s.letter("foot", 7, 15);
  s.letter("left", -6, 15);
  s.letter("right", 4, 15);
  s.facts.push(
    `A vertical height ${hL ?? "unknown"}; two points on OPPOSITE sides of its foot${tL ? `, ${tL} apart` : ""}; angles of ${p.view} ${deg(p.left)} (left) and ${deg(p.right)} (right).`,
  );
  if (tL) s.facts.push(`Total distance between the points: ${tL}.`);
  const spec = finish(s, p, labels, { top: "A", foot: "B", left: "C", right: "D" }, `Heights and distances: opposite sides, ${deg(p.left)} and ${deg(p.right)}`);
  return spec ? { spec, model } : null;
}

function buildStacked(p: HdStacked, labels: HdLabels): BuildResult<HdModel> | null {
  if (!okAngle(p.lower) || !okAngle(p.upper) || !(p.lower < p.upper)) return null;
  const d0 = num(p.d);
  const a0 = num(p.h1);
  const b0 = num(p.h2);
  const l0 = num(p.len);
  if (!oneGiven(p, [d0, a0, b0, l0])) return null;
  const tl = tanDeg(p.lower);
  const tu = tanDeg(p.upper);
  let d: number;
  if (d0 !== undefined) d = d0;
  else if (a0 !== undefined) d = a0 / tl;
  else if (b0 !== undefined) d = b0 / tu;
  else if (l0 !== undefined) d = l0 / (tu - tl);
  else d = 1;
  const h1 = d * tl;
  const h2 = d * tu;
  const model: HdModel = { d, h1, h2, len: h2 - h1, L1: Math.hypot(d, h1), L2: Math.hypot(d, h2) };
  const s = new Scene();
  const dL = lenLabel(p, p.d, q(labels, "d"));
  const aL = lenLabel(p, p.h1, q(labels, "h1"));
  const bL = lenLabel(p, p.h2, q(labels, "h2"));
  const lL = lenLabel(p, p.len, q(labels, "len"));
  s.p("obs", 0, 0);
  s.p("foot", d, 0);
  s.p("mid", d, h1);
  s.p("top", d, h2);
  const rising = p.style === "rising";
  s.seg("foot", "mid", rising ? "path" : "structure", aL, "r");
  s.seg("mid", "top", rising ? "path" : "structure", lL, "r");
  if (bL) {
    s.p("dimB", d * 1.12, 0);
    s.p("dimT", d * 1.12, h2);
    s.seg("dimB", "dimT", "measure", bL, "r");
  }
  s.seg("obs", "foot", "ground", dL, "b");
  s.seg("obs", "mid", "sight");
  s.seg("obs", "top", "sight");
  s.angle("obs", "foot", "mid", p.lower, deg(p.lower));
  s.angle("obs", "foot", "top", p.upper, deg(p.upper));
  s.right("foot", "obs", "mid");
  if (rising) {
    s.els.push({ t: "dot", at: "mid" }, { t: "dot", at: "top" });
  }
  s.letter("top", -12, -4);
  s.letter("mid", -12, 4);
  s.letter("foot", 8, 15);
  s.letter("obs", -6, 15);
  s.facts.push(
    rising
      ? `An object rises vertically; from a point ${dL ?? "an unknown distance"} away on the ground its angle of elevation changes from ${deg(p.lower)} to ${deg(p.upper)}; heights ${aL ?? "unknown"} and ${bL ?? "unknown"}, rise ${lL ?? "unknown"}.`
      : `From a point on the ground ${dL ?? "an unknown distance"} from the foot, the angle of elevation of the lower top (height ${aL ?? "unknown"}) is ${deg(p.lower)} and of the upper top is ${deg(p.upper)}; the upper part is ${lL ?? "unknown"} long.`,
  );
  const spec = finish(s, p, labels, { top: "D", mid: "B", foot: "A", obs: "P" }, `Heights and distances: angles ${deg(p.lower)} and ${deg(p.upper)} from one point`);
  return spec ? { spec, model } : null;
}

function buildElevDep(p: HdElevDep, labels: HdLabels): BuildResult<HdModel> | null {
  if (!okAngle(p.top) || !okAngle(p.foot)) return null;
  const a0 = num(p.H1);
  const d0 = num(p.d);
  const b0 = num(p.H2);
  if (!oneGiven(p, [a0, d0, b0])) return null;
  const tf = tanDeg(p.foot);
  const tt = tanDeg(p.top);
  const sign = p.topView === "elevation" ? 1 : -1;
  if (sign < 0 && !(p.top < p.foot)) return null; // the top must be above the foot
  // H2 = H1 + sign * d * tt, H1 = d * tf.
  let d: number;
  if (a0 !== undefined) d = a0 / tf;
  else if (d0 !== undefined) d = d0;
  else if (b0 !== undefined) d = b0 / (tf + sign * tt);
  else d = 1;
  const H1 = d * tf;
  const H2 = H1 + sign * d * tt;
  if (!(H2 > 0)) return null;
  const model: HdModel = { H1, d, H2, diff: Math.abs(H2 - H1), Ltop: Math.hypot(d, H2 - H1), Lfoot: Math.hypot(d, H1) };
  const s = new Scene();
  const aL = lenLabel(p, p.H1, q(labels, "H1"));
  const dL = lenLabel(p, p.d, q(labels, "d"));
  const bL = lenLabel(p, p.H2, q(labels, "H2"));
  s.p("obs", 0, H1);
  s.p("obsFoot", 0, 0);
  s.p("foot", d, 0);
  s.p("top", d, H2);
  s.p("meet", d, H1);
  s.seg("obsFoot", "obs", "structure", aL, "l");
  s.seg("foot", "top", "structure");
  if (bL) {
    s.p("dimB", d * 1.1, 0);
    s.p("dimT", d * 1.1, H2);
    s.seg("dimB", "dimT", "measure", bL, "r");
  }
  s.seg("obsFoot", "foot", "ground", dL, "b");
  s.seg("obs", "meet", "horizontal-ref");
  const diffL = q(labels, "diff");
  if (sign > 0 && diffL) s.seg("meet", "top", "measure", diffL, "r");
  s.seg("obs", "top", "sight");
  s.seg("obs", "foot", "sight");
  s.angle("obs", "meet", "top", p.top, deg(p.top));
  s.angle("obs", "meet", "foot", p.foot, deg(p.foot));
  s.right("obsFoot", "obs", "foot");
  s.letter("obs", -10, -6);
  s.letter("obsFoot", -10, 14);
  s.letter("foot", 8, 15);
  s.letter("top", 8, -6);
  s.letter("meet", 8, 4);
  s.facts.push(
    `An observer at height ${aL ?? "unknown"} sees the top of a second vertical structure at an angle of ${p.topView} ${deg(p.top)} and its foot at an angle of depression ${deg(p.foot)}; horizontal distance ${dL ?? "unknown"}; second structure height ${bL ?? "unknown"}.`,
  );
  const spec = finish(s, p, labels, { obs: "A", obsFoot: "B", foot: "C", top: "D", meet: "E" }, `Heights and distances: ${p.topView} ${deg(p.top)}, depression ${deg(p.foot)}`);
  return spec ? { spec, model } : null;
}

function buildTwoVertical(p: HdTwoVertical, labels: HdLabels): BuildResult<HdModel> | null {
  if (!okAngle(p.ground) || !okAngle(p.upper) || !(p.upper < p.ground)) return null;
  const k0 = num(p.k);
  const H0 = num(p.H);
  const d0 = num(p.d);
  if (!oneGiven(p, [k0, H0, d0])) return null;
  const tg = tanDeg(p.ground);
  const tu = tanDeg(p.upper);
  let d: number;
  if (k0 !== undefined) d = k0 / (tg - tu);
  else if (H0 !== undefined) d = H0 / tg;
  else if (d0 !== undefined) d = d0;
  else d = 1;
  const H = d * tg;
  const k = d * (tg - tu);
  const model: HdModel = { d, H, k, LP: Math.hypot(d, H), LQ: Math.hypot(d, H - k) };
  const s = new Scene();
  const kL = lenLabel(p, p.k, q(labels, "k"));
  const HL = lenLabel(p, p.H, q(labels, "H"));
  const dL = lenLabel(p, p.d, q(labels, "d"));
  s.p("P", 0, 0);
  s.p("Q", 0, k);
  s.p("foot", d, 0);
  s.p("top", d, H);
  s.p("meet", d, k);
  s.seg("P", "Q", "structure", kL, "l");
  s.seg("foot", "top", "structure", HL, "r");
  s.seg("P", "foot", "ground", dL, "b");
  s.seg("Q", "meet", "construction");
  s.seg("P", "top", "sight");
  s.seg("Q", "top", "sight");
  s.angle("P", "foot", "top", p.ground, deg(p.ground));
  s.angle("Q", "meet", "top", p.upper, deg(p.upper));
  s.right("foot", "P", "top");
  s.letter("P", -10, 14);
  s.letter("Q", -12, -4);
  s.letter("foot", 8, 15);
  s.letter("top", 8, -6);
  s.facts.push(
    `From a point P on the ground the angle of elevation of the top of a vertical structure (height ${HL ?? "unknown"}) is ${deg(p.ground)}; from Q, ${kL ?? "an unknown height"} vertically above P, it is ${deg(p.upper)}; horizontal distance ${dL ?? "unknown"}.`,
  );
  const spec = finish(s, p, labels, { P: "P", Q: "Q", foot: "B", top: "A" }, `Heights and distances: ${deg(p.ground)} from P, ${deg(p.upper)} from Q above it`);
  return spec ? { spec, model } : null;
}

function buildTwoStructures(p: HdTwoStructures, labels: HdLabels): BuildResult<HdModel> | null {
  if (!okAngle(p.atLeftFoot) || !okAngle(p.atRightFoot)) return null;
  const l0 = num(p.leftH);
  const r0 = num(p.rightH);
  const d0 = num(p.d);
  if (!oneGiven(p, [l0, r0, d0])) return null;
  const tL = tanDeg(p.atLeftFoot); // right top seen from the left foot
  const tR = tanDeg(p.atRightFoot); // left top seen from the right foot
  let d: number;
  if (d0 !== undefined) d = d0;
  else if (r0 !== undefined) d = r0 / tL;
  else if (l0 !== undefined) d = l0 / tR;
  else d = 1;
  const rightH = d * tL;
  const leftH = d * tR;
  const model: HdModel = { d, leftH, rightH };
  const s = new Scene();
  const lL = lenLabel(p, p.leftH, q(labels, "leftH"));
  const rL = lenLabel(p, p.rightH, q(labels, "rightH"));
  const dL = lenLabel(p, p.d, q(labels, "d"));
  s.p("lFoot", 0, 0);
  s.p("lTop", 0, leftH);
  s.p("rFoot", d, 0);
  s.p("rTop", d, rightH);
  s.seg("lFoot", "lTop", "structure", lL, "l");
  s.seg("rFoot", "rTop", "structure", rL, "r");
  s.seg("lFoot", "rFoot", "ground", dL, "b");
  s.seg("lFoot", "rTop", "sight");
  s.seg("rFoot", "lTop", "sight");
  s.angle("lFoot", "rFoot", "rTop", p.atLeftFoot, deg(p.atLeftFoot));
  s.angle("rFoot", "lFoot", "lTop", p.atRightFoot, deg(p.atRightFoot));
  s.letter("lTop", -10, -6);
  s.letter("lFoot", -10, 14);
  s.letter("rTop", 10, -6);
  s.letter("rFoot", 10, 14);
  s.facts.push(
    `Two vertical structures ${dL ?? "an unknown distance"} apart on level ground, heights ${lL ?? "unknown"} (left) and ${rL ?? "unknown"} (right). From the left foot the right top is at an angle of elevation ${deg(p.atLeftFoot)}; from the right foot the left top is at ${deg(p.atRightFoot)}.`,
  );
  const spec = finish(s, p, labels, { lTop: "P", lFoot: "Q", rTop: "S", rFoot: "R" }, `Heights and distances: two structures, ${deg(p.atLeftFoot)} and ${deg(p.atRightFoot)}`);
  return spec ? { spec, model } : null;
}

/** Build a heights-and-distances figure from a row's own numbers, or refuse with null. */
export function buildHeightsDistances(p: HdParams, labels: HdLabels = {}): BuildResult<HdModel> | null {
  switch (p.template) {
    case "single":
      return buildSingle(p, labels);
    case "slant":
      return buildSlant(p, labels);
    case "twoPointsSameSide":
      return buildTwoSameSide(p, labels);
    case "twoPointsOppositeSides":
      return buildOpposite(p, labels);
    case "objectOnObject":
      return buildStacked(p, labels);
    case "elevDepFromHeight":
      return buildElevDep(p, labels);
    case "twoVerticalPoints":
      return buildTwoVertical(p, labels);
    case "twoStructuresCross":
      return buildTwoStructures(p, labels);
    default:
      return null;
  }
}
