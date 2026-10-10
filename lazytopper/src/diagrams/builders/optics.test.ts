/**
 * DIAGRAMS-1 PR-2b — the ray-optics builder draws the row's OWN numbers by the RULES,
 * and its image is where the mirror / lens formula (and the row's own answer) puts it.
 *
 * Every assertion reads the DRAWN figure back through the recorded world -> view
 * transform: the image tip sits at (v, h') of the formula; every ray (or its dashed
 * backward extension) passes through that tip; each ray obeys its rule (parallel ->
 * through F; through O undeviated; through F -> parallel; through C -> retraces; at P
 * -> symmetric); rays meet the device on the pole plane under a mirror symbol whose
 * sagitta is pinned; dimension labels equal their drawn lengths.
 */
import { describe, expect, it } from "vitest";
import type { FigureElement, FigurePoint, FigureSpec } from "../figureSpec";
import { ALL_COMPUTED_FIGURE_BINDINGS, buildComputedFigure } from "../registry";
import { LIGHT_REFUSED, LIGHT_SOLUTION_FIGURES } from "../registry/lightSolutionFigures";
import {
  CASE_NOTE,
  DEVICE_POSITIONS,
  MAX_MIRROR_SAG,
  MIN_F_VIEW,
  MIRROR_NOTE,
  OPTICS_REFUSAL,
  buildOptics,
  isMirror,
  solveOptics,
} from "./optics";
import type { CasePosition, OpticsCaseParams, OpticsDevice, OpticsImageParams, OpticsModel, OpticsParams } from "./optics";

type Seg = Extract<FigureElement, { t: "seg" }>;

function segs(spec: FigureSpec, role?: string): Seg[] {
  return spec.elements.filter((e): e is Seg => e.t === "seg" && (role === undefined || e.role === role));
}

/** Distance from point q to the infinite line through a, b. */
function lineDist(a: FigurePoint, b: FigurePoint, q: FigurePoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.abs(dx * (q.y - a.y) - dy * (q.x - a.x)) / Math.hypot(dx, dy);
}

