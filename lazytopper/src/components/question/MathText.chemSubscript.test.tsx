import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MathText } from "./MathText";

describe("MathText — chemical formula subscripts (TUTOR-POLISH-1)", () => {
  it("renders option text with subscripts and leaves values alone", () => {
    const { container } = render(
      <>
        <MathText text="Ca(OH)2 and CO2" />
        <MathText text="A current of 2 A through 10 Ω, x2 + 3" />
      </>,
    );
    expect(container.textContent).toBe("Ca(OH)₂ and CO₂A current of 2 A through 10 Ω, x2 + 3");
  });
});
