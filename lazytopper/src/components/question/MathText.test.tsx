import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { MathText, preprocessBarePatterns } from "./MathText";

// [FU-MATHTEXT-COMMAND-CORRUPTION]
//
// MathText is the app's shared renderer -- the bank surfaces (Practice, Chapter
// Test, Full Mock, HPQ), both worksheet print docs, the C&I graded print doc and
// its three live views, EquationInput's preview, and every tutor turn all render
// through it. So this file pins BOTH halves:
//
//   * the promote is FIXED for bare LaTeX commands, and
//   * everything that renders correctly today is BYTE-IDENTICAL after the fix.
//
// The byte-identical expectations below were captured by running the ORIGINAL
// implementation. They record what the app does TODAY, not what would be nicest
// -- that is what makes them regression tests. In particular `AB^2` promoting to
// `A\(B^{2}\)` is imperfect typography that has shipped for months and renders
// correctly; a lookbehind guard on the ^/_ rules would have silently stopped
// promoting it, trading a bank-wide regression for the trig fix. See
// [FU-MATHTEXT-MULTILETTER-BASE].

const html = (text: string) => {
  const { container } = render(<MathText text={text} />);
  return container;
};

describe("MathText promote — (a) bare LaTeX commands are never mangled", () => {
  it("does not grab the letter inside \\cos / \\sin (the reported bug)", () => {
    const out = preprocessBarePatterns("\\cos^2 A + \\sin^2 A = 1");
    expect(out).not.toContain("\\co\\(");
    expect(out).not.toContain("\\si\\(");
    expect(out).toContain("\\cos^2");
    expect(out).toContain("\\sin^2");
  });

  it("does not grab the letter inside \\log", () => {
    expect(preprocessBarePatterns("\\log_2 8 = 3")).not.toContain("\\lo\\(");
  });

  it.each([
    "\\sin^2 A", "\\cos^2 A", "\\tan^2 A", "\\sec^2 A", "\\csc^2 A", "\\cot^2 A",
    "\\log_2 8", "\\ln x",
  ])("renders %s as real maths with no error node", (input) => {
    const c = html(input);
    expect(c.querySelector(".katex")).not.toBeNull();
    expect(c.querySelector(".katex-error")).toBeNull();
    // The command name must never survive as literal source on screen.
    expect(c.textContent).not.toContain("\\");
  });

  it("(b) renders the braced form \\cos^{2} A, which used to print as raw source", () => {
    const c = html("\\cos^{2} A");
    expect(c.querySelector(".katex")).not.toBeNull();
    expect(c.textContent).not.toContain("\\cos");
  });
});

describe("MathText promote — (c) existing correct renders are byte-identical", () => {
  it.each([
    // bank: Pythagoras. The leading letter renders as prose, the rest as KaTeX --
    // imperfect, but exactly what ships today.
    ["AB^2 + BC^2 = AC^2", "A\\(B^{2}\\) + B\\(C^{2}\\) = A\\(C^{2}\\)"],
    // bank: chemistry subscripts (Science)
    ["H_2 O and CO_2 are compounds.", "\\(H_{2}\\) O and C\\(O_{2}\\) are compounds."],
    // bank: quadratics
    ["5x^2 - 3x + 7 = 0", "5\\(x^{2}\\) - 3x + 7 = 0"],
    ["x^10 + a_12", "\\(x^{10}\\) + \\(a_{12}\\)"],
    // the exact WorksheetPrintDoc.test.tsx fixture -- inherit that contract
    [
      "prove 3 + 2√5 irrational; a² − b²; evaluate sqrt2.",
      "prove 3 + 2√5 irrational; a² − b²; evaluate \\(\\sqrt{2}\\).",
    ],
    // grader output: units must not change
    ["24 cm^2", "24 c\\(m^{2}\\)"],
    // already-wrapped tutor maths is untouched (idempotent)
    ["We know \\(\\sin^2 A + \\cos^2 A = 1\\), so substitute.", "We know \\(\\sin^2 A + \\cos^2 A = 1\\), so substitute."],
    ["\\(\\sqrt{5}\\) is irrational", "\\(\\sqrt{5}\\) is irrational"],
  ])("%s stays byte-identical", (input, expected) => {
    expect(preprocessBarePatterns(input)).toBe(expected);
  });
});

