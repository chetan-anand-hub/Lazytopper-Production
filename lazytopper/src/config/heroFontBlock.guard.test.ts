import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * SPEED-HERO-LCP-1: the h1 of /cbq-packs, /board-pass and /test-series must use a face whose font-display is `block`. With the global
 * `swap` face the prerendered h1 painted in a fallback and the app's re-rendered h1 (real Fraunces, bigger) became a NEW, later LCP
 * candidate (LCP ~1.2 s -> 3.5 s+). `block` makes both paints use the same face. /packs' own recipe is separate (packsHub.css).
 */
const PAGES: ReadonlyArray<readonly [string, string]> = [
  ["src/pages/cbqPacksPage.css", ".lt-cq-hero__h1"],
  ["src/pages/boardPassPage.css", ".lt-bp-hero__h1"],
  ["src/pages/testSeriesPage.css", ".lt-ts-hero__h1"],
];
const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

describe("hero h1 font face is font-display: block", () => {
  for (const [file, selector] of PAGES) {
    it(`${selector} in ${file}`, () => {
      const css = read(file);
      // the base rule: the first `selector {` block (not a media-query override)
      const rule = new RegExp(`(?:^|\\n)${selector.replace(".", "\\.")}\\s*\\{([^}]*)\\}`).exec(css);
      expect(rule, `base rule for ${selector}`).not.toBeNull();
      const family = /font-family:\s*"([^"]+)"/.exec(rule![1])?.[1];
      expect(family, "first family of the h1").toBeTruthy();
      expect(family).not.toBe("Fraunces"); // the global face is swap (pinned by indexHtml.guard)
      const faces = [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)].map((m) => m[1]);
      const face = faces.find((f) => f.includes(`font-family: "${family}"`));
      expect(face, `@font-face for "${family}"`).toBeDefined();
      expect(face).toMatch(/font-display:\s*block\s*;/);
      expect(face).toContain("/fonts/fraunces-700-latin.woff2"); // same file as the head preload: one download
    });
  }
});
