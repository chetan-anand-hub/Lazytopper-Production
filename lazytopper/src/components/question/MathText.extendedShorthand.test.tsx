import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { MathText, loadKatex, preprocessBarePatterns, textNeedsKatex } from "./MathText";

// MATH-RENDER-1 (D187/D189). The owner saw maths as plain text. 276 of 10,300 served bank rows (and
// grader text, see MATH-RENDER-2) write shorthand MathText did not promote: sqrt(..), x^(n-1), x^{2},
// 10^-8, a_n, >=, theta, pi, 2*pi*r. Display only: nothing here can change a mark.
await loadKatex();

const shown = (text: string) => {
  const { container } = render(<MathText text={text} />);
  return { visible: container.textContent ?? "", katex: container.querySelectorAll(".katex").length, html: container.innerHTML };
};

describe("MathText extended shorthand — what the student now sees", () => {
  it("sqrt(..) with balanced and nested brackets renders as a root", () => {
    expect(shown("PQ = sqrt((4-3)^2 + (6-2)^2) = sqrt(17)").katex).toBeGreaterThanOrEqual(2);
    expect(shown("sqrt(4)=2").katex).toBe(1);
    expect(shown("sqrt(4)=2").visible).not.toContain("sqrt");
  });

  it("x^(n-1), x^{2}, 10^-8 and cm^-1 render as powers", () => {
    for (const t of ["a^(n-1)", "x^{2}", "10^-8", "1 D = 1 m^-1"]) {
      const r = shown(t);
      expect(r.katex, t).toBeGreaterThanOrEqual(1);
      expect(r.visible, t).not.toContain("^");
    }
  });

  it("a_n and a_{12} render as subscripts, snake_case is left as written", () => {
    expect(shown("a_n = a + (n-1)d").katex).toBeGreaterThanOrEqual(1);
    expect(shown("a_{12}").katex).toBe(1);
    expect(shown("R_total").visible).toBe("R_total");
  });

  it("comparison stand-ins become glyphs", () => {
    expect(shown("x >= 2").visible).toBe("x ≥ 2");
    expect(shown("x <= 2").visible).toBe("x ≤ 2");
    expect(shown("a != 0").visible).toBe("a ≠ 0");
    expect(shown("x => y").visible).toBe("x ⇒ y");
  });

  it("theta and pi become glyphs only in a maths context", () => {
    expect(shown("sin theta = 12/13").visible).toBe("sin θ = 12/13");
    expect(shown("(Take pi = 22/7.)").visible).toBe("(Take π = 22/7.)");
    expect(shown("2*pi*r = 2*pi*3 = 6*pi m").visible).toBe("2×π×r = 2×π×3 = 6×π m");
  });

  it("the stored-arrow `$` rows are NOT promoted (a content defect, not maths)", () => {
    expect(shown("CH4(g) + 2O2(g) $ CO2(g)").visible).toBe("CH4(g) + 2O2(g) $ CO2(g)");
  });
});

describe("MathText extended shorthand — everything else is byte-identical", () => {
  const untouched = [
    "Photosynthesis happens in the chloroplast of the leaf.",
    "The pi bond is formed by sideways overlap.",
    "Kepler's third law relates a planet's period to its orbit.",
    "Fill in the blank: ____ is the powerhouse of the cell.",
    "Note* this is a footnote marker",
    "Use the file name my_file_name.txt",
    "sqrt of a number is its root",
    "Both A and R are true, and R is the correct explanation of A.",
    "(x² + 1)² − x² = 0",
    "Area = ½ × base × height",
  ];
  for (const t of untouched) {
    it(`unchanged: ${t}`, () => {
      expect(preprocessBarePatterns(t)).toBe(t);
    });
  }

  it("existing promotions are unchanged (AB^2, CO_2, cm^2, \\cos^2 A)", () => {
    expect(preprocessBarePatterns("AB^2 + BC^2 = AC^2")).toBe("A\\(B^{2}\\) + B\\(C^{2}\\) = A\\(C^{2}\\)");
    expect(preprocessBarePatterns("CO_2")).toBe("C\\(O_{2}\\)");
    expect(preprocessBarePatterns("\\cos^2 A + \\sin^2 A = 1")).toContain("\\cos^2");
  });

  it("text already inside \\(..\\) is never promoted twice", () => {
    const t = "\\(x^{2} + sqrt(4)\\)";
    expect(preprocessBarePatterns(t)).toBe(t);
  });

  it("an unbalanced sqrt( is left exactly as written", () => {
    expect(preprocessBarePatterns("sqrt((4-3)")).toBe("sqrt((4-3)");
  });
});