describe("MathText promote — (d) block \\[...\\] maths is protected", () => {
  it("never promotes inside block delimiters", () => {
    // The old guard scanned \(...\) only, so correctly-wrapped BLOCK maths from
    // the tutor was mangled anyway -- the prompt-hardening belt could not save it.
    const input = "\\[\\cos^2 A + \\sin^2 A = 1\\]";
    expect(preprocessBarePatterns(input)).toBe(input);
  });

  it("renders block maths in display mode without error", () => {
    const c = html("\\[\\cos^2 A + \\sin^2 A = 1\\]");
    expect(c.querySelector(".katex-display")).not.toBeNull();
    expect(c.querySelector(".katex-error")).toBeNull();
  });
});

describe("MathText promote — (e) nested braces survive", () => {
  it.each([
    ["\\sqrt{\\frac{a}{b}}", "\\(\\sqrt{\\frac{a}{b}}\\)"],
    ["\\frac{\\sqrt{2}}{3}", "\\(\\frac{\\sqrt{2}}{3}\\)"],
  ])("%s stays valid LaTeX", (input, expected) => {
    // The old [^}]+ rules cut at the FIRST closing brace and emitted invalid
    // LaTeX like \(\sqrt{\frac{a}\){b}}.
    expect(preprocessBarePatterns(input)).toBe(expected);
  });

  it("renders a nested expression without an error node", () => {
    const c = html("\\sqrt{\\frac{a}{b}}");
    expect(c.querySelector(".katex")).not.toBeNull();
    expect(c.querySelector(".katex-error")).toBeNull();
  });
});

describe("MathText promote — (f) prose passes through untouched", () => {
  it.each([
    "The sqrt function is useful.",
    "Water is essential for life processes.",
    "Explain why the reaction is exothermic.",
  ])("leaves %s alone", (input) => {
    expect(preprocessBarePatterns(input)).toBe(input);
  });

  it("renders plain prose with no KaTeX at all", () => {
    const c = html("Explain why the reaction is exothermic.");
    expect(c.querySelector(".katex")).toBeNull();
    expect(c.textContent).toBe("Explain why the reaction is exothermic.");
  });

  it("stops a run at a prose word rather than swallowing the sentence", () => {
    expect(preprocessBarePatterns("\\frac{1}{2} of the class passed.")).toBe(
      "\\(\\frac{1}{2}\\) of the class passed.",
    );
  });

  it("keeps a trailing full stop out of the maths", () => {
    expect(preprocessBarePatterns("Recall that \\tan A = \\frac{\\sin A}{\\cos A}.")).toBe(
      "Recall that \\(\\tan A = \\frac{\\sin A}{\\cos A}\\).",
    );
  });
});

describe("MathText promote — (g) EquationInput's friendly tokens still promote", () => {
  // These are the EXACT templates the palette inserts (EquationInput.tsx):
  //   x²  -> `${SEL}^2`   x₁ -> `${SEL}_1`   √ -> `sqrt{...}`   a⁄b -> `frac{...}{...}`
  it.each([
    ["5x^2 - (3+k)x + 7 = 0", "5\\(x^{2}\\) - (3+k)x + 7 = 0"],
    ["sqrt{2} + 1", "\\(\\sqrt{2}\\) + 1"],
    ["frac{a}{b}", "\\(\\frac{a}{b}\\)"],
    ["a_1 + a_2", "\\(a_{1}\\) + \\(a_{2}\\)"],
    ["sqrt5", "\\(\\sqrt{5}\\)"],
    ["frac1/2", "\\(\\frac{1}{2}\\)"],
  ])("%s still promotes", (input, expected) => {
    expect(preprocessBarePatterns(input)).toBe(expected);
  });

  it("renders the palette's serialized answer as maths in the preview", () => {
    const c = html("5x^2 - (3+k)x + 7 = 0");
    expect(c.querySelector(".katex")).not.toBeNull();
    expect(c.querySelector(".katex-error")).toBeNull();
  });
});

