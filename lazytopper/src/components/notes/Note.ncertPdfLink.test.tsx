/**
 * SEO-LLM-1 — every notes page shows "Official NCERT chapter PDF (<code>) — ncert.nic.in",
 * linking to the official file, visible WITHOUT opening the ledger and present in the
 * server-rendered HTML (what the prerender captures). The code comes from the shared
 * `src/lib/ncertFileCode.ts`, the same module the build script uses for the page head.
 */
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import { Note } from "./Note";
import { ensureAllNoteSpecs, getNoteSpecForTopic } from "./noteSpecRegistry";
import { ncertFileCodeFromSpec } from "../../lib/ncertFileCode";
import { allDesktopTopics } from "../../lib/desktop/topics";

await ensureAllNoteSpecs();

const html = (spec: NonNullable<ReturnType<typeof getNoteSpecForTopic>>) =>
  renderToStaticMarkup(
    <MemoryRouter>
      <Note spec={spec} />
    </MemoryRouter>,
  );

describe("Note — official NCERT chapter PDF link", () => {
  it.each(allDesktopTopics().map((t) => [t.slug]))("%s: link to its own chapter file, outside the closed ledger", (slug) => {
    const spec = getNoteSpecForTopic(slug)!;
    const code = ncertFileCodeFromSpec(spec, slug);
    const out = html(spec);
    const href = `https://ncert.nic.in/textbook/pdf/${code}.pdf`;
    expect(out.split(`href="${href}"`).length - 1, "exactly one link").toBe(1);
    expect(out).toContain(`target="_blank" rel="noopener"`);
    expect(out).toContain(`Official NCERT chapter PDF (${code}) — ncert.nic.in`);
    // Visible without expanding: it sits BEFORE the closed <details> ledger, not inside it.
    expect(out.indexOf(href)).toBeLessThan(out.indexOf('<details class="lt-note__ledger-details">'));
  });

  it("CONTROL — a spec that resolves no code shows no link and no guessed code", () => {
    const spec = structuredClone(getNoteSpecForTopic("electricity")!);
    spec.meta.source_edition = "Class 10 Science, Ch 11"; // names no (jesc111.pdf and...
    // ...the spec has citation pdf fields, so strip them to leave no resolvable code at all.
    const stripped = JSON.parse(JSON.stringify(spec).replace(/jesc\d+/g, "x")) as typeof spec;
    expect(() => ncertFileCodeFromSpec(stripped, "electricity")).toThrow(/no resolvable NCERT file code/);
    expect(html(stripped)).not.toContain("ncert.nic.in/textbook/pdf");
  });

  it("CONTROL — a link built for another chapter's code is not this chapter's link", () => {
    const a = html(getNoteSpecForTopic("circles")!);
    expect(a).toContain("jemh110.pdf");
    expect(a).not.toContain("jemh111.pdf");
  });
});
