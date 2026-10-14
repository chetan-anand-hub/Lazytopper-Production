import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { StepAnnotation, followsFromStep } from "./StepAnnotation";

// GRADER-CONSEQUENTIAL-1 (D242) — the annotation line that replaced the "↳" glyph.
// The glyph printed as "Ⅰ," in the graded PDF (the html2canvas capture font has no outline for it);
// the arrow is now an inline SVG, so no glyph character may appear anywhere in the markup.

const html = (props: Partial<Parameters<typeof StepAnnotation>[0]> = {}) =>
  renderToStaticMarkup(<StepAnnotation tone="bad" {...props}>Check the formula here.</StepAnnotation>);

describe("StepAnnotation", () => {
  it("★ draws an inline SVG arrow and prints NO glyph: no '↳' and no 'Ⅰ' anywhere in the markup", () => {
    const out = html();
    expect(out).toMatch(/<svg[^>]*class="lt-stann__arrow"[^>]*width="14"[^>]*height="14"/);
    expect(out).toContain("<path");
    expect(out).not.toContain("↳");
    expect(out).not.toContain("Ⅰ");
    expect(out).not.toContain("↳");
    expect(out).toContain("Check the formula here.");
  });

  it("the arrow is coloured by verdict through a class (green = correct, amber = partial, red = lost), never a style object", () => {
    expect(html({ tone: "ok" })).toContain("lt-stann--ok");
    expect(html({ tone: "part" })).toContain("lt-stann--part");
    expect(html({ tone: "bad" })).toContain("lt-stann--bad");
    for (const tone of ["ok", "part", "bad", "na", "struck", "unk"] as const) expect(html({ tone })).not.toContain("style=");
  });

  it("★ says 'follows from step N' only when consequentialOf is a real step number", () => {
    expect(html({ consequentialOf: 2 })).toContain("follows from step 2");
    // CONTROLS: absent / invalid values never print the sentence
    for (const bad of [undefined, null, 0, -1, 1.5, Number.NaN]) expect(html({ consequentialOf: bad as never })).not.toContain("follows from");
  });

  it("keeps the call site's own class (its size / background) beside the base class", () => {
    expect(html({ className: "lt-gp__stann" })).toMatch(/class="lt-stann lt-stann--bad lt-gp__stann"/);
  });

  it("followsFromStep: a table", () => {
    expect([2, 1, 12].map(followsFromStep)).toEqual([2, 1, 12]);
    expect([0, -3, 2.5, "2", null, undefined, Number.NaN].map(followsFromStep)).toEqual([null, null, null, null, null, null, null]);
  });
});
