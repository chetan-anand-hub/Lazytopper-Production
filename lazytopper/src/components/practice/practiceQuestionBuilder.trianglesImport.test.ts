// LOW-END-1 PR-1 (L7) — closes FU-CLEANUP2-TRIANGLES-BARREL.
//
// practiceQuestionBuilder needs ONE function from the Triangles strategy, getTrianglesRubric.
// It imported it through the `contentStrategy/triangles` barrel, and the barrel re-exports the
// Triangles learning objects, question families, tag index and type tiles — so all of that
// pack data was in the graph of every Practice visit. It now imports the rubric module
// directly.
//
// Read with the TypeScript parser (not a regex), so a comment or a string that merely
// mentions the path cannot satisfy or break it. CONTROL: the same reader DOES see the barrel
// import that the (flag-gated, dynamically imported) question-type-first resolver still has.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";

function staticImports(relPath: string): Array<{ from: string; names: string[] }> {
  const file = resolve(__dirname, relPath);
  const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
  const out: Array<{ from: string; names: string[] }> = [];
  for (const stmt of source.statements) {
    if (!ts.isImportDeclaration(stmt) || !ts.isStringLiteral(stmt.moduleSpecifier)) continue;
    if (stmt.importClause?.isTypeOnly) continue;
    const names: string[] = [];
    const bindings = stmt.importClause?.namedBindings;
    if (bindings && ts.isNamedImports(bindings)) {
      for (const el of bindings.elements) if (!el.isTypeOnly) names.push(el.name.text);
    }
    out.push({ from: stmt.moduleSpecifier.text, names });
  }
  return out;
}

const BARREL = /\/contentStrategy\/triangles$/;

describe("L7 — Practice imports the Triangles rubric directly, not through the barrel", () => {
  it("practiceQuestionBuilder has no static import of the Triangles barrel", () => {
    const imports = staticImports("./practiceQuestionBuilder.ts");
    expect(imports.filter((i) => BARREL.test(i.from))).toEqual([]);
  });

  it("…and gets getTrianglesRubric from the rubric module itself", () => {
    const imports = staticImports("./practiceQuestionBuilder.ts");
    const rubric = imports.find((i) => i.names.includes("getTrianglesRubric"));
    expect(rubric?.from).toBe("../../data/contentStrategy/triangles/trianglesRubrics");
  });

  it("CONTROL — the reader does see a barrel import where one exists", () => {
    const imports = staticImports("../../services/questionTypeFirstResolver.ts");
    expect(imports.some((i) => BARREL.test(i.from))).toBe(true);
  });
});
