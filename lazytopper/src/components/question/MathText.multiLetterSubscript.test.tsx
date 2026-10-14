import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { MathText, loadKatex } from "./MathText";
import { ensureAllBankChapters, getBankRows, BANK_CHAPTER_SLUGS } from "../../data/bankChapters/loader";

// MATH-RENDER-3 (D203). V_cyl, R_eq, I_max were shown as plain text. One capital + 2-4 lowercase
// letters is a word subscript; anything longer, lowercase-based or snake_case is left exactly as written.
// Display only: nothing here can change a mark.
await loadKatex();

const shown = (text: string) => {
  const { container } = render(<MathText text={text} />);
  return { visible: container.textContent ?? "", katex: container.querySelectorAll(".katex").length, html: container.innerHTML };
};

const TARGET = /(?<![A-Za-z0-9_/\\.])[A-Z]_[a-z]{2,4}(?![A-Za-z0-9_])(?!\.[A-Za-z0-9])/;

describe("MathText multi-letter subscripts (MATH-RENDER-3)", () => {
  it("V_cyl, R_eq and I_max render as upright word subscripts", () => {
    for (const t of ["V_cyl = pi r^2 h", "R_eq = R1 + R2", "I_max = 5 A", "(V_cone) is V_cone"]) {
      const r = shown(t);
      expect(r.katex, t).toBeGreaterThanOrEqual(1);
      expect(r.visible, t).not.toContain("_");
      expect(r.html, t).toContain("mathrm");
    }
  });

  it("controls: snake_case, long words, lowercase bases, paths and file names stay as written", () => {
    for (const t of [
      "R_total",
      "V_cylinder",
      "n_air",
      "my_var_name",
      "File_name",
      "R_cyl_x",
      "see /docs/V_cyl",
      "figure V_cyl.png",
      "snake_case word",
    ]) {
      const r = shown(t);
      expect(r.html, t).not.toContain("mathrm");
      expect(r.visible, t).toBe(t);
    }
  });

  it("existing single-letter rules are unchanged", () => {
    expect(shown("a_n = a + (n-1)d").katex).toBeGreaterThanOrEqual(1);
    expect(shown("a_{12}").katex).toBe(1);
    expect(shown("R_p").html).not.toContain("mathrm");
    expect(shown("R_p").katex).toBe(1);
  });

  it("text already inside a typeset span is not re-wrapped", () => {
    const r = shown("\\(V_{cyl}\\) and V_cyl");
    expect(r.katex).toBe(2);
  });

  it("whole bank: every served field containing X_yyy changes if and only if it matches the guarded pattern", async () => {
    await ensureAllBankChapters();
    const rows = getBankRows(BANK_CHAPTER_SLUGS);
    let seen = 0;
    let typeset = 0;
    for (const r of rows) {
      const fields: string[] = [r.questionText ?? "", r.answer ?? "", r.finalAnswer ?? "", r.explanation ?? ""];
      (r.options ?? []).forEach((o) => fields.push(String(o)));
      (r.solutionSteps ?? []).forEach((s) => fields.push(String(s)));
      for (const t of fields) {
        if (!/[A-Za-z]_[A-Za-z]/.test(t)) continue;
        seen++;
        const { html } = shown(t);
        const hasMathrm = html.includes("mathrm");
        if (TARGET.test(t)) {
          typeset++;
          expect(hasMathrm, `${r.id}: ${t}`).toBe(true);
        } else if (!t.includes("mathrm") && !t.includes("\\text")) {
          expect(hasMathrm, `${r.id}: ${t}`).toBe(false);
        }
      }
    }
    expect(seen).toBeGreaterThan(0);
    expect(typeset).toBeGreaterThan(0);
  }, 120_000);
});
