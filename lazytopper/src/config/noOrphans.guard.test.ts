// @vitest-environment node
import { describe, it, expect } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import ts from "typescript";

/**
 * GUARD — FRICTION-FIX-1 (G1): no orphaned source under lazytopper/src.
 *
 * A file under src/ that nothing live imports is retired code: it is compiled, linted,
 * type-checked and searched by every agent, and it misleads all of them. This walker
 * starts at every LIVE ROOT and follows every edge that can load a module; any src file
 * it never reaches is an orphan, and the set of orphans must equal ALLOWED_ORPHANS.
 *
 * LIVE ROOTS: src/App.tsx (its lazy routes are string-literal import() edges),
 * src/main.tsx, vite.config.ts, lazytopper/scripts/**, repo scripts/**, lazytopper/server/**.
 *
 * EDGES FOLLOWED (a type-only import COUNTS as a use):
 *   - `import … from "x"`, `import "x"`, `import type … from "x"`, `export … from "x"`
 *   - `import("x")` with a string literal, and `import("x").T` type references
 *   - `require("x")`, and `require(path.join(__dirname, "a", "b"))` / `path.resolve(...)`
 *     with only string-literal parts — server/index.cjs loads five src/ modules this way
 *     at boot, so a walker blind to it would call live server code orphaned.
 * Relative specifiers only. Tests (*.test.*, *.spec.*) are neither roots nor candidates;
 * src/data/** is not a candidate but its imports are followed (data is live).
 */

const LT = process.cwd(); // vitest runs with cwd = lazytopper/
const REPO = resolve(LT, "..");
const SRC = resolve(LT, "src");
const DATA = resolve(SRC, "data");
const TEST_DIR = resolve(SRC, "test");

/** An entry needs a one-line reason. Paths relative to lazytopper/. */
export const ALLOWED_ORPHANS: Record<string, string> = {
  // Bank consumers (import canonicalQuestionBank / predictionDataService / predictionCore):
  // kept for Controller A's BANK-SPLIT-1, which owns every bank consumer. Delete them there.
  "src/services/dailyMixService.ts": "bank consumer — Controller A scope",
  "src/pages/app/Worksheets.tsx": "bank consumer — Controller A scope",
  "src/pages/desktop/DesktopWorksheetsPage.tsx": "bank consumer — Controller A scope",
  "src/prediction/difficultyAwarePractice.ts": "bank consumer — Controller A scope",
  "src/utils/topicMockEngine.ts": "bank consumer — Controller A scope",
  // Imported by a kept bank consumer above; deleting it would break that file's compile.
  "src/components/desktop/l2/BackToParent.tsx": "imported by a kept bank consumer — Controller A scope",
  "src/components/desktop/l2/ContextBar.tsx": "imported by a kept bank consumer — Controller A scope",
  "src/components/desktop/l2/MistakeIntelligencePanel.tsx": "imported by a kept bank consumer — Controller A scope",
  "src/lib/desktop/mistakeData.ts": "imported by a kept bank consumer — Controller A scope",
  "src/lib/desktop/savedWorksheets.ts": "imported by a kept bank consumer — Controller A scope",
  "src/services/dailyMixGenerator.ts": "imported by a kept bank consumer — Controller A scope",
  "src/services/dailyMixPlayback.ts": "imported by a kept bank consumer — Controller A scope",
  "src/services/worksheetProfileService.ts": "imported by a kept bank consumer — Controller A scope",
};

const SKIP_DIRS = new Set(["node_modules", "dist", ".git"]);
const CODE = /\.(ts|tsx|js|jsx|mjs|cjs|mts|cts)$/;
const isTest = (p: string) => /\.(test|spec)\.(ts|tsx|js|jsx|mjs|cjs)$/.test(p);
const inDir = (p: string, d: string) => p.startsWith(d + sep);
const toRel = (p: string) => relative(LT, p).split(sep).join("/");

function walkDir(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(e.name)) continue;
    const p = resolve(dir, e.name);
    if (e.isDirectory()) walkDir(p, out);
    else out.push(p);
  }
  return out;
}

