/**
 * DIAGRAMS-1 PR-2a — FigureSvg renders a FigureSpec as an accessible, self-styled SVG.
 */
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { buildHeightsDistances } from "../builders/heightsDistances";
import { buildSector } from "../builders/circleSector";
import { buildCoordinatePlot } from "../builders/coordinatePlot";
import type { FigureSpec } from "../figureSpec";
import { FigureSvg, arcLayouts, regionPath } from "./FigureSvg";
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
});

describe("FigureSvg — geometry elements (DIAGRAMS-1 PR-2d)", () => {
  it("draws a circle at its view radius, a shaded region under the lines, and plain text", () => {
    const r = buildSector({ template: "sector", unit: "cm", r: "21", theta: 60 }, {}, { shade: "segment" })!;
    const { container } = render(<FigureSvg spec={r.spec} idPrefix="g1" />);
    const circle = r.spec.elements.find((e) => e.t === "circle")!;
    const el = container.querySelector("circle.lt-fig__circle")!;
    expect(Number(el.getAttribute("r"))).toBeCloseTo(circle.t === "circle" ? circle.r : 0, 1);
    const region = container.querySelector("path.lt-fig__region")!;
    expect(region).not.toBeNull();
    // The region group comes BEFORE the lines, so outlines stay on top of the shading.
    const groups = Array.from(container.querySelectorAll("svg > g"));
    expect(groups[0].querySelector("path.lt-fig__region")).not.toBeNull();
    expect(FIGURE_SVG_CSS).toMatch(/lt-fig__region \{[^}]*fill/);
  });
  it("a region over 180° takes the large-arc flag; a minor one does not", () => {
    const c = { x: 0, y: 0 };
    expect(regionPath(c, { x: 10, y: 0 }, { x: 0, y: -10 }, 10, 90, "sector")).toMatch(/A 10 10 0 0 0/);
    expect(regionPath(c, { x: 10, y: 0 }, { x: 0, y: 10 }, 10, 270, "sector")).toMatch(/A 10 10 0 1 0/);
    expect(regionPath(c, { x: 10, y: 0 }, { x: 0, y: -10 }, 10, 90, "segment").startsWith("M 10 0 A")).toBe(true);
  });
  it("tick and coordinate text use their own classes; still no inline style anywhere", () => {
    const r = buildCoordinatePlot({ template: "points", unit: "none", A: "(3, 4)", B: "(0, 0)" }, {}, { segs: [["A", "B"]] })!;
    const { container } = render(<FigureSvg spec={r.spec} idPrefix="g2" />);
    expect(container.querySelectorAll("text.lt-fig__tick").length).toBeGreaterThan(3);
    const coords = Array.from(container.querySelectorAll("text.lt-fig__coord")).map((t) => t.textContent);
    expect(coords).toEqual(expect.arrayContaining(["A(3, 4)", "B(0, 0)"]));
    expect(container.querySelectorAll("[style]").length).toBe(0);
  });
  it("CONTROL: an H&D figure (no geometry elements) renders no region group", () => {
    const { container } = render(<FigureSvg spec={spec()} idPrefix="g3" />);
    expect(container.querySelector("path.lt-fig__region")).toBeNull();
    expect(container.querySelectorAll("svg > g").length).toBe(3);
  });
});
