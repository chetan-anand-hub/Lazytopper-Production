// @vitest-environment node
import { describe, it, expect } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  applicablePaths,
  islandPathsFor,
  islandScriptIn,
  islandStylesheetHrefsIn,
  islandStylesheetsFor,
  modulepreloadHrefsIn,
  resolveStylesheet,
  verifyBuiltPages,
  withIsland,
  withIslandStylesheets,
  withPreloads,
} from "../../scripts/seo/applyPrerendered";
import { ISLAND_PATH_PREFIXES, isIslandPath, islandsEnabled } from "./islandConfig";

/**
 * GUARD — SPEED-ISLANDS-1: the island swap reaches the allowlisted content families ONLY, changes ONLY the
 * script tag (body, canonical, meta and JSON-LD stay byte-identical), and has a one-line off switch.
 */

const ENTRY = '<script type="module" crossorigin src="/assets/index-AAAAAAAA.js"></script>';
const shell = (body = "") =>
  `<!doctype html><html><head><link rel="canonical" href="https://www.lazytopper.com/notes/x" />` +
  `<script type="application/ld+json">{"@type":"Article"}</script>${ENTRY}</head><body><div id="root">${body}</div></body></html>`;
const ON = { islandPrefixes: ISLAND_PATH_PREFIXES };

describe("which paths are islands", () => {
  const advertised = applicablePaths();
  const islands = islandPathsFor(advertised, ON, {});

  it("exactly the notes, NCERT-solutions and Exemplar chapter pages (phase 1)", () => {
    const expected = advertised.filter((p) => /^\/(notes|ncert-solutions|ncert-exemplar)\/[^/]+$/.test(p));
    expect([...islands].sort()).toEqual(expected.sort());
    // CONTROL — the families are really advertised, so the equality above is not vacuous.
    expect(expected.filter((p) => p.startsWith("/notes/")).length).toBeGreaterThanOrEqual(20);
    expect(expected.filter((p) => p.startsWith("/ncert-solutions/")).length).toBeGreaterThanOrEqual(20);
    expect(expected.filter((p) => p.startsWith("/ncert-exemplar/")).length).toBeGreaterThanOrEqual(20);
  });

  it("never the root, pricing, packs, the hubs, CBQ, HPQ or topic hubs (phase 2 is a separate PR)", () => {
    for (const p of ["/", "/pricing", "/packs", "/ncert-class-10", "/cbq-class-10", "/practice-hub", "/check-your-answer"]) {
      expect(islands.has(p)).toBe(false);
    }
    for (const p of advertised) {
      if (/^\/(highly-probable|cbq-class-10|topic-hub|legal|cbse)\b/.test(p)) expect(islands.has(p)).toBe(false);
    }
    expect(isIslandPath("/notes/")).toBe(false);
    expect(isIslandPath("/notes")).toBe(false);
  });

  it("is off by default (every synthetic build in the other guards), and LT_ISLANDS=0 turns it off", () => {
    expect(islandPathsFor(advertised, {}, {}).size).toBe(0);
    expect(islandPathsFor(advertised, ON, { LT_ISLANDS: "0" }).size).toBe(0);
    expect(islandsEnabled({ LT_ISLANDS: "0" })).toBe(false);
    expect(islandsEnabled({})).toBe(true);
    // Islands need the real assets: a synthetic build without preloads never gets them.
    expect(islandPathsFor(advertised, { ...ON, preloads: false }, {}).size).toBe(0);
    // The family allowlist is the per-family switch.
    expect([...islandPathsFor(advertised, { islandPrefixes: ["/notes/"] }, {})].every((p) => p.startsWith("/notes/"))).toBe(true);
  });
});

