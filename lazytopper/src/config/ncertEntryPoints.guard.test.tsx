import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import { Note } from "../components/notes/Note";
import { ensureAllNoteSpecs, getNoteSpecForTopic } from "../components/notes/noteSpecRegistry";
import { allDesktopTopics } from "../lib/desktop/topics";
import { NCERT_CLASS10_CHAPTERS, ncertCode, ncertReadPath, ncertRowsForSlug } from "./ncertBooks";

/**
 * NCERT-ENTRY-1 (lane G, owner 14 Oct; was [FU-NOTES-PDF-LINK-TO-READER]) — every notes page offers
 * "Read NCERT Chapter N on LazyTopper", an INTERNAL link into the /ncert-class-10 reader with a return
 * ticket back to the page it was on, placed BEFORE the official ncert.nic.in credit (which SEO-LLM-1's
 * guards keep pinned: exactly one, same text). Maths Ch 8 and Ch 9 share the trigonometry note, so it
 * offers both.
 */
await ensureAllNoteSpecs();

function noteHtml(slug: string, at = `/notes/${slug}`): string {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[at]}>
      <Note spec={getNoteSpecForTopic(slug)!} />
    </MemoryRouter>,
  );
}

/** The internal reader links in a rendered note, as [text, href] (href with &amp; decoded). */
function readerLinks(html: string): Array<[string, string]> {
  const block = /<p class="lt-note__ncert-read"[^>]*>([\s\S]*?)<\/p>/.exec(html)?.[1] ?? "";
  return [...block.matchAll(/<a [^>]*href="([^"]+)"[^>]*>([^<]*)<\/a>/g)].map((m) => [
    m[2],
    m[1].replace(/&amp;/g, "&"),
  ]);
}

describe("NCERT-ENTRY-1 — notes pages open the chapter on LazyTopper", () => {
  it("ncertRowsForSlug partitions the 27 NCERT rows over the 26 notes (trigonometry = Ch 8 + 9)", () => {
    const slugs = allDesktopTopics().map((t) => t.slug);
    expect(slugs.flatMap((s) => ncertRowsForSlug(s)).length).toBe(27);
    expect(ncertRowsForSlug("trigonometry").map((r) => r.chapter)).toEqual([8, 9]);
    expect(ncertRowsForSlug("no-such-chapter")).toEqual([]);
  });

  it.each(allDesktopTopics().map((t) => [t.slug]))(
    "%s: a reader link per NCERT chapter, returning to the page, before the one official link",
    (slug) => {
      const html = noteHtml(slug);
      const rows = ncertRowsForSlug(slug);
      const links = readerLinks(html);
      expect(links.map(([, h]) => h)).toEqual(rows.map((r) => ncertReadPath(r, `/notes/${slug}`)));
      expect(links[0][0]).toBe(`Read NCERT Chapter ${rows[0].chapter} on LazyTopper (${ncertCode(rows[0])})`);
      if (rows.length > 1) expect(links[1][0]).toBe(`Chapter ${rows[1].chapter}`);
      // The official credit stays, exactly once, and comes AFTER the reader link.
      const official = html.split('href="https://ncert.nic.in/textbook/pdf/').length - 1;
      expect(official).toBe(1);
      expect(html.indexOf('class="lt-note__ncert-read"')).toBeLessThan(html.indexOf('class="lt-note__ncert-pdf"'));
    },
  );

  it("the return ticket is where the note is shown (a note opened elsewhere returns there)", () => {
    const [[, href]] = readerLinks(noteHtml("circles", "/topic-hub/circles"));
    expect(href).toBe(ncertReadPath(NCERT_CLASS10_CHAPTERS.find((r) => r.slug === "circles")!, "/topic-hub/circles"));
    expect(href).toBe("/ncert-class-10?subject=maths&read=jemh110&returnTo=%2Ftopic-hub%2Fcircles");
  });

  it("CONTROL — readerLinks finds nothing in a note without the block, and decodes &amp;", () => {
    expect(readerLinks("<p class=\"lt-note__ncert-pdf\"><a href=\"x\">y</a></p>")).toEqual([]);
    expect(readerLinks('<p class="lt-note__ncert-read"><a href="/a?b=1&amp;c=2">t</a></p>')).toEqual([["t", "/a?b=1&c=2"]]);
  });
});
