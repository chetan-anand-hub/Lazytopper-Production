// @vitest-environment node
import { describe, it, expect } from "vitest";
import { existsSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { readFileSync } from "node:fs";

import {
  PRERENDERED_DIR,
  SPA_SHELL,
  applicablePaths,
  applyArtifact,
  assetRefsIn,
  desktopFragmentPathFor,
  desktopVariantFile,
  fragmentPathFor,
  modulepreloadHrefsIn,
  resolveRouteChunk,
  staticImportsOf,
  validateArtifact,
  validateManifest,
  verifyBuiltPages,
} from "../../scripts/seo/applyPrerendered";
import { routeChunkModulesFor } from "../../scripts/seo/writeStaticHeads";
import { sitemapPaths } from "./sitemapUrls";

/**
 * GUARD — the post-build apply step, `scripts/seo/applyPrerendered.ts`.
 *
 * ★ WHAT THIS FILE EXISTS TO CATCH. The apply step's dangerous failure is not a crash:
 * it is a build that looks fine and ships pages whose content is wrong, missing, or
 * pointing at images that no longer exist. None of that is visible in a build log, and
 * none of it is visible to `tsc`, the ops matrix or the mojibake check. So the rules
 * that make the step safe are asserted here against synthetic input, where each one can
 * be shown to FAIL on a broken case — which is the only property that makes a guard
 * worth having.
 */

describe("applicablePaths", () => {
  // SEO-FRESH-1 (owner ruling OR-A1-1): the root is captured and applied now; the SPA
  // fallback moved to a clean `__shell.html`, tested below.
  it("is every advertised path, the root included", () => {
    const advertised = sitemapPaths();
    const applicable = applicablePaths();

    expect(advertised).toContain("/");
    expect(applicable).toContain("/");
    expect(applicable.slice().sort()).toEqual(advertised.slice().sort());
  });

  it("still covers all 26 chapters and all 26 notes", () => {
    const applicable = applicablePaths();
    expect(applicable.filter((p) => p.startsWith("/topic-hub/"))).toHaveLength(26);
    expect(applicable.filter((p) => p.startsWith("/notes/"))).toHaveLength(26);
  });
});

describe("fragmentPathFor", () => {
  it("maps an advertised path to a fragment file", () => {
    expect(fragmentPathFor("/topic-hub/trigonometry", "/art")).toBe(
      join("/art", "topic-hub", "trigonometry.html"),
    );
  });

  it("maps the root to index.html (never `.html`)", () => {
    expect(fragmentPathFor("/", "/art")).toBe(join("/art", "index.html"));
  });
});

/**
 * ★★ OR-A1-1 — THE ROOT IS FILLED, THE FALLBACK IS NOT. `vercel.json` sends every unmatched
 * `/app/*` URL to `/app/__shell.html`; if that file carried the landing body, `/app/login`,
 * `/app/me` and every deep link would open on the marketing page. Run the real apply step
 * over a synthetic build and prove the split.
 */
describe("applyArtifact — the landing fills index.html, __shell.html stays clean", () => {
  // ROOT-URL-1 PR-2 (S1): the built shell carries index.html's robots meta, which the
  // apply step flips to noindex in the __shell.html copy only.
  const SHELL =
    '<!doctype html><html><head><title>t</title><meta name="robots" content="index,follow,max-image-preview:large" /></head><body><div id="root"></div></body></html>';
  const NOINDEX_SHELL = SHELL.replace('content="index,', 'content="noindex,');
  const LANDING = "<main><h1>Full marks<em>milenge kya?</em></h1><p>Upload your answer.</p></main>";

  function syntheticBuild(): { out: string; art: string; cleanup: () => void } {
    const out = mkdtempSync(join(tmpdir(), "apply-out-"));
    const art = mkdtempSync(join(tmpdir(), "apply-art-"));
    writeFileSync(join(out, "index.html"), SHELL, "utf8");
    for (const path of ["/pricing", "/notes/electricity"]) {
      const rel = path.slice(1);
      mkdirSync(join(out, rel), { recursive: true });
      writeFileSync(join(out, `${rel}.html`), SHELL, "utf8");
      writeFileSync(join(out, rel, "index.html"), SHELL, "utf8");
    }
    mkdirSync(join(art, "notes"), { recursive: true });
    writeFileSync(fragmentPathFor("/", art), LANDING, "utf8");
    writeFileSync(fragmentPathFor("/pricing", art), "<main><h1>Pricing</h1></main>", "utf8");
    writeFileSync(fragmentPathFor("/notes/electricity", art), "<main><h1>Electricity</h1></main>", "utf8");
    // SEO-5 PR-2: the 1280-px variant set and the manifest the middleware reads.
    for (const path of ["/", "/pricing", "/notes/electricity"]) {
      const file = desktopFragmentPathFor(path, art);
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, path === "/" ? LANDING : `<main><h1>${path} desktop</h1></main>`, "utf8");
    }
    writeFileSync(join(art, "manifest.json"), JSON.stringify({ paths: ["/", "/pricing", "/notes/electricity"] }), "utf8");
    return {
      out,
      art,
      cleanup: () => {
        rmSync(out, { recursive: true, force: true });
        rmSync(art, { recursive: true, force: true });
      },
    };
  }

  it("writes a __shell.html that contains no landing text, and fills index.html with it", () => {
    const { out, art, cleanup } = syntheticBuild();
    try {
      const result = applyArtifact(out, art, ["/", "/pricing", "/notes/electricity"], { preloads: false });
      const shell = readFileSync(join(out, SPA_SHELL), "utf8");
      const index = readFileSync(join(out, "index.html"), "utf8");

      expect(shell).toBe(NOINDEX_SHELL);
      expect(shell).toContain('<div id="root"></div>');
      expect(shell).not.toContain("Full marks");
      expect(index).toContain("<h1>Full marks<em>milenge kya?</em></h1>");
      // CONTROL — the other pages got their own bodies, not the landing.
      expect(readFileSync(join(out, "pricing.html"), "utf8")).toContain("<h1>Pricing</h1>");
      expect(readFileSync(join(out, "pricing.html"), "utf8")).not.toContain("Full marks");
      // Root: one file. Others: two each.
      expect(result.filesWritten).toBe(1 + 2 + 2);
    } finally {
      cleanup();
    }
  });

  it("still writes __shell.html in the pre-capture state (no artifact) — deep links must not 404", () => {
    const { out, art, cleanup } = syntheticBuild();
    try {
      rmSync(art, { recursive: true, force: true });
      expect(applyArtifact(out, art, ["/", "/pricing"], { preloads: false }).applied).toBe(0);
      expect(readFileSync(join(out, SPA_SHELL), "utf8")).toBe(NOINDEX_SHELL);
    } finally {
      cleanup();
    }
  });

  it("REFUSES to run twice — a second run would copy the landing into __shell.html", () => {
    const { out, art, cleanup } = syntheticBuild();
    try {
      applyArtifact(out, art, ["/", "/pricing", "/notes/electricity"], { preloads: false });
      expect(() => applyArtifact(out, art, ["/", "/pricing", "/notes/electricity"], { preloads: false })).toThrow(
        /not a clean shell/,
      );
      expect(readFileSync(join(out, SPA_SHELL), "utf8")).not.toContain("Full marks");
      // ...and the desktop root variant carries the landing; the shell never does.
      expect(readFileSync(join(out, desktopVariantFile("/")), "utf8")).toContain("Full marks");
    } finally {
      cleanup();
    }
  });
});