/** Every module specifier a file can load, per the rules in the header. */
export function moduleSpecifiers(source: string, fileName: string): string[] {
  const kind = /x$/.test(fileName)
    ? ts.ScriptKind.TSX
    : /\.(mjs|cjs|js)$/.test(fileName)
      ? ts.ScriptKind.JS
      : ts.ScriptKind.TS;
  const sf = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, kind);
  const out: string[] = [];
  const lit = (n: ts.Node | undefined) => (n && ts.isStringLiteralLike(n) ? n.text : null);
  const visit = (n: ts.Node): void => {
    if (
      (ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) &&
      n.moduleSpecifier &&
      ts.isStringLiteral(n.moduleSpecifier)
    ) {
      out.push(n.moduleSpecifier.text);
    } else if (ts.isImportEqualsDeclaration(n) && ts.isExternalModuleReference(n.moduleReference)) {
      const s = lit(n.moduleReference.expression);
      if (s !== null) out.push(s);
    } else if (ts.isCallExpression(n)) {
      const a0 = n.arguments[0];
      if (n.expression.kind === ts.SyntaxKind.ImportKeyword) {
        const s = lit(a0);
        if (s !== null) out.push(s);
      } else if (ts.isIdentifier(n.expression) && n.expression.text === "require" && a0) {
        const s = lit(a0);
        if (s !== null) out.push(s);
        else if (
          ts.isCallExpression(a0) &&
          ts.isPropertyAccessExpression(a0.expression) &&
          /^(join|resolve)$/.test(a0.expression.name.text) &&
          a0.arguments.length >= 2 &&
          ts.isIdentifier(a0.arguments[0]) &&
          a0.arguments[0].text === "__dirname" &&
          a0.arguments.slice(1).every((x) => lit(x) !== null)
        ) {
          out.push("./" + a0.arguments.slice(1).map((x) => lit(x)).join("/"));
        }
      }
    } else if (
      ts.isImportTypeNode(n) &&
      ts.isLiteralTypeNode(n.argument) &&
      ts.isStringLiteral(n.argument.literal)
    ) {
      out.push(n.argument.literal.text);
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return out;
}

const EXTS = ["", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", "/index.ts", "/index.tsx", "/index.js"];
function resolveSpecifier(from: string, spec: string): string | null {
  const s = spec.split("?")[0];
  if (!s.startsWith(".")) return null;
  const base = resolve(dirname(from), s);
  const tries = EXTS.map((e) => base + e);
  if (/\.(js|jsx|mjs)$/.test(base)) {
    const b = base.replace(/\.(js|jsx|mjs)$/, "");
    tries.push(b + ".ts", b + ".tsx");
  }
  // ★ resolve() NORMALISES: "<dir>" + "/index.ts" is a mixed-separator path on Windows, and an
  // un-normalised key never equals the walkDir() path of the same file — every directory
  // import would read as "not reached" and its index.ts as an orphan (it did, once).
  for (const t of tries.map((x) => resolve(x))) if (existsSync(t) && statSync(t).isFile()) return t;
  return null;
}

export function liveRoots(): string[] {
  return [
    resolve(SRC, "App.tsx"),
    resolve(SRC, "main.tsx"),
    resolve(LT, "vite.config.ts"),
    ...walkDir(resolve(LT, "scripts")),
    ...walkDir(resolve(REPO, "scripts")),
    ...walkDir(resolve(LT, "server")),
  ].filter((p) => CODE.test(p) && !isTest(p));
}

export function findOrphans(roots: string[]): { files: number; orphans: string[] } {
  const seen = new Set<string>();
  const stack = [...roots];
  while (stack.length) {
    const f = stack.pop() as string;
    if (seen.has(f)) continue;
    seen.add(f);
    if (!CODE.test(f) || isTest(f)) continue;
    for (const spec of moduleSpecifiers(readFileSync(f, "utf8"), f)) {
      const r = resolveSpecifier(f, spec);
      if (r && !seen.has(r)) stack.push(r);
    }
  }
  const candidates = walkDir(SRC).filter(
    (p) => /\.(ts|tsx)$/.test(p) && !isTest(p) && !inDir(p, DATA) && !inDir(p, TEST_DIR),
  );
  const orphans = candidates
    .filter((c) => !seen.has(c))
    .map(toRel)
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return { files: candidates.length, orphans };
}

/**
 * R2 (FRICTION-FIX-1 PR-1): the retired /api/mentor server modules, deleted whole after a
 * require-walk from server/index.cjs and every server, script and ops root found no
 * requirer. They stay deleted, and no live file may name one in a module specifier again.
 */
export const RETIRED_SERVER_MODULES = [
  "server/routes/mentorModeHandler.cjs",
  "server/routes/mentorClassifiers.cjs",
  "server/routes/mentorBsre.cjs",
  "server/routes/mentorTeachHelpers.cjs",
  "server/routes/mentorDiagramHelpers.cjs",
  "server/prompts/mentorPrompts.cjs",
  "server/prompts/promptGrind.cjs",
];

describe("R2 — retired mentor server modules stay deleted and unrequired", () => {
  it("no retired module exists, and no live root names one in a require/import", () => {
    const present = RETIRED_SERVER_MODULES.filter((p) => existsSync(resolve(LT, p)));
    expect(present, `retired server modules are back on disk:\n${present.join("\n")}`).toEqual([]);
    const names = RETIRED_SERVER_MODULES.map((p) => p.split("/").pop() as string);
    const hits: string[] = [];
    for (const f of liveRoots()) {
      for (const spec of moduleSpecifiers(readFileSync(f, "utf8"), f)) {
        const base = spec.split("/").pop() ?? "";
        if (names.includes(base) || names.includes(base + ".cjs")) hits.push(`${toRel(f)} -> ${spec}`);
      }
    }
    expect(hits, `a live file requires a retired mentor module:\n${hits.join("\n")}`).toEqual([]);
  });
});

describe("G1 — no orphaned source under src/", () => {
  it("every src file is reachable from a live root, or is in ALLOWED_ORPHANS with a reason", () => {
    for (const [p, reason] of Object.entries(ALLOWED_ORPHANS)) {
      expect(reason.trim(), `ALLOWED_ORPHANS["${p}"] needs a one-line reason`).not.toBe("");
    }
    const { files, orphans } = findOrphans(liveRoots());
    console.info(`NO_ORPHANS: files=${files} orphans=${orphans.length}`);
    const unexpected = orphans.filter((o) => !(o in ALLOWED_ORPHANS));
    const stale = Object.keys(ALLOWED_ORPHANS).filter((p) => !orphans.includes(p));
    expect(unexpected, `orphaned src files (nothing live imports them):\n${unexpected.join("\n")}`).toEqual([]);
    expect(stale, `ALLOWED_ORPHANS entries that are no longer orphans:\n${stale.join("\n")}`).toEqual([]);
  });
});