/** Distance from q to the SEGMENT a-b. */
function segDist(a: FigurePoint, b: FigurePoint, q: FigurePoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((q.x - a.x) * dx + (q.y - a.y) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(a.x + dx * t - q.x, a.y + dy * t - q.y);
}

function cross(a: FigurePoint, b: FigurePoint): number {
  return a.x * b.y - a.y * b.x;
}
function sub(a: FigurePoint, b: FigurePoint): FigurePoint {
  return { x: a.x - b.x, y: a.y - b.y };
}
function unitv(v: FigurePoint): FigurePoint {
  const n = Math.hypot(v.x, v.y);
  return { x: v.x / n, y: v.y / n };
}

const TOL = 0.5; // view units
/** Direction tolerance (unit vectors): view points are rounded to 0.001 units. */
const DTOL = 2e-3;

/** Which rule a drawn ray obeys (null = none — a broken ray). */
function ruleOf(spec: FigureSpec, i: number, device: OpticsDevice): "parallel" | "O" | "P" | "F" | "C" | null {
  const P = spec.points;
  const a = P[`r${i}a`];
  const inc = P[`r${i}i`];
  const e = P[`r${i}e`];
  const din = unitv(sub(inc, a));
  const dout = unitv(sub(e, inc));
  const mir = isMirror(device);
  const pole = P[mir ? "P" : "O"];
  const focus = mir ? [P.F] : [P.F1, P.F2];
  const atPole = Math.abs(inc.y - pole.y) < 1e-6;
  // Parallel to the axis -> the outgoing line (or its extension) passes through F.
  if (Math.abs(a.y - inc.y) < 1e-6 && focus.some((F) => lineDist(inc, e, F) < TOL)) return "parallel";
  if (atPole && !mir && Math.abs(cross(din, dout)) < DTOL && din.x * dout.x > 0) return "O";
  if (atPole && mir && Math.abs(din.x + dout.x) < DTOL && Math.abs(din.y - dout.y) < DTOL) return "P";
  // Through / towards F -> leaves parallel to the axis.
  if (Math.abs(dout.y) < DTOL && focus.some((F) => lineDist(a, inc, F) < TOL)) return "F";
  // Through / towards C -> retraces itself.
  if (mir && Math.abs(din.x + dout.x) < DTOL && Math.abs(din.y + dout.y) < DTOL && lineDist(a, inc, P.C) < TOL) return "C";
  return null;
}

/** Every geometric invariant of a drawn ray diagram, checked against its own model. */
function assertRayDiagram(spec: FigureSpec, p: OpticsParams, model: OpticsModel): void {
  const P = spec.points;
  const t = spec.transform;
  const mir = isMirror(p.device);
  const pole = P[mir ? "P" : "O"];
  // Rays meet the device on the pole plane (the paraxial model) — every incidence point.
  const rayIdx = Object.keys(P)
    .filter((k) => /^r\d+i$/.test(k))
    .map((k) => Number(k.slice(1, -1)));
  expect(rayIdx.length).toBeGreaterThanOrEqual(2);
  for (const i of rayIdx) expect(Math.abs(P[`r${i}i`].x - pole.x)).toBeLessThan(1e-6);
  // R5: the mirror symbol's sagitta is pinned; the note states the model.
  const found = spec.elements.find((e) => e.t === "mirror" || e.t === "lens");
  expect(found).toBeDefined();
  const dev = found!;
  if (mir) {
    expect(dev.t).toBe("mirror");
    if (dev.t === "mirror") {
      expect(dev.sag).toBeLessThanOrEqual(MAX_MIRROR_SAG);
      expect(dev.kind).toBe(p.device === "concave mirror" ? "concave" : "convex");
      // The symbol reaches every incidence point.
      for (const i of rayIdx) expect(Math.abs(P[`r${i}i`].y - pole.y)).toBeLessThan(dev.half);
    }
    expect(spec.note).toContain(MIRROR_NOTE);
  } else {
    expect(dev.t).toBe("lens");
    if (dev.t === "lens") expect(dev.kind).toBe(p.device === "convex lens" ? "convex" : "concave");
  }
  // Axis marks sit at their formula positions: F at f, C at 2f (mirror); F₁, F₂, 2F₁, 2F₂ (lens).
  const f = model.f ?? (p.device === "concave mirror" || p.device === "concave lens" ? -10 : 10);
  const xAt = (x: number) => t.ox + x * t.sx;
  if (mir) {
    expect(Math.abs(P.F.x - xAt(f))).toBeLessThan(1e-2);
    expect(Math.abs(P.C.x - xAt(2 * f))).toBeLessThan(1e-2);
  } else {
    expect(Math.abs(P.F2.x - xAt(Math.abs(f)))).toBeLessThan(1e-2);
    expect(Math.abs(P["2F1"].x - xAt(-2 * Math.abs(f)))).toBeLessThan(1e-2);
  }
  expect(Math.abs(f) * t.sx).toBeGreaterThanOrEqual(MIN_F_VIEW);
  // Every ray obeys a rule; the first is the ray parallel to the axis.
  const rules = rayIdx.map((i) => ruleOf(spec, i, p.device));
  expect(rules.every((r) => r !== null), `rules ${JSON.stringify(rules)}`).toBe(true);
  expect(rules[0]).toBe("parallel");
  if (p.second) expect(rules[1]).toBe(p.second);

  const hasImage = P.It !== undefined;
  const virt = segs(spec, "ray-virtual");
  if (hasImage) {
    const It = P.It;
    const v = model.v;
    const hi = model.m * (P.Ot ? (pole.y - P.Ot.y) / t.sy : NaN);
    // The image tip IS the formula's image.
    expect(Math.abs(It.x - xAt(v))).toBeLessThan(1e-2);
    expect(Math.abs(It.y - (t.oy - hi * t.sy))).toBeLessThan(1e-2);
    // h'/h = m, read off the drawing.
    const m = (pole.y - It.y) / (pole.y - P.Ot.y);
    expect(Math.abs(m - model.m)).toBeLessThan(1e-3 * Math.max(1, Math.abs(model.m)));
    const real = model.real === 1;
    expect(segs(spec, real ? "image" : "image-virtual").length).toBe(1);
    expect(segs(spec, real ? "image-virtual" : "image").length).toBe(0);
    for (const i of rayIdx) {
      const inc = P[`r${i}i`];
      const e = P[`r${i}e`];
      if (real) {
        // The ray itself passes through the real image.
        expect(segDist(inc, e, It), `ray ${i} misses the real image`).toBeLessThan(TOL);
      } else {
        // A dashed backward extension reaches the virtual image (for the undeviated
        // lens ray, its own incident line does, dashed beyond the object tip).
        const ok =
          virt.some((s) => segDist(P[s.a], P[s.b], It) < TOL && (s.a === `r${i}i` || s.a === `r${i}a`)) ||
          (rules[i] === "O" && segDist(P[`r${i}a`], inc, It) < TOL);
        expect(ok, `ray ${i} has no dashed extension through the virtual image`).toBe(true);
        expect(lineDist(inc, e, It)).toBeLessThan(TOL);
      }
    }
    if (!real) expect(virt.length).toBeGreaterThanOrEqual(1);
    if (real) expect(virt.length).toBe(0);
    // Arrowheads at both tips.
    expect(segs(spec).filter((s) => s.arrow === "end").map((s) => s.b).sort()).toEqual(["It", "Ot"]);
  }
  // A given object height is printed beside the object.
  if (p.template === "image" && p.ho !== undefined) {
    const labels = spec.elements.flatMap((e) => (e.t === "label" ? [e.text] : []));
    expect(labels).toContain(`h = ${p.ho} ${p.unit}`);
  }
  // Rays carry direction chevrons.
  expect(segs(spec, "ray").every((s) => s.arrow === "mid")).toBe(true);
  // Dimension lines read back their own labels.
  for (const s of segs(spec, "measure")) {
    if (!s.label) continue;
    const mm = /([+−-]?)(\d+(?:\.\d+)?)/.exec(s.label.text.replace(/^[a-z] = /, ""));
    if (!mm) continue; // "v = ?"
    const len = Math.abs(P[s.b].x - P[s.a].x) / t.sx;
    expect(Math.abs(len - Number(mm[2])) / Number(mm[2])).toBeLessThan(0.005);
  }
}

function build(p: OpticsParams) {
  const r = buildOptics(p);
  expect(r, `builds ${JSON.stringify(p)} (${OPTICS_REFUSAL.last})`).not.toBeNull();
  assertRayDiagram(r!.spec, p, r!.model);
  return r!;
}

const near = (a: number, b: number, tolPct = 0.5) => Math.abs(a - b) / Math.abs(b) <= tolPct / 100;

function formulaResidual(d: OpticsDevice, m: OpticsModel): number {
  return isMirror(d) ? 1 / m.v + 1 / m.u - 1 / m.f : 1 / m.v - 1 / m.u - 1 / m.f;
}

describe("optics.image — the design's sample rows (L1-L4) and the formula", () => {
  it("L1 LIGHT-NCERT-9-LA-010: convex lens f 10, u 25, h 5 -> v +16.67, m −2/3, h′ −3.33 (real: solid)", () => {
    const p: OpticsImageParams = { template: "image", device: "convex lens", unit: "cm", f: "10", u: "25", ho: "5" };
    const r = build(p);
    expect(Math.abs(formulaResidual(p.device, r.model))).toBeLessThan(1e-9);
    expect(near(r.model.v, 50 / 3)).toBe(true);
    expect(near(r.model.m, -2 / 3)).toBe(true);
    expect(near(r.model.hi, -10 / 3)).toBe(true);
    expect(r.model.real).toBe(1);
  });
  it("L2 LIGHT-NCERT-9-LA-011: concave lens f 15, virtual image at 10 -> u −30 (virtual: dashed)", () => {
    const p: OpticsImageParams = { template: "image", device: "concave lens", unit: "cm", f: "15", v: "10", image: "virtual" };
    const r = build(p);
    expect(near(r.model.u, -30)).toBe(true);
    expect(r.model.erect).toBe(1);
    expect(segs(r.spec, "ray-virtual").length).toBeGreaterThanOrEqual(1);
  });
  it("L3 PYQ-S-LIGHT-006: f 25 (from +4 D), u 50 -> v +50, m −1", () => {
    const r = build({ template: "image", device: "convex lens", unit: "cm", f: "25", u: "50" });
    expect(near(r.model.v, 50)).toBe(true);
    expect(near(r.model.m, -1)).toBe(true);
  });
  it("L4 GDR-L-CBJ-031: convex lens f 10, u 8 -> v −40, m +5 (virtual, magnified)", () => {
    const r = build({ template: "image", device: "convex lens", unit: "cm", f: "10", u: "8" });
    expect(near(r.model.v, -40)).toBe(true);
    expect(near(r.model.m, 5)).toBe(true);
    expect(r.model.real).toBe(-1);
  });
  it("concave mirror, object inside F (FND-L-SPQ-030 scene 2): f 15, u 10 -> v +30 behind, m +3; ≥ 2 dashed extensions", () => {
    const p: OpticsImageParams = { template: "image", device: "concave mirror", unit: "cm", f: "15", u: "10" };
    const r = build(p);
    expect(Math.abs(formulaResidual(p.device, r.model))).toBeLessThan(1e-9);
    expect(near(r.model.v, 30)).toBe(true);
    expect(near(r.model.m, 3)).toBe(true);
    expect(segs(r.spec, "ray-virtual").length).toBeGreaterThanOrEqual(2);
  });
  it("concave mirror from u and a real v (GDR-L-CBJ-017): u 15, v 60 -> f −12, m −4", () => {
    const r = build({ template: "image", device: "concave mirror", unit: "cm", u: "15", v: "60", image: "real" });
    expect(near(r.model.f, -12)).toBe(true);
    expect(near(r.model.m, -4)).toBe(true);
  });
  it("concave mirror from u and m (FND-L-SPQ-012): u 16, m −3 -> f −12", () => {
    const r = build({ template: "image", device: "concave mirror", unit: "cm", u: "16", m: "-3" });
    expect(near(r.model.f, -12)).toBe(true);
    expect(near(r.model.v, -48)).toBe(true);
  });
  it("convex mirror (PYQ-S-2025-LIGHT-020 OR): f 3 m, u 6 m -> v +2 m behind; second ray towards C", () => {
    const r = build({ template: "image", device: "convex mirror", unit: "m", f: "3", u: "6" });
    expect(near(r.model.v, 2)).toBe(true);
    expect(ruleOf(r.spec, 1, "convex mirror")).toBe("C");
  });
  it("a row-named second ray is used: concave mirror at C with the ray through F (GDR-L-MER-03)", () => {
    const r = build({ template: "case", device: "concave mirror", position: "at C", second: "F" });
    expect(ruleOf(r.spec, 1, "concave mirror")).toBe("F");
    const r2 = build({ template: "case", device: "concave mirror", position: "between P and F", second: "C" });
    expect(ruleOf(r2.spec, 1, "concave mirror")).toBe("C");
  });
  it("uses ONE axis scale; heights to their own scale only with a TRUE note", () => {
    // h given and legible at sx: uniform, no heights note.
    const a = build({ template: "image", device: "convex lens", unit: "cm", f: "20", u: "30", ho: "4" });
    if (a.spec.transform.sx === a.spec.transform.sy) expect(a.spec.note ?? "").not.toMatch(/Heights are drawn/);
    else expect(a.spec.note).toMatch(/Heights are drawn to a different scale/);
    // No height given: the note says the height is a drawing size.
    const b = build({ template: "image", device: "convex lens", unit: "cm", f: "10", u: "25" });
    expect(b.spec.note).toMatch(/height is not given/);
    // A 5 cm object at 25 cm with f 10 is too short at the axis scale: sy ≠ sx and the note says so.
    const c = build({ template: "image", device: "convex lens", unit: "cm", f: "10", u: "25", ho: "5" });
    expect(c.spec.transform.sy === c.spec.transform.sx || /different scale/.test(c.spec.note ?? "")).toBe(true);
  });
  it("labels givens with their signed values and unknowns with '?'", () => {
    const r = build({ template: "image", device: "convex lens", unit: "cm", f: "10", u: "25", ho: "5" });
    const text = segs(r.spec, "measure").flatMap((s) => (s.label ? [s.label.text] : []));
    expect(text).toEqual(["f = +10 cm", "u = −25 cm", "v = ?"]);
  });
});

describe("optics.image — REFUSES rather than draws a wrong figure", () => {
  const refusals: Array<[string, OpticsImageParams]> = [
    ["under-determined (f only)", { template: "image", device: "convex lens", unit: "cm", f: "10" }],
    ["over-determined (f, u and v)", { template: "image", device: "convex lens", unit: "cm", f: "10", u: "25", v: "50/3", image: "real" }],
    ["object at F (image at infinity)", { template: "image", device: "convex lens", unit: "cm", f: "10", u: "10" }],
    ["v without a side", { template: "image", device: "concave lens", unit: "cm", f: "15", v: "10" }],
    ["a 'real' image a concave lens cannot form", { template: "image", device: "concave lens", unit: "cm", f: "15", v: "10", image: "real" }],
    ["row says real, formula says virtual (object inside F)", { template: "image", device: "convex lens", unit: "cm", f: "10", u: "8", image: "real" }],
    ["u and v giving the wrong focal-length sign for the device", { template: "image", device: "convex mirror", unit: "cm", u: "15", v: "60", image: "real" }],
    ["zero focal length", { template: "image", device: "convex lens", unit: "cm", f: "0", u: "10" }],
    ["a length that is not a number", { template: "image", device: "convex lens", unit: "cm", f: "x", u: "10" }],
    ["illegible: u just beyond f (huge image far away)", { template: "image", device: "convex lens", unit: "cm", f: "10", u: "10.2" }],
    ["illegible: a tiny image (|m| ≈ 0.01)", { template: "image", device: "convex lens", unit: "cm", f: "1", u: "100" }],
    ["a second ray the device has no rule for (C on a lens)", { template: "image", device: "convex lens", unit: "cm", f: "10", u: "25", second: "C" }],
  ];
  for (const [name, p] of refusals) {
    it(`refuses: ${name}`, () => {
      expect(buildOptics(p)).toBeNull();
      expect(OPTICS_REFUSAL.last).not.toBe("");
    });
  }
  it("CONTROL: the same givens minus the defect build", () => {
    expect(buildOptics({ template: "image", device: "convex lens", unit: "cm", f: "10", u: "25" })).not.toBeNull();
    expect(buildOptics({ template: "image", device: "concave lens", unit: "cm", f: "15", v: "10", image: "virtual" })).not.toBeNull();
    expect(buildOptics({ template: "image", device: "convex lens", unit: "cm", f: "10", u: "8", image: "virtual" })).not.toBeNull();
    expect(buildOptics({ template: "image", device: "concave mirror", unit: "cm", u: "15", v: "60", image: "real" })).not.toBeNull();
  });
  it("solveOptics needs exactly two givens", () => {
    expect(solveOptics({ template: "image", device: "convex lens", unit: "cm", u: "25" })).toBeNull();
    expect(solveOptics({ template: "image", device: "convex lens", unit: "cm", f: "10", u: "25" })).not.toBeNull();
  });
});

// NCERT's tables (Class X, Tables 10.1 and 10.2 and the convex-mirror / concave-lens text):
// [real(+1)/virtual(−1), erect(+1)/inverted(−1), size: 0.5 point, 1 diminished, 2 same, 3 magnified, 4 highly magnified]
const NCERT: Record<OpticsDevice, Partial<Record<CasePosition, [number, number, number]>>> = {
  "concave mirror": {
    infinity: [1, -1, 0.5],
    "beyond C": [1, -1, 1],
    "at C": [1, -1, 2],
    "between F and C": [1, -1, 3],
    "at F": [1, -1, 4],
    "between P and F": [-1, 1, 3],
  },
  "convex mirror": { infinity: [-1, 1, 0.5], finite: [-1, 1, 1] },
  "convex lens": {
    infinity: [1, -1, 0.5],
    "beyond 2F": [1, -1, 1],
    "at 2F": [1, -1, 2],
    "between F and 2F": [1, -1, 3],
    "at F": [1, -1, 4],
    "between F and O": [-1, 1, 3],
  },
  "concave lens": { infinity: [-1, 1, 0.5], finite: [-1, 1, 1], "at F": [-1, 1, 1], "between F and 2F": [-1, 1, 1], "beyond 2F": [-1, 1, 1] },
};

describe("optics.case — every standard position, against NCERT's table", () => {
  for (const d of Object.keys(DEVICE_POSITIONS) as OpticsDevice[]) {
    for (const pos of DEVICE_POSITIONS[d]) {
      it(`${d}, object ${pos}`, () => {
        const p: OpticsCaseParams = { template: "case", device: d, position: pos };
        const r = build(p);
        const want = NCERT[d][pos]!;
        expect([r.model.real, r.model.erect, r.model.size]).toEqual(want);
        // No numbers anywhere; the note says it is a standard construction.
        const text = r.spec.elements.flatMap((e) => (e.t === "label" ? [e.text] : e.t === "seg" && e.label ? [e.label.text] : []));
        // (point names like 2F₁ are letters, not values)
        for (const s of text) expect(s.replace(/^2F[₁₂]?$/, "")).not.toMatch(/\d/);
        expect(segs(r.spec, "measure").length).toBe(0);
        expect(r.spec.note).toContain(CASE_NOTE);
        expect(r.spec.transform.unit).toBe("none");
        // The representative u lies strictly inside the named range (or exactly at the named point).
        if (pos !== "infinity") {
          const k = -r.model.u / 10;
          const range: Record<string, [number, number]> = {
            "beyond C": [2, Infinity],
            "beyond 2F": [2, Infinity],
            "at C": [2, 2],
            "at 2F": [2, 2],
            "between F and C": [1, 2],
            "between F and 2F": [1, 2],
            "at F": [1, 1],
            "between P and F": [0, 1],
            "between F and O": [0, 1],
            finite: [0, Infinity],
          };
          const [lo, hi] = range[pos];
          if (lo === hi) expect(k).toBe(lo);
          else expect(k > lo && k < hi).toBe(true);
        } else {
          expect(near(r.model.vOverF, 1, 0.01)).toBe(true);
        }
        // A converging device with the object at F: image at infinity, none drawn.
        if (pos === "at F" && (d === "concave mirror" || d === "convex lens")) expect(r.spec.points.It).toBeUndefined();
      });
    }
  }
  it("refuses a position the device does not have (beyond C for a convex mirror)", () => {
    expect(buildOptics({ template: "case", device: "convex mirror", position: "beyond C" })).toBeNull();
  });
  it("at F the emergent rays are parallel to each other (image at infinity)", () => {
    for (const d of ["concave mirror", "convex lens"] as const) {
      const r = build({ template: "case", device: d, position: "at F" });
      const P = r.spec.points;
      const d0 = unitv(sub(P.r0e, P.r0i));
      const d1 = unitv(sub(P.r1e, P.r1i));
      expect(Math.abs(cross(d0, d1))).toBeLessThan(DTOL);
    }
  });
});

describe("optics — determinism and the registry", () => {
  it("the same params give a deep-equal spec", () => {
    const p: OpticsImageParams = { template: "image", device: "concave mirror", unit: "cm", f: "10", u: "15", ho: "5" };
    expect(buildOptics(p)).toEqual(buildOptics(p));
  });
  it("EVERY registered Light binding builds and draws a correct ray diagram", () => {
    expect(LIGHT_SOLUTION_FIGURES.length).toBeGreaterThan(0);
    for (const b of ALL_COMPUTED_FIGURE_BINDINGS) {
      if (b.builder !== "opticsImage" && b.builder !== "opticsCase") continue;
      const r = buildComputedFigure(b);
      expect(r, b.questionId).not.toBeNull();
      assertRayDiagram(r!.spec, b.params, r!.model);
    }
  });
  it("numeric rows use the image template; position rows the case template — never mixed", () => {
    for (const b of LIGHT_SOLUTION_FIGURES) {
      if (b.builder === "opticsImage") expect(b.params.template).toBe("image");
      if (b.builder === "opticsCase") expect(b.params.template).toBe("case");
    }
  });
  it("every REFUSED row is listed with a reason and is NOT bound", () => {
    const bound = new Set(LIGHT_SOLUTION_FIGURES.map((b) => b.questionId));
    expect(LIGHT_REFUSED.length).toBeGreaterThan(0);
    for (const r of LIGHT_REFUSED) {
      expect(r.reason.trim().length).toBeGreaterThan(0);
      if (!r.partial) expect(bound.has(r.id), `${r.id} is refused but bound`).toBe(false);
    }
  });
});