describe("validateArtifact — the artifact must match the advertised set exactly", () => {
  const expected = ["/exam-trends", "/notes/electricity", "/topic-hub/trigonometry"];

  it("passes when the sets match", () => {
    expect(validateArtifact(expected, [...expected])).toEqual([]);
  });

  /**
   * ★★ THE CASE THAT CATCHES A NEW CHAPTER GOING UNCAPTURED. Every other check in this
   * step asks "is the fragment we have good?", which is vacuously true of a page that
   * has no fragment at all — that page simply keeps an empty body and no gate notices.
   * Only comparing against the advertised set catches an omission.
   */
  it("REJECTS an advertised page with no fragment", () => {
    const failures = validateArtifact(expected, ["/exam-trends", "/topic-hub/trigonometry"]);
    expect(failures).toHaveLength(1);
    expect(failures[0]).toContain("/notes/electricity");
    expect(failures[0]).toContain("no prerendered fragment");
  });

  it("REJECTS a fragment for a path that is no longer advertised", () => {
    const failures = validateArtifact(expected, [...expected, "/topic-hub/retired-chapter"]);
    expect(failures).toHaveLength(1);
    expect(failures[0]).toContain("/topic-hub/retired-chapter");
    expect(failures[0]).toContain("not advertised");
  });

  it("names EVERY problem, not just the first", () => {
    const failures = validateArtifact(expected, ["/exam-trends", "/topic-hub/ghost"]);
    expect(failures).toHaveLength(3); // two missing, one orphan
    expect(failures.join(" ")).toContain("/notes/electricity");
    expect(failures.join(" ")).toContain("/topic-hub/trigonometry");
    expect(failures.join(" ")).toContain("/topic-hub/ghost");
  });

  it("REJECTS a completely empty artifact rather than treating it as nothing to do", () => {
    expect(validateArtifact(expected, [])).toHaveLength(expected.length);
  });
});

