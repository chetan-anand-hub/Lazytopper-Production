// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { sitemapPaths } from "./sitemapUrls";

/**
 * SEO-NOTES-LINK-2 — PIN over the COMMITTED prerendered bodies (what a crawler receives).
 *
 *   1. every notes page has ≥ 3 DISTINCT inbound prerendered pages, per variant
 *      (mobile = `prerendered/` minus `__desktop/`; desktop = `prerendered/__desktop/`);
 *   2. the hub placeholder sentence occurs 0 times anywhere in `prerendered/**`.
 *
 * ⚠ `prerendered/**` is REGENERATED FROM THE CI prerender-capture artifact, never by hand,
 * so this pin is RED on a branch until that artifact lands — by design: it measures the
 * shipped HTML, not the source.
 *
 * Baseline @ 250baf96: each notes page had 2 inbound files (its own hub, both variants)
 * = 1 per variant; the placeholder occurred in 52 files.
 */

const ROOT = resolve(process.cwd(), "prerendered"); // vitest runs with cwd = lazytopper/
const PLACEHOLDER = /More examiner(?:’|&rsquo;|')s tips for this topic are on the way/;

function htmlFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...htmlFiles(p));
    else if (name.endsWith(".html")) out.push(p);
  }
  return out;
}

const files = htmlFiles(ROOT).map((p) => ({
  rel: relative(ROOT, p).replace(/\\/g, "/"),
  html: readFileSync(p, "utf8"),
}));
const desktop = files.filter((f) => f.rel.startsWith("__desktop/"));
const mobile = files.filter((f) => !f.rel.startsWith("__desktop/"));
const notes = sitemapPaths().filter((p) => p.startsWith("/notes/"));

describe("SEO-NOTES-LINK-2 — prerendered inbound links to every notes page", () => {
  it("names its subject on every run, green included", () => {
    // eslint-disable-next-line no-console
    console.log(`NOTES_INBOUND_SCOPE: files=${files.length} mobile=${mobile.length} desktop=${desktop.length} notes=${notes.length}`);
    expect(mobile.length).toBeGreaterThan(26);
    expect(desktop.length).toBeGreaterThan(26);
    expect(notes.length).toBe(26);
  });

  for (const [variant, set] of [["mobile", mobile], ["__desktop", desktop]] as const) {
    it(`${variant}: every notes page has ≥ 3 distinct inbound prerendered pages`, () => {
      const short: string[] = [];
      for (const path of notes) {
        const needle = `href="${path}"`;
        const self = `notes/${path.slice("/notes/".length)}.html`;
        const inbound = set.filter((f) => !f.rel.endsWith(self) && f.html.includes(needle)).map((f) => f.rel);
        if (inbound.length < 3) short.push(`${path}=${inbound.length}`);
      }
      expect(short, `${variant}: notes pages with < 3 inbound pages`).toEqual([]);
    });
  }

  it("the placeholder sentence occurs 0 times in prerendered/**", () => {
    const hits = files.filter((f) => PLACEHOLDER.test(f.html)).map((f) => f.rel);
    expect(hits.length, `placeholder still in: ${hits.slice(0, 5).join(", ")}…`).toBe(0);
  });

  it("CONTROL — the detectors fire on synthetic input", () => {
    expect(PLACEHOLDER.test("More examiner’s tips for this topic are on the way")).toBe(true);
    expect(PLACEHOLDER.test("More examiner&rsquo;s tips for this topic are on the way")).toBe(true);
    expect('<a href="/notes/polynomials">'.includes('href="/notes/polynomials"')).toBe(true);
  });
});
