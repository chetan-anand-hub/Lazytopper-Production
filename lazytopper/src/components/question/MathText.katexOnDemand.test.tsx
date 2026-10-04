// LOW-END-1 PR-1 (L6) — KaTeX is fetched on demand, not with every page that imports MathText.
//
// KaTeX was a static import of MathText.tsx, so it sat in the entry graph of Check & Improve
// and the Chapter Test start screen, whose first screens show no maths (LOW-END-SCOUT-1 P8).
//
//   (a) SOURCE: MathText.tsx has no runtime import of katex or its stylesheet — only a
//       type import and a dynamic import(). CONTROL: the reader sees NoteRichText's static
//       import (the notes page, where maths IS the first screen, keeps it).
//   (b) text that cannot contain maths renders at once, without fetching KaTeX (in the app a
//       background prefetch follows once the page is idle; it is skipped under vitest);
//   (c) text with maths shows a readable stand-in while KaTeX is in flight, then KaTeX;
//   (d) ★ the cue is a SUPERSET of every path into KaTeX, proven over the whole question
//       bank: any text it rejects is untouched by the promote pass and has no delimiters,
//       so it renders byte-identically with or without KaTeX;
//   (e) EquationInput starts the fetch when the answer box is focused.

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";

afterEach(cleanup);

function runtimeImports(relPath: string): { static: string[]; dynamic: string[] } {
  const file = resolve(__dirname, relPath);
  const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
  const out = { static: [] as string[], dynamic: [] as string[] };
  const visit = (node: ts.Node) => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier) && !node.importClause?.isTypeOnly) {
      out.static.push(node.moduleSpecifier.text);
    }
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments[0] &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      out.dynamic.push(node.arguments[0].text);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return out;
}

type MathTextModule = typeof import("./MathText");
async function freshMathText(): Promise<MathTextModule> {
  vi.resetModules();
  return import("./MathText");
}

describe("L6 — KaTeX on demand", () => {
  it("(a) MathText.tsx: no runtime import of katex or its CSS; both arrive by import()", () => {
    const imports = runtimeImports("./MathText.tsx");
    expect(imports.static.filter((m) => m.startsWith("katex"))).toEqual([]);
    expect(imports.dynamic).toEqual(expect.arrayContaining(["katex", "katex/dist/katex.min.css"]));
    // CONTROL — the reader does see a static katex import where one exists.
    expect(runtimeImports("../notes/NoteRichText.tsx").static).toContain("katex");
  });

  it("(b) prose renders at once and does not fetch KaTeX", async () => {
    const { MathText, isKatexLoaded } = await freshMathText();
    render(<MathText text="A shopkeeper sells 12 apples for 30 rupees each." />);
    expect(screen.getByText("A shopkeeper sells 12 apples for 30 rupees each.")).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 20));
    expect(isKatexLoaded()).toBe(false);
  });

  it("(c) maths: a readable stand-in while KaTeX is in flight, then KaTeX's own markup", async () => {
    const { MathText, isKatexLoaded } = await freshMathText();
    const { container } = render(<MathText text="Simplify x^2 + 3" />);
    expect(isKatexLoaded()).toBe(false);
    expect(container.querySelector(".katex")).toBeNull();
    expect(container.textContent).toBe("Simplify x² + 3");
    await waitFor(() => expect(container.querySelector(".katex")).not.toBeNull());
    expect(isKatexLoaded()).toBe(true);
  });

  it("(d) ★ the cue is a superset of every path into KaTeX — proven over the whole question bank", async () => {
    await import("../../test/preloadBankChapters");
    const { getBankRows, BANK_CHAPTER_SLUGS } = await import("../../data/bankChapters/loader");
    const { loadKatex, preprocessBarePatterns, textNeedsKatex } = await import("./MathText");
    await loadKatex();
    const texts: string[] = [];
    for (const q of getBankRows(BANK_CHAPTER_SLUGS)) {
      const r = q as unknown as Record<string, unknown>;
      for (const v of [r.questionText, r.text, r.answer, r.finalAnswer, r.explanation]) {
        if (typeof v === "string" && v) texts.push(v);
      }
      for (const list of [r.solutionSteps, r.options]) {
        if (Array.isArray(list)) for (const v of list) if (typeof v === "string" && v) texts.push(v);
        else if (list && typeof list === "object") for (const v of Object.values(list)) if (typeof v === "string") texts.push(v);
      }
    }
    let rejected = 0;
    let accepted = 0;
    const leaks: string[] = [];
    for (const t of texts) {
      if (textNeedsKatex(t)) {
        accepted += 1;
        continue;
      }
      rejected += 1;
      if (preprocessBarePatterns(t) !== t || /\\[([]/.test(t)) leaks.push(t.slice(0, 80));
    }
    expect(leaks).toEqual([]);
    // Both sides are real: plenty of bank text needs no KaTeX, plenty does.
    expect(texts.length).toBeGreaterThan(10000);
    expect(rejected).toBeGreaterThan(1000);
    expect(accepted).toBeGreaterThan(1000);
    // CONTROL — the leak check fires on text the promote pass DOES change.
    expect(preprocessBarePatterns("x^2")).not.toBe("x^2");
  }, 120_000);

  it("(e) EquationInput starts the KaTeX fetch when the answer box is focused", async () => {
    vi.resetModules();
    const { EquationInput } = await import("../equation/EquationInput");
    const { isKatexLoaded } = await import("./MathText");
    render(<EquationInput value="" onChange={() => {}} ariaLabel="Your answer" />);
    await new Promise((r) => setTimeout(r, 20));
    expect(isKatexLoaded()).toBe(false);
    fireEvent.focus(screen.getByLabelText("Your answer"));
    await waitFor(() => expect(isKatexLoaded()).toBe(true));
  });
});