describe("assetRefsIn — the staleness check that runs on every platform", () => {
  /**
   * ★ WHY THIS IS THE CHECK THAT MATTERS. Vite content-hashes asset filenames, so a
   * figure that changed or was renamed no longer exists under the name a stale fragment
   * holds. Without this, the build ships a page whose images 404 — worse than stale
   * text, and invisible to every other gate.
   */
  it("finds the hashed figures a captured body points at", () => {
    const fragment =
      '<main><img src="/assets/fig_11_6-CXBI_RXR.webp" alt="">' +
      '<img src="/assets/fig_eye-DPGK2y3-.webp" alt=""></main>';

    expect(assetRefsIn(fragment).sort()).toEqual([
      "/assets/fig_11_6-CXBI_RXR.webp",
      "/assets/fig_eye-DPGK2y3-.webp",
    ]);
  });

  it("★ ROOT-URL-1 — a ROOT asset path is found (the old pattern demanded a base segment and found nothing)", () => {
    // Before ROOT-URL-1 the pattern required a segment before /assets/, so at the root
    // it matched NOTHING and the staleness check passed vacuously. Both shapes now match.
    expect(assetRefsIn('<img src="/assets/x-AAAAAAAA.webp">')).toEqual(["/assets/x-AAAAAAAA.webp"]);
    expect(assetRefsIn('<img src="/base/assets/x-AAAAAAAA.webp">')).toEqual(["/base/assets/x-AAAAAAAA.webp"]);
  });

  it("strips a query string, so the same asset is not reported twice", () => {
    expect(assetRefsIn('<img src="/assets/f-AAAAAAAA.webp?v=2">')).toEqual([
      "/assets/f-AAAAAAAA.webp",
    ]);
  });

  /**
   * ★ THE CONTROL. Navigation links vastly outnumber asset references in a real
   * fragment — 114 route links against 65 asset refs in the current capture — and they
   * are NOT files, so demanding they exist on disk would fail every build. This is the
   * discrimination the check depends on.
   */
  it("ignores in-app navigation links, which are routes and not files", () => {
    const fragment =
      '<a href="/browse">Browse</a>' +
      '<a href="/chapter-test/10/Maths/trigonometry?source=topicHub">Test</a>' +
      '<a href="/notes/electricity">Notes</a>';

    expect(assetRefsIn(fragment)).toEqual([]);
  });

  it("returns nothing for a fragment with no assets at all", () => {
    expect(assetRefsIn("<main><h1>Refund policy</h1><p>No figures here.</p></main>")).toEqual([]);
  });
});

