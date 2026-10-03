// @vitest-environment node
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import ts from "typescript";

/**
 * GUARD — BANK-LEAN-1 (G1): pages that serve no bank questions must not ship the bank.
 *
 * WHY. `canonicalQuestionBank.ts` (with its `ourEnvironment.pack2` sibling) is the
 * largest thing this app downloads: ~8.6 MB decoded, ~2.4 MB on the wire. It is needed
 * by the pages that SERVE questions (Practice, Chapter Test, Full Mock, Worksheets,
 * the tutor, progress). A static import walk found five pages that serve none of them
 * still pulling it on first load, every time through an INCIDENTAL import of a helper
 * that happened to live beside a bank lookup:
 *   - Check & Improve (the main ad landing page) — scorecardVariants imported the bank
 *     for two lookups only the chapter-test / full-mock variants use; mistakeIntelligence
 *     imported the concept lookup statically; sessionRecords imported two naming helpers
 *     from worksheetModel, which imports the bank-backed generator.
 *   - Topic Hub — TopicProgressTrend → progressStore → progressBankIndex.
 *   - signed-in Home (desktop + mobile) — FirstSession → sessionRecords → worksheetModel.
 *   - Predicted Questions — its answer checker, imported statically, mounted on click.
 *   - Practice hub — `import { type PracticeQuestion } from ".../predictionDataService"`.
 * Each fix is one import. Each regression would be one import too, and would look
 * harmless in review — which is why this is a walker and not a sentence in a doc.
 *
 * WHAT IS AN EDGE (the rules are the bundler's, not a guess):
 *   - `import … from`, `import "…"` and `export … from` are edges.
 *   - `import type …` and `export type …` are NOT — they are erased.
 *   - ★ `import { type X } from "…"` (inline type specifiers only) IS an edge. Under this
 *     repo's `verbatimModuleSyntax` the bundler emits it as `import {} from "…"`, a
 *     side-effect import that KEEPS the module (and everything it imports) in the graph.
 *     That exact form is how /practice-hub carried the whole bank for one TYPE.
 *   - dynamic `import()` is NOT followed: it is a separate chunk, loaded on demand —
 *     which is precisely how the bank-backed lookups are reached now.
 * Relative specifiers only; packages cannot reach a file under src/.
 *
 * ON FAILURE it prints the CHAIN — every module from the route to the bank — because
 * "DesktopHome reaches the bank" is useless and "DesktopHome → FirstSession →
 * sessionRecords → worksheetModel → predictionDataService → …" is the fix.
 */

const SRC = resolve(process.cwd(), "src"); // vitest runs with cwd = lazytopper/
const BANK = resolve(SRC, "data/canonicalQuestionBank.ts");

/** The route modules that must stay bank-free, by the name App.tsx lazy-loads them as. */
const PROTECTED: Record<string, string> = {
  HighlyProbableQuestions: "pages/HighlyProbableQuestions.tsx",
  DesktopCheckImprovePage: "pages/desktop/DesktopCheckImprovePage.tsx",
  DesktopTopicHubPage: "pages/desktop/DesktopTopicHubPage.tsx",
  DesktopHome: "pages/desktop/DesktopHome.tsx",
  MobileHome: "pages/app/MobileHome.tsx",
  DesktopNotesPage: "pages/desktop/DesktopNotesPage.tsx",
  ExamTrendsRanked: "pages/ExamTrendsRanked.tsx",
  DesktopPracticePage: "pages/desktop/DesktopPracticePage.tsx",
  PricingPage: "pages/PricingPage.tsx",
  Cbse2027Page: "pages/Cbse2027Page.tsx",
  LegalPage: "pages/LegalPage.tsx",
};

/** Every static (bundle-graph) specifier a module imports or re-exports, per the rules above. */
export function staticImportSpecifiers(source: string, fileName = "module.tsx"): string[] {
  const sf = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    false,
    fileName.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const out: string[] = [];
  for (const st of sf.statements) {
    if (ts.isImportDeclaration(st)) {
      if (st.importClause?.isTypeOnly) continue; // `import type …` — erased
      if (ts.isStringLiteral(st.moduleSpecifier)) out.push(st.moduleSpecifier.text);
    } else if (ts.isExportDeclaration(st) && st.moduleSpecifier) {
      if (st.isTypeOnly) continue; // `export type … from` — erased
      if (ts.isStringLiteral(st.moduleSpecifier)) out.push(st.moduleSpecifier.text);
    }
  }
  return out;
}

function resolveRelative(fromFile: string, spec: string): string | null {
  if (!spec.startsWith(".")) return null;
  const base = resolve(dirname(fromFile), spec);
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, resolve(base, "index.ts"), resolve(base, "index.tsx")]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

