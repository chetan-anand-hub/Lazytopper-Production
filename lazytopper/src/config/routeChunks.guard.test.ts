// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { ROUTE_CHUNK_MODULES, routeChunkModulesFor } from "../../scripts/seo/writeStaticHeads";
import { sitemapPaths } from "./sitemapUrls";

/**
 * GUARD — SEO-5 PR-2 (D4): `ROUTE_CHUNK_MODULES` names the chunk each prerendered page
 * preloads, and it must stay true to the router.
 *
 * ★ WHAT THE BUILD ALREADY CATCHES, AND WHAT IT CANNOT. `applyPrerendered` fails the build
 * when a named module matches no emitted chunk — a rename is loud. What it cannot see is a
 * name that still resolves but is no longer the page's route: the route switched to another
 * component and the old one is still a lazy chunk somewhere. The page would then preload the
 * wrong code — harmless-looking, and the first paint is slow again in silence. This reads
 * `App.tsx` and asserts, for every family: the module is a `lazy(() => import(...))` whose
 * FILE NAME is the module name (that is what makes Vite name the chunk after it), and the
 * family's `<Route path>` renders exactly that component inside `withRouteSuspense`.
 */
const APP = readFileSync(resolve(__dirname, "..", "App.tsx"), "utf8");

/** `<Route path="X" ...>` blocks, each up to the next `<Route`. */
function routeBlocks(source: string): Array<{ path: string; body: string }> {
  return source
    .split("<Route")
    .slice(1)
    .map((chunk) => ({ path: chunk.match(/^\s*path="([^"]+)"/)?.[1] ?? "", body: chunk }))
    .filter((block) => block.path !== "");
}

/** The router path pattern a family's advertised members match. */
function routePatternFor(prefix: string, exact: boolean): RegExp {
  if (exact) return new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}$`);
  return new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}:`);
}

describe("ROUTE_CHUNK_MODULES — the preloaded chunk is the route's own lazy page", () => {
  const blocks = routeBlocks(APP);

  it("read the real App.tsx (the matcher has something to match)", () => {
    expect(blocks.length).toBeGreaterThan(30);
    expect(APP).toContain("function withRouteSuspense(");
  });

  for (const entry of ROUTE_CHUNK_MODULES) {
    for (const name of entry.modules) {
      it(`${entry.prefix}${entry.exact ? "" : "*"} -> ${name}: a lazy import of a file named ${name}`, () => {
        const lazyDecl = new RegExp(
          `const ${name}\\s*=\\s*lazy\\(\\(\\)\\s*=>\\s*import\\("[^"]*/${name}"\\)\\)`,
        );
        expect(APP, `App.tsx has no lazy(() => import(".../${name}"))`).toMatch(lazyDecl);
      });

      it(`${entry.prefix}${entry.exact ? "" : "*"} -> ${name}: its <Route> renders withRouteSuspense(<${name} />)`, () => {
        const pattern = routePatternFor(entry.prefix, entry.exact);
        const matching = blocks.filter((block) => pattern.test(block.path));
        expect(matching.length, `no <Route path> matches ${entry.prefix}`).toBeGreaterThan(0);
        for (const block of matching) {
          expect(block.body, `route ${block.path} does not render ${name}`).toContain(`withRouteSuspense(<${name} />)`);
        }
      });
    }
  }

  it("the root's empty entry is true: / renders RootEntry, whose landing (Welcome) is a STATIC import", () => {
    expect(routeChunkModulesFor("/")).toEqual([]);
    expect(APP).toMatch(/<Route path="\/" element={<RootEntry \/>} \/>/);
    expect(APP).toMatch(/^import Welcome from "\.\/pages\/Welcome";$/m);
    expect(APP).not.toMatch(/const Welcome\s*=\s*lazy/);
  });

  it("CONTROL — the matcher fires on a route that renders a different page", () => {
    const fake = routeBlocks('<Route path="/pricing" element={withRouteSuspense(<LegalPage />)} />');
    expect(fake[0].body).not.toContain("withRouteSuspense(<PricingPage />)");
  });

  it("every advertised path resolves to an entry (no family left without a preload)", () => {
    const paths = sitemapPaths();
    // eslint-disable-next-line no-console
    console.log(
      `ROUTE_CHUNKS: paths=${paths.length} with_chunk=${paths.filter((p) => routeChunkModulesFor(p).length > 0).length}`,
    );
    for (const path of paths) expect(() => routeChunkModulesFor(path), path).not.toThrow();
  });
});