describe("MathText promote — (h) a lone symbol command still takes UNICODE_MAP", () => {
  // Load-bearing: routing these through KaTeX would swap a text node for a KaTeX
  // span -- same glyph, different font metrics -- i.e. a visual diff on every
  // print doc, for nothing.
  it("leaves lone \\theta and \\degree unwrapped in the promote pass", () => {
    const input = "The angle \\theta is 30\\degree here.";
    expect(preprocessBarePatterns(input)).toBe(input);
  });

  it("renders lone \\theta / \\degree as unicode text, not as KaTeX", () => {
    const c = html("The angle \\theta is 30\\degree here.");
    expect(c.querySelector(".katex")).toBeNull();
    expect(c.textContent).toBe("The angle θ is 30° here.");
  });

  it.each(["\\pi", "\\times", "\\pm", "\\leq", "\\infty", "\\Delta"])(
    "%s stays on the unicode path",
    (input) => {
      expect(preprocessBarePatterns(input)).toBe(input);
    },
  );

  it("still wraps a command UNICODE_MAP cannot express (\\tan has no glyph)", () => {
    expect(preprocessBarePatterns("Use \\tan here.")).toBe("Use \\(\\tan\\) here.");
  });
});

describe("MathText promote — the render-proof gate", () => {
  it("leaves an unrenderable command exactly as it is today, not as a red error", () => {
    const input = "The \\bogus{x} thing.";
    expect(preprocessBarePatterns(input)).toBe(input);
  });

  it("produces no error node for an invented command", () => {
    expect(html("The \\bogus{x} thing.").querySelector(".katex-error")).toBeNull();
  });
});

describe("MathText promote — idempotence", () => {
  // Double-promotion is the failure mode this code is structurally prone to.
  it.each([
    "\\cos^2 A + \\sin^2 A = 1",
    "AB^2 + BC^2 = AC^2",
    "\\[\\cos^2 A\\]",
    "\\(\\sqrt{5}\\) is irrational",
    "\\sqrt{\\frac{a}{b}}",
    "5x^2 - (3+k)x + 7 = 0",
    "The angle \\theta is 30\\degree here.",
    "Step 1: Using \\text{Area} = \\frac{1}{2}bh, we get 24 cm^2.",
  ])("f(f(x)) === f(x) for %s", (input) => {
    const once = preprocessBarePatterns(input);
    expect(preprocessBarePatterns(once)).toBe(once);
  });
});

describe("MathText — consumer grammars render without error", () => {
  it.each([
    // bank
    ["bank/question", "If \\alpha and \\beta are zeroes of p(x) = x^2 - 5x + 6, find \\alpha + \\beta."],
    // grader step (LLM)
    ["grader/step", "Step 1: Using \\text{Area} = \\frac{1}{2}bh, we get 24 cm^2."],
    // tutor turn (LLM), bare
    ["tutor/bare", "We know \\sin^2 A + \\cos^2 A = 1, so substitute."],
    // tutor turn (LLM), wrapped
    ["tutor/wrapped", "We know \\(\\sin^2 A + \\cos^2 A = 1\\), so substitute."],
    // user-typed via EquationInput
    ["equation/typed", "x = frac{-b + sqrt{b^2 - 4ac}}{2a}"],
  ])("%s renders with no .katex-error", (_label, input) => {
    expect(html(input).querySelector(".katex-error")).toBeNull();
  });
});