describe("withIsland", () => {
  const body = '<main class="lt-notes-page"><h1>Real Numbers</h1><a href="/check-improve">Check</a></main>';
  const page = shell(body);
  const swapped = withIsland(page, shell(), "contentIsland-BBBBBBBB.js", ["/assets/Note-CCCCCCCC.js", "/assets/tokens-DDDDDDDD.js"]);

  it("swaps ONLY the entry script tag; everything else is byte-identical", () => {
    const island = islandScriptIn(swapped);
    expect(island).toEqual({
      src: "/assets/contentIsland-BBBBBBBB.js",
      appEntry: "/assets/index-AAAAAAAA.js",
      preloads: ["/assets/Note-CCCCCCCC.js", "/assets/tokens-DDDDDDDD.js"],
    });
    expect(swapped).not.toContain(ENTRY);
    const [before, after] = page.split(ENTRY);
    expect(swapped.startsWith(before)).toBe(true);
    expect(swapped.endsWith(after)).toBe(true);
    expect(swapped.split("<body")[1]).toBe(page.split("<body")[1]);
  });

  it("carries no modulepreload (the island preloads the app's chunks only when it loads the app)", () => {
    expect(modulepreloadHrefsIn(swapped)).toEqual([]);
    // CONTROL — the non-island path keeps its preloads.
    expect(modulepreloadHrefsIn(withPreloads(page, ["/assets/Note-CCCCCCCC.js"]))).toEqual(["/assets/Note-CCCCCCCC.js"]);
  });

  it("hands the shell's own modulepreloads (the vendor chunks) to the island too, first", () => {
    const vendor = '<link rel="modulepreload" crossorigin href="/assets/vendor-react-EEEEEEEE.js">';
    const withVendor = page.replace(ENTRY, ENTRY + vendor);
    const out = withIsland(withVendor, shell(), "contentIsland-BBBBBBBB.js", ["/assets/Note-CCCCCCCC.js"]);
    expect(modulepreloadHrefsIn(out)).toEqual([]);
    expect(islandScriptIn(out)?.preloads).toEqual(["/assets/vendor-react-EEEEEEEE.js", "/assets/Note-CCCCCCCC.js"]);
    expect(out.split("<body")[1]).toBe(withVendor.split("<body")[1]);
  });

  it("throws unless the entry tag occurs exactly once", () => {
    expect(() => withIsland(page.replace(ENTRY, ""), shell(), "contentIsland-BBBBBBBB.js", [])).toThrow(/exactly one app entry tag/);
    expect(() => withIsland(page.replace(ENTRY, ENTRY + ENTRY), shell(), "contentIsland-BBBBBBBB.js", [])).toThrow(/exactly one/);
  });
});

describe("verifyBuiltPages — island pages", () => {
  function build(): { out: string; cleanup: () => void } {
    const out = mkdtempSync(join(tmpdir(), "island-verify-"));
    mkdirSync(join(out, "assets"));
    for (const f of ["index-AAAAAAAA.js", "contentIsland-BBBBBBBB.js", "DesktopNotesPage-CCCCCCCC.js", "TopicHubPage-DDDDDDDD.js"]) {
      writeFileSync(join(out, "assets", f), "export{};", "utf8");
    }
    const island = withIsland(shell("<main>N</main>"), shell(), "contentIsland-BBBBBBBB.js", ["/assets/DesktopNotesPage-CCCCCCCC.js"]);
    for (const f of ["notes/electricity.html", "notes/electricity/index.html", "__desktop/notes/electricity.html"]) {
      mkdirSync(join(out, f, ".."), { recursive: true });
      writeFileSync(join(out, f), island, "utf8");
    }
    return { out, cleanup: () => rmSync(out, { recursive: true, force: true }) };
  }

  it("passes a healthy island page and counts it", () => {
    const { out, cleanup } = build();
    try {
      const v = verifyBuiltPages(out, ["/notes/electricity"], new Set(["/notes/electricity"]));
      expect(v.failures).toEqual([]);
      expect(v.islandFiles).toBe(3);
    } finally {
      cleanup();
    }
  });

  it("RED: an island page naming an app entry the build did not emit", () => {
    const { out, cleanup } = build();
    try {
      rmSync(join(out, "assets", "index-AAAAAAAA.js"));
      const v = verifyBuiltPages(out, ["/notes/electricity"], new Set(["/notes/electricity"]));
      expect(v.failures.some((f) => f.includes("island names /assets/index-AAAAAAAA.js, which this build did not emit"))).toBe(true);
    } finally {
      cleanup();
    }
  });

  it("RED: the island script on a page that is NOT an island path", () => {
    const { out, cleanup } = build();
    try {
      const v = verifyBuiltPages(out, ["/notes/electricity"], new Set());
      expect(v.failures.some((f) => f.includes("carries the island script but is not an island path"))).toBe(true);
    } finally {
      cleanup();
    }
  });
});

