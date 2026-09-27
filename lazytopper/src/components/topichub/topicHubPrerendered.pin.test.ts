// @vitest-environment node
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { applicablePaths, fragmentPathFor } from "../../../scripts/seo/applyPrerendered";

/**
 * SEO-HUB-1 H3 — PIN over the COMMITTED prerendered Topic Hub bodies.
 *
 * Google's live test called every /app/topic-hub/* "Soft 404": ~1,000 visible characters
 * against ~14,000 on the matching notes page. This pins what a non-JS crawler actually
 * receives — the committed `lazytopper/prerendered/topic-hub/*.html` — not the component:
 *   - every advertised hub has a committed body;
 *   - each carries >= 2,500 VISIBLE characters (scripts, styles and comments stripped);
 *   - each carries the "Read the full <chapter> notes" link to its own /notes/<slug>;
 *   - no two hubs share an identical "Chapter at a glance" overview.
 *
 * The file list is DERIVED from `applicablePaths()` (the sitemap), never hand-written, and
 * its size is asserted, so a hub dropped from the artifact fails here instead of being
 * silently skipped.
 *
 * CONTROL: `__fixtures__/topic-hub-below-floor.html` is a hub body that carries the notes
 * link but sits below the floor, and whose RAW byte size is ABOVE it (a long <script>).
 * The measurer must reject it — which proves both that the floor can fail and that
 * script text is not counted.
 */

const MIN_VISIBLE_CHARS = 2500;

const ENTITIES: Readonly<Record<string, string>> = {
  "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&nbsp;": " ",
};

/** Visible text of an HTML fragment: scripts/styles/comments stripped, tags removed. */
function visibleText(html: string): string {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;|&#\d+;/gi, (e) => ENTITIES[e] ?? e)
    .replace(/\s+/g, " ")
    .trim();
}

function visibleCharCount(html: string): number {
  return [...visibleText(html)].length;
}

/** The "Chapter at a glance" section's visible text, or null when absent. */
function overviewText(html: string): string | null {
  const m = /<section\b[^>]*data-testid="chapter-at-a-glance"[^>]*>([\s\S]*?)<\/section>/.exec(html);
  return m ? visibleText(m[1]) : null;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** The visible "Read the full … notes" link pointing at /app/notes/<slug>. */
function hasNotesLink(html: string, slug: string): boolean {
  const re = new RegExp(
    `<a\\b[^>]*href="/app/notes/${escapeRe(slug)}"[^>]*>\\s*Read the full [^<]+ notes`,
  );
  return re.test(html);
}

function hubFailures(html: string, slug: string): string[] {
  const failures: string[] = [];
  const chars = visibleCharCount(html);
  if (chars < MIN_VISIBLE_CHARS) failures.push(`visible chars ${chars} < ${MIN_VISIBLE_CHARS}`);
  if (!hasNotesLink(html, slug)) failures.push("no 'Read the full … notes' link");
  if (overviewText(html) === null) failures.push("no Chapter at a glance section");
  return failures;
}

const hubPaths = applicablePaths().filter((p) => p.startsWith("/topic-hub/"));

describe("SEO-HUB-1 H3 — CONTROL: the measurer can fail", () => {
  const fixture = readFileSync(
    fileURLToPath(new URL("./__fixtures__/topic-hub-below-floor.html", import.meta.url)),
    "utf8",
  );

  it("the fixture's RAW size is above the floor (so only stripping can reject it)", () => {
    expect(fixture.length).toBeGreaterThan(MIN_VISIBLE_CHARS);
  });

  it("rejects a hub body below the visible-character floor", () => {
    expect(visibleCharCount(fixture)).toBeLessThan(MIN_VISIBLE_CHARS);
    expect(hubFailures(fixture, "fixture-chapter")).toEqual([
      expect.stringMatching(/^visible chars \d+ < 2500$/),
    ]);
  });

  it("the link and overview matchers fire on the fixture, and reject a wrong slug", () => {
    expect(hasNotesLink(fixture, "fixture-chapter")).toBe(true);
    expect(hasNotesLink(fixture, "another-chapter")).toBe(false);
    expect(overviewText(fixture)).toContain("A short fixture overview.");
    expect(overviewText("<div>no overview here</div>")).toBeNull();
  });
});

describe("SEO-HUB-1 H3 — every committed Topic Hub body reads as a page", () => {
  it("covers all 26 advertised hubs", () => {
    expect(hubPaths).toHaveLength(26);
  });

  it.each(hubPaths)("%s: committed, >= 2,500 visible chars, notes link, overview", (path) => {
    const file = fragmentPathFor(path);
    expect(existsSync(file)).toBe(true);
    const html = readFileSync(file, "utf8");
    const slug = path.slice("/topic-hub/".length);
    expect(hubFailures(html, slug)).toEqual([]);
  });

  it("no two hubs share an identical overview", () => {
    const seen = new Map<string, string>();
    for (const path of hubPaths) {
      const overview = overviewText(readFileSync(fragmentPathFor(path), "utf8"));
      expect(overview, `${path} has no overview`).not.toBeNull();
      const prior = seen.get(overview as string);
      expect(prior, `${path} repeats the overview of ${prior}`).toBeUndefined();
      seen.set(overview as string, path);
    }
    expect(seen.size).toBe(26);
  });
});
