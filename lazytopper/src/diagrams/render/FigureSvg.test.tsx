/**
 * DIAGRAMS-1 PR-2a — FigureSvg renders a FigureSpec as an accessible, self-styled SVG.
 */
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { buildHeightsDistances } from "../builders/heightsDistances";
import { MAX_MIRROR_SAG, buildOptics } from "../builders/optics";
import type { FigureSpec } from "../figureSpec";
import { FigureSvg, arcLayouts, lensPath, mirrorPath } from "./FigureSvg";
import { FIGURE_SVG_CSS } from "./figureSvgStyle";

afterEach(cleanup);

function spec(): FigureSpec {
  // Two angles of depression measured from ONE horizontal: nested arcs.
  const r = buildHeightsDistances({ template: "twoPointsSameSide", view: "depression", unit: "m", far: 30, near: 45, h: "75" });
  expect(r).not.toBeNull();
  return r!.spec;
}

describe("FigureSvg", () => {
  it("is an image with an accessible name and description", () => {
    const s = spec();
    const { container } = render(<FigureSvg spec={s} idPrefix="t1" />);
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("role")).toBe("img");
    const [t, d] = svg.getAttribute("aria-labelledby")!.split(" ");
    expect(container.querySelector(`#${t}`)!.textContent).toBe(s.title);
    expect(container.querySelector(`#${d}`)!.textContent).toBe(s.desc);
    expect(s.desc).toMatch(/75 m/);
  });

  it("styles by CLASS only: the stylesheet is embedded in the SVG, no inline style attribute anywhere", () => {
    const { container } = render(<FigureSvg spec={spec()} idPrefix="t2" />);
    const svg = container.querySelector("svg")!;
    expect(svg.querySelector("style")!.textContent).toBe(FIGURE_SVG_CSS);
    expect(svg.querySelectorAll("[style]").length).toBe(0);
    // Every rule is scoped under .lt-fig, so nothing leaks into the page.
    for (const rule of FIGURE_SVG_CSS.split("}").map((r) => r.trim()).filter(Boolean)) {
      expect(rule.startsWith(".lt-fig")).toBe(true);
    }
  });

  it("maps roles to classes: the horizontal reference is the dashed class, structures the structure class", () => {
    const { container } = render(<FigureSvg spec={spec()} idPrefix="t3" />);
    expect(container.querySelectorAll("line.lt-fig__seg--horizontal-ref").length).toBe(1);
    expect(container.querySelectorAll("line.lt-fig__seg--structure").length).toBe(1);
    expect(FIGURE_SVG_CSS).toMatch(/lt-fig__seg--horizontal-ref \{[^}]*stroke-dasharray/);
  });

  it("draws every angle with its value and every given length with its label", () => {
    const { container } = render(<FigureSvg spec={spec()} idPrefix="t4" />);
    const text = Array.from(container.querySelectorAll("text")).map((t) => t.textContent);
    expect(text).toEqual(expect.arrayContaining(["30°", "45°", "75 m"]));
    expect(container.querySelectorAll("path.lt-fig__arc").length).toBe(2);
  });

  it("nests arcs that share a vertex and a ray: smaller angle innermost, each label in its own wedge", () => {
    const s = spec();
    const lay = arcLayouts(s);
    const arcs = s.elements.map((e, i) => (e.t === "angle" ? { deg: e.deg, ...lay[i]! } : null)).filter(Boolean) as Array<{ deg: number; r: number; labelAt: number }>;
    const a30 = arcs.find((a) => a.deg === 30)!;
    const a45 = arcs.find((a) => a.deg === 45)!;
    expect(a30.r).toBeLessThan(a45.r);
    expect(a30.labelAt).toBeCloseTo(0.5); // middle of 0..30
    expect(a45.labelAt).toBeCloseTo(37.5 / 45); // middle of 30..45, the part no smaller arc covers
  });

  it("renders the same markup for the same spec (pure)", () => {
    const s = spec();
    const a = render(<FigureSvg spec={s} idPrefix="same" />).container.innerHTML;
    cleanup();
    const b = render(<FigureSvg spec={s} idPrefix="same" />).container.innerHTML;
    expect(a).toBe(b);
  });

  // ── ray optics (PR-2b): additive element kinds ──
  it("ray optics: draws the mirror symbol (hatched back), solid real rays with chevrons, arrowheads at object and image tips", () => {
    const r = buildOptics({ template: "image", device: "concave mirror", unit: "cm", f: "10", u: "15", ho: "5" })!;
    const { container } = render(<FigureSvg spec={r.spec} idPrefix="o1" />);
    expect(container.querySelectorAll("path.lt-fig__mirror--concave").length).toBe(1);
    expect(container.querySelectorAll("path.lt-fig__hatch").length).toBe(1);
    expect(container.querySelectorAll("line.lt-fig__seg--ray").length).toBeGreaterThanOrEqual(4);
    expect(container.querySelectorAll("polygon[data-arrow='mid']").length).toBe(container.querySelectorAll("line.lt-fig__seg--ray").length);
    expect(container.querySelectorAll("polygon[data-arrow='end']").length).toBe(2);
    expect(container.querySelectorAll("line.lt-fig__seg--image").length).toBe(1);
    expect(container.querySelectorAll("line.lt-fig__seg--ray-virtual").length).toBe(0);
    expect(container.querySelectorAll("[style]").length).toBe(0);
  });
  it("ray optics: a virtual image is the dashed class, with dashed ray extensions", () => {
    const r = buildOptics({ template: "image", device: "convex lens", unit: "cm", f: "10", u: "8" })!;
    const { container } = render(<FigureSvg spec={r.spec} idPrefix="o2" />);
    expect(container.querySelectorAll("path.lt-fig__lens--convex").length).toBe(1);
    expect(container.querySelectorAll("line.lt-fig__seg--image-virtual").length).toBe(1);
    expect(container.querySelectorAll("line.lt-fig__seg--ray-virtual").length).toBeGreaterThanOrEqual(1);
    expect(FIGURE_SVG_CSS).toMatch(/lt-fig__seg--ray-virtual \{[^}]*stroke-dasharray/);
    expect(FIGURE_SVG_CSS).toMatch(/lt-fig__seg--image-virtual \{[^}]*stroke-dasharray/);
  });
  it("mirror symbol: the arc passes through the pole and its edges sit exactly `sag` off the pole plane (concave towards the light)", () => {
    const at = { x: 100, y: 100 };
    const cc = mirrorPath(at, { half: 50, sag: MAX_MIRROR_SAG, kind: "concave" }).d;
    const cv = mirrorPath(at, { half: 50, sag: MAX_MIRROR_SAG, kind: "convex" }).d;
    expect(cc).toBe("M 97 50 Q 103 100 97 150");
    expect(cv).toBe("M 103 50 Q 97 100 103 150");
    // quadratic midpoint = (start + 2·control + end) / 4 = the pole
    expect((97 + 2 * 103 + 97) / 4).toBe(100);
    expect(lensPath(at, { half: 50, kind: "convex" })).toMatch(/^M 100 50 Q/);
  });
});