describe("#1621 review D1 — an island page links the lazy stylesheets its served markup needs", () => {
  const KATEX = '<span class="katex"><span class="katex-html" aria-hidden="true">x</span></span>';
  const FAB = '<a class="lt-wa-fab" href="https://wa.me/1">WA</a>';
  const ASSETS = ["index-AAAAAAAA.js", "SolutionsPage-EEEEEEEE.js", "katex-C-EwFotM.css", "WhatsAppFab-TWtivnxE.css", "katex-C-g2SbSj.js", "DesktopNotesPage-CCCCCCCC.js"];
  // The entry's own __vite__mapDeps table: the notes route's chunk brings KaTeX's CSS (as in the real build).
  const ENTRY_CODE =
    'const m={};m.f=["assets/DesktopNotesPage-CCCCCCCC.js","assets/katex-C-EwFotM.css"];' +
    'import("./DesktopNotesPage-CCCCCCCC.js"),__vite__mapDeps([0,1]);';

  it("resolves each sheet from THIS build's assets (exactly one <name>-<hash>.css), never a hard-coded name", () => {
    expect(resolveStylesheet("katex", ASSETS)).toBe("katex-C-EwFotM.css");
    expect(resolveStylesheet("WhatsAppFab", ASSETS)).toBe("WhatsAppFab-TWtivnxE.css");
    expect(() => resolveStylesheet("katex", ["katex-AAAAAAAA.css", "katex-BBBBBBBB.css"])).toThrow(/exactly one/);
    expect(() => resolveStylesheet("WhatsAppFab", [])).toThrow(/matches 0/);
  });

  it("a notes page: the route's CSS (KaTeX) + the WhatsApp button's; a page without that markup gets neither", () => {
    const page = shell(`<main>${KATEX}${FAB}</main>`);
    expect(islandStylesheetsFor("/notes/electricity", page, ENTRY_CODE, ASSETS)).toEqual(["katex-C-EwFotM.css", "WhatsAppFab-TWtivnxE.css"]);
    expect(islandStylesheetsFor("/ncert-solutions/triangles", shell(`<main>${FAB}</main>`), ENTRY_CODE, ASSETS)).toEqual(["WhatsAppFab-TWtivnxE.css"]);
    // Markup alone decides for KaTeX on a solutions page (its maths comes from a nested lazy chunk).
    expect(islandStylesheetsFor("/ncert-solutions/electricity", shell(`<main>${KATEX}</main>`), ENTRY_CODE, ASSETS)).toEqual(["katex-C-EwFotM.css"]);
    // Already inlined: not linked again.
    const inlined = page.replace("</head>", '<style data-lt-inline="katex-C-EwFotM.css">.k{}</style></head>');
    expect(islandStylesheetsFor("/notes/electricity", inlined, ENTRY_CODE, ASSETS)).toEqual(["WhatsAppFab-TWtivnxE.css"]);
  });

  it("links them in the head, body untouched; the verifier reads them back", () => {
    const page = shell(`<main>${KATEX}</main>`);
    const out = withIslandStylesheets(page, "/", ["katex-C-EwFotM.css"]);
    expect(islandStylesheetHrefsIn(out)).toEqual(["/assets/katex-C-EwFotM.css"]);
    expect(out.slice(out.indexOf("<body"))).toBe(page.slice(page.indexOf("<body")));
    expect(withIslandStylesheets(page, "/", [])).toBe(page);
  });

  it("RED: verifyBuiltPages fails an island page with KaTeX markup and no KaTeX stylesheet", () => {
    const out = mkdtempSync(join(tmpdir(), "island-css-"));
    try {
      mkdirSync(join(out, "assets"));
      for (const f of ["index-AAAAAAAA.js", "contentIsland-BBBBBBBB.js", "DesktopNotesPage-CCCCCCCC.js", "katex-C-EwFotM.css"]) {
        writeFileSync(join(out, "assets", f), "export{};", "utf8");
      }
      const write = (html: string) => {
        for (const f of ["notes/electricity.html", "notes/electricity/index.html", "__desktop/notes/electricity.html"]) {
          mkdirSync(join(out, f, ".."), { recursive: true });
          writeFileSync(join(out, f), html, "utf8");
        }
      };
      const bare = withIsland(shell(`<main>${KATEX}</main>`), shell(), "contentIsland-BBBBBBBB.js", ["/assets/DesktopNotesPage-CCCCCCCC.js"]);
      write(bare);
      const red = verifyBuiltPages(out, ["/notes/electricity"], new Set(["/notes/electricity"]));
      expect(red.failures.some((f) => f.includes("katex markup but does not link its stylesheet"))).toBe(true);
      write(withIslandStylesheets(bare, "/", ["katex-C-EwFotM.css"]));
      expect(verifyBuiltPages(out, ["/notes/electricity"], new Set(["/notes/electricity"])).failures).toEqual([]);
      write(withIslandStylesheets(bare, "/", ["katex-ZZZZZZZZ.css"]));
      const missing = verifyBuiltPages(out, ["/notes/electricity"], new Set(["/notes/electricity"]));
      expect(missing.failures.some((f) => f.includes("links island CSS /assets/katex-ZZZZZZZZ.css, which this build did not emit"))).toBe(true);
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });
});