describe("MathText extended shorthand — review findings (adversarial verifier, #1150)", () => {
  it("SO_4^(2-) keeps the old, correct rendering (the new ^( rule must not take the 4 as its base)", () => {
    const out = preprocessBarePatterns("SO_4^(2-)");
    expect(out).toBe("S\\(O_{4}\\)^(2-)");
  });

  it("a span that KaTeX cannot render is never minted: the text stays readable, no error box", () => {
    for (const t of ["sqrt(50%)", "x^(5%)", "sqrt(a & b)", "sqrt(#)", "sqrt(a{b)"]) {
      const r = shown(t);
      expect(r.html, t).not.toContain("katex-error");
    }
  });

  it("no span is ever nested inside another (sqrt(frac1/2), sqrt(sqrt2), x^(sqrt2))", () => {
    for (const t of ["sqrt(frac1/2)", "sqrt(sqrt2)", "sqrt(sqrt{3})", "x^(sqrt2)"]) {
      const out = preprocessBarePatterns(t);
      expect(out.match(/\\\(/g)?.length ?? 0, t).toBeLessThanOrEqual(1);
      expect(shown(t).html, t).not.toContain("katex-error");
    }
  });

  it("the cue and the pi rule agree on a boundary: `2pi r` and `pi2` are handled the same before and after KaTeX loads", () => {
    for (const t of ["Circumference = 2pi r", "pi2 is not a word"]) {
      expect(textNeedsKatex(t) || preprocessBarePatterns(t) === t, t).toBe(true);
    }
  });

  it("a 20k-character run of letters is processed and returned unchanged (the base lookbehind removes the quadratic scan; no clock reads in tests)", () => {
    const input = "a".repeat(20000) + "^";
    expect(preprocessBarePatterns(input)).toBe(input);
  });
});

describe("MathText — a non-string value never throws (MATH-RENDER-1b, D203 condition 1)", () => {
  it("renders numbers, arrays, null and undefined as text instead of crashing", () => {
    const cases: Array<[unknown, string]> = [[42, "42"], [["a", "b"], "a,b"], [null, ""], [undefined, ""], [true, "true"]];
    for (const [value, expected] of cases) {
      const { container } = render(<MathText text={value as unknown as string} />);
      expect(container.textContent, String(value)).toBe(expected);
    }
  });
});

describe("MathText extended shorthand — the KaTeX cue stays a superset", () => {
  it("every rule that emits \\(..\\) is covered by textNeedsKatex", () => {
    for (const t of ["sqrt(4)", "a^(n-1)", "x^{2}", "10^-8", "m^-1", "a_n", "a_{12}"]) {
      expect(textNeedsKatex(t), t).toBe(true);
      expect(preprocessBarePatterns(t), t).toContain("\\(");
    }
  });

  it("CONTROL: with the shorthand cue removed the promoted LaTeX would be unguarded", () => {
    // If this ever stops holding, the cue and the rules have drifted apart: a promoted span would reach
    // renderKatexToHtml before KaTeX loads and print its LaTeX source. The assertion above is the guard.
    const promoted = preprocessBarePatterns("10^-8");
    expect(promoted).not.toBe("10^-8");
  });
});