describe("the fragment layout round-trips", () => {
  it("writes and reads back every advertised path without collision", () => {
    const dir = mkdtempSync(join(tmpdir(), "prerender-"));
    try {
      const paths = applicablePaths();
      for (const path of paths) {
        const file = fragmentPathFor(path, dir);
        mkdirSync(dirname(file), { recursive: true });
        writeFileSync(file, `<main>${path}</main>`, "utf8");
      }
      // 58 distinct paths must produce 58 distinct files — `/topic-hub/x` and
      // `/notes/x` share a slug, so a flattened naming scheme would silently collide.
      const unique = new Set(paths.map((p) => fragmentPathFor(p, dir)));
      expect(unique.size).toBe(paths.length);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("the build actually WIRES the apply step", () => {
  /**
   * ★★ THE HOLE THIS CLOSES, AND IT WAS ALMOST WALKED INTO.
   * Everything else in this file tests what the apply step DOES. Nothing tested that
   * `build` still CALLS it — and a PR that drops it from the build line would stop
   * prerendering entirely while every gate stayed green: tsc passes, every test passes,
   * the build succeeds, and 58 pages quietly go back to serving an empty body. There is
   * no error to notice, which is the whole problem.
   *
   * ⚠ NOT HYPOTHETICAL. Dependabot PR #784 branched before the apply step landed, so its
   * `package.json` carried the OLD build line with `applyPrerendered` ABSENT. Had it
   * merged without a rebase, prerendering would have silently stopped applying. It was
   * closed instead — but the next dependency bump that touches `package.json` recreates
   * exactly the same shape, and a person spotting it is not a control.
   *
   * ORDER IS ASSERTED TOO: the apply step must run AFTER `writeStaticHeads`, which stamps
   * all 116 files from one template string and would overwrite anything written first.
   */
  const pkg = JSON.parse(
    readFileSync(resolve(__dirname, "../../package.json"), "utf8"),
  ) as { scripts: Record<string, string> };

  it("runs applyPrerendered in the build", () => {
    expect(pkg.scripts.build).toContain("scripts/seo/applyPrerendered.ts");
  });

  it("runs it AFTER writeStaticHeads, which would otherwise overwrite the filled pages", () => {
    const build = pkg.scripts.build;
    const heads = build.indexOf("scripts/seo/writeStaticHeads.ts");
    const apply = build.indexOf("scripts/seo/applyPrerendered.ts");

    expect(heads).toBeGreaterThanOrEqual(0);
    expect(apply).toBeGreaterThan(heads);
  });

  /**
   * ★ AND THE CAPTURE MUST NOT BE IN THE BUILD. It needs a headless browser, which cannot
   * run on Vercel (`libnspr4.so`) or in the Railway container (`libglib-2.0.so.0`).
   * Putting it back into `build` breaks both deploy paths — that is what #795 proved, and
   * it is why the capture lives behind `seo:capture`, called only by CI.
   */
  it("does NOT run the browser-dependent capture in the build", () => {
    expect(pkg.scripts.build).not.toContain("captureStaticBodies");
    expect(pkg.scripts["seo:capture"]).toContain("scripts/seo/captureStaticBodies.ts");
  });
});

/**
 * ★★ SEO-5 PR-2 — TWO VARIANTS PER PAGE (D1), PRELOADS RESOLVED AGAINST THE BUILD (D4).
 *
 * A synthetic build shaped like Vite's real output: an entry chunk the shell's
 * `<script type="module">` loads, a vendor chunk the entry imports statically, route chunks
 * that import shared chunks statically and a lazy child dynamically. Every rule is shown
 * PASSING on the healthy build and FAILING on the broken one next to it.
 */
describe("SEO-5 PR-2 — both widths applied, preloads resolved, verified from disk", () => {
  const SHELL =
    '<!doctype html><html><head><title>t</title><meta name="robots" content="index,follow" />' +
    '<link rel="canonical" href="https://www.lazytopper.com/" />' +
    '<script type="module" crossorigin src="/assets/index-AAAAAAAA.js"></script></head>' +
    '<body><div id="root"></div></body></html>';
  const PATHS = ["/", "/pricing", "/notes/electricity"];
  const CHUNKS: Record<string, string> = {
    "index-AAAAAAAA.js": 'import"./vendor-BBBBBBBB.js";export const x=1;const r=()=>import("./PricingPage-CCCCCCCC.js");',
    "vendor-BBBBBBBB.js": "export const v=1;",
    "PricingPage-CCCCCCCC.js": 'import{v as a}from"./vendor-BBBBBBBB.js";import{c as b}from"./Card-DDDDDDDD.js";export default 1;const l=()=>import("./Lazy-EEEEEEEE.js");',
    "Card-DDDDDDDD.js": 'export*from"./tokens-GGGGGGGG.js";export const c=1;',
    "tokens-GGGGGGGG.js": "export const t=1;",
    "Lazy-EEEEEEEE.js": "export default 3;",
    "DesktopNotesPage-FFFFFFFF.js": 'import{c}from"./Card-DDDDDDDD.js";export default 2;',
    // A decoy whose name merely STARTS with a route module's name: never a match.
    "DesktopNotesPageExtra-HHHHHHHH.js": "export default 4;",
  };

  function build(options: { dropDesktop?: string; manifestPaths?: string[] } = {}) {
    const out = mkdtempSync(join(tmpdir(), "device-out-"));
    const art = mkdtempSync(join(tmpdir(), "device-art-"));
    writeFileSync(join(out, "index.html"), SHELL, "utf8");
    mkdirSync(join(out, "assets"), { recursive: true });
    for (const [file, code] of Object.entries(CHUNKS)) writeFileSync(join(out, "assets", file), code, "utf8");
    for (const path of PATHS) {
      if (path !== "/") {
        const rel = path.slice(1);
        mkdirSync(join(out, rel), { recursive: true });
        const stamped = SHELL.replace("https://www.lazytopper.com/", `https://www.lazytopper.com${path}`);
        writeFileSync(join(out, `${rel}.html`), stamped, "utf8");
        writeFileSync(join(out, rel, "index.html"), stamped, "utf8");
      }
      for (const [file, label] of [
        [fragmentPathFor(path, art), "MOBILE"],
        [desktopFragmentPathFor(path, art), "DESKTOP"],
      ] as const) {
        if (label === "DESKTOP" && options.dropDesktop === path) continue;
        mkdirSync(dirname(file), { recursive: true });
        writeFileSync(file, `<main><h1>${label} ${path}</h1></main>`, "utf8");
      }
    }
    writeFileSync(join(art, "manifest.json"), JSON.stringify({ paths: options.manifestPaths ?? PATHS }), "utf8");
    return { out, art, cleanup: () => [out, art].forEach((d) => rmSync(d, { recursive: true, force: true })) };
  }

  it("writes the 390-px body at the page's own path(s) and the 1280-px body under __desktop/, same head", () => {
    const { out, art, cleanup } = build();
    try {
      const result = applyArtifact(out, art, PATHS);
      expect(result.applied).toBe(3);
      expect(result.filesWritten).toBe(1 + 2 + 2);
      expect(result.desktopFilesWritten).toBe(3);
      const mobile = readFileSync(join(out, "pricing.html"), "utf8");
      const desktop = readFileSync(join(out, "__desktop", "pricing.html"), "utf8");
      expect(mobile).toContain("<h1>MOBILE /pricing</h1>");
      expect(mobile).not.toContain("DESKTOP");
      expect(desktop).toContain("<h1>DESKTOP /pricing</h1>");
      expect(desktop).not.toContain("MOBILE");
      // Same page, same URL: the canonical and the `index` robots meta are the page's own.
      expect(desktop).toContain('<link rel="canonical" href="https://www.lazytopper.com/pricing" />');
      expect(desktop).toContain('<meta name="robots" content="index,follow" />');
      expect(readFileSync(join(out, "__desktop", "index.html"), "utf8")).toContain("<h1>DESKTOP /</h1>");
      expect(readFileSync(join(out, "__desktop", "notes", "electricity.html"), "utf8")).toContain(
        "<h1>DESKTOP /notes/electricity</h1>",
      );
      // The SPA shell is untouched by either variant or any preload.
      const shell = readFileSync(join(out, SPA_SHELL), "utf8");
      expect(shell).toContain('<div id="root"></div>');
      expect(modulepreloadHrefsIn(shell)).toEqual([]);
    } finally {
      cleanup();
    }
  });

  it("D4: each page preloads its route chunk + static deps, minus what the entry already loads, minus lazy children", () => {
    const { out, art, cleanup } = build();
    try {
      applyArtifact(out, art, PATHS);
      const expectedPricing = ["/assets/PricingPage-CCCCCCCC.js", "/assets/Card-DDDDDDDD.js", "/assets/tokens-GGGGGGGG.js"];
      expect(modulepreloadHrefsIn(readFileSync(join(out, "pricing.html"), "utf8"))).toEqual(expectedPricing);
      expect(modulepreloadHrefsIn(readFileSync(join(out, "pricing", "index.html"), "utf8"))).toEqual(expectedPricing);
      expect(modulepreloadHrefsIn(readFileSync(join(out, "__desktop", "pricing.html"), "utf8"))).toEqual(expectedPricing);
      expect(modulepreloadHrefsIn(readFileSync(join(out, "notes", "electricity.html"), "utf8"))).toEqual([
        "/assets/DesktopNotesPage-FFFFFFFF.js",
        "/assets/Card-DDDDDDDD.js",
        "/assets/tokens-GGGGGGGG.js",
      ]);
      // The root's page is in the entry chunk already: nothing to preload.
      expect(modulepreloadHrefsIn(readFileSync(join(out, "index.html"), "utf8"))).toEqual([]);
      // LOW-END-3 PR-1 (c): the preloads ride on the deferred boot script (added after the first
      // frame, crossorigin so the module request reuses them), not on <link> tags in the markup.
      expect(readFileSync(join(out, "pricing.html"), "utf8")).toContain(
        'data-preload="/assets/PricingPage-CCCCCCCC.js /assets/Card-DDDDDDDD.js /assets/tokens-GGGGGGGG.js"',
      );
    } finally {
      cleanup();
    }
  });

  it("pins (a)+(d): verifyBuiltPages passes the healthy build", () => {
    const { out, art, cleanup } = build();
    try {
      applyArtifact(out, art, PATHS);
      const verified = verifyBuiltPages(out, PATHS);
      expect(verified.failures).toEqual([]);
      expect(verified.mobileFiles).toBe(5);
      expect(verified.desktopFiles).toBe(3);
      expect(verified.preloadLinks).toBe(3 * 3 + 3 * 3);
    } finally {
      cleanup();
    }
  });

  it("pin (d) RED: a preload href naming a chunk the build did not emit", () => {
    const { out, art, cleanup } = build();
    try {
      applyArtifact(out, art, PATHS);
      const file = join(out, "__desktop", "pricing.html");
      writeFileSync(
        file,
        readFileSync(file, "utf8").replace("/assets/Card-DDDDDDDD.js", "/assets/Card-ZZZZZZZZ.js"),
        "utf8",
      );
      const failures = verifyBuiltPages(out, PATHS).failures;
      expect(failures).toHaveLength(1);
      expect(failures[0]).toContain("/pricing: the desktop file __desktop/pricing.html preloads /assets/Card-ZZZZZZZZ.js");
    } finally {
      cleanup();
    }
  });

  it("pin (d) RED: a page whose route has a chunk but carries no preload", () => {
    const { out, art, cleanup } = build();
    try {
      applyArtifact(out, art, PATHS);
      const file = join(out, "notes", "electricity.html");
      writeFileSync(file, readFileSync(file, "utf8").replace(/data-preload="[^"]*"/g, 'data-preload=""'), "utf8");
      expect(verifyBuiltPages(out, PATHS).failures.join(" ")).toContain("carries no modulepreload for its route chunk");
    } finally {
      cleanup();
    }
  });

  it("pin (a) RED: a built desktop variant that is missing", () => {
    const { out, art, cleanup } = build();
    try {
      applyArtifact(out, art, PATHS);
      rmSync(join(out, "__desktop", "notes", "electricity.html"));
      const failures = verifyBuiltPages(out, PATHS).failures;
      expect(failures).toEqual(["/notes/electricity: the desktop file __desktop/notes/electricity.html was not written"]);
    } finally {
      cleanup();
    }
  });

  it("pin (a) RED: an artifact missing ONE desktop variant is refused before anything is filled", () => {
    const { out, art, cleanup } = build({ dropDesktop: "/notes/electricity" });
    try {
      expect(() => applyArtifact(out, art, PATHS)).toThrow(
        /\/notes\/electricity: advertised, but no prerendered fragment exists for it \[desktop variant\]/,
      );
      // NOTHING was filled: a partial artifact must not produce a half-applied build.
      expect(readFileSync(join(out, "pricing.html"), "utf8")).toContain('<div id="root"></div>');
      expect(existsSync(join(out, "__desktop"))).toBe(false);
    } finally {
      cleanup();
    }
  });

  it("REFUSES a manifest whose paths are not the advertised set (middleware reads it)", () => {
    const { out, art, cleanup } = build({ manifestPaths: ["/", "/pricing"] });
    try {
      expect(() => applyArtifact(out, art, PATHS)).toThrow(/manifest\.json: advertised path \/notes\/electricity is missing/);
    } finally {
      cleanup();
    }
  });

  it("REFUSES a route module that matches no emitted chunk — the build fails, it does not ship a dead preload", () => {
    const { out, art, cleanup } = build();
    try {
      rmSync(join(out, "assets", "DesktopNotesPage-FFFFFFFF.js"));
      expect(() => applyArtifact(out, art, PATHS)).toThrow(/route module "DesktopNotesPage" matches 0 emitted chunk/);
      expect(readFileSync(join(out, "pricing.html"), "utf8")).toContain('<div id="root"></div>');
    } finally {
      cleanup();
    }
  });

  it("resolveRouteChunk: exactly one, anchored at both ends", () => {
    const files = Object.keys(CHUNKS);
    expect(resolveRouteChunk("DesktopNotesPage", files)).toBe("DesktopNotesPage-FFFFFFFF.js");
    expect(() => resolveRouteChunk("Desktop", files)).toThrow(/matches 0/);
    expect(() => resolveRouteChunk("Card", [...files, "Card-IIIIIIII.js"])).toThrow(/matches 2/);
  });

  it("staticImportsOf: static imports and re-exports, never a dynamic import()", () => {
    expect(staticImportsOf(CHUNKS["PricingPage-CCCCCCCC.js"]).sort()).toEqual(["Card-DDDDDDDD.js", "vendor-BBBBBBBB.js"]);
    expect(staticImportsOf(CHUNKS["Card-DDDDDDDD.js"])).toEqual(["tokens-GGGGGGGG.js"]);
    expect(staticImportsOf('const a=()=>import("./Lazy-EEEEEEEE.js")')).toEqual([]);
  });

  it("every advertised path has a route-chunk entry (a new page without one fails the build)", () => {
    for (const path of applicablePaths()) expect(() => routeChunkModulesFor(path), path).not.toThrow();
    expect(() => routeChunkModulesFor("/not-advertised")).toThrow(/no ROUTE_CHUNK_MODULES entry/);
  });

  it("the desktop fragment layout round-trips without colliding with the mobile one", () => {
    const paths = applicablePaths();
    const all = new Set([...paths.map((p) => fragmentPathFor(p, "/art")), ...paths.map((p) => desktopFragmentPathFor(p, "/art"))]);
    expect(all.size).toBe(paths.length * 2);
    expect(desktopVariantFile("/")).toBe("__desktop/index.html");
    expect(desktopVariantFile("/notes/electricity")).toBe("__desktop/notes/electricity.html");
  });
});

/**
 * ★ THE COMMITTED ARTIFACT IS COMPLETE — both widths, every advertised path, and the manifest
 * the middleware reads. A PARTIAL artifact breaks Build and Vercel (wave B-9), so it is caught
 * here too, in the unit step, independent of the build.
 */
describe("SEO-5 PR-2 — the committed prerendered/ artifact carries both variants", () => {
  it("every advertised path has a mobile AND a desktop fragment, and the manifest lists exactly them", () => {
    const paths = applicablePaths();
    const missing = paths.flatMap((p) => [
      ...(existsSync(fragmentPathFor(p)) ? [] : [`mobile ${p}`]),
      ...(existsSync(desktopFragmentPathFor(p)) ? [] : [`desktop ${p}`]),
    ]);
    // eslint-disable-next-line no-console
    console.log(`PRERENDER_ARTIFACT: paths=${paths.length} missing=${missing.length}`);
    expect(missing).toEqual([]);
    const manifest = readFileSync(resolve(PRERENDERED_DIR, "manifest.json"), "utf8");
    expect(validateManifest(paths, manifest)).toEqual([]);
  });
});
