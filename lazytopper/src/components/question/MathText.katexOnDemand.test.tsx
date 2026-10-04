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
import { readFileSync, statSync } from "node:fs";
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

/**
 * LOW-END-1 rework (owner ruling 1) — KaTeX UP FRONT where the FIRST screen shows maths.
 *
 * Lazy loading is allowed ONLY on Check & Improve and the Chapter Test start screen. Every
 * page whose first screen shows maths imports `katexEager.ts`, which hands MathText a
 * statically imported KaTeX before the page renders — so there is no plain-text-then-KaTeX
 * swap there.
 *
 *   (f) each maths-first module carries the static side-effect import;
 *   (g) once that module has been evaluated, MathText's FIRST render is KaTeX markup;
 *   (h) neither lazy page has katexEager (or a static katex import) in its static graph.
 *
 * Mutations (rework): drop the import from PracticeQuestionCard -> (f) red; make
 * registerKatex a no-op -> (g) red; import katexEager from ChapterTestPage -> (h) red.
 */
const SRC = resolve(__dirname, "../..");

/** Static, non-type module specifiers of a file (side-effect imports included). */
function staticSpecifiers(file: string): string[] {
  const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
  const out: string[] = [];
  for (const stmt of source.statements) {
    if (ts.isImportDeclaration(stmt) && ts.isStringLiteral(stmt.moduleSpecifier)) {
      const clause = stmt.importClause;
      if (clause?.isTypeOnly) continue;
      const named = clause?.namedBindings;
      const onlyTypes =
        !!clause &&
        !clause.name &&
        !!named &&
        ts.isNamedImports(named) &&
        named.elements.length > 0 &&
        named.elements.every((e) => e.isTypeOnly);
      if (!onlyTypes) out.push(stmt.moduleSpecifier.text);
    }
    if (ts.isExportDeclaration(stmt) && !stmt.isTypeOnly && stmt.moduleSpecifier && ts.isStringLiteral(stmt.moduleSpecifier)) {
      out.push(stmt.moduleSpecifier.text);
    }
  }
  return out;
}

function resolveLocal(from: string, spec: string): string | null {
  if (!spec.startsWith(".")) return null;
  const base = resolve(from, "..", spec);
  for (const c of [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`]) {
    try {
      if (statSync(c).isFile()) return c;
    } catch {
      /* next candidate */
    }
  }
  return null;
}

/** Every file in the static import closure of `entry`, plus every bare package it imports. */
function staticClosure(entry: string): { files: Set<string>; packages: Set<string> } {
  const files = new Set<string>();
  const packages = new Set<string>();
  const stack = [entry];
  while (stack.length) {
    const f = stack.pop()!;
    if (files.has(f)) continue;
    files.add(f);
    for (const spec of staticSpecifiers(f)) {
      const local = resolveLocal(f, spec);
      if (local) stack.push(local);
      else if (!spec.startsWith(".")) packages.add(spec);
    }
  }
  return { files, packages };
}

const MATHS_FIRST = [
  "components/practice/PracticeQuestionCard.tsx",
  "components/question/SolutionChecker.tsx",
  "pages/HighlyProbableQuestions.tsx",
  "pages/tutor/TutorPage.tsx",
  "pages/FullMockPage.tsx",
];
const LAZY_PAGES = ["pages/desktop/DesktopCheckImprovePage.tsx", "pages/ChapterTestPage.tsx"];
const EAGER = resolve(SRC, "components/question/katexEager.ts");

describe("L6 rework — KaTeX up front on maths-first pages, lazy only on C&I and the Chapter Test start", () => {
  it.each(MATHS_FIRST)("(f) %s imports katexEager for its side effect", (rel) => {
    const file = resolve(SRC, rel);
    const resolved = staticSpecifiers(file).map((s) => resolveLocal(file, s));
    expect(resolved).toContain(EAGER);
  });

  it("(g) ★ after katexEager has been evaluated, MathText's FIRST render is KaTeX markup — no stand-in", async () => {
    vi.resetModules();
    await import("./katexEager");
    const { MathText, isKatexLoaded } = await import("./MathText");
    expect(isKatexLoaded()).toBe(true);
    const { container } = render(<MathText text={"Simplify x^2 + \\frac{1}{2}"} />);
    // Synchronously, on the very first commit: KaTeX's own markup, no raw command.
    expect(container.querySelector(".katex")).not.toBeNull();
    expect(container.textContent).not.toContain("\\frac");
  });

  it.each(LAZY_PAGES)("(h) %s: no katexEager and no static katex in its static import graph", (rel) => {
    const { files, packages } = staticClosure(resolve(SRC, rel));
    expect(files.size).toBeGreaterThan(20); // the walker really walked
    expect(files.has(resolve(SRC, "components/question/MathText.tsx"))).toBe(true); // it does reach MathText
    expect(files.has(EAGER)).toBe(false);
    expect([...packages].filter((p) => p === "katex" || p.startsWith("katex/"))).toEqual([]);
  });

  it("(h) CONTROL — the same walker DOES find katexEager and katex from a maths-first page", () => {
    const { files, packages } = staticClosure(resolve(SRC, "pages/HighlyProbableQuestions.tsx"));
    expect(files.has(EAGER)).toBe(true);
    expect(packages.has("katex")).toBe(true);
  });
});