const specCache = new Map<string, string[]>();
function specifiersOf(file: string): string[] {
  let specs = specCache.get(file);
  if (!specs) {
    specs = /\.tsx?$/.test(file) ? staticImportSpecifiers(readFileSync(file, "utf8"), file) : [];
    specCache.set(file, specs);
  }
  return specs;
}

/** Breadth-first walk; returns the SHORTEST static chain from `root` to `target`, or null. */
export function chainTo(root: string, target: string = BANK): string[] | null {
  const prev = new Map<string, string | null>([[root, null]]);
  const queue = [root];
  while (queue.length > 0) {
    const file = queue.shift()!;
    if (file === target) {
      const chain: string[] = [];
      for (let at: string | null = file; at; at = prev.get(at) ?? null) {
        chain.unshift(relative(SRC, at).split(sep).join("/"));
      }
      return chain;
    }
    for (const spec of specifiersOf(file)) {
      const next = resolveRelative(file, spec);
      if (next && !prev.has(next)) {
        prev.set(next, file);
        queue.push(next);
      }
    }
  }
  return null;
}

describe("the edge rules match the bundler (verbatimModuleSyntax)", () => {
  it("follows value imports, side-effect imports, re-exports and INLINE-type-only imports", () => {
    const src = [
      'import a from "./a";',
      'import { b, type B } from "./b";',
      'import { type C } from "./c";', // ★ emitted as `import {} from "./c"` — kept
      'import "./d";',
      'export { e } from "./e";',
      'export * from "./f";',
      'import type { G } from "./g";', // erased
      'export type { H } from "./h";', // erased
      'const i = () => import("./i");', // dynamic — a separate chunk, not followed
    ].join("\n");
    expect(staticImportSpecifiers(src)).toEqual(["./a", "./b", "./c", "./d", "./e", "./f"]);
  });

  it("the tsconfig still sets verbatimModuleSyntax (the inline-type rule depends on it)", () => {
    const cfg = readFileSync(resolve(process.cwd(), "tsconfig.app.json"), "utf8");
    expect(cfg).toMatch(/"verbatimModuleSyntax":\s*true/);
  });
});

describe("BANK-LEAN-1 · pages that serve no bank questions do not reach canonicalQuestionBank.ts", () => {
  it("CONTROL: the walker CAN reach the bank — from pages that genuinely serve it", () => {
    // Without this, a walker that silently resolved nothing would report every page clean.
    expect(existsSync(BANK), "canonicalQuestionBank.ts moved — the guard would be vacuous").toBe(true);
    for (const page of ["pages/PracticePage.tsx", "pages/ChapterTestPage.tsx", "pages/FullMockPage.tsx"]) {
      const chain = chainTo(resolve(SRC, page));
      expect(chain, `${page} should reach the bank (it serves bank questions)`).not.toBeNull();
      expect(chain![chain!.length - 1]).toBe("data/canonicalQuestionBank.ts");
    }
  });

  it("every protected module is the one App.tsx actually lazy-loads under that name", () => {
    // A route re-pointed at a different file would leave this guard walking a dead one.
    const app = readFileSync(resolve(SRC, "App.tsx"), "utf8");
    for (const [name, file] of Object.entries(PROTECTED)) {
      const spec = `./${file.replace(/\.tsx?$/, "")}`;
      const re = new RegExp(`const ${name}\\s*=\\s*lazy\\(\\s*\\(\\)\\s*=>\\s*import\\("${spec.replace(/[./]/g, "\\$&")}"\\)`);
      expect(app, `App.tsx no longer lazy-loads ${name} from ${spec}`).toMatch(re);
      expect(existsSync(resolve(SRC, file)), `${file} does not exist`).toBe(true);
    }
  });

  it("★ no protected route module reaches the bank (the chain is printed on failure)", () => {
    const reached: string[] = [];
    let clean = 0;
    for (const [name, file] of Object.entries(PROTECTED)) {
      const chain = chainTo(resolve(SRC, file));
      if (chain) reached.push(`${name}:\n    ${chain.join("\n -> ")}`);
      else clean += 1;
    }
    // eslint-disable-next-line no-console
    console.log(`BANK_REACH: protected=${Object.keys(PROTECTED).length} clean=${clean}`);
    expect(
      reached,
      `these pages statically reach data/canonicalQuestionBank.ts:\n${reached.join("\n")}`,
    ).toEqual([]);
  });

  it("the app entry (main.tsx → App.tsx eager graph) does not reach the bank either", () => {
    // If the SHELL reached it, every page would download it no matter what the routes do.
    expect(chainTo(resolve(SRC, "main.tsx"))).toBeNull();
  });
});
