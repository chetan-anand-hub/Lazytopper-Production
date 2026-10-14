import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { MathText, loadKatex } from "./MathText";

// MATH-RENDER-3 (D203, D225). V_cyl, R_eq, R_total were shown as plain text. One capital + 2-9 lowercase
// letters is a word subscript. Snake_case, lowercase bases, paths, file names and genotype notation
// (one lowercase letter doubled: R_yy, G_vv, A_bb) stay exactly as written. Display only: no mark changes.
// The whole-bank census is a one-off script run (output in the PR body), not a permanent test (D226 rule 8).
await loadKatex();

const shown = (text: string) => {
  const { container } = render(<MathText text={text} />);
  return { visible: container.textContent ?? "", katex: container.querySelectorAll(".katex").length, html: container.innerHTML };
};

describe("MathText multi-letter subscripts (MATH-RENDER-3)", () => {
  it.each([
    "V_cyl = pi r^2 h",
    "R_eq = R1 + R2",
    "I_max = 5 A",
    "(V_cone) is V_cone",
    "R_total = R_1 + R_2",
    "V_sphere",
    "V_cylinder",
    "V_conductor",
    "V_solid",
    "H_series",
    "H_parallel",
    "P_rated",
    "I_total",
  ])("target %s renders as an upright word subscript", (t) => {
    const r = shown(t);
    expect(r.katex).toBeGreaterThanOrEqual(1);
    expect(r.visible).not.toContain("_");
    expect(r.html).toContain("mathrm");
  });

  it.each([
    // genotype notation (D225): a doubled lowercase letter is an allele pair, not a subscript
    "R_yy",
    "G_vv",
    "(A_bb)",
    "a round, green (R_yy) seed",
    "9 R_Y_ : 3 R_yy : 3 rrY_ : 1 rryy",
    // not a word subscript
    "n_air",
    "n_glass",
    "h_cone",
    "n_ab",
    "my_var_name",
    "File_name",
    "R_cyl_x",
    "see /docs/V_cyl",
    "figure V_cyl.png",
    "snake_case word",
  ])("control %s stays exactly as written", (t) => {
    const r = shown(t);
    expect(r.html).not.toContain("mathrm");
    expect(r.visible).toBe(t);
  });

  it("existing single-letter rules are unchanged", () => {
    expect(shown("a_n = a + (n-1)d").katex).toBeGreaterThanOrEqual(1);
    expect(shown("a_{12}").katex).toBe(1);
    expect(shown("R_p").html).not.toContain("mathrm");
    expect(shown("R_p").katex).toBe(1);
  });

  it("text already inside a typeset span is not re-wrapped", () => {
    expect(shown("\\(V_{cyl}\\) and V_cyl").katex).toBe(2);
  });
});
