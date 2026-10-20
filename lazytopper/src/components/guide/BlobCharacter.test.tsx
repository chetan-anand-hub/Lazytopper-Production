import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import BlobCharacter from "./BlobCharacter";
import { bagNumberSVG } from "./rigProps";

/** RIG-2 — the React wrapper: bagLabel updates in place, and the host's data-peek follows the pose. */

afterEach(() => cleanup());

describe("RIG-2 · BlobCharacter", () => {
  it("★ bagLabel 3 → 12 redraws the digits on the SAME svg (no rig rebuild)", () => {
    const { container, rerender } = render(<BlobCharacter kind="ziggy" pose="bag" still bagLabel={3} />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(container.querySelectorAll(".lt-gr-bagn .lt-gr-dg")).toHaveLength(1);

    rerender(<BlobCharacter kind="ziggy" pose="bag" still bagLabel={12} />);
    expect(container.querySelectorAll(".lt-gr-bagn .lt-gr-dg")).toHaveLength(2);
    expect(container.querySelector("svg")).toBe(svg);
    expect(container.querySelectorAll("svg")).toHaveLength(1);

    rerender(<BlobCharacter kind="ziggy" pose="bag" still />);
    expect(container.querySelectorAll(".lt-gr-bagn .lt-gr-dg")).toHaveLength(0);
    expect(container.querySelector("svg")).toBe(svg);
  });

  it("★ the host's data-peek turns on with pose 'peek' and off with another pose", () => {
    const { container, rerender } = render(<BlobCharacter kind="byte" pose="idle" still />);
    const host = container.querySelector("[data-testid='blob-byte']")!;
    const svg = container.querySelector("svg");
    expect(host.hasAttribute("data-peek")).toBe(false);

    rerender(<BlobCharacter kind="byte" pose="peek" still />);
    expect(host.getAttribute("data-peek")).toBe("true");
    expect(svg?.getAttribute("data-peek")).toBe("true");

    rerender(<BlobCharacter kind="byte" pose="hello" still />);
    expect(host.hasAttribute("data-peek")).toBe(false);
    expect(svg?.hasAttribute("data-peek")).toBe(false);
    expect(container.querySelector("svg")).toBe(svg);
  });

  it("bagNumberSVG normalises its own input", () => {
    expect(bagNumberSVG(-5)).toBe("");
    expect(bagNumberSVG(Number.NaN)).toBe("");
    expect(bagNumberSVG("12")).toBe("");
    expect(bagNumberSVG(4.9)).toBe(bagNumberSVG(4));
    expect((bagNumberSVG(5000).match(/<path/g) ?? []).length).toBe(3);
  });
});
