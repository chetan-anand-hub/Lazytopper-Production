/**
 * DIAGRAMS-1 PR-2a — FigureSvg renders a FigureSpec as an accessible, self-styled SVG.
 */
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { buildHeightsDistances } from "../builders/heightsDistances";
import type { FigureSpec } from "../figureSpec";
import { FigureSvg, arcLayouts } from "./FigureSvg";
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
