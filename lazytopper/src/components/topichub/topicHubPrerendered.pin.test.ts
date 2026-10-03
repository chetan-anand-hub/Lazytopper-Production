// @vitest-environment node
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { applicablePaths, fragmentPathFor } from "../../../scripts/seo/applyPrerendered";

/**
 * HUB-REVERT-1 R3 — PIN over the COMMITTED prerendered Topic Hub bodies.
 *
 * SEO-HUB-1 (#845) put a "Chapter at a glance" overview at the top of every hub on the
 * diagnosis that hubs were a thin "Soft 404". That diagnosis was wrong — the Soft 404 was
 * the deploy-skew crash (CHUNK-RESILIENCE-1, #839) — and the overview turned the hub into a
 * wall of text duplicating the notes page. By design notes pages are the SEO content and
 * hubs are the app surface (concept spine + the Notes link). This pins what a non-JS
 * crawler actually receives — the committed `lazytopper/prerendered/topic-hub/*.html`:
 *   - every advertised hub has a committed body;
 *   - it carries NO "chapter at a glance" node (no `chapter-at-a-glance` test id, no
 *     `lt-glance` markup or CSS);
 *   - it carries EXACTLY ONE link to the notes pages, and that link is to its own
 *     /notes/<slug> (the Notes button — SEO-NOTES-AND-LINKS-1).
 *
 * The file list is DERIVED from `applicablePaths()` (the sitemap), never hand-written, and
 * its size is asserted, so a hub dropped from the artifact fails here instead of being
 * silently skipped.
 *
 * The SOURCE is pinned too: ConceptSpine.tsx (the hub body's component) must not name the
 * overview, so re-mounting it fails here at once, before any prerender capture has run.
 *
 * CONTROL: `WITH_OVERVIEW` is a hub body shaped like the #845 capture (Notes button plus the
 * overview section with its own "Read the full … notes" link). The checker must reject it —
 * proving the pin can fail — while `WITHOUT_OVERVIEW` (the same body minus the section)
 * passes, so the rejection is caused by the overview and nothing else.
 */

const NOTES_BUTTON =
  '<a href="/notes/fixture-chapter" class="lt-spine__notes-btn" aria-expanded="false" ' +
  'aria-haspopup="dialog"><span aria-hidden="true">▤</span><span>Notes</span></a>';

const OVERVIEW =
  "<style>.lt-glance { margin-top: 14px; }</style>" +
  '<section class="lt-glance" aria-labelledby="lt-glance-title" data-testid="chapter-at-a-glance">' +
  '<h2 id="lt-glance-title" class="lt-glance__title">Chapter at a glance</h2>' +
  "<p>A short fixture overview.</p>" +
  '<a class="lt-glance__notes-link" href="/notes/fixture-chapter" data-discover="true">' +
  "Read the full Fixture Chapter notes</a></section>";

const HEAD =
  '<div class="lt-spine"><h1 class="lt-spine__title">Fixture Chapter</h1>' +
  `<div class="lt-spine__notes-row">${NOTES_BUTTON}</div>`;
const SPINE = '<div class="lt-spine__concepts-head"><span>Learn the 2 concepts</span></div></div>';

const WITHOUT_OVERVIEW = HEAD + SPINE;
const WITH_OVERVIEW = HEAD + OVERVIEW + SPINE;

/** Every `href` into the notes pages, whichever slug it names. */
function notesHrefs(html: string): string[] {
  return [...html.matchAll(/href="(\/notes\/[^"]*)"/g)].map((m) => m[1]);
}

function hubFailures(html: string, slug: string): string[] {
  const failures: string[] = [];
  if (html.includes("chapter-at-a-glance")) failures.push("has a chapter-at-a-glance node");
  if (/\blt-glance/.test(html)) failures.push("has lt-glance markup or CSS");
  const hrefs = notesHrefs(html);
  if (hrefs.length !== 1 || hrefs[0] !== `/notes/${slug}`) {
    failures.push(`notes hrefs ${JSON.stringify(hrefs)} != exactly one /notes/${slug}`);
  }
  return failures;
}

/** Any reference to the retired overview: component, content builder, test id or CSS. */
const OVERVIEW_REF = /ChapterAtAGlance|chapterGlanceContent|chapter-at-a-glance|lt-glance/;

const hubPaths = applicablePaths().filter((p) => p.startsWith("/topic-hub/"));

describe("HUB-REVERT-1 R3 — CONTROL: the pin can fail", () => {
  it("rejects a hub body carrying the Chapter-at-a-glance overview", () => {
    expect(hubFailures(WITH_OVERVIEW, "fixture-chapter")).toEqual([
      "has a chapter-at-a-glance node",
      "has lt-glance markup or CSS",
      'notes hrefs ["/notes/fixture-chapter","/notes/fixture-chapter"] != exactly one /notes/fixture-chapter',
    ]);
  });

  it("accepts the same body without the overview", () => {
    expect(hubFailures(WITHOUT_OVERVIEW, "fixture-chapter")).toEqual([]);
  });

  it("rejects a notes link to another chapter, and a missing notes link", () => {
    expect(hubFailures(WITHOUT_OVERVIEW, "another-chapter")).toHaveLength(1);
    expect(hubFailures(SPINE, "fixture-chapter")).toEqual([
      "notes hrefs [] != exactly one /notes/fixture-chapter",
    ]);
  });
});

describe("HUB-REVERT-1 R3 — the hub component does not mount the overview", () => {
  const source = readFileSync(
    fileURLToPath(new URL("./ConceptSpine.tsx", import.meta.url)),
    "utf8",
  );

  it("read the real ConceptSpine source", () => {
    // Without this, a wrong path or an empty read would pass the check below vacuously.
    expect(source).toContain("export function ConceptSpine");
  });

  it("ConceptSpine.tsx does not reference the overview", () => {
    expect(source).not.toMatch(OVERVIEW_REF);
  });

  it("the reference matcher fires on the #845 mount", () => {
    expect(OVERVIEW_REF.test('import { ChapterAtAGlance } from "./ChapterAtAGlance";')).toBe(true);
  });
});

describe("HUB-REVERT-1 R3 — every committed Topic Hub body is the app surface", () => {
  it("covers all 26 advertised hubs", () => {
    expect(hubPaths).toHaveLength(26);
  });

  it.each(hubPaths)("%s: committed, no overview, exactly one notes link to its own slug", (path) => {
    const file = fragmentPathFor(path);
    expect(existsSync(file)).toBe(true);
    const html = readFileSync(file, "utf8");
    const slug = path.slice("/topic-hub/".length);
    expect(hubFailures(html, slug)).toEqual([]);
  });
});
